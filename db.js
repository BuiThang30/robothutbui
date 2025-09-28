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

// ----------------------------
// Tạo bảng User
// ----------------------------
db.run(`
CREATE TABLE IF NOT EXISTS User (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
)
`, (err) => {
  if (err) console.error('Error creating User table', err);
});

// ----------------------------
// Hàm thêm user
// ----------------------------
async function addUser(username, plainPassword) {
  const hash = await bcrypt.hash(plainPassword, 10);
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO User (username, password) VALUES (?, ?)`, [username, hash], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

// ----------------------------
// Hàm kiểm tra login
// ----------------------------
async function checkUser(username, plainPassword) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM User WHERE username = ?`, [username], async (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(false);
      else {
        const match = await bcrypt.compare(plainPassword, row.password);
        resolve(match ? row : false);
      }
    });
  });
}

// Export
module.exports = {
  db,
  addUser,
  checkUser
};
