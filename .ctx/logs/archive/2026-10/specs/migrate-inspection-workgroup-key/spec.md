# 考察记录 workgroupId 迁移 Spec

## Why

`.ctx/AUDIT_ROUND3_4_COMBINED.md` R4-D04：专班考察以 `sourceName === sourceId` 字符串挂载，记录本身没有 `workgroupId` / `taskforceId`。后果：
- 专班改名即断链；
- 同名专班串数据；
- 服务端无法按工作组校验成员与支部归属；
- 历史考察无法稳定反查。

本 spec 单独做结构迁移，不混进 IA 专项；不改表结构（记录为 JSON 行），只补字段、回填与查询口径。

## What Changes

- 考察记录新增 `workgroupId`（首选）与 `taskforceId`（兼容快照）；`sourceName` 只保留为展示快照。
- 新增记录时由专班/工作组上下文写入；活动类考察保留 `activityId`，专班类必须写 `workgroupId`。
- 查询、成员校验、支部校验、确认/删除写门全部改走 `workgroupId`；不再用名称匹配。
- 历史数据回填：按 `sourceName` + `taskforceId` + 现有 `workgroups` 映射；无法回填的标 `legacy:true` 并保留只读。
- mock 数据可重写；不要求兼容旧名称匹配。

## Impact

- `docs/src/core/domain/domain.js`（typedef）、`docs/src/services/activity/inspection.js`、`server/routes/resources/**`（写门/读口）、`docs/src/data/mock-adapter.js`（迁移/回填）、`content/04_web_design/data/DATA_MODEL.md`。
- 不改 SQLite 表结构；考察记录在 JSON 行内新增字段。

## Acceptance

- 新建专班考察记录必带 `workgroupId`；活动类必带 `activityId`。
- 专班改名后考察仍可按 `workgroupId` 查到；同名专班不串数据。
- 历史记录回填率有读数；无法回填项 `legacy:true` 只读，不参与写门。
- 确认/删除/成员校验按 `workgroupId` 复算；跨支部/跨组拒绝。
- 迁移脚本可重跑、幂等；mock/api 两形态一致。

## Non-goals

- 不改表结构；不做 UI 改版。
- 不把 `sourceName` 立即删除（保留只读展示）。
- 不与 IA 专项的 tab/链接修复混合提交。
