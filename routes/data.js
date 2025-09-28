// routes/data.js
const express = require("express");
const router = express.Router();
const { db } = require("../db");

// 1) Lấy 10 bản ghi mới nhất, trả về từ cũ -> mới
router.get("/history", (req, res) => {
  db.all(
    "SELECT * FROM (SELECT * FROM EnvironmentalData ORDER BY timestamp DESC LIMIT 10) sub ORDER BY timestamp ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});



// 2) Lấy bản ghi mới nhất
router.get("/latest", (req, res) => {
  db.get(
    "SELECT * FROM EnvironmentalData ORDER BY timestamp DESC LIMIT 1",
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || null);
    }
  );
});

// 3) Lấy min/max toàn bộ dữ liệu
router.get("/minmax", (req, res) => {
  db.get(
    `SELECT
       MIN(temperature) AS minTemp, MAX(temperature) AS maxTemp,
       MIN(humidity)    AS minHumidity, MAX(humidity) AS maxHumidity,
       MIN(CO2)         AS minCO2, MAX(CO2) AS maxCO2,
       MIN(PM1_0)       AS minPM1_0, MAX(PM1_0) AS maxPM1_0,
       MIN(PM2_5)       AS minPM2_5, MAX(PM2_5) AS maxPM2_5,
       MIN(PM10)        AS minPM10, MAX(PM10) AS maxPM10
     FROM EnvironmentalData`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      const format = (min, max) => ({ min: min !== null ? Number(min) : null, max: max !== null ? Number(max) : null });

      res.json({
        temperature: format(row?.minTemp, row?.maxTemp),
        humidity:    format(row?.minHumidity, row?.maxHumidity),
        CO2:         format(row?.minCO2, row?.maxCO2),
        PM1_0:       format(row?.minPM1_0, row?.maxPM1_0),
        PM2_5:       format(row?.minPM2_5, row?.maxPM2_5),
        PM10:        format(row?.minPM10, row?.maxPM10)
      });
    }
  );
});

module.exports = router;
