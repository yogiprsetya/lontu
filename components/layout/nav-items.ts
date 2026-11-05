import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ReceiptIcon,
  RepeatIcon,
  SettingsIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const dashboardItem: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboardIcon,
};
export const transactionsItem: NavItem = {
  href: "/transactions",
  label: "Transactions",
  icon: ArrowLeftRightIcon,
};
export const expensesItem: NavItem = { href: "/expenses", label: "Expenses", icon: ReceiptIcon };
export const budgetItem: NavItem = { href: "/budget", label: "Budget", icon: WalletIcon };
export const recurringItem: NavItem = { href: "/recurring", label: "Recurring", icon: RepeatIcon };
export const netWorthItem: NavItem = {
  href: "/net-worth",
  label: "Net Worth",
  icon: TrendingUpIcon,
};
/** Account-level, so it lives in the sidebar footer and the dashboard header, not the nav lists. */
export const settingsItem: NavItem = { href: "/settings", label: "Settings", icon: SettingsIcon };

export const sidebarItems = [
  dashboardItem,
  transactionsItem,
  expensesItem,
  budgetItem,
  recurringItem,
  netWorthItem,
];

/** Sections without a bottom-nav slot of their own. */
export const moreItems = [expensesItem, recurringItem, netWorthItem];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
