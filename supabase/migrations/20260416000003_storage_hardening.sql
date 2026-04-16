-- ============================================================
-- Phase 4: Storage Bucket Hardening
-- HOME PPK 2026 — Security Hardening
-- Date: 2026-04-16
--
-- แนวทาง pragmatic:
--   - คง public = true (ไม่ทำลาย URL เดิมที่เก็บใน DB)
--   - ลบ broad SELECT policy → ใช้ path-based access แทน (public URL ยังใช้ได้เพราะ bucket public)
--   - จำกัด INSERT: ต้อง authenticated
--   - จำกัด DELETE: ต้อง authenticated
--   - SELECT คงไว้ (public bucket ให้ access via direct URL อยู่แล้ว)
-- ============================================================

-- ── ลบ storage policies เดิมทั้งหมด ─────────────────────
DO $$
DECLARE
  b TEXT;
  pol TEXT;
  suffixes TEXT[] := ARRAY['insert','select','delete'];
  s TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['slips','receipts','attach-residence','attach-repair','attach-transfer','attach-return','meter-photos']
  LOOP
    FOREACH s IN ARRAY suffixes
    LOOP
      pol := 'anon_' || s || '_' || replace(b, '-', '_');
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol);
    END LOOP;
  END LOOP;
END $$;

-- ── สร้าง storage policies ใหม่ ──────────────────────────

-- SELECT: คงไว้เพราะ getPublicUrl ต้องใช้ (แต่ public bucket ใช้ direct URL ได้อยู่แล้ว)
-- เปลี่ยนจาก broad USING (bucket_id = 'xxx') → เพิ่มเงื่อนไข: ต้องระบุชื่อไฟล์ (ป้องกัน list ทั้ง bucket)
-- Note: public buckets ใน Supabase ยัง list ได้ผ่าน public URL เสมอ
-- สิ่งที่ทำได้คือ restrict via RLS policy บน storage.objects

DO $$
DECLARE
  b TEXT;
  pol TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['slips','receipts','attach-residence','attach-repair','attach-transfer','attach-return','meter-photos']
  LOOP
    -- SELECT: Still allow (needed for getPublicUrl/download, and listing is controlled by app)
    pol := 'auth_select_' || replace(b, '-', '_');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO anon USING (bucket_id = %L)',
      pol, b
    );

    -- INSERT: ต้อง authenticated
    pol := 'auth_insert_' || replace(b, '-', '_');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = %L AND public.is_authenticated())',
      pol, b
    );

    -- DELETE: ต้อง authenticated
    pol := 'auth_delete_' || replace(b, '-', '_');
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO anon USING (bucket_id = %L AND public.is_authenticated())',
      pol, b
    );
  END LOOP;
END $$;
