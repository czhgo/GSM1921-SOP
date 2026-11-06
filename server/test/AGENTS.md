# AGENTS — server/test

## 读什么（最多 3 条）
1. `server/test-tier-registry.mjs`（三层单一源 + 两个预算常量）。
2. `server/test/test-tier-guard.test.mjs`（登记 / 预算 / 并集的机检口径）。
3. `server/README.md`「测试说明」（daily / precommit / full 各跑什么）。

## 改什么
- 新增 / 改名测试 → `test/*.test.mjs`，同批在 `test-tier-registry.mjs` 登记 `tier` + `reason`。
- 新增断言 → 同批上调 `DAILY_TEST_BUDGET` 并写理由注释；新增文件 → 上调 `DAILY_FILE_BUDGET`。
- 存量基线 → `style-baseline.mjs`（hex / 小字 / 死类）、`timestamps-note-baseline.mjs`。
- 真机编排 → `sweep-shard.mjs`、`form-loop-registry.mjs`、`run-suite.mjs`。

## 禁什么（3 条硬禁）
1. 不得把红项改成 `skip` / `todo` / 删断言来变绿。判定：diff 中 `test.skip`、`test.todo`、`{ skip:` 只增不减即需书面理由；且原断言仍须覆盖原行为。
2. 不得放宽存量 ratchet 基线（`style-baseline.mjs` 等计数只降不升）。判定：基线文件 diff 只允许减少，`test-tier-guard` 绿。
3. 新增测试不得只落盘不登记。判定：`node --test test/test-tier-guard.test.mjs`（磁盘 ↔ 三层并集双向相等）。

## 验证命令
```powershell
# 定向：只跑你改的那一个文件（秒级）
cd server; node --test test/<file>.test.mjs
# api 形态 / 权限类文件手跑前必须先设（否则登录 401，整文件报错）
cd server; $env:DISABLE_PASSWORD_CHECK=1; node --test test/<file>.test.mjs
# 全量日常（实测 ≈150s，预算 ≤180s）
cd server; npm run test:daily
# 发布前（预算 ≤1200s；README 实测量级 ≈23 分钟）
cd server; npm run test:full
```

## 交接口
- 分层 / 预算：`test-tier-registry.mjs`，并与 `doc-consistency::S16` 的清单对齐。
- 守卫基线：与实现同批改 `style-baseline.mjs`，口径同步 `content/04_web_design/design-system/DESIGN_SYSTEM.md`。
- 真机分片：`sweep-shard.mjs` / `run-suite.mjs`（`SWEEP_SHARD`）。

## 常见坑
- 新文件不登记 → `test-tier-guard` 红（三层并集 ≠ 磁盘）。
- 手跑 api 形态文件不设 `DISABLE_PASSWORD_CHECK=1` → 401 报错，不是回归。
- 新增断言不调预算 → `test-tier-guard` 红；预算上调必须在常量注释里写清理由。

## 防逃逸三件套（示例）
| 件 | 内容 |
|---|---|
| 触发条件 | 任何新增 / 改名 `test/*.test.{js,mjs}` |
| 唯一落点 | `test-tier-registry.mjs`（tier + reason + 预算注释，同批一次改完） |
| 检查方式 | `cd server; node --test test/test-tier-guard.test.mjs` |
