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

**Relations:**
- `teacher_id` → `profiles.id` (self-referential)

**RLS Policies:**
- `users_own_profile`: هر کاربر فقط profile خودش رو می‌بینه/آپدیت می‌کنه
- `read_teacher_invite_codes`: هر کاربر لاگین‌شده می‌تونه invite_code مربیان رو بخونه
- `update_own_profile`: هر کاربر می‌تونه profile خودش رو آپدیت کنه

---

### `students`
هنرجوهایی که مربی فعال کرده — با اطلاعات کامل کلاس

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` |
| `profile_id` | UUID | YES | NULL | FK → `profiles.id` — اگه از app ثبت‌نام کرده |
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

**Relations:**
- `teacher_id` → `profiles.id` CASCADE DELETE
- `profile_id` → `profiles.id` SET NULL

**RLS Policies:**
- `teacher_own_students`: مربی فقط هنرجوهای خودش رو می‌بینه/مدیریت می‌کنه

---

### `scores`
نمرات و غیبت‌های هنرجو در هر جلسه

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` |
| `student_id` | UUID | NO | — | FK → `students.id` |
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

**Relations:**
- `teacher_id` → `profiles.id`
- `student_id` → `students.id` CASCADE DELETE

**RLS Policies:**
- `teacher_insert_scores`: مربی می‌تونه نمره insert کنه
- `teacher_select_scores`: مربی فقط نمرات هنرجوهای خودش رو می‌بینه
- `student_view_own_scores`: هنرجو نمرات خودش رو می‌بینه (از طریق student_id)

---

### `messages`
پیام‌های بین مربی و هنرجو/والدین

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `from_id` | UUID | NO | — | FK → `profiles.id` — فرستنده |
| `to_id` | UUID | YES | NULL | FK → `profiles.id` — گیرنده |
| `body` | TEXT | NO | — | متن پیام |
| `role` | TEXT | YES | NULL | نقش فرستنده |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**Relations:**
- `from_id` → `profiles.id`
- `to_id` → `profiles.id`

**RLS Policies:**
- `insert_own_messages`: هر کاربر می‌تونه پیام بفرسته
- `read_own_messages`: هر کاربر پیام‌هایی که فرستاده یا دریافت کرده رو می‌بینه

---

### `practice_logs`
لاگ تمرین روزانه هنرجو

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `student_id` | UUID | NO | — | FK → `students.id` |
| `date` | DATE | NO | CURRENT_DATE | تاریخ تمرین |
| `duration_seconds` | INT | NO | — | مدت تمرین به ثانیه |
| `note` | TEXT | YES | NULL | یادداشت هنرجو |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**Relations:**
- `student_id` → `students.id` CASCADE DELETE

**RLS Policies:**
- `users_own_practice`: هنرجو فقط تمرین‌های خودش رو می‌بینه/ثبت می‌کنه

---

### `error_logs`
ثبت خطاهای runtime برای debugging

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `user_id` | UUID | YES | NULL | FK → `profiles.id` |
| `error` | TEXT | NO | — | متن خطا |
| `context` | TEXT | YES | NULL | کجای اپ خطا داده |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `insert_error_logs`: هر کاربر می‌تونه خطا log کنه
- `admin_read_errors`: فقط admin می‌تونه بخونه (TBD)

---

## SQL — ساخت جداول از صفر

```sql
-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','teacher','parent')),
  invite_code TEXT UNIQUE,
  teacher_id UUID REFERENCES profiles(id),
  teacher_name TEXT,
  sub TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT, age INT, email TEXT,
  instrument TEXT, level TEXT, goal TEXT,
  class_days TEXT[], class_time TEXT,
  class_duration INT DEFAULT 60,
  class_type TEXT DEFAULT 'in-person',
  monthly_fee INT, payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- scores
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  is_absent BOOLEAN DEFAULT FALSE,
  technique INT, rhythm INT, melody INT, fretboard INT, ear INT,
  average NUMERIC(4,1),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID REFERENCES profiles(id),
  to_id UUID REFERENCES profiles(id),
  body TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- practice_logs
CREATE TABLE practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  duration_seconds INT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- error_logs
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  error TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## تغییرات اخیر

| تاریخ | جدول | تغییر |
|-------|------|-------|
| ۱۴۰۴/۰۲ | `scores` | اضافه شد `average`, `comment`, `is_absent` |
| ۱۴۰۴/۰۲ | `students` | اضافه شد `profile_id`, `status` |
| ۱۴۰۴/۰۲ | `messages` | اضافه شد `to_id` |
| ۱۴۰۴/۰۲ | `error_logs` | جدول جدید |

---

## نکات مهم

- تمام جداول RLS فعال دارند
- `profiles.id` همیشه برابر `auth.users.id` است
- هنرجوهایی که از app ثبت‌نام کردند: هم توی `profiles` هستند هم (بعد از تأیید مربی) توی `students`
- ارتباط هنرجو به مربی از دو طریق: `profiles.teacher_id` (قبل از تأیید) و `students.profile_id` (بعد از تأیید)

### `lessons`
محتوای آموزشی که مربی تعریف می‌کنه

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

Success shod?

Hala **DATA_SCHEMA.md ro update konim** — in jadval haro ezafe kon:

```markdown
### `terms`
ترم‌های آموزشی هر هنرجو

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `title` | TEXT | NO | — | عنوان ترم |
| `level` | TEXT | NO | — | `moghadamati_1/2` / `motevaset_1/2` / `pishrafte_1/2` |
| `start_date` | DATE | YES | NULL | — |
| `status` | TEXT | NO | `active` | `active` / `finished` |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

### `term_months`
ماه‌های هر ترم — کنترل دسترسی توسط مربی

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `term_id` | UUID | NO | — | FK → `terms.id` CASCADE |
| `month_number` | INT | NO | — | ۱ / ۲ / ۳ |
| `is_unlocked` | BOOLEAN | NO | FALSE | مربی کنترل می‌کنه |
| `unlocked_at` | TIMESTAMPTZ | YES | NULL | — |

### `sessions`
جلسات هر ترم

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `term_id` | UUID | NO | — | FK → `terms.id` CASCADE |
| `month_number` | INT | NO | — | ۱ / ۲ / ۳ |
| `session_number` | INT | NO | — | ۱ تا ۳۶ |
| `title` | TEXT | YES | NULL | — |
| `content_text` | TEXT | YES | NULL | — |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

### `exercises`
تمرین‌های هر جلسه

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `session_id` | UUID | NO | — | FK → `sessions.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `title` | TEXT | NO | — | — |
| `max_score` | INT | NO | 20 | — |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

### `exercise_scores`
نمرات تمرین‌ها

| ستون | Type | Nullable | Default | توضیح |
|------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `exercise_id` | UUID | NO | — | FK → `exercises.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `score` | INT | YES | NULL | — |
| `comment` | TEXT | YES | NULL | — |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---
## Faz B — Baadii (Defer Shod)
- `skill_categories` — دسته‌بندی مهارت‌ها
- `classes` — کلاس‌های گروهی
```

| `session_date` | DATE | YES | NULL | تاریخ جلسه — auto یا دستی |