// role: [工程师]+[AI]
// server/test/thought-review.test.mjs — R6-2 思想汇报「把关式初阅」状态机 服务层（2026-09-07）
// 覆盖（mock 形态，纯 node + localStorage 内存桩，member-persist 同做法：
//   beginMockCase 清 mockDB 业务域 + MockAdapter.loadDB 回种子；registerMockAdapter 使
//   persist() 真实落 localStorage 桩 → 可模拟「刷新重载」验证持久化）：
//   ① addThoughtReport 新提交 → reviewStatus='pending'（待组织初阅）+ 站内通知文案含「待组织初阅」
//   ② reviewThoughtReport approve（组织委员 by=p11 role=org-commissioner）→ archived + reviewHistory[0]
//      {decision,note,by,at} 留痕；模拟刷新重载后仍 archived（持久化）
//   ③ reviewThoughtReport reject：空意见（含纯空白）拒绝且状态不动；非空意见 → needs_revision
//   ④ reviewThoughtReport 非组织委员角色（支书 / 提交人本人）→ {ok:false} 且状态不动
//   ⑤ resubmitThoughtReport：仅 needs_revision 且仅本人可重交；改 content 回 pending（submittedAt 刷新、历史保留）
//   ⑥ 闭环：pending → reject → resubmit(pending) → approve → archived，reviewHistory 全程两段留痕
//   ⑦ 旧数据（无 reviewStatus，R6-2 前算法归档产物）经 _effective 归一为 archived：
//      不计入待初阅队列、不可再初阅；新提交仍为 pending
//      （2026-09-13 seed 新增 tr-4 演示用待初阅样本 → 「旧数据形态」断言收窄至 tr-1/tr-2/tr-3）
//   ⑧ listPendingReviews：仅 pending，按 submittedAt 升序
// 运行：node --test test/thought-review.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260914m';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260914m';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260914m';
// namespace 导入：红阶段（新 API 未实现）以 per-test 失败呈现而非整文件链接失败
import * as TR from '../../docs/src/services/thought-report.js?v=20260914m';

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

// 组织委员（高翔宇 p11，role=org-commissioner）初阅执行人；提交人样本：p6 苏明哲（发展对象）
const ORG = { by: 'p11', role: 'org-commissioner' };

/** 最近一条「思想汇报已提交」站内通知（addThoughtReport 每次提交广播一条） */
function lastThoughtNotice() {
  const notices = (mockDB.notices || []).filter(n => n.title === '思想汇报已提交');
  return notices[notices.length - 1];
}

test('① addThoughtReport 新提交 → pending + 通知文案含「待组织初阅」', () => {
  beginMockCase();
  assert.equal(TR.THOUGHT_REVIEW_STATUS.PENDING, 'pending');
  assert.equal(TR.THOUGHT_REVIEW_STATUS.NEEDS_REVISION, 'needs_revision');
  assert.equal(TR.THOUGHT_REVIEW_STATUS.ARCHIVED, 'archived');

  // 2026-09-13：seed 含 1 条演示用待初阅（tr-4），待初阅队列基线做增量断言，不写死绝对值
  const pendingBefore = TR.listPendingReviews().length;
  const rec = TR.addThoughtReport({
    personId: 'p6', title: '第三季度思想汇报', content: '本季度思想汇报正文（R6-2 初阅用例）。',
  });
  assert.equal(rec.reviewStatus, 'pending', '新提交默认待组织初阅');
  assert.equal(TR.loadThoughtReports().find(r => r.id === rec.id).reviewStatus, 'pending');

  const notice = lastThoughtNotice();
  assert.ok(notice, '提交后应广播站内通知');
  assert.ok(notice.content.includes('待组织初阅'), '通知文案应提示待组织初阅：' + (notice && notice.content));
  // A① 对象级深链（2026-09-10）：直达组织委员工作台「思想汇报」tab 并定位该条（data-tr-id 锚点），
  // 旧断言 workspace/org.html 已随深链升级作废——按新语义校验 tab + 对象 id，不弱化。
  assert.equal(
    notice.targetUrl,
    `workspace/org.html?tab=thought-review&highlight=${rec.id}`,
    '通知对象级深链：直达组织委员工作台「思想汇报」tab 并定位该条'
  );

  const pending = TR.listPendingReviews();
  assert.equal(pending.length, pendingBefore + 1, '新提交进入待初阅队列');
  assert.ok(pending.some(x => x.id === rec.id), '新提交在待初阅队列中');
});

test('② reviewThoughtReport approve（组织委员）→ archived + reviewHistory[0]；刷新重载仍归档', () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p7', title: '季度思想汇报', content: '积极分子思想汇报正文。' });

  const r = TR.reviewThoughtReport({
    id: rec.id, decision: 'approve', note: '内容真实具体，同意归档', ...ORG,
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.rec.reviewStatus, 'archived', '初阅通过 → 归档');
  assert.equal(r.rec.reviewHistory.length, 1, '留痕一条');
  const h = r.rec.reviewHistory[0];
  assert.equal(h.decision, 'approve');
  assert.equal(h.note, '内容真实具体，同意归档');
  assert.equal(h.by, 'p11');
  assert.ok(h.at && !Number.isNaN(Date.parse(h.at)), '留痕含 at 时间戳');
  assert.equal(TR.listPendingReviews().some(x => x.id === rec.id), false, '通过后退出待初阅队列');

  // 模拟刷新：persist 已落 localStorage 桩 → 重 loadDB 后仍 archived（双形态持久）
  MockAdapter.loadDB();
  const after = TR.loadThoughtReports().find(x => x.id === rec.id);
  assert.ok(after, '刷新后记录仍在');
  assert.equal(after.reviewStatus, 'archived', '刷新后归档状态持久');
  assert.equal(after.reviewHistory.length, 1, '刷新后留痕持久');
});

test('③ reviewThoughtReport reject：空意见（含纯空白）拒绝；非空 → needs_revision', () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p16', title: '预备期思想汇报', content: '预备期内思想汇报正文。' });

  const noNote = TR.reviewThoughtReport({ id: rec.id, decision: 'reject', ...ORG });
  assert.equal(noNote.ok, false, 'reject 无意见应拒绝');
  assert.match(noNote.reason, /意见|必填/);
  assert.equal(TR.loadThoughtReports().find(r => r.id === rec.id).reviewStatus, 'pending', '拒绝失败不改状态');

  const blankNote = TR.reviewThoughtReport({ id: rec.id, decision: 'reject', note: '   ', ...ORG });
  assert.equal(blankNote.ok, false, 'reject 纯空白意见也应拒绝');

  const okReject = TR.reviewThoughtReport({
    id: rec.id, decision: 'reject', note: '请补充参加支部活动的具体事例与思想转变过程', ...ORG,
  });
  assert.equal(okReject.ok, true, JSON.stringify(okReject));
  assert.equal(okReject.rec.reviewStatus, 'needs_revision', '打回 → needs_revision');
  assert.equal(okReject.rec.reviewHistory.length, 1);
  assert.equal(okReject.rec.reviewHistory[0].decision, 'reject');
  assert.equal(okReject.rec.reviewHistory[0].note, '请补充参加支部活动的具体事例与思想转变过程');
  assert.equal(TR.listPendingReviews().some(x => x.id === rec.id), false, '打回后退出待初阅队列');
});

test('④ reviewThoughtReport 非组织委员角色 → 拒绝且状态不动', () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p6', title: '思想汇报', content: '正文内容。' });

  // 支书（p13）代初阅 → 拒绝
  const bySecretary = TR.reviewThoughtReport({ id: rec.id, decision: 'approve', note: '代批', by: 'p13', role: 'secretary' });
  assert.equal(bySecretary.ok, false, '支书非组织委员不得初阅');
  assert.match(bySecretary.reason, /组织委员|权限/);

  // 提交人本人（participant）自审 → 拒绝
  const bySelf = TR.reviewThoughtReport({ id: rec.id, decision: 'approve', note: '自查', by: 'p6', role: 'participant' });
  assert.equal(bySelf.ok, false, '提交人本人不得自审');
  assert.match(bySelf.reason, /组织委员|权限/);

  // 缺 role 同样拒绝
  const noRole = TR.reviewThoughtReport({ id: rec.id, decision: 'approve', note: 'x', by: 'p11' });
  assert.equal(noRole.ok, false, '缺 role 不得初阅');

  assert.equal(TR.loadThoughtReports().find(r => r.id === rec.id).reviewStatus, 'pending', '越权尝试不改状态');
  assert.ok(TR.listPendingReviews().some(x => x.id === rec.id), '越权尝试后仍在待初阅队列');
});

test('⑤ resubmitThoughtReport：仅 needs_revision 且仅本人；改 content 回 pending', async () => {
  beginMockCase();
  const rec = TR.addThoughtReport({ personId: 'p6', title: '季度思想汇报', content: '第一版正文。' });
  TR.reviewThoughtReport({ id: rec.id, decision: 'reject', note: '字数不足，请扩充', ...ORG });

  // 非本人重交 → 拒绝
  const byOther = TR.resubmitThoughtReport({ id: rec.id, content: '他人代写', by: 'p7' });
  assert.equal(byOther.ok, false, '非本人不得重交');
  assert.match(byOther.reason, /本人/);

  // pending（未被打回）不可重交
  await sleep(3);
  const pendingRec = TR.addThoughtReport({ personId: 'p7', title: '另一篇', content: '新正文。' });
  const fromPending = TR.resubmitThoughtReport({ id: pendingRec.id, content: 'x', by: 'p7' });
  assert.equal(fromPending.ok, false, '仅被打回可重交');
  assert.match(fromPending.reason, /打回|退回|需修改/);

  // 本人合法重交
  const oldAt = rec.submittedAt;
  await sleep(3);
  const res = TR.resubmitThoughtReport({ id: rec.id, content: '扩充后的第二版正文：具体事例……', by: 'p6' });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.rec.reviewStatus, 'pending', '重交 → 回到待初阅');
  assert.equal(res.rec.content, '扩充后的第二版正文：具体事例……');
  assert.ok(res.rec.submittedAt > oldAt, 'submittedAt 刷新为新的提交时间');
  assert.equal(res.rec.reviewHistory.length, 1, '重交保留初阅历史（reject 留痕）');
  assert.ok(TR.listPendingReviews().some(x => x.id === rec.id), '重交后重新进入待初阅队列');
});

test('⑥ 闭环：pending → reject → resubmit(pending) → approve → archived（reviewHistory 全程两段）', async () => {
  beginMockCase();
  // 2026-09-13：seed 常驻 1 条演示用待初阅（tr-4），闭环内计数以种子基线为底
  const seedPending = TR.listPendingReviews().length;
  const rec = TR.addThoughtReport({ personId: 'p6', title: '季度思想汇报', content: 'v1 正文。' });
  assert.equal(TR.listPendingReviews().length, seedPending + 1, '闭环起点：新提交 1 篇待初阅（种子 tr-4 常驻）');

  const rejectR = TR.reviewThoughtReport({ id: rec.id, decision: 'reject', note: '第一轮意见：理论部分需联系实际', ...ORG });
  assert.equal(rejectR.ok, true);
  assert.equal(rejectR.rec.reviewStatus, 'needs_revision');
  assert.equal(TR.listPendingReviews().some(x => x.id === rec.id), false, '打回后该篇退出待初阅队列');
  assert.equal(TR.listPendingReviews().length, seedPending, '打回后仅剩种子 tr-4');

  await sleep(3);
  const rs = TR.resubmitThoughtReport({ id: rec.id, content: 'v2 正文（已按意见修改）', by: 'p6' });
  assert.equal(rs.ok, true, JSON.stringify(rs));
  assert.equal(rs.rec.reviewStatus, 'pending');
  assert.equal(TR.listPendingReviews().length, seedPending + 1, '重交后回到待初阅（含种子 tr-4）');

  const approveR = TR.reviewThoughtReport({ id: rec.id, decision: 'approve', note: '修改到位，同意归档', ...ORG });
  assert.equal(approveR.ok, true);
  assert.equal(approveR.rec.reviewStatus, 'archived', '闭环终点：归档');
  assert.equal(approveR.rec.content, 'v2 正文（已按意见修改）', '归档保留终稿内容');
  assert.equal(TR.listPendingReviews().some(x => x.id === rec.id), false, '闭环后该篇退出待初阅队列');
  assert.equal(TR.listPendingReviews().length, seedPending, '闭环后仅剩种子 tr-4');
  assert.deepEqual(approveR.rec.reviewHistory.map(h => h.decision), ['reject', 'approve'], '全程两段留痕');
  assert.equal(approveR.rec.reviewHistory[0].by, 'p11');
  assert.equal(approveR.rec.reviewHistory[1].by, 'p11');
});

test('⑦ 旧数据（无 reviewStatus）经 _effective 归一为 archived：不进队列、不可初阅', () => {
  beginMockCase();
  // seed 基线：tr-1(p6)/tr-2(p7)/tr-3(p16) 均为 R6-2 前算法归档产物，无 reviewStatus；
  // 另有 tr-4（演示用待初阅样本，见 mock/thought-reports.js），故「旧数据形态」断言收窄到 tr-1/tr-2/tr-3
  const OLD_SEED_IDS = ['tr-1', 'tr-2', 'tr-3'];
  const seeds = TR.loadThoughtReports();
  assert.ok(seeds.length >= 3, 'seed 思想汇报存在');
  const oldSeeds = seeds.filter(r => OLD_SEED_IDS.includes(r.id));
  assert.equal(oldSeeds.length, 3, '旧数据种子 tr-1/tr-2/tr-3 齐全');
  assert.ok(oldSeeds.every(r => !('reviewStatus' in r)), '旧数据种子均无 reviewStatus（R6-2 前形态）');

  // 按人归集读侧归一
  for (const r of TR.listThoughtReportsByPerson('p6')) {
    assert.equal(r.reviewStatus, 'archived', '旧数据读取视为已归档');
  }
  assert.equal(TR.countThoughtReportsByPerson('p6'), 1, '旧数据仍计入个人归集');
  const queue0 = TR.listPendingReviews();
  assert.equal(queue0.some(r => OLD_SEED_IDS.includes(r.id)), false, '旧数据（tr-1/tr-2/tr-3）不入待初阅队列');
  assert.equal(queue0.length, 1, '队列中仅演示用待初阅种子 tr-4');

  // 旧数据（已归档语义）不可再初阅
  const rOld = TR.reviewThoughtReport({ id: 'tr-1', decision: 'approve', note: '补阅', ...ORG });
  assert.equal(rOld.ok, false, '已归档旧数据不可再初阅');
  assert.match(rOld.reason, /待初阅/);

  // 新提交仍为 pending 进队列，与旧数据（及种子 tr-4）并存
  const rec = TR.addThoughtReport({ personId: 'p6', title: '新一季思想汇报', content: 'R6-2 模式下的新提交。' });
  assert.equal(rec.reviewStatus, 'pending');
  const queueAfter = TR.listPendingReviews();
  assert.equal(queueAfter.length, 2, '新提交 1 篇 + 演示用待初阅种子 tr-4');
  assert.ok(queueAfter.some(x => x.id === rec.id), '新提交在队列中（与旧数据并存）');
  assert.equal(TR.countThoughtReportsByPerson('p6'), 2, '新增计入个人归集');
});

test('⑧ listPendingReviews：仅 pending 且按 submittedAt 升序', async () => {
  beginMockCase();
  const a = TR.addThoughtReport({ personId: 'p6', title: 'A 篇', content: 'A 正文。' });
  await sleep(3);
  const b = TR.addThoughtReport({ personId: 'p7', title: 'B 篇', content: 'B 正文。' });
  await sleep(3);
  const c = TR.addThoughtReport({ personId: 'p16', title: 'C 篇', content: 'C 正文。' });
  TR.reviewThoughtReport({ id: c.id, decision: 'reject', note: 'C 打回', ...ORG });

  // 2026-09-13：seed 常驻 1 条演示用待初阅（tr-4），故在 A/B/C 域内取子集校验顺序与状态
  const pending = TR.listPendingReviews();
  const mine = pending.filter(x => [a.id, b.id, c.id].includes(x.id));
  assert.equal(pending.length, 3, '队列 = A/B + 演示用待初阅种子 tr-4（打回的 C 不在队列）');
  assert.deepEqual(mine.map(x => x.id), [a.id, b.id], '按提交时间升序：先提交在前');
  const times = mine.map(x => x.submittedAt);
  assert.ok(times[0] < times[1], `升序校验：${times[0]} < ${times[1]}`);
  for (const x of mine) assert.equal(x.reviewStatus, 'pending');
});
