import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

export default function ChemPlaceholder({ title, description }: Props) {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground">{description || 'Esta sección se implementará próximamente.'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
