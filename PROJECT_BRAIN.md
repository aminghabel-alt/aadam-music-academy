# PROJECT BRAIN — AADAM Music Academy

> Bargerefte az «Bani Adam A'zaye Yekdigarand» — Adam-ha be ham vasl-and, musiqi in ettesal ro amigh-tar mikone.

---

## Vision

Platform modiriyat amuzesh musiqi baraye morabbayan va honarjoyan.
Hadaf: sade-tarin rah baraye inke ye morabbi musiqi betone kelas-hash ro modiriyat kone,
ba honarjooyash dar ertebat bashe, va pishraftshoono dobal kone.

---

## Target Audience

**Primary:** Morabbayan musiqi (fe'lan guitar, dar ayande hame saz-ha)
**Secondary:** Honarjooyan va valedeyneshoon
**Market:** Ebteda Iran — sakhtare chand-zabane (FA/EN) az ebteda dar nazar gerefteh shode

---

## Goal haye 6 mah ayande

1. **Avalin pardakht vaghei** — ye morabbi pool bede va az app estefade kone
2. **10 morabbi fa'al** ba honarjooye vaghei
3. **PWA kamel** — ghabel nasb roo mobile
4. **Mohtavaye chand-saz** — sakhtar dars-ha toosate morabbi ghabal ta'rif bashe

---

## Monetization Plan

**Model:** Freemium
- Raigan: ta 3 honarjoo
- Premium: Namahddood honarjoo — sali 2 million toman az honarjoo

**Porsant Morabbi:**
- Morabbi be ezaye har honarjooyi ke az tarighe app sabt-nam mikone, darsadi az eshterak ro migereh
- Meghdare daghigh: TBD

**Dargah Pardakht:** ZarinPal (Iran) + Stripe (beynalmelal dar ayande)

---

## Tech Stack

| Layer | Abzar |
|-------|-------|
| Frontend | Vanilla JS + HTML + CSS (se file joda) |
| Auth & DB | Supabase |
| Storage | Supabase Storage (`session-files` bucket) |
| Hosting | GitHub Pages (dev branch) |
| PWA | Service Worker + manifest.json |
| AI Assistant | Claude API (faz ba'di) |
| Payment | ZarinPal |
| Version Control | Git + GitHub |

**Fonts:** Manrope (body) + Cormorant Garamond (serif/headings)
**Color system:** OKLCH — accent gold `oklch(0.82 0.13 88)`
**Background:** `oklch(0.18 0.005 270)` — Claude dark mode style

**Ghanune stack:** ta MVP amadeh nashe, hich framework jadidi ezafe nemishe.

---

## Sakhtar File-ha

```
aadam-music-academy/
├── index.html               # HTML — sakhtar safehat
├── style.css                # CSS — tamam style-ha
├── app.js                   # JS — tamam logic
├── manifest.json            # PWA manifest
├── sw.js                    # Service Worker
├── migration_repertoire.sql # Phase 4 DB migration
├── PROJECT_BRAIN.md         # In file
├── DATA_SCHEMA.md           # Sakhtar database
└── PROGRESS.md              # Vaziyate project
```

---

## Me'mari Kolli

```
Browser (PWA)
    ↓
app.js — logic asli
    ↓
Supabase Client SDK
    ↓
Supabase (Auth + PostgreSQL + Storage)
```

**Hich custom backend vojood nadare.**

---

## Naghsh-haye Karbari (Roles)

| Naghsh | Dastresi |
|--------|----------|
| `teacher` | Modiriyat honarjoo, term/session/exercise, sabt nomre, file upload, repertoire |
| `student` | Moshahedeh term/session/exercise, karname, tamrin, payam, repertoire (read) |
| `parent` | Moshahedeh karname farzand, payam be ostad |

---

## Layout

| Screen | Layout |
|--------|--------|
| Teacher (desktop) | Sidebar 220px + main content grid |
| Teacher (mobile ≤680px) | Slide-in drawer + hamburger menu |
| Student | Mobile-first + floating pill tab bar |

---

## Ghanune Kodnevisi

1. **Har tabeh ye kar** — age tabeh bishtar az 30 khat shod, taghsimesh kon
2. **async/await hame ja** — callback mamnu
3. **Error handling hamishe** — har Supabase call bayad `error` ro check kone
4. **showNotif baraye hame feedback** — hich alert() nadarim
5. **English baraye UI va kod** — UI digeh Farsi nist
6. **Hich data hardcode** — hame data-ha az Supabase miyand
7. **Local test aval, deploy bad** — hich vaght mostaghim push nakon bedune test

---

## Ghanune Database

1. **Har jadval RLS dare**
2. **UUID baraye hame ID ha**
3. **created_at dar hame jadval-ha**
4. **Foreign key hamishe ba ON DELETE CASCADE ya SET NULL**
5. **Har taghir schema = update DATA_SCHEMA.md**

---

## Definition of Done

Ye feature vaghti "done" hast ke:
- [ ] Roo GitHub Pages kar mikone
- [ ] Ba data vaghe'i Supabase test shode
- [ ] Roo mobile test shode — **local aval**
- [ ] Error handling dare
- [ ] DATA_SCHEMA.md update shode (age DB taghir karde)

---

## PROPOSAL Rule

**PROPOSAL benevis faghat vaghti:**
- Jadval DB taghir mikone
- Ye bakhsh kamel jadid be app ezafe mishe

**Bedune PROPOSAL:**
- Taghir UI, rang, matn
- Field jadid be form
- Bug fix

---

## Faz-ha — Status

### Faz 0 — Foundation ✅
- [x] Supabase setup + RLS
- [x] GitHub repo + dev/main/hotfix branches
- [x] error_logs table

### Faz 1 — Design Tokens ✅
- [x] OKLCH color system
- [x] Manrope + Cormorant Garamond fonts
- [x] CSS variables redesign

### Faz 2 — Layout ✅
- [x] Teacher: sidebar 220px (desktop) + drawer (mobile)
- [x] Student: floating pill tab bar
- [x] Mobile hamburger menu

### Faz 3 — Component Rebuild ✅
- [x] StudentCard ba Avatar + HalfMeter
- [x] ScoreCard ba smooth bars
- [x] ExerciseCard
- [x] TermCard + SessionRow
- [x] Modal centered (desktop) + slide-up (mobile)
- [x] Button polish
- [x] EmptyState

### Faz 4 — New Features ✅
- [x] Repertoire table (PROPOSAL + migration)
- [x] Streak banner (az practice_logs)
- [x] HalfMeter ba score-haye vaghei
- [x] Student repertoire view (grouped by status)

### Faz 5 — Polish ✅
- [x] Palette switcher: Gold / Silver / Rose / Sage
- [x] Animations: panelFadeUp, cardSlideIn, modalSlideUp, streakEntrance
- [x] Responsive breakpoints
- [x] Animations toggle (localStorage)

### Bug Fixes ✅
- [x] Metronome honarjoo (canvas ID conflict)
- [x] Mobile sidebar display:none conflict
- [x] Background contrast + readability

### Open Bugs 🐛
- [ ] `bug: metronome no sound on iPhone 10 (iOS 16)` — label: bug

### Faz Ba'di
- [ ] PWA kamel — nasb roo mobile
- [ ] Kelas-haye gorohi
- [ ] Skill categories custom per teacher
- [ ] Dargah pardakht — ZarinPal
- [ ] Freemium logic (max 3 students free)
- [ ] AI assistant ba Claude API

---

## Noktehaye Mohem Baraye Claude

- **Stack:** Vanilla JS + Supabase — bedune React, bedune Next.js
- **File-ha:** se file joda (index.html / style.css / app.js)
- **Database:** baraye sakhtar daghigh ← DATA_SCHEMA.md bekhoon
- **Zaban UI:** English — LTR
- **Font:** Manrope (body) + Cormorant Garamond (headings/serif)
- **Rang asli:** Gold `oklch(0.82 0.13 88)` roo paszamine `oklch(0.18 0.005 270)`
- **GitHub Pages:** az `dev` branch serve mishe
- **Workflow:** local test aval → deploy bad
- **Hich vaght** data mock ya hardcode ezafe nakon
- **initMetronome(prefix)** — factory function, do bar call mishe: `''` baraye teacher, `'s-'` baraye student