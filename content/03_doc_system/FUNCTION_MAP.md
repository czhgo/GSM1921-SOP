# 系统功能地图与服务逻辑（FUNCTION_MAP）

> 本文件由 `node docs/scripts/gen-function-mermaid.mjs --write` 自动生成，勿手改；功能清单以 `docs/src/core/function-catalog.js` 为准。

## 功能地图

通用能力与支部特有以下方（通用）/（特有）文本标注区分。

```mermaid
mindmap
  root((系统功能))
    党建
      活动创建（通用）
      会议议程（通用）
      三会一课（通用）
      主题党日（通用）
      活动报名（通用）
      赋权管理（通用）
      通知发布（通用）
    党务
      发展党员（通用）
      人才库（通用）
      考察记录（通用）
      考勤管理（通用）
      补课制度（特有）
      复盘评议（通用）
      思想汇报（通用）
      成员变更审批（特有）
      成员变更审批链（特有）
      思想汇报流程（通用）
      补课回写流程（特有）
    宣传与档案
      宣传任务（通用）
      项目看板（通用）
      周报报送（通用）
      支部文件（通用）
      公邮管理（特有）
      归档库（通用）
    活动与专班
      专班发起（通用）
      招募统筹（通用）
      定人定责定岗（通用）
      外派任务（特有）
      活动全链路（通用）
      专班流程（通用）
    公共
      首页（通用）
      资料查询（通用）
      意见反馈（通用）
      个人待办（通用）
      个人考勤（通用）
      帮助（本页）（通用）
      关于（通用）
      架构分层（通用）
      服务依赖（通用）
      数据变更链路（通用）
    角色工作台
      书记工作台（通用）
      组织委员工作台（通用）
      宣传委员工作台（通用）
      纪检委员工作台（通用）
      党小组组长工作台（通用）
      成员工作台（通用）
```

## 业务链路

### 活动全链路（通用）

```mermaid
flowchart TD
A[书记/组长创建活动] --> B[议程：讨论文件 / 待讨论名单]
B --> C[会后记录「通过」]
C --> D[草案自动归档]
D --> E[资料查询展示「经《活动》讨论通过」]
```

### 成员变更审批链（特有）

```mermaid
flowchart TD
A[议程「待讨论名单」记录通过] --> B[生成成员变更申请]
B --> C[组织委员审批通过]
C --> D[广播通知全体支委]
D --> E[书记确认]
E --> F[发展阶段更新]
```

### 专班流程（通用）

```mermaid
flowchart TD
A[发起专班] --> B[组织委员招募统筹]
B --> C[定人定责定岗]
C --> D[工作量记录]
```

### 思想汇报流程（通用）

```mermaid
flowchart TD
A[成员提交思想汇报] --> B[自动入库归集]
B --> C[组织委员查看归档]
```

### 补课回写流程（特有）

```mermaid
flowchart TD
A[缺勤记录] --> B[生成补课任务]
B --> C[完成补课]
C --> D[考勤回写 / 逾期清除]
```

## 架构分层

```mermaid
flowchart TD
  A[前台 · 14 页面] --> B[中台 · entries / components / core]
  B --> C[服务层 · services / mock]
  C --> D[后端 · server / REST API]
  D --> E[母本 · content/02_institution/sop]
  E -.制度驱动.-> B
```

## 服务依赖

```mermaid
flowchart LR
  activity --> attendance
  attendance --> review
  review --> todo
  notification --> todo
  agenda --> branch-doc
  branch-doc --> search
```
