-- ==========================================================
-- Approve March 2569 Slips & Sync Payment History
-- Date: 2026-07-24
-- Description: เปลี่ยนสถานะสลิป มี.ค. 2569 ทั้งหมดให้เป็น approved
--              และลงบันทึก payment_history + ปรับ status ใน outstanding เป็น paid
-- ==========================================================

BEGIN;

-- 1) อัปเดตสถานะสลิปงวด มี.ค. 2569 (2569-03) ทั้งหมดให้เป็น approved
UPDATE public.slip_submissions
SET status      = 'approved',
    review_note = NULL,
    reviewed_at = now()
WHERE period = '2569-03';

-- 2) บันทึกรายการใน payment_history สำหรับสลิปงวด มี.ค. 2569 (หากยังไม่มีรายการ)
INSERT INTO public.payment_history (
    house_number,
    period,
    amount_paid,
    payment_date,
    payment_method,
    slip_id,
    recorded_by
)
SELECT 
    s.house_number,
    s.period,
    s.amount,
    COALESCE(s.submitted_at::date, CURRENT_DATE),
    'transfer',
    s.id,
    'SYSTEM'
FROM public.slip_submissions s
WHERE s.period = '2569-03'
  AND s.status = 'approved'
  AND NOT EXISTS (
      SELECT 1 FROM public.payment_history ph 
      WHERE ph.slip_id = s.id
  );

-- 3) ปรับสถานะยอดค้างชำระใน outstanding ของงวด มี.ค. 2569 ให้เป็น paid
UPDATE public.outstanding
SET status = 'paid',
    updated_at = now()
WHERE period = '2569-03'
  AND status != 'paid'
  AND house_number IN (
      SELECT house_number 
      FROM public.slip_submissions 
      WHERE period = '2569-03' AND status = 'approved'
  );

COMMIT;
