-- Añadir columna scouting_job_id a scouting_queue
ALTER TABLE scouting_queue 
ADD COLUMN IF NOT EXISTS scouting_job_id text;

-- Crear índice para filtrar por sesión
CREATE INDEX IF NOT EXISTS idx_scouting_queue_job_id 
ON scouting_queue(scouting_job_id);

-- Migrar datos existentes de notes a scouting_job_id
UPDATE scouting_queue
SET scouting_job_id = substring(notes from 'Session: ([a-f0-9-]+)')
WHERE notes LIKE '%Session:%' AND scouting_job_id IS NULL;