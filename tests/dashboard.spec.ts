import assert from 'node:assert/strict';
import test from 'node:test';

test('app dashboard page exports a default server component', async () => {
  const pageModule = await import('../app/app/(overview)/page');

  assert.equal(typeof pageModule.default, 'function', 'app/app/page.tsx exports a default function');
});

test('app shell owns layout orchestration', async () => {
  const fs = await import('node:fs/promises');
  const overviewPageSource = await fs.readFile(new URL('../app/app/(overview)/page.tsx', import.meta.url), 'utf8');
  const appShellSource = await fs.readFile(new URL('../components/layout/app-shell.tsx', import.meta.url), 'utf8');
  const sidebarSource = await fs.readFile(
    new URL('../components/layout/dashboard-sidebar.tsx', import.meta.url),
    'utf8'
  );

  assert.match(overviewPageSource, /next\/dynamic/);
  assert.match(overviewPageSource, /OverviewSkeleton/);
  assert.match(appShellSource, /SidebarProvider/);
  assert.match(appShellSource, /DashboardSidebar/);
  assert.match(appShellSource, /SidebarInset/);
  assert.match(appShellSource, /SidebarTrigger/);
  assert.match(sidebarSource, /navigationItems/);
});

test('root page exports a default function', async () => {
  const pageModule = await import('../app/page');

  assert.equal(typeof pageModule.default, 'function', 'app/page.tsx exports a default function');
});

test('root page renders the landing entry point distinct from dashboard', async () => {
  const rootPage = await import('../app/page');
  const appPage = await import('../app/app/(overview)/page');
  const fs = await import('node:fs/promises');
  const rootSource = await fs.readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.notEqual(rootPage.default, appPage.default, 'root and app routes are distinct pages');
  assert.match(rootSource, /Landing page coming soon/);
});
