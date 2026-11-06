# Tasks

- [x] Task 1: 受众判据
  - [x] SubTask 1.1 `core/domain/issue-visibility.js::canReadIssue`（report / hidden / assignee / assigneeRole / 当事人）
  - [x] SubTask 1.2 前端读口统一经 `_visibleIssues` 投影
  - [x] SubTask 1.3 服务端 `GET /issues` 复用同一判据
- [x] Task 2: 汇报父键
  - [x] SubTask 2.1 `submitReport` 接受 `workgroupId`，派生 `sourceType/sourceId/sourceName`；API 形态真正落库
  - [x] SubTask 2.2 `report-entry` 可选关联选择器；活动/专班页按上下文预选
  - [x] SubTask 2.3 服务端 `POST /issues` 校验父键归属并落库
  - [x] SubTask 2.4 一键汇报浮窗加「上报党委」链接（仅支书层）
- [x] Task 3: 宣传台撤归档动作
  - [x] SubTask 3.1 移除「归档活动」按钮与写链，保留只读提示
- [x] Task 4: 支部归属
  - [x] SubTask 4.1 `ownBranch` 去回落，写门在无支部时拒绝
  - [x] SubTask 4.2 错误文案统一「请先选择支部」
- [x] Task 5: 顺带修复（真机暴露）
  - [x] SubTask 5.1 角色级未读保留键 `secretary-review` 落库（F-17）
  - [x] SubTask 5.2 通知快照门：`undefined` 与 `false` 等价，消除普通成员误判 403
  - [x] SubTask 5.3 待办过期刷新只写本人行，不替他人落库
- [x] Task 6: 测试与验证
  - [x] SubTask 6.1 新增三件回归测试 + 归档动作守卫
  - [x] SubTask 6.2 `test:daily` 1309/1309；`page-sweep` 16/16
  - [x] SubTask 6.3 bump 版本（20261021a）、日志、提交

# Dependencies

- Task 1 先于 Task 2（父键落库后读口要能投影）
- Task 3/4 独立
