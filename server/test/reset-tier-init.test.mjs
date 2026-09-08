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
  INIT_STATE_KEY, stripSeedRecordsIfInitState,
  collectInitKeys, trimInitBlob, handleInitResetIfRequested,
} = await import('../../docs/src/services/init-reset.js?v=20260908d');
// 接线冒烟（⑤）：走 services/mock.js loadDB 可改 reset 链（数据源默认 mock）
const { loadDB, saveDB } = await import('../../docs/src/services/mock.js?v=20260908d');
// C2 修复（⑥）：浏览器加载链多轮 loadDB 稳态断言（内存 mockDB 与浏览器同源单例）
const { mockDB } = await import('../../docs/src/core/domain.js?v=20260908d');

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

// ═══════════════ ⑥ C2 修复：init 态浏览器加载链多轮稳态（2026-09-08） ═══════════════
// 缺陷：?reset=init 后整页刷新（同次加载链 loadDB → MockAdapter.loadDB → _loadFromStorage）
// 把「业务空态」误判为首次/脏 → _seedInitialData() + _mergeNewSeedRecords() 回填演示种子，
// 浏览器形态 init≈demo。修复：init 档执行写 init 态哨兵（gsm1921-init-state）；loadDB 委派
// MockAdapter.loadDB 后 stripSeedRecordsIfInitState 剔除回填种子并 saveDB——多轮 loadDB
// 业务域稳态为空、白名单（账号/支部 config/任期档案）在；demo 无哨兵仍回种子（行为不变）。

/** 演示种子回填域（mock-adapter merge/_seedInitialData 会回填的全部业务域） */
const SEED_BACKFILL_KEYS = ['activities', 'tasks', 'assignments', 'attendances', 'notices', 'archiveRecords', 'signups'];

test('C2 修复：init 后浏览器加载链多轮 loadDB——业务域空 / 白名单在 / 再次 loadDB 仍空不回填', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=init',
    href: 'http://127.0.0.1:3000/index.html?reset=init',
    store: STANDALONE,
  });
  // ① 首轮：?reset=init 命中 → trim 落库 + 独立业务键移除 + init 态哨兵写入 + 去参整页导航（中止本次加载）
  loadDB();
  assert.equal(win._replaced, 'http://127.0.0.1:3000/index.html');
  assert.ok(ls.getItem(INIT_STATE_KEY) !== null, 'init 态哨兵已写入（gsm1921- 前缀，demo 档会整清）');
  assert.equal(JSON.parse(ls.getItem(INIT_BLOB_KEY)).activities.length, 0, '主库业务域已清空');

  // ② 模拟整页刷新（导航后 URL 已去 reset 参数）→ 第 2 轮 loadDB：
  //    MockAdapter.loadDB 判空回填演示种子 → stripSeedRecordsIfInitState 剔除 → 业务域空、白名单在
  win.location.search = '';
  win.location.href = 'http://127.0.0.1:3000/index.html';
  loadDB();
  for (const key of SEED_BACKFILL_KEYS) {
    assert.equal(mockDB[key].length, 0, `第 2 轮 loadDB 后 ${key} 为空（不被种子回填）`);
  }
  assert.equal(mockDB.taskforces.length, 0, 'taskforces 为空');
  assert.ok(mockDB.users.some(u => u.id === 'u_sec'), '账号结构保留（空支部起步登录可用）');
  assert.ok(mockDB.branches.some(b => b.id === 'br-b1'), '支部实例 br-b1 保留');
  assert.ok(mockDB.branches[0].config.headerTitle && mockDB.branches[0].config.workforce, '支部 config（header/分工）保留');
  assert.ok(mockDB.appointmentRecords.length >= 1, '书记任期档案保留');

  // ③ 第 3 轮 loadDB：仍空（多轮稳态，不回填）
  loadDB();
  for (const key of SEED_BACKFILL_KEYS) {
    assert.equal(mockDB[key].length, 0, `第 3 轮 loadDB 后 ${key} 仍为空（稳态）`);
  }
  assert.ok(mockDB.branches.some(b => b.id === 'br-b1'), '第 3 轮骨架仍在');
  // 落盘稳态：strip 后 saveDB 已把空态写回主库——即使脱离内存、直接读持久层也是空业务 + 骨架
  const persisted = JSON.parse(ls.getItem(INIT_BLOB_KEY));
  for (const key of SEED_BACKFILL_KEYS) {
    assert.equal(persisted[key].length, 0, `落库 ${key} 为空（跨刷新不依赖内存）`);
  }
  assert.ok(persisted.branches[0].id === 'br-b1' && persisted.branches[0].config.headerTitle, '落库骨架（支部 config）保留');
  assert.ok(ls.getItem(INIT_STATE_KEY) !== null, 'init 态哨兵在（preview 不清；demo 才终止）');
});

test('C2 修复：init 态用户后续真实写入（非种子 id）不被剔除——再次 loadDB 用户记录在、种子仍不回填', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=init',
    href: 'http://127.0.0.1:3000/index.html?reset=init',
    store: STANDALONE,
  });
  loadDB(); // ① init 档执行（trim + 哨兵 + 导航）
  win.location.search = '';
  win.location.href = 'http://127.0.0.1:3000/index.html';
  loadDB(); // ② 刷新后第 2 轮：稳态空
  // ③ 新支部起步：书记新建一条真实活动（id=act_<uuid> 非种子形态）+ 一条真实通知（notice-<13位时间戳>）
  mockDB.activities = [{ id: 'act_0f9a-1111', title: '新支部第一次党员大会', status: 'draft' }];
  mockDB.notices = [{ id: 'notice-' + Date.now(), title: '支部新通知' }];
  saveDB();
  // ④ 再次 loadDB：用户记录保留（不被 strip 误删）、演示种子仍不回填
  loadDB();
  assert.equal(mockDB.activities.length, 1, '用户新建活动保留');
  assert.ok(/^act_/.test(mockDB.activities[0].id), '保留的是用户记录而非种子');
  assert.equal(mockDB.notices.length, 1, '用户新建通知保留');
  assert.ok(/^notice-\d{13}$/.test(mockDB.notices[0].id), '时间戳通知不被当作 3 位数字种子剔除');
  assert.ok(mockDB.branches.some(b => b.id === 'br-b1'), '骨架仍在');
  const persisted = JSON.parse(ls.getItem(INIT_BLOB_KEY));
  assert.equal(persisted.activities.length, 1, '落库含用户活动');
  assert.equal(persisted.notices.length, 1, '落库含用户通知');
});

test('C2 修复对照：demo 档仍回种子（无 init 哨兵 → loadDB 正常回填演示数据，行为不变）', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=demo',
    href: 'http://127.0.0.1:3000/index.html?reset=demo',
    store: STANDALONE,
  });
  loadDB(); // demo 档：清全部演示存储键（含 gsm1921-init-state 哨兵）→ 去参导航
  assert.equal(win._replaced, 'http://127.0.0.1:3000/index.html');
  assert.equal(ls.getItem(INIT_STATE_KEY), null, 'demo 清除含 init 哨兵（init 态终止，回种子语义）');
  // 模拟整页刷新：主库已被 demo 清除 → !raw → _seedInitialData 回种子（demo 既有行为）
  win.location.search = '';
  win.location.href = 'http://127.0.0.1:3000/index.html';
  loadDB();
  assert.ok(mockDB.activities.length > 0, 'demo 回填演示活动（行为不变）');
  assert.ok(mockDB.tasks.length > 0 || mockDB.assignments.length > 0 || mockDB.signups.length > 0, 'demo 回填派生演示域');
  assert.ok(mockDB.branches.some(b => b.id === 'br-b1'), 'demo 支部骨架在');
});

test('C2 修复：stripSeedRecordsIfInitState——有哨兵只剔种子留用户记录与白名单；无哨兵不动；幂等', () => {
  const db = {
    activities: [{ id: 'act-1' }, { id: 'act_abc' }],
    tasks: [{ id: 'tsk-001' }, { id: 'tsk_xyz' }],
    assignments: [{ id: 'assign_seed_001' }, { id: 'asgn_xyz' }],
    attendances: [{ id: 'att1' }, { id: 'att_xyz' }],
    notices: [{ id: 'notice-101' }, { id: 'notice-1752345678901' }],
    archiveRecords: [{ id: 'ar1' }, { id: 'ar_xyz' }],
    signups: [{ id: 'su-001' }, { id: 'su_xyz' }],
    branches: [{ id: 'br-b1' }], users: [{ id: 'u_sec' }], appointmentRecords: [{ id: 'appt-1' }],
  };
  // 无哨兵（正常演示态）：不动
  const { ls } = stubGlobals({ search: '', href: 'http://127.0.0.1:3000/index.html', store: { page_pref: 'x' } });
  assert.equal(stripSeedRecordsIfInitState(db), false, '无哨兵不剔除');
  assert.equal(db.activities.length, 2, '无哨兵原样');
  // 有哨兵（init 已完成）：剔种子、留用户记录与白名单
  ls.setItem(INIT_STATE_KEY, '{"at":"2026-09-08T00:00:00.000Z"}');
  assert.equal(stripSeedRecordsIfInitState(db), true, '有哨兵剔除种子');
  assert.deepEqual(db.activities.map(a => a.id), ['act_abc'], 'activities：剔 act-数字 种子、留用户记录');
  assert.deepEqual(db.tasks.map(t => t.id), ['tsk_xyz'], 'tasks：剔 tsk-数字 种子');
  assert.deepEqual(db.assignments.map(a => a.id), ['asgn_xyz'], 'assignments：剔 assign_seed_ 种子');
  assert.deepEqual(db.attendances.map(a => a.id), ['att_xyz'], 'attendances：剔 att 数字 种子');
  assert.deepEqual(db.notices.map(n => n.id), ['notice-1752345678901'], 'notices：剔 3 位数字种子、留时间戳用户记录');
  assert.deepEqual(db.archiveRecords.map(r => r.id), ['ar_xyz'], 'archiveRecords：剔 arN 种子');
  assert.deepEqual(db.signups.map(s => s.id), ['su_xyz'], 'signups：剔 su-数字 种子');
  assert.equal(db.branches.length, 1, '白名单 branches 不剔');
  assert.equal(db.users.length, 1, '白名单 users 不剔');
  assert.equal(db.appointmentRecords.length, 1, '白名单 appointmentRecords 不剔');
  // 幂等：二次剔除无变更
  assert.equal(stripSeedRecordsIfInitState(db), false, '二次剔除无变更（幂等）');
});

test('C2 修复：loadActivities 读兜底——init 态空态返回 []（不回退演示种子）；无哨兵保持原回退', async () => {
  const { loadActivities } = await import('../../docs/src/services/activity.js?v=20260908d');
  const { ls } = stubGlobals({ search: '', href: 'http://127.0.0.1:3000/index.html', store: { page_pref: 'x' } });
  // 无哨兵（正常演示态）：mockDB 空 → 回退演示种子（首屏早期/未加载语义不变）
  mockDB.activities = [];
  assert.ok(loadActivities().length > 0, '无哨兵：空态回退演示活动（demo 行为不变）');
  // init 态（哨兵在场）：空 = 合法空支部态 → 返回 []（不回退演示种子）
  ls.setItem(INIT_STATE_KEY, '{"at":"2026-09-08T00:00:00.000Z"}');
  mockDB.activities = [];
  assert.equal(loadActivities().length, 0, 'init 态：空态返回 []');
  // init 态有真实数据：照常返回
  mockDB.activities = [{ id: 'act_abc', title: '新支部活动' }];
  assert.equal(loadActivities().length, 1, 'init 态：有数据照常返回');
  mockDB.activities = [];
});
