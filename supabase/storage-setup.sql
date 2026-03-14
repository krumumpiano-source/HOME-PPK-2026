-- ============================================================
-- HOME PPK 2026 — Storage Buckets Setup
-- รัน script นี้ใน Supabase SQL Editor (1 ครั้ง)
--
-- สร้าง bucket สำหรับเก็บ:
--   - receipts  : สลิปชำระเงิน + เอกสารแนบคำร้อง
-- ============================================================

-- ── สร้าง bucket 'receipts' (public) ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('receipts', 'receipts', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- ── Policy: ให้ anon อัปโหลดได้ ──────────────────────────
CREATE POLICY "Allow anon uploads to receipts"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'receipts');

-- ── Policy: ให้ทุกคนอ่านได้ (public bucket) ──────────────
CREATE POLICY "Allow public read receipts"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'receipts');

-- ── Policy: ให้ anon ลบได้ (สำหรับ auto-delete attachments) ──
CREATE POLICY "Allow anon delete receipts"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'receipts');
