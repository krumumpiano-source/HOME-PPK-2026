-- ============================================================
-- Migration: เปิดให้ผู้ร่วมพักอาศัยเข้าใช้ระบบได้
-- วันที่: 2026-03-17
-- ============================================================

-- เพิ่ม user_id, email, phone ที่ coresidents table
-- เพื่อให้ผู้ร่วมพักอาศัยสามารถลงทะเบียนและเข้าสู่ระบบได้
ALTER TABLE public.coresidents
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email   TEXT,
  ADD COLUMN IF NOT EXISTS phone   TEXT;

-- Index สำหรับค้นหาผู้ร่วมพักจาก user_id
CREATE INDEX IF NOT EXISTS idx_coresidents_user_id ON public.coresidents(user_id);

-- เปลี่ยน default ของ resident_type ให้ไม่บังคับเป็น teacher
-- (ค่า default ใน schema เดิมไม่มี default อยู่แล้ว — แค่ยืนยัน)
COMMENT ON COLUMN public.residents.resident_type IS 'ประเภทผู้พัก: teacher, staff, resident, coresident, external, etc.';
COMMENT ON COLUMN public.coresidents.user_id IS 'เชื่อมกับ users.id สำหรับผู้ร่วมพักที่ลงทะเบียนเข้าระบบ';
