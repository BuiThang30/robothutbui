// routes/mail.js
const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "Thiếu dữ liệu" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Website" <${process.env.MAIL_USER}>`,
      to: "buiquangthang30102003@gmail.com",
      subject: "Tin nhắn từ website",
      html: `
        <h3>Bạn nhận được một tin nhắn mới</h3>
        <p><b>Người gửi:</b> ${name} (${email})</p>
        <p><b>Nội dung:</b> ${message}</p>
      `,
    });

    res.json({ success: true, message: "Đã gửi email thành công ✅" });
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ success: false, error: "Không gửi được email" });
  }
});

module.exports = router;
