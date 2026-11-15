# 恢复演练（T4）· 2026-11-15

> 判据：`node server/scripts/restore-drill.mjs` 真跑一次，读数如实登记；失败不得记为成功。
> 运行库 `server/data.db`（WAL，3000 端口服务在跑）全程只作备份源，未覆盖 / 未删除 / 未停服。

## 结论

| 项 | 读数 |
|---|---|
| 日期 | 2026-11-15T16:15:43Z–16:15:51Z（本地 Asia/Shanghai 2026-11-16 00:15） |
| 脚本 | `server/scripts/restore-drill.mjs`（新增） |
| 备份方式 | `scripts/backup.mjs` → SQLite 在线备份 API（`db.backup()`，含 WAL） |
| 备份路径（演练内） | `server\.tmp-restore-drill\2026-11-15_16-15-43\backup\`（演练结束后已删除） |
| 备份文件大小 | `data.db` = **844.0 KB（864256 B）**；整份备份目录 866616 B（含 `backup.json` ＋ `uploads/`） |
| sha256 | `55400f6c8f190904940f717dd6578bff665cc9aa06cd4972762b91401d0319be` |
| 表数量 | **57**（`backup.json::tables` 与恢复副本逐表比对，0 处不符） |
| 附件 | 9 个文件 / 627 B（备份与恢复副本数量一致） |
| schema 版本 | `user_version = 16` · seed = `2026-10-21a` |
| `integrity_check`（恢复副本，启动前） | **ok** |
| `integrity_check`（恢复副本，启动后） | **ok** |
| 启动校验 | `listen(0)` 随机端口 **54506**，`GET /api/v1/health` → `{"ok":true}` |
| 脚本退出码 | **0** |

## 关键表行数（备份清单 = 恢复副本，逐表相等）

| 表 | 行数 | 表 | 行数 |
|---|---|---|---|
| users | 51 | branches | 1 |
| activities | 38 | attendances | 144 |
| notices | 14 | todos | 4 |
| workgroups | 46 | workgroup_members | 103 |
| attachments | 8 | inspections | 42 |
| agenda_items | 11 | sessions | 633 |
| tasks | 8 | taskforces | 8 |

（其余 43 张表同样逐项相等，完整读数见下方命令输出中的 `readings.backup.tables`。）

## 复现

```bash
cd server
node scripts/restore-drill.mjs            # 退出码 0 = 五项全过
node scripts/restore-drill.mjs --keep     # 保留临时目录排障
```

流程：在线备份到临时目录 → 复制 `data.db` ＋ `uploads/` 到临时恢复目录 → 只读 `PRAGMA integrity_check` ＋ 逐表行数与 `backup.json` 比对 → 用恢复副本起 `listen(0)` 实例并探 `/api/v1/health` → 启动后复检 integrity → 输出结构化 JSON，默认删除临时目录。

## 单独一次备份实跑（验证 `backup.mjs` 与状态文件）

```text
[backup] 数据库： d:\GitHub\GSM1921-SOP\server\data.db
[backup] ✔ 备份完成
[backup]   备份目录：d:\GitHub\GSM1921-SOP\server\.tmp-restore-drill\manual-check
[backup]   数据库  ：data.db（844.0 KB）· integrity_check=ok · users=51 行 · schema v16 · seed=2026-10-21a
[backup]   清单    ：backup.json（57 张表 · 附件 9 个 · sha256=55400f6c8f19…）
[backup]   附件     ：9 个文件 / 627 B → ...\.tmp-restore-drill\manual-check\uploads
EXITCODE=0
```

`server/.backup-status.json`（本次写入）：

```json
{
  "lastRunAt": "2026-11-15T16:16:02.853Z",
  "ok": true,
  "error": null,
  "path": "d:\\GitHub\\GSM1921-SOP\\server\\.tmp-restore-drill\\manual-check",
  "database": "data.db",
  "dbBytes": 864256,
  "integrity": "ok",
  "users": 51,
  "tables": 57,
  "schemaVersion": 16,
  "uploadsFiles": 9,
  "sha256": "55400f6c8f190904940f717dd6578bff665cc9aa06cd4972762b91401d0319be"
}
```

## 失败路径验证（不得把失败记成成功）

```text
node scripts/restore-drill.mjs --db server/no-such.db
[drill] ✖ 恢复演练失败：备份失败（backup.mjs 退出码 1），演练中止
DRILL_FAIL_EXIT=1
```

输出为 `"ok":false` 的完整 JSON，且临时目录已在 `finally` 中清理。

## 每日巡跑封装实跑（`backup-daily.ps1`）

```text
[backup]   备份目录：D:\GitHub\GSM1921-SOP\server\backups\2026-11-16_00-27-23
[backup]   数据库  ：data.db（844.0 KB）· integrity_check=ok · users=51 行 · schema v16 · seed=2026-10-21a
[backup-daily] ✔ 完成：...\server\backups\2026-11-16_00-27-23（现存每日备份 1 份，本次清理 0 份）
DAILY_EXIT=0
```

（首次验证产物已删除；保留一次实跑：`server\backups\2026-11-16_00-28-23\`，该目录被 `.gitignore` 的 `server/backups/` 忽略，当前 `server/.backup-status.json` 即指向它。保留策略未误删 `pre-migration-*` / `pre-rebuild-*` 等专项备份目录。）

## 未覆盖范围

- **未演练「覆盖现有运行库」**：本次只恢复到临时目录并用副本启动；真覆盖（停服 → `scripts/restore.mjs`）不在本次范围。
- **未演练 Linux 定时器实机触发**：`deploy/systemd/gsm-backup.{service,timer}` 与 `deploy/backup-cron.example` 只提供单元文件，本机（Windows）未安装验证。
- **`backup-daily.ps1` 的保留策略**未用真实多余备份验证（只会删除时间戳命名的每日备份目录，专项 `pre-migration-*` 不动）。
