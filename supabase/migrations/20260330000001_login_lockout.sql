-- Migration: เพิ่ม columns สำหรับ Account Lockout ใน users table
-- Additive only — ไม่กระทบข้อมูลเดิม

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until    timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.users.failed_attempts IS 'จำนวนครั้งที่กรอกรหัสผ่านผิดติดต่อกัน (reset เมื่อ login สำเร็จ)';
COMMENT ON COLUMN public.users.locked_until    IS 'เวลาที่บัญชีจะถูกล็อคจนถึง (NULL = ไม่ถูกล็อค)';

-- Index สำหรับ query locked_until (เช็คสถานะล็อค)
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users(locked_until)
  WHERE locked_until IS NOT NULL;
