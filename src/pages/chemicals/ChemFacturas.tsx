import React from 'react';
import { useParams } from 'react-router-dom';
import { ChemInvoicesTab } from '@/components/chemicals/invoices';

export default function ChemFacturas() {
  const { projectId } = useParams();
  if (!projectId) return null;
  return <ChemInvoicesTab projectId={projectId} />;
}
