import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiAdapter } from '../../docs/src/data/api-adapter.js?v=20261018e';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261018e';

test('ApiAdapter exposes the transactional workgroup member save-all request', async () => {
  const oldFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method, body: JSON.parse(options.body), headers: options.headers });
    return new Response(JSON.stringify({ members: [], grants: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  setDataSource('api', { apiBaseUrl: 'http://test.invalid', authToken: 'batch-token' });
  const payload = { members: [{ personId: 'p8', role: 'deep', permissionKeys: ['task.complete'] }] };
  try {
    const result = await ApiAdapter.workgroups.members.saveAll('wg/test', payload);
    assert.deepEqual(result, { members: [], grants: [] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://test.invalid/api/v1/workgroups/wg%2Ftest/members');
    assert.equal(calls[0].method, 'PUT');
    assert.deepEqual(calls[0].body, payload);
    assert.equal(calls[0].headers.Authorization, 'Bearer batch-token');
  } finally {
    setDataSource('mock');
    globalThis.fetch = oldFetch;
  }
});
