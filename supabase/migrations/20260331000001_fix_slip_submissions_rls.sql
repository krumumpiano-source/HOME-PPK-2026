-- Migration: แก้ไข RLS Policy สำหรับ slip_submissions
-- ปัญหา: "new row violates row-level security policy for table slip_submissions"
-- สาเหตุ: policy anon_all_slips อาจถูก drop หรือไม่เคยถูก apply ใน Supabase
-- Idempotent — รันซ้ำได้อย่างปลอดภัย

-- ลบ policy เก่าก่อน (ถ้ามี) เพื่อป้องกัน conflict
DROP POLICY IF EXISTS "anon_all_slips" ON public.slip_submissions;

-- สร้าง policy ใหม่: เปิดให้ anon role INSERT/UPDATE/SELECT/DELETE ได้ทั้งหมด
CREATE POLICY "anon_all_slips"
  ON public.slip_submissions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ตรวจสอบว่า RLS ถูก enable อยู่ (ถ้าไม่ได้ enable จะ enable ให้)
ALTER TABLE public.slip_submissions ENABLE ROW LEVEL SECURITY;
