-- เพิ่มคอลัมน์ receipt_sent_at เพื่อ track ว่าส่งใบเสร็จอีเมลแล้วหรือยัง (แชร์ทุก device)
ALTER TABLE public.slip_submissions
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz DEFAULT NULL;
