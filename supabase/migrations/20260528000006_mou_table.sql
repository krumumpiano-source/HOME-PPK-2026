-- Migration: mou_documents table + mou-documents storage bucket
-- Purpose: สัญญาเช่าบ้านพักครู (MOU)

CREATE TABLE IF NOT EXISTS mou_documents (
    id               TEXT        PRIMARY KEY DEFAULT ('MOU' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 4)),
    request_id       TEXT        NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    resident_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    house_id         TEXT        REFERENCES housing(id) ON DELETE SET NULL,
    template_version TEXT        NOT NULL DEFAULT '1.0',
    content          JSONB       NOT NULL DEFAULT '{}',    -- rendered template data
    sign_resident_url TEXT,                                -- URL ลายเซ็นผู้เช่า
    sign_admin_url   TEXT,                                 -- URL ลายเซ็นแอดมิน
    sign_head_url    TEXT,                                 -- URL ลายเซ็นหัวหน้า
    scanned_url      TEXT,                                 -- URL ไฟล์สแกนเอกสารจริง
    status           TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_sign','signed','archived')),
    signed_at        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mou_request_id  ON mou_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_mou_resident_id ON mou_documents(resident_id);
CREATE INDEX IF NOT EXISTS idx_mou_status      ON mou_documents(status);

-- RLS
ALTER TABLE mou_documents ENABLE ROW LEVEL SECURITY;

-- Resident can read their own MOU; admin/head can read all
DROP POLICY IF EXISTS mou_select ON mou_documents;
CREATE POLICY mou_select ON mou_documents
    FOR SELECT
    USING (
        public.is_admin_session() OR
        resident_id = public.get_session_user_id()
    );

-- Only admin/head can insert
DROP POLICY IF EXISTS mou_insert ON mou_documents;
CREATE POLICY mou_insert ON mou_documents
    FOR INSERT
    WITH CHECK (public.is_admin_session());

-- Admin/head can update any; resident can update sign_resident_url only
DROP POLICY IF EXISTS mou_update ON mou_documents;
CREATE POLICY mou_update ON mou_documents
    FOR UPDATE
    USING (
        public.is_admin_session() OR
        resident_id = public.get_session_user_id()
    )
    WITH CHECK (public.is_admin_session() OR resident_id = public.get_session_user_id());

-- Storage bucket for MOU documents (admin-only delete; authenticated upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mou-documents', 'mou-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mou-documents
CREATE POLICY mou_storage_select ON storage.objects
    FOR SELECT
    USING (bucket_id = 'mou-documents' AND (public.is_admin_session() OR public.is_authenticated()));

CREATE POLICY mou_storage_insert ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'mou-documents' AND (public.is_admin_session() OR public.is_authenticated()));

CREATE POLICY mou_storage_update ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'mou-documents' AND (public.is_admin_session() OR public.is_authenticated()));

CREATE POLICY mou_storage_delete ON storage.objects
    FOR DELETE
    USING (bucket_id = 'mou-documents' AND public.is_admin_session());

-- MOU template setting (stored in settings table)
INSERT INTO settings (key, value, updated_at)
VALUES (
    'mou_template',
    'สัญญาเช่าบ้านพักครู\n\nข้าพเจ้า {{resident_name}} ตำแหน่ง {{position}}\nได้รับอนุมัติให้เช่าบ้านพักครูเลขที่ {{house_number}}\nตั้งแต่วันที่ {{start_date}}\nข้าพเจ้าตกลงยินยอมปฏิบัติตามระเบียบข้อบังคับทุกประการ',
    NOW()
)
ON CONFLICT (key) DO NOTHING;
