# Social Reach Dashboard — ربط حقيقي (Instagram, Facebook, TikTok, YouTube)

يسحب هذا السيرفر بيانات حقيقية من الـ APIs الرسمية **كل ساعة تلقائيًا**، يحفظ أعلى محتوى
لكل منصة في تلك الساعة، ويعرضها في لوحة تحكم بسيطة.

## 1) التشغيل

```
npm install
cp .env.example .env
# افتح .env واملأ المفاتيح (راجع القسم 2 بالأسفل لكل منصة)
node server.js
```

افتح: http://localhost:3000

- السحب يحدث تلقائيًا كل ساعة (عند الدقيقة 0) طالما السيرفر شغّال.
- زر "سحب الآن" في الواجهة يشغّل السحب فورًا لأي منصة مفعّلة، بدل انتظار الساعة القادمة.
- إذا كانت منصة معينة بدون مفاتيح في `.env`، يتم تخطّيها فقط (لا يتوقف السيرفر ولا بقية المنصات).

## 2) كيف تحصل على مفاتيح كل منصة

### YouTube
1. اذهب إلى Google Cloud Console → فعّل **YouTube Data API v3**.
2. أنشئ **API Key** من Credentials وضعه في `YOUTUBE_API_KEY`.
3. `YOUTUBE_CHANNEL_ID` تجده في إعدادات قناتك على YouTube Studio (Advanced settings).

### Facebook (صفحة) + Instagram (حساب أعمال)
1. أنشئ تطبيق على [developers.facebook.com](https://developers.facebook.com).
2. اربط صفحة الفيسبوك وحساب انستجرام الأعمال المتصل بها.
3. عبر Graph API Explorer، ولّد **Page Access Token** طويل الأمد بالصلاحيات:
   `pages_read_engagement`, `pages_read_user_content`, `instagram_basic`, `instagram_manage_insights`.
4. `META_PAGE_ID`: معرّف صفحتك. `INSTAGRAM_BUSINESS_ACCOUNT_ID`: تجده عبر
   `GET /{page-id}?fields=instagram_business_account`.

### TikTok
1. أنشئ تطبيق على [TikTok for Developers](https://developers.tiktok.com) وفعّل **Login Kit** + صلاحية `video.list`.
2. نفّذ تدفق OAuth الرسمي لحسابك لتحصل على `access_token` (وربطه بـ `refresh_token` لتجديده — TikTok tokens تنتهي صلاحيتها).
3. ضع الـ access token في `TIKTOK_ACCESS_TOKEN`. TikTok لا يسمح بجلب بيانات أي حساب سوى الحساب المُصرَّح له في التوكن نفسه.

## 3) ملاحظات مهمة

- **Views ليست Reach.** احتفظنا بكل حقل كما ترجعه المنصة: YouTube يرجع Views فقط
  (لا يوجد Reach عام عبر الـ API)، بينما Facebook/Instagram يرجعان Reach حقيقي
  (`post_impressions_unique` / `reach`) عبر endpoint منفصل للـ insights.
- التوكنات تُقرأ من `.env` على السيرفر فقط، ولا تظهر أبدًا في HTML أو المتصفح.
- التخزين حاليًا ملف JSON بسيط (`data/snapshots.json`) — كافٍ لمشروع شخصي/فريق صغير.
  إذا احتجت لاحقًا قاعدة بيانات حقيقية (Postgres/MySQL) للحجم الكبير أو عدة سيرفرات، أخبرني وأبدّل طبقة `db.js` بدون تغيير بقية الكود.
- انتبه لحدود معدل الطلبات (Rate Limits) لكل API، خصوصًا إذا صغّرت `REFRESH_CRON` للاختبار.
- التوكنات (خصوصًا Meta وTikTok) تنتهي صلاحيتها دوريًا وتحتاج تجديد — إذا توقفت منصة عن الظهور في اللوحة، أول شيء تتحقق منه هو صلاحية التوكن.

## 4) هيكل الملفات

```
server.js          # Express + نقاط الـ API
scheduler.js        # الجدولة الساعية + تشغيل يدوي فوري
db.js                # تخزين/قراءة أعلى محتوى لكل ساعة
platforms/
  youtube.js         # YouTube Data API v3
  meta.js            # Facebook + Instagram عبر Graph API
  tiktok.js          # TikTok API v2
public/index.html     # الواجهة
data/snapshots.json   # يُنشأ تلقائيًا عند أول سحب
```
