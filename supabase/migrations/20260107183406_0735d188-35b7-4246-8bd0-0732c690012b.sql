-- Drop existing check constraint and add expanded one with all session types
ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_session_type_check;

ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_session_type_check 
CHECK (session_type = ANY (ARRAY['research'::text, 'solutions'::text, 'longlist'::text, 'shortlist'::text, 'evaluation'::text, 'report'::text]));