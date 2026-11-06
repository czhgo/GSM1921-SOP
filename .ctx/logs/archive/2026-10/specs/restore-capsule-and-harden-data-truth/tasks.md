# Tasks

> 边界：先修“数据真的走 server”，再修“演示数据窗口”，最后做“正式轨道与收尾”。胶囊是独立视觉项，可与数据线并行。
> 并行边界：Task 1（胶囊）与 Task 2/4 不重叠；Task 3 依赖 Task 2 的缓存/写确认口径；Task 5 依赖 Task 4 的种子形状；Task 6 可与 Task 2 并行；Task 7 依赖 Task 2/3/4；Task 8 最后。

- [x] Task 1: 恢复 8–9 月分组胶囊
  - [x] SubTask 1.1 在 `styles.css` 用 `--app-accent-soft-bg / soft-text` 替换 `.tab-group-label` 的中性底与中性字；`border-radius:3px`、`font-weight:600`、`letter-spacing:0.5px`；保留 `min-height:24px`、全宽可见、`flex-shrink:0`；不得使用 `color-mix()` / `rgba(主题色)`。
  - [x] SubTask 1.2 形状对比：边框改用 `--neutral-400`（对白底约 2.5:1）或新增深一档主题 soft-border token；亮/暗各测一次 ≥1.5:1。
  - [x] SubTask 1.3 同步 `DESIGN_SYSTEM`：SD-3 的 999px 胶囊为 `.tab-group-label` 登记 3px 例外；SD-36 的“非强调色”改为“允许主题 soft 三件套，不得用 strong 实底”；§12.3 改为 token 表述。
  - [x] SubTask 1.4 同步守卫：`ui-contrast-guard::K3` 从 neutral-500 改为主题 soft-text + 对比度；`ui-control-system-guard::V2` 从字面 neutral-400 改为“边框对比 ≥1.5:1”；新增 3px 断言。
  - [x] SubTask 1.5 真机验证 390/768/1024/1280/1440 五档：组名非空、高度 ≥24、圆角 3px、底色为主题 soft、暗色 token 正确。

- [x] Task 2: 缓存边界与服务端优先登录
  - [x] SubTask 2.1 `login-entry.js` / `auth.js` 改为服务端优先：有 server 时先 `POST /api/v1/auth/login`，成功才写 `gsm1921-login-user` 与 token；后端失败显示错误并停留登录页；本地账号层只在静态托管或显式开发模式使用。
  - [x] SubTask 2.2 新增缓存键四类清单（美观 / 会话鉴权 / 业务读缓存 / 临时 UI），落在 `docs/src/data/cache-registry.js` 或等价单一源；`localstorage-key-guard` 断言每个键已登记。
  - [x] SubTask 2.3 业务读缓存加集合版本：api 形态读 `mockDB` 缓存必须同时校验 `collection_versions`；清缓存后重新登录可恢复；纯展示偏好保留。
  - [x] SubTask 2.4 清理只应存在于浏览器的业务写：`member-confirmations` 迁移前存量、`committeeBroadcasts/agendaVotes/memberChangeRequests` 标注，改走语义端点或明确标记“本机未同步”。
  - [x] SubTask 2.5 守卫：新增/扩展 1 个缓存边界断言（美观键白名单、业务键必须带版本、业务写不得本地-only 成功）。

- [x] Task 3: api 形态去 mock 回退 + 写成功可证
  - [x] SubTask 3.1 `loadActivities / loadAttendanceRecords / loadInspectionRecords` 在 api 形态返回空/null，不回退静态种子；空态由页面显式渲染。
  - [x] SubTask 3.2 `NoticeStore.init / SignupStore.init / seedTodos` 在 api 形态不补种子、不 `persist()`；`SEED_FALLBACK` 只在 mock/显式演示模式生效。
  - [x] SubTask 3.3 `persist()` 对“目标集合不在快照 payload”显式失败或走语义端点；禁止直接 resolve；补 `_versions` 缺失的 428 可见提示。
  - [x] SubTask 3.4 断网/失败 outbox：写失败进入 `pending-writes`，显示“未同步”，恢复后重试；不得提示“保存成功”。
  - [x] SubTask 3.5 守卫：新增/扩展 1 个“写成功可证”断言（服务端行/快照请求/语义端点 2xx 三选一）；生产空库访问六台后六表计数为 0。

- [x] Task 4: schema v12 与种子契约
  - [x] SubTask 4.1 `DATA_SEED_CONTRACT` 落盘：必须种子 / 可派生 / 可交叉验证 / 展示专用四类；逐表列必填字段、引用完整性、唯一性、日期窗口、禁止项。
  - [x] SubTask 4.2 种子补 `branchId`：`activities / attendances / inspections / archive_records(materialOnly) / prop_tasks / external_dispatches / handoffs / member_confirmations / auth_audit`；活动通过 `workgroup-seed-sync` 统一归一。
  - [x] SubTask 4.3 v12 迁移：`attendances(activityId,personId)`、`party_groups(branchId,name)`、`attendance_rosters(activityId)`、`workgroup_members(workgroupId,personId)` 唯一索引；`todos.branch_id` 改为生成列或写口同步；不改 v1 基线。
  - [x] SubTask 4.4 统一 `contributions` 为对象数组；`rebuildShadowTables` 加类型守卫；影子表比对不再“同错同绿”。
  - [x] SubTask 4.5 考察人员 ∈ 父工作组：服务端写口补校验；修正 32/42 不符合的种子；若决定放宽模型，必须同步改 `DATA_MODEL` 并说明理由。
  - [x] SubTask 4.6 死表/半死表：`issue_reveals` 确认后 DROP；`committee_broadcasts` 明确保留只读或清理；影子表/证据表进 `NO_READ_ALLOWLIST`。
  - [x] SubTask 4.7 补 `DATA_MODEL` 字段表：语义 7 表、signups、prop_tasks、external_dispatches、member_change_requests、committee_broadcasts、agenda_votes、attendance_rosters；登记 UI 写入但未登记的字段。
  - [x] SubTask 4.8 新增 `seed-contract-guard`：至少 A1–A12 的可机检子集（branchId、唯一性、考察成员、todos 列一致、contributions 形状、辅助表 branchId）。

- [x] Task 5: 四个月演示窗口刷新
  - [x] SubTask 5.1 定义 `DEMO_WINDOW = { from:'2026-08-01', to:'2026-11-30' }` 单一源；所有 mock 日期用它校验。
  - [x] SubTask 5.2 重排活动：7 月 25 场按业务内容重排到 8–10 月；11 月补 2–3 场 `draft/published` 计划活动；保留三会一课/主题党日/其他类型样本。
  - [x] SubTask 5.3 级联重排：考勤/考察/复盘/任务/分工/通知/归档/报名/宣传/周期归档/外发/交接/议题/未读/申诉；每种关键状态至少一条（复盘五态、考勤四态、专班三态）。
  - [x] SubTask 5.4 保留组织骨架与跨期实体：users/branches/party_groups/appointment/auth_audit 不按窗口删；`tf-002` 作为跨期 active 保留，另造 8 月 completed、9 月 dissolved。
  - [x] SubTask 5.5 更新测试锚点：`report / mock-api-parity* / today-summary / agenda-flow / click-cost / inspection-* / round3-4-security / branch-resource-isolation / workgroup-member-editor / taskforce-workgroup-source / issue-audience-projection / form-loop-registry`；固定 ID 改为新窗口内存在或相对夹具。
  - [x] SubTask 5.6 重建运行库：停服 → 备份 → `rebuild-demo --mode demo --out data.new.db` → `integrity_check` + 零孤立引用 → 替换 `data.db` 并删除 wal/shm；不逐表 DELETE。
  - [x] SubTask 5.7 新增窗口守卫：mock 日期必须在窗口内（白名单例外写明理由）；每个集合非空；关键状态覆盖。

- [x] Task 6: 测试残留隔离与清理
  - [x] SubTask 6.1 `test-tier-registry` 增 `fixtureClass`（memory / tmp / external-read / external-write）；`b3-1` 改为 `tmp` 自托管库，清理放 `finally`。
  - [x] SubTask 6.2 修复 `cleanup.mjs`：跳过无 `data` 列的表（`shadow_history / snapshot_conflicts`）；新增 `--test-residue`（默认 dry-run），清 `act-b31-* / att-b31-* / mk-b31-* / act-ce46b61e / todo_seed_7 / 测试通知 / 测试议题` 及其级联；不删真实业务行。
  - [x] SubTask 6.3 新增 `npm run test:clean` 与 `npm run test:full:safe`（跑前备份 → 全量 → 残留清理；失败提示恢复）。
  - [x] SubTask 6.4 新增 `test-isolation-guard`：external-write 测试必须 `DB_PATH != server/data.db` 或有 `finally` 清理证明；测试后不得新增 sessions/孤儿 uploads。
  - [x] SubTask 6.5 明确“测试用例”分层文档：自动化测试套件保留；运行时残留清理；浏览器临时夹具用 `?reset` 或关闭 context。

- [x] Task 7: 正式数据轨道与切换
  - [x] SubTask 7.1 `APP_ENV=production` 未显式 `SEED_FALLBACK` 时注入 `false`；生产库含演示种子行时默认拒绝启动，`ALLOW_DEMO_DATA=1` 才放行。
  - [x] SubTask 7.2 `seed-repair` 在 baseline/生产形态不修复演示 seed id；只读 `seed_meta`。
  - [x] SubTask 7.3 新增 `import-branch.mjs`（CSV/JSON，dry-run + 事务）与 `restore.mjs`（停服校验、integrity、替换 db+uploads、清 wal/shm）；备份脚本保持。
  - [x] SubTask 7.4 只读演练模式：连接生产库副本，写口统一 403/只读提示；`doctor/smoke` 增加只读冒烟。
  - [x] SubTask 7.5 名册导入原子化：`PUT /api/v1/branches/:id/roster` 单事务替换；导入后真实成员可账号密码登录。
  - [x] SubTask 7.6 部署文档更新：`APP_ENV / DISABLE_SEED / SEED_FALLBACK / ALLOW_DEMO_DATA` 四开关矩阵；正式切换步骤与回滚。

- [x] Task 8: 规范、判例与验证
  - [x] SubTask 8.1 `DESIGN_SYSTEM` 增 SD-47（分组胶囊主题 soft + 3px）与 SD-48（缓存边界/写确认/演示窗口）；`DATA_MODEL` 增种子契约指针与 v12；`PRODUCT_IA` 增数据形态说明。
  - [x] SubTask 8.2 `CASES.md` 增 CASE-DESIGN-025（胶囊主题色/圆角回退）与 CASE-DATA-001（mock 写库/假保存）；`CASES_INDEX` 同步。
  - [x] SubTask 8.3 sample-diff 五列：胶囊“没恢复”、测试用例“删数据不是删测试”、四个月窗口“重排不是删除”、缓存“读缓存不是权威”。
  - [x] SubTask 8.4 执行日志批次 513 六节 + SNAPSHOT 5 行 + TIMESTAMPS + GUARD_INVENTORY（新增 2 个守卫）。
  - [x] SubTask 8.5 验证：定向（ui/seed/db/test-isolation/auth/data）→ daily → 起服务真机（胶囊五档 + 六台空库/演示库 + 登录）→ 全量三通道；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 1 与 Task 2/4 并行，不依赖数据线。
- Task 3 依赖 Task 2 的缓存/写确认口径；Task 2 与 Task 6 可并行。
- Task 5 依赖 Task 4 的种子形状与 v12 字段；未完成 Task 4 不得重排日期。
- Task 7 依赖 Task 2/3/4；Task 8 最后写。
- 任何“删旧数据”动作必须排在备份与重建脚本可用之后。
