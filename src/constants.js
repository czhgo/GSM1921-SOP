// ════════════════════════════════════════════════════════════════
//  constants.js — 纯静态常量（角色颜色、标签、主题类名）
// ════════════════════════════════════════════════════════════════

export const TRANSITION_DURATION = 320;

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
