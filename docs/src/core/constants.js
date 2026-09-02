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
  '#4F46E5': '#818CF8', '#22C55E': '#4ADE80', '#0EA5E9': '#38BDF8',
  '#2563EB': '#60A5FA',
  // 各组件内联标签补充映射（d8 深色适配：阶段徽章/看板头/操作按钮等）
  '#1D4ED8': '#60A5FA', '#047857': '#34D399', '#92400E': '#FBBF24',
  '#d97706': '#FBBF24', '#3b82f6': '#60A5FA', '#10b981': '#34D399',
  '#9B0000': '#F87171', '#16A34A': '#4ADE80',
  // 表态组件/状态图标补充（d10 全局扫尾：reactions 选中态 / toast 状态色等）
  '#059669': '#34D399', '#DC2626': '#F87171',
  // 强调色补充（主题色个性化可选色中的亮色，本身已亮，深色下保持自身）
  '#7DD3FC': '#7DD3FC', '#94a3b8': '#94a3b8',
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
});

// ── 活动类别颜色（两大类：三会一课=党建红 / 主题党日=党建金）──
// 书记 2026-07-31 指示：活动顶层分类为两大类，三会一课固定分类，主题党日使用正交维度

const ACTIVITY_CAT_COLOR = _applyDark({
  // ── 三会一课系（党建红 #CE1126）──
  'branch-party-meeting': { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支部党员大会
  'branch-committee':      { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 支委会
  'party-group-meeting':   { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 党小组会
  'party-lecture':         { bg: 'rgba(206, 17, 38, 0.08)',  text: '#991B1B', border: 'rgba(206, 17, 38, 0.25)' },  // 党课
  // ── 主题党日系（党徽金 #FFD700，2026-08-01 书记要求"再亮一些"，原 #D4AF37 偏灰/脏）──
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
  // 组织生活会：会议内容（批评与自我批评），由党小组会等三会形式召开（书记 2026-08-01/2026-08-07 决策）
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

// ── 角色键单一事实源（T-304 Q3 权限收敛，2026-08-29）──────────────
// 与内容层 ROLE_CLASSIFICATION.md §9 角色键全表对齐；
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

// 条条委员集合（业务语义：三委员，不含书记/副书记）——与 auth.js 的 COMMISSIONER_ROLES（授权语义：含书记/副书记）
// 语义不同、键集不同，T-304 Q3 已注明区分，勿混用。消费方：inspector.js 执行人/监督人「是否委员」判定。
export const COMMISSIONER_ROLES = new Set([
  'commissioner', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]);

// inspector 角色横幅主题类契约（消费方：inspector.js 管理视图横幅；CSS 类规则在各页样式按需定义）
// S7 补全三委员/participant/deputy-secretary：deputy 同书记（党建红），与 ROLE_COLORS/ACCENT_COLORS 键集对齐
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
  'deputy-secretary':  { hex: '#B91C1C' },  // 党建红（同书记）
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

// ── 主题色个性化（书记指令 2026-08-06：侧边栏设置，所有角色均可选）──
// 语义色（ROLE_COLORS：日历任务色点/考察等级/参与者标识/活动类别色）全站固定，不受此设置影响；
// 强调色（ACCENT_COLORS：按钮/标签/卡片强调）可通过侧边栏「主题色」选择器个性化。

/**
 * 侧边栏「主题色」选色板的可选色（书记指令 2026-08-06：颜色就是颜色，不与人挂钩）
 * 按色相规律排列，2 行 × 5 个；key = 色板键（映射 ACCENT_COLORS 取衍生色），label = 颜色名
 * S8 键集对齐：色板键集 ⊂ ACCENT_COLORS——deputy-secretary（同书记红）、commissioner（遗留键）
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
    // 书记 2026-08-08 四审定稿——金色就该和主题党日胶囊一致）
    accentRgba: entry.bg || hexToRgba(entry.hex, bgAlpha),
    accentBorder: entry.border || hexToRgba(entry.hex, borderAlpha),
  };
}

// ── 功能色「统一 tab 风格」规则（书记 2026-08-11 二审裁定 + 四审纠正）────────────────
// 书记：亮色和暗色的处理逻辑我不太理解——因为金色和亮蓝我认为都很亮。
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
// 背景：2026-08-08 书记裁定金色浅底深字；2026-08-10 曾改为实底白字；
// 2026-08-11 上午 T-218 二审为「深浅分流（深色浅底深字/浅色实底白字）」；
// 2026-08-11 下午书记再判「想反了——浅色才应该浅底深字」→ 统一浅底深字，废除实底白字分支；
// 2026-08-11 三审「夜间提亮字看不清」→ 夜间近不透明淡底+边框；四审「边框臃肿」→ 去掉边框，改完全不透明浅底。

// 品牌亮色映射：金色日/夜淡底统一用亮金底 #FFD700（主题党日胶囊同源，书记 2026-08-08 四审定稿）
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
 * 功能色「统一 tab 风格」规则（书记 2026-08-11 二审裁定 + 四审纠正）
 * 所有 accent（不分深浅）一律「同色系高亮浅底 + 深色字」；夜间改为「完全不透明浅底深字」——
 * span 状态徽章风格（如 bg-cyan-100+text-cyan-700），深色页面清晰可见、无边框不臃肿
 * （书记：「淡底深字应该变成 span 类似这样的淡底深字」；「你的做法让视觉非常臃肿」→ 去边框）：
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
  // 淡底（日）：accent 调亮至 84% 明度 @12% 透明
  const bg = _rgba(branded ? branded.light : _lighten(accent, 84), 0.12);
  // 淡底（夜）：accent 调亮至 86% 明度完全不透明——span 状态徽章风格（如 bg-cyan-100），叠深背景仍清晰可见
  const bgDark = branded ? branded.light : _lighten(accent, 86);
  return `--acc-bg:${bg};--acc-text:${text};--acc-bg-dark:${bgDark};--acc-text-dark:${text};background:var(--acc-bg);color:var(--acc-text,#fff)`;
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
// 组织生活会：是内容（批评与自我批评），不是三会子类——由三会之一召开（书记 2026-08-07 纠正），
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

/** type → 大类（three-meetings | theme-party） */
export function classifyActivityType(type) {
  if (!type) return null;
  if (_THREE_MEETINGS_SUBTYPES.includes(type)) return 'three-meetings';
  if (type === '组织生活会') return 'three-meetings'; // 内容维度：以三会形式召开，大类仍属三会一课
  return 'theme-party'; // 主题党日 及未知类型兜底归主题党日系
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