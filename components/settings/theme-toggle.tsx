"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Terang", icon: SunIcon },
  { value: "dark", label: "Gelap", icon: MoonIcon },
  { value: "system", label: "Sistem", icon: MonitorIcon },
] as const;

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; avoid marking a choice during SSR.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">Tema</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => {
          const selected = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground shadow-soft hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
