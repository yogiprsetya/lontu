import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ReceiptIcon,
  SettingsIcon,
  WalletIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const dashboardItem: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon };
export const transactionsItem: NavItem = { href: "/transactions", label: "Transactions", icon: ArrowLeftRightIcon };
export const expensesItem: NavItem = { href: "/expenses", label: "Expenses", icon: ReceiptIcon };
export const budgetItem: NavItem = { href: "/budget", label: "Budget", icon: WalletIcon };
export const settingsItem: NavItem = { href: "/settings", label: "Settings", icon: SettingsIcon };

export const sidebarItems = [dashboardItem, transactionsItem, expensesItem, budgetItem, settingsItem];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
