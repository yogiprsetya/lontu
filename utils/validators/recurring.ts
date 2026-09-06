import { z } from 'zod';
import { dateSchema, noteSchema, RECURRING_FREQUENCIES, recurringFrequencySchema, requiredInt } from './shared';

type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

interface RecurringInput {
  categoryId: number | string;
  amount: number | string;
  frequency: string;
  startDate: string | Date;
  note?: string | null;
}

interface ValidatedRecurringInput {
  categoryId: number;
  amount: number;
  frequency: RecurringFrequency;
  startDate: Date;
  note?: string;
}

interface RecurringUpdateInput {
  categoryId?: number | string;
  amount?: number | string;
  frequency?: string;
  startDate?: string | Date;
  note?: string | null;
}

interface ValidatedRecurringUpdateInput {
  categoryId?: number;
  amount?: number;
  frequency?: RecurringFrequency;
  startDate?: Date;
  note?: string;
}

const recurringInputSchema = z.object({
  categoryId: requiredInt('categoryId'),
  amount: requiredInt('amount'),
  frequency: recurringFrequencySchema,
  startDate: dateSchema('startDate'),
  note: noteSchema,
});

export const validateRecurringInput = (input: RecurringInput): ValidatedRecurringInput =>
  recurringInputSchema.parse(input);

export const recurringInputFormSchema = recurringInputSchema.refine(
  (data) => {
    const start = new Date(data.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start >= today;
  },
  { message: 'Start date cannot be in the past', path: ['startDate'] }
);

export type RecurringFormValues = z.infer<typeof recurringInputFormSchema>;
export type RecurringFormInput = z.input<typeof recurringInputFormSchema>;

export const validateRecurringUpdateInput = (input: RecurringUpdateInput): ValidatedRecurringUpdateInput => {
  const result: ValidatedRecurringUpdateInput = {};

  if (input.categoryId !== undefined) result.categoryId = requiredInt('categoryId').parse(input.categoryId);
  if (input.amount !== undefined) result.amount = requiredInt('amount').parse(input.amount);
  if (input.frequency !== undefined) result.frequency = recurringFrequencySchema.parse(input.frequency);
  if (input.startDate !== undefined) result.startDate = dateSchema('startDate').parse(input.startDate);
  if (input.note !== undefined && input.note !== null) result.note = noteSchema.parse(input.note);

  if (Object.keys(result).length === 0) throw new Error('At least one recurring field is required');
  return result;
};
