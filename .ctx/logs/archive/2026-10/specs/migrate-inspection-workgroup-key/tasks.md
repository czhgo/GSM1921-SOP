# Tasks

- [x] Task 1: 字段与写口
  - [x] SubTask 1.1 domain typedef 增加 `workgroupId` / `taskforceId` / `legacy`
  - [x] SubTask 1.2 新建专班考察写入 `workgroupId`；活动类写 `activityId`
  - [x] SubTask 1.3 `sourceName` 降为展示快照，不再作为关联键
- [x] Task 2: 历史回填
  - [x] SubTask 2.1 迁移脚本按 `sourceName` + `taskforceId` + `workgroups` 回填
  - [x] SubTask 2.2 无法回填标 `legacy:true` 只读；输出回填率
  - [x] SubTask 2.3 迁移幂等、可重跑
- [x] Task 3: 查询与权限
  - [x] SubTask 3.1 查询/成员校验/支部校验改 `workgroupId`
  - [x] SubTask 3.2 确认/删除写门按 `workgroupId` 复算
  - [x] SubTask 3.3 跨支部/跨组拒绝测试
- [x] Task 4: 验证
  - [x] SubTask 4.1 改名后仍可查；同名专班不串
  - [x] SubTask 4.2 mock/api 一致；迁移回填率达标
  - [x] SubTask 4.3 DATA_MODEL 同步

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3 依赖 Task 1 + 2
- Task 4 依赖全部
