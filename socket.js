// socketapi.js
const { db } = require("./db");

const maxEnvirLength = 10;
const envirData = { temperature: [], humidity: [], CO2: [], PM1_0: [], PM2_5: [], PM10: [] };

function calculateAverage(dataArray) {
  if (!dataArray.length) return 0;
  const validData = dataArray.filter(v => !isNaN(v));
  if (!validData.length) return 0;
  return +(validData.reduce((acc, val) => acc + val, 0) / validData.length).toFixed(2);
}

let deviceStatus = "offline";
let mode = "auto";

function initSocket(server) {
  const socketio = require("socket.io");
  const io = socketio(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
  });

  io.on("connection", (socket) => {
    console.log("[INFO] New connection:", socket.id);

    socket.on("message", (data) => {
      try {
        if (typeof data === "string") data = JSON.parse(data);

        if (data.sensorId === "esp32") deviceStatus = "online";
        socket.broadcast.emit("message", data);

        for (const key in envirData) {
          if (data[key] != null) {
            const val = parseFloat(data[key]);
            if (!isNaN(val)) envirData[key].push(val);
          }
        }

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
            [avgData.temperature, avgData.humidity, avgData.CO2, avgData.PM1_0, avgData.PM2_5, avgData.PM10],
            (err) => { if (err) console.error(err); else console.log("Data added:", avgData); }
          );
        }
      } catch (err) { console.error("Invalid message:", err); }
    });

    socket.on("change-mode", (newMode) => {
      if (["auto","manual"].includes(newMode)) {
        mode = newMode;
        io.emit("esp-command", { type:"mode", value:mode });
        io.emit("mode-update", mode);
        console.log("Mode changed to", mode);
      }
    });

    socket.on("control", (cmd) => {
      if (mode === "manual") io.emit("esp-command", { type:"move", value:cmd });
      else console.log("Ignored command (auto mode):", cmd);
    });

    socket.on("disconnect", () => {
      console.log(socket.id, "disconnected");
      deviceStatus = "offline";
      io.emit("deviceStatus", deviceStatus);
    });
  });

  return io;
}

module.exports = { initSocket };
