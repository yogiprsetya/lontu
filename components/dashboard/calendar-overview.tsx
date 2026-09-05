import { RiCalendarLine } from '@remixicon/react';
import { initialDays } from '~/utils/times-const';

const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);

export const CalendarOverview = () => (
  <aside className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Calendar</p>
        <h2 className="text-foreground mt-1 text-lg font-semibold">September 2026</h2>
      </div>

      <RiCalendarLine aria-hidden="true" className="text-muted-foreground size-5" />
    </div>

    <div className="text-muted-foreground mb-2 grid grid-cols-7 text-center text-[10px] font-semibold">
      {initialDays.map((day, index) => (
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
      <p className="text-muted-foreground mt-1 text-xs">Add your first expense to see your rhythm here.</p>
    </div>
  </aside>
);
