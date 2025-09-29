const { db } = require('./db');

// Hàm xóa toàn bộ dữ liệu trong bảng EnvironmentalData
function clearEnvironmentalData() {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM EnvironmentalData`, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

// Gọi hàm
(async () => {
  try {
    const result = await clearEnvironmentalData();
    console.log(`✅ Đã xóa ${result.changes} bản ghi trong bảng EnvironmentalData`);

    // Nếu muốn reset lại ID tự tăng về 1:
    db.run(`DELETE FROM sqlite_sequence WHERE name='EnvironmentalData'`);
  } catch (err) {
    console.error('❌ Lỗi khi xóa dữ liệu:', err);
  } finally {
    db.close();
  }
})();
