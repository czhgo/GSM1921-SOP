# AGENTS — content/04_web_design

## 读什么（最多 3 条）
1. `content/04_web_design/README.md`（五子目录分职与权威源速查）。
2. `design-system/DESIGN_SYSTEM.md`（父索引：哲学 ＋ 编目；条文在 `DS_01`…`DS_05`，§12 组件层执行口径在 `DS_03`）。
3. `design-system/CASES.md`（判例：为什么这样定、边界在哪）。

## 改什么
- 规范条文（必须 / 不得 / SD 编号）→ 只进 `design-system/DS_01`…`DS_05` 对应编（父索引 `DESIGN_SYSTEM.md` 只放哲学与编目）。
- 判例（场景 → 结论 → 边界 → SD 编号）→ `design-system/CASES.md`。
- 数据模型 / 数据流 → `data/DATA_MODEL.md`。
- 部署与对外对接 → `deploy/DEPLOYMENT_GUIDE.md`。
- 页面 / 模块设计 → `module/*`；演进论证 → `evolution/*`（论证档案，不承担现行权威）。

## 禁什么（3 条硬禁）
1. 不得在 `docs/**` 写规范条文（「必须 / 不得 / 禁止」口径）。判定：`git diff docs` 新增命中规范句式即回改到对应编。
2. 不得只改文档里的变量值而不同步守卫。判定：改 §2 / §12 的 token 后 `theme-palette-guard`、`hex-hardcode-guard`、`density-spacing-guard` 必须绿。
3. 不得让判例产生规范效力。判定：每条 `CASE-DESIGN-*` 必须含「对应规范编号：SD-xx」；无编号即不合格。

## 验证命令
```powershell
# 定向（改规范 / 判例后先跑，纯 node）
cd server; node --test test/doc-consistency.test.mjs test/docs-governance-guard.test.mjs test/theme-palette-guard.test.mjs test/hex-hardcode-guard.test.mjs
# 改密度 / 交互 / 动效时追加
cd server; node --test test/density-spacing-guard.test.mjs test/hover-state-guard.test.mjs test/motion-guard.test.mjs
# 全量日常（实测 ≈150s，预算 ≤180s）
cd server; npm run test:daily
# 发布前（预算 ≤1200s；README 实测量级 ≈23 分钟）
cd server; npm run test:full
```

## 交接口
- 实现落点：`docs/src/**`（见 `docs/src/AGENTS.md`）。
- 判例总索引：`content/03_doc_system/CASES_INDEX.md`。
- 规范编号 ↔ 守卫映射：`DS_03_COMPONENTS.md` §12.9 / §12.15 各条「守卫：」。
- 数据表结构：`server/db.js` + `data/DATA_MODEL.md`。

## 常见坑
- 改 `DESIGN_SYSTEM.md` 忘刷 frontmatter `last_updated` 与 `.ctx/TIMESTAMPS.md` → `frontmatter-freshness` 红（R-83）。
- 只改文档色板不动守卫基线 → `theme-palette-guard` / `hex-hardcode-guard` 红。
- 把判例结论写成「以后都应如此」而不迁 SD 编号 → 判例越权产生规范效力（见 `CASES.md` 头注）。

## 防逃逸三件套（示例）
| 件 | 内容 |
|---|---|
| 触发条件 | 支书新裁定 / 新设计判例 |
| 唯一落点 | `design-system/CASES.md` 新增 `CASE-DESIGN-0xx` + `DS_03_COMPONENTS.md` 对应 SD 编号 + `CASES_INDEX.md` 一行 |
| 检查方式 | `doc-consistency` + 该条守卫（如 `theme-palette-guard`）绿 |
