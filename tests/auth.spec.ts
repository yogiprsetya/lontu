import assert from 'node:assert/strict';
import test from 'node:test';

test('auth config exports authOptions and default handler', async () => {
  const authModule = await import('../auth');

  assert.ok(authModule.authOptions, 'authOptions is exported');
  assert.ok(authModule.default, 'default NextAuth handler is exported');
});

test('auth API route exposes GET and POST handlers', async () => {
  const routeModule = await import('../app/api/auth/[...nextauth]/route');

  assert.equal(typeof routeModule.GET, 'function', 'GET handler is exported');
  assert.equal(typeof routeModule.POST, 'function', 'POST handler is exported');
});

test('login page is the default export', async () => {
  const pageModule = await import('../app/login/page');

  assert.equal(typeof pageModule.default, 'function', 'login page default export is a function');
});

test('server auth helpers expose the shared session and user id boundary', async () => {
  const authModule = await import('../utils/server-auth');

  assert.equal(typeof authModule.getServerAuthSession, 'function');
  assert.equal(typeof authModule.getServerUserId, 'function');
});
