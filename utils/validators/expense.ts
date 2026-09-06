import { z } from 'zod';
import { noteSchema, requiredInt, spentAtSchema } from './shared';

interface ExpenseInput {
  categoryName: string;
  amount: string | number;
  note?: string;
  spentAt?: string | Date;
}

interface ValidatedExpenseInput {
  categoryName: string;
  amount: number;
  note?: string;
  spentAt: Date;
}

interface ExpenseUpdateInput {
  categoryName?: string;
  amount?: string | number;
  note?: string;
  spentAt?: string | Date;
}

interface ValidatedExpenseUpdateInput {
  categoryName?: string;
  amount?: number;
  note?: string;
  spentAt?: Date;
}

export const expenseCategoryNameSchema = z
  .string({
    required_error: 'categoryName is required',
    invalid_type_error: 'categoryName is required',
    message: 'categoryName is required',
  })
  .trim()
  .min(1, 'categoryName is required');

const expenseInputSchema = z.object({
  categoryName: expenseCategoryNameSchema,
  amount: requiredInt('amount'),
  note: noteSchema,
  spentAt: spentAtSchema.optional().transform((spentAt) => spentAt ?? new Date()),
});

export const expenseInputFormSchema = z.object({
  categoryName: expenseCategoryNameSchema,
  amount: requiredInt('amount'),
  note: noteSchema,
  spentAt: spentAtSchema.optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseInputFormSchema>;
export type ExpenseFormInput = z.input<typeof expenseInputFormSchema>;

export const validateExpenseInput = (input: ExpenseInput): ValidatedExpenseInput =>
  expenseInputSchema.parse(input);

export const validateExpenseUpdateInput = (input: ExpenseUpdateInput): ValidatedExpenseUpdateInput => {
  const result: ValidatedExpenseUpdateInput = {};

  if (input.categoryName !== undefined) {
    result.categoryName = expenseCategoryNameSchema.parse(input.categoryName);
  }
  if (input.amount !== undefined) result.amount = requiredInt('amount').parse(input.amount);
  if (input.note !== undefined && input.note !== null) result.note = noteSchema.parse(input.note);
  if (input.spentAt !== undefined && input.spentAt !== null) result.spentAt = spentAtSchema.parse(input.spentAt);

  return result;
};
