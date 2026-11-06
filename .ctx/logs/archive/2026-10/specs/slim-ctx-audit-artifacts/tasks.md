# Tasks

- [x] Task 1: 审计产物归档与引用改准
  - [x] SubTask 1.1 新建 `.ctx/logs/archive/2026-10/`；把 7 份审计原文移入（`AUDIT_IA_CRITICAL` / `IA_LINK_TRUTH` / `IA_INVENTORY` / `AUDIT_ROUND1` / `AUDIT_ROUND2` / `AUDIT_ROUND3_4` / `WORKBENCH_67_TAB_AUDIT_DRAFT`）
  - [x] SubTask 1.2 `.ctx/snapshots/` 整体移入 `.ctx/logs/archive/2026-10/snapshots/`
  - [x] SubTask 1.3 `server/scripts/ia-inventory.mjs` 输出改归档路径；`ia-critical-guard` / `workbench-audit-coverage` 改读归档路径
  - [x] SubTask 1.4 全站扫描 `.ctx/AUDIT_*`、`.ctx/IA_*`、`.ctx/WORKBENCH_*`、`.ctx/snapshots` 引用并改准（历史日志正文不改写）

- [x] Task 2: 原则与方法沉淀
  - [x] SubTask 2.1 `MODULE_UI_DESIGN.md` 新增「链接真值：角色 × 对象 × 步骤」节（材料闭环四行表 + `focusActivityId` / `highlightType` / `[data-act-id]`）
  - [x] SubTask 2.2 `CLAUDE.md` 新增「`.ctx` 准入与审计产物三去向」与白名单
  - [x] SubTask 2.3 `OPERATIONS_GUIDE.md` 补记录生命周期（产生 → 沉淀 → 归档）
  - [x] SubTask 2.4 `DOC_MAP.md` + `ARCHITECTURE.md` 的 `.ctx` 树只列白名单，审计文件改 archive 路径
  - [x] SubTask 2.5 `TEST_AND_VERIFICATION.md` 补「守卫不得依赖一次性审计产物」
  - [x] SubTask 2.6 `PARALLEL_SKILL_AUDIT.md §11` 补 CTX-01..04 四条 Boolean 规则
  - [x] SubTask 2.7 `content/insights/工程与AI协作的全栈实践.md` 补「审计产物不是知识」

- [x] Task 3: 守卫与验证
  - [x] SubTask 3.1 新增 `server/test/ctx-hygiene-guard.test.mjs`（白名单 / 顶层禁入 / 归档指针 / 生成脚本）
  - [x] SubTask 3.2 登记 `server/package.json` 的 `test:daily`
  - [x] SubTask 3.3 跑 `doc-consistency` / `doc-line-ref` / `timestamps-note-guard` / `frontmatter-freshness` / `ia-critical-guard` / `workbench-audit-coverage` / `ctx-hygiene-guard`
  - [x] SubTask 3.4 跑 `npm run test:daily`，0 断言失败

- [x] Task 4: 提交
  - [x] SubTask 4.1 版本戳 bump；`.ctx/logs/2026-10-EXECUTION_LOG.md` 追加本批
  - [x] SubTask 4.2 中文提交：`批次 NNN：短标题` + Why / What / Verification / Boundaries

# Task Dependencies

- Task 2 与 Task 1 可并行（文档与移动互不依赖）
- Task 3 依赖 Task 1 + 2
- Task 4 依赖 Task 3
