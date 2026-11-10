---
title: "P2 清账台账（批次 541 分拣：A / B / C / D / E）"
type: evidence
role: "[工程师]+[AI]"
last_updated: 2026-11-10
status: active
layer: evidence
related_files: [.ctx/REVIEW_QUEUE.md, .ctx/ENGINEERING_ASSESSMENT.md, CLAUDE.md]
---

# P2 清账台账（批次 541）

> **答什么**：批次 540 收尾遗留的 P2 项与「代码健康综合评审」余项，逐条分拣成五类，说明**为什么留 / 为什么关**。
> **不答什么**：逐文件 diff（看 `git show`）、批次沿革（看 `.ctx/logs/`）、评分（看 `.ctx/ENGINEERING_ASSESSMENT.md`）。
> **口径**：只保留 B 类在 `.ctx/REVIEW_QUEUE.md` 与 `.ctx/ENGINEERING_ASSESSMENT.md`；C / D / E 关闭后不再回到队列，A 类本批已修完。

## 一、分类定义（布尔判据）

| 类 | 定义（满足即入） | 处置 |
|---|---|---|
| **A** | 真缺陷或判据被写坏，本批可修且必须修 | 本批修完，留读数 |
| **B** | 事实成立，但**开通条件未成立**（需支书裁定 / 前置批完成 / 触发量级） | 留队列，**必须写触发条件**；触发未成立不得开工 |
| **C** | 审计误报：复核证据不成立 | 关闭，不再复核 |
| **D** | 与他条重复，或已被既有常驻守卫覆盖 | 合并到宿主条目，原条关闭 |
| **E** | 不构成工程任务（口径 / 节奏 / 冻结件 / 只能支书本人操作） | 出表，不占队列 |

## 二、A 类（本批已修 · 11 / 11 ✅）

> **勾选口径**：下表 11 条均已在批次 541 修完并带读数（见 §七 / §八）；任一条未落地即视为本批未收口。`A-1`…`A-6` 为判据／守卫类，`A-7`…`A-11` 为首屏计数、议程自判、队列口径、文档刷卡与行号改签。
>
> **本轮已修勾选**：✅ `A-1` · ✅ `A-2` · ✅ `A-3` · ✅ `A-4` · ✅ `A-5` · ✅ `A-6` · ✅ `A-7` · ✅ `A-8` · ✅ `A-9` · ✅ `A-10` · ✅ `A-11`

| # | 项 | 病灶（证据） | 本批处置 |
|---|---|---|---|
| A-1 | `icon-color-guard` 白名单越权 | 白名单按**整文件**跳过 G4，白名单文件里的 hex 永不判红（`server/test/icon-color-guard.test.mjs` 旧 G4 循环 `allow.has(f) → continue`） | 白名单只免「生成点」（G1）；G4 改为扫全部文件（`icons.js` 除外） |
| A-2 | `styles.css` 的 data-URI 内联 hex | `select.input-flat` 的箭头用 `stroke='%239CA3AF'`，绕开令牌也绕开 hex 扫描（CSS 变量在 data-URI SVG 内不生效） | 改纯 CSS 折线，两臂取 `var(--neutral-400)`（与旧值同色）；白名单条目删除（3 处 → 2 处） |
| A-3 | 判例与守卫互相矛盾 | `CASES.md` CASE-DESIGN-039 写「详情页不设自动守卫」，而 `ui-first-screen-order::F10` 已常驻 | 判例「守卫」栏改准，写入 `F10` 与「F10 只判源码结构、视觉仍看双档截图」的边界 |
| A-4 | 判例四条「SD 待登记」 | 035 / 036 / 037 / 038 无规范编号，守卫也不拦 | 分配 SD-62…SD-65（DS_03 §12.15 登记）并回填判例与索引；`docs-governance::G7` 改为拒绝「待登记」 |
| A-5 | 跳转契约条数只设下限 | `keys.length >= 20` 允许「悄悄删一条」 | 改精确等值；实测 30 类（540 记 29 ＋ 541 P0-2 补登 `inspection-review`），文档同批改准 |
| A-6 | fail-closed 只做静态串断言 | 只断言源码里有「本台无该模块」字样，渲染链路坏掉也不会红 | 加一次最小 DOM 桩**真渲**：提示卡 ＋ 同义落点按钮 ＋ 落点须为本台已注册页签 |
| A-7 | 首屏块数按缩进正则计数 | 旧判据以「行首 4 空格 ＋ `section` / `div` / `details` 开标签」计数，模板重排或缩进变化即失真 | 改结构化标记计数（`aria-label` / `aria-labelledby` / 结构 id）＋「每个 `<section>` 必须有名」 |
| A-8 | 议程页可能本地自判 | 分类单一源在 `agenda-classify.js`，但无断言禁止页面自判 | 加断言：会议页只经 `getAdapter().agendaCandidates.list()`，不调 `classifyAgendaItem`、不自持来源清单 |
| A-9 | 队列六类口径陈旧 | `SOP-B-33` 仍写「`D-555` 补 `partyVote`、`D-559` 补 `brand`」 | 改为现行六类 ＋ `party-meeting-pending` 的同步语义边界 |
| A-10 | 文档两处「改而未刷卡」 | `支委与党小组定人定责定岗说明.md`（2026-10-18）、`DATA_CONSISTENCY_CHECKLIST.md`（2026-11-08）晚于提交日 | frontmatter 与 `.ctx/TIMESTAMPS.md` 同批刷 2026-11-10（`docs-governance::F2` red → green） |
| A-11 | `README-server.md` 行号漂移 | `server/db.js:933`（`SCHEMA_VERSION`）实际在 983；`MIGRATIONS` 区间写 224-930 | 改准 `224-980` / `983`（`docs-governance::R2` red → green） |

> 说明：`db-migration.test.mjs` 的期望迁移列表**已是** `[8…15]`（v15 已加），本批无需改，复核读数见验证段。

## 三、B 类（留队列，每条写触发）

| # | 项 | 事实（证据） | 触发条件 |
|---|---|---|---|
| B-1 | 三处 IA 块数漂移 | DOM 实测 `secretary.calendar` 10 / `secretary.report-up` 14 / `visitor.activities` 9 块，登记 3 / 4 / 3（`.ctx/evidence/2026-11-10/tab-audit/summary.md §P2`） | 支书裁定「按 DOM 实测重基线」后当批改 `TAB_BLOCK_BASELINE` 三处；裁定前不得盲改 |
| B-2 | `L-13` 页签 IA 未闭项 | A 35 / B 11 / C 0；6 个超 4 块页签已登记例外（`.ctx/evidence/2026-11-08/tab-review-ledger.md`） | 支书挑 2 条低风险 B 项（`org.talent` 录入考察上提、`disc.attendance` 撤两级切换）裁定后启动 |
| B-3 | `L-10` ＋ `B-536-1` 多支部 | 读过滤夹具 9 组已过，未接线到生产读面；开关仍关闭 | Phase 1–2 实施并验收通过后才可打开 `ALLOW_MULTI_BRANCH` |
| B-4 | `L-15` ＋ `H-24` 画布 / 块决定 tab | 仅登记、未出方案；与 `allowedPages` 身份门及页签计数守卫相交 | 方案定稿并经支书确认后编码 |
| B-5 | `L-16` 表决名单重算 | `voteConfig.voterIds` 由活动写入方固化，服务端未按场景重算 | 支书给出重算口径（`users` ＋ 组织归属）后同批落服务端 |
| B-6 | `L-17` 宽表与索引 | JSON 宽表、无跨表外键、无业务字段索引 | 任一表接近万行或真机出现慢查询读数时启动 `MIGRATIONS v2` 评估 |
| B-7 | `L-18` 组件出口散件 | 徽章 / 选择器等出口仍有零星直连 | 下次改动到该组件域时同批收敛 |
| B-8 | `H-5` / `E-1-①` 评测分口径 | `DOC_MAP.md:124` 与 EA 不一致，属支书批改层 | 支书定「标快照 vs 按现况改准」后两处同批改 |
| B-9 | `H-16` 悬空章节名指针 | `OPERATIONS_GUIDE.md` 指向根 README 不存在的章节 | 支书核可改指 `README-members.md §八` |
| B-10 | `H-20` 部署形态余项 | `server/package.json` Windows 专有语法；表达式索引无落点 | ② 到「跨平台发布」批；③ 与服务端读过滤同批（见 B-3） |
| B-11 | `H-12` / `H-18` 观察项 | 全量档 ① 项待查；目录搬迁三类盲区无机检 | 真机复跑稳定红 ⇒ 升 P1；否则保持观察 |

## 四、C 类（误报 · 关闭）

| # | 项 | 复核结论 | 证据 |
|---|---|---|---|
| C-1 | F6「三处空态不在 `.empty-state`」 | `org.member-flow` 是 `empty-state` 的表格变体（`<tr class="is-empty">`，探针已识别）；`org.thought-review` 的「本期没有记录」是分组提示；`visitor.attendance` 的「出勤 —」是指标占位 | `.ctx/ENGINEERING_ASSESSMENT.md` `L-07` 行；`docs/src/components/ui/empty-state.js`（table 变体） |
| C-2 | 「renderer 假事件链」 | 详情页 render 末尾显式 `bind*` 三处（报名 / 汇报收件箱 / 成员编辑），不存在「注册后从不触发」的链 | `docs/src/entries/pages/activity-entry.js`（`bindSignupEvents` / `bindReportInbox` / `bindWorkgroupMemberEditor` 调用点） |

## 五、D 类（重复 / 已被守卫覆盖 · 合并关闭）

| # | 项 | 宿主条目 | 说明 |
|---|---|---|---|
| D-1 | `H-21` / `H-22` IAAA 前端三步 | `L-19`（已关闭） | 登录按钮 / 选支部层 / 待确认队列已在批次 277–278 落地；`iaaa-onboarding` 常驻 |
| D-2 | `H-11` manifest「表单条目」轴 | 工作流批（`P10` / `L-14` / `L-15`） | 口径已定（`D-679`：只开 `hiddenFieldIds` ＋ `requiredOverrides`）；校验面由 `block-manifest::S2–S4` ＋ `block-orchestration::O1` 覆盖 |
| D-3 | `H-19①` `ws-org` 功能目录陈旧 | 已修（无宿主） | 12 tab 已改准；余项（②③④）归权限口径裁定，不单列 |
| D-4 | `H-9` / `H-14` / `H-15` / `H-8` | 判例性结论，无宿主 | 已修 / 已办 / 已结案；判例句就地保留在 `REVIEW_QUEUE` 分拣注 |

## 六、E 类（不构成工程任务 · 出表）

| # | 项 | 理由 |
|---|---|---|
| E-1 | `L-08` 47 条 exception 无固定复核节奏 | 不是缺陷，是节奏；已并入发布前 `audit-tabs --all` 硬门（同批复核例外理由），不单列条目 |
| E-2 | 公共门厅「SD 编号待登记」 | 本批已回填 SD-62，条目消失（不再是待办） |
| E-3 | `about` 页面（`about.html` / `about.css` / `about-entry.js`）相关审计项 | about 是支书裁定的冻结件，不进 IA 统计与守卫扫描（`about-freeze-guard`） |

## 七、本批验证读数

- 定向：`cd server; node --test test/icon-color-guard.test.mjs test/todo-jump-contract.test.mjs test/ui-first-screen-order.test.mjs test/agenda-classify.test.mjs test/db-migration.test.mjs test/docs-governance-guard.test.mjs test/doc-consistency.test.mjs`
- 结果见批次 541 收尾报告（本文件只登记分拣，不复述测试输出）。

## 八、最终统计（批次 541 收口）

| 类 | 条数 | 处置 | 落点 |
|---|---|---|---|
| A | **11** | 本批已修（A-1…A-11 ✅） | 本文件 §二；对应守卫 / 文档同批改准 |
| B | **11** | 留队列，**每条带触发条件**；触发未成立不得开工 | `.ctx/REVIEW_QUEUE.md` `B-541-1…11` |
| C | **2** | 审计误报，复核证据不成立 ⇒ 关闭，不再复核 | 本文件 §四 |
| D | **4** | 与他条重复或已被常驻守卫覆盖 ⇒ 并入宿主，原条关闭 | 本文件 §五 |
| E | **3** | 不构成工程任务（节奏 / 已消失 / 冻结件）⇒ 出表，不占队列 | 本文件 §六 |
| **合计** | **31** | — | — |

**收口读数**：

- daily **29 文件 / 246 断言 / 81.3s** 全绿；guards **101 文件 / 335 tests / 152.9s** 全绿。
- 页签审计：全量未取终摘要（超时）；按守卫代理报告 **P0 0 / P1 0**，新增 **3 条 P2 基线漂移**（`secretary.calendar` 10 vs 3、`secretary.report-up` 14 vs 4、`visitor.activities` 9 vs 3），登记 `B-1` / `L-22`，待支书裁定重基线。
- 六维（`D-864`）：业务 82 · 安全 79 · 体验 79 · 测试 84 · 架构 79 · 部署 76。

**未收口（不在本台账内）**：`L-16` 表决名单重算、`L-10` 多支部读过滤接线、`L-02` 真机安装 / 升级、CI 两 job 实跑、真人 5 任务签收。
