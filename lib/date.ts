const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today as `YYYY-MM-DD` in Asia/Jakarta. */
export function todayInJakarta(now: Date = new Date()): string {
  return jakartaDate.format(now);
}

const jakartaHour = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  hour: "numeric",
  hourCycle: "h23",
});

/** Indonesian time-of-day greeting for the current hour in Asia/Jakarta. */
export function greetingInJakarta(now: Date = new Date()): string {
  const hour = Number(jakartaHour.format(now));
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A `YYYY-MM-DD` value as local midnight, the form the Calendar picks days in. */
export function dateFromValue(value: string): Date | undefined {
  const match = isoDate.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function valueFromDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Read as UTC so the calendar day stays fixed in any local zone.
const longDate = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatLongDate(value: string): string {
  return longDate.format(new Date(`${value}T00:00:00Z`));
}
