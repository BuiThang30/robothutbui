const express = require("express");
const router = express.Router();
const { checkUser } = require("../db");

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const ok = await checkUser(username, password);
    if (ok) {
      req.session.user = username;
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Đăng nhập thất bại" });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Lỗi server" });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send("Có lỗi khi logout");
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

module.exports = router;
