-- Migration: ลบ policy ที่ใช้ is_authenticated() ออกทั้งหมด
-- สาเหตุ: ระบบนี้ใช้ custom session ไม่ใช่ Supabase Auth
--         policy พวก *_auth_* ใช้ is_authenticated() ซึ่ง return false ตลอด
--         ทำให้ INSERT/UPDATE/DELETE ถูกบล็อกแม้จะมี anon_all_* policy อยู่แล้ว
-- Idempotent — รันซ้ำได้อย่างปลอดภัย

-- electric_bills
DROP POLICY IF EXISTS "ebills_auth_read"         ON public.electric_bills;

-- outstanding
DROP POLICY IF EXISTS "outstanding_auth_read"    ON public.outstanding;

-- notifications
DROP POLICY IF EXISTS "notif_auth_read"          ON public.notifications;

-- payment_history
DROP POLICY IF EXISTS "payhist_auth_read"        ON public.payment_history;

-- requests
DROP POLICY IF EXISTS "req_auth_insert"          ON public.requests;

-- settings
DROP POLICY IF EXISTS "settings_auth_write"      ON public.settings;
DROP POLICY IF EXISTS "settings_auth_update"     ON public.settings;
DROP POLICY IF EXISTS "settings_auth_delete"     ON public.settings;

-- pending_registrations
DROP POLICY IF EXISTS "pendreg_anon_read"        ON public.pending_registrations;

-- residents
DROP POLICY IF EXISTS "residents_auth_read"      ON public.residents;

-- coresidents
DROP POLICY IF EXISTS "coresidents_auth_read"    ON public.coresidents;
DROP POLICY IF EXISTS "coresidents_auth_insert"  ON public.coresidents;
DROP POLICY IF EXISTS "coresidents_auth_update"  ON public.coresidents;
DROP POLICY IF EXISTS "coresidents_auth_delete"  ON public.coresidents;

-- water_bills
DROP POLICY IF EXISTS "wbills_auth_read"         ON public.water_bills;

-- queue
DROP POLICY IF EXISTS "queue_auth_read"          ON public.queue;

-- accounting_entries
DROP POLICY IF EXISTS "acct_auth_read"           ON public.accounting_entries;

-- exemptions
DROP POLICY IF EXISTS "exempt_auth_read"         ON public.exemptions;

-- payment_proxies
DROP POLICY IF EXISTS "proxy_auth_read"          ON public.payment_proxies;

-- slip_submissions (ลบไปแล้วใน migration 20260331000001 แต่ใส่ไว้เผื่อรัน standalone)
DROP POLICY IF EXISTS "Enable read access for all" ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_delete"           ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_insert"           ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_read"             ON public.slip_submissions;
DROP POLICY IF EXISTS "slip_auth_update"           ON public.slip_submissions;
