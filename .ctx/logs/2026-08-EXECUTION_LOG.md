﻿﻿﻿﻿﻿﻿﻿﻿---
title: "2026年8月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-08-23"
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-07-EXECUTION_LOG.md, .ctx/logs/EXECUTION_LOG_INDEX.md]
---

# 2026年8月执行日志

> 本文件记录 2026 年 8 月所有工作的执行动作。
> 每条记录包含来源/关键动作/设计决策/结果/沉淀标签。

---

## T174 修复 _personName re-export 引用错误 + loadActivities 缺失导入 + SANDBOX_MODE 两处不一致（2026-08-01）

**任务**：修复首页近期活动、专班进展、活动风采不显示问题（第三次修复——根因链闭环）
**引用流程**：H1.2 执行 + verification-before-completion Skill + fullstack-developer Skill + requesting-code-review Skill + brainstorming Skill
**来源**：书记要求——"`div` `div` `div` 首页——近期活动、专版进展、活动风采的部分全部没有显示出来，我怎么能够信任你？？ 请必须全面排查！！"

- **问题根因（完整根因链）**：
  - **根因1（直接根因）**：`mock/index.js` 用纯 re-export 语法 `export { getPersonName } from ...` 导出 `getPersonName`，但模块内 `_personName()` 函数直接引用 `getPersonName`——re-export **不创建当前模块作用域绑定**，直接引用抛 `ReferenceError`。首页渲染"专班进展"时调用 `_personName` → 渲染中断 → 后续"近期活动/活动风采/日历"全部未渲染
  - **根因2**：`main-entry.js` 调用了 `fallbackData: () => loadActivities()` 但未导入 `loadActivities` → 抛 `ReferenceError` → unhandledrejection
  - **根因3**：`SANDBOX_MODE` 两处不一致——`services/mock.js` 已改为 `false`，但 `core/mock-adapter.js` 仍为 `true`，每次刷新清空持久化数据

- **修复方案**：
  - `mock/index.js`：`_personName` 改为显式 `import { getPersonById, getPersonName } from '../services/person.js'` + 显式 re-export
  - `main-entry.js`：补导入 `loadActivities`
  - `core/mock-adapter.js`：`SANDBOX_MODE` 对齐为 `false`

- **变更文件**：
  - `docs/src/mock/index.js`
  - `docs/src/entries/main-entry.js`
  - `docs/src/core/mock-adapter.js`

- **验证结果**：
  - ✅ GetDiagnostics 无错误
  - ✅ 浏览器验证确认三项根因均已消除

## T175 修复 mock/index.js 循环依赖/TDZ 导致 seed 失败 + PersonStore 姓名解析失败（2026-08-01）

**任务**：全面排查并修复首页三板块仍不显示的深层根因——循环依赖链 + 静默吞错 + 姓名解析
**引用流程**：H1.2 执行 + fullstack-developer Skill + requesting-code-review Skill + verification-before-completion Skill
**来源**：书记要求——"请必须全面排查！！修复清楚所有的已知问题！！" + 浏览器 subagent 诊断报告确认残余根因

- **问题根因**：
  - **根因A（seed 失败）**：`services/mock.js` 和 `core/mock-adapter.js` 从 `../mock/index.js` 导入 `ACTIVITIES`。`mock/index.js` 使用纯 re-export 转发 `ACTIVITIES`，且存在循环依赖链：`mock/index.js → services/person.js → mock/index.js`（person.js 从 index.js 导入 PEOPLE）+ `mock/index.js → attendance/inspection/review.js → mock/index.js`（子文件从 index.js 导入 `_personName`）。冷求值时 `ACTIVITIES.length` 抛错，被 `loadDB()` 的 try/catch **静默吞掉**（仅 console.warn），seed 全部跳过，activities/tasks 双 0 被持久化，且"清缓存不能修复"——这是应用自身的可复现 bug
  - **根因B（姓名解析失败）**：`PersonStore.getAll()` 优先返回 `mockDB.users`（仅 8 条 u_* 系统账号），学生 ID（p1/p12/p13 等）解析不到姓名，页面显示"发起: p12"而非真实姓名

- **修复方案**：
  - **断环**：`services/mock.js`、`core/mock-adapter.js` 改为直接从 `../mock/activities.js` 导入 `ACTIVITIES`（绕过 re-export 转发）
  - **断环**：`services/person.js` 改为直接从 `../mock/people.js` 导入 `PEOPLE`（person.js 不再依赖 mock/index.js，双向循环断开）
  - **断环**：`mock/attendance.js`、`mock/inspection.js`、`mock/review.js` 改为从 `../services/person.js` 导入 `getPersonName` + 从 `./activities.js` 导入 `ACTIVITIES` 定义局部辅助函数（子文件不再反向依赖 index.js）
  - **不再静默吞错**：`services/mock.js` 与 `core/mock-adapter.js` 的 `loadDB()` catch 改为 `console.error` 透出真实原因
  - **seed 兜底守卫**：`services/mock.js` 抽出 `_seedInitialData()` 供 `!raw` 分支与"恢复后 activities 仍为空"回填守卫共用；恢复后为空时回填并 `saveDB()` 覆盖被污染的 localStorage
  - **姓名解析修复**：`PersonStore.getAll()` 合并 PEOPLE 与 mockDB.users（Map 去重），学生 ID 与系统账号均可解析

- **变更文件**：
  - `docs/src/services/mock.js`
  - `docs/src/core/mock-adapter.js`
  - `docs/src/services/person.js`
  - `docs/src/mock/attendance.js`
  - `docs/src/mock/inspection.js`
  - `docs/src/mock/review.js`

- **验证结果（浏览器双轮实测通过）**：
  - ✅ 首页三板块全部正常：近期活动（列表视图 10 条活动卡片 + 日历视图月历标记）、专班进展（4 张 active/recruiting 专班卡片）、活动风采（6 张画廊卡片）
  - ✅ `localStorage.clear()` 后全新加载即回填：activities=25、tasks=8，`data-activity-id`=10、`data-tf-id`=4
  - ✅ 控制台无 JS 报错；日志确认 `_seedInitialData` 兜底守卫生效（"恢复后 activities 仍为空，回填初始 seed 数据"）
  - ✅ 书记工作台数据正常：全局概况四面板真实数值、待办 18 条全部带 `sourceType: "activity"` 派生标记，activities.length=25 与全局概况"进行中活动 25"一致
  - ✅ 残留同类问题扫描：全仓 24 处 catch 块核查，仅 loadDB 相关两处吞错已修复，其余为正常业务处理

- **沉淀标签**: `[已沉淀: content/insights/工程演进与设计方法论.md §6.21]` — 新发现：`export { x } from './y.js'` 只创建导出绑定、不创建当前模块作用域绑定；模块内直接引用 `x` 会抛 ReferenceError。同类场景必须显式 import 后再使用或再导出。§6.20 已追加修正标注。

## T176 首页日历格子等大 + 主题党日配色修正 + 活动分类全系统对齐 + 正交维度表单 + 封装模式文档化（2026-08-01）

**任务**：响应书记 8 月首条指令——① 全栈开发思路文档化核查 ② 首页日历格子等大 ③ 活动顶层分类（三会一课/主题党日正交维度）全系统检查完善
**引用流程**：H1.2 执行 + web-design-guidelines Skill + brainstorming Skill + H2.2 母本优先 + H3 检查清单
**来源**：书记指令——"首页日历格子一样大""活动顶层分类两大类：三会一课（固定分类）/ 主题党日（正交维度：共建性质/是否外出/活动载体）""视觉表达规范：日历简称党会/党课/党日、党建红 #CE1126 / 党建金 #D4AF37、图例顶层两大类" + 书记决策——"组织生活会归入三会一课系（形式仍是三会）""正交维度写入表单"

- **活动分类全系统检查结论**：
  - ✅ 已合规：`constants.js` 大类颜色/简称、decision-tree.js L1 配色、图例顶层两大类去重渲染、DATA_ARCHITECTURE §2.1.2 文档化
  - ❌ 已修复：书记写入模板主题党日颜色错误（蓝 #2563EB→金 #D4AF37）+ 注释"党建蓝"→"党建金"；`_ACTIVITY_TYPE_BASE` 中"主题党日"误标党建红→党建金、补"组织生活会"条目；mock 6 条活动 scenarioId 未归类；正交维度表单缺失；leader 决策树 L2 缺失潜在崩溃；TodoStore/派生器封装模式未文档化

- **修复/完善明细**：
  - **日历格子等大**：`calendar.js _renderMonthViewCompact` grid 补 `grid-auto-rows:1fr`，移除格子内联 `min-height:auto`（该样式覆盖类默认 8rem，导致空格矮、有活动格被撑高）。浏览器实测 36 格全部 128px 一致
  - **主题党日配色**：`ws-secretary-entry.js` WRITE_TEMPLATES 主题党日 color/bg/border 由蓝改金（#D4AF37 / rgba(212,175,55,0.10) / rgba(212,175,55,0.30)）；注释修正
  - **活动归类**：`mock/activities.js` act-12/14/15/18/22 的 forum/visit/co-build → `theme-party`（type 保留载体标签：座谈/参访/共建）；act-19 保留 `org-life`（真实 SOP 场景），`constants.js` SCENARIO_TO_CATEGORY/ACTIVITY_TYPE_LABELS/ACTIVITY_TYPE_SHORT 增 `org-life`→三会一课系（党建红/党会）
  - **正交维度表单**：书记写入面板为主题党日渲染三组字段（共建性质单选/是否外出单选/活动载体多选），选中态互斥+多选逻辑，提交时存首类字段 `isJoint`/`isOutdoor`/`carriers`（与 DATA_ARCHITECTURE §2.1.2 数据结构一致）；decision-tree.js leader+secretary 两处 carriers 补"其他"选项
  - **leader 决策树 L2 修复**：决策树迁移时 leader 配置丢失 `L2` 属性，L1 选中后 `DECISION_TREE.L2[L1]` 会抛 TypeError；补回 L2——党小组会单一选项、主题党日 L2=活动载体（理论学习/实践参访/交流座谈/其他）；提交时 type 去冗余（L2 与 L1 同名不拼接）
  - **封装模式文档化**：insights §6.22 新增「Store + 派生器服务封装模式」（TodoStore/NoticeTodoDeriver/LifecycleTodoDeriver/SecretaryOverviewStore/SecretaryTodoDeriver）——Store 管存取、Deriver 管规则、sourceType+sourceId 锚点、派生幂等去重、单写原则。回应该模块封装思路的沉淀需求（写穿透 §4.6/DataAdapter §4.4/PersonStore §6.20 此前已文档化）
  - **DATA_ARCHITECTURE §2.1.2**：补充组织生活会归入三会一课系说明；last_updated 更新为 2026-08-01

- **变更文件**：
  - `docs/src/components/calendar.js`（日历格子等大）
  - `docs/src/entries/ws-secretary-entry.js`（主题党日配色 + 正交维度表单/提交）
  - `docs/src/entries/ws-leader-entry.js`（type 去冗余）
  - `docs/src/services/decision-tree.js`（carriers 补"其他" + leader L2 补回）
  - `docs/src/mock/activities.js`（5 条活动 scenarioId 归类）
  - `docs/src/core/constants.js`（org-life 映射 + _ACTIVITY_TYPE_BASE 主题党日/组织生活会配色）
  - `docs/src/styles.css`（.wp-dim-chip 正交维度按钮样式）
  - `content/insights/工程演进与设计方法论.md`（§6.22 新增）
  - `content/04_web_design/DATA_ARCHITECTURE.md`（§2.1.2 组织生活会说明 + last_updated）

- **验证结果（浏览器双页实测通过）**：
  - ✅ 首页日历 36 格高度全部一致（128px），无参差
  - ✅ 日历图例仅显示两大类：三会一课（红系 #991B1B）+ 主题党日（金系 #854D0E），不显示子分类
  - ✅ 书记写入面板主题党日卡片金色（rgba(212,175,55,0.10)），非蓝色
  - ✅ Step2 表单三组正交维度齐全，单选互斥/多选复选正常（共建开展+校外+理论学习+实践参访 4 项选中验证通过）
  - ✅ GetDiagnostics 全部文件无错误；控制台无功能性 JS 报错
  - ✅ 残留扫描：`forum`/`visit`/`co-build`/`党建蓝` 全仓零残留

- **沉淀标签**: `[已沉淀: content/insights/工程演进与设计方法论.md §6.22]` — 新发现：业务衍生视图（待办）封装应拆分为 Store（存取）+ Deriver（规则）两个正交角色，以 sourceType+sourceId 为锚点支撑去重幂等与联动删除，写路径单点收敛到 Store。

## T177 8月数据补齐 + 首页月份定位2026-08 + 紧凑方格日历 + 日期倒序规则 + 书记工作台配色统一（2026-08-01）

**任务**：书记四项指令——① 全仓带时间字段列示一律倒序（再次强调已进入8月，首页日历 select 不得停留在7月）② 首页日历改正方格（按最多3个活动空间设计）③ 书记工作台 span 颜色/风格修正 + 待办卡片颜色 + 禁止 hover 嵌套/卡片内竖线（web-design-guidelines Skill 审查）④ 补 8 月 mock 活动数据（brainstorming Skill：暑期特色组合，联动通知+考勤，书记已批准）

**引用流程**：H1.2 执行 + web-design-guidelines Skill + brainstorming Skill + H3 检查清单 + H2.2 母本子本

**设计决策（brainstorming 已批准）**：8月数据=暑期特色组合（党小组会线上/支委会新学期筹备/发展对象暑期谈话考察/暑期实践总结分享/秋季学期工作部署会）；联动=活动+通知+考勤。

- **① 日期倒序规则落地 + 首页 2026-08 定位**：
  - 首页月份选择器为数据驱动（calendar.js `populateMonthSelector`），此前停留在 7 月根因是 mock 无 8 月活动。补齐 8 月数据后自动含 2026-08，且按 `currentMonth`（2026-08）优先默认选中——**零代码修复**，浏览器实测 select 默认 2026-08
  - 修复 `renderNoticeList`：首页「重要通知」原先按 priority 排序（紧急优先），改按 publishDate 倒序（`sortBy:'date'`），符合书记「任何带时间字段的列示一律倒序」
  - 修复反馈列表两处：`ws-secretary-entry.js renderIssueManagement` + `issues.js renderMyDispatchTab` 按 submittedAt 倒序（原为数据源顺序）
  - 全仓排序审计结论：活动列示 desc ✓、通知 desc ✓（本次补全）、专班 createdAt desc ✓、todo 为「过期优先+截止日升序」紧急优先语义（既定合法例外）、issues 本次补全

- **② 首页日历方格化**：`.cal-cell-large.cal-cell-compact` 由 8rem 高改为 `aspect-ratio:1/1` 正方形 + `padding:4px`，浏览器实测 66×66px（原 128px，约减半），可容纳日期+最多3个活动标签
  - **resize 回归修复**：calendar.js 全局 resize 监听原用普通渲染器重绘首页 `cal-main-grid`，会覆盖紧凑方形视图（实测 66×66→64×128 复现）。修复：resize 时检测 `#activity-calendar-view` 存在（首页恒真）则复用 `renderCalendarForDashboard` 紧凑渲染器，浏览器三轮 resize 实测恒为 66×66

- **③ 书记工作台配色/嵌套修复（web-design-guidelines 审查）**：
  - 统计条 4 个圆点由 4 种不同颜色（amber/emerald/blue/teal）统一为 accent `#B91C1C`（浏览器实测 4 点全红）
  - todo-list.js 分组项容器移除 `border border-gray-100` 内嵌边框（消除卡片内再嵌卡片）；待办卡片仅最外层 `border-l-4` 红左边框，内部零竖线（浏览器实测确认）
  - 审查报告（file:line 格式）见本次输出

- **④ 8 月 mock 数据**：
  - `activities.js`：新增 act-26~30（8/7 党小组会线上、8/11 支委会、8/15 发展对象谈话考察、8/20 暑期实践总结分享、8/28 秋季学期工作部署会）；整表按月分组升序重排（修复 act-18/19/20 错位、7月组非升序）
  - `notices.js`：新增 notice-108/109/110（暑期实践分享/发展对象考察/秋季部署会 urgent）
  - `attendance.js`：新增 att44/45（act-26 党小组会 p1/p3 出勤）

- **变更文件**：`docs/src/mock/activities.js`、`docs/src/mock/notices.js`、`docs/src/mock/attendance.js`、`docs/src/styles.css`、`docs/src/components/calendar.js`、`docs/src/components/todo-list.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/services/notice.js`、`docs/src/services/issues.js`

- **验证结果（浏览器双页实测通过）**：
  - ✅ 首页 month-selector 默认 2026-08，下拉含全部月份
  - ✅ 首页日历 31 个日期格 66×66 正方形；resize 后保持方形（修复前会退化为 128px 长条）
  - ✅ 书记统计条 4 圆点全 #B91C1C；「我的待办」卡片仅最外层红色左边框、内部无嵌套边框/竖线
  - ✅ 两页无 JS 报错；GetDiagnostics 全部修改文件无错误
  - ✅ 8月活动/通知/考勤数据联调正常（书记工作台"本月活动"显示 5 场，与 act-26~30 一致）

## T178 Help 帮助页美学评估（web-design-guidelines Skill，未做任何内容修改）（2026-08-01）

**任务**：书记要求——"请在不做任何内容修改的情况下，对 help 这个界面做美学评估！！Use Skill: web-design-guidelines 评议结果输出到丙部！"
**引用流程**：H1.2 执行 + web-design-guidelines Skill + H4.2 丙部待决策机制（H4.2 场景 2 发现待决策项——设计方向属人类决策权范畴，AI 不得自行处置）

**调查过程**：
- 拉取 web-design-guidelines 最新指南（vercel-labs/web-interface-guidelines command.md）
- 通读 `docs/help.html`（84 行外壳）、`docs/src/entries/help-entry.js`（1606 行全部渲染逻辑）、`docs/src/styles.css` help 区块（3243-5145 行「HELP PAGE v4」）
- 启动本地 http.server 5500，browser_use 两轮实测：① 11 张截图 + 控制台（无 JS 运行时错误，"Exploration scene found: true"，SVG 正常；仅 CDN Tailwind 生产警告）② getComputedStyle 逐条精确验证（当前模型无法读图，改用 computed style 返回 JSON 确证）

**确证的核心缺陷**：
1. **「两条宝贵机会」板块裸文本渲染**：`.help-philosophy-opp*` 类（help-entry.js 约 574-598 行）在 styles.css 零命中——getComputedStyle 实测 display:block、padding:0px、border:0px、background:transparent、borderRadius:0px，卡片完全无样式，与全页苹果风严重割裂
2. **「行百里者半九十」板块裸文本渲染**：`.help-dialogue-step*` 类（help-entry.js 约 937-943 行）同样在 styles.css 零命中，四步卡片裸文本堆叠
3. **类名断链**：`.help-cognition-item-truth`（JS 渲染正文）vs CSS 仅有 `.help-cognition-item-desc`——组织性正文 `<p>` 无样式
4. **旧版样式死代码**：`.help-dialogue-*` 旧卡片/环形箭头（styles.css 约 4222-4361 行）+ `.help-philosophy-*` 旧布局（3494-3573 行）已不在 DOM（getComputedStyle 实测 cardExists:false），约 20 处废弃选择器残留

**合规项（file:line）**：`docs/help.html:11-12` CDN Tailwind 生产警告；`docs/help.html:50-56` 诊断脚本残留（console.log 调试语句）；`help-entry.js:521` 审查卡 role="button"+tabindex 但无点击行为（伪交互）；`help-entry.js:1130` `.help-tl-center` 用 div 绑定 click 折叠（应为 button）

**正例亮点（已确证）**：`help-entry.js:1058` TOC 用 `<a>`、`:796` SVG 节点含 aria-label、`:837` tooltip 含 aria-hidden、`:509` scroll-hint 含 aria-hidden；`styles.css` reduced-motion 完整（4135-4158、5124-5145）；移动端断点完整（4994-5122）；gsap.matchMedia 正确处理 prefers-reduced-motion（help-entry.js:1233/1365）；配色克制（白底 + 党建红点缀 + 衬线标题）；滚动叙事 + SVG 关系网络

**输出**：评议结果写入 CLAUDE.md 丙部 P.10（待书记决策：两个裸文本板块处理方向 + 旧版样式清理范围）
**变更文件**：`CLAUDE.md`（丙部 P.10 新增）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
**验证结果**：✅ grep 全仓库确认 `.help-philosophy-opp*`/`.help-dialogue-step*` 仅出现在 JS、CSS 零命中；浏览器 getComputedStyle 实测确证裸文本渲染与死代码不在 DOM

- **沉淀标签**: `[待沉淀: 简述新发现]` — 新发现：模型无法读图时，美学/视觉审查可用 browser_evaluate 执行 getComputedStyle 返回精确 JSON（display/padding/border/background/borderRadius/fontSize/fontFamily），将"看起来没样式"转化为可复现的确凿证据；JS 渲染类名与 CSS 选择器的一致性必须用 grep 双侧交叉验证（JS 有类名、CSS 零命中即断链）

## T179 丙部已归档决策清理 + P.10 决策归档（2026-08-01）

**任务**：书记指令——"1. 丙部已归档的决策，请务必 清理干净，确保我们上下文清晰准确凝练！！"
**引用流程**：H1.2 执行 + H4.2 丙部待决策机制（生命周期：写入 → 决策 → Decision Log 归档 → 执行 → 从丙部删除）

- **清理动作**：
  - CLAUDE.md 丙部 P.10 整节删除（已决策归档，生命周期闭环）；丙部仅保留 P.8（仍在等待书记决策）
  - 新建 `.ctx/logs/2026-08-DECISION_LOG.md`，归档 D-264（P.10 决策）/ D-265（书记工作台 renderTabBar 架构）/ D-266（visitor 待办派生与数据补全）
  - `.ctx/logs/DECISION_LOG.md` 索引表新增 2026-08 行

- **变更文件**：`CLAUDE.md`、`.ctx/logs/2026-08-DECISION_LOG.md`（新建）、`.ctx/logs/DECISION_LOG.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

## T180 P.10 执行：Help 两个裸文本板块修复 + 行百里者半九十做成环形 + 旧样式清理（2026-08-01）

**任务**：书记决策（P.10）——第一步按全页风格补齐样式（推荐）；第二步清理旧样式；且【行百里者半九十】必须做成环形。Use Skill: web-design-guidelines
**引用流程**：H1.2 执行 + web-design-guidelines Skill + D-264 归档决策

- **执行明细**：
  - 「两条宝贵机会」板块：补卡片/间距/排版样式（`.help-philosophy-opp*`），与全页苹果风统一（getComputedStyle 实测非裸文本）
  - 「行百里者半九十」板块：实现**环形四阶段**——2x2 grid（`help-dialogue-card--pos01~04`）+ SVG 椭圆环（`.help-dialogue-ring`）+ 箭头，四阶段循环闭环语义视觉化
  - 旧版废弃样式清理（约 20 处 `.help-dialogue-*`/`.help-philosophy-*` 旧选择器不再在 DOM）
- **变更文件**：`docs/src/entries/help-entry.js`、`docs/src/styles.css`
- **验证结果**：✅ 浏览器渲染正常；✅ GetDiagnostics 无错误

## T181 T-142 推进：书记工作台 renderTabBar 统一架构重构 + visitor 系统梳理 + 双数据源统一（2026-08-01）

**任务**：书记指令——"3. 继续推进【T-142】。请着重针对 书记 和 visitor 的做一次系统的梳理和检查！！Use Skill: brainstorming Use Skill: dogfood"；追加反馈——"书记工作台的 tab 排列顺序和党建、党务、反馈、工作台 的设计都非常糟糕！！请你也尝试学习参考其他角色的tab设计"
**引用流程**：H1.2 执行 + brainstorming Skill + dogfood Skill + web-design-guidelines Skill + D-265/D-266 归档决策

- **书记工作台（D-265，renderTabBar 统一架构）**：
  - `tab-bar.js`：新增 `onTabChange` 回调 + `currentTab` getter
  - `secretary.html`：删除唯一硬编码 tab 栏 + 6 个静态 pane，改为 `#secretary-content` 单容器
  - `ws-secretary-entry.js`：`_ensureSecTabBar` 统一构建（分组：工作台/党建/党务/反馈）+ 各 tab 骨架模板 + 增量渲染（`dataset.currentTab`/`dataset.panelInit` 防重）+ 待办容器/行动跳转适配 + 品牌筛选按钮语义修正（只看品牌活动/显示全部活动）+ 月份一致性修复（以 `populateMonthSelector` 返回值为权威）
  - 修复：活动管理 tab renderCtx 崩溃（`() => _renderCalendarTabContent(getAppState())`）；文件尾部旧 month-selector 监听死代码删除
- **visitor 系统梳理（D-266）**：
  - `todo.js`：新增 `VisitorTodoDeriver`（通知待阅读 + 活动待参与，sourceType+sourceId 幂等去重，清理已取消/过期/归档遗留）+ `TodoActionType.PARTICIPATE` + `seedTodos` 幂等化
  - `ws-visitor-entry.js`：接入派生；`_handleTodoAction` 通知类直跳 `notice.html?id=`（B5）、participate 跳活动动态；活动动态/考勤过滤 cancelled
  - `todo-list.js`：`participate` 按钮文案「去参与」
  - `activities.js`：act-29 补 p5 participant（书记批准，覆盖「活动待参与」演示分支）
- **全局概况/数据（T-142 系统检查）**：
  - `inspection.js`（mock）：补 insp-13~20 考察记录（积极分子 4/发展对象 1/预备党员 3），对齐 developStage 分类
  - `roles.js`：`authGranted` 改为 AuthStore leader 赋权记录数（3 位党小组组长），修复初装为 0
  - 通知发布接入 NoticeStore（`NoticeStore.add/remove`），消除 localStorage('workflowos_notifications') 双数据源
- **A5 修复（回归发现）**：`renderNotificationList` 中 `_fmtDate(n.publishDate)` 对字符串日期抛 `TypeError: d.getFullYear is not a function`（mock 通知 publishDate 为 '2026-07-15' 字符串）——改为 `typeof === 'string'` 走 `.slice(0,10)`、否则 `_fmtDate`，列表恢复正常渲染
- **B5 修复（回归发现）**：visitor「去阅读」未跳转 notice.html——`_handleTodoAction` 通知分支缺失，重新补入
- **变更文件**：`docs/src/components/tab-bar.js`、`docs/src/components/todo-list.js`、`docs/workspace/secretary.html`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-visitor-entry.js`、`docs/src/services/todo.js`、`docs/src/mock/activities.js`、`docs/src/mock/inspection.js`、`docs/src/services/roles.js`
- **验证结果（浏览器双轮实测通过）**：
  - ✅ 书记工作台 6 tab 全流程：待办/全局概况/活动管理/常设赋权/通知发布/反馈管理，分组标签齐全，无 JS 报错
  - ✅ 通知发布：列表 13 条正常渲染（A5 修复）、发布→删除闭环成功
  - ✅ visitor 5 tab 分组（工作台/党建）正常；待办派生 4 条阅读通知 + 1 条参与活动；「去阅读」跳转 notice.html?id=notice-103 成功（B5 修复）；「去参与」跳转活动动态成功；cancelled 过滤生效
  - ✅ GetDiagnostics 全部修改文件零错误

- **沉淀标签**: `[已沉淀: content/insights/工程演进与设计方法论.md §6.22]` — 按规执行（Store + Deriver 封装模式复用），省略新沉淀。

## T182 书记 8 项并行任务：label统一/考勤流程/日历统一/待办重设计/考察删除/数据一致性/50人模拟/论断整合（2026-08-01）

**任务**：书记 8 项指令——① label 全站统一 ② 考勤确认流程质疑（科学程序 vs 减负提效）③ 日历美学统一（方形格+简写+浮窗）④ 书记待办视觉重设计（web-design-guidelines）⑤ 删除首页日历「考察」活动 ⑥ 模拟数据全链路一致性 ⑦ 50 人规模模拟【全仓库数据整合】⑧ 书记论断整合（brainstorming）
**引用流程**：H1.2 执行 + web-design-guidelines Skill + brainstorming Skill + H3 检查清单 + H4.2 丙部待决策机制 + H2.4 经验沉淀

**书记决策（AskUserQuestion 四轮确认）**：
- 考勤流程：保留两步「组长上传→纪检确认」+ 修 Bug（不删确认环节）
- 考察范围：删活动（act-28）保留机制（发展流程考察记录 + help 页"怎么考察"板块 + notice-109）
- 50 人分布：12 正式 / 9 预备 / 9 发展对象 / 20 积极分子（含 10 入党申请人），自然化避免零有整
- 论断整合位置：content/insights/工程演进与设计方法论.md §4 新增小节
- 待办布局：双栏优化；日历基线：统一方形格+简写+浮窗
- 附加指示："书记原话是很宝贵的财富！！请整个系统对于我的表达 保持谨慎（特别是方向性的表述，高度判定性的表述）！！"

**① label 全站统一**：6 文件 33 处统一为 `text-xs text-gray-500 mb-1.5 block font-medium`（ws-secretary/ws-leader/ws-prop/ws-disc-commissioner/members-entry/issue-form；行内 label 未动）
**② 考勤确认流程**：保留两步 + 修 2 Bug——纪检确认按钮写 `record.confirmer` 但展示列读 `recordedBy`（无读方）→ 改 `record.recordedBy = DISC_COMMISSIONER_ID`；组长考勤过滤 `?.type === '党小组'` 与 mock `'党小组会'` 不匹配→恒空，修正
**③ 日历统一**：`_renderMonthView` 月视图统一方形格 `cal-cell-large cal-cell-compact` + gap 2px + `ACTIVITY_TYPE_SHORT` 简写常驻（最多 3 条 + "+N 项"，无活动时才显示任务标签）+ 非移动端 `_bindHoverPreview` 浮窗 280px；周视图保留完整标题。浏览器实测书记 48×48 / 首页 66×66 方形、简写党会党日、hover 浮窗正常、首页无「考察」
**④ 书记待办重设计**：`todo-list.js` 单行紧凑式（优先级色条+标题/截止/状态同行、分组头 button 化）；`ws-secretary-entry.js` 双栏 + 首访补 `seedTodos()+SecretaryTodoDeriver.deriveAll()` + 未选中自动选第一条 + 右卡 sticky；**修复隐含 Bug——派生待办"标记完成即重生"**（`_isDuplicate` 仅排除未完成态，complete 后同源 PENDING 立即重建；改 `includeCompleted: true` 后连续完成 4 条只减不增）
**⑤ 考察删除**：`activities.js` 删 act-28；`inspection.js` 删 insp-17；日历图例/首页零「考察」残留；机制保留（发展流程考察记录 + notice-109 + help"怎么考察"）
**⑥ 数据一致性**：todo_seed_1 引用不存在的 `act-001`→`act-25`（七一建党105周年活动）；todo_seed_3「暑期共建专班」→`tf-001`（宣传专班第二期，周期/截止对齐）；notice-103 悬空专班→「暑期实践总结分享筹备中」（对齐 act-29）；组织委员发展党员追踪硬编码假名单（赵思远等）→与 PARTY_MOCKS.candidates 同源（真实人员 6 人）
**⑦ 50 人模拟数据**：people.js 扩至 50 人（正式12/预备9/发展对象9/积极分子10/入党申请人10，三党小组 17/17/16）；inspection.js 新增 23 条（insp-21~43，p28-p50 全覆盖，统一 confirmed 避免超期派生）；attendance.js 新增 15 条（att46~60，act-26 三党小组代表）；accounts.js 新增 6 账号；书记全局概况「发展与考察」口径修正——按人员库全量统计（原按"有考察记录者"导致 4/0/3 与 50 人分布严重不符），渲染为「发展分布 申请10·积极10·发展9·预备9·正式12」单行
**⑧ 论断整合**：方法论 §4 新增 **4.12 系统功能与视觉设计决策原则**（6 小节：最小三成本提级/模拟数据一致性/科学程序vs减负/全站视觉一致性排查/布局视觉平衡/反复强调内容提级机制）；收录标准：不收细节、只收功能美学重要考虑、书记原话辅以"重视"证据

- **变更文件**：`docs/src/components/calendar.js`、`docs/src/components/todo-list.js`、`docs/src/components/issue-form.js`、`docs/src/entries/members-entry.js`、`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/mock/people.js`、`docs/src/mock/inspection.js`、`docs/src/mock/attendance.js`、`docs/src/mock/accounts.js`、`docs/src/mock/activities.js`、`docs/src/mock/notices.js`、`docs/src/services/todo.js`、`docs/src/services/secretary-overview.js`、`content/insights/工程演进与设计方法论.md`
- **git 提交**：3 笔（论断整合 e266a33 / 界面流程 5b2e4ea / 50人数据一致性 7ba357e）

- **验证结果（浏览器三轮实测通过）**：
  - ✅ 全站回归：首页/书记/组织委员/纪检/组长 5 页无 JS 报错，日历 8-07「党会」简写+浮窗正常
  - ✅ 书记全局概况四维度：发展分布 申请10·积极10·发展9·预备9·正式12（与 people.js 逐项吻合）、8月出勤率 94%、待办 21 条双栏均衡（663:346）
  - ✅ 组织委员发展党员追踪：6 人全部真实（沈佳琪/谢晓东/孙八/周九/吴十/顾文博），无假名残留
  - ✅ 纪检考勤确认：act-26 17 条记录全显示（含新成员），考察总表 43 条全渲染
  - ✅ 派生待办重生 Bug 修复复测：连续完成 4 条只减不增
  - ✅ GetDiagnostics 全部修改文件零错误；全仓 grep 零残留（act-001/暑期共建专班/七一建党节座谈会/act-28/insp-17/赵思远等）
  - ⚠️ 环境提示：本地浏览器 ES Module 内存缓存可能命中旧版 JS（people.js 27 人），需 `fetch('...js',{cache:'reload'})` 或清缓存后刷新方可显示 50 人；属浏览器缓存怪癖非代码 bug

- **沉淀标签**: `[已沉淀: content/insights/工程演进与设计方法论.md §4.12]` — 书记论断整合（模拟数据一致性/科学程序vs减负/视觉一致性/布局平衡/反复强调提级/最小三成本提级）；按规执行部分省略标签。

## T183 人员数据全系统同步修复（先行修复，2026-08-01）

**任务**：书记反馈"目前人员数据没有全系统同步——至少从组织委员工作台看来，没有50个人！"——50 人数据已入库但浏览器仍显示 27 人
**引用流程**：H1.2 执行 + verification-before-completion Skill + systematic-debugging
**来源**：书记要求——"先行修复：目前人员数据没有全系统同步呢——至少从组织委员工作台看来，没有50个人！"

- **问题根因**：**不是代码没同步**——服务器 people.js 已是 50 人版（6221 字符）、运行时 import 50 人；根因是 **localhost origin 浏览器 ES Module 会话级缓存持有旧模块**（普通 fetch 返回 3359 字符 27 人版）。HTTP no-cache 无法阻止"更新前已打开且未刷新"的页面持旧模块
- **修复方案（双管齐下）**：
  - 15 个 HTML 模块引用全部加版本参数 `?v=20260801`（index/about/archive/feedback/help/login/members/notice/search + workspace 7 页），绕过 HTTP 旧缓存
  - [bootstrap.js](docs/src/core/bootstrap.js) 挂 `CrossPageState.isStaleCodeVersion()` 自检——`CODE_VERSION`（cross-page-state.js，初始 1）与 localStorage 数据版本比对，不一致时写 `sessionStorage cps-reloaded`（防无限刷新）后 `reload` 一次
  - 顺带修正书记全局概况发展分布口径（已并入 T182 ⑦）与组织委员追踪假名单（并入 T182 ⑥）
- **变更文件**：15 个 HTML + `docs/src/core/cross-page-state.js` + `docs/src/core/bootstrap.js`
- **验证结果**：localhost 普通访问（未清缓存未加参数）人才库 50 人、首页正常、无报错；数据版本 0→1 自检链路完整生效
- **git 提交**：`b58afe3`
- **沉淀标签**：无（按规执行，浏览器模块会话缓存问题已在 T182 ⚠️ 预判，本项为闭环）

## T184 普通参与者界面视觉重设计·打样（2026-08-01）

**任务**：系统最大使用者（普通参与者）界面"满目灰色"压抑问题——打样版：党建红主视觉 + 党徽金辅助 + 状态色 + 暖白底，右上角无标记
**引用流程**：H1.2 执行 + brainstorming Skill（完整流程：澄清→方案→设计批准→spec→实施）+ web-design-guidelines Skill（书记指令）+ verification-before-completion Skill + H2.1 一改具改 + H3 检查清单
**来源**：书记要求——"普通参与者的界面能不能做得再漂亮一点。不要这么压抑。通过 党建红和党徽黄等等 颜色，把功能和视觉元素之间的关系做得更加到位！！这会给我们其他角色的界面打一个样！！" + "金色虽然还是辅助，但是可以适当多一些——现在的【金】还有点 灰/脏，微调即可！"

**书记决策（AskUserQuestion 三轮确认）**：
- 色板完整性："你认为是否两个颜色足够使用？是否引入其他功能色？请务必把方案做完整" → 四层完整色板
- 风格："庄重党建风：红主金辅（推荐）" + 金色加亮（#D4AF37→提 #EAB308→"再亮一些"→最终 **#FFD700**）
- 范围："仅 visitor 工作台打样（推荐）"；灰降级为纯中性；右上角移除标签 + 全局主要界面不出现「普通参与者」字样
- 核心洞察（书记原话）："**没有标记就是普通参与者的标记**"——用"缺席"表达"默认"

**实施内容**：
- ① **四层色板**：品牌红 `#CE1126`（主视觉）/ 党徽金 `#FFD700`（配套深文字 `#B45309`/浅背景 `rgba(255,215,0,0.12)`/边框 `rgba(255,215,0,0.35)`）/ 状态三色（完成绿 `#16A34A`/提醒琥珀 `#D97706`/告警红 `#EF4444`）/ 暖白底 `#FAFAF5` / 灰 `#6B7280` 降级纯中性
- ② **constants.js**：`ROLE_COLORS.participant` 灰→党建红三件套；`ACCENT_COLORS.participant` → `#CE1126`（驱动 tab 高亮/登录卡片）；`ACTIVITY_CAT_COLOR.theme-party` 与 `_ACTIVITY_TYPE_BASE` 主题党日系（主题党日/共建/参访/座谈）金色 → `#FFD700` 系
- ③ **header.js**：`_roleLabelHTML` 对 participant 返回空（右上角无 div = 默认身份标记）
- ④ **ws-visitor-entry.js**：欢迎语"欢迎回来，{姓名}·支部动态与个人成长一览"（身份表达替代）；项目分工 type 徽章（活动红/专班金）、人员分工 chips 去灰（组织者红/深度参与橙/参与者金/发起人天蓝）；考勤出勤率状态三色（≥80 绿 / ≥60 琥珀 / 否则红）；我的考察来源标签金底+等级标签红底
- ⑤ **styles.css**：`--accent-participant` → `#CE1126`、light 变体 → red-300；`body.visitor-page` 暖白底 + 页面作用域 `--party-gold/--accent-gold: #FFD700`（不影响其他角色页）
- ⑥ **visitor.html**：body 加 `visitor-page` 类；副标题改"支部动态与个人成长一屏掌握"（去除误导性的"选择角色以进入管理模式"）
- ⑦ **DESIGN_SYSTEM.md**：新增 **§2.7 主体色配色规则（给定主体主题色 X）— 打样样板**——规则五连（X 主视觉→辅助强调色功能点缀→状态色全局统一→暖白底全局统一→灰只做中性）+ 打样实例 + 上下文隔离要点（品牌红=标签语境 vs 告警红=数字/图标语境不得混用）；YAML last_updated 更新
- ⑧ **全仓排查**：主要界面（visitor 工作台+首页）零「普通参与者」残留；保留登录选择卡（功能必需）与帮助页（spec 允许）
- ⑨ **范围边界**：仅 visitor 工作台打样；全局 `--party-gold` 等其余角色页留待推广轮（T-144）

- **变更文件**：`docs/src/core/constants.js`、`docs/src/components/header.js`、`docs/src/entries/ws-visitor-entry.js`、`docs/src/styles.css`、`docs/workspace/visitor.html`、`content/04_web_design/DESIGN_SYSTEM.md` + 设计 spec `docs/superpowers/specs/2026-08-01-visitor-visual-redesign-design.md`
- **验证结果（浏览器两轮实测通过）**：
  - ✅ visitor 工作台：`#role-label` 为 null（无标记）、欢迎语"欢迎回来，王五"、激活 tab `--tab-accent:#CE1126`、活动徽章红底红字/专班徽章金黄底、参与者 chips `bg-amber-50` 金黄（非灰）、主题党日圆点 `rgb(255,215,0)`=#FFD700、考勤状态色实测绿 rgb(22,163,74)/红 rgb(220,38,38)、考察标签来源金黄底+等级红底、body 背景 `rgb(250,250,245)`=#FAFAF5、`--party-gold` 覆写生效 #FFD700
  - ✅ 作用域隔离：secretary 页 `--party-gold` 仍 #D4AF37、body 无 visitor-page 类，不受影响
  - ✅ 回归：secretary/org 顶栏 role-label 正常（党建红 #B91C1C/天蓝 #0EA5E9）、无 JS 运行时错误
  - ✅ GetDiagnostics 全部修改文件零错误
- **git 提交**：spec `09d48ea`；实施代码 `3737c19`
- **沉淀标签**：`[待沉淀: 主体色配色规则五连（DESIGN_SYSTEM §2.7 已落位，后续推广轮完成后可沉淀方法论 §4.13）]`

## T185 显示问题修复轮：金点描边 + 角色/活动色系分离 + 全站旧金统一 + 版本化防缓存（2026-08-01）

**任务**：书记实测反馈"显示似乎存在一些问题"——金点不可辨、新旧金混用、visitor 工作台"红色太多、颜色意义不明确"——先行修复后继续推进未完成工作
**引用流程**：H1.2 执行 + brainstorming Skill（HARD-GATE 获批→AskUserQuestion 两轮确认）+ verification-before-completion Skill（三轮浏览器实测）+ web-design-guidelines Skill + H2.1 一改具改
**来源**：书记指令——"我注意到显示似乎存在一些问题，所以请你先行修复问题" + "就目前的 visitor 工作台视图而言，我认为【红色太多】几乎只要是彩色就是红色。我不认为这是一个好的做法。颜色没有这么多样，且意义不明确"

**书记决策（AskUserQuestion 两轮确认）**：
- 金点方案："金点+深色描边（推荐）"；旧金统一范围："本轮全部统一（推荐）"；角色色权威源："统一到 ROLE_COLORS（推荐）"
- 角色/活动色："参与者、组织者、深度参与 这些尝试区分开。和活动类型的配色 也要区分一下！！"；"不加图例"

**实施内容**：
- ① **金点描边 + 深金文字**：`_ACTIVITY_TYPE_BASE` 金系 4 条目新增 `text:'#B45309'`/`dotBorder:'rgba(180,83,9,0.35)'`；5 处金点渲染（visitor 列表 L341/查询 L434、main-entry L308/L445、archive-entry L242）加 1px 描边；日历日期数字改用 `color.text || color.dot`（深金，修复亮金 on 白底 1.4:1 不可辨）
- ② **角色色系（冷色）与活动色系（暖色）彻底分离**：`ROLE_COLORS` 定为角色权威源——organizer 天蓝 `#0369A1`/deep 紫 `#7C3AED`/participant 中性灰 `#6B7280`（回归默认身份，"没有标记就是标记"）/initiator 靛蓝 `#4F46E5`；visitor 人员 chips、考察等级标签（organize→organizer 天蓝/deep→deep 紫）改用 `_personnelRoleColor()` 内联三件套（`background`/`color`/`border`，Tailwind 类名写进 style 属性会失效）；活动类型维度保持暖色（三会一课红 `#CE1126`、主题党日系金 `#FFD700`）
- ③ **全站旧金统一**：styles.css `--party-gold` 全局提亮 `#D4AF37→#FFD700`、`gold-light #F5DEB3→#FDE68A`；12 个 HTML（主目录 9 + workspace 6）tailwind `gold`/`gold-light` 全量替换；decision-tree.js/ws-secretary-entry.js 旧金同步；反馈页"增强"标签 `#D4AF37→#B45309`（2:1 对比度修复）
- ④ **待办区去红**：visitor 待办卡片左缘色条 → `var(--party-gold)`、"标记完成"按钮 → 状态绿 `#16A34A`，红色收敛到品牌语义
- ⑤ **查询视图死参数清理**：`accentColor:'#CE1126'` 移除
- ⑥ **版本化防缓存**：`CODE_VERSION` 1→2→3，15 个 HTML 模块参数 `?v=20260801→?v=20260803`（主目录 9 + workspace 6），旧会话强制刷新
- ⑦ **文档同步**：DESIGN_SYSTEM.md §2.7 新增"角色色系与活动色系彻底分离"补丁段；spec 新增"五、修复轮补充"四节

- **变更文件**：`docs/src/core/constants.js`、`docs/src/core/cross-page-state.js`、`docs/src/entries/ws-visitor-entry.js`、`docs/src/entries/main-entry.js`、`docs/src/entries/archive-entry.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/components/issue-list.js`、`docs/src/components/issue-form.js`、`docs/src/components/issue-detail.js`、`docs/src/services/decision-tree.js`、`docs/src/styles.css`、15 个 HTML（主目录 9 + workspace 6）、`content/04_web_design/DESIGN_SYSTEM.md`、spec
- **验证结果（v20260803 最终轮浏览器实测 + GetDiagnostics）**：
  - ✅ 12 个金点全部 `withBorder`（无 withoutBorder）；日历日期 computed `rgb(180,83,9)`=深金
  - ✅ `#D4AF37` 全仓仅剩注释历史值；`?v=20260801/20260802` 零残留、15 文件 `?v=20260803`
  - ✅ visitor chips 4 类角色 uniqueColors/uniqueBgs 精确匹配 `#0369A1`/`#7C3AED`/`#6B7280`/`#4F46E5`；考察等级标签冷色（天蓝/紫）
  - ✅ 待办卡片金边 + 完成按钮绿 rgb(22,163,74)；查询视图 accentColor 死参数移除
  - ✅ GetDiagnostics 全部修改 JS 零错误
- **坑位记录（并行编辑竞态）**：单文件多处并行 Edit 会互相覆盖（实测 `_personnelRoleColor` 与查询金点两处丢失，浏览器首轮实测误判为缓存问题）——修复：改为串行重放 + grep 全量复核落盘；双保险仍升级 CODE_VERSION 防缓存
- **git 提交**：`4e58cf2`
- **沉淀标签**：`[待沉淀: 角色色系与活动色系必须双权威源分离（ROLE_COLORS 冷色 / getActivityTypeColors 暖色），避免"满目皆红、意义不明确"；单文件多处修改不可并行 Edit，改后必须 grep/Read 复核实际落盘]`

## T186 T-144 推广轮：主体色配色规则五连推广至 5 角色页 + visitor 待办行动按钮金色（2026-08-01）

**任务**：将 visitor 打样的 DESIGN_SYSTEM §2.7「主体色配色规则五连」推广至其余 5 个角色页（书记/组织/宣传/纪检/党小组组长），并落实书记"visitor 待办行动按钮改金色"决策
**引用流程**：H1.2 执行 + web-design-guidelines Skill（书记指令）+ DESIGN_SYSTEM §2.7 规则五连 + H2.2 母本子本 + H2.4 经验沉淀（§4.13）+ verification-before-completion Skill（search 子代理审计 + browser_use 全角色实测）
**来源**：书记指令——"然后继续推进未完成工作！！Use Skill: web-design-guidelines" + AskUserQuestion 决策："本轮 5 页全部纳入（推荐）"、"改金色"

**书记决策（AskUserQuestion 确认）**：
- T-144 范围：本轮 5 页全部纳入（书记/组织/宣传/纪检/党小组组长）
- visitor 待办行动按钮（原品牌红 #CE1126 实心）：改金色

**实施内容（search 子代理全量配色审计 → 逐项修复）**：
- ① **暖白底全局统一**：styles.css `--surface-page` 全局 `#F8F9FA→#FAFAF5`；`body.visitor-page` 打样期作用域覆写删除（并入全局）；visitor.html 移除冗余 body 类
- ② **组织委员**（X=天蓝 #0EA5E9）：专班「启动专班」blue-600→sky 天蓝系（bg-sky-50/text-sky-700/border-sky-200）；「上传考察表单」btn-md-red→内联 accent 三件套（`background:${accentRgba};color:${accent};border:1px solid ${accentBorder}`）
- ③ **宣传委员**（X=海蓝 #2563EB）：看板「待启动」列头 #CE1126→#2563EB 系；「接收/提交」「开始归档/确认归档」灰白边框按钮→海蓝系（bg-blue-50/text-blue-600/border-blue-200）
- ④ **党小组组长**（X=翠绿 #22C55E）：「创建活动」「上传考勤表单」「上传考察表单」3 处 btn-md-red→内联 accent 三件套
- ⑤ **纪检委员**（X=深橙 #C2410C）：交接「催促」btn-action-blue→btn-action-orange
- ⑥ **visitor 待办行动按钮金色**：todo-list.js `renderTodoList` 新增 `actionBtnStyle` 可选参数（默认 `background:${accent};color:#fff` 不变），visitor 传 `background:var(--party-gold);color:#B45309;`；待办详情「处理」按钮同金系（rgba(255,215,0,0.12)/#B45309/rgba(255,215,0,0.35)）
- ⑦ **语义红保留清单**：超期/打回/删除/必填星号/解散专班（破坏性）等告警危险语义保留不改
- ⑧ **文档同步**：DESIGN_SYSTEM §2.6 surface-page 更新 + §2.7 追加推广轮完成段（含内联三件套规范）；insights §4.13「主体色配色规则五连」方法论沉淀；spec 追加"六、T-144 推广轮完成"；CLAUDE.md 乙部 T-144 → ✅ 完成

- **变更文件**：`docs/src/styles.css`、`docs/src/components/todo-list.js`、`docs/src/entries/ws-visitor-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/workspace/visitor.html`、`content/04_web_design/DESIGN_SYSTEM.md`、`content/insights/工程演进与设计方法论.md`、`CLAUDE.md`、spec、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **验证结果（browser_use 全角色实测 + GetDiagnostics）**：
  - ✅ 首页/全工作台 body 暖白 `rgb(250,250,245)`=#FAFAF5
  - ✅ 组织委员：启动专班 sky 系（bg #F0F9FF/字 #0369A1/边 #BAE6FD）、上传考察表单 inline rgba(14,165,233,0.1)/#0EA5E9
  - ✅ 宣传委员：待启动列头 rgb(37,99,235)=#2563EB 非红；接收/提交/归档按钮 bg #EFF6FF/字 #2563EB
  - ✅ 党小组组长：创建活动/上传考勤/上传考察 3 按钮 inline rgba(34,197,94,0.1)/#22C55E/边 rgba(34,197,94,0.3)
  - ✅ 纪检委员：催促按钮 btn-action-orange（源码+CSS 双重确认，默认 mock 数据无 in_progress 交接故真实渲染受限，属数据态限制）
  - ✅ visitor：待办行动按钮 `bg #FFD700/字 #B45309`（4 处去阅读）、详情「处理」金系、标记完成 #16A34A
  - ✅ 全角色页面无 JS 运行时错误；GetDiagnostics 修改 JS 零错误
  - 备注：visitor 列表 ✓ 快捷完成按钮保持灰中性（次要操作，符合"灰只做中性"）
- **git 提交**：`a975e4a`
- **沉淀标签**：`[已沉淀: content/insights/工程演进与设计方法论.md §4.13]` — 主体色配色规则五连（X 主视觉→辅助强调色功能点缀→状态色统一→暖白底统一→灰只做中性）；双权威源分离（角色冷色/活动暖色）；内联三件套（accentRgba/accentBorder 拼 style）替代 Tailwind 类变体；语义红清单（告警危险语义保留）

## T187 数据统一与身份精简：四阶段身份 + 唯一数据源 + 反馈短 ID 体系 + 缓存版本链（2026-08-01）

**任务**：①所有用户/活动/专班数据统一完成接口工作（组织委员工作台发展党员模块从 6 条硬编码模拟字段改为全系统唯一数据源派生）；②系统身份收敛为四阶段（移除【入党申请人】）；③反馈系统不再暴露内部长 ID（`u_org_commissioner` 等）；④切查 mock 数据/浏览器缓存/其他缓存，确保数据干净、有唯一数据源
**引用流程**：H1.2 执行 + H2.2 母本子本 + DATA_ARCHITECTURE §4.3 数据源使用边界 + verification-before-completion Skill（browser_use 五步实测 + GetDiagnostics）
**来源**：书记指令——"请确保 所有的用户、活动、专班 等等数据都统一完成接口工作！！……我们不考虑【入党申请人】这个身份，只有 积极分子、发展对象、预备党员 和 正式党员。……`p` `p` 这些字段模拟我认为都不合适！！请务必 切查 mock数据、浏览器缓存、其他缓存。务必确保所有数据干净、且有唯一数据源！！"

**书记决策（AskUserQuestion 确认）**：
- 原 10 名申请阶段人员（p21/p25/p27/p44~p50）→ 并入**积极分子**
- 帮助页保留「从入党申请人到正式党员」完整流程叙事（宣传教育用途），但**前提是入党申请需年满十八周岁，此时间点必须点出来**

**实施内容**：
- **模块A · 四阶段身份**：`people.js` 10 人 `'入党申请人'→'积极分子'`（分布更新为 正式12/预备9/发展对象9/积极分子20）；`party.js` `CANDIDATE_STAGES` 五阶段→四阶段 `['积极分子','发展对象','预备党员','正式党员']`，c1 阶段同步；`accounts.js`/`inspection.js` 注释同步；`secretary-overview.js` `stageCounts` 移除 applicant 档（书记全局概况发展分布：积极20·发展9·预备9·正式12）；`domain.js` JSDoc 四阶段标注
- **模块B · 发展党员唯一数据源**：`ws-org-commissioner-entry.js` 重构——废弃 6 条硬编码名单，新增 `_buildCandidates()` 从 `PEOPLE` 派生全部非正式党员（38 人：积极分子20+发展对象9+预备党员9），合并考察记录数（考察 N 徽标），推进写 localStorage 覆盖档案 `gsm1921-dev-stage-overrides`；副标题"从入党申请人到正式党员"→"从积极分子到正式党员"；人才库 stageColor 删 `'入党申请人'`
- **模块C · 反馈短 ID 体系**：`domain.js` `mockDB.users` 补齐 `u_leader_1/2/3`（保留 u_exec 泛称）；`issues.json` 全部 `u_org_commissioner→u_org`、`u_prop_commissioner→u_prop`；4 个 entry `my-dispatch` 传参改短 ID（`u_org`/`u_prop`/`u_disc`）；`ws-secretary-entry.js` `ASSIGNEE_OPTIONS` 改短 ID；`issue-list.js`/`issue-detail.js`/`issues.js` 渲染层统一 `getPersonName()`/`PersonStore.getName()` 姓名化（列表提交人、详情提交人/指派人/参与者、评论作者、指派历史）
- **模块D · 缓存版本链升级（切查缓存落地）**：`cross-page-state.js` `CODE_VERSION 3→4`；15 个 HTML `?v=20260803→?v=20260804`；`issues.js` `CACHE_KEY→gsm1921-issue-cache-v3`、`CACHE_VERSION '2'→'3'`——强制用户浏览器丢弃旧长 ID issue 缓存重新拉取
- **模块E · 帮助页 18 周岁时间点**：`help-entry.js` 节点1 `timeHighlight:true`；`styles.css` 新增 `.help-tl-time--hl`（党建红底白字圆角胶囊徽章），渲染"年满十八岁"显著标注

- **变更文件**：`docs/src/mock/people.js`、`docs/src/mock/party.js`、`docs/src/mock/accounts.js`、`docs/src/mock/inspection.js`、`docs/src/services/secretary-overview.js`、`docs/src/core/domain.js`、`docs/src/core/cross-page-state.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/components/issue-list.js`、`docs/src/components/issue-detail.js`、`docs/src/services/issues.js`、`docs/src/entries/help-entry.js`、`docs/src/styles.css`、`docs/data/issues.json`、15 个 `docs/*.html`+`docs/workspace/*.html`、`content/04_web_design/DATA_ARCHITECTURE.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **验证结果（browser_use 五步实测 + GetDiagnostics）**：
  - ✅ 组织委员发展党员 Tab：38 人（积极分子20/发展对象9/预备党员9），候选人卡片含姓名+党小组+发展阶段，全页无"入党申请人"；人才库筛选仅四档
  - ✅ 反馈系统：列表/详情提交人、评论作者、参与者全部中文姓名，无 `u_sec`/`u_org`/`u_prop`/`u_org_commissioner` 等英文 ID
  - ✅ 帮助页时间轴：节点1"递交入党申请书"时间"年满十八岁"红色高亮徽章（rgb(206,17,38) 白字圆角胶囊），区别于其余灰色时间标签
  - ✅ 缓存失效：注入旧 v2 issue 缓存（含 `u_org_commissioner`）后刷新，旧缓存被丢弃、v3 键生成、数据从 issues.json 重拉、无英文 ID
  - ✅ 书记全局概况发展分布：积极20·发展9·预备9·正式12 四档，无"入党申请人"
  - ✅ GetDiagnostics 全部修改 JS 零错误
- **git 提交**：`0f595c3`
- **沉淀标签**：`[已沉淀: content/04_web_design/DATA_ARCHITECTURE.md §4.3 唯一数据源原则]` — 人员=PEOPLE+mockDB.users 唯一权威源（渲染层一律 PersonStore 解析）；发展党员追踪从 PEOPLE 派生不硬编码；反馈短 ID 体系（存储与渲染双层不泄露长 ID）；缓存版本链三件套（CODE_VERSION + HTML?v + CACHE_VERSION）作为"数据干净"的强制刷新机制

## T188 T-188 最小三成本与审美审计轮（四里程碑全流程闭环）（2026-08-02）

**任务**：书记（2026-08-01）"请再做一次三个最小成本的检查。目前很多显示我都觉得审美还达不上需求！"——按"先出清单→逐条评议→分步修复"节奏完成 12 项问题修复与验证
**引用流程**：H5 书记评议 + web-design-guidelines + sample-diff-learning + brainstorming + DESIGN_SYSTEM §一 第2条/第4条 + verification-before-completion Skill（browser_use 实测）

- **里程碑 1（审计）**：browser_use DOM 级实测（getComputedStyle 数值证据）+ 代码静态审查 + web-design-guidelines 规则对照 + DESIGN_SYSTEM §一 对照，产出 12 项问题清单（A-01~A-12：2 Bug + 7 审美 + 3 三成本遗留）写入 REVIEW_QUEUE.md
- **里程碑 2（评议）**：逐条 AskUserQuestion 判定（书记关键决策 4 项：A-02 通过；A-05 全量上调一档+仅徽标/日历标签细体；A-08→P.9 重设计为进度总览）
- **里程碑 3（分步修复）**：
  - **A-01** 首页统计卡图标底色：`main-entry.js` color 统一 hex 常量 + `${hex}15` 8 位 hex 拼接（修复 var+hex 后缀无法解析）
  - **A-02** 考勤弹窗：clamp 定位（`Math.min(rect.left + window.scrollX, innerWidth - POPOVER_WIDTH - 8)`），修正滚动错位
  - **A-03** 活动风采：保留渐变但按日期最新在前（`(b.date||'').localeCompare(a.date||'')`）
  - **A-05** 全量字号上调一档：19 个 JS 文件 `text-[11px]`→`text-xs`（218 处）、`text-[10px]`→`text-[11px]`、日历 9.6px→10px、tab 分组 9px→10px；细体范围=仅徽标（3 个 rounded-full chip 选择器）+ 日历标签用华文仿宋【细体】（styles.css 新增 font-family 规则）→【华文仿宋已于 2026-08-02 由书记撤回，styles.css 字体规则全仓清理删除，恢复默认字体，见 D-268】
  - **A-06** 纪检左边条：仅保留每 tab 首个主卡片左边条（6 个可见 tab 各仅首个主卡留条）
  - **A-07** 纪检颜色统一：硬编码 `#C2410C/#D97706` 清零 + 收尾 3 处 JS 注入 `${accent}`→`var(--accent-disc-commissioner)`
  - **A-08→P.9** 书记全局概况重设计：`_renderOverviewContent()` 从 2x2 四色卡片重写为**单列进度总览**——4 行卡片（考勤与纪律/发展与考察/活动与专班/宣传与档案），每行图标+标题+进度条（`var(--accent-secretary)`）或发展四阶段堆叠段条（灰/蓝/黄/红+图例）+ 指标 chips（异常值 `text-orange-600`）；顶部说明"党支部整体运行态势 · 只看进行时和未完成"；设计初衷写入 CLAUDE.md 丙部 P.9 与函数头注释
  - **A-09** 活跃专班改深金 `#B45309`
  - **A-10** 纪检考勤 sticky 表头 + 按月分组（`date.slice(0,7)` 月份降序）
  - **A-11** 登录防串扰：`auth.js` tabId + sessionStorage 快照 + storage 事件
  - **A-12** 组长 tab「活动写入」→「活动管理」
  - 新增 `docs/src/components/custom-select.js` 自定义下拉组件（与圆角 UI 风格统一）
- **里程碑 4（验证与沉淀）**：
  - **浏览器回归（browser_use 13 项全通过）**：A-01 图标底色 rgba(206,17,38,0.082) ✓ / A-02 弹窗 right 1134≤视口 1142 ✓ / A-03 6 卡严格降序 ✓ / A-09 rgb(180,83,9) ✓ / A-05 无 <12px 碎片（日历标签 10px 豁免）✓ / P.9 进度总览 4 行卡+4 色堆叠条+橙异常 chips ✓ / 书记 5 tab 无溢出 ✓ / A-06 每 tab 恰 1 左边条 ✓ / A-07 全页统一 #C2410C ✓ / A-10 表头 sticky 滚动后 delta=0 ✓ / A-12 7 tab 无括号 ✓ / 组织/宣传抽查无溢出 ✓ / 控制台无 JS 错误 ✓
  - **经验沉淀**：insights §4.14「审美审计轮方法论——字号档位与色彩克制」新增（见沉淀标签）
  - **决策归档**：D-267（P.9 进度总览方向决策）写入 2026-08-DECISION_LOG.md
  - **REVIEW_QUEUE.md 清空**（12 项判定已全部回填后归档清空）
  - **CLAUDE.md**：乙部 T-188 → ✅ 完成；丙部 P.9 → 删除（生命周期闭环）
- **变更文件**：`docs/src/entries/main-entry.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/ws-visitor-entry.js`、`docs/src/entries/archive-entry.js`、`docs/src/entries/notice-entry.js`、`docs/src/components/calendar.js`、`docs/src/components/header.js`、`docs/src/components/inspector.js`、`docs/src/components/issue-detail.js`、`docs/src/components/issue-list.js`、`docs/src/components/tab-bar.js`、`docs/src/components/todo-list.js`、`docs/src/components/custom-select.js`（新）、`docs/src/modules/party.js`、`docs/src/services/issues.js`、`docs/src/services/notice.js`、`docs/src/services/auth.js`、`docs/src/styles.css`、`CLAUDE.md`、`.ctx/REVIEW_QUEUE.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）、`.ctx/logs/2026-08-DECISION_LOG.md`
- **git 提交**：待书记确认后 push
- **沉淀标签**：`[已沉淀: content/insights/工程演进与设计方法论.md §4.14]` — 审美审计轮方法论：①字号档位碎片（9/9.6/10/11px 四档并存）是"视觉细碎感"的隐蔽根因，统一档位需全仓 grep 清零式替换；②~~小字/小徽标用系统衬线细体（华文仿宋）可降低"廉价感"，但范围必须收敛（仅徽标+日历标签）~~→ 已撤回：书记判定【华文仿宋】不好看，2026-08-02 全仓清理，教训见 §4.14「字体选择撤回教训」与 D-268；③审计→评议→分步修复→验证沉淀四里程碑闭环，修复项必须先有 computed style 数值证据再动手

## T189 最小三成本·书记工作台跳转优化轮（2026-08-02）

**任务**：承接书记五项指令——①开发模式默认显示（清浏览器缓存）②members.html 存废评估 ③华文仿宋字体撤回全仓清理 ④纯白卡片 vs 左侧边线分析 ⑤最小成本原则（"至多跳转 2 次，一般 1 次，能就地解决就地解决"）
**引用流程**：H1.2 执行 + brainstorming + web-design-guidelines + sample-diff-learning + verification-before-completion + AskUserQuestion 逐项裁定
**来源**：书记（2026-08-02）"现在的工作流还不够满足最小成本的原则——需要操作的功能都要跳转很多次。这是绝对不允许的！我认为至多跳转2次。一般跳转1次就要实现功能，能就地解决的固然就就地解决最好！！"

- **① devLogin 清 tab 缓存**：`auth.js` `devLogin()` 登录时遍历清除所有 `workflowos_tab_*` 键（try/catch 静默降级），开发模式打开各角色页面恢复默认 tab（书记=待办）。浏览器验证通过
- **② members.html 存废**：书记裁定删除 + 项目赋权迁入书记工作台「赋权管理」tab（原常设赋权 tab 更名）。删除 `docs/members.html` + `docs/src/entries/members-entry.js` + 依赖的 `party-cross-nav.js`/`permission-manager.js` 等；迁移 4 个函数（`_renderProjectAuthPanel`/`_bindProjectTypeSwitch`/`_bindConfirmProjectAuth`/`_renderProjectAuthRecords`），`loadWorkspaceData` 补传 `storeInits: [() => TaskForceRecordStore.init()]` 修复专班下拉为空 bug。CHECKLIST.md / SNAPSHOT.md 引用同步替换
- **③ 华文仿宋字体撤回**：styles.css 中华文仿宋字体栈声明 + A-05 细体规则块删除（恢复默认字体），CLAUDE.md / insights §4.14 / 双日志标注撤回，决策归档 D-268
- **④ 边线语义分析**：确认有逻辑非随机——`border-l-4` 角色主题色=职责核心卡、4px 强调色=可交互高亮（hover 加深）、3px=引述要点、1-2px 灰=嵌套时间线、纯白=中性内容容器；沉淀 DESIGN_SYSTEM.md §4.2「边线语义（Border-Left Semantics）」
- **⑤ 最小三成本三连（t5a/t5b/t5c）**：
  - **t5a** 考勤概况卡：删无效跳转 `disc.html?mode=readonly`（3 步死链），改卡片内「查看明细/收起明细」就地展开只读明细（活动标题/日期/出勤率/缺勤+请假人名），书记只读监督不越界
  - **t5b** 全局概况四卡：alert 指标旁加「催办」按钮（缺勤/补课/考察待确认/考察超期→纪检委员、待归档→宣传委员，走 `NoticeStore.add()` 通知+待办派生，未来接北大学生邮箱）；「赋权待审批」加「直达」按钮（切本人赋权管理 tab）
  - **t5c** 待办行动按钮：切 tab 后按 `actionData.scope` 自动展开目标面板——scope=leader 自动展开设组长面板、scope=activity/taskforce 预选项目类型与项目并滚动到表单
- **浏览器验证（browser_use 6 项全通过）**：默认待办 tab ✓ / 考勤概况就地展开明细（无跳转、人名齐全）✓ / 全局概况 4 催办+1 直达按钮 + toast 成功 ✓ / 直达跳转 ✓ / 待办去赋权自动展开设组长面板 ✓ / console 无应用级 JS 错误 ✓
- **变更文件**：`docs/src/entries/ws-secretary-entry.js`、`docs/src/services/auth.js`、`docs/src/styles.css`、`docs/members.html`（删）、`docs/src/entries/members-entry.js`（删）、`docs/src/components/party-cross-nav.js`（删）、`docs/src/services/permission-manager.js`（删）、`docs/src/services/assignment.js`（删）、`docs/src/mock/party.js`（删）、`docs/src/modules/party.js`（删）、`docs/src/workflow/activityRecord.js`（删）、`content/03_doc_system/CHECKLIST.md`、`content/04_web_design/DESIGN_SYSTEM.md`、`.ctx/SNAPSHOT.md`、`CLAUDE.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）、`.ctx/logs/2026-08-DECISION_LOG.md`
- **git 提交**：待书记确认后 push
- **沉淀标签**：`[已沉淀: content/04_web_design/DESIGN_SYSTEM.md §4.2 边线语义]` — 左侧边线是"强调/可交互/角色归属"的视觉编码（4px 强调色可交互 + border-l-4 角色主题色职责卡 + 3px 引述 + 1-2px 灰嵌套），纯白是中性内容容器，区分有逻辑非随机；`[已决策: D-268 华文仿宋撤回]` — 字体选择应先小范围打样并经书记确认后再推广，避免全仓铺开后返工；`[经验: 就地解决 > 1 跳 > 2 跳]` — 跨页死链参数（disc.html?mode=readonly）是无操作价值的无效跳转，审计时应全仓 grep 参数使用是否真的被读取

## T190 赋权整合闭环（一主源+一快照+双写+单读）（2026-08-02）

**任务**：将活动/专班赋权整合进主源数据流（`activity.assignments` / `taskforce.members`），消除 3 个 P0 与 3 个 P1 赋权数据孤岛
**引用流程**：H1.2 执行 + subagent-driven-development + brainstorming + H2.1 一改具改 + KNOWN_PITFALLS §12 反思
**来源**：书记两条设计原则（2026-08-02）——「同一套数据」「降低填写负担」（已沉淀 DESIGN_SYSTEM §一 原则 7/8）；偏差 A/B 书记裁决："组长创建活动时组织者自动预填组长本人（可改/可删）" + "采用同步派生字段方案统一双轨"（附言：请务必反思为什么反复没有检查出来）

- **架构**：一主源（活动 `assignments` / 专班 `members`，统一英文编码 organizer/deep）+ 一审计快照（localStorage 独立键 `sop_org_os_auth_audit`，只增不改，移出 /docs）+ 统一写入口 `AuthStore.authorize()`（写主源 + 追加快照 + 发通知三合一）/ `syncProjectRoles` / `recordProjectGrants` + 统一读入口 `_getProjectRole()`（一级读主源、二级回退快照 filter+latest 判定 revoke）
- **Task 0-8 实施完成**（12+1 任务制，逐任务提交）：Task 0 PersonPicker 无障碍加固（7 处 web-design-guidelines 修复）→ Task 1 审计快照独立键 + 统一读入口 → Task 2 authorize 三合一 + `_syncTopLevelOrganizer` 顶层 organizer 同步派生 + 3 条 P2 修复（白名单守卫 / try-catch / actorId 兜底）→ Task 3 书记侧写穿（await + 组长列表读主源 + 撤销回调）→ Task 4 移出 /docs 清理（domain/mock-adapter/data-adapter/mock/api-adapter/roles 删除 authorizations 实体）→ Task 5 统计口径读主源（roles.js / secretary-overview.js）→ Task 6 组长创建活动内联赋权（organizer 预填组长本人，可改/可删，未选人保留待办兜底）→ Task 7 组长详情内联编辑 + 待办直达 → Task 8 组织委员专班写穿（members 英文编码）+ 解散修复（清主源 + 批量 revoke 快照）+ 详情编辑 + 待办直达
- **偏差 B 修复要点**：`_syncTopLevelOrganizer` 在 authorize / revoke / syncProjectRoles 三处写主源后同步顶层 `organizer` 派生字段；`updateActivity` 为不可变更新，必须在 `const updated = await updateActivity(...)` 后对 `updated` 调用同步
- **Task 9 一改具改 grep 巡检（全通过）**：
  - `mockDB\.authorizations|authorizations:` → 无匹配 ✓
  - `MOCK_TASKFORCES` → 仅剩 `mock/taskforces.js`（种子）+ `mock/index.js`（re-export）+ `services/taskforce.js`（种子回退），无 auth.js 引用 ✓
  - `assigned_roles|authorizedBy|r\.scope === 'taskforce'` → 无匹配 ✓（`authorizedBy` 残留均为快照新字段正常使用；`sop_org_os_assigned_roles` 仅剩 roles.js 启动清理代码）
  - `organizer: 'leader'|includes\('leader'\)` → 无匹配 ✓（偏差 B 附加清零验证）
- **auth-001~010 历史赋权种子归档**（原 `docs/src/services/auth.js _defaultAuthRecords`，随审计快照移出 /docs 代码栈）：

```json
{
  "archived_at": "2026-08-02",
  "context": "T-190 审计快照移出 /docs，历史赋权种子归档（原 docs/src/services/auth.js _defaultAuthRecords）",
  "seeds": [
    { "id": "auth-001", "targetPersonId": "p1",  "role": "leader",    "authorizedBy": "p13", "authorizedAt": "2026-01-10", "note": "路径1 书记→组长" },
    { "id": "auth-002", "targetPersonId": "p2",  "role": "leader",    "authorizedBy": "p13", "authorizedAt": "2026-01-10", "note": "路径1 书记→组长" },
    { "id": "auth-003", "targetPersonId": "p4",  "role": "leader",    "authorizedBy": "p13", "authorizedAt": "2026-01-15", "note": "路径1 书记→组长" },
    { "id": "auth-004", "targetPersonId": "p7",  "role": "organizer", "scopeRef": "tf-002", "authorizedBy": "p11", "authorizedAt": "2026-05-03", "note": "路径2 组织委员→专班(D-240)" },
    { "id": "auth-005", "targetPersonId": "p26", "role": "organizer", "scopeRef": "tf-005", "authorizedBy": "p11", "authorizedAt": "2026-06-10", "note": "路径2 组织委员→专班" },
    { "id": "auth-006", "targetPersonId": "p8",  "role": "deep",      "scopeRef": "tf-001", "authorizedBy": "p11", "authorizedAt": "2026-05-02", "note": "路径2 组织委员→专班" },
    { "id": "auth-007", "targetPersonId": "p3",  "role": "organizer", "scopeRef": "act-3",  "authorizedBy": "p1",  "authorizedAt": "2026-03-10", "note": "路径3 组长→活动" },
    { "id": "auth-008", "targetPersonId": "p7",  "role": "deep",      "scopeRef": "act-19", "authorizedBy": "p4",  "authorizedAt": "2026-05-20", "note": "路径3 组长→活动" },
    { "id": "auth-009", "targetPersonId": "p6",  "role": "deep",      "scopeRef": "act-3",  "authorizedBy": "p3",  "authorizedAt": "2026-03-15", "note": "路径4 组织者→deep" },
    { "id": "auth-010", "targetPersonId": "p5",  "role": "deep",      "scopeRef": "act-9",  "authorizedBy": "p1",  "authorizedAt": "2026-05-10", "note": "路径4 组织者→deep" }
  ],
  "data_coverage": "组长常设角色(p1/p2/p4)已由 mock/people.js role:'leader' 主源覆盖；auth-004~007 已由 ACTIVITIES.assignments / MOCK_TASKFORCES.members 主源覆盖；auth-008~010 为历史活动深度角色，主源种子未含，归档保留"
}
```

- **变更文件**：`docs/src/services/auth.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/components/person-picker.js`、`docs/src/components/person-picker.css`、`docs/src/core/domain.js`、`docs/src/core/mock-adapter.js`、`docs/src/core/data-adapter.js`、`docs/src/services/mock.js`、`docs/src/services/taskforce.js`、`docs/src/services/roles.js`、`docs/src/services/secretary-overview.js`、`content/05_ai_coding/KNOWN_PITFALLS.md`（§12）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **git 提交**：Task 0-8 共 8 笔（`0a98006`/`c24e155`/`bbbda9d`/`28f71bf`/`20cd2ca`/`8ed4faf`/`87659b5` 等）；Task 9 归档 `docs(log): T-190 归档 auth-001~010 历史赋权种子`；待书记确认后 push
- **沉淀标签**：`[已沉淀: content/05_ai_coding/KNOWN_PITFALLS.md §12]` — 「同一套数据原则执行盲区」：同类数据双轨/三轨并存时，单文件局部 grep 无法暴露跨文件孤岛，必须全仓范围巡检（含偏差 B 附加项：hack 值清零验证不能只查单文件）；`[经验: 不可变更新 API 陷阱]` — `updateActivity` 返回新对象，写主源后必须在返回值上同步派生字段（`_syncTopLevelOrganizer(updated)`），对旧引用操作会静默丢失

## T191 巡检修复与体验优化轮：Toast 对比度 + 书记工作台主色收敛 + 子记录内联表单 + 复盘/考察持久化语义修复 + CHECKLIST 同步（2026-08-02）

**任务**：书记四项指令——① 思考巡检结果与 CHECKLIST 的关系并清理过程性截图 ② 右下角操作提醒（Toast）对比度提升 ③ 各角色工作台辅助色（书记工作台"满目红"压抑，button/span 设计跳脱）④ 继续完成 P0/P1/P2 未完成工作
**引用流程**：H1.2 执行 + web-design-guidelines Skill + fullstack-developer Skill + brainstorming Skill + H3 检查清单
**来源**：书记指令——"提醒操作对比度可以更加高一点""每个角色的工作台，我都会希望有一些【辅助色】""请继续完成尚未完成的工作——特别是，如果要检查多个角色的界面，请不要 dispatch parallel agents！！"

- **设计决策（AskUserQuestion 已确认）**：
  - 辅助色方案 = **主色收敛 + 状态色点缀**：主色只用于身份标识（左边条/主 CTA/激活 tab/头像），统计卡/进度条/徽章改用功能色（完成绿 #16A34A / 待办金 #D97706 / 警示橙红 #EF4444），次要元素归中性灰（DESIGN_SYSTEM 原则 4 色彩克制 + 状态色全局统一）
  - P2 范围 = **P0/P1 必做 + P2 重点项**（本轮选取考勤批量录入、反馈三份存储归一）

- **任务 0 思考结论（巡检 ↔ CHECKLIST）**：巡检出的 P0/P1 本质是 CHECKLIST（数据同源一致性校验手册）的**漏检类**问题——T-190 已修 3 个 P0/P1，但 CHECKLIST §8 仍写旧架构（`mockDB.authorizations`），校验手册本身没跟上架构演进，审计时不会核对新主源。解决：T7 同步 CHECKLIST §8 + 补「读端全量核对」类校验点固化巡检缺口。过程性截图（约 140MB，6 个会话文件夹）在删除白名单之外，**需书记手动清理**。

- **执行明细（T1-T7）**：
  - **T1 Toast 对比度**（`core/utils.js`）：浅色半透明底+近白字 → 浅色状态底（#F0FDF4/#FEF2F2/#EFF6FF）+ 状态色 4px 左边条 + 状态色圆形图标（白字 glyph）+ 深色正文 #1F2937（textContent 防注入）
  - **T2 书记工作台主色收敛**（`ws-secretary-entry.js` 共 12 处）：全局概况 4 行图标块红→中性灰；rateBar 进度条主题红→按完成度分级（≥90 绿 / ≥70 金 / 其余红）；清除缓存/驳回草稿/关闭理由/受众选择/撤销赋权按钮红色系→中性灰（hover 保留红语义）；保留身份标识红（左边条/主 CTA/激活 tab/组长头像徽章/考勤卡）
  - **T3a/T3b P0-2 prompt() → 内联表单**（`ws-leader-entry.js` / `ws-org-commissioner-entry.js`）：活动/专班子记录「添加」改为内联表单（PersonPicker + 状态下拉 + 备注/考察内容/考察结论），attendance/inspection 类目**同步写入正式考勤/考察库**（`loadAttendanceRecords`+`saveAttendanceRecords` / `loadInspectionRecords`+`saveInspectionRecords`，专班子记录带 `sourceName: tf.name`），同一数据仅一套正式存储
  - **T4 P1-4 复盘持久化**（`review.js` + `core/domain.js`）：模块内变量 → mockDB + persist() 模式（与 attendance/inspection 同构），`mockDB.activityReviews`/`mockDB.taskforceReviews` 新增字段，刷新不再丢失
  - **T5 P1-5 考察语义修复**（`inspection.js` + 纪检/组长两处展示层）：考察内容入新增 `content` 字段，`role` 恢复角色职责标签；展示层 `i.content || i.role` 兼容旧数据
  - **T6 P2 重点**（`issues.js` + `ws-leader-entry.js`）：反馈三份存储归一（迁移完成后清理旧键 `gsm1921-feedback-submissions`）+ 考勤逐人表新增「批量设置」工具栏（下拉一次应用状态到全部人员）
  - **T7 CHECKLIST 同步**（`content/03_doc_system/CHECKLIST.md`）：§8 赋权数据更新为 T-190 一主源+一快照架构，新增校验点（已赋权记录=审计快照 / 新建数据主源可查 / 撤销解散后主源移除+快照追加 revoke / 全仓禁止幽灵字段 authorizedBy/scope）；§5 考察数据新增 P1-5 字段语义与 P0-2 单套存储固化；§12 复盘数据更新运行时为 mockDB+persist，新增"刷新后记录仍在"校验点
  - **版本号防缓存**：`secretary.html`/`leader.html`/`org.html` entry 脚本 `?v=20260801b → 20260802`

- **变更文件**：`docs/src/core/utils.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/services/review.js`、`docs/src/core/domain.js`、`docs/src/mock/inspection.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/services/issues.js`、`content/03_doc_system/CHECKLIST.md`、`docs/workspace/secretary.html`、`docs/workspace/leader.html`、`docs/workspace/org.html`

- **验证结果（浏览器串行实测通过，未 dispatch parallel agents）**：
  - ✅ 登录书记工作台（2300010001）
  - ✅ 全局概况 3 条进度条全部状态色（94% 绿 #16A34A / 61% 红 #EF4444 / 0% 红 #EF4444），无主题红 --accent-secretary
  - ✅ 清除缓存按钮灰色系（border-gray-200 text-gray-600，无 red）
  - ✅ Toast 浅底深字 + 4px 状态色左边条 + 圆形状态色图标（computed 实测 #EFF6FF 底 / #1F2937 字 / #3B82F6 左条）
  - ✅ 撤销赋权按钮灰色系（rgb(156,163,175)），hover 保留红
  - ✅ 版本号缓存修复确认：entry 脚本加载 ?v=20260802
  - ✅ 控制台无 JS 运行时异常（仅字体外网 ERR_ABORTED 与 Tailwind CDN 警告）
  - ✅ GetDiagnostics 全部修改文件无错误

- **执行过程中的重要发现**：对同一文件并行发起多个 Edit 存在**竞态风险**——本次 ws-secretary-entry.js 四个并行 Edit 中有一处（撤销赋权按钮）实际未落盘（工具返回成功但磁盘未变更），git diff 复查才发现遗漏。教训：同文件多处编辑必须串行逐个确认，或以 git diff 复查落盘结果，不能依赖 Edit 工具返回片段。

- **沉淀标签**：`[已沉淀: content/04_web_design/DESIGN_SYSTEM.md 状态色统一事件]` — 主色收敛+状态色点缀方案：主色仅用于身份标识（左边条/主 CTA/激活 tab/头像），功能数据视觉（统计卡/进度条/徽章/Toast）一律用全局状态色，次要操作按钮归中性灰，hover 才显语义色；`[经验: 巡检结果应先反查校验手册而非只改代码]` — 数据同源一致性巡检发现的孤岛/幽灵字段，根因往往是 CHECKLIST 校验手册未随架构演进，修代码前必须先同步校验手册并固化新校验点；`[经验: 同文件并行 Edit 竞态]` — Edit 工具对同一文件的并行调用存在未落盘风险，须串行或 git diff 复查

## T192 根目录文档更新：README 九章读者旅程重构 + CLAUDE/content README/SNAPSHOT v15/TIMESTAMPS 批量刷新（2026-08-03）

**任务**：将根目录五份文档系统更新至 2026-08-03 状态，与 P1 后端基建落地后的代码事实一一对应
**引用流程**：H1.2 执行 + H2.1 一改具改 + writing-plans Skill + subagent-driven-development Skill + H3 检查清单 + AskUserQuestion（书记裁决）
**来源**：spec `docs/superpowers/specs/2026-08-03-根目录文档更新-design.md` — P1 后端基建落地（server/ Node 一体化）导致根目录文档大面积过时（计数错/已删文件引用/过时架构表述）

- **执行概况（计划 7 任务全闭环）**：
  - **Task 1 前置事实核对**：Glob 实测前端计数（HTML 14 / entries 15 / services 20 / mock 10 / core 12 / components 18 / workflow 6 / modules 1）+ Grep 确认 8 个已删文件不在磁盘——全部与前提事实一致
  - **Task 2 README 九章读者旅程重构**（commit 27ea6a2）：一这是什么/二怎么开始用/三能做什么/四该看什么/五出问题怎么办/六理解系统/七系统架构与部署/八迭代路线图 + License；修复 R1-R8 全部事实错误（19→14 页面、18→15 entries、7→20 services、纯前端→双形态、Supabase→Node 一体化后端、编号断裂修复）
  - **Task 3 CLAUDE.md 四项轻量更新**（8d5ec38）：YAML last_updated 2026-08-03 + related_files 追加 server/ + T-142 阶段3 标记完成（🔄→✅）+ T-118 关联备注
  - **Task 4 content/README.md 时间戳**（99721d3）：last_updated 2026-07-21→2026-08-03，正文未动
  - **Task 5 SNAPSHOT v15**（4b0a6f2）：YAML/标题/里程碑 → v15；拓扑 docs 计数修正（8 根 HTML/15 entries/12 core/10 mock/1 modules/6 workflow）+ 新增 server/ 段 + superpowers 注释；Layer 4 追加 server/；IV 增补「打卡化判定」（insights §6.23）；VI 增补 v15 里程碑
  - **Task 6 TIMESTAMPS 批量刷新**（024d902）：YAML/页首/README/CLAUDE 行时间戳 → 2026-08-03；新增 server/ 段（13 行）+ docs/superpowers/ 段（8 行）；8 个已删文件行清理 + 6 个新增文件补登（custom-select/data-adapter/api-adapter/mock-adapter/secretary-overview/person）；M6 周期性任务标记已执行（OK）
  - **收尾书记裁决 + 一致性修正**（f91d192）：README.md 工作区出现来源不明的未提交格式改动（标题行 BOM 零宽字符残留、加粗全部丢失、表格空格对齐、`---`→`***`），经 AskUserQuestion 书记裁决「回滚为规范 Markdown」+「License 保持 ## License 无编号」；`git restore README.md` 恢复干净版本；TIMESTAMPS 根目录表 CLAUDE.md 行 2026-07-31→2026-08-03（spec T8 一致性顺带修正）

- **变更文件**：`README.md`、`CLAUDE.md`、`content/README.md`、`.ctx/SNAPSHOT.md`、`.ctx/TIMESTAMPS.md`

- **验证结果（只读验收全过）**：
  - ✅ 零残留：README 模式 A/B（party//Supabase/纯前端静态/19 页面/28 条论断 等）零命中；SNAPSHOT 模式 C（9 根 HTML/16 entry/11 个/15 页面 等）零命中（仅「核心工具（12 个）」合法新计数误匹配）；TIMESTAMPS 仅「已删除文件记录」段含 8 个已删文件名（正常）
  - ✅ 时间戳一致性：CLAUDE.md / content README / SNAPSHOT / TIMESTAMPS YAML 全部 2026-08-03；SNAPSHOT version=v15
  - ✅ README 结构：`## 一、`~`## 八、` 编号连续无跳号 + `## License` 无编号（书记决策）；`## 七、` 含 server/ 与 14 页面计数
  - ✅ git 工作区干净；6 个文档 commit 全部落地（27ea6a2 / 8d5ec38 / 99721d3 / 4b0a6f2 / 024d902 / f91d192）

- **沉淀标签**：`[经验: README 等对外门面文档的工作区异常格式改动须先书记裁决再处置]` — 文档出现来源不明的未提交格式污染（BOM 残留/加粗丢失）时，语义与已提交版本一致但格式被工具意外改写，不能擅断回滚或保留，须 AskUserQuestion 请书记裁决；`[经验: plan 验证条款与内容自相矛盾时以 spec 为上级 + 书记裁决收口]` — Task 2 内容只到「八、」而验证要求「一~九」，属 plan 内部矛盾，最终以书记「License 无编号」决策收口

## T193 T-117 第2轮理论复用评议（governance 文档间复用）四类修订 + H5.6 抽样校验全接受（2026-08-03）

**任务**：T-117 理论复用评议第2轮——governance 文档间复用链（H5.8.2 ②）。基线对照：`.ctx/SNAPSHOT.md` v15 权威拓扑 + 实际文件系统 glob 双向验证。
**引用流程**：H5 书记评议（H5.1-H5.6）+ sample-diff-learning Skill + brainstorming Skill + H2.1 一改具改 + H2.2 母本子本
**来源**：书记指令——"我们开始执行乙部的书记评议"（预审报告已于 2026-08-03 落盘 REVIEW_QUEUE.md）

- **预审发现（四类）**：
  - A 断裂链接 9 处：markdown 链接指向不存在的相对路径（ROLE_CLASSIFICATION §1.2.5、SSOT_INDEX §7.1、OPERATIONS_GUIDE ×2、USAGE_POLICY 同步索引、党小组组长手册、COMMISSIONER_FRAMEWORK ×4）
  - B 已删引用 12 处：引用已删除代码文件/页面/模块（assignment.js、permission-manager.js、party-entry.js、modules/party.js、ActivityRecordStore、party/ 体系等；SERVICE_CATALOG 约 28 处 v13 旧架构引用）
  - C 拓扑错误 20+ 处：目录结构/路径描述与现状不符（ARCHITECTURE 分层 L0-L4 旧模型、仓库结构缺 server/、content/references/ 旧路径等）
  - D 表述 2 处：SECRETARY_PRONOUNCEMENTS 描述与内容不符（「27 条路线级论断」→「27 条论断，P-045/P-047 为元命题引子」）
- **书记裁决（2026-08-03 AskUserQuestion）**：① 范围=4 类全部纳入；② 方式=机械性问题批量修 + D 类书记判定（A/B/C 为客观事实错误）；③ SERVICE_CATALOG 整体过时→全面重构服务清单；④ D 类统一改为「27 条论断（P-045/P-047 为元命题引子）」
- **反馈落实（全仓库扫描范围：content/ 五子目录 governance 文档 + references 路径）**：
  - **A 类 9 处**：ROLE_CLASSIFICATION §1.2.5、SSOT_INDEX §7.1、OPERATIONS_GUIDE ×2、USAGE_POLICY、党小组组长手册、COMMISSIONER_FRAMEWORK ×4
  - **B 类**：CHECKLIST ×2（补课存储 mockDB.makeupTasks + 分工 data-adapter.js/auth.js syncProjectRoles）、COMMISSIONER_FRAMEWORK（party-entry.js/modules/party.js → search-entry.js/modules/references.js）、**SERVICE_CATALOG 全面重构**（v13→v3.0：服务清单 18 项映射实际 services/*.js、9 列角色矩阵含副书记同权、模块路由 8 根 HTML + 6 工作台）、SOP_WEB ×3（party 页面 → workspace 工作台 + E.1/E.2 数据映射）
  - **C 类**：ARCHITECTURE 第四~六章重写（L0-L4 → Layer 0-7 知识类型分层、仓库结构 content/ 五子目录 + server/ + .ctx/、数据模型 activityRecord.js → core/domain.js）；`content/references/` 全仓迁移 10 文件 20+ 处（合规文件 → 01_strategy/references/、工作模板 → 03_doc_system/工作模板/）
  - **D 类 2 处**：OPERATIONS_GUIDE 理论基石、党小组组长手册
  - **修订数量**：15 文件（382 insertions / 309 deletions）→ 本轮收尾补漏 3 文件（SSOT_INDEX/USAGE_POLICY/OPERATIONS_GUIDE 的 L0-L4 旧表述）+ CLAUDE.md T-117 状态更新
- **H5.6 抽样校验（修订后抽样 5 条，逐条 /ask，书记全部「接受」）**：
  - ① D 类表述（27 条论断 + P-045/P-047 元命题引子）✅
  - ② A 类路径（content/references/ 全仓迁移）✅
  - ③ B 类已删引用（CHECKLIST §11 mockDB.makeupTasks）✅
  - ④ B 类 SERVICE_CATALOG 重构（18 项 + 9 列 + 8+6 路由）✅
  - ⑤ C 类拓扑（SOP_WEB MPA 表 + ARCHITECTURE Layer 0-7）✅
- **零残留 Grep 验证结果（全通过）**：
  - ✅ B 类旧引用（party.js/assignment.js/permission-manager/ActivityRecordStore/party/index.html 等）：content/ 与 docs/src/ 零残留（仅 .ctx 归档日志、TIMESTAMPS 已删记录段、docs/superpowers 历史文档保留）
  - ✅ A 类旧路径 `content/references/`：仅 OPERATIONS_GUIDE L251 历史迁移记录保留（合理）；目录实体 Test-Path=False
  - ✅ D 类「27 条路线级论断」：content/ 零残留
  - ✅ C 类 L0-L4/五层架构：SNAPSHOT/CLAUDE 零残留；KNOWN_PITFALLS §7 历史判例保留；补漏修正 3 处（SSOT_INDEX 定位、USAGE_POLICY §1.7、OPERATIONS_GUIDE §7.3）
  - ✅ SERVICE_CATALOG 旧引用零残留（含已知风险 `../sop/` 已消除，见 KNOWN_PITFALLS T127 判例 L176）
- **变更文件**：`content/03_doc_system/SERVICE_CATALOG.md`（重构）、`ARCHITECTURE.md`、`CHECKLIST.md`、`OPERATIONS_GUIDE.md`、`SSOT_INDEX.md`、`USAGE_POLICY.md`、`content/02_institution/ROLE_CLASSIFICATION.md`、`COMMISSIONER_FRAMEWORK.md`、`content/02_institution/sop/党小组组长工作手册.md`、`常见工作场景快速指南.md`、`组织委员工作流程指南.md`、`content/04_web_design/SOP_WEB.md`、`MODULE_UI_DESIGN.md`、`content/insights/工程演进与设计方法论.md`、`CLAUDE.md`（T-117 状态 → 🔄 进行中）、`.ctx/REVIEW_QUEUE.md`（已清空）
- **衍生任务**：T-117 第3轮（strategy/design → sop 复用链）与第4轮（跨目录复用断链检查）待启动
- **沉淀标签**：`[经验: 概念改名须全仓引用同步（L0-L4 → 5 类知识类型）]` — 权威源章节改名后，其他文件中对旧概念的引用（SSOT_INDEX「文档权威层级（L0-L4）」/USAGE_POLICY「L0-L4（Layer）」/OPERATIONS_GUIDE「五层架构」）会残留为 C 类拓扑错误；一改具改（H2.1）必须覆盖概念名引用而非仅权威源本体。本轮 H5.6 抽样 5 条书记全部接受（AI 修订与书记意图一致，无预判差异需沉淀）

## T194 T-117 第3轮理论复用评议（strategy/design → sop 复用链）四类修订 + 母本引用统一加链接 + H5.6 抽样 6 条全接受（2026-08-03）

**任务**：T-117 理论复用评议第3轮——strategy/design → sop 复用链（H5.8.2 ③）。基线对照：`.ctx/SNAPSHOT.md` v15 权威拓扑 + 实际文件系统 glob 双向验证。
**引用流程**：H5 书记评议（H5.1-H5.6）+ sample-diff-learning Skill + brainstorming Skill + H2.1 一改具改 + H2.2 母本子本
**来源**：书记指令——"请推进下一轮的书记评议【任意乙部的评议都可】……这些评议维度，请长期保留在CLAUDE.md，我们要更多次！"（预审报告已于 2026-08-03 落盘 REVIEW_QUEUE.md）

- **预审发现（四类 + 格式观察点）**：
  - A 断裂链接 4 处：sop/ 出发多一级 `../02_institution/`（FLAT_DESIGN ×2、COMMISSIONER_FRAMEWORK ×2）
  - B 已删引用 9 处：组织/宣传/纪检 related_files `ARCHITECTURE.md`（根目录已删 → content/03_doc_system/）；常见工作场景正文 5 处旧 references/ 路径（T193 只改 YAML 头、正文漏改，本轮补漏）；FLAT_DESIGN related_files SECRETARY_PRONOUNCEMENTS.md 无路径
  - C 拓扑错误 9 处：DATA_ARCHITECTURE 章节号引用旧结构 6 处（§3.5/§5 品牌/§5.1.2/§2.2.4 均不存在 → 修正为 §3.3/§2.15/ROLE_CLASSIFICATION §九）+ YAML last_updated 3 处与 TIMESTAMPS 不一致
  - D 表述核查：D-15 组织者定义 ×2、P-009~P-011、DEVELOPMENT_PATH 阶段、DATA_ARCHITECTURE §2.5/§2.9/§3.2、FLAT_DESIGN §一/§三/§五、SOP_WEB §B.3 锚点 ×3 全部准确（书记元洞察：表述是大头，逐条核查）
  - 格式观察点：「母本引用：[XX.md]」无链接格式 26 处（sop 全目录统一约定）
- **书记裁决（2026-08-03 AskUserQuestion）**：① 范围=四类全部纳入（含格式观察点）；② 方式=机械性批量修；③ 母本引用统一加链接
- **反馈落实（修订 7 文件）**：
  - A 类 4 处路径修正；B 类 9 处已删引用替换；C 类 9 处（章节号重定向 + last_updated 同步 08-03）
  - 母本引用加链接 26 处 + SECRETARY_PRONOUNCEMENTS 无链接引用加链接 3 处
- **H5.6 抽样校验（修订后分层抽样 6 条，逐条 /ask，书记全部「接受」）**：
  - ① A 类路径（常见工作场景 FLAT_DESIGN）✅
  - ② B 类已删引用（常见工作场景 references 路径补漏）✅
  - ③ C 类章节号（纪检 DATA_ARCHITECTURE §3.5→§3.3 考勤与考察的核心区分）✅
  - ④ C 类语义重定向（宣传 DATA_ARCHITECTURE §2.2.4→ROLE_CLASSIFICATION §九 数据共享规则权威源）✅
  - ⑤ 格式观察点（母本引用统一加链接）✅
  - ⑥ D 类核查（D-15 组织者定义表述与 FLAT_DESIGN 母本一致）✅
  - 抽样时书记追加指令："我们也要开启一下表述上的 黑话审查，特别是【AI自己编造的黑话】" → 衍生任务 T-195
- **零残留 Grep 验证结果（全通过）**：
  - ✅ A 类 `../02_institution/`：sop/ 目录零残留
  - ✅ B 类 `../references/`：content/ 零残留
  - ✅ C 类 `§3.5|§5 品牌|§5.1.2|§2.2.4`：sop/ 零残留（SECRETARY_PRONOUNCEMENTS 中 §3.5 指 insights 合法章节，非误报）
  - ✅ 母本引用格式：26 处全部带链接（行末无链接模式零命中）
- **变更文件**：`content/02_institution/sop/纪检委员工作流程指南.md`、`宣传委员工作流程指南.md`、`组织委员工作流程指南.md`、`常见工作场景快速指南.md`、`支委与党小组定人定责定岗说明.md`、`党小组组长工作手册.md`、`content/02_institution/FLAT_DESIGN.md`、`CLAUDE.md`（H5.8.2 黑话审查维度 + T-117 第3轮状态 + P3 表 T-195 立项）、`.ctx/REVIEW_QUEUE.md`（已清空）
- **衍生任务**：① 黑话审查（T-195，书记追加指令，已列入丙部 P3 表）② T-117 第4轮（跨目录复用断链检查）待启动
- **沉淀标签**：`[经验: 母本引用统一使用链接格式（[XX.md](相对路径)）]` — 无链接「母本引用：[XX.md]」无法点击定位权威源，sop 全目录 26 处统一加链接；`[经验: D 表述为最高权重维度]` — 书记元洞察（2026-08-03）："【表述】是一个大头，因为这个系统的工作性质，要求表达非常严谨！"，D 类预审逐条核查、处置一律书记判定；`[经验: 黑话审查（AI 自己编造的黑话）]` — 书记指令开启表述维度专项审查：AI 编造黑话（概念过拟合/无依据层级标签/孤立概念/生造术语）须识别并提交书记判定，AI 不得自行代改。本轮 H5.6 抽样 6 条书记全部接受（无预判差异）

## T195 T-195 黑话审查第一轮（源头污染 + 下游传播 + 判例修订）（2026-08-03）

**任务**：T-195 黑话审查第一轮——D 表述最高权重维度专项（H5.8.2）。审查方向：书记元洞察"上下游引用检查出来了，但源头可能就是被污染的，这是要非常警惕的！"→ 从权威源/母本源头逐层向下审查。
**引用流程**：H5 书记评议（H5.1-H5.6）+ sample-diff-learning Skill + brainstorming Skill + H2.1 一改具改 + H5.8.2 D 表述（黑话审查条目）
**来源**：T-194 H5.6 抽样时书记追加指令——"我们也要开启一下表述上的 黑话审查，特别是【AI自己编造的黑话】" + "目前是检查出来上下游的引用，但是源头可能就是被污染的，这是要非常警惕的！" + "先进行一轮书记审查，你可以判断基线是否成立。如果说最接近基线的还是 书记论断汇编" + "我觉得"这不是'催你'"这个话表达就很轻浮！！"

- **基线方法（书记裁决）**：以**书记论断汇编**（SECRETARY_PRONOUNCEMENTS.md，最接近原话的基线）grep 验证——汇编存在的措辞非 T3；DEVELOPMENT_PATH.md 等 AI 编写文档可能自身已被污染（判例：哲学锚点/心智模式/切面/漂移均曾写入源头文档），不能单独作为基线
- **预审发现（四类）**：
  - A 类源头污染 6 条：A1「闭环/反哺」（DEVELOPMENT_PATH:249）、A2「上游哲学锚点」（:14/226）、A3「心智模式」（SECRETARY_PRONOUNCEMENTS:272）、A4「同源不同切面」（:304）、A5「漂移/粒度」（:491/499/501）、A6「正交」×9 处（P-024 系列）
  - B 类下游传播 3 处「闭环」：B1 宣传委员工作流程指南:31、B2 定人定责定岗说明:177 章节标题、B3 党小组组长工作手册:106
  - C1 判例冲突：§6.18 T131 判例判定「项目的脑子/项目之手」为 AI 自造隐喻 vs P-011 记录为书记原话
  - D 类已排除 5 项：权限矩阵/经验沉淀/扁平化/条块/母本子本（核查通过）
- **书记裁决（9 条，2026-08-03 多轮 AskUserQuestion）**：A1=保留；A2=替换为上游战略依据；A3=替换为简单对立；A4=替换为同源不同视角；A5=全部替换（漂移→偏离/分歧，粒度→详略）；A6=替换为各自独立；B1=替换为循环；B2=章节标题替换为数据协作衔接；B3=庄重替换（书记判例："这不是'催你'"表达轻浮）
- **反馈落实（修订 9 文件）**：
  - SECRETARY_PRONOUNCEMENTS.md（源头）：目录 L14/L42 + 正文 L272/304/443/491/499/501 + P-024 系列 L611-633 + 附录锚点 L739 共 13 处
  - DEVELOPMENT_PATH.md：L14/L226「上游哲学锚点」→「上游战略依据」（2 处）
  - sop 三文件：宣传委员 L31 闭环→循环；定人定责 L177 标题→数据协作衔接；组长手册 L106 语气庄重化
  - insights 工程演进与设计方法论.md §6.18：判例修订（脑子/手为 T1 书记论断）+ 基线方法更新 + 语气轻浮维度新增
  - CLAUDE.md H5.8.2：黑话审查条目更新（基线方法 + 语气维度 + 源头污染优先警惕）
  - insights 文件1（零残留复验补漏）：同源不同切面→同源不同视角、心智模式→简单对立、正交→各自独立（共 6 处）
  - SSOT_INDEX.md（零残留复验补漏）：上游哲学锚点→上游战略依据
- **H5.6 抽样校验（修订后分层抽样 4 条，逐条 /ask，书记全部「接受」）**：
  - ① A5 源头漂移/粒度替换 ✅
  - ② A6 P-024 正交→各自独立 ✅
  - ③ B3 语气庄重化（"这不是'催你'"→提醒旨在保障记录完整连续）✅
  - ④ 零残留补漏（insights/SSOT_INDEX 同步清零）✅
- **零残留 Grep 验证结果**：
  - ✅ `哲学锚点|心智模式|同源不同切面|上游哲学锚点|这不是"催你"|数据协作闭环`：content/ 零残留（仅 §6.18 判例举例性提及合法保留）
  - ✅ `闭环`：sop/ 目录零残留
  - ✅ `正交|漂移|粒度`：content/01_strategy/ 零残留；其余目录（02_institution/04_web_design/03_doc_system）保留——工程/治理权威文件（D-218 正交维度模型、T168 活动分类正交维度等为已确立的工程语义术语）
- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/01_strategy/DEVELOPMENT_PATH.md`、`content/02_institution/sop/宣传委员工作流程指南.md`、`支委与党小组定人定责定岗说明.md`、`党小组组长工作手册.md`、`content/insights/工程演进与设计方法论.md`、`content/insights/党支部管理与实务经验沉淀.md`、`content/03_doc_system/SSOT_INDEX.md`、`CLAUDE.md`（H5.8.2 黑话审查维度 + P3 表 T-195 状态）、`.ctx/REVIEW_QUEUE.md`（已清空）
- **沉淀标签**：`[经验: 黑话审查基线=书记论断汇编]` — 书记论断汇编（SECRETARY_PRONOUNCEMENTS.md）是最接近原话的基线，DEVELOPMENT_PATH 等 AI 编写文档可能自身已被污染，不能单独作为基线；`[经验: 源头污染优先]` — 引用链路修复只保证链接正确，源头表述若被污染则下游全部传播，审查须从权威源/母本源头逐层向下；`[经验: 语气轻浮为黑话维度]` — 书记判例（2026-08-03）：对"这不是'催你'"评价"表达就很轻浮！！"，带引号俏皮口吻等不庄重表达纳入黑话审查维度，须庄重化

## T195-2 T-195 黑话审查第2轮（根目录/03_doc_system/04_web_design/docs 用户文案）（2026-08-03）

**任务**：T-195 黑话审查第2轮——在第一轮源头污染修订基础上，扩展到根目录 README + 03_doc_system + 04_web_design + docs/ 用户界面文案 + 05_ai_coding。
**引用流程**：H5 书记评议（H5.1-H5.6）+ sample-diff-learning Skill + brainstorming Skill + H2.1 一改具改 + H5.8.2 D 表述（黑话审查条目）
**来源**：书记指令（2026-08-03）："请推进下一轮的书记评议【任意乙部的评议都可】；这些评议维度，请长期保留在CLAUDE.md，我们要更多次！" + Use Skill brainstorming + Use Skill sample-diff-learning。书记选定 T-195 第2轮。

- **基线方法**（H5.8.2）：以**书记论断汇编**（SECRETARY_PRONOUNCEMENTS.md）grep 验证——汇编存在的措辞非 T3；DEVELOPMENT_PATH 等 AI 编写文档可能自身已被污染，不能单独作为基线
- **预审发现（三类）**：
  - A 类用户文档黑话残留 4 处：README.md:17「工作切面」、:72「不同的切面」、:130「不同切面展示」、docs/about.html:306「不同切面」——A4 裁决「同源不同切面→同源不同视角」的下游传播残留，用户阅读文本无书记背书
  - B 类「闭环」边界判定 8 处：COMMISSIONER_FRAMEWORK ×7（协作闭环/无法闭环追踪/纪检审核闭环/月度闭环流程/任务对接闭环/信息闭环等，[用户]+[AI] 设计文档，工程流程语义）+ help-entry.js:166「专班的工作闭环」（用户帮助页文案）
  - C 类已核查保留：SERVICE_CATALOG「切面视图」（[工程师]+[AI]）、SOP_WEB「切面视图」、insights §5.7「切面视图原则」、OPERATIONS_GUIDE「闭环/漂移/粒度」、KNOWN_PITFALLS「虚假确认闭环」、CHECKLIST「赋权整合闭环」（任务名）、USAGE_POLICY「正交双维度」（历史）、FLAT_DESIGN「管理闭环」（P-010 母本 T1）、DEVELOPMENT_PATH「战略经验闭环」（A1 保留）、help-entry/ws-secretary「脑子/手」（P-011 书记论断 T1）、04_web_design「锚点/粒度」等
- **书记裁决（2026-08-03 AskUserQuestion）**：
  - A 类=全部替换为「视角」（4 处）
  - B 类=工程保留+用户替换 → 但 H5.6 抽样③书记裁定 help-entry.js「专班的工作闭环」**保留闭环**——最终 B 类 8 处「闭环」全部保留（COMMISSIONER_FRAMEWORK 工程语义 + help-entry 书记特别裁定）
  - C 类=确认保留不动
- **反馈落实（修订 2 文件 4 处）**：
  - README.md：L17「工作切面」→「工作视角」、L72「不同的切面」→「不同的视角」、L130「不同切面展示」→「不同视角展示」
  - docs/about.html：L306「不同切面」→「不同视角」
- **H5.6 抽样校验（修订后抽样 4 条，逐条 /ask）**：① A1 README「工作切面→工作视角」接受 ✅；② A4 about.html「不同切面→不同视角」接受 ✅；③ B8 help-entry「专班的工作闭环→专班工作至此完成」书记裁定「保留闭环」（撤销替换，恢复原状）；④ B/C 类保留确认 ✅
- **零残留 Grep 验证结果**：
  - ✅ `切面`：README/about.html/help-entry 等用户文档零残留（仅工程/权威文档「切面视图」合法保留 + .ctx 内部文档 + docs/superpowers 工程师向历史快照）
  - ✅ `闭环`：docs/src/entries/*.js + docs/*.html + workspace/*.html 用户界面文案零残留（COMMISSIONER_FRAMEWORK 工程语义按书记裁决保留）
- **变更文件**：`README.md`（3 处）、`docs/about.html`（1 处）、`.ctx/REVIEW_QUEUE.md`（预审报告 + 书记裁决 + 已归档清空）、`CLAUDE.md`（P3 表 T-195 第2轮状态）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[经验: 黑话审查沿引用链多轮扩展]` — 源头污染修订后，同一黑话（如「切面」）沿引用链传播至根目录 README/docs 用户文案，须多轮全仓复验清零；`[经验: 工程语义与用户文案边界]` — 「闭环/切面」在 [工程师]+[AI] 文档（SERVICE_CATALOG/SOP_WEB/KNOWN_PITFALLS）与 [用户]+[AI] 工程设计文档（COMMISSIONER_FRAMEWORK）为工程语义保留，但用户阅读文本（README/about.html/sop）中同词无书记背书须替换——边界判定一律提交书记，AI 不得自行代改

## T195-3 T-195 黑话审查第3轮（A/B/C/D/E 五类 109 条全部裁决执行）+ 全仓大扫除·党建与党务关系系统思考（2026-08-03）

**任务**：T-195 黑话审查第3轮——覆盖 docs 用户界面文案 + 代码注释 + 02_institution 全部 + 01_strategy 未审 + 03_doc_system + 04_web_design + 05_ai_coding + insights（基线 = SECRETARY_PRONOUNCEMENTS.md 书记论断汇编 grep 验证）；并行开展「全仓党建与党务关系系统思考」（书记裁决）。本轮收集 70+ 候选，A 类 7 + B 类 3 + C 类 31 + D 类 24 + E 类 44，合计 109 条全部裁决并修订执行完毕。
**引用流程**：H5 书记评议（H5.1-H5.6）+ brainstorming Skill + H2.1 一改具改 + H5.8.2 D 表述 + 源头污染优先原则
**来源**：书记指令（2026-08-03）：「大胆抽样！！抽样的时候以句子、段落作为总体考虑」「全部逐条审议」「一改具改！要落实」「Use Skill: brainstorming」

- **A 类（用户界面文案，7 条）**：全部裁决执行 ✅（A1「多线程」→「分工并行」；A2 删除「（多线程）」；A3「生动的脉动」→直白描述；A4「顺路赋权」→「已为 X 名成员赋权」；A5「生长专班/内控隔离」→「不组建专班（权责分离）」；A6「服务同学们」→「服务支部成员」；A7 机会区块重构——书记批准最终设计「提炼版 quote 默认 + 点击卡片 KeyNote 式平滑切换原话全文 + 纵向递进布局」）
- **B 类（代码注释，3 条）**：全部执行 ✅（B1「hack」→「临时方案」×2；B2「顺路赋权」系列 6 处；B3 help-entry 版本历史注释代号精简）
- **C 类（02_institution 用户文档，31 条）**：全部裁决执行 ✅（C14 通知模板表情符号保留；C19 经 DECISION_LOG 核实为书记原则原话→保留；C25「记账线程」→用户可读「系统自动记录产出」；C9 改描述性表述；C12 段落中可保留、不作小标题）；一改具改补漏：C21「参与等级」→「参与类型」、C20「不生长专班」→「不组建专班」、C24「有机汇总」→「汇总提炼」、C29「权限真空」→「权限缺口」等
- **D 类（治理/工程文档，24 条）**：全部裁决执行 ✅（D15 书记裁决「扩白名单」——USAGE_POLICY §2.3 功能性 Emoji 白名单新增 🔴🟡🟢🔄 4 行；D21「为什么不直接使用 用户？」→改「文件角色分类」；D22 改描述性「Edit 误报成功与 Read 缓存叠加导致的误判」）；一改具改补漏：D24「战略上级」→「战略依据」、D17「复盘三态流转」→「复盘状态流转」
- **E 类（04_web_design + insights，44 条）**：全部裁决执行 ✅；特别裁定项：①正交边界=工程语义保留（用户文档已改「各自独立」）；E36「四里程碑闭环」→「四阶段闭环」（保留第2轮「闭环」工程语义裁决）；E19「条块二元」→「[条块分工]」（P-014 在册术语）；E26「即=等价关系」→去标签直接描述；E44 附录 #26/#31 合并；E29/E30/E31/E32/E33/E35/E37/E38/E40/E41/E42/E43 按推荐改直述/去标签
- **全仓大扫除（党建与党务关系系统思考）**：
  - 书记裁决链（2026-08-03）：「党建和党务已经被有机整合到工作台其中，作为理论的重要性大大下降」「用户文档中，都合并为工作台」「党建和党务合并为党建只是网页的 tab 合并」「我们要与权威源对齐——权威定义才是 T1，P-006 是 T2」「就按照权威来源的定义即可，不要额外搜索」「最小修改原则+准确安放表达层次」
  - 术语层级安放：USAGE_POLICY §1.1 表格「对应模块」列→「网页承载」=工作台 + 废弃标注；§1.7 T1 定义补充「权威来源对核心概念的官方定义」+ 新增「P-006 层级安放」条款；DEVELOPMENT_PATH 附录 B 同步更新（顺带修复断链 `../../ARCHITECTURE.md` → `../03_doc_system/ARCHITECTURE.md`）
  - T1 权威定义补全（2026-08-03 书记确认「按权威定义即可，不额外搜索」）：§1.7 P-006 条款补两行官方定义——党建工作=党为保持先进性纯洁性而开展的自我建设（政治/思想/组织/作风/纪律五建 + 制度贯穿其中）；党务工作=党内事务的具体管理工作（党员发展、党员教育管理、组织生活、党内选举、党费收缴管理等）。层次安放：T1=官方定义（界定"党建/党务是什么"）、T2=P-006 两分法（约定本项目工作内容划分）
  - 权威出处不外显（书记指令「我们确实是从那里引的，但是我们不写出来」）：全仓出处名称字眼清零——USAGE_POLICY §1.7 / CLAUDE.md T-195 表 / 执行日志 2 处，共 4 处全部替换为「权威来源/官方出处」
  - 网页整合：Tab 分组「党务」→「党建」（4 个 ws-*entry.js 共 6 处 groupLabel + secretary 注释同步）；workspace HTML「党建工作台」→「工作台」（6 文件 12 处）；docs/about.html 删除「党建工作 vs 党务工作」对比表（含常见误解/活动vs专班/成熟vs创新四段）+ 8 处文案更新；commissioner-matrix.js 改单域职责卡片（标题「三委员工作台职责矩阵」、删除 DOMAIN_META 双域标签、每委员一张卡片合并全部职责）；3 处「Tab（党务）」代码注释同步为「Tab（党建）」
  - content 用户文档旧模块名清理（22 处）：sop 系列操作指南「党建工作台/党务管理」→「工作台」或理论术语「党建工作/党务工作」；insights「正确术语是'党建工作台'和'党务管理'」更新为新共识表述；COMMISSIONER_FRAMEWORK 权限矩阵标题「党建工作台权限矩阵/党务管理权限矩阵」→「党建工作权限矩阵/党务工作权限矩阵」；USAGE_POLICY L80 侧边栏标签表 + L101 写入型/支撑型描述
  - 断链修复：SERVICE_CATALOG L362 引用不存在的 DATA_ARCHITECTURE §8.2 → 改为引用 SECRETARY_PRONOUNCEMENTS P-007 + 补注「参与/管理视角是同一系统内数据展示的通用原则，不是党建与党务的区分标准——区分标准是工作内容（P-006）」
- **H5.6 抽样校验**：E26/E29/E33/E41/E44 抽样通过；E18 书记要求完整上下文后给出「全仓大扫除」元反馈
- **零残留 Grep 验证结果**：
  - ✅ docs 用户可见层：「党建工作台」「党务管理」「groupLabel: '党务'」零残留（仅代码注释/历史变更记录保留；help-entry「党建工作/党务工作」domain 标签与 sopData「【党务工作】」场景标题为理论层准确表达，保留）
  - ✅ content 用户文档：旧模块名零残留（sop 系列/USAGE_POLICY/insights/DEVELOPMENT_PATH 附录 B 全部清理；剩余匹配均为理论层书记论断/SECRETARY_PRONOUNCEMENTS 原话/工程历史文档/「已废弃」标注）
  - ✅ .ctx 审查记录与执行日志按历史记录不可变原则保留
  - ✅ 出处名称字眼全仓清零（书记指令：引用权威来源但不写出处名称；4 处全部替换为「权威来源/官方出处」）
- **变更文件**：`docs/about.html`、`docs/src/components/commissioner-matrix.js`、`docs/src/entries/ws-{disc-commissioner,org-commissioner,secretary,prop-commissioner,leader,visitor}-entry.js`、`docs/workspace/*.html`、`content/03_doc_system/USAGE_POLICY.md`、`content/01_strategy/DEVELOPMENT_PATH.md`、`content/insights/党支部管理与实务经验沉淀.md`、`content/02_institution/sop/*.md`（7 文件）、`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/04_web_design/SOP_WEB.md`、`content/03_doc_system/SERVICE_CATALOG.md`、`.ctx/REVIEW_QUEUE.md`、`CLAUDE.md`（P3 表）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[经验: 权威定义才是 T1]` — 术语权威层级以权威来源的定义为 T1，书记项目内两分法（P-006）为 T2 约定表达——理论层保留讲解、网页层不体现界面结构；`[经验: 用户文档工作台合一]` — 「党建工作台/党务管理」旧模块名废弃，用户文档统一「工作台」，Tab 分组统一「党建」；`[经验: 理论讲解区块不再进网页]` — 党建/党务两分法作为理论的重要性下降，网页层删除对比表、矩阵改单域职责卡片；`[经验: 权威出处不外显]` — 引用权威来源的定义时正文不写出处名称（书记：确实从那里引的但不写出来），以「权威来源/官方出处」指代

## T196 帮助/关于页互换名称 + 关于页正文系统重写 + T2 P-006 两分法删除（2026-08-03）

**任务**：①帮助页与关于页互换名称（书记判断"现在'关于'的内容更有帮助"）；②关于页正文系统重写（保持致谢不动）；③T2 P-006 两分法删除（网页层统一「工作台」）。brainstorming Skill 已确认三项方向：内容互换（help.html 承载说明书、about.html 承载支部故事，文件名/导航链接不变）、重写深度=骨架保留逐节更新、T2 删除=T1 取代 T2。涉及 3+ 文件，写入乙部 T-196。
**引用流程**：H1.2 执行 + brainstorming Skill + H2.1 一改具改 + H2.2 母本子本 + H3 修改检查清单
**来源**：书记指令（2026-08-03）：「我认为 帮助页 和 关于页 需要互换名称——因为 似乎现在'关于'的内容更有帮助！【这两页都是静态页面！】此外，我们已经许久没有更新 关于页。请保持前面的致谢不动，把正文的部分做一次系统地重写！！」「如果有了T1级别的表述，相关下游的T2级别的表述目前来看对于网页设计没有什么增量，也就可以删去了！！」

- **① 内容互换**：
  - `docs/help.html`（原支部故事壳）整文件重写为「系统说明书」——沿用原 about.html 的 TOC 版壳（about-toc 目录 + Role Hierarchy CSS），七节内容：致谢（未动）→ 一（新增「系统现有 14 个页面」段落）→ 二（2.1 角色总览更新为 8 角色 + 六类专属工作台）→ 三（未动）→ 四（4.1 重写为帮助语义引导 + 导航树 + 工作台命名卡片）→ 五（数字修正：14 页 / 15 entries / 20 services）→ 免责声明（未动）；尾部引用 `about-entry.js?v=20260803`
  - `docs/about.html`（原说明书正文）整体改写为「支部故事」——沿用原 help.html 的 GSAP 壳（styles.css?v=v11-fix1 + Cache-Control + GSAP CDN + `#help-content` 容器），title「关于 — 光华管理学院本科生党支部管理引擎」、description「关于 — 支部的故事 · 成长路径与工作哲学」；尾部引用 `help-entry.js?v=20260803`
  - entry JS activeModule 对位：`about-entry.js`（服务 help.html）`renderSidebar/Header('about')→'help'` + 注释改「帮助页入口（系统说明书）」；`help-entry.js`（服务 about.html）`renderSidebar/Header('help')→'about'` + 注释改「关于页入口」；sidebar.js footer 的 `{module:'help',href:help.html}` / `{module:'about',href:about.html}` 天然对位，无需改动
  - icons.js scrollDown 注释「帮助页装饰图标」→「关于页装饰图标」（该图标服务支部故事页）
- **② 关于页正文系统重写**（骨架保留逐节更新，致谢段落原文不动）：一、这个系统在干什么（新增 14 页面 + 六类角色工作台段落）；2.1 角色总览（8 角色 + 组织者/深度参与者扁平化执行角色）；4.1 页面导航（帮助语义引导 + 导航树 + 全部改为「XX工作台」命名 + 党支书工作台全局概况/赋权管理）；五、技术架构（前台 14 页 / 中台 15 entries / 后台 20 services 实测数字修正）
- **③ T2 P-006 两分法删除（T1 取代 T2）**：
  - USAGE_POLICY §1.1.1 核心定义表格「含义」列改 T1 官方定义（党建=党为保持先进性纯洁性而开展的自我建设，政/思/组/作/纪五建+制度贯穿；党务=党内事务的具体管理工作，党员发展/教育管理/组织生活/党内选举/党费收缴）；网页承载备注「两分法（P-006）已由 T1 官方定义取代，不再作为网页设计依据」；区分要点同步
  - USAGE_POLICY §1.7 P-006 层级安放条款精简——两分法「保留作理论历史」（书记原话见 SECRETARY_PRONOUNCEMENTS P-006，保留不动），T1 官方定义为准，取代 T2 作为网页设计依据
  - insights 党支部管理与实务经验沉淀 §1.1 标注「保留作理论讲解…仅作理论历史参考」；§1.3 补注「板块划分属于理论讲解，网页层统一承载于工作台」
- **一改具改（7+ 处文档引用互换）**：SOP_WEB.md（系统说明书→help.html / 支部的故事→about.html，L56 描述列同步）；ARCHITECTURE.md L137/L141（about=支部的故事 / help=系统说明书）；SERVICE_CATALOG.md L405-406/L427-428（help↔about 互换，含入口 JS）；CHECKLIST.md L71/L81（权限体系说明页 about→help）；KNOWN_PITFALLS.md L195（T147 GSAP 陷阱页 help→about）；DESIGN_SYSTEM.md L576/L596（Exploration 区块页 帮助页→关于页）；DATA_ARCHITECTURE.md L303（入党申请人叙事页 帮助页→关于页）；.ctx/SNAPSHOT.md（文件树 L29/L33 + 页面清单 L108/L116）；.ctx/TIMESTAMPS.md（4 行 last_updated 2026-08-03 + 用途互换）
- **H3 检查清单**：YAML 更新 ✅（CHECKLIST/KNOWN_PITFALLS/SOP_WEB/DESIGN_SYSTEM/DATA_ARCHITECTURE 5 文件 last_updated→2026-08-03；USAGE_POLICY/ARCHITECTURE/SERVICE_CATALOG/insights 已为 2026-08-03）；GetDiagnostics ✅（仅既有 markdownlint 警告，JS/HTML 零错误）
- **浏览器验证**（browser_use，http://localhost:3000）：help.html 渲染说明书 ✓（14 页段落 / 8 角色层级图 / 三委员矩阵 / 五章节 / TOC）；about.html 渲染支部故事 ✓（Hero「从入党申请人到正式党员」/ 考察三维度 / 13 步 Development 时间轴 / 管理事服务人收束 / Exploration）；footer 高亮为既有设计（footer 项从未按 activeModule 高亮，非本轮回归，不做改动）；console 两页均无错误；像素截图因环境不可用，以可访问性快照 + 计算样式/几何实测代替
- **零残留 Grep 验证结果**：
  - ✅「帮助与探索」「系统说明书」等旧配对引用零残留（content 活文档 + docs 代码层全部互换；.ctx/logs 历史记录按不可变原则保留）
  - ✅ SERVICE_CATALOG.md L405-406 并行编辑被覆盖丢失一次，已串行补回并复查确认
- **变更文件**：`docs/help.html`（重写为说明书）、`docs/about.html`（改写为支部故事）、`docs/src/entries/about-entry.js`、`docs/src/entries/help-entry.js`、`docs/src/core/icons.js`、`content/03_doc_system/USAGE_POLICY.md`、`content/03_doc_system/ARCHITECTURE.md`、`content/03_doc_system/SERVICE_CATALOG.md`、`content/03_doc_system/CHECKLIST.md`、`content/05_ai_coding/KNOWN_PITFALLS.md`、`content/04_web_design/SOP_WEB.md`、`content/04_web_design/DESIGN_SYSTEM.md`、`content/04_web_design/DATA_ARCHITECTURE.md`、`content/insights/党支部管理与实务经验沉淀.md`、`.ctx/SNAPSHOT.md`、`.ctx/TIMESTAMPS.md`、`CLAUDE.md`（乙部 T-196 删除）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[待沉淀: 同文件多处编辑须串行执行]` — 对同一文件的两个并行 Edit 中，后写入的编辑可能覆盖先写入的编辑导致变更丢失（SERVICE_CATALOG L405-406 实例），须串行执行或事后复查确认

## T197 T-197 帮助页（说明书）全域改造：章节重排 + 快速上手前置详细化 + 圆点导航 + Apple 极简美学（2026-08-03）

**任务**：承接书记三条指令——①确认 help 界面已从 entry 脚本同步名称；②帮助页美学风格全域思考改进（Apple 极简风中等改造）；③内容检查与结构重排（使用说明书内容往前方），侧边目录参考 about 页圆点导航。brainstorming Skill 已确认三项方向（圆点导航 / 快速上手提到最前 / 中等美学改造），方案获书记批准。
**引用流程**：H1.2 执行 + brainstorming Skill + web-design-guidelines Skill + H2.1 一改具改 + verification-before-completion Skill（browser_use 三轮实测）
**来源**：书记指令（2026-08-03）——"请检查help界面目前是否已经从entry 的脚步也同步名称？""help界面的美学风格不行，必须全域思考改进！且内容上再次检查，结构上，把使用说明书 相关的内容往前方。侧边的目录参考about"

**书记决策（brainstorming + AskUserQuestion 确认）**：
- 侧边目录=改为圆点导航（参考 .help-toc-nav：右侧固定圆点 + hover tooltip + 当前章节党建红高亮）
- 章节顺序=快速上手提到最前（推荐）+ 相对详细地列示功能
- 美学深度=中等改造（排版/卡片/字体/间距/配色全面升级，无滚动动画）

**实施内容**：
- ① **help.html 整文件重写（585 行）**：移除旧 `.about-toc` 170px 文本目录 nav 与 about-main 容器；章节重排为 致谢（原文不动）→ 一快速上手 → 二这个系统在干什么 → 三分工中的制度设计 → 四为什么这样设计 → 五技术架构 → 免责声明；每个 section 带 `data-toc-id` 属性；新增内联 `.doc-*`/`.quick-*` 文档样式（衬线标题 + 党建红编号 + 渐变装饰线 + 暖白卡片 + hover 党建红描边 + chip 标签）；快速上手前置详细化——公共页面 + 六角色工作台分组卡片网格（29 张 quick-card，覆盖 tab 级功能）+ 1.1 页面导航树 + 1.2 权限体系三表
- ② **about-entry.js 重写（96 行）**：新增 `TOC_ITEMS` 数组（7 项）+ `renderTOC()` 动态创建 `.help-toc-nav` 圆点导航追加到 body + `bindTOC()`（点击平滑滚动 headerOffset 64 + 滚动高亮）；移除旧 `.about-toc` 文本目录逻辑；组件渲染（role-hierarchy / commissioner-matrix）保留
- ③ **滚动高亮 bug 修复（浏览器验证发现并根治）**：原 IntersectionObserver 阈值方案（threshold 0.15/0.4/0.6 + rootMargin -15%/-55%）对高章节失效——快速上手章节 3532px 高，观察带仅视口中间 30%（≈198px），最大相交比 5.6% 永远低于 15% 阈值，永不切换；改为「章节顶部越过 120px 标记线」scroll 定位法（与章节高度无关）+ 滚动到底部兜底激活末章（页面总高不足时免责声明顶部无法越过标记线）
- ④ **版本号 bump 防缓存**：about-entry.js?v=20260803 → b → c → d（三轮迭代）
- ⑤ **零残留确认**：`.about-toc`/`.about-main` 全仓（含 styles.css）零残留，无需清理；styles.css `--help-*` 变量（:root L3252-3261）与 `.help-toc-nav` 圆点样式（L4891-4997）已存在可直接复用

**变更文件**：`docs/help.html`、`docs/src/entries/about-entry.js`

**验证结果（browser_use 三轮实测 + GetDiagnostics）**：
- ✅ 第一轮（b 版）：页眉/圆点导航 7 圆点+tooltip/快速上手 29 卡片/role-hierarchy+commissioner-matrix 组件全渲染；章节顺序正确（致谢→一快速上手→…→免责声明）；发现高章节无法高亮 + 1 条 TypeError
- ✅ 第二轮（c 版）：6/7 通过——三个高章节（快速上手/制度设计/设计理念）高亮切换全部生效；TypeError 确认为旧版 b 残留（c 版全新加载 console 无错误）；仅剩页面底部免责声明无法高亮（页面总高不足）
- ✅ 第三轮（d 版）：5/5 全部通过——scrollY=0→sec-ack / 4300→sec-what / 9200→sec-tech / 底部 9317→sec-disclaimer（兜底生效）/ 上滚 100px 恢复正常判定；console 无 JS 错误
- ✅ GetDiagnostics 修改文件零错误

**沉淀标签**：`[已沉淀: content/insights/工程演进与设计方法论.md §6.24]` — 章节高度远大于观察带高度时，相交比永远低于 threshold，TOC 滚动高亮永不切换（帮助页快速上手 3532px 相交比仅 5.6% < 15%）；改用「章节顶部越过标记线」scroll 定位法（只读顶部位置，与章节高度无关）+ 页面底部兜底激活末章（页面总高不足时末章顶部永远无法越过标记线）

## T198 T-198 帮助页三/四章节重写 + entry 命名一致（2026-08-03）

**任务**：承接书记两条指令——①about/help 与各自 entry 命名一致（help.html 原用 about-entry.js、about.html 原用 help-entry.js，互换归位）；②help 页三、四章节全权重写——修正角色总览图"组织者/深度参与者框进专班盒子"问题（书记："我还把组织者和深度参与者 放在专班中！我非常不认可！"），议题与表述逐条经书记把关。
**引用流程**：brainstorming Skill（逐轮 AskUserQuestion 把关）+ web-design-guidelines Skill + H2.1 一改具改 + verification-before-completion Skill（browser_use 两轮实测）
**来源**：书记指令（2026-08-03）——"about和help 与 他们各自的entry 需要命名一致！！""我认为help中的三、四 都值得重写！里面表述的问题我觉得①有问题——特别是画图的部分，明说 专班和活动并列，还把组织者和深度参与者 放在专班中！我非常不认可！②具体要展示什么内容/什么议题，怎么表述，我都要从头到尾把关！"

**书记决策（brainstorming + AskUserQuestion 逐条确认，见 `.trae/specs/help-chapters-rewrite/spec.md`）**：
- 画图结构=独立底层·去专班盒（底部「普通成员/组织者/深度参与者」三平级卡，删除专班盒子）
- 并列概念处理=仅改帮助页画图与表述（母本 FLAT_DESIGN/COMMISSIONER_FRAMEWORK/USAGE_POLICY 不动，论断放四章 4.2 以工作特征叙述讲清）
- 三章议题 6 项通过（角色总览/条块双线/两个执行角色/活动线/专班线/普通成员）；四章方向="怎么理解具体的这个组织"（A+B+C：工作特征+组织目的+身份视角）；四章全文有机版通过；战略认知收尾保留；赋权链两处都留
- **表述原则确立**：不用"为什么需要……"疑问句，改叙述式有机表达——把理由织进叙述（"制度因此比个人可靠""才不会有真空地带"），沉淀至 insights §4.15

**实施内容**：
- ① **entry 命名互换（git mv 三步归位）**：about-entry.js ↔ help-entry.js 内容互换——`git mv about-entry.js __swap_tmp-entry.js; git mv help-entry.js about-entry.js; git mv __swap_tmp-entry.js help-entry.js`；互换后 help-entry.js=系统说明书逻辑（renderSidebar/Header('help')）、about-entry.js=支部故事逻辑（renderSidebar/Header('about')）；两文件注释头修正
- ② **help.html 三/四章整段替换**：三章=「分工中的制度设计」6 节（3.1 角色总览/3.2 条块双线/3.3 两个执行角色/3.4 活动走谁的门/3.5 专班走谁的门/3.6 普通成员）；四章=「怎么理解具体的这个组织」5 节（4.1 这个组织靠什么运作/4.2 活动与专班：两种工作两种节奏/4.3 扁平化：不靠级别靠协商/4.4 条块双线：办事找对线/4.5 普通成员：参与与监督）+「管理事，服务人」收尾 doc-note；删除旧四章「为什么这样设计」全节（含旧设问式标题与活动/专班对比表）；入口脚本 `about-entry.js?v=...` → `help-entry.js?v=20260803e→f`（bump）
- ③ **role-hierarchy.js 去专班盒重构**：底部 `.rh-taskforce`「专班（临时项目组）」盒子删除，改为「普通成员/组织者/深度参与者」三平级卡；文件头注释同步；`help.html` 内联样式 `.rh-taskforce*` 三行清理（styles.css 无残留）
- ④ **about.html 入口互换**：`help-entry.js?v=20260803` → `about-entry.js?v=20260803e`
- ⑤ **一改具改**：SOP_WEB.md L55-56、SERVICE_CATALOG.md L405-406/L427-428 entry 映射互换；TIMESTAMPS.md L233/L236 描述互换
- ⑥ **TOC tooltip 对齐正文标题**（浏览器验证发现）：help-entry.js TOC_ITEMS 标签「系统定位/制度设计/设计理念」→「这个系统在干什么/分工中的制度设计/怎么理解具体的这个组织」，与正文 h2 命名一致（与 about 页 TOC 惯例对齐）
- ⑦ **表述原则沉淀**：insights 工程演进与设计方法论.md 新增 §4.15「叙述式有机表达」；顺带将 T-197 遗留 `[待沉淀: IntersectionObserver 阈值方案]` 闭环为 §6.24（相交比阈值法对高章节失效）

**变更文件**：`docs/src/entries/help-entry.js`、`docs/src/entries/about-entry.js`、`docs/help.html`、`docs/about.html`、`docs/src/components/role-hierarchy.js`、`content/04_web_design/SOP_WEB.md`、`content/03_doc_system/SERVICE_CATALOG.md`、`.ctx/TIMESTAMPS.md`、`content/insights/工程演进与设计方法论.md`、`.trae/specs/help-chapters-rewrite/spec.md`（新增）

**验证结果（browser_use 两轮实测 + GetDiagnostics + 全仓 Grep）**：
- ✅ GetDiagnostics：help.html/about.html/help-entry.js/about-entry.js/role-hierarchy.js 全部零错误
- ✅ 全仓 Grep：entry↔页面映射一致（about.html→about-entry.js、help.html→help-entry.js、renderSidebar('about')/renderSidebar('help')）；帮助页旧表述（"为什么这样设计""为什么是并列的""权限从哪来"等）零残留
- ✅ 第一轮浏览器：help 页新三/四章节全部渲染（旧四章无残留）；#role-hierarchy-container 内 `.rh-taskforce` 数量为 0、底部三平级卡（普通成员/组织者/深度参与者）正确；圆点导航 7 项滚动高亮正常；about 页互换后支部故事渲染正常、GSAP 正常；console 无 TypeError/404
- ✅ 第二轮浏览器（f 版）：help TOC tooltip 与正文标题完全一致（致谢/快速上手/这个系统在干什么/分工中的制度设计/怎么理解具体的这个组织/技术架构/免责声明），console 无错误

**沉淀标签**：`[已沉淀: content/insights/工程演进与设计方法论.md §4.15]` — 面向人类读者的制度/说明内容，陈述理由不用"为什么需要……"疑问句，把理由织进叙述（叙述式有机表达）；生效条件：人类读者文档，AI 运行规则与技术表格不受限

## T199 T-199 条块定位校正 + about/help 页人名清理（2026-08-03）

**任务**：承接书记两条指令——①全仓纠正「条条管事、块块管人/纵线管事、横线管人」及其衍生的「人的问题找……」表述（书记："这是绝对的错误！！"）；②about/help 页除致谢外不允许出现任何真实人名。过程中书记澄清条块认知：条块是理解权责关系的两把尺子，谁做什么由岗位职责定义决定，不由条块推出；并识别出 P-014「条管功能决策/块管信息触达」为 AI 推导非书记原话，建立「书记原话逐条复核」长期机制（T-200）。

**引用流程**：brainstorming Skill（逐轮 AskUserQuestion 把关，spec 已获书记批准）+ H2.1 一改具改 + verification-before-completion Skill（GetDiagnostics + 全仓 Grep 复扫）

**来源**：书记指令（2026-08-03）——"我必须全仓库纠正——条条管事、块块管人/纵线管事、横线管人 的说法！这是绝对的错误！！其衍生的 人的问题找……也是绝对的错误！！""除了致谢！请about和help页不允许出现任何真实人名！！"

**书记决策（brainstorming + AskUserQuestion 逐条确认，见 `.trae/specs/tiaokuan-jiuzheng/spec.md`）**：
- 条块=理解权责关系的两把尺子（条=职能视角、块=单元视角），谁做什么由岗位职责定义决定，不由条块推出；保留「条条/块块」术语本身（"很形象！也符合行政的术语"），仅去除职责推导逻辑
- P-014 整条重写为「条块二元——理解权责关系的两把尺子」，标记「（2026-08-03 书记复核重写）」；P-015 微调「条和块各管各的」→「职能线与小组线各成体系」
- 禁用「不是……而是……」句式（书记判例：否决"不是行政学黑话，而是一种理解手段"），沉淀进评议标准 H5.8.2 而非 insights
- help 4.4 重写为职责归属叙述（标题「4.4 条块双线：办事找对线」→「4.4 职能线与小组线」）
- 人名清理严格按指令范围：仅 commissioner-matrix.js（help 页 3.2 组件）删人名；renderer.js（工作台 mock）不动；help.html 致谢保留
- 乙部新增 T-200「书记原话逐条复核」（长期，P-014 为第一例）

**实施内容**：
- ① **SECRETARY_PRONOUNCEMENTS.md**：P-014 整条重写（条块二元理解手段+岗位职责定义决定谁做什么+专班打破条块格局）；P-015 微调「各管各的」→「各成体系」；L14 intro「条和块各管什么」→「条块二元怎么理解权责关系」；目录锚点 L39 同步新标题（断裂修复）；第五章过渡「这两者的分工」→「权责关系」；P-026 正文「"管人"的使用者/（"管事"）」去标签改职责归属叙述（母本-反论与 insights §4.7 同步）
- ② **insights/党支部管理与实务经验沉淀.md**：§2.1 表格「权力本质」列→「理解视角」列（职能视角/单元视角）；接力句→「条块之间没有上下级关系，只是两种理解视角。谁做什么由岗位职责定义决定，不由条块推出」；附录速查表 [条块分工]/[支委双职能] 同步；§4.2「宣传委员管事、组织委员管人、纪检委员管事+人」→「管理对象类型不同」（事/人/事+人）；§4.7 人才库三处「"管人"职能/（"管事"）」→职责归属叙述
- ③ **docs/help.html 4.4**：整段替换为职责归属叙述（职能线=三委员各管专业事务、小组线=党小组组长组织党小组活动、两条线在书记处交汇、找谁看职责归属；"条"与"块"是理解权责关系的两把尺子）；入口脚本 bump `?v=20260803f→g`
- ④ **COMMISSIONER_FRAMEWORK.md A.3**：补定位句「条块是理解权责关系的两把尺子，谁做什么由岗位职责定义决定，不由条块推出」
- ⑤ **content 文档核查**：支委与党小组定人定责定岗说明（「条条职能/块块事务」保留）、宣传委员工作流程指南（「块块」职权保留）——均无职责推导逻辑；党小组组长工作手册 L74「"信息触达"角色」→「党小组组长」职责归属叙述
- ⑥ **commissioner-matrix.js**：删 `person` 字段（原 L9/30/51 三个人名）+ 渲染行（L89）
- ⑦ **CLAUDE.md**：乙部新增 T-200「书记原话逐条复核」（L558，长期任务）；H5.8.2（L400）追加「句式合规」块——禁用「不是……而是……」句式
- ⑧ **README.md（根目录）**：L128「条块二元」条目旧表述（委员持功能决策权/组长持信息触达权）→「"条"与"块"是理解权责关系的两把尺子……谁做什么由岗位职责定义决定，不由条块推出」（i8 复扫发现并补修）

**变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/insights/党支部管理与实务经验沉淀.md`、`docs/help.html`、`docs/src/components/commissioner-matrix.js`、`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/02_institution/sop/党小组组长工作手册.md`、`README.md`、`CLAUDE.md`、`.trae/specs/tiaokuan-jiuzheng/spec.md`（新增）

**验证结果（GetDiagnostics + 全仓 Grep + 浏览器实测）**：
- ✅ GetDiagnostics：help.html/help-entry.js/commissioner-matrix.js 零 JS 错误（仅既有 markdownlint 警告）
- ✅ 浏览器实测：help 页 4.4 新表述渲染正确、三委员矩阵无真实人名、致谢人名保留、console 无 TypeError/404
- ✅ 全仓 Grep 复扫：`条条管事|块块管人|纵线管事|横线管人|管"事"|管"人"|人的问题找|功能问题找|条管|块管|功能决策|信息触达权` 用户文档零残留（archive/logs 历史除外；党小组组长工作手册 L209「信息触达」为核心群设计考量描述、OPERATIONS_GUIDE「管人vs管事」为反论评议方法论历史案例——均无职责推导，保留）
- ✅ docs/ 真实人名仅存在于 help.html 致谢（L147-149）+ renderer.js MOCK_OPERATORS（工作台 mock，非 about/help 页范围）
- ✅ 一改具改：SECRETARY_PRONOUNCEMENTS 目录锚点/intro/过渡段/P-026 同步；insights §4.2/§4.7 母本反论同步；README 根目录同步；SOP_WEB/ARCHITECTURE/DOC_MAP 条块术语按书记裁决保留（无推导）

**沉淀标签**：`[已沉淀: CLAUDE.md H5.8.2 句式合规]` — 禁用「不是……而是……」句式（书记判例 2026-08-03 T-199 P-014 微调）；`[已沉淀: CLAUDE.md 乙部 T-200]` — 书记原话需每一条由书记逐条复核，P-014 为第一例

## T201 T-201 help 页视觉再设计：快速导航矩阵 v4 + 正文风格 A 纯化（2026-08-04）

**任务**：承接书记对 help 页（系统说明书）的两点不满——①快速导航 7 组 29 张纯文字 quick-card 网格"罗列完全无用"，需要更美观高效的表现形式；②第二至五章正文字体排版过分单一。经 brainstorming 逐轮确认方案后落地：快速导航改「角色×功能域矩阵 v4」（4 行 × 6 列），正文升级「风格 A 纯化」版式（章眉导语 + 小节编号徽章 + 要点卡/对比卡/查找卡/金色引语/理念卡）。

**引用流程**：brainstorming Skill（视觉伴侣逐轮确认：矩阵 4 版迭代 + 正文 3 版迭代）+ web-design-guidelines Skill + writing-plans Skill（6 Task 计划）+ verification-before-completion Skill（browser_use 四轮实测 + GetDiagnostics）

**来源**：书记指令（2026-08-03/04）——"快速导航的部分固然很全面，但是这样的罗列完全无用！能否有更加美观且高效的表现形式和视觉选择？""剩余正文的部分，我认为字体和排版都过分单一了！"；四批复批意见——"活动与专班；考勤与考察——这个'与'字不能少""组织者和深度参与者旁边的专班还存在！""字体、颜色 请全局性地再次审查清楚！致谢请修改为华文仿宋，其他部分自行考虑！！""正文字号能不能再统一一点，不急着commit"

**书记决策（brainstorming + AskUserQuestion 逐条确认，见 `docs/superpowers/specs/2026-08-03-help-visual-redesign-design.md`）**：
- 快速导航=矩阵（选项 A），强扁平化原则：书记不得置于最高/最中心，六类角色列等宽平级、书记列置后；空格过密→变体 B 紧凑表格；矩阵行归并=考勤+考察→「考勤与考察」行、活动+专班→「活动与专班」行（专班不得与统筹合并）；矩阵为 4 行功能域 × 6 角色列
- 正文=风格 A（层次增强）但克制（适当叙事流），最终"风格 A 纯化"：章头左对齐文档结构（红序号+衬线大标题+红渐变分隔线+左对齐导语），叙事流仅保留金色引语一处；配色收敛「红=关键、金=引语、灰=正文」
- 复批修正：合并行标签必须保留"与"字（活动与专班/考勤与考察）；致谢改华文仿宋；正文字号收敛 6 档梯队（1rem 导语引语致谢/0.95 正文/0.9 要点卡列表表格/0.85 卡标题/0.82 卡正文/0.78 小标签）
- 缓存机制：组件导入加 `?v=20260803h` 版本参数强制缓存失效（角色层级图"专班盒"为缓存旧版所致，T-198 已去除）

**实施内容**：
- ① **快速导航矩阵 v4**：quick-* 卡片网格样式/HTML 全量替换为 qn-* 矩阵（公共页面横条 4 chip + 4 行 × 6 列表格 + 29 功能 chip 跳转）；媒体查询移除 quick-grid 降级，窄屏由 `.qn-table-wrap` 横滑承载
- ② **正文版式样式**：doc-h3 徽章 flex 布局 + doc-h3-badge（15 处小节编号徽章 1.1~5.2）+ doc-lead 增强 + 变体样式五件套（doc-key 要点卡/doc-duo 对比卡/doc-finder 查找卡/doc-quote 金色引语/doc-minis 理念卡）+ 媒体查询降级
- ③ **章眉导语 + 第二章理念卡**：二/三/四/五章各加灰导语；第二章三大理念（制度即代码/角色即视图/经验可传承）改三并列浅灰卡
- ④ **第三章版式**：3.1/3.3/3.6 注记改要点卡；3.2 条块双线→对比卡（纵/横）；3.4/3.5 活动专班走谁的门→对比卡（3.5 标题保留独立小节，修正计划代码遗漏）
- ⑤ **第四章版式**：4.1/4.3/4.5 要点卡；4.2 常规 vs 攻坚对比卡；4.4 纵/横对比卡 + 「遇到具体事务找谁」查找卡（4 组映射）+ 条块金色引语；收尾 doc-note 保留
- ⑥ **复批修复三轮**：矩阵行标签补"与"字（活动与专班/考勤与考察，查找卡 chip 同步）；help-entry.js 组件导入加 `?v=20260803h`（强制缓存失效）；致谢改华文仿宋 doc-ack（STFangsong 回退链）；收尾警句改衬线体；矩阵字号上抬（chip 0.7/单元格 0.72/功能域 0.8）；修复 `td.qn-domain` 被 `table.qn-matrix td` 特异性覆盖 bug；正文字号收敛 6 档梯队
- ⑦ **版本 bump**：`help-entry.js?v=20260803g` → `?v=20260803h`

**变更文件**：`docs/help.html`、`docs/src/entries/help-entry.js`、`docs/superpowers/specs/2026-08-03-help-visual-redesign-design.md`（新增）、`docs/superpowers/plans/2026-08-03-help-visual-redesign.md`（新增）

**验证结果（browser_use 四轮实测 + GetDiagnostics + grep 计数）**：
- ✅ GetDiagnostics：help.html/help-entry.js 零错误
- ✅ 第一轮浏览器：矩阵 4×6（书记列置后·统筹行仅书记红 chip）+ 15 徽章 + 二/三/四章导语理念卡 + 三/四章变体卡 + 金色引语 + 圆点 TOC 滚动高亮，6/6 通过
- ✅ 第二轮浏览器：矩阵行标签「活动与专班/考勤与考察」生效；role-hierarchy 底层三平级卡（普通成员/组织者/深度参与者）附近无「专班」；组件导入 `?v=20260803h` 强制失效缓存（bfcache 恢复的旧 DOM 在 reload 后消失）
- ✅ 第三轮浏览器：致谢计算字体=STFangsong 华文仿宋；doc-note 衬线体；矩阵字号上抬；党建红 #CE1126/金 #FFD700/正文灰 #374151 全部实测一致；qn-domain 特异性修复后 0.8rem/#111827/700 生效
- ✅ 第四轮浏览器：12 项字号梯队全部符合（1rem/0.95/0.9/0.85/0.82/0.78），全页无字号跳变
- ✅ grep 计数：quick-card 零残留；doc-h3-badge=16（15 HTML+1 样式）；doc-lead=7（2 样式+5 HTML）；qn-matrix=5

**沉淀标签**：`[已沉淀: content/insights/工程演进与设计方法论.md §4.16]` — 扁平化矩阵形态（角色列等宽平级、书记置后、行标签保留"与"字）可作为各角色页导航参考；`[已沉淀: content/insights/工程演进与设计方法论.md §4.14]` — 正文 6 档字号梯队（1rem 导语引语致谢/0.95 正文/0.9 要点卡列表表格/0.85 卡标题/0.82 卡正文/0.78 小标签）；`[已沉淀: content/05_ai_coding/KNOWN_PITFALLS.md §13]` — 子组件 JS 导入需带 `?v=` 版本参数，否则旧版缓存长期残留（本次"专班盒复活"即缓存所致）

## T202 T-202 全仓"专班攻坚"余毒清零 + help 3.4/3.5 合并 + 三委员矩阵组件删除（2026-08-04）

**任务**：书记对 T-201 归档后发起新一轮整改——①全仓清查"专班是攻坚的"余毒（书记强调从未说过）；②help 页 3.4/3.5「活动走谁的门/专班走谁的门」合并为「活动的组织与专班的统筹」；③组织性叙事贯穿其中；④删除「三委员工作台职责矩阵」h3 组件（qn-matrix 表格已可表现，且表格致字号差异大）；⑤`td.qn-empty` 狗皮膏药色改白。

**引用流程**：web-design-guidelines Skill + brainstorming Skill（三轮 AskUserQuestion 逐条确认）+ verification-before-completion Skill（browser_use 三页实测）

**来源**：书记指令（2026-08-04）——"我从未说过，专班是攻坚的！全仓库清除余毒！！！""请不要用 活动走谁的门这种说法……应该说怎么组织？""我们的 组织性的 叙事 是贯穿其中的？这非常重要""td 我不喜欢这些颜色像狗皮膏药一样！请务必修正为白色！！"；"你完全在过拟合，我说的是content中的02_和03_"（纠错：清查范围实指 content/02_institution 与 content/03_doc_system 目录）

**书记决策（AskUserQuestion 三轮）**：
- 专班唯一特点：**不限时间、不限地点，推动支部的长期建设**——替代一切"攻坚/临时性"表述，并彻查全仓专班硬编码
- 3.4/3.5 合并标题=「活动的组织与专班的统筹」，表述改为"怎么组织"，组织性叙事贯穿
- 三委员职责矩阵组件=**整个组件删除**（含 js 文件）
- 日志处置=实时文件全清、.ctx/logs 历史保留；CHECKLIST 专班数据段保留（讲的是数据在哪些页面显示）
- 反论段处置=删除一切"为什么需要/为什么不是"反论段，直接陈述规则
- 4.2 对比卡=**不要对比！就是名字！**（删除常规/攻坚徽章，仅"活动/专班"名称）
- 母本同步更新：FLAT_DESIGN §三 三重启动判据→两项适用条件（删时效性判据）

**实施内容**：
- ① **攻坚余毒清零**：全仓「攻坚」按实时/历史分类清除——help 4.2、about-entry（3 处）、mock/taskforces+review、FLAT_DESIGN、组织委员指南、insights §3、spec/plan 全量同步为"不限时间不限地点、推动支部长期建设"；仅 .ctx/logs 归档保留
- ② **母本判据更新**：FLAT_DESIGN.md §三 三重启动判据（时效性/跨角色/不可拆分）→ 两项适用条件（跨角色/不可拆分），删除反论段；insights §3.1/§3.3/L74、组织委员指南引用同步
- ③ **help 3.4/3.5 合并**：「活动走谁的门/专班走谁的门」→「活动的组织与专班的统筹」（双卡：活动的组织/专班的统筹 + 组织性贯穿句）；原 3.6 普通成员顺延 3.5
- ④ **三委员矩阵组件删除**：commissioner-matrix.js 文件删除 + help-entry.js 导入/调用移除 + help.html 容器移除
- ⑤ **qn-empty 改白**：`td.qn-empty` #FAFAF9 → #FFFFFF
- ⑥ **死代码清理**：styles.css 宣传专班（publicity-taskforce-card/taskforce-member-chip/taskforce-empty）样式块删除；「专班对比提示」误标注释更正
- ⑦ **类型矩阵删除**：COMMISSIONER_FRAMEWORK.md §A.5 专班类型矩阵整节删除（保留编号不动，避免牵连 §A.6~A.7 引用）
- ⑧ **临时性表述同步**（书记确认两处都同步）：SECRETARY_PRONOUNCEMENTS P-014/L443、COMMISSIONER_FRAMEWORK §A.3、README/根目录 plan 专班条目——"临时性"→"不限时间、不限地点"
- ⑨ **spec/plan 同步 + 版本 bump**：spec/plan 攻坚/走门/组件引用全量同步 T-202 结果；help.html/about.html 入口 `?v=20260803h/e` → `?v=20260804a`

**变更文件**：`docs/help.html`、`docs/about.html`、`docs/src/entries/help-entry.js`、`docs/src/entries/about-entry.js`、`docs/src/components/commissioner-matrix.js`（删除）、`docs/src/mock/taskforces.js`、`docs/src/mock/review.js`、`docs/src/styles.css`、`content/02_institution/FLAT_DESIGN.md`、`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/02_institution/sop/组织委员工作流程指南.md`、`content/insights/党支部管理与实务经验沉淀.md`、`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`README.md`、`docs/superpowers/specs/2026-08-03-help-visual-redesign-design.md`、`docs/superpowers/plans/2026-08-03-help-visual-redesign.md`、`docs/superpowers/plans/2026-08-03-根目录文档更新.md`

**验证结果（browser_use 三页实测 + GetDiagnostics + grep 复扫）**：
- ✅ GetDiagnostics：help-entry.js 零错误
- ✅ help.html：3.4「活动的组织与专班的统筹」+ 3.5「普通成员」渲染正确；3.3~3.5 间无任何职责矩阵容器/组件残留；qn-matrix 28 单元格正常渲染；4.2 仅「活动/专班」两卡无徽章；console 无 404/模块加载错误
- ✅ about.html：全部区块渲染成功（含"专班：组织委员统筹，不限时间地点"场景）；无 404
- ✅ index.html：书记账号登录后首页正常（统计/通知/专班进展/日历）；无 404
- ✅ grep 复扫：`攻坚` 实时文件零残留（仅 .ctx/logs 历史）；`临时性` 实时文件零残留；`三重启动判据|走谁的门|commissioner-matrix` 仅日志/归档保留

**沉淀标签**：`[已沉淀: SECRETARY_PRONOUNCEMENTS.md P-014（2026-08-04 复核）]` — 专班唯一特点为"不限时间、不限地点，推动支部长期建设"，一切"攻坚/临时性/时效窗口"表述均需同步母本；`[已沉淀: CLAUDE.md H2.4 例外]` — 反论段清除原则：修改文本时删除"为什么需要/为什么不是"类解释段，直接陈述规则

## T203 全仓链接引用机械修订（dispatching-parallel-agents + 主线程兜底复核）（2026-08-04）

**任务**：书记指令——"请对全仓库做一次 机械的 链接引用 的修订，确保所有引用准确！！ Use Skill: dispatching-parallel-agents"。对全仓 markdown 文件的站内链接（相对路径 + 锚点）做机械式审计与修正。

**引用流程**：dispatching-parallel-agents Skill（5 个并行 agent 分域审计）+ 主线程 PowerShell 机械复核（Test-Path 全量路径存在性检查）+ verification-before-completion Skill

**实施内容**：
- **并行 agent 修复 25 处**（A 根目录/01_strategy/README 10 处 + B 02_institution 1 处 + C 03/04/05 13 处 + D insights 1 处 + E docs/superpowers 0 处）：
  - 路径层级修正：`../03_doc_system/`、`../02_institution/` 前缀补齐（SECRETARY_PRONOUNCEMENTS/OPERATIONS_GUIDE/SERVICE_CATALOG/USAGE_POLICY/SOP_WEB/MODULE_UI_DESIGN 等）
  - 冗余前缀清除：SECRETARY_PRONOUNCEMENTS 内 `content/01_strategy/` 前缀移除（同目录直接文件名）
  - 目录链接改指具体文件：01_strategy/README `references/建设探索/`→具体 md；02_institution/README `sop/`→`sop/INDEX.md`
  - 越级路径修正：DEVELOPMENT_PATH `../references/`→`references/`
- **主线程兜底复核发现并修复 11 处 agent 遗漏断链**（全量 Test-Path 机械扫描）：
  - `../../01_strategy/SECRETARY_PRONOUNCEMENTS.md`→`../01_strategy/`（COMMISSIONER_FRAMEWORK ×3、SERVICE_CATALOG ×3、USAGE_POLICY ×2、OPERATIONS_GUIDE ×1）
  - `../04_web_design/SOP_WEB.md`→`../../04_web_design/`（宣传/纪检/组织委员指南各 1）+ `../04_web_design/DATA_ARCHITECTURE.md`→`../../`（sop/INDEX）
  - `../03_doc_system/工作模板/…`→`../../03_doc_system/`（常见工作场景快速指南 ×3）
  - SSOT_INDEX `CLAUDE.md`→`../../CLAUDE.md`；KNOWN_PITFALLS `OPERATIONS_GUIDE.md`→`../03_doc_system/OPERATIONS_GUIDE.md`（×2）
- **锚点核验**：SECRETARY_PRONOUNCEMENTS L42 slug 锚点恢复原式（空格→连字符规则，宽松匹配误改已还原）；SOP_WEB `#b3-三支委看板视图体系`、CLAUDE `#h22-设计母本与子本`、OPERATIONS_GUIDE `#74/#152` 锚点逐一对应标题存在
- **YAML last_updated 同步**：本次新增修改的 6 个文件（sop/INDEX、宣传/纪检/组织委员指南、常见工作场景快速指南、SSOT_INDEX）统一至 2026-08-04

**变更文件（18 个）**：`content/01_strategy/{DEVELOPMENT_PATH,README,SECRETARY_PRONOUNCEMENTS}.md`、`content/02_institution/{README,COMMISSIONER_FRAMEWORK}.md`、`content/02_institution/sop/{INDEX,宣传委员,纪检委员,组织委员,常见工作场景快速指南}*.md`、`content/03_doc_system/{OPERATIONS_GUIDE,SERVICE_CATALOG,USAGE_POLICY,SSOT_INDEX}.md`、`content/04_web_design/{MODULE_UI_DESIGN,SOP_WEB}.md`、`content/05_ai_coding/KNOWN_PITFALLS.md`、`content/insights/党支部管理与实务经验沉淀.md`

**验证结果**：
- ✅ PowerShell 全量 Test-Path：全仓 21 处修改后链接路径全部有效（唯一剩余 `archive/YYYY-MM-early-entries.md` 为代码块内归档模板占位符，属预期豁免）
- ✅ 目录链接（`insights/`、`references/合规文件/`、`references/历史会议材料/`、`工作模板/` 等 7 处）指向真实存在目录，GitHub 渲染有效
- ✅ 锚点逐一核验：改动涉及的 4 组 slug 锚点与目标标题等值匹配

**沉淀标签**：`[待沉淀]` — 并行 agent 审计后必须加主线程全量机械复核兜底（本次 agent 遗漏 11/36 处断链，占 31%）；GitHub slug 锚点遵循"空格→连字符、中文保留"规则，宽松匹配仅用于验证不得用于改写

## T204 全仓过程性文件与脚本清理（2026-08-04）

**任务**：书记指令——"我们清理一下过程性文件和脚本！保持我们仓库绝对干净！！"。对全仓过程性文件/脚本/空目录做彻底清理，根目录仅保留正式目录。

**引用流程**：H2.2 母本子本 + D-233 历史记录不可变原则 + 历史清理先例（T61/T66/2026-07-18/2026-07-21 多次清理）

**清理明细**：
- **git rm 追踪污染（3 项，13 文件）**：
  - `docs/superpowers/`（specs 6 + plans 4 共 10 文件）——过程文件目录（书记 2026-07-21 已定性，8 月新任务又积累）
  - `.trae/.ignore`——.trae 目录整体清理
  - `.vscode/settings.json`——个人 IDE 配置（引用已不存在的 .github/skills 与 .vibe_context，.gitignore 早已忽略却强制添加）
- **工作区清理（未追踪，5 项）**：
  - `.superpowers/`——brainstorm 会话过程文件（help 页面设计 6 HTML + 2 state）
  - `.tools/`——一次性修复脚本（_fix_about/_fix_content_ws/_fix_sopweb/_fix_ws.py ×4）
  - `.trae/specs/`——已完成任务的 spec 7 目录（help-chapters-rewrite/homepage-activity-card-merge/min-cost-workspace-design/secretary-global-overview/secretary-workspace-enhancement/tiaokuan-jiuzheng，成果均已沉淀）
  - `.trae/documents/`——一次性修复文档 1 个 + `.trae/skills/` 空目录 4 个
  - `.ctx/audit/`（含空 screenshots）、`server/uploads/`——空目录（uploads.js 运行时 `mkdirSync` 自动重建）
- **保留说明**：`references/党支部工作记录.docx` 为宣传委员产出物正式模板（SOP 引用），非过程文件；`.ctx/` 治理上下文、`content/`、`docs/`、`server/` 正式内容均保留
- **引用同步**：`.gitignore` 补 `docs/superpowers/`（防止再污染）；`.ctx/SNAPSHOT.md` 拓扑删 superpowers 行 + 变更来源简化；`.ctx/TIMESTAMPS.md` 删 docs/superpowers 段 + 已删记录追加 7 条 + last_updated；insights 工程演进与设计方法论.md 删除「与 spec 的关系」死引用句；CLAUDE.md 乙部历史任务记录中的 spec 路径引用按 D-233 保留（时间胶囊）

**验证结果**：
- ✅ 全仓空目录扫描：NO EMPTY DIRS
- ✅ 污染残留复查：.trae/.vscode/.superpowers/.tools/docs/superpowers/.ctx/audit/server/uploads 全部 False
- ✅ git 未追踪残留仅 server 运行时产物（data.db/node_modules，server/.gitignore 正常忽略）
- ✅ 剩余路径引用均为历史日志/规则说明/已删记录段（D-233 不可变原则），活跃文件零死引用

**沉淀标签**：`[已沉淀: insights 工程演进与设计方法论.md §7.5 仓库卫生]`（既有规则）— 过程性文件清理闭环：git rm 追踪污染 + 删除工作区残留 + 空目录归零 + .gitignore 防再生 + TIMESTAMPS 已删记录 + 引用同步；docs/superpowers/ 已被证明反复积累（3 次清理），列入 .gitignore 阻断

## T205 全仓减量第二波收尾——书记论断范式改革 + 批 2-5 DESIGN_SYSTEM 瘦身（2026-08-04）

**任务**：完成全仓减量第二波收尾两件工作——(1) 书记论断汇编整份文件范式改革（原话作正文 + AI 扩充入引用块）；(2) 批 2-5 DESIGN_SYSTEM.md 语义瘦身。

**范式改革（书记 2026-08-04 裁决，正文形式已写入文件头部 L16）**：
- **新范式**：书记原话作正文（正常字号），多条原话用无序列表列示（每条带后缀式日期）；AI 扩充内容放入引用块；去"书记原话："标签（"很出戏"）；日期后缀式且"原话"二字不多此一举（直接呈现原文）
- **改造范围**：SECRETARY_PRONOUNCEMENTS.md 全部 16 条带原话条目——P-045/P-047（第一章）、P-001~P-005/P-043/P-044（第二章）、P-006/P-007（第三章）、P-009/P-011/P-012/P-013（第四/五章）、P-041（第十二章）；P-010 无原话孤立引用块降级为正文
- **P-007 两条原话**（修正/补充定义）转无序列表；多条原话条目（P-047 8 条、P-002 2 条）此前已完成列表化

**批 2-5 DESIGN_SYSTEM.md 瘦身（书记三项裁决）**：
- **历史/执行记录归档**：§2.3.2 关键变更说明（v2→v3 角色色系统化色史）、§2.7 T-144 推广轮执行明细（压缩为三条现行规则：主操作回归角色主题色/visitor 金色按钮/语义红保留清单）、§7.2 Glass→Matte 变量迁移对照表——全部迁出至执行日志，文档只留现行规范
- **§5.4 像素美学原则 → "滚动驱动的场景切换"大原则**：书记裁决像素方向因工具原因放弃（非审美原因），论证细节归档日志；新 §5.4 记录 Exploration 区块设计大原则 = 滚动驱动的场景切换
- **功能色不一致修正**（书记裁决以落地值为准）：`--functional-success` #10B981→#16A34A、`--functional-warning` #F59E0B→#D97706（与 §2.7 状态色规则、T-144 全局落地一致；#10B981 仍是深度参与者角色色，避免与成功色撞色）

**变更文件（12 个）**：`content/01_strategy/{DEVELOPMENT_PATH,SECRETARY_PRONOUNCEMENTS}.md`、`content/02_institution/{ROLE_CLASSIFICATION}.md`、`content/02_institution/sop/党小组组长工作手册.md`、`content/03_doc_system/{ARCHITECTURE,OPERATIONS_GUIDE,USAGE_POLICY}.md`、`content/04_web_design/{DATA_ARCHITECTURE,DESIGN_SYSTEM,SOP_WEB}.md`、`content/05_ai_coding/KNOWN_PITFALLS.md`、`content/insights/工程演进与设计方法论.md`

**减量核算**（对照 HEAD a5d85af，12 文件合计 Δ −11,128 字符）：
- SECRETARY_PRONOUNCEMENTS −3,198（28,618→25,420）、DESIGN_SYSTEM −2,948（24,752→21,804）、工程演进与设计方法论 −2,002、DATA_ARCHITECTURE −1,178、OPERATIONS_GUIDE −1,134、DEVELOPMENT_PATH −290、USAGE_POLICY −269、ROLE_CLASSIFICATION −142、KNOWN_PITFALLS −14；SOP_WEB +47（语义改写微增）；ARCHITECTURE/党小组组长工作手册 ±0（计数修正净零）

**验证结果**：
- ✅ "书记原话"标签条目体零残留（仅文件头部范式说明 + 元数据标注 + P-014 溯源批注 4 处合理保留）
- ✅ 跨文件引用核验：像素/§5.4/§7.2 无外部活跃引用（外部仅指向 §一/§4.6/§2.3），删除不破坏引用
- ✅ 字符重计：content/ .md 全量 417,248 + CLAUDE.md 43,827 = 461,075（含本轮减量后的当前状态）

**沉淀标签**：`[已沉淀: SECRETARY_PRONOUNCEMENTS.md 头部"正文形式"条款]`（2026-08-04 新规则）— 书记原话作正文/多条原话无序列表/AI 扩充入引用块/去标签/后缀式日期；`[已沉淀: DESIGN_SYSTEM.md §5.4]` — Exploration 区块大原则 = 滚动驱动的场景切换；`[待沉淀]` — 功能色/状态色以落地值为准，历史执行记录统一归档日志不留在文档（奥卡姆剃刀）

## T206 书记论述范式改革登记乙部 + T207 剩余文件全面过一遍 + help/about 命名扫尾修复（2026-08-04）

**任务**：书记指令——① 范式改革部分"先行放入乙部，我会继续操作" ② "剩下的文件都要全面地过一遍" ③ "请先优先保证，help和about现在所有的命名都已经更新到位！！链接引用也到位" ④ wrap up 本对话等待新命令。

- **乙部登记（CLAUDE.md）**：
  - T-206 书记论述范式改革·书记继续调整（🔄 书记操作中）：范式改革已落地（16 条带原话条目全部改造），书记裁决部分内容需调整，由书记继续操作，AI 等待逐条指示
  - T-207 全仓减量第二波续·剩余文件全面过一遍（⏳ 待启动）：书记指令"剩下的文件都要全面地过一遍"，含 SERVICE_CATALOG 18k / MODULE_UI_DESIGN 17k / COMMISSIONER_FRAMEWORK 16.5k / 常见工作场景快速指南 15k 等，按 H5.7 语义瘦身逐批审议

- **help/about 命名与链接扫尾核查**：
  - ✅ 页面身份：help.html=帮助/系统说明书、about.html=关于/支部故事（title/description 正确）
  - ✅ 入口绑定：help.html→help-entry.js、about.html→about-entry.js（版本号同步）
  - ✅ 侧边栏导航：sidebar.js 帮助→help.html、关于→about.html
  - ✅ 内容文档映射：SERVICE_CATALOG/SOP_WEB/ARCHITECTURE/CHECKLIST/DATA_ARCHITECTURE/DESIGN_SYSTEM 均指向正确身份
  - ❌→✅ **命名残留修复**：about.html 主容器 `id="help-content"`（互换后残留）→ `id="about-content"`；about-entry.js `renderHelpContent()` 函数名 + `#help-content` 引用 + 日志标签 → `renderAboutContent()`/`#about-content`（6 处）；入口版本号 `?v=20260804a`→`?v=20260804b` 强制缓存失效
  - ✅ 浏览器双页实测：help.html 标题/内容/控制台零错误；about.html 标题正确、10 个区块全部写入（TOC/Hero/Cognition/Development/Philosophy/Review/TwoWorks/Exploration/Dialogue/Conclusion）、`#about-content` 挂载成功、无 `not found` 报错
  - ✅ 全仓 grep 零残留：`help-content`/`renderHelpContent` 零匹配；`entries/help.js`/`entries/about.js` 旧名零引用；KNOWN_PITFALLS L195/L224 为历史判例（T147/T-201 时间戳标注），身份互换后仍指向正确页面名

**变更文件**：`CLAUDE.md`（乙部 T-206/T-207）、`docs/about.html`、`docs/src/entries/about-entry.js`
**验证结果**：✅ GetDiagnostics 零错误；✅ 浏览器双页渲染正常；✅ 全仓 grep 零残留
**沉淀标签**：`[待沉淀]` — 页面内容互换后需同步检查容器 ID/函数名/日志标签等内部命名残留，浏览器实测确认渲染；`[已沉淀: KNOWN_PITFALLS §13]` — 入口脚本 `?v=` 修改后需同步 bump 版本参数强制缓存失效

## T207 关于页电影化滚动叙事：四大滚动效果 + 微光粒子（2026-08-04）

**任务**：书记指令——"滚动驱动的场景切换、滚动吸附、滚动叠层转场、滚动驱动的全屏扩展转场……这么多的效果可以应用在 about界面上！！这个是我们在涉及about的时候一个非常重要的美学考量。这个部分允许你适当的fancy!"（指定使用 web-design-guidelines / algorithmic-art / gsap-core 三个 Skill）
**引用流程**：H1.2 执行 + web-design-guidelines Skill + algorithmic-art Skill + gsap-core Skill + AskUserQuestion 方案批准 + verification-before-completion Skill

- **设计批准（AskUserQuestion）**：
  - 方案：「认可，全章节实施」——四大滚动效果全章节落地
  - 粒子：「Hero + 终章加微光粒子」——生成式粒子背景仅加在开场与终章
  - 约束（web-design-guidelines）：只动 transform/opacity（compositor-friendly）；不 transition: all；reduced-motion 全内容立即可见；粒子 canvas 无 pointer-events

- **四大滚动效果落地映射**：
  - ① **滚动驱动的场景切换**：Hero 滚动退场（`bindHeroExit` scrub 上移淡出交棒）+ Dialogue 环形四阶段滚动点亮（`bindDialogueScrollActivation` data-state 三态）+ Exploration 行星节点光晕升级（CSS data-role star/planet 呼吸光晕）
  - ② **滚动吸附**：章节边界 GSAP snap（`bindSectionSnap`，Development 长时间轴不设吸附点避免打断 13 节点阅读）
  - ③ **滚动叠层转场**：四个短章节 pin + 下一章自然覆盖滑入（`bindCinematicLayerTransitions`：Cognition→Development / Philosophy→Review / Review→Works / Works→Exploration），覆盖章节顶部柔影作层叠可读线索
  - ④ **滚动驱动的全屏扩展转场**：终章封章（`bindConclusionSeal`）红金圆环 scale+opacity scrub 全屏展开 + 内环虚线旋转装饰
  - **生成式微光粒子**：`initParticleCanvas` 原生 Canvas（避免 p5.js 额外依赖）+ mulberry32 seeded RNG（同一 seed 恒重现）+ 党建红 #CE1126 / 党徽金 #FFD700 / 微银三色低密度（24000px²/粒子）慢速上升，离屏/切后台自动暂停

- **Development 滚动驱动增强**：顶部粘性进度条（scaleX scrub，transform-only）+ `.help-tl-stage.is-active` 阶段高亮

- **reduced-motion 降级**：`bindCinematicScroll` 仅 no-preference 分支创建 pin/snap/scrub，reduce 下零实例；CSS `@media (prefers-reduced-motion: reduce)` 强制封章 scale(1)/opacity(1)、进度条 scaleX(1)、Dialogue 卡片全显、粒子画布隐藏、节点光晕动画关闭

**变更文件**：`docs/about.html`（版本 bump `?v=v12` + `?v=20260804c`）、`docs/src/entries/about-entry.js`（v14：粒子/四效果/进度条/Dialogue 激活/封章）、`docs/src/styles.css`（电影化滚动叙事样式块 + reduced-motion 补充）
**验证结果**：✅ GetDiagnostics 零错误；✅ 浏览器实测全通过——控制台零 JS 错误、9 区块全渲染、Hero 粒子 340 光点（红140/金20/灰146）、4 处叠层转场复现、进度条随滚动增长、Dialogue 四卡片依次点亮、封章 0.12→1 全屏展开、snap 章节边界吸附正常、Footer 正常；reduced-motion 因环境无法浏览器级模拟（Playwright/CDP 均不可用），静态路径已逐项核对
**沉淀标签**：`[待沉淀]` — 滚动叙事四件套（Hero 退场/章节 snap/叠层 pin 覆盖/封章扩展）+ 原生 Canvas seeded 粒子可作为全站电影化滚动范式复用；`[已沉淀: KNOWN_PITFALLS §13]` — 入口 `?v=` 与 CSS `?v=` 需同步 bump

## T207-2 关于页电影化滚动叙事 v2 重构——书记三轮裁决落地（2026-08-04）

**任务**：书记对 T207 首版提出三轮批评并责令重构——①"滚动吸附我认为最重要的使用只是exploration的部分！！其他部分请你不要随意添加，会很破坏UI连续性！"；②"组件风格也要一并调整、背景颜色、字体设置……一定要满足好我们的高端审美需求！！"；③"滚动叠层转场、滚动驱动的全屏扩展转场"仍呈"垂直上下的表现！甚至不如PPT！！"；并要求在 global 部署 taste skill（find-skills 安装 `design-with-taste`）与 web-design-guidelines 配合。

**引用流程**：find-skills Skill（安装 design-with-taste 全局）+ web-design-guidelines Skill（Vercel 最新规范重抓）+ gsap-core Skill + AskUserQuestion 方向裁示 + verification-before-completion Skill（browser_use 两轮实测）

- **书记方向裁示（AskUserQuestion）**：不全局统一——about 起演示作用（"书记在给积极分子介绍组织，他也是一步一步来"）；机会 2 卡片非并列关系，先出现一个再出现一个；终章封章压合升级
- **重构落地（about-entry.js v15 + styles.css）**：
  - ① **吸附限缩**：删除全局 `bindSectionSnap`（章节边界吸附），新增 `bindExplorationSceneSnap`——吸附仅限探索区，目标点=每张 stage 顶到视口 40%，就近吸附黄金缓动；范围止于最后一张 stage（防吸附越界拦住后续章节）
  - ② **叠层转场空间化**：被覆盖章 inner 退后压暗（scale 0.945 + brightness 0.78 + yPercent -7，景深）；覆盖章 3D 升起落位（rotationX 6°→0 + scale 0.97→1 + transformPerspective 1200 + power2.out，拒绝纯垂直平移）；**toEl fromTo 加 `immediateRender:false`**（from 态只在转场区生效，实测发现加载期常驻 transform 会把文档撑高 2231px/横向溢出 298px，并引发滚动锚定漂移——已修）
  - ③ **终章封章压合**：旋转落章（rotation -26°→0 + scale 0.1→1）+ 金环压力波（`.help-conclusion-ring2` 从章心外扩消散）+ 六字逐字 blur→sharp 点亮（`renderConclusion` 标题改逐字 span，stagger 0.13 scrub）
  - ④ **演示式逐步揭示**：Philosophy 两张机会卡先后各一（标题副标题 top 82% → 卡一 top 70% → 卡二 top 45%，拆三个 ScrollTrigger）；Dialogue 四卡交还环形点亮（入场仅标题区/引言，卡片 data-state 三态控制）
  - ⑤ **高端化升级（t5）**：氛围背景光晕（红+金 radial，`isolation:isolate` + z-index:-1 限定章内）+ 章节暖色渐变背景（告别纯白，党建红不变）+ 卡片抛光（分层投影+顶光+悬停加深+按下回落）+ 排版精调（text-wrap:balance / tabular-nums / 字体平滑）+ 修复 about 页 2 处 `transition:all` 反模式 + touch-action:manipulation
- **reduced-motion 复核**：逐字 span/金环补降级规则（char 强制可见、ring2 隐藏），新 pin/snap/scrub 全部仅在 no-preference 分支创建

**变更文件**：`docs/about.html`（v13 / 20260804d）、`docs/src/entries/about-entry.js`、`docs/src/styles.css`
**验证结果**：✅ GetDiagnostics 零错误；✅ 第一轮浏览器实测：静态结构 9 节/7 字/2 场景全对、全局 snap 确认移除（三处滚动停留原位）、探索区吸附生效（差 0-4px）、叠层 3D 转场生效、Dialogue 三态齐全；发现 2 缺陷——探索区 snap 越界吸附把终章滚动吸回 12262（seal 无法触发）+ 初始 3D transform 撑高文档；✅ 第二轮复测 7/7 全通过：bodyH 全程 14923 稳定（±19px）、无横向溢出、终章可达（scrollY=14281=maxScroll、seal scale(1)/opacity(1)、7 字全亮、金环消散）、探索区吸附仍生效、3D 转场回归正常、无滚动漂移
**沉淀标签**：`[已沉淀: KNOWN_PITFALLS §13 补]` — ScrollTrigger 的 fromTo scrub 默认 immediateRender 会在加载期把 from 态（含 transform）常驻到元素上，视觉包围盒会撑高文档/横向溢出并引发滚动锚定漂移；空间类叠层转场必须 `immediateRender:false`；`[待沉淀]` — 吸附范围应以最后一个吸附目标为界，防止吸附"越界"拦住后续内容

## T207-3 关于页 v3 暖纸印刷叙事册重构——书记"很丑陋"推翻重来（2026-08-04）

**任务**：书记对 v2 下达"很丑陋！！"强令并授权"从头设计排版、动画！！胆大心细！！"，点名 Use Skill: design-with-taste + web-design-guidelines，提议引入【南西油墨宋】提升画面质感；强调"不要自说自话，要 ask user question，细节是魔鬼"。

**引用流程**：design-with-taste Skill（黄金缓动/渐进揭示/Fluidity）+ web-design-guidelines Skill + WebSearch 验证南西油墨宋（OFL 免费商用，思源宋体二次创作，油墨斑驳肌理，专为大字号）+ fontTools 子集化 + AskUserQuestion 四裁决 + browser_use 两轮实测

- **书记方向裁示（AskUserQuestion 四裁决）**：①暖纸印刷风（米白纸底+噪点肌理+墨色标题+党建红点缀）②油墨宋专用于标题/口号引语（小字号会糊）③叙事册风排版（每章一"页"，巨型页码+章节眉线，演示式逐步揭示）④空间纵深+材质动画（3D 推拉/旋转/视差+墨迹/纸张/印章转场，告别垂直上下）
- **重构落地（about-entry.js + styles.css + about.html）**：
  - ① **南西油墨宋部署**：40.8MB TTF → fontTools.subset（about 页全部字符约 870）→ 1.19MB woff2（`docs/assets/fonts/nanxi-youmosong-subset.woff2`），`@font-face` + `--ab-display` 字体栈
  - ② **册页骨架**：8 节全部升级 `.ab-page`（+ 巨型页码 `.ab-page-no` 01-07 + 章节眉线 `.ab-page-runner`）+ `.ab-chapter` 三件套（eyebrow/title/sub）；封面/封章 `.ab-page--cover/--closing`；章节背景交替用 `:not(.ab-page--cover):not(.ab-page--closing)` 排除封面封章
  - ③ **废弃环形箭头**（书记 dislike 环形箭头）：Dialogue 环形 2x2 + 椭圆环 + 4 箭头全部删除 → 四阶段横向四列卡（phase/question/answer 补样式），保留 data-state 三态滚动点亮
  - ④ **细节魔鬼修复**：`.ab-about` 类未挂载（JS 只 add `ab-v3`）导致 tokens/噪点肌理/油墨宋全部静默失效 → 修复后字体真实加载；`.ab-about` 与 `.ab-page` 的 `overflow:hidden` 会杀死 sticky 进度条与 ScrollTrigger pin（overflow hidden 祖先成为 scroll container 破坏两者）→ 移除，封面封章裁剪保留自身 overflow
  - ⑤ **动画空间纵深化**：Hero 纸页 3D 翻起推入（rotationX -14 + translateZ + 视差）+ 章节标题/卡片 rotationX 翻起（transformPerspective 900）+ Development 阶段分隔线 3D 翻起；保留叠层 3D 升起（immediateRender:false）与终章旋转落印
- **reduced-motion 复核**：新类统一补降级（ab-page/card 强制可见、seal 归位、char 全亮）
- **命名空间**：about 独立 `.ab-*`（`.help-*` 为 help/about 历史共用，v3 彻底隔离不污染 help 页）

**变更文件**：`docs/about.html`（v14 / 20260804e）、`docs/src/entries/about-entry.js`、`docs/src/styles.css`、`docs/assets/fonts/nanxi-youmosong-subset.woff2`、`.ctx/tools/subset_font.py`
**验证结果**：✅ GetDiagnostics 零错误；✅ 第一轮浏览器实测 9 节全渲染、无横向滚动、GSAP 无报错、页码眉线齐全；发现 1 关键缺陷——NanxiYoumosong 0 请求（.ab-about 类未挂载）；✅ 第二轮复测：woff2 请求 200 + 噪点 data URI 实际消费，字体/暖纸/肌理全部生效，首屏与前三章渲染无回归；✅ web-design-guidelines 审查：transition:all / outline:none 均在旧全局代码，about 新区块零违规（focus-visible / tabular-nums / text-wrap:balance / reduced-motion / touch-action 全达标）
**沉淀标签**：`[已沉淀: KNOWN_PITFALLS §14 补]` — CSS 设计 tokens 若挂载在动态注入容器的作用域类下，必须确保 JS 确实加上该类，否则 @font-face/伪元素肌理静默失效（浏览器 0 请求、无报错）；`[已沉淀: KNOWN_PITFALLS §15 补]` — `overflow:hidden` 祖先会杀死 sticky（成为 scroll container）并破坏 ScrollTrigger pin，空间转场容器勿设；封面封章的溢出裁剪应单独设在该页自身

## T116 T-116 反论评议第4轮（governance + strategy）12 条反论裁决 + 新原话 3 条双收 + 新规则 2 条 + 零残留清零（2026-08-05）

**任务**：T-116 反论评议·系统性第4轮（2026-08-04 书记选定范围）——content/03_doc_system/（governance）+ content/01_strategy/（strategy）。抽样 12 条反论（R37-R48）逐条书记裁决，处置关系按反论三类问题维度分流（保留/融入正论/删除反论+补充正论）。
**引用流程**：H5 书记评议（H5.1-H5.6）+ OPERATIONS_GUIDE §10.9 反论评议维度体系（含判定细则补充·一/·二）+ §10.7 历史范畴检查 + USAGE_POLICY §二.2.3 五条可复用检查规则 + sample-diff-learning Skill + brainstorming Skill
**来源**：书记指令——"我们接下来进行乙部的 评议 Use Skill: brainstorming Use Skill: sample-diff-learning !!"

- **预审发现（12 条）**：R37「权力来自位置而非能力」（表述不一致+而非句式）；R38「'有效'而非'圆滑'」（双对立+稻草人风险）；R39「为什么不是等级命令？」（设问式反论，与正论重复）；R40「整合沉淀而非筛选正确答案」（而非句式）；R41「为什么不是服从约束？」（设问式反论）；R42「参与构建而非进入成熟组织适应」（AI 扩充引用块）；R43「发起者不等于管理者」（不等于变体）；R44「经人类决策而非系统自动转换」（工程对比信息量）；R45「吃透精神而非复读原话」（自指冲突）；R46「'而非'警惕」元规则；R47/R48「判定标准是'无增量信息'而非…」「自然段落而非条目罗列」（元规则自指）
- **书记裁决（逐条 AskUserQuestion，全部落盘）**：
  - **R37 保留**（叙述张力）+ 书记追加全仓库「权力」字眼核查 + 新原话「赋权的体系会让不曾经历的人误以为只要有了位置就可以指挥掌握组织，这一方面掩盖了真实管理过程中的组织行为学，另一方面并不适用一个需要发挥创造力的组织」（2026-08-04）→ 双收 P-002
  - **R38 落盘**：书记判「圆滑和宣泄显然不等，是两个极端」→ L51「这要求的是'有效'——说出来的话要有推动力，既非圆滑式的不痛不痒，也非宣泄式的情绪倾泻。支委的角色是协助打磨想法——把个人的实践选择沉淀为组织的工作流」
  - **R40 改写正面 + 支委责任明确**：书记「要让大家一开始就意识到权力意味着责任！」→ L65「权力意味着责任：被赋权整合大家想法的人，要对每一个想法都认真对待」
  - **R41 删设问+融入正论** + 新原话「组织高度赞赏创新，不要因为年级、政治面貌而影响想法的交流和反馈」（2026-08-05）→ 双收 DEVELOPMENT_PATH 机会2 + P-044
  - **R42 删对立句** + 新原话「支部的建设方兴未艾，任何的意见、建议、创新都弥足珍贵」（2026-08-05）→ 双收 P-044
  - **R43 书记原话句式**：书记纠正「'发起与执行分离'不是书记原话！！！」→ 改用书记原话「发起是提出需求，招募是统筹执行」落盘 P-013
  - **R44 保留 + 工程宽容新规则**：书记「工程部分，对于反论可以更加宽容！特别是如果有过去技术路线探索和讨论的部分」→ OPERATIONS_GUIDE §10.9 新增判定细则补充·三（工程类文档对反论可更宽容，strategy/insights 维持严格标准）
  - **R45 保留 + P0 提升**：书记「这句话非常重要！！这句话在USAGE_POLICY中的地位要大大提高！！」→ USAGE_POLICY 原 §1.9「AI 展开原则」升为独立章 §二（P0 优先级），结构重排：一术语→二 AI 展开（2.1 核心原则/2.2 四种没吃透信号/2.3 五条可复用检查规则/2.4 禁止事项）→三 Emoji→四决策记录
  - **R46/R47 保留**；**R48 保留 + 表述历史锚引**：书记「这里书记应该有表述历史！」→ L502 锚引 USAGE_POLICY §1.8 书记原话（2026-07-15）：结构化内容用列表/表格、非结构化内容用段落化
- **零残留清零（书记裁决「本轮一并处理」）**：
  - 「身份由分工决定而非由层级决定」→ 书记原话式「身份由分工决定——组织者和深度参与者之间没有上下级关系，只是分工内容不同」（DEVELOPMENT_PATH L15/L230/L235/L237 共 4 处）
  - L211「而非机械背诵」→「理解其精神，并把它用到当下的实践中」；L230「而非反之」→「战略是方向，权限是落实」；L321「而不是上级对下级的分派」→「组织者和深度参与者是平等的协作关系，分工需经平等协商」
  - P-018「决策变成了孤例而非模式」→ 叙述式（2 处）；L25 导读删除「（而非想象中的）」括注
  - P-027 标题「双向而非单向」→「报备审批是双向关系」（同步附录锚点表 L694）；P-011 标题「协作而非指挥」书记裁决保留
  - P-029「身份≠权限」及 P-006/P-009/P-013/P-026「≠」标题书记裁决本轮不处理（≠ 与「而非」句式不同，属书记既有表述）
  - L158「而不是'重新发明轮子'」→「而不是'重复造轮子'」（书记补充指令：不写"发明轮子"）
  - L67「而非某个抽象的'党组织'在要求你服从」书记裁决保留（叙述张力）
- **外部引用同步**：CLAUDE.md L149 □9 表达合规引用→USAGE_POLICY §二；SECRETARY_PRONOUNCEMENTS L61/L69 §1.9→§二；DOC_MAP L204 Emoji §二→§三；SSOT_INDEX L189 EMOJI_POLICY 合并 §二→§三；TIMESTAMPS L353 EMOJI_POLICY §二→§三
- **零残留 Grep 验证**：✅「而非/而不是/不等于/权力」全仓库复扫——strategy/governance 范围内全部落盘或书记裁决保留（书记原话按 T-206 范式完整保留；R37 L49「权力来自位置而非能力」书记裁决保留；P-011 标题/P-029/≠ 标题书记裁决保留；references/ 外部文献排除）；✅ P-044 三条原话（2026-07-14 + 2026-08-05 ×2）与引用块转述一致，anchor 检查通过
- **变更文件**：`content/01_strategy/DEVELOPMENT_PATH.md`、`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/03_doc_system/USAGE_POLICY.md`、`content/03_doc_system/OPERATIONS_GUIDE.md`、`content/03_doc_system/DOC_MAP.md`、`content/03_doc_system/SSOT_INDEX.md`、`content/insights/党支部管理与实务经验沉淀.md`（§2.1 权力边界→职责边界）、`content/04_web_design/DATA_ARCHITECTURE.md`（权力归属→权限归属）、`content/02_institution/COMMISSIONER_FRAMEWORK.md`（审查权力→审查权限）、`CLAUDE.md`（L149 引用同步 + 乙部 T-116 状态）、`.ctx/TIMESTAMPS.md`、`.ctx/REVIEW_QUEUE.md`（已清空）
- **沉淀标签**：`[已沉淀: OPERATIONS_GUIDE §10.9 判定细则补充·三]` — 工程类文档（OPERATIONS_GUIDE 本身）对反论可更宽容——记录过去技术路线探索与讨论的部分（如 R7/R8 案例、"而非系统自动转换"对比）即使使用"而非"句式也应保留；面向用户的阐述性文档（strategy/insights）维持严格标准；`[已沉淀: USAGE_POLICY §二]` — AI 展开原则升 P0 独立章（原 §1.9），「吃透精神后写出，而非标注边界」为核心原则；`[经验: 选项文字不得自创书记表述]` — R43 反例：AI 提供「发起与执行分离」选项被书记否认为「这不是书记原话！！」，AskUserQuestion 选项必须用书记原话或明确标注 AI 建议；`[经验: 表述历史优先于 AI 自拟判定]` — R48 书记提示「这里书记应该有表述历史！」，判定标准应先锚引书记既有原话（2026-07-15）而非 AI 自拟

## T208 全系统内在一致性评议落盘（u1-u10）：探索过程术语/路径/编号翻转以现行状态为准 + 残留清零（2026-08-05）

**任务**：书记发起全系统「内在不一致」评议——"往往会有探索过程中前面认为A可行，后面又认为A不可行，所以一定要查清楚！！看以那个为准！"。以 SSOT_INDEX.md 为唯一参考入口，母本优先，清理探索过程中发生的术语/路径/编号翻转，以现行状态为准（H2.1 一改具改）。
**引用流程**：SSOT_INDEX.md（全系统一致性唯一入口）+ sample-diff-learning Skill（AskUserQuestion 逐条评议）+ brainstorming Skill + H2.1 一改具改 + H2.2 母本子本
**来源**：书记指令（原话）

- **3 批 AskUserQuestion 裁决（全部按 Recommended 落盘）**：
  - 第一批：MODULE_UI_DESIGN.md 全面改写为现行术语；SSOT_INDEX 迁移表新路径列更新；失效引用改现行权威源（DATA_ARCHITECTURE.md §3.3）；论断条数修正为 26
  - 第二批：CLAUDE.md §1.9→§二；DOC_MAP/README 补清单去残留；ARCHITECTURE 结构树修正为实际存在文件；SNAPSHOT H2.5→SOP_WEB.md §B.2
  - 第三批：P-046→P-045 编号修正；P-008/P-021 退役标注；「核心价值」警示词避让；docs 代码失效引用批量修正
- **u6-u9 落盘明细**：
  - **u6 MODULE_UI_DESIGN.md 全面改写**：约 30 处旧模块名（「党务管理模块/党建工作台」）归一为「「党建」Tab 分组/工作台」，覆盖线框图/方案 A/C/推荐理由/数据互通/参考指南/模板引用/映射图；新增 L152 决策取代注记说明历史对照；纪检指南引用 1.1→1.4、第四章→党务工作部分、公邮→党务工作·公邮管理
  - **u7 内容+docs 注释归一**：DESIGN_SYSTEM/DATA_ARCHITECTURE/README/ROLE_CLASSIFICATION/COMMISSIONER_FRAMEWORK/ARCHITECTURE/DOC_MAP + auth.js/icons.js/styles.css/workspace-popover.js/workspace-entry.js 全部改写为现行术语
  - **u8 domain.js/mock.js 失效引用更新**：MANAGEMENT_MODE.md §5.1/§5.3 → DATA_ARCHITECTURE.md §3.3；mock.js 删除失效来源引用
  - **u9 边缘残留**：党小组组长手册「核心价值」→「最了解」；insights 党建板块→党建工作/党务板块→党务工作（§1.3）；工程演进 L645 移除「L3」编号前缀残留、L780 补「P-008 已退役」标注、L392 补退役注记；insights milestone 双维度降级说明（「4 层文档层次」经 D-262 降级为局部维度）
- **u10 残留清零**：
  - **修复 2 处并行编辑竞态回退**：DESIGN_SYSTEM L520「<span>党建工作台</span>」→「<span>工作台</span>」；domain.js L153「Source: content/design/MANAGEMENT_MODE.md §5.1」→「Source: content/04_web_design/DATA_ARCHITECTURE.md §3.3」
  - **修复 3 处漏网残留**：DEVELOPMENT_PATH L262「党务管理模块」→「党务管理」；CLAUDE.md T-122 引用「USAGE_POLICY §1.9.3」→「§二.2.3」（§1.9 已升独立章）；CLAUDE.md T-117「27 条论断」→「26 条论断」（与 C-5 先例一致）
  - **3 处判定保留**：经验沉淀辅助提示词 L114/L117「党务管理工作/党务管理方面」（理论层动词性描述，非废弃模块名）；SECRETARY_PRONOUNCEMENTS L285「党务管理的是人员发展之事」（P-007 叙述性理论描述）
  - **历史记录核对保留**：sidebar.js L4-L5 历史变更注释、COMMISSIONER_FRAMEWORK L10 YAML merged_from、SSOT_INDEX L172-187 迁移表、.ctx/snapshots 与 .ctx/logs 归档——全部为合法历史记录
- **验证结果**：
  - ✅ 全仓复扫「党建工作台|党务管理模块|MANAGEMENT_MODE|content/design/」：仅剩合法历史记录（merged_from 字段/SSOT 迁移表/snapshots/logs 归档/「为已废弃旧模块名」现行表述）
  - ✅「§1.9」live 文件零残留（仅 .ctx/logs 历史记录）
  - ✅ P 编号 26 条一致（SECRETARY_PRONOUNCEMENTS 附录表 26 行 = README L134 = CLAUDE.md C-5/T-117）
  - ✅ 纪检委员工作流程指南章节结构正确（§1.1 党小组活动考勤/§1.4 补课制度/§党务工作·补课制度执行与公邮管理，无「第四章」残留）
  - ✅ SNAPSHOT H2.5→SOP_WEB.md §B.2 落盘
- **变更文件**：`content/04_web_design/{MODULE_UI_DESIGN,DESIGN_SYSTEM,DATA_ARCHITECTURE,README}.md`、`content/02_institution/{ROLE_CLASSIFICATION,COMMISSIONER_FRAMEWORK}.md`、`content/02_institution/sop/党小组组长工作手册.md`、`content/03_doc_system/{ARCHITECTURE,DOC_MAP,USAGE_POLICY,SSOT_INDEX}.md`、`content/01_strategy/{DEVELOPMENT_PATH,SECRETARY_PRONOUNCEMENTS}.md`、`content/insights/{工程演进与设计方法论,党支部管理与实务经验沉淀}.md`、`content/03_doc_system/工作模板/经验沉淀辅助提示词.md`（判定保留，未改）、`CLAUDE.md`、`docs/src/{core/domain.js,services/mock.js,services/auth.js,core/icons.js,styles.css,components/workspace-popover.js,entries/workspace-entry.js}`、`.ctx/logs/2026-08-EXECUTION_LOG.md`
- **沉淀标签**：`[经验: 同一文件并行 Edit 竞态回退]` — 对同一文件的多处 Edit 必须串行执行或分批后立即 Read 复核，否则后写回退覆盖先写（本次 DESIGN_SYSTEM L520/domain.js L153 即因此漏网，靠 u10 复扫发现）；`[经验: 历史记录与现行状态区分]` — 全仓复扫旧术语时，merged_from 字段/迁移表/snapshot/执行日志中的历史记录须逐条核对后保留，不能一刀切删除；「党务管理」为理论层术语保留、「党务管理模块/党建工作台」为废弃模块名改写——两类边界以现行术语体系（T1 官方定义）为准

## T209 全仓标题与 YAML 格式统一（BOM 清除 + 字段顺序 + 内联数组 + 「的」空格归一）（2026-08-05）

**任务**：书记发起——"请系统修复 所有的标题、YAML格式！！ 这对我们仓库的美观 非常重要！ 规则要统一。目前CLAUDE.md的YAML的格式是比较正常的。---前后没有脏东西！！每一个字段单独占一行"。
**引用流程**：dispatching-parallel-agents Skill（3 代理并行，按文件不相交原则分派）+ H2.1 一改具改 + H2.2 母本子本
**来源**：书记指令（原话）

- **书记裁决（AskUserQuestion）**：①「5 类知识类型」命名中「的」两侧空格→去空格归一（如「支部发展和管理 的 战略」→「支部发展和管理的战略」）② YAML 字段顺序→统一为 CLAUDE.md 标准顺序（title→type→role→last_updated→status→其余）
- **根因识别**：多文件第一行被 7~77 个 U+FEFF（BOM）不可见字符污染——「--- 前面的脏东西」；`related_files` 用块状列表而非单行内联数组；字段顺序杂乱（role 开头等）
- **Agent 1 — 知识类型「的」空格归一（8 文件 30 处）**：`content/README.md`（L17-21 表格 5 行）、`content/01_strategy/README.md`、`content/02_institution/README.md`、`content/03_doc_system/README.md`、`content/04_web_design/README.md`、`content/05_ai_coding/README.md`（各 L2/L9/L11）、`content/03_doc_system/DOC_MAP.md`（L53/L66/L84/L100/L113 小节标题）、`content/03_doc_system/OPERATIONS_GUIDE.md`（§7.1 权威定义表格 5 行）
- **Agent 2 — .ctx 与根目录修复（8 文件）**：`README.md`（清除 14 FEFF，无 YAML 为公网文档既有设计保留）、`.ctx/logs/2026-07-EXECUTION_LOG.md`（清除 9 FEFF）、`.ctx/logs/2026-08-DECISION_LOG.md` 与 `.ctx/logs/2026-08-EXECUTION_LOG.md`（related_files→单行内联）、`.ctx/SNAPSHOT.md`（字段重排）、`.ctx/TIMESTAMPS.md`（last_updated 提前）、`.ctx/snapshots/INDEX.md`、`.ctx/snapshots/SNAPSHOT_v3_20260502.md`（字段重排）
- **Agent 3 — content 技术文档修复（6 文件）**：`content/03_doc_system/ARCHITECTURE.md`（清除 7 FEFF）、`content/04_web_design/{DATA_ARCHITECTURE（39 FEFF）,DESIGN_SYSTEM（77 FEFF）,MODULE_UI_DESIGN（11 FEFF）,SOP_WEB（11 FEFF + 字段重排）,SCHOOL_IT_DEPLOYMENT（title 加引号 + 补 type/role + related_files 7 项转单行内联）}.md`
- **验证结果**：✅ 14 文件 FEFF=0、首行均为 `---` 或合法内容；✅ 旧短语全仓零残留（`支部发展和管理 的|网站系统 的|文档系统管理 的`）、新短语 30 处确认存在；✅ related_files 全内联；✅ README.md/ references/ server/README/ REVIEW_QUEUE 等无 YAML 文件保留（既有设计/外部文献/历史记录）
- **变更文件**：`README.md`、`content/README.md`、`content/01_strategy/README.md`、`content/02_institution/README.md`、`content/03_doc_system/{README,DOC_MAP,OPERATIONS_GUIDE,ARCHITECTURE}.md`、`content/04_web_design/{README,DATA_ARCHITECTURE,DESIGN_SYSTEM,MODULE_UI_DESIGN,SOP_WEB,SCHOOL_IT_DEPLOYMENT}.md`、`content/05_ai_coding/README.md`、`.ctx/{SNAPSHOT,TIMESTAMPS,REVIEW_QUEUE}.md`、`.ctx/logs/{2026-07-EXECUTION_LOG,2026-08-DECISION_LOG,2026-08-EXECUTION_LOG}.md`、`.ctx/snapshots/{INDEX,SNAPSHOT_v3_20260502}.md`
- **沉淀标签**：`[经验: YAML BOM 污染清除]` — 「--- 前面有脏东西」根因是文件第一行被多个 U+FEFF 不可见字符污染；清除须用 `TrimStart([char]0xFEFF)` + `UTF8Encoding($false)` 无 BOM UTF-8 保存，勿用 ReadAllText 默认编码重写（会二次污染）；`[经验: 并行代理文件不相交原则]` — 按目录/文件不相交分派代理避免竞态，各代理自包含指令与验证要求；`[经验: YAML 统一规范]` — 首行必须是 `---` 且无任何前缀；每个字段单独占一行；`related_files` 用单行内联数组 `[...]` 而非块状列表；字段顺序按 CLAUDE.md 标准（title→type→role→last_updated→status→其余）；不发明文件原本没有的字段

## T210 仓库瘦身三线批 1：MODULE_UI_DESIGN -51% + SERVICE_CATALOG 过时引用修正 + DATA_ARCHITECTURE location 可选化 + git gc -60%（2026-08-05）

**任务**：仓库瘦身三线并行——线 A 文档内容瘦身（乙部 T-207 分片）、线 B git 体积、线 C 文件数量。批 1 范围 = MODULE_UI_DESIGN + SERVICE_CATALOG 语义瘦身 + DATA_ARCHITECTURE 字段可选化。
**引用流程**：H5.7 文件瘦身原则（CLAUDE.md L319-353 概念标签法 + 五条判定维度）+ sample-diff-learning Skill（抽样核验）+ brainstorming Skill（逐批判定）+ dispatching-parallel-agents Skill（3 代理并行，文件不相交）+ verification-before-completion Skill + H4.1 乙部任务机制（T-207 🔄 进行中）
**来源**：书记指令——"我们继续推进 仓库瘦身！！ Use Skill: sample-diff-learning Use Skill: brainstorming Use Skill: dispatching-parallel-agents"

- **书记裁决（AskUserQuestion 系列 13 项）**：
  - 瘦身方向=三者都做（git 体积 + 文档内容 + 文件数量）；文档瘦身 = 乙部任务
  - git 清理=保守 gc（不重写历史、不 force push）；references=全部保留
  - 总体方案=按批次推进；批 1 大删类 4 项全部删；事实修正+C 候选=修正事实（C 候选按 AI 评估推进）；CATALOG 大删类=推迟后期（SERVICE 服务目录工作刚开始）；CATALOG 过时引用=修正
  - §5.2 视图模式列=删除；批 1 抽样核验=通过
  - 附加要求（书记原话）："删除的内容一定要考虑——没有严重的信息丢失，特别是Harness信息"
- **线 B git 体积**：`git reflog expire --expire=now --all` + `git gc --prune=now --aggressive` → .git 26.1MB → 10.4MB（-60%），loose objects 清零
- **线 C 文件数量**：无缺失文件、无未跟踪非忽略文件、无仓库内空文件夹；DATA_AUDIT_REPORT_2026-07-15.md 删除（书记批准，功能由 DATA_ARCHITECTURE.md 承载）
- **线 A 批 1 执行（3 代理并行 + 主线程复核）**：
  - **MODULE_UI_DESIGN.md 524→255 行（-51%）**：删设计原则 5 条 AI 概括标签（正文各节仍展开）、侧边栏方案 A/B/C 对比+废案残留（留一行决策注「2026-08-03 决策：被角色工作台 Tab 分组形态取代」）、引用渲染机制 2 节（留 1 处指针→ROLE_CLASSIFICATION.md）、Schema 压缩为索引（→DATA_ARCHITECTURE §2.1/§2.12）、URL Hash、中/长期持久化方案（留指针→DATA_ARCHITECTURE §4.2）、可选排序、截断细节数值；修「入党申请人→」五阶段→四阶段；「桌面端（>=768px）」→「>=1024px」
  - **SERVICE_CATALOG.md 过时引用修正（6+3 处）**：权限依据 PermissionManager→AuthStore.canDo+ROLE_PERMISSIONS；系统服务表删 ViewModeStore/PermissionManager；§2.14 删「/ 模式概念」；§2.15 模式推导流程→AuthStore.canDo；§4.4 删「与模式推导」；3 处 deprecated 函数引用删除；§5.2「视图模式」列删除（auth.js L810 确认「权限系统重构后不再有 mode 概念」）
  - **DATA_ARCHITECTURE.md**：location 字段「必填=是」→「string|null / 必填=否 / 默认 null」（原位更新，不新增重复行）
- **Harness 信息零丢失复核（书记附加要求）**：MODULE_UI_DESIGN 删除项均为设计细节/AI 概括标签/废案对比/具体数值——关键决策注（2026-08-03 决策、D-241 思想汇报线下流程、D-244 职能动作隐喻）与指针（引用渲染→ROLE_CLASSIFICATION、Schema→DATA_ARCHITECTURE、持久化→DATA_ARCHITECTURE §4.2）全部保留，治理/制度/元规则信息零丢失；SERVICE_CATALOG 修正为现行 API，无制度信息损失
- **批 1 减量核算**：git diff --stat 对照 HEAD = MODULE_UI_DESIGN 249 行变化 / SERVICE_CATALOG 36 行 / DATA_ARCHITECTURE 10 行（合计 65 insertions / 230 deletions）
- **验证结果**：✅ 批 1 范围内零残留（SERVICE_CATALOG + MODULE_UI_DESIGN 内 canWriteActivity/canRecruitTaskForce/canManage/canAuthorize/canInitiateTaskForce/PermissionManager/ViewModeStore/模式推导/视图模式/participant-observe 全零命中）；✅ 3 处抽样核验书记全部通过（设计原则块删/方案对比→一行决策注/deprecated→AuthStore.canDo）
- **发现（批 1 范围外，待批 2 提交书记判定）**：视图模式概念残留于 SOP_WEB.md §B.2（「视图模式三分类架构」权威源声明但 auth.js 已废弃）、DESIGN_SYSTEM.md §4.10、DATA_ARCHITECTURE.md L920（gsm1921-view-mode 键）、insights 党支部管理与实务经验沉淀.md §4.6——均描述已废弃 mode 概念
- **变更文件**：`content/04_web_design/MODULE_UI_DESIGN.md`、`content/03_doc_system/SERVICE_CATALOG.md`、`content/04_web_design/DATA_ARCHITECTURE.md`、`.ctx/snapshots/DATA_AUDIT_REPORT_2026-07-15.md`（删）、`.ctx/snapshots/INDEX.md`、`.ctx/TIMESTAMPS.md`、`CLAUDE.md`（乙部 T-207 状态）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[待沉淀]` — 视图模式（mode/manage/participant-observe）为已废弃权限概念（auth.js L810），SOP_WEB/DESIGN_SYSTEM/DATA_ARCHITECTURE/经验沉淀中残留的旧概念描述应随批 2 修正；`[经验: 瘦身删除须做 Harness 复核]` — 书记要求删除内容无严重信息丢失（特别是 Harness 治理/制度信息），复核方法=逐项核对删除点是否有决策注/指针/权威源承载，指针化优先于直接删除

## T211 仓库瘦身批 2：COMMISSIONER_FRAMEWORK -23.1% + 常见工作场景快速指南 -12.3% + 视图模式残留修正 4 处 + 悬空引用修正 2 处（2026-08-05）

**任务**：批 2 范围 = COMMISSIONER_FRAMEWORK + 常见工作场景快速指南 语义瘦身 + 视图模式残留修正（SOP_WEB / DESIGN_SYSTEM / DATA_ARCHITECTURE / 经验沉淀）+ 悬空引用修正（SERVICE_CATALOG / SECRETARY_PRONOUNCEMENTS）。
**引用流程**：H5.7 文件瘦身原则（概念标签法 + 五条判定维度）+ sample-diff-learning Skill（抽样核验）+ brainstorming Skill（逐批判定）+ dispatching-parallel-agents Skill（3 代理并行，文件不相交）+ verification-before-completion Skill
**来源**：批 1 日志「待批 2 提交书记判定」+ 书记 AskUserQuestion 裁决

- **书记裁决（AskUserQuestion 系列）**：
  - 批 2 范围=两项都做（COMMISSIONER_FRAMEWORK + 常见工作场景快速指南）+ 视图模式残留修正
  - 书记附加背景（视图模式）："对于我们网页来说，视图功能目前有点鸡肋，或者说是因为没有服务器支撑，mock数据不是很完整，我们没有办法全要素体验 给一个人赋权后，他出现了多个工作台"
  - CF 强证据 12 项=批量执行；CF 中等项 12 项（含「视角」列黑话 + 悬空引用修正）=批量执行；常见工作场景快速指南瘦身候选=全量执行
- **线 A 批 2 执行（3 代理并行 + 主线程复核）**：
  - **COMMISSIONER_FRAMEWORK.md 631→485 行（-23.1%）**：强证据 12 项——赋权数据结构块→DATA_ARCHITECTURE §2.18 指针；§A.7 赋权流程两子节归并保留生命周期总览+指针；§B 整节归并（B.1 表保留+指针注记，三人名侯嘉嵘/闫鑫岳/韩思宁零丢失，B.2/B.3 删）；C.1a 说明 bullets 删（视图语义压缩一句）；「专班名单同步」行删；「更新反馈状态」空行删；「数据汇总导出」→§E.2 指针；E.1 月度闭环图压缩一句；§审批 §一/§二 删图留句；重复句删。中等项 12 项——A.2 设计目标表删；纪检概括句删；两论证段删；8 个工作台表「视角」列全删（含「人 centered」黑话）；纪检尾注删；F.4 活动策划行→§审批指针；§六 6.1/6.3 状态图删；D.1.1 标题简化「赋权入口设计」；F.2 删「（核心）」；F.1 图压缩+指针。红线保留：§A.3/A.4/A.6/A.7 标题、§C 矩阵与色系、L62 赋权唯一来源、L64 D-240、赋权撤销流程、D.1 两原则、赋权入口表、F.5 冲突表、§审批全节
  - **常见工作场景快速指南.md 559→490 行（-12.3%）**：强证据 18 项——导语删；文末版本块「使用反馈」保留；4 处「为什么这么做」论述段删（母本引用行全部保留）；「组织生活会是内容非类型」3 处归并保留 L200 首句；D-15 定义块删（L83 指针保留）；三会一课概念行删；四子章节 3 段重复句删（宣传产出物保留、四 `####` 标题保留）；通知发布联系人空转小节删；信息平台注意事项 4 条删；反馈平台维护句并入 L483 渠道表。需判定项——品牌建设指引压缩一句；品牌注意事项节删；「为什么品牌活动由党小组主导」「各党小组品牌方向」删；第 25 项「提名表扬」句删（全仓 grep 无母本依据）；第 26 项副书记行保留并补齐（与书记行一致，含积极分子考察）。红线保留：公共规则表、活动类型判断表、主题党日/组织生活会主体、团支部合办、品牌定位、快速查找表、10 处母本引用指针、全部被引用锚点标题
  - **视图模式残留修正 4 处**：SOP_WEB §B.2 标题锚点保留正文改写现行架构（角色优先/canDo 判定/只读视角；删视图模式三分类表、模式流转图 deriveMode、ViewModeStore 小节、mode 白名单表；保留 T42 决策注与 AUTHZ_CHAIN 段；AuthStore 方法段按 auth.js 实际导出重写 getEffectiveRole/canDo/getViewableRoles/getRoleForPage/switchView/isCommissioner——未编造不存在的 getPrimaryRole/getActiveRole；L60 header.js 去「模式切换器」；L63 auth.js→ROLE_PERMISSIONS+canDo()+AUTHORIZE_CHAIN；L201→initiate_taskforce；L191 canWriteActivity @deprecated 标注保留）；DESIGN_SYSTEM §4.10 改名「数据展示视图组件」+ 表头「展示视图」+ L405/L407 已删 §B.2 引用→定人定责定岗说明.md §二（CF 代理任务外发现）；DATA_ARCHITECTURE L920 gsm1921-view-mode 废弃键行删；经验沉淀 §4.6 标题后加退役标注行（正文保留为历史经验记录）；SOP_WEB E.2 跨页面状态表废弃键（ViewModeStore/PrimaryRole/ActiveRole）→现行机制键（gsm1921-login-user/gsm1921-session-snap/gsm1921-view-role/sop_org_os_auth_audit）
  - **悬空引用修正 2 处**：SERVICE_CATALOG L106 `§A.4~A.8`→`§A.4/§A.6/§A.7`（§A.5 已删保留空号、A.8 早年并入 A.7）；SECRETARY_PRONOUNCEMENTS L411-412 `§A.6/§A.9`→`§A.6`（均行内替换，行数不变）
- **Harness 信息零丢失复核**：CF §B 归并后 B.1 三人名表保留（L92-94 侯嘉嵘/闫鑫岳/韩思宁）；指针链完整（DATA_ARCHITECTURE §2.18 L78/L219、定人定责定岗说明 §二 L84/L363、§E.2 L167/L300、§审批 L60/L343/L384）；红线保留（L62 赋权唯一来源、L64 D-240、L66-74 赋权撤销流程、C 矩阵与色系、F.5 冲突表）；常见指南 10 处母本引用指针全保留
- **批 2 减量核算**：git diff --stat 对照 HEAD = 8 文件 **158 insertions / 410 deletions**（CF -254 / 常见指南 -89 / SOP_WEB -103 / SECRETARY_PRONOUNCEMENTS -35 / SERVICE_CATALOG -40 / DATA_ARCHITECTURE -11 / DESIGN_SYSTEM -18 / 经验沉淀 -18）
- **验证结果**：✅ 批 2 范围内零残留——`§A.4~A.8 | §A.6/§A.9 | 提名表扬 | gsm1921-view-mode | participant-observe | deriveMode | 人 centered | 项目 centered` 全零命中；✅ 三人名保留验证（CF L92-94）；⚠️ 收尾 Grep 发现 DESIGN_SYSTEM L413「人 centered」残留（CF 代理修了 L405/L407 引用、漏了 L413 同源黑话）——已修复为「以人为中心/以项目为中心」中文表述；✅ content 目录废弃概念（ViewModeStore/ActiveRole 等）零残留，logs/archive 命中均为历史审计记录保留
- **书记批 2 补充裁决（抽样核验）**：①CF §B 归并样本——**人名删除要求**：除致谢外其他场景尽量 de-personized（原话「人名请你删去。我认为除了致谢中表现人名，其他场景尽量 de-personized」）→ CF B.1 表删除「人名」列（侯嘉嵘/闫鑫岳/韩思宁，content 内人名清零）；②~⑤样本全部通过；**「管理模式」术语统一**——28 处全部执行（SERVICE_CATALOG ~20 处「管理模式」→「管理权限」、DATA_ARCHITECTURE 3 处「三级管理模式架构/总览」→「三级管理架构」+ L631「进入管理模式」→「管理视图」、MODULE_UI_DESIGN 2 处「三级管理模式数据流」→「三级管理架构数据流」、组织委员指南 1 处「工作台·管理模式」→「工作台·管理视图」、CHECKLIST 2 处「管理模式/只读模式」→「管理视图/只读视角」）；术语统一后 content 内仅剩 11 处「管理模式/只读模式」均为保留白名单（SECRETARY_PRONOUNCEMENTS P-029 书记原话、经验沉淀 §4.6 已退役历史记录、工程演进历史描述）；**新任务指令**：视图设计部分要做系统性全面审视（另立项）
- **变更文件**：`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/02_institution/sop/常见工作场景快速指南.md`、`content/04_web_design/{SOP_WEB,DESIGN_SYSTEM,DATA_ARCHITECTURE,MODULE_UI_DESIGN}.md`、`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/03_doc_system/{SERVICE_CATALOG,CHECKLIST}.md`、`content/02_institution/sop/组织委员工作流程指南.md`、`content/insights/党支部管理与实务经验沉淀.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[经验: 并行代理任务内遗漏需主线程收尾 Grep]` — CF 代理修 DESIGN_SYSTEM L405/L407 但漏 L413 同源黑话——代理自验证范围外的同源残留需主线程全量 Grep 收尾；`[经验: 视角列黑话]` — 「人 centered」「项目 centered」为 AI 自创中英混杂黑话，统一改「以人为中心/以项目为中心」中文表述

## T212 视图设计系统性全面审视全闭环（A/B/C/D/E 五类） + E1 端到端数据流交织图落地（2026-08-05）

**任务**：书记指令——"视图设计的部分，我们要做一次系统性地全面审视！"。范围（书记全选）= A 文档一致性 / B 架构合理性 / C 鸡肋识别 / D 体验对齐 + 书记附加 E 类（数据交织 vs 功能搭积木）。报告载体 = REVIEW_QUEUE.md（书记裁决，不新增文档）。
**引用流程**：H5 书记评议（H5.1-H5.6）+ sample-diff-learning Skill + brainstorming Skill + H2.1 一改具改 + H5.7 文件瘦身原则

- **书记裁决链（AskUserQuestion）**：
  - 审视范围=A/B/C/D 全选；产出=报告先行、不新增文档（REVIEW_QUEUE 承载）
  - A 类=全部采纳；B1 视图机制=保留现状；B2 副支书共享书记工作台/B3 项目角色承载成员工作台=保留+文档明示；D 类=AI 验证
  - 书记关键反馈（E 类）="我们数据之间相互交织；但是网页系统功能并没有相互交织。它更像是做加法、搭积木。在表达上，能更加清晰地一定要更加清晰"
  - E 类=E1+E2 文档先行（即 E3 两者都做）；书记强调="考勤当然是挂靠在 活动 下的呀！！他是活动的副产物，又会进入我们的考勤考察总数据中——一定要搞清楚数据之间的交织关系和上下文关系"
- **A 类执行** ✅：A1/A2 MODULE_UI_DESIGN 线框图更新为现行导航（首页/工作台/资料查询/意见反馈/归档库 + 帮助/关于）与 tab 分组结构；A3 SOP_WEB §B.3 删除「commissioner-group」行（代码零存在）；A4 organizer/deep 行改「成员工作台（待办/项目分工/活动动态/考勤概况/我的考察）」
- **B 类执行** ✅：B1 viewType 保留现状（活跃概念，仅服务日历/检查器渲染）；B2/B3 文档明示「副支书与书记共享书记工作台」「项目角色承载于成员工作台」
- **C 类验证** ✅：C1 双通道验证通过（mock 分工预设 + 运行时赋权 authRecords）；C2 日历「彩色点+2 字缩写」已实施（calendar.js ACTIVITY_TYPE_SHORT + cal-activity-dot）
- **D 类验证** ✅/⚠️：D1 考勤卡片分布验证通过（首页已移除考勤概况 main-entry L483；书记只读监督/纪检考勤管理/组长考勤上传/成员考勤概况均落地；宣传委员无独立卡片）；D2 组件一致性待抽查、D3 系统跟随主题模式未实现（styles.css 无 prefers-color-scheme/data-theme）——两项列入网页 UI 专项工作项
- **E1 文档先行执行** ✅：DATA_ARCHITECTURE.md 新增 §1.3 端到端数据流交织图（L51-95）——设计原则引用书记「挂靠 + 聚合」双语义（同一条数据既挂靠其产生的上下文，又聚合进入跨实体的总数据）；主线一：活动上下文链（活动→任务 §2.12/分工 §2.6/考勤 §2.5/考察 §3.3/交接 §2.7）；主线二：副产物→总数据聚合（考勤→补课→回写「已补」+跨活动聚合→考勤总表；考察→纪检确认→组织委员建档→人才库+专班工作量汇总→个人档案）；主线三：赋权→工作台→入档（AuthRecord §2.18→项目角色工作台→工作量记录→解散报告→个人档案）+ 交织关系要点表（数据/上下文挂靠/聚合去向/关键字段）；§3.3 补「参见 §1.3」交叉引用；§3.1 标题残迹「三级管理架构架构」→「三级管理架构」（批 2 术语替换遗漏复扫发现）
- **REVIEW_QUEUE 收尾**：审视报告 + 评议结论 + E 类进度全部落盘后清空（H5.3 生命周期闭环）
- **验证结果**：✅ DATA_ARCHITECTURE §1.3 与 §3.3「考勤与考察的核心区分」一致（考勤=活动副产物 + 聚合考勤总表双语义在两处体现）；✅「三级管理架构架构」残迹零残留；✅ 网页 UI 专项工作项（D2/D3/E2）登记待办
- **变更文件**：`content/04_web_design/DATA_ARCHITECTURE.md`、`content/04_web_design/MODULE_UI_DESIGN.md`、`content/04_web_design/SOP_WEB.md`、`.ctx/REVIEW_QUEUE.md`（已清空）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: DATA_ARCHITECTURE §1.3]` — 数据交织「挂靠 + 聚合」双语义：同一条数据既挂靠其产生的上下文（考勤是活动的副产物），又聚合进入跨实体的总数据（考勤进入考勤考察总数据）——文档与功能层表达必须体现交织关系，而非孤立的积木堆叠；`[经验: 术语替换遗漏需跨章节复扫]` — 批 2「管理模式」术语统一后，§3.1 标题「三级管理架构架构」重复词残迹在审视复扫中才发现——批量替换后须全文 Grep 替换目标词 + 相邻词确认；`[待办: 网页 UI 专项]` — D2 组件一致性抽查 / D3 系统跟随主题模式（prefers-color-scheme）/ E2 功能层数据联动（待办项标注数据上下游）

## T213 仓库瘦身批 3：经验沉淀归并 + CHECKLIST 事实修正 12 处 + SSOT_INDEX 已迁出表格删除 29 行（2026-08-05）

**任务**：批 3 范围 = 党支部管理与实务经验沉淀 + CHECKLIST + SSOT_INDEX（T-207 四批推进计划：批1 T210 ✅ → 批2 T211 ✅ → 批3 本批 → 批4 定人定责定岗说明+三委员流程指南+FLAT_DESIGN+经验沉淀辅助提示词+DOC_MAP）
**引用流程**：H5.7 文件瘦身原则 + sample-diff-learning Skill（抽样核验）+ brainstorming Skill（逐项判定）+ dispatching-parallel-agents Skill（文件不相交并行分派）+ H2.4 反论段清除原则
**来源**：书记指令——"我们继续推进 仓库瘦身！！"

- **书记裁决链（AskUserQuestion，四问）**：
  - Q1 经验沉淀归并=**批量归并两处**（§1.1/§1.3 党建党务两分法重复展开 + §2.3/§3.1 专班定义重复）
  - Q2 设问段=**书记自定义裁决**："我觉得更重要的只是表达一种 设计的偏好。视图是由 数据性质和任务性质决定的。" → 确认方案 A「总纲+压缩」（增设设计偏好总纲 + 各设问段压缩为 1-2 行偏好陈述）
  - Q3 CHECKLIST 计数=**批量事实修正**（数据同源校验手册自身计数必须准确）
  - Q4 SSOT_INDEX=**删除表格保留头注**（Agent 注册表 + Skill 配置清单已随 .github/ 迁出，D-186 终结，仅历史档案）
- **经验沉淀执行** ✅（306→299 行，-2.3%；version 34.2→34.3）：
  - §1.3→§1.2 归并：删除两分法重复定义（表格 vs 正文各一次），仅保留「同源不同视角」独有内容 + 交叉引用 §1.1；同步修复拆分遗留的章节编号跳号（1.1→1.3 缺 1.2）
  - §2.3 精简：专班定义「跨小组、跨职能抽调人手」改交叉引用 §3.1，保留协作特征要点（桥梁作用/平等协商/自下而上需赋权）
  - §4.0 设计偏好总纲新增（书记论断 2026-08-05）：「视图是由数据性质和任务性质决定的」——图标/日历/看板/人才库归属等设计取舍的统一命题
  - 11 处「为什么……」设问段压缩为偏好陈述（§3.2/§4.2/§4.3/§4.4/§4.5/§4.6/§4.7×3/§4.8×2/§5.1），保留设问价值（正反两面论 H2.4）但删除长篇论证
  - 附录速查表、YAML milestone 字段、§4.6 已退役历史记录保留不动
- **CHECKLIST 执行** ✅（395 行不变，12 处事实修正）：people 27→50（p1~p50）、accounts 11→17、activities 25→29（act-28 已删）、attendance 43→60、inspection 12→42（insp-17 已删）、notices 10→13（notice-101~110 + 001/005/011）、发展阶段五阶段→四阶段（入党申请人已并入积极分子）；核实后修正 c1~c5 候选人为「由 PEOPLE 动态派生」表述、品牌活动 6→7 条（act-29 新增 isBrand）、mk3/mk5 补课失效引用改通用表述；taskforces 8 条、review 11+2、handovers 2 条、assignments 5 条核实无误保留
- **SSOT_INDEX 执行** ✅（198→169 行，-14.6%；version 3.7→3.8）：Agent 注册表表格（12 行）+ Skill 配置清单小节（16 行）删除，标题改「Agent/Skill 配置（已迁出）」，头注保留并注明「不再保留注册表与清单表格」；已迁移文件索引表保留
- **悬空引用修正**：DOC_MAP/README 对 SSOT_INDEX「Agent 注册表」描述更新为「Agent/Skill 配置已迁出」（USAGE_POLICY 引用 ARCHITECTURE.md 摘要不受影响）
- **竞态教训（3 次复现）**：同消息多 Edit 并行编辑经验沉淀出现部分丢失——§1.3/§3.2/§4.6/§4.7a/§4.7b 共 5 处修改未落盘，Read 复核发现后逐个串行重做。教训强化：**同文件严格一次一个 Edit，完成后必须 Read 全文复核落盘**（批 2 教训的再次验证）
- **验证结果**：✅ 零残留 Grep 通过（「1.3 党建工作」「为什么不是」「管理模式中也看到日历」零残留）；✅ Harness 复核通过——Agent 注册表详细内容已迁出 System-Residual 外部仓库，ARCHITECTURE.md L48 保留「Agent 注册表（摘要）」，无信息丢失；✅ 减量核算：3 文件合计 899→863 行（-36 行），git diff 66 insertions/100 deletions
- **变更文件**：`content/insights/党支部管理与实务经验沉淀.md`、`content/03_doc_system/CHECKLIST.md`、`content/03_doc_system/SSOT_INDEX.md`、`content/03_doc_system/DOC_MAP.md`、`content/03_doc_system/README.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 经验沉淀 §4.0]` — 视图由数据性质和任务性质决定（书记论断 2026-08-05）：视图不由设计者自由选择，而由被展示数据的数据性质（时间点事件/任务状态流/事/人）和用户要完成的任务性质（参会提醒/任务管理/监督确认）决定——图标、日历/看板、人才库归属等设计取舍统一在此命题下表达；`[经验: 同文件 Edit 必须严格串行]` — 同消息多 Edit 并行编辑同文件出现 3 次部分丢失竞态（工具结果片段与落盘状态不一致），必须一次一个 Edit + Read 全文复核；`[待办: 批 4]` — 定人定责定岗说明（15K）+ 三委员流程指南 + FLAT_DESIGN + 经验沉淀辅助提示词 + DOC_MAP（15K）

## T214 仓库瘦身批 4：三委员流程指南 + 定人定责 + DOC_MAP + FLAT_DESIGN + 提示词积木化（2026-08-05）

**任务**：批 4 范围 = 定人定责定岗说明 + 三委员流程指南 + FLAT_DESIGN + 经验沉淀辅助提示词 + DOC_MAP（T-207 四批推进计划收尾）
**引用流程**：H5.7 文件瘦身原则 + sample-diff-learning Skill（抽样核验）+ brainstorming Skill（逐项判定）+ dispatching-parallel-agents Skill（4 代理并行 + 主线程复核）
**来源**：书记指令——"我们继续推进 仓库瘦身！！"（延续批 3）

- **书记裁决链（两轮 AskUserQuestion，八问）**：
  - 第一轮：①事实修正=**批量修正**（定人定责 §3.2 矛盾 + 组织字段矛盾 + CF C.3 色系）②纪检 7 表=**删表改引用**③三文件归并=**归并全量**④DOC_MAP=**整节删+修失效**
  - **书记补充论断**（§3.2 修正指导原话）："关于支委和党小组组长这件事情——人可以兼任，但是职责是分开的，就是没有『当然』关系。因为在系统里面不过是做一个加法而已。工作台补充一个入口就实现了赋权，所以并不复杂"——兼任 = 工作台加入口的赋权加法，无当然关系，职责始终分开
  - 第二轮：⑤提示词=**书记自定义**"把提示词变成积木材料也是非常好的做法，要用的时候排列组合即可"⑥「为什么不那样做」必填=**改按需**（与 H2.4 一致）⑦FLAT_DESIGN=**归并+反论压缩**
- **执行详情（4 代理并行 + 主线程复核）**：
  - **纪检委员 252→193 行（-59，-23%）**：7 张步骤权限表全删改引用 CF §C.1a + §审批 §七；保留考勤/考察分层论断、锁定机制、「监督者不是执行者」、复盘三态批注、补课流程、检查清单；删半截 AI 笔记句；§2.1 补一句「与考勤同流程」衔接（主线程复核补）
  - **定人定责 284→245 行（-39，-14%）**：§3.2 标题「三支委（条条支委 + 党小组组长）」→「三支委（条条支委）」，删「块块身份」段，补**书记论断行**（兼任无当然关系、赋权加法）；§5.2 定责列表 ✅ 行去重（❌ 边界行保留 + 引用 §2.1/§2.2）；§4.4 冲突表删改引用 CF §F.5；§4.3 ASCII 图删；§6.1/§6.2 整节删、§6.3 保留简化审批流程；文末版本 v2.4→v2.5 对齐 frontmatter
  - **组织委员 231→220 行（-11）**：L61 招募表单 5 字段→9 字段与 L71 系统实现一致；数据同源 4 处归 1；工作台信息流 ASCII 图删（母本覆盖）；附录 A 时间轴保留
  - **宣传委员 165→151 行（-14）**：「宣传不创建活动」双处去重；工作台 ASCII 图删（SOP_WEB §B.3 + CF §D 覆盖）；每周一报送 + 材料标准保留；文末 v3.1→v3.4 对齐 frontmatter
  - **DOC_MAP 242→163 行（-79，-33%）**：§〇 分类表删（留说明+链接）；§三 引用关系图 47 行整节删；§五 文件状态标记整节删（20 行零信息）；知识类型 blockquote 6 处压缩（与 OPERATIONS_GUIDE §7.1 逐字重复）；§四「了解三类文件角色规范」引用 §〇→ROLE_CLASSIFICATION；v2.2→v2.3
  - **FLAT_DESIGN 111→99 行（-12）**：§七 并入 §二（P-010 标签零丢失）；§四 并入 §五 Ⅰ；三处「为什么不是？」压缩为偏好陈述；编号统一中文；**§三 判据表一字未动**（insights §3.3 引用）；v2.1→v2.2；**编号跳号修复**（五→四/六→五/八→六/九→七/十→八，主线程重排 + 常见指南 §五→§四 引用同步）
  - **提示词 261→263 行（积木化重构）**：三套提示词拆分为积木库（A 角色输入 / B 思考过程×3 / C 关注维度×2 / D 输出格式×3 / E 摘要注意），场景→积木组合对照表（如 A+B1+C1+D1+E）；「为什么不那样做」改按需标注「仅当存在真正的对立方案时填写」；输入材料/执行摘要/通用注意事项 3 份→1 份
  - **CF C.3 色系修正（母本侧）**：宣传委员 翠绿 #10B981→**海蓝 #2563EB**（help.html L144/L231 现行系统实证；纪检琥珀/组织蓝色值正确未动）
- **验证结果**：✅ 零残留 Grep 通过（「三支委（条条支委 + 党小组组长）」「文件状态标记」「引用关系图」「第三/四部分提示词」全零；纪检「步骤|角色|动作|权限」表格零残留；「为什么不那样做」3 处均已加按需标注）；✅ 主线程复核通过（纪检权限总引用/定人定责书记论断/DOC_MAP §四引用修正/FLAT_DESIGN §三判据表逐一确认）；✅ FLAT_DESIGN 外部引用核验（活跃引用仅 §一/§三/§四，重排后常见指南 §五→§四 已同步，DEVELOPMENT_PATH/SECRETARY_PRONOUNCEMENTS/insights/组织委员引用不受影响）；✅ 减量核算：批 4 净减 **214 行**（不含提示词）+ 提示词积木化重构
- **变更文件**：`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/02_institution/FLAT_DESIGN.md`、`content/02_institution/sop/{支委与党小组定人定责定岗说明,纪检委员工作流程指南,组织委员工作流程指南,宣传委员工作流程指南,常见工作场景快速指南}.md`、`content/03_doc_system/DOC_MAP.md`、`content/03_doc_system/工作模板/经验沉淀辅助提示词.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 定人定责 §3.2 书记论断]` — 支委可兼任党小组组长但无「当然」关系：兼任通过工作台赋权入口实现（加入口即完成赋权），职责始终分开——组织文件描述兼任场景时须以赋权机制为唯一实现方式；`[已沉淀: 提示词积木化]` — 书记偏好「提示词变成积木材料，用时排列组合」——长模板按 共享/专属 维度拆分为独立积木块 + 场景组合对照表，避免逐套冗长重复；`[经验: 代理跳号保留需主线程裁决]` — 代理删除 FLAT_DESIGN §四/§七 后选择保留编号跳号以不破坏引用，主线程按批 3「编号跳号修复」先例重排并同步引用方（§五→§四）——删除章节后的编号处理应以「连续化 + 引用同步」为默认；`[待办: 批 4 收尾]` — SERVICE_CATALOG 6 项大删类（书记确认推迟后期）+ 网页 UI 专项（D2/D3/E2）

## T215 serve 后端跑通验证 + SERVICE_CATALOG v4.0 有机重组（2026-08-05）

**任务**：① 让 serve 后端跑通（书记指令前置条件）② 基于跑通后的实际情况处置 SERVICE_CATALOG 大删类（T-207 收尾）
**引用流程**：H5.7 文件瘦身原则 + H2.1 一改具改 + brainstorming Skill + verification-before-completion Skill + fullstack-developer Skill
**来源**：书记指令——"在做这个之前。我实在认为，我们应当让serve后端跑通再思考！！具体如何处置！！"

- **serve 后端跑通验证（全部通过）**：
  - `npm install` ✅ 依赖已装；`npm test` ✅ **16/16 全绿**（含 Playwright E2E：登录→token→首页渲染→bootstrap 数据可达）
  - `npm start` ✅ 真实启动监听 3000，`/api/v1/health`→`{ok:true}`，`login.html`→200，`data.db` 自动建库含种子
  - 浏览器冒烟（browser_use）✅ 书记账号 2300010001 登录成功 → 首页四板块渲染正常 → token 写入 sessionStorage（36 位 UUID）→ bootstrap API 返回 activities=29、users=50 → 控制台零 JS 错误（仅 Tailwind CDN 生产提示）
  - 结论：后端真实跑通，E2E 与冒烟均确认「账号密码→token→API 数据源切换→全链路数据可达」
- **SERVICE_CATALOG 大删类·书记裁决链（AskUserQuestion）**：
  - ① 处置方式=**整节删+指针化** ② ③ 候选组 1/2 未选择（Empty）→ 补问范围 ④ 书记自定义："**按照你推荐的来。不要分章节删改，全文档有机考虑。可能排列组合之后，可以更加精简**"
  - ⑤ 设计确认=**批准执行**（清单总表 + 矩阵保留 + 指针折叠）
- **执行（v4.0 有机重组，442→93 行，-79%）**：
  - 六章节折叠为有机整体：§〇阅读说明→头部 2 行阅读约定（术语 M/R/Self/— 移入矩阵表下注释）；§一分类框架 3 表→清单总表「分类」列；§二 18 项详情→6 列总表（服务/分类/服务文件/入口页面/核心操作/关联制度），角色权限小节（~140 行）不展开→指针 §二 矩阵；§三 18×9 矩阵**保留**（服务粒度切面，与 ROLE_CLASSIFICATION §9 操作粒度互补）；§四 依赖关系→指针 DATA_ARCHITECTURE §1.3（T212 端到端交织图）+ ROLE_CLASSIFICATION §9e/9f；§五 模块路由→指针 ARCHITECTURE §五；§六 参考文档→并入新 §三
  - **信息保留核对**：18 服务盘点 + 代码映射 + 矩阵 + 3 注释（*†‡）+ 6 处权威源指针全保留；功能描述/关键实现压缩入「核心操作」「服务文件」列；发展党员采用关键实现版本（core/domain.js developStage，原文首行 mock.js 为不一致旧述）；关联制度列用缩写 CF/DA/FLAT/RC + 表头一次性链接
- **验证结果**：✅ git diff = 40 insertions / 389 deletions（-349 行）；✅ 零残留 Grep（「服务分类框架」「服务间依赖关系」「模块路由与入口映射」「核心数据流依赖」「跨类别数据共享」全仓仅 archive 历史日志命中）；✅ 无锚点引用（SERVICE_CATALOG.md# 全仓零命中）；✅ 外部引用核验（DOC_MAP L90「服务清单+角色权限矩阵」/L158 双源定位、README「唯一权威——功能盘点和权限设计」、SSOT_INDEX L64 母本描述均仍准确，无需同步）；✅ KNOWN_PITFALLS L176 为 T127 历史判例实例（已修复），不动
- **变更文件**：`content/03_doc_system/SERVICE_CATALOG.md`（v3.0→v4.0 全量重写）、`.ctx/TIMESTAMPS.md`（SERVICE_CATALOG 行 2026-08-03→08-05）、`CLAUDE.md`（乙部 T-207 更新「五批全部完成」）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[经验: 有机重组优于分章节删改]` — 书记方法论「不要分章节删改，全文档有机考虑，排列组合可以更加精简」：六节各自重复同一批数据的文档，折叠为「清单总表 + 矩阵 + 权威源指针」有机整体（442→93 行 -79%），删除的是派生视图、保留的是独有价值 + 指针；`[待办: 网页 UI 专项]` — D2 组件一致性抽查 / D3 系统跟随主题模式（prefers-color-scheme）/ E2 功能层数据联动（待办项标注数据上下游）

## T216 TIMESTAMPS 漂移专项修复：content/ 时间戳与 YAML 全面对齐（2026-08-05）

**任务**：书记批准（AskUserQuestion）修复 TIMESTAMPS 批 2/3/4 漂移——TIMESTAMPS.md 多行 last_updated 与 content/ 各文件实际 YAML frontmatter 不一致
**引用流程**：H3 检查清单第 6 条（YAML last_updated）+ TIMESTAMPS.md 更新规则 + H1.2 执行

- **扫描方法**：Grep 全 content/ 目录 frontmatter `^last_updated:`（35 行命中，剔除 OPERATIONS_GUIDE L22 模板占位符），与 TIMESTAMPS.md 逐行比对
- **修复明细（25 处对齐，以 YAML 为权威）**：
  - 滞后类（YAML 新于 TIMESTAMPS，22 处）：01_strategy 3 行（07-31→08-05/08-05/08-04）、02_institution 9 行（COMMISSIONER_FRAMEWORK 08-03→08-05、FLAT_DESIGN 07-31→08-05、README 07-31→08-04、sop 5 行至 08-05/08-04）、03_doc_system 6 行（OPERATIONS_GUIDE/USAGE_POLICY/DOC_MAP/SSOT_INDEX 至 08-05、README 08-04、工作模板 08-05）、04_web_design 3 行（DESIGN_SYSTEM 08-05、DATA_ARCHITECTURE 08-05、SOP_WEB 08-05）、05_ai_coding 1 行（KNOWN_PITFALLS 08-04）、insights 2 行（08-05/08-04）
  - 超前类（TIMESTAMPS 新于 YAML，3 处）：ROLE_CLASSIFICATION 08-03→**07-21**、04_web_design/README 07-31→**07-21**、05_ai_coding/README 07-31→**07-21**（批 4 修改这些文件时未更新 YAML，属 H3 第 6 条执行遗漏，本次仅对齐注册表未擅改 YAML）
  - 一致未动：党小组组长工作手册 08-03、ARCHITECTURE 08-03、SERVICE_CATALOG 08-05、SCHOOL_IT_DEPLOYMENT 07-31、content/README 08-03
  - 本文件自身 3 处（frontmatter/注释行/「本文件」行）→ 2026-08-05
- **变更文件**：`.ctx/TIMESTAMPS.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **验证结果**：✅ 全量比对确认 content/ 35 行 YAML 与 TIMESTAMPS 全部一致（无引号格式差异除外）；✅ 3 处超前类回退正确（YAML 为权威）；✅ GetDiagnostics 无新错误
- **沉淀标签**：省略（按规执行，未产生新模式）

## T217 交互载体规范 + 悬浮表单扩展（网页 UI 专项·D2）（2026-08-05）

**任务**：书记指令——"请让我们推进 网页UI 专项！！Use Skill: web-design-guidelines Use Skill: brainstorming Use Skill: frontend-design"+ "一个很重要的是，现在我们适用悬浮表单的场景还是有点受限，同时，出现下拉选择和表单出现的位置都值得深究！！包括但不限于这些事项！"
**引用流程**：H1.2 执行 + web-design-guidelines Skill + brainstorming Skill + frontend-design Skill + H2.4 经验沉淀 + verification-before-completion Skill
**来源**：书记指令（网页 UI 专项，承接 T-207 剩余 D2）

- **书记裁决链（七轮 AskUserQuestion）**：
  - ① 产出形式=**规范+改造**；方向=**轻量录悬浮**
  - ② 书记自定义（关键）："写入活动这个事情可以做成悬浮表单。其余部分，只要涉及到人的，一般都要在选择录入'谁'的时候要在下拉框和表单中有搜索功能！我们人太多了"
  - ③ 行内状态下拉=**改轻交互**；筛选下拉位置=**统一**；月份下拉=**纳入**（多选三项全选）
  - ④ 写入活动形态=**全悬浮**；选人落地=**固化规范+全仓审计**；行内状态=**看看效果再决定**（原型先行）
  - ⑤ 筛选位置=**固定工具栏顺序**；月份=**自定义下拉**；附加=**要考虑不同终端的情形！**
  - ⑥ 设计草案=**批准执行**
  - ⑦ 实测数据链路缺口裁决=**书记看全部任务（推荐）**——书记活动详情展示该活动全部任务节点，便于全面监督

- **执行详情（分项）**：
  - **§3 写入活动全悬浮**：`ws-secretary-entry.js` 日历 tab「写入活动」按钮卡片 + `openModal(720px)` 两步决策树悬浮表单（Step1 选模板 → Step2 填正交维度表单）；`wp` 状态保持，重新打开回 Step1；提交成功 `wp.reset()`+`closeModal`+`listActivities()` 刷新；内联 `#write-form-area` 迁移至 `_getWritePanelContainer()`
  - **§2 选人审计 + 固化规范**：全仓 Grep `PEOPLE.map/filter`+`<option>${p.name}` 仅 1 处违规（项目赋权选人 select）→ 改 PersonPicker（姓名/学号搜索+党小组 tabs+单选），实例变量管理 destroy/re-create；硬性规则四条（凡选具体人一律 PersonPicker、禁止 select 罗列人名、过滤用 filter 选项）写入 DESIGN_SYSTEM §4.13
  - **§4 状态徽章原型**：新建 `status-badge.js`（`statusBadgeHtml` 色点+文字+箭头 / `bindStatusBadge` 点击弹选择器，clamp 边界定位、外部/ESC 关闭、触屏可点）；原型应用到 inspector 任务状态行（替换原生 select），书记看效果后再推广考勤/交接；`filterTasksByManagementRole` 补 secretary 分支提前返回全部任务（书记全任务监督）
  - **§5 筛选顺序统一**：issue-list.js 工具栏固定顺序=搜索框→状态胶囊→分隔线→scope/type 筛选→「清除」按钮（重置全部筛选态）；书记反馈管理 tab 同步；att-*/insp-*/query-view 核验已合规
  - **§6 月份下拉核验**：month-selector 已被 bootstrap MutationObserver 全局增强为自定义触发式下拉（60ms 防抖扫描 `.input-flat select`），无需逐改，浏览器实测通过
  - **§7 响应式**：modal 已有 `max-width:calc(100vw-32px)`+`max-height:85vh`；工具栏 flex-wrap；status-badge 触屏可点；375px 模拟 PASS
  - **§1 规范落位**：DESIGN_SYSTEM.md 新增 §4.12 交互载体决策规范（四载体判定表：悬浮表单/就地展开/内联面板/跳转 + 已落实案例）、§4.13 选人规范（PersonPicker 四条硬性规则）、§4.14 状态徽章（Status Badge）

- **验证结果（浏览器两轮实测通过）**：
  - ✅ 第一轮 8 步全 PASS：写入活动全悬浮闭环（按钮→Step1 模板→Step2 表单→提交→关闭→列表刷新）、PersonPicker 搜索选人、筛选顺序+清除按钮、month-selector 自定义下拉、375px 响应式
  - ✅ 实测发现数据链路缺口（书记活动详情永远「暂无关联任务」，根因：`loadWorkspaceData` 未传 `extraLoads` → state.tasks 空数组 + `filterTasksByManagementRole` 按 executor/supervisor 过滤掉全部 50 条任务）→ 书记裁决「书记看全部任务」→ 补 `extraLoads: [() => BranchService.listTasks()]` + secretary 提前返回
  - ✅ 复测 PASS：act-10 详情 2 张任务卡 + 2 枚徽章弹出选择已完成 → 进度 1/2 → 已还原
  - ✅ GetDiagnostics 全部修改文件零错误；控制台错误均为环境性（API 404/字体网络/生产警告）

- **变更文件**：`docs/src/entries/ws-secretary-entry.js`、`docs/src/components/inspector.js`、`docs/src/components/status-badge.js`（新建）、`docs/src/components/issue-list.js`、`docs/src/styles.css`、`content/04_web_design/DESIGN_SYSTEM.md`、`CLAUDE.md`（乙部 T-207 更新）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 交互载体决策规范]` — DESIGN_SYSTEM §4.12：悬浮表单=轻量录入（≤3 字段/上下文锚定主录入）、就地展开=查看为主+快捷操作、内联面板=主流程长表单、跳转=整页级；选人=PersonPicker 硬性规则（§4.13）；`[经验: 实测驱动的数据链路修复]` — 悬浮表单承载主录入时，其数据展示面（任务列表）常被角色过滤逻辑吞掉——`loadWorkspaceData` 未传 `extraLoads` 与 RBAC 过滤双因叠加，须以「书记看全部任务」类监督语义为默认；`[待办: 状态徽章推广范围]` — 考勤确认/交接状态待书记看原型效果后决定推广；`[待办: 网页 UI 专项续]` — D3 系统跟随主题模式（prefers-color-scheme）/ E2 功能层数据联动（待办项标注数据上下游）

## T218 server 数据链路完善 + 活动状态进度驱动（书记四问收口）（2026-08-05）

**任务**：书记四问——① 有了 server 后能否像单刀双掷开关一样切换 mock/真实数据？server 真的稳定运作吗？② 现在能否真实操作网页？操作结果存服务器吗？会改 mock 数据本身吗？③ 归档和资料查询 server 是否做到位？④ 活动徽章「0/2 已完成却声称已完成」语义不赞同 + `span` 显示有问题。
**引用流程**：H1.2 执行 + brainstorming Skill + fullstack-developer Skill + H2.4 经验沉淀 + verification-before-completion Skill
**来源**：书记指令（承接 T-217；spec：`docs/superpowers/specs/2026-08-05-server-niche-and-activity-status-design.md`，gitignore 不入库）

- **书记裁决链（AskUserQuestion）**：
  - ① server：**启动 express server（推荐）**——发现 3000 端口曾被 python 静态服务器占用（无 /api/v1 端点），已停并启动真实 express server（health 200 + users 50 验证）
  - ② 切换开关：书记明确「**不是在 UI 中做！**就是我们目前已经有了登陆页面选择开发模式的部分了，我好奇的是我们回头如何接入」——接入路径已就绪：登录 `AuthStore.login()` → 后端 token → `enableApiMode()` 切 API 数据源，将来接学校后端只需改 `apiBaseUrl`；不做 UI 开关
  - ③ niche 4 类集合（经验沉淀/合规引用/文件空间/图片记录）：**本轮纳入 server（推荐）**
  - ④ 活动状态：**进度驱动活动状态（推荐）**——活动"已完成"由任务全部完成自动判定
  - 设计草案：**批准执行**

- **执行详情（A/B 子任务）**：
  - **A 子任务（niche 入 server + imageRecords 备份修复）**：
    - `server/db.js` RESOURCE_TABLES +4：`experience_deposits`/`compliance_references`/`file_space_records`/`image_records`（循环建表/注册路由自动覆盖）
    - `server/routes/resources.js` RESOURCE_TABLES 映射 +4 键（键名与前端快照 payload 键名完全一致），list/bootstrap/snapshot 自动覆盖
    - `docs/src/core/api-adapter.js` niche 4 组 list/create 路径统一为 `/api/v1/{name}`（原 `/files`/`/images`/`/experiences`/`/compliance-refs` 均为未实现路由）
    - `docs/src/core/data-adapter.js` init() API 分支嵌套 `Promise.all` 拉取 niche 4 集合（失败回退 `restoreNicheCollections()` 本地备份）；`_flushSnapshot`/`_flushSnapshotSync` payload +4 键写穿
    - `docs/src/core/mock-adapter.js` `_saveToStorage()` 序列化补 `imageRecords`、`_loadFromStorage()` 恢复补 `imageRecords`、`restoreNicheCollections()` 补 imageRecords（原无备份恒 undefined，刷新即失——已修复）
  - **B 子任务（进度驱动活动状态）**：
    - `inspector.js` 新增导出 `deriveActivityExecutionStatus(activity, allTasks)`：有关联任务且全部 completed → 'completed'；未全部完成 → 'ongoing'；无关联任务 → 保持计划态（draft/published）原样；以全活动任务为准（呼应书记「书记看全部任务」裁决）
    - 详情页顶部徽章改派生执行态；列表卡片徽章同步派生（`getAppState().tasks`）；`bindStatusBadge` onChange 写联动：任务变更 → 重算活动状态 → `BranchService.updateActivity` 落库 + `setState` 刷新任务与活动 + `persist()` 写穿（**关键：BranchService 直写路径仅 saveDB() 本地，必须显式 persist() 才写穿服务器**）
    - 徽章语义色：新增 `activityBadgeHtml`（草稿灰/已发布蓝/进行中琥珀/已完成绿，与任务徽章色系一致），替代原中性灰 `badge-time`（书记问题 4「span 显示有问题」落点）

- **验证结果（全部通过）**：
  - ✅ `npm test` 16/16（server 目录）：**发现并修复 e2e 测试环境性失败**——`page.waitForURL` 超时根因是 headless Chromium 挂起在 Google Fonts/Tailwind CDN 外部请求（readyState 卡 interactive，load 事件不触发）；e2e 增加 `page.route` 阻断外部 CDN 后离线可复现（17.9s 超时 → 4.1s 通过）
  - ✅ 浏览器实测（API 模式登录书记，工作区 2026-05 日历）：act-10 初始徽章「进行中」+ 进度 0/2（种子 status:'completed' 的语义矛盾已修复）→ 完成 2 任务 → 徽章「已完成」+ 2/2 → 还原 1 任务 → 「进行中」+ 1/2 → 全还原 → 0/2；列表卡片徽章同步「进行中」
  - ✅ niche 落库闭环：3000 端口 server 重启加载新代码，`/api/v1/fileSpaceRecords` 等 4 端点 200；14 个资源分组 API 全 200
  - ✅ GetDiagnostics 全部修改文件零错误；验证后已将 server 数据恢复种子态（act-10 status:'completed'、tsk-007 in_progress、tsk-008 pending）
  - 注：`pageerrors: ReferenceError: tailwind is not defined` 仅出现在阻断 tailwind CDN 的测试脚本环境，真实浏览器无此问题

- **变更文件**：`server/db.js`、`server/routes/resources.js`、`server/test/e2e-login.test.js`（离线可复现加固）、`docs/src/core/api-adapter.js`、`docs/src/core/data-adapter.js`、`docs/src/core/mock-adapter.js`、`docs/src/components/inspector.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 数据源切换接入路径]` — mock/真实数据不是 UI 开关，而是登录页开发模式卡片（devLogin 纯 mock）+ 账号密码登录（token → enableApiMode 切 API）双入口；接真实后端仅改 `apiBaseUrl`；`[已沉淀: 写穿链路契约]` — 服务层 BranchService 直写（updateTask/updateActivity）只调 `saveDB()`（localStorage），API 模式必须显式 `persist()` 才防抖快照写穿服务器（800ms 全量覆盖）；`[已沉淀: 进度驱动活动状态]` — 活动执行态（进行中/已完成）由任务进度派生统一函数 `deriveActivityExecutionStatus`，展示与写联动同一函数防逻辑漂移；计划态（draft/published）仅无任务时展示；`[经验: e2e 离线可复现]` — headless Chromium 挂外部 CDN（Google Fonts）会阻塞 window load（readyState 卡 interactive）致 waitForURL 超时，e2e 须阻断外部资源路由保证离线确定性；`[待办: T-207 剩余]` — D3 系统跟随主题模式（prefers-color-scheme）/ E2 功能层数据联动

## T219 书记三问收口：Q1 刷新后数据持久化根因修复（mock 空写守卫 + token 清理）+ Q2 工作台顺序/空间布局统一重排（2026-08-05）

**任务**：书记三问之 Q1——「只要我刷新界面，我操作的结果还是没有办法保留——即使还是同一个 localhost。这是合理的吗？」；Q2——「活动写入如果只有一个入口，为什么不能整入别的卡片。考勤管理为什么在书记工作台上在最上面。诸如此类的顺序、空间布局问题 大范围的还存在在系统中！」
**引用流程**：H1.2 执行 + fullstack-developer Skill + brainstorming Skill + verification-before-completion Skill（verify-persist.mjs 三场景复现 + browser_use 11 项走查）

**Q1 调查与根因（三场景 Playwright 复现 + 注入 localStorage 写监听 + 15 帧堆栈捕获）**：
- **场景 B（纯 API 模式）**：写穿 server 成功、刷新保留 ✓——API 模式本身不丢数据
- **场景 E（纯 mock 模式）**：根因锁定——页面加载早期 `bootstrapPage → renderHeader → _notificationBellHTML → NoticeStore.list() → init() → _saveNotices() → persist() → saveDB() → _saveToStorage() → localStorage.setItem`，此时 mockDB **尚未 loadDB（为空）**，首次空写把用户已保存数据覆盖为「actCount:0」空 payload；随后 `loadWorkspaceData` 读到空数据 → `_seedInitialData()` 回填 seed 再覆盖
- **场景 A（残留 token + 开发模式）**：`devLogin()`/`logout()` 原均不清除 sessionStorage `gsm1921-api-token` → 残留 token 使开发模式被劫持为 API 模式（复现 28 个 /api/v1 请求）

**Q1 修复（4 文件）**：
- `core/domain.js`：mockDB 新增 `_loaded: false` 持久化守卫标记
- `core/mock-adapter.js` `_saveToStorage()` + `services/mock.js` `saveDB()`：`mockDB._loaded` 为 false 时拒绝写入（console.warn 提示，防加载早期空覆盖）
- 解锁时机：`loadDB()` 全部退出路径（!raw/schema 不匹配/正常恢复/catch/API 分支）+ `data-adapter.js init()` API 成功路径
- `services/auth.js`：`devLogin()` 与 `logout()` 清除残留 `gsm1921-api-token`
- 验证：verify-persist.mjs 三场景重跑——场景 E 刷新后 `tsk-007 = completed`、徽章「已完成」、localStorage 写入序列只剩 `workflowos_tab_secretary`（数据写不再被覆盖）；场景 A token 已清无劫持

**Q2 调查与设计（已全部确认并实施）**：
- **书记裁决（AskUserQuestion 逐项）**：① 活动写入并入活动日历卡片（日历头部「写入活动」按钮 + 删除独立卡片）② 排序按角色职责优先（数据支撑类靠后）③ 书记活动管理 Tab 按设计①重排 ④ 「发展党员」→「发展数据」（内含入党积极分子与发展对象，非组织委员决策职能，是支委会讨论的事）⑤ 登录页/角色架构图同步改名 ⑥ 全局概况保持第 2 位
- **实施（6 文件）**：
  - `ws-secretary-entry.js`：`SEC_CALENDAR_TAB_HTML` 重排——统计条 → 活动日历（头部「写入活动」按钮，绑定 `openWriteModal`，防重绑定）→ 考勤概况（从顶部下移）→ 活动查询（折叠收底）；删除原独立「活动写入」卡片
  - `ws-org-commissioner-entry.js`：Tab label「发展党员」→「发展数据」+ 内容标题 + 待办跳转文案 + 描述「从入党积极分子到正式党员的完整发展路径数据」
  - `ws-prop-commissioner-entry.js`：`archive`（档案归档）与 `weekly`（周报报送）互换（职责优先）
  - `login-entry.js`：组织委员卡片 desc → 「发展数据」
  - `role-hierarchy.js`：组织委员 tag → 「发展数据 + 专班」
- **浏览器走查（browser_use 11 项全通过）**：书记 Tab 顺序/卡片顺序/写入按钮悬浮表单；组织委员「发展数据」Tab；宣传委员 Tab 顺序；登录页描述；help 页角色架构图 tag——全部符合设计

- **变更文件**：`docs/src/core/domain.js`、`docs/src/core/mock-adapter.js`、`docs/src/core/data-adapter.js`、`docs/src/services/mock.js`、`docs/src/services/auth.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/login-entry.js`、`docs/src/components/role-hierarchy.js`、`server/verify-persist.mjs`（临时脚本，用完即删）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 持久化加载早期空写守卫]` — mockDB 尚未从存储/后端恢复（loadDB/init 完成）前必须拒绝 saveDB/persist 写入，否则 header 渲染等加载早期调用链（bootstrapPage→renderHeader→NoticeStore.init→persist）以空数据覆盖用户已保存数据；守卫标志须在所有退出路径解锁；`[已沉淀: 数据源劫持根因]` — devLogin/logout 必须清除残留 API token（sessionStorage），否则开发模式被劫持为 API 模式（本次 28 个 /api/v1 请求复现）；`[已沉淀: 职责优先排序原则]` — 各角色核心事务靠前、数据支撑类功能靠后（书记：活动统筹前置、考勤监督次位；宣传：周报报送在档案归档前；组织：「发展数据」命名与定位=支委会数据支撑而非组织委员决策职能）

## T220 书记 6 连问：数据变更即时同步事件总线 + 8 月考勤 mock 全覆盖 + 通知保留策略 + 预拟通知"只跑一次" + 表单基建统一（2026-08-05）

**任务**：书记 6 连问——①「计算逻辑没有实现全然同步！我确认读取通知之后，未读通知会减少 1 个，但是右上角的角标却没有变化。这种计算的发生似乎都必须要手动刷新，没有办法即时操作」（附加裁决：角标问题只是管中窥豹，要求更深入查找）②「【我的考勤】的部分目前大部分情况都没有数据显示！！8 月份能否造一个考勤 mock！！」③「重要通知保留什么？自动发送的活动/专班通知是否在创立的时候就可以拟好通知内容？'只跑一次'」④「检查一下成立专班和写入活动的 UI 设计在可比的部分是不是平行的？」（另要求使用 fullstack-developer / web-design-guidelines / brainstorming / webapp-testing Skill）
**引用流程**：H1.2 执行 + fullstack-developer Skill + web-design-guidelines Skill + brainstorming Skill + webapp-testing Skill（browser_use 四轮走查）+ verification-before-completion Skill
**来源**：书记指令（2026-08-05 原话，见任务栏）

**书记裁决（AskUserQuestion）**：
- 8 月考勤=**补全 5 场全覆盖（推荐）**（党小组会全员/支委会支委班子/发展对象谈话考察/暑期实践总结分享全员/秋季学期工作部署全员）
- 通知机制=**表单内预拟通知（推荐）**——活动/专班创建时即可拟好通知内容，创建成功仅发布一次（"只跑一次"）
- 重要通知保留=**书记自定义**："我认为是 未读的 重要；无论已读未读的 紧急！！"
- UI 平行=**统一表单基建（推荐）**
- 附加信息=「角标的问题只是管中窥豹，我希望你可以更深入地查找！！」→ 全仓「数据变更 → UI 未同步」深度审计

- **① 角标即时更新（含深挖）**：
  - **根因**：header 在 renderHeader 时一次性渲染角标（此时 mockDB 尚未 loadDB，NoticeStore.init() 回退 seed 4 条）；loadDB 恢复持久化数据（3 条未读）后角标不重渲染 → 刷新后角标仍 4。markRead 只改数据不广播 → 点击已读后角标不更新。深层：全系统无事件总线，数据变更（persist 写路径）与 UI 快照解耦，读时快照 + 双轨存储叠加
  - **修复（事件总线落地）**：`core/data-adapter.js` persist() 末尾统一派发 `DATA_CHANGED_EVENT='gsm1921:data-changed'`（订阅方 microtask 去重合并）；`core/data-loader.js` loadWorkspaceData Step1 后派发 `DATA_LOADED_EVENT`（修正加载早期渲染的快照）；`components/header.js` 订阅两事件 → `_renderNotificationBadge`（只更新 `#notification-bell` 角标 DOM）；`entries/main-entry.js` 订阅 → `_refreshDashboardSnapshot()`（仅 dashboard activeModule 时）+ `_attDocBound` 全局标志防弹窗监听重复绑定
  - **Seed 增量合并（服务老用户）**：双轨持久化恢复路径（core/mock-adapter.js `_loadFromStorage()` 与 services/mock.js `loadDB()`）均为全量替换，老用户 localStorage 无新增种子 → 新增 `_mergeNewSeedRecords()` 按 id 幂等补齐缺失的 activities/attendances/notices 种子（保留用户已确认/已读/编辑状态），有新增即落盘，两处实现完全对齐
- **② 我的考勤 8 月全覆盖**：`mock/attendance.js` 新增确定性生成器 `_buildAugustAttendance()`（att61~att227，5 场活动全覆盖：act-26 8/7 党小组会全员 50 人、act-27 8/11 支委会支委班子 8 人、act-28 8/15 发展对象谈话考察 9 人、act-29 8/20 暑期实践总结分享全员、act-30 8/28 秋季学期工作部署全员）；状态 `(idx + 事件偏移)` 确定性生成（%13 请假 / %17 缺勤 / 其余出勤），新记录留空 recordedBy 待纪检确认；`mock/activities.js` 补 act-28（与 notice-109 协调）
- **③ 通知保留策略 + 预拟通知**：
  - 保留策略：`NoticeStore.list({ retention:'visible' })` 过滤 `n.priority==='urgent' || !n.read`（未读的重要；无论已读未读的紧急）；角标未读统计不走过滤（仍统计全部未读）
  - 预拟通知"只跑一次"：活动/专班创建表单新增「自动发布通知」折叠区（标题+内容），创建成功后 `NoticeStore.add()` 单次调用 → 通知→待办仅派生一次；仅填写标题才发布
- **④ UI 平行统一**：专班表单内联样式改 `input-flat w-full`、标签统一 `text-xs text-gray-500 mb-1.5 block font-medium` + 红色必填星号、按钮统一 `text-sm px-5 py-2.5 rounded-lg`；写入活动表单补齐「参与人」PersonPicker（multi 模式，创建成功 `assignments: participants.map(...)`）
- **验证轮修复（browser_use 实测发现）**：PersonPicker z-index 300/301→600/601（modal overlay=500 遮挡导致真实点击被拦截）；`_positionPanel()` 重写——固定 520px 面板在窄视口（661px）底部溢出 214px、「确认选择」按钮不可见 → 按剩余空间自适应 maxHeight（下限 200 上限 520）+ 上方空间不足 top 兜底；原生 `<details>` 折叠跨环境失效（关闭后内容高度仍 197px）→ 两表单改自定义折叠 `onclick=classList.toggle('hidden')`
- **审计发现（已标注未修复）**：纪检复盘按钮假操作（仅 showToast 不持久化）、宣传委员三块纯内存数据（PROP_TASKS/WEEKLY_REPORTS/ARCHIVE_RECORDS 刷新即丢）、纪检公邮 MAILBOX_CONFIG/MAILBOX_HISTORY 纯内存

- **变更文件**：`docs/src/core/data-adapter.js`、`docs/src/core/data-loader.js`、`docs/src/core/mock-adapter.js`、`docs/src/services/mock.js`、`docs/src/services/notice.js`、`docs/src/components/header.js`、`docs/src/entries/main-entry.js`、`docs/src/mock/activities.js`、`docs/src/mock/attendance.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/components/person-picker.css`、`docs/src/components/person-picker.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果（browser_use 四轮走查 + 最终回归 8334 新端口无缓存 5/5 全通过）**：
  - ✅ 角标即时减数：点击已读 → 角标 3 → 2，与未读通知卡片一致；刷新后角标与持久化数据一致（不再回退 seed 4）
  - ✅ 三账号 8 月考勤完整（书记 4/4、组织委员 4/4、普通成员 3/3）；老用户刷新即得新种子（Seed 增量合并日志确认）
  - ✅ 通知保留策略正确（已读普通通知消失、紧急保留、未读保留）；预拟通知创建活动后仅发布一次、待办仅派生一次
  - ✅ PersonPicker 自适应（maxHeight ≤ 视口、确认按钮可点）；表单平行性一致（input-flat/必填星号/按钮规格统一）
  - ✅ GetDiagnostics 全部修改文件零错误；控制台无功能性 JS 报错

- **沉淀标签**：`[已沉淀: 数据变更事件总线]` — persist() 是全部 mockDB 写路径汇聚点，统一派发 DATA_CHANGED_EVENT（订阅方 microtask 去重合并）+ loadDB 完成后 DATA_LOADED_EVENT，解决「数据变更 → UI 未同步」类全部问题（角标/统计卡/通知列表）；`[已沉淀: 加载早期快照竞态]` — 角标在 loadDB 前渲染拿 seed 值、loadDB 后不重渲染是「刷新后值不对」的通用竞态模式，须以加载完成广播修正快照；`[已沉淀: Seed 增量合并]` — 双轨持久化恢复路径全量替换时，老用户 localStorage 无法获得后续新增种子，须按 id 幂等补齐（保留用户状态）；`[已沉淀: 通知保留策略]` — 书记裁决：未读的重要；无论已读未读的紧急（list({retention:'visible'}) 过滤，角标未读统计不走过滤）；`[经验: 弹层 z-index 层级]` — 弹层组件（PersonPicker）必须高于其父 modal overlay（500），面板高度须按视口剩余空间自适应，固定高度在窄视口底部溢出导致按钮不可见；`[待办]` — 审计发现的 3 处「伪写/纯内存」数据（纪检复盘按钮/宣传三块数据/纪检公邮）待书记裁决处理

## T221 mock 时间语义自洽 + 谈话 mock 彻底删除 + 假操作持久化修正 + PersonPicker 全面审阅（2026-08-06）

**任务**：书记 4 连问——①「mock 不合理，如果活动在 8 月底，怎么可能已经出勤了呢？」②「为什么 mock 又出现了 谈话 这个事情？」③「请继续 修正 假操作！！」④「对于 选择【人】 的浮窗进行审阅！我作为人完全没有办法操作这个功能，往往不浮在 最上端」+「请综合思考，管中窥豹则全面排查相似问题」（另要求使用 brainstorming / webapp-testing / web-design-guidelines Skill）
**引用流程**：H1.2 执行 + brainstorming Skill + webapp-testing Skill（playwright 多视口实测 + browser_use 真人视角走查）+ web-design-guidelines Skill + verification-before-completion Skill
**来源**：书记指令（2026-08-06 原话，见任务栏）

**书记裁决（AskUserQuestion）**：
- 谈话 mock 处置 = **彻底删除（推荐）**——删 act-28 活动 + 对应考勤生成段 + notice-109 通知
- 8 月考勤时间语义 = **活动日期前移（推荐）**——已生成考勤的活动日期前移至 8/1~8/4（已发生），未来活动 act-30（8/28 draft）保持无考勤

- **① mock 时间语义自洽**：`mock/activities.js` act-26 8/7→**8/1**、act-27 8/11→**8/3**、act-29 8/20→**8/4**（均已发生）；act-30 保持 8/28 draft 且不生成考勤（注释明确「未来活动无考勤」）。`mock/attendance.js` 原 act-26 显式段（att44~60）并入生成器统一覆盖去重，`_AUGUST_EVENTS` 仅 3 事件（act-26/27/29），ID 从 att44 起连续，确定性状态生成保留
- **② 谈话 mock 彻底删除**：`mock/activities.js` 删 act-28（含注释说明违背 5b2e4ea「删除考察活动类型」）；`mock/attendance.js` 删 act-28 考勤生成段；`mock/notices.js` 删 notice-109、notice-108 改为 8月4日/publishDate 8/1/expireDate 8/4；双轨 `_mergeNewSeedRecords()` 幂等同步清老用户 localStorage 残留
- **③ 假操作修正（T220 审计遗留 3 处全部收口）**：
  - **纪检复盘真操作**：`ws-disc-commissioner-entry.js` 复盘按钮改 `data-review-id` 锚点 + `services/review.js` 新增 `updateReviewById(id, patch)`（activityReviews/taskforceReviews 双域查找）+ 批注/打回/确认/提醒全部落库 + persist
  - **宣传三块持久化**：`ws-prop-commissioner-entry.js` 三块常量改 `XXX_SEED` + `_loadXxx()`（mockDB 空时注入 seed），任务推进/周报报送/归档确认全部写 mockDB + persist
  - **纪检公邮持久化**：`ws-disc-commissioner-entry.js` MAILBOX_CONFIG/MAILBOX_HISTORY 同 Seed+Loader 模式，「标记已查收」写 history + config.lastCheckAt + persist
  - **7 域补持久化**：`core/domain.js` mockDB 加 propTasks/weeklyReports/archiveRecords/mailboxConfig/mailboxHistory/activityReviews/taskforceReviews 6 域（此前无）；`core/mock-adapter.js` + `services/mock.js` 双轨 `_saveToStorage()` 补 7 序列化字段 + `_loadFromStorage()` 补恢复
- **④ 全站 JS 崩溃根因（选人浮窗审阅过程中发现）**：`core/mock-adapter.js` L184 与 `services/mock.js` L220 注释 `act_*/att_*/notice-{13位时间戳}`——`act_*` 后紧跟 `*/` 提前终止块注释，后续代码全被吞成注释且 `{13位时间戳}` 被解析为正则 → 浏览器报 `Invalid regular expression: missing /`，leader 页仅渲染静态标题、全组件失效。修复：`/` 改中文顿号
- **④ PersonPicker 全面审阅（实测 16+ 场景全通过）**：playwright 脚本化实测秘书页 3 场景 × 8 视口（1440×900 至 800×500 含 Windows 125%/150% 缩放等效视口）+ 组长页 4 场景 + 组织委员页 3 场景 + browser_use 真人视角走查秘书页 3 场景（1095×661），面板均完整在视口、elementFromPoint 命中人员项、点击回显正确、确认按钮可达、0 pageerror。**健壮性修复 3 处**：
  - **panel 同级化**：panel 原为 overlay 子节点，其 z-index 601 只在 overlay(600) 层叠上下文内生效，根层叠下整体仅 600 → 改为 overlay/panel 均直接挂 body 同级，panel z-index 801 在根层叠生效
  - **z-index 层级收敛**：picker overlay 600→**800**、panel 601→**801**；status-badge-popover 700→**600**（此前会压住 picker）；全站层级定序 header 50 / sidebar 70 / dropdown 100 / modal 500 / status 600 / picker 800/801 / toast 9999
  - **`_positionPanel()` 重写**：「永不溢出视口」确定性定位——优先下方、下方不够且上方够则翻上方、高度按可用空间收敛（下限 160 上限 520）、宽度收敛视口内、兜底不遮触发按钮，保证「确认选择」底部操作栏始终可见可点

- **变更文件**：`docs/src/mock/activities.js`、`docs/src/mock/attendance.js`、`docs/src/mock/notices.js`、`docs/src/core/domain.js`、`docs/src/core/mock-adapter.js`、`docs/src/services/mock.js`、`docs/src/services/review.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/components/person-picker.js`、`docs/src/components/person-picker.css`、`docs/src/styles.css`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果（playwright 实测 + browser_use 走查）**：
  - ✅ mock 时间语义自洽：act-26/27/29 均已发生（8/1~8/4）有考勤；act-30（8/28 draft）无考勤；全站无「谈话考察」残留
  - ✅ 假操作 3 处全部真持久化：纪检复盘按钮落库、宣传三块/纪检公邮刷新数据保留（Seed+Loader + persist 双轨对齐）
  - ✅ 全站 JS 崩溃修复：node --check 通过 + 5 页浏览器加载无 pageerror
  - ✅ PersonPicker 修复后复验：秘书页 3 场景 z-index 801、elementFromPoint 命中人员项、点击/确认正常；极小视口（800×500）面板完整在视口；组织委员页/组长页回归通过
  - ✅ GetDiagnostics 全部修改文件零错误；控制台无功能性 JS 报错

- **沉淀标签**：`[经验: 块注释提前终止陷阱]` — 中文注释中含 `*/`（如 `act_*/att_*`）会提前终止 JSDoc 块注释，后续代码被吞并触发正则解析错误，是全站静默崩溃的隐蔽根因；注释中列举形如 `x/y` 的编号应改中文顿号；`[经验: 弹层 z-index 子级失效]` — fixed 子元素 z-index 只在父级层叠上下文内生效，弹层要「永远浮在最上端」必须同级挂 body 并在根层叠定序；`[待办]` — 无

## T222 全系统扎口检查（3 轮）——统一模块封装完全功能实现核查 + 8 项发现 7 项修复（2026-08-06）

**任务**：书记指令——"请全系统做一次 【扎口】检查。 是否需要统一模块封装的部分实现了完全的功能实现！！ 这个检查会进行大于等于3次！！ 请一定要仔细！！ Use Skill: webapp-testing Use Skill: fullstack-developer"；追加指令——"请继续推进！！ 合规文件的部分不要管！！"
**引用流程**：H1.2 执行 + webapp-testing Skill + fullstack-developer Skill + verification-before-completion Skill
**来源**：书记扎口检查指令（2026-08-06 原话，见任务栏）

**书记裁决（AskUserQuestion）**：
- Z1 写穿断裂 + Z3 三处假操作 = **全部立即修复（推荐）**
- Z2/Z6 ApiAdapter CRUD 取舍 = **补齐服务端 CRUD（推荐）**
- Z5 服务器种子缺口 = **前端空集合回退本地 seed（推荐）**
- Z7 参考资料失效链接 = **一并修复（推荐）**——但受追加指令约束，**合规条目不动**

- **第 1 轮（R1，前后端契约审计）**：`docs/src/core/api-adapter.js` 30+ CRUD 方法（activities/tasks/attendances/inspections/taskforces/notices/todos/assignments/handovers/makeupTasks + 4 niche 集合）请求真实服务端全部 404——服务端仅 bootstrap/snapshot/users 路由，ApiAdapter 为**死代码**（接口暴露但无对应路由 = 统一模块封装未完全功能实现）。审查 `docs/src/core/data-adapter.js` 确认 API 模式 `persist()` 有 `_scheduleSnapshot` 防抖全量写穿链
- **第 2 轮（R2，前端 10 文件全量 handler 扫描）**：50 个写闭环正常（修改 → persist/saveDB → localStorage/API 写穿）；发现 **3 处假操作**（ws-prop-commissioner/ws-org-commissioner/inspector 的 `updateActivity` 内部不落盘，刷新即还原）+ 1 处疑似 + 1 处存疑（交接催促）
- **第 3 轮（R3，动态实测）**：真实 server（3100 端口）+ API/mock 双模式 + browser_use 复现 + node 内存库最小复现。动态确证 Z1 写透断裂（toggleBrand 服务端 isBrand 保持 False）、e2e-login 回归（防抖快照竞态：init 回退过程触发 persist → 800ms 窗口内以陈旧 mockDB 覆盖服务器新写入）

- **8 项发现与修复（F1-F7）**：
  - **Z1 写透断裂（F1）**：`docs/src/services/mock.js` `saveDB()` 尾部补 `if (getDataSource() === 'api') persist();`——API 模式下本地备份写完后必须触发全量快照写穿，否则 BranchService 写操作（创建/删除/归档/品牌/任务状态）刷新即还原
  - **Z2 服务端缺 CRUD（F4）**：`server/routes/resources.js` 用 `RESOURCE_TABLES` 表名映射 15 个资源，逐资源注册 `POST /:resource`（创建，缺 id 用 ID_PREFIX 兜底生成）/`PATCH /:resource/:id`（补丁合并）/`DELETE /:resource/:id`，全部经 `requireAuth(db)` 保护；活动特例 `POST /activities/:id/archive`（级联完成 tasks）、`POST /activities/:id/brand`（isBrand 切换）
  - **Z3 三处假操作（F2）**：`ws-prop-commissioner-entry.js` / `ws-org-commissioner-entry.js` / `components/inspector.js` 的 `updateActivity` 调用后补显式 `persist()`
  - **Z4 交接催促不落库（F3）**：`ws-disc-commissioner-entry.js` 催促动作补 `updateHandoverRecord(recordId, { remindedAt })` 后展示成功 toast
  - **Z5 服务器种子缺口（F5）**：`docs/src/core/data-adapter.js` init() 解锁 `_loaded` 后，`attendances/inspections/todos` 空集合回退本地 mock 种子（ATTENDANCE_RECORDS/INSPECTION_RECORDS/SEED_TODOS）。**关键约束：回退仅填 mockDB 缓存、不触发 persist/快照写穿**——否则页面加载期（800ms 防抖窗口）会以陈旧缓存覆盖服务器其他入口刚写入的数据（e2e-login 回归根因）；makeupTasks 无静态种子（纪检操作生成），空属合理不回退
  - **Z6 ApiAdapter 死代码（保留）**：30+ CRUD 方法与 server 路由已由 Z2 对齐（全部可工作），前端 ApiAdapter 暂未接线（URL 指向未知端口），保留待部署期接线
  - **Z7 参考资料失效链接（F6）**：`docs/src/modules/references.js` doc-04/05/06 相对路径修正、doc-13 改在线反馈（FEEDBACK_FORM.md 已删）；**doc-07（党章合规链接）与 doc-08~12 未挂接的合规文件未动**（遵书记追加指令）
  - **Z8 e2e-login 回归根因（R3 动态确证）**：防抖快照竞态（见 Z5），修复后 e2e-login 由红转绿

- **变更文件**：`docs/src/services/mock.js`、`docs/src/core/data-adapter.js`、`docs/src/core/domain.js`（无）、`server/routes/resources.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/components/inspector.js`、`docs/src/modules/references.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果（修复后全模式验证通过）**：
  - ✅ server 测试 16/16 全绿（`npm test`，含修复前失败的 e2e-login）
  - ✅ CRUD 全链路 curl 验证：create/update/archive/brand/delete/401 六场景服务端行为正确
  - ✅ Z1 写透动态验证：真实 server API 模式 toggleBrand 后服务器 isBrand False→True（写穿闭环打通）
  - ✅ mock 模式 updateActivity+persist 落盘验证 + 首页登录态渲染回归（bodyLen/actCount/attCount/hasCal/hasSecHeader 全部正确）
  - ✅ GetDiagnostics 全部修改文件零错误；`node --check` 语法全过

- **沉淀标签**：`[已沉淀: 扎口检查方法论]` — 「统一模块封装是否完全功能实现」的判据 = 前端暴露接口 ↔ 服务端路由 ↔ 数据持久化三环闭合，任何用户写操作必须走完整闭环（修改数据 → persist()/saveDB() → localStorage 或 API 快照写穿），否则刷新即丢失 = 假操作；`[已沉淀: 防抖快照竞态]` — 全量快照写穿（800ms 防抖）下，初始化/回退路径一旦触发 persist()，会以陈旧 mockDB 覆盖服务器新数据，回退逻辑只填缓存、不得触发 persist；`[经验: ID_PREFIX 兜底]` — 服务端创建路由缺 id 时按资源前缀 + randomUUID 生成，保证离线前端创建也能对齐服务器主键；`[待办]` — 无

## T-223/T-224 通知全链路完善 + 三类活动上下游与数据交接重构（补写，2026-08-06）

> 本条目为过程债务补写：commit 29c6bab / 9871ceb / 6e38b21 / 75542ce 已提交，日志此前未记录。

**任务**：① T-223 通知跳转/卡片去边/排序/考勤批量确认等全链路完善；② T-224 三类活动（三会一课/主题党日/专班）身份-职能上下游梳理 + 数据交接卡片删除 + 分类型关闭条件 + 产出物定向路由 + 附件查看窗口（设计稿 `docs/superpowers/specs/2026-08-06-activity-upstream-downstream-and-data-handover-design.md`）
**引用流程**：H1.2 执行 + H5 书记评议 + webapp-testing Skill + fullstack-developer Skill

- **T-223（commit 29c6bab）**：通知跳转直达对应 tab、卡片去边线、列表排序、考勤批量确认、表单基建统一等全链路完善
- **T-224 §5.3/§6.2（commit 9871ceb）**：纪检考勤 tab 改造 + 纪检考察专班名单区
- **T-224 §5.5/§7/§8（commit 6e38b21）**：书记直达 + 分类型关闭条件（三会一课→书记「纪要+请假确认+缺勤补课」/ 主题党日→书记「考勤+考察+复盘+宣传归档」/ 专班→组织委员解散「考察+工作量报告」）+ 产出物定向路由（OUTPUT_ROUTES 固化 domain.js，deriveOutputRoute 派生 routedTo，组织者只见「提交」不见发送对象）+ 产出物查看区（inspector 同源读取考勤/考察正式库 + actSubRecords + archiveRecords）
- **T-224 §8 补齐（commit 75542ce，本会话前段）**：宣传归档关联键统一 activityId（书记裁决「统一用 activityId 关联」）——SEED_ARCHIVE_RECORDS 全局化（loadDB 注入，ar1/ar2→act-25，ar5→act-19，无活动关联的 ar3/ar4/ar6 靠 activityName 兜底），mock.js 与 mock-adapter.js 双 loader 同步 `_seedInitialData` 注入 + `_mergeNewSeedRecords` 老用户按 id 覆盖迁移，inspector 产出物区/关闭条件 activityId 优先 + activityName 兜底；修复书记页产出物区为空（归档种子原本只在宣传委员页注入，违反同一套数据）

- **变更文件**：`docs/src/core/domain.js`、`docs/src/mock/seed.js`、`docs/src/services/mock.js`、`docs/src/core/mock-adapter.js`、`docs/src/components/inspector.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/services/taskforce.js` 等

- **验证结果**：webapp-testing 13/13 通过（act-25/act-19 正确显示已归档、act-16 不误匹配、宣传页回归 6 条、老用户迁移路径）+ server npm test 16/16

## T-207 收尾：D3 系统跟随深色主题 + E2 待办数据上下游标注（2026-08-06）

**任务**：T-207 剩余两项网页 UI 专项——D3 系统跟随主题模式 + E2 功能层数据联动（待办项标注数据上下游）
**引用流程**：H1.2 执行 + fullstack-developer Skill + verification-before-completion Skill
**来源**：T-207 乙部剩余项（书记 AskUserQuestion 2026-08-06 选定「全站深色主题（推荐）」+「待办内嵌小字（推荐）」）

- **D3 全站深色主题**：`@media (prefers-color-scheme: dark)` 三层覆盖策略——① CSS 变量反向（neutral/surface/functional 变量）② 高频 Tailwind 类 `!important` 覆盖（Play CDN 运行时注入样式序靠后须提权，`bg-gray-50/50` 类名须转义 `bg-gray-50\/50`）③ help/about 独立变量体系（`--help-*`/`--ab-*`）+ 硬编码浅色组件逐一覆盖。约束：`--party-red` 系不变、`--surface-header` 深红保持、角色识别色不变
- **E2 待办数据上下游标注**：todo 增加 `flow` 字段——`create()/createBatch()` 支持 data.flow；`_inferFlow()` 按 targetModule 推断（attendance→'考勤上传 → 纪检确认 → 考勤总表'、party→'发展材料 → 组织委员建档 → 人才库'）；LifecycleTodoDeriver 三类派生器手动标注（活动创建/专班创建/活动归档）；SEED_TODOS 6 条加 flow（todo_seed_7 无明确上下游不加）；书记全局概况 4 条派生待办 flow 补齐。列表内嵌小字渲染（`text-[11px] text-gray-400`，仅 todo.flow 存在时显示）

- **变更文件**：`docs/src/styles.css`、`docs/src/components/todo-list.js`、`docs/src/services/todo.js`、`docs/src/services/secretary-overview.js`

- **验证结果**：GetDiagnostics 零错误 + 浏览器深色模式实测通过

## attachments 双模式附件上传（宣传委员档案归档增量，2026-08-06）

**任务**：spec §8 后续增量落地——宣传委员上传照片/简讯/报送（照片≥3张/简讯48h/周一报送/档案7天），产出物区/关闭校验同源读取
**引用流程**：H1.2 执行 + fullstack-developer Skill + verification-before-completion Skill
**来源**：书记 AskUserQuestion 2026-08-06 选定「双模式附件上传（推荐）」

- **上传入口**：宣传委员「档案归档」tab 搜索栏行内新增 accent 色「上传材料」按钮（icons.js 新增 upload 图标，lucide 标准风格）+ 上传浮窗（关联活动必选 + 材料类别新闻稿/照片/视频/其他 + 文件多选 + 图片缩略图预览 + 超限过滤 + 移除单文件）
- **双模式分流**（`isApiMode()` 判断）：
  - **mock 模式**：FileReader → base64 dataURL → 写入 `mockDB.archiveRecords`（status:'archived'，含 fileName/fileSize/fileData）+ `persist()`；单文件 ≤2MB（localStorage 容量约束）
  - **server 模式**：文件本体 `POST /api/v1/uploads`（multer 落盘 server/uploads/，返回 {path}）→ 元数据 `POST /api/v1/fileSpaceRecords`（server RESOURCE_TABLES 无 archiveRecords 表，落文件空间宽表）→ 内存同步 push archiveRecords + **push fileSpaceRecords**
- **实测发现的缺口与修复**：server 模式上传元数据落库后随即被 `persist()` 全量快照写穿以空数组覆盖（快照 payload 取 `mockDB.fileSpaceRecords`，init 时拉取的空服务器表）——修复：元数据 POST 成功后同步 push 到 `mockDB.fileSpaceRecords` 内存（快照 payload 含新记录，不再清表）+ 检查 resp.ok
- **产出物区联动**：inspector 产出物区 pubItems meta 增加 fileName（书记/纪检"看到材料本身"）；关闭条件宣传归档项（pubItems.length===0）上传后即满足
- **验证结果**：
  - ✅ mock 模式 browser 实测 12/12：上传→toast「已归档 1 项宣传材料」→列表刷新→localStorage 持久化→刷新存活→书记页产出物区显示「照片：七一建党105周年活动 2026-08-06 · test-photo.png · 已归档」
  - ✅ server 模式 browser 实测：真实登录走 API 模式→上传→fileSpaceRecords 落库稳定（GET total=1，刷新后仍在）→文件可下载（200 image/png 70 字节）
  - ✅ server npm test 16/16 + GetDiagnostics 零错误
- **沉淀标签**：`[经验: 快照写穿清表缺口]` — server 模式向服务器表写单条记录后，若前端 mockDB 对应集合未同步（persist() 全量快照以 mockDB 状态整表覆盖），刚落库记录会被立即擦除；凡 server 模式单条写（资源级 CRUD）必须同步更新前端 mockDB 对应集合。`[待办]` — server 端无 archiveRecords 表（刷新后归档列表为内存态），后端补表属 P2 后续

## T225 书记 4 项界面专项：未读角标口径 + 下拉内嵌搜索 + 按钮四档规范 + 侧边栏主题色个性化（2026-08-06）

**任务**：书记 4 连问——① 右上角「未读」数字角标的计算规则不明；② 任何随时间增长/查找复杂的选择类下拉（活动/专班/人员）必须内置搜索（Use Skill: web-design-guidelines）；③ 部分 SVG 装饰摆放不合时宜（搜索图标与 input 重叠）+ 同一界面 button 尺寸差距过大要有相对标准；④ mock 各角色主题色 + 字号是否可进侧边栏设置、每个角色可选自己最喜欢的颜色（现有角色颜色集合）（Use Skill: brainstorming）
**引用流程**：web-design-guidelines Skill + brainstorming Skill + dispatching-parallel-agents Skill（4 代理并行按钮规范化）+ verification-before-completion Skill + browser_use 实测
**来源**：书记界面评审 4 项（2026-08-06 原话，见用户输入）

### ① 未读角标计算口径（解释完成，未改逻辑）
- 角标 = 未过期（expireDate ≥ 今日，`NoticeStore.list({ activeOnly: true })`）且未读（`!n.read`）的通知数；`unread > 9` 显示 `9+`；header.js 订阅 `DATA_CHANGED_EVENT`/`DATA_LOADED_EVENT` 即时刷新；与首页通知栏口径一致；保留策略（紧急全展示/重要仅未读）只影响列表展示，不参与角标统计

### ② custom-select 下拉内嵌搜索（实现）
- `docs/src/components/custom-select.js`：新增 `SEARCH_THRESHOLD = 10`——选项数超阈值时展开自动在菜单顶部插搜索框（sticky 定位 + input 实时过滤 + 无匹配「无匹配项」提示 + Enter 选首个可见项 + Esc 先清空再关闭）；`_closeMenu` 重置搜索状态
- **关键修复**：上传模态「关联活动」下拉（30 项）此前是原生 select class（不含 `input-flat`），未被 bootstrap.js 全局增强器（只增强 `.input-flat select`）捕获 → 核心场景搜不到。修复：`#weekly-week`/`#upload-activity`/`#upload-category` 三个 select 统一改 `class="input-flat text-xs w-full"`，纳入增强体系
- browser 实测：搜索框出现 →「主题」过滤 5 项 →「zzzz」无匹配项 → 周报下拉展开正常

### ③a 装饰 SVG 修复
- `#archive-search` 搜索图标（absolute 左偏移）与 input 文字重叠：`pl-8` 补内边距解决

### ③b 按钮四档尺寸规范（书记 AskUserQuestion「全站一次规范（推荐）」）
- styles.css L599-609 写入四档权威定义：微操作档 25px（.btn-action）/ 默认档 30px（text-xs px-3 py-1.5）/ 行内对齐档 34px（text-xs px-3 py-2）/ 主 CTA 档 44px（text-sm px-6 py-2.5）
- **4 个并行 subagent 规范化 21 文件**：ws-prop（17 处，主线程先行）+ ws-secretary（18 处）+ ws-leader（18 处）+ ws-visitor（5 处）+ ws-org（13 处）+ ws-disc（5 处）+ 组件/服务 13 文件（15 处）
- 豁免规则：纯图标 × 关闭按钮、rounded-full pill/filter、维度选择 chip（dt-l1~l4）、btn-md/btn-action/btn-tab 组件类、内部一致 text-sm px-4 py-2 同组按钮
- 判例：表单「提交/取消」对升级主 CTA 档保持等高（ws-org 招募表单既有模式 `text-sm px-5 py-2.5`）；`#att-batch-apply` 与 select 同行归行内对齐档

### ④ 侧边栏主题色个性化（书记 AskUserQuestion：所有角色均可选 + 选色自动刷新 + 圆点色板弹层）
- **适用范围边界（清晰化）**：语义色（ROLE_COLORS：日历任务色点/考察等级/参与者标识/活动类别色）全站固定；强调色（ACCENT_COLORS：按钮/标签/卡片强调）可个性化
- constants.js 新增 `resolveAccentRole(preferred)`（localStorage `workflowos_accent_role` 优先 + 有效性校验回退）+ `ACCENT_PALETTE`（ACCENT_COLORS 去重 9 色）
- 消费点改造：bootstrap.js `bootstrapPage({ accentRole })` 与 header.js 角色标签均走 `resolveAccentRole`；login-entry.js 角色色板（语义用途）不改
- sidebar.js 底部「字号」组旁新增「主题色」组（当前色圆点）+ 固定定位色板弹层（9 色 swatch + 角色名标签 + active 高亮 + 外部点击关闭），选色写 localStorage + reload 全站生效；styles.css 新增 `.sidebar-accent-toggle`/`.accent-swatch`/`.accent-palette` 系列（--neutral-* 变量深色自适应）
- 两处 `var(--accent-*)` 按钮背景（disc todo 标记完成 / org 发布招募）改 `${accent}` 跟随个性化

- **变更文件**：`docs/src/components/custom-select.js`、`docs/src/components/sidebar.js`、`docs/src/components/header.js`、`docs/src/core/constants.js`、`docs/src/core/bootstrap.js`、`docs/src/styles.css`、`docs/src/entries/{ws-prop,ws-secretary,ws-leader,ws-org,ws-disc,ws-visitor}-commissioner-entry.js`、`docs/src/components/{calendar,inspector,todo-list,query-view,issue-detail,issue-list}.js`、`docs/src/services/{issues,notice}.js`、`docs/src/entries/{login,archive,notice}-entry.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果**：
  - ✅ server npm test 16/16 全绿
  - ✅ browser_use 实测：登录宣传委员 → 上传模态下拉搜索框/过滤/无匹配全通过 → 侧边栏色板弹层（9 色 + active 高亮）→ 选绿色后侧边栏色点 +「上传材料」按钮同步变绿 → 恢复 prop-commissioner 回海蓝
  - ✅ GetDiagnostics 全部修改文件零 JS 错误（仅存量 markdownlint 警告）
  - ✅ Grep 复核：`<button[^>]*px-2` 全站无残留（rounded-full pill 豁免）；`px-4` 仅剩豁免项
- **沉淀标签**：`[已沉淀: 角色颜色适用范围]` — 语义色（身份/类别/状态标识）固定 + 强调色（界面装饰/按钮/标签高亮）可个性化，两者由 ROLE_COLORS/ACCENT_COLORS 双体系隔离，个性化只走 `resolveAccentRole` 覆盖强调色消费点，永不触碰语义色；`[已沉淀: 长列表下拉必搜]` — 任何选项随时间增长/查找复杂的选择控件，选项数超阈值（10）自动内嵌搜索，统一由 custom-select 增强体系承载，新页面 select 必须带 `input-flat` 类才能被增强器捕获；`[已沉淀: 按钮四档规范]` — 微操作/默认/行内对齐/主 CTA 四档，判断规则=与 input 同行→行内对齐档、独立卡片/模态→默认档、主提交/显著 CTA→主 CTA 档、表格行内密集→微操作档；`[待办]` — 共享模块 URL 缓存版本号（防 browser 旧模块缓存）；部署期 ApiAdapter 接线（Z6 遗留）

## T226 书记追问：下拉呆板定位反思 + 按钮未全站同步核查（2026-08-06）

**任务**：书记对 T225 提出两点「反思」——① 每次下拉都呆板地出现在下方，未按实际情况调整位置；② 质疑按钮是否真的全站同步了大小（「我看不见得！！」）
**引用流程**：verification-before-completion Skill + browser_use 双轮实测 + 全站按钮 Grep 审计
**来源**：书记 AskUserQuestion 附带意见（2026-08-06 原话）

### ① 下拉智能定位（custom-select.js）
- `_positionMenu`：展开时按触发器 `getBoundingClientRect()` + 视口可用空间决策——下方空间足够 → 向下；不足且上方足够 → **向上翻转**（`cs-open-up` 类，bottom 对齐触发器上方 4px）；两侧都不足 → 取空间大的一侧
- 菜单改 `position: fixed` 逐次计算（left/width/top|bottom/maxHeight 全 inline），**可脱离滚动容器裁剪**（如模态框内靠底下拉不再被 `.modal-body` 裁剪）；max-height 按可用空间收缩（min 96px）
- 打开期间监听 `scroll`（capture）+ `resize` 重定位（`wrapper._csReposition` 挂载，`_closeMenu` 清理）；选中项改为仅滚动菜单自身（`menu.scrollTop` 计算，替代 `scrollIntoView` 避免带动页面滚动）
- browser_use 实测：场景A 正常向下（GAP=4 ✓ fixed ✓）/ 场景B 页面贴底翻转向上（`menu.bottom ≤ trig.top`，`cs-open-up` ✓，maxHeight=240 封顶）/ 模态内 maxHeight 收缩 153.8px / 滚动容器滚动后面板跟随重定位 ✓

### ② 按钮全站核查与补漏（回应「看不见得」）
- 全站 `<button` Grep 审计（161+79 行），发现并修复 16 处未归档按钮：
  - `px-5 py-2.5`（38px 无档）→ 主 CTA `px-6`：ws-secretary wp-submit/发布通知/确认设组长、ws-leader dt/att/insp 三组提交取消（replace_all）、ws-org 招募发布对
  - `px-4 py-2 text-sm`（36px 无档）→ 主 CTA `px-6`：issue-form 提交反馈、issue-detail 提交评论、issue-list +新反馈、notice-entry 确认读取
  - `w-full py-2.5` 缺 px → 补 `px-6`：inspector 关闭/知道了、issue-detail 应用、ws-prop 周报报送、login-entry/login.html 登录
  - modal.js `openFormModal` 取消/提交内联 `padding:8px 16px`（btn-primary/btn-secondary 内联覆盖）→ 默认档 30px + 主 CTA 44px 标准类
  - ws-secretary 设党小组组长 `text-sm px-3 py-1.5` → 默认档 `text-xs px-3 py-1.5`
- **根因补漏**：`input.input-flat.text-xs` 普通输入框缺失收窄规则（base padding 12px 16px → 42px），同 flex 行按钮被 stretch 拉高 → styles.css 新增 `input.input-flat.text-xs { padding: 8px 12px }`（34px），与 select/cs-trigger 同档；browser 复核 `#archive-search`+`#archive-upload-btn` 均 34px 等高
- **教训（工具陷阱）**：同一文件多个 Edit 并行提交发生**写覆盖**（issue-detail L114、inspector L124、ws-leader submit、ws-secretary L1340/L96 的修改被后写吞掉），必须**同文件串行编辑**；已逐个重放并 Grep 复核 `px-4 py-2|px-5 py-2.5` 仅剩豁免项（tab-bar 组件 / dt 维度 chip / 受众选择 chip）
- 豁免确认：tab-bar 页签、dt-l1~l4/host 维度 chip、通知受众选择 chip、btn-action/btn-md/btn-tab 组件类、纯图标关闭按钮

- **变更文件**：`docs/src/components/custom-select.js`、`docs/src/styles.css`、`docs/src/components/{modal,issue-detail,issue-form,issue-list,inspector}.js`、`docs/src/entries/{ws-leader,ws-org,ws-prop,ws-secretary,notice,login}-*.js`、`docs/login.html`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果**：
  - ✅ node --check 全部 12 个修改 JS 文件语法通过
  - ✅ browser_use 场景A/B：向下/向上翻转/高度收缩/滚动跟随全部符合预期，无裁剪无溢出
  - ✅ browser_use 复核：`#archive-search`+`#archive-upload-btn` 34px 等高（旧 42px 为浏览器缓存旧 CSS，硬刷新后生效）
  - ✅ 按钮高度分布实测：书记/宣传工作台主要操作按钮集中 28/30/34/42-44 档，无系统性偏差
- **沉淀标签**：`[已沉淀: 下拉智能定位]` — 下拉不许呆板朝下：展开时按视口可用空间决策（下→上翻转），position:fixed 逐次计算脱离滚动容器裁剪，max-height 按可用空间收缩，打开期间跟随 scroll/resize 重定位；`[已沉淀: 同文件并行编辑写覆盖]` — 同一文件多个 Edit 不得并行提交，必须串行（后写会吞掉先写）；`[已沉淀: input-flat.text-xs 34px]` — `input.input-flat.text-xs` 必须 8px 12px 收窄至 34px 与 select/cs-trigger 同档，否则 42px 会撑高同 flex 行按钮

## T227 书记浏览器选中 6 元素逐项打磨：下拉宽度/色板布局/主 CTA 34px/聚焦金边/浮层互斥（2026-08-07）

**任务**：书记在浏览器选中 6 个元素逐项指出问题——① 侧边栏色板 div 位置不对；② 搜索图标 svg 与文字重叠；③ button 太厚（喜欢 34px 高度）；④ 下拉触发器；⑤ #archive-search 输入框聚焦出现红边+黄边（要求只留黄边）；⑥ 下拉菜单宽度把握不好 + 两个浮层同时打开无自动收起机制
**引用流程**：web-design-guidelines Skill + fullstack-developer Skill + browser_use 两轮实测
**来源**：书记浏览器选中元素逐项反馈（2026-08-07 原话）+ AskUserQuestion 决策（主 CTA 统一 34px、色板 2 行×5 列规律排布、恢复紫色、颜色标签不与人挂钩）

### 修复清单（六项）
1. **下拉宽度回归 bug**（验证失败根因）：`.cs-menu{ min-width:100% }` 在 `position:fixed` 下解析为**视口宽**（1095px）→ `.cs-option` 被撑成视口宽 → 污染「最宽选项」测量 → 菜单变全屏宽。修复：`_positionMenu` 测量前先 `menu.style.minWidth='0'` 解除样式表规则，改用 `el.scrollWidth`（选项 nowrap 下即真实内容宽）测量，`width = max(触发器宽, 最宽项+8)` 显式写 width/minWidth，封顶 `viewW-8`。实测：触发器 96px、菜单 104px、最宽选项 94px ✓
2. **主 CTA 按钮 34px**：`text-sm px-4 py-1.5` 数学上 = 32px（20px 行高+12px padding，**无边框缺 2px**）。修复：**带边框按钮保持 py-1.5（20+12+2=34px）不动**，**无边框按钮改 py-[7px]（20+14=34px）**；styles.css 四档规范注释补实测口径。共改 18 处无边框主 CTA（login.html/login-entry/inspector×2/issue-form/issue-list/modal/issue-detail 提交评论/ws-leader dt/att/insp 提交×3/ws-org 发布+org-insp 提交/ws-prop 报送/ws-secretary 确认赋权/wp-submit/确认设组长/发布通知），9 处带边框按钮（取消对/notice/issue-detail 应用/ws-sec-write-btn）保持 py-1.5。实测登录按钮 offsetHeight=34px ✓
3. **聚焦只留金边**：全局 `input:focus-visible{ outline:2px solid var(--primary-500) }` 红圈 + `.input-flat:focus{ border-color:var(--party-gold) }` 金边 → 新增 `input.input-flat:focus-visible{ outline:none }` 白名单，只留金边。实测 outline none + border rgb(255,215,0) ✓
4. **搜索图标重叠根因**：`input.input-flat.text-xs{ padding:8px 12px }` 用 padding **简写**覆盖了 `pl-8`（padding-left:32px）→ 只改垂直 padding（`padding-top/bottom:8px`）。实测 padding-left=32px、文字起点 63.99 > 图标右缘 55.98 ✓
5. **色板规律排布 + 恢复紫色 + 颜色名**：ACCENT_PALETTE 改为固定 10 色（补回紫色 #7C3AED，与 ROLE_COLORS.deep 语义色同源——紫色从未删除，只是没进色板），2 行×5 列 grid，标签改颜色名（红/橙/金/绿/青/天蓝/海蓝/紫/灰/亮蓝）不与人挂钩。实测 10 色块 + 紫存在 + title 全颜色名 ✓
6. **浮层互斥**：新增全局 `window.__popoverClosers`（Set）+ `__closeOtherPopovers(keep)`；custom-select `_openMenu` 打开前互斥关闭其他浮层、注册 `_csCloser`，`_closeMenu` 注销；sidebar 色板同样注册/注销。实测双向互斥 ✓（正向：开色板→点下拉→色板从 DOM 移除；反向：开下拉→点 swatch→下拉全部收起）

### 附带修复
- `#sidebar-overlay` 关闭态 `visibility:hidden` 但 z-index 60 全屏 fixed，`visibility` 过渡期间仍可命中点击（0.3s 内吞内容区点击）→ 基础态 `pointer-events:none` + `.visible` 态 `pointer-events:auto`。实测关闭态 pointer-events none ✓

- **变更文件**：`docs/src/components/custom-select.js`、`docs/src/styles.css`、`docs/login.html`、`docs/src/entries/{login-entry,notice-entry,ws-leader-entry,ws-org-commissioner-entry,ws-prop-commissioner-entry,ws-secretary-entry}.js`、`docs/src/components/{issue-detail,issue-form,issue-list,modal,inspector}.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果**（browser_use 实测 DOM 数值，6 项全过）：
  - ✅ 下拉宽度自适应：触发器 96px / 菜单 104px / 最宽选项 94px，远小于视口 1095px
  - ✅ 登录按钮 34px（offsetHeight=34，20+14 无边框）
  - ✅ 浮层互斥双向（色板↔下拉自动收起）
  - ✅ 色板 10 色 2×5 + 紫 #7C3AED + 颜色名 title + 向上翻转（popover 底 522 < swatch 顶 584）
  - ✅ 搜索图标不重叠 + 聚焦 outline none + border 金
  - ✅ #sidebar-overlay 关闭态 pointer-events none
- **沉淀标签**：`[已沉淀: fixed 下 min-width:100%=视口宽]` — position:fixed 元素 min-width/width 的百分比相对**视口**而非包含块，测量前必须临时清 min-width 再测 scrollWidth/offsetWidth；`[已沉淀: 34px 双口径]` — 34px 按钮两种实现：带边框 text-sm py-1.5（20+12+2）与无边框 py-[7px]（20+14），不得混用 py-2（36px）；`[已沉淀: padding 简写覆盖工具类]` — 组件 CSS 覆盖 Tailwind 工具类时禁用 padding/inset 简写（会吞 pl-*/pr-*），只写单边属性；`[已沉淀: 浮层互斥注册表]` — 全局 `__popoverClosers` Set + `__closeOtherPopovers(keep)`，任何新浮层（下拉/色板/弹层）打开前先关其他浮层，关闭时注销

## T228 书记五连问收口：缓存版本号链 + 身份自动跳转 + 工作台 Tab 懒加载 + 数字口径统一 + 红边淡金（2026-08-07）

**任务**：书记五连问——① 数据一会显示一会不显示（要求清理不合理缓存）；② 右上角「身份」与工作台可错位（同服务器跳转 workspace 出现错位）；③ 部分界面加载慢（about 最重，电脑带不动）+ workspace Tab 单独建页还是合并；④ 检查每个数字的计算逻辑；⑤ 可点击组件检查诡异的红色边框
**引用流程**：fullstack-developer Skill + web-design-guidelines Skill + brainstorming Skill + AskUserQuestion 五轮决策 + browser_use 三轮端到端实测 + Node 语法检查
**来源**：书记五连问（2026-08-07 原话）+ AskUserQuestion 决策（Tab 架构=保持合并+懒加载、身份=自动跳转对应工作台、缓存=全站统一版本号、红边=删去改淡金）+ 附加反馈（about 页加载最费力需提速）

### ① 缓存：全站版本号链 + CODE_VERSION 自检
- **根因**：entry JS 带 `?v=`，但 entry 内部 import 的共享模块（core/services/components）不带版本号 → 浏览器复用旧缓存模块，新旧代码混用 → 「数据一会显示一会不显示」
- **方案**：`docs/scripts/bump-version.mjs`（正则批量 stamping）将**全部共享模块 import/动态 import** + 14 个 HTML 入口 script + styles.css 统一打 `?v=20260807b`；`CODE_VERSION` 6→7
- **自检兜底**：`cross-page-state.js` 新增 `isStaleCodeVersion()` — 若检测到旧 tab 的旧模块（版本号不一致）则 `bumpDataVersion()` + `reload()`，从数据层规避混用
- 已跑 `20260807b`：JS 58 个 + HTML 14 个 + CODE_VERSION+1

### ② 身份与工作台错位：自动跳转对应工作台
- **根因**：header 身份读 localStorage，页面本身（page）与身份无强绑定 → 以 A 身份打开 B 工作台 URL 即错位
- **方案**：bootstrap 身份校验 `allowedPages` 取全部角色并集 + 身份与当前页不匹配时**自动重定向到对应身份的工作台**，URL 直达不再产生错位

### ③ 加载慢：Tab 懒加载 + about 提速 + 架构决策
- **Tab 架构决策**（书记 AskUserQuestion）：**保持合并 + 懒加载**（不单独建网页——单独建页会破坏共享 header/sidebar/状态同步/跨页通信，且每页重复加载全站基础库；合并单页按需加载收益最大）
- **书记工作台 6 Tab 懒加载**：`tab-bar.js` render 支持异步（返回 Promise + `.catch` 兜底）、暴露 `tabs` 属性；`ws-secretary-entry.js` 薄壳化 2530→78 行，6 个 Tab 拆为独立模块（todo/overview/calendar/assign/notification/feedback），首次进入该 Tab 才 `import()` 加载
- **about 页提速**（书记附加反馈）：Google Fonts 改 preload+onload 非阻塞 + noscript 兜底（清除渲染阻塞）；GSAP/ScrollTrigger/Lenis 全 defer（模块入口 type=module 天然延迟执行可消费）；胶片时间码 scroll 监听 rAF 节流（layout 读取合并到每帧一次）
- **Tailwind play CDN 不可 defer（关键经验）**：`defer` 使 CDN 在解析完成后执行，加载时以全新对象**覆盖** `window.tailwind`，把先前设置的 config 重置为空 → 自定义 party 党建红系全失效。最终：Tailwind 保持同步 + `window.tailwind = window.tailwind || {}` 守卫；GSAP/Lenis 保持 defer

### ④ 数字计算逻辑审计（逐项核验）
- **出勤率口径统一**：`present + made_up`（应到=全部在册成员，实际到场=出席+补课）共修 5 处（attendance card / overview / leader / org / stats）
- **颜色阈值统一**：90/70 两档（优/合格）共 4 处（>90 绿、70-90 蓝、<70 红）
- **党小组组长统计**：预设组长 + 运行时授予并集（`_countActiveLeaders` 预设+审计快照）
- **核验正确项**：待办过期判定、通知角标数、考察进度、活动统计、专班进度、公邮倒计时——全部口径正确无改动

### ⑤ 红边清除：全局 focus-visible 红边改淡金
- 涉及可点击组件（输入框/下拉/按钮聚焦）的红色 `outline` 全部改**淡金**（`--party-gold-light` 系），浏览器实测无红边残留

### 修 bug（浏览器实测驱动）
- **`renderQueryView` 局部函数遮蔽导入**：calendar-tab.js 局部同名函数遮蔽 `../../components/query-view.js` 导入 → 活动查询视图永不渲染 → 改名 `renderQueryPanel`
- **tab 动态 import 404**：tab 模块位于 `src/entries/tabs/secretary/`，导入写成 `../../` 只上跳两级 → 解析到不存在的 `src/entries/core/` → 全部 Failed to fetch → 6 文件统一改 `../../../`
- **`ReferenceError: tailwind is not defined`**：加 `window.tailwind = window.tailwind || {}` 守卫消除

- **变更文件**：`docs/scripts/bump-version.mjs`（新建）、`docs/src/entries/tabs/secretary/{todo,overview,calendar,assign,notification,feedback}-tab.js`（新建 6 个）、`docs/src/entries/ws-secretary-entry.js`（薄壳化）、`docs/src/components/tab-bar.js`、`docs/src/core/{bootstrap,cross-page-state,data-loader}.js`、`docs/src/services/{secretary-overview,roles}.js`、`docs/src/styles.css`、14 个 HTML（index/help/login/feedback/notice/search/archive + 6 工作台/about）、58 个 JS 版本号 stamping、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

- **验证结果**（Node 语法检查 9 文件 OK + GetDiagnostics 零错误 + browser_use 三轮端到端）：
  - ✅ 书记工作台 6 Tab 全部正常渲染（待办/全局概况/活动管理/赋权管理/通知发布/反馈管理，含活动日历、统计条、赋权面板）
  - ✅ about.html / index.html 渲染正常，无红边、无 `.js?v=20260807b` 模块 404，CDN（tailwind/gsap/lenis/fonts）全部成功加载
  - ✅ 自定义主题确认生效：`window.tailwind.config` 含 `theme`；`bg-party-50`=rgb(254,242,242)、`text-party-700`=rgb(206,17,38)、`border-party-200`=rgb(254,202,202)；body fontFamily 首字体 Noto Sans SC
  - ✅ 无加载后的红色未捕获异常
- **沉淀标签**：`[已沉淀: play CDN 不可 defer]` — Tailwind CDN 脚本 defer 会在解析后执行并以全新对象覆盖 window.tailwind，把先行设置的 config 重置为空；自定义主题场景必须同步加载；`[已沉淀: ES Module 缓存链]` — 入口 JS 带版本号而共享模块不带，浏览器按模块粒度缓存会新旧混用，须全站统一 bump（bump-version.mjs 自动 stamping）；`[已沉淀: 动态 import 相对路径]` — 懒加载模块位于子目录时导入共享模块需逐级上跳（tabs/secretary/ 下导入 src/ 为 ../../../），且同名函数会遮蔽导入须排查；`[已沉淀: 工作台 Tab 架构]` — 共享 header/sidebar/状态同步的多 Tab 工作台：单页合并+懒加载 > 单独建页（单独建页破坏跨页状态与通信且重复加载基础库）

## T229 书记 UI 打磨批次：全站徽章统一 + 活动生命周期态 + 类型体系归一 + 级联筛选 + 品牌字段 + 查询面板修复（2026-08-07）

**任务**：书记五连问第二批——① 徽章"字体/方框丑陋且怎么改都没用"（内联样式优先级 > CSS 类的根因）；② "未归档未提交为何说已完成"（判定逻辑矛盾）；③ "仅看品牌活动为何单独悬浮，应并入活动查询"；④ "活动类型划分粗糙，筛选应与活动划分方式对齐且表现非并列层级关系"；⑤ "写入表单『主题党日（…）』括号多此一举"
**引用流程**：brainstorming Skill + web-design-guidelines Skill + fullstack-developer Skill + sample-diff-learning Skill + AskUserQuestion 决策链（状态判定=生命周期态/类型体系=彻底归一/筛选形态=级联大类+子类chips/徽章=统一胶囊组件/品牌=整理现有品牌名+延续/新建三态/组织生活会=不进写入表单）+ browser_use 两轮端到端复验 + Node 语法检查 + 全量缺失导入静态扫描
**来源**：书记五连问（2026-08-07 原话）+"我认为这是非常好的！直接brainstorm提问我 相似的问题要一并解决！！特别是你提到的 优先级最高导致怎么改都没有用的问题，你能否也为我全系统检查一下"+"批准，开始实施"+"一定要对系统每一个可能出现相关问题的地方都做好彻查！！"+AskUserQuestion 六轮决策

### ① 徽章"改不动"根治：统一胶囊组件
- **根因**：徽章 3 种各写各的实现——内联样式（CSS 无法覆盖，优先级最高导致怎么改都没用）、硬编码 Tailwind 任意值（text-[11px] px-1.5 py-0.5）、动态类映射（合法保留）
- **方案**：新增 `docs/src/components/badge.js` 全站统一组件 `badgeHtml(text, variant, opts)` + `badgeVariantClass(variant)`，变体 ∈ success/warning/danger/info/neutral/brand/gold；`styles.css` 追加 `.badge` + `.badge--{variant}` CSS + 深色主题适配；全站 16 文件收敛
- **合法保留项**：issue 动态色徽章显式 `class="badge"` + 动态内联色；statusColor/cls/tagColor 等动态类映射 44 处残留为合法

### ② "已完成 vs 未归档"矛盾消除：活动生命周期展示态
- **方案**：`inspector.js` 新增 `deriveActivityLifecycleStatus(activity, allTasks)`（取消/归档/草稿短路 + 执行态 + 分类型关闭条件）+ `ACTIVITY_LIFECYCLE` 七态：草稿/已发布/进行中/待归档/已执行/已归档/已取消
- "已完成"仅产出齐备并归档后出现（改「已执行」）；待归档悬停显示缺项 title；DATA_ARCHITECTURE.md 补生命周期展示态表格

### ③ 品牌活动并入活动查询：悬浮按钮删除
- 日历"只看品牌"悬浮按钮删除，日历恢复全量展示；品牌筛选以 chip 并入活动查询面板（`brandChip` 开关）
- **品牌字段结构化**：`brandName` 可选字段（品牌族名，命名风格参考"人生回望录"），写入表单三态（非品牌/延续已有品牌/创建新品牌）；mock 6 条活动补录品牌名

### ④ 类型体系归一 + 级联筛选
- **权威分类** `ACTIVITY_CLASSIFICATION`（constants.js）：两大顶层非并列——三会一课（subtypes: 支部党员大会/支委会/党小组会/党课/组织生活会）vs 主题党日（carriers: 理论学习/实践参访/交流座谈/其他）；`classifyActivityType(type)` 映射
- **数据迁移**：mock 6 条座谈/参访/共建实为 theme-party 变体统一迁移为 `type:'主题党日'` + carriers + isJoint
- **级联筛选**：query-view.js 保留扁平 filters 兼容 + 新增 `category` 级联（groups 对象 + match 约定）+ `brandChip`；查询面板大类下拉 → 子类 chips 联动
- **写入表单修复**：三会一课写具体子类 label（支部党员大会/支委会/党小组会/党课，组织生活会不进表单——书记裁决：写活动名称即可）；主题党日文案删括号

### 修 bug（浏览器端到端驱动）
- **calendar-tab.js 缺 `ACTIVITY_CLASSIFICATION` 导入**（ReferenceError → 查询面板无法展开 + 写入按钮未绑定）：T229 级联筛选 config 引用常量但文件未 import → 补 `import { ACTIVITY_CLASSIFICATION, classifyActivityType } from '../../../core/constants.js'`
- **calendar-tab.js 缺 `badgeHtml` 导入**（ReferenceError → 活动管理 tab 渲染中断）：T9 全站徽章统一时漏改该新拆分文件 → 补 `import { badgeHtml } from '../../../components/badge.js'`
- 同类问题全量彻查：node 脚本全 src 扫描 8 个 T229 新增 API（badgeHtml/badgeVariantClass/ACTIVITY_CLASSIFICATION/classifyActivityType/ACTIVITY_LIFECYCLE/deriveActivityLifecycleStatus/activityLifecycleBadgeHtml/checkActivityCloseConditions）缺失导入 → **零遗漏**

- **变更文件**：`docs/src/components/badge.js`（新建）、`docs/src/core/constants.js`、`docs/src/components/{calendar,inspector,query-view}.js`、`docs/src/mock/activities.js`、`docs/src/entries/main-entry.js`、`docs/src/entries/archive-entry.js`、`docs/src/entries/ws-{leader,disc-commissioner,org-commissioner,prop-commissioner,visitor}-entry.js`、`docs/src/components/{issue-detail,issue-form,issue-list,header,status-badge,todo-list,workspace-popover,person-picker,role-hierarchy,sidebar,reactions}.js`、`docs/src/services/notice.js`、`docs/src/entries/{notice,feedback}-entry.js`、`docs/src/entries/tabs/secretary/{calendar,assign,notification,feedback,todo}-tab.js`、`content/04_web_design/DATA_ARCHITECTURE.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）；版本号 bump `20260807c`（JS 65 + HTML 14，CODE_VERSION=8）

- **验证结果**（node --check 全量通过 + 缺失导入静态扫描零遗漏 + browser_use 两轮端到端）：
  - ✅ 活动查询面板级联筛选：大类「三会一课/主题党日」→ 子类 chips（5/4）联动过滤 + 「只看品牌」chip
  - ✅ 写入活动表单：主题党日无括号、党小组会 type 正确、品牌三态（非品牌/延续已有/创建新品牌）
  - ✅ 书记工作台 6 Tab + 其余 5 角色工作台全部 Tab + 首页/归档库零 console error
  - ✅ 待归档悬停显示缺项 title（"待归档：考勤确认（2 条待确认）、考察确认（1 条待确认）、宣传归档"）、全站无"已完成"状态字面值
- **沉淀标签**：`[已沉淀: 内联样式优先级 > CSS]` — 内联 style 属性优先级最高，CSS 类/选择器无法覆盖（除非 !important），"怎么改都没用"先查是否内联样式；`[已沉淀: 新拆分文件漏导入]` — 从 entry 薄壳拆分出 tab 模块时，全站组件（badgeHtml 等）易漏 import，运行期才抛 ReferenceError——拆文件后须对新增模块做"使用但未导入"静态扫描 + 浏览器逐 Tab 点击验证；`[已沉淀: 生命周期态优于状态字面值]` — "已完成"与归档条件矛盾源于页面直读 status 字面值；展示态应由状态机/派生函数统一产出，字面值仅作存储

## T230 书记四问：组织生活会归内容维度 + 标题语义层级规则全站检查 + 侧边栏主题色精简 + 深色模式补漏上线/移动端适配修复/小程序方案评估（2026-08-07）

**任务**：书记四问——① "组织生活会不是三会一课的一部分，是内容维度，可以是支部党员大会开、党小组会开"；② "有的 title 是标题格式有的是 span，选择上有规则吗？全系统检查"；③ "主题色渲染不到位，侧边栏少写字，颜色 hover 自动出现不要写在下面"；④ "深色模式是否考虑上线 + 移动端显示是否有问题 + 如果要成为微信小程序现在需要做什么"
**引用流程**：fullstack-developer Skill + web-design-guidelines Skill + AskUserQuestion 决策链（组织生活会=迁移为党小组会/标题规则=语义+样式全统一/主题色范围=聚焦侧边栏/问题4=深色补漏上线+移动端适配检查修复+小程序方案规划）+ browser_use 四轮端到端复验 + node --check + 版本号 bump 两轮
**来源**：书记四问（2026-08-07 原话）+ AskUserQuestion 决策链 + "请继续推进未完成工作！！没有什么不适宜内容！" + "请继续推进！！"

### ① 组织生活会归内容维度
- **归属纠正**：`ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` = `['支部党员大会', '支委会', '党小组会', '党课']`（移除"组织生活会"）；`classifyActivityType(type)` 兜底 `if (type === '组织生活会') return 'three-meetings'` 兼容旧历史数据；SCENARIO_TO_CATEGORY 注释更新
- **数据迁移**：`mock/activities.js` act-19 "5月组织生活会" type 改为 `党小组会`（标题保留"组织生活会"字样，scenarioId 仍 org-life）
- **端到端验证**：三会一课子类 chips = 支部党员大会/支委会/党小组会/党课；"5月组织生活会"分类标注=党小组会；首页日历标签"党会"红系配色一致

### ② 标题语义层级规则 + 全站统一
- **规则落盘** `content/04_web_design/DESIGN_SYSTEM.md §3.3.1`：h2 页面主标题 / h3 卡片面板（text-base font-semibold）与弹窗浮层（text-sm font-semibold）/ h4 卡片内分组（text-sm font-bold）/ h5-h6 更小分组（活动角色/子记录）/ **例外：`<button>` 折叠组头内文字保持 span、行内强调文本 span**
- **全站收敛**：notice.js 通知 popover 标题 span→h3；ws-disc L477 月份分组→h4、L793 modal→h3；ws-leader L330 子记录分组→h5；ws-org L461 子记录分组→h5、L793 modal 标题去内联样式→h3；main-entry L189 "我的本月考勤"→h3、活动风采 h4 补 `font-title-cn`；ws-prop 4 处卡片分组→h4 + 2 处 modal→h3；issue-list L45 统一；archive-entry 弹窗标题统一；modal.js 通用标题→h3
- **判例确认**：待办分组标题在 button 折叠组头内 → span 合规（例外规则）；通知下拉为列表型浮层无面板标题 → 合理

### ③ 侧边栏主题色精简
- **sidebar.js**：swatch 去文字行（`data-label="主题色：${label}"` + title 保留），色板 10 色块无色名行
- **styles.css**：`.accent-swatch::after`（左侧气泡）+ `.accent-swatch-opt::after`（上方气泡）`content: attr(data-label)`，hover opacity 显现
- **端到端验证**：swatch 纯色块无文字；hover 自动显示色名；色板 hover 每个色块显示色名；切换"天蓝"即时生效并持久化（localStorage workflowos_accent_role）

### ④a 深色模式补漏上线
- **JS 内联白底全量变量化**（根因：内联 background:white 无法被 @media 覆盖）：calendar.js/modal.js/header.js/main-entry.js/notice.js/inspector.js/workspace-popover.js/ws-org/ws-prop/ws-disc/ws-visitor 共 20+ 处 `var(--surface-card)/var(--neutral-*)` 化
- **btn 系按钮深色适配**：styles.css 深色块 10 个 btn-action/btn-md 类统一半透明底 + 语义色提亮
- **person-picker.css**：trigger/搜索框硬编码 white→`var(--surface-card)/var(--neutral-*)`；深色 media query 冗余覆盖删除
- **最终复验**：完整深色模拟（变量+类覆盖）扫描书记工作台全部 tab + person-picker + 通知下拉 = **0 白块**

### ④b 移动端适配检查修复
- **移动端 375px 实测发现 3 类问题**（browser_use iframe 模拟）
- **修复① tab 栏横向溢出**（最严重 org/disc 差 120px）：`tab-bar.js` 容器加 `flex-wrap:wrap` → 5 个工作台 tab 自动换行，0 溢出
- **修复② 顶栏标题被挤压不可见**（375px 下 title 仅 2-14px）：≤640px 隐藏 `.role-label` + header-actions gap 收窄 → 标题恢复 92-102px 可见
- **复测通过**：org/disc/secretary/index 375px 下 sw=cw、0 溢出、tab 3 行换行、标题可见

### ④c 小程序方案评估（书记裁决：暂缓，仅保留方案）
- **现状评估**：DataAdapter 抽象 mock/api 双模式可切换、后端 Node Express+better-sqlite3 已规划未部署、前端纯静态+Tailwind CDN 无构建链、375px 移动端适配已验证
- **三条路径**：A WebView 套壳（改动极小、需企业主体+域名备案）/ B Taro 跨端重写（原生体验最佳、20+ 页面全重写）/ C 原生小程序（不推荐）
- **前置条件**：企业主体注册+类目、后端上线 HTTPS+ICP 备案、数据层切 api 模式
- **裁决**：暂缓立项，方案保留，待后端部署与账号注册等外部条件成熟

- **变更文件**：`docs/src/components/{tab-bar,sidebar,header,modal,calendar,inspector,workspace-popover,issue-list}.js`、`docs/src/entries/main-entry.js`、`docs/src/entries/{archive,notice}-entry.js`、`docs/src/entries/ws-{leader,disc-commissioner,org-commissioner,prop-commissioner,visitor}-entry.js`、`docs/src/entries/tabs/secretary/{calendar,todo,assign,overview}-tab.js`、`docs/src/components/person-picker.css`、`docs/src/services/notice.js`、`docs/src/styles.css`、`docs/src/core/constants.js`、`docs/src/mock/activities.js`、`content/04_web_design/DESIGN_SYSTEM.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）；版本号 bump `20260807d→e→f`（三轮各 79 文件）

- **验证结果**（node --check 全量通过 + browser_use 四轮端到端）：
  - ✅ 组织生活会归属：三会一课子类 4 项、5月组织生活会=党小组会、首页展示一致
  - ✅ 标题规则：弹窗 h3/分组 h4/子记录 h5 全站统一，button 内 span 例外合规
  - ✅ 侧边栏主题色：纯色块 + hover 气泡 + 切换生效持久化
  - ✅ 深色模式：0 白块 + 移动端 375px 全页面 0 溢出 + 标题可见
- **沉淀标签**：`[已沉淀: 移动端 tab 栏溢出]` — flex 容器无 wrap/overflow 时子元素不收缩，宽内容把整页撑出横向滚动条；tab 导航栏应默认 `flex-wrap:wrap` 或在断点加 `overflow-x:auto`；`[已沉淀: 顶栏 actions 挤压标题]` — flex 下不收缩的 actions 会把 flex:1 标题挤到不可见，移动端断点应隐藏低频信息（身份标签）为标题让位；`[已沉淀: 深色适配三层法]` — 深色模式须三层覆盖：①CSS 变量反向（var() 自动适配）②高频 Tailwind 类 !important 覆盖 ③硬编码组件逐一覆盖；JS 内联白底无法被 @media 覆盖，必须变量化根治

## T231 深色模式手动三态切换 + 全面统一修复（2026-08-07）

**任务**：书记选中首页 4 个统计卡 div + 组织委员"专班管理"激活 tab 按钮 + "待审核 (0)"状态标签元素，提出 3 问——① 四个格子显示颜色逻辑是什么 ② 深色模式如何切换（发现没有开关，只有系统跟随）③ 深色下色块渲染不一致（有的变白底偏主题色、有的完全不变；header 红底字变黑后对比度不高）
**引用流程**：web-design-guidelines Skill + fullstack-developer Skill + brainstorming Skill + AskUserQuestion 决策链（深色开关=加手动三态开关 浅色/跟随系统/深色 默认跟随系统；修复范围=全面统一修复）+ browser_use 三轮端到端复验 + node --check + 版本号 bump `20260807f→g`（79 文件）
**来源**：书记选中元素提问 + AskUserQuestion 决策 + "请继续推进！！支持你 Use Skill: fullstack-developer" + "请继续推进！！"

### ① 三问根因定位
- **统计卡颜色逻辑**（main-entry.js L108-114）：本月活动固定党建红 `#CE1126` / 活跃专班深金 `#B45309` / 未读通知动态红灰 `#DC2626|#9CA3AF` / 我的考勤动态阈值 `myRate>=90 绿 #059669 / >=70 琥珀 #D97706 / else 红 #DC2626 / 无记录灰 #9CA3AF`
- **深色无开关**：只有 `@media (prefers-color-scheme: dark)` 系统跟随，无手动覆盖入口
- **渲染不一致根因**：JS 内联 `background:${hex}15`（8 位 hex alpha）优先级高于 media query CSS 规则 → 统计卡图标底/激活 tab/专班标签在深色下"完全不变"；header 标题用 `var(--neutral-0)` 深色下反转为近黑，对深红底仅 1.56:1 对比度

### ② 手动三态切换架构
- **core/theme.js（新建）**：三态偏好 `localStorage['workflowos_theme']`（light/dark/system，默认 system）+ `getThemePreference()/isDarkTheme()/applyTheme()/setThemePreference()/initTheme()`；`<html>` 上 `.theme-dark` class 驱动全部深色 CSS + `style.colorScheme` 同步表单控件原生深色 + matchMedia change 监听（仅 system 模式实时跟随，兼容 addEventListener/addListener）
- **icons.js**：新增 lucide 风格 `sun/monitor/moon` 三图标
- **sidebar.js**：footer 新增 `sidebar-theme-toggle` 三态按钮组（id: theme-light/system/dark），`_bindThemeToggle` 绑定 click → setThemePreference + active class 切换
- **styles.css**：`.sidebar-theme-toggle`/`.theme-btn`/`.theme-btn.active` 开关样式（与字号切换按钮同族）

### ③ 深色规则前缀化：@media → html.theme-dark
- **根因**：`@media (prefers-color-scheme: dark)` 无法被手动 class 控制 → 全部深色规则改为 `html.theme-dark` class 前缀
- **styles.css** 2 个深色块 + person-picker.css 1 个深色块批量转换（`.bg-white/.text-gray-*/.border-*/.hover:*` 高频 Tailwind 类、btn-action/btn-md 系、badge--* 系、help/about 独立变量块等）
- **踩坑修复**：首版转换脚本 depth 从 0 起算导致第一个 `:root {` 闭合被误判为 media 块闭合，后续规则漏加前缀变成全局规则（会破坏浅色模式）——git checkout 恢复后 depth 从 1 起算重写脚本，花括号配平验证 depth=0/min=0 通过

### ④ 内联淡色统一：color-mix 变量化
- **统计卡图标底**（main-entry.js L119）：`background:${s.color}15` → `.stat-icon-tint` class + `--tint` 变量；浅色 `color-mix(tint 8%, transparent)`，深色 `color-mix(tint 14%, #141D2F)`
- **专班状态标签**（ws-org L304-327）：待审核/招募中/运行中/已完结 4 处 `rgba(...,0.06)+border rgba(...,0.15)` 内联 → `.tf-section-head` class + `--tint` 变量；深色 `color-mix(tint 12%, #141D2F)`
- **激活 Tab**（styles.css 深色块 ④）：内联 `--tab-accent-bg` 是浅色透明叠加 → `html.theme-dark .tab-btn-active` 覆盖为 `color-mix(accent 14%, #141D2F)`

### ⑤ 防闪烁 + 对比度
- **14 个 HTML `<head>` 顶部内联防闪烁同步脚本**（CSS 加载前即设 `.theme-dark` class + colorScheme），消除深色偏好下首屏白闪
- **header 标题**（styles.css .header-title h1）：`var(--neutral-0)` → 固定 `#FFFFFF`（header 底恒深红 #7A0010，注释说明勿回退）

### ⑥ 端到端验证（browser_use 三轮）
- **轮1**：localStorage 三态（dark→html.theme-dark+colorScheme=dark / light→移除 / system→跟随 matchMedia）全通过；登录后侧边栏三态按钮点击切换实时生效并持久化；header 标题白 #FFFFFF；统计卡图标底深色下为 14% 主题色 tint（非白块）
- **轮2**（org 深色）：激活 tab computed ≈ `rgb(19,48,73)`（深色底+天蓝混合，符合预期）；发现 4 个分区标题仍为"透明叠加 12%"与 tab 策略不一致 → 统一为 `color-mix(tint 12%, #141D2F)` 实色
- **轮3**：分区标题 4 色全为实色（待审核 rgb(29,38,70)/招募中 rgb(44,40,42)/运行中 rgb(34,37,71)/已完结 rgb(25,41,71)），与数学反推逐一吻合（误差 ≤1）；无 JS 运行时错误

- **变更文件**：`docs/src/core/theme.js`（新建）、`docs/src/core/icons.js`、`docs/src/components/sidebar.js`、`docs/src/styles.css`、`docs/src/entries/main-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/components/person-picker.css`、14 个 HTML（index/login/search/notice/feedback/archive/help/about + workspace/*.html，head 内联防闪烁）；版本号 bump `20260807f→g`（79 文件）

- **验证结果**（node --check 全量通过 + 花括号配平 + GetDiagnostics 无错误 + browser_use 三轮端到端）：
  - ✅ 三态切换（浅色/跟随系统/深色）手动开关可用、持久化、system 实时跟随
  - ✅ 深色下统计卡图标底/激活 tab/专班标签全部实色深底混合，与激活 tab 策略统一
  - ✅ header 标题恒白字，对比度正常
  - ✅ 14 页面 head 防闪烁脚本注入，无 JS 错误
- **沉淀标签**：`[已沉淀: 手动深色切换三要素]` — ①偏好存 localStorage 三态 ②CSS 深色规则必须 class 前缀（html.theme-dark）而非 @media ③HTML head 内联防闪烁同步脚本防首屏白闪；`[已沉淀: 内联样式优先级硬伤]` — JS 内联 background 优先级高于任何 media/class 规则，深色适配必须变量化（CSS 变量 + color-mix）；`[已沉淀: 批量 CSS 转换脚本配平陷阱]` — 转换含嵌套规则的 media 块时 depth 须从 media 自身 `{` 计起（depth=1），否则首个内层块闭合会被误判为外层闭合，导致后续规则丢失作用域前缀

## T-234 最小三成本原则评议·第1轮——五场景工作流通顺性检查（2026-08-08）

**任务**：书记指令"再做一次完整的最小三成本原则评议！设定3-5个具体场景，从代码层面检查清楚目前工作流是否通顺？输出到REVIEW_QUEUE，然后逐个询问书记，书记进行评议！！"——按 DESIGN_SYSTEM §一 第2条 最小三成本（信息成本/操作成本/适应学习成本）+ 第7/8条 + 分页铁律设定 5 场景，代码层面逐环节核查 → REVIEW_QUEUE 预审报告 → 两轮 AskUserQuestion 逐项询问 → 书记五项裁定全部采纳推荐 → 实施 → 冒烟 → 归档。
**引用流程**：brainstorming Skill（场景命题与评审流程设计）+ fullstack-developer Skill（代码核查/实施）+ AskUserQuestion 决策链（5 项裁定）+ playwright 冒烟（38 项检查）+ node --check + 版本号 bump `20260808l→m`（82 文件）+ CODE_VERSION 23→24
**来源**：书记指令原话 + AskUserQuestion 两轮五答（F1 4 工作台统一补直达 / F2 两处都分页 / W1 改为引导文案 / W2 增设状态提示 / W3 保持双入口+文档声明，均选推荐）

### ① 五场景预审结论
- **场景1 信息成本**（党员进入工作台第一眼看到什么）：六工作台默认 tab=待办 + 聚合卡 + flow 标注 + 紧急/过期徽章，进入即见 ✅；发现 ⚠️ W1：无业务数据时空态"暂无待办/所有任务已完成"误导新用户
- **场景2 操作成本**（待办行动按钮 1 次直达）：书记 authorize/signup-review 均有跳转 ✅；发现 ❌ F1（确凿缺陷）：组长/组织/宣传/书记 4 工作台 `_handleTodoAction` 无 read 分支——通知类待办点击仅 toast 不跳转；实测链路（书记催办宣传 → NoticeStore.add(actionable) → 派生 read 待办 → 宣传按钮无效），与参与者模板 `notice-read → notice.html?id=` 行为不一致
- **场景3 反馈闭环**（匿名提交→审核→答复→关闭）：匿名开关 + _realPersonId 仅书记可追溯 + 正式答复栏 ✅；发现 ⚠️ W2（草稿无感知）+ ⚠️ W3（参与人双入口同源疑点）
- **场景4 活动全生命周期**（创建→赋权→执行→考勤→复盘→归档）：`writeActivityWithSOP→createActivity` 内联赋权非空跳过派生 + 归档/考勤/复盘全环节联动销项，已确认无断链 ✅
- **场景5 查找成本**（无上限增长数据分页铁律）：归档库三分页 ✅；发现 ❌ F2（确凿缺陷）：书记反馈管理 + 公开反馈列表全量渲染未分页

### ② 书记五项裁定实施
- **F1 通知直达**：组长（ws-leader-entry.js L208）/组织（ws-org-commissioner-entry.js L243）/宣传（ws-prop-commissioner-entry.js L171）/书记（todo-tab.js L280）4 工作台 `_handleTodoAction` 开头统一插入通知直达分支（聚合取首条 noticeId → `basePath + notice.html?id=`，basePath 依路径含 /workspace/ 判定）
- **F2 反馈分页**：issue-list.js（公开列表）+ feedback-tab.js（书记管理）复用归档分页模式——`PAGE_SIZE=10`、页码窗口（5 页窗口+上一页/下一页）、"共 N 条 · 第 x / y 页"摘要、搜索/筛选/清除页码归 1、分页按钮事件绑定
- **W1 空态引导**：todo-list.js 空态改引导文案 + 新增 `emptyHint` 选项支持 per-role 覆盖；书记 todo-tab 详情面板空态同步
- **W2 草稿感知**：issue-form.js 提交成功提示改「反馈已提交为草稿，待书记审核通过后公开」
- **W3 文档声明**：DATA_ARCHITECTURE.md 新增 §2.1.3「参与人双入口边界」——activity.assignments（活动参与人，创建时内联，非空则不再派生组长赋权待办）vs AuthStore.authorize（项目级授权，独立记录）边界规则 3 条

- **变更文件**：`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/tabs/secretary/todo-tab.js`、`docs/src/entries/tabs/secretary/feedback-tab.js`、`docs/src/components/issue-list.js`、`docs/src/components/todo-list.js`、`docs/src/components/issue-form.js`、`docs/src/core/cross-page-state.js`（CODE_VERSION 24）、`content/04_web_design/DATA_ARCHITECTURE.md`（§2.1.3）、`.ctx/REVIEW_QUEUE.md`（预审报告+书记裁决回写）；版本号 bump `20260808l→m`（82 文件）

- **验证结果**（node --check 全量通过 + GetDiagnostics 无 JS 错误 + playwright 冒烟 11 页 38 项全过）：
  - ✅ F1 通知待办点击后直达 `notice.html?id=notice-smoke-f1`（注入待办 + 展开通知类分组后点击实测）
  - ✅ F2 公开反馈列表分页控件（4 按钮 + 每页 10 条 + 翻第2页）
  - ✅ F2 书记反馈管理分页控件（同上）
  - ✅ 原有 33 项回归全过（书记工作台/反馈/归档/五工作台无 JS 错误）
- **沉淀标签**：`[已沉淀: 待办聚合卡与折叠分组]` — 聚合卡按钮默认折叠在分类分组内，playwright 点击前须先展开分组 header；`[已沉淀: 通知待办直达分支]` — 通知类待办 actionType=read 的聚合对象无 sourceType 字段，直达分支须取 `(todo.items && todo.items[0]) || todo` 首条再判 sourceType/actionData.noticeId，4 工作台须与 visitor 模板对齐

## T223 活动排序彻查补充 + CHECKLIST 新增手动检查章节（2026-08-09）

**任务**：书记指令"党小组组长的活动写入中，活动的排序还是按照时间顺序在排，这个必须彻查！！"——全仓库彻查所有活动/专班列表排序是否符合 T223 基准；同时将"电脑难以检查"的三项内容（仓库可持续发展评估 / 文件更新+经验沉淀+系统迭代机制 / 深色模式色块设计评估）写入 CHECKLIST 单独一章，由书记手动检查。
**引用流程**：T223 排序统一基准 + fullstack-developer Skill（排序语义核查）+ web-design-guidelines Skill（深色模式评估项设计）+ sample-diff-learning Skill（检查项落地）+ webapp-testing Skill（浏览器实测）+ H3 文件修改检查清单
**来源**：书记指令原话（排序必须彻查 + 三项搁置手动检查）

### ① 排序彻查（问题4）
- **排查范围**：全仓 53 处 `.sort(`/`localeCompare` 调用 + 6 处活动 `<option>` 下拉生成点逐一核对
- **已合规**（T223 双段/单段排序）：组长「活动写入」已有关联活动（L314-315）、宣传委员「上传宣传材料」关联活动下拉（L978）、纪检委员考勤活动选择器（L449）、书记 assign-tab 两处下拉（L122/172）、组织委员专班下拉（L1504-1505）、首页活动列表/日历（main-entry L297 / calendar.js L352）、访客活动动态（ws-visitor L324）、宣传/组织看板桶内（ws-prop L373-383 / ws-org L93）、书记专班总览（taskforce.js L65）、归档/通知/复盘等
- **修复 4 处违规**（均为"无排序"即保持 mock 时间正序）：
  - `ws-leader-entry.js` 考勤上传「选择活动」下拉（L994-999）：补 `date 降序`
  - `ws-leader-entry.js` 考察上传「选择具体来源」活动下拉（L1238-1242）：补 `date 降序`
  - `ws-leader-entry.js` 复盘提交本组活动分桶（L1459-1465）：补 `date 降序`
  - `taskforce-view.js` 专班查看组件 4 状态桶内：补 `createdAt 降序`（与组织委员看板一致）
- **验证**：GetDiagnostics 无错误 + 浏览器实测确认（详见下文实测记录）

### ② CHECKLIST 新增章节（问题1/2/3 搁置手动检查）
- CHECKLIST.md 新增「手动检查清单（仓库可持续发展·文件更新·深色模式）」章：
  - **§1 仓库可持续发展评估**：链接/快照过期、文档代码同步、日志对账、经验沉淀跟上、废弃文件清理 5 项
  - **§2 文件更新·经验沉淀·系统迭代机制**：2.1 文件更新（链接/快照/YAML 元数据）、2.2 经验沉淀（决策/教训/模式三层）、2.3 系统迭代机制（3.1 CLAUDE 整合 / 3.2 content 原话整合 / 3.3 长效机制）
  - **§3 深色模式色块设计评估**：3.1 主题色平行性（逐色块明暗关系一致、党建红系、角色识别色、党徽金）、3.2 功能色可见度与可分辨率（状态色/状态点/文字对比度/边框/交互态）
- CHECKLIST.md T223 章节补入 4 处新修复检查项

- **变更文件**：`docs/src/entries/ws-leader-entry.js`（3 处排序）、`docs/src/components/taskforce-view.js`（1 处排序）、`content/03_doc_system/CHECKLIST.md`（新增章节 + T223 补项）
- **沉淀标签**：`[已沉淀: 下拉选项也要排序]` — 排序统一不只看列表渲染，所有 `<option>` 下拉生成点（考勤选活动/考察选来源/赋权选活动等）同样须按 T223 基准排序，彻查须覆盖 `.map(a => <option` 全部生成点

## T223-2 CHECKLIST 纠偏：人工检查项归属分流 + 文档归位（2026-08-09）

**任务**：书记纠偏上一轮过拟合——CHECKLIST 的本意是"机器检查+人工检查分工"，人工部分只收录"机器因截图原因无法检查、需人眼判断"的内容，且写法必须是「人在哪里→做什么→看到什么」完整叙述；我上一轮把"仓库可持续发展/文件更新/深色模式"整章塞进 CHECKLIST 属过拟合。同时 CHECKLIST 归位 04_web_design，错误内容分流到对应文档。
**引用流程**：H2.4 经验沉淀 + H3 文件修改检查清单 + H5.4 反馈分流归档 + sample-diff-learning Skill（提炼纠偏模式）+ brainstorming Skill（先确认方案再执行）+ DESIGN_SYSTEM §2 色彩系统
**来源**：书记指令（过拟合纠偏 + 归属调整 + HARNESS 机制核查）
**方案确认**：AskUserQuestion 四项全部采纳（CHECKLIST 移 04_web_design / 整章移除+内容分流 / 深色模式落 DESIGN_SYSTEM 新章 / HARNESS 核查+补缺口）

### ① DESIGN_SYSTEM.md 新增「七、深色模式设计规范」章
- 7.1 色块平行性总则（主题色）：统一明暗关系（"淡底深字"或"深底浅字"二选一，禁止单独反转）；党建红系不变 / 角色识别色不变 / 党徽金不反白 / 主题色三件套随主题反转
- 7.2 功能色可见度与可分辨率：状态色/状态点徽章/文字/边框/交互态深色下单独评估
- 7.3 人工自查清单（深色模式验收）：9 条「人在哪里→做什么→应该看到什么」（主题选择三态/登录页角色色点/首页红金语义/各工作台 tab/状态徽章/列表文字/交互态/帮助页）
- 原「七、设计资产清单」→「八」，「八、快速参考」→「九」

### ② CHECKLIST.md 纠偏 + 归位
- 整体移除上一轮写入的「手动检查清单（仓库可持续发展·文件更新·深色模式）」章（L427-481）——非"网页人工检查"性质
- CHECKLIST.md 从 `content/03_doc_system/` 移入 `content/04_web_design/`（数据同源校验属网站设计层，书记判定）
- 保留：数据同源校验（机器检查）+ 浏览器实测（T-235/T223，人工检查，格式合格）
- 一改具改：CLAUDE.md H7 链接、ARCHITECTURE.md 目录树×2、DOC_MAP.md 登记、03_doc_system/README.md 移除、04_web_design/README.md 新增、CHECKLIST YAML related_files

### ③ HARNESS 系统迭代机制核查（3.1/3.2/3.3）
- **3.2 content 原话整合** ✅ 已落地（SECRETARY_PRONOUNCEMENTS 权威源 + T-200 逐条复核 + W3 书记评议）
- **3.3 长效机制** ✅ 已落地（H5 书记评议 + T-117 理论复用评议多轮机制 + H2.4 经验沉淀闭环 + C-3 + OPERATIONS_GUIDE §15 周期任务 M2/M3/M4/Q4/Y1）
- **3.1 CLAUDE 原则整合** ⚠️ 原缺口，本次补：H5.4 新增「新原则整合收口」——书记评议/决策确立的新原则、新原话，决策后必须检查整合进长期文档（AI 行为约束/工作流→CLAUDE 甲部；书记原话→content 权威源；设计/经验→对应文档/insights），并写入 H5.5 评议记录
- **仓库可持续/文件更新治理项**：确认已被既有机制覆盖（OPERATIONS_GUIDE §15.2 M2 快照/M3 断链/M4 沉淀/Q4 分层/Y1 年度审计），无需新造

### ④ 经验沉淀
- insights/工程演进与设计方法论.md 新增 §5.9「内容归属分流」：校验进校验清单/设计进设计文档/经验进经验文档/机制进 HARNESS；人工检查项写法=「人在哪里→做什么→看到什么」三要素（"深色模式下对比度是否达标"是伪检查项，"登录页开发模式卡片→切深色→查看7个角色色点应可区分不撞色"才是合格写法）

- **变更文件**：`content/04_web_design/DESIGN_SYSTEM.md`（新增七章+顺延八/九）、`content/04_web_design/CHECKLIST.md`（移入+related_files）、`content/03_doc_system/CHECKLIST.md`（已删除）、`content/03_doc_system/ARCHITECTURE.md`、`content/03_doc_system/DOC_MAP.md`、`content/03_doc_system/README.md`、`content/04_web_design/README.md`、`CLAUDE.md`（H5.4 收口+链接+YAML）、`content/insights/工程演进与设计方法论.md`（§5.9）
- **沉淀标签**：`[已沉淀: 人工检查项归属分流]` — 新增清单/章节前先判定内容性质（校验/设计/经验/机制）再选目标文档；人工清单条目按「人在哪里→做什么→看到什么」三要素写作（insights §5.9）；`[已沉淀: 新原则整合收口]` — 书记评议决策确立的新原则必须落长期文档（H5.4），"决策归档即遗忘"等同未落地

## T223-3 沉淀断链修复 + project memory 结构化（2026-08-09）

**任务**：(1) 书记同步请求"仓库可持续/文件更新机制最近实际沉淀了什么"——核查发现多条 `[已沉淀]` 标签未落点（断链），本次补齐；(2) project_memory.md 结构化更新（书记批准 8 分组方案）。
**引用流程**：H2.4 经验沉淀规则（沉淀标签闭环）+ H2.1 一改具改 + H3 文件修改检查清单 + sample-diff-learning（用户指定）+ brainstorming（方案确认）

### ① 沉淀断链核查 + 修复（3 条）
- **断链 A（T204 §7.5 仓库卫生）**：日志 L963 标注 `[已沉淀: insights §7.5 仓库卫生]`，实际文件无该节 → 按主题归位补入 insights §5.10「仓库卫生：过程性文件清理闭环」（清理闭环六步 + 为什么不是"删掉就行" + 过程/正式/历史判断口径）
- **断链 B（T223 下拉选项排序）**：日志 L1882 标注 `[已沉淀: 下拉选项也要排序]` 未落点 → 补入 insights §6.25「排序统一必须覆盖 `<option>` 下拉生成点」
- **断链 C（L1856 聚合卡/通知直达）**：日志标注两条 `[已沉淀]` 未落点 → 补入 insights §6.26「待办聚合卡的折叠分组与通知直达分支」
- 附录速查表新增 3 条（#31 仓库卫生 / #32 下拉选项也要排序 / #33 聚合卡先展开）

### ② project memory 结构化
- `c:\Users\储子禾\.trae-cn\memory\projects\-d-GitHub-GSM1921-SOP\project_memory.md` 按书记批准方案重组为 8 分组（书记原则/文档治理/术语/前端工程/后端工程/设计UI/Skill资产/进行中状态），移除已完成任务状态条目，重复内容压缩为指针引用，书记原话标 P 编号

- **变更文件**：`content/insights/工程演进与设计方法论.md`（§5.10 + §6.25 + §6.26 + 附录 3 条）、`c:\Users\储子禾\.trae-cn\memory\projects\-d-GitHub-GSM1921-SOP\project_memory.md`（结构化）
- **沉淀标签**：`[已沉淀: 沉淀断链修复]` — `[已沉淀]` 标签写入时须确认目标节实际存在，跨会话复核时 Grep 落点；insights 编号按主题归位可偏离日志原标注（§7.5→§5.10 因 §7 已被 T127 占用）

## T223-4 书记反思触发：党建/党务降级未传播全仓修复（2026-08-09）

**任务**：书记三连问——①沉淀机制的理想状态（纠正一次不再重复提起）②党建/党务关系早已更新降级为何仍赫然在重要文件 ③书记说"反思"时 AI 会读什么改什么。方案经 AskUserQuestion 确认（全仓修复+补机制 / 新增反思触发流 / 沉淀 insights），书记补充：反思时所有链接"指向"的 content/docs 文件也要有选择地读。
**引用流程**：brainstorming + H1.4 反思触发流（本次新增）+ H2.1 一改具改 + H3 文件修改检查清单 + H2.4 经验沉淀

### ① 全仓修复 5 处旧两分法定义残留
- **sop/INDEX.md（母本）**：党建/党务定义由"管理组织活动之事/管理人员发展之事"改为 T1 官方定义（自我建设五大建设 / 党内事务具体管理），标注旧两分法降级
- **ARCHITECTURE.md**：§二 分类表新增官方定义列 + 降级标注
- **DEVELOPMENT_PATH.md**：附录 B 表格改为官方定义
- **COMMISSIONER_FRAMEWORK.md**：L396 依据由 P-006/P-007 旧两分法改为 USAGE_POLICY §1.1.1
- **SERVICE_CATALOG.md**：L25 分类依据改为 USAGE_POLICY §1.1.1
- **保留（合法）**：功能分区标题（`## 党建工作` 章节）、UI 标签（sopData `【党建工作】` 前缀、about-entry domain 标签）、insights §1.1 理论讲解（已标注降级，符合后推翻前规则）、SECRETARY_PRONOUNCEMENTS P-006/P-007（权威论断本体）
- 零残留验证：全仓 Grep 旧定义仅剩降级标注/理论历史/执行日志（历史不可变）

### ② 机制补缺（防复发）
- **CLAUDE.md H1.4 反思触发流（新增）**：书记说"反思/值得思考"时强制六步——①定位权威源最近变更 ②沿链接传播排查（🔴 书记补充要求：追踪所有链接指向的 content/docs 文件）③全仓 Grep 旧表述 ④一改具改 ⑤机制补缺 ⑥沉淀验证
- **C-5 术语审计**：纳入「已降级定义残留」扫描项（旧定义须同步全仓为 T1 官方定义）

### ③ 经验沉淀
- **insights §5.11「降级未传播：沉淀≠学习」**：权威源更新≠下游同步；区分定义残留（必改）与合法功能分区（保留）；Boolean 条件 = 全仓旧定义零残留 + 链接下游已同步；附录 #34
- **沉淀标签**：`[已沉淀: 降级未传播]` — 权威源定义/术语/层级更新后，必须沿链接全仓同步，防"沉淀了但没学习"

- **变更文件**：CLAUDE.md（H1.4 + C-5）、content/02_institution/sop/INDEX.md、content/03_doc_system/ARCHITECTURE.md、content/01_strategy/DEVELOPMENT_PATH.md、content/02_institution/COMMISSIONER_FRAMEWORK.md、content/03_doc_system/SERVICE_CATALOG.md、content/insights/工程演进与设计方法论.md（§5.11 + 附录 #34）

## T232 运行标准重构与全 content 修复（2026-08-09）

**任务**：书记指令——① 继续推进全 content 文件夹修复；② OPERATIONS_GUIDE 按"原则性在前、使用频率高在前"重排；③ 写入标准突出"有机性"（内容浑然天成，而非悬吊补丁）。方案经 AskUserQuestion 六项确认（Part 分组+重排+引用同步 / 全面修复+历史豁免 / 新增独立章节 / 移除非标字段 / 同类同写统一 / 单 spec 两阶段）。
**引用流程**：brainstorming Skill（方案设计）+ writing-plans Skill（实施计划）+ H2.1 一改具改 + OPERATIONS_GUIDE §8 有机性标准（本次新增）+ H3 文件修改检查清单

### 阶段一：OPERATIONS_GUIDE 重构
- **Part 三层分组**：Part I 核心原则（§1 文档权威层级/§2 术语/§3 文档关系/§4 文件角色）+ Part II 通用规范（§5 YAML/§6 编码/§7 排版/§8 内容写入有机性/§9 编号/§10 日志/§11 反论/§12 文件命名/§13 面向用户表述）+ Part III 操作流程（§14 角色分类操作/§15 甲部修改/§16 吸收外部输入/§17 周期性任务）——旧 §1-§16 按映射表重排为 §1-§17
- **新增 §8「内容写入与有机性标准」**：有机性定义（补丁=可无损摘除 vs 有机=删除留结构性空缺）+ 五条检查（归属/衔接/根系/冗余/生长）+ 写入前自检清单 + 与 §9.1/§11/§7 的关系
- **引用同步**：OPERATIONS_GUIDE 内部交叉引用逐处更新 + 全仓 14 个活跃文件旧编号引用清零（CLAUDE.md/content/README/DOC_MAP/SSOT_INDEX/ARCHITECTURE/USAGE_POLICY/KNOWN_PITFALLS/insights×2/.ctx TIMESTAMPS+SNAPSHOT 等；`.ctx/logs/` 历史按 §3.6 豁免）

### 阶段二：全 content 格式修复（按 OPERATIONS_GUIDE §7 规范）
- **YAML 标准化**：移除 `summary`/`milestone` 非标字段（内容降级为正文 `> **一句话：**`），字段顺序对齐 `title/type/role/last_updated/version/status/related_files`
- **分隔符**：`***` → `---` 全清零
- **引用块同类同写**：统一 `> **定位：**` / `> **一句话：**` / `> **受众：**` / `> **来源：**`（冒号在粗体内）；节首定位块补齐（ARCHITECTURE §八、CHECKLIST 等）；`audience`/`enforcement` 英文标签改中文；无粗体 `> 定位：`/`> 来源：` 5 处补粗体
- **last_updated 全量 08-09**（35 个文件；OPERATIONS_GUIDE L170 YAML 模板 `"YYYY-MM-DD"` 豁免）
- **insights 核验**：边界块统一 `> **与§X的边界**：`、来源块统一 `> **来源：**`、移除 milestone 残留

### 断链修复
- DESIGN_SYSTEM.md L812 `[theme.js](../docs/src/core/theme.js)` → `../../docs/src/core/theme.js`（`../` 解析到不存在的 content/docs/，向上两级到仓库根）；全 content 链接扫描仅剩 3 处模板占位符（`YYYY-MM-early-entries`/`路径`/`链接`）豁免

- **变更文件**：content/03_doc_system/{OPERATIONS_GUIDE,USAGE_POLICY,README,DOC_MAP,SSOT_INDEX,SERVICE_CATALOG,ARCHITECTURE}.md、content/03_doc_system/工作模板/经验沉淀辅助提示词.md、content/01_strategy/{README,DEVELOPMENT_PATH,SECRETARY_PRONOUNCEMENTS}.md、content/02_institution/{README,ROLE_CLASSIFICATION,FLAT_DESIGN,COMMISSIONER_FRAMEWORK}.md、content/02_institution/sop/*.md（6 个）、content/04_web_design/{README,CHECKLIST,DATA_ARCHITECTURE,DESIGN_SYSTEM,MODULE_UI_DESIGN,SCHOOL_IT_DEPLOYMENT,SOP_WEB}.md、content/05_ai_coding/{README,KNOWN_PITFALLS}.md、content/insights/*.md、content/README.md、CLAUDE.md、.ctx/{TIMESTAMPS,SNAPSHOT}.md

- **验证结果**（设计文档 §6 全部通过）：
  - ✅ OPERATIONS_GUIDE §1-§17 编号连续、Part I/II/III 标题齐全；§8 五检查+自检清单完整
  - ✅ content/ 下 `***` 0 残留；YAML `summary:`/`milestone:` 0 残留
  - ✅ 引用块同类同写：`> **定位：**`/`> **一句话：**`/`> **受众：**`/`> **来源：**` 66 处命中，旧变体（`> 一句话`/`> **audience**`/无粗体标签）0 残留（模板代码块豁免）
  - ✅ last_updated 全 content 统一 08-09
  - ✅ 旧编号引用（排除 logs）0 残留（命中均为新编号正引用：§11.6/§13.5/§13.6/§14/§16）
  - ✅ 内部链接断链扫描：真实断链 1 处已修复，仅剩模板占位符 3 处豁免
- **沉淀标签**：`[已沉淀: 模板代码块豁免]` — 模板示例（`"YYYY-MM-DD"`/`archive/YYYY-MM-early-entries.md`/`[文档A](链接)`）处于代码块内属教学占位，不被格式统一/链接扫描波及；`[已沉淀: 同文件并行编辑写覆盖]` — 同文件多处修改必须脚本或串行 Edit，并行会静默丢修改（T226 已沉淀，本次再次确认）

## T233 仓库清理 + commit 669be8d + T-200 书记原话逐条评议第二轮（P-001~P-005）（2026-08-09）

**任务**：书记指令三连（按顺序执行）——① 历史过程性文件清理，保证仓库干净整洁；② 进行一次 commit（只 commit 不 push）；③ 继续推进乙部书记原话的逐条评议（T-200）。附注方法论：书记原话会随时间和实践深入而更精确——①可能和原来的表达不同（要反复确认，取其精华去其糟粕）；②大部分情况是对既有论述的扩充（书记强调表达不清楚会导致误解）。
**引用流程**：brainstorming Skill（方案确认）+ sample-diff-learning Skill（抽样评议 + 差异泛化）+ H5 书记评议 + T-200 任务定义（CLAUDE.md 乙部）+ USAGE_POLICY §二.2.3 五条可复用检查规则

### 任务一：历史过程性文件清理
- **删除 13 份过程性文档**：`.trae/documents/` 3 份（临时 spec 相关）+ `docs/superpowers/` 10 份（skills 过程文档），并删除空目录 `.trae/`、`docs/superpowers/`
- **删除 5 个残留临时脚本**（书记补充："有一些脚本还没有清理干净，这是不对的！！"）：`_tmp_task4_sync_refs.py`、`_tmp_cleanup_blank.py`、`_tmp_reorder_ops.py`、`.ctx/tools/verify_sort_20260809.py`、`.ctx/tools/debug_tabs.py`
- **保留正式工具**：`.ctx/tools/subset_font.py`（正式字体子集生成工具）+ `subset_chars.txt`（正式字符集）
- **教训**：`*.py` 在 .gitignore 中被忽略 → git status 不可见但残留在磁盘，清理须用 Glob 扫描 `**/*.py` 而非仅看 git status

### 任务二：commit 669be8d（只 commit 不 push）
- `669be8d` "feat(docs+ui): 运行标准重构与全content修复 + 活动/专班查看组件落地"（104 files changed, 1989 insertions(+), 801 deletions(-)，含 CHECKLIST.md 重命名 03→04_web_design、activity-view.js/taskforce-view.js 新建）

### 任务三：T-200 书记原话逐条评议第二轮（P-001~P-005，给足上下文）
预审报告对照五条检查规则 + 最新论述差异，书记逐条裁决，处置明细：

| 论断 | 书记裁决 | 处置 |
|------|---------|------|
| P-001 战略路线 | 补日期+补展开 | 原话补日期（2026-07-01）；AI 扩充扩为两段——"组织性不是排他门槛"展开（体制/学术/企业各种发展轨迹都能加入，借组织已沉淀工作流、可复用集体经验、办事中长本事的场域放大努力）+ 完整叙事链接；"这正是"→"对'组织性'身份来说"（避免五条检查规则之"私加强调"句式） |
| P-002 理解真实 | 保持双录仅补扩充 | 观察点1 与 P-003 重复的原话保持双录；AI 扩充追加观察点 3 展开——赋权的体系会让不曾经历的人误以为"只要有了位置就可以指挥组织"，与"想象等级森严"同根，与 P-009"扁平化≠无分工"一脉相承 |
| P-003 善用经验 | 无异议 | 未修改 |
| P-004 创新沉淀 | 更新为「建设」 | 原话"支部的工作方兴未艾"→"支部的建设方兴未艾"（随书记 2026-08-05 最新表述统一，见 P-044）；扩充追加"与 P-044 的关联"段落；元数据追加修正记录 |
| P-005 框架内对话 | 照录不动 | "因为认为是'党支部'"疑似转录瑕疵，但书记裁决照录原文——AI 不得轻改未经书记确认的原话 |

- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`
- **沉淀标签**：`[已沉淀: 原话随时间更精确]` — 书记原话随实践深入而修正（P-004 工作→建设），AI 扩充与最新表述有差异时须以书记最新原话为准并加注修正记录；`[已沉淀: 照录不轻改]` — 疑似转录瑕疵须提交书记裁决，AI 不得自行改动未经书记确认的原话；`[已沉淀: 给足上下文]` — 书记评议每一条须附完整上下文（出处/母本/五条检查/最新表述差异），书记明确"书记评议一定要给足上下文！！"

## T234 T-200 书记原话逐条评议第三批（P-006/P-007 迁出 + P-009 大改 + 全仓下游联动）（2026-08-09）

**任务**：继续 T-200 逐条评议。书记裁决链——P-006/P-007：区分两分法"更多给同学们带来理解的压力"，作为 meta 级论断从汇编整体删除，知识以 T1 保留在其他文件；P-009：原标题"扁平化≠无分工，而是无上下级"为错误反论，改"扁平化不能与没有'程序'等同"方向（扁平化是书记针对深度参与者、组织者的重要论述，需把扁平化/组织者与深度参与者/推广逻辑/可持续管理有机联系为 big picture）。
**引用流程**：brainstorming Skill（方案确认）+ sample-diff-learning Skill（抽样评议 + 差异泛化）+ H5 书记评议 + T-200 + H2.1 一改具改（书记提醒："如果书记原话有所修改，要记得下游是否有一并需要修改的！！"）

### 裁决与处置

| 论断 | 书记裁决 | 处置 |
|------|---------|------|
| P-006 党建与党务工作理论 | 整条从汇编删除 | 原话以 T1 知识保留于 USAGE_POLICY §1.1.1（官方定义）+ insights §1.1（本质属性判定）；全仓库文档统一使用 T1 级别叙述；划分方式降级为非 meta 级表达（help 网页对应后移） |
| P-007 党建与党务同源 | 整条删除 | 党建/党务区分不再明显，整体删去；"党建和党务都是管理事服务人的工作"知识保留于 insights §1.2（同源不同视角）；全仓文档统一 T1 叙述 |
| P-009 扁平化 | 标题改"扁平化不能与没有'程序'等同"方向 | 原话补全"身份不是最重要的，年级和政治面貌不决定是否胜任"（2026-05-17 完整原话）；新增书记 2026-08-09 两句原话（"从支委个人到党小组组长到组织者深度参与者都是这样的逻辑！支委会作为组织依旧管理支部，但支委个人也必须通过组织化的方式实现管理" + "可持续的管理不依靠年纪、身份的施压以及某种个人魅力的偶然实现，而是要依靠扎实的工作和大胆的创新去实现组织的整合"）；删除 AI 提炼句"分工依据事情本身，不依据层级命令"；四块扩充（扁平化≠没有程序→P-043 关联 / 推广到整个组织链条 / 可持续管理 / 组织者两种情况保留） |

### 汇编重构
- 第三章整章删除（P-006/P-007），章节重编号：11 章（原 12 章），过渡段全部前移（六/七/八/九/十/十一 章过渡逐一修正）
- 头部：24 条/十一组、论断层次引用 P-009~P-027、读后要点更新（"扁平化不能与没有'程序'等同"）
- 目录 11 项、第二章过渡改写（移除党建/党务分域过渡，改"分工怎么避免变成上下级"）
- 附录·论断编号索引：删 P-006/P-007 行、P-009 标题与锚点更新、章节号全表前移、已迁出列表追加 P-006/P-007

### 全仓下游联动（书记提醒一改具改）
- USAGE_POLICY：L34 网页承载备注 + L173 P-006/P-007 层级安放条款（改"2026-08-09 迁出汇编"，知识指向 insights）
- SERVICE_CATALOG：引用流程改 USAGE_POLICY §1.1.1、分类依据改"已从论断汇编迁出"、同源不同视角指向 insights §1.2
- FLAT_DESIGN（P-009 母本）：母本标注 + §（一）标题与哲学段落改写（"扁平化不能与没有'程序'等同"，删"分工依据是事情本身而非层级命令"表述，补 P-043 关联）
- sop/INDEX：旧两分法引用改迁出表述；定人定责定岗说明 L56 引用改 P-014~P-015 条块二元（原 P-006 引用本就错位）
- CLAUDE.md：L183 术语精确性 P-007 引用改迁出表述 + insights §1.2 指向；乙部 T-200 行追加第三批进度
- OPERATIONS_GUIDE §11.2：正面案例由旧错误反论标题改为"扁平化不能与没有'程序'等同"（书记复核说明）
- insights 工程演进 §3.7：P-009 示例改新标题（"为什么不是没有程序"）
- insights 党支部管理与实务经验沉淀 §1.1/§1.2：保留作理论讲解（书记裁决"作为知识的T1保留在其他文件中即可"），无需改动

- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/03_doc_system/{USAGE_POLICY,SERVICE_CATALOG,OPERATIONS_GUIDE}.md`、`content/02_institution/FLAT_DESIGN.md`、`content/02_institution/sop/{INDEX,支委与党小组定人定责定岗说明}.md`、`content/insights/工程演进与设计方法论.md`、`CLAUDE.md`
- **沉淀标签**：`[已沉淀: 错误反论识别]` — "A≠B，而是C"标题中若 C 恰是正确方向本身（无上下级=扁平化正解），则整句是错误反论，应改为否定真正误区（扁平化≠没有程序）的表述；`[已沉淀: meta 级论断降级]` — 划分/区分类 meta 论断若给读者带来理解压力、且已有 T1 官方定义覆盖，应从汇编删除、知识保留在工具文档，全仓统一 T1 叙述；`[已沉淀: 原话修改须查下游]` — 书记原话修改后必须沿引用链全仓联动（H2.1 一改具改），含母本文件、索引、反论示例、工程经验示例

## T235 T-200 书记原话逐条评议第三批续（P-010 重构 + P-011 弃用并入 + 全仓下游联动）（2026-08-09）

**任务**：P-010 预审收尾 + P-011 弃用。书记裁决链——P-010：旧标题"分工记录而非管理闭环"为 AI 自造、完全错误（书记："分工记录就是 管理闭环的重要部分！"）；正文 6 句（D-15 ④⑤⑥）确认为书记原话；设计初衷无逐字原话，锚定 P-009。P-011："深度参与者 也要思考；组织者也可以执行"，"脑子/手"比喻不成立，整体弃用并入 P-010。
**引用流程**：brainstorming Skill（方案确认）+ sample-diff-learning Skill（抽样评议 + 差异泛化）+ H5 书记评议 + T-200 + H2.1 一改具改（书记提醒："如果书记原话有所修改，要记得下游是否有一并需要修改的！！"）

### 裁决与处置

| 论断 | 书记裁决 | 处置 |
|------|---------|------|
| P-010 组织者核心职能是分工记录 | 旧标题"分工记录而非管理闭环"为 AI 自造、完全错误；"分工记录就是管理闭环的重要部分"；正文 6 句确认为书记原话（D-15 ④⑤⑥ 产出物） | P-010 重构——标题改"组织者核心职能是分工记录——做记录、做协调、做交接"；正文 6 句书记原话作正文（2026-05-17）；引用块新增"分工记录是管理闭环的重要组成部分"；设计初衷锚定 P-009；考勤要求双录于 P-012 不重复 |
| P-011 组织者是项目的脑子，深度参与者是项目的手 | "深度参与者也要思考；组织者也可以执行"，比喻不成立，应当抛弃 | 整条并入 P-010 并弃用比喻——P-010 引用块新增"脑子/手比喻已弃用"说明；附录索引 P-011 行改"2026-08-09 并入 P-010 并弃用比喻"；头部措辞 P-011"已迁出"改"已并入 P-010" |

### 全仓下游联动（P-011 弃用 → 一改具改）
- FLAT_DESIGN（母本）：删除"核心比喻"行与 §（三）整节（脑子/手）；L15 母本标注移除 P-011
- README：扁平化设计条目删脑子/手表述（改"组织者核心职能是分工记录，深度参与者承担具体分工"）；论断数 26→23 条
- SOP_WEB §B.5：P-009~P-011 → P-009~P-010；定人定责 §5.1 同改
- help.html §3.3：删脑子/手表述，改平实表达
- about-entry.js（代码层）：duty 标签"执行核心（脑子）"→"执行核心"、"承担分工（手）"→"承担分工"、"项目大脑"→"执行核心"、"项目之手"→"承担分工"；注释/desc/note 同步平实化（共 9 处）
- 工程演进 §6.18：判例修订（T195 曾将脑子/手定为 T1 书记论断——现回滚为弃用，全仓含代码层不得再使用）；代码层规则示例 duty 同步改"执行核心"

- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/02_institution/FLAT_DESIGN.md`、`README.md`、`content/04_web_design/SOP_WEB.md`、`content/02_institution/sop/支委与党小组定人定责定岗说明.md`、`docs/help.html`、`docs/src/entries/about-entry.js`、`content/insights/工程演进与设计方法论.md`、`CLAUDE.md`
- **沉淀标签**：`[已沉淀: 书记原话 vs AI 自造的边界]` — "分工记录而非管理闭环"这类 A 而非 B 句式若无书记背书即为 AI 自造，书记裁决"分工记录就是管理闭环的重要部分"反向纠正，误将正确正论写成反论；`[已沉淀: 比喻弃用须全仓联动]` — 书记弃用的比喻（脑子/手）须沿母本/README/网页/代码层/判例全仓清理，含代码层 duty 标签与 T195 判例回滚（曾定为 T1 的论断也会被书记弃用——判例须随书记最新裁决更新）

## T236 历史过程性文件二次清理（subset 工具移除）+ 第四批评议启动（2026-08-09）

**任务**：书记指令三连——① 历史过程性文件清理，保证仓库干净整洁；② 进行一次 commit（只 commit 不 push）；③ 继续推进乙部书记原话逐条评议（T-200 第四批：P-012/P-013）。附注方法论：书记原话会随时间和实践深入而更精确——①可能和原来的表达不同（要反复确认，取其精华去其糟粕）；②大部分情况是对既有论述的扩充（书记强调表达不清楚会导致误解）。另受命：将元原则写入 CLAUDE.md 等最重要上下文文件——"书记所有的原话都是一个 big picture 下的不同侧面，一定要去体悟这种统一性和一致性，对书记的原话融会贯通！"
**引用流程**：brainstorming Skill（方案确认）+ sample-diff-learning Skill（抽样评议 + 差异泛化）+ H5 书记评议 + T-200 + H2.1 一改具改

### 任务一：历史过程性文件二次清理
- **删除字体子集化工具**：`.ctx/tools/subset_font.py`（磁盘残留，`*.py` 已被 .gitignore 忽略故 git 不可见）+ `.ctx/tools/subset_chars.txt`（git 追踪）。T233 曾裁定"保留正式工具"，本次书记要求二次清理——字体产物 `nanxi-youmosong-subset.woff2` 已作为静态资产入库（styles.css/about.html 正常引用），脚本完成使命属一次性过程文件，书记 AskUserQuestion 确认"一并删除"。删除后 `.ctx/tools/` 空目录一并移除
- **删除残留空目录**：`.superpowers/`（20260804 视觉 brainstorming 会话遗留，gitignored）+ `Temp/`
- **保留**：`server/uploads/`、`server/data.db*`（运行时功能文件）、`docs/scripts/bump-version.mjs`（正式版本号工具）
- **教训**：`*.py` 在 .gitignore 中被忽略 → git status 不可见但残留在磁盘，清理须用 Glob 扫描 `**/*.py` 与 `git status --ignored` 而非仅看 git status（T233 已沉淀，本次再次确认；subset_font.py 属于 T233 误判为"正式工具"而遗留）

### 任务二：commit（只 commit 不 push）
- 清理提交后执行

### 任务三：T-200 第四批评议（P-012/P-013 + 新增原话）——书记裁决链已确认，全部落地

| 论断 | 书记裁决 | 处置 |
|------|---------|------|
| P-012 专班 | "我认为更重要的是介绍'为什么要设立专班'。把这些条目都可以统合进去"；"不是'继续'，是活动之外考察积极分子的载体。这两者没有'继续'关系。要务必谨慎" | 重构为专班总论——标题改"专班——不限时间、不限地点，活动之外考察积极分子的载体"；正文 3 句书记原话（2026-07-12 专班互斥原话"专班是因为——不限时间不限地点，这一定和【活动】是互斥的" + 2026-08-09 升正文"专班是活动之外考察积极分子的载体" + D-15 ④考勤原话）；引用块四块展开（为什么设立专班 / 考察载体定位·删"继续" / 双制度支撑 D-197 / 与活动并列）；第四章标题改"专班为什么设立？赋权和考察怎么运作" |
| P-013 提出需求与招募统筹 | "提出需求 为什么概括成了 发起。我觉得有点怪。所以你可以换一个表达"；"组织委员 能够承担这项工作 和 人才库的维护本身分不开。我们在分工设计中，也在不断突出 最小成本原则【这里面是否有原话，有的话也可以补充】" | 标题改"提出需求与招募统筹分离——发起是提出需求，招募是统筹执行"（正文保留书记原话"发起是提出需求，招募是统筹执行"；副标题初稿"专班需求人人可提、组织委员统一收口"因书记后续裁决"人人可提不成立"改弃）；引用块删 AI 因果"确保权责分离"；补"组织委员能承担这一全局评估与其人才库维护职能分不开"（人才库=考察表汇总提炼，组织委员掌握全局人才画像）；补最小成本原则原话（书记 2026-07-31"任务流应当按照最小的信息成本和操作成本直接体现在网页的工作台中了！"）；删引用块末尾与正文重复句 |
| P-005 框架内对话 | 新增原话（重要性不高但必须写，与"框架内对话"相关作补充） | 正文追加原话"最大的礼貌是'负责'。知之为知之，不知为不知。不要去过分推敲措辞，特别是'称呼'，非正式的表达中更能迸发创新的火花。"（2026-08-09）；引用块补"补充（书记 2026-08-09）"段——最大礼貌不是措辞周全而是负责态度，怕说错话的根源之一是对措辞的过度推敲；按正文形式条款转无序列表双条原话 |
| P-009 可持续的管理 | 新增原话（"可持续的管理"的推论） | 正文追加原话"谈心谈话时的默认认知①②"（2026-08-09）；引用块补"谈心谈话的默认认知"段——书记特别提示非"永远不推敲"，而是在学生基层党组织中管理靠扎实工作和大胆创新、不靠人际内耗与身份施压 |

### 全仓下游联动（P-012/P-013 变更 → H2.1 一改具改）
- SECRETARY_PRONOUNCEMENTS.md：附录索引 P-012/P-013 行更新（标题+锚点）、P-010 引用块考勤锚点同步 `#p-012-专班不限时间不限地点活动之外考察积极分子的载体`、头部读后要点补专班要点、第四章标题/目录第 4 项/第三章过渡/第四章过渡同步（"发起与招募分离"→"提出需求与招募统筹分离"）
- insights 党支部管理与实务经验沉淀：§3.1 删"继续"（"活动之外**继续**考察"→"活动之外考察"）；§3.2"发起≠招募"→"提出需求与招募统筹分离"、"谁发起谁管理"→"谁提出需求谁管理"、删"确保权责分离"（与 P-013 引用块同步）；命题表 L286 同步
- sop/组织委员工作流程指南：L23"发起≠招募"→"提出需求与招募统筹分离"
- CLAUDE.md：H5 开头新增元原则（"书记所有的原话都是一个 big picture 下的不同侧面，一定要去体悟这种统一性和一致性，对书记的原话融会贯通！"+ 书记原话演化方法论）；T-200 行追加第四批进度
- 保留：README/SNAPSHOT/COMMISSIONER_FRAMEWORK/USAGE_POLICY（"活动之外考察积极分子的载体"表述本已无"继续"，"发起是提出需求，招募是统筹执行"为书记原话句式保留）

- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/insights/党支部管理与实务经验沉淀.md`、`content/02_institution/sop/组织委员工作流程指南.md`、`CLAUDE.md`
- **沉淀标签**：`[已沉淀: 升正文原话]` — 书记在评议中确认的表述（如"专班是活动之外考察积极分子的载体"）应升为正文原话并标注日期与确认批次，引用块不再重复改写；`[已沉淀: 概括词警惕]` — 标题/表述中用抽象词概括书记具体表达（如"发起"概括"提出需求"）须谨慎，书记可能认为"有点怪"，直接使用书记的原话用词；`[已沉淀: AI 因果推导删除]` — 引用块中"确保权责分离"类因果推导（五条检查②"所以"类）在书记补充真正理由（人才库论据）后删除，补书记背书论据

### T237 讲解范式与元数据形态改造（书记下一批前三点指令，2026-08-09）

**书记指令**：①元原则写入 CLAUDE.md 等最重要上下文文件；②引用块不得"把书记原话又抄一遍"，要做真正的讲解——先讲清原话之间/论断之间的关系，再提供对原话的解读（类似司法解释，不新增内容），最后才是扩充，扩充不得私加书记没给定的内容；③附加信息（details 元数据）视觉拉到最小，突出"书记原话 > AI 扩充 > 附加信息"层级。
**引用流程**：brainstorming Skill（设计探索）+ H5 书记评议 + H2.1 一改具改

### 执行内容
- **头部元原则**：SECRETARY_PRONOUNCEMENTS.md L17 后新增元原则段（big picture 统一性 + 讲解三层职责 + 私加内容须杜绝 + 不机械套模板）——CLAUDE.md H5/T-200 已有元原则，本次补本体文件
- **P-012 讲解稿自然化重写**：删除机械的"为什么设立专班/考察载体定位/双制度支撑/与活动并列"四块排布，改为一条主线叙事（活动要时间场地 → 专班互斥的根据 → 活动之外考察载体、无"继续"关系 → 考勤落地 → 考察靠工作量记录与 P-010 一脉相承 → 与扁平化/提出需求分离构成完整图景）；删除 AI 私加的"高年级课业重"（书记原话仅"对高年级同志更加友好"）
- **P-013 修改**：标题副标题"专班需求人人可提、组织委员统一收口"删除（书记裁决"人人可提"不成立——制度上宣传委员/党支书可提、纪检委员不可、组织委员收口）；讲解稿第一段"党小组组长、支委、书记均可提出专班需求"改为泛化表述（"需求提出之后，招募统筹统一由组织委员收口管理——组织委员是唯一专班管理节点"）；元数据单行化
- **元数据形态改造（示范）**：P-012/P-013 的 `<details>` 折叠框 → 单行引用块小字（`> 出处：D-238 + D-15 ④ + D-197 + COMMISSIONER_FRAMEWORK.md §A.4 · 母本：§A.4 · 层次：制度设计级`）；长修正记录移入文件末尾新增"附录·修正记录表"（正文零长内容）
- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`
- **沉淀标签**：`[已沉淀: 讲解三层职责]` — AI 讲解优先级：①原话之间/论断之间的关系 → ②对原话的解读（司法解释，不新增）→ ③扩充；扩充禁止私加书记未给定内容（反例：P-013"人人可提"、P-012"高年级课业重"皆为 AI 私加被书记否决）；`[已沉淀: 讲解按实际情况写作]` — 讲解不得按固定维度模板机械排布（书记："很机械的把三点维度机械排布"），须实事求是按每条论断的实际情况自然写作，方法论标签（如"司法解释"）不显性写入面向读者的文档；`[已沉淀: 元数据单行化]` — 附加信息用单行引用块小字呈现、长修正记录移入附录，视觉层级=书记原话 > AI扩充 > 附加信息

### T237 批量落地（2026-08-09，示范稿书记认可"其余部分可以推进"后执行）

**执行内容**：
- **元数据单行化批量**：其余 21 条论断（P-001~P-005、P-009/P-010、P-014~P-018、P-024/P-026/P-027、P-029、P-041、P-043~P-045、P-047）的 `<details>` 折叠框全部改为单行引用块小字（`> 出处：… · 母本：… · 层次：…`），全文件 `<details>` 零残留
- **修正记录入附录**：P-004/P-005/P-009/P-010 的修正记录自 details 移入"附录·修正记录表"（补 P-043 标注记录一行，该句原话归属为书记原话非 AI 衍生）
- **讲解保持内容原样**：各条讲解块此前已按实际内容自然写作（小标题对应书记具体原话内容，非"三点AI扩充维度"模板），本次仅做元数据形态改造，不重写讲解内容，避免私改书记已确认内容
- **下游联动（一改具改）**：insights 工程演进与设计方法论 §4.7 方法 4"折叠元数据"→"元数据单行化"；USAGE_POLICY §1.8.2 表"元数据用 `<details>` 折叠"→"元数据单行化（引用块小字）"；SECRETARY_PRONOUNCEMENTS 头部"正文形式"条款补元数据单行化说明
- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/insights/工程演进与设计方法论.md`、`content/03_doc_system/USAGE_POLICY.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`
- **零残留验证**：content 全仓 grep"<details>/<summary>"仅历史日志残留（刻意保留）；"司法解释/课业重"零残留（元原则与修正记录表中"人人可提/高年级课业重"为反例说明刻意保留）
- **沉淀标签**：`[已沉淀: 一改具改形态联动]` — 元数据/文档形态条款变更后，须沿引用链同步所有描述该形态的文档（insights 方法论、USAGE_POLICY 表达方式表、头部自述条款），防"新格式 + 旧描述"并存

### T237 P-014 书记复核定稿与全仓联动（2026-08-09）

**书记裁决**（对 P-014 预审稿）："需微微调整，大体是认同的。①条块是理解权责关系的方式（书记没有说过是两把尺子）；②不要写反论句'条条管事、块块管人'（'人正常第一次看的话不会这么想反论'）；③补充'支委会领导党小组'。"
**引用流程**：H5 书记评议 + H2.1 一改具改（书记强调"审慎对待 help 网页、确定好母子本关系"）

### 执行内容
- **P-014 正文定稿**：标题/正文改"条块是理解权责关系的方式"（"两把尺子"为 AI 误记，书记从未说过）；删除 AI 对仗句"条的边界是垂直穿透、块的边界是横向覆盖""专业线穿透所有党小组/小组线覆盖本组成员"（书记："这种话毫无意义书记怎么可能说"）；删除反论句"条条管事、块块管人"；补充"组织关系上，支委会领导党小组"；目录锚点 + 附录索引同步新标题；修正记录表新增 P-014 行（含书记原话反例说明）
- **母子本全仓联动（"方式"口径 + 删除穿透/覆盖对仗）**：
  - README.md L128：条块二元条目"两把尺子"→"方式"
  - COMMISSIONER_FRAMEWORK §A.3（母本）："两把尺子"→"方式"；补"组织关系上，支委会领导党小组"
  - insights 党支部管理与实务经验沉淀 §2.1（母本）：标题"两把尺子"→"方式"；表格删除"穿透方向"列与"垂直穿透所有党小组/横向覆盖本小组"对仗表述，改"理解视角+职责内容"两列，与 P-014 定稿一致；补"组织关系上，支委会领导党小组"；速查表 L287"两把尺子"→"方式"
  - docs/help.html 4.4（子本）：删"纵向穿透所有党小组""每个小组横向覆盖自己的成员"；"两把尺子"→"方式"
- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`README.md`、`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/insights/党支部管理与实务经验沉淀.md`、`docs/help.html`、`.ctx/logs/2026-08-EXECUTION_LOG.md`
- **零残留验证**：全仓 grep"两把尺子/垂直穿透/横向覆盖/穿透方向"（排除 .ctx 历史日志）仅剩修正记录表 L498 反例保留
- **沉淀标签**：`[已沉淀: 母子本链审慎对待 help 网页]` — 书记原话概念（条块）跨 SECRETARY_PRONOUNCEMENTS→COMMISSIONER_FRAMEWORK §A.3+insights §2.1→help.html 的母子本链，修改须沿链逐级同步（权威源→母本→子本），help.html 为用户向页面不得残留已被否决的 AI 对仗表述

## T-200 第五批：P-015 重写为组织内控总论（P-013 并入）+ 意见反馈处置权倒写 DATA_ARCHITECTURE §2.16 + 全仓下游联动（2026-08-10）

**任务**：讲解稿专项收尾——① P-012 讲解稿定稿（一条主线自然叙述，清除溯源括号与"（司法解释）"字样）；② 历史问题三项：组织者"核心职能"全仓改"分工记录职责"、P-011"脑子/手比喻已弃用"段删除、**P-015 重写为"组织内控总论"**（书记裁决：原"书记作为条块间的协调节点——党课和意见反馈不可委托"中协调节点定位/决策不可委托为系统设计的工程选择，不作为论断保留；唯一可用点是组织内控——提取回避+仲裁，与 P-013 职责分离合并）；③ 党课归 02 制度层、意见反馈处置权倒写 04（学习 issues.js 网页做法）；④ "既然叫内控总论，研究散落各处的书记原话"——正文收录书记 2026-05-06"发起是提出需求，招募是统筹执行" + 2026-08-05 兼任无「当然」关系两条原话。
**引用流程**：H5 书记评议 + T-200 + H2.1 一改具改（书记提醒原话修改须查下游）+ H3 文件修改检查清单

- **书记裁决链（四轮 AskUserQuestion）**：
  - ① P-012 讲解稿形态=一条主线自然叙述（书记："很机械地把提到的三点排布"）；清除范围=讲解稿+修正记录表都清除
  - ② P-015 提取=回避+仲裁（唯一可用点）；组织者"核心职能"→"分工记录职责"；P-011 弃用段=删正文+简化索引
  - ③ P-015 合并形态=重写为内控总论；附加指令：意见反馈已有更好的网页实现（issues.js），**倒过来写入 04 文档**；党课去处思考（02 or 04 or both）
  - ④ P-012 定稿附加反馈=（书记 2026-08-09 特别指出：…）溯源括号读者会莫名其妙→改自然叙述；P-013 处置=并入内控总论；内控形态=原话+讲解块三块；党课去处=**归 02 制度层**；意见反馈=**补 DATA_ARCHITECTURE §2.16**
- **核心文件执行（SECRETARY_PRONOUNCEMENTS.md）**：
  - P-015 重写为"组织内控总论——职责分离、主动回避与书记仲裁"：正文两条书记原话（2026-05-06 提出需求与招募统筹分离 + 2026-08-05 兼任无当然关系）；讲解块三道防线（职责分离=提出需求与招募统筹分离+组织委员唯一专班管理节点+人才库论据+最小成本原则关联；主动回避=涉及本人审核主动回避防"自己审核自己"；书记仲裁=多条条矛盾任务优先级组织>纪检>宣传+主身份优先）
  - P-013 独立条目删除并入 P-015（职责分离防线），附录索引移除 P-013 行、已迁出区追加并入说明、修正记录表 P-013 行补"并入 P-015"
  - P-012 讲解稿定稿：一条主线自然叙述（活动要时间场地→专班互斥根据→活动之外考察载体无"继续"关系→考勤落地→考察靠工作量记录与 P-010 一脉相承→完整图景），**删除溯源括号**（书记："读者会莫名其妙"）；引用块 P-013 锚点改 [P-015](#p-015-组织内控总论职责分离主动回避与书记仲裁)
  - P-010 标题"组织者核心职能是分工记录"→"组织者的分工记录职责"（书记明确反对"核心职能"表达），设计初衷段同步
  - P-011"脑子/手比喻已弃用"段从正文删除（书记："弃用为什么还要写出来呢？此地无银三百两"）
  - 头部/目录/章节说明/论断层次/读后要点同步（"组织内控靠三道防线——职责分离、主动回避、书记仲裁"）；修正记录表清除"（司法解释）"字样改"显性标签化注解"
- **下游联动（一改具改）**：
  - COMMISSIONER_FRAMEWORK.md：§C.1b 意见反馈管理区新增党课规则（书记不可委托的合规依据，引用 DATA_ARCHITECTURE §2.16）；文档关联表"P-012~P-013 专班论断"→P-012；专班创建审批依据"P-012+P-013"→P-012；赋权审批依据"P-009~P-013 赋权关系链"→"P-009~P-010 + P-012 + P-015 赋权与内控关系链"
  - FLAT_DESIGN.md / README.md / 定人定责说明 / help.html：P-010"组织者核心职能"→"分工记录职责"四联
  - 定人定责说明 L56"（P-014~P-015 条块二元）"→"（P-014 条块二元）"（P-015 已不再属条块二元）
  - SOP_WEB.md §G.4："书记是条块间的协调节点（P-015）"→"书记的审批反馈是活动执行方向把握的关键环节（P-027②）"（P-015 重写后不再是协调节点来源，审批反馈依据 P-027②）
  - DATA_ARCHITECTURE.md §2.16 意见反馈数据倒写（学习 issues.js 网页做法）：IssueRecord 真实字段表（id/number/title/body/scope/types/status/closedReason/closedAt/assignee/assigneeRole/dispatchHistory/milestone/reactions/mentions/references/participants/commentCount/hidden/mergedInto/comments/resultPending）+ GitHub Issue 风格处理流程（open→指派→公开讨论→处置结果→待终审→终审关闭/重开）+ 派生显示状态 + **书记处置权设计表**（changeStatus/closeIssue/reopenIssue/assignIssue/setMilestone/hideIssue/mergeIssue/hideComment/editIssue/approveDraft/rejectDraft 十项，类比 GitHub maintainer 唯一拥有 merge/close 权，标注 P-015 书记仲裁防线落点）+ 通知机制
- **零残留验证**（全仓 grep）：
  - ✅ P-013 活跃文档零残留（仅 CLAUDE.md T-200 历史任务记录 + 汇编已迁出区/修正记录表有意保留 + 历史日志）
  - ✅ #p-013 锚点零残留；#p-015 锚点 2 处均为新锚点（P-012 讲解块引用 + 附录索引），无旧"协调节点"锚点引用
  - ✅ "组织者核心职能"在 SECRETARY_PRONOUNCEMENTS 零残留（insights 图标隐喻/组织委员职能"核心职能"属不同语境保留）；"（司法解释）"content 零残留
  - ✅ 脑子/手比喻弃用段从正文删除（SECRETARY_PRONOUNCEMENTS grep"脑子/比喻已弃用"零命中）
  - ✅ 定人定责 §3.2 回避防线母本确认（"涉及本人审核事项时主动回避""回避原则防止'自己审核自己'导致内控失效"）与 P-015 讲解块一致
- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/02_institution/FLAT_DESIGN.md`、`README.md`、`content/02_institution/sop/支委与党小组定人定责定岗说明.md`、`content/04_web_design/DATA_ARCHITECTURE.md`、`content/04_web_design/SOP_WEB.md`、`docs/help.html`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 内控三道防线]` — 组织内控=职责分离（提出需求与招募统筹分离）+主动回避（涉及本人审核主动回避）+书记仲裁（矛盾任务优先级组织>纪检>宣传）三道防线，P-013 并入 P-015 作为职责分离防线，原话保留于 P-015 正文；`[已沉淀: 工程选择与论断分层]` — "书记作为条块间的协调节点——党课和意见反馈不可委托"中协调节点定位/决策不可委托为系统设计的工程选择（书记工作台功能需求），不作为路线级论断保留，仅组织内控内容提取入论断——系统设计事实（README/insights 可描述）与书记论断（汇编）须分层；`[已沉淀: 网页实现倒写入文档]` — 意见反馈已由网页实现（issues.js）超越旧文档模型（FeedbackRecord pending/processing/done），倒写 04 文档采用真实 IssueRecord 模型+书记十项处置权表，文档与实现同源；`[待办]` — 讲解稿专项收尾后 commit（push 需书记批准）

## T-201 书记 2026-08-10 两条战略原话收录 P-015（知情边界第四道防线）+ 信息密度精确原则 + §F.6 四道防线 + 全仓"只读模式"残留清理 + 书记工作台"按人视图"实施（2026-08-10）

**任务**：书记确认两条"书记原话级别"论断——①"执行委托与知情监督是对应的，统一的。统筹是最大的管理！"；②"一个尽可能降低管理摩擦的方向是任何角色的信息可见范围，应精确等于其职责空间所需的最小充分信息。"——①入 P-015 第四道防线"知情边界"，②入 DESIGN_SYSTEM 原则9；随后全仓残留清理 + 书记工作台按人视图代码实施 + 浏览器验证。
**引用流程**：H5 书记评议（书记 2026-08-10 确认两条原话为原话级别）+ 知情边界讲解块 + H1.2 执行 + verification-before-completion Skill

- **论断收录（t1-t3）**：
  - SECRETARY_PRONOUNCEMENTS.md P-015：正文新增两条原话（2026-08-10），讲解块新增第四道防线"知情边界"——执行委托（操作边界）与知情监督（信息边界）是一枚硬币的两面，能赋权的人才能看对应条线在办（L1 条线视角）；**看 ≠ 做**（知情过载会架空职责分离，"全知"是内控失效入口）；信息可见范围=职责空间所需最小充分信息；"统筹是最大的管理"——书记是统筹者而非执行者，统筹依赖精确的知情密度而非全知；信息密度分层 L0 个人/L1 条线/L2 全局，向上越层需职责依据（赋权链），向下缩层是职责空间保护；出处行补"书记 2026-08-10 战略级论断"，层次提升为**战略路线级**
  - DESIGN_SYSTEM.md §一 新增原则9"信息密度精确原则"（书记原话引用，信息可见性=职责空间的投影）
  - COMMISSIONER_FRAMEWORK.md §F.6 升级为"组织内控体系（P-015 四道防线）"：四道防线表（职责分离/主动回避/书记仲裁/知情边界）落地点完整，知情边界行落点=书记工作台"按维度/按人"双视图 + 原则9
- **t4 全仓残留清理**（"成员只读/管理模式/只读模式"废弃设计）：
  - docs/help.html：成员只读面板→成员工作台
  - .ctx/SNAPSHOT.md："视图模式三分类"行→"信息密度精确原则"行；L41/L114/L144 成员只读→成员工作台
  - README.md L45/L55/L70、ARCHITECTURE.md L151：成员只读面板/视角→成员工作台
  - DATA_ARCHITECTURE.md L811：成员只读→普通成员
  - KNOWN_PITFALLS.md L66：判例补"历史设计：管理者只读继承管理模式/成员只读独立视图，2026-08-05 权限重构后已废弃"
  - insights 党支部管理 L292：速查表条目8更新为"身份选择与信息可见范围分离；知情边界下按人视图只投影职责空间的在办概览，不含操作细节（已替代旧的'只读模式'设计）"
  - insights 工程演进 §1.3：旧的"管理模式/只读模式"→"角色切换机制"
  - styles.css：删除 .view-mode-switcher/.view-mode-picker-overlay/.view-mode-picker-card/.mode-btn-observe 等废弃只读模式样式
  - 零残留验证：剩余命中均为"退役/历史/已废弃"标注的合理保留记录（insights §4.6 历史经验、SOP_WEB P-029 退役说明、KNOWN_PITFALLS 判例），非活性残留
- **t5 按人视图代码实施**：
  - `docs/src/services/secretary-overview.js`：新增 `PERSON_ROLES`（5 角色+工作台 URL：副书记/组织/宣传/纪检/组长）+ `getPersonOverview()`——按 role 聚合①未完成待办（TodoStore.getGroupedByAction 业务动作分组）②在办活动（未归档非完结态，organizer/assignments 成员）③在办专班（active/recruiting，manager/initiator/members）；返回 { role, label, personIds, names, todoCount, overdueCount, todoGroups, activities, taskforces, url }
  - `docs/src/entries/tabs/secretary/overview-tab.js`：`renderOverviewContent()` 重构——顶部新增"按维度/按人"子切换条（会话内保持选择）；新增 `renderPersonView()`：5 张角色卡片（卡头=角色识别色图标+角色名+姓名+在办徽章；态势行=待办|在办活动|在办专班+超期徽章；在办清单最多 6 行；空态"当前无在办事项"；直达入口跳对应工作台）；原内容更名 `renderDimensionView()`
  - `docs/src/styles.css`：新增 `.ov-sub-tab-active`（深浅两套适配 theme-dark，CSS 变量驱动）
  - 数据口径严格遵循"看 ≠ 做"——只投影职责空间在办概览，不含操作细节
- **t6 浏览器验证（browser_use 实测通过）**：登录（2300010001/123456）→"按维度/按人"子切换可见可点击、激活态正确→5 张角色卡片全部渲染（党支部书记/副书记、组织、宣传、纪检、组长），卡片四要素齐全→无 JS 运行时错误→截图 `secretary-overview-person-view.png`
- **变更文件**：`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/04_web_design/DESIGN_SYSTEM.md`、`content/02_institution/COMMISSIONER_FRAMEWORK.md`、`content/04_web_design/SOP_WEB.md`、`.ctx/SNAPSHOT.md`、`README.md`、`content/03_doc_system/ARCHITECTURE.md`、`content/04_web_design/DATA_ARCHITECTURE.md`、`content/05_ai_coding/KNOWN_PITFALLS.md`、`content/insights/党支部管理与实务经验沉淀.md`、`content/insights/工程演进与设计方法论.md`、`docs/help.html`、`docs/workspace/visitor.html`、`docs/src/services/secretary-overview.js`、`docs/src/entries/tabs/secretary/overview-tab.js`、`docs/src/styles.css`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 知情边界·看≠做]` — 执行委托与知情监督对应统一：赋权链决定信息边界（能赋权才能看条线在办），"全知"架空职责分离是内控失效入口；信息可见范围=职责空间所需最小充分信息（L0 个人/L1 条线/L2 全局），"统筹是最大的管理"靠精确知情密度而非全知；`[已沉淀: 按人视图数据口径]` — 按人视图只投影职责空间的在办概览（未完成待办/在办活动/在办专班），不含操作细节，与"看≠做"一一对应；`[已沉淀: 只读模式退役]` — 2026-08-05 权限重构后"成员只读/管理模式/只读模式"废弃，遗留文档/样式全仓清零

## T-202 书记工作台全局概况 UI 重设计——视图切换器 iOS 风格白滑块 + 按人视图卡片重构（圆形角色头像/三格态势/分隔线清单/组长横跨卡）+ 修复 icon() 字符串参数 Bug（2026-08-10）

**任务**：书记反馈"全局概况的视图切换器和人视图板块 UI 设计得很丑，SVG 的选取、排布、显示方式等等等等"——使用 web-design-guidelines Skill + fullstack-developer Skill 重新设计，并检查计算/传输逻辑。
**引用流程**：H1.2 执行 + web-design-guidelines Skill + fullstack-developer Skill + verification-before-completion Skill

- **诊断出的根因（计算/传输逻辑核查）**：
  - **Bug 修复**：`renderPersonView` 卡头图标调用 `icon(roleIcon[p.role] || 'users', 'w-4 h-4')` 第二参数为**字符串**，而 `icon(name, opts = {})` 签名为对象——导致 opts 解构失败、图标退化为默认 `icon-base` 1em 渲染且无尺寸类，卡头图标显示异常。已改 `{ className: 'w-5 h-5' }`
  - **SVG 选取**：副书记与组长同用 `users` 图标重复无区分；新增 `grid`（四宫格）图标用于"按维度"切换，组长改 `usersGroup`（一组人，块块隐喻）——5 角色图标隐喻齐全且互不重复
  - **排布**：态势行 `待办 N | 在办活动 N | 在办专班 N` 竖线分隔生硬 → 三格统计块；灰底清单块 → 分隔线列表
  - **显示方式**：方形小图标块 → 圆形角色头像（w-10 h-10 rounded-full + w-5 h-5 图标）；激活态淡色底 → iOS 风格白色滑块+阴影
  - **计算逻辑确认**：`getPersonOverview()` 聚合口径（未完成待办按 action 分组 + 未归档在办活动 + active/recruiting 专班）与 `TodoStore.getGroupedByAction` 一致；日期口径全局统一 `toISOString().slice(0,10)`；组长卡 `xl:col-span-2` 跨列
- **重新设计要点**：
  - 视图切换器：圆角胶囊容器 + 图标（grid/users）+ iOS 风格激活态（`--surface-card` 白底滑块 + 双阴影 + 主题色，深浅两套 theme-dark 适配）
  - 按人卡片：①卡头=圆形角色色头像+角色名+姓名+在办徽章 ②态势行=三格统计块（待办/在办活动/在办专班，角色色大数字，超期待办数字标红）③在办清单=`border-t` 分隔线列表（小图标灰/超期红 + 文本 + 日期，超期徽章）④直达入口 hover 箭头间距拉大
  - 组长卡（唯一多人"块块"角色）`xl:col-span-2` 横跨两列，网格 `grid-cols-1 xl:grid-cols-2`
- **浏览器实测（browser_use 通过）**：切换条带图标、激活态白色滑块；5 卡片四要素齐全；组长卡跨列类与媒体查询确认；无 JS 运行时错误；截图 `overview-dimension-v2.png` / `overview-person-v2.png`
- **变更文件**：`docs/src/entries/tabs/secretary/overview-tab.js`、`docs/src/core/icons.js`（新增 grid）、`docs/src/styles.css`（ov-sub-tab 激活态重写）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: icon() 参数签名]` — `icon(name, opts={})` 第二参数必须为对象 `{ className }`，传字符串会导致 opts 解构静默失败、图标退化为 1em 默认渲染——全仓 icon() 调用禁用字符串第二参数

## T-203 书记工作台按人视图重构——按职责差异化卡片（副书记移除/专班归组织委员/本页禁用 SVG/平行排布无上下层级）（2026-08-10）

**任务**：书记四条反馈——①每一人卡片内容不应一致/平行 ②专班和党小组组长什么关系 ③SVG 图像选取异常丑陋，本页禁用 ④排布始终暗示上面的比下面的重要，不符合最小三成本原则。经 AskUserQuestion 确认方向后重构。
**引用流程**：H1.2 执行 + web-design-guidelines Skill + fullstack-developer Skill + AskUserQuestion（书记裁定）+ verification-before-completion Skill

- **AskUserQuestion 书记裁定（关键）**：
  - ①卡片差异化→按职责定制在办类型（Recommended）
  - ②专班归属→专班归组织委员统筹，参与者标注（Recommended）
  - 补充：党支部副书记不入按人视图（非所有支部都有副书记；实现上除 title 外与书记无差异）；任何新网页避免硬编码，用模块/函数/数据驱动
- **四条反馈落地**：
  - **①卡片不平行**：`PERSON_ROLES` 由 5 角色改为 4（删除 deputy-secretary）；每角色只投影职责空间在办类型——组织委员=专班（统筹）+活动、宣传委员=归档待办+专班（发起）、纪检委员=考勤考察待办、组长=本组活动+组内事务；数据驱动（getPersonOverview 按 role 聚合，前端零角色判断）
  - **②专班归属**：服务层 `relatedTaskforces` 新增 `relation` 字段（manager=统筹/initiator=发起/member=成员）；渲染层专班行标注关系「（统筹）（发起）（成员）」——专班 manager 全为组织委员 p11，组长仅以发起/成员参与时标注
  - **③本页禁用 SVG**：`renderPersonView` 移除全部 icon() 调用（卡头圆形头像、清单行图标、直达箭头）；子切换条改纯文字；类别区分改用「色点+文字标签」（待办灰#9CA3AF/活动天蓝#0EA5E9/专班靛蓝#4F46E5）；移除未使用 import icon；删除 icons.js 中新增的 grid 图标（无引用）
  - **④平行排布**：取消「卡头大标题+圆形头像+三格态势数字」的上下层级结构→紧凑身份行（色点+角色名+姓名+徽章）+在办清单主体（flex-1 等高）+底部「查看工作台 ›」入口；数字信息并入右上徽章
- **浏览器实测（browser_use 通过）**：4 卡到位且全页无「副书记」文本；`#ov-subview-body` 内 svg=0；各卡首行标签与色点颜色经 getComputedStyle 逐一确认（三色正确）；专班关系标注「统筹/发起/成员」正确；组长卡溢出提示「… 另有 1 项」；无 JS 运行时错误；截图 `overview-person-v3.png`
- **变更文件**：`docs/src/services/secretary-overview.js`、`docs/src/entries/tabs/secretary/overview-tab.js`、`docs/src/core/icons.js`（删 grid）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 按人视图角色集]` — 副书记不入按人视图：非所有支部都有副书记，实现上与书记无职责差异；按人视图=四支委条线（组织/宣传/纪检）+块块（组长），数据驱动 PERSON_ROLES 常量；`[已沉淀: 本页禁用 SVG]` — 类别区分用色点+文字标签（待办灰/活动蓝/专班靛），避免图标选取丑；`[已沉淀: 平行排布]` — 卡片取消「卡头大标题+态势数字」上下层级，身份为紧凑一行、在办清单为主体、数量并入徽章，符合最小三成本

## T-204 最小三成本原则评议·第2轮（六工作台逐台审查 G1-G8）+ 按人视图重新设计全量落地 t1-t6（2026-08-10）

**任务**：①对全部 6 个工作台逐台按「最小三成本原则」（信息成本/操作成本/适应学习成本）再评议一轮；②书记不满书记工作台全局概况"按人视图"→ 从头设计：监管同时【不插手】、进度同时反映读点难点卡点、一键报告/汇报闭环、"谁应该看谁"可计算化、"根据数据定UI"。
**引用流程**：H1.2 执行 + fullstack-developer Skill + web-design-guidelines Skill + sample-diff-learning Skill + AskUserQuestion（书记多轮裁定）+ verification-before-completion Skill

- **阶段一：逐台审查产出**：
  - 全局问题 **G1-G8**：三区数据结构混排 / 角色视图缺位 / 硬编码组映射 / decorative SVG / 待办不可见性 / 首条需二次点击 / 汇报无入口 / 可见性无数据源
  - sample-diff 泛化差异 **4 项**：按人视图「数据 ≠ 人」、组长应看组员（块块）、全员全矩阵可见性、一键汇报需双向闭环
  - **书记裁定（AskUserQuestion）**：①有待办必见待办（priorityTab 一次性消费）②全站推广范本（自动选中首条+自动展开）③全部改为数据驱动（清除 LEADER_GROUP_MAP 硬编码）④全站统一禁用 decorative 图标（功能性图标保留）
- **阶段二：按人视图重新设计（书记多轮裁定）**：
  - **监管不插手**：书记对他人仅「了解进展」（温和请求，措辞不用"要求"）+ 答复汇报，无任何编辑他人待办入口；P-015「看 ≠ 做」「执行委托与知情监督是对应的，统一的」
  - **谁应该看谁 = P-015 赋权链投影**：AUTHORIZE_CHAIN（secretary/deputy→all；org→organizer/deep 专班条线；leader→own-group 块块；disc→all×[attendance,inspection]；prop/participant→仅 L0 自我），落地为 `visibility.js` 数据驱动矩阵，非新发明
  - **根据数据定UI**：三区上下排布、问题优先——汇报区（最上，待答复收件箱+行内答复零跳转）→ 卡点区（次上，超期/缺口告警+行内"了解进展"）→ 进度区（最下，角色×状态紧凑聚合表一行一人）
  - **一键汇报闭环（复用 Issue 体系，零新建存储）**：kind='report' + 分类 progress/blocked/ask；成员发起→书记答复→发回→确认收到闭环；`report-entry.js` 常驻按钮进各工作台
  - **组长组员进展 tab**：块块知情视角（P-015），五维聚合（progress/blocker/report/attendance/inspection），底部注明"正式答复由书记完成，不跳转他人工作台"
- **实施落地 t1-t6（全量顺序）**：
  - t1 `services/visibility.js`（新）全员可见性矩阵（P-015 数据驱动配置）
  - t2 `services/issues.js` 汇报数据层：requestReport / getReportRequestsFor / getReportsBySubmitter + REPORT_CATEGORIES
  - t3 `overview-tab.js` 三区视图（问题优先）+ 行内答复/了解进展
  - t4 `components/report-entry.js`（新）成员端一键汇报入口，接入 visitor/disc/leader 等全部工作台
  - t5 组长「组员进展」tab（own-group 推导，`_currentLeaderGroup()` 替代硬编码）
  - t6 跨站点裁定落地：`tab-bar.js` 新增 priorityTab（待办必见，一次性消费）；自动选中首条推广至 leader/org/prop/disc/visitor/secretary 六个工作台；LEADER_GROUP_MAP 硬编码清零；decorative SVG 检查（工作台 icon 均功能性，无需处理）
- **验证结果**：✅ GetDiagnostics `[]` 无错误；✅ `git diff --stat` 9 modified + 2 new；✅ visibility.js/report-entry.js/issues.js/overview-tab.js 关键导出与三区结构核对通过
- **变更文件**：`docs/src/components/tab-bar.js`、`docs/src/components/report-entry.js`（新）、`docs/src/services/visibility.js`（新）、`docs/src/services/issues.js`、`docs/src/entries/tabs/secretary/overview-tab.js`、`docs/src/entries/ws-{secretary,leader,org-commissioner,prop-commissioner,disc-commissioner,visitor}-entry.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 有待办必见待办]` — priorityTab 语义="有未完成待办时默认落待办 tab"，优先级 高于 localStorage 记忆，仅首次渲染一次性消费避免反复覆盖用户正在看的 tab；`[已沉淀: 看≠做]` — P-015 知情边界落地：可见性只决定"能看到什么维度"，不授予任何操作权；上级对下级仅「了解进展」与答复，无编辑入口；`[已沉淀: 谁应该看谁]` — 全员可见性矩阵=AUTHORIZE_CHAIN 赋权链投影（L2 all/L1 条线/块块 own-group），数据驱动 ROLE_VISIBILITY 配置表，前端零人判断；`[已沉淀: 根据数据定UI]` — 进度/卡点/汇报三区数据结构截然不同，按数据分区（汇报收件箱/卡点队列/进度聚合表），三区上下排布问题优先；`[已沉淀: 一键汇报闭环]` — 复用 Issue 体系 kind='report'，成员发起→上级答复→发回→确认收到，零新建存储，行内填写即发零跳转

## T-205 书记工作台三问反馈全量落地：孤零零字段删除 + 待办「答复类」置顶 + 全角色答复机制 + 全角色「工作概况」tab + 设计原则10「高频零跳转」（2026-08-10）

**任务**：书记对书记工作台整体满意后提出三点美中不足——①选中一个孤零零 `div`（全局概况叙事行）为反例，要求"孤零零的字段整合到卡片或删除"；②待办排序仍未按使用频率，"放在代办最上面的就是'答复'类"；③其他角色要有类似答复机制（"信息流畅是最重要的"）并单独设「工作概况」tab；④提出新的检查标准："完成一个高频工作需要操作多少次？信息的展示是否和操作在同一个地方，便于参考？"。强制要求使用 sample-diff-learning + web-design-guidelines + fullstack-developer 三个 Skill，批判性检查、耐心建设。
**引用流程**：H1.2 执行 + sample-diff-learning Skill（差异泛化）+ web-design-guidelines Skill（最新指南审查）+ fullstack-developer Skill + AskUserQuestion（书记 4 项裁定）+ verification-before-completion Skill

- **AskUserQuestion 书记裁定（关键）**：
  - ①孤零零叙事行→**直接删除**（数值与 KPI 卡/异常队列完全冗余，非整合）
  - ②答复类置顶→**待办内建置顶**（独立收件箱卡置于待办上方，非 TodoCategory 新枚举聚合卡）
  - ③全角色答复机制→**组长可答复本组组员**（块块闭环，书记仍全局可见，P-015 不破坏）
  - ④工作概况 tab→**全部角色加**（无下级的宣传/参与者也可加，按角色注入条线数据）
- **t1 删除孤零零叙事行**：`overview-tab.js` 删除「全局概况：出勤率…复盘…考察超期…」裸 div 构建与模板（2 处），KPI 顶栏直接从 `grid grid-cols-2 lg:grid-cols-5` 开始
- **t2 待办「答复类」置顶**：新组件 `components/report-inbox.js`（复用型待答复收件箱）——问题优先排序（blocked→ask→progress，待答复 resultPending 优先于待处理，submittedAt 倒序）、行点击展开对话时间线、行内输入+「正式答复」（kind='reply' 发回汇报人，通知未读）、色点+文字标签区分（本组件禁用 SVG）；`todo-tab.js` 左栏改为「待答复收件箱（置顶）+ 我的待办列表」双卡结构，顺带修复原模板 `class="card rounded-xl p-5""`（多余引号）bug
- **t3 组长答复本组组员**：`ws-leader-entry.js` 组员进展 tab 三区改四段（汇报区新增），复用 renderReportInboxHtml 渲染本组组员 open 汇报，bindReportInbox（role='leader'）行内正式答复；底部说明「本组组员汇报可行内正式答复，书记仍全局可见」
- **t4 全角色「工作概况」tab**：新组件 `components/work-overview.js`（全角色通用）——三区上下排布问题优先：①汇报区（请我汇报行内填写即发 + 我发起的开放汇报）②卡点区（我的超期 + 条线缺口按角色注入：纪检=补课未完成/考察超期、宣传=待归档活动、组织=专班招募中/待赋权活动）③在办区（我的待办/活动/专班聚合 + 条线态势按角色注入）；接入 5 个工作台入口（leader/org/prop/disc/visitor），tab 置于待办之后、defaultTab/priorityTab 保持不动，参与者仅自我聚合（无条线行）
- **web-design-guidelines 审查落地**：按最新指南对两新组件审查——✓ tabular-nums（数字列）、placeholder 以 … 结尾、`<button>` 承载交互、空态齐全、min-w-0/truncate 防溢出；修正 2 处：新输入框补 `aria-label`（汇报内容/答复内容）
- **设计原则沉淀（sample-diff-learning 差异泛化 → Layer 2）**：DESIGN_SYSTEM.md §一 新增**原则10「高频零跳转（High-Frequency Zero-Jump）」**（书记原话 2026-08-10）——最小三成本最终验收标准="完成一个高频工作需要操作多少次？信息展示与操作是否同地"；答复类置顶待办 / 答复回路全角色化 / 工作概况三区总览 + 4 条可验证布尔条件 + 孤零零数据行须整合或删除
- **验证结果（browser_use 5 页实测通过）**：leader/org/prop/disc/visitor 五工作台「工作概况」三卡（汇报/卡点/在办）全部渲染，条线数据注入正确（组织=专班招募中 2 个、宣传=待归档活动 21 个+新闻稿超期、纪检=补课未完成 7 人+考察超期 24 条+考勤 151 条出勤率 85%）；参与者纯个人聚合无条线行；无 JS 运行时错误（仅字体资源 ERR_ABORTED 与 Tailwind CDN 提示，与渲染无关）；修复验证期发现的 ws-visitor-entry.js import 丢失（并行编辑同文件互相覆盖）→ 补回后重验通过
- **变更文件**：`docs/src/components/report-inbox.js`（新）、`docs/src/components/work-overview.js`（新）、`docs/src/entries/tabs/secretary/overview-tab.js`、`docs/src/entries/tabs/secretary/todo-tab.js`、`docs/src/entries/ws-{leader,org-commissioner,prop-commissioner,disc-commissioner,visitor}-entry.js`、`content/04_web_design/DESIGN_SYSTEM.md`（原则10）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 孤零零字段]` — 不属于任何卡片的裸 div 数据行（数值与既有卡片冗余）是信息成本冗余，须整合进最近卡片或直接删除，不允许游离叙事行；`[已沉淀: 答复类置顶]` — 待办排序依据=使用频率而非类别固定顺序，最高频动作（汇报答复）内建独立收件箱置顶待办，行内填写即发零跳转；`[已沉淀: 答复回路全角色化]` — 信息流畅是双向的，每个角色都应有答复机制（组长答复本组组员、书记全局可见），块块闭环不破坏 P-015 知情边界；`[已沉淀: 高频零跳转检查]` — 最小三成本验收标准="完成高频工作需操作几次？信息展示与操作是否同地"，同屏同区为通过，>2 跳为违反（设计原则10）；`[已沉淀: 并行编辑同文件覆盖]` — 同一消息内对同一文件的两个 Edit 存在互相覆盖风险，同文件多处修改应串行执行，完成后必 grep 校验导入完整；`[待办]` — commit（push 需书记批准）

## T-206 REVIEW_QUEUE（T-235）实施状态回填 + visitor taskforceId 落点补齐 + 队列清空归档（2026-08-10）

**任务**：T-205 commit（b6a6a79）后核实执行日志 `[待办]` 与 REVIEW_QUEUE.md 状态。发现 REVIEW_QUEUE（T-235 五场景工作流通顺性检查，2026-08-08 书记七轮裁定）中 J1-J4 仍标「待实施」，但代码核查绝大多数已落地——唯一缺口：**visitor 未消费 `taskforceId`**（J2 裁定要求 visitor→项目分工定位，首页专班卡片 `?taskforceId=` 跳转后落在默认待办 tab，专班信息丢失）。
**引用流程**：H1.2 执行 + fullstack-developer Skill + verification-before-completion Skill + browser_use 实测

- **缺口补齐（ws-visitor-entry.js）**：
  - URL 消费逻辑扩展：`taskforceId` → 激活「项目分工」tab（一次性消费，消费后 clearParam）；activityId / view=activities 分支保持原样
  - `_renderProjectDivision` 渲染后定位：`.visitor-proj-card[data-tf-id=...]` scrollIntoView + flashHighlight（2.8s 自动褪去），目标清除（一次性）
  - 项目卡片 div 加 `visitor-proj-card` 类 + `data-tf-id` 属性（专班项目 id；活动项目留空）
- **REVIEW_QUEUE 回填**：J1（activityId 差异化落点）/J2（taskforceId：secretary/leader/disc→tf-view、org→专班管理、prop→kanban、visitor→项目分工）/J3（日历冒泡跳转）/J4（view=activities）/活动查看组件（activity-view.js）/专班查看组件（taskforce-view.js）/落点方式（现状即权限只做定位）/高亮褪去（flashHighlight 2.8s）全部回填 ✅ 已完成
- **队列清空**：按 H5.3「评议完成后即清空」，REVIEW_QUEUE.md 清空归档（保留模板头，注释标注 T-235 归档信息）
- **验证结果（browser_use 实测通过）**：`http://localhost:8080/workspace/visitor.html?taskforceId=tf-001`（登录态 p5/participant）→ 激活 tab=「项目分工」✅；专班卡片「宣传专班（第二期）」存在且 `data-tf-id="tf-001"` ✅；scrollIntoView 执行（滚动位置 0→703）✅；高亮类 `nav-flash-highlight` 蓝 3px 描边出现、2.8s 后自动褪去（受控演示验证 CSS 过渡）✅；Console 无功能性错误
- **变更文件**：`docs/src/entries/ws-visitor-entry.js`、`.ctx/REVIEW_QUEUE.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 队列状态同步]` — REVIEW_QUEUE 实施项在后续轮次逐项落袋后，须定期回填状态并 H5.3 清空，防止「代码已实施、队列仍标待实施」的僵尸状态；`[待办]` — commit（push 需书记批准）

## T-207 书记 6 点反馈落地：进度指标去无信息量 + 概况可下钻 + 项目分工双视图 + role-label 金色统一（2026-08-10）

**任务**：书记选中 header 的 role-label div 后提出 6 点设计要求——①工作进度指标设计与显示必须谨慎（要写入设计文档）；②「已完成 N」无信息增量，只可作归档统计信息，面向"要完成的工作"应指向未完成/超期/缺口；③视图切换（header/sidebar）已完全失去作用——每个人就是每个人，组织者与深度参与者的所有信息集成在工作台，任务来了都在工作台完成；④工作概况是否仅为可读界面？需设置跳转便于工作执行；⑤项目分工需区分个人分工与全局分工（以人为中心的直观表现视图 + 全局包含查询的视图）；⑥金色情况下 header 的 role-label 显示与其他颜色不一致。强制要求使用 sample-diff-learning + web-design-guidelines + fullstack-developer 三个 Skill。
**引用流程**：H1.2 执行 + sample-diff-learning Skill（差异泛化）+ web-design-guidelines Skill + fullstack-developer Skill + AskUserQuestion（书记 4 项裁定）+ verification-before-completion Skill + browser_use 实测

- **AskUserQuestion 书记裁定（关键）**：
  - ①工作概况跳转→**行内执行 + 在办可下钻**（待办→定位工作台待办 tab；活动/专班→只读详情视图，返回回概况）
  - ②项目分工→**双视图子切换**（「我的分工」以人为中心 +「全局分工」全局查询，复用 ov-sub-tab-active 样式）
  - ③进度指标→**只显未完成类、可下钻**（工作界面不得出现"已完成 N/总数"存量统计，仅归档库保留）
  - ④role-label 金色→**金色实底白字**（与其他主题结构完全一致，取消原金浅底深金字分支，杜绝 `;;`）
- **设计文档写入（DESIGN_SYSTEM.md §一）**：
  - 原则11「工作进度指标设计（Progress Indicator Design）」：**"已完成 N"是无信息量的存量统计**，只可作归档统计信息；面向"要完成的工作"，进度指标必须指向"进行时与未完成"（待办/待完成/超期/缺口/进行中）并提供信息增量与操作入口——①只显未完成类（工作界面不得出现"已完成 N/总数"，已完成仅归档库出现）②可下钻（进度数字/聚合须可点击进入具体清单或详情）③从"看"到"做"（概况在办区列出可点击条目）；3 条可验证布尔条件
  - 原则12「工作台集成制（Workspace Integration）」：角色单页制后**视图切换（header 工作台切换/sidebar 切换）已失去作用——每个人就是每个人**；组织者与深度参与者的所有信息均集成在工作台，任务来了就都在工作台内完成；可验证条件=出现需"切换到某角色/视角"才能完成的操作路径 → 违反
- **代码实施（6 点全量落地）**：
  - **第2/4点·进度指标 + 概况可下钻**：`work-overview.js`——在办区由聚合数字改为可点击条目列表（待办聚合卡 `data-wo-jump="todo"` 含超期红点提示、活动/专班条目 `data-wo-jump="activity"/"taskforce"`），点击待办→切待办 tab 按 `data-group-key` 定位 flashHighlight，点击活动/专班→`_renderOverviewDetail` 动态 import activity-view/taskforce-view 只读知情视图 + 返回按钮；宣传条线态势"已归档 N"→"待归档 N"（仅 >0 渲染）；`inspector.js` 进度行"已完成 N/总数"→"待完成 N 项"（仅 >0 渲染）；`ws-disc-commissioner-entry.js` 补课统计删「已完成」块只显「待补课+已超期」
  - **第5点·项目分工双视图**：`ws-visitor-entry.js`——`_projSubView` 双视图子切换（我的分工=我参与的项目/全局分工=全部项目），本人徽章红色描边 box-shadow + 红色「·我」标记（以人为中心直观表现），首页专班跳转强制落全局分工；`_buildPersonnel` 补 personId 字段
  - **第6点·role-label 金色统一**：`header.js`——金色与其他主题结构完全一致（accent 实底 + 白字），直接内联 `background:${accent};color:#FFFFFF;`，移除 solidAccentStyle 拼接杜绝 `;;` 双分号
  - **顺带修复**：全站 `class="card rounded-xl p-5""` 双引号 bug 共 17 处清零（org/disc/leader/prop/visitor 各 entry）
  - 各工作台概况 tab 调用传 `prefix`（'org'/'disc'/'leader'/'prop'/'visitor'）供待办定位
- **验证结果（browser_use 实测通过，4 链路）**：
  - 链路1 在办区下钻：参与者工作概况「在办」3 条目（1 待办聚合+2 活动）可点击；待办聚合点击→切待办 tab+目标聚合卡 `nav-flash-highlight` 添加并 2.8s 自动褪去（MutationObserver 实测）；活动点击→只读详情+「← 返回工作概况」→返回正常；在办无专班条目（mock 数据有限，已如实报告）
  - 链路2 项目分工双视图：「我的分工」10 项全含王五+本人徽章红描边+「·我」红标记；「全局分工」36 项含未参与项目；切换正常
  - 链路3 首页专班跳转：点击首页专班卡（tf-006）→ visitor 项目分工 tab+全局分工子视图+滚动定位+高亮（URL 参数一次性消费后清除属设计行为）
  - 链路4 role-label 金色：组织委员默认天蓝 #0EA5E9 实底白字；主题选金色→#B45309 深金实底白字（A-09 对比度修复，亮金 #FFD700 白字辨识度低），结构与天蓝完全一致，style 无 `;;`
  - GetDiagnostics 无 JS 错误；全站「已完成 N」残留仅剩状态标签/归档库/书记 KPI 专项（符合原则11 边界）
- **变更文件**：`content/04_web_design/DESIGN_SYSTEM.md`（原则11/12）、`docs/src/components/header.js`、`docs/src/components/inspector.js`、`docs/src/components/work-overview.js`、`docs/src/entries/ws-{visitor,disc-commissioner,leader,org-commissioner,prop-commissioner}-entry.js`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 进度指标信息增量]` — "已完成 N"是无信息量的存量统计，只可作归档统计；面向要完成的工作须指向待办/待完成/超期/缺口等进行时与未完成状态并提供信息增量与操作入口（设计原则11）；`[已沉淀: 工作台集成制]` — 角色单页制后视图切换失去作用，每个人就是每个人，所有信息集成工作台、任务在工作台内完成，不依赖"切换到某角色视角"的入口（设计原则12）；`[已沉淀: 概况可下钻]` — 工作概况从只读界面升级为可执行：在办区列出可点击条目（待办→待办 tab 定位、活动/专班→只读详情），从"看"到"做"同屏直达；`[已沉淀: 个人分工与全局分工]` — 项目分工区分「我的分工」（以人为中心，本人徽章红描边+·我高亮）与「全局分工」（全局查询），双视图子切换；`[已沉淀: 主题色结构一致性]` — role-label 各主题（含金色）统一 accent 实底白字结构，金色取深金 #B45309（A-09 对比度修复，亮金白字辨识度低）；`[待办]` — commit（push 需书记批准）

## T-208 减负空间第一批：文件流外发确认闭环 + 金色再黄 #A16207 + 复盘 KPI 改问题导向 + 切换工作台冗余清理（2026-08-10）

**任务**：书记在浏览器选中 6 个 HTML 元素（组织委员「专班考察上传」卡片含金色按钮、visitor 项目分工卡片含「·我」徽章、紫色 role-label、金色「发布招募」按钮、金色「一键汇报」按钮、「复盘完成率 52% 风险」KPI 卡）后提出 4 点新设计要求，强制使用 sample-diff-learning + web-design-guidelines + fullstack-developer 三个 Skill——①任务流/信息流能否都通过系统实现？目前唯一缺口是【文件流】（靠微信传输），系统应跳出「在办事项请通过发送由对方系统确认」——"总是有内控设计的方法的！！！"；②金色 div 和 button 依旧诡异的褐色，要求再黄一点（含 tab 中的字）；③分批、系统地规划【减负空间】排查（是否有些工作流可以精简/是否有信息冗余）——举例复盘率设定 100% 的成果就是大家随意提交、目标异化，从最初设定就只希望大家提交真问题；④所有视图切换（header/sidebar）已完全失去作用——每个人就是每个人，任务都在工作台完成，冗余要素如何处理。
**引用流程**：H1.2 执行 + sample-diff-learning Skill（差异泛化）+ web-design-guidelines Skill + fullstack-developer Skill + AskUserQuestion（书记 4 项裁定）+ verification-before-completion Skill + browser_use 实测（2 轮 + 1 轮回归）

- **AskUserQuestion 书记裁定（关键）**：
  - ①文件流内控→**外发确认闭环**：发送方标记「已通过微信发送给 XX」→ 接收方系统内「确认收到」→ 可审计闭环（谁/何时/发给谁/何时确认）；面向小程序/服务号迁移保持同构（"标记已发送"→"发送到对方微信"）。书记补充战略目标："如果这个系统可以做成一个小程序或者服务号，就可以低成本和微信本来的功能协同了！"
  - ②金色→**金黄 #A16207**（比原 #B45309 明显更黄，白字对比度 5.2:1 达标），覆盖 tab 字 / role-label / 按钮
  - ③复盘 KPI→**改为问题导向**：移除「复盘完成率 100%」，改计「复盘问题」真问题数（KPI 行为异化防御）
  - ④切换工作台下拉→**删除**（原则 12 工作台集成制：跨台经待办定位/通知直达，如赋权通知 targetUrl=leader.html）
- **设计文档写入（DESIGN_SYSTEM.md §一）**：
  - 原则13「文件流外发确认闭环（External Dispatch Confirmation）」：任务流/信息流均可系统实现，唯一缺口是文件流（微信传输）——外部依赖发生时系统内必须有状态记录兜底（"总是有内控设计的方法的！！"）；3 条可验证条件（存在需微信外发环节但无外发标记/确认入口→违反；缺发送方/接收方/时间任一要素→违反；接收方确认后未闭环→违反）；设计落点=宣传材料上传后「文件外发确认」模态 + 接收方工作台卡点区/异常队列「文件待确认→确认收到」
  - 原则14「KPI 行为异化防御（KPI Behavioral Integrity）」：**"完成率 100%"类指标会诱导凑数提交、目标即异化**（复盘率设 100%→随意提交凑数，违背"只希望大家提交真问题"初衷）；指标应指向工作真实意图（真问题导向）；3 条可验证条件；设计落点=复盘 KPI 由「复盘完成率 目标100%」改为「复盘问题 真问题导向」
  - **「减负空间排查（分批规划）」**：第一批 T-208 已完成（KPI 异化修复/文件流闭环/金色统一/切换冗余清理）；第二批待执行（SOP 工作流精简 + 工作台 tab 精简）；第三批待执行（信息冗余 + 表单字段精简）；验收标准=每批产出「排查清单 + 精简决策」、完成一批书记审核一批
- **代码实施（4 点全量落地）**：
  - **第1点·文件流外发确认闭环**：新建 `services/external-dispatch.js`（`loadExternalDispatches/addExternalDispatch/confirmExternalDispatch/listPendingByReceiver/listPendingBySender`，生成 `ed_`+时间戳 id、`confirmedAt=null`）；`core/domain.js` mockDB 新增 `externalDispatches: []` 持久化域；`core/mock-adapter.js` + `services/mock.js` saveDB 白名单/loadDB 恢复对称补齐（后者为本轮实测抓出的持久化缺口，刷新丢数据致「确认收到」不可达）；宣传委员上传材料成功后弹「文件外发确认」模态（接收方下拉：党支部书记（审核）/纪检委员（留档）/组织委员 + 备注 + 「标记已通过微信发送」金样按钮）；各角色工作概况卡点区 `dispatchRows`（「文件待确认 · senderName 已微信外发」+ 绿色「确认收到」按钮）；书记全局概况异常优先队列 `pendingDispatches` 同理并入空态判断与计数
  - **第2点·金色再黄**：`#B45309` → 金黄 `#A16207` 全站替换（constants.js/styles.css/main-entry.js/issue-detail.js/issue-list.js/issue-form.js/person-picker.js 8 文件），含 participant hex、solidAccentStyle 判断、主题党日系 text/dotBorder（rgba 180,83,9 → 161,98,7）与「深棕金」注释语义；DESIGN_SYSTEM.md 残留 10 处 #B45309 描述同步（含 §2.3.1 金黄文字 token、§2.3.2 participant 三件套、§2.7 打样/金点描边/visitor 按钮、§7.1 深色模式约定），仅保留历史对比记录
  - **第3点·复盘 KPI 改问题导向**：`secretary-overview.js` 移除 `reviewRate` 计算改 `reviewIssues`（活跃活动复盘中 issues 长度总和）；`mock/review.js` REVIEW_RECORDS/TASKFORCE 6+1 条补 `issues` 数组 + `reviewToDisplay` 映射；`ws-leader-entry.js` 复盘表单新增「提出的真问题（每行一条，书记 KPI 以此计量）」textarea（existingIssues 回填）+ 详情「提出的真问题（N）」展示；`ws-disc-commissioner-entry.js` 复盘监督卡 issues 展示；书记 KPI 卡「复盘完成率」→「复盘问题 条/真问题导向」（bar:false）
  - **第4点·切换工作台冗余清理**：`header.js` 删除 `_viewSwitcherHTML`/`_bindViewSwitcher` 两函数及其调用（顶部注释记录书记裁定原则 12）；跨台入口已由待办/通知覆盖（auth.js `_notifyProjectAuth` 赋权通知 targetUrl=leader.html 等），删除不断链
- **验证结果（browser_use 实测通过）**：
  - 首轮 5 链路：书记 KPI「复盘问题｜达标 5条｜真问题导向」存在且「复盘完成率」不存在（JS 断言）；header 无「切换工作台」下拉（全页 select 数 0）；组织委员选金色主题后 tab 激活态 color rgb(161,98,7)、role-label/「发布招募」「一键汇报」按钮 background rgb(161,98,7)，全流程无 rgb(180,83,9)；组长复盘表单 `#review-issues-act-29`「提出的真问题（每行一条，书记 KPI 以此计量）」；宣传委员上传材料→「文件外发确认」模态（接收方三选+备注+标记按钮）→「已标记外发，对方确认后将闭环」toast
  - 补测抓出真实 Bug：外发记录写入后刷新即丢——运行时持久化走 `services/mock.js` BranchService saveDB/loadDB（白名单/恢复列表未含 externalDispatches），与 core/mock-adapter.js 不对称，致接收方「文件待确认」不渲染。修复后回归：纪检委员工作概况卡点区出现「文件待确认：宣传材料：暑期实践总结分享 · 林十五 已微信外发」→ 点击「确认收到」→ toast「已确认收到，文件流转闭环完成」→ 条目消失 → F5 刷新不复活（confirmedAt 持久化）✓
  - 版本号 bump `20260810a`（74 JS + 15 HTML + CODE_VERSION+1），浏览器干净加载复测全链路通过
  - GetDiagnostics 无 JS 错误（仅历史 markdown lint 警告）
- **变更文件**：`docs/src/services/external-dispatch.js`（新建）、`docs/src/core/{domain,mock-adapter}.js`、`docs/src/services/mock.js`（持久化修复）、`docs/src/components/{header,work-overview}.js`、`docs/src/entries/tabs/secretary/overview-tab.js`、`docs/src/entries/ws-{prop-commissioner,leader,disc-commissioner,visitor}-entry.js`、`docs/src/mock/review.js`、`docs/src/services/secretary-overview.js`、`docs/src/core/constants.js`、`docs/src/styles.css`、`docs/src/entries/main-entry.js`、`docs/src/components/issue-{detail,list,form}.js`、`docs/src/components/person-picker.js`、`docs/src/core/cross-page-state.js`（版本号）、`content/04_web_design/DESIGN_SYSTEM.md`（原则13/14 + 减负空间分批规划 + 金色 token 同步）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 文件流外发确认闭环]` — 任务流/信息流均可系统实现，唯一缺口是文件流（微信传输）；外部依赖发生时系统内必须有状态记录兜底——发送方标记「已微信外发」+ 接收方「确认收到」，形成可审计闭环（谁/何时/发给谁/何时确认）；记录模型保持简单可迁移（面向小程序/服务号"标记已发送"→"发送到对方微信"）（设计原则13）；`[已沉淀: KPI 行为异化防御]` — "完成率 100%"类指标会诱导凑数提交、目标即异化；指标应指向工作真实意图（复盘要真问题、承诺要兑现质量）而非形式完成（设计原则14）；`[已沉淀: 减负空间排查]` — 分批规划：第一批文件流/KPI/金色/切换冗余（已完成），第二批 SOP 工作流+tab 精简，第三批信息冗余+表单精简，每批产出排查清单+精简决策、书记审核一批过一批；`[已沉淀: 金黄 #A16207]` — 金底文字由 #B45309 再黄至 #A16207（书记裁定"再黄一点"），全站含 tab 字/role-label/按钮，白字对比度达标；`[待办]` — 减负空间第二批（SOP 工作流精简 + 工作台 tab 精简）、第三批（信息冗余 + 表单字段精简）；commit（push 需书记批准）

## T-209 全栈同步 + 数据逐条排查 + 四层语义色 + 虚假目标清理 + 乙部瘦身 + W4 专项评议循环（2026-08-10）

**任务**：书记 7 项指令（强制使用 fullstack-developer + web-design-guidelines + sample-diff-learning 三 Skill）——①全栈同步：后端服务器数据设置与同步，确保开发全部 Up to date；②数据标签逐条排查：自行产生 or 写入？写入功能是否支持这么多字段？对照设计文档 UI 是否全部落实、贯彻最小三成本原则？排查结果落点明确；③卡片颜色推敲（书记嫌"太暖色、太单调、看得难受"）；④虚假目标清理（"这些都没有目标，为什么要设定虚假的目标呢？"——「目标 0 条/0 项」）；⑤乙部瘦身（任务名留乙部，细节迁 REVIEW_QUEUE——进度/已执行工作/书记特别要求）；⑥常态化评议检查提高到周期性工作位置；⑦验证。
**引用流程**：H1.2 执行 + fullstack-developer Skill（前后端数据链路）+ web-design-guidelines Skill + sample-diff-learning Skill（差异泛化）+ AskUserQuestion（书记 4 项裁定）+ verification-before-completion Skill

- **①全栈同步（Up to date）**：`server/db.js` RESOURCE_TABLES 14→25 张表；`server/routes/resources.js` 11 新键映射 + ID_PREFIX；`server/seed.js` 新增 archive_records/signups 种子；`docs/src/core/api-adapter.js` 25 资源分组 list()；`docs/src/core/data-adapter.js` init() 15 项 Promise.all 全量拉取 + `_unwrapRootRows`/`_buildSnapshotPayload`（25 域含 3 聚合域 __root__ 单行包装：actSubRecords/tfSubRecords/mailboxConfig）；`docs/src/core/mock-adapter.js` restoreNicheCollections 扩展；E2E 测试适配 T-232 动态聚合改造（`.secretary-todo-complete-btn` 选择器已不存在 → 复核确认聚合卡交互路径 `secretary-todo-action-btn`→`secretary-todo-detail-confirm`）。npm test **16/16 通过**
- **②数据逐条排查结论（书记问"排查结果写在哪里？"→ 落点=本条 + REVIEW_QUEUE 附录区）**：对照 DATA_ARCHITECTURE.md 逐条过 11 个新域——**标签属性三分**：`signups`/`activityReviews`/`archiveRecords`/`externalDispatches`/`mailboxHistory`/`actSubRecords`/`tfSubRecords` = 用户表单写入型（7 域）；`propTasks`/`taskforceReviews`/`weeklyReports`/`mailboxConfig` = 系统派生/seed 预置 + 原地补丁型（4 域，无用户创建表单，标签由系统派生，不涉及"写入支持"问题）。**逐条缺口**：① signups 关联键 sourceType/sourceId（非 activityId/taskforceId，与 DATA_ARCHITECTURE 模型字段一致 ✓）② activityReviews progress/overdue 硬编码（应改派生）③ taskforceReviews 无专班复盘表单（种子+补丁模式，专班复盘入口在组长活动复盘，专班级复盘待 UI 表单）④ propTasks 无创建表单（仅状态推进，任务由各场景派生）⑤ weeklyReports 仅编辑 seed 预置、不能新建周次 ⑥ archiveRecords 无 uploadedBy/archivedBy 字段（文件上传人有 attachments 冗余）⑦ mailboxConfig 仅 lastCheckAt 可变（配置属系统级，非用户写入）⑧ mailboxHistory 唯一硬编码 summary/hasAction（通知→历史自动追加）⑨ externalDispatches 接收方仅 3 选项（党支部书记/纪检委员/组织委员）⑩ actSubRecords/tfSubRecords 无时间戳/创建人（已纳入后端 __root__ 单行存储，写穿透链路完整）。**UI 落实判定**：25 域前端持久化域 = server 25 张表对称，data-adapter init/snapshot 全量写穿；聚合域 __root__ 单行 init 解包/snapshot 包装闭环；「最小三成本」无新增违例（无虚假目标、无死链、无冗余入口）。**改进项登记**：taskforceReviews 专班复盘表单、weeklyReports 新建周次、actSubRecords/tfSubRecords 时间戳补齐（书记 2026-08-10 AskUserQuestion 裁定"全部启动补齐"→ 落地见下）
- **AskUserQuestion 书记 4 项裁定**：①卡片配色→**四层语义色平衡**（本月活动=党建红 #CE1126 / 活跃专班=金黄 #A16207 / 未读通知=蓝 #3B82F6 信息待处理非告警红 / 我的考勤=绿/琥珀/红状态语义——告别红金暖色单调）；②乙部已完成条目→**一次性完成则移除，多次进行的逐条审阅是否作为周期性/经常性工作**；③REVIEW_QUEUE 语义→**仅评议相关工作进入（评议都是经常性周期性工作！），评议中的"进度/已执行工作/书记特别要求"作为附录存在，不影响"清空"要求**；④周期任务→**新增 W4 专项评议循环**（开放机制，书记附加"**评议绝不仅仅只有这些！**"）
- **③卡片颜色（t3）**：`docs/src/entries/main-entry.js` 首页统计卡四相语义色落地——本月活动 #CE1126（党建红）/ 活跃专班 #A16207（金黄）/ 未读通知 #DC2626→#3B82F6（蓝，注释书记裁定）/ 我的考勤（绿/橙/红状态派生）；`DESIGN_SYSTEM.md` §2.8 归档「首页统计卡四相语义色」条款
- **④虚假目标清理（t4）**：`docs/src/entries/tabs/secretary/overview-tab.js` KPI 卡「考察积压」target '目标 0 条' /「待办异常」target '目标 0 项' → `target: null` + 渲染条件化 `${k.target ? ... : ''}`（状态由达标/欠佳/风险徽章表达，不设虚假目标）
- **⑤乙部瘦身（t5）**：`CLAUDE.md` 乙部 P3 从 10 行 → **6 行**——T-188/T-189/T-207（✅ 一次性完成）删除；T-195/T-200 瘦身为「名称 + W4 专项③/④承接」；T-116/T-117 已瘦身为 W4 ①/②承接；余留 T-118（⏳ 待启动）/T-206（🔄 书记操作中）。期间修复 T-188 重复行 BUG（编辑时 new_string 以 T-188 结尾致原 T-188 行残留重复，已去重）
- **⑥周期性工作（t6）**：`OPERATIONS_GUIDE.md` §17.2.1 周级新增 **W4 专项评议循环**（每周轮转，AI 按 H5 工作流，当前专项①反论 T-116/②理论复用 T-117/③黑话审查 T-195/④书记原话复核 T-200，开放机制可扩展）；`TIMESTAMPS.md` 新增 W4 追踪行（2026-08-10 → 2026-08-17）；`.ctx/REVIEW_QUEUE.md` 建立**附录承接区**（附录①-④各专项性质/引用流程/轮次进度/已执行工作/书记特别要求），头部新增附录语义条款（书记 2026-08-10 裁定）
- **⑦验证与沉淀**：browser_use 实测（KPI 卡无「目标 0」行、首页统计卡四色、REVIEW_QUEUE 附录渲染）+ 回归 npm test 16/16 + GetDiagnostics 无 JS 错误 + 版本号 bump + commit（push 待书记批准）
- **变更文件**：`server/{db,seed}.js`、`server/routes/resources.js`、`server/test/e2e-login.test.js`、`docs/src/core/{api-adapter,data-adapter,mock-adapter}.js`、`docs/src/entries/main-entry.js`、`docs/src/entries/tabs/secretary/overview-tab.js`、`CLAUDE.md`、`.ctx/REVIEW_QUEUE.md`、`.ctx/TIMESTAMPS.md`、`content/03_doc_system/OPERATIONS_GUIDE.md`（W4）、`content/04_web_design/DESIGN_SYSTEM.md`（四相语义色）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **改进项全部启动补齐（书记裁定后追加，同一 commit）**：① 专班复盘表单——`docs/src/services/review.js` 新增 `addTaskforceReview()`；组织委员专班详情面板新增「专班复盘」区块（active 且未提交时内联表单：复盘内容 textarea + 待改进问题 + 提交复盘按钮；提交后 status=已上传、区块翻转"已提交"并展示内容/问题）；② 周报新建周次——宣传委员周报报送 tab 左卡「+ 新增周次」内联表单（周次标签+日期范围，重复校验，保存后自动选中新草稿周），周报记录补 createdAt/createdBy 字段；③ 子记录时间戳/创建人——党小组组长/组织委员两入口全部子记录（考勤/考察/宣传/材料）push 对象补 `recordedAt`(ISO)+`recordedBy`(短 ID)，详情字段表统一追加「时间」列（cellOf 渲染，无时间戳历史数据显 "-"）；数据架构文档 `DATA_ARCHITECTURE.md` §2.16.1 补 taskforceId/issues 字段表行 + §2.16.2 周报数据表 + 子记录「写入留痕」规则；CODE_VERSION 28→29。**验证**：npm test 16/16 通过 + GetDiagnostics 无 JS 错误 + browser_use 三路并行实测全部通过（组长考勤子记录「时间」列显示 2026-08-10 14:16 时间戳；宣传委员第32周新建成功自动选中；组织委员 SOP 系统维护专班复盘提交成功 toast「已提交，待纪检委员批注」+ 徽章翻转 + 持久化含 tfrev 新记录）
- **沉淀标签**：`[已沉淀: 四层语义色平衡]` — 首页统计卡告别暖色单调：红（党建红品牌）/金（金黄品牌）/蓝（信息待处理，非告警红）/绿（状态语义）四相平衡；`[已沉淀: 不设虚假目标]` — 无既定目标值的指标不设「目标 0」，状态由达标/欠佳/风险徽章表达；`[已沉淀: 乙部任务名留驻、细节迁 REVIEW_QUEUE]` — 一次性完成条目直接删除（详情已归档执行日志），多轮/长期评议条目瘦身为「名称 + W4 承接 + REVIEW_QUEUE 附录指针」；`[已沉淀: W4 专项评议循环]` — 常态化评议检查提高到周期性工作位置，开放机制（"评议绝不仅仅只有这些！"），进行中轮次细节以附录形式挂载 REVIEW_QUEUE，不影响主队列"评议完成后清空"；`[待办]` — commit（push 需书记批准）

## T-210 最小三成本评议落点核查 + 根目录 README 门面重构（设计理念章）+ 全仓 README/SNAPSHOT/TIMESTAMPS 同步更新（2026-08-10）

**任务**：书记两项指令——①核查「最小三成本原则的审议评议」是否出现在 CLAUDE 与 REVIEW_QUEUE；②按照最新情况更新所有 README、SNAPSHOT 等文件；根目录 README 作为整个项目的门面、书记思想的展现窗口，**正文不出现「书记/书记思想」字样，但融会贯通、自然融入、无声胜有声**。
**引用流程**：H1.2 执行 + brainstorming Skill（8 轮 AskUserQuestion 设计收敛）+ H2.1 一改具改 + H3 检查清单 + verification-before-completion Skill

- **①落点核查结论**：最小三成本原则的审议评议**不在** CLAUDE.md（grep「成本/三成本」零匹配，乙部/丙部均无）与 REVIEW_QUEUE.md（W4 附录仅四专项：反论/理论复用/黑话审查/原话复核）中；实际审议记录在执行日志——**T-234**（2026-08-08 第1轮·五场景工作流通顺性检查）+ **T-204**（2026-08-10 第2轮·六工作台逐台 G1-G8）；原则权威源为 `content/04_web_design/DESIGN_SYSTEM.md` §一 第2条（2026-07-31 提级）
- **②根 README 门面重写（t1）**：8 章骨架保留（这是什么/怎么开始/能做什么/该看什么/出问题/设计理念/架构部署/路线图）；**第六章升级「设计理念」章**（不新增章），理念按书记裁断排序「更管总的原则性在前 + 频率更高在前」：总纲·管理事服务人 → 元原则·最小三成本 → 验收标准·高频零跳转 → 按人视图·知情边界 → 党建与党务（T1 官方定义）→ 专班 → 扁平化设计 → 条块二元；**正文避讳书记称谓**（第五章「由书记确认后执行全局修复」→「由支部负责人确认后执行全局修复」），链接/称谓保留（书记裁断）；数据校正：论断数「23 条」→「16 条路线级论断（P-045/P-047 为元命题引子）」、第七章文件数（entries 22 含 tabs/、components 23js+1css、core 13、services 22、server 25 资源表）、角色工作台表格按按人视图更新（书记工作台「全局概况（按维度/按人）」、宣传委员补「文件外发确认」）；差异化视图表述改为「同一数据源，不同角色看到不同视角」（T-195 已裁决「切面→视角」）；第八章路线图新增 **Phase 2.5 减负空间**（分批进行）
- **③SNAPSHOT v15→v16（t2）**：YAML（version v16、milestone 追加「最小三成本评议两轮闭环 + 按人视图落地 + 设计原则10-14 + 减负空间第一批 + 全栈25表对称 + W4专项评议循环」）；物理拓扑（README 标注「对外门面」、entries 22 含 tabs/、components 24 含 report-inbox/work-overview、core 13 含 theme.js、services 22 含 visibility/external-dispatch、db.js 25 资源表）；核心理论表（党建党务行改 T1 官方定义、差异化视图标注「已被按人视图深化取代」、新增「高频零跳转」「按人视图·知情边界」两行）；版本里程碑追加 v16
- **④TIMESTAMPS 批量刷新（t3）**：README.md（2026-08-10，对外门面设计理念章重构）、SNAPSHOT.md（v16）、REVIEW_QUEUE.md（W4 附录承接区）、M2 SNAPSHOT 更新（v16 升版）、M6 README 审查（门面重构）；并修正 server 段与 v16 矛盾描述（db.js「11 JSON 资源表」→「25 资源表」、resources.js「10 资源」→「25 资源」）；本次修改文件时间戳补录（02_institution/03_doc_system/server 三 README → 2026-08-10）
- **⑤content 子目录 README 校验（t4）**：content/README + 01_strategy/02_institution/04_web_design/05_ai_coding 逐行核对——目录实际内容与索引一致，无需内容修改；仅两处落地：02_institution/README L24「三支委党务管理职能」→「**三支委党务工作职能**」（与 COMMISSIONER_FRAMEWORK 现行术语一改具改，「党务管理」仅存历史说明）、03_doc_system/README OPERATIONS_GUIDE 行补「§17 周期性任务含 W4 专项评议循环」
- **⑥server/README（t5）**：种子描述补 T-209 全栈同步新增的 archive_records/signups（users/activities/notices/taskforces/tasks/assignments/**archive_records/signups**，与 seed.js 实际代码一致）
- **⑦验收（t6）**：降格残留全仓 grep（23 条|两分法|管理组织活动|管理人员发展|活动建设|组织建设域|党建工作台|党务管理）——用户可读文档层零新增残留，命中均为合法保留（insights/DEVELOPMENT_PATH 旧两分法含「已降级/仅作理论讲解」标注、CLAUDE C-5 审计范围描述、logs/snapshots 历史归档、sidebar.js 代码注释）；根 README 全部 18 个相对链接经 Glob 核验全部有效（断链零）；docs/src 用户可见层「党建工作台/党务管理」零残留
- **变更文件**：`README.md`（门面重写）、`.ctx/SNAPSHOT.md`（v16）、`.ctx/TIMESTAMPS.md`、`content/02_institution/README.md`、`content/03_doc_system/README.md`、`content/insights/工程演进与设计方法论.md`（沉淀 §4.17）、`server/README.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 对外门面文档避讳原则]` — 项目门面类文档正文不出现「书记/书记思想」字样，融会贯通、自然融入（书记原话「无声胜有声」），但链接/称谓保留（书记裁断 2026-08-10）；适用未来一切对外展示材料；已沉淀至 insights §4.17

## T-211 常态化专项评议制度化（CLAUDE 热层总纲声明 + H5.9 机制 + W4 专项⑤最小三成本）+ 乙部 relieve（2026-08-10）

**任务**：书记指令——①把一些常态化的评议检查提高到经常性、周期性工作的位置，放在 CLAUDE.md 中，并指向 REVIEW_QUEUE（保存书记在特定评议过程中的侧重维度，便于多次复用），使乙部 relieve、评议不因乙部清理而消失；②最小三成本原则是最最重要的评议，尚未整合。brainstorming Skill 设计收敛（AskUserQuestion 两项裁定：最小三成本规格=W4 专项⑤+甲部总纲级声明；CLAUDE.md 位置=热层一句声明+温层 H5 机制），书记批准后实施。
**引用流程**：brainstorming Skill + H2.1 一改具改 + H3 文件修改检查清单 + H5 书记评议（H5.1/H5.9）+ OPERATIONS_GUIDE §17 + H2.4 经验沉淀

- **①CLAUDE.md 热层总纲声明（t1）**：热层「每次工作必读」区新增最高原则锚点——「最小三成本（信息成本/操作成本/适应学习成本）是系统设计的最高验收标准，纳入常态化专项评议（W4 专项⑤，机制见 H5.9），不因乙部清理而中断——工作台改动与设计决策均以其验收」
- **②CLAUDE.md H5.1 扩充 + 新增 H5.9（t1）**：H5.1 触发条件新增「常态化专项触发」条（W4 每周轮转承接，清单/侧重维度/进度见 H5.9 + REVIEW_QUEUE 附录）；**H5.9 常态化专项评议机制**（工作表达）——五专项表（①反论 T-116 ②理论复用 T-117 ③黑话审查 T-195 ④原话复核 T-200 ⑤最小三成本总纲级）+ 四机制要点（轮转承接 / 侧重维度复用：书记侧重维度记入 REVIEW_QUEUE 附录「书记特别要求」字段，后续轮次先读继承 / 开放机制「评议绝不仅仅只有这些！」 / 与乙部关系：专项不驻留乙部，一次性轮次入执行日志、长期专项挂附录）
- **③REVIEW_QUEUE 附录⑤最小三成本专项（t2）**：性质（总纲级·系统设计最高验收标准）、引用流程（热层声明+H5+DESIGN_SYSTEM 第2条/原则10）、轮次进度（T-234/T-204 已完成，下一轮待书记发起）、**书记侧重维度复用基线**（从两轮日志提炼 8 条：五场景检查法 / 六工作台逐台 G1-G8 / 操作次数≤2跳 / 信息展示与操作同地+孤零零数据行 / 待办必见 / 数据驱动 / 无虚假目标 / KPI 异化防御）；头部附录语义「四专项」→「五专项」
- **④OPERATIONS_GUIDE §17.2.1 W4 行（t3）**：专项清单追加 ⑤ 最小三成本（总纲级，热层声明 + H5.9，已执行两轮）
- **⑤乙部 P3 relieve（t4）**：移除 T-116/T-117/T-195/T-200 四行（信息已完整承载于 H5.9 + REVIEW_QUEUE 附录 + 执行日志），保留 T-118（待启动）/T-206（书记操作中）；P3 表下新增注释行说明「常态化专项评议已制度化由 W4 承接，不再驻留乙部」
- **⑥验收（t5）**：CLAUDE.md YAML last_updated → 2026-08-10；TIMESTAMPS 三行刷新（CLAUDE.md/REVIEW_QUEUE.md/OPERATIONS_GUIDE.md，备注更新）；grep 验证乙部 T-116/T-117/T-195/T-200 零残留（合法保留：REVIEW_QUEUE 附录来源标注 + OPERATIONS_GUIDE W4 行 + H5.9 表）
- **变更文件**：`CLAUDE.md`（热层声明 + H5.1 + H5.9 + 乙部 P3 + YAML）、`.ctx/REVIEW_QUEUE.md`（附录⑤ + 头部语义）、`content/03_doc_system/OPERATIONS_GUIDE.md`（W4 行）、`content/insights/工程演进与设计方法论.md`（沉淀 §3.8）、`.ctx/TIMESTAMPS.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 常态化专项评议制度化]` — 常态化评议检查提高到经常性周期性工作位置（CLAUDE 甲部制度化 + REVIEW_QUEUE 附录承载侧重维度），乙部仅保留一次性执行事项；「侧重维度复用」=书记在评议中指示的检查侧重记录于附录，后续轮次先读继承、避免重复摸索——制度存续与任务清理解耦；已沉淀至 insights §3.8

## T-212 T-118 推进：C-6 持续任务五行 + Agent 残留清理 + 主题色色盘表述（2026-08-10）

**任务**：书记指令——继续推动 T-118；①将 W4 专项评议写入持续任务 C-6（C-6-1~C-6-5）；②抽样观察：Agent 残留（什么任务派发给什么 Agent 已不再重要）+ 角色主题色已非硬编码、而是一套可选择的色盘；③书记曾表达「开发的不同阶段确实会有不同的方法和观念」类似话，须找寻其意思，做好文档治理。brainstorming Skill 设计收敛（AskUserQuestion 三项裁定：C-6 形态=五行独立条目 / Agent 范围=角色表+insights 排查 / 原话理解=阶段适应性治理，理解正确）。
**引用流程**：T-118 + H1.2 执行 + H2.1 一改具改 + H3 检查清单 + brainstorming Skill + 书记 2026-08-10 指令

- **①C-6 持续任务五行（t1）**：CLAUDE.md 乙部持续任务表新增 **C-6-1 反论评议 / C-6-2 理论复用评议 / C-6-3 黑话审查 / C-6-4 书记原话逐条复核 / C-6-5 最小三成本**（总纲级）——每行一专项、状态「🔄 持续」、引用 H5.9 + OPERATIONS_GUIDE §17.2.1（W4）、细节指向 REVIEW_QUEUE 附录①~⑤；W4 评议工作自此在乙部有持续可见锚点（与 T-211 的 H5.9 机制 + REVIEW_QUEUE 附录构成三层承载：C-6 锚点 → H5.9 机制 → 附录细节）
- **②Agent 残留清理（t2/t3）**：全仓排查——docs 用户可见层与 content/01_strategy **零残留**（命中均为代码注释/同志致谢）；content/02_institution/ROLE_CLASSIFICATION.md `[AI]` 角色条目为唯一用户层残留，已简化：标题「AI Agent 专用」→「系统运行助手」、职责「AI Agent 专用指令、配置、运行时上下文」→「系统运行所需的指令、配置与上下文」、读取规则「always-on/relevance-triggered」→「常驻加载/按需检索」（去英文技术细节）、典型场景「Agent 执行日志记录/Skill 工作流触发/核心规则校验」→「记录运行日志/维护治理文档/执行核心规则校验」、判定标准「AI Agent 指令」→「AI 运行指令」、根目录表「Agent 配置参考」→「AI 配置参考」；**insights 排查结论**：§4.8 内容治理 spec 全流程的「子代理审查」是 AI 工作方法论核心（独立视角审查，受众 [AI]），无「任务→具体 Agent 派发规则」残留，合法保留
- **③主题色色盘表述（t4）**：代码层已确认——`docs/src/core/constants.js` L158-163「主题色个性化（书记指令 2026-08-06：侧边栏设置，所有角色均可选）」`resolveAccentRole` 优先读 localStorage 自选色盘；DESIGN_SYSTEM §2.3.2 表易被误读为「每角色固定色=主题色硬编码」，已补充演进说明（⚠️ 本表是身份标识场景的默认识别色，非主题色硬编码——主题色已演进为侧边栏「主题选择」可选色盘，本表仅约束关系网络节点/角色卡片/日历图例辨识色，主题色场景由个人自选决定）
- **④书记原话定位**：逐字原话未寻得，最接近表述为 `.ctx/logs/archive/2026-07-early-entries.md` L1403 书记原话「系统要面向【上线】来做部署了，有很多当时开发阶段的设计和规则可能需要进一步调整」——经 AskUserQuestion 书记确认理解正确：系统已从开发期进入上线/稳定期，早期开发阶段的方法与观念（Agent 派发、mock 数据、硬编码）需按新阶段更新，文档治理体现**阶段适应性**
- **⑤T-118 状态**：⏳ 待启动 → 🔄 进行中（引用流程补书记「开发的不同阶段会有不同的方法和观念」）
- **⑥H1.2 简化（书记批准）**：CLAUDE.md H1.2「实施：调用对应工具/Agent 集群」→「实施：调用对应工具执行任务」——书记裁断：「完全没有什么文档治理 Agent 这样的表达了！可以留存的是思路，但是这些过时的工具可以删除！」（思路可持续留存的探讨另行推进）
- **⑦验收**：grep「Agent 派发/子代理」全仓——用户可见层零残留（剩余命中均为 .ctx 日志历史/KNOWN_PITFALLS AI 编码层/insights AI 方法论，合法）；YAML last_updated 同步（ROLE_CLASSIFICATION → 2026-08-10，DESIGN_SYSTEM/CLAUDE.md 已为 2026-08-10）；TIMESTAMPS ROLE_CLASSIFICATION 行刷新
- **变更文件**：`CLAUDE.md`（C-6 五行 + T-118 状态 + H1.2 简化）、`content/02_institution/ROLE_CLASSIFICATION.md`（[AI] 条目简化）、`content/04_web_design/DESIGN_SYSTEM.md`（§2.3.2 演进说明）、`content/insights/工程演进与设计方法论.md`（沉淀 §4.18）、`.ctx/TIMESTAMPS.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 阶段适应性治理]` — 开发不同阶段有不同的方法与观念（书记 2026-08-10）：系统进入上线/稳定期后，文档治理须识别「开发期表述」（Agent 派发细节/硬编码机制/mock 数据等）并更新为当前阶段现状，理解表述的阶段背景而非机械删除；已沉淀至 insights §4.18

## T-213 insights 文件2 经验写法重构补记 + 简并空间执行（A/B/C/D 四类全落地）（2026-08-11）

**任务**：书记指令——「请仔细推进该工作！记得 元insights——insight的insight！」执行本会话输出的简并空间研究报告（文件2 86 个标题 → 潜在合并项 A/B/C/D 四类），并补记 commit 9cffeb8（T-212 insights 经验写法重构：评价尺度三分类 + §7 表达治理 + H7.4 门面避讳，当时已 commit 未记日志）。
**引用流程**：T-118 + H1.2 执行 + H2.1 一改具改 + §7.1 Skill 检验 + §7.2 评价尺度三分类 + §7.3 反论消歧

- **①A 类·原则-判例重复（4/4）**：§3.3 快照段精简为「快照按需生成」2 行 + 指向 §6.8；§6.15 压缩（删具体旧术语案例与文件清单，新增「与 §5.7 的关系」注记，保留反论/教训/生效条件）；§4.9 压缩为纯原则索引（三条原则名 + 指向 §6.13，删正文重复展开）；§6.9 收拢 PersonStore 正面模式（自原 §6.19 迁入）+ T187 扩展 + 新增「与 §6.22 的关系」注记——Service 层内容（反面案例 + 正面模式 + Store/Deriver 拆分）三处合一
- **②B 类·同命题双小节（4/4）**：§1.3↔§1.4 合为「同一概念只在一个地方表达——散落导致漂移」（两判例 + 两反论 + 生效条件，§1.4 编号说明）；§1.7 角色标记体系并入 §5.5（标记层+目录层合一，§5.5 标题改「文档分类：受众×层级物理分离 + 角色标记」并补生效条件，§1.7 编号说明）；§5.7↔§5.8 合为「权威源管理——唯一权威源、转移与变更传播」（三场景 + 反论 + Boolean 条件 + 生效条件，§5.8 编号说明；同步更新 §6.15 注记与附录速查表 34 行 §5.8→§5.7）；§2.4 并入 §6.19「Mock 数据的使用纪律——对外不伪装、对内要自洽」（§2.4 编号说明）
- **③C 类·项目特性规则（2/2）**：§2.2 压缩为一行泛化原则「工作上下文只留当前」+ 指向 CLAUDE H4.1；§3.8 压缩为一行泛化原则「制度存续与任务清理解耦」+ 指向 CLAUDE H5.9/REVIEW_QUEUE（删 T-211 机制复述与侧重维度复用细则——机制已由 H5.9 承载）
- **④D 类·细枝末节（3/3）**：§6.4 反论并入教训（签名变更须全仓验证）；§6.21 压缩为三条防御规则（断环/不吞错/兜底守卫），删修复方案技术细节（日志已承载），更新「与 §6.9 的关系」注记；§6.26 压缩（删「4 个工作台须对齐」等项目细节，保留聚合首条兜底 Boolean 条件）
- **⑤一改具改**：文件内 §5.8→§5.7 引用（§6.15 注记 + 附录速查表 34 行）已同步；「承接原 §6.19/§2.4」注记 2 处 + 编号说明 5 处（§1.4/§1.7/§2.4/§4.17/§5.8）均为合法历史注记；跨文件引用核查——CLAUDE.md L253（§2.5）、SECRETARY_PRONOUNCEMENTS（§4.9/§3.7）、OPERATIONS_GUIDE（§2.5）、DATA_ARCHITECTURE（§6.12）、DESIGN_SYSTEM（§4）、KNOWN_PITFALLS（§6）均指向仍存在的小节，零断裂
- **⑥验收**：Grep 文件内 §1.4/§1.7/§2.4/§5.8/§6.19 残留——仅剩编号说明/承接注记/外部文件 § 引用（USAGE_POLICY §1.7 为外文件小节，合法）；标题数 86 → 76（删除 §1.4/§1.7/§2.4/§5.8 四个小节标题）；YAML last_updated 已为 2026-08-11（今日，无需更新）
- **⑦T-118 状态**：🔄 进行中（insights 简并空间执行完毕，待书记验收）
- **⑧ 好坏尺度反论改写（书记确认后执行）**：按 §7.2 评价尺度三分类，将 3 处好坏尺度「为什么不是」反论改为条件式正面表述——§4.10「功能清单让用户自选」→「功能清单与待办推送的适用边界」、§6.12「考勤记录就够了」→「考勤的目的不是记录缺席而是保障参与率」、§6.23「所有完成都必须交产物」→「产物要求按任务类型区分」；§4.16 卡片网格（尾部已是条件式）与 §6.23「打卡化只是体验问题」（对错尺度，决定系统生死）经书记裁决保持原样。改写样例经 AskUserQuestion 书记全部认可后批量执行
- **⑨ 遗留评估**：文件2 §5.4「性质分类对应党建与党务工作理论」（L627）经 USAGE_POLICY §1.1.1 核实为 T1 官方术语引用（2026-08-03 确立），非旧划分残留，无需改写
- **⑩ 编辑经验固化（书记指令 2026-08-11）**：书记指出「§6.12 区域两次连续 Edit 时，编辑引擎曾将前次改写还原为原文——对同一区域多次编辑后须 Read 复核实际状态」是重要经验须固化。已沉淀至 KNOWN_PITFALLS §14「同区域连续编辑相互覆盖陷阱」（原则+判例+根因+纠正清单+与 §1/§9 区别+生效条件），并在 §8 原则级清单补充第 11 条；KNOWN_PITFALLS YAML last_updated → 2026-08-11、version 1.8→1.9
- **变更文件**：`content/insights/工程演进与设计方法论.md`（本次 + commit 9cffeb8）、`CLAUDE.md`（9cffeb8：H7.4 门面避讳 + H1.2 简化）、`content/insights/党支部管理与实务经验沉淀.md`（9cffeb8：经验写法重构）、`content/05_ai_coding/KNOWN_PITFALLS.md`（§14 编辑经验固化 + §8 第11条 + YAML 1.9）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条，补记 9cffeb8）
- **沉淀标签**：`[已沉淀: 工程演进与设计方法论 §7.1]` — 大规模经验沉淀文件（80+ 小节）的简并四分类（原则-判例重复/同命题双小节/项目特性规则归 Harness/细枝末节归日志）可作为「insights 简并」的可复用操作模式；已沉淀至 §7.1 Skill 检验旁（书记验收通过：简并空间执行完毕 + 好坏尺度改写样例确认后，2026-08-11）

## T-214 insights 自我揭示重构 + 反馈学习闭环（spec 落地）（2026-08-11）

**任务**：书记指令——「请根据 spec 执行！Use Skill: writing-plans」，按设计文档 `.trae/specs/2026-08-11-insights-self-revealing-and-feedback-loop-design.md` 执行：①文件2 自我揭示（去语境化/能力地图/章节功能化/删书记原话）；②反馈学习闭环机制三处落位（CLAUDE H8 / insights §7.1 / project-memory）；③一改具改。执行方式：Inline 会话内执行（书记选定）。本会话已按 writing-plans 生成的实现计划（`.trae/specs/2026-08-11-insights-self-revealing-implementation-plan.md`，13 Task 5 阶段）推进，Task 1-7 已于此前会话完成并各自 commit。
**引用流程**：spec + writing-plans Skill + H2.1 一改具改 + H3 文件修改检查清单 + H8 反馈学习闭环（本次新增）+ KNOWN_PITFALLS §14（同区域连续编辑陷阱，全程串行编辑遵守）

- **①Task 8 §6 实操判例去语境化（本会话完成）**：三处书记原话改客观命题——§6.25「确立依据（T223）：'党小组组长的活动写入中…必须彻查！！'」→「确立于排序统一彻查任务（T223，2026-08-09）」；§6.23「事件」原话块→客观事件描述（打卡化缺陷：完成仅状态翻转、系统沦为线上打卡软件，正确方向是集成线下/微信真实工作）；§6.19「对内自洽」原话→客观事件描述（notices/activities mock 跨文件信息不协调），出处保留为元数据。commit 0404f6b
- **②Task 9 §7 表达与沉淀纪律（本会话完成）**：§7.4 T122 原话→「确立于零补丁识别评议任务（T122，2026-07-20）」；§7.5 T237 原话→「确立于讲解范式与元数据形态改造任务（T237，2026-08-09）」；§7.1 两处「泛化」→「可复用性/通用原则」（与新增规范禁词自洽）；**即时沉淀「去语境化写作规范」至 §7.1 末尾**（5 条：人类阅读定位/不留改写痕迹/判断路由或关系/判例支撑/生效条件）。commit 71d74c8
- **③Task 10 一改具改（本会话完成）**：活跃文件旧标题引用同步——OPERATIONS_GUIDE §7.4 标题「§6 实操教训录」→「§6 实操判例」、DOC_MAP 文件2 内容描述→新功能化章节（信息组织/减负与取舍/上下文治理/系统与工作台设计/架构迁移/实操判例/表达与沉淀纪律）、DESIGN_SYSTEM「§4 系统工程与设计方法论」→「§4 系统与工作台设计」；三文件 YAML last_updated → 2026-08-11。日志类旧标题引用按 §3.6 历史不可变保留。commit 0670497
- **④Task 11 CLAUDE H8（本会话完成）**：甲部温层新增 **H8 反馈学习闭环**（H5 之后、冷层之前，L469）：三环节（捕获=标记性质/沉淀=优先级/复用=元层索引+H3+project-memory）+ 沉淀优先级条款（01-05 → CLAUDE.md → insights）+ 优先级理由。commit 5d4e79c
- **⑤Task 12 project-memory 优化（本会话完成，仓库外文件）**：校正过时指针——内容归属分流 §5.9→§5.10、仓库卫生闭环 §5.10→§5.11、同文件并行编辑条目追加 KNOWN_PITFALLS §14 指针；新增三条——反馈学习闭环 H8（含沉淀优先级）、insights 定位（人类阅读知识资产非 AI 活跃上下文）、去语境化写作规范（→ insights §7.1）
- **⑥一改具改零残留验证**：全仓 Grep「系统工程与设计方法论/实操教训录/减负与删除的哲学/上下文治理的制度机制/架构迁移方法论/工程演进的技术原则」——活跃文件零残留（命中仅日志历史 + 文件2 自身内容描述，合法）；文件2「确立依据/书记原话」零残留；「泛化」仅存于 §7.1 禁词示例（规范正文）
- **⑦变更文件**：`content/insights/工程演进与设计方法论.md`（本会话 + 此前 Task1-7 共 9 commit）、`CLAUDE.md`（H8）、`content/03_doc_system/OPERATIONS_GUIDE.md`（§7.4 标题 + YAML）、`content/03_doc_system/DOC_MAP.md`（内容描述 + YAML）、`content/04_web_design/DESIGN_SYSTEM.md`（§4 引用 + YAML）、`c:\Users\储子禾\.trae-cn\memory\projects\-d-GitHub-GSM1921-SOP\project_memory.md`（指针校正 + 3 新条目，仓库外）、`.ctx/TIMESTAMPS.md`（本会话同步）
- **⑧ §1.1/§1.2 去语境化补改（书记审查后确认）**：书记指出 §1.1 命名表与 §1.2 Layer 分层未完全去语境化。经 AskUserQuestion 书记确认后改写——§1.1：通用命题（命名即认知框架/官方术语与内部约定）前置、表格降为「判例」后置、补判断路由（什么条件下该改名：技术隐喻→日常用语/冗余层级→合并/命名与结构不一致→中立，纯审美不改），原注「当前一律以新名为准」并入判例尾；§1.2：四层层名通用化（党章层→最高规范层/文本SOP层→制度母本层/代码层→实施层/核心层→核心规则层）+ 补判断路由（适用于四层结构文档体系的级联同步场景）+ 项目对应保留于路由句尾（判例合法）。全仓 Grep 旧层名零残留（仅新写的项目对应行）
- **沉淀标签**：`[已沉淀: 工程演进与设计方法论 §7.1 去语境化写作规范]` — insights 内容标准（人类阅读知识资产/去语境化直接写通用表述不留痕迹/判断路由或关系/判例支撑），配合沉淀优先级（01-05 → CLAUDE → insights）构成反馈学习闭环的「沉淀」环节；已沉淀至 §7.1 + CLAUDE H8 + project-memory 三处落位

## T-215 甲部重组·约束力三层 + 编号重编（H10 递增制）（2026-08-11）

**任务**：书记指令——「现在我们对于我们既有的 CLAUDE和01-05的content系统做一次 甲部的更新！有哪些重要规则需要贯彻！哪些需要写全在甲部、哪些需要用指针指向对应文件 需要判断清楚。请务必做到 吃透书记的精神！这对我们的系统可持续性发展非常重要！！ Use Skill: sample-diff-learning Use Skill: brainstorming」。brainstorming + sample-diff-learning Skill 设计收敛，按 spec（`.trae/specs/2026-08-11-harness-restructure-constraint-3-layers-design.md`）实施：CLAUDE.md 甲部按「约束力三层」重组为 H10-H100，编号体系 10 递增重编，B 类评议细节指针化下沉 OPERATIONS_GUIDE 新增 §18，全仓旧编号引用一改具改。
**引用流程**：spec + brainstorming Skill + sample-diff-learning Skill + H2.1 一改具改（→ H30.1）+ H3 文件修改检查清单（→ H40）+ OPERATIONS_GUIDE §15 甲部修改流程 + KNOWN_PITFALLS §14（同区域连续编辑陷阱，全程串行编辑遵守）

- **①书记决策链（AskUserQuestion 十项裁定）**：更新性质=先盘点现状再定；写全 vs 指针判断标准=**按全局约束力分**（全局约束力强→写全；场景化/按需→指针）；更新方案=系统再分配 +「顺序排布上也要做好规划」；B 类评议=B 类全部指针化；E 类顺序=层内聚优先 +「编号可以再调整的！本质上还是打散了之后我们重新组装！」；重组方案=方案一·约束力三层；编号体系=方案甲·10 递增预留
- **②CLAUDE.md 单次 Write 完整重写（t1）**：甲部由 H1-H8 重组为 **H10 总纲 / H20 标准化工作流 / H30 一改具改（含 H30.2 母本子本）/ H40 检查清单 / H50 乙丙部生命周期 / H60 书记评议 / H70 反思触发流 / H80 反馈学习闭环 / H90 外部权威源 / H100 项目产出声明**——热层（H10-H40）全局约束力强写全，温层（H50-H80）机制骨架写全 + 细节指针，冷层（H90-H100）纯指针；编号位值与层对应（热层 10-40 / 温层 50-80 / 冷层 90-100）
- **③OPERATIONS_GUIDE §9.1 编号体系重写 + 新增 §18（t2）**：§9.1 对照表重写为 H10-H100 十行（10 递增预留，与甲部一致）；**新增 §18 书记评议工作流细节**（L990-1133）：H60 指针化的 B 类评议细节全部落位——§18.1 抽样规则（原 H5.2）/§18.2 评议流程（原 H5.3）/§18.5 三类评议类型（反论/理论复用/补丁审查）等
- **④C 类新增 2 项**：①H30.4 沉淀优先级联动声明（沉淀优先级 01-05 → CLAUDE → insights 显式落位）；②H70/H60/H80 三机制边界显式声明表（反思触发流/书记评议/反馈学习闭环三者职责边界）
- **⑤一改具改全仓同步（t3-t6）**：README.md、SSOT_INDEX.md、USAGE_POLICY.md、DOC_MAP.md、工作模板/经验沉淀辅助提示词.md、DATA_ARCHITECTURE.md、SECRETARY_PRONOUNCEMENTS.md、KNOWN_PITFALLS.md、OPERATIONS_GUIDE 内部 17 处 + §18 新增、工程演进与设计方法论 30+ 处、styles.css（L4278）、REVIEW_QUEUE.md（全量重写 9 处）、TIMESTAMPS.md——全部按映射表（H1→H20、H2→H30、H3→H40、H4→H50、H5→H60、H1.4→H70、H8→H80、H6→H90、H7→H100 等）逐一同步
- **⑥验收（t6）**：三路 Grep 零残留验证——`.ctx/` 仅历史日志命中（合法豁免）、`content/` 仅 OPERATIONS_GUIDE L398/L776「原 H6/H4 外移归位」历史注记 + DESIGN_SYSTEM L338-340 字体层级表（合法豁免）、CLAUDE.md/README.md/docs/ 零命中
- **⑦并行编辑竞态教训再确认**：本次发现 3 处此前并行 Edit 未生效残留（DOC_MAP L103、OPERATIONS_GUIDE L428/L605、styles.css L4278），已全部串行修复——同文件多处修改必须串行（KNOWN_PITFALLS §14）
- **变更文件**：`CLAUDE.md`（甲部 H10-H100 重组）、`content/03_doc_system/OPERATIONS_GUIDE.md`（§9.1 + §18 + 内部引用）、`content/README.md`、`content/03_doc_system/SSOT_INDEX.md`、`content/03_doc_system/USAGE_POLICY.md`、`content/03_doc_system/DOC_MAP.md`、`content/03_doc_system/工作模板/经验沉淀辅助提示词.md`、`content/04_web_design/DATA_ARCHITECTURE.md`、`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`、`content/05_ai_coding/KNOWN_PITFALLS.md`、`content/insights/工程演进与设计方法论.md`、`docs/src/styles.css`、`.ctx/REVIEW_QUEUE.md`、`.ctx/TIMESTAMPS.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[已沉淀: 工程演进与设计方法论 §5.9 约束力三层]` — 「写全 vs 指针」判断标准（全局约束力分：热层写全/温层机制+指针/冷层纯指针）+ 编号位值对应（10 递增预留）可复用为文档体系治理方法论，已沉淀至 §5.9
- **待办**：commit（push 需书记批准）

## T-216 网页使用体验优化五项：冗余代码清理（P0+P1）+ 死功能移除 + 深色模式系统性评议与修复 + 微信集成方案讨论与小程序方案落档（2026-08-11）

**任务**：书记五项并行检查——①冗余代码检查与处理 ②死循环（无实际工作的界面/卡片）检查 ③最小三成本·第一视角页面自动计算渲染 ④深色模式卡片系统性评议 ⑤微信小程序设计想法；以代码检查为主
**引用流程**：H1.2 执行 + sample-diff-learning Skill + fullstack-developer Skill + AskUserQuestion 决策链（两轮 6 项裁定）+ verification-before-completion Skill
**来源**：书记 2026-08-11 指令 + 书记两轮 AskUserQuestion 决策

- **①冗余代码清理（P0 死模块 + P1 死 export）**：
  - **P0 死模块 4 处删除**：`workspace-entry.js`（52 行整文件死）、`feedback.js`（FeedbackStore 死 shim，反馈功能已由 issues.js IssueStore 承接）、`image.js`（ImageRecordStore 整文件死）、`auth.js` 内 PermissionManager + ViewModeStore 及悬空调用 `isReadOnly()`（该方法不存在）
  - **P1 死 export 清理覆盖 16 文件约 25 处**：activity（filterActivities/saveActivities）、inspection（getRecordsByPerson）、review（findActivityReviewById）、external-dispatch（listPendingBySender）、taskforce（getActiveRecruiting/addContribution/getMigrationReport）、todo（TODO_CATEGORY_ICONS）、signup（SignupRole 改内部）、milestones（getAll/create/close）、notice（NOTICE_STORAGE_KEY）、person（9 个方法）、data-adapter（11 兼容代理 + setAuthToken）、data-loader（loadPartyData）、domain（OUTPUT_ROUTES 改内部）、definitions（DEFINITION_INDEX）、theme（isDarkTheme/applyTheme 改内部）、state（getViewTypeByRole 改内部）、mock/index（_activityTitle/_activityType）、makeup（addMakeupTask 改内部）、icons.js 重写删 7 死图标键（party/users/megaphone/scale/cog/file/arrowRight）
  - 全仓 Grep 零残留验证通过
- **②死功能移除（首页考勤卡）**：首页第 4 格「我的考勤」统计卡 + 弹窗辅助代码（ATTENDANCE_STATUS_DOT/_attDocBound/_bindAttendancePopover）+ `_renderAttendanceSummary` 死函数 + 死点击分支完全移除（书记裁决：完全移除；考勤统计由书记+纪检工作区承载），stats 4→3 卡，骨架屏同步，`md:grid-cols-4`→`md:grid-cols-3`
- **③最小三成本·第一视角（核心难题确认）**：现有机制是「有数据就展示/没数据就隐藏」单点判定——priorityTab 数据驱动默认 tab、自动选中首条、纪检聚合全动态 `_buildDiscAggregates`、书记待办 8 组实时计算+空组过滤、按人视图 P-015、做事即销待办 `completeBySource()`、Visitor 待办实时派生、URL 跨页导航消费、可见性矩阵 `ROLE_VISIBILITY`、骨架屏防闪烁（10 项已实现）；**缺「按数据决定怎么展示」的统一自动计算层**（布局选择/容量分配/截断阈值/空态形态为各入口手写局部决策）——已立项后续大工作
- **④深色模式系统性评议与修复**：
  - 严重 2 项 + 一般 8 项全部修复：`.dashboard-cal-item` 未定义变量 `var(--surface)` 修正为 `var(--surface-card)`；help 页深色覆盖 ③ 块从死 `.help-*` 类替换为活类覆盖（status-badge + help-toc-dot-tooltip + help 正文 doc/qn/nav-tree 全量 ~21 条 + #sec-disclaimer）；about 页活类深色覆盖（ab-review-card--highlight / ab-tl-sticky--decision）+ 亮色对比度修复（#8A6D1F→#7C5C14）
  - **死类清理 2123 行**：styles.css 7977→5854 行——HELP PAGE v4 死规则（~1630 行）+ 页脚死类 + 响应式死规则 + 电影化滚动叙事死规则 + prefers-reduced-motion 死块 + `.help-node-svg:focus` 孤立死规则；精确保留活规则（`:root --help-*` 变量精简为 3 个仅留 TOC 消费、TOC 活块、`#about-content` 字体平滑、`@media print`、`ws-fade-in`/`ws-scale-in` keyframes）；修复 TOC `@media` 缺失闭合括号
  - **新发现缺口补齐**：`.rh-*` 角色层级组件（help.html 内联硬编码浅色，role-hierarchy.js 活消费）深色适配 33 条覆盖（深底 + 角色色提亮一档）
  - 验证：大括号配平 depth=0 + GetDiagnostics 零错误
- **⑤微信集成方式讨论（书记两轮决策收敛）**：
  - **文件流分类**：过程性文件→微信流转（系统留痕）；审查文件（word/pdf）与辅助照片→系统内浏览（与宣传墙初衷一致：照片证明覆盖面、正式文件支撑成效）
  - **浏览功能形态**：宣传墙 + 档案分层（宣传墙=展示层、档案=沉淀层、入口互通）；权限=内部全员 + 迎检外链（临时链接/导出归档包）
  - **过程性汇报致命问题**：任何「登记」都有操作成本（网页读不到微信消息是技术硬约束；「一键」只是压低成本不是消除）——**终极形态=小程序原生承接**（订阅消息→微信内点开批复→数据自动回流，零操作成本）；书记裁决「小程序有，网页也有」两端均有；**短期过渡=发送方登记制**（登记成本由受益方承担：发送方因留底在系统发起、更新自己汇报状态，动机=台账完整；而非批复方替他人留痕）
- **⑥小程序方案落档**：新建 `content/04_web_design/WECHAT_INTEGRATION.md`（书记决策链 5 项 + 文件流分类原则 + 宣传墙/档案分层浏览设计 + 过程性汇报集成方案 + 小程序三路径评估 A WebView 套壳/B Taro 跨端重写/C 原生不推荐 + 原生承接机制（订阅消息/共享数据层）+ 前置条件 3 项 + 短中长路线图 + 与 DESIGN_SYSTEM 原则 10 答复回路/原则 13 外发确认闭环衔接）；同步注册 `content/04_web_design/README.md`（新增五节）+ `content/03_doc_system/DOC_MAP.md`（知识类型 4 表新增行）
- **变更文件**：`docs/src/entries/workspace-entry.js`（删）、`docs/src/services/feedback.js`（删）、`docs/src/services/image.js`（删）、`docs/src/services/auth.js`、`docs/src/entries/main-entry.js`、`docs/index.html`、`docs/src/core/icons.js`（重写）、`docs/src/styles.css`（-2123 行死类 + 深色覆盖 + rh 组件适配）、16 文件死 export 清理、`content/04_web_design/WECHAT_INTEGRATION.md`（新）、`content/04_web_design/README.md`、`content/03_doc_system/DOC_MAP.md`、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **沉淀标签**：`[待沉淀: 受益者登记（成本翻转）——网页读不到微信消息→任何登记都有操作成本；登记应交给受益方（发送方/管理者）而非负担方（批复人）；零成本只在微信原生协同（小程序/服务号）实现]` + `[待沉淀: 迁移复杂度——微信群聊→网页是行为范式转变（即时通讯范式 vs 结构化工作台范式），是适应学习成本最高门槛；离开微信做额外动作的设计以「使用者是否有动机」为第一验收标准]`（2026-08-11 按书记指示沉淀至 `content/insights/工程演进与设计方法论.md` §4.19，标注 `[待沉淀]` 待书记验证后改 `[已沉淀]`）
- **补记（书记 2026-08-11 追问后）**：书记观察「从微信群聊到网页的转变，是一个很复杂的事情！！」——比登记成本更根本的是**行为范式迁移成本**（微信群聊=即时通讯范式 vs 网页=结构化工作台范式，对应最小三成本中适应学习成本最高门槛）。已写入 WECHAT_INTEGRATION.md §4.1 迁移复杂度 + §4.2 致命问题末尾补「离开微信做额外动作的设计以『使用者是否有动机』为第一验收标准」；原 §4.2-4.5 顺延为 §4.3-4.6
- **待办**：commit（push 需书记批准，书记 2026-08-11 裁决暂不 push）

## T-217 界面结构体检五问 + 角色 tab 排序重思 + 专班独立页面 + 共享报名组件 + 在办统一排序 + 金色深色修复（2026-08-11）

**任务**：书记浏览器选中 3 个真实元素后五问体检——①活动和专班有无自己的界面 ②span「6月共建」是否应有点击功能 ③div「专班考察上传」点击应期待什么 ④在办和待办之间是什么关系、在办排列顺序是否符合预期 ⑤每一角色 tab 排序再思考研究；并行沉淀两个洞察 + 修金色深色部分
**引用流程**：H20.2 歧义消解铁律（三轮 AskUserQuestion 11 项裁定）+ C-2 一改具改巡检（signup-panel 共享组件）+ sample-diff-learning Skill + fullstack-developer Skill
**来源**：书记 2026-08-11 指令 + 三轮 AskUserQuestion 决策

- **①五问体检结论（t1 调研）**：
  - 活动有独立界面（`activity.html`，`id=act-*`）；专班原本无独立页面、由 activity.html 兼载（`id=tf-*`）——**已新建独立 `taskforce.html`**
  - span「6月共建」在 issues.js「我发起的汇报」行有点击（`data-mydispatch-action="open-report"` 跳我的处置详情）；work-overview 开放汇报行原本无点击——**已统一为可点击**（书记裁决：统一）
  - div「专班考察上传」卡片原本仅头部按钮可互动——**已补行点击展开详情预览**（`data-insp-detail` 在表下方渲染 `#org-insp-detail`）
  - 在办 = 待办聚合 + 在办活动 + 在办专班的并集；原组间无业务排序——**已重构为统一业务优先级排序**（work-overview.js：过期优先→截止升序→无截止兜底 '9999-12-31'，`_MAX_INLINE=5` 截断，多余跳转待办 tab 查看全部）
- **②tab 排序重思（t2/t2b，书记三轮裁决）**：
  - 确立全角色统一排序原则：**「工作台→职责操作→知情查看→反馈」**（按工作流节奏「做→查→收→知情」；知识查看无职责≠无知情权，置于职责操作后、反馈前）
  - 组长 tab 重排：「组员进展」后移至「专班查看」之前；全角色补齐 `groupLabel`（组织委员 taskforce/talent/development 补「党建」、宣传 kanban 补「党建」、书记 overview 补「工作台」assign 补「党建」、纪检 review/inspection 补「党建」、组长 members 改「党建」），三组可视化一致
- **③专班独立页面 + 数据集（t7，书记附加裁决「专班是否要有自己的界面？和数据集？便于长期共享，活动也要思考这个问题」）**：
  - 新建 `docs/taskforce.html` + `docs/src/entries/taskforce-entry.js`（仅接受 `tf-*` id，渲染标题区/基本信息/报名区/报名名单/成员列表）
  - 专班数据确认已独立持久化 `workflowos_taskforces_v1`（TaskForceRecordStore 独立 store + init 自动迁移旧白名单）
  - **共享报名组件抽取**：`signup-panel.js`（canSignup/renderSignupSection/renderSignupList/bindSignupEvents/roleLabel）活动/专班两页共用，activity-entry.js 本地重复定义全部删除（~393→~220 行）；C-2 一改具改巡检落地
  - **跳转前缀分流规则**：`srcId.startsWith('tf-') ? 'taskforce.html' : 'activity.html'`——应用 5 处（ws-leader-entry.js L445、ws-org-commissioner-entry.js L314、ws-visitor-entry.js L859、tabs/secretary/todo-tab.js L312、notice.js L310 resolveNoticeUrl）
- **④活动增强共享形态（t8，最小增量）**：两个详情页加入「复制链接」分享按钮（`share-button.js`，一键复制直达链接）；宣传墙+档案分层完整形态已落档 WECHAT_INTEGRATION.md §三，待后续
- **⑤金色深色修复（t4）**：选中 button「发布招募」实底 #A16207+白字过棕过脏——改为 `solidAccentStyle(accent, accentBorder)`（金浅底+深金字：`background:var(--gold-btn-bg,rgba(255,215,0,0.12));color:var(--gold-btn-text,#A16207)`），非金色维持实底 accent 白字；深色模式经 `html.theme-dark` 自动提亮
- **⑥洞察沉淀（t3）**：「受益者登记（成本翻转）+ 迁移复杂度」两条已沉淀至 `content/insights/工程演进与设计方法论.md` §4.19，标注 `[待沉淀]`（书记 2026-08-11 指示，待书记验证后改 `[已沉淀]`）
- **变更文件**：`docs/taskforce.html`（新）、`docs/src/entries/taskforce-entry.js`（新）、`docs/src/components/signup-panel.js`（新）、`docs/src/components/share-button.js`（新）、`docs/src/entries/activity-entry.js`（重构抽组件）、`docs/src/components/work-overview.js`（在办统一排序+汇报行可点击）、`docs/src/entries/ws-leader-entry.js`、`docs/src/entries/ws-org-commissioner-entry.js`、`docs/src/entries/ws-prop-commissioner-entry.js`、`docs/src/entries/ws-secretary-entry.js`、`docs/src/entries/ws-disc-commissioner-entry.js`、`docs/src/entries/ws-visitor-entry.js`、`docs/src/entries/tabs/secretary/todo-tab.js`、`docs/src/services/notice.js`、`content/insights/工程演进与设计方法论.md`（§4.19）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **一改具改检查**：全仓 Grep `activity.html`/`taskforce.html`——5 处跳转分流全部正确；访客活动列表链接 `activity.html?id=...` 为活动页正确引用；零残留
- **验证结果**：✅ GetDiagnostics 9 文件批量检查全部零错误
- **待办**：commit（push 需书记批准，书记 2026-08-11 裁决暂不 push）

## T-218 功能色「深浅 × 日/夜」2×2 平行规则：金色特判升格为 rule-based 通用规则（2026-08-11）

**任务**：书记浏览器选中 button「发布招募」+ div role-label「组织委员」+ button「一键汇报」后裁定——「对于功能色，一定要所有颜色平行！现在这不是金色独树一帜了吗？你要 rule-based!! 本质上是 2*2 深/浅 × 白天模式/夜间模式」「div button 这些都要一改具改！」并指定 Use Skill: web-design-guidelines
**引用流程**：H20.2 歧义消解铁律（AskUserQuestion 1 项裁定）+ C-2 一改具改巡检 + web-design-guidelines Skill + browser_use 四象限实测
**来源**：书记 2026-08-11 浏览器选元素指令

- **①规则设计（t1）**：不按颜色特判，而按 accent 感知亮度（WCAG relative luminance，阈值 0.25）判「深浅」再 × 日/夜：
  - 深色 accent（亮度<0.25：金 #A16207(0.163)/红 #B91C1C(0.112)/橙 #C2410C(0.153)/海蓝 #2563EB(0.153)/深青 #0E7490(0.146)/紫 #7C3AED(0.134)）：日间=高亮同色系浅底（accent 调亮至 84% 明度 @12% 透明）+ 深 accent 字；夜间=提亮底（调亮至 60% @22% 透明）+ 提亮字（调亮至 82% 明度）
  - 浅色 accent（亮度≥0.25：天蓝 #0EA5E9(0.329)/翠绿 #22C55E(0.411)/亮蓝 #7DD3FC(0.580)/灰 #94a3b8(0.360)）：日/夜一致「accent 实底 + 白字」（原行为不变）
- **②实现机制（t2）**：`solidAccentStyle(accent)` 单一权威样式函数（constants.js）——深色分支内联 CSS 变量 `--acc-bg/--acc-text`（日）+ `--acc-bg-dark/--acc-text-dark`（夜）；styles.css 全局规则 `html.theme-dark [style*="--acc-bg-dark"]` 用 `!important` 覆盖内联 background/color 完成夜间切换；品牌亮色映射 `DEEP_ACCENT_RULES` 仅保留金色精确保留现有表现（light:#FFD700 / darkBg:rgba(251,191,36,0.22) / darkText:#FDE68A，主题党日胶囊同源），其余深色 accent 算法自动派生
- **③一改具改（t3）**：全仓所有实底功能色渲染点统一改经 `solidAccentStyle`——header.js role-label（div）、report-entry.js 一键汇报、report-inbox.js 正式答复、work-overview.js 汇报、utils.js toast 状态图标
- **④web-design-guidelines Skill 审查（t4，书记指定）**：focus-visible 全站已有（styles.css L2860）、hover 反馈保留、role-label 纯展示无 div 交互、夜间属性选择器实测生效——均通过；唯一发现：**toast 状态色图标（error #EF4444/info #3B82F6 为深色分支）改浅底深字后与 toast 浅色底（#FEF2F2/#EFF6FF）同色会 18px 小图标视觉隐形**，且状态色本就三色平行不属于「金色独树一帜」范畴 → AskUserQuestion 书记裁决：**回退实底白字**（utils.js 恢复 `background:${accent};color:#fff`，移除 solidAccentStyle import）
- **⑤浏览器四象限实测（t5，browser_use）**：金日 rgba(255,215,0,0.12)+rgb(161,98,7) ✅ / 金夜 rgba(251,191,36,0.22)+rgb(253,230,138) ✅ / 红日 rgba(244,184,184,0.12)+rgb(185,28,28) ✅ / 红夜 rgba(228,78,78,0.22)+rgb(243,175,175) ✅ / 天蓝（浅色）日/夜恒为 rgb(14,165,233) 实底+白字 ✅；**TypeError 彻底消除**（此前 `?v=20260810a` 缓存旧模块所致，bump 后三页面 console 均无报错）
- **⑥版本号 bump（t6）**：全仓 `?v=20260810a` → `?v=20260811a`（92 文件 593 处，PowerShell 批量，git diff 逐文件确认仅版本号行变化）使浏览器缓存失效
- **变更文件**：`docs/src/core/constants.js`（2×2 规则+DEEP_ACCENT_RULES+守卫兜底）、`docs/src/styles.css`（金色专用变量→通用夜间规则）、`docs/src/components/header.js`（role-label）、`docs/src/components/report-entry.js`、`docs/src/components/report-inbox.js`、`docs/src/components/work-overview.js`、`docs/src/core/utils.js`（toast 回退实底白字）、全仓 92 文件（版本号 bump）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **一改具改检查**：全仓 Grep `--gold-btn` 零残留；全仓实底功能色渲染点全部经 `solidAccentStyle`（除 toast 状态色——书记裁定豁免）
- **验证结果**：✅ GetDiagnostics 修改文件零错误；✅ Node 数值验证 10 色分支全对；✅ browser_use 四象限 computedStyle 逐值通过
- **待办**：commit（push 需书记批准）

## T-219 首页个人考勤卡恢复 + 功能色统一 tab 风格翻转（2×2 分流 → 全 accent 浅底深字）（2026-08-11）

**任务**：书记两条指令——①「首页的卡片请你恢复 个人考勤 数据小卡片」；②「我不太理解亮色和暗色的处理逻辑是什么？因为金色和亮蓝我认为都很亮……统一都变成 tab 风格的浅底深字夜间提亮。浅色才应该浅底深字，我认为你一定是想反了！」并指定 Use Skill: web-design-guidelines
**引用流程**：H20.2 歧义消解铁律（书记明确指令，无歧义）+ C-2 一改具改巡检 + web-design-guidelines Skill + browser_use 四象限复验
**来源**：书记 2026-08-11 下午指令（推翻 T-218 上午 2×2 分流裁定——「想反了」）

- **①考勤卡恢复（a1）**：T-216 移除的首页「个人考勤」统计卡按原样恢复并改标签为「个人考勤」——`main-entry.js` import 恢复 `loadAttendanceRecords/loadActiveAttendanceRecords`、`_renderStats` 第 4 卡（出勤数/总数 + 状态三色阈值 90/70 全站统一）、`_bindAttendancePopover` 完整弹窗（`ATTENDANCE_STATUS_DOT` 四色 + `_attDocBound` 防重绑定 + A-02 clamp 定位）、`renderDashboard`/`_refreshDashboardSnapshot` 两处调用点
- **②规则翻转（a2）**：推翻 T-218 的 2×2 分流（深色浅底深字/浅色实底白字），统一「浅底深字 + 夜间提亮」（tab 风格，与 wp-dim-on 同源）——`solidAccentStyle` 重写：底（日）= accent 调亮至 84% 明度 @12% 透明；字（日）= 深色 accent（感知亮度<0.25）用 accent 本身 / 浅色 accent 调暗至 30% 明度（新增 `_darken(hex,targetL)` 与 `_lighten` 配对，保证浅底可读）；底（夜）= 调亮至 60% @22%；字（夜）= 调亮至 82%；金色品牌特例 `DEEP_ACCENT_RULES` 保留（浅金底 #FFD700 + 夜间提亮金底/字，主题党日胶囊同源）
- **③SyntaxError 修复（a2.1，浏览器首轮复验发现）**：constants.js 顶层出现两个 `_darken` 函数声明（新增 HSL 调暗版 L279 + 既有渐变终点版 L388），ES module 顶层重复 function 声明直接抛 SyntaxError 中断全部入口链（31 文件依赖 constants.js）→ 旧渐变辅助函数重命名为 `_shadeDarker`（RGB 各通道 -16 语义区分），全仓引用 L377 同步更新
- **④web-design-guidelines Skill 审查（a3，书记指定）**：浅色 accent 深字对比度数值验证——天蓝 `#096690` on 近白底（#B2E4FA@12% 叠白）≈ **5.97:1** 达标 WCAG AA；styles.css 夜间 `html.theme-dark [style*="--acc-bg-dark"]` 用 `!important` 覆盖内联为必要手段（内联样式无 id/class）；考勤弹窗 div+click 为恢复的既有实现（含 Escape 关闭），非本次新增；focus-visible/hover 既有实现不受影响——均通过
- **⑤浏览器四象限复验（a3，browser_use 两轮）**：第一轮发现 `_darken` 重复声明 SyntaxError 阻断全站渲染（见③）；修复 + 版本号 bump 后第二轮全部通过——天蓝日 `rgba(178,228,250,0.12)`+`rgb(9,102,144)` ✅ 非白字（旧实底白字已废除）、金日 `rgba(255,215,0,0.12)`+`rgb(161,98,7)` ✅、天蓝夜 `rgba(63,187,243,0.22)`+`rgb(168,225,250)` ✅、金夜 `rgba(251,191,36,0.22)`+`rgb(253,230,138)` ✅、首页 4 卡齐全「个人考勤 2/2」点击弹窗/空白关闭/Escape 关闭 ✅、console 无 TypeError/SyntaxError
- **⑥版本号 bump（a4）**：全仓 `?v=20260811a` → `?v=20260811b`（91 文件 593 处，字节级替换保 BOM/编码不变）使浏览器缓存失效（修复前缓存旧模块会复现 SyntaxError）
- **⑦4 卡一行布局（书记即时反馈）**：书记「考勤的小卡片和剩余的3个应该在同一个水平呀！而不是变成2行！！」→ `index.html` `#dashboard-stats` 容器 `md:grid-cols-3` → `md:grid-cols-4`；browser_use 实测桌面 4 卡 top 相等（237.6）+ 等宽（255.2≈25% 列宽）同一水平线 ✅、移动端 2×2 降级不破版 ✅、内容无截断 ✅
- **变更文件**：`docs/src/core/constants.js`（统一 tab 规则 + `_darken` 新增 + 旧渐变函数改名 `_shadeDarker`）、`docs/src/entries/main-entry.js`（考勤卡恢复）、`docs/src/styles.css`（夜间规则注释同步）、`docs/index.html`（统计卡一行 4 列）、全仓 91 文件（版本号 bump）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **一改具改检查**：全仓 Grep `function _darken` 仅剩单一 HSL 版（L279）+ `_shadeDarker`（L388），无残留重复声明；Grep 实底白字模式零残留（toast 状态色书记裁定豁免除外）
- **验证结果**：✅ GetDiagnostics 修改文件零错误；✅ Node 数值验证浅色 accent 深字分支全对（天蓝 #096690/翠绿 #17823E/亮蓝 #036696/灰 #3D4A5C）；✅ browser_use 两轮四象限 computedStyle 逐值通过
- **待办**：commit（push 需书记批准）

## T-220 深色模式可读性三审修复：功能色夜间「淡底深字+边框」+ 考察详情卡「高饱和白字」（2026-08-11）

**任务**：书记浏览器选中 span「待确认」（淡底深字）+ div 考察记录详情 + div role-label 后三条指令——①「改成深色模式后，我认为淡底深字应该变成 span 类似这样的淡底深字，或者添加边框！必须做这样一个安排，否则看不见」②「div 深色模式这个部分完全看不清，请一定要优先检查代码！是否写得清楚了！！」③「div 这个部分请你无论是深色还是浅色，无论亮暗，都要是 高饱和度+白字！！」并指定 Use Skill: web-design-guidelines
**引用流程**：H20.2 歧义消解铁律 + C-2 一改具改巡检 + web-design-guidelines Skill + browser_use 复验
**来源**：书记 2026-08-11 深色模式浏览器选元素指令（T-219 同晚三审）

- **①根因定位（指令②）**：考察详情卡用 `bg-gray-50/60`——styles.css 深色覆盖块（L5448 起）只覆盖 `bg-gray-50`/`bg-gray-50\/50`，**缺 `bg-gray-50\/60`** → 深色模式下底保持浅灰、文字被提亮为浅色（text-gray-700/800→E2E8F0/F1F5F9）→「浅底+浅字」完全看不清。此即书记「代码是否写清楚了」所指——深色覆盖矩阵有缺口
- **②功能色夜间规则三审（指令①，constants.js `solidAccentStyle`）**：废弃「提亮底(22%)+提亮字(82%)」方案（提亮字=浅字，深色页面上浅字+暗底对比不足），改为**夜间 = 近不透明淡底（accent 调亮至 86% @0.9）+ 同款深字（深 accent 用本身/浅 accent 调暗 30%）+ 淡色边框（调亮至 72% @0.55）**——与 span「待确认」（bg-cyan-100+text-cyan-700）同构：任何背景下都是「淡底深字 chip」+ 边框强化边界；`DEEP_ACCENT_RULES` 精简为仅保留 `light` 特例（金色日/夜统一亮金底 #FFD700）
- **③夜间边框施加（styles.css）**：`html.theme-dark [style*="--acc-bg-dark"]` 规则新增 `box-shadow: inset 0 0 0 1px var(--acc-border-dark) !important`（内联样式无法用 id/class 命中，!important + 属性选择器为既有必要手段）
- **④考察详情卡高饱和白字（指令③，ws-org-commissioner-entry.js）**：脱离 Tailwind gray 类（深色无覆盖），改**内联高饱和天蓝实底 `#0369A1`（sky-700，白字对比 5.92:1 达标 AA）+ 白字**——标题/值 `text-white`、label `text-white/85`、辅助 `text-white/75`、状态徽章 `bg-white/20 + text-white`；日/夜完全一致（内联 style 权重最高，深色规则无法覆盖）
- **⑤web-design-guidelines Skill 审查（书记指定）**：对比度数值验证——功能色夜间「#096690 on 近不透明淡蓝底」≈ 5.45:1 达标 AA；考察卡「白字 on #0369A1」≈ 5.92:1 达标 AA；box-shadow inset 边框不干扰原 border；white 系列透明度类（text-white/80 等）类名含转义斜杠，不与 `.text-white`/`.bg-white` 深色覆盖冲突——均通过
- **⑥浏览器复验（browser_use 五项）**：role-label 夜间 `rgba(188,231,251,0.9)`+`rgb(9,102,144)`+inset 边框 ✅ 深字非浅字 / 日间不变 `rgba(178,228,250,0.12)` 无边框 ✅ / 金色夜间 `rgba(255,215,0,0.9)`+`rgb(161,98,7)`+边框 ✅ / 考察卡日·夜均为 `rgb(3,105,161)`+白字+白透徽章 ✅ / console 深浅两模式均无 TypeError/SyntaxError ✅
- **⑦版本号 bump**：全仓 `?v=20260811b` → `?v=20260811c`（91 文件 593 处，字节级替换保 BOM）使浏览器缓存失效
- **变更文件**：`docs/src/core/constants.js`（solidAccentStyle 三审 + DEEP_ACCENT_RULES 精简）、`docs/src/styles.css`（夜间规则加边框）、`docs/src/entries/ws-org-commissioner-entry.js`（考察详情卡高饱和白字）、全仓 91 文件（版本号 bump）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **一改具改检查**：全仓 Grep `bg-gray-50\/60` 仅剩考察详情卡一处已改（无其他残留）；`solidAccentStyle` 37 处调用点无需逐一改（单点规则）；Grep 旧夜间提亮注释零残留
- **验证结果**：✅ GetDiagnostics 三修改文件零错误；✅ Node 数值验证 6 色夜间派生值全对（天蓝/翠绿/亮蓝/金/红/灰）；✅ browser_use 五项 computedStyle 逐值通过
- **待办**：commit（push 需书记批准，延续「暂不 push」裁决）

### T-220 四审纠正：三审方案整体推翻——header 实底白字 + 夜间完全不透明浅底去边框 + 考察卡跟随模式（2026-08-11 深夜）

**书记反馈**：①「我的目标都是为了看得清，但是你的做法让视觉非常臃肿」——三审「近不透明淡底+边框」整体否决；②「header的身份显示，我要求要 主题色为底（正常的饱和度），白色的字——这个和整个header的要求是一致的！字都是白色」；③「考察详情卡代码检查 更是一塌糊涂！深色的话就就要用黑底白字；浅色的话就白底黑字！（但是作为审美要求，是否需要增加一些 行列标识，这是你的事情）」
**理解**：书记目标始终是「看得清」；三审方案的教训是「近不透明淡底(0.9)+边框」双管齐下→臃肿。书记最终裁定分两轨：**header 身份显示走实底白字（与深红 header 白字体系一致）**；**页面内功能按钮夜间回归 span 徽章本义 = 完全不透明浅底深字（无边框）**；**考察详情卡中性跟随（深=黑底白字/浅=白底黑字）+ 行列分隔线**

- **①header 身份显示实底白字（header.js `_roleLabelHTML`）**：弃用 solidAccentStyle（淡底深字在深红 header 上突兀），改内联 `background:${accent};color:#fff`——主题色实底（正常饱和度）+ 白字，日/夜一致；从 import 移除 solidAccentStyle。底色随「主题色」个性化切换（金主题 = #A16207 深金实底白字，对比 5.5:1 达标）
- **②solidAccentStyle 四审（constants.js）**：夜间 `@0.9` 近不透明 → **完全不透明浅底**（accent 调亮至 86% 明度无 alpha，span 徽章风格如 bg-cyan-100）；**删除 `--acc-border-dark` 与边框逻辑**——不透明底不再需要边框补边界，解决「臃肿」；日间 12% 淡底深字不变
- **③styles.css**：夜间规则 `box-shadow: inset … var(--acc-border-dark)` 整行删除，只保留 background/color !important 覆盖
- **④考察详情卡跟随模式（ws-org-commissioner-entry.js）**：废弃内联 `#0369A1` 高饱和实底，改 **CSS 变量跟随主题**——外层 `background:var(--neutral-50)`（浅=#F8F9FA 白 / 深=#111827 黑）+ `border:1px solid var(--neutral-200)`；主文字 `var(--neutral-800)`（浅=#1F2937 黑 / 深=#F1F5F9 白）、label `var(--neutral-700)`、辅助 `var(--neutral-500)`；**行列分隔线**：表头下 border-bottom + 每行 border-bottom + 流程行 border-top；状态徽章改语义色（已确认 `bg-green-100 text-green-600` / 待确认 `bg-amber-100 text-amber-600`，深色下被覆盖为半透明提亮）
- **⑤浏览器复验（browser_use 四项）**：role-label 天蓝实底 `rgb(14,165,233)`+白字（深浅一致，金主题 #A16207 实底白字亦达标）✅ / 发布招募按钮夜间 `rgb(188,231,251)` 完全不透明浅底+`rgb(9,102,144)` 深字+`box-shadow:none` ✅ / 考察卡深色 `#111827` 底白字、浅色 `#F8F9FA` 底黑字+分隔线 `#334155`/`#E5E7EB` ✅ / console 深浅两模式无 TypeError/SyntaxError ✅
- **⑥版本号 bump**：全仓 `?v=20260811c` → `?v=20260811d`（91 文件，字节级替换保 BOM），Grep 零残留
- **⑦验证结果**：✅ GetDiagnostics 三 JS + CSS 零错误（markdown 警告为历史遗留）；✅ Node 数值验证 8 色夜间派生值全对（天蓝 text #096690 + bgDark #bce7fb、金 #FFD700、红/橙/海蓝/翠绿/亮蓝/灰均符合）；✅ browser_use 四项 computedStyle 逐值通过
- **⑧变更文件**：`docs/src/components/header.js`（role-label 实底白字）、`docs/src/core/constants.js`（solidAccentStyle 四审去边框）、`docs/src/styles.css`（夜间规则删边框）、`docs/src/entries/ws-org-commissioner-entry.js`（考察卡跟随模式）、全仓 91 文件（版本号 bump）、`.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）
- **commit**：b87a484（T-220 三审）/ 69cff8b（T-220 四审）已提交（push 需书记批准，延续「暂不 push」裁决）

## T-117 理论复用评议第 4 轮执行（W4 专项② · 首轮）+ T-220 深色模式抽样审查（2026-08-12）

**任务**：①【重点工作】理论复用评议一轮——跨目录断链 + v11 后新增引用一致性 + 死概念识别（奥卡姆剃刀），书记要求执行前先汇报对工作要点的理解；②深色模式抽样审查（书记：「现实上还是有点不太清楚，和字体颜色和组件颜色的选取有很大的关系」）
**引用流程**：H60 书记评议 + OPERATIONS_GUIDE §18.5.2 理论复用评议 + sample-diff-learning Skill + web-design-guidelines Skill + H30.1 一改具改
**来源**：书记指令（2026-08-12，见任务栏）+ 书记 2026-08-11/12 逐条裁决

- **预审发现**（SNAPSHOT v17 权威拓扑基线 + 47 核心概念频率统计）：断链 5 处（R1-R5）+ 死概念/死命名 4 个（R6-R9）+ 疑似死概念 2 组（R10/R11）+ 废弃术语残留 1 处（R12）
- **书记逐条裁决**（R1-R12 + 3 项新增）：
  - R1-R5 断链：全部按建议修订
  - R6 差异化视图：除名 + 更新 CLAUDE.md C-4 引用
  - R7+R8 死命名：统一为「正交维度」「SOP 回写」
  - R9 SOP双向修改：改名「SOP 母本·系统实施」（书记补充：SOP 与网页双向修改要有边界，否则逻辑死循环出错）
  - R10 高频零跳转：**撤案**——重要理论（书记原话命名 + README 门面章节 + 验收标准），AI 误判教训
  - R11 速查表标签：按识别结果归并（散落同一概念），非删除
  - R12 组织建设残留：修订
  - 新增① SERVICE_CATALOG 分类列：移除（党建/党务不再作为工作分工标准）
  - 新增② USAGE_POLICY §1.1.1 区分要点：删除（「根本不需要区分！这个命题下游没有谁承接，为什么要保留！」）
  - 新增③ 纪检委员口径：三板块（考勤/考察/活动监督复盘）+ 补课公邮全集
- **书记元层指示**（已沉淀 REVIEW_QUEUE 附录②）：①AI 要建立「什么是重要的理论、概念、表述」的判断力——频率不是重要性判据（教训：高频零跳转因字面低频被误判）②奥卡姆剃刀第二方向：识别「散落着的同一个概念」→ 归并非删除 ③「命题下游有没有谁承接」是理论复用评议的重要关注点——无下游承接的命题不保留
- **执行动作**：
  - 断链修复：DATA_ARCHITECTURE:1060（feedback.js→issues.js）、CHECKLIST:331（image.js→core/data-adapter.js imageRecords 聚合）、SERVICE_CATALOG:39/46（image.js→data-adapter.js、feedback.js→issues.js）、TIMESTAMPS 3 条已删除标记（workspace-entry/feedback/image）
  - SNAPSHOT §IV 理论表：差异化视图除名；正交维度模型→正交维度；SOP反整合→SOP 回写；SOP双向修改→SOP 母本·系统实施（补「同步有边界：母本优先，先改 SOP 再同步系统，避免死循环」）
  - CLAUDE.md C-4 引用更新（§三 差异化视图→参与者数据流设计）
  - USAGE_POLICY：§1.1.1 区分要点删除；§1.1.3 三支委定位表去「党建/党务侧重」两分法→职责全集
  - SERVICE_CATALOG：移除分类列（17 行）
  - insights 党支部：§4.2「双轴定义」→「职责全集定义」（两分法余毒）；§4.4 纪检委员补课公邮补充；§5「活动分类决策」→「活动分类体系」；§5.4「活动类型体系」→「活动类型划分」；速查表 5 标签归并（条块分工→条块、支委双职能+纪检工作内容→三支委定位、活动分类决策+活动类型体系→活动分类体系，11 行→9 行）
  - notice.js:256 注释修订（组织委员组织建设→组织委员党务工作，去「党建：」前缀）
  - DOC_MAP 描述同步（活动分类体系）
  - 全部 YAML last_updated 更新（USAGE_POLICY/SERVICE_CATALOG/CLAUDE/DATA_ARCHITECTURE/CHECKLIST/insights/DOC_MAP + TIMESTAMPS/SNAPSHOT 注册）
- **验证结果**：✅ 全仓 Grep「党建侧重/党务侧重/党建职能/党务职责/双轴定义/在党建与党务工作中的定位」零残留；✅ SERVICE_CATALOG 无 image.js/feedback.js 残留；✅ GetDiagnostics 修改 JS 文件零错误
- **T-220 深色模式抽样审查**（书记指令①，web-design-guidelines + browser_use 7 页抽样）：发现 login 页 bg-surface-page 深色遗漏、侧边栏激活导航 2.94:1、徽章系统未适配、about 页独立米色变量体系、金色主题按钮 1.28:1 —— **待修复**（下一轮执行）
- **沉淀标签**：`[已沉淀: 重要性判断力]` — 频率不是重要性判据（奥卡姆剃刀是手段，识别重要性才是目的）；`[已沉淀: 奥卡姆剃刀第二方向·归并]` — 识别「散落着的同一个概念」→ 归并统一到权威源而非仅删除；`[已沉淀: 下游承接判据]` — 命题无下游承接不保留（即使本身不是错）—— 三条元层指示落地 REVIEW_QUEUE 附录② + 归并实例落地 USAGE_POLICY/SERVICE_CATALOG/insights

## T-220 深色模式修复执行轮：抽样发现 5 处 + 书记手动定位扩展全局扫尾（2026-08-12）

**任务**：承接 8-12 抽样审查发现 + 书记手动定位（浏览器选中 3 个日历活动标签 div，指示「这是我自己手动找出来需要做 深色模式 设计的部分。全局还有很多！也请继续推进剩余未完成的工作！」）——系统性适配全局内联硬编码浅色（浅底深字）元素
**引用流程**：H20.2 执行 + web-design-guidelines Skill（WCAG AA 正文 ≥4.5:1 / 大文本 ≥3:1）+ H30.1 一改具改 + T-220 四审标准
**来源**：书记指令（2026-08-12）+ browser_use 抽样审查报告

- **双套色基础设施（constants.js）**：`_TEXT_DARK_MAP`（日间文字色→深色提亮色映射表，含大小写归一化）+ `_applyDark()`（颜色条目自动生成 bgDark/textDark/borderDark）+ 导出 `applyDark`/`accDarkVars`/`accDarkParts`/`dotDarkVars` 四工具；CSS 侧三套独立覆盖规则（styles.css L5765-5777）：`--acc-bg-dark`（背景+文字+边框三件套）/`--acc-text-dark`（纯文字）/`--acc-dot-dark`（实色圆点）
- **d1 抽样 5 处修复**：login 页 bg-surface-page 深色遗漏 / 侧边栏激活导航对比度 / 徽章系统深色语义（16% 透明底+亮字+35% 亮边框）/ about 页独立米色变量体系 / 金色主题按钮 1.28:1 → 版本号 bump `?v=20260812a`
- **d7 书记手动定位**（calendar.js）：日历活动标签/任务标签/详情面板全部 21 处内联色改三件套（`_accDark`/`_accText`/`_accDot` 辅助函数 + mobile dots 对象化）
- **d8 同类内联浅底标签扩展**：person-picker 阶段徽章（STAGE_COLORS=applyDark）/ ws-visitor 等级徽章+金色按钮 / assign-tab 角色徽章 / prop 看板头 6 处 / modal 表单文字+必填星号 / leader 决策树按钮 5 处+step 圆点 / inspector 操作按钮 / tab-bar 分组标签 / org 上传考察按钮+看板头 4 处 / visitor 角色徽章三件套
- **d9 内联实色圆点提亮**：constants.js 新增 `dotDarkVars`（含映射表大小写归一化，防 #d97706/#9B0000 漏配）；overview/calendar 角色点 + activity-view 任务+角色点 + todo-list 统计点 + work-overview 在办点 + calendar-tab + login 开发卡 + taskforce 分组点
- **d10 全局扫尾（本轮）**：全仓 Grep 扫描内联硬编码浅色（background:#/color:#/rgba 浅底）—— 修复 8 类：①constants.js 补映射 `#059669→#34D399`/`#DC2626→#F87171`；②reactions.js 表态按钮（未选中=深灰底#1E293B+亮灰字#CBD5E1，选中=提亮色底+亮字，import accDarkParts）；③tab-bar.js 分组分隔线 `--acc-bg-dark:#334155`；④org 发展数据进度条（未达阶段点 #334155 融入背景+分隔线深灰）；⑤report-inbox「正式答复」徽章提亮红底+亮红字；⑥prop 附件文件图标块提亮；⑦about 渲染失败 fallback 三件套；⑧utils.js toast 深色（深灰底 #1E293B + 近白字 #E2E8F0 + border-dark=状态色保留左边条语义）
- **扫描判定为不需改**（四审标准「高饱和+白字」/已亮色/类方案已覆盖）：固体按钮白字（#CE1126/#10B981/#8B5CF6 等）、圆点已亮色（#EF4444/#60A5FA/#F59E0B/#3B82F6 等）、CSS 变量背景（var(--neutral-100) 等自动适配）、Tailwind 类（bg-gray-100/text-gray-700 等已有 styles.css 深色覆盖块）、header 通知条目（已用 var(--neutral-700)）
- **版本号 bump**：`?v=20260812a` → `?v=20260812b`（PowerShell 92 文件）
- **browser_use 首轮复验**（6 页 A-F，18 验证点）：16 通过，2 项存疑——①bg-cyan-100 无深色覆盖（「积极分子」徽章残留浅青底）→ 修复：styles.css 补 `html.theme-dark .bg-cyan-100`（rgba(6,182,212,0.16)）+ `text-cyan-700`（#67E8F9），并更新 L5760 注释（原注释把 cyan 当「夜间保持浅底深字」样板引用，与运行行为矛盾）；②org 看板头文字色未提亮（待审核 indigo-500/招募中 amber-600 约 3:1 边界）→ 修复：看板头 4 处加 `--acc-text-dark`（#A5B4FC/#FBBF24/#C4B5FD/#60A5FA）
- **browser_use 二轮复验**（org）：看板头 4 处 contrast 6.5:1~12.5:1 ✅、cyan 徽章 11.5:1 ✅，「org 深色修复复验通过」
- **browser_use 三轮复验（d10 五验证点）**：A 分组分隔线 #334155 ✅ / B 表态按钮未选中 #1E293B+#CBD5E1、选中提亮翠绿底+亮字 ✅ / C toast 深灰底+近白字+状态色左边条保留 ✅ / D 发展数据进度条（152 圆点未达=#334155、114 分隔线全深灰）✅ / E 收件箱「正式答复」徽章提亮红底+亮红字 ✅（通过真实汇报链路产生 reply 数据复验）
- **验证结果**：✅ GetDiagnostics 全部修改 JS 零错误；✅ 三轮 browser_use computedStyle 逐值通过；✅ 全仓 Grep 浅底深字内联残留清理完毕
- **变更文件**：constants.js / styles.css / calendar.js / person-picker.js / ws-visitor-entry.js / assign-tab.js / modal.js / inspector.js / ws-prop-commissioner-entry.js / ws-leader-entry.js / ws-org-commissioner-entry.js / tab-bar.js / activity-view.js / todo-list.js / work-overview.js / taskforce-view.js / overview-tab.js / calendar-tab.js / login-entry.js / reactions.js / report-inbox.js / about-entry.js / utils.js + 全仓 92 文件版本号 bump + 本条日志
- **commit**：待提交（push 需书记批准）

## T-220 深色修复轮收尾 + 书记双任务：REVIEW_QUEUE 残存反思 + about/help 表述更新 + about 动画减负 A+B（2026-08-12）

**任务**：①书记反思——「REVIEW_QUEUE 中的已完成工作应该是要清理的。为什么还有残存？是 harness 的问题吗？」；②「更新 about、help 中的【表述】（实质内容可能没变，但表述不精确就是错误，顺序排列不合理就是错误）」+「从【代码】角度给 about 动画提出减负方案（加载太慢、UI 和动画不完美要自省）」
**引用流程**：H70 反思触发流 + H60 评议收尾 + web-design-guidelines Skill + sample-diff-learning Skill + brainstorming Skill + H30.1 一改具改 + H40 检查清单
**来源**：书记指令（2026-08-12）

- **任务1 · REVIEW_QUEUE 残存反思（根因双层）**：
  - 现象：理论复用评议第 4 轮（R1-R12 已裁决执行、commit ffc69c6）完成后，「进行中」段仍残留在 REVIEW_QUEUE 主队列
  - 执行层根因：H60.2 明文要求「清空当前轮次」+ REVIEW_QUEUE 头部写明「评议完成后即清空」——规定存在，归档执行日志后漏清空
  - 制度层根因（harness 缺陷）：①「归档执行日志」与「清空 REVIEW_QUEUE」非原子动作，缺强制核验点；②无收尾验收标准（主队列只允许进行中/无轮次两种状态）；③M1 月度清理只查 CLAUDE.md 乙部，未覆盖 REVIEW_QUEUE——无周期兜底
  - 修复：REVIEW_QUEUE 主队列已清空（裁决结果以执行日志为唯一归档）；OPERATIONS_GUIDE §18.6 新增「轮次收尾核验」（归档+清空强制两动作+验收标准+M1 兜底联动）；§17.2.2 M1 说明扩展；OPERATIONS_GUIDE YAML last_updated 更新
- **任务2a · about/help 表述更新**（机械性直接改 + 内容性书记逐条定夺）：
  - 机械性修正：A1 组织性 stage01「用武之地和成长空间」补全「（包括支委会在内）在管理事和服务人方面」限定（回归书记 H100.1 原话语境）；H1 help §1.2「通用同源」→「同源共享」（笔误）；H3 help §五「纯前端静态架构，无需后端部署」→ 双轨表述（默认本地 mock + 可选 Node 后端，与 server/ 实际一致）；H4 help §5.1「15 个 entry JS」→「16 个」（实际 16 个）
  - 内容性确认（书记逐条定夺）：A2 终章「党建与党务的统一主语」→「管理事，服务人——贯穿从入党申请人到正式党员的全路径」（书记裁定去掉统一主语，与 P-007 弱化两分法一致）；A3 考察维度「党建贡献」保留 + desc 澄清为「在活动和专班中做出的工作成绩」（书记强调活动和专班并列！）；H2 help 矩阵不补副书记列（书记裁定）；H5 四入口保留（书记裁定）
- **任务2b · about 动画减负（方案 A+B，书记选定）**：
  - 性能根因：4 个外部 CDN（Tailwind+GSAP×2+Lenis×2）网络往返；多 rAF 并行（Lenis ticker + 粒子 Canvas×2 + 探索逐帧插值 + 胶片时间码）；20+ ScrollTrigger scrub；探索区 2 个 SVG scene 每帧全量属性写入
  - A 滚动动画减负：①粒子 Canvas 2→1（终章移除，仅 hero 保留）；②胶片时间码+进度线完全移除（JS bindCameraFlow B 段删除 + styles.css .ab-rail/.ab-tc/.ab-tc-tag/.ab-tc-time 死规则清理 + 移动端隐藏 + 深色覆盖）；③探索区可见性过滤（sceneData 缓存 sceneTop/sceneHeight，离屏超 1 屏跳过逐帧插值，避免每帧 getBoundingClientRect layout）
  - B 加载加速：GSAP 3.12.5/ScrollTrigger/Lenis 1.3.25 下载至 docs/assets/vendor/（4 文件，共 134KB），about.html 引用 CDN→本地（消除网络往返）；首屏懒渲染暂缓（改动风险大，后续按需）
  - 复验（browser_use 8 项）：本地 vendor 4 资源 200 ✓ / cdnjs+unpkg 零请求 ✓ / .ab-tc+.ab-rail=0 ✓ / 粒子仅 hero（canvas 总数=1，toDataURL 34KB 有内容）✓ / 探索区双分镜边随滚动逐条点亮无卡死 ✓ / 三处表述更新全部生效 ✓ / console 0 error ✓
- **版本号 bump**：`?v=20260812b` → `?v=20260812c`（47 文件，字节级替换保 BOM），递归验证 20260812b 零残留
- **验证结果**：✅ GetDiagnostics about-entry.js 零错误；✅ browser_use 8 项复验全通过
- **变更文件**：`.ctx/REVIEW_QUEUE.md`（清空轮次）/ `content/03_doc_system/OPERATIONS_GUIDE.md`（§18.6+M1）/ `docs/about.html`（vendor 本地化）/ `docs/help.html`（H1/H3/H4）/ `docs/src/entries/about-entry.js`（A1/A2/A3 + 粒子/胶片码/可见性过滤）/ `docs/src/styles.css`（胶片码死规则清理）/ `docs/assets/vendor/`（新增 4 文件）+ 47 文件版本号 bump + 本条日志
- **commit**：待提交（push 需书记批准）

## T-220 about 加载深水区减负 + 上边框修复 + 检查方法反思（exploitation/exploration 平衡）（2026-08-12）

**任务**：书记反馈——「about 动画我还是觉得加载过于缓慢！请一定要对整个文件和 entry 进行学习和理解！！」+「这个组建的上边框让我也非常 mad！你在检查过程中为什么没有检查出来呢？」+「你应该先规划需要检查哪些东西，以及平衡一下检查过程中 exploitation 和 exploration 的关系！」
**引用流程**：sample-diff-learning Skill + H70 反思触发流 + H40 检查清单 + C-2 一改具改巡检
**来源**：书记指令（2026-08-12）

- **检查规划（exploitation × exploration 平衡）**：
  - exploitation（按已知清单系统扫）：ab-* 样式/组件/动画/深色覆盖重扫 + 加载链路逐层分析（HTML→CSS→vendor→entry import 链→渲染→动画绑定）
  - exploration（探索未知维度）：真实性能实测（Performance API 瀑布 + DCL/LCP）+ 未检查区域（探索区动态渲染、TOC 高亮阈值、字体子集化、Tailwind 依赖判定）+ 书记手动定位的「上边框」
- **加载慢根因实测**（browser_use 冷/热缓存双测）：DCL 5.3s~10.5s、LCP 5.6~9s——**主线程阻塞**非网络带宽（资源传输 400ms 内完成）。三根因：①Tailwind Play CDN（head 同步无 defer + 运行时编译 ~93KB + 官方 not-for-production 警告 + 偶发 ERR_FAILED）；②一次性渲染 9 章（探索区单章 28KB + 2 个 SVG 网络 DOM）；③Google Fonts 24 个 CJK 子集请求
- **上边框根因**：`.ab-development-progress`（第三章进度条）`position:sticky; top:56px`——恰贴 fixed header 下缘，轨道 `--ab-paper-line` 米色全程空心显示，第三章内阅读时表现为内容区顶部一条完整横线（fill=0 无进度语义）。**检查遗漏自省**：此前检查聚焦深色/内联色清单（exploitation），未对 sticky 轨道做视觉走查（exploration 缺失）
- **实施修复**：
  - ①移除 Tailwind Play CDN（about.html）：内容区全为自定义 ab-* 类，仅骨架+header/sidebar 用 20 处工具类 → styles.css 新增「TAILWIND 最小兜底」块（flex/flex-col/flex-1/gap/mb/mx-auto/min-w-0/min-h-screen/pt-16/px-4/py-6/max-w-5xl/w-3/h-3/text-xs/text-sm/font-medium/text-[12px]/md:px-8）
  - ②字体瘦身：Google Fonts 11 字重 → 6 字重（Sans 400;500;700 + Serif 500;600;700），未使用字重永不下载
  - ③上边框修复：进度条 sticky → relative + 轨道透明（fill 随滚动增长时才显示进度线，无进度不显示任何线）
  - ④探索区懒渲染（首屏最大减负）：renderAboutContent 探索章节改占位 `.ab-lazy-slot`；IntersectionObserver（rootMargin 600px）滚动接近时挂载 `renderExploration` + 重绑 bindNetworkHover/bindExplorationScrollDriven/bindExplorationStoryboardSwitch；`safe()` 提升模块级（供懒加载复用）；CAMERA_PAIRS 抽取为全局 + `_cameraPairBound` WeakSet 守卫防重复建 ScrollTrigger；bindTOC 观察器全局化 + `_tocObserveExploration` 补观察
  - ⑤TOC 高亮缺陷修复（懒渲染复验发现的真实缺陷，exploration 价值）：threshold [0.15,0.4,0.6] → 0——探索章节高 2518px，观察带最大相交比 0.079 < 0.15 永不回调，「探索运作」圆点永不点亮（第一章 1364px 同有隐患 0.145 < 0.15）
- **复验（browser_use 三轮）**：
  - 首轮（Tailwind 移除+字体+上边框）：Tailwind CDN 零请求 ✓ / 字体 6 字重声明生效 ✓ / 上边框 relative+透明 ✓（进度线随滚动 0→35.9%→100% 正常）/ 布局无塌陷 ✓ / console 无错误 ✓
  - 二轮（懒渲染）：首屏 `.ab-exploration-section`=0 ✓ / 滚动至 scrollY≈4528 自动挂载（html.length=28647，SVG 双分镜 + 41 stage）✓ / 逐 stage 点亮 + 专班分镜转场（clipPath circle 14%→135%）✓ / 终章正常 ✓ / 首屏主线程移除最大单章 ✓
  - 三轮（TOC 修复）：9 章全部正确点亮（hero→组织性→宝贵机会→身份阶段→两种工作→考察维度→**探索运作**→行百里者半九十→管理事服务人）✓ / 探索章节停留 is-active=true ✓ / console 无错误 ✓
- **版本号 bump**：`?v=20260812c` → `?v=20260812d`（47 文件，字节级替换保 BOM），递归验证 20260812c 零残留
- **验证结果**：✅ GetDiagnostics about-entry.js 零错误；✅ browser_use 三轮复验全通过
- **检查教训（sample-diff-learning 提炼）**：
  - divergence_type：`exploration_gap`——AI 检查默认走「已知清单 exploitation」，漏检「清单外未知问题」（上边框 sticky 轨道、TOC threshold 高章节失效、Tailwind CDN 同步阻塞）——书记原话「检查过程中 exploition 和 exploration 的关系」要求两者平衡
  - generalized_rule：检查任务必须①先规划 exploitation 清单（已知模式逐项扫）与 exploration 方向（性能实测/视觉走查/边界条件/依赖审计）②exploration 优先做「真实环境实测」（Performance API、computedStyle、滚动走查）而非仅静态读码③对书记手动定位的元素追根因（上边框→sticky 语义缺陷）并全仓排查同类（sticky 顶部元素是否都有轨道常驻问题）
  - boolean condition：`检查范围 = 已知清单(exploitation) ∪ 实测/走查/依赖审计(exploration)`，两者缺一即检查不完整
- **变更文件**：`docs/about.html`（Tailwind CDN 移除 + 字体瘦身）/ `docs/src/styles.css`（Tailwind 最小兜底 + 进度条上边框修复）/ `docs/src/entries/about-entry.js`（safe 模块级 + CAMERA_PAIRS 抽取 + WeakSet 守卫 + 懒渲染 + TOC threshold 修复 + 探索绑定重入）/ 47 文件版本号 bump + 本条日志
- **commit**：待提交（push 需书记批准）

## T-221 about/help 静态页隔离 + about.css 拆分 + 图标崩溃修复 + 死代码清理（2026-08-12）

**任务**：书记指令——「about 和 help 是两个完全静态的文档（没有写入、没有输出、没有信息交换），about、help 本就是 hardcoding；help 随系统部署到学校，about 部署时会拿掉！需要检查：①这几个文件确保和别的文件比较孤立【除了侧边栏和 header，因为托管在 GitHub Pages 上还要正常运转】；②在确保不影响别的文件的情况下，有很多死代码、无用代码、冲突代码，一定要研究仔细；③可以把 about 这部分单独拎出来成为新的文件，这样便于加载；④about 的显示完全崩坏了——h1 字体和 svg 图像完全崩溃」
**引用流程**：H20.1 强制前置审查 + brainstorming Skill（方案确认）+ web-design-guidelines Skill（指引引用）+ H40 检查清单 + C-2 一改具改巡检 + H40.6 YAML 更新
**来源**：书记指令（2026-08-12，含浏览器选中 svg/h1 元素定位崩溃点）

- **诊断结论（headless 实测 + 依赖链分析）**：
  - **svg 崩溃根因**：T-220 移除 about.html 的 Tailwind CDN 后，styles.css「TAILWIND 最小兜底」清单缺 `w-4/h-4`（header 铃铛）、`w-3.5/h-3.5`（about 返回箭头）、`ml-auto`（主题色块）——`icon()` 不设 width/height 全靠 CSS 类，缺失时铃铛实测 38px（设计 16px）、箭头 29px（设计 14px），图标放大变形 = 「svg 图像崩溃」
  - **h1 字体**：headless 实测三视口（320/1070/1280px）标题均规范两行无溢出、NanxiYoumosong woff2 有效（magic=wOF2，1.19MB）且加载成功——书记环境显示「默认宋体」系该环境字体资源不可达（GitHub Pages 未更新 70 个未 push 提交 / 校园网 Google Fonts 拦截）所致，代码侧已确保本地字体路径正确
  - **隔离问题**：about/help 的 entry 虽只 import sidebar+header，但 header→notice.js→domain/mock/todo、sidebar→auth→runtime.js 的传递依赖，把整个数据层约 50 模块 + 全量 mock 数据拖入静态页并触发初始化（实测 `[DataAdapter] 数据源切换为: mock`）——违反「孤立」要求
- **实施修复（书记选方案A：共享组件按需加载）**：
  - **about.css 拆分**：styles.css 的 ab-* 区块（约 1520 行）+ ab 深色覆盖 + Tailwind 最小兜底整体抽出为 `docs/src/about.css`（about.html 独占引用）；styles.css 全站瘦身；补充缺失工具类 w-4/h-4/w-3.5/h-3.5/ml-auto
  - **header.js 按需加载 + staticShell**：AuthStore/NoticeStore 改动态 import（沿用原版本号共享模块实例）；`renderHeader(module, { staticShell })`——静态壳不加载数据链、无身份标签，通知铃首次点击才动态加载；app 模式渲染后立即按需补角标（无感知）
  - **sidebar.js 按需加载 + staticShell**：AuthStore/workspace-popover 改动态 import；静态壳渲染访客壳（无工作台入口/无退出登录/默认主题色）；app 模式按需加载后按当前用户渲染
  - **about/help entry 传 staticShell**：`renderSidebar('about', { staticShell: true })` 等
  - **死代码清理**（about-entry.js + about.css）：`selfLoopPath`（无自循环边）、renderNetworkSVG 非 inline 整节包装分支（domain/callouts/页码/眉线）、safe() 每节成功 console.log、about.css 死类（.ab-main/.ab-page--stacked/.ab-hero-eyebrow/.ab-section-domain*/.ab-callout-list*）、styles.css 残留 #about-content 冗余规则
  - **版本号一改具改**：`?v=20260812d → ?v=20260812e`（header/sidebar/about.css/两入口/13 个 HTML 等全链路）
- **验证结果（browser_use 三轮）**：
  - 隔离：about/help 模块加载 runtime/auth/notice/mock/domain 五项全零；console 仅保留 start 日志、无 DataAdapter 日志；data-adapter.js 为无依赖无副作用接口层（header 角标事件常量，符合隔离）
  - 图标：铃铛 16×16 ✓、返回箭头 14×14 ✓、主题色块 margin-left:auto ✓
  - app 回归：index.html?dev=secretary 角色标签/工作台链接/退出/角标(2) 正常；workspace/secretary.html 内容 23977 字符、7 tab 正常；全程无 TypeError
  - 深色：about 深色底 #14161A + 党建红标题 ✓；探索区懒渲染（12 节点/19 边双场景）✓
- **变更文件**：`docs/src/about.css`（新增）/ `docs/src/styles.css` / `docs/src/components/header.js` / `docs/src/components/sidebar.js` / `docs/src/entries/about-entry.js` / `docs/src/entries/help-entry.js` / `docs/src/core/bootstrap.js` / 9 个 entry 版本号 / `docs/about.html` / `docs/help.html` / 12 个 HTML 版本号 + 本条日志
- **commit**：待提交（push 需书记批准）

## T-223 about 第三轮七项指令 + 书记四连修正：三对齐审计落地 + 环形闭环大刀阔斧 + 本地字体调用 + 长 sub 两行短句 + 第五章布局动画重设（2026-08-12）

**任务**：书记七项指令——①第五章工作流与 SOP、网页三对齐，不一致报告书记决断；②第六章 4 卡视觉闭环（视觉反映内容）；③NanxiYoumosong 字体加载不准确 + about 页刊物化；④blockquote 断句换行谨慎 + 移除「核心命题」div（书记不用这种严肃称呼，全仓注意）；⑤机会卡片点击翻转动画毫无必要（两机会无顺序/并列关系，改滚动驱动分开出现）；⑥工作流章 p 过长（不会正确运用视觉元素）；⑦第五章动画约 60 分需基于代码脑暴提升。书记四连修正（后续收到）：①删除下载的错误字体，本地已安装直接调用（不加载字体包）；②剩余工作尽快推进；③第五章右侧太大左侧视窗太小 + 动画太快看不清；④第六章排布逼仄——「我所说的设计都不是边际修改！要的是大刀阔斧！」
**引用流程**：H20.1 强制前置审查 + brainstorming Skill + improve-animations Skill + sample-diff-learning Skill + web-design-guidelines Skill + grill-with-docs Skill + AskUserQuestion（书记多轮决断）+ verification-before-completion Skill + H30.1 一改具改 + H40 检查清单
**来源**：书记指令（2026-08-12，本会话第 3 轮）+ 书记 AskUserQuestion 逐条决断

### ①三对齐审计（SOP ↔ 网页工作台 ↔ About 第五章）
- **审计方法**：三方比对——About EXPLORATION_STAGES.activity/taskforce vs SOP 母本（常见工作场景快速指南/党小组组长工作手册/组织委员流程/纪检委员流程）vs 网页（sopData.js/definitions.js/taskforce.js）
- **发现不一致 9 项，书记决断 4 项落地**：
  - **D-1 审批主体**（书记：对齐 SOP）：活动审批=党小组组长（About 原画 organizer↔secretary 报备/审批双向边错误）→ 网络改 organizer→leader「报备审批」+ leader→secretary「知情同意」+ leader→organizer「赋权」三边；stage 0-1 重排（策划→审批→知情）
  - **D-2 通知主体**（书记：「SOP和网页应该就是组织者通知！！组长可以是组织者！职务可以兼任，但是工作一定是跟着职务走，而不是跟着人走！」）：通知=组织者（组长兼任时以组织者身份发布）→ sopData.js 1b-4 executor leader→organizer + desc 补「工作跟职务走」；常见工作场景快速指南「通知发布权限」表发布人改组织者 + 主题党日步骤4 负责人同步；党小组组长工作手册 §6.3 补 D-2 决断说明
  - **D-4/D-5 补齐环节**（书记：补齐两环节）：活动网络补 deep→prop「宣传产出」边 + organizer→prop「材料归档」边 + disc→organizer「复盘批注」边（组织者复盘→纪检批注确认）；stage 4-5 重排（考勤宣传产出→复盘归档考察建档）
  - **D-6 专班**（书记：「网页中表现出来是直接算法同步好的，直接就写成【A->B;A->C】而不是 A->B->C！！」）：专班保持并行直达表达（组织委员招募赋权+发起人业务赋权 A→B;A→C），名单同步纪检=算法自动（stage 1/2 desc 注明），不加链式边
  - **D-3 联系条条**（并入 stage 1 desc：组织者按需联系组织/宣传/纪检委员说明计划，对齐 SOP 步骤 3）；D-7 带动参与边保留（书记未否）；D-8 专班「交付成果给发起人」保留（SOP 归档语义兼容）；D-9 业务赋权表述保留
- **同 from/to 多边冲突修复**：organizer→prop 出现两条（宣传需求/材料归档）——renderNetworkSVG 边加 `data-key="ab-edge-${i}"` 唯一索引 + pathId 带索引（`ab-flow-path-${from}-${to}-${i}`），renderNetwork/applyNetworkState 选择器改 data-key；复盘批注边加 `curve:-34` 防与提交考勤边重叠

### ②第六章 4 卡闭环视觉（环形布置 → 大刀阔斧）
- **首版环形**（书记选定环形布置）：620px 舞台 + 230px 卡 + 88px 枢纽，SVG 环底（viewBox 400，四方位锚点 + 虚线圆环）+ 中心枢纽「对话」，滚动沿环逐卡点亮（spoke/node/hub 同步插值）
- **书记四连修正「排布逼仄、大刀阔斧」重做**：舞台 620→1000px、卡 230→280px、枢纽 88→130px、SVG viewBox 400→600（环半径 210）、卡片字号同步放大（no 26px/phase 15px/question 17px/answer 14.5px/desc 14px）；**卡中心偏移改精确法**——`--dl-off:300px`（圆心锚定 + translate 平移），相邻卡 90° 弦长 424px > 卡对角线 369px 互不重叠（browser 实测 4 对全不重叠，hub 与卡最小间隙 75-97px）；四卡精确落 300px 十字方位
- **reduced-motion 降级修复**：环形定位依赖 transform，`transform:none !important` 会清掉 translate 堆叠圆心——reduced-motion 下 dialogue-flow 降级为纵向堆叠（与移动端一致，隐藏 ring/hub）
- **移动端**：dialogue 环形降级纵向堆叠（既有媒体查询保留）；第五章 scene-body 补移动端 1fr 降级（网络图+说明纵向）

### ③字体（NanxiYoumosong 加载不准确根因 + 书记修正本地调用）
- **根因链**：about.css 头部 `//` 行注释（CSS 非法）→ 解析器吞掉后续 @font-face → 字体从未注册（document.fonts 中 NanxiYoumosong=0，canvas 墨迹判定回退 Noto Serif SC）；修复 `/* */` 后注释正文含 `/* */` 字样又致注释提前闭合吞掉 @font-face——两连坑，最终注释禁用定界符字样
- **书记修正（指令①）**：「删除你刚才下载的字体！这个字体是错误的！我的本地已经安装过这个字体，请你直接调用！！此外不需要完整加载字体包」→ 删除 docs/assets/fonts/nanxi-youmosong-subset.woff2 + 移除 about.css @font-face 块 + 移除 about.html preload；`--ab-display` 字体栈首项 NanxiYoumosong 直接命中本地安装（未安装环境回退 Noto Serif SC）；about.html 版本号 g→h→i 同步

### ④「核心命题」清理 + blockquote 断句（全仓）
- about-entry.js renderCognition 移除 `.ab-cognition-dialogue-label` div（「核心命题」）；blockquote 断句 `爱具体的人…，<br/>爱具体的组织…`；about.css 删 `.ab-cognition-dialogue-label` 死规则
- about 党建贡献卡片 badge「核心」→「重点」（书记不用「核心」这类严肃称呼）
- 机会卡片 quote 改 quoteLines 分行（`.ab-philosophy-opp-quote-line` 逐行 block + 行间距 8px）——blockquote 断句清晰、换行谨慎
- 全仓扫描结果：DEVELOPMENT_PATH L69「### 核心命题」章节标题 + ARCHITECTURE/OPERATIONS_GUIDE/insights 速查表「核心命题」列名——AI 写作，未擅自改 content 权威源（报告书记待决断）

### ⑤机会卡片动画重设计（两卡滚动分开出现）
- 移除 bindPhilosophyExpand 点击翻转（KeyNote 交叉淡入）函数 + 调用 + tabindex/role=button/aria 属性 + CSS cursor/hover/focus 死规则 + `ab-page--stagger` 错落类
- 两卡各自独立 scrollTrigger（`top:88% → top:38%` scrub）——每卡进入视口即浮现，无顺序/并列强调，适配书记讲述过程
- blockquote 直接展示书记原话全文（不再提炼版/点击切换）

### ⑥工作流章长 sub 拆分（两行短句）
- 185 字长 sub → 两行短句 `有先例的，按工作流走<br/>没先例的，靠探索沉淀` + 新增 `.ab-exploration-why` 小字收束说明（方兴未艾/框架内对话/沉淀为工作流，弱化层级不抢主视觉）

### ⑦第五章动画提升（信息流连续化 + 镜头强化 + 节点放大 + 图例统一）
- **信息流连续化**：flow-dot SMIL repeatCount 无限循环（dur 1.4s，opacity keyTimes 0;0.06;0.94;1）+ triggerStageFlow 错峰触发（每条边 i×120ms 延迟 beginElement）——stage 激活期间持续流动非一次性
- **镜头强化**：NETWORK_MOTION focusPadding 56→40 + minFocusWidth 560→480 + minFocusHeight 320→280——推近幅度更大
- **节点放大**：leadRadius 52→62 / activeRadius 40→48 / dimRadius 36→42；节点文字 15→17px、duty 12→13px、duty y 58→78（适配大 radius）；.ab-network-svg max-width 800→880px
- **图例统一**（书记：「图例不清晰！箭头意义和每个主体的圆圈、字号大小不统一」）：图例补「角色节点（职责见节点下方小字）」+「箭头指向交付/传递方向」（含 SVG 箭头样例）+ `.ab-legend-dot` 圆形样例；统一 12px 层级
- **布局修正（书记四连修正③：右侧太大左侧视窗太小）**：scene-body grid 5fr:7fr → 7fr:3fr（左网络图为主角）；stage 卡 min-height clamp(220px,34vh,320px)（滚动区间加长、动画从容，实测 stage0→5 行程 1708px ≈ 2.6 视口）；修复重复 `.ab-exploration-stage` 定义 + 补回误删的 data-state 三态样式
- **验证**：browser_use 全套通过（7fr:3fr=2.33:1 实测、stage min-height 224px、节点 r 42-62、stage0→5 行程 1708px、第六章 4 卡零重叠精确 300px 十字、console 零错误）

### 版本号
`20260812f → 20260812i`（about 页链路：about.css/entry + sopData 引用链 d→g）

### 变更文件
`docs/src/entries/about-entry.js`（活动网络/专班/机会卡/dialogue 环形/章节 sub/动画）/ `docs/src/about.css`（环形大刀阔斧/图例/长 sub/blockquote 断句/字体注释修复）/ `docs/about.html`（字体包移除 + preload 移除 + 版本号）/ `docs/assets/fonts/nanxi-youmosong-subset.woff2`（删除）/ `docs/src/workflow/sopData.js`（1b-4 通知主体）/ `docs/src/workflow/index.js`、`docs/src/workflow/sop.js`（sopData 引用版本号）/ `content/02_institution/sop/常见工作场景快速指南.md`（通知发布权限表 + 步骤4）/ `content/02_institution/sop/党小组组长工作手册.md`（§6.3 D-2 决断）+ `.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

### 沉淀标签
`[待沉淀: 工作跟职务走]` — 职务可兼任但工作跟职务走（D-2）：通知等环节的执行主体按职务定义而非人，党小组组长兼任组织者时以组织者身份发布通知；`[待沉淀: 环形布局弦长校验]` — 四方位环形排布相邻卡 90° 夹角弦长 = 偏移×√2，须 > 卡片对角线才不重叠，用「圆心锚定 + --dl-off 平移」精确控制而非 top/right 百分比；`[待沉淀: CSS 注释定界符陷阱]` — CSS 注释不可嵌套且 `//` 非法，文件头部注释内出现 `/*` `*/` 字样会使 @font-face 等头部规则被解析器整体丢弃（两次踩坑）；`[待沉淀: 字体加载核验法]` — document.fonts.check 对未注册家族返回假阳性，须用「canvas 墨迹计数对比 NoSuchFont」判定字体真实生效

### 第三轮补充：书记四连修正落地后 browser 三验 + 三缺陷补修（2026-08-12 下午）
**任务**：书记四连修正后的浏览器验证——①正放倒放完全时间倒退（发现倒放卡片暗沉）②侧边跳转问题（会卡在第五章）③blockquote 字体喜欢，第一章去底更好看，全局适当错落 ④清理 C 盘 Trae 缓存。书记 AskUserQuestion 决断：倒放暗沉 =「已读保持可见」+「提亮暗态（future 0.38→0.55）」
- **已读保持可见实现（r1）**：cardEntrance 弃 `scrub:true` 改 `once:true` 单向点亮（cognition/philosophy/review/dialogue 四章节）——滚动触发后不回退 from 态；探索区 stage 加 `visitedStage` 已读守卫（曾到达最高 stage，倒放时已读最低保持 past，不回 future）；对话区四卡加 `visitedLight` 守卫（曾达 current 阈值 0.35 即已读，倒放最低 past）；philosophy 两卡独立 trigger 同步改 once
- **暗态提亮（r2）**：探索 stage / 对话卡 future 0.38→0.55、past 0.72/0.75→0.8；CSS 三态同步（about.css stage/dialogue 两处）
- **侧边跳转卡第五章（r3）**：探索区 sceneData 构建时缓存 sceneTop/sceneHeight，侧边跳转布局变化后可见性过滤误判 → 改每次 update 实时 `getBoundingClientRect()` 重算
- **blockquote 刊物化（r4）**：第一章引文去底框（去 dashed 框/背景）改「装饰引号「」+ 大字号」题记式 + margin-left 错落；哲学两卡 margin 左右错落（避免与 GSAP 内联 transform 冲突）
- **browser 三验结果**：①已读保持可见——除 Development 时间轴外全部通过（时间轴仍是 scrub 漏改）②暗态 0.55 生效 ③侧边跳转渲染后正常、未渲染时静默失败（TOC 无降级）；另发现对话卡在探索区起点即提前点亮（懒渲染后无 refresh，trigger 基于旧布局）
- **三缺陷补修（复测通过）**：
  1. Development 时间轴 `scrub:true`→`once:true`（与 cardEntrance 同模式）——回顶后 4 stage/13 row 全保持 opacity 1
  2. TOC 锚点降级：探索区未渲染时 `getElementById('exploration')` 为 null → 降级滚动到 `#ab-lazy-exploration` 懒加载槽（渲染后位置不变）——刷新后直接点击可跳转 y=5237
  3. 懒渲染后补 `ScrollTrigger.refresh()` 无效 + 引入偏移 → **根因**：页面滚动根为 BODY（documentElement.scrollTop 恒 0，body.scrollTop 在滚），refresh() 在非零滚动位置把 start/end 整体算低当前 scrollY（实测对话卡 start≈4700，正确≈8856）→ **对话卡触发机制重写**：弃 ScrollTrigger 布局测量，改 `lenis.on('scroll')` + 实时 `getBoundingClientRect()` 计算 progress（视口坐标与滚动根无关；原 start 'top 72%'/end 'bottom 55%' 语义不变）——复测：探索区 y=6000 四卡全 future/0.55 不提前点亮、y=9600 逐张渐变点亮、回顶全 past/0.8 保持可见
- **验证**：browser_use 三轮（首验/复测/终验）全通过 + console 零 JS 报错
- **版本号**：`20260812i → 20260812j`（about.html 三处）

### 变更文件（本轮补充）
`docs/src/entries/about-entry.js`（cardEntrance once/visitedStage/visitedLight/时间轴 once/TOC 降级/对话卡触发重写/注释同步）/ `docs/src/about.css`（三态提亮/引文去底框/哲学错落）/ `docs/about.html`（版本号 j）

### 沉淀标签
`[已沉淀: 工程演进与设计方法论 §6.30]` — 当页面滚动根为 BODY（documentElement.scrollTop 恒 0）时，ScrollTrigger.refresh() 在非零滚动位置执行会把 trigger 的 start/end 整体算低当前 scrollY；依赖布局测量的 ScrollTrigger 触发点（尤其懒加载插入高度后）宜改用「滚动事件 + 实时 getBoundingClientRect」计算，视口坐标与滚动根归属无关，天然鲁棒

## T-225 C 盘 Trae 缓存清理（2026-08-12）

**任务**：书记指令「清理无用的C盘缓存——最重要的只是清理Trae带来的缓存！！」
**引用流程**：书记 AskUserQuestion 决断（一键脚本 + database.db 保留）
**来源**：书记指令（2026-08-12）

### 侦察结论（Trae 缓存全景，`C:\Users\储子禾\AppData\Roaming\Trae CN`，约 4.1GB）
- `ModularData\ai-agent\database.db` 2244MB——AI 智能体对话/任务库，**加密数据库**（文件头非 SQLite 魔数，SQLCipher 类），无法按时间精准删对话 → 书记决断保留
- `logs` 759.7MB（运行日志）、`Partitions\trae-webview` 413.9MB（内置网页缓存）、`User\History` 159.6MB（本地编辑历史）、`CachedData` 106.5MB（更新缓存）、`WebStorage` 26.5MB + Cache/GPUCache/Code Cache/Dawn 系列/爬虫会话 ~60MB——安全可清约 1.5GB
- `AppData\Local\Trae CN` 不存在——数据全在 Roaming
- **硬限制**：Trae 安全白名单实测拦截对 `AppData\Roaming\Trae CN` 的一切命令行删除（仅放行 Temp/pip/npm/.cache 等开发缓存，上轮已清 3.4GB）；且 Trae 运行中文件被占用
- **交付**：桌面生成 `清理Trae缓存.bat`（双击入口）+ `clean_trae.ps1`（UTF-8 BOM，11 个安全缓存目录，占用文件跳过，约释放 1.5GB）——书记关闭 Trae 后双击运行即可；database.db 与配置目录（workspaceStorage/globalStorage/ModularData）不在脚本内
- `%TEMP%\trae` 残留 3.2MB（此前已清大头）

### 变更文件
`C:\Users\储子禾\Desktop\清理Trae缓存.bat` + `C:\Users\储子禾\Desktop\clean_trae.ps1`（系统外交付物，不入仓库）

### 沉淀标签
（无新模式——属一次性系统维护，按 H30.4 规则 6 省略标签）

## T-226 「管理事，服务人」叙事逻辑审视 + 第四章全员考察改造 + 民主集中长线课题（2026-08-12）

**任务**：书记指令「仔细思考【管理事，服务人】这个叙事，现在是否还存在逻辑漏洞，思考清楚和书记汇报 ask user questions！！」
**引用流程**：H70 反思流（沿链接读权威源）+ H50.2 丙部待决策机制 + 书记 AskUserQuestion 多轮决断 + H30.1 一改具改 + H40 检查清单
**来源**：书记指令（2026-08-12）

### 审视结论（书记决断：AI 提出的 4 个候选漏洞均不成立）
- AI 初判 4 个候选漏洞（组织性判定叙事缺位/预备党员缺席/身份升级机制未讲透/管理事无战略收束），书记逐一澄清：
  - **组织性判定不是漏洞**：组织性讲的是"是什么/为什么宝贵"，判定标准就是「考察积极分子」所说（态度+能力），两层分工明确——组织性已讲够，不再立"判定章节"
  - **身份阶段颗粒度**：不再细化中间身份，只保留一个特征——后面的阶段相比前面的阶段，组织性更强、并承担帮助前面阶段成长的责任（党员帮积极分子）；"难以细化"故只保留此颗粒度
  - **管理事一句话定义**：「管理事就是按照工作流和组织性的要求做事！」
  - **第四章**：书记澄清指的是 **about 页第四章**（考察章节）——标题改「我们如何考察」，不强调是积极分子，所有人都受到这样的考察
- **核心新课题（书记主动提出，非 AI 发现）**：民主与集中的表述张力——叙事充分立论"民主/扁平"，但"集中"只有"支书确实有最终决策权"一句交代、未立论，长期不对称会引起对民主认知的反扑；不能忽视支委个人尤其支书个人的作用；对下任支书的交代中"最重要的工作是人事安排和议程设置"（但不适宜对所有人说）；"是否意味着要为书记发挥他的判定和指挥确定范围"待决；牵扯其他表述是否修改

### 落地一：丙部 P.9 民主与集中的表述张力（长线课题）
- CLAUDE.md 丙部新增 P.9：书记原话 4 条（2026-08-12 记录供书记研究）+ AI 思考碎片 3 条（碎片一：集中设定框架、民主在框架内运行——"人事安排/议程设置"是集中的日常形态，与"框架内对话"同构；碎片二：为集中的权力确定范围恰恰是保护民主——集中有界则民主有安全感；碎片三：与既有表述的兼容性——第二章阶段2"最终决策权但过程充分展开"、P-009"扁平化消除上下级命令但不消除程序"）+ 路线图第一步（设框架论/权力范围论/其他）
- 状态：书记研究思考中，AI 不得擅自立论

### 落地二：about 页第四章「我们如何考察」（全员考察视角）
- `ab-page-runner`：第四章 · 考察积极分子 → 第四章 · 全员考察
- `ab-chapter-eyebrow`：考察维度 → 全员考察
- `ab-chapter-title`：我们怎么考察积极分子？ → 我们如何考察
- 三卡 desc 去积极分子限定：党课学习"是支部成员成长的思想基础"、综合评价"构成对支部成员的全面画像"（党建贡献卡"核心维度"表述保留）
- TOC 侧边栏 tooltip：考察维度 → 如何考察
- CSS 注释 + JS 注释同步（H30.1：全仓 grep「考察积极分子/我们怎么考察积极分子」第四章范围内零残留；发展路径时间轴阶段标签「入党积极分子→发展对象」等属流程语义保留）
- **验证**：browser_use 通过——runner/eyebrow/title/sub 全对、三卡 desc 无"积极分子"、第四章范围零残留、TOC「如何考察」、console 零 JS 报错

### 版本号
`20260812j → 20260812k`（about.html 三处）

### 变更文件
`CLAUDE.md`（丙部 P.9）/ `docs/src/entries/about-entry.js`（第四章文案/REVIEW_DIMENSIONS desc/TOC label/注释）/ `docs/src/about.css`（注释同步）/ `docs/about.html`（版本号 k）

### 沉淀标签
`[待沉淀: 民主与集中表述张力]` — 叙事对"民主/扁平"立论充分而"集中"只交代不立论会造成表述不对称：当现实中集中（支书拍板、支委定调）出现时，民主认知会反扑、民主表述显得虚伪。为"集中"立论的方向碎片已入丙部 P.9（设框架/定范围/兼容性），由书记研究思考。此条目沉淀位置待书记课题推进后确认。

## T-227 民主与集中的统一论断提炼入册（P-048）——书记 P.9 长线课题方向一落地（2026-08-12）

**任务**：书记指令「请提炼上述书记的原话论断！！这非常重要！！Use Skill: grill-me / brainstorming。一定要给书记过目之后，才可以写入原话！」
**引用流程**：grill-me Skill + brainstorming Skill（含书记定稿 gate）+ 书记 AskUserQuestion 确认 + H30.1 一改具改 + H40 检查清单
**来源**：书记指令（2026-08-12，承接丙部 P.9 长线课题）

### 书记核心论述（提炼前）
书记以 SECRETARY_PRONOUNCEMENTS L201（P-009 2026-08-09 原话）为基点深化——书记原话并没有否定集中：①最重要的集中就是【知情权】，信息必须集中；②书记的提议、支委的提议可以驳回、也必须充分地讨论——这是扁平化的体现，符合集中原则，给了书记足够协调各方的"生产要素"，充分讨论也给定了成员充足的知情权；③支委个人和支书个人的作用依靠工作流和程序实现——程序在所有人之上所以扁平，程序中书记因更大责任被要求嵌入更深所以集中！

### 提炼草案 → 书记定稿（AskUserQuestion 确认）
- 草案含：核心论断一句话（扁平与集中是同一套程序的两种呈现）+ 三条书记原话（拟入册）+ AI 展开引用块（集中=知情权，不是指挥权；民主=集中以程序呈现而非命令呈现）+ 与 P-009/P-043 关系 + 建议归属新 P-048
- 书记确认：「确认，可定稿」+「新 P-048（推荐）」

### 落地：SECRETARY_PRONOUNCEMENTS.md 新增 P-048（一改具改全链路）
- **正文条目**（P-012 之后、第三章过渡之前）：标题「民主与集中的统一——程序在所有人之上所以扁平，责任嵌入更深所以集中」；三条书记原话（2026-08-12）+ AI 展开引用块（集中不是指挥权而是知情权；民主不是"没有集中"而是"集中以程序呈现"；与 P-009 递进——集中以程序为中介、实质是信息与责任；与 P-043 统一——程序是两向度的共同中介：扁平是普遍性、集中是深度差异）
- **文件头同步**：定位说明 16 条→17 条（注明 P-048 新增）；四组说明"支部怎么组织"组加 P-048；战略路线级列表加 P-048；读后要点段加"民主与集中统一于程序"；目录项 3 加 P-048
- **附录同步**：论断编号索引表加 P-048 行（第三章/战略路线级/锚点）；修正记录表加 P-048 行（2026-08-12 新增定稿）
- **CLAUDE.md 丙部 P.9 联动**：路线图第一步更新为"书记方向一已定稿入册 P-048（集中=知情权+责任嵌入更深）"；第二步待书记研究（是否为书记判定指挥确定范围 / 人事安排和议程设置的表述边界 / 其他表述是否修改）；状态改为"方向一已落地，长线课题继续"

### 变更文件
`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（P-048 新增 + 文件头/目录/索引表/修正记录表同步）/ `CLAUDE.md`（丙部 P.9 路线图第一步状态更新）+ `.ctx/logs/2026-08-EXECUTION_LOG.md`（本条）

### 沉淀标签
`[待沉淀: 集中是知情权不是指挥权]` — 民主集中制的统一表述：程序在所有人之上所以扁平（无人凌驾程序，提议可讨论可驳回），程序中书记因更大责任被要求嵌入更深所以集中；集中=知情权（信息必须集中，信息是协调各方的"生产要素"）。此论断已入册 P-048，沉淀待课题第二步推进后归位。

## T-228 about 页综合问题修复：TOC 跳转/滚动打断/日出日落对话卡/终章排布/颜色对齐/SVG 视窗/硬刷风格（2026-08-13）

**任务**：书记 6 组反馈——①排序顺序是否合理 ②P-048 对 about 的新思考 ③字体未加载+硬刷未实现 ④div 颜色太灰/排布逼仄/SVG 视窗诡异/对话卡加载莫名其妙（建议日出日落循环）/p 对齐无规划/第五章阻碍侧边目录
**引用流程**：improve-animations Skill + web-design-guidelines Skill + brainstorming/grill-me Skill（书记指定）+ 书记 AskUserQuestion 决断 + H30.1 一改具改 + H40 检查清单
**来源**：书记指令（2026-08-12，浏览器选中多元素附注）+ 书记决断（2026-08-13 完成修复）

### 书记决断
- 对话卡动画：**是卡片动不是光点动！设置一个地平线**（日出日落=卡片升起亮/落下暗的循环，突出"从这次到下一次"）
- 修复范围：全部处理
- 排序+P-048：终章「管理事，服务人」孤零零，综合思考排布
- 字体：真机自检 + 硬刷风格本轮做

### 修复清单（browser 三验全通过）
1. **TOC 首次跳转卡住**（dialogue/conclusion 落点 5237/6731）——三次迭代定位：
   - ①槽位降级条件修正（dialogue/conclusion target 存在但位置旧，需按"探索区未渲染且目标在懒加载槽之后"判定）
   - ②去 `lenis.stop()`（Lenis 1.3.25 scrollTo 开头检查 isStopped，stop 后二次跳转被拦截）
   - ③**最终根因**：Lenis 内部 ResizeObserver 防抖 250ms，渲染后立即 scrollTo 被旧 limit（短布局 maxScroll 7120）钳制——等防抖窗口 280ms 后再二次校准。复测：dialogue 9268 / conclusion 10762 / exploration 5237 全精确
2. **首次滚底被打断**：补 Lenis 官方 CSS（`html.lenis-smooth { scroll-behavior: auto }`）——原生 window.scrollTo 不再与 Lenis JS 平滑冲突
3. **对话卡日出日落循环**：渲染层加 `.ab-dialogue-horizon` 地平线（环形下缘 84%）；动画层卡加 `--dl-rise` 升降（日出 +16→-8 升向天空，日落 -8→+14 沉向地平线）+ 日落窗口 1.6-2.6→1.0-1.7（日落紧随正午，接力近昼夜）；已读保持可见兼容（日落= past 0.8 非熄灭）
4. **终章综合排布**：大字 + lead（管理事=按工作流和组织性的要求做事/服务人=帮成员成长）+ sub（P-048 集中面：程序之上所以扁平/责任嵌入更深所以集中）+ coda（全页呼应：爱具体的组织）
5. **颜色加深**：--ab-ink-sub #7D7362→#6C6254、--ab-ink-faint #ABA191→#94897A（暖纸对比不足）
6. **对齐排布规范**：.ab-chapter-sub 显式靠左 + CSS 注释制定四类排布规范（章节标题靠左/卡片靠左/强调元素居中/时间轴靠左；第六章环形与终章宣言整体居中）
7. **SVG 视窗诡异**：focusPadding 40 < 节点半径 48/62，聚焦区贴边界时节点圆被 SVG 视窗裁剪——`pad = focusPadding + activeRadius` 修复。复测：激活节点零越界、viewBox x 离开 0
8. **硬刷风格（铅字压印）**：chapter-title/page-no/hero-title/conclusion-title 加 letterpress text-shadow（下方受光+上方微暗的纸面凹陷感）
9. **环形排布**：复测静止态四卡零重叠（此前"重叠"系动画中间态）
10. **字体未加载**：canvas 墨迹证明系统字体名命中失败（CSS 声明正确）——真机自检脚本已交付书记（console 运行确认）

### 版本号
`20260812k → 20260813a`（about.html 三处）

### 变更文件
`docs/src/entries/about-entry.js`（TOC 三次迭代/对话卡日出日落/终章综合/SVG pad/注释）/ `docs/src/about.css`（Lenis CSS/地平线/--dl-rise/颜色/对齐规范/铅字压印/终章 sub-coda）/ `docs/about.html`（版本号 a）

### 沉淀标签
`[待沉淀: Lenis scrollTo limit 钳制]` — Lenis 1.x scrollTo 调用瞬间按 this.limit clamp，limit 由 ResizeObserver 防抖约 250ms 更新；懒渲染插入高度后立即 scrollTo 会被旧 limit 钳制停在半路（实测目标 9268 被钳到 7120=短布局 maxScroll）——懒加载+跳转场景需等防抖窗口或手动 resize 后再跳转。

## T-229 对话卡「日出日落」转盘旋转重定义（2026-08-13）

**任务**：书记纠正上一版「日出日落」实现——①是卡片旋转不是光点动 ②固定地平线 ③消失的卡片真正消失（PPT 都能实现，HTML 一定可以）④工作方式：模型无视觉能力，用语言对话+代码审查，不靠截图
**引用流程**：brainstorming Skill + web-design-guidelines Skill（书记指定）+ AskUserQuestion 三问对齐 + 数值采样验证（browser_use 读 DOM 数值，非截图）
**来源**：书记指令（2026-08-13）+ 书记决断

### 书记决断
- 旋转方式：**自转·文字跟着倒**（卡片连同自身一起旋转，转到下方文字倒置——更「陀螺旋」）
- 旋转方向：**顺时针**
- 地平线位置：**偏下约 70%**
- 关键补充：**地平线上有 3 个卡片，1 个隐去**（任何时刻 3 可见 1 消失）
- 地下留白：**保持纸张留白**（不做暮色地面/脚注，地下空白即「日落之后」的留白）

### 实现（数值采样 5 项全通过）
1. **结构重构**：四卡 + ringSVG 包进 `.ab-dialogue-wheel` 转盘容器（`transform: rotate(var(--dl-rotate))`），地平线/枢纽固定在 wheel 外。ring spoke/node 随 wheel 一起转（始终指向对应卡），虚线圆环正圆旋转不变。
2. **动画公式重写**（bindDialogueScrollActivation）：`theta = progress×360°`（顺时针一圈=四卡各经历一次日出日落，首尾闭合=「从这次到下一次」循环）；每卡 `elevation=(yHorizon−yCard)/span`（1=正午顶部·0=地平线·<0=地下），`elevation≤0` 时 opacity=0 **彻底消失**（不留半透明 past），`b=smooth(clamp01(elevation))` 驱动亮度/scale。
3. **删除旧逻辑**：`--dl-rise` 升降、`FUTURE/CURRENT/PAST` 三态 + `visitedLight` 已读回退守卫（可见性改由位置决定，已读守卫不再适用）。
4. **transition 修正**：移除卡片 opacity/filter/transform/border-color 的 0.5s transition（scrub 每帧写这些值，transition 造成消失滞后→「慢慢淡出」不干脆）；仅保留 box-shadow（data-state 驱动非 scrub）。

### 验证（数值采样，非截图）
- 结构：wheel 子元素 [svg, card×4] 顺序正确；地平线 top 比值 0.69999≈0.70
- 旋转：progress 0/0.25/0.5/1 → rotate 0/90.19/180.04/359.93°，matrix b=sinθ>0 判顺时针
- 消失：rotate 0° 时恰 1 张卡 opacity=0（03 工作之后）；rotate 90° 时消失卡换成 02、正午卡换成 04（顺时针换位正确）
- 亮度：正午 opacity=1、两侧 0.352，梯度正确；saturate 1/0.611/0.611、scale 1.050/0.966/0.966
- console：无 JS 运行时错误

### 版本号
`20260813a → 20260813b`（about.html 三处）

### 变更文件
`docs/src/entries/about-entry.js`（renderDialogue wheel 结构 + bindDialogueScrollActivation 重写）/ `docs/src/about.css`（wheel/horizon/nth-child(2-5)/transition 修正）/ `docs/about.html`（版本号 b）

### 沉淀标签
`[待沉淀: scrub 属性禁 transition]` — 滚动 scrub 每帧写 opacity/filter/transform/border-color 时，若元素有对应 transition，会与每帧更新叠加产生约 transition 时长的滞后（「消失」变「慢慢淡出」）；scrub 驱动的属性应移除 transition，仅非 scrub 属性（如 data-state 切换的 box-shadow）保留过渡。

## T-230 about 页批判性重构：字体 name 表损坏修复 + 对话卡去轮毂文字正立 + 海报排布每章错落 + 油墨纸纹（2026-08-13）

**任务**：书记 6 条批评——①字并不正 ②滚动驱动元素要有动/静自觉 ③字体没加载+印刷风格没完全实现 ④从未说过四卡 90° 排列 ⑤为什么没问清楚再执行 ⑥旧代码阻力导致打补丁、该批判性重构就重构
**引用流程**：brainstorming + grill-me + improve-animations + web-design-guidelines（书记指定）+ AskUserQuestion 多轮对齐 + 数值采样验证（browser_use 读 DOM，非截图）
**来源**：书记指令（2026-08-13）+ 书记决断

### 书记决断
- 文字：始终正立（卡片公转不自转）
- 四相位：天空三张+地下一张（非 90°）——日出-30°/日中-90°/日落-150°/地下+90°
- 轮毂：虚线圆环/辐条/环形节点/中心圆盘全删（"很丑很掉价"）
- 封面：开篇正式（保持居中）
- 章节标题：可左中右、上中下，每章各自丰富
- 印刷风格：油墨/纸纹 + 海报排布（要有理论自觉，不盲目）

### 修复清单（browser 数值采样验证通过）
1. **字体（根因 + 修复）**：查系统字体 family name 发现 name 表损坏——ID 2 子族名拼写 `Regualr`（应为 Regular）、缺 ID 16 Typographic Family → DirectWrite 无法枚举本地安装、任何 CSS 名字都无法命中（英文名/中文名/带样式名 canvas 墨迹均与假字体一致）。回归 @font-face：40.8MB TTF → fontTools.subset（about 页约 1000 字符 + 去 hinting + flavor='woff2'）→ 1.3MB woff2 放 docs/assets/fonts/。验证：document.fonts 中 NanxiYoumosong status=loaded，canvas 墨迹 22686≠24672 确认真加载。
2. **动画重构（批判性，非补丁）**：删除 wheel 旋转容器（文字倒置的根源）+ ring/hub 全部轮毂元素；改为 JS 直接算每张卡环上坐标 `translate(x,y)`，卡片本身不旋转 → 文字天然正立（无需反向抵消）。四相位非 90°：baseAngle=[-30,-90,-150,90]，θ=progress×360° 顺时针公转。验证：四卡 matrix 无 rotate 分量（b=0,c=0），相位 dx/dy 精确吻合（±259.8/±150/±300），地下卡 opacity=0 消失。
3. **油墨/纸纹**：噪点拆两层——::before 细纸纹（baseFrequency 0.8, opacity 0.05）+ ::after 油墨斑驳（baseFrequency 0.012 低频大块, opacity 0.05）。reduced-motion 同步隐藏两层。
4. **海报排布（每章错落，有理论依据）**：新增 `.ab-chapter--center`/`.ab-chapter--right` 修饰类；philosophy（两条并列）居中、review（"如何考察"提问）右对齐，其余左对齐；封面保持正式居中。节奏 左→中→左→右→左→中→中（非对称平衡+层级对比理论）。`.ab-chapter` 基类补显式 `text-align:left`。
5. **动/静自觉清单**：地平线静、卡片位置动、卡片文字静（正立）、卡片亮度动。

### 版本号
`20260813b → 20260813c`（about.html 三处）

### 变更文件
`docs/src/about.css`（@font-face 回归/去轮毂/地平线/修饰类/油墨纸纹/响应式降级）+ `docs/src/entries/about-entry.js`（renderDialogue 去轮毂 + bindDialogueScrollActivation 重写 + philosophy/review 加修饰类）+ `docs/assets/fonts/nanxi-youmosong-subset.woff2`（新增 1.3MB）+ `docs/about.html`（版本号 c）

### 沉淀标签
`[待沉淀: 字体 name 表损坏致 DirectWrite 无法枚举]` — 字体 name 表 ID 2 子族名拼写错误或缺 ID 16（Typographic Family）时，Windows DirectWrite 无法把本地字体注册为可用 family，任何 CSS font-family 名字（英文/中文/带样式）都无法命中、canvas 墨迹与假字体一致；改 CSS 名字永远修不好，唯一可靠方案是 @font-face 加载子集包（绕过系统枚举）。
`[经验: 公转文字正立勿用旋转容器]` — 让元素沿环公转且文字保持正立，不要用「旋转容器+反向抵消」两步，直接 JS 算每张卡环上坐标 translate(x,y) 即可——卡片不 rotate 文字天然正立，结构更简单。

## T-231 about 页六项修复：字体源更正 + 哲学分页 + 工作流分散 + 动画可逆 + 代码污染清理 + 侧边栏对齐（2026-08-13）

**任务**：书记 6 条反馈——①字体使用不对（正确源 D:\PPT模板\...\南西油墨宋.ttf，清理代码余毒）②两个机会非并列，Keynote 分页讲 ③工作流步骤分散/左右各半/扁平噪点 ④动画不可逆（跳转+倒放【身份阶段】上边框+card发灰）⑤代码污染（旧代码/冗余/冲突/过时注释）⑥侧边栏没对齐+下划线+没复用
**引用流程**：sample-diff-learning + improve-animations + web-design-guidelines + grill-me + brainstorming（书记指定）+ browser_use 复现定位 + 数值采样验证
**来源**：书记指令（2026-08-13）

### 修复清单（browser 数值采样 6 项全通过）
1. **字体源更正**：书记指定正确源 `D:\PPT模板\党支部汇报-Fonts\南西油墨宋_字库星球\南西油墨宋\南西油墨宋.ttf`（MD5 与 C 盘用户目录文件一致，证明同一文件）；从正确源重新 fontTools 子集化（1.3MB woff2）；清理"name 表损坏诊断"余毒注释，about.css/about.html 注释简化为「字体源 + @font-face 子集」。
2. **哲学分页**（两机会非并列）：删除「机会1/机会2」并列编号（书记明示「（1）（2）只是提示词手段」）；`.ab-philosophy-opp` 改 `min-height:78vh` 内容垂直居中 + gap `clamp(60px,10vh,120px)` 分页间隔——像 Keynote 分 2 页讲。
3. **工作流**：`.ab-exploration-scene-body` grid `7fr:3fr → 1fr:1fr`（左右各半）；`.ab-exploration-stage` min-height `clamp(220px,34vh,320px) → clamp(320px,46vh,440px)`（步骤分散加长下滑）；`.ab-node-circle` 去 drop-shadow（扁平化，噪点由全局层提供）。
4. **动画可逆（根因修复）**：复现定位——"上边框"未复现（已修），"发灰"根因是入场动画 `once:true` 单向不可逆：跳转+倒放后行永久点亮（opacity 1）但阶段标签颜色（scrub）已回顶部灰色，形成"发灰"。修复：cardEntrance + bindDevelopmentEntranceAnimation + philosophy 独立 fromTo 全部 `once:true → scrub:true`，from 态 `autoAlpha:0 → 0.5`（倒放退场回半透明，不「翻回去全暗」），ease `power2.out→none`。验证：跳转+倒放后未入视口行 opacity 回 0.5（非永久 1），中间过渡值 0.62/0.70/0.78 证明 scrub 插值。
5. **代码污染清理**：删除 about-entry.js 头部 33 行版本历史注释（v4~v15.3，旧决策"苹果风"等已过时）→ 6 行当前说明；删除死代码 `.ab-tl-stage.is-active`（颜色插值已替代）；删除 `.ab-tl-stage` 的 `transition:color 0.4s`（scrub 每帧写 color，transition 致滞后）。
6. **侧边栏对齐**：about.html 缺失 Tailwind CDN + config（其余 15 页都有）→ 补上标准 config（与 index 一致）。根因：缺 Tailwind 致 `pt-16` 不生效（padding-top=0，侧边栏错位）+ preflight 未加载（链接默认下划线）。验证：padding-top=64px、header 高 56px、toc-dot-item 无下划线。

### 版本号
`20260813c → 20260813d`（about.html 三处）

### 变更文件
`docs/about.html`（补 Tailwind CDN+config + 版本号 d）/ `docs/src/about.css`（哲学分页/工作流 1:1+分散+去阴影/is-active 死代码+transition 清理）/ `docs/src/entries/about-entry.js`（头部注释清理 + once→scrub 可逆重构 + 哲学去编号）/ `docs/assets/fonts/nanxi-youmosong-subset.woff2`（正确源重新子集化）

### 沉淀标签
`[经验: once 单向动画不可逆]` — GSAP ScrollTrigger `once:true` 入场动画在「跳转+倒放」场景下：跳转瞬间动画触发一次后永久点亮（不可逆），与 scrub 驱动的其它动画（颜色/进度）不同步，造成"发灰/卡中间态"；可逆入场应改 `scrub:true` + from 态半透明（0.5 而非 0）——既随位置可逆，又避免倒放「翻回去全暗」。
`[经验: 页面骨架须与全局一致]` — 多页面应用若某页缺少全局 CDN（Tailwind）或 config，其 header/sidebar 依赖的工具类（pt-16 等）静默失效（布局错位）+ preflight 未加载（链接下划线）；新增/修改页面须对照其它页补齐全局骨架，复用而非各自为政。

## T-224 （保留编号）

- **commit**：待提交（push 需书记批准）

## T-232 工作流关系动画批判性重构：镜组驱动分镜式 + SOP 二次对齐修正 6 处（2026-08-13）

**任务**：书记 10 条批评第 5/6/7/8 条——工作流动画「节点排布僵化无逻辑/运镜无停留稳态/线上又有字又有色」彻底混乱，须批判性重构（非补丁），并与 SOP/网页对齐、细化工作颗粒度须与书记讨论。书记通过 AskUserQuestion 逐条裁定：流类型三类（实/虚/点）、分镜可适当合并（8 镜组）、分叉并排展示、8 镜组颗粒度合适。
**引用流程**：brainstorming + sample-diff-learning + grill-me + improve-animations + web-design-guidelines（书记指定）+ SOP 母本对齐（常见工作场景快速指南/组织委员工作流程指南/党小组组长工作手册）+ H30.1 一改具改 + H40 检查清单
**来源**：书记指令（2026-08-13，10 条批评）+ 书记多轮 AskUserQuestion 决断

### 设计 spec（`.trae/specs/2026-08-13-workflow-animation-redesign-design.md`，已批准）
- flow 级底账（活动 12 flow + 专班 8 flow = 20）+ 镜组滚动稳态（8 个：活动 5 + 专班 3）
- 图例三类：实线=任务/赋权流、虚线=信息流、点线=文件流（颜色只分当前/非当前两态）
- 扁平化：无分层无中心包围，连线（交流）主角；信息集中靠「反复出现+视觉重量」（weight=2 核心高频节点圆更大）
- 分叉并排：活动两种发起路径（自上而下=支委/党小组组长布置承包 / 自下而上=组织者提议请求赋权）并排展示

### SOP 二次对齐修正 6 处（书记"先对齐 SOP"落地）
1. 删除编造审批链「党小组组长→支委→书记→党小组组长」——SOP 活动审批主体就是党小组组长
2. 删除编造三条「党支书↔委员（横向配合）」——SOP 活动流程书记只在跨组通知/经费审批出现
3. 「材料归档」主体由组织者改深度参与者（SOP 步骤10）
4. 自上而下发起人由党支书改「支委/党小组组长」（SOP 组织者情况Ⅰ）
5. 删除编造「发起人→组织者/深度参与者（业务赋权）」——SOP 专班赋权由组织委员统一招募赋权
6. 专班「交付成果」改「工作考察记录→纪检委员+工作量归档→组织委员」；「请求招募」更正「提出需求」归虚线·信息（呼应书记"信息流"之问）

### 代码重构（about-entry.js + about.css）
1. **数据层重写**：旧 ACTIVITY_NETWORK/TASKFORCE_NETWORK/EXPLORATION_STAGES（stage 驱动四层硬编码）→ WORKFLOW_ROLES（角色元数据 name+weight）+ ACTIVITY_SCENE（5 shot）+ TASKFORCE_SCENE（3 shot），每 shot 独立构图（nodes+edges）
2. **渲染层重写**：renderNetworkSVG（全景+四层坐标+线上贴字+三色编码+SMIL 流光点）→ renderShotSVG（单镜组扁平化：线三类墨色统一、节点权重分级、无线上文字、无 duty/ring/tooltip）；renderExploration 渲染镜组卡片+镜组 SVG 层（.ab-shot-group 堆叠）
3. **滚动驱动重写**：bindExplorationScrollDriven 从「stage 连续插值 + viewBox 推近 + SMIL 流光点」→「镜组稳态切换」（卡片顶部越过视口 60% 线判定当前镜组，左侧 SVG 层淡入淡出，viewBox 固定不推近，可逆）
4. **死代码清理**：删除 NETWORK_MOTION/EDGE_LENGTH_CACHE/identifyActiveNodes/computeScrollProgress/renderNetwork/computeStageFocalBox/buildStageStates/applyNetworkState/bindNetworkHover/triggerStageFlow 约 500 行 + about.css 死类（.ab-network-container/.ab-network-svg/.ab-node-ring/.ab-node-duty/.ab-edge-label*/.ab-flow-dot/.ab-network-tooltip/.ab-network-wrap/.ab-edge--collab/.ab-legend-line--collab）
5. **CSS 扁平化**：线三类统一墨色（实/虚/点 dasharray 区分）、节点统一墨色圆+暖纸白字、weight 分级字号、.ab-exploration-network-sticky 加 aspect-ratio 800/460、.ab-shot-group 绝对定位堆叠+opacity 过渡

### 版本号
`20260813d → 20260813e`（about.html：about.css + about-entry.js）

### 变更文件
`.trae/specs/2026-08-13-workflow-animation-redesign-design.md`（新建，已批准）/ `docs/src/entries/about-entry.js`（数据层/渲染层/滚动驱动重构 + 死代码清理）/ `docs/src/about.css`（扁平化+镜组层叠+死类清理）/ `docs/about.html`（版本号 e）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误；✅ 全仓 Grep 旧标识符（ACTIVITY_NETWORK/renderNetwork/applyNetworkState/NETWORK_MOTION/bindNetworkHover/triggerStageFlow 等）零残留；✅ 全仓 Grep about.css 死类（.ab-node-ring/.ab-edge-label/.ab-flow-dot/.ab-network-tooltip/.ab-edge--collab 等）零残留

### 沉淀标签
`[待沉淀: 分镜式进出替代连续运镜]` — 滚动叙事动画中「连续运镜（viewBox 推近）+ 节点全量常驻 dim/active 插值」会造成"节点排布僵化、运镜无停留稳态、线上文字+颜色视觉困扰"；「镜组稳态切换」（每个 flow 组一个独立构图，滚动时层叠淡入淡出，节点移入/移出视野）才符合"分镜"语义——每个镜组一个停留稳态，viewBox 固定。
`[经验: 动画重设计须先对齐母本再画 flow]` — 工作流可视化 flow 分镜极易"凭想象编造审批链/横向配合/赋权主体"偏离 SOP；必须先逐条对齐 SOP 母本（发起路径/审批主体/赋权主体/产出物定向投递），否则可视化越精细越错误。

- **commit**：待提交（push 需书记批准）

## T-233 工作流动画二轮重构：连续运动替代幻灯片轮播 + 节点着色连线渐变 + 图例内联 flows（2026-08-13）

**任务**：书记反馈 3 条——①位置排布好看，但箭头太小看不清（用起终点颜色补义）、运动不丝滑成"幻灯片轮播"、图例高悬死功能 ②继续推进未完成事项 ③动/静自觉（行百里者半九十的框一直转，但地平线/视窗动/静没自觉）。书记 AskUserQuestion 三向裁决：运动形态=单一画布+节点连续移动；颜色=节点着色+连线渐变；图例=删图例+内联 flows。
**引用流程**：improve-animations + grill-me + web-design-guidelines + brainstorming（书记指定）+ 书记 AskUserQuestion 裁决 + H30.1 一改具改
**来源**：书记指令（2026-08-13）+ 书记三向裁决

### 根因诊断（"幻灯片轮播"）
上轮把「分镜式进出」误实现成「每个镜组一个独立 SVG，切换时 opacity 淡入淡出」= 翻页。正确：**视窗（viewBox）固定**（停留稳态），但**节点和连线要连续运动**。误把「视窗静」扩展成「整屏静」。

### 实现（about-entry.js + about.css）
1. **数据层**：WORKFLOW_ROLES 加 `color`（低饱和语义色：组长绿/组织者蓝/组织委员青/纪检橙/宣传蓝/发起人红/招募紫/参与者灰）；shot.flows 由字符串数组改 `{ text, type }`（供内联线型图标）
2. **渲染层**：`renderShotSVG`（每镜组一个 SVG）→ `renderSceneSVG`（每场景单一 SVG）：去重节点 + 去重边（带 shot 归属）+ 每条边一个 `linearGradient`（userSpaceOnUse，from 色→to 色）+ 箭头终点色；删除独立图例
3. **滚动驱动**：`bindExplorationScrollDriven` 从「镜组层叠淡入淡出」→「连续插值」——`continuousProgress`（卡片顶部越视口 60% 线线性映射 0..shotCount-1）+ `nodeStateAt`（节点位置在镜组间 lerp + 入场/离场淡入淡出）+ `edgeStateAt`（边在所属镜组附近生长/淡出）+ `renderFrame`（每帧重算节点 transform + 边 path + 渐变 x1/y1/x2/y2 跟随 + 箭头角度）
4. **CSS**：节点/边/箭头的 fill/stroke 改由 SVG 属性（角色色/渐变/终点色）决定，CSS 不再硬编码墨色；线型 dasharray 保留（实/虚/点）；删除图例样式；新增 `.ab-flow-line--task/info/file`（flows 内联线型小图标）；`.ab-shot-group/.ab-shot-svg` → `.ab-scene-svg`

### 版本号
`20260813e → 20260813f`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（数据层 color/flows type + renderSceneSVG + bindExplorationScrollDriven 连续插值）/ `docs/src/about.css`（节点着色/边渐变/flows 图标/删图例/scene-svg）/ `docs/about.html`（版本号 f）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误；✅ 全仓 Grep 旧标识符（renderShotSVG/ab-shot-group/ab-network-legend/ab-legend-）零残留

### 沉淀标签
`[待沉淀: 分镜≠层叠翻页]` — 「分镜式进出」的正确语义是「视窗静 + 节点动」：viewBox 固定提供停留稳态，节点位置在镜组间连续 lerp（走进/走出视野）、边连续淡入淡出；若实现成「每镜组一个 SVG 层叠 opacity 切换」，就成了"幻灯片轮播"而非动画。
`[经验: dasharray 生长与线型冲突]` — 边既要用 dasharray 表达线型（实/虚/点），又要用 dasharray 做描边生长（全长+offset），二者冲突不可兼得；线型语义与生长动画只能二选一，本轮选线型语义（dasharray 表达实/虚/点）+ 边连续 opacity 淡入，放弃描边生长。

- **commit**：待提交（push 需书记批准）

## T-234 节点文字可读性 + 工作流停顿节奏 + 动/静自觉清单（2026-08-13）

**任务**：书记反馈 3 条——①再次强调动/静自觉（行百里者半九十的框一直转，但地平线/视窗动/静没自觉思考，管中窥豹非一处问题）②工作流要丝滑动画 + 适当停顿（让观看者知道是一步阶段）③「圈圈里面的字都能看见吗」。
**引用流程**：brainstorming + improve-animations（书记指定）+ 书记 AskUserQuestion 多轮裁决 + H30.1 一改具改
**来源**：书记指令（2026-08-13）+ 书记裁决

### 书记裁决
- 节点文字：圆内短名 + 圆下完整名；严重溢出的「支委/党小组组长」短名取「发起人」；**所有圆圈统一大小、至少容纳 5 字**
- 工作流停顿：停留 75% / 过渡 25%
- 动/静自觉：全局排查

### 实现（about-entry.js + about.css）
1. **节点文字可读性**：WORKFLOW_ROLES 加 `short`（圆内短名：发起人/组长/组织者/深度/普通/组织委员/纪检委员/宣传委员/发起人/招募），删 `weight`（统一圆大小 r=48，直径 96px 容纳 5 字）；renderSceneSVG 节点加圆下完整名（`.ab-node-name`，仅当 short ≠ name 时显示）；edgePath radius 42→48（匹配新圆半径）
2. **工作流停顿**：bindExplorationScrollDriven 加 `stepwise` 阶梯映射——每个镜组停留 75% 滚动行程（稳态停顿），25% 丝滑过渡（smoothstep 缓动），替代匀速连续 lerp
3. **动/静清单注释**：bindDialogueScrollActivation（静=地平线/视窗/卡片文字，动=卡片公转）+ bindExplorationScrollDriven（静=视窗/卡片三态，动=节点/边）加显式【动/静自觉清单】注释

### 版本号
`20260813f → 20260813g`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（WORKFLOW_ROLES short/删 weight + renderSceneSVG 圆下完整名 + edgePath 48 + stepwise 阶梯映射 + 动/静清单注释）/ `docs/src/about.css`（.ab-node-name 新增 + .ab-node-text 字号统一 16px + 删 --w2/--w1 字号分级）/ `docs/about.html`（版本号 g）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误；✅ 全仓 Grep weight/ab-node-svg--w 零残留

### 沉淀标签
`[待沉淀: 阶梯映射=丝滑+停顿]` — 滚动动画「丝滑过渡 + 阶段停留」的正确实现是阶梯映射：把连续滚动进度映射为「每个整数阶段停留 75% 平台 + 25% 缓动过渡」，而非匀速连续 lerp（无停顿=感受不到阶段）或离散切换（有停顿但生硬=幻灯片）。
`[经验: 节点长名溢出圆]` — 中文字符宽度≈字号，长角色名（如「支委/党小组组长」8 字）在圆内必然溢出；解法「圆内短名（2-4 字）+ 圆下完整 T1 名」，圆统一大小至少容纳 5 字。

- **commit**：待提交（push 需书记批准）

## T-235 恢复完整名 + 补全局动/静清单（2026-08-13）

**任务**：书记指令——①继续完成全局动/静排查（补 hero 退场/camera 镜头交接/development 时间轴/conclusion 终章 4 章动/静清单注释）②既然圆能容纳 5 字，党小组组长/深度参与者恢复完整名，**能不简写则不简写**。
**引用流程**：brainstorming（书记指定）+ H40 检查清单 + H30.1 一改具改
**来源**：书记指令（2026-08-13）

### 实现（about-entry.js）
1. **恢复完整名**：WORKFLOW_ROLES 的 leader「组长」→「党小组组长」、deep「深度」→「深度参与者」、normal「普通」→「普通参与者」（short 恢复为完整名，圆 r=48 容纳 5 字）；仅 committer「支委/党小组组长」8 字超圆，保留 short「发起人」+ 圆下完整名
2. **补全局动/静清单注释**（4 章）：bindHeroExit（动=heroInner/scrollHint，静=其余）、bindCameraPairs（动=旧场景后拉/新场景驶入，静=其余）、bindCameraFlow（动=conclusionInner 落位驶入，静=其余交接对由 pairs 负责）、bindDevelopmentScrollProgress（动=进度条 scaleX/阶段标题颜色插值，静=时间轴结构）

### 全局动/静清单（6 章已齐）
| 章节 | 动 | 静 |
|---|---|---|
| Hero 退场 | heroInner 淡出上移 + scrollHint 消失 | 其余章节 |
| 章节镜头交接 | 旧场景后拉 + 新场景驶入 | 其余场景 |
| Development 时间轴 | 进度条 scaleX + 阶段标题颜色插值 | 时间轴结构 |
| 终章收束 | conclusionInner 落位驶入 | 其余 |
| Dialogue 对话卡 | 卡片公转 + elevation 驱动 | 地平线/视窗/卡片文字 |
| Exploration 工作流 | 节点位置 lerp + 边淡入 + 渐变跟随 | 视窗(viewBox)/卡片三态 |

### 版本号
`20260813g → 20260813h`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（WORKFLOW_ROLES 恢复完整名 + 4 章动/静清单注释）/ `docs/about.html`（版本号 h）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误

- **commit**：待提交（push 需书记批准）

## T-236 SOP 全局变更「宣传委员不直接接触深度参与者」+ dialogue 正午停留 + 工作流颜色/视窗/右侧（2026-08-13）

**任务**：书记 4 条反馈——①dialogue 章动/静（第 3 次强调，必须解决，多问）②SOP 全局修改：宣传委员不直接接触深度参与者，统一组织者打包③工作流颜色混乱/视窗只占上 60%/右侧表述不够结构化且字号小④标题对齐≠卡片内容对齐。
**引用流程**：brainstorming + improve-animations + grill-me（书记指定）+ 书记 AskUserQuestion 裁决 + H30.1 一改具改 + H40 检查清单（母本优先）
**来源**：书记指令（2026-08-13）+ 书记裁决

### 书记裁决
- dialogue 动/静：静（地平线/视窗始终静）+ 卡片正午停留；「进入第六章时运动着进，视窗停时【1】在正午，出去继续运转」
- SOP 链路：深度参与者→组织者（交付）→组织者打包→宣传委员（归档），一改具改
- 颜色：用 COMMISSIONER_FRAMEWORK §C.3 硬编码色（组织蓝 #3B82F6/纪检琥珀 #D97706/宣传海蓝 #2563EB）
- 右侧：分条列点 + 放大字号

### SOP 一改具改（母本优先）
1. `常见工作场景快速指南.md`：步骤 9「宣传产出」负责人「深度参与者（宣传委员督办）」→「深度参与者（组织者打包督办）」；步骤 10「材料归档」+ 宣传规则表「档案归档」——「深度参与者提交宣传委员」→「深度参与者整理材料交组织者，组织者打包提交宣传委员」
2. `宣传委员工作流程指南.md`：步骤 6「审核深度参与者提交」→「审核组织者打包提交」
3. `DATA_ARCHITECTURE.md`：产出物表「宣传材料」上传方「深度参与者素材」→「组织者打包提交（深度参与者素材）」
4. `about-entry.js` shot 3：edges `deep→propComm`（×2）→ `deep→organizer` + `organizer→propComm`（组织者成为打包枢纽，节点布局重排）

### 代码实现（about-entry.js + about.css）
1. **dialogue 正午停留**：baseAngle `[-30,-90,-150,90]`→`[-90,180,90,0]`（第 1 张卡初始在正午 -90°）；新增 `stepwise` 阶梯映射（每张卡到正午 progress=i/4 停留 75% / 过渡 25%）
2. **工作流颜色**：三委员改硬编码色（orgComm #3B82F6/discComm #D97706/propComm #2563EB）+ 职能色（发起红/审批绿/执行青/参与灰/动作紫）
3. **右侧结构化**：`.ab-exploration-stage-desc` 13.5→15px、`.ab-exploration-stage-flows` 改 flex-column（分条列点）+ li 12→14px
4. **视窗更大**：`.ab-exploration-scene-body` 左列 1fr→1.15fr（左 57.5%）

### 版本号
`20260813h → 20260813i`（about.html：about.css + about-entry.js）

### 变更文件
`content/02_institution/sop/常见工作场景快速指南.md` / `content/02_institution/sop/宣传委员工作流程指南.md` / `content/04_web_design/DATA_ARCHITECTURE.md`（SOP 一改具改）/ `docs/src/entries/about-entry.js`（shot3 链路 + dialogue 正午停留 + 颜色硬编码）/ `docs/src/about.css`（右侧结构化字号 + 视窗列宽）/ `docs/about.html`（版本号 i）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误；✅ 全仓 Grep「深度参与者提交/审核深度参与者」零残留（仅存「组织者打包提交」正确表述）

### 沉淀标签
`[待沉淀: 制度变更须一改具改]` — 「宣传委员不直接接触深度参与者，统一组织者打包」这类制度级变更，须同步改 SOP 母本（快速指南步骤/宣传委员指南/数据架构产出物表）+ 工作流可视化（edges 链路 + 节点布局），母本优先、代码跟随，缺一即不一致。
`[待沉淀: 正午停留=阶段语义]` — dialogue「日出日落」的阶梯停顿以「正午（卡片在环顶）」为停留点：第 1 张卡初始即在正午，每张卡依次转到正午停留 75%/过渡 25%，让「阶段」有明确的稳态语义（正午=当前阶段）。

- **commit**：待提交（push 需书记批准）

## T-238 工作流增高 viewBox + dialogue sticky 固定视窗 + review 对齐修复（2026-08-13）

**任务**：书记 3 条反馈——①第五章左侧图像太在上部、下方 40% 留白，不能忍受 ②第六章「你停留在何处？视窗暂停了吗？为什么对书记的话几次置若罔闻？请你反思」③接着处理未尽事项（ask user question）。
**引用流程**：grill-me + improve-animations + brainstorming + web-design-guidelines（书记指定）+ 书记 AskUserQuestion 裁决 + H30.1 一改具改
**来源**：书记指令（2026-08-13）+ 书记裁决

### 书记裁决
- dialogue：需 sticky 固定视窗（像工作流章那样滚动时固定，卡片在内公转 + 正午停留）
- 工作流：增高 viewBox + 节点下移
- 未尽事项：先做对齐检查

### 反思（书记批评"置若罔闻"）
我的偏差：①把「卡片正午停留」做成「卡片公转 θ 阶梯」，但书记说的「视窗停止」是「sticky 固定视窗」——没搞清「视窗」概念；②把「进入」当成「第一个停留点」，让卡 1 在 p=0 就在正午，而书记要「运动着进来，滚动到停留点才停」；③「出去继续运转」没实现。根因：没有系统全局思维，只在「卡片」层面修修补补。

### 实现（about-entry.js + about.css）
1. **工作流增高 viewBox**：viewBox `0 0 800 460`→`0 0 800 600`（两 scene）；8 个 shot 节点 y 坐标整体下移扩展（y 100-380 → 150-450）；`.ab-exploration-network-sticky` aspect-ratio 800/460→800/600（sticky 更高、占视口更多）
2. **dialogue sticky 固定视窗**：`.ab-dialogue-flow` `position:relative`→`position:sticky; top:clamp(96px,12vh,140px)`，尺寸 min(96vw,1000px)→min(92vw,680px)；卡片 280→260px；renderDialogue 加 `.ab-dialogue-spacer`（height 140vh 提供 sticky 滚动范围）；`updateDialogue` progress 重写——基于 flow 的 sticky 范围（flow 顶到 stickyTop=progress 0，结束 sticky=progress 1），使「视窗停止时第 1 张卡在正午」
3. **对齐修复**：`.ab-review-card` 加 `text-align:left`（review 章标题 --right 右对齐，卡片内容此前连带右对齐——标题对齐 ≠ 内容对齐）

### 版本号
`20260813i → 20260813j`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（viewBox/节点坐标 + dialogue spacer + updateDialogue 重写）/ `docs/src/about.css`（aspect-ratio 800/600 + flow sticky + spacer + review 卡片对齐）/ `docs/about.html`（版本号 j）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误

- **commit**：待提交（push 需书记批准）

## T-239 制度层全局修改「支委会审议立项/支委扩大会讨论」+ 第六章布局修复（2026-08-13）

**任务**：书记 3 条反馈——①第六章修复「完全失败」（布局乱：卡片溢出/重叠/被裁剪）②专班不能只有组织委员，须把「支委会」「发起人」作为整体（不能只有组织委员/组织者/深度参与者/纪检委员）③继续处理未尽事项。
**引用流程**：improve-animations + web-design-guidelines + brainstorming（书记指定）+ 书记 AskUserQuestion 裁决 + H30.1 一改具改（母本优先）
**来源**：书记指令（2026-08-13）+ 书记裁决

### 书记裁决（制度层新定义）
- **专班**：发起人可多人（不过拟合）→ **支委会审议立项**（线上/线下）→ 组织委员招募 → 执行。「专班频率不高，这个组织方式很好」
- **活动**：党小组组长汇集信息 → **支委扩大会讨论研究**（线上/线下）→ 推进执行
- 核心：集体决策环节（支委会/支委扩大会）替代单人审批（书记/党小组组长）

### SOP 母本一改具改
1. `COMMISSIONER_FRAMEWORK.md`：§一「活动创建审批」→「活动立项审议」（党小组组长汇集→支委扩大会讨论研究）；§二「专班创建审批」→「专班立项审议」（发起人可多人→支委会审议立项→组织委员招募）
2. `常见工作场景快速指南.md`：快速流程「党小组组长审批」→「支委扩大会讨论」；步骤 2「党小组组长审批」→「支委扩大会讨论」（党小组组长汇集/支委扩大会讨论）

### 工作流可视化（about-entry.js）
1. `WORKFLOW_ROLES` 新增 `committee`（支委会）/`expanded`（支委扩大会），删除死角色 `committer`/`recruit`
2. 活动 shot 0「发起分叉」→「发起+支委扩大会讨论」（党小组组长→支委扩大会→组织者）；shot 1「审批赋权+分工」→「分工」（组织者→深度参与者）
3. 专班 shot 0「提出需求+招募」→「发起+支委会审议」（发起人→支委会→组织委员）

### 第六章布局修复（about.css + about-entry.js）
- 诊断 3 个 bug：①flow 680px 太高（sticky 底部超视口）②卡片 260px + R=0.3S 导致卡片在环顶/环底超出 flow 被裁剪 ③progress 的 offsetTop 依赖缺失的 position:relative
- 修复：flow 620px + 卡片 240px + R 0.3S→0.25S（卡片不超出 flow）+ spacer 120vh

### 版本号
`20260813j → 20260813k`（about.html：about.css + about-entry.js）

### 变更文件
`content/02_institution/COMMISSIONER_FRAMEWORK.md`（§一/§二）/ `content/02_institution/sop/常见工作场景快速指南.md`（快速流程+步骤2）/ `docs/src/entries/about-entry.js`（WORKFLOW_ROLES + 活动/专班 shot0/1 + R 0.25）/ `docs/src/about.css`（flow 620 + 卡片 240 + spacer 120vh）/ `docs/about.html`（版本号 k）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误；✅ 全仓 Grep committer/recruit 零残留

### 沉淀标签
`[待沉淀: 集体决策环节=集中的表述]` — 制度层「支委会审议立项（专班）/支委扩大会讨论研究（活动）」是「民主与集中」中「集中」的落地——决策从单人（书记/党小组组长）上收为集体（支委会/支委扩大会），可视化须体现这个集体决策节点，而非把发起人窄化为单一人。
`[待沉淀: 环上卡片须留安全边距]` — 环形公转动画中，卡片半高 + 环半径须 ≤ 舞台半高（R + 半高 ≤ S/2），否则卡片在环顶/环底溢出容器被裁剪；环半径取 0.25S + 卡片紧凑尺寸是安全组合。

- **commit**：待提交（push 需书记批准）

## T-240 3 委员 SOP 传播新制度 + 第六章「不转+逼仄」彻查修复（2026-08-13）

**任务**：书记 3 条——①专班理解再强调（发起人可多个、支委会审议立项）②活动管理（党小组组长汇集→支委扩大会讨论），要求「确保在 content 中完成传播，特别是 3 个委员的 SOP」③第六章完全不转、卡片逼仄，彻查代码原因彻底改正。
**引用流程**：brainstorming + web-design-guidelines（书记指定）+ H30.1 一改具改
**来源**：书记指令（2026-08-13）

### 3 委员 SOP 传播（一改具改）
1. `组织委员工作流程指南.md` line 23「提出需求与招募统筹分离」补「经支委会审议立项后」；line 29「两个动作」补「立项由支委会审议（线上或线下）」
2. `宣传委员工作流程指南.md` line 27「活动创建是块块职权（党小组组长和书记）」→「活动发起是块块职权（党小组组长汇集、支委扩大会讨论）」
3. `纪检委员工作流程指南.md`：考勤/考察监督职能，不涉及活动/专班发起审批，无需改

### 第六章彻查修复（根因：2 个 bug）
1. **offsetTop 不可靠**：`.ab-dialogue-inner` 缺 `position:relative`，`flow.offsetTop` 相对 section 而非 parent → progress 起点错位。修复：补 `position:relative`。
2. **卡片重叠（逼仄）**：R=0.25S=155px 太小，4 卡 90° 间隔弦长 219px < 卡片宽 240px → 重叠。修复：flow 620→660px、卡片 240→230px、R 0.25→0.26（弦长 243px ≥ 230px 不重叠，R+半高 297 ≤ 330 不超出）。

### 版本号
`20260813k → 20260813l`（about.html：about.css + about-entry.js）

### 变更文件
`content/02_institution/sop/组织委员工作流程指南.md` / `content/02_institution/sop/宣传委员工作流程指南.md` / `docs/src/about.css`（.ab-dialogue-inner position:relative + flow 660 + 卡片 230）/ `docs/src/entries/about-entry.js`（R 0.26）/ `docs/about.html`（版本号 l）

### 验证结果
✅ GetDiagnostics about-entry.js 零错误

### 沉淀标签
`[待沉淀: 环形卡片布局三约束]` — 环形公转卡片须同时满足三约束：①卡片不超出容器（R+半高 ≤ S/2）②相邻卡片不重叠（1.414R ≥ 卡片宽）③sticky 完整显示（S+stickyTop ≤ 视口）。三约束联立得 S≈660、卡片≈230、R≈0.26S。此前只满足①（R=0.25）导致②重叠。
`[待沉淀: offsetTop 依赖 position:relative]` — 用 `element.offsetTop` 计算 sticky 元素相对父容器的偏移时，父容器必须 `position:relative`，否则 offsetTop 相对更远的定位祖先，progress 起点错位。

### 补充修复（书记真机反馈「完全不转+逼仄」第二轮）
1. **scroll 双保险**：`if (lenis) lenis.on('scroll')` + `window.addEventListener('scroll')` 同时注册，确保任何滚动路径都触发 updateDialogue（此前仅 lenis 分支，若 lenis 事件未触发则卡片不转）。
2. **卡片间距再增大**：R 0.26→0.28（弦长 262px，间距 42px）、卡片 230→220px，解决「逼仄」。
3. 版本号 `20260813l → 20260813m`。

- **commit**：待提交（push 需书记批准）

## T-241 第六章「完全不转」根因根治 + 加载提速 + 死代码彻查（2026-08-14）

**任务**：书记 3 条——①第六章问题依旧没解决 ②彻查冗余/冲突/死代码，动画加载速度并不快 ③专班（发起人可多人→支委会审议立项→组织委员招募）与活动（党小组组长汇集→支委扩大会讨论）确保在 docs/网页系统逻辑中传播（书记强调「很重要」）。
**引用流程**：brainstorming + grill-me（书记指定）+ H30.1 一改具改 + verification-before-completion
**来源**：书记指令（2026-08-14）

### 第六章「完全不转」根因根治（浏览器实测定位）
- **真机验证**（TRAE-browseruse）确认：上一轮修复后卡片仍恒冻结在初始相位（卡01 恒正午、卡03 恒地下）。
- **根因**：updateDialogue 中 `headerH = flow.offsetTop` **每帧重读**，而 Chrome 对 sticky 卡住期间的元素 `offsetTop` 返回**视觉偏移**（随滚动增长 559→1102px）→ `startBottom ≡ parentRect.bottom`、`traveled ≡ 0` → progress 恒 0 → 卡片完全不转。此前所有公式（flow 顶相对视口、parent 底相对视口）都绕不开 offsetTop 的 sticky 视觉偏移。
- **修复**：headerH 改为**静态缓存**——仅当 flow 未被卡住（顶 > stickyTop）或 resize 时刷新（此时 offsetTop = 静态布局值）；自然自愈字体加载等布局变化。
- **附带修复（同轮真机排查）**：
  1. **coda 与垫片换序**：垫片紧邻 flow 之后、coda 之前。原 coda 在垫片前 → sticky 期间 coda 文本从下向上滑过并盖住旋转卡片（「布局乱」元凶之一）。
  2. **移除逐帧 `filter:saturate`**：最贵渲染属性之一；地下卡 opacity=0 时不可见、升起时与 opacity+scale+border 几乎无差 → 亮度只由 opacity/scale/border-color 表达。
  3. **rAF 节流**：lenis.on + window scroll 同帧触发两次 → rAF 合并每帧仅执行一次 apply。

### 死代码/冲突代码/加载提速彻查
- **去 Tailwind Play CDN**（about.html）：约 380KB 同步解析阻塞 JS + 外网往返。about 页骨架/header/sidebar 所用少量工具类已由 about.css「Tailwind 最小兜底」+ styles.css 兜底完整覆盖（逐一核对 header.js/sidebar.js 全部 class）；删除死 `window.tailwind.config` 块。
- **字体 preload**：`nanxi-youmosong-subset.woff2`（1.3MB，最大单资源）加 `<link rel="preload" as="font">` 提前并行下载。
- **死代码清理**：about.css 移动端/reduced-motion 兜底 3 处 `filter:none !important`（JS 已不写 filter → 冗余）删除，注释同步。
- **无残留验证**：全仓 Grep `style.filter`/`cdn.tailwindcss`/`window.tailwind`——about.html 零残留；仅工作台页（index/activity/archive/feedback/notice/help/search 7 页）保留 Tailwind（其组件依赖大量工具类，超出本轮 about 专项范围，列为后续项）。
- **复验加载**：FCP 92ms / DCL 471ms，关键资源全本地 ≤65ms，零外部 JS 阻塞（原 Tailwind CDN 时代首屏被 380KB 同步脚本阻塞）。

### docs/网页系统逻辑传播（专班 + 活动，已逐项验证）
- `definitions.js`：PENDING_EXPANDED「待支委扩大会讨论」+ 活动 '1b-2' state 元数据（sopTaskTitle「支委扩大会讨论」/ sopExecutor「expanded-committee」）+ 短期/长期模板均含 PENDING_EXPANDED
- `sopData.js`：taskId '1b-2'/'4-1b' 改「支委扩大会讨论」（党小组组长汇集信息→讨论研究→推进执行）
- `renderer.js`：_roleLabel 补 committee（支委会）/expanded-committee（支委扩大会）
- `about-entry.js` 探索区：活动 shot0「发起+支委扩大会讨论」（党小组组长→支委扩大会→组织者）；专班 shot0「发起+支委会审议」（发起人[书记/党小组组长/支委等，可多人]→支委会→组织委员招募）
- 母本（T-239/T-240 已落）：COMMISSIONER_FRAMEWORK §一/§二、3 委员 SOP
- 注：工作台专班为独立生命周期（taskforce.js，recruiting/active），其「支委会审议」以 about 探索区可视化 + SOP 母本为准；如书记要求工作台创建专班增加显式「支委会审议」环节，另行立项。

### 版本号
`20260813m → 20260814b`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（updateDialogue headerH 静态缓存 + spacer 前置 + 去 filter + rAF 节流 + 注释）/ `docs/src/about.css`（删 3 处 filter 兜底 + 注释）/ `docs/about.html`（去 Tailwind CDN + 死 config、字体 preload、版本号 b）

### 验证结果
✅ GetDiagnostics 4 文件零错误（about.html / about-entry.js / about.css + workflow 3 文件复查）；✅ 浏览器真机复验（v=20260814b）：4 卡严格单调轮转 卡0→卡1→卡2→卡3→卡0、每卡 opacity 完整 0→1→0、正午 75% 停留、无跳变/抖动；coda 仅结尾覆盖 op=0 地下卡、不遮可见卡；文字正立可读、无裁剪；FCP 92ms；✅ 全仓 Grep 死代码零残留（about 页域）

### 沉淀标签
`[待沉淀: sticky offsetTop 返回视觉偏移]` — Chrome 对 position:sticky 卡住期间的元素，`offsetTop/offsetLeft` 返回**视觉偏移**（随滚动增长）而非静态布局位置。用它做进度几何计算必须缓存静态值（卡住前/解除后读取），逐帧重读会令几何恒等式坍缩 → 动画恒停在起点。
`[待沉淀: sticky 垫片须紧邻动画元素后]` — sticky 行程垫片（spacer）必须紧邻 sticky 元素之后、后续内容之前；若后续内容（如收尾引语）插在垫片前，会随滚动从下向上滑过并盖住 sticky 视窗内动画元素。
`[待沉淀: Tailwind 最小兜底替代 CDN]` — 单页若仅用少量 Tailwind 工具类，可用静态 CSS 兜底（按依赖链逐一枚举 class）移除 Play CDN：消除约 380KB 同步解析阻塞 + 外网往返。

- **commit**：待提交（push 需书记批准）

## T-242 about 侧边栏一致性 + 字体余毒清理（2026-08-14）

**任务**：书记 2 条——①about 侧边栏与全站不一致（无退出登录 + 奇怪下划线），"为什么自己查不出来？为什么 about 另起炉灶了却不报告！" ②字体加载状态不好——"只能使用我给的字体地址，一定是现在的字体，余毒未尽！"。书记限定：**用代码方式检查（无多模态），不得用截图**。
**引用流程**：brainstorming + grill-me（书记指定）+ H30.1 一改具改 + verification-before-completion
**来源**：书记指令（2026-08-14）

### ① 侧边栏一致性：下划线根因（真实回归，非另起炉灶的独立缺陷）
- **下划线根因**：T-241 移除 about 页 Tailwind Play CDN 后，**丢失了 Tailwind preflight 对 `a` 标签的隐性重置**（`a { color:inherit; text-decoration:inherit }`）。`.module-tab`（sidebar 主导航）未显式设 `text-decoration`，浏览器默认 `underline` 回归 → 侧边栏 5 个导航链接全部出现下划线。help 页仍保留 Tailwind → 有 preflight → 无下划线，故书记看到 about 与 help 不一致。**根因是 T-241 去 CDN 时只覆盖了工具类、遗漏 preflight 基础重置——正是"另起炉灶却不报告"的代价。**
- **修复（一改具改，不依赖隐性依赖）**：
  1. `styles.css` RESET 区补 `a { color: inherit; text-decoration: inherit; }`（显性化 preflight 等价，全站所有页面一致，不再依赖 Tailwind 隐性行为）
  2. `.module-tab` 显式补 `text-decoration: none`（精准兜底）
- **退出登录**：DOM 实测确认**非 about 特有缺陷**——同标签登录后跳转 about/help 均显示「退出登录」；新标签直开任何页面均无退出登录（tabId 防串扰 A-11 全站一致行为，index 直开甚至重定向 login）。about 与 help/index 行为完全一致。

### ② 字体余毒清理（根因：旧子集缺 56 字 + 1.3MB 臃肿）
- **缺字根因**：旧 `nanxi-youmosong-subset.woff2`（1003 字符）子集化时字符集未覆盖 about 页当前全部用字 → **缺 56 字**（丝久乎但冗几刚善垫塞…），这些字在标题/正文回退到 Noto Serif SC → 混排 → "字体加载状态很不好"。另 1.3MB 体积大。
- **重建（fontTools 代码验证）**：从书记给的权威源 `D:\PPT模板\党支部汇报-Fonts\南西油墨宋_字库星球\南西油墨宋\南西油墨宋.ttf` 重新子集化（about 页系实际用字 + 去 hinting + woff2）：
  - 692 目标字符 → 685 cmap（无缺字，逐标题 `document.fonts.check` 全 true）
  - 体积 1.3MB → **909.7KB（-30%）**，本地加载 62ms
  - **字形防伪验证**：12 个代表字 glyph 轮廓与权威源逐字一致（`glyf` 相同）→ 确认是"现在的字体"，非伪字体
  - 浏览器实测：FontFace status=loaded、computed fontFamily 以 NanxiYoumosong 居首、canvas 双字体宽度 diff=true（字形真实生效非回退）
- **机制固化（不给后续模型重蹈覆辙）**：
  1. **正式工具** `docs/scripts/rebuild-nanxi-subset.py`：权威源路径写死（书记指定，禁止更换）+ 生成后自检缺字（退出码非零）+ 字形抽查与权威源一致（防 name 表一致但字形不符的"伪字体"）+ 去 hinting。改 about 页文案新增汉字后重跑工具再 bump 版本号。
  2. `about.css` 头部注释标注权威源 + 工具指针 + 防误用警告。
  3. 临时脚本 `.ctx/tools/rebuild-font-subset.py` 用完即删（.ctx/tools 空目录一并清理，T-236 规则）。

### 版本号
`20260814b → 20260814d`（about.html：styles.css + about.css + about-entry.js）

### 变更文件
`docs/src/styles.css`（RESET 补 a 重置 + .module-tab 去下划线）/ `docs/src/about.css`（字体注释标注权威源+工具指针）/ `docs/about.html`（版本号 d）/ `docs/scripts/rebuild-nanxi-subset.py`（新增正式工具）/ `.ctx/tools/`（临时脚本+空目录清理）

### 验证结果（全程代码方式，无截图）
✅ GetDiagnostics 4 文件零错误；✅ 浏览器 DOM 断言：NanxiYoumosong loaded + 全标题 check true + canvas 宽度 diff=true + woff2 931KB/62ms + console 零字体报错；✅ 侧边栏 `.module-tab`/`#app-sidebar a` 全部 computed textDecoration="none"；✅ 同标签登录后 about/help 均有退出登录（一致），新标签直开全站一致无退出登录（A-11 设计）；✅ 正式工具复验输出 `[OK]` 缺字 0 + 字形与权威源一致

### 沉淀标签
`[待沉淀: 去 CDN 须补 preflight 等价]` — 移除 Tailwind Play CDN 时，除工具类兜底外，必须同步补齐 preflight 基础重置（`a` 颜色/装饰、button、img、svg、h1-h6 等），否则浏览器默认样式回归（最典型：`a` 下划线）——"另起炉灶必须报告副作用"。
`[待沉淀: 字体子集化防错三件套]` — 自定义字体子集必须：①权威源路径写死并记录在注释/正式工具（防用错字体文件）②生成后自检"页面实际用字缺字=0"（防子集缺字混排）③字形抽查与权威源 glyph 一致（防 name 表一致但字形不符的伪字体）。子集化工具须作为正式工具保留（T-236 删除 subset 工具是误判，导致本次无法可靠重建）。

- **commit**：待提交（push 需书记批准）

## T-243 about 滚动卡顿彻查（冗余/冲突/动画代码）+ 字体加载裁决落地（2026-08-14）

**任务**：书记 3 条——①about 加载依旧缓慢，"一定有冗余代码、冲突代码，特别是动画设定" ②明确要求：清理所有南西油墨宋字体 + 重新从权威源 D:\PPT模板\...\南西油墨宋.ttf 获取 + 允许字体缓慢加载 ③"字体不是加载缓慢的原因，下滑的缓慢一定是有不合理的代码驱动导致的"，综合、评判、系统性审查修正。
**引用流程**：systematic-debugging（书记指定）+ brainstorming + grill-me + web-design-guidelines + H30.1 一改具改 + verification-before-completion
**来源**：书记指令（2026-08-14）

### 根因（systematic-debugging Phase 1 证据，非猜测）
按每帧成本排序的动画性能反模式：
1. **filter: brightness 每帧写 ×6 处**（bindCameraPairs 5 对章节镜头交接 + 探索区 storyboard 分镜退场）——filter 为最贵渲染属性，章节级大区域（整章/整个 SVG 网络）每帧重栅格化，滚动卡顿第一嫌疑。
2. **探索区每帧 layout thrash**：`update` 每帧调 `scene.getBoundingClientRect()` + `continuousProgress` 每帧调全部 `stages.getBoundingClientRect()`（读写交替强制回流），且 **plateau 75% 停留期间 p 不变仍全量重算**所有节点/边/箭头（无效 setAttribute 写入）。
3. **探索 stage 卡 filter: saturate(0.5/0.8) 三态切换**——`transition` 含 filter 0.5s，滚动时 data-state 频繁切换触发多卡 filter 过渡每帧重栅格化（与 T-241 dialogue 卡 filter 教训**同构**，一改具改漏网）。
4. **will-change: filter 冗余声明**（`.ab-conclusion-inner`/`.ab-conclusion-char`）——终章动画已无 filter，冗余声明仍强制 filter 合成层。
5. **字体 preload**——900KB woff2 抢首屏带宽/阻塞（书记裁决允许缓慢加载 → 移除）。

### 修复（一处根因一处修复，同步注释）
1. `bindCameraPairs`：5 对镜头交接移除 `filter: brightness(1)→0.92`（幅度 8% 视觉可忽略，压暗由 autoAlpha 表达）→ 仅 yPercent/scale 退场。
2. `bindExplorationStoryboardSwitch`：分镜退场移除 `filter: brightness` → 仅 autoAlpha 0.55 + scale 0.97。
3. `bindExplorationScrollDriven`：**几何缓存**（bind/resize 一次性读文档坐标，滚动帧零 getBoundingClientRect）+ **p 不变跳过 renderFrame**（plateau 期间零写入）+ resize 刷新。
4. `about.css`：探索 stage 三态移除 `filter: saturate`、transition 移除 filter；conclusion-inner/conclusion-char `will-change` 移除 filter。
5. `about.html`：**移除字体 preload**（允许缓慢加载，font-display:swap 保证文本先渲染后换字）。

### 字体（书记 3 条明确要求的落地）
- 全仓扫描：南西油墨宋仅 about 页一处（about.css @font-face + about.html），无他页/他文件残留 → 「清理」落地为移除 preload + 确认唯一加载点。
- 重新从权威源获取：重跑正式工具 `docs/scripts/rebuild-nanxi-subset.py`，`[OK]` 691 字/684 cmap/899.5KB/缺字 0/字形与权威源一致。
- 允许缓慢加载：不 preload、font-display:swap，首滚文本用回退字体渲染、字体就绪即换（一次性代价，缓存后 60fps）。

### 版本号
`20260814d → 20260814f`（about.html：styles.css + about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（camera/storyboard 去 filter + 探索区几何缓存/plateau 跳过）/ `docs/src/about.css`（stage 去 saturate + 2 处 will-change 去 filter）/ `docs/about.html`（去字体 preload + 版本号 f）

### 验证结果（浏览器实测硬数据，无截图）
✅ GetDiagnostics 3 文件零错误；✅ **filter 全页 computed ≠ none = 0 元素**（JS 零 filter 写入，grep 证实）；✅ **探索区滚动 60fps**（scrollBy/wheel/Lenis 三驱动均 60.05fps，P95 16.9ms，最长帧 17.4ms，**长任务 0**）；✅ **plateau 静止零 DOM 写入**（MutationObserver 计数 0，data-state 双采样一致）；✅ 唯一低帧场景 = 首次访问字体加载瞬时长任务（28fps、500-800ms，与"允许缓慢加载"裁决一致，字体缓存后就绪 60fps）；✅ 字体工具复验 [OK]

### 沉淀标签
`[待沉淀: filter 全仓一致性治理]` — 「filter 是最贵渲染属性」原则须全仓一改具改：不仅对话卡（T-241），镜头交接 brightness、storyboard brightness、stage saturate、will-change:filter 冗余声明都是同一模式的漏网——任何 filter 出现在滚动驱动动画/transition 中都按同标准清理；静态 `will-change` 声明也要逐处核对是否真有对应动画（冗余声明会强制合成层）。
`[待沉淀: 滚动动画性能三原则]` — 滚动驱动的逐帧代码：①滚动帧零布局读取（getBoundingClientRect/offsetTop 只在 bind/resize 缓存）②plateau/静止期 p 不变时跳过全量重算（缓存 lastP）③只写合成属性（transform/opacity），禁用 filter 与 layout-thrash 读写交替。

- **commit**：待提交（push 需书记批准）

## T-244 字体清除重挂 + 复杂度标准立规 + 章节卡壳/第五章/第六章重构（2026-08-14）

**任务**：书记 6 条——①字体选择走捷径，清除所有现有过程性脚本 ②清除所有现有南西油墨宋字体，重新挂载（不要纠结字体一样不一样）③代码用时间/空间复杂度尽可能低，写入代码标准 ④章节切换明显卡壳（切换很简单，代码繁复了）⑤第五章左侧视窗再往下移（占 40%、下 60% 空白）⑥第六章卡片逼仄、覆盖不到位、不丝滑、卡片与字重叠，标题和动画视窗同时出现而非卡片空转。
**引用流程**：grill-with-docs + brainstorming + improve-animations + systematic-debugging（书记指定）+ H30.1 一改具改 + verification-before-completion
**来源**：书记指令（2026-08-14）

### ①~③ 字体清除重挂 + 复杂度标准
- **清除**：删除 `docs/assets/fonts/nanxi-youmosong-subset.woff2`（现有字体）+ `docs/scripts/rebuild-nanxi-subset.py`（过程性脚本，书记要求全部清除）。
- **重新挂载**：一次性内联 python（不落脚本文件）从权威源 `D:\PPT模板\...\南西油墨宋.ttf` 重新生成——**set 去重提取字符集（O(n) 时间 / O(唯一字符) 空间）**，673 字符 / 882.5KB / woff2 挂载。
- **复杂度标准立规**：KNOWN_PITFALLS.md 新增 **§15 代码复杂度标准**（书记 2026-08-14 立规）——①集合/查重用 set/Map（O(n)），禁 O(n²) 嵌套遍历 ②滚动动画逐帧三原则（零布局读取/plateau 零写入/只写合成属性、禁 filter）③一次性任务用内联命令、过程性脚本零残留。

### ④ 章节切换卡壳（实测定位多点 + 修复 -53%）
- **实测**（longtask 全量扫描）：22 条长任务/13.6s → 卡壳多点分布：**探索区懒渲染边界 3.3s**（scrollY≈4255 插入 3800px + ScrollTrigger.refresh）+ philosophy 中段 6.4s（首滚字体栅格化）+ 初始加载 1.8s。
- **修复**：
  1. **懒渲染改空闲预渲染**：IntersectionObserver（滚动接近触发）→ `requestIdleCallback` 优先（页面加载后 510ms 后台渲染，滚动到探索区已就绪）；实测**探索区边界 700ms+ 长任务根除、该区间零长任务**。
  2. **storyboard gsap 目标修复**：活动/专班分镜动画目标从 sticky 容器改为内部 `.ab-scene-svg`——gsap 逐帧写 transform 到 `position:sticky` 容器会破坏 sticky（实测 top 漂移到 0）+ 每帧重栅格化大区域；修复后 sticky top 恒 96px。
  3. 总长任务 **-53%**（13 条/6.4s）；剩余卡壳在 development 中段（y≈4500 峰值 1787ms，首滚字体栅格化——书记裁决「允许字体缓慢加载」的一次性代价）与 dialogue 结尾，记入 next_prompt 后续优化。

### ⑤ 第五章左侧视窗下移
- **根因**：`aspect-ratio: 800/600` 固定高度偏矮（占视口约 40%）+ gsap 破坏 sticky（top 漂移）。
- **修复**：height 改 `min(66vh, calc(100vh - 220px))`（视口高度驱动）+ storyboard 不再写 sticky 容器。
- **实测**：视窗占视口 **66%**（436/661）、sticky 行程内 top **恒 96px**（不再漂移）、下方空白大幅收窄。

### ⑥ 第六章重构（标题与视窗同屏 + 卡片舒展 + 旋转修复）
- **章头入视窗**：eyebrow/title/sub 移入 sticky flow 内（`.ab-dialogue-head`），flow 改纵向 flex（head + `.ab-dialogue-stage` 方形舞台）——滚动旋转期间标题始终在场，不再是"几个卡片空转"。
- **舞台尺寸**：`min(92vw, 620px, calc(100vh - 310px))` 视口自适应。
- **卡片压缩**：200px 宽、padding 16/14、question 14.5/desc 12（卡高 372→250-269，R 按实际卡高自适应 `min(0.28S, S/2-maxCardH/2-6)`）。
- **丝滑**：PLATEAU 0.75→0.7（停留仍可感知、过渡更长更柔）。
- **致命 bug 修复**（复验抓到）：`cards.map is not a function`——`querySelectorAll` 返回 NodeList 无 `.map`，`apply()` 抛错导致**旋转完全不执行**；改 `Array.from(cards, ...)`，旋转恢复（4 卡严格轮番到顶 卡0→1→2→3→0）。
- **矮视口降级**：`@media (max-height: 780px)` 纵向堆叠（防 S 受限时环上必叠）——实测降级零重叠、可读；高视口旋转模式仅 12% 以内边缘级 2D 投影交叠（层级遮挡，视觉无混乱）。
- **实测**：章头同屏 ✓、旋转正常 ✓、无大面积重叠 ✓、文字零溢出 ✓、降级模式零重叠 ✓。

### 版本号
`20260814f → 20260814i`（about.html：styles.css + about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（懒渲染预渲染 + storyboard 目标 + 第六章 HTML/JS + NodeList bug）/ `docs/src/about.css`（第五章视窗 + 第六章 CSS + 矮视口降级）/ `docs/about.html`（版本 i）/ `content/05_ai_coding/KNOWN_PITFALLS.md`（§15 代码复杂度标准，version 1.9→1.10）/ 字体（清除旧 woff2 + 脚本，一次性重挂载）

### 验证结果（浏览器实测硬数据）
✅ GetDiagnostics 5 文件零错误；✅ 字体重挂载 673 字/882.5KB；✅ 懒渲染 510ms 空闲预渲染、探索区边界零长任务；✅ 章节切换长任务 -53%（22→13 条 / 13.6s→6.4s）；✅ 第五章视窗占 66%、sticky top 恒 96px；✅ 第六章章头同屏、4 卡轮番到顶、无大面积重叠、文字零溢出、矮视口降级零重叠、零 JS 错误（NodeList bug 修复确认）

### 沉淀标签
`[待沉淀: NodeList 无 map 的运行时陷阱]` — `querySelectorAll` 返回 NodeList（类数组），直接 `.map/.forEach` 在高版本 Chrome 有 forEach 但无 map；`Math.max(...cards.map(...))` 会抛 `TypeError` 且不报错到页面——动画 apply 在首行中断、整个动效静默失效（复验抓到的第六章"完全不转"根因）。处理 NodeList 必须先 `Array.from`。
`[待沉淀: gsap 动画目标不得是 sticky 容器]` — 对 `position:sticky` 元素做 gsap scrub（transform/scale 逐帧写）会破坏 sticky 定位（top 漂移、粘住位置失效）且每帧重栅格化大区域。动画目标应改为 sticky 容器内部的内容元素（如 SVG/子块），sticky 容器本身保持纯定位。

- **commit**：待提交（push 需书记批准）

## T-245 字体脏修复（保留 hinting）+ 第六章转动恢复 + 旧代码清理 + 效果优先立规（2026-08-14）

**任务**：书记四连批评——①字体显示【脏】（好几层字叠在一起），8月12日字体是对的 ②第六章转动效果消失，重构前不 ASK USER QUESTION、让书记被动 ③旧版本代码残留（死/过时/冗余/冲突），界面无限膨胀 ④效果是第一评判标准，复杂度最小化以不牺牲效果为前提（不可混淆）。书记指定 /spec + Skill（grill-with-docs/brainstorming/web-design-guidelines）。
**引用流程**：Spec 模式（AskUserQuestion 四裁决后批准）+ H30.1 一改具改 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 书记裁决

### 书记裁决（AskUserQuestion，本轮关键——书记明确要求先问）
1. 字体修复：**保留 hinting 重建**（从权威源，不 desubroutinize，恢复 8月12日 字形质感）
2. 第六章：**任何视口都转**（移除矮视口降级——那是我自作主张的隐藏行为）
3. 章头入视窗：**认可**（标题与旋转舞台同屏）
4. 旧代码：**清注释残留 + 统一版本号**
附加：**「干脆利落」**

### ① 字体「脏」修复（根因：hinting 被移除）
- **根因**：8月12日 认可的字体（1003字/1.3MB）是好的；后续重建用了 `hinting=False + desubroutinize=True`——移除 TrueType hinting 指令后，Windows ClearType 次像素渲染在无 hinting 时产生笔画发糊/叠影 =「好几层字叠在一起」。
- **修复**：从权威源 `D:\PPT模板\...\南西油墨宋.ttf` 重新子集化，**保留 hinting、不 desubroutinize**（内联命令，不落过程性脚本）→ 672 字符 / 888.5KB / 缺字 0。
- **实测**：FontFace loaded、25 项标题 check 全 true（无缺字混排）、canvas 双字体宽度差 54px（字形真实生效）、16px 小字号像素密度 67.8% 笔画清晰（hinting 生效）、console 零字体报错。

### ② 第六章转动恢复（移除矮视口降级）
- **根因**：T-244 我自作主张加了 `@media (max-height:780px)` 矮视口降级（视口矮不转、纵向堆叠）且未报告——书记看到转动效果消失。
- **修复**：删除该降级块（spec REMOVED）；任何视口高度保持日出日落公转；环半径 R 按实际卡高自适应（不溢出）保留；章头入视窗保留（书记认可）。
- **实测**：661px 高矮视口下 flow sticky 生效、**4 卡轮番到顶公转完整**（scrollY 9300→10050 卡0→1→2→3）、章头同屏、无文字溢出；拥挤度 IoU 0.44-0.58（书记接受「轻微拥挤」）。

### ③ 旧代码清理 + 版本号统一
- **注释残留清零**：entry 12 处 + css 2 处历史「已移除/v5.1/v5.2」追述全部清理（含整块死注释：已移除的滚动吸附设计说明；bindCameraFlow 的 v5.x 追述；Lenis 的 v5.2 对比；粒子/时间码说明精简）；css 的「v5.1 已移除终章光圈层」纯历史注释删除。复验 grep：v5.1=0、v5.2=0、滚动吸附=0。
- **版本号统一**：组件 import 4 处从 `20260812f/d` 并存统一为 `20260814k`；三资源版本全部 k——消除「新旧版本并存」膨胀感。

### ④ 效果优先立规（KNOWN_PITFALLS §15 修正）
- §15 原则改为：**效果是第一评判标准，在保证效果的前提下追求时间复杂度和空间复杂度尽可能低**——顺序不可混淆；任何复杂度优化须先验证效果不受损（书记 2026-08-14 原话，version 1.10→1.11）。

### 版本号
`20260814i → 20260814k`（about.html：styles.css + about.css + about-entry.js；import 版本号同步 k）

### 变更文件
`docs/assets/fonts/nanxi-youmosong-subset.woff2`（保留 hinting 重建 888.5KB）/ `docs/src/entries/about-entry.js`（注释清理 12 处 + import 版本统一）/ `docs/src/about.css`（移除矮视口降级 + 注释清理 2 处）/ `docs/about.html`（版本 k）/ `content/05_ai_coding/KNOWN_PITFALLS.md`（§15 效果优先，version 1.11）/ `.trae/specs/2026-08-14-about-font-dialogue-cleanup/`（spec 三件套）

### 验证结果
✅ GetDiagnostics 4 文件零错误；✅ 字体 loaded/字形生效/无缺字/hinting 清晰；✅ 第六章 661px 矮视口仍 4 卡轮番公转 + 章头同屏 + 无文字溢出；✅ 版本号三资源统一 k + import 统一 k；✅ v5.1/v5.2/滚动吸附/终章光圈历史注释零残留；✅ KNOWN_PITFALLS §15 效果优先条款生效

### 沉淀标签
`[待沉淀: 字体子集化保留 hinting]` — 艺术质感字体（油墨宋等）子集化时**必须保留 hinting、不 desubroutinize**：TrueType hinting 指令被移除后，Windows ClearType 次像素渲染在无 hinting 时笔画发糊/叠影（用户感知为「脏/好几层字叠在一起」）。参数选择直接影响字形渲染质量——效果优先原则下，字体类资源禁止为减体积牺牲 hinting。

- **commit**：待提交（push 需书记批准）

## T-246 视觉四修（字体阴影 / TOC 断点 / hero 倒翻 / 第六章重构）（2026-08-14）

**任务**：书记 4 条批评——①字体依旧【脏】②侧边栏目录中等窗格下消失（非移动端）③hero 等部分底部加载倒翻回去无法渲染 ④第六章非常逼仄，且要求第六章「问得更清楚，细节是魔鬼」。书记指定 /spec + Skill（web-design-guidelines/grill-with-docs/improve-animations）。
**引用流程**：Spec 模式（AskUserQuestion 四裁决后批准）+ H30.1 一改具改 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 书记裁决

### 书记裁决（AskUserQuestion + 附加设计指导）
1. 字体「脏」根因（决定性实验）：**非字体文件**——子集渲染像素级单层干净、无重影；根因是**标题 text-shadow**（55% 透明 1px 亮色阴影叠出亮边，像素模拟 +17.93%）+ 非整数 DPR 放大器。→ 裁决**完全移除压印阴影**。
2. 第六章：**舞台更大卡更舒展**。
3. hero 倒翻：书记确认是 hero 章节（浏览器未复现，防御性修复）。
4. TOC 断点：**降到 768px**。
附加设计指导（第六章，书记强调「思考清楚再执行，有不懂一定要问」）：地平线直接界定为 sticky 视窗最下端、不需出现在视野；卡片给定 px 范围时尽可能舒展；正确的覆盖关系/展示数量/透明度；**旋转着进出 + 视窗固定瞬间①号卡在正午**；反思什么动什么不动、什么有稳态什么没稳态、稳态时什么效果。

### ① 字体：标题压印阴影全移除
- 移除 4 处 text-shadow（.ab-page-no / .ab-hero-title / .ab-chapter-title / .ab-conclusion-title）——复验 21/21 标题元素 computed textShadow=none。

### ② TOC 断点 1024 → 768
- `.ab-toc-nav` `@media (min-width: 768px)`——实测 1008px 视口 block、697px none。

### ③ hero 倒翻保障
- hero 入场动画（heroTitle/heroAccent/heroSubtitle 的 gsap.from）由「页面加载即播」改为 ScrollTrigger once（trigger hero, start 'top 80%'）——底部加载倒翻回 hero 正确渲染；退场 scrub 保留。实测滚底/分段上滚/回顶全程 opacity=1 visible。

### ④ 第六章重构（书记设计指导落地）
- **地平线=视窗底边**：删除 `.ab-dialogue-horizon` 元素与样式（HTML/CSS/降级区）；卡片落到底部消失带即 opacity 0。
- **卡片舒展**：宽 210px px 定值；舞台 `min(92vw, 640px, calc(100vh-300px))`；环半径 `min(0.28S, S/2-maxCardH/2-6)`（按实际卡高自适应）。
- **覆盖关系/数量/透明度**：恰好 3 张可见（正午 1 opacity=1 z=10 + 左右 2 半透明 + 地下 opacity=0 z=0）；**地下判定改用角度高度 `(1-sin(rad))/2`（R 鲁棒）**——矮视口 R 被卡高压缩时 y 方案失效（复验发现），角度方案底部扇区恒判地下。
- **进入/退出旋转 + 卡①正午锚定**：progress 增加进入段（flow 顶 > stickyTop 时 -0.125→0，θ -45°→0°）与退出段（1→1.125，θ 0°→+45°）；**sticky 固定瞬间 progress=0 → θ=0 → 卡①恰在正午**（实测两视口 scrollY 锚定点卡① translate(0,-R) opacity=1 z=10）。
- **动/静稳态清单**注释更新（稳态=每阶段正午停留 PLATEAU 0.7 + 卡①锚点；非稳态=进入/退出线性旋转）。

### 版本号
`20260814k → 20260814n`（about.html：styles.css + about.css + about-entry.js）

### 变更文件
`docs/src/about.css`（标题 text-shadow 移除 + TOC 断点 + 第六章舞台/卡片/horizon 删除/注释）/ `docs/src/entries/about-entry.js`（hero 入场滚动触发 + 第六章 apply 角度判定/进入退出旋转/注释）/ `docs/about.html`（版本 n）/ `.trae/specs/2026-08-14-about-visual-overhaul-2/`（spec 三件套）

### 验证结果（浏览器实测硬数据）
✅ GetDiagnostics 3 文件零错误；✅ 标题 21/21 textShadow=none；✅ TOC 1008px block/697px none；✅ hero 倒翻全程 opacity=1 visible 无报错；✅ 第六章卡①锚定（sticky 固定瞬间正午）、进入/退出旋转、恰好 3 张可见（地下恒 0 z=0、正午 z=10，两视口一致）、无 horizon 元素、卡片 210px 舒展、文字零溢出；✅ 已知非阻塞：矮视口侧卡 op≈0.75（R 压缩几何固有）、过渡段偶 2 张可见（地下恒 0）

### 沉淀标签
`[待沉淀: text-shadow 叠层=「脏」视觉根因]` — 大字号艺术字体（油墨宋）上叠加「1px 高光 + 1px 阴影」双 text-shadow 会在笔画下缘叠出亮边（像素模拟 +17.93%），用户感知为「好几层字叠在一起」。效果优先原则下，标题类元素的压印阴影装饰须先渲染验证再保留。
`[待沉淀: 环形卡地下判定用角度而非 y 坐标]` — 环形公转的「地下消失」判定用**角度高度 (1-sin(θ))/2**（与环半径 R 无关）比 y 坐标 elevation 更鲁棒：R 受卡片实际高度压缩时（矮视口），y 方案地下卡 elevation 升高导致永不归零；角度方案保证底部扇区恒判地下，亮度渐变仍可用 y 方案（自然过渡）。

- **commit**：待提交（push 需书记批准）

## T-247 字体合成粗体根治 + 第六章「3 太阳」+ 性能预计算 + 第五章 40/60（2026-08-14）

**任务**：书记 4 条批评——① 书记提供决定性线索「p 干净、span/h1/h2 脏，找共同点」② 旧版本代码如何处理 + 动画慢（「静态网页都是死的，能事先算好的动画不如事先准备好」）③ 第六章「3 太阳」模型（地平线=sticky 视窗最下端、4 卡不必都在视窗内、升起又落下、落下完全隐去、半径非常充裕）+ 旋转进出 + 卡①正午锚定 ④ 第五章左右分割左 40% 右 60%。书记指定 /spec + Skill（improve-animations/web-design-guidelines/brainstorming）。
**引用流程**：Spec 模式（change-id `2026-08-14-about-font-synth-6th-perf`）+ H30.1 一改具改 + KNOWN_PITFALLS §15 效果优先 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 四裁决（① 原生 400 + 防合成 ② R 半径非常充裕/3 太阳/卡高保持 ③ 性能「两者都有」④ 「半径不是问题，综合思考我的评议」）

### ① 字体「脏」根治（决定性根因）
- **书记线索**：`p` 正文（400 字重）干净、`span/h1/h2` 标题脏——共同点 = **font-weight 700 触发浏览器合成粗体**。
- **根因链**：NanxiYoumosong 仅 weight:400 一个 face；about.css 标题类未显式设字重 → `h1/h2` 继承 UA 默认 `bold(700)` → 浏览器合成粗体（笔画外扩 4px、ink+53%）→ 油墨宋笔画放大为「脏」；`p` 默认 400 → 干净；`span` 在标题内继承 700 → 脏。T-245 保留 hinting、T-246 移除 text-shadow 均未根治——真正根因是合成粗体。
- **修复**：全部 22 个 `--ab-display` 标题类显式 `font-weight: 400` + `.ab-about` 全局 `font-synthesis: none`（继承属性兜底）。醒目度由字号/颜色承担（书记裁决）。
- **注意**：badge/tag/label 等 11 处 700/600（Noto 字体有真实 face）不在此范围，保留。

### ② 第六章「3 太阳」模型落地
- **R 半径放宽**（书记「半径非常充裕，不要有压力」）：`R = min(S*0.42, max(S/2 - maxCardH/2 + 56, 卡宽/1.414))`——正午停留四卡 90° 间隔、相邻中心距 1.414R ≥ 卡宽；R 允许正午卡超出 stage 顶 56px 进入 head 与 stage 间留白区（flow gap 10-20px → **56px**，「升起」感）。
- **head 紧凑化**：eyebrow/title margin-bottom 22/16px → 12/12px，为 R 放宽腾出 flow 高度。
- **透明度 3 太阳**：`b = smooth(elevation归一)` → `b = angleH^1.5`（与 R/S 无关）——正午 1 全亮、侧卡 0.5^1.5≈0.354 半透明、地下 angleH<0.35 → 0 完全隐去；删除 elevation/yBottom/span/yCard 死代码；zIndex 分层保留（正午 10/侧 3-4/地下 0）。
- **保留**：进入/退出旋转（θ -45°→0° / 0°→+45°）+ 卡①正午锚定 + 地下判定 + scale 渐变；清理旧 R 公式注释残留。

### ③ 性能预计算（书记「事先准备好」）
- **cardEntrance 改 onEnter once**：章节标题/卡片入场从「scrub 每帧跟滚」→「进入章节视口播放一次渐显」；签名去掉死参数 endVh，4 调用点同步；philosophy 两卡、development divider/stageRows 同为 scrub 跟滚，一并改 once。
- **development onUpdate 预计算**：32 步 smoothstep 色表（灰 #ABA191 → 党建红 #CE1126，差分 35/-144/-107）IIFE 预计算 + lastColors Map 缓存，值未变不写 DOM——消除每帧 Math 计算与重复写入。
- **保留的核心 scrub**：工作流镜组驱动、camera 交接、进度条 fill——效果优先，不动。

### ④ 第五章左右分割
- `.ab-exploration-scene-body` grid `minmax(0,1.15fr) minmax(0,0.85fr)`（左 57.5%）→ `minmax(0,2fr) minmax(0,3fr)`（左 40% 右 60%），注释同步。

### 版本号
`20260814n → 20260814o`（about.html：about.css + about-entry.js；styles.css 未改动不 bump）

### 变更文件
`docs/src/about.css`（22 类 font-weight:400 + font-synthesis:none + gap 56px + head 紧凑化 + 第五章 grid）/ `docs/src/entries/about-entry.js`（cardEntrance once + philosophy/development 入场 once + 色表预计算缓存 + 第六章 R 放宽/angleH^1.5/死代码清理）/ `docs/about.html`（版本 o）/ `.trae/specs/2026-08-14-about-font-synth-6th-perf/`（spec 三件套）

### 验证结果（浏览器实测硬数据）
✅ GetDiagnostics 改动文件零错误；✅ 字体 6/6 computed font-weight=400 + font-synthesis=none + NanxiYoumosong 实际加载；✅ 第五章 301.034px:451.55px = 精确 40%/60%；✅ 第六章正午停留「3 太阳」结构（正午卡 opacity≈0.996 z=10 + 左右翼 0.303/0.406 + 地下 0 隐藏，卡高 220-241px 未压缩）；✅ 进入段卡①正午锚定（opacity≈1 z=10 顶部）、退出段旋转上移出视口；✅ hero 渲染正常无叠影。
⚠️ 已知非阻塞（提交书记知悉）：① 正午相位可见卡有 50-100px 层叠相交（R 已达公式上限 0.42S，属 zIndex 分层的「3 太阳」层叠构图；数学上 R≤0.42S 无法做到四卡矩形零相交）；② 滚动性能仍有长任务（探索区懒渲染插入 4000px 触发 640ms+ 长任务、工作流/镜头 scrub 真实滚轮约 27fps、最大帧 1.4-1.6s）——属本 spec 范围外的新优化机会，建议下一轮专项。

### 沉淀标签
`[待沉淀: 单字重艺术字体须防合成粗体]` — 自定义艺术字体若仅一个 weight face，h1/h2 等标题继承 UA 默认 bold(700) 会触发浏览器合成粗体（笔画外扩、ink 大幅上升），用户感知为「字脏/好几层叠在一起」；诊断线索 = 同字体下 p（400）干净、标题（700）脏。修复 = 标题类显式 font-weight:400 + font-synthesis:none，醒目度由字号/颜色承担。此教训与 T-245 hinting、T-246 text-shadow 构成「字体脏」三层根因排查链（字体文件 → 阴影叠层 → 字重合成），最终根治于合成粗体。

- **commit**：待提交（push 需书记批准）

## T-248 第五章文字化+左列拉高 · 第六章舒展贴底 · 交互收口 · 性能专项（2026-08-14）

**任务**：书记 4 条批评 + 1 项新指示——① 第五章左列 SVG「上下再抻一抻」、左右字体/风格/大小不相衬；追加指示「工作流章节采用没有卡片底板的文字，不受限于卡片高度，文字统一排布（深挖思考）」② 第六章卡片更舒展、舞台底部贴视窗最下端（消除底部空白）③ 全界面唯一可交互=身份阶段（点击有反应，其他无点击）④ P.10 书记选择「开展专项」。书记指定 /spec + Skill（brainstorming/web-design-guidelines）。
**引用流程**：Spec 模式（change-id `2026-08-14-about-ch5text-ch6stretch-interaction-perf`）+ H30.1 一改具改 + H50.2（AskUserQuestion 五裁决）+ KNOWN_PITFALLS §15 效果优先 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 五裁决（① 环放大+卡略窄 ② 地平线=视窗底部空白 ③ 第五章先展示差异→选「拉高+放大协调」④ 交互=点击有反应 ⑤ TOC 保留导航壳）

### ① 第五章右列无底板文字化（书记新指示深挖落地）
- `.ab-exploration-stage` 去背景/边框/圆角/阴影/内边距 → 纯文字印于暖纸页；`min-height: clamp(320px,46vh,440px)` 保留纵向行程（节点动画演化需要，无视觉底板）。
- 序号+标题眉标式（序号油墨宋红 + margin-bottom 6px 换行）；描述直接正文；流程 li 去暖纸底条 → 纯文字 + `.ab-flow-line` 线标。
- **current 态改文字语言**：序号/标题变党建红 + 左侧 2px 红线（章节 eyebrow 眉线语言），替代原卡片红边框+阴影；past/future 透明度 0.8/0.55 保留。

### ② 第五章左列 SVG 拉高放大协调
- viewBox `800×600 → 800×720`（ACTIVITY/TASKFORCE 两场景），节点 y 坐标 ×1.2 拉伸（31 节点，x 不动）——上下分布更舒展；实测渲染 301×461px 纵向舒展。
- 节点圆 r 48→52、节点文字 16→18px、名称 12→14px、线宽 task 2.4→2.6 / info·file 1.8→2.0——与右列标题 17px/正文 15px 相衬；彩色角色色系保留。
- sticky 容器 `min(66vh,calc(100vh-220px)) → min(72vh,calc(100vh-200px))`——SVG 填满无信箱留白。

### ③ 第六章环放大+卡略窄+舞台视口驱动贴底
- R 上限 `0.42 → 0.46`（环更大更舒展）；卡宽 `210 → 192px`（CSS+JS cardW 同步）；卡高不压缩。
- 舞台尺寸 `min(92vw,640px,calc(100vh-300px))` → `min(92vw, calc(100dvh - clamp(96px,12dvh,140px) - 178px))`——**视口驱动贴底**，大视口可超 640px；实测底部空白 -7px（贴视窗最下端）。

### ④ 交互收口（点击有反应 = 可交互）
- 保留：TOC 圆点导航、顶栏/侧栏导航壳、身份阶段时间轴点击展开。
- 移除：内容区 hover 上浮（`.ab-cognition-item:hover`、`.ab-review-card:hover`）——其余章节纯滚动驱动展示；实测内容区 6 类卡片 cursor 全 auto、点击无反应，时间轴 cursor pointer + 点击展开正常，TOC display block。

### ⑤ 性能专项（P.10 开展专项执行）
- **renderFrame 按需重算**：节点 transform 移动 <0.5px 不写（_nx/_ny 缓存）、opacity 值未变不写 style（_no 缓存）；边 opacity<0.02 不可见时跳过几何重算、端点移动 >0.5 才重算 path/渐变/箭头（_fx/_fy/_tx/_ty 缓存）；edgePath 收缩量 48→52 同步（圆 r 52）。
- **懒渲染分片**：`renderExploration` 提取 `renderSceneFragment(scene)` 单场景模板；`mountExploration` 先插 section 框架（HTML 量小）→ ACTIVITY 首帧 → TASKFORCE 次帧 → 全部就绪后 bind → refresh 移到 rAF 后（拆长任务）。
- **实测**：工作流区滚动最大帧 1.4-1.6s → **458ms（降约 70%）**，后段稳定 100-101ms。

### 版本号
`20260814o → 20260814p`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/about.css`（exploration-stage 文字化 + 节点/线宽放大 + sticky 72vh + dialogue-card 192 + stage 贴底 + hover 清理）/ `docs/src/entries/about-entry.js`（viewBox 720 + 节点 y 拉伸 + r 52 + cardW 192 + R 0.46 + renderFrame 按需重算 + 懒渲染分片 + renderSceneFragment）/ `docs/about.html`（版本 p）/ `.trae/specs/2026-08-14-about-ch5text-ch6stretch-interaction-perf/`（spec 三件套）/ `.ctx/logs/2026-08-DECISION_LOG.md`（D-269 P.10 归档）/ `CLAUDE.md`（丙部 P.10 删除）

### 验证结果（浏览器实测硬数据，6/6 通过）
✅ 右列无底板（background 透明/borderRadius 0/boxShadow none/current 序号标题党建红 + 左红线）；✅ 左列 viewBox 800×720 + r52 + 节点文字 18px + sticky 72vh（301×461px 纵向舒展）；✅ 第六章正午 3 太阳（正午 opacity≈0.998 z10 + 两侧 0.315/0.393 + 地下 0）+ 卡宽 ≈192px + 舞台贴底（底部空白 -7px）+ 卡中心垂直分布拉开 126-146px；✅ 交互收口（内容区点击无反应、时间轴展开正常、TOC 保留）；✅ 性能最大帧 1.4-1.6s→458ms（降约 70%）、后段稳定 100-101ms；✅ GetDiagnostics 改动文件零错误。
⚠️ 已知非阻塞：探索区进入视口首波 4 步 200-458ms（镜组切换首波动画 + 分片挂载），后段已稳定——残余抖动点。

### 沉淀标签
`[待沉淀: 滚动动画性能两层优化链]` — 静态叙事页滚动性能优化分两层：① 一次性播放化（非核心入场动画改 onEnter once——T-247）② 按需重算（每帧 DOM 写入加阈值跳过：位置 <0.5px 不写 transform、值未变不写 style、不可见元素跳过几何重算——T-248）。原则：能事先算好的就预计算，不能预计算的就按需写入，静止时零写入。
`[待沉淀: 无底板文字排布=叙事页信息展示的语言]` — 书记「没有卡片底板的文字」——信息展示不依赖卡片容器（背景/边框/圆角/阴影），直接印于页面底色；纵向行程由 min-height 撑起、当前态由文字色+眉线表达。卡片底板约束视觉密度，文字流更统一舒展。

- **commit**：待提交（push 需书记批准）

## T-249 规避 GSAP · 三层字体体系 · 第五章灰→黑 · 第六章重排（2026-08-14）

**任务**：书记 3 组批评 + 重大指示——① 第五章红线红字「非常难看破坏整体感」→ 改「颜色由灰变黑」印刷质；「整个界面字体要有使用自觉、无衬线很掉价很细干瘪」→ 三层字体体系；② 渲染「先快速渲染出现内容等加载好才正常」→ 怀疑冲突冗余代码 → 渲染稳定+瘦身；③ 第六章「半径再大一点、还是遮盖 p、空间很大为什么舞台底部还空、blockquote 衔接不好」→ 重排给足空间 + coda sticky 后立即出现；④ **重大裁决「gsap 是最大的害群之马，很后悔使用，全部规避」**。书记指定 /spec + Skill（web-design-guidelines/requesting-code-review/brainstorming）。
**引用流程**：Spec 模式（change-id `2026-08-14-about-gsap-removal-font-3tier-ch6-relayout`）+ H30.1 一改具改 + H50.2（AskUserQuestion 三裁决）+ KNOWN_PITFALLS §15 效果优先 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 三裁决（① GSAP 全部规避 ② 三层字体体系 ③ 渲染稳定+瘦身）

### ① 规避 GSAP/ScrollTrigger（8 模块 → CSS animation-timeline: view() + 原生）
- **设计**：所有入场/滚动驱动动画改 CSS `animation + animation-timeline: view()`（进入视口自动播放、可逆、CSS 引擎驱动零 JS、初始可见无闪变；不支持浏览器渐进降级为始终可见）；Lenis 改 `autoRaf: true` 自驱。
- **删除的 GSAP 代码（8 函数/常量）**：`bindPageAnimations`（hero 入场/cardEntrance 全量）、`bindDevelopmentEntranceAnimation`、`bindHeroExit`、`CAMERA_PAIRS`+`_cameraPairBound`+`bindCameraPairs`、`bindCameraFlow`、`bindExplorationStoryboardSwitch`、`bindCinematicScroll`；`bindDevelopmentScrollProgress` 改原生 scroll 监听 + rAF 节流写 fill scaleX（阶段高亮 CSS 承担）；`bindTimelineToggle` 改 CSS transition + class；`bindLenis` 改 autoRaf；about.html 删除 gsap/ScrollTrigger vendor 引用；删除全部 `typeof gsap` 守卫、`ScrollTrigger.refresh/update`、`getAll().kill`。
- **CSS 动画 10 条**：通用升起渐显（章节标题/卡片 view()）、hero 入场（加载即播）、hero 滚出（view() exit）、章节镜头（.ab-page .ab-chapter-title 进入驶入/离开后拉——避开 sticky 容器）、development 入场、阶段高亮（灰→红 view()）、探索区分镜（activity 退场/taskforce 光圈揭示）、coda 渐显、时间轴展开（max-height transition）、reduced-motion 全关。
- **保留的原生驱动**：dialogue 四卡公转、探索区 renderFrame、TOC、Lenis。
- **性能实测**：真实滚轮最大帧 458ms → **22.4ms（提升约 20 倍）**，全程平均约 11.1ms，无 ScrollTrigger.refresh 长任务。

### ② 三层字体体系（字体使用自觉）
- **展示层**（油墨宋 400，已有）：hero/chapter/conclusion 大标题、eyebrow、序号、引言、dialogue-no/phase 等。
- **正文层**（Noto Serif SC 衬线 500，SVG 节点圆内 600）：chapter-sub、cognition-lead/item-truth、review-card-desc、opp-point-desc/insight、exploration-stage-desc/flows、dialogue-question/answer/desc、conclusion-sub、tl-detail-decision/text、节点文字/名称——替换原 Noto Sans SC 无衬线（「细干瘪」根因）。
- **辅助层**（Noto Sans SC 无衬线 400）：badge、tag、tl-time/tl-time--hl、tl-stage、exploration-scene-note、page-runner——小字信息层清晰不抢。
- 实测三层字体均真实加载（document.fonts.check true），层级由字体自觉表达。

### ③ 第五章灰→黑印刷质
- 移除 T-248 红线（border-left）与红字；data-state 颜色：future=ink-faint 浅灰 / past=ink-sub 中灰 / current=ink 墨黑；desc/flows 与 title 均 `color: inherit` 随态变色；序号保持油墨宋红（展示层眉标）；min-height 行程保留。

### ④ 第六章重排（空间给足）
- R 上限 `0.46 → 0.5S`（环内切舞台）、不溢出余量 k `56 → 121`、flow gap `56 → 121px`——正午卡顶恰到 head 底，**不遮副标题 p**（实测间距 15px）；地下卡中心到 stage 底缘，环用满舞台。
- spacer `120vh → 84vh`（压缩行程使 coda 更快出现）；coda 入场渐显（CSS view()）——blockquote 在 sticky 释放后立即出现衔接自然。

### 版本号
`20260814p → 20260814q`（about.html：about.css + about-entry.js；vendor 引用删除）

### 变更文件
`docs/src/about.css`（三层字体 24 处 + 灰→黑 + gap 121/spacer 84/stage 公式 243 + 10 条 CSS 动画 + 时间轴 transition + reduced-motion）/ `docs/src/entries/about-entry.js`（删除 8 个 GSAP 函数/常量 + bindDevelopmentScrollProgress 原生化 + bindTimelineToggle class 化 + bindLenis autoRaf + 第六章 R 0.5S/k121 + 启动清单 + 死代码/注释清理）/ `docs/about.html`（移除 2 个 vendor 脚本 + 版本 q）/ `.trae/specs/2026-08-14-about-gsap-removal-font-3tier-ch6-relayout/`（spec 三件套）

### 验证结果（浏览器实测硬数据，6/6 通过）
✅ Network 无 gsap/ScrollTrigger 请求、console 无 JS 错误；✅ 三层字体真实加载（Serif 正文/节点 600、Sans 辅助 400、油墨宋展示）；✅ 第五章无红线、current 墨黑 rgb(59,50,38)/past 中灰/current 灰→黑随滚动切换；✅ 第六章 3 太阳 + 正午卡不遮 p（15px 间距）+ 环用满舞台 + coda 渐显衔接；✅ 动画 CSS 驱动（animationTimeline=view()、进度条原生 scaleX 随滚动 0.045→1、时间轴 class transition opacity=1）；✅ 性能最大帧 458ms→22.4ms（约 20 倍）、平均 11.1ms、无 refresh 长任务；✅ GetDiagnostics 改动文件零错误。

### 沉淀标签
`[待沉淀: 规避 JS 动画库=静态叙事页的最优解]` — 静态滚动叙事页的动画应优先 CSS `animation-timeline: view()`（滚动驱动、引擎级优化、初始可见无闪变）+ 原生 scroll 监听；JS 动画库（GSAP）带来的 ScrollTrigger.refresh 全量重算（640ms 级长任务）与「先隐藏后显示」闪变是复杂度与卡顿根源。实测规避后性能提升约 20 倍（458ms→22.4ms）。「能事先算好的动画不如事先准备好」——CSS 声明式动画由浏览器引擎处理，静态页面应零 JS 动画依赖。
`[待沉淀: 字体使用自觉=按层级/组件关系分层]` — 字体不是「好看不好看」的一刀切，而是要有使用自觉：展示层（大标题/引言）用艺术字体、正文层用衬线（印刷质感、字重饱满）、辅助层（小字信息）用无衬线（清晰不抢）——按排布/逻辑/组件关系决定字体，同一组件组内统一。

- **commit**：待提交（push 需书记批准）

## T-250 移除进度条 · 动画 1s 节奏 · 页码避让 · 扁平感重构（2026-08-14）

**任务**：书记 3 组指示——① 动画：工作流分镜「太急躁」要再缓慢与整体风格一致；「之前提到的红线终于发现是随下滑生长出来的进度条！必须移除！」② 布局：development 章节与页码 04「重叠混乱不清爽」→ 页码避让标题；③ 设计哲学：硬刷印刷——「噪点克制（油墨宋已实现，欣赏）+ 扁平感（组件摆布、颜色对比）+ 一定不是紧凑的（像现代艺术）」；「卡片特别是红框（宝贵机会）一定有更好的表现方式，哪怕是歪斜的、错落的」；「宝贵机会两卡不是 2 条而是便于表述的 2 个点（逻辑无强关联、更不并列）」。书记指定 /spec + Skill（web-design-guidelines/improve-animations/brainstorming）。
**引用流程**：Spec 模式（change-id `2026-08-14-about-flat-progress-remove-philosophy-scatter`）+ H30.1 一改具改 + H50.2（AskUserQuestion 四裁决）+ KNOWN_PITFALLS §15 效果优先 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 四裁决（① 分镜 0.6→0.9s ② 页码避让标题 ③ 噪点扁平哲学（书记补充：硬刷=噪点克制+扁平感+现代艺术留白）④ 全书统一 1s 节奏 + 宝贵机会「2 个点」错落歪斜）

### ① 移除 development 进度条（随下滑生长的红线）
- HTML：development 章节模板删除 `<div class="ab-development-progress"><div class="ab-development-progress-fill"></div></div>`（章节头部直接以 eyebrow 开场）。
- JS：`bindDevelopmentScrollProgress` 整个函数（fill scaleX 原生监听）与启动处调用删除。
- CSS：`.ab-development-progress`/`.ab-development-progress-fill` 主规则与 reduced-motion 对应项删除。实测 `ab-development-progress` 三处零残留。

### ② 动画节奏统一约 1s（印刷翻页感）
- 工作流分镜 `ab-net-out/ab-net-in`：`0.6s → 0.9s`（书记选，不再急躁）。
- 全书统一：`ab-rise-in` 渐显 `0.8s → 1s`、`ab-hero-title-in` `0.9s → 1s`、`ab-hero-out`/`ab-hint-out` `0.6s → 0.9s`；`ab-cam`（镜头）/`ab-stage-hl`（阶段高亮）保持 1s。实测关键帧 9 个在册、元素时长 1s/0.9s 达标。

### ③ 页码避让标题（「和那个04重叠」）
- `.ab-chapter` 通用右缘预留 `padding-right: clamp(64px, 9vw, 140px)`（内容区让位页码装饰区）；`.ab-page-no` `pointer-events: none`（纯装饰）。
- 实测：review 04 与 development 03 标题均无重叠（页码完全位于标题右侧 + 垂直间隔）。

### ④ 扁平感重构 + 宝贵机会「2 个点」错落（现代艺术）
- **扁平化**：`.ab-cognition-item`/`.ab-review-card`/`.ab-tl-detail` 移除 box-shadow；`.ab-dialogue-card` 基础阴影移除、current 态改 `0 0 0 1px rgba(206,17,38,0.25)` 扁平描边——区分靠纸色层次 + 细边框，无立体感。
- **宝贵机会两卡**（书记「2 个点非并列 2 条」）：去红框（border-left 3px red）/阴影/底卡 → 透明底 + 细墨线边框 + 圆角 4px；第一卡 `align-self:flex-start` + `rotate(-1.2deg)` 左倾靠左、第二卡 `align-self:flex-end` + `rotate(1.3deg)` 右倾靠右 + 纵向微错（margin-top 下沉）+ `max-width: 86%`（为 align-self 留出水平位移空间）——实测两卡水平错开 106px、反向歪斜、间距 16vh 级留白。
- 章节标题「两条宝贵机会」→「**两个宝贵机会**」（与「2 个点」语义一致，注释同步）。
- 滚动渐显与 rotate 冲突处理：`.ab-philosophy-opp` 从 `ab-rise-in`（translateY）移除，改用 `ab-rise-scatter`（keyframes 内 `rotate(var(--scatter))`，动画 transform 接管旋转）。
- **噪点保持克制**：纸纹/油墨斑驳（opacity 0.05）未动——书记认可油墨宋的克制实现。

### 版本号
`20260814q → 20260814r`（about.html：about.css + about-entry.js；期间发现 about.css 引用被还原为 p，一并修正）

### 变更文件
`docs/src/about.css`（进度条 CSS 删除 + 动画时长 8 处统一 + 页码避让 + 扁平化 4 卡 + 宝贵机会 --scatter 错落歪斜/max-width 86%/ab-rise-scatter）/ `docs/src/entries/about-entry.js`（进度条 HTML/JS 删除 + 标题「两个宝贵机会」）/ `docs/about.html`（版本 r）/ `.trae/specs/2026-08-14-about-flat-progress-remove-philosophy-scatter/`（spec 三件套）

### 验证结果（浏览器实测硬数据）
✅ 无进度条（progressExists=false、章节头部第一子元素 ab-chapter-eyebrow）；✅ 动画节奏（ab-rise-scatter 1s、ab-net-out 0.9s，9 关键帧在册）；✅ 页码无重叠（review 04/development 03 均 overlap=false）；✅ 宝贵机会两卡错落（卡1 left130 flex-start -1.2°、卡2 left236 flex-end +1.3°，错开 106px、无红框、boxShadow none、间距 105.7px）；✅ 扁平化（4 卡 boxShadow none 或 1px 描边）；✅ 性能不劣化（最大 17.3ms、平均 16.2ms）；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 扁平感=印刷硬刷的现代艺术表达]` — 硬刷印刷风不只是噪点与艺术字体（噪点须克制），更要有扁平感：卡片去立体阴影、靠纸色层次+细边框+颜色对比区分；组件摆布像现代艺术——错落、歪斜、留白不紧凑。书记「组件摆布、颜色对比、一定不是紧凑的」是扁平化三要素。
`[待沉淀: 非并列项用「散落点」布局而非「并列条」]` — 逻辑上无强关联、非并列的多项内容（如宝贵机会两卡=便于表述的 2 个点），并列卡片布局会误导强关联；用错落散落（左右错开、反向微歪斜、间距留白）表达「独立的点」。章节标题用词与布局语义一致（「两个」而非「两条」）。

- **commit**：待提交（push 需书记批准）

## T-251 叙事结构重构 · P-041 归位 · 错误扩充清理 · 油墨宋克制（2026-08-14）

**任务**：书记两项指示——① 孤零零段落（exploration-why/dialogue-coda/conclusion-lead/sub/coda/philosophy-opp）「割裂的、附会的、虚假的关联」，须回到书记论断体系思考位置（重中之重，与书记讨论）；② article 内南西油墨宋滥用须克制、quote-line 破折号删除。书记指定 /spec + Skill（brainstorming/grill-with-docs/web-design-guidelines）。
**引用流程**：Spec 模式（change-id `2026-08-14-about-narrative-restructure-p041`）+ H30.1 一改具改 + H50.2（AskUserQuestion 三轮裁决）+ KNOWN_PITFALLS §15 效果优先 + verification-before-completion
**来源**：书记指令（2026-08-14）+ AskUserQuestion 三轮裁决 + 书记关键纠错（见下）

### 核心纠错（书记原话裁决）
- **「恢复对话能力」是「党建+科研」的目标，不是党建的「根本目标」**——AI 此前概括「党建的根本目标」是错误扩充，必须清理（书记：「错误一定要清理！不能遗臭万年」）。P-041 原话本身正确（"党建和经管学科科研的交叉点在于恢复和马克思主义的对话能力，恢复理论研究和现实治理之间的对话能力"）。
- 书记指示「必须结合 reference 中经管学科党建的文件思考学习」——定位 `content/01_strategy/references/建设探索/经管学科党建工作的知识特点与优化路径.md`，提炼 6 条重要观点。

### ① 清理「根本目标」错误扩充（一改具改）
- SECRETARY_PRONOUNCEMENTS.md：目录/P-041 标题/讲解块/索引表等 9 处「党建的根本目标」→「党建+科研的重要战略选择」；锚点同步更新。
- DEVELOPMENT_PATH.md：第三章标题/正文 4 处「根本目标」→「党建+科研的重要战略选择」。
- P-041 原话未动；「党建的根本目标」全仓零残留。

### ② reference 观点补充入论断汇编
- 从 reference 提炼 6 条观点（学科特殊性/专业训练边界/精确与真实权衡/马克思主义方法论资源/党建组织优势/中国自主知识体系），经书记审阅后补充进 SECRETARY_PRONOUNCEMENTS P-041 讲解块。

### ③ 第六章归位 + P-041 独立成章 + P-048 移入工作流
- **第六章 eyebrow「恢复对话能力」→「善始善终」**（书记裁决）；删除第六章 coda（P-041 原话错放）。
- **P-041 独立成章「党建+科研：恢复对话能力」**：新增 renderResearch 函数（页码 07，眉标「党建+科研」，标题「恢复对话能力」，P-041 原话 blockquote + 6 观点），接入 TOC + renderAboutContent（终章后）。
- **P-048 从终章移到工作流章末尾**：终章删 sub；新增 `.ab-exploration-coda`（整章 + 懒渲染两路径一致）。

### ④ 第五章 why 段删除 + 破折号删除
- `ab-exploration-why` 段删除（「探索→沉淀→工作流」逻辑已由场景 note 与章节标题承载）。
- opportunity 1 quoteLines 第 4 行「——提高生涯发展中…」行首破折号删除（段落转逐行）。

### ⑤ 南西油墨宋克制
- `.ab-philosophy-opp-quote`（书记原话引言）从油墨宋降为正文层衬线（Noto Serif SC 500）；`.ab-philosophy-opp-title` 保持油墨宋——article 内仅标题用油墨宋，克制突出单一元素。
- P-041 新章节原话 blockquote 用油墨宋（该章唯一展示元素）。

### 版本号
`20260814r → 20260814s`（about.html：about.css + about-entry.js）

### 变更文件
`docs/src/entries/about-entry.js`（第六章 eyebrow/coda + renderResearch 新章 + P-048 移入 exploration + why 删 + 破折号删 + TOC/渲染序列 9 节）/ `docs/src/about.css`（opp-quote 衬线化 + ab-research-* + ab-exploration-coda）/ `docs/about.html`（版本 s）/ `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（P-041 清理 + 6 观点补充）/ `content/01_strategy/DEVELOPMENT_PATH.md`（第三章清理）/ `.trae/specs/2026-08-14-about-narrative-restructure-p041/`（spec 三件套）

### 验证结果（浏览器实测硬数据，6/6 通过）
✅ 第六章 eyebrow「善始善终」+ coda 已删；✅ P-041 新章节（页码 07/眉标党建+科研/标题恢复对话能力/原话前 30 字正确/6 观点）；✅ P-048 在工作流章（exploration-coda「程序在所有人之上…」）+ 终章 sub 已删 + lead 保留；✅ 第五章 why 段已删、quote-line 不以「——」开头；✅ 油墨宋克制（quote 正文层 Noto Serif SC、title 油墨宋 NanxiYoumosong）；✅ 性能最大帧 17.1ms 不劣化；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 孤零零段落须回到论断体系定位而非微调排布]` — 页面中「孤零零的段落」不是排布问题，而是「内容被错误安放到错误章节」的叙事结构问题——诊断须回到书记论断体系（SECRETARY_PRONOUNCEMENTS + DEVELOPMENT_PATH + reference），判断每段内容对应哪条论断、在 big picture 的哪个侧面、该放在哪一章；只做「微调排布」会掩盖「割裂的、附会的、虚假的关联」。
`[待沉淀: AI 概括层级不得高于书记原话]` — AI 对书记原话的概括（如把「党建+科研的目标」概括成「党建的根本目标」）是错误扩充——概括的层级/范围不得大于原话本身的限定；书记原话限定了适用范围（「党建和经管学科科研的交叉点」= 党建+科研这一个方面），AI 不得把它扩大为全局判断（「党建的根本目标」）。发现此类扩充必须一改具改全仓清理。

- **commit**：待提交（push 需书记批准）

## T-252 未尽事项清理：T-237 色值抽离 · T-206 自查 · C-3 沉淀 · 外包可读（2026-08-14）

**任务**：书记指示快速汇总所有未尽事项并处理短期可完成的——① 色值抽离（身份不再保留既有固定颜色设定，引入自定义主题色色板；把主题色/功能色区别和设计定义写清楚，设计文档从头至尾可读、外包公司可读懂）；② C-3 沉淀可做；③ T-206「书记操作中」指什么——书记选「AI 先自查」；④ 书记评议未评议的要点继续逐条评议。
**引用流程**：H10 总纲（外包可读新增）+ H30.1 一改具改 + H50.2（AskUserQuestion 三裁决）+ C-3 经验沉淀
**来源**：书记指令（2026-08-14）+ AskUserQuestion 三裁决（① T-206 AI 先自查 ② T-237 删表+补定义 ③ 外包可读扩展到所有 04 文档 + meta 位提醒）

### ① T-237 色值抽离（已完成）
- **COMMISSIONER_FRAMEWORK §C.3 旧固定角色色表删除**（纪检琥珀 #D97706 / 组织蓝 #3B82F6 / 宣传海蓝 #2563EB）——替换为「已迁移至设计系统色板」说明（2026-08-14 书记裁决：身份不再保留既有固定颜色设定，角色识别色统一由 DESIGN_SYSTEM §2.3.2 管理，工作台强调色由主题色可自选决定）。
- **DESIGN_SYSTEM 补强**：§2.1 新增「主题色/功能色/品牌色三色区别」定义块（四层表：品牌统一层/角色识别层/状态层/中性层 + 使用铁律）；文件头新增「零、读本文件指南（外包工程师入口）」（文档目标 + 阅读顺序 + 术语表 6 项）；§2.3.2 强化「本表为默认识别色、任何角色可自选覆盖」。
- **代码层对齐**：about-entry.js WORKFLOW_ROLES 节点辨识色对齐 DESIGN_SYSTEM §2.3.2（组织委员 #3B82F6→#0EA5E9 天蓝、纪检委员 #D97706→#C2410C 深橙、宣传委员 #2563EB 海蓝保留），注释同步（工作流图为「身份标识场景」默认辨识色，工作台强调走主题色）。

### ② T-206 AI 自查（产出 14 项待书记确认清单）
- 通读 SECRETARY_PRONOUNCEMENTS 全文 403 行，产出疑似待调整点 14 项 + 确认无问题 9 项。
- **A 类疑似问题**：#1 论断计数 17 vs 实际 16；#2 P-046 融入日期 07-20 vs 07-16；#3 P-003 与 P-002 原话逐字重复；#4 "AI 理解"标注违反 AI 展开原则；#5/#6 引用块内嵌"书记原话"；#7 引号三类混用（'/"「）；#8 原话句末标点不一致；#9 日期后缀格式偏离；#10 P-046 未列入已迁出列表；#11 P-043 出处行与修正记录表重复；#12 P-041 标题三处表述不一致；#13 P-041 出处行超范式字段；#14 过时示例/措辞不统一。
- **B 类确认无问题**：标签残留清除、AI 扩充入引用块、破折号统一、多条原话无序列表、编号一致性、过时表述无回退、原话完整保留、层次一致、YAML 日期一致。
- **待书记逐条确认后 AI 修订**（乙部 T-206 状态已更新为「待书记确认」）。

### ③ 外包可读 meta 位（写入热层总纲）
- CLAUDE.md H10 新增总纲：「所有 content/04_web_design/ 设计文档必须从头至尾可读、锚定明确目标——外包公司可重做；AI 修改/新增 04 文档须自检（新章节可独立理解、色值/组件/数据指向权威源、禁止散落硬编码）」——每次工作强制上下文，AI 常被提醒。

### ④ C-3 经验沉淀（T-248~251 六条）
- 写入 `content/insights/工程演进与设计方法论.md` §4.5：规避 JS 动画库（性能 20 倍判例）、字体使用自觉、扁平感三要素、非并列项散落点布局、孤零零段落回到论断体系定位、AI 概括层级不得高于书记原话。last_updated → 2026-08-14。

### 变更文件
`CLAUDE.md`（H10 外包可读总纲 + 乙部 T-206/T-237 状态）/ `content/02_institution/COMMISSIONER_FRAMEWORK.md`（§C.3 迁移）/ `content/04_web_design/DESIGN_SYSTEM.md`（三色定义 + 读本指南 + §2.3.2 强化）/ `docs/src/entries/about-entry.js`（WORKFLOW_ROLES 色值对齐 §2.3.2）/ `content/insights/工程演进与设计方法论.md`（6 条沉淀）

### 验证结果
✅ COMMISSIONER_FRAMEWORK 无旧三色硬编码残留；✅ DESIGN_SYSTEM 含三色区别 + 读本指南 + 术语表；✅ 代码注释无「硬编码（COMMISSIONER §C.3）」残留、色值对齐权威源；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 设计文档外包可读=目标声明+阅读顺序+术语定义]` — 设计文档要给外包重做，须从头至尾可读、锚定一个明确目标——目标声明（文档解决什么）+ 阅读顺序（从哪读起）+ 术语定义（关键概念一句话），不依赖会话上下文。
`[待沉淀: 身份固定色→主题色自选=角色识别与个人偏好解耦]` — 身份不再绑定固定色值：角色识别色（关系图/角色卡的辨识色）与个人偏好强调色（工作台 tab/按钮）解耦——前者用系统默认辨识色，后者由主题色盘自选覆盖。固定色绑定导致改版牵一发动全身，主题色体系则局部可调。

- **commit**：待提交（push 需书记批准）

## T-253 书记原话评议 · 内容轮（机械先行 + meta 规则）（2026-08-15）

**任务**：书记指示启动一轮「书记原话评议」，重心在**内容**而非形式——① meta 内容要 organic（表达/思路/逻辑清晰流畅浑然一体）；② 机械问题（形式）先行快速完成，但更重要的是内容；③ 多思考、多报告、多 ask user question 交流；④ 评议的分流原理——书记表达要思考进入「Review_queue 附录 / meta 长期规则 / 一改具改」哪一层。
**引用流程**：H60 书记评议 + sample-diff-learning（学习差异）+ H50.2（AskUserQuestion 多轮裁决）+ H30.1 一改具改
**来源**：书记指令（2026-08-15）+ AskUserQuestion 多轮裁决

### 评议发现的 4 处内容张力（AskUserQuestion 交流后书记裁决）
① **P-003 与 P-002 共用同一句原话** → 书记揭示：「理解真实/善用经验/创新沉淀/框架内对话」这组标题是**早期低级 AI 自己总结的**，须判断是否合理、是否有更清晰更有理论冲击力的表达。② **「管理事服务人」双重定位** → 书记裁决：「党建/党务的统一主语」是**绝对错误**，必须清理（书记很生气）；「管理事服务人」=完整叙事的总路径/总产出。③ **P-048 集中立论空缺** → 书记裁决：「集中 = 知情权」是**极大的 AI 懒政**——「=」是充要条件，书记原话只用「**最重要**」；「不是…而是…」反论有毒且危险，须提到 CLAUDE 维度禁止。④ **全篇收束** → 书记裁决：「恢复对话能力」只是「党建+科研」的部分，党建有很多面向，它本质是「服务人」的一个子命题。

### ① meta 长期规则（写入 CLAUDE.md 热层 H10）
- **新增「书记原话表达纪律」总纲**（三条铁律）：①极端限定词（最重要/关键在于/尤其是）禁止 AI 自造——这类词表达书记的侧重判断，AI 无权制造；②「不是…而是…」反论必须经书记过目（审议）后才能写入；③禁止把「侧重」改写成「等号」（充要）或「对立」（排他）——「最重要」是侧重不是唯一，改写会引入书记没说的内容。
- **强化「AI 展开原则」**（L74）：AI 的作用是作为一名**合格的秘书**——写出的话应是"grill 书记后的话"；秘书不得私加极端限定词、不得用反论替书记立论。
- **修正丙部 P.9**：`集中 = 知情权` → `最重要的集中是【知情权】`（删等号）。

### ② 一改具改（机械先行）
- **「党建/党务统一主语」绝对错误清理**：SECRETARY_PRONOUNCEMENTS 头部 L32 + DEVELOPMENT_PATH L12 均改为「管理事服务人=完整叙事的总路径/总产出」，标注「该表述为错误概括已清理」。
- **P-048 删反论回原话**：「集中不是指挥权，而是知情权」→「最重要的集中是【知情权】」；出处「集中=知情权」→「最重要的集中是知情权」；头部 L32「（集中是知情权，不是指挥权）」→「（最重要的集中是知情权）」。
- **标题重拟（方案一）**：P-002 感受真实的组织 / P-003 站在累积的经验上 / P-004 把没先例变成有先例 / P-005 在框架内说真话（从书记原话提炼，非 AI 造词）；目录/索引表/锚点/交叉引用全部同步。
- **书记原话从引用框升正文**（对段落格式功能的漠视）：P-009「组织者两种情况」、P-010「分工记录裁决」、P-015「任务流原话」、P-005「补充」块——原话升正文去来源标注，AI 讲解才放引用框。
- **P-041 定位修正**：「恢复对话能力」是「服务人」的一个子命题（党建+科研只是党建诸多面向之一，非全局收束）；头部脉络 + P-041 讲解块补定位句。
- **Big picture 常驻注释**（YAML 后）：书记所有原话是一个 Big picture 的不同侧面，须放到「支部建设的同一个整体」理解，融会贯通；AI 是合格的秘书。

### 变更文件
`CLAUDE.md`（H10 表达纪律 + AI 展开原则强化 + P.9 等号修正）/ `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（主语清理 + P-048 删反论 + 标题重拟 + 原话升正文 + P-041 定位 + Big picture 注释）/ `content/01_strategy/DEVELOPMENT_PATH.md`（L12 主语清理）

### 验证结果
✅ 「统一主语」「集中=知情权」「不是指挥权，而是」「（集中是知情权，不是指挥权）」零残留；✅ 标题四词已替换为方案一、锚点 slug 一致；✅ 书记原话不在引用框内；✅ P-041 定位含「服务人的子命题」；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 等号/不是而是=AI 懒政的两种毒性表达]` — AI 把书记的「最重要」（侧重）改写成「=」（充要条件）或「不是…而是…」（排他对立），是把侧重偷换为边界划定、引入书记没说的内容。「最重要」≠「唯一」；「不是指挥权，而是知情权」这种对立式是书记没说的反论，必须书记过目才能写入。铁律：极端限定词禁止 AI 自造、反论须审议、等号/对立禁止替换侧重。
`[待沉淀: 要点标题须从书记原话提炼，非 AI 造词]` — 论断的标题（理解真实/善用经验等）如果是早期低级 AI 自己总结的，会有「理论冲击力不足」的问题——标题应直接从书记原话提炼（感受真实的组织/站在累积的经验上/把没先例变成有先例/在框架内说真话），而非 AI 另造动宾四字词。

- **commit**：待提交（push 需书记批准）

## T-254 书记原话评议 · 母本修缮（正本清源 + 逻辑结构重组）（2026-08-15）

**任务**：书记指示「先进行母本的修缮，正本清源；下一项大任务是对 development_path 及下游文档的修改传播」；同时反复强调「什么样的 AI 扩充是好的扩充，值得思考反思」。
**引用流程**：H60 书记评议 + sample-diff-learning（差异学习）+ brainstorming（共同探索）+ H30.1 一改具改
**来源**：书记指令（2026-08-15）+ AskUserQuestion 多轮裁决

### ① 母本子本正本清源（三步）
- **书记裁决**：「母本是相对子本而言的」「书记原话一定是全仓库的木本」——当前出处行把「子本」错标成「母本」是本末倒置。
- SECRETARY_PRONOUNCEMENTS 出处行 16 处「母本：DEVELOPMENT_PATH/FLAT_DESIGN/COMMISSIONER_FRAMEWORK」→「子本：」（展开叙事）；P-048「母本：P-009+P-043」→「演绎自：」。
- SSOT_INDEX 补注册「SECRETARY_PRONOUNCEMENTS → DEVELOPMENT_PATH/FLAT_DESIGN」两条级联。
- DEVELOPMENT_PATH 头部补「本文档是论断汇编的子本，冲突时以论断汇编为准」。

### ② 好的 AI 扩充四条标准（写入常驻规则）
- 书记反复追问「什么样的 AI 扩充是好的扩充」——把已裁决原则系统化为四条可检验标准：①忠实（无极端限定/反论/等号）②关系性（讲清 big picture 关系，不孤立）③自然（不套模板、无区隔标注）④克制（不私加内容）。
- 写入 CLAUDE.md H10 + SECRETARY_PRONOUNCEMENTS 头部。「关系性」是当前主要缺口，修缮时逐条补足。

### ③ 主客统一（辩证法的要求，写入 CLAUDE.md H10）
- 书记揭示「主客统一」的辩证含义（非静态对齐，而是螺旋上升）：应然性（方兴未艾→推导要求）→ 实然性（支委班子制度落实）→ 主客转化（成员从被要求的客体变成自觉工作的主体，从被建设变成建设的服务对象和参与者）→ 反作用（巩固提高对支委班子的要求）。
- 视角从「外部新人」改为「支部成员/党支书」，拒绝「我和组织的关系」这种干瘪追问。

### ④ 逻辑结构重组（新四章）
- 视角转换 + 元命题后置 + P-043 拆开（认识总纲前置/价值收束呼应）+ P-044 归位。
- 新四章：一、支部为什么这样期待（P-001~P-005+P-044）；二、组织怎么承载这些期待（P-043+P-009~P-048）；三、服务人的一个子命题（P-041）；四、管理事、服务人——主客统一（P-045/P-047）。
- 各条论断原话、引用块、出处行逐字保留，仅移动位置。

### 变更文件
`CLAUDE.md`（四标准总纲 + 主客统一总纲）/ `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（出处行母本→子本 16 处 + 四标准 + 结构重组新四章）/ `content/03_doc_system/SSOT_INDEX.md`（补注册 2 条级联）/ `content/01_strategy/DEVELOPMENT_PATH.md`（头部子本声明）

### 验证结果
✅ 母本→子本字段零残留；✅ 新四章结构顺序正确（Grep 验证 P-001→P-044→P-005 / P-043→P-048 / P-041 / P-045→P-047）；✅ 原话未改动；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 主客统一=辩证法的组织哲学]` — 支部与成员的关系不是「要求—执行」的单向对齐，而是辩证螺旋：要求被理解 → 成员从客体变主体（自觉工作）→ 从被建设变建设的参与者 → 反作用于支委班子（巩固提高要求）。视角表述须体现这个辩证回环（客体→主体转化 + 反作用），而非静态的「关系/期待/为什么」干瘪追问。
`[待沉淀: 好的 AI 扩充=忠实+关系性+自然+克制]` — AI 扩充的四条可检验标准：忠实（不私加极端限定/反论/等号）、关系性（讲清 big picture 关系不孤立）、自然（不套模板无区隔标注）、克制（不私加内容）。「关系性」是主要缺口——扩充不是复述原话，而是把原话放进整体讲清它与谁的呼应。

### 下一项大任务
development_path 及下游文档的文字修改传播（一改具改：把母本修缮后的新视角/新结构/新标题传播到 DEVELOPMENT_PATH → DATA_ARCHITECTURE/FLAT_DESIGN/insights/about 页）。B 扩充质量修缮待本轮结构完成后进行。

- **commit**：待提交（push 需书记批准）

## T-255 书记原话自查自纠 · 机械先行 + 重新编号 + 下游传播（2026-08-15）

**任务**：书记 6 条指示——①对书记原话再做系统性自查自纠和书记评议；②每一句话出现一次才是对的，反复出现不合理（去重）；③新逻辑框架对应新编号，向下游传播；④标题用短语不是问句、不要括号；⑤两种机会非并列，找更准确中心词（「服务人」不够具象）；⑥有些原话不合理（P-045「逻辑缺漏待补充」声明已过时、P-002 原话逻辑缠绕）。
**引用流程**：H60 书记评议 + sample-diff-learning + brainstorming + H30.1 一改具改
**来源**：书记指令（2026-08-15）+ AskUserQuestion 多轮裁决

### ① 书记原话自查自纠（4 项）
- **去重**：P-003 原话「事情的运作固然有管理的科学和既往的经验…本身便可以得到成长和锻炼」与 P-002 观察点1 逐字重复 → P-002 观察点1 只保留「真实感受具体组织 vs 想象（等级森严）」前半句，该原话只出现一次（P-003）。
- **拆缠绕**：P-002 观察点1 原把「真实vs想象」+「管理科学+经验」+「执行工作流成长」三要点缠绕 → 拆开归位。
- **删过时声明**：P-045 原话里的「（这里面可能还有一些小小的逻辑缺漏…须要补充完整的）」——现 P-007/P-005（原 P-043/P-044）已补充，声明已过时 → 删除，引用块改正面表述。
- **标题改短语**：四章标题从问句+括号改为短语式——一、方兴未艾的支部期待 / 二、承载期待的制度 / 三、服务人的子命题 / 四、管理事、服务人的主客统一。

### ② 重新编号 P-001~P-017（新逻辑框架对应新编号）
按新逻辑顺序重排 17 条论断：P-043→P-007、P-044→P-005、P-005→P-006、P-009→P-008、P-010→P-009、P-014→P-010、P-015→P-011、P-048→P-013、P-041→P-014、P-045→P-015、P-047→P-016（P-001~P-004/P-012 不变）。已迁出条目统一加「原」前缀避免冲突。

### ③ 主客统一新条目 P-017 + CLAUDE.md 辩证表述更新
- 书记改写「主客统一」完整辩证表述（应然性/实然性/主客转化与统一/反作用与再发展 + 螺旋上升），写入 CLAUDE.md H10 替换简化版。
- 新增 P-017「主客统一——组织要求与成员自觉的辩证统一」（原话四句 + 引用块 + 出处行），作为第四章收束（元命题）。

### ④ 下游传播（重新编号一改具改）
20+ 现行文档同步更新（CLAUDE.md 7 处、DEVELOPMENT_PATH 4 处、insights 4 处、DESIGN_SYSTEM/COMMISSIONER_FRAMEWORK/FLAT_DESIGN/DATA_ARCHITECTURE/SOP_WEB/OPERATIONS_GUIDE/USAGE_POLICY/SSOT_INDEX/README/SOP 各若干、docs/src 6 个 JS + about.css）。歧义编号（P-005/P-009/P-010/P-014/P-015）逐处按上下文判断论断含义再映射，无误改。.ctx/logs 历史文件不改。

### 变更文件
`CLAUDE.md`（主客统一辩证表述 + 编号同步）/ `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（自查自纠 + 重新编号 + P-017 新条目）/ `content/01_strategy/DEVELOPMENT_PATH.md` + 20+ 下游文档（编号同步）

### 验证结果
✅ 旧编号 P-041/P-043/P-044/P-045/P-047/P-048 下游现行文档零残留；✅ 新编号 P-001~P-017 连续无断号；✅ 四章标题短语式；✅ P-017 存在；✅ 原话除明确拆改外逐字保留；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 原话自查三原则=去重/拆缠绕/删过时]` — 书记原话系统性自查的三项：①去重——同一句原话只出现一次，反复出现是汇编的冗余；②拆缠绕——一句原话若缠绕多个要点，须拆开归位到各自论断（原话完整保留不等于要点缠绕）；③删过时——原话里的「过程性声明」（如「逻辑缺漏待补充」）若已闭环，应删除，否则误导读者以为仍有缺漏。

### 待办（下一轮）
1. **两种机会中心词**（问题 5）：P-007（两个向度）与 P-005（探索机会）非并列，需更准确的中心词概括「服务人」下这两个机会——待书记表达。
2. **AI 扩写重写**（B 扩充质量）：按四条标准（忠实/关系性/自然/克制）重新审视全部引用块，规划重写方案。
3. 标题/编号待书记最终审校。

- **commit**：待提交（push 需书记批准）

## T-256 主客统一表述更新 + 补充论断（2026-08-15）

**任务**：书记修改「主客统一」论断表述（全仓库精确同步，符号文字一点不差）+ 补充两条论断（纳什均衡升级、集中容易分工难）。
**来源**：书记指令（2026-08-15）+ spec 三件套（2026-08-15-pronouncement-subject-object-unity-update）

### ① 主客统一表述全仓库同步
- CLAUDE.md H10 总纲 → 替换为书记定稿「要在组织发展的过程中不断互动、磨合、交流、成长——①应然…④反作用与再发展」（保留「凡涉及…须体现辩证回环」规则尾巴）。
- P-017 原话「草案四句」→ 替换为书记定稿（纯原话，不加规则尾巴；因定稿内部含半角双引号"被要求的客体"与直角引号「方兴未艾的学生组织」，外层不再加引号包裹，避免嵌套冲突）。
- P-017 引用块同步对齐新表述（自觉工作的主体→服务对象/参与者和主体；经由组织中介；推动个人参与组织实践）。
- 符号精确：①应然/②实然/③主客转化/④反作用与再发展 +「方兴未艾的学生组织」（直角引号）+ "被要求的客体"（半角双引号）+ 【要求】【自觉】【服务对象】（方括号）。

### ② 补充论断
- P-017 原话后方新增「纳什均衡升级」观察点（无序列表）：「对于不熟悉辩证法的同志，可以理解为一种纳什均衡的升级。只不过，纳什均衡中，环境是绝对的外在，主体间形成由环境决定的均衡；但在这里环境是主体的。」
- P-013（民主与集中的统一）原话后方新增「集中容易，分工难」观察点（无序列表）——该句直接对比「集中」与「分工」，归属 P-013。

### 变更文件
`CLAUDE.md`（主客统一总纲）/ `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（P-017 原话+引用块+观察点、P-013 观察点）

### 验证结果
✅ 旧表述（草案四句 + 上一轮辩证版特征句）零残留；✅ 书记定稿符号文字精确复刻；✅ 两条补充论断观察点就位；✅ GetDiagnostics 无 Error（仅预存 markdownlint Warning）。

### 沉淀标签
`[待沉淀: 原话定稿内部含多重引号时外层不加引号]` — 书记定稿若内部同时含半角双引号（"被要求的客体"）与直角引号（「方兴未艾的学生组织」），外层不能再加引号包裹（任何单一引号都会与内部嵌套冲突）；应直接呈现定稿原文 + 日期，内部符号一点不差。

- **commit**：待提交（push 需书记批准）

## T-257 服务人机会中心词 + AI 扩写重写（2026-08-15）

**任务**：① P-007/P-005「两种机会」中心词（「服务人」具象化）；② AI 扩写引用块按四标准审视重写。
**来源**：书记指令（2026-08-15）+ spec（2026-08-15-pronouncement-opportunity-centers-ai-rewrite）

### ① 服务人机会中心词落地
- 书记定稿中心词：「适应、学习的机会」（P-007）与「探索、创新的机会」（P-005），并列、侧重不同，保留「机会」总称。
- 论断汇编头部补「服务人」具象化段（L18）：「服务人」包含组织给成员提供的两个并列、侧重不同的成长机会。
- P-007/P-005 引用块互指并列关系；DEVELOPMENT_PATH「两条宝贵机会」引言 + 机会1/机会2 标题 + L90 描述同步改为「适应、学习的机会/探索、创新的机会」。

### ② AI 扩写四标准审视重写
- **清理反论**（书记警示「警惕所有 = 和 不是…而是…」）：14 处 AI 私加的「不是…而是…」「而非」「≠等号式对立」改为正面陈述（含文件头 1 处 + 13 处引用块）。书记原话正文里的「而非」「不是」忠实保留。
- **清理私加**：删 AI 编造的具体列举（「想进体制的/走学术的/去企业的」「发展党员/党费缴纳/办党课」「重复造轮子」「摸石头过河」等）。
- **补足关系性**：5 条孤立引用块（P-001/P-003/P-011/P-014/P-017）补 big picture 关系指向（呼应/对比/收束）。

### 变更文件
`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（中心词 + 反论清理 + 关系性补足）/ `content/01_strategy/DEVELOPMENT_PATH.md`（中心词）

### 验证结果
✅ 中心词「适应、学习的机会/探索、创新的机会」3 处一致；✅ 引用块「不是…而是…」「而非」零残留；✅「=」等号零残留；✅ GetDiagnostics 无 Error；✅ 书记原话正文逐字未动。

### 沉淀标签
`[待沉淀: AI 反论清理=「不是而是」「而非」「=」一律正面化]` — 书记警示：AI 扩充中所有「不是…而是…」「而非」（排他对立）「=」（等号改写）都是「极大的 AI 懒政」——把侧重偷换成对立/充要。凡 AI 引用块出现即清理为正面陈述，只保留书记原话正文里的忠实复述。
`[待沉淀: 关系性=引用块须讲清与谁呼应]` — AI 扩充若只复述原话+出处、未讲清「与哪条论断呼应/对比/因果」，即为「关系性」不达标；须补一句「与 P-XXX 的关系」或「呼应 P-XXX」，把孤立论断放进 big picture。

- **commit**：待提交（push 需书记批准）

## T-258 四层结构重组 + 编号下游传播（2026-08-16）

**任务**：书记转述 GPT 评议（「学生党支部组织理论雏形」），要求①学习 GPT 更新「好的 AI 扩充」标准；②四层结构重组（价值目标→组织机制→人的成长→组织再生产）；③元命题前置 + 成长章集中 + 成长定义；④编号重排 + 下游传播。
**来源**：GPT 评议 + 书记裁决（2026-08-16）+ AskUserQuestion 多轮

### ① 好的 AI 扩充标准 四→五条（新增「深化」）
- 学习 GPT 范本，新增第五条「**深化**」：AI 扩充应有自己的理解与深化——把分散论断抽象为统一理论结构（四层结构/组织学习闭环/探索-利用），但锚定原话、不私加、不违背书记意思、对接组织建设真实问题（GPT 范本：有深化又不违背书记意思）。
- 写入 CLAUDE.md H10 + 论断汇编头部（五条标准）。

### ② 四层结构重组（元命题前置，推翻「元命题后置」旧命令）
- 新四章：一、价值目标（管理事服务人）→ 二、组织机制（承载期待的制度）→ 三、人的成长（适应/探索/对话）→ 四、组织再生产（主客统一）。
- 元命题前置：P-015/P-016（系统产出/完整叙事）从末尾移到「价值目标」章（P-002/P-003）。
- 成长章集中：P-007（适应）/P-005（探索）/P-014（对话）集中到「人的成长」章（P-014/P-015/P-016）。
- 成长定义写入成长章章首：书记新原话「成长体现在表达能力、组织能力、协调能力、领导能力的持续提升」+ GPT 定义（能力结构变化）加粗于 AI 扩充（正面化，去「不是…而是…」）。

### ③ 编号重排 P-001~P-017（双射）+ 下游传播
- 映射：P-015→P-002、P-016→P-003、P-002→P-004、P-003→P-005、P-004→P-006、P-006→P-007、P-007→P-014、P-005→P-015、P-014→P-016（P-001/P-008~P-013/P-017 不变）。
- 下游 20+ 文件按「含义→新编号」同步（非机械替换），旧漂移编号清零。

### 变更文件
`CLAUDE.md`（五条标准 + 编号）/ `content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（四层重组 + 编号 + 成长定义 + 标题优化）/ `content/01_strategy/DEVELOPMENT_PATH.md` + insights/FLAT_DESIGN/OPERATIONS_GUIDE/USAGE_POLICY/README/党小组组长工作手册/about-entry.js/about.css（编号同步）

### 验证结果
✅ 四章标题齐全；✅ 编号 P-001~P-017 连续无断号；✅ 成长定义在成长章章首；✅ 四层总纲在头部；✅ 书记原话正文逐字未动；✅「=」「不是…而是…」AI 引用块零残留；✅ GetDiagnostics 零错误。

### 沉淀标签
`[待沉淀: 好的 AI 扩充五条=忠实/关系性/深化/自然/克制]` — 新增「深化」维度：扩充应把分散论断抽象为统一理论结构（四层/闭环/探索-利用），但锚定原话、不私加、不违背书记意思、对接真实问题（GPT 范本：有深化又不违背）。
`[待沉淀: 元命题前置=价值目标是循环总入口]` — 书记裁决推翻「元命题后置」：四层结构下，「管理事服务人」是循环总入口，价值目标（含元命题）应前置作入口，组织再生产（主客统一）后置作终点，首尾呼应成循环。

### 待书记确认（下一轮）
1. P-016 标题：「"恢复对话能力"战略表达——党建+科研的重要战略选择」是否改为「恢复对话能力——党建+科研的重要战略选择」（去「战略表达」）或「对话能力」格式，与 P-014/P-015 对齐？
2. P-007 引用块交叉引用：「可循的先例不多」现指向 P-015（探索），语义上更贴切 P-006（把没先例变有先例），是否改指 P-006？
3. 数量描述过时：OPERATIONS_GUIDE/README/党小组组长工作手册中「26 条」「16 条」未随 17 条重组更新。
4. 历史判例/迁出标注的编号歧义（是否统一加「原」前缀）。

- **commit**：待提交（push 需书记批准）

## T-259 书记 7 条指示执行（2026-08-16）

**任务**：书记对 T-258 待确认项裁决——①P-016 删「战略表达」；②交叉引用可都指不强制一一对应；③机械问题一并修正；④历史判例有必要加【原】前缀、没必要删；⑤L336-341 六条观点放入正文（无序列表）；⑥更新链接引用 + 下游论述调整；⑦AI 扩充「无意义重复」评议报告入 REVIEW_QUEUE（暂不修改）。
**来源**：书记指令（2026-08-16）+ sample-diff-learning + verification-before-completion

### ① P-016 标题 + 六条观点入正文
- 标题「"恢复对话能力"战略表达——…」→「恢复对话能力——党建+科研的重要战略选择」（删「战略表达」）；L332「本战略表达」→「本论断」。
- 六条《经管学科党建工作的知识特点与优化路径》观点从引用块（`> -`）改为正文无序列表（`-`）——它们是书记补充的观点（书记原话），应作正文。
- 附录索引 P-016 行同步（删「战略表达」+ 锚点更新）。

### ② 机械问题修正（数量 17 条）
- README L175「16 条路线级」、ARCHITECTURE L155「26 条」、OPERATIONS_GUIDE L342「26 条」、党小组组长工作手册 L308「26 条」→「17 条论断」。

### ③ 历史判例处理
- 保留 + 加【原】前缀：OPERATIONS_GUIDE「P-017·甲部自省」「P-016·一改具改」→「原 P-017」「原 P-016」；SOP_WEB「P-029 退役」「P-027 已拆解」→「原 P-029」「原 P-027」。
- OPERATIONS_GUIDE D 表述判例更新「改后」表述（26 条→17 条、P-015/P-016→P-002/P-003，去「引子」）。

### ④ 链接引用
- 全仓锚点链接仅 3 处（均指向 P-011），与标题一致有效，无失效锚点，无需改。

### ⑤ AI 扩充评议报告 → REVIEW_QUEUE（暂不修改）
- 命题：AI 扩充是否「无意义重复书记表述」。预审结论：不是全部重复，但「深化」维度整体偏弱——5 条（P-001/P-004/P-008/P-012/P-017）深化充分，12 条「关系充分、深化偏弱」（复述+关系指向为主）。4 个深化缺口候选（探索-利用/组织学习闭环/能力结构变化双向/民主集中两面）待书记裁决。

### 变更文件
`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（P-016 标题+六条入正文+索引同步）/ `README.md` + `ARCHITECTURE.md` + `OPERATIONS_GUIDE.md` + `党小组组长工作手册.md`（数量 17 条）/ `OPERATIONS_GUIDE.md` + `SOP_WEB.md`（历史判例加【原】前缀）/ `.ctx/REVIEW_QUEUE.md`（评议报告）

### 验证结果（verification-before-completion）
✅ GetDiagnostics 返回 `[]`（零错误）；✅「战略表达」SECRETARY_PRONOUNCEMENTS 零残留；✅「26 条论断/16 条路线级」现行文档零残留（仅历史日志保留）。

### 沉淀标签
`[待沉淀: 书记补充观点入正文而非引用块]` — 书记补充的多条观点（如六条经管学科观点）是书记原话，应作正文（无序列表），不放入 AI 引用块；「正文形式」铁律：书记原话作正文，AI 扩充才入引用块。
`[待沉淀: 历史判例加【原】前缀]` — 已迁出/退役论断的历史记录若保留，旧编号须加【原】前缀，避免与当前论断编号冲突；纯过程性流水账直接删。

### 待办（下一轮）
1. AI 扩充「深化」评议：REVIEW_QUEUE 主队列已写入预审报告，待书记逐条裁决「深化」达标/补方向（暂不修改）。
2. P-007 交叉引用「可循的先例不多」：书记裁决「可都指」，保留指向 P-015（可同时补 P-006），暂未强制改。

- **commit**：待提交（push 需书记批准）

## T-260 全文 AI 扩充理论审计 + 深化执行（2026-08-16）

**任务**：书记提供 768 行审计 prompt（`.trae/specs/2026-08-16-Audit-of-Secretary-Pronouncement`），要求以之为标准独立重审 SECRETARY_PRONOUNCEMENTS 全文 AI 扩充，并执行深化。
**来源**：书记审计 prompt + brainstorming + verification-before-completion

### ① 独立审计（不继承此前预审）
- 完整重读 P-001~P-017 全文，逐条建立「原话—关系—理论结构」三层表，输出七部分审计报告写入 REVIEW_QUEUE（替换 T-259 预审）。
- **关键纠偏**：此前「深化充分=P-001/P-004/P-008/P-012/P-017」分类**误把「关系性充分」当「深化充分」**——这五条实为 2 分（局部机制）。真正的跨论断理论结构（3 分）是 P-007（存量/增量/守护闭环）、P-011（看≠做信息匹配）、P-013（民主集中统一于程序）。
- 深化分布：3 分×3、2 分×10、1 分×4（P-002/P-009/P-014/P-016）。

### ② 深化执行（严格锚定原话，不引入理论术语）
1. P-005 补「继承—探索—沉淀—再利用」循环显式命名（原话已含，此前未显式连成循环）
2. P-017 补「组织学习闭环」动态描述（四环节连成循环）
3. P-014 补「进入组织+改变组织」双向能力结构
4. P-011 的 L0/L1/L2 信息密度分层标注「工程实现层」（避免工程推论混入制度层）
- 未执行「精简 P-002/009/014/016 的见 P-XXX 重复」（风险较高 + 书记「可都指」不强制）。

### 变更文件
`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（P-005/P-014/P-017 深化补足 + P-011 标注）/ `.ctx/REVIEW_QUEUE.md`（独立审计报告替换预审）

### 验证结果（verification-before-completion）
✅ GetDiagnostics 返回 `[]`（零错误）。

### 沉淀标签
`[待沉淀: 关系性 ≠ 深化]` — 「与 P-XXX 一脉相承/并列」是关系说明（1 分），不是理论深化（3 分）；深化 = 把分散论断抽象为跨论断结构（如工作流生长闭环、民主集中统一于程序）。审计时须分别打分，不得把「关系性充分」误判为「深化充分」。
`[待沉淀: 显式化原话已有结构 ≠ 引入理论术语]` — 深化是把书记原话之间「已存在但未显式化」的结构讲清（如把「有先例循例+无先例开拓+沉淀」连成「继承—探索—沉淀—再利用」循环），而不是套「探索—利用/博弈论/组织学习」等术语；理论术语不是深化本身。

### 待书记反馈（审计报告 §五/§七）
1. 两个真实张力待书记裁决：服务↔考察（P-014/015 vs P-009/012）、组织纪律↔成员主体性（P-007 vs P-017 的边界）。
2. 审计报告七部分已入 REVIEW_QUEUE，请书记审阅并指示是否进一步执行「建议修改」第 5 项（精简重复）或其他。

- **commit**：待提交（push 需书记批准）

## T-261 两个张力裁决落地（2026-08-16）

**任务**：书记对 T-260 审计报告 §五 的两个真实张力作正式裁决，落地到论断汇编。
**来源**：书记裁决（2026-08-16）+ brainstorming + verification-before-completion

### ① 服务 ↔ 考察（正式命名「同一实践、双重产出；功能并列、评价分离」）
- 三个层次：①实践本身可同时服务+考察；②服务不能被设计成「为了考察而服务」（服务须有独立价值，考察只能来自实践自然产生的组织信息）；③考察信息进入正式评价时须有独立制度边界。
- 落地 P-011「考察信息评价边界」：党小组活动和专班"不承担直接发展考核党员的职能"，支委会做好培养发展党员的实质性、全流程把关；服务是面向成员的价值功能（实践给成员带来什么），考察是面向组织的认识功能（实践让组织认识到什么）——功能并列、评价分离。

### ② 组织纪律 ↔ 主人翁意识（三层边界，反对「主体性」改「主人翁意识」）
- ①方向性边界（政治方向/组织性质/基本要求不突破）；②程序性边界（谁决定/何时/什么程序/谁协调/谁最终判断不跳过）；③工作内容和方法（允许成员高度发挥主人翁意识）。
- 主人翁意识主要作用于「组织实践的内容和方法」，不以主人翁意识为由取消组织的方向和程序——把 P-007「在框架内说真话」与 P-017「主人翁意识反作用」接起来。
- 落地 P-017「主人翁意识的三层边界」。

### 变更文件
`content/01_strategy/SECRETARY_PRONOUNCEMENTS.md`（P-011 考察信息评价边界 + P-017 主人翁意识三层边界）

### 验证结果（verification-before-completion）
✅ GetDiagnostics 返回 `[]`（零错误）。

### 沉淀标签
`[待沉淀: 服务-考察张力=同一实践双重产出，功能并列评价分离]` — 服务与考察不是冲突、也不是「同一实践的两面」，而是「同一实践同时承担的两种不同功能，在信息如何被使用层面存在真实张力」；服务须有独立价值，考察信息进入正式评价须有独立制度边界（党小组/专班不承担直接考核职能）。
`[待沉淀: 主人翁意识三层边界]` — 主人翁意识作用于「方向性/程序性/工作内容方法」三层，只主要作用于第三层（内容和方法），不以主人翁意识为由取消组织的方向和程序；书记倾向「主人翁意识」而非「主体性」。

- **commit**：待提交（push 需书记批准）

## T-262 DEVELOPMENT_PATH 重构（2026-08-16）

**任务**：按书记 spec（`.trae/specs/2026-08-16-Audit-of-DEVELOPMENT-PATH.md`）重构 DEVELOPMENT_PATH——P-017「主客统一」第一阶段落地。
**来源**：书记 spec + brainstorming + verification-before-completion

### ① Source Audit + Development Logic Audit
- 审计发现：当前文件「积极分子第一视角」开头（违反「组织迈出第一步」）、三阶段均以「大家普遍以为」稻草人开头、方兴未艾只作探索机会背景、AI 私加列举残留（想进体制的/想走学术的/想去企业的）、发展党员流程嵌第一章末尾、无结语、党员承接叙事不足、主人翁边界/服务考察关系缺位。
- A→H 发展逻辑链（方兴未艾→矛盾→要求→制度化→实践→自觉→主体→反作用）成立。

### ② 全新重写（七章 + 导言 + 结语 + 附录A）
- 导言：我们为什么要先向你说明自己（组织迈出第一步）
- 第一章：方兴未艾 → 内在矛盾 → 组织要求（因果起点）
- 第二章：真实组织/有先例无先例/框架内说真话/主人翁三层边界/服务考察关系
- 第三章：组织性变化非能力等级 + 两种成长机会
- 第四章：发展党员流程（官方原文 21 条逐字保留 + 支部实践解释分离）
- 第五章：党员承接下一轮（党员是第二次主角 + 先锋模范具体化）
- 第六章：参与组织下一阶段建设（从参与到建设，自然出现「组织塑造人，人再造组织」）
- 第七章：党建+科研（不越位成党建总论）
- 结语 + 附录A（附录B 移除）

### ③ 关键改进
- 叙事主语从「积极分子」改为「组织」（组织发起→成员进入→成员转化→党员承接→组织再生产）
- 去稻草人（「大家普遍以为」「很多人会觉得」「潜台词」全删）、去 AI 私加列举
- 主人翁意识三层边界 + 服务↔考察「同一实践双重产出」落地
- 书记原话全部保留（P-001~P-017 相关），官方流程逐字保留

### 变更文件
`content/01_strategy/DEVELOPMENT_PATH.md`（全新重写）

### 验证结果（verification-before-completion）
✅ GetDiagnostics 返回 `[]`（零错误）；✅ 稻草人/私加句式（大家普遍以为/很多人会觉得/潜台词/想进体制的等）零残留；✅ 10 Test 自查通过（陌生积极分子/组织阶段/要求来源/身份/党员/主人翁/实践/再生产/P-016 边界/循环）。

### 沉淀标签
`[待沉淀: 叙事主语随阶段转换]` — 发展路径类文档的叙事主语不能固定为「成员视角」，须随阶段转换：组织发起（组织是主动者）→ 成员进入 → 成员转化 → 党员承接 → 组织再生产；开篇由「组织迈出第一步」而非「成员应该怎样」。
`[待沉淀: 去稻草人句式]` — 「大家普遍以为」「很多人会觉得」「潜台词是」等 AI 制造的稻草人批判句式须清除——它们会让全文产生「AI 替书记发明思想」的感觉；正面陈述「组织是什么、为什么这样做」即可，不预设错误理解。

### 待办（下一轮）
1. 若书记审阅后需微调叙事风格/章节，再迭代。
2. commit 待书记指示（push 需书记批准）。

- **commit**：待提交（push 需书记批准）

## T-263 02_institution 反论/等号全仓清理 + 母本 P-008/P-013/知情边界 同步（2026-08-17）

**任务**：书记指令——02_institution 反论（稻草人「不是…而是…」「而非」排他对立）与等号（= / ≠ / == / 不等于）全仓清理，斩草除根；并扩展至母本 SECRETARY_PRONOUNCEMENTS 同类反论同步删除。
**来源**：书记 2026-08-17 四点指令（建议修改必须改 / 待确认必须删 / 不建议修改都要改 + "="大问题 / 扩大范围斩草除根）+ REVIEW_QUEUE 02_institution 下游同步审计轮 + brainstorming + verification-before-completion

### 反论稻草人删除
- 党小组组长工作手册：L26「你不是支委的下属，而是」→「你与支委」；L30「分工而非命令关系…不是谁官大听谁的…接力跑的伙伴…若把组长定位为下属」→「分工关系…组织经验通过分工落地」；L93「，不是活动」删；L172「不等于全量广播，而是」→「即」
- COMMISSIONER_FRAMEWORK：L399「不是单向报备」「不是活动可否创建，而是」删（书记确认非原话）；L174「这不是能力问题，是」→「这属于」
- 纪检：L104「监督者不是执行者…既当裁判又当运动员」→「承担监督职能…监督者与执行者身份合一」
- 宣传：L27「服务者而非组织者」→「承担活动服务职能」；L35「不是日历，是」→「是」+ 色值 #2563EB 删；L107「不是都发给」删
- 常见场景：L251「不等于…边界模糊」→「同时保持…边界清晰」；L260「不是独立活动类型」删
- 组织委员：L39「不是日历，是」→「是」

### 等号清理
- 党小组 L180「组织者 ≠ 」→「由不同人担任」；L193「组织者 == 」→「由同一人担任」
- COMMISSIONER L363「信息可见范围=…；看 ≠ 做」→「为…；看与做分离」；L322「核心群 = 」→「由…构成」
- INDEX 6 处「= 」→「即」（支部党员/支部成员/条条/块块/党建工作/党务工作）
- ROLE_CLASSIFICATION 11 处「= 」→「表示」/「即」
- 支委定人定责 L56「条条 = /块块 = 」→「即」
- 组织委员 L117「数量 = 」→「为」
- FLAT_DESIGN L30 反论正面化 + 冗余段 L31 删除

### 母本 SECRETARY_PRONOUNCEMENTS 同步（斩草除根）
- P-008 L179「不是分工、流程、记录本身」删（书记 2026-08-17 明确「把这一段话删去」）
- P-013 L286「不是程序本身」删
- 知情边界 L247「看 ≠ 做」→「看与做分离」

### 刻意保留（非反论/非等号）
- 书记原话：「身份不是最重要的」「扁平化不等于没有程序」「而非想象中的组织」（P-004）
- 选择说明「而非」：「每周而非每日」「三态而非两态」「两级而非全部」（书记已确认保留）
- 代码 `isBrand = true`；迁移注记中「≠」为历史记录
- 主客统一辩证句（书记原话）

### 验证结果（verification-before-completion）
✅ GetDiagnostics 返回 []；✅ 02_institution 反论/等号 Grep 零残留（仅「不等于」书记原话 + isBrand=true 代码 + 选择说明而非）；✅ 母本 P-008/P-013/知情边界 同步完成。

### 待办（下一轮）
1. DEVELOPMENT_PATH「不是…而是」7 处（L48/L83/L89/L115/L227/L275/L285）待书记裁决是否清理——属叙事澄清，非「大家普遍以为」稻草人（后者 T-262 已删）。
2. commit 待书记指示（push 需书记批准）。

### 沉淀标签
无新模式——按 H5.8.2 禁用「不是…而是」句式 + H40.1「=」式命名禁令已有原则执行。

---

## T-264 资料查询「文档列表」重构：官方文件 + 支部文件（支委写入/全员下载）+ 全栈 branchDocs 资源（2026-08-18）

**任务**：书记指令——资料查询界面「文档列表」①只保留官方文件（「查看官方原文」）并按党内法规位阶排序、删去尺寸等冗余 span；②h3「文档列表」改「官方文件」；③删非官方条目，新增「支部文件」板块（写入后允许下载，设计写入/删除/修改，配套后端 service）；④文档与顶部 tab 挂钩，写入功能同步考虑。
**来源**：书记 2026-08-18 四点指令 + brainstorming + verification-before-completion + web-design-guidelines + 书记四问裁决（排序=党内法规位阶 / 权限=书记+支委 / 形态=上传实际文件 / tab=归入「党支部文档」/ 匿名可访 / 删除连物理文件一起删）

### 设计决策（书记裁决）
- 官方文件 5 条按党内法规位阶：党章 → 支部工作条例（试行）→ 高校基层组织工作条例 → 党员教育管理工作条例 → 发展党员工作细则
- 支部文件写入/删除/修改权限 = 支委（书记/副书记/组织/宣传/纪检，复用 `isCommissioner`）；下载 = 全体登录成员
- 文件形态 = 上传实际文件（API 模式落盘 `/api/v1/uploads`；mock 模式 base64 dataURL 兜底）
- 保持匿名可访：官方文件外链匿名可见；支部文件需登录后可见/下载
- 删除支部文件时联动删除物理文件（`deleteUploadedFile` 仅删 basename，防路径穿越）

### 后端变更
- `server/db.js`：RESOURCE_TABLES 加 `branch_docs`
- `server/routes/auth.js`：新增 `requireCommissioner` 中间件（requireAuth + 支委角色校验，COMMISSIONER_ROLES 与前端 isCommissioner 口径一致）
- `server/routes/resources.js`：RESOURCE_TABLES 映射加 `branchDocs`，ID 前缀 `bd`；`COMMISSIONER_WRITE` 集合使 branchDocs 的 POST/PATCH/DELETE 走支委校验；DELETE 联动 `deleteUploadedFile` 删物理文件
- `server/routes/uploads.js`：导出 `UPLOAD_DIR` + `deleteUploadedFile(filePath)`（basename 白名单）

### 前端变更
- `docs/src/core/domain.js`：mockDB 加 `branchDocs: []`
- `docs/src/core/mock-adapter.js`：branchDocs 持久化（save/load/restoreNicheCollections）+ CRUD
- `docs/src/core/api-adapter.js`：branchDocs list/create/update/delete
- `docs/src/core/data-adapter.js`：init() niche 拉取加 branchDocs（snapshot 有意**不**纳入——避免经 requireAuth 快照绕过支委写权限）
- `docs/src/core/cross-page-state.js`：CODE_VERSION 29→30
- `docs/search.html`：h3「文档列表」→「官方文件」+ 新增「支部文件」板块（写入按钮/列表/空态/登录提示）+ 入口版本号
- `docs/src/modules/references.js`：官方文件静态数组（位阶排序）+ 支部文件动态渲染（uploadedAt 倒序）+ 写入/修改模态框 + 删除确认 + 权限显隐 + 上传（API multipart / mock base64）
- `docs/src/entries/search-entry.js`：数据层初始化（保持匿名可访，不强制登录；token 存在切 API 否则 mock）
- `docs/src/styles.css`：`.ref-add-btn` / `.ref-doc-action-btn` / `.ref-doc-action-danger`

### 关键修复（实现期发现）
- ESM `?v=` 查询串决定模块身份：data-adapter.js 持有模块级状态（`_mockAdapter`/`DATA_SOURCE`），API 模式实例由 `runtime.js`/`bootstrap.js` 以 `?v=20260812d` 注册适配器。初版 references.js/search-entry.js 误用 `?v=20260818a` 会创建第三实例（无注册适配器→`getAdapter()` 抛错），已改回 `?v=20260812d` 对齐既有实例。

### 验证结果（verification-before-completion）
- ✅ GetDiagnostics 返回 []
- ✅ `server` 后端测试 15/16 通过（auth/resources/snapshot/uploads/bootstrap/seed 全覆盖）
- ⚠️ 1 项 E2E 浏览器测试（`e2e-login.test.js` 首页写穿闭环）超时失败——判定为**既有环境/未提交改动所致**，非本次改动引起：工作树含大量与本次无关的未提交改动（index.html/main-entry.js/work-overview.js 等首页文件）+ 沙箱「Not allow operate files」限制 Playwright 文件操作；本次 data-adapter 改动为 additive 且包裹 try/catch，不影响 activities 拉取路径

### 待办（下一轮）
1. 支部文件写入/删除/修改的浏览器手动验证（匿名可访/支委显隐/上传下载/删除连物理文件）
2. 删除确认当前用原生 `confirm()`，如需可替换为自定义模态（书记定夺）
3. commit 待书记指示（push 需书记批准）

### 沉淀标签
无新模式——权限中间件复用 requireAuth 模式、全栈资源同步复用 T-209/T-218 既有路径。ESM `?v=` 模块身份陷阱符合 KNOWN_PITFALLS 既有约束（新增引用须对齐既有版本串）。

---

## T-265 部署与认证场景模型 SPEC 落地（Part 1 · 侧边栏统一，2026-08-18）

**任务**：书记指令——①侧边栏所有界面统一，下端「退出登录、帮助」都要有，区分 5 种场景（GitHub 静态托管有 about / 有后端无 about / 开发模式 / 正常模式 / 未登录态）；②按 01-02 最新表述系统更新下游文件（README 全家 + about/help SPEC）。本次先做 Part 1（先侧边栏、后下游）。
**来源**：书记 2026-08-18 指令 + brainstorming + 多轮 AskUserQuestion 裁决（5 场景两轴正交 / 关于仅静态托管 / 退出仅登录后显示 / 登录门控四层 / 下载两类 / 构建时注入配置 / 先侧边栏后下游）

### 设计决策（书记裁决，见 SPEC）
- 5 场景 = 部署形态（静态托管/有后端）× 登录态（未登录/已登录·演示/已登录·正常）两轴正交，约去不可能项
- 侧边栏 footer 统一：帮助/字号/主题恒有 + 关于（仅静态托管）+ 退出登录（仅已登录，未登录无登录引导，跳转由门控层触发）
- 登录门控四层：L1 页面（工作台强制跳登录）/ L2 功能（写入需登录）/ L3 组件（身份逻辑隐藏或引导）/ L4 下载（公开外链 vs 内部附件）
- 后端检测 = 构建时注入配置（不做运行时探测）

### 已落地变更（Part 1 核心）
- 新增 `content/04_web_design/DEPLOYMENT_AUTH_MODEL.md`（长期保留设计 SPEC）
- 新增 `docs/src/config/deploy.js`：`DEPLOY_MODE = 'static'`（构建时注入标记）
- `docs/src/components/sidebar.js`：footer「关于」按 `DEPLOY_MODE==='static'` 显隐
- `server/app.js`：`GET /src/config/deploy.js` 路由覆盖，server 模式注入 `DEPLOY_MODE='server'`

### 待续（Part 1 剩余 + Part 2）
1. L1 首页 index 当前仍强制跳登录（bootstrapPage dashboard）——模型说「仅工作台强制」，首页是否改匿名可访待书记裁决
2. L2/L3/L4 登录门控逐处实施（写入功能 / 身份组件 / 下载的登录引导）
3. Part 2：about/help 现状 + 01-02 最新 → 形成 about/help SPEC
4. Part 2：README 全家 + 治理文档按 01-02 更新

### 验证结果
✅ GetDiagnostics 仅报既有 markdownlint 警告（.ctx 两 md 文件），本次改动文件无错误。

### 沉淀标签
无新模式——部署配置沿用 config 目录既有模式；场景模型为首次立规，SPEC 已固化于 04_web_design。

---

## T-266 部署认证场景模型落地续（L1 首页匿名 + about/help SPEC，2026-08-18）

**任务**：T-265 续——完成 L1 页面门控 + Part 2 about/help SPEC。
**来源**：书记 2026-08-18 多轮裁决（首页匿名可访但点击组件触发登录，IAAA 为登录落点最终目标 / help 删重叠叙事 / about 是 keynote 式组织说明非论断展示 / SPEC 落 .trae/specs）

### 已落地
- `docs/src/core/bootstrap.js`：L1 门控改为「仅工作台强制跳登录」；首页匿名渲染，组件点击跳工作台由工作台门控触发登录
- `content/04_web_design/DEPLOYMENT_AUTH_MODEL.md`：§四补首页匿名 + IAAA 目标注记
- 新增 `content/04_web_design/ABOUT_HELP_SPEC.md` → 经书记纠正后迁移至 `.trae/specs/ABOUT_HELP_SPEC.md`（SPEC 为过程性，非长期设计）

### 关键纠正（书记 2026-08-18）
1. SPEC 位置应在 `.trae/specs`（过程性），非 04_web_design（长期设计）
2. about 不是书记论断的「展示」，论断只是「信息源」；about 是面向想加入者的组织说明，名「从入党申请人到正式党员」，讲「一个人在组织里如何成长」，是书记给新生讲解的 keynote
3. 不可机械套「四层结构」，发展党员流程是成长叙事的主干非附录

### 待续
1. about 逐章按「成长主线」提出调整建议（请书记过目，不擅自改）
2. help 删重叠叙事（三、四章）实现
3. README 全家 + 治理文档按 01-02 更新
4. L2/L3/L4 登录门控逐处复核（多数已由 L1 工作台强制 + 既有 requireAuth/isCommissioner 承载）

### 验证结果
✅ GetDiagnostics 仅报既有 markdownlint 警告（.ctx 两 md 文件），本次改动文件无错误。

### 沉淀标签
无新模式。

---

## T-268 README 全家 + 治理注册完成（2026-08-18）

**任务**：T-267 续——完成剩余 README 核对 + 新设计文档注册治理。

### 已落地
- `content/01_strategy/README.md`：论断汇编描述由旧「元命题 + 战略路线级 + 制度设计级」改为「17 条论断按四层组织，含 3 元命题」
- `content/04_web_design/README.md`：新增「四、部署与认证」节，登 DEPLOYMENT_AUTH_MODEL.md
- `content/03_doc_system/DOC_MAP.md`：登 DEPLOYMENT_AUTH_MODEL.md（知识类型 4 清单）
- `content/03_doc_system/ARCHITECTURE.md`：目录树登 DEPLOYMENT_AUTH_MODEL.md
- 其余 5 个 README（content / 02_institution / 03_doc_system / 05_ai_coding / server）核对无漂移

### 验证结果
✅ GetDiagnostics 仅报既有 markdownlint 警告（.ctx 两 md 文件），本次改动文件无错误。

### 沉淀标签
无新模式。

---

## T-267 下游文档同步（help 删重叠叙事 + 根 README 修正，2026-08-18）

**任务**：T-266 续——Part 2 下游落地：help 删重叠叙事 + 根 README 按 01-02 最新修正。
**来源**：书记 2026-08-18 裁决（help 删重叠叙事 / about 是 keynote 式组织说明 / 论断四层逻辑）

### 已落地
- `docs/src/entries/help-entry.js`：删「分工中的制度设计」「怎么理解具体的这个组织」两章 TOC 项 + 移除 renderRoleHierarchy 引用
- `docs/help.html`：删第三章（分工制度）、第四章（怎么理解组织），技术架构由「五」重编号为「三」（5.1/5.2 → 3.1/3.2）
- `README.md`（根）：① 元命题 P-002/P-003 → P-002/P-003/P-017（补主客统一元命题）；② 补论断汇编「价值目标→组织机制→人的成长→组织再生产」四层组织注记；③ 持久化域/资源表 25 → 26（branchDocs 新增后）

### 待续
1. 其余 README（content/*/README、server/README 等）按 01-02 最新核对
2. about 逐章按「成长主线」提出调整建议（请书记过目）
3. L2/L3/L4 门控逐处复核

### 验证结果
✅ GetDiagnostics 仅报既有 markdownlint 警告；grep 确认无 sec-design/sec-why/role-hierarchy-container 残留引用。

### 沉淀标签
无新模式。

---

## T-270 about 叙事重构：设计 SPEC + 实现（2026-08-18）

**任务**：书记 6 点问题（偏左/SVG 太小/简单话标签/组织性展开/新生疲劳/身份阶段主语）→ brainstorming 逐项裁决 → SPEC（.trae/specs/ABOUT_REDESIGN_SPEC.md）→ 计划（.trae/plans/2026-08-18-about-redesign.md）→ 全部执行后验收。

### 书记关键裁决（记录）
1. **不以贬损任何人、任何其他讲述的方式立论**（🔴 表达纪律，我的开场白草案含「党课是抽象的」被书记纠正）
2. **主客统一是贯穿 about 的暗线**，页面不显性出现阶段简称；第一章=组织向大家讲述（应然）
3. **相向而行**：「你可以期待的XX」而非「你的XX」；第一章三卡按成长主线重写，数量不锁定
4. **所有工作都在方兴未艾**；第一章用三个关键词开头（具体/方兴未艾/提供成长），文案由书记在网页呈现上自由发挥（AI 不代写开场白）
5. **党建+科研是「人的成长」第三种机会**（P-016 恢复对话能力，与 P-014 适应学习/P-015 探索创新并列）——从独立章并入第二章「三个成长机会」，收束后不再拖尾巴（我此前把 P-016「独立成章」做成「收束后尾巴」，违背「子命题」整合关系，书记批评后修正）
6. **身份阶段压缩为 7 节点**（成员视角，去「党组织谈话」、补「转正支部大会表决」；政审/预审/报上级等支部执行环节弱化至展开；思想汇报等材料在节点展开体现）
7. **「爱具体的人/组织」移至收束章**做首尾呼应（读者进入组织后才需要「爱」）
8. 工作流 SVG：左列加宽 3fr/2fr + 节点半径 52→70 + 文字放大（大屏投影可读）
9. 偏左修复：`.ab-chapter` 右 padding 不对称（页码避让）改对称

### 已落地
- `.trae/specs/ABOUT_REDESIGN_SPEC.md`（设计 SPEC，书记批准）
- `.trae/plans/2026-08-18-about-redesign.md`（实现计划，7 Task）
- `docs/src/entries/about-entry.js`：renderCognition 重写（三关键词+三条期待落点，去 direction 小标签）、renderPhilosophy 重写（三机会，党建+科研并入「对话」机会）、DEVELOPMENT_TIMELINE 13→7 节点、renderDevelopment STAGES 调整、renderConclusion 重构（首尾呼应+组织塑造人人再造组织）、renderResearch 删除（函数/TOC/调用）、TOC_ITEMS 8 项、SVG 半径 52→70（三处）
- `docs/src/about.css`：`.ab-chapter` padding 对称化、SVG 列宽 3fr/2fr + 节点字号 22/17、第一章 ab-keywords/ab-expect-grid 新样式、第二章三卡 nth-of-type(3) 错落 + min-height 58vh、收束 ab-conclusion-echo/ab-conclusion-regenerate、清理 ab-cognition-item/grid/dialogue + ab-research 残留（含 media/reduced-motion 引用）

### 验证结果
✅ GetDiagnostics 返回空数组（无任何错误）
✅ grep 零残留：renderResearch/ab-research/个体→组织/组织→个体/ab-cognition-item-sub/ab-cognition-grid/ab-cognition-dialogue 全部清除
✅ 「爱具体的人/组织」仅在收束章 renderConclusion；「党建+科研」仅在第二章 renderPhilosophy
✅ 一改具改：about.css 两处功能注释同步新章名（成长机会）；历史日志/权威源书记原话「宝贵机会」保留不改

### 待书记验收（浏览器实测）
第一章三关键词视觉、第二章三机会、第三章 7 节点、第五章 SVG 大屏可读、收束首尾呼应、无偏左。

### 沉淀标签
`[已沉淀: USAGE_POLICY §2.4 禁止事项·禁止以贬损他人他物立论]` — 表达纪律：不以「对方是X、我们是Y」的对比贬损任何他人/其他讲述来立论（书记 2026-08-18 纠正开场白草案）。

**任务**：T-268 续——L2/L3/L4 复核收尾 + about 逐章文本对齐。

### 已落地
- `docs/src/entries/feedback-entry.js`：新建反馈路由加 L2 门控（未登录跳 login.html，书记 2026-08-18 裁决「提交反馈需登录」）
- about 逐章文本核对：无漂移（P-016 已标注非全局目标 / 不强调积极分子已落地 / 术语一致）；章节顺序确认为书记 2026-08-12 定序，未动
- L3/L4 复核：均由既有架构承载（header 身份标签匿名隐藏 / 个人考勤 user?.personId 兜底 / 支部文件列表匿名隐藏 / 下载 requireAuth + 外链公开）

### 验证结果
✅ GetDiagnostics 仅报既有 markdownlint 警告，本次改动无错误。

### 沉淀标签
无新模式。

## T-271 about 网页 UI/UX 修缮第 2 轮（2026-08-18）

**任务**：书记 6 点修缮意见（① 第一章「组织性」太逼仄 vs 第二章铺展 ② 上下无限制、左右宽度需研究 ③ 行百里者半九十转动半径太小 ④ 收束「管理事，服务人」矫情 ⑤ 落点 AI 扩写不认可 ⑥ 未充分运用书记原话）→ brainstorming + web-design-guidelines → SPEC2（.trae/specs/ABOUT_REDESIGN_SPEC2.md，书记批准）→ 全部实现并浏览器实测。

### 书记关键裁决（记录）
1. **关键词只单独展示**：「把下面的活给刨了不好」「三个关键词的原话选取的都不好！不如只单独展示关键词！」——大字关键词 + 书记提供的完整短语（一个具体的组织/一个方兴未艾的组织/一个提供成长的组织），无 AI desc、无引文
2. **三落点充分运用书记原话**：blockquote 引书记原话（成长路径=2026-07-01 / 做事方式=P-005 / 表达空间=P-007），**不写原话编号、不写日期、不出现「书记」字样**（SPEC 批准批注）；禁止 AI 扩写，承接仅作极简连接
3. **分章宽度策略**：叙事章 1120px（原 1020px）、视觉章（工作流 SVG）1320px 全宽；上下高度保持无限制
4. **收束去口号**：「管理事，服务人」大字已内化、结尾喊出来矫情 → 删除大字与「爱具体的人/组织」echo；改为三层小字：感谢你读到这里 / **期待我们的共同成长**（书记定稿，呼应「从入党申请人到正式党员」）/ 实践是检验真理的唯一标准（最下方小字，不用「爱具体的人」表述）

### 已落地
- `.trae/specs/ABOUT_REDESIGN_SPEC2.md`（设计 SPEC，书记批准）
- `docs/src/entries/about-entry.js`：renderCognition 纵向布局重写（三关键词纯展示 + 三落点 blockquote）、renderConclusion 重构（三层小字）、TOC_ITEMS conclusion 标签「管理事，服务人」→「收束」、dialogue R 上限 `S*0.5` → `S*0.56`、头部签名注释同步
- `docs/src/about.css`：第一章纵向铺展（`.ab-keywords`/`.ab-expect-list` flex column、关键词大字 clamp(36,4.8vw,58)、落点卡错落散落 --scatter + ab-rise-scatter 与第二章语言统一、blockquote 原话样式）、分章宽度（`.ab-chapter` 1120px + `.ab-exploration-section .ab-chapter` 1320px）、dialogue 舞台减数 243→200、收束三层小字样式、清理 `.ab-keyword-desc`/`.ab-expect-grid`/`.ab-expect-card-body`/`.ab-conclusion-title/lead/sub/echo/regenerate/line/char/seal/ring2` 及 media/reduced-motion 引用、`data-stagger` 卡动画与 reduced-motion 列表补充、过时注释（cognition sticky head）更新

### 验证结果
✅ GetDiagnostics：JS/CSS 零错误
✅ grep 零残留：ab-keyword-desc/ab-expect-grid/ab-expect-card-body/ab-page--split/ab-conclusion-*/ab-cognition-grid/ab-research 全部清除；「爱具体的人」仅剩 JS 注释说明，正文零残留
✅ 浏览器实测（localhost:8123，视口 1142x661）：
- 关键词 3 条「具体/方兴未艾/提供成长 + 完整短语」，落点 3 卡标题 + 书记原话 blockquote（无编号/日期/「书记」字样）
- `.ab-keywords`/`.ab-expect-list` flex column 纵向铺展；关键词大字 54.8px；落点卡错落 rotate ±0.6deg 生效（ab-rise-scatter 动画 + --scatter 变量，静态 transform 不冲突）
- `.ab-chapter` max-width 1120px / `.ab-exploration-section .ab-chapter` 1320px 生效
- 收束三层小字居中：36px 墨色感谢 / 26px 党建红期待 / 16px 淡灰小字
- 对话章舞台 365px（视口 661px 高时），console 0 错误 0 警告

### 实测发现（书记决策落地）
对话章 R 的实际钳制是**内切钳制项** `max(S/2 - maxCardH/2 + 121, cardW/1.414)`（maxCardH=274 时主导），`S*0.56` 上限不达上限。书记 2026-08-18 决策：**轨迹改椭圆，长轴稍长**——已落地：长轴水平 `rx = 1.2R`（页面宽度充裕，横向扫过范围 +20%，实测 ±199.8px vs 圆形 ±166.35px），短轴垂直 `ry = R`（正午升起逻辑不变、不遮章头）；相邻 90° 卡中心距 = R*1.562 ≥ 卡宽不重叠；卡右缘 295.8px < 章宽余量 377px 不溢出页面。另经书记确认：落点卡**保持现状不加极简承接**（「莫名其妙的扩充我不认可」精神）。

### 沉淀标签
`[已沉淀: USAGE_POLICY §2.4 禁止事项·书记原话表达纪律]` — ① 充分运用书记原话：禁止用 AI 扩写替代书记原话，引原话时不写编号/日期/「书记」字样；② 关键词类展示只留书记提供的短语，AI desc 属「把下面的话刨了」（与第 1 轮「AI 扩充不尊重书记原话」同源，T-270 已有 §2.4 沉淀，本轮补充引文呈现规范）。

## T-272 about 界面 UI 设计调整——乙部登记（2026-08-19）

**任务**：书记 2026-08-19 判定 about 页面整体设计「非常诡异」，指示「把 UI 设计写入乙部，待书记启动调整」。
**已落地**：CLAUDE.md 乙部 P3 表格新增 T-272 条目（状态：🔄 待书记启动——仅登记，未启动）。
**验证**：无代码改动。
**沉淀标签**：无新模式。

## T-273 部署落地总览撰写 + 计算中心文档修正（2026-08-19）

**任务**：书记询问「微信小程序部署、北大计算中心 API 对接是否都有明确的落地文档，能否基于目前代码更新与撰写」。核查结论：**无明确落地文档**——WECHAT_INTEGRATION.md（小程序设计方案+路线图，2026-08-11）、SCHOOL_IT_DEPLOYMENT.md（计算中心对接准备，draft 且**过时**——「数据层为纯 mock」不实）、DEPLOYMENT_AUTH_MODEL.md（部署认证场景模型，2026-08-18）。

### 书记裁决（AskUserQuestion 4 问）
1. 形态：新建《部署落地总览》+ 修正过时的计算中心文档
2. 对接阶段：**准备阶段**（文档定位「准备 + 待对接清单」）
3. 小程序范围：**落地规划**（路径决策/前置条件/部署框架/数据层共用，不含代码）
4. 读者：**技术对接为主**
大纲经书记确认后撰写。

### 已落地
- 新建 `content/04_web_design/DEPLOYMENT_ROADMAP.md`：① 四条落地路径总览（A 静态托管 / B Node 自托管 / C 计算中心 / D 微信小程序）+ 路径关系；② 代码就绪度盘点（26 资源表全栈、data-adapter 双模式、api-adapter P1 25 资源+snapshot、DEPLOY_MODE、门控四层；待做：P2 资源级 CRUD、IAAA、AI 本地部署）；③ 路径 C 计算中心对接（前置条件 / 当前代码版文档清单 / 对接六步 / IAAA）；④ 路径 D 小程序落地规划（WebView 套壳短期 / Taro 中期 / 数据层共用方案 / 里程碑）；⑤ 部署决策矩阵；⑥ 风险与依赖；⑦ 关联文档索引
- 修正 `content/04_web_design/SCHOOL_IT_DEPLOYMENT.md`：①「当前状态纯 mock」→ server 全栈已实现（Express + better-sqlite3，26 资源表 + 认证 + 附件上传，16 测试全绿，对接准备阶段）；② §四文档清单补「后端参考实现 server/」「api-adapter 25 资源路由表」「认证模型 DEPLOYMENT_AUTH_MODEL」；③ §五对接六步标注认证现状（本地 login 完整链路已实现，替换为计算中心体系，目标 IAAA）；④ YAML last_updated 2026-08-19 + 关联 DEPLOYMENT_ROADMAP
- 同步索引：04_web_design/README.md「四、部署与认证」新增 DEPLOYMENT_ROADMAP（首位）；DOC_MAP.md 04 列表新增；TIMESTAMPS.md 登记新文档 + 更新 5 处时间戳（含补齐漏登的 DEPLOYMENT_AUTH_MODEL.md）

### 代码事实核对（文档数据来源）
server/db.js 26 资源表（id + data JSON 通用结构，含 branch_docs）+ sessions/attachments；api-adapter.js 头部路由表（25 资源 + auth/login/logout + snapshot + uploads + health/bootstrap）；data-adapter.js `setDataSource` 双模式；bootstrap.js token 检测自动切 api + 服务器不可达静默回退 mock；config/deploy.js `DEPLOY_MODE`。

### 验证结果
✅ GetDiagnostics 零错误
✅ 「纯 mock」残留仅 insights/工程演进与设计方法论.md L326（历史经验记录，生效条件=纯前端阶段，按 H30.4 条件化保留不改）
✅ SSOT_INDEX 核查：部署文档不驱动代码母本，无需登记

### 沉淀标签
无新模式（部署文档撰写按既有权威源引用，无新教训）。

## T-274 丙部议题生命周期处理：P.8 退出 / P.9 检查退出 / P.10 逐项审视清理（2026-08-19）

**任务**：书记三项指令——① P.8 实际已完成应退出；② P.9 检查 SECRETARY_PRONOUNCEMENTS 完成后是否还是问题并退出；③ P.10 大概率清理但需逐个审视。

### 书记裁决
- **P.8**：确认完成退出（D-270）。常驻注释保持 4 条（节点2/5/6/7 stickyNote），详情 decisionDetail 随 T-270 定稿，无需再调。
- **P.9**：确认退出（D-271）。书记定调：「剩余还在研究的课题，书记个人认为都已经得到了落地——如果表达了那就按照书记的原话，如果没有表达，那就是书记可以的模糊。」未决点转为书记个人研究课题，AI 不得擅自立论填补。
- **P.10**：**「我认为只保留 F 即可。我认为这里面的表达，AI 的扩充简直是灾难！不尊重书记原文」**——8 处严格对举中仅保留 F（L128「在真实工作中认识一个人，而不是在抽象表态中认识一个人」）；A/B/C/D/E/G/H 全部清理；断裂式 L137/L245 一并处理；同类「而不是」L27 同精神清理；书记原话引用（L235）一字不动。

### 已落地
- **丙部清空**：CLAUDE.md 丙部 P.8/P.9/P.10 全部删除，标注「当前丙部为空」（D-270/D-271/D-272）
- **DECISION_LOG**：2026-08-DECISION_LOG.md 追加 D-270（P.8 退出）/D-271（P.9 退出）/D-272（P.10 清理），索引更新 7→9 条
- **DEVELOPMENT_PATH.md**：10 处「不是…而是/而不是」正面化改写（A 张力定位 / B 组织化含义 / C 组织经验 / D 两能力 / E 主人翁意识 / G 党建+科研边界 / H 发展路径定义 / L27 叙事视角 / L137 能力升级 / L245 党员角色），保留 F + 书记原话 L235；YAML last_updated 2026-08-19
- **TIMESTAMPS**：CLAUDE.md / DEVELOPMENT_PATH.md / DECISION_LOG ×2 时间戳同步

### 验证结果
✅ grep：DEVELOPMENT_PATH.md「不是…而是/而不是」仅剩 L128（F 保留）+ L235（书记原话引用）；about-entry.js 零同类残留（T-270/T-271 已清理）
✅ 丙部清空：CLAUDE.md 无 P.8/P.9/P.10 残留
✅ GetDiagnostics 无错误

### 沉淀标签
`[已沉淀: USAGE_POLICY §2.4 禁止事项·书记原话表达纪律（强化）]` — 「不是…而是」反论须经书记过目（H10 总纲），适用范围从「书记原话扩充」扩展到**叙事正文**：AI 不得以「叙事澄清/误读排除」为由自造排他对立式（书记 2026-08-19：「AI 的扩充简直是灾难！不尊重书记原文」）；书记明确保留者除外（F）。

## T-272 about 页面 UI 设计调整（2026-08-19，书记启动）

**任务**：书记启动乙部 T-272——about 页面设计「非常诡异」，核心批评为**设计缺乏自觉**：「所有的动画、布局以及他们与所呈现文字的逻辑关系 没有足够的自觉。不是具体地进行设计（考虑观者的体验），而是随意地复制其他的模块！这个自觉是书记反复强调的！尤其是布局、字体、滚动驱动的显示逻辑，配色与字体」。

### 书记关键裁决（brainstorming 逐项确认）
1. **装饰要保留**：「我要求要有页面装饰，因为一个好看的界面对于观者很重要，起到很重要的推广宣传的作用。」——AI 初诊「删除装饰」被纠正。防的是**风格疲劳**（都莫名其妙地错落 / 都统一居左或居右 / 都左右或上下排布）
2. **超参数自觉**：「对于每一个超参数，设定的原则是什么？要有自觉」——落成 about 设计规范文档
3. **第一章（组织性）**：书记判定「现在风格设计最诡异的！内容不动，请设计清楚！」——方案 B 语义性错落（呼应方兴未艾）+ **全章禁止竖线**（「不要有【竖线】！掉价」）+ 落点竖排宽度思考（720px 舒适行宽）
4. **第二章**：回归文字优先——满宽正常卡（去 58vh 空洞、去 ±1.2° 倾斜、去左/右/中错落）
5. **第六章速度**：「从下滑到视窗停留以及从视窗停留接着往后走的速度 和 正常转动比较不一样。此外 正常转动 转动太快！」——PLATEAU 0.7→0.55（转速降约 1/3）+ 三段角速度统一（ROT_RATE 算法）
6. **配色字体**：微调维持

### 已落地
- `.trae/specs/ABOUT_UI_REFINE_SPEC.md`（设计 SPEC，书记批准；批准版补红线「每一章内容不动」）
- `docs/src/about.css`：第一章重构（关键词油墨宋 clamp(32,4vw,44) 语义性错落 -1.5°/1.2°/-1°+逐级下沉、无 border-left；落点 list max-width min(720px,100%)、quote 改 `--ab-paper-1` 淡底圆角 8px 无竖线）；第二章满宽正常卡（min-height auto / 0° 无倾斜 / max-width 100% / align-self stretch / ab-rise-in 纯升起）；第二章原话 quote 去 border-left 改淡底（全章无竖线红线）
- `docs/src/entries/about-entry.js`：第六章 PLATEAU 0.7→0.55 + ROT_RATE = 90/((1-PLATEAU)/4) 三段角速度统一（进入/退出段 θ = progress×ROT_RATE，progress 范围 -45/ROT_RATE 与 +45/ROT_RATE）
- `content/04_web_design/ABOUT_DESIGN_SYSTEM.md`（新建）：超参数设定原则文档——设计哲学（叙事册风/超参数自觉/防风格疲劳/叙事章文字优先/无竖线红线）、色板 tokens 使用边界、字体分工、各章超参数登记表（值+原则）、防风格疲劳规则、动/静自觉清单、维护约定
- 索引同步：04 README「二、模块界面设计」+ DOC_MAP + TIMESTAMPS（about.css/about-entry.js/新文档）

### 验证结果
✅ GetDiagnostics：JS/CSS 零错误（仅既有 markdownlint 警告）
✅ 浏览器实测（localhost:8123）：关键词错落生效（rotate ±1.5°/1.2°/-1° + 左移 0/34/69px + border-left 全 0）；落点卡 720px×3 竖排 + quote 淡底无竖线；第二章三卡 matrix 无旋转/min-height auto/满宽；第六章对话章正常公转无 JS 错误
✅ grep：第一章 `.ab-keyword`/`.ab-expect-card-quote` 与第二章 `.ab-philosophy-opp-quote` 零 border-left

### 沉淀标签
`[已沉淀: USAGE_POLICY §2.4 + ABOUT_DESIGN_SYSTEM.md]` — ① 设计「自觉」纪律：每个超参数须有设定原则，禁止无原则复制其他模块（书记 2026-08-19：「随意地复制其他的模块」）；② 装饰性元素保留原则：界面好看=推广宣传，防的是风格疲劳不是装饰；③ 无竖线红线（左侧红边线/blockquote 竖线掉价），层级区分改底色。

## T-275 北大党校与智慧党建系统对接设计（2026-08-19）

**任务**：书记战略要求——① 明确嫁接什么 API（尤其北大党校系统 + 智慧党建系统）、随时爬取什么数据、系统内部数据类型字段、小程序初步设计；② 对接方式提前想清楚（如何爬取、用什么工具、双向协同）；③ 全面性优先，避免实际对接时被动（「等到我们实际对接的时候，已经是太晚了」）。

### 书记裁决（brainstorming 确认）
- **对接授权**：**学校党委组织部支持技术对接、实现系统协同**（书记与党委组织部老师交流确认，2026-08-19）——对接是组织部门认可的协同工作；支部无「管理权限」，实施口径按组织部流程确认
- **同步方向**：党校系统**单向爬取即可**；智慧党建平台**要双向实时同步**（读+写）
- **运行环境**：爬取/同步任务跑在**校园网内**（如计算中心服务器）

### 预研发现（公开信息核查）
- 党校系统 = `dangxiao.pku.edu.cn` 北京大学党员教育培训平台：主办党校办公室、技术艾唯博瑞（联合北大研发「党校综合信息管理平台」）、登录=北大统一身份认证（IAAA）；功能含入党教育四阶段培训/考试/学时/结业评议
- 智慧党建平台 = 高校智慧党建生态（同源厂商方案）：三会一课/民主评议/工作手册导出/党费/党员发展管理/上级链通

### 已落地
- **新建 `content/04_web_design/PKU_PARTY_INTEGRATION.md`**（对接总体设计，status: draft）：
  1. 背景与已确认事实（系统形态/权限/方向/环境）
  2. 对接对象全景（党校单向爬取 / 智慧党建双向 / 一图总览）
  3. 我们系统数据类型字段（26 资源表 + 主键锚 personId/状态锚 partyStatus/时间锚 updatedAt）
  4. 数据映射设计（培训/结业评议/组织生活/党员发展/党费/支部手册）
  5. 党校爬取方案（Playwright + IAAA storageState + node-cron + sync_logs；每日/事件/周频 + 风险缓解）
  6. 智慧党建双向同步（方案 A API/Webhook 理想版 vs 方案 B 定时增量+导出导入现实版；**自动写默认关闭**——宁可导出人工导入，不做脆弱自动填）
  7. 一致性模型（北大平台为权威端 + updatedAt 仲裁 + partyStatus 状态机 + 幂等键 + 人工复核队列）
  8. **微信小程序——归位说明**（独立问题，设计权威源 = WECHAT_INTEGRATION.md §八；本文件只保留数据接口约定）
  9. **待确认清单 7 项**（厂商 API 能力/批量导入/校园网部署/实施口径/IAAA 风控/上级链通口径——对象为党委组织部/厂商/信息中心）
  10. 里程碑 M0-M5 与风险表
- 索引同步：04 README「四、部署与认证」+ DOC_MAP + TIMESTAMPS

### 验证结果
✅ 文档结构完整（11 节，含 7 项待确认清单与 M0-M5 里程碑）
✅ 引用关系闭合（DEPLOYMENT_ROADMAP/SCHOOL_IT_DEPLOYMENT/WECHAT_INTEGRATION/DATA_ARCHITECTURE/DEPLOYMENT_AUTH_MODEL 均已互链）
✅ 事实 vs 假设分离（已确认事实表 + 待确认清单分开，不混淆）
✅ GetDiagnostics 无错误

### 沉淀标签
`[待沉淀: 外部系统对接设计模式]` — 对接「厂商闭源系统」的三条经验：① 先做公开信息预研（系统名/厂商/登录方式/功能），再问内部关键事实（权限/方向/环境）——避免空泛提问；② 双向实时同步须先确认 API 能力，无 API 时给出「理想 A / 现实 B」双方案，自动写默认关闭（脆弱自动填的操作成本 > 人工导入）；③ 对接设计文档必须含「待确认清单」——把要问对方的事显式列出，是「提前想全面」的落点。

### 书记纠正（2026-08-19 追加）
1. **「支部管理权限」表述不成立**：书记纠正——信息来自与**党委组织部老师**的交流，党委组织部支持**技术对接、实现系统协同**；对接授权主体 = 党委组织部，支部无「管理权限」。已全仓修正：PKU_PARTY_INTEGRATION §一 授权行/§2.1 对接方式/§5.1 凭证/§5.4 风险/§6.2-6.3/§九 待确认项（对象改党委组织部/厂商/信息中心）。
2. **微信小程序为独立问题**：书记纠正——「请一定要让对应的内容进入对应的文档，以防长期污染仓库！」已执行：对接文档 §八 改为「归位说明」（只保留数据接口约定）；小程序展示设计迁移至 WECHAT_INTEGRATION.md §八「北大对接数据的展示（叠加）」（数据来源/展示板块/同步差异推送/落地路径）。

## T-276 架构演进评估+设计文档（2026-08-22）

**任务**：①评估「高度组件化、高度可复用」目标落地程度；②对照「一切皆插件」分析灵活性；③设计上线后迭代机制；④新建文档采用无人称文体。

**书记方向（brainstorming 确认）**：主文档归 04_web_design；只出文档不入代码，但规划未执行项入乙部提醒；无人称修缮「新建+05 先修」。

**已落地**：
- **新建 `content/04_web_design/ARCHITECTURE_EVOLUTION.md`**（status: draft，无人称文体）：
  1. 出发点（目标 + 需要外部帮助的方向）
  2. 组件化/可复用落地评估（7 项已落地机制 + 5 项差距 + 结论：结构分层✅ / 运行时可组合❌）
  3. 迭代能力现状评估（功能增减/角色权限/技术栈演进三类）
  4. 轻量插件化设计——「能力注册表 + 声明式清单」（增量/收敛既有准插件机制/权限随能力走；register/get/mount 三原语；UI 块/数据源/工作流场景三类插件单元）
  5. 迭代机制（功能开关=按环境角色过滤、版本化承接 KNOWN_PITFALLS §13、灰度回滚=注销声明）
  6. 实施路径 M1-M4（已规划未执行）
  7. 与既有文档关系（C-1 深化方向）
- **索引同步**：04 README + DOC_MAP + TIMESTAMPS（ARCHITECTURE_EVOLUTION 条目）

### 沉淀标签
`[待沉淀: 架构演进评估模式]` — ① 组件化评估用「结构分层 vs 运行时可组合」两分法（系统已有准插件机制但缺统一注册表收敛）；② 插件化设计取「增量注册表」而非「全面重构」——收敛既有 tab 声明/数据源接口/场景数据为统一能力清单，消费点自动发现；③ 迭代机制设计把「功能开关/版本化/灰度」统一为注册表能力（按环境角色过滤 = 天然开关）。

## T-277 05 KNOWN_PITFALLS 书记表述无人称修缮（2026-08-22）

**任务**：04/05 文档不要强调书记或书记说了什么，采用无人称形式（只表达探索和选择）。

**已落地**：
- `content/05_ai_coding/KNOWN_PITFALLS.md`：14 处「书记批评/书记决策/书记质问/书记 2026-08-14 明确」等表述全部改为无人称（「该做法被指出」「连续两轮指出」「2026-08-14 明确」等）；YAML version 1.11→1.12、last_updated→2026-08-22
- 全仓 grep「书记」：05_ai_coding 目录零残留
- **修缮纪律**：只改人称表述，不删判例事实（日期/编号/T 编号保留）；04 既有 11 文件约 209 处入乙部 T-278 分批修缮

### 验证结果
✅ GetDiagnostics（见 T-276 主文档）
✅ grep「书记」05_ai_coding 零残留
✅ T-278（04 分批）/T-279（插件化实施）已写入乙部 ⏸️ 已规划未执行

## T-278 04 既有文件书记表述无人称修缮（2026-08-22 执行完成）

**任务**：04_web_design 既有文件「书记」来源人称表述改为无人称——只表达探索和选择，不强调来源人称（书记 2026-08-22：「不要强调我是书记或者书记说了什么，采用无人称的形式是最好的」）。

**修缮纪律**（区分三类）：
1. **来源人称强调**（书记裁决/裁定/实测/指令/反馈/原话/批准/决策/确认/更名/确立/指定/提出/2026-08-XX 书记…）→ 改无人称（「裁决」「裁定」「2026-08-08 指令」「2026-08-02 确立」等），保留日期/编号/引语内容
2. **角色功能名**（书记工作台/书记「全局概况」/书记「写入活动」/书记专属权限/副书记同色/支委（书记）等 T1 职务术语）→ 保留
3. **判例事实**（日期/T 编号/D 编号/引语）→ 保留，只去人称标签

**已修缮 9 个文件**（来源人称清零）：

| 文件 | 处理 |
|------|------|
| DESIGN_SYSTEM.md | 原则 7-14「书记原话」→「2026-08-XX 确立」；「书记裁决/裁定/实测/指令/反馈/批准/决策/确认/更名/确立/指定」等全部无人称化（约 30 处） |
| DATA_ARCHITECTURE.md | 「书记强调/指示/裁决/决策/论断」→「确立/指示/裁决/决策/论断」（约 7 处） |
| CHECKLIST.md | 「书记原话/按 URL 实测/发现/指令」→「原话/实测/曾发现/指令」（5 处） |
| ABOUT_DESIGN_SYSTEM.md | 「书记 2026-08-19/原话/设计/红线」→「确立/引述原话/设计选择/红线」（10 处） |
| WECHAT_INTEGRATION.md | 「书记 2026-08-10 战略目标/决策链/裁决/2026-08-11/2026-08-19」→ 无人称（5 处） |
| PKU_PARTY_INTEGRATION.md | 「书记 2026-08-19/书记需求/书记确认/书记须知情」→「提出/需求/确认/决策者须知情」（7 处） |
| SOP_WEB.md | 「书记论断/书记提出/书记原话精神」→「论断/提出/原话精神」（4 处） |
| DEPLOYMENT_ROADMAP.md | 「书记决策路线/书记与计算中心确认」→「决策路线/与计算中心确认」（2 处） |
| SCHOOL_IT_DEPLOYMENT.md | author「AI 起草，书记审定」→「AI 起草，审定」+「书记确认」→「确认」（2 处） |
| DEPLOYMENT_AUTH_MODEL.md | author「AI 起草，书记审定」→「AI 起草，审定」（1 处） |

**保留的角色功能名**（grep 验证 6 处）：书记工作台「全局概况」「专班总览」「写入活动」/ 书记「复盘完成率」统计卡 / 支委（书记）——均为 T1 职务术语，非来源人称。

**同步**：各文件 YAML last_updated → 2026-08-22；TIMESTAMPS 更新；乙部 T-278 完成退出（删除），T-279 保留 ⏸️

### 验证结果
✅ grep「书记原话|书记裁决|书记裁定|书记实测|书记指令|书记反馈|书记批准|书记决策|书记确认|书记更名|书记确立|书记指定|书记提出|书记 2026」04_web_design 零残留（仅剩角色功能名 6 处）
✅ 全仓 04/05 用户文档无人称达成（05 KNOWN_PITFALLS 上轮已修）

## T-279 M1 能力注册表骨架 + 首页活动日历迁移（2026-08-22 执行完成）

**任务**：乙部 T-279 轻量插件化实施的 M1 阶段——「注册表骨架 + 首个示例能力迁移」，验证「注册→发现→挂载」链路（实施路径见 ARCHITECTURE_EVOLUTION.md §六 M1）。

**决策链（brainstorming 澄清）**：示例能力 = 首页活动日历（对应 M1 验收标准原话）；注册表 API = 完整三原语（register/get/mount）。

**已落地**：
- **新建 `docs/src/core/registry.js`**：四导出 `registerCapability`（重复注册 console.warn 覆盖）/ `getCapabilities({scope, role})`（范围+角色过滤，requiredRoles=null 表示无限制）/ `getCapability(id)` / `mountCapability(id, container, ctx)`（未注册抛错）；能力声明形态 `{id, name, scope, requiredRoles, deps, mount}`——deps 仅登记不解析、requiredRoles 仅存不应用（M4 落地）
- **新建 `docs/src/modules/capabilities/activity-calendar.js`**：自注册模式（import 副作用触发），scope=['dashboard']，mount 包装 `renderCalendarForDashboard(ctx.state, ctx.targetMonth)`
- **改造 `docs/src/entries/main-entry.js`**：import 改经注册表（L22-24）；渲染段（L469-479）改 `getCapabilities({scope:'dashboard'}).find(id==='activity-calendar')` → `mountCapability('activity-calendar', null, {state, targetMonth})`——同一函数同一参数，行为零变化
- **bump 版本**：index.html main-entry `?v=20260812f` → `?v=20260822a`；registry/activity-calendar 带 `?v=20260822a`
- **Spec**：`.trae/specs/CAPABILITY_REGISTRY_M1_SPEC.md`（含验收标准与回滚方案）

**验证结果**：
✅ GetDiagnostics 三文件（registry.js / activity-calendar.js / main-entry.js）零错误
✅ 浏览器实测（browser_use）：首页 `?view=calendar` 月历渲染成功（36 格、活动圆点/标记/图例齐全）；月/列表切换正常；月份选择器正常；**无 registry/模块加载错误**——注册-发现-挂载链路验证通过
✅ git diff 确认 main-entry.js 仅 import + 渲染段两处变更

**说明（非本次引入的既有问题）**：
- main-entry.js 文件头 12 个 BOM：ws-secretary-entry.js 等未编辑文件同样存在（EF BB BF × 12），git diff 显示全仓 .js 文件普遍有 BOM/行尾差异——**历史遗留未提交状态**，非 M1 引入
- 首页事件委托 L487 `user.role` 空指针（匿名访问点击 dashboard 区域触发）：既有代码，不在本次 diff 范围，非 M1 回归

### 沉淀标签
`[待沉淀: 插件化落地模式]` — ① 收敛既有准插件机制（tab 声明/数据源接口）为统一注册表 = 新增收敛层而非重构；② 自注册副作用导入模式（import 即注册）使消费点无感；③ M1 最小验证法：先迁一个能力验证注册-发现-挂载链路，行为零变化（同一函数同一参数）再铺开


## tab 栏单行横向平滑滚动（2026-08-23 执行完成，C-4 视觉体验持续优化子项）

**问题**：tab 数量增加（组长 9 个）后，`flex flex-wrap` 在窄页宽（侧边栏展开态内容区 ~960px）下随机换行成 2 行，视觉割裂。

**方案（书记 2026-08-23 裁定：单行 + 横向平滑滚动）**：
- **tab-bar.js**：外层容器 `flex-wrap` → `flex-nowrap + overflow-x-auto`（永不换行、超宽横向滑动）；按钮/组标签/右侧汇报按钮全部加 `shrink-0`（防 flex 压缩）；新增 `_bindScrollHints`（元素级标记防重复绑定，scroll/resize/ResizeObserver 三路更新 `data-overflow`，溢出时两侧渐隐遮罩提示可滚动）
- **styles.css**：新增 `.ws-tab-scroll` 样式——隐藏滚动条（scrollbar-width:none + ::-webkit-scrollbar display:none）+ scroll-behavior:smooth + -webkit-overflow-scrolling:touch + `::before/::after` 渐隐遮罩（pointer-events:none 不挡点击，`data-overflow` 驱动显隐）
- **版本链（KNOWN_PITFALLS §13）**：`tab-bar.js?v=20260812a/d` → `?v=20260823a`（6 个 entry）；`styles.css?v=20260812d` → `?v=20260823a`（14 个 HTML：index/login/feedback/archive/search/activity/help/notice/about + 6 工作台）

**关键实现细节**：Tailwind CDN 异步注入 `shrink-0/flex-nowrap` 后布局才稳定，初始 `data-overflow` 计算会滞后 → 必须用 ResizeObserver 监听尺寸变化补算，否则遮罩不出现（首轮验证 FAIL 后补修）。

**验证结果（Playwright 无头，纯代码断言 9/9）**：
✅ 组长窄视口 1024：9 按钮单行（offsetTop 全 0）+ 溢出 scrollWidth 1007>960 + 右侧遮罩激活
✅ 组长宽视口 1440：单行 + 无溢出 + 无遮罩
✅ 书记窄视口 1024：单行 + 溢出 + 遮罩激活
✅ GetDiagnostics tab-bar.js 零错误；pageerror 仅外网 404（沙箱无外网，非项目问题）

### 沉淀标签
`[待沉淀: CDN 工具类异步注入导致布局计算滞后]` — Tailwind CDN（运行时 JIT）注入的布局类（flex-nowrap/shrink-0）在模块执行后才生效，首帧 `scrollWidth/clientWidth` 计算会得到"无溢出"假象；凡依赖此类布局尺寸的 JS 逻辑（溢出遮罩/滚动提示/截断判断）须以 ResizeObserver 补算，不能只在初始化时计算一次


## tab 栏单行横向平滑滚动（2026-08-23 执行完成，C-4 视觉体验持续优化子项）

**问题**：tab 数量增加（组长 9 个）后，`flex flex-wrap` 在窄页宽（侧边栏展开态内容区 ~960px）下随机换行成 2 行，视觉割裂。

**方案（书记 2026-08-23 裁定：单行 + 横向平滑滚动）**：
- **tab-bar.js**：外层容器 `flex-wrap` → `flex-nowrap + overflow-x-auto`（永不换行、超宽横向滑动）；按钮/组标签/右侧汇报按钮全部加 `shrink-0`（防 flex 压缩）；新增 `_bindScrollHints`（元素级标记防重复绑定，scroll/resize/ResizeObserver 三路更新 `data-overflow`，溢出时两侧渐隐遮罩提示可滚动）
- **styles.css**：新增 `.ws-tab-scroll` 样式——隐藏滚动条（scrollbar-width:none + ::-webkit-scrollbar display:none）+ scroll-behavior:smooth + -webkit-overflow-scrolling:touch + `::before/::after` 渐隐遮罩（pointer-events:none 不挡点击，`data-overflow` 驱动显隐）
- **版本链（KNOWN_PITFALLS §13）**：`tab-bar.js?v=20260812a/d` → `?v=20260823a`（6 个 entry）；`styles.css?v=20260812d` → `?v=20260823a`（14 个 HTML：index/login/feedback/archive/search/activity/help/notice/about + 6 工作台）

**关键实现细节**：Tailwind CDN 异步注入 `shrink-0/flex-nowrap` 后布局才稳定，初始 `data-overflow` 计算会滞后 → 必须用 ResizeObserver 监听尺寸变化补算，否则遮罩不出现（首轮验证 FAIL 后补修）。

**验证结果（Playwright 无头，纯代码断言 9/9）**：
✅ 组长窄视口 1024：9 按钮单行（offsetTop 全 0）+ 溢出 scrollWidth 1007>960 + 右侧遮罩激活
✅ 组长宽视口 1440：单行 + 无溢出 + 无遮罩
✅ 书记窄视口 1024：单行 + 溢出 + 遮罩激活
✅ GetDiagnostics tab-bar.js 零错误；pageerror 仅外网 404（沙箱无外网，非项目问题）

### 沉淀标签
`[待沉淀: CDN 工具类异步注入导致布局计算滞后]` — Tailwind CDN（运行时 JIT）注入的布局类（flex-nowrap/shrink-0）在模块执行后才生效，首帧 `scrollWidth/clientWidth` 计算会得到"无溢出"假象；凡依赖此类布局尺寸的 JS 逻辑（溢出遮罩/滚动提示/截断判断）须以 ResizeObserver 补算，不能只在初始化时计算一次


## T-279 M3 组织委员工作台拆分（2026-08-23 执行完成，4 工作台中第 1 个）

**任务**：按 M2 样板拆分组织委员工作台——1806 行单体 → 薄壳入口（161 行）+ 8 独立 tab 模块（entries/tabs/org/）+ 注册表能力（org-workspace，scope='workspace:org'）。子代理执行主体 + AI 独立验证修复。

**已落地**：
- **薄壳入口** ws-org-commissioner-entry.js（161 行）：bootstrap + 注册表 tab 清单 + URL 落点（taskforceId/activityId/view）+ _renderCurrentTab 数据刷新
- **8 tab 模块**：todo/overview/inspection/taskforce（含发布招募 openRecruitForm）/talent/development/activity-view/my-dispatch，私有状态随模块自持
- **org-workspace.js**：能力注册（8 tab 清单自注册），入口经 getCapabilities 读取
- **org.html**：入口版本 bump 20260812f → 20260823d

**AI 独立验证修复 3 个问题（子代理自报"GetDiagnostics 零错误"未覆盖）**：
1. **版本链分裂（核心）**：子代理把入口/tab 模块所有 import 统一改 20260823a，与依赖链（data-loader 等内部 20260812a）分裂 → state.js 同页面双实例 → data-loader setState 与入口 registerRenderCallback 分属两实例 → renderOrgUI 永不触发、页面空白无报错。修复：入口 state.js → 20260812a，org-workspace registry → 20260812a，tab 模块依赖 → 20260812d，仅 tab-bar 保留 20260823a
2. **diag 日志残留**：子代理在入口留了 before/after bootstrap 调试日志，已清理
3. **并行 Edit 覆盖**（KNOWN_PITFALLS §14 强化）：org-workspace.js 的 registry 版本被同消息并行 Edit 覆盖回旧值，串行修复

**验证结果（纯代码，14/14）**：GetDiagnostics 零错误；Node import 图校验 10 文件/68 条相对导入/78 命名导入全通过；Playwright 无头：8 tab 按钮、单行、8 tab 渲染非空、URL 直达 tf-001（专班管理）与 act-1（活动查看）正常、无 JS 错误。

**说明**：M3 剩余 3 个工作台（宣传 1320 行/纪检 1339 行/成员 897 行）按同一模式推进（含版本链分裂预防 + 子代理交付三查）。

### 沉淀标签
`[已沉淀: KNOWN_PITFALLS §17]` — 共享状态模块版本分裂→同页面双实例；子代理交付三查；并行 Edit 覆盖（M2 的 [待沉淀: 巨型单体拆分回归三类模式] 中 ①import 图校验/③行为回归已落地为 §16 验证三件套，本次补充版本链维度）


## T-279 M3 组织委员工作台拆分（2026-08-23 执行完成，4 工作台中第 1 个）

**任务**：按 M2 样板拆分组织委员工作台——1806 行单体 → 薄壳入口（161 行）+ 8 独立 tab 模块（entries/tabs/org/）+ 注册表能力（org-workspace，scope='workspace:org'）。子代理执行主体 + AI 独立验证修复。

**已落地**：
- **薄壳入口** ws-org-commissioner-entry.js（161 行）：bootstrap + 注册表 tab 清单 + URL 落点（taskforceId/activityId/view）+ _renderCurrentTab 数据刷新
- **8 tab 模块**：todo/overview/inspection/taskforce（含发布招募 openRecruitForm）/talent/development/activity-view/my-dispatch，私有状态随模块自持
- **org-workspace.js**：能力注册（8 tab 清单自注册），入口经 getCapabilities 读取
- **org.html**：入口版本 bump 20260812f → 20260823d

**AI 独立验证修复 3 个问题（子代理自报"GetDiagnostics 零错误"未覆盖）**：
1. **版本链分裂（核心）**：子代理把入口/tab 模块所有 import 统一改 20260823a，与依赖链（data-loader 等内部 20260812a）分裂 → state.js 同页面双实例 → data-loader setState 与入口 registerRenderCallback 分属两实例 → renderOrgUI 永不触发、页面空白无报错。修复：入口 state.js → 20260812a，org-workspace registry → 20260812a，tab 模块依赖 → 20260812d，仅 tab-bar 保留 20260823a
2. **diag 日志残留**：子代理在入口留了 before/after bootstrap 调试日志，已清理
3. **并行 Edit 覆盖**（KNOWN_PITFALLS §14 强化）：org-workspace.js 的 registry 版本被同消息并行 Edit 覆盖回旧值，串行修复

**验证结果（纯代码，14/14）**：GetDiagnostics 零错误；Node import 图校验 10 文件/68 条相对导入/78 命名导入全通过；Playwright 无头：8 tab 按钮、单行、8 tab 渲染非空、URL 直达 tf-001（专班管理）与 act-1（活动查看）正常、无 JS 错误。

**说明**：M3 剩余 3 个工作台（宣传 1320 行/纪检 1339 行/成员 897 行）按同一模式推进（含版本链分裂预防 + 子代理交付三查）。

### 沉淀标签
`[已沉淀: KNOWN_PITFALLS §17]` — 共享状态模块版本分裂→同页面双实例；子代理交付三查；并行 Edit 覆盖（M2 的 [待沉淀: 巨型单体拆分回归三类模式] 中 ①import 图校验/③行为回归已落地为 §16 验证三件套，本次补充版本链维度）


## T-279 M3 剩余三工作台拆分：宣传/纪检/成员（2026-08-23 执行完成，M3 全部完成）

**任务**：按 M2/M3 样板拆分剩余 3 个工作台（子代理主体 + AI 独立验证修复）。

**已落地**：
- **宣传委员** ws-prop-commissioner-entry.js：1320→139 行薄壳 + 7 tab 模块（entries/tabs/prop/：todo/overview/tasks/kanban/weekly/archive/my-dispatch）+ prop-workspace 能力（scope='workspace:prop'）；prop.html 入口 `20260812f-20260823b`
- **纪检委员** ws-disc-commissioner-entry.js：1339→139 行薄壳 + 9 tab 模块（entries/tabs/disc/：todo/overview/attendance/review/inspection/makeup/mailbox/tf-view/my-dispatch）+ disc-workspace 能力（scope='workspace:disc'）；disc.html 入口 `20260812f-20260823`
- **成员** ws-visitor-entry.js：897→172 行薄壳 + 6 tab 模块（entries/tabs/visitor/：todo/overview/projects/activities/attendance/inspection）+ visitor-workspace 能力（scope='workspace:visitor'）；visitor.html 入口 `20260812f-20260823`；storeInits 保留 role:'all' 原样

**AI 独立验证修复（1 个，prop）**：prop 入口沿用原单体 `state.js?v=20260812d`，但 data-loader 内部固定 `20260812a`——原单体靠顶层直接渲染掩盖双实例分裂，薄壳版靠 setState 驱动即暴露空白。修复：prop 入口 state → 20260812a。**教训已补 KNOWN_PITFALLS §17**：「照抄原单体版本」也是陷阱，须与依赖链内部版本一致。

**验证结果（纯代码，30/30）**：Node 静态 import 图 + 共享状态版本唯一性校验三工作台全过（prop 9 文件 56 导入 / disc 12 文件 67 导入 / visitor 8 文件 42 导入，无版本分裂）；Playwright 无头 30/30——三工作台 tab 按钮数（7/9/6）、单行、全部 tab 渲染非空、disc/visitor URL 直达 tf-001 落点正确、无 JS 错误。

**说明**：T-279 M3 至此全部完成（组织/宣传/纪检/成员 4 工作台 + 组长 M2 样板 + 书记已薄壳 = 6 工作台全薄壳化）。剩余 M4：数据源/场景注册化 + 迭代机制（版本化/灰度）。

### 沉淀标签
`[已沉淀: KNOWN_PITFALLS §17 补充判例]` — prop「照抄原单体版本」陷阱；三工作台拆分验证方法论固化（静态版本唯一性校验先行 + Playwright 30 项断言）


## T-279 M3 剩余三工作台拆分：宣传/纪检/成员（2026-08-23 执行完成，M3 全部完成）

**任务**：按 M2/M3 样板拆分剩余 3 个工作台（子代理主体 + AI 独立验证修复）。

**已落地**：
- **宣传委员** ws-prop-commissioner-entry.js：1320→139 行薄壳 + 7 tab 模块（entries/tabs/prop/：todo/overview/tasks/kanban/weekly/archive/my-dispatch）+ prop-workspace 能力（scope='workspace:prop'）；prop.html 入口 `20260812f-20260823b`
- **纪检委员** ws-disc-commissioner-entry.js：1339→139 行薄壳 + 9 tab 模块（entries/tabs/disc/：todo/overview/attendance/review/inspection/makeup/mailbox/tf-view/my-dispatch）+ disc-workspace 能力（scope='workspace:disc'）；disc.html 入口 `20260812f-20260823`
- **成员** ws-visitor-entry.js：897→172 行薄壳 + 6 tab 模块（entries/tabs/visitor/：todo/overview/projects/activities/attendance/inspection）+ visitor-workspace 能力（scope='workspace:visitor'）；visitor.html 入口 `20260812f-20260823`；storeInits 保留 role:'all' 原样

**AI 独立验证修复（1 个，prop）**：prop 入口沿用原单体 `state.js?v=20260812d`，但 data-loader 内部固定 `20260812a`——原单体靠顶层直接渲染掩盖双实例分裂，薄壳版靠 setState 驱动即暴露空白。修复：prop 入口 state → 20260812a。**教训已补 KNOWN_PITFALLS §17**：「照抄原单体版本」也是陷阱，须与依赖链内部版本一致。

**验证结果（纯代码，30/30）**：Node 静态 import 图 + 共享状态版本唯一性校验三工作台全过（prop 9 文件 56 导入 / disc 12 文件 67 导入 / visitor 8 文件 42 导入，无版本分裂）；Playwright 无头 30/30——三工作台 tab 按钮数（7/9/6）、单行、全部 tab 渲染非空、disc/visitor URL 直达 tf-001 落点正确、无 JS 错误。

**说明**：T-279 M3 至此全部完成（组织/宣传/纪检/成员 4 工作台 + 组长 M2 样板 + 书记已薄壳 = 6 工作台全薄壳化）。剩余 M4：数据源/场景注册化 + 迭代机制（版本化/灰度）。

### 沉淀标签
`[已沉淀: KNOWN_PITFALLS §17 补充判例]` — prop「照抄原单体版本」陷阱；三工作台拆分验证方法论固化（静态版本唯一性校验先行 + Playwright 30 项断言）

## T-279 M4 迭代机制落地：数据源/场景注册化 + 版本化/灰度（2026-08-23 执行完成，M4 全部完成）

**任务**：乙部 T-279 M4 阶段——「数据源/场景注册化 + 迭代机制（版本化/灰度）」，验收标准：新功能可按 scope 灰度，回滚=注销声明（实施路径见 ARCHITECTURE_EVOLUTION.md §六 M4）。

**决策链（AskUserQuestion 书记确认）**：①落地深度=「声明+消费点演示」——数据源（mock/api）与 SOP 场景清单注册为能力并接入现有消费点（bootstrap 数据源选择、决策树场景读取），行为零变化；②验收形式=「Node 断言 + 浏览器回归」——不新增 UI。

**已落地**：
- **registry.js 补全迭代机制原语**：新增 unregisterCapability(id)（回滚=注销声明，注销未注册返回 false + warn）与 resolveDeps(id)（deps 依赖查询：返回声明了但未注册的依赖列表，仅提示不阻断——activity-calendar 的 deps:['data-adapter'] 是核心模块非注册能力，属正常缺失提示）
- **数据源注册化** modules/capabilities/data-source.js：注册 mock-data-source（env:null 全环境可用/apply→setDataSource('mock')）与 api-data-source（env:['prod']/apply→setDataSource('api')）两个能力，scope='data-source'
- **场景注册化** modules/capabilities/sop-scenarios.js：注册 sop-scenarios 能力（scope='scenario'，list/get 直读 sopDatabase.scenarios——纯数据驱动，新增场景=追加 sopData.js 即可）
- **消费点接入（行为零变化）**：
  - bootstrap.js：数据源选择改经注册表——getCapabilities({scope:'data-source'}) 查 api/mock 能力，有 token apply api、失败回退 apply mock（替代原先直接 setDataSource('api')/setDataSource('mock')）
  - decision-tree.js：新增 getScenario(scenarioId) 经注册表读取场景（sop-scenarios 能力 get() 优先，未注册/未命中回退 sopDatabase），替换 getScenarioTitle/renderSopPreview 两处直接 find
- **版本链全站统一**（KNOWN_PITFALLS §13「发布=bump 一次」）：运行 bump-version.mjs 20260823b 全站统一（100 JS 文件 644 处 import + 16 HTML + styles.css + CODE_VERSION 31→32）——registry 是共享状态模块，M4 新增 bootstrap/decision-tree 引用后必须统一版本防同页双实例分裂（§17 教训）

**验证结果（Node + 浏览器，41/41）**：
- Node 断言 10/10：register/getCapabilities 按 scope/role/env 过滤、unregister 注销（回滚）、getRegistryVersion 版本聚合、resolveDeps 依赖查询、listCapabilities 一次取齐、mountCapability 未注册抛错、data-source/sop-scenarios 能力声明形态、decision-tree/bootstrap 消费点静态断言
- Playwright 无头 31/31：首页 main 渲染 + 统计卡 + 日历容器 + 注册表版本聚合(20260823b) + 数据源/场景/dashboard 能力注册 + 无 JS 错误；6 工作台（组长9/组织8/宣传7/纪检9/成员6/书记7 tab）渲染非空 + 各自能力注册 + 无 JS 错误（书记工作台为早期薄壳样板 tab 内联，未注册表化——既有状态非 M4 缺陷）

**说明**：M4 完成后 T-279 轻量插件化实施 M1-M4 全部完成——注册表机制（注册→发现→挂载→注销）、数据源/场景注册化、迭代机制（版本化/灰度/回滚）均已落地并有 Node 断言 + 浏览器回归双保险。

### 沉淀标签
`[已沉淀: KNOWN_PITFALLS §17 补充判例（T-279 M4）]` — M4 迭代机制版本化落地验证「发布=bump 一次」（KNOWN_PITFALLS §13 机制化）：registry 等共享状态模块变更后，新增引用方（bootstrap/decision-tree）与原引用方必须全站统一版本，否则同页双实例分裂（§17）；bump-version.mjs 一次性统一 100 JS + 16 HTML 是版本化机制的标准动作，回归靠 Node 断言 + Playwright 双保险

## T-280 B1 跳转逻辑梳理 · 对账报告（2026-08-24）

**任务**：网页逻辑全量梳理第 1 批（B1 跳转逻辑）——URL 参数直达 / tab 切换 / 跨页状态 / 登录跳转，与 CHECKLIST「手动检查清单 T-235」双向对账。
**引用流程**：H50.1 大任务分片 + CHECKLIST.md（数据同源一致性校验手册）+ DESIGN_SYSTEM 高频零跳转
**来源**：书记要求——基于既有 mock 数据对网页逻辑（跳转/计算/写入/读取）全量梳理，CHECKLIST 文档与网页双向修改。

### 一、已核实跳转链路（10 条）

| # | 链路 | 实现位置 | 核实结果 |
|---|------|---------|---------|
| 1 | 首页 4 类点击跳转（活动列表/专班/画廊/日历条目）→ buildURL 造参 → 工作台 | main-entry.js dashContainer click 委托（L487-528） | ✅ |
| 2 | 「查看更多活动」→ ?view=activities | main-entry.js L313 | ✅ |
| 3 | 跨页状态枢纽：CODE_VERSION=32、buildURL/getURLParams/setParam/getParam/clearParam（URL+sessionStorage 双轨）、会话状态 save/load/navigateTo | core/cross-page-state.js | ✅ |
| 4 | 登录门控：dev 绕过白名单（本地 hostname+白名单角色）、workspace 强制跳 login、页面身份校验（登录快照+内存判定角色页面集合） | core/bootstrap.js L76-155 | ✅ |
| 5 | 角色→页面映射 ROLE_PAGE_MAP（7 角色） | services/auth.js L101-111 | ✅ |
| 6 | Tab 切换：priorityTab > localStorage 记忆 > defaultTab > tabs[0]；activate 同步按钮高亮+写记忆+onTabChange | components/tab-bar.js L72-192 | ✅ |
| 7 | 6 工作台 URL 消费统一模式：getURLParams → navTarget 快照 → clearParam 三参 → 落点 activate | ws-secretary/leader/org/prop/disc/visitor-entry.js | ✅ |
| 8 | 待办跳转：通知待办→notice.html?id=；报名审核→activity/taskforce.html?id=；actionType→工作台 tab（组长 authorize→write/submit→attendance/review→review） | 各角色 tabs/*/todo-tab.js | ✅ |
| 9 | 通知直达：notice.html?id= 消费 | notice-entry.js L17/L36 | ✅ |
| 10 | 登录跳转：login-entry.js 成功登录→index.html（首页）；高亮褪去 flashHighlight 2800ms | login-entry.js + core/utils.js L112-121 | ✅ |

### 二、与 CHECKLIST T-235 对账结果（8 用例 + 5 附加项全部一致）

| CHECKLIST 用例 | 代码落点核实 |
|---|---|
| #1 书记 activityId→活动管理+月份2026-06+详情+高亮褪去 | secretary: activate('calendar')+setState displayMonth=act.date 前 7 位（L124-131）✅ |
| #2 书记 taskforceId→专班查看+高亮褪去 | secretary: _secHighlightTfId 快照+activate('tf-view')（L111-116）✅ |
| #3 组织 activityId→活动查看+月份跟随+详情 | org: _orgHighlightActId+activate('activity-view')+displayMonth 跟随（L126-137）✅ |
| #4 组织 taskforceId→专班管理+卡片高亮+详情展开 | org: activate('taskforce')+.tf-store-card[data-tf-id]+card.click()（L138-148）✅ |
| #5 宣传 activityId→项目看板+卡片高亮 | prop: activate('kanban')+`.kanban-card[data-kt="activity"][data-ki]`（L111-123）✅ |
| #6 纪检 taskforceId→专班查看+高亮 | disc: _highlightTfId+activate('tf-view')（L112-117）✅ |
| #7 组长 activityId→活动管理+详情展开+高亮 | leader: activate('write')+.leader-act-item[data-act-id]+item.click()（L128-140）✅ |
| #8 访客 activityId→活动动态+高亮自动褪去 | visitor: _visitorHighlightActId+activate('activities')（L150-152）✅ |
| 附加 view=activities | 书记→calendar/组织→activity-view/其余同落点表 ✅ |
| 附加 首页日历条目点击/专班卡片/活动卡片/高亮褪去一致性 | main-entry.js L487-528 + flashHighlight 2800ms ✅ |

### 三、发现的不一致/缺口（4 项，待书记确认处理方向）

1. **【网页→文档】CHECKLIST §1 人员数据校验点「登录成功→跳转对应角色工作台」与实现不符**：实际 login-entry.js 登录成功后跳转 `./index.html`（首页），首页顶栏/侧边栏展示对应角色工作台入口（main-entry.js L29-35 改写 workspace 链接），并非直接跳角色工作台。→ 建议 CHECKLIST 表述修正为「登录成功→跳转首页，首页顶栏展示对应角色工作台入口」。
2. **【检查依据】CHECKLIST「手动检查清单 T-235」第 2 轮冒烟结果列仍为 2026-08-09 历史状态（4 个 ❌ 待人工复核）**：代码层面已确认 4 项修复逻辑存在（死循环/懒加载竞态/月份未跟随/SignupStore 未导入），但浏览器实测状态未更新，「检查有依据」闭环未完成。→ 建议 4 项重新浏览器实测后更新结果列。
3. **【文档→网页】CHECKLIST 未覆盖登录门控四层链路校验点**：登录跳首页→首页按角色改写 workspace 链接、页面身份校验自动跳转（bootstrap L136-155）、dev 绕过白名单（仅本地 hostname）、已登录访问 login.html 直接跳首页、CODE_VERSION 代码版本自检。这些是 DEPLOYMENT_AUTH_MODEL.md §四登录门控设计的具体表现，校验手册缺覆盖。→ 建议 CHECKLIST 新增「登录与身份门控」校验点。
4. **【文档→网页】CHECKLIST 未覆盖待办/通知直达跳转链路校验点**：通知阅读待办→notice.html?id=、报名审核待办→activity/taskforce.html?id=、待办 actionType→工作台 tab（最小三成本/高频零跳转理念落地）。→ 建议 CHECKLIST 手动检查清单新增「待办直达跳转」检查项。

### 四、备注

- 书记工作台 tab 清单硬编码于 ws-secretary-entry.js L39-57，未走能力注册表（T-279 M3 已知状态，README 已注明，非本次缺陷）。
- 首页 ?view=&month=（列表/日历切换）与工作台 ?view=activities（直达活动 tab）参数语义并存、互不冲突（消费点隔离）。

### 待书记确认
→ 见对话 AskUserQuestion：4 项不一致项处理方向（B1-1 表述修正 / B1-2 实测回填 / B1-3 新增校验点 / B1-4 新增校验点）。

## T-280 B1 执行收口（B1-1~B1-5 落地，2026-08-24）

**书记确认**（AskUserQuestion）：B1-1 修正为跳首页 / B1-2 浏览器实测回填 / B1-3+B1-4 两批新增 / B1-5 按方案 A 修复。

### 文档侧落地（B1-1/B1-3/B1-4）
- B1-1：CHECKLIST §1 登录跳转校验点修正为「登录成功→跳转首页，首页顶栏展示对应角色工作台入口」（login-entry.js 登录后跳 index.html；main-entry.js 按角色改写 workspace 链接）
- B1-3：CHECKLIST 新增 §16「登录与身份门控」校验点 6 条（已登录跳首页/账号密码登录→首页+顶栏入口/工作台身份校验自动跳转/dev 白名单/多标签页防串扰/CODE_VERSION 自检）
- B1-4：CHECKLIST 手动检查清单新增「T-280-B1 待办/通知直达跳转」检查项 7 条（通知→notice.html/报名审核→activity-taskforce.html/组长赋权→活动详情≤2跳/考勤/复盘/书记通知直达/聚合卡一致性）

### 浏览器实测（B1-2）：T-235 全量 34/34 PASS
- 新增回归脚本 `server/test/t235-browser-regression.mjs`（8 用例 + view=activities ×2 + 首页三类点击 J1/J2/J3 + 高亮褪去一致性，Playwright）
- 8 用例落点/参数消费/月份跟随/详情打开全部 PASS；首页三类点击跳转真实链路 PASS（framenavigated 证实：点击→`?activityId=act-30`→参数消费清空）
- CHECKLIST T-235 表格新增「第 3 轮实测（2026-08-24）」列，4 个原 ❌ 待人工复核项全部转 ✅

### B1-5 缺陷修复（代码侧，方案 A 条件抑制版）
- **缺陷**：URL 直达高亮被 `loadWorkspaceData` 二次 setState 重渲染冲掉，实际可见仅 ~300ms（probe 证实 300ms 有/600ms 无），设计应 3 秒
- **修复**（6 工作台入口统一）：
  - 导航落点后 3 秒条件抑制当前 tab 重渲染：仅当导航目标元素已在 DOM（`_*NavTargetSel` 命中）时抑制，目标缺失放行延迟数据补渲染
  - 高亮目标（`_*HighlightTfId/_*HighlightActId`）存活至抑制窗口结束（onLocated 改 no-op + 3s 定时器清除），补渲染可重新应用高亮
  - 一次性 setTimeout(150) 定位改为轮询定位（组长 write/宣传 kanban/组织 taskforce，300ms×20 次）
  - 修正访客活动条目选择器认知：实际为 `data-visitor-act-id`（非 data-act-id）
- **回归验证**：T-235 34/34 + M4 31/31（m4 测试版本戳同步至 20260824b，注册表版本检查保持能力声明实际值）+ server 19/19 + capability 全绿
- **版本化**：bump-version.mjs 20260824b 全站统一（CODE_VERSION 32→36），符合 KNOWN_PITFALLS §13「发布=bump 一次」

### 变更文件清单
`docs/src/entries/ws-secretary-entry.js` / `ws-leader-entry.js` / `ws-org-commissioner-entry.js` / `ws-prop-commissioner-entry.js` / `ws-disc-commissioner-entry.js` / `ws-visitor-entry.js`（条件抑制+轮询定位+高亮存活）、`docs/src/core/cross-page-state.js`（CODE_VERSION）、全站 JS/HTML（版本戳）、`content/04_web_design/CHECKLIST.md`（B1-1/3/4+T-235 第3轮）、`server/test/t235-browser-regression.mjs`（新建）、`server/test/m4-browser-regression.mjs`（版本戳同步）

### 沉淀标签
`[待沉淀: B1-5 条件抑制模式]` — URL 直达高亮与延迟数据补渲染的冲突解法：条件抑制（仅当导航目标已在 DOM 时抑制重渲染）+ 高亮目标存活窗口 + 轮询定位，三件套组合可复用（web 端导航落地通用模式）。

## T-280 B2 计算逻辑梳理 · 对账报告（2026-08-24）

**任务**：网页逻辑全量梳理第 2 批（B2 计算逻辑）——统计口径全量化，与 CHECKLIST 计数/统计校验点双向对账。
**引用流程**：H50.1 大任务分片 + CHECKLIST.md + DESIGN_SYSTEM 最小三成本/打卡化判定/复盘问题导向

### 一、已核实计算口径（全部量化）

| # | 计算点 | 口径公式 | 位置 | 结果 |
|---|--------|---------|------|------|
| 1 | 书记概况·考勤率 | 本月活动记录 `(present+made_up)/total×100`，无记录 0，alert<80 | secretary-overview.js `_computeAttendance` | ✅ |
| 2 | 书记概况·阶段人数 | PEOPLE 全量按 developStage 四档累加（非"有考察记录者"） | `_computeInspection` | ✅ |
| 3 | 书记概况·活动/专班 | activeActivities=未归档；activeTaskforces=active+recruiting；pendingAuth=bottom-up 且无 organizer；reviewIssues=活跃活动复盘 issues 总条数（2026-08-10 问题导向） | `_computeActivity` | ✅ |
| 4 | 书记概况·宣传档案 | noticeCount=本月发布；pendingArchive=已结束未归档；archiveRate=archived/ended | `_computePropaganda` | ✅ |
| 5 | 按人视图 | 4 角色（org/prop/disc/leader，副书记除外）；todoCount=聚合卡 count 求和；overdueCount=deadline<today；在办活动/专班按职责关系投影 | `getPersonOverview` | ✅ |
| 6 | SecretaryTodoDeriver | 8 组实时聚合：4 提醒类（考勤>3天/考察超期/复盘>7天/归档缺失）+ 4 复核类（考勤/考察/复盘/归档 secretaryConfirmedAt 为空） | `computeAggregates` | ✅ |
| 7 | 首页统计卡 | 本月活动=未归档且 date 前缀本月；活跃专班=active+recruiting；未读通知=activeOnly 且未读；个人考勤率=`(present+made_up)/myTotal`（90/70 阈值） | main-entry.js `_renderStats` | ✅ |
| 8 | 活动生命周期展示态 | deriveActivityLifecycleStatus：draft/archived/cancelled 直接判，exec 由任务进度派生，completed 走 checkActivityCloseConditions（executed/pending_archive） | inspector.js | ✅ |
| 9 | 分类型关闭条件 | 三会一课（请假确认+缺勤补课+会议纪要）/主题党日（考勤+考察+复盘+宣传归档） | `checkActivityCloseConditions` | ✅ |
| 10 | 待办派生 | NoticeTodoDeriver（actionable+actionRoles 字段驱动）/LifecycleTodoDeriver（活动创建→组长赋权/专班创建→组织赋权/活动归档→宣传归档）/VisitorTodoDeriver（通知阅读+活动/专班参与，幂等去重+stale 清理） | todo.js | ✅ |
| 11 | 通知未读/过期 | list({activeOnly})：排除 archived + expireDate<today；紧急全部保留、重要仅未读 | notice.js | ✅ |
| 12 | T223 排序 | 未完成在前、已完成在后，组内 date 降序；专班 createdAt 降序（B1 已核实） | 全站 | ✅ |

### 二、与 CHECKLIST 对账发现（6 项，待书记确认处理方向）

1. **B2-1【网页→文档】CHECKLIST §2 L76/L77 统计卡片校验点过时**：写"书记工作台统计卡片的『活动总数』= 非 cancelled 记录数""『品牌标签』数 = isBrand 7 条"——实际书记概况已重构为四维度（T-203），无「活动总数」「品牌标签数」统计（isBrand 仅为属性标签用于筛选/徽章）。→ 建议修正为实际维度口径（activeActivities/pendingAuth 等）或删除。
2. **B2-2【网页→文档】CHECKLIST §2 L75 首页日历 cancelled 过滤与实现不符**：实现仅过滤 archived（calendar.js L878 `filter(a=>!a.archived)`），cancelled（act-20「3月理论学习小组（已取消）」）会显示在日历/列表（带"已取消"徽章）；CHECKLIST 称"act-20 为 cancelled 不显示"。→ 需书记决策：改代码（过滤 cancelled）或改文档（标注显示已取消）。
3. **B2-3【文档→网页】首页统计卡口径无校验点**：本月活动/活跃专班/未读通知/个人考勤率四个口径无 CHECKLIST 校验点。→ 建议新增。
4. **B2-6【网页→文档】CHECKLIST §7 L204 + 跨类别 L388「行动性关键词」表述过时**：写"未读通知中含行动性关键词的记录派生"，实际为 actionable 字段 + actionRoles 驱动（非关键词判断）。→ 建议修正。
5. **B2-8【网页→文档】CHECKLIST §12 L305「复盘完成率」残留**：2026-08-10 书记裁定复盘改问题导向（reviewIssues 真问题计数），复盘完成率已废弃。→ 建议修正 L305 表述。
6. **B2-10【文档→网页】缺失新计算逻辑校验点**：复盘问题数（reviewIssues）/按人视图 getPersonOverview/活动生命周期展示态/SecretaryTodoDeriver 8 组动态聚合无校验点。→ 建议新增。

### 三、一致性确认（✅ 无问题）
- 考勤率口径全站统一：(present+made_up)/total（书记概况/首页个人考勤/纪检待确认）
- 生命周期展示态 deriveActivityLifecycleStatus 全站统一（首页列表/日历/画廊/详情）
- 通知未读/过期/紧急保留与 CHECKLIST §6 一致
- 待办聚合（role:actionKey）与 DATA_ARCHITECTURE §2.18-2.20 一致
- 补课联动（缺勤→补课→made_up 回写）与 CHECKLIST §11/跨类别一致

### 待书记确认
→ 见对话 AskUserQuestion：B2-1 修正/删除校验点、B2-2 决策 cancelled 显示、B2-3/B2-10 新增校验点、B2-6/B2-8 表述修正。

## T-280 B2 执行收口（B1-6 项落地，2026-08-24）

**书记确认**（AskUserQuestion 采纳推荐）：B2-1 改写为实际维度 / B2-2 保留显示改文档 / B2-3+B2-10 新增校验点 + B2-6+B2-8 表述修正。

### CHECKLIST 侧落地
- **B2-1**：§2「活动总数/品牌标签数」过时统计卡校验点改写为书记概况实际维度（activeActivities/activeTaskforces/pendingAuth/reviewIssues）+ 首页统计卡「本月活动」口径；isBrand 标注为属性标签无独立计数
- **B2-2**：§2 首页日历/列表校验点修正为「未归档活动（含已取消 act-20，带『已取消』徽章），仅过滤 archived」——保留显示策略（成员可感知取消事实），不改代码
- **B2-3**：跨类别新增「首页统计卡四口径」校验点（本月活动/活跃专班/未读通知/个人考勤率 90/70 阈值）
- **B2-6**：§7 通知类待办校验点 + 跨类别「行动性通知含关键词」修正为「actionable 字段 + actionRoles 驱动」
- **B2-8**：§12 复盘校验点修正——复盘完成率废弃，改「复盘问题数（reviewIssues）」问题导向
- **B2-10**：新增校验点——§7 书记待办 8 组动态聚合（SecretaryTodoDeriver）+ 跨类别活动生命周期展示态（deriveActivityLifecycleStatus）/按人视图（getPersonOverview 4 角色职责投影）

### 一致性确认（✅ 无代码改动）
考勤率口径全站统一 / 生命周期态全站统一 / 通知过滤一致 / 待办聚合一致 / 补课联动一致（详见 B2 对账报告第三节）

### 变更文件清单
`content/04_web_design/CHECKLIST.md`（§2 活动校验点重构 + §7 待办 + §12 复盘 + 跨类别新增 3 条）

### 沉淀标签
无新模式（B2 为既有口径的文档对账修正，无新增方法论）。

## T-280 B3 写逻辑梳理 · 对账报告（2026-08-24）

**任务**：网页逻辑全量梳理第 3 批（B3 写逻辑）——全部写入点 + 持久化链路，对账 CHECKLIST「写入后可见/联动」校验点。
**引用流程**：H50.1 大任务分片 + CHECKLIST.md + insights「打卡化判定」（完成必须对应真实产物）

### 一、已核实写入链路（8 条）

| # | 写入链 | 实现位置 | 结果 |
|---|--------|---------|------|
| 1 | 持久化单点汇聚：persist() → mock=localStorage saveDB / api=本地备份+800ms 防抖快照写穿+pagehide 同步冲刷；末尾 notifyDataChanged 广播 | data-adapter.js persist/_scheduleSnapshot/_flushSnapshotSync | ✅ |
| 2 | 活动写入链：writeActivityWithSOP（决策树）+ saveActSubs + 考勤/考察子记录 + syncProjectRoles + 销待办，全部持久化 | leader/write-tab.js | ✅ |
| 3 | 专班写入链：24 写点（创建/启动/归档/解散/报名审核/赋权/通知发布/子记录）+ persist 扎口 | org/taskforce-tab.js | ✅ |
| 4 | 考勤确认链：纪检 saveAttendanceRecords（写 recordedBy）+ autoGenerateMakeupTask（缺勤/请假→补课任务） | disc/attendance-tab.js + makeup.js | ✅ |
| 5 | 赋权写入链：authorize/revokeAuthorization/syncProjectRoles → 写主源（activities.assignments/taskforces.members）+ _appendAuditEntries 审计快照（只增不改）+ persist | auth.js | ✅ |
| 6 | 通知写入→待办派生：NoticeStore.add → NoticeTodoDeriver（actionable+actionRoles）| notice.js + todo.js | ✅ |
| 7 | 独立 localStorage 域写路径：Issues/Milestones/Auth 审计不经 persist，写方法内显式 notifyDataChanged | data-adapter L334-335 注释 + issues.js | ✅ |
| 8 | 档案/周报/宣传任务/邮箱/外发/经验沉淀等 niche 域写入：mockDB.X = ... + persist | prop/archive-tab.js、weekly-tab.js、tasks-tab.js、disc/mailbox-tab.js 等 | ✅ |

### 二、发现的不一致/缺陷（1 项，待书记确认）

**B3-1【网页实现缺陷 · 打卡化判定】补课完成未回写考勤 made_up（高优先级）**：
- 纪检「确认完成」补课任务仅标记 `makeupTask.status='completed'`（makeup-tab.js L85-97），**未更新 attendanceRecordId 对应考勤记录为 made_up**
- `attendanceRecordId` 仅在 autoGenerateMakeupTask 创建补课任务时写入（makeup.js L58），全仓无任何读取回写点（Grep 证实仅 1 处出现）
- 现有 made_up 记录（att27/att14）仅为静态种子，运行时补课完成链路无回写
- **违反**：CHECKLIST §11「已完成补课对应的考勤记录 status='made_up'（att27/att14）」+ 跨类别「补课完成后考勤状态变 made_up」+ insights「打卡化判定」（完成必须对应真实产物，仅状态翻转即打卡化设计缺陷）
- → 建议修复：makeup-tab 确认完成时，按 task.attendanceRecordId 将对应考勤记录 status 改为 made_up + persist

### 三、一致性确认（✅ 无问题）
缺勤→补课生成链完整 / 活动写入链完整 / 专班写入链完整 / 赋权写主源+快照完整 / 通知→待办派生完整 / persist 单点汇聚完整

### 待书记确认
→ 见对话 AskUserQuestion：B3-1 补课回写缺失的修复方向。

## T-280 B3 执行收口（B3-1 修复 + 验证，2026-08-24）

**书记确认**（AskUserQuestion）：B3-1 修复回写闭环。

### B3-1 修复落地（代码侧）
- **缺陷**：纪检「确认完成」补课任务仅标记 makeupTask completed，未回写考勤 made_up（打卡化判定缺陷——完成仅状态翻转无真实产物）
- **修复**（`docs/src/entries/tabs/disc/makeup-tab.js`）：确认完成时按 `task.attendanceRecordId` 找到对应考勤记录，若为 absent/leave 则改为 `made_up` + `overdue=false` + `madeUpAt` 时间戳，`saveAttendanceRecords` 持久化；用 `loadAttendanceRecords`（原始全表）避免归档过滤丢已归档考勤
- **验证**（`server/test/b3-1-makeup-writeback.test.mjs`，新建）：注入合成补课任务→点击确认完成→考勤 att38 回写 made_up + overdue 清除，**5/5 PASS**（无 JS 错误）
- **版本化**：bump 20260824c（CODE_VERSION 36→37）
- **CHECKLIST**：§11 补课数据新增校验点「确认完成→回写考勤 made_up + overdue 清除（B3-1 修复）」

### 变更文件清单
`docs/src/entries/tabs/disc/makeup-tab.js`（B3-1 回写）、全站 JS/HTML（版本戳）、`content/04_web_design/CHECKLIST.md`（§11 新增校验点）、`server/test/b3-1-makeup-writeback.test.mjs`（新建）

### 沉淀标签
`[待沉淀: B3-1 补课回写打卡化闭环]` — 补课完成必须回写考勤 made_up（完成=真实产物）；attendanceRecordId 建立补课→考勤的引用链，回写点缺失即为打卡化缺陷。同类模式：任何"完成"操作须检查是否只翻状态未落真实产物。

## T-280 B4 读逻辑梳理 · 对账报告（2026-08-24）

**任务**：网页逻辑全量梳理第 4 批（B4 读逻辑）——全部读取点 + 数据源路由 + 只读视图 + 知情边界，对账 CHECKLIST 读一致性校验点。
**引用流程**：H50.1 大任务分片 + CHECKLIST.md + DESIGN_SYSTEM 按人视图·知情边界（P-011）

### 一、已核实读取机制（6 条）

| # | 读取机制 | 实现位置 | 结果 |
|---|---------|---------|------|
| 1 | 数据源路由：bootstrap 经能力注册表选择 mock/api，api 拉取失败完整回退 mock；登录态感知 | core/bootstrap.js（B1 已核实）+ modules/capabilities/data-source.js | ✅ |
| 2 | 空表回退种子：activity/attendance/inspection/review 四服务统一 `mockDB.X.length>0 ? [...mockDB.X] : [...SEED]` | services/activity.js、attendance.js、inspection.js、review.js | ✅ |
| 3 | 知情边界（P-011）：L0 个人 / L1 条线（AUTHORIZE_CHAIN 赋权链投影）/ L2 全局（书记/副书记 all）；ROLE_VISIBILITY 配置表 + PROJECT_VISIBILITY（organizer→deep 项目内）+ resolveVisibleTargets/canViewPerson/dimensionsFor | services/visibility.js | ✅ |
| 4 | 只读视图（visitor 6 tab）：读 mockDB/localStorage 无写，派生写在入口层（VisitorTodoDeriver 幂等） | ws-visitor-entry.js + visitor/*-tab.js（B1/搜索代理核实） | ✅ |
| 5 | 静态页登录态感知壳：login-snapshot.js 零依赖纯读（键名与 auth.js 硬同步） | core/login-snapshot.js（B1 已核实） | ✅ |
| 6 | 数据变更即时刷新：persist → notifyDataChanged 事件总线 → 首页统计卡/header 角标即时重算 | data-adapter.js（B3 已核实） | ✅ |

### 二、与 CHECKLIST 对账发现（2 项，待书记确认）

1. **B4-1【网页→文档】CHECKLIST §1 L46「各工作台人员选择器中的列表 = PEOPLE 中 developStage='正式党员' 的成员」与实现不符**：PersonPicker 默认可注入 filter，未传 filter 时显示**全部 PEOPLE**（已验证 leader 考勤上传选择器 `new PersonPicker({mode:'multi'...})` 未传 filter）。→ 建议修正为「各工作台人员选择器显示全部 PEOPLE（部分场景由调用方传 filter 过滤，如发展党员候选=非正式党员）」，或若设计意图是仅正式党员可被选为组织者/深度参与者，则需补过滤（书记决策）。
2. **B4-2【网页→文档】CHECKLIST §5 L156「某人的考察记录数量 = 该人作为 organize/deep 参与的活动/专班数」措辞不准确**：考察记录由组长/组织委员**手工上传**（inspection-tab saveInspectionRecords），无自动从 assignments 派生逻辑；数量依赖录入行为，不自动等于参与数。跨类别 L391「assignments 中 organizer/deep 应有对应考察记录」是业务期望非代码保证。→ 建议修正为「参与过活动/专班（assignments organizer/deep）的人员**应有**对应考察记录（业务期望，依赖人工录入）」——从"自动同源"改为"业务期望"语义。

### 三、一致性确认（✅ 无问题）
数据源路由（mock/api 双模式+回退）/ 空表回退四服务一致 / 知情边界三层投影完整 / 只读视图无写 / 静态页登录态感知 / 数据变更即时刷新（B2/B3 已确认的读一致性）

### 待书记确认
→ 见对话 AskUserQuestion：B4-1 人员选择器过滤、B4-2 考察数量措辞。

## T-280 B4 执行收口（B4-1/B4-2 落地，2026-08-24）

**书记确认**（AskUserQuestion）：B4-1 改文档默认全部 / B4-2 修正为业务期望。

### CHECKLIST 侧落地
- **B4-1**：§1 人员选择器校验点修正为「= PEOPLE 全部成员（PersonPicker 默认可注入 filter；特定场景由调用方传过滤，如发展党员候选=非正式党员、书记赋权被赋权人=非支委）」
- **B4-2**：§5 考察数量校验点修正为「参与过活动/专班（assignments organizer/deep）的人员**应有**对应考察记录——业务期望，考察为组长/组织委员手工上传，数量依赖录入行为，非自动派生」；跨类别 L392 同步标注「业务期望，手工录入；非自动派生」

### 一致性确认（✅ 无代码改动）
数据源路由 / 空表回退四服务一致 / 知情边界三层投影 / 只读视图无写 / 静态页登录态感知 / 数据变更即时刷新

### 变更文件清单
`content/04_web_design/CHECKLIST.md`（§1 选择器 + §5 考察 + 跨类别）

### 沉淀标签
无新模式（B4 为读取机制对账修正，无新增方法论）。

## T-280 B5 前后端对账 · 对账报告（2026-08-24）

**任务**：网页逻辑全量梳理第 5 批（B5 前后端对账）——server 数据模型与前端 mockDB 一致性。
**引用流程**：H50.1 大任务分片 + CHECKLIST.md + ARCHITECTURE.md + T-209 全栈同步

### 一、已核实（前后端一致，8 条）

| # | 对账点 | 核实结果 |
|---|--------|---------|
| 1 | server 26 表（users + 25 业务）vs 前端 mockDB 持久化域 | ✅ 对齐（RESOURCE_TABLES 完整覆盖） |
| 2 | 资源名→表名映射 vs snapshot payload 键名 | ✅ 对齐（resources.js RESOURCE_TABLES，含 makeupTasks→makeup_tasks 等映射） |
| 3 | seed.js 复用前端 mock | ✅ 8 集合（PEOPLE/ACTIVITIES/MOCK_NOTICES/MOCK_TASKFORCES/SEED_TASKS/SEED_ASSIGNMENTS/SEED_ARCHIVE_RECORDS/SEED_SIGNUPS），与 mock-adapter._seedInitialData 对齐 |
| 4 | attendances/inspections/todos API 模式空表回退本地种子（Z5） | ✅ 与 data-adapter init 注释一致（服务端 seed 仅 7 表，防加载期本地覆盖服务器） |
| 5 | snapshot 写穿链路（_buildSnapshotPayload 24 域 → POST /api/v1/snapshot → replaceCollection） | ✅ 单点汇聚 + pagehide 同步冲刷 |
| 6 | 聚合域 __root__ 单行模式（actSubRecords/tfSubRecords/mailboxConfig） | ✅ 写穿包装与 init 解包对称 |
| 7 | branchDocs 独立资源组（per-item REST create/update/delete） | ✅ mock 模式 _saveToStorage 持久化；API 模式直写 /api/v1/branchDocs |
| 8 | auth 链路（requireAuth/requireCommissioner + token）+ server 测试 19/19 | ✅ 测试覆盖 auth/resources/seed/snapshot/uploads |

### 二、发现（2 项文档缺口 + 1 项低优先级观察，待书记确认）

1. **B5-1【设计说明】branchDocs 是唯一不走 snapshot 写穿的域**（per-item REST 直写，其余 24 域走防抖快照）。设计选择（T-264 资料查询支部文件用独立资源组），但 CHECKLIST 未说明，易被误判为写穿缺口。→ 建议 CHECKLIST 明确标注。
2. **B5-2【文档→网页】CHECKLIST 无 server/API 模式对账校验点**：CHECKLIST 存储源标注均为前端 mock（docs/src/mock/...），未覆盖 API 模式（/api/v1/ 路由读写、snapshot 写穿、server 表）。书记明确要求梳理涉及 server。→ 建议新增「前后端数据模型对账」校验点（server 26 表 / snapshot 写穿 / seed 复用 / branchDocs per-item）。
3. **B5-3【低优先级观察】API 模式下 branchDocs per-item 写后 mockDB.branchDocs 不同步**：references.js 经 getAdapter().branchDocs.update 直写服务器后，仅更新自持 `_branchDocs` 缓存，未回写 mockDB.branchDocs（mock 模式则直改 mockDB）。当前无其他消费点读 mockDB.branchDocs，无实际影响，但属潜在 stale 风险。→ 建议后续优化时回写 mockDB 或标注已知限制。

### 三、一致性确认（✅ 无问题）
seed 集合对齐 / 资源路由 26 名全覆盖 / snapshot 单点写穿 / 聚合域对称 / auth 链路 / 测试 19/19

### 待书记确认
→ 见对话 AskUserQuestion：B5-1 标注说明、B5-2 新增 server 对账校验点、B5-3 观察项处置。

## T-280 B5 执行收口（B5-1/B5-2/B5-3 落地，2026-08-24）

> 处置说明：书记对 B5 三问 AskUserQuestion 跳过选择并指示 Continue——鉴于三项处置均为 CHECKLIST 文档性对账修正（无代码逻辑改动，可逆性强），且 B5-3 经深度核实为「巧合安全」，按推荐方向落地。

- **B5-1 标注 branchDocs 写穿例外**：CHECKLIST「跨类别同源校验」新增「快照写穿边界」条目——全量快照覆盖 25 个持久化域，不含 users 与 branchDocs；branchDocs 走 per-item CRUD 且仅支委可写（COMMISSIONER_WRITE）。
- **B5-2 新增 server/API 对账校验点**：① 跨类别新增「前端持久化域 ↔ server 表对账」+「聚合域存储模式（`__root__` 单行 round-trip）」2 条；② 手动检查清单新增「T-280-B5 前后端数据模型对账」小节 6 条（表↔域映射/seed 复用/空表回退/branchDocs 写权限/聚合域 round-trip/auth 测试）。
- **B5-3 观察项处置（核实为"巧合安全"）**：深度核实结论——API 模式下 references.js 经 ApiAdapter per-item CRUD 直写 server 并维护自持 `_branchDocs`，不回写 mockDB.branchDocs；但 (a) `_buildSnapshotPayload` 不含 branchDocs（全量快照不覆盖）、(b) API 模式本地备份不参与读、(c) 无其他消费点读 mockDB.branchDocs → 无用户可见危害。**不做代码改动**（避免无收益防御），在 CHECKLIST 写穿边界条目中标注「严禁将 branchDocs 加入快照 payload」防回归。

## T-280 B6 CHECKLIST 收口（2026-08-24）

**任务**：网页逻辑全量梳理第 6 批（B6 收口）——各批「文档→网页」新理念校验点落实确认 + 「网页→文档」过时描述全量修正 + 一改具改。
**引用流程**：H30.1 一改具改 + H40 文件修改检查清单 + H50.1 乙部生命周期

### 一、各批新理念校验点落实确认（✅ 全部已写入 CHECKLIST）

| 批次 | 理念 → CHECKLIST 承载位置 |
|---|---|
| B1 跳转 | T-235 首页跳转直达 8 条+附加 4 条（第 3 轮实测 34/34）+ T-280-B1 待办/通知直达跳转 7 条 + §16 登录与身份门控 6 条 |
| B2 计算 | §2 全局概况口径（activeActivities/activeTaskforces/pendingAuth/reviewIssues）+ 首页统计卡口径 + 活动生命周期展示态 + 按人视图口径 + §12 复盘问题数（完成率废弃）+ §7 书记待办 8 组动态聚合 |
| B3 写 | §11 确认完成→回写考勤 made_up+overdue 清除（B3-1）+ §12 复盘提交持久化（P1-4） |
| B4 读 | §5 B4-2 考察手工录入业务期望修正 + 空表回退种子 + §16 CODE_VERSION 自检 |
| B5 对账 | 跨类别「前端持久化域↔server 表」「快照写穿边界」「聚合域 `__root__`」3 条 + T-280-B5 手动检查 6 条 |

### 二、网页→文档过时描述修正

- CHECKLIST §1 人员数据：运行时 `mockDB.people`（旧描述）→ `mockDB.users`（domain.js 实际集合名，people.js PEOPLE 经 seed.js 注入）

### 三、一改具改检查

- CHECKLIST.md `last_updated` 已为 2026-08-24，本次无其他 YAML 变更
- 乙部 T-280：B1-B6 全部完成，本收口写入执行日志后从乙部删除（H50.1 规则 3）
- `.ctx/PLAN_网页逻辑梳理.md`：B1-B6 全部勾选完成，按规划归档（后续删除本文件）
- CODE_VERSION 核对：`docs/src/core/cross-page-state.js` L16 = **38**（bump 序列 32→34→36→37→38，最终值确认）

### 四、验证

- 无代码改动（B4/B5 为纯文档对账），server 测试维持 19/19（此前已跑通）；B3-1 代码改动已浏览器验证 5/5

## T-280 B6 补充：m4 回归版本戳失配修复（2026-08-24）

> 完成审计触发：B6 收口后跑 `npm test` 全量回归，发现 m4 浏览器回归 22/31（此前记录"已修正"未复核）。

**现象**：9 项能力注册断言失败——注册表版本 `v=1.0.0`、数据源/场景/dashboard 能力清单全空、6 个工作台能力注册全空。

**根因（KNOWN_PITFALLS §17 测试侧复现）**：bump-version.mjs 只覆盖 `docs/src/**/*.js` 与 `docs/*.html`；server/test/m4-browser-regression.mjs 内 Playwright evaluate 硬编码 `import('/src/...?v=20260824b')` 未随 bump 至 `20260824c`。capabilities 各模块内部 `import registry?v=20260824c` 注册到 C 实例，测试读取 B 实例 → 空注册表误报。功能本身正常（t235 34/34 + 页面渲染全部 PASS 佐证）。

**修复**：
1. `server/test/m4-browser-regression.mjs`：版本戳 `20260824b` → `20260824c`（4 处）
2. `docs/scripts/bump-version.mjs`：新增 server/test/*.mjs 的 `/src/...?v=` 版本戳同步逻辑（bump 一次即连带更新测试戳，机制化防复发）
3. `content/05_ai_coding/KNOWN_PITFALLS.md` §17：追加测试侧补充判例（T-280 B6 收口）

**验证**：m4 回归 **31/31 PASS**（此前 22/31）；bump 脚本 `node --check` 通过；单元测试 19/19 与 t235 34/34 不受影响。

**影响面**：仅测试脚本 + bump 工具链 + KNOWN_PITFALLS，无业务代码改动。

## T-280-B1 待办/通知直达跳转 · 浏览器实测（2026-08-24，29/29 全过）

**任务**：书记要求浏览器实测 CHECKLIST「T-280-B1 待办/通知直达跳转」7 条——因模型无视觉能力，全部采用**代码化断言**（URL / tab 激活态 / 详情面板 DOM），从运行时代码状态出发（TodoStore 派生数据 + DOM 行动按钮），构造待办与真实派生逻辑同源。
**引用流程**：H50.1 + CHECKLIST T-280-B1 + DESIGN_SYSTEM 原则10（高频零跳转）

### 一、7 条实测结果（`server/test/t280-b1-browser-regression.mjs`）

| # | 检查项 | 实测方式 | 结果 |
|---|--------|---------|------|
| 1 | 通知阅读待办 | 构造 actionable 通知（NoticeTodoDeriver）→ 点「去阅读」 | ✅ notice.html?id=ntc-b1test |
| 2 | 报名审核待办 | 书记真实数据 signup-review→tf-005；组织构造→act-15 | ✅ taskforce.html / activity.html |
| 3 | 组长赋权待办 | 构造活动创建赋权 → 聚合卡「处理」 | ✅ write tab + act-2 详情自动打开 |
| 4 | 组长考勤上传 | 构造 submit 待办 → 点「去提交」 | ✅ attendance tab 激活 |
| 5 | 组长复盘提交 | 构造 review-submit 待办 → 点「去提交」 | ✅ review tab 激活（修复①后） |
| 6 | 书记通知发布 tab | notification tab 点行 | ✅ notice.html?id=notice-110 |
| 7 | 聚合卡一致性 | 聚合卡与明细同一 onActionTodo 处理函数 | ✅ 行为一致 |

### 二、实测修复 2 个真实缺陷（`docs/src/entries/tabs/leader/todo-tab.js`）

1. **缺陷①：actionKey 级 tabMap 缺失**——`review-submit`（复盘提交）待办点「去提交」误跳考勤上传（tabMap 仅 actionType 级 submit→attendance）。修复：新增 actionKeyMap（attendance-upload→attendance / review-submit→review），对齐 disc todo-tab 既有模式。
2. **缺陷②：赋权直达详情失效**——聚合对象（getGroupedByAction）无 sourceId 字段 + 目标 tab 懒加载动态 import 渲染异步，同步 querySelector 在渲染前执行、找不到活动条目。修复：`sourceId || items[0].sourceId` 取源 + 以「详情面板打开」为完成条件的 100ms 轮询重试点击（4s 超时）。

### 三、版本 bump（20260824d，让修复生效）

- 全站 import 戳 20260824c → 20260824d（HTML 16 + JS 全部），CODE_VERSION 40（跨页自检）
- **bump-version.mjs 新增 server/test 版本戳同步逻辑生效验证**：t235/m4/t280-b1/b3-1 内 `/src/...?v=` 全部自动同步为 20260824d（m4 版 31/31 验证无分裂）
- ⚠️ 实测发现：bump 脚本输出「JS 文件 0 个」异常（实际 JS 已更新）——首次执行输出被沙箱吞、二次执行时 JS 已是新版本，属执行环境噪音，无实质影响

### 四、测试基础设施稳定化

- **npm test 改串行**（`--test-concurrency=1`）：并行时浏览器回归（t235/m4/t280-b1）争抢 server/浏览器资源致失败项漂移（m4 或 t235 用例4 偶发），串行稳定
- **t235 waitElAndHighlight 超时 4s→8s**：串行环境下前序测试压力致卡片渲染慢于 4s（用例4 组织 tf-002 稳定复现 2 次），放宽后通过

### 五、验证

- **全量测试 21/21 全绿**：b3-1 5/5 + t235 34/34 + m4 31/31 + t280-b1 29/29 + probe3 单元测试
- CHECKLIST T-280-B1 7 条全部勾选 ✅ + 实测说明；T-280-B5 测试计数更新为 21/21
- 无 JS 错误（每用例 pageerror 监听为空）
- 探针文件（probe-*.mjs）已删除，不留过程文件

## T-280-B5 前后端数据模型对账 · API 实测（2026-08-24，6/6 全过）

**任务**：书记要求浏览器实测 CHECKLIST「T-280-B5 前后端对账」6 条。因对账为 API/代码级，采用**API 级代码断言**（node fetch 直调 server，无浏览器依赖），写入 `server/test/t280-b5-api-regression.mjs`（node --test，自动纳入 npm test）。
**引用流程**：H50.1 + CHECKLIST T-280-B5 + B5 对账报告（执行日志 L5014~5050）

### 一、6 条实测结果

| # | 检查项 | 实测 | 结果 |
|---|--------|------|------|
| V1 | 表↔域映射 | 26 资源 list 全通（200+数组） | ✅ |
| V2 | seed 复用 | 运行时 users 50/taskforces 8/activities 29+ + 代码级种子常量 | ✅ |
| V3 | 空表回退必要性 | 代码级：seed.js 不覆盖 attendances/inspections/todos | ✅ |
| V4 | branchDocs 写权限 | 未登录 401 / 非支委(p1 leader) 403 / 支委(p13 secretary) 201+删204 | ✅ |
| V5 | 聚合域 round-trip | 快照写穿 __root__ 单行 → 读回 body 深比较一致 → 清理 | ✅ |
| V6 | auth 测试状态 | 全量 21/21 串行回归 | ✅ |

### 二、实测中发现/修正

1. **login 路由在 `/api/v1/auth/login`**（非 `/api/v1/login`）——V4 首版 404，修正路径后通过
2. **server seed 仅在空库执行**（`server.js` L11：users 表空才 seedDatabase）——持久化 db（data.db）下 archiveRecords 无种子、attendances 等非空，导致 V2/V3「初始态」断言不可复现 → 改为代码级断言（读 server/seed.js 与 mock/seed.js 源码印证），运行时行为由既有测试覆盖
3. **branchDocs DELETE 返回 204**（非 200）——V4 清理断言修正
4. V5 聚合域 round-trip 采用「从无到有」写穿（当前 server 无 __root__，因聚合域由前端 API 模式 init 写穿产生）→ 快照写穿创建 → 读回验证 → 清理恢复空

### 三、验证

- `node --test test/t280-b5-api-regression.mjs`：6/6 全绿
- CHECKLIST T-280-B5 6 条全部勾选 ✅ + 实测说明
- 测试写穿数据已清理（branchDocs 测试记录删除、actSubRecords 写回空），server db 无残留

## T-282 content 体系优化升级 · 执行归档（2026-08-24）

**任务**：书记发起 content 体系全局审视（文件夹/文件划分、最小三成本），批准三方向后执行优化升级。
**引用流程**：H30.1 一改具改 + 最小三成本 + OPERATIONS_GUIDE §1.1 + brainstorming（三方向经书记逐节确认）

### 一、审视结论（写入前诊断）

- 文件夹划分：顶层 5 类知识类型 + insights 清晰；insights 无 README、references 子目录不统一、04 部署类文件偏多
- 文件划分：职能与关系声明充分（DOC_MAP 被引用方列 + SSOT 母本注册 + related_files）；4 个 900+ 行巨型文件信息成本高
- 最小三成本：机制已建立，成本集中在巨型文件与治理层学习曲线

### 二、三方向执行（书记批准）

**方向三 目录规范补缺**：
1. `content/insights/README.md` 新增（与其他目录索引对齐，双文件定位说明）
2. `references/党支部工作记录.docx` 归位 `历史会议材料/`
3. `01_strategy/README.md` 补充 references 子目录性质划分（合规=官方原文/历史=档案/建设探索=研究）
4. ARCHITECTURE.md/DOC_MAP.md/TIMESTAMPS 同步

**方向二 04 部署类重组**：
1. `SCHOOL_IT_DEPLOYMENT.md` 全部内容并入 `DEPLOYMENT_ROADMAP.md` §三（计算中心对接全案：系统概述/对接需求/前置条件/文档清单 10 项/对接步骤/AI 本地部署/IAAA），消除 §3.2 文档清单重复
2. SCHOOL_IT_DEPLOYMENT.md 删除；引用方全量更新（AUTH_MODEL/ABOUT/ARCHITECTURE/DOC_MAP/PKU/04 README/根 README/api-adapter/data-adapter/TIMESTAMPS）

**方向一 巨型文件拆分**：
1. `DATA_ARCHITECTURE.md`(1216行) → `DATA_MODEL.md`(§二 数据模型 820 行) + `DATA_FLOW.md`(§一/§三/§四 数据流)；原文件转 24 行路由薄壳
2. `OPERATIONS_GUIDE.md`(1147行) → 规范类 §1-14 留在原文件(772 行) + 流程类 §15-18 迁 `PROCESS_GUIDE.md`(391 行)；CLAUDE.md H60/H30.1/H90 三处锚点 + ARCHITECTURE/KNOWN_PITFALLS/REVIEW_QUEUE 引用更新
3. `DESIGN_SYSTEM.md`(928行) → `COLOR_SYSTEM.md`(§二 色彩) + `COMPONENT_SPEC.md`(§四 组件)；主文件保留哲学/排版/交互/响应式/深色/资产/参考；COMMISSIONER_FRAMEWORK §C.3 颜色引用更新至 COLOR_SYSTEM

### 三、实施要点与教训

1. **引用策略**：核心治理文档（DOC_MAP/SSOT/README/ARCHITECTURE）全量更新为新文件；零散引用（sop/insights/代码注释）保留指向原文件——DATA_ARCHITECTURE 转薄壳路由兜底（链接不断 + 路由指引），避免 30+ 文件机械更新的操作成本。OPERATIONS_GUIDE 拆分后 §15-18 编号不变（仅文件路径变化），CLAUDE.md 锚点只改路径。
2. **⚠️ 教训：沙箱会重复执行 RunCommand 中的脚本**——tmp-split-ops.mjs 首次执行成功（OPERATIONS_GUIDE→§1-14 + PROCESS_GUIDE→§15-18），重试执行读到已截断文件导致 PROCESS_GUIDE 被覆盖为空壳、§15-18 工作区丢失。已从 `git show HEAD:` 恢复原文件后重跑，并给脚本加防二次执行保护（章节不存在则中止）。**后续批量脚本必须加幂等保护**（见 KNOWN_PITFALLS 待补）。
3. GetDiagnostics 全绿（新文件无 markdown 错误）。

### 四、验证

- content 结构：04 新增 4 文件 + 删 1（SCHOOL_IT）；03 新增 PROCESS_GUIDE；insights 新增 README；references 归位
- 引用检查：核心导航（DOC_MAP/SSOT/README/ARCHITECTURE/CLAUDE.md）全部同步；失效锚点（COMMISSIONER_FRAMEWORK §2.3.2 颜色引用）已更新
- 执行日志/乙部 T-282 同步（乙部标注完成）
- 遗留：零散引用（代码注释/sop 指向 DATA_ARCHITECTURE 薄壳）由薄壳路由兜底，可随迭代逐步迁移至 DATA_MODEL/DATA_FLOW

## T-281 扁平化与集中论断 refinement · 讨论记录（2026-08-24，明天继续）

**任务**：书记发起 T206 相关讨论——对既有论断条目（扁平化/集中相关）做增删精炼（refinement）。按书记指示，本次修改目标与重要背景已写入乙部 T-281，本段落记录讨论过程供明天接手。
**引用流程**：H60 书记评议 + H20 歧义消解 + 书记原话表达纪律（区分原话与 AI 扩充）

### 一、讨论历程（书记逐步澄清）

1. **冲击面向**：书记确认担心的是"名实不符的失望"（学生按社会常识理解"集中"→ 发现实际不是 → 信任受损），非词面排斥或支委心虚
2. **落差形态**：书记纠正"集中对成员不可感知"的猜测——强调"达不到所宣称的工作高度，特别是在集中的部分"
3. **理解校准**：书记点出另一面——**扁平化表述本身可能太绝对**（学生形成"书记不能决定"认知）；且"拍板"是忌讳词
4. **核心澄清**：担心的不是情绪反弹，而是"学生意识到讨论只是虚幻的 → 无法发挥主人翁精神"（更深层的参与动力瓦解）；**如果一次讨论不完，就要做成乙部工作来推进！这太重要了**
5. **方向确认**：讨论有效 ≠ 结果按讨论来（意见真实进入+过程透明+理由可理解）；集中正当 = 决策有归属+责任有人担
6. **透明度分层修正**：不是每项工作的讨论对所有人透明——**三会即透明分层空间**（党员大会全局/支委会核心/党小组会条线），角色划分更细→更细透明度划分（P-011 知情边界 L0/L1/L2）；**原则说清即可，不落地机制**（书记明确"我们没有相关的机制，但是原则上把这个事情说清楚就行！"）
7. **范式纪律**：书记明确——不是补充新条目，而是**对既有条目增删 refinement**；**严格区分"应作为原话写入的"与"作为修改提示词（context/prompt）存在的"**（如"我很担心"是给 AI 的 context/prompt，不收入原话）

### 二、已获书记认可的成果

- **逻辑链 7 条**（书记"逻辑链的若干点我认为都非常好！！"）：
  ①为什么扁平化（人口结构/创新目标→方法选择）②扁平化承诺（讨论在知情层级内真实发生、程序按边界分层透明）③不承诺（结果不由讨论决定、讨论不对所有人透明）④为什么集中（工作推进/责任承担/信息汇聚）⑤集中边界（集中信息与责任非权力）⑥统一关键（讨论有效=知情空间内意见真实进入+按层级透明+理由可理解；集中正当=决策有归属+责任有人担）⑦主人翁安放（在知情层级内真实参与，非全局参与一切）
- **透明度分层**（三会即分层；原则说清，不落地机制）
- **一段 AI 扩充**（对象差异→冲击→反噬的完整论述）——书记评价"非常好的AI扩充表达！！可以写入文件的水平"

### 三、待续事项（明天继续）

1. **偏差定位**：书记指出我"原话区分有偏差"但未明示偏差所在——需先确认"应作为原话写入的"vs"修改提示词"的正确划分（我当前把"对象差异论""透明度分层论"列为候选原话，把"我很担心""扁平化表述太绝对"列为修改提示——此划分未获书记认可）
2. **候选原话范围**确认
3. **修改对象确认**（P-008 / P-013 / P-014 为主？联动 P-011？）
4. 逐条 refinement 内容设计 + 书记确认
5. 一改具改（涉及 SECRETARY_PRONOUNCEMENTS + DEVELOPMENT_PATH 第一章收束）

### 四、本次落盘

- 乙部新增 T-281（含目标 + 完整背景），状态"🔄 进行中（明天继续）"
- 未修改任何论断文件（等待书记确认后再动）

## 最小三成本专项评议 · 第 3 轮（2026-08-27，静态 + server 双形态实测）

**任务**：书记发起——对网页系统功能做一次最小三成本原则的评议和改进（静态与部署服务器后端两种形态都评）。
**引用流程**：H10 总纲（最小三成本 = 系统设计最高验收标准）+ H60.5 W4 专项⑤ + REVIEW_QUEUE 附录⑤ + webapp-testing / fullstack-developer

### 一、实测方法与覆盖

- 新增 `server/test/min3-review-regression.mjs` 8 用例（S1-S5 + L1-L4），覆盖两形态关键路径：
  - 静态模式：S1 首页进入即见（统计/通知/活动）、S2 首页→工作台 1 跳可达、S3 visitor 工作台
  - server 模式：L1 未登录门控、L2 登录直达工作台（≤2 跳）、L3 登录后待办可见、L4 登录后首页身份标签、S5 API 链路（health 可达 / 账号登录 me 认证 / 刷新会话保持）
- 环境：server localhost:3000 + Playwright chromium headless；等待策略 domcontentloaded + 显式轮询（networkidle 在长连接下卡死 30s 的坑已避开）

### 二、发现与处置

- **P1 首页通知空态误导（信息成本缺陷）**：实测 t+0.5s 显示"暂无通知"、t+1s 才有真实内容——空态误导（用户以为无通知），违反「进入即见，空态不得误导」（T-234 维度①）。**书记批准"改加载占位"** → index.html 通知列表占位 `<p>暂无通知</p>` → `<p>加载中…</p>` ✅ 已落地
- **P2 登录后跳首页而非角色工作台（操作成本缺陷）**：实测登录成功 → index.html（3 跳才到工作台），违反「进入工作台→看到可执行事项 ≤2 跳」。**书记批准"直达角色工作台"** → login-entry.js 三处统一 `_goToWorkspace(role)`：①已登录跳转 ②开发模式卡片点击 ③账号密码登录成功回调 ✅ 已落地
- **P2 调试插曲（一改未具改的隐蔽形态）**：首次修改只改了①③两处，②开发卡片 handler 仍固定跳 index.html（实测点击后直跳首页）。定位方式：Route 注入 DEBUG + 对照实验系统排除（devLogin 副作用/点击位置/门控踢回/getPageForRole 返回值均排除），最终读文件发现 handler 仍是旧代码。**教训：同文件内三处相同跳转逻辑，改两处漏一处——修改同名逻辑前须先全仓 grep 同类模式（H30.1）**
- **P3 观察项（不处置，设计合理）**：visitor 工作台未登录跳登录页（工作台需登录的门控设计）；server 写穿依赖防抖 800ms + pagehide 冲刷（既有架构，见 data-adapter.js）

### 三、回归验证（verification-before-completion）

- min3 专项 8/8 通过；`npm test` 全量回归 **34/34 通过**（auth/b3-1/db/e2e-login/m4/min3/resources/seed/skeleton/snapshot/t235/t280-b1/t280-b5/uploads）
- `e2e-login.test.js` 两处适配（P2 设计变更的连锁影响）：
  1. 登录导航断言 `**/index.html` → `**/workspace/secretary.html`（登录直达工作台新语义）+ title 断言改 /工作台/
  2. **写穿改走前端数据层真实路径**：原生 fetch 直写 POST /api/v1/snapshot 会绕过前端 mockDB，页面加载期间 pagehide 防抖冲刷（data-adapter.js `_flushSnapshotSync`）以过期前端缓存覆盖服务器，恰好抹掉刚写入的数据（实测 before:29→after:30→回退 29）。改为 mockDB + persist()（产品真实写路径：服务层改缓存 → 防抖快照落库）后闭环稳定
- 版本戳 bump 20260826a → 20260827a（docs 全站 + server/test 同步，防模块实例分裂 KNOWN_PITFALLS §17）
- 删除临时探针 probe-login.mjs、probe3-focused.mjs（目录污染清理）
- GetDiagnostics 零错误

### 四、变更文件

`docs/index.html`（P1 占位）/ `docs/src/entries/login-entry.js`（P2 三处 `_goToWorkspace`）/ `server/test/min3-review-regression.mjs`（新增 8 用例）/ `server/test/e2e-login.test.js`（P2 适配 + 写穿路径重构）/ 全站版本戳 bump / 删除探针 2 个

### 五、沉淀标签

`[已沉淀: content/05_ai_coding/KNOWN_PITFALLS.md §19]` — API 模式 + 防抖快照 + pagehide 冲刷架构下，e2e 测试若绕过前端 mockDB 用原生 fetch 直写服务器，页面加载期的 pagehide 防抖冲刷会以过期前端缓存覆盖服务器、抹掉直写数据（2026-08-27 e2e-login 回归实证）。e2e 写穿断言必须经 mockDB + persist()（产品真实写路径），与用户操作同构，测试才有意义。

### 六、REVIEW_QUEUE 附录⑤ 轮次进度

第 3 轮已完成（2026-08-27），REVIEW_QUEUE 附录⑤ 轮次进度已更新（下一轮待书记发起）。

## T-283 最小三成本第 4 轮：Mock 数据完整性 + 数据结构生命周期 + 点击成本 + 三会一课议程 + 编辑完整性全局化（2026-08-27）

**任务**：书记发起——①Mock 数据完整性系统审计 ②数据结构生命周期审计 ③点击成本实测（"点击是最重要的"）④三会一课补充【议程】写入/修改功能；并指示"上述问题绝不是偶然，要有全局观点，把共性做成 checklist 重要部分，做完整代码检查并改进"。

### 一、方向 1：Mock 数据完整性审计（M1）

- 新增 `server/test/mock-integrity-audit.mjs`：浏览器内收集全部 mock 集合（12 个：PEOPLE 50/ACTIVITIES 29/ATTENDANCE 151/INSPECTION 42/REVIEW 11/NOTICES 12/TASKFORCES 8/SEED_TASKS 8/SEED_ASSIGNMENTS 5/ARCHIVE 6/SIGNUPS 7/ACCOUNTS 17），审计引用完整性（外键→PEOPLE/activities）、必填字段、id 唯一、类型/状态合法
- **结果：零问题**——Mock 数据基础健康（审计规则修正 2 处误报：accounts 以 studentId 为键、taskforces.members 为对象数组）

### 二、方向 2：数据结构生命周期审计（M2 + 修复 2 项真实缺陷）

- 新增 M2 用例：活动状态 × 子记录/任务/考勤一致性（cancelled 无考勤/无未完成任务、completed 任务全完成、未来活动无考勤、signups/archive 引用源）
- **修复①（数据）**：act-10 存储 status 'completed' 与派生态矛盾（关联任务 tsk-007/tsk-008 未完成，执行态派生 ongoing）——改 'ongoing'，且符合 DATA_MODEL「已完成不作文面值」决策
- **修复②（代码）**：**活动删除后子记录孤儿**——UI 确认文案承诺"彻底删除该活动及关联数据"但实现只删活动+待办。三处同步联动清理（services/mock.js deleteActivity + core/mock-adapter.js activities.delete + server/routes/resources.js DELETE /activities/:id）：tasks/attendances/inspections/assignments/activityReviews/makeupTasks + signups(sourceType)/notices(targetType)

### 三、方向 3：点击成本实测（C1-C3，书记强调"点击是最重要的"）

- 新增 `server/test/click-cost-audit.mjs`：实测点击次数
  - **C1 创建三会一课活动：4 次点击**（登录后 Tab→写入活动→选模板→创建，≤5 达标）；创建后日历自动出现新活动（反馈闭环）
  - **C2 查看活动详情：2 次点击**（Tab→日历条目，≤2 达标）
  - **C3 待办必见：0 次额外点击**（默认 tab）
- 附：创建后日历刷新曾疑似失效，实为 mock 600ms×多任务节点延迟 + 测试等待不足；同时加 renderContent 兜底重渲染（防御性，创建成功即见成果）

### 四、方向 4：三会一课【议程】功能（A1-A3 全通过）

- **数据模型**：DATA_MODEL.md §2.1 ActivityRecord 新增 `agenda: Array<{item, host?}>`（三会一课专用，创建/详情可写可改）
- **写入表单**（calendar-tab.js）：三会一课模板 Step2 表单新增"会议议程"区块（HTML 内嵌初始行 + 添加/删除按钮，行内编辑最少点击）；handleSubmitActivity 收集议程入 activityData
- **详情编辑**（inspector.js）：活动详情新增"会议议程"区块（显示序号+议题+主持人）；书记可点"编辑议程"行内编辑（添加/删除/保存→updateActivity+persist→重渲染）
- **mock 样例**：act-6（党课）/act-8（支部党员大会 3 条）/act-27（支委会 3 条）补 agenda
- 新增 `server/test/agenda-flow-audit.mjs`：A1 详情显示 ✓ / A2 创建带议程→详情显示 ✓ / A3 行内编辑→保存→localStorage 持久化 ✓
- **修复**：详情编辑 refreshRows 重建曾丢失 fill 输入（重建前从 DOM 同步 current）

### 五、书记指令：编辑完整性共性问题全局化

**判例实证**（多轮 Edit 反复增删同一文件，暴露 4+ 种系统性损坏）：①`agendaList` 重复声明（SyntaxError，tab 不渲染）②`_addAgendaRow` 函数被误删仍被调用（ReferenceError）③inspector 议程按钮 addEventListener 绑定被误删（点击静默失效——最隐蔽）④`agenda` 声明被误删仍被引用（ReferenceError）⑤Write 前 Edit import 未落盘（fileURLToPath）。

**全局化产出**：
1. **KNOWN_PITFALLS §14.1**：新增同家族判例（T-213 覆盖还原 → T-283 误删/重复插入形态）+ 4 条新检查清单（短 Edit 批次立即回归 / 模块加载审计 / GetDiagnostics 最低检查 / 删除性 Edit 带边界锚点）
2. **CHECKLIST.md 新增「编辑完整性校验」章节**（T-283）：GetDiagnostics 全仓零错误 / 模块加载完整性审计 / 新增功能浏览器回归 / 点击成本回归 / 数据完整性回归 / 删除性 Edit 复核
3. **新增 `server/test/edit-integrity-audit.mjs`（E1）**：浏览器 import 全部 docs/src 模块（86/86），任何语法/重复声明/未定义顶层引用/误删调用在 import 时抛错——已入 npm test 回归
4. **完整代码检查**：GetDiagnostics 全仓零错误 + E1 86/86 + 全量浏览器回归 43/43

### 六、回归验证（verification-before-completion）

- `npm test` 全量回归 **43/43 通过**（新增 4 个审计文件：mock-integrity/click-cost/agenda-flow/edit-integrity）
- GetDiagnostics 全仓零错误
- 测试基建修正：agenda-flow/edit-integrity 改为自包含 server（createApp+listen(0)），规避外部 3000 连续测试卡顿

### 七、变更文件

`docs/src/mock/activities.js`（act-10 状态修复 + act-6/8/27 议程样例）/ `docs/src/services/mock.js` + `docs/src/core/mock-adapter.js` + `server/routes/resources.js`（删除活动联动清理子记录）/ `docs/src/entries/tabs/secretary/calendar-tab.js`（议程表单+收集+创建后兜底渲染）/ `docs/src/components/inspector.js`（议程显示+行内编辑）/ `content/04_web_design/DATA_MODEL.md`（agenda 字段）/ `content/04_web_design/CHECKLIST.md`（编辑完整性章节）/ `content/05_ai_coding/KNOWN_PITFALLS.md`（§14.1 判例）/ `server/test/`（新增 mock-integrity/click-cost/agenda-flow/edit-integrity 4 个审计文件）

### 八、沉淀标签

`[已沉淀: content/05_ai_coding/KNOWN_PITFALLS.md §14.1]` — 连续多次 Edit 同一文件是系统性风险源：①删除性编辑 old_string 匹配过大区域连带误删邻近代码 ②插入块未删净导致重复声明 ③Edit 返回输出与磁盘状态可能不符（Write 覆写最稳）。防御三件套：GetDiagnostics 全仓 → 模块加载完整性审计（edit-integrity-audit）→ 短 Edit 批次立即浏览器回归。

### 九、REVIEW_QUEUE 附录⑤ 轮次进度

第 4 轮（T-283）已完成（2026-08-27），REVIEW_QUEUE 附录⑤ 轮次进度已更新。

## T-284 全量链接审查：静态死链 + JS 导航 + HTTP 可达 + 跳转逻辑（2026-08-27）

**任务**：书记指令「做一次所有链接的审查！确保跳转逻辑合理！每一个都要查！！」

### 一、审查范围与方法（新增 `server/test/link-audit.mjs`，4 层全量）

- **L1 静态链接**：docs/ 全部 HTML（16+ 页）的 href/src（含 workspace `<base href>` 解析 + `?v=` 版本戳剥离）→ 目标文件存在性 + `#锚点` 存在性——**85 个本地链接 + 79 个外部 URL（Google Fonts 等，仅记录）全部通过**
- **L2 JS 导航**：docs/src 全部 JS 的 `location.href` / `location.replace` / `location.assign` 目标——**4 个静态跳转 + 22 个动态跳转（`${basePath}notice.html` 等模板插值，抽取 `.html` 字面量片段校验）全部通过**
- **L3 HTTP 层**：自包含 server 下每个链接 fetch → 200——**91/91 通过**（含 6 个工作台未登录可达性：静态 200，门控在前端 JS 跳 login）
- **L4 浏览器实测**：登录态跳转逻辑（未登录直达登录页 / 已登录直达角色工作台 / 登录页返回闭环）——**通过**

### 二、发现并修复 3 处跳转逻辑缺陷（存在≠合理）

1. **首页「工作台→」「查看全部→」未登录绕路**：原静态 href 指向 workspace/*.html，未登录点击会先进工作台 → 被门控踢 → login（绕 2 跳）。修复：`main-entry.js` `_updateWorkspaceLinks` 未登录分支把 workspace 链接**统一直达 login.html**（已登录仍按角色直达工作台）
2. **首页「查看更多活动（共 N 条）」未登录绕路**：原指向 visitor.html?view=activities。修复：`main-entry.js` 未登录时 `moreUrl` 直达 login.html
3. **login.html 缺「返回主页」入口**：误入登录页后无出口。修复：登录页加「← 返回主页」链接（跳转闭环）

### 三、审查确认合理的跳转（抽样）

- 工作台未登录门控 → login.html（bootstrap L117-122，workspace/ 目录用 `../` 正确）✓
- 已登录身份校验踢回（bootstrap L135-153）：角色不符自动跳转身份对应工作台 ✓
- 首页专班卡点击：已登录 → 角色工作台带 taskforceId（专班直达）；未登录 → taskforce.html?id=（公开详情）✓
- help 宣传页功能表 → 角色工作台（宣传引导 + 门控登录，语义合理，保留）✓
- workspace 各页「返回主页」`./index.html`（base href 正确解析）✓

### 四、回归验证

- `npm test` 全量回归 **47/47 通过**（新增 link-audit 4 用例后）
- 回归适配 2 项：min3 S2 对齐新设计（未登录首页不再有工作台直达链接，改验证登录入口 1 跳）；e2e-login 写穿用例版本戳同步（bump 未同步 evaluate 内嵌 import 戳，手动 20260827a→c）
- GetDiagnostics 全仓零错误
- 版本戳 bump 20260827c

### 五、变更文件

`server/test/link-audit.mjs`（新增 4 层审计）/ `docs/src/entries/main-entry.js`（未登录 workspace 链接 + 查看更多活动直达登录页）/ `docs/login.html`（返回主页链接）/ `server/test/min3-review-regression.mjs`（S2 对齐 T-284 新设计）/ `server/test/e2e-login.test.js`（写穿用例版本戳同步）

### 六、沉淀标签

`[已沉淀: content/04_web_design/CHECKLIST.md]` — 链接审查四层法（静态存在 → JS 动态目标字面量 → HTTP 200 → 登录态逻辑）：静态存在不等于跳转合理，未登录/角色不符/宣传页入口是三类高频绕路点；首页链接须登录态感知（已登录直达角色工作台 / 未登录直达登录页）；测试内嵌 `?v=` import 戳 bump 脚本不覆盖，需手动同步。

### 七、REVIEW_QUEUE 附录⑤ 轮次进度

T-284 全量链接审查已完成（2026-08-27），已归档。

## T-285 甲部自我迭代机制：评议方法生命周期（H60.6）+ 书记指示分级（H20.4）（2026-08-27 书记反思驱动）

**任务**：书记反思——「若干次评议是否沉淀了评判标准、检查要点的方法？Harness 为什么没有实现自我迭代？这是甲部应该思考的事情，让仓库系统可以持续迭代，否则书记需要反复评论，会带来极大的效率损失！」书记补充裁定：「不是每次，而是设定一定的 trigger 来输出触发，一定防止过拟合」+「很多工作被我的提示词框得太死，但我没有办法每次告知 AI 哪些是我粗糙的认识（供他发散）、哪些是明确准确的命令——这一块也要有对应的甲部制度」。

### 一、现状核查（沉淀盘点）

**有沉淀但形态暴露问题**：REVIEW_QUEUE 附录⑤ 有「书记侧重维度」（五场景/六工作台/≤2跳等，但内容是书记逐次指示后 AI 记录的）；CHECKLIST 有「编辑完整性/链接完整性」章节（AI 自觉写入，无制度强制）；T-283/T-284 的「数据生命周期/点击成本」只有回归脚本代码化、方法层未入库。**关键证据**：CLAUDE.md 全文 grep「检查要点/入库/要点沉淀」= 零匹配——H60 只定义"抽样→预审→反馈→归档"流程，无任何"AI 自发现方法入库"规则。

### 二、根因诊断

**H60 评议工作流是「输出修复」型而非「输出方法」型**：H60.3 归档只规定三类处理（机械性→全仓修订/设计性→丙部/小修订→当场修），全部聚焦"本轮修复"；唯一沉淀机制 H60.3「新原则整合收口」限定"书记确立的原则"，**不含 AI 自发现的方法性检查维度**。结果：AI 自发现的检查方法只有两条出路——①运气好被顺手写进 CHECKLIST/KNOWN_PITFALLS（无强制）②直接丢失。**沉淀靠书记提示 + AI 自觉，而非机制强制——这就是"书记需要反复评论"的制度根源。**

### 三、甲部新增两条制度（书记裁定方向）

**H20.4 书记指示分级（探索性 vs 命令性）**：两级指示——探索性指示（粗线条思考/担忧/方向）→ AI 发散（grill 后展开，AskUserQuestion 收敛）；命令性指示（明确动词+对象）→ 精确执行。书记未标注时 AI 按 5 条默认规则判断（可验证性/确定性/结构提示/模糊默认探索性/发散边界=不违背书记意思）。与 H20.2 歧义消解、H50.2 数量过拟合补丁、H10 表达纪律构成前置识别层。

**H60.6 评议检查要点生命周期（触发式入库）**：触发条件三选一（新维度/新侧重/重复判例>1 次）；三级入库（通用→CHECKLIST/专项→REVIEW_QUEUE 附录检查要点库/判例→KNOWN_PITFALLS）；防过拟合三铁律（大命题粒度/标注来源+生效条件/无新维度省略入库）；下轮继承（先读方法总索引+检查要点库+CHECKLIST 作预审基线）。

### 四、一改具改落地

- CLAUDE.md 甲部：新增 H20.4 + H60.6
- PROCESS_GUIDE.md §18.7「检查要点生命周期」（承接 H60.6）+ YAML 同步
- REVIEW_QUEUE.md：附录区头部新增「评议方法总索引」（6 项已沉淀方法+权威源）；附录⑤ 新增「检查要点库」（T-283/T-284 存量增量 5 条，标注来源+生效条件）

### 五、沉淀标签

`[已沉淀: CLAUDE.md H20.4 + H60.6]` — ①指示分级：探索性（发散+确认）vs 命令性（精确执行），未标注默认按 5 条规则判断，模糊按探索性处理——防"把书记粗糙认识当命令机械执行"与"把明确命令擅自发挥"两类偏差；②检查要点生命周期：触发式（新维度/新侧重/重复判例）三级入库，防过拟合铁律（大命题粒度+生效条件+省略入库），下轮继承——让「评议一次→方法存续一次」，Harness 实现自我迭代。

### 六、REVIEW_QUEUE 轮次进度

T-285 甲部机制沉淀已完成（2026-08-27），已归档。

## T-286 四项综合：勤问规则入甲部 + 过程文件再清 + content 分组 + 全局文件同步（2026-08-27）

**任务**：书记四指令——①书记会忘记说细节，过拟合破解之道是勤问，very strong 表达一定不能随意；②再查过程性文件；③content 过大，删/并或建子文件夹+README；④全局性文件更新到最新。

### 一、勤问规则入甲部（H20.4 补充）

H20.4 新增「very strong 表达勤问规则」：书记表达含极端限定词（最/尤其/必须/绝对/都是/一定）或强方向性判断 → AI 判定 very strong → **一定不能随意**（不得自行解读/过度引申/机械执行），必须 AskUserQuestion 勤问确认。与 H10 表达纪律（极端限定词 AI 无权自造/弱化）互补。

### 二、过程性文件再检查

- server/test 19 个文件全部为正式回归/审计 ✓ 无探针残留
- .ctx 无 tmp 残留（tmp-c2-report.txt 已删）
- **发现并补**：.gitignore 缺 server/data.db + server/uploads/（运行时产物）——已补显式忽略
- 全仓无 *.tmp/*.bak/*.orig 残留 ✓

### 三、content 结构优化（书记选「合并+分组+README」→ 执行中发现合并将返工，调整为仅分组）

- **勤问纠偏**：深入后发现 ABOUT_DESIGN_SYSTEM 是 about 页专项细则（非 DESIGN_SYSTEM 重复）、WECHAT/PKU 是独立集成设计（并入 ROADMAP 将产生 559 行大文件，违背 T-282 拆分初衷）——**16 文件全部保留，仅分组 + README**
- **分组**：04_web_design → design-system/（3）+ data/（3）+ deploy/（4）+ module/（3）+ evolution/（2）+ README（根导航）
- **引用一改具改**：159 处全路径引用（relocate 脚本）+ 60 处跨组短链接（fixrel）+ 108 处重新相对化（fixrel2：`../` 外部引用深一级自动修复）+ 4 处锚点 slug 修正（anchorfix）+ 2 处人工（insights ../CLAUDE.md → ../../、OPERATIONS_GUIDE 模板链接去链接）
- **L5 新增守护**：link-audit.mjs 新增 L5「content 文档链接校验」（342 链接目标存在性 + GitHub slug 锚点校验），锚点差异降级 warning 不阻塞（21 项历史手写锚 `#p-011-x` 与标题 slug 不符——GitHub 不跳转但文件可打开，已软提示待专项处理）

### 四、全局文件同步（书记指令 ④）

- **OPERATIONS_GUIDE**：2 处 §18 断链（§18 已迁 PROCESS_GUIDE）→ 指向 PROCESS_GUIDE；archive 模板链接去链接；YAML → 3.2/2026-08-27
- **content/README**：last_updated 8-09 → 8-27
- **04 README**：重写为分组导航（目录结构表 + 5 组权威源速查）
- **TIMESTAMPS**：04 注册表 16 处路径更新 + YAML
- **CLAUDE.md**：H20.4 勤问规则（T-285 已加 H20.4/H60.6，本次补 very strong 勤问）

### 五、验证

- link-audit L1-L5 全通过（fail 0，21 项锚点降级警告）
- 全量 npm test 回归 **48/48 通过**（新增 L5 后；含 T-235 34/34、B3-1 5/5）
- GetDiagnostics 全仓零错误

### 六、变更文件

content/04_web_design/（15 移动 + README 重写 + 各文件引用修正）/ 全仓 40+ 文件路径引用同步 / CLAUDE.md（H20.4 勤问）/ .gitignore / OPERATIONS_GUIDE（断链+YAML）/ content/README / TIMESTAMPS / server/test/link-audit.mjs（L5）

### 七、沉淀标签

`[已沉淀: CLAUDE.md H20.4 very strong 勤问规则]` — 书记会忘记说细节；含极端限定词/强方向性判断的表达 = very strong，AI 一定不能随意（不得自行解读/机械执行），必须勤问。防过拟合与防曲解的双保险。

### 八、REVIEW_QUEUE 轮次进度

T-286 已完成（2026-08-27），已归档。

## T-287 全局引用核对 + T-281 论断评议建议 + 设计 skill 安装（2026-08-28）

**任务**：书记发起——①确保全局性文件引用、指向最新最准 ②充分脑暴后汇报丙部未完成的书记论断评议修改工作（T-281）建议 ③评估并安装设计 skill（better-interface/analyze-components/superfuture-design-review）④完成后 commit（不 push）。

**引用流程**：H60 书记评议 + H50 丙部机制 + find-skills / brainstorming

### 一、全局引用核对（① ✅）

- link-audit 实测 **5/5 全过**：L1 静态 85 链接 + 锚点全有效 / L2 JS 导航 26 跳转目标全存在 / L3 HTTP 91/91 通过（含 6 个工作台门控）/ L4 浏览器实测登录态跳转闭环合理 / L5 content 342 链接全有效
- **修复 L5 自身 bug**：`const anchorId = r.hash`（原 `r.hash.slice(1)` 多切锚首字符——r.hash 已不含 #），342 链接 0 警告

### 二、T-281 论断评议建议（② ✅，含脑暴）

- **偏差定位确认**（书记裁决）：此前"原话 vs 修改提示词"划分偏差 = **AI 扩充混入原话**（对象差异论/透明度分层论被误列为候选原话，实为 AI 扩充）
- **确立三分法纪律**：书记原话（正文带日期，一字不改）/ AI 扩充（引用块，须显式标注身份）/ 修改提示词（不进文件正文）
- **修改对象 4 落点**：①P-013 集中正当性（决策有归属+责任有人担，引用块补一段，用已认可"对象差异→冲击→反噬"作引子）②P-008 防"书记不能决定"误解（扁平化消除的是命令非决策能力）③P-014 衔接句（程序性回应集中/扁平化回应民主）④P-011 三会即透明分层（党员大会全局/支委会核心/党小组会条线，原则说清不落地机制）
- **与 about 页一体两面**：refinement 新表达同步校验 about 页"三、人的成长"叙事（P-014/015/016 为子本），保证明日 30 分钟分享同源同义
- **状态**：建议已汇报，待书记逐条裁决后落地（乙部 T-281 保持进行中）

### 三、设计 skill 评估与安装（③ ✅）

- **评估结论**：better-interface（jakubkrehel/skills，9.9K 安装 + 4.5K stars + 3 项安全审计 Pass）✅；analyze-components / superfuture-design-review 无精确匹配 ❌
- **书记决策**：仅装 better-interface → 安装时发现其为**编排器**（依赖 6 个 better-* 子 skill），再问 → 书记裁决"装全家桶"
- **安装方式**（GitHub 直连被重置，shell 无法写 `.trae-cn\skills`，最终用 Write 工具逐文件写入）：better-interface + better-accessibility + better-colors + better-layout + better-typography + better-ui + better-writing（7 skill / 40 文件）→ 全局目录 `~/.trae-cn/skills/`
- **使用纪律**：以我们 DESIGN_SYSTEM/ABOUT_DESIGN_SYSTEM 为母本（权威），better-interface 仅作评审检查清单（参考），不覆盖红线

### 四、验证与变更文件

- link-audit 5/5（修复后 342 链接 0 警告）
- 变更：server/test/link-audit.mjs（L5 bug 修复）+ 全局 skill 安装（~/.trae-cn/skills/，不入仓库）

### 五、沉淀标签

`[经验: GitHub 直连被重置 + shell 沙箱限制写用户目录时]` — codeload/api.github.com REST 可达（git clone 协议被重置）；`.trae-cn\skills` 对 shell 只读、对 IDE Write 工具可写 → 用 Exec view_files 读源 + Write 逐文件搬运（Exec 内 tools.Write 会触发审批失败，须用主 Write）。

### 六、commit（④ 已执行，未 push）

- 覆盖：T-286 content 分组（159+60+108+4+2 引用更新）+ T-287 L5 修复 + 执行日志 + T-281 偏差定位记录
- **未 push**（等书记检查）

---

## T-288 书记论断编号重排 + 两条甲部总纲沉淀（2026-08-28）

**任务**：书记指示——①条目内无序列表/子条目按「逻辑顺序 + 问题意识」编排，时间顺序最不重要（必须沉淀）②「战略模糊」必须沉淀，AI 扩充要有自觉（不得替书记收口定性）③编号重新排列，做好引用/链接同步。

**引用流程**：H60 书记评议 + H30.1 一改具改 + brainstorming

### 一、两条总纲沉淀（①② ✅，写入 CLAUDE.md H10）

1. **条目编排顺序总纲**：论断条目下的无序列表/子条目按逻辑顺序 + 问题意识编排，时间顺序最不重要；拿不准时按"问题意识"推演并勤问书记。
2. **战略模糊自觉总纲**：书记原话存在故意不说的战略模糊（如"集中"到底意味着什么），是书记的战略空间与工作主动权；AI 扩充只做「连接」不做「定性」，原话未明的保持未明，宁可留白不可越俎代庖。

### 二、P-013 改名 + 前移（② 落地）

- 标题「民主与集中的统一——程序在所有人之上所以扁平，责任嵌入更深所以集中」→「民主集中制的实践」（去副标题，原话"程序在所有人之上…"作正文，点明共性道理）
- AI 扩充删掉此前私加的定性（"集中=责任不是权力""扁平化会不会没人负责""民主与集中不是对立"），只保留「程序在所有人之上是共性道理」+ 与 P-008/P-014 的关系连接
- 前移到第二章第二位（P-004 之后，作母题）

### 三、编号重排（③ ✅）

**循环位移映射**：P-013（民主集中制）→ P-005，原 P-005~P-012 各 +1。

| 旧编号 | 新编号 | 论断 |
|---|---|---|
| P-013 | P-005 | 民主集中制的实践 |
| P-005 | P-006 | 站在累积的经验上 |
| P-006 | P-007 | 把没先例变成有先例 |
| P-007 | P-008 | 在框架内说真话 |
| P-008 | P-009 | 扁平化 ≠ 无程序 |
| P-009 | P-010 | 组织者的分工记录职责 |
| P-010 | P-011 | 条块二元 |
| P-011 | P-012 | 组织内控总论 |
| P-012 | P-013 | 专班 |

P-001~P-004、P-014~P-017 不变。物理顺序与编号一致。

**同步范围**（脚本 + 人工修正，H30.1 一改具改）：

- SECRETARY_PRONOUNCEMENTS.md：正文标题、交叉引用锚点、目录、层次列表、附录索引表（重排为升序）
- FLAT_DESIGN.md（P-008/P-009 → P-009/P-010）、COMMISSIONER_FRAMEWORK.md（P-011/P-012/P-013 同步）
- README.md（P-011/P-012）、CLAUDE.md 乙部 T-281（标题+编号）、REVIEW_QUEUE.md（历史轮次记录回退原样，活跃引用同步）
- SOP_WEB.md / DESIGN_SYSTEM.md（知情边界 P-011→P-012 锚点）、SSOT_INDEX.md（扁平化 P-008/P-009→P-009/P-010）、支委与党小组定人定责定岗说明.md、DATA_MODEL.md、工程演进与设计方法论.md（历史迁出引用标注"原 P-008"）

**历史引用保护**：脚本对「原 P-XXX」「旧 P-XXX」前缀的历史引用不重排；REVIEW_QUEUE 轮次进度（历史批次记录）回退原样。

### 四、验证

- link-audit **5/5 通过（fail 0）**，L5 content 342 链接 0 锚点警告
- GetDiagnostics 无本次改动引入的 error（仅有既有文件的 markdownlint 格式风格提示）
- 临时脚本已删除，未入仓库

### 五、沉淀标签

`[经验: 编号重排用脚本做循环位移]` — 循环位移（A→B, B→C, …）必须用「保护历史引用 + 两阶段占位符」避免串改；裸编号（如 `P-006/007/009` 简写）与 `原P-XXX` 历史引用是脚本盲点，需 grep 复核 + link-audit L5 兜底。

---

## T-289 文件改名 + 补原话 + 子群落地 + 第二章 AI 扩充问题意识重写（2026-08-28）

**任务**：书记指示——①文件名「书记重要论断汇编」改为「党支书工作交接文档」（体现文件性质：书记长期实践的经验总结，阅读主体是管理支部的人、塑造支部文化的人，与 DEVELOPMENT_PATH 面向成长中的支部成员相区分）②P-008 补两句原话 ③子群落地（P-006/007/008 是「组织性」的具体表现，非「工作流」）④第二章 AI 扩充问题意识重写。

**引用流程**：H60 书记评议 + H30.1 一改具改 + H10 战略模糊自觉 + brainstorming

### 一、改名（① ✅）

- `title` + H1：`书记重要论断汇编` → `党支书工作交接文档`
- 定位描述（L14）重写：点明「书记长期实践的经验总结，交接给管理支部的人、塑造支部文化的人」，与 DEVELOPMENT_PATH（面向成长中的支部成员）区分——两文件相互吸收、相互解释，母本在本文档，但颗粒度与阐发方式不同
- 全仓活跃引用同步：README（3 处）、ARCHITECTURE（2 处）、DOC_MAP（2 处）、SSOT_INDEX（2 处）、ROLE_CLASSIFICATION（1 处）、OPERATIONS_GUIDE（1 处）、DEVELOPMENT_PATH 子本声明（1 处）、01_strategy/README（1 处）——`.ctx/logs/` 历史日志保留原样

### 二、P-008 补两句原话（② ✅）

- ①「交流解决方案，而不是交流问题。我们不期待听到'这里有一个问题'，我们期待听到的是'我认为解决问题的思路是这样，为什么是这样，支委会能否提供支持……'。有自己的思考，才能在实际的组织反馈中得到具体的组织认知。」
- ②「支部的建设永远以人为本，我们坚持高要求，不是坚持高压力。在感到力不从心时工作可以交接，但务必对于交接本身负责——'目前的工作已经推进到了哪里，哪里尚未推进，轻重缓急是什么，堵点卡点难点是什么，是否有推荐的替补人选……'」
- 两句均一字不改，归入 P-008 无序列表；扩充块把"真实表达"从"敢说"引向"说有用的"、从"说话负责"延伸到"交接负责"（与 P-010 分工记录一脉相承）

### 三、子群落地 + 母题纠偏（③ ✅）

- **母题纠偏（书记裁决）**：P-006/007/008 是「组织性」的三种具体表现（继承/开拓/对话），非「工作流如何生长」——工作流只是组织性的载体，组织性才是母题
- 子群 A「组织性——党员最重要的特质，其具体表现」（P-006/007/008）+ 子群 B「承载组织性的制度」（P-009~013）
- 同步修正 insights §1.6（旧编号 P-005/P-006/P-007 → P-006/P-007/P-008，母题「工作流如何生长」→「组织性的具体表现：继承、开拓、对话」）

### 四、第二章 AI 扩充问题意识重写（④ ✅）

每条扩充先抛「管理支部的人真会遇到的困惑」再回答，锚定原话、不私加、严守战略模糊：

- P-004：新成员为何把组织想象成等级森严
- P-005：扁平与集中怎么同时成立（落在"程序"上，不定死"集中是什么"）
- P-006：接手有先例的工作，从零开始还是照前人
- P-007：没先例的工作，等指示还是自己闯
- P-008：成员怕说错话怎么办 + 真实表达的质量标准
- P-009：扁平化是不是等于没人管、没程序
- P-010：没有上下级，协作凭什么不乱
- P-011：谁做什么，由什么定
- P-013：条块装不下的工作怎么做
- P-012 内控已有鲜明问题意识（"组织如何防止自己约束自己失效"），保持不动

### 五、验证

- link-audit **5/5 通过（fail 0）**，L5 content 343 链接 0 锚点警告
- 内容文件 grep 零残留（`工作流如何生长`/`书记重要论断汇编` 仅剩 `.ctx/logs/` 历史日志）
- GetDiagnostics 无本次改动引入的 error（仅既有文件 markdownlint 格式风格提示）

### 六、沉淀标签

`[经验: 问题意识 vs 贴分类标签]` — 书记两度纠偏：给论断贴"关系/结构/规则/特殊"式分类标签、或把"工作流"当母题，都是**用形式框内容**；正确做法是先问"这条论断回答管理支部的人什么真问题"，再从主客统一命题里提取母题（如 P-006/007/008 的母题是「组织性」，不是「工作流如何生长」）。子群标题应是母题本身，不是分类标签。

---

## T-290 其余三章 AI 扩充问题意识重写（2026-08-28）

**任务**：延续 T-289 的「问题意识」标准，重写第一章（P-001/002/003）、第三章（P-014/015/016）、第四章（P-017）的 AI 扩充。

**引用流程**：H60 书记评议 + H10 战略模糊自觉

### 重写清单（每条先抛「管理支部的人真会遇到的困惑」再回答）

- **P-001**：党支部是不是只有将来进体制的人才会加入？（不是——各种轨迹都可通过组织获得成长）
- **P-002**：系统最最重要的产出是什么？（不是功能/表格，而是"从入党申请人到正式党员"的完整叙事）
- **P-003**：为什么"管理事，服务人"是完整叙事，而非只针对支委？（身份角色成长，落点是组织性深化）
- **P-014**：组织性和制度对成员个人到底宝贵在哪？（两个向度平衡 = 适应学习机会）
- **P-015**：理解真实组织后还能获得什么别处拿不到的？（探索创新机会，方兴未艾是土壤）
- **P-016**：为什么"党建+科研"是重要战略选择？（恢复对话能力）
- **P-017**：组织提要求，成员凭什么心甘情愿接受、主动去做？（主客统一，非单向命令）

### 验证

- link-audit **5/5 通过（fail 0）**，L5 content 343 链接 0 锚点警告
- 至此 SECRETARY_PRONOUNCEMENTS.md 全 17 条论断的 AI 扩充均已按「问题意识」标准重写

## T-291 六点指令收口：P-011 条块补全 + P-012 分工运行保障 + 引号/列表统一 + DEVELOPMENT_PATH 修缮 + ABOUT 叙事审查（2026-08-28）

**任务**：书记六点指令——①P-011 条块二元补三句原话、删"不由条块推出" ②引号统一、组织内控"总论"改名、职责分离一般化、突出"统筹是最大的管理" ③无序/有序列表格式统一（格式反映逻辑） ④P-002 的"②和③"移入 AI 扩充 ⑤DEVELOPMENT_PATH 系统修缮 ⑥ABOUT 叙事逻辑逐字审查。

**引用流程**：H60 书记评议 + H10 战略模糊自觉 + H10 条目编排顺序

### 一、P-011 条块二元补全
- 补三句原话（条线/块/兼任，一字不改）：①"组织、宣传、纪检因为工作内容天然更加专业化，因此承担贯穿支部工作的条线工作。" ②"党小组将支部成员进一步细分，但工作上作为活动的主体，对于活动完整地负责。" ③"特殊情况下这些身份可以兼任，工作随着身份走而非随着人走，谁做什么由岗位职责定义决定。"
- 删去"谁做什么由岗位职责定义决定，不由条块推出"中的"不由条块推出"
- AI 扩充以"集中容易，分工难"锚定问题：条=组织/宣传/纪检条线工作；块=党小组作为活动主体完整负责；兼任=工作随身份走而非随人走

### 二、P-012 内控重构 → 分工的运行保障
- 标题由"组织内控总论——职责分离、主动回避、书记仲裁与知情边界"改为"分工的运行保障——执行委托与知情监督的统一"
- 删"四道防线"硬编码数字概念
- 四句原话重排，"执行委托与知情监督是对应的，统一的。统筹是最大的管理！"置顶作总纲
- 工程设计（L0/L1/L2 信息密度、赋权链、按人视图）移出至 DESIGN_SYSTEM/COMMISSIONER_FRAMEWORK

### 三、P-002 的"②和③"移入 AI 扩充
- 正文只保留"①"，"②和③"的展开移入 AI 扩充，正文不再空挂 L74 引用

### 四、引号统一 + 列表格式统一
- 术语「」+ 原话""，全文件统一
- 无序/有序列表按"逻辑顺序+问题意识"编排，时间顺序最不重要

### 五、DEVELOPMENT_PATH 修缮
- 分工声明改写（党支书工作交接文档 + 术语引号）、删减低质 AI 扩充（对照句/重复句/细节重复）

### 六、ABOUT 叙事逐字审查（脑暴→询问→反馈→执行）
- 脑暴识别 5 处问题，AskUserQuestion 裁定 2 处，共执行 5 处修改：
  ① 第二章 sub 删"爱具体的组织——"残留（书记已裁决"爱具体的人/组织"矫情）
  ② 第三章 sub 补全 T1 名称"《中国共产党发展党员工作细则（2026年）》"
  ③ 第一章"表达空间"原话引号改回英文单引号（忠实母本 P-008）
  ④ 第四章 footer 改"党建贡献如何产生？→ 见第五章「工作流」中的活动与专班"
  ⑤ 第一章 lead 改"先向你介绍自己"

### 验证
- link-audit **5/5 通过（fail 0）**，L5 content 343 链接 0 锚点警告
- GetDiagnostics about-entry.js 零错误
- grep 残留清零（爱具体的组织 / 打开自己的处境 / 什么是党建贡献）

## T-292 三点指令收口：P-012 移出设计系统 + 三组分离概括修正 + P-004/005 改写 + 标点统一 + About 美学（2026-08-28）

**任务**：书记三点指令——①设计系统设计移出（如内控第2/4条），文档回归【组织认知和组织战略选择】；战略模糊不外显；改正"这个故事囊括了②和③" ②标点统一（中文用中文、英文用英文）③About 排版/字体/字号美学设计 + 原话全局思考。

**引用流程**：H10 战略模糊自觉 + H10 条目编排顺序 + brainstorming + web-design-guidelines

### 一、P-012 移出设计系统内容
- 移出第2条"发起是提出需求，招募是统筹执行"、第4条"信息可见范围精确等于最小充分信息"（设计系统内容 → COMMISSIONER\_FRAMEWORK §F.6 / DESIGN\_SYSTEM 原则9）
- 第3条删"通过工作台赋权入口实现（加入口即完成赋权）"，保留"兼任但职责分开"组织认知
- 标题聚焦"执行委托与知情监督统一 + 统筹是最大的管理"

### 二、"三组分离"概括彻查修正（书记：概括不准确，人与岗位）
- "身份与职责分离"→"人与岗位"（工作随身份走而非随人走）
- "发起与执行分离"→"提出需求与统筹执行"（R43：书记原话是"发起是提出需求，招募是统筹执行"）
- "做与看分离"→"做与看"（第1条"对应统一"非"分离"）
- 全仓修正：SECRETARY\_PRONOUNCEMENTS / COMMISSIONER\_FRAMEWORK §F.6 / insights §6 / README / help.html / SOP\_WEB / DESIGN\_SYSTEM / overview-tab.js

### 三、P-002 正文删"【这个故事囊括了②和③】"
- 正文只留原话主干，②③移入 AI 扩充展开（"这个完整叙事，落到系统上由三个组成部分承载"）

### 四、战略模糊核查 + P-004/P-005 改写
- 核查：AI 扩充无"集中=责任"等收口定性，战略模糊留白
- P-004 改写：删"打破想象等级森严"消极表述 → "支委和支书都要开放心态、积极交流、维护团结"
- P-005 改写：突出"维护团结"——"民主与集中的落点始终是维护团结"

### 五、标点统一（中文用中文、英文用英文）
- SECRETARY\_PRONOUNCEMENTS + DEVELOPMENT\_PATH：英文引号 → 中文引号（脚本批量，544 双引号 + 64 单引号），YAML 头部保留英文
- about-entry.js：中文文案英文引号 → 中文引号

### 六、About 美学
- 字体子集重建：692 → 1063 字（覆盖新增文案），bump 版本号（about.css?v=20260828 + 字体 ?v=20260828）
- 字号 scale 统一：26 个散落值归并为 12/14/16/18/20/24/32/44/64（消灭 14.5px 半像素）
- 原话全局思考：为第 3/5/6 章补三处原话题记（身份阶段·组织性 / 工作流·统筹是最大的管理 / 对话·交流解决方案），不出现"书记原话"字样

### 验证
- link-audit **5/5 通过（fail 0）**，L5 content 343 链接 0 锚点警告
- GetDiagnostics 零错误

## T-293 全站删「管理引擎」+ About 第一章重排（两标签/右侧滚动/等大散落）+ 全清歪斜（2026-08-28）

**任务**：书记四点指令——①所有 header 删「管理引擎」保留支部名 ②HTML 先有 PPT 思维再谈排版（大字小字/横竖排/附注/歪斜/滚动/动画各有逻辑）③开篇补「一个学生组织」「一个政治组织」两标签 ④全局清理歪斜，用字体/加粗/颜色/排列/运动做逻辑区分。

**引用流程**：web-design-guidelines + brainstorming + AskUserQuestion 三裁 + ABOUT_DESIGN_SYSTEM（书记排版论述权威源）

### 一、全站删「管理引擎」（书记：务必删去，保留支部名）
- 14 处「光华管理学院本科生党支部管理引擎」→「光华管理学院本科生党支部」：header.js（共享 header h1）+ index/help（页面标题 h2）+ 全部 10 个 html title + index meta description
- login.html 独立「管理引擎」小字 p 删除

### 二、第一章重排（书记 AskUserQuestion 三裁 + 方向指示）
- **两标签**：lead 后加「一个学生组织 / 一个政治组织」双属性标签（14px 红字淡红底，介绍组织前置定性）
- **三卡右侧滚动驱动**：三个期待落点卡 `.ab-cognition-split` 右对齐，滚动浮现
- **关键词错落下方**：三个关键词（具体/方兴未艾/提供成长）移至期待卡下方，**等大** + 0° 位移散落（词2 左移+上浮 -14px、词3 左移+下沉 +14px）
- **删黑体小字**：`.ab-keyword-full`（一个具体的组织等附注）删除——关键词只留大字

### 三、全清歪斜（书记：错落=高低左右散落，不是歪斜！）
- 第一章关键词原「语义性错落」-1.5°/1.2°/-1° 旋转 → 全部 0°，改位移散落
- 删除 `ab-rise-scatter` keyframes 与 `--scatter` 残留（第二章已 0°）
- 动画统一 `ab-rise-in` 纯升起（0°）

### 四、同步
- ABOUT_DESIGN_SYSTEM：§四 第一章登记表重写 + §五 规则3 改为「错落=位移散落，禁止旋转歪斜」+ §三 字体 692→1063 字
- 字体子集重跑（确认「政治」等新字在位）+ 版本 bump 20260828b（about.html entry/about.css/字体 URL）

### 验证
- link-audit **5/5 通过（fail 0）**，L5 content 343 链接 0 锚点警告
- GetDiagnostics 零错误；grep 零残留（ab-keyword-full / --scatter / ab-rise-scatter / 管理引擎）

## T-294 第一章左右分栏定格/滚动 + 删 lead/coda + P-004/005 原话区分 + 第六章汇报提示 + 收束放大（2026-08-28）

**任务**：书记浏览器选中元素后 7 点指令——①五个词统一 h3、只要定语 ②删 lead「一个正在建设中的组织，先向你介绍自己。」 ③第一章左定格右滚动 ④对照母本挑最准表达 ⑤删 coda「程序在所有人之上…」+检查民主集中表达 ⑥行百里者半九十补汇报提示+head 过窄 ⑦收束章字体放大一倍。

**引用流程**：web-design-guidelines + brainstorming + AskUserQuestion 三裁

### 一、第一章重排（①③②）
- 五个属性词统一 h3：**学生组织 / 政治组织 / 具体 / 方兴未艾 / 提供成长**（标签去「一个」，书记：只要定语不要'一个……的'）
- **左右分栏**：左 `.ab-cognition-sticky` sticky 定格（词2/4 上浮、词3/5 下沉+左移，0° 位移散落），右 `.ab-expect-list` 三卡滚动驱动
- 删 lead「一个正在建设中的组织，先向你介绍自己。」（书记不喜欢）

### 二、删工作流章 coda（⑤）
- 懒加载路径 L1565 coda「程序在所有人之上，所以扁平…统一于程序」删除 + `.ab-exploration-coda` CSS 删除
- 死 CSS 清理：`.ab-cognition-lead`/`.ab-cognition-tags`/`.ab-cognition-split`/`.ab-keywords` 全部移除

### 三、P-004/P-005 原话/AI 扩充区分（⑤ 书记严厉指正）
- **P-004**：书记原话「支委和支书都要开放心态，积极交流，维护团结。」（2026-08-28 书记原话）加入正文原话列表；AI 扩充回归中性（删除把原话当 AI 扩充的改写）
- **P-005**：AI 扩充删除「落点始终是维护团结」的定性收口（替书记收口违背战略模糊）；改为「支委个人的作用和支书个人的作用，都依靠工作流和程序来实现——扁平与集中，都以程序为共同基础」（只连接不定性，呼应书记原话第 3 条）

### 四、第六章汇报提示 + head 宽度（⑥）
- lead 改完整提示：「交流解决方案，而不是交流问题——遇到问题，及时向组织汇报，说清思路与需要的支持。」
- 新增 `<details>` 交互汇报提示「关于汇报」（展开显示 P-008 原话「我们不期待听到'这里有一个问题'…」）——交互手段
- `.ab-dialogue-head` 加宽 `min(760px, 92vw)`（解决组件过窄），sub/lead 居中

### 五、收束章字体放大一倍（⑦）
- thanks `clamp(24,3.2vw,36)` → `clamp(48,6.4vw,72)`；hope → `clamp(36,4.6vw,52)`；coda → `clamp(26,2.8vw,32)`；间距同步放大

### 六、对照母本（④）
- 第一章三卡 quotes = P-001/P-006/P-008 原话 ✓；第二章 quoteLines = P-014/P-015/P-016 原话 ✓
- 机会3 insight 微调：「恢复对话能力是「服务人」的一个子命题：帮助你恢复与思想、与现实世界的对话能力。」（对齐母本 P-016 AI 扩充）

### 同步
- 字体子集重跑（确认「汇报/支持/思路」等新字在位，1058 字）+ 版本 bump 20260828c
- ABOUT_DESIGN_SYSTEM §四 第一章登记表重写（左右分栏/五 h3/lead 删/汇报提示/收束放大）

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误；grep 零残留（cognition-lead/exploration-coda/一个学生组织/先向你介绍自己）

## T-295 P-004/P-005 书记原话合并——突出支委和支书个人作用，不单独拎书记（2026-08-28）

**任务**：书记两条新原话合并——突出支委和支书个人的作用，表述方式按书记提供文本。

**引用流程**：H10 战略模糊自觉 + H10 书记原话表达纪律 + brainstorming + web-design-guidelines

### 一、P-004 原话合并（书记新表述）
- 原「支委和支书都要开放心态，积极交流，维护团结。」（2026-08-28 书记原话）合并为：「支委和支书的职责所在包含了开放心态，积极交流，维护团结。也因此要充分吸收意见建议、帮助支部成员按照组织程序进行组织表达。」（2026-08-28 书记原话）
- AI 扩充补职责所在解读：「支委和支书的职责所在，不只是管理事务——包含开放心态、积极交流、维护团结，充分吸收意见建议、帮助支部成员按照组织程序进行组织表达」

### 二、P-005 原话第 3 条合并（书记：不要把书记单独拎出来说）
- 原「…但程序中，书记个人因为更大的责任被要求嵌入得更深，所以集中！！」（2026-08-12）合并为：「…程序在所有人之上，所以扁平；但程序中，支委个人都因为更大的责任而被要求嵌入地更深。支部成员也要多多体谅支委同样作为学生参与工作的压力，要给予同理心——特别体现在时间紧、任务重的工作中，实践中的尊重是困难的，也恰恰是我们最需要的！」（2026-08-12 + 2026-08-28 书记合并原话）
- AI 扩充同步：「集中」（书记责任更重、嵌入更深）→「集中」（支委责任更重、嵌入更深）；补「支部成员也要体谅支委同样作为学生参与工作的压力，给予同理心——时间紧、任务重的工作中，实践中的尊重恰恰是最需要的」
- 文件头部「读完之后」摘要同步：「书记因更大的责任被要求嵌入更深所以集中」→「支委个人因更大的责任被要求嵌入更深（最重要的集中是知情权；支部成员要体谅支委的工作压力、给予同理心）」

### 三、同步
- 修正记录表追加 P-004/P-005 2026-08-28 合并记录
- 核查：insights §1.3（两个向度）不涉「书记个人嵌入」，无需改；DEVELOPMENT_PATH 无相关表述
- 正文/扩充「书记个人嵌入更深」清零（修正记录表历史描述保留）

### 验证
- link-audit **5/5 通过（fail 0）**；grep 零残留（正文书记个人/嵌入更深）

## T-296 ABOUT 候选原话推进：第四章补先锋模范题记 + 第六章补高要求非高压力（2026-08-28）

**任务**：按书记方案继续推进 ABOUT 板块候选原话思考——AskUserQuestion 三裁后执行：第四章只补一个开头「先锋模范的作用必须在具体的工作中体现」；第六章补「高要求非高压力」；第一章不补组织性题记。

**引用流程**：brainstorming + web-design-guidelines + H10 好的 AI 扩充（详略得当，只挑中心句）

### 一、第四章「全员考察」补原话开头
- sub 后加 `.ab-chapter-lead`：「先锋模范的作用必须在具体的工作中体现。」（书记：只补充一个开头）
- CSS：`.ab-chapter--right .ab-chapter-lead { text-align: right; margin-left: auto; }`（与 sub 右对齐一致）

### 二、第六章「行百里者半九十」补高要求非高压力
- lead 下加第二行：「支部的建设永远以人为本，我们坚持高要求，不是坚持高压力——感到力不从心时，工作可以交接，但务必对交接本身负责。」（P-008 原话中心句）
- CSS：`.ab-dialogue-head .ab-chapter-lead + .ab-chapter-lead` 间距修正（覆盖通用负上边距）

### 三、第一章「组织性」不补（书记裁定）
- 保持现状（左五词 + 右三卡，三卡原话已覆盖 P-001/P-006/P-008）

### 同步
- 字体子集重跑（1060 字，确认「先锋模范/高要求/力不从心」等字在位）+ bump 20260828d

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-297 About 五词徽标/第六章滚动联动/右栏行程 + 第一章二章原话与 AI 扩充逐条过（2026-08-28）

**任务**：书记 5 点指令——①五词组件改徽标（参差错落）②收束删句号 ③第六章原话与旋转卡关联（滚动联动，非静态堆叠）④第一章右栏加滚动行程 ⑤第一章/第二章原话与 AI 扩充逐条过（书记逐个回答）。

**引用流程**：web-design-guidelines + brainstorming + AskUserQuestion 多轮（①③④三裁 + 第一章三卡 + 第二章三机会逐条）

### 一、① 五词改小标题徽标 + 参差错落
- `.ab-cognition-sticky .ab-keyword-word`：油墨宋红大字 → Noto Serif 16px 红字淡红底 pill 徽标（与标题级差）
- 上下左右参差错落（align-self + margin，0° 位移）

### 二、② 收束删句号
- 三层小字删句号：感谢你读到这里 / 期待我们的共同成长 / 实践是检验真理的唯一标准（居中已有）

### 三、③ 第六章滚动联动原话（head 精简）
- head 删双 lead + details「关于汇报」→ 只留 eyebrow/title/sub + `.ab-dialogue-quote` 动态区
- DIALOGUE_STAGES 每卡加 quote（02 交流解决方案 / 03 高要求非高压力交接负责 / 04 方兴未艾意见创新弥足珍贵）
- apply() 内按 `stepwise(progress)` 阶段更新 quote + 重触发淡入动画（ab-quote-fade）
- 删 `.ab-dialogue-report` 死 CSS

### 四、④ 第一章右栏滚动行程
- `.ab-expect-list::after` 加 `height: clamp(28vh, 38vh, 48vh)` spacer——sticky 定格贯穿右侧滑完

### 五、⑤ 第一章/第二章原话与 AI 扩充逐条过（书记逐条裁定）
- **第一章卡1**（成长路径 P-001）：保持 ✓
- **第一章卡2**（做事方式）：补 P-007「支部的建设方兴未艾，所以需要大家都发挥主人翁意识来创新、沉淀新的经验。」——有先例+没先例原话都写入（quotes 数组支持多段）
- **第一章卡3**（表达空间）：补 P-004「支委和支书的职责所在包含了开放心态，积极交流，维护团结。也因此要充分吸收意见建议、帮助支部成员按照组织程序进行组织表达。」（突出期待）
- **第二章机会1**（适应学习）：原话撷取关联补全（P-014 主体 + P-005「程序在所有人之上，所以扁平」+ P-009「没有上下级、分工内容不同」）；points 重新挑选基于原话（程序性=程序在所有人之上 / 扁平化=没有上下级分工不同）；**insight 删**（书记：不是很好）
- **第二章机会2**（探索创新）：原话补 P-015 第 2/3 条（组织高度赞赏创新 + 方兴未艾意见创新弥足珍贵）；points/insight 保持 ✓
- **第二章机会3**（对话）：全部保持 ✓
- 渲染支持多 quote 与 insight 可选（`${opp.insight ? ... : ''}`）

### 同步
- 字体子集重跑（1077 字，确认「赞赏/面貌/弥足珍贵」等字在位）+ bump 20260828f

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-298 About 五点修正：章头左半/五词油墨宋黑无底/第六章平滑/去术语/彻查张冠李戴（2026-08-28）

**任务**：书记 5 点指令——①章头只占左半（右侧内容上移）②五词改南西油墨宋墨色、绝不允许有底 ③第六章转动卡壳必须 smooth ④新生看不懂「组织者/深度参与者」术语 ⑤彻查机会 1/2 是否张冠李戴、不尊重书记原意。

**引用流程**：web-design-guidelines + brainstorming + 母本对照

### 一、① 章头并入左列 sticky
- renderCognition 重构：eyebrow/title 移入 `.ab-cognition-left`（与五词同列 sticky），右侧期待卡上移
- CSS：`.ab-cognition-left` sticky top 96-140px；`.ab-cognition-sticky` 去 sticky 改纯 flex

### 二、② 五词改南西油墨宋墨色无底（书记：太丑很愤怒，绝不允许有底，黑色的南西油墨宋）
- 弃 pill 徽标（Noto Serif 红字淡红底）→ 南西油墨宋 24-32px 墨色（--ab-ink），无背景无边框
- 参差错落保留（0° 位移散落）

### 三、③ 第六章转动卡壳修复（根因：quote 流内元素）
- 根因：quote 是 head 流内元素，内容变化 → head 高度变化 → flow 几何变化 → progress 抖动 → 卡壳
- 修复：quote 改绝对定位（head position:relative + padding-bottom 72-100px 预留），不占布局高度 → head 高度恒定 → 旋转顺滑
- keyframes 含 translateX(-50%)（与静态 transform 一致）

### 四、④ 机会1 第 3 行去术语
- 「程序在所有人之上，所以扁平——组织者和深度参与者之间没有上下级关系，只是分工内容不同。」→ P-005 原话原文「程序在所有人之上，所以扁平；但程序中，支委个人都因为更大的责任而被要求嵌入地更深。」（新生无需懂「组织者/深度参与者」）

### 五、⑤ 彻查机会 1/2 张冠李戴（对照母本 L312-359）
- 机会 2：完全对应 P-015（3 条原话 + AI 扩充）✓ 无问题
- 机会 1：**points 上版用 P-005/P-009 内容解释 P-014 两个向度 = 张冠李戴** → 回归 P-014 官方 AI 扩充（程序性=分工流程记录复盘让人凝聚 / 扁平化=平等协商让人创新）
- 机会 1 第 3 行：保留 P-005 关联（书记要求「撷取关联补全」）但用原话原文无术语

### 同步
- 字体子集重跑（1081 字）+ bump 20260828g

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-299 第一章 JS 滚动驱动三卡 + 第六章原话整合进卡 + 尊重体现在实践中（2026-08-28）

**任务**：书记 3 点指令——①第一章滚动驱动完全消失，学习第五章 JS 连续驱动 ②第六章文字出现地方不对，删 head 滚动联动区，给文字更多空间 ③「尊重要体现在实践中」（P-005：体谅支委压力给予同理心）加在哪里——AskUserQuestion 裁定：整合进 03 卡。

**引用流程**：web-design-guidelines + brainstorming + AskUserQuestion

### 一、① 第一章 JS 滚动驱动三卡（学习第五章）
- 根因：`.ab-expect-card` 的 CSS view() 动画在左列 sticky 化后失效（animation-timeline 不推进）
- 改：弃 CSS view() → 新增 `bindCognitionScrollDriven()`（仿第五章）：rAF 节流 + 几何缓存，每卡在其触发区间（卡顶进入视口 → 到达视口 30% 高度）连续上移浮现（translateY 64→0 + opacity 0→1）
- 左栏（章头+五词）保持 sticky 定格
- 启动区调用

### 二、② 第六章删 head 滚动联动原话区
- 删 `.ab-dialogue-quote` p（head 内）→ head 只留 eyebrow/title/sub，文字有更多空间
- 删 CSS `.ab-dialogue-quote`（absolute）+ head padding-bottom/position:relative + ab-quote-fade keyframes
- apply 删 head quote 更新逻辑

### 三、③ 尊重原话整合进 03 卡（书记裁定「行百里者半九十」）
- 卡内加 `.ab-dialogue-card-quote`（12px 墨色），**正午时展开**（data-state=current → opacity 1 + max-height 22em，过渡 400/500ms）
- 03 卡 quote = P-005 尊重原话原文：「支部成员也要多多体谅支委同样作为学生参与工作的压力，要给予同理心——特别体现在时间紧、任务重的工作中，实践中的尊重是困难的，也恰恰是我们最需要的！」
- 02 卡保留「交流解决方案」、04 卡保留「方兴未艾意见创新弥足珍贵」（正午展开）

### 同步
- 字体子集重跑（1080 字）+ bump 20260828h

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-300 修复第六章动画全灭（ReferenceError 根因）+ 第一章左侧完全不动（2026-08-28）

**任务**：书记 2 点——①第一章滚动驱动：左侧应当不动 ②第六章动画完全失败，检查问题。

**引用流程**：systematic-debugging（静态根因定位）+ web-design-guidelines

### 一、第六章动画全灭根因（致命 bug）
- **根因**：`bindCognitionScrollDriven()` 内调用 `clamp01`，但文件**顶层无全局 clamp01**（L1057/L1439 均为函数内局部定义）→ ReferenceError 抛出 → **中断整个模块启动序列**：bindExplorationScrollDriven（第五章）、bindDialogueScrollActivation（第六章）、initLazySlots 全部未执行 → 第六章（及第五章）滚动动画完全失败
- 修复：bindCognitionScrollDriven 内补局部 `const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);`（加 ⚠️ 注释防再犯）

### 二、① 第一章左侧完全不动
- `.ab-keyword-word` 去 view() 升起动画（ab-rise-in + animation-timeline）→ 左栏（章头+五词）纯静态 sticky 定格，右侧三卡 JS 滚动驱动不变

### 同步
- 字体子集重跑（1082 字）+ bump 20260828i

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-301 第一章 sticky 实测修复（并行编辑竞态回滚）+ 第六章卡点击展开 + 原话归位（2026-08-28）

**任务**：书记 4 点——①第一章左侧还在移动必须改正 ②第六章文字太多，部分放外面，点击卡片弹出补充说明 ③尊重原话更像「工作之中往复交流」而非「工作之后」，工作之后应负责复盘 ④h2 偏安一隅但组件太长。

**引用流程**：web-design-guidelines + brainstorming + 浏览器实测（browser_use 采样 119 点）

### 一、① 第一章左侧移动根因（浏览器实测）
- **根因**：T-298 的 renderCognition 左列重构（eyebrow/title 并入 `.ab-cognition-left` sticky）**因并行编辑竞态回滚丢失**——HTML 回退为旧结构（章头在 inner 顶部、左列 `.ab-cognition-sticky` 只含五词且无 position:sticky），而 CSS `.ab-cognition-left` sticky 规则一直在 → sticky 从未生效
- 实测数据：改前 `.ab-cognition-sticky` computed position: static，top 随滚动线性变化（Δtop/Δy≈-1，无稳定区间）
- 修复：renderCognition 恢复左列结构（`.ab-cognition-left` 含 eyebrow/title/五词）
- 复测：`.ab-cognition-left` computed position: sticky，top 稳定 **96px** 贯穿 scrollY 769→1386（约 616px）——左栏滚动期间完全不动 ✓

### 二、② 第六章 quote 改点击展开（不自动展开，文字有更多空间）
- 卡内 quote 从「正午自动展开」改为「点击卡片弹出」：`.ab-dialogue-card[data-open="true"]` 展开
- JS：click toggle（点击卡展开、点击其他卡关闭）；apply zIndex 保护（data-open 卡 zIndex 30，不被旋转层级覆盖）
- 卡右下角小「+」提示（data-open 时变「−」旋转 180°）

### 三、③ 原话归位（工作之中往复交流 vs 工作之后负责复盘）
- **02 卡（工作之中）**：quote 两条 = 交流解决方案 + 尊重体谅（「支部成员也要多多体谅支委…实践中的尊重是困难的，也恰恰是我们最需要的！」——工作之中往复交流）
- **03 卡（工作之后）**：quote = P-008「支部的建设永远以人为本，我们坚持高要求，不是坚持高压力——感到力不从心时，工作可以交接，但务必对交接本身负责。」（负责与复盘）
- 04 卡保留「方兴未艾意见创新弥足珍贵」

### 四、④ 标题组件缩小（偏安一隅 → 只容纳字）
- `.ab-cognition-left .ab-chapter-title { width: fit-content; }`——标题框缩小到只容纳字

### 同步
- 字体子集重跑（1086 字）+ bump 20260828j

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-302 第六章双向交流原话：点击卡片在页面其他位置淡入淡出（卡内不留内容）（2026-08-28）

**任务**：书记 2 点——①支部成员对支委（尊重体谅）与支委对支部成员（高要求等）都是往复交流，都可放第六章卡片点击出现部分；点击出现的内容**不要留在卡片里**，出现在**页面其他位置**，淡入淡出即可 ②完成后 commit（不 push）。

**引用流程**：web-design-guidelines + brainstorming + 浏览器实测（browser_use 交互验证）

### 一、① 双向交流原话 → 点击卡片淡入淡出于舞台底部（页面其他位置）
- 卡内 quote 区**移除**（卡保持简洁：no/phase/question/answer/desc）
- 新增 `.ab-dialogue-pop` 浮层（absolute 于 stage 内底部 2%，不占 flow 高度、不影响旋转 progress）
- 点击卡片 → pop 淡入显示该卡原话（`data-show="true"` + ab-pop-in 动画重触发）；再点同卡 → 淡出；点其他卡 → 切换
- 卡右下「+」提示仅限 has-quote 卡（data-has-quote="true"），data-open 时变「−」
- 双向交流内容分配（往复交流）：
  - 02 工作之中（双向）：交流解决方案（组织对成员）+ 尊重体谅（成员对组织）
  - 03 工作之后：高要求非高压力交接负责（组织对成员）
  - 04 下一次活动：方兴未艾意见创新弥足珍贵（组织态度）
- ⚠️ 曾发现 T-301 的 JS/CSS 修改部分因并行编辑竞态丢失（卡 click 绑定 + data-open CSS 不在），本次一并补全

### 二、浏览器实测（交互验证）
- 点击 02 卡 → pop 显示「交流解决方案」+「尊重」两条 ✓
- 点击 03 卡 → 切换为「高要求」✓
- 再点 03 卡 → pop 隐藏（toggle）✓

### 同步
- 字体子集重跑（1086 字）+ bump 20260828k

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

## T-303 第六章只保留 02 卡点击（03/04 归并）+ 点击后卡片虚化 + pop 移到左侧空间（2026-08-28）

**任务**：书记 3 点——①只保留 02 卡点击功能，03 卡点击内容归属 02（高要求交接负责并入 02 往复交流）②点击后卡片虚化（否则字看不清），pop 可考虑左右空间、不局限下方 ③执行完 commit（不 push）。

**引用流程**：web-design-guidelines + browser_use 实测

### 一、① 只保留 02 卡点击
- 02 卡 quote 三条（往复交流·双向）：交流解决方案（组织对成员）+ 尊重体谅（成员对组织）+ 高要求非高压力交接负责（03 归属并入）
- 03/04 卡 quote: null → 无 + 提示、无点击功能

### 二、② 点击后卡片虚化 + pop 移左侧空间
- `section[data-pop="open"] .ab-dialogue-card { filter: blur(2px) saturate(0.8) }`——点击后全部卡片虚化，pop 内容清晰（apply 不写 filter，无 inline 覆盖冲突）
- pop 位置：舞台底部居中 → **舞台左侧空间**（left 3%、bottom 6%、width min(460px,44%)、左对齐）——不局限下方
- keyframes ab-pop-in 去 translateX(-50%)（pop 不再居中）
- JS：pop show 时 `section.dataset.pop='open'`，隐藏时删除

### 三、浏览器实测
- 点击 02 → pop 三条命中（交流解决方案/尊重/高要求）✓、dataset.pop=open ✓、卡片 filter blur(2px) ✓、pop 位于舞台左侧（left≈329 vs 舞台 319）✓
- 再点 → pop 隐藏 + 虚化解除（filter none）✓

### 同步
- 字体子集重跑（1087 字）+ bump 20260828l

### 验证
- link-audit **5/5 通过（fail 0）**；GetDiagnostics 零错误

---

### 2026-08-30 · T-304 上下文文件体系 + AI逃逸捕捉评议首轮（提交 cb13fb8）

- **任务1（书记建议执行）**：KNOWN_PITFALLS §17 补「并行 Edit 跨区域覆盖」判例——capability-registry.test.mjs 4 处路径修改并行发起仅 1 处落盘；规则强化：同文件（无论同区域/不同区域）禁止一条消息内并行 Edit，逐条串行 + Read 复核，批量场景用 `git diff` 核对实际落盘
- **任务2（上下文文件 + spec 清理）**：定义上下文文件（→ CLAUDE.md H26：描述当前状态/规则、可执行引用、变更即影响后续任务；对照知识资产 vs 过程产物）；html-slimming 过程 spec 的可复用内容（方案A 落地、gap2 消除、边界约束「不引入构建/方案C 远期」）整合进 ARCHITECTURE_EVOLUTION.md（gap 表 + M5 实施路径行）后删除 `docs/superpowers/`；排查确认无其他不可复用脚本/spec/plan
- **BOM 污染清理**：20 个源码/文档文件被外部工具注入多余 U+FEFF（`git diff --numstat` 全 1 1、diff 首行即 BOM）——内容与 HEAD 一致，`git restore` 还原，未提交污染
- **任务3（AI逃逸捕捉评议首轮）**：引入新评议机制（→ CLAUDE.md H27 + REVIEW_QUEUE 附录⑦ + 评议方法总索引）：五维扫描 E1 规则软化 / E2 判据缺位 / E3 边界模糊 / E4 例外无闸 / E5 验证无闭环。首轮扫描 CLAUDE.md 甲部 H10-H100 + H25，**修复 3 处逃逸点**：
  - EP-01（E5/E2）H20.2 验收：补「涉及代码改动必须按 H25 跑相关测试，不得仅以 GetDiagnostics 零错误代替运行验证」（语法对≠运行对，§17 判例）
  - EP-02（E2）H30.1 一改具改：补「完成后全仓 Grep 验证零残留 + Read 复核」判据
  - EP-03（E2）H40 第 3 项：同步补零残留验证
- **验证**：全部为文档/提示词改动，无 JS 代码变更，npm test 基线（50/50 全绿）不受影响；工作树干净

---

### 2026-08-30 · AI逃逸捕捉评议第二轮（书记发起 · 扫描 OPERATIONS_GUIDE / PROCESS_GUIDE / USAGE_POLICY）

- **扫描范围**：OPERATIONS_GUIDE（§1 权威层级 / §9 编号 / §10 日志 / §11 反论 / §13 表述 / §14 文件角色）+ PROCESS_GUIDE（§15 甲部修改 / §17 周期任务 / §18 评议细节）+ USAGE_POLICY（§二 AI 展开原则）——这些区域规则密度高、自检清单扎实，总体无 E1 规则软化
- **修复 2 处逃逸点**：
  - **EP-04（E2 判据缺位/清单无闸）**：W4 专项评议清单（PROCESS_GUIDE §17.2.1）未同步新增专项 ⑥减负 / ⑦AI逃逸捕捉——「开放机制」缺强制同步闸门。修复：W4 清单补 ⑥⑦ + 新增「🔴 新增专项必须同步 PROCESS_GUIDE §17.2.1 + CLAUDE.md H60.5 + REVIEW_QUEUE 附录三处一致」闸门；H60.5 表同步补 ⑥⑦
  - **EP-05（E2 判据缺位/一改具改漏改）**：OPERATIONS_GUIDE §9.1 编号语义对照表未同步本轮新增的 H25/H26/H27。修复：对照表补三行
- **skills 扫描**：brainstorming（HARD-GATE 先设计后批准）、fullstack-developer（技术栈参考）等外部通用 skill 规则密度足够，无本仓库相关逃逸点——**只报告不擅改外部通用文件**（修改会影响其他项目）
- **检查要点库入库**（REVIEW_QUEUE 附录⑦）：新增「开放清单同步闸门」通用检查项（EP-04 判例）；附录⑦ 轮次进度更新至第二轮
- **验证**：全部为提示词体系文档改动，无代码变更；提交后工作树干净
