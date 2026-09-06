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
