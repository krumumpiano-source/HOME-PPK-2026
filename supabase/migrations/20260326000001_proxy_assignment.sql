-- ============================================================
-- Proxy Payment Assignment System
-- ให้แอดมินกำหนดว่าใครชำระแทนบ้านไหน
-- ============================================================

-- ── ตาราง payment_proxies: เก็บการมอบหมายชำระแทน ──
CREATE TABLE IF NOT EXISTS public.payment_proxies (
  id              TEXT PRIMARY KEY DEFAULT ('PRX' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_id        TEXT REFERENCES public.housing(id) ON DELETE CASCADE,
  house_number    TEXT NOT NULL,
  proxy_user_id   TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  proxy_resident_id TEXT REFERENCES public.residents(id) ON DELETE SET NULL,
  assigned_by     TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 1 บ้าน มี proxy ที่ active ได้ 1 คนเท่านั้น ──
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_proxies_house_active
  ON public.payment_proxies (house_number)
  WHERE is_active = TRUE;

-- ── Index สำหรับ query ด้วย proxy_user_id ──
CREATE INDEX IF NOT EXISTS idx_payment_proxies_proxy_user
  ON public.payment_proxies (proxy_user_id);

CREATE INDEX IF NOT EXISTS idx_payment_proxies_house_number
  ON public.payment_proxies (house_number, is_active);

-- ── เพิ่มคอลัมน์ submitted_by_user_id ใน slip_submissions ──
--    เพื่อ audit trail ชัดเจนว่าใครส่งสลิปนี้
ALTER TABLE public.slip_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_slip_submissions_submitted_by
  ON public.slip_submissions (submitted_by_user_id);

-- ── RLS policy สำหรับ payment_proxies ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'anon_all_payment_proxies' AND tablename = 'payment_proxies'
  ) THEN
    CREATE POLICY anon_all_payment_proxies ON public.payment_proxies
      FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- เปิด RLS บน table ใหม่
ALTER TABLE public.payment_proxies ENABLE ROW LEVEL SECURITY;
