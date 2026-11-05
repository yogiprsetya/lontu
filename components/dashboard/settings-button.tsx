import Link from "next/link";
import { settingsItem } from "@/components/layout/nav-items";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Below lg the bottom nav has no Settings entry; at lg the sidebar footer has it. */
export function SettingsButton() {
  return (
    <Link
      href={settingsItem.href}
      aria-label={settingsItem.label}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "size-11 shrink-0 rounded-xl bg-card shadow-soft hover:bg-sunny hover:text-sunny-foreground lg:hidden",
      )}
    >
      <settingsItem.icon aria-hidden />
    </Link>
  );
}
