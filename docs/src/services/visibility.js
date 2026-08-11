// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  visibility.js — 谁应该看谁（全员可见性矩阵）
//  依据 P-015 知情边界（content/01_strategy/SECRETARY_PRONOUNCEMENTS.md）：
//    "能赋权的人，才能看对应条线的在办（L1 条线视角）"
//    "任何角色的信息可见范围，应精确等于其职责空间所需的最小充分信息"
//    L0 个人视角（自己）/ L1 条线视角（上级看下级的条线在办）/ L2 全局视角（书记看全部）
//  数据源：
//    auth.js AUTHORIZE_CHAIN（赋权链 → L1 条线可见性投影）
//    ROLE_CLASSIFICATION.md §9b 常设角色权限矩阵（view_all → 数据维度投影）
//    mock/people.js partyGroup（党小组 → 块块关系：组长看本组组员）
//  核心："看 ≠ 做"——可见性只决定"能看到什么维度"，不授予任何操作权。
// ════════════════════════════════════════════════════════════════

import { PEOPLE } from '../mock/people.js?v=20260811b';
import { ROLE_LABELS } from '../core/constants.js?v=20260811b';
import { TaskForceRecordStore } from './taskforce.js?v=20260811b';
import { loadActivities } from './activity.js?v=20260811b';

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

export const DIMENSION_LABELS = {
  progress:    '在办进度',
  blocker:     '卡点',
  report:      '汇报',
  attendance:  '考勤',
  inspection:  '考察',
  taskforce:   '专班',
};

// ── 角色可见性配置表（数据驱动，不硬编码人）───────────────────────
//  targets 语义：
//    'all'               — L2 全局（书记/副书记看全部条线+块块）
//    'own-group'         — 块块（组长看本党小组组员）
//    ['organizer','deep']— 条线（AUTHORIZE_CHAIN：组织委员→专班成员）
//    []                  — 无下级条线（仅 L0 自我）
//  说明：
//    - 纪检委员 view_all 的数据权限（看所有活动含考勤考察）→ 人的视图投影为
//      全员 × [attendance, inspection]，不含在办/汇报（防止知情过载，P-015）。
//    - 组织委员通过 AUTHORIZE_CHAIN（organizer/deep）看专班条线，维度仅 taskforce。
//    - 宣传委员无赋权链、无考勤考察职责 → 仅 L0 自我。
//    - organizer/deep 为项目角色，见 PROJECT_VISIBILITY（项目作用域内）。
const ROLE_VISIBILITY = {
  'secretary':         { targets: 'all',      dimensions: [VISIBLE_DIMENSIONS.progress, VISIBLE_DIMENSIONS.blocker, VISIBLE_DIMENSIONS.report] },
  'deputy-secretary':  { targets: 'all',      dimensions: [VISIBLE_DIMENSIONS.progress, VISIBLE_DIMENSIONS.blocker, VISIBLE_DIMENSIONS.report] },
  'org-commissioner':  { targets: ['organizer', 'deep'], dimensions: [VISIBLE_DIMENSIONS.taskforce] },
  'prop-commissioner': { targets: [],         dimensions: [] },
  'disc-commissioner': { targets: 'all',      dimensions: [VISIBLE_DIMENSIONS.attendance, VISIBLE_DIMENSIONS.inspection] },
  'leader':            { targets: 'own-group', dimensions: [VISIBLE_DIMENSIONS.progress, VISIBLE_DIMENSIONS.blocker, VISIBLE_DIMENSIONS.report, VISIBLE_DIMENSIONS.attendance, VISIBLE_DIMENSIONS.inspection] },
  'participant':       { targets: [],         dimensions: [] },
};

// ── 项目角色可见性（作用域 = 具体项目 projectId）──────────────────
//  AUTHORIZE_CHAIN：organizer → deep（项目内分工可见）
const PROJECT_VISIBILITY = {
  'organizer': { targets: ['deep'], dimensions: [VISIBLE_DIMENSIONS.taskforce] },
  'deep':      { targets: [],       dimensions: [] },
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

/**
 * 某人（某本人）是否可看目标人
 * @param {string} viewerRole
 * @param {string} viewerPersonId
 * @param {string} targetPersonId
 * @returns {boolean}
 */
export function canViewPerson(viewerRole, viewerPersonId, targetPersonId) {
  if (viewerPersonId === targetPersonId) return true; // L0 自我
  return resolveVisibleTargets(viewerRole, viewerPersonId)
    .some(t => t.personId === targetPersonId);
}

/**
 * 查看者可见目标人的维度（职责空间投影的最小充分信息）
 * @param {string} viewerRole
 * @param {string} viewerPersonId
 * @param {string} targetPersonId
 * @returns {string[]} 可见维度键数组（空 = 仅 L0 基本信息，如姓名/角色）
 */
export function dimensionsFor(viewerRole, viewerPersonId, targetPersonId) {
  if (viewerPersonId === targetPersonId) {
    return Object.values(VISIBLE_DIMENSIONS); // L0 自我全维度
  }
  const t = resolveVisibleTargets(viewerRole, viewerPersonId)
    .find(x => x.personId === targetPersonId);
  return t ? t.dimensions : [];
}

/**
 * 项目作用域可见性（organizer → deep，同一项目内）
 * @param {string} projectRole — 查看者项目角色（organizer/deep/participant）
 * @param {string} targetProjectRole — 目标人项目角色
 * @returns {boolean}
 */
export function canViewInProject(projectRole, targetProjectRole) {
  const cfg = PROJECT_VISIBILITY[projectRole];
  if (!cfg) return false;
  return cfg.targets.includes(targetProjectRole);
}

/** 角色中文标签（对外复用） */
export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}
