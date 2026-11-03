---
title: "工程化评估与改造行动线"
type: audit_report
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-11-03"
status: active
related_files: [content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md, content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md, content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md, content/04_web_design/module/SOP_WEBSITE_GUIDE.md, content/04_web_design/deploy/DEPLOYMENT_GUIDE.md, .ctx/REVIEW_QUEUE.md, CLAUDE.md, content/03_doc_system/DOC_MAP.md, content/insights/README.md, content/insights/工程与AI协作的全栈实践.md, server/README.md, docs/help.html]
---

# 工程化评估与改造行动线

> **定位**：本文档为项目当前工程评估与复盘的唯一口径：六个工程维度、七个月复盘、业务/数据/权限阻断风险、工程做法纪律与改进顺序。打分用于暴露短板，不把不同风险平均成一个总数。
> **维护纪律（本文件自述即判据）**：**覆盖式维护、不逐轮留历史行**——本文件只写「**当前值 / 当前残项 / 当前纪律**」，**逐批「做了什么、为什么 +1」一律进 `.ctx/logs/**`**（沿革单一源）。⚠ 2026-09-29 批次 266 据此做了一次**瘦身**：此前 §一 速览行内 / 综合行 / §二 各维标题 / §四 各行动行内累积的**逐批论证链**已删除（同批已核：其内容在月度日志逐批段与「附：工程化评估逐批沿革」节内均已有），**只留当前值与指针**；再犯即属违规。
> **受众**：[工程师]+[AI]（架构维护者）+ 支书（方向裁决人）
> **关联**：`content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md`（组件化/插件化演进母文档，评估正文已压为其 §二 历史结论段）、`content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md`（L3 工作流块契约）、`content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md`（两级治理设计）、`.ctx/REVIEW_QUEUE.md`（全局评估总表，本文件一行）。
> **职能（2026-09-17 立，规范见 [OPERATIONS_GUIDE §5.1](../content/03_doc_system/OPERATIONS_GUIDE.md)）**
> **回答什么问题**：「**当前工程短板在哪里、什么是真返工、先改哪条边界**」——业务与数据、安全与权限、最小三成本体验（含前端与交互）、测试发布、架构与可维护性、运行部署六维证据；以及复盘结论与当前行动。
> **不回答什么**：① **哪一批做了什么**（沿革与逐批论证）→ `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **规则与守卫的判据细节** → `CLAUDE.md`（R 表）与 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2`（规则→守卫→状态索引）；③ **测试清单与运行方式** → `README.md` / `server/README.md`；④ **系统当前长什么样**（目录树 / 表数 / 页面数）→ `.ctx/SNAPSHOT.md`；⑤ **文档职责与导航** → `content/03_doc_system/DOC_MAP.md`。
> **谁什么时候读**：`[工程师]+[AI]`；**每次决定「下一批做什么」之前必读**；支书问工程化进展或方向时读。按需（on-demand）。

---

## 一、当前评分与结论

> 评分只表达当前证据下的成熟度，不作六维平均。高风险单独列出；同一系统可在本地单支部场景很好用，却仍不适合多支部共享部署。

| 维度 | 得分 | 证据、风险与未完成项 |
|------|------|---------------------|
| 业务与数据正确性 | **79 / 100** | 45 页签全量审计的 D1 读口全部 2xx / JSON 可解析 / ≤500KB；D2 计数对账一致；C2 在 `:memory:` 临时库完成 CRUD 往返。本轮换轨演练发现并修正契约漂移（`notices.reads` 由 required 改 optional），副本库 **48 表 / 577 行** export → dry-run → apply 逐表行数与 sha256 一致。残项：SQLite 仍以 JSON 宽行存储，跨表关联无数据库外键；票决名单由活动写入方固化；F6 两处启发式已人工确认（非空态）。**78 → 79（+1）**：补的是「契约与真实库一致」的可验证证据，不改业务规则。 |
| 安全与权限 | **66 / 100** | `write-policy-matrix` 覆盖 **141 条**写路由（135 enforced / 4 self-service / 2 public / **0 known-risk**），守卫断言运行期路由 ≡ 矩阵；C1 改为矩阵判定 + 高风险抽样。修复 6 条真实缺口（考勤删除、活动/专班子记录、issue-unread、快照聚合清空、快照考勤清空）；`SESSION_TTL_HOURS` 缺省 3 小时；production 多支部拒绝启动；`npm run start:review` 隔离演示库。残项：共享口令、多支部服务端读过滤（设计已出、未实现）、issue-unread 派发位未强校验 assignee。**52 → 66（+14）**：补的是「每个写口都有可复查判据 + 会话过期 + 快照 P0」，不等于多支部隔离已完成。 |
| 最小三成本体验（含前端与交互） | **68 / 100** | 45 页签审计资产复跑：**P0 0 / P1 0 / P2 2 / exception 44**；F1–F8 全绿；M1–M3 与 4 个「独立对象池」例外在位。P2 两处经人工确认均非空态（页签分组提示 / 指标占位），F6 探针已识别表格空态变体。残项：41 个页签仅登记未重构；尚无按常见任务的用户实测。维持原分——审计读数改善不等于三成本实质下降。 |
| 测试与发布质量 | **83 / 100** | `workbench-audit-coverage::W1–W5` 常驻；新增 `write-policy-matrix`（路由 ≡ 矩阵 + 反例）、`write-policy-gaps`（6 条缺口）、`security-redteam`（快照 P0）、`session-ttl`、`run-mode`，全部进 daily 并登记 tier；最终审计 P0 0 / P1 0。残项：审计脚本仍不进 daily；precommit / full 时长仍是发布风险；守卫证明形态不等于业务输出正确。**80 → 83（+3）**：补的是「权限矩阵/红队/会话/运行档」的可复跑覆盖。 |
| 架构与可维护性（原「架构复杂度与变更成本」） | **76 / 100** | 审计分层沿用；新增 `write-policy-matrix` 作为写权限唯一机读源，审计 C1 与 README 同源；多支部同实例设计稿落到 `ARCHITECTURE_EVOLUTION §十`（四阶段）。成本与残项：catalog / matrix / baseline 须同批维护；双数据适配器、活动内嵌数据、静态版本戳与行号守卫仍抬高跨层变更成本。**74 → 76（+2）**：补的是「权限判据单源化」，但新增一处同批维护点。 |
| 运行、部署与跨组织复用 | **73 / 100** | 换轨闭环实测：副本库 **48 表 / 577 行**一致；生产空库首启补 6 角色账号后 `preflight-cutover --strict` **exit 0 / 警告 0**；`user_version` 拒绝降级；迁移前备份；`start:review` 隔离演示库；production 单支部断言。残项：`install.sh` / `install.ps1` / `update.sh` 未在 Linux 真机验证（L-02 降级）；附件 / 会话按 runbook 另搬；多支部读过滤未实现。**68 → 73（+5）**：补的是「可演练 + 可拒绝 + 可隔离」，不掩盖真机部署未验证。 |

### 评分锚点

- **90–100**：关键路径有单一事实源和服务端约束，自动测试覆盖主要失败形态，部署边界清晰且已验证。
- **75–89**：主流程成熟且有自动检查，仍存在可定位的高成本残项或低频风险。
- **60–74**：核心能力可用，但重要边界依赖部署约束、人工流程或跨层同步。
- **40–59**：有明确的生产权限/数据风险，或关键规则尚不能由权威写口独立保证。
- **0–39**：无法稳定运行、验证或安全维护。

### 阻断级风险

> **本轮复核（2026-11-03 上线专项）**：逐条标注「保留 / 部分闭环 / 闭环 / 新增」，闭环必须给证据。结论：第 2 条部分闭环（矩阵 141 行、0 known-risk、6 条缺口已修）；第 4 条的会话过期已闭环（3 小时），共享口令保留；第 1、3、5 条保留。

1. **多支部共用一个服务实例会跨支部读出数据。** **保留**。服务器读面仍未统一按支部过滤；production 档已硬拦多支部启动，设计稿见 `ARCHITECTURE_EVOLUTION §十`（Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH`）。
2. **多数通用写口只验证登录。** **部分闭环**。权限矩阵 141 行覆盖全部写路由，`known-risk` 清零；考勤删除、活动/专班子记录、issue-unread、快照聚合/考勤清空 6 条缺口已补服务端判据；`signups` 等专用 guard 已按真实行为登记。残项：共享口令、多支部读过滤、issue-unread 派发位未强校验 `assignee`。
3. **表决选民名单来自活动数据本身。** **保留**。创建/修改活动的服务端没有按场景从 users 和组织归属重算 `voteConfig.voterIds`；C2 只验证既有写口往返，不覆盖名单重算。
4. **共用口令只适合受控部署。** **部分闭环**。会话已按 `SESSION_TTL_HOURS`（缺省 3 小时）过期；共享口令仍在，生产用 systemd 注入强口令并定期更换。
5. **SQLite JSON 宽表是规模边界。** **保留**。本轮无 schema / 索引改动。

依据见 server/README.md「部署前必知限制」、server/.env.example、server/routes/committee.js 的票决授权注释及 server/routes/resources/index.js 的资源写口。上述边界不靠提升分数抵消。

### 旧评分（仅留历史，不参与本轮比较）

截至 2026-09-29 的旧五维曾记为：模块化 99、插件化 76、开源化 81、可调性 86、组合能力 83/85。旧文件内部的组合分存在 83 与 85 两值冲突；旧均值行又把可调性写成 87，并标“≈85”，所以不作为当前基线。本轮取消总分，避免把不同性质的风险平均掉。

---

## 二、六维评分依据

### 2.1 业务与数据正确性 —— 79/100

**得分依据**：45 页签全量审计的 D1 读口全部 2xx、JSON 可解析、响应 ≤500KB；D2 计数对账一致（`org.roster` 50 = 50、`secretary.group-progress` 3 = 3、`party-committee.branches` 1 = 1）；C2 在 `:memory:` 临时库对非破坏性写口完成 create → 回读 → PATCH → 校验 → DELETE。既有活动报名去重、匿名票事务、活动删除级联与 DB 迁移 / 备份恢复测试仍有效（`server/test/workforce-gate.test.mjs`、`agenda-votes.test.mjs`、`report-count.test.mjs`、`db-integrity-guard.test.mjs`）。

**残项**：业务实体仍主要保存为 JSON 宽行；数据库不能替业务校验跨表引用或自动级联。表决名单服务端复算未闭合，见阻断风险 3。F6 两处启发式已确认非空态（页签提示 / 指标占位）。

**本轮结论**：换轨演练发现 `notices.reads` 契约漂移并修正；副本库 48 表 / 577 行往返一致。**78 → 79（+1）**。

### 2.2 安全与权限 —— 66/100

**得分依据**：`server/security/write-policy-matrix.mjs` 登记 **141 条**写路由，`known-risk` 清零；守卫断言 Express 运行期写路由 ≡ 矩阵，并用反例自证。C1 改为矩阵判定 + 高风险抽样。本轮修复 6 条真实缺口（考勤删除、活动/专班子记录、issue-unread、快照聚合清空、快照考勤清空）；`SESSION_TTL_HOURS` 缺省 3 小时；production 多支部拒绝启动；`npm run start:review` 隔离演示库；`security-redteam` 5 条回归常驻。

**失分依据与残项**：共享口令；多支部服务端读过滤仅出设计（`ARCHITECTURE_EVOLUTION §十`）；`issue-unread` 派发位未强校验 `assignee`；`voteConfig.voterIds` 仍由客户端写入。

**本轮结论**：**52 → 66（+14）**。补的是「每个写口有可复查判据 + 会话过期 + 快照 P0」；多支部隔离仍未完成，故不到 70。

### 2.3 最小三成本体验（含前端与交互） —— 68/100

**得分依据**：45 页签审计复跑 **P0 0 / P1 0 / P2 2 / exception 44**；F1–F8 全绿；M1–M3 与 4 个「独立对象池」例外在位；F6 探针已识别 `empty-state` 表格变体。

**残项**：P2 两处均非空态（页签提示 / 指标占位）；41 个页签仅登记未重构；尚无按常见任务的用户实测。审计读数改善不等于三成本实质下降。

**本轮结论**：维持 **68**；不因审计工具或探针修正加分。

### 2.4 架构与可维护性（原「架构复杂度与变更成本」） —— 76/100

**得分依据**：审计分层沿用；新增 `write-policy-matrix` 作为写权限唯一机读源，审计 C1、README 与守卫同源；多支部同实例设计稿落到 `ARCHITECTURE_EVOLUTION §十`（请求级支部上下文 / 四阶段）。

**成本与残项**：catalog / matrix / baseline 须同批维护；mock 与 API 双形态、活动内嵌数据、版本戳与行号守卫仍抬高跨层变更成本。

**本轮结论**：**74 → 76（+2）**。补的是权限判据单源化，但新增一处同批维护点。

### 2.5 测试与发布质量 —— 83/100

**得分依据**：`workbench-audit-coverage::W1–W5` 常驻；新增 `write-policy-matrix`（路由 ≡ 矩阵 + 反例）、`write-policy-gaps`（6 条缺口）、`security-redteam`（快照 P0）、`session-ttl`、`run-mode`，全部进 daily 并登记 tier；最终审计 P0 0 / P1 0。

**失分与残项**：审计脚本仍不进 daily；precommit / full 时长仍是发布风险；守卫证明形态不等价于业务输出正确。

**本轮结论**：**80 → 83（+3）**。补的是权限矩阵 / 红队 / 会话 / 运行档的可复跑覆盖。

### 2.6 运行、部署与跨组织复用 —— 73/100

**得分依据**：副本库 **48 表 / 577 行** export → dry-run → apply 一致；生产空库首启补 6 角色账号后 `preflight-cutover --strict` **exit 0 / 警告 0**；`user_version` 拒绝降级；迁移前备份；`start:review` 隔离演示库；production 单支部断言。

**残项**：`install.sh` / `install.ps1` / `update.sh` 未在 Linux 真机验证（L-02 降级为 post-launch）；附件 / 会话按 runbook 另搬；多支部读过滤未实现；无业务字段索引只适用于现有规模。

**本轮结论**：**68 → 73（+5）**。补的是「可演练 + 可拒绝 + 可隔离」，不掩盖真机部署未验证。

### 2.7 七个月工程复盘：哪些是正常演进，哪些是真返工

Git 从 2026-03-14 至 2026-10-14 共 1,133 条提交记录；按提交日期分布为 3 月 80、4 月 8、5 月 14、6 月 1、7 月 81、8 月 250、9 月 544、10 月 155。提交是多批次的小步记录，并夹有守卫、文档和收尾动作；单看数量不能当作低效结论。

| 类别 | 可复核记录 | 复盘判断 |
|------|-----------|-----------|
| 功能开发 | 1b2287c57/122750ce0：成员自我描述从字段模型、表单到 CSV 导入分批落地；f1ba12c3b：先做 72 个工作台页签轴线体检 | 多阶段交付属于功能落地，不是自动等于重复建设。先把用户路径和数据契约落盘能减少后续跨台返工。 |
| 缺陷修复 | 9dad8cd9c：复现 tab 加载失败并修根因，补 page-sweep 守卫；本轮匿名票汇总缺口也由反例暴露 | 真机验证不可被静态守卫替代；纯粹主路径测试不足以证明数据口径正确。 |
| 真实重复/返工 | 3485f817b：批次 376 清理时误带走 8 条未结项，批次 385 回捞并新增 R-93；5da3b0da2：批次 381 重复评议已评过的章节后自纠；f4e52625e：批次 403 文档编辑因可搬项为 0 全部还原 | 这是有明确成本的返工，根因分别是清理没有逐条核对未结项、启动评议前未查历史结论、需求/执行边界判断晚于编辑。通过先对账、先裁决可减少同类回滚。 |
| 文档治理 | 2248e70e4：清理已收口节并压缩评议材料；e1180dce0：压缩执行日志但保留判据与状态 | 文档作为工程资产是必要的；反复维护镜像、行号和沿革会形成真实成本。DOC_MAP/insights 和权威规范需各自只答一类问题。 |
| 版本维护 | f30153c93：静态宣传形态批次同时处理版本戳与页面回归 | 全树版本戳是浏览器模块实例隔离机制，非任意重复工作；但每次大批量改戳都扩大 diff 和全量验证成本，能否改为构建期内容哈希值得另案评估。 |
| 测试基建 | bd5d901f1：按分片把测试压入 10 分钟；批次 375/386/420 增加页签对账、加载回归和人员读口的守卫 | 测试投资降低漏改风险；测试矩阵和守卫本身也须控制维护成本，防止“为一个检查维护两三份清单”。 |

**七个月后的解释**：主要成本不应归因于个人没有全栈名词。项目从静态流程工具持续长成“制度 + 多角色界面 + API + SQLite + 部署模板”，业务边界在使用中不断澄清；早期缺少一张跨角色用户路径、权威数据源、服务端写口与授权边界图，导致不少规则先分散落地、之后再抽成单一源和守卫。另一个真实成本是审计文档/行号/版本戳与重复评议——这些治理手段提高可追溯性，但有过度维护的例子。后续应先定业务口径和边界，再选最小实现，最后加能验证业务结果的测试与必要守卫。

| 主流程 | 页面与用户入口 | 权威数据/写口 | 服务端/权限边界 | 收敛判断 |
|------|---------------|---------------|----------------|-----------|
| 活动与会议 | 支书台活动日历/创建 → 活动详情 → 议题、表态、考勤或复盘 | 活动主行 activities；报名 signups；表态 agenda_votes；活动关联记录各自有表 | 活动写有角色门；投票 API 按 activity.voteConfig.voterIds 校验，但名单还由活动写入方保存 | 活动主数据不拆成多份；读模型可以合并，相关子记录须保留独立生命周期并在删除时级联 |
| 活动项目角色 | 创建活动、指派组织者/深度参与者 | activity.assignments 内嵌项目角色 | 服务端活动写门 | 与 assignments 表里的任务分工不是同一数据，不因字段名相似而强行合并 |
| 人员与角色 | 党委/组织工作台名册、成员本人表单 | users 表；前端展示值经 person roster 读口解析 | 归属批准与角色操作有服务端角色门；通用资源写权限仍有待补齐 | 继续复用 person roster 和 userId，不另建并行姓名表 |
| 支部分工/制度参数 | 设置支部治理/支部分工提案 | branches.config 的模块、工作流块、分工与策略覆盖 | 提案票决复用 agenda_votes；配置变更有审计历史 | 规则计算复用同源函数；匿名/记名呈现适配不能各自重写票数口径 |
| 通知与反馈 | 各台通知收件/反馈入口 | notices 与 feedback/issue 数据域 | 部分通知按收件范围过滤；多数资源写口仍仅登录 | 收件逻辑同源优先；涉及私信和跨支部可见性的界限不可为简并而放宽 |
| Help 与说明 | help.html 左侧目录、章节、搜索结果、任务入口 | help.html 正文 + FUNCTION_CATALOG + help-navigation 元数据 | 静态公开阅读 | 章节目录、角色和任务入口共用目录元数据；正文与功能目录保留各自来源 |

### 简并机会与范围

- **已简并**：Help 左侧目录、右侧圆点目录、搜索章节来源统一读取 HELP_TOC_CHAPTERS；角色与常见任务入口在 HELP_BROWSE_ROLES/HELP_QUICK_TASKS 管理；分工与专班采用同一票决计算器。
- **可继续研究**：活动日历、创建/编辑和活动详情可围绕一个“活动”入口呈现，用任务与状态切换视图；不要求把它们的写 API、agenda_votes、signups、attendance 或档案表硬并成一个数据结构。
- **暂不合并**：七个角色工作台的岗位入口、不同会议的制度门槛、党小组/活动/专班的管理目的。先后续实测一台工作台的对象轴/动作轴混淆，再决定全站 IA；更改角色权限和制度流程须先做业务澄清。

### 本地数据库与测试库的选择

正常本地运行使用 server/data.db；SQLite 和 server/package.json 的依赖已随仓库提供。内存库用于纯逻辑之外的数据库/API测试，避免测试数据相互影响；固定端口浏览器测试应通过 DB_PATH 指向临时测试库。此前使用测试专库是保护日常数据的隔离措施，不是项目缺少数据库依赖。该库本轮未被测试写入（测试前基线 SHA-256：4B92CAEAEE61F19A6A745B8C7AC46805E2D10AF788EA7A7E129F04C315902FA0；需在本轮最终核对）。

---

## 三、工程做法与纪律

> 本节是**纪律与方法论**（长期有效，不是沿革）：3.1 出口扎口做法 · 3.2 数据域接线契约 · 3.3 去重审计证据（R1–R12） · 3.4 单一源 / 引擎化收敛台账（R13–R30 ＋ 可迁移要点 ①–⑫，**`content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 引本节的「理论口述版」**）。

### 3.1 统一扎口做法（本评估确立的第一个工程做法）

支书定调：**同一域可以有若干个函数（甚至若干个实现文件），但对外只暴露一个库文件；调用方一律 import 该库，不直接触碰内部实现。**

落地样板：`components/ui/forms.js`（表单域唯一出口）· `components/ui/badges.js`（徽章域）· `components/record/reporting.js`（汇报域）——三库建成后，组件平铺层「同域多文件」收敛（行动项 §四 P0·统一扎口）。同批回归：`module-load` + 相关 E2E 全绿，**零行为变化**。

**改造纪律（每次扎口必守）**：
1. 新增库**聚合重导出**，内部实现文件不搬运、不改名。
2. 调用方**只改 import 来源一行**；运行期零行为变化。
3. 每批扎口后跑 `module-load` + 受影响 E2E 回归。
4. **禁止双轨**：一旦建库，同域内新代码一律走库，存量直连同步收口。

### 3.2 数据域接线契约 v1（person 域试点确立）

**背景**：曾盘点出全站 68 处直连 `mock`；`data/mock/index.js` 实为「旧兼容中转」（person 函数早已落到 `services/member/person.js` 又被 re-export 回 mock）。债根 = **UI / 服务层 import 面挂在 `mock`，而非真正实现所在的 service**。**收官态 = UI 层（`entries` / `components` / `modules`）对 `mock` 的 import 直连清零**——全仓 `mock` 引用仅存于 `services/core` 数据层（种子接入点，契约允许）。**已达成**（逐批过程见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`；行动项 §四 P0·数据域接线）。

**契约条款（长期有效）**：
1. **人名与人员对象获取**（`getPersonById` / `getPersonName` / `PersonStore`）唯一出口 = `services/member/person.js`；**任何层禁止从 `mock/*` 获取人名**。
2. **成员名单**（PEOPLE 语义）唯一出口 = `PersonStore.getMembers()`；UI / tab / 组件层禁止直连 mock 种子数组；**种子数据仅许 service 层引用**。
3. **展示格式化函数**（`attendanceToLong` / `inspectionToLong` / `reviewToDisplay` 等）统一栖身各业务 domain service（`attendance` / `inspection` / `review`），随记录读写同域演进；**mock 数据模块不承载格式化逻辑**。
4. 新代码一律遵守 1~3；存量收口按批次推进，每批回归。

### 3.3 冗余 / 重复去重审计（R1–R12：证据与收敛去向）

> **定位**：支书 2026-09-03 要求「对多余、冗余、重复实现的代码高度批判性地思考并执行」。本表只收录**可证实（文件 + 行号）**的重复。**审计原则：先统一「同一业务事实的唯一出口」，再谈删代码——先扎口后去重，避免删完又长出第二份。**（逐批明细见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`）

| 组 | 重复事实 | **收敛去向（单一源；现状）** |
|----|---------|------------------|
| R1 | HTML 转义 `esc` 至少 10 个文件各写一份；`fmtDt` 双份 | ✅ `core/base/utils.js::escHtml` / `fmtDt` 唯一出口（各文件 import 别名 `esc`，调用面零改动） |
| R2 | 三会四子类清单三份；阶段枚举另见 `CANDIDATE_STAGES` 与各 seed | ✅ `MEETING_TYPES` → `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 派生；**2 项复核保留**（见下「复核保留」） |
| R3 | 产出块 id 消费端手写（write-tab 4 个 id / calendar-tab 手写 blockId） | ✅ → `OUTPUT_BLOCK_DEFS` / `THEME_PARTY_DAY_MANIFEST.blockId` 派生 |
| R4 | 活动场景 id + label + 颜色三处手写 | ✅ `constants.js::SCENARIO_WRITE_IDS` / `SCENARIO_LABELS` 派生（全集唯一源 = `sopData.js`）；守卫 `scene-write-sync` |
| R5 | 业务链路 flow 语义三写、无键集比对测试 | ✅ 新增 `catalog-sync::T2` 键集**双向**断言（任一侧增删即红） |
| R6 | tab id 散落导航侧、隐藏后静默 no-op | ✅ `core/boot/tab-nav.js` 纯决策 + `tab-bar` 守卫（隐藏 tab 回退首个可见 tab）；`tab-nav` 4 态测试 |
| R7 | 支部 config 净化规则 server / 前端各一份 | ✅ 共享纯模块 `services/branch/config-clean.js`，**server 严格口径单向权威**、两端同源引用 |
| R8 | 表决规则（optionSet 枚举 + 异议附言）跨层重复 | ✅ `OPTION_ENUMS` 单一源 + `catalog-sync::T4` 键集双向断言 |
| R9 | 支委 / 支书 / 党委组织员角色 `Set` ≥5 份 | ✅ `constants.js` 四常量单一源；守卫 `roles-sync` 4 断言 |
| R10 | 删除 / 归档级联 server 与前端同构实现 | **观察**（未列入去重队列） |
| R11 | 资源名 / ID 注册表两端各一 | **观察**（未列入去重队列） |
| R12 | 运行安全：server 登录不验密码、账号明文口令 | ✅ **出仓子项撤销**（见 §一 末注）＋ **运行安全项已修**（行动项 §四 P1b：可换 `LOGIN_PASSWORD`、生产未设启动即拒） |

> 反例（无需拆分，防过度去重）：block manifest 校验唯一源在前端 `manifests.js`（server 测试经浏览器复用同文件），职责与 R7 的「config 形状净化」不同——**勿误并**。

### 3.4 单一源 / 引擎化收敛台账（R13–R30；**可迁移要点 ①–⑫ 见本节末**）

> **定位**：3.3 处理「同一事实被抄了几份」；本台账处理**更高一层的同类病灶**——**能力与口径散落在调用点**（各写一份分页 / 各写一套矩阵 / 档位靠环境供给 / 组清单在加载期被物化成快照 / 说明文件里的数字与名称无人守）。判据与守卫一并登记。**三轮之别**：R13–R20「**收进引擎**」；R21–R25「**收口到底**」；**R26 起「把口径变成断言」**——不再依赖人记得同步。

| 组 | 病灶形态 | **收敛去向（单一源）** | 守卫 |
|----|---------|-----------------|------|
| R13 版本号推导三处各写 | `bump-version.mjs` 内联「当天日期 + a」、无参运行会把同日戳往回写；注释排除规则只在一处置信 | `docs/scripts/version-next.mjs` 纯函数单一源（`nextVersionFor` / `isForward` / `isCommentLine` + `codePartOf`）；**批次 236 扩为「版本与发版治理」单一源**（+ `nextSemver` / `isSemverForward` / `parseChangelog` / `classifyChanges`，供 `release.mjs` 与守卫共用） | `version-stamp.test.mjs` S1–S7 + D1–D11（含「全站活动戳取值集合规模为 1」与发版一致性 `S7`） |
| R14 分页散落 5 处、引擎无分页 | 全站分页只在 issue-list / query-view / archive-entry / 反馈 / 活动动态 各写一版；**统一检索引擎自身没有分页** → 其承载的 28 处按人 / 按活动表无分页 | `components/ui/list-filter.js` **引擎内置分页**（每页 10、页码并入 `stateKey`、筛选回第 1 页、页数 ≤1 不出控件），28 处一次受益 | `filter-row.test.mjs::S10` |
| R15 矩阵三处各自为政 + 列无上限 | 考勤矩阵 / 考察人视图 / 表决 `.vs-matrix` 各写一套；宽表列随项目无限增长 | `components/ui/relation-matrix.js`（`byPerson` / `byItem` 互为转置、项目维列上限 6 + 一键展开、横向滚动 + 首列吸附） | `relation-matrix.test.mjs` S1–S6 + 真机① |
| R16 组清单「派生化快照 / 种子枚举代跑」 | 模块顶层 `[...new Set(PEOPLE.map(p => p.partyGroup))]` 展开 Proxy 即冻结；运行时用 `PARTY_GROUP_OPTIONS` 净化导入与统计 | `services/member/party-group.js::groupOptions()`（活组实体唯一条出口） | `party-group.test.mjs` S1–S4 |
| R17 控件档位 / 表格 / 分页样式各写 | 表格表头 7 处各写一份；档位靠 UA 与 CDN 工具类供给（同表单实测 42 / 43 / 47 三值并存） | `docs/src/styles.css` 类族单一源（`.data-table` / `.lf-*` / `.page-btn` + `.page-num` + `.is-current`）；档位算式显式（单档 38px × 13px） | `filter-row.test.mjs` S1–S12 + D1–D2 |
| R18 选人载体口径过宽 | §4.13「禁止 select 列人名」与实现有 4 处口径差 | 规范改**语义两分**（选名单成员 → `PersonPicker`；任命 / 指派到人 → 允许下拉）+ 例外台账 | `filter-row.test.mjs::S9` |
| R19 同一业务动作两个写门 | 成员流动「流入登记」与「名册新增」在 API 形态角色门冲突 | `server/routes/member.js` **同一实现体 `createMemberRow` 挂两个写门** | `member-flow::S4`、`permission-gate` ⑤d/⑥/⑦、`member-persist` api ⑫ |
| R20 状态与载体失配（非闭环） | 多选后关面板即「已选」、逐人填写框从未出现；`destroy()` 成环（用例由 11 秒劣化为 17.6 分钟超时） | `person-picker.js` 多选**点选即回调 + 关面板再回调**、调用方**重建前保态**、**销毁前先摘回调** | `inspection-loop-e2e`、`ux-guard::⑦` |
| R21 分页「收进引擎」但未收口 | 绕过引擎、自己手写渲染的仍有 13 处以上 | 21 个文件接入 `renderFilteredList`；引擎补「**无关键词无分面则不渲染检索条**」；**分组结构一律每组一实例、只给分页、不推平** | `filter-row.test.mjs::S12` |
| R22 翻页标记仍散（且单一源位置会成环） | 仍有 6 处手写翻页控件；翻页标记若留在 `list-filter.js` 会与矩阵形成模块环 | 抽为**叶子件** `components/ui/pager.js::pagerHtml`，引擎与矩阵共用；6 处并轨后统一读 `data-lf-page` | `filter-row` S10 + **S11**（`page-btn` / `page-num` 只允许由 `pager.js` 产出） |
| R23 矩阵人维无上限 + 单一源吞语义 | R15 只封顶项目维；表态矩阵的「异议红底 / 未投灰字」若并入通用矩阵会被吞 | `relation-matrix.js` 补 `MATRIX_ROW_LIMIT = 10`（人维在行 / 列同一切片）、`cfg.rowLimit`；新增 `cfg.cellClass()` **挂载点**（单一源只给挂载点，不吞领域语义） | `relation-matrix` S1 + **S5** |
| R24 宽表只覆盖 2 域 + 被取代实现留痕 | 其余域未迁；表态矩阵并入后留 5 条 `.vs-matrix*` 死样式与一条失真注释 | 推广三域（支部分工 / 专班报名 / 表态矩阵）→ **全站矩阵实现收敛为 1 处**；清死样式 + 修正注释；**保留语义类** `.vs-none` / `.vs-object` / `.vs-note` / `.vs-tally` / `.vs-quorum` / `.vs-locked` | `relation-matrix::S4` + `filter-row::S3` |
| R25 「归一」出口不全 → 调用点各写兜底 | 思想汇报读侧归一此前只有「按人」「待初阅」两出口，跨人取全量归一集合无处可取 | `services/governance/thought-report.js` 补**全量归一出口** `listAllThoughtReports()`（归一只此一处）；台账改用 `renderRelationMatrix` | `relation-matrix::S6` + 真机② |
| R26 说明文件里的数字与名称无人守 | 文档与代码积了 34 处口径未同步；**根因是没有守卫** | ① 全部按**代码实测**修正；② 数字分**五口径**并写明定义（mockDB 顶层业务域 / 持久化域 / server 表 / 资源名 / 快照键，**严禁互相代入**）；③ 新增 `server/test/doc-consistency.test.mjs` 把口径变常驻断言 | `doc-consistency`（**现到 `S1–S16`**：S1–S9 原口径 + S10/S11 守卫清单与断言号真实性 · S12 授权声明带日期 · S13 `TIMESTAMPS` ↔ frontmatter（规模判据 = 推导式恒等式）· S14 可数事实对账 · S15 弱清单 · **S16 守卫注册完整性**（S 类测试须全数列入 `test:daily`）；与 `DATA_CONSISTENCY_CHECKLIST §0.2` 同批取齐） |
| R27 结构层守卫锁「形态」锁不住「体验」 | 分页 / 矩阵守卫全是静态断言，证明不了「每个工作台每个 tab 跑起来真的分了页」 | 新增**真机全站普查** `server/test/page-sweep.test.mjs`（七台 × 全部 tab 逐一断言；门槛值由 S0 锁单一源） | `page-sweep.test.mjs`（S0 + 普查 + S1 非空转）。唯一初始告警经复核为**守卫口径过严** ⇒ **修守卫、不改产品** |
| R28 「同一病灶只修一处」当成「修完」 | 「提交报必填、框却不在位」修好后，**同一形态全站还有 92 处** | ① 立**台账** `server/test/form-loop-registry.mjs`；② 建**真机闭环普查** `form-loop-sweep.test.mjs`（空必填点须报**可见**提示，且提示点名的字段**须有可见载体**；另含真机成功路径）；③ 台账守卫 S0–S6；④ 纪律入 `DATA_CONSISTENCY_CHECKLIST` 第十三范本 + §0.1「同类规模」问 + `CLAUDE.md R-67`（后续强化 `R-73` / `R-78`） | `form-loop-sweep.test.mjs`（S0–S6 + 真机闭环 + 成功路径） |
| R28-附 工具脚本把「**数据**」当「**代码**」改写 | `bump-version.mjs` 补戳正则命中台账数据（`form-loop-registry.mjs` 113 条 `file` 字段被改坏，**真事故**） | 缓存键**语境判据**抽为单一源 `version-next.mjs::isCacheKeyLine`；台账数据改写为 `SRC + '相对路径'` 拼接 | `version-stamp` S4–S6 + D7–D9；`form-loop-sweep::S4`（数据里不得出现 `?v=`） |
| R29 授权声明必须可核验（注释不得伪造「支书批」） | 一条提醒随批进仓、注释写「支书 2026-09-09 批」，而全仓找不到该具体功能的问答记录 | 立 `CLAUDE.md R-70`：新增**面向用户的提醒 / 流程 / 人工动作**须**逐项**请支书确认，不得随批「一起进」；注释里的「支书批」**必须能指到具体问答记录**。判据收窄到「支书作为批准者的断言」（370 → 229 条命中） | `doc-consistency::S12`（同一行须带可核验日期 `YYYY-MM-DD`；迁移台账已清空 = 此后零容忍）。⚠ **日期能否真指到问答记录，机器查不了**——该半截靠支书复核，**不假装守卫覆盖整句纪律** |
| R30 「人工归集」类要求须由服务端代劳 | 提醒要求支书「请逐人归集」组员进展，而四项都已建服务端表、缺的只是按 `personId` 聚合的读接口——**算得出来的东西派给人做 = 虚假工作量** | 纯聚合单一源 `services/member/member-progress.js::aggregateMemberProgress`（服务端**同源 import**）+ 读接口 `GET /api/v1/leader/member-progress` + 前端双态载入器；界面由「催人干活」改「**呈报实况**」 | `member-progress.test.mjs::S1–S4`（S1 结构单一源：接口源码不得自写判定） |

> **本轮方法论要点（可迁移，①–⑫）**：①「**同一事实几份**」→ 3.3 去重；「**同一能力几处**」→ 本台账**引擎化**（R14/R15）；②「**口径寄生环境**」→ 算式显式（R17）与「量尺须生产同构」；③「**绕过守卫的等价写法**」→ 守卫须按**语义**判而非按字面判（R16 快照 / R18 人名变量 / R13 注释两级规则）；④「**为修一个 bug 复制一份实现**」→ 同一实现体挂多门（R19）；⑤「**能力收进引擎 ≠ 已收口**」→ 必须**反向枚举**（先查使用点、再查实现点）（R21/R22）；⑥「**单一源搬迁 = 一次全仓改签**」→ 换文件 / 换名字后须 grep 旧路径（含 `?v=`）并断言 0 命中，静态守卫只锁形态、锁不住引用完整性（R22 真实事故）；⑦「**单一源不吞语义**」→ 通用能力只提供**挂载点**（如 `cellClass`），领域语义留在域内（R23）；⑧「**被取代的实现痕迹要连注释一起清**」——注释与代码不同源即误导，会被后续 AI 当规范读（R24）；⑨「**归一也是一份口径**」——读侧归一同样只能有一个出口（R25）；⑩「**文档里的数字与名称也是口径**」——不一致不是文风问题，而是**缺守卫**（R26）；⑪「**静态断言锁形态、真机普查锁体验**」——支书以「我体验到的」提出的病灶，必须用**真机全站普查**取证（R27）；⑫「**只修一处 = 没修完**」——病灶是「**一类形态**」不是「一处 bug」：修完立刻数「同一形态全站还有几处」（按语义枚举），>1 处即建台账 + 真机覆盖，并让守卫把「新增同类未纳入覆盖」变红（R28）。
> **并附（2026-09-29 批次 262 增）**：⑬「**弃用只做到引用层、没做到资产层**」——删引用 ≠ 删资产（`docs/assets/vendor/` 曾留下两件零引用死库，见 `.ctx/REVIEW_QUEUE.md` `H-17`）；「目录分层 / 改路径」后必须扫**动态 import 的模板字面量**（静态守卫与 `module-load` 曾双双绕开，见 `H-15`）。

#### 复核保留（2026-09-03 定，防过度合并）
- ① `TYPE_META` / `STATUS_META`：支部侧（「待党委批复」+ desc）与党委侧（「待批复」）文案不同，属**双视角差异**，暂不合并。
- ② `makeup::MANDATORY_ACTIVITY_TYPES`（刚性考勤子集 + 主题党日）与 gallery 色名：业务语义 ≠ 三会子类清单，不并入 subtypes。

#### 复核约定
- 每完成一个行动线条目，回 §四 更新状态并留日志（`.ctx/logs/**`）。
- 评分按季度或重大架构变更后复核一次，防「评估僵尸化」。
- 用户否决某条优先级时，只调顺序不改表结构；新方向裁决追加为后续编号行。

---

## 四、改造行动线（现行唯一行动清单）

> **语义**：本表为后续开发顺序的**唯一依据**。**状态记号：✅ = 已完成 / 立项 = 在立项 / 后续 = 后续批次或残项跟踪**。**每行只写「现状 + 残项 + 指针」**；逐批过程与实测数字见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`。

| 编号 | 行动内容 | 状态（当前） |
|------|---------|------|
| P0·统一扎口 | 以 forms.js 为样板，为徽章 / 数据视图等高频组件域逐一建库出口、全站收口（验收：每建一库跑 module-load + E2E；仓库无该域直连残留） | ✅ 三库完成（纪律见 §3.1）；**残项**＝徽章 / 选择器等出口仍散（见 §二 2.4）；见上线残项 L-18 |
| P0·数据域接线 | tab / 能力声明依赖的 service + mock 整体可替换（验收：新增 demo 分支或后端接入时 UI 零改动） | ✅ 收官：UI 层 `mock` 直连清零，种子仅存 `services/core` 数据层（契约见 §3.2） |
| P0a–P0c / P1a–P2c | 3.3 去重队列 R1–R9 的结构 / 单一源收口（微工具出口、元数据单一源、flow 键集断言、跨层单源、tab id 收敛、写场景清单、角色集单一源） | ✅ 全部完成；R2 的 2 项**复核保留**（§3.3 末）、R10/R11 **观察** |
| P1·开源合规包 | LICENSE、示例账号外置 env、部署 / 贡献说明 | ✅ 闭环（P8 交付后**残项清零**；原残项「拖拽编排」转 §四 P10） |
| P1b | R12 运行安全：server 登录加密码校验（可开关，缺省演示态兼容） | ✅ 完成（缺省 `'123456'` 可换 `LOGIN_PASSWORD` + `DISABLE_PASSWORD_CHECK=1` 逃逸门；**生产未设口令 ⇒ 启动即拒**） |
| P2·L3 拖拽 | L3 block manifest + 拖拽编排（验收：块声明 inputs / 事件 / 校验契约定稿并经支书确认后编码） | ✅ 契约 v1.1、块目录、配置排序、活动写口服务端执行、表单字段策略与参与人解析均已落地；**余下**＝块停用是否同步阻断任务/通知、画布 UI 与按角色配置（见 P10 / §六 G3）；见上线残项 L-14 / L-15 |
| P3a–P3e | 阈值参数化（票决门槛）/ 纪检考勤类型单源 / `policy-defaults.js` 建立 / 模块组合声明契约 v0 / 色板令牌收敛 | ✅ 全部完成（现状见 §二 2.1 / 2.4；R2-3 裁定正文见 `.ctx/logs/archive/2026-09-DECISION_LOG.md`「归位五」） |
| 8.7-①~④ | 支书台分工面板保态 / 多议题票决并行 / 考勤录入保态 / deploy 文档口径风化修正 | ✅ 全部完成 |
| P4a–P4c | 模板型最小包（换壳指南 + `?reset=1`）/ 换组织向导页 / 演示数据与空组织模板分离 | ✅ 完成（详见 `.ctx/REVIEW_QUEUE.md` 附录⑧；阶段三候选「数据层覆盖预览 / 党委默认模板抽象」登记后续） |
| P4d | 组合能力补强：`policy-defaults` 接 config 驱动 / `requiredRoles` 门禁消费 / 拖拽编排推广全站 | ✅ **三项均已完成**（域参数 config 驱动 · 门禁消费 · 见 P9 / P10）；**余下**＝P10 所列的新维度与待定业务边界 |
| P5 | **物理目录分层**：`services/` → **5 域** · `components/` → **6 域** · `entries/` → **3 类**（`pages` / `workspace` / `tabs`）；`modules/` 经判据核验**不再细分**（余 3 件各成一类） | ✅ 完成；**2026-09-29 批次 267 再进一层**（支书点选「①+②+③」）——`modules/` 消解 · `core/` 分 4 子域 · 新立 `data/`；**落地方式与「下一次搬迁前必读」硬成本 ⇒ 见 §六 G2**（本行不重复） |
| P6 | **数据服务端化收尾**：唯一「暂留本机·未服务端化」的业务事实改挂成员档案字段 | ✅ 完成（写口与 `developStage` 同一笔落档、读口形状不变；本机键降级为遗留键）。现状风险另见 §一「阻断级风险」与 §二 2.1 / 2.6 |
| P7 | **服务端按内聚切分 ＋ mock / server 双份种子收成单一源** | ✅ 完成：`server/routes/resources.js`（1301 行）→ `routes/resources/` **六件**（`index` / `gates` / `approval-gates` / `snapshot-versions` / `store` / `semantic-routes`，逐字搬迁、口径零改写）；`docs/src/data/mock/prop.js` 收 `WEEKLY_REPORTS_SEED` / `PROP_TASKS_SEED`，UI 侧与 `server/seed.js` **同源 import**。⚠ **越权项（如实登记 · 待支书核可）**：`doc-line-ref::R5` 短式引用下限 **40 → 30**（切分后同一行多条短式落到不同新文件、短式无从表达 ⇒ 一律改写为全式；其余三条基线一字未动）。**切分成本的实测 ⇒ 见 §六 G2 末段** |
| P8 | **G3-1 语义化 release / 发布工作流** | ✅ 完成（现状见 §二 2.6；纪律 `CLAUDE.md R-90` · `CONTRIBUTING.md §六`） |
| P9 | **G3-2 全量 config 引擎** | ✅ 完成：`POLICY_DEFAULTS` 26 叶键 100% 有归属（白名单 14 ＋ `POLICY_FIXED` 12），守卫 `policy-config::R1–R3` 断言「每个叶键恰属两类之一」⇒ **「未登记」第三态被消灭**；白名单本批**不扩**（未登记项全属制度 / 展示口径，无技参）。现状见 §二 2.4 |
| P10 | **G3-3 工作流组合推广** | 🟢 L1 编排内核、L2 配置排序、L3 manifest、活动写口服务端门、字段策略与参与人名单解析均已落地。**余项**：块停用是否同步阻断任务派生/通知；画布 UI 与“按角色配置（块决定 tab）”属新维度，需先出方案再排批；见 WORKFLOW_BLOCK_CONTRACT.md §8 与 H-24；见上线残项 L-14 / L-15 |
| P11 | **English 版** | ❌ **裁定不做**（支书 2026-09-28 原文「我们不需要英语！」）⇒ 从残项移出；客观语言门槛如实留档（产品边界） |
| P12 | **部署自动化（一键脚本 ＋ 白名单发布包）** | ✅ **已落（2026-09-29 批次 269）**：`deploy/` 七件（`package.mjs` 白名单打包器 ＋ 黑名单断言 · `smoke.mjs` 冒烟 · `install.sh`/`install.ps1` 一键安装 · `update.sh` 一键更新 · 生产 env 模板 · nginx 示例）。**实测**：包 **327 文件 / 10.1 MB**、黑名单命中 **0**；冒烟正例 **0** / 错口令 **1**。**2026-09-29 批次 272 补**：`deploy/doctor.mjs`（部署自检 ＋ 小白引导，只读不改、退码 0/1）＋ `package.mjs` **在包内自动生成 `DEPLOY.md`**（「包含什么」由打包器**现场数**：静态页 15 · 工作台 7 · 能力 12 · 块 6）＋ `deploy/` 纳入白名单（否则说明书指向的脚本不在包里）。**未真机验证** `install/update` 三个脚本（第一次须在测试机跑）；`deploy/**` **无机检**（`H-20`）；未真机验证见上线残项 L-02 |
| P13 | **性能债与权限读/写面** | 🟡 **口径已定、待执行（批次 270）**：**S1**（ETag/304 ＋ 只读诊断，零结构改动；实测 `api-adapter` 的 `fetch` 未设 `cache:` ⇒ 前端无需改动即生效）先行；**S2**（读过滤/取子集**下推** ＋ 表达式索引，走 `MIGRATIONS v2`）**与「服务端支部读过滤」同批**——因实测全仓 SQL 只有主键命中，**裸加索引＝空转件**。**权限**：先「一实例一支部」上线（读过滤缺口单支部下无风险），读过滤列 **P1**、写门（`RESOURCE_WRITE_GATE` 现仅 9 项）排其后；见上线残项 L-10 / L-11 |
| P14 | **部署组织基线 ＋ 名单不出包 ＋ IAAA 入站** | ✅ **已落（2026-09-29 批次 270–271）**：ⓐ `server/seed-baseline.js` 最小组织基线（**党委账号 1 名 ＋ 支部 br-b1「光华管理学院本科生党支部」**，零名单，任何形态都跑且幂等）——补掉「生产空库无法自举」的死锁（实测 `users=1 / branches=1 / 其余表全空`；守卫 `seed-baseline::B1–B3` 3/3）ⓑ 发布包**名单空壳化 ＋ 消毒 ＋ 出包断言**（实测 328 文件 / 10.1 MB / 两项断言 0 命中）ⓒ **IAAA 入站服务端全链**（`server/routes/iaaa.js` 六端点；四口径＝OAuth / 无门槛 / 支书·副支书·组织委员确认 / 不新增表；协议可插拔 ＋ `IAAA_MOCK` 本地联调；守卫 `iaaa-onboarding::T1–T7` **7/7**）🟡 **未落**：IAAA 前端承载面三步（登录按钮 · 选支部层 · 待确认队列）＋ 换学号解析口径待计算中心文档（见 `REVIEW_QUEUE H-22`）；见上线残项 L-19（已关闭，`H-22` 待同步） |
| 后续·残项跟踪 | 组件出口零星散件、G3-3 余下三层 | 后续（见 §一 残项 TOP 与 §二 各维残项；**已闭合项不再逐条罗列**，见日志沿革节）；开放残项以本节「上线残项」表为准 |

### 专项台账（2026-10-21 批次 500 起，单一源）

> 每批收尾必须报告本表快照与下一轮建议（`CLAUDE.md H20.3(e)`）。状态：✅ 已收口 / 🟡 在办 / ⏸ 暂停 / 后续。

| 专项 | 性质 | 状态 | 下一动作 | 单一源指针 |
|---|---|---|---|---|
| 跨组活动落实责任党小组 | 数据/权限 | ✅ | 已收口（批次 499） | `.trae/specs/assign-cross-group-activity-to-party-group/` |
| 汇报受众与组织汇总 | 权限/信息架构 | ✅ | 已收口（批次 500） | `issue-visibility.js`、`DATA_MODEL §2.16`、P-019 |
| 跨角色派生待办 | 写链/权限 | ✅ | 已收口（批次 500） | `todo.js`、`todo-cross-role-safety`、`todo-role-write-gate` |
| mock ↔ API 结构真值 | 数据真值 | ✅ 持续 | 新表 / 新字段必须进 manifest 并过 parity | `seed-manifest.js`、`mock-api-parity-structure` |
| seed 漂移与数据生命周期 | 数据治理 | ✅ 安全模式 | cleanup/rebuild 按需运行；保留期策略待支书裁定 | `seed-drift.js`、`server/scripts/{cleanup,rebuild-demo}.mjs` |
| 任命事务化 | 后端事务 | ✅ | 已收口（批次 500） | `semantic-routes` appointments / branch-commissioners |
| IA 剩余项（R3） | 信息架构 | ✅ P1；后续 P2/P3 | P2/P3 按三路报告排批 | `.ctx/logs/archive/2026-10/AUDIT_R5_*.md`、`UI_AUDIT_R3.md` |
| 宽表卡式化 | 响应式 | ✅ P1；后续 P2 | 动态列/党委目录/个人档案子表按需扩展 | `responsive-cards-guard`、`DESIGN_SYSTEM §4.20` |
| daily test 分层 | 测试工程 | ✅ | 预算只降不升；新增测试同批登记层级 | `test-tier-registry.mjs`、`test-tier-guard` |
| 第五轮脏乱繁审查 | 审查 | ✅ 报告；后续共识修复 | P2/P3 按报告修复顺序排批 | `.ctx/logs/archive/2026-10/AUDIT_R5_*.md` |
| 浮层承载面 | 承载形态 | ✅ | 已收口（批次 497） | `ui-modal-form-guard`、`DESIGN_SYSTEM §4.27` |
| form-loop 存量红 | 测试工程 | ✅ | 已收口（批次 501）：九条 e2e / form-loop 红全清 | `form-loop-registry.mjs` |
| 党委代配置写门（`D-825`） | 权限/治理 | ✅ | 已收口（批次 501）：推翻批次 448 写门，党委可代支部写 `modules`/`blocks`/`capabilityPackages`，留痕 `byRole` | `server/routes/resources/index.js`、`SYSTEM_ROLE_PERMISSION §9h`、`DECISION_LOG D-825` |
| 跨组不是第三落点（`D-826`） | 数据模型/权限 | ✅ | 已收口（批次 502）：落点两档 `party-group`/`branch`，跨组只表示招募范围；迁移 v10；服务端补组织者例外校验 | `constants.js::normalizeOrganizingScope`、`server/db.js` v10、`DECISION_LOG D-826` |
| 第六轮前端脏乱繁复审 | 审查 | ✅ 报告；P1/P2 已修 | P3 余项登记 `CLAUDE.md B-502-3` | `.ctx/logs/archive/2026-10/2026-10-AUDIT_R6_FRONTEND.md` |
| 第七轮数据生命周期 | 审查 | ✅ 报告；P1/P2 已修 | P3 余项登记 `CLAUDE.md B-502-4`；补课文案余项 `B-502-6` | `.ctx/logs/archive/2026-10/2026-10-AUDIT_R7_DATA.md` |
| 多支部形态与 P13 余项（承 `B-503-2`） | 数据/权限 | 🟡 在办 | 来源＝第九轮 9A 诊断残项：**多支部形态待支书裁定**；裁定后与 P13 的服务端读过滤下推、写门同批排（schema 方案已出、本轮不实施） | `.ctx/logs/archive/2026-10/2026-10-AUDIT_R9_DATA_STRUCTURE.md`、本文件 §四 P13 行 |

### 上线残项（2026-11-03 归总 · 单一台账）

> **本表是开放残项的唯一台账**：§一 / §二 / §四、45 页签审计、换轨 runbook、部署说明、IAAA 与工作流余项均回指本表；其它文档不再维护平行清单。
> 严重度只有三档：`launch-blocker`＝不解决不上线；`post-launch`＝上线后首个迭代；`backlog`＝只登记、不排期。状态只有 `待办` / `在办` / `已关闭`；已关闭项只保留最近 3 条。

| 编号 | 残项 | 严重度 | 状态 | 下一动作 | 单一源指针 |
|---|---|---|---|---|---|
| L-01 | 生产空库 `--strict` 未实跑 | launch-blocker | 已关闭 | 2026-11-03 实跑：生产档空库首启补 6 个角色账号后，`preflight-cutover --strict` **exit 0 / 警告 0**；副本库 export → dry-run → apply 48 表 / 577 行一致 | `deploy/CUTOVER_RUNBOOK.md §5（L129-L131）`；`.ctx/SNAPSHOT.md` 批次 527「未决」③（L347）；本轮临时库读数见 `preflight` 输出 |
| L-02 | `install.sh` / `install.ps1` / `update.sh` 未在真机验证 | post-launch | 待办 | **降级理由**：本机为 Windows 开发机，无法代替 Linux 测试机；首次部署前必须在测试机逐条跑安装与升级，核对脚本 ①–⑦ 输出与回滚提示。上线窗口内用 `doctor` + `smoke` 覆盖本机可验证部分 | `deploy/README.md` L50；`deploy/install.sh` 头注（L12） |
| L-03 | `attachments` / `sessions` 不随库导出 | launch-blocker | 已关闭 | **处置**：`sessions` 设计上不迁移（换轨后重新登录，避免旧 token 跨库有效）；`attachments` 按 runbook §6 用 robocopy / rsync 搬 `UPLOAD_DIR`，再跑 `preflight-cutover --uploads --strict`。本轮空附件目录 strict 已通过 | `deploy/CUTOVER_RUNBOOK.md §0（L32）`、`§6（L134-L151）` |
| L-04 | `committeeBroadcasts` 仅存本机，须人工导 localStorage | launch-blocker | 已关闭 | **复核**：`export-all` 已包含 `committee_broadcasts` 表（本轮 0 行），库内数据随库迁移；`localOnly` 仅为前端脏判定兼容，不再要求逐设备手工导出。前端已停止新写该集合 | `server/scripts/export-all.mjs` L35 / L168；`docs/src/data/mock-adapter.js` L2387（停止写入说明） |
| L-05 | review 档未硬拦「指向生产库」 | launch-blocker | 已关闭 | **处置**：新增 `npm run start:review`（`server/scripts/start-review.mjs`），缺省强制 `DB_PATH=server/data.review.db`；显式 `DB_PATH` 由操作者自行确认，文档写明不得指向生产库 | `server/scripts/start-review.mjs`；`README.md` L339；`deploy/README.md` L30-L33 |
| L-06 | 快照删除面无 `targetId` 时直接放行，可整集合删考勤 | launch-blocker | 已关闭 | **处置**：`attendances` 增加 `attendance-row` delete 门 → 快照删除面按集合门保留存量行；新增 `security-redteam` 5 条回归（普通成员快照清空考勤 403、行数不变） | `server/routes/resources/gates.js` L793-L902；`server/test/security-redteam.test.mjs` L98-L109 |
| L-07 | P2 3 条＝F6 三处空态不在 `.empty-state`（`org.thought-review` / `org.member-flow` / `visitor.attendance`） | post-launch | 已关闭 | **人工确认**：① `org.member-flow` 是 `empty-state` 表格变体（`<tr class="is-empty">`，已修 F6 探针识别）；② `org.thought-review` 的「本期没有记录」是页签分组提示、不是空态；③ `visitor.attendance` 的「出勤 —（暂无应到名单）」是指标占位、不是空态。三处均无需改 UI | `.ctx/evidence/2026-11-02/tab-audit/findings-final-527.json`（F6 hits）；`server/scripts/audit/dom-probe.mjs` L216-L219；`docs/src/components/ui/empty-state.js` table 变体 |
| L-08 | 47 条 exception 无固定复核节奏 | post-launch | 待办 | 每次 `audit-tabs --all` 同批复核例外理由是否仍成立；失效即删登记并修 | `.ctx/evidence/2026-11-02/tab-audit/summary-final-527.md` L10、`§例外登记（L333-L383）` |
| L-09 | `issue-unread` 派发位未强校验 `assignee === issue.assignee` | post-launch | 待办 | 前端 PATCH 事项与 POST 未读补顺序 / 重试，或改为服务端派生未读，再加强校验 | `server/routes/resources/semantic-routes.js#L142-L150`；`server/security/write-policy-matrix.mjs#L219-L224` |
| L-10 | 单实例多支部硬边界；服务端按支部读过滤未做 | post-launch | 在办 | **设计已出**（Architecture §十：请求级支部上下文 / 读口统一过滤 / 党委显式跨支部 / Phase 1–4）；上线仍坚持一实例一支部，Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH` | `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十（L150-L184）`；`server/run-mode.js#L34-L48`；本文件 §四 P13（L260） |
| L-11 | 全支部共享一个 `LOGIN_PASSWORD`，无个人密码 | post-launch | 待办 | **会话过期已关闭**（`SESSION_TTL_HOURS` 缺省 3）；剩余共享口令属受控部署：上线用 systemd 注入强口令并定期更换；个人密码 / 校外身份接入另立方案 | `server/README.md §部署前必知限制 #3（L249）`；`server/routes/auth.js#L118-L141`；`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` A.2 第 2 条（L998） |
| L-12 | 审计脚本不进 `test:daily`；precommit / full 时长仍是发布风险 | post-launch | 待办 | 保持「发布前 `audit-tabs --all`」为硬门，不把全量审计塞进 daily | 本文件 §二 2.5（L101）；`server/README.md`「测试耗时台账」（L104-L110） |
| L-13 | 41 个页签仅登记未重构 | backlog | 待办 | 按 `TAB_BLOCK_BASELINE` 的 reason 排序，后批逐页推进 | `.ctx/SNAPSHOT.md` 批次 525「未决」①（L331）、批次 526「未决」③（L339）；`content/04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md` L74 |
| L-14 | 块停用是否同步阻断任务派生 / 通知 | backlog | 待办 | 先出方案定口径，再并入工作流批 | `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md §8.1（L283）`、`§8.4（L328）`；本文件 §四 P10（L257） |
| L-15 | 画布 UI（L4）与「按角色配置（块决定 tab）」 | backlog | 待办 | 新维度先出方案；与 `allowedPages` 身份门、tab 计数守卫一起评审 | `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md §8.4（L328）`；`.ctx/REVIEW_QUEUE.md` H-24（L235） |
| L-16 | 表决 `voteConfig.voterIds` 由活动写入方固化，服务端未按场景重算 | backlog | 待办 | 待支书裁定重算口径（按 users + 组织归属）；裁定前不扩写 | 本文件 §一 阻断级风险 3（L51）；`server/routes/committee.js#L76-L97` |
| L-17 | SQLite JSON 宽表、无跨表外键、无业务字段索引 | backlog | 待办 | 万行级前评估 `MIGRATIONS v2` 与索引；当前只登记 | 本文件 §一 阻断级风险 5（L53）；`server/README.md §部署前必知限制 #2（L248）` |
| L-18 | 单一源组件出口仍有零星散件；R2 复核保留、R10 / R11 观察 | backlog | 待办 | 按 §3.3 末清单逐项收敛；观察项不提前合并 | 本文件 §3.3 复核保留（L225-L234）、§四 P0·统一扎口（L242） |
| L-19 | IAAA 前端三步（登录按钮 / 选支部层 / 待确认队列） | post-launch | 已关闭 | 2026-11-03 复核：三步均已在批次 277–278 落地；同步 `H-22` 状态 | `docs/src/entries/pages/login-entry.js#L298-L380`；`docs/src/entries/tabs/org/member-flow-tab.js#L137-L190`；`server/test/iaaa-onboarding.test.mjs` |
| L-20 | 写入口 6 条 `known-risk` 未清零 | launch-blocker | 已关闭 | 2026-11-03 Task 4 已清零；矩阵当前无 `known-risk` 行，再出现须带 reason / impact / riskRef | `server/security/write-policy-matrix.mjs#L29-L33`、`#L180-L184`；`server/test/write-policy-matrix.test.mjs` |
| L-21 | `disc.review` E1（`GET /api/v1/users` p95 95ms） | post-launch | 已关闭 | 批次 527 复测 E1 全 pass（p95 ≤12ms / 预算 50ms），不再排批 | `.ctx/evidence/2026-11-02/tab-audit/summary-final-527.md §评分卡（L43）`；`.ctx/evidence/2026-11-02/tab-audit/findings-final-527.json`（`GET /api/v1/users` p95 12ms / 预算 50ms） |

**本批执行顺序**

1. **本次 spec 关闭的 launch-blocker**：L-01（生产空库 `--strict` exit 0）· L-03（会话不迁移 + 附件按 runbook 搬）· L-04（表随库导出，不再要求手工导 localStorage）· L-05（`npm run start:review` 强制独立库）· L-06（考勤删除门 + 快照红队回归）；均已在 2026-11-03 任务 6 关闭或给出可复跑证据。
2. **明确降级为 post-launch**：L-02 降级（本机为 Windows 开发机，无法代替 Linux 测试机；首次部署前必须在测试机验证 install / update）；L-10 依据 spec 关键假设 3「上线＝一实例一支部」；L-11 的会话过期已在本批关闭，剩余共享口令属受控部署、由 systemd 注入强口令。其余 post-launch：L-07 是 P2 启发式、无功能或权限影响，Task 6.2 先人工确认；L-08 属审计节奏而非缺陷；L-09 已收窄到派发位且做支部校验；L-12 是发布时长权衡。
3. **backlog 只登记**：L-13（41 个页签按 reason 排序推进）、L-14 / L-15（工作流新维度先出方案）、L-16（表决名单需支书裁定）、L-17（宽表与索引）、L-18（组件出口散件）；均不排入本批。
4. **口径**：本表只归总残项与顺序，不改 §一 / §二 / §五 的评分与论证；每条下一动作均落到可定位文件与小节 / 行号，不写「见上文」。

---

## 五、经验索引与当前值（便于 check；2026-09-15 批次 44 建）

> **本节唯一职责**：让人（支书）与 AI 在**一屏内**看清「**现在是什么** → 由谁守 → 还欠什么**」。**本节不复述细节**——判据在守卫文件、规则在 `DATA_CONSISTENCY_CHECKLIST §0.2`、**逐批沿革与打分论证在执行日志**（单一源 + 指针纪律）。

### 5.1 逐批沿革与打分论证（**已迁出 → 日志**）

> **迁出去向说明**：本节标题保留（`§五` 的编号被多处按「§五 → 沿革」的心智引用过）。**迁到哪儿**：沿革表 + 逐批「为何 +1 / 不加分」论证 + 分数与规模演进链 → `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：工程化评估逐批沿革**」节。**为什么迁**：本文件职能＝回答「现在工程化到几成、下一步该改哪里」，不答「哪一批做了什么」。**现在要查**：沿革去日志；现状看 §一 / §二 / §3.4 / §5.2。

### 5.2 当前值（一屏看现状）

- **六维（当前）**：业务与数据正确性 **79** · 安全与权限 **66** · 最小三成本体验（含前端与交互） **68** · 测试与发布质量 **83** · 架构与可维护性 **76** · 运行/部署/跨组织复用 **73**。**不计算平均总分**；高风险见 §一「阻断级风险」，逐维依据见 §二。
- **目录分层（当前 · 2026-09-29 批次 267 收官）**：`core/` **4 子域**（base 7 · domain 7 · boot 4 · session 4 = 22 件）· `data/` **新立**（4 适配器 ＋ `mock/` 15 件）· `services/` **5 域**（core 9 · member 9 · activity 12 · governance 11 · branch 8 = 49 件）· `components/` **7 域**（ui 13 · shell 6 · sections 2 · feedback 4 · record 11 · governance 13 · dashboard 4 = 53 件）· `capabilities/` **顶层 12 件**（2026-09-29 批次 268 增 `taskforce.js`） · `entries/` **3 类**（pages 15 · workspace 7 · tabs 68）· `workflow/` 8 件 · `config/` 1 件。**`modules/` 已消解**（能力声明上提顶层；3 件跨页件按判据归位：`branch-demo-nav` → `services/core/` · `references`/`help-catalog` → `components/sections/`）。落地方式与硬成本 ⇒ 见 §六 G2。
- **测试规模**：**动态口径，不写死**——以 `server/test/` 实测为准（分档见 `server/README.md`「测试耗时台账」）。
- **纪律与判据索引（当前）**：`§3.4` 收敛台账 **R13–R30 共 19 行**（含 `R28-附` / `R29` / `R30`）；`CLAUDE.md` 现行纪律 **R-68 ~ R-80**（真机同环境量测 · 不得以「等裁定」结束回合 · 授权声明可核验 · 异常面下沉动作级 · 守卫覆盖按接口逐维数 · 台账完备性三缺一 · 等待窗口须覆盖真实耗时 · 判据落在事实上而非手段上 · 增量而非绝对值 · 判据之间不得互相冒充 · 「不可达」只有两条出口 · 「成功」须确认落库 · 每个字段都要有判据）；自查问句 = `DATA_CONSISTENCY_CHECKLIST §0.1`（**现到二十七问**）；范本 = 同文件（**第六–第二十七**）；判例集 = `content/05_ai_coding/TEST_AND_VERIFICATION.md`。**逐条「哪一批增了哪一问 / 哪一范本」属沿革 ⇒ 见日志**。
- **浏览器本地业务数据（当前）**：**已无「暂留本机·未服务端化」的业务事实**。其余本机键按性质三类（草稿 / 预览 · 本机令牌 / 运行态 · 偏好与会话），判定与逐条理由 = `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.3`（机检镜像 = `localstorage-key-guard`）。

### 5.3 一页指针（找什么去哪里，不在本文件复述）

| 想查什么 | 去哪里（唯一权威） |
|----------|--------------------|
| **规则 → 由哪个守卫守 → 当前状态** | `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` **§0.2 总索引**（S9 守卫其引用真实性） |
| 病灶类的**可执行判据**（改前自问） | 同文件 **§0.1 自查问句（现到二十七问）** + **范本第六–第二十七** |
| **判例**（什么条件下会失效、怎么被抓住） | `content/05_ai_coding/TEST_AND_VERIFICATION.md` |
| 单一源**组件**登记（新增件须登记） | `README.md` 开发路径 · 单一源组件登记处 |
| 本轮 / 历轮的**原始动作记录** | `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`（批次条目 ＋「附：工程化评估逐批沿革」） |
| **定了什么** | `.ctx/logs/archive/2026-09-DECISION_LOG.md` |
| 评审遗留与特批记录 | `.ctx/REVIEW_QUEUE.md`（Q 台账 + 附录） |
| 术语与口径唯一化 | `content/03_doc_system/OPERATIONS_GUIDE.md` §19（《运行与协作规范》术语使用规范；母本表见 `ARCHITECTURE.md §十`） |
| 当前版本基线 | `.ctx/SNAPSHOT.md`（版本里程碑 + 生成段） |
| **何时动过** | `.ctx/TIMESTAMPS.md` |

### 5.4 每批任务的入口顺序（三步，谁改谁负责）

1. **改前**：读 `DATA_CONSISTENCY_CHECKLIST §0.2` 扫与本次改动相关的规则，再读 §0.1 十四问自问（答不实**先问支书**）；
2. **改中**：新能力 / 口径一律收进单一源（引擎 / 叶子件 / 常量表），**反向枚举**确认没有绕过单一源的自写实现；**同类病灶先数规模**（>1 处即建台账 + 真机覆盖）；
3. **改后**：更新 §0.2 总索引 + 相应守卫（新增断言即更新 `README` 守卫清单语区）；**交付报告第一屏给提交命令与未提交规模**（`R-66`）；**定向测试为主，交付前才跑全量**。

---

## 六、改进梯度（G0–G3）

> **排序原则**：**先做「机械可验证、失败可定位」的，再动「一改就牵动全链」的**。每一级写清 **前置条件 / 做什么 / 验收判据 / 主要风险**——梯度不是愿望清单，而是**可独立交付、可独立复跑**的分批。

### G0 · 零风险（当批可交付；不动物理结构、不动禁改文件）
- 说明文件口径统一与「服务可用性」入口口径（`file://` 打不开网页 / 要用服务地址）。
- 残项台账化：§二 各维残项逐条可指认，机器判不了的**如实登记**。
- **验收**：`doc-consistency` / `doc-line-ref` / `frontmatter-freshness` 三绿；**只改 md 时不 bump `?v=`**。

### G1 · 小步可验证 —— ✅ **已完成（四项全清，各带常驻守卫）**
1. ✅ **按 viewer 角色消费能力**（插件化与组合能力共同最大失分项）：`workspace-shell` 先查角色能力、再按 scope 兜底，两查皆空**渲染显式提示卡**（原为静默空壳）。守卫 `capability-registry`。
2. ✅ **选人域出口扎口**：`components/governance/pickers.js` 为唯一出口（两个实现文件不直连）。守卫 `person-consistency::S5`。
3. ✅ **服务层剥离 UI 依赖**：`issue-dispatch-view.js` / `notice-view.js` 两个新组件承载原住在服务层的渲染（整块逐字搬迁、零行为变化）；服务层对 `components/` 的 import **清零**。守卫 `module-load::E3`。
4. ✅ **manifest「未同步即红」**：`block-manifest` 新增 S2（`sopRef` 制度文件须真实存在）/ S3（组合声明必须真合法，原先只 `console.warn`）/ S4（`capabilityId` 须在 `CAPABILITY_PROVENANCE` 登记）。

### G2 · 结构性（最贵）—— ✅ **已完成：物理目录分层**
`services/` **47 件 → 5 域**；`components/` **51 件 → 6 域**；`entries/` **3 类**（`pages` / `workspace` / `tabs`）。**落地方式（可复用）= codemod 而非手改**：① 移动文件；② **Pass A** 按「旧目录解析、新目录重算」重写全部相对 specifier；③ **Pass B** 改文本引用（md / html / 注释 / 字符串）；④ **Pass C** 补两类漏网形态（**路径分片 join** `'services','x.js'` 与**正则转义字面量** `services\/x\.js`）；⑤ `?v=` 全链 bump；⑥ 行号引用同批改签。

**下一次搬迁前必读（实测硬成本）**：

| 成本项 | 现状与教训 |
|---|---|
| 相对 specifier 重算 | **文件一挪，连「指向未挪文件」的相对路径也要重算**（深度变了）；服务层 / 组件层 / 入口层三轮累计上千处 |
| 文本引用 | md / html / 注释 / 台账数据同批要改（同样上千处） |
| **守卫的「相对深度」断言** | **2026-09-29 新增**：有守卫把相对路径深度写死在断言里 ⇒ 文件一挪即红。**已改 `(\.\.\/)+` 深度无关写法**；**「文件名写死在断言里」这一类仍在**（下次搬迁仍会红，只是能一眼定位） |
| 说明文件行号引用 | `README-server.md` 的 `文件:行号` 极敏感——**只动一个文件三行即触发 6 处**瞬时失效（`doc-line-ref` 当场判红）⇒ **等同批改签，或对注释改动改用「净零行」** |
| **动态 import 的模板字面量** | **2026-09-29 新增（真事故）**：一处 `` import(`../x/${y}.js`) `` 漏改深度 ⇒ **运行时 404**、真机才暴露（见 `.ctx/REVIEW_QUEUE.md` `H-15`）⇒ **搬迁后必须扫这一类，已补 `import-path-guard`** |
| **浏览器绝对路径 `/src/<…>`** | **2026-09-29 批次 267 实测**：E2E 测试大量用 `import('/src/core/x.js?v=…')` 这种**浏览器绝对路径**——它既不是相对 specifier、也不是 md/html 的 `docs/src/…` ⇒ **Pass A / Pass B 都扫不到**，静默 404（只在全量档暴露）。搬迁后必须**另跑一遍 `/src/<旧>` → `/src/<新>`**。 |
| **目录名与既有「跳表」撞名** | **2026-09-29 批次 267 实测**：新立的 `docs/src/data/` 撞上 `bump-version.mjs` / `release.mjs` / `localstorage-key-guard` 里**沿用的 `'data'` 跳过项**（原为防御性死项，此前无此目录）⇒ 该目录**整层不被打戳 / 不被扫描**（`version-stamp` 会因出现两个活动戳判红、`localstorage-key-guard` 会把该层定义的键判成「僵尸登记」）。**立新目录前必须先 grep 全仓跳表**。 |
| **`core.autocrlf=true` 下的 `git checkout`** | **2026-09-29 批次 267 实测（真事故）**：`git checkout -- .` 把整棵工作树由 LF 写成 CRLF；守卫里用 `\n` 写死的正则（如 `branchId,\n\s*title,`）**当场判红**，且 `git diff` **看不见**（autocrlf 把 EOL 差异归一化）⇒ 排查极费时。**处置**：按 `git ls-files --eol` 把「索引为 LF、工作树成 CRLF」的文件改回 LF（403 个）。**教训**：本仓工作树是 LF；回收工作树不要用裸 `git checkout -- .`。 |
| 禁改面 | `docs/src/data/mock-adapter.js` 等在**禁改清单**内：只随全站 stamp 动 `?v=`（零代码改动） |

- **服务端那一半（同线）**：`server/routes/resources.js`（1301 行）→ `routes/resources/` 六件。**教训**：① **import 深度不可一律 +1**（该文件依赖横跨三档 ⇒ 必须逐条按「老目录解析 ⇒ 新目录重算」）；② 守卫与测试里**把该路径写死**的多处须同批改签；③ `doc-line-ref` 短式引用在「同一行多条落到不同新文件」时无从表达 ⇒ 改写为全式（`R5` 短式下限 40 → 30，**越权项、待支书核可**）。
- **残余（如实登记）**：**2026-09-29 批次 267 已消解**——支书点选「①+②+③ 全档」后：① `modules/capabilities/` 上提为顶层 `capabilities/`，余 3 件**按判据**归位（`branch-demo-nav` 是身份/放行横切件 ⇒ `services/core/`；`references`/`help-catalog` 是页级板块渲染器 ⇒ 新建 `components/sections/`——两者有**共同判据**，不再是 P5 时判的「各成一类」）；② `core/` 27 件分四子域（base/domain/boot/session）；③ `mock/` 与 4 个 adapter 合成顶层 `data/`（按 `D-677` 让「数据形态」边界一眼可见）。**改判理由**：P5 只判过 `modules/`「**不再细分**」（不在 3 件内部再建子目录），**未裁过命名与归位**；支书本轮明确要求「更舒服、高效的划分」。**累计 56 件搬迁 / 723 处 specifier 重算 / 800 处全路径引用 + 216 处裸路径 + 106 处 `/src/` 绝对路径**。

### G3 · 已获支书点选 / 裁决（三项）
- **G3-1 语义化 release / 发布工作流**：✅ 已交付（→ §四 **P8**；纪律 `CLAUDE.md R-90` · `CONTRIBUTING.md §六`）。
- **G3-2 全量 config 引擎**：✅ 已收口（→ §四 **P9**；`POLICY_FIXED` 台账 ＋ 守卫 `policy-config::R1–R3`）。
- **G3-3 工作流组合推广**（→ §四 **P10**）：L1 编排内核、L2 配置排序、L3 manifest、活动写口服务端门、表单字段策略及参与人范围解析均已落地。当前余项只有：块停用是否同步阻断任务派生/通知；画布 UI（L4）与按角色配置 tab 属新维度，需先设计再排期。实现状态以 [WORKFLOW_BLOCK_CONTRACT.md §8](../content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md) 和 H-24 为准；本行只保留当前状态，不复述批次过程。
- **English 版：裁定不做**（支书 2026-09-28 原文「我们不需要英语！」）⇒ 从开源化残项移出（→ §四 **P11**）。
- **纪律**：每项**先出方案再动手**（本文件与 `content/**` 均为支书批改层）；**G3 任何一项不得以「顺手一起做」进入 G0–G2 的批次**（`CLAUDE.md R-70`）。

### 梯度纪律（不许跳过）
- **G1 未清之前不做 G2**（理由见上）。
- **G3 任何一项不得以「顺手一起做」进入 G0–G2 的批次**（`CLAUDE.md R-70`）。

---

## 附：沿革与口径注

> **迁出去向说明**：本节原有四段（评估沿革（一句）、关键日期与支书再评定调要点、文件沿革（旧路径段）、执行日志索引）已于 2026-09-17 **逐字迁出**至 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节。**为什么迁**：本文件职能＝评估结论、工程纪律与行动优先级，「历轮分数怎么变 / 关键日期 / 文件改过什么名 / 日志索引」是沿革。**现在要查**：沿革去上述日志附节；现状看 §一 / §二 / §3.4 / §5.2。
