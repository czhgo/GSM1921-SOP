import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BranchService } from '../../docs/src/services/core/runtime.js?v=20261018a';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261018a';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261018a';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261018a';

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

test('mock 模式的活动删除清除报名、表决、补充记录和关联业务域', async () => {
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
    assert.deepEqual(mockDB.signups.map((row) => row.sourceId), [other]);
    assert.deepEqual(mockDB.notices.map((row) => row.targetId), [other]);
    assert.deepEqual(mockDB.todos.map((row) => row.sourceId), [other]);
    assert.deepEqual(mockDB.agendaVotes.map((row) => row.activityId), [other]);
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
    for (const key of keys.slice(1, -1)) assert.deepEqual(mockDB[key], [], `${key} should be removed`);
    assert.deepEqual(mockDB.actSubRecords, {});
  } finally {
    for (const key of keys) mockDB[key] = previous[key];
  }
});
