# Checklist

## 一、`.ctx` 顶层准入

- [x] 顶层只剩 `logs/`、`evidence/`、`TIMESTAMPS.md`、`SNAPSHOT.md`、`REVIEW_QUEUE.md`、`ACTIVE_RULINGS.md`、`ENGINEERING_ASSESSMENT.md`
- [x] 顶层没有 `AUDIT_*` / `IA_*` / `*_DRAFT.md`
- [x] 顶层没有 `snapshots/`

## 二、审计产物归档

- [x] 7 份审计原文均在 `.ctx/logs/archive/2026-10/`
- [x] `snapshots/` 在 `.ctx/logs/archive/2026-10/snapshots/`
- [x] 每份归档文件在正式文档或执行日志中有指针（`OPERATIONS_GUIDE §10.7` 归档索引）
- [x] `ia-inventory.mjs` 输出路径已改且可重跑（62 tab / 114 links）
- [x] `ia-critical-guard` / `workbench-audit-coverage` 改读归档路径后全绿
- [x] 历史日志正文未被改写

## 三、原则与方法沉淀

- [x] `MODULE_UI_DESIGN.md` 有「链接真值」节，含四行角色表与深链契约
- [x] `CLAUDE.md` 有 `.ctx` 准入白名单与三去向（H26.3）
- [x] `OPERATIONS_GUIDE.md` 有记录生命周期（§10.7）
- [x] `DOC_MAP.md` / `ARCHITECTURE.md` 的 `.ctx` 树与实况一致
- [x] `TEST_AND_VERIFICATION.md` 有「守卫不得依赖一次性审计产物」
- [x] `PARALLEL_SKILL_AUDIT.md §11` 有 CTX-01..04
- [x] `insights` 有「审计产物不是知识」

## 四、守卫与验证

- [x] `ctx-hygiene-guard` 通过并登记 `test:daily`
- [x] `doc-consistency` / `doc-line-ref` / `timestamps-note-guard` / `frontmatter-freshness` 全绿
- [x] `npm run test:daily` 0 断言失败

## 五、边界

- [x] 未删除 `.ctx` 目录
- [x] 未搬走 `logs/`、`evidence/` 与 5 份台账
- [x] 未复制审计原文（archive 唯一一份）
- [x] 未改业务功能 / 表结构
- [x] 提交为中文标题 + Why / What / Verification / Boundaries
