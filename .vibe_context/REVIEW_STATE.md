# REVIEW STATE — Single Source of Truth

> **Role:** Tracks all code-modification progress across sessions.  
> **Update policy:** Updated at step 5 of the SOP after every atomic change.  
> **Reading policy:** Always re-read this file at the start of every session (SOP step 2).  
> **Source:** Logic migrated from `_review/书记审阅记录.md` (审阅日期 2026-02-17, 书记储子禾).

---

## 📐 指令维度说明 (Directive Dimensions)

> This taxonomy governs how every constraint, rule, and issue is classified and inherited across sessions and scenarios.

| Dimension | Definition | Storage |
|-----------|-----------|---------|
| **Permanent Principles (永久原则)** | Bottom-layer constitutional rules written into `WORKFLOW_MASTER.md` (e.g., Occam's Razor anti-formalism). These **always** apply regardless of scenario, operation mode, or scope. They cannot be suspended by scenario files. | `WORKFLOW_MASTER.md` → `### Permanent Design Principles` |
| **Global Constraints (全局通用约束)** | Business rules that affect **all** activities and all scenarios (e.g., 考察档案 归组织委员, 意见反馈平台 归纪检委员). Active in both Strict and Sandbox modes. | `REVIEW_STATE.md` → Watchlist / Suspended Issues with `[Global]` tag |
| **Role/Delegation Constraints (职务分工约束)** | Adjustments to specific committee member responsibility boundaries. A sub-class of Global Constraints that specifically governs **who** does **what**. | `REVIEW_STATE.md` → Watchlist with `[Global]` tag + role annotation |
| **Scenario-Specific Constraints (特定场景约束)** | Rules that only apply within a specific activity type or scenario (e.g., 场景1 A/B classification rules). Suppressed in Sandbox mode when working on unrelated scenarios. | `REVIEW_STATE.md` → Watchlist / Suspended Issues with `[Scenario-X Only]` tag |

---

## ⚙️ Current Operation Mode: **[Sandbox]**

> 当处于 **Sandbox** 模式处理新场景（如场景2–9）时，仅继承 `[Global]` 级的 W/H 约束，暂不合并 `[Scenario-1 Only]` 的约束，避免特殊性与普遍性混淆。  
> 切换至 **Strict** 模式时，所有 W/H 约束（包括 Scenario-Specific 项）均对当前任务生效。

---

## 📊 Overall Progress

| Category | Total | ✅ Done | 🔄 In Progress | ⏳ Pending |
|----------|-------|---------|---------------|-----------|
| Pending Modification Tasks | 14 | 13 | 0 | 1 |
| Agent Watchlist Issues | 5 | 5 | 0 | 0 |
| Suspended Issues (DO NOT TOUCH) | 3 | 2 | — | 1 |
| Vibe Coding Milestones | 1 | 1 | 0 | 0 |

---

## 🗂️ Scenario Execution Status

| Scenario | File | Status | Last Updated | Notes |
|----------|------|--------|-------------|-------|
| Activity Rules Enforcement | `scenarios/activity_rules_enforcement.md` | ⏳ Pending | — | 主场景：场景1 A/B类拆分 |
| SOP Restructuring | `scenarios/sop_restructuring.md` | ⏳ Pending | — | 依赖 Activity Rules 完成后执行 |
| YAML Metadata Fix | `scenarios/yaml_metadata_fix.md` | ✅ Done | 2026-02-21 | 5个根节点文件已注入frontmatter |

---

## ✅ Pending Modification Tasks

> Extracted from `_review/书记审阅记录.md` 场景1 逐条修改意见.  
> Execute via scenario `activity_rules_enforcement.md` or `sop_restructuring.md` as indicated.

### 🔴 高优先级

- [x] **修改1**｜场景1 拆分为 1A 和 1B 两个子流程 — 在`流程指南/常见工作场景快速指南.md`中将场景1保留为总入口并新增1A（组织生活会）、1B（灵活学习活动）子流程；`工作流程图-定人定责定岗.md`第3节同步拆分（流程图待下一轮更新）
- [x] **修改2**｜补充 A 类活动（组织生活会）的12步标准程序 — 含会前谈心、对照检查、签到、自评互评、会议记录归档、宣传产出；需核查`参考资料/官方文件/`中条例原文
- [x] **修改3**｜补充 B 类活动（灵活学习活动）的11步完整流程 — 含活动发起两种路径、组长审批、联系块块、实施、复盘、归档

### 🟡 中优先级

- [x] **修改4**｜宣传规范统一说明 — 在`流程指南/宣传委员工作流程指南.md`中增加「按活动类型的宣传规范」章节，明确A类（摘要+配图）与B类（活动摘要+配图）差异；两者均不需要宣传预热
- [x] **修改6**｜活动方案报备须过组长 — B类流程增加「组长审批」节点（Step 2）；A类由组长/书记发起天然包含审批
- [x] **修改7**｜时间线补充 — B类流程表格增加「时间节点」列；外出活动标注「2天前建群+人员到位」硬性要求；复盘1周内
- [x] **修改8**｜补充模板链接 — 场景1A链接`申报材料模板/工作记录类/党支部工作记录.docx`；场景1B链接`活动复盘/活动复盘模板.md`和`申报材料模板/其他模板/活动总结模板.md`
- [x] **修改9**｜补充活动当天Check清单 — B类Step 7后附室内清单（签到/拍照≥3张/活动记录/材料收齐）和外出清单（人员清点/安全须知/交通确认/拍照/返回清点）
- [x] **修改10**｜A类活动产出物清单 — 场景1A末尾增加checklist（会议记录/签到表/对照检查材料/宣传摘要+配图）
- [x] **修改11**｜B类活动考勤定性 — 明确写出「弹性考勤」；组织者和深度参与者出席必须；一般参与者以鼓励为主

### 🟢 低优先级

- [x] **修改5**｜"深度参与者"/"组织者"概念不需要重新定义 — 首次出现时标注「详见[纪检委员工作流程指南]」；概念仅针对党员（中共党员和预备党员）
- [x] **修改12**｜跨组参与规则 — B类注意事项中增加：优先本组→限额未满可邀他组→普通参与者一并考勤；⚠️ 标记悬置问题H1
- [x] **修改13**｜外出活动特殊注意事项 — 场景1B注意事项新增：用车双轨制（京内大巴→学生党建中心；出京→特事特办）；经费全部书记审批（无免批额度）；解锁H4
- ⏸️ **修改14**｜品牌活动与非品牌活动发起方式 — 场景8增加两种路径（有品牌→组长招募；无品牌→支书及组长沟通低成本活动）；场景1B「活动发起」步骤简要提及 ⚠️ **[悬置]** 新年工作起步阶段，依据实际运行情况再行调整

---

## 🔍 Agent Watchlist（块块委员分工优化 — 修改时必须核查并反馈）

> Extracted from `_review/书记审阅记录.md` §「块块委员分工优化反馈」.  
> When any of these conflicts is encountered during execution, **flag it explicitly** in this table before proceeding.  
> **Sandbox mode:** Only `[Global]` items are inherited when working on scenarios 2–9.

| # | Scope (作用域) | 监查问题 | 涉及文件 | 状态 |
|---|---------------|---------|---------|------|
| W1 | `[Global]` | **考察档案归属**：2026年2月已将考察档案从纪检委员转给组织委员，需确保所有文件一致（不得出现纪检负责考察档案的表述） | `组织委员工作流程指南.md` / `纪检委员工作流程指南.md` | ✅ 已解决（Session 9：常见工作场景快速指南场景3+6、纪检委员指南TOC修正） |
| W2 | `[Global]` | **意见反馈平台负责人**：当前文档中部分写纪检委员、部分写组织委员，需统一为同一负责人 | `常见工作场景快速指南.md` / `组织委员工作流程指南.md` / `纪检委员工作流程指南.md` | ✅ 已解决（Session 9：统一为纪检委员，纪检指南恢复§4.2，支委说明/README同步更新） |
| W3 | `[Scenario-1 Only]` | **宣传委员角色差异**：A类活动宣传委员以「档案归档」为主；B类活动宣传委员以「指导宣传负责人」为主；两种角色不应混用 | `宣传委员工作流程指南.md` | ✅ 已解决（Session 5，新增 §3.0） |
| W4 | `[Scenario-1 Only]` | **块块委员触发时机差异**：A类活动纪检委员考勤为刚性全程参与；B类为弹性。此差异须体现在各委员工作手册中 | `纪检委员工作流程指南.md` | ✅ 已解决（Session 12：纪检指南明确A类三会一课刚性/B类极简备忘录机制，§2.4新增，§1.1表格更新）|
| W5 | `[Scenario-1 Only]` | **快速卡片未更新**：`_quick_cards/card-01-组织活动.md` (last_updated 2026-02-17) 使用简化5步流程，未反映Session 4引入的A类/B类（1A/1B）拆分。其他卡片亦需核查 | `_quick_cards/card-01-组织活动.md`（其他卡片待查） | ✅ 已解决（Session 9：彻底重写为A/B双路径卡片） |

---

## ⏸️ Suspended Issues — DO NOT TOUCH

> Extracted from `_review/书记审阅记录.md` §「悬置问题清单」.  
> **STRICT CONSTRAINT: The Agent MUST NOT modify or attempt to resolve these issues in any session until explicitly unlocked by the 书记.**  
> **Sandbox mode:** Only `[Global]` items are inherited when working on scenarios 2–9.

| # | Scope (作用域) | 问题 | 涉及文件 | 悬置原因 |
|---|---------------|------|---------|---------|
| H1 | `[Scenario-1 Only]` | ~~跨组参与时，组织者的考察如何协同？~~ | `纪检委员工作流程指南.md` / `常见工作场景快速指南.md` | **✅ Session 19 已解决**：全支部纪检委员仅一人；跨组活动按统一记录机制处理，移交组织委员归档。 |
| H3 | `[Global]` | 党小组工作手册（条条委员专用）尚未建设 | 待新建文件 | 本轮先通过SOP规定条条职责 |
| H4 | `[Scenario-1B Only]` | ~~**外出活动经费审批链路不明**~~ | `流程指南/常见工作场景快速指南.md` / `流程指南/工作流程图-定人定责定岗.md` | **✅ Session 19 已解决**：书记裁定——所有外出或活动经费，不设免批额度，全部须由书记本人经手审批、支付及报销。规则已写入场景1B注意事项及流程图。 |

---

## 🐛 AI-Identified Issues

| # | File | Line | Severity | Description | Status |
|---|------|------|----------|-------------|--------|
| — | — | — | — | _(None identified yet)_ | — |

---

## 📋 Session Log

| Session # | Date | Scenario | Changes Made | Outcome |
|-----------|------|----------|-------------|---------|
| 0 | 2026-02-21 | — | Initialized `.vibe_context/` architecture | ✅ Done |
| 1 | 2026-02-21 | yaml_metadata_fix | Injected YAML frontmatter into 5 root node files | ✅ Done |
| 2 | 2026-02-21 | — | Migrated `_review/书记审阅记录.md` → REVIEW_STATE; upgraded WORKFLOW_MASTER to v1.1; replaced generic scenarios with domain-specific scenarios; deleted `_review/` | ✅ Done |
| 3 | 2026-02-21 | sop_restructuring | Added `## 🤖 AI 协同工作流` section to `START_HERE.md`; includes Standard Invocation Prompt and Review Inbox workflow in Chinese | ✅ Done |
| 4 | 2026-02-21 | yaml_metadata_fix + activity_rules_enforcement | Phase1: injected YAML frontmatter into 5 more files (_quick_cards/README.md + 申报材料模板/4×README); Phase2: restructured 场景1 into 总入口+1A+1B in 常见工作场景快速指南.md; completed 修改1-3,5-12 | ✅ Done |
| 5 | 2026-02-21 | sop_restructuring | Created EXECUTION_LOG.md; updated WORKFLOW_MASTER SOP Step 6 + Standard Output Templates; added §3.0 按活动类型的宣传规范 to 宣传委员工作流程指南.md; resolved W3 | ✅ Done |
| 6 | 2026-02-22 | — | Added `## 🗺️ Dual-Panel Reference Map` section to WORKFLOW_MASTER v1.3: explicit storage paths, invocation methods, trigger conditions for both panels; 一改俱改 coupling mechanism table + validation gate | ✅ Done |
| 7 | 2026-02-22 | — | Created CONTENT_MAP.md: dual-purpose architecture declaration, annotated Markdown index (25 files), binary file registry (11 files), coverage gap table (G1-G4); added W5 to REVIEW_STATE Watchlist; updated WORKFLOW_MASTER v1.4 (SOP Step 2b + AI Panel storage paths) | ✅ Done |
| 8 | 2026-02-22 | Control Plane Refactoring | Added Operation Mode status bit (Sandbox/Strict) to REVIEW_STATE header; added Scope column to Watchlist (W1-W2→Global, W3-W5→Scenario-1 Only) and Suspended Issues (H1→Scenario-1 Only, H2-H3→Global) | ✅ Done |
| 9 | 2026-02-22 | Global Audit + Debt Resolution + Vision Declaration | Step1: C5/C6 in sop_restructuring+activity_rules_enforcement → dynamic scope-aware; Step2: W1+W2 resolved (6 files updated); Step3: W5 resolved (card-01 rewritten A/B); Step4: Vision declaration added to README.md | ✅ Done |
| 10 | 2026-02-22 | Template Razor & Feedback Channel (H2 Unlocked) | Razor-cut 3 MD templates (活动复盘/活动总结/支部基本信息 v1→v2, -75% lines); created _quick_cards/SOP优化提案反馈卡.md; added feedback card notice to START_HERE.md; H2 removed from Suspended Issues | ✅ Done |
| 11 | 2026-02-23 | Constitution Upgrade & Taxonomy Sync | WORKFLOW_MASTER v1.5: Permanent Principle 5 (Occam's Razor) added; REVIEW_STATE v2.0: Directive Dimensions table added; SOP优化提案反馈卡 v1.1: §1 Scope rewritten to 4-dimension taxonomy | ✅ Done |
| 12 | 2026-02-28 | Role Refactoring & Blind Spot Eradication | Step1: 工作流程图§5+定人定责说明§六场景3 盲区修复（纪检→记录并移交；组织委员→建立档案；倒查法归属更正）; Step2: 组织委员指南v1.1（培训班领队/党委办公室助理/终极归档中心/公域发令边界）; 纪检委员指南v3.1（党日活动指导者/§2.4极简备忘录机制/§1.1表格更新）; Step3: 常见工作场景快速指南v1.4（场景1B Step4公域发令+Step6私域督办+注意事项两条新规则）; W4 ✅ 出清 | ✅ Done |
| 13 | 2026-02-28 | SemVer Enforcement & Terminology Refactoring | Step1: WORKFLOW_MASTER v1.6 — Principle 6 (SemVer严格递增规范) 新增; Step2: 全局命名空间重构 — A类→组织生活会 / B类+灵活学习活动→党小组主题党日活动，涉及8个文件（常见工作场景快速指南v1.5/宣传委员指南v1.3/纪检委员指南v3.2/card-01/反馈卡v1.2/活动复盘模板v2.1/CONTENT_MAP v1.1/scenarios/activity_rules_enforcement）; Step3: REVIEW_STATE v2.2+EXECUTION_LOG 同步 | ✅ Done |
| 14 | 2026-02-28 | Topology Refactoring & Logic Gap Detection | Step1: 工作流程图v1.1→v1.2 — 三大核心骨架重构（骨架I组织生活会/骨架II党日活动含条件分支/骨架III党员发展）；旧§3通用图→骨架I；新增骨架II；旧§5→骨架III（纪检只记录移交）；旧§6党团班一体化→整合入骨架II分支2；旧§4制度建设→重编§6；§1/§2/§7/§8/§10保留并附说明；矩阵§9更新考察档案归属行; Step2: REVIEW_STATE v2.3 — 新增悬置H4（外出经费审批规则）；Suspended Issues 2→3 | ✅ Done |
| 15 | 2026-02-28 | Read & Triage — Priority Decision Inbox | 零业务规则修改。全库深度扫描：提取P0（H1/H3/H4三项悬置，各提供2-3个业务选项）、P1（修改13外出注意事项缺失变量清单、修改14品牌路径缺失变量清单）、P2（六项未触达边缘场景：党员发展异常/预备党员转正异常/组织生活会流程中断/场景4无申诉机制/场景文件状态错位/CONTENT_MAP G1-G2缺口）。Priority Decision Inbox 已在聊天窗口输出供书记决断。 | ✅ Done |
| 16 | 2026-02-28 | Constitution Upgrade: Ripple Sync Protocol | WORKFLOW_MASTER v1.6→v1.7：Step1 新增Principle 7（单一事实来源与衍生品同步，母本/下游衍生品层级+Ripple Sync四步Action）；Step2 一改俱改Coupling表格`SOP text modified in 流程指南/`行升级为含Mandatory Ripple Check的三步规则；Step3 R2新增UNLESS豁免条款（Ripple Sync触发时必须同步所有下游衍生品）；补全Principle 5标题。 | ✅ Done |
| 17 | 2026-02-28 | Global Sync Audit & Remediation | 断点1：宣传委员工作流程指南.md §3.0 TOC条目+标题（Session 13术语替换遗漏，两处仍为"A类/B类"）→已修正；footer版本号v1.1/2026-02-05与YAML v1.3/2026-02-28不符→已同步为v1.4/2026-02-28；文档更新记录补录v1.3条目。断点2：card-01-组织活动.md "A类别忘了"/"B类别忘了"标签→已改为"组织生活会别忘了"/"党小组主题党日活动别忘了"。流程图已核查：无A/B，侯/韩分工正确。card-02至card-05已核查：无旧版分工遗留。 | ✅ Done |
| 18 | 2026-02-28 | Log Rotation & Knowledge Distillation | Step1: 新建 `.vibe_context/logs/` 子目录；原 `EXECUTION_LOG.md` 全量内容归档至 `logs/2026-02-EXECUTION_LOG.md`（status: archived）；原文件改为导航索引；新建 `logs/2026-03-EXECUTION_LOG.md`（活动）。Step2: 新建 `docs/党支部管理与实务经验沉淀.md` v1.0（type: experience_doc）—— 三模块（组织架构权责重构/流程优化/数字化人机协同）+ 决策误区附录，覆盖Sessions 1–18核心管理哲学。Step3: WORKFLOW_MASTER v1.7→v1.8 —— SOP Step 6升级为双子步骤（a日志追加+b经验蒸馏）；AI Data Panel Storage Paths更新月度日志路径；Human Panel Storage Paths新增docs/目录；Validation Gate第2条/Principle 7/一改俱改Coupling表同步更新。 | ✅ Done |
| 19 | 2026-02-28 | Global Resolution & Coverage Completion | Step1(H4解锁): 场景1B注意事项+Check清单新增"经费全部书记审批"规则（无免批额度）；工作流程图H4标注改为✅已解决。Step1(H1解锁): 场景1B注意事项将"悬置问题"替换为明确规则（全支部纪检委员仅一人，跨组按统一机制处理）；纪检委员指南v3.2→v3.3新增§3.1跨组协同机制说明；工作流程图H1标注改为✅已解决。Step2(修改13): 场景1B Check清单用车双轨制细化；注意事项增加用车双轨制与经费审批规则；修改13标记为[x]。Step3a: 组织委员指南v1.1→v1.2新增§5.2材料全案复核权。Step3b: 场景1A注意事项新增"会议时间民主统筹"。Step4a: activity_rules_enforcement.md 16/17个执行步骤标记为[x]（仅修改14 Step12 pending）。Step4b: CONTENT_MAP v1.1→v1.2，6份官方文件（附件11/12/14/15/16/17）补录中文摘要，G1缺口修复。Step5: docs/党支部管理与实务经验沉淀.md v1.0→v1.1，全局匿名化（侯嘉嵘→组织委员/储子禾→书记）。 | ✅ Done |
| 20 | 2026-02-28 | Directory Folding & Global View Synchronization | Step1: 新建 `参考资料/` 目录；`git mv` 将 `官方文件/`、`党小组会/`、`支部委员会/` 三个文件夹整体迁移至 `参考资料/` 内部，文件内容零删减。Step2: 控制面路径重写——WORKFLOW_MASTER.md / CONTENT_MAP.md / REVIEW_STATE.md / activity_rules_enforcement.md 中所有旧路径更新为 `参考资料/官方文件/` 等新路径；CONTENT_MAP §3 新增 `参考资料/` 分区子标题。Step3: 衍生视图刷新——README.md v1.1→v1.2（文件夹表3行合并为1行 `参考资料/`）；START_HERE.md v1.0→v1.1（§5 参考资料路径修正 + A类/B类→正式术语）；CHEATSHEET.md v1.0→v1.1（ASCII路径框 + 文件夹表修正）；流程指南/常见工作场景快速指南.md + 纪检委员指南 + 宣传委员指南 相对路径修复。死链修复清单：`./支部委员会/`→`./参考资料/支部委员会/`（快速指南/纪检/宣传3处）；`./党小组会/`→`./参考资料/党小组会/`（快速指南2处）；`./官方文件/`→`./参考资料/官方文件/`（START_HERE/CHEATSHEET各1处）；控制面共12处路径重写。 | ✅ Done |
| 21 | 2026-02-28 | UX Overhaul & Log Pipeline Recovery | Step1: README.md v1.2→v1.3 全面重构——Persona=新手视角；SOP优化提案反馈卡升至视觉C位（标题正下方Banner）；角色导航精简为表格（块块三委员直接链接）；删除硬编码更新日期；YAML related_files 新增反馈卡路径。Step2: 日志链路强修复——补录 Session 20 完整执行日志（14文件清单）至 .vibe_context/logs/2026-03-EXECUTION_LOG.md；追加本次 Session 21 日志；日志物理路径确认：`.vibe_context/logs/2026-03-EXECUTION_LOG.md`。 | ✅ Done |
| 22 | 2026-03-02 | Agent-on-Agent Audit & Marginal Polish | Step1(README): 降级特征识别——孤立 `> 🔥` 单行 + 弱 `### 👇` 子标题与 CTA 链接视觉断裂；升维修正——整体重构为单一内聚 Blockquote 容器（`> ### 🔥` + 粗体链接 + 说明文），链接占视觉绝对 C 位；YAML `version 1.3→1.4 / last_updated →2026-03-02`。Step2(Log): 确认 Session 20/21 日志已正确写入；修复低阶模型遗漏的 YAML 字段更新（version 1.0→1.2 / last_updated →2026-03-02）；追加 Session 22 本条目。 | ✅ Done |
| 23 | 2026-03-02 | Data Tagging & Legacy Asset Deprecation | Step1: 修改14 悬置（⏸️）——新年工作起步阶段，依据实际运行情况再行调整。Step2: 冗余资产出清——删除 `流程指南/工作流程图-定人定责定岗.md` + `_quick_cards/` 整目录（8文件）；清理 CONTENT_MAP.md（_quick_cards节+流程图行+G3/G4）及 README.md（YAML+表格+CTA）死链；4个流程指南文件中流程图死链同步清理。Step3: 结构化打标——场景1A/1B新增/升级时间锚点列（T-7天→T+7天）；场景1A/1B/2/3/4负责人列注入 `[角色: 党小组组长]`/`[角色: 组织委员]`/`[角色: 宣传委员]`/`[角色: 纪检委员]`/`[角色: 活动组织者]`/`[角色: 深度参与者]` 标签；三位块块委员指南主任务表同步注入角色标签与时间锚点；4个流程指南 YAML version/last_updated 同步更新。 | ✅ Done |
| 24 | 2026-03-02 | High-Fidelity UI Scaffolding & Data Binding |
| 25 | 2026-03-02 | AI-Driven Static Compilation (fetch→hardcode) | 废弃 marked.js + fetch()；app.js 压缩至 38 行纯 DOM 切换器；index.html 硬编码全部业务数据；style.css 新增 .hidden fallback；WORKFLOW_MASTER v1.8→v1.9 AI-Driven Static Generation 宣言 | ✅ Done |
| 26 | 2026-03-02 | Gov-Grade Typography & State Machine Architecture |
| 27 | 2026-03-02 | Domain Router + Vertical Timeline WWH Architecture (v5.0) | Step1: 彻底销毁全部 <table> DOM 元素（7处表格+24张scene-card全部删除）；注入顶层领域分流器（活动建设/组织建设）。Step2: 47个 .timeline-node WWH骨架（tl-spine/tl-dot/tl-line/tl-card/js-expand-trigger/js-expand-target）；10个 scenario-header；scenario 1A(8节点)/1B(9节点)/4(4节点)/8(4节点)→activity；2(6)/3(5)/5(2)/6(2)/7(3)/9(4)→organization。Step3: app.js v5.0 — SSOT {domain,role}；domain-btn+role-btn双轨劫持；renderViews按domain+role双重过滤；js-expand-trigger展开折叠；严禁element.style.*。Step4: style.css v5.0 — 删除sop-table/scene-card；新增timeline专用样式；保留Noto字体栈 | ✅ Done | Step1: style.css v4.0 — font-stheiti/stkaiti/stfangsong 字体类；glass 升级为 bg-white/85 backdrop-blur-xl；cubic-bezier 统一过渡。Step2: index.html 完整重写 — 全站零 Emoji（仅保留 Header ☆）；24 张卡片注入 data-role/data-domain/data-scenario；扁平化 scenes-container；badge-time 边框灰色；badge-role gray-100 胶囊；file-ref 红色仿宋。Step3: app.js v4.0 — SSOT store + setState + renderViews；enterCard/leaveCard 动画；严禁 element.style.*。Step4: 执行日志追加 | ✅ Done | Step1(Tech Stack): 纯静态 SPA 三文件架构 — `index.html`（骨架）+ `app.js`（引擎）+ `style.css`（样式），CDN 引入 Tailwind CSS v3 Play + marked.js v9.1.6，零构建依赖。Step2(UI): 党建红 `#CE1126` 渐变固定 Header（☆党徽占位+系统名称+状态Pill）；左侧5个毛玻璃圆角角色切换按钮（`backdrop-filter:blur(14px)`）；主内容区场景卡片（`rounded-2xl shadow-lg`）。Step3(Parser): `parseSOP()` 按 `\n(?=## )` 分割文档，过滤数字开头场景（9个）；`extractTableGroups()` 逐行扫描追踪 `### / ####` 上下文，提取表格块；每行解析 `[角色:]`/`[时间:]` 标签（支持反引号包裹）；all模式全量 marked.js 渲染+后处理badge；role模式构建精简高亮表格；验证：leader 10节点 / commissioner 16节点 / organizer 6节点 / deep 1节点。Step4(State): CONTENT_MAP.md 注册3个Web文件（index.html/app.js/style.css）；日志追加；REVIEW_STATE.md 更新。 | ✅ Done |
| 29 | 2026-03-02 | Feedback Loop Recovery & sopDatabase Injection | Step1: 重建 `docs/SOP优化提案反馈卡.md` v1.3（原 `_quick_cards/SOP优化提案反馈卡.md` 在Session 23被删除）；含YAML frontmatter + §1四维分类 + §2痛点描述 + §3修改建议 + §4 AI处理区。Step2: 注入 `const sopDatabase` 至 `index.html` script块顶部，提取10个场景（1A/1B/2-9）含steps/role/contact/timing结构。Step3: START_HERE.md 反馈卡链接从 `_quick_cards/` 更新至 `docs/`；CONTENT_MAP.md 新增 docs/ 章节（反馈卡+经验沉淀），index.html条目更新为v6.0描述；app.js/style.css条目移除（已合并入单文件）。 | ✅ Done |

---

**Version:** 3.5  
**Owner:** 储子禾  
**Last updated:** 2026-03-02
