// db.js
// تخزين بسيط بصيغة JSON على القرص (بدون اعتمادات native).
// كل Snapshot يمثل أفضل محتوى تم رصده في تلك الساعة لكل منصة.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "snapshots.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("[db] فشل قراءة الملف، سيتم البدء بمصفوفة فارغة:", err.message);
    return [];
  }
}

function writeAll(rows) {
  ensureStore();
  const tmpFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(rows, null, 2), "utf8");
  fs.renameSync(tmpFile, DATA_FILE);
}

// hourBucket بصيغة: 2026-09-16T18:00 (ساعة محلية للسيرفر)
function currentHourBucket(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:00`;
}

/**
 * يحفظ أفضل عنصر لكل منصة في هذه الساعة (Upsert حسب hourBucket+platform).
 * items: [{ platform, id, title, metric, likes, comments, shares, url }]
 */
function upsertHourlyTop(items, when = new Date()) {
  const hourBucket = currentHourBucket(when);
  const rows = readAll();

  for (const item of items) {
    const idx = rows.findIndex(
      (r) => r.hourBucket === hourBucket && r.platform === item.platform
    );
    const record = {
      hourBucket,
      hour: hourBucket.slice(11, 16), // "18:00" للعرض في الواجهة الحالية
      platform: item.platform,
      id: item.id,
      title: item.title,
      metric: item.metric,
      likes: item.likes || 0,
      comments: item.comments || 0,
      shares: item.shares || 0,
      url: item.url || null,
      capturedAt: new Date().toISOString(),
    };

    if (idx === -1) {
      rows.push(record);
    } else if (Number(item.metric) > Number(rows[idx].metric)) {
      // نحدّث فقط إذا كان الرقم الجديد أعلى (أعلى محتوى في نفس الساعة)
      rows[idx] = record;
    }
  }

  writeAll(rows);
  return hourBucket;
}

function getHourly(platform = "all", { limit = 500 } = {}) {
  const rows = readAll()
    .sort((a, b) => (a.hourBucket < b.hourBucket ? 1 : -1)) // الأحدث أولاً
    .slice(0, limit);
  return platform === "all" ? rows : rows.filter((r) => r.platform === platform);
}

function getLatestPerPlatform() {
  const rows = readAll();
  const latest = {};
  for (const r of rows) {
    if (!latest[r.platform] || r.hourBucket > latest[r.platform].hourBucket) {
      latest[r.platform] = r;
    }
  }
  return Object.values(latest);
}

module.exports = { upsertHourlyTop, getHourly, getLatestPerPlatform, currentHourBucket };
