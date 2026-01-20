-- Create idempotency table for scouting run requests
CREATE TABLE public.scouting_run_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  payload_hash TEXT,
  job_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Index for cleanup of expired entries
CREATE INDEX idx_scouting_run_requests_expires_at ON public.scouting_run_requests(expires_at);

-- Index for user lookups
CREATE INDEX idx_scouting_run_requests_user_id ON public.scouting_run_requests(user_id);

-- Enable RLS
ALTER TABLE public.scouting_run_requests ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own requests (for audit purposes)
CREATE POLICY "Users can view their own scouting run requests"
ON public.scouting_run_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: insert is done by edge function with service role, but we allow user insert for their own records
CREATE POLICY "Users can insert their own scouting run requests"
ON public.scouting_run_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: update is done by edge function with service role
CREATE POLICY "Users can update their own scouting run requests"
ON public.scouting_run_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Add comment explaining purpose
COMMENT ON TABLE public.scouting_run_requests IS 'Idempotency table to prevent duplicate scouting jobs from multiple requests';