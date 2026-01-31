import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CostConsultingSuppliers = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y compara proveedores de servicios de agua
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Añadir Proveedor
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proveedores..." className="pl-10" />
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No hay proveedores</CardTitle>
          <CardDescription className="text-center mb-4">
            Añade proveedores para comparar ofertas y gestionar relaciones comerciales
          </CardDescription>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Proveedor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostConsultingSuppliers;
