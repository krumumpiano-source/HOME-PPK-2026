-- ==========================================================
-- Revert March 2569 slip approvals
-- Reason: ยังไม่มีการบันทึกค่าน้ำค่าไฟเดือน มี.ค. 2569
--         สลิปไม่ควรถูกส่งหรืออนุมัติ
-- Date: 2026-03-18
-- ==========================================================

BEGIN;

-- 1) เปลี่ยนสลิป มี.ค. 2569 ที่ approved/pending → rejected
UPDATE public.slip_submissions
SET status      = 'rejected',
    review_note = 'ยกเลิกอัตโนมัติ — เดือน มี.ค. 2569 ยังไม่มีการบันทึกค่าน้ำค่าไฟ',
    reviewed_at = now()
WHERE period = '2569-03'
  AND status IN ('approved', 'pending');

-- 2) ลบ payment_history ที่เกิดจากสลิป มี.ค. 2569
DELETE FROM public.payment_history
WHERE period = '2569-03';

COMMIT;
