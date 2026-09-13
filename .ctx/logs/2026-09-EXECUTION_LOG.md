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

---

**T-2026-09-036 术语警讯 + 书记台面板保态 + 评估覆盖收敛 + CRUD/减负落档（2026-09-05）**
**书记输入**：①「秘书」翻译警讯——书记≠秘书；②修书记台分工面板展开态丢表单疑点；③推进 CRUD 评议、对齐 SOP、思考减负空间；④评估文档得分越来越低/表格越来越长——该覆盖就覆盖。
**执行**：
- 术语修复：书记台/书记页之「书记」被误译为「秘书」处全仓清零（MODULARIZATION §8.7 疑点行 + 2026-08 执行日志 PersonPicker 段 3 处）；根因=书记台英文 key 'secretary' 直译致中文误写，恢复「书记」惯译（警惕 T1 术语纪律）。
- 书记台分工面板保态：发起表单区（#wf-form-zone）独立于议题列表容器——renderBody（采纳/存草稿等）重建列表不再清空未提交表单；首次展开渲染、此后仅 CSS hidden 折叠；发起成功才清表单。最小操作成本（三成本自查修复③）。
- 评估文档覆盖收敛：MODULARIZATION_ASSESSMENT 速览由 9 行（v1/v2/v3 叠加）收敛为单表当前口径 5 维+综合——模块化 74/插件化 73/开源化 70/超参数 76/组合 76/**综合≈74**（v1 75→v2 69→v3 67→当前 74 回升，沿革指执行日志，覆盖式维护不再逐轮留行）；§八 8.1/8.2/8.4 基线与当前双标注。
- CRUD/功能实现评议轮次（A1/M2/履职卡↔SOP 对照，附录⑧ 记录 7 项已对齐 + 遗留待裁 2 项：participant record_inspection 键、capability requiredRoles 门禁未消费——登记待书记裁）。
- 减负候选登记（附录⑥ 第二批复选 4 项：面板保态面批量复查/文档数字风化/评估表逐轮加行/含 CLAUDE 与 SNAPSHOT 旧计数待清）。
**验证**：workforce-panel 导入冒烟 OK；术语残留 grep 清零；link-integrity 基线 L1/L2/L3/L5 绿（L4 EPERM 可接受）。

---

**T-2026-09-037 CRUD 遗留裁定落地 + 减负批执行（2026-09-05，AskUserQuestion 四项全按推荐）**
**裁定与落地**：
- ①participant `record_inspection` → **收敛去键**：auth.js participant 键移除（注释记裁定）；SYSTEM_ROLE_PERMISSION §9d 单元格改「--（本人素材走活动参与记录）」；`Y(自己的)` 死定义删除（理论复用评议：无下游承接即删）。
- ②capability `requiredRoles` → **登记 L3 债不动**（页面入口 ROLE_PAGE_MAP 隔离足够；getCapabilities role 过滤=可选双保险）——经查 registry.js getCapabilities 已支持 role 过滤且 activity-panel 等已用，workspace-shell 未传 role 属实。
- ③CLAUDE.md:131 测试计数改动态口径；SNAPSHOT 树注释去固定计数（v18 里程碑行=历史记录保留）；SNAPSHOT 全量 v19 刷新（旧名清理）仍挂 .ctx 运行时层。
- ④面板保态：检查要点固化入 REVIEW_QUEUE 附录⑧（2026-09-05 面板保态检查要点 + 术语纪律提醒）；附录⑥候选 2-4 标注书记批与进度；版本串纪律要点误删已补回。
**验证**：roles-sync 4/4 绿（矩阵↔代码键同步完好）；permission-gate 3 项 401 系沙盒无 live server 登录（E2E 限制非本次改动）；link-integrity L1/L2/L3/L5 绿（L4 EPERM 可接受）。

---

**T-2026-09-038 六场景功能点验 + 考勤批量/更正 + 议程安全与可见锚点（2026-09-05）**
**书记输入**：点验 ①支委会表决 ②打磨议程 ③发布大会 ④上传大会考勤 ⑤创建活动通知 ⑥专班进度介入 六场景完整性与操作减负；考勤是否「逐个点」→ 批量怎么批（/goal + brainstorming + dogfood；dogfood 浏览器工具沙盒 EPERM 受限，采用代码级点验 + 待常规终端目视）。
**点验结论（代码证据全记录于 REVIEW_QUEUE 附录⑧ 轮次记录/检查要点）**：①闭环但委员端无自然投票入口/通知无直达/公共页不见讨论文件/draft 即可表决；②有数据事故缺口（编辑丢结构化字段与 item.id→票孤儿，agenda-editing.js 死代码）；③半可用（线下大会议程成员不可见、无发布态）；④链路可用但逐人贵（50 人≈55+ 击，服务层已幂等具备批量前提）；⑤秘书闭环但通知无 activity 锚点、组长无成员通知；⑥主干可用但专班无进度字段/贡献无写入→解散门槛恒阻塞/待审核空壳。
**书记裁定**：考勤=方案A（全选批量）+纪检更正入口；修复②③⑤① 本轮；⑥专班=另立项分批。
**落地（并行 3 子代理）**：①activity-view 支委表决槽+只读议程（复用 vote-widget，canVote=voterIds）；②inspector 议程编辑接线 agenda-editing.js（保存保留 id/kinds/result/扩展字段）+ 保存后活动锚定通知；③activity.html 对含议程活动恒定渲染议程区 + decision-tree/calendar 通知补 activity 锚点（直达/邮件定向/随活动归档）；④会议考勤 Picker stageBatch+全选支部成员+已录预填原状态，upsertMeetingAttendance 增 opts.overwrite（同权威可覆盖，返回 added/updated/skipped 分项回执，默认语义不变）。
**验证**：attendance 行为冒烟 4 例全对（新增/默认 skip 旧语义/本人权威覆盖/他人权威拒盖）；inspector 行为冒烟 5 断言全对（删行+空行剔除+字段全保留）；GetDiagnostics 全零；node --check 通过；浏览器目视待常规终端。
**遗留**：立项③专班专项（a-d 阶段+应到名单权威源待裁）；通知锚点未覆盖 committee-vote 表态进度/截止提醒（同型待补，已登记检查要点）。

---

**T-2026-09-039 开源 README 一般化 + 支部版迁移 + 数据刷新 7~9 月真人名 + 立项③a + 考勤批量单测（2026-09-05，4 commits 98cbc4b/4d38cf9/9e99fc5/c631f07）**
**书记口径**：①根 README 一般化——不以「光华…Org OS」框定，以设计原则+别组织可用功能+可能性为主，「复用与二次开发」为核心章节（没有之一）；版式=顶部 logo 区+链接行（仅支部成员版）。②成员版=原九章正文，迁新文件。③启动立项③分阶段 + 批量考勤补单测（有疑问 ask）。④数据重排 3–6 月→7–9 月窗口（基 09-05）+ 全真人名去「一二三四」占位（书记=储子禾）。
**落地**：
- README：根 README.md 重写为一般化开源版（这是什么→设计原则→「别的组织可以用它做什么」→**复用与二次开发（替换入口总表/可能性/示例组织声明）**→快速开始→功能与结构→开发验证→License→成员版章节索引（一~八锚点桥，九以根文件核心节为准））；原九章正文整体迁 README-members.md（FUNC-MAP 标记随迁，gen-function-mermaid/function-map-sync 路径同步）。
- 数据：docs/src/mock 11 文件+org todo-tab 重排：旧 3–6 月活动 act-1~20 确定性平移至 7/1~7/24（id/相对序不变）、考勤/复盘/通知/专班等以活动锚同步；p1~p15 占位名→真人名（书记 p13=储子禾、组织=高翔宇、宣传=方文静、纪检=董建军、副书记=潘振华…）；12 个 server 测试断言同步。
- 立项③阶段a：taskforce 加 progressList（add/removeProgress 服务）+ org 详情「中间进度」时间线（active 填报、本人可删）+ 组长/纪检只读展示；阶段 b/c/d 待启动。
- 考勤批量单测：attendance-batch.test.mjs 6 例（新增/旧语义 skip/纪检本人覆盖/他人权威拒盖/批量混合/常量单一源）。
**验证**：纯 node 21/21 全绿（attendance-batch 6 + roles-sync + policy + workforce-gate + function-map + report + seed）；数据敏感纯测试 24/24 + 全量审计通过；GetDiagnostics 零；浏览器 E2E/link-integrity 沙盒 EPERM 无法跑（README 在扫描范围外的仓库根，content/docs 未动）——待常规终端 npm test 复核。工作区净（除本批提交外零残留）。
**待办**：立项③ b（贡献写入位，建议优先）→c→d；「应到名单」权威源待书记裁（考勤方案B/党委组织员入会名单）；README 英文/logo 图片占位后续；committee-vote 通知锚点补全。

---

**T-2026-09-040 书记检查前收尾：立项③ b/c/d 全落地 + committee-vote 锚点 + 数据/单测复核（2026-09-05，3 commits 191ea76/229a22b/ccd8819）**
**收尾审计结论**（逐项核对书记要求）：①批量考勤单测 ✅（attendance-batch 6 例，commit 9e99fc5）；立项③ 阶段 b（贡献写入 addContributions+org 录入区）、c（创建=pending_review→书记批准 recruiting/驳回 draft+重新提交，复用 _spawnTaskforceApprovalTodo）、d（纪检复盘批量确认，同单行口径 N/M 回执）本轮全部落地。②数据复核 ✅：mock 无 2026-03~06 残留、无「一二三四」数字人名（仅「第二期/五四/七月」等合法词），真人名=书记储子禾/组织高翔宇/纪检董建军/宣传方文静/副书记潘振华。③committee-vote 通知补活动定位锚点：targetUrl 带 activityId 直达书记台对应活动 inspector（避免 type/id 规则把书记误导到 activity.html 丢失记录决议入口），notice.archiveBySource 扩展匹配 targetUrl 活动号——两则书记通知随活动归档不再孤儿。
**验证**：5/6 新改文件 node 导入 OK（secretary todo-tab 顶层 localStorage 属既有浏览器依赖，GetDiagnostics 零错误）；taskforce addContributions 行为冒烟全过（空白 desc/非成员/不存在拒、批量每人+1、去重、旧数据兼容）；review-tab 顶层导入正常；浏览器交互/目视待常规终端。
**待办**：全量 npm test（含浏览器 E2E）常规终端复核；「应到名单」权威源待书记裁；README logo/英文占位后续。

---

**T-2026-09-041 滞留党员·应到名单落地 + 弃用 logo（2026-09-06，commit b75681a）**
**书记裁决（产品/逻辑）**：①不使用 logo（README 维持文字版式，删除 logo 相关待办表述）；②「滞留党员」=关系在·人不在；应到口径=三会+党课统一「党员（正式+预备）非滞留」；标记=状态字段+备注；组织维护+全局剔除；③模块化/插件化/开源化将再评（见下轮发问）。
**落地**：services/roster.js（getMeetingRoster/getRosterStats/saveResidenceChange 留痕，policy attendance.roster 单一源 partyStages/excludeDetained）；people.js p5/p9 示范滞留（在册党员 21，应到 19）；纪检会议考勤候选/全选收敛应到（支部大会/党课/组织生活会）、滞留徽标+备注、p_pc 不再入候选；组织委员 org「人才库」维护在校/滞留+备注留痕、书记 secretary 概况「滞留复核」卡；domain.js Person @typedef。
**验证**：roster.test 9/9（口径/滞留排除/列席不计/小组按组/候选=全选/p_pc 剔除/统计/留痕即时生效）+ attendance-batch 6 + roles-sync 4 + policy-sync 5 = 24/24 全绿；GetDiagnostics 零。
**遗留**：①滞留「可见不可选」用候选剔除+徽标说明（Picker 无逐人禁用，需要另立项）；②线上表决 voterIds 快照与滞留语义兼容（线上不需到场）；③组长小组会表单未接 roster（后续同 util）；④浏览器目视待常规终端。

---

**T-2026-09-042 模块化/插件化/开源化再评 v4 + 换壳指南 + 演示一键重置（2026-09-06，commit 待）**
**书记定调（产品/逻辑多问轮）**：①弃用 logo（README 维持文字版式）；②滞留/应到口径已裁（见 T-041）；③评估再评=「综合分反映二开组合能力」「重改进不唯分」「开源长期交付形态=模板型」；本轮改进选：换壳指南+一键演示 / 换组织向导(大) / 空模板分离(大)。
**评估 v4（MODULARIZATION_ASSESSMENT 覆盖式更新）**：模块化 75 / 插件化 75 / 开源化 74 / 超参数可调性 78 / 组合能力(二开视角) 78 / **综合≈76**（口径回归+新增可换壳证据；失分仍=config 驱动未接、requiredRoles 未消费、拖拽编排未实现、登录缺省弱口令、无 English）。§8.8 行动 P4a✅/P4b 立项④/P4c 立项⑤/P4d 后续。
**落地**：README「给新组织：30 分钟换壳指南」（5 步：clone 跑→换 mock 数据清单→角色/权限/术语/配色/policy→支部名与分支配置→验证含应到口径与 ?reset=1）；mock-adapter 支持 `?reset=1`（浏览器演示一键回种子：无 API token 才执行、清 workflowos_*/gsm1921-*/sop_org_os_* 与历史遗留键→去参 reload），README 快速开始补说明。
**验证**：link-integrity L1/L2/L3/L5 全过（L4 EPERM 待常规终端）；mock-adapter node 加载 OK；GetDiagnostics 零。立项④⑤ 已登记 REVIEW_QUEUE 待启动（spec 先行）。

---

**T-2026-09-043 提问准则定稿 + 待办/待决策同步（2026-09-06）**
**书记原话**：「书记不是决断代码的，而是决断 strategy、product、marketing 的！！这个原则请你务必写入 AI 提问书记的准则中！！要做一个好秘书！！」
**落地**：CLAUDE.md H60 增「向书记提问/请裁的准则」段（书记决断 strategy/product/marketing；AI 负责代码工程；请裁一律译为战略/产品/运营叙事层选项+上下文+推荐；把决策做薄、把问题做厚；适用 H60 评议/REVIEW_QUEUE 问裁/立项审批/AskUserQuestion）。
**同步**：全仓待办/待决策总表见会话收尾 NEXT PROMPT；周期任务现状=W3 每周书记内容评议（OPERATIONS_GUIDE §17）+ W4 常态化专项周轮（反论/理论复用/黑话/原话复核/三成本/减负/AI逃逸/功能实现）已存在，待书记发起的为减负⑥轮次与下一评议轮侧重。

---

**T-2026-09-044 立项④换组织向导——设计+阶段一实现（2026-09-06，commits ed91d07/3720e9e）**
**书记多轮裁定（R1–R4，全部产品/叙事层，AI 未越界）**：主线=向导；push 仍不推；换壳导向；可改即改+余出换壳工作单；五步全选；吸收合并 party-config；入口=党委台向导化+独立 URL 页；书记=URL 直达限本支部（保住 09-03 减负）；党委=任意支部+恢复默认；配置即时生效+留痕、无审批闸；「书记与党委都有配置权力且要有对应功能」已落实为权限双轨。
**交付**：设计文档 content/04_web_design/evolution/2026-09-06-org-setup-wizard-design.md（ed91d07）；阶段一代码 3720e9e：components/org-setup-wizard.js（5 步：①组织信息 name/headerTitle/desc/themePreset（可调令牌 4 预设，party-red/gold 固定锁）②模块块组合（原 party-config 主体）③角色分工（11 模块→支委，config.workforce）④指引+工作单 md（services/org-wizard-report.js 纯函数）⑤roster 现读数+?reset=1+npm test）；party-config-tab 改造为向导式主体；独立 docs/wizard.html+wizard-entry.js（书记限本支部/党委任意/他角色无权限卡）；branch 服务 updateBranchOrg/getBranchOrg/getBranchThemePreset + configChangeHistory 留痕（前端+server/routes/resources.js PATCH 白名单扩+逐键 diff）；config-clean sanitizeConfigOrg/THEME_PRESET_IDS 双端共用；草稿 wizard-draft-<branchId> 续走；测试 wizard-report 6 + org-config 4 全绿（老 module-config/workflow-block HTTP 需 DISABLE_PASSWORD_CHECK=1 属基线，未动）。
**验证**：node 全绿（带 env 14/14）；GetDiagnostics 零；浏览器交互冒烟由实施代理 25/25（沙箱内非 Playwright，目视待常规终端）。
**风险/备注**：实施发现工作区存在 8 个**用户并行改动文件**（.ctx/logs、inspector、work-overview、mock-adapter、activity-entry、taskforce-tab、overview-tab）——全程未触碰未提交，保留给用户；本批提交仅含向导 10 文件。阶段二（JSON 覆盖预览/多支部批量/党委默认模板/打磨）已登记立项④。push 仍待批（ahead 113）。

---

**T-2026-09-045 立项④阶段二 + 并行文件复核/BOM 清理（2026-09-06，commits e6551a5/17710fb）**
**书记裁定（阶段二四问，产品层）**：①JSON 覆盖预览=导出+本地预览应用 ②多支部批量 ③党委默认模板=先做「复制配置到支部」（完整模板抽象待多支部场景）④顺手打磨；BOM 机械杂质同意清除。
**交付**：org-config-package.js（build/apply：kind/version 校验、config-clean 逐域净化、留痕 config-package-import、无变化不留痕）；branch.applyConfigCopy（源→多 target、includeOrg 开关、config-copied 留痕、逐条结果）；向导工具条=导出 json/导入 file→apply→toast+重渲染/复制面板（仅 party-staff；单支部空态）；打磨=已完成步骤回看+无 emoji 摘要 chips；设计文档补阶段二与 Out of Scope 更新。
**复核**：8 个用户并行文件=无实质内容分歧（inspector/mock-adapter/taskforce-tab 为空 diff 的 CRLF stat 伪差，add 刷新归零）；work-overview/activity-entry/overview-tab/.ctx 08 日志仅首部重复 BOM 杂质——node 一次性脚本剥除（内容零改动，机械性）。
**验证**：wizard-package 9 + wizard-copy 6 + 回归 34/34 全绿；GetDiagnostics 零；浏览器目视待常规终端。工作区净；push 仍待批（ahead 116）。

---

**T-2026-09-046 立项④阶段三目标1 + 应到三小遗留①②③ + 立项⑤spec + REVIEW_QUEUE 真/假决策清理（2026-09-06，commits 待）**
**书记裁定**：①阶段三=两目标全做（目标1 数据预览实施 + 目标2/立项⑤ 开 spec）；②REVIEW_QUEUE 按盘点清理（真决策保留、假决策标 ✅/清理）；③应到三小遗留 ①②③ 全部立项。
**交付**：
- 目标1：services/org-base-data-preview.js（模板导出/净化/stats=roster 口径一致）+ person.js PersonStore overlay（仅基础字段、不写种子、clear 回种子）+ 向导「成员名册预览」面板（下载模板/导入预览/应用/清除，UI 注明业务历史仍关联演示成员、正式换数据走工作单）；base-data-preview 7 测试。
- ①②③：person-picker disabledIds+滞留徽标（可见可辨禁选）；roster getMeetingRosterCandidates（候选=党员含滞留/disabled=滞留）；纪检会议表单全员可见 p5/p9 禁选；leader 党小组会候选=组内党员+滞留禁选+应到提示条；vote-config resolveVoterIds 现时剔滞留（新表决默认=roster，支委会/支部大会；历史快照 act-31 不回改+注释）；workforce/calendar 创建点同步；roster-vote-link 10 测试。
- 立项⑤ spec：content/04_web_design/evolution/2026-09-06-empty-template-seed-design.md 成稿（六验收判据/阶段 A 空模板+建新支部入口→B ?reset 分层与服务端对齐→C 模板市场化）。
- REVIEW_QUEUE 清理：COMMISSIONER L399/党小组 L27-L31 残留标 ✅（T-263 已决）；附录⑥候选1 色值已迁移标 ✅；附录⑧思想汇报判例复核=已实现（thought-report-tab/domain/种子均在）转轻复核完结；应到遗留①②③ 回填已落地；立项④ 阶段三/立项⑤ spec 进度更新。
**验证**：纯 node 52/52 全绿（base-data-preview 7 + roster-vote-link 10 + roster 9 + attendance-batch 6 + org-config 4 + wizard-package 9 + wizard-report 6 等）；GetDiagnostics 零；HTTP E2E/浏览器目视待常规终端（async-vote 系列注释已同步）。
**待办**：立项⑤ 阶段 A（空模板 seed+建新支部入口）启动；W4 减负⑥ 面板保态批量排查与 SNAPSHOT v19 仍挂 AI 待办；push 仍待批（ahead 121）。

---

**T-2026-09-047 spec 安置纪律 + 立项⑤阶段A（2026-09-06，commits 94c4520/1984ba9）**
**书记裁定（product/治理）**：①「为什么 spec 又在 content」——误置根因=docs/superpowers 被 gitignore 时图省事放入 content/04_web_design/evolution，违反 content 只放长期权威源与 spec 用后即删；②未来 spec 入 .trae/specs（gitignore 受管临时区），用后即删；③存量=立项④ spec 删除（裁定已在 REVIEW_QUEUE/日志收敛）、立项⑤ spec 迁 .trae；④阶段A 前后端同做。
**落地**：CLAUDE.md 清理纪律补「spec/临时设计文档位置纪律」（禁入 content）；content 两篇 spec 删除（-120 行）、⑤ spec 移至 .trae/specs/2026-09-06-empty-template-seed/spec.md、上轮残留 open-source-deploy-improve spec 清；立项④/⑤ 队列条目改路径引用与进度。
**立项⑤阶段A**：EMPTY_BRANCH_TEMPLATE+createBranch（empty/copy、留痕 branch-created from empty-template/branch:源）；server POST /branches（party-staff 201/400/403，旧表单兼容）；向导「新建支部…」面板（party-staff 限、成功切新支部提示走 5 步）；branches-tab 适配；auditEmptyBranchRecord 引用审计三查；前端 mock 与服务端内联同构造口径、归一化 deepEqual 双形态守护；empty-template 10 测试+回归 42/42 绿。
**域分区缺口（诚实登记）**：业务域与 people 单支部全域非 branch 分区→空支部"业务为空"=记录零引用零人物 id（验收 1/2 可达），全域分区不入本阶段。阶段B（?reset 分层/服务端对齐补全）待启动。
**常规终端待跑**：mock-integrity + 浏览器目视（新建空/复制→5 步、branches-tab、?reset=1）+ async-vote HTTP E2E。push 仍待批（ahead 123）。

---

**T-2026-09-048 立项⑤阶段B + 减负⑥批量排查 + SNAPSHOT v19（2026-09-06，commits 待）**
**① 立项⑤阶段B**：?reset 分层= demo（?reset=1 历史别名）清演示键集回种子 / preview 清运行时 overlay+预览键（gsm1921-base-data-preview、wizard-draft-*）不动演示本体 / 未知不动作；API 模式（有 token）两档跳过（服务器权威）；mock-adapter reset 重构为可导入纯函数（resolveResetTier/collectResetKeys/handleResetIfRequested）；服务端 GET /branches 全字段透传核对=零补丁 + POST→GET 逐位一致断言；README 补两档与 API 重置说明；reset-tier 9 测试+empty-template 11。
**② 减负⑥ 面板保态批量排查**：全工作台 30+ 面板审计（判据=手动折叠须 CSS 保态；外部 re-render/提交后重建可接受），3 处真缺陷修复→常驻 DOM+hidden 保态（org/inspection-tab 考察上传、leader/attendance-tab 党小组会上传、visitor/review-tab 我的复盘展开）；其余审计通过。
**③ SNAPSHOT v19**：覆盖式 169→148 行——v19/真人名注册（储子禾等）/7-9 月窗口/旧名与计数清理（目录计数动态化、db 32 表与页面 18 实测）/新功能登记（roster·会议考勤批量·立项③·锚点·评估 v4·向导·空模板·spec 纪律·H60 提问准则）/理论表+权限矩阵校正；自查零「秘书」中文、零占位名。
**验证**：52/52 全绿（reset-tier 9+empty-template 11+org-config+wizard-copy+base-data-preview+roster+attendance-batch）；GetDiagnostics 零；module-load/浏览器目视待常规终端。push 仍待批（ahead 128）。

---

**T-2026-09-049 产品方向三定调 + 沟通准则补强（2026-09-06，commit 待）**
**书记定调（strategy/product，AI 自我纠偏）**：①配置不靠改文件=网页操作与后端交互，仓库 mock 仅初始种子/开源示例（纠偏：我此前把"改 mock+工作单"当交付边界，是把开发实现外露给使用者，违背好用）；落点=双形态并存（无后端本地可用/有后端自动持久）；②名册全面网页化（逐人增删改/分组/在册滞留/整表导入替换）；③党委与支部分层（党委=全局管理面，不含意见反馈/首页概况/资料查询等支部运行功能；支部层=现有工作台）；④「报告只讲交互与功能含义」本轮固化。
**落地**：CLAUDE H60 补「向书记报告的表现准则」（禁代码细节入请裁/汇报，写完自检"书记是否需读代码才懂"）；REVIEW_QUEUE 检查要点+2（报告表现/配置必网页化）与立项⑥（配置数据网页化：持久底座→名册 CRUD→整表导入替换）、立项⑦（党委支部分层：两级导航→党委功能面收敛→支部切换）登记。
**模式沉淀（sample-diff-learning）**：ai_assumption「配置/数据替换=改仓库文件+工作单是合理边界」vs human_intent「好用=面向使用者的配置/数据动作一律网页化+持久，文件只是种子」→ divergence=scope/priority；generalization=「凡使用者配置/数据动作先问能否网页化+持久，禁止把改源码当交付步骤」（入立项⑥与检查要点）。push 仍待批（ahead 128+）。

---

**T-2026-09-050 立项⑥⑦ 并行 A 波（2026-09-06，commits ee3354b/1dc1958）**
**书记定调**：两立项并行、一次做到可验收（跨多轮）；⑥=配置网页操作与后端交互（双形态持久、名册全面网页化），⑦=党委与支部分层（两级、先党委后支部）。
**A 波**：⑥ 持久底座（成员写口 save/remove/replace + mock 持久覆盖键（demo 重置回种子/preview 不清）+ api users create/delete + 引用守卫 12 域 + 整支部替换仅空支部防孤儿；member-persist 10 测试、回归 56/56）；⑦ 党委视图导航收敛（party-staff 隐藏首页/资料/意见反馈/归档，留治理工作台；支部层不变）。
**复核点（待书记）**：①party-staff 是否保留归档库入口（全院归档可调阅？）；②党委视图是否要「治理总览」形态（现直达党委工作台，公共首页对其仍含支部运行区块）。
**B/C 波待续**（⑥：名册 UI+导入替换+党委入口→api 读侧归一/服务端守卫/overlay 归一；⑦：支部列表→支部层跳转+首页收敛→分支状态记忆）。push 仍待批（ahead 131）。

---

**T-2026-09-051 立项⑥⑦ B 波（2026-09-06，commits 26451a4/9eaeab6）**
**⑦B**：党委「治理总览」=党委工作台置首 tab+登录落点（支部数/在册成员·党员·滞留/通知统计条 + 支部概览卡（现任书记/实时成员党员数/近期组织生活摘要），数据全走服务层现读）；「进入支部（演示）」双端放行门（party-staff+回环主机+非 API 登录 → 支部层书记工作台只读演示 + 横幅返回）；公共页收敛=登录直落党委工作台；既有 5 tab 保留。
**⑥B**：组织委员台「成员名册」tab（列表/搜索/应到统计/新增弹窗/行内分组·阶段·滞留编辑（留痕）/移出守卫=产品话术类别×计数不透键）；空支部整表导入（党委台支部管理卡：下载模板→净化预览统计→确认 replaceBranchMembers 落库，仅空支部）；roster-ui-logic/branch-roster-import 两纯服务 12 测试；浏览器冒烟 SMOKE-ALL-OK（模块审计 136/136）；修复 diff 缺 id 被当新增的真实 bug。
**验证**：68/68 纯测全绿 + GetDiagnostics 零；模块审计 136/136；浏览器目视与 API 登录态细节待常规终端。C 波待排（api 读侧归一/服务端守卫/overlay 并入主源/分支上下文持久化）。push 仍待批（ahead 135）。

---

**T-2026-09-052 登录党委卡置首 + S1–S6 场景评议裁定（2026-09-06，commit 892e8af+登记待）**
**界面**：登录页党委组织员卡移置首位（先党委后支部）。登录入口在 docs/src/entries/login-entry.js DEV_CARDS 顺序调整（2026-09-06）。
**S1–S6 场景叙述已呈书记评议**（六场景：支部党员大会考勤表决/支委会议事决议/专班生命周期/党员在册一生/换组织/日常三会一课——叙述以"谁·何时·做什么"产品语言，含系统自动动作）。
**书记逐条裁定（附录⑩）**：S1 记录人按活动类型（大会=纪检/党课=书记或纪检/小组会=组长）、缺席纪检认定、滞留线下到场可补录应到；S2 线上表决为准、决议自动督办闭环、门槛=应到>2/3且无反对；S3 专班一律支委会表决（含解散走议题）、组织委员逐条核贡献；S4 阶段变更与滞留=组织发起书记确认、学期末滞留复核提醒、移出=安全项一键解除+历史转已转出标注；S5 建空支部可选就地任命首任骨干、开箱1支部、制度文本网页化=立项⑧（本轮立项）；S6（略过）按推荐执行可改（纪检只读小组会考勤/思想汇报组织初阅书记抽阅/首页今天卡）。
**待实施分批**：A 会务规则域（记录人按类型+滞留补录应到+表决门槛>2/3无反对+决议督办）；B 专班生命周期（一律支委会议题含解散+逐条核）；C 确权复核（阶段/滞留书记确认+学期复核提醒+移出安全解除/已转出）；D 空支部首任骨干；E 立项⑧ 制度文本网页化（spec）。push 仍待批（ahead 137）。

**T-2026-09-053 附录⑩ A 批会务规则域落地（2026-09-06，commit 8dfdeb8）**
**范围**：S1 会务考勤 + S2 支委会 + R6-1（纪检只读掌握小组会考勤）。
**S1 落地**：考勤记录人=按活动类型定（支部大会=纪检、党课=书记/副书/纪检、组织生活会与支委会=纪检、党小组会=组长；未入表活动类型沿用组织者兜底，不据表做破坏性收紧）；未到（请假/缺席）由纪检标因且**固定枚举**（请假/无故/其它，单一源 core/policy-defaults attendance.reasons，禁造新枚举）；滞留党员线下到场可**补录为到席/应到**（勾选落入 present+detainedMakeup；应到口径=会前预应到 K+补录 L=实际应到 K+L；更正回归防历史补录误延续）；纪检考勤表单下方只读「党小组会考勤」块（组长上传、submittedBy 可辨，纪检不代传）=R6-1。
**S2 落地**：表决以**线上表决为准**（记录决议=生效点）；决议「待落实」项自动督办闭环（并入议程项 followups 子数组、无新顶层域；派书记待办=actionKey resolution-followup、责任人+时限；到期催办由 deadline 驱动，逾期进书记待办「决议落实逾期」提醒组；支持销项/重开）；门槛改=**应到会人数严格超过 2/3 且无反对**（>2/3 出席、反对=0；正式 'oppose' 与交流式 'object' 同视为反对任一口径即否决、'abstain' 弃权只计出席不计赞同与反对；needed 用 floor(n*q)+1 修 >2/3 整界，2/3 整界不过）。**policy-defaults 值未变**（voteThreshold {2/3, vetoOnObject:true} 注释语义细化；attendance 增 recorderByType+reasons 枚举，均 kind institutional/分支默认注释）。
**版本串**：同步链 →20260906c（work-map-tab/workforce-panel/secretary-workspace/ws-secretary-entry/org-setup-wizard/secretary.html/todo-tab/resolution-followup-manager）；vote-summary-panel 因唯一引用方 inspector.js 属禁改文件无法同步其自身 ?v=（改动经子模块新版本串取新代码，文件内注明=遗留）。
**验收**：专项 22/22 绿（meeting-attendance-rules 6 项含 R1-1/R1-2/R1-3/R6-1 只读视图与滞留仍候补不占应到；workforce-gate 11 项含 >2/3 整界/oppose/object/弃权/重复计票；resolution-followup 派发/逾期/闭环/销项重开）；全量 267=238 pass+29 fail 全为沙箱 playwright EPERM（环境性，非回归）。两子代理并行产物已合并（BOM 字节级对齐修复 2 文件首部噪音）；ws-secretary-entry/secretary.html 的 BOM 噪音已清。
**遗留登记**：①vote-summary-panel 自身版本串因 inspector 禁改未 bump（防回归需 inspector 解除时一并处理）；②通用支委会议程「记录决议→决议落实」接入面暂以 vote-summary（记录决议视图）为主入口，议程型决议待落实录入如另需扩展再开改动面；③R6-2 思想汇报（组织初阅书记抽阅）与 R6-3 首页「今天」卡未在 A 批，另行分批（G/正文）。

**T-2026-09-054 附录⑩ B 批服务层落地（2026-09-06，commit 67ae869）**
**范围**：S3 专班生命周期重构之服务层（UI 接线待续）。
**书记三裁（2026-09-06 本批前 AskUser）**：①专班管理页（taskforce-tab.js）放行改造；②发起/解散=报送归集·例会表决（申请归集为待议，书记线上支委会纳入表决）；③成员贡献=成员填报·组织逐条核。
**服务层落地（services/taskforce.js，无新顶层域）**：专班记录字段 committeeRequest=当前待表决请求、committeeDecision[]=历次表决留痕（append-only），status/approvalStatus 沿用既有枚举。写口：submitForCommittee（initiate 仅 draft/pending_review、dissolve 仅 active 可报，写入 kind/by/note/at）、evaluateCommitteeVote（透传 services/workforce evaluateWorkforceVotes 单一判据=R2-3：应到严格 >2/3 出席且无反对、object/oppose 同反对、abstain 弃权允许）、listCommitteeRequests（书记归集视图数据源：仅 pending、先报先议、含 kind/note/status）、applyCommitteeDecision（approved=发起→recruiting、解散→dissolved+dissolvedAt；rejected=发起→draft 可改重报、解散→回 active；请求清空+留痕 trace{kind,decision,by,note,at,outcome,decisionRef}）、verifyContributions（贡献对象条目逐条核 approve/reject+verifiedBy/At/rejectNote，幂等，历史字符串不参与）。addContributions 语义注释改=成员填报写口。
**解环修复（services/committee-vote.js）**：COMMITTEE_TOTAL 顶层立即 resolveVoterIds→AuthStore 在模块环（auth→taskforce→workforce→committee-vote）初始化期崩溃「AuthStore before initialization」——改为惰性求值+首用缓存 committeeTotal()。此修复为 taskforce→workforce 新静态 import 触发的既有脆弱点（顶层副作用），非行为变更。
**验收**：taskforce-lifecycle 13/13 绿（报送门禁/2/3 整界与反对弃权/归集排序/落结果状态机/逐条核幂等）；全量 280=251 pass+29 fail 全为沙箱 playwright EPERM（环境性，非回归）。测试曾暴露既有 add() 同毫秒 Date.now id 碰撞（测试用唯一 id 规避，未扩服务范围）。
**遗留/待续（B 批 UI 接线）**：taskforce-tab 发起/解散入口改报送语义与状态徽标；书记归集视图（todo-tab）+「线上支委会」表决承载（委员沿用活动详情表态，书记按 tally 落结果→applyCommitteeDecision，绕开 inspector 禁改）；成员填报面板（taskforce-view/专班详情）+组织逐条核面板；全链版本串 bump（待 UI 批统一 20260906d，committee-vote 引用方非禁改部分同步）。

**T-2026-09-055 附录⑩ B 批 UI 接线完成（2026-09-06，commit 94ea1d9，与 67ae869 合为 B 批全量）**
**范围**：组织委员专班管理页改造（发起/解散报送+逐条核）、书记待办「专班待议（支委会）」归集与落结果、专班表决活动创建与委员通知、成员填报入口。
**taskforce-tab.js（已放行）**：pending_review 文案「待审核」→「待支委会表决」，新增 dissolved 展示；发起单提交后删除书记单人审批待办派生（_spawnTaskforceApprovalTodo 移除），自动 submitForCommittee(kind:initiate) 并 toast「已报送支委会表决」；卡片徽标按 committeeRequest pending 显示「待支委会表决/待解散表决」、rejected 显「未通过·草稿」，重报=重新报送（守卫防重复）；解散流程保留 T-224 前置校验（考察确认+工作量），通过后改「报送解散表决」→ submitForCommittee(kind:dissolve)，不再直接置 completed/回收（由表决结果落）；成员贡献区重构=组织侧「逐条核」（同意入档/退回补料留痕，verifyContributions）+「组织代录（兜底）」单条，删除按人批量易混淆入口。
**todo-tab.js（书记）**：旧 taskforce-approval 单人批准分支删除（存量待办打开即提示已改支委会表决并销项）；新增「专班待议（支委会）」卡（listCommitteeRequests：类型徽标/专班名/任务/报送人/时间），每项「排入支委会表决」→ createTaskforceVoteActivity；已排入项「查看表决结果并生效」→ fetchVotes+resolveVoterIds+evaluateCommitteeVote → 结果弹框（出席/应到/异议/结论；pending 提示未达门槛）→ applyCommitteeDecision（decisionRef=活动 id）。
**services/taskforce.js 新增导出（3.3）**：createTaskforceVoteActivity（BranchService.createActivity 同构=workforce 路径；type 支委会/published/branch-committee/voteConfig=default+resolveVoterIds('committee')/带 id 议程项/extras.taskforceProposal 挂关联/assignments=排入人 organizer+应到支委 participant；NoticeStore 通知支委 audience committee+actionable，失败不阻断）；findTaskforceVoteActivity（按 extras 关联+createdAt≥报送 at 时间守卫取最新）。
**taskforce-view.js**：状态标签表加 pending/dissolved 语义（只加不删）、statusText 统一徽标、已完结组纳入 dissolved；active 专班成员本人「我的产出填报」（addContributions 逐条），贡献只读列表加核验态标签。
**版本串**：功能链 org/secretary →20260906d（org.html/secretary.html/ws-org/ws-secretary-entry/org-workspace/secretary-workspace→taskforce-tab/todo-tab/taskforce-view）。services/taskforce.js 因模块级单例+activity-entry(禁改) 引用 20260903c，**保持原串不 bump 防双实例分叉**（新导出靠浏览器强刷取新代码，与 A 批 inspector 链同款遗留，登记）。leader/disc 只读 tf-view 与 work-overview(禁改) 的 taskforce-view 引用保持（旧组件仍可用，新态徽标不显，登记）。
**验收**：GetDiagnostics 全零；35/35 专项绿（taskforce-lifecycle13+meeting-attendance6+workforce-gate11+resolution-followup 若干）；全量 280 基线不变（29 项全为沙箱 playwright EPERM）。点击链路（排入表决/委员表态/落结果/成员填报）需浏览器目视=常规终端 E2E 遗留。
**遗留**：①taskforce.js 强刷取新代码（同 inspector 链模式）；②leader/disc/work-overview 专班只读旧态标签；③委员表决待办点击仅走通知阅读未精细跳转；④撤销专班后已建表决活动孤儿边界未联动清理；⑤activity.html（禁改）专班详情无填报入口（成员填报走工作台 taskforce-view）。

**T-2026-09-056 附录⑩ C 批名册确权复核完成（2026-09-06，commit 910f9623）**
**范围**：S4 名册生命周期（R4-1 阶段变更/R4-2 滞留变更/R4-3 移出 + 学期末滞留集中复核提醒）。替代「直改即时生效+书记复核卡只读」。
**书记两裁（2026-09-06 AskUser）**：①名册改发展阶段/在册滞留=组织委员发起→书记确认生效（双层留痕可退回）；②移出=未开始引用一键自动解除，已开始/历史记录经书记确认后转「已转出」标注（原记录保留不删不匿名）。
**服务层（新 docs/src/services/member-confirmation.js，无禁改触碰）**：请求队列存 mockDB.pendingMemberConfirmations（domain.js 顶层声明；持久自管 localStorage 键 gsm1921-member-confirmations——mock-adapter 域白名单 26 域禁改不自动收录新数组，故独立键+gsm1921- 前缀自动纳入 ?reset=demo；_save 双写=本地键+persist() 其它域整库落盘）。写口：submitMemberChange（developStage/residence：枚举校验（DEVELOP_STAGE_OPTIONS 单一源）、同值/同 pending 拦截）、submitTransferOut（现任书记 blocker、findMemberRefs 分 safe/keep、无引用直接移出、仅 safe 清理后直接移出、有 keep 建 pending）、listPendingConfirmations、decideConfirmation（approved：developStage→saveMember；residence→roster saveResidenceChange（留痕 updatedBy=书记 decidedBy）+saveMember 镜像；transferOut→执行 safe 清理+keep 标注+移出）、isTransferredOut、shouldShowSemesterDetainedRemind（窗口 06-15~07-15 / 12-15~次年01-15 且有滞留）。safe=未开始活动分工（status∉completed/archived 且 date≥today）/未生效报名/未读广播接收；keep=已开始或历史（考勤/考察/思想汇报/复盘/表态/长期分工/已读广播/专班成员/变更申请：写 transferredOutAt 不删不匿名；mcr 非终态置 cancelled；专班 organizer 成员保留+提示先移交）。读链不匿名：person.js removedIds 项兼容 string/对象 {id,name,removedAt,decidedBy,transferOut}，applyMemberOverlay/save 复活/replace 全兼容，getName/getPersonName 档案查无→removedIds 查名回退。
**UI 接线**：roster-tab（组织）：行内改阶段/在册状态→submitMemberChange 报书记确认（行格+「待确认」小标+顶卡计数，党小组/滞留备注即时不变）；移出→submitTransferOut（direct 直接移出提示解除条数/有历史显示「移出待确认」）。todo-tab（书记）：新增「成员变更待确认」组（kind 徽标/姓名/from→to/发起人/备注/移出 refsSummary 折叠）+逐项「确认生效/退回（填原因）」+「学期末滞留集中复核」提醒组。
**版本串**：功能链 org/secretary→20260906e（org.html/secretary.html/ws-org/ws-secretary-entry/org-workspace/secretary-workspace→roster-tab/todo-tab；org-setup-wizard 及 wizard-entry/party-config-tab 引用同步；member-confirmation?v=20260906e）。**修正 B 批遗留**：secretary-workspace 内 todo-tab 引用 B 批实未落档（94ea1d9 仅含 tf-view 行），本次一并升 e。person.js/domain.js 因 activity-entry(禁改) 等全库引用保持 ?v=20260903c（同实例防单例分叉；removedIds 兼容 string 旧逻辑不破坏，新功能需强刷取新 person=与 A/B 批同款登记）。wizard 页 html/entry 链未全量升（低频配置页，刷新即新，登记）。
**验收**：member-confirmation 17/17 绿；member-persist/roster/roster-ui-logic/base-data-preview 32/32；全量 297=268 pass+29 fail（全沙箱 playwright EPERM 环境性）。GetDiagnostics 0 报错。点击链路（发起→书记确认/退回、移出向导、学期提醒）需浏览器目视=常规终端 E2E 遗留。
**遗留登记**：①api 形态确认队列未扩展 server（本地域）；②overview 复核卡（禁改）不接确认动作（确认全部在 todo-tab）；③读链「已转出」UI 徽标跨文件面大暂跳过（getName 可解析已保不匿名，isTransferredOut 已导出）；④person.js 强刷取新代码（同 inspector 链模式）；⑤wizard/party-config 页 html 链未全量升档。

**T-2026-09-057 附录⑩ D 批建空支部就地任命首任骨干完成（2026-09-06，commit 20ed2448）**
**范围**：S5 R5-1（R5-2 开箱 1 支部已实现；R5-3 制度文本网页化=E 批/立项⑧）。
**落地**：组织设置向导「新建支部…」面板（org-setup-wizard.js，party-staff）新增「就地任命首任骨干」块（默认勾选、可取消；两下拉=首任书记必选/组织委员可选；候选=现役成员剔除滞留与 party-staff；option 显姓名+支部·职务；同人冲突拦截提示；无候选提示先导入）。`_doCreate` createBranch 成功后按序 appointInauguralOfficers；任一步失败走兜底 toast「支部已创建但任命未完成（可到任命处补任）」不阻断建支部。新增导出 appointInauguralOfficers（appointment.js）：书记=appointSecretary（secretaryId+users.role+任期记录闭环）+PersonStore.saveMember 补 person.role='secretary'；组织委员=PersonStore.saveMember role='org-commissioner'+_syncUserRole 同步 users 行（无该行静默）。**角色双链说明**：门禁链=AuthStore/users，支委应到/委员判定=person.role（vote-config resolveVoterIds('committee')）——appointSecretary 原不改 person 档案，编排显式补齐使两链一致。**数据边界（注释+界面明示）**：任命不改 person.branchId（演示=跨支部兼任/调任，补入新支部走成员管理/名单导入）；任命对象原任支委/组长时原支部对应席位空缺（换届/调岗收口）；组织委员无专表席位与 config 纯追加留痕口 → 不写 appointmentRecords/config（org 证据=users/person.role 现值，UI toast 明示，登记缺口）。
**版本串**：org-setup-wizard/appointment 链→20260906f（wizard-entry/party-config-tab/branches-tab/新测试/party-committee.test 动态导入同步）。
**验收**：branch-appoint-inline 4/4 绿（书记+组织委员全断言/跨支部兼任边界/同人拦截零痕迹/取消任命零记录）；empty-template/wizard-copy/wizard-package/org-config/member-persist 回归 40/40；GetDiagnostics 0 报错。UI 面板交互（勾选显隐/下拉/拦截）需浏览器目视=常规终端 E2E 遗留；api 形态 saveMember 角色补丁可能命中 name 守卫（mock 为主演示，登记）。

**T-2026-09-058 立项⑧（E 批）支部文件增强-制度文本完成（2026-09-06，commit f6e36b6a）**
**范围**：附录⑩ S5 R5-3 + spec（.trae/specs/2026-09-06-zhidu-web/spec.md，书记两轮澄清后批准）——制度文本**并入「资料查询·支部文件」**，补版本化/现行-停用态/网页内读正文；不另起炉灶。从空开始（不预置种子）。
**书记裁决要点**：网页发布即权威（不要求 AI 回写 content）；全体成员可读（沿用登录可见），制度条目的发布/上传新版/停用仅书记（含副书）；普通文件写权限维持。
**服务层（新 docs/src/services/branch-doc.js，纯 ESM）**：统一走 getAdapter().branchDocs（双形态；mock 整库持久）；branchDocs 条目增字段 purpose:'doc'|'institution'、status:'current'|'disabled'（顶层）/superseded（versions 内）、version:N、bodyText、versions[]（各含 by/at/note/status）、versionBy/versionAt/versionNote、updatedAt。写口 saveDoc（新建 institution=现行 v1 仅书记；doc 维持既有语义；institution 禁编辑改走上传新版）/publishNewVersion（旧版整段入 versions+条目升 v+1 回 current）/setDocStatus（停用/重启用互转）/listDocs（只看制度/状态过滤，顶层剔 superseded）/buildDocVersionsView/listVersions/renderDocBody（**纯函数安全 md 子集渲染：先整体 HTML 转义→按行 md（标题/粗体/列表/行内码/代码块），不产出属性/href → script/onerror/javascript: 无执行形态；>20000 字截断**）。权限 UI+service 双重。isInstitutionManager(role)。
**status 字段决策**：既有条目 status 承载 draft/archived（会议归档）与制度语义同名 → 按 purpose 分流、不加新顶层域（domain/mock-adapter 禁改），旧数据零迁移。
**UI（modules/references.js，资料查询）**：写入表单加「用途」下拉（制度文本仅书记可选）+正文 textarea+指引；制度行徽标「制度·现行/已停用」+「阅读正文」折叠（renderDocBody）+历史版本折叠+书记操作（上传新版/停用/重启用）；「只看制度」过滤；制度不做删除（停用终止效力，防破坏版本链）；修复自引入 textarea placeholder 反引号误当模板定界符缺陷。搜索纳入正文。
**版本串**：references 链 search-entry/search.html →20260906g；branch-doc 内部 import 用 20260903c（唯一引用方 references，无缓存分叉）。
**验收**：branch-doc 14/14（权限拒绝/版本迁移/停用启用/版本视图全量/转义安全/md 子集/非 string 与超长/过滤排序/旧数据兼容/普通文件不受影响/整库刷新持久/角色判定）；回归 member-persist 10、references-official-links 1、纯 Node 批 47 全绿；GetDiagnostics 0。浏览器目视留常规终端 E2E。
**遗留登记**：api/server branchDocs 写增强二期（server 表字段固定，读兼容缺省=doc）；.docx 不解析（正文文本/MD 粘贴）；制度审批流不做；全文检索/文档站不做。

**T-2026-09-059 S6 正文 R6-2 思想汇报把关式初阅 + R6-3 各工作台「今天」页完成（2026-09-06/07，commits c8e4092f/6f40455a/93c0faf8/60ba39da/7588e69d/8009f854/15fac50a/0f26fe80）**
**流程**：brainstorming（书记逐点澄清+视觉对照选定 C 排法+方案呈报批判把关）→ spec 批准 → writing-plans 两份 → 子代理驱动逐任务+评审修复。
**R6-2 思想汇报把关式初阅**（书记裁：组织初阅合格才归档、退回附意见、同篇修订重交须再阅、书记自主抽阅不设已阅留痕）：thoughtReports 记录扩展 reviewStatus(pending/archived/needs_revision)+reviewHistory[]；服务层 thought-report.js 新写口 reviewThoughtReport（仅 org-commissioner、reject 意见必填、留痕 append）/resubmitThoughtReport（仅本人且 needs_revision→回 pending）/listPendingReviews（升序）；_effective 读侧归一（旧数据无 reviewStatus=archived、reviewHistory||[]）；addThoughtReport 新提交=pending+通知"待组织初阅"。UI：组织台新「思想汇报」tab=初阅队列（阅看→通过归档/退回附意见；按人浏览含留痕摘要）；成员端状态徽标+退回意见展示+「修改并重新提交」；发展数据只读展开不动（单入口）。测试 thought-review 8/8。
**R6-3 「今天」页**（书记裁：三项通用+逾期露头、速览直达不内建处理、C 排法、方案 B 置首登录落点、党委台除外、数据同源）：服务 today-summary.js buildTodaySummary（本地时区 dateKey；会=date 当日且 roster 应到口径/assignments/signups 参与；到期/逾期=TodoStore role 聚合键 deadline 口径、逾期置顶；分工=当日活动 assignments 我）；UI today-tab.js 共享组件（C 排法卡+逾期红标+空态一句+点击直达 activity.html/onNav('todo')）；六工作台（书记/组织/宣传/纪检/组长/成员）tabs 置首「今天」+entry defaultTab='today'；**workspace-shell 登录落点=今天**（defaultTab today 免旧 priorityTab 抢占——书记 2026-09-06 裁"恒今天页"覆盖 2026-08-10 待办优先；今天页内今天到期+逾期红标承担待办必见新形态）；待办降第二页。role 口径：到期聚合用各台待办键硬编码（与待办页同源；副书记共 secretary 键、成员用 visitor 键=既有登记口径）。测试 today-summary 6/6。版本串全链 →20260906h（22 文件，含 org/visitor 链 thought 相关与 6 html 入口）。
**验收**：thought-review 8/8、today-summary 6/6、member-confirmation 等回归全绿；全量 329=300 pass+29 fail（沙箱 playwright EPERM 环境性）。GetDiagnostics 0。UI 点击链路（初阅队列/成员重交/今天页登录落点/直达）需浏览器目视=常规终端 E2E 遗留。
**登记**：today 会议"全部"映射各台活动列表 tab（secretary=calendar、visitor=activities、org=activity-view、prop=kanban、disc=attendance、leader=write）；书记台思想汇报抽阅无独立 UI（最简）；党委台不加今天页；角色差异化项未做（首批通用三项）；spec/plan 用后即删。

**T-2026-09-060 IA 收敛 C1 待办域化完成（2026-09-06，commits 4a979996/6863b50f/369c2528/9461133c/cba5265a/a309c224）**
**依据**：书记评议大任务（/goal）→ sample-diff-learning 盘点 → brainstorming 逐节批准 spec（.trae/specs/2026-09-06-ia-todo-cards）。C1=待办按工作类型（9 业务域）分类（书记核心主张：每域一种工作方法）。
**落地**：
- todo.js：WORK_DOMAIN（meeting/activity/attendance/inspection/member-dev/taskforce/resolution/archive/report/none 10 值）+WORK_DOMAIN_LABELS+inferDomain（纯函数：actionKey→actionType/sourceType→category→NONE；activity 型按 scenarioId 分会务/活动项目）+_effDomain+_buildTodo domain 兜底；DOMAIN_ORDER（9 域序）+getDomainsWithGroups（域视图：count/expiredCount/groups 复用 _aggregateByAction）+getUnreadNotices（domain=none 通知类=页顶未读条源）+mergeRealtimeDomains（实时组并入域、同 groupKey 去重、NONE 不入、不改写参）；getGroupedByAction/getByRole 向后兼容（抽公共聚合核心）。
- 派生打标：Lifecycle 活动赋权→activity-authorize(scenarioId 落 actionData→会务/活动项目)、专班→taskforce-authorize、活动归档→activity-archive(archive 域)；Visitor 参与→participate 统一键；Notice→notice-read(none)；signup-review 按源域；handoff 三型显式域（attendance-archival/material-shortage→考勤纪律、inspection-report→考察）；resolution-followup 锁定 resolution；实时组导出 REALTIME_GROUP_DOMAIN/realtimeGroupDomainOf（书记 8 组/决议逾期/成员变更/纪检队列带 domain；review-remind/confirm→活动域）。
- 待办页重构：todo-tab-shell 重写=①页顶「未读通知 N 条」轻量条（getUnreadNotices；展开阅读/标记已读）②9 域折组（merge 实时组后；域名+计数+逾期红点；含逾期域全展否则 count 最大 1-2 域展开；组头点击折叠）③自定义区（extraTopHtml/bindExtras 加 api 参数+新钩子 buildRealtimeGroups/renderDetail/onBeforeRender 等）；todo-list 新增 renderDomainTodoList；secretary 整文件接入（实时组一次 merge、成员变更/学期末→成员发展域、决议逾期→决议上报域、待答复/专班待议置顶卡保留、onDeleteTodo:null 禁删）；disc 队列并入考勤纪律/考察域；org/prop/leader/visitor 经壳自动生效。
- 死键清理：todo-list 删 renderTodoList 及其辅助与 taskforce-archive/notice-read/review-submit 按钮展示、leader actionKeyMap（attendance-upload/review-submit）、disc jump 死键、org 未用 import；secretary taskforce-approval 兼容销存量块保留注释登记；todo-jump 无死键未改。
**验收**：todo-domain 6/6、todo-deriver-domain 9/9、todo-domain-view 6/6；回归 member-confirmation 17、resolution-followup 29、today-summary/thought-review 等全绿；核心纯逻辑组（17 文件）EXIT=0 全绿；GetDiagnostics 0。全量其余 ✖=既有浏览器环境性集合。版本串 bump 统一在 C2/C3 收口轮做；浏览器目视（9 域页/未读条/折叠）留常规终端。
**遗留**：secretary 布局变化（待答复/专班待议/成员变更=整行置顶卡）需目视；折叠态每次渲染回默认；todo-list renderTodoList 清理已完成。

**T-2026-09-061 IA 收敛 C2 卡片收敛 + C3 中低清理 + 版本串收口完成（2026-09-06/07，commits 452ae0a9/c2fdaac9/d3efaca8/bd7fccbe/41de33af）**
**C2 高影响 4 项（②③④+①已由 C1 域视图承接）**：
- K1 人才库滞留直改位移除（org/talent-tab.js）：成员状态区只读化（删 select/保存与 talent-res-save 写口），旁注"阶段/在册/滞留变更请到成员名册报送书记确认"（C 批确权一致）。
- K2 复盘入口统一（leader/review-tab.js 只读化）：页改"本组活动复盘状态"（待复盘/已复盘+徽标），去提交表单；tab 文案"复盘提交"→"复盘状态"；visitor 提交规则复核=组织者/深度者（组长兼组织者时其活动在其"我的复盘"出现）。
- K3 汇报收件处理位=我的处置：services/issues.js 标题计数对齐/时间倒序补强；新增 components/overview-dispatch-bar.js 绕行直达条，接入 org/prop/disc/leader 四个可改 overview 壳（"待答复 n · 去处理"→本台我的处置/组长组员进展）；visitor 无 my-dispatch 登记不加、书记台 overview 禁改登记（待办页已有待答复入口）；登记 u_* 旧指派 id 接缝遗留另立项。
**C3 中低清理 4 项**：①专班详情"添加考察记录"写入口只读化（考察统一走组织台考察上传；tfSubRecords 只读展示保留）；②发展数据思想汇报只读展开改"已归档 N 篇"计数（thought-review tab 承载详情）；③today 卡「我的分工」→「今日分工」；④书记 calendar 考勤概况默认折叠（避免与全局概况 KPI 同屏复读）。
**版本串收口**：C1-C3 功能链全链→20260906j（37 文件；六 html/entry/workspace、todo 链、org/leader 链、overview-dispatch-bar 等）；**修复 h 轮事故**：0f26fe80 曾把 disc/leader/prop/visitor.html 的入口 script 误写为目录占位 ./src/entries/（致 4 工作台页无法加载），本次恢复为 ws-{role}-entry.js?v=20260906j（教训：html script src 编辑必须保留完整入口文件名，入库提醒）。禁改引用（work-overview/secretary overview/activity-entry/mock 链等）保持旧串=强刷登记。
**验收**：todo-domain/deriver-domain/domain-view/today-summary/thought-review/member-confirmation/resolution-followup 56/56 绿；C2/C3 相关回归（taskforce-lifecycle 14、thought-review 8 等）全绿；GetDiagnostics 0。全量浏览器项仍环境性。浏览器目视（9 域待办页/直达条/折叠）留常规终端。

**T-2026-09-062 UI 全局整改 5 项完成（2026-09-07，commits a892af9d/b00d96cc/1006f31f/84a0f08a/30204b56/a7ee29a4/0605271b/fe532f78/b24d4254/5d7180c4）**
**书记 5 问→盘点（sample-diff-learning）→逐项批准→分批实施（U1-U5）+版本串 20260907a 收口（40 文件 85 处）。**
- U1 未登录「登录」入口：侧栏底部=退出登录对偶位（user 空→同款「登录」）；页头用户区未登录加「登录」按钮（header-action-btn）；报名区"请登录后报名参与"与搜索页支部文件提示补「去登录」。
- U2 wizard 纯网页可达：书记台新增「支部配置」tab（branch-config-tab.js，embed 挂载 org-setup-wizard 以本人支部；副书记进入由向导内建兜底=无配置权限卡）；wizard 对书记层不再孤立。
- U3 卡片先占位不弹跳：首帧双渲染由 state.js rAF 合并（注释收口）；workspace-shell 顶层骨架+LOADING 守卫+tab-bar 切 tab 置灰/轻 loading+直达条槽随切收起；todo-tab-shell await 期两栏骨架；governance-overview 统计条先行+支部卡 rAF 填充；index.html #cal-main-grid 静态骨架格（约 340px）；attendance 分层（队列先行、矩阵/总表容器占位 rAF 填）；overview-dispatch-bar 改"预留槽位再填充"（不再渲染后 afterbegin 下推；顺修 countOwnPendingReports 缺 import 的既有 ReferenceError）；五 overview-tab 外壳 beginOverviewShell 骨架占位。today-tab 同步渲染无中间帧=登记不加页内骨架。
- U4 文案四标准（①自明删 ②指引≤20字 ③同页不重复 ④黑话/编号不上 UI）+词表：抽样 20 处清理（U4a 15 文件 17 处，净-9 行）：双向通道/半侧 3 页方向行删除或并入标题；支部自治→"分工由本支部自行调整"；登录落点/业务 tab/L1/看≠做/P-011/块块/SOP 任务节点/画像/协作闭环 等黑话清除；roster 页头+脚注长段压缩、移出/滞留规则同页去重；U4b 11 文件 18+/23-：SOP 任务节点残留（write-tab/calendar-tab）→"后续待办"；双层留痕删术语；回传→送达/反馈；承载→归口；同型再扫 9 处；"应到口径"语义术语保留首现括注删重复脚注（登记）；"一键"（书记背书项）保留仅盘点登记。
- U5 视觉统一（胶囊分段+控件同高，styles.css 零触碰全 class 化）：U5a 日历月/周/日/列表→ov-sub-tab 胶囊分段（激活白卡+主题色）、周/日成对导航→连体左右钮、书记 calendar-tab 控件行 32px 对齐、侧栏字号/主题两排→胶囊分段（绑定 class 名随迁）、activity-view 头部导出/下拉同高、首页日历/列表互斥组顺改同型、纪检考勤分页连体化；U5b attendance/inspection"按活动/按人/活动/人视图"→胶囊分段（删内联激活 style 覆盖）、导出/打印/提交→统一 32px 圆角钮、搜索+下拉控件行 items-center+text-xs 同高、issue-list 筛选条高度统一、custom-select cs-trigger 去"上凸/双框"（text-xs 触发体加 h-8 统一高）、todo-tab-shell 按钮与 issues.js 行内输入+按钮对齐。
**验收**：GetDiagnostics 0；纯逻辑 32/32（U3 抽样）+56/56（收口）+U4 后相关回归绿；U3 子代理浏览器冒烟 0 console/page error（首页日历骨架→网格、org 概况直达条槽收起/填充跳转、党委治理统计条+支部卡 rAF、9 模块动态导入无异常）。版本串全链→20260907a。
**登记/遗留**：禁改文件内文案与骨架未动（secretary overview-tab L104/L528 黑话释义、work-overview L235 卡副标与 L325 闭环 toast、styles.css）——需书记特批才内改；today 页内分区渐进/实时计数刷新（work-overview rerender 后槽内条数不实时递减）如需另立项；强刷登记（about/archive/activity/notice 等普通页链 + 5 角色 todo-tab + handoff-inbox/activity-view/function-catalog 旧串 + org-setup-wizard 低频链 + state.js 全库）。浏览器目视复查（登录按钮位/胶囊分段/骨架/文案观感）留常规终端。

**T-2026-09-063 书记工作台/共享热路径提速 P0-P2 完成（2026-09-07，commits c866435d/bc641988/028638fd/8d63b9b7）**
**背景**：书记要求"卡片×待办关系检查+提速减时间复杂度"；热路径盘点（sample-diff 式）→方案三问裁（共享热路径·三档全做·功能不变+测试全绿+失效正确性+测速）→spec 批准。
**P0 缓存与失效**：core/version-token.js（bumpToken/tokenOf/resetAllTokens，Map 中央化解决多 ?v= 单实例）；todo.js 全写口 `_todoVersion`++、4 聚合方法（getGroupedByAction/getDomainsWithGroups/mergeRealtimeDomains/getUnreadNotices）按（入参+_todoVersion+日期/域指纹）模块级缓存、抽公共 _aggregateByRole 消除同轮重复全扫、merge 直接消费同轮缓存、暴露 _aggCacheStats、只读引用契约注释；refreshExpiredStatus 渲染链去重（todo-tab-shell 唯一入口）；域写口 bumpToken（attendance/inspection/review×4/handoff/notice/signup/taskforce/person/member-confirmation/mock 活动生命周期×5/archive 直写等）；聚合入口复合键缓存（SecretaryTodoDeriver.computeAggregates/getOverview/getPersonOverview、buildOverdueRemindGroupNow、todo-tab-shell 组合点）；mock.js loadDB 重置 resetAllTokens（兜底禁改 adapter 路径）。
**P1 索引降复杂**：secretary-overview _aggAttendanceRemind O(A·R)→Map<activityId,records>、_computeAttendance records 多遍 filter 合并单遍；today-summary signups 预索引（buildApprovedSignupIndex/approvedSignupHit）+getEffectiveMembers 消费方会话缓存（键=tokenOf('member')+raw 串）；calendar buildCalendarDayIndex（date→当日 activities/tasks Map 逐格 O(1)）+顶层 resize 守卫（node 可直导）；secretary calendar-tab 考勤明细惰性（折叠不构建不重算，展开才算+缓存）；过期判定收敛单一 isTodoExpired（todo.js 导出，内部四处与渲染层 todo-list/members-tab 复用）。
**P2 渲染守卫**：components/memoize-render.js memoizeRender（dataset.memoKey+内容存在→跳过重建保留状态/事件；marker 防跨 tab 误命中）；today-tab（键=日期+五源 token+length+member raw）、todo-tab-shell（P0 复合键+sel/issue 入键）、governance-overview（member/activity/支部行指纹）、calendar 四视图+首页紧凑月（view+月+活动 token+任务逐条签名兜底）接入；issues.js 全写口 bumpToken('issue') 补全（IssueStore 无 length 指纹，答复后即时重建）。
**验收**：perf 新测试 22/22（agg-cache 5/version-token 8/index-equivalence 4/render-guard 5）；回归 70/70+261+86+35+53 等全绿；GetDiagnostics 0。测速（N=200）：buildTodaySummary 单次 0.012ms、getDomainsWithGroups 0.0024ms（缓存命中后真实聚合 0 次/200 调用）、computeAggregates 0.0045ms、calendar 索引 0.0136ms；_aggCacheStats 命中率 99.67%（608 hits/2 runs）。版本串全链→20260907b（109 文件 318 处）。
**登记/遗留**：禁改内同型未内改（overview-tab _attendanceTrend O(A·R)、work-overview 内联过期/卡点、roster getEffectiveMembers 内部、mock-adapter 直写）依赖 token+length 指纹与服务层缓存间接提速，需特批才内改；disc attendance 队列/总表整卡守卫不适配登记；日历归档软删不改 length 禁改路径沿用失效模型+任务签名覆盖；today 实时组"含过期"徽标展示微差与口径对齐（浏览器目视确认）；体感验收留常规终端。

**T-2026-09-064 UI 空间/圆角修正 + HELP 操作手册重写完成（2026-09-08，commits 29bd0809/9482eadb/98cf2733/2979482d/ce4a7822/31372644/f2412cbf）**
**书记三轮反馈落地**：
- 圆角与形态（书记："不喜欢胶囊/div 组合，喜欢之前没那么圆的版本；侧栏本来小巧一改全毁；审美务必谨慎"）：UI-A 互斥切换组去胶囊底衬回独立小圆角钮（rounded-lg、主题浅底激活，日志 29bd0809）；整体圆角收敛一档（16px 大卡→12、手写大面积白卡 12→8；小徽章 chip/圆点/头像保留）；UI-B 间距定档（行 6px 起步/块标题 8/卡头 12/块间 16-24、行高≥36px、同组 8 跨组 12-16、翻页三形态统一 h-8 rounded-lg，17 文件 9482eadb）。
- 书记 2026-09-07 当场再反馈两处：①日历视图切换（月/周/日/列表）与月份下拉**并排一行**（calendar-tab 工具行 flex + #cal-view-switcher 槽，fallback 保持 marginBottom）；②侧栏字号/主题切换**恢复小巧**=styles.css 既有 .font-size-btn/.theme-btn（4-6px 圆角小钮、active 语义，回退 UI-A 大边框钮与 six-toggle 绑定）。98cf2733。
- HELP 操作手册重写（对齐 18 页/7 台/9 域，操作级=入口/谁来用/几步/产出/退回，去黑话编号）：C1 骨架+第0章入口速查+第1章快速上手+第2章 7 台导览（5 文件，修正 thought-report 把关制/复盘入口/页数 16→18 等陈旧项）；C2a 域手册①会务②活动③考勤④考察⑤成员发展（18 条）；C2b 域手册⑥专班⑦决议上报⑧归档宣传⑨汇报反馈（23 卡）；C3 第4章 10 条链路（步骤表）+第5章 党委台 6 tab/支部配置向导 3 入口 5 步/数据保留与重置档（面向用户）+第7章架构口径 18 页+目录/锚点/搜索一致收口（7 文件）。help-e2e 卡片计数断言同步。
- 版本串全链→20260908a（86 文件 176 处）；回归 77 用例全绿（含 function-catalog/flow/function-map sync 3）；GetDiagnostics 0。
**登记/遗留**：.card rounded-xl（12px 重复无害）保持；secretary/overview-tab.js 禁改内同型胶囊与 UI-A/B 未触及（登记特批才内改）；login/help 链外普通页旧档=强刷登记；浏览器目视（书记两处修正观感/HELP 0-7 章可读性/help-e2e 常规终端补跑）留书记抽查。

**T-2026-09-065 待办顶卡弹跳与排布修复 + 全 tab 卡片评议报告（2026-09-08，commits 11cda445/ad956bb6/43310564）**
**书记三点**：①顶卡排布异常 ②组件后弹（要先占位） ③全角色全 tab 卡片重合/必要性/顺序评议报告入 REVIEW_QUEUE。
- 根因（盘点）：唯一真异步插入=member-change-panel（mock adapter 600ms 延迟后整卡 innerHTML 插入 0 高挂点→把下方整体下推；rebuild/动作后重复）；P2 渲染守卫 stale 回归（approve/confirm 改 status 长度不变、renderKey 未覆盖→书记确认后行滞留）；三卡 frame 不齐（专班 p-5/h3/text-[11px]/空态无行高、待答复无 mb-4、member 头 mb-1.5、handoff 空态 return '' 高度突跳）。
- 修复 11cda445：member-change-panel 拆 Html+bind、onBeforeRender 预载缓存（签名=长度+status 串）→首帧同步真实卡（删 0 高挂点）；approve/confirm 写口 bumpToken('memberChangeRequests')+todo-tab-shell _COMBO_LEN_KEYS 并入长度指纹→stale 修补（守卫键正确失效）；三卡+handoff frame 统一（card p-4 mb-4、标题 h4 text-sm font-bold、头 mb-3、右侧计数 text-xs、空态统一 py-1；待答复绿底整条并入统一形态并注明可一行回退）；secretary/org todo-tab 同步化、onAfterRender 只绑事件。
- 评议报告 ad956bb6 入 REVIEW_QUEUE（主队列新轮次+附录⑪+方法总索引行；+124 行）：表 A 冲突 16 条（A1 成员变更同页双呈+双数据链唯一真行级重复、A2 专班待议跨台、A3 待答复双入口、A4/A5/A7/A11/A12/A15/A16 等）、表 B 必留 21 项（写口判据）、表 C 七台卡序认知+建议、书记点名三卡核对、D1-D9 裁决清单（含 A3 概况降级需书记特批禁改文件、A9 考勤概况卡去留、双链归一等）；与 IA 轮（T-060/061 已落地 12 项）差异标注。
- 版本串→20260908b（31 文件，含 org-setup-wizard 链闭合防双实例）；回归 54/54；GetDiagnostics 0。
**登记/遗留**：report-inbox 复用方（members-tab）因卡带 mb-4 间距略增（预期副作用）；member/handoff 计数徽章若保留彩色与绿底条为一行回退（观感待定）；REVIEW_QUEUE 待书记逐条评议（A/B/C/D 表）；浏览器目视（顶卡同批出现无下推/卡序观感）留书记抽查与常规终端。

**T-2026-09-066 REVIEW_QUEUE 裁决批一 D1/D3/D6 实施完成（2026-09-08）**
**依据**：REVIEW_QUEUE 批一（书记 2026-09-08 逐条 ASK 裁：D1/D3 成员变更=域内确认+批量去顶卡；D6 纪检折组行仅提示+跳转、组织/宣传交接去顶卡归域内）。纪律：域内归口（同一队列不得顶卡+域折组行双呈）；批量优先于置顶；禁改文件零触碰；不改 ?v=（收口统一）。
**落地**：
- **1a/1c 成员变更域内确认（secretary+org）**：secretary/org 待办页顶部 member-change-panel 挂点与顶卡面板移除（secretary _extraTopHtml 首节点 memberPanelHtml 删；org extraTopHtml 不再挂审批卡）；确认位唯一化=「成员发展」域实时组内批量块（secretary:member-confirm / 新增 org-commissioner:member-approve）。留痕不变：批量与逐项同一写口（MCR 链 adapter.approve/confirm+approvedAt/confirmedAt+显式 bump；名册链 decideConfirmation decidedBy/decidedAt）；来源/发起人/时间行内可辨。
- **1b 域内批量组件**：member-change-panel 收敛为「域内批量确认组件」（重写）：buildMcBulkRows 统一两类来源行（agenda=会议待讨论名单 memberChangeRequests / roster=名册报送 member-confirmation pending，来源徽标区分）；renderMcBulkRowsHtml（checkbox 列+全选+「确认/通过 N 项」+来源徽标+从→到+发起·时间）；bindMcBulk（全选/计数/批量写口+onDone 重渲染）；单条写口抽出 approveMemberChangeRequest/confirmMemberChangeRequest 供逐项/批量共用。接入点：todo-list.js 组行渲染扩展（组带 bulkHtml → 直接内嵌，逐项处理按钮复用 .${prefix}-todo-item-main 选中机制进详情）；secretary/org todo-tab buildRealtimeGroups 组对象携带 bulkHtml。逐项进详情仍单个确认/退回（书记名册报送退回意见改为必填）。
- **2 D6 纪检折组行仅提示+跳转**：todo-list actionLabels 收敛（attendance/inspection-confirm 行尾按钮=「去考勤管理/去考察管理」跳转而非行内确认；确认唯一位=考勤管理/考察管理页队列）；补课回执交接行=「去补课制度」跳转。
- **3 D6 组织/宣传交接去顶卡**：org/prop todo-tab 顶部 handoff-inbox 顶卡挂点移除；handoff 确认收进对应域折组行内（todo-list actionLabels「确认接收」+ 各台 onAction 直接 HandoffStore.confirm；同型多条合组>1 先 confirm 后整组确认）：考勤备案纪检→宣传（prop 考勤纪律域）、考察归集纪检→组织（org 考察域）、补课回执（disc 行跳补课制度页确认位不变，纪检补课页顶卡保留=非待办页合法用途）；org 补课发起入口随顶卡收敛为页顶小操作条（非队列卡，发起闭环不丢）。
- **4 extraTopHtml 收窄**：secretary 仅保留「待答复」+「专班待议（支委会）」（书记点名置顶类；待答复后续 D2 批处理）；org 无队列顶卡（仅补课小操作条）；prop 清空。todo-tab-shell jsdoc 同步（onAfterRender/extraTopHtml 语义）。
**文件（8）**：components/member-change-panel.js（重写）、components/todo-list.js、components/todo-tab-shell.js、entries/tabs/secretary/todo-tab.js、entries/tabs/org/todo-tab.js、entries/tabs/prop/todo-tab.js、entries/tabs/disc/todo-tab.js（仅注释）、.ctx/logs/2026-09-EXECUTION_LOG.md。禁改文件零触碰（work-overview/inspector/mock-adapter/secretary overview-tab/styles.css/roster 未改）；?v= 未动。
**验收**：member-confirmation/perf-render-guard/perf-todo-agg-cache/todo-domain/todo-deriver-domain/todo-domain-view/today-summary 7 文件 54/54 绿；GetDiagnostics 0；node --check 全过。
**浏览器项环境性登记（待常规终端/书记抽查）**：①书记待办「成员发展」域批量块观感（checkbox 列+全选+确认 N 项；来源徽标两色区分；与右侧详情逐项卡不冗余）②组织待办「成员变更待审批」批量块（通过 N 项→广播→组消失）③批量后渲染守卫键失效重建无残留（勾选态复位、toast 汇总）④org/prop 交接行「确认接收」按钮直达销项、多交接合并组>1 的 confirm 弹窗 ⑤纪检待办考勤/考察队列行尾按钮文案=「去考勤管理/去考察管理」跳转 ⑥书记/组织台无顶卡弹跳（_extraTopHtml 收窄后同批出现）⑦退回书记名册报送须填意见（空意见拦截）⑧并行改动文件（work-overview.js/secretary overview-tab.js/leader members/review-tab/capabilities 四台/function-catalog/pending-target.js 等，非本批所属）提交边界与回归待用户厘清。

**T-2026-09-067 REVIEW_QUEUE 裁决批一/批二合并收口（2026-09-08）**
**背景**：批一（T-2026-09-066，D1/D3/D6）代码改动在外部 reset 中丢失（仅日志条目幸存）；批二（D2/D4/D7/D8/D9）已 commit 11e72a07/6550864a/ddab2539（HEAD）；工作区残留 = 全站 ?v= 半途 stamp 至 20260908c（262 文件 M：docs src js+html+server/test）+ CODE_VERSION 84→88（注释未同步）+ .tmp-pw 残留。本条目=稳定收口（不新增业务逻辑；批一产物缺失处依 T-2026-09-066 落地说明 + REVIEW_QUEUE D1/D3/D6 最小补做）。
**批一产物核对（HEAD+工作区）与最小补做**：核对时 5 项关键产物全部缺失（reset 丢失）→ 按 T-2026-09-066 同 8 文件脚印补做：①secretary/org todo-tab 顶部 member 面板顶卡与 handoff 顶卡已移除（extraTopHtml 收窄：书记=「待答复」+「专班待议」；org=补课小操作条；prop 清空）②member-change-panel.js 重写为域内批量组件（buildMcBulkRows/renderMcBulkRowsHtml/bindMcBulk/approveMemberChangeRequest/confirmMemberChangeRequest；agenda/roster 双来源徽标；顶卡面板函数移除）③todo-list.js 域组行支持 bulkHtml 内嵌批量块（组带 bulkHtml → 组行下直接内嵌；hideActionBtn 批量组）④纪检 attendance/inspection-confirm actionLabel=「去考勤管理/去考察管理」（todo-list actionLabels 收敛）+ 补课回执「去补课制度」⑤handoff 行内确认保留（org/prop onAction 直连 HandoffStore.confirm 整组确认；disc 跳补课制度页；纪检补课页顶卡保留=非待办页合法用途，makeup-tab 未动）；书记名册报送退回意见改必填（空意见拦截不关弹窗）；todo-tab-shell jsdoc 同步（bulkHtml/hideActionBtn 语义）。禁改文件零代码触碰（work-overview/inspector/mock-adapter/secretary overview-tab/styles.css/roster 代码未改）。
**版本串收口 20260908c**：全站 stamp 已先行落地（bump-version 4 次运行：?v= 全站统一 20260908c 262 文件、CODE_VERSION 84→88）——本批补齐 cross-page-state.js CODE_VERSION 注释同步（原「立项⑦ B波」陈旧注释 → 2026-09-08 裁决批收口说明）。**登记/遗留**：①禁改文件（mock-adapter.js/inspector.js/roster.js）无代码改动、?v= 查询串仅随全站 stamp 同步（防共享状态模块按 URL 双实例分裂，TEST_AND_VERIFICATION §17；styles.css 文件本体零触碰，仅 html href 引用随档）——若需严格字节级零触碰可单 revert 该 3 文件并人工强刷复测 ②server/test 头注注释仍提旧戳（20260903c 等，bump-version 不更注释属正常）③.mc 批量块/交接行「确认接收」浏览器目视留书记抽查（同 T-2026-09-066 浏览器项 ①-⑦）。
**回归**：node --test 纯逻辑 11 文件 84/84 绿（member-confirmation/perf-render-guard/perf-todo-agg-cache/todo-domain/todo-deriver-domain/todo-domain-view/today-summary/thought-review/resolution-followup/workforce-gate/roster-ui-logic）；node --check 7 文件全过；GetDiagnostics 0。mock-integrity 2 项（M1/M2）依赖 playwright 浏览器启动，受沙箱 EPERM（playwright-artifacts mkdtemp 被拦）环境限制未跑——环境登记，常规终端补跑。
**提交**：feat(ui) 批一补做（7 文件）+ chore(code) 版本串收口 20260908c（262 文件 + CODE_VERSION 注释）+ docs(ctx) 本条目。

**T-2026-09-068 裁决收尾：党小组进展页签 + 一键初始化档 + C2 浏览器集中验证（2026-09-08）**
**背景**：书记 2026-09-08 逐条 ASK 收官（D1-D9+C1-C4）——D 系主体已随 T-066/067 落地；本条目=剩余三项：D8 新增「党小组进展」、C3 初始化档、C2 浏览器验证批。
- **党小组进展页签 ✅（60a855fa）**：书记台新增 tab「党小组进展」（secretary.html 书记/副书记共享；专班查看后、feedback 前）。两层：页顶党小组切换卡（组名/组长/组内党员数/待答复汇报数，选中红描边）→ 组内只读三区（组员进展摘要/本组活动复盘状态/本组活动与考勤概览）。组聚合=PersonStore.getMembers().partyGroup（roster.js 禁改零触碰）；待答复数=组员 open report issues（与组长台收件箱同集同数）；「请组长关注」轻动作复用 IssueStore.requestReport（零新增通知类型、看≠做）；异步首拉占位无 0 高后插。group-view.test 7/7 + 相关 31/31。
- **一键初始化档 ✅（fc363f5e）**：?reset=init=从当前态清业务过程数据、留组织骨架空支部起步。清理=activities/taskforces/notices/todos/signups/考勤考察复盘汇报议程决议归档交接等业务键；白名单保留=_schema/users/branches(config/分工/术语)/appointmentRecords/members-overlay/residence/login-user/主题字号。mock.js loadDB 委派前置 handleInitResetIfRequested（mock-adapter 零改）；API 形态三档均不执行（服务器权威：删 data.db 重种/DISABLE_SEED）。help 5.3+README 补说明。reset-tier-init.test 9 例 + 回归 65/65。
- **C2 浏览器集中验证 ✅（授权；TMP 重定向仓库内解决 EPERM，本机静态服务 127.0.0.1:8765 + Playwright chromium headless；截图 36 张存 .ctx/logs/2026-09-08-C2-browser/）**：11 项全过——登录 8 卡落点/书记待办批量块（全选确认 3→0、退回必填拦截）/概况只读摘要+「去待办处理」定位（跳待办展开详情滚动高亮）/考勤字段入活动查询行（应到 51 实到 45…）/组长子记录只读+引导/组织 tab 序+人才库发展观察+审批批量/纪检补课后移+跳转钮/党委审批前移/党小组进展组切换+请组长关注（请求→组长答复后按钮消失）/help 0-7 章目录搜索锚点 20 链接 0 死链/?reset=init 冒烟；**全程 0 console/page error**。
- **缺陷登记与处置**：①【真缺陷】?reset=init 在浏览器 mock 形态被 mock-adapter T174 空数据保护与 _mergeNewSeedRecords 回填演示数据（init≈demo；服务器形态不受影响=数据权威、URL 不执行）→ 已上报，待书记裁（接受现状仅服务器初始化 / 做浏览器空业务种子形态）②undefined 字面量（组长侧请求行时间缺省未兜底）→ 已修（issues.js:835/report-inbox.js:81 补 `|| '—'`，b4cc8401）③【说明】组长宣传/材料子记录保留「+添加」属 D7「仅限非考勤类」允许路径 ④【观感建议】批量块在折叠域内，域头可加计数角标。
- **提交**：60a855fa（党小组进展）/fc363f5e（init 档）/b4cc8401（undefined 兜底）。工作区待提交：.ctx/REVIEW_QUEUE.md（归档标注）+ .ctx/logs（本条目）+ C2-browser 截图目录（随 docs(ctx) 入库）。
- **登记/遗留**：C4「附录待发起轮次全部近期安排」（黑话④/原话复核/面板保态批量复查/最小三成本下轮/功能实现下轮）待后续逐轮启动；REVIEW_QUEUE 卡片轮次已标 ✅ 归档（表 A/B/C 留档）；push ahead 38 待书记批准。

---

**附录⑥候选2「面板展开态重建丢表单」全站批量复查修复（2026-09-08）**
**依据**：REVIEW_QUEUE 附录⑥候选2（书记 2026-09-05 批：先固化检查要点、批量复查排下批）——判据=折叠=CSS 隐藏不重建、列表刷新不触碰表单 DOM、仅提交成功才重置（判例：#wf-form-zone 独立于列表、纪检考勤录入 CSS 保态、减负⑥批 3 面板）。
**范围**：全站其余台/页含「展开/收起」或「先开面板再异步刷新」UI 块逐块人工静态核对（grep hidden 切换/展开/收起/toggle/details 代表性 class + 逐块精读）。
**修复（3 文件，均非禁改）**：
- `leader/inspection-tab.js`（判例同族漏修）：上传考察表单 toggle/cancel 原「destroy picker + renderContent 整容器重建」→ 保态折叠（#insp-form-panel 已渲染时只切 hidden、按钮文案 收起表单/上传考察表单；取消=收起保留已选与逐人内容；提交成功才重置，原成功分支不动）。行 106-120/167-173。
- `secretary/calendar-tab.js`（写入活动悬浮表单）：提交中/提交失败原两次 `renderWritePanel` 整面板重建丢全部已填内容 → 新增 `_setWriteSubmitBtn` 就地切按钮态（写入中.../创建活动 + opacity/cursor 禁用），失败保留已填内容与已选、仅成功 wp.reset() 重置；前置 wp.submitting 防重复点击。行 914-925/1023-1024/1118-1120。
- `leader/write-tab.js`（决策树创建活动面板）：原「收起面板」= dt.reset() + 整页重建丢全部进行中步骤/已填信息 → 面板常驻 DOM（`#dt-panel-wrap`）折叠只切 hidden、dt.showPanel 同步、按钮文案同步；重置会话=表单内「取消」或提交成功。行 57-59/491-501。
**清单×判据结论（通过/风险摘要）**：纪检会议考勤录入/disc attendance（判例已修）✓；org 考察上传/组长考勤上传/visitor 复盘展开（减负⑥批已修）✓；组长考察上传（本批修）✓；书记活动查询折叠/写入面板内自动通知/高级选项/线上表决/品牌区=行内 CSS 切换 ✓（写入面板 modal 独立于 tab 容器，外部刷新不触碰）；write 决策树面板收起（本批修）✓；todo 域折组折叠/未读条=CSS hidden ✓（P2 渲染守卫 memoize 命中即不重建、命中失败按数据重建属既有约定）；disc 复盘批量勾选=模块级 Set 保态 + 操作后重建 ✓；makeup 补课任务行=无展开表单 ✓；专班管理详情=只读展开/`<details>` 原生折叠 ✓（内部多写块整详情重建互扰→登记）；党小组进展三区=只读、异步首拉仅刷 #gp-reports 不触其它区 ✓；汇报行内展开 report-inbox/issue 详情=CSS hidden 切换 ✓；visitor 思想汇报退回修改区、org 思想汇报阅看、组长已复盘只读展开=CSS hidden/只读 ✓；prop 周报/归档、party-committee branches（任命/改名行内 CSS 切换）/dispatch/review、group-progress=✓；calendar/legend 收起=CSS ✓；custom-select/sidebar/header 下拉浮层=打开重建无持久输入 ✓；org-setup-wizard 小面板=状态对象驱动+localStorage 草稿 ✓。
**登记（送审/下一批候选，非本次改动）**：①`org/taskforce-tab.js` 专班详情=多写块（专班复盘 textarea/中间进度/代录/材料记录）共享整面板重建——任一动作成功后 card.click() 整详情重建会丢其它块未提交草稿（尤其已写复盘未提交又点「添加进度/代录」）——最小修法=按 #wf-form-zone 判例将各写块抽独立容器分块刷新（改动面大，建议单批）②`leader/write-tab.js` L1-L4/承办党小组步骤重选仍整面板重建丢已填 title/date/location/desc/角色选择（非折叠路径，需草稿持久化）③`components/report-inbox.js`/`issues.js` 答复成功 onAnswered 重渲染会清其它展开行的草稿输入（列表内瞬态草稿，低）④`org/thought-review-tab.js` 阅看行退回复选框与他行操作互扰同型（低）⑤禁改文件（inspector.js/activity.html 详情侧展开/定义切换区、work-overview、secretary overview-tab、styles.css、mock-adapter、roster、domain）未触碰——如需复查内里面板行为须书记特批送审。
**回归**：node --check 3 文件通过；GetDiagnostics 0（3 文件均 0 诊断）；module-load 依赖 playwright 浏览器启动受沙箱 EPERM 未跑（环境登记，与既往同）；改后未引入新 import，?v= 全站维持 20260908c 一致（同 b4cc8401/421e3d0e 快速修复先例），建议随下轮全站 bump 收口。
**提交**：fix(ui): 面板保态批量复查修复（本批）。

**T-2026-09-069 init 档回填修复 + 全前端冒泡测试（2026-09-08）**
**书记令**：①修复浏览器单机形态 ?reset=init 种子回填 ②所有前端冒泡测试。
- **init 回填修复 ✅（75c73643）**：判据分析=mock-adapter（禁改）三层触发（raw 不存在→seed；activities 空且种子非空→seed；_mergeNewSeedRecords 无条件补种子），纯哨兵无效。修复=哨兵键 `gsm1921-init-state` + `stripSeedRecordsIfInitState(db)`（每轮 loadDB 后剔除 7 种子域 id 匹配种子模式 `act-\d+/tsk-\d+/assign_seed_\d+/att\d+/notice-\d{3}/ar\d+/su-\d{3}` 的记录，用户记录 id=时间戳/uuid 形态与种子空间正交零误伤）+ 8 个 store/读兜底守卫（notice/taskforce/signup/activity/attendance/inspection 空态在 init 态跳过演示种子）+ 链 B 收口（wizard/search mock 分支走 BranchService.loadDB，MockAdapter.loadDB 收敛单调用者）。reset-tier-init 14/14 + reset-tier 9/9 + member-persist/empty-template 等 65/65 绿。
- **全前端冒泡 ✅**（Playwright chromium headless + 静态服务；报告 .ctx/logs/2026-09-08-smoke-result.md）：A 公共页 11/11 + B 工作台 7 台×65 tab 全部 ✅（与 capabilities 声明一致）+ C 交互 10 项 9✅1⚠️（组织审批批量无种子目标=数据态非缺陷）——全程 0 console/page error；修复 2 缺陷（421e3d0e）：wizard/search-entry 调 BranchService.loadDB 缺绑定 → mock 路径 ReferenceError 被吞→向导误显「非现任书记」门禁/search 支部文件恒空（补 import）；branches-tab 缺 bindBranchDemoButtons import。性能：仅 help.html DCL 3.4s 需关注。
- **提交**：75c73643/421e3d0e/645e79b2。

**T-2026-09-070 C4 评议轮次排期（书记 2026-09-08 批准「全部近期」，REVIEW_QUEUE 附录引用本条目）**
按序滚动启动（每轮走 H60：抽样→书记逐条 ASK→分流归档→REVIEW_QUEUE 保持无悬挂）：①黑话第4轮（源头污染优先，一律书记判定）②书记原话复核余批（P 系列，逐条书记过目）③功能实现评议下一轮（设计考量↔实现对照；随 W4 反论同步）④最小三成本下一轮（五场景/G 系/双形态）⑤专班详情多写块分块刷新批（面板保态登记①：org/taskforce-tab 整详情重建互扰，按 #wf-form-zone 判例抽独立容器）⑥概况侧禁改送审项（附录⑪ 语义：overview-tab.js/work-overview.js 内面板行为复查须书记特批）⑦AI 逃逸下轮/理论复用下轮按书记指令随时启动。轮次启动记 T-071+ 续号。

**T-2026-09-071 README 全量同步 + 书记原话 closed-loop 补充 + REVIEW_QUEUE 清空（2026-09-08）**
- **书记原话 ✅**：DEVELOPMENT_PATH.md「在框架内说真话」小节补书记原话（2026-09-08）「每个人都要学习掌握 closed-loop communication，让任务形成【确认闭环】」+ 简短释义（说到位有回音/复述领受/完成回执），原文原貌保留。
- **README 全量同步 ✅（80b46e15）**：根 README.md（191 行覆盖：18 页/7 台/9 域/书记台 12 tab/党委台 6 tab/关键机制 11 条/表决门槛/开发路径章+目录/测试文件集/?v= 纪律/本地内网试用/禁改清单与 push 批准纪律）；README-members.md（241 行成员通俗版，功能地图由 function-catalog 重新生成单源同步）；server/README.md 最小同步（种子/初始化口径）。均对照代码核实口径。
- **REVIEW_QUEUE 清空 ✅**：主队列两个已归档轮次（02_institution T-263 / 全角色全 tab 卡片 T-066-068）正文清除，文件=使用说明+附录区（方法总索引/①-⑪ 专项承接：悬挂「待发起」全部转为「机制持续·按书记指令随时启动」或「C4 已批准近期推进·排期见 T-070」）；检查要点库与专项语义保留（书记 2026-08-10 附录语义）。
- **提交**：80b46e15（README）+ 本批（content 原话/REVIEW_QUEUE/日志）。push ahead 45+ 待书记批准。

**T-2026-09-072 乙部 E 批完成收口（E-1~E-5 + 版本串 20260908d + help-e2e 校准 + 丙部 P.13 登记）（2026-09-09）**
- **E-1~E-5 ✅（commits 30029993/27c5eb77/6140e23a/82c39508/40d8ef63）**：E-1 专班详情多写块分块刷新（org/taskforce-tab.js，按 #wf-form-zone 判例抽独立容器，任一写动作成功只重建所属块、不丢其它块草稿）；E-2 组长写活动步骤重选草稿持久化（leader/write-tab.js，L1-L4/承办党小组重选保已填内容）；E-3 report-inbox/issues 列表瞬态草稿互扰兜底；E-4 org thought-review 阅看行退回复选框行级互扰修复；E-5 help 首屏加载优化（help.html + help-entry.js，冒泡 DCL 3.4s 收敛）。
- **版本串收口 20260908d（本批）**：bump-version.mjs 全站 c→d（docs src js + docs html + server/test 共 268 文件，旧串 0 残留；styles.css 本体零触碰、禁改文件仅 ?v= 随全站 stamp）；手工收口脚本盲区 13 处无 from 副作用 import（12 文件）与 3 测试文件常量 V 戳；CODE_VERSION 88→89 + 尾注同步（cross-page-state.js）。
- **回归 + help-e2e 校准（本批）**：全量 node --test 393 例；help-e2e #sec-tech 断言校准至 HELP-C3 新正文口径（「18 页 = 11 根页面 + 7 工作台 / 18 个独立 HTML 页面」，只改断言、正文零改动）后绿；module-load / link-integrity / taskforce-lifecycle / scene-write-sync / thought-review / resolution-followup / member-confirmation / reset-tier 系 / todo-domain 系全绿；GetDiagnostics 0。修复 bump 盲区遗留 3 例（flow-catalog-sync / roles-sync / wizard-report 的 readFileSync 路径与期望串被注入 ?v= → 剥离查询串读盘比对，纯逻辑转绿，c-bump 起即红、本批收口）。环境受限 11 例登记（非本次改动引入）：6 例需独立 localhost:3000 服务（b3-1-makeup-writeback / click-cost C1-C3 / mock-integrity M1-M2）；5 例浏览器/UI 沙箱受限（online-committee / e2e-login / module-config-e2e / block-config-ui-e2e S3 / party-committee-review P3），与既往「浏览器目验待常规终端」一致。
- **丙部新增 P.13**：CLAUDE.md 丙部待决策登记 P.13「TW CDN 治理」（Tailwind CDN 依赖治理方向，2026-09-09 收口随记）。
- **提交**：chore(code) 版本串收口 20260908d（tab-bar.js / workspace-shell.js 以其 HEAD 内容 + d 戳形态入库保链，工作区既有 U3a WIP 未随批提交）+ test help-e2e 断言校准（含 3 例 fs 路径 ?v= 容忍修复）+ docs(ctx) 本条（含 CLAUDE.md 乙部行清与丙部 P.13）。
- **遗留**：module-load 与浏览器目验待常规终端；help 动态卡与详情双开目验；E-1 角色保存/报名/解散仍整页刷新属既有语义（非缺陷）；tab-bar.js / workspace-shell.js 工作区既有 U3a WIP（约 500 行）与 stash@{0}（review-batch2-wip）未触碰，待归属任务随批处理。

**T-2026-09-073 丙部 P.11/P.12/P.13 决策落地 + 思想汇报文案校准（2026-09-09）**
- **P.11 全局评估总表 v1 定案（书记：AI 定案）**：11 专项建议分 + 工程化评估约 76 生效（REVIEW_QUEUE 总表标注已更新为 2026-09-09 定案，此后每轮变动标 ↑↓）。
- **P.12 概况侧禁改复查（书记：只读复查）**：特批执行完成——overview-tab.js 全部通过；work-overview.js 发现 1 个保态缺口（同源 3 风险：请我汇报多行草稿互扰/确认刷新触表单 DOM/下钻返回全容器重建丢草稿），最小修法建议已送审（模块级草稿表 _reqDraftByIssue 约 +15 行），未改代码；报告 .ctx/logs/2026-09-09-P12-overview-audit.md（b154da2a）。
- **P.13 Tailwind CDN 治理（书记：保持现状）**：关闭；E-5 页内优化（preconnect+模块图动态）保留。
- **Word 成稿维持粘贴制 + 1500 字阈值 UI 去显（书记）**：visitor thought-report-tab placeholder 去硬性字数（改「请书写本季度思想汇报」）；thought-report.js 服务层注释标明篇幅惯例仅后台知悉、不作硬性拦截（过短由组织初阅把关）；help.html 思想汇报帮助卡与 sopData 3-3 desc 同步去 1500 硬数字与新数字化口径；content/02_institution 制度文档（场景指南）内 1500 制度文本为书记批改层保留未动。
- **提交**：本批（CLAUDE.md 丙部清空+总表定案标注/REVIEW_QUEUE/help.html/sopData/thought-report×2）+ b154da2a（P12 报告）。遗留：work-overview 保态修复待日后特批；乙部轮次排期 4 项待发起；push ahead 待书记批准。

**T-2026-09-073 丙部 P.11/P.12/P.13 决策落地 + 思想汇报文案校准（2026-09-09）**
- **P.11 全局评估总表 v1 定案（书记：AI 定案）**：11 专项建议分 + 工程化评估约 76 生效（REVIEW_QUEUE 总表标注已更新为 2026-09-09 定案，此后每轮变动标 ↑↓）。
- **P.12 概况侧禁改复查（书记：只读复查）**：特批执行完成——overview-tab.js 全部通过；work-overview.js 发现 1 个保态缺口（同源 3 风险：请我汇报多行草稿互扰/确认刷新触表单 DOM/下钻返回全容器重建丢草稿），最小修法建议已送审（模块级草稿表 _reqDraftByIssue 约 +15 行），未改代码；报告 .ctx/logs/2026-09-09-P12-overview-audit.md（b154da2a）。
- **P.13 Tailwind CDN 治理（书记：保持现状）**：关闭；E-5 页内优化（preconnect+模块图动态）保留。
- **Word 成稿维持粘贴制 + 1500 字阈值 UI 去显（书记）**：visitor thought-report-tab placeholder 去硬性字数（改「请书写本季度思想汇报」）；thought-report.js 服务层注释标明篇幅惯例仅后台知悉、不作硬性拦截（过短由组织初阅把关）；help.html 思想汇报帮助卡与 sopData 3-3 desc 同步去 1500 硬数字与新数字化口径；content/02_institution 制度文档（场景指南）内 1500 制度文本为书记批改层保留未动。
- **提交**：本批（CLAUDE.md 丙部清空+总表定案标注/REVIEW_QUEUE/help.html/sopData/thought-report×2）+ b154da2a（P12 报告）。遗留：work-overview 保态修复待日后特批；乙部轮次排期 4 项待发起；push ahead 待书记批准。

**T-2026-09-074 设置中心（书记三问：支部配置迁入侧边栏设置 / 外观迁入+角色化界面+tab顺序个人可调默认支部层 / 超参数落实到书记副设置）——brainstorm v3 批准→原型→分批实施→5c 浏览器验证**
- **批1（ceba5c5a）**：settings.html + settings-entry.js + 侧边栏右下「设置」入口（gear）+ 外观控件（字号/主题三态/强调色）自 sidebar footer 迁入设置页（appearance-controls.js 复用）；theme.js 按人键空间适配层（冻结读取点不动，sidebar 顶层 sync 材料化）。
- **批2（c7bac6a9）**：services/preferences.js（resolveTabOrder 纯函数+核心置前+过期自愈+memo）；workspace-shell 支部策略后叠个人序（默认无 diff）；settings「我的工作台」拖拽/上移下移/恢复默认/徽标/核心锁；preferences.test 15/15。
- **批3（2b011339）**：书记台 branch-config tab 移除（0 残留）；settings 支部治理=支部信息卡+内嵌换组织向导（同源 mountOrgSetupWizard）+工作台默认顺序（写 config.modules.tabOrder）；**副书同权**（PATCH config 门控+向导守卫 _canEditBranch）；module-config/org-config 补测试。
- **批4（f59fa710）**：policy-defaults 双态+POLICY_OVERRIDABLE 白名单+applyPolicyOverrides；新增 memberConfirmation.semesterDetainedWindows/leader.semesterReportReminder/attendance.*·review.*（纪检监督侧）；副本收编 0 残留（disc 写死 7、secretary-overview 4 组阈值、member-confirmation 窗）；config-clean sanitize+apply；branch.savePolicyOverrides+canManagePolicyOverrides（书记/副/party-staff 全量、委员仅本域）；settings 支部制度参数只读卡+域参数三卡；组长 today 学期提醒；policy-config.test 13/13。
- **文档同步（22020be6）**：README×2/help.html/function-catalog/gen 脚本/help-e2e 同步 19 页（12 根+7 台）、支部配置迁移与设置中心、副书同权。
- **5b（27f162bd）**：全站 ?v=20260909e（272 文件+CODE_VERSION 90）；WIP 隔离（tab-bar U3a cacheinfo 入库、工作区 WIP 保留）；回归 422=410 绿+12 环境受限。
- **5c（973a98cf 修复）**：12 项浏览器验证 11 全过+2 顺手修复（settings-entry 数据层初始化、支部默认顺序前注册能力）；0 代码 console error；e 串 0 残留。
- **登记/遗留**：R1 外观按人隔离边界（新账号首登经全局回落继承上一登录者偏好并写入其 person 键）——候选 A 首登出厂默认彻底隔离 / B 全局键仅服务访客·登录人只读写 person 键 / C 保留现状，**待书记裁决**；R2 拖拽 headless 未复现（按钮路径已验，真机手测待补）；tab-bar U3a WIP 未提交待归属；push ahead 67 待书记批准。

**T-2026-09-074 设置中心（书记三问：支部配置迁入侧边栏设置 / 外观迁入+角色化界面+tab顺序个人可调默认支部层 / 超参数落实到书记副设置）——brainstorm v3 批准→原型→分批实施→5c 浏览器验证**
- **批1（ceba5c5a）**：settings.html + settings-entry.js + 侧边栏右下「设置」入口（gear）+ 外观控件（字号/主题三态/强调色）自 sidebar footer 迁入设置页（appearance-controls.js 复用）；theme.js 按人键空间适配层（冻结读取点不动，sidebar 顶层 sync 材料化）。
- **批2（c7bac6a9）**：services/preferences.js（resolveTabOrder 纯函数+核心置前+过期自愈+memo）；workspace-shell 支部策略后叠个人序（默认无 diff）；settings「我的工作台」拖拽/上移下移/恢复默认/徽标/核心锁；preferences.test 15/15。
- **批3（2b011339）**：书记台 branch-config tab 移除（0 残留）；settings 支部治理=支部信息卡+内嵌换组织向导（同源 mountOrgSetupWizard）+工作台默认顺序（写 config.modules.tabOrder）；**副书同权**（PATCH config 门控+向导守卫 _canEditBranch）；module-config/org-config 补测试。
- **批4（f59fa710）**：policy-defaults 双态+POLICY_OVERRIDABLE 白名单+applyPolicyOverrides；新增 memberConfirmation.semesterDetainedWindows/leader.semesterReportReminder/attendance.*·review.*（纪检监督侧）；副本收编 0 残留（disc 写死 7、secretary-overview 4 组阈值、member-confirmation 窗）；config-clean sanitize+apply；branch.savePolicyOverrides+canManagePolicyOverrides（书记/副/party-staff 全量、委员仅本域）；settings 支部制度参数只读卡+域参数三卡；组长 today 学期提醒；policy-config.test 13/13。
- **文档同步（22020be6）**：README×2/help.html/function-catalog/gen 脚本/help-e2e 同步 19 页（12 根+7 台）、支部配置迁移与设置中心、副书同权。
- **5b（27f162bd）**：全站 ?v=20260909e（272 文件+CODE_VERSION 90）；WIP 隔离（tab-bar U3a cacheinfo 入库、工作区 WIP 保留）；回归 422=410 绿+12 环境受限。
- **5c（973a98cf 修复）**：12 项浏览器验证 11 全过+2 顺手修复（settings-entry 数据层初始化、支部默认顺序前注册能力）；0 代码 console error；e 串 0 残留。
- **登记/遗留**：R1 外观按人隔离边界（新账号首登经全局回落继承上一登录者偏好并写入其 person 键）——候选 A 首登出厂默认彻底隔离 / B 全局键仅服务访客·登录人只读写 person 键 / C 保留现状，**待书记裁决**；R2 拖拽 headless 未复现（按钮路径已验，真机手测待补）；tab-bar U3a WIP 未提交待归属；push ahead 67 待书记批准。

**T-2026-09-075 书记五问处置：示例支部与归属显式化 / header 组织名 / 制度参数变更流（审计内核）/ 颗粒度 content 声明 / 主题色一致性（2026-09-09）**
- **① 归属显式化（fbb67f72）**：services/branch.js 新增 getBoundBranch（person 无 branchId/null/查无分支→null，不再被示例支部冒充）；getBranchIdOfPerson 保留数据解析兜底并注明支部语境判定一律用 getBoundBranch；getHeaderTitle 登录无归属→中性「未绑定支部」（静态壳未登录保持既有兜底，属换壳范围注明）；header.js h1 无归属中性不加引导（二期候选 b 登记注释）；settings 支部治理/域参数统一「未找到您所属支部——请先由党委确认归属」，向导入口无归属不唤起。branch-affiliation.test 4 例。
- **② 示例支部**：维持 br-b1 为可整体替换的模板默认（书记裁）；真实"不属于支部"场景由①显式归属+统一口径解决。
- **③ 制度参数变更流=审计内核先做（cc1cde66）**：configChangeHistory 支持 why（各写口 opts.why 透传，server PATCH why+裁剪同源）；rollbackBranchConfig 单键回滚（跨键/聚合 branch-created/config-copied 拒绝、回滚追加 {what:rollback} 不改写历史）；config-clean 常量 CONFIG_HISTORY_MAX=100/CONFIG_ROLLBACK_*；api-adapter rollbackConfig；server PATCH /config/rollback；settings 支部治理「配置变更记录」列表（人/时间/键/前后值/why+单条回滚 confirm）。branch-config-audit 8 例+HTTP；回归 90 项绿。制度级（L3）保持锁定（放行程序待裁决）。
- **④ 颗粒度 content 声明（起草→书记审定定稿 2e413d44）**：PARTY_COMMITTEE_DESIGN §2.6 配置颗粒度与变更流分层（六层+旁路矩阵/词条收口/放行程序/变更流对齐审计内核/内容接缝）+§2.5 过期表述同步；SYSTEM_ROLE_PERMISSION §9h 支部 config 写权矩阵节；USAGE_POLICY 词条（L2-L3 配置层/branch-default/域参数/制度默认/制度刚性/POLICY_OVERRIDABLE/换壳工作单，注明与 L1-L4 阶段号非同一编号体系）。
- **⑤ 主题色一致性（f1254a7a）**：bootstrap --app-accent 注入/header 角色标签/书记 calendar·assign·todo 三 tab 模块级 const 快照/纪检补课 6 处改 person-aware 渲染时解析（theme.js 合成 getAppliedAccentColors）；禁改消费经 ctx.accent 自动同源；theme-pref 8/8+preferences 15/15。
- **遗留**：tab-bar U3a WIP 未提交待归属；push ahead 73 待批；浏览器目视（settings 变更记录回滚 UI/无归属卡/主题色抽验）与 R2 拖拽真机手测待常规终端；settings 变更记录 UI 对 party-staff（党委台）未接线（内核已含门）。

**T-2026-09-076 集中代码减负批（书记 2026-09-09 令；版本串保持 20260909e 不 bump；commits 43ade599/98ed9ace）**
- **范围与方法**：docs/src、docs/scripts、server、docs/*.html；只减不增、每删必证（先静态引用图 + 全仓 Grep 核对再动）；先产出候选清单后分批实施。
- **类别1/4/5 死代码与冗余暴露面（43ade599，净 -60 行）**：visibility.js 删 4 死导出（canViewPerson/dimensionsFor/canViewInProject/roleLabel，docs+server/test 全仓零消费）+ DIMENSION_LABELS/PROJECT_VISIBILITY + 冗余 ROLE_LABELS import；data-loader.js fallbackMapActivities、workflow/renderer.js createMockEngine/createMockBlockedEngine、modules/branch-demo-nav.js buildBranchDemoUrl/openBranchDemo 内部化去 export（暴露面收窄，行为零变化）。
- **类别2/3 迁移残留与过时注释（98ed9ace）**：write-tab.js:123 去除已删「工作台配置」tab 旧词（改 config.blocks 语义保 2026-09-03 出处）；org-setup-wizard 挂载点注释与 JSDoc 补设置中心第三入口（两处旧入口描述→三入口现状）；icons.js 段注释去掉不符的 deprecated 标注（pencil/shield/fileText/clipboard/upload 均在用）；settings-entry.js 头注释收敛为批1-4 全开后现状（仅党委快捷块建设中）。
- **验证**：231 个 src 模块 node --check 全绿 + GetDiagnostics 0 + 引用目标存在性校验（js 231/html 19 零缺失）；link-integrity L1/L2/L3/L5 绿；module-load/e2e-login 等 Playwright 套件沙箱 EPERM 受限（与 T-074 5b「12 环境受限」同因，登记）。
- **登记（不删）**：workflow/blocks/form-renderer.js 整文件 0 生产引用但 WORKFLOW_BLOCK_CONTRACT S2 + block-form-renderer.test 专属支撑（待书记确认是否连测试与契约段一并下线）；components/inspector.js 内部死导出嫌疑（禁改文件不擅动）；services/person.js @deprecated getPersonById/getPersonName 仍广泛消费（迁移未完）；17 处 String(x).slice(0,16).replace('T',' ') 行内日期格式与 core/utils.fmtDt 同义（统一改引用=净增 import，留待专项）；mock/server 未发现可安全整删的过时文件（此前 T-005/008/011 等批已清）。
- **遗留**：tab-bar U3a WIP 未提交待归属（本批未触碰）；push ahead 75 待批。

**T-2026-09-077 会话收口批：补验 12 例 / 两修复 / 测试对齐 / 两评议轮次 / README 通用化 / 活动写入改造 S-1~S-4（2026-09-09~10）**
- **补验 12 例（环境受限解除）**：以仓库内 `server/.tmp-pw` 作 TMP 解除 Playwright 沙箱禁写 → 全部实跑；`mock-integrity M1/M2`、`b3-1` 5/5、`click-cost C1/C2` 通过；**发现并修真回归 `5e183368`**（committee-vote 通知模板引用已删常量 COMMITTEE_TOTAL → committeeTotal()，书记汇总通知曾静默失效）；`online-committee/async-vote/agenda-votes/agenda-flow` 19/19。
- **P.12 特批修复 `ebf55d16`**（改禁改 work-overview.js）：请我汇报行内草稿保态 `_reqDraftByIssue`（他行提交/确认收到/下钻返回不再丢草稿）；module-load 148/148。
- **陈旧测试对齐 `ac10971f`**：`click-cost C3`/`e2e-login` → 默认落点「今天」+ 切待办 ≤1 跳；`module-config/block-config-ui-e2e` → 党委台支部配置向导步骤② chips 闭环（旧 `#pc-*`/`data-pc-wblock` 全仓零匹配）；`party-committee-review P3` → 现行上报审批锚点。8/8 绿。
- **黑话第 4 轮 `6cd2cad7`**（C4 序①）：六候选书记判定——治理总览保留；09 新增「闭环」族按第 2 轮定界回清；确权→两级确认/变更确认/书记确认、进度感知→了解进度、把关式初阅→组织初阅把关、设置域参数→纪检/组织/组长职责参数（权威层保留）。
- **原话复核余批 `012d6478`**（C4 序②）：11 项逐条过目；SECRETARY_DIRECTIVES 三处落改——P-009 原话移文末「附录·原话附注」（正文留概述）、第三章章首「成长」并入 P-001、P-016 L351 AI 自注删除（AI 不补注释）。
- **交接与纪律 `1cdbc6dd`/`665613c5`**：删除 HANDOFF 文件（交接一律对话输出）、清理 gitignore 过程产物并撤对应豁免、全量清 BOM（33 文件）；入库检查要点「交接与过程脚本纪律」。
- **README 通用化 `f6670487`**：门面改「引擎/模板 → 各组织自有部署」叙事（起源=最初以光华管理学院本科生党支部工作流打磨，随迭代通用化）；功能地图迁根 README 顶部（生成器/守护随迁）。
- **黑话第 5 轮 `ddaa320c`**：清 AI 自造词「普世化/普世适用/普适化」→「通用化」（用户文案+注释）。
- **活动写入改造 `22120e64`/`60dfa271`**（用户四项反馈）：S-1 议程逐人「通过/未通过」（未通过留痕）+ 通过者自动进成员确认链（来源标「会议结果」）+ 修演示档 confirm 误写 users 致阶段未落档 + 发展档案「来源会议」溯源（**书记特批改 inspector.js 议程结果区**）；S-2 发展议程仅留「转为预备党员/转为正式党员」、按人推导 fromStage；S-3 SOP 任务 desc 均 55.5→18.3 字、通知/专班描述瘦身；S-4 写入 UI 按 COMPONENT_SPEC 统一（chip/底板/标题/input-flat/底栏）。文档同步 `5138e638`。
- **版本收口**：全站 `?v=20260910a`、CODE_VERSION 93（bump 19 HTML + 版本常量；本批含活动写入 S-1~S-4、归属时序修复、待办催办/兜底白名单、卡片普查合并、门面通用化、只读端对齐）；顺清 EXECUTION_LOG 中 T-075 重复块（内容锚点去重，保留 1 处）。
- **追加批次（2026-09-10 书记五项）**：① 待办**逐条催办**（全 9 域定向通知 + 会话内冷却）＋**兜底直执白名单**（补代归档/代复盘入口）＋**副书同权**（议程结果区/编辑议程）；② **卡片普查与合并**（KPI 五连卡取消·不设出勤率 KPI、趋势入异常队列、阶段分布入滞留卡、上报统计改内联行、思想汇报说明卡与材料标准卡消失、看板工作量并入、超期提醒入表头、人才库计数入统计条；补入口：出勤明细+补课、项目卡/看板条目/转正提示跳转、党委监控进入支部、党委卡壳统一 `card`）；③ 闭环评议**样本 1**（参与待办直达活动详情 + 列表报名/表态入口）＋ 4 条判据入库（附录⑦：卡片存在性 / 操作入口 ≤1 跳 / 权责兜底白名单 / 渲染时序）；④ 归属显示**时序修复**＋未登录中性占位；⑤ R-3 门面页通用化、R-4 只读端视觉对齐（特批 inspector 只读端）、R-5 b3-1 自重置。验证：合并回归 46/46 绿 + 各段子集与浏览器实证全过；遗留见乙部 W-1/R-6。
- **追加批次 2（2026-09-10）**：**对比度收口 C-1**——卡片背景/文字对比度全量普查（7 角色 64 tab）并以 WCAG AA 为准修复至 **0 违规**（强调色 `color-mix` 深档、状态徽标深档、灰阶提升、禁改 styles.css；豁免=禁用态/装饰/图标）；**功能实现评议下一轮**（8 候选书记逐条裁定）——修复 5：①上报党委三节点通知 ②纪检超期提醒真实触达 ④发展节点系统提醒（组织委员待办，稳定键 `develop-node-remind`）⑤branchDocs 按支部隔离（`listDocs` + references/calendar-tab 接线）⑧党委台账补「书记任期」行；文档口径修正 3：③组织委员看板/⑦宣传看板（承认落点=今天、看板为 tab）、⑥CF「修改模块设置｜组织委员」改 `--` 并注 §9h；**待办梳理**：CLAUDE 乙部 4 行✅合并为 1 行 + 新增 R-6（功能遗留）/R-7（对比度遗留）/P-15（评议候选）；SNAPSHOT 升 **v21**；REVIEW_QUEUE 汇总表 ③④⑧⑪ 状态刷新 + 附录⑧ 轮次记录。验证：49/49 绿 + 对比度探针 0 违规 + 各段浏览器实证；版本串 `?v=20260910a` / CODE_VERSION **95**。
- **追加批次 3（2026-09-10 续）**：**A. R-6 五项功能遗留全闭环**——①通知对象级深链（11 个生产点补 targetUrl/targetType+targetId，`workspace-shell` 支持 `?tab&highlight` 定位，新增静态守卫防回归）②代归档深链（放行书记/副书记进入宣传台**仅归档兜底面** + 归档 tab 增「待归档」区）③代填复盘（复盘表单下沉 `services/review.js` 单一实现，书记入口复用同表 + 代填留痕；顺修 bootstrap 调未定义函数致白屏 bug）④催办文案定稿（中性事务式：〈业务域·事项〉+ 时限；待办页与概况催办两处统一）⑤党委「进入支部」放开 API 会话下钻（只读横幅 + 写权零放宽）；**B. R-7 对比度遗留**（styles.css **特批**最小改 4 行：`.ov-sub-tab-active`/`.tint-pill` 文字色 color-mix 深档 + 深色分支；浅/深两态 0 违规）；**C. 最小三成本下一轮（第 6 轮）六条全部落地**（发展数据只读化+名册补阶段日期、组长建活动默认预选+高级折叠 7→3 次点击、无日期不显示、上传外发改行内、党委总览披数字/台账披明细、周报周次自动派生）；**D. 门面收尾**（8 个页面 title + 2 处页脚 + help 正文统一「示例组织（光华管理学院本科生党支部）」通用化口径）。**生命周期退出**：R-6/R-7 及 C①~C⑥ 已从乙部完整退出（本表即权威登记），乙部仅留 **R-8**（深色模式 7 处其它类残留）。验证：各段子集 8/8、6/6、28/28、10/10、33 项等全绿 + 浏览器实证（深链/放行/代填/下钻/去重/派生）逐项通过；版本串 `?v=20260910a` / CODE_VERSION **96→97**。
- **追加批次 4（2026-09-11 续，A→E）**：**A. R-8 深色对比第一批**（`.btn-accent-soft`「催办」×4 + 浅底分工标签×3 → 组件侧 `--acc-text-dark: color-mix(...)` 覆盖，深色 2.52→5.78 / 2.43→6.92，探针 20 行 0 违规）；**B. 拖拽调序改机测**（Playwright 真实 HTML5 拖拽：拖入/重排/持久化/核心锁定/越界回滚 + console 0 error，`preferences.test.mjs` 16/16，**实现无缺陷**，撤销"真机手测"依赖）；**C. 名册确权链形态专项**（只读诊断：403 来自 `resources.js:67-72` users 写权矩阵仅 party-staff；按**方案 B** 新增语义端点 `POST /api/v1/members/:id/develop-stage`（限书记+同支部+字段白名单，越权 403/注 role 400）+ 客户端 api 分支改调 + 修 `person.js` name 必填误伤局部更新；双形态实证 mock/api 均通、书记 200 落库）；**D. 深色第二批 R-9**（组件侧 10 文件：浅底徽标 2.28→5.69、work-map 标签 1.94→9.85、`.cal-view-btn` 2.52→5.78、`.ov-sub-tab` 2.79→6.41、`solidAccentStyle` 4.10→7.01；并**特批 styles.css 3 处**：`.tab-btn-active` 浅/深分支 color-mix 深档、深色 `.is-today` 覆盖 → 深 1.74→8.31）；**E. 新一轮评议暂不启动**（排期表保持为空）。**生命周期退出**：R-8/R-9 与本批 C 专项全部退出乙部，乙部新立 **R-10**（API 形态其余写链 403 隐患）/ **R-11**（深色第三批残留）。验证：各段子集 16/16、34/34、19/19、6/6 全绿 + 探针（浅/深两态 7 角色）目标项全达标；版本串 `?v=20260911a` / CODE_VERSION **97→99**。
- **追加批次 5（2026-09-11 续，A~D）**：**滞留清理（书记裁定）**——乙部只保留未闭环可执行项，完成项与「闭环注记」一律撤出（权威登记=本日志+REVIEW_QUEUE），如需再启动须**重新注册并标注轮次**；据此撤出乙部 4 条历史完成注记（T-279/280/282/283）与闭环记录块、丙部 2 条已完成行（T-281/T-237）。**A. R-10 全补三条写链**（API 形态语义端点，与方案 B 同构同纪律）：`POST /members/:id/residence-status`（书记侧，白名单在册字段）、`PATCH /members/:id/profile` + `POST /members`（组织委员，白名单在册属性，阶段字段仍唯一走 develop-stage）、`POST /members/:id/transfer-out`（组织委员/书记，软标记转出、原行保留）；此前 `develop-stage` 同批确立；全部含同支部校验与白名单（注入 role/branchId→400、枚举→400、不存在→404、跨支部→403），**users 写权矩阵零改动**；客户端 `api-adapter`/`person.js` 分流接线，mock 分支不变。**副书同权裁定**：书记侧三端点 + `member-change-requests/:id/confirm` 纳入**副书同权**（单一源常量 `SECRETARY_AND_DEPUTY_ROLES`；`approve` 组织委员专属保持；`profile`/`POST members` 组织委员专属保持，依据 §9b 并列独立角色）；补同支部校验（收紧）。**B. R-11 深色第三批**（组件侧 12 文件：`text-gray-500` 族 1.37→5.90、`bg-cyan-50 text-cyan-700` 1.39→8.83、`text-amber-800` 1.95→8.27、「·我」2.27→6.74、评论气泡族一并对齐；2 项豁免=头像首字/向导 disabled）。**C.** 新一轮评议**暂不启动**（排期表保持空）。**D.** 收口。**生命周期退出**：R-10/R-11 闭环退出乙部，新立 **R-12**（深色第四轮：未扫描页的分数浅底类残留）。验证：权限与成员链测试 40/40、43/43，模块 148/148，浅/深两态探针目标项达标；版本串 `?v=20260911a` / CODE_VERSION **99→101**。
- **追加批次 6（2026-09-11 续，R-12 + 黑话第 6 轮）**：**A. R-12 深色对比第四轮（组件侧收口）**——全量扫描 7 角色全 tab + 11 根页（浅/深两态），修 10 文件（`secretary#assign` 头像、archive 当前页、settings 外观、wizard/pc party-config、prop weekly、secretary feedback 等同族），并**发现 styles.css 真缺陷**：L4303 注释内 `*/` 提前闭合致 `html.theme-dark .doc-card` 整条规则被丢弃（help 页 425 处 td 1.48）——经**特批**修注释（`.doc-* / .qn-*`）+ 新增深色 `.help-toc-item`（1.48→11.35、2.48→12.61）；**再特批** `about.css` 两处（`.ab-page-runner` 4.15→5.55、`.ab-chapter-eyebrow` 3.22→6.51，装饰编号豁免）。**B. 黑话审查第 6 轮**（书记逐条裁定 6 候选 + 追加清扫）：①**回潮清用户文案**——UI 中「闭环」13 处改「办结/流转完成/标记已外发」（about/group-progress/review/overview/archive/issues/inspector/work-map；保留授权「确认闭环」与内部标识）；②`FILE_OPERATION_RULES.md:150` 去「抓手」并**书记新增裁定：数字不硬编码**（同节标题/正文同步去计数）；③「颗粒度」→「分层」7 处 + 入库；④设置页去工程语（`= policy-defaults`/`（why）`/`config.modules`/L2/L3 等 12 处改用户语言）；⑤「范式」→「做法/标准」+ 入库；⑥**回潮**「确权」→「成员变更确认」族（README/注释/文档）；**同族扫净**：「确权」全仓 0 残留、「范式」仅余学术引文（库恩式用法）与判例条目本身。**硬编码计数清扫**（书记「数字不硬编码」）：先清 8 条真风化（README×2 的 26 域/9 工作域/5 步/19 页、机制文件 6 类陷阱、17 条论断、三项职权、三项考察），再清同族残留（ARCHITECTURE/OPERATIONS_GUIDE/SERVICE_CATALOG/DEPLOYMENT_GUIDE/4 篇 05_ai_coding「19 条总篇」/function-catalog.js 与 gen-function-mermaid.mjs），help-e2e 与 function-map-sync 断言按**动态口径**校准（未弱化）。**生命周期退出**：R-12 闭环退出乙部，新立 **R-13**（浅色灰字 245 处存量待核：真违规/探针伪影）。验证：module-load 148/148、link-integrity、help-e2e、function-map-sync、flow-catalog-sync、member/permission 等子集全绿；浅/深两态探针目标项达标；版本串 `?v=20260911a` / CODE_VERSION **101→103**。
- **追加批次 7（2026-09-11 续，R-13）**：**R-13 浅色对比存量核销（先定性→再收口）**。定性（只读探针，7 工作台全 tab + 11 根页，浅色）：灰字 `#9CA3AF` 命中 296 = **真违规 68 / 伪影 228**（折叠侧栏 225 + `display:none` 3）；浅色全集 <阈值 369 = 真违规 122 / 伪影 247——**约 3/4 为「默认折叠侧栏」伪影**（深色轮次未按此归类，故与此前口径有差），真违规约 1/4。处置：**组件侧收口**（不擅改样式表）——`help.html` `.help-card-rel-line` 38 处 2.54→4.83、`dashboard/stats.js` 专班大字/零值/单位 9 处 2.15–2.54→3.19–4.83、`text-gray-400→text-gray-500` 7 处 2.42→4.62–4.83、`settings.html` caption/激活项/`.appearance-note` 2.42–4.47→4.62–8.70；**同族扩散扫清**（sidebar/根页/header/references/settings-entry/custom-select/person-picker 等 ~30 处 2.42–2.54→4.62–4.83）；深色同项零退化、豁免项（装饰/图标/禁用/骨架/深色覆盖）注明依据；**浅色剩余真违规仅 12 处＝登记项**。**生命周期退出**：R-13 闭环退出乙部，新立 **R-14**（浅色存量需改样式表：styles.css `.ref-*`、about.css 浅色约 52 处、status-badge pending 双态单 token 议题——**待书记专批**）。验证：module-load 148/148、link-integrity、help-e2e 全绿；浅/深两态探针达标、console 0 error；版本串 `?v=20260911a` / CODE_VERSION **103→105**。
- **追加批次 8（2026-09-11 续，R-14 样式表专批）**：书记**专批**范围逐条列明：**特批 1** `docs/src/styles.css` 参考文献灰字——`.ref-site-desc`/`.ref-doc-meta`/`.ref-doc-size` 由 `--neutral-400`→`--neutral-500`（浅 2.54→**4.83**，深色 6.96 不退化）；**特批 2** `docs/src/about.css` 浅色族——`--ab-ink-faint #94897A`→`#6C6254`（page-runner 3.24→5.64、tl-time 3.24→5.64、tl-detail-article 3.37→5.87、exploration 3.24→5.64）、`.ab-tl-stage` `#ABA191`→`var(--ab-stage-from,#756B5D)`（2.40→**4.93**）、`.ab-tl-no--decision`→`#7C5C14`（2.28→**5.83**），并补深色分支防回退；装饰编号 `.ab-tl-no`/`.ab-review-card-no` 豁免不动；**特批 3** status-badge pending 双态分档——`.status-badge[data-status="pending"]` 浅 `#7A838F`（3.39→**4.84**）+ `html.theme-dark` `#AEB6C2`（6.44→7.37）。控制组 20 行**零变化**（ctrlDiff=0），console 0 error，module-load 148/148 + link-integrity + help-e2e 全绿。**新遗留**：深色 `--ab-ink-faint:#7E7870` 在 3 个无深色分支 `ab-*` 元素仍 4.15/3.82/4.15 → 立 **R-15**（另行专批）。**生命周期退出**：R-14 闭环退出乙部；版本串 `?v=20260911a` / CODE_VERSION **105→107**。
- **追加批次 9（2026-09-12 续，R-15 深色收官 + 黑话第 7 轮）**：**A. R-15（深色模式收尾轮，一次做完即收官）**——书记指令「深色推动已多轮，快速收尾」：`docs/src/about.css` 深色 token `--ab-ink-faint #7E7870`→`#948E85` + 新增深色分支（`--ab-red` 口径用于 review-card-tag/高亮卡名/dialogue-phase/激活目录 tooltip；`--ab-red-deep` 口径用于 philosophy-opp-insight/point-label/dialogue-answer）：目标 `.ab-tl-time` 4.15→5.58、`.ab-tl-detail-article` 3.82→5.14、`.ab-exploration-scene-note` 4.15→5.58，同族抽样 11 项全部 ≥4.5（tag 3.22→6.50、answer 2.29→5.68、insight 2.37→5.88 等），浅色 21 项逐项零变化；深色违规 67→5（余 5 处为装饰编号 `.ab-review-card-no`/`.ab-dialogue-no`，**标注豁免、不再立遗留项**）。**收官声明**：深色对比**不再开新轮**（四轮 + 收尾轮完成；后续个别瑕疵按「装饰/豁免」标注或以既有判据处置）。**B. 黑话审查第 7 轮**（6 候选逐条裁定 + 同族扫净）：①**回潮·高**「漂移」→「**失同步**」（67 处 / 40 文件：README 门面、CONTRIBUTING、ENGINEERING_ASSESSMENT/SNAPSHOT/REVIEW_QUEUE、content 十余篇、docs/src 十余文件与测试用例名；入库防回潮）；②向导页（部署/换壳工具）**只去内部术语、保留命令**——「验证点」→「检查项」、「写库」→「写入系统」、「留痕」→「记录变更」（3 文件；保留 `npm test`/`?reset=1`/文件清单/步骤编号）；③「幂等」→口语「重复提交自动覆盖上次选择」（help 正文）；④「落库」→「保存/写入系统」+ **同族「口径」扫净 29 处**（用户可见文案；内部标识/注释保留）；⑤用户空态「时间锚点」→「该场景暂无需按时间安排的事项」（内部标识保留）；⑥源头层「用户第一接触点」→「用户最先看到的内容」。判据入库：附录③ 第 7 轮记录 +「漂移→失同步」条目；附录⑦ 追加「深色对比收官」。验证：module-load 148/148、link-integrity、help-e2e、wizard-copy 等子集全绿；探针浅/深两态与 help/设置文案 0 命中黑话词、console 0 error；版本串 `?v=20260912a` / CODE_VERSION **107→109**。
- **追加批次 10（2026-09-12 续，列表可点扫修 + 意见反馈真匿名 + 正式表决无记名）**：**A. 卡内实体条目可点扫修（书记裁定「能改就改」；判据由 ≤1 跳放宽为 ≤2 跳）**——审计出 **9 类**不可点实体条目并全部补入口与落点：书记台「活动查询」行→`activity.html?id=`（验收样本，实证落到「9月支部党员大会」）、党委监控近期活动（span→a）、宣传台归档/待归档行、党委支部卡补「进入支部」（`branch-demo-nav`→`secretary.html?branch=`）、人才库成员卡→`?tab=roster&highlight=<personId>`（1 跳）、纪检活动流程监督行、书记台党小组进展待复盘行、组长组员进展待复盘行、参与者我的考察行；非缺口 9 项逐条注明依据（聚合/装饰/禁用/无详情页的日志类）。**B. 意见反馈真匿名**——新增 `issues` 表与 `GET/POST /api/v1/issues`（PATCH 仅书记，处置白名单）；匿名不存任何可反查字段（**书记亦不可见**），仅存随机 token 的 `tokenHash`（无 personId、无盐）用于判重/限频；处置结果公开发布、取消定向回推；历史 `_realPersonId` 读取时清除；新增 `issue-anonymity.test.mjs`（6/6）。**C. 正式表决无记名 + 匿名模式可选**——`voteConfig.ballotMode: named|anonymous`（单一源 `constants.js`；发起时选定、同场统一；`optionSet==='formal'` 读取侧强制 anonymous 且 UI 只读 + 服务端校验改 named→400）；无记名数据两段式（参与记录 personId+votedAt 用于催办与人数核验 + `tally` 计数行，**逐人选项不落库**）；书记端矩阵改「已投/未投 + 汇总」、门槛改参与记录+tally、通知人数剔除 tally 行；扩展 `agenda-votes/agenda-quorum/async-vote` 断言（含「响应与存储均无 personId→选项映射」匿名性断言）。**判据入库**：附录⑦ 修订「操作入口判据」（≤2 跳 + 卡内实体条目必须可点）+ 新增「**匿名判据**」（真匿名边界 / 无记名两段式 / 强制锁定 / 其余实名）。验证：双形态实证（API 书记会话取不到提交人：`{submittedBy:'匿名',anonymous:true,participants:[],identityKeysPresent:[]}`；无记名逐人选项映射条数=0、tally `{approve:2,oppose:1,abstain:1}`；强制场景 named→400）× 双主题探针 console 0 error；新增/扩展测试全绿。**新遗留**：R-16（组长考勤/考察上传、纪检考察总表等**台账行**仍不可点——需服务层 `inspectionToLong` 暴露 activityId 后方可补链）、R-17（无记名延伸范围：专班/分工等 deliberative 流程是否纳入，待书记裁）；版本串 `?v=20260912a` / CODE_VERSION **109→111**。
- **验证**：全量 `npm test` **441/441 通过（0 失败）**——bump 前与 bump 后（重建演示库）各一次；中间一次连续复跑出现 `b3-1-makeup-writeback` 顺序依赖波动（单跑 5/5 绿；根因=共享 `server/data.db` 跨次运行状态污染，与源码/版本串无关，登记 R-5）；module-load 148/148；GetDiagnostics 全 0；写入 UI 浏览器 DOM 断言 16/16。
- **登记/遗留（2026-09-12 收口后状态）**：乙部仅余 **R-16**（台账行可点残余：组长考勤/考察上传、纪检考察总表——需服务层暴露 activityId）与 **R-17**（无记名延伸范围：专班/分工等 deliberative 流程是否纳入，待书记裁）；R-3~R-15 各批、功能实现评议下一轮 8 项、最小三成本第 6 轮 6 条、黑话审查第 6/7 轮、拖拽机测、成员写链语义端点与副书同权、深色四轮 + 收尾轮（**深色不再开新轮**）、浅色存量核销、样式表专批、列表可点扫修、意见反馈真匿名、正式表决无记名均已闭环并**完整退出**（权威登记=本日志 T-077 追加批次 1~10 与 REVIEW_QUEUE 附录①~⑧）；排期表当前为空（新轮次暂不启动）；丙部 P.14 push 放行待批（**ahead 15 笔**，推送前先 `git status`）。
- **追加批次 11（2026-09-12 续，dogfood 七身份体验问题全修）**：**来源**——书记指令「自行先做一次 dogfood，按照每个身份，用最批判性的眼光输出使用体验上的问题（一定是真实使用体验问题）」；走查报告交付后书记以 AskUserQuestion 裁定修复范围为「**全修 S1~S12 + 单点**」。**走查**——7 身份串行真机 dogfood（书记/组织委员/纪检委员/宣传委员/党小组组长/普通党员/党委组织员，浅色+深色各一遍，只读），共 **71 条真实复现问题**（每身份 9~10 条），去重为 **12 类系统性缺陷 S1~S12 + 单点**。**S1~S12 修复**：S1 通知详情单一取数口（`notice-entry` 先 hydrate 再按 id 取；`NoticeStore.getById` 未命中时按 id/sourceId/actionData.noticeId 从通知类待办**现算重建**，`markRead` 兜底销对应待办——消除多入口「通知不存在或已过期」）；S2 `?tab=` 深链与内容区一致性（tab-bar/workspace-shell 的「记忆 tab 异步渲染回写覆盖 URL tab」竞态收敛，复现率 1/3~3/3 → 稳定直达）；S3 待办条数与概况/角标/首页未读**同源**（消除「待办空但概况称 N 项」与三处未读数互不相等）；S4 「今天」落点不再空白（今日会/到期/本岗待办摘要）；S5 党委只读下钻**按 canDo 封死写入口**（`branch-demo-nav` 放行可见性时同步隐藏禁用写入活动/发布通知）；S6 宣传待办「去归档」落到「档案归档」并定位 + 归档页**筛选后按钮改事件委托**（此前筛完即失效）；S7 **深色徽章色义恢复**（`styles.css` 裸 `.badge` 深色规则与 `.badge--*` 同特异性且位置在后、逐条覆盖变体 → 限定 `:not([class*="badge--"])` 与顺序解耦；**样式表特批**）；S8 空白 Toast（`showToast` 参数顺序——党委下发/书记上报校验与成功提示恢复文字）；S9 概况统计可下钻（待归档/超期等纯文本行补入口）；S10 人数口径同源（名册/人才库/发展数据统一为「本支部在册」）；S11 提交校验与反馈（线上表态/思想汇报/上报空提交内联提示，不再静默）；S12 危险操作二次确认（复盘打回/任命书记/报名拒绝）。**单点**：意见反馈列表 `undefined` 兜底 + 条目 `role/tabindex/aria-label`、首页已登录标题按支部名、人才库增搜索与阶段/小组筛选、通知行键盘可达、新建活动草稿跨刷新暂存、周报周次起止自动派生 + 倒序、专班过截止显示「报名已截止」、组长考勤/考察上传下拉**排除已取消活动 + 已上传项标「· 已上传」**、`.kanban-card` 与 `.leader-act-item` 补 `role=button/tabindex=0/Enter·Space` 键盘激活、组长台副标题「复盘提交」→「**复盘状态查看**」（对齐 K2 组长复盘只读裁定，消除空头承诺）。**验证**：E1 `module-load` 单跑 **1/1**（全模块可加载、无未定义引用）；**bump 后全量 `npm test` 475/475 全过（0 失败）**——此前一次连续跑曾出现 4 项 `page.goto` 超时（agenda-flow A1、click-cost C1、link-integrity L4、mock-integrity M2），**单独复跑这 4 个文件 16/16 全过**（C1 实测点击 4 次 ≤5）→ 判定为串行满负荷下的浏览器/端口资源竞争抖动，非代码缺陷；真机回归 13 项（通知可开/深链一致/待办同源/今天落点/只读封口/归档链路/深色徽章实测色值/Toast 有字…）+ 定点复验 4 项（考察下拉无 `myInspection is not defined`、cancelled 过滤、Enter 打开详情、副标题）**全 PASS**；GetDiagnostics 0。**版本串** `?v=20260912a` → **20260912b**；CODE_VERSION **111 → 112**；HTML 19 个 stamp 同步。**新遗留**：**R-18**（组长「考勤上传/考察上传」明细表 40~53 行平铺、无活动筛选/分组，长列表查找成本高——属最小三成本·信息成本）。**未验证（据实登记，不计缺陷）**：交接「确认接收」入口（演示种子无待交接数据，无可点目标）；390px 窄屏（浏览器工具无视口控制手段）。
- **追加批次 12（2026-09-12 续，dogfood 收口补全：R-18 + 窄屏实测核销）**：批次 11 收口后按书记裁定「全修 S1~S12 + 单点」复审剩余未闭环项，本轮补齐两处：**① R-18 闭环（组长台账明细无筛选）**——组长「考勤上传」「考察上传」明细表增「按活动 / 按来源筛选」（纯 DOM 过滤、不重渲染，避免丢失表单已选与已填内容；旁列「显示 X / 共 N 条」计数）：Playwright 实测 @390 与 @1440 两视口——考勤 9 选项 / 53 行，筛「7月主题党日：五四精神传承」→ 可见 3 行（与预期行数一致）；考察 8 选项 / 40 行 → 3 行。**② 窄屏存量核销（390×844 实测；口径＝排除可横滚容器内子元素后的「真溢出」）**——党委「支部配置」原 `clientWidth 390 / scrollWidth 411`（真溢出元素＝「党委 · 任意支部」徽标，右缘 411）→ 目标支部行改 `flex-wrap` + select 补 `min-w-0` 后 **390/390 归零**；组织「成员名册」390/390、组长考勤 390/390、组长考察 390/390 实测**本就无溢出**（名册窄屏 6 列 grid 退化为单列卡片系 B6⑥ 2026-09-12 既有改造，本轮以实测确认，不再另立遗留项）。**生命周期**：R-18 闭环并退出乙部（乙部余 R-16 台账行可点残余 / R-17 无记名延伸范围待裁）；批次 11 登记的「未验证」两项由此收敛为一项（交接「确认接收」仍因演示种子无待交接数据无法构造，据实留存）。**验证**：bump 后全量 `npm test` **475/475 全过（0 失败）**；临时探针（`.tmp-pw/narrow-probe.mjs`）用后即删。**版本串** `?v=20260912b` → **20260912c**；CODE_VERSION **112 → 113**。
- **追加批次 13（2026-09-12 续，剩余单点逐项实证 + 两处真未修补修）**：批次 12 后对「仅代码层存在、缺直接证据」的单点逐项真机实测（同一口径：内存服务 + 真机 DOM 断言；临时探针用后即删）——**8 项中 6 项当场通过、2 项实证为真未修并修复**。**通过（6）**：① 组长活动写入草稿**跨整页刷新保留**（重载后面板自动恢复、标题/地点回填、localStorage 有稿）；② 人才库**搜索**（输入「宋佳宁」→ 50 张成员卡收敛为 1 张）；③ 周报周次与起止（第31周 = `2026-07-27 ~ 2026-07-31` 正确，下拉按周次倒序）；④ 成员考勤空态（显示「—（暂无考勤记录）」，不再出现 0/0·0%）；⑤ 意见反馈列表**无 `undefined`**；⑥ 首页登录后大标题 = 支部名（「光华管理学院本科生党支部」，非「示例组织（未登录）」）。**新修（2）**：⑦ **通知发布列表「删除/编辑」原为纯悬停可见**（`opacity-0 group-hover:opacity-100`，键盘/触屏用户看不到按钮）→ 改为常显（实测 computed opacity 1、hoverOnly 计数由 6 → 0）；⑧ **专班详情公共页过截止日仍显示「招募中」且无任何截止说明**（首页专班列表与成员端已按截止日派生，详情页漏改）→ 状态徽章按截止日派生「**报名已截止**」+ 报名区补说明「报名已于 X 截止，不再接受新报名」（实测 tf-006 由「招募中」→「报名已截止」+ 说明文案）。**批次 11 遗留的唯一「未能验证」项——交接「确认接收」——本轮实证为可用**：探针构造待接收交接（纪检→组织「考察记录提交」）→ 组织委员待办页出现「考察」域折组行与行内「确认接收」→ 点击后交接 `pending → done`、toast「已确认接收 N 条数据交接（考察记录已接收建档）」、销待办联动生效；此前无法验证仅因演示种子无待交接数据（非缺陷）。**验证**：bump 后全量 `npm test` 共跑两次——首次 **474/475**（唯一失败＝`issue-anonymity` mock 形态「实名提交人应为 p5、实际『匿名』」断言），**该文件单独复跑 6/6 全过**，再次全量 **475/475 全过（0 失败）** → 判定为串行满负荷下的顺序/状态相关抖动（与既有 R-5「共享演示库跨次状态污染」同类，非本轮代码引入；本轮改动不涉及 issues/反馈链路），**据实留痕、不假绿**。**版本串** `?v=20260912c` → **20260912d**；CODE_VERSION **113 → 114**。
- **追加批次 14（2026-09-13，权限专项 dogfood：制度↔代码↔界面三向比对 + 修复）**：**来源**——书记指令「继续推进未完成项（R-16/R-17/P.14）」，并特别要求「权限问题值得研究（例：党小组组长没有权限写入支委会和党员大会，只能写党小组会）」+ 批判性思考 + dogfood。**① 权限矩阵审计（只读）**：覆盖 8 角色 × 10 动作（建活动/考勤上传/考察上传/复盘/表决发起与表态与截止/通知发布/名册与阶段/L2-L3 配置/党委审批下发），制度源 = SYSTEM_ROLE_PERMISSION §9a/§9b/§9h、组长手册 §2.1/§5.2、纪检指南 §1.1、CF §C.1a/§D.1；产出矩阵 + **9 项不一致**（3 高：组长跨组写权、纪检兼组织者上传位缺失、后端活动写无门）。**② 真机 API 探针实证（before）**：普通成员 `POST /api/v1/activities` → **201**（建出「支委会」活动并写入 formal 表决名单）；普通成员 `PATCH /activities/act-31`（改 voteConfig.voterIds）→ **200**（可篡改表决名单）；副书记 `POST /agenda-votes/lock` → **403**（与「副书同权 2026-09-11 裁定」直接冲突）。**③ 修复（after 复验）**：㈠ `server/routes/resources.js` 补**活动写门**（POST/PATCH/DELETE：非支委层一律 403；组长限党小组会/主题党日）→ 复验 **403 / 403**（原 201 / 200）；㈡ **副书同权补齐**：表决截止改 `SECRETARY_AND_DEPUTY_ROLES`（server committee.js）+ mock 侧同步（committee-vote.js）→ 复验 **200**（原 403）；通知发布/管理白名单补 `deputy-secretary`（notice.js），书记台通知落款**不再硬编码「书记」**（按实际角色取书记/副书记，消除审计失真）；㈢ **组长上传位加「本组」约束**（attendance.js / inspection.js 新增 `_activityPartyGroup` 判据：活动 hostGroup 优先、缺省回退组织者所属小组）——此前任一组长可代录他组小组会考勤/考察（实测下拉出现别组小组会且可提交成功），与组长手册 §2.1「上传本组」不符；㈣ **纪检兼组织者上传位补齐**（attendance.js disc 分支此前直接 return → 同人同活动「考察页有上传位、考勤页没有」且无提示）；㈤ **组长改派支部级活动角色封口**（leader/write-tab.js：top-down 活动「保存角色」按钮禁用 + 只读标题 + 点击拦截，制度依据组长手册 §5.2 / CF §D.1）；㈥ **mock 表态补应到名单校验**（committee-vote.js，与 server 端点同口径，此前非应到人可表态）。**④ R-16 闭环**：服务层透出来源标识（attendanceToLong / inspectionToLong 增 `activityId`/`sourceName`）＋ 台账活动名改从 `loadActivities()`（mockDB 优先）取（**API 模式新建活动此前在台账里只显示 `act-xxxx` 原始 id**）＋ 组长考勤/考察明细与纪检考察总表「活动」列补「查看该活动」链接（点回 activity.html）。**⑤ 书记裁定（AskUserQuestion）**：**R-17 → 维持现状**（仅发展党员/转正等正式表决无记名，专班表决、支部分工等内部表决维持记名）；**活动创建权 → 保持现状**（非支委层已一律拦住、组长限类型；组织/宣传/纪检的归档/议程/台账功能位保留，不进一步收紧至 §9a 原文）；**P.14 → 暂不推送**。**⑥ 验证**：定向用例全绿——权限/角色/考勤/考察/表决/名册 55/55（含 `permission-gate` 用例**按新门重写**：支委层 201、普通成员 POST 与 PATCH 均 403、组长支委会 403 而党小组会 201、未登录 401）、考勤批量＋产出块 e2e 7/7；bump 后全量 `npm test` **474/475**——唯一失败＝`multi-user-write`「多用户顺序写」（30s `page.goto` 超时），**该文件单跑 2/2 全过**（16.7s/25.4s，阈值边缘）；连同本日批次 13 的 `issue-anonymity`、批次 14 前的 `async-vote`（单跑 25s 通过），**今日三次全量各出现 1 个各不相同的浏览器时序失败、单跑均全过** → 判定为串行满负荷下的时序抖动（与既有 R-5「共享演示库/资源竞争」同类），**据实留痕、不假绿**。**⑦ 新遗留**：**R-19**（后端 `notices` 无写角色门：前端白名单已补副书，服务端仍任一登录成员可写 = 前后端口径不一致残余）；**R-20**（表决「应到」＝有表决权党员 vs 考勤「应到」＝正式＋预备，同名字段两口径且界面未解释）。**⑧ 权限体验真机走查（dogfood，7 项）**：**PASS 5**——① 组长上传位＝本组（p1 下拉 9 项，无第二/三党小组小组会、无支部级 act-19/act-8；p2 复核不越权）；② 支部级活动「活动角色（只读）」+ 保存按钮 `disabled=true`，本组活动可编辑；③ 台账「活动」列均为 `activity.html?id=` 链接（实测纪检落点 act-3）；④ 普通成员无任何建活动入口、手访 `leader.html?tab=write` 被重定向回成员台、`activity.html?id=act-31` 仍可正常表决；⑤ 副书记发通知成功且**落款显示「副书记」**。**FAIL 2（当场复修）**：⑥ **副书记「看得到点不动」**——书记台可见「表态汇总」矩阵但**「截止表态」按钮完全不渲染、无任何提示**（前端 `canLock` 仍只认书记，与已改的 server/mock 不同步）→ 修 `inspector.js`（`canLock: true`，该区块本就限书记/副书）+ `vote-summary-panel.js` 无权限时明示「截止表态由书记/副书记操作」（不留静默空缺）；⑦ **组长上传下拉空态无声**——第二/第三党小组组长（p2/p4）下拉只剩占位符、无任何解释（演示种子只覆盖第一党小组小组会）→ 两处下拉补空态说明「本组暂无可上传活动（仅本组党小组会与本组承办活动可上传）」。**⑨ 复核结论**：走查未再发现其他越权/落差；新登记 **R-21**（演示种子仅覆盖第一党小组小组会 → 第二/第三党小组组长上传位为空；补种子涉及活动计数与多组用例，单独立项评估）；旁注（不登记）：API 模式切页时 `/api/v1/snapshot` 与字体资源出现 `ERR_ABORTED`（属导航中断/环境阻断，非功能缺陷）。**版本串** `?v=20260912e` → **20260912f**；CODE_VERSION **115 → 116**。
- **追加批次 15（2026-09-13 续批，乙部三遗留 R-19/R-20/R-21 收口）**：**来源**——书记指令「迅速推进 R-19/R-20/R-21；高风险/低风险都要处理」。**① R-19 后端通知写门（高）**：缺口＝前端有发布/管理白名单而 server `POST/PATCH/DELETE /notices` 仅 `requireAuth`（任一登录成员可直连写通知，属前后端口径不一致）。修：角色名单上收 `docs/src/core/constants.js::NOTICE_PUBLISH_ROLES / NOTICE_MANAGE_ROLES`——**由 `BRANCH_COMMISSION_ROLES` 派生**（发布＝支委层除纪检；管理＝支委层全体），前端 `notice.js::NoticePermission` 与 server `resources.js` 资源写门**同源共用**；403 文案改按资源给可懂原因（新增 `_writeDenyMsg`，通知不再复用「仅限党委组织员/党务老师」的万金油）。**新增用例锁定**「通知写门：书记/副书记/组织/宣传 POST 201；纪检 POST 403 但 PATCH 200（管理位）；普通成员 POST/DELETE 403；组织委员 DELETE 204；未登录 401」。派生写法一次通过 roles-sync 守卫（「5 支委授权列表只许出现在授权集」）。**② R-20「应到」两口径（中）**：表决应到＝有表决权党员（预备党员无表决权）↔ 考勤应到＝正式＋预备（剔除滞留），同名字段两义易被误读为漏人。修：表决汇总面板加**口径说明行 + title**；书记台专班表决结果卡与分工面板「应到」加 title；考勤侧（书记台活动考勤行、党小组进展）加「考勤应到＝正式＋预备（剔除滞留）」title——**不改可见文案**，规避既有断言。**③ R-21 演示种子（中）**：新增 `act-32`/`act-33`（第二/第三党小组「8月党小组会」，organizer=p2/p4，**hostGroup 显式固化**＝组长写入同一语义），并给 `act-26` 补 `hostGroup=第一党小组`；效果＝p2/p4 的考勤/考察上传下拉不再为空（此前「组长上传位＝本组」收紧后只剩空态说明）。**验证**：`permission-gate` + `roles-sync` **11/11**（通知门用例已含）；bump 后全量 `npm test` **476/476 全过（0 失败）**——用例总数 +1（新增通知写门），且**连带风险修复后重跑仍全绿**。**⑤ 全员用例数由 475 → 476**（新增通知写门）；`permission-gate` 现 12 项含通知门。**④ 连带风险核查（自查，重要）**：R-19 落地后复盘发现**系统派生通知会被误杀**——全仓 21 处 `NoticeStore.add(` 中多数**不传 actorRole**（业务副作用：成员提交思想汇报→通知组织初阅、纪检确认考勤→通知组织委员、赋权/表决进度、专班/分工变更、发起活动等），API 模式下会带着**触发者会话角色**（可能是普通成员）POST `/notices` → 新写门 403 且被 try/catch 静默吞掉（通知丢失不报错）。修：`notice.js::add` 在**不传 actorRole 时**给通知打标 `systemDerived: true`（人工发布路径必传角色、仍受白名单约束），服务端写门据此放行系统派生通道；用例同步补「普通成员带 systemDerived → 201」断言。**残留信任边界登记 R-22**（该标记客户端可伪造；彻底方案＝把这几类通知改为**由所属业务端点服务端派生**，需先界定落点，登记待议）。**生命周期**：R-19/R-20/R-21 三项闭环并**退出乙部**；同批新登记 **R-22**（系统派生通知信任边界）。**版本串** `?v=20260912f` → **20260912g** → **20260912h**；CODE_VERSION **116 → 117 → 118**。
- **追加批次 16（2026-09-13 续批·全局 UX 反思「触点即落点」）**：**来源**——书记实报「党小组组长的活动查询，点击活动后，部分详情居然出现在最下方，这太不合理了！」并要求全局性反思。**① 两路独立 dogfood 走查**（A：组长/纪检/组织/成员台；B：书记/宣传/党委/公共页），统一以「点击位置 y ↔ 详情出现位置 y ↔ 是否自动滚动 ↔ 是否紧邻触点」实测，**两路独立收敛到同一系统性模式**＝「共用单例详情容器固定在列表末尾」：**组长台 活动管理** `#leader-act-detail`（点第 1 条 y≈346 → 详情在 28 条列表之后 doc y≈2030，需下滚 ~1684px，`scrollY` 恒为 0；点任意条目都落到同一列表底，首屏无变化易被误判「点了没反应」）；**专班查看/管理** `#tfv-detail`（**书记/副书记/组长/宣传/组织 5 台共用**，点第 1 张卡仍需下滚 526px）；**组织台 考察上传** `#org-insp-detail`；**书记台 反馈管理** `#issue-detail-panel` 与公共反馈页（视图切换类：点靠下条目后详情在**列表上方**，需反向向上找）；**成员台 我的复盘**（行内展开正确但高 265px 超视口且不滚动）；**书记台 活动查询折叠**（展开后仅露出 25px）。**正确范例**（修复参考）：宣传台周报「展开」紧贴按钮下方 36px、书记台党小组进展行内就地增高、纪检考勤确认后 `scrollIntoView` 主动拉回视野。**② 统一修复**：新增共用助手 `docs/src/components/detail-anchor.js`——`anchorDetailToTrigger(panel, trigger)`（把共用详情容器**移到触发条目之后**再滚入视野，`block:'nearest'` 最小滚动、不跳动）与 `scrollDetailIntoView(el)`（视图切换/行内超视口类只滚入视野）；据此改造 **7 处**（组长台活动管理、专班查看/管理＝taskforce-view 5 台共用、组织台考察上传、书记台反馈管理、公共反馈页、成员台我的复盘、书记台活动查询折叠）。**③ 真机复核 8 项全 PASS**：组长台点首条 → 详情**紧贴卡片**（`card.nextElementSibling===detail`、视口 y≈159、`scrollY` 0→257、doc y 由 2030 → 416），点第 2/3/5 条详情随触点移动、收起重开不错位；专班查看详情落在视口内（基线需滚 526px）；组织考察紧随其行（`scrollY` 恒 0）；书记反馈详情视口内可见率 99.7%；成员复盘展开底 660 ≤ 视口 661；四页无红色报错。**版本串** `?v=20260912h`（本批内编辑，随批次 17 一并 bump）。
- **追加批次 17（2026-09-13 续批·R-22 闭环：系统派生通知收归服务端）**：**缺口**——上一批为「不让系统通知被写门误杀」而引入的 `systemDerived` 是**客户端自述标记**，任何登录成员凭一个字段即可发任意广播通知（信任边界未闭）。**改造**：㈠ 新增服务端 **kind 注册表** `server/system-notice-kinds.js`（**19 个 kind**，每个含 `authorize`＝服务端复算「业务对象存在性 + actor 与该对象的关系」、`build`＝服务端生成标题/正文/受众/落点）；㈡ 新增端点 `POST /api/v1/system-notices`（未知 kind **400** / 无资格 **403** / 未登录 **401** / 通过 **201**，并在 `server/app.js` 挂载）；㈢ 前端 `NoticeStore.addSystem(kind, sourceId, payload)`——**mock 模式走本地**（演示/离线不受影响）、**API 模式走端点**，失败 `console.warn` 不静默；㈣ **15 处系统派生调用点全部迁移**并**关闭旧通道**（移除 `resources.js` 的 `systemDerived` 放行分支与前端打标）；㈤ 文案单一源 `docs/src/core/system-notice-templates.js`（服务端 `build` 与前端 mock 共用，零失同步）。**验证**：`permission-gate` + `roles-sync` + `module-load` **13/13**（含「伪造 `systemDerived` → 403」新断言、新增「系统派生通知端点」用例覆盖 201/403/400/401 且断言**落库标题与落点取自服务端 build**、payload 伪造 `title`/`targetUrl` 被忽略）；回归集（thought-review / attendance-batch / meeting-attendance-rules / async-vote / agenda-votes / todo-domain* / today-summary / party-committee-review）**74/74**；`online-committee` 单点失败曾被初步判为「既有抖动」（依据：临时还原 `committee-vote.js` 后仍失败）——**该判定在下方 ⑧ 被推翻**：实为本次改造引入的集成回归，已定位并修复（见 ⑧）。**新登记 R-23**（R-22 收口后残留）：思想汇报在服务端无表 → 该 kind 只能按「提交人本人」判定（建议建表后收紧）；部分 kind 的展示值（活动名/姓名等）仍取自 payload（非安全字段）；通知草稿类的标题/正文由发布人填写、服务端仅掌控受众与落点。**⑧ R-22 集成回归与修复（重要）**：首轮全量 **475/477**——两处**断言型**失败（非超时）：`online-committee`「表态后已写入本地通知存储」、`party-committee-dispatch`「下发历史出现该条标题」；**根因**＝改造后系统通知在 API 模式**只写服务端**，而多处界面（党委下发历史、铃铛本地快照、行动性通知→待办派生）与这两条断言读的是**本地存储** → 表现为「提示已下发成功，但列表里没有」（用户可见的功能回归）。**先取服务端真值**（内存探针直连新端点）：`committee-dispatch` **201**（受众/落点/发布者均由服务端生成）、`committee-vote-progress` **201**（标题「线上支委会表态更新」、计数由服务端读 `agenda_votes` 复算为「已有 0/4 位委员表态」、落点 `secretary.html?activityId=`）、不存在的活动 **403**、未知 kind **400**、书记侧可读回党委下发 ✓ → 确认**服务端无缺陷**。**修 `notice.js::addSystem`**：改为**同步本地镜像**——API 模式下先本地生成「可见性镜像」（不做待办派生，成功后统一由服务端记录派生，避免同一通知派生两份待办），服务端成功则**以服务端记录替换镜像**（同一条只留一条，防列表重复）、失败（403/400/网络）则**回收镜像**（新增 `_dropLocalNotice`，防幻影通知）；mock 模式行为不变。**两文件复跑 2/2 通过**。**⑨ 最终全量（bump 20260912j 后）**：`npm test` **476/477**——唯一失败＝`issue-anonymity`「mock 形态…实名可见」断言（**该文件单独复跑 6/6 全过**，与批次 13 同一处既有抖动，非本批改动）；本轮 R-22 的两处集成失败均已修复并转绿（`online-committee` 与 `party-committee-dispatch` 复跑 2/2，且在后一次全量中双双通过）。**版本串** `?v=20260912i` → **20260912j**；CODE_VERSION **119 → 120**。
- **追加批次 18（2026-09-13 续批·「代码逻辑/界面文本/操作」三向失同步彻查 + R-23 ① 闭环）**：**来源**——书记三问（① 为什么书记界面会出现「书记的催办」？这不是内控问题吗？② 不得出现「KPI 以此计量」；③ 解决 R-23 中思想汇报的通知判定逻辑）＋「上述问题都不是孤例，代码逻辑、文本、操作的 gap 反复出现，必须研究彻查」；并明确要求「涉及浏览器检查验证的部分逐个推进，不要 parallel agents」。**① 通知消费端受众门（总根因，高）**：`search` 代理彻查 + 单个 `browser_use` 代理真机实测（串行）确认——「书记的催办」**不是自己催自己**（责任人非书记，`_SELF_URGE_ROLES` 已过滤）；真因＝`NoticeStore.list()` 只特判字符串 `audience==='committee'`，**从未按 `audience` 数组 / `actionRoles` 过滤** → 书记签发的催办（`actionRoles=[委员]`）又回到签发人自己的铃铛（未读 +2）；且**通知发布页所选受众（`audience` 数组）从未生效**（选「党小组组长」实际全员可见）。修＝`list()` 统一三档受众门：`committee`→本支部支委层；`audience` 数组→数组内角色；`actionRoles` 非空→目标角色；无受众＝广播；无会话（node 单测/匿名）不收窄。**② 签发人身份错位（中）**：催办正文去掉硬编码「书记提醒：」前缀（改中性事务式），`actorRole`/`publishedBy` 改取当前登录真实角色（`overview-tab.js` / `todo-tab.js`，修「副书记签发被记成书记」）。**③ 术语（用户明确要求）**：清用户可见「KPI／以此计量／完成率」——`overview-tab.js` 指标「归档完成率（%）· 目标 100%」→「待归档材料 N 条」（title 改「待归档条数（只报缺口，不设比率目标）」）、`review.js`「书记 KPI 以此计量」→「便于汇总改进」、`help.html` 同族；另扫净 `help.html` 黑话（留痕→记录 ~23 处、降级→显示、兜底→备用入口、应到口径→应到名单规则）。**④ R-23 ① 闭环（思想汇报通知判定逻辑）**：思想汇报此前**服务端无表** → `thought-report-submitted` 的 `authorize` 只能采信客户端自述 `personId`。修：㈠ 建服务端表 `thought_reports`（`server/db.js` RESOURCE_TABLES + `resources.js` 映射与 `tr` 前缀 + `api-adapter.thoughtReports.list` + `data-adapter` 快照 payload 与 `init` 拉取）；㈡ `authorize` 改**按表复算**——`rowOf(db,'thought_reports',sourceId)` 无该汇报→**403**（杜绝凭空伪造），提交人本人（`row.personId===actor.id`）或有权阅处角色（组织委员）→放行；㈢ 新增 `data-adapter.flushSnapshot()`，`thought-report.js` 在 API 模式**先冲刷快照**把本次提交落服务端表再触发通知（绕开 800ms 防抖窗口导致的授权 403）；㈣ 该通知**受众锁定组织委员**（原无受众＝全站广播给所有人含提交人自己）。**⑤ 同类彻查（身份不同源，书记 AskUserQuestion 裁定「改为真实成员 ID」）**：反馈指派由演示占位 ID（`u_sec`/`u_org`/`u_prop`/`u_disc`/`u_leader_1~3`）统一迁到**真实成员 ID**——`feedback-tab.js` 指派目标改按角色/党小组动态解析本支部成员（标签带姓名，如「组织委员（高翔宇）」）；`org`/`disc`/`prop`/`leader` 四台「我的处置」改取 `AuthStore.getCurrentUser().personId`（原写死占位 ID）→ 修掉两处**真实功能缺口**：「了解进展」请求以真实 `personId` 落库而「我的处置」按占位 ID 读取（委员/组长**收不到**）、三组长共用 `u_leader_1`（第二/第三组长看到第一组长指派）；种子 `docs/data/issues.json` 同步迁移（`u_sec→p13`/`u_org→p11`/`u_prop→p12`/`u_leader_1→p1`）+ `CACHE_VERSION 3→4`（键名不变，仅版本递进）强制清旧缓存；`issues.js` 处置审计 `authorRole` 由写死 `'secretary'` 改取真实角色（`_currentRole()`），API 同步门改单一源 `SECRETARY_ROLES`；`feedback-tab` 三处评论/批复/答复取消 `'u_sec'` 兜底并补未登录守卫；日历活动 `createdBy` 去 `'u_sec'`；`resolution-followup.js`/`resolution-followup-manager.js`/`help.html` 销项文案「书记」→「书记/副书记」（副书同权），`vote-summary-panel.js` 过期注释同步。**⑥ 防回潮机制（新）**：新增静态哨兵 `server/test/ux-guard.test.mjs`（5 项）——① 用户可见文案黑名单（KPI／以此计量／完成率，扫描前剥离注释含 CRLF 与 HTML 注释）；② 落款/销项主语不得写死「书记」（否定后顾避开「副书记销项」）；③ 反馈指派与「我的处置」不得含占位 ID（`'u_*'`）；④ 通知消费端 `list()` 必须含 `audience.includes`/`actionRoles.includes`/`audience==='committee'`；⑤ R-23 哨兵（`thought_reports` 表 + `authorize` 按表复算）。**⑦ 验证**：定向 `module-load`+`issue-anonymity`+`thought-review`+`permission-gate` **22/22**、`ux-guard` **5/5**、`snapshot`/`db` **6/6**；bump 后全量 `npm test` **482 用例 481/482**——唯一失败＝`multi-user-write`「跨集合并发写」，**单独复跑 2/2 全过**（与批次 13/14/17 同类：串行满负荷下浏览器时序抖动），**据实留痕、不假绿**。**⑧ 真机串行 dogfood（7 项，单代理顺序执行，未并行）全 PASS**：① 书记概况正文与全部 `[title]` tooltip 无 KPI/完成率（指标实测「20 待归档材料（条）」）；② 书记触发「复盘待提交」催办后**铃铛未读 3→3 不增**，铃铛列表无催办条目（数据佐证本次催办 `actionRoles=['leader']` 与 `['org-commissioner']`，不含 secretary）；③ 反馈详情「指派」目标显示 `书记处置（储子禾）/组织委员（高翔宇）…` 真实姓名，DOM 无 `u_org`/`u_leader`；④ 组织委员「我的处置」显示「指派给我的反馈 · 1」（#2 支委会纪要模板）；⑤ 普通成员提交思想汇报后**自己铃铛不出现**该通知（新通知 `audience=['org-commissioner']` 被正确过滤）；⑥ 纪检铃铛亦无该通知；⑦ 组织委员铃铛**可见**该通知且落点 `workspace/org.html?tab=thought-review&highlight=tr_…` 点击生效；全程应用自身 Error 级异常 0 条。**⑨ 走查副产（新登记 R-24）**：API 模式反馈链路两处失同步——书记台「反馈管理」读服务端 `issues` 表（空）→ 0 条，而公开「意见反馈」页读本地源 → 4 条；API 模式草稿「通过」提示成功但列表仍 0 条（只写本地缓存后被服务端数据覆盖）；另注：走查中 2 条 2026-09-12 历史「思想汇报已提交」通知无 `audience` 字段（早于本轮 R-23 改动），为浏览器本地残留演示数据，`?reset=1` 即清，非代码缺陷。**版本串** `?v=20260912j` → **20260912k**；CODE_VERSION **130 → 131**。
- **追加批次 19（2026-09-13 续批·八项实报 + 「以小见大」全局检查 + content 自检）**：**来源**——支书八项实报：① 不理解为何有「专班待议」单独卡片（**过拟合**：三会一课是规范表达、专班是本支部特例）；② 月份选择器 `2026-09` 与日历「2026 年七月」并存（组件不同源）；③「所有问题都是管中窥豹，要思考背后并做全局检查」；④ 称呼全局改「支书／副支书」；⑤ 支部分工完成度不高（勾功能模块≠组织实际配置；要「线上调整→信息与任务自动传递」；党委与支部都要有；**工作程序 vs 工作方法**）；⑥ 滞留党员复核毫无操作性、作用是什么；⑦ 同 tab 控件高矮/字号不统一；⑧ 解决 R-24；＋「很久没让你思考 content 部分是否有缺漏」。**① 称呼全局改（最大机械改）**：支书 AskUserQuestion 定「全仓一律改」＋确认两处例外 → 一次性脚本按序替换（党支部书记→支书／党支部副书记→副支书／支部书记→支书／支部副书记→副支书／副书记→副支书／书记→支书），覆盖 `docs`（含 help.html 275 处）、`server`（含测试断言与种子）、`content`（不含上位法规/合规原文）、`.ctx`（不含 `logs` 历史日志）、根 `*.md`；约 3000 处、382 文件；产物 `支部支书/党委支书/副副支书` 零命中（脚本已删，无流程文件残留）。**② 月份口径同源**：`activity-panel.js` 改为「以 `state.displayMonth` 为权威传参给 `populateMonthSelector` → 用其返回值回写 state → 同一 month 渲染」（支书台 2026-08-08 已按此修，首页漏）；`activity-view.js` 选择器加「该月不在选项内即回落当月/最新月」并让选择器与日历共用同一 month。**③ 版本戳失同步根治（以小见大，高价值）**：全量清点 `?v=` 发现 13 处**副作用导入**（`import '../modules/capabilities/x.js?v=20260909e'`，无 `from`）＋ `about.html/about.css`（`20260828l`）＋ `branch-module-catalog.test.mjs` 的 `const V` 停在旧戳 → 浏览器按 URL **分裂第二模块实例**（注册表/共享状态读空，与历史 m4 误报同根因）；`bump-version.mjs` 补四类规则（① 副作用导入 ② 任意 `.css` 而非仅 styles.css ③ CSS `url(...)?v=` 资源 ④ test 内版本字面量）＋新增 CSS 资源戳计数输出，随后两次 bump 全量重戳（1589 处 → `20260913b/c`，实测 `20260913c:1589`，无残留）。**④ R-24 闭环**：`server/seed.js` 新增反馈域基线种子（以 `docs/data/issues.json` 为**内容单一源**，脱敏 `submittedBy='匿名'`/`anonymous=true`/`participants=[]`/不写 tokenHash、保留 assignee/assigneeRole/dispatchHistory/comments/reactions）→ API 模式支书台「反馈管理」与公开反馈页同见 4 条（HTTP 实测 `count=4`、`assignee=p11/p1/p12` 保留；注：种子仅**首启空库**导入，与既有各类种子同口径）；`issues.js::approveDraft` 在 API 模式改落服务端（`getAdapter().issues.create`，服务端生成 id/number）；`issue-detail.js` 缓存键漂移修正（原写死 `gsm1921-issue-cache`，与 `CACHE_KEY` 不同键 → 评论写回后刷新即丢；新增单一源导出 `ISSUE_CACHE_KEY`）。**⑤ 专班待议卡撤销（过拟合）**：删除支书待办页 `_extraTopHtml` 内的「专班待议（支委会）」独立顶卡（原**无条件渲染**、无数据也占位「暂无待议专班」）→ 新增实时聚合组 `_committeeTfAgg()`（`secretary:tf-committee-requests`，`domain=WORK_DOMAIN.TASKFORCE`，**有报送才成组**）＋ 详情渲染 `renderCommitteeTfDetail()`（复用 `_committeeTfRowHtml`），动作「排入支委会表决／查看表决结果并生效」由 `bindCommitteeTfEvents` 在详情内绑定。**⑥ 控件尺寸统一**：`workforce-panel.js`（模块/负责人下拉、日期、说明 4 处）与 `resolution-followup-manager.js`（3 处）的自制 Tailwind 控件归入 `input-flat text-xs`；清无效类 `input-flat text-xs py-1.5`（query-view 3 / talent 3 / roster 1）；`input-flat text-[11px]`（roster、inspector）→ `text-xs`；`todo-tab` 退回原因 textarea 去掉与 `input-flat` 双写的 Tailwind 边框/圆角；新增 `.cs-group-label`（分组标题样式）与日期类控件 `height:34px`、`#wf-form-zone` 触发器 34px；`COMPONENT_SPEC §4.3` 校正（原写「40px/36px、padding 10px 14px」与实现 42/34 不符）＋新增「尺寸/字号单一源」五条禁令；`REVIEW_QUEUE.md` 新增「表单控件尺寸与字号统一」判据（原「组件风格统一」只覆盖卡片容器＝规范空档）。**⑦ 支部分工（分层 + 自动传递 + 双端编排，支书④⑤裁定）**：`work-map.js` 每模块加 `tier`（`norm` 工作程序/规范 8 项＝必办须有人；`method` 工作方法 3 项＝支部自选可停用/可复用）＋导出 `WORK_MAP_TIER_LABELS/tierOfModule/canDisableModule/isDisabledAssign/WORK_MAP_DISABLED`；停用表示 `{ownerType:'none',ownerId:''}`，`mergeWorkforceSnapshot` 与 `sanitizeConfigWorkforce` **双双只放行方法类**（规范类落库前拦掉）；面板模块下拉按层 optgroup 分组＋负责人下拉加「不开展（仅方法类可用）」＋误设停用时提示；`workforce.js::ownerDisplay` 支持 none 显示「不开展（停用）」、`createWorkforceProposalActivity` 接受方法类停用；**自动传递**＝新增 `_deriveDutyTodos()`（采纳后按本次实际改派逐条 `TodoStore.createBatch` 派生「履职」待办：到人→`personId`／角色→`role`，`domain` 按模块映射 9 域，`sourceId=<activityId>:<moduleId>` 幂等），通知 `workforce-proposal-adopted` 由**服务端** `server/system-notice-kinds.js` 新增 `build(ctx)` 按活动 `extras.proposal` **复算** `actionRoles/actionable/actionTask`（模板同步支持字段透传）；**双端编排**＝党委台「支部配置→换组织向导③角色分工」已有入口，`party-config-tab.js` 补双端说明，`BRANCH_WORK_MAP.md` §一/§三/§六 补分层与自动传递论述并**修订**原「党委台不提供分工编排」YAGNI 条（按本次裁定）；`work-map.test.mjs` 新增「分层与停用」用例（tier 枚举 / 方法类停用生效 / 规范类停用被拦 / 净化丢弃规范类 none）。**⑧ 真机走查（串行，三轮）当场发现并修复 3 处真实缺陷**：（a）**高**——`workforce-panel.js` 无草稿时 `#wf-del-draft` 为 `null` 却无条件 `addEventListener` → 抛 `TypeError` **中断后续绑定**，使「存草稿／直接发起支委会议题」**全部静默失效**（实测点存草稿无提示、草稿键未写入）→ 改可选链 `?.`；（b）**中**——`custom-select.js` 用 `Array.from(sel.options)` **拉平丢弃 optgroup** → 分层分组在增强下拉里完全不可见（数据层有、渲染层丢）→ 改为遍历 `sel.children` 渲染 `.cs-group-label` 分组标题；（c）**中**——`workforce-panel.js` **10 处 `showToast` 参数写反**（`(message, type)`，签名是 `(type, message)`）→ 提示只显示 `warn`/`success`/`undefined` → 全部改为 `(type, message)`；`ux-guard.test.mjs` 哨兵由 5 项增至 **6 项**（新增「showToast 调用约定」静态扫描，防同类回潮）。**⑨ content 自检**：`docs/src/workflow/blocks/manifests.js` 两处 `sopRef` 指向**不存在的文件**（`content/02_institution/sop/theme_party_day.md`、`.../taskforce.md`，**制度溯源断链**）→ repoint 到真实制度文件（`常见工作场景快速指南.md` / `组织委员工作流程指南.md`）＋留痕注释。**验证**：定向 `ux-guard + work-map + workforce-gate + module-load` **25/25**；**全量 484 用例 484/484 全过**（本轮此前的中间态曾出现 483 中 1 项 `issue-anonymity` mock 形态失败，**单独复跑 6/6 全过**＝满负荷时序抖动，已在最终态全绿）；真机**串行** dogfood 三轮（初查 7 项 / 修复复核 5 项 / 终态 4 项，**单代理逐项执行、未并行**）——终态实测：月份选择器与日历标题三组一致（`2026-09↔九月`、`2026-07↔七月`）、Toast 为可读中文（「请至少填写一行（模块与新负责人）」「草稿已保存」）、下拉分组标题「工作程序·规范」「工作方法·支部自选」「支委角色」「具体成员（到人）」「不开展（仅方法类可用）」齐全、4 控件同高 `34px/12px`、日期控件 `34px`、待办顶部无「专班待议」卡与空态、反馈管理 4 条且指派显示真实姓名（`组织委员（高翔宇）` 等）；应用自身 Error 级报错 0 条。**新登记 R-25**（卡片过拟合/欠拟合全局复审）/ **R-26**（UTC vs 本地日期口径混用待统一）/ **R-27**（控件尺寸，已闭环）/ **R-28**（滞留复核卡定位，**待支书裁定**）/ **R-29**（分工④：信息传递仍只到提醒＋入口）。**版本串** `?v=20260912k` → **20260913a → 20260913b → 20260913c**；CODE_VERSION **131 → 133**。
- **追加批次 20（2026-09-13 续批·全局卡片过拟合清理 + 欠拟合登记 + 滞留卡裁定 + 分工「信息自动传递」补全）**：**来源**——延续批次 19「以小见大」：支书问「滞留党员复核的作用是什么」并重申要做全局检查；并给出两项裁定（AskUserQuestion）：「滞留复核卡**删除卡、降为统计行**」「党费收缴**暂不纳入、仅登记缺口**」。**① 卡片过拟合全局清理（同一判据落地 5 处）**：先用 `search` 代理做**全工作台卡片级审计**（7 台 + 首页 + 党委台，逐卡输出「数据来源/规范 or 自创/写动作/空态是否恒占位/可配置性」），据审计结果按判据清理——（a）首页「活跃专班」统计卡 `dashboard/stats.js`：原无条件渲染（无专班的支部永远显示「0 个」）→ 改为**仅在确有 active/recruiting 专班时出现**；（b）首页「专班进展」卡（`index.html` 新增 `id="dashboard-taskforce-card"` + `dashboard/taskforce-list.js` 空态改 `hidden`+清空）与（c）首页「活动风采」卡（`id="dashboard-gallery-card"` + `dashboard/gallery.js` 同法）→ **无内容整卡不出**（含标题与入口），不再显示「暂无活跃专班/暂无风采展示」；（d）组织台专班看板 `org/taskforce-tab.js`：原三桶恒渲染、空桶显「暂无…专班」并撑 `min-h-[120px]` → 改为 `BUCKETS.filter(b => b.list.length > 0)`**只渲染有内容的分桶**、列数随桶数自适应，全空时给单条说明行；（e）加批 19 撤销的支书待办顶卡「专班待议」。统一判据：**支部自创工作（`workflow/blocks/manifests.js` `provenance='branch-custom'`／`core/work-map.js` `tier='method'`）不得占首页或 tab 顶部固定槽位、无数据不得常驻空卡**。**② 欠拟合审计与显式登记**：审计产出「规范类工作界面承载不足」清单——三会一课无按子会分列视图；民主评议党员/换届选举缺流程明细；**党费收缴零承载**（全库无「党费」字样）；制度无版本台账；发展党员缺培养联系人（到人）→ 落 `content/04_web_design/evolution/BRANCH_WORK_MAP.md` 新增「**过拟合 / 欠拟合清单**」节（含 5 处过拟合的前后对照 + 9 项规范类承载现状表 + 判据）；`core/work-map.js` 的 `democratic-review`/`election` desc 补「承载＝活动命名表达 / 任命机制+票决」说明（**不新增活动子类**——沿用「组织生活会＝内容是命名表达、不进子类 chips/写入表单」既有裁定，避免与 `scene-write-sync` 的「四子会逐序一致」契约冲突）；支书裁定党费收缴暂不纳入（不建占位模块）。**③ R-28 滞留复核卡（裁定「删除卡、降为统计行」）**：`secretary/overview-tab.js` 删除 `_renderDetainedReviewCard`（54 行）及其调用；信息降为两处**非卡**呈现——指标条新增一行「会议应到 N 人（title＝在册党员 − 滞留剔除）」，其下内联一行「滞留 N 人已从会议应到剔除（身份保留·通知照发·表决快照剔除）——维护在组织委员「成员名册」去查看→」+ 党员结构迷你条（原并入卡内的「发展阶段分布」不丢）；导入同步收窄（去 `getDetainedMembers`/`getResidenceOf` 未用导入）；写动作仍在「组织委员名册 → 支书成员变更确认」链、学期末待办提醒保留。**④ 分工「信息自动传递」补信息侧**：`services/notice.js` 受众门重构——新增 **`audiencePersons`（personId 数组，按人定向）**，并把原 `if/return` 短路改为**多受众并存命中**（原实现下 `audience==='committee'` 会吞掉 `audiencePersons`/`actionRoles`，这是新能力落地前的隐藏缺陷）；`server/system-notice-kinds.js` 的 `workforce-proposal-adopted.build` 增加 `audiencePersons`（到人负责人去重）并固定 `audience:'committee'`；模板 `system-notice-templates.js` 同步透传 `audience/audiencePersons`；`content/04_web_design/data/DATA_MODEL.md` 的 `workforce` 字段行补 `ownerType:'none'`（方法类停用，规范化/合并双拦）与「采纳后派生履职待办 + 按 proposal 复算通知受众」说明。**⑤ 判据与哨兵**：`REVIEW_QUEUE.md` 新增「**卡片过拟合/欠拟合判据**」（过拟合＝支部自创项占固定槽位或空数据常驻空卡；欠拟合＝规范类承载不足须显式登记、**禁用占位卡/占位模块充数**；待裁定项走 AskUserQuestion 不擅自增模块）；`ux-guard.test.mjs` 第 ④ 项哨兵扩展为「须含 `audiencePersons` 且多受众并存命中」。**⑥ 新增服务端用例**：`permission-gate.test.mjs` 增「分工自动传递」用例——造一条带 `extras.proposal`（一个到人 p3 + 一个角色 leader）的支委会活动 → POST `/api/v1/system-notices`（**payload 故意伪造 `audiencePersons:['伪造']`/`actionRoles:['伪造']`**）→ 断言 201 且 `audience==='committee'`、`audiencePersons===['p3']`、`actionRoles===['leader']`、`actionable===true`、落点 `workspace/secretary.html?tab=work-map`——**证明服务端覆盖客户端自述**（R-22 原则）。**验证**：定向 `ux-guard + work-map + workforce-gate + permission-gate + module-load + scene-write-sync` **37/37**；**全量 485 用例 485/485 全过**；真机**串行** dogfood 第 4 轮 5 项全 PASS——首页统计卡 4 张齐全（「活跃专班 4 个」＝库中 `active 2 + recruiting 2` 应出现，非误伤；`暂无活跃专班/暂无风采展示/暂无待支委会表决专班/暂无招募中专班/暂无运行中专班/暂无待议专班` **六项空态文案零命中**）、组织台专班看板只现「招募中 (2) / 运行中 (2) / 已完结 (4)」且**无任何 0 计数分桶**（空桶路径实证）、支书待办顶部仅「待答复」、分工面板两组分层与「不开展（仅方法类可用）」无回归、应用自身 Error 级 **0 条**。**版本串** `?v=20260913c` → **20260913d → 20260913e**；CODE_VERSION **133 → 135**。

