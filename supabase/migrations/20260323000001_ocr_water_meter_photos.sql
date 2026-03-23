-- ============================================================
-- OCR Integration: Water Meter Photos + Slip QR Data
-- เพิ่มคอลัมน์สำหรับเก็บรูปถ่ายมิเตอร์น้ำ, ข้อมูล OCR,
-- และข้อมูล QR จากสลิป
-- ============================================================

-- ── water_bills: เพิ่มคอลัมน์สำหรับรูปถ่าย + OCR ──
ALTER TABLE water_bills ADD COLUMN IF NOT EXISTS meter_photo_url TEXT;
ALTER TABLE water_bills ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;
ALTER TABLE water_bills ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5,2);
ALTER TABLE water_bills ADD COLUMN IF NOT EXISTS read_by TEXT;
ALTER TABLE water_bills ADD COLUMN IF NOT EXISTS photo_deleted_at TIMESTAMPTZ;

-- ── slip_submissions: เพิ่มคอลัมน์ QR data ──
ALTER TABLE slip_submissions ADD COLUMN IF NOT EXISTS qr_amount NUMERIC(10,2);
ALTER TABLE slip_submissions ADD COLUMN IF NOT EXISTS qr_ref TEXT;
ALTER TABLE slip_submissions ADD COLUMN IF NOT EXISTS qr_raw TEXT;

-- ── Storage bucket: meter-photos ──
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('meter-photos', 'meter-photos', true, 10485760)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 10485760, public = true;

-- RLS policies สำหรับ meter-photos bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_meter_photos' AND tablename = 'objects') THEN
    CREATE POLICY anon_insert_meter_photos ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'meter-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_select_meter_photos' AND tablename = 'objects') THEN
    CREATE POLICY anon_select_meter_photos ON storage.objects FOR SELECT TO anon USING (bucket_id = 'meter-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_delete_meter_photos' AND tablename = 'objects') THEN
    CREATE POLICY anon_delete_meter_photos ON storage.objects FOR DELETE TO anon USING (bucket_id = 'meter-photos');
  END IF;
END $$;
