-- ============================================================
-- HOME PPK 2026 — Strict RLS v3.0
--
-- แนวทาง:
--   SELECT : เปิดทุกตาราง (backward compatible)
--   INSERT/UPDATE/DELETE : ต้อง login (is_authenticated) เป็นอย่างน้อย
--   ตาราง admin-only : ต้อง is_admin_session()
--   ตาราง pre-auth : เปิด INSERT สำหรับ anon
--
-- วิธีใช้: copy ทั้งหมดไปรันใน Supabase SQL Editor
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
ALTER TABLE public.report_approvals      ENABLE ROW LEVEL SECURITY;

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
            'payment_proxies','data_backups','report_approvals'
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
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_session_user_id()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
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
SET search_path = public
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
SET search_path = public
AS $$
    SELECT COALESCE(public.get_session_role() IN ('admin', 'head'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT public.get_session_user_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perms text[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
    SELECT public.is_admin_session() OR EXISTS (
        SELECT 1 FROM public.permissions
        WHERE user_id = public.get_session_user_id()
        AND permission = ANY(perms)
    );
$$;

-- ============================================================
-- STRICT POLICIES
-- ============================================================

-- ── users ──
-- UPDATE เปิด: login flow ต้อง update lockout/password BEFORE session exists
CREATE POLICY "users_select" ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "users_delete" ON public.users FOR DELETE TO anon USING (public.is_admin_session());

-- ── sessions ──
CREATE POLICY "sessions_select" ON public.sessions FOR SELECT TO anon USING (true);
CREATE POLICY "sessions_insert" ON public.sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sessions_update" ON public.sessions FOR UPDATE TO anon
    USING (public.is_admin_session() OR token = (current_setting('request.headers', true)::json->>'x-session-token'));
CREATE POLICY "sessions_delete" ON public.sessions FOR DELETE TO anon
    USING (public.is_admin_session() OR token = (current_setting('request.headers', true)::json->>'x-session-token'));

-- ── permissions ──
CREATE POLICY "permissions_select" ON public.permissions FOR SELECT TO anon
    USING (public.is_admin_session() OR user_id = public.get_session_user_id());
CREATE POLICY "permissions_insert" ON public.permissions FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "permissions_update" ON public.permissions FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "permissions_delete" ON public.permissions FOR DELETE TO anon USING (public.is_admin_session());

-- ── pending_registrations ──
CREATE POLICY "pendreg_select" ON public.pending_registrations FOR SELECT TO anon USING (true);
CREATE POLICY "pendreg_insert" ON public.pending_registrations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pendreg_update" ON public.pending_registrations FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "pendreg_delete" ON public.pending_registrations FOR DELETE TO anon USING (public.is_admin_session());

-- ── password_resets ──
CREATE POLICY "pwreset_select" ON public.password_resets FOR SELECT TO anon USING (true);
CREATE POLICY "pwreset_insert" ON public.password_resets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pwreset_update" ON public.password_resets FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pwreset_delete" ON public.password_resets FOR DELETE TO anon USING (public.is_admin_session());

-- ── housing ──
CREATE POLICY "housing_select" ON public.housing FOR SELECT TO anon USING (true);
CREATE POLICY "housing_insert" ON public.housing FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "housing_update" ON public.housing FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "housing_delete" ON public.housing FOR DELETE TO anon USING (public.is_admin_session());

-- ── residents ──
CREATE POLICY "residents_select" ON public.residents FOR SELECT TO anon USING (true);
CREATE POLICY "residents_insert" ON public.residents FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "residents_update" ON public.residents FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "residents_delete" ON public.residents FOR DELETE TO anon USING (public.is_admin_session());

-- ── coresidents ──
CREATE POLICY "coresidents_select" ON public.coresidents FOR SELECT TO anon USING (true);
CREATE POLICY "coresidents_insert" ON public.coresidents FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "coresidents_update" ON public.coresidents FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "coresidents_delete" ON public.coresidents FOR DELETE TO anon USING (public.is_admin_session());

-- ── water_bills ──
CREATE POLICY "water_bills_select" ON public.water_bills FOR SELECT TO anon USING (true);
CREATE POLICY "water_bills_insert" ON public.water_bills FOR INSERT TO anon WITH CHECK (public.has_permission(ARRAY['water','water_reader']));
CREATE POLICY "water_bills_update" ON public.water_bills FOR UPDATE TO anon
    USING (public.has_permission(ARRAY['water','water_reader']))
    WITH CHECK (public.has_permission(ARRAY['water','water_reader']));
CREATE POLICY "water_bills_delete" ON public.water_bills FOR DELETE TO anon USING (public.is_admin_session());

-- ── electric_bills ──
CREATE POLICY "electric_bills_select" ON public.electric_bills FOR SELECT TO anon USING (true);
CREATE POLICY "electric_bills_insert" ON public.electric_bills FOR INSERT TO anon WITH CHECK (public.has_permission(ARRAY['electric']));
CREATE POLICY "electric_bills_update" ON public.electric_bills FOR UPDATE TO anon
    USING (public.has_permission(ARRAY['electric']))
    WITH CHECK (public.has_permission(ARRAY['electric']));
CREATE POLICY "electric_bills_delete" ON public.electric_bills FOR DELETE TO anon USING (public.is_admin_session());

-- ── water_rates ──
CREATE POLICY "water_rates_select" ON public.water_rates FOR SELECT TO anon USING (true);
CREATE POLICY "water_rates_insert" ON public.water_rates FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "water_rates_update" ON public.water_rates FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "water_rates_delete" ON public.water_rates FOR DELETE TO anon USING (public.is_admin_session());

-- ── outstanding ──
CREATE POLICY "outstanding_select" ON public.outstanding FOR SELECT TO anon USING (true);
CREATE POLICY "outstanding_insert" ON public.outstanding FOR INSERT TO anon WITH CHECK (public.is_authenticated());
CREATE POLICY "outstanding_update" ON public.outstanding FOR UPDATE TO anon USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());
CREATE POLICY "outstanding_delete" ON public.outstanding FOR DELETE TO anon USING (public.is_admin_session());

-- ── slip_submissions ──
CREATE POLICY "slips_select" ON public.slip_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "slips_insert" ON public.slip_submissions FOR INSERT TO anon WITH CHECK (public.is_authenticated());
CREATE POLICY "slips_update" ON public.slip_submissions FOR UPDATE TO anon
    USING (public.has_permission(ARRAY['slip']))
    WITH CHECK (public.has_permission(ARRAY['slip']));
CREATE POLICY "slips_delete" ON public.slip_submissions FOR DELETE TO anon USING (public.is_admin_session());

-- ── payment_history ──
CREATE POLICY "payhist_select" ON public.payment_history FOR SELECT TO anon USING (true);
CREATE POLICY "payhist_insert" ON public.payment_history FOR INSERT TO anon WITH CHECK (public.is_authenticated());
CREATE POLICY "payhist_update" ON public.payment_history FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "payhist_delete" ON public.payment_history FOR DELETE TO anon USING (public.is_admin_session());

-- ── notifications ──
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO anon USING (true);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO anon WITH CHECK (public.has_permission(ARRAY['notify']));
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO anon USING (public.is_admin_session());

-- ── requests ──
CREATE POLICY "requests_select" ON public.requests FOR SELECT TO anon USING (true);
CREATE POLICY "requests_insert" ON public.requests FOR INSERT TO anon WITH CHECK (public.is_authenticated());
CREATE POLICY "requests_update" ON public.requests FOR UPDATE TO anon
    USING (public.has_permission(ARRAY['request']))
    WITH CHECK (public.has_permission(ARRAY['request']));
CREATE POLICY "requests_delete" ON public.requests FOR DELETE TO anon USING (public.is_admin_session());

-- ── queue ──
CREATE POLICY "queue_select" ON public.queue FOR SELECT TO anon USING (true);
CREATE POLICY "queue_insert" ON public.queue FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "queue_update" ON public.queue FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "queue_delete" ON public.queue FOR DELETE TO anon USING (public.is_admin_session());

-- ── accounting_entries ──
CREATE POLICY "accounting_select" ON public.accounting_entries FOR SELECT TO anon USING (true);
CREATE POLICY "accounting_insert" ON public.accounting_entries FOR INSERT TO anon WITH CHECK (public.has_permission(ARRAY['accounting']));
CREATE POLICY "accounting_update" ON public.accounting_entries FOR UPDATE TO anon
    USING (public.has_permission(ARRAY['accounting']))
    WITH CHECK (public.has_permission(ARRAY['accounting']));
CREATE POLICY "accounting_delete" ON public.accounting_entries FOR DELETE TO anon USING (public.is_admin_session());

-- ── monthly_withdraw ──
CREATE POLICY "withdraw_select" ON public.monthly_withdraw FOR SELECT TO anon USING (true);
CREATE POLICY "withdraw_insert" ON public.monthly_withdraw FOR INSERT TO anon WITH CHECK (public.has_permission(ARRAY['withdraw']));
CREATE POLICY "withdraw_update" ON public.monthly_withdraw FOR UPDATE TO anon
    USING (public.has_permission(ARRAY['withdraw']))
    WITH CHECK (public.has_permission(ARRAY['withdraw']));
CREATE POLICY "withdraw_delete" ON public.monthly_withdraw FOR DELETE TO anon USING (public.is_admin_session());

-- ── exemptions ──
CREATE POLICY "exemptions_select" ON public.exemptions FOR SELECT TO anon USING (true);
CREATE POLICY "exemptions_insert" ON public.exemptions FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "exemptions_update" ON public.exemptions FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "exemptions_delete" ON public.exemptions FOR DELETE TO anon USING (public.is_admin_session());

-- ── settings ──
-- pw_reset_* / must_change_pw_* เปิดให้ anon: forgot password + first login flow
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO anon USING (key NOT LIKE 'resend_api%');
CREATE POLICY "settings_insert" ON public.settings FOR INSERT TO anon
    WITH CHECK (public.is_admin_session() OR key LIKE 'pw_reset_%' OR key LIKE 'must_change_pw_%'
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw'])));
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO anon
    USING (public.is_admin_session() OR key LIKE 'pw_reset_%' OR key LIKE 'must_change_pw_%'
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw'])))
    WITH CHECK (public.is_admin_session() OR key LIKE 'pw_reset_%' OR key LIKE 'must_change_pw_%'
        OR (key LIKE 'electric_lost_%' AND public.has_permission(ARRAY['electric']))
        OR (key LIKE 'monthly_withdraw_%' AND public.has_permission(ARRAY['withdraw'])));
CREATE POLICY "settings_delete" ON public.settings FOR DELETE TO anon
    USING (public.is_admin_session() OR key LIKE 'pw_reset_%' OR key LIKE 'must_change_pw_%');

-- ── announcements ──
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO anon USING (true);
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO anon WITH CHECK (public.is_admin_session());
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE TO anon USING (public.is_admin_session());

-- ── logs ──
CREATE POLICY "logs_select" ON public.logs FOR SELECT TO anon USING (public.is_authenticated());
CREATE POLICY "logs_insert" ON public.logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "logs_delete" ON public.logs FOR DELETE TO anon USING (public.is_admin_session());

-- ── payment_proxies (ถ้ามี) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_proxies') THEN
    EXECUTE 'CREATE POLICY "proxies_select" ON public.payment_proxies FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "proxies_insert" ON public.payment_proxies FOR INSERT TO anon WITH CHECK (public.is_admin_session())';
    EXECUTE 'CREATE POLICY "proxies_update" ON public.payment_proxies FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session())';
    EXECUTE 'CREATE POLICY "proxies_delete" ON public.payment_proxies FOR DELETE TO anon USING (public.is_admin_session())';
  END IF;
END $$;

-- ── data_backups (ถ้ามี) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='data_backups') THEN
    EXECUTE 'CREATE POLICY "backups_select" ON public.data_backups FOR SELECT TO anon USING (public.is_admin_session())';
    EXECUTE 'CREATE POLICY "backups_insert" ON public.data_backups FOR INSERT TO anon WITH CHECK (public.is_admin_session())';
    EXECUTE 'CREATE POLICY "backups_update" ON public.data_backups FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session())';
    EXECUTE 'CREATE POLICY "backups_delete" ON public.data_backups FOR DELETE TO anon USING (public.is_admin_session())';
  END IF;
END $$;

-- ── report_approvals ──
CREATE POLICY "report_approvals_select" ON public.report_approvals FOR SELECT TO anon USING (true);
CREATE POLICY "report_approvals_insert" ON public.report_approvals FOR INSERT TO anon WITH CHECK (public.is_authenticated());
CREATE POLICY "report_approvals_update" ON public.report_approvals FOR UPDATE TO anon USING (public.is_admin_session()) WITH CHECK (public.is_admin_session());
CREATE POLICY "report_approvals_delete" ON public.report_approvals FOR DELETE TO anon USING (public.is_admin_session());

-- ============================================================
-- DONE — Strict RLS v3.0
-- ============================================================
