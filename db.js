const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// ----------------------------
// Tạo bảng EnvironmentalData
// ----------------------------
db.run(`
CREATE TABLE IF NOT EXISTS EnvironmentalData (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temperature REAL,
  humidity REAL,
  CO2 REAL,
  PM1_0 REAL,
  PM2_5 REAL,
  PM10 REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
`, (err) => {
  if (err) console.error('Error creating EnvironmentalData table', err);
});


// Export
module.exports = {
  db
};
