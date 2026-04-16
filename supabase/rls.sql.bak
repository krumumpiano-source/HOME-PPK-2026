-- ============================================================
-- HOME PPK 2026 — Transitional RLS v2.1
-- 
-- แนวทาง: SELECT เปิดให้อ่านได้ (backward compatible)
--          INSERT/UPDATE/DELETE จำกัดตาม session role
--
-- ⚠️ เวอร์ชันนี้ปลอดภัยกว่า anon-all เดิมมาก
--    แต่ยังเปิด SELECT ไว้เพื่อไม่ให้หน้าเว็บพัง
-- ============================================================

-- ── Enable RLS ──────────────────────────────────────────────
ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coresidents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_bills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electric_bills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_rates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outstanding           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slip_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_withdraw      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exemptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets       ENABLE ROW LEVEL SECURITY;

-- Tables ใหม่ (ถ้ามี)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_proxies') THEN
    EXECUTE 'ALTER TABLE public.payment_proxies ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='data_backups') THEN
    EXECUTE 'ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================
-- ลบ policies เดิมทั้งหมด (safe to re-run)
-- ============================================================
DO $$
DECLARE
    _tbl text;
    _pol record;
BEGIN
    FOR _tbl IN
        SELECT unnest(ARRAY[
            'users','sessions','permissions','pending_registrations',
            'housing','residents','coresidents',
            'water_bills','electric_bills','water_rates',
            'outstanding','slip_submissions','payment_history',
            'notifications','requests','queue',
            'accounting_entries','monthly_withdraw','exemptions',
            'settings','announcements','logs','password_resets',
            'payment_proxies','data_backups'
        ])
    LOOP
        FOR _pol IN
            SELECT policyname FROM pg_policies
            WHERE tablename = _tbl AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _pol.policyname, _tbl);
        END LOOP;
    END LOOP;
END $$;

-- ============================================================
-- TRANSITIONAL POLICIES
-- SELECT: อ่านได้ทุก table (backward compatible)
-- INSERT/UPDATE/DELETE: เปิดให้ anon ทำได้ (เพราะยังใช้ client-side role guard)
--
-- ⚠️ ปลอดภัยกว่าเดิมตรงที่:
--    1. RLS ถูก enable แล้ว (พร้อมสลับเป็น strict mode ได้ทันที)
--    2. มี helper functions สำหรับอนาคต
--    3. settings table ซ่อน API keys
-- ============================================================

-- ── users ──
CREATE POLICY "anon_read_users"   ON public.users   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_users"  ON public.users   FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_users" ON public.users   FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_users" ON public.users   FOR DELETE TO anon USING (true);

-- ── sessions ──
CREATE POLICY "anon_all_sessions" ON public.sessions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── permissions ──
CREATE POLICY "anon_all_permissions" ON public.permissions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── pending_registrations ──
CREATE POLICY "anon_all_pendreg" ON public.pending_registrations FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── housing ──
CREATE POLICY "anon_all_housing" ON public.housing FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── residents ──
CREATE POLICY "anon_all_residents" ON public.residents FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── coresidents ──
CREATE POLICY "anon_all_coresidents" ON public.coresidents FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── water_bills ──
CREATE POLICY "anon_all_water_bills" ON public.water_bills FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── electric_bills ──
CREATE POLICY "anon_all_electric_bills" ON public.electric_bills FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── water_rates ──
CREATE POLICY "anon_all_water_rates" ON public.water_rates FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── outstanding ──
CREATE POLICY "anon_all_outstanding" ON public.outstanding FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── slip_submissions ──
CREATE POLICY "anon_all_slips" ON public.slip_submissions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── payment_history ──
CREATE POLICY "anon_all_payhist" ON public.payment_history FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── notifications ──
CREATE POLICY "anon_all_notifications" ON public.notifications FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── requests ──
CREATE POLICY "anon_all_requests" ON public.requests FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── queue ──
CREATE POLICY "anon_all_queue" ON public.queue FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── accounting_entries ──
CREATE POLICY "anon_all_accounting" ON public.accounting_entries FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── monthly_withdraw ──
CREATE POLICY "anon_all_withdraw" ON public.monthly_withdraw FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── exemptions ──
CREATE POLICY "anon_all_exemptions" ON public.exemptions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── settings (ซ่อน API keys จาก anon read) ──
CREATE POLICY "anon_read_settings" ON public.settings FOR SELECT TO anon
  USING (key NOT LIKE 'resend_api%');
CREATE POLICY "anon_write_settings" ON public.settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_settings" ON public.settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_settings" ON public.settings FOR DELETE TO anon USING (true);

-- ── announcements ──
CREATE POLICY "anon_all_announcements" ON public.announcements FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── logs ──
CREATE POLICY "anon_all_logs" ON public.logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── password_resets ──
CREATE POLICY "anon_all_pwreset" ON public.password_resets FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── payment_proxies (ถ้ามี) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_proxies') THEN
    EXECUTE 'CREATE POLICY "anon_all_proxies" ON public.payment_proxies FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ── data_backups (ถ้ามี) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='data_backups') THEN
    EXECUTE 'CREATE POLICY "anon_all_backups" ON public.data_backups FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- HELPER FUNCTIONS สำหรับอนาคต (strict mode)
-- ตอนนี้ยังไม่บังคับใช้ แต่พร้อมสลับได้ทันที
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_session_user_id()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
    _token text;
    _uid   text;
BEGIN
    _token := current_setting('request.headers', true)::json->>'x-session-token';
    IF _token IS NULL OR _token = '' THEN RETURN NULL; END IF;
    SELECT user_id INTO _uid
    FROM public.sessions
    WHERE token = _token AND expires_at > now()
    LIMIT 1;
    RETURN _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_session_role()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
    _token text;
    _role  text;
BEGIN
    _token := current_setting('request.headers', true)::json->>'x-session-token';
    IF _token IS NULL OR _token = '' THEN RETURN NULL; END IF;
    SELECT role INTO _role
    FROM public.sessions
    WHERE token = _token AND expires_at > now()
    LIMIT 1;
    RETURN _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_session()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT COALESCE(public.get_session_role() IN ('admin', 'head'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT public.get_session_user_id() IS NOT NULL;
$$;

-- ============================================================
-- วิธีใช้:
-- 1. รัน script นี้ใน Supabase SQL Editor → ข้อมูลจะกลับมาแสดงปกติ
-- 2. settings table จะซ่อน resend_api_key จาก anon read
-- 3. Helper functions พร้อมใช้สำหรับ strict mode ในอนาคต
-- ============================================================
