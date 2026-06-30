import test from 'node:test';
import assert from 'node:assert/strict';

import { toolsApi } from './toolsApi.js';

test('toolsApi returns safe defaults when no mock store is available', async () => {
  assert.deepEqual(await toolsApi.getCategories(), []);
  assert.deepEqual(await toolsApi.getOperators(), []);
  assert.deepEqual(await toolsApi.getTickets(), []);
  assert.equal(await toolsApi.getAiChatReply('hello'), '');
});
