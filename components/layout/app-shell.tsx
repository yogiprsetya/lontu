import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { DashboardSidebar } from './dashboard-sidebar';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps): ReactNode => {
  return (
    <SidebarProvider>
      <DashboardSidebar />

      <SidebarInset>
        <main className="flex min-h-svh flex-col bg-[#f3f8fb] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>

          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
