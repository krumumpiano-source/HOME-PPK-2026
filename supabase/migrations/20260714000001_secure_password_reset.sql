-- ============================================================
-- HOME PPK 2026 — Security Phase 4: Secure Password Reset & Lockdown
-- ปัญหา: Client-side มีสิทธิ์ UPDATE users.password_hash ได้โดยตรง
--        ทำให้แฮกเกอร์ข้ามการตรวจ OTP และยึดบัญชี Admin ได้
-- แก้ไข: สร้าง Postgres RPC Functions จัดการรีเซ็ตรหัสผ่านและ Lockout
--        และล็อคดาวน์ (Lockdown) RLS ของ users และ settings
-- ============================================================

-- ── 1. RPC: Request Password Reset ──────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_request_password_reset(p_email TEXT, p_otp_hash TEXT, p_expires_at TIMESTAMPTZ)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER VOLATILE
SET search_path = public
AS $$
DECLARE
    v_user record;
    v_key text;
    v_val jsonb;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE email = p_email LIMIT 1;
    IF v_user IS NULL THEN
        -- คืนค่ากลับไปเหมือนสำเร็จ เพื่อป้องกัน User Enumeration
        RETURN '{"success": true, "message": "หากอีเมลนี้อยู่ในระบบ ระบบจะส่ง OTP ไปให้"}'::jsonb;
    END IF;

    v_key := 'pw_reset_' || p_email;
    v_val := jsonb_build_object('code_hash', p_otp_hash, 'expires_at', p_expires_at, 'attempts', 0);
    
    INSERT INTO public.settings (key, value) 
    VALUES (v_key, v_val::text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

    RETURN jsonb_build_object('success', true, 'firstname', v_user.firstname);
END;
$$;

-- ── 2. RPC: Verify Password Reset ───────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_verify_password_reset(p_email TEXT, p_otp_hash TEXT, p_new_password_hash TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER VOLATILE
SET search_path = public
AS $$
DECLARE
    v_key text;
    v_setting record;
    v_otp_data jsonb;
    v_attempts int;
BEGIN
    v_key := 'pw_reset_' || p_email;
    SELECT * INTO v_setting FROM public.settings WHERE key = v_key LIMIT 1;
    IF v_setting IS NULL THEN
        RETURN '{"success": false, "error": "ไม่พบคำขอรีเซ็ต กรุณาขอรหัส OTP ใหม่"}'::jsonb;
    END IF;

    v_otp_data := v_setting.value::jsonb;
    v_attempts := COALESCE((v_otp_data->>'attempts')::int, 0);

    IF v_attempts >= 5 THEN
        RETURN '{"success": false, "error": "ป้อนรหัสผิดเกินจำนวนครั้ง กรุณาขอรหัส OTP ใหม่"}'::jsonb;
    END IF;

    IF (v_otp_data->>'expires_at')::timestamptz < now() THEN
        RETURN '{"success": false, "error": "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่"}'::jsonb;
    END IF;

    IF (v_otp_data->>'code_hash') != p_otp_hash THEN
        v_attempts := v_attempts + 1;
        v_otp_data := jsonb_set(v_otp_data, '{attempts}', to_jsonb(v_attempts));
        UPDATE public.settings SET value = v_otp_data::text WHERE key = v_key;
        RETURN jsonb_build_object('success', false, 'error', 'รหัส OTP ไม่ถูกต้อง (เหลือ ' || (5 - v_attempts) || ' ครั้ง)');
    END IF;

    -- OTP ถูกต้อง: อัปเดตรหัสผ่าน
    UPDATE public.users SET password_hash = p_new_password_hash, updated_at = now() WHERE email = p_email;
    
    -- ลบข้อมูล OTP และธงแจ้งเตือนบังคับเปลี่ยนรหัส
    DELETE FROM public.settings WHERE key = v_key;
    DELETE FROM public.settings WHERE key = 'must_change_pw_' || (SELECT id FROM public.users WHERE email = p_email LIMIT 1);

    RETURN '{"success": true, "message": "เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"}'::jsonb;
END;
$$;

-- ── 3. RPC: Login Lockout ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_login_lockout(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER VOLATILE
SET search_path = public
AS $$
DECLARE
    v_user record;
    v_failed_attempts int;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE email = p_email LIMIT 1;
    IF v_user IS NULL THEN
        RETURN '{"success": false}'::jsonb;
    END IF;

    v_failed_attempts := COALESCE(v_user.failed_attempts, 0) + 1;
    IF v_failed_attempts >= 5 THEN
        UPDATE public.users 
        SET failed_attempts = v_failed_attempts, locked_until = now() + interval '15 minutes', updated_at = now() 
        WHERE email = p_email;
        RETURN jsonb_build_object('success', true, 'locked', true, 'locked_until', now() + interval '15 minutes');
    ELSE
        UPDATE public.users 
        SET failed_attempts = v_failed_attempts, updated_at = now() 
        WHERE email = p_email;
        RETURN jsonb_build_object('success', true, 'locked', false, 'failed_attempts', v_failed_attempts);
    END IF;
END;
$$;

-- ── 4. RLS Lockdown: users ──────────────────────────────────
DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_update" ON public.users
    FOR UPDATE TO anon
    USING (
        public.is_admin_session()
        OR id = public.get_session_user_id()
    )
    WITH CHECK (
        public.is_admin_session()
        OR (
            id = public.get_session_user_id() AND
            role = (SELECT u.role FROM public.users u WHERE u.id = id) AND
            is_active = (SELECT u.is_active FROM public.users u WHERE u.id = id)
        )
    );

-- ── 5. RLS Lockdown: settings ───────────────────────────────
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

CREATE POLICY "settings_insert" ON public.settings
    FOR INSERT TO anon
    WITH CHECK (public.is_admin_session());

CREATE POLICY "settings_update" ON public.settings
    FOR UPDATE TO anon
    USING (public.is_admin_session())
    WITH CHECK (public.is_admin_session());

CREATE POLICY "settings_delete" ON public.settings
    FOR DELETE TO anon
    USING (
        public.is_admin_session() OR
        key = 'must_change_pw_' || public.get_session_user_id()
    );
