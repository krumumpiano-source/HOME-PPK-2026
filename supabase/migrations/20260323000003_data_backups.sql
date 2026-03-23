-- ============================================================
-- Auto-Backup: data_backups table
-- เก็บ snapshot ข้อมูลก่อนการบันทึกทุกครั้ง
-- ให้ admin กู้คืนข้อมูลได้ทีละ snapshot
-- ============================================================

CREATE TABLE IF NOT EXISTS data_backups (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action         TEXT NOT NULL,
    description    TEXT,
    affected_table TEXT NOT NULL,
    filter_key     TEXT,
    filter_value   TEXT,
    record_count   INTEGER DEFAULT 0,
    previous_data  JSONB NOT NULL DEFAULT '[]',
    created_by     TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_backups_created_at ON data_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_backups_action ON data_backups(action);

ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;

-- RLS: อนุญาต anon ทำทุก operation (เหมือน tables อื่นในโปรเจค)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'anon_insert_data_backups' AND tablename = 'data_backups'
  ) THEN
    CREATE POLICY anon_insert_data_backups ON data_backups
      FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'anon_select_data_backups' AND tablename = 'data_backups'
  ) THEN
    CREATE POLICY anon_select_data_backups ON data_backups
      FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'anon_delete_data_backups' AND tablename = 'data_backups'
  ) THEN
    CREATE POLICY anon_delete_data_backups ON data_backups
      FOR DELETE TO anon USING (true);
  END IF;
END $$;
