-- ============================================================
-- HOME PPK 2026 - Fix: Delete sessions after password reset via OTP
-- Date: 2026-08-27
-- rpc_verify_password_reset: delete user sessions after successful OTP reset
-- ============================================================

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
    v_user_id text;
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

    -- OTP ถูกต้อง: อัปเดตรหัสผ่าน + reset lockout
    UPDATE public.users
    SET password_hash = p_new_password_hash,
        failed_attempts = 0,
        locked_until = NULL,
        is_active = true,
        updated_at = now()
    WHERE email = p_email
    RETURNING id INTO v_user_id;

    -- [FIX] ลบ sessions ทั้งหมดของ user นี้ (force logout ทุก device)
    IF v_user_id IS NOT NULL THEN
        DELETE FROM public.sessions WHERE user_id = v_user_id;
    END IF;

    -- ลบข้อมูล OTP
    DELETE FROM public.settings WHERE key = v_key;
    -- ลบ flag บังคับเปลี่ยนรหัส (ถ้ามี)
    IF v_user_id IS NOT NULL THEN
        DELETE FROM public.settings WHERE key = 'must_change_pw_' || v_user_id;
    END IF;

    RETURN '{"success": true, "message": "เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_verify_password_reset(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_request_password_reset(TEXT, TEXT, TIMESTAMPTZ) TO anon;