-- ============================================================
-- Backfill: สร้าง outstanding จาก notifications ที่มีอยู่แล้ว
-- Date: 2026-04-01
-- ⚠️ Run AFTER 20260401000001_transfer_system.sql
-- ⚠️ Run ONCE only — idempotent (ไม่ overwrite ถ้ามีอยู่แล้ว)
-- ============================================================

-- สร้าง outstanding จาก notifications ที่ยังไม่มี outstanding record
-- Cross-reference กับ payment_history เพื่อตั้ง status ถูกต้อง
INSERT INTO public.outstanding (
    house_id, house_number, period, year, month,
    water_amount, electric_amount, common_fee, total_amount,
    due_date, status, resident_name
)
SELECT
    h.id AS house_id,
    n.house_number,
    n.period,
    CAST(SPLIT_PART(n.period, '-', 1) AS int) AS year,
    CAST(SPLIT_PART(n.period, '-', 2) AS int) AS month,
    COALESCE(n.water_amount, 0),
    COALESCE(n.electric_amount, 0),
    COALESCE(n.common_fee, 0),
    COALESCE(n.total_amount, 0),
    n.due_date,
    CASE
        WHEN ph.id IS NOT NULL THEN 'paid'
        ELSE 'unpaid'
    END AS status,
    n.resident_name
FROM public.notifications n
JOIN public.housing h ON h.house_number = n.house_number
LEFT JOIN public.payment_history ph
    ON ph.house_number = n.house_number AND ph.period = n.period
WHERE NOT EXISTS (
    SELECT 1 FROM public.outstanding o
    WHERE o.house_number = n.house_number AND o.period = n.period
)
-- เลือกเฉพาะ notification ล่าสุดของแต่ละ (house_number, period)
AND n.id = (
    SELECT n2.id FROM public.notifications n2
    WHERE n2.house_number = n.house_number AND n2.period = n.period
    ORDER BY n2.sent_at DESC
    LIMIT 1
);

-- แสดงผลลัพธ์
-- SELECT status, COUNT(*) FROM public.outstanding GROUP BY status;
