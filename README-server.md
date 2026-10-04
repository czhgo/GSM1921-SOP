# README-server · 后端对接说明书（GSM1921-SOP）

> **本文是什么**：面向**外部后端对接团队**（学校计算中心 / 承建方 / 后续接手维护者）的**对接说明书**——把系统的**背景、角色、功能板块、字段（指针）、部署、接口、已知限制**逐项讲清，**基本**不需要先读本仓其它文件就能看懂。⚠ **一处例外**：**字段级清单**（字段名 / 类型 / 必填 / 说明）的**唯一权威源是母本 `content/04_web_design/data/DATA_MODEL.md`**——§4 自 2026-10-03 批次 361（`D-752`）起不再逐表复刻，只留**指针 ＋ 后端增量**（见 §4.0）。
>
> **本文不是什么**：不是产品宣传页，也不是「未来规划书」。文中所有「现状」均在**各节末**给出 `文件:行号` 供回查（**权威源**清单见 §8）；凡取不到出处的，一律写明「未取证」，**不做推测性表述**。
>
> **读者须知（三个易混词）**：
> - **母本**：指制度文本（本仓 `content/` 目录下的支部制度与 SOP 文档）；系统是母本的「子本」——制度怎么写，系统就怎么跑。
> - **示例组织**：仓库自带的一份演示数据（某高校院系本科生党支部，50 名成员 + 1 名党委组织员），用于开箱即跑，**可整体替换**。
> - **mock / api 两种形态**：同一套前端代码，数据源可以在「浏览器本地假数据（mock）」与「后端接口（api）」之间切换，**界面零改动**。

**依据**：`server/README.md`（后端自述）、`README.md`（根说明）、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md`（部署与对外对接，唯一权威源）。

---

## §1 系统背景与当前阶段

### 1.1 这是什么系统

**一句话**：把党支部／师生组织的**制度文本**变成**嵌进系统里、必须照做**的运行工具——日常运行有章可循、有据可查、换届不散。

**给谁用**：组织的**内部成员**按角色登录各自工作台使用；**组织级（院系党委）**另有独立工作台，用于监控下辖多个支部实例。

**系统由两部分组成**（部署形态，`DEPLOYMENT_GUIDE.md` §一）：

| 部分 | 是什么 | 数据 | 面向谁 |
|---|---|---|---|
| 前端 `docs/` | 纯静态 ESM 页面（无打包器、无构建步骤，浏览器直接加载） | mock：浏览器本地存储 + 内存 | 全部使用者 |
| 后端 `server/` | 可选一体化 Node 服务（Express + better-sqlite3 单进程），同时托管 `docs/` 静态页与 `/api/v1` 接口 | SQLite 单文件持久化 | 需要账号登录与数据持久化时启用 |

**依据**：`README.md:3`、`README.md:234`（技术形态：原生 ESM、无打包器/无构建步骤）、`server/README.md:3`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:28-35`。

### 1.2 与「SOP 母本」的关系

- **制度文本是唯一母本**：`content/02_institution/` 及其 `sop/` 子目录是支部制度与工作规程的落点；改一处制度，系统行为随之调整（改文本在前、改代码在后）。
- **母本 → 子本（系统）**：所有系统逻辑、数据模型、界面行为都要求从母本推导（`content/README.md:24` 引 `CLAUDE.md` H30.2）。
- **制度参数（可调 vs 固定）**：并非所有制度数字都写死在代码里。系统把「一件事在几天内办完」这类**过程时限**归为**支部可调的制度参数**，默认值取母本所写的数字；而「考察意见每半年一次」等属**制度固定**项，所有支部一致。数据单一源＝`docs/src/core/domain/policy-defaults.js`（逐项标注 `branch-default`＝支部可调 / `institutional`＝制度固定须支书裁决）。其中「**活动批准门**」（办活动要不要先过一道批准门）也是**支部可调的制度参数，默认关**——默认关时活动写入与改动前完全一致（见 §4.1）。

**依据**：`content/README.md:24`；`content/02_institution/SYSTEM_ROLE_PERMISSION.md:198-231`（§9l 可调口径）；`docs/src/core/domain/policy-defaults.js:1-15`（kind 标注说明）。

### 1.3 当前处于什么阶段（**示例/演示 与 真实部署的区别**）

> 这一节请务必读完——**仓库自带的是「示例组织」的演示数据，不是真实账本**。

| 维度 | 示例 / 演示形态（仓库默认） | 真实部署形态（正式使用） |
|---|---|---|
| 人员数据 | 仓库自带**示例支部 50 名成员 + 1 名党委组织员**（`docs/src/data/mock/people.js`，id 为 `p1`…`p50`、`p_pc`） | 换成**本组织真实成员** |
| 账号 | 演示账号表 `docs/src/data/mock/accounts.js`（学号 + 口令 `123456`），**明确写着「模拟 IAAA 校验」** | 对接学校统一身份认证（IAAA 为登录落点的最终目标，**尚未接入**） |
| 登录口令 | 服务端统一口令，默认 `123456`（环境变量 `LOGIN_PASSWORD` 可改） | 必须改掉默认口令，并关闭「跳过口令校验」开关 |
| 组织名称 / 配色 / 术语 | 「示例组织」的名称、党建红主题、制度术语 | 换成本组织名称、主题预设与术语 |
| 数据存储 | mock：浏览器本地存储（换设备即不同）；api：SQLite 单文件 | 学校数据库 / 服务器磁盘 + 备份策略 |
| 种子污染风险 | 空库会自动导入演示种子（`server/seed.js`） | **必须** `DISABLE_SEED=1` + 关闭前端空表回退（见 §5.6） |
| 部署定位 | 公网演示（GitHub Pages）／本地内网试用 | 计算中心托管（目标形态，**当前仍在对接准备阶段**） |
| 微信小程序 / 北大党校↔智慧党建 数据同步 | **无代码**（规划阶段） | 需另行开发 |

**如实说明三点**：
1. **演示数据可随时复位**：地址后加 `?reset=demo`（回种子初始态）/ `?reset=preview`（只清运行期预览草稿）/ `?reset=init`（清业务过程数据、保留组织骨架）。**登录后端（API 形态）后三档均不生效**——数据以服务器为权威。
2. **对接准备阶段**：`DEPLOYMENT_GUIDE.md` 明确把「计算中心托管」标为 🔶 准备阶段（代码已就绪、待对接），微信小程序标为 🔶 规划阶段（**无代码**）。
3. **公网演示只是「示例组织的一个部署」**，不代表系统的适用范围；同一套引擎可被多个组织分别部署、互不干扰。

**依据**：`docs/src/data/mock/accounts.js:1`（「Mock 登录账号（模拟 IAAA 校验）」）、`docs/src/data/mock/people.js:66`、`docs/src/data/mock/branches.js`（支部种子 `br-b1`）、`server/README.md:17-19`、`README.md:104-108`、`README.md:207`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:43-48`（就绪度表）、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:454`（IAAA 为后续目标）。

---

## §2 角色

> 本节分四层：**2.1 角色键全表**（代码枚举，共 13 键）→ **2.2 逐个角色说明**（身份 / 能做什么 / 不能做什么 / 审批位 / 特例）→ **2.3 权限矩阵**（键级，取自代码）→ **2.4 服务端鉴权门**（接口侧实际把门在哪一层）。
>
> **⚠ 给后端的关键提醒**：系统里有两套并行的「身份」概念，**不要混成一张表**——
> - **`role`（角色键）**：决定登录到哪个工作台、能写什么。全表见 2.1。
> - **`developStage`（发展阶段）**：`积极分子 / 发展对象 / 预备党员 / 正式党员` 四档——**这是成员档案上的字段，不是角色键**。这四种人的 `role` 通常都是 `participant`（普通参与者），差别体现在考勤应到口径、表决名单与通知受众上。请勿把「预备党员」「发展对象」当成角色键去查权限表。

### 2.1 角色键全表（13 键 = 11 业务键 + 2 遗留键）

| # | 角色键 | 中文标签 | 类型 | 工作台页面 | 说明 |
|---|---|---|---|---|---|
| 1 | `secretary` | 支书 | 常设 | `workspace/secretary.html` | 支部第一责任人 |
| 2 | `deputy-secretary` | 副支书 | 常设 | `workspace/secretary.html`（与支书**同页共台**） | 多数支书侧写链「副书同权」 |
| 3 | `org-commissioner` | 组织委员 | 常设 | `workspace/org.html` | 名册 / 成员发展 / 思想汇报查看调用 |
| 4 | `prop-commissioner` | 宣传委员 | 常设 | `workspace/prop.html` | 宣传任务 / 周报 / 档案归档 |
| 5 | `disc-commissioner` | 纪检委员 | 常设 | `workspace/disc.html` | 考勤 / 考察 / 复盘监督 |
| 6 | `leader` | 党小组组长 | 常设 | `workspace/leader.html` | 本组活动与考勤上传 |
| 7 | `participant` | 普通参与者 | 常设 | `workspace/visitor.html` | 默认身份 |
| 8 | `party-staff` | 党委组织员 | **组织级** | `workspace/party-committee.html` | 院系党委，**不属于任一支部** |
| 9 | `organizer` | 组织者 | **项目角色** | 无独立页面 | 仅在具体活动/专班内生效 |
| 10 | `deep` | 深度参与者 | **项目角色** | 无独立页面 | 同上 |
| 11 | `deputy-leader` | 党小组副组长 | 常设 | `workspace/leader.html`（与组长**同页同台**） | 与组长可区分的第二身份；权限集与赋权链同组长一份，任务优先打给组长 |
| 12 | `commissioner` | 条条委员 | 遗留键 | — | **不参与权限判定**，仅兼容兜底 |
| 13 | `initiator` | 发起人 | 遗留键 | — | 同上 |

**依据**：`docs/src/core/domain/constants.js:185-191,819-821`（`ROLE_KEYS`——`deputy-leader` 于该文件末挂载）、`:192`（`ROLE_LEGACY_KEYS`）、`:288-302`（`ROLE_LABELS`）、`:306-318`（`ROLE_PAGE_MAP`）；`content/02_institution/SYSTEM_ROLE_PERMISSION.md:24-38`（§9a0 角色键全表）。

**两点易错约定**：
- **「访客」不是角色**：未登录即访客（无角色键）。`visitor.html` 里的 `visitor` 只是**页面/页签前缀**，与「未登录访客」不是一回事。**另，「全体相关」（`all`）不是角色键**，故不在上表；其展示标签仍保留，见 §2.2.11。**同族同步**：`content/02_institution/SYSTEM_ROLE_PERMISSION.md` 的 §9a0 角色键全表**亦为 13 键**。
- **`party-staff` 不属于任何支部**：示例种子中它的 `branchId` 为 `null`。

**依据**：`content/02_institution/SYSTEM_ROLE_PERMISSION.md:42`、`docs/src/data/mock/people.js:66`（`p_pc`：`role:'party-staff'`、`branchId: null`）。

**第三个页面（非工作台）的支委门**：`docs/party-committee-meeting.html`（支委会会议页）**不是角色工作台**，无独立角色键——它的进页门 = 「**登录人在本支部支委名单内**」**或**「**被任一场支委会的 `voteConfig.voterIds` 包含**」（支书逐字裁定：「**他只能看到扩大到他的支委会！**」——被扩大进支委扩大会的人可进本页，但**只看得到扩大到他的那些场次**，其余场次不进下拉、经 URL 直指也被拒）。支委名单与线上表决「应到名单」**同一单一源**：`docs/src/services/activity/vote-config.js::resolveVoterIds('committee')`（`people.js` role + `AuthStore.isCommissioner`，排除 `u_*`，即支书 / 副支书 / 组织委员 / 宣传委员 / 纪检委员）。页内场次过滤的纯函数单一源＝`docs/src/entries/pages/party-committee-meeting-entry.js::visibleMeetingsFor`。对应地：

| 角色键 | 能否进会议页 | 页内能做什么 | 服务端写口（既有门，本批未放宽） |
|---|---|---|---|
| `secretary` / `deputy-secretary` | 能（看**全部**场次） | 建/选线上支委会、提取议程、汇总、**截止**、记录讨论结果 | 建/改活动 → 支委层活动写门；截止 → `POST /api/v1/agenda-votes/lock`（`SECRETARY_AND_DEPUTY_ROLES`，非此二者 403 `无权限`） |
| `org-commissioner` / `prop-commissioner` / `disc-commissioner` | 能（看**全部**场次） | 就议程表态（同意 / 异议 / 附言）、查看汇总与讨论结果 | 表态 → `POST /api/v1/agenda-votes`（须在活动 `voteConfig.voterIds` 内） |
| 被扩大进某场的人（如党小组组长；**不在**支委名单） | 能，但**只看得到扩大到他的那些场次**（其余场次不进下拉、直指被拒并给根因提示） | 在该场按应到名单表态、查阅议程与讨论结果（只读）；提取议程 / 改本场参会范围 / 汇总截止 / 记录讨论结果**均不呈现** | 表态 → `POST /api/v1/agenda-votes`（须在该场 `voteConfig.voterIds` 内）；截止 403 `无权限` |
| `leader` / `participant` / 其它（既不在支委名单、也无任一场支委会扩大到其范围） | **不能** | 页面只呈现「你在支委会会议页没有可见的会议」，不渲染会议数据与任何操作 | 表态 403 `不在本次表决名单`；截止 403 `无权限` |

**依据**：`docs/src/entries/pages/party-committee-meeting-entry.js`（页面自检）、`docs/src/services/activity/vote-config.js:54-67`（`resolveVoterIds` 名单单一源）、`server/routes/committee.js:56-92`（表态门）、`:161-177`（截止门）、`server/routes/resources/index.js`（活动写门）。

### 2.2 逐个角色说明

> 「权限键」取自代码 `ROLE_PERMISSIONS`（实际被判定的键集）。**注意**：制度文档里的权限矩阵带有中文限定语（如「Y(审阅)」「Y(建档)」），那些**限定语不是权限键**，它们靠各写入口的业务守卫实现（例如「组长可上传本组考勤」由 `docs/src/services/activity/attendance.js::canUploadAttendance` 判定，而不是靠一个 `record_attendance` 键）。

#### 2.2.1 `secretary` 支书

| 项 | 内容 |
|---|---|
| 支部身份 | 支部第一责任人，主持支部全面工作；示例组织中为 `p13` |
| 工作台 | `secretary.html`（与副支书共台） |
| 权限键 | `view_all`、`create_activity`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_inspection`、`manage_taskforce`、`initiate_taskforce`、`authorize_taskforce`、`authorize`、`archive`、`manage_members` + 意见反馈**基础键 7 个**（`issue.view` / `issue.create` / `issue.comment.add` / `issue.reaction.toggle` / `issue.mention` / `issue.reference` / `issue.edit.own`）+ 意见反馈**处置键 8 个**（`issue.status.change` / `issue.close` / `issue.comment.hide` / `issue.edit.others` / `issue.milestone.manage` / `issue.assignee.set` / `issue.drafts.merge` / `issue.drafts.reject`）——**支委层五角色（支书 / 副支书 / 组织 / 宣传 / 纪检）均持** |
| 不能做什么 | 不持 `record_attendance`（不直接记考勤）、不持 `summarize_inspection`（不汇总考察）、不持 `assign_project_role`（项目角色赋权走组长/组织者链） |
| 审批位 | ① 成员变更申请**确认**（组织委员审批后由支书确认生效）；② 支部**上报党委**的发起方；③ 意见反馈**处置**（指派/关闭/重开/隐藏/合并/里程碑/终审）——**归支委会：支委层五角色（支书 / 副支书 / 组织 / 宣传 / 纪检）均可**；④ **品牌认定**：本角色可**提案**，认定本身须经**支委会审议通过**后确定 |
| 特例 / 边界 | ① **看不到匿名反馈的真实提交人**——「处置」与「查看真身」是两项分开的权限（真身仅党委可查）；② 支部 config 全量可写，但**不含支部官方名 `name`**（仅 `party-staff` 可改）；③ 党小组管理（新增/改名/解散/归组）仅支书（含副支书）；④ 进宣传工作台只放行「档案归档」页（代归档兜底），不获得其它页签；⑤ **支委身份配置**：可把**本支部成员**配为组织 / 宣传 / 纪检委员（可改派、可撤销）——**支书本人与副支书的身份由党委配置**，不在此列；**副支书与支书同权**（两者均可配） |
| 依据 | `docs/src/services/core/auth.js:78`、`:68-75`、`docs/src/core/domain/constants.js:198-200`（`BRANCH_COMMISSION_ROLES`）、`docs/src/core/domain/constants.js:327-333`（归档兜底）、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:167-180`（§9j）、`server/routes/resources/gates.js:24-36`（党小组门） |

> **⚠「仍专属支书」的清单**：「**品牌认定**」「**意见处置**」已归支委会 / 支委层，**仍专属支书**的为——① **活动信息编辑**（巡查面板按钮，前端按 `SECRETARY_ROLES` 判：`docs/src/components/record/inspector.js:626`）；② **全支部通知发布**（本组通知发布口的注释明写「全支部通知仍归支书」：`docs/src/components/governance/notice-view.js:182`）；③ **名册成员变更确认链的阶段语义端点**（服务端走 `SECRETARY_AND_DEPUTY_ROLES`，属既有支书写链：`server/routes/member.js:125`）。`SECRETARY_ROLES` 的注释写明「品牌认定、意见处置已移出本集」（`docs/src/core/domain/constants.js:201`）。

#### 2.2.2 `deputy-secretary` 副支书

| 项 | 内容 |
|---|---|
| 支部身份 | 与支书**同页共台**（`secretary.html`）；示例组织中为 `p14` |
| 权限键 | 与支书**完全一致**（含意见反馈基础键 7 个 ＋ **处置键 8 个**，两角色同持） |
| 副书同权范围（制度与代码均已确认） | 成员变更确认、在册状态镜像、发展阶段推进、移出/撤销流出确认、议程结果区与编辑议程、支部 config（modules/blocks/workforce/组织档案/域参数全量）、线上表决截止、党小组管理、成员流动登记、**支委身份配置**（本支部支委身份＝组织 / 宣传 / 纪检委员，支书 / 副支书均可配） |
| 不能做什么 | ① 改支部官方名 `name`（仅 `party-staff`）；② 不持 `record_attendance` / `summarize_inspection` / `assign_project_role`；③ 不越权「仍专属支书」的前端动作——**活动信息编辑**按钮（`docs/src/components/record/inspector.js:626`（`SECRETARY_ROLES`），前端按它判）与**全支部通知发布**（`docs/src/components/governance/notice-view.js:182`） |
| 特例 | 代码里「副书同权」实现为常量 `SECRETARY_AND_DEPUTY_ROLES = ['secretary','deputy-secretary']`，被成员变更确认、党小组管理、表决截止等多处写门引用 |
| 依据 | `docs/src/services/core/auth.js:79`、`docs/src/core/domain/constants.js:204`、`server/routes/member.js:125`、`server/routes/committee.js:161`、`server/routes/resources/gates.js:21,63` |

#### 2.2.3 `org-commissioner` 组织委员

| 项 | 内容 |
|---|---|
| 支部身份 | 组织条线负责人（名册、成员发展、思想汇报、专班统筹）；示例组织中为 `p11` |
| 权限键 | `view_all`、`record_inspection`、`manage_taskforce`、`initiate_taskforce`、`authorize_taskforce`、`archive`、`dispatch_line` + 意见反馈基础键 7 个 ＋ **处置键 8 个** |
| 不能做什么 | 不持 `create_activity`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_attendance`、`summarize_inspection`、`authorize`、`manage_members`（**不能设/取消组长**）；不能增减党小组（只能看清单与未分组人数） |
| 审批位 | ① 成员变更申请**审批**（`POST /api/v1/member-change-requests/:id/approve`，**组织委员专属**）；② 思想汇报**打回**（事后反馈，须附意见；提交即入库，不需要审批归档）；③ 名册**新增成员**与**档案行内编辑**（专属写门）；④ 成员流动（流入/流出）登记 |
| 特例 | 域参数：可改**本域** `policyOverrides.memberConfirmation`（学期末滞留集中复核窗口）/ `thoughtReport`（思想汇报建议篇幅与警告审阅线） |
| 依据 | `docs/src/services/core/auth.js:80`、`server/routes/member.js:91,230,280`、`server/routes/resources/index.js:320-323`、`server/system-notice-kinds.js:106-111`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:152-165`（§9i） |

#### 2.2.4 `prop-commissioner` 宣传委员

| 项 | 内容 |
|---|---|
| 支部身份 | 宣传条线负责人（宣传任务、素材归档、周报）；示例组织中为 `p12` |
| 权限键 | `view_all`、`manage_taskforce`、`initiate_taskforce`、`archive`、`dispatch_line` + 意见反馈基础键 7 个 ＋ **处置键 8 个** |
| 不能做什么 | **不能创建活动**（不持 `create_activity`）——制度原话是「宣传委员不可创建活动，但任何活动创建后应自动出现在宣传委员的视图中」；不持考勤/考察相关键；不持 `authorize*`（不赋权） |
| 职责位（在其工作台） | 宣传任务、项目看板、档案归档（含页内「周报」折叠区＝归档特例，2026-10-04 批次 367 由原「周报报送」页签并入；含上传宣传材料、删除记录时联动删物理文件） |
| 特例 | 通知**发布**权在宣传委员（发布角色集＝支委层除纪检）；通知**编辑/删除**（管理位）＝支委层全体（含纪检） |
| 依据 | `docs/src/services/core/auth.js:81`、`content/04_web_design/data/DATA_MODEL.md:234`、`docs/src/core/domain/constants.js:259-260`、`server/routes/resources/gates.js:31` |

#### 2.2.5 `disc-commissioner` 纪检委员

| 项 | 内容 |
|---|---|
| 支部身份 | 纪律与考勤考察监督条线；示例组织中为 `p10` |
| 权限键 | `view_all`、`record_attendance`（**唯一持有该键的常设角色**）、`summarize_inspection`、`record_inspection`、`manage_taskforce`、`initiate_taskforce`、`dispatch_line` + 意见反馈基础键 7 个 ＋ **处置键 8 个** |
| 不能做什么 | 不持 `create_activity`、`fill_review`（**除非其本人是该活动的组织者**，否则只收「监督组织者复盘」的审批待办）、`authorize*`、`assign_project_role`、`manage_members` |
| 审批位 | ① 考勤**确认**（确认后缺勤自动派生补课任务）；② 考察**确认**（确认后录入考察档案）；③ 复盘**批注 / 打回 / 确认**；④ 通知**管理位**（编辑/删除，但不含发布） |
| 特例 | ① 域参数：可改本域 `policyOverrides.inspection`（考察超期天数）/ `attendance`（考勤录入提醒、汇总期限、出勤率提示线）/ `review`（复盘提醒与提交期限）/ `makeup`（补课范围与时限）；② 可见性投影与其他角色不同——其数据权限是「全员 × 考勤/考察」，**不含在办与汇报**（避免知情过载） |
| 依据 | `docs/src/services/core/auth.js:82`、`docs/src/core/domain/constants.js:259-260`、`docs/src/services/core/visibility.js:53`、`server/routes/resources/index.js:320-323` |

#### 2.2.6 `leader` 党小组组长

| 项 | 内容 |
|---|---|
| 支部身份 | 党小组（支部下的最小活动单元）负责人；示例组织有三组组长 |
| 权限键 | `view_all`、`create_activity`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_inspection`、`assign_project_role` + 意见反馈基础键 7 个 |
| 不能做什么 | 不持 `record_attendance`（**系统里「上传考勤」不是组长权限键**，而是「谁在这件事上是组织者/记录人」派生的业务守卫）；不持 `manage_taskforce` / `initiate_taskforce` / `authorize` / `authorize_taskforce` / `archive` / `manage_members` |
| 写活动范围 | 组长**只能**创建/修改**「党小组会」「主题党日」**两类活动；服务端写门按活动类型判定，越界返回 403 |
| 可见范围 | 「块块」口径——只看**本党小组组员**（维度含在办/卡点/汇报/考勤/考察） |
| 特例 | 赋权链：组长可赋权**项目角色** organizer/deep（`assign_project_role`） |
| 依据 | `docs/src/services/core/auth.js:83`、`server/routes/resources/gates.js:90-97`、`docs/src/services/core/visibility.js:54`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:94` |

#### 2.2.7 `participant` 普通参与者（含普通党员 / 预备党员 / 发展对象 / 积极分子）

| 项 | 内容 |
|---|---|
| 支部身份 | 默认身份；**「预备党员 / 正式党员 / 发展对象 / 积极分子」是 `developStage` 字段的取值，不是角色键**——他们的系统角色仍是 `participant` |
| 工作台 | `visitor.html`（成员工作台） |
| 权限键 | `view_public` + 意见反馈基础键 7 个 |
| 能做什么 | 看公开/本人相关视图；提交意见反馈与评论、表态、提及/引用、编辑自己提交的内容；提交思想汇报；提交本人复盘（组织者/深度参与者身份时）；报名活动/专班 |
| 不能做什么 | 任何「记录类」写入（考勤、考察、复盘批注、名册、通知发布、活动创建…）一律不可 |
| 特例 | 不持 `record_inspection`——本人素材走**活动参与记录**（制度矩阵 §9d 该键为 `--`） |
| 依据 | `docs/src/services/core/auth.js:84`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:80-84`（§9d）、`docs/src/core/domain/constants.js:231`（`DEVELOP_STAGES`） |

#### 2.2.8 `party-staff` 党委组织员（组织级）

| 项 | 内容 |
|---|---|
| 身份 | 院系党委的组织员／党务老师；**不属于任一支部**（示例种子 `branchId: null`），**不参与支部内部活动闭环** |
| 工作台 | `party-committee.html`（党委工作台），登录直达 |
| 权限与职责 | ① 支部**实例管理**（增改、空模板创建/复制创建、**只有它可改支部官方名 `name`**）；② 支书**任命/撤换**（写任期档案 + 同步双方 `users.role` + 写 `branches.secretaryId`）；③ 支部**上报审批**（逐项批准/驳回，驳回须意见）；④ **下发通知**（送达目标支部支委层）；⑤ 支部**配置**（modules/blocks/workforce/组织档案/域参数，全支部）；⑥ `branches` / `appointmentRecords` 与 `users` 的 `POST`/`DELETE` 资源级写权限**仅此角色**（`users` 的 `PATCH` 另开「本支部现任支书 / 副支书的支委身份配置」一格） |
| 唯一例外 | 党委**保留对匿名意见反馈的核查权**——`GET /api/v1/issues/reveal` 可查看匿名反馈**真实提交人**，且**每次查看写一条留痕**（`issue_reveals` 表）。这是「不参与支部内部事务」的唯一例外 |
| 特例 | 制度权限矩阵 §9b（支部 6 角色）与 §9c（项目 2 角色）**都不含它**——它是组织级角色，不进支部矩阵。另外：可见性配置表 `ROLE_VISIBILITY` 中没有它，因此「谁能看谁」的投影对它返回空 |
| 依据 | `docs/src/services/core/auth.js:90-106`、`server/routes/resources/gates.js:25-27`、`server/routes/resources/index.js:172-230`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:44,167-180`、`docs/src/services/core/visibility.js:48-56`（无 party-staff 键）、`server/routes/resources/index.js:547-568`、`server/db.js:41` |

#### 2.2.9 `organizer` 组织者（项目角色）

| 项 | 内容 |
|---|---|
| 身份 | **不是常设职务**——某人被指定为**某一次活动/某个专班**的组织者时，才在该项目内获得此身份 |
| 页面 | 无独立工作台（在成员工作台内体现，`visitor.html`） |
| 权限键 | `view_project`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_inspection`、`assign_project_role` |
| 生效条件 | **仅在带项目上下文时生效**（判定函数传入 `projectId`）；脱离项目的普通调用不生效 |
| 能做什么 | 在**该项目内**派任务、改分工、标完成、填复盘、导入考察、赋权深度参与者 |
| 不能做什么 | 不获得项目之外的任何权限；不改支部级配置 |
| 任务 | **同一项目内，组织者与深度参与者各持「自己的那份任务」**——不是同一份任务清单发给两个人。主口径是「**我的任务**」（分类依据＝「我」），「**项目分工**」是同一事实的转置（分类依据＝「项目」），**一体两面、允许视图切换**——**同一份事实、两种切法，不是两套数据**。组织者那份含**「分配工作给深度参与者」并逐项选择是否系统内完成**、改分工、打包提交与上传；深度参与者那份是宣传产出、材料整理一类**不含上传**的活——**系统内完成的产出由系统在后台同步**，深度参与者未闭环的**由组织者优先推动闭环**（口径见母本 `content/02_institution/sop/常见工作场景快速指南.md`，与 `SOP-B-17`「组织者＝信息流与任务流」· `SOP-B-10`「以人为第一列」· `SOP-A-5`「上传只认组织者」相接）。**现状：系统已按项目内身份给任务**（成员台「项目分工 → 我的任务」按项目内身份读取）；**「逐项选择是否在系统内完成」已落**（组长台写入表单在「深度参与者」下方多一排勾选——项＝该场景任务链里 `executor==='deep'` 的节点，选择落**活动主源字段 `deepWorkMode`**，「我的任务」据此标「系统内完成 / 线下完成·由组织者确认」）；尚余「深参那份由组织者**自行分配**（新增项）」未做，见 `.ctx/REVIEW_QUEUE.md` `SOP-B-31`） |
| 依据 | `docs/src/services/core/auth.js:90-93`、`:494-513`（`canDo` 项目上下文并集判定）、`content/04_web_design/data/DATA_MODEL.md:181-193`（参与人双入口边界：**勾参与人 ≠ 赋项目角色**） |

#### 2.2.10 `deep` 深度参与者（项目角色）

| 项 | 内容 |
|---|---|
| 身份 | 同上，项目内身份 |
| 权限键 | `view_project`、`mark_complete`（仅两项） |
| 能做什么 | 看被赋权的项目、标记完成 |
| 不能做什么 | 不能派任务、改分工、填复盘、导入考察、再赋权 |
| 任务 | **任务由组织者分配（逐项标注是否在系统内完成）；系统内的产出由系统在后台同步，系统外的线下完成由组织者确认；未闭环的由组织者优先推动闭环**——深参那份**不含上传 / 打包 / 派任务**类动作（口径见母本 `content/02_institution/sop/常见工作场景快速指南.md`，与 `SOP-A-5`「上传只认组织者」相接）。**现状：已按项目内身份给任务（成员台「我的任务」）；「逐项标注是否在系统内完成」已落**（组织者在写入活动时逐项勾选，落活动主源 `deepWorkMode`；「我的任务」标「系统内完成 / 线下完成·由组织者确认」——**标了「去线下做」的不进系统产出链**（无「勾掉」））；「由组织者**自行分配**（新增项）」尚未做（轨迹见 `.ctx/REVIEW_QUEUE.md` `SOP-B-31`） |
| 依据 | `docs/src/services/core/auth.js:92`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:75-78`（§9c） |

#### 2.2.11 遗留键与 `all`（`commissioner` / `initiator` 为遗留键；`all` 已非角色键）

| 键 | 中文 | 说明 |
|---|---|---|
| `commissioner` | 条条委员 | **遗留键，无独立角色语义**，仅保留兼容；`ROLE_PERMISSIONS` 中没有它 → 不参与权限判定 |
| `initiator` | 发起人 | 同上 |
| `all` | 全体相关 | **非角色键**（已自 `ROLE_LEGACY_KEYS` 撤除）；原在 SOP 场景任务的 `executor` 字段里表示「全员参与」，该用点随 `org-life` 场景一并删除；现仅作参考指南展示键（标签 / 色值保留） |

**依据**：`docs/src/core/domain/constants.js:192`（`ROLE_LEGACY_KEYS`——**已自其中撤除「全体相关」**）、`:288-302`（`ROLE_LABELS`，「全体相关」的展示标签仍保留）；⚠ **`all` 现非角色键**，且已不再出现在任何 SOP 场景任务的 `executor` 里——原来那三处用点随 `org-life` 场景一并删除（`executor` 的现行取值见 §4.15）。

> ⚠ **注意区分两组同名集合**（后端实现权限时极易踩坑）：
> - **授权语义**（含支书/副支书）＝ `BRANCH_COMMISSION_ROLES`（5 个键）：服务端 `requireCommissioner` 与前端「是否支委」判定用它。
> - **业务语义「条条委员」**（三委员，**不含**支书/副支书）＝ `COMMISSIONER_ROLES`（`commissioner`/`org-commissioner`/`prop-commissioner`/`disc-commissioner`）。
>
> **依据**：`docs/src/core/domain/constants.js:198-200`、`:348-350`、`server/routes/auth.js:92-97`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:43`。

### 2.3 权限矩阵（键级，取自代码）

#### 2.3.1 常设角色 × 权限键（实际判定集）

| 权限键 | 支书 | 副支书 | 组织委员 | 宣传委员 | 纪检委员 | 党小组组长 | 普通参与者 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `view_all` | Y | Y | Y | Y | Y | Y | --（仅 `view_public`） |
| `create_activity` | Y | Y | -- | -- | -- | Y | -- |
| `assign_task` | Y | Y | -- | -- | -- | Y | -- |
| `modify_assignment` | Y | Y | -- | -- | -- | Y | -- |
| `mark_complete` | Y | Y | -- | -- | -- | Y | -- |
| `fill_review` | Y | Y | -- | -- | -- | Y | -- |
| `record_attendance` | -- | -- | -- | -- | **Y** | -- | -- |
| `summarize_inspection` | -- | -- | -- | -- | **Y** | -- | -- |
| `record_inspection` | Y | Y | Y | -- | Y | Y | -- |
| `manage_taskforce` | Y | Y | Y | Y | Y | -- | -- |
| `initiate_taskforce` | Y | Y | Y | Y | Y | -- | -- |
| `authorize_taskforce` | Y | Y | Y | -- | -- | -- | -- |
| `authorize` | Y | Y | -- | -- | -- | -- | -- |
| `assign_project_role` | -- | -- | -- | -- | -- | **Y** | -- |
| `archive` | Y | Y | Y | Y | -- | -- | -- |
| `manage_members` | Y | Y | -- | -- | -- | -- | -- |
| `dispatch_line` | -- | -- | Y | Y | Y | -- | -- |
| 意见反馈基础键（7） | Y | Y | Y | Y | Y | Y | Y |
| 意见反馈**处置键（8）**〔支委会职权〕 | **Y** | **Y** | **Y** | **Y** | **Y** | -- | -- |

**依据**：`docs/src/services/core/auth.js:68-84`（逐角色数组）、`:494-513`（`canDo`）。上表「Y/--」为**代码实际集合**；制度文档 §9b 的表格带中文限定语（审阅/建档/导入/汇总/配合等），两者**列的键集不同**（§9b 还有一列 `record_attendance` 等但带限定语），后端实现请以本节键集为准。

#### 2.3.2 赋权链（谁能赋权谁）

| 授权人 | 可赋权角色 | 授权语义 |
|---|---|---|
| 支书 / 副支书 | 党小组组长（常设） | `authorize` |
| **支书 / 副支书（本支部现任）** | **本支部支委身份**：组织 / 宣传 / 纪检委员（常设；撤销＝回落普通参与者）——**不含支书 / 副支书**（一把手层归党委） | 写层业务守卫（`docs/src/services/branch/appointment.js::appointBranchCommissioner`） |
| 支书 / 副支书 + 组织委员 | 组织者 / 深度参与者（专班） | `authorize_taskforce` |
| 党小组组长 | 组织者 / 深度参与者（**项目**） | `assign_project_role` |
| 组织者 | 深度参与者（项目） | `assign_project_role` |

**依据**：`docs/src/services/core/auth.js:100-106`（`AUTHORIZE_CHAIN`）、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:86-96`（§9e）。

> **注意**：支委中的**支书 / 副支书**由**党委**配置、不在本链（换届选举涉及支委班子身份赋权，由党委改变支部设置）；**其余支委身份**（组织 / 宣传 / 纪检委员）由**本支部现任支书 / 副支书**配置（两者均可配；`AUTHORIZE_CHAIN` 的支书行已含该边，写口 `docs/src/services/branch/appointment.js::appointBranchCommissioner`，判据 `docs/src/core/domain/constants.js::branchCommissionerWriteDeny`）。

#### 2.3.3 写层业务守卫（不在权限键集里的写权）

以下写权**不通过权限键判定**，由各自写入口的角色门实现（后端实现时**必须逐个补上**，否则会出现「键矩阵全对、接口仍可越权」）：

| 写对象 | 允许角色 | 落点 |
|---|---|---|
| 支部 `config`（modules/blocks/workforce/组织档案/域参数） | 全量：`party-staff` / 本支部**现任支书** / 本支部**副支书**（可改全部 8 个节）；域参数（域负责人各管本域节）：纪检（`inspection`/`attendance`/`review`/`makeup`）· 组织（`memberConfirmation`/`thoughtReport`）· 组长（`leader`）；`activityApproval` 归支书域、仅全量权者可改 | `server/routes/resources/index.js:313-499` |
| 支部顶层治理字段（`name`/`type`/`secretaryId`/`status`） | **仅 `party-staff`** | `server/routes/resources/gates.js:25-27` |
| **本支部支委身份**（组织 / 宣传 / 纪检委员；`users` 的 `PATCH`） | 仅**本支部现任支书 / 副支书**（`branches.secretaryId` / 本支部现任 `deputy-secretary` 那一行）；靶标限**本支部成员**、写入身份限**白名单 ∪ 撤销回落 `participant`**；跨支部 / 白名单外角色键 / 支书·副支书身份一律 **403** | `server/routes/resources/gates.js:27,66`（`_branchCommissionerGateDeny`）、`docs/src/core/domain/constants.js::branchCommissionerWriteDeny` |
| 党小组管理（新增/改名/解散/归组） | 支书 + 副支书 | `server/routes/resources/gates.js:33,63` |
| 成员流动登记（流入/流出/撤销） | 组织委员 + 支书 + 副支书 | `server/routes/resources/gates.js:35,65`、`server/routes/member.js:281` |
| 名册新增（`POST /members`） | **仅组织委员** | `server/routes/member.js:280` |
| 成员档案行内编辑（`PATCH /members/:id/profile`） | 仅组织委员 | `server/routes/member.js:230` |
| 发展阶段推进 / 在册状态镜像 / 移出 / 撤销流出 | 支书 + 副支书（移出为「组织委员发起 或 支书/副支书确认」——代码实际角色集＝`org-commissioner` + 支书/副支书） | `server/routes/member.js:163,211,284,305` |
| 信息公开的实名/匿名与真身核查 | 见 §9j：处置＝**支委会（支委层）**，看真身＝仅 `party-staff` | `server/routes/resources/index.js:507-573` |
| 支部文件（`branchDocs`）资源写口 | 支委层（含支书/副支书） | `server/routes/resources/index.js:54` |
| 通知发布 / 通知管理 | 发布＝支委层除纪检；管理（编辑/删除）＝支委层全体 | `server/routes/resources/gates.js:31` |

**依据**：上表逐行已在「落点」列给出文件行号。

### 2.4 服务端鉴权门（接口侧实际把门在哪一层）

| 门 | 含义 | 谁用 |
|---|---|---|
| （无门） | **完全公开**，不需要 token | `GET /api/v1/health`；`GET /api/v1/issues`（**唯一公开的资源读口**） |
| `requireAuth` | 需要有效 token（登录即可） | **30 个资源名的 `GET /<资源名>` 列表读**与 `GET /api/v1/bootstrap`；绝大多数写口与 `/snapshot`、`/report/*`、`/leader/member-progress`、`GET /uploads/:name`（另＋支部隔离） |
| `requireCommissioner` | 支委层（支书/副支书/组织/宣传/纪检） | `branchDocs` 的通用写口；成员变更申请创建；**`POST /api/v1/uploads`** |
| `requireRole(...)` | 指定角色集 | 成员变更审批/确认、名册语义端点、表决截止、意见反馈处置（**支委层**：`BRANCH_COMMISSION_ROLES`）、品牌认定**取消**口（支委层） |
| 资源写角色门（`RESOURCE_WRITE_GATE`） | 在 `requireAuth` 之后**再判角色** | `branches`/`appointmentRecords`→仅党委；`users`→**POST/DELETE 仅党委**、**PATCH 仅党委 或 本支部现任支书 / 副支书的「支委身份配置」一格**；`reviewRequests` POST→本支部支委层、PATCH/DELETE→党委；`notices` 发布/管理；`partyGroups`→支书；`memberFlows`→组织委员+支书/副支书 |
| 活动专门写门 | 非支委层一律拒；组长**仅限**「党小组会/主题党日」 | `POST/PATCH/DELETE /api/v1/activities*` |
| 正式表决计票写侧校验 | `optionSet='formal'` 时显式写 `ballotMode='named'` → 400 | `POST/PATCH /api/v1/activities` |

**依据**：`server/routes/resources/index.js:30-43`（逐表读口＝默认 requireAuth，白名单仅 `issues`）、`server/routes/resources/gates.js:24-67`（写门表）、`server/routes/resources/gates.js:83-97`（活动写门）、`server/routes/resources/gates.js:98-104`（计票方式）、`server/routes/resources/index.js:268`（bootstrap）、`server/routes/resources/index.js:519`（`ISSUE_DISPOSITION_SET`：意见处置＝支委层）、`server/routes/resources/index.js:547`（issues 公开读）、`server/routes/auth.js:57-96`（中间件）、`server/app.js:25`（health）。

> ⚠ **给后端的重要提示**：**「（无门）」只剩两个只读口**——`/api/v1/health` 与公开的意见反馈列表 `/api/v1/issues`（出口脱敏）。**30 个资源名的列表读与 `/bootstrap` 已改为需登录**；**此前它们是公开的**（任意人能读到 `users`（含学号）、`activities`、`attendances` 等全部资源列表）。**仍未解决的是跨支部**：列表读是整表返回、支部过滤在前端（§7.1 第 2 条）。

---

## §3 功能 / 板块

### 3.1 页面清单（共 23 个静态页）

| 类型 | 页面文件 | 用途 | 登录门控 |
|---|---|---|---|
| 根页 | `docs/index.html` | 首页：匿名可见通知 / 日历 / 专班 / 活动概览 | 匿名可访 |
| | `docs/login.html` | 登录页（账号密码 / 演示账号卡片） | 公开 |
| | `docs/search.html` | 资料查询（含支部文件） | 需登录 |
| | `docs/feedback.html` | 意见反馈提交与浏览 | 需登录 |
| | `docs/archive.html` | 归档库 | 需登录 |
| | `docs/activity.html` | 活动与会议详情 | 需登录 |
| | `docs/party-committee-meeting.html` | 支委会会议页（线上召开：提取议程 / 委员线上表态 / 汇总截止 / 留存并查阅讨论结果） | 需登录 **且** （登录人在本支部支委名单内（支书 / 副支书 / 组织委员 / 宣传委员 / 纪检委员）**或**被任一场支委会 `voteConfig.voterIds` 包含）——支委看**全部**场次；**被扩大的人只看得到扩大到他的那些场次**（其余场次不进下拉、经 URL 直指被拒并给根因提示）；两者皆非者页面只呈现「你在支委会会议页没有可见的会议」，不渲染任何会议数据与操作 |
| | `docs/taskforce.html` | 专班详情 | 需登录 |
| | `docs/notice.html` | 通知详情 | 需登录 |
| | `docs/messages.html` | 我的私信（站内信收件箱：收件 ＋ 发件一屏，可就地回复成线；**只显示站内信，不含支部公告**） | 需登录（未登录只呈现登录提示） |
| | `docs/wizard.html` | 换组织/支部配置分步向导 | 需登录 |
| | `docs/help.html` | 帮助手册 | 公开 |
| | `docs/about.html` | 「支部的故事」公开门面 | 公开（**仅静态托管形态显示**；有后端时侧边栏隐藏入口） |
| | `docs/settings.html` | 设置中心（外观 / 我的工作台 / 支部治理） | 需登录（外观区匿名可用） |
| | `docs/person.html` | 成员档案页 | 需登录 |
| | `docs/thought-report.html` | 思想汇报独立阅读页 | 需登录 |
| 工作台 | `docs/workspace/secretary.html` | 支书工作台（支书 / 副支书共台） | **强制登录**（未登录跳 `login.html`） |
| | `docs/workspace/org.html` | 组织委员工作台 | 强制登录 |
| | `docs/workspace/prop.html` | 宣传委员工作台 | 强制登录 |
| | `docs/workspace/disc.html` | 纪检委员工作台 | 强制登录 |
| | `docs/workspace/leader.html` | 党小组组长工作台 | 强制登录 |
| | `docs/workspace/visitor.html` | 成员工作台（普通参与者） | 强制登录 |
| | `docs/workspace/party-committee.html` | 党委工作台（组织级） | 强制登录 |

**依据**：`docs/` 目录实况（16 个根 `.html` + `docs/workspace/` 7 个 `.html`）；门控四层模型见 `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:443-454`（L1 工作台强制跳登录）。`party-committee-meeting.html` 的角色门为**页面内自检**（`docs/src/entries/pages/party-committee-meeting-entry.js`）：进页＝本支部支委名单（单一源 `docs/src/services/activity/vote-config.js::resolveVoterIds('committee')`）**或**被任一场支委会 `voteConfig.voterIds` 包含，页内场次再经 `visibleMeetingsFor` 按同判据过滤；服务端写口另有既有门（`server/routes/committee.js`）。

### 3.2 各工作台页签（共 73 个）

> 登记方式：每台由「能力注册表」声明页签清单（单一源 `docs/src/capabilities/*-workspace.js`）。分组轴只有一套：**支部角色台＝工作台 / 我的职责 / 知情查看 / 制度与答复**；**党委台＝首页 / 全院治理 / 支部治理**。带 ★ 的为核心页签（固定显示、不可隐藏、不参与排序）。

#### 3.2.1 支书工作台（`secretary.html`，支书与副支书共台）— 12 个

| # | 页签（id / 名称） | 分组 | 谁用 | 做什么 |
|---|---|---|---|---|
| 1 | `today` / 今天 ★ | 工作台 | 支书·副支书 | 只读速览：今天有会 / 今天到期 / 今日分工，点击 ≤1 跳直达处理处 |
| 2 | `todo` / 待办 ★ | 工作台 | 同上 | 工作域折组（会务/活动项目/考勤纪律/考察/成员发展/专班/决议上报/归档宣传/汇报反馈），域内批量确认 |
| 3 | `overview` / 全局概况 ★ | 工作台 | 同上 | 按维度 / 按人两视图的全局汇报-卡点-在办总览 |
| 4 | `calendar` / 活动管理 | 我的职责 | 同上 | 会务日历；决策树引导式创建活动（含议程、表决配置写入面板）；**2026-10-04 批次 373 按对象归位**：承接自「党小组与活动」迁入的**「党小组活动」只读列示**（direction `bottom-up`）与**「项目赋权」整卡**（情景② 活动 ＋ 情景③ 专班，含 已赋权记录·活动/专班；支书圈乙「整卡搬去活动管理」） |
| 5 | `committee-meeting` / 支委会会议 | 我的职责 | 同上（页签入口）；支委（会议页内表态） | 线上召开支委会的入口与统计（场次 / 线上召开数 / 未截止数）；进独立页 `party-committee-meeting.html`：选线上召开 → **从「拟上会」清单提取议程**（6 类：专班报送 / 意见反馈 / 制度草案 / 待报送党员大会表决的制度 / 发展对象推荐 / 品牌认定提案）→ 支委在线表态 → 汇总截止 → 留存并查阅讨论结果 |
| 6 | `group-progress` / 党小组 | 我的职责 | 同上 | 党小组清单 + 新增 / 改名 / 解散；未分组行内归组；**清单行内「设 / 改」设组长 / 副组长**（同列双身份、副组长 1–2 名、行内撤销，2026-10-04 批次 373 去冗余：原独立「组长指派」块已撤）、**支委身份配置**（在「支委会」tab 的「机构构成」段）。**2026-10-04 批次 373：页签名由「党小组与活动」改「党小组」；「党小组活动」与「项目赋权」整卡按对象归位「活动管理」页** |
| 7 | `notification` / 通知发布 | 我的职责 | 同上 | 发布通知、受众定向、催读 |
| 8 | `report-up` / 上报党委 | 我的职责 | 同上 | 向党委上报发展节点 / 活动报备，查看批复结论 |
| 9 | `member-flow` / 成员流动 | 我的职责 | 同上 | 与组织台「成员流动」**同源组件**（`entries/tabs/org/member-flow-tab.js`，一处实现两处入口）；支书 / 副支书本就有流入 / 流出登记权，此页是其入口 |
| 10 | `work-map` / 支部分工 | 知情查看 | 同上 | 工作地图：平铺模块 / 按人 / 按项目三视图 |
| 11 | `tf-view` / 知情查看 | 知情查看 | 同上 | 活动 / 专班分段**只读**（知情权：无职责亦有知情权） |
| 12 | `feedback` / 反馈管理 | 制度与答复 | 同上 | 意见反馈处置（指派 / 关闭 / 隐藏 / 合并 / 里程碑 / 终审） |

#### 3.2.2 组织委员工作台（`org.html`）— 11 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1 | `today` / 今天 ★ | 工作台 | 同上（共享渲染器） |
| 2 | `todo` / 待办 ★ | 工作台 | 同上 |
| 3 | `overview` / 工作概况 ★ | 工作台 | 汇报 / 卡点 / 在办三区总览（含条线数据注入） |
| 4 | `calendar` / 活动日历 | 工作台 | 全支部活动日历只读——**左日历 / 右详情两栏**（点日期格看当日活动、点条目进活动详情页；**2026-10-04 批次 371 按支书裁「所有的日历台都得是日历在左侧，详情在右侧、不能有全屏的日历」统一改版**）；**四台共用同一只读件**（`entries/tabs/shared/activity-calendar-tab.js`，改一次四台生效）。**2026-10-03 批次 366**（`#10` 单一轴 · 甲档）：本页＝人人有的**通用面** ⇒ 由「知情查看」组**改归「工作台」组** |
| 5 | `roster` / 成员名册 | 我的职责 | 名册增删改（答「在册成员有谁、档案状态如何」） |
| 6 | `talent` / 人才库 | 我的职责 | 全量在册成员只读画像（发展阶段徽标 / 最近考察 / 思想汇报已归档 / 发展提示）＋「活动参与汇总」（参与＝出勤 / 已补）；**发展阶段变更的写入位在个人总表**（`person.html`）。**2026-10-03 批次 366**：页底折叠区「**录入考察**」＝原独立「考察上传」页签（该页签**已删**，本台 12 → 11；依据＝支书 V-10 原话「考察就是维护人才库的过程」；实现单一源仍是 `entries/tabs/org/inspection-tab.js`） |
| 7 | `thought-review` / 思想汇报 | 我的职责 | 台账宽表（人 × 期次，行＝人 / 行＝期次互为转置），逐条进独立阅读页看正文、行内**打回**（事后反馈）。**篇幅提醒只在提交人本人侧出现**——组织侧**不留「篇幅不足」标记**、也不经手 |
| 8 | `taskforce` / 专班管理 | 我的职责 | 专班发起、招募统筹、成员与工作量；报名总表（人 × 专班，可转置）；并入**专班赋权**（选人 + 选专班 + 选角色 → 确认，可撤销） |
| 9 | `member-flow` / 成员流动 | 我的职责 | 成员「怎么变」的复式台账：流入 / 流出登记、对账行、撤销 |
| 10 | `tf-view` / 知情查看 | 知情查看 | **该角色的「赋权下游」只读视图**（2026-10-03 批次 366 · `D-755` 支书口径「知情查看 查看的是他的赋权下游」）：**分段集合由下游派生**（判据单一源 `docs/src/core/domain/work-map.js::downstreamViewSegments`；组织委员当前下游只含 `taskforce` ⇒ 本台**只出「专班」段**；**支部改派主责后随之变**＝「下游可配置」）。活动（通用面）见同台「活动日历」 |
| 11 | `my-dispatch` / 我的处置 | 制度与答复 | 意见反馈 / 汇报的收件处理位 |

#### 3.2.3 宣传委员工作台（`prop.html`）— 9 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前 |
| 4 | `calendar` / 活动日历 | 工作台 | 全支部活动日历只读——**左日历 / 右详情两栏**（批次 371 统一改版），点条目进活动详情；**四台共用同一只读件**。**2026-10-04 批次 367：由「知情查看」组改归「工作台」组**（人人有的通用面，与今天/待办/概况同类） |
| 5 | `tasks` / 宣传任务 | 我的职责 | 宣传任务台账与推进 |
| 6 | `kanban` / 项目看板 | 我的职责 | 项目（活动/专班）看板：活跃区 → 归档区 |
| 7 | `archive` / 档案归档 | 我的职责 | 归档活动/专班、上传宣传材料（文件空间 / 图片记录）、删除时联动删物理文件；**页内「周报」折叠区＝归档特例**（**2026-10-04 批次 367：原 `weekly`／周报报送页签并入本页**，页签 10 → 9）——按周次新建草稿 + 报送（含报送历史）；可按本周活动一键生成草稿；报送即通知支书 / 副支书并进支书审核位（通过 / 退回） |
| 8 | `tf-view` / 知情查看 | 知情查看 | 分段集合由「赋权下游」派生（`D-755`）；宣传委员名下无专属下游 ⇒ **只出「活动」段**（「活动」＝全支部通用知情面） |
| 9 | `my-dispatch` / 我的处置 | 制度与答复 | 同上 |

> **特例**：支书 / 副支书**可进入本工作台，但只呈现「档案归档」一个页签**（代归档兜底），不启用其它页签、不扩大任何写权限。

#### 3.2.4 纪检委员工作台（`disc.html`）— 9 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前 |
| 4 | `calendar` / 活动日历 | 工作台 | 全支部活动日历只读——**左日历 / 右详情两栏**（批次 371 统一改版），点条目进活动详情；**四台共用同一只读件**。**2026-10-04 批次 368：由「知情查看」组改归「工作台」组** |
| 5 | `attendance` / 考勤管理 | 我的职责 | 考勤矩阵宽表 + 明细；考勤 / 补课分段（确认缺勤标因、生成补课任务） |
| 6 | `review` / 复盘 | 我的职责 | 活动与专班复盘：批注 / 打回 / 确认（**2026-10-04 批次 368：页签名由「活动监督复盘」改「复盘」**——原名＝动作「监督」＋对象「复盘」混轴；页内四块未动） |
| 7 | `inspection` / 考察管理 | 我的职责 | 考察宽表 + 明细确认（确认后录入考察档案）+ 打回 / 申诉核实 + **考察代录位**（代上传方录入；本位＝该场活动组织者，非本位代录提交前弹确认） |
| 8 | `tf-view` / 知情查看 | 知情查看 | 分段集合由「赋权下游」派生（`D-755`）；本台名下仅 `attendance-inspection`（不在只读视图映射内）⇒ **只出「活动」段**（2026-10-04 批次 368） |
| 9 | `my-dispatch` / 我的处置 | 制度与答复 | 同上 |

#### 3.2.5 党小组组长工作台（`leader.html`）— 10 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前 |
| 4 | `calendar` / 活动日历 | 工作台 | 全支部活动日历只读——**左日历 / 右详情两栏**（批次 371 统一改版），点条目进活动详情；**四台共用同一只读件**。**2026-10-04 批次 369：由「知情查看」组改归「工作台」组** |
| 5 | `write` / 本组活动 | 我的职责 | 创建本组活动（**限「党小组会」「主题党日」**）、写产出记录。**2026-10-04 批次 371：页签名由「活动管理」改「本组活动」**（支书裁「**乙：按范围改名**」——支书台「活动管理」＝**全支部**写入、本台＝**本组**写入，避免同名不同职） |
| 6 | `attendance` / 考勤管理 | 我的职责 | 上传**该场组织者位**会议类型的考勤（党小组会 / 组织生活会 / 主题党日；**党课与支部党员大会不在本页**——那两类归纪检委员，**支委会不考勤**，见 3.4）；追加提交、改/删走纪检确认流程。**2026-10-04 批次 369：页签名由「考勤上传」改「考勤管理」**（对象轴，与纪检台同名同轴） |
| 7 | `inspection` / 考察管理 | 我的职责 | 上传本组活动考察。**2026-10-04 批次 369：页签名由「考察上传」改「考察管理」** |
| 8 | `members` / 组员进展 | 我的职责 | 本组组员进展：由**服务端汇总接口**返回（在办/超期/缺勤/考察待确认/汇报态） |
| 9 | `tf-view` / 知情查看 | 知情查看 | 分段集合由「赋权下游」派生（`D-755`）；本台下游＝党小组会 / 主题党日 / 共建活动 ⇒ **出「活动」段**（2026-10-04 批次 369）＋ **2026-10-04 批次 373 额外并入「其他组」段**（支书 Q3 圈甲：组长可见别组只读一览——组员进展 / 复盘 / 考勤 / 考察；看≠做、写口仍只本组） |
| 10 | `my-dispatch` / 我的处置 | 制度与答复 | 同上 |

> **特例（组织者兜底入口）**：**非组长**的人被指定为某场活动的组织者时，也可进入本台——但**只呈现「考勤管理」「考察管理」这两个页签**（该场活动上传位 + 纪检打回后的「待你确认」区），其余页签是组长身份的职责、不开放；**判据与表单零口径复制、不放宽任何写权限**。判定单一源 `docs/src/capabilities/leader-workspace.js:17-23,81-83`（`ORGANIZER_FALLBACK_TAB_IDS`），身份门与归档兜底同款（`docs/src/core/boot/bootstrap.js:19-20,181-187`）。

#### 3.2.6 成员工作台（`visitor.html`，普通参与者）— 11 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前（概况仅本人自我聚合） |
| 4 | `activities` / 活动动态 | 我的职责 | 活动参与动态；**自带「列表 / 日历 / 查询」三视图——支部活动日历即本页的「日历」视图**（**2026-10-04 批次 371：本台原独立「活动日历」页签已撤**，12 → 11；首页「完整日历 →」改落 `?tab=activities&view=calendar`） |
| 5 | `projects` / 项目分工 | 我的职责 | 本人在各活动/专班中的分工与角色；卡上「我的任务」按**项目内身份**列出本人担的那几步（`services/activity/activity.js::listMyProjectTasks`），可就地**「勾掉」**即关闭（**自查随任务产生**、写口只认本人持的那步，不担这一步的人看不到也勾不了；与归档级联同号） |
| 6 | `attendance` / 考勤概况 | 我的职责 | 本人考勤（含「去补课」入口，仅在本人有待办补课任务时出现） |
| 7 | `thought-report` / 思想汇报 | 我的职责 | 本人提交思想汇报（**提交即入库归档**；少于 1200 字触发警告审阅、不影响提交），可跨期多篇 |
| 8 | `inspection` / 我的考察 | 我的职责 | 本人考察记录 |
| 9 | `review` / 我的复盘 | 我的职责 | 本人作为组织者时的复盘提交；若被支委会**追加要求**复盘，卡上带「支委会要求」来源标记，要求**只判到「交回」**（不设「交回后自行更新」入口） |
| 10 | `tf-view` / 专班动态 | 知情查看 | 全支部**专班**只读一览（**2026-10-04 批次 371：由「知情查看」改名**——支书裁「**既然只有专班 为什么不叫 专班动态 呢**」；本台**只出「专班」段**，活动那一览已由 `activities` 承载）；点专班卡进只读详情，其中**「我的产出填报」是本人在专班上报产出的写口**（原地保留） |
| 11 | `my-dispatch` / 我的处置 | 制度与答复 | 意见反馈答复入口（认领依据＝本机浏览器里的随机标识，**只答「这台设备提交过什么」**，换设备或清浏览器数据则认不回） |

#### 3.2.7 党委工作台（`party-committee.html`）— 6 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1 | `governance-overview` / 治理总览 | 首页 | 登录落点：支部概览（成员/党员/滞留实时统计 + 近期动态） |
| 2 | `monitor` / 支部监控台账 | 全院治理 | 各支部工作台账监控；**页首「支部筛选」**（2026-10-04 批次 374） |
| 3 | `review` / 支部上报 | 全院治理 | 各支部上报的关键事项（发展节点/活动报备）——党委**接收**后逐项批准 / 驳回（驳回须意见），结论**回复支部**；**页首「支部筛选」**。**2026-10-04 批次 374：页签名由「上报审批」改「支部上报」**（支书圈丙「党委不上报、只接收 + 回复」——名按对象、批/驳为页内动作） |
| 4 | `branches` / 支部管理 | 全院治理 | 支部实例增改、空模板创建 / 复制创建、支书任命；**页内「支部配置」区（换组织向导）**——**2026-10-04 批次 374：原 `party-config` / 支部配置独立页签并入本页**（支书圈乙「管理 ⊃ 配置」）⇒ **7 → 6 页签**；`#pc-wizard-host` / `#pc-deploy-panel` id 不变 |
| 5 | `issue-review` / 匿名反馈核查 | 全院治理 | **查看匿名反馈真实提交人**（仅党委；每次查看留痕）；**页首「支部筛选」** |
| 6 | `dispatch` / 下发通知 | 全院治理 | 向目标支部**支委层**下发通知（标「党委下发」）；**页首「支部筛选」**收窄下发历史 |

**「支部筛选」**（2026-10-04 批次 374 · 支书「按下设支部筛选信息」）＝共用件 `docs/src/components/governance/branch-filter.js`（**四页复用同一件**，遵 `D-765` ⑤ 组件复用律）；`''`＝全部支部。**豁免**：支部管理（它本身就是支部主数据清单，且页内「支部配置」自带支部选择器）。

**依据（3.2 全节）**：`docs/src/capabilities/{secretary,org,prop,disc,leader,visitor,party-committee}-workspace.js`（逐台的 `tabs()` 数组）；`docs/src/core/domain/constants.js:244-253`（核心页签判定 `isCoreTab`）；`server/test/doc-consistency.test.mjs:64-72`（七台注册文件与分组轴口径）。

### 3.3 设置中心（`settings.html`）

| 分区 | 谁可用 | 内容 |
|---|---|---|
| 外观 | **人人可用**（含未登录） | 字号、明暗主题、强调色；未登录偏好存本浏览器，登录后随账号 |
| 我的工作台 | 登录用户 | 调整**本人**页签顺序（核心页签不可动）；仅本账号生效 |
| 支部治理 | 支书 / 副支书（支部信息与向导 / 工作台默认顺序 / 支部制度参数 / **配置变更记录**）；纪检 / 组织 / 组长各自的「职责参数」卡（各管本域）；党委组织员另有「快捷块说明」 | 支部配置与域参数；普通成员、访客不可见 |

> **左栏共 10 个分区**（外观 · 我的工作台 · 支部信息与向导 · 工作台默认顺序 · 支部制度参数 · 配置变更记录 · 纪检 / 组织 / 组长职责参数 · 支部治理快捷块说明）；逐区「管什么 + 谁能看到」见系统内【帮助】页 §4.1（该处逐项独立成章），本表只给三档归属。

**依据**：`README.md:144`（设置中心分区）、`README-members.md:109-117`（设置中心分区）、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:136-150`（§9h）。

### 3.4 关键机制（可复用工作流）

| 机制 | 流程要点 |
|---|---|
| 三会一课 / 主题党日 | 决策树向导创建（生成后续任务链）→ 会议议程（可挂讨论文件 / 待讨论名单）→ 通知/报名/考勤 → 线上异步表决（**出席 >2/3 且无反对**通过；弃权允许、异议视同反对）→ 记录决议 → **决议自动督办**（责任人跟进 → 逾期催办 → 支书销项） |
| 考勤 | **上传位按活动/会议类型分**：**支委会＝不考勤**（规模小，任何人无上传位）· **党课 / 支部党员大会＝纪检委员**（支书 / 副支书照例可代上传）· **党小组会＝该场会议组织者**（本组组长亦可）· **组织生活会 / 主题党日 / 其余活动＝该场组织者**。判据单一源 `docs/src/services/activity/attendance.js:85-111`（`canUploadAttendance`）→ 纪检认定异常标因（**请假分事假 / 病假两档，各带时效提示**）→ 考勤确认 → 缺勤自动生成补课任务 → **考勤统计报支委会**（交接接收位＝组织委员；`docs/src/services/governance/handoff.js:23`） |
| 考察 | 活动/专班考察上传（**组织者**）→ 纪检确认 → 组织建档 |
| 发展党员两级确认 | 来源①名册报送（组织发起）②会议议程「待讨论名单」→ 组织审批 → 支书确认生效；双层留痕、可退回、可批量。**「积极分子 → 发展对象」另设支委会讨论前置门**：须**先经支委会讨论通过**（把该成员加入某场支委会的「待讨论名单」（目标阶段＝发展对象）并记录通过）才可发起阶段变更——判据 `docs/src/services/member/member-confirmation.js:228-234`（`hasPassedCommitteeDiscussion`）。⚠ **该门目前只在前端服务层**，`server/` 内**无对应校验**（后端须自行补门） |
| 思想汇报 | 提交即入库归档（算法归集）→ 组织委员查看调用；**篇幅提醒（建议 1500 字 / 少于 1200 字触发「警告审阅」）只出现在提交人本人侧**（提交页 / 重交页 / 阅读页），**只提示、不拦提交**，组织侧不经手、也不在记录上留组织侧可见标记；组织委员可事后打回要求本人补充 |
| 外出活动提醒清单 | 写入活动时勾「本次为外出活动」→ 写入后向组织者弹 5 项清单（出发前人员清点 / 安全须知告知 / 交通方式确认 / 经费审批 / 返回后人员清点）→ **自动收起在该活动行下方、可随时展开**；**是提醒、非必填、不作校验** |
| 宣传初稿「审核 → 定稿」 | 撰写人（被分工者）在活动详情「宣传」子记录填初稿 → 「提交审核」→ 宣传委员在宣传台「档案归档」区**定稿 / 退回** → 定稿后走既有宣传材料归档链 |
| 周报报送与审核 | 宣传委员按周次新建草稿（可按本周活动自动生成）→ 报送（系统通知支书 / 副支书）→ **支书 / 副支书审核（通过 / 退回）** → 已报送可「标记已上报智慧党建平台」（只留痕） |
| 专班全生命周期 | 发起 → 招募统筹 → 定人定责定岗 → 运行 → 复盘 → 归档 |
| 上报党委双向通道 | 支部上报关键事项 → 党委逐项审批 → 结论回传；党委另有下发通知通道 |
| 线上异步表决 | 支书发起 → 通知应到成员 → 成员异步表态 → 支书汇总/截止（**截止不可逆**） |
| 线上支委会（会议页） | 支书台「支委会会议」页签 → 独立页 `party-committee-meeting.html`：选 / 建一场线上召开支委会 → **定本场参会范围**（默认＝支委层，现状不变；可扩大为**支委扩大会**并选定扩大到谁——党小组组长（代组长）可一键打包；**落点＝既有 `voteConfig.voterIds`**〔与线上表态门同一口径〕，**不新增字段**）→ **从「拟上会」清单提取议程**（读既有来源：专班报送 / 意见反馈 / 制度草案 / 待报送党员大会表决的制度 / 发展对象推荐 / 品牌认定提案；加入时只留 `sourceRef` 等回指，不复制来源）→ 支委（扩大会时含被扩大的人）线上表态（同意 / 异议 / 附言）→ 支书汇总并**截止**（`votesLocked`）→ **查阅讨论结果**（议程项 `result` + 表态记录；记录复用 `recordAgendaResult`，与活动详情页同一函数）。仅支委可进；效力 / 可见范围 / 缺席 / 是否并行线下任务四条口径留白待裁 |
| 「拟上会」清单（**支委会事项的统一归集口**） | 写议程时**从一张清单里勾**（不逐条手打议题）——类目共 **6 类**：① 专班报送（待支委会表决）② 意见反馈（**归口含支委会**的两类「事项领域」）③ 制度草案（草案态支部文件）④ **待报送党员大会表决的制度** ⑤ **发展对象推荐**（要先经支委会讨论）⑥ **品牌认定提案**（待支委会审议）。清单只做**归集与勾选**，来源本身一字不改（勾入后只在议程项上留回指）；单一源 `docs/src/entries/tabs/secretary/agenda-form.js:102-109`（`AGENDA_CANDIDATE_GROUPS`），两处消费＝写入活动的议程区块与支委会会议页「提取议程」 |
| 制度制定与迭代 | **草案**（支部文件 `status:'draft'`）→ **支委会审议**（会议议程「讨论文件」项）→ **通过**（成为现行版 `status:'current'`，写 `versionBy` / `versionAt` / `versionNote`）/ **未通过**（退回起草人修改：仍为草案 ＋ `reviewResult:'rejected'` ＋ `reviewNote`）。支委会审议时另有一档「**是否报送党员大会**」：勾了即转 `status:'pending-party-meeting'`（**不当场发布**，待支部党员大会表决通过才成现行版）。判据单一源 `docs/src/services/branch/branch-doc.js:458-515`（`applyInstitutionAgendaResult`） |
| 数据交接（支委间） | 固定协议：纪检→组织 考勤统计 / 纪检→组织 考察记录 / 组织→纪检 补课需求回执（生成即派生接收方待办）；「纪检→宣传 考勤备案」现为「报支委会」（接收位＝组织委员，`docs/src/services/governance/handoff.js:23`） |
| 数据一键重置（仅 mock 形态） | `?reset=demo` / `?reset=preview` / `?reset=init` 三档 |

**依据**：`README.md:172-186`（§3.5 关键机制）、`docs/src/core/domain/policy-defaults.js:36`（票决门槛 `quorum: 2/3`、`vetoOnObject: true`）、`docs/src/core/domain/policy-defaults.js:60-73`（会议考勤的「记录人 / 不设考勤类型」：`recorderByType` / `noAttendanceTypes`）、`docs/src/services/activity/attendance.js:85-111`（`canUploadAttendance`）、`server/routes/committee.js:161-177`（截止不可逆）、`server/routes/resources/index.js:141-159`（删除活动的级联清理）。

> **说明**：制度文本里还有「数据交接」一项（`docs/src/core/domain/domain.js:264` 的 `handoffs` 域）。**服务端已有对源**：服务端建表 `handoffs`（`server/db.js::SEMANTIC_TABLES`）＋ 语义端点 `GET/POST /api/v1/handoffs`、`POST /api/v1/handoffs/:id/confirm`（见 §6.13），前端 api 形态改经端点读写、mock 形态维持本地路径。

### 3.5 支部分工模块目录（`config.workforce` 的键集，共 14 个）

> 后端若要写支部配置（§4.25 的 `config.workforce`），**键名只能是下列 14 个模块 id**；`null`＝全按缺省主责展示。模块分两层：`norm`（工作程序 / 党内统一规范，**必办、不可停用**）与 `method`（工作方法，本支部自选，**可停用**，停用以 `{ownerType:'none', ownerId:''}` 表示）。

| # | 模块 id（`config.workforce` 键） | 模块名 | 层 | 缺省主责主体 |
|---|---|---|---|---|
| 1 | `branch-party-meeting` | 支部党员大会 | norm | `secretary` |
| 2 | `branch-committee-meeting` | 支委会 | norm | `secretary` |
| 3 | `party-group-meeting` | 党小组会 | norm | `leader` |
| 4 | `party-lecture` | 党课 | norm | `secretary` |
| 5 | `theme-party` | 主题党日 | norm | `leader` |
| 6 | `taskforce` | 专班 | method | `org-commissioner` |
| 7 | `joint-event` | 共建活动 | method | `leader` |
| 8 | `develop-party-member` | 发展党员 | norm | `branch-committee` |
| 9 | `democratic-review` | 民主评议党员 | norm | `secretary` |
| 10 | `election` | 换届选举 | norm | `party-committee` |
| 11 | `attendance-inspection` | 考勤考察 | norm | `disc-commissioner` |
| 12 | `feedback-handling` | 意见反馈处理 | norm | `branch-committee` |
| 13 | `rule-making` | 制度制定与迭代 | norm | `branch-committee` |
| 14 | `info-platform` | 信息平台支持 | method | `branch-committee` |

**依据**：`docs/src/core/domain/work-map.js`（`WORK_MAP_MODULES` / `WORK_MAP_IDS` / `WORK_MAP_DEFAULT` / `tierOfModule` / `canDisableModule`）。**说明**：`defaultOwner` 只是「缺省建议」（`config.workforce=null` 时兜底），分工由支部自行建设（支书台「支部分工」），调整走支委会议题。**「缺省主责主体」可取三类**：角色键（如上表各值）· 组织型主体 id（**三个**：`branch-committee`＝支委会 · `party-committee`＝党委 · `expanded-committee`＝支委扩大会——**不是自然人、不能当登录身份**，见 `work-map.js::ORG_SUBJECTS`；⚠ `party-committee` 是主体 id，别与 `party-staff`（党委组织员，**角色键**、可登录党委工作台）混；⚠ `expanded-committee` 与 SOP 场景任务 `executor` 里那个**同名字符串**（渲染层标签，见 §4.15）**同名但不是一回事**）· 到人（`ownerType:'person'`＋`personId`）。**「三会一课」按形式分 4 个模块**（`branch-party-meeting` / `branch-committee-meeting` / `party-group-meeting` / `party-lecture`），旧键 `three-meetings` **已不再有效**。

---

## §4 字段说明（**指针 ＋ 后端增量**）

### 4.0 怎么读这一节（来源口径 · **请先读**）

> **2026-10-03 批次 361（`D-752`）改准**：本节**不再逐表复刻母本字段表**——各实体的**字段级清单（字段名 / 类型 / 必填 / 说明）一律以母本 `content/04_web_design/data/DATA_MODEL.md`（§2.1–§2.29，**34 张字段表**）为唯一权威源**。本文只留后端对接**必需**的四类内容：**① 落库形态与通用约定**（见下）· **② 服务端专有表**字段（§4.34–§4.38）· **③ 来源 C 增量**（母本字段表**未列**、而代码确实读写的字段：§4.39–§4.44 · §4.43 · §4.16 的 `domain` · §4.1 的 `signupClosed` 与品牌留痕 8 字段 · §4.5 / §4.6 / §4.17 的 `secretaryConfirmedAt`）· **④ 各实体的行为口径 / 写门 / 枚举例外 / 依据**（保留在对应小节）。**代价如实**：本节不再「一站式」——查字段名请开母本。

| 来源 | 内容 | 本文是否列字段 |
|---|---|---|
| **来源 A**：`content/04_web_design/data/DATA_MODEL.md` §2.1–§2.29 | 系统**静态数据模型唯一权威源**的字段表（**34 张字段表 / 332 行**） | **否** —— 指向母本 |
| **来源 B**：`server/db.js` / `server/routes/*.js` | **服务端专有表**（母本未列的 5 张）：`sessions` · `attachments` · `member_change_requests` · `committee_broadcasts` · `agenda_votes` —— **39 条** | **是**（§4.34–§4.38） |
| **来源 C**：`docs/src/**` 的实际读写点（`core/domain/domain.js` 之外的 seed / services / entries）＋ `server/routes/resources/index.js` 的资源名映射 | **代码确实在读写、但来源 A 字段表未列的字段**：**5 张通用资源表**（§4.39–§4.42、§4.44：`signups` 10 · `prop_tasks` 6 · `external_dispatches` 9 · `branch_docs` **24**〔含制度链 3 个字段〕 · `archive_records` 13）**62** 条 ＋ 子记录聚合域 2 条（§4.43）＋ 支书复核标记 `secretaryConfirmedAt` 3 条（§4.5 / §4.6 / §4.17）＝ **67** 条；**另 9 条**——意见反馈「事项领域」`domain`（§4.16）· 活动主源 `signupClosed` 与「品牌认定」留痕 8 个字段（§4.1） | **是**（逐条给代码出处，**后端建模时不得漏**） |

- **数据落库形态（关键）**：服务端所有业务表都是 **`id TEXT PRIMARY KEY` + `data TEXT`（整条 JSON 字符串）** 的键值表——**字段本身不在 SQL 列里**，而是在 JSON 内部。后端若要换成关系型表，须按**母本字段表**（来源 A）＋ **本文来源 B / C** 逐条建列 / 建 JSON 列。**依据**：`server/db.js:44-58`（`SCHEMA`：`sessions`、`attachments` 为关系表）、`server/db.js:64-66`（业务表统一 `(id TEXT PRIMARY KEY, data TEXT NOT NULL)`）。
- **通用约定**：`id` 形如 `前缀-随机`（服务端缺 id 时自动补，前缀表见 §6.2）；时间字段统一 ISO 字符串；`YYYY-MM-DD` 为日期；枚举值未注明时即「有且仅有」所列取值。

> **服务端表全表清单（共 34 张资源表 + 2 张关系表）**：34 张资源表的表名见 `server/db.js:9-41`；另外 `sessions` / `attachments` 两张为关系表（`server/db.js:44-56`）。其中 **29 张**在 `server/routes/resources/index.js` 里映射为「资源名」（可走通用 CRUD，见 §6.2）；**另 5 张不在通用映射内**（只有语义端点或只有内部写入）：`issues`、`issue_reveals`、`member_change_requests`、`committee_broadcasts`、`agenda_votes`。

### 4.1 活动（ActivityRecord）

**对应服务端表**：`activities`　**依据**：`content/04_web_design/data/DATA_MODEL.md:30-63`、`docs/src/core/domain/domain.js:11-35`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

> **`deepWorkMode` 补充说明**：该字段有母本依据（《常见工作场景快速指南》:120）；**已列入 `DATA_MODEL.md` §2.1 字段表**（同属来源 A）。**依据**：`docs/src/services/activity/activity.js`（`DEEP_WORK_MODE` / `DEEP_WORK_MODE_LABEL` / `deepWorkModeOf` 单一源）、`docs/src/services/activity/decision-tree.js`（`DecisionTreeState.deepItems` 项清单）、`docs/src/entries/tabs/leader/write-tab.js` 的勾选排、`docs/src/entries/tabs/visitor/projects-tab.js` 的「我的任务」完成方式位。

> **来源 C · 原字段表尾行补充**：本节**原字段表**最后 7 行（`organizer`→`voteConfig`）与 `isOutdoor` 同属「代码确实写入 / 读取」的字段，**现均已列入 `DATA_MODEL.md` §2.1**（同属来源 A）；其代码出处保留如下，后端建模不得漏。**依据**：`docs/src/data/mock/activities.js:12-14,61-66`（`organizer` / `direction` / `hostGroup` / `assignments` 的实存形态）、`docs/src/services/activity/decision-tree.js:359`（`organizer` 写入）、`docs/src/services/core/auth.js:554,620,684`（`assignments` 写读）、`docs/src/entries/tabs/leader/write-tab.js:1092,1094`（`signupEnabled` / `requireMakeup` 写入）、`docs/src/entries/tabs/secretary/calendar-tab.js:1304-1320`（`voteConfig` 写入）、`docs/src/services/activity/vote-config.js:41,44`（`voteConfig` 取值）、`docs/src/services/activity/attendance.js:59-64`（`hostGroup` 判据）、`server/routes/resources/gates.js:98-104`、`server/routes/resources/index.js:69-105`（`voteConfig` 写侧校验）。

**活动存储状态取值**：`draft` 草稿 / `pending-approval` 待批（**仅活动批准门开启时出现**，默认关不写入） / `published` 已发布 / `ongoing` 进行中 / `completed` 已结束 / `cancelled` 已取消。
**活动生命周期展示态（派生，不落库）**：`draft` / `pending_approval`（待批） / `published` / `ongoing` / `pending_archive`（待归档，悬停显示缺项）/ `executed`（已执行）/ `archived` / `cancelled`。
**活动分类（制度口径）**：顶层两大类＝**三会一课**（固定 4 子类，颜色党建红）与**主题党日**（正交维度：共建性质 / 是否外出 / 活动载体）。**组织生活会是「会议内容」而非子类**——由三会之一召开，不单独成类、不进写入表单。

**依据**：`content/04_web_design/data/DATA_MODEL.md:69-93`、`:130-179`（`isOutdoor` 见 `:174`）、`docs/src/core/domain/constants.js:616-724`（`ACTIVITY_CLASSIFICATION` / `normalizeActivityType`）、`docs/src/services/activity/activity.js:71-83`（外出提醒清单与 `isOutdoor` 判据）。
**`agenda[]` 说明**：`id` 用于线上支委会表决关联表态、`sourceRef` 用于回指提取来源；支委会会议页全部复用既有实体与既有写口（活动 + `voteConfig` + `agenda` + `agendaVotes` + `votesLocked`），未新增任何表 / 活动字段。
**品牌认定与议程子字段说明**：① `isBrand` 认定路径＝「**支委 / 党小组组长提案 → 支委会（或支委扩大会）通过后确定**」，唯一入口＝支委会议程项「记录结果 · 通过」（**无「点一下即认定」**）；② `brandProposal` 与品牌认定 / 取消留痕 7 个字段属**来源 C**（`DATA_MODEL.md` 字段表未列）；③ `signupClosed` 同属来源 C；④ `agenda[]` 的 `kinds` / `branchDocId` / `brandActivityId` / `personIds` / `fromStage` / `toStage` / `personStages` 子字段＝议程提取与「拟上会」清单的落点。
**来源 C · `signupClosed` 与品牌认定 / 取消留痕 9 个字段（母本字段表未列 · 后端不得漏）**：

| 字段 | 类型 | 说明 |
|---|---|---|
| signupClosed | boolean（缺省不写＝未关） | 本场报名是否已**手动关闭**：置 `true` 后成员不能**新报**、**已报名者仍可自行取消**；可关者＝本场组织者 ＋ 支书 / 副支书。**不设「报名截止时点」字段** |
| brandName | string | 品牌族名称（认定后补录） |
| brandProposal | object \| null | **品牌认定提案留痕**：`{by, at, note, reviewResult?, reviewedBy?, reviewedAt?, reviewActivityId?, reviewAgendaItemId?, reviewNote?}`；提案权＝支委层 ＋ 党小组组长；通过后置 `null`（已议决），未通过则保留提案 ＋ 退回意见（可再议） |
| brandDesignatedBy | string \| null | 品牌**认定**留痕 · 认定人 personId（只由支委会议程项「记录结果 · 通过」写入） |
| brandDesignatedAt | string（ISO）\| null | 品牌认定时间 |
| brandDesignationActivityId | string \| null | 认定回指：承载该议程项的支委会活动 ID |
| brandDesignationAgendaItemId | string \| null | 认定回指：该议程项 ID |
| brandRevokedBy | string \| null | **取消认定**留痕 · 操作人 personId（取消限支委层；重新认定仍须支委会审议通过） |
| brandRevokedAt | string（ISO）\| null | 取消认定时间 |

**依据**：`docs/src/services/activity/activity.js:269-280`（`BRAND_PROPOSER_ROLES` / `canProposeBrand`）、`docs/src/services/activity/activity.js:415-453`（`applyBrandDesignationResult`：通过才置 `isBrand`）、`docs/src/services/activity/activity.js:493-503`（`commitBrandDesignationResult` 落库口）、`server/routes/resources/index.js:255`（`POST /activities/:id/brand` **只能取消、不能认定**）、`docs/src/entries/pages/activity-entry.js:154-177`（`signupClosed` 与品牌三动作）。

**活动批准门（支部可开关的制度参数，默认关）**：办活动要不要先过一道批准门，做成支部可调制度参数 `activityApproval.mode`（三态 `off` / `secretary` / `branch-committee`，默认 `off`）。**关闭（默认）时活动写入链与全部行为与改动前完全一致**（写入照常、状态链不多一态）；开启后**写入即落「待批」**（`status='pending-approval'` ＋ `approval` 轨迹字段 `{required,mode,state,at,by,note?}`），批准前不推进、批准后转 `published`、不批准转 `cancelled`。门在写入之后、推进之前（依母本《常见工作场景快速指南》共建活动八步流程 `:245`「必须经支书同意后方可推进；不批准则终止」）；默认档支书批准（可改支委会档）；**待批活动的可见性＝只支委层可见 ＋ 组织者本人可见**（详见下方）。界面落点：设置中心·支部制度参数区「活动批准门」卡（支书 / 副支书可改，写口 `docs/src/services/branch/branch.js` 的 `savePolicyOverrides`）；活动详情页对「待批」活动给「批准发布 / 不批准（终止）」两动作。**未新增表 / 未新增页面**，`approval` 字段落在活动主源。
**依据**：`docs/src/services/activity/decision-tree.js:350-375`（`writeActivityWithSOP` 写入门）；`docs/src/core/domain/policy-defaults.js`（`activityApproval` ＋ 白名单 `POLICY_OVERRIDABLE` 的 `['activityApproval','mode']`）；`docs/src/services/activity/activity.js`（`pendingApprovalPatchOnWrite` / `approveActivity` / `rejectActivity` / `canApproveActivity`）；`docs/src/components/record/inspector.js`（`ACTIVITY_LIFECYCLE.pending_approval` 徽章与两动作）；`docs/src/entries/pages/settings-entry.js`（`activityApprovalCardHtml`）。

**活动批准门「启用端」**：① **待批可见性＝只支委层可见 ＋ 组织者本人可见**——**三档**：支委层可见 · **组织者本人（非支委层也）可见** · 其余非支委层看不到。支委层＝既有语义角色集 `BRANCH_COMMISSION_ROLES`（**单一源，未另写名单**），组织者判据单一源 `docs/src/services/activity/activity.js::isActivityOrganizerIn`，可见性判据单一源 `docs/src/services/core/visibility.js` 的 `canSeePendingApprovalActivities` / `isActivityVisibleTo` / `filterActivitiesForViewer`；**收窄面**（同一判据逐处接入）＝`docs/src/data/data-loader.js`（`state.activities` → 首页仪表盘与各工作台 tab）、`docs/src/components/shell/workspace-shell.js`（种子兜底）、成员台「活动动态 / 今天 / 我的复盘 / 我的任务」、组长台考勤 / 考察 / 复盘三处、活动详情页 `docs/src/entries/pages/activity-entry.js`、`docs/src/components/governance/work-overview.js`、成员档案页 `docs/src/entries/pages/person-entry.js`、`docs/src/services/governance/today-summary.js`、`docs/src/services/governance/todo.js`；**活动创建时的站内广播对「待批」不发**（`docs/src/services/activity/decision-tree.js` 的 `writeActivityWithSOP`）；**关闭档位时上述过滤全部空转（零行为变化）**。② **服务端写权限门＝在既有 `PATCH /api/v1/activities/:id` 上判状态转移**（不另开专用审批端点）：判据单一源 `docs/src/services/activity/activity.js` 的 `canApproveActivity` / `PENDING_APPROVAL_STATUS`，实现 `server/routes/resources/index.js` 的 `_activityApprovalGateDeny`——既有行为「待批」时，离开待批态**必须**带批准语义（发布＝`approval.state='approved'`、终止＝`'rejected'`）**且**写者角色符合**该活动上固化的档位**（不采信补丁自述的 `mode`），否则 403；门是**叠加在既有活动角色门之后**的第二道（角色门答「谁能写活动」，本门答「谁能把待批改成已发布 / 已取消」）。③ **支委会档复用既有线上表决**：批准动作＝「**提请支委会表决**」——在本活动上挂一条 `kinds:['activity-approval']` 的议程项 ＋ 支委会档 `voteConfig`（`defaultVoteConfig('branch-committee')` ＋ `resolveVoterIds('committee')`），支委层按既有表态组件表态，支书在既有议程结果记录链上「记录通过 / 未通过」⇒ 通过＝`published`、未通过＝`cancelled`；**两档行为不同**（支书档仍是「点一下即批 / 不批准即终止」）。④ **两条绕行路径均已收口**：① `POST /api/v1/snapshot` 是前端全量 / 脏集合写穿通道（整表替换）——**只拦「不该发生的状态迁移」**（库内为「待批」而本次快照把它改成 `published`/`cancelled` 且未携带批准语义、或写者角色不符合该活动固化档位 ⇒ 403；判据**逐行复用 `_activityApprovalGateDeny`**，不另写第二套），**其余整表写入照旧放行**（这张口是前端全部状态同步的落库目标，堵过头会把正常同步打瘫）；② `POST /api/v1/activities` 直建通道——**档位开启时**按写入链同一补丁落「待批」（判据单一源 `pendingApprovalPatchOnWrite`；档位读该支部 `config.policyOverrides.activityApproval.mode`），**关闭档时原样写入（零行为变化）**。

**依据**：`docs/src/services/core/visibility.js:160-198`（`canSeePendingApprovalActivities` / `currentViewerPersonId` / `isActivityVisibleTo` / `filterActivitiesForViewer`；组织者判据转调 `docs/src/services/activity/activity.js:54-60` 的 `isActivityOrganizerIn`）；`docs/src/services/activity/activity.js:737-832`（`ACTIVITY_APPROVAL_AGENDA_KIND` / `activityApprovalVoteOf` / `openCommitteeVoteForActivity` / `applyActivityApprovalResult` / `commitActivityApprovalResult`）；`docs/src/services/activity/agenda-follow-up.js:212-224`（`commitActivityApprovalResult` 接线）；`docs/src/components/record/inspector.js:840-861`（待批块两档分流）与 `:1126-1139`（`inspector-committee-vote-btn` 提请表决动作）；`server/routes/resources/approval-gates.js:2-48`（`_activityApprovalGateDeny` 状态转移门）· `server/routes/resources/index.js:299-300`（快照口的批准门调用）· `server/routes/resources/approval-gates.js:50-108`（`_snapshotActivityApprovalGateDeny` 快照口 / `_activityCreateGatePatch` 直建口）。

### 4.2 活动子记录（SubRecord，概念模型）

> ⚠ **说明**：这是**概念模型**，不是独立字段表。实现层由「考勤记录 / 文件空间记录」等实体承载（见 §4.6 / §4.23）。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**`publicity` 子记录的初稿状态位**：撰写人侧「提交审核」、宣传委员侧在宣传台「档案归档」区**定稿 / 退回**。状态取值 `draft` 初稿 / `reviewing` 待审核 / `finalized` 已定稿（退回即回 `draft` 并带一句退回说明）；附加字段 `draftStatusAt` / `draftStatusBy` / `draftReturnNote?` / `finalizedAt?`。**不新开对象、不加 tab、不新增表**；定稿后仍走既有宣传材料归档链。单一源 `docs/src/services/activity/activity.js:100-153`（`PUBLICITY_DRAFT_STATUS` / `setPublicityDraftStatus`）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:95-128`、`docs/src/services/activity/activity.js:100-153`。

### 4.3 专班（TaskForceRecord）

**对应服务端表**：`taskforces`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

> 示例数据另含展示字段 `task` / `manager` / `initiator` / `capacity` / `deadline`，**未列为模型必填字段**。

**依据**：`content/04_web_design/data/DATA_MODEL.md:242-267`。

### 4.4 系列活动（SeriesRecord）

> ⚠ **未实现**：本实体在数据模型中有定义，但**代码中无持久化域、无读写入口**（详见 §7）。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:269-291`。

### 4.5 考勤记录（AttendanceRecord）

**对应服务端表**：`attendances`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**出勤状态枚举**：`present` 出席 / `absent` 缺席（触发补课机制）/ `leave` 请假 / `made_up` 已补。**请假分事假 / 病假两档在 `absenceReason` 上区分**（时效（事假提前 1 天 / 病假可事后补）**只提示、不校验、不拦提交**）。标因可选项单一源 `docs/src/core/domain/policy-defaults.js:82-87`（`attendance.reasons`，新增须支书裁决）。
**来源 C · `secretaryConfirmedAt`**（`string`（ISO），可选）：**支书复核标记**——支书台待办「一键确认」写入即销项；**无此字段＝未复核**（§4.6 / §4.17 同名同义）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:293-328`、`docs/src/core/domain/domain.js:92-108`、`docs/src/core/domain/policy-defaults.js:73-87`、`docs/src/services/governance/secretary-overview.js:573`（`secretaryConfirmedAt` 读）、`docs/src/entries/tabs/secretary/todo-tab.js:720`（写）。

### 4.6 考察记录（InspectionRecord）

**对应服务端表**：`inspections`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**来源 C · `secretaryConfirmedAt`**（`string`（ISO），可选）：见 §4.5（对「已纪检确认」的考察写此销项）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:330-347`、`docs/src/core/domain/domain.js:166-178`、`docs/src/services/governance/secretary-overview.js:580`（读）、`docs/src/entries/tabs/secretary/todo-tab.js:727`（写）。

### 4.7 分工记录（AssignmentRecord）

**对应服务端表**：`assignments`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:349-364`。

### 4.8 产出物（OutputRecord）

> **性质**：系统按「产出类型」**自动定向投递**的记录，投递去向由类型派生、**非人工录入**；组织者只见「提交」不见「发送对象」。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**产出类型枚举（7 种）与定向路由**：

**依据**：`content/04_web_design/data/DATA_MODEL.md:366-392`、`docs/src/core/domain/domain.js:340-410`（`OutputType` / `OUTPUT_ROUTES` / `deriveOutputRoute`）。

### 4.9 补课任务（MakeupTask）

**对应服务端表**：`makeup_tasks`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:394-412`、`docs/src/services/activity/makeup.js`（`autoGenerateMakeupTask`）。

### 4.10 通知（Notice）

**对应服务端表**：`notices`（本节为基础字段；扩展字段见 §4.20 与 §4.28）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**通知受众 sentinel（发布侧写入值 ↔ 可见性判定必须同源）**：`all`＝全体党员（**broadcast，含未登录可见**）/ `leaders`＝党小组组长 / `activists`＝入党积极分子 / `candidates`＝发展对象。
**依据**：`content/04_web_design/data/DATA_MODEL.md:414-427`、`docs/src/core/domain/constants.js:792-800`、`server/routes/system-notices.js:53-58`。

### 4.11 经验沉淀（ExperienceDeposit）

**对应服务端表**：`experience_deposits`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:429-441`。

### 4.12 制度文件引用（ComplianceReference）—— **已删除**

> **该表已删除**。原表 `compliance_references` 经查为**死表**：全仓**无 UI 消费方、无写口、无字段契约** ⇒ 删表走 `server/db.js` 的 **`v2` `DROP TABLE` 迁移**（`drop-compliance-references`），并同批从 `RESOURCE_TABLES`（资源名 ↔ 表名映射 30 → **29**）、`ID_PREFIX`（前缀 `cr` 撤）、前端数据层（`mockDB` 域 / 快照键 / `MockAdapter` / `ApiAdapter` / `reset` 清单）中一并移除。**本节编号保留**（不重排后续 §4.13+，避免行号引用位移）。

### 4.13 任务（Task）

**对应服务端表**：`tasks`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:458-468`、`docs/src/core/domain/domain.js:68-74`。

### 4.14 应用状态（appState，**仅前端内存状态，不落库**）

> 这是**前端运行时状态对象**，不进入任何后端表；后端不需要为该实体建模，仅需了解前端会缓存哪些上下文。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**STATE 枚举**：`IDLE`=0 空闲 / `LOADING`=1 加载中 / `SUBMITTING`=2 提交中 / `SUCCESS`=3 成功 / `ERROR`=4 出错。
**依据**：`content/04_web_design/data/DATA_MODEL.md:470-499`、`docs/src/core/base/state.js:71-93`。

### 4.15 SOP 场景模板（Scenario / ScenarioTask，**代码内置常量，不落库**）

**对应位置**：`docs/src/workflow/sopData.js`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| scenarioId | string | 是 | 场景唯一 ID |
| title | string | 是 | 场景标题 |
| domain | `'activity'\|'organization'` | 是 | 所属领域 |
| description | string | 是 | 场景描述（含考勤类型说明） |
| tasks | ScenarioTask[] | 是 | 任务列表 |

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| taskId | string | 条件 | 任务 ID（部分任务可省略） |
| title | string | 是 | 任务标题 |
| executor | string | 是 | 执行角色键／渲染层标签（**`all` 已撤除**，见 §2.2.11；`expanded-committee` 是**渲染层标签**——中文标签「支委扩大会」在 `docs/src/workflow/renderer.js`，**不是角色键**、不参与权限判定。⚠ 它与 `work-map.js::ORG_SUBJECTS` 里**同名的组织型主体 id** `expanded-committee`（支委扩大会，见 §3.5）**同名但不是一回事**：这里是「本任务的执行者」标签，那里是「谁负责 / 承担方」的主体 id） |
| supervisor | string \| null | 是 | 督办角色键（可为 null） |
| timeOffset | number \| null \| `'flexible'` | 是 | 距 T-0 的天数偏移（**null＝无时间锚点、不实例化**；**`'flexible'`＝不设固定提前量、由组织者自定**，仍进任务链但不带日期锚点；见 §7 的实例化限制） |
| desc | string | 否 | 任务详细描述 |

**内置场景共 7 个**：`theme-party` 党小组主题党日活动 / `branch-party-meeting` 支部党员大会 / `party-group-meeting` 党小组会 / `party-lecture` 党课 / `branch-committee` 支委会 / `attendance-check` 查考勤记录 / `feedback-handling` 处理意见建议反馈。
**场景集说明**：`joint-event`（团支部合办）/ `new-system`（制度制定与迭代）/ `develop-activist`（考察积极分子）/ `info-platform`（信息平台支持）四个死场景已清掉、并进已有场景；`org-life`（组织生活会）场景亦已删除（16 条专属任务一并删去；「组织生活会」作为会议 / 活动内容的概念保留，由承接它的三会形式承载），故现为 **7 个**。三会（支部党员大会 / 党小组会 / 支委会）已按同一套**9 环节**取齐。
**依据**：`content/04_web_design/data/DATA_MODEL.md:522-558`、`docs/src/workflow/sopData.js:9-110`。

### 4.16 意见反馈（IssueRecord）

**对应服务端表**：`issues`（**语义端点域**：不走通用 CRUD、不进快照写穿）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**落库时由服务端追加的字段（文档未列，见代码）**：`branchId`（支部归属，服务端取登录人所属支部，缺省 `br-b1`）、`tokenHash`（防刷判重/限频，**与 personId 无关、不可反推人**）、`createdAt`（ISO 时间戳）。另有 `kind`（内部汇报型反馈自身为 `'report'`）——**该字段不在服务端 `POST /issues` 的落库对象里**，而来自种子文件 `docs/data/issues.json` 与前端写入，见 §4.16 说明与 §5.6 第 4 条。
**匿名口径（重要）**：`anonymous !== false` 即匿名（**缺省匿名**）；匿名＝**前端展示层匿名**，后台记真身；**「处置」与「查看真身」是两项分开的权限**。
**来源 C · `domain`（事项领域，母本字段表未列）**：`institution` 制度建设建议 / `activity` 活动组织建议 / `workflow` 工作流程建议 / `other` 其他建议——照母本《常见工作场景快速指南》「意见建议类型」表四类；随附**建议归口**（只给建议、**不自动派单**）。⚠ **服务端选填、表单侧必填**（不对称，如实登记）；单一源 `docs/src/services/governance/issues.js` 的 `ISSUE_DOMAINS`，落库白名单见下「依据」。
**依据**：`content/04_web_design/data/DATA_MODEL.md:610-656`、`server/routes/resources/index.js:607-641`（落库白名单与追加字段，含 `domain`）、`server/routes/resources/index.js:525-537`（脱敏 / 留痕序列化）。

### 4.17 复盘记录（ReviewRecord）

**对应服务端表**：`activity_reviews` / `taskforce_reviews`（两域）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**复盘状态枚举（中文值，落库即中文）**：`未提交` → `已上传` → `批注中` → `已确认` / `已打回`（打回后可重新提交回 `已上传`）。
**来源 C · `secretaryConfirmedAt`**（`string`（ISO），可选）：见 §4.5（支书台「一键确认」对「已确认 / 已打回」之外的待办销项）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:660-693`、`docs/src/core/domain/domain.js:125-144`、`docs/src/services/governance/secretary-overview.js:587`（读）、`docs/src/entries/tabs/secretary/todo-tab.js:732`（写）。

### 4.18 周报（WeeklyReport）

**对应服务端表**：`weekly_reports`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**报送内容可自动生成**：按所选周次的起止区间，从活动数据（活动主源 `date`）拼出「活动名（类型）· 日期」草稿，**生成后仍可手改**（单一源 `docs/src/entries/tabs/prop/weekly-tab.js::_autoWeeklyContent`）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:697-711`、`docs/src/services/governance/secretary-overview.js:409-443`（审核状态与写口）、`docs/src/entries/tabs/prop/weekly-tab.js:57-67,214-247`、`server/system-notice-kinds.js`（`weekly-report-submitted` 通知）。

### 4.19 待办（Todo）

**对应服务端表**：`todos`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**分类默认展开态**：赋权类 / 审核类默认展开；归档类 / 通知类 / 提交类 / 追踪类默认折叠。**派生规则**：通知 `actionable=true` 时，系统为 `actionRoles` 中每个角色自动生成一条待办。
**枚举（后端**不得漏**）——`role` 字段取值＝角色键（含 secretary / deputy-secretary / org-commissioner / prop-commissioner / disc-commissioner / leader / participant / party-staff / organizer / deep）**。
**两种来源**：①**运行时派生**是常态——通知（`NoticeTodoDeriver`）/ 活动·专班生命周期（`LifecycleTodoDeriver`）/ 成员台参与（`VisitorTodoDeriver`）在业务动作发生时派生，**不落种子**；②**独立台账型种子**——`server/seed.js` 从 `docs/src/services/governance/todo.js::SEED_TODOS` **同源**播种 **2 条**（宣传委员「提交七一活动新闻稿」· 支书「设置第三党小组组长」；`sourceType:'manual'`、`sourceId:null`，不引用活动/任务/人员实体 ⇒ 零孤立引用）。⚠ `todos` 表**曾未播种**（API 形态首启「待办」恒空、靠前端空表回退 `SEED_FALLBACK` 顶替）；现与 mock 形态逐值一致（守卫 `server/test/mock-api-parity.test.mjs`）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:755-814`、`:818-856`。

### 4.20 通知扩展字段（通知 → 待办派生机制）

> 在 §4.10 通知基础字段之上**追加**；`actionable=true` 时系统按 `actionRoles` 自动派生待办。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:822-832`。

### 4.21 归档记录扩展字段

> 活动 `archived=true` 时追加。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:860-871`。

### 4.22 归档材料子结构（Material）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:873-882`。

### 4.23 文件空间记录（FileSpaceRecord）

**对应服务端表**：`file_space_records`　**双模式**：mock 模式用 `fileData`（base64 本地）；server 模式用 `filePath`（磁盘路径，受保护静态下载 `/api/v1/uploads/:name`）。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**删除语义（防孤儿文件）**：server 模式删记录前会先删物理文件；mock 模式只删记录。
**依据**：`content/04_web_design/data/DATA_MODEL.md:885-906`、`:920-923`、`server/routes/resources/index.js:125-133`。

### 4.24 图片记录（ImageRecord）

**对应服务端表**：`image_records`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:910-915`。

### 4.25 支部实例（BranchRecord）

**对应服务端表**：`branches`（**支部不预设名字**，由党委动态创建 / 改名）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**config 配置档案（子结构）**：

**配置写权分层**见 §2.3.3；**配置写留痕上限** `CONFIG_HISTORY_MAX = 100`。
**依据**：`content/04_web_design/data/DATA_MODEL.md:929-953`、`server/routes/resources/index.js:12,306-444`、`docs/src/services/branch/config-clean.js`。

### 4.26 支书任期记录（AppointmentRecord）

**对应服务端表**：`appointment_records`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**任命即三写**：`branches.secretaryId` + 双方 `users.role` 同步 + 本记录封口/新建。
**依据**：`content/04_web_design/data/DATA_MODEL.md:958-967`。

### 4.27 支部上报审批记录（ReviewRequest）

**对应服务端表**：`review_requests`

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:972-985`、`server/routes/resources/gates.js:28,47-53`。

### 4.28 党委下发通知扩展字段

> 复用通知实体（**不新建「下发箱」领域**）；仅目标支部**支委层成员**可见。

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:990-1002`。

### 4.29 思想汇报（ThoughtReport）

**对应服务端表**：`thought_reports`（**在通用资源映射内**，随快照写穿同步；建表动因之一是让系统通知能据表复算提交人）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:1007-1020`、`server/system-notice-kinds.js:63-80`。

### 4.30 成员档案（PersonRecord）

**对应服务端表**：`users`（**支部成员主数据实体**：名册、应到、考勤、表决、通知受众、党小组归组的共同上游）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**服务端「移出」流程追加的字段（代码为准）**：`transferOut`（true＝已转出软标记，**登录与在途会话一律拒绝**）、`transferredOutAt`、`removedAt`、`removedBy`、`transferOutNote`；另有 `email`（**字段预留，示例数据中没有**，用于邮件通知收件人）。
**行为口径（4 条）**：① 写口白名单见 `server/routes/member.js` 的 `PROFILE_FIELDS` / `CREATE_FIELDS`；② **新增成员即自动建号**（账号＝学号，口令＝支部统一默认口令），成员流出一并停用；③ 变更分流——姓名/学号/党小组**立即生效**，发展阶段/在册状态须走「组织委员发起 → 支书确认」确认链，**流出登记登记即生效、不走确认链**（其中「**积极分子 → 发展对象**」另设**支委会讨论前置门**：须先上会讨论通过才可发起，判据见 §3.4）；④ `partyGroup` 为空即未分组：党小组会应到**不含**，支部大会应到**照计**，表决名单**照计**。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1023-1045`、`server/routes/member.js:198-201,259-323`、`server/routes/auth.js:32,75`、`server/services/mailer.js:93-106`。

### 4.31 党小组（PartyGroup）

**对应服务端表**：`party_groups`（由「成员档案字段的取值集合」升为**一等实体**）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**行为口径**：写权＝支书 + 副支书；**解散**允许解散非空组（组内成员 `partyGroup` 批量置空 + status 置 dissolved + 留痕）；**改名**同步批量改写组内成员档案；**组长不落本实体**（由成员档案 `role='leader'` + 党小组归属派生）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1050-1071`、`server/routes/resources/gates.js:33`。

### 4.32 成员流动台账（MemberFlow）

**对应服务端表**：`member_flows`（**流入 / 流出的复式记账**）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**对账恒等式**：期初在册 + 流入合计 − 流出合计 ＝ 当前在册（台账页表头固定展示该对账行）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1074-1098`、`server/routes/resources/gates.js:35`。

### 4.33 匿名反馈核查留痕（IssueReveal）

**对应服务端表**：`issue_reveals`（**仅服务端表**：无前端持久化域、不进快照写穿、**无通用 CRUD**）

> 字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）。

**表只增不改**：写入唯一入口＝`GET /api/v1/issues/reveal`（命中即写一条，与返回值同一次发生）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1102-1120`、`server/routes/resources/index.js:552-573`、`server/db.js:37-41`。

### 4.34 成员变更申请（member_change_requests，**服务端专有**）

**对应服务端表**：`member_change_requests`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（服务端生成前缀 `mcr`） |
| activityId | string | 来源议程所属活动 ID（必填） |
| agendaItemId | string | 来源议程项 ID（必填） |
| personId | string | 目标成员 personId（必填） |
| fromStage | string | 变更前发展阶段（必填） |
| toStage | string | 变更后发展阶段（必填） |
| meetingResult | string | 会议结果（默认 `passed`） |
| status | string | `pending-org-approval` → `pending-secretary` → `completed`（另有 `rejected`） |
| createdBy | string | 创建人（支委） |
| createdAt | string（ISO） | 创建时间 |
| approvedBy | string | 组织委员审批人（审批后追加） |
| approvedAt | string（ISO） | 审批时间（审批后追加） |
| confirmedBy | string | 支书/副支书确认人（确认后追加） |
| confirmedAt | string（ISO） | 确认时间（确认后追加） |

**防重规则**：按 `activityId + agendaItemId + personId` 查重，已存在待审批/已完成申请时返回 **409**。
**依据**：`server/routes/member.js:62-88`、`:91-119`、`:125-150`。

### 4.35 支委广播记录（committee_broadcasts，**服务端专有**）

**对应服务端表**：`committee_broadcasts`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（服务端生成前缀 `cb`） |
| requestId | string | 关联的成员变更申请 ID |
| recipientId | string | 接收支委 personId（名单＝`COMMITTEE_IDS`，示例为 `p10`-`p14`） |
| status | string | `pending`（待确认收到） |
| broadcastAt | string（ISO） | 广播时间 |

**依据**：`server/routes/member.js:106-117`、`docs/src/core/domain/constants.js:206`。

### 4.36 线上表态记录（agenda_votes，**服务端专有**）

**对应服务端表**：`agenda_votes`（**记名 / 无记名两段式**）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（服务端生成前缀 `av`；无记名的计数行 id 为 `avt-<活动>-<议程项>`，确定性生成） |
| activityId | string | 所属活动 ID |
| agendaItemId | string | 议程项 ID |
| personId | string | 表态人 personId（**无记名时仍落「谁已投」，但不落选项**） |
| position | string | 表态选项（记名时落库；取值按活动 `voteConfig.optionSet` 集合校验） |
| note | string | 附言（记名时落库；**无记名时不落库**） |
| createdAt | string（ISO） | 创建时间 |
| updatedAt | string \| null | 更新/覆盖时间（记名时覆盖写入；默认 null） |
| votedAt | string（ISO） | 无记名参与记录的投票时间 |
| ballotMode | 'anonymous' | 无记名标记（仅无记名记录/计数行有） |
| tally | object | 无记名**汇总计数** `{选项: 次数}`（逐人选项不落库；仅计数行有） |

**选项枚举（按 `optionSet`）**：`deliberative` 交流式＝`agree` 同意 / `object` 异议 / `comment` 附言（**异议须附言**）；`formal` 正式表决＝`approve` 赞成 / `oppose` 反对 / `abstain` 弃权。
**依据**：`server/routes/committee.js:40-43`、`:113-156`、`:161-177`。

### 4.37 会话（sessions，**服务端专有·关系表**）

**对应服务端表**：`sessions`（**真正的关系型表，非键值 JSON 表**）

| 字段 | 类型 | 说明 |
|---|---|---|
| token | TEXT PRIMARY KEY | 登录令牌（服务端 `randomUUID()` 生成） |
| person_id | TEXT NOT NULL | 登录人 personId |
| created_at | TEXT NOT NULL | 签发时间（ISO） |

**依据**：`server/db.js:45-49`、`server/routes/auth.js:33-36`。

### 4.38 附件（attachments，**服务端专有·关系表**）

**对应服务端表**：`attachments`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PRIMARY KEY | 附件 ID（`randomUUID()`） |
| filename | TEXT NOT NULL | 原始文件名 |
| path | TEXT NOT NULL | 下载路径（形如 `/api/v1/uploads/<uuid>.<ext>`） |
| size | INTEGER NOT NULL | 字节数（**单文件上限 10MB**） |
| uploaded_by | TEXT NOT NULL | 上传人 personId |
| uploaded_at | TEXT NOT NULL | 上传时间（ISO） |

**允许的文件类型**：jpg / jpeg / png / pdf / doc / docx / xlsx / mp4（其余类型拒收）。
**依据**：`server/db.js:50-57`、`server/routes/uploads.js:48-51`。

### 4.39 报名记录（Signup，**来源 C**）

**对应服务端表**：`signups`（资源名 `signups`，新建 id 前缀 `su`）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `su` |
| sourceType | `'activity'\|'taskforce'` | 是 | 报名对象类型（活动 / 专班，统一报名渠道） |
| sourceId | string | 是 | 报名对象 ID |
| personId | string | 是 | 报名人 personId |
| role | `'participant'\|'organizer'\|'deep'` | 是 | 想报的**项目角色** |
| status | `'approved'\|'pending'\|'rejected'\|'cancelled'` | 是 | 审批状态（`participant` 报名即 `approved`；`organizer`/`deep` 走审核） |
| createdAt | string（ISO） | 是 | 报名时间 |
| reviewedBy | string \| null | 否 | 审核人 personId（默认 null） |
| reviewedAt | string \| null | 否 | 审核时间（默认 null） |
| note | string \| null | 否 | 报名附言 |

**分级审批**：普通参与（`participant`）报名即入；项目角色（`organizer`/`deep`）报名 → `pending`，审核人＝活动 `organizer` ?? `createdBy`（专班侧取专班管理人），审核通过才拿到项目角色。
**种子**：服务端**有**种子（`server/seed.js:62` 从 `docs/src/data/mock/seed.js::SEED_SIGNUPS` 播种 7 条）。
**依据**：`docs/src/services/activity/signup.js:4-8,73-86`、`docs/src/data/mock/seed.js:46-59`、`server/seed.js:62`、`server/routes/resources/store.js:22,53`。

### 4.40 宣传任务（PropTask，**来源 C**）

**对应服务端表**：`prop_tasks`（资源名 `propTasks`，新建 id 前缀 `ppt`）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `ppt`（种子里为 `pt1`…`pt8`） |
| source | string | 是 | 任务来源（如「支部委员会」「副支书」「组织委员」，自由文本） |
| type | string | 是 | 任务类型（新闻稿 / 推送排版 / 素材归档 / 周报报送） |
| summary | string | 是 | 任务摘要 |
| status | `'pending'\|'in_progress'\|'submitted'` | 是 | 状态流转：待接收 → 进行中 → 已提交（只前进、不后退） |
| createdAt | string（YYYY-MM-DD） | 是 | 创建日期 |

**服务端有种子**（`server/seed.js` 播种 **8 条**；该常量与前端**同源**——**内容单一源 = `docs/src/data/mock/prop.js::PROP_TASKS_SEED`**，两形态读数一致）。
**依据**：`docs/src/data/mock/prop.js:28-41`（`PROP_TASKS_SEED` 单一源）、`docs/src/entries/tabs/prop/tasks-tab.js:15,32-44,86-88`、`docs/src/core/domain/domain.js:277`、`server/routes/resources/store.js:24,53`。

### 4.41 文件外发确认（ExternalDispatch，**来源 C**）

**对应服务端表**：`external_dispatches`（资源名 `externalDispatches`，新建 id 前缀 `ed`）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `ed` |
| refType | string | 是 | 来源类型（`publicity` 宣传材料 / `inspection` 考察表单 / `activity` 活动材料…；缺省 `file`） |
| refLabel | string | 是 | 外发内容描述（如「上传宣传材料：七一主题党日新闻稿」） |
| senderId | string | 是 | 发送方 personId |
| senderName | string | 是 | 发送方姓名 / 角色 |
| receiverRole | string | 是 | 接收方角色键（secretary / disc-commissioner / org-commissioner / leader / prop-commissioner / participant） |
| note | string | 否 | 备注（默认空串） |
| sentAt | string（ISO） | 是 | 标记「已通过微信外发」的时间 |
| confirmedAt | string（ISO）\| null | 否 | 接收方「确认收到」时间（默认 null＝待确认） |

**语义**：走微信外发的材料由发送方在系统里留痕、接收方系统内确认，形成可审计闭环（系统不对接微信）。**是「标记 + 确认」，不是文件传输**。
**依据**：`docs/src/services/activity/external-dispatch.js:31-42,61-69,72-74`、`docs/src/core/domain/domain.js:284`、`server/routes/resources/store.js:27,54`。

### 4.42 支部文件（BranchDoc，**来源 C**）

**对应服务端表**：`branch_docs`（资源名 `branchDocs`，新建 id 前缀 `bd`；**通用写口＝支委层**，见 §2.3.3）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `bd` |
| purpose | `'doc'\|'institution'` | 否 | 用途：普通文件 / 制度文本（**旧数据无此字段一律按 `doc` 兼容**） |
| title | string | 是 | 标题 |
| desc | string | 否 | 描述（默认空串） |
| cat | string | 否 | 分类（普通文件 `party-doc` / 制度文本 `institution`） |
| status | `'draft'\|'pending-party-meeting'\|'current'\|'disabled'\|'archived'` | 否 | 状态：**制度文本** = `draft` 草案（待支委会审议，尚不是现行版）/ `pending-party-meeting` 支委会已审议通过、**待支部党员大会表决**（仍不是现行版）/ `current` 现行版 / `disabled` 停用；**普通文件**缺省 `draft`（会前草案）；历史版本 `superseded` **只出现在 `versions` 内、不驻留顶层**（制度链口径见 §3.4） |
| fileName | string \| null | 否 | 附件文件名（制度文本可无附件） |
| fileSize | number | 否 | 附件字节数 |
| format | string | 否 | 附件格式标记 |
| filePath | string \| null | 否 | server 模式磁盘路径（下载走受保护口 `/api/v1/uploads/:name`） |
| fileData | string \| null | 否 | mock 模式 base64 dataURL |
| uploadedBy | string \| null | 否 | 上传人 personId |
| uploadedAt | string（ISO） | 否 | 上传时间 |
| branchId | string | 否 | 归属支部（**读侧按它做支部隔离**；无归属 / 党委语境不过滤；老数据无此字段视为 `br-b1`） |
| updatedAt | string（ISO） | 否 | 最后更新时间（列表倒序依据） |
| bodyText | string | 否 | 网页正文（制度文本用；渲染上限 20000 字） |
| version | number | 否 | 现行版本号（制度文本；缺省 1） |
| versions | array | 否 | 历史版本链：`Array<{version, title, bodyText, status:'superseded', note, by, at}>` |
| versionNote | string | 否 | 当前版本发布说明 |
| versionBy | string | 否 | 当前版本操作人 personId |
| versionAt | string（ISO） | 否 | 当前版本发布时间 |
| reviewResult | `'passed'\|'rejected'` | 否 | **审议结果留痕**：支委会审议 / 党员大会表决的议程结果回写；`rejected` 即「退回起草人修改」（仍为 `draft` ＋ 退回意见） |
| reviewNote | string | 否 | 审议意见（`rejected` 时＝退回意见，缺省文案 `支委会审议未通过，退回起草人修改`） |
| reportToPartyMeeting | boolean | 否 | 支委会审议「通过」时勾选的「**是否报送党员大会**」：`true` ⇒ 转 `status:'pending-party-meeting'`；`false` ⇒ 支委会通过即成为现行版 |

**写权分层**：新建 / 上传新版 / 停用启用**制度文本**＝支书 + 副支书（`INSTITUTION_MANAGER_ROLES`）；普通文件与其余资源写走**支委层**（`COMMISSIONER_WRITE`＝`{'branchDocs','fileSpaceRecords','imageRecords'}`，见 §2.3.3 与 §5.5）。**删除记录会联动删物理文件**（§5.5 第 14 条同源口径）。
**依据**：`docs/src/services/branch/branch-doc.js:15-21,101-136,150-196,204-227,241-258,296-297,394-432,458-515`、`server/routes/resources/store.js:31,57`、`server/routes/resources/index.js:54,127-133`。

### 4.43 子记录聚合域（actSubRecords / tfSubRecords，**来源 C**）

**对应服务端表**：`act_sub_records` / `tf_sub_records`（资源名 `actSubRecords` / `tfSubRecords`，新建 id 前缀 `asr` / `tfs`）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | **恒为 `'__root__'`**（聚合域约定的单行外壳，**不是主记录 id**） |
| body | object | 是 | 整域数据：`{ [主记录id]: { attendance?:[], materials?:[], publicity?:[] } }`（子记录树三种类型见 §4.2） |

**存储形态（后端须照做）**：这两张表**整域只存一行**——`{id:'__root__', body:<原对象>}`；前端 `init()` 拉取时按 `id==='__root__'` 解包回 `mockDB.actSubRecords` / `tfSubRecords` 对象，全量快照写穿时再包回单行。⚠ **不能按「一主记录一行」拆表而不改前端**——前端契约就是 `__root__` 单行。
**依据**：`server/routes/resources/store.js:28-29,55`、`docs/src/data/data-adapter.js:52-53,440-450,512-513,542-543`。

### 4.44 归档记录（archive_records，**来源 C**）

**对应服务端表**：`archive_records`（资源名 `archiveRecords`，新建 id 前缀 `ar`）

> ⚠ **与 §4.21 不是一回事**：§4.21 是「**活动实体上**的归档扩展字段」（`archived=true` 时追加）；本节是**独立的一张表**——宣传台「档案归档」逐条材料记录（一条材料一行），与产出物区 / 活动关闭校验同源。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符；**种子为 `ar1`…`ar6`，运行时新建为 `ar-u-<随机>`** |
| activityId | string | 否 | 关联活动 ID（不挂活动的独立归档可缺） |
| activityName | string | 否 | 活动名快照 |
| archiveDate | string（YYYY-MM-DD） | 是 | 归档日期 |
| category | `'新闻稿'\|'照片'\|'视频'\|'其他'` | 是 | 材料类别（与 §4.23 `category` 同集） |
| status | `'archived'\|'in_progress'\|'pending'` | 是 | 归档状态 |
| fileName | string | 否 | 材料文件名 |
| fileSize | number | 否 | 字节数 |
| filePath | string | 否 | server 模式磁盘路径（下载走 `/api/v1/uploads/:name`） |
| fileData | string | 否 | mock 模式 base64 dataURL |
| secretaryConfirmedAt | string（ISO） | 否 | **支书复核标记**：支书台「一键确认」对「已归档」的档案写此销项 |
| platformReportedAt | string（ISO） | 否 | **党建平台上报留痕**（来源 C）：宣传台「档案归档」行内「标记已上报党建平台」写入即留痕（**只留痕、不对接**——对接方为外部系统）；归档记录一行一类材料、同一活动可多行 ⇒ 留痕**按活动聚合**（写入时同活动全部记录同步）；无此字段＝未上报 |
| platformReportedBy | string | 否 | 上报留痕·操作人 personId（与 `platformReportedAt` 同步写入） |

**服务端种子**：**有**（`server/seed.js:61` 从 `docs/src/data/mock/seed.js::SEED_ARCHIVE_RECORDS` 播种 6 条）。
**依据**：`docs/src/data/mock/seed.js:37-44`、`docs/src/entries/tabs/prop/archive-tab.js:1083-1145`（运行时新建：`_handleArchiveUpload`）、`docs/src/entries/tabs/prop/archive-tab.js:631-650`（党建平台留痕位：`_markPlatformReported` 写、`_renderPlatformCell` 读）、`docs/src/services/governance/secretary-overview.js:594`（`secretaryConfirmedAt` 读）、`docs/src/entries/tabs/secretary/todo-tab.js:737`（写）、`server/seed.js:61`、`server/routes/resources/store.js:30,56`。

---

## §5 部署环节

### 5.1 运行依赖

| 项 | 要求 | 依据 |
|---|---|---|
| Node.js | **`Node ≥ 22`**（根说明与部署文档现已一致）；依赖 `better-sqlite3@12` 的 `engines` 为 `20.x \|\| 22.x`，**Node 18 不可用**；**`server/package.json` 未声明 `engines`**（建议按 ≥ 22 准备） | `README.md:15`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:46`、`server/package.json` |
| 运行依赖（4 个） | `express ^4.19.0`、`better-sqlite3 ^12.0.0`、`multer ^1.4.5-lts.1`、`nodemailer ^9.0.6` | `server/package.json:14-19` |
| 开发依赖（仅测试用） | `playwright 1.60.0`（**锁定版本**）；全新环境需先 `npx playwright install chromium` 下载浏览器 | `server/package.json:20-22`、`server/README.md:69` |
| 前端依赖 | **无**——原生 ESM，**无打包器、无构建步骤**，浏览器直接加载 `docs/src/*.js` | `README.md:15`、`README.md:234` |
| 编译工具 | `better-sqlite3` 为原生模块，安装时可能需要本机编译工具链（或在有预编译包的平台安装） | 未取证（本仓未记录） |
| 数据库 | **无需外部数据库服务**——SQLite 单文件（内置） | `server/README.md:25` |

### 5.2 启动与构建方式

```bash
cd server
npm install                 # 安装依赖
npm start                   # 启动服务，默认端口 3000（PORT 可覆盖）
```

- **无构建步骤**：不需要 `npm run build`，前后端都是源码直接运行。
- 启动入口 `server/server.js`：初始化数据库 → **空库自动导入示例种子**（`DISABLE_SEED=1` 时跳过；**生产形态 `APP_ENV=production` 下默认不播种**，见 §5.2）→ 起服务 → 启动定时任务（每日 03:00 批量上报 + 每 10 分钟会议提醒扫描）→ 打印 `users` 计数与「演示种子账号」计数自检（核对「库内是否只有真人」）。
- 启动后访问 `http://127.0.0.1:3000/login.html`。
- **测试**：`npm test`（全量）/ `npm run test:core` / `npm run test:fast` / `npm run clean:tmp`。测试脚本自带 `DISABLE_PASSWORD_CHECK=1` 与 `DEMO_READONLY=0` 注入（后者放行本机可写；手跑 `node --test` 时须自行设置，否则按只读演示运行、写路径用例会红）。
- **前端 API 形态启用路径**：登录表单 → 本地 Mock 校验（学号 → personId）→ `POST /api/v1/auth/login`（**传 personId + password**）→ 拿到 token → 写入 `sessionStorage['gsm1921-api-token']` → 切换为 API 数据源。**不许静默降级**：**有 token 时**若 `init()` 拉不到服务端数据，页面**显式报错**（「无法连接服务器」+ 重试按钮），**不再**回退可写的本地 mock（旧行为＝用户以为在真系统里操作、实际只写浏览器，下次登录被服务端覆盖 ⇒ **静默丢单**）；**无 token 的本地演示形态保持原样**。运行时形态可用 `docs/src/data/data-adapter.js::getRuntimeMode()` 查（返回 `{source, hasToken, branchId, stage}`）。
- **远端变更探测（P1-1）——多标签 / 多设备「不整页重载也能看见别人刚写的」**：前端 `init()` 只在**页面加载那一刻**拉一次数据、之后读内存缓存 ⇒ 补一条**低频探测**（`docs/src/data/data-adapter.js:1136`（`probeRemoteChanges`））：① 页面由隐藏转可见时探测一次（`docs/src/entries/pages/main-entry.js:211-217`（`visibilitychange`），**复用既有监听器**、不另挂第二个）；② 可见态下的低频定时器（缺省 **60 秒**，`docs/src/data/data-adapter.js:999`（`REMOTE_PROBE_INTERVAL_MS`）；隐藏态不探测）。动作＝取既有 `GET /api/v1/snapshot/versions`（**未新增任何接口**）与本机基线 `_versions` **逐集合比对**，**只对版本不一致的集合**重拉（与 409 冲突恢复共用同一份 `_refreshCollections`）。同源多标签另加 `BroadcastChannel`（频道 `gsm1921-data-changed`）：写成功后广播一次，**零网络**，收信侧只把它当「去探测一次」的唤醒信号（数据一律从服务端取）。**避让**（防把本机未提交的改动当「远端更新」回滚）：本机有在途写 / `init()` 未完成 ⇒ 整次跳过；该集合本机仍脏 ⇒ 逐个排除在重拉清单之外。**失败静默**：探测只读，失败只 `console.warn`，**不弹错误、不影响使用**（写链 fail-fast 行为一字未改）。**开关**：`localStorage['gsm1921-remote-probe'] = 'off'`（键名见 `docs/src/data/data-adapter.js:1002`（`REMOTE_PROBE_PREF_KEY`））关闭，也可在页面内调 `docs/src/data/data-adapter.js:1039`（`setRemoteProbeEnabled`）；**默认开**。**mock / 静态托管形态零网络、自动不启用**（`DATA_SOURCE !== 'api'` 直接返回）。定时器可手动 `startRemoteChangeProbe()` / `stopRemoteChangeProbe()`（`:1193` / `:1204`）。
- 静态托管形态（无后端）：把 `docs/` 当 Web 根目录即可，`docs/src/config/deploy.js` 保持 `DEPLOY_MODE = 'static'`；**Node 形态下由服务端动态注入**该文件为 `DEPLOY_MODE = "server"`（见 §6.12）。
- ⚠ **反向代理的约束**：`/src/config/deploy.js` 是 **Node 动态注入**路由（不是磁盘上的静态文件），`/api/v1/**` 也由 Node 提供。若用 nginx 直接托管 `docs/` 静态资源，必须为 **`/src/config/deploy.js` 单独放行到 Node**（`location = /src/config/deploy.js { proxy_pass ...; }`），否则该文件会以磁盘版（`DEPLOY_MODE='static'`）返回 ⇒ **「关于」门面与部署形态判定会错**；或者把该文件静态写死为 `'server'` 并接受「不再由 Node 注入」。同源代理示例见 §5.1 / `DEPLOYMENT_GUIDE.md` 附录 A.2。
- ⚠ **上传目录与请求体上限**：反向代理须允许 `client_max_body_size ≥ 10m`（`server/routes/uploads.js:52` 的上传上限；另有 `/snapshot` 4MB 与 JSON 体 2MB），并保证 `UPLOAD_DIR`（缺省 `server/uploads/`）**对 Node 进程可写**，否则上传 500/413。

**依据**：`server/server.js:1-23`、`server/README.md:5-19`、`:31-33`、`server/app.js:55-57`、`server/package.json:6-13`。

### 5.3 环境变量清单（共 21 项，**全部有缺省值**）

> ⚠ **重要**：**服务端自身不读取 `.env` 文件**（没有 dotenv 依赖）——`.env.example` 只是模板，需在启动脚本/容器/进程环境中注入。
> ⚠ **运行形态**：`APP_ENV`（或社区通行的 `NODE_ENV`）置 `production` ⇒ **生产形态**：未设 `LOGIN_PASSWORD` **启动即拒**；`DISABLE_PASSWORD_CHECK` **一律不认**；**默认不播种**（不必依赖 `DISABLE_SEED=1`）。**都不设 ⇒ 非生产形态（本地/测试），行为与改动前一字不变**（判定单一源＝`server/env.js::isProductionEnv`）。

| # | 变量 | 含义 | 是否必填 | 缺省 | 依据 |
|---|---|---|---|---|---|
| 1 | `PORT` | 服务监听端口 | 否 | `3000` | `server/server.js:8` |
| 2 | `DB_PATH` | SQLite 数据库文件路径（`:memory:` 为内存库，测试用） | 否 | `server/data.db` | `server/server.js:9`、`server/.env.example:9` |
| 3 | `DISABLE_SEED` | 置 `1` 时**空库也不导入演示种子**（真实部署务必开；生产形态已默认不播种） | 否 | 未设置（＝播种；生产形态＝不播种） | `server/server.js:12-18` |
| 4 | `LOGIN_PASSWORD` | **统一登录口令**（所有账号共用），`/auth/login` 校验用 | 否（**生产形态必填**：未设则启动即拒） | `123456`（**非生产形态**；生产形态无缺省，无口令比对兜底） | `server/routes/auth.js:17` |
| 5 | `DISABLE_PASSWORD_CHECK` | 置 `1` 时**跳过口令校验**，仅凭 personId 即可登录（**生产形态不认此开关**） | 否 | 未设置（＝校验） | `server/routes/auth.js:12-14` |
| 6 | `MAIL_ENABLED` | 是否启用邮件通道（须为字符串 `'true'`） | 否 | 未设置（＝停用） | `server/services/mailer.js:16` |
| 7 | `SMTP_HOST` | SMTP 服务器地址（未配置则邮件整体跳过） | 否 | 空 | `server/services/mailer.js:17`、`:29` |
| 8 | `SMTP_PORT` | SMTP 端口 | 否 | `465` | `server/services/mailer.js:18` |
| 9 | `SMTP_USER` | SMTP 账号 | 否 | 空（为空则邮件跳过） | `server/services/mailer.js:19`、`:29` |
| 10 | `SMTP_PASS` | SMTP 口令 | 否 | 空 | `server/services/mailer.js:20` |
| 11 | `SMTP_FROM` | 发件人显示（为空时回退 SMTP_USER） | 否 | 空 | `server/services/mailer.js:21`、`:64` |
| 12 | `SMTP_TLS` | 是否 SSL/TLS（**除字符串 `'false'` 外一律 true**） | 否 | `true` | `server/services/mailer.js:22` |
| 13 | `REPORT_WEBHOOK_URL` | 上报平台的 Webhook 地址（**未配置＝仅拉取模式**，`/report/trigger` 返回 409） | 否 | 空 | `server/services/reporting.js:147-148` |
| 14 | `REPORT_TOKEN` | 上报请求的 Bearer Token（配置则加 `Authorization` 头） | 否 | 空 | `server/services/reporting.js:160-161` |
| 15 | `REPORT_ADMIN_MAIL` | 上报**连续失败**时的管理员告警收件人 | 否 | 空（不告警） | `server/services/reporting.js:187-194` |
| 16 | `REPORT_BASE_URL` | 邮件正文里追加的「系统入口」基址 | 否 | 空（不加链接） | `server/services/mailer-hooks.js:11`、`server/services/reporting.js:201` |
| 17 | `REPORT_INCLUDE_CONTACT` | 上报 `member` 域时**是否包含联系方式**（须为字符串 `'true'`；默认**不报**，脱敏） | 否 | 未设置（＝不报） | `server/services/reporting.js:61-68` |
| 18 | `UPLOAD_DIR` | 附件上传目录（相对路径按**进程启动目录**解析，与 `DB_PATH` 同口径）；**部署时须可写、须与数据库一并备份** | 否 | `server/uploads`（按模块位置解析，非 cwd） | `server/routes/uploads.js:15-17`、`server/.env.example:10-12` |
| 19 | `APP_ENV` | **运行形态**：置 `production` ⇒ 生产形态（口令强校验 / 不认逃逸门 / 默认不播种）；等价开关 `NODE_ENV=production` | 否（**生产部署必设**） | 未设置（＝非生产：本地/演示/测试） | `server/env.js`、`server/server.js:12-13` |
| 20 | `SEED_FALLBACK` | **前端空域种子回退开关**（Node 托管形态下由 `server/app.js` 注入进 `/src/config/deploy.js`）：置 `0` ⇒ 注入 `false`，不给「考勤 / 考察 / 待办」三域注入演示种子 | 否 | 未设置（＝`true`，演示形态） | `server/app.js:55-57`、`server/.env.example:15-18` |
| 21 | `DEMO_READONLY` | **前端演示形态只读开关**（Node 托管形态下由 `server/app.js` 注入进 `/src/config/deploy.js`；静态托管读该文件常量）：置 `0` ⇒ 注入 `false`＝放行本机可写（**仅本地 / 测试**）；缺省 / 其它值 ⇒ `true`＝**无 API 会话时只读**（写操作提示「请登录后使用服务器数据」、数据不落本机浏览器） | 否（**生产不得设置**） | 未设置（＝`true`，只读演示） | `server/app.js:55-57`（`DEMO_READONLY`）、`server/.env.example:59-66`（`DEMO_READONLY`） |

> 另有**部署文档提到但代码中未使用**的变量，**未取证**（不要照抄）：`AI_API_BASE_URL`（AI 推理服务，见 `DEPLOYMENT_GUIDE.md:237`——在代码中未检索到消费点）。另有 `SEED_FALLBACK`（**已进上表第 20 项**）：它是**前端构建期常量**（`docs/src/config/deploy.js`）——**静态托管 / 直接以 `docs/` 为根**时改该常量即生效；**Node 托管形态下 `/src/config/deploy.js` 由 `server/app.js` 动态注入**，注入值改由环境变量 `SEED_FALLBACK` 决定（置 `0` ⇒ `false`，缺省 `true`；见 `server/app.js:55-57`、`server/.env.example`）⇒ 该形态下发 `SEED_FALLBACK=0` 即可关断。消费点＝`docs/src/data/data-adapter.js::init()` 的考勤/考察/待办三域空表回退判据（命名空间读取，缺该导出按 `true`），默认 `true`＝演示形态（**保持既有测试基线不变**）。⚠ 它**只覆盖那三处**，**不替代**关断手段：服务端种子仍靠 `DISABLE_SEED=1`（或生产形态默认不播种）+ `DEPLOYMENT_GUIDE.md` 附录 A.2 的 services 层空表回退清单。

### 5.4 数据存储形态

| 数据 | 位置 | 形态 | 依据 |
|---|---|---|---|
| 业务数据 | `server/data.db` | **SQLite 单文件**（WAL 日志模式）。业务表统一 `(id TEXT PRIMARY KEY, data TEXT NOT NULL)`——**整条记录序列化在 `data` 里的 JSON 字符串** | `server/db.js:62`、`:64-66` |
| 会话 | 同上，`sessions` 表 | 关系表（`token` / `person_id` / `created_at`） | `server/db.js:45-49` |
| 附件元数据 | 同上，`attachments` 表 | 关系表（文件名/路径/大小/上传人/时间） | `server/db.js:50-57` |
| 附件物理文件 | `server/uploads/`（可用 `UPLOAD_DIR` 改） | 磁盘文件，文件名＝`<uuid>.<ext>`；**首次启动自动创建目录** | `server/routes/uploads.js:18`、`:54-57` |
| 前端静态文件 | `docs/` | 由 Express 静态托管（**强制 `Cache-Control: no-cache, must-revalidate`**） | `server/app.js:63-66` |
| 备份 | `server/backups/<时间戳>/` | **用脚本备，不要手拷库文件**：`scripts/backup.mjs`（Windows 可调 `scripts/backup.ps1`）→ 数据库走 SQLite **在线备份**（better-sqlite3 `db.backup()`，**含 WAL 内容的一致性快照，不需停服**）+ 附件目录整体复制 + 备份当场校验（`integrity_check`）；**只拷 `data.db` 会丢最近写入**（WAL 未并回）**且会丢附件物理文件**（表里只存元数据） | `server/scripts/backup.mjs`、`server/README.md`「备份与恢复」一节；WAL 见 `server/db.js:62`；附件目录见 §5.4 上一行 |
| 重置 | —— | **API 形态下 `?reset=` 三档不生效**；服务端重置＝删除 `server/data.db` 后重启自动重种，或 `DISABLE_SEED=1` 空库起步 | `server/README.md:19` |
| 库结构版本 | 库内 `PRAGMA user_version` | **有版本化迁移**：`server/db.js` 末尾「最小可用迁移机制」段以 `user_version` 记 schema 版本，启动（`initDb`）时把未应用的迁移**按序、在一个事务内**执行、**失败即抛**（不静默）；`v1` 为**基线迁移**（幂等重放既有建表 ⇒ 既有真库首启即登记为 v1、**数据一行不动**），今后新增/变更结构一律走 `v2+`；验收见 `server/test/db-migration.test.mjs` / `server/test/db-integrity-guard.test.mjs` / `server/test/backup-restore.test.mjs` | `server/db.js:207-232`（`MIGRATIONS`）、`server/db.js:235`（`SCHEMA_VERSION`）、`server/db.js:68`（启动接入点） |

### 5.5 服务器侧注意事项 / 限制（**请逐条核对**）

| # | 事项 | 说明 | 依据 |
|---|---|---|---|
| 1 | **资源列表读口需登录** | `GET /api/v1/<资源名>`（30 个）与 `GET /api/v1/bootstrap` **默认要登录**（未登录 401）；**唯一公开的资源读口＝`GET /api/v1/issues`**（**全量**公开——**不分处置状态、含未处置件**；出口一律脱敏）；`GET /api/v1/health` 公开。**白名单口径＝「有明确裁定公开的才公开」**，故 `users`（含姓名/学号）、考勤、考察、思想汇报、附件元数据等**一律不再公开**。**收紧前**为「全部公开」 | `server/routes/resources/index.js:30-43`（逐表读口）、`server/routes/resources/index.js:268`（bootstrap）、`server/routes/resources/index.js:547`（issues 公开） |
| 2 | **多数写口仅要求登录** | 30 类资源里只有 `branchDocs` / `fileSpaceRecords` / `imageRecords` 三张用支委门；其余（`activities` 除外有专门写门）**默认「登录即可写」**——普通成员可写 `todos`/`attendances`/`inspections`/`taskforces` 等 | `server/routes/resources/index.js:54-56` |
| 3 | **无 CORS 配置** | 未挂载 CORS 中间件 → 只能**同源部署**（前端与 API 同一域名/端口）；跨域调用会被浏览器拦截 | `server/app.js`（无 cors 挂载） |
| 4 | **无 HTTPS** | 服务自身只提供 HTTP；token 明文传输。真实部署应由反向代理终止 TLS | `server/server.js:21`；HTTPS 为对接前置条件见 `DEPLOYMENT_GUIDE.md:200` |
| 5 | **token 无过期时间** | `sessions` 表**没有过期字段**，退出登录靠显式 `POST /auth/logout` 删行；账号流出（`transferOut`）会使在途会话失效 | `server/db.js:45-49`、`server/routes/auth.js:74-77` |
| 6 | **无全局限流** | 只有意见反馈提交按 `tokenHash` 做频率窗口（10 分钟内 20 条）与判重（5 分钟同内容） | `server/routes/resources/index.js:543-545`（窗口与上限）、`server/routes/resources/index.js:594-599`（判重 / 限频判定） |
| 7 | **单进程 / 单文件库** | `better-sqlite3` 为同步 API；**不支持多实例并行写同一库**（横向扩容需改架构） | `server/db.js:2`、`:62` |
| 8 | **静态资源不缓存** | 响应头强制 `no-cache`（开发/测试期防旧模块），生产环境需评估带宽影响 | `server/app.js:63-66` |
| 9 | **请求体上限** | JSON 体 **2MB**；`/snapshot` 原始体 **4MB**（gzip 压缩体）；上传单文件 **10MB** | `server/app.js:22-23`、`server/routes/uploads.js:52` |
| 10 | **进程须常驻** | 定时任务（每日 03:00 上报 / 每 10 分钟会议提醒）依赖进程长期运行；进程需用 systemd / pm2 / 容器守护 | `server/server.js:22-23`、`server/services/reporting.js:229-249` |
| 11 | **邮件通道当前恒不生效** | 收件人从成员档案 `email` 字段读取，而**示例数据没有 `email` 字段** → 全部静默跳过（补上字段后自动生效，无需改代码） | `server/services/mailer.js:93-106`、`server/services/mailer-hooks.js:41` |
| 12 | **上报「默认拉取」** | 未配置 `REPORT_WEBHOOK_URL` 时 `/report/trigger` 返回 **409**（提示改用拉取模式） | `server/routes/report.js:20-22` |
| 13 | **附件下载需登录 ＋ 支部隔离** | `POST /api/v1/uploads` **＝支委层**（`requireCommissioner`）；`GET /api/v1/uploads/:name` 需要登录、只取 basename（防路径穿越），并按**上传人所属支部**做隔离（党委跨支部可见；无记录 404）。⚠ 隔离判据是「**上传人现在所属支部**」——`attachments` 表**无支部字段**，故同一人换支部后其历史附件会跟着换支部 | `server/routes/uploads.js:69`、`:88-100` |
| 14 | **删除活动会级联删除子数据** | 删活动会连带删除其 `tasks`/`attendances`/`inspections`/`assignments`/`activity_reviews`/`makeup_tasks`，以及关联的报名与通知——**不可撤销** | `server/routes/resources/index.js:141-159` |
| 15 | **配置写留痕上限 100 条** | 超出后裁剪最早条目（低频可回滚，历史不改写） | `server/routes/resources/index.js:12,444` |
| 16 | **演示支委名单硬编码** | `COMMITTEE_IDS = ['p10','p11','p12','p13','p14']` 是**示例支部的支委 personId**，被成员变更广播与「旧活动表决名单兜底」引用；真实部署必须同步替换 | `docs/src/core/domain/constants.js:206`、`server/routes/member.js:107`、`server/routes/committee.js:89` |
| 17 | **默认支部 id 硬编码兜底** | 大量读写在 `branchId` 缺省时回退常量 `'br-b1'`（示例支部 id）；真实部署若用别的 id，须保证所有写入都带 `branchId` | `server/routes/resources/gates.js:50`、`server/routes/resources/index.js:517,606`、`server/routes/member.js:176,203` |
| 18 | **快照写穿的残余口（P0-1）** | `POST /api/v1/snapshot` 的乐观锁只对**带了 `_versions` 的集合**生效；未带该键的集合**按无条件整表写**（兼容旧客户端与直连调用，如 `server-base.test.mjs`）。真实写路径只有前端一条（`data-adapter.js::_flushSnapshot` 恒定带 `_versions`）⇒ 生产链路不暴露；对外直连写库须自行带 `_versions`（先 `GET /api/v1/snapshot/versions` 取基线） | `server/routes/resources/index.js` 末尾「快照写穿的集合版本号协议」段、`docs/src/data/data-adapter.js` 末尾「P0-1 乐观锁」段 |
| 19 | **pagehide 兜底写撞 409 时无法当场自愈** | 页面卸载瞬间的同步冲刷（`_flushSnapshotSync`）同样带 `_versions`（不会退化成无条件覆盖），但**该上下文已无法再观测响应** ⇒ 撞 409 时只 `console.warn`，本地改动靠 `localStorage` 备份保留、不会进服务端（下次打开页面以服务端为准） | `docs/src/data/data-adapter.js`（`_flushSnapshotSync` / `_recoverFromConflict`） |
| 20 | **远端变更探测（P1-1）：多标签 / 多设备不必整页重载** | 前端读的是内存缓存（`init()` 只在页面加载时拉一次）⇒ 现加**低频探测**：触发＝①「页面转可见」（`docs/src/entries/pages/main-entry.js:211-217`（`visibilitychange`），复用既有监听器）② 可见态低频定时器（缺省 60s，`docs/src/data/data-adapter.js:999`（`REMOTE_PROBE_INTERVAL_MS`））；动作＝取既有 `GET /api/v1/snapshot/versions` 与本机基线**逐集合比对**、**只重拉版本不一致的集合**（与 409 冲突恢复共用 `_refreshCollections`）；同源多标签另有 `BroadcastChannel`（频道 `gsm1921-data-changed`）**零网络**唤醒——它只是「去探测一次」的信号，数据一律从服务端取。**避让**：本机在途写 / `init()` 未完成 ⇒ 整次跳过；该集合本机仍脏 ⇒ 逐个排除（防回滚本机未提交的改动）。**失败静默**（探测只读；失败仅 `console.warn`，不弹错误、不影响使用——与写链 fail-fast 是两件事）。**开关**：`localStorage['gsm1921-remote-probe']='off'`（或 `setRemoteProbeEnabled(false)`）关闭，**默认开**；**mock / 静态托管形态零网络、不启用**。**未新增任何服务端路由** | `docs/src/data/data-adapter.js:1136`（`probeRemoteChanges`）、`docs/src/entries/pages/main-entry.js:211-217`（`visibilitychange`）、`server/routes/resources/index.js:663`（versions 读口） |
| 21 | **探测的边界（残余，如实登记）** | ① **不是实时推送**：最坏等一个探测周期（缺省 60s）——同源多标签由 `BroadcastChannel` 缩短到近实时，**跨设备仍按周期**；② 只覆盖 **api 形态的已登录页面**（mock / 静态托管不启用）；③ `handoffs` / 成员变更确认队列 / `milestones` **三域不带集合版本号**（它们不进快照集合，见 §6 末「语义端点」段）⇒ 每次探测**直接重拉这三个小集合**并按内容比对（体量小、代价低；**未改**「语义端点域不进快照集合」这条既有纪律）；④ 探测**不写任何数据**（不做离线队列、不做冲突合并）——写链仍是「脏集合增量快照 ＋ `_versions` 乐观锁」 | `docs/src/data/data-adapter.js:1018`（`REMOTE_PROBE_AUX`）、`:1062`（`_refreshCollections`）、`server/test/records-endpoints.test.mjs:182-190`（三域不进集合版本基线） |

### 5.6 部署到真实环境需要替换的东西

| # | 要替换的 | 做法 | 依据 |
|---|---|---|---|
| 1 | **示例成员与账号** | 换 `docs/src/data/mock/people.js`、`accounts.js`、`branches.js`、`party-groups.js`、`activities.js`、`notices.js`、`taskforces.js`、`seed.js`；或**空库起步**（`DISABLE_SEED=1`）后从系统内录入 | `server/seed.js:41-83`、`README.md:198`。首启播种的表含 15 张（考勤 / 考察 / 活动复盘 / 专班复盘 / 思想汇报 / 宣传周报 / 宣传任务 / 文件流外发确认 / 支书任期记录 / 三委数据交接 / 成员变更确认队列 / 出勤与考察申诉队列 / 反馈未读标记 / 授权审计留痕），使「只有结构、没有数据」的表首启即有真行；另补 `todos`（同为单据型种子，见 §4.19；同源 `docs/src/services/governance/todo.js::SEED_TODOS`）⇒ 合计 16 张。逐表口径见 `server/seed.js` 末尾「待办基线种子」段 |
| 2 | **登录口令** | 设 `LOGIN_PASSWORD`（**并确认未开 `DISABLE_PASSWORD_CHECK`**）；接入学校统一认证（IAAA）时替换 `POST /auth/login` 的校验逻辑 | `server/routes/auth.js:12-18`、`DEPLOYMENT_GUIDE.md:207,215` |
| 3 | **演示支委名单 / 默认支部 id** | `COMMITTEE_IDS` 与 `'br-b1'` 兜底常量（见 §5.5 第 16、17 条） | 同上 |
| 4 | **示例反馈种子** | `docs/data/issues.json`（服务端播种时读取；内部汇报型不脱敏、公开型脱敏） | `server/seed.js:19-39`、`:67` |
| 5 | **组织名称 / 主题 / 术语** | 支部名与 `config.headerTitle`；主题预设 `themePreset`（需支书特批的配色见 `DESIGN_SYSTEM.md` §二 色彩系统）；术语权威源 `content/03_doc_system/OPERATIONS_GUIDE.md` §19（《运行与协作规范》） | `README.md:195-202` |
| 6 | **制度参数默认值** | `docs/src/core/domain/policy-defaults.js`（支部可调项）；制度固定项勿改 | `docs/src/core/domain/policy-defaults.js:6-15` |
| 7 | **关闭演示数据回退（防污染真实账本）** | ① 设 **`APP_ENV=production`**（生产形态**默认不播种**，主推做法）；② 仍可显式 `DISABLE_SEED=1`（等价、更直白）；③ 前端空域回退开关 `SEED_FALLBACK` 置 `false`（关的是 `data/data-adapter.js::init()` 里考勤/考察/待办三域的空表回退）——**静态托管 / 直接以 `docs/` 为根** ⇒ 改 `docs/src/config/deploy.js` 常量；**Node 托管** ⇒ 设环境变量 `SEED_FALLBACK=0`（由 `server/app.js:55-57` 注入 `false`；缺省 `true`＝演示形态）；④ 按部署文档附录 A.2 逐项关闭 services 层其余空表回退 | `DEPLOYMENT_GUIDE.md:249`、`docs/src/config/deploy.js`、`server/app.js:55-57`、`server/env.js` |
| 8 | **平台对接地址** | `REPORT_WEBHOOK_URL` / `REPORT_TOKEN` / `REPORT_BASE_URL` / `REPORT_ADMIN_MAIL`；邮件 `SMTP_*` | `server/.env.example:23-36` |
| 9 | **API 基址** | 前端切换 API 形态时的 `apiBaseUrl`（`services/core/runtime.js` 的 `setDataSource('api', {...})`），对接计算中心域名 | `DEPLOYMENT_GUIDE.md:124-134` |
| 10 | **学校侧要提供的环境** | 域名 + ICP 备案、数据库、API 服务器、HTTPS（责任方为支书/计算中心） | `DEPLOYMENT_GUIDE.md:193-202` |
| 11 | **未接入项（需另行开发）** | ① 北大党校 / 智慧党建平台的数据同步（**规划，无代码**）；② 微信小程序（**规划，无代码**）；③ AI 本地推理（**规划**）；④ 北大 IAAA 单点登录（门控已预留落点，**未接入**） | `DEPLOYMENT_GUIDE.md:47-48,81-84,217-240` |

**部署前自检与演示账号清理（可执行）**

> 上线前把「**库内只有真人** ＋ **口令已换**」两件事做完；判定与背景见 `DEPLOYMENT_GUIDE.md` 附录 A.2 第 1 / 5 条，完整命令见 `server/README.md`「部署前自检与清理演示账号」。

1. **看启动日志**：`npm start` 打印 `[server] 自检 · users 计数=…；演示种子账号=…`——真实库应为 **`演示种子账号=0`**（判据＝`docs/src/data/mock/people.js::PEOPLE` 的 id 集）。若 > 0 且是正式库 ⇒ 走下一步。
2. **列出现有演示账号（只读，不删）**：`cd server` 后
   ```bash
   node --input-type=module -e "import Database from 'better-sqlite3'; import { PEOPLE } from '../docs/src/data/mock/people.js'; const db=new Database(process.env.DB_PATH||'./data.db',{readonly:true}); const demo=new Set(PEOPLE.map(p=>p.id)); const hit=db.prepare('SELECT id FROM users').all().map(r=>r.id).filter(id=>demo.has(id)); console.log('库内演示账号数='+hit.length, hit.join(','));"
   ```
3. **清理**：**推荐空库起步**——停服 → 移走 `data.db`（及 `data.db-wal` / `data.db-shm`）→ 以 `APP_ENV=production`（或 `DISABLE_SEED=1`）启动，空库不播种、从系统内录真实人员。若本库已有真实数据：**先 `.\scripts\backup.ps1` 备份**，停服后按需删演示账号（`sessions` / 业务表可能有引用，删前确认这些也属演示数据）。
4. **换口令**：设 `LOGIN_PASSWORD=<强口令>`（生产形态不设 ⇒ 启动即拒），确认未设 `DISABLE_PASSWORD_CHECK`（详见 §5.3 / §5.6）。

---

## §6 接口一览

> **基础路径**：`/api/v1`（认证路由挂在 `/api/v1/auth`）。**认证方式**：`Authorization: Bearer <token>`（token 由登录接口签发）。
> **数量口径**：**显式声明的路由 62 条**——＝各路由文件的 `router.*` 声明 **64 条**（`server/routes/` 实测 64，其中 **4 条在通用资源循环里**）**减去那 4 条循环声明** 得 **60 条**，**再加 `server/app.js` 的 2 条**（`GET /api/v1/health`、`GET /src/config/deploy.js`，见 §6.12）；其中「通用资源 CRUD」是**循环注册**的（29 个资源名，见 §6.2），**循环展开 115 条**（GET 29 ＋ POST 28〔跳过 `branches`，它的 POST 走 §6.3 语义端点〕＋ PATCH 29 ＋ DELETE 29）。**展开后总路由数＝62 ＋ 115 ＝ 177 条**。

### 6.1 认证（`server/routes/auth.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/auth/login` | 登录：body `{personId, password}` → 返回 `{token, user}`；未知人员/口令错/账号已流出 → 401 | 公开 |
| POST | `/api/v1/auth/logout` | 注销：删除当前 token 会话 → 204 | 公开（带 token 才有效） |
| GET | `/api/v1/auth/me` | 取当前登录人档案 | 需 token（否则 401） |

### 6.2 通用资源（读 + CRUD，`server/routes/resources/index.js` 循环注册）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/<资源名>` | 列全表（JSON 数组） | **需登录**（30 个资源名**一律**；未登录 401。唯一公开的资源读口＝`GET /api/v1/issues`，见 §6.9） |
| POST | `/api/v1/<资源名>` | 新建单条；缺 `id` 时服务端生成 | 需登录（`branchDocs` 例外＝支委门）+ 资源写角色门（若有） |
| PATCH | `/api/v1/<资源名>/:id` | 局部合并更新 | 同上 |
| DELETE | `/api/v1/<资源名>/:id` | 删除（文件类资源联动删物理文件；删活动级联删子记录） | 同上 |

**资源名 ↔ 表名 ↔ id 前缀（29 个）**：

| # | 资源名（URL 段） | 服务端表 | 新建 id 前缀 |
|---|---|---|---|
| 1 | `activities` | `activities` | `act` |
| 2 | `tasks` | `tasks` | `tsk` |
| 3 | `attendances` | `attendances` | `att` |
| 4 | `inspections` | `inspections` | `ins` |
| 5 | `taskforces` | `taskforces` | `tf` |
| 6 | `notices` | `notices` | `ntc` |
| 7 | `todos` | `todos` | `td` |
| 8 | `assignments` | `assignments` | `asg` |
| 9 | `makeupTasks` | `makeup_tasks` | `mk` |
| 10 | `users` | `users` | （未列，服务端按 `x` 兜底） |
| 11 | `experienceDeposits` | `experience_deposits` | `xp` |
| 12 | `fileSpaceRecords` | `file_space_records` | `fs` |
| 13 | `imageRecords` | `image_records` | `img` |
| 14 | `signups` | `signups` | `su` |
| 15 | `activityReviews` | `activity_reviews` | `arw` |
| 16 | `taskforceReviews` | `taskforce_reviews` | `tfr` |
| 17 | `propTasks` | `prop_tasks` | `ppt` |
| 18 | `weeklyReports` | `weekly_reports` | `wr` |
| 19 | `archiveRecords` | `archive_records` | `ar` |
| 20 | `externalDispatches` | `external_dispatches` | `ed` |
| 21 | `actSubRecords` | `act_sub_records` | `asr` |
| 22 | `tfSubRecords` | `tf_sub_records` | `tfs` |
| 23 | `branchDocs` | `branch_docs` | `bd` |
| 24 | `branches` | `branches` | `br`（**POST 不走本条，见 §6.3**） |
| 25 | `appointmentRecords` | `appointment_records` | `appt` |
| 26 | `reviewRequests` | `review_requests` | `rq` |
| 27 | `thoughtReports` | `thought_reports` | `tr` |
| 28 | `partyGroups` | `party_groups` | `pg` |
| 29 | `memberFlows` | `member_flows` | `mf` |

> ⚠ **`complianceReferences`（`compliance_references`，前缀 `cr`，原第 12 项）已删除**（死表——无 UI 消费方 / 无写口 / 无字段契约），删表走 `server/db.js` 的 `v2` `DROP TABLE` 迁移。
> `users` 的 `POST` / `DELETE` 门＝**仅 `party-staff`**；`PATCH` 门＝**仅 `party-staff`**，另开**本支部现任支书 / 副支书**的「支委身份配置」一格（组织 / 宣传 / 纪检委员；撤销位 `participant`；跨支部 / 白名单外角色键 / 支书·副支书身份一律 403——判据 `docs/src/core/domain/constants.js::branchCommissionerWriteDeny`）；`branches`/`appointmentRecords` 同理仅党委。**依据**：`server/routes/resources/index.js:21`、`server/routes/resources/store.js:8-43`（映射）、`server/routes/resources/gates.js:24-36`（写门）、`server/routes/resources/store.js:48-65`（id 前缀）。
> **GET 读口**：29 个资源名**默认要登录**，**唯一留白名单的是「有明确裁定公开」的 `issues`**（且它不在这 29 个里，是独立语义端点）；**`branches` 不放行**（按「不放行」处理，宁严勿松）。**依据**：`server/routes/resources/index.js:30-43`。

### 6.3 支部与配置（`server/routes/resources/index.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/branches` | 语义创建支部：`{mode:'empty'\|'copy', sourceId?, name?, type?}` → 201 `{branch, ok:true}` | 需登录 + **仅 `party-staff`** |
| PATCH | `/api/v1/branches/:id/config` | 写支部配置：`config` 收 `modules`/`blocks`/`workforce`/`headerTitle`/`desc`/`themePreset`/`policyOverrides`；可选 `why`（写留痕） | 需登录 + 全量权（党委 / 本支部现任支书 / 本支部副支书）或域负责人（仅本域 `policyOverrides`） |
| PATCH | `/api/v1/branches/:id/config/rollback` | 配置单键回滚：`{targetEntryAt?\|index?, why?}` | 同上门（**不含域负责人**） |
| POST | `/api/v1/activities/:id/archive` | 活动归档（`archived=true`），并级联把该活动未完成任务置为已完成 | 需登录 |
| POST | `/api/v1/activities/:id/brand` | **取消**品牌认定（`isBrand=false` ＋ 写 `brandRevokedBy` / `brandRevokedAt`）。⚠ **只能取消、不能认定**——**认定**的唯一入口＝支委会议程项「记录结果 · 通过」（`applyBrandDesignationResult`）；非品牌态 → 400（无「任一登录用户 POST 即翻转 `isBrand`」的后门） | 需登录 + **支委层**（`BRANCH_COMMITTEE_ROLES`） |

### 6.4 全量读写

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/bootstrap` | 一次拉取全部资源的列表（**与逐表读等价**；前端 `init()` 实走 10 个逐表读口，**不经本口**——本口供外部对接/测试用） | **需登录**（与逐表同门） |
| GET | `/api/v1/snapshot/versions` | **集合版本基线**（P0-1 乐观锁的起点）：返回 `{ versions: { 集合名: 版本 } }`（全集，未写过的集合＝`0`）。前端 `init()` 先取它，快照上传时随 `payload._versions` 回带 | 需登录 |
| POST | `/api/v1/snapshot` | **全量快照写穿**：整表替换（前端 `persist()` 的落库目标）；支持 gzip 请求体。**乐观锁**：请求带 `_versions`（集合名→基线版本）时 **逐集合乐观锁**（不一致 ⇒ **409** + `{conflicts:[{collection,base,current}]}`，**整批不写**），一致 ⇒ 事务内替换 + 版本 +1，返回 **200** + `{versions}`；**未带 `_versions` 的集合按无条件写**（旧客户端/直连调用，返回 **204**，形状不变） | 需登录 |

### 6.5 成员与名册（`server/routes/member.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/member-change-requests` | 成员变更申请列表（可按 `activityId` / `status` 过滤） | 需登录 |
| POST | `/api/v1/member-change-requests` | 创建变更申请（须 `activityId`/`agendaItemId`/`personId`/`fromStage`/`toStage`）；重复 → 409 | **支委层** |
| POST | `/api/v1/member-change-requests/:id/approve` | 组织委员审批 → 自动广播全体支委 | **仅组织委员** |
| POST | `/api/v1/member-change-requests/:id/confirm` | 支书/副支书确认 → 更新成员 `developStage` | 支书 / 副支书（同支部校验） |
| POST | `/api/v1/members/:id/develop-stage` | 直写发展阶段（白名单仅 `developStage`；含 `role`/`branchId` → 400） | 支书 / 副支书 |
| POST | `/api/v1/members/:id/residence-status` | 写在校/滞留状态（白名单 `residenceStatus`/`residenceNote`/`residenceHistory`） | 支书 / 副支书 |
| PATCH | `/api/v1/members/:id/profile` | 名册档案行内编辑（`name`/`studentId`/`enrollYear`/`partyGroup`+在册字段；**发展阶段不在白名单**） | **仅组织委员** |
| POST | `/api/v1/members` | 名册新增成员（强制 `role='participant'` + 归本支部）；id 已存在 → 409 | **仅组织委员** |
| POST | `/api/v1/members/intake` | 成员流动·**流入登记**（同一实现体、另一写门） | 组织委员 + 支书/副支书 |
| POST | `/api/v1/members/:id/transfer-out` | 移出（软标记 `transferOut=true`；幂等） | 组织委员 + 支书/副支书 |
| POST | `/api/v1/members/:id/undo-transfer-out` | 撤销流出（清除软标记；不接收任何字段） | 组织委员 + 支书/副支书 |
| GET | `/api/v1/committeeBroadcasts` | 支委广播列表（可按 `requestId` 过滤） | 需登录 |

### 6.6 线上表决（`server/routes/committee.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/agenda-votes` | 表态列表（可按 `activityId` 过滤） | 需登录 |
| POST | `/api/v1/agenda-votes` | 提交/覆盖表态：`{activityId, agendaItemId, position, note?}`。活动不存在 404；配置非法 400；不在名单 403；截止锁定 400；无记名时**同一人重复提交幂等返回原记录** | 需登录 + 应在名单内 |
| POST | `/api/v1/agenda-votes/lock` | 支书截止（**不可逆**：`votesLocked=false` 不写入） | **支书 / 副支书** |

### 6.7 系统派生通知（`server/routes/system-notices.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/system-notices` | 按 `kind` 注册表生成系统通知：body `{kind, sourceId, payload}`。未知 kind 400；`authorize` 不通过 403；成功 201 落 `notices` 表 | 需登录 + **按 kind 的业务对象关系复算授权** |

**已注册的 kind（共 23 种）**：`thought-report-submitted`（思想汇报已提交）、`attendance-confirmed`（考勤已确认归档）、`activity-agenda-updated`（议程已更新）、`member-change-approved`（成员变更已审批）、`workforce-proposal-created` / `workforce-proposal-adopted`（支部分工议题待表决 / 已生效）、`committee-vote-progress` / `committee-vote-locked`（表态进度 / 表决截止）、`project-auth-granted`（赋权通知）、`external-dispatch-created`（材料外发待确认）、`weekly-report-submitted`（**周报已报送、待支书审核**）、`review-request-submitted` / `review-request-decided`（支部上报待批复 / 上报结论）、`activity-created-broadcast`（活动已创建请建核心群）、`taskforce-vote-requested`（专班议案排入待表态）、`review-overdue-reminder` / `review-resubmit-reminder`（复盘超期 / 重提提醒）、`activity-notice-draft` / `taskforce-notice-draft`（活动 / 专班预拟通知）、`makeup-remind`（**补课材料催办**——受众**到人定向**、仅纪检委员可触发）、`committee-dispatch`（党委下发）、`organizer-transferred`（**组织者已转交**——受众**到人定向**＝被退出的原组织者，文案＝知会＋交接提示）、`todo-void-decided`（**待办作废已裁决**——受众＝该待办原属角色，**非行动性**纯站内知会）。
**依据**：`server/system-notice-kinds.js:57-388`（`KINDS` 注册表，23 个键）、`:205-212`（`weekly-report-submitted`）、`:325-347`（`organizer-transferred`）、`:362-387`（`todo-void-decided`）。

**权威源**：`server/routes/system-notices.js` ＋ `server/system-notice-kinds.js`——系统派生通知：23 种 kind 的授权复算与文案生成（逐 kind 清单见上行，端点见本节表）。

### 6.8 组长台聚合读（`server/routes/leader-progress.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/leader/member-progress?personIds=p4,p5&today=YYYY-MM-DD` | **服务端汇总**指定人员的进展：`{rows:[{personId, active, overdue, absent, inspPending, reportState, reportKind, reportTitle}], today}`；`personIds` 必填，缺 → 400 | 需登录 |

### 6.9 意见反馈（`server/routes/resources/index.js` 语义端点）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/issues` | 公开读反馈列表（**一律脱敏，不含提交人真身**） | **无门（公开）** |
| POST | `/api/v1/issues` | 提交反馈：`{title, body, scope, types[], domain?, anonymous?, submitterToken?}`（`domain`＝**事项领域**，**服务端选填、不设硬校验**）。字段缺失 400；超频 429；重复 409。**匿名亦落库真实提交人 `_realPersonId`** | 需登录 |
| PATCH | `/api/v1/issues/:id` | 处置/回复：白名单字段局部合并（`status`/`closedReason`/`assignee`/`dispatchHistory`/`comments`/`hidden`/`mergedInto`…）；**读取原始记录后只合并白名单字段、原样写回**（不会抹掉真身） | 需登录 + **支委会（支委层）**——`ISSUE_DISPOSITION_SET`＝`BRANCH_COMMISSION_ROLES`（普通成员与党小组组长仍 403） |
| GET | `/api/v1/issues/reveal` | **查看匿名反馈的真实提交人**；命中即写一条 `issue_reveals` 留痕 | 需登录 + **仅 `party-staff`**（非党委 403） |

### 6.10 附件（`server/routes/uploads.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/uploads` | 上传附件（multipart，字段名 `file`；允许类型 jpg/jpeg/png/pdf/doc/docx/xlsx/mp4，单文件 ≤10MB）→ 201 元数据 `{id, filename, path, size, uploadedBy, uploadedAt}`；类型不支持/为空 → 400 | 需登录 + **支委层**（`requireCommissioner`） |
| GET | `/api/v1/uploads/:name` | 受保护下载（仅取 basename，防路径穿越）＋ **支部隔离**（按上传人所属支部；党委跨支部可见；无记录 404） | 需登录 |

### 6.11 数据上报（`server/routes/report.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/report/trigger` | 手动触发推送（四域）；未配置 webhook → **409** | 需登录 |
| GET | `/api/v1/report/export?domain=&from=&to=` | CSV 导出（带 UTF-8 BOM，Excel 中文兼容）；未知域 400 | 需登录 |
| GET | `/api/v1/report/:domain?from=&to=` | JSON 拉取单域；未知域 400 | 需登录 |

**四个数据域**：`member` 党员信息（全量成员，排除组织级人员，联系方式默认不报）/ `activity` 活动记录（排除取消/草稿）/ `attendance` 考勤记录（**仅已确认，状态非 pending**）/ `study` 学习记录（**仅已完成**的补课任务）。时间窗缺省＝近 7 天。
**依据**：`server/services/reporting.js:14-19`、`:51-124`、`:36-38`。

### 6.12 其它

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/health` | 健康检查 → `{ok:true}` | **无门（公开）** |
| GET | `/src/config/deploy.js` | **由服务端动态注入**：返回 `export const DEPLOY_MODE = "server";`（前端据此判断「有后端/无门面页」） | 无门（公开） |

### 6.13 语义端点：三委数据交接 / 成员变更确认队列 / 批次里程碑（`server/routes/resources/index.js`）

> **三域服务端对源**。这三域原先**只有浏览器本地一份**（`handoffs` 有本地落盘却不在快照 payload / init 拉取 / 资源名映射里 ⇒ api 形态下刷新即丢；成员变更确认队列只存 localStorage 键 `gsm1921-member-confirmations` ⇒ 清缓存 = 旧版 `transferOut` 存量请求死锁；`milestones` 只读静态文件 `docs/data/milestones.json`）。现按**语义端点域**模板（同 `agenda_votes`）落服务端表，表＝`server/db.js::SEMANTIC_TABLES`（**独立于 `RESOURCE_TABLES`** ⇒ 不进快照 payload、无通用 CRUD），前端 `init()` 逐域拉取填充缓存（`docs/src/data/data-adapter.js::_loadAuxCollections`）。

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/handoffs?to=&status=` | 交接记录列表（可按接收角色 / 状态过滤） | 需登录 |
| POST | `/api/v1/handoffs` | 发起交接 `{id?, type, refType, refLabel, refId, note?}`；**`from`/`to` 由 `type` 派生**（单一源＝`docs/src/services/governance/handoff.js::HANDOFF_TYPES`，**不采信客户端自述**）；未知类型 400、id 重复 409 | 需登录 + **该交接类型的发起方角色**（`actor.role === HANDOFF_TYPES[type].from`；不符 403） |
| POST | `/api/v1/handoffs/:id/confirm` | 接收方确认（置 `status='done'` + `confirmedAt`/`confirmedBy`）；非 `pending` 幂等原样返回；不存在 404 | 需登录 + **该行 `to` 的角色**（不符 403） |
| GET | `/api/v1/member-confirmations?status=` | 成员变更确认请求队列（默认全量含终态；可按状态过滤） | 需登录 |
| POST | `/api/v1/member-confirmations` | 入队（组织委员发起）`{id?, personId, kind?, action, to, …}`；缺字段 400、id 重复 409 | 需登录 + **组织委员**（`ORG_COMMISSIONER_ROLES`） |
| POST | `/api/v1/member-confirmations/:id/decide` | 支书/副支书决策 `{decision:'approved'\|'rejected', note?}`；非法 decision 400、已终态 400、不存在 404 | 需登录 + **支书 / 副支书**（`SECRETARY_AND_DEPUTY_ROLES`，副书同权） |
| GET | `/api/v1/milestones` | 批次里程碑列表（**只读**；内容单一源＝`docs/data/milestones.json`，由 `server/seed.js::seedMilestones()` 播种） | 需登录 |

**依据**：`server/routes/resources/index.js` 末「语义端点：三委数据交接 / 成员变更确认队列 / 批次里程碑」段、`server/db.js::SEMANTIC_TABLES`、`docs/src/data/api-adapter.js`（`handoffs` / `memberConfirmations` / `milestones` 三组）、`docs/src/services/{handoff,member-confirmation,milestones}.js`（api 形态走服务端 / mock 形态走本地路径）。

### 6.14 语义端点：申诉队列 / 反馈未读标记 / 授权审计留痕（`server/routes/resources/index.js`）

> **四处服务端对源**（支书逐字：「我们必须把网页升级成系统！！【浏览器缓存固然有用但不能什么都依靠浏览器缓存！！】」）。这四处原先**只有浏览器本地一份**（出勤/考察申诉队列各只存 localStorage 键 `gsm1921-attendance-appeals` / `gsm1921-inspection-appeals`；反馈未读标记按人分键 `gsm1921-issue-unread-<assigneeId>`；授权审计留痕只存 `sop_org_os_auth_audit`）⇒ 清缓存即灭失、换设备读不到。现按**语义端点域**模板（同 §6.13）落服务端表，表＝`server/db.js::SEMANTIC_TABLES`（**独立于 `RESOURCE_TABLES`** ⇒ 不进快照 payload、无通用 CRUD），前端 `init()` 逐域拉取填充缓存（`docs/src/data/data-adapter.js::_loadAuxCollections`）。

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/attendance-appeals?branchId=&status=` | 出勤申诉队列（可按支部 / 状态过滤） | 需登录 |
| POST | `/api/v1/attendance-appeals` | 提交出勤申诉 `{personId, activityId, note?}`；缺字段 400、id 重复 409 | 需登录 + **当事人本人**（`personId === actor.id`；替他人提交 403） |
| PATCH | `/api/v1/attendance-appeals/:id` | 处置（关闭 / 打回）`{status:'closed'\|'returned', note?}`；非白名单字段 400、非法 status 400、非 `pending` 不可再处置 400、不存在 404 | 需登录 + **支委层（`BRANCH_COMMISSION_ROLES`）或党小组组长（`leader`）** |
| GET | `/api/v1/inspection-appeals?branchId=&status=` | 考察申诉队列（同出勤申诉口径） | 需登录 |
| POST | `/api/v1/inspection-appeals` | 提交考察申诉 `{personId, activityId, note?}`（同上） | 需登录 + **当事人本人** |
| PATCH | `/api/v1/inspection-appeals/:id` | 处置（关闭 / 打回）（同上） | 需登录 + **支委层或党小组组长** |
| GET | `/api/v1/issue-unread?assigneeId=&open=1` | 意见反馈「逐人未读标记」（可按被指派人 / 仅未读过滤） | 需登录 |
| POST | `/api/v1/issue-unread` | 置未读 / 销项 `{assigneeId, issueId, unread?}`（`unread:false`＝已读）；缺字段 400 | 需登录（**与 mock 形态同口径**：标记是「指派 / 答复」写链的副产品，由派发方替被指派人落未读） |
| GET | `/api/v1/auth-audit` | 授权审计留痕（只增不改的治理档案；`{id,targetPersonId,role,scopeRef,authorizedBy,authorizedAt,action}`） | 需登录 + **支委层**（`BRANCH_COMMISSION_ROLES`） |
| POST | `/api/v1/auth-audit` | 追加一条留痕（赋权动作内部调用）；同 id 幂等不重复落 | 需登录 |

**依据**：`server/routes/resources/index.js` 末「语义端点：申诉队列 / 反馈未读标记 / 授权审计留痕」段、`server/db.js::SEMANTIC_TABLES`（`attendance_appeals` / `inspection_appeals` / `issue_unread` / `auth_audit`）、`docs/src/data/api-adapter.js`（`attendanceAppeals` / `inspectionAppeals` / `issueUnread` / `authAudit` 四组）、`docs/src/services/{attendance,inspection,issues,auth}.js`（api 形态走服务端 / mock 形态走本地路径）。

---

## §7 已知限制与未实现项（**如实列出**）

> 本节只写**能在代码/文档里指到出处**的项。凡我无法取证的，一律注明「未取证」，不用「应该是」。

### 7.1 安全与权限类（**最需要后端注意**）

| # | 项 | 现状 | 依据 |
|---|---|---|---|
| 1 | **资源列表读口已收紧（需登录）** | `GET /api/v1/<资源名>`（29 个）与 `/bootstrap` **默认要登录**（未登录 401）；**唯一公开的资源读口＝`GET /api/v1/issues`**（出口脱敏）。**收紧前**为「不需要登录、直接返回全表 JSON」——那时 `users`（含姓名与学号）等可被未登录者全量列举。**仍留的读侧缺口是跨支部**（见第 2 条） | `server/routes/resources/index.js:30-43`、`server/routes/resources/index.js:268`（bootstrap）、`server/routes/resources/index.js:547`（issues 公开） |
| 2 | **服务端不做支部级读取过滤** | 列表读是「整表返回」；支部归属过滤（`withinBranch`）由**前端**做。同一台服务器上若存在多个支部，任一**已登录**读者可拿到全部支部的数据 | `server/routes/resources/store.js:44-46`（`listTable` 全表）、`server/routes/resources/index.js:517`（注释原文：「支部归属（2026-09-15 裁定）：写入取 actor.branchId；**读取过滤在前端 withinBranch**」）、`docs/src/services/core/visibility.js`（可见性在前端计算） |
| 3 | **多数资源写口只要求登录** | 29 类资源中仅 `branchDocs` / `fileSpaceRecords` / `imageRecords` 使用支委门；`activities` 有专门活动写门；其余（`tasks`/`attendances`/`inspections`/`taskforces`/`todos`/`signups`/`weeklyReports`…）**任意登录成员均可 POST/PATCH/DELETE**。代码注释称「未设门：由既有 writeAuth 把关」，而 `writeAuth` 对它们就是 `requireAuth` | `server/routes/resources/gates.js:39-41`、`server/routes/resources/index.js:54-56` |
| 4 | **活动写门是有意留白** | 活动写门已拒「非支委层」，但**支委层的既有功能位（宣传归档、议程/结果编辑、状态更新）保持放行**——注释明确写「是否进一步收紧为『仅支书/副支书/党小组组长』列入待支书裁（避免误伤归档/议程链路）」 | `server/routes/resources/gates.js:83-97`（尤其 141-142 行） |
| 5 | **token 无过期 / 无刷新机制** | 会话表无过期时间字段；仅显式 logout 或账号流出时失效 | `server/db.js:45-49`、`server/routes/auth.js:74-77` |
| 6 | **口令是「全支部统一口令」** | 所有账号共用 `LOGIN_PASSWORD`（缺省 `123456`）；系统**没有个人密码**概念。「新增成员自动建号」也是用这个统一口令 | `server/routes/auth.js:15-18`、`content/04_web_design/data/DATA_MODEL.md:1043` |
| 7 | **无 CORS / 无限流 / 无 HTTPS** | 同 §5.5 第 3、4、6 条 | 同左 |
| 8 | **前端限权 ≠ 服务端限权（多处）** | 对比示例：前端 `ROLE_PERMISSIONS` 判定的 `record_attendance`、`fill_review`、`dispatch_line` 等键在**服务端并无对应校验**（服务端只做上表的粗粒度门）；反之服务端的支部级校验（`actor.branchId`）在前端 mock 形态无对应实现 | `docs/src/services/core/auth.js:76-84`（前端键集）vs `server/routes/resources/gates.js:24-67`（服务端门集） |

> **具体一例（前后端门不一致，后端须按服务端口径实现）**：独立档案页 `docs/person.html` 的 `EDIT_ROLES`（`docs/src/entries/pages/person-entry.js:76`）＝`secretary / deputy-secretary / org-commissioner`，即**前端对支书、副支书放开了「编辑档案」**；而它写档走 `PATCH /api/v1/members/:id/profile`，服务端该门**只要组织委员**（`server/routes/member.js:243`，`ORG_COMMISSIONER_ROLES`）。⇒ **API 形态下支书 / 副支书在成员档案页对治理外字段点「编辑档案」会被服务端 403**（组织委员身份正常）。**这是代码里的既有一处不一致**（真机发现并如实登记，非本文件笔误）。要收口只有两条路——**把该 PATCH 门放开支书 / 副支书**，或**反过来收窄前端 `EDIT_ROLES`**——两条都改权限面，**本文件不替裁**；**当前后端按服务端（仅组织委员可写）实现**。

### 7.2 功能「有定义但跑不到」类

| # | 项 | 现状 | 依据 |
|---|---|---|---|
| 9 | **系列活动（SeriesRecord）无实现** | 数据模型有完整字段定义，但**前端 mockDB 无该域、服务端无该表、无任何读写入口** | `content/04_web_design/data/DATA_MODEL.md:269-291`（定义）；`docs/src/core/domain/domain.js:215-333`（mockDB 全部域，**无 series 键**）；`server/db.js:9-41`（34 张资源表，无 series） |
| 10 | **`timeOffset: null` 的任务永不实例化** | `sopData.js` 中确有 **6 条**任务的 `timeOffset` 为 `null`（组织类场景：`attendance-check` 2 条 + `feedback-handling` 4 条）；而**两个消费口都显式过滤掉 null**：（a）SOP 推演 `instantiateSOP` 里 `if (task.timeOffset === null) return;`；（b）决策树时间轴展示 `scenario.tasks.filter(t => t.timeOffset !== null)`。⇒ 这 6 条任务**在系统内不会被实例化为任务/待办** | `docs/src/workflow/sopData.js:95-96,103-106`（6 处 `timeOffset: null`）、`docs/src/workflow/sop.js:20`、`docs/src/services/activity/decision-tree.js:243` |
| 11 | **`outputBlocks.blockOrder` 无 UI 写入口** | 产出块的排序能力（纯函数侧）存在，但**没有界面可写**——原设计的拖拽排序画布已撤销。「能力在、入口无」。⚠ **两点澄清**：① 向导保存**不再**恒写空数组（否则会静默抹掉已按其它入口设过的顺序）；② **工作流块**的顺序**已有** UI 写入口（向导第②步 ▲▼）——本行的「无写入口」只指 `outputBlocks` | `content/04_web_design/data/DATA_MODEL.md:949`（原文标注） |
| 12 | **活动字段 `deliverableIds` 已废弃** | 字段仍在模型中（标注为废弃），交付物实际由「文件空间记录」覆盖 | `content/04_web_design/data/DATA_MODEL.md:50` |
| 13 | **归档材料 `url` 字段当前恒为 null** | 模型写明「阶段 2 后端支持时填充，mock 阶段为 null」 | `content/04_web_design/data/DATA_MODEL.md:877` |
| 14 | **邮件通道实际不会发出任何邮件** | 三重原因叠加：① 收件人从成员档案 `email` 读取，而**示例数据无该字段**；② 需 `MAIL_ENABLED=true` 且 `SMTP_*` 齐备；③ 即便发出，也只覆盖「通知发布 / 待办提醒 / 汇报」三类触发点，受众解析**只实现了 activity 定向与全体两种**（党小组/角色定向统一按全体处理） | `server/services/mailer.js:93-106`、`server/services/mailer-hooks.js:19-37` |
| 15 | **`handoffs`（三委数据交接记录）：服务端已有表** | 前端 mockDB 有 `handoffs` 域；**服务端现有同名表 `handoffs`**（语义端点组 = `server/db.js::SEMANTIC_TABLES`，写读口见 §6 末「语义端点」段）⇒ API 形态下该域**已落库**，且 `init()` 会拉取填充 | `docs/src/core/domain/domain.js:266`、`server/db.js:152-159`（`SEMANTIC_TABLES`）、`server/routes/resources/semantic-routes.js:153-192`（handoffs 三端点：列表 / 发起 / 接收确认） |
| 16 | **`pendingMemberConfirmations`：服务端已有表** | 前端 mockDB 数组承载内存读链；**服务端现有表 `member_confirmations`**（语义端点组 = `server/db.js::SEMANTIC_TABLES`）⇒ API 形态下该队列**已落库**、清浏览器缓存不丢（写读口见 §6 末「语义端点」段）；浏览器 localStorage 键 `gsm1921-member-confirmations` 仍作 mock 形态的持久化通道，两形态并存 | `docs/src/core/domain/domain.js:324-332`（`pendingMemberConfirmations`）、`server/db.js:152-159`、`server/routes/resources/semantic-routes.js:196-233`（入队 / 支书决策两端点） |
| 17 | **「副组长」身份已落地** | 制度文本规定「每个党小组设 1 名组长 + 1-2 名副组长，副组长可共享同组组长工作台的相关内容」；系统已把 `deputy-leader` 落成**可与组长区分的第二个身份**——**同页同台、同权限集，任务优先给组长、不硬切分正副职责**；**2026-10-04 批次 373 起支书台「党小组」清单行内可赋权 / 撤销副组长（与组长同列双身份）** | `content/02_institution/SYSTEM_ROLE_PERMISSION.md:46`、`content/02_institution/sop/支委与党小组定人定责定岗说明.md:40`、`content/02_institution/sop/党小组组长工作手册.md:46-48`；载体名单（`docs/` 内「副组长」命中集，2026-10-04 批次 373 因副组长赋权 UI / 文档落地扩至十处）见 `server/test/doc-line-ref.test.mjs:268-275` |
| 18 | **`party-staff` 无可见性配置** | 「谁能看谁」（`ROLE_VISIBILITY`）表中**没有 `party-staff` 键** ⇒ 该角色的可见目标投影恒为空 | `docs/src/services/core/visibility.js:48-56`、`:99-101` |

### 7.3 未接入 / 无代码类（规划中）

| # | 项 | 现状 | 依据 |
|---|---|---|---|
| 19 | 北大党校系统（培训进度等）只读同步 | **规划（M0-M2），无代码** | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:81` |
| 20 | 北大智慧党建平台（党旗飘飘）双向协同 | **规划（M0-M4），无代码**；设计稿为待确认稿（七项实施口径未定） | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:82`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:879`（§6.9 待确认清单） |
| 21 | 微信小程序（移动端协同） | **规划阶段、无代码**（设计文档本身状态为 `active`，即设计有效、实现未开始） | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:48`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:7` |
| 22 | AI 本地推理（经验提炼 / 通知智能路由 / 活动建议） | **规划，无代码**；部署文档里写的 `AI_API_BASE_URL` 在代码中**检索不到消费点（未取证）** | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:217-240` |
| 23 | 北大 IAAA 单点登录 | **未接入**：当前登录落点是本地 `login.html`；门控层已把 IAAA 预留为「换登录落点、不改门控条件」 | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:454`、`DEPLOYMENT_GUIDE.md:215` |
| 24 | API 形态下的「一键重置」 | 前端 `?reset=` 三档**只在无 token 的 mock 形态生效**；API 形态没有对应接口，重置需运维手工删 `data.db` | `server/README.md:19` |
| 25 | 数据模型文档与部署文档的表数口径过期 | **已对齐**：部署文档原写「32 资源表」，现与代码一致为 **34 张**——后端按 **34 张**实现 | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:100,158,178,257,962` vs `server/db.js:9-41` |

> **另有一处需要说明的「未取证」**：`server/test/` 下的测试套件规模（文件数/断言数）本文件不写具体数字——它随开发持续增长，`server/README.md:37` 明确「本文件不维护固定计数，以 `server/test/` 实际目录为准」。

---

## §8 权威源与自我约束

> 本文**每一节都在节末给出「依据：文件:行号」**。本节只列**权威源**（「谁是谁的唯一源」），便于后端按图索骥；**逐文件索引不另维护**——要查某文件在本文何处被引用，直接在全文检索该文件名即可。

### 8.1 设计与制度文档（`content/`）与根说明

| 文件 | 作用 | 本文引用处 |
|---|---|---|
| `content/04_web_design/data/DATA_MODEL.md` | **静态数据模型唯一权威源**（§2.1–§2.29 字段表，即本文 §4 的来源 A） | §4 全节 |
| `content/02_institution/SYSTEM_ROLE_PERMISSION.md` | **系统角色权限矩阵（代码键级权威）**：§9a0 角色键全表、§9a–§9l 各矩阵与裁定 | §2 全节、§7.2#17 |
| `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` | **部署与对外对接（部署路径唯一权威源）**：就绪度、对接前置、邮件与上报、认证与登录门控、微信协同与小程序、北大党校/智慧党建对接 | §1、§5、§7.3 |
| `content/04_web_design/README.md` | 设计层索引与「权威源速查」（含各文件状态语义） | §7.3 |
| `content/README.md` | 内容中心 5 类知识类型与「母本→子本」关系 | §1.2 |
| `README.md`（根） | 系统定位、功能地图、关键机制、替换入口总表、开发纪律 | §1、§3.4、§5.6 |
| `README-members.md` | 成员视角的角色工作台一览（与代码口径互校） | §3.2、§3.3 |
| `.ctx/` 目录 | 过程记录（执行/决策日志、快照、审查队列）——**审计底座，本文未据其断言现状** | — |

### 8.2 本文的自我约束（如实声明）

1. **不做无出处的断言**：本文所有「现状」均给出 `文件:行号`；凡证据不足者写明「未取证」（§5.1 编译工具、§5.3 `AI_API_BASE_URL`、§7.3#22）。
2. **不合并冲突口径**：文档与代码不一致处**并列呈现**。此前并列过的两例——部署文档「32 资源表」对代码 35 张、部署文档「Node 18+」对根说明 ≥ 22——**已把文档侧改准、不再并列**；**新发现的冲突仍按本条并列登记于 §7.3**。
3. **区分「制度要求」与「系统实际」**：如「副组长」（§7.2#17）、「系列活动」（§7.2#9）、「数据交接」（§7.2#15）。
4. **本文档为说明件，不是契约**：接口与字段的最终判定以**代码与测试**为准（守卫见 `server/test/doc-consistency.test.mjs`、`server/test/link-integrity.test.mjs`、`server/test/catalog-sync.test.mjs`）。**字段级清单的唯一权威源是母本 `content/04_web_design/data/DATA_MODEL.md`**——§4 只作**指针 ＋ 后端增量**（§4.0：服务端专有表 ＋ 来源 C 字段 ＋ 行为口径）。

---

## 附：北大 IAAA 统一身份认证入站端点（**尚未与计算中心联调**）

> ⚠ **本节置于文末、且不进 §6 编号**：目的是**不动任何既有行号**——本文件被 `doc-line-ref` 守卫按 `文件:行号` 取证，
> 在中间插节会让其后**所有**引用失效。待与计算中心接口对齐后，再连同 `§6 数量口径` 一并整理进 §6。

**口径**（支书逐字）：「这个系统，**如果有该人，就登录进去**，**如果没有这个人，那就要自动创建这个人的号**，
并且**进入 选择支部**，然后**由支部 予以确认**！！」

| 方法 | 路径 | 门 | 说明 |
|---|---|---|---|
| GET | `/api/v1/auth/iaaa/login` | 公开 | 302 到 IAAA 授权页；**未配置 `IAAA_APP_ID` / `IAAA_REDIRECT_URI` ⇒ 503 ＋ 可懂原因**；`IAAA_MOCK=1` ⇒ 造一条回调（本地端到端联调用） |
| GET | `/api/v1/auth/iaaa/callback?token=…` | 公开（IAAA 回调） | 用凭证换「学号 ＋ 姓名」→ **有号则登录** ／ **无号则自动建号**（`role:'participant'`、**`branchId: null`**）→ 建会话。`?mode=json`（或 `Accept: application/json`）⇒ 返回 JSON；否则 302 到 `/login.html#iaaa=<会话 token>`（走 hash：不进服务端日志、不被 Referer 带出） |
| POST | `/api/v1/auth/iaaa/bind-branch` | 本人（须已登录且 `branchId === null`） | **选支部**：写 `joinIntent`；⚠ **此刻仍不落 `branchId`** —— **选 ≠ 归属** |
| GET | `/api/v1/auth/iaaa/pending` | **支书 / 副支书 / 组织委员** | **待确认入站清单**；非党委者**只看本支部**申请 |
| POST | `/api/v1/auth/iaaa/pending/:personId/approve` | 同上 | **支部确认**：落 `branchId` ＋ 清意向 ＋ 留痕 |
| POST | `/api/v1/auth/iaaa/pending/:personId/reject` | 同上 | 驳回：清意向、**保持未归属**（可重选）＋ 留痕 |

**留痕**：复用既有 `auth_audit` 表（**不新增表**）——`action: 'join-approve' / 'join-reject'`、`scopeRef` ＝ 支部 id、
`authorizedBy` ＝ 确认人 id；行形状同 `server/routes/resources/semantic-routes.js::AUTH_AUDIT_KEYS`（单一源，不另造一套）。

**环境变量**：`IAAA_APP_ID` · `IAAA_REDIRECT_URI`（**须与计算中心登记的回调白名单一致**）· `IAAA_AUTH_URL`（缺省 `https://iaaa.pku.edu.cn/iaaa/oauth.jsp`）· `IAAA_VERIFY_URL`（缺省 `https://iaaa.pku.edu.cn/iaaa/oauthlogin.do`）· `IAAA_MOCK`（**仅联调，生产不设**）。

**⚠ 未完成（如实登记）**：① **尚未拿到计算中心的接口文档** ⇒ 「用凭证换学号/姓名」的解析口径（`server/routes/iaaa.js::_verifyWithIaaa()`，已同时兼容 JSON 与 XML）**待对齐**；② **前端承载面未做**——登录页「统一身份认证登录」按钮、「选支部」界面、「待确认入站」队列 UI；③ 端点级测试 = `server/test/iaaa-onboarding.test.mjs`（T1–T7，**7/7 绿**，含越权 403 与反例锁死）。

### 附 1：首启会「种」什么（空库自动建立 · **零成员名单**）

> 生产形态**默认不播演示种子**。空库若什么都不建 ⇒ **谁都登不进来、也没人能建支部**（`POST /branches` 的门是 `party-staff`）。故首启**任何形态都跑一次幂等**的最小组织基线（`server/seed-baseline.js`）：

- **党委账号 1 名**：角色 `party-staff`（党委组织员，组织级、`branchId: null`）；学号缺省 `9000000001`，可用 `BASELINE_PARTY_STAFF_ID` 指定。
- **支部 1 个**：**光华管理学院本科生党支部**（id `br-b1`；`config` 取空组织模板口径＝模块/块/分工全按默认；`secretaryId: null` ＝ 支书席位空缺待任命）。
- **其余业务表全空**。已有数据时**一律不覆盖**（幂等）。

**与「演示种子」的边界**：`server/seed.js::seedDatabase()` 是**演示种子**（50 人名单＋活动/考勤等，只用于本地测试与演示），仍只由 `DISABLE_SEED` / `APP_ENV` 控制；生产默认不播，**也不会打进发布包**。守卫：`server/test/seed-baseline.test.mjs`（B1–B3）。

### 附 2：**名单不出发布包**

`deploy/package.mjs` 默认对发布包做**三道处理 ＋ 两道断言**（任一断言非 0 即**拒绝出包**）：

1. **空壳化** `docs/src/data/mock/people.js`（演示名册）与 `accounts.js`（学号＋口令）——保留导出名，消费点不崩；
2. **消毒**：其余文本件里的姓名一律替换为占位（实测覆盖 `docs/help.html`、`server/seed.js`、`docs/data/*.json` 等）；
3. **断言**：路径黑名单 **0** 命中 ＋ 姓名/口令泄露 **0** 命中。

⇒ 发布包里**没有真名、没有学号、没有口令**。内部演示包可加 `--keep-mock`（打印警告）。与「`docs/src/data/mock/**` 人名保留、仓库源文件不动」的口径不冲突。

### 附 3：部署脚本一览（`deploy/`，随包分发）

| 文件 | 作用 |
|---|---|
| `package.mjs` | 白名单打包器（含上条三道处理 ＋ 两道断言）；默认不带 `node_modules`；`--with-deps` 连依赖一起打 |
| `doctor.mjs` | **部署自检 ＋ 小白引导**：Node 版本 / 文件位置 / 依赖 / 数据目录可写 / 生产必设环境变量 / IAAA 是否配置 / 服务是否在跑；**只读不改**，退码 0 或 1，末尾给「下一步三条命令」 |
| `smoke.mjs` | 冒烟：`/api/v1/health` → 登录 → 读本人；退出码当门（错口令判红） |
| `install.sh` / `install.ps1` | Linux / Windows 一键装（服务账号 · 依赖 · 环境文件 · systemd／计划任务 · 每日备份 · 冒烟） |
| `update.sh` | 一键更新：**先备份**（在线快照 ＋ 附件）→ 停服 → 换代码（**保留** `data.db`/`uploads`/`backups`）→ 起服 → 冒烟（不过则给回滚步骤） |
| `env.production.example` | 生产环境变量模板（含「必设 5 项」与 IAAA 五项） |
| `nginx.sample.conf` | 反代示例（⚠ 含 `location = /src/config/deploy.js` **必须单独放行到 Node**；请求体上限 ≥ 10m） |

包内还会自动生成 **`DEPLOY.md`**（三步部署 · 「包含什么」**由打包器现场数** · 常见故障 6 条）。

### 附 4：`GET /api/v1/setup/setup-status`（部署与对接自检）

- **门**：**仅 `party-staff`**（运维信息）；其余角色 403。
- **用途**：党委台「支部管理 → 支部配置」→「**部署与对接**」面板的数据源（只读状态 ＋ 可复制环境变量模板 ＋「还需要改什么」清单）。
- ⚠ **安全底线**：**只回答「有没有」，绝不回值**——不回 `LOGIN_PASSWORD`、不回 `appID`；唯一例外是 `LOGIN_PASSWORD_IS_DEFAULT`（是否仍是缺省 `123456`，不泄值但是最该提醒的一条）。守卫 `server/test/setup-status.test.mjs` 会**断言响应里不出现任何密钥实值**（S1–S6）。
