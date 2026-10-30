import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
};

/** Label, control and message. Give the control `id`, `aria-invalid` and `aria-describedby={`${id}-message`}`. */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      {children}
      {(error || hint) && (
        <p
          id={`${id}-message`}
          className={
            error
              ? "text-sm leading-snug font-semibold text-destructive"
              : "text-sm leading-snug text-muted-foreground"
          }
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
