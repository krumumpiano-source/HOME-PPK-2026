-- ============================================================
-- Migration: เพิ่ม default_resident_pin สำหรับลิงก์ LINE
-- วันที่: 7 มีนาคม 2569 (2026)
-- ============================================================

-- เพิ่ม setting สำหรับ default PIN ที่ใช้เมื่อ resident ไม่มี user_id
INSERT INTO public.settings (key, value)
VALUES ('default_resident_pin', '1234')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- คำอธิบาย:
-- - default_resident_pin ใช้เมื่อผู้พักอาศัยไม่มี user_id (ไม่มีบัญชีในระบบ)
-- - ให้เปลี่ยนเป็นรหัสที่ปลอดภัยกว่า '1234' ในการใช้งานจริง
-- - ผู้พักที่มี user_id จะตรวจสอบจาก users.password_hash แทน
