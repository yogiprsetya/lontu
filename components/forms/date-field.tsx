"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { id as idLocale } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateFromValue, formatLongDate, todayInJakarta, valueFromDate } from "@/lib/date";

type DateFieldProps = {
  id: string;
  /** `YYYY-MM-DD`. */
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  invalid?: boolean;
  describedBy?: string;
  ref?: React.Ref<HTMLButtonElement>;
};

/** A button showing the date that opens the Calendar in a popover. */
export function DateField({
  id,
  value,
  onChange,
  min,
  max,
  invalid,
  describedBy,
  ref,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = dateFromValue(value);
  const first = dateFromValue(min);
  const last = dateFromValue(max);

  function pick(date: Date | undefined) {
    if (date) onChange(valueFromDate(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={ref}
        id={id}
        render={<Button variant="field" />}
        className="w-full"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        {selected ? formatLongDate(value) : "Pilih tanggal"}
        <CalendarIcon aria-hidden className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          locale={idLocale}
          captionLayout="dropdown"
          selected={selected}
          onSelect={pick}
          defaultMonth={selected}
          startMonth={first}
          endMonth={last}
          disabled={[first && { before: first }, last && { after: last }].filter((m) => !!m)}
          today={dateFromValue(todayInJakarta())}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
