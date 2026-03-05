-- ============================================================
--  HOME PPK 2026 — LINE Push Log Table Fix
--  แก้ resident_id ให้เป็น TEXT (ให้ตรงกับ residents.id)
-- ============================================================

-- ลบตารางเก่าถ้ามี (อาจ partial create จากการ migration ก่อน)
DROP TABLE IF EXISTS public.line_push_log;

-- สร้างใหม่ด้วย TEXT foreign key
CREATE TABLE IF NOT EXISTS public.line_push_log (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  TEXT  REFERENCES public.residents(id) ON DELETE SET NULL,
  line_user_id TEXT  NOT NULL,
  house_number TEXT,
  message_type TEXT  DEFAULT 'text',
  message_text TEXT,
  status       TEXT  DEFAULT 'sent',
  error_msg    TEXT,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_push_log_sent_at      ON public.line_push_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_line_push_log_line_user_id ON public.line_push_log(line_user_id);

ALTER TABLE public.line_push_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_line_push_log" ON public.line_push_log;
CREATE POLICY "allow_all_line_push_log"
  ON public.line_push_log FOR ALL USING (true) WITH CHECK (true);

-- เพิ่ม settings ถ้ายังไม่มี
INSERT INTO public.settings (key, value) VALUES
  ('line_channel_access_token',  ''),
  ('line_channel_secret',        ''),
  ('line_liff_id',               ''),
  ('line_oa_name',               'บ้านพักครู PPK'),
  ('line_push_quota_used',       '0'),
  ('line_push_quota_limit',      '200'),
  ('line_push_quota_reset_date', ''),
  ('resend_api_key',             ''),
  ('email_from',                 ''),
  ('email_from_name',            'บ้านพักครู PPK')
ON CONFLICT (key) DO NOTHING;
