import assert from 'node:assert/strict';
import test from 'node:test';

test('budget validator accepts integer IDR amounts and calendar months', async () => {
  const { validateBudgetInput } = await import('../utils/validators');

  assert.deepEqual(validateBudgetInput({ categoryId: 4, amount: '250000', year: 2026, month: 9 }), {
    categoryId: 4,
    amount: 250000,
    year: 2026,
    month: 9,
  });
});

test('IDR formatter centralizes currency display', async () => {
  const { formatIdr } = await import('../utils/format');

  assert.equal(formatIdr(25000), 'Rp25.000');
});

test('budget validator rejects invalid amounts, months, and category ids', async () => {
  const { validateBudgetInput } = await import('../utils/validators');

  assert.throws(() => validateBudgetInput({ categoryId: 0, amount: 1000, year: 2026, month: 9 }), /categoryId/);
  assert.throws(() => validateBudgetInput({ categoryId: 1, amount: 0, year: 2026, month: 9 }), /amount/);
  assert.throws(() => validateBudgetInput({ categoryId: 1, amount: 1000.5, year: 2026, month: 9 }), /amount/);
  assert.throws(() => validateBudgetInput({ categoryId: 1, amount: 1000, year: 2026, month: 13 }), /month/);
});

test('budget API exposes collection and item mutation handlers', async () => {
  const collectionRoute = await import('../app/api/budgets/route');
  const itemRoute = await import('../app/api/budgets/[id]/route');

  assert.equal(typeof collectionRoute.GET, 'function');
  assert.equal(typeof collectionRoute.POST, 'function');
  assert.equal(typeof itemRoute.PATCH, 'function');
  assert.equal(typeof itemRoute.DELETE, 'function');
});

test('monthly budget totals combine budgets and expenses by category', async () => {
  const { getMonthlyBudgetTotals } = await import('../utils/budget-math');

  assert.deepEqual(
    getMonthlyBudgetTotals(
      [{ categoryId: 1, categoryName: 'Food', amount: 500000 }],
      [
        { categoryId: 1, amount: 125000 },
        { categoryId: 1, amount: 75000 },
        { categoryId: 2, amount: 100000 },
      ]
    ),
    [
      { categoryId: 1, categoryName: 'Food', budget: 500000, spent: 200000 },
      { categoryId: 2, categoryName: 'Unbudgeted', budget: 0, spent: 100000 },
    ]
  );
});

test('budget burn states expose neutral, near-limit, and over-limit amounts', async () => {
  const { getBudgetBurnState } = await import('../utils/budget-math');

  assert.deepEqual(getBudgetBurnState({ budget: 0, spent: 100 }), {
    percentage: 0,
    remaining: 0,
    overage: 0,
    status: 'neutral',
  });
  assert.deepEqual(getBudgetBurnState({ budget: 500000, spent: 400000 }), {
    percentage: 80,
    remaining: 100000,
    overage: 0,
    status: 'near-limit',
  });
  assert.deepEqual(getBudgetBurnState({ budget: 500000, spent: 550000 }), {
    percentage: 110,
    remaining: 0,
    overage: 50000,
    status: 'over-limit',
  });
});
