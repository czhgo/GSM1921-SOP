---
title: "文件时间戳注册表"
type: audit_report
role: "[工程师]+[AI]"
last_updated: "2026-10-02"
status: active
dynamic_role:
  maintenance: "[工程师]+[AI]"
  auto_update: "[AI]"
---

# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: "2026-10-02" | 类型: [工程师]+[AI] | 维护方式: 每次文件修改后同步更新
>
> **迁出去向说明（2026-09-17 立）**：本文件原有两条 ⚠ 登记（自身时间戳两处不一的更正经过 / 表刷新已漏做一次），其**更正与登记经过**已于 2026-09-17 **逐字迁出**至 `.ctx/logs/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节。**为什么迁**：本表职能＝「哪些文件在什么时候被谁动过、周期性任务何时到期」（见头下职能声明），「本次怎么改的」是沿革。**现在要查**：① 沿革去上述日志附节；② **补刷已做（2026-09-17 批次 59）**——自身时间戳三值统一为 2026-09-17、表行按「文件最后实质改动日」补刷、僵尸行已修准或标记；**未消残留**（工作树「已改未提交」而在库无改动日记载者）逐行清单见 `.ctx/logs/2026-09-EXECUTION_LOG.md` 批次 59「二」节；③ 逐版沿革见同日志「附：SNAPSHOT 版本沿革」节。

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
|---------|-------------|--------|------|------|
| README.md | 2026-10-05 | — | [用户]+[AI] | 全站门面（定位 / 页面与页签清单 / 支部分工覆盖面 / 测试与发版清单）。**边界**：逐枚页面与逐枚页签的权威源是 `README-server.md` §3.1–§3.2 与 `docs/help.html` §0 / §2，本件只给概览与入口。**为什么**：守卫清单列在此处是 `doc-consistency::S10` 的硬要求（§0.2 引用的守卫必须登记进本清单）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 311）」。 |
| README-members.md | 2026-09-29 | — | [用户]+[AI] | 支部成员版说明（思想汇报篇幅提醒只给本人；组长台考勤上传位按会议类型分；意见反馈含「事项领域 ＋ 建议归口 ＋ 处置归支委会」；匿名口径含「支委层也看不到真身」）。沿革见 `.ctx/logs/`。 |
| README-server.md | 2026-10-05 | — | [用户]+[AI] | 面向**外部后端对接团队**的对接说明书（背景 / 角色 / 板块 / 字段〔**指针**〕/ 部署 / 接口 / 已知限制）。**边界**：**字段级清单的唯一权威源＝母本 `content/04_web_design/data/DATA_MODEL.md`**——§4 自批次 361（`D-752`）起只留「**指针 ＋ 后端增量**」（服务端专有表 ＋ 来源 C 字段 ＋ 行为口径），**不再逐表复刻**。正文 **≥370 处 `文件:行号` 引用**由 `doc-line-ref` 守卫常驻核对（行号随代码位移须**同批改签**）。逐批沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 236）」。 |
| CLAUDE.md | 2026-10-05 | — | [工程师]+[AI] | AI 协作总纲：甲部（通用流程 / 指导思想，H10–H100）＋ 乙部（具体执行事项）＋ 丙部（待决策事项）。**边界**：过程 / 沿革 / 决议**各有其位**（`R-84` / `R-86` / `R-89`），本表不复述；乙部「评议待办 · 执行型」自本批起**只留一句话索引**，69 条原文全量入 `.ctx/logs/**`。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 308）」。 |
| CHECKLIST.md | — | — | — | 🗑️ 已删除（迁移至 content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md） |
| LICENSE | 2026-05-18 | — | [用户] | 开源许可 |
| .gitignore | 2026-09-10 | — | [工具] | Git 忽略 |
| .markdownlint.json | 2026-04-06 | — | [工具] | Markdown 规范 |
| ARCHITECTURE.md | — | — | — | 🗑️ 已删除（迁移至 content/03_doc_system/ARCHITECTURE.md） |
| index.html | — | — | — | 🗑️ 已删除（迁移至 docs/index.html） |

## .ctx/ (审计底座)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| .ctx/TIMESTAMPS.md | 2026-10-02 | — | [工程师]+[AI] | **（本批：4 格加短注）** **（本批：7 格加短注）** **（本批：7 格加短注 ＋ `data-adapter.js` 日期 +2 日；沿革入 `.ctx/logs/`；备注列总字数仍在守卫预算内）** **（本批：无表行新增；⚠ 覆盖缺口如实登记＝`docs/src/workflow/blocks/orchestration.js`（新）· `server/test/block-orchestration.test.mjs`（新）· `docs/src/core/base/module-compose.js`（本批修缺陷）本表原无其行，沿用「只登记不补行」）** **（本批：无表行新增；连带刷卡＝`REVIEW_QUEUE.md`（新增代码健康评审节、日期刷今日）与 `.ctx/logs/2026-09-EXECUTION_LOG.md`（新增两节日志））** **（批次 236：备注列**二轮收敛**（再迁 5 格 ⇒ 合计 157,952 → 71,888 字、最长单格 34,434 → 5,729，预算上限 95,000 → 75,000）；⚠ 覆盖缺口如实登记＝`CHANGELOG.md` · `docs/scripts/release.mjs` · `docs/scripts/version-next.mjs` · `CONTRIBUTING.md` · `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 本表原无其行，沿用「只登记不补行」）** **（批次 235：本表备注列**预算化**——新立 `timestamps-note-guard.test.mjs::N1–N7`（纪律 `CLAUDE.md R-89`）；本行沿革（34,434 字）已整段迁出，见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」A 节；本列自本批起只写**现状 / 边界 / 为什么**，判据＝`CLAUDE.md R-89` ＋ `timestamps-note-guard.test.mjs::N1–N7`）** |
| .ctx/SNAPSHOT.md | 2026-10-03 | — | [AI] | 全仓**目录树与版本号**快照（现 `v55`）。**边界**：目录与版本号的权威源是仓库实况 ＋ `docs/scripts/bump-version.mjs`，本件是**抄本**——与实况不一致即为过期。**为什么**：让「结构 / 版本变化」一眼可见（免每次全树 diff）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 322）」。 |
| .ctx/ACTIVE_RULINGS.md | 2026-10-05 | — | [工程师]+[AI] | **（本批：新立 1 行〔口径行 → 130〕＋ `H-2` 队列行改准）** **（本批：加不入表增量句〔口径行仍 129〕）** **（批次 236：文末加 `R-90` 不入表增量句；口径行仍 129）** **（批次 235：沿革已整段迁出**——本行的逐批沿革（11089 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」B 节；本列自本批起只写**现状 / 边界 / 为什么**，判据＝`CLAUDE.md R-89` ＋ `timestamps-note-guard.test.mjs::N1–N7`）** |
| .ctx/ENGINEERING_ASSESSMENT.md | 2026-09-29 | — | [工程师]+[AI] | 工程评估台账（对 harness / 测试 / 文档 / 代码健康的**打分与评估**）。**边界**：只承载「打分与评估」，决议 / 过程 / 沿革分别归月度决策日志与执行日志（`R-84` / `R-86`）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 308）」。 |
| .ctx/REVIEW_QUEUE.md | 2026-10-05 | — | [工程师]+[AI] | **（本批：`H-1`／`H-2` 已裁）** **（本批：`H-3` 收讫）** **（批次 237：新增一节「**代码健康综合评审**」＝8 条发现 `H-1`…`H-8`（`P0` 1 / `P1` 4 / `P2` 1 / `P3` 2；**待支书定 3 条**）；**不进「（一）逐条归组」表** ⇒ 队列在册数不受影响，`S14` 复跑全绿）** **（批次 235：沿革已整段迁出**——本行的逐批沿革（5967 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」E 节；本列自本批起只写**现状 / 边界 / 为什么**，判据＝`CLAUDE.md R-89` ＋ `timestamps-note-guard.test.mjs::N1–N7`）** |
| .ctx/snapshots/INDEX.md | 2026-07-11 | — | [工程师]+[AI] | 快照历史索引 |
| .ctx/snapshots/SNAPSHOT_v3_20260502.md | 2026-08-05 | — | [工程师]+[AI] | v3 快照 |
| .ctx/logs/EXECUTION_LOG_INDEX.md | 2026-10-02 | — | [工程师]+[AI] | 日志索引（2026-09-19 补 2026年08月 / 09月 T 条目表） |
| .ctx/logs/DECISION_LOG.md | 2026-10-05 | — | [工程师]+[AI] | **（批次 236：沿革已整段迁出**——本行的逐批沿革（3828 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 236）」；本列只写**现状 / 边界 / 为什么**）** |
| .ctx/logs/archive/2026-02-EXECUTION_LOG.md | 2026-02-28 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-03-EXECUTION_LOG.md | 2026-03-02 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-04-EXECUTION_LOG.md | 2026-04-01 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-05-EXECUTION_LOG.md | 2026-05-22 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-05-DECISION_LOG.md | 2026-07-31 | 2026-07-31 | [工程师]+[AI] | 5月决策日志 |
| .ctx/logs/archive/2026-06-EXECUTION_LOG.md | 2026-07-01 | 2026-07-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/archive/2026-06-DECISION_LOG.md | 2026-07-01 | 2026-07-31 | [工程师]+[AI] | 6月决策日志 |
| .ctx/logs/2026-07-EXECUTION_LOG.md | 2026-07-31 | — | [工程师]+[AI] | 7月执行日志（当前活跃） |
| .ctx/logs/2026-07-DECISION_LOG.md | 2026-07-31 | — | [工程师]+[AI] | 7月决策日志 |
| .ctx/logs/2026-08-EXECUTION_LOG.md | 2026-08-31 | — | [工程师]+[AI] | 8月执行日志（当前活跃；T-279 + T-280 B1~B6 实测 + T-281 论断 refinement 讨论 + T-282 content 体系优化归档，L4777~5208） |
| .ctx/PLAN_网页逻辑梳理.md | — | — | [工程师]+[AI] | 已删除（2026-08-24 T-280 B1~B6 全部完成，规划已归档至 8月执行日志） |
| .ctx/logs/2026-08-DECISION_LOG.md | 2026-08-31 | — | [工程师]+[AI] | 8月决策日志（D-270~D-272 丙部退出归档） |
| .ctx/logs/2026-09-EXECUTION_LOG.md | 2026-10-02 | — | [工程师]+[AI] | **（本批与上一批：新增两节——上一节＝G3-1 release 的过程与脚手架实测 · 本批＝代码健康评审的取数与核对过程（含 8 条发现的实测读数表与「未做 / 边界」）；另本轮两次备注列迁出的正文亦落在本文件尾部两段「附」节）** **（批次 235：沿革已整段迁出**——本行的逐批沿革（8059 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」C 节；本列自本批起只写**现状 / 边界 / 为什么**，判据＝`CLAUDE.md R-89` ＋ `timestamps-note-guard.test.mjs::N1–N7`）** |
| .ctx/logs/2026-10-EXECUTION_LOG.md | 2026-10-05 | — | [工程师]+[AI] | 10 月执行日志（当前活跃；2026-10-02 批次 336 换月建，自 9 月文件迁入批次 323、325–335 共 12 节） |
| .ctx/logs/2026-10-DECISION_LOG.md | 2026-10-05 | — | [工程师]+[AI] | 10 月决策日志（当前活跃；2026-10-02 批次 336 换月建，自 9 月文件逐字迁入 D-729~D-739 共 11 条） |
| .ctx/logs/2026-09-DECISION_LOG.md | 2026-10-02 | — | [工程师]+[AI] | **（批次 235：沿革已整段迁出**——本行的逐批沿革（6427 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」D 节；本列自本批起只写**现状 / 边界 / 为什么**，判据＝`CLAUDE.md R-89` ＋ `timestamps-note-guard.test.mjs::N1–N7`）** |
| .ctx/logs/archive/2026-05-early-EXECUTION_LOG.md | 2026-05-21 | 2026-05-21 | [工程师]+[AI] | 5月早期条目归档 |
| .ctx/logs/archive/2026-07-early-entries.md | 2026-07-31 | 2026-07-18 | [工程师]+[AI] | T22-T90 早期条目归档（母本：2026-07-EXECUTION_LOG.md） |

## content/01_strategy/ (战略路线层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/01_strategy/DEVELOPMENT_PATH.md | 2026-09-26 | — | [用户]+[AI] | **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  发展路径（原 MANAGE_SERVE.md→strategy/DEVELOPMENT_PATH.md，文档逻辑顺序重组后迁至01_strategy/；P.10 清理「不是…而是」句式 10 处）；**2026-09-22 批次 154**：`:12` 分工声明里「（不是「党建与党务的统一主语」——该表述为错误概括，2026-08-15 支书裁决清理）」降级（与 `SECRETARY_DIRECTIVES.md:38` 同句副本；行数守恒、`docs/src` 两处行号引用零位移），`D-597` |
| content/01_strategy/SECRETARY_DIRECTIVES.md | 2026-09-26 | — | [用户]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用改准〔`USAGE_POLICY.md §1` 术语表 → `OPERATIONS_GUIDE.md §19`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  支书论断（项目顶级战略文档；**2026-09-22 批次 153 母本降级**：移去正文沿革注记 10 处——头部体例注释 7 处「（…日期…裁决/确立/补充）」· `:38`「（不是「党建与党务的统一主语」，该表述为错误概括已清理）」· `:300`「（2026-08-09 支书确认**升正文**）」→「（2026-08-09 支书确认）」· 附录·论断编号索引末尾的「历史重构操作记录…已归档至执行日志」（该行整行移出），frontmatter 同步；附录三块（论断编号索引 / 修正记录表 / 原话附注）与各「出处：…」单行元数据、各条原话日期**保留未动**；`D-595`） |
| content/01_strategy/README.md | 2026-09-26 | — | [用户]+[AI] | 01_strategy 目录索引（2026-08-24 补充 references 子目录性质划分）；**2026-09-22 批次 154**：references/ 划分说明里「（2026-08-24 规范化）」降级（关键词未命中的同族，人工通读抓出），`D-597` |
| content/01_strategy/references/历史会议材料/ | 2026-08-27 | — | [用户] | 只读（2026-08-24 党支部工作记录.docx 归位于此） |
| content/01_strategy/references/合规文件/ | 2026-07-21 | — | [用户] | 只读 |
| content/01_strategy/references/建设探索/ | 2026-08-03 | — | [用户] | 只读 |

## content/02_institution/ (制度层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md | 2026-10-05 | — | [用户]+[AI] | 支部组织与委员体系（组织层级 / 委员职责矩阵 / 赋权三情景 / 上传与闭环分工）。**边界**：赋权入口与系统的对应关系以 `docs/src/core/domain/work-map.js` 与 `docs/src/entries/tabs/**` 实读为准；本件是母本，系统侧不得先于母本改。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 311）」。 |
| content/02_institution/FLAT_ORGANIZATION_DESIGN.md | 2026-09-22 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-26 批次 201**：正文**整体并入** `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` 的 **§G 组织者与深度参与者的扁平化设计**〔原一~八 → **G.1~G.8 逐字**；该文件**标题改《支部组织与委员体系》**〕⇒ **两份 → 一份**；`D-660`）（原：扁平化设计（**2026-09-22 批次 153 母本降级**：移去沿革注记 3 处——`:23`「（支书 2026-09-17 裁定）」· `:37`「（支书 2026-08-09 裁决：…）」→「（支书原话：…）」· 末尾「反论处置记录」整块 2 行移出；frontmatter 同步；`D-595`） |
| content/02_institution/ROLE_CLASSIFICATION.md | 2026-09-05 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-26 批次 202**：**自 `02_institution` 迁入 `03_doc_system`**——正文**整体并入** `content/03_doc_system/OPERATIONS_GUIDE.md`《运行与协作规范》的 **§24–§31**〔原 §一 三分类定义 → §24 · §二 复合标记规则 → §25 · §三 目录到角色映射 → §26 · §四 协作方式 → §27 · §五 存储与读取机制 → §28 · §六 与现有文档的一致性 → §29 · §七 可扩展性评估 → §30 · §八 变更历史 → §31〕⇒ **该文件为「迁类 ＋ 并入」双动作**）（原：文件角色分类（2026-09-05 §九 系统角色权限矩阵拆出，本文档回归纯文件角色分类）） |
| content/02_institution/SYSTEM_ROLE_PERMISSION.md | 2026-09-29 | — | [工程师]+[AI] | 角色 × 权限的**母本**（含 §9h 写权判据、§9l 可调参数入口）。**边界**：时限 / 补课范围归**纪检域**、篇幅字数归**组织域**，新增可调项**必须**登记 `POLICY_OVERRIDABLE` 并落到设置页对应「职责参数」卡。**为什么**：授权与可调项须**同址可查**（`R-23` 的「服务端按表复算」以此表为准）。沿革见执行日志「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 322）」。 |
| content/02_institution/README.md | 2026-09-26 | — | [用户]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用 / 枚举改准〔「二、角色分类」表改「迁出登记」行 ＋ `ROLE_CLASSIFICATION.md` → `OPERATIONS_GUIDE.md §24–§31`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  02_institution 目录索引（2026-09-05 拆述角色分类与系统角色权限矩阵）；**2026-09-22 批次 154**：SYSTEM_ROLE_PERMISSION 行的「（…；2026-09-05 自 ROLE_CLASSIFICATION.md §九 迁出）」降级（关键词未命中的同族，按受众分再扫抓出），`D-597` |
| content/02_institution/sop/INDEX.md | 2026-09-29 | — | [用户]+[AI] | SOP 导航（术语段已删「党建 / 党务」二分；常用场景行用途栏用「组织生活会以三会形式召开」写法）。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/常见工作场景快速指南.md | 2026-09-26 | — | [用户]+[AI] | 常见工作场景快速指南（母本）：三会一课按同一套 9 环节；党课通知提前量**不设固定值**、由组织者把握；「组织生活会以三会形式召开」用从属写法。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/支委与党小组定人定责定岗说明.md | 2026-09-26 | — | [用户]+[AI] | 定人定责定岗说明（母本）：第三党小组组长标注为「代组长」；§5.3 定岗表「制度建设」主导者＝支委会（可指定对应委员起草 / 修改）；条块交叉表复盘列用「宣传材料归档」。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/宣传委员工作流程指南.md | 2026-09-22 | — | [用户]+[AI] | 宣传委员工作流程指南（母本）：照片墙 / 图片管理 / 周报自动生成与通知支书均**已实现**（反向过时说明已改准）；周报步与项目看板步的留痕按钮名＝「标记已上报党建平台」（与归档页「标记已发送（微信 / 对外）」分开记）。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/纪检委员工作流程指南.md | 2026-09-26 | — | [用户]+[AI] | 纪检委员工作流程指南（母本）：出勤率汇总 → **交支委会（不公示、不对外）**；考察同流程含**同款打回**（含申诉先核实）；会议考勤上传＝该场组织者，纪检管打包确认 / 总表 / 统计核对。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/组织委员工作流程指南.md | 2026-09-26 | — | [用户]+[AI] | 组织委员工作流程指南（母本）：发展对象公示期＝**不少于五个工作日**（引上级《发展党员工作细则》第十三条）；「培养联系人考察记录」以纸质材料撰写、**系统内不设该栏**。沿革见 `.ctx/logs/`。 |
| content/02_institution/sop/党小组组长工作手册.md | 2026-09-22 | — | [用户]+[AI] | 2026-09-22 批次 140 母本降级：移去沿革注记 3 处（`:172`「2026-08-30 支书裁决·混合模式」· `:239`「（D-2 决断）」· `:298`「2026-08-30 支书强调」），frontmatter 同步；`D-572`；**2026-09-22 批次 145**：§6.3 通知注意事项 5「三会一课 / **组织生活会**类会议通知至少提前 5 天」→「**三会一课类**会议通知至少提前 5 天」——按 `D-290` **去并列**（组织生活会随所承接的三会形式走，故并入「三会一课类」），`D-577`（本行日期当日已为 2026-09-22、未变） |

## content/03_doc_system/ (系统治理层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/03_doc_system/OPERATIONS_GUIDE.md | 2026-09-29 | — | [工程师]+[AI] | 运行与协作规范（含 §23 **内部代号词典**、§24–§31 角色分类迁入节）。**边界**：**节号是被全仓引用的面** ⇒ 改号须同批全仓改签（`doc-line-ref` 会逐条核）；正文不承载权限判据（那在 `SYSTEM_ROLE_PERMISSION.md`）。**为什么**：运行口径**单一母本**，不拆散。沿革见执行日志「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 322）」。 |
| content/03_doc_system/PROCESS_GUIDE.md | 2026-09-13 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-26 批次 202**：正文**整体并入** `content/03_doc_system/OPERATIONS_GUIDE.md`《运行与协作规范》的 **§15–§18**〔**编号一字未改**——原即承 OPERATIONS_GUIDE §1–§14 顺延；原 §18 内 `***` 分隔符按 §7.1 改 `---`〕⇒ **四份 → 一份**）（原：运行标准·流程机制 §15 甲部修改/§16 吸收外部输入/§17 周期性任务含 W4 五专项/§18 支书评议细节；T-282 自 OPERATIONS_GUIDE 拆分） |
| content/03_doc_system/USAGE_POLICY.md | 2026-09-15 | — | [工程师]+[AI] | 🗑️ 已删除（正文并入 `OPERATIONS_GUIDE.md`《运行与协作规范》**§19–§23**）。沿革见 `.ctx/logs/`。 |
| content/03_doc_system/ARCHITECTURE.md | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用 / 枚举改准〔分层树与结构树里 `PROCESS_GUIDE` / `USAGE_POLICY` / `ROLE_CLASSIFICATION` → `OPERATIONS_GUIDE.md`；`role` 取文件自身 YAML `[工程师]+[AI]`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  核心架构说明（2026-09-03 删除党建/党务分类节）；**2026-09-25 批次 179（`P.16` 第三批）三份合一**：`SSOT_INDEX.md` / `SERVICE_CATALOG.md` 两份**并入本文件**（标题改《**架构与单一事实源**》⇒ 原 `ARCHITECTURE` 主体作 **§一–§九**〔**编号一字未改**，含 §五 仓库结构 / §八 SSOT 双向变更流水线〕、原 `SSOT_INDEX` 作 **§十**〔`10.1–10.6`〕、原 `SERVICE_CATALOG` 作 **§十一**〔`11.1–11.3`〕、新增 **§十二 边界与引用**；`D-644`）⇒ **本文件自此同时承载架构说明 ＋ 单一事实源注册表 ＋ 统一服务目录**；⚠ **本行日期仍 `2026-09-15`**——**本文件 frontmatter 的 `last_updated` 实读亦即 `2026-09-15`、与表行同值 ⇒ `S13` 绿**；其 frontmatter **未随本批改动刷新**，属 `R-83`「提交后必刷」纪律范畴、**授权面外只登记** |
| content/03_doc_system/DOC_MAP.md | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用 / 枚举改准〔02 表 `ROLE_CLASSIFICATION` 迁出 ＋ 03 表 `PROCESS_GUIDE` / `USAGE_POLICY` → `OPERATIONS_GUIDE.md` 节段〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  全局文档导航 |
| content/03_doc_system/SSOT_INDEX.md | 2026-09-15 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-25 批次 179（`P.16` 第三批）**：正文**整体并入** `content/03_doc_system/ARCHITECTURE.md` 的 **§十 单一事实源注册表与权威源治理**〔编号 **`10.1–10.6` 一字未改**〕⇒ **三份 → 一份**；顺带清旧债＝**本文件里 10 处 `DATA_FLOW.md`** 分两类处置〔**现行 SSOT 关系行 6 处**（`:46`/`:48`/`:57`/`:62`/`:63`/`:64`）**改准**为 `DATA_MODEL.md` 的 `§第二部分（数据流）` / `§3（参与者数据流设计）` / `§3.4（登录态说明）` · **带日期的迁移台账行 4 处**（`:166`/`:174`/`:175`/`:176`）**随整节「已迁移文件索引」按沿革删**〕＋ **同一文件内自相矛盾**（原 `:108` 一句并列两种 tab 组名）**收敛为现行四组**；`D-644`）（原：母本子本注册表；「已迁移文件索引」表 **30 行** ＋ Agent/Skill 配置（已迁出）节 **3 行** ＋ 审查顺序迁出注 **1 行** 随本次合并删去） |
| content/03_doc_system/SERVICE_CATALOG.md | 2026-09-20 | — | [工程师]+[AI] | 🗑️ 已删除（正文并入 `ARCHITECTURE.md` **§十一 统一服务目录与角色-服务权限矩阵**）。沿革见 `.ctx/logs/`。 |
| content/03_doc_system/README.md | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用改准〔`PROCESS_GUIDE` / `USAGE_POLICY` → `OPERATIONS_GUIDE.md`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** 03_doc_system 目录索引 |
| content/03_doc_system/工作模板/经验沉淀辅助提示词.md | 2026-09-26 | — | [工程师]+[AI] | 沉淀辅助 |

## content/04_web_design/ (设计理念层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/04_web_design/design-system/DESIGN_SYSTEM.md | 2026-10-05 | — | [工程师]+[AI] | **（批次 236：沿革已整段迁出**——本行的逐批沿革（4192 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 236）」；本列只写**现状 / 边界 / 为什么**）** |
| content/04_web_design/design-system/COLOR_SYSTEM.md | 2026-09-24 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-24 批次 172**：正文**整体并入** `content/04_web_design/design-system/DESIGN_SYSTEM.md` 的 **§二 色彩系统**〔编号 **2.1–2.8 一字未改**〕⇒ **四份 → 一份**；`D-638`）（原：色彩系统规范——T-282 自 DESIGN_SYSTEM 拆分 §二：色盘/主色/辅助色/中性色/功能色/表面色/配色规则；2026-09-20 批次 110 改准「6 → 7 个工作台」，批次 113 刷本行日期） |
| content/04_web_design/design-system/COMPONENT_SPEC.md | 2026-09-24 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-24 批次 172**：正文**整体并入** `content/04_web_design/design-system/DESIGN_SYSTEM.md` 的 **§四 组件规范**〔编号 **4.1–4.17 一字未改**〕；`D-638`）（原：组件规范——T-282 自 DESIGN_SYSTEM 拆分 §四：按钮/卡片/输入/侧边栏/导航/日历图例/数据展示/图标/选人/状态徽章；2026-09-20 批次 110 改准「待初阅队列」现状句、批次 41 沿革句原样保留，批次 113 刷本行日期） |
| content/04_web_design/module/ABOUT_PAGE_DESIGN.md | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 233：`related_files` 里的入口路径随「entries/ 按判据分三类」改准〔`docs/src/entries/about-entry.js` → `docs/src/entries/pages/about-entry.js`〕⇒ 按 R-83 刷卡；frontmatter 与本报行同批刷为 `2026-09-28`）** **（2026-09-26 批次 201：`D-660` 加「本文负责 / 本文不负责 → 去哪找」边界头〔本组判「分而治之」、未合并未删文件〕；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  About 页面设计系统（超参数设定原则/防风格疲劳/无竖线红线，新建 T-272；T-278 无人称修缮） |
| content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md | 2026-09-20 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-25 批次 181**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§六 北大党校对接**〔内部 §一–§十一 → **6.1–6.11**〕⇒ **四份 → 一份**；`D-645`）（原：北大党校与智慧党建系统对接设计（党校单向爬取+智慧党建双向同步+数据映射+小程序归位说明+待确认清单，新建；对接授权=党委组织部支持；T-278 无人称修缮；2026-09-20 批次 110 资源表 32 → 35〔2 处〕，批次 113 刷本行日期） |
| content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md | 2026-09-27 | — | [工程师]+[AI] | **（2026-09-27 批次 213：清偿 `R-83` 债务——frontmatter `last_updated` 由 `2026-09-26` 刷为 `2026-09-27`（HEAD 提交日 2026-09-27 后 `F2` 判红；仅刷元数据、正文未改）；与本报行同值 ⇒ `S13` 绿）** **（2026-09-26 04 组减负续批：§8.2 L2 行「操作位收口」细节〔设置→支部治理 / 原支书台「工作台配置」tab 废止〕系复述 `PARTY_COMMITTEE_DESIGN.md` §2.5/§2.6，原位改一行指针；行数守恒；frontmatter 实读仍 `2026-09-26`、与表行同值 ⇒ `S13` 绿）** **（2026-09-26 批次 201：`D-660` 加「本文负责 / 本文不负责 → 去哪找」边界头〔本组判「分而治之」、未合并未删文件〕；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  架构演进（组件化落地评估+轻量插件化「能力注册表」设计+迭代机制+实施路径，新建 T-276；无人称文体） |
| content/04_web_design/evolution/BRANCH_WORK_MAP.md | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行——历批按「覆盖缺口如实登记、**不补行**」处置，本批改为**补行**；日期＝该文件 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿；`git log -1 --format=%ad --date=short` 亦为 2026-09-26**）** 支部工作地图设计稿（平铺模块 ＋ 按人双视图） |
| content/04_web_design/evolution/DESIGN_METHODOLOGY.md | 2026-09-26 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 设计理念与方法论承接（设计论证与方法档案） |
| content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md | 2026-10-05 | — | [工程师]+[AI] | 院系党委后台——支部多实例两级治理设计定案（§2.5 远期形态只留指针指 `ARCHITECTURE_EVOLUTION.md §八`；§2.6 ⑤ 域参数白名单已扩表并留放行登记）。沿革见 `.ctx/logs/`。 |
| content/04_web_design/evolution/ROLE_PERMISSION_DESIGN.md | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 权限功能合一收敛设计 |
| content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 工作流块封装契约 |
| content/04_web_design/deploy/WECHAT_INTEGRATION.md | 2026-09-05 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-25 批次 181**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§五 微信协同与小程序设计**〔内部 §一–§八 → **5.1–5.8**〕⇒ **四份 → 一份**；`D-645`）（原：微信协同与小程序设计方案（§八 新增北大对接数据展示；小程序独立问题归位本文档；T-278 无人称修缮） |
| content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md | 2026-10-05 | — | [用户]+[AI] | **（现状）** 数据一致性检查清单（`§0` 真机 ↔ 文档逐项对账）。**边界**：本件只承载清单本体与判据，沿革入 `.ctx/logs/`。**为什么**：本列只写现状 / 边界 / 指针（`R-89`）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 333）」。 |
| content/04_web_design/data/DATA_MODEL.md | 2026-10-05 | — | [工程师]+[AI] | 数据模型与数据流（字段表 + 关系 + 写入验证 + 派生）。**边界**：字段有无与取值以代码实读为准；本件＝对内的设计侧字段说明，与 `README-server.md` §4 的对外字段说明**各有其位**（后者对外、前者对内）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 311）」。 |
| content/04_web_design/data/DATA_FLOW.md | 2026-09-23 | — | [工程师]+[AI] | 🗑️ 已删除（正文并入 `DATA_MODEL.md`《数据模型与数据流》）。沿革见 `.ctx/logs/`。 |
| content/04_web_design/data/DATA_ARCHITECTURE.md | 2026-09-03 | — | [工程师]+[AI] | 🗑️ 已删除（正文已拆分至 DATA_MODEL / DATA_FLOW） |
| content/04_web_design/module/MODULE_UI_DESIGN.md | 2026-10-05 | — | [工程师]+[AI] | 模块界面设计（§一 总览 / §二 党建 Tab / §三 日历 / §四 全站 Tab 总方案＝2026-09-27 规划稿）。**边界**：§四.2 已升为 `DESIGN_SYSTEM.md §4.10.1` 正式条文（单一源）；§四 的逐台 tab 清单是**当日快照**，活口径以 `docs/src/capabilities/*-workspace.js` 为单一源（门控对账在 `doc-consistency::S1`）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 311）」。 |
| content/04_web_design/module/SOP_WEBSITE_GUIDE.md | 2026-09-26 | — | [工程师]+[AI] | **（2026-09-26 批次 202：03《运行与协作规范》合并后引用改准〔`:187` → `OPERATIONS_GUIDE.md`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 201：`D-660` 加「本文负责 / 本文不负责 → 去哪找」边界头〔本组判「分而治之」、未合并未删文件〕；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  SOP-系统联动方法（T-278 无人称修缮） |
| content/04_web_design/module/AGENDA_AND_REFERENCE_DESIGN.md | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 会议议程与资料查询设计 |
| content/04_web_design/deploy/DEPLOYMENT_GUIDE.md | 2026-10-03 | — | [工程师]+[AI] | **部署**手册（环境 / 起服务 / 发版 / 回滚）。**边界**：只讲部署，**不含**权限模型（那在 `AUTHENTICATION_MODEL.md`）与运行协作（`OPERATIONS_GUIDE.md`）；**为什么**：三件分工不重叠，避免同一件事两处写法漂移。沿革见执行日志「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 322）」。 |
| content/04_web_design/deploy/AUTHENTICATION_MODEL.md | 2026-09-05 | — | [工程师]+[AI] | 🗑️ **已删除**（**2026-09-25 批次 181**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§四 认证与登录门控**〔内部 §一–§八 → **4.1–4.8**〕⇒ **四份 → 一份**；`D-645`）（原：部署与认证场景模型（5 场景两轴正交 + 侧边栏统一 + 登录门控四层；T-278 无人称修缮） |
| content/04_web_design/SCHOOL_IT_DEPLOYMENT.md | 2026-08-27 | — | [工程师]+[AI] | 🗑️ 已删除（计算中心对接全案已并入 DEPLOYMENT_GUIDE §三） |
| content/04_web_design/README.md | 2026-10-05 | — | [工程师]+[AI] | 04_web_design 目录索引（2026-08-24 部署类重组更新） |

## content/05_ai_coding/ (AI 编码层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/05_ai_coding/KNOWN_PITFALLS.md | 2026-09-04 | — | [工程师]+[AI] | 🗑️ 已删除（拆为 05_ai_coding 六篇纪律件） |
| content/05_ai_coding/README.md | 2026-09-26 | — | [工程师]+[AI] | 05_ai_coding 目录索引 |
| content/05_ai_coding/CONTEXT_MANAGEMENT.md | 2026-09-26 | — | [工程师]+[AI] | （**批次 205 补行**：本表原无其行，本批补行；日期＝其 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿。**2026-09-26 已清偿 `R-83` 债**：frontmatter 与表行同刷为该文件最后一次提交日 `2026-09-26`） 上下文管理与防失忆 |
| content/05_ai_coding/DOCUMENT_GOVERNANCE.md | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 文档治理与一改具改 |
| content/05_ai_coding/FILE_OPERATION_RULES.md | 2026-09-29 | — | [工程师]+[AI] | （**批次 205 补行**：本表原无其行，本批补行；日期＝其 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿。**2026-09-26 已清偿 `R-83` 债**：frontmatter 与表行同刷为该文件最后一次提交日 `2026-09-26`） 文件操作纪律 |
| content/05_ai_coding/REVIEW_AND_EXPRESSION.md | 2026-09-26 | — | [工程师]+[AI] | （**批次 205 补行**：本表原无其行，本批补行；日期＝其 frontmatter `last_updated` 实读值，与表行同值 ⇒ `S13` 绿。**2026-09-26 已清偿 `R-83` 债**：frontmatter 与表行同刷为该文件最后一次提交日 `2026-09-26`） 评议与表达纪律 |
| content/05_ai_coding/TEST_AND_VERIFICATION.md | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-26 批次 205 补行**：本表原无其行，本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 测试验证纪律 |

## content/insights/ (经验沉淀)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/insights/README.md | 2026-09-26 | — | [用户]+[工程师] | 经验沉淀层目录索引。沿革见 `.ctx/logs/`。 |
| content/insights/党支部管理与实务经验沉淀.md | 2026-09-26 | — | [用户]+[AI] | **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  组织性/条块二元/专班等经验贡献（2026-09-21 批次 124 纪律段「会议考勤」表「上传/修改权限」由「纪检委员」改准为「会议组织者（上传）」，依支书 2026-09-20 定案「会议考勤上传收归组织者」，`D-548`） |
| content/insights/工程演进与设计方法论.md | 2026-09-04 | — | [用户]+[AI] | 🗑️ 已删除（拆流入 insights 其他文） |

## content/README.md

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| content/README.md | 2026-09-29 | — | [用户]+[AI] | content 目录总索引 |

## server/ (后端服务)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| server/server.js | 2026-09-02 | — | [工程师]+[AI] | 启动入口（node server.js，默认端口 3000） |
| server/app.js | 2026-09-28 | — | [工程师]+[AI] | createApp 工厂 + JSON 错误中间件（**2026-09-28 批次 234：随资源路由切分，`createResourcesRouter` 的 import 路径改签为 `./routes/resources/index.js`**——只改一行 import、零行为变化） |
| server/db.js | 2026-09-25 | — | [工程师]+[AI] | 35 资源表（含匿名核查留痕 issue_reveals）+ sessions/attachments；**2026-09-25 批次 188：最小可用迁移机制**（`PRAGMA user_version` ＋ 有序 `MIGRATIONS`；启动期 `applyMigrations(db)` **按序、单事务**、幂等可重入、失败拒启动；`v1 = baseline-2026-09-25` 为**纯标记迁移**、既有 `CREATE TABLE IF NOT EXISTS` 路径**一字未改**〔叠加不替换〕；**接入点与 `return db;` 同行**（`:68`）⇒ **行号零漂移**；新增导出 `MIGRATIONS`（`:207-221`）/ `SCHEMA_VERSION`（`:224`）/ `validateMigrations` / `applyMigrations`，`D-650`） |
| server/seed.js | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 234 去冗余：删去本文件内两个「逐字复刻」常量 `SEED_WEEKLY_REPORTS` / `SEED_PROP_TASKS`，改为从**内容单一源** `docs/src/data/mock/prop.js` 同源 import〔UI 侧 `prop/weekly-tab.js` / `prop/tasks-tab.js` 亦改读同一份〕；**播种表与条数一字未变**）** 复用前端 mock 导入种子（**2026-09-25 批次 192：DB 空表补演示种子**——**播种 15 张**〔`attendances` 154 · `inspections` 42 · `activity_reviews` 11 · `taskforce_reviews` 2 · `thought_reports` 5 · `weekly_reports` 4 · `prop_tasks` 8 · `external_dispatches` 2 · `handoffs` 2 · `member_confirmations` 1 · `attendance_appeals` 1 · `inspection_appeals` 1 · `issue_unread` 2 · `auth_audit` 1 · `appointment_records` 1〕；**不播 11 / 跳过 3 见 `D-653`**；空表 **30 → 14** · 全库 **322 → 559** · 幂等 `idempotent: true` · 引用自洽 `problems: []`；**未新增 `MIGRATIONS`**）；**2026-09-25 批次 198（`D-658`）：`seedDatabase()` 末尾补 `todos` 播种段**（从 `docs/src/services/governance/todo.js::SEED_TODOS` **同源**播种 **2 条**；幂等＝`DELETE` ＋ 整表 `INSERT`、开关语义一字未改；**由「另一路」落地，本表行改注**（日期仍 `2026-09-25`）） |
| server/routes/auth.js | 2026-09-14 | — | [工程师]+[AI] | 登录/token/me |
| server/routes/resources.js | 2026-09-28 | — | [工程师]+[AI] | 🗑️ **已拆分**（2026-09-28 批次 234）：原 1301 行单文件按内聚拆为 `server/routes/resources/` **六件**——装配在 `index.js`，写门在 `gates.js` / `approval-gates.js`，其余按域。**边界**：本行留**删除抄录**，不再指向活文件（`S13` 认此写法）。 |
| server/routes/uploads.js | 2026-08-24 | — | [工程师]+[AI] | 附件上传（jpg/png/pdf/docx/xlsx，≤10MB） |
| server/test/*.test.js | 2026-08-03 | — | [工程师]+[AI] | 单元测试套件（auth/db/resources/seed/skeleton/snapshot/uploads/report/e2e-login） |
| server/test/*.test.mjs | 2026-09-29 | — | [工程师]+[AI] | **（批次 236：沿革已整段迁出**——本行的逐批沿革（5729 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」；**2026-09-29 批次 253 二次迁出**：本会话各批新增的 5 条短注一并迁入同节（`R-89` 只降不升）；本列只写**现状 / 边界 / 为什么**）** |
| server/test/b3-1-makeup-writeback.test.mjs | 2026-09-24 | — | [工程师]+[AI] | B3-1 补课完成→考勤回写验证（T-280 新建，5 项断言；**2026-09-24 批次 176：补 1 行 CDN `route.abort`**〔`:17`〕，`D-642`） |
| server/test/style-baseline.mjs | 2026-09-28 | — | [工程师]+[AI] | **（批次 236：沿革已整段迁出**——本行的逐批沿革（3832 字）见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 236）」；本列只写**现状 / 边界 / 为什么**）** |
| server/test/form-loop-registry.mjs | 2026-10-05 | — | [工程师]+[AI] | 表单闭环台账（全站「提交动作的字段级必填校验点」逐条登记 `file` / `msg` / `line` / `machine` / 理由）。**边界**：本件只登记，真机覆盖在 `form-loop-sweep.test.mjs`（台账三层可核见 `R-80`）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 308）」。 |
| server/run-suite.mjs | 2026-10-03 | — | [工程师]+[AI] | 测试分片启动器：按 `SWEEP_SHARD` 选片（非 e2e 每片全跑 ＋ 本片 e2e），透传退出码。 |
| server/test/sweep-shard.mjs | 2026-10-03 | — | [工程师]+[AI] | 测试分片单源（片数 / 各片工作台 / 各片 e2e 文件）；四片并集 ≡ 全量由 `suite-shard` 守卫钉死。 |
| server/test/probe*.mjs | — | — | — | 🗑️ 已删除（T-280 B1 临时探针，定位完成清理） |
| server/README.md | 2026-09-30 | — | [工程师]+[AI] | 后端安装 / 启动 / 测试 / 部署对接说明，并承载**测试耗时台账**与**前端 DOM 结构基线（div 普查）**两张实测表。**边界**：对外接口与字段以 `README-server.md` 为准，本件只管「怎么跑、跑多久」。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 308）」。 |
| server/package.json | 2026-10-03 | — | [工程师]+[AI] | 依赖 better-sqlite3 ^12.0.0 · express ^4.19.0 · multer ^1.4.5-lts.1 · nodemailer ^9.0.6 · playwright 1.60.0。**测试档位**：`test`＝分片（默认片 1，`SWEEP_SHARD` 选片）· `test:full`／`test:precommit`＝全量（`SWEEP_SHARD=all`）· `test:daily`＝S 类日常档 · `test:fast`／`test:core`＝快速子集。**边界**：脚本为 Windows 专有语法（`set X=1&&`）。 |
| server/package-lock.json | 2026-08-30 | — | [工具] | 依赖锁文件 |
| server/.gitignore | 2026-09-01 | — | [工具] | 忽略 data.db/uploads 等运行时产物 |
| server/data.db | — | — | — | 🗑️ 运行时产物（不入库，.gitignore 忽略） |

## docs/ (前端应用)

### docs/ HTML 页面

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/index.html | 2026-09-30 | — | [用户]+[AI] | 首页入口（含日历）；**2026-09-24**：批次 171 skip link ＋ `id="main-content"`（同一工作树），**批次 177** 卡片内边距 `p-6` → `p-5`（`.card` 收敛，`D-643`） |
| docs/login.html | 2026-09-28 | — | [用户]+[AI] | **（2026-09-28 批次 227：CSS 收尾——删页内**第二套 focus 死声明**〔被 `styles.css:2809` 的同名更高特异性恒压、从未生效〕；`D-675`）** 登录页 |
| docs/about.html | 2026-08-12 | — | [用户]+[AI] | 关于页（支部的故事；静态壳模式 + about.css 独立引用） |
| docs/archive.html | 2026-09-24 | — | [用户]+[AI] | 归档页；**2026-09-24**：批次 171 skip link，**批次 177** 卡片内边距 `p-6` → `p-5`（`.card` 收敛，`D-643`） |
| docs/feedback.html | 2026-07-31 | — | [用户]+[AI] | 反馈页 |
| docs/help.html | 2026-10-04 | — | [用户]+[AI] | 全站使用说明页（面向使用者的「帮助」：页面 / 页签 / 设置逐项 / 术语口径）。**边界**：口径以代码与裁定为准，本表不复述；改结构必同批改本页并过 `doc-consistency` 守卫（`R-61`）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 308）」。 |
| docs/notice.html | 2026-09-24 | — | [用户]+[AI] | 通知页；**2026-09-24**：批次 171 skip link，**批次 177** 卡片内边距 `p-8` → `p-5`（`.card` 收敛，`D-643`） |
| docs/messages.html | 2026-10-03 | — | [工程师]+[AI] | 「我的私信」独立页（收件＋发件一屏 · 方向徽标 · 筛选胶囊 · 未读计数 · 展开即已读 · 就地回复成线 · 写私信按发送权显隐 —— 批次 353）。 |
| docs/search.html | 2026-07-31 | — | [用户]+[AI] | 搜索页 |
| docs/workspace/secretary.html | 2026-07-31 | — | [用户]+[AI] | 支书工作台 |
| docs/workspace/org.html | 2026-08-23 | — | [用户]+[AI] | 组织委员工作台入口页。沿革见 `.ctx/logs/`。 |
| docs/workspace/prop.html | 2026-07-31 | — | [用户]+[AI] | 宣传委员工作台 |
| docs/workspace/disc.html | 2026-07-31 | — | [用户]+[AI] | 纪检委员工作台 |
| docs/workspace/leader.html | 2026-08-23 | — | [用户]+[AI] | 党小组组长工作台入口页。沿革见 `.ctx/logs/`。 |
| docs/workspace/visitor.html | 2026-07-31 | — | [用户]+[AI] | 访客工作台 |

### docs/src/core/ (内核层：`base/` · `domain/` · `boot/` · `session/`) · docs/src/data/ (数据形态层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/core/boot/bootstrap.js | 2026-09-29 | — | [工程师]+[AI] | 引导启动（主题色 resolveAccentRole；header/sidebar 版本引用；**2026-09-21 批次 139：`DEV_ROLE_WHITELIST` 加 `deputy-leader`**——本地 `?dev=` 可直入副组长身份，`D-571`） |
| docs/src/core/boot/registry.js | 2026-09-29 | — | [工程师]+[AI] | 能力注册表三原语（`registerCapability` / `getCapabilities` / `getCapability` / `mountCapability`）。沿革见 `.ctx/logs/`。 |
| docs/src/core/domain/constants.js | 2026-10-05 | — | [工程师]+[AI] | 静态常量（ACCENT_PALETTE/resolveAccentRole；**2026-09-21 批次 139：「副组长」身份键 `deputy-leader`**——键 / 标签「党小组副组长」/ 页面映射〔同 `leader.html`〕/ 颜色三处，**集中在文件末挂载**：`README-server.md:106` 按行号引用本文件的四张表，插行会整体漂移故不插行，`D-571`）**（2026-09-26 批次 209：色值「单一源令牌表」重构——新增 `const _C` **43 项**〔本文件唯一硬编码色值源〕，`_TEXT_DARK_MAP` 50 ＋ B 族 63 处改由 `_C` 派生、C 注释 24 处保留；**三条硬前提已实测**：值层 **103,668 字节逐字节等价**〔`identical=true`〕/ `node --test` 可 import〔`module-load` E1 **163/163**〕/ `numstat` **77/77** 等行数〔`README-server.md` 按行号引用 15 处零位移〕；**`c: 137 → 67`**、`v` 45 持平）** |
| docs/src/core/session/cross-page-state.js | 2026-09-29 | — | [工程师]+[AI] | 跨页状态（T-280 B1-5 版本化 `CODE_VERSION`；**2026-09-22 批次 141 bump 自增 264 → 265**——`docs/scripts/bump-version.mjs` 每次 bump 自增，勿手改；**截至 2026-09-23 批次 155 已随各批 bump 至 `CODE_VERSION` 275 / 全站版本戳 `20260922k`**） |
| docs/src/data/data-loader.js | 2026-09-29 | — | [工程师]+[AI] | 数据加载 |
| docs/src/data/data-adapter.js | 2026-09-29 | — | [工程师]+[AI] | **（现状）** 数据源切换与装配（mock / api 双形态同一契约）。**边界**：装配标记 / 回退块的口径以源码注释为准，本列不复述。**为什么**：沿革入 `.ctx/logs/`（`R-89`）。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 333）」。 |
| docs/src/core/session/login-snapshot.js | 2026-09-29 | — | [工程师]+[AI] | 登录快照轻量读取（零依赖，静态页登录态感知壳用） |
| docs/src/data/api-adapter.js | 2026-10-03 | — | [工程师]+[AI] | API 模式适配器（10 资源 + snapshot） |
| docs/src/data/mock-adapter.js | 2026-10-05 | — | [工程师]+[AI] | Mock 模式适配器（restoreNicheCollections） |
| docs/src/core/domain/domain.js | 2026-09-29 | — | [工程师]+[AI] | 领域模型（2026-09-21 批次 120：`ImageRecord` typedef 按现状改准——文件存上传接口 `filePath` 或旧形态 `base64`，**行数守恒**） |
| docs/src/core/base/icons.js | 2026-09-29 | — | [工程师]+[AI] | 图标系统（含 upload 上传图标） |
| docs/src/core/base/id.js | 2026-09-29 | — | [工程师]+[AI] | UUID 发生器 |
| docs/src/core/domain/policy-defaults.js | 2026-09-29 | — | [工程师]+[AI] | **（本批：G3-2 收口——新增 `POLICY_FIXED` 台账（12 条不可覆盖项：kind ＋ why ＋ src），消灭「未登记」第三态；26 叶键 ＝ 白名单 14 ＋ 固定台账 12，判据 `policy-config.test.mjs::R1–R3`）** **（2026-09-27 批次 211–212：路二 setting 可调性真缺陷修复——`POLICY_OVERRIDABLE` 白名单 **4 → 12 条**（新增 `attendance×3` / `review×2` / `makeup×3` / `thoughtReport×2`）；**域归属按母本**（时限类 / 补课范围与时限 → 纪检域、篇幅字数 → 组织域））** 业务默认值集中单一源（**2026-09-21 批次 132 补登**——本表原先无此行；本批 `attendance` 块：**新增 `noAttendanceTypes = ['支委会']`**、`meetingTypes` 去掉支委会、`recorderByType` 改准为「只列非组织者位类型」——**考勤上传位按会议类型分**，`D-558`） |
| docs/src/core/base/state.js | 2026-09-29 | — | [工程师]+[AI] | 全局状态 |
| docs/src/core/base/utils.js | 2026-10-05 | — | [工程师]+[AI] | 通用工具 |
| docs/src/core/domain/work-map.js | 2026-10-05 | — | [工程师]+[AI] | 支部工作地图的**代码单一源**：`WORK_MAP_MODULES`（**14 个模块**）＋ 组织型主体注册表（`ORG_SUBJECTS`）。**边界**：**模块数的现状声明点在 `BRANCH_WORK_MAP.md`**（`doc-consistency::S14` 第 4 读的锚点，2026-10-01 批次 314 由乙部行改锚至此）；本文件**只出数据、不出声明**。**为什么**：模块目录是「支部有哪些必办」的单一源。沿革见执行日志「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 322）」。 |
| server/test/work-map.test.mjs | 2026-10-05 | — | [工程师]+[AI] | **2026-09-22 批次 144 补登**（本表原先无此行；批次 141 曾改过本文件但未补登）——本批改 2 处断言 ＋ 1 处用例标题（`expandWorkforce` 缺省：`develop-party-member` 由 `role`/`org-commissioner` 改 `org`/`branch-committee`），**改测试不改制度**（`D-576`）；**2026-09-22 批次 149 改注**——逐键断言补 `joint-event`（`leader`）/ `info-platform`（`branch-committee`）/ `rule-making`（`branch-committee`）/ `democratic-review`（`secretary`）/ `election`（`party-committee`）五条 ＋ `ORG_SUBJECT_IDS` 断言改 `['branch-committee', 'party-committee']` ＋ `ORG_SUBJECT_LABELS['party-committee']` ＝「党委」＋ `expandWorkforce` 的 `election` 展开断言（`D-583`…`D-586`） |
| docs/src/services/branch/config-clean.js | 2026-09-29 | — | [工程师]+[AI] | 支部 config 净化唯一实现（**2026-09-22 批次 141 补登**——本表原先无此行；本批 `sanitizeConfigWorkforce` 的 ownerType 白名单由 `{role,person}` 扩为 `{role,person,org}`——**组织型主体位可落库**，`D-573`） |

### docs/src/components/ (组件层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/components/shell/header.js | 2026-09-28 | — | [工程师]+[AI] | 页头组件（未读角标 / 主题色标签；数据层按需加载 ＋ staticShell）。沿革见 `.ctx/logs/`。 |
| docs/src/components/governance/org-setup-wizard.js | 2026-09-28 | — | [工程师]+[AI] | 换组织向导（步骤③「角色分工」与 `_ownerLabel` / `_workforceValueMap` / 保存收集四处取齐 `org` 组织主体位；`org` 现值显示「支委会（组织主体 · 保留现指定）」）。沿革见 `.ctx/logs/`。 |
| docs/src/components/shell/sidebar.js | 2026-10-03 | — | [工程师]+[AI] | 侧边栏组件（字号+主题色设置；AuthStore 按需加载 + staticShell） |
| docs/src/components/record/calendar.js | 2026-09-30 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化〕；`D-674`）**  日历组件 |
| docs/src/components/record/inspector.js | 2026-10-03 | — | [工程师]+[AI] | 检查器组件（产出物区 / 分类型关闭条件；待批块按档位分流、表态面板通行证＝本场应到名单）。沿革见 `.ctx/logs/2026-10-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 356）」。 |
| docs/src/components/ui/modal.js | 2026-09-28 | — | [工程师]+[AI] | 模态框组件（可选 `settingsLink` ＋ 导出 `settingsLinkHTML()`——浮窗页脚「相关设置」深链的**单一源**；`NUDGE_TEXTS` 含 `todo-urge` / `assign-leader` / `assign-activity` / `assign-taskforce` 四键）。沿革见 `.ctx/logs/`。 |
| docs/src/components/shell/tab-bar.js | 2026-10-05 | — | [工程师]+[AI] | 标签栏组件（tab 声明 / 懒加载渲染 / **陈旧渲染纠正**）。**边界**：跨 tab 共享容器约定 `dataset.currentTab` 由本件在发起渲染前清空；状态变化重渲染走 `workspace-shell`。沿革见 `.ctx/logs/`。 |
| docs/src/components/record/todo-list.js | 2026-10-05 | — | [工程师]+[AI] | 待办列表组件（E2 flow 内嵌小字） |
| docs/src/components/governance/signup-panel.js | 2026-10-05 | — | [工程师]+[AI] | 报名面板组件（活动 / 专班详情页共用；报名区 ＋ 报名名单）。 |
| docs/src/components/governance/work-overview.js | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-26 批次 205–207：本表原无其行，本批补行；日期＝该批次落点日。hex 4 处清 ＋ 控件 11px 1 处（`:118`）→ `text-[13px]`、padding 一字未动；收基线 `c` 16→12）** 工作台首页「概况 / 今天」卡组件 |
| docs/src/components/commissioner-matrix.js | 2026-08-04 | — | [工程师]+[AI] | 🗑️ 已删除（三委员矩阵组件删除） |
| docs/src/components/feedback/issue-detail.js | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 13→12〕；`D-674`）** 事项详情组件（**2026-09-23 批次 155**：事项领域块补一行「**反馈时间**」——消费 `issueDomainReplyHint`，逐条照母本 `常见工作场景快速指南.md:439-444` 第 3 列，`D-598`） |
| docs/src/components/feedback/issue-form.js | 2026-09-24 | — | [工程师]+[AI] | 事项表单组件（提交按钮主 CTA 档）（**2026-09-23 批次 155**：事项领域实时提示由「建议归口」扩为「**建议归口 ＋ 反馈时间**」，消费 `issueDomainReplyHint`，`D-598`） |
| docs/src/components/feedback/issue-list.js | 2026-09-25 | — | [工程师]+[AI] | 事项列表组件（**2026-09-25 批次 199（`D-659`）：hex 清 1 处**（15→14；只清 `style=` 内与 `:root` 令牌值逐字相等者）；**由「另一路」落地，本表行刷为 `2026-09-25`**） |
| docs/src/components/ui/void-record.js | 2026-10-03 | — | [工程师]+[AI] | 作废（软）通用弹窗（2026-10-03 批次 352 新建） |
| docs/src/components/ui/custom-select.js | 2026-09-14 | — | [工程师]+[AI] | 自定义下拉组件（阈值内嵌搜索+智能定位翻转） |
| docs/src/components/governance/person-picker.js | 2026-07-31 | — | [工程师]+[AI] | 人员选择器组件 |
| docs/src/components/person-picker.css | 2026-09-25 | — | [工程师]+[AI] | **2026-09-25 批次 196：hex 清 20 处（24 → 4）**——**只清「与 `styles.css :root` 令牌值逐字相等、且处在纯 CSS 值语境」的**（替换前后肉眼等效；不新造色 / 不碰 Tailwind 任意值类）；人员选择器样式 |
| docs/src/components/governance/query-view.js | 2026-08-06 | — | [工程师]+[AI] | 查询视图组件 |
| docs/src/components/feedback/reactions.js | 2026-07-31 | — | [工程师]+[AI] | 表态组件 |
| docs/src/components/role-hierarchy.js | 2026-08-30 | — | [工程师]+[AI] | 🗑️ 已删除（死代码清理）。沿革见 `.ctx/logs/`。 |
| docs/src/components/workspace-popover.js | 2026-09-03 | — | [工程师]+[AI] | 🗑️ 已删除（工作台多身份弹窗余毒清理） |

### docs/src/entries/ (页面入口层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/entries/pages/main-entry.js | 2026-10-04 | — | [工程师]+[AI] | 首页入口（含日历+通知待办） |
| docs/src/entries/pages/login-entry.js | 2026-09-21 | — | [工程师]+[AI] | 登录页入口（按钮主 CTA 档；**2026-09-21 批次 139：开发身份卡加「党小组副组长」**——同一套组长工作台、任务优先给组长，`D-571`） |
| docs/src/entries/pages/about-entry.js | 2026-08-19 | — | [工程师]+[AI] | 关于页入口（支部的故事；静态壳）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/pages/archive-entry.js | 2026-10-05 | — | [工程师]+[AI] | 归档页入口 |
| docs/src/entries/pages/activity-entry.js | 2026-10-03 | — | [工程师]+[AI] | 活动 / 专班统一详情页入口（品牌认定＝提案 / 撤回 / 取消认定三态；含「追加复盘（支委会要求）」卡与两个动作）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/pages/settings-entry.js | 2026-09-29 | — | [工程师]+[AI] | 设置页入口（外观 / 我的工作台 / 支部治理三档；支部制度参数卡可调项与各域职责参数）。沿革见 `.ctx/logs/2026-10-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 356）」。 |
| docs/src/entries/pages/feedback-entry.js | 2026-07-31 | — | [工程师]+[AI] | 反馈页入口 |
| docs/src/entries/pages/help-entry.js | 2026-09-27 | — | [工程师]+[AI] | **（2026-09-27 批次 211–212：路一——左目录 `TOC_ITEMS` **10 → 11**（写死数组，随第 4 章「设置逐项」独立而 +1））** 帮助页入口（系统说明书；静态壳模式） |
| docs/src/entries/pages/notice-entry.js | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`，1 处〔党委下发党务标签〕；hex 清零 ⇒ 基线删条目；日期由 `2026-08-06` 刷为 `2026-09-28`）** 通知页入口 |
| docs/src/entries/pages/messages-entry.js | 2026-10-03 | — | [工程师]+[AI] | 私信页入口（状态管理 ＋ 渲染；读走服务层 `notice.js::listMyMessages`、写走 `sendDirectMessage` / `replyToMessage` 单一写口 —— 批次 353）。 |
| docs/src/entries/pages/search-entry.js | 2026-07-31 | — | [工程师]+[AI] | 搜索页入口 |
| docs/src/entries/pages/party-committee-meeting-entry.js | 2026-10-05 | — | [工程师]+[AI] | 支委会会议页入口（制度草案可在审议时勾「报送党员大会表决」；「← 返回我的工作台」入口；效力口径提示条不占流程步序号）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/workspace-entry.js | 2026-07-31 | — | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理） |
| docs/src/entries/workspace/ws-secretary-entry.js | 2026-09-28 | — | [工程师]+[AI] | 支书工作台入口（条件抑制重渲染 ＋ 高亮存活；深链按活动类型归位：支委会 → `committee-meeting`、其余 → `calendar`）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/workspace/ws-org-commissioner-entry.js | 2026-10-05 | — | [工程师]+[AI] | 组织委员工作台入口（活动深链落「活动日历」＋定位）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/workspace/ws-prop-commissioner-entry.js | 2026-08-24 | — | [工程师]+[AI] | 宣传委员工作台入口（薄壳化 ＋ 条件抑制 / 轮询定位）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/workspace/ws-disc-commissioner-entry.js | 2026-08-24 | — | [工程师]+[AI] | 纪检委员工作台入口（薄壳化 ＋ 条件抑制 / 高亮存活）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/workspace/ws-leader-entry.js | 2026-08-24 | — | [工程师]+[AI] | 党小组组长工作台入口（薄壳化 ＋ 条件抑制 / 轮询定位）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/workspace/ws-visitor-entry.js | 2026-08-24 | — | [工程师]+[AI] | 访客/成员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+高亮存活） |

### docs/src/entries/tabs/ (工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/entries/tabs/leader/_shared.js | 2026-08-22 | — | [工程师]+[AI] | 组长工作台共享上下文（纯函数 `currentLeaderGroup` / `filterByRole`）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/todo-tab.js | 2026-08-22 | — | [工程师]+[AI] | 组长「待办」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/overview-tab.js | 2026-08-22 | — | [工程师]+[AI] | 组长「工作概况」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/write-tab.js | 2026-10-05 | — | [工程师]+[AI] | 组长活动管理 tab（含决策树引导式写入；活动信息区顶部有「先报备、报备通过后方才写入」提示，**不设门槛**）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/attendance-tab.js | 2026-10-04 | — | [工程师]+[AI] | 组长「考勤上传」tab（党课 / 党员大会上传位在纪检；支委会不考勤）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/inspection-tab.js | 2026-10-04 | — | [工程师]+[AI] | 组长「考察上传」tab（只收本组活动考察）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/review-tab.js | 2026-09-25 | — | [工程师]+[AI] | 组长「复盘提交」tab（本区仅展示状态；提交说明见 `help.html#card-copy-review-submit`）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/members-tab.js | 2026-10-05 | — | [工程师]+[AI] | 组长「组员进展」tab（三区：卡点 / 进度 / 汇报）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/tf-view-tab.js | 2026-10-04 | — | [工程师]+[AI] | 组长「专班查看」tab（URL 直达高亮）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/leader/my-dispatch-tab.js | 2026-08-22 | — | [工程师]+[AI] | 组长「我的处置」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/secretary/agenda-form.js | 2026-09-21 | — | [工程师]+[AI] | 支书工作台·议程表单（2026-09-21 批次 129 **补登**——本表原先无此行；本批「拟上会」清单第 4 类目 `partyVote`：待报送党员大会表决的制度） |
| docs/src/entries/tabs/secretary/work-map-tab.js | 2026-09-28 | — | [工程师]+[AI] | 支书工作台·支部分工（工作地图）三视图（写侧默认折叠；`_ownerLabel` 含 `org` 分支、按人矩阵收 `org` 入人维；模块目录 **14 项**）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/secretary/calendar-tab.js | 2026-10-05 | — | [工程师]+[AI] | 支书工作台·日历 tab（活动的**写入主线**：全支部日历 ＋ 写入 ＋ 查询；草案判据单一源 `isAgendaDraftDoc`；写入浮窗表单步有「先报备」提示、页脚有「相关设置」深链）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/secretary/overview-tab.js | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 27→19，含 `overview-tab.js:516` 死兜底随删消除〕；`D-674`）** **（2026-09-26 批次 205–207：本表原无其行，本批补行；日期＝该批次落点日。hex 3 处清；收基线 `c` 30→27）** 支书工作台·概况 tab |
| docs/src/entries/tabs/secretary/notification-tab.js | 2026-10-05 | — | [工程师]+[AI] | 通知发布 tab（全支部通知 / 指定人私发；私信 fan-out 走服务层单一写口 —— 批次 353）。 |

| docs/src/entries/tabs/shared/activity-calendar-tab.js | 2026-10-04 | — | [工程师]+[AI] | **2026-09-30 批次 310 新建**——全角色共用的**只读「活动日历」页签**（支书台之外五台挂载）。**边界**：只渲四视图 ＋ 图例 ＋ 月份选择（引擎单一源 `components/record/calendar.js`），**不带**写入 / 统计 / 活动查询 / inspector；点条目 → `activity.html?id=`。**为什么**：此前「活动日历」只长在支书台（本表 `secretary/calendar-tab.js` 行），支书裁定「每个人应该都有这样的活动日历界面」。 |

### docs/src/entries/tabs/org/ (组织委员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/entries/tabs/org/todo-tab.js | 2026-10-04 | — | [工程师]+[AI] | 组织委员「待办」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/overview-tab.js | 2026-08-23 | — | [工程师]+[AI] | 组织委员「工作概况」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/inspection-tab.js | 2026-10-04 | — | [工程师]+[AI] | 组织委员「考察上传」tab（只收专班考察）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/taskforce-tab.js | 2026-10-05 | — | [工程师]+[AI] | 组织委员专班管理 tab（含发布招募；**专班赋权**落点＝情景③，宿主 `#org-tf-assign-host`）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/talent-tab.js | 2026-10-04 | — | [工程师]+[AI] | 组织委员「人才库」tab（含「活动参与汇总」卡）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/development-tab.js | 2026-10-01 | — | [工程师]+[AI] | 🗑️ 已删除（整页并入「人才库」；发展阶段变更写入位改 `person.html`）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/my-dispatch-tab.js | 2026-08-23 | — | [工程师]+[AI] | 组织委员「我的处置」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/org/roster-tab.js | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 227：R10「成员流动」拆 tab——删流动面板与其函数 / 导入〔**保留**行内「移出」〕；名册 **119 → 107 div**；`style-baseline` 删本文件 hex 条 ＋ `HEX_MOVE_LEDGER` 1 条〔→ `member-flow-tab.js`，`#cbd5e1`〕；`D-675`）** **2026-09-25 批次 196：hex 清 13 处（15 → 2）**（同一「等价令牌」选面原则）；组织委员成员名册 tab（**2026-09-21 批次 138 补登**——本表原先无此行；本批「登记流入」浮窗页脚加一条设置入口，`settingsLink` 单一源 → 组织职责参数） |

### docs/src/entries/tabs/prop/ (宣传委员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/entries/tabs/prop/todo-tab.js | 2026-08-23 | — | [工程师]+[AI] | 宣传委员「待办」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/prop/overview-tab.js | 2026-08-23 | — | [工程师]+[AI] | 宣传委员「工作概况」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/prop/tasks-tab.js | 2026-10-03 | — | [工程师]+[AI] | 宣传任务 tab（`PROP_TASKS_SEED` 即服务端 `SEED_PROP_TASKS` 的单一源）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/prop/kanban-tab.js | 2026-09-25 | — | [工程师]+[AI] | 项目看板 tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/prop/weekly-tab.js | 2026-10-05 | — | [工程师]+[AI] | 周报报送实现。**边界**：已非独立页签——由「档案归档」页内折叠区挂载。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/prop/archive-tab.js | 2026-10-05 | — | [工程师]+[AI] | 档案归档 tab（含**照片墙**：上传 / 标注 / 按拍摄日期分组；周报报送作为**归档特例**落在页内折叠区；归档行两枚留痕位「标记已发送（微信 / 对外）」与「标记已上报党建平台」分开记）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/prop/my-dispatch-tab.js | 2026-08-23 | — | [工程师]+[AI] | 宣传委员「我的处置」tab。沿革见 `.ctx/logs/`。 |

### docs/src/entries/tabs/disc/ (纪检委员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/entries/tabs/disc/_shared.js | 2026-08-23 | — | [工程师]+[AI] | 纪检委员共享上下文（`DISC_COMMISSIONER_ID`）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/todo-tab.js | 2026-08-23 | — | [工程师]+[AI] | 纪检委员「待办」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/overview-tab.js | 2026-08-23 | — | [工程师]+[AI] | 纪检委员「工作概况」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/attendance-tab.js | 2026-10-04 | — | [工程师]+[AI] | 考勤管理 tab（会议卡：党课 / 党员大会＝纪检上传位；补课说明与 modal 说明走折叠摘要）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/review-tab.js | 2026-10-04 | — | [工程师]+[AI] | 「复盘」tab（由「活动监督复盘」改名）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/inspection-tab.js | 2026-09-28 | — | [工程师]+[AI] | 考察管理 tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/makeup-tab.js | 2026-10-03 | — | [工程师]+[AI] | 补课制度 tab（范围段与归档段走折叠摘要）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/tf-view-tab.js | 2026-10-04 | — | [工程师]+[AI] | 纪检委员「知情查看」tab（只出「活动」段）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/disc/my-dispatch-tab.js | 2026-08-23 | — | [工程师]+[AI] | 纪检委员「我的处置」tab。沿革见 `.ctx/logs/`。 |

### docs/src/entries/tabs/visitor/ (成员工作台 Tab 模块层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/entries/tabs/visitor/todo-tab.js | 2026-08-23 | — | [工程师]+[AI] | 成员「待办」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/visitor/overview-tab.js | 2026-08-23 | — | [工程师]+[AI] | 成员「工作概况」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/visitor/projects-tab.js | 2026-10-05 | — | [工程师]+[AI] | 项目分工 tab（「我的任务」卡片带行内「勾掉」动作）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/visitor/activities-tab.js | 2026-10-04 | — | [工程师]+[AI] | 活动动态 tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/visitor/attendance-tab.js | 2026-09-21 | — | [工程师]+[AI] | 考勤概况 tab（「补课说明」浮窗含相关设置深链）。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/visitor/inspection-tab.js | 2026-09-28 | — | [工程师]+[AI] | 「我的考察」tab。沿革见 `.ctx/logs/`。 |
| docs/src/entries/tabs/visitor/review-tab.js | 2026-09-21 | — | [工程师]+[AI] | 成员台「我的复盘」tab（卡片带「支委会要求」来源标记；**不开**「交回后自行更新」入口）。沿革见 `.ctx/logs/`。 |

### docs/src/services/ (服务层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/services/core/mock.js | 2026-10-05 | — | [工程师]+[AI] | Mock 数据总服务 |
| docs/src/services/branch/workforce.js | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-28 批次 221：`D-671`——该议题议程项原无 `id` ⇒ 全站 0 个表决位；本批补 `id: generateId('ag')` ＋ `kind:'normal'`（`:126-132`）；日期由 `2026-09-22` 刷 `2026-09-28`）** 支部分工提议与采纳（**2026-09-22 批次 141 补登**——本表原先无此行；本批 `ownerDisplay` 补 `org` 分支（显示「支委会」）＋ `_deriveDutyTodos` 对 `org` **不派生到人待办**（防把组织型主体写成 `role` 脏值）；**改派面一字未动**，`D-573`） |
| docs/src/services/core/auth.js | 2026-10-05 | — | [工程师]+[AI] | 认证与赋权服务（**2026-09-21 批次 139：副组长键 `deputy-leader` 的权限集与赋权链**——与组长同一份〔不硬切分正副职责〕，**集中在文件末挂载**；`AUTHORIZE_CHAIN` 支书 / 副支书两行**行内**加该键；`_getUserRoleFromMemory` 改为组长 / 副组长同取更晚一条〔**行数守恒**，`README-server.md` 的逐行引用不漂移〕，`D-571`） |
| docs/src/services/activity/external-dispatch.js | 2026-10-03 | — | [工程师]+[AI] | 外发确认闭环服务（批次 352b 补登） |
| docs/src/services/activity/activity.js | 2026-09-21 | — | [工程师]+[AI] | 活动服务（品牌认定段 / 追加复盘要求段 / 「勾掉即关闭」写口 `completeMyProjectTask` / 活动批准门·支委会档段）。沿革见 `.ctx/logs/2026-10-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 356）」。 |
| docs/src/services/activity/attendance.js | 2026-09-21 | — | [工程师]+[AI] | 考勤服务（**2026-09-21 批次 132：`canUploadAttendance` 改为按会议类型分**——支委会不考勤 / 党课·党员大会＝纪检 / 其余＝该场组织者；`MEETING_ATTENDANCE_TYPES` 注释改准，`D-558`） |
| docs/src/services/activity/decision-tree.js | 2026-10-05 | — | [工程师]+[AI] | 决策树服务 |
| docs/src/services/feedback.js | 2026-07-31 | — | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理，反馈功能由 issues.js IssueStore 承接） |
| docs/src/services/image.js | 2026-07-31 | — | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理，图片记录由 data/data-adapter.js imageRecords 承接） |
| docs/src/services/activity/inspection.js | 2026-07-31 | — | [工程师]+[AI] | 纪检服务 |
| docs/src/services/governance/issues.js | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化〕；两处 `#b91c1c` 全在兜底里、删后清零 ⇒ **按纪律删基线条目**；`D-674`）** 事项服务（**2026-09-23 批次 155**：`ISSUE_DOMAINS` 四条各补 `replyHint` ＋ 新纯函数 `issueDomainReplyHint`——母本 `常见工作场景快速指南.md:439-444` 表第 3 列「反馈时间」的系统落点；口径本表早已收〔`D-399` / `D-428`〕，本批补呈现位，`D-598`） |
| docs/src/services/activity/makeup.js | 2026-09-27 | — | [工程师]+[AI] | **（2026-09-27 批次 211–212：路二——「补课范围」由**编译期常量**（`MAKEUP_DEFAULT_ACTIVITY_TYPES` 模块级字面量 ＋ `+7` 硬编码）改为 call-time 读 `POLICY_DEFAULTS`（`makeupDefaultActivityTypes()` / `makeupDeadlineDays()`）；真机纪检改 6 项后 `makeupDefaultActivityTypes()=['支部党员大会']` / `isMakeupRequired({type:'党课'})=false` / `makeupDeadlineDays()=14`）** 补课服务 |
| docs/src/services/governance/milestones.js | 2026-08-11 | — | [工程师]+[AI] | 里程碑服务 |
| docs/src/services/governance/notice.js | 2026-10-05 | — | [工程师]+[AI] | 通知服务（含通知 → 待办派生）。沿革见 `.ctx/logs/`。 |
| docs/src/services/member/person.js | 2026-08-03 | — | [工程师]+[AI] | 人员数据抽象服务（PersonStore，T-142 阶段2） |
| docs/src/services/governance/soft-void.js | 2026-10-03 | — | [工程师]+[AI] | 业务记录「作废（软）」统一写口（2026-10-02 批次 346 新建；本行 2026-10-03 批次 352 **补登**——本表原先无此行） |
| docs/src/services/governance/secretary-overview.js | 2026-10-05 | — | [工程师]+[AI] | 支书全局概况服务（T-143，E2 派生待办 flow；**2026-09-21 批次 132：`_aggAttendanceRemind` 排除不考勤类型**〔支委会〕——单源 `policy attendnoAttendanceTypes`，`D-558`） |
| docs/src/services/governance/review.js | 2026-07-31 | — | [工程师]+[AI] | 审查服务 |
| docs/src/services/core/roles.js | 2026-07-31 | — | [工程师]+[AI] | 角色服务 |
| docs/src/services/core/runtime.js | 2026-07-31 | — | [工程师]+[AI] | 运行时插槽 |
| docs/src/services/activity/signup.js | 2026-10-05 | — | [工程师]+[AI] | 报名记录服务（活动 / 专班统一报名渠道；分级审批 · 审核待办派生）。 |
| docs/src/services/activity/taskforce.js | 2026-10-05 | — | [工程师]+[AI] | 专班服务（含专班→待办派生） |
| docs/src/services/activity/work-assignment.js | 2026-10-03 | — | [工程师]+[AI] | 活动「工作分工」（服务端表 assignments）统一读写口；全 CRUD。 |
| docs/src/services/governance/today-summary.js | 2026-10-03 | — | [工程师]+[AI] | 「今天」页今日聚合服务（纯逻辑可测；今日活动参与判定）。 |
| docs/src/services/governance/todo.js | 2026-10-05 | — | [工程师]+[AI] | 待办服务（TodoStore+NoticeTodoDeriver+LifecycleTodoDeriver，E2 flow 标注） |
| docs/src/services/branch/branch-doc.js | 2026-10-05 | — | [工程师]+[AI] | 支部文件服务（2026-09-21 批次 129 **补登**——本表原先无此行；本批新增「制度链」段：草案 / 待党员大会表决两态 ＋ 支委会审议结果应用 ＋ 草案修改，`saveDoc` 增 `asDraft`） |
| docs/src/services/activity/agenda-follow-up.js | 2026-09-21 | — | [工程师]+[AI] | 议程跟办服务（2026-09-21 批次 129 **补登**——本表原先无此行；本批「讨论文件」分支按 `purpose:'institution'` 分流到制度链，`recordAgendaResult` 增 `reportToPartyMeeting`，非制度文件仍走原归档；**批次 132 再加 `brand-designation` 分流**⇒ 品牌认定「通过才置 `isBrand`」，`D-559`） |
| docs/src/services/member/group-view.js | 2026-09-21 | — | [工程师]+[AI] | 党小组分组只读聚合（2026-09-21 批次 139 **补登**——本表原先无此行；本批「本组组长」这一格的解析改为**组长优先**〔`leader`〕、**组内无组长时才回落副组长**〔`deputy-leader`，次选〕——即「任务优先打给组长」，`D-571`） |

### docs/src/data/mock/ (Mock 数据层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/data/mock/index.js | 2026-09-29 | — | [工程师]+[AI] | Mock 数据桶文件 |
| docs/src/data/mock/accounts.js | 2026-09-29 | — | [工程师]+[AI] | 账户数据 |
| docs/src/data/mock/activities.js | 2026-09-29 | — | [工程师]+[AI] | 活动数据 |
| docs/src/data/mock/attendance.js | 2026-09-29 | — | [工程师]+[AI] | 考勤数据（**2026-09-25 批次 198（`D-658`）：`_ALL_PERSON_IDS` 加支部归属过滤**——`PEOPLE.filter((p) => p.branchId).map((p) => p.id)` ⇒ 剔除党委组织员 `p_pc`（`branchId:null`）、`attendances` **154 → 152**；**由「另一路」落地，本表行刷为 `2026-09-25`**） |
| docs/src/data/mock/inspection.js | 2026-09-29 | — | [工程师]+[AI] | 纪检数据 |
| docs/src/data/mock/notices.js | 2026-09-29 | — | [工程师]+[AI] | 通知数据 |
| docs/src/data/mock/people.js | 2026-09-29 | — | [工程师]+[AI] | 人员数据 |
| docs/src/data/mock/review.js | 2026-09-29 | — | [工程师]+[AI] | 审查数据 |
| docs/src/data/mock/seed.js | 2026-09-29 | — | [工程师]+[AI] | 种子数据（**2026-09-25 批次 198（`D-658`）：`SEED_MAKEUP_TASKS` 的 `attendanceRecordId` 由孤儿引用 `'att-sep-1'` 改准为真实 id `'att900'`**——原值对不上任何考勤行 ⇒ 纪检台「确认完成 → 回写考勤 `made_up`」会 `find` 落空 ⇒ **B3-1 回写静默失效**；**由「另一路」落地，本表行刷为 `2026-09-25`**） |
| docs/src/data/mock/taskforces.js | 2026-09-29 | — | [工程师]+[AI] | 专班数据 |

### docs/src/capabilities/ (能力声明层) · docs/src/components/sections/ (页级板块)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/capabilities/activity-calendar.js | 2026-09-29 | — | [工程师]+[AI] | 首页活动日历能力声明（自注册模式，T-279 M1 新建） |
| docs/src/capabilities/secretary-workspace.js | 2026-10-03 | — | [工程师]+[AI] | 支书工作台能力声明（tab 清单自注册，scope='workspace:secretary'；本行 2026-10-03 批次 351 **补登**——本表原先无此行） |
| docs/src/capabilities/leader-workspace.js | 2026-10-05 | — | [工程师]+[AI] | 组长工作台能力声明（tab 清单自注册，scope='workspace:leader'，T-279 M2e 新建） |
| docs/src/capabilities/org-workspace.js | 2026-10-05 | — | [工程师]+[AI] | **（2026-09-28 批次 227：R10「成员流动」拆 tab——在 `roster` 后注册 `{ id:'member-flow', label:'成员流动' }`（组织台 **11 → 12**）；`D-675`）** 组织委员工作台能力声明（tab 清单自注册，scope='workspace:org'，T-279 M3 新建） |
| docs/src/capabilities/prop-workspace.js | 2026-10-04 | — | [工程师]+[AI] | 宣传委员工作台能力声明（tab 清单自注册，scope='workspace:prop'，T-279 M3 新建）。**边界**：tab 数 9；改 tab 结构须同批改 `help.html §0.1/§2.3` 与 `README-server.md §3.2.3`。 |
| docs/src/capabilities/disc-workspace.js | 2026-10-05 | — | [工程师]+[AI] | 纪检委员工作台能力声明（tab 清单自注册，`scope='workspace:disc'`；tab 数 9）。沿革见 `.ctx/logs/`。 |
| docs/src/capabilities/visitor-workspace.js | 2026-10-04 | — | [工程师]+[AI] | 成员工作台能力声明（tab 清单自注册，scope='workspace:visitor'，T-279 M3 新建） |
| docs/src/capabilities/taskforce.js | 2026-09-29 | — | [工程师]+[AI] | 专班运行能力声明（自注册；**2026-09-29 批次 268：解析 `REVIEW_QUEUE H-10` 推荐档 ①——把 `taskforce` 落成真能力 ⇒ 契约 §二「blockId 与 capability / scenario id 一一对应」恢复唯一口径，`block-manifest::S5` 的例外台账**清零**） |
| docs/src/components/sections/references.js | 2026-10-05 | — | [工程师]+[AI] | 资料查询模块（制度行按状态分档：草案 / 已退回 / 待党员大会表决 / 现行版 / 停用；草案行有「修改草案」操作、成员侧只见现行版）。沿革见 `.ctx/logs/`。 |

### docs/src/workflow/ (工作流层)

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/workflow/index.js | 2026-07-31 | — | [工程师]+[AI] | 桶文件 |
| docs/src/workflow/sop.js | 2026-07-31 | — | [工程师]+[AI] | SOP 实例化 |
| docs/src/workflow/sopData.js | 2026-09-15 | — | [工程师]+[AI] | SOP 数据模板 |
| docs/src/workflow/engine.js | 2026-08-02 | — | [工程师]+[AI] | 工作流引擎 |
| docs/src/workflow/definitions.js | 2026-07-31 | — | [工程师]+[AI] | 工作流定义 |
| docs/src/workflow/renderer.js | 2026-07-31 | — | [工程师]+[AI] | 工作流渲染器 |

### docs/src/ 其他

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/src/styles.css | 2026-09-28 | — | [工程师]+[AI] | 全局样式单一源（令牌表 + 组件族 + 深色主题；`about.css` / `person-picker.css` 为分件）。**边界**：零引用类由 `server/test/dead-selector-guard.test.mjs`（`Z1`–`Z4`）守、硬编码色由 `server/test/hex-hardcode-guard.test.mjs`（`H1`–`H5`）守；两份台账都**只减不增**。沿革见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 311）」。 |
| docs/src/about.css | 2026-09-28 | — | [工程师]+[AI] | **（2026-09-28 批次 227：CSS 零引用类全删——本文件 **3 类**（净 −26 行）＋ `.ab-edge-arrow{}` 空规则 / `.ab-hero-scroll-hint` 死 `animation` ＋ 孤立 `@keyframes ab-bounce-hint`；⚠ 本文件另有**他人未提交**改动（删 `.ab-bounce-hint` / `.ab-edge-arrow`）、**非本批**；`D-675`）** 关于页独立样式表（ab-* 内容区 + 南西油墨宋 @font-face + Tailwind 最小兜底，about.html 独占引用；T-272 第一章错落无竖线/第二章文字优先） |

### docs/ 其他

| 文件路径 | last_updated | 移入归档日 | 角色 | 备注 |
|---------|-------------|--------|------|------|
| docs/assets/images/party_emblem.png | 2026-05-21 | — | [用户] | 党徽 |
| docs/data/issues.json | 2026-09-17 | — | [工程师]+[AI] | 事项数据 |
| docs/data/milestones.json | 2026-07-17 | — | [工程师]+[AI] | 里程碑数据 |

---

## 周期性任务最后执行时间

| 编号 | 任务 | 最后执行 | 下次到期 | 状态 |
|------|------|---------|---------|------|
| W1 | 执行日志扫描 | 2026-07-31 | 2026-08-07 | OK |
| W2 | Emoji 合规扫描 | 2026-07-31 | 2026-08-07 | OK |
| W3 | 支书内容评议 | 2026-07-31 | 2026-08-07 | 待支书触发 |
| W4 | 专项评议循环 | 2026-08-10 | 2026-08-17 | OK（T-209 建立；反论 T-116/理论复用 T-117/黑话审查 T-195/原话复核 T-200 四专项承接） |
| M1 | CLAUDE.md 清理 | 2026-07-31 | 2026-08-31 | OK |
| M2 | SNAPSHOT 更新 | 2026-08-10 | 2026-08-31 | OK（v16 升版） |
| M3 | 全仓断链扫描 | 2026-07-31 | 2026-08-31 | OK |
| M4 | Insights 经验蒸馏 | 2026-07-31 | 2026-08-31 | OK |
| M5 | DOCUMENTATION_MAP 审查 | 2026-07-31 | 2026-08-31 | OK |
| M6 | README 审查 | 2026-08-10 | 2026-08-31 | OK（门面重构） |
| Q1 | ARCHITECTURE 审查 | — | — | 待初始化 |
| Q2 | 角色体系健康度 | — | — | 待初始化 |
| Q3 | SOP 文本审查 | — | — | 待初始化 |
| Y1 | 年度系统审计 | — | — | 待初始化 |

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
