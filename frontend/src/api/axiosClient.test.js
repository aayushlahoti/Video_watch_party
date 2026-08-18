import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiBaseUrl } from './axiosClient.js';

test('normalizeApiBaseUrl rewrites localhost proxy URLs to the backend dev port', () => {
  assert.equal(normalizeApiBaseUrl('http://localhost/api'), 'http://localhost:5000/api');
  assert.equal(normalizeApiBaseUrl('http://localhost:5000/api'), 'http://localhost:5000/api');
  assert.equal(normalizeApiBaseUrl('http://localhost:5173'), 'http://localhost:5173');
});
