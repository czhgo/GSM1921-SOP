---
title: "系统快照"
type: snapshot
role: "[AI]"
last_updated: "2026-11-22"
status: "ACTIVE"
layer: reference
date: "2026-10-23"
version: "v62"
---

# System Snapshot — v62

> 当前活跃基线。历史快照见 `.ctx/logs/archive/2026-10/snapshots/`。

> **职能（2026-09-17 立，规范见 [OPERATIONS_GUIDE §5.1](../content/03_doc_system/OPERATIONS_GUIDE.md)）**
> **回答什么问题**：「**这个系统现在长什么样**」——目录结构、页面与数据表清单、账号与角色、当前基线口径。**AI 新会话开局靠它一次同步到现状**，不必重读全部历史。
> **不回答什么**：① **沿革与「哪一批做了什么」** → `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **工程打分与改造行动线** → `.ctx/ENGINEERING_ASSESSMENT.md`；③ **文档职责与目录导航** → `content/03_doc_system/DOC_MAP.md`；④ **架构原理与分层** → `content/03_doc_system/ARCHITECTURE.md`；⑤ **数据模型字段定义** → `content/04_web_design/data/DATA_MODEL.md`（本文件只列「有哪些」，不定义「字段是什么」）。
> **谁什么时候读**：`[AI]` 主读；**新会话开局 / 换人接手时必读**，其余时候按需（on-demand）。
>
> **沿革块的去向（2026-09-17 立）**：本文件 YAML 头不再有 `milestone` 字段、正文不再保留「生成 / 上版 / 变更来源 / 版本里程碑」四类沿革块——**版本要点是沿革，归日志**。**迁到哪儿**：此前 `milestone` 字段的误用与移出经过、`上版 / 变更来源` 两行与四类沿革块的迁出经过，见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节；逐版沿革见同日志「**附：SNAPSHOT 版本沿革**」节。**为什么迁**：本文件职能＝「这个系统现在长什么样」（见头下职能声明），沿革与月度执行日志重叠。**现在要查**：现状看本文件以下各节，沿革去上述日志附节。

## I. 全局物理拓扑

```text
GSM1921-SOP/
├── README*.md / CLAUDE.md / CHANGELOG.md / CONTRIBUTING.md / LICENSE
├── docs/           前端：26 页（18 根 + 8 工作台/只读视图）· src/（entries 3 类 · components 6 域 · core 4 子域 · data · services 5 域 · capabilities · workflow · styles.css）
├── server/         Node/Express + better-sqlite3：routes/（resources 六件 + 语义）· services · security · scripts · test（四层）
├── content/01–05   战略 / 制度 / 文档体系 / 设计·数据·部署 / AI 方法
├── deploy/         打包 · 安装 · 升级 · 换轨 runbook
└── .ctx/           active / reference / provenance（见 .ctx/README.md）
```

> 逐文件清单见 §III（页面）与 `content/03_doc_system/DOC_MAP.md`；本树不逐文件复述。
> **数据五数**：资源表 34 · 语义表 10 · 工作组表 6 · 业务表 50 · schema v19（source：`server/data/domain-contract.mjs`）。

## II. 分层架构（D-218 正交维度模型）

**多支部服务边界（D-823）**：一个党委下可由同一服务实例承载多个支部。普通支部账号的读取在服务端限制为本支部；党委组织员可选支部或生成跨支部汇总。支部局部快照保留其他支部数据；成员和支部治理数据不通过通用快照写入。各业务动作的角色授权仍按接口逐项核对，详见 `README-server.md §7.1` 与 `DATA_MODEL.md §1.2.1`。

| Layer | 名称 | 位置 | 角色 |
|-------|------|------|------|
| 0 | 宪章层 | `CLAUDE.md` + `content/03_doc_system/ARCHITECTURE.md §十`（原 `SSOT_INDEX.md`；2026-09-25 批次 179 并入） | [工程师]+[AI] |
| 1 | 上下文层 | `CLAUDE.md`（HARNESS 入口）+ `content/03_doc_system/ARCHITECTURE.md` | [工程师]+[AI] |
| 2 | 理念维度 | `content/01_strategy/` + `content/04_web_design/`（为什么这样做/为什么这样设计） | [用户]/[工程师] |
| 2.5 | 治理维度 | `content/03_doc_system/`（系统治理规范） | [工程师] |
| 3 | 执行维度 | `content/02_institution/sop/`（怎么做） | [用户]+[AI] |
| 4 | 代码实现层 | `docs/src/` + `docs/*.html`（页面清单见 §III）+ `server/` | [工程师]+[AI] |
| 5 | 审计层 | `.ctx/`（logs/snapshots/REVIEW_QUEUE/TIMESTAMPS） | [AI]/[工程师]+[AI] |
| 6 | 参考层 | `content/01_strategy/references/` | [用户] |

> **D-218**：SOP（执行细节）和 guides（理念概括）是正交维度，不排先后。
> CLAUDE.md 是最高层上下文入口，承接理念和具体细节。

## III. 核心文件清单

- **治理文件**：`CLAUDE.md`（甲 / 乙 / 丙三部）、`content/03_doc_system/ARCHITECTURE.md`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md`。
- **前端页面实测 26=18 根+8 工作台（以 docs/ 实况为准）**：18 根（`index.html / notice.html / messages.html / help.html / login.html / about.html / archive.html / search.html / feedback.html / activity.html / activity-materials.html / party-committee-meeting.html / taskforce.html / wizard.html / branch-config.html / settings.html / person.html / thought-report.html`）＋ 8 工作台 / 只读视图（`workspace/` 7 ＋ 只读项目视图 1）。
- **逐页职责**：`docs/help.html §2` 与 `content/03_doc_system/DOC_MAP.md`（本文件不复述）。

## IV. 核心理论

| 理论 | 核心公式 | 详细文档 |
|------|---------|---------|
| 组织性 | 在「管理事，服务人」中获得成长；组织性是资源而非门槛 | OPERATIONS_GUIDE.md §19（《运行与协作规范》术语使用规范；2026-09-03 支书裁定；原 USAGE_POLICY.md 已于 2026-09-26 批次 202 并入）+ insights 党支部管理与实务经验沉淀.md §1 |
| 专班 | 活动之外考察积极分子的载体；赋权是运行支撑机制，工作量记录是运行保障机制 | COMMISSIONER_DUTY_FRAMEWORK.md §A.3~A.8 |
| 赋权关系链 | 党支书→支委/党小组组长；党小组组长→组织者/深度参与者；组织委员→专班成员 | COMMISSIONER_DUTY_FRAMEWORK.md §C |
| SOP 母本·系统实施 | 文本SOP是母本，系统是实施层；同步有边界（母本优先，先改 SOP 再同步系统，避免死循环） | SOP_WEBSITE_GUIDE.md §C.2（原 SOP_WEB 更名） |
| 信息密度精确原则 | 信息可见性是职责空间的投影；按人视图按赋权链投影（L0 个人 / L1 条线 / L2 全局） | DESIGN_SYSTEM.md §一 原则9 (P-015 第四道防线) |
| 正交维度 | SOP(执行细节) ⊥ guides(理念概括)；CLAUDE.md 作为上下文入口 | OPERATIONS_GUIDE.md §1.1 (D-218) |
| 最小三成本原则 | 最小信息成本+最小操作成本+最小适应学习成本，系统设计应让用户以最低成本完成任务 | DESIGN_SYSTEM.md §一 第2条 |
| 高频零跳转 | 最小三成本的最终验收标准——完成一个高频工作需要操作多少次？信息展示与操作是否同地 | DESIGN_SYSTEM.md §一 原则10 |
| 按人视图·知情边界 | 谁能看到谁由赋权链（执行委托）计算得出；看与做相区分，可见性不授予操作权 | DESIGN_SYSTEM.md §一 原则9 + visibility.js (P-015) |
| 知情必达 vs 审核把关 | 通知/阅读回执属「知情必达」（需触达全员，逐人确认合理）；质量把关类（考勤/考察/宣传材料/组织发展）属「审核」=源头审校+异常驱动+抽查——两类不可混同 | REVIEW_QUEUE 附录⑤ 检查要点库（2026-08-29 第5轮入库）+ attendance.js 实施基准 |
| 应到名单·滞留党员 | 「滞留党员」=关系在·人不在；三会+党课应到=党员（正式+预备）非滞留（在册 21−滞留 2=应到 19）、党小组会按组；候选可见可辨禁选、通知照发 | services/member/roster.js + REVIEW_QUEUE 附录⑧（2026-09-06 支书裁，T-041/T-046） |
| 向支书提问准则 | 支书决断 strategy/product/marketing，AI 负责代码工程；请裁呈「选项+上下文+推荐+默认」，把决策做薄 | CLAUDE.md H60（T-043） |
| SOP 回写 | 将网页中已实现的工作逻辑反整合到SOP中（用业务语言），使SOP成为规范、结构化、清晰的制度母本 | SOP_WEBSITE_GUIDE.md §C.5（原 insights 工程演进与设计方法论 §4.11 承接） |
| 打卡化判定 | 完成必须对应真实产物——`complete(task)` 的副作用集合仅含状态翻转即为打卡化设计缺陷 | DESIGN_METHODOLOGY.md §3.1（原 insights §6.23） |
| 能力注册表·插件化 | 功能单元按「能力声明」注册（register/get/mount 三原语 + unregister/resolveDeps），消费点从清单读取自动发现；6 工作台薄壳化 + 数据源/场景注册化 + 入口/HTML 瘦身（M1-M4 + HTML 公共资源抽取方案A 完成；量化评估见 .ctx/ENGINEERING_ASSESSMENT.md（工程化评估与改造行动线）；**综合分 2026-09-29 实测 ≈85**——原记「2026-09-06 v4 ≈76」已过时） | ARCHITECTURE_EVOLUTION.md §二（插件化演进）+ §八（拖拽编排愿景）+ .ctx/ENGINEERING_ASSESSMENT.md |
| 归属显式化 | 支部语境归属判定一律 `getBoundBranch`（person 无 branchId/查无分支→null，不被示例支部冒充）；登录无归属 header 中性「未绑定支部」，设置支部治理/域参数提示先由党委确认归属、换组织向导不唤起 | services/branch/branch.js + settings-entry.js（T-075①，2026-09-09） |
| config 颗粒度·审计内核 | 支部 config 写权六层：个人偏好（无留痕）→ 组织档案/modules/blocks/workforce（configChangeHistory 留痕 why）→ 域参数 L2（POLICY_OVERRIDABLE 白名单，各域负责人仅本域）→ 制度刚性 L3（只读锁定）；单键变更可回滚（历史保留 100 条、回滚再留一痕、历史不改写） | PARTY_COMMITTEE_DESIGN.md §2.6（2026-09-09 审定定稿）+ SYSTEM_ROLE_PERMISSION.md §9h + settings-entry.js/config-clean.js/policy-defaults.js |

## V. 权限矩阵摘要

| 角色 | 工作台 |
|------|--------|
| 支书 / 副支书 | 支书工作台（同页同台；四类主责动作按 `D-891` 三档） |
| 组织 / 宣传 / 纪检委员 | 各自工作台（职责见母本 §9） |
| 党小组组长 / 副组长 | 组长工作台（同台；任务优先组长） |
| 成员 / 党委组织员 | 成员工作台 / 党委工作台 |

> 逐角色职责与权限键全集：`content/02_institution/SYSTEM_ROLE_PERMISSION.md §9` ＋ `docs/src/core/domain/constants.js`。

## VI. 版本里程碑

> **本节（原版本里程碑）已按 2026-09-17 裁定移入 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「附：SNAPSHOT 版本沿革」节。**

> **批次小结去向（2026-11-03）**：批次 509–528 的 5 行小结已删除（git 保留历史）；替代索引见 `.ctx/logs/EXECUTION_LOG_INDEX.md` 的「批次索引」表。本文件只答「系统现在长什么样」。
