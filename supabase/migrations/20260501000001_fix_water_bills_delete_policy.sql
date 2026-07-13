-- ============================================================
-- Fix: water_bills DELETE policy
-- 
-- ปัญหา: policy เดิม "water_bills_delete" อนุญาตเฉพาะ is_admin_session()
--   ทำให้ผู้ใช้ที่มี permission 'water'/'water_reader' บันทึกครั้งที่ 2+
--   ลบ record เก่าไม่ได้ (silently skip — PostgreSQL RLS ไม่ throw error)
--   ผลลัพธ์: DB มี record ซ้อน → getSavedBillData แสดงค่าเก่า (ข้อมูลดูเหมือนหาย)
--
-- แก้ไข: เปิด DELETE สำหรับ has_permission(['water','water_reader'])
--   ซึ่งรวม is_admin_session() ด้วยอยู่แล้ว (has_permission ตรวจ admin ก่อน)
-- ============================================================

DROP POLICY IF EXISTS "water_bills_delete" ON public.water_bills;
CREATE POLICY "water_bills_delete" ON public.water_bills
    FOR DELETE TO anon USING (public.has_permission(ARRAY['water','water_reader']));

-- ============================================================
-- Cleanup: ลบ record ซ้ำเก่าที่สะสมจากบัค (เก็บแค่ล่าสุดต่อ house+period)
-- ============================================================
DELETE FROM public.water_bills
WHERE id NOT IN (
    SELECT DISTINCT ON (house_number, period) id
    FROM public.water_bills
    ORDER BY house_number, period, recorded_at DESC NULLS LAST
);
