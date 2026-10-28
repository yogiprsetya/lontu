"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { inputClass } from "@/components/forms/field-styles";
import { moneyFromInput, moneyToInput } from "@/lib/money-input";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  id: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  allowNegative?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/** Integer rupiah input with thousand separators. iOS's numeric keypad has no minus key, hence the ± toggle. */
export function MoneyInput({ id, value, onChange, onBlur, allowNegative = false, invalid, describedBy }: MoneyInputProps) {
  // Remembers a sign chosen while the field is still empty.
  const [negativeWhenZero, setNegativeWhenZero] = useState(false);
  const negative = value < 0 || (value === 0 && negativeWhenZero);

  function toggleSign() {
    setNegativeWhenZero(!negative);
    onChange(-value || 0);
  }

  return (
    <div className="flex gap-2">
      {allowNegative && (
        <button
          type="button"
          onClick={toggleSign}
          aria-pressed={negative}
          aria-label="Nilai negatif"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md border text-lg font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            negative ? "border-destructive bg-destructive/10 text-destructive" : "hover:bg-muted",
          )}
        >
          ±
        </button>
      )}
      <div className="relative flex-1">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold",
            negative ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {negative ? "−Rp" : "Rp"}
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          className={cn(inputClass, "pl-14 text-lg font-bold md:text-lg", negative && "text-destructive")}
          value={moneyToInput(value)}
          onChange={(e) => onChange(moneyFromInput(e.target.value, negative))}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      </div>
    </div>
  );
}
