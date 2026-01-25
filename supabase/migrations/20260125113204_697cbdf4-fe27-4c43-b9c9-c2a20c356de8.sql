-- ============================================
-- Eliminar triggers obsoletos de sincronización
-- Estos triggers llamaban a sync-advisor-embeddings que intentaba
-- sincronizar a Railway endpoints que ya no existen (/api/sync/document)
-- Railway ahora escribe directamente a la BD externa
-- ============================================

-- Eliminar trigger de knowledge_documents
DROP TRIGGER IF EXISTS sync_knowledge_documents_to_advisor ON public.knowledge_documents;

-- Eliminar trigger de knowledge_chunks  
DROP TRIGGER IF EXISTS sync_knowledge_chunks_to_advisor ON public.knowledge_chunks;

-- Documentar la razón del cambio
COMMENT ON TABLE public.knowledge_documents IS 
'Documentos de conocimiento técnico. Sincronizados desde Railway via kb-process-webhook. No requiere sync de vuelta a Railway.';