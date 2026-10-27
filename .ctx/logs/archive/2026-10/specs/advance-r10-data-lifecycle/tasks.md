# Tasks

- [x] 第 1 批：数据安全（先做，任何 UI 修复都排在其后）
  - [x] SubTask 1.1 语义写口统一 bump 集合版本（D02 / D12 / D16）
    - `system-notices.js` 系统通知插入后 bump `notices`；
    - 通用资源 `POST/PATCH/DELETE` 成功后 bump 对应集合；
    - 工作组单加/单删成员、授权授予/撤回、产出登记分别 bump `workgroup_members / workgroup_grants / workgroup_outputs`；
    - `PATCH /branches/:id/config` 与创建支部后 bump `branches`；通用 `PATCH /branches/:id` 不得写 `config`。
  - [x] SubTask 1.2 专班移出保留贡献（D01）
    - 服务端与 mock 把整行 `filter` 改为 tombstone（`status:'removed'`，保留 `contributions`）；
    - `workgroup_outputs` 落 `personId/kind/contributionId`；
    - 补「移出后贡献仍可回查」断言。
  - [x] SubTask 1.3 API 形态不再注入周期归档演示种子（D03）
    - `weekly-tab.js` 空表回退只在 `DATA_SOURCE==='mock'`；
    - API 形态空表给空态；补「其他支部访问后保存不被 403」用例。
  - [x] SubTask 1.4 考察快照留痕（D09）
    - 快照新增行强制 `recordedBy=actor.id`；确认/打回变更强制 `confirmedBy/returnedBy=actor.id`，与 PATCH 同判据。
  - [x] SubTask 1.5 恢复归档回收工作组（D05）
    - `activity-workgroup-sync` 在 `archived===false && status!=='cancelled'` 时回写 `active`；
    - 补「归档→恢复→成员可写」断言。
  - [x] SubTask 1.6 无父键归属 fail-closed（D14）
    - inspections/archiveRecords 建行补 `branchId`；无父键且无法确定归属 ⇒ 400 并提示补父键，不再落 `br-b1`。
  - [x] SubTask 1.7 删除幽灵操作人兜底（C15）
    - `taskforce-tab.js` / `prop/weekly-tab.js` 去掉 `u_org/u_prop`；会话缺失时拒绝写入并提示重新登录。

- [x] 第 2 批：种子与 mock（按产品口径重做）
  - [x] SubTask 2.1 用户可编辑字段归 `runtimeFields`（C01–C04、C17、C18）
    - `partyGroups.name/note`、`thoughtReports.content/submittedAt`、`activities.title/date/location`（及同批可编辑内容字段）、`notices.title/content/priority/expireDate/audience/audiencePersons`；
    - 删除僵尸登记 `executor/supervisor`；补齐考勤/考察/专班缺登记字段与 typedef。
  - [x] SubTask 2.2 种子派生复用产品同步（C05、C09）
    - `workgroup-seed-sync` 调 `syncActivityWorkgroup()`；取消活动 ⇒ `archived`；
    - 工作组补 `createdBy`；taskforces 补 `branchId`（C08）。
  - [x] SubTask 2.3 删除/改写违反制度的演示行（C06、C07、C12、C19、C20、B21）
    - 删除新造支委会考勤（含 `act-27` 待确认）；历史行标「制度调整前」；
    - 报名样本改挂运行中专班，仅 `organizer/deep`；
    - 10 月窗口平移到当前日期并同步通知/待办/报备正文；
    - 补课种子改相对日期；删除 `reviewSummary`、`WEEKLY_REPORTS_SEED`，`taskforces.activityId` 填真实关联或明确不再维护。
  - [x] SubTask 2.4 补确认痕迹（C10、C11）
    - 已确认考察补 `confirmedBy/confirmedAt`；已确认考勤补 `confirmed:true/confirmedBy/confirmedAt`，`recordedBy` 保持上传语义。
  - [x] SubTask 2.5 mock 与 API 对等（C13、C14、C16）
    - `_mockSeedSources` 由 manifest 生成，覆盖全部集合；
    - 8 个仅服务端集合迁到 mock 同源播种，或标 `api-only` 并给空态原因；
    - mock 工作组写口统一调 `isWorkgroupWritableStatus`。

- [x] 第 3 批：制度与单一源
  - [x] SubTask 3.1 SOP 任务可执行（B01–B03、B09、B13）
    - 支委会不生成考勤节点；党小组会执行人＝该场组织者/本组组长；
    - 复盘提醒/截止由 `review.deadlineDays` 与 `overdueDays` 现算；
    - `definitions.js` 只存 `sopTaskId`；`mermaid-sources` 由 SOP 数据派生。
  - [x] SubTask 3.2 单一源收口（B04、B08、B10–B12、B15–B20、B22、B23）
    - 补课文案接 `makeupScopeHint()`；通知提前量常量化；
    - 域参数管理权由 `POLICY_OVERRIDABLE` 派生；`committee` 进受众 sentinel；
    - 应到统计统一 `computeRosterStats()`；工作组 id 统一 `workgroupIdFor()`；
    - 角色/状态/终态/落点/组长可上传类型全部引枚举；
    - 模板党小组名由 `groupOptions()` 生成；工作流 SLA 先裁定可调性再入 policy/常量。
  - [x] SubTask 3.3 派生值不再存死（D06、D07、D08、D15）
    - 周期归档报送用合并后的支部策略；
    - 党小组改名后读侧按 `hostGroupId` 现取组名；
    - 考勤确认统一 `confirmedBy`；`overdue` 停写、统一现算。

- [x] 第 4 批：空字段与体验
  - [x] SubTask 4.1 每个空值二选一（A01–A15）
    - A01 阶段必选 + 历史空值「未登记（组织委员可补）」+ 补录待办；
    - A02 会议名单读冻结应到快照/现算；A03 组织者读 `assignments`，无则「指定组织者」；
    - A04 工作考察按 `taskforceId/workgroupId` 读；A05 通知收发人读真实字段；
    - A06 组长判据两源合并；A07 活动详情补时间/主持人/说明；
    - A08 确认判据统一；A09 流入备注加入口；A10 归档显示上传人；
    - A11 详情显示跨组说明；A12 专班任务给编辑入口/深链；A13 通知有效期或删自然过期分支；
    - A14 停用项显示「已停用」+ 启用落点；A15 学号表单必填 + 字段级错误。
  - [x] SubTask 4.2 读写可见性（D10、D11、D13、D17）
    - 工作组预载与首页同谓词/排序/上限；
    - 专班审核通过后并入 `workgroupMembers` 缓存；
    - 停写通知旧 `read`；产出状态补迁移端点或删不可达文案。

- [x] 第 5 批：验证与交付（固定 3 次套件运行）
  - [x] SubTask 5.1 第 1 次（定向）：
    `node --test test/data-lifecycle-guard.test.mjs test/seed-drift.test.mjs test/seed-baseline.test.mjs test/mock-api-parity.test.mjs test/mock-api-parity-structure.test.mjs test/workgroup-api.test.mjs test/activity-workgroup-sync.test.mjs test/taskforce-workgroup-source.test.mjs test/attendance-batch.test.mjs test/r3-data-permission-regression.test.mjs test/sop-scenarios.test.mjs test/seed-runtime-immutability.test.mjs test/semantic-version-bump.test.mjs test/sop-policy-derivation.test.mjs test/empty-field-exit.test.mjs test/mock-parity-gates.test.mjs test/demo-baseline-canon.test.mjs`
  - [x] SubTask 5.2 第 2 次：`npm run test:daily`
  - [x] SubTask 5.3 第 3 次：`SWEEP_SHARD=all`（`DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）
  - [x] SubTask 5.4 文档：`CLAUDE.md` 乙部登记 R10 批次与余项；`DATA_MODEL` 只改本轮实体；执行日志批次 505；`TIMESTAMPS` 同步
  - [x] SubTask 5.5 版本戳 bump ＋ `version-stamp`；中文提交（不 push）

# Task Dependencies

- 第 1 批必须先做（数据安全优先于 UI）
- 第 2 批依赖第 1 批的版本推进与归属 fail-closed（种子修复走同一写口）
- 第 3 批与第 2 批可部分并行，但 SOP 执行人依赖 policy 收口
- 第 4 批最后（空字段读口依赖前面的单一源与种子）
- 第 5 批只在四批全部完成后执行；**套件级运行不得中途插入**
