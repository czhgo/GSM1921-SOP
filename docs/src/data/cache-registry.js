// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  cache-registry.js — 浏览器存储键的**四类单一源**（2026-10-26 Task 2.2）
// ════════════════════════════════════════════════════════════════
//  口径（spec「浏览器缓存边界」）：浏览器只允许长期保存**纯展示偏好**；业务读缓存必须带集合版本；
//  会话鉴权只存登录快照 / tabId / session / token；草稿与预览只在本机、且不承担业务成功。
//  四类：
//    visual     — 主题 / 字号 / 强调色 / 页签顺序 / 提醒关闭等纯展示偏好
//    auth       — 登录快照 / tabId / 会话快照 / API token / 跨页会话（不得承载业务数据）
//    read-cache — 业务读缓存（服务端为权威；本地只是镜像，必须带 `_versions`）
//    temp       — 草稿 / 预览 / 一次性迁移或遗留清理键
//  未登记的键一律返回 `unknown` —— 守卫据此判红（`server/test/localstorage-key-guard.test.mjs`）。
//
//  前缀规则承接**模板键**（如 `gsm1921-pref-<personId>-theme`）：
//  守卫对字面量只做「精确键 ∪ 前缀」两档匹配，不用宽泛正则放过模板键。
// ════════════════════════════════════════════════════════════════

/** 四类 + unknown（守卫的判红出口） */
export const CACHE_CATEGORIES = Object.freeze({
  VISUAL: 'visual',
  AUTH: 'auth',
  READ_CACHE: 'read-cache',
  TEMP: 'temp',
  UNKNOWN: 'unknown',
});

/**
 * 精确键登记表。
 * 每条带 `category` 与一句「为什么落在这一类」；新增 localStorage / sessionStorage 字面键必须在此登记。
 * @type {Record<string, {category: string, storage: 'localStorage'|'sessionStorage'|'both', note: string}>}
 */
export const CACHE_KEYS = Object.freeze({
  // ── visual：纯展示偏好 ─────────────────────────────────────
  'workflowos_theme': { category: 'visual', storage: 'localStorage', note: '主题偏好（访客全局键）' },
  'workflowos_font_size': { category: 'visual', storage: 'localStorage', note: '字号偏好（访客全局键）' },
  'workflowos_accent_role': { category: 'visual', storage: 'localStorage', note: '强调色偏好（访客全局键）' },
  'gsm1921-remote-probe': { category: 'visual', storage: 'localStorage', note: '远端变更探测开关（UI 偏好，默认开）' },

  // ── auth：会话鉴权（不承载业务数据）──────────────────────
  'gsm1921-login-user': { category: 'auth', storage: 'localStorage', note: '登录快照（跨标签兜底；不含业务数据）' },
  'gsm1921-tab-id': { category: 'auth', storage: 'sessionStorage', note: '本标签页唯一 ID（A-11 防串扰）' },
  'gsm1921-session-snap': { category: 'auth', storage: 'sessionStorage', note: '本标签页登录会话快照' },
  'gsm1921-api-token': { category: 'auth', storage: 'sessionStorage', note: 'API 会话 token（禁止写 localStorage）' },
  'gsm1921-accounts': { category: 'auth', storage: 'localStorage', note: 'mock 形态可持久化账号层（静态/开发模式兼容，非业务数据）' },
  'sop_org_os_session': { category: 'auth', storage: 'sessionStorage', note: '跨页会话状态' },
  'sop_org_os_data_version': { category: 'auth', storage: 'sessionStorage', note: '跨页数据版本（会话内失效用）' },

  // ── read-cache：业务读缓存（服务端权威）──────────────────
  'workflowos_branch_db_v1': { category: 'read-cache', storage: 'localStorage', note: 'mock/api 整库本地备份；api 形态必须带 `_versions` + `savedAt`，缺版本/过期不得当权威' },
  'workflowos_taskforces_v1': { category: 'read-cache', storage: 'localStorage', note: '专班旧单域键（历史遗留；已并入整库键）' },
  'workflowos_notices_v1': { category: 'read-cache', storage: 'localStorage', note: '通知旧单域键（历史遗留；已并入整库键）' },
  'gsm1921-residence-overrides': { category: 'read-cache', storage: 'localStorage', note: '在册/滞留状态缓存；服务端 users 行为权威' },
  'gsm1921-member-confirmations': { category: 'read-cache', storage: 'localStorage', note: '成员变更确认队列缓存；服务端 member_confirmations 为权威' },
  'gsm1921-attendance-appeals': { category: 'read-cache', storage: 'localStorage', note: '出勤申诉队列缓存；服务端 attendance_appeals 为权威' },
  'gsm1921-inspection-appeals': { category: 'read-cache', storage: 'localStorage', note: '考察申诉队列缓存；服务端 inspection_appeals 为权威' },
  'sop_org_os_auth_audit': { category: 'read-cache', storage: 'localStorage', note: '授权审计留痕缓存；服务端 auth_audit 为权威' },
  'gsm1921-issue-cache-v3': { category: 'read-cache', storage: 'localStorage', note: '意见反馈读缓存；服务端 issues 表为权威' },
  'gsm1921-issue-cache': { category: 'read-cache', storage: 'localStorage', note: '意见反馈旧读缓存（历史版本）' },
  'gsm1921-issue-cache-version': { category: 'read-cache', storage: 'localStorage', note: '意见反馈缓存版本号（缓存失效用，非数据本体）' },
  'gsm1921-milestone-cache': { category: 'read-cache', storage: 'localStorage', note: '里程碑读缓存；服务端 milestones 为权威' },
  'gsm1921-members-overlay': { category: 'read-cache', storage: 'localStorage', note: 'mock 形态成员档案覆盖层（api 形态读 server users）' },
  'issue_reveals': { category: 'read-cache', storage: 'localStorage', note: '匿名反馈揭名历史留痕（服务端 issue_reveals）' },

  // ── temp：草稿 / 预览 / 一次性 ──────────────────────────
  'gsm1921-base-data-preview': { category: 'temp', storage: 'localStorage', note: '换组织前本机预览（绝不写服务端）' },
  'gsm1921-issue-drafts': { category: 'temp', storage: 'localStorage', note: '未提交反馈草稿' },
  'gsm1921-workforce-draft': { category: 'temp', storage: 'localStorage', note: '支书台拟定分工草稿' },
  'workflowos_leader_activity_draft': { category: 'temp', storage: 'localStorage', note: '组长写入活动表单草稿' },
  'gsm1921-dev-stage-overrides': { category: 'temp', storage: 'localStorage', note: '已服务端化的遗留键（仅启动清理）' },
  'gsm1921-issue-submitter-token': { category: 'temp', storage: 'localStorage', note: '匿名防刷令牌（按设计只在本设备）' },
  'gsm1921-init-state': { category: 'temp', storage: 'localStorage', note: '初始化档闸门（本标签页语义落盘位）' },
  'gsm1921-feedback-migrated': { category: 'temp', storage: 'localStorage', note: '反馈迁移一次性标记' },
  'gsm1921-feedback-submissions': { category: 'temp', storage: 'localStorage', note: '旧版反馈本地提交件（迁移后清除）' },
  'gsm1921-pending-writes-outbox': { category: 'temp', storage: 'localStorage', note: '写失败待同步队列（只存集合名/错误/时间；不承担业务成功，恢复后可重试或放弃）' },
  'sop_org_os_assigned_roles': { category: 'temp', storage: 'localStorage', note: '历史遗留键（仅启动清理）' },
});

/**
 * 前缀型键：`gsm1921-pref-<personId>-theme` 这类模板键由前缀规则承接。
 * 条目形如 `{ prefix, category, note }`；顺序不影响结果（首个命中即返回）。
 * @type {Array<{prefix: string, category: string, note: string}>}
 */
export const CACHE_KEY_PREFIXES = Object.freeze([
  { prefix: 'gsm1921-pref-', category: 'visual', note: '逐人外观偏好（theme / font-size / accent-role / tab-order）' },
  { prefix: 'workflowos_tab_', category: 'visual', note: '工作台页签记忆（默认页 / 页签顺序）' },
  { prefix: 'cps-', category: 'auth', note: '跨页单值会话参数' },
  { prefix: 'gsm1921-issue-unread-', category: 'read-cache', note: '逐人未读标记缓存（服务端 issue_unread 为权威）' },
  { prefix: 'wizard-draft-', category: 'temp', note: '换组织向导未完成草稿（按支部一份）' },
]);

/**
 * 归类一个存储键（精确键优先，其次前缀）。
 * @param {string} key
 * @returns {'visual'|'auth'|'read-cache'|'temp'|'unknown'}
 */
export function classifyCacheKey(key) {
  if (!key) return CACHE_CATEGORIES.UNKNOWN;
  const exact = CACHE_KEYS[key];
  if (exact) return exact.category;
  for (const rule of CACHE_KEY_PREFIXES) {
    if (String(key).startsWith(rule.prefix)) return rule.category;
  }
  return CACHE_CATEGORIES.UNKNOWN;
}

/** 该键是否属于纯展示偏好（守卫的 visual 白名单口径） */
export function isVisualCacheKey(key) {
  return classifyCacheKey(key) === CACHE_CATEGORIES.VISUAL;
}

/** 该键是否属于业务读缓存（必须带集合版本的备份只应落在这一类） */
export function isReadCacheKey(key) {
  return classifyCacheKey(key) === CACHE_CATEGORIES.READ_CACHE;
}

// ════════════════════════════════════════════════════════════════
//  业务读缓存备份的元数据契约（Task 2.3）
// ════════════════════════════════════════════════════════════════
//  api 形态的本地备份（`workflowos_branch_db_v1`）写入时必须带：
//    `_versions` — 各集合**落盘时**的集合版本（`GET /api/v1/snapshot/versions` 的同名字段）
//    `savedAt`   — 落盘时间（ISO）
//  读取时（目前唯一读口＝`restoreNicheCollections` 的服务端拉取失败兜底）若缺版本、缺时间、
//  超过有效期，或与当前服务端基线不一致 ⇒ **不得当权威**，调用方须改为从服务端重拉。
export const BACKUP_META = Object.freeze({
  VERSIONS: '_versions',
  SAVED_AT: 'savedAt',
  /** 备份最长可被当作兜底的有效期：超过即视为过期（服务端才是权威） */
  MAX_AGE_MS: 30 * 60 * 1000,
});

/**
 * 校验业务读缓存备份是否仍可被当作「服务端数据的临时镜像」。
 * @param {Object} parsed 解析后的备份对象
 * @param {{ expectedVersions?: Record<string, number>|null, now?: number, maxAgeMs?: number }} [opts]
 * @returns {{ ok: boolean, reason?: string, versions?: Record<string, number>, savedAt?: number }}
 */
export function validateBackupPayload(parsed, opts = {}) {
  const { expectedVersions = null, now = Date.now(), maxAgeMs = BACKUP_META.MAX_AGE_MS } = opts;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'backup-not-object' };
  }
  const versions = parsed[BACKUP_META.VERSIONS];
  if (!versions || typeof versions !== 'object' || Array.isArray(versions)) {
    return { ok: false, reason: 'missing-versions' };
  }
  const savedAt = Date.parse(parsed[BACKUP_META.SAVED_AT]);
  if (!Number.isFinite(savedAt)) return { ok: false, reason: 'missing-saved-at' };
  if (now - savedAt > maxAgeMs) return { ok: false, reason: 'expired' };
  if (expectedVersions && typeof expectedVersions === 'object') {
    for (const name of Object.keys(expectedVersions)) {
      if (versions[name] === undefined) return { ok: false, reason: `missing-version:${name}` };
      if (Number(versions[name]) !== Number(expectedVersions[name])) {
        return { ok: false, reason: `stale:${name}` };
      }
    }
  }
  return { ok: true, versions, savedAt };
}

// ════════════════════════════════════════════════════════════════
//  写成功可证：集合级单一源（Task 3 · 2026-10-26）
// ════════════════════════════════════════════════════════════════
// 判据（spec「写入成功必须可证」）：一次业务写只有在满足下列之一时才算成功——
//   ① 集合在快照 payload 内且服务端 2xx；② 走语义端点且 2xx；③ 纯本机 temp（不承担业务成功）。
// 因此 `data-adapter.js` 的 flush 必须以这两份清单做**显式分流**，不得用「没脏就 resolve」掩盖：
//   · SNAPSHOT_COVERED_COLLECTIONS —— 与 `_buildSnapshotPayload()` 的键**逐一对应**（守卫核）；
//   · SEMANTIC_SYNC_COLLECTIONS    —— 不在快照、但有行级语义写口（本批：转移/取消标注）；
//   · LOCAL_ONLY_COLLECTIONS       —— 只应本机的存量域（registry 标 temp，UI 明示「本机未同步」）。
//   · OUT_OF_BAND_COLLECTIONS      —— 写口已在业务服务内先行调用语义端点并 `trackWrite` 的域；
//                                    flush 不再重复写，也不把它们当「可静默成功」。
/** 快照 payload 覆盖的集合（单一源；`data-adapter` 守卫逐键核对） */
export const SNAPSHOT_COVERED_COLLECTIONS = Object.freeze([
  'activities', 'tasks', 'attendances', 'inspections', 'taskforces',
  'notices', 'todos', 'assignments', 'makeupTasks',
  'experienceDeposits', 'fileSpaceRecords', 'imageRecords',
  'signups', 'activityReviews', 'taskforceReviews', 'propTasks',
  'periodicArchives', 'archiveRecords', 'externalDispatches',
  'thoughtReports', 'partyGroups', 'memberFlows',
  'actSubRecords', 'tfSubRecords',
]);

/** 不在快照、但由 flush 逐行调用语义端点落库的集合（本批新增的标注类写口） */
export const SEMANTIC_SYNC_COLLECTIONS = Object.freeze([
  'agendaVotes',
  'memberChangeRequests',
]);

/**
 * 只应保存在本机的存量域（`category: 'temp'`）。
 * 每条必须写理由；UI 必须明示「本机未同步」，不得把本地写入当成业务成功。
 */
export const LOCAL_ONLY_COLLECTION_META = Object.freeze({
  committeeBroadcasts: {
    category: 'temp',
    reason: 'P1-26 起支委广播停止写入、服务端只读保留；成员移出时的已读/转移标注只能留本机',
  },
});

/** 只应本机的集合名（由上面元数据派生，避免两份清单漂移） */
export const LOCAL_ONLY_COLLECTIONS = Object.freeze(Object.keys(LOCAL_ONLY_COLLECTION_META));

/**
 * 写口已在本服务内先行落服务端（语义端点 + `trackWrite`）的域。
 * flush 不再重复写；它们不出现在快照 payload，也不属于「快照未覆盖就静默成功」的遮挡。
 */
export const OUT_OF_BAND_COLLECTIONS = Object.freeze([
  'users', 'branches', 'branchDocs', 'appointmentRecords', 'reviewRequests',
  'workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs',
  'attendanceRosters',
  'handoffs', 'pendingMemberConfirmations', 'milestones',
  'attendanceAppeals', 'inspectionAppeals', 'issueUnread', 'authAudit',
]);

/**
 * 业务读缓存备份的**顶层集合名**（与 `_saveToStorage` 的序列化字段同源；供
 * 「本地备份缺版本时必须从服务端逐集合重拉」使用）。
 * ⚠ 只列**读缓存备份**里的业务集合，不含用户与按纪律排除项。
 */
export const NICHE_COLLECTION_NAMES = Object.freeze([
  'experienceDeposits',
  'fileSpaceRecords',
  'imageRecords',
  'signups',
  'activityReviews',
  'taskforceReviews',
  'propTasks',
  'periodicArchives',
  'archiveRecords',
  'externalDispatches',
  'branchDocs',
  'memberChangeRequests',
  'committeeBroadcasts',
  'agendaVotes',
  'handoffs',
  'thoughtReports',
  'partyGroups',
  'memberFlows',
  'branches',
  'appointmentRecords',
  'reviewRequests',
  'workgroups',
  'workgroupMembers',
  'workgroupGrants',
  'workgroupTasks',
  'workgroupOutputs',
  'attendanceRosters',
  'actSubRecords',
  'tfSubRecords',
]);
