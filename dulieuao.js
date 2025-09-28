// seed.js - thêm 10 dữ liệu ảo vào bảng EnvironmentalData
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Kết nối tới database
const dbPath = path.join(__dirname, "database.db"); // đổi lại nếu tên DB khác
const db = new sqlite3.Database(dbPath);

function insertDummyData() {
  for (let i = 0; i < 10; i++) {
    const temperature = (20 + Math.random() * 10).toFixed(2); // 20 - 30 °C
    const humidity = (40 + Math.random() * 30).toFixed(2);    // 40 - 70 %
    const co2 = (400 + Math.random() * 200).toFixed(2);       // 400 - 600 ppm
    const pm1_0 = (5 + Math.random() * 5).toFixed(2);         // 5 - 10 µg/m³
    const pm2_5 = (10 + Math.random() * 10).toFixed(2);       // 10 - 20 µg/m³
    const pm10 = (15 + Math.random() * 15).toFixed(2);        // 15 - 30 µg/m³

    db.run(
      `INSERT INTO EnvironmentalData 
        (temperature, humidity, CO2, PM1_0, PM2_5, PM10) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [temperature, humidity, co2, pm1_0, pm2_5, pm10],
      (err) => {
        if (err) console.error("Insert error:", err);
      }
    );
  }
  console.log("✅ Đã thêm 10 dữ liệu ảo vào EnvironmentalData");
}

insertDummyData();

// Đóng DB sau 1s
setTimeout(() => db.close(), 1000);
