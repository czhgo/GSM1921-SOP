---
title: "2026年11月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: 2026-11-12
status: active
---

# 2026年11月执行日志

> **边界**（`CLAUDE.md H26.1` / `R-84`）：只留「为什么 / 拿不准 / 边界 / 读数」；过程流水归 `git`，本文件不复述 diff。

## 批次 547（2026-11-12）· 三台专项探查 P0 收口（D-870）

### 为什么
- 4 路只读探查（组长台 / 支委会 / 支委台 / 裁定与 harness）＋主代理逐条复核，确认 6 组 P0：提案↔议程双轨、支委会写门过宽、报表读口越权、宣传台闭环越权、组长读口跨组、v16 迁移测试与守卫漏网。

### 拿不准 / 取舍
- **报表读权**取「支书 / 副支书 / 组织委员 / 党委」，宣传与纪检不默认放开；一处常量 `REPORT_READ_ROLES` 可调。
- **建会写门**只收「支委会」类型，普通活动写权不动，避免误伤归档 / 议程编辑链；进一步收紧留丙部。
- **组长范围**前端算法不本批迁服务端，只先加读门；避免一次改三张页签。
- **S6 行号**用「最近命中」启发式同步；8 条指向空行 / 闭括号的 evidence 手改。

### 边界
- `form-loop-sweep` 真机仍有 `org-taskforce-{reject-reason,contribution,materials}` 与 `messages-compose` / `secretary-feedback` 失败；本批未定位完，登记下一批（需区分是否与对象模型改动相关）。
- `precommit` 全量（含上述真机）本批未跑绿；`daily` / `guards` 两层已全绿。

### 读数
- `test:daily`：**29 文件 / 110.3s / 全绿**。
- `test:guards`：**105 文件 / 130.2s / 全绿**。
- 定向：`committee-flow-guard` 2、`committee-meeting-gate` 3、`report-read-gate` 2、`leader-progress-gate` 4、`prop-kanban-scope` 1、`write-policy-evidence-guard` 1、M7/M8 迁移 8、`permission-gate` + `records-endpoints` + `member-progress` 回归全绿；`form-loop-sweep::S6` 绿。
- 真机：宣传台看板无「确认完成」；组长提案卡 / 支书提案池接口 200。

### commit
- 见本批 commit（`547｜三台 P0 收口…`）。

## 批次 544–546（2026-11-11）· 服务恢复 / 对象模型 / 支委提案（补记）

### 为什么
- 会话中断后恢复服务与 C 盘安全清理（544）；落地 D-868 对象模型（545）与 D-869 支委提案上会（546）。

### 读数
- 新增 `object-model-guard` 5 项、`committee-proposal-state` 4 项、`committee-proposal-routes` 3 项；schema v16（提案两表）。
- `daily` 246 断言 / `guards` 101 文件当时全绿。

### commit
- 见各批 commit（544 / 545 / 546）。

## 批次 543（2026-11-11）· URL 去后缀（D-867）

### 为什么
- 支书选定「URL 去后缀」为下一批；服务端早已支持无后缀，但站内链接仍带 `.html`，地址栏与链接预览都显示后缀。

### 拿不准 / 取舍
- **不做全量静态替换**：`docs` 内 `.html` 引用 375 处 / 100 文件、测试断言 751 处；逐处分类成本高、回归面大。
- **取「单源变换 ＋ 运行时归一」**：`pageHref()` 只做一次后缀变换；`resolveDocumentUrl()`、`object-route`、登录 / 登出 / 深链重定向全部经它；`link-normalize.js` 对初始 DOM 与新增节点统一改写站内锚点。
- **冻结面跳过**：`help` / `about` 作为链接目标与当前页面均不改，避免破坏页内锚点与 `copy-anchor` / `about-freeze` 守卫。
- **不做 301**：旧 `.html` 保持 200；回滚只改 `URL_STYLE`。

### 边界
- 后缀变换唯一出口＝`docs/src/core/base/page-url.js::pageHref()`；不得在调用点另写正则。
- 只改站内相对链接；带 scheme / `//` / 纯 `#` 的不动。
- 静态 HTML 源文件不改，运行时归一覆盖。

### 读数
- `npm run test:guards`：**101 文件全绿 / 101.8s**。
- `npm run test:daily`：**29 文件 / 246 断言 / 73.7s** 全绿。
- 真机（Playwright）：登录后 URL＝`http://localhost:3000/workspace/secretary?tab=today`；站内 `.html` 锚点剩余 **0**（`help` / `about` 除外）。

### 未完成
- 对象模型判据、提案 / 上会回执、建会权收口与决议广播尚未实现。
- 静态源文件仍写 `.html`，靠运行时归一；后续可在改文件时顺手去后缀，逐步清源。

### commit
- 见本批 commit（`543｜URL 去后缀…`）。

## 批次 542（2026-11-11）· 六维保守回调与对象模型 / 议事流裁定

### 为什么
- 批次 541 的六维评分（82/79/79/84/79/76）在「对象模型边界未定、多支部读过滤未接线、P2 基线真实漂移、CI 未实跑」四项证据下偏高；支书要求「不要过度自信」。
- 支书提出四个产品问题：工作组与活动 / 专班的关系、党小组组长统筹、谁能报支委会、支委会工作如何广播。仓库现状没有一份判据表，读面、台账与设计稿各写一份。
- URL 形态：服务端早已支持无后缀，但站内链接仍带 `.html`，用户无法判断「什么时候能不带后缀」。

### 拿不准 / 取舍
- **评分**：只改 `.ctx` 台账，不动代码与测试；六维改为 81/78/78/83/78/76，逐维写「为何回调 ＋ 需补证据」。不采用「只加注不回调」与「顺手改代码把分补回来」。
- **对象模型**：支书裁定「党小组 → 活动 / 专班 → 工作组」，工作组不设指导支委；与现行「活动 / 专班并列业务层、工作组执行层」的层序不同，需重写判据。本批只写设计稿，不改数据表。
- **组长与上会**：取「组内全权 ＋ 支部提案」与「统一事项 ＋ 回执」；现行 `agenda-candidates` 仅支委可读、无提案实体、决议不外发，均列为差距。
- **URL**：取「去后缀 ＋ 兼容」，旧 `.html` 保持 200；本批只写方案，不改链接。`docs` 内 `.html` 引用 375 处 / 100 文件，测试断言 751 处，需按「导航 URL / 文案 / 资产」分类后另批实施。

### 边界
- 设计稿＝`content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md`；实现完成后判据回写 `DATA_MODEL` / `SYSTEM_ROLE_PERMISSION`，设计稿降为论证档案。
- 待裁三项：支部级专班是否存在、决议默认受众、组长提案是否对全体支委可见；未裁前不进入实现。
- 评分口径不变：只认实跑读数，配置与本地等价不计满分。

### 读数
- 定向守卫：`ctx-hygiene-guard` ＋ `doc-consistency` ＋ `docs-governance-guard` **exit 0 / fail 0**（docs-governance 61/61）。
- URL 实测：`GET http://localhost:3000/workspace/secretary` → **200**（无后缀可用）。
- 本批未跑 daily / guards 全量；未改代码，无版本戳变更。

### 未完成
- `D-866` 四项均未实现；按 URL B → 对象模型 → 提案 / 上会 → 建会权与决议广播的顺序推进。
- 设计稿 §七 三项待支书裁定。

### commit
- `6a7e11802`（评分 ＋ D-865/D-866 ＋ 七份 content 日期）

## 批次 541（2026-11-10）· 全仓漏网之鱼审计与 P2 统一清理

### 为什么
- 批次 540 收尾时 P2 与「代码健康综合评审」余项散在三处（审计报告、评审报告、口头结论），没有一张台账说明「哪条留、哪条关、为什么」；同一类问题被反复重开。
- 「应到 / 在册」在客户端与报备、考勤、考察、复盘各写一份口径：滞留与已转出同时存在「保留身份」「剔除应到」「不进任何名单」三种要求，分散实现必漏。
- 服务端待办组按出厂基准算策略，忽略支部 `config.policyOverrides`，与前端读侧注入不一致；专班子记录的 `sourceType` 也没有服务端口径。
- 公共门厅只按 `publishScope` 判可见，过期 / 缺失有效期的 `public` 内容仍可读；定向通知只比 `audience`，不比对支部。
- 「今天」页一行被点后按待办本体 id 定位，而待办页行键是聚合组键 `role:actionKey` ⇒ 跳转后定位不到行。

### 拿不准 / 取舍
- **P2 分拣**：取 A / B / C / D / E 五类，B 类一律写触发条件，不并入本批；C 类复核后直接关闭，不再挂账。
- **应到口径**：滞留保留党员身份、从应到剔除、通知照发；已转出前置剔除（不进任何应到名单）——三者分别成判据，不用一个「有效党员」布尔吞并。
- **审计读数**：`audit-tabs --all` 全量超时未出 summary，沿用守卫代理报告 P0 0 / P1 0；新增 3 条 P2 只登记为基线漂移（`L-22` / `B-541-1`），**不按 DOM 实测改基线**。
- **安全修复边界**：只收紧读面（过期 `public` 一律 404、定向通知加支部比对），不放宽任何写门，也不动矩阵。
- 本批只改代码与台账，评分与判例同批落 `D-864`；不 bump 版本戳、不 commit。

### 边界
- 应到口径单一源＝`docs/src/core/domain/roster-eligibility.js`，调用方不得再自写「党员 − 滞留」。
- 待办行读权限单一源＝`server/routes/resources/todo-read-policy.mjs`，页面不得再各自判可见。
- 公共门厅可见性判定单一源＝`resources/store.js::isPublicNow`；过期 / 缺失有效期即视为不公开，不给探测差异。
- 定向通知 `audience` 命中只是必要条件之一，支部不一致即不可读。
- `TAB_BLOCK_BASELINE` 是「实测 ↔ 登记」锚点，支书裁定前不动。

### 读数
- `npm run test:daily`：**29 文件 / 246 断言 / 101.6s** 全绿（较批次 540：断言 233 → 246）。
- `npm run test:guards`：**101 文件 / 809 tests / 152.9s** 全绿。
- `node scripts/audit-tabs.mjs --all`：全量超时未取终摘要；按守卫代理报告 **P0 0 / P1 0**，新增 3 条真实 P2 基线漂移（`secretary.calendar` 10 vs 3、`secretary.report-up` 14 vs 4、`visitor.activities` 9 vs 3），已登记 `L-22` / `B-541-1`。分项取证见 `.ctx/evidence/2026-11-10/tab-audit/summary.md` 与 `.ctx/evidence/2026-11-10/audit-fix/summary.md`（4 页签 P0 0 / P1 0 / P2 1 · exception 3）。
- P2 台账：**31 条**（A 11 已修 / B 11 带触发 / C 2 误报 / D 4 关账 / E 3 出表），见 `.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`。

### 未完成
- `L-22` 三处块数漂移待支书裁定「按 DOM 实测重基线」；裁定前不改 `TAB_BLOCK_BASELINE`。
- `L-16` 表决名单服务端重算（`B-541-5`）；多支部读过滤接线（`L-10` / `B-536-1`，`ALLOW_MULTI_BRANCH` 仍关闭）。
- 测试 85：CI `daily` / `deploy-verify` 两 job 仍未实跑；部署 77 / 80：`L-02` 真机安装 / 升级未验。
- 体验 80：真人 5 任务签收未完成。
- 版本戳未 bump（由主代理执行）；未 commit。

## 批次 540（2026-11-10）· 前端交互契约与议程 / 表格 / 详情重设计

### 为什么
- 待办与今天页的一行点了之后没有稳定落点：本台没有目标模块时只弹一句 toast，用户停在原地；各台落点分支各写一份 `tabMap`。
- 「哪些事该上会、按哪一档上会」在支书台写议程与党委会议页读摘要之间没有共同口径，服务端也没有汇总口。
- `secretary.group-progress` 的活动台账手写 `<table>`，390 档横向溢出；列宽 / 行高 / 截断各页各写一套。
- 活动详情首屏把 14 个并列块一次摊开，管理动作与参与动作同权；支部分工页 4 套视图里「按项目」是「按人」的转置。
- 图标着色散成四路（`icons.js` 字面 hex、`sidebar` 行内 SVG、`person-picker` 的 CSS data-URI `%239CA3AF`、`custom-select` / `archive-entry` 内联 `<svg>`），hex 扫描漏掉 `%23` 形态。

### 拿不准 / 取舍
- **跳转**：取 fail-closed（未命中给可见提示 ＋ 同义落点），不接受「toast 也算反馈」；`inline` 与 `direct` 两类不套同义落点兜底。
- **议程**：分类函数只给「建议议程步骤」，`agendaStep` 仍由支书在写入面板决定，避免自动落库把制度判断固化进代码。
- **表格**：只登记三档列宽与「全表一列截断」，不把 `relation-matrix` 并进来（两维交叉仍走矩阵）。
- **详情**：块数判据按「一眼看到主路径」；详情页不在 46 个注册页签内，故以双档真机读数复核，不另造自动守卫。
- **图标**：`styles.css` 的既有 data-URI 由同批样式波次迁移，`icon-color-guard::G4` 不为此开口子。
- 本批只改代码与台账，评分与判例同批落 `D-863`；不 bump 版本戳、不 commit。

### 边界
- 待办 29 类动作 × 6 台落点以契约与 `TODO_ACTIONS.roleOverrides` 为单一源，调用方不得另写落点分支。
- 议程去重 / 时效 / 应到属服务端；客户端只做分组 / 排序 / 徽章。
- 表格载体四问的「字段异构 ≤12 项」与「两行以内不起表」不动，避免把列表硬塞成表。
- 分工视图收敛只针对「同一问句的另一种排法」；不同问句仍可各留一种视图。
- About 冻结件与 `.lf-bar` 两行上限未动。

### 读数
- `npm run test:daily`：**29 文件 / 233 断言 / 77.0s** 全绿（较批次 539：文件 27 → 29，断言 210 → 233）。
- `npm run test:guards`：**101 文件 / 809 tests / 133.7s** 全绿（较批次 539：99 文件）。
- `node scripts/audit-tabs.mjs --all`：**46 页签 · P0 0 / P1 0 / P2 2 / exception 44**；`secretary.overview` / `calendar` / `committee-meeting` / `group-progress` / `work-map` 五页 P0 / P1 / P2 均 0；P2 两条仍是 `org.thought-review` 与 `visitor.attendance` 的 F6 空态（已人工确认）。证据 `.ctx/evidence/2026-11-10/tab-audit/summary.md`。
- 真机取证：活动详情 1440 / 390 双档前后截图与 readings（`.ctx/evidence/2026-11-10/activity-detail/`）；概况与分工（`.ctx/evidence/2026-11-10/overview-workmap/`）；表格 1440 / 768 / 390 与拖动后（`.ctx/evidence/2026-11-10/table-540/`）。

### 未完成
- 体验 80：真人 5 任务签收未完成；`B11`（`org.talent` 录入考察沉底）仍为 B 类。
- 测试 85：GitHub Actions `daily` / `deploy-verify` 两 job 仍未实跑。
- 部署 77 / 80：`install.sh` / `install.ps1` / `update.sh` 未在 Linux 真机验证（`L-02`）。
- `L-16` 表决名单服务端重算、多支部读过滤接线（`ALLOW_MULTI_BRANCH` 仍关闭）。
- 三份新契约的 SD 编号待设计系统登记；版本戳未 bump（由主代理执行）；未 commit。

## 批次 539（2026-11-09）· 待办计算化、分工页美学与体验 / 部署提分

### 为什么
- 待办派生有两份实现：7 类在 `todo-derive.js`，发展节点 / 半年考察 / 模块周期三类在 `server/routes/todo-groups.js` 按客户端口径复刻；改一处必漏一处。
- 组织委员前置门写成「有待办行才派生」，空 `todos` 库会把发展节点 / 半年考察提醒整组吞掉（P0 漏提醒）。
- `count` 曾按组混合口径（`member-confirm` 额外并入议程派生批次行），计数与条目数不一致。
- `secretary.work-map` 主从两栏在 390 档挤压；未登录资料查询页只给「请先登录」（`R2` GAP）；部署 `package` 在 Git Bash 报 `tar status 2`。

### 拿不准 / 边界
- 「目录只创建 / 选择」是既有契约：`party-committee.branches` 的 B 项若要「选择既有目录」，须先改契约；本轮**回退未做**。
- 体验只到 77：用户任务仍是自动走查 ＋ 截图，**真人签收未完成**，按「证据强度」不计验收。
- 部署只到 76：`verify-linux` 是本机 Git Bash 的**等价证据**；本机无 `gh`、本批不 commit 不推送，无法取得 GitHub Actions run 链接。
- 本批只改代码 / 台账；评分与台账同批落 `D-862`；不 bump 版本戳。

### 读数
- `npm run test:daily`：**27 文件 / 210 断言 / 63.5s** 全绿（较批次 538 增 3 条待办 P0 回归）。
- `npm run test:guards`：**99 文件全绿**。
- 审计：`secretary.work-map` P0/P1/P2 = 0（3 块 · `.lf-bar` 0 条）；`ia`（dispatch / leader.write / member-flow）P0 0 / P1 0 / P2 1；`b2`（`disc.review` / `party-committee.branches`）P0 0 / P1 0 / P2 0。
- 安全：`write-policy-matrix.mjs:534-536` 的 uploads `roleGate` 改准为 `party-staff | 支委层`。
- 部署：`VERIFY_TMPDIR=D:\…\.tmp bash deploy/verify-linux.sh` **6/6 · 退出码 0**（语法 3/3 · doctor · 起服务 · smoke · preflight strict 阻断 0 / 警告 0 · package 460 文件 / 12.9 MB / 断言 0 命中），PowerShell `package` 退出 0。

### 未完成
- 体验 78：真人签收 5 个用户任务；`B11`（`org.talent` 录入考察沉底）仍为 B 类。
- `party-committee.branches` 的 B 项：须先改「目录只创建 / 选择」契约再排批。
- 部署 77 / 80：GitHub Actions `deploy-verify` 实跑、Linux 真机 `install` / `update`（`L-02`）。
- `L-16` 表决名单重算、多支部读过滤接线（`ALLOW_MULTI_BRANCH` 仍关闭）。
- 版本戳 `20261108c` 未 bump（由主代理执行）；未 commit。

## 批次 538（2026-11-08）· 评分证据卡与安全 / 体验 / 部署梯度

### 为什么
- 批次 536–537 的材料（安全加固、用户任务走查、容器验证脚本）散在证据目录，六维评分仍停在 2026-11-03 的口径；支书要求评分必须带证据卡、未达证据的检查点不加分。
- `L-09` 已有 403 回归但台账仍写待办；`L-13` 仍写 2026-11-02 的算术残值（6 + 7 + 5 / 34 个已完成 / 41 个不盲改），与台账 A/B/C 计数不符。

### 拿不准 / 边界
- 体验 75 与部署 75 都不授予：体验的用户任务为自动走查、未获真人签收，且未登录资料查询页 GAP 未闭；部署的 CI `deploy-verify` job 未实跑绿、`package` 在 msys `tar` 未过。两者按「未达证据不加分」停在 74。
- 安全 78 不因「多支部读过滤有 9 组夹具」再上调：读过滤未接线到生产读面、`ALLOW_MULTI_BRANCH` 仍关闭。
- 本批只改文档 / 台账，不改代码、不 bump 版本戳。

### 读数
- daily：**27 文件 / 207 断言 / 60.9s** 全绿。
- guards：**99 文件 / 791 tests / 96.1s** 全绿。
- `audit-tabs --all`：46 页签 **P0 0 / P1 0 / P2 2 / exception 44**；`org.talent` / `disc.attendance` / `party-committee.dispatch` / `gov-content` 均 P0/P1/P2 = 0。
- 安全：`security-hardening` 8/8（G4 / G5 / L-09 / v14 索引 / 分页 / 限频 / 上传门）；`multi-branch-read-filter` 9 组；`personal-password` 21/21；上传门党委 201 / 普通成员 403。
- 部署：`deploy/verify-linux.sh` 本地 Git Bash 5/6；PowerShell `package` 断言过。

### 未完成
- 体验 75：需真人签收用户任务；未登录资料查询页 GAP 未闭。
- 部署 75 / 80：CI job 未实跑绿、`package` 在 msys `tar` 未过；真机安装 / 升级仍未验证（`L-02`）。
- 版本戳 `20261108c` 未 bump（由主代理执行）。


## 批次 537（2026-11-08）· 文档契约化、P0 缺口与测试瘦身

### 为什么
- V-11 后公共门厅已有读口，但党委公开通知无写入路径；通用 `/notices`、`/branchDocs` 可绕过「public 只归党委」。
- 测试膨胀到 255 文件 / 1872 断言，Windows `npm run test:daily` 命令串 8518 字符已不可执行。
- `04_web_design` 的「契约」无合法载体落点，`evolution/` 混放权威与档案。

### 拿不准 / 边界
- 41 页签是批次 525 算术残值，实际为 6 个超 4 块 + 7 条 IA 未闭 + 5 个未评；本批只出台账，不重构。
- 测试瘦身不删文件、不删断言，只改四层（daily / guards / precommit / weekly）与入口；daily 墙钟 114.8s，未达 60s，已登记差距。
- 公开通知只校验有效期；公共门厅 notices 投影无摘要字段。

### 读数
- `npm run test:daily`：43 文件 / 294 断言 / 114.8s 全绿。
- `npm run test:guards`：93 文件 / 297 tests / 101.4s 全绿。
- `audit-tabs --all`：46 页签 P0 0 / P1 0 / P2 2 / exception 44。
- 文档守卫：`doc-consistency` / `docs-governance` / `contract-doc-guard` 54/54 全绿。
- 清理：删除 `.worktrees/agenda-link-voting`、`.trae-html-share-packages/`、`server/.tmp/shots*`、`.screenshots/.tmp` 等约 114MB；`.gitignore` 增 `.worktrees/` 与 `.trae-html-share-packages/`。

### 未完成
- 41 页签的具体 B/C 项由支书决定后另批。
- daily 60s 目标未达；后续可做共享 bootstrap 夹具 / 降测试 bcrypt 轮数。

## 批次 536（2026-11-08）· 党委活动写入与公共门厅

### 为什么

V-11 裁定（`D-858`）后需要党委内容域与公共门厅。「未登录看到党委公开内容」与「登录后看到党委＋支部并集」是同一个读面问题，通知受众与活动可见性必须一起解，不能只改登录页品牌。

### 边界

- 党委活动不承载报名与参与：报名 / 考勤 / 补课仍只属支部活动；支部副本只改执行字段（时间 / 地点 / 组织者 / 考勤），不改内容，与党委原件手动同步。
- 公开内容过期 fail-closed：`publishScope='public'` 且有效期已过，匿名接口返回 404、呈现为「不存在」，不留空列表形状的空态。
- `ALLOW_MULTI_BRANCH` 未打开；多支部同实例仍只到设计稿。
- 党委内容读取只走服务端语义端点与公开门厅，客户端不做本地可见性派生。

### 读数

- daily：**255 文件 / 1872 断言**，按 registry 分 5 片执行全绿。
- `audit-tabs --all`：**46 页签 P0 0 / P1 0 / P2 2 / exception 44**。
- 公共门厅真机 1440 / 390 两档 PASS：公开通知全文、活动摘要、资料下载可用；未登录面无支部名、无横向滚动。
- v13 迁移与 48 表契约绿。

### 不确定项

- Windows 下 `npm run test:daily` 命令行超长（新增测试文件后触发），本轮按 `test-tier-registry.mjs` 分片执行；登记 `B-536-2` 补 registry 驱动的分片 runner。

## 批次 529（2026-11-03）· `.ctx` 知识结构与 Active Context 梳理

### 一、盘点结论：`.ctx` 顶层 7 文件的类型 / 频率 / 权威

| 文件 | 知识类型 | 更新频率 | 权威性 | 处置 |
|---|---|---|---|---|
| `ACTIVE_RULINGS.md` | 规则索引（原为规则库） | 每条新裁定 | 投影（权威＝决策日志） | 重写为 ≤150 行索引；规则正文承接进 content |
| `SNAPSHOT.md` | 当前系统形态 | 每批 | 状态基线 | 删除批次小结，只留 §I–§VI |
| `ENGINEERING_ASSESSMENT.md` | 评分 + 证据 + 方法 | 评分批 | 评分权威 | 保留路径，标 `reference`；当前值投影进 ACTIVE_CONTEXT |
| `REVIEW_QUEUE.md` | 待评议项 + 方法索引 | 评议闭环 | 队列 | 删除已闭环；开放项投影 |
| `TIMESTAMPS.md` | 机器元数据 | 每次改文件 | 机检台账 | 保持 reference |
| `logs/` | 过程 / 裁定 / 审计原文 | 追加 | 权威源（裁定） | provenance，按需读 |
| `evidence/` | 原始证据 | 追加 | 证据 | provenance，按需读 |

### 二、ACTIVE_RULINGS 16 章分类（逐节）

> 分类口径：`已覆盖`＝content 已有同一规则；`需补`＝有复用价值但 content 缺；`仅沿革`＝已被取代 / 一次性 / 死场景。逐条明细见四路探查报告（本批 AI 会话记录）；本节只留落点与需补清单。

| 节 | 条数 | content 落点 | 需补（摘要） | 仅沿革 |
|---|---:|---|---|---|
| 一、角色与分工 | 21 | 02 `SYSTEM_ROLE_PERMISSION` / `COMMISSIONER_DUTY_FRAMEWORK` / SOP 定责 | 工作地图 14 模块与缺省主责；组织型主体；制度起草主语＝支委会；换届/党委；信息平台＝本系统；民主评议缺省主责；考察上传位；专班审查；不留真实人名 | mock 人名例外、7 天已删 |
| 二、写入、赋权与通知 | 9 | 02 SRP §9h/§9i、03 ARCHITECTURE §十一 | 全部已覆盖 | — |
| 三、会议与考勤 | 9 | 02 SOP、03 ARCHITECTURE | 考察由组织者上传、本人工作记录不另立 | — |
| 四、补课 | 6 | 02 SOP、policy-defaults | 全部已覆盖 | — |
| 五、思想汇报与考察 | 15 | 02 SOP、04 DATA_MODEL | 活动参与汇总以人为第一列；出勤率不设阈值（只提示支委会＋本人） | — |
| 六、意见反馈 | 7 | 02 SRP §9j、04 DATA_MODEL | 意见与纪检解绑、支书可指派；反馈时间随事项领域（replyHint）；领域只给归口建议不自动派单 | — |
| 七、品牌 | 2 | 02 SOP、04 DATA_MODEL | 全部已覆盖 | — |
| 八、制度制定 | 4 | 02 SOP、04 DATA_MODEL | 制度报送开关（不勾＝通过即现行版，勾＝待党员大会表决） | — |
| 九、活动、经费与外出 | 11 | 02 SOP、03/04 | 活动物理删除连带清理；活动批准门三态 / 待批可见性 / API 门 / 线上表决 | — |
| 十、归档、统计与通知 | 14 | 02 SOP、SRP §9l | 考勤统计交支委会；上传位按会议类型；考勤浮窗默认报名者；出勤率只支委＋本人；专班巡查随任务产生 | — |
| 十一、术语与平台 | 2 | 03 TERMINOLOGY | 智慧党建平台全称；支部党员大会全称首现 | — |
| 十二、死场景与系统形态 | 38 | 03 ARCHITECTURE、04 DS_03/DS_06、05 FILE_OPERATION_RULES | 禁静默回退 mock（与 DEPLOYMENT_GUIDE 冲突）；独立页 hydrate；JS 渲染路径 `./`；三/四域服务端化「清缓存还在」；跨端变更探测；区块顺序服从组织层级；读写分侧；分域以母本为准；IAAA 四口径 | 四个已清场景；文档合并动作；D-655 重建库；旧 .card 计数 |
| 十三、闭环与确认 | 3 | 02 SOP 纪检指南 | 记录人必呈现于总表与导出 | — |
| 十四、工作流块配置面 | 2 | 04 WORKFLOW_BLOCK_CONTRACT §8 | WBC 权威定位澄清（evolution 例外） | — |
| 十五、工作跟着岗位走 | 1 | 02 SRP §9c | 项目角色不落 `users.role`、写门拒收、多岗取并集 | — |
| 十六、界面规范 | 12 | 04 DS_03 | 活动风采置顶 galleryPinned；操作可见性守卫状态更新 | 8 族旧映射；D-740 特批 |

### 三、本批"需补"总表（按承接文件）

- `content/02_institution/SYSTEM_ROLE_PERMISSION.md`：组织型主体；活动批准门/待批可见性/API 门/线上表决；考勤上传位按会议类型；出勤率只提示；意见—纪检解绑；事项领域不自动派单；记录人必呈现；项目角色不落 `users.role`。
- `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md`：考察由组织者上传/本人记录不另立；专班需求审查；复盘主体与支委会追加。
- `content/04_web_design/data/DATA_MODEL.md`：工作地图 14 模块与缺省主责；民主评议；换届/党委；信息平台；制度报送开关；活动参与汇总人第一列；反馈时间 replyHint；活动物理删除连带；服务化「清缓存还在」；考勤默认报名者。
- `content/04_web_design/design-system/DS_03_COMPONENTS.md`：活动风采置顶；操作可见性守卫状态。
- `content/04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md`：区块顺序服从组织层级；读侧首屏/写侧折叠；分域以母本为准。
- `content/03_doc_system/ARCHITECTURE.md`：独立页 hydrate；JS 渲染路径 `./`。
- `content/03_doc_system/TERMINOLOGY.md`：智慧党建平台全称；支部党员大会全称。
- `content/03_doc_system/OPERATIONS_GUIDE.md`：不留真实人名。
- `content/05_ai_coding/FILE_OPERATION_RULES.md`：JS 渲染路径 `./`（与 ARCHITECTURE 同源）。
- `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md`：改准「不可达静默回退 mock」（与 D-633 冲突）。

### 四、边界与未决

- **未逐条改写 156 条规则正文**：只做「分类 + 承接 + 索引」；规则逐字措辞保持原文，迁入 content 时只做压缩与去重。
- **专班发起/放行**：`D-442` 与组织委员指南「专班不必先经统一表决」冲突，本批不替支书择边；登记为待人工复核（见 REVIEW_QUEUE / ACTIVE_CONTEXT 风险）。
- **WBC 权威定位**：`WORKFLOW_BLOCK_CONTRACT` 自述「唯一权威」，与 `04_web_design/AGENTS.md`「evolution 不承担现行权威」相抵；本批只在 `ARCHITECTURE` 注明 evolution 例外，不改契约正文。
- **不移动** `ENGINEERING_ASSESSMENT.md` / `ACTIVE_RULINGS.md` 路径（分别约 117 / 44 处引用）。

### 五、读数（2026-11-03）

| 文件 | 行数 | 体积 | 预算 |
|---|---:|---:|---|
| `.ctx/ACTIVE_CONTEXT.md` | 88 | 8.7KB | ≤300 行 / 30KB ✅ |
| `.ctx/ACTIVE_RULINGS.md` | 56 | 6.7KB | ≤150 行 ✅ |
| `.ctx/SNAPSHOT.md` | 177 | 28KB | ≤250 行 ✅ |

- 定向守卫：`ctx-hygiene-guard` / `docs-governance-guard` / `doc-consistency` / `doc-line-ref` / `test-tier-guard` **65 / 65 pass**。
- `ACTIVE_CONTEXT` 保鲜：`latest_decision=D-852` ≡ 当月决策日志末条 `D-852`。
- 新会话模拟：只读 `CLAUDE.md` + `ACTIVE_CONTEXT`，可回答「26 页 / 7 工作台 / 47 表；六维 79/66/68/83/76/73；最高风险＝多支部读隔离；下一批 3 件＝Linux 部署验证 / 多支部 Phase 1 / issue-unread；最新 D-852；冲突以当月决策日志为准」。
- 全量 daily：**1765 / 1765**（341s），0 fail。

## 批次 530（2026-11-03）· CLAUDE 宪法化与乙部清账

### 一、读数

| 指标 | 之前 | 之后 |
|---|---:|---:|
| CLAUDE 行数 / 体积 | 947 行 / 106KB | **197 行 / 17.5KB** |
| 引用框总数 | 126（甲部 91） | **10（甲部 7）** |
| 乙部表行 | 22 真 + 6 假 + 2 已完成 | **11 行（含表头；数据行 5）** |
| 丙部 | 已裁 / 冻结件混放 | **4 条真待裁** |

### 二、规则承接映射（删引用框 / 降指针的落点）

| 原位置 | 内容 | 新落点 |
|---|---|---|
| H10 引用框 | 最小三成本 / 表达四禁 / 扩充五条 / 逻辑排序 / 主客回环 | H10 正文祈使句 |
| H20 / H20.4 | 三步审查 / 执行 / 收尾 / 指示分级 | H20 / H20.4 正文 |
| H21.1 / H21.2 | 2026-10-19 判例 / 四轮路线图 | `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md §8/§9`；CLAUDE 只留锚点关键词 |
| H26.1–4 | 日志精简 / 台账分工 / `.ctx` 准入 / active 预算 | H26.1–4 正文（压缩）；细则在 `CONTEXT_MANAGEMENT` / `DOCUMENT_GOVERNANCE` |
| H30 / H50 | 一改具改 / 乙丙部生命周期 | H30 / H50 正文；细则在 `DOCUMENT_GOVERNANCE` / `CONTEXT_MANAGEMENT` |
| H60.2 / H60.4 / H60.5 / H60.6 | 提示词模板 / 输出 schema / 检查要点生命周期 / 触发式入库 | `REVIEW_AND_EXPRESSION.md` / `PARALLEL_SKILL_AUDIT.md`；CLAUDE 保留标题与指针 |
| H90 / H100 | 外部权威源 / 项目产出声明 | H90 指针表 / H100 一屏声明 |
| 批次 524 七条 | 语义标签 / 功能色 / 只读派生 / 输入单一源 / 待办跳转 / 密度 / 审计 | `CLAUDE.md H40.3` + `DS_06` + `AUDIT_CANON` |
| V-10b | 支书本人上传自我描述 | 从乙部删除（AI 无动作） |
| About 冻结件 B-520-1 / B-521-3 / B-522-3 | 冻结件不纳入待办 | 删除（`about-freeze-guard` 禁改） |

### 三、乙部处置

- **保留并排期**：C-3 / C-4（在办）；批次 530（B-500-6 / B-520-2…5 / B-518-1…3 / B-515-3 / B-515-5）；批次 531（B-500-1 / B-515-6 / B-516-1）；批次 532（B-500-7 / B-522-2）。
- **删除**：批次 524 七条（已落 H40.3/DS_06）、B-518-4（并入 B-522-2）、V-10b（支书本人操作）、B-520-1 / B-521-3 / B-522-3（About 冻结件）。
- **迁丙部**：B-502-5、B-519-3、B-521-1、B-522-1。

### 四、守卫与回归

- `claude-parallel-audit` / `ia-critical-guard` / `ui-preflight-context` / `doc-consistency` / `docs-governance` / `doc-line-ref` / `ctx-hygiene` / `test-tier` 定向 **83 / 83 pass**。
- `ctx-hygiene` 新增 ⑧（CLAUDE ≤600 行 / 85KB；甲部引用框 ≤15 且不写历史）与 ⑨（乙部 ≤12 行且状态合法；丙部 ≤4 条且无已裁）。
- 未新增 guard 文件；H21 / H21.3 / H40.2 / H20.2 / H20.3 / 评议待办节头 / 批次 521「五编」锚点全部保留。
- 全量 daily：**1767 / 1767**（301s），0 fail；`bump-version --check` 零陈旧。

## 批次 531（2026-11-03）· CLAUDE 分层修复与乙/丙部推进

### 一、甲部修复

- **编号重排**：H10 → H20（H20.1–H20.4）→ H21 → H25 → H26 → H27 → H30 → H31 → H32 → H40（H40.1→H40.2→H40.3）→ H50 → H60 → H70 → H80 → H90 → H100。
- **next_prompt 恢复**：H20.3 六要素（未完成项 / 恢复上下文 / 执行顺序 / Skill 提醒 / 专项台账快照 / commit hash）；未输出视为未完成。
- **commit 主日志**：H26.1 明确 git commit message 是第一主记录；EXECUTION_LOG 只写为什么 / 边界 / 读数 / commit hash。
- **H40.2 去拟合**：热层只留 3 行触发；37 条 UI 检查迁温层 `content/05_ai_coding/UI_REVIEW_CHECKLIST.md`（8 组，全部引用 DS 节 / SD 编号）。

### 二、乙部批次 530 推进

- **已核实完成并从 530 行移出**：B-500-6（`branches` / `appointmentRecords` 已是 `party-staff` 写门）、B-520-2（`.btn-md` 五个调用点已改类名驱动）、B-518-3（全站仅 About 冻结件保留 `scrollIntoView smooth`）。
- **仍在办（分片）**：B-520-3 / B-520-5 / B-518-1 / B-518-2 / B-515-3 / B-515-5。
- **本批未新增代码**：其余六项需跨多文件收口，保留在乙部批次 530，按 `DS_03` / `GUARD_INVENTORY` / `DOC_MAP §七` 分片推进。

### 三、丙部裁定（D-854）

- **B-502-5**：旧 token 失效；账号改名同事务删除 `sessions`，旧书签 404 并提示重登；代码 `server/routes/member.js`，测试 `account-rename` 4/4。
- **B-519-3**：`--status-success-text` 已存在，关闭。
- **B-521-1**：SD 判据表维持 `CASES` 迁移登记，不回迁。
- **B-522-1**：先收拢「今天 / 归档」卡片，排入批次 532。

### 四、读数

- 定向守卫 **88 / 88**（含 `account-rename`）。
- 全量 daily：**1768 / 1768**（368s），0 fail。
- `CLAUDE.md`：约 205 行 / 19KB；引用框 10；乙部 5 行数据、丙部 0 行待裁。

## 批次 530 收尾（2026-11-03）· 低风险项清账

### 为什么

乙部 530 分片推进的六个条目已由两支代理落地，但主代理尚未复跑与关账；本批只做核实、文档归口与提交，不改行为。

### 完成了什么

- `B-518-1` 状态胶囊两族：删除 `.state-badge*` 12 条 CSS，新增 `.badge--accent`；8 个调用点改走 `badges.js::badgeHtml`；`ui-color-semantics::C2` 改判「不得再定义 `.state-badge`」；`DS_03 §4.14` 落两族口径。
- `B-518-2` 加载态：`empty-state.js` 新增 `skeletonHtml` / `renderSkeleton`；三处手写骨架统一；四台加载态补 `aria-busy`。
- `B-520-3` 常量层：`DASHBOARD_LIMITS` 扩 5 项与 `SEMESTER_REMIND_*`；日历 / 队列 / 设置范围改引用，旧字面量零残留。
- `B-520-5` 旧色名：`THEME_PRESETS` 名称由 `ACCENT_PALETTE` 派生；id 不变。
- `B-515-3` content 重复表达：4 文件 / 6 处改指针，权威正文未动。

### 边界

- `B-515-5` 只迁 18 / 50 处，保留乙部并转入批次 533。
- 不新增守卫文件；只迁移既有断言口径。

### 读数

- 全量 daily：**1768 / 1768**（333s），0 fail。
- commit：见 `git log --grep="批次 530"`。

## 批次 533（2026-11-04）· 乙部余项合并批

### 为什么

乙部 531 / 532 两组（R5 旧账、四条真缺陷、9 条 e2e、待办派生、今天/归档、help 色、text-xs）必须一次收口，否则上线前仍挂着「存量红」；支书 grill-me 四问已定范围与收口口径（`D-855`）。

### 拿不准 / 取舍

- **B-515-5 目标档**：仓库无成文「正文段上迁」判据，`DS_02 §3.2.2` 现行口径把说明段定为 12px。处理：在 `DS_02 §3.2.2` 补「正文段 / 说明句」边界，只迁正文段，标签 / meta / 计数保持 12px；不新造档。
- **B-515-6 缺陷 1/2**：探针复现不到（活动创建已走资源 API、冻结判据已含 `deputy-leader`）⇒ 按「无法复现」登记，未为改而改；缺陷 3/4 在真机前置层修复。
- **B-500-7 最小 Plan B**：服务端只算 3 类确定性实时组，其余 7 类标 `unsupported` 并由客户端降级；不删客户端派生。
- **R5A-31 剩余 6 处 `text-gray-400`**：判定为装饰图标 / 深色映射，不改；只改承载信息的 3 处。

### 边界

- 新增 `GET /api/v1/todo-groups`（只读）＋ `server/test/todo-groups-api.test.mjs`；写口与权限矩阵未动。
- 新增棘轮：`TEXT_XS_BASELINE = 1771 / 116`；`docs/help.html` 从 `allowNew` 改 `false`（167 处 / 26 值）；`hex-hardcode-guard::H7` 校验 theme-color 单一源。
- 未改 `?v=` 以外的构建参数；`bump-version` 统一刷到 `20261103a`。

### 读数

- 方向守卫：hex / type-scale / test-tier / doc-consistency / docs-governance / mock-api-parity / todo-groups / about-freeze / workforce **117 / 117 pass**。
- 9 条 precommit e2e：全部通过（a11y-tree / block-config / agenda-closure / b3-1 / module-config / multi-tab-sync 两判据 / form-loop 两流程）。
- 全量 daily：**1775 / 1775**（325s），0 fail。
- commit：见 `git log --grep="批次 533"`。

## 批次 534（2026-11-04）· 界面信号统一、颜色权威与完整 Plan B 一期

### 为什么

支书四路审查后裁定：① 待办 hover / 选中左条「很丑」，全局清理；② 颜色要一个权威、一改具改；③ 完整 Plan B 不等上线，先把测试做好；④ 输入族悬浮 / 焦点保持现状，2px 不加宽、不收窄，双层环不得回潮。

### 拿不准 / 取舍

- **左条**：删除状态型 / 装饰型左条（含 `.list-row`、工作地图、身份横幅、品牌卡、引述块、toast、gallery、calendar、review-tab、today 提醒卡）；身份 / 品牌改圆点 / 徽章，引述改全框。与 SD-25 / DS_04 §5.2 / 三条守卫同批改判据。
- **焦点**：不新增双层环；沿用 SD-27 单环 2px；输入族 `.input-flat` / `select` / 搜索框「只变边框」原样保留。选中与焦点改为不同通道（soft 底 / 字重 vs 单环）。
- **颜色**：`styles.css` 唯一权威；`constants.js` / `tailwind-config.js` 做镜像（T12/T13 逐值相等）；`about.css` 只改 `allowNew:false`、内容不动；渲染层彩色 `rgba()` 清零。
- **6.2 / 6.3 原阻断**：`--badge-*-bg` / `--color-text-primary` 暗色会翻转，直接换令牌会造成「深底 + 深字」⇒ 改用专用 `--btn-action-*` / `--toast-*` 令牌（暗色不覆写），亮暗均保持浅底深字，零观感变化。
- **URL 页签回归**：批次 533 的 `?tab=` 同步被 workspace-shell 当成外部导航目标反复消费，导致 `setState` 后当前 tab 不重渲染（agenda-closure e2e 抓出）。修法：`history.state.tabSync` 区分「页签自身写入」与「外部深链」；已复跑 e2e 全绿。

### 边界

- 7 类实时组全部服务端化；客户端默认切服务端，仅保留「分档 / 排序 / 格式化 / 筛选 / 折叠」与失败兜底；兜底只用同一份已拉取数据，不生成新业务事实。
- 顶栏「写入活动」实底 CTA 按 V-3 保持；今天页留白 / 12–13px 正文 / 卡片无阴影等口味项未动。
- About 三件套内容未改；help 只改徽标类与结构，颜色值未变。
- `taskforce-authorize` 在 br-b1 种子无持久化行，标准答案为 null；已用注入探针验证非空路径，未保留 `unsupported`。

### 读数

- 全量 daily：**1788 / 1788**（约 430s），0 fail。
- 9 条 precommit e2e：**20 / 20** 全绿（含 agenda-closure 回归复跑）。
- Plan B 对账：7 类 **8/8 按角色全绿**；双支部夹具双向零泄漏。
- 硬编码：**808 处 / 291 值 / 45 文件**（基线 812 / 291 / 45；styles.css 388、constants.js 195、about.css 50、help.html 48）。
- 颜色镜像：T12（tailwind↔styles 44 对）/ T13（constants↔styles 44 对）全绿，含反例。
- commit：见 `git log --grep="批次 534"`。

---

## 批次 535 · CLAUDE 三层恢复、通知受众 fail-closed、SD-60 行动行（2026-11-07）

### 为什么

支书 `/plan` 三项：① 温层 0 行不合理，要从根本防止 CLAUDE 膨胀；② 对既有判例做全局复查（空间 / 字号 / 脏乱），并专门检查「按钮被机械分行」；③ 未登录为何能看到「谁给我赋权」，要求 content 规定 ↔ 代码 gap 彻查。

### 拿不准 / 取舍

- **CLAUDE 层界**：热层收到 H10–H50，温层 H60–H80 + 触发表，冷层 H90/H100；乙部历史叙述整段删除。守卫按「层边界 + 温层 3–60 行 + 乙部 ≤18 行 + 触发表指针存在」机检，不只挡总量。
- **通知受众**：本批取最严档——未登录一律不可读；系统通知无受众＝不可读；广播必须显式 `all`。显式广播是否允许匿名不自行放开，登记 V-11 待裁。
- **按钮换行**：先证伪——按钮族已有 `white-space:nowrap`，问题在 `.card-head` 三处 `flex-wrap:wrap` + 标题不伸缩。改为「标题让位、aside 不拆组、≥641 不换行」，不搞全站 nowrap；`.lf-bar` 仍守 SD-58 两行上限。
- **p-5 / body 15px / btn-action 12px**：逐条回查 DS_02 / DS_03 后判**不是违规**，从计划中的「修」改为「不改」，避免过拟合。
- **TAB_BLOCK_BASELINE**：全表含页头是历史口径；本批只把口径写清（`blocks-1 ≤4`），不批量改 45 条数，避免与 inventory 脱节。

### 边界

- 未登录公共入口只研究、不改登录页品牌与路由；CASE-AI-004/005 编号已被占用，实际落 `CASE-AI-007/008`。
- `.lf-bar`、`round3-4-batch1` 锁定的可折行行动区不纳入新守卫。
- 存量通知迁移脚本默认 dry-run，补不出受众标 `legacyUnscoped`，不删除数据。
- 全量 daily 的 npm 命令在 Windows 超出命令行长度（新增 2 个测试文件后触发）；已用分片方式验证，命令本身未改。

### 读数

- 定向守卫：`ctx-hygiene` / `claude-parallel-audit` / `ui-preflight-context` 22/22；`notice-audience*` / `system-notice-project-auth` / `test-tier` 61/61；`action-row-wrap` / `test-tier` 12/12；`type-scale` / `text-tier` 21/21；`ui-control-system` 32/32。
- 文档守卫：`doc-consistency` / `docs-governance` / `version-stamp` / `ctx-hygiene` 见各次定向结果；S13/S14/F2/R1–R3 的日期与计数同批刷新。
- 版本戳：`20261107a`，0 处陈旧（JS 268 / HTML 26 / CSS 2 / server-test 155）。
- 测试预算：daily 文件 243 → 245；断言 1785 → 1792。
- commit：`321be71c3`（535 主记录）；本行补记随 `535a` 提交。
