-- Crear bucket público para documentos de cost consulting
INSERT INTO storage.buckets (id, name, public)
VALUES ('cost-documents', 'cost-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Usuarios autenticados pueden subir
CREATE POLICY "Authenticated users can upload cost documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cost-documents');

-- Política: Lectura pública (para descargar desde modales)
CREATE POLICY "Public can read cost documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cost-documents');

-- Política: Usuarios autenticados pueden borrar sus documentos
CREATE POLICY "Authenticated users can delete cost documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cost-documents');