import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Contract {
  id: string;
  supplier_name_raw: string | null;
  contract_number: string | null;
  total_annual_value: number | null;
  start_date: string | null;
  end_date: string | null;
  auto_renewal: boolean | null;
  payment_days: number | null;
  extraction_confidence: number | null;
}

interface ContractsReviewTableProps {
  contracts: Contract[];
}

export function ContractsReviewTable({ contracts }: ContractsReviewTableProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null;
    if (confidence >= 0.9) return <Badge className="bg-green-100 text-green-800">Alta</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-yellow-100 text-yellow-800">Media</Badge>;
    return <Badge className="bg-red-100 text-red-800">Baja</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Proveedor</TableHead>
          <TableHead>Nº Contrato</TableHead>
          <TableHead className="text-right">Valor Anual</TableHead>
          <TableHead>Vigencia</TableHead>
          <TableHead>Renovación</TableHead>
          <TableHead>Pago</TableHead>
          <TableHead>Confianza</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">
              {contract.supplier_name_raw || 'Sin nombre'}
            </TableCell>
            <TableCell>{contract.contract_number || '-'}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(contract.total_annual_value)}
            </TableCell>
            <TableCell>
              {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
            </TableCell>
            <TableCell>
              {contract.auto_renewal ? (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Automática
                </Badge>
              ) : (
                'No'
              )}
            </TableCell>
            <TableCell>
              {contract.payment_days ? `${contract.payment_days} días` : '-'}
            </TableCell>
            <TableCell>
              {getConfidenceBadge(contract.extraction_confidence)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
