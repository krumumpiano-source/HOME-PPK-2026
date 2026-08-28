-- Migration: แก้ไขอีเมลที่พิมพ์ผิด chiraph.c@ppk.ac.th ให้เป็น chiraphan.c@ppk.ac.th ทั้งหมดในฐานข้อมูล

UPDATE public.residents
SET email = 'chiraphan.c@ppk.ac.th',
    phone = COALESCE(phone, '0866449595'),
    updated_at = now()
WHERE email ILIKE '%chiraph.c@ppk.ac.th%'
   OR user_id = 'USR-2603121024';

UPDATE public.users
SET email = 'chiraphan.c@ppk.ac.th',
    phone = COALESCE(phone, '0866449595'),
    updated_at = now()
WHERE email ILIKE '%chiraph.c@ppk.ac.th%'
   OR id = 'USR-2603121024';

UPDATE public.coresidents
SET email = 'chiraphan.c@ppk.ac.th'
WHERE email ILIKE '%chiraph.c@ppk.ac.th%';

UPDATE public.slip_submissions
SET resident_email = 'chiraphan.c@ppk.ac.th'
WHERE resident_email ILIKE '%chiraph.c@ppk.ac.th%';
