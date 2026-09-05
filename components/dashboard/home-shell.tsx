import type { ReactNode } from 'react';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiBarChartGroupedLine,
  RiCalendarLine,
  RiDownloadLine,
  RiMoreLine,
  RiWallet3Line,
} from '@remixicon/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ExpenseDashboard from '../expense/expense-dashboard';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import DashboardSidebar from './dashboard-sidebar';

interface HomeShellProps {
  user: {
    name: string;
    image: string | null;
  };
}

const metricCards = [
  { label: 'Total spending', value: 'Rp0', trend: '0%', positive: true, icon: RiWallet3Line },
  { label: 'Monthly average', value: 'Rp0', trend: '0%', positive: true, icon: RiBarChartGroupedLine },
  { label: 'Largest category', value: 'Rp0', trend: 'No data yet', positive: true, icon: RiWallet3Line },
  { label: 'Transactions', value: '0', trend: 'This month', positive: true, icon: RiCalendarLine },
];

const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);
const chartBars = [22, 34, 28, 46, 38, 62, 58, 42, 28, 36, 48, 30];

const HomeShell = ({ user }: HomeShellProps): ReactNode => {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <main className="flex min-h-svh flex-col bg-[#f3f8fb] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="mx-auto mb-6 flex w-full max-w-330 items-center justify-between lg:mb-7">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <div>
                <p className="text-muted-foreground text-xs font-medium sm:text-sm">{today}</p>
                <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Good morning</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="bg-card text-foreground hidden h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium shadow-sm sm:flex"
              >
                <RiCalendarLine aria-hidden="true" className="size-4" />
                September 2026
              </button>
              <button
                type="button"
                aria-label="Export report"
                className="bg-card text-foreground hidden size-9 items-center justify-center rounded-lg border shadow-sm sm:flex"
              >
                <RiDownloadLine aria-hidden="true" className="size-4" />
              </button>
              <div className="bg-primary flex size-10 items-center justify-center rounded-full text-sm font-semibold">
                {user.image ? (
                  <Avatar>
                    <AvatarImage src={user.image} alt={user.name} width={40} height={40} />
                    <AvatarFallback>US</AvatarFallback>
                  </Avatar>
                ) : (
                  initials
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-330">
            <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric, index) => {
                const Icon = metric.icon;

                return (
                  <article
                    key={metric.label}
                    className={`bg-card rounded-xl border p-4 shadow-sm ${index === 0 ? 'border-primary/40 bg-primary/80' : ''}`}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`${index === 0 ? 'bg-primary-foreground/20' : 'bg-muted'} flex size-7 items-center justify-center rounded-lg`}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span className="text-sm font-medium">{metric.label}</span>
                      </div>
                      <RiMoreLine aria-hidden="true" className="text-muted-foreground size-4" />
                    </div>
                    <p className="text-foreground text-2xl font-semibold tracking-tight">{metric.value}</p>
                    <p className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
                      {metric.positive && <RiArrowUpLine aria-hidden="true" className="size-3 text-emerald-500" />}
                      {metric.trend}
                      <span className="ml-1">vs last month</span>
                    </p>
                  </article>
                );
              })}
            </section>

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
              <section className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Spending overview
                    </p>
                    <h2 className="text-foreground mt-1 text-lg font-semibold">Monthly activity</h2>
                  </div>
                  <button
                    type="button"
                    className="bg-muted text-muted-foreground flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  >
                    July - September <RiMoreLine aria-hidden="true" className="size-3" />
                  </button>
                </div>
                <div className="border-border/70 grid grid-cols-[32px_1fr] gap-3 border-b pb-3">
                  <div className="text-muted-foreground flex h-48 flex-col justify-between text-[10px]">
                    <span>Rp50k</span>
                    <span>Rp40k</span>
                    <span>Rp30k</span>
                    <span>Rp20k</span>
                    <span>Rp10k</span>
                    <span>Rp0</span>
                  </div>
                  <div className="relative flex h-48 items-end justify-between gap-1 border-b border-dashed bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_38px,rgba(148,163,184,.18)_39px)] px-1">
                    {chartBars.map((height, index) => (
                      <div
                        key={index}
                        className="bg-primary/80 hover:bg-primary w-full max-w-8 rounded-t-lg transition-colors"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-muted-foreground ml-11 flex justify-between pt-2 text-[10px]">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
              </section>

              <aside className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Calendar</p>
                    <h2 className="text-foreground mt-1 text-lg font-semibold">September 2026</h2>
                  </div>
                  <RiCalendarLine aria-hidden="true" className="text-muted-foreground size-5" />
                </div>
                <div className="text-muted-foreground mb-2 grid grid-cols-7 text-center text-[10px] font-semibold">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                  {calendarDays.map((day) => (
                    <span
                      key={day}
                      className={`${day === 5 ? 'bg-primary text-primary-foreground' : day === 20 ? 'bg-foreground text-background' : 'text-foreground'} mx-auto flex size-7 items-center justify-center rounded-full`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <div className="border-border/70 mt-6 border-t pt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="bg-primary size-2 rounded-full" />
                    <h3 className="text-sm font-semibold">Activity</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">No spending activity yet.</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Add your first expense to see your rhythm here.
                  </p>
                </div>
              </aside>
            </div>

            <section className="bg-card mt-5 rounded-xl border p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Manage</p>
                  <h2 className="text-foreground mt-1 text-lg font-semibold">Add and review expenses</h2>
                </div>
                <RiArrowDownLine aria-hidden="true" className="text-muted-foreground size-5" />
              </div>
              <ExpenseDashboard />
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default HomeShell;
