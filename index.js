const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const socketapi = require("./socketapi");

// Routers
const dataRouter = require("./routes/data");
const mailRouter = require("./routes/mail");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Prevent cache cho tất cả request
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
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

// Server + Socket.IO
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Khởi tạo Socket.IO từ socketapi.js
const io = socketapi.initSocket(server);
