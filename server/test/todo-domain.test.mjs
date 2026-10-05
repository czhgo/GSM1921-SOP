// role: [工程师]+[AI]
// server/test/todo-domain.test.mjs — IA 收敛 C1 Task1：待办「业务域」枚举与兼容推断（2026-09-07；
//   **2026-10-05 `D-787` 由 9 域合并为 6 类**：会务/活动/专班 → 项目、决议上报/汇报反馈 → 上报与汇报）
// 覆盖（member-persist 桩做法；seed 用 mockDB.todos 直插构造记录）：
//   ① WORK_DOMAIN 导出含 **6 类** + {NONE}；WORK_DOMAIN_LABELS 中文齐全
//   ② inferDomain：有 domain 原样返回（旧域键按 `_LEGACY_DOMAIN` 归一，不覆盖不推断）
//   ③ inferDomain：无 domain 按 actionKey/actionType 推断——映射表逐条断言
//     （attendance-*→考勤纪律；inspection-*→考察；member-confirm/semester-*→成员发展；
//       taskforce-*→项目；resolution-*→上报与汇报；archive 前缀/-archive 后缀→归档宣传；read/notice→NONE）
//   ④ authorize/participate 一律「项目」域（合并后 taskforce/activity/scenario 三路同域）
//   ⑤ 未知/空 → NONE 不崩
//   ⑥ _buildTodo 兜底：TodoStore.create 无 domain 自动推断注入；显式 domain 保留
// 运行：node --test test/todo-domain.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261005h';
import {
  MockAdapter,
} from '../../docs/src/data/mock-adapter.js?v=20261005h';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261005h';
import {
  WORK_DOMAIN, WORK_DOMAIN_LABELS, inferDomain, TodoStore,
} from '../../docs/src/services/governance/todo.js?v=20261005h';

// ── localStorage 内存桩（member-persist 同款）─────────────────────
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

/** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（与 loadDB 首启语义一致） */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock'); // 数据源复位
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches（todos 留空直插）
}

// ═══════════════════════════════ ① 枚举 ═══════════════════════════════

test('① WORK_DOMAIN：**6 类**业务域 + NONE（通知/未分类），WORK_DOMAIN_LABELS 中文齐全', () => {
  const values = Object.values(WORK_DOMAIN);
  assert.equal(values.length, 7, '6 类域 + NONE = 7 常量（`D-787` 9 → 6 合并）');
  assert.equal(new Set(values).size, 7, '域值无重复');
  // 业务域值集合（含 NONE）：project 项目（会务·活动·专班 合并）/ attendance 考勤纪律 /
  // inspection 考察 / member-dev 成员发展 / report-up 上报与汇报（决议上报·汇报反馈 合并）/
  // archive 归档宣传 / none 通知未分类
  for (const v of ['project', 'attendance', 'inspection', 'member-dev',
    'report-up', 'archive', 'none']) {
    assert.ok(values.includes(v), `WORK_DOMAIN 含域值 ${v}`);
  }
  assert.equal(WORK_DOMAIN.NONE, 'none', 'NONE = 通知/未分类（轻量，不入域任务计数）');
  // 中文标签（合并后 6 类 + NONE）
  const labels = Object.values(WORK_DOMAIN_LABELS);
  assert.equal(labels.length, 7, 'labels 与枚举一一对应');
  // ⚠ 2026-10-05 支书 `D-787`（逐字「九类 可以再 合并合并 同类项！」）＋ 圈乙「9 → 6 类」：
  //   会务/活动/专班 → 「项目」；决议上报/汇报反馈 → 「上报与汇报」⇒ 期望值随之改准。
  for (const l of ['项目', '考勤纪律', '考察', '成员发展', '上报与汇报',
    '归档宣传', '通知/未分类']) {
    assert.ok(labels.includes(l), `WORK_DOMAIN_LABELS 含「${l}」`);
  }
});

// ═══════════════════════════════ ② 显式 domain ═══════════════════════════════

test('② inferDomain：有 domain 原样返回（含显式 NONE），旧域键按 `D-787` 归一（不覆盖不推断）', () => {
  assert.equal(inferDomain({ domain: 'attendance', actionKey: 'attendance-confirm' }), 'attendance');
  assert.equal(inferDomain({ domain: 'none', actionType: 'read' }), 'none');
  assert.equal(inferDomain({ domain: 'meeting', actionType: 'participate', sourceType: 'taskforce' }), 'project',
    '显式域 > 按 sourceType 的推断（且旧域键 `meeting` 归一为 `project` —— `D-787`）');
  // 存量旧域键读取归一（`_LEGACY_DOMAIN`）：三域合并 + 两域合并，存量 `todo.domain` 不回丢
  for (const [oldD, merged] of [['meeting', 'project'], ['activity', 'project'], ['taskforce', 'project'],
    ['resolution', 'report-up'], ['report', 'report-up']]) {
    assert.equal(inferDomain({ domain: oldD }), merged, `旧域键 ${oldD} → ${merged}`);
  }
});

// ═══════════════════════════════ ③ actionKey/actionType 映射 ═══════════════════════════════

test('③ inferDomain：无 domain 按 actionKey/actionType 推断（spec 三节映射速查）', () => {
  const cases = [
    // attendance 前缀 → 考勤纪律
    [{ actionKey: 'attendance-confirm' }, 'attendance'],
    [{ actionKey: 'attendance-remind' }, 'attendance'],
    [{ actionKey: 'attendance-upload' }, 'attendance'],
    // inspection → 考察
    [{ actionKey: 'inspection-confirm' }, 'inspection'],
    [{ actionKey: 'inspection-remind' }, 'inspection'],
    [{ actionKey: 'inspection-upload' }, 'inspection'],
    // member-confirm / semester → 成员发展
    [{ actionKey: 'member-confirm' }, 'member-dev'],
    [{ actionKey: 'semester-detained-remind' }, 'member-dev'],
    // taskforce 前缀 → 项目（`D-787`：专班并入项目）
    [{ actionKey: 'taskforce-contribution' }, 'project'],
    [{ actionKey: 'taskforce-approval' }, 'project'],
    // resolution → 上报与汇报（`D-787`：决议上报并入上报与汇报）
    [{ actionKey: 'resolution-followup' }, 'report-up'],
    [{ actionKey: 'resolution-followup-remind' }, 'report-up'],
    // archive 前缀（支书 archive-remind/confirm）→ 归档宣传
    [{ actionKey: 'archive-remind' }, 'archive'],
    [{ actionKey: 'archive-confirm' }, 'archive'],
    // 遗留种子 activity-archive（活动材料归档，处理位=宣传）→ 归档宣传
    [{ actionKey: 'activity-archive', actionType: 'submit' }, 'archive'],
    // read / notice → NONE
    [{ actionKey: 'read' }, 'none'],
    [{ actionKey: 'notice-read' }, 'none'],
    [{ actionType: 'read', sourceType: 'notice' }, 'none'],
  ];
  for (const [todo, expected] of cases) {
    assert.equal(inferDomain(todo), expected, `inferDomain(${JSON.stringify(todo)}) 应为 ${expected}`);
  }
});

// ═══════════════════════════════ ④ activity 型按来源/scenario ═══════════════════════════════

test('④ inferDomain：authorize/participate 一律「项目」域（`D-787` 合并后 会务/活动/专班 同域）', () => {
  // sourceType=taskforce → 项目（专班并入项目）
  assert.equal(inferDomain({ actionType: 'authorize', sourceType: 'taskforce' }), 'project');
  assert.equal(inferDomain({ actionType: 'participate', sourceType: 'taskforce' }), 'project');
  // 种子式 actionKey=authorize/participate 同样走 actionType 判定
  assert.equal(inferDomain({ actionKey: 'authorize', sourceType: 'taskforce' }), 'project');
  assert.equal(inferDomain({ actionKey: 'participate', sourceType: 'taskforce' }), 'project');
  // 非 taskforce（activity/缺省）→ 项目（合并后无 scenario 亦为项目）
  assert.equal(inferDomain({ actionType: 'participate', sourceType: 'activity' }), 'project');
  assert.equal(inferDomain({ actionType: 'authorize', sourceType: 'activity' }), 'project');
  assert.equal(inferDomain({ actionType: 'authorize' }), 'project');
  // activity 型携带三会一课 scenarioId（原会务）→ 合并后仍「项目」
  for (const sc of ['branch-party-meeting', 'branch-committee', 'party-group-meeting', 'party-lecture', '组织生活会']) {
    assert.equal(inferDomain({ actionType: 'participate', sourceType: 'activity', scenarioId: sc }), 'project', `scenarioId=${sc}`);
  }
  // theme-party 等实践型 → 项目；scenario 可经 actionData 携带
  assert.equal(inferDomain({ actionType: 'participate', sourceType: 'activity', scenarioId: 'theme-party' }), 'project');
  assert.equal(inferDomain({ actionType: 'participate', sourceType: 'activity', actionData: { scenarioId: 'theme-party' } }), 'project');
  assert.equal(inferDomain({ actionType: 'participate', sourceType: 'activity', actionData: { scenarioId: 'branch-committee' } }), 'project');
});

// ═══════════════════════════════ ⑤ 未知/空 ═══════════════════════════════

test('⑤ inferDomain：未知/空输入 → NONE 且不崩', () => {
  assert.equal(inferDomain(null), 'none');
  assert.equal(inferDomain(undefined), 'none');
  assert.equal(inferDomain({}), 'none');
  assert.equal(inferDomain({ actionKey: 'some-unknown-key' }), 'none');
  assert.equal(inferDomain({ actionType: 'submit' }), 'none', '无业务键/来源的纯 actionType 无法归类 → NONE');
  assert.equal(inferDomain({ category: 'notice' }), 'none');
  assert.equal(inferDomain('not-a-todo'), 'none');
});

// ═══════════════════════════════ ⑥ _buildTodo 兜底 ═══════════════════════════════

test('⑥ _buildTodo 兜底：create 无 domain 自动推断注入；显式 domain 保留', () => {
  beginMockCase();
  const t1 = TodoStore.create({ role: 'disc-commissioner', actionKey: 'attendance-confirm', actionType: 'review', title: '考勤确认' });
  assert.equal(t1.domain, 'attendance', '无 domain → 自动推断注入');
  const t2 = TodoStore.create({ role: 'visitor', actionType: 'participate', sourceType: 'taskforce', sourceId: 'tf-x', title: '参与专班' });
  assert.equal(t2.domain, 'project', '`D-787`：专班并入项目');
  const t3 = TodoStore.create({ role: 'leader', domain: 'meeting', actionKey: 'attendance-confirm', title: '显式域' });
  assert.equal(t3.domain, 'project', '显式 domain 保留（旧域键 `meeting` 写入即归一为 `project`，`D-787`）');
  // 批量创建同样走兜底
  const batch = TodoStore.createBatch([
    { role: 'org-commissioner', actionKey: 'inspection-upload', title: '上传考察' },
    { role: 'prop-commissioner', actionKey: 'archive-confirm', title: '确认归档' },
  ]);
  assert.equal(batch[0].domain, 'inspection');
  assert.equal(batch[1].domain, 'archive');
});
