-- Migration: แก้ไข RLS Policy สำหรับ payment_history
-- ปัญหา: "new row violates row-level security policy for table payment_history"
-- สาเหตุ: มี policy ที่ใช้ is_authenticated() (Supabase Auth) ขัดกับระบบ custom session
-- Idempotent — รันซ้ำได้อย่างปลอดภัย

-- ลบ policy ที่อาจ conflict ทั้งหมด
DROP POLICY IF EXISTS "Enable read access for all"   ON public.payment_history;
DROP POLICY IF EXISTS "payhist_auth_delete"          ON public.payment_history;
DROP POLICY IF EXISTS "payhist_auth_insert"          ON public.payment_history;
DROP POLICY IF EXISTS "payhist_auth_read"            ON public.payment_history;
DROP POLICY IF EXISTS "payhist_auth_update"          ON public.payment_history;
DROP POLICY IF EXISTS "anon_all_payhist"             ON public.payment_history;

-- ตรวจสอบว่า RLS ถูก enable
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- สร้าง policy ที่ถูกต้อง: เปิดให้ anon role ทำได้ทุก operation
CREATE POLICY "anon_all_payhist"
  ON public.payment_history
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
