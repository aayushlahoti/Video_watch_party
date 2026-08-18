import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoomIdentifier } from '../services/roomService.js';

test('normalizeRoomIdentifier accepts both room codes and Mongo IDs', () => {
  assert.deepEqual(normalizeRoomIdentifier('abc12345'), { roomCode: 'ABC12345' });
  assert.deepEqual(normalizeRoomIdentifier('507f1f77bcf86cd799439011'), {
    _id: '507f1f77bcf86cd799439011',
  });
});
