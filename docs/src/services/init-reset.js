// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/init-reset.js — C3 一键初始化档（?reset=init，2026-09-08 书记裁定）
//  语义：一键从「演示态 / 试用态」转为「新支部初始态」——
//    清空业务过程数据（活动/考勤/考察/专班/通知/汇报/议程决议跟进/归档/交接/
//    意见反馈提交等试用积累），保留白名单（组织骨架）：
//    账号与角色结构、成员档案（people）、支部配置/分工/术语（config 类）、
//    成员在册状态基础（在校/滞留）与主题外观——「保留组织骨架、清空业务过程，空支部起步」。
//
//  与既有档位的关系（reset 分层档案 demo/preview/init 三档并存）：
//    · ?reset=demo   = 全回演示种子（清全部演示存储键 + 历史遗留键，含白名单，回种子初始态）
//    · ?reset=preview= 仅清运行时 overlay/预览键（向导草稿 wizard-draft-*、成员基础数据预览），不动业务本体
//    · ?reset=init   = 本文件：初始化档（从当前态清业务过程 → 可用新支部空业务态，白名单保留）
//
//  可改入口说明（mock-adapter.js 禁改）：core/mock-adapter.js 的 resolveResetTier 只认
//  demo/preview 两档（未知值返回 null 不动作）——init 档无法并入该禁改文件，故本文件
//  在「可改 reset 触发链」落地：services/mock.js loadDB() 在委派 MockAdapter.loadDB()
//  之前先执行 handleInitResetIfRequested()（?reset=init 命中即清库并整页导航，未命中
//  返回 false 走既有 demo/preview 处理，互不冲突）。纯函数（trimInitBlob/collectInitKeys）
//  供单测与执行共用，与 reset-tier 测试范式一致。
//
//  执行边界（与 demo/preview 同构）：仅无 API token 的本地演示形态执行；
//  有 token（sessionStorage['gsm1921-api-token']）一律跳过——数据以服务器为权威，
//  不清登录会话与远端数据；服务端「初始化/重置」= 重建 DB（删 server/data.db 重启
//  自动重种，或 DISABLE_SEED=1 空库起步）或走管理端，见 README 快速开始 reset 说明。
// ════════════════════════════════════════════════════════════════

/** 主库存储键（与 core/mock-adapter.js STORAGE_KEY 同值；mock-adapter 禁改 → 此处显式声明） */
export const INIT_BLOB_KEY = 'workflowos_branch_db_v1';

/**
 * init 档保留的主库字段（白名单 = 组织骨架；键名与 mock-adapter _saveToStorage 一致）：
 *  - _schema            持久化 schema 版本（不可动）
 *  - users              账号与角色结构（u_* 演示账号行 + person 档案同步行）
 *  - branches           支部实例与 config 档案（header/模块组合/分工 workforce/术语主题等，向导可再改）
 *  - appointmentRecords 书记任期档案（账号「职务动态绑定」的在任留痕；随 branches.secretaryId 保留）
 */
export const INIT_BLOB_KEEP_KEYS = ['_schema', 'users', 'branches', 'appointmentRecords'];

/**
 * init 档清空的业务过程域 → 空默认值（键名与 mock-adapter _saveToStorage / domain.js mockDB 对齐）：
 * 数组域 → []；聚合域（actSubRecords/tfSubRecords）→ {}；单对象域（mailboxConfig）→ null
 * （mailboxConfig 清空后由纪检公邮页 seed 兜底注入默认配置，见 mailbox-tab）。
 */
export const INIT_BLOB_CLEAR_DEFAULTS = {
  // 活动域与派生：活动/任务/考勤/考察/分工/补课
  activities: [], tasks: [], attendances: [], inspections: [],
  assignments: [], makeupTasks: [],
  // 活动/专班子记录（聚合域）
  actSubRecords: {}, tfSubRecords: {},
  // 专班/通知/待办/报名
  taskforces: [], notices: [], todos: [], signups: [],
  // 汇报与复盘：活动复盘/专班复盘/思想汇报/宣传任务/宣传周报
  activityReviews: [], taskforceReviews: [], thoughtReports: [], propTasks: [], weeklyReports: [],
  // 归档/文件/资料：档案归档/支部文件/文件空间/图片/经验沉淀/合规引用
  archiveRecords: [], branchDocs: [], fileSpaceRecords: [], imageRecords: [],
  experienceDeposits: [], complianceReferences: [],
  // 公邮域（纪检工具配置 + 查收历史）
  mailboxConfig: null, mailboxHistory: [],
  // 内控/交接/审批：文件流外发确认/三委数据交接/成员变更申请/支委广播/表态/支部上报审批
  externalDispatches: [], handoffs: [], memberChangeRequests: [],
  committeeBroadcasts: [], agendaVotes: [], reviewRequests: [],
};

/**
 * init 档移除的独立 localStorage 业务/过程键（精确匹配；不在白名单 → 清）：
 * 键名与各服务自管键一一对应（issue 草稿/缓存/未读/提交、里程碑缓存、成员确权队列、
 * 成员基础数据预览、发展跟踪覆盖、分工配置草稿、决议跟进、旧版单域遗留键等）。
 * 说明：白名单独立键（gsm1921-members-overlay/gsm1921-residence-overrides/
 * gsm1921-login-user/workflowos_theme/workflowos_accent_role/workflowos_font_size/
 * sop_org_os_auth_audit 等）不在本清单 → 默认保留（未列入即保留，与 demo 档
 * 「前缀整清」形成对照：init 档保白名单）。
 */
export const INIT_EXACT_REMOVE_KEYS = [
  // issue（意见反馈）域：草稿/缓存/版本/提交/迁移标记
  'gsm1921-issue-drafts', 'gsm1921-issue-cache-v3', 'gsm1921-issue-cache-version',
  'gsm1921-issue-cache', 'gsm1921-feedback-submissions', 'gsm1921-feedback-migrated',
  // 里程碑缓存
  'gsm1921-milestone-cache',
  // 成员确权请求队列（member-confirmation 自管键）
  'gsm1921-member-confirmations',
  // 成员基础数据预览（org-base-data-preview）
  'gsm1921-base-data-preview',
  // 发展党员追踪覆盖（development-tab）
  'gsm1921-dev-stage-overrides',
  // 支部分工配置草稿（secretary workforce-panel）
  'gsm1921-workforce-draft',
  // 决议跟进动作（resolution-followup）
  'resolution-followup',
  // 旧版独立存储键（统一全量键架构前的单域键 + 遗留通知/专班键）
  'workflowos_taskforces_v1', 'workflowos_notices_v1',
  'assignment_records', 'attendance_records', 'inspection_records', 'makeup_tasks',
  'act_sub_records', 'tf_sub_records', 'compliance_references', 'file_space_records',
  'experience_deposits', 'gsm1921-auth-records',
];

/**
 * init 档移除的独立 localStorage 业务/过程键（前缀匹配）：
 *  - wizard-draft-*            换组织向导草稿（org-setup-wizard DRAFT_PREFIX）
 *  - gsm1921-issue-unread-*    issue 逐人未读标记（issues UNREAD_KEY_PREFIX）
 */
export const INIT_PREFIX_REMOVE_KEYS = ['wizard-draft-', 'gsm1921-issue-unread-'];

/**
 * init 档保留的独立 localStorage 白名单键（供测试/文档引用；执行端以「未列入移除清单
 * 即保留」为语义，本清单仅作显式核对锚点）：
 *  - gsm1921-members-overlay       成员档案覆盖层（people 档案保留，可后续在名册再调）
 *  - gsm1921-residence-overrides   成员在册状态基础（在校/滞留，roster）
 *  - gsm1921-login-user            登录会话外置说明（auth 会话独立于本档；账号结构保留 → 会话仍有效）
 *  - workflowos_theme / workflowos_accent_role / workflowos_font_size  主题外观（theme 类）
 *  - sop_org_os_auth_audit         登录审计留痕（安全留痕非业务过程，不随业务清空）
 */
export const INIT_WHITELIST_STANDALONE_KEYS = [
  'gsm1921-members-overlay', 'gsm1921-residence-overrides', 'gsm1921-login-user',
  'workflowos_theme', 'workflowos_accent_role', 'workflowos_font_size',
  'sop_org_os_auth_audit',
];

// ════════════════════════════════════════════════════════════════
//  init 态哨兵与演示种子过滤（2026-09-08 C2 修复：?reset=init 浏览器形态稳态）
//  背景：core/mock-adapter.js（禁改）_loadFromStorage 的 T174 判空保护把 init 后的
//  「业务空态」误判为「首次/脏」→ 自动 _seedInitialData() + _mergeNewSeedRecords()
//  把演示种子（activities/tasks/assignments/attendances/notices/archiveRecords/
//  signups 七域）整体回填，且 services/notice|taskforce|signup 的 store 兜底与
//  services/activity|attendance|inspection 的读兜底同效——浏览器形态 init≈demo。
//  可改侧压制机制（哨兵键 + loadDB 后剔除种子 + 兜底守卫）：
//    · 哨兵键 = gsm1921-init-state：?reset=init 执行成功时写入。gsm1921-* 前缀 →
//      ?reset=demo 整清（回种子语义下 init 态自然终止）；preview 档不清；init 档自身
//      不清（未列入移除清单即保留）。
//    · stripSeedRecordsIfInitState(db)：services/mock.js loadDB 委派 MockAdapter.loadDB()
//      之后调用——哨兵在场时剔除 adapter 回填进 mockDB 的演示种子记录（种子 id 判定与
//      mock-adapter merge 同源正则；用户记录 id 均为 prefix_<uuid>/时间戳下划线形态，
//      与种子空间正交，零误伤），白名单（users/branches/appointmentRecords）永不剔除；
//      剔除后由调用方 saveDB 落盘 → 「业务空 + 组织骨架在」跨整页刷新稳态（多轮 loadDB
//      不再回填）。用户后续真实写入的记录（act_*/notice_<ts> 等非种子 id）保留。
//    · isInitStateActive()：store/读兜底共用守卫——无哨兵（demo/preview 前、正常演示态）
//      行为完全不变；哨兵在场时「持久化为空 = 合法的空支部态」，跳过演示种子兜底。
// ════════════════════════════════════════════════════════════════

/** init 态哨兵键（独立 localStorage 键；gsm1921-* 前缀 → ?reset=demo 自动整清 = 回种子终止 init 态） */
export const INIT_STATE_KEY = 'gsm1921-init-state';

/**
 * 当前是否处于「init 已完成」态（哨兵键在场即真）。
 * store 层兜底 / 读兜底 / loadDB 种子过滤共用；localStorage 不可用一律 false（不影响正常加载）。
 * @returns {boolean}
 */
export function isInitStateActive() {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(INIT_STATE_KEY) !== null;
  } catch (e) {
    return false;
  }
}

/**
 * 演示种子 id 判定（与 core/mock-adapter.js merge/seed 的种子 id 空间同源：
 * 种子 = 「连字符 + 数字」；用户记录 = generateId 的「prefix_<uuid>」或时间戳下划线形态，
 * 二者正交——adapter 自身即以此区分种子同步与用户数据，本表复用同一判定零误伤）：
 *  - activities    act-\d+（ACTIVITIES，merge /^act-\d+$/）
 *  - tasks         tsk-\d+（SEED_TASKS，_seedInitialData 整表回填）
 *  - assignments   assign_seed_\d+（SEED_ASSIGNMENTS）
 *  - attendances   att\d+（ATTENDANCE_RECORDS，merge /^att\d+$/）
 *  - notices       notice-\d{3}（MOCK_NOTICES，merge /^notice-\d{3}$/；用户 notice-<13位时间戳> 不匹配）
 *  - archiveRecords ar\d+（SEED_ARCHIVE_RECORDS，merge /^ar\d+$/）
 *  - signups       su-\d{3}（SEED_SIGNUPS，merge /^su-\d{3}$/）
 * 不列入：users/branches/appointmentRecords（init 白名单，永不剔除）。
 */
const INIT_SEED_ID_PATTERNS = {
  activities: /^act-\d+$/,
  tasks: /^tsk-\d+$/,
  assignments: /^assign_seed_\d+$/,
  attendances: /^att\d+$/,
  notices: /^notice-\d{3}$/,
  archiveRecords: /^ar\d+$/,
  signups: /^su-\d{3}$/,
};

/**
 * init 态演示种子剔除（纯内存操作，幂等）：
 * 仅当哨兵在场（init 已完成）时，把 mockDB 中被 mock-adapter 判空回填/种子增量合并
 * 引入的演示种子记录剔除（非种子用户记录与白名单原样保留）；返回是否有变更
 * （有则调用方应 saveDB 落盘，使空态跨刷新稳态）。
 * @param {Object} db mockDB（core/domain.js）
 * @returns {boolean} 是否剔除了种子记录
 */
export function stripSeedRecordsIfInitState(db) {
  if (!isInitStateActive()) return false;
  let changed = false;
  for (const [key, re] of Object.entries(INIT_SEED_ID_PATTERNS)) {
    const arr = db[key];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const kept = arr.filter(x => !(x && typeof x.id === 'string' && re.test(x.id)));
    if (kept.length !== arr.length) {
      db[key] = kept;
      changed = true;
    }
  }
  if (changed) console.info('[InitReset] init 态：已剔除 loadDB 回填的演示种子（业务域保持空，白名单/用户记录保留）');
  return changed;
}

/**
 * init 档主库裁剪（纯函数，供单测与执行共用）：
 * 白名单键（INIT_BLOB_KEEP_KEYS）原样保留；业务过程域按 INIT_BLOB_CLEAR_DEFAULTS
 * 置为空默认（数组 [] / 聚合 {} / 单对象 null）；未知扩展键原样保留（不误伤未来新增域）。
 * @param {Object} parsed 已 JSON.parse 的主库对象
 * @returns {Object} 裁剪后的主库对象（新引用，不改入参）
 */
export function trimInitBlob(parsed) {
  const out = { ...parsed };
  for (const [key, empty] of Object.entries(INIT_BLOB_CLEAR_DEFAULTS)) {
    out[key] = Array.isArray(empty) ? [] : (empty === null ? null : {});
  }
  return out;
}

/**
 * 收集 init 档应移除的独立 localStorage 键（纯函数，供单测与执行共用）：
 * 业务/过程键精确匹配（INIT_EXACT_REMOVE_KEYS）+ 前缀匹配（INIT_PREFIX_REMOVE_KEYS）；
 * 白名单与无关键不在结果集（未列入即保留）。与 demo 档「遗留键恒纳入」不同：
 * init 档只移除「在场且命中」的键（removeItem 幂等，缺省现场不产生恒清副作用）。
 * @param {string[]} [presentKeys] 当前存储的全部键
 * @returns {string[]} 待移除键清单（去重）
 */
export function collectInitKeys(presentKeys = []) {
  const out = new Set();
  for (const k of presentKeys) {
    if (INIT_EXACT_REMOVE_KEYS.includes(k)) out.add(k);
    else if (INIT_PREFIX_REMOVE_KEYS.some(p => k.startsWith(p))) out.add(k);
  }
  return [...out];
}

/**
 * URL ?reset=init 初始化执行（C3，2026-09-08）：
 * 1) 主库 workflowos_branch_db_v1：trimInitBlob 裁剪后写回（业务过程清空、白名单保留）；
 * 2) 独立业务/过程键（issue 提交/草稿/未读、确权队列、决议跟进、向导草稿、预览覆盖、
 *    旧版单域遗留键等）逐键移除；
 * 3) 去掉 URL 上的 reset 参数整页导航（replace），新页面不再触发（防重复执行）、恢复正常加载。
 *
 * 边界（与 demo/preview 同构，复核 2026-09-08）：
 * - 仅在无 API token（sessionStorage['gsm1921-api-token'] 不存在）的纯演示/本地 mock 场景执行；
 *   API 模式数据以服务器为权威，本档跳过——不清 sessionStorage 登录会话与远端数据
 *   （服务端「初始化」= 重建 DB 或走管理端，见 README 快速开始 reset 说明）。
 * - 非 init 档位（demo/preview/未知）一律返回 false——demo/preview 仍由
 *   MockAdapter.loadDB 内既有 handleResetIfRequested 处理，本函数不抢、不改其键集。
 * - 所有存储访问均包 try-catch：隐私模式/存储不可用时跳过，不影响正常加载。
 * @returns {boolean} true=已执行初始化并触发导航（调用方应中止本次加载）
 */
export function handleInitResetIfRequested() {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gsm1921-api-token')) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== 'init') return false;

    // ① 主库裁剪：白名单（_schema/users/branches/appointmentRecords）保留、业务域清空
    const raw = localStorage.getItem(INIT_BLOB_KEY);
    if (raw) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        localStorage.setItem(INIT_BLOB_KEY, JSON.stringify(trimInitBlob(parsed)));
      }
    }

    // ② 独立业务/过程键移除（在场命中才移除；白名单未列入清单 → 自动保留）
    const presentKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) presentKeys.push(k);
    }
    const removeKeys = collectInitKeys(presentKeys);
    removeKeys.forEach(k => localStorage.removeItem(k));

    // ③ init 态哨兵写入（C2 2026-09-08）：?reset=init 已完成 → 标记「业务空 = 合法空支部态」。
    // 消费方：services/mock.js loadDB（MockAdapter.loadDB 后剔除 adapter 判空回填的演示种子）
    // 与 store/读兜底守卫（跳过演示种子兜底）。gsm1921-* 前缀 → ?reset=demo 整清即终止 init 态；
    // preview 档不清；本档自身不清（未列入移除清单即保留）。
    try {
      localStorage.setItem(INIT_STATE_KEY, JSON.stringify({ at: new Date().toISOString() }));
    } catch (_) { /* 哨兵写失败不阻断初始化（下轮仅少一层过滤，adapter 回填行为与修复前一致） */ }

    console.info(`[InitReset] ?reset=init 已初始化为「新支部初始态」：业务过程数据已清空（${removeKeys.length} 个独立业务键移除 + 主库业务域置空），白名单保留（账号/成员档案/支部配置/在册状态/主题/登录会话），正在刷新`);
    // ④ 去掉 URL 上的 reset 参数再导航，防止新页面再次触发（造成重复执行）
    const url = new URL(window.location.href);
    url.searchParams.delete('reset');
    window.location.replace(url.toString());
    return true;
  } catch (e) {
    console.warn('[InitReset] ?reset=init 初始化失败（已跳过，不影响正常加载）：', e);
    return false;
  }
}
