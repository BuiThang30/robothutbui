require("dotenv").config();
const { db } = require("./db");

// dynamic import node-fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const TOKEN_AQI_API = process.env.TOKEN_AQI_API;
if (!TOKEN_AQI_API) {
  console.error("TOKEN_AQI_API is not set. Please set it in your environment variables.");
  process.exit(1);
}
const api_endpoint = `https://api.waqi.info/feed/here/?token=${TOKEN_AQI_API}`;

const maxEnvirLength = 1;
const envirData = {
  temperature: [],
  humidity: [],
  CO2: [],
  PM1_0: [],
  PM2_5: [],
  PM10: [],
};

function calculateAverage(dataArray) {
  if (!dataArray.length) return 0;
  const validData = dataArray.filter((v) => !isNaN(v));
  if (!validData.length) return 0;
  return +(validData.reduce((acc, val) => acc + val, 0) / validData.length).toFixed(2);
}

let deviceStatus = "offline";
let mode = "auto";
let motorOn = false;

function initSocket(server) {
  const socketio = require("socket.io");
  const io = socketio(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  });

  io.on("connection", (socket) => {
    console.log("[INFO] New connection:", socket.id);

    // ====== ESP32 gửi dữ liệu đo ======
    socket.on("message", async (payload) => {
      try {
        if (Array.isArray(payload) && payload.length === 2) {
          const [eventName, rawData] = payload;
          if (eventName === "/esp/measure") {
            let data = rawData;
            if (typeof data === "string") data = JSON.parse(data);

            if (data.sensorId === "esp32") {
              deviceStatus = "online";
              io.emit("deviceStatus", deviceStatus);
            }

            console.log(`[MEASURE] from ${data.sensorId || "web"} via ${socket.id}`);

            // Nếu CO2 = 0 thì lấy AQI từ API
            if (+data.CO2 === 0) {
              try {
                const res = await fetch(api_endpoint);
                const json = await res.json();
                if (json?.data?.aqi) data.CO2 = json.data.aqi;
              } catch (err) {
                console.error("Failed to fetch AQI:", err.message);
              }
            }

            // gửi cho web client
            socket.broadcast.emit("message", data);

            // gom dữ liệu
            for (const key in envirData) {
              if (data[key] != null) {
                const val = parseFloat(data[key]);
                if (!isNaN(val)) envirData[key].push(val);
              }
            }

            // tính trung bình và lưu DB
            if (envirData.humidity.length >= maxEnvirLength) {
              const avgData = {};
              for (const key in envirData) {
                avgData[key] = calculateAverage(envirData[key]);
                envirData[key] = [];
              }

              db.run(
                `INSERT INTO EnvironmentalData 
                 (temperature, humidity, CO2, PM1_0, PM2_5, PM10)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  avgData.temperature,
                  avgData.humidity,
                  avgData.CO2,
                  avgData.PM1_0,
                  avgData.PM2_5,
                  avgData.PM10,
                ],
                (err) => {
                  if (err) console.error("DB insert error:", err);
                  else console.log("Data added:", avgData);
                }
              );
            }
          }
        }
      } catch (err) {
        console.error("Invalid message payload:", err);
      }
    });

    // ===== đổi mode ======
    socket.on("change-mode", (newMode) => {
      if (["auto", "manual"].includes(newMode)) {
        mode = newMode;

        // gửi lệnh cho ESP32
        io.emit("esp-command", { type: "mode", value: mode });
        io.emit("mode-update", mode); // gửi cho web
        console.log("Mode changed to", mode);
      }
    });

    // ===== bật/tắt động cơ ======
    socket.on("toggle-motor", (state) => {
      motorOn = state === "on";
      io.emit("esp-command", { type: "motor", value: motorOn ? "on" : "off" });
      console.log("Motor state:", motorOn ? "ON" : "OFF");
    });

    // ====== điều khiển tốc độ / hướng ======
    socket.on("control", (cmd) => {
      if (mode === "manual") {
        if (motorOn) {
          // Nếu cmd là dạng "UP,14"
          const [direction, speedStr] = cmd.split(",");
          const speed = parseInt(speedStr) || 0;

          if (!direction || speed <= 0) {
            console.log("Ignored control: invalid command", cmd);
            return;
          }

          // Gửi lệnh đến ESP32
          io.emit("esp-command", { type: "move", direction, speed });

          console.log("Control command sent to ESP32:", { direction, speed });
        } else {
          console.log("Ignored control: motor is OFF");
        }
      } else {
        console.log("Ignored control: mode is not manual");
      }
    });




    socket.on("disconnect", () => {
      console.log(socket.id, "disconnected");
      deviceStatus = "offline";
      io.emit("deviceStatus", deviceStatus);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });
  });

  return io;
}

module.exports = { initSocket };
