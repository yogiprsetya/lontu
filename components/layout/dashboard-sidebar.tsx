'use client';

import {
  RiBarChartBoxLine,
  RiCashLine,
  RiRedPacketLine,
  RiRefund2Line,
  RiShoppingBasketLine,
} from '@remixicon/react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar';

const menuItems = [
  { label: 'Overview', href: '/app', icon: RiBarChartBoxLine },
  { label: 'Spending', href: '/app/spending', icon: RiCashLine },
];

const planningItems = [
  { label: 'Budget', href: '/app/budget', icon: RiRedPacketLine },
  { label: 'Categories', href: '/app/categories', icon: RiShoppingBasketLine },
  { label: 'Recurring', href: '/app/recurring', icon: RiRefund2Line },
];

export const DashboardSidebar = () => {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="p-4 pb-6">
        <div className="flex items-center gap-2 px-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            L
          </div>
          <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">Lontu</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    render={<a href={item.href} className="font-semibold" />}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Planning</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {planningItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    render={<a href={item.href} className="font-semibold" />}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
