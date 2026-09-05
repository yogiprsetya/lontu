'use client';

import { RiBarChartBoxLine, RiCashLine, RiRedPacketLine, RiSettingsLine } from '@remixicon/react';
import {
  Sidebar,
  SidebarContent,
  // SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar';

const navigationItems = [
  { label: 'Overview', href: '/app', icon: RiBarChartBoxLine },
  { label: 'Spending', href: '/app/spending', icon: RiCashLine },
  { label: 'Budget', href: '/app/budget', icon: RiRedPacketLine },
  { label: 'Settings', href: '#settings', icon: RiSettingsLine },
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
              {navigationItems.map((item) => (
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

      {/* <SidebarFooter>
        <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
          Track it. Understand it.
        </p>
      </SidebarFooter> */}
    </Sidebar>
  );
};
