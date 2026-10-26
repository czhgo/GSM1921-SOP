# AGENTS — server

## 读什么（最多 3 条）
1. `server/README.md`（启动、测试档位、备份与迁移纪律）。
2. `server/routes/resources/index.js`（路由装配与通用 CRUD）。
3. `server/db.js`（`RESOURCE_TABLES` / `SEMANTIC_TABLES` / `MIGRATIONS` 单一源）。

## 改什么
- 新语义端点 → `routes/resources/semantic-routes.js`；通用资源 → `routes/resources/index.js`。
- 写门 / 批准门 → `routes/resources/gates.js` / `approval-gates.js`；支部作用域 → `branch-scope.js`。
- 表结构 / 索引 → `db.js` 的 `MIGRATIONS`（追加 vN，不改 v1 基线）。
- 种子 → `seed.js`（演示）/ `seed-baseline.js`（空库组织基线）。
- 业务服务 → `services/reporting.js`、`services/mailer*.js`；上传 → `routes/uploads.js`。

## 禁什么（3 条硬禁）
1. 既有路由的方法 / 路径 / 响应字段**只增不改形**：不得改 `router.get/post/patch/delete('<path>')` 的路径串，不得删响应键。判定：`git diff -U0 server/routes` 的路径串无 `-` 行，且 `server-base` / `records-endpoints` 绿。
2. 写口不得放宽权限：不得把 `requireRole(...)` 降成 `requireAuth`，不得删 `RESOURCE_WRITE_GATE` 项。判定：diff 中 `requireRole` / `*_WRITE_GATE` 只增不减，`permission-gate` + `r3-data-permission-regression` 绿。
3. 不得在 `MIGRATIONS` 之外写 `ALTER TABLE`，不得改 v1 冻结基线。判定：`node --test test/db-integrity-guard.test.mjs`（G5 / G6）。

## 验证命令
```powershell
# 定向（纯 node，秒级；api 形态需跳过口令）
cd server; $env:DISABLE_PASSWORD_CHECK=1; node --test test/r3-data-permission-regression.test.mjs test/permission-gate.test.mjs test/roles-sync.test.mjs test/server-base.test.mjs
# 动到语义端点时追加（真机，自起自停，较慢）
cd server; node --test test/records-endpoints.test.mjs
# 全量日常（实测 ≈150s，预算 ≤180s）
cd server; npm run test:daily
# 发布 / 大批改动（预算 ≤1200s；README 实测量级 ≈23 分钟）
cd server; npm run test:full
```

## 交接口
- 前端消费：`docs/src/data/api-adapter.js` / `data-adapter.js`（快照集合名与字段必须同步）。
- 数据模型：`content/04_web_design/data/DATA_MODEL.md`。
- 角色权限：`content/02_institution/SYSTEM_ROLE_PERMISSION.md` + `docs/src/core/domain/constants.js`。
- 部署 / 环境：`deploy/**`、`server/.env.example`、`README-server.md`。

## 常见坑
- 在 routes 文件顶部插 / 删行会让 `README-server.md` 的 `文件:行号` 引用整体失效 → `doc-line-ref` 红；语义端点故意放在文件末。
- WAL 模式下直接拷 `data.db` 会丢最近写入；备份用 `scripts/backup.ps1` / `scripts/backup.mjs`。
- `click-cost` / `mock-integrity` 要连 3000；没起服务必红，不是回归。`b3-1-makeup-writeback` 自 2026-10-26 起自托管临时库副本，不再需要外部 3000。

## 防逃逸三件套（示例）
| 件 | 内容 |
|---|---|
| 触发条件 | 新增写口（POST / PATCH / DELETE）或新增角色可见动作 |
| 唯一落点 | `routes/resources/gates.js::RESOURCE_WRITE_GATE`（或对应业务写门）+ `semantic-routes.js` |
| 检查方式 | `permission-gate` + `r3-data-permission-regression` + `roles-sync` 全绿 |
