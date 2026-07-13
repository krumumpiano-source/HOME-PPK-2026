-- Create published_reports table
CREATE TABLE IF NOT EXISTS public.published_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    year INT NOT NULL,
    month INT NOT NULL,
    income DECIMAL(10,2) NOT NULL DEFAULT 0,
    expense DECIMAL(10,2) NOT NULL DEFAULT 0,
    memo TEXT,
    metrics JSONB DEFAULT '{}'::jsonb,
    published_by UUID REFERENCES public.users(id),
    published_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- Set up RLS
ALTER TABLE public.published_reports ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read published reports
DROP POLICY IF EXISTS "Everyone can view published reports" ON public.published_reports;
CREATE POLICY "Everyone can view published reports" 
    ON public.published_reports 
    FOR SELECT 
    USING (true);

-- Allow admins/heads to insert/update published reports
DROP POLICY IF EXISTS "Admins can manage published reports" ON public.published_reports;
CREATE POLICY "Admins can manage published reports" 
    ON public.published_reports 
    FOR ALL 
    USING (public.is_admin_session());
