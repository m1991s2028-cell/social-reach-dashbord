// platforms/meta.js
// Facebook Page + Instagram Business عبر Meta Graph API.
// المتطلبات في .env: META_ACCESS_TOKEN, META_PAGE_ID, INSTAGRAM_BUSINESS_ACCOUNT_ID
//
// ملاحظات مهمة:
// - الـ Access Token يجب أن يكون Page Access Token طويل الأمد (long-lived) بصلاحيات
//   pages_read_engagement و instagram_basic و instagram_manage_insights حسب الحاجة.
// - Reach لكل منشور Facebook و Instagram يُحسب عبر endpoint منفصل للـ insights
//   (وليس نفس رقم الـ Views)، ولهذا نحتفظ به كما ترجعه المنصة كل على حدة.

const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function fetchFacebookTop() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) {
    console.warn("[facebook] تخطي: META_ACCESS_TOKEN أو META_PAGE_ID غير موجودين في .env");
    return [];
  }

  const postsUrl = `${BASE}/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${token}`;
  const postsRes = await fetch(postsUrl);
  const postsData = await postsRes.json();
  if (!postsRes.ok) {
    throw new Error(`Facebook posts error: ${postsData?.error?.message || postsRes.status}`);
  }

  const posts = postsData.data || [];
  const items = [];

  for (const post of posts) {
    let reach = 0;
    try {
      const insightsUrl = `${BASE}/${post.id}/insights?metric=post_impressions_unique&access_token=${token}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      if (insightsRes.ok) {
        reach = Number(insightsData?.data?.[0]?.values?.[0]?.value || 0);
      }
    } catch (err) {
      console.warn(`[facebook] تعذر جلب insights للمنشور ${post.id}: ${err.message}`);
    }

    items.push({
      platform: "Facebook",
      id: post.id,
      title: (post.message || "منشور بدون نص").slice(0, 120),
      metric: reach, // Reach الفعلي (post_impressions_unique)
      likes: Number(post.likes?.summary?.total_count || 0),
      comments: Number(post.comments?.summary?.total_count || 0),
      shares: Number(post.shares?.count || 0),
      url: `https://www.facebook.com/${post.id}`,
    });
  }

  return items;
}

async function fetchInstagramTop() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) {
    console.warn("[instagram] تخطي: META_ACCESS_TOKEN أو INSTAGRAM_BUSINESS_ACCOUNT_ID غير موجودين في .env");
    return [];
  }

  const mediaUrl = `${BASE}/${igId}/media?fields=id,caption,timestamp,like_count,comments_count,permalink,media_type&limit=10&access_token=${token}`;
  const mediaRes = await fetch(mediaUrl);
  const mediaData = await mediaRes.json();
  if (!mediaRes.ok) {
    throw new Error(`Instagram media error: ${mediaData?.error?.message || mediaRes.status}`);
  }

  const media = mediaData.data || [];
  const items = [];

  for (const m of media) {
    let reach = 0;
    try {
      const insightsUrl = `${BASE}/${m.id}/insights?metric=reach&access_token=${token}`;
      const insightsRes = await fetch(insightsUrl);
      const insightsData = await insightsRes.json();
      if (insightsRes.ok) {
        reach = Number(insightsData?.data?.[0]?.values?.[0]?.value || 0);
      }
    } catch (err) {
      console.warn(`[instagram] تعذر جلب insights للمنشور ${m.id}: ${err.message}`);
    }

    items.push({
      platform: "Instagram",
      id: m.id,
      title: (m.caption || "منشور بدون نص").slice(0, 120),
      metric: reach, // Reach الفعلي من IG Insights
      likes: Number(m.like_count || 0),
      comments: Number(m.comments_count || 0),
      shares: 0, // Instagram Graph API لا يوفر عدد المشاركات مباشرة
      url: m.permalink || null,
    });
  }

  return items;
}

module.exports = { fetchFacebookTop, fetchInstagramTop };
