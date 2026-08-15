import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../utils/jwt.js';

test('signToken uses the provided expiresIn option', () => {
  const token = signToken({ id: 'user-123' }, { expiresIn: '30m' });
  const decoded = verifyToken(token);

  assert.equal(decoded.id, 'user-123');
  assert.equal(decoded.exp - decoded.iat, 1800);
});
