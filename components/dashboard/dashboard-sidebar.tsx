'use client';

import { RiAddLine, RiBarChartBoxLine, RiHistoryLine, RiSettingsLine } from '@remixicon/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar';

const navigationItems = [
  { label: 'Overview', href: '/', icon: RiBarChartBoxLine },
  { label: 'Add expense', href: '#add-expense', icon: RiAddLine },
  { label: 'History', href: '#history', icon: RiHistoryLine },
  { label: 'Settings', href: '#settings', icon: RiSettingsLine },
];

const DashboardSidebar = () => {
  return (
    <Sidebar collapsible="icon" variant="inset" className="[--sidebar-width:13rem]">
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
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton render={<a href={item.href} />} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
          Track it. Understand it.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
