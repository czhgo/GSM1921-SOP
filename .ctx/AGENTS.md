# AGENTS — .ctx

## 读什么（最多 3 条）
1. `.ctx/ACTIVE_CONTEXT.md`（active 投影：当前状态 / 当前判断 / 下一步）。
2. `.ctx/README.md`（三层分职 + 准入判据 + 冲突顺序）。
3. `.ctx/logs/EXECUTION_LOG_INDEX.md`（批次索引与跨批检索入口）。

## 改什么
- 当前状态 / 当前判断 → `ACTIVE_CONTEXT.md`（≤300 行 / ≤30KB；每批刷新）。
- 原始证据（截图 / `metrics.json` / 真机日志）→ `evidence/YYYY-MM-DD/`。
- 执行过程 → `logs/YYYY-MM-EXECUTION_LOG.md`；决议 → `logs/YYYY-MM-DECISION_LOG.md`。
- 现行基线 → `SNAPSHOT.md`；规则索引 → `ACTIVE_RULINGS.md`；评议 → `REVIEW_QUEUE.md`；工程评分 → `ENGINEERING_ASSESSMENT.md`；文件时间 → `TIMESTAMPS.md`。
- 历史月份 → `logs/archive/YYYY-MM/`（只读，不改写）。
- 规则 / 判例 / 方法正文 → `content/01–05`，不写进 `.ctx` 顶层。

## 禁什么（3 条硬禁）
1. 不得在 `.ctx` 顶层新增白名单外文件。判定：`cd server; node --test test/ctx-hygiene-guard.test.mjs`（① 白名单当前 **10** 项）。
2. 不得把规则写进日志或 `.ctx` 顶层；规则只能进 `CLAUDE.md` / `content`。判定：diff 中 `logs/**` 或 `.ctx` 顶层新增「必须 / 不得」判据即迁出。
3. 不得把结论只留在 `.ctx` 就删条目。判定：删除前过 `README.md §二` 三问；可复用结论须在 `content` 有落点与回链（`CLAUDE.md H50.1 §3.1`）。

## 验证命令
```powershell
# 定向（纯 node，秒级）
cd server; node --test test/ctx-hygiene-guard.test.mjs test/docs-governance-guard.test.mjs test/doc-consistency.test.mjs
# 已知：ctx-hygiene ① 当前为绿（顶层 9 项 = 白名单 9 项）；其余项应绿
# 全量日常（实测 ≈150s，预算 ≤180s）
cd server; npm run test:daily
# 发布前（预算 ≤1200s；README 实测量级 ≈23 分钟）
cd server; npm run test:full
```

## 交接口
- 结论迁入：`content/03_doc_system`（规范）/ `content/04_web_design`（设计）/ `content/05_ai_coding`（判例）。
- 规则正文：`CLAUDE.md`（甲部约束 / 乙部执行 / 丙部待决）。
- 工程行动线：`.ctx/ENGINEERING_ASSESSMENT.md` ↔ `content/03_doc_system/OPERATIONS_GUIDE.md`。

## 常见坑
- `.ctx/README.md`（第 8 项）、`.ctx/AGENTS.md`（第 9 项）、`.ctx/ACTIVE_CONTEXT.md`（第 10 项）均在 `ctx-hygiene-guard` 白名单之内 ⇒ 该守卫 ① 为绿；新增顶层文件仍须先过 `CLAUDE.md H26.3`。
- `ACTIVE_CONTEXT` 超过 300 行 / 30KB，或 `latest_decision` 落后于当月决策日志 → `ctx-hygiene-guard` 红；先把细节降级到 reference。
- `SNAPSHOT` 不再放批次小结；批次索引在 `logs/EXECUTION_LOG_INDEX.md`，`docs-governance G6` 已改断言该表。
- **About 是独立冻结件**（2026-10-27 支书裁定）：与项目 IA 无关——`docs/about.html` / `about.css` / `about-entry.js` 原样保留，**其引用面（功能目录「关于」卡、help 正文页面清单）也不改**；不纳入 IA 统计、守卫扫描与待办。判据见 `content/04_web_design/PRODUCT_IA.md` 附节。**守卫：`server/test/about-freeze-guard.test.mjs`（5 处内容基线，改动即红）**。
- 一次性审计报告（`2026-10-AUDIT_R6…R11` ＋ `R10_P3_CLOSURE`）已于 2026-10-27 批次 516 迁入 `logs/archive/2026-10/`，活跃侧 25 处引用同批改准；执行日志与报告自身 frontmatter 里的旧路径按「历史不可变」保留不改。

## 防逃逸三件套（示例）
| 件 | 内容 |
|---|---|
| 触发条件 | 每批收尾：执行日志写完、测试读数落盘后、向用户回报前 |
| 唯一落点 | `.ctx/logs/EXECUTION_LOG_INDEX.md` 的「批次索引」表：一行一批（批次 / 日期 / 一句话） |
| 检查方式 | `docs-governance-guard::G6` 断言批次索引表存在且含最新批次行；`ctx-hygiene-guard::⑦` 断言 SNAPSHOT 不再有批次小结 |
