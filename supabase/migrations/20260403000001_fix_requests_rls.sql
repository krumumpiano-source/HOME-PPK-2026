-- ============================================================
-- Fix: requests table RLS policy ไม่อนุญาต UPDATE สำหรับ anon
-- วิธีใช้: คัดลอก SQL ด้านล่างไปรันใน Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) ลบ policy เก่าทั้งหมดของ requests (ถ้ามี)
DROP POLICY IF EXISTS "anon_all_requests" ON public.requests;
DROP POLICY IF EXISTS "anon_select_requests" ON public.requests;
DROP POLICY IF EXISTS "anon_insert_requests" ON public.requests;
DROP POLICY IF EXISTS "anon_update_requests" ON public.requests;
DROP POLICY IF EXISTS "anon_delete_requests" ON public.requests;

-- 2) ตรวจสอบว่า RLS เปิดอยู่
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 3) สร้าง policy ใหม่ — อนุญาตทุก operation สำหรับ anon
CREATE POLICY "anon_all_requests" ON public.requests
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- 4) Fix เดียวกันสำหรับ queue table (อาจมีปัญหาเดียวกัน)
DROP POLICY IF EXISTS "anon_all_queue" ON public.queue;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_queue" ON public.queue
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
