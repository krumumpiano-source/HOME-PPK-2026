-- เพิ่มคอลัมน์ วันที่อ่านมิเตอร์ ใน water_bills และ electric_bills
ALTER TABLE public.water_bills ADD COLUMN IF NOT EXISTS reading_date date;
ALTER TABLE public.electric_bills ADD COLUMN IF NOT EXISTS reading_date date;
