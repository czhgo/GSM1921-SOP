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
