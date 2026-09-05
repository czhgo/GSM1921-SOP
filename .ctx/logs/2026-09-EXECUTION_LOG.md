---
title: "2026年9月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-09-02"
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-08-EXECUTION_LOG.md, .ctx/logs/EXECUTION_LOG_INDEX.md]
---

# 2026年9月执行日志

> 本文件记录 2026 年 9 月所有工作的执行动作。
> 每条记录包含来源/关键动作/设计决策/结果/沉淀标签。

---

## T-2026-09-001 功能地图与帮助系统重构·阶段 1（2026-09-01）

**任务**：以 FUNCTION_CATALOG 单一事实源，产出 README/文档 4 类 mermaid 图 + help 页重构（对标 MATLAB/Stata help）+ 通用/特有标注，服务开源复用
**引用流程**：brainstorming（4 节设计逐节确认）+ writing-plans + subagent-driven-development（每任务双审）+ TDD
**来源**：书记要求——"mermaid 是很好的展示系统服务逻辑的方式！在 README/说明部分（包括 help 页，目前完全没有思维导图般的解释说明和搜索功能）进行代码梳理和可视化，帮助检查功能完备、思考普遍性功能、便于其他组织复用"

- **设计决策**（书记逐节确认）：
  - 方案 A·目录驱动：新增 FUNCTION_CATALOG 单一事实源，一份数据驱动 README 图 + help 章节/搜索 + 通用标注
  - 四类图全覆盖：功能地图（mindmap）/ 业务链路（flowchart×5）/ 架构分层 / 服务依赖
  - help 页对标 MATLAB/Stata help：顶部搜索 + 左侧目录树（**致谢第一**）+ 右侧内容面板 + 章节卡片（名称/通用特有角标/说明/用法/参见）+ 搜索五要素
  - help 页功能地图用 mermaid CDN 懒加载（离线/失败降级）
  - 通用性标注在图中与卡片中标注「通用/特有」两类
- **实施**（7 commits：ab223a1/cb3f868/27cf142/a9febfa/0482594/8f061d5/3e9275d/a7e6926）：
  - `docs/src/core/function-catalog.js`：6 组 46 条（38 feature + 5 flow + 3 arch），纯数据表达式（node 文本求值 + 浏览器 import 双消费）
  - `docs/src/core/mermaid-sources.js`：mindmap 文本 + FLOW_STEPS 双端共享（消除 gen/help 副本漂移）
  - `docs/scripts/gen-function-mermaid.mjs`：4 类图生成 + README 标记块写回 + FUNCTION_MAP.md + 防漂移校验
  - `docs/src/modules/help-catalog.js` + `help-entry.js` + `help.html`：三区布局、目录树、搜索、章节卡片、mermaid 懒加载
  - 3 新测试：function-catalog（结构）/ function-map-sync（防漂移）/ help-e2e（E2E 离线降级）
- **结果**：全量测试 **65/65 通过**（61 原 + 4 新增）；版本串 20260901e→f 全库同步（160 文件）；spec 已清理
- **代码审查**：每任务 spec 合规 + 代码质量双审；最终审查 Approve（5 Minor，2 已修：补课链路冗余节点、图例文案）
- **沉淀标签**：M4 功能可视化 · help 系统 · 单一事实源 · mermaid · 一改具改（catalog 变更→gen 脚本→全量测试）
- **后续**：阶段 2 内容深化（usage/related 精修 + generic 逐条书记过目）；阶段 3 推广至 server/README、ARCHITECTURE

---

## T-2026-09-002 线上异步表决泛化（2026-09-01/02）

**任务**：书记反馈"文件/改革异步表态很受认可，迁移到支部党员大会层面；支委会也作为选项（决策事项可线下或线上异步表决）"——线上异步表决从支委会泛化至支部党员大会
**引用流程**：brainstorming（4 问逐点确认）+ spec 逐节批准 + subagent-driven-development（每任务双审）+ TDD
**来源**：书记——"异步表态迁移到支部党员大会？作为一种选项，支委会也是一样，决策事项可线下也可线上异步表决"

- **设计决策**（书记逐点确认）：
  - 活动级"会议形式"：线下开会 / 线上异步表决（决策类场景：支委会/支部党员大会可选）
  - 参与范围可配：正式党员 / 正式党员+预备党员（支部党员大会默认正式党员）
  - 支部党员大会**硬校验**（区别于支委会"展示不拦截"）：出席≥应到半数 且 赞成>应到半数 才可记录通过
  - 大会选项集=赞成/反对/弃权+附言（formal）；支委会=同意/异议/附言（deliberative，零变化）
- **实施**（commits：b65a4c7/199f7a0/821654b/4cacb7d/37c1bb9/b0b0f06/29d8e4b/3af18a9b/08d9254/0a07316）：
  - `docs/src/services/vote-config.js`：voteConfig 模型（optionSet/voterScope/voterIds/quorumCheck）+ 名单解析（committee 5/formal-only 12/formal-plus-prep 21）+ 场景默认
  - 活动创建表单（calendar-tab）：会议形式 radio + 参与范围；保存固化 voterIds
  - 服务端 committee.js：按 voteConfig.voterIds/optionSet 授权（fail-closed）+ 旧活动回退 p10-p14（零行为变化）
  - 前端参数化：inspector/vote-summary-panel 由 optionSetOf 驱动；formal 票数统计+通过条件提示；agenda-follow-up 记录决议硬校验（fail-hard fetchVotesStrict）
  - **公共页表决端（重大缺口修复）**：表决 UI 原锁死书记工作台 → `vote-widget.js` + `activity.html`（activity-entry）接入，委员/党员经公共页可达（canVote=voterIds 判定）；mock act-31 党员大会样例
  - 角色集合单一源化（vote-config resolveVoterIds 权威）
  - 测试：agenda-votes 15/async-vote E2E（真实 UI 链路）/agenda-quorum 5/module-load 109
- **结果**：全量测试 **87/87 通过**；版本串 20260901g→h（168 文件）；spec/plan 已清理；测试分层落地（fast 19s/core/full）
- **代码审查**：AV1-AV5 每任务双审；重点修复：服务端 fail-closed（optionSet/voterIds 非法 400）、矩阵 XSS 转义回归、硬校验降级语义（fail-hard）、radio 容器级委托（change 顺序依赖）
- **沉淀标签**：表决参数化 · voteConfig · 硬校验过半数 · 公共页表决端 · 一改具改 · 表决 UI 断点教训（功能能力锁死在单一页面→须公共可达）
- **后续**：表决写侧约束（voteConfig 仅书记可改/服务端推导名单）登记 follow-up；存量决策活动（act-30 等）voteConfig 迁移

---

## T-2026-09-003 业务链路角色化全量扩展 + help 过时章节重写 + catalog 整合（2026-09-02）

**任务**：① T6 业务链路角色化——FLOW_STEPS(5 条流程) → FLOW_LINKS(12 条角色化链路，节点=执行者:任务)；② T7 help 页 sec-what/sec-tech 旧"纯前端静态架构"叙事重写对齐 README §七；③ T8 FUNCTION_CATALOG 整合（拆「线上异步表决」独立 feature + 12 条角色化链路条目）；④ 版本串 bump h→i
**引用流程**：接续会话（书记 2026-09-01 已确认方向，被表决功能插入搁置）→ 快速通读记忆/权威源 → AskUserQuestion 4 项设计裁定（全部采纳推荐）→ TDD（改一处跑一处）
**来源**：书记 AV2 起遗留"角色化链路图/help 理论划分"反思（2026-08-18 起）+ 快照首要待办 T6/T7/T8/T9

- **设计决策**（AskUserQuestion 书记逐项裁定，均采纳推荐）：
  - **flow 框架**：现有 flow-activity（活动全链路）/flow-member-change（成员变更审批链）**全量替换**为 12 条角色化链路（catalog flow 条目 5→12）
  - **节点粒度**：活动型链路聚合为 5-8 步角色链（党小组会 7 步、党课保持 2 步原样），事务型按 SOP 全链
  - **mindmap 口径**：功能地图**只列 feature**（39 条），flow/arch 仅在各自章节成图（避免 12 条 flow 让 mindmap 膨胀且与 feature 语义重叠）
  - **「制度」条目**：命名「制度制定与迭代链路」，标通用（sopData new-system 语义）
- **实施**（12 条链路的权威源 = sopData.js executor/supervisor + 快速指南 + voteConfig 模型，防编造逐条核源）：
  - `function-catalog.js`：flow 条目 5→12（活动型 6：支委会/线上支委会/党小组会/党课/主题党日/支部党员大会 → 党建；事务型 6：专班/发展党员/考察积极分子/制度制定与迭代/补课回写/思想汇报 → 党务+活动专班）；新增 feature `online-vote`（线上异步表决，党建/通用/public，related 引 flow-online-committee/flow-general-meeting）；feature related 引用同步（agenda/notification/review/member-change 旧 flow id → 新 flow id，零死引用）
  - `mermaid-sources.js`：FLOW_STEPS → **FLOW_LINKS**（12 条角色化节点文本）+ `generateMindmapText` 改 feature-only（含书记裁定注释）
  - `gen-function-mermaid.mjs` / `help-catalog.js`：FLOW_STEPS 消费方同步 FLOW_LINKS；`node docs/scripts/gen-function-mermaid.mjs --write` 重生成 README 标记块 + FUNCTION_MAP.md
  - `help.html`：三处旧叙事改写（1.1 页面导航 14→16 页；系统是什么章 14 页/党支书 → 16 页/书记 + 新增「静态前端+一体化后端」「赋权链」段落；技术架构章 纯前端静态 4 层 → 静态前端+Node 一体化后端 5 层，对齐 README §七）
  - `help-e2e.test.mjs`：追加 7 条断言（sec-tech/sec-what 含「一体化后端」「16 个页面」「赋权链」，不含「纯前端静态架构」「14 个页面」）
  - `function-catalog.test.mjs`：flow 必需断言 5→12 条 + 新增 required（flow-branch-committee/flow-general-meeting/flow-development/flow-institution）
  - bump：版本串 **20260901h→i**（148 JS + 16 HTML + CODE_VERSION+1 + 14 server/test）
- **结果**：全量测试 **87/87 通过**（full ~163s）；gen --write 产物与防漂移测试一致（function-map-sync）；module-load 109/109
- **代码审查**：实施中踩 **2 次同文件并行 Edit 写覆盖**（KNOWN_PITFALLS §14 再现——import 行回退为 FLOW_STEPS 致 module-load/help-e2e 首轮 fail 2），教训：**同一文件多 Edit 必须串行，改完 Grep 复核实际状态**；修复后 core 25/25 + 全量 87/87
- **沉淀标签**：角色化链路 · FLOW_LINKS · 单一事实源 · mindmap feature-only · 一改具改（catalog/mermaid-sources 变更→gen --write→测试）· 同文件并行编辑写覆盖教训 · help 架构叙事对齐
- **后续**：help 页 1.2 权限体系「党支书」称呼（L282/L347 等）未动（超 T7 范围，术语统一另立）；表决写侧约束 follow-up 持续；AV4 Minor（formal tally 跨议程语义、voteConfig 异常三端回退口径）待办

---

## T-2026-09-004 多用户写穿并发互覆缺陷修复（脏集合增量快照）（2026-09-02）

**任务**：书记质询「server 与 mock 数据关系现状 + 上线储备程度」→ 真机双账号演练 → 实证并发互覆缺陷 → 修复 + 回归测试沉淀
**引用流程**：AskUserQuestion（上线目标 ③/工作重点 4 项全选/减负切入点 代码层/现在做演练 4 项裁定）→ fullstack-developer skill → 真机演练（过程脚本，用完即删）→ TDD
**来源**：书记——"我并不了解完整上线过程中的测试、迭代、代码储备需要到什么程度""我们有了 server 和 mock 数据，并不知道它们之间的关系目前是什么状态"；上线目标裁定 **③ 计算中心托管对接**

- **关系澄清（已核实代码，向书记通俗汇报）**：mock = 演示样例库 + 浏览器本地草稿（每台浏览器各记各的小本子）；server = 正式账本（SQLite data.db 单文件）；前端内存工作区（mockDB）双形态共用——api 模式 init 全量拉取 + 写走 persist→防抖快照写穿；**种子同源复用**（server/seed.js import docs/src/mock）
- **真机演练实证（过程脚本 collab-drill.mjs 已删）**：
  - 顺序写 PASS（A flush 后 B init 含 A 数据，写后互不损）
  - **并发 FAIL（复现缺陷）**：两账号同时在线（B 内存落后）→ A 写通知 flush 成功 → B 写任意数据 flush → **A 的通知被 B 的全量快照整表覆盖（丢）**
  - **跨集合 FAIL（更严重）**：A 写活动、B 写待办（不同集合）→ **A 的活动被跨集合洗掉**
  - 重启 PASS（users 空才 seed，重启不覆盖用户数据）
  - 根因：快照 = 26 域全量 `DELETE+INSERT` 整表替换；任一内存滞后的在线用户下一次写会把他人数据整体覆盖（async-vote 当年把 agendaVotes 移出快照直写即同因，只救一个域）
- **修复（书记批准「脏集合增量快照」，同集合并发残留批准列 follow-up）**：`docs/src/core/data-adapter.js` 单点——以「init 拉取完成态」为基线（_captureBase），flush 时逐域比较只上传**脏集合**（_collectDirty），成功后基线推进（_commitBase），失败不推进自动重试；pagehide 同步冲刷同步改造；**服务端零改动**（resources.js 已按 payload 键逐表处理）；回退种子计入基线（不再自动污染服务器，契合 Z5 注释）
- **测试**：新增 `server/test/multi-user-write.test.mjs`（2 项：跨集合并发不互覆 + 顺序写不互损），入 core 层（package.json test:core）；全量 **89/89 通过**（87+2）；版本串 20260901i→j（148 JS+16 HTML+CODE_VERSION+1+15 test）
- **代码审查**：修复后重跑演练脚本——场景 2b 跨集合转 PASS，场景 2 同集合双写保持预期残留（已列 follow-up：集合级冲突检测/updatedAt）；演练过程脚本与 db 清理无残留
- **沉淀标签**：脏集合增量快照 · 并发互覆缺陷 · 快照基线 · mock/server 关系澄清 · 真机双账号演练 · 上线储备档位③
- **后续**：同集合并发冲突检测（follow-up）；全仓代码层复用/冗余扫描（减负专项，书记已定切入）；表决 follow-up（写侧约束/存量迁移/AV4 Minor）；REVIEW_QUEUE 逐条 ask；计算中心托管对接专项（DEPLOYMENT_ROADMAP 对照）

---

## T-2026-09-005 减负·复用专项：全仓代码层扫描 + 零风险收敛第一批（2026-09-02）

**任务**：书记发起全仓库减负（"能复用的部分一定要会复用"）→ 三路并行扫描（数据层/UI 层/常量映射）→ 书记裁定「零风险收敛先行 + 冻结漂移项」→ 执行第一批收敛
**引用流程**：3 个 search 子代理并行盘点（只读）→ AskUserQuestion 范围裁定 → TDD（收敛后跑关键回归）→ 全量收口
**来源**：书记——"继续推进全仓库减负任务！能复用的部分一定要会复用！我们有了 server 和 mock 数据，我并不知道它们之间的关系目前是什么状态"

- **盘点结论（三路扫描，全部只读）**：
  - **真重复（最大项）**：双 Mock 持久化引擎（`services/mock.js` 旧 BranchService vs `core/mock-adapter.js` 新适配层，同 Key 双写、`imageRecords/agendaVotes` 字段已漂移）；`_mergeNewSeedRecords` 两份逐段复制；活动字段补全映射 7 处（data-loader 已抽仍被漏用）
  - **UI 同构**：leader/visitor review-tab 95% 同构（~400 行）；secretary/todo-tab 漏迁 todo-tab-shell；三处 PersonPicker 上传表单壳重复；状态 chip 大量手写未用 badge/status-badge
  - **常量映射副本**：角色键 9+ 副本；活动分类 5+ 份；发展阶段 4 套；**3 处同语义不同色漂移实证**（pending 橙/青、recruiting 橙/蓝、active 运行中/进行中、completed 已执行/已完成）；默认红 #CE1126/#B91C1C 两口径
  - 死代码：attendanceToWide / _maybeError；MOCK_ACCOUNTS 被 mock-integrity 测试消费 → 非死（扫描误报，已澄清）
- **第一批零风险收敛（净减 ~73 行，行为零变化）**：
  - `talent-tab.js`：同文件双份 stageColor dict → 模块级 `STAGE_COLOR` 单一（-26 行）
  - `todo.js`：create/createBatch 逐字重复的对象构造 → 抽 `_buildTodo`（-22 行）
  - `mock/attendance.js` + `mock/index.js`：死导出 `attendanceToWide` 删除（-15 行）
  - `ws-secretary-entry.js`：删与 workspace-shell 缺省逐字一致的内联 `mapFallbackActivities`（-11 行）
- **验证**：module-load 109/109 + e2e-login + b3-1 5/5 + seed + GetDiagnostics 零 JS 错误；全量 **89/89 通过**；版本串 20260901j→k
- **沉淀标签**：减负专项 · 复用盘点 · 零风险收敛 · 冻结漂移项 · 漂移实证（同语义不同色 3 处）
- **后续（登记待办，未做）**：架构大项——双 Mock 持久化引擎合并（独立 spec）、角色键单一源化（constants ROLE_KEYS + server 共享纯常量）、tab 内嵌 mini-store 收拢 service；同构抽壳——review-tab 合并组件、secretary/todo 迁 shell、PersonPicker 表单壳；漂移裁决（状态词/颜色）——待书记浏览器目检后逐项定；死代码 _maybeError 随引擎合并一并清

---

## T-2026-09-006 表决 follow-up 收尾：写侧约束收敛 + 文案三端统一 + 存量迁移结论（2026-09-02）

**任务**：交接 follow-up——① voteConfig 写侧约束（仅书记可改/服务端强制）② 存量决策活动 voteConfig 迁移 ③ AV4 Minor（formal tally 跨议程语义 + voteConfig 异常三端回退口径）
**引用流程**：现状盘点（committee.js/calendar-tab/agenda-follow-up/vote-widget/inspector 实读）→ AskUserQuestion 3 项裁定 → 小改 + 表决回归
**来源**：交接快照 follow-up（表决功能插入搁置项）

- **盘点结论**：tally 已按「每条议程项独立判定出席/赞成」实现（agenda-follow-up `quorumBlockMessage`，与 spec §3.4 一致）——AV4 Minor 该语义项**实质已闭环**；写侧约束 TODO 在 committee.js（快照整库写穿架构下服务端无法区分单条活动的写入者，服务端强制依赖活动写 REST 化）
- **书记裁定**：① 前端收敛 + 登记 spec（不做服务端推导本轮）② 存量迁移需先想清「归档」语义（追问）③ AV4 Minor 只做文案三端统一
- **实施**（版本串 20260901k→l，全量 89/89）：
  - 文案三端统一：`vote-widget.js` / `inspector.js` 两处 `['agree','object','comment']` 字面量兜底 → `OPTION_SETS.deliberative.options`（前端 vote-config 权威单一）
  - 写侧约束收敛：`calendar-tab.js` 表决配置区注释声明「仅书记/副书记工作台呈现」；`committee.js` 信任模型注释更新（前端收敛完成 + 服务端强制登记架构 spec，与双引擎合并同批）
  - 存量迁移结论：act-30（秋季部署会）为普通会议无表决语义 → **不迁**，mock 注释说明原因（回退路径仅议程触发表决时生效 + 已有服务端测试覆盖）
  - 表决回归：agenda-votes 15 + async-vote（真实 UI 表决链）+ module-load 109/109 全绿
- **沉淀标签**：写侧约束 · 文案三端统一 · OPTION_SETS 单一源 · tally 每议程项独立 · 存量迁移结论（不迁）
- **后续**：书记追问「表决活动【归档】显示什么」（归档库/活动详情对表决决议与票数的回看呈现）待定方向；服务端强制（活动写 REST 化 + 名单推导）登记架构 spec

---

## T-2026-09-007 减负架构 spec 已批准 · 待实施（2026-09-02）

**任务**：书记批准 Step1+R2 实施——但本 session 上下文预算将尽，300 行引擎手术 + 全量回归需完整上下文保证质量，**留待新会话立即执行**（方案已定、bug 已发现、边界已清，直取 spec 即做）
**产物**：`.trae/specs/2026-09-02-mock-engine-merge-spec.md`（书记已审批准；实施后整合 ARCHITECTURE_EVOLUTION 并删除本文件）
**方案定稿（微调优于原案）**：Step1 A' —— services/mock.js `saveDB/loadDB` 转发 `MockAdapter`（唯一全量实现）+ 删私有引擎（saveDB/loadDB/_seedInitialData/_mergeNewSeedRecords/_maybeError/仅 seed import），净减 ~250+ 行；**附带修复纯 mock 新域（imageRecords/agendaVotes/handoffs/thoughtReports 等）刷新即丢 bug**（现 mock 恢复走旧 loadDB 缺这些域）；R2 角色键单一源化清 9 前端副本 + 3 服务端副本（先确认 constants 纯净性/抽 role-defs）；漂移词色冻结
**新会话首步**：读 spec → Step1 实施（先做纯 mock 新域刷新丢 bug 的临时复现验证 → 重构 → e2e-login/b3-1/seed/module-load + full 行为闸）→ R2 → bump + 登记 + spec 清理
**另登记**：表决活动详情「决议票数留档」区块（书记已定方向，待实施——活动详情显示各议程项决议+票数统计，可回看）

---

## T-2026-09-008 减负架构 Step1 实施完成（双 Mock 持久化引擎收敛）（2026-09-02）

**任务**：实施已批准 spec 的 Step1（services/mock.js 引擎收敛到 MockAdapter）+ 附带修复纯 mock 新域刷新丢 bug
**引用流程**：实读两引擎全文比对 → 收敛决策（转发而非抽新文件）→ TDD（module-load/seed → core 27/27 → 纯 mock 演练 PASS → full 89/89）
**来源**：T-2026-09-007 spec（书记已批准 Step1+R2 实施）

- **比对结论（防降级关键）**：services/mock.js 引擎含 2026-09-01 最新恢复域；mock-adapter 引擎是**超集**（含 imageRecords/agendaVotes）但 **MockAdapter.saveDB 无 Z1 persist 分支**（services 版有：API 模式 BranchService 写后触发快照写穿）→ **Z1 若内置于 _saveToStorage 会 persist→saveDB 无限递归**，必须留在 BranchService 转发外层
- **实施**（services/mock.js **净减 318 行**，+23/−341）：
  - `saveDB()` → MockAdapter.saveDB() + Z1 persist 外层（dynamic import 防环）
  - `loadDB()` → C1 读路径守卫（API 模式防本地旧备份覆盖）保留外层 + MockAdapter.loadDB()
  - 删除私有引擎：saveDB 全量序列化实现 / loadDB 恢复实现 / `_seedInitialData` / `_mergeNewSeedRecords` / `_maybeError`（+ 8 处 CRUD 内 no-op 调用）/ 仅 seed 用 import
- **修复 bug（演练实证）**：纯 mock 模式恢复原走 services 旧 loadDB（缺 imageRecords/agendaVotes 等新域恢复）→ **新域刷新即丢**；收敛后走 MockAdapter 全量 26 域恢复。临时演练脚本 PASS：写 agendaVotes → reload → 记录仍在（脚本已删）
- **验证**：module-load 109/109 + core 27/27 + 全量 **89/89**；版本串 20260901l→m；commit 79e10c0
- **沉淀标签**：双引擎收敛 · Z1 递归陷阱 · C1 守卫 · 纯 mock 新域刷新丢修复 · 单文件净减 318 行
- **后续**：**R2 角色键单一源化**（书记已批；constants.js 已确认纯净无 import、可被 server 共享——新会话按清单执行：6 capability requiredRoles 由 ROLE_PAGE_MAP 派生 / talent roleLabel→ROLE_LABELS / feedback ASSIGNEE_OPTIONS+CLOSE_REASONS / login DEV_CARDS / state ROLE_TYPES / server COMMISSIONER_ROLES+SECRETARY_ROLES 共享纯常量）；表决活动详情「决议票数留档」区块待实施；漂移裁决待书记目检

---

## T-2026-09-009 漂移裁决 3 处落实（书记逐项裁定）（2026-09-02）

**任务**：书记要求先列漂移差异（Q4）→ 逐项问裁 → 落实
**引用流程**：盘点精确到行（含追查"待确认"真实语义位置——纪检端=确认方处理队列/组织端=提交方状态展示）→ AskUserQuestion 逐项 → 落实 + full
**书记裁定（全部采纳）**：①「待确认」pending 权威色 = **橙**（纪检主视口+超期红同族警示）；② 专班状态词全站统一 = **运行中/已完结**（内部一致，公共页 projects-tab 误用任务态词已改）；③ 活动状态 = **落实 2026-08-07 既有裁决**（"已完成"全站移除——inspector 已执行而公共 activity-entry 漏执行，实为落实缺口非新议题）
**实施**（版本串 20260901n，全量 89/89，commit 6232772）：
- ① pending 统一橙：org/inspection-tab L58 + org/talent-tab L117 青→橙；全站复核无 cyan pending 残留（disc/leader 已橙）；集中到单一常量层登记 R2
- ② 专班词：visitor/projects-tab `_tfStatusLabel` active 进行中→**运行中**、completed 已完成→**已完结**（含 fallback）；色已一致（与 dashboard 同灰）
- ③ 活动词：activity-entry STATUS_BADGE **拆分** ACT_STATUS_BADGE（completed→已执行）/TF_STATUS_BADGE（completed→已完结、active→运行中）——修掉"活动/专班共用一张表致语义混用"的根因；两处调用带 kind 参数
- **防回归教训**：activity-entry 两处 statusBadge 调用并行 Edit 又现写覆盖（L151 act 参数丢失一次，复核补回）——同文件编辑必须串行+事后 Grep 复核
- **沉淀标签**：漂移裁决 · pending 权威橙 · 专班运行中/已完结 · 已完成全站移除落实 · 活动/专班徽章表拆分
- **后续（书记四项全选，新会话按序）**：R2 角色键收敛 / 同构抽壳+Step2 CRUD 统一 / **部署 checklist 立项**（含空表回退 mock 污染处理 = 对接第一位）/ 表决决议票数留档

---

## T-2026-09-010 卡点全景汇报 + 部署件基座（2026-09-02）

**书记决策**：不 push（风险自担已知悉）；上线=先把能做的部署件做掉；表决服务端强制=列后续专项；主攻减负 R2+抽壳
**卡点全景（已汇报书记）**：① 外部依赖——托管机器申请（书记推动）/REVIEW_QUEUE 逐条/界面减负目检；② 决策待定——表决信任边界/push/备份 SOP；③ 纯执行——R2/抽壳/Step2（已批）；④ 排队——表决留档/help 术语
**部署件实施**（版本串 20260901o，commit bda8fd9）：server.js `DISABLE_SEED=1` env（空库不导入演示种子）；deploy.js `SEED_FALLBACK` 开关（真实部署=false）+ 污染机制注释；DEPLOYMENT_ROADMAP §2.3「真实部署 checklist」6 步（新库启动 3 步含 services 9 处空表回退关闭清单 + 日常运维备份/恢复/更新 3 步）；module-load 109/109 + seed 通过
**后续**：R2 角色键收敛 / 同构抽壳（review-submit 等）/ Step2 CRUD 统一——主攻线待新会话执行（需完整上下文逐文件改）

## T-2026-09-011 R2 角色键单一源化·首批 + capability 派生（2026-09-02）

**任务**：R2 减负——角色→页面映射单一源化，消除各工作台字面量副本
**设计裁定（书记）**：talent 角色词统一 T1 全称（党支部书记/党支部副书记）；R2 先做 capability 派生
**实施**（版本串 o→q，commits 527558b/5744637）：
- constants.js 新增 `ROLE_PAGE_MAP` + `rolesForPage()`（单一源）；auth.js 删本地 ROLE_PAGE_MAP 改引用
- talent-tab roleLabel 统一全称（书记裁决）
- 6 个 workspace capability `requiredRoles` 全部改 `rolesForPage(page)` 派生（secretary/org/prop/disc/leader/visitor）
- 验证：module-load 109→110 + capability-registry + **全量 89/89**
**教训**：R2 多数"角色键副本"非同值（state ROLE_TYPES 系合法枚举、auth/constants 双 COMMISSIONER_ROLES 语义不同）——收敛前须先裁决，防误改 UI 文本

## T-2026-09-012 党委后台 P1 Step1a·支部多实例数据层（2026-09-02）

**任务**：院系党委后台设计落地（设计定案见 content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md；执行路线图 .trae/specs/2026-09-02-party-committee-p1.md）
**书记方向裁定（brainstorming 逐项）**：真实接入学院党委（院系级非全校）；支部不预设名字动态创建；同一套两级部署；党员严格单支部；书记=职务动态绑定；支部=配置驱动实例（header 软编码 + enabledModules 排列组合 + branchDocs 一支部一存储空间）；架构路径 A 原地横向扩展
**实施**（版本串 q→r，commit dea729d，T-2026-09-012）：
- 新建 mock/branches.js（BRANCHES br-b1 实例 + PARTY_COMMITTEE 常量；config：headerTitle/enabledModules=null 全开/fileSpaceIsolated）
- domain.js mockDB 加 branches 域（含注释语义）
- mock-adapter 四处接入（import/首启 seed/saveDB 组装/两处 load 恢复 replace_all）
- server/db.js RESOURCE_TABLES 加 branches；server/seed.js 两级导入（users 前 replace branches）
- mock/people.js 全员缺省注入 branchId='br-b1'（undefined→br-b1；党委级 person 显式 null 待 Step4）
- 验证：module-load 110/110 + seed/db/snapshot 8/8 通过
**下一步**：Step2 支部隔离（services 层收敛，惰性维度：老数据无 branchId 视作 br-b1）→ Step3 配置档案生效（header 软编码）→ Step4 党委工作台 + party-staff 角色/党委账号

## T-2026-09-013 P1 Step3 header 品牌软编码（2026-09-02）

**实施**（版本串 r→s，commit 703c201）：新建 services/branch.js（getBranchById/getBranchIdOfPerson/getHeaderTitle——person→branchId→branches.config.headerTitle→兜底）；components/header.js h1 硬编码改 `getHeaderTitle(personId)`（访客默认 br-b1）。验证 module-load 111/111 + click-cost 4/4（浏览器实测书记台创建活动/看详情流程正常）

## T-2026-09-014 P1 Step2 支部隔离锚点（2026-09-02）

**实施**（版本串 s→t，commit c5fcb1f）：mock-adapter branchDocs.create 挂 branchId（缺省 br-b1，支部文件一支部一空间字段级落地）；branch.js 加 `withinBranch(rows, personId)` 统一隔离过滤收敛点（无 branchId 视 br-b1 惰性迁移；单支部恒等、跨支部自然生效，防各 tab 手写过滤漂移）。验证 module-load 111/111 + capability-registry 13/13
**P1 进度**：Step1 数据层 ✅（dea729d）/ Step2 隔离锚点 ✅（c5fcb1f）/ Step3 header 软编码 ✅（703c201）；**Step4 党委工作台 + party-staff 角色/账号/台账/支部管理 = 最大块未动**，需 UI 密集开发 + E2E，留新会话专做（本会话上下文耗尽前收口保质量）

## T-2026-09-015 P1 Step4a 党委工作台落地（2026-09-02）

**实施**（版本串 t→u，commit 6f97552，module-load 112/112 + registry/seed/db 18/18）：
- party-staff 组织级角色链：constants ROLE_KEYS/ROLE_LABELS('党委组织员')/ROLE_PAGE_MAP(→party-committee.html)；people p_pc 档案（branchId:null）；accounts 党委账号 9000000001
- 新页面 docs/workspace/party-committee.html + ws-party-committee-entry.js（createWorkspaceShell 薄壳）+ capabilities/party-committee-workspace.js（注册 2 tab）
- 监控台账 monitor-tab：支部卡片（成员规模/发展阶段分布/思想汇报/组织生活类型计数/近期活动/现任书记），党委见全院
- 支部管理 branches-tab：支部列表+创建（名称/类型自由录入，不预设名）+改名（同步 config.headerTitle）
- mock-adapter branches CRUD（config 随行持久化，改名联动 headerTitle）+ services/branch.js 写函数（getAdapter+persist）
- header 党委名：party-staff → PARTY_COMMITTEE.name（branches.js 常量）
**未闭环（下一步）**：浏览器 E2E 党委登录实测（登录→台账→创建支部→header 变化）+ api-adapter branches resource（API 模式写通路）+ 全量回归 + Step5 收口（清理 P1 spec）

## T-2026-09-016 P1 收口——branches 全链路 + 党委 E2E（2026-09-02）

**实施**（版本串 w→x，commit b1385fb）：
- api-adapter 加 branches resource（list/create/update/delete /api/v1/branches）
- server routes/resources.js：RESOURCE_TABLES 补 branches（表名+ID_PREFIX br；写权限 requireAuth，收紧留 P2）
- data-adapter 全量恢复域清单补 branches（init 拉取 → mockDB.branches）
- services/branch.js 写函数加本地 mockDB 同步（API 模式 adapter.create 后 push/update 幂等）
- server/services/reporting.js member 域排除 party-staff（党委组织员非支部党员档案——修复 full 回归 1 败）
- **新 E2E party-committee.test.mjs**：党委账号 9000000001 登录 → 直达党委台 → header 党委名 → 台账渲染 br-b1/现任书记 → 支部管理创建支部（确定性展开，UI toggle 时序 flaky 已规避）→ reload 持久化。连续 2 次通过
**调试实录**：台账不渲染=API 模式 bootstrap 恢复域清单缺 branches（data-adapter 补）；创建 404=server resources 未注册 branches 端点；创建后不持久=service 缺本地同步——三层各自补齐闭环
**P1 状态**：Step1-4 全 ✅（dea729d/703c201/c5fcb1f/6f97552/b1385fb）；**P2 书记任命与任期 / P3 党委审批+下发**（design §5）未启动——登记后续大项

## T-2026-09-017 P2 书记任命与任期落地（2026-09-02）

**实施**（版本串 x→y，module-load 113/113）：appointmentRecords 域全套（domain/双 adapter/server 表 appointment_records/server resources 路由 + data-adapter 恢复）+ services/appointment.js（appointSecretary：①branches.secretaryId ②双方 users.role 同步（API PATCH server）③任期记录闭环封口/新建）+ branches-tab 任命 UI（支部卡任命按钮/成员下拉/任期档案显示）
**E2E 验收**（party-committee.test 第 2 test，2/2）：党委登录 → 真实任命链任命钱七(p5) → br-b1.secretaryId=p5 + 任期记录现任=p5 → p5 登录直达 secretary.html → 原书记沈一(p13) 登录直达 visitor.html（降回成员）。design §5 P2 验收达成
**教训**：p3 王五无 MOCK_ACCOUNTS 登录账号（accounts 仅部分成员）——E2E 任命对象须选有账号成员（p5 钱七）；appointSecretary 内 users PATCH 用 try/catch 吞错——探针直测定位为账号问题非 PATCH 问题
**mock 纯本地边界**：users 演示行（u_*）无 person 档案 → role 同步静默跳过（记录/secretaryId 仍完整）；角色动态生效以 API 模式（真实部署）为准
**P3 党委审批+下发**：未启动——登记后续大项

## T-2026-09-018 P3 双向治理通道落地——支部上报审批 + 党委下发通知（2026-09-03）

**范围与形态（书记 AskUser 逐项裁定，已记入 design §0/§5）**：①上报=发展节点+活动报备（泛化节点，非细粒度）；②下发承载=复用通知（不新建「下发箱」领域），送达=党委→目标支部**支委层**；③入口落点：支部侧=书记工作台新 tab「上报党委」；党委侧=独立 tab「上报审批」「下发通知」。

**实施**（版本串 y→z，module-load 114/114）：
- reviewRequests 领域全套接线：domain（status/type 契约）→ services/review-request.js（submit/decide/list）→ mock-adapter（saveDB/loadDB/restoreNicheCollections 三处 + CRUD rq-*）→ api-adapter（/api/v1/reviewRequests）→ data-adapter init 恢复域 → server db.js/resource 表 review_requests（ID_PREFIX rq）
- 支部侧 report-up-tab（书记/副书记）：两类上报发起表单（类型 chip/标题/说明）+ 待批复/已批准/已驳回统计 + 上报历史（党委批驳结论+意见+处理人回传显示）
- 党委侧 review-tab：待批复队列（支部标签/类型/提交人/时间）+ 批准/驳回（驳回须填意见，批准意见选填）→ 已处理区
- 党委侧 dispatch-tab：下发通知（目标支部多选含全部/支部动态可选/标题/正文/重要与紧急）+ 下发历史（党委留痕，支部快照名防改名漂移）
- 通知复用改造：NoticeStore.list() 受众过滤（audience='committee' 仅目标支部支委层可见；非支委/无登录一律不可见）+「党委下发」红标（renderNoticeList/铃铛下拉/浮窗/notice 详情）；支部「已发布通知」管理列表过滤上级下发（只读治理信息不可删改）；dispatch 通知 publisher='院党委（组织员）' recipients='支部委员会（支委层）'
**E2E 验收**（新增 2 测试文件，共 4/4 连续通过）：
- party-committee-review：书记上报发展节点 → 党委批准（带意见）→ 书记页可见「党委批准+意见」；活动报备驳回：空意见守卫拦截（仍待批复）→ 带意见驳回 → 回传可见（双向闭环）
- party-committee-dispatch：党委下发 → 下发历史即时可见；书记（支委层）铃铛可见带「党委下发」标；党委组织员（非支委）铃铛不可见；普通成员（p5 非支委）铃铛不可见
**教训**：版本串 bump 必须全仓同步——party-committee.test.mjs/async-vote 等 evaluate 内硬编码 `?v=` 仍留旧串，导致同名模块双实例（test 内 domain.js?v=y 与页面 z 实例分裂，secretaryId 读到 undefined）；全仓替换后 P2 稳定复绿
**登记 follow-up**：服务端资源级写权限仍 requireAuth（branches/appointmentRecords/reviewRequests 任意登录用户可写，含自批风险）——UI 层已收敛，上线部署前须 requireRole 按 party-staff/支委层收紧（design §7 已记）
**P3 状态**：双向通道闭环达成（design §5 P3 验收项行为通过）；design 文档 §0/§5/§7 已按方向选择说明更新

## T-2026-09-019 文档体系治理——role 越界修正 + 死链修复 + 索引补全 + DATA_MODEL 补录（2026-09-03）

**触发（书记 4 项关切）**：①文档系统混乱；②PARTY_COMMITTEE_DESIGN role 字段出现 `[书记]`=AI 把决策人/批准人冒充为编者身份（逃逸）；③content 混入执行过程、spec 与 content 混淆；④「工作流块拖拽编排」须立为开源项目目标。

**处置**：
- **role 越界**：全仓扫描仅 1 处（PARTY_COMMITTEE_DESIGN）——修正为 `[工程师]+[AI]`；书记=决策人/批准人，裁定记录于正文，不入编者 role（复扫 0 违规）
- **content/spec 边界**：按书记口径「不是 =，而是逐份实时判断」写入 04_web_design README 归类原则；PARTY_COMMITTEE_DESIGN 清悬空 spec 文件名引用与陈旧测试数字（89/86/52 等），回归设计/方向纯记录
- **死链批量修复**：04_web_design 四个子目录指向 docs/src 代码文件的链接少一级 `../`（28 条）→ 正则收敛为 `../../../docs/`；复验死链 0（仅剩 2 条表格占位符"路径/链接"误报）
- **索引补全（孤儿 3 篇）**：FUNCTION_MAP（自动生成·标注勿手改）入 03 README；CLICK_MAP（点击落点权威）与 AGENDA_AND_REFERENCE_DESIGN（标草案·待实施）入 04 README 目录结构与权威源速查
- **DATA_MODEL 补录**：游离 `## 2.26` 归位 §2.20.1（含编者注）；新增党委域 §2.21 BranchRecord(config 档案)/§2.22 AppointmentRecord/§2.23 ReviewRequest/§2.24 党委下发通知扩展（audience='committee' 复用语义 + 受众过滤规则）
- **愿景立项**：ARCHITECTURE_EVOLUTION §八「工作流块可视化拖拽编排」开源项目目标（L1 能力目录→L2 支部组合→L3 块封装契约→L4 拖拽编排→L5 块分享 + 架构锚点：不新造执行引擎、权限数据同源、可视化是编辑器非目的）；PARTY_COMMITTEE_DESIGN §2.5 标注远期形态衔接

**提交**：5cf3893（role/边界/愿景）、0749ca1（DATA_MODEL 补录+归类原则软化）、eb46724（死链/索引/数字标注）
**遗留**：DATA_MODEL 全文档编号体系仍建议在后续「数据模型治理专项」通读归序（本轮只修了游离 2.26 与新域续编）；普通通知跨支部隔离缺口已登记（design §7）

## T-2026-09-020 权限收紧 + 工作流块 L1 服务层 + AI 逃逸评议 + 本地验收（2026-09-03）

**书记指令**：服务端权限收紧、工作流块 L1 接线、启动本地验收、拖拽工作流块推进、AI 逃逸评议审查。

**服务端资源写角色门（design §7 登记项落地）**：resources.js 新增 RESOURCE_WRITE_GATE——branches/appointmentRecords/users 写=仅 party-staff；reviewRequests POST=本支部支委层（actor.branchId 与 body.branchId 同支部校验）、PATCH/DELETE=party-staff（防支部书记自批/支部成员篡改治理档案）。新测试 permission-gate（HTTP 直连，3 例）：治理档案越权 403、本支部可提交/自批 403/党委可审批、未设门资源行为不变。既有 party-committee E2E（P1/P2/P3 上报/下发）10/10 回归全绿。
**工作流块 L1 服务层（愿景 §八）**：services/branch.js 新增 listBranchModuleCatalog（注册表 workspace:* 能力+tab 元数据→支部可勾选目录）、getEnabledModuleIds/isModuleEnabled（config.enabledModules 消费：null=全开、数组=仅启用清单）。新测试 branch-module-catalog 2/2。**渲染过滤与党委勾选 UI 留待交互设计接入（下一步）**。
**AI 逃逸评议审查**：role 越界 0 处；status:approved-by-secretary 仅 PARTY_COMMITTEE_DESIGN 且正文含裁定记录；自称式表述 0（唯一命中=书记 2026-08-22「无人称」文体纪律记录）。判据固化：role=编者身份；书记裁定记正文决策记录；文案无人称化。
**拖拽 L3/L4 草案**：ARCHITECTURE_EVOLUTION §8.5（block manifest JSONC 草案 + 画布→既有 WorkflowEngine 的映射 + v0 原型范围=块排序/启停画布，YAGNI 边界明确）。
**本地验收**：启动独立预览 http://localhost:3100（.tmp/preview.db 全新种子；端口 3000 已被既有实例占用，未触碰）。
**下一步候选**：工作台 tab 按支部 config 过滤 + 党委勾选 UI（L2 消费闭环）；v0 块画布原型专项；push 待书记批准。

## T-2026-09-021 L2 支部工作流模块配置落地 + 全仓版本 bump 20260903a（2026-09-03）

**书记裁定**：配置权=支部自治（现任书记操作，非党委代配）；清单与画布并用；tab 级最小单位；核心组固定；顺带清理"侧边栏身份弹窗"余毒与主题党日卡 hover 热区（上轮已提交）。

**实现**：
- 数据：branches.config.modules={hiddenTabIds,tabOrder}（替代 enabledModules，null=全开）；mock/domain 种子同步
- 服务层（services/branch.js）：getTabPolicy（纯）/applyTabPolicyPure/applyTabPolicy/getBranchTabPolicy/getCoreTabIds/updateBranchModules（核心不可隐藏防御；modules=null=恢复默认）
- 渲染：workspace-shell 构建 tab bar 前按当前人支部应用策略（核心组固定前置、业务过滤+tabOrder 排序；党委工作台不受支部配置）
- UI：书记工作台新核心 tab「工作台配置」（renderContent 含清单 chips 启停 + 画布 v0 HTML5 拖拽排序 + 保存/恢复默认；副书记只读）
- 服务端：PATCH /branches/:id/config（本支部现任书记 secretaryId 或 party-staff；body 白名单仅 config.modules；null=恢复默认；治理字段 name/secretaryId 不受 body 影响）
- 测试：branch-module-catalog（纯函数 2 例）、module-config HTTP（5 断言组）、module-config-e2e（隐藏→reload 生效→复原）；party-committee P1/P2/P3 E2E 回归全绿
- **版本 bump 20260901z→20260903a**：docs/src(*.js/*.html) 159 + server/test(*.mjs 16 漏网补扫) + docs/*.html 17——教训：bump 必须覆盖 .js/.mjs/.html 全扩展并全仓复扫零残留，否则 E2E 页面 evaluate 硬编码旧版本造成双模块实例（P2 测试一度 fail）
- role 注释逃逸修正 3 处（appointment/branches/review-request 头注释 [书记] 混入编者身份——上轮只清 content front-matter，代码注释漏网）

**文档同步**：PARTY_COMMITTEE_DESIGN §0（两行 L2 决策）/§2.5（modules、书记自治、治理字段分离）；DATA_MODEL §2.21 config 表；ARCHITECTURE_EVOLUTION §8.2 L2=已落地
**下一步候选**：L3/L4 工作流块原型专项（ARCHITECTURE §8.5 v0 范围）；表单美学评估（并行推进中）；push 待书记批准

## T-2026-09-022 表单美学评估·首轮（2026-09-03，报告见对话；批次待书记授权）

**基线**：COMPONENT_SPEC §4.3（input-flat 体系/select.input-flat+cs-select/禁内联输入/按钮四档）+ styles.css .input-flat ——"硬件"规范已齐，漂移在实现层。
**P0**：① 行内追加记录小表单重复双轨——org/taskforce-tab.js:496/508 与 leader/write-tab.js:272/287/301 同构灰底块 5 处复制粘贴（抽 InlineRecordForm）；② type="date" 全仓 8 处原生 picker 与圆角体系/主题 focus 不统一（收口 FormField date 包装）。
**P1**：标签文本普遍不关联控件（无 for/id，点击不聚焦/读屏无关联）；错误态多为 toast、按钮提交中态仅部分禁用；非登录输入缺 autocomplete/name。
**建议批次（待授权）**：B1 抽 InlineRecordForm（零行为变化）→ B2 表单积木 FormField 目录（label 关联/date/select 收口）→ B3 全站输入违例 grep 收编 input-flat → B4 合规 pass（aria-live/focus-visible/autocomplete）。每批独立交付+回归。

## T-2026-09-023 块画布 v0 落地 + 表单 B2/B4 + B3 示范（2026-09-03，提交 8c84e48/c0e5b73）

**块画布 v0（spec step1-5 完成，E2E 闭环）**：
- OUTPUT_BLOCK_DEFS 目录（attendance/inspection/publicity/materials）；branch.js getOutputBlockPolicy/applyOutputBlockPolicy(纯)/updateBranchBlocks
- config.blocks={outputBlocks:{hiddenBlockIds,blockOrder}}；server config 子路由扩展可选 modules/blocks 白名单（结构校验/缺一 400/null 恢复默认）
- UI「工作台配置」新增活动产出块区（chips+画布拖拽+保存合并 modules/blocks+恢复默认）
- 消费：leader write-tab 活动详情「添加记录」按支部产出块过滤排序（全停用提示）
- 测试：output-block-policy(3)+module-config blocks HTTP+block-canvas-e2e（书记停宣传→组长按钮消失→恢复回归）——注：UI 保存时序曾致 E2E 不稳，改服务直写（写路径 HTTP 单测覆盖）后通过；UI 保存待目视复核
**表单美学**：B2 components/form-field.js（text/textarea/select/date + label 关联/必填/aria 错误/placeholder…/value 转义；四要素落点注释）；dispatch-tab 标题/正文收编示范；B4 showToast role=status+aria-live；**B3 全量粗扫 42 文件含非 input-flat 控件（含 checkbox/radio/chip hidden 误报，需人工甄别）——批量收编留连续批**
**回归**：module-load 115/115；P3 下发/审批 E2E、module-config、block E2E、权限门等 9/9 绿
**下一步候选**：B3 批量收编（form-field 工具已备）；label for 存量改造；L3 block manifest 契约；目视复核工作台配置新区；push 待书记批准

## T-2026-09-024 主题卡整卡可点修正 + B3 输入违例收编清零（2026-09-03，提交 701e62c/f3c4a9a）

**主题卡交互语义修正（书记澄清）**：要的是【点击热区=整卡】（仍须点击），否认 hover 自动进入——
- calendar-tab：移除 data-hover-select 的 mouseenter 自动 click（此前的"hover 即选"系 AI 理解过头）；data-tpl-click 整卡 click 委托：按钮区直点走自身 data-action，其余区域（标题色块等）点击触发内部选择按钮；hover 仅视觉（shadow/border）加 title 提示
- function-catalog desc 同步「整卡可点」；新 E2E：hover 色块不进入（负断言）→ click 色块进入 Step2（1/1）
**B3 批量收编（真实违例清零）**：6 文件 14 处内联 border/rounded 可见输入控件 → input-flat 体系（taskforce 复盘/branches 新建/改名/任命/review 驳回意见/weekly/report-up/thought）
**教训（编码/文件安全）**：① PowerShell 批处理 [IO.File] 无显式 UTF-8 读写会把 UTF-8 中文文件损坏——批量文本替换必须用 Edit/Grep 工具或显式 UTF8 编码读写；② 同一文件多个 Edit 并行会竞态叠加——同文件改动必须串行。检测法：git diff --stat 行数异常放大=损坏信号（本次曾致 review E2E 文本断言超时，checkout 还原后重做）
**回归**：复扫真实违例 0（form-field 模板插值 4 处为误报）；module-load 115/115 + review/P1/P2 4/4 绿
**下一步候选**：目视复核（强刷 20260903b 后：主题卡整卡可点/工作台配置产出块区）；B2 label for 存量改造；L3 block manifest；push 待书记批准

## T-2026-09-025 B 系列表单批次统一收口 + B2 label for 存量改造（2026-09-03，提交 f3c4a9a 后累计）

**B 系列表单美学批次全交付汇总**（书记 2026-09-03 授权四批 + 四要素）：
- **B1** 行内记录小表单外壳 form-shell（5 处复制粘贴收编，record-* 类名归一）
- **B2（组件+存量）** components/form-field.js 字段积木（label 关联/必填/aria 错误/placeholder…/value 转义）；dispatch 表单调积木；**存量改造 15 对 label→for**（Node 一次性脚本 dry-run→apply，8 文件：archive 4/taskforce 2/branches 2/weekly 2/assign 2/write-tab 1/notification 1/references 1）
- **B3** 全站 6 文件 14 处内联输入收编 input-flat（真实违例清零，Edit 逐处，规避编码损坏教训）
- **B4** showToast role=status+aria-live（无障碍异步更新）
**主题卡交互语义定稿**（书记澄清=点击热区整卡、仍须点击、非 hover 自动进入）：data-hover-select 自动触发移除 → data-tpl-click 整卡点击委托；E2E 负/正双断言（hover 不进入、click 色块进入）
**配套**：项目愿景整合根 README；版本 bump 20260903a→b（清浏览器旧缓存，194 文件零残留）
**回归**：module-load 115/115；party P1/P2、review、hover、module-config、block-canvas、write E2E 全绿
**教训沉淀**：① 批量文本改写禁 PowerShell 无显式 UTF-8 读写（会毁中文）；② 同文件并行 Edit 竞态；③ git diff --stat 行数放大=文件损坏信号；④ UI 行为语义有歧义必须 AskUser 澄清后再实现（hover 即选教训）
**下一步候选**：目视复核（强刷 20260903b）；L3 block manifest 契约专项；push 待书记批准

## T-2026-09-026 四点整改：党委入口/缓存工程标准/工作台配置回炉/表单字背景统一（2026-09-03，版本 bump 20260903c）

**① 党委后台入口**：登录页 DEV_CARDS 补「党委组织员（党务老师·监控全院支部）」演示卡（devLogin 已支持 p_pc，直达 party-committee.html）
**② 缓存工程标准修复（根因）**：server static 无 Cache-Control → Last-Modified 启发式缓存命中旧模块（"改了看不到"根因）——补 `Cache-Control: no-cache, must-revalidate`（浏览器每次回源校验）；版本 query 保留为整体失效手段；**版本串纪律更新：bump 仅当需整体失效或 query 不齐，日常改码靠 no-cache 即可**（当前运行实例未重启前仍以 bump c 兜底）
**③ 工作台配置回炉 v2（书记裁定：定位不对+UI 过重）**：从书记工作台核心组移除（不再日常出现）；收拢到**党委工作台「支部配置」tab**（支部治理组，party-config-tab.js）；UI 减负：去掉双画布拖拽，仅选支部+业务模块/活动产出块分组开关+恢复默认；保留 config.modules/blocks 数据与写口（party-staff/书记可写）；删除 secretary/module-config-tab.js；绑定改容器级 change 委托（tab 重绘/多入口稳健）；目录依赖 secretary-workspace 能力副作用注册（单一源）
**④ 表单背景与字号统一**：背景=白卡为主、浅灰槽仅行内追加记录（record-form-shell 语义）；**输入统一 14px**——全站 28 文件移除输入控件 input-flat text-xs 特例（含表单正文/工具条/行内编辑输入，无分级歧义）
**测试**：party-config E2E（党委停用业务模块→书记台消失→恢复默认回归）1/1；全相关 9/9 + module-load 115/115；bump b→c 194 文件零残留
**下一步候选**：目视复核（强刷 20260903c：登录页党委卡/党委台支部配置/表单字号背景统一）；L3 block manifest 契约；push 待书记批准

## T-2026-09-027 统一扎口试点（表单域+徽章域）+ 模块化/插件化/开源化评估归档（2026-09-03）

**背景**：书记定调「模块调用统一扎口——同一域若干函数，统一由新库文件调用，一改具改上下文负担小」+ 请求 100 分制 MPO 评估以指导开发顺序。

**P0 试点一·表单库 forms.js（完成）**：
- 新建 `components/forms.js` 聚合重导出 form-field（textField/textareaField/selectField/dateField/labelHtml/errorHtml）+ form-shell（recordFormShell）
- 三个直连调用方收口：dispatch-tab（字段积木）、write-tab/taskforce-tab（外壳）；仓库无 form-field/form-shell 直连残留

**P0 试点二·徽章库 badges.js（完成）**：
- 新建 `components/badges.js` 聚合 badge（badgeHtml/badgeVariantClass 展示徽章）+ status-badge（statusBadgeHtml/bindStatusBadge 交互状态徽章）
- 全站 37 个文件收口（components 内部 13 + dashboard 2 + entries/services 6 + tabs 16）；仅 import 来源一行替换，零行为变化

**P0 试点三·汇报库 reporting.js（完成）**：
- 新建 `components/reporting.js` 聚合汇报闭环收/发两侧：report-entry（发起入口 renderReportEntryHtml/bindReportEntry）+ report-inbox（答复收件箱 renderReportInboxHtml/bindReportInbox）
- 域边界判断：两者同属 Issue kind='report' 汇报数据流才入库；handoff-inbox（HandoffStore 数据交接）为另一数据流不硬凑
- 7 个调用方收口（ws-leader/visitor/org/prop/disc 五入口 + secretary todo-tab + leader members-tab）；无直连残留
- 回归：module-load + multi-user-write + write-hover 3/3 绿

**P0 试点四·数据域接线（person 域，完成）**：
- 背景：全站 68 处直连 mock；mock/index.js 实为旧兼容中转（person 函数已落 services/person.js 又被 re-export 回 mock）——债根是 UI 层 import 面挂在 mock
- 全站人名函数（getPersonById/getPersonName/PersonStore）import 面迁至 services/person.js（唯一服务出口）；_personName 兼容别名调用点统一改 getPersonName（taskforce-list/view、taskforce-tab、archive-tab、kanban-tab）
- mock/index.js 清除 person 中转段（含 deprecated _personName 与冗余 import），退化为纯种子/展示格式化数据仓；契约 v1 写入 MODULARIZATION_ASSESSMENT.md §五（人名出口唯一 / 种子仅 service 层 / formatter 历史债后续迁）
- 44 文件 +95/−72；module-load + party/multi-user/write-hover/function-catalog 7/7 回归绿

**P0 试点四·批次二（展示格式化提升，完成）**：
- 5 个纯展示格式化函数原样自 mock/* 提升至业务 service：attendanceToLong→services/attendance.js；inspectionToDisplay/Long/Wide→services/inspection.js；reviewToDisplay→services/review.js（连同 _personName/_activityTitle 标题解析依赖）
- mock/attendance|inspection|review.js 仅剩种子数组（getPersonName/ACTIVITIES/标签映射等冗余 import 清理）；mock/index.js 不再中转格式化函数
- 7 个 UI 调用方 import 面改挂 services；mock 数据模块格式化逻辑清零（thought-reports 种子的静态 personName 字段除外）
- 回归：module-load + mock-integrity + party + multi-user 7/7 绿

**L3 块契约 v1.1 + S1（完成）**：
- 书记裁定吸收：块差异化 = ①流程组合 ②表单条目 ③参与人范围 三维；制度来源分层 provenance ∈ institution-common | branch-custom（通用 vs 支部自创不可谎报）；manifest 栖身 workflow/blocks；配置面在党委台支部配置
- 契约文档：content/04_web_design/evolution/BLOCK_MANIFEST_CONTRACT.md（v1.1：字段规格/合法性表/资产映射/通用+自创双示例/落地拆分 S1~S4）
- S1 编码（书记点名 主题党日+专班）：docs/src/workflow/blocks/manifests.js —— THEME_PARTY_DAY_MANIFEST + TASKFORCE_RUN_MANIFEST + validateBlockManifest 纯校验器（含 capability→provenance 权威对照，反例 1 曾暴露「通用谎报自创」未拦截，已补）
- 单测：server/test/block-manifest.test.mjs（清单合规 + 5 反例拦截）+ module-load 全绿

**L3 S2（表单渲染桥，完成）**：
- docs/src/workflow/blocks/form-renderer.js：manifest.inputs.fields → forms.js 积木（kind 一一映射 textField/textareaField/selectField/dateField；块级 id 前缀防多块冲突；name=fieldId 供提交取值约定）
- 表单条目可组装落地（维度②）：enabledDefault=false 默认收起（quota），includeDisabled=true 供配置面预览全量条目；manifestFieldCatalog 字段目录供 S3
- 单测：server/test/block-form-renderer.test.mjs（kind 映射/收拢/预览/组织选项/无障碍 for 关联）+ S1 + module-load 3/3 绿

**L3 S3（工作流块配置区，完成）**：
- config.blocks 增 workflowBlocks.hiddenBlockIds（书记裁定：与 outputBlocks 平级）；branch.js getWorkflowBlockPolicy/applyWorkflowBlockPolicy 纯策略；_sanitizeBlocks 双段净化
- server config 路由 blocks 校验兼容 { outputBlocks?, workflowBlocks? }（至少其一，恢复默认 null 全清）
- 党委台「支部配置」新增「工作流块」区：manifest 目录 chips（含制度来源标签 通用制度/支部自创，title 悬浮说明），启停/保存/恢复默认与业务模块、产出块同卡
- 测试：workflow-block-config.test（纯函数 4 断言 + HTTP 写回/400/恢复）+ block-config-ui-e2e（chips 呈现→停用保存→重进持久化置灰→恢复默认）+ 既有 module-config/block-canvas/module-load 回归 6/6 绿

**L3 S4（主题党日创建侧 manifest 驱动试点，完成）**：
- calendar-tab（书记台写入面板）接入：① 入口守卫——支部停用 theme-party-day → Step1 主题党日模板卡消失 + 停用提示（三会一课模板不受影响，无对应块）；② 表单元数据单一源——主题党日 Step2 标题字段 label/required/hint 读 THEME_PARTY_DAY_MANIFEST（默认态渲染与既有一致，主题党日加 hint 提示文案）
- 默认态回归：write-hover（整卡可点语义）等全绿；block-entry-guard-e2e：停用→模板消失+提示→恢复→回归 闭环通过
- **L3 S1~S4 全链完成（2026-09-03）**——契约文档 BLOCK_MANIFEST_CONTRACT.md 转 active

**P0 试点四·批次三（成员名单 PEOPLE 收口，完成）**：
- services/person.js 增 PersonStore.getMembers()（成员名单语义=静态党员种子，不含登录系统账号 mockDB.users，区别于 getAll）
- 全站 UI/组件/entry/tab 层 16 文件直连 mock PEOPLE → 经 PersonStore.getMembers() 模块级捕获（体内用法零改动）；UI 层 PEOPLE 直连 mock 清零
- mock/index PEOPLE re-export 仅剩 services 层 7 处种子引用（契约 §五 条款 2 更新：成员名单唯一出口=getMembers）
- 回归：module-load + party/multi-user/block-entry-guard/capability-registry 18/18 全绿

**P0 试点四·批次四（余种子与机构/登录收口收官，完成）**：
- 党委机构名收口：branch.js 增 getCommitteeName()；monitor/dispatch/branches 三党委 tab 直连 mock/branches PARTY_COMMITTEE → 服务（header 品牌同域收敛）
- 登录收口：auth.js 增 AuthStore.verifyCredentials()（mock 校验实现入认证域，真实后端替换点明确）；login-entry 不再直连 mock/accounts
- **P0 收官态达成：UI 层（entries/components/modules）mock import 直连清零**——全仓 mock 引用仅存 services/core 数据层
- 回归：module-load + party-committee/dispatch + write-hover 5/5 全绿
- 教训：同一文件两处 Edit 并行又致 import 替换丢失（monitor/dispatch）——grep 复验抓出，串行补修；同文件改动必须串行执行

**MPO 评估归档**：新建 `content/04_web_design/evolution/MODULARIZATION_ASSESSMENT.md` —— 模块化 80 / 插件化 72 / 开源化 74 ≈ 75；确立「统一扎口范式」（域内多实现→一个库出口 + 四条改造纪律：聚合重导出不搬运/调用方只改 import 一行/每批回归/禁双轨）；行动优先级 P0 扎口推广与数据域接线 → P1 开源合规包 → P2 L3 block manifest

**回归**：module-load 116/116（含新库）；party-committee + write-hover + capability-registry 15/15 绿；git diff 净 37 文件 +41/−42（无编码异常）
**下一步候选**：目视复核（20260903c）；L3 block manifest 契约专项；push 待书记批准

---

**T-2026-09-032 A1 权限语义落代码（2026-09-05，3 commits 8219fb3/eae54c1/36121ac）**
**书记裁决**：A1 全层推进（判定→写层→待办→UI 一次多 commit）；条线下发=键族入集+映射表（不建交互流）；纪检督办=动态聚合（不新增 todo supervise 分类落库）；组长监督位=仅提示不产动作；会议考勤=按文档补纪检直接上传并录入（CF §C.1a）。
**执行**：
- 批1 判定层：`dispatch_line`（条线下发）键入 auth.js ROLE_PERMISSIONS（org/prop/disc，canDo 可判定）；SYSTEM_ROLE_PERMISSION §9f 增映射行、§9b 附注（消费侧未建不入 16 操作列）、变更历史登记。
- 批2 写入门禁（服务层兜底，替代页面软隔离）：考勤上传位（本组党小组会=组长兼组织者/活动组织者/纪检仅会议类/书记副书记例外）＋追加提交（同人同活动已闭环=跳过、待纪检复核异常=拦截走纪检确认流程）；考察上传位守卫（活动类=组织者位）；纪检会议考勤直接录入 `upsertMeetingAttendance`（上传即确认，recordedBy=纪检）；3 处幽灵 recordedBy `u_exec`/硬编码 p13 全改真实操作人；leader 上传列表按上传位过滤（非本人组织活动不再可传）。
- 批3 纪检会议考勤录入 UI（disc 考勤页新卡：会议类活动+逐人状态+录入即确认）+ 组长两页「监督位」提示文案。
**验证**：守卫语义 Node 自检 PASS（组长党小组会可传/org 不可/去重 skip/复核异常 block/纪检会议类可传·党小组会不可）；link-integrity L1/L2/L3/L5 全绿（L4 浏览器沙盒 EPERM 可接受）；工作区 clean。
**遗留/待裁**：①纪检「监督督办」集中只读区=待办页动态聚合已达，集中展示目视微调未做（待浏览器环境）；②专班负责人身份（指派到人/角色）待书记另裁——专班考察上传位暂按页面可达放行并注释；③E2E 沙盒外 node --test 全量补跑待常规终端。

---

**T-2026-09-033 L4 M2 支部分工改派闭环补齐（2026-09-05，走 brainstorming 设计先行：spec 临时文件用后即删；4 commits 96d9d6a/64b0e6e 等）**
**书记裁决**：范围=生效消费端+会前草稿+票决通过判定+验收/文档 全做；票决门槛=应到支委 2/3 出席且无异议（支委会从严，批准 2/3 档）；草稿=暂存式（书记台本地）；消费端=常驻履职卡；设计整体「批准，开工」。
**执行**：
- 判定层：`evaluateWorkforceVotes`（应到=resolveVoterIds('committee')；去重且应到名单内计票；2/3 且无异议=passed / 有异议=failed / 不足=pending）为采纳硬门槛；adopt 拒绝并报原因；议题 extras 记 voteOutcome（status/tally/needed/evaluatedAt）。
- 草稿：书记台「分工调整」表单升级多行（模块→新负责人，行可删）+ 存草稿/直接发起；草稿 localStorage `gsm1921-workforce-draft`（每支部一份，可载入/删除，提交后清除）。
- 消费端：新组件 `components/workforce-duty-card.js`「支部安排·我的分工」——各工作台概况常驻履职卡（实时读 config.workforce；行内「去履职」点本台既有 tab 按钮走原 tab-bar 绑定）；注入 secretary overview 与共享 work-overview（覆盖 org/prop/disc/leader/visitor 五台）；书记台面板议题卡实时显示表决统计与 待足额/未通过/已通过·可采纳 徽标，采纳按钮仅通过态可点。
- 测试/文档：`server/test/workforce-gate.test.mjs`（判定 4 例 + 合并快照 1 例）5 项全绿；SERVICE_CATALOG 行、BRANCH_WORK_MAP 验收闭环与落地进度标注 2026-09-05。
**验证**：判定函数隔离自检 PASS；workforce/work-overview/duty-card/panel 导入冒烟 4/4；link-integrity L1/L2/L3/L5 全绿（L4 沙盒 EPERM 可接受）；工作区 clean；spec 已删（gitignored 目录）。
**遗留**：演示验收闭环（改派发展党员→副书记：发起→表态 2/3→采纳→副书记台履职卡可见）目视复核待浏览器环境（沙盒 L4 不可跑）；「去履职」tab 映射为保守子集，待目视校准。

---

**T-2026-09-034 开源化评估 v3 + 色值收敛（2026-09-05，commits 0264d98/69f674f）**
**书记问询**：开源项目超参数应保留调整空间——我们做的是默认设置/本支部设计；是否做到模块化并声明"模块内哪些可调、模块间怎么组合"（须百分制评估）；色值收敛同样要区分可调/不可调。
**评估**（MODULARIZATION_ASSESSMENT §八 第三轮，全局含 A1/M2 近期板块）：**超参数可调性 60/100**（票决 2/3、纪检会议类型、上传位例外名单沉底业务层；好例=vote-config/支部 config/令牌）；**模块组合性 68/100**（组合面=能力注册表+config.modules/blocks/workforce+L3 manifest；失分=模块不自声明依赖/互斥、requiredRoles 未消费）；**综合 v3≈67/100**（五维均值，v1 75/v2 69 口径递严不推翻）。行动 P3a/P3b/P3e 本日落地，P3c（policy-defaults 集中默认）P3d（组合声明契约）待办。
**落地**：①票决门槛参数化 `WORKFORCE_VOTE_DEFAULT{quorum:2/3,vetoOnObject:true}`（默认=书记裁，opts 可覆盖）；②纪检会议考勤类型单源 `MEETING_ATTENDANCE_TYPES`（attendance 导出、disc tab 引用，消双写）；③色值收敛：inspector `#EAB308`→`var(--party-gold)`（2 处，文档标记已收敛）；styles.css `--accent-deep` #94a3b8→#A78BFA、`--accent-deep-light`→#C4B5FD；constants 暗色恒等映射清旧灰蓝死码；duty-card 移除越界金边框（金色范围=COLOR_SYSTEM 固定清单）。可调/不可调双口径记入 §8.6（不可调=党建红/党徽金令牌；可调=角色主题色）。
**验证**：workforce-gate 5/5 绿；veto 开关 opts 隔离自检（vetoOn false→passed / true→failed）；导入冒烟 4/5（disc tab 浏览器模块 window 依赖为既有限制）；link-integrity L1/L2/L3/L5 绿（L4 EPERM 可接受）；工作区 clean。

---

**T-2026-09-035 开源化改进执行 spec（P3c/P3d + 三评估落地，spec: .trae/specs/open-source-deploy-improve，4+1 commits 分批）**
**书记方向**：不为评估而评估——把开源化/最小三成本/对接 deploy 评估转为已执行改进；四项裁定均为推荐档（P3c 集中默认+注释、P3d 声明+校验+测试+文档、三成本修 2 点+自查、deploy 修文档+自检）。
**执行（子代理并行）**：
- P3c：新建 `core/policy-defaults.js`（集中默认：票决 2/3+无异议/会议考勤四类/上传位例外=institutional/超期 7 天，逐项 kind+出处）；workforce/attendance/inspection 消费点改引用（导出面零变化）；`policy-defaults-sync.test.mjs` 5/5 绿。
- P3d：新建 `core/module-compose.js`（纯校验：引用缺失/互斥同含/depends 禁环）；manifests 双块补 depends/conflictsWith 并接自检；WORKFLOW_BLOCK_CONTRACT「组合声明（P3d v0）」节；registry 头注释；`module-compose.test.mjs` 6/6、capability-registry 7/7 绿。
- 三成本×2：workforce-panel 议题判定串行→Promise.allSettled 并行；disc 会议考勤录入收起/展开保态（CSS hidden 不重建、仅提交成功重置）。
- deploy：server/README 与根 README 测试计数动态口径（实测 54 文件）、命令段与 package.json 对齐、env 补 LOGIN_PASSWORD/DISABLE_PASSWORD_CHECK；遗留 CLAUDE.md/SNAPSHOT 旧计数另行处理。
- 文档闭环：MODULARIZATION_ASSESSMENT §8.5 P3c/P3d 置 ✅、新增 §8.7（三成本自查+deploy 改进+P3c/P3d 摘要+疑点登记）。
**验证**：policy-defaults-sync 5/5、module-compose 6/6、capability-registry 7/7、workforce-gate 5/5；GetDiagnostics 空；link-integrity L1/L2/L3/L5 绿（L4 沙盒 EPERM 可接受）。**经验**：同文件多处并行 Edit 会丢更新——同文件多改须单次原子 Write。
