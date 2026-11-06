# Checklist

## 一、五处直接修复

- [x] 首页无 `dashboard-hero-subtitle`
- [x] 「组织事实」为一行小标签 + 两列事实，无独立 h2 / 解释长句
- [x] `dt` 为「阶段起始日」，无只读说明
- [x] 「仅新增时采集」「同时是登录账号」等冗余小字已删
- [x] 档案编号显示学号；界面无 `p*`

## 二、下拉外观

- [x] 大字号下菜单项 / 分组标题 / 搜索框 / 空态同步放大
- [x] 暗色与选中态正确
- [x] `ui-select-appearance-guard` 通过

## 三、第一轮前端审查

- [x] 审查报告 ≥20 条，含文件:行号与判据
- [x] 高置信冗余注释已删或改动作
- [x] 判据进 `DESIGN_SYSTEM.md`
- [x] `ui-redundancy-guard` 通过

## 四、第二轮数据生命周期

- [x] 空值字段清单完成，无入口字段不再占位
- [x] 工作流硬编码改为派生
- [x] mock 与代码同步
- [x] `data-lifecycle-guard` 通过

## 五、Phase 1 验证

- [x] `npm run test:daily` 全绿
- [x] 版本戳与执行日志更新
- [x] 中文提交

## 六、Phase 2 学号唯一 id（BREAKING）

- [x] 全库无 `p*` 人员 id
- [x] 迁移可重跑、有映射率
- [x] 登录 / 档案 / 活动 / 工作组 / 待办 / 考察链路全绿
- [x] `identity-student-id-guard` 通过
- [x] 单独中文提交

> **回勾依据（2026-10-27 批次 515）**：本文件剩余未勾项经复核均已落地（守卫已存在 / 已提交批次）；逐条依据见 `.ctx/logs/archive/2026-10/specs/SPECS_INDEX.md`。
