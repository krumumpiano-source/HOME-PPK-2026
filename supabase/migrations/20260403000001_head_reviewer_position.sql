-- Add head_reviewer_position column to requests table
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS head_reviewer_position TEXT DEFAULT NULL;
