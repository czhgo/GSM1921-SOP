---
title: "审计口径唯一表——四口径裁定与档位分工"
type: guide
role: "[工程师]+[AI]"
last_updated: 2026-11-02
status: active
related_files: [TAB_AUDIT_PLAYBOOK.md, ../04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md, ../04_web_design/design-system/DS_03_COMPONENTS.md, ../../server/scripts/audit/checks-front.mjs, ../../server/scripts/audit/checks-data.mjs, ../../server/scripts/audit/checks-economy.mjs, ../../server/scripts/audit/dom-probe.mjs, ../../.ctx/ENGINEERING_ASSESSMENT.md]
---

# 审计口径唯一表

> **回答什么问题**：同一条审计判据在多个脚本 / 守卫里写法不一致时，以哪一处为准；daily、precommit、audit 三个档位各负责哪些断言。
> **不回答什么**：设计规范条文 → [DS_06_LAYOUT_AND_DENSITY.md](../04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md)；审计怎么跑、怎么加检查 → [TAB_AUDIT_PLAYBOOK.md](TAB_AUDIT_PLAYBOOK.md)；某次全量报告读数 → `.ctx/evidence/**`。
> **谁什么时候读**：[工程师]+[AI]；改审计脚本、改守卫判据、或发现两处读数冲突时先读本表。

## 一、四口径裁定

本表是**工具判定口径**（怎么读、怎么判、哪一处实现），不是设计规范本身。规范条文仍以 DS_06 / DS_03 与 `content/02_institution` 为准。

| 口径 | 唯一判据 | 唯一实现 | 裁定要点 |
|---|---|---|---|
| **F2 筛选条** | 只认「控件行数 ≤2」＋ 非 `column` ＋ reset 不整行 | `server/scripts/audit/dom-probe.mjs::collectDom`（行簇计数）＋ `filter-row::S14` | 88 / 96px 高度只作 evidence，不作阈值；容器上下 padding 不计入行数 |
| **F4 页题** | 可见 H2 **恰 1**；H1 = 0；H3 / H4 不跳级 | `checks-front.mjs::F4`；`page-sweep.test.mjs` 的 H2 探针改走 `dom-probe.mjs::h2Summary` | 工作台页题单一源，不允许多个 H2 并列或只写 H3 |
| **F7 / D2 分页** | `hasPager(root)` = `.lf-pager [data-lf-page]` **或** `.page-btn` | `server/scripts/audit/dom-probe.mjs::hasPager` | checks-front F7、checks-data D2、page-sweep P1/P3/P11 共用同一函数，不再各写选择器 |
| **C1 越权** | `requireAuth` 通用写口返回 2xx ⇒ `exception`，回链 `.ctx/ENGINEERING_ASSESSMENT.md` 阻断风险 2 | `checks-crud.mjs::C1`（`knownGap: 'requireAuth-only'`） | 审计只报页签视角；权限件判「门是否变宽」——见下表分工 |
| **F1 顶层块** | `TAB_BLOCK_BASELINE` 登记为准；>4 且 `reason` 非空 ⇒ `exception`，空 ⇒ P1 | `checks-front.mjs::F1`；基线 `server/test/style-baseline.mjs::TAB_BLOCK_BASELINE`（上限 `TAB_BLOCK_LIMIT`） | DOM measured 仅 evidence 与人工复核线索，不因 measured ≠ baseline 判红（同构列表卡会变数） |

### 1.1 C1 与权限件的分工

| 件 | 判断什么 | 不判断什么 |
|---|---|---|
| `server/scripts/audit/checks-crud.mjs::C1` | 当前页签视角：本角色读口是否 2xx；visitor 对写口是否被身份层挡住 | 不追溯 `requireRole` 是否被降级、不判断写门是否变宽 |
| `permission-gate` / `r3-data-permission-regression` / `roles-sync` | 写门是否变宽、角色授权集合是否一致、`requireRole` 是否被降成 `requireAuth` | 不逐页签复跑 45 个页签的 UI 视角 |

**结论**：`requireAuth` 2xx 不在 audit 里重复判 P0；它作为系统性阻断风险登记在 `ENGINEERING_ASSESSMENT`，audit 只保留 `exception` 实证条目。

## 二、档位职责

| 档位 | 负责什么（保留哪些棘轮） | 不负责什么 | 入口 |
|---|---|---|---|
| **daily** | 静态守卫与真机棘轮：`ui-first-screen-order::F6–F9`（块数基线）、`filter-row::S14`（结构）＋ `S15`（真机证据读数）、`field-shell-guard::R4–R5`、`workbench-audit-coverage::W1–W5`（catalog 完整性）、`page-sweep`（分页 / H2 / 尺规真机普查） | 不跑 45 页签的五维全量审计；不因审计口径调整而删断言 | `cd server; npm run test:daily` |
| **precommit** | 真机与跨面回归：`records-endpoints`、`page-sweep` 等含 Playwright 的用例 | 不承担 daily 的秒级预算；不替代 audit 的报告层 | `cd server; npm run test:precommit`（或 `test:full`） |
| **audit** | 只做**报告层**：F1–F8 / D1–D4 / C1–C4 / E1–E2 / M1–M3 逐页签评分卡与证据 | 不作为门禁、不替代 daily / precommit；`--base` 连共享库时写维度自动降级 | `cd server; node scripts/audit-tabs.mjs --tab <key>` |

> `audit` 的口径变化只改本表与对应 helper / 常量，**不删 daily 断言**；daily 的棘轮与 audit 的报告结论冲突时，以本表的唯一实现为准复核，而不是放宽任一侧。

## 三、实现落点速查

| 能力 | 文件 |
|---|---|
| 账号 / 登录 / 起 `:memory:` 服务 / 开页签 / 截图 | `server/scripts/audit/harness.mjs` |
| DOM 采集 / 分页判据 / H2 摘要 | `server/scripts/audit/dom-probe.mjs` |
| 块数上限 `TAB_BLOCK_LIMIT` / 基线 `TAB_BLOCK_BASELINE` | `server/test/style-baseline.mjs` |
| 检索条出现门槛 `SEARCH_FILTER_MIN_ROWS` | `docs/src/core/domain/constants.js` |
| 严重度 `M1`–`M3` 登记 | `server/scripts/audit/severity.mjs` |
