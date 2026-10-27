# Tasks

- [x] Task 1: 数据模型与口径定稿
  - [x] SubTask 1.1 `ActivityRecord`：非支部级活动 `hostGroupId` 必填；`cross-group` 只表示可跨组参与/招募；支部级会议 `branch`；新增 `recruitmentScope`（`group|cross-group`）、`crossGroupCoordinatorId`、`legacyHostGroup`
  - [x] SubTask 1.2 `WorkGroupMember`：新增可选 `crossGroup`、`coordinatedBy`、`coordinatedAt`（仅跨组深参写入）
  - [x] SubTask 1.3 `DATA_MODEL.md §2.1 / §2.3` 同步字段、必填条件与语义；旧 `hostGroup` 仅留展示兼容
- [x] Task 2: 服务端校验与迁移
  - [x] SubTask 2.1 活动创建/编辑门：跨组必须带 `hostGroupId`；组内活动责任组固定本组；支部级会议单列 `branch`；缺组拒绝并给可读文案
  - [x] SubTask 2.2 工作组成员写门：成员须同支部；跨党小组深参必须有跨组标记＋协调人，否则拒绝（批量与单加同判据）
  - [x] SubTask 2.3 迁移 v8：支部级重分类 / 可判定旧行补承办范围 / 其余标 `legacyHostGroup:true`；重复执行幂等
  - [x] SubTask 2.4 mock / seed 同步：`normalizeSeedActivityOrganizing` 单一源补齐字段；不新增演示账号、不伪造人数
- [x] Task 3: 创建与编辑表单
  - [x] SubTask 3.1 支书台跨组活动：新增「责任党小组」必选；取消 `hostGroupId: null` 硬编码
  - [x] SubTask 3.2 组长台组内活动：责任组锁定本组；跨组深参自动标记招募并指定组织委员
  - [x] SubTask 3.3 组织者选择器：跨组组织者软提示＋`organizerExceptionReason` 留痕（支书台与组长台）
  - [x] SubTask 3.4 编辑历史 `legacyHostGroup` 活动：组织台「待补责任党小组」补选后才可保存
- [x] Task 4: 跨组深参招募与组织委员协调
  - [x] SubTask 4.1 深参选择器/成员行显示所属党小组；跨组时要求先标记跨组招募并指定协调人（默认组织委员）
  - [x] SubTask 4.2 成员行写 `crossGroup/coordinatedBy`；活动镜像同形；历史行只读标注
  - [x] SubTask 4.3 组织台新增「跨组招募待协调」清单：活动 / 责任组 / 跨组深参 / 协调状态；可就地标记协调完成
  - [x] SubTask 4.4 协调动作不扩大活动写权；空态给 `—` 与下一步
- [x] Task 5: content 文档与治理落盘
  - [x] SubTask 5.1 `SECRETARY_DIRECTIVES.md` 收录本轮原话（P-018，逐字＋日期）
  - [x] SubTask 5.2 `组织委员工作流程指南.md` 写清「跨组招募由组织委员协调」；`党小组组长工作手册.md` 写清「组织者一般本组、跨组深参须协调」
  - [x] SubTask 5.3 `PARALLEL_SKILL_AUDIT §11.3` 增 Boolean 规则 AP-IA-09/10
  - [x] SubTask 5.4 `CLAUDE.md` 乙部按实际批次登记剩余工作（B-499-1…10）
  - [x] SubTask 5.5 frontmatter / TIMESTAMPS 同批刷新；全仓 Grep 旧口径零残留
- [x] Task 6: 测试与守卫
  - [x] SubTask 6.1 新增 `activity-party-group-assignment`：跨组必填责任组 / 组内锁定本组 / branch 推断 / legacy 补选
  - [x] SubTask 6.2 新增 `cross-group-recruitment`：跨组深参无标记拒绝、有标记写 `crossGroup/coordinatedBy`、协调面可标记完成
  - [x] SubTask 6.3 迁移回归：`db-migration` M7 覆盖重分类 / legacy / 幂等
  - [x] SubTask 6.4 同步既有活动创建、工作组、权限门测试；新测试登记 `test:daily`
- [x] Task 7: 验证与交付
  - [x] SubTask 7.1 分层测试 / 真机（创建跨组活动 → 选责任组 → 加跨组深参 → 组织委员协调）
  - [x] SubTask 7.2 bump 版本戳并复跑 version-stamp
  - [x] SubTask 7.3 执行日志（Why / What / Verification / Boundaries / sample-diff）＋ 中文提交

# Task Dependencies

- Task 2 / 3 / 4 依赖 Task 1 的字段与口径
- Task 5 依赖 Task 1–4 的最终口径
- Task 6 与 Task 2–4 同批（改判据必须与改实现同批）
- Task 7 最后
