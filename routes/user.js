const express = require("express");
const router = express.Router();
const { addUser } = require("../db");

// Tạo user mới
router.post("/add", async (req, res) => {
  const { username, password } = req.body;
  try {
    const id = await addUser(username, password);
    res.json({ success: true, id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
