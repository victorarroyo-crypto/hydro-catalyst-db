-- Add scouting_job_id column to scouting_queue for session filtering
-- This allows filtering technologies by the scouting session that discovered them

ALTER TABLE scouting_queue
ADD COLUMN IF NOT EXISTS scouting_job_id text;

-- Create index for efficient filtering by session
CREATE INDEX IF NOT EXISTS idx_scouting_queue_job_id
ON scouting_queue(scouting_job_id);

-- Add comment for documentation
COMMENT ON COLUMN scouting_queue.scouting_job_id IS 'Links to scouting_sessions.session_id - the scouting job that discovered this technology';
