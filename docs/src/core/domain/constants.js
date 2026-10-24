// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  constants.js — 纯静态常量（角色颜色 / 活动类别颜色 / 标签）
// ════════════════════════════════════════════════════════════════
// R-26③（2026-10-05 批次 388）：本件**只引一个零依赖叶子** `core/base/date.js`（取本地「今天」）——
//   不成环、双端可载；**不得**引 `core/base/utils.js`（那会牵 `core/session/pending-writes.js`）。

import { todayLocal } from '../base/date.js?v=20261024b';

// ════════════════════════════════════════════════════════════════
//  缺省支部 id（单一源，R2-17，2026-10-20）
// ════════════════════════════════════════════════════════════════
//  原 5 个同名常量和多处内联 `|| 'br-b1'` 散落在服务层/页面里，换默认支部或多支部部署要逐处改，
//  漏一处就产生跨支部归属。服务层的「缺失回落」统一引用本常量；
//  ⚠ `branchId: null` 是**显式无支部**（IAAA 待归属），不得用本常量兜底（见 profile-access.js）。
export const DEFAULT_BRANCH_ID = 'br-b1';

/** 缺失（undefined / ''）时回落缺省支部；null 原样保留（显式无支部语义） */
export function resolveBranchId(value) {
  return value === undefined || value === '' ? DEFAULT_BRANCH_ID : value;
}

// ── 深色三件套（固定语义色历史辅助）────────────────────────────────
// 按「同色系提亮一档」为每个颜色条目补 bgDark/textDark/borderDark（映射来自 _TEXT_DARK_MAP）。
// 批次 507 起：固定语义标签统一走 styles.css `[data-tone]` 表；本表仅保留 `textDark`
// 供实色圆点（--acc-dot-dark）提亮复用，不再由模板写 --acc-bg/text/border-dark。
// _C ＝ 本文件**唯一硬编码色值源**（DESIGN_SYSTEM §2.8）：其余颜色一律引用此处、不再写裸 hex；表项名＝语义名/色阶名。
// ⚠ 大小写即语义：amber600 / blue500 / emerald500 写小写（沿用 _TEXT_DARK_MAP 原有键的字符形态）——accDarkParts 按串精确查表、不做归一化，改大写即查不到而回落 slate300。
const _C = {
  black: '#000', sky700: '#0369A1', emerald700: '#047857', emerald600: '#059669', cyan700: '#0E7490',
  sky500: '#0EA5E9', emerald500: '#10b981', green600: '#16A34A', blue700: '#1D4ED8', green500: '#22C55E',
  cyan400: '#22D3EE', blue600: '#2563EB', emerald400: '#34D399', sky400: '#38BDF8', blue500: '#3b82f6',
  green400: '#4ADE80', gray600: '#4B5563', indigo600: '#4F46E5', blue400: '#60A5FA', gray500: '#6B7280',
  violet600: '#7C3AED', sky300: '#7DD3FC', amber800: '#92400E', slate400: '#94A3B8', red800: '#991B1B',
  redBrandDeep: '#9B0000', yellow700: '#A16207', indigo300: '#A5B4FC', violet400: '#A78BFA', partyRed: '#B91C1C',
  orange700: '#C2410C', violet300: '#C4B5FD', slate300: '#CBD5E1', partyRedBrand: '#CE1126', amber600: '#d97706',
  red600: '#DC2626', red400: '#F87171', orange400: '#FB923C', amber400: '#FBBF24', red50: '#FEF2F2',
  yellow50: '#FEFCE8', partyGold: '#FFD700', white: '#fff',
};
/** 日间文字色 → 深色提亮色（键/值均取自 _C；键的字符形态原样保留，勿改大小写）——本表汇总 d8 组件内联标签 / d10 表态组件与状态图标 / S6 强调色提亮（亮色保持自身，violet-400→violet-300）三批补充。 */
const _TEXT_DARK_MAP = {
  [_C.red800]: _C.red400, [_C.yellow700]: _C.amber400, [_C.gray600]: _C.slate400, [_C.partyRed]: _C.red400, [_C.orange700]: _C.orange400,
  [_C.sky700]: _C.sky400, [_C.violet600]: _C.violet400, [_C.gray500]: _C.slate400, [_C.cyan700]: _C.cyan400, [_C.indigo600]: _C.indigo300,
  [_C.green500]: _C.green400, [_C.sky500]: _C.sky400, [_C.blue600]: _C.blue400, [_C.blue700]: _C.blue400, [_C.emerald700]: _C.emerald400,
  [_C.amber800]: _C.amber400, [_C.amber600]: _C.amber400, [_C.blue500]: _C.blue400, [_C.emerald500]: _C.emerald400, [_C.redBrandDeep]: _C.red400, [_C.partyRedBrand]: _C.red400,
  [_C.green600]: _C.green400, [_C.emerald600]: _C.emerald400, [_C.red600]: _C.red400, [_C.sky300]: _C.sky300, [_C.violet400]: _C.violet300,
};
function _hexToRgbStr(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}
function _applyDark(map) {
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const d = _TEXT_DARK_MAP[v.text] || _C.slate300;
    out[k] = { ...v, bgDark: `rgba(${_hexToRgbStr(d)}, 0.16)`, textDark: d, borderDark: `rgba(${_hexToRgbStr(d)}, 0.35)` };
  }
  return out;
}

/**
 * 为颜色对象映射表补深色三件套（bgDark/textDark/borderDark）——现行仅 `textDark` 供实色圆点提亮复用。
 * @param {Object<string,{bg:string,text:string,border:string}>} map
 * @returns 深色三件套增强版映射表
 */
export function applyDark(map) {
  return _applyDark(map);
}

/**
 * accent hex → 深色三件套分量（供模板按需取用 bg/text/border）。
 * @param {string} hex — 日间文字色
 * @returns {{ bg:string, text:string, border:string }}
 */
export function accDarkParts(hex) {
  const d = _TEXT_DARK_MAP[hex] || _C.slate300;
  return {
    bg: `rgba(${_hexToRgbStr(d)}, 0.16)`,
    text: d,
    border: `rgba(${_hexToRgbStr(d)}, 0.35)`,
  };
}

/**
 * 内联实色圆点深色提亮（d9）：深色系 hex → 同色系提亮色；本身已亮的色（500 色阶等）保持原色，深色下无需提亮。
 * 配合 styles.css `html.theme-dark [style*="--acc-dot-dark"]` 覆盖规则。
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
  'deputy-secretary':  { bg: 'rgba(185, 28, 28, 0.10)',   text: _C.partyRed,  border: 'rgba(185, 28, 28, 0.30)' },  // 党建红（同支书）
  leader:              { bg: 'rgba(34, 197, 94, 0.15)',  text: _C.green500,  border: 'rgba(34, 197, 94, 0.40)' },  // 翠绿#22C55E
  commissioner:        { bg: 'rgba(194, 65, 12, 0.15)',  text: _C.orange700,  border: 'rgba(194, 65, 12, 0.30)' },  // 同纪检#C2410C
  'org-commissioner':  { bg: 'rgba(14, 165, 233, 0.10)',  text: _C.sky500,  border: 'rgba(14, 165, 233, 0.30)' },  // 天蓝#0EA5E9
  'prop-commissioner': { bg: 'rgba(37, 99, 235, 0.10)',   text: _C.blue600,  border: 'rgba(37, 99, 235, 0.30)' },  // 海蓝#2563EB
  'disc-commissioner': { bg: 'rgba(194, 65, 12, 0.10)',   text: _C.orange700,  border: 'rgba(194, 65, 12, 0.30)' },  // 深橙#C2410C
  organizer:           { bg: 'rgba(14, 165, 233, 0.10)', text: _C.sky700,  border: 'rgba(14, 165, 233, 0.30)' },  // 天蓝#0369A1（sky-700，角色色系冷色）
  deep:                { bg: 'rgba(124, 58, 237, 0.10)', text: _C.violet600,  border: 'rgba(124, 58, 237, 0.30)' },  // 紫罗兰#7C3AED（violet-600，与组织者区分）
  participant:         { bg: 'rgba(107, 114, 128, 0.10)', text: _C.gray500, border: 'rgba(107, 114, 128, 0.30)' },  // 中性灰（默认身份，红不再充当参与者角色色，2026-08-01 修正）
  initiator:           { bg: 'rgba(79, 70, 229, 0.10)', text: _C.indigo600,  border: 'rgba(79, 70, 229, 0.30)' },  // 靛蓝#4F46E5（indigo-600，发起人）
  all:                 { bg: 'rgba(14, 116, 144, 0.08)',  text: _C.cyan700,  border: 'rgba(14, 116, 144, 0.20)' },
  secretary:           { bg: 'rgba(185, 28, 28, 0.10)',   text: _C.partyRed,  border: 'rgba(185, 28, 28, 0.30)' },  // 党建红（不动）
});

// ── 活动类别颜色（两大类：三会一课=党建红 / 主题党日=党建金）──
// 支书 2026-07-31 指示：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度
// 2026-10-23 批次 505：**固定语义色，只消费本文件的品牌常量**（党建红 #CE1126 / 党徽金 #FFD700 /
//   金黄字 #A16207），**不读任何主题 token**——用户把主题从红切到蓝，三会一课徽章仍是党建红、
//   主题党日仍是亮金（spec SD-19）。只用于徽章 / 圆点 / 左条等小面积标记，不得整卡铺色。
const ACTIVITY_CAT_COLOR = _applyDark({
  // ── 三会一课系（党建红 #CE1126：text / bg / border 三件套统一到同一党建红，不再用 #991B1B 深红）──
  'branch-party-meeting': { bg: 'rgba(206, 17, 38, 0.08)',  text: _C.partyRedBrand, border: 'rgba(206, 17, 38, 0.25)' },  // 支部党员大会
  'branch-committee':      { bg: 'rgba(206, 17, 38, 0.08)',  text: _C.partyRedBrand, border: 'rgba(206, 17, 38, 0.25)' },  // 支委会
  'party-group-meeting':   { bg: 'rgba(206, 17, 38, 0.08)',  text: _C.partyRedBrand, border: 'rgba(206, 17, 38, 0.25)' },  // 党小组会
  'party-lecture':         { bg: 'rgba(206, 17, 38, 0.08)',  text: _C.partyRedBrand, border: 'rgba(206, 17, 38, 0.25)' },  // 党课
  // ── 主题党日系（党徽金 #FFD700，2026-08-01 支书要求"再亮一些"，原 #D4AF37 偏灰/脏）──
  'theme-party':           { bg: 'rgba(255, 215, 0, 0.12)', text: _C.yellow700, border: 'rgba(255, 215, 0, 0.35)' },  // 主题党日
  // ── 默认 ──
  'default':               { bg: 'rgba(107, 114, 128, 0.08)', text: _C.gray600, border: 'rgba(107, 114, 128, 0.25)' },
});

/** scenarioId → 活动类别键 映射 */
const SCENARIO_TO_CATEGORY = {
  'branch-party-meeting': 'branch-party-meeting',
  'branch-committee':     'branch-committee',
  'party-group-meeting':  'party-group-meeting',
  'party-lecture':        'party-lecture',
  // 组织生活会：会议内容（批评与自我批评），由党小组会等三会形式召开（支书 2026-08-01/2026-08-07 决策）
  //   ⚠ 2026-09-22 批次 143：不再单列场景键——组织生活会活动直接记**承接它的那个三会形式**的 scenarioId
  'theme-party':          'theme-party',
};

/**
 * 根据活动对象返回对应的颜色。优先级：scenarioId → domain → 默认灰色
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
  '组织生活会':           '三会一课', // 内容维度（形式归三会一课系）；2026-09-22 批次 143：由场景键改按活动类型键
  // ── 主题党日 ──
  'theme-party':          '主题党日',
  // ── 默认 ──
  'default':              '其他活动',
};

/**
 * 首页日历格子内2字缩写（格子宽度受限，完整标签显示不下）；支书 2026-07-31 指示：日历简称使用"党会""党课""党日"
 */
export const ACTIVITY_TYPE_SHORT = {
  // ── 三会一课 ──
  'branch-party-meeting': '党会',
  'branch-committee':     '党会',
  'party-group-meeting':  '党会',
  'party-lecture':        '党课',
  '组织生活会':           '党会', // 2026-09-22 批次 143：由场景键改按活动类型键
  // ── 主题党日 ──
  'theme-party':          '党日',
  // ── 默认 ──
  'default':              '活动',
};

// ── 角色键单一事实源（T-304 Q3 权限收敛，2026-08-29）──────────────
// 与内容层 SYSTEM_ROLE_PERMISSION.md §9a0 角色键全表对齐（2026-09-05 自 ROLE_CLASSIFICATION.md §九 迁出）；
// ROLE_LABELS / ROLE_COLORS / ACCENT_COLORS / 能力 requiredRoles 均以本枚举为基准核对。
// 常设角色（7）+ 项目角色（2）为业务角色；遗留键（2）无角色语义，仅保留兼容兜底。
export const ROLE_KEYS = [
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
  'leader', 'participant',
  // P1 党委后台（2026-09-02）：党委组织员/党务老师——组织级角色（院系党委），不属于任一支部
  'party-staff',
  'organizer', 'deep',
];
export const ROLE_LEGACY_KEYS = ['commissioner', 'initiator']; // 遗留键：无独立角色，保留兼容（2026-09-22 批次 143：撤「全体相关」——非角色、解析不到具体人）

// ── 授权语义角色集（2026-09-03 P2c 收敛：server 鉴权与前端 AuthStore 共用单一源，勿各自手写）──
// 注意与上方「条条委员 COMMISSIONER_ROLES（业务语义：三委员，不含支书/副支书）」区分——
// 授权语义含支书/副支书（写活动/发任务等全局授权门），是 server requireRole 与前端 isCommissioner 的依据。
// 名单与 SYSTEM_ROLE_PERMISSION.md §9a0 角色键全表一致；具体成员名单由 getCommitteeIds(users) 按角色派生，不再维护 id 快照。
export const BRANCH_COMMISSION_ROLES = [
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]; // 授权支委（含支书/副支书）
export const SECRETARY_ROLES = ['secretary']; // 支书专属（副支书/委员不越权）。2026-09-21 批次 126（D-550）：品牌认定、意见处置已移出本集 ⇒ 归支委会（支委层＝BRANCH_COMMISSION_ROLES）；本集现只判「仍专属支书」的前端按钮（消费点 components/record/inspector.js::isSecretary＝活动信息编辑等），服务端不再以本集为门
// 副书同权（2026-09-11 支书裁定）：支书侧写链（名册在册镜像/发展阶段/移出确认等）副支书同权，
// 与上一行的关系收口（2026-09-21 批次 126 · D-550）：品牌认定、意见处置已由「支书专属」移出、归支委会 ⇒ 落在支委层（BRANCH_COMMISSION_ROLES，本位副支书在内），两集之争到此为止；「仍专属支书」的清单见上一行。server requireRole 与前端共用单一源。
export const SECRETARY_AND_DEPUTY_ROLES = ['secretary', 'deputy-secretary'];
export const PARTY_STAFF_ROLE = ['party-staff']; // 党委组织员（组织级，不属于支部）

// ── 支委名单派生（数据生命周期 P1-09，2026-10-20）────────────────────
// 为什么删除 COMMITTEE_IDS 常量：支委改选 / 人员 id 迁移后，写死的旧 id 名单会把广播与
//   旧活动表决名单继续发给「上一届」；名单属工作流事实，必须随 users.role 现算。
// 顺序 = 支书 → 副支书 → 组织 → 宣传 → 纪检（与历史支委顺序同序，
//   使考勤种子、表决名单的下标语义保持稳定）。
// 无数据时返回空数组（调用方必须显式失败或显示 —，不得静默用假人）。
export function getCommitteeIds(people) {
  const rows = Array.isArray(people) ? people : [];
  const ids = [];
  for (const role of BRANCH_COMMISSION_ROLES) {
    for (const person of rows) {
      if (!person || !person.id) continue;
      if (String(person.id).startsWith('u_')) continue; // 系统账号不是成员档案
      if (person.role !== role) continue;
      const id = String(person.id);
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/**
 * 支委名单解析（带明确错误）：供写口在「无支委角色」时 fail-closed。
 * @param {Array<{id:string, role?:string}>} people
 * @returns {{ids:string[], error:string|null}}
 */
export function resolveCommitteeIds(people) {
  const ids = getCommitteeIds(people);
  if (ids.length > 0) return { ids, error: null };
  return {
    ids: [],
    error: '支委名单不可用：当前成员档案中没有 secretary / deputy-secretary / org-commissioner / prop-commissioner / disc-commissioner 角色的用户，请先维护成员角色',
  };
}

// ── 组织委员职能位（单一源，2026-09-14）────────────────────────────
// 「组织委员」专属写链（名册档案维护/名册新增/成员流入登记等）的角色判定单一源。
// 原散见 server/routes/member.js 的 new Set(['org-commissioner'])——本次收敛至此，勿在各路由/服务手写第二份。
export const ORG_COMMISSIONER_ROLES = ['org-commissioner'];

// ── 成员流入/流出登记角色集（单一源，2026-09-14 支书裁定）────────────
// 登记（成员流动台账 + 成员建档/建号/流出停用）权限 = 组织委员 + 支书/副支书。
// 由既有角色集派生（勿另写角色名单数组——roles-sync 守卫拦「5 支委授权列表」副本）。
// 消费方：server/routes/resources.js 写门（memberFlows）与前端 services/member/member-flow.js::canRegisterFlow 同源。
export const MEMBER_FLOW_ROLES = [...SECRETARY_AND_DEPUTY_ROLES, ...ORG_COMMISSIONER_ROLES];

// ── 考察写角色 / 确认角色（D01/D08 单一源，前端 services/activity/inspection.js 与 server gates.js 同读）──
// D08：写＝支委层（含组织委员，正式纳入「建档代录」；recordedBy 一律落操作人本人）。
// D01：确认/打回＝纪检委员 + 支书/副支书；**禁止自确认**（actorId === recordedBy 一律拒绝）——
//   白名单与自确认禁令在服务层与写门两侧都复算，不采信前端按钮是否渲染。
export const INSPECTION_WRITE_ROLES = [...BRANCH_COMMISSION_ROLES];
export const INSPECTION_CONFIRM_ROLES = ['disc-commissioner', ...SECRETARY_AND_DEPUTY_ROLES];

// ── 名单检索条出现门槛（单一源，2026-09-13 支书裁定）──────────────────
// 语义：第一列是人/活动的表格，**当前视图行数 > 本阈值**才渲染「关键词 + 分面 chips」检索条；
//   行数不足不渲染（3~7 行的小表加搜索框即过拟合——支书明确判据）。
// 消费点：components/ui/list-filter.js（人员表与活动表共用同一引擎）；勿在业务层另写字面量。
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
// 原 services/member/roster.js 与 services/branch/org-base-data-preview.js 各写一份同值字面量
// （roster 的语义主场在 roster，而 preview 不能 import roster——person.js → preview 是单向依赖，
//   preview 反向 import 即成环），属「同一口径两处维护」。本项目统一收敛至本文件（**只引一个零依赖叶子
//   `core/base/date.js`**、不成环，**双端可载**——见本文件头注 R-26③），roster / preview 与全部消费点
//   一律 import 本文件，防循环依赖问题自然消解。
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
// 显示标签只负责显示。判定函数唯一源在本文件，services/branch/branch.js 与 services/core/preferences.js 共用。
export function isCoreTab(tab) {
  return !!(tab && tab.coreTab === true);
}

// ── 通知发布/管理角色（2026-09-13 dogfood 权限专项：前后端「单一源」，勿各自手写）──
// 发布 = 支委层中除纪检（纪检为会议纪律通报场景，只需管理位）；管理（编辑/删除）= 支委层全体。
// 由 BRANCH_COMMISSION_ROLES 派生（勿再手写角色名单——roles-sync 守卫「5 支委授权列表只允许出现在授权集」会拦）。
// 消费方：前端 services/governance/notice.js::NoticePermission、server routes/resources.js 资源写门（notices）。
export const NOTICE_PUBLISH_ROLES = BRANCH_COMMISSION_ROLES.filter((r) => r !== 'disc-commissioner');
export const NOTICE_MANAGE_ROLES = [...BRANCH_COMMISSION_ROLES];

// ── 表决计票方式 ballotMode（2026-09-12 支书裁定「正式表决无记名 + 匿名模式可选」）──
// 单一源：server（routes/resources.js 写侧校验、routes/committee.js 落库）与前端（vote-config 转出）共用本文件，
//   mock 形态（data/mock-adapter.js）同源——三形态口径由本文件锁定，勿各自手写。
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

/** **项目角色**（可被赋的项目身份）——单一源：`organizer`（组织者）/ `deep`（深度参与者）。
 *  「项目」是**活动 ∪ 专班**的合称（支书 2026-09-30 原话：「请允许我纠正你：**活动与专班 我们都统称为
 *  项目**，而不是「活动项目」这么并提。**活动和专班是并列的**」）⇒ 写「项目角色」即同时涵盖两者，
 *  不得再写「活动项目」这类并提。写口＝`AuthStore.authorize(actor, personId, role, { projectId })`。 */
export const PROJECT_ROLES = ['organizer', 'deep'];

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

// ── 角色到页面映射（T-2026-09-011 R2 单一源化：原居 services/core/auth.js，提升至此纯净层供 auth/capabilities 双端共享）
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

// ── 归档兜底（D-807④ 2026-10-06 改准）────────────────────────────────────
// 原「支书/副支书经放行门进入宣传台、只呈现归档兜底面」的跨台形态已按支书令撤除——
// 「兜底在自己的工作台集成，不看别的角色工作台」。现行形态：支书台待办「宣传材料待归档」
// 组的「代归档」按钮**本台浮窗直执**（entries/tabs/secretary/todo-tab.js::_openDelegateArchiveModal，
// 判据与写口均与宣传台归档面同源）。§9b 矩阵的 archive=Y 兜底**权限**不变，变的只是承载面。

/**
 * **「待归属支部」判定**（2026-09-29 批次 277 —— IAAA 入站阻断层的**单一源**，勿在别处另写一份）。
 *
 * 支书 2026-09-29 原话：「如果没有这个人，那就要**自动创建这个人的号**，并且进入**选择支部**，
 * 然后由**支部**予以确认」⇒ 未归属支部者**不得进入任何工作台**（他此刻看不到任何支部内容）；
 * 放行条件＝支部确认（`users.branchId` 落定）。
 *
 * ⚠ 三条边界（防误伤）：
 *   ① 只在 `branchId` **显式为 `null`** 时成立——**缺字段 ＝ 未知**（旧会话 / 开发模式 / mock 形态）⇒ **不拦**；
 *   ② **组织级（党委组织员）排除**——党委**不属于任何支部**（见 `server/seed-baseline.js` 口径注释）；
 *   ③ 消费端只有两处：`core/boot/bootstrap.js`（工作台进门）与 `entries/pages/login-entry.js`（登录页落地）。
 *
 * @param {{branchId?: string|null, role?: string}|null|undefined} user 登录快照（`AuthStore.getCurrentUser()`）
 * @returns {boolean}
 */
export function isBranchPendingUser(user) {
  if (!user) return false;
  return user.branchId === null && !PARTY_STAFF_ROLE.includes(user.role);
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

// ── 主题色板（7 主题 × 亮/暗 × 9 显式 token）────────────────────
// 2026-10-23 批次 505（spec `redesign-theme-palette-and-density` Task 1/2）：
//   · 主题由 10 个削减为 7 个：金 / 红 / 橙 / 绿 / 青 / 蓝 / 紫；天蓝、雾紫、亮蓝退场（紫只留一个、蓝只留一个）。
//   · 每主题的每一部分都是**手选 hex**：浅底 / 边框 / 深字 / 实底 / 实底字 / hover / active 各自独立设计，
//     **不许**再用 `color-mix` / `rgba(主题色)` / `filter: brightness` 运行时派生——旧「一条公式十色共用」
//     把橙压成褐、绿压成灰绿、亮蓝压成钢蓝，是「灰度太高、太脏」的根因。
//   · 气质「沉稳但是鲜活」：softBg 低彩度（与白/深底 1.08–1.35）、softText 同色相压深、strongBg 中等彩度；
//     高饱和只允许出现在小面积语义标记与实底按钮。
//   · 验收（逐项实测见 DESIGN_SYSTEM.md §2.11）：softText vs softBg ≥4.5:1 且 ≤12:1；
//     strongInk vs strongBg ≥4.5:1；strongBg vs 卡片/页面底 ≥3:1；softBg vs 白/深底 1.08–1.35；
//     strongBg HSL 饱和度 ≤85%（固定语义色除外）。
//   · **固定语义色不入本表、不随主题切换**：党徽金 `#FFD700`、三会一课党建红 `#CE1126`、
//     主题党日亮金 + 金黄字 `#A16207` 仍走 `_C.partyGold` / `_C.partyRedBrand` / `_C.yellow700`；
//     主题金是另一档更沉稳的琥珀金，两者不要求同值（支书口径「党徽金 ≠ 主题金」）。
export const ACCENT_COLORS = {
  gold: {
    key: 'gold', label: '金',
    light: { base: '#A97A12', softBg: '#FBF3DC', softBorder: '#E8D5A3', softText: '#6E4E08', strongBg: '#9A6B0F', strongInk: '#FFFFFF', strongHover: '#91650D', hoverBg: '#F6EAC6', activeBg: '#F0DFAC' },
    dark:  { base: '#E0B24C', softBg: '#2F2717', softBorder: '#54441E', softText: '#E8C97A', strongBg: '#C89A34', strongInk: '#1E1503', strongHover: '#BD9231', hoverBg: '#38301C', activeBg: '#423821' },
  },
  red: {
    key: 'red', label: '红',
    light: { base: '#A32B24', softBg: '#FBEEEC', softBorder: '#EFC8C2', softText: '#7A201B', strongBg: '#9B2C22', strongInk: '#FFFFFF', strongHover: '#932920', hoverBg: '#F7E2DE', activeBg: '#F2D3CE' },
    dark:  { base: '#E0796F', softBg: '#372220', softBorder: '#5C332E', softText: '#F0B5AC', strongBg: '#D25A4E', strongInk: '#1C0A08', strongHover: '#CA564B', hoverBg: '#402925', activeBg: '#49302C' },
  },
  orange: {
    key: 'orange', label: '橙',
    light: { base: '#B45B33', softBg: '#FBF0E9', softBorder: '#EDCDB9', softText: '#7A3A16', strongBg: '#A9502A', strongInk: '#FFFFFF', strongHover: '#A04B27', hoverBg: '#F7E4D8', activeBg: '#F2D8C7' },
    dark:  { base: '#E39B6F', softBg: '#33241A', softBorder: '#573827', softText: '#EDBA96', strongBg: '#C1663B', strongInk: '#1E0F07', strongHover: '#BE643A', hoverBg: '#3C2B1F', activeBg: '#453225' },
  },
  green: {
    key: 'green', label: '绿',
    light: { base: '#2F6B4F', softBg: '#EDF5F0', softBorder: '#C4DCD0', softText: '#1F5238', strongBg: '#2B6449', strongInk: '#FFFFFF', strongHover: '#285F45', hoverBg: '#E3F0E9', activeBg: '#D8E9E0' },
    dark:  { base: '#7CC4A0', softBg: '#1A2C24', softBorder: '#2F4E3E', softText: '#9FD3B6', strongBg: '#4E9B76', strongInk: '#07130E', strongHover: '#49936F', hoverBg: '#21342B', activeBg: '#273C32' },
  },
  cyan: {
    key: 'cyan', label: '青',
    light: { base: '#0F6D7B', softBg: '#E9F4F6', softBorder: '#B9DCE2', softText: '#0B4F5A', strongBg: '#0C6371', strongInk: '#FFFFFF', strongHover: '#0B5E6B', hoverBg: '#DFEFF2', activeBg: '#D3E7EB' },
    dark:  { base: '#63B8C7', softBg: '#162A30', softBorder: '#254A52', softText: '#8FCBD6', strongBg: '#2A93A6', strongInk: '#04161A', strongHover: '#278B9D', hoverBg: '#1D333A', activeBg: '#243C44' },
  },
  blue: {
    key: 'blue', label: '蓝',
    light: { base: '#3D4E9C', softBg: '#EEF0F9', softBorder: '#C8CEE9', softText: '#2B3A78', strongBg: '#36468F', strongInk: '#FFFFFF', strongHover: '#324287', hoverBg: '#E4E8F5', activeBg: '#DAE0F0' },
    dark:  { base: '#8F9EDB', softBg: '#1D2645', softBorder: '#303C5E', softText: '#A9B6E0', strongBg: '#667AD4', strongInk: '#0A0E1C', strongHover: '#6275CB', hoverBg: '#242F52', activeBg: '#2B375E' },
  },
  purple: {
    key: 'purple', label: '紫',
    light: { base: '#6D5382', softBg: '#F4F0F7', softBorder: '#D8CCE2', softText: '#523C66', strongBg: '#654C7A', strongInk: '#FFFFFF', strongHover: '#5F4873', hoverBg: '#ECE4F1', activeBg: '#E4DBEC' },
    dark:  { base: '#B79FCB', softBg: '#2B2439', softBorder: '#443654', softText: '#C3B0D6', strongBg: '#8E75AE', strongInk: '#140E1B', strongHover: '#8971A8', hoverBg: '#332B43', activeBg: '#3B324D' },
  },
};

/**
 * 旧键 → 主题键回落映射（批次 505）。
 * 两类键并表：① 已删除的重复色相（天蓝 / 亮蓝 → blue，雾紫 / deep → purple）；
 * ② 历史 localStorage 与调用方仍在用的**角色键 / 色板旧键**（无覆盖时默认 gold）。
 * 角色 → 主题收敛为 7 项（与 spec 建议一致）：
 *   默认 / 普通成员 → gold；支书 / 副支书 / 党委组织员 → red；纪检（含遗留 commissioner）→ orange；
 *   组长 / 副组长 → green；组织委员 / 组织者 → cyan；宣传委员 / 发起人 → blue；深度参与者 → purple。
 * 色板旧键：participant（金）→ gold；all（旧色板「青」档）→ cyan。
 */
export const ACCENT_KEY_ALIASES = {
  sky: 'blue',
  'light-blue': 'blue',
  secretary: 'red',
  'deputy-secretary': 'red',
  'party-staff': 'red',
  'disc-commissioner': 'orange',
  commissioner: 'orange',
  leader: 'green',
  'deputy-leader': 'green',
  'org-commissioner': 'cyan',
  organizer: 'cyan',
  'prop-commissioner': 'blue',
  initiator: 'blue',
  deep: 'purple',
  participant: 'gold',
  all: 'cyan', // 遗留色板键「全体相关」在旧色板里是「青」档 ⇒ 保留青的观感
};

/**
 * 任意主题键 / 角色键 / 已删除旧键 → 7 主题键之一（无法识别 → 'gold'）。
 * @param {string} key
 * @returns {'gold'|'red'|'orange'|'green'|'cyan'|'blue'|'purple'}
 */
export function normalizeAccentKey(key) {
  const k = typeof key === 'string' ? key.trim() : '';
  if (ACCENT_COLORS[k]) return k;
  return ACCENT_KEY_ALIASES[k] || 'gold';
}

/** 主题键 / 角色键 / 主题表内 hex → 主题条目（hex 查表供 solidAccentStyle 等按旧入参取色；未知 → gold） */
function _accentEntry(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  for (const entry of Object.values(ACCENT_COLORS)) {
    if (entry.light.base.toLowerCase() === raw || entry.dark.base.toLowerCase() === raw) return entry;
  }
  return ACCENT_COLORS[normalizeAccentKey(raw)];
}

/** 主题条目的 9 个 token（按亮/暗取一套；未知 mode 按亮色） */
function _accentTokens(role, mode) {
  const entry = _accentEntry(role);
  return mode === 'dark' ? entry.dark : entry.light;
}

// ── 主题色个性化（支书指令 2026-08-06：侧边栏设置，所有角色均可选）──
// 语义色（ROLE_COLORS：日历任务色点/考察等级/参与者标识）与活动类别色（ACTIVITY_CAT_COLOR）全站固定，
// 不受此设置影响；主题色（按钮/标签/选中态/交互强调）可通过「主题选择」个性化。

/**
 * 「主题色」选色板（批次 505：10 → 7 项，紫只一个、蓝只一个）
 * key = 主题键（查 ACCENT_COLORS），label = 颜色名，hex = 该主题亮色 base（色块预览用）。
 * 主题键与角色键解耦：角色经 ACCENT_KEY_ALIASES 收敛到本表 7 项。
 */
export const ACCENT_PALETTE = [
  { key: 'gold',   hex: ACCENT_COLORS.gold.light.base,   label: '金（默认）' },
  { key: 'red',    hex: ACCENT_COLORS.red.light.base,    label: '红' },
  { key: 'orange', hex: ACCENT_COLORS.orange.light.base, label: '橙' },
  { key: 'green',  hex: ACCENT_COLORS.green.light.base,  label: '绿' },
  { key: 'cyan',   hex: ACCENT_COLORS.cyan.light.base,   label: '青' },
  { key: 'blue',   hex: ACCENT_COLORS.blue.light.base,   label: '蓝' },
  { key: 'purple', hex: ACCENT_COLORS.purple.light.base, label: '紫' },
];

/**
 * 解析当前生效的主题键（冻结读取点：只读全局键，服务访客与首帧兜底）
 * 优先读取 localStorage workflowos_accent_role，未设置 / 非法 / 已删除旧键 → 归一后回落 gold。
 * @param {string} preferredRole — 页面默认角色键（保留以兼容调用方；默认值不再取角色色）
 * @returns {string} 生效的主题键（7 项之一）
 */
export function resolveAccentRole(preferredRole) {
  const stored = localStorage.getItem('workflowos_accent_role');
  return normalizeAccentKey(stored || '');
}

/**
 * 获取主题的 9 个 token（平面对象 + 兼容别名）
 * 平面 token：base / softBg / softBorder / softText / strongBg / strongInk / strongHover / hoverBg / activeBg
 * strongHover 只服务「实底按钮 hover 同色相加深」，与 hoverBg（浅底 hover）语义不同，勿混用。
 * 兼容别名（指向新 token，供旧消费方逐步迁移）：bg / border / text / strong / ink / hover / active；
 * accentRgba / accentBorder 为历史命名，同样指向 softBg / softBorder。
 * @param {string} role — 主题键 / 角色键 / 旧键（经 normalizeAccentKey 归一）
 * @param {'light'|'dark'} [mode='light']
 * @returns {{ accent:string, base:string, softBg:string, softBorder:string, softText:string,
 *   strongBg:string, strongInk:string, strongHover:string, hoverBg:string, activeBg:string,
 *   bg:string, border:string, text:string, strong:string, ink:string, hover:string, active:string,
 *   accentRgba:string, accentBorder:string }}
 */
export function getAccentColors(role, mode = 'light') {
  const t = _accentTokens(role, mode);
  return {
    accent: t.base,
    base: t.base,
    softBg: t.softBg,
    softBorder: t.softBorder,
    softText: t.softText,
    strongBg: t.strongBg,
    strongInk: t.strongInk,
    strongHover: t.strongHover,
    hoverBg: t.hoverBg,
    activeBg: t.activeBg,
    // 兼容别名（批次 505；批次 506 消费方迁移后删）
    bg: t.softBg,
    border: t.softBorder,
    text: t.softText,
    strong: t.strongBg,
    ink: t.strongInk,
    hover: t.hoverBg,
    active: t.activeBg,
    accentRgba: t.softBg,
    accentBorder: t.softBorder,
  };
}

// ── 主题色消费口径（批次 505 改写）────────────────────────────────
// 旧「按 accent 感知亮度分流」的推导（深色浅底深字 / 浅色压深字 / 夜间 color-mix 提亮 / 金色特例
// DEEP_ACCENT_RULES）全部退场——每主题浅底深字已在 ACCENT_COLORS 表里手选，消费方只读 token。
// 批次 507：内联主题色样式改读 --app-accent-soft-* 别名（亮/暗由 styles.css 选边），
// 不再写元素级 --acc-*-dark 变量；固定语义色标记统一走 styles.css 的 [data-tone] 表。
// header 身份标签例外：主题色实底 + 白字（见 header.js _roleLabelHTML）。

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

/**
 * 实底按钮取色（查表）：底 = 该主题 `strongBg`，字 = `strongInk`。
 * 批次 505 起**无亮度分流**：亮金底深字与深色底白字都由主题表逐项手选，不再用感知亮度阈值判定。
 * @param {string} role — 主题键 / 角色键 / 主题表内 hex（兼容四处旧注入点传 accent hex）
 * @param {'light'|'dark'} [mode='light']
 * @returns {{ bg:string, text:string, strong:string, ink:string, strongHover:string }}（strong / ink 为旧字段别名）
 */
export function accentButtonColors(role, mode = 'light') {
  const t = _accentTokens(role, mode);
  return { bg: t.strongBg, text: t.strongInk, strong: t.strongBg, ink: t.strongInk, strongHover: t.strongHover };
}

/**
 * 主题色「浅底深字」内联样式（批次 507：只消费注入别名，不再写元素级日/夜内联变量）。
 * `--app-accent-soft-bg` / `--app-accent-soft-text` 在 styles.css 已按亮/暗选边，
 * 切换主题或日夜均自动跟随（旧 `--acc-*` 内联变量退场）。
 * @returns {string} 内联样式串（background / color）
 */
export function solidAccentStyle() {
  return 'background:var(--app-accent-soft-bg);color:var(--app-accent-soft-text)';
}

// ── 活动类型颜色（中文标签版，用于卡片/列表视图）──────────────────
// 统一来源，消除 main-entry / ws-visitor-entry / archive-entry 中的重复定义

const _ACTIVITY_TYPE_BASE = {
  // 三会一课系（党建红）
  '党课':         { bg: _C.red50, dot: _C.partyRedBrand },
  '支委会':       { bg: _C.red50, dot: _C.partyRedBrand },
  '党小组会':     { bg: _C.red50, dot: _C.partyRedBrand },
  '支部党员大会': { bg: _C.red50, dot: _C.partyRedBrand },
  '组织生活会':   { bg: _C.red50, dot: _C.partyRedBrand },
  // 主题党日系（党徽金 #FFD700，2026-08-01 亮金化；text=深金文字供日期数字、dotBorder=金点描边恢复暖底可辨性）
  '主题党日':     { bg: _C.yellow50, dot: _C.partyGold, text: _C.yellow700, dotBorder: 'rgba(161, 98, 7, 0.35)' },
  '共建':         { bg: _C.yellow50, dot: _C.partyGold, text: _C.yellow700, dotBorder: 'rgba(161, 98, 7, 0.35)' },
  '参访':         { bg: _C.yellow50, dot: _C.partyGold, text: _C.yellow700, dotBorder: 'rgba(161, 98, 7, 0.35)' },
  '座谈':         { bg: _C.yellow50, dot: _C.partyGold, text: _C.yellow700, dotBorder: 'rgba(161, 98, 7, 0.35)' },
};

// ── 活动权威分类（2026-08-07 类型体系归一：两大顶层，非并列关系用层级表达）──
// 三会一课：固定子类（支部党员大会/支委会/党小组会/党课）。
// 组织生活会：是内容（批评与自我批评），不是三会子类——由三会之一召开（支书 2026-08-07 纠正），
// 不进查询子类 chips、不进写入表单，活动名称写"XX组织生活会"即可表达。
export const ACTIVITY_CLASSIFICATION = {
  'three-meetings': {
    label: '三会一课',
    color: _C.partyRedBrand,
    subtypes: ['支部党员大会', '支委会', '党小组会', '党课'],
  },
  'theme-party': {
    label: '主题党日',
    color: _C.partyGold,
    carriers: ['理论学习', '实践参访', '交流座谈', '其他'], // 与写入表单 THEME_PARTY_DIMENSIONS.carriers 对齐
  },
};

const _THREE_MEETINGS_SUBTYPES = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes;

// ── 活动写入可选项目录（单一源 2026-09-03 P2b）──────────────────────
// 供 services/activity/decision-tree.js（支书/组长写活动场景选择）与 entries/tabs/secretary/calendar-tab.js
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

// ── 活动组织落点（2026-10-21 批次 499/502 · 支书补充口径）──────────────
// 支书原话：「跨组活动同样落实承办党小组；组织者一般来自承办组，深度参与者可以跨组招募，
//   由组织委员协调。」⇒ 组织落点只有两档：支部级法定会议 'branch'；其余全部 'party-group'。
// 支部级法定会议（支委会 / 支部党员大会 / 党课）不硬塞党小组，单列 'branch'。
export const ACTIVITY_SCOPES = {
  PARTY_GROUP: 'party-group',
  BRANCH: 'branch',
  // 读取别名（2026-10-21 批次 502）：已退出生产写入，仅用于旧数据 / 旧客户端入参兼容；
  // 一律经 normalizeOrganizingScope() 归一为 'party-group'。新代码不得产出该值。
  CROSS_GROUP: 'cross-group',
};
// 招募范围（R10-B16 单一源）：与组织落点正交——跨组只表达「向其他党小组招募」，
// 活动/专班仍有唯一承办组；落点一律取 ACTIVITY_SCOPES，不得把 cross-group 当第三种落点。
export const RECRUITMENT_SCOPES = Object.freeze({
  GROUP: 'group',
  CROSS_GROUP: 'cross-group',
});
export const BRANCH_LEVEL_SCENARIOS = ['branch-committee', 'branch-party-meeting', 'party-lecture'];
// 旧客户端可能只传 type、不传 scenarioId ⇒ 判支部级会议必须同时认两类入参（服务端与迁移共用）。
export const BRANCH_LEVEL_ACTIVITY_TYPES = ['支委会', '支部党员大会', '党课'];
export function isBranchLevelScenario(scenarioId) {
  return BRANCH_LEVEL_SCENARIOS.includes(scenarioId);
}
export function isBranchLevelActivity(activity) {
  return isBranchLevelScenario(activity?.scenarioId) || BRANCH_LEVEL_ACTIVITY_TYPES.includes(activity?.type);
}

/**
 * 组织落点归一（前端写口 / 服务端写门 / 迁移 / 种子共用的单一函数）。
 * @param {string|undefined|null} value 原始 organizingScope（可能来自旧数据或旧客户端）
 * @param {object|null} [activity] 活动行；支部级法定会议一律归一为 branch
 * @returns {'branch'|'party-group'}
 */
export function normalizeOrganizingScope(value, activity = null) {
  if (activity && isBranchLevelActivity(activity)) return ACTIVITY_SCOPES.BRANCH;
  return value === ACTIVITY_SCOPES.BRANCH ? ACTIVITY_SCOPES.BRANCH : ACTIVITY_SCOPES.PARTY_GROUP;
}

/** type → 权威分类键（three-meetings | theme-party | other）；判据唯一实现在 activityTypeClassification */
export function classifyActivityType(type) {
  // 兜底收敛：未登记类型返回 'other'（与 activityTypeTone 的 'neutral' 对应），不再归主题党日系；
  // 判据唯一实现在 activityTypeClassification（勿在此另写一份）。
  if (!type) return 'other';
  return activityTypeClassification(type);
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
//      在 components/record/inspector.js：`ACTIVITY_LIFECYCLE` + `deriveActivityLifecycleStatus(activity, allTasks)`
//      + `activityLifecycleBadgeHtml(...)`（执行态由任务进度派生，见 DATA_MODEL.md §2.1 与
//      DATA_CONSISTENCY_CHECKLIST「活动生命周期展示态」条）。徽章/文案一律用那一套，
//      **不要**在别处另写一套中文标签（本节曾短暂加过 ACTIVITY_LIFECYCLE_LABELS，属重复源，已撤除）。

// ════════════════════════════════════════════════════════════════
//  首页展示截断上限（单一源，R2-24，2026-10-20）
// ════════════════════════════════════════════════════════════════
//  原先通知铃铛 10 / 活动风采 6 / 首页活动列表 10 三处各写死，调上限要改三处且容易漏。
//  这里只收敛「数字」，排序/溢出提示仍由各组件按自身语义处理（通知按紧急/未读优先）。
export const DASHBOARD_LIMITS = Object.freeze({
  notices: 10,
  gallery: 6,
  activities: 10,
});

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

/**
 * 活动是否「在办」（统计口径单一源，R2-48）：
 *   在办 = 未结束（非 completed/archived）且非 draft、非 cancelled。
 * 为什么与 isActivityLive 分开：isActivityLive 是「可展示清单」谓词（保留草稿与待审批，供编辑）；
 *   支书概况/党委台账的「在办活动数」是**进度统计**，草稿尚未立项、取消已终止，二者都不应虚增在办数。
 * `executed` 为历史状态别名（服务端旧数据仍可能出现），按终态处理，避免旧行被算成在办。
 */
export function isActivityInProgress(activity) {
  const a = activity || {};
  if (isActivityEnded(a)) return false;
  return !['draft', 'cancelled', 'executed'].includes(a.status);
}

/** 活动是否未开始（单一源）：未结束，且无日期或不早于今天（member-confirmation 既有裁定字面一致） */
export function isActivityNotStarted(activity) {
  const a = activity || {};
  if (isActivityEnded(a)) return false;
  if (!a.date) return true;
  return String(a.date) >= todayLocal();
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

/** 三会一课（含组织生活会）走正式名单，不走活动报名。 */
export function usesFormalMeetingRoster(activity) {
  const type = normalizeActivityType(activity?.type);
  if (type === ACTIVITY_CLASSIFICATION['three-meetings'].label || classifyActivityType(type) === 'three-meetings') return true;
  return SCENARIO_WRITE_IDS['three-meetings'].includes(activity?.scenarioId);
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

/**
 * 活动类型 → **徽章变体**（单一源，2026-09-30 批次 301）。
 * 依据：支书 2026-09-30「这些 span 仍然是灰色。**颜色是最好的信息展示方式！没有之一**」＋
 *   「我们在写活动的时候 **三会一课 用的 红色；主题党日 用的 金色**。这种视觉设计也要尝试复现」。
 * 口径：三会一课系（含「组织生活会」——内容维度、以三会形式召开）＝ `brand`（党建红）；
 *   主题党日系（含共建 / 参访 / 座谈）＝ `gold`（党徽金）；其余未登记类型 ＝ `neutral`。
 * 变体语义与渲染唯一源见 `components/ui/badge.js::badgeHtml`（本函数**只判变体、不产 HTML**，勿在此另写色值）。
 * @param {string} type — 活动类型（可为 '大类·子类'，内部先 `normalizeActivityType`）
 * @returns {'brand'|'gold'|'neutral'}
 */
export function activityTypeBadgeVariant(type) {
  const tone = activityTypeTone(type);
  // 固定语义 tone → 徽章变体（判据只剩 activityTypeTone 一处，本函数不再查 _ACTIVITY_TYPE_BASE）
  return tone === 'party-red' ? 'brand' : tone === 'gold' ? 'gold' : 'neutral';
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

// ── 意见反馈防刷令牌哈希（身份留存边界见 D-824）──
// 客户端首次提交时生成随机 token（localStorage，不可由 personId 推导）；服务端仅存其哈希，
// 只用于判重与频率限制。输入 = 随机 token 本身（不含 personId、不使用任何 salt/固定盐），
// 故不可由 personId 推导、不可反查提交人——与服务端按会话保留受保护 `_realPersonId` **互不影响**：
// 防刷判重只认 tokenHash；任何角色目前均无系统揭名入口，本机 mock 不留存真身。
// 纯同步函数、node/browser 同源：server/routes/resources.js 与前端 services/governance/issues.js 共用，
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
  // 支委层（R10-B11）：本支部支委层受众；党委下发通道另有 source/scope 语义（见 notice.js），勿混为一谈。
  committee: { label: '支委层', roles: [...BRANCH_COMMISSION_ROLES] },
  leaders: { label: '党小组组长', roles: ['leader'] },
  activists: { label: '入党积极分子', developStages: ['积极分子'] },
  candidates: { label: '发展对象', developStages: ['发展对象'] },
};
/** 发布表单受众选项（保持声明序；发布侧勿再手写 sentinel 列表） */
export const NOTICE_AUDIENCE_OPTIONS = Object.entries(NOTICE_AUDIENCE_SENTINELS)
  .map(([value, d]) => ({ value, label: d.label }));

// ════════════════════════════════════════════════════════════════
//  「副组长」身份键（2026-09-21 批次 139 · 裁定 `D-571`，系照支书 2026-09-21 口径落）
// ════════════════════════════════════════════════════════════════
// 支书口径（逐字，四层）：「① 组长和副组长台子是一样的。但是任务优先打给 组长。② 目前第三组是副组长
//   是因为机械地把 代组长替换成了 副组长。实际上，代组长是组长（不是副组长，代组长是因为他尚未转正，
//   所以暂代组长职务）；③ 我们并不像给组长和副组长明确分工，而由他们自己探讨分工。所以设定了两者同样
//   的工作台。但是后台还是知道谁是组长，谁是副组长的」。
// ⇒ 落法：**两个可区分的身份**（`leader` / `deputy-leader`，后台据此分辨谁是组长、谁是副组长）·
//   **同一套工作台**（`ROLE_PAGE_MAP.workspace` 两条都指 `leader.html`，不另做副组长的台）·
//   **不硬切分正副职责**（权限集与组长同一份，见 `services/core/auth.js` 文件末同源挂载）·
//   **任务优先打给组长**（凡按 `role === 'leader'` 解析的锚点〔履职待办派生 / 会议记录人 / 产出块负责人〕
//   只落组长；「本组组长」这一格的解析单一源 `services/member/group-view.js::listPartyGroups` 组长优先、组内无
//   组长时才回落副组长）。
// ⚠ 为什么写在文件末而不写进上方各自的字面量：`README-server.md` 按**行号**引用本文件
//   （`:106` → `ROLE_KEYS:185-191` · `ROLE_LABELS:288-302` · `ROLE_PAGE_MAP:306-318`），插行会使那些引用
//   整体漂移、而后端照着找不到东西（本批**不许改 README**）⇒ 本批对四处表的扩展**集中在文件末挂载**，
//   上方被引用的行号**零变动**。改这几张表时请维持此约定（或同批把 README 的行号一并改准）。
ROLE_KEYS.push('deputy-leader');
ROLE_LABELS['deputy-leader'] = '党小组副组长';
ROLE_PAGE_MAP.workspace['deputy-leader'] = 'leader.html'; // 同组长一套工作台（同页同台）
ROLE_COLORS['deputy-leader'] = { ...ROLE_COLORS.leader };
// 2026-10-23 批次 505：ACCENT_COLORS 已收敛为 7 个主题键（批次 505），不再按角色键扩表——
//   副组长经 ACCENT_KEY_ALIASES['deputy-leader'] → green 取主题色。
ROLE_THEME_CLASS['deputy-leader'] = ROLE_THEME_CLASS.leader;

// ════════════════════════════════════════════════════════════════
//  支书/副支书自配「本支部支委身份」白名单与写门判据（2026-09-23 支书裁定 · 情景① 写口落地）
// ════════════════════════════════════════════════════════════════
// 支书口径（逐字）：「赋权主要是3个情景，一是赋权给党小组组长/支委（也就是最初的人员配置只有党委给
//   支书配置，剩下的身份由书记来配置）」⇒ 情景① 除「党委配支书」这一件外，**支部层面、非一把手**的
//   支委身份（组织 / 宣传 / 纪检委员）由**本支部现任支书 / 副支书**配置（可改派、可撤销）。
// 白名单（严，只放开这三席）：
//   · 可授予＝组织委员 / 宣传委员 / 纪检委员；撤销＝回落 `BRANCH_COMMISSIONER_FALLBACK_ROLE`（普通参与者）。
//   · **不含 `secretary`**：支书本人的支书身份归党委（`D-585`「换届选举涉及到支委班子身份赋权的
//     问题，应当由党委来改变支部设置！！」）。
//   · **不含 `deputy-secretary`**：副支书与支书同页同权（`SECRETARY_AND_DEPUTY_ROLES`）、属一把手层，
//     其身份变更同样归党委 ⇒ 可配者含副支书，**被配者不含支书 / 副支书**（含另一人的副支书身份）。
// 消费方（单一源，勿各自手写第二份）：`docs/src/services/branch/appointment.js`（写口）、
//   `server/routes/resources.js`（`users` 写门）、`docs/src/entries/tabs/secretary/assign-tab.js`（表单选项）。
export const BRANCH_COMMISSIONER_ASSIGNABLE_ROLES = ['org-commissioner', 'prop-commissioner', 'disc-commissioner'];
/** 撤销支委身份时回落的身份（降级位；**不是**「可授予身份」，故不并入上表） */
export const BRANCH_COMMISSIONER_FALLBACK_ROLE = 'participant';

/**
 * 「支书 / 副支书配置本支部支委身份」写门判据（**唯一实现**——前端写口与 server `users` 写门共用，勿另写一份）：
 * 允许 → `null`；拒绝 → 原因文案（调用方据此 403）。
 *
 * 谁在什么条件下可改谁（2026-09-23 支书裁定「副支书也可配」；一把手层依 `D-585` 归党委）：
 *   ① `party-staff`（党委组织员）→ **原样放行**（`users` 写门原有口径；本次是放宽、不是收窄）；
 *   ② 其余角色只有**该支部现任支书 ∨ 该支部现任副支书**可改（`actorId === secretaryId` /
 *      `actorId === deputySecretaryId`）——两者以外的一切身份（委员 / 组长 / 普通成员）一律拒；
 *   ③ 靶标须与操作人**同支部**（归属缺省 `br-b1`，与全仓同口径）——跨支部一律拒；
 *   ④ 写入身份 ∈ 白名单 ∪ {撤销回落位}——白名单外的角色键（含 `secretary` / `deputy-secretary` /
 *      `party-staff` / `leader` / `organizer` / `deep` …）一律拒；
 *   ⑤ **一把手层不可动**：靶标现任身份是 `secretary` / `deputy-secretary`（或靶标即现任支书 / 副支书本人）一律拒。
 * @param {{actorRole?:string, actorId?:string, actorBranchId?:string, targetId?:string,
 *          targetRole?:string, targetBranchId?:string, secretaryId?:string, deputySecretaryId?:string, role?:string}} p
 * @returns {string|null}
 */
export function branchCommissionerWriteDeny(p) {
  const s = p || {};
  const branchOf = (b) => b || DEFAULT_BRANCH_ID;
  if (s.actorRole === 'party-staff') return null; // 党委侧 users 写门原样（本次只放宽、不收窄）
  // 一把手层同权（2026-09-23 支书追裁「副支书也可配」）：本支部现任支书 ∨ 本支部现任副支书
  const isBranchSecretary = !!s.secretaryId && s.actorId === s.secretaryId;
  const isBranchDeputy = !!s.deputySecretaryId && s.actorId === s.deputySecretaryId;
  if (!isBranchSecretary && !isBranchDeputy) {
    return '无权限：支委身份配置仅限本支部现任支书 / 副支书（users 写门仍仅党委组织员）';
  }
  if (branchOf(s.actorBranchId) !== branchOf(s.targetBranchId)) {
    return '无权限：仅可配置本支部成员的支委身份（跨支部一律拒）';
  }
  if (!s.targetId || s.targetId === s.actorId) return '无权限：不可改自己的身份';
  if (s.role !== BRANCH_COMMISSIONER_FALLBACK_ROLE && !BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.includes(s.role)) {
    return '无权限：只可配置本支部的组织 / 宣传 / 纪检委员身份（撤销＝回落普通参与者）；支书 / 副支书身份由党委配置';
  }
  if (s.targetId === s.secretaryId || s.targetId === s.deputySecretaryId
    || s.targetRole === 'secretary' || s.targetRole === 'deputy-secretary') {
    return '无权限：支书 / 副支书身份由党委配置（换届选举涉及支委班子身份赋权，由党委改变支部设置）';
  }
  return null;
}

// ── 业务域识别色（`V-6` 丙）─────────────────────────────────────────────
// ⚠ **本块置于文件末尾**（批次 327）：本仓纪律「**避免在文件中段插入而位移既有 `文件:行号` 引用**」
//   （先例＝批次 122 `D-544`）。`README-server.md` 有 10 处按**行号区间**引本文件
//   （`ROLE_KEYS` / `ROLE_LEGACY_KEYS` / `ROLE_LABELS` / `ROLE_PAGE_MAP` / `BRANCH_COMMISSION_ROLES` /
//   `DEVELOP_STAGES` / `isCoreTab` / `normalizeActivityType` 等）；把本块放末尾 ⇒ **零位移**、
//   `doc-line-ref::R2` 无需改准。
/**
 * 业务域识别色（**现行：只给「项目」一域**——支书 2026-10-05 圈**乙**「**只给『项目』配红金**」）。
 *
 * ⚠ **沿革**：2026-10-01 `V-6` 丙（原「项目线三域」会务 / 活动 / 专班 各一色）→ **2026-10-05 `D-787` 9 → 6 合并**
 *   （三域并一「项目」）后，三色方案失效 ⇒ 支书圈乙：**只给「项目」配色**、其余五类**保持中性**（不配色＝不强调）。
 * **色从哪来（不新造）**：取**会务红族**（与「三会一课红」`ACTIVITY_CAT_COLOR` 同族）作「项目」域色——「红金」
 *   色彩语言里**红＝党色 / 项目主色**；**金族留给活动类别色**（主题党日金），**不在两处重复占用**。
 * **固定、不随主题**（§2.9 判据·甲：只有「主操作 / 选中态 / 本人标识」三类随主题）；**键＝ `WORK_DOMAIN` 的取值字符串**
 *   （本文件**不** import `services/governance/todo.js`，避免循环依赖；消费点自行按域键取用）。
 */
const WORK_DOMAIN_COLOR = _applyDark({
  project: { bg: 'rgba(206, 17, 38, 0.08)', text: _C.red800, border: 'rgba(206, 17, 38, 0.25)' }, // 项目（会务·活动·专班）
});
export const WORK_DOMAIN_COLORS = WORK_DOMAIN_COLOR;

// ════════════════════════════════════════════════════════════════
//  「党小组组长 / 副组长」同权角色集（2026-10-22 第七轮 P2 · `D-540` / `D-571`）
// ════════════════════════════════════════════════════════════════
// 裁定口径：「副组长共用组长工作台，权限集与赋权链与组长同一份」⇒ 一切**权限门**判「党小组组长」
//   都必须同时认 `deputy-leader`，否则副组长在本组活动创建 / 编辑 / 考勤记录位被 403。
// ⚠ 两类判据不要混：**权限门**用本集（两个角色同权）；**「任务优先打给组长」的锚点**
//   （履职待办派生 / 会议记录人 / 产出块负责人 / 本组组长位）仍只解析 `leader`（见本文件 988 行注）。
// 消费方（单一源，勿各自手写第二份）：server 路由写门与前端能力判定同引本文件。
export const PARTY_GROUP_LEADER_ROLES = Object.freeze(['leader', 'deputy-leader']);
/** 是否「党小组组长 / 副组长」（权限门判据，勿用于任务派发锚点） */
export function isPartyGroupLeaderRole(role) {
  return PARTY_GROUP_LEADER_ROLES.includes(role);
}

// ════════════════════════════════════════════════════════════════
//  组长可创建的活动类型（R7-19 单一源，2026-10-22）
// ════════════════════════════════════════════════════════════════
// 病灶：服务端 `routes/resources/gates.js`（活动写门）与 `system-notice-kinds.js`
//   （活动创建通知受众）各写一份 `Set(['党小组会','主题党日'])` ⇒ 调整时可出现
//   「活动写门放行、通知受众不放行」（或反之）。本集为两处**唯一**判据源。
// 口径：对齐 SYSTEM_ROLE_PERMISSION §9a 与组长手册（组长限办本组党小组会 / 主题党日）。
export const LEADER_CREATABLE_ACTIVITY_TYPES = Object.freeze(['党小组会', '主题党日']);

// ── 空值词表（R7-05 单一源；追加在文件末，避免上方行号引用漂移）────────
// 缺失 / 未填 ⇒ EMPTY_TEXT；角色或条件不涉及 ⇒ EMPTY_NOT_APPLICABLE（不适用）。
// 档案页、人才库、考勤总表等读侧共用本词表，勿各写一套（旧词「未填写」已并入 EMPTY_TEXT）。
export const EMPTY_TEXT = '—';
export const EMPTY_NOT_APPLICABLE = '不适用';

// ════════════════════════════════════════════════════════════════
//  活动类别语义 tone（单一判据，2026-10-24 批次 508 · 追加在文件末避免行号漂移）
// ════════════════════════════════════════════════════════════════
// 病灶：三会一课 / 主题党日的红金判据此前分散在 `_ACTIVITY_TYPE_BASE`（按 dot 色再查一次）、
//   `activityTypeBadgeVariant`（自己查表）与 `classifyActivityType`（未知兜底归主题党日）三处，
//   新增载体（理论学习等）时容易只改一处。现收敛为一条链（每层只判一件事）：
//     activityTypeClassification（大类：three-meetings / theme-party / other）
//       → activityTypeTone（固定语义 tone：party-red / gold / neutral）
//       → activityTypeBadgeVariant（组件变体：brand / gold / neutral，只做映射）。
// 判据来源仍是既有 `_ACTIVITY_TYPE_BASE`（已登记的 7 类）+ `ACTIVITY_CLASSIFICATION`（子类 / 载体）+
//   `normalizeActivityType`（'大类·子类' 归一），**不新造第二张类别表**。

/** 主题党日载体（复用 ACTIVITY_CLASSIFICATION.carriers；'其他' 是泛化兜底载体，不参与固定语义配色） */
const _THEME_PARTY_CARRIERS = ACTIVITY_CLASSIFICATION['theme-party'].carriers.filter((c) => c !== '其他');

/**
 * 活动类型 → 权威分类键（单一判据；未登记 / 空值 → 'other'，不再兜底 'theme-party'）。
 * · 三会一课族（四个子类 / 组织生活会 / 大类名「三会一课」）→ 'three-meetings'
 * · 主题党日及载体（主题党日 / 理论学习 / 实践参访 / 交流座谈 / 共建 / 参访 / 座谈）→ 'theme-party'
 * · 其余（未登记）→ 'other'
 * 与 activityTypeTone 的关系：本函数判「大类」，tone 把大类映射为固定语义色，二者同源、不得各写一份。
 * @param {string} type
 * @returns {'three-meetings'|'theme-party'|'other'}
 */
export function activityTypeClassification(type) {
  const t = normalizeActivityType(type);
  if (!t) return 'other';
  if (t === ACTIVITY_CLASSIFICATION['three-meetings'].label) return 'three-meetings';
  if (t === '组织生活会') return 'three-meetings'; // 内容维度：以三会形式召开，大类仍属三会一课
  if (t === ACTIVITY_CLASSIFICATION['theme-party'].label) return 'theme-party';
  if (_ACTIVITY_TYPE_BASE[t]) return _ACTIVITY_TYPE_BASE[t].dot === _C.partyRedBrand ? 'three-meetings' : 'theme-party';
  if (_THEME_PARTY_CARRIERS.includes(t)) return 'theme-party';
  return 'other';
}

/**
 * 活动类别 → 固定语义 tone（唯一判据；不随主题变化）。
 * · 三会一课族（支部党员大会 / 支委会 / 党小组会 / 党课 / 组织生活会 / 大类名「三会一课」）→ 'party-red'
 * · 主题党日及载体（理论学习 / 实践参访 / 交流座谈 / 共建 / 参访 / 座谈）→ 'gold'
 * · 其余（未登记）→ 'neutral'
 * @param {string} type
 * @returns {'party-red'|'gold'|'neutral'}
 */
export function activityTypeTone(type) {
  const cls = activityTypeClassification(type);
  if (cls === 'three-meetings') return 'party-red';
  if (cls === 'theme-party') return 'gold';
  return 'neutral';
}
