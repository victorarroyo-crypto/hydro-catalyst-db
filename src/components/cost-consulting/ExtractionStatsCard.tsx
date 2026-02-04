import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Receipt, Building2, FileSearch, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExtractionStatus {
  contracts_found?: number;
  invoices_found?: number;
  suppliers_found?: number;
  errors?: string[];
}

interface Project {
  extraction_status?: ExtractionStatus | null;
  updated_at?: string;
}

interface ExtractionStatsCardProps {
  project: Project;
}

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Fecha desconocida';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
  } catch {
    return 'Fecha desconocida';
  }
};

export const ExtractionStatsCard: React.FC<ExtractionStatsCardProps> = ({ project }) => {
  const stats = project.extraction_status || {};
  const contractsFound = stats.contracts_found || 0;
  const invoicesFound = stats.invoices_found || 0;
  const suppliersFound = stats.suppliers_found || 0;
  const errors = stats.errors || [];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSearch className="h-4 w-4" />
          Datos Extraídos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <FileText className="h-6 w-6 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {contractsFound}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Contratos</p>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Receipt className="h-6 w-6 mx-auto text-green-600 dark:text-green-400 mb-1" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {invoicesFound}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">Facturas</p>
          </div>

          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <Building2 className="h-6 w-6 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {suppliersFound}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Proveedores</p>
          </div>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Errores de extracción</AlertTitle>
            <AlertDescription>
              <ul className="text-xs mt-1 space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Extraído: {formatRelativeTime(project.updated_at)}
        </p>
      </CardContent>
    </Card>
  );
};

export default ExtractionStatsCard;
