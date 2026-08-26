-- ============================================================
-- Fix: Settings & Electric Bills RLS Policies for Electric Officer
-- Date: 2026-08-20
-- 
-- ปัญหา:
-- 1. ผู้ใช้ที่มี permission 'electric' (เช่น กรรมการ/ครูที่รับผิดชอบบันทึกค่าไฟ) 
--    เมื่อบันทึกค่าไฟและค่า lost (pea_total, lost_house, lost_flat)
--    PostgreSQL RLS บนตาราง public.settings บล็อกการ INSERT/UPDATE key 'electric_lost_%'
--    เพราะ policy settings_insert/settings_update อนุญาตเฉพาะ is_admin_session()
--    ส่งผลให้ค่า lost ไม่ถูกบันทึกลงฐานข้อมูล เมื่อกลับมาดูข้อมูลจึงหายไป
-- 2. policy electric_bills_delete อนุญาตเฉพาะ is_admin_session()
--    ทำให้ผู้ใช้ที่มี permission 'electric' ไม่สามารถลบ record เดิมตอนบันทึกซ้ำได้
--
-- การแก้ไข:
-- 1. ปรับปรุง settings_insert, settings_update, settings_delete ให้รองรับ:
--    - is_admin_session()
--    - key LIKE 'electric_lost_%' สำหรับ public.has_permission(ARRAY['electric'])
--    - key LIKE 'monthly_withdraw_%' สำหรับ public.has_permission(ARRAY['withdraw','accounting'])
-- 2. ปรับปรุง electric_bills_delete ให้เปิดสำหรับ public.has_permission(ARRAY['electric'])
-- 3. ทำความสะอาด record ซ้ำซ้อนใน electric_bills (ถ้ามี)
-- ============================================================

-- ── 1. Update RLS policies on public.settings ───────────────
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

CREATE POLICY "settings_insert" ON public.settings
    FOR INSERT TO anon
    WITH CHECK (
        public.is_admin_session()
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw','accounting']))
        OR key LIKE 'pw_reset_%'
        OR key LIKE 'must_change_pw_%'
    );

CREATE POLICY "settings_update" ON public.settings
    FOR UPDATE TO anon
    USING (
        public.is_admin_session()
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw','accounting']))
        OR key LIKE 'pw_reset_%'
        OR key LIKE 'must_change_pw_%'
    )
    WITH CHECK (
        public.is_admin_session()
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw','accounting']))
        OR key LIKE 'pw_reset_%'
        OR key LIKE 'must_change_pw_%'
    );

CREATE POLICY "settings_delete" ON public.settings
    FOR DELETE TO anon
    USING (
        public.is_admin_session()
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw','accounting']))
        OR key LIKE 'pw_reset_%'
        OR key LIKE 'must_change_pw_%'
        OR key = 'must_change_pw_' || public.get_session_user_id()
    );

-- ── 2. Update RLS policies on public.electric_bills ─────────
DROP POLICY IF EXISTS "electric_bills_delete" ON public.electric_bills;
CREATE POLICY "electric_bills_delete" ON public.electric_bills
    FOR DELETE TO anon
    USING (public.has_permission(ARRAY['electric']));

-- ── 3. Cleanup: ลบ record ซ้ำซ้อนใน electric_bills (ถ้ามี) ──
DELETE FROM public.electric_bills
WHERE id NOT IN (
    SELECT DISTINCT ON (house_number, period) id
    FROM public.electric_bills
    ORDER BY house_number, period, recorded_at DESC NULLS LAST
);
