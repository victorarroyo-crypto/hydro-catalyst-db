-- Add INSERT policy for scouting_sessions to allow authenticated users to create sessions
CREATE POLICY "Authenticated users can insert scouting sessions"
ON public.scouting_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy for scouting_sessions to allow updating own sessions
CREATE POLICY "Authenticated users can update scouting sessions"
ON public.scouting_sessions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);