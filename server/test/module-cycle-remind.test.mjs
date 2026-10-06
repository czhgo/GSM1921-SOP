// role: [工程师]+[AI]
// server/test/module-cycle-remind.test.mjs — `R-29⑤` 落地（2026-10-06 批次 423 · `D-804`）：
//   **按模块自动生成周期性任务** 的常驻判据。
// 口径（三条单一源，不许新造第二份映射——`D-803②`）：
//   ① 周期来源＝`docs/src/core/domain/work-map.js::WORK_MAP_MODULES[].cycle`（只填母本可核者）；
//   ② 期键＝`docs/src/core/base/period.js::cyclePeriodOf`（月/季/半年/年）；
//   ③ 「本期已开展」判据＝本模块本期**存在对应活动**（活动类型权威子类名 ↔ 模块 `name`）。
// 断言面：单一源自洽（C1）· 期键与标签（C2）· 未开展 ⇒ 出组（C3）· 已开展 ⇒ 不出（C4）
//   · 非本主体 ⇒ 不出（C5）· 支部改派随分工走（C6）· 空组不产生（C7）· 域标注在位（C8）。
// 运行：node --test test/module-cycle-remind.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261006b';
import { setDataSource } from '../../docs/src/data/data-adapter.js?v=20261006b';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261006b';
import {
  WORK_MAP_MODULES, ownerOfModule, moduleIdOfActivity, modulesWithCycle, cycleOfModule, expandWorkforce,
} from '../../docs/src/core/domain/work-map.js?v=20261006b';
import {
  CYCLE_UNITS, CYCLE_UNIT_LABELS, cyclePeriodOf, cyclePeriodLabel,
} from '../../docs/src/core/base/period.js?v=20261006b';
import {
  REALTIME_GROUP_DOMAIN, MODULE_CYCLE_ACTION_KEY, buildModuleCycleRemindGroup,
} from '../../docs/src/services/governance/todo.js?v=20261006b';

// ── localStorage 内存桩（与 todo-deriver-domain 同款）─────────────
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

function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of ['activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos']) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB();
}

// ═══════════════ C1 单一源自洽 ═══════════════

test('C1 周期单一源：只在模块表上（不另立映射），取值集与标签自洽', () => {
  const ids = modulesWithCycle();
  // 母本可核者只有两处（《党小组组长工作手册》§2.1 的「党小组日常活动每月至少 1 次」）：
  // 会议形态＝党小组会、活动形态＝主题党日。其余模块**不填**（如实登记，见 `D-804`）。
  assert.deepEqual(ids, ['party-group-meeting', 'theme-party'], '有制度周期的模块＝母本可核的那两个');

  for (const id of ids) {
    const cyc = cycleOfModule(id);
    assert.ok(cyc && CYCLE_UNITS.includes(cyc.unit), `${id} 的 cycle.unit 必须在 CYCLE_UNITS 取值集内`);
    assert.ok(typeof cyc.source === 'string' && cyc.source.length > 0, `${id} 的 cycle.source（母本出处）不得为空`);
    assert.ok(CYCLE_UNIT_LABELS[cyc.unit], `${id} 的 cycle.unit 必须有中文标签`);
  }
  // 反向：无周期字段的模块一律不派生（`cycleOfModule` 给 null）
  const noCycle = WORK_MAP_MODULES.filter((m) => !cycleOfModule(m.id)).map((m) => m.id);
  assert.ok(noCycle.length >= 10, `未填周期的模块应占多数（实为 ${noCycle.length} 个）`);

  // 活动类型 → 模块：判据＝权威子类名 ↔ 模块 name；两种历史写法都要归一命中
  assert.equal(moduleIdOfActivity({ type: '党小组会' }), 'party-group-meeting');
  assert.equal(moduleIdOfActivity({ type: '三会一课·党小组会' }), 'party-group-meeting');
  assert.equal(moduleIdOfActivity({ type: '主题党日' }), 'theme-party');
  assert.equal(moduleIdOfActivity({ type: '支委会' }), 'branch-committee-meeting');
  assert.equal(moduleIdOfActivity({ type: '不存在的类型' }), null, '无命中 ⇒ null（不造新枚举）');
  assert.equal(moduleIdOfActivity(null), null);
  assert.equal(moduleIdOfActivity({}), null);

  // 模块主责：停用 / 无主责 ⇒ null
  assert.equal(ownerOfModule('party-group-meeting', null).ownerId, 'leader', '缺省分工兜底＝defaultOwner');
  assert.equal(ownerOfModule('party-group-meeting', { 'party-group-meeting': { ownerType: 'none', ownerId: '' } }), null, '停用 ⇒ null');
  assert.equal(ownerOfModule('不存在的模块', null), null);
});

// ═══════════════ C2 期键与标签 ═══════════════

test('C2 周期期键：四单位各取其自然周期；非法输入不抛错', () => {
  assert.equal(cyclePeriodOf('2026-10-15', 'month'), '2026-10');
  assert.equal(cyclePeriodOf('2026-10-15', 'quarter'), '2026-Q4');
  assert.equal(cyclePeriodOf('2026-04-01', 'quarter'), '2026-Q2');
  assert.equal(cyclePeriodOf('2026-10-15', 'half-year'), '2026-H2');
  assert.equal(cyclePeriodOf('2026-03-31', 'half-year'), '2026-H1');
  assert.equal(cyclePeriodOf('2026-10-15', 'year'), '2026');
  // 与既有半年口径同源（services/governance/todo.js::halfYearPeriodOf）
  assert.equal(cyclePeriodOf('2026-07-01', 'half-year'), '2026-H2');
  // 非法：坏日期 / 坏单位 / 坏月份
  assert.equal(cyclePeriodOf('', 'month'), null);
  assert.equal(cyclePeriodOf('2026-13-01', 'month'), null);
  assert.equal(cyclePeriodOf('2026-10-15', 'week'), null);
  assert.equal(cyclePeriodOf(null, 'month'), null);

  assert.equal(cyclePeriodLabel('2026-10', 'month'), '2026年10月');
  assert.equal(cyclePeriodLabel('2026-Q4', 'quarter'), '2026年第四季度');
  assert.equal(cyclePeriodLabel('2026-H2', 'half-year'), '2026年下半年');
  assert.equal(cyclePeriodLabel('2026', 'year'), '2026年');
  assert.equal(cyclePeriodLabel('乱七八糟', 'month'), '乱七八糟', '非法期键原样返回（不抛错）');
});

// ═══════════════ C3/C4 「本期是否已开展」 ═══════════════

test('C3 本期未见对应活动 ⇒ 出组（组长台；会议与活动两个形态都出）', () => {
  beginMockCase();
  const g = buildModuleCycleRemindGroup({
    activities: [{ id: 'a1', type: '党小组会', date: '2026-09-10' }], // 上月 → 本期不算
    subjectIds: ['leader'],
    today: '2026-10-15',
  });
  assert.ok(g, '有未开展模块 ⇒ 出组（不得是空组）');
  assert.equal(g.actionKey, MODULE_CYCLE_ACTION_KEY);
  assert.deepEqual(g.items.map((i) => i.moduleId), ['party-group-meeting', 'theme-party'], '顺序＝模块表顺序');
  assert.equal(g.items[0].title, '2026年10月的「党小组会」尚未开展');
  assert.equal(g.items[0].period, '2026-10');
  assert.equal(g.items[0].ownerId, 'leader');
});

test('C4 本期已有对应活动 ⇒ 该模块不出（另一模块照出）', () => {
  beginMockCase();
  const g = buildModuleCycleRemindGroup({
    activities: [
      { id: 'a1', type: '三会一课·党小组会', date: '2026-10-08' }, // 本期、且是历史写法 → 归一后应命中
      { id: 'a2', type: '主题党日', date: '2026-09-20' },          // 上月 → 不影响本期
    ],
    subjectIds: ['leader'],
    today: '2026-10-15',
  });
  assert.deepEqual(g.items.map((i) => i.moduleId), ['theme-party'], '党小组会本期已开展 ⇒ 只剩主题党日');
});

// ═══════════════ C5/C6 主体与改派 ═══════════════

test('C5 非本台主体主责的模块一律不出（本台无周期模块 ⇒ null）', () => {
  beginMockCase();
  assert.equal(buildModuleCycleRemindGroup({ activities: [], subjectIds: ['org-commissioner'], today: '2026-10-15' }), null);
  assert.equal(buildModuleCycleRemindGroup({ activities: [], subjectIds: [], today: '2026-10-15' }), null, '无主体 ⇒ 不出组');
  assert.equal(buildModuleCycleRemindGroup({ activities: [], subjectIds: ['leader'], today: '坏日期' }), null, '坏日期 ⇒ 不出组（不抛错）');
});

test('C6 支部改派随分工快照走（到人 ⇒ 该人可见；该角色不再出）', () => {
  beginMockCase();
  // 分工快照 = `expandWorkforce` 展开后（支部改派项 ＋ 缺省兜底）——调用方契约同 `getBranchWorkforce`
  const snapshot = expandWorkforce({ 'party-group-meeting': { ownerType: 'person', ownerId: 'p3' } });
  const asP3 = buildModuleCycleRemindGroup({ activities: [], subjectIds: ['p3'], snapshot, today: '2026-10-15' });
  assert.deepEqual(asP3.items.map((i) => i.moduleId), ['party-group-meeting'],
    'p3 只领改派到的党小组会（主题党日仍归 leader 角色，不在本主体集内）');
  const asLeader = buildModuleCycleRemindGroup({ activities: [], subjectIds: ['leader'], snapshot, today: '2026-10-15' });
  assert.deepEqual(asLeader.items.map((i) => i.moduleId), ['theme-party'], '党小组会已改派给 p3 ⇒ leader 不再出该条');

  // 停用（方法类）⇒ 不出；此处用同一停机位验证「none 一律跳过」
  const off = buildModuleCycleRemindGroup({
    activities: [], subjectIds: ['leader'],
    snapshot: expandWorkforce({ 'theme-party': { ownerType: 'none', ownerId: '' } }),
    today: '2026-10-15',
  });
  assert.deepEqual(off.items.map((i) => i.moduleId), ['party-group-meeting'], '停用模块不出条');
});

// ═══════════════ C7/C8 空组与域标注 ═══════════════

test('C7 两个模块本期都已开展 ⇒ 不出空组', () => {
  beginMockCase();
  const g = buildModuleCycleRemindGroup({
    activities: [
      { id: 'a1', type: '党小组会', date: '2026-10-08' },
      { id: 'a2', type: '主题党日', date: '2026-10-12' },
    ],
    subjectIds: ['leader'],
    today: '2026-10-15',
  });
  assert.equal(g, null, '无未开展模块 ⇒ null（不产生空组卡）');
});

test('C8 组对象自带 actionKey 且域标注在位（供 T4 域折组）', () => {
  beginMockCase();
  assert.equal(REALTIME_GROUP_DOMAIN[MODULE_CYCLE_ACTION_KEY], 'project', '周期提醒归「项目」域（D-787 同域）');
  const g = buildModuleCycleRemindGroup({ activities: [], subjectIds: ['leader'], today: '2026-10-15' });
  assert.equal(g.actionKey, MODULE_CYCLE_ACTION_KEY);
  assert.equal(g.domain, 'project');
  assert.equal(g.count, g.items.length);
});
