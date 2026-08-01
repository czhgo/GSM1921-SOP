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
  organizer:           { bg: 'rgba(14, 165, 233, 0.10)', text: '#0369A1',  border: 'rgba(14, 165, 233, 0.30)' },  // 天蓝#0369A1（sky-700，角色色系冷色）
  deep:                { bg: 'rgba(124, 58, 237, 0.10)', text: '#7C3AED',  border: 'rgba(124, 58, 237, 0.30)' },  // 紫罗兰#7C3AED（violet-600，与组织者区分）
  participant:         { bg: 'rgba(107, 114, 128, 0.10)', text: '#6B7280', border: 'rgba(107, 114, 128, 0.30)' },  // 中性灰（默认身份，红不再充当参与者角色色，2026-08-01 修正）
  initiator:           { bg: 'rgba(79, 70, 229, 0.10)', text: '#4F46E5',  border: 'rgba(79, 70, 229, 0.30)' },  // 靛蓝#4F46E5（indigo-600，发起人）
  all:                 { bg: 'rgba(14, 116, 144, 0.08)',  text: '#0E7490',  border: 'rgba(14, 116, 144, 0.20)' },
  secretary:           { bg: 'rgba(185, 28, 28, 0.10)',   text: '#B91C1C',  border: 'rgba(185, 28, 28, 0.30)' },  // 党建红（不动）
};

// ── 活动类别颜色（两大类：三会一课=党建红 / 主题党日=党建金）──
// 书记 2026-07-31 指示：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度

const ACTIVITY_CAT_COLOR = {
  // ── 三会一课系（党建红 #CE1126）──
  'branch-party-meeting': { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支部党员大会
  'branch-committee':      { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支委会
  'party-group-meeting':   { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 党小组会
  'party-lecture':         { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 党课
  // ── 主题党日系（党徽金 #FFD700，2026-08-01 书记要求"再亮一些"，原 #D4AF37 偏灰/脏）──
  'theme-party':           { bg: 'rgba(255, 215, 0, 0.12)', text: '#B45309', border: 'rgba(255, 215, 0, 0.35)' },  // 主题党日
  // ── 默认 ──
  'default':               { bg: 'rgba(107, 114, 128, 0.08)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.25)' },
};

/**
 * scenarioId → 活动类别键 映射
 */
const SCENARIO_TO_CATEGORY = {
  'branch-party-meeting': 'branch-party-meeting',
  'branch-committee':     'branch-committee',
  'party-group-meeting':  'party-group-meeting',
  'party-lecture':        'party-lecture',
  // 组织生活会：会议内容（批评与自我批评），形式上归入三会一课系（书记 2026-08-01 决策）
  'org-life':             'party-group-meeting',
  'theme-party':          'theme-party',
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

  // 2) 兜底
  return ACTIVITY_CAT_COLOR.default;
}

export const ACTIVITY_CATEGORY_COLORS = ACTIVITY_CAT_COLOR;

export const ACTIVITY_TYPE_LABELS = {
  // ── 三会一课 ──
  'branch-party-meeting': '三会一课',
  'branch-committee':     '三会一课',
  'party-group-meeting':  '三会一课',
  'party-lecture':        '三会一课',
  'org-life':             '三会一课',
  // ── 主题党日 ──
  'theme-party':          '主题党日',
  // ── 默认 ──
  'default':              '其他活动',
};

/**
 * 首页日历格子内2字缩写（格子宽度受限，完整标签显示不下）
 * 书记 2026-07-31 指示：日历简称使用"党会""党课""党日"
 */
export const ACTIVITY_TYPE_SHORT = {
  // ── 三会一课 ──
  'branch-party-meeting': '党会',
  'branch-committee':     '党会',
  'party-group-meeting':  '党会',
  'party-lecture':        '党课',
  'org-life':             '党会',
  // ── 主题党日 ──
  'theme-party':          '党日',
  // ── 默认 ──
  'default':              '活动',
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
  participant:         { hex: '#B45309' },  // 党徽金（访客强调色，与中性灰身份色并存，2026-08-01 改，原党建红#CE1126）
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
  '党课':         { bg: '#FEF2F2', dot: '#CE1126' },
  '支委会':       { bg: '#FEF2F2', dot: '#CE1126' },
  '党小组会':     { bg: '#FEF2F2', dot: '#CE1126' },
  '支部党员大会': { bg: '#FEF2F2', dot: '#CE1126' },
  '组织生活会':   { bg: '#FEF2F2', dot: '#CE1126' },
  // 主题党日系（党徽金 #FFD700，2026-08-01 亮金化；text=深金文字供日期数字、dotBorder=金点描边恢复暖底可辨性）
  '主题党日':     { bg: '#FEFCE8', dot: '#FFD700', text: '#B45309', dotBorder: 'rgba(180, 83, 9, 0.35)' },
  '共建':         { bg: '#FEFCE8', dot: '#FFD700', text: '#B45309', dotBorder: 'rgba(180, 83, 9, 0.35)' },
  '参访':         { bg: '#FEFCE8', dot: '#FFD700', text: '#B45309', dotBorder: 'rgba(180, 83, 9, 0.35)' },
  '座谈':         { bg: '#FEFCE8', dot: '#FFD700', text: '#B45309', dotBorder: 'rgba(180, 83, 9, 0.35)' },
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