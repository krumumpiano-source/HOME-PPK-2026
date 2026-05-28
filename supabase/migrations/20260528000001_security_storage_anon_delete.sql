-- ============================================================
-- HOME PPK 2026 — Security: ปิด anon DELETE บน Storage
-- ปัญหา: anon ลบไฟล์ใน 7 buckets ได้ (สลิป, เอกสาร, มิเตอร์)
-- แก้ไข: เปลี่ยนเป็น admin-only DELETE เท่านั้น
-- หมายเหตุ: app code ไม่มี user-facing DELETE → ไม่ทำให้แอปพัง
-- ============================================================

-- ── ลบ policies เก่า (anon DELETE) ─────────────────────────
DROP POLICY IF EXISTS "anon_delete_slips"               ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_receipts"            ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_attach_residence"    ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_attach_repair"       ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_attach_transfer"     ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_attach_return"       ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_meter_photos"        ON storage.objects;

-- ── สร้าง policies ใหม่ (admin-only DELETE) ──────────────────
CREATE POLICY "admin_delete_slips"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'slips' AND public.is_admin_session());

CREATE POLICY "admin_delete_receipts"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'receipts' AND public.is_admin_session());

CREATE POLICY "admin_delete_attach_residence"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'attach-residence' AND public.is_admin_session());

CREATE POLICY "admin_delete_attach_repair"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'attach-repair' AND public.is_admin_session());

CREATE POLICY "admin_delete_attach_transfer"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'attach-transfer' AND public.is_admin_session());

CREATE POLICY "admin_delete_attach_return"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'attach-return' AND public.is_admin_session());

CREATE POLICY "admin_delete_meter_photos"
    ON storage.objects FOR DELETE TO anon
    USING (bucket_id = 'meter-photos' AND public.is_admin_session());
