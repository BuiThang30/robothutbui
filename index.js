const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const socketapi = require("./socketapi");
const https = require("https");

// Routers
const dataRouter = require("./routes/data");
const mailRouter = require("./routes/mail");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Prevent cache
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Routes
app.use("/api/data", dataRouter);
app.use("/api/mail", mailRouter);

// Trang chủ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// API test
app.get("/api/status", (req, res) => res.json({ status: "ok" }));

// ----------------------
// HTTP
// ----------------------
const HTTP_PORT = 3000;
const httpServer = app.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP Server running at http://localhost:${HTTP_PORT}`);
});

// ----------------------
// HTTPS
// ----------------------
let httpsServer = null;
try {
  const sslOptions = {
    key: fs.readFileSync("/etc/letsencrypt/live/ventilusrobot.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/ventilusrobot.com/fullchain.pem"),
  };
  httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(443, () => {
    console.log(`HTTPS Server running at https://ventilusrobot.com`);
  });
} catch (err) {
  console.warn("Không tìm thấy chứng chỉ SSL — chỉ chạy HTTP local test");
}

// ----------------------
// 🔌 Socket.IO
// ----------------------
if (httpsServer) {
  socketapi.initSocket(httpsServer);
} else {
  socketapi.initSocket(httpServer);
}
