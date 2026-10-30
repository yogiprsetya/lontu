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
