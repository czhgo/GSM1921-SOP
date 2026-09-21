// role: [工程师]+[AI]
// server/test/thought-report-panel.test.mjs — 思想汇报「面板数据」模型（2026-09-13 支书裁定）
// 覆盖：
//   ① 期次（period）手填优先；缺省 / 非法 → 按 submittedAt 推导兜底
//   ② 面板数据：同一 personId **同一期次可多篇**（数据层无唯一性约束）
//   ③ 按人按期次归集（listThoughtReportsByPersonGrouped）：组内多篇、组间期次倒序
//   ④ 存量/脏值归一：无 period、非法 period 的记录读取时按 submittedAt 推导
//   ⑤ 篇幅口径（`SOP-B-11`）：**三个数各是各的**——建议 1500（wordHint）· 警告审阅线 1200
//      （wordSoftMin）· **一律不影响提交**（过短照常提交并入库归档）
//   ⑥ 期次标签/选项（单一源 core/period.js）
// 运行：node --test test/thought-report-panel.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260921g';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260921g';
import { setDataSource, registerMockAdapter } from '../../docs/src/core/data-adapter.js?v=20260921g';
import { POLICY_DEFAULTS } from '../../docs/src/core/policy-defaults.js?v=20260921g';
import * as TR from '../../docs/src/services/thought-report.js?v=20260921g';

// ── localStorage 内存桩（与 thought-review.test.mjs 同做法）──
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
registerMockAdapter(MockAdapter);

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
  setDataSource('mock');
  MockAdapter.loadDB();
}

const LONG = '本季度我系统学习了党的创新理论与党章党规，结合支部组织生活会的批评与自我批评，'
  + '对照党员标准逐条查找差距，并在活动筹备与群众联系中检验所学。'.repeat(45); // 明显超过 wordSoftMin

test('① 期次：手填优先（跨季补交归对期次）；缺省/非法按 submittedAt 推导', () => {
  beginMockCase();
  const nowPeriod = TR.periodOf(new Date().toISOString());

  // 手填「2026-Q1」而当前提交时间属 2026-Q3 → 归属以手填为准（这就是手填优于自动归属的理由）
  const hand = TR.addThoughtReport({ personId: 'p6', title: '第一季度补交', content: LONG, period: '2026-Q1' });
  assert.equal(hand.period, '2026-Q1', '手填期次优先，不按提交时间改写');

  const auto = TR.addThoughtReport({ personId: 'p7', title: '未填期次', content: LONG });
  assert.equal(auto.period, nowPeriod, '缺省期次按 submittedAt 推导');

  const illegal = TR.addThoughtReport({ personId: 'p16', title: '非法期次', content: LONG, period: '2026-Q9' });
  assert.equal(illegal.period, nowPeriod, '非法期次（Q9）回落按 submittedAt 推导');
});

test('② 面板数据：同一 personId 同一期次可多篇（无唯一性约束）', () => {
  beginMockCase();
  // 注：首次写入会把种子（THOUGHT_REPORTS）物化进 mockDB（loadThoughtReports 的空表回退），
  // 故本用例以「增量」断言，不写死绝对篇数。
  const before = TR.countThoughtReportsByPerson('p6');
  const a = TR.addThoughtReport({ personId: 'p6', title: '季度汇报正稿', content: LONG, period: '2026-Q2' });
  const b = TR.addThoughtReport({ personId: 'p6', title: '季度汇报补充稿', content: LONG, period: '2026-Q2' });

  // 同毫秒连续提交：原实现 `'tr_' + Date.now()` 会**撞 id**（重复主键），本断言即该缺陷的回归位
  assert.notEqual(a.id, b.id, '同毫秒连提两篇不得撞 id');

  const mine = TR.listThoughtReportsByPerson('p6');
  assert.equal(mine.length, before + 2, '同一人同期次两篇并存（面板数据）');
  const ids = mine.map(r => r.id);
  assert.ok(ids.includes(a.id) && ids.includes(b.id), '两篇均入个人归集');
  assert.ok(mine.filter(r => r.period === '2026-Q2').length >= 2, '同期次多篇并存');
  assert.equal(TR.countThoughtReportsByPerson('p6'), before + 2);
});

test('③ 按期次归集：组内多篇、组间期次倒序', () => {
  beginMockCase();
  const q1 = TR.addThoughtReport({ personId: 'p6', title: 'Q1 汇报', content: LONG, period: '2026-Q1' });
  const q2a = TR.addThoughtReport({ personId: 'p6', title: 'Q2 正稿', content: LONG, period: '2026-Q2' });
  const q2b = TR.addThoughtReport({ personId: 'p6', title: 'Q2 补充稿', content: LONG, period: '2026-Q2' });

  const groups = TR.listThoughtReportsByPersonGrouped('p6');
  assert.equal(groups[0].period, '2026-Q2', '组间按期次倒序（新期次在前）');
  assert.equal(groups[0].label, '2026年第二季度', '期次中文标签（单一源 core/period.js）');
  assert.ok(groups[0].items.some(r => r.id === q2a.id) && groups[0].items.some(r => r.id === q2b.id),
    'Q2 组内含正稿与补充稿两篇');
  const g1 = groups.find(g => g.period === '2026-Q1');
  assert.ok(g1, '存在 Q1 组');
  assert.ok(g1.items.some(r => r.id === q1.id), 'Q1 组内含 Q1 汇报');

  const periods = groups.map(g => g.period);
  assert.deepEqual([...periods].sort(TR.comparePeriodDesc), periods, '组间期次严格降序');
});

test('④ 存量归一：无 period / 非法 period 的记录读取时按 submittedAt 推导', () => {
  beginMockCase();
  // 直接注入「面板数据改造前」形态的存量记录（无 period）
  mockDB.thoughtReports = [
    { id: 'tr-legacy', personId: 'p6', personName: '苏明哲', title: '旧数据', content: LONG, submittedAt: '2026-04-20T09:00:00', reviewStatus: 'archived' },
    { id: 'tr-dirty', personId: 'p6', personName: '苏明哲', title: '脏值', content: LONG, submittedAt: '2026-10-05T09:00:00', period: '2026-Q9', reviewStatus: 'archived' },
  ];
  const list = TR.listThoughtReportsByPerson('p6');
  const legacy = list.find(r => r.id === 'tr-legacy');
  const dirty = list.find(r => r.id === 'tr-dirty');
  assert.equal(legacy.period, '2026-Q2', '无 period → 按 submittedAt(2026-04) 推导为 Q2');
  assert.equal(dirty.period, '2026-Q4', '非法 period → 按 submittedAt(2026-10) 推导为 Q4');
  const groups = TR.listThoughtReportsByPersonGrouped('p6');
  assert.deepEqual(groups.map(g => g.period), ['2026-Q4', '2026-Q2'], '归集使用归一后的期次');
});

test('⑤ 篇幅口径（SOP-B-11）：建议 1500 / 警告审阅线 1200 / 一律不影响提交', () => {
  beginMockCase();
  assert.equal(POLICY_DEFAULTS.thoughtReport.wordHint, 1500, '建议篇幅单一源 = 1500');
  assert.equal(POLICY_DEFAULTS.thoughtReport.wordSoftMin, 1200, '警告审阅线单一源 = 1200');
  assert.equal(TR.wordHint(), 1500);
  assert.equal(TR.wordSoftMin(), 1200);

  const shortText = '本季度思想汇报正文过短示例。';
  const s = TR.wordCountHint(shortText);
  assert.equal(s.level, 'short', '低于警告审阅线 → short 级提示');
  assert.ok(s.hint.includes('1200') && s.hint.includes('警告审阅'), '提示文案说明「少于 1200 字触发警告审阅」');
  assert.ok(s.hint.includes('不影响提交'), '提示文案明确「不影响提交」（硬约束）');
  assert.ok(s.hint.includes('1500'), '提示文案同时给出建议篇幅 1500');

  const l = TR.wordCountHint(LONG);
  assert.equal(l.level, 'ok', '达到警告审阅线 → ok');
  assert.equal(l.count, LONG.trim().length, '字数以去空白后长度计');
  assert.ok(l.hint.includes('1500') && l.hint.includes('不影响提交'), '达标侧同样给出建议值与「不影响提交」');

  // ⚠ 关键（「不影响提交」是硬约束）：过短**不被拦截**——仍可提交，且**直接入库归档**
  const rec = TR.addThoughtReport({ personId: 'p6', title: '偏短汇报', content: shortText, period: '2026-Q3' });
  assert.equal(rec.reviewStatus, 'archived', '过短仍可提交 → 提交即入库归档（不拦、不等初阅）');
  assert.equal(rec.period, '2026-Q3');
  // 「1500 / 1200 / 不影响提交」三者不混：1200 只决定提示级别，不决定能否提交
  assert.equal(TR.wordCountHint(shortText).level, 'short');
  assert.ok(TR.addThoughtReport({ personId: 'p7', title: '更短', content: '一句话。' }).id, '极短同样可提交');
});

test('⑥ 期次助手（单一源）：标签 / 排序 / 选项', () => {
  assert.equal(TR.periodLabel('2026-Q1'), '2026年第一季度');
  assert.equal(TR.periodLabel('2026-Q4'), '2026年第四季度');
  assert.equal(TR.periodLabel('bad'), 'bad', '非法值原样返回，不抛错');
  assert.equal(TR.PERIOD_RE.test('2026-Q3'), true);
  assert.equal(TR.PERIOD_RE.test('2026-Q5'), false);

  const p = ['2026-Q1', '2025-Q4', '2026-Q3'].sort(TR.comparePeriodDesc);
  assert.deepEqual(p, ['2026-Q3', '2026-Q1', '2025-Q4'], '期次降序（新在前）');

  const opts = TR.periodOptions(2);
  assert.equal(opts.length, 8, '近 2 年共 8 个期次');
  assert.ok(opts[0].value.endsWith('-Q4'), '选项新期次在前（首项为该年 Q4）');
  assert.ok(opts.every(o => TR.PERIOD_RE.test(o.value)), '选项全部为合法期次');
});
