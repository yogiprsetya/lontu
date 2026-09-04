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

export function validateExpenseInput(input: ExpenseInput): ValidatedExpenseInput {
  if (!input.categoryName || typeof input.categoryName !== 'string' || input.categoryName.trim().length === 0) {
    throw new Error('categoryName is required');
  }
  const categoryName = input.categoryName.trim();

  const rawAmount = typeof input.amount === 'number' ? input.amount.toString() : input.amount;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    throw new Error('amount is required');
  }
  const parsed = Number(rawAmount);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
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
}

export function validateExpenseUpdateInput(input: ExpenseUpdateInput): ValidatedExpenseUpdateInput {
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
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
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
}
