---
title: "流程指南文档索引"
type: index
role: "[用户]+[AI]"
last_updated: "2026-08-09"
status: active
---

## 术语与党建/党务工作定义

> 本段为 sop/ 目录下所有文件共享的术语权威源。各 sop/ 文件仅引用本段，不再重复定义。

**支部党员** = 党员 + 预备党员

**支部成员** = 党员 + 预备党员 + 发展对象 + 积极分子

不使用"普通党员"等具有层级性的表述。

**条条** = 纵向职能线（组织委员/宣传委员/纪检委员）

**块块** = 横向党小组（各党小组组长）

**党建工作** = 党为保持先进性纯洁性而开展的自我建设（涵盖政治建设、思想建设、组织建设、作风建设、纪律建设，并把制度建设贯穿其中）；组织活动（三会一课、主题党日、专班）归此 → 工作台

**党务工作** = 党内事务的具体管理工作（包括党员发展、党员教育管理、组织生活、党内选举、党费收缴管理等）；发展党员、民主评议党员、换届选举、考勤考察归此 → 工作台

> 两者都是"管理事，服务人"的工作。定义依据 [USAGE_POLICY.md §1.1.1](../../03_doc_system/USAGE_POLICY.md)（T1 官方定义）；旧两分法（党建工作=管理组织活动之事、党务工作=管理人员发展之事，P-006）已降级为 T2 约定表达，仅作理论讲解，不再作为网页设计依据。详见 [DATA_ARCHITECTURE.md](../../04_web_design/DATA_ARCHITECTURE.md)。

---

## SOP Navigation

| SOP 文档 | 用途 | 责任人 | 关联 Schema 字段 |
|----------|------|--------|------------------|
| 组织委员工作流程指南.md | 描述组织委员职责与活动创建流程（考察档案、思想汇报归档、发展党员材料复核） | 组织委员 | `Activity.executor`, `Activity.supervisor`, `Task.status` |
| 纪检委员工作流程指南.md | 描述纪检委员职责与考勤管理流程（三会一课考勤、活动考察记录、意见建议反馈） | 纪检委员 | `Activity.status`, `AttendanceRecord.status`, `AttendanceRecord.recordedBy` |
| 宣传委员工作流程指南.md | 描述宣传委员职责与宣传档案制度流程（支部大会宣传、活动材料归档、模板体系建设） | 宣传委员 | `Activity.type`, `Activity.title` |
| 党小组组长工作手册.md | 党小组组长专用操作指南——党小组日常活动组织、条块协作、数据提交流程 | 党小组组长 | `Activity.executor`, `Activity.supervisor` |
| 常见工作场景快速指南.md | 为所有支委和党小组成员提供常见工作场景（党建工作、党务工作）的快速操作指南 | 支部书记 | `Activity.type`, `Activity.status`, `Activity.executor`, `Activity.supervisor` |
| 支委与党小组定人定责定岗说明.md | 说明支委会成员与党小组的人员结构、双重身份体系及条条块块双线管理协调机制 | 支部书记 | `Activity.executor`, `Activity.supervisor` |

---

## Reconciliation — Checkpoint 5

Physical `.md` files in `content/02_institution/sop/` (excluding `INDEX.md` itself):

| 物理文件 | 是否已登记 |
|---------|----------|
| `党小组组长工作手册.md` | ✅ 已登记 |
| `组织委员工作流程指南.md` | ✅ 已登记 |
| `纪检委员工作流程指南.md` | ✅ 已登记 |
| `宣传委员工作流程指南.md` | ✅ 已登记 |
| `常见工作场景快速指南.md` | ✅ 已登记 |
| `支委与党小组定人定责定岗说明.md` | ✅ 已登记 |

**结论：** 全部 SOP 均已登记，物理账本与导航索引 100% 对齐。
