// role: [工程师]+[AI]
// server/test/thought-review.test.mjs — 思想汇报「审阅（后置、不拦）」服务层（2026-09-18 批次 86 重写）
// 覆盖（mock 形态，纯 node + localStorage 内存桩，member-persist 同做法：
//   beginMockCase 清 mockDB 业务域 + MockAdapter.loadDB 回种子；registerMockAdapter 使
//   persist() 真实落 localStorage 桩 → 可模拟「刷新重载」验证持久化）：
//   ① addThoughtReport 新提交 → **reviewStatus='archived'（提交即入库即归档，取消初阅门）**
//      ＋ 站内通知文案含「已自动归档归集」（不再是「待组织初阅」）
//   ② rejectThoughtReport（组织委员 by=p11 role=org-commissioner）→ needs_revision
//      ＋ reviewHistory 留痕 {decision,note,by,at}；模拟刷新重载后仍为 needs_revision（持久化）
//   ③ rejectThoughtReport 空意见（含纯空白）拒绝；非组织委员（支书 / 本人）拒绝；缺 role 拒绝；
//      已是 needs_revision 的篇目不得重复打回
//   ④ resubmitThoughtReport：仅 needs_revision 且仅本人可重交；重交 → **回 archived**（提交即入库），
//      submittedAt 刷新、reviewHistory 历史保留
//   ⑤ 读取归一（_effective）：无 reviewStatus / 状态非法 → archived；**旧 'pending' → archived**
//      （取消初阅门后「待初阅」不再是待办态）；'needs_revision' 原样保留
//   ⑥ 闭环：提交(archived) → 打回(needs_revision) → 重交(archived)，reviewHistory 全程一段留痕
//   ⑦ 篇目一多：addThoughtReport 连提两篇不撞 id（crypto.randomUUID）
// 运行：node --test test/thought-review.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260921d';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260921d';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260921d';
// namespace 导入：红阶段（新 API 未实现）以 per-test 失败呈现而非整文件链接失败
import * as TR from '../../docs/src/services/thought-report.js?v=20260921d';

// ── localStorage 内存桩（含 key/length）──
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

// 让 persist()（服务写路径汇聚点）真实落 localStorage 桩 → 支持「模拟刷新重载」断言
registerMockAdapter(MockAdapter);

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
  MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 组织委员（高翔宇 p11，role=org-commissioner）审阅执行人；提交人样本：p6 苏明哲（发展对象）
const ORG = { by: 'p11', role: 'org-commissioner' };

/** 最近一条「思想汇报已提交」站内通知（addThoughtReport 每次提交广播一条） */
function lastThoughtNotice() {
  const notices = (mockDB.notices || []).filter(n => n.title === '思想汇报已提交');
  return notices[notices.length - 1];
}

test('① addThoughtReport 新提交 → 提交即入库归档（archived）+ 通知文案含「已自动归档归集」', () => {
  beginMockCase();
  assert.equal(TR.THOUGHT_REVIEW_STATUS.NEEDS_REVISION, 'needs_revision');
  assert.equal(TR.THOUGHT_REVIEW_STATUS.ARCHIVED, 'archived');
  assert.equal(TR.THOUGHT_REVIEW_STATUS.PENDING, undefined, '取消初阅门后不再有「待初阅」态');

  const rec = TR.addThoughtReport({
    personId: 'p6', title: '第三季度思想汇报', content: '本季度思想汇报正文（提交即归档用例）。',
  });
  assert.equal(rec.reviewStatus, 'archived', '新提交直接入库归档（不再等初阅）');
  assert.equal(TR.loadThoughtReports().find(r => r.id === rec.id).reviewStatus, 'archived');
  // 读取侧归一后同样是 archived（本人归集里立刻可见）
  assert.equal(TR.listThoughtReportsByPerson('p6').find(r => r.id === rec.id).reviewStatus, 'archived');

  const notice = lastThoughtNotice();
  assert.ok(notice, '提交后应广播站内通知');
  assert.ok(notice.content.includes('已自动归档归集'), '通知文案应说明已归档归集：' + (notice && notice.content));
  assert.ok(!notice.content.includes('待组织初阅'), '不再出现「待组织初阅」：' + (notice && notice.content));
  // A① 对象级深链（2026-09-10）：直达组织委员工作台「思想汇报」tab 并定位该条（data-tr-id 锚点）
  assert.equal(
    notice.targetUrl,
    `workspace/org.html?tab=thought-review&highlight=${rec.id}`,
    '通知对象级深链：直达组织委员工作台「思想汇报」tab 并定位该条'
  );
});

test('② rejectThoughtReport（组织委员）→ needs_revision + reviewHistory[0]；刷新重载仍成立', () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p7', title: '季度思想汇报', content: '积极分子思想汇报正文。' });
  assert.equal(rec.reviewStatus, 'archived', '起点＝已入库');

  const r = TR.rejectThoughtReport({ id: rec.id, note: '内容偏笼统，请结合本季度具体参加的活动补充细节', ...ORG });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.rec.reviewStatus, 'needs_revision', '打回 → needs_revision（待本人补充）');
  assert.equal(r.rec.reviewHistory.length, 1, '留痕一条');
  const h = r.rec.reviewHistory[0];
  assert.equal(h.decision, 'reject');
  assert.equal(h.note, '内容偏笼统，请结合本季度具体参加的活动补充细节');
  assert.equal(h.by, 'p11');
  assert.ok(h.at && !Number.isNaN(Date.parse(h.at)), '留痕含 at 时间戳');

  // 模拟刷新：persist 已落 localStorage 桩 → 重 loadDB 后仍 needs_revision（双形态持久）
  MockAdapter.loadDB();
  const after = TR.loadThoughtReports().find(x => x.id === rec.id);
  assert.ok(after, '刷新后记录仍在');
  assert.equal(after.reviewStatus, 'needs_revision', '刷新后打回状态持久');
  assert.equal(after.reviewHistory.length, 1, '刷新后留痕持久');
});

test('③ rejectThoughtReport 各类拒绝：空意见 / 越权 / 缺 role / 重复打回', () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p16', title: '预备期思想汇报', content: '预备期内思想汇报正文。' });

  const noNote = TR.rejectThoughtReport({ id: rec.id, ...ORG });
  assert.equal(noNote.ok, false, '无意见应拒绝');
  assert.match(noNote.reason, /意见|必填/);
  assert.equal(TR.loadThoughtReports().find(r => r.id === rec.id).reviewStatus, 'archived', '拒绝失败不改状态');

  const blankNote = TR.rejectThoughtReport({ id: rec.id, note: '   ', ...ORG });
  assert.equal(blankNote.ok, false, '纯空白意见也应拒绝');

  // 支书（p13）代审 → 拒绝
  const bySecretary = TR.rejectThoughtReport({ id: rec.id, note: '代批', by: 'p13', role: 'secretary' });
  assert.equal(bySecretary.ok, false, '支书非组织委员不得审阅打回');
  assert.match(bySecretary.reason, /组织委员|权限/);

  // 提交人本人（participant）自审 → 拒绝
  const bySelf = TR.rejectThoughtReport({ id: rec.id, note: '自查', by: 'p16', role: 'participant' });
  assert.equal(bySelf.ok, false, '提交人本人不得自审');
  assert.match(bySelf.reason, /组织委员|权限/);

  // 缺 role 同样拒绝
  const noRole = TR.rejectThoughtReport({ id: rec.id, note: 'x', by: 'p11' });
  assert.equal(noRole.ok, false, '缺 role 不得审阅');

  assert.equal(TR.loadThoughtReports().find(r => r.id === rec.id).reviewStatus, 'archived', '越权尝试不改状态');

  // 合法打回后再打回 → 拒绝（已是待补充态）
  const first = TR.rejectThoughtReport({ id: rec.id, note: '请补充具体事例', ...ORG });
  assert.equal(first.ok, true);
  const again = TR.rejectThoughtReport({ id: rec.id, note: '再打一次', ...ORG });
  assert.equal(again.ok, false, '已打回、待本人补充的篇目不得重复打回');
  assert.match(again.reason, /已打回|待本人补充/);
});

test('④ resubmitThoughtReport：仅 needs_revision 且仅本人；重交 → 回 archived', async () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p6', title: '季度思想汇报', content: '第一版正文。' });
  TR.rejectThoughtReport({ id: rec.id, note: '篇幅不足，请扩充', ...ORG });

  // 非本人重交 → 拒绝
  const byOther = TR.resubmitThoughtReport({ id: rec.id, content: '他人代写', by: 'p7' });
  assert.equal(byOther.ok, false, '非本人不得重交');
  assert.match(byOther.reason, /本人/);

  // 已入库（未被打回）不可重交
  await sleep(3);
  const archivedRec = TR.addThoughtReport({ personId: 'p7', title: '另一篇', content: '新正文。' });
  const fromArchived = TR.resubmitThoughtReport({ id: archivedRec.id, content: 'x', by: 'p7' });
  assert.equal(fromArchived.ok, false, '仅被打回可重交');
  assert.match(fromArchived.reason, /打回|退回|需修改/);

  // 本人合法重交
  const oldAt = rec.submittedAt;
  await sleep(3);
  const res = TR.resubmitThoughtReport({ id: rec.id, content: '扩充后的第二版正文：具体事例……', by: 'p6' });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.rec.reviewStatus, 'archived', '重交即入库归档（不再回「待初阅」）');
  assert.equal(res.rec.content, '扩充后的第二版正文：具体事例……');
  assert.ok(res.rec.submittedAt > oldAt, 'submittedAt 刷新为新的提交时间');
  assert.equal(res.rec.reviewHistory.length, 1, '重交保留审阅历史（打回留痕）');
});

test('⑤ 读取归一：无状态 / 非法状态 / 旧 pending → archived；needs_revision 保留', () => {
  beginMockCase();
  // 直接注入四种形态（旧 seed tr-1~tr-3 无 reviewStatus；另三种为历史 / 脏值）
  mockDB.thoughtReports = [
    { id: 'tr-none', personId: 'p6', title: '无状态', content: '正文。', submittedAt: '2026-07-20T09:00:00' },
    { id: 'tr-pending', personId: 'p6', title: '旧待初阅', content: '正文。', submittedAt: '2026-07-21T09:00:00', reviewStatus: 'pending' },
    { id: 'tr-bad', personId: 'p6', title: '脏值', content: '正文。', submittedAt: '2026-07-22T09:00:00', reviewStatus: 'whatever' },
    { id: 'tr-needs', personId: 'p6', title: '已打回', content: '正文。', submittedAt: '2026-07-23T09:00:00', reviewStatus: 'needs_revision' },
  ];
  const byId = new Map(TR.listThoughtReportsByPerson('p6').map(r => [r.id, r]));
  assert.equal(byId.get('tr-none').reviewStatus, 'archived', '无状态 → 已入库');
  assert.equal(byId.get('tr-pending').reviewStatus, 'archived', '旧 pending → 已入库（取消初阅门）');
  assert.equal(byId.get('tr-bad').reviewStatus, 'archived', '非法状态 → 已入库');
  assert.equal(byId.get('tr-needs').reviewStatus, 'needs_revision', '已打回原样保留');
  // 归一后仍计入个人归集（一篇不丢）
  assert.equal(TR.countThoughtReportsByPerson('p6'), 4);
});

test('⑥ 闭环：提交(archived) → 打回(needs_revision) → 重交(archived)（留痕保留）', async () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p6', title: '季度思想汇报', content: 'v1 正文。' });
  assert.equal(rec.reviewStatus, 'archived', '闭环起点：提交即入库');

  const rejectR = TR.rejectThoughtReport({ id: rec.id, note: '第一轮意见：理论部分需联系实际', ...ORG });
  assert.equal(rejectR.ok, true);
  assert.equal(rejectR.rec.reviewStatus, 'needs_revision');

  await sleep(3);
  const rs = TR.resubmitThoughtReport({ id: rec.id, content: 'v2 正文（已按意见修改）', by: 'p6' });
  assert.equal(rs.ok, true, JSON.stringify(rs));
  assert.equal(rs.rec.reviewStatus, 'archived', '闭环终点：重交即入库');
  assert.equal(rs.rec.content, 'v2 正文（已按意见修改）', '入库保留终稿内容');
  assert.deepEqual(rs.rec.reviewHistory.map(h => h.decision), ['reject'], '留痕保留');
  assert.equal(rs.rec.reviewHistory[0].by, 'p11');
});

test('⑦ 连提两篇不撞 id（crypto.randomUUID；原 Date.now 形态的回归位）', () => {
  beginMockCase();
  const a = TR.addThoughtReport({ personId: 'p6', title: 'A 篇', content: 'A 正文。' });
  const b = TR.addThoughtReport({ personId: 'p6', title: 'B 篇', content: 'B 正文。' });
  assert.notEqual(a.id, b.id, '同毫秒连提两篇不得撞 id');
  assert.equal(TR.loadThoughtReports().filter(r => r.id === a.id).length, 1);
  assert.equal(TR.loadThoughtReports().filter(r => r.id === b.id).length, 1);
});
