import { RiArrowUpLine, RiBarChartGroupedLine, RiCalendarLine, RiMoreLine, RiWallet3Line } from '@remixicon/react';

const metricCards = [
  { label: 'Total spending', value: 'Rp0', trend: '0%', icon: RiWallet3Line },
  { label: 'Monthly average', value: 'Rp0', trend: '0%', icon: RiBarChartGroupedLine },
  { label: 'Largest category', value: 'Rp0', trend: 'No data yet', icon: RiWallet3Line },
  { label: 'Transactions', value: '0', trend: 'This month', icon: RiCalendarLine },
];

export const OverviewMetrics = () => (
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
            <RiArrowUpLine aria-hidden="true" className="size-3 text-emerald-500" />
            {metric.trend}
            <span className="ml-1">vs last month</span>
          </p>
        </article>
      );
    })}
  </section>
);
