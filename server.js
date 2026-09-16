// server.js
// Node.js 20+
// 1) npm install
// 2) انسخ .env.example إلى .env وامﻷ المفاتيح
// 3) node server.js

require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");
const scheduler = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// أعلى محتوى مُسجَّل لكل ساعة (البيانات الحقيقية المحفوظة من المنصات)
app.get("/api/hourly", (req, res) => {
  const platform = req.query.platform || "all";
  const rows = db.getHourly(platform);
  res.json(rows);
});

// أحدث سجل محفوظ لكل منصة (لبطاقات الملخص أعلى الصفحة)
app.get("/api/latest", (req, res) => {
  res.json(db.getLatestPerPlatform());
});

// تحديث فوري يدوي بدل انتظار الجدولة الساعية
app.post("/api/refresh", async (req, res) => {
  try {
    const result = await scheduler.runOnce();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[server] فشل /api/refresh:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
  scheduler.start();
});
