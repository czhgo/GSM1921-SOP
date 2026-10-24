// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  archive-record-write.test.mjs — R2-40 回归守卫（2026-10-20）
//  病灶：api 形态上传宣传材料只写 fileSpaceRecords + 内存 archiveRecords.push，
//   没有调用 archiveRecords.create ⇒ 刷新后归档记录消失（archive_records 表其实存在）。
//  本测试钉住：ArchiveStore.createMaterial / removeMaterial 两形态都走适配器写口。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArchiveStore } from '../../docs/src/services/activity/archive.js?v=20261024c';
import { setDataSource, registerMockAdapter, registerApiAdapter } from '../../docs/src/data/data-adapter.js?v=20261024c';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261024c';
import { ApiAdapter } from '../../docs/src/data/api-adapter.js?v=20261024c';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261024c';

// 服务层按 runtime.js 的正常路径取适配器；单测里手动注入同一对实例。
registerMockAdapter(MockAdapter);
registerApiAdapter(ApiAdapter);

function stubStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

test('mock 形态：ArchiveStore 写入/删除都落 MockAdapter（localStorage 同源）', async () => {
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = stubStorage();
  const before = mockDB.archiveRecords;
  mockDB.archiveRecords = [];
  setDataSource('mock');
  try {
    const row = await ArchiveStore.createMaterial({
      activityId: 'act-archive-test', activityName: '测试活动', category: '新闻稿',
      fileName: 'a.pdf', fileSize: 10, fileData: 'data:text/plain;base64,QQ==',
      archiveDate: '2026-10-20', status: 'archived', uploadedBy: '2400012356',
    });
    assert.ok(row.id, '应生成归档记录 id');
    assert.equal(mockDB.archiveRecords.length, 1, '内存同源应有一条');
    assert.equal(mockDB.archiveRecords[0].activityId, 'act-archive-test');
    await ArchiveStore.removeMaterial(row.id);
    assert.equal(mockDB.archiveRecords.length, 0, '删除后内存同源应为空');
  } finally {
    mockDB.archiveRecords = before;
    setDataSource('mock');
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});

test('api 形态：ArchiveStore 必须调用 POST /api/v1/archiveRecords（刷新后仍可读）', async () => {
  const oldFetch = globalThis.fetch;
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = stubStorage();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    if (String(url).endsWith('/api/v1/archiveRecords') && (options.method || 'GET') === 'POST') {
      return new Response(JSON.stringify({
        id: 'ar-api-1', activityId: 'act-archive-api', category: '照片', status: 'archived',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const before = mockDB.archiveRecords;
  mockDB.archiveRecords = [];
  setDataSource('api', { apiBaseUrl: 'http://test.invalid', authToken: 'unit-token' });
  try {
    const row = await ArchiveStore.createMaterial({
      activityId: 'act-archive-api', activityName: '测试活动', category: '照片',
      fileName: 'b.jpg', fileSize: 20, filePath: '/api/v1/uploads/b.jpg',
      archiveDate: '2026-10-20', status: 'archived', uploadedBy: '2400012356',
    });
    assert.ok(calls.some((c) => c.method === 'POST' && c.url.endsWith('/api/v1/archiveRecords')),
      'api 形态必须 POST archiveRecords，不能只写内存');
    assert.equal(row.id, 'ar-api-1');
    assert.equal(mockDB.archiveRecords.some((r) => r.id === 'ar-api-1'), true, '当页读取面同步');
  } finally {
    mockDB.archiveRecords = before;
    setDataSource('mock');
    globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});
