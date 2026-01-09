import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAISES } from '@/constants/taxonomyData';

interface CountrySelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  placeholder = 'Seleccionar país',
  disabled = false,
}) => {
  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {PAISES.map((pais) => (
          <SelectItem key={pais} value={pais}>
            {pais}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
