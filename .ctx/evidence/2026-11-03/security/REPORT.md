# 安全与权限红队专项（Task 7）— 2026-11-03

## 汇总

| 指标 | 数值 |
|---|---|
| 总探针数 | **40** |
| PASS | **39** |
| P0（修复后） | **0**（修复前实测 **2**） |
| P1（修复后） | **0** |
| 已知例外 | **1** |

- 探针运行库：`createApp({ dbPath: ':memory:' })` + `seedDatabase(db)`；**未连接** `server/data.db` 或 `:3000`。
- 角色覆盖：普通成员、党小组组长、组织委员、宣传委员、纪检委员、支书、党委（另含「活动组织者」普通成员账号）。
- 原始结果：[redteam.json](./redteam.json)（含每条 actorRole / method / path / status / is2xx / expected / verdict / note / before / after）。

## P0（修复前命中，修复后转 PASS）

| # | 入口 | 攻击 | 修复前 | 修复后 |
|---|---|---|---|---|
| 1 | `POST /api/v1/snapshot` | 普通成员 `{ actSubRecords: [{ id:'__root__', body:{} }] }` | **200**，全支部活动子记录被清空 | **403**，数据保留 |
| 2 | `POST /api/v1/snapshot` | 普通成员 `{ tfSubRecords: [{ id:'__root__', body:{} }] }` | **200**，全支部专班子记录被清空 | **403**，数据保留 |

## 修复项

1. `server/routes/resources/gates.js`
   - 新增 `_snapshotAggregateSubRecordDeny`：快照写穿对 `actSubRecords` / `tfSubRecords` 按父键复算「值变化面」与「删除面」。
   - 抽出 `_aggregateParentWriteDeny`（单父键判据），由 `aggregateSubRecordWriteDeny` 与快照门共用；角色集仍为 `PARTY_STAFF_ROLE` / `BRANCH_COMMITTEE_ROLES`，组织者判据复用父记录 `createdBy` / `organizer` / `assignments|members` 的 `organizer|deep`，未另写第二套。
   - `_snapshotResourceWriteGateDeny` 对聚合集合不再直接 `continue`；改为调用上述门（**等行数改动**，保住 README 既有行号引用）。
2. `server/security/write-policy-matrix.mjs`
   - `snapshot` 行 roleGate / evidence 补 `_snapshotAggregateSubRecordDeny`；
   - `actSubRecords` / `tfSubRecords` 行 evidence 补「快照写穿同判据」与回归测试。状态仍为 `enforced`（修复后属实，未伪造）。
3. `server/test/security-redteam.test.mjs`（新增 5 条，纯 node + `:memory:`）
   - 快照清空 actSubRecords / tfSubRecords → 403 且原样保留；
   - 快照改写他人活动子记录 → 403；
   - 本场组织者写自己的子记录 → 200（不误伤）；
   - 快照清空考勤 / 伪造通知 → 403（既有门防回归）。
4. 登记：`server/test-tier-registry.mjs`（daily + 文件/断言预算 240 / 1759）与 `server/package.json::test:daily` 同批加 `security-redteam.test.mjs`。

## 已知例外（非安全回归）

- **活动组织者归档 403**：`POST /api/v1/activities/act-3/archive` 对 `assignments.organizer` 返回 403。
  原因：归档判据 `activityOperationAllowed` 只认工作组 `activity.edit` 授权 / 承办党小组组长 / 支书，不认活动行 `organizer` 字段；演示种子未给该账号在 `wg-activity-act-3` 授权。**属更严判据，不是权限提升**。如需「组织者可直接归档」，应作为产品裁定单独处理，不在本次安全修复中放宽。

## 会话 TTL

- 红队复证：登录 token 手改 `created_at` 为 8 天前 → `GET /auth/me` **401**、受保护写口 `POST /thoughtReports` **401**，且会话行被删除。
- 既有回归 `server/test/session-ttl.test.mjs` 2 条全绿（默认 7 天、非法值回落 7 天）。

## 未闭环项

- 上述「活动组织者归档」为已知例外（更严），未改判据。
- `docs-governance-guard` 的 F2（content frontmatter 日期早于最后提交日）与 R1（`DEPLOYMENT_GUIDE.md` 4 处行号指向空行）为**存量/本次未触碰文件**的失败，与 Task 7 改动无关；本次未改 `content/**` 与部署文档。

## 复跑命令

```powershell
cd server
$env:DISABLE_PASSWORD_CHECK='1'
node --test test/security-redteam.test.mjs test/write-policy-gaps.test.mjs test/write-policy-matrix.test.mjs test/session-ttl.test.mjs
node --test test/test-tier-guard.test.mjs
```

实测读数：`security-redteam` 5/5、`write-policy-gaps` 4/4、`write-policy-matrix` 4/4、`session-ttl` 2/2，合计 **15 passed / 0 failed**；`test-tier-guard` **7/7 passed**。

## 证据与约束

- 证据：`.ctx/evidence/2026-11-03/security/redteam.json`、本报告。
- 临时探针脚本 `server/.tmp-security-probe.mjs` 与 4 个探针上传的 8 字节 PNG **已删除**；仓库只保留证据 JSON/MD 与回归测试。
- 未改路由方法/路径/响应字段；未放宽任何权限门；未新增依赖。
