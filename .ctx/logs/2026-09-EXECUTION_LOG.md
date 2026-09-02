---
title: "2026年9月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-09-01"
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
