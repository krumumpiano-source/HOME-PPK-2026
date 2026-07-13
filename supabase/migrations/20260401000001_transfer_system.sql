-- ============================================================
-- Migration: Transfer System (กรณีย้าย)
-- Date: 2026-04-01
-- Description: เพิ่ม columns สำหรับระบบย้ายเข้า/ออก/ภายใน/สลับ
--   + snapshot ชื่อผู้พักอาศัยใน bills/notifications/outstanding
--   + UNIQUE partial index ป้องกัน 2 active residents ในบ้านเดียว
--
-- ทุก column ใหม่เป็น NULLABLE หรือมี DEFAULT
-- → data เดิมไม่กระทบ, code เดิมทำงานปกติ
--
-- Deploy order: run migration FIRST → then deploy code
-- ============================================================

-- 1. users.status — active / departing / inactive
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. residents — ข้อมูลการย้ายออก
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS departed_at timestamptz;
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS departure_reason text;

-- 3. coresidents — soft-delete support
ALTER TABLE public.coresidents
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. outstanding — ผูกยอดค้างกับตัวคน (ไม่ใช่บ้าน)
ALTER TABLE public.outstanding
  ADD COLUMN IF NOT EXISTS user_id text REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.outstanding
  ADD COLUMN IF NOT EXISTS resident_name text;
ALTER TABLE public.outstanding
  ADD COLUMN IF NOT EXISTS resident_user_id text;

-- 5. slip_submissions — ระบุว่าใครส่งสลิป (สำหรับ departing user)
ALTER TABLE public.slip_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_user_id text REFERENCES public.users(id) ON DELETE SET NULL;

-- 6. requests — ข้อมูลเพิ่มเติมสำหรับ transfer/swap
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS target_house_number text;
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS paired_request_id text REFERENCES public.requests(id) ON DELETE SET NULL;
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS initiated_by text;

-- 7. Snapshot columns — บันทึกชื่อผู้พักอาศัย ณ ตอนสร้าง record
--    เพื่อให้ดูย้อนหลังได้ถูกต้อง แม้คนย้ายออกไปแล้ว
ALTER TABLE public.water_bills
  ADD COLUMN IF NOT EXISTS resident_name text;
ALTER TABLE public.water_bills
  ADD COLUMN IF NOT EXISTS resident_user_id text;

ALTER TABLE public.electric_bills
  ADD COLUMN IF NOT EXISTS resident_name text;
ALTER TABLE public.electric_bills
  ADD COLUMN IF NOT EXISTS resident_user_id text;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS resident_name text;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS resident_user_id text;

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS resident_name text;
ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS resident_user_id text;

-- 8. UNIQUE partial index — ป้องกัน race condition: 1 บ้าน = 1 active resident เท่านั้น
--    ⚠️ ก่อน run: ตรวจว่าไม่มี duplicate ด้วย query ด้านล่าง
--    SELECT house_id, COUNT(*) FROM residents WHERE is_active = true GROUP BY house_id HAVING COUNT(*) > 1;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT house_id FROM public.residents
    WHERE is_active = true AND house_id IS NOT NULL
    GROUP BY house_id HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_one_active_per_house
      ON public.residents(house_id) WHERE (is_active = true AND house_id IS NOT NULL);
  ELSE
    RAISE WARNING 'SKIP unique index: พบ duplicate active residents สำหรับบ้านเดียวกัน — กรุณาแก้ไขก่อน';
  END IF;
END $$;


-- ============================================================
-- ROLLBACK SQL (ใช้กรณีต้อง revert)
-- ============================================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.residents DROP COLUMN IF EXISTS departed_at;
-- ALTER TABLE public.residents DROP COLUMN IF EXISTS departure_reason;
-- ALTER TABLE public.coresidents DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.outstanding DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE public.outstanding DROP COLUMN IF EXISTS resident_name;
-- ALTER TABLE public.outstanding DROP COLUMN IF EXISTS resident_user_id;
-- ALTER TABLE public.slip_submissions DROP COLUMN IF EXISTS submitted_by_user_id;
-- ALTER TABLE public.requests DROP COLUMN IF EXISTS target_house_number;
-- ALTER TABLE public.requests DROP COLUMN IF EXISTS paired_request_id;
-- ALTER TABLE public.requests DROP COLUMN IF EXISTS initiated_by;
-- ALTER TABLE public.water_bills DROP COLUMN IF EXISTS resident_name;
-- ALTER TABLE public.water_bills DROP COLUMN IF EXISTS resident_user_id;
-- ALTER TABLE public.electric_bills DROP COLUMN IF EXISTS resident_name;
-- ALTER TABLE public.electric_bills DROP COLUMN IF EXISTS resident_user_id;
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS resident_name;
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS resident_user_id;
-- ALTER TABLE public.payment_history DROP COLUMN IF EXISTS resident_name;
-- ALTER TABLE public.payment_history DROP COLUMN IF EXISTS resident_user_id;
-- DROP INDEX IF EXISTS idx_residents_one_active_per_house;
