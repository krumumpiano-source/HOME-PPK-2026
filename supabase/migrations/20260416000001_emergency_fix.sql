-- ============================================================
-- Phase 1: Emergency Fix
-- 1.1 Enable RLS on report_approvals (CRITICAL)
-- 1.2 Fix function search_path (6 warnings)
-- ============================================================

-- 1.1 Enable RLS + transitional policy for report_approvals
ALTER TABLE public.report_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_report_approvals" ON public.report_approvals FOR ALL TO anon USING (true) WITH CHECK (true);

-- 1.2 Fix function search_path
ALTER FUNCTION public.get_session_user_id() SET search_path = public;
ALTER FUNCTION public.get_session_role() SET search_path = public;
ALTER FUNCTION public.is_admin_session() SET search_path = public;
ALTER FUNCTION public.is_authenticated() SET search_path = public;
