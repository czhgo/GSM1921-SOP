import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
let db;
let token;

function put(table, id, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(row));
}

async function removeActivity(id) {
  return fetch(`${base}/api/v1/activities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13', password: '123456' }),
  });
  token = (await login.json()).token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('删除活动会原子清理所有活动关联数据并保留其他活动子记录', async () => {
  const id = 'act-delete-cascade';
  const other = 'act-delete-keep';
  put('activities', id, { id, type: '支委会', title: '待删除' });
  put('activities', other, { id: other, type: '支委会', title: '保留' });
  const linkedRows = [
    ['tasks', `task-${id}`], ['attendances', `att-${id}`], ['inspections', `insp-${id}`],
    ['assignments', `asgn-${id}`], ['activity_reviews', `review-${id}`], ['makeup_tasks', `makeup-${id}`],
  ];
  for (const [table, rowId] of linkedRows) put(table, rowId, { id: rowId, activityId: id });
  put('signups', `signup-${id}`, { id: `signup-${id}`, sourceType: 'activity', sourceId: id });
  put('notices', `notice-${id}`, { id: `notice-${id}`, targetType: 'activity', targetId: id });
  put('todos', `todo-${id}`, { id: `todo-${id}`, sourceType: 'activity', sourceId: id });
  put('agenda_votes', `avp-${id}`, { id: `avp-${id}`, activityId: id, agendaItemId: 'a1', personId: 'p3', position: 'approve' });
  put('agenda_votes', `avt-${id}`, { id: `avt-${id}`, activityId: id, agendaItemId: 'a1', ballotMode: 'anonymous', tally: { approve: 1 } });
  put('archive_records', `archive-${id}`, { id: `archive-${id}`, activityId: id, filePath: '/api/v1/uploads/activity.pdf' });
  put('file_space_records', `file-${id}`, { id: `file-${id}`, activityId: id, filePath: '/api/v1/uploads/activity.pdf' });
  put('image_records', `image-${id}`, { id: `image-${id}`, activityId: id, filePath: '/api/v1/uploads/activity.pdf' });
  db.prepare('INSERT INTO attachments (id, filename, path, size, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(`attachment-${id}`, 'activity.pdf', '/api/v1/uploads/activity.pdf', 1, 'p13', '2026-10-14');
  put('act_sub_records', '__root__', { [id]: { activityId: id, note: '删除' }, [other]: { activityId: other, note: '保留' } });

  const response = await removeActivity(id);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.id, id);
  for (const [table, rowId] of [['activities', id], ...linkedRows,
    ['signups', `signup-${id}`], ['notices', `notice-${id}`], ['todos', `todo-${id}`],
    ['archive_records', `archive-${id}`], ['file_space_records', `file-${id}`], ['image_records', `image-${id}`]]) {
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE id = ?`).get(rowId).n, 0, `${table} should be removed`);
  }
  assert.equal(db.prepare('SELECT data FROM agenda_votes').all()
    .filter((row) => JSON.parse(row.data).activityId === id).length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attachments WHERE id = ?').get(`attachment-${id}`).n, 0);
  for (const collection of ['activities', 'tasks', 'attendances', 'inspections', 'assignments', 'activityReviews', 'makeupTasks', 'signups', 'notices', 'todos', 'archiveRecords', 'fileSpaceRecords', 'imageRecords', 'actSubRecords']) {
    assert.ok(result.versions[collection] > 0, `${collection} version should advance`);
  }
  assert.deepEqual(JSON.parse(db.prepare("SELECT data FROM act_sub_records WHERE id = '__root__'").get().data).body, {
    [other]: { activityId: other, note: '保留' },
  });
  assert.ok(db.prepare('SELECT id FROM activities WHERE id = ?').get(other));
});

test('关联记录删除失败时活动及已处理子记录全部回滚', async () => {
  const id = 'act-delete-rollback';
  put('activities', id, { id, type: '支委会', title: '回滚验证' });
  put('tasks', `task-${id}`, { id: `task-${id}`, activityId: id });
  put('agenda_votes', `avp-${id}`, { id: `avp-${id}`, activityId: id, agendaItemId: 'a1', personId: 'p3', position: 'approve' });
  db.exec(`CREATE TRIGGER fail_activity_vote_delete BEFORE DELETE ON agenda_votes
    WHEN OLD.id = 'avp-${id}' BEGIN SELECT RAISE(ABORT, 'forced child delete failure'); END`);
  try {
    const response = await removeActivity(id);
    assert.equal(response.status, 500);
    assert.ok(db.prepare('SELECT id FROM activities WHERE id = ?').get(id));
    assert.ok(db.prepare('SELECT id FROM tasks WHERE id = ?').get(`task-${id}`));
    assert.ok(db.prepare('SELECT id FROM agenda_votes WHERE id = ?').get(`avp-${id}`));
  } finally {
    db.exec('DROP TRIGGER IF EXISTS fail_activity_vote_delete');
  }
});
