type RecurringFrequency = 'monthly' | 'yearly';

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export const getNextOccurrence = (startDate: Date, frequency: RecurringFrequency, fromDate = new Date()): Date => {
  const next = new Date(startDate);
  const sourceDay = next.getUTCDate();

  while (next <= fromDate) {
    if (frequency === 'yearly') {
      next.setUTCFullYear(next.getUTCFullYear() + 1, next.getUTCMonth(), 1);
    } else {
      next.setUTCMonth(next.getUTCMonth() + 1, 1);
    }

    next.setUTCDate(Math.min(sourceDay, daysInMonth(next.getUTCFullYear(), next.getUTCMonth())));
  }

  return next;
};

export const getRecurringPeriodKey = (date: Date, frequency: RecurringFrequency): string => {
  const year = date.getUTCFullYear();
  return frequency === 'yearly' ? String(year) : `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
