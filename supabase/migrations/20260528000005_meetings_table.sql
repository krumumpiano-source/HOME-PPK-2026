-- Migration: meetings table
-- Purpose: บันทึกการประชุมคณะกรรมการบ้านพักครู

CREATE TABLE IF NOT EXISTS meetings (
    id           TEXT        PRIMARY KEY DEFAULT ('MTG' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 4)),
    title        TEXT        NOT NULL,
    agenda       TEXT,
    venue        TEXT,
    meeting_date TIMESTAMPTZ NOT NULL,
    attendees    JSONB       NOT NULL DEFAULT '[]',   -- array of {name, role}
    quorum_met   BOOLEAN     NOT NULL DEFAULT false,
    resolutions  JSONB       NOT NULL DEFAULT '[]',   -- array of {number, text, votes}
    minutes      TEXT,
    status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published')),
    created_by   TEXT        NOT NULL REFERENCES users(id),
    approved_by  TEXT        REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status       ON meetings(status);

-- RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read published meetings; admin/head can read all
DROP POLICY IF EXISTS meetings_select ON meetings;
CREATE POLICY meetings_select ON meetings
    FOR SELECT
    USING (status = 'published' OR public.is_admin_session());

-- Only admin/head can insert
DROP POLICY IF EXISTS meetings_insert ON meetings;
CREATE POLICY meetings_insert ON meetings
    FOR INSERT
    WITH CHECK (public.is_admin_session());

-- Only admin/head can update
DROP POLICY IF EXISTS meetings_update ON meetings;
CREATE POLICY meetings_update ON meetings
    FOR UPDATE
    USING (public.is_admin_session())
    WITH CHECK (public.is_admin_session());
