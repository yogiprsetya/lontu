export interface ExpenseInput {
  categoryName: string;
  amount: string | number;
  note?: string;
  spentAt?: string | Date;
}

export interface ValidatedExpenseInput {
  categoryName: string;
  amount: number;
  note?: string;
  spentAt: Date;
}

export interface ExpenseUpdateInput {
  categoryName?: string;
  amount?: string | number;
  note?: string;
  spentAt?: string | Date;
}

export interface ValidatedExpenseUpdateInput {
  categoryName?: string;
  amount?: number;
  note?: string;
  spentAt?: Date;
}

interface CategoryInput {
  name: string;
  color?: string | null;
}

interface ValidatedCategoryInput {
  name: string;
  color?: string;
}

const MAX_EXPENSE_AMOUNT = 2147483647;
const CATEGORY_NAME_MAX_LENGTH = 100;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export const validateCategoryInput = (input: CategoryInput): ValidatedCategoryInput => {
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw new Error('name is required');
  }

  const name = input.name.trim();
  if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    throw new Error('name is too long');
  }

  if (input.color !== undefined && input.color !== null && !HEX_COLOR_PATTERN.test(input.color)) {
    throw new Error('color must be a hex color');
  }

  return { name, ...(input.color ? { color: input.color } : {}) };
};

export const validateExpenseInput = (input: ExpenseInput): ValidatedExpenseInput => {
  if (!input.categoryName || typeof input.categoryName !== 'string' || input.categoryName.trim().length === 0) {
    throw new Error('categoryName is required');
  }
  const categoryName = input.categoryName.trim();

  const rawAmount = typeof input.amount === 'number' ? input.amount.toString() : input.amount;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    throw new Error('amount is required');
  }
  const parsed = Number(rawAmount);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_EXPENSE_AMOUNT) {
    throw new Error('amount must be a positive integer');
  }
  const amount = parsed;

  const note = input.note === undefined || input.note === null ? undefined : String(input.note);

  let spentAt: Date;
  if (input.spentAt) {
    spentAt = new Date(input.spentAt);
    if (Number.isNaN(spentAt.getTime())) {
      throw new Error('spentAt is invalid');
    }
  } else {
    spentAt = new Date();
  }

  return { categoryName, amount, note, spentAt };
};

export const validateExpenseUpdateInput = (input: ExpenseUpdateInput): ValidatedExpenseUpdateInput => {
  const result: ValidatedExpenseUpdateInput = {};

  if (input.categoryName !== undefined) {
    if (typeof input.categoryName !== 'string' || input.categoryName.trim().length === 0) {
      throw new Error('categoryName is required');
    }
    result.categoryName = input.categoryName.trim();
  }

  if (input.amount !== undefined) {
    const rawAmount = typeof input.amount === 'number' ? input.amount.toString() : input.amount;
    if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
      throw new Error('amount is required');
    }
    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_EXPENSE_AMOUNT) {
      throw new Error('amount must be a positive integer');
    }
    result.amount = parsed;
  }

  if (input.note !== undefined && input.note !== null) {
    result.note = String(input.note);
  }

  if (input.spentAt !== undefined && input.spentAt !== null) {
    const spentAt = new Date(input.spentAt);
    if (Number.isNaN(spentAt.getTime())) {
      throw new Error('spentAt is invalid');
    }
    result.spentAt = spentAt;
  }

  return result;
};
