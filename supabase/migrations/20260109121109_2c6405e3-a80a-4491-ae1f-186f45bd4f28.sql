-- Add structured tracking columns to scouting_sessions
ALTER TABLE scouting_sessions
ADD COLUMN IF NOT EXISTS current_activity text,
ADD COLUMN IF NOT EXISTS current_site text,
ADD COLUMN IF NOT EXISTS phase_details jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS activity_timeline jsonb DEFAULT '[]';