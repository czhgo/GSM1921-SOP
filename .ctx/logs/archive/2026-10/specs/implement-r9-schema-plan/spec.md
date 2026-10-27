# 第九轮 Schema 方案实施 Spec

## Why

第九轮只诊断未实施的三项结构方案，现在阻塞了真实能力：Todo 缺 `branchId` 让 P13 的支部读过滤无法下推；五张热表只有整行 JSON、没有可下推列与索引；宽表一旦出现按子项查询或并发改同一行，整行 JSON 写穿会成为瓶颈。支书裁定：**三项一起做**；拆表建表＋回填＋影子比对，但**不切权威源**，并把「何时可切」写成可执行的判据，防止遗忘。

## What Changes

- **v11 迁移（一次版本，三组 DDL）**
  - `todos` 增 `branch_id TEXT`，事务内回填，建 `idx_todos_branch`。
  - 五张热表（`attendances / inspections / todos / notices / activities`）增 **generated stored 列**（`branch_id`，按需 `status / person_id / activity_id / updated_at`），并建复合索引。
  - 新建影子子表 `agenda_items`、`taskforce_contributions`，回填现有 JSON；**读写仍走 JSON**，子表只做双写与比对。
- **Todo 归属 fail-closed（BREAKING）**
  - 新写口（`POST/PATCH /todos`、快照新增行、mock 同口径）解析不出支部 ⇒ `400`「待办须能归属到支部」。
  - 读口对 `todos` 删除 `DEFAULT_BRANCH` 兜底；`null` 行仅本人或同角色可见**一个兼容周期**，并置 `branchLegacy:true`。
  - 兼容周期结束后（下一次 `SCHEMA_VERSION` 升级或 2026-12-31，先到者为准）`null` 行对所有支部账号不可见。
- **服务端可选分页（向后兼容）**
  - `GET /<resource>` 支持 `?page=&pageSize=&cursor=&branchId=&status=`；**无 `page` 参数时仍整表返回**。
  - 深分页用 `(updated_at, id)` 游标，不用 `OFFSET`；首批只在 `todos / attendances` 的列表读口切换。
- **影子切表判据（必须可执行，不许只写在文档里）**
  - 新增 `server/scripts/schema-split-readiness.mjs`：输出 5 个布尔判据与建议（`READY / NOT_READY`）。
  - 新增 `CLAUDE.md` 乙部 `B-504-1`：登记判据原文与「全真才可切权威源」。
- **回滚**
  - v11 提供 `down()`：删索引与生成列、删影子表、保留 `todos.branch_id` 数据不丢（列可留）；回滚脚本先在临时库演练。

## Impact

- 受影响能力：Todo 归属、支部读过滤（P13）、列表读口性能、活动议程与专班贡献的存储形态。
- 受影响代码：`server/db.js`（迁移与版本）、`server/routes/resources/{index,store,branch-scope,workgroup-routes}.js`、`server/seed*.js`、`docs/src/data/{mock-adapter,api-adapter,data-adapter,seed-manifest}.js`、`docs/src/services/governance/todo.js`、`content/04_web_design/data/DATA_MODEL.md`、`.ctx/SNAPSHOT.md`。
- **不改**：快照仍整表写穿；JSON 表仍是权威源；不做历史行清理（保留期待裁）。

## ADDED Requirements

### Requirement: Todo 行必须能归属支部
系统 SHALL 在写入时解析并落 `branchId`；解析不出时拒绝写入并给出可懂原因。

#### Scenario: 新待办无归属
- **WHEN** 任意角色经 `POST /todos` 或快照新增一条既无父行也无所属人的待办
- **THEN** 返回 `400`，文案点名「待办须能归属到支部」，且不落行

#### Scenario: 兼容期旧行
- **WHEN** 存量待办 `branchId` 为 `NULL` 且请求者为同一 `personId` 或同角色
- **THEN** 该行可见并带 `branchLegacy:true`；其他支部账号不可见

### Requirement: 热表可下推列与索引
系统 SHALL 为五张热表提供 generated stored 列与复合索引，并保证查询结果与整表扫描一致。

#### Scenario: 索引等价
- **WHEN** 对同一集合分别执行「带 `branchId/status` 的 SQL 过滤」与「整表读 + JS 过滤」
- **THEN** 两侧行集与顺序完全一致（`perf-index-equivalence` 断言）

### Requirement: 影子子表与切表判据
系统 SHALL 建表并回填子表、双写、逐行比对，但在判据全真前不得把权威源切到子表。

#### Scenario: 影子一致
- **WHEN** 任一活动议程或专班贡献发生写操作
- **THEN** JSON 行与子表在同一事务内一致；比对脚本报告 `mismatch=0`

#### Scenario: 判据未满足
- **WHEN** 运行 `schema-split-readiness.mjs` 且任一判据为 false
- **THEN** 输出 `NOT_READY` 并列出未满足项；不得切换读写

## MODIFIED Requirements

### Requirement: 列表读口
`GET /<resource>` SHALL 在带 `page` 参数时返回 `{ rows, total, nextCursor }`；不带时保持原整表数组响应（一个版本周期）。

### Requirement: 支部读过滤
`resourceBranchId('todos')` SHALL 不再回落 `DEFAULT_BRANCH`；其余集合本轮不改兜底（登记在 R10-D14）。

## REMOVED Requirements

### Requirement: Todo 读口默认支部兜底
**Reason**：`br-b1` 兜底会把无归属待办静默归到缺省支部，多支部形态下造成错归属与越权可见。
**Migration**：v11 回填能解析的行；解析不出的行保留 `NULL`，按兼容期规则可见，到期隐藏。

## 切表判据（写入 CLAUDE 乙部 B-504-1，禁止只留在本文件）

切换权威源必须**同时**满足：

1. **规模触发（任一）**：`MAX(LENGTH(data)) > 256KB`，或 p95 `> 32KB`，或单表 `> 5,000` 行，或 `/api/v1/bootstrap` 响应 `> 2MB`。
2. **冲突触发**：同一行 7 天内乐观锁 `409` ≥ 3 次。
3. **查询触发**：`agenda` 子项或 `contributions` 子项在 ≥ 2 个读口被按子项过滤/统计。
4. **影子稳定**：`schema-split-readiness.mjs` 连续 7 天 `mismatch=0`，且建/改/归档/删四条写路径双写成功率 100%。
5. **制度前置**：`B-500-4` 保留期已裁定；若裁定为「清理历史行」，先重算第 1 条再决定是否切换。

判据 1–3 **任一**成立，且 4、5 成立 ⇒ 可切；否则维持 JSON 权威源。

## 验证预算（支书令：测试不超过 3 次）

固定 3 次套件级运行，顺序不可换：

1. **定向**：一条命令跑 schema/seed/todo/mock-parity/perf 相关文件（清单见 `tasks.md`）。
2. **daily**：`npm run test:daily`。
3. **全量**：`SWEEP_SHARD=all`（带 `DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）。

红项只允许对失败文件单跑诊断，不得再开第四轮套件；修好后在**同一检查点**复跑该套件一次，仍计入该检查点。
