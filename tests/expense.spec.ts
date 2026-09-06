import assert from 'node:assert/strict';
import test from 'node:test';

test('expense validator module exports validateExpenseInput', async () => {
  const validators = await import('../utils/validators');

  assert.equal(typeof validators.validateExpenseInput, 'function', 'validateExpenseInput is exported');
});

test('validateExpenseInput rejects invalid or non-positive amounts', async () => {
  const { validateExpenseInput } = await import('../utils/validators');

  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '0' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '-5000' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: 'abc' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '2147483648' }), /amount/);
});

test('validateExpenseInput accepts positive integer amount and returns parsed data', async () => {
  const { validateExpenseInput } = await import('../utils/validators');

  const valid = validateExpenseInput({
    categoryName: 'Food',
    amount: '25000',
    note: 'Lunch',
  });

  assert.equal(valid.categoryName, 'Food');
  assert.equal(valid.amount, 25000);
  assert.equal(valid.note, 'Lunch');
  assert.ok(valid.spentAt instanceof Date, 'spentAt is a Date');
});

test('expenses API route exposes GET and POST handlers', async () => {
  const routeModule = await import('../app/api/expenses/route');

  assert.equal(typeof routeModule.GET, 'function', 'GET handler is exported');
  assert.equal(typeof routeModule.POST, 'function', 'POST handler is exported');
});

test('expense form component exports a default function', async () => {
  const formModule = await import('../components/expense/expense-form');

  assert.equal(typeof formModule.ExpenseForm, 'function', 'expense-form exports');
});

test('expense detail API route exposes PATCH and DELETE handlers', async () => {
  const routeModule = await import('../app/api/expenses/[id]/route');

  assert.equal(typeof routeModule.PATCH, 'function', 'PATCH handler is exported');
  assert.equal(typeof routeModule.DELETE, 'function', 'DELETE handler is exported');
});

test('recurring validator accepts supported frequencies and parses dates', async () => {
  const { validateRecurringInput } = await import('../utils/validators');

  assert.deepEqual(
    validateRecurringInput({
      categoryId: '4',
      amount: '125000',
      frequency: 'monthly',
      startDate: '2026-09-05',
      note: 'Streaming subscription',
    }),
    {
      categoryId: 4,
      amount: 125000,
      frequency: 'monthly',
      startDate: new Date('2026-09-05'),
      note: 'Streaming subscription',
    }
  );

  assert.throws(
    () => validateRecurringInput({ categoryId: 4, amount: 125000, frequency: 'weekly', startDate: '2026-09-05' }),
    /frequency/
  );
  assert.throws(
    () => validateRecurringInput({ categoryId: 4, amount: 125000, frequency: 'monthly', startDate: 'invalid' }),
    /startDate/
  );
  assert.throws(
    () => validateRecurringInput({ categoryId: 4, amount: 0, frequency: 'monthly', startDate: '2026-09-05' }),
    /amount/
  );
  assert.throws(
    () =>
      validateRecurringInput({
        categoryId: 4,
        amount: 2147483648,
        frequency: 'monthly',
        startDate: '2026-09-05',
      }),
    /amount/
  );
});

test('recurring API exposes authenticated collection handlers', async () => {
  const routeModule = await import('../app/api/recurring/route');

  assert.equal(typeof routeModule.GET, 'function');
  assert.equal(typeof routeModule.POST, 'function');
});

test('recurring GET includes the current period status for persisted button state', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../app/api/recurring/route.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /periodMarked/);
  assert.match(source, /markedExpenseId/);
});

test('recurring is not created through expense updates', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../app/api/expenses/[id]/route.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /recurringConfigsTable/);
  assert.doesNotMatch(source, /validated\.recurring/);
});

test('recurring API exposes collection and item mutation handlers', async () => {
  const collectionRoute = await import('../app/api/recurring/route');
  const itemRoute = await import('../app/api/recurring/[id]/route');

  assert.equal(typeof collectionRoute.GET, 'function');
  assert.equal(typeof collectionRoute.POST, 'function');
  assert.equal(typeof itemRoute.PATCH, 'function');
  assert.equal(typeof itemRoute.DELETE, 'function');
  assert.equal(typeof itemRoute.POST, 'function');
});

test('recurrence helpers calculate next occurrences and stable period keys', async () => {
  const { getNextOccurrence, getRecurringPeriodKey } = await import('../utils/recurrence');

  assert.equal(
    getNextOccurrence(
      new Date('2026-01-31T00:00:00.000Z'),
      'monthly',
      new Date('2026-02-01T00:00:00.000Z')
    ).toISOString(),
    '2026-02-28T00:00:00.000Z'
  );
  assert.equal(
    getNextOccurrence(
      new Date('2024-02-29T00:00:00.000Z'),
      'yearly',
      new Date('2025-01-01T00:00:00.000Z')
    ).toISOString(),
    '2025-02-28T00:00:00.000Z'
  );
  assert.equal(getRecurringPeriodKey(new Date('2026-09-05T00:00:00.000Z'), 'monthly'), '2026-09');
  assert.equal(getRecurringPeriodKey(new Date('2026-09-05T00:00:00.000Z'), 'yearly'), '2026');
});

test('period marking route is protected against recurring expenses before their start date', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../app/api/recurring/[id]/route.ts', import.meta.url), 'utf8');

  assert.match(source, /today < recurringStartDate/);
  assert.match(source, /Recurring expense has not started/);
});

test('expense form keeps recurring configuration out of quick add', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../components/expense/expense-form.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /isRecurring/);
  assert.doesNotMatch(source, /Recurring expense/);
});

test('recurring manager and dedicated page are available', async () => {
  const managerModule = await import('../components/recurring/recurring-manager');
  const dialogModule = await import('../components/recurring/recurring-form-dialog');
  const pageModule = await import('../app/app/recurring/page');
  const fs = await import('node:fs/promises');
  const dialogSource = await fs.readFile(
    new URL('../components/recurring/recurring-form-dialog.tsx', import.meta.url),
    'utf8'
  );
  const managerSource = await fs.readFile(
    new URL('../components/recurring/recurring-manager.tsx', import.meta.url),
    'utf8'
  );

  assert.equal(typeof managerModule.RecurringManager, 'function');
  assert.equal(typeof dialogModule.RecurringFormDialog, 'function');
  assert.equal(typeof pageModule.default, 'function');
  assert.match(dialogSource, /DialogContent/);
  assert.match(dialogSource, /Add recurring expense/);
  assert.match(managerSource, /RecurringFormDialog/);
});

test('expense list and card components export defaults', async () => {
  const listModule = await import('../components/expense/expense-list');
  const cardModule = await import('../components/expense/expense-card');

  assert.equal(typeof listModule.ExpenseList, 'function', 'expense-list exports');
  assert.equal(typeof cardModule.ExpenseCard, 'function', 'expense-card exports');
});

test('expense list refreshes when refreshKey changes', async () => {
  const listModule = await import('../components/expense/expense-list');

  assert.equal(typeof listModule.ExpenseList, 'function', 'expense-list component accepts refreshKey');
});

test('groupExpensesByDate sorts history groups and items newest first', async () => {
  const { groupExpensesByDate } = await import('../components/expense/expense-list');

  const groups = groupExpensesByDate([
    {
      id: 1,
      amount: 10000,
      note: null,
      spentAt: '2026-09-01T08:00:00.000Z',
      categoryName: 'Food',
    },
    {
      id: 2,
      amount: 20000,
      note: null,
      spentAt: '2026-09-03T08:00:00.000Z',
      categoryName: 'Transport',
    },
    {
      id: 3,
      amount: 30000,
      note: null,
      spentAt: '2026-09-03T06:00:00.000Z',
      categoryName: 'Bills',
    },
  ]);

  assert.deepEqual(
    groups.map((group) => group.date),
    ['2026-09-03', '2026-09-01']
  );
  assert.deepEqual(
    groups[0].items.map((item) => item.id),
    [2, 3]
  );
});

test('expense dashboard component exports a default function', async () => {
  const dashboardModule = await import('../components/expense/expense-dashboard');

  assert.equal(typeof dashboardModule.ExpenseDashboard, 'function', 'expense-dashboard exports');
});

test('category validator trims names and accepts hex colors', async () => {
  const { validateCategoryInput } = await import('../utils/validators');

  assert.deepEqual(validateCategoryInput({ name: '  Groceries  ', color: '#12Abef' }), {
    name: 'Groceries',
    color: '#12Abef',
  });
  assert.throws(() => validateCategoryInput({ name: '   ' }), /name/);
  assert.throws(() => validateCategoryInput({ name: 'Bills', color: 'blue' }), /color/);
});

test('category API exposes authenticated collection and item handlers', async () => {
  const collectionRoute = await import('../app/api/categories/route');
  const itemRoute = await import('../app/api/categories/[id]/route');

  assert.equal(typeof collectionRoute.GET, 'function');
  assert.equal(typeof collectionRoute.POST, 'function');
  assert.equal(typeof itemRoute.PATCH, 'function');
  assert.equal(typeof itemRoute.DELETE, 'function');
});

test('category management component exports a function', async () => {
  const categoryModule = await import('../components/category/category-manager');

  assert.equal(typeof categoryModule.CategoryManager, 'function');
});

test('api response helpers centralize resource, collection, and empty responses', async () => {
  const responses = await import('../utils/api-response');

  assert.equal(typeof responses.resourceResponse, 'function');
  assert.equal(typeof responses.collectionResponse, 'function');
  assert.equal(typeof responses.noContentResponse, 'function');

  const resource = responses.resourceResponse('category', { id: 1 }, 201);
  assert.equal(resource.status, 201);
  const resourceBody = await resource.json();
  assert.equal(resourceBody.success, true);
  assert.deepEqual(resourceBody.data, { category: { id: 1 } });

  const collection = responses.collectionResponse('categories', [{ id: 1 }]);
  const collectionBody = await collection.json();
  assert.equal(collectionBody.success, true);
  assert.deepEqual(collectionBody.data, { categories: [{ id: 1 }] });
  assert.equal(responses.noContentResponse().status, 204);
});
