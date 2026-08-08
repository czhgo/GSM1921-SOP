---
title: "2026年8月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-08-07"
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
