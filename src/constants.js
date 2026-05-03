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
  'learning':         { bg: 'rgba(37, 99, 235, 0.10)',   text: '#1E40AF', border: 'rgba(37, 99, 235, 0.30)' },
  'meeting':          { bg: 'rgba(124, 58, 237, 0.10)',  text: '#5B21B6', border: 'rgba(124, 58, 237, 0.30)' },
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
  'brand-activity':     'long-term',
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

  // 2) activityType 字段（activityRecord.js 中定义的类型）
  if (activity.activityType) {
    if (activity.activityType.startsWith('党日日-共建')) return ACTIVITY_CAT_COLOR['party-day-joint'];
    if (activity.activityType.startsWith('党日日-学习')) return ACTIVITY_CAT_COLOR['party-day-study'];
    if (activity.activityType.startsWith('党日日-参访')) return ACTIVITY_CAT_COLOR['party-day-visit'];
    if (activity.activityType.startsWith('党日日-座谈')) return ACTIVITY_CAT_COLOR['party-day-talk'];
    if (activity.activityType.startsWith('党日日-会议')) return ACTIVITY_CAT_COLOR['party-day-meeting'];
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
  'learning':          '党课学习',
  'meeting':           '党内会议',
  'development':       '发展党员',
  'training':          '党员培训',
  'org-life':          '组织生活',
  'long-term':         '长期活动',
  'default':           '其他活动',
};

export const ROLE_LABELS = {
  leader:              '党小组组长',
  commissioner:        '条条委员',
  'org-commissioner':  '组织委员',
  'prop-commissioner': '宣传委员',
  'disc-commissioner': '纪检委员',
  organizer:           '活动组织者',
  deep:                '深度参与者',
  all:                 '全体相关',
  secretary:           '党支书',
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
