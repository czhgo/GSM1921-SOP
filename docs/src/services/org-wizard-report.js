// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/org-wizard-report.js — 换组织向导「换壳工作单」生成（阶段一，2026-09-06 书记裁定）
// ════════════════════════════════════════════════════════════════
// 定位：向导步骤④「生成换壳工作单」的纯函数实现。可即时改的（组织信息/模块块组合/角色分工）
//      已由向导直写 branch config 生效；数据/制度/术语/角色权限等仓库文件内容改不了，
//      只能出「工作单」指引人工替换——本文件把已完成配置摘要 + 待手动替换文件清单 + 验证点
//      汇成一份 Markdown，页面 Blob 下载（utils.downloadBlob）。
// 纯 ESM、零依赖（不 import 任何 ?v= 模块）：浏览器 / Node 双端可加载、可单测。
// 输入参数由向导侧（components/org-setup-wizard.js）组装现读数：
//   branchInfo   { id, name, headerTitle, desc, type, secretaryName }
//   theme        { presetId, name, accentHex }（可调令牌预设；固定红/金说明内建，见 COLOR_SYSTEM.md §2.1/§2.8）
//   modulesSummary { total, visibleCount, hiddenLabels[], orderChanged }
//   blocksSummary  { outputTotal, outputHiddenLabels[], wbHiddenLabels[] }
//   workforce    Array<{ module: string, owner: string }>（ownerDisplay 已展开为角色名/姓名）
//   rosterStats  { expected, partyTotal, detainedParty }（services/roster.js getRosterStats 现读数）
// ════════════════════════════════════════════════════════════════

/** 待手动替换文件清单（阶段一固定条目；「换壳不换骨」= 这些内容在线改不了，出仓后改仓库文件） */
const REPLACE_ENTRIES = [
  {
    group: '演示数据与人员档案（docs/src/mock/）',
    desc: '支部成员/账号/活动/通知等示例数据按需替换：people.js（成员档案，含 role/developStage/党小组/滞留标注）、accounts.js（登录账号）、branches.js（支部种子）、activities.js / taskforces.js 等业务示例。',
    files: ['docs/src/mock/people.js', 'docs/src/mock/accounts.js', 'docs/src/mock/branches.js', 'docs/src/mock/activities.js'],
  },
  {
    group: '系统常量与文案（docs/src/core/constants.js）',
    desc: '角色枚举 ROLE_KEYS / 角色名 ROLE_LABELS / 页面映射 ROLE_PAGE_MAP / 活动类型与产出块目录 OUTPUT_BLOCK_DEFS / 强调色 ACCENT_COLORS 等常量集中在此——改机构称谓/活动分类先改这里，勿在业务层另写字面量。',
    files: ['docs/src/core/constants.js'],
  },
  {
    group: '角色权限矩阵（content/02_institution/SYSTEM_ROLE_PERMISSION.md）',
    desc: '岗位职责与权限矩阵的制度文档；权限键消费于 docs/src/services/auth.js ROLE_PERMISSIONS——制度侧与代码侧须同步（P2c 单一源核对）。',
    files: ['content/02_institution/SYSTEM_ROLE_PERMISSION.md'],
  },
  {
    group: '术语与使用策略（content/03_doc_system/USAGE_POLICY.md）',
    desc: '系统内术语口径/使用策略的制度文档（含会议类型、考勤口径等说明）；配套 docs/src/core/policy-defaults.js 的 branch-default 项。',
    files: ['content/03_doc_system/USAGE_POLICY.md'],
  },
  {
    group: '制度 SOP（content/02_institution/sop/）',
    desc: '支部运行制度 SOP（书记/组织/宣传/纪检/组长等岗位工作指南与常见场景），换组织的制度文本按需整组替换；INDEX.md 为目录。',
    files: ['content/02_institution/sop/'],
  },
  {
    group: '配色系统（content/04_web_design/design-system/COLOR_SYSTEM.md + docs/src/styles.css）',
    desc: '党建红 party-red（#CE1126）与党徽金 party-gold（#FFD700）为固定合规底线、不可替换；可调的是角色识别层强调色（--app-accent 三件套，向导主题预设即写这组 CSS 变量）。改站内其它固定令牌须同步 COLOR_SYSTEM 与 styles.css :root。',
    files: ['content/04_web_design/design-system/COLOR_SYSTEM.md', 'docs/src/styles.css'],
  },
  {
    group: '支部默认策略（docs/src/core/policy-defaults.js）',
    desc: 'branch-default 项可按支部制度调整（如 attendance.roster 应到口径 partyStages/excludeDetained、支委票决门槛 quorum）；institutional 项为制度裁决固定，改须书记裁决。',
    files: ['docs/src/core/policy-defaults.js'],
  },
];

/** 取预设名称/色值（纯文本，不依赖向导组件常量） */
function _themeLabel(theme) {
  const t = theme || {};
  return `${t.name || t.presetId || '（默认红调）'}${t.accentHex ? ` · ${t.accentHex}` : ''}`;
}

/**
 * 生成换壳工作单 Markdown（纯函数）
 * @param {Object} input
 * @returns {string} Markdown 文本
 */
export function buildOrgWizardReport({
  branchInfo = {},
  theme = null,
  modulesSummary = {},
  blocksSummary = {},
  workforce = [],
  rosterStats = null,
} = {}) {
  const info = branchInfo || {};
  const name = info.name || '（未命名支部）';
  const stats = rosterStats || { expected: 0, partyTotal: 0, detainedParty: 0 };
  const workforceRows = Array.isArray(workforce) ? workforce : [];

  const L = [];
  L.push(`# 换壳工作单 — ${name}`);
  L.push('');
  L.push('> 由「换组织向导」生成：已完成配置即时生效（已写入本支部 config）；需要改仓库文件的部分见下清单。');
  L.push('');
  L.push('## 一、已完成配置摘要（即时生效）');
  L.push('');
  L.push(`- 支部名称：${name}${info.id ? `（${info.id}）` : ''}`);
  if (info.headerTitle && info.headerTitle !== name) L.push(`- 页眉显示名：${info.headerTitle}`);
  if (info.type) L.push(`- 支部类型：${info.type}`);
  if (info.secretaryName) L.push(`- 现任书记：${info.secretaryName}`);
  L.push(`- 支部自述：${(info.desc || '').trim() ? (info.desc || '').trim().replace(/\n+/g, ' / ') : '（未填写）'}`);
  L.push(`- 主题预设：${_themeLabel(theme)}`);
  L.push('  - 可调范围仅限角色识别层强调色（--app-accent 三件套）；固定令牌不改：党建红 party-red `#CE1126` 与党徽金 party-gold `#FFD700`（COLOR_SYSTEM.md §2.1 合规底线）。');
  L.push('');
  const mods = modulesSummary || {};
  const total = mods.total || 0;
  const vis = mods.visibleCount ?? total;
  const hiddenMods = (mods.hiddenLabels || []).join('、');
  L.push(`- 业务模块：共 ${total} 项，当前启用 ${vis} 项${hiddenMods ? `；停用：${hiddenMods}` : '（全开）'}${mods.orderChanged ? '；已调整显示顺序' : '；顺序沿用注册顺序'}`);
  const blk = blocksSummary || {};
  const outTotal = blk.outputTotal || 0;
  const hiddenBlk = (blk.outputHiddenLabels || []).join('、');
  L.push(`- 活动产出块：共 ${outTotal} 项${hiddenBlk ? `；停用：${hiddenBlk}` : '，全部启用'}；工作流块停用：${(blk.wbHiddenLabels || []).join('、') || '无'}`);
  L.push('- 角色分工：');
  if (workforceRows.length) {
    for (const w of workforceRows) L.push(`  - ${w.module} → ${w.owner}`);
  } else {
    L.push('  - （沿用缺省分工，未调整）');
  }
  L.push('');
  L.push('## 二、待手动替换文件清单');
  L.push('');
  L.push('> 在线只改「系统内配置」；下列内容的默认数据/制度文本/术语存放在仓库文件，需出仓后在代码仓库中人工替换（阶段二再做在线 JSON 覆盖预览）。');
  L.push('');
  for (const g of REPLACE_ENTRIES) {
    L.push(`### ${g.group}`);
    L.push('');
    L.push(g.desc);
    L.push('');
    L.push(`- 文件：\`${g.files.join('`、`')}\``);
    L.push('');
  }
  L.push('## 三、验证点');
  L.push('');
  L.push('- 应到名单口径（三会+党课统一）：应到 = 在册党员（正式党员 + 预备党员）非滞留；当前现读数：');
  L.push(`  - 在册党员 ${stats.partyTotal} 人；滞留剔除 ${stats.detainedParty} 人；应到 ${stats.expected} 人。`);
  L.push('  - 口径配置在 docs/src/core/policy-defaults.js `attendance.roster`（partyStages / excludeDetained），改前核对 USAGE_POLICY 与制度 SOP。');
  L.push('');
  L.push('- 配置即时生效说明：本向导每步改动即时写入支部 config 并留痕（branch.config.configChangeHistory 可查）；');
  L.push('  模块/块启停对支部成员「下次进入工作台/活动详情」生效，组织信息/主题即时生效。');
  L.push('');
  L.push('- 演示重置：浏览器演示在页面 URL 加 `?reset=1` 访问，一键清除本域演示存储并回到种子初始态（仅 mock 演示模式；生产数据不受影响）。');
  L.push('');
  L.push('- 回归验证：改仓库文件后在 `server` 目录执行 `npm test`（`node --test`）确认全绿，再行交付。');
  L.push('');
  L.push('- 换壳口径自查：支部名/主题只动可调令牌与支部档案，不触碰 party-red/party-gold 固定令牌；');
  L.push('  角色权限矩阵改前先走制度评审（SYSTEM_ROLE_PERMISSION.md 为单一源，代码侧同步 auth.js）。');
  L.push('');
  return L.join('\n');
}
