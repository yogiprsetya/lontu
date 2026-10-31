"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, WalletIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarAddMenu } from "./add-menu";
import { isActivePath, sidebarItems } from "./nav-items";
import { useSignOut } from "./sign-out";

const itemClass =
  "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

export function Sidebar() {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-sidebar px-4 py-6 shadow-soft lg:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-2 font-heading text-2xl font-extrabold tracking-tight"
      >
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-xl bg-sunny text-sunny-foreground"
        >
          <WalletIcon className="size-5" />
        </span>
        Lontu
      </Link>
      <SidebarAddMenu />
      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1">
        {sidebarItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                itemClass,
                active
                  ? "bg-sunny font-bold text-sunny-foreground hover:bg-sunny"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => void signOut()}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <LogOutIcon className="size-5" aria-hidden />
        Logout
      </button>
    </aside>
  );
}
