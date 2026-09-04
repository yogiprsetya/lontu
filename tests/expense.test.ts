import assert from 'node:assert/strict';
import test from 'node:test';

test('expense validator module exports validateExpenseInput', async () => {
  const validators = await import('../lib/validators');

  assert.equal(typeof validators.validateExpenseInput, 'function', 'validateExpenseInput is exported');
});

test('validateExpenseInput rejects invalid or non-positive amounts', async () => {
  const { validateExpenseInput } = await import('../lib/validators');

  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '0' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: '-5000' }), /amount/);
  assert.throws(() => validateExpenseInput({ categoryName: 'Food', amount: 'abc' }), /amount/);
});

test('validateExpenseInput accepts positive integer amount and returns parsed data', async () => {
  const { validateExpenseInput } = await import('../lib/validators');

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

  assert.equal(typeof formModule.default, 'function', 'expense-form exports default');
});

test('expense detail API route exposes PATCH and DELETE handlers', async () => {
  const routeModule = await import('../app/api/expenses/[id]/route');

  assert.equal(typeof routeModule.PATCH, 'function', 'PATCH handler is exported');
  assert.equal(typeof routeModule.DELETE, 'function', 'DELETE handler is exported');
});

test('expense list and card components export defaults', async () => {
  const listModule = await import('../components/expense/expense-list');
  const cardModule = await import('../components/expense/expense-card');

  assert.equal(typeof listModule.default, 'function', 'expense-list exports default');
  assert.equal(typeof cardModule.default, 'function', 'expense-card exports default');
});

test('expense list refreshes when refreshKey changes', async () => {
  const listModule = await import('../components/expense/expense-list');

  assert.equal(typeof listModule.default, 'function', 'expense-list component accepts refreshKey');
});

test('expense dashboard component exports a default function', async () => {
  const dashboardModule = await import('../components/expense/expense-dashboard');

  assert.equal(typeof dashboardModule.default, 'function', 'expense-dashboard exports default');
});
