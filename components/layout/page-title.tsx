import { cn } from "@/lib/utils";

/** The page's h1; see DESIGN.md. */
export function PageTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h1 className={cn("font-heading text-3xl font-extrabold tracking-tight", className)}>{children}</h1>;
}
