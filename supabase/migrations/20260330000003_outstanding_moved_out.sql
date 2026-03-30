-- Migration: เพิ่ม moved_out_at ใน outstanding เพื่อซ่อนหนี้เก่าจากผู้พักใหม่
-- Additive only — ไม่กระทบข้อมูลเดิม (DEFAULT NULL = ปกติ)
-- เมื่อ resident ย้ายออกและยังมียอดค้าง → ระบบจะ set moved_out_at = timestamp
-- ผู้พักใหม่จะไม่เห็น rows ที่ moved_out_at IS NOT NULL ใน dashboard
-- Admin ยังเห็นทุก row ได้เพื่อตามเก็บหนี้คนเก่า

ALTER TABLE public.outstanding
  ADD COLUMN IF NOT EXISTS moved_out_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.outstanding.moved_out_at IS
  'หนี้ที่ค้างชำระจากผู้พักเดิมที่ย้ายออกไปแล้ว — ผู้พักใหม่จะไม่เห็น row นี้ใน dashboard';

CREATE INDEX IF NOT EXISTS idx_outstanding_moved_out
  ON public.outstanding(moved_out_at)
  WHERE moved_out_at IS NOT NULL;
