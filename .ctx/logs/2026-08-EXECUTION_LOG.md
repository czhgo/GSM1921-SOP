---
title: "2026年8月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-08-01"
status: active
related_files:
  - CLAUDE.md
  - .ctx/logs/2026-07-EXECUTION_LOG.md
  - .ctx/logs/EXECUTION_LOG_INDEX.md
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
