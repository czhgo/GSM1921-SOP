# Checklist

## v11 迁移

- [x] `SCHEMA_VERSION` 为 11；迁移在单事务内完成，重复启动零改写
- [x] `todos.branch_id` 存在；回填按「父行 → 所属人 → NULL」顺序，`unresolved` 有计数且不猜测
- [x] 五张热表的 generated **VIRTUAL** 列与复合索引存在（实施时实测：SQLite 不允许给**已有数据**的表 `ADD ... STORED`，故统一 VIRTUAL；`PRAGMA table_xinfo` 识别生成列，避免重跑重复加列）
- [x] `agenda_items`、`taskforce_contributions` 已建表并回填；行数与 JSON 数组长度一致
- [x] `down()` 可回滚：`rollbackV11` 删影子表与索引、保留 `todos.branch_id` 数据（`schema-split-shadow` S4）

## Todo 归属

- [x] 新写口解析不出支部时返回 400，且不落行（服务端与 mock 同口径）
- [x] `resourceBranchId('todos')` 不再回落 `DEFAULT_BRANCH`
- [x] `NULL` 行仅本人或同角色可见，并带 `branchLegacy:true`
- [x] 兼容期到期条件写成命名常量（下一次 schema 升级或 2026-12-31，先到者为准）
- [x] 跨支部账号看不到他人 `NULL` 待办；党委未选支部看不到

## 索引与分页

- [x] 带 `branch_id/status` 的 SQL 过滤与整表 + JS 过滤行集、顺序完全一致（5 张表）
- [x] `GET /<resource>` 无 `page` 参数时仍返回原数组（旧客户端不受影响）
- [x] 带 `page` 时返回 `{rows,total,nextCursor}`；游标为 `(updated_at,id)`，无 `OFFSET`
- [x] `pageSize` 上限 200；越界有明确错误
- [x] 首批只在 `todos / attendances` 切换分页，其余集合保持整表

## 影子拆表与切表判据

- [x] 议程/贡献写口在同一事务内双写 JSON 与子表
- [x] `schema-split-readiness.mjs` 输出 5 个布尔判据与 `READY|NOT_READY`，且能被构造的 mismatch 判为 `NOT_READY`
- [x] `CLAUDE.md B-504-1` 已逐字登记判据与「全真才可切」，并指向本 spec
- [x] 本批**未**把权威源切到子表；读路径仍走 JSON

## 文档与验证

- [x] `DATA_MODEL` 补 Todo `branchId` 与影子表「非权威源」标注
- [x] `.ctx/SNAPSHOT.md` 与 `README-server.md` 改准 schema v11 与分页参数
- [x] 第 1 次定向测试全绿（126 / 126，文件清单见 tasks 7.1 ＋ R10 定向集）
- [x] 第 2 次 `npm run test:daily` 全绿
- [x] 第 3 次 `SWEEP_SHARD=all` 三通道 0 失败；全程套件级运行不超过 3 次
- [x] 版本戳已 bump（`20261023a`）；执行日志与 `TIMESTAMPS` 已更新
- [x] 已提交（不 push），提交信息含 Why / What / Verification / Boundaries
