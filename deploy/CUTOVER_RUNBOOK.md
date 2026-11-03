---
title: "数据换轨 Runbook（export-all / import-all / preflight-cutover）"
type: runbook
role: "[运维执行人]+[工程师]"
last_updated: 2026-11-02
status: active
---

# 数据换轨 Runbook

> **禁止在生产直接试跑。** 本 runbook 的所有破坏性步骤（`import-all --apply`、替换库文件）必须先在
> **临时副本库**上完整演练一遍，确认 `preflight-cutover` 通过、行数与 sha256 一致、六角色可登录后，
> 才允许在生产实例执行。
>
> 关联：`server/scripts/export-all.mjs`、`server/scripts/import-all.mjs`、`server/scripts/preflight-cutover.mjs`、
> `server/scripts/backup.mjs`、`server/scripts/restore.mjs`、`server/db.js`（迁移安全）。

---

## 0. 适用场景与边界

| 场景 | 做法 |
|---|---|
| 同机换版本（结构迁移） | 不换库；`initDb` 自动迁移，迁移前自动备份（见 §7） |
| 演示库 → 生产空库/基线库 | 本 runbook：`export-all` → 空库 `import-all` → `preflight-cutover` |
| 生产库整体搬迁 | 优先 `backup.mjs` + `restore.mjs`（库与附件一起搬）；跨库重构才用 export/import |
| 回滚 | 优先用「升级前备份」`restore.mjs`；本仓不提供降级脚本 |

**schema 版本**：当前代码 `SCHEMA_VERSION = 12`（`server/db.js::MIGRATIONS` 的最大版本）。
导出/导入两侧版本必须都等于 12；不等即拒绝，不做隐式迁移或降级。

**导出不包含**（关系表，非业务表）：`sessions`、`attachments`。附件物理文件在 `UPLOAD_DIR`，
换轨时按 §6 单独校验与搬运。

---

## 1. 演练（必须先做）

在仓库根或 `server/` 下，使用**临时目录**（`.tmp/`），全程不碰 `server/data.db`：

```powershell
cd server
# ① 造一份演示副本（不覆盖 data.db；--out 指向 .tmp）
node scripts/rebuild-demo.mjs --mode demo --out .tmp/cutover-src.db --force

# ② 导出（演示库默认拒导，演练库显式 --allow-demo）
node scripts/export-all.mjs --db .tmp/cutover-src.db --out .tmp/cutover-export --allow-demo

# ③ 空库 dry-run（必须显式 branch-map）
node scripts/import-all.mjs --from .tmp/cutover-export --db .tmp/cutover-dst.db --branch-map br-b1=br-b1 --dry-run

# ④ 空库 apply（单事务）
node scripts/import-all.mjs --from .tmp/cutover-export --db .tmp/cutover-dst.db --branch-map br-b1=br-b1 --apply

# ⑤ 换轨体检
node scripts/preflight-cutover.mjs --db .tmp/cutover-dst.db

# ⑥ 清理演练产物
Remove-Item -Recurse -Force .tmp
```

演练判定：③ 通过；④ 打印逐表「行数 / sha256」；⑤ exit 0（无阻断）。
若 `rebuild-demo` 不可用，可改用「SQLite 在线备份」复制运行库到 `.tmp/`，**不要**直接 `Copy-Item data.db`
（WAL 未并回会丢最近写入）。

---

## 2. 导出（生产源库）

```powershell
cd server
node scripts/export-all.mjs --db <源库> --out <导出目录>
```

- `--db` / `--out` 必填；`--out` 非空默认拒绝（`--force` 才覆盖同名 JSON）。
- **只读**打开源库；不迁移、不写库。
- 导出内容：`RESOURCE_TABLES`（34，`issue_reveals` 已退役自动跳过）＋ `SEMANTIC_TABLES`（7）
  ＋ `WORKGROUP_TABLES`（6）＋ `collection_versions` ＋ `seed_meta`。
- `manifest.json` 记录：`schemaVersion`、`exportedAt`、逐表 `rows` / `sha256`、总行数、总 sha256、
  `localOnly: ['committeeBroadcasts']`、`source.seedMode/seedVersion/demo`。
- 源库含演示种子时默认拒导；**只有演练**才可加 `--allow-demo`。

---

## 3. dry-run（空库/基线库）

```powershell
cd server
node scripts/import-all.mjs --from <导出目录> --db <目标库> --branch-map old=new --dry-run
```

校验顺序（任一不过即退 1，不写库）：

1. `manifest.schemaVersion` == 代码 `SCHEMA_VERSION` == 目标库 `user_version`；
2. `--branch-map` 必填；行内所有非空 `branchId` 的旧值都必须在映射内
   （**禁止**无映射时静默落 `br-b1`）；
3. 目标库 id 冲突：已存在同主键 ⇒ 拒绝并列出（不做 upsert）；
4. 契约 `required` / `enums`：`server/data/domain-contract.mjs` 逐行校验；
5. 导出文件行数与 manifest 一致。

`--branch-map` 可重复或用逗号分隔：`--branch-map br-b1=br-b1 --branch-map br-b2=br-b9`。

---

## 4. apply（单事务）

```powershell
cd server
node scripts/import-all.mjs --from <导出目录> --db <目标库> --branch-map old=new --apply
```

- 全部写入在**一个 SQLite 事务**内；任一行失败或导入后校验不一致 ⇒ **整体回滚**，目标库保持导入前状态。
- 导入后逐表比对「行数 + sha256」（与映射后的导出数据同口径）；映射改写过 `branchId` 的表会提示
  「与导出不同，属映射预期」，仍须行数一致且 sha256 与映射后数据一致。
- 失败会打印 `deploy/CUTOVER_RUNBOOK.md` 指针，不静默。

---

## 5. 校验

```powershell
cd server
node scripts/preflight-cutover.mjs --db <目标库> [--uploads <附件目录>] [--strict]
```

- 阻断项（exit 1）：schema 版本不符、缺表、空库（users/branches 为 0）、无党委账号、
  孤儿外键（users→branches / activities→branch / attendances→activity/person）、附件记录缺物理文件。
- 警告项：演示数据残留、生产最小角色账号不全、非 `br-b1` 支部、uploads 无记录孤儿文件。
- **真实换轨必须 `--strict` 且警告为 0**（尤其演示残留必须为 0）。
- 校验后建议再跑六角色登录与关键页签冒烟：`node deploy/smoke.mjs`。

---

## 6. 附件校验

附件物理文件在 `UPLOAD_DIR`（缺省 `server/uploads/`），库里 `attachments` 只有元数据。

```powershell
cd server
# 记录 → 文件：preflight 已自动检查（缺失即阻断）
node scripts/preflight-cutover.mjs --db <目标库> --uploads <附件目录> --strict

# 换轨时必须连同附件目录一起搬运；搬运后复查
# Windows
robocopy <源附件目录> <目标附件目录> /MIR
# Linux
rsync -a <源附件目录>/ <目标附件目录>/
```

- 缺文件（库里有记录、磁盘没有）= 阻断；孤儿文件（磁盘有、库里没记录）= 警告。
- 只备库不备附件 = 附件全丢；只备附件不备库 = 元数据丢失。

---

## 7. 迁移安全（自动备份 / 拒绝降级 / 失败回滚）

`server/db.js::applyMigrations` 在启动时执行：

1. **迁移前自动备份**：目标库已有业务数据且有待应用迁移 ⇒ 同步调用 `scripts/backup.mjs`，
   备份到 `server/backups/pre-migration-<时间戳>/`；备份失败即**中止迁移**。
   `:memory:` / 临时库（`os.tmpdir()` 或路径含 `.tmp`）跳过；演练可用 `DB_AUTO_BACKUP=0` 显式关闭（仅限演练）。
2. **拒绝降级**：`PRAGMA user_version > SCHEMA_VERSION` ⇒ 抛错拒绝启动
   （「库比代码新，禁止降级」）；不提供降级脚本。
3. **失败回滚**：迁移在单事务内执行，失败整体回滚（`user_version` 与 DDL 均不保留），
   打印本 runbook 指针后向上抛，**不静默**。

回滚（代码级）默认不动 DB；必须回 DB 时用升级前备份：

```powershell
cd server
node scripts/restore.mjs --from backups/pre-migration-<时间戳> --dry-run
node scripts/restore.mjs --from backups/pre-migration-<时间戳>
```

恢复前必须停服；恢复后删除目标库旁的 `data.db-wal` / `data.db-shm`。

---

## 8. outbox 与浏览器本机数据

**outbox（写失败待同步队列）**：`docs/src/core/session/pending-writes.js`
- 条目可携带 `payload`（集合 + 行数据 + `_versions`），刷新/换页后仍可重试；旧条目（无 payload）走旧逻辑。
- 换轨前提醒用户：打开工作台 → 等待「未同步」角标消失或点「重试」→ 再关页。
- 仍失败的条目在 `localStorage['gsm1921-pending-writes-outbox']`；如需留证，可在浏览器控制台导出：

```js
copy(localStorage.getItem('gsm1921-pending-writes-outbox'))
```

**committeeBroadcasts（本机-only）**：
- `docs/src/data/cache-registry.js::LOCAL_ONLY_COLLECTION_META` 已标注为本机域；
  `export-all` 的 `manifest.localOnly` 也显式列出 `committeeBroadcasts`。
- **不随库迁移**。换轨前由用户手工导出 localStorage（逐浏览器/逐设备各一份）：

```js
copy(localStorage.getItem('workflowos_branch_db_v1'))   // 整库读缓存（含 committeeBroadcasts 镜像）
```

- 换轨后由用户在新环境重新登录；本机-only 数据不会自动合并到服务端。

---

## 9. 命令速查

```powershell
cd server

# 备份 / 恢复（库 + 附件）
node scripts/backup.mjs --out backups/<时间戳>
node scripts/restore.mjs --from backups/<时间戳> --dry-run
node scripts/restore.mjs --from backups/<时间戳>

# 全量导出 / 导入
node scripts/export-all.mjs --db <源库> --out <导出目录>
node scripts/import-all.mjs --from <导出目录> --db <目标库> --branch-map old=new --dry-run
node scripts/import-all.mjs --from <导出目录> --db <目标库> --branch-map old=new --apply

# 换轨体检
node scripts/preflight-cutover.mjs --db <目标库> --strict

# 重建基线库（生产空库起步）
node scripts/rebuild-demo.mjs --mode baseline --out <新库>
```

---

## 10. 失败处置

| 现象 | 处置 |
|---|---|
| `manifest.schemaVersion ≠ SCHEMA_VERSION` | 用**匹配版本**的代码重新导出/导入；不要跨版本混合 |
| `--branch-map` 缺失或映射不全 | 补全 `old=new`；确认目标支部 id 已存在 |
| 目标库 id 冲突 | 目标必须是空库/基线库；先备份，再按需清空 |
| 契约 required/enums 失败 | 先修数据源（Wave 2 契约单一源），不要为通过而删字段 |
| 导入后 sha256 不一致 | 事务已回滚；检查导出文件是否被改动、映射是否覆盖全部 branchId |
| preflight 阻断 | 按输出逐项修复；**不要**用 `ALLOW_DEMO_DATA=1` 绕过生产闸门 |
| 迁移失败 | 事务已回滚；按日志修复后重跑，或用 `pre-migration-*` 备份恢复 |
| 库比代码新 | 禁止用旧代码启动；换回匹配版本代码，或用升级前备份恢复 |
