-- Fix: อนุญาตให้ anon สามารถ reject pending_registrations ได้
-- ปัญหา: กดปฏิเสธแล้วไม่มีผล เพราะ RLS บล็อก UPDATE
DROP POLICY IF EXISTS anon_all_pending_reg ON pending_registrations;
CREATE POLICY anon_all_pending_reg ON pending_registrations
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
