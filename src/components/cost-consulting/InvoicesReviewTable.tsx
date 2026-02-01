import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, Fragment } from "react";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name_raw: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  line_items: LineItem[] | null;
  extraction_confidence: number | null;
}

interface InvoicesReviewTableProps {
  invoices: Invoice[];
}

export function InvoicesReviewTable({ invoices }: InvoicesReviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Nº Factura</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead className="text-right">Base</TableHead>
          <TableHead className="text-right">IVA</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-center">Líneas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const hasLines = invoice.line_items && invoice.line_items.length > 0;
          const isExpanded = expandedRows.has(invoice.id);

          return (
            <Fragment key={invoice.id}>
              <TableRow 
                className={hasLines ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => hasLines && toggleRow(invoice.id)}
              >
                <TableCell className="w-8">
                  {hasLines && (
                    isExpanded ? 
                      <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {invoice.invoice_number || '-'}
                </TableCell>
                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                <TableCell>{invoice.supplier_name_raw || 'Sin nombre'}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoice.subtotal)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoice.tax_amount)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.total)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {invoice.line_items?.length || 0}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* Líneas de detalle expandibles */}
              {isExpanded && hasLines && (
                <TableRow>
                  <TableCell colSpan={8} className="bg-muted/30 p-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Líneas de detalle:</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="text-right">Precio Unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.line_items?.map((line, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{line.description}</TableCell>
                              <TableCell className="text-right">
                                {line.quantity} {line.unit}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(line.unit_price)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(line.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
