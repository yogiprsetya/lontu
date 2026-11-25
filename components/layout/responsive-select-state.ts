import type { Select as SelectPrimitive } from "@base-ui/react/select";

type SelectOpenChange<Value, Multiple extends boolean | undefined> = NonNullable<
  SelectPrimitive.Root.Props<Value, Multiple>["onOpenChange"]
>;

export function createSelectOpenChangeHandler<Value, Multiple extends boolean | undefined>(
  controlled: boolean,
  setOpen: (open: boolean) => void,
  onOpenChange?: SelectOpenChange<Value, Multiple>,
): SelectOpenChange<Value, Multiple> {
  return (next, details) => {
    if (!controlled) setOpen(next);
    onOpenChange?.(next, details);
  };
}
