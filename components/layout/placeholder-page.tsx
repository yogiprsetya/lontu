import type { LucideIcon } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden />
        <p className="max-w-xs font-semibold text-muted-foreground">{description}</p>
      </div>
      {children}
    </main>
  );
}
