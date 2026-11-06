---
title: "页签审计手册——45 页签五维检查怎么跑、怎么判、怎么加"
type: guide
role: "[工程师]+[AI]"
last_updated: "2026-11-03"
status: active
related_files: [../04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md, REVIEW_QUESTION_SET.md, ../../server/scripts/audit/catalog.mjs, ../../server/scripts/audit/endpoint-map.mjs, ../../.ctx/evidence/2026-11-02/tab-audit/summary-final.md]
---

# 页签审计手册

> **回答什么问题**：45 个页签的五维审计资产是什么、一条命令怎么跑、每一维怎么判、出现例外怎么记；新增页签或新增检查时，哪些表要同批补齐。
> **不回答什么**：布局与密度的规范条文 → [DS_06_LAYOUT_AND_DENSITY.md](../04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md)；审查问题集的五步法 → [REVIEW_QUESTION_SET.md](REVIEW_QUESTION_SET.md) Q-22；某一次全量报告的逐条证据 → `.ctx/evidence/2026-11-02/tab-audit/summary-final.md`。
> **谁什么时候读**：[工程师]+[AI]；改页签、合并区块、改筛选条、改读口 / 写口之前，以及每次发布前的全量审计之前读。
> **口径以 [AUDIT_CANON.md](AUDIT_CANON.md) 为准**：F2 / F4 / F7-D2 / C1 / F1 的唯一判据，以及 daily / precommit / audit 的分工都记在那里；本手册负责「怎么跑」。

## 〇、何时用

| 场景 | 先做什么 | 判据 |
|---|---|---|
| **新增页签** | 先补能力注册表与 `TAB_BLOCK_BASELINE`，再补 `catalog.mjs` / `endpoint-map.mjs`，最后跑全量 | `workbench-audit-coverage::W1–W5` 全绿；新页签 F1–F8 无 `fail` |
| **改页签结构**（合并块 / 改筛选条 / 改标题层级） | 先跑 `--tab <key>` 留基线，再改，再跑同一条 | 该页签对应规则由原读数变为 `pass` 或 `exception` |
| **发布前** | 全量 `--all` 落 `summary.md` / `findings.json` | **P0 = 0 且 P1 = 0**；P2 全部登记；exception 全部有理由 |
| **专项审计**（密度 / 空态 / CRUD / 性能） | 用 `--only F`、`--only D,C` 等维度过滤，或 `--tab` 逐页签跑 | 只对本次维度负责，未跑维度写「未测」，不当通过 |

## 一、资产是什么

审计资产是「脚本 + 目录表 + 报告」三件：

| 层 | 文件 | 作用 |
|---|---|---|
| 编排 | `server/scripts/audit-tabs.mjs` | 解析参数、起服务、登录、逐页签跑检查、汇总落盘 |
| 目录 | `server/scripts/audit/catalog.mjs` | 45 页签的唯一清单；页签与源码入口从 `docs/src/capabilities/*-workspace.js` 解析，块数从 `server/test/style-baseline.mjs::TAB_BLOCK_BASELINE` 读取 |
| 映射 | `server/scripts/audit/endpoint-map.mjs` | 每个页签的读口、写口、权限门、计数对账规则、破坏性流程与理由 |
| 判级 | `server/scripts/audit/severity.mjs` | 规则 → P0 / P1 / P2 的单一判定表 |
| 检查 | `audit/checks-front.mjs`（F1–F8）、`checks-data.mjs`（D1–D4）、`checks-crud.mjs`（C1–C4）、`checks-economy.mjs`（E1–E2、M1–M3） | 五个维度的实际检查 |
| 报告 | `audit/report.mjs` | JSON 评分卡 + Markdown 分组报告 + 截图路径 |
| 基线 | `audit/perf-baseline.mjs` | 读口 p50 / p95 / bytes 预算，首轮按实测生成、之后只收紧 |

一条命令即可跑完一个页签或全部 45 个页签。默认自起 `:memory:` 临时库（`createApp({ dbPath: ':memory:' })` ＋ `seedDatabase` ＋ 随机端口 ＋ Playwright Chromium），结束时关闭，不污染 `server/data.db`。用 `--base <url>` 复用已起的服务时，C2（CRUD）自动降级为 `skip`，原因写作 `shared-db`，不在共享演示库做写入。

审计脚本不进 `test:daily`；日常守卫是 `server/test/workbench-audit-coverage.test.mjs`（W1–W5）。

## 二、五维检查表

### 2.1 检查项与判据

| 维度 | 检查项 | 判据（摘要） | 规范编号 | 守卫 / 脚本 | 级别 |
|---|---|---|---|---|---|
| F 前端 | F1 顶层块数 | 页头之外的直接可见内容块 ≤4；>4 且 `TAB_BLOCK_BASELINE` 有非空 `reason` ⇒ exception；`reason` 为空 ⇒ P1 | SD-57 | `ui-first-screen-order::F6–F9` ＋ `audit-tabs::F1` | P1 |
| F 前端 | F2 筛选条 | `.lf-bar` 的控件行数 ≤2（按控件 top ±4px 聚簇，不按固定像素）；非 `column`；`reset` 不占整行 | SD-58 | `filter-row::S14–S15` ＋ `audit-tabs::F2` | P1 |
| F 前端 | F3 输入装饰 | `input[list]` / `<datalist>` 计数为 0；建议输入带 `role="combobox"` 与配套 ARIA | SD-59 | `field-shell-guard::R4–R5` ＋ `audit-tabs::F3` | P1 |
| F 前端 | F4 标题层级 | 可见 H1 = 0、H2 恰好 1；H3 前有 H2、H4 前有 H3，跳级即问题 | 非 SD：标题层级 | `page-title-guard::P4–P6` ＋ `audit-tabs::F4` | P1 |
| F 前端 | F5 `section` 语义 | 每个 `section` 有可访问名称（`aria-label` 或指向存在 id 的 `aria-labelledby`）；同页不嵌套 | SD-55 / SD-41 | `a11y-tree::A10` ＋ `audit-tabs::F5` | P1 |
| F 前端 | F6 空态 | 可见「暂无 / 没有」文本不在 `.empty-state` 内 ⇒ P2，待人工确认 | 非 SD：空态 | `copy-guard::E1–E2` ＋ `audit-tabs::F6` | P2 |
| F 前端 | F7 窄屏与分页 | 390 无横向溢出；长列表遵守分页门槛（行数 >10 有分页承载） | 非 SD：响应式 | `page-sweep` ＋ `audit-tabs::F7` | P1 |
| F 前端 | F8 稳定性 | 打开页签期间 pageerror / `/api/v1/` 4xx ⇒ P0；仅 `console.error` ⇒ P1 | 非 SD：稳定性 | `module-load::E4` ＋ `audit-tabs::F8` | P0 / P1 |
| D 数据 | D1 读口 | 每个 `read` 端点 2xx、JSON 可解析、响应 ≤500KB，并记录耗时 | 非 SD：数据 | `records-endpoints` ＋ `audit-tabs::D1` | P1 |
| D 数据 | D2 计数对账 | 目录声明 `count` 的页签，UI 计数与接口数组长度一致（容差 0） | 非 SD：数据 | `audit-tabs::D2` | P0 |
| D 数据 | D3 首屏 4xx | 首屏 `init()` 的 `/api/v1/` 4xx 为 0 | 非 SD：数据 | `module-load::E4` ＋ `audit-tabs::D3` | P1 |
| D 数据 | D4 绝对上限 | 单接口 p95 >100ms 或响应 >500KB ⇒ P2 | 非 SD：性能 | `audit/perf-baseline.mjs` ＋ `audit-tabs::D4` | P2 |
| C CRUD | C1 读写权限 | 本角色读口 2xx；每个写口必须在 `server/security/write-policy-matrix.mjs` 登记（未登记 ⇒ P0）；`known-risk` ⇒ exception 并回链 `riskRef`；`enforced` / `self-service` / `public` ⇒ pass。默认不逐口重探，`--probe-writes` 才跑 visitor 越权探针 | 非 SD：权限 / CRUD | `write-policy-matrix` 守卫 ＋ `permission-gate` ＋ `r3-data-permission-regression` ＋ `audit-tabs::C1` | P0（未登记）/ P1 |
| C CRUD | C2 写往返 | 非破坏性写口在 `:memory:` 库执行 create → 回读 → PATCH → 校验 → DELETE；无配方 ⇒ `skip` 并写原因 | 非 SD：CRUD | `audit-tabs::C2`（临时内存库） | P0 |
| C CRUD | C3 死入口 | 页面写动作能映射到 `write.flow`；映射不到 ⇒ P0 | 非 SD：CRUD | `dead-selector-guard` ＋ `audit-tabs::C3` | P0 |
| C CRUD | C4 写门 | 每个写口有 `gate`，且能在 `gates.js` / `semantic-routes.js` / 路由源码中定位 | 非 SD：CRUD / 权限 | `permission-gate` ＋ `audit-tabs::C4` | P1 |
| E 运算 | E1 性能预算 | 同一读口跑 5 次取 p95 / bytes；p95 > max(预算×1.2, 50ms) 或 bytes > max(预算×1.2, 500KB) ⇒ P2 | 非 SD：性能 | `audit/perf-baseline.mjs` ＋ `audit-tabs::E1` | P2 |
| E 运算 | E2 摘要 | 报告附「最慢 5 个接口」与「最大 5 个响应体」 | 非 SD：性能 | `audit-tabs::E2` | P2 |
| M 信息经济 | M1 超限理由 | >4 块页签：`TAB_BLOCK_BASELINE` 有非空 `reason` ⇒ exception；无理由 ⇒ P1（每页一条汇总） | SD-57 | `TAB_BLOCK_BASELINE` ＋ `audit-tabs::M1` | P1 |
| M 信息经济 | M2 重复卡头 | 同页两个及以上相同 H3 ⇒ P1 | SD-57 | `page-title-guard` ＋ `audit-tabs::M2` | P1 |
| M 信息经济 | M3 多条筛选条 | 同页 `.lf-bar` 数量 >1 ⇒ P1（先合并再谈行数） | SD-58 | `filter-row` ＋ `audit-tabs::M3` | P1 |

### 2.2 P0 / P1 / P2 的定义

| 级别 | 判定 | 处理 |
|---|---|---|
| **P0** | 页签打不开 / 白屏；pageerror；可见动作必然失败（死入口、403）；数据对不上；CRUD 主流程断 | 本轮修，修完用 `--tab` 重跑 |
| **P1** | 违反已立规范：>4 块无理由、筛选条 >2 行、`datalist` 残留、标题跳级、`section` 无名、重复卡头、多条筛选条、CRUD 映射缺项、权限门缺失 | 本轮修，每项附守卫或基线更新 |
| **P2** | 性能超预算、空态启发式疑似、文案 / 间距 / 可读性建议 | 只进报告，下批处理 |

### 2.3 例外口径

- **F1 以基线登记为准。** `TAB_BLOCK_BASELINE` 里有非空 `reason` 的 >4 块页签记 `exception`；DOM measured 只作复核线索，不因 measured ≠ baseline 判红（同构列表卡会因条件块显隐而变数）。
- **C2 破坏性流程不真删。** 解散 / 归档 / 删除活动等只在本次探针行上做软回滚，或仅做静态写门证明；报告记 `exception` ＋ `reason`。
- **C1 已知风险以矩阵为准。** 写口判据查 `server/security/write-policy-matrix.mjs`：只有矩阵行 `status=known-risk` 才记 `exception` 并回链其 `reason` / `impact` / `riskRef`（现行编号 `.ctx/ENGINEERING_ASSESSMENT.md` 阻断风险 2）；`enforced` / `self-service` / `public` 记 pass。矩阵未登记写口一律 P0，不再按中间件字符串猜门。
- 全量报告口径为 **P0 0 / P1 0 / P2 4 / exception 29**；29 条例外＝F1 14（>4 块已登记理由）、C2 12（破坏性流程不真删）、C1（矩阵登记为 known-risk 的页签写口）。C1 的具体条数随矩阵行变化，报告以矩阵 `status` 为准。

## 三、怎么跑

```powershell
cd server

# 1) 全量 45 页签，落 JSON + Markdown（截图同目录 shots/）
node scripts/audit-tabs.mjs --all --md ../.ctx/evidence/2026-11-02/tab-audit/summary.md --json ../.ctx/evidence/2026-11-02/tab-audit/findings.json

# 2) 单页签回归（修完一项后先跑这一条）
node scripts/audit-tabs.mjs --tab secretary.group-progress

# 3) 复用已起服务，只跑前端维度（不写库）
node scripts/audit-tabs.mjs --base http://localhost:3000 --tab org.taskforce --only F
```

- 参数：`--tab <role.tab>` 可重复，与 `--all` 互斥；`--only F,D,C,E,M` 过滤维度；`--headed` 显示浏览器；`--timeout <ms>` 覆盖单页超时；`--probe-writes` 额外跑 C1 运行期越权探针（默认只查权限矩阵，不逐口重探）。
- 产物：`findings.json`（逐页签逐检查）、`summary.md`（评分卡 ＋ P0/P1/P2 分组 ＋ 例外清单）、`shots/<key>.1440.png` 与 `shots/<key>.390.png`。
- **单页签回归**：修完一项跑 `--tab <key>`，该页签对应规则应为 `pass` 或 `exception`；若仍为 `fail`，看 `evidence` 里的选择器、计数或接口读数。
- `skip` 表示「无法可靠测量」，不是通过；报告单列跳过项，避免假绿。

## 四、怎么加检查 / 加页签

- **加检查**：在对应 `checks-*.mjs` 里产出 `{ key, rule, severity, status, message, evidence }`；新规则编号同批登记到 `severity.mjs` 的 `RULE_SEVERITY`（未登记默认 P2）。若该检查对应已立规范，规范编号仍回 `DS_06` / `DS_03` 等篇目，本手册只记工具口径。
- **加页签**：能力注册表（`docs/src/capabilities/*-workspace.js`）与 `TAB_BLOCK_BASELINE` 同批登记，`catalog.mjs` 自动跟随；`endpoint-map.mjs` 同批补 `read` / `write`（含 `gate`）/ `count` / `destructive`（含 `reason`）。缺这些项时 `workbench-audit-coverage` 的 W2/W3 判红。
- **守卫 W1–W5**（`server/test/workbench-audit-coverage.test.mjs`）：
  - W1 catalog 45 项，键集合 ≡ `TAB_BLOCK_BASELINE`；
  - W2 每个页签有真实源码入口；
  - W3 每个页签至少 1 个读口，写口有 `gate`，`destructive` 有 `reason`；
  - W4 反例：缺页签 / 空 `source` / 写口无 `gate` 必须判红；
  - W5 旧 67 页签台账只作归档存在，不再作为现行口径。
- 验证：`cd server; node --test test/workbench-audit-coverage.test.mjs`；改到 catalog 或 endpoint-map 时同跑 `test/test-tier-guard.test.mjs`。

## 五、规则冲突裁决

1. **已登记例外不算违规。** F1 只复核 `reason` 是否仍成立，不因块数 >4 直接判 P1；理由过期才升级。
2. **写口判据以权限矩阵为准。** C1 先查 `server/security/write-policy-matrix.mjs`：未登记 ⇒ P0；`known-risk` ⇒ `exception` 并回链 `riskRef`；`enforced` / `self-service` / `public` ⇒ pass。默认不逐口重探，只有 `--probe-writes` 才补运行期实证；不再以「中间件 === requireAuth」推断写门。
3. **破坏性流程不真删。** 不做真实删除，记 `exception` ＋ `reason`；需要真实往返时补 `CRUD_RECIPES` 的最小合法请求体，而不是放宽判据。
4. **F1 以 `TAB_BLOCK_BASELINE` 为准。** DOM measured 只用于复核，不参与红绿判定。
5. **F8 分级。** pageerror / `/api/v1/` 4xx 判 P0；仅 `console.error` 判 P1。
6. **E1 门槛。** p95 > max(预算×1.2, 50ms) 或 bytes > max(预算×1.2, 500KB) 才报 P2；预算缺失时按实测生成内存预算，不写回源码。

## 六、报告字段说明

**`findings.json`**：

```text
{
  generatedAt, base, dbMode,
  tabs: [{ key, label, blocks, findings: [{ key, rule, severity, status, message, evidence }] }],
  summary: { P0, P1, P2, exceptions }
}
```

- `status`：`pass` / `fail` / `exception` / `skip`。
- `summary` 只统计 `fail`；`exception` 单列；`skip` 不进任何计数。
- `evidence` 保存选择器、控件行数、接口耗时与字节、探针 id 等可复核读数，不写 token / cookie / 口令。

**`summary.md`**：页签评分卡（F1–F8、D1–D3、C1–C4、E1、M1–M3）＋ P0 / P1 / P2 分组 ＋ 例外登记表 ＋ 跳过项表 ＋ `>4 块` 例外清单（基线块数 / 理由 / 本次实测）。

**`shots/`**：`<key>.1440.png` 与 `<key>.390.png`，只作人工复核线索，不参与判定。

### 6.1 判读口径

- **P0 / P1 必须清零。** 发布前只认 `summary.P0 === 0 && summary.P1 === 0`；有任一条即不得发布，修完用 `--tab` 重跑该页签。
- **P2 登记，不当通过。** P2 写入报告与下批台账；不得用「P2 不阻断」把已发现的性能 / 空态问题留成口头结论。
- **exception 必须写理由。** 例外只认 `TAB_BLOCK_BASELINE` 的非空 `reason`、`endpoint-map` 的 `destructive.reason` 或 C1 的系统性风险回链；理由缺失即按 P1 处理。
- **skip 不是 pass。** `status: skip` 表示无法可靠测量（如共享库自动降级、无 CRUD 配方），报告单列，不进入任何通过计数。

## 七、与既有资产的关系

| 资产 | 覆盖什么 | 与页签审计的分工 |
|---|---|---|
| `page-sweep` | 分页、控件档位 40/36px、数据格 13px、390 窄屏、深链与切换竞态 | 真机全站普查；审计复用其登录与遍历口径，只补「块数 / 筛选行 / 标题层级 / section / 空态」等页签级判据 |
| `module-load` | 页签模块能否加载、首屏 `/api/v1/` 4xx 归零 | 审计的 F8 / D3 与其同口径，不重复导航 45 次 |
| `a11y-tree` | `section` 可访问名称、标题层级、ARIA 语义 | 审计 F4 / F5 与其同向；合成 DOM 反例由 `a11y-tree` 自检 |
| `ui-first-screen-order` / `filter-row` / `field-shell-guard` | SD-57 / SD-58 / SD-59 的静态与真机守卫 | 审计是「按页签跑一遍」的运行时复核，规范判据仍在 DS_06 |
| `REVIEW_QUESTION_SET.md` Q-22 | 页签密度与信息经济的五步审查法 | Q-22 管「人怎么审」，本手册管「工具怎么跑」 |
| `workbench-audit-coverage` | catalog 完整性（W1–W5） | 审计资产自身的守卫，不进 `test:daily` 的审计脚本 |

## 八、反模式

1. **把测量 bug 当页面缺陷。** F1 的 DOM measured 会因条件块显隐变化；判定以 `TAB_BLOCK_BASELINE` 为准，先复核选择器与计数口径，再报页面问题。
2. **为变绿放宽权限。** 写口 403 是权限门的证明，不得改成 `requireAuth`、删 `RESOURCE_WRITE_GATE` 或换高权限账号来「跑通」。
3. **把破坏性 CRUD 真删到演示库。** 解散 / 归档 / 删除活动只在 `:memory:` 或本次探针行上做软回滚；`--base` 连共享库时 C2 自动 `skip`，不得手动绕过。
4. **只加检查不补反例。** 新检查必须同批给「构造一个应判红的样本」；没有反例的检查无法证明自己不是恒绿。
5. **把工具存在当工程进步。** 审计资产只提高可发现性；评分与结论必须有页面、数据或测试读数的实际变化支撑。
