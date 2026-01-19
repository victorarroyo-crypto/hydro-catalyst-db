import React from 'react';
import { Card } from '@/components/ui/card';
import { Factory, Shirt, FlaskConical, Car, FileText, Wheat, Wine, Pill, Trees } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Template {
  sector_id: string;
  sector_name: string;
  sector_name_es: string;
  description_es: string;
  recommended_documents?: string[];
}

interface TemplateSelectorCardProps {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}

const sectorIcons: Record<string, React.ElementType> = {
  food: Wheat,
  alimentario: Wheat,
  beverage: Wine,
  bebidas: Wine,
  textile: Shirt,
  textil: Shirt,
  chemical: FlaskConical,
  quimico: FlaskConical,
  pharmaceutical: Pill,
  farmaceutico: Pill,
  paper: Trees,
  papelero: Trees,
  metalurgico: Factory,
  automotive: Car,
  automotriz: Car,
  default: FileText,
};

const getSectorIcon = (sectorId: string): React.ElementType => {
  const normalizedId = sectorId.toLowerCase().replace(/[áéíóú]/g, (char) => {
    const map: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
    return map[char] || char;
  });
  
  for (const [key, icon] of Object.entries(sectorIcons)) {
    if (normalizedId.includes(key)) {
      return icon;
    }
  }
  return sectorIcons.default;
};

const TemplateSelectorCard: React.FC<TemplateSelectorCardProps> = ({
  template,
  selected,
  onSelect,
}) => {
  const Icon = getSectorIcon(template.sector_id);

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer p-4 transition-all duration-200 hover:shadow-md",
        "border-2",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className={cn(
            "p-3 rounded-full transition-colors",
            selected
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className={cn(
            "font-semibold text-sm",
            selected ? "text-primary" : "text-foreground"
          )}>
            {template.sector_name_es}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description_es}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default TemplateSelectorCard;
