-- ============================================================
-- Migration: เพิ่มคอลัมน์ที่อยู่ + รูปภาพ ในตาราง residents
-- วันที่: 2026-03-13
-- สาเหตุ: settings.html บันทึกที่อยู่/รูปภาพ แต่ DB ไม่มีคอลัมน์รองรับ
-- ============================================================

-- เพิ่มฟิลด์ที่อยู่ตามทะเบียนบ้าน
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS address_no       text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS address_village  text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS address_road     text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS subdistrict      text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS district         text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS province         text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS zipcode          text;

-- รูปประจำตัว (base64 หรือ URL)
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS profile_photo    text;

-- วันที่เข้าพัก (แยกจาก start_date ที่ใช้สำหรับ admin tracking)
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS move_in_date     date;

-- เพิ่ม subject_group ที่อาจยังไม่มี
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS subject_group    text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS phone            text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS email            text;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS resident_type    text;

-- เพิ่ม subject_group ใน users ถ้ายังไม่มี
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subject_group text;
