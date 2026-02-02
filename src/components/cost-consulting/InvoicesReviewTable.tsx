import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, Fragment, useMemo } from "react";
import { Button } from "@/components/ui/button";

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

type SortField = 'invoice_number' | 'invoice_date' | 'supplier_name_raw' | 'subtotal' | 'tax_amount' | 'total' | 'line_items';
type SortDirection = 'asc' | 'desc' | null;

export function InvoicesReviewTable({ invoices }: InvoicesReviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortField || !sortDirection) return invoices;

    return [...invoices].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortField) {
        case 'invoice_number':
          aValue = a.invoice_number || '';
          bValue = b.invoice_number || '';
          break;
        case 'invoice_date':
          aValue = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
          bValue = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
          break;
        case 'supplier_name_raw':
          aValue = (a.supplier_name_raw || '').toLowerCase();
          bValue = (b.supplier_name_raw || '').toLowerCase();
          break;
        case 'subtotal':
          aValue = a.subtotal ?? 0;
          bValue = b.subtotal ?? 0;
          break;
        case 'tax_amount':
          aValue = a.tax_amount ?? 0;
          bValue = b.tax_amount ?? 0;
          break;
        case 'total':
          aValue = a.total ?? 0;
          bValue = b.total ?? 0;
          break;
        case 'line_items':
          aValue = a.line_items?.length ?? 0;
          bValue = b.line_items?.length ?? 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, sortField, sortDirection]);

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

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isActive = sortField === field;
    return (
      <TableHead className={className}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -ml-3 font-medium hover:bg-transparent"
          onClick={() => handleSort(field)}
        >
          {children}
          {isActive && sortDirection === 'asc' && <ArrowUp className="ml-1 h-3 w-3" />}
          {isActive && sortDirection === 'desc' && <ArrowDown className="ml-1 h-3 w-3" />}
          {!isActive && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
        </Button>
      </TableHead>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <SortableHeader field="invoice_number">Nº Factura</SortableHeader>
          <SortableHeader field="invoice_date">Fecha</SortableHeader>
          <SortableHeader field="supplier_name_raw">Proveedor</SortableHeader>
          <SortableHeader field="subtotal" className="text-right">Base</SortableHeader>
          <SortableHeader field="tax_amount" className="text-right">IVA</SortableHeader>
          <SortableHeader field="total" className="text-right">Total</SortableHeader>
          <SortableHeader field="line_items" className="text-center">Líneas</SortableHeader>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedInvoices.map((invoice) => {
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
