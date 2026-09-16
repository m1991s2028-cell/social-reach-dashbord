// platforms/youtube.js
// يستخدم YouTube Data API v3 (مفتاح API عادي، بدون OAuth، كافٍ لقراءة بيانات عامة).
// المتطلبات في .env: YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID

const BASE = "https://www.googleapis.com/youtube/v3";

async function fetchYouTubeTop() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    console.warn("[youtube] تخطي: YOUTUBE_API_KEY أو YOUTUBE_CHANNEL_ID غير موجودين في .env");
    return [];
  }

  // 1) الحصول على uploads playlist id الخاص بالقناة
  const channelUrl = `${BASE}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  const channelRes = await fetch(channelUrl);
  const channelData = await channelRes.json();
  if (!channelRes.ok) {
    throw new Error(`YouTube channels error: ${channelData?.error?.message || channelRes.status}`);
  }
  const uploadsPlaylistId =
    channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    console.warn("[youtube] لم يتم العثور على قائمة الرفوعات لهذه القناة");
    return [];
  }

  // 2) أحدث الفيديوهات في تلك القائمة
  const playlistUrl = `${BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`;
  const playlistRes = await fetch(playlistUrl);
  const playlistData = await playlistRes.json();
  if (!playlistRes.ok) {
    throw new Error(`YouTube playlistItems error: ${playlistData?.error?.message || playlistRes.status}`);
  }
  const videoIds = (playlistData.items || [])
    .map((it) => it.snippet?.resourceId?.videoId)
    .filter(Boolean);
  if (videoIds.length === 0) return [];

  // 3) إحصائيات كل فيديو (views/likes/comments)
  const statsUrl = `${BASE}/videos?part=statistics,snippet&id=${videoIds.join(",")}&key=${apiKey}`;
  const statsRes = await fetch(statsUrl);
  const statsData = await statsRes.json();
  if (!statsRes.ok) {
    throw new Error(`YouTube videos error: ${statsData?.error?.message || statsRes.status}`);
  }

  const items = (statsData.items || []).map((v) => ({
    platform: "YouTube",
    id: v.id,
    title: v.snippet?.title || "بدون عنوان",
    // ملاحظة: هذا Views وليس Reach — يوتيوب لا يوفر مقياس Reach منفصل للفيديوهات العامة.
    metric: Number(v.statistics?.viewCount || 0),
    likes: Number(v.statistics?.likeCount || 0),
    comments: Number(v.statistics?.commentCount || 0),
    shares: 0, // يوتيوب لا يوفر عدد المشاركات عبر الـ API العام
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));

  return items;
}

module.exports = { fetchYouTubeTop };
