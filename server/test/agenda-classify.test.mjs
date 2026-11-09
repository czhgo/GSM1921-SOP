// role: [工程师]+[AI]
// server/test/agenda-classify.test.mjs — 议程来源分类与待议池契约的验收（2026-11-10 批次 540 波次 2）
// ════════════════════════════════════════════════════════════════
// 契约：`content/04_web_design/contracts/AGENDA_DERIVATION_CONTRACT.md`
// 判据（四条，缺一不算覆盖）：
//   ① 六类来源 ＋ 另纳入两类：判据布尔化、类型 / 期望产出 / 去除键逐项落值；
//   ② 四反例：专班创建 / 活动创建 / 考勤交接 → 同步；制度已 pending-party-meeting → 报送党员大会；
//   ③ 服务端与客户端**逐项一致**：`GET /api/v1/committee/agenda-candidates` 的每一项与本地
//      `classifyAgendaItem` 对同一条来源记录的判定逐字段相等（同一个函数，漂移即红）；
//   ④ 双支部互不串池：br-b1 / br-b2 各自的记录只出现在自己支部的待议池里。
// 边界（如实标注）：`meta` 是展示文案，不参与对账；`ageDays` 依赖时钟，只断言「有值 / 为 null」。
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  AGENDA_SOURCES,
  AGENDA_EXTRA_SOURCES,
  AGENDA_COUNTEREXAMPLES,
  AGENDA_TYPES,
  COMMITTEE_ISSUE_DOMAIN_VALUES,
  AGENDA_ASSIGNMENT_PROPOSAL_KIND,
  AGENDA_PENDING_APPROVAL_STATUS,
  AGENDA_INSTITUTION_PENDING_PARTY_MEETING,
  classifyAgendaItem,
  agendaDedupeKey,
} from '../../docs/src/core/domain/agenda-classify.js?v=20261110a';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ── 逐项一致的比较面（与契约 §七 同口径）─────────────────────────────
const PARITY_FIELDS = ['source', 'sourceLabel', 'refKind', 'refId', 'item', 'type', 'typeLabel',
  'step', 'needDecision', 'expected', 'status', 'dedupeKey'];
const pick = (row) => Object.fromEntries(PARITY_FIELDS.map((k) => [k, row[k]]));

// ── 各类来源的样板记录（同一份记录既喂客户端分类，也写进库供服务端归集）────────
const FIXTURES = [
  {
    source: 'taskforce-pending',
    ref: {
      id: 'tf-agenda-1', name: '学风建设专班', kind: 'initiate',
      committeeRequest: { kind: 'initiate', status: 'pending', by: '2400012355', note: '请支委会审议', at: '2026-10-20T02:00:00.000Z' },
    },
    expect: { type: 'decision', step: 'vote', needDecision: true, expected: '形成决议', item: '审议专班「学风建设专班」（发起）' },
  },
  {
    source: 'issue-committee',
    ref: { id: 'issue-agenda-1', number: 77, title: '三会一课记录卡壳', domain: 'institution', status: 'open', submittedAt: '2026-10-21' },
    expect: { type: 'discussion', step: 'discussion', needDecision: false, expected: '形成意见', item: '审议反馈「三会一课记录卡壳」' },
  },
  {
    source: 'institution-draft',
    ref: { id: 'doc-agenda-1', title: '支委会议事规则（草案）', purpose: 'institution', status: 'draft' },
    expect: { type: 'decision', step: 'vote', needDecision: true, expected: '形成决议', item: '讨论文件「支委会议事规则（草案）」' },
  },
  {
    source: 'institution-draft',
    ref: { id: 'doc-agenda-2', title: '发展党员工作细则（待表决）', purpose: 'institution', status: 'pending-party-meeting' },
    expect: { type: 'sync', step: null, needDecision: false, expected: '报送党员大会', item: '报送党员大会「发展党员工作细则（待表决）」' },
    resolvedSource: 'party-meeting-pending',
  },
  {
    source: 'activist-recommend',
    ref: { id: '2400012351', name: '曾雨桐', developStage: '积极分子' },
    expect: { type: 'decision', step: 'vote', needDecision: true, expected: '形成决议', item: '讨论推荐「曾雨桐」为发展对象' },
  },
  {
    source: 'brand-proposal',
    ref: { id: 'act-brand-1', title: '红色研学', profile: {}, brandProposal: { by: '2300010001', at: '2026-10-19T01:00:00.000Z', note: '拟认定' } },
    expect: { type: 'decision', step: 'vote', needDecision: true, expected: '形成决议', item: '审议品牌认定「红色研学」' },
  },
  {
    source: 'activity-approval',
    ref: { id: 'act-approval-1', title: '联合主题党日', status: 'pending-approval', approval: { mode: 'branch-committee', state: 'pending', at: '2026-10-22T03:00:00.000Z' } },
    expect: { type: 'decision', step: 'vote', needDecision: true, expected: '形成决议', item: '审议活动「联合主题党日」的批准' },
  },
  {
    source: 'assignment-adjust',
    ref: { id: 'act-assign-1', title: '支部分工调整：宣传 → 组织委员', extras: { kind: 'workforce-proposal', proposal: [{ moduleId: 'prop', to: { ownerType: 'role', ownerId: 'org-commissioner' } }], adoptedAt: null } },
    expect: { type: 'decision', step: 'vote', needDecision: true, expected: '形成决议', item: '审议支部分工调整：宣传 → 组织委员' },
  },
];

// ════════════════════════════════════════════════════════════════
//  ① 六类来源 ＋ 另纳入两类
// ════════════════════════════════════════════════════════════════

test('来源表：六类 ＋ 另纳入两类（顺序与分组稳定）', () => {
  assert.deepEqual(AGENDA_SOURCES.map((s) => s.value),
    ['taskforce-pending', 'issue-committee', 'institution-draft', 'party-meeting-pending', 'activist-recommend', 'brand-proposal']);
  assert.deepEqual(AGENDA_EXTRA_SOURCES.map((s) => s.value), ['activity-approval', 'assignment-adjust']);
  assert.equal(AGENDA_SOURCES.length, 6, '六类来源口径不得增删（新增须同批改契约 §二）');
});

test('类型三值：决策需表决，讨论与同步不需表决', () => {
  assert.deepEqual(AGENDA_TYPES.map((t) => t.value), ['decision', 'discussion', 'sync']);
  const byValue = Object.fromEntries(AGENDA_TYPES.map((t) => [t.value, t]));
  assert.equal(byValue.decision.needDecision, true);
  assert.equal(byValue.discussion.needDecision, false);
  assert.equal(byValue.sync.needDecision, false);
  assert.equal(byValue.decision.expected, '形成决议');
  assert.equal(byValue.discussion.expected, '形成意见');
  assert.equal(byValue.sync.expected, '知悉备案');
});

test('逐类分类：类型 / 步骤 / 期望产出 / 议程文案 / 引用类型全落值', () => {
  for (const fx of FIXTURES) {
    const got = classifyAgendaItem({ source: fx.source, ref: fx.ref });
    const where = `${fx.source}/${fx.ref.id}`;
    assert.equal(got.type, fx.expect.type, `${where} 类型`);
    assert.equal(got.step, fx.expect.step, `${where} 建议步骤`);
    assert.equal(got.needDecision, fx.expect.needDecision, `${where} 是否需要表决`);
    assert.equal(got.expected, fx.expect.expected, `${where} 期望产出`);
    assert.equal(got.item, fx.expect.item, `${where} 议程文案`);
    assert.equal(got.refId, fx.ref.id, `${where} 引用 id`);
    assert.ok(got.refKind, `${where} 引用类型不得为空`);
    if (fx.resolvedSource) assert.equal(got.source, fx.resolvedSource, `${where} 同一份制度按环节分流`);
  }
});

test('去重键：来源键 + 记录 id（同一记录稳定、不同来源不合并）', () => {
  const a = agendaDedupeKey({ source: 'brand-proposal', ref: { id: 'act-1' } });
  const b = agendaDedupeKey({ source: 'brand-proposal', ref: { id: 'act-1' } });
  const c = agendaDedupeKey({ source: 'activity-approval', ref: { id: 'act-1' } });
  assert.equal(a, 'brand-proposal:act-1');
  assert.equal(a, b);
  assert.notEqual(a, c, '同一活动的批准与品牌提案是两件事，不得并成一条');
});

test('归口支委会的领域取值与母本表派生集合相等（ISSUE_DOMAINS 的 suggest 含「支委会」者）', () => {
  const src = read('docs/src/services/governance/issues.js');
  const derived = [...src.matchAll(/\{ value: '([^']+)', label: '[^']+', suggest: '([^']*)'/g)]
    .filter((m) => m[2].includes('支委会'))
    .map((m) => m[1]);
  assert.ok(derived.length >= 2, `母本表里归口支委会的领域只解析到 ${derived.length} 类：解析口径可能失效`);
  assert.deepEqual([...COMMITTEE_ISSUE_DOMAIN_VALUES].sort(), derived.sort());
});

test('镜像常量与写侧单一源逐字相等（core 层不得 import services，故由本断言锁定）', () => {
  assert.match(read('docs/src/services/branch/workforce.js'),
    new RegExp(`WORKFORCE_PROPOSAL_KIND = '${AGENDA_ASSIGNMENT_PROPOSAL_KIND}'`));
  assert.match(read('docs/src/services/activity/activity.js'),
    new RegExp(`PENDING_APPROVAL_STATUS = '${AGENDA_PENDING_APPROVAL_STATUS}'`));
  assert.match(read('docs/src/services/branch/branch-doc.js'),
    new RegExp(`INSTITUTION_PENDING_PARTY_MEETING = '${AGENDA_INSTITUTION_PENDING_PARTY_MEETING}'`));
});

// ════════════════════════════════════════════════════════════════
//  ② 四反例
// ════════════════════════════════════════════════════════════════

test('四反例不得判为决策：专班创建 / 活动创建 / 考勤交接 → 同步；制度已待党员大会 → 报送', () => {
  assert.equal(AGENDA_COUNTEREXAMPLES.length, 4, '反例口径为四条');
  for (const ce of AGENDA_COUNTEREXAMPLES) {
    const got = classifyAgendaItem({ source: ce.value, ref: { id: `x-${ce.value}`, title: ce.label } });
    assert.equal(got.type, 'sync', `${ce.label} 必须判同步`);
    assert.equal(got.needDecision, false, `${ce.label} 不得要求表决`);
    assert.equal(got.expected, ce.expected, `${ce.label} 期望产出`);
  }
  const pending = AGENDA_COUNTEREXAMPLES.find((c) => c.value === 'institution-pending-party-meeting');
  assert.equal(pending.expected, '报送党员大会', '制度已 pending-party-meeting 是报送，不是表决');
  assert.equal(classifyAgendaItem({ source: 'institution-pending-party-meeting', ref: { id: 'd1' } }).expected, '报送党员大会');
});

test('制度草案与「已报送」同一判据分流：草案判决策、待报送判同步', () => {
  const draft = classifyAgendaItem({ source: 'institution-draft', ref: { id: 'd2', purpose: 'institution', status: 'draft', title: 'A' } });
  const pending = classifyAgendaItem({ source: 'institution-draft', ref: { id: 'd3', purpose: 'institution', status: 'pending-party-meeting', title: 'B' } });
  assert.equal(draft.type, 'decision');
  assert.equal(draft.status, 'pending');
  assert.equal(pending.type, 'sync');
  assert.equal(pending.status, 'reported');
});

// ════════════════════════════════════════════════════════════════
//  ③④ 服务端端点：逐项一致 ＋ 双支部过滤 ＋ 权限
// ════════════════════════════════════════════════════════════════

let server, base, db, tokenSecB1, tokenSecB2, tokenMember;

async function login(personId, pwd = '123456') {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId, password: pwd }),
  });
  const j = await r.json();
  return j.token;
}

/** 直接写行（fixture 只关心归集判据，不跑业务写门） */
function put(table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;

  // br-b1 fixtures（一条一类）
  put('taskforces', { id: 'tf-agenda-1', branchId: 'br-b1', name: '学风建设专班', status: 'draft', committeeRequest: FIXTURES[0].ref.committeeRequest });
  put('issues', { id: 'issue-agenda-1', branchId: 'br-b1', number: 77, title: '三会一课记录卡壳', domain: 'institution', status: 'open', hidden: false, mergedInto: null, submittedAt: '2026-10-21' });
  put('branch_docs', { id: 'doc-agenda-1', branchId: 'br-b1', title: '支委会议事规则（草案）', purpose: 'institution', status: 'draft', uploadedAt: '2026-10-18T00:00:00.000Z' });
  put('branch_docs', { id: 'doc-agenda-2', branchId: 'br-b1', title: '发展党员工作细则（待表决）', purpose: 'institution', status: 'pending-party-meeting', uploadedAt: '2026-10-18T00:00:00.000Z' });
  put('activities', { id: 'act-brand-1', branchId: 'br-b1', title: '红色研学', status: 'published', brandProposal: FIXTURES[5].ref.brandProposal });
  put('activities', { id: 'act-approval-1', branchId: 'br-b1', title: '联合主题党日', status: 'pending-approval', approval: FIXTURES[6].ref.approval, type: '主题党日' });
  put('activities', { id: 'act-assign-1', branchId: 'br-b1', title: '支部分工调整：宣传 → 组织委员', status: 'published', type: '支委会', extras: FIXTURES[7].ref.extras });

  // br-b2 同形记录（用于双支部互不串池）
  put('branches', { id: 'br-b2', name: '本科第二党支部', type: '本科生', status: 'active' });
  put('users', { id: '2300020001', studentId: '2300020001', name: '第二支部书记', role: 'secretary', branchId: 'br-b2', developStage: '正式党员', partyGroup: '第一党小组' });
  put('users', { id: '2400020001', studentId: '2400020001', name: '第二支部积极分子', role: 'participant', branchId: 'br-b2', developStage: '积极分子', partyGroup: '第一党小组' });
  put('taskforces', { id: 'tf-b2', branchId: 'br-b2', name: '第二支部专班', status: 'draft', committeeRequest: { kind: 'initiate', status: 'pending', by: '2300020001', note: '', at: '2026-10-20T02:00:00.000Z' } });
  put('branch_docs', { id: 'doc-b2', branchId: 'br-b2', title: '第二支部制度（草案）', purpose: 'institution', status: 'draft' });

  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  tokenSecB1 = await login('2300010001');
  tokenSecB2 = await login('2300020001');
  tokenMember = await login('2400012347');
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

async function fetchPool(token, query = '') {
  const r = await fetch(`${base}/api/v1/committee/agenda-candidates${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: r.status, body: await r.json() };
}

test('服务端端点：每项与客户端分类逐字段一致（同一个函数，漂移即红）', async () => {
  const { status, body } = await fetchPool(tokenSecB1);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body), '响应必须是数组');

  const byKey = new Map(body.map((row) => [row.dedupeKey, row]));
  let compared = 0;
  for (const fx of FIXTURES) {
    const client = classifyAgendaItem({ source: fx.source, ref: fx.ref });
    assert.ok(client.refId);
    const served = byKey.get(client.dedupeKey);
    // 品牌/批准/分工三类与「品牌提案」共用 activity 记录，按 source 精确定位
    const hit = served && served.source === client.source ? served : body.find((row) => row.dedupeKey === client.dedupeKey);
    assert.ok(hit, `服务端缺项：${client.dedupeKey}（服务端有 ${[...byKey.keys()].join(' / ')}）`);
    assert.deepEqual(pick(hit), pick(client), `${client.dedupeKey} 两端字段不一致`);
    compared++;
  }
  assert.equal(compared, FIXTURES.length, '逐项对账条数与样板数不等');

  // 应到：支委会事项 → 本支部支委；制度报送 → 支部党员大会
  const docPending = body.find((row) => row.refId === 'doc-agenda-2');
  assert.equal(docPending.attendees.scope, 'branch-party-meeting');
  assert.ok(docPending.attendees.count > 0, '党员大会应到不得为空');
  const recommend = body.find((row) => row.source === 'activist-recommend');
  assert.equal(recommend.attendees.scope, 'committee');
  assert.ok(recommend.attendees.count >= 5, '支委会应到＝本支部支委');
  assert.ok(!recommend.attendees.personIds.includes('2400020001'), '他支部成员不得进本支部应到名单');
});

test('去重：同一来源同一记录只出现一次', async () => {
  const { body } = await fetchPool(tokenSecB1);
  const keys = body.map((row) => row.dedupeKey);
  assert.equal(new Set(keys).size, keys.length, `服务端返回存在重复去重键：${keys.join(' / ')}`);
});

test('双支部互不串池：br-b2 记录不进 br-b1，br-b1 记录不进 br-b2', async () => {
  const b1 = (await fetchPool(tokenSecB1)).body;
  const b2 = (await fetchPool(tokenSecB2)).body;
  const ids = (rows) => rows.map((row) => row.refId);

  assert.ok(ids(b1).includes('tf-agenda-1'));
  assert.ok(!ids(b1).includes('tf-b2'), 'br-b2 的专班不得进 br-b1 待议池');
  assert.ok(!ids(b1).includes('doc-b2'), 'br-b2 的制度不得进 br-b1 待议池');
  assert.ok(!ids(b1).includes('2400020001'), 'br-b2 的积极分子不得进 br-b1 待议池');

  assert.ok(ids(b2).includes('tf-b2'));
  assert.ok(ids(b2).includes('doc-b2'));
  assert.ok(ids(b2).includes('2400020001'));
  assert.ok(!ids(b2).includes('tf-agenda-1'), 'br-b1 的专班不得进 br-b2 待议池');
  assert.ok(!ids(b2).includes('act-brand-1'));
  // br-b2 只有 1 名支委 ⇒ 应到 1
  const recommendB2 = b2.find((row) => row.source === 'activist-recommend');
  assert.equal(recommendB2.attendees.count, 1);
});

test('权限：非支委 403；支部账号读他人支部 403；未登录 401', async () => {
  const member = await fetchPool(tokenMember);
  assert.equal(member.status, 403, '普通成员不得读支委会待议池');

  const cross = await fetchPool(tokenSecB1, '?branchId=br-b2');
  assert.equal(cross.status, 403, '支部账号不得读其他支部的待议池');

  const anon = await fetch(`${base}/api/v1/committee/agenda-candidates`);
  assert.equal(anon.status, 401);
});
