-- ============================================================
-- HOME PPK 2026 — Storage Buckets Setup
-- รัน script นี้ใน Supabase SQL Editor (1 ครั้ง)
--
-- Buckets ทั้งหมด 6 ตัว:
--   - slips              : สลิปชำระเงิน
--   - receipts           : (legacy) เก็บไว้ backward compat
--   - attach-residence   : เอกสารแนบคำร้องขอเข้าพัก
--   - attach-repair      : เอกสารแนบคำร้องขอซ่อมแซม
--   - attach-transfer    : เอกสารแนบคำร้องขอย้าย
--   - attach-return      : เอกสารแนบคำร้องขอคืนบ้านพัก
--
-- File naming convention:
--   attach-*  : {house_number}/{YYYY-MM-DD}/{requestId}_{timestamp}_{filename}
--   slips     : {house_number}/{YYYY-MM}/{timestamp}.jpg
-- ============================================================

-- ── สร้าง buckets ทั้งหมด ────────────────────────────────
DO $$
DECLARE
  b TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['slips','receipts','attach-residence','attach-repair','attach-transfer','attach-return']
  LOOP
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES (b, b, true, 10485760)
    ON CONFLICT (id) DO UPDATE SET file_size_limit = 10485760, public = true;
  END LOOP;
END $$;

-- ── RLS Policies สำหรับทุก bucket ────────────────────────
-- INSERT (อัปโหลด)
DO $$
DECLARE
  b TEXT;
  pol TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['slips','receipts','attach-residence','attach-repair','attach-transfer','attach-return']
  LOOP
    pol := 'anon_insert_' || replace(b, '-', '_');
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol AND tablename = 'objects') THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = %L)',
        pol, b
      );
    END IF;
  END LOOP;
END $$;

-- SELECT (อ่าน/ดาวน์โหลด)
DO $$
DECLARE
  b TEXT;
  pol TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['slips','receipts','attach-residence','attach-repair','attach-transfer','attach-return']
  LOOP
    pol := 'anon_select_' || replace(b, '-', '_');
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol AND tablename = 'objects') THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR SELECT TO anon USING (bucket_id = %L)',
        pol, b
      );
    END IF;
  END LOOP;
END $$;

-- DELETE (ลบ — สำหรับ auto-cleanup เมื่อคำร้องจบ)
DO $$
DECLARE
  b TEXT;
  pol TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['slips','receipts','attach-residence','attach-repair','attach-transfer','attach-return']
  LOOP
    pol := 'anon_delete_' || replace(b, '-', '_');
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol AND tablename = 'objects') THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR DELETE TO anon USING (bucket_id = %L)',
        pol, b
      );
    END IF;
  END LOOP;
END $$;
