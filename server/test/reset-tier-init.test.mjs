// role: [工程师]+[AI]
// server/test/reset-tier-init.test.mjs — C3 一键初始化档 ?reset=init（2026-09-08）
// reset 分层档案：demo（回演示种子）/ preview（清运行时预览覆盖）/ init（初始化新支部空业务态）三档并存；
// 本文件覆盖 init 档（mock-adapter 禁改 → reset/清库逻辑经可改入口 services/mock.js loadDB
// 前置 handleInitResetIfRequested 兜底；纯函数 trimInitBlob/collectInitKeys 供测试与执行共用）：
//   ① trimInitBlob（纯）：白名单主库键（_schema/users/branches/appointmentRecords）原样保留；
//      业务过程域（activities/attendances/activityReviews/inspections/taskforces/notices/
//      archiveRecords/handoffs/signups/thoughtReports/memberChangeRequests/committeeBroadcasts/
//      agendaVotes/reviewRequests 等 INIT_BLOB_CLEAR_DEFAULTS 全部键）置空默认（[]/{} / null）；
//      未知扩展键原样保留；入参不被改动
//   ② 空态自洽：init 后主库业务域零记录 → 零演示成员 id 引用；骨架键（账号/支部 config）非空
//   ③ collectInitKeys（纯）：移除独立业务/过程键（issue 草稿/缓存/未读/提交、确权队列、决议跟进、
//      向导草稿、预览、分工草稿、旧版单域遗留键等，精确+前缀）；白名单独立键
//      （members-overlay/residence/login-user/theme/accent/font/auth-audit）与无关键不移除
//   ④ handleInitResetIfRequested 执行（window/localStorage/sessionStorage 内存桩）：
//      · API 模式（sessionStorage 有 token）：?reset=init 跳过——不动存储、不导航（两形态断言）
//      · 静态形态：主库裁剪写回（白名单保留/业务清空）+ 独立业务键移除 + 白名单保留 + 去参整页导航
//      · 非 init 档位（demo/preview/未知/缺省）→ false 不动作（不抢占既有档位）
//   ⑤ 接线冒烟：services/mock.js loadDB()（mock 数据源）在 ?reset=init 下先于 MockAdapter.loadDB
//      执行初始化并导航（可改 reset 触发链生效）
// 纯 Node + 内存桩，无浏览器/服务器依赖；模块经 ?v= query 导入（与 reset-tier/empty-template 同法）。
// 运行：node --test test/reset-tier-init.test.mjs（server 目录）
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const {
  INIT_BLOB_KEY, INIT_BLOB_CLEAR_DEFAULTS, INIT_WHITELIST_STANDALONE_KEYS,
  collectInitKeys, trimInitBlob, handleInitResetIfRequested,
} = await import('../../docs/src/services/init-reset.js?v=20260908c');
// 接线冒烟（⑤）：走 services/mock.js loadDB 可改 reset 链（数据源默认 mock）
const { loadDB } = await import('../../docs/src/services/mock.js?v=20260908c');

// ── 内存桩（与 reset-tier.test.mjs 同构）────────────────────────
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => map.set(String(k), String(v)),
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    snapshot: () => Object.fromEntries(map),
  };
}

/** 注入 window/localStorage（可选 sessionStorage token）桩；返回 { ls, win } 供断言 */
function stubGlobals({ search, href, store, token }) {
  const ls = makeStorage(store || {});
  const win = { location: { search, href } };
  win.location.replace = (url) => { win._replaced = String(url); };
  globalThis.localStorage = ls;
  globalThis.window = win;
  if (token !== undefined) {
    globalThis.sessionStorage = makeStorage({ 'gsm1921-api-token': token });
  } else {
    delete globalThis.sessionStorage;
  }
  return { ls, win };
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

// ── 现场：演示/试用态主库（全业务域有记录）+ 独立键全景 ──────────
const BLOB = {
  _schema: 1,
  users: [
    { id: 'u_sec', role: 'secretary', name: '支部书记' },
    { id: 'p13', role: 'secretary', name: '储子禾' },
  ],
  branches: [{
    id: 'br-b1', name: '光华管理学院本科生党支部', type: '本科生', secretaryId: 'p13',
    config: {
      headerTitle: '光华管院本科党支部', themePreset: 'sky',
      workforce: { 'three-meetings': { ownerType: 'role', ownerId: 'secretary' } },
      modules: null, blocks: null, fileSpaceIsolated: true,
    },
  }],
  appointmentRecords: [{ id: 'appt-1', branchId: 'br-b1', secretaryId: 'p13', from: '2026-08-01T00:00:00.000Z', to: null }],
  // ↓ 以下全部为业务过程域（试用/演示积累）——init 应清空
  activities: [{ id: 'act-31', title: '9月支部党员大会（线上异步表决）', organizer: 'p11' }],
  tasks: [{ id: 'tsk-1', activityId: 'act-31' }],
  attendances: [{ id: 'att1', activityId: 'act-26', personId: 'p1', status: 'present' }],
  inspections: [{ id: 'insp1', activityId: 'act-31', personId: 'p3', role: '策划' }],
  assignments: [{ id: 'asgn1', activityId: 'act-31', personId: 'p8' }],
  makeupTasks: [{ id: 'mkp1', activityId: 'act-26', personId: 'p9' }],
  actSubRecords: { 'act-31': { outputs: [] } },
  tfSubRecords: { 'tf-1': { progress: [] } },
  complianceReferences: [{ id: 'cmp1', title: '中国共产党章程' }],
  fileSpaceRecords: [{ id: 'fs1', fileName: '活动照片.zip' }],
  experienceDeposits: [{ id: 'exp1', title: '复盘经验' }],
  imageRecords: [{ id: 'img1', title: '活动合影' }],
  taskforces: [{ id: 'tf-1', name: '迎新专班', manager: 'p3' }],
  notices: [{ id: 'notice-101', title: '9月活动通知' }],
  todos: [{ id: 'todo_1', title: '准备材料' }],
  signups: [{ id: 'su-001', sourceType: 'activity', sourceId: 'act-31', personId: 'p5' }],
  activityReviews: [{ id: 'r1', activityId: 'act-31', organizerId: 'p3' }],
  taskforceReviews: [{ id: 'trv1', sourceType: 'taskforce', organizerId: 'p3' }],
  propTasks: [{ id: 'pt1', title: '宣传任务' }],
  weeklyReports: [{ id: 'wr1', title: '宣传周报' }],
  archiveRecords: [{ id: 'ar1', title: '归档材料' }],
  mailboxConfig: { email: 'demo-disc@gsm.pku.edu.cn', checkCycleDays: 7 },
  mailboxHistory: [{ id: 'mh1', at: '2026-09-01' }],
  externalDispatches: [{ id: 'ed1' }],
  branchDocs: [{ id: 'bd1', branchId: 'br-b1', fileName: '支部文件.pdf' }],
  memberChangeRequests: [{ id: 'mcr1', personId: 'p1', status: 'pending-org-approval' }],
  committeeBroadcasts: [{ id: 'cb1', requestId: 'mcr1', recipientId: 'p10' }],
  agendaVotes: [{ id: 'av1', activityId: 'act-31', personId: 'p1', stance: 'agree' }],
  handoffs: [{ id: 'ho1', from: 'p3', to: 'p8' }],
  thoughtReports: [{ id: 'tr1', personId: 'p1', quarter: 'Q3' }],
  reviewRequests: [{ id: 'rq1', branchId: 'br-b1', type: 'activity-report', status: 'pending' }],
};
const BLOB_JSON = JSON.stringify(BLOB);

/** 典型现场：主库 + 独立业务/过程键（gsm1921-* 运行时自管键 + 决议跟进 + 向导草稿 + 旧版遗留键）
 *  + 白名单独立键 + 无关键（unrelated） */
const STANDALONE = {
  [INIT_BLOB_KEY]: BLOB_JSON,
  // 业务/过程独立键（init 应移除）
  'gsm1921-issue-drafts': '{}',
  'gsm1921-issue-cache-v3': '[]',
  'gsm1921-issue-cache-version': '1',
  'gsm1921-issue-cache': '[]',
  'gsm1921-issue-unread-p13': '{"c1":true}',
  'gsm1921-feedback-submissions': '[]',
  'gsm1921-feedback-migrated': '1',
  'gsm1921-milestone-cache': '[]',
  'gsm1921-member-confirmations': '[]',
  'gsm1921-base-data-preview': '{"people":[]}',
  'gsm1921-dev-stage-overrides': '{}',
  'gsm1921-workforce-draft': '{}',
  'resolution-followup': '[]',
  'wizard-draft-br-b1': '{"step":3}',
  'wizard-draft-br-other': '{"step":1}',
  'workflowos_taskforces_v1': '[]',
  'workflowos_notices_v1': '[]',
  assignment_records: '[]', attendance_records: '[]', inspection_records: '[]',
  'gsm1921-auth-records': '[]',
  // 白名单独立键（init 保留）
  'gsm1921-members-overlay': '{"upserts":[]}',
  'gsm1921-residence-overrides': '{}',
  'gsm1921-login-user': '{"personId":"p13"}',
  workflowos_theme: 'dark',
  workflowos_accent_role: 'blue',
  workflowos_font_size: 'medium',
  sop_org_os_auth_audit: '[]',
  // 无关键（不属于任何档位）
  page_pref_other: 'x',
};

// ═══════════════ ① 主库裁剪（纯） ═══════════════
test('trimInitBlob：白名单主库键原样保留；全部业务过程域置空默认；未知扩展键保留；入参不改', () => {
  const parsed = JSON.parse(BLOB_JSON);
  const before = JSON.stringify(parsed);
  const out = trimInitBlob(parsed);
  // 白名单：_schema/users/branches/appointmentRecords（账号/支部 config/任期档案）
  assert.equal(out._schema, 1);
  assert.deepEqual(out.users, BLOB.users, '账号与角色结构保留');
  assert.deepEqual(out.branches, BLOB.branches, '支部实例与 config（分工/术语/header）保留');
  assert.deepEqual(out.appointmentRecords, BLOB.appointmentRecords, '书记任期档案保留');
  // 业务过程域：数组 → [] / 聚合 → {} / 单对象 → null
  for (const [key, empty] of Object.entries(INIT_BLOB_CLEAR_DEFAULTS)) {
    if (Array.isArray(empty)) {
      assert.ok(Array.isArray(out[key]) && out[key].length === 0, `${key} 清空为 []`);
    } else if (empty === null) {
      assert.equal(out[key], null, `${key} 清空为 null`);
    } else {
      assert.deepEqual(out[key], {}, `${key} 清空为 {}`);
    }
  }
  // 空态自洽前提：业务域零记录
  assert.equal(out.activities.length, 0);
  assert.equal(out.attendances.length, 0);
  assert.equal(out.thoughtReports.length, 0);
  // 未知扩展键原样保留（不误伤未来新增域）
  const withExtra = trimInitBlob({ ...parsed, futureDomain: [{ x: 1 }] });
  assert.deepEqual(withExtra.futureDomain, [{ x: 1 }]);
  // 入参不被改动
  assert.equal(JSON.stringify(parsed), before, 'trimInitBlob 不改入参');
});

// ═══════════════ ② 空态自洽（零引用） ═══════════════
test('init 后主库空态自洽：业务域零记录零演示成员引用；骨架键（账号/config）非空；落库往返不报错', () => {
  const out = trimInitBlob(JSON.parse(BLOB_JSON));
  for (const key of Object.keys(INIT_BLOB_CLEAR_DEFAULTS)) {
    const v = out[key];
    if (Array.isArray(v)) assert.equal(v.length, 0, `业务域 ${key} 应为空数组`);
    else if (v && typeof v === 'object') assert.equal(Object.keys(v).length, 0, `业务域 ${key} 应为空对象`);
    else assert.equal(v, null, `业务域 ${key} 应为 null`);
  }
  assert.ok(out.users.length >= 2, '账号结构保留（空支部起步登录可用）');
  assert.equal(out.branches.length, 1, '支部实例保留');
  assert.ok(out.branches[0].config.headerTitle && out.branches[0].config.workforce, '支部 config 保留（header/分工）');
  // JSON 序列化回读（落库往返）自洽
  const roundtrip = JSON.parse(JSON.stringify(out));
  assert.equal(roundtrip._schema, 1);
  assert.equal(roundtrip.activities.length, 0);
  assert.equal(roundtrip.branches[0].id, 'br-b1');
});

// ═══════════════ ③ 独立键收集（纯） ═══════════════
test('collectInitKeys：移除独立业务/过程键（精确+前缀）；白名单独立键与无关键不移除', () => {
  const keys = Object.keys(STANDALONE);
  const out = collectInitKeys(keys);
  const businessPresent = [
    'gsm1921-issue-drafts', 'gsm1921-issue-cache-v3', 'gsm1921-issue-cache-version',
    'gsm1921-issue-cache', 'gsm1921-issue-unread-p13', 'gsm1921-feedback-submissions',
    'gsm1921-feedback-migrated', 'gsm1921-milestone-cache', 'gsm1921-member-confirmations',
    'gsm1921-base-data-preview', 'gsm1921-dev-stage-overrides', 'gsm1921-workforce-draft',
    'resolution-followup', 'wizard-draft-br-b1', 'wizard-draft-br-other',
    'workflowos_taskforces_v1', 'workflowos_notices_v1', 'assignment_records',
    'attendance_records', 'inspection_records', 'gsm1921-auth-records',
  ];
  for (const k of businessPresent) {
    assert.ok(out.includes(k), `init 档应移除 ${k}`);
  }
  for (const k of INIT_WHITELIST_STANDALONE_KEYS) {
    assert.ok(!out.includes(k), `白名单独立键 ${k} 不移除`);
  }
  assert.ok(!out.includes('page_pref_other'), '无关键不移除');
  assert.ok(!out.includes(INIT_BLOB_KEY), '主库键由 trimInitBlob 裁剪处理，不整键删除');
  assert.equal(new Set(out).size, out.length, '无重复');
});

test('collectInitKeys：缺省现场 → 空清单（仅移除在场命中键，removeItem 幂等无副作用）', () => {
  assert.deepEqual(collectInitKeys(), []);
  assert.deepEqual(collectInitKeys(['workflowos_theme', 'page_pref_other', 'gsm1921-members-overlay']), []);
});

// ═══════════════ ④ 执行（API 边界 + init 行为 + 不抢占既有档位） ═══════════════
test('执行：API 模式（sessionStorage 有 token）?reset=init 跳过——不动存储、不导航', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=init',
    href: 'http://127.0.0.1:3000/index.html?reset=init',
    store: STANDALONE,
    token: 't-abc',
  });
  assert.equal(handleInitResetIfRequested(), false, '?reset=init 在 API 模式跳过');
  assert.deepEqual(ls.snapshot(), STANDALONE, '存储未被触碰（不清登录会话/远端数据）');
  assert.equal(win._replaced, undefined, '不触发导航');
});

test('执行：?reset=init 静态形态——主库裁剪写回（白名单保留/业务清空）+ 独立业务键移除 + 白名单保留 + 去参整页导航', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=init',
    href: 'http://127.0.0.1:3000/index.html?reset=init',
    store: STANDALONE,
  });
  assert.equal(handleInitResetIfRequested(), true);
  const snap = ls.snapshot();
  // 主库仍在但已裁剪为「新支部初始态」
  assert.ok(snap[INIT_BLOB_KEY], '主库键保留（裁剪而非整键删除）');
  const blob = JSON.parse(snap[INIT_BLOB_KEY]);
  assert.deepEqual(blob.users, BLOB.users, '账号保留');
  assert.deepEqual(blob.branches, BLOB.branches, '支部 config 保留');
  assert.equal(blob.activities.length, 0, '活动清空');
  assert.equal(blob.attendances.length, 0, '考勤清空');
  assert.equal(blob.taskforces.length, 0, '专班清空');
  assert.equal(blob.notices.length, 0, '通知清空');
  assert.equal(blob.archiveRecords.length, 0, '归档材料清空');
  assert.equal(blob.handoffs.length, 0, '交接清空');
  assert.equal(blob.thoughtReports.length, 0, '思想汇报清空');
  assert.equal(blob.agendaVotes.length, 0, '表态记录清空');
  assert.equal(blob.reviewRequests.length, 0, '上报审批清空');
  assert.equal(blob.mailboxConfig, null, '公邮配置清空（seed 兜底默认）');
  // 独立业务/过程键移除
  for (const k of [
    'gsm1921-issue-drafts', 'gsm1921-issue-cache-v3', 'gsm1921-issue-unread-p13',
    'gsm1921-feedback-submissions', 'gsm1921-member-confirmations',
    'gsm1921-base-data-preview', 'gsm1921-dev-stage-overrides', 'gsm1921-workforce-draft',
    'resolution-followup', 'wizard-draft-br-b1', 'wizard-draft-br-other',
    'workflowos_taskforces_v1', 'workflowos_notices_v1', 'assignment_records',
    'attendance_records', 'inspection_records', 'gsm1921-auth-records',
  ]) {
    assert.equal(snap[k], undefined, `独立业务键 ${k} 已移除`);
  }
  // 白名单独立键保留
  for (const k of INIT_WHITELIST_STANDALONE_KEYS) {
    assert.equal(snap[k], STANDALONE[k], `白名单独立键 ${k} 保留`);
  }
  assert.equal(snap.page_pref_other, STANDALONE.page_pref_other, '无关键保留');
  assert.equal(win._replaced, 'http://127.0.0.1:3000/index.html', 'URL 去 reset 参数整页导航');
});

test('执行：无主库现场（全新安装）→ 仅清独立业务键并导航，不报错', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=init',
    href: 'http://127.0.0.1:3000/wizard.html?branch=br-b1&reset=init',
    store: { 'gsm1921-issue-unread-p13': '{}', 'gsm1921-login-user': '{"personId":"p13"}', 'wizard-draft-br-b1': '{}' },
  });
  assert.equal(handleInitResetIfRequested(), true);
  const snap = ls.snapshot();
  assert.equal(snap['gsm1921-issue-unread-p13'], undefined);
  assert.equal(snap['wizard-draft-br-b1'], undefined);
  assert.equal(snap['gsm1921-login-user'], '{"personId":"p13"}', '白名单保留');
  assert.equal(win._replaced, 'http://127.0.0.1:3000/wizard.html?branch=br-b1', '去 reset 参数、保留 branch 参数');
});

test('执行：非 init 档位（demo/preview/别名/未知/缺省）→ false 不动作（不抢占既有档位）', () => {
  for (const qs of ['?reset=demo', '?reset=preview', '?reset=1', '?reset=foo', '?reset=0', '']) {
    const { ls, win } = stubGlobals({
      search: qs,
      href: `http://127.0.0.1:3000/index.html${qs}`,
      store: STANDALONE,
    });
    assert.equal(handleInitResetIfRequested(), false, `${qs || '（无参）'} 不动作`);
    assert.deepEqual(ls.snapshot(), STANDALONE, `存储未被触碰：${qs || '（无参）'}`);
    assert.equal(win._replaced, undefined, '不触发导航');
  }
});

// ═══════════════ ⑤ 接线（可改 reset 触发链） ═══════════════
test('接线：services/mock.js loadDB（mock 数据源）在 ?reset=init 下先于 MockAdapter.loadDB 执行初始化并导航', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=init',
    href: 'http://127.0.0.1:3000/index.html?reset=init',
    store: STANDALONE,
  });
  loadDB();
  assert.equal(win._replaced, 'http://127.0.0.1:3000/index.html', '可改 reset 链执行并去参导航');
  const snap = ls.snapshot();
  const blob = JSON.parse(snap[INIT_BLOB_KEY]);
  assert.equal(blob.activities.length, 0, '业务域已清空');
  assert.deepEqual(blob.branches, BLOB.branches, '白名单（支部 config）保留');
  assert.equal(snap['gsm1921-issue-drafts'], undefined, '独立业务键已移除');
  assert.equal(snap['gsm1921-members-overlay'], STANDALONE['gsm1921-members-overlay'], '成员档案保留');
});
