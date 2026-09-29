// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/mock/prop.js —— 宣传域种子（**内容单一源**：周报报送 / 宣传任务）
//  ════════════════════════════════════════════════════════════════
// 由来（2026-09-28 批次 234「去冗余」）：这两个常量原先**各存两份**——UI 侧私有常量
//   （`entries/tabs/prop/weekly-tab.js::WEEKLY_REPORTS_SEED` / `tasks-tab.js::PROP_TASKS_SEED`，未导出）
//   ＋ 服务端**逐字复刻**一份（`server/seed.js::SEED_WEEKLY_REPORTS` / `SEED_PROP_TASKS`，其原注释即写明
//   「如后续把该常量导出，请改为 import 同源（勿留两份）」）。两处字面量一字不差、却要人工同步 ⇒ 典型冗余。
// 现按本仓「内容单一源」纪律（同 `seedIssues()` / `seedMilestones()` / `SEED_TODOS`）**收成一份纯数据模块**：
//   · UI 侧（`prop/weekly-tab.js` / `prop/tasks-tab.js`）import 本模块作 **mockDB 空表兜底注入**；
//   · 服务端（`server/seed.js`）import 本模块作 **api 形态首启播种**（`replaceCollection`）。
//   ⇒ mock / api 两形态同内容，且**不再有第二份清单可漂移**。
// ⚠ 纯数据：本模块**不得** import 任何 `core/**` / `services/**`（前端 UI 侧要 import 它，反向依赖即成环）。
// ⚠ 禁止在此写运行期逻辑（取值 / 派生 / 校验一律留在各自消费方）。

/**
 * 宣传周报报送基线（第 28–31 周）。
 * 形状 = `{ id, week, weekRange, content, status:'submitted'|'draft', submittedAt }`（周报 tab 的写口 `push` 形状）。
 * 口径：ISO 周「周一~周五」（第30周=2026-07-20~07-24 / 第31周=2026-07-27~07-31，与 `_weekDefaults` 派生同口径）。
 */
export const WEEKLY_REPORTS_SEED = [
  { id: 'wr1', week: '第30周', weekRange: '2026-07-20 ~ 2026-07-24', content: '1. 七一主题党日活动新闻稿发布\n2. 发展对象公示推送排版完成\n3. 上半年活动照片归档整理进行中', status: 'submitted', submittedAt: '2026-07-24' },
  { id: 'wr2', week: '第29周', weekRange: '2026-07-13 ~ 2026-07-17', content: '1. 入党积极分子培训资料归档完成\n2. 组织生活会预告推送发布\n3. 配合组织委员完成发展对象材料审核', status: 'submitted', submittedAt: '2026-07-17' },
  { id: 'wr3', week: '第28周', weekRange: '2026-07-06 ~ 2026-07-10', content: '1. 预备党员转正大会新闻稿起草\n2. 七一活动素材整理\n3. 宣传专栏内容更新', status: 'submitted', submittedAt: '2026-07-10' },
  { id: 'wr4', week: '第31周', weekRange: '2026-07-27 ~ 2026-07-31', content: '', status: 'draft', submittedAt: null },
];

/**
 * 宣传任务基线（8 条）。
 * 形状 = `{ id, source, type, summary, status:'pending'|'in_progress'|'submitted', createdAt }`。
 */
export const PROP_TASKS_SEED = [
  { id: 'pt1', source: '支部委员会', type: '新闻稿', summary: '七一主题党日活动新闻稿', status: 'pending', createdAt: '2026-07-25' },
  { id: 'pt2', source: '副支书', type: '推送排版', summary: '发展对象公示推送排版', status: 'in_progress', createdAt: '2026-07-24' },
  { id: 'pt3', source: '支部委员会', type: '素材归档', summary: '上半年活动照片归档整理', status: 'in_progress', createdAt: '2026-07-22' },
  { id: 'pt4', source: '组织委员', type: '周报报送', summary: '第30周党建工作周报', status: 'submitted', createdAt: '2026-07-21' },
  { id: 'pt5', source: '支部委员会', type: '新闻稿', summary: '预备党员转正大会新闻稿', status: 'pending', createdAt: '2026-07-20' },
  { id: 'pt6', source: '副支书', type: '推送排版', summary: '组织生活会预告推送', status: 'pending', createdAt: '2026-07-19' },
  { id: 'pt7', source: '支部委员会', type: '素材归档', summary: '入党积极分子培训资料归档', status: 'submitted', createdAt: '2026-07-18' },
  { id: 'pt8', source: '组织委员', type: '周报报送', summary: '第29周党建工作周报', status: 'submitted', createdAt: '2026-07-14' },
];
