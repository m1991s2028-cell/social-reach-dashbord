// platforms/tiktok.js
// TikTok API v2 - Display API (video.list) لحساب المستخدم/الأعمال المُصرَّح له عبر OAuth.
// المتطلبات في .env: TIKTOK_ACCESS_TOKEN
//
// ملاحظة: هذا الـ endpoint يتطلب تطبيق TikTok Developer مُفعَّل مع صلاحية
// video.list، وTOKEN صادر عبر تدفّق OAuth الرسمي لحساب المستخدم نفسه
// (TikTok لا يسمح بجلب بيانات حسابات أخرى دون صلاحياتها).

const BASE = "https://open.tiktokapis.com/v2";

async function fetchTikTokTop() {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    console.warn("[tiktok] تخطي: TIKTOK_ACCESS_TOKEN غير موجود في .env");
    return [];
  }

  const url = `${BASE}/video/list/?fields=id,title,view_count,like_count,comment_count,share_count,share_url`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: 10 }),
  });
  const data = await res.json();
  if (!res.ok || data?.error?.code === "error") {
    throw new Error(`TikTok video.list error: ${data?.error?.message || res.status}`);
  }

  const videos = data?.data?.videos || [];
  return videos.map((v) => ({
    platform: "TikTok",
    id: v.id,
    title: (v.title || "فيديو بدون عنوان").slice(0, 120),
    metric: Number(v.view_count || 0), // Views الفعلية من TikTok
    likes: Number(v.like_count || 0),
    comments: Number(v.comment_count || 0),
    shares: Number(v.share_count || 0),
    url: v.share_url || null,
  }));
}

module.exports = { fetchTikTokTop };
