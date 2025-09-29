const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Không thể kết nối database', err);
  } else {
    console.log('Đã kết nối SQLite database');
  }
});

(async () => {
  try {
    const oldPassword = 'thang3010';
    const newPassword = 'minhkhoi';
    const username = 'admin';

    // Lấy user admin
    db.get(`SELECT * FROM User WHERE username = ?`, [username], async (err, row) => {
      if (err) {
        console.error('Lỗi truy vấn:', err);
        db.close();
        return;
      }

      if (!row) {
        console.log('Không tìm thấy user admin');
        db.close();
        return;
      }

      // Kiểm tra mật khẩu cũ
      const match = await bcrypt.compare(oldPassword, row.password);
      if (!match) {
        console.log('Mật khẩu cũ không đúng, đổi thất bại');
        db.close();
        return;
      }

      // Hash mật khẩu mới
      const hash = await bcrypt.hash(newPassword, 10);
      db.run(`UPDATE User SET password = ? WHERE username = ?`, [hash, username], function(err) {
        if (err) console.error('Đổi mật khẩu thất bại:', err);
        else console.log(`Đổi mật khẩu admin thành công! Mật khẩu mới: ${newPassword}`);
        db.close();
      });
    });

  } catch (err) {
    console.error('Lỗi:', err);
    db.close();
  }
})();
