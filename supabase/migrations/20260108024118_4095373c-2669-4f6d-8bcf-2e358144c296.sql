-- Enable realtime for study_longlist table
ALTER TABLE public.study_longlist REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_longlist;