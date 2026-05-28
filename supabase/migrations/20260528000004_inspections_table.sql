-- Migration: inspections table
-- Purpose: บันทึกผลการตรวจสภาพบ้านก่อนการส่งมอบคืน

CREATE TABLE IF NOT EXISTS inspections (
    id              TEXT        PRIMARY KEY DEFAULT ('INS' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 4)),
    request_id      TEXT        NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    house_id        TEXT        REFERENCES housing(id) ON DELETE SET NULL,
    inspector_id    TEXT        NOT NULL REFERENCES users(id),
    items           JSONB       NOT NULL DEFAULT '{}',  -- 7 หมวดหมู่
    photos          JSONB       NOT NULL DEFAULT '[]',  -- array of URL
    damage_estimate NUMERIC(12,2) NOT NULL DEFAULT 0,
    note            TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed')),
    inspected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspections_request_id ON inspections(request_id);
CREATE INDEX IF NOT EXISTS idx_inspections_house_id   ON inspections(house_id);

-- RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Admin/head/team can read all
CREATE POLICY inspections_select ON inspections
    FOR SELECT
    USING (public.is_admin_session() OR public.is_authenticated());

-- Only admin/head can insert
CREATE POLICY inspections_insert ON inspections
    FOR INSERT
    WITH CHECK (public.is_admin_session());

-- Only admin/head can update
CREATE POLICY inspections_update ON inspections
    FOR UPDATE
    USING (public.is_admin_session())
    WITH CHECK (public.is_admin_session());
