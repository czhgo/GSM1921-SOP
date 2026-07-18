---
title: "流程指南文档索引"
type: index
role: "[用户]+[AI]"
last_updated: "2026-07-14"
status: active
---

## 术语与党建/党务工作定义

> 本段为 sop/ 目录下所有文件共享的术语权威源。各 sop/ 文件仅引用本段，不再重复定义。

**支部党员** = 党员 + 预备党员

**支部成员** = 党员 + 预备党员 + 发展对象 + 积极分子

不使用"普通党员"等具有层级性的表述。

**条条** = 纵向职能线（组织委员/宣传委员/纪检委员）

**块块** = 横向党小组（各党小组组长）

**党建工作** = 服务同学们的核心职能（办好活动、探索创新）→ 党建工作台

**党务工作** = 确保组织合规运行（发展党员、党费缴纳、档案管理）→ 党务管理

**党建与党务工作简明定义**：党建工作办好活动、探索创新边界，是支部服务同学们的核心职能；党务工作保证组织稳定、合理、准确运行，是组织的底线保障。详见 [DATA_ARCHITECTURE.md](../design/DATA_ARCHITECTURE.md)。

---

## SOP Navigation

| SOP 文档 | 用途 | 责任人 | 关联 Schema 字段 |
|----------|------|--------|------------------|
| 组织委员工作流程指南.md | 描述组织委员职责与活动创建流程（考察档案、思想汇报归档、发展党员材料复核） | 组织委员 | `Activity.executor`, `Activity.supervisor`, `Task.status` |
| 纪检委员工作流程指南.md | 描述纪检委员职责与考勤管理流程（三会一课考勤、活动考察记录、意见建议反馈） | 纪检委员 | `Activity.status`, `AttendanceRecord.status`, `AttendanceRecord.recordedBy` |
| 宣传委员工作流程指南.md | 描述宣传委员职责与宣传档案制度流程（支部大会宣传、活动材料归档、模板体系建设） | 宣传委员 | `Activity.type`, `Activity.title` |
| 党小组组长工作手册.md | 党小组组长专用操作指南——党小组日常活动组织、条块协作、数据提交流程 | 党小组组长 | `Activity.executor`, `Activity.supervisor` |
| 常见工作场景快速指南.md | 为所有支委和党小组成员提供常见工作场景（党建工作、党务管理）的快速操作指南 | 支部书记 | `Activity.type`, `Activity.status`, `Activity.executor`, `Activity.supervisor` |
| 支委与党小组定人定责定岗说明.md | 说明支委会成员与党小组的人员结构、双重身份体系及条条块块双线管理协调机制 | 支部书记 | `Activity.executor`, `Activity.supervisor` |

---

## Reconciliation — Checkpoint 5

Physical `.md` files in `content/sop/` (excluding `INDEX.md` itself):

| 物理文件 | 是否已登记 |
|---------|----------|
| `党小组组长工作手册.md` | ✅ 已登记 |
| `组织委员工作流程指南.md` | ✅ 已登记 |
| `纪检委员工作流程指南.md` | ✅ 已登记 |
| `宣传委员工作流程指南.md` | ✅ 已登记 |
| `常见工作场景快速指南.md` | ✅ 已登记 |
| `支委与党小组定人定责定岗说明.md` | ✅ 已登记 |

**结论：** 无孤岛 SOP，物理账本与导航索引 100% 对齐。✅
