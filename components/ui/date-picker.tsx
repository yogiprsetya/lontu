'use client';

import { format } from 'date-fns';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { RiCalendar2Line } from '@remixicon/react';
import type { ComponentProps } from 'react';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: ComponentProps<typeof Calendar>['disabled'];
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            data-empty={!value}
            className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
          />
        }
      >
        {value ? format(value, 'dd MMM yyyy') : <span>{placeholder}</span>}
        <RiCalendar2Line />
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabled} />
      </PopoverContent>
    </Popover>
  );
}
