"use client";

import { fieldMessageClass } from "@/components/forms/field-styles";
import { Checkbox } from "@/components/ui/checkbox";
import type { BudgetCategoryOption } from "@/lib/budget-format";

type Props = {
  options: BudgetCategoryOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  /** "Needs" or "Wants", for the hint when nothing is left to pick. */
  typeLabel: string;
};

const MESSAGE_ID = "budget-categories-message";

/** Checkboxes for the budget's categories; ones another budget holds stay visible but disabled. */
export function BudgetCategoryPicker({ options, value, onChange, error, typeLabel }: Props) {
  let hint: string | undefined;
  if (options.length === 0) hint = `Belum ada kategori ${typeLabel}.`;
  else if (options.every((o) => o.status === "taken"))
    hint = `Semua kategori ${typeLabel} sudah punya budget.`;
  const message = error ?? hint;

  return (
    <fieldset aria-describedby={message ? MESSAGE_ID : undefined} className="flex flex-col gap-1">
      <legend className="mb-1 text-base font-semibold">Kategori</legend>
      {/* Bounded so a long list scrolls here instead of pushing the modal's footer off screen. */}
      <div className="-mx-1 max-h-[min(16rem,40dvh)] overflow-y-auto overscroll-contain px-1">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 text-base has-disabled:text-muted-foreground"
          >
            <Checkbox
              checked={value.includes(option.id)}
              disabled={option.status === "taken"}
              aria-invalid={!!error}
              onCheckedChange={(on) =>
                onChange(on ? [...value, option.id] : value.filter((id) => id !== option.id))
              }
            />
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            {option.status === "taken" && (
              <span className="shrink-0 truncate text-sm">di {option.takenBy}</span>
            )}
          </label>
        ))}
      </div>
      {message && (
        <p id={MESSAGE_ID} className={fieldMessageClass(!!error)}>
          {message}
        </p>
      )}
    </fieldset>
  );
}
