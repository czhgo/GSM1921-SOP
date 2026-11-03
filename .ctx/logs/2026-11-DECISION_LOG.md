---
title: "2026年11月决策日志"
type: decision_log
role: "[工程师]+[AI]"
last_updated: 2026-11-02
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-11-DECISION_LOG.md, .ctx/logs/2026-10-DECISION_LOG.md, content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md, content/04_web_design/design-system/DS_03_COMPONENTS.md, content/04_web_design/design-system/DS_04_INTERACTION_AND_RESPONSIVE.md]
---

# 2026年11月决策日志

> 本文件记录 2026 年 11 月所有非显而易见的决策。每条决策包含背景/选项/决定/理由/影响范围/一改具改检查。
> **来源（2026-11-01 批次 524 换月）**：自 2026-10 文件续编，`D-827` 起记于本文件；每条只写「评议 → 裁定 → 落点文件」一句，过程见 `.ctx/logs/2026-10-EXECUTION_LOG.md` 与 `git`。

> **条目编号起止**：本文件当前 **`D-827` … `D-846`，共 20 条**；下一条自 **`D-847`**。

## 本月目录（2026-11）

> **说明**：本表**只索引、不重复内容**（`主题` / `条目` / `日期` / `状态`）。条目正文见下方各 `## D-xxx` 节。

| 主题 | 条目 | 日期 | 状态 |
|---|---|---|---|
| 数据表表头去灰：两条 `th` 规则统一白底 ＋ 1px 下边框 | `D-827` | 2026-11-01 | 已落（批次 524） |
| 可点行状态：灰底不作 hover，改主题 10% 淡底 ＋ `::before` 左条 | `D-828` | 2026-11-01 | 已落（批次 524） |
| 嵌入视图去嵌套卡：`embedded` 形态不再渲染自身 `card` 与卡头 | `D-829` | 2026-11-01 | 已落（批次 524） |
| 语义标签：`section` 必有可访问名称且不得嵌套 | `D-830` | 2026-11-01 | 已落（批次 524） |
| 只读文案由 `view-capability.js` 派生，未登记 kind 恒只读 | `D-831` | 2026-11-01 | 已落（批次 524） |
| 功能色分工：指标 / 状态用功能色，动作 / 导航 / 选中态用主题色 | `D-832` | 2026-11-01 | 已落（批次 524） |
| 输入控件单一源：只经 `forms.js`，裸输入存量只减不增 | `D-833` | 2026-11-01 | 已落（批次 524） |
| 搜索框收窄：`.lf-kw` 独占一行 ≤320px，≤640px 满宽 | `D-834` | 2026-11-01 | 已落（批次 524） |
| 关键词自动补全只用原生 `<datalist>`，不引第三方库 | `D-835` | 2026-11-01 | 已落（批次 524） |
| 待办跳转单一源：`todo-actions.js` ＋ `workspace-nav.js` | `D-836` | 2026-11-01 | 已落（批次 524） |
| 页签覆盖口径：旧 67 台账退役，改用 45 catalog（W1–W5） | `D-837` | 2026-11-02 | 已落（批次 526） |
| F1 口径：以 `TAB_BLOCK_BASELINE` 登记为准，DOM measured 只复核 | `D-838` | 2026-11-02 | 已落（批次 526） |
| 破坏性 CRUD 不在共享库真删，只做软回滚 / 静态门 | `D-839` | 2026-11-02 | 已落（批次 526） |
| `requireAuth` 通用写口按已知系统性风险记 exception | `D-840` | 2026-11-02 | 已落（批次 526） |
| 六维重评：测试与发布质量 78→80，其余维持 | `D-841` | 2026-11-02 | 已落（批次 526） |
| 审计简并：audit 只做报告层；四口径唯一表（F2 行数 / F4 H2 恰 1 / F7 hasPager / C1 requireAuth 例外） | `D-842` | 2026-11-02 | 已落（批次 527） |
| M1–M3 落地；4 个双列表页签登记「独立对象池」例外 | `D-843` | 2026-11-02 | 已落（批次 527） |
| 数据契约：47 表单一源 + fixtures；parity 值对照 26 表、结构 41 表 | `D-844` | 2026-11-02 | 已落（批次 527） |
| 换轨：export/import/preflight + 迁移前备份 + 拒绝降级；副本演练 48 表 542 行一致 | `D-845` | 2026-11-02 | 已落（批次 527） |
| 六维重评：运行部署 62→68（换轨闭环证据），其余维持 | `D-846` | 2026-11-02 | 已落（批次 527） |

## D-827 2026-11-01 — 数据表表头去灰

> **评议 → 裁定 → 落点**：支书批「同一页 `<thead>` 表头显灰、`tbody` 的 `<th scope="row">` 显白，莫名的灰显脏」→ `.data-table th` 与 `.data-table thead th` 均不再声明 `background`，统一白底透出 ＋ 1px 下边框，两条规则本体保留 → `content/04_web_design/design-system/DS_03_COMPONENTS.md §4.3`（表格样式单一源）；守卫 `ui-control-system-guard::V9`。

## D-828 2026-11-01 — 可点行状态柔和化

> **评议 → 裁定 → 落点**：可点行用 `--surface-hover`（neutral-200）灰底，灰显得脏且与静态行难分 → 行取 `--radius-sm`（8px）；hover 底改 `--app-accent-tint`（主题 10%），灰底只承担静态分隔；3px 主题左条改 `::before` ＋ `opacity` 过渡（`--transition-fast`）；`:active` 用 `--app-accent-active-bg`；焦点环 `outline-offset:-2px` 压在行内随圆角走；删除死类 `list-row--selected` → `DS_04 §5.2` ＋ `DS_03 §12.15 SD-43`；守卫 `hover-state-guard::H11`（`H2` 放行装饰伪元素 opacity）。

## D-829 2026-11-01 — 嵌入视图不再套卡

> **评议 → 裁定 → 落点**：知情查看里出现「卡套卡」与双卡头 → `workgroup-view.js` / `taskforce-view.js` 新增 `embedded` 形态，嵌入时不渲染自身 `div.card` 与卡头；`insight-view.js` 对其他党小组区去掉 `card` 外层并向两者传 `embedded: true`；真机 `#secretary-insight-card .card = 0`、卡头只剩 1 个 → `docs/src/components/record/{workgroup-view,taskforce-view,insight-view}.js`；守卫 `card-summary-hero-guard::G4`。

## D-830 2026-11-01 — `section` 语义两条硬判据

> **评议 → 裁定 → 落点**：全站 `section` 既有无名也有嵌套，读屏 `region` 与视觉分区不一致 → `section` 必须有可访问名称（`aria-label` 或指向存在 id 的 `aria-labelledby`）、同页不得嵌套；`div` 管布局、`article` 管独立记录、`aside` 管次要信息；本轮只收两条硬判据、不重排既有 59 处分区 → `DS_03 §12.15 SD-55`；守卫 `a11y-tree::A10`。

## D-831 2026-11-01 — 只读由权限派生

> **评议 → 裁定 → 落点**：4 处卡头写死「· 只读」，换角色不跟随 → 新增 `core/domain/view-capability.js`（`RESOURCE_WRITE_ROLES` / `canWriteResource` / `readonlyMeta`），4 处文案改为派生；未登记的 kind（如知情查看）恒只读；角色键只取 `constants.js::ROLE_KEYS` → `docs/src/core/domain/view-capability.js` ＋ 四个 record 组件；守卫 `frontend-foundations-guard::F12`。

## D-832 2026-11-01 — 指标 / 状态与动作 / 导航分色

> **评议 → 裁定 → 落点**：全局概览几乎全是主题色，功能色没起注意力引导作用 → 指标与状态（待答复 / 待赋权 / 待归档 / 待补课 / 待汇报 / 组员汇报 / 逾期）改用功能色文字档，纯计数用 `--neutral-800`；动作 / 导航 / 选中态仍用主题色 → `DS_01 §2.10`（`work-overview.js::METRIC_TONE` ＋ `overview-dispatch-bar.js` 待答复条）；守卫 `ui-color-semantics::C6–C8`。

## D-833 2026-11-01 — 输入控件单一源

> **评议 → 裁定 → 落点**：裸 `<input class="input-flat">` 散落各页、绕开组件 → `form-field.js` 新增布局中立 `textInput` / `selectInput` 并经 `forms.js` 对外；新代码不得直接写裸控件，存量按 `style-baseline.mjs::RAW_INPUT_BASELINE` 逐文件只减不增（首批迁 5 文件，全站 251→192 处 / 58→57 文件）→ `DS_03 §12.15 SD-56`；守卫 `field-shell-guard::R1–R3`。

## D-834 2026-11-01 — 搜索框收窄

> **评议 → 裁定 → 落点**：独占一行的搜索框被 `flex: 1 1 160px` 拉满整卡 → `.lf-kw` 改 `flex: 0 1 var(--lf-kw-max, 320px)`（≤320px，可逐处覆盖），≤640px 满宽 → `docs/src/styles.css` 的 `.lf-kw` 段；守卫 `field-shell-guard::R1–R3`（输入单一源同批）。

## D-835 2026-11-01 — 关键词自动补全用原生 `datalist`

> **评议 → 裁定 → 落点**：筛选关键词没有补全、反复手输 → `list-filter.js` 支持 `keyword.suggestions`（数组或 `(rows) => string[]`），生成原生 `<datalist>`（去重、截断 50 条），工作组 / 专班已接入；不引第三方库 → `docs/src/components/ui/list-filter.js`；判据并入 `DS_03 §12.15 SD-56`。

## D-836 2026-11-01 — 待办跳转只经动作表与统一导航

> **评议 → 裁定 → 落点**：6 个 `todo-tab.js` 各自维护 tabMap、直点 DOM 页签按钮或写死 `workspace/*.html?tab=` → 新增 `core/domain/todo-actions.js`（`TODO_ACTIONS` ＋ `resolveTodoAction`，actionKey 优先、actionType 兜底、roleOverrides / scopeOverrides）与 `core/session/workspace-nav.js::goToWorkspaceTab`（只认 `data-ws-tab-btn`，可写 `PendingTarget`）；按钮文案由动作表派生 → `docs/src/core/domain/todo-actions.js` ＋ `docs/src/core/session/workspace-nav.js`；守卫 `tab-nav::G1–G4`。

## D-837 2026-11-02 — 页签覆盖口径改用 45 catalog

> **评议 → 裁定 → 落点**：`workbench-audit-coverage` 仍钉 2026-10 的 67 页签旧台账，而现行注册表是 45 页签 → 支书裁定「直接改用新口径」：旧 67 台账只作归档存在（W5），现行覆盖改由 `catalog.mjs`（45 键 ≡ capabilities ≡ `TAB_BLOCK_BASELINE`）＋ `endpoint-map.mjs` 承担（W1–W4）→ `server/test/workbench-audit-coverage.test.mjs`；审计资产 `server/scripts/audit-tabs.mjs` ＋ `audit/*`。

## D-838 2026-11-02 — F1 以基线登记为准

> **评议 → 裁定 → 落点**：F1 若直接用 DOM measured 判红，会因条件块显隐与同构列表变化误报 → F1 只认 `TAB_BLOCK_BASELINE` 的非空 `reason`：>4 且已登记记 `exception`，`reason` 为空才判 P1；DOM measured 仅作复核线索，不参与红绿 → `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md` §2.3 / §5、`DS_06 §五`。

## D-839 2026-11-02 — 破坏性 CRUD 不在共享库真删

> **评议 → 裁定 → 落点**：解散 / 归档 / 删除活动若在演示库真删会污染数据 → C2 默认在 `:memory:` 临时库做 create → 回读 → PATCH → 校验 → DELETE；破坏性流程只做软回滚或静态写门证明，报告记 `exception` ＋ `reason`；`--base` 连共享服务时 C2 自动 `skip`（原因 `shared-db`）→ `server/scripts/audit/checks-crud.mjs`、`endpoint-map.mjs`、`TAB_AUDIT_PLAYBOOK.md` §2.3 / §八。

## D-840 2026-11-02 — `requireAuth` 系统性风险记 exception

> **评议 → 裁定 → 落点**：C1 探针在 `disc.attendance` / `leader.attendance` / `org.taskforce` 三处命中 `PATCH /api/v1/signups/:id` 仅 `requireAuth`，visitor 可写 → 这是跨页签的系统性风险，按页签重复计 P0 只会放大噪声；统一记 `exception` 并回链 `ENGINEERING_ASSESSMENT` 阻断风险 2，修复仍按服务端写权限专项排 → `server/scripts/audit/severity.mjs`、`TAB_AUDIT_PLAYBOOK.md` §2.3、`GUARD_INVENTORY §十五`。

## D-841 2026-11-02 — 六维重评（批次 526）

> **评议 → 裁定 → 落点**：支书 2026-11-02 裁定本轮重打六维，证据为本轮 45 页签审计 + 既有测试 / 权限 / 部署证据；**不因「做了工具」自动加分**。
> - **测试与发布质量 78 → 80（+2）**：catalog 守卫（45 键 ≡ capabilities ≡ baseline）＋ 内存库 CRUD 往返 ＋ 最终 P0/P1=0 补上了「页签 → 读 / 写口 → 权限门」的常驻覆盖空白；审计脚本不进 `test:daily`，故只加 2 分。
> - **业务与数据正确性 78 → 78**：D1/D2 对账（roster 50）与 C2 往返证明现有主流程正确，未发现新的业务缺陷；不加分。
> - **安全与权限 52 → 52**：C1 只再次证实 3 个 `requireAuth` 例外，未放宽任何门、未补写权限；不加分。
> - **最小三成本体验（含前端与交互） 68 → 68**：F1–F8 全绿与局部 aria / section / 死入口修复不足以证明三成本实质下降；41 页签未重构；不加分。
> - **架构与可维护性 74 → 74**：审计分层与单一源是正面证据，但与 `page-sweep` / `module-load` / `a11y-tree` 部分重叠，未降低跨层变更成本；不加分。
> - **运行、部署与跨组织复用 62 → 62**：本轮无部署 / 多支部新证据（**证据不足**），维持原分。
> - 阻断风险逐条复核：5 条全部保留，无闭环、无新增（证据见 `.ctx/ENGINEERING_ASSESSMENT.md` §一）。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 / §5.2。

## D-842 2026-11-02 — 审计简并：audit 只做报告层

> **评议 → 裁定 → 落点**：`page-sweep` / `module-load` / `a11y-tree` / `audit-tabs` 四处都能判「分页 / H2 / 权限」，改一处口径要改四个脚本 → 支书裁定「audit 只做报告层、不替代 daily 门禁」，把四类漂移口径收进唯一表：F2 只判控件行数 ≤2、F4 只认 H2 恰 1、F7 统一 `hasPager()`、C1 `requireAuth` 写口记 exception；daily 的既有断言保留、不删 → `content/05_ai_coding/AUDIT_CANON.md` ＋ `server/scripts/audit/{checks-front,dom-probe,checks-data}.mjs`。

## D-843 2026-11-02 — M1–M3 与「独立对象池」例外

> **评议 → 裁定 → 落点**：信息经济只有 F1–F8 的版面判据，重复卡头与多条筛选条无人管 → 新增 M1（顶层块 >4 须有 `TAB_BLOCK_BASELINE` 理由）、M2（同页 H3 文本重复 ≥2）、M3（同页 `.lf-bar` >1）；4 个双列表页签（`org.talent` / `disc.review` / `disc.inspection` / `leader.members`）两个列表各自独立、不可合并，登记为「独立对象池」例外而不删规则 → `server/scripts/audit/checks-economy.mjs` ＋ `economy-exceptions.mjs`。

## D-844 2026-11-02 — 数据契约 47 表单一源

> **评议 → 裁定 → 落点**：换轨前无法机器判定「库结构 ≡ 功能实际」，mock 与 API 两种形态的字段漂移只能靠人记 → 建 `server/data/domain-contract.mjs`（47 表：34 资源 + 7 语义 + 6 工作组；`required` / `enums` / `seedCount` / `aliases` / `deprecated`）＋ fixtures ＋ `data-contract.test.mjs`；人为读版落 `content/04_web_design/data/DATA_CONTRACT.md`；parity 口径为值对照 26 表、结构 41 表。保留 JSON 宽表、不做列规范化 → `server/data/domain-contract.mjs`、`server/test/data-contract.test.mjs`、`content/04_web_design/data/DATA_CONTRACT.md`。

## D-845 2026-11-02 — 换轨管线与拒绝降级

> **评议 → 裁定 → 落点**：部署在即，数据换轨没有可演练、可回滚的单一入口 → `export-all`（48 表 ＋ `manifest.json`：schemaVersion / 行数 / sha256）、`import-all`（默认 dry-run、`--apply` 单事务、版本与 id 冲突校验、契约 required / enums）、`preflight-cutover`（版本 / 空库 / 基线账号 / 演示残留 / 孤儿外键 / 附件一致性）；`db.js` 迁移前自动备份、`user_version > SCHEMA_VERSION` 拒绝启动；副本演练 48 表 / 542 行逐表行数与 sha256 一致，preflight exit 0 → `server/scripts/{export-all,import-all,preflight-cutover}.mjs`、`server/db.js`、`deploy/CUTOVER_RUNBOOK.md`。

## D-846 2026-11-02 — 六维重评（批次 527）

> **评议 → 裁定 → 落点**：支书 2026-11-02 裁定按本批证据重打六维，证据为审计简并、数据契约与换轨演练；**不因「写了脚本」自动加分**。
> - **运行、部署与跨组织复用 62 → 68（+6）**：换轨从「有文档」变成「可演练、可回滚、可拒绝降级」——48 表 / 542 行 export → dry-run → apply 一致，preflight exit 0，迁移前备份与降级拒绝均实测；单实例多支部硬边界不变，故只加 6 分。
> - **最小三成本体验 68 → 68**：P2 4→3、exception 47，M1–M3 补了信息经济判据，但 41 页签仍未重构、无用户实测；不加分。
> - **测试与发布质量 80 → 80**：`data-contract` 6 条进 daily、audit 仍不进 daily；覆盖形态有增、发布时长未降；不加分。
> - **业务与数据正确性 78 → 78**、**安全与权限 52 → 52**、**架构与可维护性 74 → 74**：契约与分层是正面证据，但 JSON 宽表、通用写口、跨层同批维护三项残项未变；不加分。
> - 阻断风险逐条复核：5 条全部保留，无闭环、无新增（离轨相关的新增边界记入 §一 残项，不升级为阻断项）。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 / §5.2。

> **本文件续编说明**：本文件按批追加、不改写既有条目；当前止于 `D-846`**（共 **20** 条）。
