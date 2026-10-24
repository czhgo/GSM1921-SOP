# AGENTS — content/05_ai_coding

## 读什么（最多 3 条）
1. `content/05_ai_coding/README.md`（文件分职与 `read_strategy`）。
2. `REVIEW_QUESTION_SET.md`（审查前置：Q-01…Q-21 逐条回答）。
3. `PARALLEL_SKILL_AUDIT.md` §0（问题集 → 分 lens → 汇总的顺序）。

## 改什么
- 文件操作纪律 → `FILE_OPERATION_RULES.md`。
- 测试 / 验证纪律 → `TEST_AND_VERIFICATION.md` + `DATA_CONSISTENCY_CHECKLIST.md`。
- 文档治理 → `DOCUMENT_GOVERNANCE.md`；上下文管理 → `CONTEXT_MANAGEMENT.md`。
- 评议与表达 → `REVIEW_AND_EXPRESSION.md` + `CASES.md`。
- 多代理审查 → `PARALLEL_SKILL_AUDIT.md`；问题集 → `REVIEW_QUESTION_SET.md` + `QUESTION_HIT_MATRIX.md`。

## 禁什么（3 条硬禁）
1. 不得跳过问题集直接分 lens。判定：每轮审查须有 Q-01…Q-21 的「有 / 无 / 不适用＋理由」记录，并在 `QUESTION_HIT_MATRIX.md` 新增一行。
2. 不得把「必须是什么」的规范判据写进本目录。判定：新增段落若出现祈使式规范或 `SD-` 编号，须改为方法步骤或迁 `content/03` / `content/04`。
3. 不得裸引 `§N` 作为跨篇引用（必须带篇名 + 原编号）。判定：diff 中新增的跨篇 `§N` 逐条带篇名。

## 验证命令
```powershell
# 定向（纯 node，秒级）
cd server; node --test test/claude-parallel-audit.test.mjs test/doc-consistency.test.mjs test/docs-governance-guard.test.mjs
# 全量日常（实测 ≈150s，预算 ≤180s）
cd server; npm run test:daily
# 发布前（预算 ≤1200s；README 实测量级 ≈23 分钟）
cd server; npm run test:full
```

## 交接口
- 规则正文 / 约束力分层：`CLAUDE.md` 甲部 / 乙部。
- 设计判例：`content/04_web_design/design-system/CASES.md`。
- 文档治理规范：`content/03_doc_system/OPERATIONS_GUIDE.md` / `DOC_MAP.md`。
- 执行过程与证据：`.ctx/logs/**`（见 `.ctx/AGENTS.md`）。

## 常见坑
- 改 `PARALLEL_SKILL_AUDIT.md` 九章或 05 `README.md` 登记 → `claude-parallel-audit` C5 / C6 红。
- 把业务 / 设计 / 文档治理的方法论写进 05 → 违反 2026-09-04 分层裁决（05 = 唯一 AI 协作方法论层）。
- 跨篇互引只写 `§14` 不写篇名 → 读者找不到原节（`README.md` 已明令禁止）。

## 防逃逸三件套（示例）
| 件 | 内容 |
|---|---|
| 触发条件 | 审查中发现可复用的新缺陷类型 |
| 唯一落点 | `REVIEW_QUESTION_SET.md` 新增 Q 编号 + `QUESTION_HIT_MATRIX.md` 新增列 |
| 检查方式 | `node --test test/claude-parallel-audit.test.mjs` + 下轮逐条回答 |
