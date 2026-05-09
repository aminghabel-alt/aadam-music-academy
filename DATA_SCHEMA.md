# DATA SCHEMA — Adam Music Academy

> این فایل single source of truth برای ساختار دیتابیس Supabase هست.
> هر تغییر در DB باید اینجا هم آپدیت بشه.

---

## جداول

### `profiles`
اطلاعات تمام کاربران (مربی، هنرجو، والدین)

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | — | از `auth.users` میاد |
| `name` | TEXT | NO | — | نام کامل |
| `role` | TEXT | NO | — | `teacher` / `student` / `parent` |
| `invite_code` | TEXT | YES | NULL | فقط مربی دارد — unique |
| `teacher_id` | UUID | YES | NULL | FK → `profiles.id` — هنرجو/والدین |
| `teacher_name` | TEXT | YES | NULL | cache اسم استاد |
| `sub` | TEXT | YES | NULL | توضیح زیر نام |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `users_own_profile`: هر کاربر فقط profile خودش رو می‌بینه/آپدیت می‌کنه
- `read_teacher_invite_codes`: هر کاربر لاگین‌شده می‌تونه invite_code مربیان رو بخونه

---

### `students`
هنرجوهایی که مربی فعال کرده

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `profile_id` | UUID | YES | NULL | FK → `profiles.id` SET NULL |
| `name` | TEXT | NO | — | نام هنرجو |
| `phone` | TEXT | YES | NULL | — |
| `age` | INT | YES | NULL | — |
| `email` | TEXT | YES | NULL | — |
| `instrument` | TEXT | YES | NULL | نام ساز |
| `level` | TEXT | YES | NULL | `beginner` / `intermediate` / `advanced` |
| `goal` | TEXT | YES | NULL | هدف هنرجو |
| `class_days` | TEXT[] | YES | NULL | آرایه روزهای هفته |
| `class_time` | TEXT | YES | NULL | ساعت کلاس |
| `class_duration` | INT | YES | 60 | مدت جلسه به دقیقه |
| `class_type` | TEXT | YES | `in-person` | `in-person` / `online` |
| `monthly_fee` | INT | YES | NULL | شهریه ماهانه به تومان |
| `payment_status` | TEXT | YES | `pending` | `paid` / `pending` / `overdue` |
| `status` | TEXT | YES | `active` | `active` / `inactive` |
| `notes` | TEXT | YES | NULL | یادداشت مربی |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_students`: مربی فقط هنرجوهای خودش رو می‌بینه/مدیریت می‌کنه

---

### `scores`
نمرات قدیمی — deprecated، موازی با exercise_scores نگه داشته شده

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `session_number` | INT | NO | — | شماره جلسه |
| `is_absent` | BOOLEAN | NO | FALSE | آیا غیبت بوده؟ |
| `technique` | INT | YES | NULL | ۰ تا ۲۰ |
| `rhythm` | INT | YES | NULL | ۰ تا ۲۰ |
| `melody` | INT | YES | NULL | ۰ تا ۲۰ |
| `fretboard` | INT | YES | NULL | ۰ تا ۲۰ |
| `ear` | INT | YES | NULL | ۰ تا ۲۰ |
| `average` | NUMERIC(4,1) | YES | NULL | میانگین ۵ نمره |
| `comment` | TEXT | YES | NULL | نظر مربی |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `messages`
پیام‌های بین مربی و هنرجو/والدین

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `from_id` | UUID | NO | — | FK → `profiles.id` |
| `to_id` | UUID | YES | NULL | FK → `profiles.id` |
| `body` | TEXT | NO | — | متن پیام |
| `role` | TEXT | YES | NULL | نقش فرستنده |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `insert_own_messages`: هر کاربر می‌تونه پیام بفرسته
- `read_own_messages`: هر کاربر پیام‌هایی که فرستاده یا دریافت کرده رو می‌بینه

---

### `practice_logs`
لاگ تمرین روزانه هنرجو

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `date` | DATE | NO | CURRENT_DATE | تاریخ تمرین |
| `duration_seconds` | INT | NO | — | مدت تمرین به ثانیه |
| `note` | TEXT | YES | NULL | یادداشت هنرجو |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `users_own_practice`: هنرجو فقط تمرین‌های خودش رو می‌بینه/ثبت می‌کنه

---

### `error_logs`
ثبت خطاهای runtime

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `user_id` | UUID | YES | NULL | FK → `profiles.id` |
| `error` | TEXT | NO | — | متن خطا |
| `context` | TEXT | YES | NULL | کجای اپ خطا داده |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `lessons`
محتوای آموزشی قدیمی — در حال جایگزینی با سیستم term/session

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` |
| `title` | TEXT | NO | — | عنوان درس |
| `level` | TEXT | YES | NULL | `beginner` / `intermediate` / `advanced` |
| `session_number` | INT | YES | NULL | شماره جلسه |
| `content` | TEXT | YES | NULL | توضیحات درس |
| `link` | TEXT | YES | NULL | لینک ویدیو |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_lessons`: مربی فقط درس‌های خودش رو می‌بینه/مدیریت می‌کنه
- `student_view_lessons`: هنرجو درس‌های استادش رو می‌بینه

---

### `terms`
ترم‌های آموزشی هر هنرجو

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `title` | TEXT | NO | — | عنوان ترم |
| `level` | TEXT | NO | — | `moghadamati_1/2` / `motevaset_1/2` / `pishrafte_1/2` |
| `start_date` | DATE | YES | NULL | تاریخ شروع |
| `status` | TEXT | NO | `active` | `active` / `finished` |
| `include_in_report` | BOOLEAN | NO | TRUE | آیا در کارنامه حساب بشه |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_terms`: مربی فقط terms خودش
- `student_view_own_terms`: هنرجو terms خودش رو می‌بینه

---

### `term_months`
ماه‌های هر ترم — کنترل دسترسی توسط مربی

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `term_id` | UUID | NO | — | FK → `terms.id` CASCADE |
| `month_number` | INT | NO | — | ۱ / ۲ / ۳ |
| `is_unlocked` | BOOLEAN | NO | FALSE | مربی کنترل می‌کنه |
| `unlocked_at` | TIMESTAMPTZ | YES | NULL | کِی unlock شد |

**RLS Policies:**
- `teacher_own_term_months`: مربی از طریق term_id
- `student_view_unlocked_months`: هنرجو فقط ماه‌های unlock شده

---

### `sessions`
جلسات هر ترم — ۱۲ جلسه per term (auto-generate)

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `term_id` | UUID | NO | — | FK → `terms.id` CASCADE |
| `month_number` | INT | NO | — | ۱ / ۲ / ۳ |
| `session_number` | INT | NO | — | ۱ تا ۱۲ |
| `session_date` | DATE | YES | NULL | تاریخ جلسه — auto یا دستی |
| `title` | TEXT | YES | NULL | عنوان اختیاری |
| `content_text` | TEXT | YES | NULL | محتوای آموزشی |
| `link` | TEXT | YES | NULL | لینک منبع |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_sessions`: مربی می‌نویسه
- `student_view_unlocked_sessions`: هنرجو فقط ماه‌های unlock شده

---

### `skill_categories`
دسته‌بندی مهارت‌ها

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | YES | NULL | NULL = default global |
| `name` | TEXT | NO | — | نام دسته |
| `is_default` | BOOLEAN | NO | FALSE | default های سیستم |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**Default categories:** تکنیک / ریتم / ملودی / شنیداری / تئوری

**RLS Policies:**
- `teacher_own_categories`: مربی خودش + همه default ها

---

### `exercises`
تمرین‌های هر جلسه

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `session_id` | UUID | NO | — | FK → `sessions.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `title` | TEXT | NO | — | نام تمرین |
| `category_id` | UUID | YES | NULL | FK → `skill_categories.id` SET NULL |
| `max_score` | INT | NO | 20 | حداکثر نمره |
| `description` | TEXT | YES | NULL | توضیحات تمرین |
| `link` | TEXT | YES | NULL | لینک منبع |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_exercises`: مربی می‌نویسه
- `student_view_exercises`: هنرجو می‌خونه

---

### `exercise_scores`
نمرات تمرین‌ها — per student per exercise

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `exercise_id` | UUID | NO | — | FK → `exercises.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `score` | INT | YES | NULL | نمره داده‌شده |
| `comment` | TEXT | YES | NULL | نظر روی این تمرین |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**Unique:** `(exercise_id, student_id)`

**RLS Policies:**
- `teacher_own_exercise_scores`: مربی insert/update
- `student_view_own_scores`: هنرجو فقط scores خودش

---

## Storage

### Bucket: `session-files`
فایل‌های آموزشی — PDF / MP3 / MP4

**Structure:**
- `sessions/{session_id}/{filename}` — فایل‌های جلسه
- `exercises/{exercise_id}/{filename}` — فایل‌های تمرین

**Policies:** authenticated users می‌تونن upload/read/delete کنن

---

## تغییرات اخیر

| تاریخ | جدول | تغییر |
|-------|------|-------|
| ۱۴۰۴/۰۲/۱۸ | `scores` | اضافه شد `average`, `comment`, `is_absent` |
| ۱۴۰۴/۰۲/۱۸ | `students` | اضافه شد `profile_id`, `status` |
| ۱۴۰۴/۰۲/۱۸ | `messages` | اضافه شد `to_id` |
| ۱۴۰۴/۰۲/۱۸ | `error_logs` | جدول جدید |
| ۱۴۰۴/۰۲/۱۹ | `terms` | جدول جدید + `include_in_report` |
| ۱۴۰۴/۰۲/۱۹ | `term_months` | جدول جدید |
| ۱۴۰۴/۰۲/۱۹ | `sessions` | جدول جدید + `session_date`, `link` |
| ۱۴۰۴/۰۲/۱۹ | `skill_categories` | جدول جدید |
| ۱۴۰۴/۰۲/۱۹ | `exercises` | جدول جدید + `category_id`, `description`, `link` |
| ۱۴۰۴/۰۲/۱۹ | `exercise_scores` | جدول جدید |
| ۱۴۰۴/۰۲/۱۹ | Storage | bucket `session-files` اضافه شد |

---

## نکات مهم

- تمام جداول RLS فعال دارند
- `profiles.id` همیشه برابر `auth.users.id` است
- `scores` جدول قدیمی — موازی با `exercise_scores` نگه داشته شده
- ارتباط هنرجو به مربی: `profiles.teacher_id` + `students.profile_id`

## فاز B — Defer شده
- `classes` — کلاس‌های گروهی
- `skill_categories` custom per teacher (الان فقط default)
