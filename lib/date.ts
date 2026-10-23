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
