import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BranchService } from '../../docs/src/services/core/runtime.js?v=20261120a';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261120a';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261120a';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261120a';

test('API 模式的活动删除使用服务端级联删除端点', async () => {
  const id = 'act-delete-client-route';
  const oldFetch = globalThis.fetch;
  const oldStorage = globalThis.localStorage;
  const calls = [];
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    if (options.method === 'DELETE') {
      return new Response(JSON.stringify({ id, versions: { activities: 1 } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(url).endsWith('/api/v1/snapshot/versions')) {
      return new Response(JSON.stringify({ versions: { activities: 1 } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const beforeActivities = mockDB.activities;
  mockDB.activities = [{ id, type: '支委会' }];
  setDataSource('api', { apiBaseUrl: 'http://test.invalid', authToken: 'unit-token' });
  try {
    await BranchService.deleteActivity(id);
    assert.ok(calls.some((call) => call.method === 'DELETE' && call.url.endsWith(`/api/v1/activities/${id}`)));
    assert.ok(!calls.some((call) => call.method === 'POST' && call.url.endsWith('/api/v1/snapshot')),
      'activity deletion should not be synchronized as an eventually consistent full snapshot');
  } finally {
    mockDB.activities = beforeActivities;
    setDataSource('mock');
    globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});

test('mock 模式的活动删除清除关联业务域，但保留报名与表决留痕（D-876）', async () => {
  const id = 'act-delete-mock';
  const other = 'act-keep-mock';
  const keys = ['activities', 'tasks', 'attendances', 'inspections', 'assignments', 'activityReviews',
    'makeupTasks', 'signups', 'notices', 'todos', 'agendaVotes', 'archiveRecords', 'fileSpaceRecords',
    'imageRecords', 'actSubRecords'];
  const previous = Object.fromEntries(keys.map((key) => [key, mockDB[key]]));
  mockDB.activities = [{ id, type: '支委会' }, { id: other, type: '支委会' }];
  for (const key of ['tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks', 'archiveRecords', 'fileSpaceRecords', 'imageRecords']) {
    mockDB[key] = [{ id: `${key}-target`, activityId: id }, { id: `${key}-other`, activityId: other }];
  }
  mockDB.signups = [{ id: 'signup-target', sourceType: 'activity', sourceId: id }, { id: 'signup-other', sourceType: 'activity', sourceId: other }];
  mockDB.notices = [{ id: 'notice-target', targetType: 'activity', targetId: id }, { id: 'notice-other', targetType: 'activity', targetId: other }];
  mockDB.todos = [{ id: 'todo-target', sourceType: 'activity', sourceId: id }, { id: 'todo-other', sourceType: 'activity', sourceId: other }];
  mockDB.agendaVotes = [{ id: 'vote-target', activityId: id }, { id: 'vote-other', activityId: other }];
  mockDB.actSubRecords = { [id]: { note: 'delete' }, [other]: { note: 'keep' } };
  setDataSource('mock');
  try {
    await BranchService.deleteActivity(id);
    assert.deepEqual(mockDB.activities.map((row) => row.id), [other]);
    for (const key of ['tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks', 'archiveRecords', 'fileSpaceRecords', 'imageRecords']) {
      assert.deepEqual(mockDB[key].map((row) => row.activityId), [other], `${key} should retain only the unrelated activity`);
    }
    const keptSignups = mockDB.signups.filter((row) => row.sourceId === id);
    assert.equal(keptSignups.length, 1, '报名留痕应保留');
    assert.equal(keptSignups[0].activitySnapshot?.id, id, '报名留痕应带活动快照');
    assert.deepEqual(mockDB.notices.map((row) => row.targetId), [other]);
    assert.deepEqual(mockDB.todos.map((row) => row.sourceId), [other]);
    const keptVotes = mockDB.agendaVotes.filter((row) => row.activityId === id);
    assert.equal(keptVotes.length, 1, '表决留痕应保留');
    assert.equal(keptVotes[0].activitySnapshot?.id, id, '表决留痕应带活动快照');
    assert.deepEqual(Object.keys(mockDB.actSubRecords), [other]);
  } finally {
    for (const key of keys) mockDB[key] = previous[key];
    setDataSource('mock');
  }
});

test('MockAdapter 活动删除接口与 BranchService 保持相同级联口径', async () => {
  const id = 'act-delete-adapter';
  const keys = ['activities', 'todos', 'agendaVotes', 'archiveRecords', 'fileSpaceRecords', 'imageRecords', 'actSubRecords'];
  const previous = Object.fromEntries(keys.map((key) => [key, mockDB[key]]));
  mockDB.activities = [{ id, type: '支委会' }];
  mockDB.todos = [{ id: 'todo', sourceType: 'activity', sourceId: id }];
  mockDB.agendaVotes = [{ id: 'vote', activityId: id }];
  mockDB.archiveRecords = [{ id: 'archive', activityId: id }];
  mockDB.fileSpaceRecords = [{ id: 'file', sourceType: 'activity', sourceId: id }];
  mockDB.imageRecords = [{ id: 'image', activityId: id }];
  mockDB.actSubRecords = { [id]: { note: 'delete' } };
  try {
    await MockAdapter.activities.delete(id);
    assert.deepEqual(mockDB.activities, []);
    for (const key of ['todos', 'archiveRecords', 'fileSpaceRecords', 'imageRecords']) {
      assert.deepEqual(mockDB[key], [], `${key} should be removed`);
    }
    assert.equal(mockDB.agendaVotes.length, 1, 'agendaVotes should be kept（D-876 留痕）');
    assert.equal(mockDB.agendaVotes[0].activitySnapshot?.id, id, 'agendaVotes 应带 activitySnapshot');
    assert.deepEqual(mockDB.actSubRecords, {});
  } finally {
    for (const key of keys) mockDB[key] = previous[key];
  }
});
