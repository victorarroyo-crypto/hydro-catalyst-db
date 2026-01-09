import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRL_OPTIONS } from '@/constants/taxonomyData';

interface TRLSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TRL_DESCRIPTIONS: Record<number, string> = {
  1: 'Principios básicos observados',
  2: 'Concepto tecnológico formulado',
  3: 'Prueba de concepto experimental',
  4: 'Validación en laboratorio',
  5: 'Validación en entorno relevante',
  6: 'Demostración en entorno relevante',
  7: 'Demostración en entorno operativo',
  8: 'Sistema completo calificado',
  9: 'Sistema probado en operación real',
};

export const TRLSelector: React.FC<TRLSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Seleccionar TRL',
  disabled = false,
}) => {
  return (
    <Select
      value={value?.toString() || ''}
      onValueChange={(val) => onChange(val ? parseInt(val) : null)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TRL_OPTIONS.map((trl) => (
          <SelectItem key={trl} value={trl.toString()}>
            <span className="font-medium">TRL {trl}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              - {TRL_DESCRIPTIONS[trl]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
