export const fieldMessageClass = (error: boolean) =>
  error
    ? "text-sm leading-snug font-semibold text-destructive"
    : "text-sm leading-snug text-muted-foreground";
