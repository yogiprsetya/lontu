import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

test('validateData returns typed data or flattened Zod field errors', async () => {
  const { validateData } = await import('../utils/validation');
  const schema = z.object({ email: z.string().email() });

  const valid = validateData({ email: 'user@example.com' }, schema);
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.email, 'user@example.com');

  const invalid = validateData({ email: 'invalid' }, schema);
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.ok(invalid.errors.email);
});
