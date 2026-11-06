# Tasks

- [x] Task 1: 五处直接修复
  - [x] SubTask 1.1 删除首页 `dashboard-hero-subtitle`
  - [x] SubTask 1.2 「组织事实」压成一行小标签 + 两列事实，去掉独立 h2 与解释长句
  - [x] SubTask 1.3 `dt` 改「阶段起始日」，删除只读说明
  - [x] SubTask 1.4 删除「仅新增时采集」「同时是登录账号」等冗余小字
  - [x] SubTask 1.5 档案页编号一律显示学号，不显示 `p*`；空值统一 `—`

- [x] Task 2: 下拉控件完整实现「外观」
  - [x] SubTask 2.1 `.cs-option` / `.cs-group-label` / 搜索框 / 空态随 `html.font-size-large` 放大
  - [x] SubTask 2.2 暗色与选中态走既有变量；与 `input-flat` 同档
  - [x] SubTask 2.3 新增 `ui-select-appearance-guard`

- [x] Task 3: 第一轮前端「脏乱繁」平行审查（冗余注释为重点）
  - [x] SubTask 3.1 扫描并分级「只解释内部口径、不提供动作」的文案
  - [x] SubTask 3.2 产出 `UI_REDUNDANCY_AUDIT.md`（原文归档）
  - [x] SubTask 3.3 按「删 / 改 / 立项」处置高置信项
  - [x] SubTask 3.4 把判据写进 `DESIGN_SYSTEM.md`，新增 `ui-redundancy-guard`

- [x] Task 4: 第二轮数据生命周期平行审查
  - [x] SubTask 4.1 空值字段清单 + 是否可写
  - [x] SubTask 4.2 工作流硬编码清单（状态/计数/日期/人数/进度）
  - [x] SubTask 4.3 mock 与代码漂移清单（枚举 / workgroupId / 已撤页签 / 种子）
  - [x] SubTask 4.4 产出 `DATA_LIFECYCLE_AUDIT.md`；高置信项就地修
  - [x] SubTask 4.5 新增 `data-lifecycle-guard`

- [x] Task 5: 验证与提交（Phase 1）
  - [x] SubTask 5.1 `npm run test:daily` 全绿
  - [x] SubTask 5.2 版本戳 bump + 执行日志
  - [x] SubTask 5.3 中文提交：`批次 NNN：界面细化与两轮审查`

- [x] Task 6: 学号唯一 id（**BREAKING**，Phase 2）
  - [x] SubTask 6.1 迁移 v6：p* → 学号/工号，全库人员引用映射，输出映射率
  - [x] SubTask 6.2 mock 与 accounts 全量重写；登录旧 id 仅作迁移期别名
  - [x] SubTask 6.3 界面/链接/导出不再出现 `p*`
  - [x] SubTask 6.4 新增 `identity-student-id-guard`；同步 `p*` 断言
  - [x] SubTask 6.5 `npm run test:daily` 全绿 + 中文提交

# Task Dependencies

- Task 3 / Task 4 可并行（两轮审查）
- Task 3.3 / 4.4 的高置信修复依赖审查结果
- Task 5 依赖 Task 1–4
- Task 6 独立于 Phase 1，必须单独提交

> **回勾依据（2026-10-27 批次 515）**：本文件剩余未勾项经复核均已落地（守卫已存在 / 已提交批次）；逐条依据见 `.ctx/logs/archive/2026-10/specs/SPECS_INDEX.md`。
