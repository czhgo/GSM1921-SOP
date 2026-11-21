---
title: "文件时间戳注册表"
type: audit_report
role: "[工程师]+[AI]"
last_updated: "2026-11-22"
status: active
dynamic_role:
  maintenance: "[工程师]+[AI]"
  auto_update: "[AI]"
---

# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: "2026-11-22" | 类型: [工程师]+[AI] | 维护方式: 每次文件修改后同步更新
>
> **迁出去向说明（2026-09-17 立）**：本文件原有两条 ⚠ 登记（自身时间戳两处不一的更正经过 / 表刷新已漏做一次），其**更正与登记经过**已于 2026-09-17 **逐字迁出**至 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节。**为什么迁**：本表职能＝「哪些文件在什么时候被谁动过、周期性任务何时到期」（见头下职能声明），「本次怎么改的」是沿革。**现在要查**：① 沿革去上述日志附节；② **补刷已做（2026-09-17 批次 59）**——自身时间戳三值统一为 2026-09-17、表行按「文件最后实质改动日」补刷、僵尸行已修准或标记；**未消残留**（工作树「已改未提交」而在库无改动日记载者）逐行清单见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 批次 59「二」节；③ 逐版沿革见同日志「附：SNAPSHOT 版本沿革」节。

> **职能（2026-09-17 立，规范见 [OPERATIONS_GUIDE §5.1](../content/03_doc_system/OPERATIONS_GUIDE.md)）**
> **回答什么问题**：「**哪些文件在什么时候被谁动过，以及周期性任务的到期情况**」——一张按目录组织的时间戳台账 + 周期性任务追踪表。
> **不回答什么**：① **变更的内容**（改了什么、为什么改）→ `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **系统当前长什么样** → `.ctx/SNAPSHOT.md`；③ **工程打分与行动线** → `.ctx/ENGINEERING_ASSESSMENT.md`；④ **各文件的职责** → `content/03_doc_system/DOC_MAP.md`（本表只答「何时动过」，不答「该由谁读」）。
> **谁什么时候读**：`[工程师]+[AI]`；**批次收尾核对时**（确认本轮改了哪些文件、YAML 头是否同步）与 **M2 周期任务执行时**（按需，on-demand）。

---

## 更新规则

1. 本注册表在周期性任务 M2（SNAPSHOT 更新）执行时批量刷新，不随日常文件修改逐条更新
2. 时间戳格式: `YYYY-MM-DD`（精确时间仅在有 git log 依据时使用 `YYYY-MM-DD HH:MM:SS`）
3. 新增文件须在本注册表中追加条目
4. 删除文件须将对应条目标记为 `🗑️ 已删除`
5. 本文件自身的时间戳在每次批量刷新时同步——**本文件的时间戳有三处同源副本**（frontmatter 的 `last_updated` · 头下 `> last_updated: …` · 下方表内本文件自身行的日期），**改其一须同改另两处**（2026-09-23 批次 160 补：此前头下那处曾停在 2026-09-22、与另两处的 2026-09-23 不一致；`doc-consistency::S13` 只核「表行 ↔ frontmatter」这一对，**核不到头下那处**）

---

## 根目录

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| README.md | 2026-11-14 | — | [用户]+[AI] | 见日志批次 597 |
| README-members.md | 2026-10-16 | — | [用户]+[AI] | 支部成员版说明；匿名反馈为登录后的支部内闭环，处置权不含揭名权（`D-824`）。 |
| README-server.md | 2026-11-21 | — | [用户]+[AI] | 见日志批次 597 |
| CLAUDE.md | 2026-11-21 | — | [工程师]+[AI] | 见日志批次 597 |
| CHECKLIST.md | — | — | — | 🗑️ 已删除（迁移至 content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md） |
| LICENSE | 2026-05-18 | — | [用户] |  |
| .gitignore | 2026-09-10 | — | [工具] |  |
| .markdownlint.json | 2026-04-06 | — | [工具] |  |
| ARCHITECTURE.md | — | — | — | 🗑️ 已删除（迁移至 content/03_doc_system/ARCHITECTURE.md） |
| index.html | — | — | — | 🗑️ 已删除（迁移至 docs/index.html） |

## .ctx/ (审计底座)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| .ctx/TIMESTAMPS.md | 2026-11-22 | — | [工程师]+[AI] | 文件时间戳注册表；备注列只写**现状 / 边界 / 指针**（`R-89`）；纯代码行（`.js` / `.mjs`）不再逐条登记，改动日以 git 为准（批次 597）。 |
| .ctx/SNAPSHOT.md | 2026-11-22 | — | [AI] | 系统现状基线（reference）：只答「系统现在长什么样」；schema v19 / 业务 50 表。 |
| .ctx/ACTIVE_RULINGS.md | 2026-11-19 | — | [工程师]+[AI] | 现行有效裁定**索引**（reference）：只答「到哪找某条现行口径」；跨域摘要 + 18 领域索引，规则正文在 `content/01–05`。 |
| .ctx/ENGINEERING_ASSESSMENT.md | 2026-11-22 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/REVIEW_QUEUE.md | 2026-11-22 | — | [工程师]+[AI] | 支书评议队列（reference）：只答「要评议什么 ＋ 评议怎么做」；已闭环项删除（`D-892` / `D-901` 删 `B-552-1…6`）。 |
| .ctx/logs/archive/2026-10/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md | 2026-10-19 | — | [工程师]+[AI] | Round 1 工作台结构审计报告（53 条 triage + 三路审查 + 共识/分歧/裁定 + 证据门）；修复 spec 落盘后可归档或删除。 |
| .ctx/logs/archive/2026-10/AUDIT_ROUND2_MINIMUM_THREE_COSTS.md | 2026-10-19 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/archive/2026-10/AUDIT_ROUND3_4_COMBINED.md | 2026-10-19 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/archive/2026-10/AUDIT_IA_CRITICAL.md | 2026-10-19 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/archive/2026-10/IA_LINK_TRUTH.md | 2026-10-19 | — | [工程师]+[AI] | IA 链接真值审计（角色 + 对象 + 步骤）；材料闭环逐角色落点表 + 真机读数（组长点考勤被弹回 leader.html）。 |
| .ctx/logs/archive/2026-10/snapshots/INDEX.md | 2026-07-11 | — | [工程师]+[AI] | 快照历史索引 |
| .ctx/logs/archive/2026-10/snapshots/SNAPSHOT_v3_20260502.md | 2026-08-05 | — | [工程师]+[AI] | v3 快照 |
| .ctx/logs/EXECUTION_LOG_INDEX.md | 2026-11-22 | — | [工程师]+[AI] | 日志索引：月份目录 ＋ 批次 529–568；569+ 见当月执行日志各节标题。 |
| .ctx/logs/2026-11-EXECUTION_LOG.md | 2026-11-22 | — | [工程师]+[AI] | 11 月执行日志（当月活跃，含批次 542–596）。 |
| .ctx/logs/DECISION_LOG.md | 2026-11-22 | — | [工程师]+[AI] | 决策日志月度索引；概要只留条数与主题词（沿革见各月文件）。 |
| .ctx/logs/archive/2026-02-EXECUTION_LOG.md | 2026-02-28 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-03-EXECUTION_LOG.md | 2026-03-02 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-04-EXECUTION_LOG.md | 2026-04-01 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-05-EXECUTION_LOG.md | 2026-05-22 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-05-DECISION_LOG.md | 2026-07-31 | 2026-07-31 | [工程师]+[AI] | 5月决策日志 |
| .ctx/logs/archive/2026-06-EXECUTION_LOG.md | 2026-07-01 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-06-DECISION_LOG.md | 2026-07-01 | 2026-07-31 | [工程师]+[AI] | 6月决策日志 |
| .ctx/logs/archive/2026-07-EXECUTION_LOG.md | 2026-07-31 | 2026-10-06 | [工程师]+[AI] | 7月执行日志（已归档） |
| .ctx/logs/archive/2026-07-DECISION_LOG.md | 2026-07-31 | 2026-10-06 | [工程师]+[AI] | 7月决策日志（已归档） |
| .ctx/logs/archive/2026-08-EXECUTION_LOG.md | 2026-08-31 | 2026-10-06 | [工程师]+[AI] | 8 月执行日志（该月存档）。沿革见 `.ctx/logs/`。 |
| .ctx/PLAN_网页逻辑梳理.md | — | — | [工程师]+[AI] | 已删除（2026-08-24 T-280 B1~B6 全部完成，规划已归档至 8月执行日志） |
| .ctx/logs/archive/2026-08-DECISION_LOG.md | 2026-08-31 | 2026-10-06 | [工程师]+[AI] | 8月决策日志（D-270~D-272 丙部退出归档） |
| .ctx/logs/archive/2026-09-EXECUTION_LOG.md | 2026-10-06 | 2026-10-06 | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/2026-10-EXECUTION_LOG.md | 2026-10-27 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/2026-10-DECISION_LOG.md | 2026-10-22 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/2026-11-DECISION_LOG.md | 2026-11-22 | — | [工程师]+[AI] | 11 月决策日志（当月活跃 · 决议权威源）；当前 `D-827`…`D-906`。 |
| .ctx/logs/archive/2026-10/2026-10-AUDIT_R10_DATA_LIFECYCLE.md | 2026-10-23 | — | [工程师]+[AI] | 第十轮数据生命周期审查（75 条；R10 四批的依据）。 |
| .ctx/logs/archive/2026-10/2026-10-AUDIT_UI_R11.md | 2026-10-23 | — | [工程师]+[AI] | 第十一轮前端脏乱繁审查（P0/P1/P2 与 SD-1…SD-11）。 |
| .ctx/logs/archive/2026-10/2026-10-R10_P3_CLOSURE.md | 2026-10-23 | — | [工程师]+[AI] | R10 P3 收口对账（R6 21 / R7 18 / 帮助注释 9）。 |
| .ctx/logs/archive/2026-09-DECISION_LOG.md | 2026-10-02 | 2026-10-06 | [工程师]+[AI] | 见日志批次 597 |
| .ctx/logs/archive/2026-05-early-EXECUTION_LOG.md | 2026-05-21 | 2026-05-21 | [工程师]+[AI] | 5月早期条目归档 |
| .ctx/logs/archive/2026-07-early-entries.md | 2026-07-31 | 2026-07-18 | [工程师]+[AI] | T22-T90 早期条目归档（母本：2026-07-EXECUTION_LOG.md） |

## content/01_strategy/ (战略路线层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/01_strategy/DEVELOPMENT_PATH.md | 2026-10-18 | — | [用户]+[AI] | **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件 |
| content/01_strategy/SECRETARY_DIRECTIVES.md | 2026-10-22 | — | [用户]+[AI] | P-018/19**（2026-09-26 批次 202：03《运行与协作规范》合并后引用改准〔`USAGE_POLICY.md §1` 术语表 → `OPER |
| content/01_strategy/README.md | 2026-10-24 | — | [用户]+[AI] | 01_strategy 目录索引（2026-08-24 补充 references 子目录性质划分）；**2026-09-22 批次 154**：referen |
| content/01_strategy/references/历史会议材料/ | 2026-08-27 | — | [用户] | 只读（2026-08-24 党支部工作记录.docx 归位于此） |
| content/01_strategy/references/合规文件/ | 2026-07-21 | — | [用户] |  |
| content/01_strategy/references/建设探索/ | 2026-08-03 | — | [用户] |  |

## content/02_institution/ (制度层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md | 2026-11-03 | — | [用户]+[AI] | 见日志批次 597 |
| content/02_institution/FLAT_ORGANIZATION_DESIGN.md | 2026-09-22 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-26 批次 201**：正文**整体并入** `content/02_institution/COMMISSIONE |
| content/02_institution/ROLE_CLASSIFICATION.md | 2026-09-05 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-26 批次 202**：**自 `02_institution` 迁入 `03_doc_system`**——正文* |
| content/02_institution/QR_ATTENDANCE_POLICY_DRAFT.md | 2026-11-15 | — | [工程师]+[AI] | 见日志批次 597 |
| content/02_institution/SYSTEM_ROLE_PERMISSION.md | 2026-11-20 | — | [工程师]+[AI] | 见日志批次 597 |
| content/02_institution/README.md | 2026-10-24 | — | [用户]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用 / 枚举改准〔「二、角色分类」表改「迁出登记」行 ＋ `ROLE_CLASSIFIC |
| content/02_institution/sop/INDEX.md | 2026-10-25 | — | [用户]+[AI] | SOP 导航（术语段只留 `TERMINOLOGY.md` 指针；常用场景行用途栏用「组织生活会以三会形式召开」写法）。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/README.md | 2026-11-04 | — | [工程师]+[AI] | SOP 目录索引（维护触发器指向 `H30.1`）。 |
| content/02_institution/sop/常见工作场景快速指南.md | 2026-10-22 | — | [用户]+[AI] | 见日志批次 597 |
| content/02_institution/sop/支委与党小组定人定责定岗说明.md | 2026-11-11 | — | [用户]+[AI] | 见日志批次 597 |
| content/02_institution/sop/宣传委员工作流程指南.md | 2026-10-25 | — | [用户]+[AI] | 见日志批次 597 |
| content/02_institution/sop/纪检委员工作流程指南.md | 2026-10-18 | — | [用户]+[AI] | 见日志批次 597 |
| content/02_institution/sop/组织委员工作流程指南.md | 2026-10-22 | — | [用户]+[AI] | 见日志批次 597 |
| content/02_institution/sop/党小组组长工作手册.md | 2026-10-22 | — | [用户]+[AI] | 跨组口径。2026-09-22 批次 140 母本降级：移去沿革注记 3 处（`:172`「2026-08-30 支书裁决·混合模式」· `:239`「（D-2 |

## content/03_doc_system/ (系统治理层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/03_doc_system/OPERATIONS_GUIDE.md | 2026-11-19 | — | [工程师]+[AI] | 运行与协作规范 |
| content/03_doc_system/PROCESS_GUIDE.md | 2026-09-13 | — | [工程师]+[AI] | 🗑️ **已删除**：正文**整体并入** `content/03_doc_system/OPERATIONS_GUIDE.md`《运行与协作规范》的 **§ |
| content/03_doc_system/USAGE_POLICY.md | 2026-09-15 | — | [工程师]+[AI] | 🗑️ 已删除（正文并入 `OPERATIONS_GUIDE.md`《运行与协作规范》**§19–§23**）。沿革见 `.ctx/logs/`。 |
| content/03_doc_system/INFORMATION_COMPUTATION.md | 2026-11-08 | — | [工程师]+[AI] | 信息计算与呈现口径：通知可见性 / 铃铛 / 待办派生 / 概况 / 考勤五项；未统一项与待裁定分列。 |
| content/03_doc_system/ARCHITECTURE.md | 2026-11-08 | — | [工程师]+[AI] | 核心架构与单一事实源（2026-09-25 三份合一） |
| content/03_doc_system/DOC_MAP.md | 2026-11-11 | — | [工程师]+[AI] | 全局文档导航：五类载体索引 ＋ 目录作用表。 |
| content/03_doc_system/TERMINOLOGY.md | 2026-11-19 | — | [工程师]+[AI] | 术语表（全仓唯一术语定义源）：20 条 × 9 字段；`OPERATIONS_GUIDE §19` 与 `sop/INDEX.md` 只留指针。 |
| content/03_doc_system/SSOT_INDEX.md | 2026-09-15 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-25 批次 179（`P.16` 第三批）**：正文**整体并入** `content/03_doc_system/ |
| content/03_doc_system/SERVICE_CATALOG.md | 2026-09-20 | — | [工程师]+[AI] | 🗑️ 已删除（正文并入 `ARCHITECTURE.md` **§十一 统一服务目录与角色-服务权限矩阵**）。沿革见 `.ctx/logs/`。 |
| content/03_doc_system/README.md | 2026-10-27 | — | [工程师]+[AI] | 03_doc_system 目录索引（文件清单含 `INFORMATION_COMPUTATION.md`，权威源与派生同步）。 |
| content/03_doc_system/工作模板/经验沉淀辅助提示词.md | 2026-09-26 | — | [工程师]+[AI] | 沉淀辅助 |

## content/04_web_design/ (设计理念层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/04_web_design/design-system/DESIGN_SYSTEM.md | 2026-11-21 | — | [工程师]+[AI] | 父索引：§一 设计哲学 ＋ 编目（原则 4 补「点缀色不单独承担状态语义」）。 |
| content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md | 2026-11-10 | — | [工程师]+[AI] | 第一编 色彩与主题（§2.13 补图标状态色互指句）。 |
| content/04_web_design/design-system/DS_02_TYPE_AND_SIZE.md | 2026-11-04 | — | [工程师]+[AI] | 第二编 排版与尺寸（增正文/说明边界与棘轮）。 |
| content/04_web_design/design-system/DS_03_COMPONENTS.md | 2026-11-21 | — | [工程师]+[AI] | 第三编 组件；2026-11-20 卡厚度改准为 16 / 12 两档（`.card-standard` / `.card-compact`），`p-5` 退出 |
| content/04_web_design/design-system/DS_04_INTERACTION_AND_RESPONSIVE.md | 2026-11-08 | — | [工程师]+[AI] | 第四编 交互与响应式（P10 三档动效令牌）。 |
| content/04_web_design/design-system/DS_05_MAP_AND_REFERENCE.md | 2026-11-08 | — | [工程师]+[AI] | 第五编 地图与速查。 |
| content/04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md | 2026-11-21 | — | [工程师]+[AI] | 第六编 布局与密度：SD-57 页签密度 46。 |
| content/04_web_design/design-system/README.md | 2026-11-03 | — | [工程师]+[AI] | 设计系统目录索引；文件清单含 DS_06，权威源指向 DESIGN_SYSTEM.md。 |
| content/04_web_design/design-system/CASES.md | 2026-11-21 | — | [工程师]+[AI] | 设计＋数据域判例库：CASE-DESIGN-020…041、CASE-DATA-001（030 边界句改准；036 证据指针随卡头迁移改签）。 |
| content/04_web_design/design-system/COLOR_SYSTEM.md | 2026-09-24 | — | [工程师]+[AI] | 🗑️ **已删除**：正文**整体并入** `content/04_web_design/design-system/DESIGN_SYSTEM.md` 的  |
| content/04_web_design/design-system/COMPONENT_SPEC.md | 2026-09-24 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-24 批次 172**：正文**整体并入** `content/04_web_design/design-syste |
| content/04_web_design/module/ABOUT_PAGE_DESIGN.md | 2026-10-05 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md | 2026-09-20 | — | [工程师]+[AI] | 🗑️ **已删除**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§六 |
| content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md | 2026-11-16 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/evolution/archive/BRANCH_WORK_MAP.md | 2026-11-08 | — | [工程师]+[AI] | 支部工作地图档案（2026-10-28 页签命名改准） |
| content/04_web_design/evolution/archive/DESIGN_METHODOLOGY.md | 2026-11-08 | — | [工程师]+[AI] | 方法论档案（2026-09-26 补行） |
| content/04_web_design/contracts/PARTY_COMMITTEE_DESIGN.md | 2026-11-19 | — | [工程师]+[AI] | 党委治理契约 |
| content/04_web_design/evolution/archive/ROLE_PERMISSION_DESIGN.md | 2026-11-08 | — | [工程师]+[AI] | 权限收敛档案（2026-09-26 补行） |
| content/04_web_design/contracts/WORKFLOW_BLOCK_CONTRACT.md | 2026-11-08 | — | [工程师]+[AI] | 块封装契约（2026-09-26 补行） |
| content/04_web_design/module/PUBLIC_ENTRANCE.md | 2026-11-11 | — | [工程师]+[AI] | 门厅设计已裁定（公开门厅的规范编号 2026-11-10 批次 541 回填为 SD-62）。 |
| content/04_web_design/deploy/WECHAT_INTEGRATION.md | 2026-09-05 | — | [工程师]+[AI] | 🗑️ **已删除**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§五 |
| content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md | 2026-11-11 | — | [用户]+[AI] | 见日志批次 597 |
| content/04_web_design/data/DATA_MODEL.md | 2026-11-19 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/data/DATA_CONTRACT.md | 2026-11-18 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/data/DATA_SEED_CONTRACT.md | 2026-10-27 | — | [工程师]+[AI] | 数据种子契约（四类口径 / 逐表必填 / v12 强约束）；守卫 `server/test/seed-contract-guard.test.mjs`。 |
| content/04_web_design/data/DATA_FLOW.md | 2026-09-23 | — | [工程师]+[AI] | 🗑️ 已删除（正文并入 `DATA_MODEL.md`《数据模型与数据流》）。沿革见 `.ctx/logs/`。 |
| content/04_web_design/data/DATA_ARCHITECTURE.md | 2026-09-03 | — | [工程师]+[AI] | 🗑️ 已删除（正文已拆分至 DATA_MODEL / DATA_FLOW） |
| content/04_web_design/PRODUCT_IA.md | 2026-11-08 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/module/MODULE_UI_DESIGN.md | 2026-10-30 | — | [工程师]+[AI] | 模块界面设计（§一 总览 / §二 党建 Tab / §三 日历 / §四 全站 Tab 总方案＝2026-09-27 规划稿）；四组页签名改准为「总览 / 我 |
| content/04_web_design/module/SOP_WEBSITE_GUIDE.md | 2026-10-30 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/module/AGENDA_AND_REFERENCE_DESIGN.md | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒  |
| content/04_web_design/deploy/DEPLOYMENT_GUIDE.md | 2026-11-18 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/deploy/SERVER_DEPLOY_MANUAL.md | 2026-10-07 | — | [支书]+[运维执行人] | **服务器逐键部署手册**（支书版，2026-10-07 批次 439 新建）：名词卡片（堡垒机/sudo/防火墙/systemd/SFTP/冒烟）＋六步操作（探机 → 防火墙申请填单模板 → SFTP 上传 → 有/无 sudo 双路线安装 → 设口令启动体检 → 空库换壳起步）＋日常三招与出错对照表＋安全两件事。**边界**：只管「做」；「为什么/总览/回滚深度」在 `DEPLOYMENT_GUIDE.md`（姊妹篇互指）。
| content/04_web_design/deploy/AUTHENTICATION_MODEL.md | 2026-09-05 | — | [工程师]+[AI] | 🗑️ **已删除**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§四 |
| content/04_web_design/SCHOOL_IT_DEPLOYMENT.md | 2026-08-27 | — | [工程师]+[AI] | 🗑️ 已删除（计算中心对接全案已并入 DEPLOYMENT_GUIDE §三） |
| content/04_web_design/README.md | 2026-11-08 | — | [工程师]+[AI] | 04 目录索引（六子目录）。 |
| content/04_web_design/contracts/README.md | 2026-11-18 | — | [工程师]+[AI] | 契约类索引 |
| content/04_web_design/contracts/TABLE_COMPONENT_CONTRACT.md | 2026-11-10 | — | [工程师]+[AI] | 见日志批次 597 |
| content/04_web_design/evolution/README.md | 2026-11-11 | — | [工程师]+[AI] | 演进入口索引（新增对象模型与议事流设计行） |
| content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md | 2026-11-14 | — | [工程师]+[AI] | 对象模型与支委会议事流设计（`D-866`–`D-869`）：三层挂靠判据、组长权限矩阵、上会回执状态机、URL 无后缀；对象模型与提案上会已实施。 |
| content/04_web_design/module/README.md | 2026-11-08 | — | [工程师]+[AI] | 模块设计索引 |

## content/05_ai_coding/ (AI 编码层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/05_ai_coding/KNOWN_PITFALLS.md | 2026-09-04 | — | [工程师]+[AI] | 🗑️ 已删除（拆为 05_ai_coding 六篇纪律件） |
| content/05_ai_coding/README.md | 2026-11-03 | — | [工程师]+[AI] | 05_ai_coding 目录索引（含 `TAB_AUDIT_PLAYBOOK.md` 行）。 |
| content/05_ai_coding/AGENTS.md | 2026-11-01 | — | [工程师]+[AI] | 05 目录协作说明：Q 范围 Q-01…Q-22、分层裁决与验证命令。 |
| content/05_ai_coding/PARALLEL_SKILL_AUDIT.md | 2026-11-03 | — | [工程师]+[AI] | 多代理独立审查操作手册（H21 详版）：问题集 Q-01…Q-22 → 分 lens → 汇总 → 裁定；§11 IA 审查、§14 SKILL 路由。 |
| content/05_ai_coding/CASES.md | 2026-11-21 | — | [工程师]+[AI] | AI 协作判例库。 |
| content/05_ai_coding/CONTEXT_MANAGEMENT.md | 2026-11-15 | — | [工程师]+[AI] | （**批次 205 补行**：本表原无其行，本批补行；日期＝其 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿。* |
| content/05_ai_coding/DOCUMENT_GOVERNANCE.md | 2026-11-19 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒  |
| content/05_ai_coding/FILE_OPERATION_RULES.md | 2026-11-03 | — | [工程师]+[AI] | （**批次 205 补行**：本表原无其行，本批补行；日期＝其 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿。* |
| content/05_ai_coding/REVIEW_AND_EXPRESSION.md | 2026-10-24 | — | [工程师]+[AI] | （**批次 205 补行**：本表原无其行，本批补行；日期＝其 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿。* |
| content/05_ai_coding/TEST_AND_VERIFICATION.md | 2026-11-20 | — | [工程师]+[AI] | 测试三层（daily/precommit/weekly）；2026-11-03 增两条判例；2026-11-19 增 sample-diff 四条判例（缺证据即 |
| content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md | 2026-11-19 | — | [工程师]+[AI] | 页签审计手册（2026-11-02 建）：五维检查表、P0–P2、例外口径、怎么跑、怎么加检查与页签、报告字段；判据回链 DS_06 §五与 `audit/se |
| content/05_ai_coding/UI_REVIEW_CHECKLIST.md | 2026-11-08 | — | [工程师]+[AI] | 温层 UI 审查清单（2026-11-03 建）：按 8 组任务组织（版式密度 / 排版字号 / 颜色对比 / 交互无障碍 / 文案空态 / 响应式 / 动效  |
| content/05_ai_coding/AUDIT_CANON.md | 2026-11-19 | — | [工程师]+[AI] | 审计口径唯一表（2026-11-02 建）：四口径裁定（F2 控件行数 / F4 H2 恰 1 / F7 `hasPager()` / C1 `requireA |

## content/insights/ (经验沉淀)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/insights/README.md | 2026-10-24 | — | [用户]+[工程师] | 工程与组织经验学习入口；串联前后端、数据库、权限、测试、部署、架构和 AI 协作方法，并链接权威规范。 |
| content/insights/工程与AI协作的全栈实践.md | 2026-10-22 | — | [用户]+[工程师] | 面向人的全栈工程方法与 AI 协作指南；补入工作台复核中的语义轴拆分例子，规范权威源仍在 03/04/05。 |
| content/insights/党支部管理与实务经验沉淀.md | 2026-10-22 | — | [用户]+[AI] | **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件 |
| content/insights/工程演进与设计方法论.md | 2026-09-04 | — | [用户]+[AI] | 🗑️ 已删除（拆流入 insights 其他文） |

## content/README.md

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| content/README.md | 2026-10-24 | — | [用户]+[AI] | content 目录总索引 |

## server/ (后端服务)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| server/routes/resources/index.js | 2026-11-19 | — | [工程师]+[AI] | 资源路由装配；活动删除保留报名与表决留痕（`D-876`）、其余子记录事务清理，并返回集合版本。**2026-11-14 批次 550（D-872）**：`POST /activities` 写库前冻结表决名单；**批次 552**：`D-876` 留痕口径；批次 569 考察读改请求级缓存；批次 578 版本读写走 `resolveVersionBranchId`（按支部命名空间）。
| content/05_ai_coding/REVIEW_QUESTION_SET.md | 2026-11-03 | — | [工程师]+[AI] | 审查问题集：Q-01…Q-22（Q-22 为页签密度与信息经济的审查方法，执行工具指向 `TAB_AUDIT_PLAYBOOK.md`）。 |
| content/05_ai_coding/QUESTION_HIT_MATRIX.md | 2026-11-03 | — | [工程师]+[AI] | 历史命中矩阵；Q-22 列新立，36 行历史记 `—`。 |
| content/05_ai_coding/GUARD_INVENTORY.md | 2026-11-19 | — | [工程师]+[AI] | 守卫台账；历史总表停 66 件（已滞后），现行件数以 `test-tier-registry.mjs` 为准。 |
| content/03_doc_system/CASES_INDEX.md | 2026-11-21 | — | [工程师]+[AI] | 判例总索引（design 43 / data 1 / ai 9）；CASE-DESIGN-042 / 043 于批次 590 登记。 |
| .ctx/README.md | 2026-11-21 | — | [工程师]+[AI] | 见日志批次 597 |
| .ctx/ACTIVE_CONTEXT.md | 2026-11-22 | — | [AI] | active 投影（≤300 行 / 30KB）：系统现状、现行裁定摘要、风险与下一步、文件地图、保鲜规则；latest_decision `D-906`。 |
| server/README.md | 2026-11-19 | — | [工程师]+[AI] | 见日志批次 597 |
| server/package.json | 2026-11-20 | — | [工程师]+[AI] |  |
| server/package-lock.json | 2026-08-30 | — | [工具] |  |
| server/.gitignore | 2026-09-01 | — | [工具] |  |
| server/data.db | — | — | — | 🗑️ 运行时产物（不入库，.gitignore 忽略） |

## docs/ (前端应用)

### docs/ HTML 页面

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| docs/index.html | 2026-09-30 | — | [用户]+[AI] |  |
| docs/login.html | 2026-10-22 | — | [用户]+[AI] |  |
| docs/about.html | 2026-08-12 | — | [用户]+[AI] |  |
| docs/archive.html | 2026-09-24 | — | [用户]+[AI] |  |
| docs/branch-config.html | 2026-10-18 | — | [工程师]+[AI] |  |
| docs/feedback.html | 2026-07-31 | — | [用户]+[AI] |  |
| docs/help.html | 2026-11-17 | — | [用户]+[AI] |  |
| docs/notice.html | 2026-09-24 | — | [用户]+[AI] |  |
| docs/messages.html | 2026-10-03 | — | [工程师]+[AI] |  |
| docs/search.html | 2026-07-31 | — | [用户]+[AI] |  |
| docs/workspace/secretary.html | 2026-07-31 | — | [用户]+[AI] |  |
| docs/workspace/org.html | 2026-08-23 | — | [用户]+[AI] |  |
| docs/workspace/prop.html | 2026-10-17 | — | [用户]+[AI] |  |
| docs/workspace/disc.html | 2026-07-31 | — | [用户]+[AI] |  |
| docs/workspace/leader.html | 2026-08-23 | — | [用户]+[AI] |  |
| docs/workspace/branch-readonly.html | 2026-10-18 | — | [工程师]+[AI] |  |
| docs/workspace/party-committee.html | 2026-10-18 | — | [工程师]+[AI] |  |
| docs/workspace/visitor.html | 2026-07-31 | — | [用户]+[AI] |  |

### docs/src/core/ (内核层：`base/` · `domain/` · `boot/` · `session/`) · docs/src/data/ (数据形态层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/components/ (组件层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| docs/src/components/person-picker.css | 2026-09-25 | — | [工程师]+[AI] |  |

### docs/src/entries/ (页面入口层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/entries/tabs/ (工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |


### docs/src/entries/tabs/org/ (组织委员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/entries/tabs/prop/ (宣传委员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/entries/tabs/disc/ (纪检委员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/entries/tabs/visitor/ (成员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/entries/tabs/party-committee/ (党委工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/services/ (服务层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/data/mock/ (Mock 数据层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/capabilities/ (能力声明层) · docs/src/components/sections/ (页级板块)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/workflow/ (工作流层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/src/ 其他

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| docs/src/styles.css | 2026-11-10 | — | [工程师]+[AI] |  |
| docs/src/about.css | 2026-09-28 | — | [工程师]+[AI] |  |

### docs/scripts/

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |

### docs/ 其他

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| docs/assets/images/party_emblem.png | 2026-05-21 | — | [用户] |  |
| docs/data/issues.json | 2026-09-17 | — | [工程师]+[AI] |  |
| docs/data/milestones.json | 2026-07-17 | — | [工程师]+[AI] |  |

---

## 周期性任务最后执行时间

| 编号 | 任务 | 最后执行 | 下次到期 | 状态 |
| ------ | ------ | --------- | --------- | ------ |
| W1 | 执行日志扫描 | 2026-10-27 | 待重定 | **已停摆**（自 2026-08 起未按期执行；2026-10-27 批次 515 复核，频率待支书重定） |
| W2 | Emoji 合规扫描 | 2026-10-27 | 待重定 | 同上 |
| W3 | 支书内容评议 | — | — | 待支书触发（非周期） |
| W4 | 专项评议循环 | 2026-10-27 | 按需 | 机制持续（见 `REVIEW_QUEUE` 附录①–⑪） |
| M1 | CLAUDE.md 清理 | 2026-10-27 | 待重定 | 批次 515 已执行；频率待重定 |
| M2 | SNAPSHOT 更新 | 2026-10-27 | 待重定 | 批次 515 已升至 v62；原月度节奏已停摆 |
| M3 | 全仓断链扫描 | 2026-10-27 | 待重定 | 已由 `link-integrity` 守卫常态化承接 |
| M4 | Insights 经验蒸馏 | — | — | 未启用（无排期） |
| M5 | DOCUMENTATION_MAP 审查 | 2026-10-27 | 待重定 | 已由 `docs-governance-guard` 常态化承接 |
| M6 | README 审查 | 2026-10-27 | 待重定 | 已由 `docs-governance-guard` G4 常态化承接 |
| Q1 | ARCHITECTURE 审查 | — | — | 未启用（无排期） |
| Q2 | 角色体系健康度 | — | — | 未启用（无排期） |
| Q3 | SOP 文本审查 | — | — | 未启用（无排期） |
| Y1 | 年度系统审计 | — | — | 未启用（无排期） |

---

## 已删除文件记录

| 原路径 | 删除日期 | 原因 |
|--------|---------|------|
| AI_ENTRYPOINT.md | 2026-05-01 | 内容已合并至 ARCHITECTURE.md |
| .ctx/COMPLETED_TASKS.md | 2026-05-02 | 日志已覆盖，汇总表删除 |
| .ctx/PENDING_MODIFICATIONS.md | 2026-05-02 | 内容整合至 CLAUDE.md |
| .ctx/SUSPENDED_ISSUES.md | 2026-05-02 | 内容整合至 CLAUDE.md |
| .ctx/WATCH_LOG.md | 2026-05-02 | 全部已解决，验证后删除 |
| .ctx/AI_CONTEXT.md | 2026-05-02 | 内容已整合至 .ctx/ 审计底座 |
| .ctx/REVIEW_STATE.md | 2026-05-02 | 内容已整合至 .ctx/ 审计底座 |
| .ctx/SNAPSHOT_v1.3_20260327.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.0_20260401.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.1_20260406.md | 2026-05-02 | 归档删除，新 v3.0 生成 |
| .ctx/scenarios/*.md | 2026-05-01 | 全部场景文件已评估删除 |
| governance/ | 2026-05-01 | 迁移至 .ctx/ 后整合 |
| backlog/ | 2026-05-01 | 迁移至 .ctx/ 后整合/删除 |
| knowledge/ | 2026-05-01 | 迁移至 content/sop/ |
| docs/ | 2026-05-01 | 迁移至 content/guides/ + content/insights/ |
| 参考资料/ | 2026-05-01 | 迁移至 content/references/ |
| content/guides/SOP数据映射与同步指南.md | 2026-05-02 | 已合并至 SOP_WEB_GUIDE.md |
| content/guides/COMMISSIONER_ORGANIZATION_ROLE.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/guides/COMMISSIONER_GROUP_INTERACTION.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/governance/LAYERING_FRAMEWORK.md | 2026-07-09 | 独有内容合并至 OPERATIONS_GUIDE.md §1.3/§1.4 + KNOWN_PITFALLS.md §7 + RECURRING_TASKS.md Q4 |
| content/governance/TERMINOLOGY.md | 2026-07-12 | 已合并至 OPERATIONS_GUIDE.md §19（术语使用规范；原 USAGE_POLICY.md §一，2026-09-26 批次 202 并入） |
| content/governance/EMOJI_POLICY.md | 2026-07-12 | 已合并至 OPERATIONS_GUIDE.md §21（Emoji 使用规范；原 USAGE_POLICY.md §三，2026-09-26 批次 202 并入） |
| content/governance/RECURRING_TASKS.md | 2026-07-12 | 已合并至 OPERATIONS_GUIDE.md §17（周期性任务与自动唤醒机制） |
| content/governance/SYNC_EXTERNAL.md | 2026-07-11 | 已合并入 OPERATIONS_GUIDE.md §16 |
| content/governance/AGENT_HANDBOOK.md | 2026-07-03 | Agent 操作手册（废弃） |
| content/governance/AGENT_USAGE.md | 2026-07-03 | Agent 使用指南（废弃） |
| content/strategy/MANAGE_SERVE.md | 2026-07-14 | 改名为 DEVELOPMENT_PATH.md |
| content/strategy/README.md | 2026-07-14 | 目录迁至 content/01_strategy/ |
| content/strategy/FLAT_DESIGN.md | 2026-07-14 | 迁至 content/02_institution/FLAT_DESIGN.md |
| content/strategy/COMMISSIONER_FRAMEWORK.md | 2026-07-14 | 迁至 content/02_institution/COMMISSIONER_FRAMEWORK.md |
| content/sop/ | 2026-07-14 | 迁至 content/02_institution/sop/ |
| content/design/ | 2026-07-14 | 迁至 content/04_web_design/ |
| content/governance/ | 2026-07-14 | 迁至 content/03_doc_system/ |
| content/references/ | 2026-07-14 | 迁至 content/01_strategy/references/ |
| src/ (根目录) | 2026-07-14 | 迁至 docs/src/（目录结构重组） |
| index.html (根目录) | 2026-07-14 | 迁至 docs/index.html |
| content/references/工作模板/FEEDBACK_FORM.md | 2026-07-18 | 系统已有 feedback.html 在线反馈功能，模板冗余 |
| docs/superpowers/ | 2026-07-18 | 过程文件目录删除 |
| .ctx/tmp/ | 2026-07-18 | 空目录删除 |
| .superpowers/ | 2026-07-18 | 空目录删除 |
| .tools/ | 2026-07-18 | 空目录删除 |
| src/party.js | 2026-07-21 | 迁至 docs/src/modules/party.js |
| src/main.js | 2026-07-21 | 拆分为 docs/src/entries/pages/main-entry.js |
| src/state.js | 2026-07-21 | 迁至 docs/src/core/base/state.js |
| src/events.js | 2026-07-21 | 事件逻辑分散至各 entry 文件 |
| src/calendar.js | 2026-07-21 | 迁至 docs/src/components/record/calendar.js |
| src/inspector.js | 2026-07-21 | 迁至 docs/src/components/record/inspector.js |
| src/references.js | 2026-07-21 | 迁至 docs/src/components/sections/references.js |
| src/domain.js | 2026-07-21 | 迁至 docs/src/core/domain/domain.js |
| src/constants.js | 2026-07-21 | 迁至 docs/src/core/domain/constants.js |
| src/utils.js | 2026-07-21 | 迁至 docs/src/core/base/utils.js |
| src/id.js | 2026-07-21 | 迁至 docs/src/core/base/id.js |
| src/service.mock.js | 2026-07-21 | 迁至 docs/src/services/core/mock.js |
| src/service.runtime.js | 2026-07-21 | 迁至 docs/src/services/core/runtime.js |
| src/styles.css | 2026-07-21 | 迁至 docs/src/styles.css |
| assets/ | 2026-07-21 | 迁至 docs/assets/ |
| .vscode/ | 2026-07-21 | 工具配置删除 |
| ARCHITECTURE.md (根目录) | 2026-07-21 | 迁至 content/03_doc_system/ARCHITECTURE.md |
| content/insights/党支部管理与实务经验沉淀.md (旧路径 content/strategy/...) | 2026-07-21 | 目录重组，路径不变但旧引用过时 |
| docs/members.html | 2026-08-02 | T-189 删除，项目赋权迁入支书工作台「赋权管理」tab |
| docs/src/entries/members-entry.js | 2026-08-02 | 随 members.html 删除 |
| docs/src/data/mock/party.js | 2026-07-29 | v13 角色单页制重构移除 party/ 体系 |
| docs/src/modules/party.js | 2026-07-29 | v13 角色单页制重构移除 party/ 体系 |
| docs/src/components/party-cross-nav.js | 2026-07-29 | v13 角色单页制重构移除 |
| docs/src/workflow/activityRecord.js | 2026-07-29 | v13 角色单页制重构移除 |
| docs/src/services/assignment.js | 2026-07-29 | v13 数据同源迁移（AuthStore→mockDB.authorizations） |
| docs/src/services/permission-manager.js | 2026-07-29 | v13 权限体系重构移除 |
| docs/superpowers/ | 2026-08-04 | 过程文件目录删除（specs 6 + plans 4，共 10 文件） |
| .trae/ | 2026-08-04 | 过程文件/脚本清理（specs 7 目录 + documents 1 + skills 空目录） |
| .vscode/settings.json | 2026-08-04 | 个人 IDE 配置删除（引用已不存在的 .github/skills 与 .vibe_context） |
| .superpowers/ | 2026-08-04 | brainstorm 会话过程文件删除 |
| .tools/ | 2026-08-04 | 一次性修复脚本删除（_fix_*.py ×4） |
| .ctx/audit/ | 2026-08-04 | 空目录删除 |
| server/uploads/ | 2026-08-04 | 空目录删除（uploads.js 运行时自动重建） |
| docs/src/services/handover.js | 2026-08-06 | T-224 废除数据交接 |
| docs/assets/vendor/gsap.min.js | 2026-09-29 | **零引用死资产**：支书 2026-08-14 裁决「gsap 是最大的害群之马」后 `about.html` 已删其引用（页面改 CSS `animation-timeline: view()` + 原生滚动，`DESIGN_SYSTEM.md` 已立「规避 JS 动画库」口径）；全仓 grep `gsap` 仅剩该关闭注释与历史日志 ⇒ 删（**72,214 B**；批次 265） |
| docs/assets/vendor/ScrollTrigger.min.js | 2026-09-29 | 同上（随 `gsap.min.js` 同批删；**43,380 B**；批次 265） |

## 代码文件（按需登记：只登改动频繁的核心件；其余以 git 为准）

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
| --------- | ------------- | -------- | ------ | ------ |
| server/server.js | 2026-09-02 | — | [工程师]+[AI] | 启动入口（node server.js，默认端口 3000） |
| server/app.js | 2026-11-15 | — | [工程师]+[AI] | createApp 工厂 + JSON 错误中间件。**批次 |
| server/db.js | 2026-10-23 | — | [工程师]+[AI] | 当前 schema v12：v12 删 `issue_rev |
| server/seed.js | 2026-10-23 | — | [工程师]+[AI] | **（2026-09-28 批次 234 去冗余：删去本文件 |
| server/routes/auth.js | 2026-11-19 | — | [工程师]+[AI] | 登录/token/me；登录固化 `sessions.bra |
| server/routes/member.js | 2026-11-20 | — | [工程师]+[AI] | 成员与个人档案语义接口；发展对象硬门 ＋ 副支书 roste |
| server/routes/committee.js | 2026-11-14 | — | [工程师]+[AI] | 议题投票写口；匿名参与记录与 tally 原子提交、重复提交 |
| server/routes/resources/branch-scope.js | 2026-11-19 | — | [工程师]+[AI] | 服务端支部范围判定（行级 / 请求级 / 版本命名空间单一入 |
| server/routes/resources/deputy-policy.js | 2026-11-20 | — | [工程师]+[AI] | 副支书操作权服务端入口（`requireSecretaryA |
| server/routes/resources/workgroup-routes.js | 2026-10-23 | — | [工程师]+[AI] | 工作组语义 API；成员与权限全量替换在单事务内校验、写入并 |
| server/routes/resources/signup-write-guard.js | 2026-10-17 | — | [工程师]+[AI] | 报名创建/状态转换/快照统一校验；主题党日线下选择、普通参与 |
| server/routes/uploads.js | 2026-11-19 | — | [工程师]+[AI] | 附件上传（jpg/png/pdf/docx/xlsx，≤10 |
| server/services/reporting.js | 2026-10-14 | — | [工程师]+[AI] | 报表活动人数：分配成员与已通过、未作废报名按 `person |
| server/services/logger.js | 2026-11-15 | — | [工程师]+[AI] | 结构化请求日志（请求 id / 路由 / 状态 / 耗时 / |
| server/routes/health.js | 2026-11-15 | — | [工程师]+[AI] | `GET /api/v1/health/deep` 深健康检 |
| docs/src/core/boot/bootstrap.js | 2026-09-29 | — | [工程师]+[AI] | 引导启动（主题色 resolveAccentRole；hea |
| docs/src/core/boot/registry.js | 2026-09-29 | — | [工程师]+[AI] | 能力注册表三原语（`registerCapability` |
| docs/src/core/domain/constants.js | 2026-10-22 | — | [工程师]+[AI] | 静态常量；新增正式会议名单单一判据 `usesFormalM |
| docs/src/core/session/cross-page-state.js | 2026-09-29 | — | [工程师]+[AI] | 跨页状态（版本化 `CODE_VERSION`；`docs/ |
| docs/src/data/data-loader.js | 2026-09-29 | — | [工程师]+[AI] | 数据加载 |
| docs/src/data/data-adapter.js | 2026-11-17 | — | [工程师]+[AI] | **（现状）** 数据源切换与装配（mock / api 双 |
| docs/src/core/session/login-snapshot.js | 2026-09-29 | — | [工程师]+[AI] | 登录快照轻量读取（零依赖，静态页登录态感知壳用） |
| docs/src/data/api-adapter.js | 2026-11-17 | — | [工程师]+[AI] | API REST 适配器；批次 504 直连写后推进版本基线 |
| docs/src/data/mock-adapter.js | 2026-10-23 | — | [工程师]+[AI] | Mock 模式适配器；旧活动/专班种子幂等建立工作组映射，成 |
| docs/src/data/workgroup-seed-sync.js | 2026-10-23 | — | [工程师]+[AI] | 旧 mock 活动/专班工作组兼容映射；冲突关联不猜测，清除 |
| docs/src/core/domain/domain.js | 2026-10-23 | — | [工程师]+[AI] | 领域模型（2026-09-21 批次 120：`ImageR |
| docs/src/core/domain/capability-packages.js | 2026-10-16 | — | [工程师]+[AI] | 业务能力包目录：制度依据、适用范围、配置权与依赖元数据。 |
| docs/src/core/domain/party-overview.js | 2026-10-18 | — | [工程师]+[AI] | 党委概况待处理队列与异常计数的纯领域投影。 |
| docs/src/core/domain/workgroup-policy.js | 2026-10-17 | — | [工程师]+[AI] | 工作组角色集合与活动/专班权限建议模板的共享策略单一源。 |
| docs/src/core/base/icons.js | 2026-09-29 | — | [工程师]+[AI] | 图标系统（含 upload 上传图标） |
| docs/src/core/base/id.js | 2026-09-29 | — | [工程师]+[AI] | UUID 发生器 |
| docs/src/core/base/page-url.js | 2026-11-11 | — | [工程师]+[AI] | 站内页面 URL 单一解析：按 `document.base |
| docs/src/core/base/link-normalize.js | 2026-11-11 | — | [工程师]+[AI] | 站内链接运行时归一：初始 DOM 与新增节点去 `.html |
| docs/src/core/domain/policy-defaults.js | 2026-11-20 | — | [工程师]+[AI] | 业务默认值单一源；2026-11-20 增 `role.de |
| docs/src/core/base/state.js | 2026-09-29 | — | [工程师]+[AI] | 全局状态 |
| docs/src/core/base/utils.js | 2026-10-05 | — | [工程师]+[AI] | 通用工具 |
| docs/src/core/domain/work-map.js | 2026-10-06 | — | [工程师]+[AI] | 支部工作地图的**代码单一源**：`WORK_MAP_MOD |
| docs/src/services/branch/config-clean.js | 2026-09-29 | — | [工程师]+[AI] | 支部 config 净化唯一实现（**2026-09-22 |
| docs/src/components/shell/header.js | 2026-10-18 | — | [工程师]+[AI] | 页头组件（未读角标 / 主题色标签；数据层按需加载 ＋ st |
| docs/src/components/governance/org-setup-wizard.js | 2026-10-22 | — | [工程师]+[AI] | 换组织向导的嵌入配置模式使用分区导航、单一活动面板和窄屏切换 |
| docs/src/components/governance/branch-roster-import-panel.js | 2026-10-18 | — | [工程师]+[AI] | 支部配置中的名册导入与校验面板。 |
| docs/src/components/shell/sidebar.js | 2026-10-03 | — | [工程师]+[AI] | 侧边栏组件（字号+主题色设置；AuthStore 按需加载 |
| docs/src/components/record/calendar.js | 2026-09-30 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——` |
| docs/src/components/record/inspector.js | 2026-10-03 | — | [工程师]+[AI] | 检查器组件（产出物区 / 分类型关闭条件；待批块按档位分流、 |
| docs/src/components/ui/modal.js | 2026-10-28 | — | [工程师]+[AI] | 模态框组件（`NUDGE_TEXTS` 含 `todo-ur |
| docs/src/components/shell/tab-bar.js | 2026-10-22 | — | [工程师]+[AI] | 标签栏组件（tab 声明 / 懒加载渲染 / **陈旧渲染纠 |
| docs/src/components/record/todo-list.js | 2026-10-05 | — | [工程师]+[AI] | 待办列表组件（E2 flow 内嵌小字） |
| docs/src/components/governance/signup-panel.js | 2026-10-17 | — | [工程师]+[AI] | 活动/专班共用报名面板；主题党日组织者/深度参与者需明确线下 |
| docs/src/components/governance/work-overview.js | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-26 批次 205–207：本表原无其 |
| docs/src/components/feedback/issue-detail.js | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——` |
