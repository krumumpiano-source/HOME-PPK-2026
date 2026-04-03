-- ============================================================
-- Fix: RLS policies ทุก table — ไม่อนุญาต UPDATE/INSERT/DELETE สำหรับ anon
-- สาเหตุ: policies อาจหายหลัง Supabase project pause/restore
-- วิธีใช้: คัดลอก SQL ทั้งหมดไปรันใน Supabase Dashboard → SQL Editor
-- ============================================================

-- ลบ ALL existing policies แล้วสร้างใหม่ทุก table
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
        -- Skip tables that don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=_tbl) THEN
            CONTINUE;
        END IF;
        -- Drop all policies
        FOR _pol IN
            SELECT policyname FROM pg_policies WHERE tablename = _tbl AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _pol.policyname, _tbl);
        END LOOP;
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _tbl);
        -- Create open policy (same as rls.sql)
        IF _tbl = 'settings' THEN
            -- settings: hide API keys from anon read
            EXECUTE 'CREATE POLICY "anon_read_settings" ON public.settings FOR SELECT TO anon USING (key NOT LIKE ''resend_api%'')';
            EXECUTE 'CREATE POLICY "anon_write_settings" ON public.settings FOR INSERT TO anon WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "anon_update_settings" ON public.settings FOR UPDATE TO anon USING (true) WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "anon_delete_settings" ON public.settings FOR DELETE TO anon USING (true)';
        ELSIF _tbl = 'users' THEN
            EXECUTE 'CREATE POLICY "anon_read_users" ON public.users FOR SELECT TO anon USING (true)';
            EXECUTE 'CREATE POLICY "anon_write_users" ON public.users FOR INSERT TO anon WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "anon_update_users" ON public.users FOR UPDATE TO anon USING (true) WITH CHECK (true)';
            EXECUTE 'CREATE POLICY "anon_delete_users" ON public.users FOR DELETE TO anon USING (true)';
        ELSE
            EXECUTE format('CREATE POLICY "anon_all_%s" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', _tbl, _tbl);
        END IF;
    END LOOP;
END $$;
