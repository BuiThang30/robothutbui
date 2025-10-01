document.addEventListener('DOMContentLoaded', () => {
  // --- Slider ---
  const slides = document.querySelectorAll('.slide-item');
  if (slides.length > 0) {
    let current = 0;
    slides[0].classList.add('active');

    setInterval(() => {
      slides.forEach(slide => slide.classList.remove('active'));
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 3000);
  }

  // --- Chart helper ---
  function createChart(canvasId, label, color, min, max) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label,
          data: [],
          borderColor: color,
          backgroundColor: color.replace('1)', '0.2)'),
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min, max } }
      }
    });
  }

  // --- Hàm format UTC+0 → UTC+7 ---
  function formatTimeUTC7(utcString) {
    const d = new Date(utcString);
    d.setHours(d.getHours() + 7); // cộng 7h

    const day = d.toLocaleDateString("en-US", { weekday: "short" });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    return `${day}, ${time}`;
  }

  // --- Tạo các chart ---
  const charts = {
    temperature: createChart("chartTemp", "Temperature (°C)", "rgba(255,99,132,1)", 0, 40),
    humidity: createChart("chartHumidity", "Humidity (%)", "rgba(54,162,235,1)", 0, 100),
    co2: createChart("chartCO2", "CO2 (ppm)", "rgba(255,206,86,1)", 0, 2000),
    pm1: createChart("chartPM1", "PM1.0 (µg/m³)", "rgba(75,192,192,1)", 0, 1000),
    pm25: createChart("chartPM25", "PM2.5 (µg/m³)", "rgba(153,102,255,1)", 0, 1000),
    pm10: createChart("chartPM10", "PM10 (µg/m³)", "rgba(255,159,64,1)", 0, 1000),
  };

  let lastTimestamp = null;

  // --- Load lịch sử ban đầu ---
  async function loadHistory() {
    try {
      const res = await fetch("/api/data/history");
      const rows = await res.json();
      rows.reverse().forEach(r => {
        const time = formatTimeUTC7(r.timestamp);
        const mapping = {
          temperature: r.temperature,
          humidity: r.humidity,
          co2: r.CO2,
          pm1: r.PM1_0,
          pm25: r.PM2_5,
          pm10: r.PM10
        };
        for (let key in charts) {
          if (charts[key]) {
            charts[key].data.labels.push(time);
            charts[key].data.datasets[0].data.push(mapping[key]);
          }
        }
      });
      for (let key in charts) { if (charts[key]) charts[key].update(); }
      if (rows.length) lastTimestamp = rows[rows.length-1].timestamp;
    } catch (err) { console.error("History error:", err); }
  }

  // --- Cập nhật realtime + min/max ---
  async function fetchLatest() {
    try {
      const res = await fetch("/api/data/latest");
      const data = await res.json();
      if (!data) return;

      const time = formatTimeUTC7(data.timestamp);

      // --- update hiển thị số liệu realtime (luôn chạy) ---
      document.getElementById("tempValue").textContent  = data.temperature + " °C";
      document.getElementById("humValue").textContent   = data.humidity + " %";
      document.getElementById("co2Value").textContent   = data.CO2 + " PPM";
      document.getElementById("pm1Value").textContent   = data.PM1_0 + " μg/m³";
      document.getElementById("pm25Value").textContent  = data.PM2_5 + " μg/m³";
      document.getElementById("pm10Value").textContent  = data.PM10 + " μg/m³";

      // --- chỉ update chart khi có dữ liệu mới ---
      if (data.timestamp !== lastTimestamp) {
        lastTimestamp = data.timestamp;

        const mapping = {
          temperature: data.temperature,
          humidity: data.humidity,
          co2: data.CO2,
          pm1: data.PM1_0,
          pm25: data.PM2_5,
          pm10: data.PM10
        };

        for (let key in charts) {
          if (charts[key]) {
            charts[key].data.labels.push(time);
            charts[key].data.datasets[0].data.push(mapping[key]);

            if (charts[key].data.labels.length > 10) {
              charts[key].data.labels.shift();
              charts[key].data.datasets[0].data.shift();
            }
            charts[key].update();
          }
        }
      }

      // --- update min/max (luôn chạy) ---
      const minmaxRes = await fetch("/api/data/minmax");
      const minmax = await minmaxRes.json();

      document.getElementById("tempMin").textContent  = minmax.temperature.min + " °C";
      document.getElementById("tempMax").textContent  = minmax.temperature.max + " °C";

      document.getElementById("humMin").textContent   = minmax.humidity.min + " %";
      document.getElementById("humMax").textContent   = minmax.humidity.max + " %";

      document.getElementById("co2Min").textContent   = minmax.CO2.min + " PPM";
      document.getElementById("co2Max").textContent   = minmax.CO2.max + " PPM";

      document.getElementById("pm1Min").textContent   = minmax.PM1_0.min + " μg/m³";
      document.getElementById("pm1Max").textContent   = minmax.PM1_0.max + " μg/m³";

      document.getElementById("pm25Min").textContent  = minmax.PM2_5.min + " μg/m³";
      document.getElementById("pm25Max").textContent  = minmax.PM2_5.max + " μg/m³";

      document.getElementById("pm10Min").textContent  = minmax.PM10.min + " μg/m³";
      document.getElementById("pm10Max").textContent  = minmax.PM10.max + " μg/m³";

    } catch (err) {
      console.error("Fetch latest error:", err);
    }
  }

  // --- Khởi chạy ---
  loadHistory();
  fetchLatest();
  setInterval(fetchLatest, 5000);
  // Phần Socket & Điều khiển Robot
  const socket = io("http://localhost:3000"); // đổi sang IP server NodeJS

  let currentSpeed = 0;
  let mode = "auto";
  let powerOn = false;

  const modeSwitch = document.getElementById("modeSwitch");
  const modeLabel  = document.getElementById("modeLabel");
  const controlBox = document.getElementById("controlBox");

  const btnUp = document.getElementById("btnUp");
  const btnDown = document.getElementById("btnDown");
  const btnLeft = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");
  const btnPower = document.getElementById("btnPower");
  const speedBar = document.getElementById("speedBar");
  const speedValue = document.getElementById("speedValue");

  // --- Set trạng thái mặc định khi load trang ---
  if (!modeSwitch.checked) {
    mode = "auto";
    controlBox.classList.add("disabled");
  } else {
    mode = "manual";
    controlBox.classList.remove("disabled");
  }

  // --- Chuyển chế độ ---
  modeLabel.textContent = modeSwitch.checked ? "Thủ công" : "Tự động";
  if (!modeSwitch.checked) controlBox.classList.add("disabled");

  // Khi gạt switch
  modeSwitch.addEventListener("change", () => {
    if (modeSwitch.checked) {
      mode = "manual";
      modeLabel.textContent = "Thủ công";
      controlBox.classList.remove("disabled");
    } else {
      mode = "auto";
      modeLabel.textContent = "Tự động";
      controlBox.classList.add("disabled");
    }
    socket.emit("change-mode", mode);
  });

  // --- Thanh tốc độ ---
  speedBar.addEventListener("input", () => {
    currentSpeed = speedBar.value;
    speedValue.textContent = currentSpeed;
  });

  // --- Hàm gửi lệnh ---
  function sendCommand(direction) {
    if (mode !== "manual") return;
    const command = `${direction},${currentSpeed}`;
    socket.emit("control", command);
    console.log("Sent:", command);
  }

  // --- Nút điều khiển ---
  btnUp.addEventListener("click", () => sendCommand("UP"));
  btnDown.addEventListener("click", () => sendCommand("DOWN"));
  btnLeft.addEventListener("click", () => sendCommand("LEFT"));
  btnRight.addEventListener("click", () => sendCommand("RIGHT"));

  // --- Nút Power ---
  btnPower.addEventListener("click", () => {
    if (mode !== "manual") return;
    powerOn = !powerOn;
    btnPower.textContent = powerOn ? "ON" : "OFF";
    btnPower.classList.toggle("off", !powerOn);

    // Gửi đúng event mà server lắng nghe
    socket.emit("toggle-motor", powerOn ? "on" : "off");
  });



  // --- Gửi Gmail ---
  window.sendMessage = async function() {
    let nameInput = document.getElementById("name");
    let emailInput = document.getElementById("email");
    let messageInput = document.getElementById("message");

    let name = nameInput.value;
    let email = emailInput.value;
    let message = messageInput.value;

    if (!name || !email || !message) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    // Hiện thông báo trước
    let alertBox = document.getElementById("alertBox");
    alertBox.style.display = "block";
    document.querySelector("#alertBox p").textContent = "⏳ Đang gửi...";

    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });

      const data = await res.json();

      if (data.success) {
        document.querySelector("#alertBox p").textContent = "✅ Gửi thành công!";

        // 👉 Xóa trắng input sau khi gửi thành công
        nameInput.value = "";
        emailInput.value = "";
        messageInput.value = "";
      } else {
        document.querySelector("#alertBox p").textContent =
          "❌ Lỗi khi gửi mail: " + (data.error || "");
      }
    } catch (err) {
      console.error("Mail API error:", err);
      document.querySelector("#alertBox p").textContent = "❌ Lỗi server khi gửi mail!";
    }

    setTimeout(() => alertBox.style.display = "none", 3000);
  };


  // ----- MENU TOGGLE -----
  const menuToggle = document.getElementById("mobile-menu");
  const navContainer = document.getElementById("nav-container");

  menuToggle.addEventListener("click", () => {
    navContainer.classList.toggle("active");
  });

  // Ẩn menu sau khi click link
  document.querySelectorAll("#nav-container a").forEach(link => {
    link.addEventListener("click", () => {
      navContainer.classList.remove("active");
    });
  });
});

