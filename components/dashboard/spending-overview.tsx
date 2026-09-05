import { RiMoreLine } from '@remixicon/react';
import { months } from '~/utils/times-const';

const chartBars = [22, 34, 28, 46, 38, 62, 58, 42, 28, 36, 48, 30];

export const SpendingOverview = () => (
  <section className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Spending overview</p>
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
        {['Rp50k', 'Rp40k', 'Rp30k', 'Rp20k', 'Rp10k', 'Rp0'].map((value) => (
          <span key={value}>{value}</span>
        ))}
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
      {months.map((month) => (
        <span key={month}>{month}</span>
      ))}
    </div>
  </section>
);
