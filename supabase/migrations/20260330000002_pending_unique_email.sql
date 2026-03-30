-- Migration: Partial unique index ป้องกันสมัครสมาชิกอีเมลซ้ำ (เฉพาะ status = pending)
-- Additive only — ไม่กระทบ rows ที่ approved/rejected เดิม
-- NOTE: ถ้า migration นี้ fail แปลว่ามีอีเมลซ้ำใน pending อยู่แล้ว
--       ให้รัน query นี้ก่อน: SELECT email, COUNT(*) FROM pending_registrations WHERE status='pending' GROUP BY email HAVING COUNT(*) > 1

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_reg_email_pending
  ON public.pending_registrations(email)
  WHERE status = 'pending';

COMMENT ON INDEX public.idx_pending_reg_email_pending IS
  'ป้องกันการสมัครซ้ำด้วยอีเมลเดิมขณะรออนุมัติ (pending เท่านั้น)';
