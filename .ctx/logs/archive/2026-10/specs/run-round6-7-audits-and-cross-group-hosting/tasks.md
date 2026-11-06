# Tasks

- [x] Task 0: 遗留盘点与口径确认（先做，避免重复劳动）
  - [x] SubTask 0.1 逐条读 `CLAUDE.md` 乙部 `B-500-*`、`.ctx/REVIEW_QUEUE.md`、`.ctx/ENGINEERING_ASSESSMENT.md §四`、`UI_REDUNDANCY_AUDIT_R2.md`、`AUDIT_R5_A/B/C`、`DATA_LIFECYCLE_AUDIT(_R2).md`，列「仍存在 / 已解决 / 待裁定」三栏
  - [x] SubTask 0.2 能在本轮并入的并入 Task 5/6，不能的写清原因与下一轮（第八轮最小三成本、第九轮功能与美观＋全栈数据结构）
  - [x] SubTask 0.3 涉及制度口径 / 权限边界 / 跨角色行为的选择，用 `AskUserQuestion` 呈报后再动手；结论落执行日志

- [x] Task 1: 跨组口径落数据层（BREAKING）
  - [x] SubTask 1.1 `constants.js`：`ACTIVITY_SCOPES` 生产路径只产出 `party-group` / `branch`；`cross-group` 降为读取别名；新增 `normalizeOrganizingScope()` 供迁移、mock、服务端共用
  - [x] SubTask 1.2 `domain.js` typedef 与 `DATA_MODEL.md §2.1/§2.3`：`organizingScope` 两档；「跨组」只由 `recruitmentScope`/成员 `crossGroup` 表达；`hostGroupId` 非支部级必填
  - [x] SubTask 1.3 `server/db.js` 迁移 `v10`：`cross-group → party-group`；保留 `hostGroupId`；缺失承办组标 `legacyHostGroup`；成员含跨组深参但无 `recruitmentScope` 时补 `cross-group` ＋ 组织委员协调人；幂等
  - [x] SubTask 1.4 `workgroup-seed-sync.js` / mock 种子：镜像落点归一；不为旧 mock 保留 `cross-group` 落点

- [x] Task 2: 服务端写门
  - [x] SubTask 2.1 `activityCreationDeny`：非支部级一律要求承办组并落 `party-group`；入参 `cross-group` 先归一（不拒绝），响应回写归一值
  - [x] SubTask 2.2 组织者校验：组织者不属于承办组且无 `organizerExceptionReason` → 400（文案可懂）；有说明则放行并留存
  - [x] SubTask 2.3 工作组创建 / 成员写入镜像同步两档落点；跨组深参仍需招募标记 ＋ 协调人（保持既有判据）
  - [x] SubTask 2.4 旧活动编辑 / 组织台补选：写 `party-group`；`legacyHostGroup` 补选后才可保存

- [x] Task 3: 前端写入与展示
  - [x] SubTask 3.1 支书台写入：非支部级固定写 `party-group` ＋ 必选承办组；跨组仅由「需从其他党小组招募深参」表达；取消 `ACTIVITY_SCOPES.CROSS_GROUP` 写入
  - [x] SubTask 3.2 组织者选择器：默认只列承办组；切「显示全部成员」选他组时强制填说明；前端拦截无说明提交
  - [x] SubTask 3.3 组长台写入：组内落点保持 `party-group`；跨组深参自动标记招募与协调人（既有逻辑回归）
  - [x] SubTask 3.4 展示措辞：`activity-progress` / 组织台协调清单 / 成员编辑器 / 工作组镜像统一「承办党小组：X ＋ 跨组招募 N 人（组织委员协调）」，清除「跨组承办」

- [x] Task 4: 测试与守卫（与 Task 1–3 同批）
  - [x] SubTask 4.1 改造既有夹具：`activity-party-group-assignment`、`cross-group-recruitment`、`workgroup-api`、`permission-gate`、`policy-config`、`activity-block-gate`、`workgroup-member-editor`
  - [x] SubTask 4.2 新增：① 旧 `cross-group` 入参归一为 `party-group`（201 且回写）② 他组组织者无说明 → 400 ③ 有说明 → 201 ④ 迁移 v10 幂等与 legacy 标记
  - [x] SubTask 4.3 `db-migration` 补 v10 用例；新测试登记到 `test-tier-registry`（只降不升）

- [x] Task 5: 第六轮前端脏乱繁复审（「繁」＝此地无银注释）
  - [x] SubTask 5.1 用 ≥3 个前端设计 skill 并行只读审查（实际 4 路：`frontend-design` / `design-with-taste` / `better-writing` / `web-design-guidelines`），各带独立 lens
  - [x] SubTask 5.2 产出 `.ctx/logs/2026-10-AUDIT_R6_FRONTEND.md`：39 条（P1 6 / P2 12 / P3 21），含 `文件:行号`、删除后判据与 sample-diff 表
  - [x] SubTask 5.3 本轮修 P1/P2（P2 中 `server/seed.js` 与 `constants.js` 两处按禁区/立项登记 `B-502-3`）；P3 登记乙部
  - [x] SubTask 5.4 复跑相关静态守卫（copy-length / copy-master / dead-selector / small-text 等）全部通过

- [x] Task 6: 第七轮数据生命周期
  - [x] SubTask 6.1 空值清单：13 条，逐条给处置（补入口 / 隐藏或标注归属 / 派生）
  - [x] SubTask 6.2 硬编码清单：15 条，角色/状态集合、人数、时限、支部 id 等改单一源或现算
  - [x] SubTask 6.3 mock 漂移：8 条，`enrollYear` 等随代码同批更新并过 parity
  - [x] SubTask 6.4 产出 `.ctx/logs/2026-10-AUDIT_R7_DATA.md`（36 条：P1 1 / P2 12 / P3 23，含 sample-diff），P1/P2 本轮修
  - [x] SubTask 6.5 旧审计逐条回读：已消解项标「已消解（附证据）」；`u_*` 一条按证据修正原判

- [x] Task 7: 台账、验证与交付
  - [x] SubTask 7.1 `SECRETARY_DIRECTIVES.md` P-018 补本轮原话与「跨组不是第三落点」；`DECISION_LOG` 新增 `D-826`
  - [x] SubTask 7.2 `README-server.md` / `SYSTEM_ROLE_PERMISSION.md` / SOP 母本 / `DATA_MODEL.md` 同步；`CLAUDE.md` 乙部登记 `B-502-1…7`
  - [x] SubTask 7.3 `ENGINEERING_ASSESSMENT §四`、`TIMESTAMPS`、执行日志批次 502、版本戳 `20261022c`
  - [x] SubTask 7.4 验证：daily **1396/1396**；全量 **[node] 1398/1398 · [e2e-A] 57+1skip · [e2e-B] 179/179**（0 失败，1171.8s）；六项守卫 61/61
  - [x] SubTask 7.5 中文提交（不 push），体例：批次 502 ＋ Why / What / Verification / Boundaries

# Task Dependencies

- Task 1 是 Task 2 / 3 / 4 的前提（口径先定）
- Task 2 / 3 / 4 同批（改门必须同批改判据与夹具）
- Task 5 与 Task 6 在 Task 1–4 落地后**并行**（两轮审查互不依赖）
- Task 5 / 6 的修复若与 Task 1–4 同文件，按 Task 1–4 的最终口径为准
- Task 7 最后；Task 0 最先
