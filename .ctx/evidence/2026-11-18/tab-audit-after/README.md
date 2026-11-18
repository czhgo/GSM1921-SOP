# 页签审计（修复后）· 2026-11-18 批次 565

## 命令

```powershell
cd d:\GitHub\GSM1921-SOP\server
node scripts/audit-tabs.mjs --all `
  --json ../.ctx/evidence/2026-11-18/tab-audit-after/findings.json `
  --md   ../.ctx/evidence/2026-11-18/tab-audit-after/summary.md
```

自起 `:memory:` 实例 + seed + 随机端口（不写演示库）；46 个页签、五维（F/D/C/E/M）全开，未加 `--probe-writes`。

## 读数

| 项 | 修复前（`../tab-audit/`） | 修复后（本目录） |
|---|---|---|
| 生成时间 | 2026-11-18T11:50:57.902Z | 2026-11-18T12:28:41.936Z |
| 墙钟 | 225 894 ms（≈3 分 46 秒） | 272 401 ms（≈4 分 32 秒） |
| P0 | 23 | **0** |
| P1 | 0 | **0** |
| P2 | 0 | 2 |
| exception | 44 | 44 |
| 页签数 | 46 | 46 |

修复前 P0 全为 C2 `CRUD 往返失败`：`patch 428 {"error":"缺少 If-Match…","code":"PRECONDITION_REQUIRED"}`
（todos 21 / partyGroups 1 / notices 1）。根因＝批次 564 给通用 PATCH 加乐观锁后，
审计驱动 `server/scripts/audit/checks-crud.mjs` 的 C2 往返仍发裸 PATCH。

修复：C2 单行 PATCH 改走统一助手 `patchRow(ctx, path, body, { token, updatedAt })`——
用创建后回读到的该行 `updatedAt` 作 `If-Match`；取不到才兜底 `If-Match: *`。
写口请求头能力由 `checks-data.mjs::httpRequest` 的 `headers` 选项提供（缺省不带额外头）。
审计语义未改：该 pass 的仍 pass（create → read → patch 200 → read 校验 → delete），
destructive 只清探针的 44 条 exception 与修复前逐条相同。

## P2（不计违规，只进报告）

2 条均为 E1 读口性能读数偏高，非本轮改动面：

- `disc.attendance`：GET /api/v1/activities p95 62ms（预算 50ms）
- `visitor.activities`：GET /api/v1/activities p95 66ms（预算 50ms）

同机全量审计并发 + 冷缓存导致；修复前同机读数 p95 14ms。判 P2 观察，不改代码。

## 守卫

新增 `server/test/audit-write-version-guard.test.mjs`（guards 层）：
审计脚本内 `method: 'PATCH'` 字面量所在调用必须自带 `If-Match`（经 `patchRow` 亦可），
裸调用判红；反例自证用内存源码，不改盘上文件。

## 文件

- `summary.md` · `findings.json` · `shots/`（46 页签 × 1440/390 截图）
