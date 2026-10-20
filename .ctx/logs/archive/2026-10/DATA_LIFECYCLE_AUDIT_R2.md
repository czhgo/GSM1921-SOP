---
title: "数据生命周期审查（第二轮·深化）"
type: audit
role: "[AI]"
last_updated: "2026-10-20"
status: "FINAL"
round: 2
---

# 数据生命周期审查（第二轮·深化）

> **审查性质**：只读审查。未修改任何产品代码、未 commit、未改动 `.ctx` 顶层；本报告是唯一新增文件。
> **审查范围**：`docs/src/**`、`server/**`（排除 `node_modules`、`server/test`）、`content/04_web_design/data/DATA_MODEL.md`。
> **与上一轮的关系**：上一轮 31 条中已闭环的项目（支委/纪检 id 角色派生、`|| 'pN'` 清除、新成员 id=学号、复盘/沉淀父键、删除守卫扩域、committeeBroadcasts 停写、通知/考勤/账号同步）本轮**不重复计数**；上轮未闭环但本轮无新证据的条目，只在文末「遗留未闭环」列一行，不占新发现编号。
> **本轮判据**：① 空值必须能回答「谁写、从哪写」；② 工作流事实（人数、期次、状态、日期、名单、比例、上限）一律计算或派生；③ mock 跟随代码，不为旧 mock 削足适履；④ 同一事实只能有一种呈现形态（该算的不写死、该汇总的不逐条、该隐藏的不留占位）。

---

## 一、新发现总表（50 条）

> 编号 `R2-xx`；优先级 P1 = 会造成错数据/错归属/丢数据/权限越界；P2 = 口径不一致或长期误导；P3 = 呈现/维护性问题。

| 编号 | 类别 | 文件:行号 | 现状 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|
| R2-01 | 呈现形态 | `docs/src/components/governance/person-profile-sections.js:65-68,92,96,102`；`docs/src/entries/pages/person-entry.js:82-86` | 同一张个人档案页，组织事实区空值用「—」，本人自述区空值仍用「未填写」；自述列表子表单元格又单独用「—」。 | 同一屏三套空值词表，读者无法判断「—」是未采集、未填写还是不适用；与 2026-10-20 统一「—」的裁定不一致。 | 抽一个空值词表模块（`EMPTY.missing / EMPTY.notApplicable / EMPTY.unfilled`），档案页与自述区共用；自述列表按列给语义。 | P2 |
| R2-02 | 空值 | `docs/src/components/governance/person-profile-sections.js:82` | 自述列表（学生工作/项目/荣誉）每个子单元格 `row[col.key] || '—'`，一行里空着的「类别/部门/职务」都显示「—」。 | 分不清「这一格没填」与「这一列本来不适用」，也无法判断整行是否算已填。 | 列表按字段声明 `emptyText`；整列全空时不渲染该列；行级空值用「—」并加 `title` 说明。 | P3 |
| R2-03 | 空值 | `docs/src/data/mock/people.js:66`；`docs/src/entries/pages/person-entry.js:89-93` | 党委组织员 `partyGroup:''`、`developStage:''`；档案页把空串渲染成「未分组」，阶段渲染成「—」。 | 组织级角色被显示为「未分组」，读者会以为漏填；这是角色不适用，不是缺口。 | 档案页按 `role==='party-staff'` 显示「不适用（党委组织员）」或直接隐藏这两行；空串与「未分组」分开表达。 | P2 |
| R2-04 | 空值 | `docs/src/components/governance/person-edit-modal.js:215-226`；`docs/src/entries/pages/person-entry.js:281-284` | 档案页有「阶段起始日」字段，但编辑模态的「完整档案（只读）」九行里没有它；任何人工入口都没有（只在阶段确认通过时同笔落档）。 | 51 名种子人员该字段全空，档案页长期出现无法解释的「—」；模态自称「完整档案」却少一字段，两处字段集不一致。 | 二选一：模态补一行只读「阶段起始日」并在为空时写「随阶段变更落档」；或档案页在为空时不展示该行。 | P2 |
| R2-05 | 空值 | `docs/src/entries/tabs/disc/attendance-tab.js:1324-1328` | 考勤总表的「学号 / 发展阶段 / 所属党小组 / 类别」为空时显示「—」，这些是上传时的快照字段，全站无补录入口。 | 历史考勤行长期空列，纪检无法核对；读者以为是数据坏了。 | 快照列统一 `title="登记时未采集"`；整列全空时隐藏；不提供补录（快照不可回改）。 | P3 |
| R2-06 | 空值 | `docs/src/entries/tabs/org/member-flow-tab.js:252-257` | 成员流动台账的学号/届别/备注为空显示「—」，台账是登记快照，无改写入口（上轮 07 未闭环，本轮补：仍缺「整列全空隐藏 + 快照语义」）。 | 与 R2-05 同类：占位无出口。 | 标注「登记时未采集」并在整列全空时隐藏；撤销/重登记作为唯一更正路径写在空态里。 | P3 |
| R2-07 | 空值 | `docs/src/entries/pages/settings-entry.js:645-646` | 配置变更记录中 `h.by` 缺失时「记录人」显示「—」；历史行没有补录入口。 | 审计行看起来像漏记，无法判断是系统迁移还是人工。 | 旧行改用「系统 / 迁移前记录」语义值，并在卡头注明「迁移前记录无操作人」。 | P3 |
| R2-08 | 空值 | `docs/src/entries/tabs/leader/write-tab.js:463`；`docs/src/entries/tabs/prop/archive-tab.js:506` | 宣传初稿的「撰写人」在表单里是选填；不填则列表显示「—」。 | 待审核初稿不知道谁写的，退回说明没有收件人；这个字段对审核流程是必需信息。 | 撰写人默认当前登录人；允许代填但必填；存量空值显示「未署名」并提供补填入口。 | P2 |
| R2-09 | 空值 | `docs/src/components/governance/org-setup-wizard.js:381` | 换组织向导的人选下拉里，成员 `branchId` 为空时显示「（— · 角色）」。 | 与 `p_pc`/IAAA 待归属用户混在一起，易把未归属账号选成本支部角色。 | 显示「（待归属 · 角色）」并把待归属者从可任命候选中排除。 | P2 |
| R2-10 | 硬编码 | `docs/src/entries/tabs/prop/archive-tab.js:1118` | API 形态上传宣传材料时写 `uploadedBy: 'p12'`。 | 任何宣传委员（或代上传的支书）上传，留痕都记到固定 p12；换人后审计链错。 | 改为 `AuthStore.getCurrentUser()?.personId`，缺失则拒绝上传并提示重新登录。 | P1 |
| R2-11 | 硬编码 | `docs/src/entries/workspace/ws-prop-commissioner-entry.js:26` | 宣传台「宣传相关专班」判据 = `t.name.includes('宣传') || t.initiator === 'p12'`。 | 宣传委员换人后新委员看不到自己的专班；专班改名即从看板消失；名称含「宣传」的他组专班被误收。 | 发起人取当前 `prop-commissioner` 角色对应 personId；专班归属用 `workgroupId`/成员授权判定，不用名称子串。 | P1 |
| R2-12 | 硬编码 | `docs/src/entries/tabs/leader/write-tab.js:493`；`docs/src/data/mock-adapter.js:287,289,389,391,484,486,495,645`；`docs/src/data/data-loader.js:22,24`；`docs/src/components/shell/workspace-shell.js:205` | 会话缺失时把 `recordedBy / createdBy / executor` 回落为伪用户 `'u_exec'`；活动装载时也一律写 `executor: organizer || 'u_exec'`。 | 上一轮只清了 `|| 'pN'`，`|| 'u_exec'` 仍在：组长台填报在会话失效时会记到不存在的人；活动 `createdBy` 与真实创建人脱节；学号迁移后仍是孤儿。 | 全部删除 `|| 'u_exec'`；`recordedBy/createdBy` 取当前登录人，缺失即禁止写并提示；活动不再生成 `executor` 伪字段（见 R2-13）。 | P1 |
| R2-13 | 死写入 | `docs/src/data/mock-adapter.js:287,389,484,495`；`docs/src/data/data-loader.js:22`；`docs/src/components/record/calendar.js:326` | `activity.executor` 和 `activity.supervisor` 在装载时被写入（`executor` 是 personId 或 `u_exec`，`supervisor` 恒 null），全站唯一读取点把 `t.executor` 当**角色键**查颜色。 | 两个字段是历史遗留：一个写而不读，一个读错语义（personId 查角色色板永远落默认色）；还会被删除守卫当成人员引用。 | 从活动模型与装载逻辑中移除 `executor/supervisor`；日历颜色改读活动类型/项目角色，不读人员 id。 | P2 |
| R2-14 | 硬编码 | `docs/src/components/dashboard/stats.js:74-77`；`docs/src/entries/tabs/visitor/attendance-tab.js:74,96` | 出勤率配色三套阈值：首页 90/70；成员台「我的出勤率」90/提示线 80；同文件「单场出勤率」90/70。 | 同一个人同一月，首页与成员台可能一绿一黄；制度提示线（80）与展示色阶脱钩。 | 色阶从 policy 派生（如 `lowRateHint` + 一个统一的「良好线」参数），三处共用同一函数。 | P2 |
| R2-15 | 硬编码 | `docs/src/entries/tabs/org/talent-tab.js:92-96` | 预备期「满 12 个月可转正 / 满 9 个月可筹备」写死在人才库；`_monthsSince` 只按年月差、忽略日。 | 制度天数调整时提示不跟随；每月同日前后会出现最多一个月的偏差。 | 预备期月数进 `POLICY_DEFAULTS`（制度固定项）；日期差改为按日计算。 | P2 |
| R2-16 | 硬编码 | `docs/src/services/governance/secretary-overview.js:191,318`；`components/dashboard/stats.js:57`；`components/dashboard/taskforce-list.js:151`；`components/governance/work-overview.js:571`；`entries/tabs/org/inspection-tab.js:51`；`entries/workspace/ws-org-commissioner-entry.js:34`；`entries/tabs/visitor/projects-tab.js:329,334` | 「进行中专班」状态集 `active + recruiting` 在 8 个文件手写；`domain.js` 已有 `TASKFORCE_ACTIVE_STATUSES`（服务端 `branch-scope.js:9` 已在用）。 | 新增第三个进行态时前端统计与实际不符；同一「在办专班」在不同页面口径不同。 | 前端统一 import `TASKFORCE_ACTIVE_STATUSES` 并封装 `isTaskforceActive(tf)`。 | P2 |
| R2-17 | 硬编码 | `docs/src/data/mock-adapter.js:43`；`services/member/party-group.js:28`；`services/member/member-flow.js:32`；`core/domain/profile-access.js:6`；`entries/tabs/secretary/group-progress-tab.js:84`；另内联 `committee-meeting-tab.js:32`、`assign-tab.js:591`、`today-summary.js:136`、`services/branch/branch.js:591,593` | 默认支部 `'br-b1'` 有 5 个同名常量 + 5 处内联兜底。 | 换默认支部或多支部部署时须逐处改；漏一处即产生跨支部归属。 | 默认支部 id 收进 `core/domain/constants.js` 单一导出；兜底函数只允许一处。 | P2 |
| R2-18 | 硬编码 | `docs/src/services/activity/taskforce.js:685` | 专班报送触发线上支委会时，系统通知写死 `branchId:'br-b1'`。 | 非 br-b1 支部的专报表决通知会落到错误支部，目标支委收不到。 | 取 `activity.branchId || me.branchId`，缺失则不发并记录。 | P2 |
| R2-19 | 硬编码 | `docs/src/services/member/person.js:405-413` | mock 新增成员时 base 记录 `branchId:'br-b1'`。 | 组织委员在非 br-b1 支部新增成员，成员被静默归到演示支部；IAAA 待归属语义被破坏。 | base 的 `branchId` 取操作人所属支部；无归属时写 `null`，由支部确认链补。 | P2 |
| R2-20 | 硬编码 | `docs/src/services/core/auth.js:404` | 开发模式登录按角色找不到人时回落 `'p5'`。 | 角色未维护时静默以普通成员身份进入，演示/调试结果不可信。 | 找不到即显式失败并提示「该角色暂无成员」。 | P3 |
| R2-21 | 硬编码 | `docs/src/entries/pages/settings-entry.js:120,670,678`；`docs/src/services/branch/config-clean.js:29` | 配置变更记录「保留 100 / 展示 50」写在文案和切片里，两个数字各一份。 | 改上限要同时改文案与代码；以后台参数调整时页面说明会失真。 | 由 `CONFIG_HISTORY_MAX` 派生展示条数（或单独常量），文案引用同一数字。 | P2 |
| R2-22 | 硬编码 | `docs/src/entries/tabs/secretary/work-map-tab.js:110` | `pageSize: 10`，注释还写死「14 行 → 2 页」。 | 工作模块增删后注释失真；分页数与模块数无关系却写在一起。 | 页码由数据长度计算，注释删除固定数字（模块数用 `.length`）。 | P3 |
| R2-23 | 漂移 | `docs/src/data/mock/branches.js:15` | 注释仍写「现有 46 功能不变」。 | 当前页签已 62 个，按注释核对会误判配置默认值。 | 删除固定数字，改为「见 capabilities 注册表」。 | P3 |
| R2-24 | 呈现形态 | `docs/src/components/shell/header.js:377`；`docs/src/components/dashboard/gallery.js:103`；`docs/src/components/dashboard/activity-panel.js:97` | 通知铃铛 10 条、首页活动风采 6 条、首页活动列表 10 条，三处截断常量各自写死，无统一配置或溢出提示规范。 | 上限调整要改三处；紧急通知超过 10 条时被截断且没有「还有 N 条」的清晰出口。 | 截断值进统一展示常量；铃铛按「紧急优先 + 未读优先」排序后再截断，并给出「查看全部」。 | P2 |
| R2-25 | 重复计算 | `docs/src/components/record/calendar.js:312,319,667,671,1014,1021` | 「每天最多 3 个活动标签 + `+N 项`」在桌面月视图、移动视图、紧凑视图三处各写一遍。 | 改一处漏两处，三种视图同一天显示不同数量。 | 抽 `dayCapacity` 与 `overflowLabel` 两个常量/函数，三处共用。 | P2 |
| R2-26 | 呈现形态 | `docs/src/services/governance/secretary-overview.js:254-260` | 支书概况缺勤人员只列前 5 个，第 6 个起拼成「+N 人」纯文本。 | 这是需要处置的名单，却只能看到 5 人；「+N 人」不可点，无法下钻。 | 「+N 人」改为跳「考勤总表 · 本月缺勤」筛选的链接；或直接给完整名单折叠。 | P2 |
| R2-27 | 呈现形态 | `docs/src/entries/tabs/secretary/committee-meeting-tab.js:106`；`docs/src/entries/tabs/secretary/group-progress-tab.js:337,645,689`；`docs/src/entries/pages/branch-readonly-entry.js:108`；`docs/src/entries/pages/branch-config-entry.js:100` | 「最近 8 场支委会」「最近 10 条变更」「最近 4 场活动」「最近 10 场活动」「最近 5 次任命」五组上限散落，其中两处还在文案里复述数字。 | 上限无配置来源；文案与代码两份数字会漂移。 | 每类列表用一个命名常量，文案引用常量值；超出时给「查看全部」。 | P3 |
| R2-28 | 呈现形态 | `docs/src/entries/tabs/disc/attendance-tab.js:51`；`docs/src/entries/tabs/visitor/inspection-tab.js:43`；`docs/src/entries/tabs/secretary/todo-tab.js:441,464` | 考勤总表每页 20、成员台考察活动下拉 30、支书待确认块 8 行，均为裸数字。 | 同类「分页/截断」规则多套，无法统一审计；下拉 30 场后旧活动不可选。 | 分页值进统一表组件参数；下拉改为可搜索全量，不靠截断。 | P3 |
| R2-29 | 呈现形态 | `docs/src/components/governance/work-overview.js:51,679` | `_MAX_INLINE = 3`，但函数注释写「前 5 条由统一上限截取」。 | 维护者按注释核对会误判；实际行为与文档不一致。 | 注释改为引用常量名，不写具体数字。 | P3 |
| R2-30 | 呈现形态 | `docs/src/entries/tabs/org/overview-tab.js:17-23,37-58` | 组织台概况渲染后，用 DOM 文本正则（`/专班招募/` 等）识别「条线缺口」再补按钮，并把 `data-tab="development"` 原地改成 `talent`。 | 文案一改按钮就静默消失；共享组件输出结构变化时补丁失效；落点映射不在能力注册表里。 | 在 `work-overview` 的缺口项上直接输出 `tabId/action` 结构化字段；本台只提供映射表，不做 DOM 文本匹配与属性改写。 | P2 |
| R2-31 | 漂移 | `docs/src/data/mock/activities.js:38,47,48,55,56,73,111` | 7 月/8 月/10 月 15 日的活动仍为 `ongoing` 或 `published`：act-10（7/13 ongoing）、act-16（7/23 ongoing）、act-15（7/22 published）、act-21（7/25）、act-22（7/28）、act-30（8/28）、act-36（10/15）。 | 过去的活动不算「已结束」：支书概况「在办活动」虚高；复盘提醒、待归档统计漏掉这些场次；首页仍把它们当在办。 | 种子的时间与状态必须自洽：已过日期统一 `completed`（未归档）或明确置 `archived`；如需保留演示态，加 `demoFrozenAt` 并在读侧按该日期冻结判断。 | P1 |
| R2-32 | 漂移 | `docs/src/data/mock/taskforces.js:10,38,101,110,118,125` | tf-001 `active` 但 deadline 2026-07-17；tf-005 `recruiting` deadline 2026-08-20；tf-006 `recruiting` deadline 2026-08-15。 | 10 月仍有「招募中」专班且截止已过两个月；「活跃专班」统计虚高；报名状态显示「报名已截止」但专班仍招募。 | 过期未完结的专班种子改为 `completed`/`dissolved`，或把 deadline 推到未来；读侧对「recruiting 且 deadline < today」给出明确「已截止」态而不是继续招募。 | P1 |
| R2-33 | 漂移 | `docs/src/services/governance/todo.js:1597-1612`；`docs/src/data/mock/people.js:10` | 种子待办「设置第三党小组组长」恒存在，但 p4 已是第三党小组组长（`role:'leader'`）。 | 这是一条永远无法正确销项的假待办：点「去赋权」会发现已设置；每次 seed 补齐又把它加回来。 | 删除该种子；若仍需演示「待任命」，造一个确实无组长的第四组或删掉 p4 的 leader 角色（二选一）。 | P1 |
| R2-34 | 漂移 | `docs/src/services/governance/todo.js:1578-1595` | 种子待办「提交红色徒步新闻稿」`deadline:'2026-12-31'`、`sourceId:null`；活动 act-37 在 10/22。 | 截止日与活动无派生关系，12/31 后永久逾期；`sourceId:null` 使活动归档不会自动销项，只能手工完成。 | `sourceId` 指向 act-37，deadline 由 `activity.date + policy 宣传时限` 派生；或删除该种子，改由活动生命周期自动派生。 | P2 |
| R2-35 | 漂移 | `docs/src/data/mock/inspection.js:17-79`；`docs/src/core/domain/policy-defaults.js:120` 起 | 42 条考察记录中 39 条 `status:'pending'`，`recordedAt` 集中在 7-8 月；按「待确认 + 超过 N 天」判据全部超期。 | 纪检台「考察超期未确认」首屏被 39 条历史种子占满，真实新记录被淹没；「考察待确认」待办计数失真。 | 种子里只保留 2-3 条近期 pending，其余改 `confirmed` 或下架；种子时间改为相对今天生成，避免随部署日期整体过期。 | P2 |
| R2-36 | 漂移 | `docs/src/data/mock/seed.js:99-118` | 补课任务 `mk-seed-1` 截止 2026-09-17，10 月仍 `pending`。 | 页面显示「补课截止 2026-09-17」却仍可提交，且无逾期态/催办；与纪检台「等闭环」长期并存。 | 补课任务引入「逾期」派生态（`deadline < today && pending`），页面显式标注；种子截止改为相对日期或随演示推进更新。 | P2 |
| R2-37 | 漂移 | `docs/src/data/mock/notices.js:184` | 所有种子通知的 `createdBy` 统一注入为 `'p13'`（现任支书快照）。 | 支书换人后，新支书无法编辑/撤回这些种子通知（发布者判据读 `createdBy`），审计显示错误发布者。 | 种子发布者改为系统账号或 `null` 并在读侧显示「系统初始通知」；不要把「当前支书」写进历史通知。 | P2 |
| R2-38 | 漂移 | `docs/src/data/mock/accounts.js:5-29`；`docs/src/data/mock/people.js:10` | 18 个演示账号覆盖支书/副支书/三委员/p1/p2 组长/成员，但**没有 p4**（第三党小组组长）；注释却声称「角色覆盖…组长」。 | 第三组组长的组长台无法用演示账号进入；与 R2-33 的假待办叠加，演示「设置第三组组长」永远走不通。 | 补 p4 账号（学号 2400012348），并加守卫：每个 `role==='leader'` 至少一个账号；注释与账号清单同源生成。 | P2 |
| R2-39 | 漂移 | `docs/src/data/mock/notices.js:2` | 注释仍写「7 月通知（当前有效）」，实际这些通知 `expireDate` 在 7-8 月，`activeOnly` 已全部过滤。 | 审计/维护者按注释找「当前有效通知」会找不到，误判数据丢失。 | 注释改为「历史通知（多数已过期）」，有效期由 `expireDate` 决定，不在注释里断言。 | P3 |
| R2-40 | 死写入 | `docs/src/entries/tabs/prop/archive-tab.js:1113-1128`；对照 `server/db.js:17`、`docs/src/data/api-adapter.js:556-568` | API 形态上传宣传材料只写 `fileSpaceRecords` + 内存 `archiveRecords.push`，**没有调用** `archiveRecords.create`；而服务端有 `archive_records` 表与 `/api/v1/archiveRecords`。 | 刷新后归档记录消失（只有文件空间元数据还在），「产出物区/关闭校验」读不到刚上传的材料；同一份上传两套事实。 | 上传成功后调用 `getAdapter().archiveRecords.create({...})` 落库；删除时同步删服务端行；注释中「server 端无 archiveRecords 表」需删。 | P1 |
| R2-41 | 硬编码 | `server/routes/iaaa.js:164` | IAAA 自助建号使用 `id: 'p_'+12 位 uuid`。 | 与「新成员 id=学号」的现行口径冲突；IAAA 是生产主入口，会在服务端持续制造 `p_` 代理键，下一批迁移又要再洗一遍。 | 新用户 `id` 直接用 `studentId`；与 `POST /members` 的 P1-12 修复保持同一规则。 | P1 |
| R2-42 | 死读取 | `docs/src/data/data-adapter.js:269,304`；`server/test/data-lifecycle-guard.test.mjs:86-88` | `committeeBroadcasts` 已停止写入，但 api 形态每次 init 仍拉取整表进 `mockDB`；前端无任何展示。 | 存量广播持续占用内存与同步流量；守卫把它列入允许清单后，后续无人清理。 | 停止拉取该域（仅保留迁移脚本读取）；或在支委台提供一次性「历史广播」只读入口后归档。 | P3 |
| R2-43 | 死读取 | `docs/src/services/activity/inspection.js:137,159`；`docs/src/services/activity/inspection-migrate.js:92-94` | 迁移无法回填父键的考察记录标 `legacy:true`，写口一律拒绝，提示「历史考察缺少工作组键（只读）」。 | 这些行永久只读，页面没有「补录父键 / 重新挂接」入口；只能重新上传，旧行继续堆积。 | 在纪检台给 legacy 行一个受控「补挂工作组」写口（留痕），或提供一次性修复向导；否则应在列表默认隐藏 legacy 行。 | P3 |
| R2-44 | 死读取 | `docs/src/services/activity/makeup.js:23` | 顶部 `import { PEOPLE } from '../../data/mock/index.js'`，文件内无任何使用。 | 静态种子依赖进入服务层，容易让后续维护者误以为补课逻辑读的是种子名单。 | 删除该 import。 | P3 |
| R2-45 | 死读取 | `docs/src/components/shell/workspace-shell.js:436-439`；`docs/src/components/dashboard/taskforce-list.js:54-68` | 已撤页签 `monitor` / `governance-overview` 的兼容别名仍硬编码在 shell；`TASKFORCE_TAB` 仍把纪检/组长映射到已删的 `tf-view`，只靠 `TASKFORCE_HREF` 抢先覆盖。 | 任一映射漏掉 override，就会跳到不存在的页签；已撤页签名继续在代码里存续，无 capabilities 校验。 | 别名表加注释与来源，并加守卫：映射目标必须存在于对应 capabilities；能删的旧 id 直接删。 | P2 |
| R2-46 | 重复计算 | `docs/src/services/governance/secretary-overview.js:229-244` | 支书概况「本月出勤率」分母是**本月已录入的考勤记录数**，不是应到人次；录 3 条全勤也显示 100%。 | 这是首屏指标，录入不全时给出虚假高值；同一份数据在纪检台有 `coverage` 字段但这里不用。 | 分母改用 `attendanceRosters`/`getMeetingRosterIds` 的应到人次（或至少同时显示 `coverage`）；出勤率与覆盖率分开呈现。 | P1 |
| R2-47 | 重复计算 | `docs/src/services/activity/attendance.js:620,656`；`docs/src/components/dashboard/stats.js:71-73` | 出勤率至少四种分母：按场次 `present/roster`、按人 `present/已录场次`、首页 `present/本月记录`、支书概况 `present/全部记录`。 | 同一人、同一月在首页、成员台、纪检导出、支书概况可能得到四个百分比。 | 保留两个明确语义的函数（`attendanceRateByRoster` / `attendanceRateByRecorded`），页面必须标注用的是哪一个；禁止页面自己算。 | P2 |
| R2-48 | 重复计算 | `docs/src/services/governance/secretary-overview.js:313`；`server/routes/resources/branch-scope.js:8`；`docs/src/core/domain/constants.js:737-751` | 「在办活动」有三种判据：支书概况 `!archived`（含 draft/cancelled）；服务端 `TERMINAL_ACTIVITY`（含 cancelled、executed）；前端 `isActivityEnded`（completed/archived，不含 cancelled）。 | 支书台「在办活动」把草稿和已取消都算进去；党委台账与支书台数字对不上。 | 统一用 `isActivityLive`（未归档且未取消）或明确「在办 = 未结束」；服务端复用同一状态集合并删除本地 `TERMINAL_ACTIVITY`。 | P1 |
| R2-49 | 死写入 | `docs/src/services/governance/notice.js:557-563,574-577,315`；`docs/src/components/dashboard/stats.js:58` | 通知「已读」是共享记录上的一个布尔值：任何一个人点开广播通知，所有人的未读计数都归零；私信靠逐人 fan-out 规避，广播没有。 | 「未读通知」统计与铃铛对其他人失真；支书无法知道哪些人还没读；通知送达不可追溯。 | 新增逐人已读表（形状同 `issue_unread`：`personId:noticeId`），广播按人写；记录上的 `read` 只作兼容或删除。 | P1 |
| R2-50 | 权限/空值 | `docs/src/core/domain/profile-access.js:24-32` | 读/维护权限判定用 `actor.branchId || 'br-b1'`、`member.branchId || 'br-b1'`；IAAA 待归属成员 `branchId:null` 会被当成 br-b1 成员。 | br-b1 组织委员可读取待归属者的档案（服务端 GET 走同一函数），与「支部确认前什么也看不到」的口径冲突；客户端还会给待归属者显示编辑按钮。 | `branchId:null` 明确视为「无支部」，不参与同支部判定；只有显式 `branchId` 相等才放行；同时补一条守卫。 | P1 |

> 计数：50 条新发现。P1 12 条（R2-10/11/12/31/32/33/40/41/46/48/49/50）；P2 23 条（R2-01/03/04/08/09/13/14/15/16/17/18/19/21/24/26/30/34/35/36/37/38/45/47）；P3 15 条（R2-02/05/06/07/20/22/23/25/27/28/29/39/42/43/44）。

---

## 二、空值可写性矩阵

> 判定口径：写入口 = 弹窗/服务层/接口三者任一；「入口路径」写用户实际能点到的地方。

| 字段 | 屏幕 | 当前呈现 | 是否有写入口 | 入口路径 | 建议 |
|---|---|---|---|---|---|
| 学号 | 个人档案 · 组织事实 | `—` | 有（档案编辑模态） | 档案页「编辑组织事实」→ 学号输入 | 保留入口；但改学号必须同步账号层（上轮 01 未闭环） |
| 届别 | 个人档案 · 组织事实 | `—` | 有 | 「编辑组织事实」→ 届别输入 | 组织事实按钮的 `focusFields` 目前不含届别，建议补上 |
| 党小组 | 个人档案 · 组织事实 | 空串→「未分组」；缺字段→`—` | 有（自由文本） | 「编辑组织事实」→ 党小组输入 | 改活组下拉，禁止自由文本（上轮 27 未闭环） |
| 阶段起始日 | 个人档案 · 组织事实 | `—` | **无人工入口**（只在阶段确认通过时同笔落档） | 无 | 为空不展示，或补只读说明；不要留无出口的「—」 |
| 在册备注 | 个人档案 · 在册与留痕 | `—` | 有，但单独保存被拒（须随状态变更） | 「变更在册状态」→ 备注 | 开单独写口或明确标注「随状态变更填写」（上轮 04 未闭环） |
| 角色 | 个人档案 L0 | 「无治理角色」 | 无（治理字段） | 任命链 / 党委台 | 保留只读，文案说明维护方（上轮 08） |
| 所属支部 | 个人档案 L0 | 「支部未归属」 | 无（治理字段） | 党委台支部管理 | 同上；待归属者应显示「待支部确认」 |
| 党委组织员 · 党小组/阶段 | 个人档案 | 「未分组」/`—` | 无（角色不适用） | 无 | 改为「不适用（党委组织员）」或隐藏两行（R2-03） |
| 本人自述 15 字段 | 个人档案 · 本人自述 | 「未填写」 | 有 | 本人「填写/编辑我的自述」；组织委员「代录自述」；名册批量导入 | 有入口；空值词改为与其他区一致（R2-01） |
| 自述列表子单元格 | 个人档案 · 本人自述 | `—` | 有（同一自述表单） | 同上 | 按列给空值语义，不把「未填」和「不适用」都写成 `—`（R2-02） |
| 考勤快照 · 学号/阶段/小组/类别 | 纪检台考勤总表 | `—` | **无**（上传时快照） | 无 | 标注「登记时未采集」，整列全空则隐藏（R2-05） |
| 流动台账 · 学号/届别/备注 | 组织台成员流动 | `—` | **无**（登记快照） | 撤销后重新登记 | 同上（R2-06） |
| 宣传初稿 · 撰写人 | 宣传台待审核 | `—` | 有（但选填） | 组长台/组织台「添加宣传记录」 | 默认当前登录人，改为必填（R2-08） |
| 配置变更 · 记录人 | 设置中心 | `—` | 无（历史行） | 无 | 用「系统 / 迁移前」语义值（R2-07） |
| 支部名称 / 类别 | 设置中心 · 支部信息 | `—` | 无（党委治理） | 党委台「支部管理」 | 本页已有说明；空值时直接写「待党委录入」 |
| 支部自述 / 页眉名 | 设置中心 · 支部信息 | `—` | 有 | 「打开换组织向导」 | 空值旁给向导直达按钮 |
| 换组织人选 · 支部 | 换组织向导 | `（— · 角色）` | 有（选人） | 向导步骤 | 改为「待归属」并从可任命候选剔除（R2-09） |
| 补课截止 | 成员台考勤概况 | `—` 或过期日期 | 无（任务派生） | 纪检确认缺勤时生成 | 截止由 `absentDate + policy` 派生；过期给「已逾期」态 |

**结论**：真正「无信息且无入口」的死信息集中在 **阶段起始日**、**党委组织员的党小组/阶段**、**考勤与流动台账的快照列**；「有入口但读侧不刷新」仍是学号与账号层（上轮 01）；「有入口但写不进去」仍是在册备注单独保存（上轮 04）。

---

## 三、人员 id 迁移：p* 文件-处数清单

> 统计口径：`['"]p\d+['"]` 字符串字面量出现次数（含种子、注释示例；不含 `p_pc`、`p_` 前缀新 id）。`docs/src` 合计 418 处。

### 3.1 mock 数据（409 处）

| 文件 | 处数 | 备注 |
|---|---:|---|
| `docs/src/data/mock/activities.js` | 103 | organizer/assignments/executor 快照，迁移主战场 |
| `docs/src/data/mock/inspection.js` | 84 | personId/recordedBy，含专班 workgroupId |
| `docs/src/data/mock/attendance.js` | 63 | personId/recordedBy，另有 `_ALL_PERSON_IDS` 派生 |
| `docs/src/data/mock/people.js` | 52 | 50 个 id + p5/p9 的 `updatedBy:'p11'` 两处 |
| `docs/src/data/mock/taskforces.js` | 38 | manager/initiator/members/by |
| `docs/src/data/mock/seed.js` | 19 | 分工、报名、上报、补课 |
| `docs/src/data/mock/accounts.js` | 17 | 18 个账号中 17 个 `personId:'p*'` + p_pc 1 个 |
| `docs/src/data/mock/review.js` | 16 | organizerId/annotatedBy |
| `docs/src/data/mock/thought-reports.js` | 11 | personId/personName/by |
| `docs/src/data/mock/party-groups.js` | 3 | createdBy |
| `docs/src/data/mock/notices.js` | 2 | 受众种子 p11 + 注入 createdBy p13 |
| `docs/src/data/mock/branches.js` | 1 | secretaryId p13 |

### 3.2 非 mock 代码（8 个文件 / 9 处，迁移前必须先改）

| 文件:行号 | 处数 | 性质 | 处理 |
|---|---:|---|---|
| `docs/src/entries/tabs/prop/archive-tab.js:1118` | 1 | **活写口** `uploadedBy:'p12'` | 改当前登录人（R2-10） |
| `docs/src/entries/workspace/ws-prop-commissioner-entry.js:26` | 1 | **活判据** `initiator==='p12'` | 改角色派生（R2-11） |
| `docs/src/services/core/auth.js:404` | 1 | 开发登录兜底 `'p5'` | 改显式失败（R2-20） |
| `docs/src/data/workgroup-seed-sync.js:108` | 1 | 演示授权 personId p5 + grantedBy p_pc | 种子可保留，但需标注演示快照 |
| `docs/src/core/domain/domain.js:243` | 1 | JSDoc 示例 `'p5'` | 文档改学号示例 |
| `docs/src/services/member/person.js:50` | 1 行（2 字面量） | JSDoc 示例 `'p1','p10'` | 文档改学号示例 |
| `docs/src/services/governance/issues.js:576` | 1 | JSDoc 示例 `'p11'` | 文档改角色键 |
| `docs/src/components/feedback/issue-dispatch-view.js:26` | 1 | JSDoc 示例 `'p11'` | 文档改角色键 |

### 3.3 迁移读数

- 前端活写口/活判据中仍有 **3 处**直接依赖 p*（R2-10/11/20），其余 6 处为种子或注释。
- 服务端新增入口新增了一处 `p_<uuid>`（`server/routes/iaaa.js:164`），**不在**上述 418 处统计内，但属于同一迁移面。
- 账号覆盖：51 人名册、18 个账号；第三党小组组长 p4 无账号（R2-38）。

---

## 四、上轮遗留未闭环（不占新发现编号，只作交接）

| 上轮编号 | 现状 | 本轮补充证据 |
|---|---|---|
| 01 学号与登录账号不同源 | 仍在：`person-edit-modal` 可改学号，账号层无重命名钩子 | `services/core/accounts.js` 仅在 `member-flow.registerIntake` 调用 `createAccount`；改档案不触发 |
| 03 阶段起始日无人工入口 | 仍在 | 本轮补：编辑模态「完整档案」也没有该字段（R2-04） |
| 04 在册备注单独保存被拒 | 仍在：`person-edit-modal.js:362` 的 `noteOnly` 分支 | 空值矩阵已列 |
| 17 组长可上传类型集合 | 仍在：`leader/attendance-tab.js:87` | 与 `policy-defaults.attendance.recorderByType` 不一致 |
| 21 专班 manager 恒 p11 | 仍在：8 个专班 | 与 R2-32 时间漂移叠加，演示「统筹人」长期同一人 |
| 22 支部/任命 p13、p_pc | 仍在：`branches.js:34`、`seed-baseline.js:58` | 生产 baseline 仍用 `p_pc` 作 id |
| 27 党小组自由文本 | 仍在：`person-edit-modal.js:238` | 与活组下拉未打通 |
| M9 `u_*` 幽灵账号 | 仍在：`domain.js:434-449` | 且 `u_exec` 仍被写入活动（R2-12） |

---

## 五、共识 5 条

1. **空值必须能回答「谁写、从哪写」**：阶段起始日、党委组织员的分组/阶段、考勤与流动台账快照列，当前都只有占位没有出口；应分别改为「隐藏 / 不适用 / 登记时未采集」，不再用同一个「—」承担三种语义。
2. **人员归属字段一律取会话，不取字面量**：`p12`、`u_exec`、`p5` 这些残留表明上一轮的清理只覆盖了 `|| 'pN'` 一种写法；应以「写入字段是否 personId」为扫描面，而不是以语法形态为扫描面。
3. **工作流状态必须与日期自洽**：过去的活动仍是 `published/ongoing`、过期的专班仍在 `recruiting`、过期的补课仍 `pending`，会让首屏所有「在办/待办/逾期」指标同时失真；mock 需要一条时间老化策略。
4. **API 形态的写入必须走适配器落库**：宣传材料上传只写内存 `archiveRecords` 是典型反例；「内存里看得见、刷新就没了」比空态更有害。
5. **逐人状态不能存在共享行上**：通知已读是全局布尔，广播场景下一人已读等于全员已读；应改为逐人表（与 `issue_unread` 同形），共享行只保留通知本体。

## 六、分歧 3 条

1. **mock 时间老化：动态派生还是冻结快照**：一种做法是种子按「相对今天」生成状态（活动日期随部署时间平移、过期自动 completed），演示永远自洽但每次读数不同；另一种做法是保留固定历史快照，另加 `demoFrozenAt`，读侧按冻结日判断「当时是否在办」，演示可复现但与今天的时间感脱节。分歧点在「演示稳定性」与「逻辑正确性」之间。
2. **通知已读的落法**：一种做法是新增 `notice_reads(personId, noticeId)` 逐人表，广播只写一条通知、读态按人查；另一种做法是发布时按受众 fan-out 成每人一条（沿用私信做法），读态继续用行内布尔。前者省存储、后者改动小但会让通知表按人数膨胀。
3. **系统派生字段是否开人工补录口**：阶段起始日、在册备注、legacy 考察父键都属于「系统本应自动落、历史却没落」的字段。一种意见是只允许系统写、为空就不展示；另一种意见是给组织委员一个受控补录口并留痕。分歧点在「派生优先」与「历史可修复」之间。

---

## 附：审查方法与只读声明

- 逐文件实读：`person-entry.js`、`person-profile-sections.js`、`person-edit-modal.js`、`profile-access.js`、`self-profile.js`、`person.js`、`accounts.js`、`member-flow.js`、`roster.js`、`secretary-overview.js`、`today-summary.js`、`todo.js`、`notice.js`、`attendance.js`（service + 三台页面）、`taskforce.js`、`inspection.js`、`inspection-migrate.js`、`review.js`、`archive-tab.js`、`write-tab.js`、`ws-prop-commissioner-entry.js`、`workspace-shell.js`、`taskforce-list.js`、`calendar.js`、`stats.js`、`gallery.js`、`activity-panel.js`、`header.js`、`work-overview.js`、`org/overview-tab.js`、`talent-tab.js`、`group-progress-tab.js`、`committee-meeting-tab.js`、`settings-entry.js`、`branch-config-entry.js`、`branch-readonly-entry.js`、`data-adapter.js`、`mock-adapter.js`、`workgroup-seed-sync.js`、`domain.js`、`constants.js`、`policy-defaults.js`、`people.js`、`accounts.js`、`activities.js`、`attendance.js`、`inspection.js`、`review.js`、`taskforces.js`、`notices.js`、`seed.js`、`branches.js`、`server/db.js`、`server/seed.js`、`server/seed-baseline.js`、`server/routes/{auth,member,iaaa,committee}.js`、`server/routes/resources/{branch-scope,gates}.js`。
- 辅助检索：`未填写` / `—` / `暂无` / `未设置` / `'p\d+'` / `u_exec` / `br-b1` / `DEFAULT_BRANCH_ID` / `slice(0,N)` / `>= 90` / `12|9` / `active|recruiting` / `createdBy` / `read` 等关键词全仓扫描。
- **未修改任何产品代码；未 commit；未改动 `.ctx` 顶层；本报告之外未写入任何文件。**
  （注：以上为审查时点声明；后续修复见文末「处置表」，实际改动仅追加本表。）

---

## 七、处置表（第二轮核心 P1 修复，2026-10-20）

> 口径：只记录本轮实际处置；不修改上文原发现正文。测试读数见本节末。

| 编号 | 状态 | 文件:行号 | 理由 / 修法 |
|---|---|---|---|
| R2-10 | 已修 | `docs/src/entries/tabs/prop/archive-tab.js:1094,1121` | `uploadedBy` 改 `currentUserId()`；无会话直接拒绝上传并提示重新登录，不再写死 `p12`。 |
| R2-11 | 已修 | `docs/src/entries/workspace/ws-prop-commissioner-entry.js:30-41` | 专班判据改「`role==='prop-commissioner'` 角色派生 ∪ 当前登录人 ∪ active 工作组授权（workgroupId）」；删除名称含「宣传」与 `p12` 子串判据。 |
| R2-12 | 已修 | `leader/write-tab.js:494`；`services/branch/workforce.js:153-164`；`mock-adapter.js:287-291,389-393,486-490,496,648-651`；`data-loader.js:19-27`；`workspace-shell.js:205` | 清除全部 `\|\| 'u_exec'`：写口取 `currentUserId()`，缺失拒绝写入；装载/兜底映射缺失保持 `null`，读侧显示「—」；活动创建端在 `createdBy/organizer` 均缺失时显式抛错（分工议题写口补当前登录人）。 |
| R2-16 | 已修 | `secretary-overview.js:190,320`；`stats.js:57`；`taskforce-list.js:151`；`work-overview.js:571`；`org/inspection-tab.js:51`；`todo.js:1529`；`signup-panel.js:54`；`org/taskforce-tab.js:926` | 手写 `active + recruiting` 全部改引 `domain.js::isTaskforceActiveStatus` / `TASKFORCE_ACTIVE_STATUSES`；服务端 `branch-scope.js` 保留 canonical 单一源。 |
| R2-31 | 延期 | `docs/src/data/mock/activities.js` | 属 mock 种子时间老化，交由另一子代理；本批未触碰 mock/ 数据文件。 |
| R2-32 | 延期 | `docs/src/data/mock/taskforces.js` | 同上（过期专班种子）。读侧统一判据已就绪，种子日期另批处理。 |
| R2-33 | 延期 | `docs/src/services/governance/todo.js` 种子段 | 假待办属 mock 种子/演示数据，交由另一子代理；本批未动种子正文。 |
| R2-40 | 延期 | `docs/src/entries/tabs/prop/archive-tab.js` | 需补 `archiveRecords.create` 落库与删除同步，涉及 API 写口与前端流程；本批仅修 `uploadedBy`，按任务边界延期。 |
| R2-41 | 已修 | `server/routes/iaaa.js:167` | 自助建号 `id = ident.studentId`（学号/工号）；`_verifyWithIaaa` 已保证非空，空值回调直接 401；与「新成员 id=学号」同源。 |
| R2-46 | 已修 | `secretary-overview.js:229-243,266-271`；`services/activity/attendance.js:593-643,683` | 出勤率分母改应到人次：`summarizeAttendanceByActivity` 优先冻结 roster，未冻结回退「支部在册应到名单（党小组会按本组）∪ 主题党日报名」，并跳过不考勤类型；未录返回 `attendanceRate:null` + `attendancePending:true`，同时给 `attendanceCoverage`；低出勤提示只统计覆盖率 > 0 的场次。 |
| R2-47 | 延期 | `attendance.js` / `stats.js` | 全站「按场次 / 按人 / 按记录」两套语义收敛属 P2；本批只修支书概况首屏分母，成员台/首页口径留给 P2。 |
| R2-48 | 已修 | `constants.js:754-765`；`secretary-overview.js:316-331`；`server/routes/resources/branch-scope.js:2,38` | 新增 `isActivityInProgress`（排除 draft/cancelled/completed/archived；`executed` 按历史终态）；支书概况、按人视图、党委台账统一引用；`branch-scope` 删除本地 `TERMINAL_ACTIVITY`。 |
| R2-49 | 已修 | `notice.js:65-77,236-245,289,549,606-651`；`mock-adapter.js:527-543` | 共享通知行改用 `reads: personId[]`；`list/getAll/getById` 按当前观看者投影 `read`，铃铛/首页/待办未读自动按人；`markRead/markAllRead` 只追加当前人，无会话拒绝写。迁移：旧全局 `read:true` 一次性回填当前登录人后删除该字段，无会话按未读；不新增域/表，未新增删除守卫项。 |
| R2-50 | 已修 | `docs/src/core/domain/profile-access.js:16-28,38,48-52` | `branchId:null` 明确视为「无支部」：组织委员不可读、不可维护；仅 `undefined`（历史缺字段）回落 br-b1；待归属者本人仍可读自己。 |
| 上限项（R2-26/27/28/29 等） | 延期 | `secretary-overview.js:254-261` 等 | 报告 P1 清单未含「在职/最近 N 条」上限；本轮任务第 9 条为条件项，条件不成立，按 P2/P3 交由另一子代理。 |
| R2-13 | 延期 | `mock-adapter.js` / `data-loader.js` / `calendar.js` | 本批已删除 `u_exec` 伪写，但 `executor/supervisor` 字段整体下线涉及日历颜色语义（P2），交由另一子代理。 |

**测试读数（2026-10-20）**：

- 核心批次 104/104 通过：`secretary-overview-attendance`、`notice-audience`、`notice-message`、`notice-deeplink-guard`、`person-profile-service`、`iaaa-onboarding`、`data-lifecycle-guard`、`mock-api-parity`、`permission-gate`、`member-persist`、`perf-version-token`、`perf-index-equivalence`、`state-enum-guard`、`party-committee`、`mock-multi-branch`。
- 扩展批次 52/52 通过：`iaaa-ui-onboarding`、`publicity-static-guard`、`material-link-truth`、`output-block-policy`、`branch-affiliation`、`branch-resource-isolation`、`ux-guard`、`person-profile-presentation`、`mock-integrity`、`write-path-guard`。
- 通知/出勤复跑 18/18 通过。
- 写链回归复跑 69/69 通过：`notice-audience`、`secretary-overview-attendance`、`state-enum-guard`、`workforce-gate`、`module-owner-authz`、`activity-creation-transaction`、`permission-gate`、`data-lifecycle-guard`。
- 考勤/缓存复跑 34/34 通过：`secretary-overview-attendance`（含未冻结名单回退）、`attendance-roster-union`、`notice-audience`、`perf-version-token`、`perf-index-equivalence`、`meeting-attendance-rules`。
- 运行前置：`DISABLE_PASSWORD_CHECK=1`、`DEMO_READONLY=0`（与 `server/package.json` 的 test 脚本一致）。

---

## 八、处置表补记（第二轮 P2 + mock 漂移批，2026-10-20）

> 口径：只追加本批（第二子代理）实际处置；上文原发现正文与上表未改。未 commit、未 bump 版本号；`docs/src` import 后缀保持 `?v=20261020c`。

| 编号 | 状态 | 文件:行号 | 理由 / 修法 |
|---|---|---|---|
| R2-31 | 已修 | `data/mock/activities.js:35-38,47-49,67-74,83,111`；`data/mock/seed.js:18-20,28` | 10 场已过活动收口为 `completed`（act-10/15/16/21/22/27/29/30/31/36）；act-37（10/22）保持 `published`。act-10 关联任务 tsk-007/008 与分工 assign_seed_005 同步 completed（M2 判据：完成态活动不得挂未完成任务）。**在办活动 11 → 1**。 |
| R2-32 | 已修 | `data/mock/taskforces.js:8-15,47-68,97-129`；`data/workgroup-seed-sync.js:102-120`；`server/test/form-loop-registry.mjs:719-745,1000-1029` | tf-001/tf-005/tf-006 过期未完结 → `completed`；tf-002（常设 SOP 维护）保持 `active`、deadline 7/25→12/31。原 tf-001 承载的「成员产出填报 / 组织委员逐条核验」两个演示入口随 p5 与待核产出迁到 tf-002（并补 `wg-taskforce-tf-002` 授权），不新造账号、不虚增人数。**在办专班 4 → 1**。 |
| R2-33 | 已修 | `services/governance/todo.js:1577-1600`；`server/seed.js:193-197`；`server/test/{mock-api-parity,round3-4-security,party-group}.test.mjs` | 删除 `todo_seed_7`「设置第三党小组组长」（p4 已是组长；并入 `OBSOLETE_SEED_IDS` 清理老 localStorage 残留）。mock 与 server 同源仍为 `SEED_TODOS`；todos 种子下限 2→1。 |
| R2-40 | 已修 | `entries/tabs/prop/archive-tab.js:707-727,868-874,1090-1155`；新增 `services/activity/archive.js`；`data/mock-adapter.js:1116-1152`；`data/api-adapter.js:565-572`；新增 `server/test/archive-record-write.test.mjs` | 上传/删除统一走 `ArchiveStore`：api → `POST/DELETE /api/v1/archiveRecords`（落 `archive_records` 表，刷新可读）；mock → MockAdapter（localStorage）。删除原「server 端无 archiveRecords 表」错误注释。两条回归：mock 写删同源、api 必须 POST 而非只写内存。 |
| R2-47 | 已修 | `services/activity/attendance.js:674-748`；`components/dashboard/stats.js:63-99`；`entries/tabs/visitor/attendance-tab.js:72-115,130-145` | 新增显式语义 `attendanceRateByRoster` / `attendanceRateByRecorded` 与 `summarizePersonAttendanceByRoster`（应到分母）；首页个人考勤、成员台「我的出勤率」、单场行均改用应到人次，未录显示「待录入」，不再把 `records.length` 当分母。 |
| R2-13 | 已修 | `data/mock-adapter.js:283-292,386-395,480-495`；`data/data-loader.js:19-28`；`components/shell/workspace-shell.js:204-206`；`components/record/calendar.js:564-578,674-684`；`services/member/person.js:510-518`；`core/domain/domain.js:33-34` | 活动模型删除 `executor`/`supervisor` 写入与人员引用判定；日历活动点色改按活动类型（`getActivityColor`），不再把 personId 当角色键。`executor` 仅保留在 SOP 任务节点（角色键）语义中。 |
| R2-14 | 已修 | `services/activity/attendance.js::attendanceRateTone`；`stats.js`；`visitor/attendance-tab.js` | 出勤率分档单一源：良好线 90 + 制度提示线 `attendance.lowRateHint`（默认 80），三处共用；不再 90/70 与 90/80 两套。 |
| R2-15 | 已修 | `core/domain/policy-defaults.js:136-146,279-285`；`entries/tabs/org/talent-tab.js:55-64,96-108` | 预备期 12/9 个月收进 `POLICY_DEFAULTS.member.probation`（institutional，登记 `POLICY_FIXED`）；`_monthsSince` 改为按日判断的**整月**差，消除同日前后一个月偏差。 |
| R2-17 | 部分修 | `core/domain/constants.js:10-20`；`mock-adapter.js`、`services/member/{party-group,member-flow}.js`、`core/domain/profile-access.js`、`secretary/group-progress-tab.js` | 新增 `DEFAULT_BRANCH_ID` 单一导出 + `resolveBranchId`；删除 5 个同名局部常量。仍有约 28 处内联 `|| 'br-b1'`（页面过滤/审计）未扫，列入下一批同类合并。 |
| R2-18 | 已修 | `services/activity/taskforce.js:680-694` | 专班报送通知 `branchId` 取 `activity.branchId || tf.branchId || me.branchId`；三者皆空则跳过并 warn，不再写死 br-b1。 |
| R2-19 | 已修 | `services/member/person.js:123-129,392-420` | mock 新增成员 `branchId` 取操作人（`opts.by`）所属支部；无操作人/无支部 → `null`（待归属），已有成员不改原归属。 |
| R2-21 | 已修 | `services/branch/config-clean.js:29-33`；`entries/pages/settings-entry.js:39,120,670-678` | 新增 `CONFIG_HISTORY_DISPLAY_MAX=50`；展示切片与设置页说明同引 `CONFIG_HISTORY_DISPLAY_MAX` / `CONFIG_HISTORY_MAX`。 |
| R2-24 | 已修 | `core/domain/constants.js::DASHBOARD_LIMITS`；`shell/header.js:377`；`dashboard/gallery.js:103`；`dashboard/activity-panel.js:97` | 通知 10 / 风采 6 / 活动 10 收进单一常量，三处共用。 |
| R2-30 | 已修 | `components/governance/workforce-duty-card.js:26-30`；`components/governance/work-overview.js:204-238`；`entries/tabs/org/overview-tab.js:1-35`；`server/test/page-sweep.test.mjs:521-532` | 履职卡「发展党员」直接映射 `talent`；条线缺口由 `work-overview` 结构化 `gapTab` 输出；删除 org 外壳按 DOM 文案/属性打补丁的整段逻辑，S22 守卫改钉新结构。 |
| R2-34 | 已修 | `services/governance/todo.js:1577-1596` | 宣传待办 `sourceId` 指向 act-37、`sourceType=activity`、`actionData.activityId`；deadline 12/31→10/29（活动日 + T+7），活动归档可随源销项。 |
| R2-35 | 已修 | `data/mock/inspection.js:85-96` | 只保留最近一批（act-26，8/7）3 条 `pending`（insp-24/25/26），其余历史 39 条统一 `confirmed`；用派生循环而非逐条改字面量，mock/server 同源生效；不伪造 recordedAt。 |
| R2-36 | 已修 | `entries/tabs/visitor/attendance-tab.js:140` | 补课截止在 `pending && deadline < today` 时显式标「已逾期，请尽快提交」；种子截止保持 `缺勤日 + policy T+7`（9/17）不伪造。 |
| R2-37 | 已修 | `data/mock/notices.js:181-190` | 种子通知 `createdBy` 由 `'p13'` 改为 `null`（系统初始通知），不再把现任支书写进历史通知；真实发布仍写当前登录人。 |
| R2-38 | 已修 | `data/mock/accounts.js:11-16`；`server/test/mock-integrity.test.mjs:153-158` | 补第三党小组组长 p4 账号（2400012348）；mock-integrity 新增「每个 role=leader 至少一个演示账号」守卫。 |
| R2-39 | 已修 | `data/mock/notices.js:2` | 注释由「7 月通知（当前有效）」改为「历史通知（多数已过期；有效期由 expireDate 决定）」。 |
| R2-44 | 已修 | `services/activity/makeup.js:20-24` | 删除未使用的 `PEOPLE` import。 |
| R2-45 | 已修 | `components/dashboard/taskforce-list.js:51-66` | 删除 disc/leader → 已撤页签 `tf-view` 的两条死映射（TASKFORCE_HREF 抢先覆盖）；shell 旧深链别名保留并注明来源。 |
| R2-01/02/03 | 延期 | 个人档案/自述空值词表 | 属前端文案/版式，已由另一子代理承接；本批按「不改前端文案/版式」边界未动。 |
| R2-04/08/09 | 延期 | 编辑模态字段、撰写人必填、换组织候选 | 同上（UI 字段集/校验文案/候选文案），留给前端文案批。 |
| R2-05/06/07/20/22/23/25/26/27/28/29/42/43 | 延期 | 快照列/配置记录/开发登录兜底/分页截断/死读取 | P3 或纯呈现/交互；不属本批「数据生命周期」必做面。其中 R2-17 剩余内联兜底与 R2-26「+N 人」下钻一并留待下一批同类合并。 |

**本批测试读数（2026-10-20）**：

- 数据/枚举/生命周期：`mock-integrity` 2/2、`mock-api-parity` 4/4、`seed-baseline` 3/3、`state-enum-guard` 6/6、`data-lifecycle-guard` 7/7、`publicity-static-guard` 4/4。
- 出勤/通知/待办：`secretary-overview-attendance` 3/3、`attendance-batch`/`attendance-roster-union`/`attendance-matrix-model`/`attendance-queue-selection-e2e` 全绿、`notice-*` 与 `today-summary` 64/64、`todo-domain*` 与 `party-group` 等 80/80。
- 档案写口：新增 `archive-record-write` 2/2（mock 写删同源 + api 必须 POST）。
- 真机普查：`page-sweep` 全绿（S22 已改钉结构化落点）、`copy-screen-guard` 11/11（R2-31 后 `disc::复盘` 控件 64→62、文案 1131 未变，按实测值改准 18.2；同屏复述 16→15 屏）。
- 专班/成员/日历：`taskforce-lifecycle`、`taskforce-history-copy`、`workgroup-*`、`inspection-workgroup-key`、`member-progress`、`member-confirmation`、`perf-render-guard`、`activity-calendar-sharing` 全绿（50/50 + 29/29 两批）。
- 文案守卫：`copy-length-guard`、`copy-master-guard`、`ux-guard`、`self-evident-copy-guard`、`copy-fold-guard` 21/21。
- 运行前置同上：`DISABLE_PASSWORD_CHECK=1`、`DEMO_READONLY=0`。

**mock 读数变化**：

- 在办活动（`isActivityInProgress`）：**11 → 1**（仅 act-37 10/22 未到）。
- 在办专班（`isTaskforceActiveStatus`）：**4 → 1**（仅 tf-002，deadline 2026-12-31）。

**下一批学号主键迁移 · p* 文件-处数 Top 10（本批后实测，共 416 处 / 18 文件）**：

| 文件 | 处数 |
|---|---:|
| `docs/src/data/mock/activities.js` | 103 |
| `docs/src/data/mock/inspection.js` | 84 |
| `docs/src/data/mock/attendance.js` | 63 |
| `docs/src/data/mock/people.js` | 52 |
| `docs/src/data/mock/taskforces.js` | 38 |
| `docs/src/data/mock/seed.js` | 19 |
| `docs/src/data/mock/accounts.js` | 18 |
| `docs/src/data/mock/review.js` | 16 |
| `docs/src/data/mock/thought-reports.js` | 11 |
| `docs/src/data/mock/party-groups.js` | 3 |

> 其余：`services/member/person.js` 2；`branches.js`/`notices.js`/`domain.js`/`issues.js`/`auth.js`/`workgroup-seed-sync.js`/`issue-dispatch-view.js` 各 1。说明：本批未做 p* → 学号迁移（按任务边界留给下一批）。


