-- เพิ่ม columns สำหรับ workflow ลงความเห็นหัวหน้างาน
-- head_comment: ความเห็นที่หัวหน้าพิมพ์
-- head_signature: ลายเซ็นดิจิทัล (base64 PNG data URL)
-- head_reviewed_at: วันเวลาที่ลงความเห็น
-- head_reviewer_name: ชื่อผู้ลงความเห็น
-- form_date: วันที่เอกสาร (สำหรับกรอกย้อนหลัง — admin เท่านั้น)

alter table public.requests
    add column if not exists head_comment text,
    add column if not exists head_signature text,
    add column if not exists head_reviewed_at timestamptz,
    add column if not exists head_reviewer_name text,
    add column if not exists form_date date;
