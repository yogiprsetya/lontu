"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EllipsisIcon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FabAddMenu } from "./add-menu";
import {
  budgetItem,
  dashboardItem,
  isActivePath,
  moreItems,
  type NavItem,
  transactionsItem,
} from "./nav-items";
import { useSignOut } from "./sign-out";

const slotClass =
  "group flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const pillClass = "flex h-7 w-12 items-center justify-center rounded-full transition-colors";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(slotClass, active ? "font-extrabold text-foreground" : "text-muted-foreground")}
    >
      <NavPill icon={item.icon} active={active} />
      {item.label}
    </Link>
  );
}

function NavPill({ icon: Icon, active }: { icon: NavItem["icon"]; active: boolean }) {
  return (
    <span
      className={cn(pillClass, active ? "bg-sunny text-sunny-foreground" : "group-hover:bg-muted")}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** The More slot: looks like a nav link, opens the menu. */
function MoreSlot({ active, ...props }: React.ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(slotClass, active ? "font-extrabold text-foreground" : "text-muted-foreground")}
    >
      <NavPill icon={EllipsisIcon} active={active} />
      More
    </button>
  );
}

export function BottomNav() {
  const signOut = useSignOut();
  const pathname = usePathname();
  const moreActive = moreItems.some((i) => isActivePath(pathname, i.href));

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_-18px_var(--shadow-color)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center px-2 pt-1.5 pb-1">
        <NavLink item={dashboardItem} pathname={pathname} />
        <NavLink item={transactionsItem} pathname={pathname} />
        <div className="flex w-14 shrink-0 justify-center">
          <FabAddMenu />
        </div>
        <NavLink item={budgetItem} pathname={pathname} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<MoreSlot active={moreActive} />} />
          <DropdownMenuContent side="top" align="end" sideOffset={8} className="min-w-52">
            {moreItems.map((item) => (
              <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOutIcon className="size-5" aria-hidden />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
