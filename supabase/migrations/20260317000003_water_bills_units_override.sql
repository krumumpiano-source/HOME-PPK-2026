-- ============================================================
-- Migration: เพิ่ม units_override ใน water_bills
-- วันที่: 2026-03-17
-- สาเหตุ: รองรับกรณีเปลี่ยนมิเตอร์กลางเดือน
--         admin กรอกหน่วยรวม (หน่วยเดิม + หน่วยใหม่) override
--         การคำนวณจาก curr_meter - prev_meter
-- ============================================================

ALTER TABLE public.water_bills
    ADD COLUMN IF NOT EXISTS units_override numeric(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.water_bills.units_override IS
    'หน่วยรวมที่ admin กรอกเองกรณีเปลี่ยนมิเตอร์กลางเดือน (NULL = คำนวณปกติจาก curr-prev)';
