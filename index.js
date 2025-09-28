const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const socketapi = require("./socketapi");

// Routers
const authRouter = require("./routes/auth");
const dataRouter = require("./routes/data");
const userRouter = require("./routes/user");
const mailRouter = require("./routes/mail");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 30 * 60 * 1000 }
}));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Prevent cache cho tất cả request (quan trọng khi logout + back)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Middleware check login
function requireLogin(req, res, next) {
  if (req.session.user) next();
  else res.redirect("/login");
}

// Routes
app.use("/api/auth", authRouter);
app.use("/api/data", dataRouter);
app.use("/api/user", userRouter);
app.use("/api/mail", mailRouter);

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/home");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/home", requireLogin, (req, res) => {
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

