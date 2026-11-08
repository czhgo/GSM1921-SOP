---
title: "2026年11月决策日志"
type: decision_log
role: "[工程师]+[AI]"
last_updated: 2026-11-08
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-11-DECISION_LOG.md, .ctx/logs/2026-10-DECISION_LOG.md, content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md, content/04_web_design/design-system/DS_03_COMPONENTS.md, content/04_web_design/design-system/DS_04_INTERACTION_AND_RESPONSIVE.md]
---

# 2026年11月决策日志

> 本文件记录 2026 年 11 月所有非显而易见的决策。每条决策包含背景/选项/决定/理由/影响范围/一改具改检查。
> **来源（2026-11-01 批次 524 换月）**：自 2026-10 文件续编，`D-827` 起记于本文件；每条只写「评议 → 裁定 → 落点文件」一句，过程见 `.ctx/logs/2026-10-EXECUTION_LOG.md` 与 `git`。

> **条目编号起止**：本文件当前 **`D-827` … `D-860`，共 34 条**；下一条自 **`D-861`**。

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
| 写权限单一源：权限矩阵 141 行，C1 改矩阵判定 + 高风险抽样 | `D-847` | 2026-11-03 | 已落（上线专项） |
| 会话 3 小时过期；review / production 两档固化，review 独立库 | `D-848` | 2026-11-03 | 已落（上线专项） |
| 多支部同实例设计：Phase 1–2 完成前不得打开 ALLOW_MULTI_BRANCH | `D-849` | 2026-11-03 | 设计已出（未实现） |
| 上线残项单一台账 L-01…L-21；launch-blocker 6 条已关 / 1 条降级 | `D-850` | 2026-11-03 | 已落（上线专项） |
| 六维重评：安全 52→66 · 测试 80→83 · 架构 74→76 · 部署 68→73 · 数据 78→79；三成本维持 68 | `D-851` | 2026-11-03 | 已落（上线专项） |
| `.ctx` 三层：active 投影 + reference + provenance；规则进 content，ACTIVE_RULINGS 只留索引 | `D-852` | 2026-11-03 | 已落（批次 529） |
| CLAUDE 宪法化：规则写正文、历史进 logs、细则进 content；乙部只留 ≤12 行真任务 | `D-853` | 2026-11-03 | 已落（批次 530） |
| 丙部四项：旧 token 失效 / 成功色档已存在 / SD 留 CASES / 低密度卡先收拢 | `D-854` | 2026-11-03 | 已落（批次 531） |
| 乙部余项合并批：最小 Plan B + 全量对账 + 9 条 e2e + 长期棘轮 | `D-855` | 2026-11-04 | 已落（批次 533） |
| 界面信号统一：删左条 / 焦点单环不回潮 / 颜色单一权威 / 7 类待办服务端化 | `D-856` | 2026-11-04 | 已落（批次 534） |
| CLAUDE 三层恢复 / 通知受众 fail-closed / SD-60 行动行 | `D-857` | 2026-11-07 | 已落（批次 535） |
| V-11 裁定：党委内容域 + 公共门厅 + 支部幂等采用 | `D-858` | 2026-11-08 | 已落（批次 536） |
| 测试瘦身：结果优先、守卫按需（四层 daily / guards / precommit / weekly） | `D-859` | 2026-11-08 | 已落（批次 537） |
| 测试瘦身二阶段 + 安全 / 体验 / 部署梯度：六维 80/78/74/85/77/74 | `D-860` | 2026-11-08 | 已落（批次 538） |

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

## D-847 2026-11-03 — 写权限单一源：权限矩阵

> **评议 → 裁定 → 落点**：审计按「中间件是不是 `requireAuth`」判越权，误伤 `signups` 这类 handler 级 guard → 建 `server/security/write-policy-matrix.mjs`（141 行：135 enforced / 4 self-service / 2 public / 0 known-risk），守卫断言 Express 运行期写路由 ≡ 矩阵；C1 改为矩阵判定 + 高风险抽样，`--probe-writes` 才逐口重探 → `server/security/write-policy-matrix.mjs`、`server/test/write-policy-matrix.test.mjs`、`server/scripts/audit/checks-crud.mjs`、`AUDIT_CANON.md`。

## D-848 2026-11-03 — 会话 3 小时过期与两档运行形态

> **评议 → 裁定 → 落点**：支书 2026-11-03 裁定「改成 3 个小时过期」→ `SESSION_TTL_HOURS` 缺省 3（旧 `SESSION_TTL_DAYS` 兼容换算），过期 token 在 `/auth/me` 与受保护写口 401 并删除会话行；production 档缺口令 / 多支部拒绝启动；新增 `npm run start:review` 缺省使用 `server/data.review.db`，视觉检验不写生产库 → `server/routes/auth.js`、`server/run-mode.js`、`server/scripts/start-review.mjs`、`deploy/env.production.example`。

## D-849 2026-11-03 — 多支部同实例设计稿

> **评议 → 裁定 → 落点**：支书要求「服务端要考虑多支部情况，需要有所设计」→ 设计四阶段（读口统一过滤 / 快照按支部 / 党委跨支部显式范围 / 索引），上线仍坚持一实例一支部，Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH` → `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`；`server/run-mode.js` 拒绝文案回链该节。

## D-850 2026-11-03 — 上线残项单一台账

> **评议 → 裁定 → 落点**：审计 / 换轨 / 部署 / 前端残项分散在多处 → 归总为 `L-01`…`L-21`（launch-blocker / post-launch / backlog 三档）；本批关闭 L-01/L-03/L-04/L-05/L-06/L-07，L-02 降级为 post-launch（Linux 真机未验）→ `.ctx/ENGINEERING_ASSESSMENT.md §四「上线残项」`。

## D-851 2026-11-03 — 六维重评（上线专项）

> **评议 → 裁定 → 落点**：按本批证据逐维重打，不因「写了工具」自动加分。
> - **业务与数据 78 → 79（+1）**：契约漂移修正 + 48 表 / 577 行往返一致。
> - **安全与权限 52 → 66（+14）**：矩阵 141 行 / 0 known-risk + 6 条缺口修复 + 3 小时会话 + 快照 P0；多支部读过滤仍未实现，故不到 70。
> - **最小三成本 68 → 68**：P2 3→2、exception 47→44，但无实质 UI 重构与用户实测。
> - **测试与发布 80 → 83（+3）**：矩阵 / 红队 / 缺口 / 会话 / 运行档五组测试进 daily。
> - **架构与可维护 74 → 76（+2）**：权限判据单源化，但新增同批维护点。
> - **运行部署 68 → 73（+5）**：严格 preflight exit 0 + 两档运行 + review 隔离；install/update 未真机验证。
> - 阻断风险：第 2 条部分闭环、第 4 条会话过期闭环、其余保留。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md §一 / §二 / §5.2`。

## D-852 2026-11-03 — `.ctx` 三层与 Active Context 预算

> **评议 → 裁定 → 落点**：支书批「`.ctx` 内容多、权责边界不清、更新频率不一致，容易污染上下文；但也有很多可复用资产」→ 裁定 **`.ctx` 是仓库、不是 active context**：新增 `.ctx/ACTIVE_CONTEXT.md` 作为唯一热投影（≤300 行 / 30KB）；规则 / 判例 / 方法正文先进 `content/01–05`，`.ctx/ACTIVE_RULINGS.md` 只留跨域摘要 + 16 领域索引；`SNAPSHOT` 删除批次小结、改由 `EXECUTION_LOG_INDEX` 承接；`ENGINEERING_ASSESSMENT` / `REVIEW_QUEUE` 标 `reference`；`ACTIVE_RULINGS` / `SNAPSHOT` 路径不移动（分别约 44 / 93 处引用）→ `.ctx/ACTIVE_CONTEXT.md`、`.ctx/README.md`、`.ctx/AGENTS.md`、`CLAUDE.md H26.4`、`content/05_ai_coding/{CONTEXT_MANAGEMENT,DOCUMENT_GOVERNANCE}.md`；守卫 `ctx-hygiene-guard::⑤–⑦`、`docs-governance-guard::G6`、`doc-consistency::S14/S15`。

## D-853 2026-11-03 — CLAUDE 宪法化与乙部清账

> **评议 → 裁定 → 落点**：支书批「乙部膨胀；甲部引用框太多、大多是沿革；CLAUDE 形成于 AI 不强的时期，应按最前沿 prompt / context engineering 重做」→ 裁定 **CLAUDE＝宪法 + 路由**：规则写正文祈使句；历史进 logs；细则进 content/05；甲部引用框 ≤15（只留「原话即规则」与守卫锚点）；乙部只留 ≤12 行真任务（假任务 / 冻结件 / 已完成删除，真任务排 530–532）；丙部只留 4 条真待裁；目标 ≤600 行 / 85KB（实际 197 行 / 17.5KB，10 个引用框）。不删除 H 编号与守卫锚点（H21/H21.3/H40.2/H20.2/H20.3/评议待办节头/批次 521 五编句）→ `CLAUDE.md`、`content/05_ai_coding/{CONTEXT_MANAGEMENT,DOCUMENT_GOVERNANCE,PARALLEL_SKILL_AUDIT,REVIEW_AND_EXPRESSION}.md`；守卫 `ctx-hygiene-guard::⑧–⑨`、`doc-consistency` R 表、`claude-parallel-audit`、`ia-critical-guard`、`ui-preflight-context`。

## D-854 2026-11-03 — 丙部四项裁定

> **评议 → 裁定 → 落点**（支书 grill-me 后裁定）：
> - **B-502-5 旧 token / 旧链接**：不做兼容跳转；账号改名同一事务内**删除旧会话**，旧 token 一律 401；旧书签带旧学号时按 404 处理并提示重新登录。落 `server/routes/member.js`（`DELETE FROM sessions` + `sessionsInvalidated:true`）、`server/test/account-rename.test.mjs`。
> - **B-519-3 成功色文字档**：`--status-success-text` 已存在（DS_01 §2.4），不新增；关闭。
> - **B-521-1 SD 判据表**：维持 `CASES` 迁移登记，不回迁 `DS_03 §12`；`DS_03 §12.6` 已是指针，避免双源。
> - **B-522-1 低密度卡**：先收拢「今天 / 归档」重复卡与空白区，不先补内容；用 `density-audit.json` 复测；排入批次 532。

## D-855 2026-11-04 — 乙部余项合并批与长期项收口

> **评议 → 裁定 → 落点**（支书 grill-me 四问后裁定，本批合并为批次 533）：
> - **B-500-7 待办派生服务端化**：先做**最小 Plan B**（服务端只读派生端点 + 客户端切读 + 兼容降级）；**完整 Plan B 的阶段门槛必须登记在乙部**（`B-500-7b`：七类 unsupported 组服务端化 → 纯函数抽零依赖叶子件 → 客户端本地派生摘除 → 读面前置解耦 → 缓存/性能）。落 `server/routes/todo-groups.js`、`docs/src/data/api-adapter.js`、`docs/src/components/record/todo-tab-shell.js`、`CLAUDE.md 乙部`。
> - **B-500-1 第五轮 P2/P3**：**全量对账**——逐条对现行代码机检，仍命中的修掉，已消失的留证据；本批关账。
> - **B-515-6 真缺陷与 e2e**：**9 条 precommit e2e 必须全部跑通**，不得留到发布前；4 条真缺陷中 2 条经探针证伪（写链已改资源 API / 权限判据已含 `deputy-leader`），向导校验与待批复种子补齐。
> - **B-515-5 / B-522-2 长期棘轮**：各迁一批（`text-xs` 23 处 · help.html 532 → 167 处），同批建 / 收紧守卫棘轮（`TEXT_XS_BASELINE`、help.html 从 `allowNew` 改 `false`），两条转持续任务 `C-5` 并移出乙部。
> - 判据 / 落点：`CLAUDE.md 乙部`、`server/test/type-scale-guard.test.mjs::Q6`、`server/test/hex-hardcode-guard.test.mjs::H7`、`content/04_web_design/design-system/DS_02_TYPE_AND_SIZE.md §3.2.2`。

## D-856 2026-11-04 — 界面信号统一、颜色单一权威与完整 Plan B 一期

> **评议 → 裁定 → 落点**（支书四轮 grill 后裁定，批次 536）：
> - **左条**：删除所有状态型 / 装饰型左侧强调条（hover、选中、当前、状态、提示、装饰）；身份与品牌改圆点 / 徽章，引述改全框 / 底色；只留 1px 结构边。落 `DS_03` SD-25 / §12.11 / §4.2、`DS_04 §5.2`、`UI_REVIEW_CHECKLIST ③-3`、`CASES` CASE-DESIGN-033；守卫 `hover-state-guard::H11`、`ui-control-system-guard::V7`、`ui-contrast-guard::K6` 改判「不得再有状态左条」。
> - **焦点**：沿用 SD-27 / DS_04 §5.7 单环（2px 实线、仅键盘触发、`box-shadow:none`），**不加宽、不收窄、不新增双层环 / 光晕 / 边框叠加**；输入族保持「只变边框」现状。回潮由 `FOCUS-1…5` / `ui-focus-ring::F1–F6` 守住。
> - **颜色**：`styles.css` 为唯一权威；`constants.js` / `tailwind-config.js` 做受守卫镜像（T12/T13 逐值相等）；`about.css` 从 `allowNew` 改 `false`（内容不动）；渲染层彩色 `rgba()` 清零；help 内联徽标改文档页类；`btn-action` / toast 用专用令牌（暗色不覆写，保持浅底深字）。顶栏「写入活动」实底 CTA 按 V-3 保持。
> - **完整 Plan B**：7 类实时组全部服务端化；测试先行＝先用客户端结果做标准答案、再逐字段对账、再加双支部夹具；服务端为默认源，客户端只留展示派生，失败兜底不得生成新业务事实。`B-500-7b-1` 已完成，`B-500-7b-2` 前置已达、**不以上线为前提**。
> - **数据分层**：`CLAUDE.md H32` 增补「服务端算业务事实 / 客户端算展示派生 / 兜底不得生成新事实」。

## D-857 2026-11-07 — CLAUDE 三层恢复、通知受众 fail-closed 与 SD-60 行动行

> **评议 → 裁定 → 落点**（支书 `/plan` 三项要求后裁定，批次 535）：
> - **CLAUDE 三层**：温层从 0 行恢复为「触发式任务表 + H60–H80」；热层 H10–H50、冷层 H90–H100；乙部删除批次历史叙述，完成项整行删除。守卫新增层边界、温层 3–60 行、乙部 ≤18 行且无「已核实完成 / 已清出」、触发表指针 `existsSync`。落 `CLAUDE.md`、`server/test/ctx-hygiene-guard.test.mjs`、`server/test/claude-parallel-audit.test.mjs::C4`、`server/test/ui-preflight-context.test.mjs::P5`。
> - **通知受众 fail-closed**：系统通知无受众＝不可读；广播必须显式 `audience:['all']`；未登录一律不可读；`project-auth-granted` 定向到被赋权人且授权人姓名由服务端按名册复算；存量迁移标 `legacyUnscoped`。落 `docs/src/services/governance/notice.js`、`server/system-notice-kinds.js`、`server/routes/system-notices.js`、`server/scripts/migrate-notice-audience.mjs`、`server/test/notice-audience-failclosed.test.mjs`。
> - **UI 行动行**：SD-60 四类排布（长组件伸缩 / 多短按钮 / 单枚低价值 / 筛选条），`.card-head` ≥641 不换行、标题让位、aside 不拆组；新增 `action-row-wrap-guard`。落 `DS_06 §二`、`DS_03 §4.2`、`docs/src/styles.css`、`CASE-DESIGN-034`。
> - **未登录公共入口**：只研究不改；三方向（A 最小收紧 / B 学院级入口 / C 公共门户）落 `content/04_web_design/evolution/PUBLIC_ENTRANCE.md`，进丙部 V-11 待裁。

## D-858 2026-11-08 — 党委内容域与公共门厅

> **评议 → 裁定 → 落点**（V-11 三方向比选后，支书裁定取 B 学院级公共门厅并同时立党委内容域，批次 536）：
> - **读面**：未登录只看党委公开内容——党委公开通知全文、党委公开活动摘要、公开资料（列表 / 详情 / 下载）与登录入口；登录后看党委与支部并集。党委组织员获得活动写入、下发、公开与多域写权。
> - **数据边界**：党委内容与支部内容同表，以 `ownerScope='committee'` ＋ `branchId='pc-gsm'` 标识；下发目标支部写 `['all']` 或支部 id。支部侧生成副本，副本只改执行字段（时间 / 地点 / 组织者 / 考勤），与原件手动同步，不自动回写；本支部已有副本时，支部列表隐藏党委原件。
> - **公开边界**：`publishScope` 三档（`branch` / `login` / `public`）；`public` 只归党委，必须有未来有效期，撤下与过期一律 fail-closed（匿名接口 404）；公开、撤下、有效期变更与匿名下载写入 `publication_audits` 留痕。
> - **通知与名册**：党委下发到支部的通知限支部内可见，同文重复下发按 24 小时限频；党委可导入支部名册、接收支部上报与提案，处置仍在支部侧。
> - **品牌**：未登录门厅品牌为党徽 ＋「光华管理学院党建平台」，不出现具体支部名、成员姓名、统计卡与工作组。
> - **未选方案**：A 最小收紧（无法承载公开内容）、C 公共门户（超出当前需求）；多支部 Phase 3–4 不以上线为前提，`ALLOW_MULTI_BRANCH` 保持关闭。
> - **落点**：`server/routes/resources/semantic-routes.js`（党委内容语义端点）、`server/routes/resources/branch-scope.js`、`server/routes/public-portal.js`、`server/routes/resources/publication-audit.js`、`docs/index.html`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md §9a.1`、`content/04_web_design/evolution/PUBLIC_ENTRANCE.md`、`content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`。

## D-859 2026-11-08 — 测试瘦身：结果优先、守卫按需

> **评议 → 裁定 → 落点**（支书 2026-11-08 补充裁定第 3 条，批次 537）：
> - **问题**：`test:daily` 已胀到 255 文件 / 1872 断言 / 约 150s，且**结论与过程混跑**——改一个样式要等全部静态守卫与域回归；同时 `server/package.json` 的 `test:daily` 显式清单长 8518 字符，超过 Windows 命令行 8191 上限，Linux 也因 `set X=1&&` 语法不能跑。
> - **裁定**：测试目的＝**暴露结果错误**；结果正确时不检查过程，结果错误时才按需看过程 ⇒ 四层：`daily` 只留**结果门禁**（权限 / 会话 / 数据契约与迁移 / 核心业务结果 / 构建可运行），`guards` 收**静态守卫**（样式 / 字号 / 颜色 / 动效 / 结构 / 文案 / 文档 / 行号 / 页签密度）按需跑，`precommit`＝daily＋guards＋非核心域回归＋e2e，`weekly` 留慢速普查。**不删任何测试文件或断言**，只改分层与触发方式；precommit / full 仍覆盖全部文件。
> - **读数**：daily 255 → **43 文件 / 294 断言**；guards **93 文件 / 759 断言**；precommit 158 文件（含 38 个 e2e）；weekly 2。daily 墙钟实测 **≈123s（并发 4）/ ≈148s（并发 8）**——**未达 ≤60s**：43 文件串行成本约 500s（bcrypt ＋ SQLite / uploads 写盘），并发不再线性加速；压到 60s 需砍到约 20 个文件，会丢登录 / 权限 / 迁移门禁，故保留覆盖并把差距计入 README。后续提速方向＝降测试内固定成本（共享 bootstrap 夹具 / 测试档降 bcrypt 轮数），不是删判据。
> - **未选方案**：① 继续把守卫留在 daily（改样式即等全量，违背「过程按需」）；② 直接删守卫 / 降 `skip`（丢判据，违反 H25）；③ 只把 daily 压到约 20 个文件换 60 秒（丢登录 / 权限 / 迁移结果门禁）。三条均不取。
> - **落点**：`server/test-tier-registry.mjs`（四层 ＋ 四个预算常量）、`server/scripts/{tier-runner,run-daily,run-guards,run-precommit,run-changed}.mjs`、`server/package.json`（`test:daily` / `test:guards` / `test:precommit` / `test:changed`，去掉 `set X=1&&`）、`server/test/test-tier-guard.test.mjs`（T1/T3/T4/T5）、`server/test/doc-consistency.test.mjs::S16`、`server/test/contract-doc-guard.test.mjs`（新增）、`server/test/test-isolation-guard.test.mjs::I1`、四个自查登记守卫（`claude-parallel-audit::C7` / `container-width-guard::C5` / `lf-bar-structure-guard::L5` / `roster-filter-guard::R5`）、`CLAUDE.md H25`、`server/README.md`、`README-server.md`、`server/AGENTS.md`、`server/test/AGENTS.md`。

## D-860 2026-11-08 — 测试瘦身二阶段与安全 / 体验 / 部署梯度

> **评议 → 裁定 → 落点**（支书要求「评分必须带证据卡、未达证据的检查点不加分」，批次 538；只改评分子本与台账，不改代码）：
> - **测试（83 → 85）**：daily **27 文件 / 207 断言 / 60.9s** 全绿，guards **99 文件 / 791 tests / 96.1s** 全绿；四层 runner 按 `test-tier-registry.mjs` 单一源执行，CI `daily.yml` 接 `test:daily` 与 `deploy-verify`。补的是「分层 runner 可复跑 + 结果门禁达时」。
> - **安全（66 → 78）**：B / E / G 三批证据——`security-hardening` 8/8（G4 名册提案复核 / G5 副本同步复核 / L-09 派发位 403 / v14 生成列与索引 / 读口分页 / 公共下载限频 429）、`multi-branch-read-filter` 9 组、`personal-password` 21/21、上传门党委 201 / 普通成员 403。共享口令仍作回退保留；`ALLOW_MULTI_BRANCH` 仍关闭。
> - **体验（68 → 74）**：C 波 2 条 B 项 ＋ 院级内容动作收敛 ＋ 下发通知空态；F 波 5 个 C 页签 IA 三问出结论（1 归档为 A、4 保留改 CTA）；H 波 5 个用户任务在 1440 / 390 双档 PASS，同批修复 `branch-doc` 与 `references` 院级过滤。**75 暂不授予**：用户任务为自动走查、未获真人签收；未登录资料查询页仍只给登录提示。
> - **部署（73 → 74）**：`deploy/verify-linux.sh` 本地 Git Bash 5/6（`bash -n` / `doctor` / `smoke` / `preflight` 过；`package` 因 msys `tar` 失败），PowerShell `package` 断言过；CI 增 `deploy-verify` job。**75 暂不授予**：CI job 未实跑绿、`package` 在 msys `tar` 未过；**80 需真机**。
> - **业务 79 → 80**：G4 / G5 写入前复核 + v14 审计索引 + 党委公开通知写口。**架构 76 → 77**：契约类落地 + registry runner 单源；行号 / 版本戳维护成本仍在。
> - **未选方案**：① 按「功能已做完」直接给体验 75 / 部署 75（违反「未达证据不加分」）；② 把自动走查记作真人签收（证据不成立）；③ 把 CI job 已配置记作已跑绿。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 用户任务走查 PASS 即等于体验达标，可给 75 | 走查是自动取证，真人签收才算体验验收；未登录资料查询页 GAP 未闭不加分 | 证据强度高估（自动 → 人工） | 加分必须写清证据类型；自动走查只能作下限，不得替代真人签收 |
| CI job 已配置即等于部署可验证 | 未实跑绿、`package` 未过即证据不成立 | 配置 ≠ 运行结果 | 部署类加分只认「本机 / CI 实跑读数」，配置只登记不记分 |
| 测试文件减少即等于测试变强 | 分层只改「哪一层跑」，覆盖不减；加分来自结果门禁达时与 runner 单源 | 手段 ≠ 判据 | 测试类加分按「结果门禁读数 + 覆盖未减」计，不按文件数计 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / §二 各维结论 / §四 L-02·L-09·L-10·L-11·L-12·L-13 / §5.2 当前值）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 538）。

> **本文件续编说明**：本文件按批追加、不改写既有条目；当前止于 `D-860`**（共 **34** 条）。
