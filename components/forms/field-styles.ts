// The primitives drop to `md:text-sm`; these keep every field at 16 px or more on desktop too.
export const inputClass = "h-11 px-4 text-base font-semibold placeholder:font-normal md:text-base";
export const selectTriggerClass =
  "w-full pr-3 pl-4 text-base font-semibold data-placeholder:font-normal data-[size=default]:h-11 md:text-base";
export const selectItemClass = "min-h-11 text-base";
export const fieldMessageClass = (error: boolean) =>
  error
    ? "text-sm leading-snug font-semibold text-destructive"
    : "text-sm leading-snug text-muted-foreground";
