-- Migration: Remove LINE integration
-- DATE: 2026-03-15

DROP TABLE IF EXISTS public.line_push_log;
ALTER TABLE public.residents DROP COLUMN IF EXISTS line_user_id;
ALTER TABLE public.residents DROP COLUMN IF EXISTS line_linked_at;
DROP INDEX IF EXISTS idx_residents_line_user_id;
DELETE FROM public.settings WHERE key LIKE 'line_%';
DELETE FROM public.settings WHERE key = 'default_resident_pin';