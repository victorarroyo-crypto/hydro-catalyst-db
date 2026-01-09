import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_OPTIONS, ESTADO_SEGUIMIENTO_OPTIONS } from '@/constants/taxonomyData';

interface StatusSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  type?: 'status' | 'estado_seguimiento';
  placeholder?: string;
  disabled?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  value,
  onChange,
  type = 'status',
  placeholder,
  disabled = false,
}) => {
  const options = type === 'status' ? STATUS_OPTIONS : ESTADO_SEGUIMIENTO_OPTIONS;
  const defaultPlaceholder = type === 'status' ? 'Seleccionar estado' : 'Estado del seguimiento';

  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder || defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
