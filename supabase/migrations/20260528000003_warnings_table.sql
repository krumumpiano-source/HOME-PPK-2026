-- Migration: warnings table
-- Purpose: บันทึกหนังสือตักเตือนผู้พักอาศัย ระดับ 1-3

CREATE TABLE IF NOT EXISTS warnings (
    id          TEXT        PRIMARY KEY DEFAULT ('WRN' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 4)),
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    house_id    TEXT        REFERENCES housing(id) ON DELETE SET NULL,
    level       INTEGER     NOT NULL CHECK (level BETWEEN 1 AND 3),
    reason      TEXT        NOT NULL,
    note        TEXT,
    issued_by   TEXT        NOT NULL REFERENCES users(id),
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warnings_user_id   ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_house_id  ON warnings(house_id);
CREATE INDEX IF NOT EXISTS idx_warnings_issued_at ON warnings(issued_at DESC);

-- RLS
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;

-- Admin/head/team can read all
CREATE POLICY warnings_select ON warnings
    FOR SELECT
    USING (public.is_admin_session() OR public.is_authenticated());

-- Only admin/head can insert
CREATE POLICY warnings_insert ON warnings
    FOR INSERT
    WITH CHECK (public.is_admin_session());

-- Only admin/head can update (acknowledge)
CREATE POLICY warnings_update ON warnings
    FOR UPDATE
    USING (public.is_admin_session())
    WITH CHECK (public.is_admin_session());
