"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Each area of the app gets its own pastel hill behind the content, like chapters in a notebook.
const WAVES: [prefix: string, color: string][] = [
  ["/transactions", "text-sky"],
  ["/expenses", "text-sky"],
  ["/add/income", "text-mint"],
  ["/add/saving", "text-lilac"],
  ["/add/transfer", "text-sky"],
  ["/budget", "text-lilac"],
  ["/settings", "text-mint"],
  ["/recurring", "text-sky"],
];

export function PageWave() {
  const pathname = usePathname();
  const color = WAVES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "text-peach";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-36 -z-[1] h-[40rem] opacity-60 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
        color,
      )}
    >
      <svg
        viewBox="0 0 400 48"
        preserveAspectRatio="none"
        className="block h-12 w-full fill-current"
      >
        <path d="M0 30 C 90 -6, 190 4, 270 20 S 380 34, 400 12 L 400 48 L 0 48 Z" />
      </svg>
      <div className="-mt-px h-full bg-current" />
    </div>
  );
}
