-- Marcar como "failed" los documentos que llevan >30 min en "processing"
UPDATE knowledge_documents 
SET status = 'failed', 
    description = COALESCE(description, '') || ' [Auto: Procesamiento agotado después de 30 minutos]',
    updated_at = NOW()
WHERE status = 'processing' 
AND updated_at < NOW() - INTERVAL '30 minutes';

-- Marcar como "failed" los documentos con status "processed" pero 0 chunks
UPDATE knowledge_documents 
SET status = 'failed',
    description = COALESCE(description, '') || ' [Auto: Procesado sin chunks - requiere reproceso]',
    updated_at = NOW()
WHERE status = 'processed' 
AND (chunk_count = 0 OR chunk_count IS NULL);