---
title: "流程指南文档索引"
type: index
role: "[人机]"
last_updated: "2026-05-15"
status: active
---

## SOP Navigation

| SOP 文档 | 用途 | 责任人 | 关联 Schema 字段 |
|----------|------|--------|------------------|
| 组织委员工作流程指南.md | 描述组织委员职责与活动创建流程（考察档案、思想汇报归档、党员发展材料复核） | 组织委员（侯嘉嵘） | `Activity.executor`, `Activity.supervisor`, `Task.status` |
| 纪检委员工作流程指南.md | 描述纪检委员职责与考勤管理流程（三会一课考勤、活动参与记录、意见建议反馈） | 纪检委员（韩思宁） | `Activity.status`, `AttendanceRecord.status`, `AttendanceRecord.recordedBy` |
| 宣传委员工作流程指南.md | 描述宣传委员职责与宣传档案制度流程（支部大会宣传、活动材料归档、模板体系建设） | 宣传委员（闫鑫岳） | `Activity.type`, `Activity.title` |
| 党小组组长工作手册.md | 块块组长专用操作指南——党小组日常活动组织、条块协作、数据提交流程 | 党小组组长 | `Activity.executor`, `Activity.supervisor` |
| 常见工作场景快速指南.md | 为所有支委和党小组成员提供常见工作场景（党建工作、党务管理）的快速操作指南 | 支部书记（储子禾） | `Activity.type`, `Activity.status`, `Activity.executor`, `Activity.supervisor` |
| 支委与党小组定人定责定岗说明.md | 说明支委会成员与党小组的人员结构、双重身份体系及条条块块双线管理协调机制 | 支部书记（储子禾） | `Activity.executor`, `Activity.supervisor` |

---

## Reconciliation — Checkpoint 5

Physical `.md` files in `content/SOP/` (excluding `INDEX.md` itself):

| 物理文件 | 是否已登记 |
|---------|----------|
| `党小组组长工作手册.md` | ✅ 已登记 |
| `组织委员工作流程指南.md` | ✅ 已登记 |
| `纪检委员工作流程指南.md` | ✅ 已登记 |
| `宣传委员工作流程指南.md` | ✅ 已登记 |
| `常见工作场景快速指南.md` | ✅ 已登记 |
| `支委与党小组定人定责定岗说明.md` | ✅ 已登记 |

**结论：** 无孤岛 SOP，物理账本与导航索引 100% 对齐。✅
