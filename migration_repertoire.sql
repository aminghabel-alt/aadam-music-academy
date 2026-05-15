-- ═══════════════════════════════════════════════════
--  AADAM Music Academy — Phase 4 Migration
--  Table: repertoire
--  Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS repertoire (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID         NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
  teacher_id   UUID         NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  composer     TEXT,
  level        TEXT         CHECK (level IN ('beginner','intermediate','advanced')),
  status       TEXT         NOT NULL DEFAULT 'learning'
                            CHECK (status IN ('learning','mastered','paused')),
  started_at   DATE,
  mastered_at  DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE repertoire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_own_repertoire"
  ON repertoire FOR ALL
  USING  (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "student_view_own_repertoire"
  ON repertoire FOR SELECT
  USING (student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  ));

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS repertoire_student_idx ON repertoire(student_id);
CREATE INDEX IF NOT EXISTS repertoire_teacher_idx ON repertoire(teacher_id);
