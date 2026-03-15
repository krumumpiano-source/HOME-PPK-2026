-- ============================================================
-- Migration: แก้ house_id ให้ nullable ใน water_bills / electric_bills
-- วันที่: 2026-03-15
-- สาเหตุ: batch insert จาก record-water.html / record-electric.html
--         ไม่มี house_id ในข้อมูล (มีแค่ house_number) แต่ schema
--         กำหนด NOT NULL ทำให้ insert ล้มเหลว DB constraint violation
-- ============================================================

-- house_number ยังคงเป็น NOT NULL (เป็น key หลักในการ query)
-- house_id เป็นแค่ FK สำหรับ referential integrity ที่ optional
ALTER TABLE public.water_bills    ALTER COLUMN house_id DROP NOT NULL;
ALTER TABLE public.electric_bills ALTER COLUMN house_id DROP NOT NULL;

-- หมายเหตุ: รหัส API ใน ppk-api.js ได้แก้ให้ pre-fetch house_id
--            จาก housing table ก่อน insert อยู่แล้ว migration นี้
--            เป็น safety net ในกรณีที่ house ไม่มีใน DB
