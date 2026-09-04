import assert from 'node:assert/strict';
import test from 'node:test';

test('app dashboard page exports a default server component', async () => {
  const pageModule = await import('../app/app/page');

  assert.equal(typeof pageModule.default, 'function', 'app/app/page.tsx exports a default function');
});

test('home shell component exports a default function', async () => {
  const shellModule = await import('../components/dashboard/home-shell');

  assert.equal(typeof shellModule.default, 'function', 'home-shell exports a default function');
});

test('root page exports a default function', async () => {
  const pageModule = await import('../app/page');

  assert.equal(typeof pageModule.default, 'function', 'app/page.tsx exports a default function');
});

test('root page renders the protected dashboard entry point', async () => {
  const rootPage = await import('../app/page');
  const appPage = await import('../app/app/page');

  assert.equal(rootPage.default, appPage.default, 'root and app routes share the dashboard page');
});
