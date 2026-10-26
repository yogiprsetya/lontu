"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddMenu } from "./add-menu";
import { isActivePath, sidebarItems } from "./nav-items";
import { useSignOut } from "./sign-out";

const itemClass =
  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

export function Sidebar() {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-6 lg:flex">
      <Link href="/dashboard" className="px-3 text-xl font-semibold tracking-tight">
        Lontu
      </Link>
      <AddMenu variant="sidebar" />
      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1">
        {sidebarItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(itemClass, active ? "bg-muted text-foreground" : "text-muted-foreground")}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button type="button" onClick={() => void signOut()} className={cn(itemClass, "text-muted-foreground")}>
        <LogOutIcon className="size-5" aria-hidden />
        Logout
      </button>
    </aside>
  );
}
