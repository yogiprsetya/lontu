import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  mint: "bg-mint text-mint-foreground",
  peach: "bg-peach text-peach-foreground",
  lilac: "bg-lilac text-lilac-foreground",
  sky: "bg-sky text-sky-foreground",
  sunny: "bg-sunny text-sunny-foreground",
} as const;

/** Card heading with a pastel icon chip; see DESIGN.md. */
export function SectionTitle({
  id,
  icon: Icon,
  tone,
  children,
}: {
  id: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 font-heading text-lg font-bold">
      <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
        <Icon className="size-[18px]" />
      </span>
      {children}
    </h2>
  );
}
