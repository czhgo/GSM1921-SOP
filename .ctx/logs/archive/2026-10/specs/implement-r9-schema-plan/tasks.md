# Tasks

- [x] Task 1: v11 迁移（DDL ＋ 回填 ＋ 回滚）
  - [x] SubTask 1.1 `server/db.js`：`SCHEMA_VERSION` 10 → 11；新增 `v11` 迁移段（单事务）：
    - `ALTER TABLE todos ADD COLUMN branch_id TEXT`；回填规则：`sourceType/sourceId` 命中父行取父 `branchId` → `personId` 命中 `users` 取该人 `branchId` → 否则 `NULL` 并计数 `unresolved`（不猜测）；
    - 五张热表加 generated **VIRTUAL** 列并建复合索引（实施实测：SQLite 不允许给已有数据的表 `ADD ... STORED`，故走 VIRTUAL；未触发 12 步表重建）；
    - 新建影子表 `agenda_items`、`taskforce_contributions` 并回填（`INSERT ... SELECT json_each(...)`）；
    - 幂等：重复启动零改写（`PRAGMA table_xinfo` 识别生成列）；`unresolved` 打印计数。
  - [x] SubTask 1.2 `down()` 回滚：`rollbackV11` 删影子表、删索引与生成列；`todos.branch_id` 保留数据；`schema-split-shadow` S4 演练。
  - [x] SubTask 1.3 `db-migration` / `db-integrity-guard` 增断言：v11 后表结构、索引存在、回填计数正确、二次启动不变。

- [x] Task 2: Todo 归属 fail-closed（BREAKING）
  - [x] SubTask 2.1 服务端写口：`POST/PATCH /todos` 与快照新增行解析不出支部 ⇒ `400`；`mock-adapter` 同口径。
  - [x] SubTask 2.2 读口：`branch-scope.js::resourceBranchId('todos')` 删除默认兜底；`null` 行仅本人/同角色可见并置 `branchLegacy:true`。
  - [x] SubTask 2.3 兼容期到期开关：命名常量（下一次 `SCHEMA_VERSION` 升级或 2026-12-31，先到者为准）；到期后 `null` 行隐藏。
  - [x] SubTask 2.4 测试：新增 `todo-branch-attribution.test.mjs`（新写 400、旧行兼容、到期隐藏），并随定向/daily 复跑。

- [x] Task 3: 热表生成列与索引（真启用）
  - [x] SubTask 3.1 五张热表按需加列：`attendances(branch_id, status, person_id, activity_id, updated_at)`、`inspections(branch_id, activity_id, workgroup_id)`、`todos(branch_id, status, person_id)`、`notices(branch_id, updated_at)`、`activities(branch_id, status, updated_at)`。
  - [x] SubTask 3.2 建复合索引：`(branch_id,status)`、`(branch_id,person_id,activity_id)`、`(branch_id,updated_at)`。
  - [x] SubTask 3.3 服务端读口改为可下推：`_listRowsWithPushdown`；保持「无参数整表读」旧路径。
  - [x] SubTask 3.4 `perf-index-equivalence` 扩到 5 表：SQL 过滤 ≡ 整表 + JS 过滤（行集与顺序）。

- [x] Task 4: 可选分页（向后兼容）
  - [x] SubTask 4.1 `GET /<resource>` 支持 `page/pageSize/cursor/branchId/status`，返回 `{rows,total,nextCursor}`；无 `page` 时原样返回数组。
  - [x] SubTask 4.2 游标 `(updated_at,id)`，禁止 `OFFSET`；`pageSize` 上限 200。
  - [x] SubTask 4.3 首批只在 `todos / attendances` 列表读口切换，其余集合保持整表。
  - [x] SubTask 4.4 `mock-api-parity` 增「同参数同结果」断言。

- [x] Task 5: 影子子表 ＋ 切表判据（不切权威源）
  - [x] SubTask 5.1 双写：议程与专班贡献的写口在同一事务内写 JSON 与子表；读仍走 JSON。
  - [x] SubTask 5.2 `server/scripts/schema-split-readiness.mjs`：输出 5 个布尔判据与 `READY|NOT_READY`。
  - [x] SubTask 5.3 `CLAUDE.md` 乙部新增 `B-504-1`：逐字登记切表判据与「全真才可切」，指向本 spec 与脚本。
  - [x] SubTask 5.4 新增 `schema-split-shadow.test.mjs`：建/改/归档/删四条路径双写后 `mismatch=0`；构造一条 mismatch 必须报 `NOT_READY`。

- [x] Task 6: 文档与台账
  - [x] SubTask 6.1 `DATA_MODEL.md`：Todo 补 `branchId`；影子表标注「非权威源」。
  - [x] SubTask 6.2 `.ctx/SNAPSHOT.md`：schema v11 表结构快照；`README-server.md` 迁移段与路由表补分页参数。
  - [x] SubTask 6.3 `TIMESTAMPS` 与执行日志批次 504（Why/What/Verification/Boundaries/sample-diff）。

- [x] Task 7: 验证与交付（固定 3 次套件运行）
  - [x] SubTask 7.1 第 1 次（定向）：126 / 126 绿（含 R10 定向集）。
  - [x] SubTask 7.2 第 2 次：`npm run test:daily` 1421 / 1421 绿。
  - [x] SubTask 7.3 第 3 次：`SWEEP_SHARD=all` 三通道全绿（读数见执行日志批次 504）。
  - [x] SubTask 7.4 版本戳 bump `20261023a`；中文提交（不 push），体例「批次 504 ＋ Why / What / Verification / Boundaries」。

# Task Dependencies

- Task 2 依赖 Task 1 的 `todos.branch_id` 与回填结果
- Task 3 依赖 Task 1 的生成列；Task 4 依赖 Task 3 的索引（分页下推）
- Task 5 与 Task 2/3/4 可并行（影子表不参与读）
- Task 6 依赖 1–5 的最终行号
- Task 7 最后，且**只允许 3 次套件级运行**；红项只单跑失败文件诊断
