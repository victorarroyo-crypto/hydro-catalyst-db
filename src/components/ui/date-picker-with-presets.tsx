import * as React from "react";
import { format, setMonth, setYear, getMonth, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface DatePickerWithPresetsProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  className?: string;
}

export function DatePickerWithPresets({
  date,
  onDateChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  fromYear = 2020,
  toYear = new Date().getFullYear() + 1,
  className,
}: DatePickerWithPresetsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(date || new Date());

  // Generate year options
  const years = React.useMemo(() => {
    const result: number[] = [];
    for (let y = toYear; y >= fromYear; y--) {
      result.push(y);
    }
    return result;
  }, [fromYear, toYear]);

  const handleMonthChange = (monthStr: string) => {
    const newMonth = parseInt(monthStr, 10);
    setCalendarMonth(setMonth(calendarMonth, newMonth));
  };

  const handleYearChange = (yearStr: string) => {
    const newYear = parseInt(yearStr, 10);
    setCalendarMonth(setYear(calendarMonth, newYear));
  };

  const handlePrevMonth = () => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarMonth(newDate);
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    if (selectedDate) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        sideOffset={4}
      >
        <div className="p-3 space-y-3">
          {/* Quick Month/Year Selectors */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select
              value={getMonth(calendarMonth).toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={getYear(calendarMonth).toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="h-8 w-[80px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            className="p-0 pointer-events-auto"
            classNames={{
              caption: "hidden", // Hide default caption since we have custom controls
              nav: "hidden", // Hide default nav
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
