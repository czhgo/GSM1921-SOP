// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  constants.js — 纯静态常量（角色颜色 / 活动类别颜色 / 标签）
// ════════════════════════════════════════════════════════════════

export const TRANSITION_DURATION = 320;

// ── 角色颜色 ────────────────────────────────────────────────────

export const ROLE_COLORS = {
  'deputy-secretary':  { bg: 'rgba(185, 28, 28, 0.10)',   text: '#B91C1C',  border: 'rgba(185, 28, 28, 0.30)' },  // 党建红（同书记）
  leader:              { bg: 'rgba(34, 197, 94, 0.15)',  text: '#22C55E',  border: 'rgba(34, 197, 94, 0.40)' },  // 翠绿#22C55E
  commissioner:        { bg: 'rgba(194, 65, 12, 0.15)',  text: '#C2410C',  border: 'rgba(194, 65, 12, 0.30)' },  // 同纪检#C2410C
  'org-commissioner':  { bg: 'rgba(14, 165, 233, 0.10)',  text: '#0EA5E9',  border: 'rgba(14, 165, 233, 0.30)' },  // 天蓝#0EA5E9
  'prop-commissioner': { bg: 'rgba(37, 99, 235, 0.10)',   text: '#2563EB',  border: 'rgba(37, 99, 235, 0.30)' },  // 海蓝#2563EB
  'disc-commissioner': { bg: 'rgba(194, 65, 12, 0.10)',   text: '#C2410C',  border: 'rgba(194, 65, 12, 0.30)' },  // 深橙#C2410C
  organizer:           { bg: 'rgba(125, 211, 252, 0.15)', text: '#7DD3FC',  border: 'rgba(125, 211, 252, 0.40)' },  // 亮天蓝#7DD3FC
  deep:                { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8',  border: 'rgba(148, 163, 184, 0.30)' },  // 浅灰蓝#94a3b8
  participant:         { bg: 'rgba(107, 114, 128, 0.10)', text: '#6B7280',  border: 'rgba(107, 114, 128, 0.30)' },  // 灰色#6B7280
  all:                 { bg: 'rgba(14, 116, 144, 0.08)',  text: '#0E7490',  border: 'rgba(14, 116, 144, 0.20)' },
  secretary:           { bg: 'rgba(185, 28, 28, 0.10)',   text: '#B91C1C',  border: 'rgba(185, 28, 28, 0.30)' },  // 党建红（不动）
};

// ── 活动类别颜色（三大类：三会一课=党建红 / 主题党日=党建金 / 专班=深青）──
// 书记 2026-07-17 指示：不按共建/学习/参访细分，按"三会一课 vs 主题党日 vs 专班"三大类区分色

const ACTIVITY_CAT_COLOR = {
  // ── 三会一课系（党建红 #CE1126）──
  'party-day-meeting': { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支部党员大会/党小组会
  'branch-meeting':    { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支部委员会
  'committee-meeting': { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支委会
  'meeting':           { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 会议活动
  'org-life':          { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 组织生活
  // ── 主题党日系（党建金 #D4AF37）──
  'party-day-joint':   { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 共建
  'party-day-study':   { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 学习
  'party-day-visit':   { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 参访
  'party-day-talk':    { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 座谈
  'theme-general':     { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 主题教育
  'learning':          { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 学习活动
  'visit':             { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 参访活动
  'discussion':        { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 座谈交流
  'joint':             { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 共建活动
  'training':          { bg: 'rgba(212, 175, 55, 0.10)', text: '#854D0E', border: 'rgba(212, 175, 55, 0.30)' },  // 党员培训
  // ── 专班系（深青 #0E7490）──
  'taskforce':         { bg: 'rgba(14, 116, 144, 0.10)', text: '#0E7490', border: 'rgba(14, 116, 144, 0.30)' },  // 专班
  'long-term':         { bg: 'rgba(14, 116, 144, 0.10)', text: '#0E7490', border: 'rgba(14, 116, 144, 0.30)' },  // 长期活动
  'development':       { bg: 'rgba(14, 116, 144, 0.10)', text: '#0E7490', border: 'rgba(14, 116, 144, 0.30)' },  // 发展党员
  // ── 默认 ──
  'default':           { bg: 'rgba(107, 114, 128, 0.08)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.25)' },
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
  'deputy-secretary':  '党支部副书记',
  'org-commissioner':  '组织委员',
  'prop-commissioner': '宣传委员',
  'disc-commissioner': '纪检委员',
  'commissioner':      '条条委员',
  'leader':            '党小组组长',
  'organizer':         '组织者',
  'deep':              '深度参与者',
  'participant':       '普通参与者',
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
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const ACCENT_COLORS = {
  secretary:           { hex: '#B91C1C' },  // 党建红（不动）
  'deputy-secretary':  { hex: '#B91C1C' },  // 党建红（同书记）
  leader:              { hex: '#22C55E' },  // 翠绿
  'org-commissioner':  { hex: '#0EA5E9' },  // 天蓝
  'prop-commissioner': { hex: '#2563EB' },  // 海蓝
  'disc-commissioner': { hex: '#C2410C' },  // 深橙
  commissioner:        { hex: '#C2410C' },  // 同纪检
  organizer:           { hex: '#7DD3FC' },  // 亮天蓝
  deep:                { hex: '#94a3b8' },  // 浅灰蓝
  participant:         { hex: '#6B7280' },  // 灰色
  all:                 { hex: '#0E7490' },  // 深青
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
  // 三会一课系（党建红）
  '主题党日':     { bg: '#FEF2F2', dot: '#CE1126' },
  '党课':         { bg: '#FEF2F2', dot: '#CE1126' },
  '支委会':       { bg: '#FEF2F2', dot: '#CE1126' },
  '党小组会':     { bg: '#FEF2F2', dot: '#CE1126' },
  '支部党员大会': { bg: '#FEF2F2', dot: '#CE1126' },
  // 主题党日系（党建金）
  '共建':         { bg: '#FFFBEB', dot: '#D4AF37' },
  '参访':         { bg: '#FFFBEB', dot: '#D4AF37' },
  '座谈':         { bg: '#FFFBEB', dot: '#D4AF37' },
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

// ── 反馈（Issue）状态值→中文标签映射 ──────────────────────────
// 数据层保留英文（'open'/'closed'），UI 渲染层通过此映射显示中文
export const ISSUE_STATUS_LABELS = {
  open: '开放中',
  closed: '已关闭',
};

// ── 反馈草稿类型→中文标签映射 ──────────────────────────────
export const DRAFT_TYPE_LABELS = {
  'new-issue': '新建反馈',
  'comment': '评论',
};

// ── 反馈关闭理由→中文标签映射（已在 issue-detail.js 中定义，统一至此）──
export const ISSUE_CLOSED_REASON_LABELS = {
  completed: '已解决',
  duplicate: '重复',
  wontfix: '不修复',
  not_planned: '暂不计划',
};