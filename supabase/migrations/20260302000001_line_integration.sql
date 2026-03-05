-- ============================================================
--  HOME PPK 2026 — LINE Integration Migration
--  รัน SQL นี้ใน Supabase SQL Editor ครั้งเดียว
-- ============================================================

-- 1. เพิ่ม columns ใน residents table
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS line_user_id   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ DEFAULT NULL;

-- 2. เพิ่ม columns ใน slip_submissions table (สำหรับ track เมื่อไรที่รูปถูกลบ)
ALTER TABLE public.slip_submissions
  ADD COLUMN IF NOT EXISTS image_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. สร้าง line_push_log table
CREATE TABLE IF NOT EXISTS public.line_push_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  TEXT REFERENCES public.residents(id) ON DELETE SET NULL,
  line_user_id TEXT NOT NULL,
  house_number TEXT,
  message_type TEXT DEFAULT 'text',   -- text | flex | image
  message_text TEXT,
  status      TEXT DEFAULT 'sent',    -- sent | failed
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_push_log_sent_at     ON public.line_push_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_line_push_log_line_user_id ON public.line_push_log(line_user_id);

-- 4. เพิ่ม settings สำหรับ LINE & Email
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

-- 5. เพิ่ม index สำหรับ residents.line_user_id
CREATE INDEX IF NOT EXISTS idx_residents_line_user_id ON public.residents(line_user_id);

-- ============================================================
--  Row Level Security สำหรับ line_push_log
-- ============================================================
ALTER TABLE public.line_push_log ENABLE ROW LEVEL SECURITY;

-- Admin อ่านและเขียนได้ทั้งหมด (ใช้ anon key ผ่าน service role)
DROP POLICY IF EXISTS "allow_all_line_push_log" ON public.line_push_log;
CREATE POLICY "allow_all_line_push_log"
  ON public.line_push_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
