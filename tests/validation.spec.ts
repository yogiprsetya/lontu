import assert from 'node:assert/strict';
import test from 'node:test';

const throwsWith = (fn: () => unknown, pattern: RegExp) => assert.throws(fn, pattern);

test('budget schema rejects missing, non-numeric, and out-of-range fields with field-scoped messages', async () => {
  const { validateBudgetInput } = await import('../utils/validators');

  throwsWith(() => validateBudgetInput({} as never), /categoryId/);
  throwsWith(() => validateBudgetInput({ categoryId: 'abc', amount: 1, year: 2026, month: 9 }), /categoryId/);
  throwsWith(() => validateBudgetInput({ categoryId: 1, amount: 2147483648, year: 2026, month: 9 }), /amount/);
  throwsWith(() => validateBudgetInput({ categoryId: 1, amount: 1, year: 1969, month: 9 }), /year is invalid/);
  throwsWith(() => validateBudgetInput({ categoryId: 1, amount: 1, year: 2026, month: 13 }), /month is invalid/);
});

test('budget schema coerces string fields into integers', async () => {
  const { validateBudgetInput } = await import('../utils/validators');

  assert.deepEqual(validateBudgetInput({ categoryId: '4', amount: '250000', year: '2026', month: '9' }), {
    categoryId: 4,
    amount: 250000,
    year: 2026,
    month: 9,
  });
});

test('budget update schema requires at least one field', async () => {
  const { validateBudgetUpdateInput } = await import('../utils/validators');

  throwsWith(() => validateBudgetUpdateInput({}), /At least one field is required/);
  assert.deepEqual(validateBudgetUpdateInput({ month: '12' }), { month: 12 });
});

test('category schema requires a trimmed name and accepts hex colors only', async () => {
  const { validateCategoryInput } = await import('../utils/validators');

  throwsWith(() => validateCategoryInput({ name: 42 } as never), /name is required/);
  throwsWith(() => validateCategoryInput({ name: '   ' }), /name is required/);
  throwsWith(() => validateCategoryInput({ name: 'Bills', color: 'blue' }), /color/);
  assert.deepEqual(validateCategoryInput({ name: ' Groceries ' }), { name: 'Groceries' });
});

test('expense schema rejects invalid amounts, coerces strings, and defaults spentAt', async () => {
  const { validateExpenseInput } = await import('../utils/validators');

  throwsWith(() => validateExpenseInput({ categoryName: 'Food', amount: '' }), /amount/);
  throwsWith(() => validateExpenseInput({ categoryName: 'Food', amount: 2147483648 }), /amount/);
  throwsWith(() => validateExpenseInput({ categoryName: '  ' } as never), /categoryName/);
  throwsWith(() => validateExpenseInput({ categoryName: 'Food', amount: 1, spentAt: 'not-a-date' }), /spentAt/);

  const valid = validateExpenseInput({ categoryName: 'Food', amount: '25000', note: 'Lunch' });
  assert.equal(valid.amount, 25000);
  assert.equal(valid.note, 'Lunch');
  assert.ok(valid.spentAt instanceof Date, 'spentAt defaults to a Date');
});

test('expense update schema skips null note and spentAt but validates present fields', async () => {
  const { validateExpenseUpdateInput } = await import('../utils/validators');

  assert.deepEqual(validateExpenseUpdateInput({ note: null, spentAt: null } as never), {});
  throwsWith(() => validateExpenseUpdateInput({ amount: null } as never), /amount/);
  assert.deepEqual(validateExpenseUpdateInput({ amount: '5000' }), { amount: 5000 });
});

test('recurring schema enforces frequency and date validity', async () => {
  const { validateRecurringInput, validateRecurringUpdateInput } = await import('../utils/validators');

  throwsWith(
    () => validateRecurringInput({ categoryId: 1, amount: 1, frequency: 'weekly', startDate: '2026-09-05' }),
    /frequency/
  );
  throwsWith(
    () => validateRecurringInput({ categoryId: 1, amount: 1, frequency: 'monthly', startDate: 'invalid' }),
    /startDate is invalid/
  );
  throwsWith(() => validateRecurringUpdateInput({}), /At least one recurring field is required/);

  const valid = validateRecurringInput({
    categoryId: '4',
    amount: '125000',
    frequency: 'monthly',
    startDate: '2026-09-05',
  });
  assert.equal(valid.categoryId, 4);
  assert.equal(valid.frequency, 'monthly');
  assert.ok(valid.startDate instanceof Date);
});

test('budget month query schema validates year and month from query strings', async () => {
  const { budgetMonthQuerySchema } = await import('../utils/validators');

  assert.equal(budgetMonthQuerySchema.safeParse({ year: '2026', month: '9' }).success, true);
  assert.equal(budgetMonthQuerySchema.safeParse({ year: '2026', month: '13' }).success, false);
  assert.equal(budgetMonthQuerySchema.safeParse({ year: 'abc', month: '9' }).success, false);
});
