---
title: "守卫清点与合并台账（72 → 68 件）"
type: guide
role: "[工程师]+[AI]"
last_updated: "2026-10-24"
status: active
---

# 守卫清点与合并台账（2026-10-24 批次 509）

> **本文件回答什么**：仓库里有哪些「守卫 / 真值 / 完整性 / 契约 / 对账 / 基线 / 一致性」类测试，
> 各查什么、多少断言、覆盖多大、近 3 批是否命中、与谁重叠；以及**本次合并了哪几组、后续批次还要并哪几组**。
> **不回答什么**：规范条文（→ `content/03_doc_system/OPERATIONS_GUIDE.md`）、判例正文（→ 各域 `CASES.md`）、
> 逐批执行过程（→ `.ctx/logs/2026-10-EXECUTION_LOG.md`）。
> **数据来源**：`server/test/*.test.{js,mjs}` 实读；断言数＝静态 `test(` / `it(` / `t.test(` 调用点（与
> `test-tier-registry.mjs::countTestCases` 同口径）；覆盖文件数＝文件内出现的源码 / 文档路径字面量去重数（**粗估**，
> 不等于运行时真正读取的文件数）；近 3 批＝`2026-10-EXECUTION_LOG.md` 的批次 506/507/508 段内是否出现该守卫名。

## 一、清点总表（合并后现行 68 件）

> 合并前实点 **72 件**（下表 68 件 ＋ 本批合并掉的 `frontmatter-freshness` / `timestamps-note-guard` /
> `doc-line-ref` / `gold-accent-guard` / `button-system-guard`）。断言数合计 **435**（72 件口径：现行 68 件 410 条
> ＋ 已合并 5 件 25 条）。

| 文件 | 检查对象 | 断言数 | 覆盖文件数（粗估） | 近 3 批是否命中 | 与谁重叠 |
|---|---|---:|---:|---|---|
| `activity-tone-guard.test.mjs` | 数据 / 活动类别 tone | 4 | 20 | 是 | `ui-color-semantics`、`theme-palette-guard`（颜色语义） |
| `archive-action-guard.test.mjs` | 数据 / 归档写链 | 2 | 3 | — | `archive-record-write`、`write-path-guard` |
| `archive-deeplink-guard.test.mjs` | 页面 / 归档深链 | 5 | 4 | — | `notice-deeplink-guard`、`ui-home-deeplink` |
| `block-entry-guard-e2e.test.mjs` | 页面（真机） | 4 | 4 | — | `block-manifest`、`block-config-ui-e2e` |
| `branch-id-literal-guard.test.mjs` | 代码 / 数据（支部字面量） | 2 | 2 | — | `db-integrity-guard`、`identity-student-id-guard` |
| `control-font-guard.test.mjs` | 组件 / token（控件字号） | 4 | 1 | — | `small-text-guard`、`text-tier-guard`、`table-type-scale-guard` |
| `copy-anchor-guard-e2e.test.mjs` | 页面文案（真机） | 3 | 2 | — | `copy-fold-guard`、`copy-master-guard` |
| `copy-fold-guard.test.mjs` | 页面文案（折叠区） | 2 | 1 | — | `copy-length-guard`、`copy-master-guard` |
| `copy-length-guard.test.mjs` | 页面文案（长度） | 6 | 19 | — | `copy-fold-guard`、`copy-screen-guard` |
| `copy-master-guard.test.mjs` | 页面文案 vs 制度母本 | 4 | 17 | — | `copy-length-guard`、`copy-screen-guard` |
| `copy-screen-guard.test.mjs` | 页面文案（真机逐屏） | 5 | 3 | — | `copy-length-guard`、`copy-master-guard` |
| `ctx-hygiene-guard.test.mjs` | 目录 / 文档（`.ctx` 准入与归档） | 4 | 26 | — | `docs-governance-guard`（README / AGENTS / 索引位） |
| `data-lifecycle-guard.test.mjs` | 数据（生命周期 / 迁移） | 14 | 11 | — | `db-integrity-guard`、`db-migration`、`seed-baseline` |
| `date-canon-guard.test.mjs` | 代码 / 数据（日期口径） | 2 | 11 | — | `doc-consistency::S13`、`frontmatter` 日期线（已并入 docs-governance） |
| `db-integrity-guard.test.mjs` | 数据（表结构 / 版本） | 5 | 3 | — | `db-migration`、`seed-baseline` |
| `dead-selector-guard.test.mjs` | 组件 / CSS（零引用类） | 4 | 7 | 是 | `hex-hardcode-guard`、`ui-redundancy-guard` |
| `density-spacing-guard.test.mjs` | 组件 / token（密度间距） | 7 | 1 | 是 | `spacing-scale-guard`、`ui-control-system-guard` |
| `doc-consistency.test.mjs` | 文档（跨面口径 S1–S20） | 21 | 67 | 是 | `docs-governance-guard`、`ctx-hygiene-guard`、`test-tier-guard` |
| `docs-governance-guard.test.mjs` | 文档（frontmatter / 备注列 / 行号引用 / README / AGENTS / SNAPSHOT / 判例） | 18 | 38 | — | `doc-consistency`、`ctx-hygiene-guard`、`link-integrity` |
| `feedback-integrity.test.mjs` | 页面 / 数据（写反馈可信） | 12 | 8 | — | `pending-writes`、`write-path-guard` |
| `field-shell-guard.test.mjs` | 组件（字段外壳） | 6 | 5 | — | `ui-control-system-guard`、`hover-state-guard` |
| `frontend-foundations-guard.test.mjs` | 组件 / 页面（前端底线） | 9 | 13 | — | `ui-motion-guard`、`hover-state-guard`、`hex-hardcode-guard` |
| `handoff-state-guard.test.mjs` | 数据 / 状态机（交接态） | 10 | 3 | — | `state-enum-guard`、`todo-*` 状态守卫 |
| `hex-hardcode-guard.test.mjs` | token / 代码（硬编码 hex） | 6 | 14 | 是 | `theme-palette-guard`、`dead-selector-guard` |
| `hover-state-guard.test.mjs` | 组件（hover / active / selected） | 7 | 6 | 是 | `ui-motion-guard`、`field-shell-guard`、`ui-control-system-guard` |
| `ia-critical-guard.test.mjs` | 页面结构（IA 关键位） | 5 | 5 | — | `ui-first-screen-order`、`workbench-audit-coverage` |
| `identity-student-id-guard.test.mjs` | 数据（学号身份） | 7 | 13 | — | `id-uniqueness`、`person-consistency` |
| `import-path-guard.test.mjs` | 代码（ESM 路径） | 2 | 5 | — | `module-load`、`link-integrity` |
| `link-color-guard.test.mjs` | token / 组件（链接色） | 5 | 1 | 是 | `theme-palette-guard`、`ui-color-semantics`、`ui-contrast-guard` |
| `link-integrity.test.mjs` | 页面 / 文档链接（真机） | 5 | 4 | — | `link-target-guard`、`docs-governance-guard::R1–R6` |
| `link-target-guard.test.mjs` | 页面（JS 渲染 href） | 2 | 15 | — | `link-integrity` |
| `localstorage-key-guard.test.mjs` | 代码 / 存储键 | 3 | 4 | 是 | `doc-consistency::S6`、`preferences` |
| `material-link-truth.test.mjs` | 数据（材料链接真值） | 6 | 1 | — | `mock-api-parity`、`data-lifecycle-guard` |
| `mock-api-parity-structure.test.mjs` | 数据（mock / API 结构） | 4 | 7 | — | `mock-api-parity`、`mock-integrity` |
| `mock-api-parity.test.mjs` | 数据（mock / API 读数） | 5 | 4 | — | `mock-api-parity-structure`、`mock-integrity` |
| `mock-integrity.test.mjs` | 数据（mock 完整性，真机） | 2 | 0 | — | `mock-api-parity`、`mock-api-parity-structure` |
| `modal-contract.test.mjs` | 组件 / 交互（弹窗契约） | 5 | 4 | — | `modal-escape-guard`、`ui-modal-form-guard` |
| `modal-escape-guard.test.mjs` | 组件 / 交互（ESC 关闭） | 3 | 1 | — | `modal-contract`、`ui-modal-form-guard` |
| `motion-guard.test.mjs` | 组件 / token（动效令） | 6 | 1 | — | `ui-motion-guard`、`frontend-foundations-guard` |
| `notice-deeplink-guard.test.mjs` | 页面（通知深链） | 7 | 23 | — | `archive-deeplink-guard`、`ui-home-deeplink` |
| `page-title-guard.test.mjs` | 页面（标题 / 面包屑） | 4 | 15 | — | `tab-alias-guard`、`ux-guard` |
| `party-branch-directory-guard.test.mjs` | 页面 / 数据（支部名录） | 1 | 1 | — | `party-branch-directory-context`、`doc-consistency` |
| `perf-render-guard.test.mjs` | 页面 / 性能（渲染预算） | 5 | 0 | — | `perf-todo-agg-cache`、`perf-index-equivalence` |
| `person-consistency.test.mjs` | 数据（人员单一源） | 10 | 7 | — | `identity-student-id-guard`、`id-uniqueness` |
| `publicity-static-guard.test.mjs` | 页面（宣传静态位） | 4 | 12 | — | `copy-*`、`ui-redundancy-guard` |
| `responsive-cards-guard.test.mjs` | 页面 / 布局（响应式卡片） | 7 | 9 | — | `density-spacing-guard`、`ux-guard` |
| `roster-filter-guard.test.mjs` | 页面 / 组件（名册筛选） | 7 | 4 | — | `filter-row`、`list-filter` 相关守卫 |
| `round1-remediation-guard.test.mjs` | 跨面（首轮整改回归） | 5 | 15 | — | `round3-4-batch1`、`structural-round3` |
| `row-markup-guard.test.mjs` | 组件（列表行标记） | 4 | 8 | — | `table-type-scale-guard`、`ui-redundancy-guard` |
| `seed-baseline.test.mjs` | 数据（空库基线） | 3 | 2 | — | `seed-drift`、`db-integrity-guard` |
| `self-evident-copy-guard.test.mjs` | 页面文案（自明性） | 2 | 0 | — | `copy-length-guard`、`ux-guard` |
| `small-text-guard.test.mjs` | token / 页面（小字） | 3 | 1 | — | `control-font-guard`、`text-tier-guard` |
| `spacing-scale-guard.test.mjs` | token / 组件（间距档） | 4 | 6 | — | `density-spacing-guard`、`table-type-scale-guard` |
| `state-enum-guard.test.mjs` | 数据 / 代码（状态枚举） | 6 | 16 | — | `handoff-state-guard`、`doc-consistency::S14` |
| `tab-alias-guard.test.mjs` | 页面 / 路由（页签别名） | 3 | 8 | — | `page-title-guard`、`tab-nav` |
| `table-type-scale-guard.test.mjs` | 组件（表格字号档） | 4 | 2 | — | `text-tier-guard`、`row-markup-guard` |
| `test-tier-guard.test.mjs` | 测试机制（分层 / 预算） | 6 | 6 | — | `doc-consistency::S16`、`suite-shard` |
| `text-tier-guard.test.mjs` | token / 页面（段落档位） | 4 | 2 | — | `small-text-guard`、`control-font-guard` |
| `theme-palette-guard.test.mjs` | token（7 主题色板） | 12 | 9 | 是 | `ui-contrast-guard`、`hex-hardcode-guard`、`ui-color-semantics` |
| `ui-contrast-guard.test.mjs` | token（对比度） | 5 | 3 | 是 | `theme-palette-guard::T2`、`link-color-guard` |
| `ui-control-system-guard.test.mjs` | 组件（控件单一源） | 14 | 19 | 是 | `ui-select-appearance-guard`、`field-shell-guard`、`density-spacing-guard` |
| `ui-modal-form-guard.test.mjs` | 组件（弹窗表单） | 10 | 13 | — | `modal-contract`、`modal-escape-guard` |
| `ui-motion-guard.test.mjs` | 组件（卡片悬停 / transition） | 3 | 0 | — | `motion-guard`、`hover-state-guard` |
| `ui-redundancy-guard.test.mjs` | 页面（冗余控件） | 2 | 7 | — | `dead-selector-guard`、`ux-guard` |
| `ui-select-appearance-guard.test.mjs` | 组件（select 外观） | 6 | 3 | 是 | `ui-control-system-guard`、`field-shell-guard` |
| `ux-guard.test.mjs` | 页面（交互底线） | 7 | 7 | — | `ui-redundancy-guard`、`page-title-guard` |
| `workbench-revision-contract.test.mjs` | 页面 / 契约（工作台改版） | 32 | 45 | 是 | `workbench-audit-coverage`、`ui-first-screen-order` |
| `write-path-guard.test.mjs` | 数据 / 写链 | 4 | 3 | — | `pending-writes`、`feedback-integrity` |

## 二、本次合并掉的文件（5 → 3 个保留件）

| 被合并文件 | 断言数 | 并入 | 依据（同一检查对象 ＋ 同一失败根因） |
|---|---:|---|---|
| `frontmatter-freshness.test.mjs` | 3 | `docs-governance-guard.test.mjs` | 文档元数据日期（`content/**` frontmatter ↔ TIMESTAMPS ↔ git） |
| `timestamps-note-guard.test.mjs` | 4 | `docs-governance-guard.test.mjs` | 同一份 `.ctx/TIMESTAMPS.md` 的表行 / 备注列 |
| `doc-line-ref.test.mjs` | 6 | `docs-governance-guard.test.mjs` | 文档内「文件:行号」取证引用失效 |
| `gold-accent-guard.test.mjs` | 5 | `theme-palette-guard.test.mjs` | 同一张 `ACCENT_COLORS` 主题表与同一组 CSS token |
| `button-system-guard.test.mjs` | 7 | `ui-control-system-guard.test.mjs` | 同一批 `<button>` 类名与 `styles.css` 控件规则 |

## 三、结论：目标数量与推导

### 3.1 数量

- 清点（合并前）：**72 件**守卫类测试。
- 本次合并：5 件 → 3 件保留件（文档 3→1 新增、颜色 2→1、交互 2→1），净 **−2 件**的「组」变化，
  文件数 **72 − 5 ＋ 1 = 68**。
- 后续目标：**54 ± 3 件**（再合并约 14 件）。推导见 3.2。

### 3.2 推导（按「同一检查对象 ＋ 同一失败根因」聚类，不按文件名拍脑袋）

| 簇 | 同一检查对象 | 同一失败根因 | 现有件数 | 目标件数 | 差额 |
|---|---|---|---:|---:|---:|
| A 文档 / 元数据 | 文档正文、索引、台账、日期 | 某文件 / 目录的元数据与实况不一致 | 8 | 5 | −3 |
| B 颜色 / 视觉令牌 | 主题表、CSS 变量、语义色 | 色值或派生链与主题表不一致 | 6 | 3 | −3 |
| C 控件 / 交互 | `<button>` / 输入 / 弹窗 / 动效 | 控件外观与交互态未走单一源 | 11 | 8 | −3 |
| D 静态结构 / 反回潮 | 类名、路径、字号、间距、状态枚举 | 「新增一处违规」即红，判据形态相同 | 20 | 18 | −2 |
| E 数据 / 契约真值 | 表结构、种子、mock↔API、人员/材料 | 数据真值与代码 / 另一形态不一致 | 10 | 8 | −2 |
| F 业务域回归 | 单业务域的写链 / 深链 / 权限 | 域内行为回归（对象不同，不宜跨域合） | 13 | 12 | −1 |
| **合计** | | | **68** | **54** | **−14** |

### 3.3 本次合并清单（已执行）

1. 文档族：`frontmatter-freshness` ＋ `timestamps-note-guard` ＋ `doc-line-ref` → **`docs-governance-guard`**（新）。
   `doc-consistency` **保留**（S1–S20 跨面、体量大，不在本次合并内）。
2. 颜色族：`gold-accent-guard` → **`theme-palette-guard`**。
3. 交互族：`button-system-guard` → **`ui-control-system-guard`**。

### 3.4 后续批次清单（登记，不在本批执行）

| 批次 | 合并组 | 目标 | 依据 |
|---|---|---|---|
| 510 | `ui-color-semantics` ＋ `link-color-guard` → `theme-palette-guard` | B 簇 6 → 4 | 同一检查对象＝颜色语义 / 主题 token |
| 510 | `motion-guard` ＋ `ui-motion-guard` → 1 件 | C 簇 11 → 10 | 同一检查对象＝动效令牌与过渡属性 |
| 511 | `field-shell-guard` ＋ `hover-state-guard` ＋ `density-spacing-guard` → `ui-control-system-guard` | C 簇 10 → 8 | 同一检查对象＝控件外观（外壳 / 三态 / 密度） |
| 511 | `copy-fold-guard` ＋ `copy-length-guard` ＋ `copy-master-guard` → 1 件 | A 簇 8 → 6 | 同一检查对象＝页面文案（折叠 / 长度 / 母本） |
| 512 | `page-title-guard` ＋ `tab-alias-guard` ＋ `state-enum-guard` ＋ `row-markup-guard` → 2 件 | D 簇 20 → 18 | 判据形态相同＝「新增即红」的静态扫描 |
| 512 | `mock-api-parity` ＋ `mock-api-parity-structure` ＋ `mock-integrity` → 2 件 | E 簇 10 → 8 | 同一检查对象＝mock ↔ API 两形态 |
| 513 | `ctx-hygiene-guard` ＋ `docs-governance-guard` → 1 件（待 `doc-consistency` 拆分后再评） | A 簇 6 → 5 | 同一检查对象＝文档 / 目录准入与索引位 |

> **不并入**：`ui-color-semantics` 与 `activity-tone-guard` 检查「页面语义 / 活动类别」，与主题色板不是同一对象；
> `field-shell` / `hover-state` / `density-spacing` 同理，登记后续批次而非本批强并。

## 四、故障注入记录（每组一红一绿）

| 组 | 注入点 | 报错摘要（含路径 ＋ 根因关键词） | 还原后结果 |
|---|---|---|---|
| 组 1 文档族 | `content/README.md` 删「## 知识流向」标题 | `docs-governance-guard::G4` 红：`content/README.md 缺「知识流向」标题（目录 README 模板 7 字段之一）` | 还原后 G4 绿；整件 20/21（余 1 红为 `R1` 存量，见 §五） |
| 组 2 颜色族 | `docs/src/core/domain/constants.js` 的 `gold.light.base` `#A97A12` → `#A97A13` | `theme-palette-guard::G2` 红：`docs/src/core/domain/constants.js：gold.light.base 应为沉稳琥珀金 #A97A12` | 还原后 G2 绿；整件 12/12 |
| 组 3 交互族 | `docs/src/styles.css` 的 `.btn-ghost, .btn-tab` 共享尺寸档删 `line-height: 22px !important` | `ui-control-system-guard::B6` 红：`styles.css：「按钮尺寸归一（2026-10-18）」段缺少 .btn-ghost 的尺寸档`（该声明同服 `.btn-tab`） | 还原后 B6 绿；整件 14/14 |

## 五、已知红项与归属（如实标注）

- **`docs-governance-guard::R1` 存量红**：`README-server.md` 的 3 处 `文件:行号` 指向空行
  （`content/README.md:24` ×2、`README.md:198`）。该红在合并前即存在（原 `doc-line-ref::R1` 同红），
  修复面是 `README-server.md` / `content/README.md` / 根 `README.md`，**不在本批授权面**。
- **`doc-consistency::S9/S11` 预期红**：`content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2` 与根
  `README.md` 仍引用本批删掉的 3 个文档守卫文件名。两份文件均**不在本批授权面**；同批未改，
  避免越权改「规范索引」。后续批次须同批改准这两处指针（或把引用改为 `docs-governance-guard`）。

## 六、预算与注册变化

| 项 | 变更前 | 变更后 | 说明 |
|---|---:|---:|---|
| `DAILY_FILE_BUDGET` | 232 | **228** | 删 5 件、增 1 件 |
| `DAILY_TEST_BUDGET` | 1494 | **1499** | 删 5 件静态 25 条、增 `docs-governance-guard` 18 条；按守卫实算校准（上批预算与实况差 12） |
| `test:daily` 文件数 | 232 | **228** | 同步删 5 个文件名、加 `docs-governance-guard.test.mjs` |
| `test:fast` | 含 3 个已删文件名 | 替换为 `docs-governance-guard` / `ui-control-system-guard` | 避免悬空引用 |
