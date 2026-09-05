import { z } from 'zod';
import { budgetMonthSchema, budgetYearSchema, requiredInt } from './shared';

interface BudgetInput {
  categoryId: number | string;
  amount: number | string;
  year: number | string;
  month: number | string;
}

interface ValidatedBudgetInput {
  categoryId: number;
  amount: number;
  year: number;
  month: number;
}

interface BudgetUpdateInput {
  categoryId?: number | string;
  amount?: number | string;
  year?: number | string;
  month?: number | string;
}

interface ValidatedBudgetUpdateInput {
  categoryId?: number;
  amount?: number;
  year?: number;
  month?: number;
}

const budgetInputSchema = z.object({
  categoryId: requiredInt('categoryId'),
  amount: requiredInt('amount'),
  year: budgetYearSchema,
  month: budgetMonthSchema,
});

/** Parses the optional `year`/`month` query filter for the budgets collection. */
export const budgetMonthQuerySchema = z.object({
  year: budgetYearSchema,
  month: budgetMonthSchema,
});

export const validateBudgetInput = (input: BudgetInput): ValidatedBudgetInput => budgetInputSchema.parse(input);

export const validateBudgetUpdateInput = (input: BudgetUpdateInput): ValidatedBudgetUpdateInput => {
  const result: ValidatedBudgetUpdateInput = {};

  if (input.categoryId !== undefined) result.categoryId = requiredInt('categoryId').parse(input.categoryId);
  if (input.amount !== undefined) result.amount = requiredInt('amount').parse(input.amount);
  if (input.year !== undefined) result.year = budgetYearSchema.parse(input.year);
  if (input.month !== undefined) result.month = budgetMonthSchema.parse(input.month);

  if (Object.keys(result).length === 0) throw new Error('At least one field is required');
  return result;
};
