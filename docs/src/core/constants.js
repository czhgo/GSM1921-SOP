// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  constants.js — 纯静态常量（角色颜色 / 活动类别颜色 / 标签）
// ════════════════════════════════════════════════════════════════

// ── 内联标签深色适配：深色三件套自动生成 ──────────────────────────
// 深色模式下内联样式（background/color/border 浅底深字）不随主题反转，
// 此处按「同色系提亮一档」为每个颜色条目补 bgDark/textDark/borderDark，
// 由 JS 模板写入 --acc-bg-dark/--acc-text-dark/--acc-border-dark 变量，
// CSS html.theme-dark [style*="--acc-bg-dark"] 规则完成深色覆盖（与 badge--* 深色语义平行）。
const _TEXT_DARK_MAP = {
  '#991B1B': '#F87171', '#A16207': '#FBBF24', '#4B5563': '#94A3B8',
  '#B91C1C': '#F87171', '#C2410C': '#FB923C', '#0369A1': '#38BDF8',
  '#7C3AED': '#A78BFA', '#6B7280': '#94A3B8', '#0E7490': '#22D3EE',
  '#4F46E5': '#A5B4FC', '#22C55E': '#4ADE80', '#0EA5E9': '#38BDF8',
  '#2563EB': '#60A5FA',
  // 各组件内联标签补充映射（d8 深色适配：阶段徽章/看板头/操作按钮等）
  '#1D4ED8': '#60A5FA', '#047857': '#34D399', '#92400E': '#FBBF24',
  '#d97706': '#FBBF24', '#3b82f6': '#60A5FA', '#10b981': '#34D399',
  '#9B0000': '#F87171', '#16A34A': '#4ADE80',
  // 表态组件/状态图标补充（d10 全局扫尾：reactions 选中态 / toast 状态色等）
  '#059669': '#34D399', '#DC2626': '#F87171',
  // 强调色补充（主题色个性化可选色中的亮色，本身已亮，深色下保持自身）
  '#7DD3FC': '#7DD3FC',
  '#A78BFA': '#C4B5FD', // deep 强调色（violet-400 → 深色提亮至 violet-300，S6 与语义色同源）
};
function _hexToRgbStr(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}
function _applyDark(map) {
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const d = _TEXT_DARK_MAP[v.text] || '#CBD5E1';
    out[k] = { ...v, bgDark: `rgba(${_hexToRgbStr(d)}, 0.16)`, textDark: d, borderDark: `rgba(${_hexToRgbStr(d)}, 0.35)` };
  }
  return out;
}

/**
 * 为颜色对象映射表补深色三件套（bgDark/textDark/borderDark）——供组件内联标签使用，
 * 与 CSS `html.theme-dark [style*="--acc-bg-dark"]` 覆盖规则配套。
 * @param {Object<string,{bg:string,text:string,border:string}>} map
 * @returns 深色三件套增强版映射表
 */
export function applyDark(map) {
  return _applyDark(map);
}

/**
 * accent hex → 深色三件套内联变量串（标签/按钮统一深色方案：16% 透明提亮底 + 提亮字 + 35% 提亮边框）。
 * @param {string} hex — 日间文字色（如 '#B91C1C'）
 * @returns {string} — '--acc-bg-dark:...;--acc-text-dark:...;--acc-border-dark:...;'
 */
export function accDarkVars(hex) {
  const p = accDarkParts(hex);
  return `--acc-bg-dark:${p.bg};--acc-text-dark:${p.text};--acc-border-dark:${p.border};`;
}

/**
 * accent hex → 深色三件套分量（供模板按需取用 bg/text/border）。
 * @param {string} hex — 日间文字色
 * @returns {{ bg:string, text:string, border:string }}
 */
export function accDarkParts(hex) {
  const d = _TEXT_DARK_MAP[hex] || '#CBD5E1';
  return {
    bg: `rgba(${_hexToRgbStr(d)}, 0.16)`,
    text: d,
    border: `rgba(${_hexToRgbStr(d)}, 0.35)`,
  };
}

/**
 * 内联实色圆点深色提亮（d9）：深色系 hex → 同色系提亮色；本身已亮的色（500 色阶等）保持原色，
 * 深色下无需提亮。配合 styles.css `html.theme-dark [style*="--acc-dot-dark"]` 覆盖规则。
 * @param {string} hex — 日间圆点背景色（深色文字色或亮色均可）
 * @returns {string} — '--acc-dot-dark:<提亮色>;'
 */
export function dotDarkVars(hex) {
  // 映射表 key 大小写混用（#d97706 小写 / #9B0000 混合），归一化后查询避免漏配
  const d = _TEXT_DARK_MAP[hex] || _TEXT_DARK_MAP[hex.toUpperCase()] || _TEXT_DARK_MAP[hex.toLowerCase()] || hex;
  return `--acc-dot-dark:${d};`;
}

// ── 角色颜色 ────────────────────────────────────────────────────

export const ROLE_COLORS = _applyDark({
  'deputy-secretary':  { bg: 'rgba(185, 28, 28, 0.10)',   text: '#B91C1C',  border: 'rgba(185, 28, 28, 0.30)' },  // 党建红（同支书）
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
});

// ── 活动类别颜色（两大类：三会一课=党建红 / 主题党日=党建金）──
// 支书 2026-07-31 指示：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度

const ACTIVITY_CAT_COLOR = _applyDark({
  // ── 三会一课系（党建红 #CE1126）──
  'branch-party-meeting': { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支部党员大会
  'branch-committee':      { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支委会
  'party-group-meeting':   { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 党小组会
  'party-lecture':         { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 党课
  // ── 主题党日系（党徽金 #FFD700，2026-08-01 支书要求"再亮一些"，原 #D4AF37 偏灰/脏）──
  'theme-party':           { bg: 'rgba(255, 215, 0, 0.12)', text: '#A16207', border: 'rgba(255, 215, 0, 0.35)' },  // 主题党日
  // ── 默认 ──
  'default':               { bg: 'rgba(107, 114, 128, 0.08)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.25)' },
});

/**
 * scenarioId → 活动类别键 映射
 */
const SCENARIO_TO_CATEGORY = {
  'branch-party-meeting': 'branch-party-meeting',
  'branch-committee':     'branch-committee',
  'party-group-meeting':  'party-group-meeting',
  'party-lecture':        'party-lecture',
  // 组织生活会：会议内容（批评与自我批评），由党小组会等三会形式召开（支书 2026-08-01/2026-08-07 决策）
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
 * 支书 2026-07-31 指示：日历简称使用"党会""党课""党日"
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

// ── 角色键单一事实源（T-304 Q3 权限收敛，2026-08-29）──────────────
// 与内容层 SYSTEM_ROLE_PERMISSION.md §9a0 角色键全表对齐（2026-09-05 自 ROLE_CLASSIFICATION.md §九 迁出）；
// ROLE_LABELS / ROLE_COLORS / ACCENT_COLORS / 能力 requiredRoles 均以本枚举为基准核对。
// 常设角色（7）+ 项目角色（2）为业务角色；遗留键（3）无角色语义，仅保留兼容兜底。
export const ROLE_KEYS = [
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
  'leader', 'participant',
  // P1 党委后台（2026-09-02）：党委组织员/党务老师——组织级角色（院系党委），不属于任一支部
  'party-staff',
  'organizer', 'deep',
];
export const ROLE_LEGACY_KEYS = ['commissioner', 'initiator', 'all']; // 遗留键：无独立角色，保留兼容

// ── 授权语义角色集（2026-09-03 P2c 收敛：server 鉴权与前端 AuthStore 共用单一源，勿各自手写）──
// 注意与上方「条条委员 COMMISSIONER_ROLES（业务语义：三委员，不含支书/副支书）」区分——
// 授权语义含支书/副支书（写活动/发任务等全局授权门），是 server requireRole 与前端 isCommissioner 的依据。
// 名单与 SYSTEM_ROLE_PERMISSION.md §9a0 角色键全表一致；成员名单 COMMITTEE_IDS 对应演示支部支委（p10~p14）。
export const BRANCH_COMMISSION_ROLES = [
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]; // 授权支委（含支书/副支书）
export const SECRETARY_ROLES = ['secretary']; // 支书专属（副支书/委员不越权支书专属操作）
// 副书同权（2026-09-11 支书裁定）：支书侧写链（名册在册镜像/发展阶段/移出确认等）副支书同权，
// 与既有口径一致（议程结果区、编辑议程、支部 config §9h 副书同权）。server requireRole 与前端共用单一源。
export const SECRETARY_AND_DEPUTY_ROLES = ['secretary', 'deputy-secretary'];
export const PARTY_STAFF_ROLE = ['party-staff']; // 党委组织员（组织级，不属于支部）
export const COMMITTEE_IDS = ['p10', 'p11', 'p12', 'p13', 'p14']; // 演示支部支委名单（与 mock people 对齐）

// ── 组织委员职能位（单一源，2026-09-14）────────────────────────────
// 「组织委员」专属写链（名册档案维护/名册新增/成员流入登记等）的角色判定单一源。
// 原散见 server/routes/member.js 的 new Set(['org-commissioner'])——本次收敛至此，勿在各路由/服务手写第二份。
export const ORG_COMMISSIONER_ROLES = ['org-commissioner'];

// ── 成员流入/流出登记角色集（单一源，2026-09-14 支书裁定）────────────
// 登记（成员流动台账 + 成员建档/建号/流出停用）权限 = 组织委员 + 支书/副支书。
// 由既有角色集派生（勿另写角色名单数组——roles-sync 守卫拦「5 支委授权列表」副本）。
// 消费方：server/routes/resources.js 写门（memberFlows）与前端 services/member-flow.js::canRegisterFlow 同源。
export const MEMBER_FLOW_ROLES = [...SECRETARY_AND_DEPUTY_ROLES, ...ORG_COMMISSIONER_ROLES];

// ── 名单检索条出现门槛（单一源，2026-09-13 支书裁定）──────────────────
// 语义：第一列是人/活动的表格，**当前视图行数 > 本阈值**才渲染「关键词 + 分面 chips」检索条；
//   行数不足不渲染（3~7 行的小表加搜索框即过拟合——支书明确判据）。
// 消费点：components/list-filter.js（人员表与活动表共用同一引擎）；勿在业务层另写字面量。
export const SEARCH_FILTER_MIN_ROWS = 8;

// ── 党员发展阶段序（单一源，2026-09-13 收敛）───────────────────────
// 发展流程正向序（积极分子 → 发展对象 → 预备党员 → 正式党员）。
// 原 entries/tabs/org/talent-tab.js 与 entries/tabs/org/development-tab.js 各自手写 STAGE_ORDER 副本
// （两份，取值同、顺序同，属"同一口径两处维护"）——本项目统一收敛至此，消费点改 import。
// 注：与 policy-defaults.attendance.roster.partyStages（应到口径 = ['正式党员','预备党员']）
//   语义不同，勿混用——后者是"计应到"的党员子集，本常量是完整发展流程序。
export const DEVELOP_STAGES = ['积极分子', '发展对象', '预备党员', '正式党员'];

// ── 在册状态枚举（单一源，2026-09-13 收敛 Q-21-3）───────────────────
// 语义：组织关系在本支部、人是否在校（成员档案 residenceStatus；缺省=在校）。
// 原 services/roster.js 与 services/org-base-data-preview.js 各写一份同值字面量
// （roster 的语义主场在 roster，而 preview 不能 import roster——person.js → preview 是单向依赖，
//   preview 反向 import 即成环），属「同一口径两处维护」。本项目统一收敛至本文件（无任何 import 的
//   叶子模块，双端可载），roster / preview 与全部消费点一律 import 本文件，防循环依赖问题自然消解。
export const RESIDENCE = {
  CAMPUS: '在校',
  DETAINED: '滞留',
};

// ── 核心组 tab 判定（单一源，2026-09-14 支书裁定·tab 全盘重设）────────
// 语义：核心组（今天/待办/工作概况，支书 2026-08-10 裁定全员必有）固定显示、不可隐藏、不参与排序。
// 原实现以**显示标签**反推核心组（判据写死为「groupLabel 内容为『工作台』」），后果有二：
//   ① 党委台只能把自己的核心组改名为「首页」，再靠整台豁免绕开判定——一物两名；
//   ② 任何改标签文案的动作都会悄悄改动**权限语义**（哪些 tab 可被支部配置隐藏）。
// 现改为**注册表显式声明**：tab 对象上写 `coreTab: true`（见各台 capabilities/*-workspace.js），
// 显示标签只负责显示。判定函数唯一源在本文件，services/branch.js 与 services/preferences.js 共用。
export function isCoreTab(tab) {
  return !!(tab && tab.coreTab === true);
}

// ── 通知发布/管理角色（2026-09-13 dogfood 权限专项：前后端「单一源」，勿各自手写）──
// 发布 = 支委层中除纪检（纪检为会议纪律通报场景，只需管理位）；管理（编辑/删除）= 支委层全体。
// 由 BRANCH_COMMISSION_ROLES 派生（勿再手写角色名单——roles-sync 守卫「5 支委授权列表只允许出现在授权集」会拦）。
// 消费方：前端 services/notice.js::NoticePermission、server routes/resources.js 资源写门（notices）。
export const NOTICE_PUBLISH_ROLES = BRANCH_COMMISSION_ROLES.filter((r) => r !== 'disc-commissioner');
export const NOTICE_MANAGE_ROLES = [...BRANCH_COMMISSION_ROLES];

// ── 表决计票方式 ballotMode（2026-09-12 支书裁定「正式表决无记名 + 匿名模式可选」）──
// 单一源：server（routes/resources.js 写侧校验、routes/committee.js 落库）与前端（vote-config 转出）共用本文件，
//   mock 形态（core/mock-adapter.js）同源——三形态口径由本文件锁定，勿各自手写。
// 制度依据（只读引用，勿改 content/）：《中国共产党发展党员工作细则（2026年）》「与会党员…采取无记名投票方式表决」
//   （content/02_institution/sop/sop/…细则.md:103）、DEVELOPMENT_PATH.md:196、组织委员工作流程指南.md:209。
/** 计票方式取值：named 记名（逐人选项可见）/ anonymous 无记名（只留参与记录 + 汇总计数） */
export const BALLOT_MODES = ['named', 'anonymous'];
export const BALLOT_MODE_LABELS = { named: '记名', anonymous: '无记名' };
// 制度强制无记名的正式表决：optionSet 'formal'（支部党员大会正式表决——发展党员/转正等）。
// 该场景下 ballotMode 强制锁定 anonymous，发起时 UI 不可改、服务端拒绝显式 named（400）。
export const ANONYMOUS_FORCED_OPTION_SETS = ['formal'];
export function isAnonymousForced(optionSet) { return ANONYMOUS_FORCED_OPTION_SETS.includes(optionSet); }
/** 场景默认计票方式：正式表决无记名；事务性表决（deliberative）记名（可由发起人改选无记名） */
export function defaultBallotMode(optionSet) { return isAnonymousForced(optionSet) ? 'anonymous' : 'named'; }
/**
 * 活动有效计票方式（读取侧单一源）：强制场景一律 anonymous（即便历史数据未写/写错）；
 * 其余读 voteConfig.ballotMode，缺失或非法回落场景默认。旧活动（无 voteConfig）→ named（现状行为不变）。
 */
export function ballotModeOfActivity(activity) {
  const os = activity?.voteConfig?.optionSet;
  if (isAnonymousForced(os)) return 'anonymous';
  const m = activity?.voteConfig?.ballotMode;
  return BALLOT_MODES.includes(m) ? m : defaultBallotMode(os);
}
export function isAnonymousActivity(activity) { return ballotModeOfActivity(activity) === 'anonymous'; }

export const ROLE_LABELS = {
  'secretary':         '支书',
  'deputy-secretary':  '副支书',
  'org-commissioner':  '组织委员',
  'prop-commissioner': '宣传委员',
  'disc-commissioner': '纪检委员',
  'commissioner':      '条条委员',
  'leader':            '党小组组长',
  'organizer':         '组织者',
  'deep':              '深度参与者',
  'participant':       '普通参与者',
  'party-staff':       '党委组织员',
  'initiator':         '发起人',
  'all':               '全体相关',
};

// ── 角色到页面映射（T-2026-09-011 R2 单一源化：原居 services/auth.js，提升至此纯净层供 auth/capabilities 双端共享）
// organizer/deep 无独立 workspace 页面（T-141 角色单页制重构后归入工作台）；header view-switcher 仅展示有独立页面的身份
export const ROLE_PAGE_MAP = {
  workspace: {
    'secretary':         'secretary.html',
    'deputy-secretary':  'secretary.html',
    'org-commissioner':  'org.html',
    'prop-commissioner': 'prop.html',
    'disc-commissioner': 'disc.html',
    'leader':            'leader.html',
    'participant':       'visitor.html',
    // P1 党委后台（2026-09-02）：党委组织员 → 党委工作台（监控全院各支部，登录直达）
    'party-staff':       'party-committee.html',
  },
};

// ── 归档兜底页面放行门（A② 2026-09-10 支书裁定：代归档闭环）──────────────
// 依据 SYSTEM_ROLE_PERMISSION.md §9b 矩阵：支书/副支书持 archive=Y（归档兜底权限）。
// ROLE_PAGE_MAP 中宣传台（prop.html）默认仅宣传委员可达；为打通支书/副支书「代归档」闭环，
// 额外放行二者进入宣传台——但仅限归档兜底面：宣传台壳（modules/capabilities/prop-workspace.js
// 的 tabs）对二者只呈现「档案归档」tab，不呈现/不启用其它 tab（不扩大任何写权限）。
// 消费点单一源：core/bootstrap.js 身份门（放行页面）+ entries/tabs/secretary/todo-tab.js
// 代归档入口（_canOpenPropWorkspace）同源判定，勿各自手写角色清单。
export const ARCHIVE_FALLBACK_ROLES = ['secretary', 'deputy-secretary'];
const ARCHIVE_FALLBACK_PAGE = 'prop.html';
/** 该角色是否可经归档兜底进入指定页面（当前仅 prop.html） */
export function isArchiveFallbackPage(role, page) {
  const norm = (p) => (p || '').replace(/\.html$/, '');
  return ARCHIVE_FALLBACK_ROLES.includes(role) && norm(page) === norm(ARCHIVE_FALLBACK_PAGE);
}

/** 反查：哪些角色进入该页面（capability requiredRoles 单一源，消除各工作台字面量副本） */
export function rolesForPage(page) {
  const out = [];
  for (const map of Object.values(ROLE_PAGE_MAP)) {
    for (const [role, p] of Object.entries(map)) {
      if (p === page) out.push(role);
    }
  }
  return out;
}

// 条条委员集合（业务语义：三委员，不含支书/副支书）——与 auth.js 的 COMMISSIONER_ROLES（授权语义：含支书/副支书）
// 语义不同、键集不同，T-304 Q3 已注明区分，勿混用。消费方：inspector.js 执行人/监督人「是否委员」判定。
export const COMMISSIONER_ROLES = new Set([
  'commissioner', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]);

// inspector 角色横幅主题类契约（消费方：inspector.js 管理视图横幅；CSS 类规则在各页样式按需定义）
// S7 补全三委员/participant/deputy-secretary：deputy 同支书（党建红），与 ROLE_COLORS/ACCENT_COLORS 键集对齐
export const ROLE_THEME_CLASS = {
  'deputy-secretary':  'role-theme-secretary',
  leader:              'role-theme-leader',
  commissioner:        'role-theme-commissioner',
  'org-commissioner':  'role-theme-org',
  'prop-commissioner': 'role-theme-prop',
  'disc-commissioner': 'role-theme-disc',
  organizer:           'role-theme-organizer',
  deep:                'role-theme-deep',
  participant:         'role-theme-participant',
  secretary:           'role-theme-secretary',
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
  'deputy-secretary':  { hex: '#B91C1C' },  // 党建红（同支书）
  leader:              { hex: '#22C55E' },  // 翠绿
  'org-commissioner':  { hex: '#0EA5E9' },  // 天蓝
  'prop-commissioner': { hex: '#2563EB' },  // 海蓝
  'disc-commissioner': { hex: '#C2410C' },  // 深橙
  commissioner:        { hex: '#C2410C' },  // 同纪检（遗留键）
  organizer:           { hex: '#7DD3FC' },  // 亮天蓝 = 语义色 #0369A1（sky-700）同色系提亮（sky-300），同源（S6）
  deep:                { hex: '#A78BFA' },  // 雾紫 = 语义色 #7C3AED（violet-600）同色系提亮（violet-400），同源（S6）
  participant:         { hex: '#A16207', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)' },  // 金（主题党日胶囊三件套：亮金底+深金字+亮金边框，2026-08-08 四审改，与主题活动色同源）
  all:                 { hex: '#0E7490' },  // 深青
  purple:              { hex: '#7C3AED' },  // 紫罗兰 = deep 语义色本身；色板专用别名键（非角色键，S8），供主题色选色板取用
};

// ── 主题色个性化（支书指令 2026-08-06：侧边栏设置，所有角色均可选）──
// 语义色（ROLE_COLORS：日历任务色点/考察等级/参与者标识/活动类别色）全站固定，不受此设置影响；
// 强调色（ACCENT_COLORS：按钮/标签/卡片强调）可通过侧边栏「主题色」选择器个性化。

/**
 * 侧边栏「主题色」选色板的可选色（支书指令 2026-08-06：颜色就是颜色，不与人挂钩）
 * 按色相规律排列，2 行 × 5 个；key = 色板键（映射 ACCENT_COLORS 取衍生色），label = 颜色名
 * S8 键集对齐：色板键集 ⊂ ACCENT_COLORS——deputy-secretary（同支书红）、commissioner（遗留键）
 * 不入色板；participant 金为专用胶囊三件套；purple 为 deep 语义色别名（紫罗兰）。色板键若
 * 被 resolveAccentRole 读取后写入 ACCENT_COLORS，须保证二者键集一致。
 */
export const ACCENT_PALETTE = [
  { key: 'secretary',          hex: ACCENT_COLORS.secretary.hex,            label: '红' },
  { key: 'disc-commissioner',  hex: ACCENT_COLORS['disc-commissioner'].hex, label: '橙' },
  { key: 'participant',        hex: '#FFD700',            label: '金' },
  { key: 'leader',             hex: ACCENT_COLORS.leader.hex,               label: '绿' },
  { key: 'all',                hex: ACCENT_COLORS.all.hex,                  label: '青' },
  { key: 'org-commissioner',   hex: ACCENT_COLORS['org-commissioner'].hex,  label: '天蓝' },
  { key: 'prop-commissioner',  hex: ACCENT_COLORS['prop-commissioner'].hex, label: '海蓝' },
  { key: 'purple',             hex: ACCENT_COLORS.purple.hex,               label: '紫' },
  { key: 'deep',               hex: ACCENT_COLORS.deep.hex,                 label: '雾紫' },
  { key: 'organizer',          hex: ACCENT_COLORS.organizer.hex,            label: '亮蓝' },
];

/**
 * 解析当前生效的强调色角色键（主题色个性化覆盖）
 * 优先读取 localStorage workflowos_accent_role（侧边栏「主题色」写入），
 * 未设置或键无效时回退到传入的 preferredRole。
 * @param {string} preferredRole — 页面默认角色键
 * @returns {string} 生效的角色键
 */
export function resolveAccentRole(preferredRole) {
  const stored = localStorage.getItem('workflowos_accent_role');
  if (stored && ACCENT_COLORS[stored]) return stored;
  return preferredRole;
}

/**
 * 获取角色的 accent 三件套
 * @param {string} role — 角色键名
 * @param {number} [bgAlpha=0.1] — 背景色透明度（entry 自带 bg 覆盖时忽略）
 * @param {number} [borderAlpha=0.3] — 边框色透明度（entry 自带 border 覆盖时忽略）
 * @returns {{ accent: string, accentRgba: string, accentBorder: string }}
 */
export function getAccentColors(role, bgAlpha = 0.1, borderAlpha = 0.3) {
  const entry = ACCENT_COLORS[role] || ACCENT_COLORS.all;
  return {
    accent: entry.hex,
    // 覆盖字段优先：participant「金」主题色 = 主题党日胶囊（亮金底 + 深金字 + 亮金边框，
    // 支书 2026-08-08 四审定稿——金色就该和主题党日胶囊一致）
    accentRgba: entry.bg || hexToRgba(entry.hex, bgAlpha),
    accentBorder: entry.border || hexToRgba(entry.hex, borderAlpha),
  };
}

// ── 功能色「统一 tab 风格」规则（支书 2026-08-11 二审裁定 + 四审纠正）────────────────
// 支书：亮色和暗色的处理逻辑我不太理解——因为金色和亮蓝我认为都很亮。
// 二审：统一都变成 tab 风格的「浅底深字」；浅色才应该浅底深字，之前想反了。
// 三审（深色模式反馈）：夜间「提亮字」在深色页面上看不清——淡底深字应像 span 状态徽章
// （bg-cyan-100+text-cyan-700）一样保持「淡底 + 深字」，否则看不见。
// 四审（2026-08-11 深夜反馈）：「近不透明淡底 + 边框」视觉臃肿——夜间改「完全不透明浅底深字」
// （span 徽章风格，无边框）；header 身份显示例外：主题色实底 + 白字（见 header.js _roleLabelHTML）。
// 即：所有 accent（不分深浅）一律「同色系高亮浅底 + 深色字」；夜间 = 完全不透明浅底 + 同款深字。
// 与 tab 激活态（wp-dim-on）同源：浅底 + accent 色字；深字由 accent 亮度自适应——
//   · 深色 accent（感知亮度 < 0.25，如金/红/橙/海蓝/深青/紫）：深字 = accent 本身（已够深）
//   · 浅色 accent（感知亮度 ≥ 0.25，如天蓝/翠绿/亮蓝/灰）：深字 = accent 调暗至 30% 明度（保证可读对比度）
// 日/夜两套由元素内联 CSS 变量驱动：--acc-bg/--acc-text（日）+ --acc-bg-dark/--acc-text-dark（夜），
// 夜间切换由 styles.css `html.theme-dark [style*="--acc-bg-dark"]` 规则完成（!important 覆盖内联）。
// 背景：2026-08-08 支书裁定金色浅底深字；2026-08-10 曾改为实底白字；
// 2026-08-11 上午 T-218 二审为「深浅分流（深色浅底深字/浅色实底白字）」；
// 2026-08-11 下午支书再判「想反了——浅色才应该浅底深字」→ 统一浅底深字，废除实底白字分支；
// 2026-08-11 三审「夜间提亮字看不清」→ 夜间近不透明淡底+边框；四审「边框臃肿」→ 去掉边框，改完全不透明浅底。

// 品牌亮色映射：金色日/夜淡底统一用亮金底 #FFD700（主题党日胶囊同源，支书 2026-08-08 四审定稿）
const DEEP_ACCENT_RULES = {
  '#A16207': { light: '#FFD700' },
};

/** hex → [h, s, l]（h:0-360, s:0-1, l:0-1） */
function _hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

/** [h, s, l] → hex（#RRGGBB） */
function _hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/** 感知亮度（WCAG relative luminance 近似），用于「深浅」判定 */
function _relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** 感知亮度对外出口（header 身份标签等需按 accent 明暗分流白字对比的消费点复用，勿各自手写） */
export const relativeLuminance = _relativeLuminance;

/** 调亮：HSL 明度提到 targetL（0-100，饱和度不变） */
function _lighten(hex, targetL) {
  const [h, s] = _hexToHsl(hex);
  return _hslToHex(h, s, targetL / 100);
}

/** 调暗：HSL 明度压到 targetL（0-100，饱和度不变） */
function _darken(hex, targetL) {
  const [h, s] = _hexToHsl(hex);
  return _hslToHex(h, s, targetL / 100);
}

/** hex → rgba(…, alpha) */
function _rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 功能色「统一 tab 风格」规则（支书 2026-08-11 二审裁定 + 四审纠正）
 * 所有 accent（不分深浅）一律「同色系高亮浅底 + 深色字」；夜间改为「完全不透明浅底深字」——
 * span 状态徽章风格（如 bg-cyan-100+text-cyan-700），深色页面清晰可见、无边框不臃肿
 * （支书：「淡底深字应该变成 span 类似这样的淡底深字」；「你的做法让视觉非常臃肿」→ 去边框）：
 *   · 底（日）：accent 调亮至 84% 明度 @12% 透明（tab 风格浅底）
 *   · 字（日/夜一致）：深色 accent 用 accent 本身；浅色 accent 调暗至 30% 明度（保证可读）
 *   · 底（夜）：accent 调亮至 86% 明度完全不透明（span 徽章实底，叠深背景仍为淡底 chip）
 * 日/夜两套内联 --acc-bg/--acc-text（日）+ --acc-bg-dark/--acc-text-dark（夜），
 * 夜间切换由 styles.css `html.theme-dark [style*="--acc-bg-dark"]` 规则完成（!important 覆盖内联）。
 * @param {string} accent — 当前生效强调色 hex
 * @returns {string} 内联样式串（background / color，含深浅两套变量）
 */
export function solidAccentStyle(accent, border) {
  // 兜底：bootstrap 首帧渲染时 accent 可能为 undefined（瞬态，随后 setState 重渲染），
  // 此时返回党建红实底白字（系统默认色），避免 _relativeLuminance 对非 hex 输入崩溃。
  if (!accent || typeof accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return 'background:#B91C1C;color:#fff';
  }
  const branded = DEEP_ACCENT_RULES[accent];
  // 深字（日/夜一致）：深色 accent（感知亮度 < 0.25）用本身；浅色 accent 调暗至 30% 明度（淡底可读）
  const text = branded ? accent : (_relativeLuminance(accent) < 0.25 ? accent : _darken(accent, 30));
  // 夜间深字（R-9 ⑥ 2026-09-11 对比度收口）：夜间底色为不透明浅底，浅底上原深字对比仅 3.3–4.8，
  // 统一再压深一档（65% 原字 + 35% 黑）——浅底仍为同色系淡底深字，全 accent ≥ 4.5（实测 5.99–9.79）。
  const textDark = `color-mix(in srgb, ${text} 65%, #000)`;
  // 淡底（日）：accent 调亮至 84% 明度 @12% 透明
  const bg = _rgba(branded ? branded.light : _lighten(accent, 84), 0.12);
  // 淡底（夜）：accent 调亮至 86% 明度完全不透明——span 状态徽章风格（如 bg-cyan-100），叠深背景仍清晰可见
  const bgDark = branded ? branded.light : _lighten(accent, 86);
  return `--acc-bg:${bg};--acc-text:${text};--acc-bg-dark:${bgDark};--acc-text-dark:${textDark};background:var(--acc-bg);color:var(--acc-text,#fff)`;
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
  '主题党日':     { bg: '#FEFCE8', dot: '#FFD700', text: '#A16207', dotBorder: 'rgba(161, 98, 7, 0.35)' },
  '共建':         { bg: '#FEFCE8', dot: '#FFD700', text: '#A16207', dotBorder: 'rgba(161, 98, 7, 0.35)' },
  '参访':         { bg: '#FEFCE8', dot: '#FFD700', text: '#A16207', dotBorder: 'rgba(161, 98, 7, 0.35)' },
  '座谈':         { bg: '#FEFCE8', dot: '#FFD700', text: '#A16207', dotBorder: 'rgba(161, 98, 7, 0.35)' },
};

// ── 活动权威分类（2026-08-07 类型体系归一：两大顶层，非并列关系用层级表达）──
// 三会一课：固定子类（支部党员大会/支委会/党小组会/党课）。
// 组织生活会：是内容（批评与自我批评），不是三会子类——由三会之一召开（支书 2026-08-07 纠正），
// 不进查询子类 chips、不进写入表单，活动名称写"XX组织生活会"即可表达。
export const ACTIVITY_CLASSIFICATION = {
  'three-meetings': {
    label: '三会一课',
    color: '#CE1126',
    subtypes: ['支部党员大会', '支委会', '党小组会', '党课'],
  },
  'theme-party': {
    label: '主题党日',
    color: '#FFD700',
    carriers: ['理论学习', '实践参访', '交流座谈', '其他'], // 与写入表单 THEME_PARTY_DIMENSIONS.carriers 对齐
  },
};

const _THREE_MEETINGS_SUBTYPES = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes;

// ── 活动写入可选项目录（单一源 2026-09-03 P2b）──────────────────────
// 供 services/decision-tree.js（支书/组长写活动场景选择）与 entries/tabs/secretary/calendar-tab.js
//  WRITE_TEMPLATES 共用——id 顺序与中文名均派生自上方 ACTIVITY_CLASSIFICATION（subtypes 为权威中文名序列），
//  主题党日 id 与 SCENARIO_TO_CATEGORY 键对齐；消费端不再各自手写场景清单（一改具改）。
export const SCENARIO_WRITE_IDS = {
  'three-meetings': ['branch-party-meeting', 'branch-committee', 'party-group-meeting', 'party-lecture'],
  'theme-day': ['theme-party'],
};
export const SCENARIO_LABELS = {
  'branch-party-meeting': _THREE_MEETINGS_SUBTYPES[0],
  'branch-committee': _THREE_MEETINGS_SUBTYPES[1],
  'party-group-meeting': _THREE_MEETINGS_SUBTYPES[2],
  'party-lecture': _THREE_MEETINGS_SUBTYPES[3],
  'theme-party': ACTIVITY_CLASSIFICATION['theme-party'].label,
};

/** type → 大类（three-meetings | theme-party） */
export function classifyActivityType(type) {
  if (!type) return null;
  if (_THREE_MEETINGS_SUBTYPES.includes(type)) return 'three-meetings';
  if (type === '组织生活会') return 'three-meetings'; // 内容维度：以三会形式召开，大类仍属三会一课
  return 'theme-party'; // 主题党日 及未知类型兜底归主题党日系
}

// ════════════════════════════════════════════════════════════════
//  活动「已结束 / 已归档 / 未开始」判据（单一源，2026-09-13 收敛）
// ════════════════════════════════════════════════════════════════
//  立项依据（支书 2026-09-13）：「涉及第一列是活动的表格，也要思考！」
//  现状病灶（普查实测）：「已结束」判据 `status==='completed' || archived` 在全站至少 8 处各写一遍
//    （work-overview ×2 / archive-entry / dashboard-gallery / member-confirmation /
//     secretary-overview ×3 / server perf 测试），文案「已结束 / 已归档 / 待归档」四套不等价。
//
//  ⚠️ 与「活动生命周期展示态」的分工（**勿再造第二套生命周期词汇**）：
//    · 本节的 is* 函数 = **存储态谓词**（只读 status / archived 两个存储字段），供筛选、集合过滤、
//      统计口径使用——不依赖任务进度，纯函数、可在任意层调用。
//    · 活动生命周期 **展示态**（草稿/已发布/进行中/待归档/已执行/已归档/已取消）的唯一源
//      在 components/inspector.js：`ACTIVITY_LIFECYCLE` + `deriveActivityLifecycleStatus(activity, allTasks)`
//      + `activityLifecycleBadgeHtml(...)`（执行态由任务进度派生，见 DATA_MODEL.md §2.1 与
//      DATA_CONSISTENCY_CHECKLIST「活动生命周期展示态」条）。徽章/文案一律用那一套，
//      **不要**在别处另写一套中文标签（本节曾短暂加过 ACTIVITY_LIFECYCLE_LABELS，属重复源，已撤除）。

/** 活动是否已结束（单一源）：status==='completed' 或 archived 标记 */
export function isActivityEnded(activity) {
  const a = activity || {};
  return a.archived === true || a.status === 'completed';
}

/** 活动是否已归档（单一源，仅看 archived 软删标记）——「排除已归档」场景勿再用 isActivityEnded */
export function isActivityArchived(activity) {
  return (activity || {}).archived === true;
}

/** 活动是否仍在办（未归档且未取消）——「当前活动清单」的通用过滤判据（全站 5 处手写 `!archived && status!=='cancelled'` 收敛至此） */
export function isActivityLive(activity) {
  const a = activity || {};
  return a.archived !== true && a.status !== 'cancelled';
}

/** 活动是否未开始（单一源）：未结束，且无日期或不早于今天（member-confirmation 既有裁定字面一致） */
export function isActivityNotStarted(activity) {
  const a = activity || {};
  if (isActivityEnded(a)) return false;
  if (!a.date) return true;
  return String(a.date) >= new Date().toISOString().slice(0, 10);
}

// ════════════════════════════════════════════════════════════════
//  活动类型取值规范化（单一源，2026-09-13 收敛）
// ════════════════════════════════════════════════════════════════
//  现状病灶（「第一列是活动的表格」专项普查）：写入侧 3 套不等价取值来源——
//   ① 支书台写入子类中文名（'支部党员大会'）；
//   ② 组长台写入 '${大类}·${子类}'（'三会一课·支部党员大会'）；
//   ③ 种子为纯子类中文名。
//  读取侧类型筛选三套口径：级联大类+子类 chips / 单一 type 下拉 / 数据动态生成。
//  收敛口径：**权威取值 = 子类中文名**（ACTIVITY_CLASSIFICATION 的 subtypes 为权威序列）；
//  任何历史写法经 normalizeActivityType() 归一后才进筛选与展示。

/** 活动类型权威取值集（子类中文名）：三会一课 4 子类 + 主题党日 + 组织生活会（内容维度） */
export const ACTIVITY_SUBTYPES = Object.freeze([
  ..._THREE_MEETINGS_SUBTYPES, ACTIVITY_CLASSIFICATION['theme-party'].label, '组织生活会',
]);

/**
 * 活动类型归一（唯一实现）：'大类·子类' → 子类；已是权威子类 → 原样；其余原样返回（不造新枚举）
 * @param {string} type
 * @returns {string}
 */
export function normalizeActivityType(type) {
  const t = String(type || '').trim();
  if (!t) return '';
  if (t.includes('·')) return t.split('·').pop().trim();
  if (t === ACTIVITY_CLASSIFICATION['three-meetings'].label) return t; // '三会一课' 大类名保留（无单一子类）
  return t;
}

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
      entry.bg = `linear-gradient(135deg, ${entry.bg}, ${_shadeDarker(entry.bg)})`;
    }
    if (withLabel) {
      entry.label = key;
    }
    result[key] = entry;
  }
  return result;
}

/** 将 #FEF2F2 这种浅色再加深一档，用于渐变终点（RGB 各通道 -16，与 HSL 版 _darken 区分） */
function _shadeDarker(hex) {
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

// ── 意见反馈「对外匿名（后台记真身）」防刷令牌哈希（2026-09-12 裁定；2026-09-17 改裁更正措辞）──
// 客户端首次提交时生成随机 token（localStorage，不可由 personId 推导）；服务端仅存其哈希，
// 只用于判重与频率限制。输入 = 随机 token 本身（不含 personId、不使用任何 salt/固定盐），
// 故不可由 personId 推导、不可反查提交人——与「后台记真实提交人 `_realPersonId`」**互不影响**：
// 防刷判重仍只认 tokenHash；真身另行落库，仅党委在必要时可查、每次查看留痕。
// 纯同步函数、node/browser 同源：server/routes/resources.js 与前端 services/issues.js 共用，
// 防止两端算法未同步的情况（FNV-1a 双通道 → 16 hex，随机 128bit token 的判重/限频抗碰撞足够）。
export function hashSubmitterToken(token) {
  const s = String(token == null ? '' : token);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return 'th_' + hex(h1) + hex(h2);
}

// ── 活动产出块目录（块画布 v0，2026-09-03 支书裁定：活动产出记录=块；支部级 config.blocks 启停/排序）──
// 消费点：活动详情「添加记录」按钮组（leader write-tab 等）；UI：党委工作台「支部配置」产出块区
export const OUTPUT_BLOCK_DEFS = [
  { id: 'attendance', label: '考勤', desc: '出勤记录（同步正式考勤库）' },
  { id: 'inspection', label: '考察', desc: '考察记录（同步正式考察库）' },
  { id: 'publicity', label: '宣传', desc: '宣传记录（标题/渠道）' },
  { id: 'materials', label: '材料', desc: '材料归档记录' },
];

// ── 通知受众 sentinel（单一源，2026-09-13 Q-22-1）──────────────────
// 发布侧写入值 ↔ 消费端可见性判定必须同源：原「发布侧写 sentinel / 消费端比角色键」
// 口径分裂导致 `['all']` 永不命中 → 「全体党员」实际无人可见（见 REVIEW_QUEUE Q-22-1）。
// broadcast=true → 全员可见（含无登录会话）；roles/developStages → 命中其一即可见。
export const NOTICE_AUDIENCE_SENTINELS = {
  all: { label: '全体党员', broadcast: true },
  leaders: { label: '党小组组长', roles: ['leader'] },
  activists: { label: '入党积极分子', developStages: ['积极分子'] },
  candidates: { label: '发展对象', developStages: ['发展对象'] },
};
/** 发布表单受众选项（保持声明序；发布侧勿再手写 sentinel 列表） */
export const NOTICE_AUDIENCE_OPTIONS = Object.entries(NOTICE_AUDIENCE_SENTINELS)
  .map(([value, d]) => ({ value, label: d.label }));