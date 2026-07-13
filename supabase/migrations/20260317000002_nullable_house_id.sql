-- ============================================================
-- Migration: Make residents.house_id NULLABLE
-- เหตุผล: ให้สร้างผู้พักอาศัยได้แม้ยังไม่มีบ้านผูก
-- ============================================================

-- Drop existing NOT NULL + foreign key constraint
ALTER TABLE public.residents
  ALTER COLUMN house_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete (instead of RESTRICT)
ALTER TABLE public.residents
  DROP CONSTRAINT IF EXISTS residents_house_id_fkey;

ALTER TABLE public.residents
  ADD CONSTRAINT residents_house_id_fkey
    FOREIGN KEY (house_id)
    REFERENCES public.housing(id)
    ON DELETE SET NULL;
