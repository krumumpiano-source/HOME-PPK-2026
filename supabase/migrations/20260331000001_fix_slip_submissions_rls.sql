-- Migration: แก้ไข RLS Policy สำหรับ slip_submissions
-- ปัญหา: "new row violates row-level security policy for table slip_submissions"
-- สาเหตุ: มี policy slip_auth_insert ที่ใช้ is_authenticated() (Supabase Auth)
--         ขัดกับระบบนี้ที่ใช้ custom session ไม่ใช่ Supabase Auth
-- Idempotent — รันซ้ำได้อย่างปลอดภัย

-- ลบ policy ที่ conflict ทั้งหมด (สร้างจาก Supabase Dashboard / Storage setup โดยไม่ตั้งใจ)
DROP POLICY IF EXISTS "Enable read access for all" ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_delete"           ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_insert"           ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_read"             ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_update"           ON public.slip_submissions;
DROP POLICY IF EXISTS "anon_all_slips"             ON public.slip_submissions;

-- สร้าง policy เดียวที่ถูกต้อง: เปิดให้ anon role ทำได้ทุก operation
CREATE POLICY "anon_all_slips"
  ON public.slip_submissions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ตรวจสอบว่า RLS ถูก enable อยู่
ALTER TABLE public.slip_submissions ENABLE ROW LEVEL SECURITY;
