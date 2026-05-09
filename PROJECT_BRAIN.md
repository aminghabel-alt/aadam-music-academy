# PROJECT BRAIN — Adam Music Academy

> برگرفته از «بنی آدم اعضای یکدیگرند» — آدم‌ها به هم وصلند، موسیقی این اتصال رو عمیق‌تر می‌کنه.

---

## Vision

پلتفرم مدیریت آموزش موسیقی برای مربیان و هنرجویان.
هدف: ساده‌ترین راه برای اینکه یه مربی موسیقی بتونه کلاس‌هاش رو مدیریت کنه،
با هنرجوهاش در ارتباط باشه، و پیشرفتشون رو دنبال کنه.

---

## Target Audience

**Primary:** مربیان موسیقی (فعلاً گیتار، در آینده همه سازها)
**Secondary:** هنرجویان و والدینشون
**Market:** ابتدا ایران — ساختار چندزبانه (FA/EN) از ابتدا در نظر گرفته شده

---

## Goal های ۶ ماه آینده

1. **اولین پرداخت واقعی** — یه مربی پول بده و از اپ استفاده کنه
2. **۱۰ مربی فعال** با هنرجوهای واقعی
3. **PWA کامل** — قابل نصب روی موبایل
4. **محتوای چندساز** — ساختار درس‌ها توسط مربی قابل تعریف باشه

---

## Monetization Plan

**مدل:** Freemium
- رایگان: تا ۳ هنرجو
- پریمیوم: نامحدود هنرجو — سالی ۲ میلیون تومان از هنرجو

**پورسانت مربی:**
- مربی به ازای هر هنرجویی که از طریق اپ ثبت‌نام می‌کنه، درصدی از اشتراک رو می‌گیره
- مقدار دقیق: TBD

**درگاه پرداخت:** زرین‌پال (ایران) + Stripe (بین‌الملل در آینده)

---

## Tech Stack

| لایه | ابزار |
|------|-------|
| Frontend | Vanilla JS + HTML + CSS (سه فایل جدا) |
| Auth & DB | Supabase |
| Storage | Supabase Storage (`session-files` bucket) |
| Hosting | GitHub Pages (dev branch) |
| PWA | Service Worker + manifest.json |
| AI Assistant | Claude API (فاز بعدی) |
| Payment | زرین‌پال |
| Version Control | Git + GitHub |

**قانون stack:** تا MVP آماده نشده، هیچ framework جدیدی اضافه نمی‌شه.

---

## ساختار فایل‌ها

```
aadam-music-academy/
├── index.html          # HTML — ساختار صفحات
├── style.css           # CSS — تمام استایل‌ها
├── app.js              # JS — تمام لاجیک
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── PROJECT_BRAIN.md    # این فایل
├── DATA_SCHEMA.md      # ساختار دیتابیس
├── PROGRESS.md         # وضعیت پروژه
└── icons/              # آیکون‌های PWA
```

---

## معماری کلی

```
Browser (PWA)
    ↓
app.js — لاجیک اصلی
    ↓
Supabase Client SDK
    ↓
Supabase (Auth + PostgreSQL + Storage)
```

**هیچ custom backend وجود نداره.**

---

## نقش‌های کاربری (Roles)

| نقش | دسترسی |
|-----|---------|
| `teacher` | مدیریت هنرجو، term/session/exercise، ثبت نمره، فایل upload |
| `student` | مشاهده term/session/exercise، کارنامه، تمرین، پیام |
| `parent` | مشاهده کارنامه فرزند، پیام به استاد |

---

## قوانین کدنویسی

1. **هر تابع یه کار** — اگه تابع بیشتر از ۳۰ خط شد، تقسیمش کن
2. **async/await همه جا** — callback ممنوع
3. **Error handling همیشه** — هر Supabase call باید `error` رو چک کنه
4. **showNotif برای همه feedback** — هیچ alert() نداریم
5. **فارسی برای UI، انگلیسی برای کد**
6. **هیچ داده hardcode** — همه داده‌ها از Supabase میان

---

## قوانین دیتابیس

1. **هر جدول RLS داره**
2. **UUID برای همه ID ها**
3. **created_at در همه جداول**
4. **Foreign key همیشه با ON DELETE CASCADE یا SET NULL**
5. **هر تغییر schema = آپدیت DATA_SCHEMA.md**

---

## Definition of Done

یه feature وقتی "done" هست که:
- [ ] روی GitHub Pages کار می‌کنه
- [ ] با داده واقعی Supabase تست شده
- [ ] روی موبایل تست شده
- [ ] error handling داره
- [ ] DATA_SCHEMA.md آپدیت شده (اگه DB تغییر کرده)

---

## PROPOSAL Rule

**PROPOSAL بنویس فقط وقتی:**
- جدول DB تغییر می‌کنه
- یه بخش کاملاً جدید به اپ اضافه می‌شه

**بدون PROPOSAL:**
- تغییر UI، رنگ، متن
- فیلد جدید به فرم
- باگ fix

---

## Roadmap

### MVP (✅ تموم شد)
- [x] Auth سه نقشه + کد دعوت
- [x] Term / Session / Exercise system
- [x] File upload (PDF/MP3/MP4)
- [x] Karname jadid — skill + nemodar
- [x] Student view kamel
- [x] GitHub Pages deploy

### فاز ۲ (بعدی)
- [ ] PWA کامل — نصب روی موبایل
- [ ] Mobile test
- [ ] کلاس‌های گروهی
- [ ] Skill categories custom per teacher
- [ ] دوزبانه FA/EN

### فاز ۳ (Monetization)
- [ ] درگاه پرداخت — زرین‌پال
- [ ] Freemium logic (max 3 students free)
- [ ] AI assistant با Claude API
- [ ] اپ موبایل (PWA → Native)

---

## نکات مهم برای Claude

- **stack:** Vanilla JS + Supabase — بدون React، بدون Next.js
- **فایل‌ها:** سه فایل جدا (index.html / style.css / app.js)
- **دیتابیس:** برای ساختار دقیق ← DATA_SCHEMA.md بخون
- **زبان UI:** فارسی RTL با فونت Vazirmatn
- **رنگ اصلی:** طلایی `#c9a84c` روی پس‌زمینه تاریک `#0a0a0f`
- **GitHub Pages:** از `dev` branch serve میشه
- **هیچ وقت** داده mock یا hardcode اضافه نکن
