import assert from 'node:assert/strict';
import test from 'node:test';

test('manifest exports a valid installable PWA manifest', async () => {
  const manifestModule = await import('../app/manifest');

  assert.equal(typeof manifestModule.default, 'function', 'app/manifest.ts exports a default function');

  const manifest = manifestModule.default();

  assert.ok(manifest.name, 'manifest has a name');
  assert.ok(manifest.short_name, 'manifest has a short_name');
  assert.ok(manifest.description, 'manifest has a description');
  assert.equal(manifest.display, 'standalone', 'manifest uses standalone display');
  assert.ok(manifest.start_url, 'manifest has a start_url');
  assert.ok(manifest.theme_color, 'manifest has a theme_color');
  assert.ok(manifest.background_color, 'manifest has a background_color');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest declares icons');

  const sizes = (manifest.icons ?? []).map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192'), 'manifest declares a 192x192 icon');
  assert.ok(sizes.includes('512x512'), 'manifest declares a 512x512 icon');
});

test('manifest start_url opens the authenticated app entry point', async () => {
  const manifestModule = await import('../app/manifest');

  const manifest = manifestModule.default();

  assert.ok(
    String(manifest.start_url).startsWith('/app'),
    'start_url points to the authenticated app entry point'
  );
});

test('declared icons exist in public/icons as valid PNGs with matching dimensions', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const manifestModule = await import('../app/manifest');

  const manifest = manifestModule.default();
  const publicDir = new URL('../public/', import.meta.url);

  assert.ok(manifest.icons && manifest.icons.length > 0, 'manifest declares icons');

  for (const icon of manifest.icons ?? []) {
    assert.match(icon.src, /^\//, `icon src ${icon.src} is site-relative`);
    assert.equal(icon.type, 'image/png', `icon ${icon.src} is PNG`);

    const filePath = path.join(new URL(publicDir).pathname, icon.src.replace(/^\//, ''));
    const buffer = await fs.readFile(filePath);

    assert.ok(buffer.length > 100, `icon ${icon.src} is non-empty`);
    assert.deepEqual(
      [buffer[0], buffer[1], buffer[2], buffer[3], buffer[4], buffer[5], buffer[6], buffer[7]],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      `icon ${icon.src} has a PNG signature`
    );

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const [expectedWidth, expectedHeight] = String(icon.sizes).split('x').map(Number);

    assert.equal(width, expectedWidth, `icon ${icon.src} width matches declared size`);
    assert.equal(height, expectedHeight, `icon ${icon.src} height matches declared size`);
  }
});

test('root layout exposes PWA theme metadata and standalone behavior', async () => {
  const fs = await import('node:fs/promises');

  const layoutSource = await fs.readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');

  assert.match(layoutSource, /export const viewport/, 'root layout exports a viewport');
  assert.match(layoutSource, /themeColor/, 'viewport declares a themeColor');
  assert.match(layoutSource, /appleWebApp/, 'metadata declares appleWebApp');
  assert.match(layoutSource, /capable:\s*true/, 'appleWebApp is capable');
  assert.match(layoutSource, /applicationName/, 'metadata declares an applicationName');
});

test('root layout preserves the authenticated app shell without regressions', async () => {
  const fs = await import('node:fs/promises');

  const layoutSource = await fs.readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');

  assert.match(layoutSource, /AuthProvider/, 'root layout keeps the auth provider');
  assert.match(layoutSource, /SwrProvider/, 'root layout keeps the SWR provider');
  assert.match(layoutSource, /export default/, 'root layout keeps a default export');
});

test('offline cache utils expose a versioned contract', async () => {
  const offlineCache = await import('../utils/offline-cache');

  assert.equal(typeof offlineCache.OFFLINE_CACHE_VERSION, 'string');
  assert.match(offlineCache.OFFLINE_CACHE_VERSION, /lontu-offline-v/);
  assert.ok(
    String(offlineCache.OFFLINE_STORAGE_KEY).includes(offlineCache.OFFLINE_CACHE_VERSION),
    'storage key is tied to the cache version'
  );
  assert.equal(typeof offlineCache.isCacheableApiRequest, 'function');
  assert.equal(typeof offlineCache.isMutationMethod, 'function');
  assert.equal(typeof offlineCache.clearOfflineCache, 'function');
  assert.match(String(offlineCache.OFFLINE_ERROR_MESSAGE), /offline/i);
});

test('offline cache only caches GET reads and never mutations', async () => {
  const { isCacheableApiRequest, isMutationMethod } = await import('../utils/offline-cache');

  assert.equal(isCacheableApiRequest('/api/expenses', 'GET'), true);
  assert.equal(isCacheableApiRequest('/api/categories', 'GET'), true);
  assert.equal(isCacheableApiRequest('/api/budgets?year=2026&month=9', 'GET'), true);
  assert.equal(isCacheableApiRequest('/api/recurring', 'GET'), true);
  assert.equal(isCacheableApiRequest('/api/expenses', 'POST'), false);
  assert.equal(isCacheableApiRequest('/api/auth/session', 'GET'), false);
  assert.equal(isMutationMethod('POST'), true);
  assert.equal(isMutationMethod('PATCH'), true);
  assert.equal(isMutationMethod('DELETE'), true);
  assert.equal(isMutationMethod('GET'), false);
});

test('service worker caches latest reads and invalidates on version change', async () => {
  const fs = await import('node:fs/promises');

  const swSource = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.match(swSource, /lontu-offline-v\d+/, 'service worker is versioned');
  assert.match(swSource, /addEventListener\(['"]install['"]/, 'service worker handles install');
  assert.match(swSource, /addEventListener\(['"]activate['"]/, 'service worker handles activate');
  assert.match(swSource, /addEventListener\(['"]fetch['"]/, 'service worker handles fetch');
  assert.match(swSource, /GET/, 'service worker only caches GET reads');
  assert.match(swSource, /\/api\/expenses/, 'service worker knows the read endpoints');
  assert.match(swSource, /caches\.delete|caches\.keys/, 'service worker invalidates old caches');
  assert.match(swSource, /CLEAR_OFFLINE_CACHE/, 'service worker clears cache on sign-out');
});

test('swr provider persists latest data for offline viewing', async () => {
  const fs = await import('node:fs/promises');

  const source = await fs.readFile(new URL('../components/swr-provider.tsx', import.meta.url), 'utf8');

  assert.match(source, /provider/, 'SWR provider configures a cache provider');
  assert.match(source, /localStorage/, 'SWR provider persists to localStorage');
  assert.match(source, /OFFLINE_STORAGE_KEY|offline/i, 'SWR provider uses the versioned offline key');
  assert.match(source, /swrFetcher/, 'SWR provider keeps the shared fetcher');
  assert.match(source, /SwrProvider/, 'SWR provider keeps its export');
});

test('root layout registers the service worker without regressions', async () => {
  const fs = await import('node:fs/promises');

  const layoutSource = await fs.readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');

  assert.match(layoutSource, /SwRegister|\/sw\.js|serviceWorker/, 'root layout registers the service worker');
  assert.match(layoutSource, /AuthProvider/, 'root layout keeps the auth provider');
  assert.match(layoutSource, /SwrProvider/, 'root layout keeps the SWR provider');
});

test('expense form fails clearly while offline and never claims a save', async () => {
  const fs = await import('node:fs/promises');

  const source = await fs.readFile(new URL('../components/expense/expense-form.tsx', import.meta.url), 'utf8');

  assert.match(source, /navigator\.onLine/, 'expense form checks connectivity before mutating');
  assert.match(source, /offline/i, 'expense form surfaces an offline state');
  assert.match(source, /OFFLINE_ERROR_MESSAGE|You are offline/, 'expense form fails with a clear message');
});

test('sign-out invalidates the offline cache', async () => {
  const fs = await import('node:fs/promises');

  const authSource = await fs.readFile(new URL('../components/auth-provider.tsx', import.meta.url), 'utf8');
  const swSource = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.match(
    authSource,
    /clearOfflineCache|CLEAR_OFFLINE_CACHE|caches\.delete/,
    'sign-out clears the offline cache'
  );
  assert.match(swSource, /CLEAR_OFFLINE_CACHE/, 'service worker supports sign-out invalidation');
});
