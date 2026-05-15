# DATA SCHEMA — AADAM Music Academy

> Single source of truth baraye sakhtar database Supabase.
> Har taghir dar DB bayad inja ham update beshe.

---

## Jadval-ha

### `profiles`
Etela'at tamam karbaran (morabbi, honarjoo, valedeyn)

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | — | Az `auth.users` miyad |
| `name` | TEXT | NO | — | Name kamel |
| `role` | TEXT | NO | — | `teacher` / `student` / `parent` |
| `invite_code` | TEXT | YES | NULL | Faghat morabbi dare — unique |
| `teacher_id` | UUID | YES | NULL | FK → `profiles.id` — honarjoo/valedeyn |
| `teacher_name` | TEXT | YES | NULL | Cache esm ostad |
| `sub` | TEXT | YES | NULL | Tozih zire name |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `users_own_profile`: har karbari faghat profile khodesh ro mibine/update mikone
- `read_teacher_invite_codes`: har karbari login-shode mitone invite_code morabbayan ro bekhone

---

### `students`
Honarjooyani ke morabbi fa'al karde

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `profile_id` | UUID | YES | NULL | FK → `profiles.id` SET NULL |
| `name` | TEXT | NO | — | Name honarjoo |
| `phone` | TEXT | YES | NULL | — |
| `age` | INT | YES | NULL | — |
| `email` | TEXT | YES | NULL | — |
| `instrument` | TEXT | YES | NULL | Name saz |
| `level` | TEXT | YES | NULL | `beginner` / `intermediate` / `advanced` |
| `goal` | TEXT | YES | NULL | Hadaf honarjoo |
| `class_days` | TEXT[] | YES | NULL | Array ruz-haye hafte |
| `class_time` | TEXT | YES | NULL | Sa'at kelas |
| `class_duration` | INT | YES | 60 | Modat jalaseh be daghigheh |
| `class_type` | TEXT | YES | `in-person` | `in-person` / `online` |
| `monthly_fee` | INT | YES | NULL | Shahrieh mahane be toman |
| `payment_status` | TEXT | YES | `pending` | `paid` / `pending` / `overdue` |
| `status` | TEXT | YES | `active` | `active` / `inactive` |
| `notes` | TEXT | YES | NULL | Yaddash morabbi |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_students`: morabbi faghat honarjoohaye khodesh ro mibine/modiriyat mikone

---

### `scores`
Nomrat ghadimi — deprecated, moazi ba exercise_scores negah dashte shode

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `session_number` | INT | NO | — | Shomareh jalaseh |
| `is_absent` | BOOLEAN | NO | FALSE | Aya gheybat bode? |
| `technique` | INT | YES | NULL | 0 ta 20 |
| `rhythm` | INT | YES | NULL | 0 ta 20 |
| `melody` | INT | YES | NULL | 0 ta 20 |
| `fretboard` | INT | YES | NULL | 0 ta 20 |
| `ear` | INT | YES | NULL | 0 ta 20 |
| `average` | NUMERIC(4,1) | YES | NULL | Miangin 5 nomreh |
| `comment` | TEXT | YES | NULL | Nazar morabbi |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `messages`
Payam-haye beyn morabbi va honarjoo/valedeyn

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `from_id` | UUID | NO | — | FK → `profiles.id` |
| `to_id` | UUID | YES | NULL | FK → `profiles.id` |
| `body` | TEXT | NO | — | Matn payam |
| `role` | TEXT | YES | NULL | Naghsh ferestande |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `insert_own_messages`: har karbari mitone payam befreste
- `read_own_messages`: har karbari payam-hayi ke ferestade ya daryaft karde ro mibine

---

### `practice_logs`
Log tamrin ruzane honarjoo

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `date` | DATE | NO | CURRENT_DATE | Tarikh tamrin |
| `duration_seconds` | INT | NO | — | Modat tamrin be saniyeh |
| `note` | TEXT | YES | NULL | Yaddash honarjoo |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `users_own_practice`: honarjoo faghat tamrin-haye khodesh ro mibine/sabt mikone

**Karbord dar app:** streak haftegi az in jadval hessab mishe (consecutive days)

---

### `error_logs`
Sabt khatahaye runtime

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `user_id` | UUID | YES | NULL | FK → `profiles.id` |
| `error` | TEXT | NO | — | Matn khata |
| `context` | TEXT | YES | NULL | Koja app khata dade |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `lessons`
Mohtavaye amuzeshi ghadimi — dar hal jayegozini ba system term/session

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` |
| `title` | TEXT | NO | — | Onvan dars |
| `level` | TEXT | YES | NULL | `beginner` / `intermediate` / `advanced` |
| `session_number` | INT | YES | NULL | Shomareh jalaseh |
| `content` | TEXT | YES | NULL | Tozihate dars |
| `link` | TEXT | YES | NULL | Link video |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `terms`
Term-haye amuzeshi har honarjoo

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `title` | TEXT | NO | — | Onvan term |
| `level` | TEXT | NO | — | `moghadamati_1/2` / `motevaset_1/2` / `pishrafte_1/2` |
| `start_date` | DATE | YES | NULL | Tarikh shoro |
| `status` | TEXT | NO | `active` | `active` / `finished` |
| `include_in_report` | BOOLEAN | NO | TRUE | Aya dar karname hessab beshe |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `term_months`
Mah-haye har term — kontrol dastresi toosate morabbi

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `term_id` | UUID | NO | — | FK → `terms.id` CASCADE |
| `month_number` | INT | NO | — | 1 / 2 / 3 |
| `is_unlocked` | BOOLEAN | NO | FALSE | Morabbi kontrol mikone |
| `unlocked_at` | TIMESTAMPTZ | YES | NULL | Key unlock shod |

---

### `sessions`
Jalase-haye har term — 12 jalaseh per term (auto-generate)

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `term_id` | UUID | NO | — | FK → `terms.id` CASCADE |
| `month_number` | INT | NO | — | 1 / 2 / 3 |
| `session_number` | INT | NO | — | 1 ta 12 |
| `session_date` | DATE | YES | NULL | Tarikh jalaseh |
| `title` | TEXT | YES | NULL | Onvan ekhtiari |
| `content_text` | TEXT | YES | NULL | Mohtavaye amuzeshi |
| `link` | TEXT | YES | NULL | Link manba |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `skill_categories`
Dastebandi mahar-ha

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | YES | NULL | NULL = default global |
| `name` | TEXT | NO | — | Name daste |
| `is_default` | BOOLEAN | NO | FALSE | Default-haye system |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**Default categories:** Technique / Rhythm / Melody / Ear Training / Theory

---

### `exercises`
Tamrin-haye har jalaseh

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `session_id` | UUID | NO | — | FK → `sessions.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `title` | TEXT | NO | — | Name tamrin |
| `category_id` | UUID | YES | NULL | FK → `skill_categories.id` SET NULL |
| `max_score` | INT | NO | 20 | Hadaksar nomreh |
| `description` | TEXT | YES | NULL | Tozihate tamrin |
| `link` | TEXT | YES | NULL | Link manba |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

---

### `exercise_scores`
Nomrat tamrin-ha — per student per exercise

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `exercise_id` | UUID | NO | — | FK → `exercises.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `score` | INT | YES | NULL | Nomreh dadeh-shode |
| `comment` | TEXT | YES | NULL | Nazar roo in tamrin |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**Unique:** `(exercise_id, student_id)`

---

### `class_schedule` ⭐ NEW — Calendar
Jalasate kelas — auto-generate az class_days + editable

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `original_date` | DATE | YES | NULL | Tarikh asli az class_days |
| `scheduled_at` | TIMESTAMPTZ | NO | — | Tarikh + sa'at vaghi |
| `duration_min` | INT | NO | 60 | Modat be daghigheh |
| `status` | TEXT | NO | `scheduled` | `scheduled` / `completed` / `cancelled` / `rescheduled` |
| `rescheduled_from` | UUID | YES | NULL | FK → `class_schedule.id` — link be jalase ghadim |
| `notes` | TEXT | YES | NULL | Yaddash morabbi |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_schedule`: morabbi full CRUD khodesh
- `student_view_own_schedule`: honarjoo faghat read khodesh

**Logic:**
- Auto-generate az `students.class_days` + `class_time` ta 3 mah ayande
- Cancel → `status = 'cancelled'` — jalase hazf nemishe
- Reschedule → row jadid ba `rescheduled_from` + row ghadim `status = 'rescheduled'`

---

### `practice_sessions` ⭐ NEW — Calendar
Tamrin-haye honarjoo ke khodesh tarif mikone

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `student_id` | UUID | NO | — | FK → `students.id` CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` CASCADE |
| `scheduled_at` | TIMESTAMPTZ | NO | — | Tarikh + sa'at tamrin |
| `duration_min` | INT | NO | 30 | Modat be daghigheh |
| `title` | TEXT | YES | NULL | Onvan tamrin |
| `notes` | TEXT | YES | NULL | Yaddash honarjoo |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_view_student_practice`: morabbi read-only
- `student_own_practice`: honarjoo full CRUD khodesh

---

### `repertoire` ⭐ NEW — Phase 4
Ghat'e-haye musiqi ke honarjoo tamrin mikone

| Sotun | Type | Nullable | Default | Tozih |
|-------|------|----------|---------|-------|
| `id` | UUID | NO | gen_random_uuid() | — |
| `student_id` | UUID | NO | — | FK → `students.id` ON DELETE CASCADE |
| `teacher_id` | UUID | NO | — | FK → `profiles.id` ON DELETE CASCADE |
| `title` | TEXT | NO | — | Name ghat'e |
| `composer` | TEXT | YES | NULL | Ahangsar |
| `level` | TEXT | YES | NULL | `beginner` / `intermediate` / `advanced` |
| `status` | TEXT | NO | `learning` | `learning` / `mastered` / `paused` |
| `started_at` | DATE | YES | NULL | Tarikh shoro |
| `mastered_at` | DATE | YES | NULL | Tarikh takmil |
| `notes` | TEXT | YES | NULL | Yaddash morabbi |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |

**RLS Policies:**
- `teacher_own_repertoire`: morabbi insert/update/delete mikone
- `student_view_own_repertoire`: honarjoo faghat ghat'e-haye khodesh ro mibine

**Index-ha:**
- `repertoire_student_idx` ON `student_id`
- `repertoire_teacher_idx` ON `teacher_id`

**Migration file:** `migration_repertoire.sql`

---

## Storage

### Bucket: `session-files`
File-haye amuzeshi — PDF / MP3 / MP4

**Structure:**
- `sessions/{session_id}/{filename}` — file-haye jalaseh
- `exercises/{exercise_id}/{filename}` — file-haye tamrin

**Policies:** authenticated users mitoonand upload/read/delete konand

---

## Taghirat Akhir

| Tarikh | Jadval | Taghir |
|--------|--------|--------|
| 1404/02/18 | `scores` | Ezafe shod `average`, `comment`, `is_absent` |
| 1404/02/18 | `students` | Ezafe shod `profile_id`, `status` |
| 1404/02/18 | `messages` | Ezafe shod `to_id` |
| 1404/02/18 | `error_logs` | Jadval jadid |
| 1404/02/19 | `terms` | Jadval jadid + `include_in_report` |
| 1404/02/19 | `term_months` | Jadval jadid |
| 1404/02/19 | `sessions` | Jadval jadid + `session_date`, `link` |
| 1404/02/19 | `skill_categories` | Jadval jadid |
| 1404/02/19 | `exercises` | Jadval jadid + `category_id`, `description`, `link` |
| 1404/02/19 | `exercise_scores` | Jadval jadid |
| 1404/02/19 | Storage | Bucket `session-files` ezafe shod |
| 1404/02/25 | `repertoire` | Jadval jadid — Phase 4 |
| 1404/02/25 | `class_schedule` | Jadval jadid — Calendar + `original_date` + `rescheduled_from` |
| 1404/02/25 | `practice_sessions` | Jadval jadid — Calendar honarjoo |

---

## Noktehaye Mohem

- Tamam jadval-ha RLS fa'al darand
- `profiles.id` hamishe barabar `auth.users.id` ast
- `scores` jadval ghadimi — moazi ba `exercise_scores` negah dashte shode
- Ertebat honarjoo be morabbi: `profiles.teacher_id` + `students.profile_id`
- Streak haftegi az `practice_logs` hessab mishe (consecutive days, 90 ruz akhir)
- HalfMeter: az `exercise_scores` + `exercises.max_score` hessab mishe

## Faz B — Defer shode
- `classes` — kelas-haye gorohi
- `skill_categories` custom per teacher (alan faghat default)