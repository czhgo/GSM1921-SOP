// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  visibility.js — 谁应该看谁（全员可见性矩阵）
//  依据 P-011 知情边界（content/01_strategy/SECRETARY_DIRECTIVES.md）：
//    "能赋权的人，才能看对应条线的在办（L1 条线视角）"
//    "任何角色的信息可见范围，应精确等于其职责空间所需的最小充分信息"
//    L0 个人视角（自己）/ L1 条线视角（上级看下级的条线在办）/ L2 全局视角（支书看全部）
//  数据源：
//    auth.js AUTHORIZE_CHAIN（赋权链 → L1 条线可见性投影）
//    SYSTEM_ROLE_PERMISSION.md §9b 常设角色权限矩阵（view_all → 数据维度投影）
//    mock/people.js partyGroup（党小组 → 块块关系：组长看本组组员）
//  核心："看 ≠ 做"——可见性只决定"能看到什么维度"，不授予任何操作权。
// ════════════════════════════════════════════════════════════════

import { PEOPLE } from '../mock/people.js?v=20260922k';
import { TaskForceRecordStore } from './taskforce.js?v=20260922k';
import { loadActivities, isPendingApprovalActivity, isActivityOrganizerIn } from './activity.js?v=20260922k';
import { BRANCH_COMMISSION_ROLES } from '../core/constants.js?v=20260922k';

// ── 可见维度（职责空间投影的最小充分信息）─────────────────────────
//  progress    — 在办进度（待办/活动/专班聚合）
//  blocker     — 卡点（系统派生的超期/缺口 + 成员主动上报的卡点）
//  report      — 汇报对话（成员发起 → 上级答复 → 确认闭环）
//  attendance  — 考勤数据
//  inspection  — 考察数据
//  taskforce   — 专班数据（进度/成员/分工）
export const VISIBLE_DIMENSIONS = {
  progress:    'progress',
  blocker:     'blocker',
  report:      'report',
  attendance:  'attendance',
  inspection:  'inspection',
  taskforce:   'taskforce',
};

// ── 角色可见性配置表（数据驱动，不硬编码人）───────────────────────
//  targets 语义：
//    'all'               — L2 全局（支书/副支书看全部条线+块块）
//    'own-group'         — 块块（组长看本党小组组员）
//    ['organizer','deep']— 条线（AUTHORIZE_CHAIN：组织委员→专班成员）
//    []                  — 无下级条线（仅 L0 自我）
//  说明：
//    - 纪检委员 view_all 的数据权限（看所有活动含考勤考察）→ 人的视图投影为
//      全员 × [attendance, inspection]，不含在办/汇报（防止知情过载，P-011）。
//    - 组织委员通过 AUTHORIZE_CHAIN（organizer/deep）看专班条线，维度仅 taskforce。
//    - 宣传委员无赋权链、无考勤考察职责 → 仅 L0 自我。
//    - organizer/deep 为项目角色（专班/活动动态成员，见 _taskforcePeople 收集）。
const ROLE_VISIBILITY = {
  'secretary':         { targets: 'all',      dimensions: [VISIBLE_DIMENSIONS.progress, VISIBLE_DIMENSIONS.blocker, VISIBLE_DIMENSIONS.report] },
  'deputy-secretary':  { targets: 'all',      dimensions: [VISIBLE_DIMENSIONS.progress, VISIBLE_DIMENSIONS.blocker, VISIBLE_DIMENSIONS.report] },
  'org-commissioner':  { targets: ['organizer', 'deep'], dimensions: [VISIBLE_DIMENSIONS.taskforce] },
  'prop-commissioner': { targets: [],         dimensions: [] },
  'disc-commissioner': { targets: 'all',      dimensions: [VISIBLE_DIMENSIONS.attendance, VISIBLE_DIMENSIONS.inspection] },
  'leader':            { targets: 'own-group', dimensions: [VISIBLE_DIMENSIONS.progress, VISIBLE_DIMENSIONS.blocker, VISIBLE_DIMENSIONS.report, VISIBLE_DIMENSIONS.attendance, VISIBLE_DIMENSIONS.inspection] },
  'participant':       { targets: [],         dimensions: [] },
};

/** 获取人员的常设角色（与 auth.js 同口径；organizer/deep 走项目角色） */
function _roleOf(person) {
  return person ? (person.role || 'participant') : 'participant';
}

/** 获取专班的组织者/深度参与者成员（动态数据，AUTHORIZE_CHAIN 目标） */
function _taskforcePeople() {
  const tfList = TaskForceRecordStore.list();
  const map = new Map();
  tfList.forEach(tf => {
    (tf.members || []).forEach(m => {
      if (m.role === 'organizer' || m.role === 'deep') {
        if (!map.has(m.personId)) map.set(m.personId, { personId: m.personId, role: m.role, taskforces: [] });
        map.get(m.personId).taskforces.push(tf.name || tf.id);
      }
    });
  });
  return [...map.values()];
}

/** 活动分工中的组织者/深度参与者（动态数据补充） */
function _activityProjectPeople() {
  const activities = loadActivities();
  const map = new Map();
  activities.forEach(a => {
    (a.assignments || []).forEach(x => {
      if (x.role === 'organizer' || x.role === 'deep') {
        if (!map.has(x.personId)) map.set(x.personId, { personId: x.personId, role: x.role, projects: [] });
        map.get(x.personId).projects.push(a.title || a.id);
      }
    });
  });
  return [...map.values()];
}

/**
 * 计算某角色（某本人）可看的他人清单（L1 条线 / L2 全局 / 块块）
 * @param {string} viewerRole — 查看者常设角色键
 * @param {string} viewerPersonId — 查看者本人 personId（own-group 需要）
 * @returns {Array<{ personId, name, role, partyGroup, relation, dimensions }>}
 */
export function resolveVisibleTargets(viewerRole, viewerPersonId) {
  const cfg = ROLE_VISIBILITY[viewerRole];
  if (!cfg || cfg.targets.length === 0) return [];

  let targets = [];
  if (cfg.targets === 'all') {
    // L2 全局：全部人员（不包含自己，L0 自我独立处理）
    targets = PEOPLE.map(p => ({ personId: p.id, name: p.name, role: _roleOf(p), partyGroup: p.partyGroup || '', relation: '全局' }));
  } else if (cfg.targets === 'own-group') {
    // 块块：与组长同党小组的其他成员（不含组长本人）
    const me = PEOPLE.find(p => p.id === viewerPersonId);
    const group = me ? me.partyGroup : '';
    targets = PEOPLE
      .filter(p => p.id !== viewerPersonId && (p.partyGroup || '') === group)
      .map(p => ({ personId: p.id, name: p.name, role: _roleOf(p), partyGroup: p.partyGroup || '', relation: '本组组员' }));
  } else {
    // 条线：AUTHORIZE_CHAIN 目标角色（专班/活动动态成员 + 常设角色兜底）
    const roleSet = new Set(cfg.targets);
    const tfPeople = _taskforcePeople();
    const actPeople = _activityProjectPeople();
    const merged = new Map();
    [...tfPeople, ...actPeople].forEach(x => {
      if (roleSet.has(x.role)) merged.set(x.personId, x);
    });
    // 常设角色兜底（如组织委员看其他委员等场景，当前矩阵无此需求，保留扩展位）
    targets = [...merged.values()].map(x => {
      const p = PEOPLE.find(pp => pp.id === x.personId);
      return {
        personId: x.personId,
        name: p ? p.name : x.personId,
        role: x.role,
        partyGroup: p ? (p.partyGroup || '') : '',
        relation: x.role === 'organizer' ? '专班/活动组织者' : '专班/活动深度参与者',
      };
    });
  }

  // 附加可见维度
  targets.forEach(t => { t.dimensions = [...cfg.dimensions]; });
  return targets;
}

// ════════════════════════════════════════════════════════════════
//  活动批准门的「待批可见性」单一源（2026-09-22 批次 151 立 · 批次 152 补第二支）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-22，逐字）：「待批的活动，只有支委层能看到；普通党员看不到（避免"还没批就传出去了"）。」
// 支书裁定（2026-09-22，逐字，批次 152 补）：「给组织者本人开一个"我提交的待批"可见位。理由：他自己写的活动，
//   批之前总得能看见吧。」
// 口径（**三档**）：① **支委层**＝既有语义角色集 `core/constants.js::BRANCH_COMMISSION_ROLES`（支书/副支书/
//   组织委员/宣传委员/纪检委员；**单一源，勿另写名单**）可见；② **组织者本人**（＝该场活动的组织者：顶层
//   `activity.organizer` 或 `assignments[].role==='organizer'`，判据单一源 `services/activity.js::isActivityOrganizerIn`，
//   以**实际字段**为准、不另立"创建人"口径）**也可见**——即使他不在支委层（他自己写的活动，批之前看得见）；
//   ③ **其余非支委层**（普通党员 / 党小组组长 / 未登录）**看不到**。他可见 ≠ 别人可见。
//   `status === 'pending-approval'` 的活动按上三档判；批准后（`published`）回到既有可见性口径。
//   （活动列表 / 日历 / 看板 / 今日摘要 / 待办派生 / 计数 / 详情页共用本判据。）
// ⚠ **关闭（默认档 `off`）⇒ 零行为变化**：关闭时系统里不存在 `pending-approval` 活动 ⇒ 本判据对任何活动
//   恒真 ⇒ 各消费点过滤为空转（不改变任何一处既有行为）。
// ⚠ 判据单一源即本段：各消费点一律调 `isActivityVisibleTo` / `filterActivitiesForViewer`，勿另写第二份。
// ⚠ 本段置于文件末尾（批次 132 行号纪律）：不改动上文任何行号；README-server.md 的 `visibility.js:NN`
//   行号引用只随上方新增的一行 import 平移（+1，同批已改准）。

/** 某角色能否看见「待批」活动（＝是否支委层；名单单一源 `BRANCH_COMMISSION_ROLES`） */
export function canSeePendingApprovalActivities(role) {
  return BRANCH_COMMISSION_ROLES.includes(role);
}

/** 当前查看者 personId（未登录 / 无此接口 → null；与各消费点读 `AuthStore.getCurrentUser()` 同源一处） */
export function currentViewerPersonId() {
  try {
    const u = AuthStore.getCurrentUser();
    return u ? (u.personId || null) : null;
  } catch { return null; }
}

/**
 * 某场活动对某查看者是否可见（待批 ⇒ 支委层 **或** 组织者本人；其余状态 ⇒ 沿用既有可见性，恒真）。
 * @param {Object} activity 活动
 * @param {string|null|undefined} role 查看者角色键
 * @param {string|null} [personId] 查看者 personId（缺省＝当前登录人）
 */
export function isActivityVisibleTo(activity, role, personId) {
  if (!isPendingApprovalActivity(activity)) return true;
  if (canSeePendingApprovalActivities(role)) return true;
  return isActivityOrganizerIn(activity, personId !== undefined ? personId : currentViewerPersonId());
}

/**
 * 按查看者过滤活动清单（待批活动对「非支委层 **且** 非组织者本人」剔除）。
 * @param {Array} activities 活动清单
 * @param {string|null|undefined} role 查看者角色键（未登录/无身份 → null ⇒ 非支委层）
 * @param {string|null} [personId] 查看者 personId（缺省＝当前登录人）
 * @returns {Array}
 */
export function filterActivitiesForViewer(activities, role, personId) {
  const pid = personId !== undefined ? personId : currentViewerPersonId();
  return (activities || []).filter(a => isActivityVisibleTo(a, role, pid));
}

// 当前登录人读口（置文件末尾：ESM import 声明提升，不影响语义，避免改动上文行号 ⇒ README-server.md 引用不漂移）
import { AuthStore } from './auth.js?v=20260922k';

