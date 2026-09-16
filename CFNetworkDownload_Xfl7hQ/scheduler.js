// scheduler.js
// يجمع أعلى محتوى من كل منصة كل ساعة ويحفظه عبر db.js

const cron = require("node-cron");
const db = require("./db");
const { fetchYouTubeTop } = require("./platforms/youtube");
const { fetchFacebookTop, fetchInstagramTop } = require("./platforms/meta");
const { fetchTikTokTop } = require("./platforms/tiktok");

// كل منصة معزولة بـ try/catch: فشل منصة واحدة لا يوقف البقية
async function safe(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[scheduler] خطأ في ${label}: ${err.message}`);
    return [];
  }
}

function topPerPlatform(items) {
  const byPlatform = {};
  for (const item of items) {
    if (!byPlatform[item.platform] || Number(item.metric) > Number(byPlatform[item.platform].metric)) {
      byPlatform[item.platform] = item;
    }
  }
  return Object.values(byPlatform);
}

async function runOnce() {
  console.log(`[scheduler] بدء السحب — ${new Date().toISOString()}`);

  const [yt, fb, ig, tt] = await Promise.all([
    safe("YouTube", fetchYouTubeTop),
    safe("Facebook", fetchFacebookTop),
    safe("Instagram", fetchInstagramTop),
    safe("TikTok", fetchTikTokTop),
  ]);

  const allItems = [...yt, ...fb, ...ig, ...tt];
  if (allItems.length === 0) {
    console.warn("[scheduler] لم يتم جلب أي بيانات — تحقق من مفاتيح API في .env");
    return { hourBucket: db.currentHourBucket(), saved: 0 };
  }

  const top = topPerPlatform(allItems);
  const hourBucket = db.upsertHourlyTop(top);
  console.log(`[scheduler] تم الحفظ للساعة ${hourBucket} — ${top.length} سجل`);
  return { hourBucket, saved: top.length };
}

function start() {
  // كل ساعة عند الدقيقة صفر — عدّل الـ cron في .env عبر REFRESH_CRON إذا أردت تكرارًا مختلفًا للاختبار
  const expr = process.env.REFRESH_CRON || "0 * * * *";
  cron.schedule(expr, () => {
    runOnce().catch((err) => console.error("[scheduler] فشل غير متوقع:", err));
  });
  console.log(`[scheduler] تم الجدولة: "${expr}"`);

  if (process.env.RUN_ON_START === "true") {
    runOnce().catch((err) => console.error("[scheduler] فشل التشغيل الأولي:", err));
  }
}

module.exports = { start, runOnce };
