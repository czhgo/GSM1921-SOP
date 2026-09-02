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
