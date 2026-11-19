// role: [工程师]+[AI]
// server/test/my-project-tasks.test.mjs — 「我的任务」按项目身份派生（2026-11-19 批次 574 · `D-886` / `SOP-B-31`）
// 判据：
//   · 组织者 / 深参按 SOP 任务节点的 `executor` 取到「我的任务」；
//   · 活动已完结（完成 / 取消 / 归档）⇒ 组织者本人的那步不再出现（`D-885`）；
//   · 组织者分配的「工作分工」（`assignments`）指派给本人 ⇒ 也进「我的任务」，行 id 前缀 `wa:`；
//   · 勾掉 `wa:` 行复用「工作分工」写口（`updateWorkAssignment`），完成后不再出现；
//   · 演示种子每行都带 `executor`（`SOP-B-31` ③）。
// 运行：node --test test/my-project-tasks.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261110b';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261110b';
import { setDataSource, registerMockAdapter } from '../../docs/src/data/data-adapter.js?v=20261110b';
import { listMyProjectTasks, completeMyProjectTask } from '../../docs/src/services/activity/activity.js?v=20261110b';
import { SEED_TASKS } from '../../docs/src/data/mock/seed.js?v=20261110b';

const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const ME = '2400012347';
const DEEP = '2400012352';

function beginMockCase() {
  _store.clear();
  for (const k of ['activities', 'tasks', 'todos', 'assignments', 'notices']) mockDB[k] = [];
  mockDB.branches = [];
  mockDB._loaded = false;
  registerMockAdapter(MockAdapter);
  setDataSource('mock');
  MockAdapter.loadDB();
}

/** 未来活动（status 派生为 published）＋ 一条组织者任务 */
function seedOpenActivity() {
  mockDB.activities = [{
    id: 'act-future', title: '未来主题党日', date: '2099-01-01', type: '主题党日',
    organizer: ME, assignments: [{ personId: ME, role: 'organizer' }, { personId: DEEP, role: 'deep' }],
  }];
  mockDB.tasks = [
    { id: 't-org', activityId: 'act-future', title: '组织者筹备', status: 'pending', executor: 'organizer' },
    { id: 't-deep', activityId: 'act-future', title: '深参产出', status: 'pending', executor: 'deep' },
  ];
}

test('SOP 任务：组织者 / 深参各取各的那份；活动完结后组织者那步不再出现', () => {
  beginMockCase();
  seedOpenActivity();
  const org = listMyProjectTasks(ME).filter((x) => x.source !== 'assignment');
  assert.deepEqual(org.map((x) => x.task.id), ['t-org']);
  const deep = listMyProjectTasks(DEEP).filter((x) => x.source !== 'assignment');
  assert.deepEqual(deep.map((x) => x.task.id), ['t-deep']);

  mockDB.activities[0] = { ...mockDB.activities[0], status: 'completed' };
  assert.equal(listMyProjectTasks(ME).filter((x) => x.source !== 'assignment').length, 0,
    '活动完结 ⇒ 组织者本人的任务销项（D-885）');
});

test('工作分工（组织者分配）：指派给本人即进「我的任务」，勾掉即完成且不再出现', async () => {
  beginMockCase();
  seedOpenActivity();
  mockDB.assignments = [{
    id: 'asgn-1', activityId: 'act-future', workName: '撰写宣传稿', workDescription: '800 字',
    ddl: '2098-12-31', assigneeId: DEEP, status: 'pending', createdBy: ME,
  }];
  const mine = listMyProjectTasks(DEEP).filter((x) => x.source === 'assignment');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].task.id, 'wa:asgn-1');
  assert.equal(mine[0].projectRole, 'deep');

  const r = await completeMyProjectTask(DEEP, 'wa:asgn-1');
  assert.equal(r.ok, true);
  assert.equal(mockDB.assignments[0].status, 'completed', '写口复用工作分工 CRUD');
  assert.equal(listMyProjectTasks(DEEP).filter((x) => x.source === 'assignment').length, 0);
  // 他人不可勾（不在名下）
  assert.equal((await completeMyProjectTask(ME, 'wa:asgn-1')).ok, false);
});

test('演示种子：每条 SOP 任务都带 executor（SOP-B-31 ③）', () => {
  assert.ok(SEED_TASKS.length > 0);
  const missing = SEED_TASKS.filter((t) => !t.executor).map((t) => t.id);
  assert.deepEqual(missing, [], `以下种子缺 executor：${missing.join(', ')}`);
});
