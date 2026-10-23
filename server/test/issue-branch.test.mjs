// server/test/issue-branch.test.mjs — 反馈「支部归属 + 成员参与答复」验收（2026-09-15 支书裁定）
// 支书裁定：①「每个组织有自己独立的 issue 空间」（issue 记录带 branchId，读取按 viewer 所属支部过滤）；
//          ②「每个人都可以参与答复」（成员 participant 可在「我的处置」对自己提交/参与的反馈追加说明）。
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S4：静态扫描防回潮（issues.json 逐条带 branchId / 写入点锁定 / 读取过滤单一源 / 成员参与接线）
//   数据层 D1–D3：服务层口径断言（存量迁移后各条带 branchId、跨支部不可见、成员可对自己提交的反馈追加评论）
// node-only（不启浏览器）：纯服务层 + 静态扫描 + localStorage 内存桩。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const V = '?v=20261023c';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(ROOT, 'docs', 'src');
const ISSUES_JSON = join(ROOT, 'docs', 'data', 'issues.json');
const read = (f) => readFileSync(f, 'utf8');

// ── localStorage / sessionStorage 内存桩（登录态与 issue 缓存均惰性访问）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
const _sess = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (_sess.has(String(k)) ? _sess.get(String(k)) : null),
  setItem: (k, v) => _sess.set(String(k), String(v)),
  removeItem: (k) => { _sess.delete(String(k)); },
};

const { mockDB } = await import(`../../docs/src/core/domain/domain.js${V}`);
const { setDataSource } = await import(`../../docs/src/data/data-adapter.js${V}`);
const { IssueStore } = await import(`../../docs/src/services/governance/issues.js${V}`);
const { AuthStore } = await import(`../../docs/src/services/core/auth.js${V}`);

setDataSource('mock');

const CACHE_KEY = 'gsm1921-issue-cache-v3';
const CACHE_VERSION_KEY = 'gsm1921-issue-cache-version';
const CACHE_VERSION = '4';

/** 以指定 issue 列表装配 IssueStore 缓存现场（清内存缓存 + 写版本兼容的 localStorage 缓存后加载） */
async function beginIssueCase(issues) {
  IssueStore.clearCache(); // 内存缓存置空 + 清 CACHE_KEY/DRAFT_KEY
  _store.set(CACHE_VERSION_KEY, CACHE_VERSION);
  _store.set(CACHE_KEY, JSON.stringify(issues));
  return IssueStore.loadAll();
}

function loginAs(personId, role) {
  _store.set('gsm1921-login-user', JSON.stringify({ personId, role }));
}
function logout() {
  _store.delete('gsm1921-login-user');
}

// ═══════════════ 结构层 ═══════════════

test('S1 docs/data/issues.json 存量 4 条 issue 均逐条携带 branchId（支部归属列）', () => {
  const data = JSON.parse(read(ISSUES_JSON));
  assert.ok(Array.isArray(data.issues) && data.issues.length >= 1, 'issues.json 须含 issue 列表');
  for (const i of data.issues) {
    assert.ok(typeof i.branchId === 'string' && /^br-/.test(i.branchId),
      `issue ${i.id} 须携带支部归属 branchId（实际：${JSON.stringify(i.branchId)}）`);
  }
  // 存量迁移口径：本部署唯一支部 br-b1（data/mock/branches.js BRANCHES 基线）
  assert.ok(data.issues.every((i) => i.branchId === 'br-b1'), '存量 issue 应归部署默认支部 br-b1');
});

test('S2 写入口径锁定：前端 submitIssue/approveDraft 与服务端 POST/seed 均写 branchId', () => {
  const issues = read(join(SRC_DIR, 'services', 'governance', 'issues.js'));
  assert.match(issues, /const branchId = _writeBranchId\(\);/, 'submitIssue 须按 _writeBranchId 落 branchId');
  assert.match(issues, /branchId:\s*d\.payload\.branchId \|\| _writeBranchId\(\)/,
    'approveDraft 新建 issue 须补 branchId（草稿优先，存量缺省口径兜底）');
  assert.ok((issues.match(/branchId:\s*_writeBranchId\(\)/g) || []).length >= 2,
    'submitReport/requestReport 等内部写口亦须落 branchId');

  const resources = read(join(ROOT, 'server', 'routes', 'resources', 'index.js'));
  assert.match(resources, /const branchId = actorBranchId\(actor\)/, 'server POST 须取登录人所属支部（权威），党委不得回落默认支部');
  // PowerShell checkout uses CRLF; allow either LF or CRLF between record fields.
  assert.match(resources, /branchId,\r?\n\s*title:/, 'server 落库记录须含 branchId');

  const seed = read(join(ROOT, 'server', 'seed.js'));
  assert.match(seed, /branchId:\s*r\.branchId \|\| DEFAULT_BRANCH_ID/, 'seedIssues 播种须补 branchId（缺省支部单一源）');
});

test('S3 读取过滤单一源：issues.js 经 branch.js 的 withinBranch 收敛（勿另写第二套支部口径）', () => {
  const issues = read(join(SRC_DIR, 'services', 'governance', 'issues.js'));
  assert.match(issues, /import \{ withinBranch, getBranchIdOfPerson \} from '(\.\.\/)+branch\/branch\.js\?v=\d{8}[a-z]'/,
    '须 import branch.js 单一源（withinBranch/getBranchIdOfPerson）——2026-09-28 目录分层后 issues.js 在 services/governance/、branch.js 在 services/branch/，相对路径为 ../branch/branch.js');
  assert.match(issues, /function _withinViewerBranch\(list\) \{\s*if \(!_hasBranchFeedbackAccess\(\)\) return \[\];\s*return withinBranch\(list \|\| \[\], _viewerId\(\)\);/,
    '登录且有支部归属后，过滤器须经 withinBranch 单一源实现');
  // 2026-10-21 批次 498：读口在支部过滤之上再加受众投影（`_visibleIssues`），两件都算「已接线」
  const n = (issues.match(/_withinViewerBranch\(|_visibleIssues\(/g) || []).length;
  assert.ok(n >= 12, `列表出口均须按 viewer 所属支部过滤并做受众投影（实际接线 ${n} 处，期望 ≥12）`);
  // getSecretaryPendingReports / getAssignedToRole 等此前未过滤的出口须覆盖
  assert.match(issues, /getAssignedToRole\(role\) \{\s*return _visibleIssues\(/, 'getAssignedToRole 须按支部过滤并做受众投影');
});

test('S4 成员参与接线：getMyIssues 出口 + 我的处置 tab「我提交/参与的反馈」区', () => {
  const issues = read(join(SRC_DIR, 'services', 'governance', 'issues.js'));
  // G1 第③项（2026-09-28）：「我的处置」视图层自服务层迁出（服务层不产 UI）——
  // 渲染相关断言改读组件 components/feedback/issue-dispatch-view.js；数据出口断言仍读服务层。
  const view = read(join(SRC_DIR, 'components', 'feedback', 'issue-dispatch-view.js'));
  assert.match(issues, /getMyIssues\(userId\) \{/, 'IssueStore 须暴露 getMyIssues（我提交/参与的反馈）');
  // 2026-10-21 R3-08：四段收为两段——我提交/参与并入「我已处理」宿主（不再单列 myissues 宿主）
  assert.match(view, /mydispatch-done-host/, 'renderMyDispatchTab 须渲染成员参与区宿主（我已处理）');
  assert.match(view, /getMyIssues\(userId\)/, '我已处理段须并入我提交/参与的反馈');
  assert.match(view, /function _renderMyIssueDetail\(/, '成员答复详情须存在（追加说明，issue 答复口径）');
  // 成员参与绝不放大写权：详情仅 addComment('comment')，不出现提交处置结果/关闭
  const seg = view.slice(view.indexOf('function _renderMyIssueDetail('));
  assert.match(seg, /addComment\(issueId, userId, role, body, 'comment'\)/, '成员仅能追加说明（kind=comment）');
  assert.ok(!/submit-result/.test(seg), '成员参与详情不得提供「提交处置结果」（写权不外扩）');
});

test('S5 组长/成员「我的处置」：两段结构、打开行才标已读、令牌说明移 help', () => {
  const view = read(join(SRC_DIR, 'components', 'feedback', 'issue-dispatch-view.js'));
  assert.match(view, /renderMyDispatchTab\(role, userId, opts = \{\}\)/, '渲染入口须保留角色 / 用户参数');
  assert.match(view, /bindMyDispatchEvents\(container, role, userId, opts = \{\}\)/, '事件绑定须透传选项');
  // 2026-10-21 R3-08：四段收两段（待我处理 / 我已处理）。
  assert.match(view, /id="mydispatch-pending-host"/, '须有「待我处理」段宿主');
  assert.match(view, /id="mydispatch-done-host"/, '须有「我已处理」段宿主');
  assert.doesNotMatch(view, /mydispatch-(?:req|issues|myreports|myissues)-host/, '四段旧宿主不得回潮');
  // 渲染时不得整批 markRead；改为打开行时标记（详情渲染内逐条 markRead）。
  assert.doesNotMatch(view, /unread\.forEach\(id => IssueNotify\.markRead\(userId, id\)\);/, '不得整批 markRead');
  assert.match(view, /IssueNotify\.markRead\(userId, issueId\)/, '打开行时才标记已读');
  // 100 字令牌机制说明移 help，界面只留一句短提示 + help 深链。
  assert.doesNotMatch(view, /随机令牌比对|不以提交人身份为判据/, '长令牌说明不得留在界面');
  assert.match(view, /\.\/help\.html#card-dom39-my-dispatch/, '令牌说明的完整口径须指向 help');
  for (const role of ['leader', 'visitor']) {
    const tab = read(join(SRC_DIR, 'entries', 'tabs', role, 'my-dispatch-tab.js'));
    assert.match(tab, /renderMyDispatchTab\('(?:leader|participant)', uid, opts\)/, `${role} 台须把选项传入渲染入口`);
    assert.match(tab, /bindMyDispatchEvents\(el, '(?:leader|participant)', uid, opts\)/, `${role} 台须把选项传入事件绑定`);
  }
});

// ═══════════════ 数据层 ═══════════════

test('D1 存量迁移：缓存各条均带 branchId；viewer 取到本支部 issue', async () => {
  const data = JSON.parse(read(ISSUES_JSON));
  await beginIssueCase(data.issues);
  loginAs('2400012349', 'participant');
  const all = IssueStore.getAll();
  // 2026-10-21 批次 498：内部汇报（kind='report'）只给支书层与当事人，普通成员列表只含公开反馈。
  const visible = data.issues.filter((i) => i.kind !== 'report');
  assert.equal(all.length, visible.length, 'br-b1 viewer 可见本支部公开反馈（不含他人内部汇报）');
  for (const i of all) {
    assert.ok(i.branchId, `读取到的 issue ${i.id} 须带 branchId`);
    assert.equal(i.branchId, 'br-b1');
  }
  // 未登录者不得通过服务层读反馈（API 未登录 401 由集成测试验证）
  logout();
  assert.equal(IssueStore.getAll().length, 0, '未登录 viewer 不得读取支部反馈');
});

test('D2 跨支部不可见：br-b1 viewer 取不到 br-b2 issue，反之亦然', async () => {
  const A = { id: 'issue-a', number: 101, branchId: 'br-b1', title: '甲支部反馈', status: 'open', submittedBy: '2400012349', participants: ['2400012349'], comments: [], commentCount: 0 };
  const B = { id: 'issue-b', number: 102, branchId: 'br-b2', title: '乙支部反馈', status: 'open', submittedBy: 'pX', participants: ['pX'], comments: [], commentCount: 0 };
  await beginIssueCase([A, B]);

  // br-b1 viewer（2400012349）→ 只见甲支部
  loginAs('2400012349', 'participant');
  assert.deepEqual(IssueStore.getAll().map((i) => i.id), ['issue-a'], 'br-b1 viewer 仅见本支部');
  assert.ok(IssueStore.getById('issue-a'), '本支部 issue 可取');
  assert.equal(IssueStore.getById('issue-b'), undefined, '跨支部 issue 不可见（getById）');
  assert.equal(IssueStore.getByNumber(102), undefined, '跨支部 issue 不可见（getByNumber）');
  assert.equal(IssueStore.countByStatus().total, 1, '统计亦按支部收敛');

  // 注入乙支部成员（person 档案带 branchId: br-b2）→ 只见乙支部
  mockDB.users = [...(mockDB.users || []), { id: 'pX', name: '乙支部成员', role: 'participant', branchId: 'br-b2' }];
  loginAs('pX', 'participant');
  assert.deepEqual(IssueStore.getAll().map((i) => i.id), ['issue-b'], 'br-b2 viewer 仅见本支部');
  assert.equal(IssueStore.getById('issue-a'), undefined, '反向亦不可见');
});

test('D3 成员参与答复：participant 可对自己提交的 issue 追加说明（作者/计数落库）', async () => {
  const A = { id: 'issue-a', number: 201, branchId: 'br-b1', title: '我提的反馈', status: 'open', submittedBy: '2400012349', participants: ['2400012349'], comments: [], commentCount: 0 };
  await beginIssueCase([A]);
  loginAs('2400012349', 'participant');

  const mine = IssueStore.getMyIssues('2400012349');
  assert.equal(mine.length, 1, '我提交的反馈进入「我提交/参与的反馈」');
  assert.equal(mine[0].id, 'issue-a');

  const updated = IssueStore.addComment('issue-a', '2400012349', 'participant', '我再补充一点说明', 'comment');
  assert.ok(updated, '追加说明成功');
  assert.equal(updated.commentCount, 1, 'commentCount +1');
  const last = updated.comments[updated.comments.length - 1];
  assert.equal(last.author, '2400012349', '评论作者 = 本人');
  assert.equal(last.body, '我再补充一点说明');
  assert.equal(last.kind, 'comment', '成员答复 kind = comment（非处置结果）');

  // 持久化回缓存（后续读取一致）
  const cached = JSON.parse(_store.get(CACHE_KEY)).find((i) => i.id === 'issue-a');
  assert.equal(cached.commentCount, 1, '缓存已落库');
  assert.equal(cached.comments[cached.comments.length - 1].author, '2400012349');

  // 权限边界：成员不因参与答复获得「处置他人反馈」能力（指派处置仍按原角色口径）
  assert.deepEqual(IssueStore.getAssignedTo('2400012349'), [], '成员无被指派处置项');
  assert.ok(AuthStore.getCurrentUser()?.role === 'participant', '身份为成员 participant');
});
