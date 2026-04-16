-- ============================================================
-- Advance Payments — ระบบสำรองจ่าย/ทดรองจ่าย
-- HOME PPK 2026
-- Date: 2026-04-16
--
-- เพิ่มตาราง advance_payments สำหรับ:
--   - บันทึกการสำรองจ่ายจากกรรมการ
--   - บันทึกการใช้เงินสดคงเหลือ
--   - Workflow คืนเงิน/เบิกคืน + อนุมัติ
-- เพิ่ม columns deferred_reason, deferred_until ใน outstanding
-- ============================================================

-- ── 1. สร้างตาราง advance_payments ──────────────────────
CREATE TABLE IF NOT EXISTS public.advance_payments (
  id                text PRIMARY KEY DEFAULT ('ADV' || upper(substr(gen_random_uuid()::text, 1, 8))),
  period            text NOT NULL,                          -- YYYY-MM
  person_name       text NOT NULL,                          -- ชื่อกรรมการที่สำรองจ่าย
  amount            numeric(10,2) NOT NULL,                 -- จำนวนเงินที่สำรอง
  purpose           text,                                   -- วัตถุประสงค์ เช่น จ่ายค่าไฟ
  source_type       text NOT NULL DEFAULT 'committee_advance', -- committee_advance | remaining_cash | other
  status            text NOT NULL DEFAULT 'pending',        -- pending | reimbursed | partial
  reimbursed_amount numeric(10,2) DEFAULT 0,                -- จำนวนที่คืนแล้ว
  reimbursed_at     timestamptz,                            -- วันที่คืนล่าสุด
  reimbursed_note   text,                                   -- หมายเหตุการคืน
  approved_by       text,                                   -- ผู้อนุมัติคืนเงิน (user_id)
  approved_at       timestamptz,                            -- วันที่อนุมัติ
  recorded_by       text,                                   -- ผู้บันทึก (user_id)
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advance_payments_period ON public.advance_payments(period);
CREATE INDEX IF NOT EXISTS idx_advance_payments_status ON public.advance_payments(status);

-- ── 2. เพิ่ม columns ใน outstanding ─────────────────────
ALTER TABLE IF EXISTS public.outstanding
  ADD COLUMN IF NOT EXISTS deferred_reason text,
  ADD COLUMN IF NOT EXISTS deferred_until  date;

-- ── 3. Enable RLS ───────────────────────────────────────
ALTER TABLE public.advance_payments ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS Policies (transitional — เหมือน pattern เดิม) ─
CREATE POLICY "anon_all_advance_payments"
  ON public.advance_payments FOR ALL TO anon
  USING (true) WITH CHECK (true);
