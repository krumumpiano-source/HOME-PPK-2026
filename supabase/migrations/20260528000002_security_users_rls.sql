-- ============================================================
-- HOME PPK 2026 — Security: ป้องกัน role escalation ใน users
-- ปัญหา: users_update มี WITH CHECK (true) → anon เปลี่ยน role
--        เป็น admin หรือ is_active=true ได้
-- แก้ไข: เพิ่ม WITH CHECK ป้องกันเปลี่ยน role/is_active
--        โดยคง USING (true) ไว้ → login lockout และ password
--        reset ยังทำงานได้ปกติ (ไม่ต้องมี session)
-- ============================================================

-- ── ลบ policy เก่า ──────────────────────────────────────────
DROP POLICY IF EXISTS "users_update" ON public.users;

-- ── สร้าง policy ใหม่ ────────────────────────────────────────
-- USING (true)  : ยังคงให้ update rows ใดก็ได้ (login lockout ใช้อยู่)
-- WITH CHECK    : ป้องกัน escalate role/is_active เว้นแต่ admin
CREATE POLICY "users_update" ON public.users
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (
        public.is_admin_session()
        OR (
            NEW.role      = (SELECT u.role      FROM public.users u WHERE u.id = NEW.id) AND
            NEW.is_active = (SELECT u.is_active FROM public.users u WHERE u.id = NEW.id)
        )
    );
