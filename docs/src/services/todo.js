// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.todo.js — 待办任务服务层
//  最小三成本原则落地：任务流默认直接展示在工作台
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18-§2.20
//         content/04_web_design/design-system/DESIGN_SYSTEM.md §一 第6条
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260908c';
import { persist } from '../core/data-adapter.js?v=20260908c';
import { generateId } from '../core/id.js?v=20260908c';
import { bumpToken, tokenOf } from '../core/version-token.js?v=20260908c';

// ── 待办分类枚举 ──────────────────────────────────────────────
export const TodoCategory = {
  AUTH: 'auth',       // 赋权类：待赋权活动、待赋权专班、待设党小组组长
  ARCHIVE: 'archive', // 归档类：待归档活动、待归档专班
  REVIEW: 'review',   // 审核类：考勤确认、考察确认、复盘审核、活动审批
  NOTICE: 'notice',   // 通知类：通知阅读、通知催读
  SUBMIT: 'submit',   // 提交类：考勤上传、考察上传、复盘提交、周报报送
  TRACK: 'track',     // 追踪类：发展党员追踪、材料催缴、补课跟进
};

/** 待办分类中文标签 */
export const TODO_CATEGORY_LABELS = {
  [TodoCategory.AUTH]: '赋权类',
  [TodoCategory.ARCHIVE]: '归档类',
  [TodoCategory.REVIEW]: '审核类',
  [TodoCategory.NOTICE]: '通知类',
  [TodoCategory.SUBMIT]: '提交类',
  [TodoCategory.TRACK]: '追踪类',
};

// ── 待办业务域枚举（工作类型 9 域 + NONE）────────────────────
//  2026-09-07 IA-C1：书记裁定「待办按工作类型（业务域）分类，不按动作动词分」。
//  依据 spec: .trae/specs/2026-09-06-ia-todo-cards/spec.md §一（9 域逐节批准）
export const WORK_DOMAIN = {
  MEETING: 'meeting',       // ① 会务（三会一课：参与 + 考勤记录闭环，无复盘）
  ACTIVITY: 'activity',     // ② 活动/项目（实践型：参与/报名/全程管理/复盘沉淀）
  ATTENDANCE: 'attendance', // ③ 考勤纪律
  INSPECTION: 'inspection', // ④ 考察
  MEMBER_DEV: 'member-dev', // ⑤ 成员发展
  TASKFORCE: 'taskforce',   // ⑥ 专班
  RESOLUTION: 'resolution', // ⑦ 决议上报
  ARCHIVE: 'archive',       // ⑧ 归档宣传
  REPORT: 'report',         // ⑨ 汇报反馈
  NONE: 'none',             // 通知/未分类（轻量未读，不入域任务计数，见 C1 Task4 未读条）
};

/** 业务域中文标签（域序同 spec 一 ①→⑨ + NONE） */
export const WORK_DOMAIN_LABELS = {
  [WORK_DOMAIN.MEETING]: '会务',
  [WORK_DOMAIN.ACTIVITY]: '活动/项目',
  [WORK_DOMAIN.ATTENDANCE]: '考勤纪律',
  [WORK_DOMAIN.INSPECTION]: '考察',
  [WORK_DOMAIN.MEMBER_DEV]: '成员发展',
  [WORK_DOMAIN.TASKFORCE]: '专班',
  [WORK_DOMAIN.RESOLUTION]: '决议上报',
  [WORK_DOMAIN.ARCHIVE]: '归档宣传',
  [WORK_DOMAIN.REPORT]: '汇报反馈',
  [WORK_DOMAIN.NONE]: '通知/未分类',
};

/**
 * 业务域固定展示顺序（IA 收敛 C1 Task3：9 域折组视图域序 = spec 一 ①→⑨）。
 * NONE（通知/未分类）不入列——通知类走 getUnreadNotices 页顶「未读 N 条」轻量区。
 */
export const DOMAIN_ORDER = [
  WORK_DOMAIN.MEETING,     // ① 会务
  WORK_DOMAIN.ACTIVITY,    // ② 活动/项目
  WORK_DOMAIN.ATTENDANCE,  // ③ 考勤纪律
  WORK_DOMAIN.INSPECTION,  // ④ 考察
  WORK_DOMAIN.MEMBER_DEV,  // ⑤ 成员发展
  WORK_DOMAIN.TASKFORCE,   // ⑥ 专班
  WORK_DOMAIN.RESOLUTION,  // ⑦ 决议上报
  WORK_DOMAIN.ARCHIVE,     // ⑧ 归档宣传
  WORK_DOMAIN.REPORT,      // ⑨ 汇报反馈
];

/** 会务类型参考：scenarioId/type 属三会一课 → 会务域；theme-party 等实践型不在表内 → 活动/项目 */
const _ACTIVITY_TYPE_TO_DOMAIN = {
  'branch-party-meeting': WORK_DOMAIN.MEETING, // 支部党员大会
  'branch-committee': WORK_DOMAIN.MEETING,     // 支委会
  'party-group-meeting': WORK_DOMAIN.MEETING,  // 党小组会
  'party-lecture': WORK_DOMAIN.MEETING,        // 党课
  'org-life': WORK_DOMAIN.MEETING,             // 组织生活会
};

/** 从待办取 scenario/type 信号（todo 本体 / actionData 两处均可携带） */
function _activityScenarioOf(todo) {
  const ad = todo.actionData;
  return todo.scenarioId || (ad && ad.scenarioId)
    || todo.activityType || (ad && ad.activityType)
    || todo.type || null;
}

/**
 * 业务域兼容推断：待办无 domain（历史数据/未打标派生）时，按 actionKey → actionType/sourceType → category 归一。
 * 推断映射见 spec 三节速查；遗留种子 activity-archive（活动材料归档，处理位=宣传）兼容归「归档宣传」域。
 * 边界注释：
 *  - 显式 domain（含显式 NONE）一律原样返回，不做推断覆盖；
 *  - authorize/participate：sourceType=taskforce → 专班；否则属 activity 型——若待办携带三会一课
 *    scenarioId（branch-party-meeting/branch-committee/party-group-meeting/party-lecture/org-life）→ 会务，
 *    theme-party 等 → 活动/项目；**现有派生器大多未把 scenario 落到待办**，故 activity 型无 scenario 时
 *    默认「活动/项目」——准确会务归属待派生点（C1 Task2）在 create 时带 scenarioId 后细化；
 *  - 未知/空输入 → NONE，不抛错。
 * @param {Object} [todo]
 * @returns {string} WORK_DOMAIN 值
 */
export function inferDomain(todo) {
  if (!todo || typeof todo !== 'object') return WORK_DOMAIN.NONE;
  if (todo.domain) return todo.domain;

  const key = todo.actionKey;
  const type = todo.actionType;
  const sourceType = todo.sourceType;

  // 1) actionKey 业务前缀（spec 三节映射速查；-archive 后缀兼容遗留 activity-archive 种子）
  if (key) {
    if (key.startsWith('attendance-')) return WORK_DOMAIN.ATTENDANCE;
    if (key.startsWith('inspection-')) return WORK_DOMAIN.INSPECTION;
    if (key.startsWith('member-') || key.startsWith('semester-')) return WORK_DOMAIN.MEMBER_DEV;
    if (key.startsWith('taskforce-')) return WORK_DOMAIN.TASKFORCE;
    if (key.startsWith('resolution-')) return WORK_DOMAIN.RESOLUTION;
    if (key.startsWith('archive-') || key.endsWith('-archive')) return WORK_DOMAIN.ARCHIVE;
    // 交接派生（C1 Task2 显式 domain 之外的兼容推断，spec 三节）：
    // 考察记录提交（纪检→组织）归考察；考勤备案（纪检→宣传）/补课需求回执（组织→纪检）归考勤纪律
    if (key.startsWith('handoff-')) {
      if (key === 'handoff-inspection-report') return WORK_DOMAIN.INSPECTION;
      return WORK_DOMAIN.ATTENDANCE;
    }
    // 报名审核（signup.js）：按源归域——专班源→专班；活动源按 scenarioId（三会→会务）否则活动/项目
    if (key === 'signup-review') {
      if (sourceType === TodoSourceType.TASKFORCE) return WORK_DOMAIN.TASKFORCE;
      const sc = _activityScenarioOf(todo);
      if (sc) return _ACTIVITY_TYPE_TO_DOMAIN[sc] || WORK_DOMAIN.ACTIVITY;
      return WORK_DOMAIN.ACTIVITY;
    }
    if (key.startsWith('notice-') || key === 'read') return WORK_DOMAIN.NONE;
    // 其余键（含与 actionType 同义的 authorize/participate 等）落到 actionType 判定
  }

  // 2) actionType 判定（key 与动作词同义时同样参与）
  const t = type || key;
  if (t === TodoActionType.READ) return WORK_DOMAIN.NONE;
  if (t === TodoActionType.AUTHORIZE || t === TodoActionType.PARTICIPATE) {
    if (sourceType === TodoSourceType.TASKFORCE) return WORK_DOMAIN.TASKFORCE;
    const sc = _activityScenarioOf(todo);
    if (sc) return _ACTIVITY_TYPE_TO_DOMAIN[sc] || WORK_DOMAIN.ACTIVITY;
    return WORK_DOMAIN.ACTIVITY; // 无 scenario 信息 → 默认活动/项目（见函数头边界注释）
  }
  if (t === TodoActionType.ARCHIVE) return WORK_DOMAIN.ARCHIVE;

  // 3) category 兜底（历史数据仅有分类时）
  if (todo.category === TodoCategory.NOTICE) return WORK_DOMAIN.NONE;
  if (todo.category === TodoCategory.ARCHIVE) return WORK_DOMAIN.ARCHIVE;

  return WORK_DOMAIN.NONE; // 未知/空 → NONE
}

/** 生效业务域（读取归一用）：显式 domain 优先，缺省按 inferDomain 推断 */
export function _effDomain(todo) {
  if (!todo || typeof todo !== 'object') return WORK_DOMAIN.NONE;
  return todo.domain || inferDomain(todo);
}

/**
 * 实时派生组（不落库：书记/纪检提醒·复核、决议逾期 remind、成员变更确认等）actionKey → 业务域标签。
 * 2026-09-07 IA-C1 Task2：供 T4「9 域折组」把实时组按域归类展示；键由各实时组生成处统一引用
 * （SecretaryTodoDeriver 8 组 / buildOverdueRemindGroup / 纪检 todo-tab 队列 / secretary 成员组）。
 * 复盘相关（review-remind/confirm）归「活动/项目」域——spec 三节：活动复盘提交/确认在活动域。
 */
export const REALTIME_GROUP_DOMAIN = {
  'attendance-remind': WORK_DOMAIN.ATTENDANCE,
  'attendance-confirm': WORK_DOMAIN.ATTENDANCE,
  'inspection-remind': WORK_DOMAIN.INSPECTION,
  'inspection-confirm': WORK_DOMAIN.INSPECTION,
  'review-remind': WORK_DOMAIN.ACTIVITY,   // 活动复盘待提交（活动域）
  'review-confirm': WORK_DOMAIN.ACTIVITY,  // 活动复盘待复核（活动域）
  'archive-remind': WORK_DOMAIN.ARCHIVE,
  'archive-confirm': WORK_DOMAIN.ARCHIVE,
  'resolution-followup-remind': WORK_DOMAIN.RESOLUTION,
  'member-confirm': WORK_DOMAIN.MEMBER_DEV,
  'semester-detained-remind': WORK_DOMAIN.MEMBER_DEV,
};

/** 实时组对象 → 业务域标注（供 T4 域折组展示；先查 actionKey，未收录回退 inferDomain 兼容） */
export function realtimeGroupDomainOf(group) {
  if (!group || typeof group !== 'object') return WORK_DOMAIN.NONE;
  const key = group.actionKey || group.groupKey;
  if (key && REALTIME_GROUP_DOMAIN[key]) return REALTIME_GROUP_DOMAIN[key];
  return inferDomain(group);
}

// ── 待办状态枚举 ──────────────────────────────────────────────
export const TodoStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

export const TODO_STATUS_LABELS = {
  [TodoStatus.PENDING]: '待处理',
  [TodoStatus.IN_PROGRESS]: '进行中',
  [TodoStatus.COMPLETED]: '已完成',
  [TodoStatus.EXPIRED]: '已过期',
};

// ── 待办来源类型枚举 ──────────────────────────────────────────
export const TodoSourceType = {
  NOTICE: 'notice',
  ACTIVITY: 'activity',
  TASKFORCE: 'taskforce',
  MANUAL: 'manual',
};

// ── 待办行动类型枚举 ──────────────────────────────────────────
export const TodoActionType = {
  AUTHORIZE: 'authorize', // 赋权
  ARCHIVE: 'archive',     // 归档
  REVIEW: 'review',       // 审核
  READ: 'read',           // 阅读
  SUBMIT: 'submit',       // 提交
  TRACK: 'track',         // 追踪
  PARTICIPATE: 'participate', // 参与（visitor 活动待参与）
};

// ── 默认折叠状态（按分类） ────────────────────────────────────
export const DEFAULT_EXPANDED_CATEGORIES = new Set([
  TodoCategory.AUTH,
  TodoCategory.REVIEW,
]);

// ════════════════════════════════════════════════════════════════
//  持久化引擎
// ════════════════════════════════════════════════════════════════

function _loadTodos() {
  try {
    return [...mockDB.todos];
  } catch (e) {
    console.warn('[TodoStore] 加载失败：', e);
    return [];
  }
}

function _saveTodos(todos) {
  try {
    // P0（2026-09-07）：写口统一写版本 +1（create/createBatch/update/delete/complete/refresh/
    // seedTodos 等全部经 _saveTodos 落库路径；mockDB.todos 共享 → 版本存共享 token，跨 ?v= 模块实例一致）
    bumpToken('todo');
    mockDB.todos = [...todos];
    persist();
  } catch (e) {
    console.warn('[TodoStore] 保存失败：', e);
  }
}

// ════════════════════════════════════════════════════════════════
//  P0 聚合级 memo（2026-09-07 提速批 · spec .trae/specs/2026-09-07-perf/spec.md §二.1/§二.2）
//  内部写版本 _todoVersion：TodoStore 全部写口经 _saveTodos 统一 +1（含种子 seedTodos 路径）；
//  聚合方法（getGroupedByAction/getDomainsWithGroups/mergeRealtimeDomains/getUnreadNotices）
//  以「入参签名 + _todoVersion」做模块级缓存，命中直接返回缓存结果。
//  ⚠️ 只读引用契约：命中返回同一结果引用——**返回值仅供只读渲染，禁止调用方修改**
//  （需改返回数组者须自行浅拷贝后再改；mergeRealtimeDomains 已在内部克隆基准域视图后并入，
//  不污染共享缓存）。todo.js 在浏览器存在多 ?v= 模块实例而 mockDB 共享 → 版本存共享
//  version-token('todo')，跨模块实例写后失效一致。
//  _aggCacheStats 为护栏测试读数（aggregateRuns=实际聚合执行次数；cacheHits=缓存命中次数）。
const _aggCache = new Map();
const _aggCacheStats = { aggregateRuns: 0, cacheHits: 0 };
const _AGG_CACHE_MAX = 96;

function _todoVersion() {
  return tokenOf('todo');
}

// mergeRealtimeDomains 的实时组来源域指纹（域 token + mockDB 源数组长度）：
// 实时组内容（如书记 8 组/纪检队列）可能在其 groupKey/count/deadline 不变时内容已变
// （写口 bump → token 变 / 禁改路径 → 长度变）——合并缓存键必须纳入本指纹，杜绝陈旧命中。
const _MERGE_SOURCE_LENS = [
  ['attendance', 'attendances'],
  ['activity', 'activities'],
  ['inspection', 'inspections'],
  ['activityReview', 'activityReviews'],
  ['archiveRecord', 'archiveRecords'],
  ['taskforce', 'taskforces'],
  ['signup', 'signups'],
  ['handoff', 'handoffs'],
  ['memberConfirmation', 'pendingMemberConfirmations'],
  ['notice', 'notices'],
];
function _mergeFp() {
  return _MERGE_SOURCE_LENS
    .map(([tok, arr]) => `${tok}:${tokenOf(tok)}+${Array.isArray(mockDB[arr]) ? mockDB[arr].length : 0}`)
    .concat(`member:${tokenOf('member')}`)
    .join(',');
}

function _aggCacheGet(key) {
  const entry = _aggCache.get(key);
  if (!entry || entry.v !== _todoVersion()) return undefined;
  return entry.value;
}

function _aggCacheSet(key, value) {
  if (_aggCache.size > _AGG_CACHE_MAX) {
    const cur = _todoVersion();
    for (const [k, e] of _aggCache) if (e.v !== cur) _aggCache.delete(k);
  }
  _aggCache.set(key, { v: _todoVersion(), value });
  return value;
}

/** 聚合缓存统一读写：命中 → 计数并返回缓存引用；未命中 → 计数并计算（只读契约见上） */
function _withAggCache(key, compute) {
  const hit = _aggCacheGet(key);
  if (hit !== undefined) {
    _aggCacheStats.cacheHits++;
    return hit;
  }
  _aggCacheStats.aggregateRuns++;
  return _aggCacheSet(key, compute());
}

/** 今日 YYYY-MM-DD（聚合排序用） */
function _todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 待办是否逾期（P1 过期判定收敛单一实现 · spec §三.6；原四处重复实现统一改调本函数）：
 * 口径与既有四处一致——
 *  - expired 显式态 → 逾期；
 *  - completed / in_progress → 不计（进行中不标逾期）；
 *  - 其余未完成（pending 及无 status 的实时组条目）有 deadline 且早于日期键 → 逾期。
 * @param {Object} [todo]
 * @param {string|Date} [now] 日期键 YYYY-MM-DD（缺省 = 当前 UTC ISO 日，与旧渲染层/域聚合口径一致）；
 *                            Date 注入（测试/未来消费）按本地时区取日（勿用 UTC——跨日错位见 today-summary）
 * @returns {boolean}
 */
export function isTodoExpired(todo, now) {
  if (!todo || typeof todo !== 'object') return false;
  if (todo.status === TodoStatus.EXPIRED) return true;
  if (todo.status === TodoStatus.COMPLETED || todo.status === TodoStatus.IN_PROGRESS) return false;
  if (!todo.deadline) return false;
  return todo.deadline < _dateKeyOf(now);
}

/** 日期键归一（isTodoExpired 内部用）：显式 dateKey 串原样；Date → 本地时区日；缺省 → 当前 UTC ISO 日 */
function _dateKeyOf(now) {
  if (typeof now === 'string' && now) return now;
  if (now instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  return _todayStr();
}

/** 待办默认字段构造（create / createBatch 共用；收敛 2026-09-02，原两份逐字相同） */
function _buildTodo(data) {
  return {
    id: data.id || generateId('todo_'),
    title: data.title || '未命名待办',
    description: data.description || '',
    role: data.role,
    personId: data.personId || null,
    category: data.category,
    // 业务域（工作类型 9 域，2026-09-07 IA-C1）：显式 domain 优先，缺省按 actionKey/actionType 兼容推断
    domain: _effDomain(data),
    priority: data.priority || 'normal',
    status: data.status || TodoStatus.PENDING,
    deadline: data.deadline || null,
    createdAt: data.createdAt || new Date().toISOString(),
    completedAt: data.completedAt || null,
    sourceType: data.sourceType || TodoSourceType.MANUAL,
    sourceId: data.sourceId || null,
    actionType: data.actionType || null,
    actionData: data.actionData || null,
    // 业务动作标识（聚合键组成：role+actionKey，区分同 actionType 的不同业务域）
    actionKey: data.actionKey || null,
    // 数据上下游标注（E2：待办项标注数据流，如「组长上传考勤 → 纪检确认 → 考勤总表」；无则列表不显示）
    flow: data.flow || null,
  };
}

// ════════════════════════════════════════════════════════════════
//  TodoStore — 待办 CRUD + 派生触发
// ════════════════════════════════════════════════════════════════

// ── 组/域聚合私有工具（C1 Task3：getGroupedByAction 与按域视图共享组聚合与排序）────

/**
 * actionKey 组聚合核心（getGroupedByAction 原逻辑抽出）：role 视角 todos → 组数组
 * （组含 groupKey/actionKey/title/category/actionType/actionData/deadline/flow/count/items；
 *  组内条目过期置顶、截止升序）。
 */
function _aggregateByAction(role, todos, today) {
  const map = new Map();
  for (const t of todos) {
    // 聚合键 = role:actionKey，actionKey 缺省时按 actionType 兜底
    const key = `${role}:${t.actionKey || t.actionType || t.category || 'other'}`;
    if (!map.has(key)) {
      map.set(key, {
        groupKey: key,
        actionKey: t.actionKey || t.actionType || 'other',
        title: t.title,
        category: t.category,
        actionType: t.actionType,
        actionData: t.actionData,
        deadline: t.deadline,
        flow: t.flow,
        count: 0,
        items: [],
      });
    }
    const g = map.get(key);
    g.count++;
    g.items.push(t);
    if (t.deadline && (!g.deadline || t.deadline < g.deadline)) g.deadline = t.deadline;
  }
  const groups = [...map.values()];
  // 组内排序：过期优先、截止升序
  groups.forEach(g => {
    g.items.sort((a, b) => {
      const aExp = isTodoExpired(a, today);
      const bExp = isTodoExpired(b, today);
      if (aExp !== bExp) return aExp ? -1 : 1;
      return (a.deadline || '9999').localeCompare(b.deadline || '9999');
    });
  });
  return groups;
}

/** 组是否含逾期条目（域内组排序「先逾期」用；判定收敛 isTodoExpired） */
function _groupHasExpired(g, today) {
  return Array.isArray(g.items) && g.items.some(it => isTodoExpired(it, today));
}

/** 组内逾期条数（并入域级 expiredCount 用；判定收敛 isTodoExpired） */
function _groupExpiredCount(g, today) {
  if (!Array.isArray(g.items)) return 0;
  return g.items.filter(it => isTodoExpired(it, today)).length;
}

/** 域内组排序：先逾期组、再 deadline（无 deadline 末位）、最后 actionKey 稳定兜底（跨调用确定性） */
function _compareDomainGroups(a, b, today) {
  const aExp = _groupHasExpired(a, today);
  const bExp = _groupHasExpired(b, today);
  if (aExp !== bExp) return aExp ? -1 : 1;
  const dc = (a.deadline || '9999').localeCompare(b.deadline || '9999');
  if (dc !== 0) return dc;
  return String(a.actionKey || '').localeCompare(String(b.actionKey || ''));
}

/**
 * 域折组核心聚合（P0 提速批 2026-09-07 抽出，供 getDomainsWithGroups 与
 * mergeRealtimeDomains 复用——同轮多方法共享一次全扫结果，消除各自全扫）：
 * role 视角 todos 一次扫描 → 域折组数组（域序=DOMAIN_ORDER、无活域不出、NONE 不入列；
 * 域内 groups=actionKey 组聚合，组序=先逾期 → deadline → actionKey 稳定）。
 */
function _aggregateByRole(role, today) {
  const todos = TodoStore.getByRole(role);
  const buckets = new Map();
  for (const d of DOMAIN_ORDER) buckets.set(d, []);
  for (const t of todos) {
    const d = _effDomain(t);
    if (d === WORK_DOMAIN.NONE || !buckets.has(d)) continue; // NONE 走未读轻量区；未知域值忽略
    buckets.get(d).push(t);
  }
  const view = [];
  for (const d of DOMAIN_ORDER) {
    const bucket = buckets.get(d);
    if (bucket.length === 0) continue; // 无活域不出
    const groups = _aggregateByAction(role, bucket, today);
    groups.sort((a, b) => _compareDomainGroups(a, b, today));
    view.push({
      domain: d,
      label: WORK_DOMAIN_LABELS[d],
      count: bucket.length,
      expiredCount: bucket.filter(t => isTodoExpired(t, today)).length,
      groups,
    });
  }
  return view;
}

/** 实时组并入基准域视图的实现（P0：基准为共享缓存引用 → 本方法只浅克隆自身要改写的层，不污染缓存） */
function _mergeRealtimeDomains(role, realtimeGroups, today) {
  // 基准域视图为 TodoStore 聚合缓存共享引用 → 先浅克隆「域记录 + groups 数组」两层（只读契约）
  const view = TodoStore.getDomainsWithGroups(role).map(d => ({ ...d, groups: [...(d.groups || [])] }));
  const recByDomain = new Map(view.map(d => [d.domain, d]));
  for (const g of realtimeGroups || []) {
    if (!g || typeof g !== 'object') continue;
    const domain = realtimeGroupDomainOf(g);
    if (domain === WORK_DOMAIN.NONE || !DOMAIN_ORDER.includes(domain)) continue;
    let rec = recByDomain.get(domain);
    if (!rec) {
      rec = { domain, label: WORK_DOMAIN_LABELS[domain], count: 0, expiredCount: 0, groups: [] };
      recByDomain.set(domain, rec);
      view.push(rec); // 追加后再按 DOMAIN_ORDER 统一归位
    }
    // 同 groupKey 已存在（持久化组或前序实时组）→ 去重，避免同组双卡
    if (g.groupKey && rec.groups.some(x => x.groupKey === g.groupKey)) continue;
    // 实时组可能只带条目 deadline（如 _mcConfirmAgg 无组级 deadline）：归一并入副本（不改写入参），
    // 使域内组排序「按 deadline」与持久化组口径一致（组 deadline=组内最早截止）
    const grp = { ...g };
    if (!grp.deadline && Array.isArray(grp.items)) {
      for (const it of grp.items) {
        if (it && it.deadline && (!grp.deadline || it.deadline < grp.deadline)) grp.deadline = it.deadline;
      }
    }
    rec.groups.push(grp);
    const itemLen = Array.isArray(g.items) ? g.items.length : 0;
    rec.count += typeof g.count === 'number' ? g.count : itemLen;
    rec.expiredCount += _groupExpiredCount(g, today);
  }
  // 域序固定（含新增域）+ 域内组按同一排序规则归位
  view.sort((a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain));
  for (const rec of view) {
    rec.groups.sort((a, b) => _compareDomainGroups(a, b, today));
  }
  return view;
}

export const TodoStore = {
  // ── P0 自检只读暴露（护栏测试 perf-todo-agg-cache 读数：实际聚合执行/缓存命中次数）──
  _aggCacheStats,

  // ── 查询 ──────────────────────────────────────────────────

  /** 获取全部待办 */
  getAll() {
    return _loadTodos();
  },

  /** 按 ID 获取待办 */
  getById(id) {
    return _loadTodos().find(t => t.id === id) || null;
  },

  /** 按角色查询待办（可选状态过滤） */
  getByRole(role, options = {}) {
    const { status, includeCompleted = false } = options;
    let todos = _loadTodos().filter(t => t.role === role);

    if (!includeCompleted) {
      todos = todos.filter(t => t.status !== TodoStatus.COMPLETED);
    }

    if (status) {
      todos = todos.filter(t => t.status === status);
    }

    return todos;
  },

  /** 按角色+分类查询待办 */
  getByRoleAndCategory(role, category) {
    return _loadTodos().filter(t => t.role === role && t.category === category);
  },

  /** 按来源查询待办（用于来源删除时联动） */
  getBySource(sourceType, sourceId) {
    return _loadTodos().filter(t => t.sourceType === sourceType && t.sourceId === sourceId);
  },

  /** 按角色查询待办并按分类分组 */
  getGroupedByCategory(role, options = {}) {
    const todos = this.getByRole(role, options);
    const grouped = {};
    for (const cat of Object.values(TodoCategory)) {
      grouped[cat] = [];
    }
    for (const todo of todos) {
      if (!grouped[todo.category]) grouped[todo.category] = [];
      grouped[todo.category].push(todo);
    }
    // 每类内部排序：过期优先，然后按截止时间升序
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => {
        const aExpired = this._isExpired(a);
        const bExpired = this._isExpired(b);
        if (aExpired && !bExpired) return -1;
        if (!aExpired && bExpired) return 1;
        const aDeadline = a.deadline || '9999';
        const bDeadline = b.deadline || '9999';
        return aDeadline.localeCompare(bDeadline);
      });
    }
    return grouped;
  },

  // ── 创建 ──────────────────────────────────────────────────

  /** 创建单条待办 */
  create(data) {
    const todo = _buildTodo(data);

    const todos = _loadTodos();
    todos.push(todo);
    _saveTodos(todos);
    return todo;
  },

  /** 批量创建待办（用于通知派生） */
  createBatch(items) {
    const todos = _loadTodos();
    const created = [];
    for (const data of items) {
      const todo = _buildTodo(data);
      todos.push(todo);
      created.push(todo);
    }
    _saveTodos(todos);
    return created;
  },

  // ── 更新 ──────────────────────────────────────────────────

  /** 更新待办状态 */
  updateStatus(id, status) {
    const todos = _loadTodos();
    const idx = todos.findIndex(t => t.id === id);
    if (idx < 0) return null;

    todos[idx] = {
      ...todos[idx],
      status,
      completedAt: status === TodoStatus.COMPLETED ? new Date().toISOString() : todos[idx].completedAt,
    };
    _saveTodos(todos);
    return todos[idx];
  },

  /** 标记为已完成 */
  complete(id) {
    return this.updateStatus(id, TodoStatus.COMPLETED);
  },

  /** 标记为进行中 */
  start(id) {
    return this.updateStatus(id, TodoStatus.IN_PROGRESS);
  },

  /** 重新激活过期待办 */
  reactivate(id) {
    return this.updateStatus(id, TodoStatus.PENDING);
  },

  /** 通用更新 */
  update(id, patch) {
    const todos = _loadTodos();
    const idx = todos.findIndex(t => t.id === id);
    if (idx < 0) return null;
    todos[idx] = { ...todos[idx], ...patch };
    _saveTodos(todos);
    return todos[idx];
  },

  // ── 删除 ──────────────────────────────────────────────────

  /** 删除单条待办 */
  delete(id) {
    const todos = _loadTodos().filter(t => t.id !== id);
    _saveTodos(todos);
  },

  /** 按来源删除待办（来源删除时联动） */
  deleteBySource(sourceType, sourceId) {
    const todos = _loadTodos().filter(
      t => !(t.sourceType === sourceType && t.sourceId === sourceId)
    );
    _saveTodos(todos);
  },

  // ── 聚合查询与批量销项（2026-08-07 待办闭环化） ─────────────

  /**
   * 按「角色+业务动作」聚合（展示层聚合，同跳转目标合并为一条聚合卡）
   * P0：以 (role, _todoVersion, 日期) 复合键模块级缓存——命中返回缓存引用（只读契约：
   * 返回值仅供只读渲染，禁止调用方修改；需改者先浅拷贝）。
   * @param {string} role
   * @returns {Array<{groupKey, actionKey, title, category, actionType, actionData, deadline, flow, count, items}>}
   */
  getGroupedByAction(role) {
    return _withAggCache(`byAction:${role}:${_todayStr()}`, () =>
      _aggregateByAction(role, this.getByRole(role), _todayStr())
    );
  },

  /**
   * 按业务域聚合视图（IA 收敛 C1 Task3，供 9 域折组）：域序=DOMAIN_ORDER（无活域不出、
   * NONE 通知不入普通域列表）；域内 groups=复用 actionKey 组聚合（含标题/deadline/items），
   * 组排序=先逾期 → deadline → actionKey 稳定。域级 count=该域未完成条数；
   * expiredCount=该域逾期条数。
   * P0：以 (role, _todoVersion, 日期) 复合键模块级缓存——命中返回缓存引用
   * （⚠️ 只读契约：返回值仅供只读渲染，禁止调用方修改；mergeRealtimeDomains 内部已克隆）。
   * @param {string} role
   * @returns {Array<{domain, label, count, expiredCount, groups: Array}>}
   */
  getDomainsWithGroups(role) {
    return _withAggCache(`domains:${role}:${_todayStr()}`, () => _aggregateByRole(role, _todayStr()));
  },

  /**
   * 未读通知（页顶「未读 N 条」轻量区数据源，C1 Task3/Task4）：domain=NONE 的「通知阅读」
   * 类未完成待办（category=notice），按 deadline（无则 createdAt）倒序——书记规则：带时间字段
   * 列示一律时间倒序（最新在前）；同位次 createdAt 倒序保稳定。
   * P0：同 getDomainsWithGroups 复合键缓存（⚠️ 返回值只读引用契约，禁止调用方修改）。
   * @param {string} role
   * @returns {Array} 未读通知待办（未完成）
   */
  getUnreadNotices(role) {
    return _withAggCache(`unread:${role}:${_todayStr()}`, () => {
      const notices = this.getByRole(role).filter(t =>
        _effDomain(t) === WORK_DOMAIN.NONE && t.category === TodoCategory.NOTICE
      );
      notices.sort((a, b) => {
        const ka = a.deadline || a.createdAt || '';
        const kb = b.deadline || b.createdAt || '';
        const c = kb.localeCompare(ka);
        if (c !== 0) return c;
        const ca = a.createdAt || '';
        const cb = b.createdAt || '';
        if (ca !== cb) return cb.localeCompare(ca);
        return 0;
      });
      return notices;
    });
  },

  /**
   * 实时组并入域视图（C1 Task4 融合点，最小实现）：书记/纪检等不落库的实时聚合组
   * （组对象带 domain 标注，缺省按 realtimeGroupDomainOf 推断）并入 getDomainsWithGroups 输出——
   * 纯实时域按 DOMAIN_ORDER 新增、域内组按同一排序规则归位、同 groupKey 去重、domain=NONE 不入。
   * P0：基准 getDomainsWithGroups 走同轮缓存（不再内部重复全扫）；并入在克隆后的基准上进行
   * （不污染共享缓存）；整体以 (role, 实时组指纹, _todoVersion, 日期) 复合键缓存——命中返回
   * 缓存引用（⚠️ 只读契约：返回值仅供只读渲染，禁止调用方修改）。不改写入参。
   * @param {string} role
   * @param {Array} [realtimeGroups]
   * @returns {Array} 合并后的域视图（结构同 getDomainsWithGroups）
   */
  mergeRealtimeDomains(role, realtimeGroups = []) {
    const today = _todayStr();
    // 实时组指纹（groupKey+计数+截止）+ 来源域指纹（域 token + 源长度）——
    // 写口 bump / 源长度变化均使合并缓存键变化（防止 groupKey/count 不变时内容已变的陈旧命中）
    const rtSig = (realtimeGroups || []).map(g =>
      `${(g && g.groupKey) || ''}:${typeof g === 'object' && typeof g.count === 'number' ? g.count : (g && Array.isArray(g.items) ? g.items.length : 0)}:${(g && g.deadline) || ''}`
    ).join('|');
    return _withAggCache(`merge:${role}:${today}:${_mergeFp()}:${rtSig}`, () =>
      _mergeRealtimeDomains(role, realtimeGroups || [], today)
    );
  },

  /** 按来源批量标记完成（业务操作联动：纪检确认考勤→销对应待办等） */
  completeBySource(sourceType, sourceId) {
    const todos = _loadTodos();
    let changed = false;
    const updated = todos.map(t => {
      if (t.sourceType === sourceType && t.sourceId === sourceId && t.status !== TodoStatus.COMPLETED) {
        changed = true;
        return { ...t, status: TodoStatus.COMPLETED, completedAt: new Date().toISOString() };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },

  /** 按聚合键批量标记完成（completeBySource 的补充：同 role+actionKey 全部销项） */
  completeByGroup(groupKey) {
    const todos = _loadTodos();
    let changed = false;
    const [role, ...rest] = String(groupKey).split(':');
    const actionKey = rest.join(':');
    const updated = todos.map(t => {
      const match = t.role === role && (t.actionKey || t.actionType || t.category || 'other') === actionKey;
      if (match && t.status !== TodoStatus.COMPLETED) {
        changed = true;
        return { ...t, status: TodoStatus.COMPLETED, completedAt: new Date().toISOString() };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },

  // ── 过期检查 ──────────────────────────────────────────────

  /** 检查待办是否过期（历史兼容 API：仅 pending 逾期计过期；expired 态由调用方显式 || TodoStatus.EXPIRED 兜底）。
   *  P1：deadline 判定收敛于 isTodoExpired（单一实现），本方法保留 pending 门禁防语义漂移 */
  _isExpired(todo) {
    if (!todo || todo.status !== TodoStatus.PENDING) return false;
    return isTodoExpired(todo);
  },

  /** 扫描所有待办，将过期未处理标记为 expired（判定收敛 isTodoExpired；仅 pending 可被翻转为 expired） */
  refreshExpiredStatus() {
    const todos = _loadTodos();
    let changed = false;
    const today = new Date().toISOString().slice(0, 10);
    const updated = todos.map(t => {
      if (t.status === TodoStatus.PENDING && isTodoExpired(t, today)) {
        changed = true;
        return { ...t, status: TodoStatus.EXPIRED };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },

  // ── 统计 ──────────────────────────────────────────────────

  /** 按角色统计待办数量（按分类） */
  getStatsByRole(role) {
    const todos = this.getByRole(role);
    const stats = {};
    for (const cat of Object.values(TodoCategory)) {
      stats[cat] = 0;
    }
    for (const t of todos) {
      if (!stats[t.category]) stats[t.category] = 0;
      stats[t.category]++;
    }
    stats._total = todos.length;
    stats._expired = todos.filter(t => isTodoExpired(t)).length;
    return stats;
  },
};

// ════════════════════════════════════════════════════════════════
//  通知→待办派生机制
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.19
// ════════════════════════════════════════════════════════════════

export const NoticeTodoDeriver = {
  /**
   * 通知发布时，若 actionable=true，自动为 actionRoles 中的每个角色生成待办
   * @param {Object} notice - 通知对象（含 actionable/actionRoles/actionTask/actionDeadline 等扩展字段）
   */
  deriveFromNotice(notice) {
    if (!notice || notice.archived) return []; // 2026-08-08 归档闭环：已归档通知不派生待办
    if (!notice.actionable) return [];
    if (!Array.isArray(notice.actionRoles) || notice.actionRoles.length === 0) return [];

    const items = notice.actionRoles.map(role => ({
      title: notice.actionTask || notice.title,
      description: notice.content || '',
      role,
      category: TodoCategory.NOTICE,
      priority: notice.priority || 'normal',
      deadline: notice.actionDeadline || notice.expireDate || null,
      sourceType: TodoSourceType.NOTICE,
      sourceId: notice.id,
      actionType: this._inferActionType(notice),
      // IA-C1 Task2：通知阅读稳定键（domain=NONE，轻量未读不入业务域；Task5 展示死键清理以本键为生产者）
      actionKey: 'notice-read',
      actionData: { noticeId: notice.id },
      flow: this._inferFlow(notice),
    }));

    return TodoStore.createBatch(items);
  },

  /** 根据通知 targetModule 推断行动类型 */
  _inferActionType(notice) {
    const moduleMap = {
      attendance: TodoActionType.REVIEW,
      party: TodoActionType.REVIEW,
      activity: TodoActionType.READ,
      workspace: TodoActionType.READ,
    };
    return moduleMap[notice.targetModule] || TodoActionType.READ;
  },

  /** 根据通知 targetModule 推断数据流（E2：无明确上下游的通知不标注） */
  _inferFlow(notice) {
    const flowMap = {
      attendance: '考勤上传 → 纪检确认 → 考勤总表',
      party: '发展材料 → 组织委员建档 → 人才库',
    };
    return flowMap[notice.targetModule] || null;
  },

  /** 通知取消/过期时，关联待办标记为 expired */
  expireByNotice(noticeId) {
    const todos = _loadTodos();
    let changed = false;
    const updated = todos.map(t => {
      if (t.sourceType === TodoSourceType.NOTICE && t.sourceId === noticeId && t.status === TodoStatus.PENDING) {
        changed = true;
        return { ...t, status: TodoStatus.EXPIRED };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },
};

// ════════════════════════════════════════════════════════════════
//  活动/专班生命周期→待办派生
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18.3
// ════════════════════════════════════════════════════════════════

export const LifecycleTodoDeriver = {
  /**
   * 活动创建后，自动为党小组组长生成赋权待办
   * @param {Object} activity - 活动对象
   */
  deriveFromActivityCreate(activity) {
    if (!activity || !activity.id) return [];

    return TodoStore.createBatch([{
      title: `为活动「${activity.title || '未命名'}」赋权组织者/深度参与者`,
      description: `活动日期：${activity.date || '未设定'}。请选择人员授予组织者或深度参与者角色。`,
      role: 'leader',
      category: TodoCategory.AUTH,
      priority: 'urgent',
      deadline: activity.date || null,
      sourceType: TodoSourceType.ACTIVITY,
      sourceId: activity.id,
      actionType: TodoActionType.AUTHORIZE,
      // 稳定业务动作键（IA-C1 Task2：聚合键 = role+actionKey，不再依赖 actionType 兜底）
      actionKey: 'activity-authorize',
      actionData: {
        scope: 'activity', sourceId: activity.id, sourceName: activity.title,
        // IA-C1 Task2：源活动 scenarioId 落 actionData → domain 判定点（三会→会务，theme-party 等→活动/项目）
        scenarioId: activity.scenarioId || activity.type || null,
      },
      // E2 数据上下游标注
      flow: '活动创建 → 组长赋权 → 组织者/深度参与者执行',
    }]);
  },

  /**
   * 专班创建后，自动为组织委员生成赋权待办
   * @param {Object} taskforce - 专班对象
   */
  deriveFromTaskforceCreate(taskforce) {
    if (!taskforce || !taskforce.id) return [];

    return TodoStore.createBatch([{
      title: `为专班「${taskforce.name || '未命名'}」赋权组织者/深度参与者`,
      description: `专班周期：${taskforce.startDate || '?'} ~ ${taskforce.endDate || '?'}. 请选择人员授予组织者或深度参与者角色。`,
      role: 'org-commissioner',
      category: TodoCategory.AUTH,
      priority: 'urgent',
      deadline: taskforce.startDate || null,
      sourceType: TodoSourceType.TASKFORCE,
      sourceId: taskforce.id,
      actionType: TodoActionType.AUTHORIZE,
      // IA-C1 Task2：稳定业务动作键（专班赋权 → 专班域聚合）
      actionKey: 'taskforce-authorize',
      actionData: { scope: 'taskforce', sourceId: taskforce.id, sourceName: taskforce.name },
      // E2 数据上下游标注
      flow: '专班创建 → 组织委员赋权 → 成员执行',
    }]);
  },

  /**
   * 活动归档后，自动为宣传委员生成归档待办（如需归档材料）
   * @param {Object} activity - 活动对象
   */
  deriveFromActivityArchive(activity) {
    if (!activity || !activity.id) return [];

    return TodoStore.createBatch([{
      title: `归档活动「${activity.title || '未命名'}」材料`,
      description: `请上传活动归档材料（照片、新闻稿、总结等）。`,
      role: 'prop-commissioner',
      category: TodoCategory.ARCHIVE,
      priority: 'normal',
      deadline: null,
      sourceType: TodoSourceType.ACTIVITY,
      sourceId: activity.id,
      actionType: TodoActionType.ARCHIVE,
      // IA-C1 Task2：稳定业务动作键（活动材料归档 → 归档宣传域；同遗留种子 activity-archive 键）
      actionKey: 'activity-archive',
      actionData: { scope: 'activity', sourceId: activity.id, sourceName: activity.title },
      // E2 数据上下游标注
      flow: '宣传材料 → 宣传委员归档 → 产出物区',
    }]);
  },

  /** 活动删除时，联动删除关联待办 */
  deleteByActivity(activityId) {
    TodoStore.deleteBySource(TodoSourceType.ACTIVITY, activityId);
  },

  /** 专班删除时，联动删除关联待办 */
  deleteByTaskforce(taskforceId) {
    TodoStore.deleteBySource(TodoSourceType.TASKFORCE, taskforceId);
  },
};

// ════════════════════════════════════════════════════════════════
//  Visitor 待办派生（普通成员/访客）
//  通知待阅读（未读·未过期·受众相关）+ 活动待参与（未来·本人参与）
//  幂等：按 sourceType+sourceId 去重，可安全重复调用
// ════════════════════════════════════════════════════════════════

// 待办聚合键 'visitor' 与角色键 participant 的映射（S9 文档登记，书记 2026-08-30 裁定：不改代码）
// 语义：'visitor' 是「普通参与者工作台（participant.html）」的待办聚合键，对应角色 participant；
// 与「访客（未登录）」无关。设计文档 ROLE_PERMISSION_DESIGN.md S9 已登记映射，保留 'visitor' 键不动。
export const VisitorTodoDeriver = {
  /**
   * 派生全部 visitor 待办（通知待阅读 + 活动待参与）
   * @param {Object} opts
   * @param {string} opts.personId — 当前用户 personId
   * @param {Object} [opts.person] — 当前用户人员对象（用于受众匹配）
   * @param {Array}  opts.notices  — NoticeStore.getAll() 结果
   * @param {Array}  opts.activities — 已映射的活动列表（含 assignments/organizer）
   */
  deriveAll({ personId, person, notices, activities, signups }) {
    const created = [];
    created.push(...this.deriveFromNotices({ personId, person, notices }));
    created.push(...this.deriveFromActivities({ personId, activities, signups }));
    return created;
  },

  /**
   * 通知待阅读：未读、未过期、受众相关的通知
   * 受众规则：attendance（纪检考勤）不派给普通成员；party（发展党员）只派给非正式党员
   */
  deriveFromNotices({ personId, person, notices }) {
    if (!personId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const items = [];
    for (const n of notices || []) {
      if (n.archived) continue; // 2026-08-08 归档闭环：已归档通知不派生阅读待办
      if (n.read) continue;
      if (n.expireDate && n.expireDate < today) continue;
      const module = n.targetModule;
      if (module === 'attendance') continue;
      if (module === 'party' && person && person.developStage === '正式党员') continue;
      const dup = TodoStore.getBySource(TodoSourceType.NOTICE, n.id).some(t => t.status !== TodoStatus.COMPLETED);
      if (dup) continue;
      items.push({
        title: `阅读通知「${n.title}」`,
        description: n.content || '',
        role: 'visitor',
        category: TodoCategory.NOTICE,
        priority: n.priority || 'normal',
        deadline: n.expireDate || null,
        sourceType: TodoSourceType.NOTICE,
        sourceId: n.id,
        actionType: TodoActionType.READ,
        // IA-C1 Task2：通知阅读稳定键（与 NoticeTodoDeriver 同键聚合；domain=NONE）
        actionKey: 'notice-read',
        actionData: { noticeId: n.id },
      });
    }
    return TodoStore.createBatch(items);
  },

  /**
   * 活动待参与：未来、未归档/未取消/非草稿、本人参与的活动
   * 同时清理已取消/已过期的残留待办，避免孤儿项
   */
  deriveFromActivities({ personId, activities, signups = [] }) {
    if (!personId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const applicableIds = new Set();
    const items = [];
    for (const a of activities || []) {
      if (!a || !a.id) continue;
      if (a.archived || a.status === 'cancelled' || a.status === 'draft') continue;
      if (!a.date || a.date < today) continue;
      // T233：approved 报名也是参与事实（报名即加入/审核通过后）
      const approvedMine = (signups || []).some(s =>
        s.sourceType === 'activity' && s.sourceId === a.id &&
        s.personId === personId && s.status === 'approved'
      );
      const mine = a.organizer === personId ||
        (Array.isArray(a.assignments) && a.assignments.some(x => x.personId === personId)) ||
        approvedMine;
      if (!mine) continue;
      applicableIds.add(a.id);
      // dup 仅限「参与」类待办：signup-review 等其它同源待办不得阻止参与待办生成
      const dup = TodoStore.getBySource(TodoSourceType.ACTIVITY, a.id)
        .some(t => t.actionType === TodoActionType.PARTICIPATE && t.status !== TodoStatus.COMPLETED);
      if (dup) continue;
      items.push({
        title: `参与活动「${a.title || '未命名'}」`,
        description: `活动日期：${a.date}。请按时参与并配合考勤。`,
        role: 'visitor',
        category: TodoCategory.TRACK,
        priority: 'normal',
        deadline: a.date,
        sourceType: TodoSourceType.ACTIVITY,
        sourceId: a.id,
        actionType: TodoActionType.PARTICIPATE,
        // IA-C1 Task2：稳定业务动作键（visitor 参与统一 participate；与 signup 报名渠道同键聚合）
        actionKey: 'participate',
        actionData: {
          activityId: a.id,
          // IA-C1 Task2：源活动 scenarioId 落 actionData → domain 判定点（三会参与→会务，theme-party 等→活动/项目）
          scenarioId: a.scenarioId || a.type || null,
        },
      });
    }
    // 清理：本人已不适用（取消/过期/归档）的活动待办 → 移除
    const stale = _loadTodos().filter(t =>
      t.role === 'visitor' &&
      t.sourceType === TodoSourceType.ACTIVITY &&
      t.status !== TodoStatus.COMPLETED &&
      !applicableIds.has(t.sourceId)
    );
    if (stale.length > 0) {
      const remaining = _loadTodos().filter(t => !stale.some(s => s.id === t.id));
      _saveTodos(remaining);
    }
    return TodoStore.createBatch(items);
  },

  /**
   * 专班参与待办：approved 报名或已是成员的未来招募专班（T233 报名渠道）
   * 与 deriveFromActivities 同模式：未来/未截止、本人参与、去重、清理过期残留
   */
  deriveFromTaskforceSignups({ personId, taskforces, signups = [] }) {
    if (!personId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const applicableIds = new Set();
    const items = [];
    for (const tf of taskforces || []) {
      if (!tf || !tf.id) continue;
      if (tf.status !== 'recruiting' && tf.status !== 'active') continue;
      if (tf.deadline && tf.deadline < today) continue;
      const isMember = (tf.members || []).some(m => m.personId === personId);
      const approved = (signups || []).some(s =>
        s.sourceType === 'taskforce' && s.sourceId === tf.id &&
        s.personId === personId && s.status === 'approved'
      );
      if (!isMember && !approved) continue;
      applicableIds.add(tf.id);
      // dup 仅限「参与」类待办：signup-review 等其它同源待办不得阻止参与待办生成
      const dup = TodoStore.getBySource(TodoSourceType.TASKFORCE, tf.id)
        .some(t => t.actionType === TodoActionType.PARTICIPATE && t.status !== TodoStatus.COMPLETED);
      if (dup) continue;
      items.push({
        title: `参与专班「${tf.name || '未命名'}」`,
        description: tf.task || '',
        role: 'visitor',
        category: TodoCategory.TRACK,
        priority: 'normal',
        deadline: tf.deadline || null,
        sourceType: TodoSourceType.TASKFORCE,
        sourceId: tf.id,
        actionType: TodoActionType.PARTICIPATE,
        // IA-C1 Task2：稳定业务动作键（专班参与与活动参与同键 participate；domain 按 sourceType 归专班）
        actionKey: 'participate',
        actionData: { taskforceId: tf.id },
      });
    }
    // 清理：本人已不适用（取消/过期/归档）的专班待办 → 移除
    const stale = _loadTodos().filter(t =>
      t.role === 'visitor' &&
      t.sourceType === TodoSourceType.TASKFORCE &&
      t.status !== TodoStatus.COMPLETED &&
      !applicableIds.has(t.sourceId)
    );
    if (stale.length > 0) {
      const remaining = _loadTodos().filter(t => !stale.some(s => s.id === t.id));
      _saveTodos(remaining);
    }
    return TodoStore.createBatch(items);
  },
};

// ════════════════════════════════════════════════════════════════
//  种子数据 — mock 待办示例
// ════════════════════════════════════════════════════════════════

export const SEED_TODOS = [
  // 宣传委员待办
  {
    id: 'todo_seed_6',
    title: '提交七一活动新闻稿',
    description: '请撰写并提交七一建党105周年系列活动新闻稿。',
    role: 'prop-commissioner',
    category: TodoCategory.SUBMIT,
    priority: 'normal',
    status: TodoStatus.PENDING,
    deadline: '2026-08-01',
    createdAt: '2026-07-05T08:00:00',
    sourceType: TodoSourceType.MANUAL,
    sourceId: null,
    actionKey: 'activity-archive',
    actionType: TodoActionType.SUBMIT,
    actionData: null,
    // E2 数据上下游标注
    flow: '宣传材料 → 宣传委员归档 → 产出物区',
  },
  // 书记待办
  {
    id: 'todo_seed_7',
    title: '设置第三党小组组长',
    description: '第三党小组组长待任命，请在常设赋权中完成设置。',
    role: 'secretary',
    category: TodoCategory.AUTH,
    priority: 'normal',
    status: TodoStatus.PENDING,
    deadline: null,
    createdAt: '2026-07-01T08:00:00',
    sourceType: TodoSourceType.MANUAL,
    sourceId: null,
    actionKey: 'authorize',
    actionType: TodoActionType.AUTHORIZE,
    actionData: { scope: 'leader', sourceId: null, sourceName: '第三党小组组长' },
  },
];

/** 已废弃种子（T232 闭环化移除：虚假/过期且来源与销项动作不匹配，改由业务数据动态派生） */
const OBSOLETE_SEED_IDS = new Set(['todo_seed_1', 'todo_seed_2', 'todo_seed_3', 'todo_seed_4', 'todo_seed_5']);

/** 初始化种子数据（幂等：按 id 补齐缺失种子；同时清理已废弃种子，避免残留叠加） */
export function seedTodos() {
  let existing = _loadTodos();
  // 清理已废弃种子（用户 localStorage 可能残留旧版本种子）
  const purged = existing.filter(t => !OBSOLETE_SEED_IDS.has(t.id));
  if (purged.length !== existing.length) {
    _saveTodos(purged);
    existing = purged;
  }
  const existingIds = new Set(existing.map(t => t.id));
  const missing = SEED_TODOS.filter(t => !existingIds.has(t.id));
  if (missing.length === 0) return;
  _saveTodos([...existing, ...missing]);
}
