import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';
import { Loader2, FolderOpen, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ChemDocumentos() {
  const { projectId } = useParams();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['chem-documents', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/chem-consulting/projects/${projectId}/documents`);
      if (!res.ok) throw new Error('Error cargando documentos');
      const json = await res.json();
      return Array.isArray(json) ? json : (json.documents ?? json.data ?? []);
    },
    enabled: !!projectId,
  });

  if (!projectId) return null;

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FolderOpen className="w-4 h-4" />
        Documentos del Proyecto
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando documentos…
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay documentos subidos aún.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate font-medium">{doc.nombre || doc.nombre_archivo || doc.name}</span>
              {doc.created_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
