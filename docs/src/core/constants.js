// role: [人机]
// ════════════════════════════════════════════════════════════════
//  constants.js — 纯静态常量（角色颜色 / 活动类别颜色 / 标签）
// ════════════════════════════════════════════════════════════════

export const TRANSITION_DURATION = 320;

// ── 角色颜色 ────────────────────────────────────────────────────

export const ROLE_COLORS = {
  leader:              { bg: 'rgba(255, 241, 242, 0.40)', text: '#9b0000',  border: 'rgba(254, 202, 202, 0.70)' },
  commissioner:        { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  'org-commissioner':  { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  'prop-commissioner': { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  'disc-commissioner': { bg: 'rgba(254, 249, 195, 0.40)', text: '#713f12',  border: 'rgba(253, 230, 138, 0.70)' },
  organizer:           { bg: 'rgba(239, 246, 255, 0.40)', text: '#1e40af',  border: 'rgba(191, 219, 254, 0.70)' },
  deep:                { bg: 'rgba(240, 253, 244, 0.40)', text: '#166534',  border: 'rgba(187, 247, 208, 0.70)' },
  all:                 { bg: 'rgba(245, 243, 255, 0.40)', text: '#5b21b6',  border: 'rgba(221, 214, 254, 0.70)' },
  secretary:           { bg: 'rgba(139, 92, 246, 0.15)',  text: '#7C3AED',  border: 'rgba(139, 92, 246, 0.50)' },
};

// ── 活动类别颜色（按活动类型区分）───────────────────────────────
// 用于日历视图中为不同类型活动赋予不同颜色

const ACTIVITY_CAT_COLOR = {
  'party-day-joint':  { bg: 'rgba(219, 39, 119, 0.10)',  text: '#BE185D', border: 'rgba(219, 39, 119, 0.30)' },
  'party-day-study':  { bg: 'rgba(59, 130, 246, 0.10)',  text: '#1D4ED8', border: 'rgba(59, 130, 246, 0.30)' },
  'party-day-visit':  { bg: 'rgba(16, 185, 129, 0.10)',  text: '#047857', border: 'rgba(16, 185, 129, 0.30)' },
  'party-day-talk':   { bg: 'rgba(245, 158, 11, 0.10)',  text: '#B45309', border: 'rgba(245, 158, 11, 0.30)' },
  'party-day-meeting':{ bg: 'rgba(139, 92, 246, 0.10)',  text: '#6D28D9', border: 'rgba(139, 92, 246, 0.30)' },
  'theme-general':    { bg: 'rgba(206, 17, 38, 0.10)',   text: '#991B1B', border: 'rgba(206, 17, 38, 0.30)' },
  // ─ 新活动形式（决策树 Q2 直映射） ─
  'learning':         { bg: 'rgba(59, 130, 246, 0.10)',  text: '#1D4ED8', border: 'rgba(59, 130, 246, 0.30)' },
  'visit':            { bg: 'rgba(16, 185, 129, 0.10)',  text: '#047857', border: 'rgba(16, 185, 129, 0.30)' },
  'discussion':       { bg: 'rgba(245, 158, 11, 0.10)',  text: '#B45309', border: 'rgba(245, 158, 11, 0.30)' },
  'joint':            { bg: 'rgba(219, 39, 119, 0.10)',  text: '#BE185D', border: 'rgba(219, 39, 119, 0.30)' },
  'meeting':          { bg: 'rgba(139, 92, 246, 0.10)',  text: '#6D28D9', border: 'rgba(139, 92, 246, 0.30)' },
  // ─ 旧值保持向后兼容 ─
  'development':      { bg: 'rgba(2, 132, 199, 0.10)',   text: '#0C4A6E', border: 'rgba(2, 132, 199, 0.30)' },
  'training':         { bg: 'rgba(250, 204, 21, 0.10)',  text: '#854D0E', border: 'rgba(250, 204, 21, 0.30)' },
  'org-life':         { bg: 'rgba(239, 68, 68, 0.10)',   text: '#991B1B', border: 'rgba(239, 68, 68, 0.30)' },
  'long-term':        { bg: 'rgba(14, 116, 144, 0.10)',  text: '#155E75', border: 'rgba(14, 116, 144, 0.30)' },
  'default':          { bg: 'rgba(107, 114, 128, 0.08)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.25)' },
};

/**
 * scenarioId → 活动类别键 映射
 */
const SCENARIO_TO_CATEGORY = {
  'theme-party':        'party-day-study',
  'branch-meeting':     'party-day-meeting',
  'party-group-meeting': 'party-day-meeting',
  'committee-meeting':  'meeting',
  'party-lecture':      'learning',
  'org-life':           'org-life',
  'development':        'development',
  'training':           'training',
  'joint-event':        'party-day-joint',
};

/**
 * 根据活动对象返回对应的颜色。
 * 优先级：scenarioId → domain → 默认灰色
 * @param {Object} activity — { scenarioId?, domain?, activityType?, duration? }
 * @returns {{ bg:string, text:string, border:string }}
 */
export function getActivityColor(activity) {
  if (!activity) return ACTIVITY_CAT_COLOR.default;

  // 1) scenarioId 直接映射
  if (activity.scenarioId && SCENARIO_TO_CATEGORY[activity.scenarioId]) {
    return ACTIVITY_CAT_COLOR[SCENARIO_TO_CATEGORY[activity.scenarioId]];
  }

  // 2) activityType 字段（决策树 Q2 直映射 + 旧值向后兼容）
  if (activity.activityType) {
    const at = activity.activityType;
    if (at === 'party-day-joint'   || at.startsWith('党日日-共建')) return ACTIVITY_CAT_COLOR['party-day-joint'];
    if (at === 'party-day-study'   || at.startsWith('党日日-学习')) return ACTIVITY_CAT_COLOR['party-day-study'];
    if (at === 'party-day-visit'   || at.startsWith('党日日-参访')) return ACTIVITY_CAT_COLOR['party-day-visit'];
    if (at === 'party-day-talk'    || at.startsWith('党日日-座谈')) return ACTIVITY_CAT_COLOR['party-day-talk'];
    if (at === 'party-day-meeting' || at.startsWith('党日日-会议')) return ACTIVITY_CAT_COLOR['party-day-meeting'];
    if (at === 'theme-party' || at === 'theme-general')  return ACTIVITY_CAT_COLOR['theme-general'];
    if (at === 'learning')                              return ACTIVITY_CAT_COLOR.learning;
    if (at === 'visit')                                 return ACTIVITY_CAT_COLOR.visit;
    if (at === 'discussion')                            return ACTIVITY_CAT_COLOR.discussion;
    if (at === 'joint')                                 return ACTIVITY_CAT_COLOR.joint;
    if (at === 'meeting')                               return ACTIVITY_CAT_COLOR.meeting;
    if (at === 'long-term')                             return ACTIVITY_CAT_COLOR['long-term'];
  }

  // 3) duration/domain 兜底
  if (activity.duration === 'long-term') return ACTIVITY_CAT_COLOR['long-term'];
  if (activity.domain === 'meeting') return ACTIVITY_CAT_COLOR.meeting;

  return ACTIVITY_CAT_COLOR.default;
}

export const ACTIVITY_CATEGORY_COLORS = ACTIVITY_CAT_COLOR;

export const ACTIVITY_TYPE_LABELS = {
  'party-day-joint':   '共建活动',
  'party-day-study':   '学习活动',
  'party-day-visit':   '参访活动',
  'party-day-talk':    '座谈交流',
  'party-day-meeting': '党日会议',
  'theme-general':     '主题党日',
  'learning':          '学习活动',
  'visit':             '参访活动',
  'discussion':        '座谈交流',
  'joint':             '共建活动',
  'meeting':           '会议活动',
  'development':       '发展党员',
  'training':          '党员培训',
  'org-life':          '组织生活',
  'long-term':         '长期活动',
  'default':           '其他活动',
};

export const ROLE_LABELS = {
  'secretary':         '党支部书记',
  'org-commissioner':  '组织委员',
  'prop-commissioner': '宣传委员',
  'disc-commissioner': '纪检委员',
  'commissioner':      '条条委员',
  'leader':            '党小组组长',
  'organizer':         '组织者',
  'deep':              '深度参与者',
  'all':               '全体相关',
};

export const COMMISSIONER_ROLES = new Set([
  'commissioner', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]);

export const ROLE_THEME_CLASS = {
  leader:       'role-theme-leader',
  commissioner: 'role-theme-commissioner',
  organizer:    'role-theme-organizer',
  deep:         'role-theme-deep',
  secretary:    'role-theme-secretary',
};

// ── 角色强调色（accent 三件套统一来源）──────────────────────────
// 每个角色对应一个主色 hex，bg/border 由 hexToRgba 派生

/**
 * hex 转 rgba 字符串
 * @param {string} hex — 如 '#CE1126' 或 '#3B82F6'
 * @param {number} alpha — 0~1
 * @returns {string} — 如 'rgba(206,17,38,0.1)'
 */
export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const ACCENT_COLORS = {
  secretary:           { hex: '#7A0010' },
  leader:              { hex: '#CE1126' },
  'org-commissioner':  { hex: '#CE1126' },
  'prop-commissioner': { hex: '#10B981' },
  'disc-commissioner': { hex: '#D97706' },
  commissioner:        { hex: '#D97706' },
  organizer:           { hex: '#3B82F6' },
  deep:                { hex: '#059669' },
  all:                 { hex: '#7C3AED' },
};

/**
 * 获取角色的 accent 三件套
 * @param {string} role — 角色键名
 * @param {number} [bgAlpha=0.1] — 背景色透明度
 * @param {number} [borderAlpha=0.3] — 边框色透明度
 * @returns {{ accent: string, accentRgba: string, accentBorder: string }}
 */
export function getAccentColors(role, bgAlpha = 0.1, borderAlpha = 0.3) {
  const entry = ACCENT_COLORS[role] || ACCENT_COLORS.all;
  return {
    accent: entry.hex,
    accentRgba: hexToRgba(entry.hex, bgAlpha),
    accentBorder: hexToRgba(entry.hex, borderAlpha),
  };
}

// ── 活动类型颜色（中文标签版，用于卡片/列表视图）──────────────────
// 统一来源，消除 main-entry / ws-visitor-entry / archive-entry 中的重复定义

const _ACTIVITY_TYPE_BASE = {
  '主题党日':     { bg: '#FEF2F2', dot: '#DC2626' },
  '共建':         { bg: '#FDF2F8', dot: '#DB2777' },
  '党课':         { bg: '#EFF6FF', dot: '#2563EB' },
  '参访':         { bg: '#ECFDF5', dot: '#059669' },
  '座谈':         { bg: '#FFF7ED', dot: '#EA580C' },
  '支委会':       { bg: '#F5F3FF', dot: '#7C3AED' },
  '党小组会':     { bg: '#F0F9FF', dot: '#0891B2' },
  '支部党员大会': { bg: '#FFFBEB', dot: '#D97706' },
};

/**
 * 获取活动类型颜色映射
 * @param {Object} [opts]
 * @param {boolean} [opts.withLabel=false] — 是否包含 label 字段
 * @param {boolean} [opts.useGradient=false] — 是否用渐变色替代纯色背景
 * @returns {Object}
 */
export function getActivityTypeColors({ withLabel = false, useGradient = false } = {}) {
  const result = {};
  for (const [key, val] of Object.entries(_ACTIVITY_TYPE_BASE)) {
    const entry = { ...val };
    if (useGradient) {
      // 将 #FEF2F2 转为 linear-gradient(135deg, #FEF2F2, #FEE2E2) 形式
      entry._flatBg = entry.bg;
      entry.bg = `linear-gradient(135deg, ${entry.bg}, ${_darken(entry.bg)})`;
    }
    if (withLabel) {
      entry.label = key;
    }
    result[key] = entry;
  }
  return result;
}

/** 将 #FEF2F2 这种浅色再加深一档，用于渐变终点 */
function _darken(hex) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 16);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 16);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 16);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
