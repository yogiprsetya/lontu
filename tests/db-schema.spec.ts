import assert from 'node:assert/strict';
import test from 'node:test';

test('database schema exports all MVP tables', async () => {
  const schema = await import('../db/schema');

  assert.ok(schema.usersTable, 'usersTable is exported');
  assert.ok(schema.expensesTable, 'expensesTable is exported');
  assert.ok(schema.categoriesTable, 'categoriesTable is exported');
  assert.ok(schema.budgetsTable, 'budgetsTable is exported');
  assert.ok(schema.recurringConfigsTable, 'recurringConfigsTable is exported');
});

test('database client is exported from config/db', async () => {
  const dbModule = await import('../config/db');

  assert.ok(dbModule.db, 'db client is exported');
});

test('users table is multi-user-ready with required columns', async () => {
  const { usersTable } = await import('../db/schema');

  assert.ok(usersTable);
  const columns = Object.keys(usersTable);
  assert.ok(columns.includes('id'), 'users table has id');
  assert.ok(columns.includes('email'), 'users table has email');
});
