---
title: "守卫清点与合并台账（72 → 77 件）"
type: guide
role: "[工程师]+[AI]"
last_updated: "2026-10-27"
status: active
---

# 守卫清点与合并台账（2026-10-24 批次 509；2026-10-25 批次 510 / 511 补扩展记录；2026-10-26 批次 512 新增 2 件、批次 513 新增 4 件；2026-10-27 批次 514 新增 3 件）

> **本文件回答什么**：仓库里有哪些「守卫 / 真值 / 完整性 / 契约 / 对账 / 基线 / 一致性」类测试，
> 各查什么、多少断言、覆盖多大、近 3 批是否命中、与谁重叠；以及**本次合并了哪几组、后续批次还要并哪几组**。
> **不回答什么**：规范条文（→ `content/03_doc_system/OPERATIONS_GUIDE.md`）、判例正文（→ 各域 `CASES.md`）、
> 逐批执行过程（→ `.ctx/logs/2026-10-EXECUTION_LOG.md`）。
> **数据来源**：`server/test/*.test.{js,mjs}` 实读；断言数＝静态 `test(` / `it(` / `t.test(` 调用点（与
> `test-tier-registry.mjs::countTestCases` 同口径）；覆盖文件数＝文件内出现的源码 / 文档路径字面量去重数（**粗估**，
> 不等于运行时真正读取的文件数）；近 3 批＝`2026-10-EXECUTION_LOG.md` 的批次 506/507/508 段内是否出现该守卫名。

## 一、清点总表（合并后现行 77 件）

> **批次 510（2026-10-25）**：未新增 / 删除 guard 文件；本批只做**扩展**，明细见 §七。
> **批次 511（2026-10-25）**：仍为 68 件（H-T1…H-T5 / T3-1…T4-1 落在既有文件），明细见 §八。
> **批次 512（2026-10-26）**：新增 **2 件**——`runtime-tab-lifecycle-guard`（16 条）与 `object-route-guard`
> （8 条）；件数 68 → **70**，明细见 §九。
> **批次 513（2026-10-26）**：新增 **4 件**——`seed-contract-guard`（10 条）、`test-isolation-guard`（4 条）、
> `write-truth-guard`（9 条）、`demo-window-guard`（5 条）；件数 70 → **74**，明细见 §十。
> **批次 514（2026-10-27）**：新增 **3 件**——`no-underline-guard`（4 条）、`loading-experience-guard`（6 条）、
> `no-about-route-guard`（5 条）；件数 74 → **77**，明细见 §十一。

> 合并前实点 **72 件**（批次 509 口径）。下表逐行按实读校准后，现行 **77 件 / 526 条**；另有已合并的
> 5 件（`frontmatter-freshness` / `timestamps-note-guard` / `doc-line-ref` / `gold-accent-guard` /
> `button-system-guard`，25 条）不在表内、不计入本表合计。

| 文件 | 检查对象 | 断言数 | 覆盖文件数（粗估） | 近 3 批是否命中 | 与谁重叠 |
|---|---|---:|---:|---|---|
| `activity-tone-guard.test.mjs` | 数据 / 活动类别 tone | 5 | 20 | 是 | `ui-color-semantics`、`theme-palette-guard`（颜色语义） |
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
| `data-lifecycle-guard.test.mjs` | 数据（生命周期 / 迁移） | 15 | 11 | — | `db-integrity-guard`、`db-migration`、`seed-baseline` |
| `date-canon-guard.test.mjs` | 代码 / 数据（日期口径） | 2 | 11 | — | `doc-consistency::S13`、`frontmatter` 日期线（已并入 docs-governance） |
| `db-integrity-guard.test.mjs` | 数据（表结构 / 版本） | 5 | 3 | — | `db-migration`、`seed-baseline` |
| `dead-selector-guard.test.mjs` | 组件 / CSS（零引用类） | 4 | 7 | 是 | `hex-hardcode-guard`、`ui-redundancy-guard` |
| `demo-window-guard.test.mjs` | 数据（演示窗口 / 月份与状态覆盖） | 5 | 17 | — | `seed-contract-guard`、`mock-api-parity-structure`、`date-canon-guard` |
| `density-spacing-guard.test.mjs` | 组件 / token（密度间距） | 7 | 1 | 是 | `spacing-scale-guard`、`ui-control-system-guard` |
| `doc-consistency.test.mjs` | 文档（跨面口径 S1–S20） | 23 | 67 | 是 | `docs-governance-guard`、`ctx-hygiene-guard`、`test-tier-guard` |
| `docs-governance-guard.test.mjs` | 文档（frontmatter / 备注列 / 行号引用 / README / AGENTS / SNAPSHOT / 判例 / 术语 Harness） | 25 | 38 | — | `doc-consistency`、`ctx-hygiene-guard`、`link-integrity` |
| `feedback-integrity.test.mjs` | 页面 / 数据（写反馈可信） | 12 | 8 | — | `pending-writes`、`write-path-guard` |
| `field-shell-guard.test.mjs` | 组件（字段外壳） | 6 | 5 | — | `ui-control-system-guard`、`hover-state-guard` |
| `frontend-foundations-guard.test.mjs` | 组件 / 页面（前端底线） | 9 | 13 | — | `ui-motion-guard`、`hover-state-guard`、`hex-hardcode-guard` |
| `handoff-state-guard.test.mjs` | 数据 / 状态机（交接态） | 10 | 3 | — | `state-enum-guard`、`todo-*` 状态守卫 |
| `hex-hardcode-guard.test.mjs` | token / 代码（硬编码 hex） | 6 | 14 | 是 | `theme-palette-guard`、`dead-selector-guard` |
| `hover-state-guard.test.mjs` | 组件（hover / active / selected） | 7 | 6 | 是 | `ui-motion-guard`、`field-shell-guard`、`ui-control-system-guard` |
| `ia-critical-guard.test.mjs` | 页面结构（IA 关键位） | 5 | 5 | — | `ui-first-screen-order`、`workbench-audit-coverage` |
| `identity-student-id-guard.test.mjs` | 数据（学号身份） | 7 | 13 | — | `id-uniqueness`、`person-consistency` |
| `import-path-guard.test.mjs` | 代码（ESM 路径） | 2 | 5 | — | `module-load`、`link-integrity` |
| `link-color-guard.test.mjs` | token / 组件（链接色） | 8 | 1 | 是 | `theme-palette-guard`、`ui-color-semantics`、`ui-contrast-guard` |
| `link-integrity.test.mjs` | 页面 / 文档链接（真机） | 5 | 4 | — | `link-target-guard`、`docs-governance-guard::R1–R6` |
| `link-target-guard.test.mjs` | 页面（JS 渲染 href） | 2 | 15 | — | `link-integrity` |
| `loading-experience-guard.test.mjs` | 组件 / 加载（骨架 / 120ms 延迟 / 180ms 淡入 / ≤1s / 跳转进度条） | 6 | 3 | 是 | `ui-motion-guard`、`motion-guard`、`runtime-tab-lifecycle-guard` |
| `localstorage-key-guard.test.mjs` | 代码 / 存储键（四类归档 / 版本校验） | 10 | 5 | 是 | `doc-consistency::S6`、`preferences`、`write-truth-guard` |
| `material-link-truth.test.mjs` | 数据（材料链接真值） | 6 | 1 | — | `mock-api-parity`、`data-lifecycle-guard` |
| `mock-api-parity-structure.test.mjs` | 数据（mock / API 结构） | 5 | 7 | — | `mock-api-parity`、`mock-integrity` |
| `mock-api-parity.test.mjs` | 数据（mock / API 读数） | 5 | 4 | — | `mock-api-parity-structure`、`mock-integrity` |
| `mock-integrity.test.mjs` | 数据（mock 完整性，真机） | 2 | 0 | — | `mock-api-parity`、`mock-api-parity-structure` |
| `modal-contract.test.mjs` | 组件 / 交互（弹窗契约） | 5 | 4 | — | `modal-escape-guard`、`ui-modal-form-guard` |
| `modal-escape-guard.test.mjs` | 组件 / 交互（ESC 关闭） | 3 | 1 | — | `modal-contract`、`ui-modal-form-guard` |
| `motion-guard.test.mjs` | 组件 / token（动效令） | 6 | 1 | — | `ui-motion-guard`、`frontend-foundations-guard` |
| `no-about-route-guard.test.mjs` | 页面（About 撤路由：HTML / JS / MD 零入口 ＋ 文件保留） | 5 | 4 | 是 | `link-integrity`、`page-title-guard` |
| `no-underline-guard.test.mjs` | 组件 / CSS（全站文本下划线清零 / PENDING 台账） | 4 | 1 | 是 | `link-color-guard`、`ui-control-system-guard::V5` |
| `notice-deeplink-guard.test.mjs` | 页面（通知深链） | 7 | 23 | — | `archive-deeplink-guard`、`ui-home-deeplink` |
| `object-route-guard.test.mjs` | 组件 / 路由（详情入口 direct / locate / none） | 8 | 12 | — | `archive-deeplink-guard`、`tab-alias-guard`、`frontend-foundations-guard::F8` |
| `page-title-guard.test.mjs` | 页面（标题 / 面包屑） | 7 | 15 | 是 | `tab-alias-guard`、`ux-guard` |
| `party-branch-directory-guard.test.mjs` | 页面 / 数据（支部名录） | 1 | 1 | — | `party-branch-directory-context`、`doc-consistency` |
| `perf-render-guard.test.mjs` | 页面 / 性能（渲染预算） | 5 | 0 | — | `perf-todo-agg-cache`、`perf-index-equivalence` |
| `person-consistency.test.mjs` | 数据（人员单一源） | 10 | 7 | — | `identity-student-id-guard`、`id-uniqueness` |
| `publicity-static-guard.test.mjs` | 页面（宣传静态位） | 4 | 12 | — | `copy-*`、`ui-redundancy-guard` |
| `responsive-cards-guard.test.mjs` | 页面 / 布局（响应式卡片） | 8 | 9 | 是 | `density-spacing-guard`、`ux-guard` |
| `roster-filter-guard.test.mjs` | 页面 / 组件（名册筛选） | 7 | 4 | — | `filter-row`、`list-filter` 相关守卫 |
| `round1-remediation-guard.test.mjs` | 跨面（首轮整改回归） | 5 | 15 | — | `round3-4-batch1`、`structural-round3` |
| `row-markup-guard.test.mjs` | 组件（列表行标记） | 4 | 8 | — | `table-type-scale-guard`、`ui-redundancy-guard` |
| `runtime-tab-lifecycle-guard.test.mjs` | 组件 / 运行时（tab 渲染生命周期 / 绑定幂等 / 首屏性能） | 16 | 12 | — | `perf-render-guard`、`frontend-foundations-guard`、`tab-nav` |
| `seed-baseline.test.mjs` | 数据（空库基线） | 6 | 2 | — | `seed-drift`、`db-integrity-guard`、`seed-contract-guard` |
| `seed-contract-guard.test.mjs` | 数据（种子契约 / schema v12 结构） | 10 | 18 | — | `seed-baseline`、`db-integrity-guard`、`data-lifecycle-guard` |
| `self-evident-copy-guard.test.mjs` | 页面文案（自明性） | 2 | 0 | — | `copy-length-guard`、`ux-guard` |
| `small-text-guard.test.mjs` | token / 页面（小字） | 3 | 1 | — | `control-font-guard`、`text-tier-guard` |
| `spacing-scale-guard.test.mjs` | token / 组件（间距档） | 4 | 6 | — | `density-spacing-guard`、`table-type-scale-guard` |
| `state-enum-guard.test.mjs` | 数据 / 代码（状态枚举） | 9 | 16 | — | `handoff-state-guard`、`doc-consistency::S14` |
| `tab-alias-guard.test.mjs` | 页面 / 路由（页签别名） | 3 | 8 | — | `page-title-guard`、`tab-nav` |
| `table-type-scale-guard.test.mjs` | 组件（表格字号档） | 4 | 2 | — | `text-tier-guard`、`row-markup-guard` |
| `test-tier-guard.test.mjs` | 测试机制（分层 / 预算） | 8 | 6 | 是 | `doc-consistency::S16`、`suite-shard` |
| `test-isolation-guard.test.mjs` | 测试机制（测试数据面四类 / 运行库零残留） | 4 | 8 | — | `test-tier-guard`、`cleanup --test-residue`、`seed-baseline` |
| `text-tier-guard.test.mjs` | token / 页面（段落档位） | 4 | 2 | — | `small-text-guard`、`control-font-guard` |
| `theme-palette-guard.test.mjs` | token（7 主题色板 / 功能色层 / 僵尸 token） | 15 | 9 | 是 | `ui-contrast-guard`、`hex-hardcode-guard`、`ui-color-semantics` |
| `ui-contrast-guard.test.mjs` | token（对比度） | 6 | 3 | 是 | `theme-palette-guard::T2`、`link-color-guard` |
| `ui-control-system-guard.test.mjs` | 组件（控件单一源 / 视觉基础 / 按钮三档） | 25 | 22 | 是 | `ui-select-appearance-guard`、`field-shell-guard`、`density-spacing-guard` |
| `ui-modal-form-guard.test.mjs` | 组件（弹窗表单） | 10 | 13 | — | `modal-contract`、`modal-escape-guard` |
| `ui-motion-guard.test.mjs` | 组件（卡片悬停 / transition） | 3 | 0 | — | `motion-guard`、`hover-state-guard` |
| `ui-redundancy-guard.test.mjs` | 页面（冗余控件） | 2 | 7 | — | `dead-selector-guard`、`ux-guard` |
| `ui-select-appearance-guard.test.mjs` | 组件（select 外观） | 6 | 3 | 是 | `ui-control-system-guard`、`field-shell-guard` |
| `ux-guard.test.mjs` | 页面（交互底线） | 7 | 7 | — | `ui-redundancy-guard`、`page-title-guard` |
| `workbench-revision-contract.test.mjs` | 页面 / 契约（工作台改版） | 32 | 45 | 是 | `workbench-audit-coverage`、`ui-first-screen-order` |
| `write-path-guard.test.mjs` | 数据 / 写链 | 4 | 3 | — | `pending-writes`、`feedback-integrity`、`write-truth-guard` |
| `write-truth-guard.test.mjs` | 数据（写成功可证 / 去 mock 回退） | 9 | 13 | — | `localstorage-key-guard`、`pending-writes`、`mock-api-parity` |

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
- 批次 509 合并：5 件 → 3 件保留件（文档 3→1 新增、颜色 2→1、交互 2→1），文件数 **72 − 5 ＋ 1 = 68**。
- 批次 512 新增：`runtime-tab-lifecycle-guard` ＋ `object-route-guard` ⇒ 70 件 / 462 条。
- 批次 513 新增：`seed-contract-guard`（10）＋ `test-isolation-guard`（4）＋ `write-truth-guard`（9）＋ `demo-window-guard`（5），并校准 3 件既有守卫的实读断言（`data-lifecycle-guard` 14→15、`seed-baseline` 3→6、`localstorage-key-guard` 3→10）⇒ 批次 513 末 **74 件 / 501 条**。
- 批次 514 新增：`no-underline-guard`（4）＋ `loading-experience-guard`（6）＋ `no-about-route-guard`（5）；同批扩展 `ui-contrast-guard`（5→6，K3 改判据 ＋ K6）· `theme-palette-guard`（14→15，T10）· `page-title-guard`（4→7，P4–P6）· `responsive-cards-guard`（7→8，C7）；并校准 3 件历史静态差（`doc-consistency` 21→23、`test-tier-guard` 6→8、`ui-control-system-guard` 25 不变）⇒ 现行 **77 件 / 526 条**。
- 后续目标：**60 ± 3 件**（按新增 6 件平移；再合并约 14 件）。推导见 3.2（其「现有 / 目标」为批次 509 时点）。

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

## 七、批次 510 扩展记录（2026-10-25 · 无新增 / 删除 guard 文件）

> 计数口径与 §一 相同：`test(` / `it(` / `t.test(` 调用点。`HEAD` 数取批次 509 提交，`现行` 为本批实读。

| 守卫 | 扩展内容 | `HEAD` test 数 | 现行 test 数 | 本批 +test |
|---|---|---:|---:|---:|
| `notice-deeplink-guard` | F06：非公告必须带 `targetType+targetId`（逐 kind 构建）；所有入口先落 `notice.html?id=`；`resolveNoticeUrl` 导出删除后改为断言「无导出」＋详情页消费坐标 | 7 | 7 | 0（既有 test 内加断言） |
| `notice-audience` | 新增 N13 逐人归档 / 恢复 / 系统归档、N14 角标与列表同源、N15 筛选语义、N16 私信线程 | 12 | 16 | **+4** |
| `notice-message` | 新增 N5 `kindOf` / `isArchivedFor` 纯函数（三种身份单一映射、逐人归档与系统归档分离） | 4 | 5 | **+1** |
| `state-enum-guard` | G4 比较面由「种子手写 `status`」改为「`derive.js` 派生后的状态」，期望值改准（理由：种子只存事实，SD-34） | 6 | 6 | 0（期望值改准） |
| `mock-api-parity-structure` | 比较面改用 `applyDerivedFacts` 后的派生形状（种子只存事实，派生字段不再与 API 静态比对） | 4 | 4 | 0（既有 test 内改比较面） |
| `workbench-audit-coverage` | 新增 Task 5 知情查看：各台 `views` 含 `workgroup`、工作组段只读、深链参数被消费 | 8 | 9 | **+1** |
| `docs-governance-guard` | 本批未改（仍在守 frontmatter / 备注列 / README / AGENTS / SNAPSHOT / 判例索引） | 18 | 18 | 0 |
| `ui-control-system-guard` | 本批未改；SD-36 的胶囊语义当前由 `doc-consistency::S3`（分组名）＋键盘序列人工检查承担，未新增机检 | 14 | 14 | 0 |

- **Q-14 死码清理**：`docs/src/services/governance/notice.js::resolveNoticeUrl` 全仓无消费者（各入口已改 `notice.html?id=`），本批删除该导出及 `getBasePath` 残留引用；`notice-deeplink-guard::F06` 同步改为「不得再有该导出」，而非保留空实现。
- **断言只增不删**：本批未删除任何既有断言；`state-enum-guard::G4` 与 `mock-api-parity-structure` 的期望值改准已在表内写明理由（种子事实化后派生形状才是比较面）。

## 八、批次 511 扩展记录（2026-10-25 · 无新增 / 删除 guard 文件）

> 件数仍为 **68**（无新增 guard 文件）；计数口径同 §一（静态 `test(` / `it(` / `t.test(` 调用点）。
> 本批以**扩展**为主：4 件守卫加新断言、1 件扩扫描面，`doc-consistency` 未改。

| 守卫 | 扩展内容 | `HEAD` test 数 | 现行 test 数 | 本批 +test |
|---|---|---:|---:|---:|
| `docs-governance-guard` | **H-T1** 并列组层级（同层对象 ＋ 允许并列集 ＋ 「其他党小组」独立区）· **H-T2** 页签名覆盖段集合 · **H-T3** 结构性标签登记（基线 **131** 条 · 只降不升）· **H-T4** 废弃写法零残留（`项目组` / `协作组` / `活动项目赋权` / `专班负责人` / `会议活动`）· **H-T5** 术语表关系钉死（20 条 9 字段 / §19 与 `sop/INDEX.md` 只留指针 / 禁止二次定义） | 20 | 25 | **+5** |
| `ui-control-system-guard` | **T3-1** 交互元素内无 `h1..h6` / `role=heading`（675 个交互元素、0 命中）· **T3-2** 折叠可静态回读（`summary` 在 `details` 内；`aria-expanded` 带 `aria-controls`）· **T3-3** 同文件同类折叠一种原语 · **T4-1** 同文件一种折叠头（`renderDisclosure` 与手写不混用，**3 条豁免**） | 14 | 18 | **+4** |
| `frontend-foundations-guard` | **F8** 可点容器键盘可达：4 个原 `div` 伪开关（成员复盘 / 组长复盘 / 组内复盘 / 动态高级筛选）纳入扫描，要求 `role=button` ＋ `tabindex=0` ＋ Enter/Space | 9 | 9 | 0（既有 test 内扩扫描面） |
| `catalog-sync` | **T6** IA 地图 ≡ 页签注册表：总数固定 **45**、逐台 label 集合相等、已降级旧名不得重注册 | 5 | 6 | **+1** |
| `doc-consistency` | 本批未改（S1/S2 仍守 help ↔ 注册 / 旧页签名不得回潮） | 21 | 21 | 0 |

- **件数**：68 → **68**（H-T1…H-T5 落在既有 `docs-governance-guard`，T3-1…T4-1 落在既有 `ui-control-system-guard`，无新增 guard 文件）。
- **非空转（本批实读）**：H-T3 实扫 **78** 文件 / 结构性标签 **234** 处（命中术语 22、未命中 131 已基线）；T3-1 实扫 **675** 个交互元素；T4-1 实扫 **4** 个 `renderDisclosure` 文件 ＋ **32** 个手写折叠文件；`catalog-sync::T6` 固定总数 **45**。
- **故障注入（一红一绿）**：H-T1 把 `insight-view` 的 `taskforce` 段标签改成「专班」⇒ 层级不一致判红；T3-1 在任一 `button` 内放 `<h3>` ⇒ 判红；`catalog-sync::T6` 删 `PRODUCT_IA` 一行 ⇒ 总数 / 集合不符判红。

## 九、批次 512 扩展记录（2026-10-26 · 新增 2 件 guard 文件）

> 件数 **68 → 70**；计数口径同 §一（静态 `test(` / `it(` / `t.test(` 调用点，与 `test-tier-registry::countTestCases` 同口径）。
> 本批以**新增**为主，另有 4 件守卫扩展断言（其中 `frontend-foundations-guard::F8` 为既有 test 内扩扫描面，0 条新增）。

| 守卫 | 变更 | `HEAD` test 数 | 现行 test 数 | 本批 +test |
|---|---|---:|---:|---:|
| `runtime-tab-lifecycle-guard` | **新增**：R1 renderCtx 最新 state（含「切月 → 切走 → 切回」行为用例）· R2 统一生命周期（seq / 去重 / 清 marker / await）· R3 陈旧写回恢复快照 ＋ 失败错误卡 · R4 loading 8s 超时恢复 · R5 绑定标记改挂重建元素 / 事件委托 · R6 页内 import 与节点缺失可见失败 · R7 回退页签 toast · P1 延迟可配（默认 ≤120ms）· P2 loadDB 幂等锁 · P3 首屏不阻塞 · P4 hover 先读后写 / Observer 只扫新增 · P5 后台渲染不铺占位 | — | 16 | **+16（新文件）** |
| `object-route-guard` | **新增**：R1 入口矩阵单一 mode ＋ 理由 · R2 direct / locate 落点 · R3 缺 id / 跨支部 / 特权角色门 · R4 已归档 / 终态 readOnly 与 activity-entry 写口门一致 · R5 生成点收口（裸 URL 0 处、`objectDetailHref` ≥30 调用）· R6 无空 id 可点 · R7 可点节点键盘可达 · R8 同一页只有一个完整详情落点 | — | 8 | **+8（新文件）** |
| `ui-control-system-guard` | **V1** 容器语义（metric-band 两档 / section 可访问名 / list-row 四载体）· **V2** 胶囊全宽可见（无 display:none、≥24px、描边）· **V3** 关键表 fixed ＋ colgroup ＋ 末列贴列尾 ＋ ≤640 动作列 flex-start · **V4** btn-ghost 只作非动作行载体（6 处白名单）· **V5** btn-text 下划线 ＋ 箭头非 neutral-400 · **V6** 图标 32 视觉 ＋ 44 命中 ＋ 无障碍名 · **V7** hover 对白卡 / 页面底实测对比 | 18 | 25 | **+7** |
| `theme-palette-guard` | **T8** 功能色层（状态 4 色 / 类别 3 色 / 身份色 ≡ `ROLE_COLORS` / 语义别名）· **T9** 僵尸 token 零消费者（12 个已删 token ＋ JS 不再写 `--functional-*`） | 12 | 14 | **+2** |
| `link-color-guard` | **L6** 帮助链接并入 `--color-link` ＋ 静态下划线 · **L7** 速查链接颜色并入、角色色只留边框 · **L8** help / about 锚点不得用蓝色或角色色 | 5 | 8 | **+3** |
| `frontend-foundations-guard` | **F8** 扩扫描面：`list-row` 的 `data-interactive="true"` 载体必须原生控件或 `role=button` ＋ `tabindex=0`，主从行须接受 Enter / Space；行载体必须有可见 hover | 9 | 9 | 0（既有 test 内扩扫描面） |

- **件数**：68 → **70**；断言数 410（旧表）→ **462**（逐行实读校准 ＋ 新增 24 条）。
- **非空转（实读）**：V1 扫到 `section.card` ≥8、list-row 四类行型齐；V4 白名单 5 文件 6 处逐一命中；V5 `.btn-text` ≥3 且「全部 / 查看 / 更多」≥3；V6 `.btn-icon` ≥6；object-route R5 扫 ≥180 个 `docs/src/*.js`、`objectDetailHref` 调用 ≥30；runtime P1 默认延迟 ≤120ms。
- **故障注入（人工，不入仓）**：删 `delete el.dataset.currentTab` ⇒ R2 红；`renderCtx` 改回一次性求值 ⇒ R1 红；任一入口写回 `activity.html?id=${id}` ⇒ object-route R5 红；去掉 `!readOnly` ⇒ R4 红；`.tab-group-label` 加 `display:none` ⇒ V2 红；`btn-ghost` 新增一处动作按钮 ⇒ V4 红；`--color-identity-*` 改值不等 `ROLE_COLORS` ⇒ T8 红。

## 十、批次 513 扩展记录（2026-10-26 · 新增 4 件 guard 文件）

> 件数 **70 → 74**；断言数 **462 → 501**（新增 28 条 ＋ 校准 3 件既有守卫的 11 条实读差）。
> 计数口径同 §一（静态 `test(` / `it(` / `t.test(` 调用点）；覆盖文件数同 §一（路径字面量去重，粗估）。

| 守卫 | 检查对象 | 断言数 | 覆盖文件数 | 非空转证据（实读） |
|---|---|---:|---:|---|
| `seed-contract-guard.test.mjs`（新） | 种子契约 / schema v12 结构 | 10 | 18 | C1 九类必须种子源 branchId 非空且＝默认支部（含故障注入）；C2 播种后十张业务表 branchId 非空、考勤 / 考察与父行同支部；C3 `INSERT INTO todos(id,data)` 后 `branch_id` 与 JSON 一致、手写列报错；C4 四组唯一索引存在且重复写入被 SQLite 拒绝；C5 `contributions` 全对象数组、影子表无字符键、篡改 mismatch>0；C6 考察对象 ∈ 父工作组（种子 0 违规）；C7 `issue_reveals` 已删 / `committee_broadcasts` 写口 409；C8–C10 文档登记、四类口径、`SEED_MANIFEST` |
| `test-isolation-guard.test.mjs`（新） | 测试数据面四类 / 运行库零残留 | 4 | 8 | I1 实扫 **≥250** 个测试文件且 `fixtureClass` 合法；I2 `external-write` 必须有临时库或 `finally` 清理（含故障注入）；I3 连 `:3000` 必标 `external-*`、测试源码不得指向 `server/data.db`；I4 临时库登录后运行库 `sessions` / `uploads` 不增长 |
| `write-truth-guard.test.mjs`（新） | 写成功可证 / 去 mock 回退 | 9 | 13 | A1 六个读口（活动 / 考勤 / 考察 / 通知 / 报名 / 待办）api 闸门在种子常量之前；A2 `SNAPSHOT_COVERED_COLLECTIONS`（24 集合）与 `_buildSnapshotPayload` 逐键一致、`committeeBroadcasts` 标 temp；A3 flush 四类分流；A4 outbox 重试 / 放弃；B1–B5 假适配器真跑快照 / 语义端点 / 失败入队 / 本机未同步 |
| `demo-window-guard.test.mjs`（新） | 演示窗口 / 月份与状态覆盖 | 5 | 17 | W1 `DEMO_WINDOW` 精确 2026-08-01–2026-11-30、7 月末 / 12 月初判窗口外；W2 28 个种子集合的日期字段全在窗口内（7 条白名单逐条有理由）；W3 四个月均有活动（实读 **38**：8 月 18 / 9 月 9 / 10 月 8 / 11 月 3），11 月只 draft/published 且无考勤 / 复盘；W4 复盘五态 / 考勤四态 / 专班三态齐；W5 级联顺序不早于活动日 |

| 既有守卫 | 本批扩展 / 改准 | `HEAD` test 数 | 现行 test 数 | 本批 +test |
|---|---|---:|---:|---:|
| `ui-contrast-guard` | **K3** 判据改准：从「中性 `neutral-500` 可读」改为「主题 soft-bg / soft-text 亮暗 ≥4.5:1（实测 6.88 / 9.18）＋ 3px ＋ ≥24px ＋ ≤1280 只缩不隐藏」 | 5 | 5 | 0（既有 test 内改判据） |
| `ui-control-system-guard` | **V2** 判据改准：描边从字面 `neutral-400` 改为「边框对页面底 ≥1.5:1（亮 / 暗各一次）」，并新增 3px 直角断言；字面 token 不再单独判 | 25 | 25 | 0（既有 test 内改判据） |
| `localstorage-key-guard` | **L4** 全仓键必须落四类（unknown 即红）· **L5** registry 无僵尸登记 · **L6** visual 白名单 · **L7** 读缓存必带 `_versions` ＋ `savedAt` · **L8** auth 键不承载业务 · **L9** 故障注入 · **L10** 读口拒收缺版本 / 过期备份 | 3 | 10 | **+7** |
| `seed-baseline` | 空库基线扩到种子契约口径（与 `seed-contract-guard` 同源，避免「基线空库」与「种子形状」两套真相） | 3 | 6 | **+3** |
| `data-lifecycle-guard` | 迁移 / 生命周期用例随 v12 增补（`todos.branch_id` 生成列、`issue_reveals` 删除后的读口） | 14 | 15 | **+1** |
| `db-integrity-guard` | 本批未改（表结构 / 版本仍 5 条；v12 的唯一索引与生成列由 `seed-contract-guard::C3/C4` 从数据面核） | 5 | 5 | 0 |

- **件数**：70 → **74**；断言数 462 → **501**。
- **故障注入（人工，不入仓）**：删掉 api 闸门恢复 `return [...ACTIVITIES]` ⇒ `write-truth::A1` 红；让 flush 对 `agendaVotes` 直接 resolve ⇒ `B2` 红；给 `todos` 手写 `branch_id` ⇒ `seed-contract::C3` 红；重复插入同 `(activityId, personId)` 考勤 ⇒ `C4` 红；测试直连 `server/data.db` ⇒ `test-isolation::I3` 红；把某个 mock 活动日期改到 2026-07 ⇒ `demo-window::W2` 红；把组名改回 `neutral-500` ⇒ `ui-contrast::K3` 红。
- **不并入**：`seed-contract-guard` 与 `db-integrity-guard` 虽同看表结构，但前者判「种子形状 / 契约」，后者判「表结构 / 版本对齐」，失败根因不同，登记为后续评估项而非本批强并。

## 十一、批次 514 扩展记录（2026-10-27 · 新增 3 件 guard 文件）

> 件数 **74 → 77**；断言数 **501 → 526**（新增 15 条 ＋ 扩展 6 条 ＋ 校准 4 条历史静态差）。
> 计数口径同 §一（静态 `test(` / `it(` / `t.test(` 调用点；与 `test-tier-registry::countTestCases` 同口径）。
> 覆盖文件数同 §一（源码 / 文档路径字面量去重，粗估）。

| 守卫 | 检查对象 | 断言数 | 覆盖文件数 | 非空转证据（实读） |
|---|---|---:|---:|---|
| `no-underline-guard.test.mjs`（新） | 全站文本下划线清零 / PENDING 台账 / 只降不升 | 4 | 1 | N1 扫描面 ≥250 个前端源（DOCS 下 `.js/.mjs/.css/.html`）；N2 全站下划线 **0 处**（上限 0）；N3 PENDING 台账为空且无「未登记仍有下划线」文件；N4 只降不升；正负例覆盖 `hover:underline` / `text-decoration` / `underline-offset` / 注释与 `underlined` 误判 |
| `loading-experience-guard.test.mjs`（新） | 页签骨架 / 120ms 延迟 / 180ms 淡入 / ≤1s / 跳转进度条 / reduced-motion | 6 | 3 | L1–L7 判据全集 + 骨架形状（3 条卡形 ＋「正在加载…」＋ `data-ws-tab-loading-bar` ＋ `role=status`）；快速渲染不闪骨架、慢渲染 120ms 后铺骨架并淡入；故障注入（删骨架 / 延迟归零 / 恢复 `opacity=0.45` ＋ 插行 / 删 reduced-motion）逐条判红；跳转进度条幂等 |
| `no-about-route-guard.test.mjs`（新） | About 撤路由（HTML / JS / MD 零入口 ＋ 文件保留） | 5 | 4 | A1 扫描 **26** 个 HTML、残留 **0**；A2 扫描 **312** 个 JS、残留 **0**；A3 扫描 **2** 个 Markdown、残留 **0**；A4 `docs/about.html` 仍存在且非空；A5 正负样本 + 规模下限（HTML 15 / JS 180 / MD 2） |

| 既有守卫 / 检查 | 本批扩展 / 改准 | `HEAD` test 数 | 现行 test 数 | 本批 +test |
|---|---|---:|---:|---:|
| `ui-contrast-guard` | **K3** 判据改准：组名改为「12px / 10% 淡底 / **无边框** / 主题 soft-text 亮暗 ≥4.5:1 / 3px / ≥24px / ≤1280 只缩不隐藏」· **K6** 新增逾期文字档（`--status-warning-text` 亮 7.09:1 / 暗 11.68:1，warning 只作填充） | 5 | 6 | **+1** |
| `theme-palette-guard` | **T10** 新增功能色分离：亮 / 暗齐备、功能红 / 金与 danger / warning / 主题 accent 逐值不同、文字 ≥4.5:1 | 14 | 15 | **+1** |
| `page-title-guard` | **P4** 工作台静态壳不再输出 `<h2>` / `.page-frame__title`，唯一 H2 由 `renderTabHeader` 提供 · **P5** 活动 / 专班详情 H3/H4 顺序合法、原始 ID 移出正文 · **P6** 党委台卡头不复述页签名 | 4 | 7 | **+3** |
| `ui-control-system-guard` | **V2** 胶囊判据改为「无 `display:none` 断点、≥24px、3px、**无边框 ＋ 10% 淡底**」· **V5** 纯文字动作改为「600 字重 ＋ 尾随箭头非 `neutral-400`」（下划线由 SD-49 清零） | 25 | 25 | 0（既有 test 内改判据） |
| `link-color-guard` | **L3** `.link` 改为「`--color-link`、**无下划线**、600 字重 ＋ 淡底 hover」· **L6** 帮助链接同口径 | 8 | 8 | 0（既有 test 内改判据） |
| `responsive-cards-guard` | **C7** 日历折叠卡 40×40 摘要槽只留 chevron ＋ `aria-label`，不塞整句 | 7 | 8 | **+1** |
| `ui-tab-overflow`（非 guard 命名件） | **T5** 键盘起点：激活页签只改 `scrollLeft`，不用元素级滚动 · **T6** 页签条分层（组名行 / 页签行）· **T7** 分层样式（1440 放开、组名不隐藏） | 4 | 7 | **+3**（计入 daily 预算，不计入本表件数 / 断言） |
| `ui-motion-guard` | 本批复核，无新增断言（加载动效由 `loading-experience-guard` 判；过渡时长仍按 SD-30 白名单） | 3 | 3 | 0 |
| `test-tier-guard` | 预算登记：`DAILY_FILE_BUDGET` 234 → **237**、`DAILY_TEST_BUDGET` 1603 → **1631**（新增 3 件 ＋ 扩展 6 条）；静态断言实读 8 条（历史表记 6，属此前未校准，非本批新增） | 8 | 8 | 0（校准） |
| `doc-consistency` | 本批复核，未改判据；静态实读 23 条（历史表记 21，属此前未校准） | 23 | 23 | 0（校准） |

- **件数**：74 → **77**；断言数 501 → **526**。
- **非空转（本批实读）**：`no-underline` 全站下划线 **0 处**；`no-about-route` 扫描 HTML **26** / JS **312** / MD **2**，三类残留均 **0**；`loading-experience` 读取 `tab-bar.js`（>5KB）与 `tab-loading.css`（>500B），骨架恰 3 条卡形行。
- **故障注入（人工 / 机检，不入仓）**：`docs/help.html` 加回 `<a href="./about.html">关于</a>` ⇒ A1 红；`sidebar.js` 加回 `{ module: 'about' }` ⇒ A2 红；删 `docs/about.html` ⇒ A4 红；任一处恢复 `text-decoration: underline` ⇒ N2 / N4 红；把延迟改 0 / 恢复 `opacity='0.45'` ＋ 插加载行 / 删 reduced-motion 分支 ⇒ `loading-experience` 逐条红；组名加回 `border` 或改 `neutral-500` ⇒ `ui-contrast::K3` / `ui-control::V2` 红。
- **不并入**：`no-underline-guard` 与 `link-color-guard` 同看链接，但前者判「文本装饰计数归零（全站）」，后者判「链接色单一源与语义」，失败根因不同；`loading-experience` 与 `ui-motion` 同看动效，但前者判加载编排与禁令、后者判卡片悬停 / 过渡属性，登记为后续评估项。

