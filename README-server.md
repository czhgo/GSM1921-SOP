# README-server · 后端对接说明书（GSM1921-SOP）

> **本文是什么**：面向**外部后端对接团队**（学校计算中心 / 承建方 / 后续接手维护者）的**一站式说明书**——把系统的**背景、角色、功能板块、字段、部署、接口、已知限制**逐项讲清，不需要先读本仓其它文件就能看懂。
>
> **本文不是什么**：不是产品宣传页，也不是「未来规划书」。文中所有「现状」均可按文件名与行号回查（见文末 **§8 取证索引**）；凡取不到出处的，一律写明「未取证」，**不做推测性表述**。
>
> **读者须知（三个易混词）**：
> - **母本**：指制度文本（本仓 `content/` 目录下的支部制度与 SOP 文档）；系统是母本的「子本」——制度怎么写，系统就怎么跑。
> - **示例组织**：仓库自带的一份演示数据（某高校院系本科生党支部，50 名成员 + 1 名党委组织员），用于开箱即跑，**可整体替换**。
> - **mock / api 两种形态**：同一套前端代码，数据源可以在「浏览器本地假数据（mock）」与「后端接口（api）」之间切换，**界面零改动**。

**依据**：`server/README.md`（后端自述）、`README.md`（根说明）、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md`（部署与对外对接总案，唯一权威源）。

---

## 目录

| 节 | 内容 |
|---|---|
| §1 | 系统背景与当前阶段（这是一套什么系统、给谁用、和制度母本的关系、示例与真实部署的区别） |
| §2 | 角色（角色键全表 + 逐个角色说明 + 权限矩阵 + 服务端鉴权门） |
| §3 | 功能 / 板块（页面清单 + 全部工作台页签 + 设置中心 + 关键机制 + 支部分工模块目录） |
| §4 | 字段说明（**数据模型字段级清单**，逐实体逐字段） |
| §5 | 部署环节（依赖 / 环境变量 / 启动构建 / 存储 / 服务器侧注意 / 真实部署需替换项） |
| §6 | 接口一览（全部 HTTP 路由） |
| §7 | 已知限制与未实现项（如实列出） |
| §8 | 取证索引 |

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

**依据**：`README.md:3`、`README.md:199`（技术形态：原生 ESM、无打包器/无构建步骤）、`server/README.md:3`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:32-39`。

### 1.2 与「SOP 母本」的关系

- **制度文本是唯一母本**：`content/02_institution/` 及其 `sop/` 子目录是支部制度与工作规程的落点；改一处制度，系统行为随之调整（改文本在前、改代码在后）。
- **母本 → 子本（系统）**：所有系统逻辑、数据模型、界面行为都要求从母本推导（`content/README.md:24` 引 `CLAUDE.md` H30.2）。
- **制度参数（可调 vs 固定）**：并非所有制度数字都写死在代码里。系统把「一件事在几天内办完」这类**过程时限**归为**支部可调的制度参数**，默认值取母本所写的数字；而「考察意见每半年一次」等属**制度固定**项，所有支部一致。数据单一源＝`docs/src/core/policy-defaults.js`（逐项标注 `branch-default`＝支部可调 / `institutional`＝制度固定须支书裁决）。

**依据**：`content/README.md:24`；`content/02_institution/SYSTEM_ROLE_PERMISSION.md:196-229`（§9l 可调口径）；`docs/src/core/policy-defaults.js:1-15`（kind 标注说明）。

### 1.3 当前处于什么阶段（**示例/演示 与 真实部署的区别**）

> 这一节请务必读完——**仓库自带的是「示例组织」的演示数据，不是真实账本**。

| 维度 | 示例 / 演示形态（仓库默认） | 真实部署形态（正式使用） |
|---|---|---|
| 人员数据 | 仓库自带**示例支部 50 名成员 + 1 名党委组织员**（`docs/src/mock/people.js`，id 为 `p1`…`p50`、`p_pc`） | 换成**本组织真实成员** |
| 账号 | 演示账号表 `docs/src/mock/accounts.js`（学号 + 口令 `123456`），**明确写着「模拟 IAAA 校验」** | 对接学校统一身份认证（IAAA 为登录落点的最终目标，**尚未接入**） |
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

**依据**：`docs/src/mock/accounts.js:1`（「Mock 登录账号（模拟 IAAA 校验）」）、`docs/src/mock/people.js:66`、`docs/src/mock/branches.js`（支部种子 `br-b1`）、`server/README.md:17-19`、`README.md:76-79`、`README.md:180`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:47-54`（就绪度表）、`content/04_web_design/deploy/AUTHENTICATION_MODEL.md:75`（IAAA 为后续目标）。

---

## §2 角色

> 本节分四层：**2.1 角色键全表**（代码枚举，共 13 键）→ **2.2 逐个角色说明**（身份 / 能做什么 / 不能做什么 / 审批位 / 特例）→ **2.3 权限矩阵**（键级，取自代码）→ **2.4 服务端鉴权门**（接口侧实际把门在哪一层）。
>
> **⚠ 给后端的关键提醒**：系统里有两套并行的「身份」概念，**不要混成一张表**——
> - **`role`（角色键）**：决定登录到哪个工作台、能写什么。全表见 2.1。
> - **`developStage`（发展阶段）**：`积极分子 / 发展对象 / 预备党员 / 正式党员` 四档——**这是成员档案上的字段，不是角色键**。这四种人的 `role` 通常都是 `participant`（普通参与者），差别体现在考勤应到口径、表决名单与通知受众上。请勿把「预备党员」「发展对象」当成角色键去查权限表。

### 2.1 角色键全表（13 键 = 10 业务键 + 3 遗留键）

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
| 11 | `commissioner` | 条条委员 | 遗留键 | — | **不参与权限判定**，仅兼容兜底 |
| 12 | `initiator` | 发起人 | 遗留键 | — | 同上 |
| 13 | `all` | 全体相关 | 遗留键 | — | 同上 |

**依据**：`docs/src/core/constants.js:185-191`（`ROLE_KEYS`）、`:192`（`ROLE_LEGACY_KEYS`）、`:288-302`（`ROLE_LABELS`）、`:306-318`（`ROLE_PAGE_MAP`）；`content/02_institution/SYSTEM_ROLE_PERMISSION.md:24-38`（§9a0 角色键全表）。

**两点易错约定**：
- **「访客」不是角色**：未登录即访客（无角色键）。`visitor.html` 里的 `visitor` 只是**页面/页签前缀**，与「未登录访客」不是一回事。
- **`party-staff` 不属于任何支部**：示例种子中它的 `branchId` 为 `null`。

**依据**：`content/02_institution/SYSTEM_ROLE_PERMISSION.md:41`、`docs/src/mock/people.js:66`（`p_pc`：`role:'party-staff'`、`branchId: null`）。

**第三个页面（非工作台）的支委门（2026-09-20 批次 105 / `D-526`）**：`docs/party-committee-meeting.html`（支委会会议页）**不是角色工作台**，无独立角色键——它的进页门 = 「登录人是否在本支部支委名单内」，名单与线上表决「应到名单」**同一单一源**：`docs/src/services/vote-config.js::resolveVoterIds('committee')`（`people.js` role + `AuthStore.isCommissioner`，排除 `u_*`，即支书 / 副支书 / 组织委员 / 宣传委员 / 纪检委员）。对应地：

| 角色键 | 能否进会议页 | 页内能做什么 | 服务端写口（既有门，本批未放宽） |
|---|---|---|---|
| `secretary` / `deputy-secretary` | 能 | 建/选线上支委会、提取议程、汇总、**截止**、记录讨论结果 | 建/改活动 → 支委层活动写门；截止 → `POST /api/v1/agenda-votes/lock`（`SECRETARY_AND_DEPUTY_ROLES`，非此二者 403 `无权限`） |
| `org-commissioner` / `prop-commissioner` / `disc-commissioner` | 能 | 就议程表态（同意 / 异议 / 附言）、查看汇总与讨论结果 | 表态 → `POST /api/v1/agenda-votes`（须在活动 `voteConfig.voterIds` 内） |
| `leader` / `participant` / 其它 | **不能** | 页面只呈现「本页仅支委可用」，不渲染会议数据与任何操作 | 表态 403 `不在本次表决名单`；截止 403 `无权限` |

**依据**：`docs/src/entries/party-committee-meeting-entry.js`（页面自检）、`docs/src/services/vote-config.js:54-67`（名单单一源）、`server/routes/committee.js:56-92`（表态门）、`:161-177`（截止门）、`server/routes/resources.js`（活动写门）。

### 2.2 逐个角色说明

> 「权限键」取自代码 `ROLE_PERMISSIONS`（实际被判定的键集）。**注意**：制度文档里的权限矩阵带有中文限定语（如「Y(审阅)」「Y(建档)」），那些**限定语不是权限键**，它们靠各写入口的业务守卫实现（例如「组长可上传本组考勤」由 `docs/src/services/attendance.js::canUploadAttendance` 判定，而不是靠一个 `record_attendance` 键）。

#### 2.2.1 `secretary` 支书

| 项 | 内容 |
|---|---|
| 支部身份 | 支部第一责任人，主持支部全面工作；示例组织中为 `p13` |
| 工作台 | `secretary.html`（与副支书共台） |
| 权限键 | `view_all`、`create_activity`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_inspection`、`manage_taskforce`、`initiate_taskforce`、`authorize_taskforce`、`authorize`、`archive`、`manage_members` + 意见反馈**基础键 7 个**（`issue.view` / `issue.create` / `issue.comment.add` / `issue.reaction.toggle` / `issue.mention` / `issue.reference` / `issue.edit.own`）+ **支书专属键 8 个**（`issue.status.change` / `issue.close` / `issue.comment.hide` / `issue.edit.others` / `issue.milestone.manage` / `issue.assignee.set` / `issue.drafts.merge` / `issue.drafts.reject`） |
| 不能做什么 | 不持 `record_attendance`（不直接记考勤）、不持 `summarize_inspection`（不汇总考察）、不持 `assign_project_role`（项目角色赋权走组长/组织者链） |
| 审批位 | ① 成员变更申请**确认**（组织委员审批后由支书确认生效）；② 支部**上报党委**的发起方；③ 意见反馈**处置**（指派/关闭/重开/隐藏/合并/里程碑）**为支书独有**（副支书不含） |
| 特例 / 边界 | ① **看不到匿名反馈的真实提交人**——「处置」与「查看真身」是两项分开的权限（真身仅党委可查）；② 支部 config 全量可写，但**不含支部官方名 `name`**（仅 `party-staff` 可改）；③ 党小组管理（新增/改名/解散/归组）仅支书（含副支书）；④ 进宣传工作台只放行「档案归档」页（代归档兜底），不获得其它页签 |
| 依据 | `docs/src/services/auth.js:77`、`:68-75`、`docs/src/core/constants.js:198-200`（`BRANCH_COMMISSION_ROLES`）、`docs/src/core/constants.js:327-333`（归档兜底）、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:165-178`（§9j）、`server/routes/resources.js:77-89`（党小组门） |

#### 2.2.2 `deputy-secretary` 副支书

| 项 | 内容 |
|---|---|
| 支部身份 | 与支书**同页共台**（`secretary.html`）；示例组织中为 `p14` |
| 权限键 | 与支书**完全一致，唯独不含意见反馈的 8 个支书专属键**（即：只有 7 个基础键） |
| 副书同权范围（制度与代码均已确认） | 成员变更确认、在册状态镜像、发展阶段推进、移出/撤销流出确认、议程结果区与编辑议程、支部 config（modules/blocks/workforce/组织档案/域参数全量）、线上表决截止、党小组管理、成员流动登记 |
| 不能做什么 | ① 意见反馈处置（关闭/指派/隐藏/合并/里程碑/草稿终审）——**这是支书独有**；② 改支部官方名 `name`；③ 不持 `record_attendance` / `summarize_inspection` / `assign_project_role` |
| 特例 | 代码里「副书同权」实现为常量 `SECRETARY_AND_DEPUTY_ROLES = ['secretary','deputy-secretary']`，被成员变更确认、党小组管理、表决截止等多处写门引用 |
| 依据 | `docs/src/services/auth.js:78`、`docs/src/core/constants.js:204`、`server/routes/member.js:125`、`server/routes/committee.js:161`、`server/routes/resources.js:74,116` |

#### 2.2.3 `org-commissioner` 组织委员

| 项 | 内容 |
|---|---|
| 支部身份 | 组织条线负责人（名册、成员发展、思想汇报、专班统筹）；示例组织中为 `p11` |
| 权限键 | `view_all`、`record_inspection`、`manage_taskforce`、`initiate_taskforce`、`authorize_taskforce`、`archive`、`dispatch_line` + 意见反馈基础键 7 个 |
| 不能做什么 | 不持 `create_activity`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_attendance`、`summarize_inspection`、`authorize`、`manage_members`（**不能设/取消组长**）；不能增减党小组（只能看清单与未分组人数） |
| 审批位 | ① 成员变更申请**审批**（`POST /api/v1/member-change-requests/:id/approve`，**组织委员专属**）；② 思想汇报**打回**（事后反馈，须附意见；提交即入库，不需要审批归档）；③ 名册**新增成员**与**档案行内编辑**（专属写门）；④ 成员流动（流入/流出）登记 |
| 特例 | 域参数：可改**本域** `policyOverrides.memberConfirmation`（学期末滞留集中复核窗口） |
| 依据 | `docs/src/services/auth.js:79`、`server/routes/member.js:91,230,280`、`server/routes/resources.js:473-476`、`server/system-notice-kinds.js:106-111`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:150-163`（§9i） |

#### 2.2.4 `prop-commissioner` 宣传委员

| 项 | 内容 |
|---|---|
| 支部身份 | 宣传条线负责人（宣传任务、素材归档、周报）；示例组织中为 `p12` |
| 权限键 | `view_all`、`manage_taskforce`、`initiate_taskforce`、`archive`、`dispatch_line` + 意见反馈基础键 7 个 |
| 不能做什么 | **不能创建活动**（不持 `create_activity`）——制度原话是「宣传委员不可创建活动，但任何活动创建后应自动出现在宣传委员的视图中」；不持考勤/考察相关键；不持 `authorize*`（不赋权） |
| 职责位（在其工作台） | 宣传任务、项目看板、周报报送、档案归档（含上传宣传材料、删除记录时联动删物理文件） |
| 特例 | 通知**发布**权在宣传委员（发布角色集＝支委层除纪检）；通知**编辑/删除**（管理位）＝支委层全体（含纪检） |
| 依据 | `docs/src/services/auth.js:80`、`content/04_web_design/data/DATA_MODEL.md:222`、`docs/src/core/constants.js:259-260`、`server/routes/resources.js:84` |

#### 2.2.5 `disc-commissioner` 纪检委员

| 项 | 内容 |
|---|---|
| 支部身份 | 纪律与考勤考察监督条线；示例组织中为 `p10` |
| 权限键 | `view_all`、`record_attendance`（**唯一持有该键的常设角色**）、`summarize_inspection`、`record_inspection`、`manage_taskforce`、`initiate_taskforce`、`dispatch_line` + 意见反馈基础键 7 个 |
| 不能做什么 | 不持 `create_activity`、`fill_review`（**除非其本人是该活动的组织者**，否则只收「监督组织者复盘」的审批待办）、`authorize*`、`assign_project_role`、`manage_members` |
| 审批位 | ① 考勤**确认**（确认后缺勤自动派生补课任务）；② 考察**确认**（确认后录入考察档案）；③ 复盘**批注 / 打回 / 确认**；④ 通知**管理位**（编辑/删除，但不含发布） |
| 特例 | ① 域参数：可改本域 `policyOverrides.inspection`（考察超期天数）；② 可见性投影与其他角色不同——其数据权限是「全员 × 考勤/考察」，**不含在办与汇报**（避免知情过载） |
| 依据 | `docs/src/services/auth.js:81`、`docs/src/core/constants.js:259-260`、`docs/src/services/visibility.js:52`、`server/routes/resources.js:473-476` |

#### 2.2.6 `leader` 党小组组长

| 项 | 内容 |
|---|---|
| 支部身份 | 党小组（支部下的最小活动单元）负责人；示例组织有三组组长 |
| 权限键 | `view_all`、`create_activity`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_inspection`、`assign_project_role` + 意见反馈基础键 7 个 |
| 不能做什么 | 不持 `record_attendance`（**系统里「上传考勤」不是组长权限键**，而是「谁在这件事上是组织者/记录人」派生的业务守卫）；不持 `manage_taskforce` / `initiate_taskforce` / `authorize` / `authorize_taskforce` / `archive` / `manage_members` |
| 写活动范围 | 组长**只能**创建/修改**「党小组会」「主题党日」**两类活动；服务端写门按活动类型判定，越界返回 403 |
| 可见范围 | 「块块」口径——只看**本党小组组员**（维度含在办/卡点/汇报/考勤/考察） |
| 特例 | 赋权链：组长可赋权**项目角色** organizer/deep（`assign_project_role`） |
| 依据 | `docs/src/services/auth.js:82`、`server/routes/resources.js:143-150`、`docs/src/services/visibility.js:53`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:93` |

#### 2.2.7 `participant` 普通参与者（含普通党员 / 预备党员 / 发展对象 / 积极分子）

| 项 | 内容 |
|---|---|
| 支部身份 | 默认身份；**「预备党员 / 正式党员 / 发展对象 / 积极分子」是 `developStage` 字段的取值，不是角色键**——他们的系统角色仍是 `participant` |
| 工作台 | `visitor.html`（成员工作台） |
| 权限键 | `view_public` + 意见反馈基础键 7 个 |
| 能做什么 | 看公开/本人相关视图；提交意见反馈与评论、表态、提及/引用、编辑自己提交的内容；提交思想汇报；提交本人复盘（组织者/深度参与者身份时）；报名活动/专班 |
| 不能做什么 | 任何「记录类」写入（考勤、考察、复盘批注、名册、通知发布、活动创建…）一律不可 |
| 特例 | 不持 `record_inspection`——本人素材走**活动参与记录**（2026-09-05 收敛，制度矩阵 §9d 该键已改 `--`） |
| 依据 | `docs/src/services/auth.js:83`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:79-83`（§9d）、`docs/src/core/constants.js:231`（`DEVELOP_STAGES`） |

#### 2.2.8 `party-staff` 党委组织员（组织级）

| 项 | 内容 |
|---|---|
| 身份 | 院系党委的组织员／党务老师；**不属于任一支部**（示例种子 `branchId: null`），**不参与支部内部活动闭环** |
| 工作台 | `party-committee.html`（党委工作台），登录直达 |
| 权限与职责 | ① 支部**实例管理**（增改、空模板创建/复制创建、**只有它可改支部官方名 `name`**）；② 支书**任命/撤换**（写任期档案 + 同步双方 `users.role` + 写 `branches.secretaryId`）；③ 支部**上报审批**（逐项批准/驳回，驳回须意见）；④ **下发通知**（送达目标支部支委层）；⑤ 支部**配置**（modules/blocks/workforce/组织档案/域参数，全支部）；⑥ `users` / `branches` / `appointmentRecords` 的资源级写权限**仅此角色** |
| 唯一例外（2026-09-17 支书改裁） | 党委**保留对匿名意见反馈的核查权**——`GET /api/v1/issues/reveal` 可查看匿名反馈**真实提交人**，且**每次查看写一条留痕**（`issue_reveals` 表）。这是「不参与支部内部事务」的唯一例外 |
| 特例 | 制度权限矩阵 §9b（支部 6 角色）与 §9c（项目 2 角色）**都不含它**——它是组织级角色，不进支部矩阵。另外：可见性配置表 `ROLE_VISIBILITY` 中没有它，因此「谁能看谁」的投影对它返回空 |
| 依据 | `docs/src/services/auth.js:90-106`、`server/routes/resources.js:78-80,325-383`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:43,165-178`、`docs/src/services/visibility.js:47-55`（无 party-staff 键）、`server/routes/resources.js:700-721`、`server/db.js:41` |

#### 2.2.9 `organizer` 组织者（项目角色）

| 项 | 内容 |
|---|---|
| 身份 | **不是常设职务**——某人被指定为**某一次活动/某个专班**的组织者时，才在该项目内获得此身份 |
| 页面 | 无独立工作台（在成员工作台内体现，`visitor.html`） |
| 权限键 | `view_project`、`assign_task`、`modify_assignment`、`mark_complete`、`fill_review`、`record_inspection`、`assign_project_role` |
| 生效条件 | **仅在带项目上下文时生效**（判定函数传入 `projectId`）；脱离项目的普通调用不生效 |
| 能做什么 | 在**该项目内**派任务、改分工、标完成、填复盘、导入考察、赋权深度参与者 |
| 不能做什么 | 不获得项目之外的任何权限；不改支部级配置 |
| 任务 | **同一项目内，组织者与深度参与者各持「自己的那份任务」**——不是同一份任务清单发给两个人。主口径是「**我的任务**」（分类依据＝「我」），「**项目分工**」是同一事实的转置（分类依据＝「项目」），**一体两面、允许视图切换**——**同一份事实、两种切法，不是两套数据**。组织者那份含**「分配工作给深度参与者」并逐项选择是否系统内完成**、改分工、打包提交与上传；深度参与者那份是宣传产出、材料整理一类**不含上传**的活——**系统内完成的产出由系统在后台同步**，深度参与者未闭环的**由组织者优先推动闭环**（口径见母本 `content/02_institution/sop/常见工作场景快速指南.md`，与 `SOP-B-17`「组织者＝信息流与任务流」· `SOP-B-10`「以人为第一列」· `SOP-A-5`「上传只认组织者」相接）。**现状：系统已按项目内身份给任务**（成员台「项目分工 → 我的任务」按项目内身份读取；2026-09-19 批次 93 落地，裁定 `D-500`；尚余「深参那份由组织者分配」未做，见 `.ctx/REVIEW_QUEUE.md` `SOP-B-31`） |
| 依据 | `docs/src/services/auth.js:90-93`、`:474-493`（`canDo` 项目上下文并集判定）、`content/04_web_design/data/DATA_MODEL.md:169-181`（参与人双入口边界：**勾参与人 ≠ 赋项目角色**） |

#### 2.2.10 `deep` 深度参与者（项目角色）

| 项 | 内容 |
|---|---|
| 身份 | 同上，项目内身份 |
| 权限键 | `view_project`、`mark_complete`（仅两项） |
| 能做什么 | 看被赋权的项目、标记完成 |
| 不能做什么 | 不能派任务、改分工、填复盘、导入考察、再赋权 |
| 任务 | **任务由组织者分配（逐项标注是否在系统内完成）；系统内的产出由系统在后台同步，系统外的线下完成由组织者确认；未闭环的由组织者优先推动闭环**——深参那份**不含上传 / 打包 / 派任务**类动作（口径见母本 `content/02_institution/sop/常见工作场景快速指南.md`，与 `SOP-A-5`「上传只认组织者」相接）。**现状：已按项目内身份给任务（成员台「我的任务」）；「由组织者分配」尚未做**（2026-09-19 批次 93 落地，裁定 `D-500`；轨迹见 `.ctx/REVIEW_QUEUE.md` `SOP-B-31`） |
| 依据 | `docs/src/services/auth.js:92`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:74-77`（§9c） |

#### 2.2.11 三个遗留键（`commissioner` / `initiator` / `all`）

| 键 | 中文 | 说明 |
|---|---|---|
| `commissioner` | 条条委员 | **遗留键，无独立角色语义**，仅保留兼容；`ROLE_PERMISSIONS` 中没有它 → 不参与权限判定 |
| `initiator` | 发起人 | 同上 |
| `all` | 全体相关 | 遗留兜底键；在 SOP 场景任务的 `executor` 字段里表示「全员参与」，但**不是登录角色** |

**依据**：`docs/src/core/constants.js:192`、`:301`；SOP 场景中 `executor: 'all'` 见 `docs/src/workflow/sopData.js:18`。

> ⚠ **注意区分两组同名集合**（后端实现权限时极易踩坑）：
> - **授权语义**（含支书/副支书）＝ `BRANCH_COMMISSION_ROLES`（5 个键）：服务端 `requireCommissioner` 与前端「是否支委」判定用它。
> - **业务语义「条条委员」**（三委员，**不含**支书/副支书）＝ `COMMISSIONER_ROLES`（`commissioner`/`org-commissioner`/`prop-commissioner`/`disc-commissioner`）。
>
> **依据**：`docs/src/core/constants.js:198-200`、`:348-350`、`server/routes/auth.js:92-97`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:42`。

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
| 意见反馈**支书专属键（8）** | **Y** | -- | -- | -- | -- | -- | -- |

**依据**：`docs/src/services/auth.js:68-84`（逐角色数组）、`:474-493`（`canDo`）。上表「Y/--」为**代码实际集合**；制度文档 §9b 的表格带中文限定语（审阅/建档/导入/汇总/配合等），两者**列的键集不同**（§9b 还有一列 `record_attendance` 等但带限定语），后端实现请以本节键集为准。

#### 2.3.2 赋权链（谁能赋权谁）

| 授权人 | 可赋权角色 | 授权语义 |
|---|---|---|
| 支书 / 副支书 | 党小组组长（常设） | `authorize` |
| 支书 / 副支书 + 组织委员 | 组织者 / 深度参与者（专班） | `authorize_taskforce` |
| 党小组组长 | 组织者 / 深度参与者（**项目**） | `assign_project_role` |
| 组织者 | 深度参与者（项目） | `assign_project_role` |

**依据**：`docs/src/services/auth.js:100-106`（`AUTHORIZE_CHAIN`）、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:85-94`（§9e）。

> **注意**：支委（支书/副支书/三委员）由配置预设，**不在系统赋权范围内**（代码注释原文）。

#### 2.3.3 写层业务守卫（不在权限键集里的写权）

以下写权**不通过权限键判定**，由各自写入口的角色门实现（后端实现时**必须逐个补上**，否则会出现「键矩阵全对、接口仍可越权」）：

| 写对象 | 允许角色 | 落点 |
|---|---|---|
| 支部 `config`（modules/blocks/workforce/组织档案/域参数） | 全量：`party-staff` / 本支部**现任支书** / 本支部**副支书**；域参数：纪检（`inspection` 节）、组织（`memberConfirmation` 节）、组长（`leader` 节） | `server/routes/resources.js:459-597` |
| 支部顶层治理字段（`name`/`type`/`secretaryId`/`status`） | **仅 `party-staff`** | `server/routes/resources.js:78-80` |
| 党小组管理（新增/改名/解散/归组） | 支书 + 副支书 | `server/routes/resources.js:86,116` |
| 成员流动登记（流入/流出/撤销） | 组织委员 + 支书 + 副支书 | `server/routes/resources.js:88,118`、`server/routes/member.js:281` |
| 名册新增（`POST /members`） | **仅组织委员** | `server/routes/member.js:280` |
| 成员档案行内编辑（`PATCH /members/:id/profile`） | 仅组织委员 | `server/routes/member.js:230` |
| 发展阶段推进 / 在册状态镜像 / 移出 / 撤销流出 | 支书 + 副支书（移出为「组织委员发起 或 支书/副支书确认」——代码实际角色集＝`org-commissioner` + 支书/副支书） | `server/routes/member.js:163,211,284,305` |
| 信息公开的实名/匿名与真身核查 | 见 §9j：处置＝支书，看真身＝仅 `party-staff` | `server/routes/resources.js:695-810` |
| 支部文件（`branchDocs`）资源写口 | 支委层（含支书/副支书） | `server/routes/resources.js:206` |
| 通知发布 / 通知管理 | 发布＝支委层除纪检；管理（编辑/删除）＝支委层全体 | `server/routes/resources.js:84` |

**依据**：上表逐行已在「落点」列给出文件行号。

### 2.4 服务端鉴权门（接口侧实际把门在哪一层）

| 门 | 含义 | 谁用 |
|---|---|---|
| （无门） | **完全公开**，不需要 token | `GET /api/v1/health`；`GET /api/v1/issues`（**唯一公开的资源读口**） |
| `requireAuth` | 需要有效 token（登录即可） | **30 个资源名的 `GET /<资源名>` 列表读**与 `GET /api/v1/bootstrap`（2026-09-18 批次 81 起）；绝大多数写口与 `/snapshot`、`/report/*`、`/leader/member-progress`、`GET /uploads/:name`（另＋支部隔离） |
| `requireCommissioner` | 支委层（支书/副支书/组织/宣传/纪检） | `branchDocs` 的通用写口；成员变更申请创建；**`POST /api/v1/uploads`**（2026-09-18 批次 80 起） |
| `requireRole(...)` | 指定角色集 | 成员变更审批/确认、名册语义端点、表决截止、意见反馈处置 |
| 资源写角色门（`RESOURCE_WRITE_GATE`） | 在 `requireAuth` 之后**再判角色** | `branches`/`users`/`appointmentRecords`→仅党委；`reviewRequests` POST→本支部支委层、PATCH/DELETE→党委；`notices` 发布/管理；`partyGroups`→支书；`memberFlows`→组织委员+支书/副支书 |
| 活动专门写门 | 非支委层一律拒；组长**仅限**「党小组会/主题党日」 | `POST/PATCH/DELETE /api/v1/activities*` |
| 正式表决计票写侧校验 | `optionSet='formal'` 时显式写 `ballotMode='named'` → 400 | `POST/PATCH /api/v1/activities` |

**依据**：`server/routes/resources.js:187-200`（逐表读口＝默认 requireAuth，白名单仅 `issues`）、`:77-120`（写门表）、`:136-150`（活动写门）、`:173-182`（计票方式）、`:416`（bootstrap）、`:695`（issues 公开读）、`server/routes/auth.js:57-96`（中间件）、`server/app.js:25`（health）。

> ⚠ **给后端的重要提示（2026-09-18 批次 81 更新）**：**「（无门）」只剩两个只读口**——`/api/v1/health` 与公开的意见反馈列表 `/api/v1/issues`（出口脱敏）。**30 个资源名的列表读与 `/bootstrap` 已改为需登录**；**2026-09-18 批次 81 之前它们是公开的**（旧版本文件记的就是那个状态，任意人能读到 `users`（含学号）、`activities`、`attendances` 等全部资源列表）。**仍未解决的是跨支部**：列表读是整表返回、支部过滤在前端（§7.1 第 2 条）。

---

## §3 功能 / 板块

### 3.1 页面清单（共 22 个静态页）

| 类型 | 页面文件 | 用途 | 登录门控 |
|---|---|---|---|
| 根页 | `docs/index.html` | 首页：匿名可见通知 / 日历 / 专班 / 活动概览 | 匿名可访 |
| | `docs/login.html` | 登录页（账号密码 / 演示账号卡片） | 公开 |
| | `docs/search.html` | 资料查询（含支部文件） | 需登录 |
| | `docs/feedback.html` | 意见反馈提交与浏览 | 需登录 |
| | `docs/archive.html` | 归档库 | 需登录 |
| | `docs/activity.html` | 活动与会议详情 | 需登录 |
| | `docs/party-committee-meeting.html` | 支委会会议页（线上召开：提取议程 / 委员线上表态 / 汇总截止 / 留存并查阅讨论结果） | 需登录 **且** 登录人须在本支部支委名单内（支书 / 副支书 / 组织委员 / 宣传委员 / 纪检委员）——不在名单者页面只呈现「本页仅支委可用」，不渲染任何会议数据与操作 |
| | `docs/taskforce.html` | 专班详情 | 需登录 |
| | `docs/notice.html` | 通知详情 | 需登录 |
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

**依据**：`docs/` 目录实况（15 个根 `.html` + `docs/workspace/` 7 个 `.html`）；门控四层模型见 `content/04_web_design/deploy/AUTHENTICATION_MODEL.md:64-75`（L1 工作台强制跳登录）。`party-committee-meeting.html` 的角色门为**页面内自检**（`docs/src/entries/party-committee-meeting-entry.js`，名单单一源 `docs/src/services/vote-config.js::resolveVoterIds('committee')`），服务端写口另有既有门（`server/routes/committee.js`）。

### 3.2 各工作台页签（共 67 个）

> 登记方式：每台由「能力注册表」声明页签清单（单一源 `docs/src/modules/capabilities/*-workspace.js`）。分组轴只有一套：**支部角色台＝工作台 / 我的职责 / 知情查看 / 制度与答复**；**党委台＝首页 / 全院治理 / 支部治理**。带 ★ 的为核心页签（固定显示、不可隐藏、不参与排序）。

#### 3.2.1 支书工作台（`secretary.html`，支书与副支书共台）— 12 个

| # | 页签（id / 名称） | 分组 | 谁用 | 做什么 |
|---|---|---|---|---|
| 1 | `today` / 今天 ★ | 工作台 | 支书·副支书 | 只读速览：今天有会 / 今天到期 / 今日分工，点击 ≤1 跳直达处理处 |
| 2 | `todo` / 待办 ★ | 工作台 | 同上 | 工作域折组（会务/活动项目/考勤纪律/考察/成员发展/专班/决议上报/归档宣传/汇报反馈），域内批量确认 |
| 3 | `overview` / 全局概况 ★ | 工作台 | 同上 | 按维度 / 按人两视图的全局汇报-卡点-在办总览 |
| 4 | `calendar` / 活动管理 | 我的职责 | 同上 | 会务日历；决策树引导式创建活动（含议程、表决配置写入面板） |
| 5 | `committee-meeting` / 支委会会议 | 我的职责 | 同上（页签入口）；支委（会议页内表态） | 线上召开支委会的入口与统计（场次 / 线上召开数 / 未截止数）；进独立页 `party-committee-meeting.html`：选线上召开 → 提取议程（专班报送 / 意见反馈）→ 支委在线表态 → 汇总截止 → 留存并查阅讨论结果（批次 105 / `D-526`） |
| 6 | `assign` / 赋权管理 | 我的职责 | 同上 | 项目角色与常设角色赋权（含党小组组长指派） |
| 7 | `notification` / 通知发布 | 我的职责 | 同上 | 发布通知、受众定向、催读 |
| 8 | `report-up` / 上报党委 | 我的职责 | 同上 | 向党委上报发展节点 / 活动报备，查看批复结论 |
| 9 | `group-progress` / 党小组 | 我的职责 | 同上 | 党小组清单 + 新增 / 改名 / 解散；未分组行内归组 |
| 10 | `tf-view` / 知情查看 | 知情查看 | 同上 | 活动 / 专班分段**只读**（知情权：无职责亦有知情权） |
| 11 | `work-map` / 支部分工 | 知情查看 | 同上 | 工作地图：平铺模块 / 按人 / 按项目三视图 |
| 12 | `feedback` / 反馈管理 | 制度与答复 | 同上 | 意见反馈处置（指派 / 关闭 / 隐藏 / 合并 / 里程碑 / 终审） |

#### 3.2.2 组织委员工作台（`org.html`）— 11 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1 | `today` / 今天 ★ | 工作台 | 同上（共享渲染器） |
| 2 | `todo` / 待办 ★ | 工作台 | 同上 |
| 3 | `overview` / 工作概况 ★ | 工作台 | 汇报 / 卡点 / 在办三区总览（含条线数据注入） |
| 4 | `inspection` / 考察上传 | 我的职责 | 上传/导入考察记录并建档 |
| 5 | `thought-review` / 思想汇报 | 我的职责 | 上半＝篇幅不足一览（少于 1200 字，逐条进阅读页看一眼，不影响提交）；下半＝台账宽表（人 × 期次） |
| 6 | `taskforce` / 专班管理 | 我的职责 | 专班发起、招募统筹、成员与工作量；报名总表（人 × 专班，可转置） |
| 7 | `roster` / 成员名册 | 我的职责 | 名册增删改 + 成员流动面板（流入/流出登记 + 台账 + 对账行） |
| 8 | `talent` / 人才库 | 我的职责 | 发展观察视图（只读画像） |
| 9 | `development` / 发展数据 | 我的职责 | 发展党员进程统计与档案 |
| 10 | `tf-view` / 知情查看 | 知情查看 | 活动 / 专班只读分段 |
| 11 | `my-dispatch` / 我的处置 | 制度与答复 | 意见反馈 / 汇报的收件处理位 |

#### 3.2.3 宣传委员工作台（`prop.html`）— 9 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前 |
| 4 | `tasks` / 宣传任务 | 我的职责 | 宣传任务台账与推进 |
| 5 | `kanban` / 项目看板 | 我的职责 | 项目（活动/专班）看板：活跃区 → 归档区 |
| 6 | `weekly` / 周报报送 | 我的职责 | 按周次新建草稿 + 报送（含报送历史）；**可按本周活动一键自动生成草稿**；报送即系统通知支书 / 副支书，进入**支书审核位**（通过 / 退回）；已报送行可「标记已上报智慧党建平台」（只留痕） |
| 7 | `archive` / 档案归档 | 我的职责 | 归档活动/专班、上传宣传材料（文件空间 / 图片记录）、删除时联动删物理文件 |
| 8 | `tf-view` / 知情查看 | 知情查看 | 活动 / 专班只读分段 |
| 9 | `my-dispatch` / 我的处置 | 制度与答复 | 同上 |

> **特例**：支书 / 副支书**可进入本工作台，但只呈现「档案归档」一个页签**（代归档兜底），不启用其它页签、不扩大任何写权限。

#### 3.2.4 纪检委员工作台（`disc.html`）— 8 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前 |
| 4 | `attendance` / 考勤管理 | 我的职责 | 考勤矩阵宽表 + 明细；考勤 / 补课分段（确认缺勤标因、生成补课任务） |
| 5 | `review` / 活动监督复盘 | 我的职责 | 活动与专班复盘：批注 / 打回 / 确认 |
| 6 | `inspection` / 考察管理 | 我的职责 | 考察宽表 + 明细确认（确认后录入考察档案） |
| 7 | `tf-view` / 知情查看 | 知情查看 | 活动 / 专班只读分段 |
| 8 | `my-dispatch` / 我的处置 | 制度与答复 | 同上 |

#### 3.2.5 党小组组长工作台（`leader.html`）— 9 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前 |
| 4 | `write` / 活动管理 | 我的职责 | 创建本组活动（**限「党小组会」「主题党日」**）、写产出记录 |
| 5 | `attendance` / 考勤上传 | 我的职责 | 上传本组活动考勤（追加提交；改/删走纪检确认流程） |
| 6 | `inspection` / 考察上传 | 我的职责 | 上传本组活动考察 |
| 7 | `members` / 组员进展 | 我的职责 | 本组组员进展：由**服务端汇总接口**返回（在办/超期/缺勤/考察待确认/汇报态） |
| 8 | `tf-view` / 知情查看 | 知情查看 | 活动 / 专班只读分段 |
| 9 | `my-dispatch` / 我的处置 | 制度与答复 | 同上 |

> **特例（组织者兜底入口，2026-09-19 批次 91 落地，裁定 `D-494`）**：**非组长**的人被指定为某场活动的组织者时，也可进入本台——但**只呈现「考勤上传」「考察上传」这两个页签**（该场活动上传位 + 纪检打回后的「待你确认」区），其余页签是组长身份的职责、不开放；**判据与表单零口径复制、不放宽任何写权限**。判定单一源 `docs/src/modules/capabilities/leader-workspace.js:17-23,69-72`（`ORGANIZER_FALLBACK_TAB_IDS`），身份门与归档兜底同款（`docs/src/core/bootstrap.js:19-20,181-187`）。

#### 3.2.6 成员工作台（`visitor.html`，普通参与者）— 11 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1-3 | `today` ★ / `todo` ★ / `overview` ★ | 工作台 | 同前（概况仅本人自我聚合） |
| 4 | `projects` / 项目分工 | 我的职责 | 本人在各活动/专班中的分工与角色 |
| 5 | `activities` / 活动动态 | 我的职责 | 活动参与动态 |
| 6 | `attendance` / 考勤概况 | 我的职责 | 本人考勤（含「去补课」入口，仅在本人有待办补课任务时出现） |
| 7 | `inspection` / 我的考察 | 我的职责 | 本人考察记录 |
| 8 | `thought-report` / 思想汇报 | 我的职责 | 本人提交思想汇报（**提交即入库归档**；少于 1200 字触发警告审阅、不影响提交），可跨期多篇 |
| 9 | `review` / 我的复盘 | 我的职责 | 本人作为组织者时的复盘提交 |
| 10 | `tf-view` / 知情查看 | 知情查看 | 活动 / 专班只读分段 |
| 11 | `my-dispatch` / 我的处置 | 制度与答复 | 意见反馈答复入口（认领依据＝本机浏览器里的随机标识，**只答「这台设备提交过什么」**，换设备或清浏览器数据则认不回） |

#### 3.2.7 党委工作台（`party-committee.html`）— 7 个

| # | 页签 | 分组 | 做什么 |
|---|---|---|---|
| 1 | `governance-overview` / 治理总览 | 首页 | 登录落点：支部概览（成员/党员/滞留实时统计 + 近期动态） |
| 2 | `monitor` / 支部监控台账 | 全院治理 | 各支部工作台账监控 |
| 3 | `review` / 上报审批 | 全院治理 | 支部上报逐项批准 / 驳回（驳回须意见），结论回传支部 |
| 4 | `branches` / 支部管理 | 全院治理 | 支部实例增改、空模板创建 / 复制创建、支书任命 |
| 5 | `issue-review` / 匿名反馈核查 | 全院治理 | **查看匿名反馈真实提交人**（仅党委；每次查看留痕） |
| 6 | `dispatch` / 下发通知 | 全院治理 | 向目标支部**支委层**下发通知（标「党委下发」） |
| 7 | `party-config` / 支部配置 | 支部治理 | 支部模块/分工/向导配置（属党委与部署期职责） |

**依据（3.2 全节）**：`docs/src/modules/capabilities/{secretary,org,prop,disc,leader,visitor,party-committee}-workspace.js`（逐台的 `tabs()` 数组）；`docs/src/core/constants.js:244-253`（核心页签判定 `isCoreTab`）；`server/test/doc-consistency.test.mjs:64-72`（七台注册文件与分组轴口径）。

### 3.3 设置中心（`settings.html`）

| 分区 | 谁可用 | 内容 |
|---|---|---|
| 外观 | **人人可用**（含未登录） | 字号、明暗主题、强调色；未登录偏好存本浏览器，登录后随账号 |
| 我的工作台 | 登录用户 | 调整**本人**页签顺序（核心页签不可动）；仅本账号生效 |
| 支部治理 | 支书 / 副支书（支部信息与换组织向导 / 工作台默认顺序 / 支部制度参数）；纪检 / 组织 / 组长各自的「职责参数」卡（各管本域） | 支部配置与域参数；普通成员、访客不可见 |

**依据**：`README.md:114`（设置中心分区）、`README-members.md:109-117`（设置中心三个分区）、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:134-148`（§9h）。

### 3.4 关键机制（可复用工作流）

| 机制 | 流程要点 |
|---|---|
| 三会一课 / 主题党日 | 决策树向导创建（生成后续任务链）→ 会议议程（可挂讨论文件 / 待讨论名单）→ 通知/报名/考勤 → 线上异步表决（**出席 >2/3 且无反对**通过；弃权允许、异议视同反对）→ 记录决议 → **决议自动督办**（责任人跟进 → 逾期催办 → 支书销项） |
| 考勤 | 按活动类型定记录人（支部党员大会/支委会/组织生活会＝纪检；党课＝支书或纪检；党小组会＝组长）→ 纪检认定异常标因（**请假分事假 / 病假两档，各带时效提示**）→ 考勤确认 → 缺勤自动生成补课任务 → 备案交接宣传归档 |
| 考察 | 活动/专班考察上传（组长/组织）→ 纪检确认 → 组织建档 |
| 发展党员两级确认 | 来源①名册报送（组织发起）②会议议程「待讨论名单」→ 组织审批 → 支书确认生效；双层留痕、可退回、可批量 |
| 思想汇报 | 提交即入库归档（算法归集）→ 组织委员查看调用；篇幅不足仅提示（警告审阅），必要时打回要求本人补充 |
| 外出活动提醒清单 | 写入活动时勾「本次为外出活动」→ 写入后向组织者弹 5 项清单（出发前人员清点 / 安全须知告知 / 交通方式确认 / 经费审批 / 返回后人员清点）→ **自动收起在该活动行下方、可随时展开**；**是提醒、非必填、不作校验**（裁定 `D-317` / 落地 `D-505`） |
| 宣传初稿「审核 → 定稿」 | 撰写人（被分工者）在活动详情「宣传」子记录填初稿 → 「提交审核」→ 宣传委员在宣传台「档案归档」区**定稿 / 退回** → 定稿后走既有宣传材料归档链（裁定 `D-506`） |
| 周报报送与审核 | 宣传委员按周次新建草稿（可按本周活动自动生成）→ 报送（系统通知支书 / 副支书）→ **支书 / 副支书审核（通过 / 退回）** → 已报送可「标记已上报智慧党建平台」（只留痕）（裁定 `D-445` / 落地 `D-507`） |
| 专班全生命周期 | 发起 → 招募统筹 → 定人定责定岗 → 运行 → 复盘 → 归档 |
| 上报党委双向通道 | 支部上报关键事项 → 党委逐项审批 → 结论回传；党委另有下发通知通道 |
| 线上异步表决 | 支书发起 → 通知应到成员 → 成员异步表态 → 支书汇总/截止（**截止不可逆**） |
| 线上支委会（会议页，2026-09-20 批次 105 / `D-526`） | 支书台「支委会会议」页签 → 独立页 `party-committee-meeting.html`：选 / 建一场线上召开支委会 → **提取议程**（读既有来源：专班报送 `TaskForceRecordStore.listCommitteeRequests()`、意见反馈 `IssueStore` 未办结项；加入时只留 `sourceRef` 回指，不复制来源）→ 支委线上表态（同意 / 异议 / 附言）→ 支书汇总并**截止**（`votesLocked`）→ **查阅讨论结果**（议程项 `result` + 表态记录；记录复用 `recordAgendaResult`，与活动详情页同一函数）。仅支委可进；效力 / 可见范围 / 缺席 / 是否并行线下任务四条口径留白待裁 |
| 数据交接（三委间） | 固定协议：纪检→宣传 考勤备案 / 纪检→组织 考察记录 / 组织→纪检 补课需求回执（生成即派生接收方待办） |
| 数据一键重置（仅 mock 形态） | `?reset=demo` / `?reset=preview` / `?reset=init` 三档 |

**依据**：`README.md:142-156`（§3.5 关键机制）、`docs/src/core/policy-defaults.js:36`（票决门槛 `quorum: 2/3`、`vetoOnObject: true`）、`docs/src/core/policy-defaults.js:66-71`（各活动类型的记录人角色）、`server/routes/committee.js:161-177`（截止不可逆）、`server/routes/resources.js:289-307`（删除活动的级联清理）。

> **说明**：制度文本里还有「数据交接」一项（`docs/src/core/domain.js:267` 的 `handoffs` 域），但**服务端没有对应数据表**（见 §7）。

### 3.5 支部分工模块目录（`config.workforce` 的键集，共 11 个）

> 后端若要写支部配置（§4.25 的 `config.workforce`），**键名只能是下列 11 个模块 id**；`null`＝全按缺省主责展示。模块分两层：`norm`（工作程序 / 党内统一规范，**必办、不可停用**）与 `method`（工作方法，本支部自选，**可停用**，停用以 `{ownerType:'none', ownerId:''}` 表示）。

| # | 模块 id（`config.workforce` 键） | 模块名 | 层 | 缺省主责角色 |
|---|---|---|---|---|
| 1 | `three-meetings` | 三会一课（含 4 子会） | norm | `secretary` |
| 2 | `theme-party` | 主题党日 | norm | `secretary` |
| 3 | `taskforce` | 专班 | method | `org-commissioner` |
| 4 | `joint-event` | 共建活动 | method | `secretary` |
| 5 | `develop-party-member` | 发展党员 | norm | `org-commissioner` |
| 6 | `democratic-review` | 民主评议党员 | norm | `secretary` |
| 7 | `election` | 换届选举 | norm | `secretary` |
| 8 | `attendance-inspection` | 考勤考察 | norm | `disc-commissioner` |
| 9 | `feedback-handling` | 意见反馈处理 | norm | `disc-commissioner` |
| 10 | `rule-making` | 制度制定与迭代 | norm | `secretary` |
| 11 | `info-platform` | 信息平台支持 | method | `prop-commissioner` |

**依据**：`docs/src/core/work-map.js:29-116`（`WORK_MAP_MODULES` / `WORK_MAP_IDS` / `WORK_MAP_DEFAULT` / `tierOfModule` / `canDisableModule`）。**说明**：`defaultOwner` 只是「缺省建议」（`config.workforce=null` 时兜底），分工由支部自行建设（支书台「支部分工」），调整走支委会议题。

---

## §4 字段说明（数据模型字段级清单）

### 4.0 计数口径与来源（**请先读这一节**）

| 来源 | 内容 | 字段（行）数 |
|---|---|---|
| **来源 A**：`content/04_web_design/data/DATA_MODEL.md` §2.1–§2.29 | 系统**静态数据模型唯一权威源**的字段表（**34 张字段表**） | **323** |
| **来源 B**：`server/db.js` / `server/routes/*.js` | **服务端专有表**（数据模型文档未列的 5 张）：`sessions`、`attachments`、`member_change_requests`、`committee_broadcasts`、`agenda_votes` | **39** |
| **来源 C**：`docs/src/**` 的实际读写点（`core/domain.js` 之外的 seed / services / entries）＋ `server/routes/resources.js` 的资源名映射 | **代码确实在读写、但来源 A 字段表未列的字段**：活动主记录 7 条（§4.1 尾）＋ **5 张通用资源表**（§4.39–§4.42、§4.44：`signups` 10 · `prop_tasks` 6 · `external_dispatches` 9 · `branch_docs` 21 · `archive_records` 11）57 条 ＋ 子记录聚合域 2 条（§4.43）＋ 支书复核标记 `secretaryConfirmedAt` 3 条（§4.5 / §4.6 / §4.17） | **69** |
| **合计** | 本文写入字段条目数 | **431** |

- **来源 A 的粒度**＝DATA_MODEL.md 中「字段表」的**数据行数**（表头首列为「字段名」或「字段」的表）。源文档中有若干行把两个字段合写在一行（例如 `id / number`、`name / studentId / enrollYear`、`filePath / fileData`），本文**保持同样的行粒度**，故 `323` 可直接对上。
- **来源 B 的 39 条**取自代码实际落库对象的字段并集（含各状态分支追加的字段）。
- **来源 C 的 69 条**（2026-09-19 批次 98 补）＝**以代码为准穷举 db.js 的 35 张资源表后，发现来源 A/B 两处都没有字段级说明的那几块**：活动主记录被代码实际写入/读取、但 DATA_MODEL.md 字段表未列的 7 个字段（`organizer` / `direction` / `hostGroup` / `assignments` / `signupEnabled` / `requireMakeup` / `voteConfig`，见 §4.1 尾）；**在资源名映射内、却一直没有字段节的 5 张表**（`signups` / `prop_tasks` / `external_dispatches` / `branch_docs` / `archive_records`，见 §4.39–§4.42 与 §4.44）；**子记录聚合表的存储外壳**（`act_sub_records` / `tf_sub_records`，见 §4.43）；以及**支书复核标记 `secretaryConfirmedAt`**（落在考勤 / 考察 / 复盘三个实体上，见 §4.5 / §4.6 / §4.17）。**这 69 条都逐条给了代码出处**，后端建模时不能漏。
- **数据落库形态（关键）**：服务端所有业务表都是 **`id TEXT PRIMARY KEY` + `data TEXT`（整条 JSON 字符串）** 的键值表——**字段本身不在 SQL 列里**，而是在 JSON 内部。后端若要换成关系型表，需要把这 431 条字段各自建列/建 JSON 列。**依据**：`server/db.js:44-58`（`SCHEMA`：`sessions`、`attachments` 为关系表）、`server/db.js:64-66`（业务表统一 `(id TEXT PRIMARY KEY, data TEXT NOT NULL)`）。
- **通用约定**：`id` 形如 `前缀-随机`（服务端缺 id 时自动补，前缀表见 §6.2）；时间字段统一 ISO 字符串；`YYYY-MM-DD` 为日期；枚举值未注明时即「有且仅有」所列取值。

> **服务端表全表清单（共 35 张资源表 + 2 张关系表）**：35 张资源表的表名见 `server/db.js:9-42`；另外 `sessions` / `attachments` 两张为关系表（`server/db.js:45-57`）。其中 **30 张**在 `server/routes/resources.js` 里映射为「资源名」（可走通用 CRUD，见 §6.2）；**另 5 张不在通用映射内**（只有语义端点或只有内部写入）：`issues`、`issue_reveals`、`member_change_requests`、`committee_broadcasts`、`agenda_votes`。

### 4.1 活动（ActivityRecord）

**对应服务端表**：`activities`　**依据**：`content/04_web_design/data/DATA_MODEL.md:27-53`、`docs/src/core/domain.js:11-35`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `act` |
| title | string | 是 | 活动标题 |
| type | string | 是 | 活动类型（中文取值，权威集＝三会一课 4 子类「支部党员大会/支委会/党小组会/党课」+「主题党日」+「组织生活会」；历史「大类·子类」写法读取时归一） |
| status | `'draft'\|'published'\|'ongoing'\|'completed'\|'cancelled'` | 是 | 活动**存储状态**（默认 `draft`）；页面展示态另由生命周期派生，不直接读本字段 |
| visibility | `'branch'\|'group'` | 是 | 可见范围：全支部 / 党小组（默认 `group`） |
| date | string（YYYY-MM-DD） | 是 | 活动日期 |
| location | string \| null | 否 | 活动地点（线下场地 / 线上会议链接） |
| executor | string | 是 | 执行角色标识 |
| supervisor | string \| null | 是 | 督办角色（可为 null） |
| createdBy | string | 是 | 创建者用户 ID |
| createdAt | string（ISO） | 是 | 创建时间 |
| priority | `'low'\|'normal'\|'urgent'` | 否 | 工作流引擎优先级 |
| dueDate | string（ISO） | 否 | 截止日期（自动化提醒锚点） |
| archived | boolean | 否 | 软删除标记（true＝已归档；默认 false） |
| domain | `'activity'\|'organization'` | 否 | 领域分类 |
| scenarioId | string | 否 | 关联 SOP 场景 ID |
| description | string | 否 | 活动描述 |
| targetDate | string（ISO） | 否 | 目标日期 T-0（兼容旧字段） |
| deliverableIds | string[] | 否 | **已废弃**（交付物由「文件空间记录」覆盖） |
| isBrand | boolean | 否 | 品牌属性标签（**支委会认定、支书在系统上完成标记**；仅作筛选展示） |
| brandName | string | 否 | 品牌族名称（isBrand 后补录） |
| isOutdoor | boolean | 否 | 是否外出（校外）活动；写入活动时勾选，判据「本次为外出活动」→ 写入后弹外出提醒清单（**是提醒、非必填、不作校验**） |
| carriers | string[] | 否 | 主题党日载体（理论学习 / 实践参访 / 交流座谈 / 其他，多选） |
| isJoint | boolean | 否 | 共建性质（共建开展为 true） |
| agenda | `Array<{id?, item, host?, kinds?, sourceRef?, result?, recordedBy?, recordedAt?}>` | 否 | 会议议程（逐条议题 + 可选主持人），会后可改。`id`＝表决/结果关联键（`agendaVotes.agendaItemId`、`recordAgendaResult` 均按它匹配）；`sourceRef`＝议程提取来源回指 `{kind:'taskforce-proposal'\|'issue', id}`（**只回指，不复制来源数据**，来源仍以专班报送 / 意见反馈为准） |
| organizer | string | 否 | 该场活动**组织者** personId——写入活动时「同时指定」即完成赋权、解除指定即收回（裁定 `D-308` / `D-309` / `D-312`） |
| direction | `'top-down'\|'bottom-up'` | 否 | 发起方向：自上而下（支部部署）/ 自下而上（党小组发起） |
| hostGroup | string | 否 | 承办党小组（组长写入时固化）；考勤「应到」判据优先取它、缺省回退组织者所属小组 |
| assignments | `Array<{personId, role:'organizer'\|'deep'\|'participant'}>` | 否 | **项目内角色**的内联登记（写入活动时随指定写入；`auth.js` 按它判项目身份）。⚠ 与 §4.7「分工记录」不是一回事——后者是「谁负责哪项工作」 |
| signupEnabled | boolean | 否 | 是否开放报名（写入活动时勾选）；**草稿活动只有它为 `true` 才可报名**（裁定 `D-465`；否则报名入口报「该活动当前不可报名」） |
| requireMakeup | boolean | 否 | 本次活动是否要求补课（活动级勾选，仅党小组会等「按该次情形定」的场合用；主题党日不强制、支委会不补课）（裁定 `D-467` / `D-468`） |
| voteConfig | object \| null | 否 | 线上异步表决配置，写入活动时固化：`{mode:'async', optionSet:'deliberative'│'formal', ballotMode:'named'│'anonymous', voterScope, voterIds:string[], quorumCheck:boolean}`。**线下开会不写本字段**（读侧无此字段＝旧活动/线下；`formal` 场景读侧一律按无记名处理） |

> **2026-09-19 批次 98 补（来源 C）**：上表最后 7 行（`organizer`→`voteConfig`）是**代码确实写入/读取、而 DATA_MODEL.md 字段表未列**的字段，后端建模不得漏。**依据**：`docs/src/mock/activities.js:12-14`（`organizer` / `direction` / `hostGroup` / `assignments` 的实存形态）、`docs/src/services/decision-tree.js:341`（`organizer` 写入）、`docs/src/services/auth.js:534,600,664`（`assignments` 写读）、`docs/src/entries/tabs/leader/write-tab.js:1048,1050`（`signupEnabled` / `requireMakeup` 写入）、`docs/src/entries/tabs/secretary/calendar-tab.js:1087-1103`（`voteConfig` 写入）、`docs/src/services/vote-config.js:41,44`（`voteConfig` 取值）、`docs/src/services/attendance.js:59-64`（`hostGroup` 判据）、`server/routes/resources.js:173-182,226-260`（`voteConfig` 写侧校验）。

**活动存储状态取值**：`draft` 草稿 / `published` 已发布 / `ongoing` 进行中 / `completed` 已结束 / `cancelled` 已取消。
**活动生命周期展示态（派生，不落库）**：`draft` / `published` / `ongoing` / `pending_archive`（待归档，悬停显示缺项）/ `executed`（已执行）/ `archived` / `cancelled`。
**活动分类（制度口径）**：顶层两大类＝**三会一课**（固定 4 子类，颜色党建红）与**主题党日**（正交维度：共建性质 / 是否外出 / 活动载体）。**组织生活会是「会议内容」而非子类**——由三会之一召开，不单独成类、不进写入表单。

**依据**：`content/04_web_design/data/DATA_MODEL.md:57-81`、`:118-167`（`isOutdoor` 见 `:162`）、`docs/src/core/constants.js:596-704`（`ACTIVITY_CLASSIFICATION` / `normalizeActivityType`）、`docs/src/services/activity.js:71-83`（外出提醒清单与 `isOutdoor` 判据）。
**2026-09-19 批次 97 改准**：① 删去 `attendanceQROwner` 一行（该字段**已从代码删除**，见 `.ctx/ACTIVE_RULINGS.md`「考勤二维码是与网页无关的线下动作」，裁定 `D-329` / `D-463`）；② `isBrand` 认定方由「支书」改准为「**支委会认定、支书在系统上完成标记**」（裁定 `D-414`）；③ 补 `isOutdoor` 一行（该维度本就存在于活动主源，此前漏列）。
**2026-09-20 批次 105 补**：`agenda[]` 一行补 `id` / `sourceRef` 两个子字段（线上支委会表决按 `id` 关联表态、按 `sourceRef` 回指提取来源）。本批**未新增任何表、未新增任何活动字段**——支委会会议页全部复用既有实体与既有写口（活动 + `voteConfig` + `agenda` + `agendaVotes` + `votesLocked`），裁定 `D-526`。

### 4.2 活动子记录（SubRecord，概念模型）

> ⚠ **说明**：这是**概念模型**，不是独立字段表。实现层由「考勤记录 / 文件空间记录」等实体承载（见 §4.6 / §4.23）。

| type 值 | 中文 | items 内容 | 对应实现层数据 | 写入角色 |
|---|---|---|---|---|
| `attendance` | 考勤子记录 | 出勤记录列表 | 考勤记录（§4.6） | 纪检委员 |
| `materials` | 材料子记录 | 交付物列表 | 文件空间记录（非 publicity 类） | **组织者（打包提交）**——2026-09-19 批次 98 改准：**代码中不设「深度参与者」写口**（裁定 `D-287`），现行承载位＝组长台「考勤 / 考察上传」与宣传台「档案归档」 |
| `publicity` | 宣传子记录 | 宣传素材列表 | 文件空间记录（category 为 publicity 类） | 撰写人（提交初稿）→ 宣传委员（定稿 / 退回），见下方初稿状态位（裁定 `D-506`） |

**`publicity` 子记录的初稿状态位（2026-09-19 批次 94 落地，裁定 `D-506`）**：撰写人侧「提交审核」、宣传委员侧在宣传台「档案归档」区**定稿 / 退回**。状态取值 `draft` 初稿 / `reviewing` 待审核 / `finalized` 已定稿（退回即回 `draft` 并带一句退回说明）；附加字段 `draftStatusAt` / `draftStatusBy` / `draftReturnNote?` / `finalizedAt?`。**不新开对象、不加 tab、不新增表**；定稿后仍走既有宣传材料归档链。单一源 `docs/src/services/activity.js:100-153`（`PUBLICITY_DRAFT_STATUS` / `setPublicityDraftStatus`）。

**依据**：`content/04_web_design/data/DATA_MODEL.md:83-116`、`docs/src/services/activity.js:100-153`。

### 4.3 专班（TaskForceRecord）

**对应服务端表**：`taskforces`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `tf` |
| name | string | 是 | 专班名称 |
| type | string | 是 | 专班类型 |
| status | `'recruiting'\|'active'\|'archived'\|'dissolved'` | 是 | 状态（默认 `recruiting`；状态机 recruiting → active → archived / dissolved） |
| activityId | string \| null | 否 | 关联活动 ID（专班与活动互斥，通常为 null） |
| createdBy | string | 是 | 创建者 ID |
| createdAt | string（ISO） | 是 | 创建时间 |
| members | `Array<{personId, role:'organizer'\|'deep'\|'participant', contributions:string[]}>` | 否 | 成员对象数组（**项目角色 organizer/deep 的主源之一**，含工作量；非字符串 ID 列表） |
| description | string | 否 | 专班描述 |

> 示例数据另含展示字段 `task` / `manager` / `initiator` / `capacity` / `deadline`，**未列为模型必填字段**。

**依据**：`content/04_web_design/data/DATA_MODEL.md:230-255`。

### 4.4 系列活动（SeriesRecord）

> ⚠ **未实现**：本实体在数据模型中有定义，但**代码中无持久化域、无读写入口**（详见 §7）。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | `series-{timestamp}` |
| title | string | 是 | 系列活动名称 |
| scenario | string | 是 | 组织场景 |
| activityType | string | 是 | 活动形式 |
| direction | `'top-down'\|'bottom-up'` | 是 | 发起方向 |
| hostGroup | string | 否 | 承办党小组 |
| recurrenceRule | object | 是 | `{frequency, interval, startDate, endDate?}` |
| subActivityIds | string[] | 是 | 展开后的子活动 ID 列表 |
| organizerName | string | 否 | 组织者 |
| deepParticipantName | string | 否 | 深度参与者 |
| archived | boolean | 否 | 全部子活动完成后置 true 并归档 |
| createdAt | string（ISO） | 是 | 创建时间 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:257-279`。

### 4.5 考勤记录（AttendanceRecord）

**对应服务端表**：`attendances`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符 |
| activityId | string | 是 | 所属活动 ID |
| personId | string | 是 | 参会成员人员 ID |
| status | `'present'\|'absent'\|'leave'` | 是 | 出勤状态（**另有补课完成后置 `made_up`「已补」**） |
| absenceReason | `'leave_personal'\|'leave_sick'\|'unexcused'\|'other'` | 否 | 未到（请假 / 缺勤）标因，由纪检认定；`leave_personal` 事假（须提前 1 天申请）/ `leave_sick` 病假（可事后补）/ `unexcused` 无故 / `other` 其它。**旧键 `leave` 仅作读取兼容别名**（存量记录与「线上参会代记」仍用它，显示「请假」），**不再出现在可选枚举** |
| recordedBy | string | 是 | 记录人用户 ID（纪检委员或该活动组织者） |
| recordedAt | string（ISO） | 是 | 记录时间 |
| studentId | string | 否 | 学号（冗余快照） |
| developStage | `'积极分子'\|'发展对象'\|'预备党员'\|'正式党员'` | 否 | 发展阶段（冗余快照） |
| partyGroup | string | 否 | 所属党小组（冗余快照） |
| secretaryConfirmedAt | string（ISO） | 否 | **支书复核标记**（2026-09-19 批次 98 补·来源 C）：支书台待办「一键确认」写入即销项；无此字段＝未复核 |

**出勤状态枚举**：`present` 出席 / `absent` 缺席（触发补课机制）/ `leave` 请假 / `made_up` 已补。**请假分事假 / 病假两档在 `absenceReason` 上区分**（2026-09-19 批次 94 落地，裁定 `D-504`；时效（事假提前 1 天 / 病假可事后补）**只提示、不校验、不拦提交**）。标因可选项单一源 `docs/src/core/policy-defaults.js:82-87`（`attendance.reasons`，新增须支书裁决）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:281-316`、`docs/src/core/domain.js:92-108`、`docs/src/core/policy-defaults.js:73-87`、`docs/src/services/secretary-overview.js:573`（`secretaryConfirmedAt` 读）、`docs/src/entries/tabs/secretary/todo-tab.js:720`（写）。

### 4.6 考察记录（InspectionRecord）

**对应服务端表**：`inspections`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `ins` |
| sourceType | `'activity'\|'taskforce'` | 是 | 考察来源类型（活动 / 专班） |
| activityId | string | 是 | 关联活动 ID（sourceType=activity 时必填） |
| sourceName | string | 否 | 来源名称（专班时为专班名称） |
| personId | string | 是 | 人员 ID |
| level | `'organize'\|'deep'` | 是 | 考察层级（**仅组织者与深度参与者有考察记录**） |
| role | string | 是 | 分工角色 + 描述（如「策划+全流程统筹」） |
| recordedBy | string | 是 | 记录人 personId |
| recordedAt | string（ISO） | 是 | 记录时间 |
| status | `'pending'\|'confirmed'` | 否 | 考察确认状态（默认 `pending`；纪检确认后录入考察档案） |
| secretaryConfirmedAt | string（ISO） | 否 | **支书复核标记**（2026-09-19 批次 98 补·来源 C）：支书台「一键确认」对「已纪检确认」的考察写此销项 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:318-335`、`docs/src/core/domain.js:166-178`、`docs/src/services/secretary-overview.js:580`（读）、`docs/src/entries/tabs/secretary/todo-tab.js:727`（写）。

### 4.7 分工记录（AssignmentRecord）

**对应服务端表**：`assignments`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `asg` |
| activityId | string | 是 | 所属活动 ID |
| workName | string | 是 | 工作名称 |
| workDescription | string | 是 | 工作描述 |
| ddl | string（ISO） | 是 | 截止日期 |
| assigneeId | string | 是 | 被分配人 ID |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | 分工状态（默认 `pending`） |
| createdBy | string | 是 | 创建者 ID |
| createdAt | string（ISO） | 是 | 创建时间 |
| completedAt | string \| null（ISO） | 否 | 完成时间 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:337-352`。

### 4.8 产出物（OutputRecord）

> **性质**：系统按「产出类型」**自动定向投递**的记录，投递去向由类型派生、**非人工录入**；组织者只见「提交」不见「发送对象」。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| type | OutputType | 是 | 产出物类型（见下表枚举） |
| title | string | 是 | 产出物名称 |
| submittedBy | string | 是 | 提交人 ID |
| submittedAt | string（ISO） | 是 | 提交时间 |
| status | `'pending'\|'submitted'` | 是 | 提交状态（默认 `pending`） |
| routedTo | string | 是 | 系统定向投递去向（由 `deriveOutputRoute(type)` 派生） |

**产出类型枚举（7 种）与定向路由**：

| 产出物 | 系统定向投递 | 最终沉淀 |
|---|---|---|
| 考勤数据 | 纪检确认 → 考勤明细 | 考勤明细（组织/宣传只读同源） |
| 工作考察记录 | 纪检确认 → 考察档案 | 考察总表（组织委员建档） |
| 专班考察 | 纪检确认 → 考察档案 | 考察总表（组织委员建档） |
| 宣传材料 | 宣传委员归档 | 产出物查看区 |
| 复盘总结 | 纪检批注 / 确认 | 活动关闭前置 |
| 专班工作量 | 系统自动记录 | 解散报告 → 个人档案 |
| 思想汇报 | 系统自动归档 | 个人档案（不经纪检 / 宣传） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:354-380`、`docs/src/core/domain.js:342-412`（`OutputType` / `OUTPUT_ROUTES` / `deriveOutputRoute`）。

### 4.9 补课任务（MakeupTask）

**对应服务端表**：`makeup_tasks`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `mk` |
| personId | string | 是 | 需补课人员 ID |
| activityId | string | 是 | 关联活动 ID |
| attendanceRecordId | string | 是 | 关联考勤记录 ID |
| activityName | string | 是 | 活动名称（冗余快照） |
| personName | string | 是 | 人员姓名（冗余快照） |
| absentDate | string（YYYY-MM-DD） | 是 | 缺勤日期 |
| deadline | string（YYYY-MM-DD） | 是 | 补课截止日期（缺勤后 T+7） |
| status | `'pending'\|'completed'` | 是 | 补课状态（默认 `pending`） |
| isMandatory | boolean | 是 | 是否刚性考勤（三会一课 / 主题党日为刚性） |
| proofContent | string \| null | 否 | 补课证明内容 |
| createdAt | string（ISO） | 是 | 创建时间 |
| completedAt | string \| null（ISO） | 否 | 完成时间 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:382-400`、`docs/src/services/makeup.js`（`autoGenerateMakeupTask`）。

### 4.10 通知（Notice）

**对应服务端表**：`notices`（本节为基础字段；扩展字段见 §4.20 与 §4.28）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `ntc` |
| title | string | 是 | 通知标题 |
| content | string | 是 | 通知内容 |
| priority | `'urgent'\|'normal'\|'low'` | 是 | 优先级（默认 `normal`） |
| publishDate | string（YYYY-MM-DD） | 是 | 发布日期（服务端生成时强制覆盖为当日） |
| expireDate | string \| null（YYYY-MM-DD） | 否 | 过期日期（过期后不展示） |
| targetModule | string | 否 | 目标模块（点击跳转用） |
| read | boolean | 否 | 是否已读（默认 false） |

**通知受众 sentinel（发布侧写入值 ↔ 可见性判定必须同源）**：`all`＝全体党员（**broadcast，含未登录可见**）/ `leaders`＝党小组组长 / `activists`＝入党积极分子 / `candidates`＝发展对象。
**依据**：`content/04_web_design/data/DATA_MODEL.md:402-415`、`docs/src/core/constants.js:792-800`、`server/routes/system-notices.js:53-58`。

### 4.11 经验沉淀（ExperienceDeposit）

**对应服务端表**：`experience_deposits`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `xp` |
| title | string | 是 | 经验总结标题 |
| content | string | 是 | 经验内容 |
| category | string | 是 | 分类 |
| sourceType | `'activity'\|'taskforce'\|'standalone'` | 是 | 来源类型 |
| sourceId | string | 否 | 来源 ID |
| createdBy | string | 是 | 创建者 ID |
| createdAt | string（ISO） | 是 | 创建时间 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:417-429`。

### 4.12 制度文件引用（ComplianceReference）

**对应服务端表**：`compliance_references`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `cr` |
| title | string | 是 | 文件标题 |
| description | string | 否 | 文件描述 |
| category | `'institutional'\|'sop'\|'internal'` | 是 | 分类：制度性文件 / SOP / 内部规范 |
| sourceType | string | 是 | 来源类型 |
| path | string | 否 | 文件路径 |
| referencedAt | string（ISO） | 是 | 引用时间 |
| referrer | string | 是 | 引用者 ID |

**依据**：`content/04_web_design/data/DATA_MODEL.md:431-444`。

### 4.13 任务（Task）

**对应服务端表**：`tasks`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `tsk` |
| activityId | string | 是 | 所属活动 ID |
| title | string | 是 | 任务标题 |
| status | `'pending'\|'in_progress'\|'completed'` | 是 | 任务状态（默认 `pending`） |
| createdAt | string（ISO） | 是 | 创建时间（审计字段） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:446-456`、`docs/src/core/domain.js:68-74`。

### 4.14 应用状态（appState，**仅前端内存状态，不落库**）

> 这是**前端运行时状态对象**，不进入任何后端表；后端不需要为该实体建模，仅需了解前端会缓存哪些上下文。

| 字段 | 类型 | 初始值 | 说明 |
|---|---|---|---|
| status | STATE 枚举 | `IDLE`(0) | 服务层状态：IDLE / LOADING / SUBMITTING / SUCCESS / ERROR |
| activities | Activity[] | `[]` | 内存活动列表快照 |
| tasks | Task[] | `[]` | 内存任务列表快照 |
| error | string \| null | null | 错误信息 |
| domain | string | `'activity'` | 当前域：activity / organization |
| role | string | `'all'` | 参考指南当前角色（由 selectedRole 推导） |
| activeModule | string | `'dashboard'` | 当前活动模块 |
| viewMode | string | `'list'` | 列表 / 详情双视图：list / detail |
| selectedActivityId | string \| null | null | 选中活动 ID |
| selectedDate | string \| null | null | 选中日期 |
| displayMonth | string | 当前年月 | 显示月份（YYYY-MM） |
| selectedRole | string \| null | null | 核心角色状态（null＝未选择 / 默认参与者） |
| viewType | `'participant'\|'manager'\|'global'` | `'participant'` | 视图类型（由 selectedRole 推导） |
| viewArchived | boolean | false | 归档库独立视图标志 |

**STATE 枚举**：`IDLE`=0 空闲 / `LOADING`=1 加载中 / `SUBMITTING`=2 提交中 / `SUCCESS`=3 成功 / `ERROR`=4 出错。
**依据**：`content/04_web_design/data/DATA_MODEL.md:458-487`、`docs/src/core/state.js:71-93`。

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
| executor | string | 是 | 执行角色键（可为 `all`＝全员） |
| supervisor | string \| null | 是 | 督办角色键（可为 null） |
| timeOffset | number \| null | 是 | 距 T-0 的天数偏移（**null＝无时间锚点**；见 §7 的实例化限制） |
| desc | string | 否 | 任务详细描述 |

**内置场景共 8 个**：`org-life` 组织生活会 / `theme-party` 党小组主题党日活动 / `branch-party-meeting` 支部党员大会 / `party-group-meeting` 党小组会 / `party-lecture` 党课 / `branch-committee` 支委会 / `attendance-check` 查考勤记录 / `feedback-handling` 处理意见建议反馈。
**2026-09-19 批次 97 改准**：本表原写「12 个」，其中 `joint-event`（团支部合办）/ `new-system`（制度制定与迭代）/ `develop-activist`（考察积极分子）/ `info-platform`（信息平台支持）**四个死场景已先后清掉、并进已有场景**（裁定 `D-336` / `D-344` / `D-464`（批次 82 清 `joint-event` / `new-system`）、`D-510`（批次 95 清 `develop-activist` / `info-platform`）），故现为 **8 个**。三会（支部党员大会 / 党小组会 / 支委会）已按同一套**9 环节**取齐（裁定 `D-328` / 落地 `D-509`）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:510-548`、`docs/src/workflow/sopData.js:9-129`。

### 4.16 意见反馈（IssueRecord）

**对应服务端表**：`issues`（**语义端点域**：不走通用 CRUD、不进快照写穿）

| 字段 | 类型 | 说明 |
|---|---|---|
| id / number | string / number | 唯一标识符（前缀 `issue-`）/ 自增序号（`#N` 展示） |
| title / body | string | 标题 / 正文 |
| scope | `'permanent'\|'global'\|'role'\|'scenario'` | 影响范围：底层架构 / 全局规则 / 支委分工 / 特定场景 |
| types | string[] | 类型标签 |
| status | `'open'\|'closed'` | 开放 / 关闭 |
| closedReason / closedAt | 枚举 / string \| null | 关闭原因（`completed` 已解决 / `duplicate` 重复 / `wontfix` 不修复 / `not_planned` 暂不计划）/ 关闭时间 |
| submittedBy / submittedAt | string | 提交人**对外展示值**（匿名时恒为字符串 `'匿名'`，实名时为成员短 ID）/ 提交日期 |
| _realPersonId | string（仅匿名提交时落库） | **真实提交人 personId**。任何常规读出口一律脱敏；唯一可见出口＝党委核查端点（**每次查看留痕**）。**支部内部含支书不可见** |
| assignee / assigneeRole | string \| null | 指派对象（personId / 角色键） |
| dispatchHistory | `{from,to,by,at,note}[]` | 指派历史时间线 |
| milestone | string \| null | 里程碑 |
| reactions | `{thumbsUp[],thumbsDown[],eyes[],hooray[]}` | 表态反应（按人列表） |
| mentions / references | string[] | 提及 / 引用 |
| participants / commentCount | string[] / number | 参与人 / 评论数 |
| hidden / mergedInto | boolean / string \| null | 隐藏（不在公开列表显示）/ 合并去向 |
| comments | `{id,author,authorRole,body,createdAt,kind,hidden,hiddenBy,hiddenReason,hiddenAt}[]` | 评论时间线；`kind`＝`comment` 普通评论 / `reply` 支书正式答复 / `dispatch` 指派事件 / `result` 处置结果 / `verdict` 终审·合并事件 |
| resultPending / resultSubmittedAt | boolean / string \| null | 待终审标记 / 处置结果提交时间 |

**落库时由服务端追加的字段（文档未列，见代码）**：`branchId`（支部归属，服务端取登录人所属支部，缺省 `br-b1`）、`tokenHash`（防刷判重/限频，**与 personId 无关、不可反推人**）、`createdAt`（ISO 时间戳）。另有 `kind`（内部汇报型反馈自身为 `'report'`）——**该字段不在服务端 `POST /issues` 的落库对象里**，而来自种子文件 `docs/data/issues.json` 与前端写入，见 §4.16 说明与 §5.6 第 4 条。
**匿名口径（重要）**：`anonymous !== false` 即匿名（**缺省匿名**）；匿名＝**前端展示层匿名**，后台记真身；**「处置」与「查看真身」是两项分开的权限**。
**依据**：`content/04_web_design/data/DATA_MODEL.md:599-647`、`server/routes/resources.js:723-792`（落库白名单与追加字段）、`:669-719`（脱敏 / 留痕序列化）。

### 4.17 复盘记录（ReviewRecord）

**对应服务端表**：`activity_reviews` / `taskforce_reviews`（两域）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符 |
| activityId | string | 否 | 关联活动 ID（活动复盘时必填） |
| sourceType | `'activity'\|'taskforce'` | 否 | 来源类型（默认 `activity`） |
| sourceName | string | 否 | 来源名称（专班时为专班名称） |
| taskforceId | string | 否 | 关联专班 ID（专班复盘时填写，与 sourceName 双保险定位） |
| organizerId | string | 是 | 组织者人员 ID（须为实际 organizer） |
| progress | string | 是 | 进度状态（如 已完成 / 进行中 / 超时） |
| overdue | boolean | 是 | 是否超时（默认 false） |
| reviewStatus | ReviewStatus | 是 | 复盘状态（默认 `未提交`） |
| reviewContent | string | 否 | 复盘内容（默认空串） |
| issues | string[] | 否 | 待改进问题清单（默认空数组） |
| annotation | string | 否 | 批注内容（批注中 / 已打回时填写） |
| annotatedBy | string | 否 | 批注人 personId（纪检委员） |
| annotatedAt | string（ISO） | 否 | 批注时间 |
| submittedAt | string（ISO） | 否 | 提交时间 |
| confirmedAt | string（ISO） | 否 | 确认时间 |
| secretaryConfirmedAt | string（ISO） | 否 | **支书复核标记**（2026-09-19 批次 98 补·来源 C）：支书台「一键确认」对「已确认」的复盘写此销项 |

**复盘状态枚举（中文值，落库即中文）**：`未提交` → `已上传` → `批注中` → `已确认` / `已打回`（打回后可重新提交回 `已上传`）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:649-684`、`docs/src/core/domain.js:125-144`、`docs/src/services/secretary-overview.js:587`（读）、`docs/src/entries/tabs/secretary/todo-tab.js:732`（写）。

### 4.18 周报（WeeklyReport）

**对应服务端表**：`weekly_reports`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符（种子为 `wrN`，新建为 `wr_时间戳`） |
| week | string | 是 | 周次标签（如「第32周」，同标签唯一） |
| weekRange | string | 是 | 日期范围（如 `2026-08-04 ~ 2026-08-08`） |
| content | string | 否 | 周报内容（每条一行，默认空串） |
| status | `'draft'\|'submitted'` | 是 | 报送状态（默认 `draft`） |
| submittedAt | string（日期） | 否 | 报送日期（默认 null） |
| submittedBy | string | 否 | 报送人 personId（宣传委员；报送时写入） |
| reviewStatus | `'pending'\|'approved'\|'returned'` | 否 | **支书审核位**（2026-09-19 批次 94 落地，裁定 `D-507`）：新报送即回 `pending`；读取侧归一——`submitted` 而无值 / 非法值一律按 `pending`（**存量不回填**），`draft` 为空 |
| reviewNote | string | 否 | 支书退回说明（`returned` 时填写） |
| reviewedAt / reviewedBy | string（ISO）/ string | 否 | 审核时间 / 审核人（支书 personId） |
| platformReportedAt / platformReportedBy | string（ISO）/ string | 否 | 「**标记已上报北京大学智慧党建平台**」留痕（**只留痕、不对接**；对接方为外部系统） |
| createdAt | string（ISO） | 否 | 新建时间 |
| createdBy | string | 否 | 创建人短 ID（宣传委员 personId） |

**报送内容可自动生成**：按所选周次的起止区间，从活动数据（活动主源 `date`）拼出「活动名（类型）· 日期」草稿，**生成后仍可手改**（单一源 `docs/src/entries/tabs/prop/weekly-tab.js::_autoWeeklyContent`）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:686-702`、`docs/src/services/secretary-overview.js:409-443`（审核状态与写口）、`docs/src/entries/tabs/prop/weekly-tab.js:57-67,214-247`、`server/system-notice-kinds.js`（`weekly-report-submitted` 通知）。

### 4.19 待办（Todo）

**对应服务端表**：`todos`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `td` |
| title | string | 是 | 待办标题 |
| description | string | 否 | 待办描述（默认空串） |
| role | string | 是 | 目标角色键（含 secretary / deputy-secretary / org-commissioner / prop-commissioner / disc-commissioner / leader / participant / party-staff / organizer / deep） |
| personId | string \| null | 否 | 目标人员 ID（**null＝该角色所有人**） |
| category | `'auth'\|'archive'\|'review'\|'notice'\|'submit'\|'track'` | 是 | 分类（赋权 / 归档 / 审核 / 通知 / 提交 / 追踪） |
| priority | `'urgent'\|'normal'` | 是 | 优先级（默认 `normal`） |
| status | `'pending'\|'in_progress'\|'completed'\|'expired'` | 是 | 状态（默认 `pending`；`expired` 非终态，可再激活） |
| deadline | string（ISO）\| null | 否 | 截止日期（默认 null） |
| createdAt | string（ISO） | 是 | 创建时间 |
| completedAt | string（ISO）\| null | 否 | 完成时间（默认 null） |
| sourceType | `'notice'\|'activity'\|'taskforce'\|'manual'` | 是 | 来源类型 |
| sourceId | string \| null | 否 | 来源 ID（通知/活动/专班 ID） |
| actionType | `'authorize'\|'archive'\|'review'\|'read'\|'submit'\|'track'\| null` | 否 | 行动类型（决定点击后的跳转/弹出面板，默认 null） |
| actionData | object \| null | 否 | 行动数据（如赋权参数 `{scope, sourceId, sourceName}`，默认 null） |

**分类默认展开态**：赋权类 / 审核类默认展开；归档类 / 通知类 / 提交类 / 追踪类默认折叠。**派生规则**：通知 `actionable=true` 时，系统为 `actionRoles` 中每个角色自动生成一条待办。
**依据**：`content/04_web_design/data/DATA_MODEL.md:744-805`、`:807-847`。

### 4.20 通知扩展字段（通知 → 待办派生机制）

> 在 §4.10 通知基础字段之上**追加**；`actionable=true` 时系统按 `actionRoles` 自动派生待办。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| actionable | boolean | 是 | 是否为行动性通知（默认 false） |
| actionRoles | string[] | 否 | 需要执行的角色列表（actionable=true 时必填） |
| actionTask | string | 否 | 待办任务标题（actionable=true 时必填） |
| actionDeadline | string（YYYY-MM-DD） | 否 | 行动截止日期 |
| readBy | string[] | 是 | 已读人员 ID 列表（用于未读名单查看，默认空数组） |
| reminderDays | number | 是 | 自动提醒触发天数（默认 3） |
| reminders | `Array<{type, sentAt, sentBy, targetPersonIds}>` | 是 | 提醒记录（auto / manual，默认空数组） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:811-823`。

### 4.21 归档记录扩展字段

> 活动 `archived=true` 时追加。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| archivedBy | string | 是 | 归档人 personId |
| archivedAt | string（ISO） | 是 | 归档时间 |
| materials | `Array<Material>` | 是 | 已归档材料清单（默认空数组） |
| checklistResult | object \| null | 否 | 归档检查清单结果（默认 null） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:849-860`。

### 4.22 归档材料子结构（Material）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 材料 ID |
| name | string | 是 | 文件名 |
| type | `'image'\|'document'\|'video'\|'other'` | 是 | 文件类型 |
| url | string \| null | 是 | 文件 URL（**阶段 2 后端支持时填充，当前示例形态为 null**） |
| uploadedAt | string（ISO） | 是 | 上传时间 |
| uploadedBy | string | 是 | 上传人 personId |
| size | number \| null | 否 | 文件大小（字节） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:862-874`。

### 4.23 文件空间记录（FileSpaceRecord）

**对应服务端表**：`file_space_records`　**双模式**：mock 模式用 `fileData`（base64 本地）；server 模式用 `filePath`（磁盘路径，受保护静态下载 `/api/v1/uploads/:name`）。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 记录 ID |
| activityId | string \| null | 否 | 关联活动 ID |
| activityName | string | 否 | 关联活动名（快照冗余） |
| category | `'新闻稿'\|'照片'\|'视频'\|'其他'` | 否 | 材料类别 |
| fileName | string | 是 | 原始文件名（下载命名） |
| fileSize | number | 是 | 文件字节数 |
| filePath | string | 否 | server 模式下载路径（`/api/v1/uploads/xxx`） |
| fileData | string | 否 | mock 模式 base64 dataURL（≤2MB 本地容量约束） |
| status | `'archived'\|'in_progress'\|'pending'` | 否 | 归档状态 |
| archiveDate | string（YYYY-MM-DD） | 否 | 归档日期 |
| uploadedBy | string | 否 | 上传人 personId |
| createdAt | string（ISO） | 否 | 创建时间 |

**删除语义（防孤儿文件）**：server 模式删记录前会先删物理文件；mock 模式只删记录。
**依据**：`content/04_web_design/data/DATA_MODEL.md:876-898`、`:910-913`、`server/routes/resources.js:278-286`。

### 4.24 图片记录（ImageRecord）

**对应服务端表**：`image_records`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 记录 ID |
| filePath / fileData | string | 二选一 | 同 FileSpaceRecord 双模式 |
| fileName | string | 是 | 文件名 |
| fileSize | number | 是 | 字节数 |
| uploadedBy / uploadedAt | string | 是 | 上传人 / 上传时间 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:900-908`。

### 4.25 支部实例（BranchRecord）

**对应服务端表**：`branches`（**支部不预设名字**，由党委动态创建 / 改名）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 支部实例 ID。**形态 `/^br-[0-9a-f]{8}$/` 是测试断言契约**（示例种子为 `br-b1`），随机段长度勿改 |
| name | string | 是 | 支部名称（党委命名；**仅 `party-staff` 可改**） |
| type | string | 否 | 类型类别标签（**自由文本、不预设枚举**，如 本科生/硕士/博士） |
| config | object | 是 | 支部配置档案（见下） |
| secretaryId | string \| null | 否 | 现任支书 personId（由任命链维护；**访问支书工作台以本值为准**） |
| status | `'active'` | 是 | 支部状态（默认 `active`） |
| createdAt | string（ISO） | 是 | 创建时间 |

**config 配置档案（子结构）**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| headerTitle | string | 是 | 页头品牌软编码（= name，改名自动同步） |
| accent | string \| null | 否 | 支部主题色（默认 null＝党建红） |
| desc | string | 否 | 支部自述（≤500 截断，默认空串） |
| themePreset | string \| null | 否 | 主题预设 id（白名单 `red/green/sky/blue`；null＝默认党建红） |
| modules | object \| null | 否 | 工作流模块配置：`{hiddenTabIds:[], tabOrder:[]}`——**null＝全开**；核心页签固定不可关、不参与排序 |
| blocks | object \| null | 否 | 产出块 / 工作流块显隐：`{outputBlocks?:{hiddenBlockIds,blockOrder}, workflowBlocks?:{hiddenBlockIds}}`——null＝全开。⚠ `outputBlocks.blockOrder` **当前无 UI 写入口**（能力在、入口无） |
| workforce | object \| null | 否 | 模块分工归属：`{[moduleId]:{ownerType:'role'\|'person'\|'none', ownerId}}`——null＝缺省分工（按制度责任人列） |
| policyOverrides | object \| null | 否 | 域参数覆盖：`{节:{叶:值}\|null}`——节白名单仅 `inspection` / `memberConfirmation` / `leader`；null＝恢复默认 |
| configChangeHistory | array | 否 | 配置写留痕：`{by,at,what,from?,to?,why?}`——逐键 diff 追加，**保留最近 100 条**；单键可回滚、回滚再留一痕、历史不改写 |
| fileSpaceIsolated | boolean | 是 | 支部文件 / 附件是否按支部隔离存储空间（默认 true） |

**配置写权分层**见 §2.3.3；**配置写留痕上限** `CONFIG_HISTORY_MAX = 100`。
**依据**：`content/04_web_design/data/DATA_MODEL.md:919-946`、`server/routes/resources.js:12,459-597`、`docs/src/core/config-clean.js`。

### 4.26 支书任期记录（AppointmentRecord）

**对应服务端表**：`appointment_records`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 任期记录 ID，前缀 `appt` |
| branchId | string | 是 | 所属支部 |
| secretaryId | string | 是 | 被任命人 personId |
| appointedBy | string | 是 | 任命方 personId（默认 `party-staff`） |
| note | string | 否 | 任命说明（默认空串） |
| from | string（ISO） | 是 | 任期开始时间 |
| to | string（ISO）\| null | 是 | 任期结束时间（**null＝现任**；撤换时旧记录封口） |

**任命即三写**：`branches.secretaryId` + 双方 `users.role` 同步 + 本记录封口/新建。
**依据**：`content/04_web_design/data/DATA_MODEL.md:948-960`。

### 4.27 支部上报审批记录（ReviewRequest）

**对应服务端表**：`review_requests`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 上报记录 ID，前缀 `rq` |
| branchId | string | 是 | 上报支部 |
| type | `'develop-node'\|'activity-report'` | 是 | 上报类型：发展节点 / 活动报备 |
| title | string | 是 | 事项标题 |
| content | string | 是 | 事项说明（时间/对象/依据等） |
| status | `'pending'\|'approved'\|'rejected'` | 是 | 审批状态（默认 `pending`） |
| submittedBy | string | 是 | 提交人 personId（支书/副支书） |
| decidedBy | string \| null | 否 | 审批人 personId（党委组织员，默认 null） |
| decidedAt | string（ISO）\| null | 否 | 审批时间（默认 null） |
| decisionNote | string | 否 | 审批意见（**驳回必填**；批准可附指导意见，默认空串） |
| createdAt | string（ISO） | 是 | 提交时间 |

**依据**：`content/04_web_design/data/DATA_MODEL.md:962-978`、`server/routes/resources.js:81,100-106`。

### 4.28 党委下发通知扩展字段

> 复用通知实体（**不新建「下发箱」领域**）；仅目标支部**支委层成员**可见。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| source | `'committee'` | 是 | 来源标记：`committee`＝党委下发；缺省＝支部自发通知 |
| audience | `'committee'` | 是 | 下发专用可见性过滤常量（**字符串**，表示「本支部支委层」；注意与 `actionRoles` 数组区分） |
| branchId | string | 是 | 目标支部 |
| branchName | string | 否 | 目标支部名快照（改名不使历史下发失联） |
| publisher | string | 否 | 展示覆盖（如「院党委（组织员）」） |
| recipients | string | 否 | 展示覆盖（如「支部委员会（支委层）」） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:980-995`。

### 4.29 思想汇报（ThoughtReport）

**对应服务端表**：`thought_reports`（**在通用资源映射内**，随快照写穿同步；建表动因之一是让系统通知能据表复算提交人）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `tr`（底层 `crypto.randomUUID()`） |
| personId | string | 是 | 提交人 ID |
| personName | string | 是 | 人员姓名**冗余快照**（展示一律现取权威源姓名，快照仅作历史留痕、不参与身份判定） |
| title | string | 否 | 标题（默认「思想汇报」） |
| period | string | 是 | **期次（季度）**，格式 `YYYY-Qn`；提交时手填、缺省或非法按 `submittedAt` 推导；同一人同一期次**允许多篇** |
| content | string | 是 | 正文（trim 后存储） |
| submittedAt | string（ISO） | 是 | 提交时间 |
| reviewStatus | `'needs_revision'\|'archived'` | 是 | 审阅状态（**新提交即 `archived`**——提交即入库归档；`needs_revision` ＝被组织委员打回、待本人补充；读取侧归一：无此字段 / 非法值 / 旧的 `'pending'` 一律归 `archived`） |
| reviewHistory | array | 否 | 审阅留痕（打回记录：`{decision:'reject',note,by,at}`；读取侧归一为数组，默认空数组） |

**依据**：`content/04_web_design/data/DATA_MODEL.md:997-1013`、`server/system-notice-kinds.js:63-80`。

### 4.30 成员档案（PersonRecord）

**对应服务端表**：`users`（**支部成员主数据实体**：名册、应到、考勤、表决、通知受众、党小组归组的共同上游）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（`p_<hex>` 或示例中 `p1`…`p50`） |
| name | string | 姓名（**必填**） |
| studentId | string | 学号；支部内唯一；**同时作为登录账号** |
| enrollYear | string | 届别 / 入学年份（识别毕业批次；登记流入时采集） |
| partyGroup | string | 党小组归属；**空字符串即「未分组」**（不属任何党小组） |
| developStage | string | 发展阶段（枚举单一源 `DEVELOP_STAGES`＝积极分子 / 发展对象 / 预备党员 / 正式党员） |
| role | string | 角色键（枚举单一源 `ROLE_KEYS`，见 §2.1） |
| branchId | string | 所属支部 |
| residenceStatus | string | 在册状态（枚举单一源 `RESIDENCE`＝`在校` / `滞留`；**未标注＝默认在校**） |
| residenceNote | string | 滞留备注（仅滞留态保留） |
| residenceHistory | array | 在册状态变更留痕（`{from,to,updatedBy,updatedAt,note?}`） |

**服务端「移出」流程追加的字段（代码为准）**：`transferOut`（true＝已转出软标记，**登录与在途会话一律拒绝**）、`transferredOutAt`、`removedAt`、`removedBy`、`transferOutNote`；另有 `email`（**字段预留，示例数据中没有**，用于邮件通知收件人）。
**行为口径（4 条）**：① 写口白名单见 `server/routes/member.js` 的 `PROFILE_FIELDS` / `CREATE_FIELDS`；② **新增成员即自动建号**（账号＝学号，口令＝支部统一默认口令），成员流出一并停用；③ 变更分流——姓名/学号/党小组**立即生效**，发展阶段/在册状态须走「组织委员发起 → 支书确认」确认链，**流出登记登记即生效、不走确认链**；④ `partyGroup` 为空即未分组：党小组会应到**不含**，支部大会应到**照计**，表决名单**照计**。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1015-1040`、`server/routes/member.js:198-201,259-323`、`server/routes/auth.js:32,75`、`server/services/mailer.js:93-106`。

### 4.31 党小组（PartyGroup）

**对应服务端表**：`party_groups`（由「成员档案字段的取值集合」升为**一等实体**）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（服务端生成前缀 `pg`） |
| branchId | string | 所属支部（**支部级清单**，各支部各一份） |
| name | string | 组名；新增默认「第 N 党小组」（N 由 seq 派生），可改名；**同一支部内唯一** |
| seq | number | 序号（排序与默认命名用） |
| status | string | `active` / `dissolved` |
| createdAt / createdBy | string | 成立时间与经手人 |
| dissolvedAt / dissolvedBy | string | 解散时间与经手人 |
| note | string | 备注（解散原因等） |
| history | array | 变更留痕（新增 / 改名 / 解散 / 组长变更） |

**行为口径**：写权＝支书 + 副支书；**解散**允许解散非空组（组内成员 `partyGroup` 批量置空 + status 置 dissolved + 留痕）；**改名**同步批量改写组内成员档案；**组长不落本实体**（由成员档案 `role='leader'` + 党小组归属派生）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1042-1066`、`server/routes/resources.js:86`。

### 4.32 成员流动台账（MemberFlow）

**对应服务端表**：`member_flows`（**流入 / 流出的复式记账**）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（服务端生成前缀 `mf`） |
| branchId | string | 所属支部 |
| direction | string | `in`（流入）/ `out`（流出） |
| personId | string | 关联成员档案 id |
| name / studentId / enrollYear | string | 登记时快照（人档案变更后仍可回看当时口径） |
| date | string | 流动发生日期 |
| operatorId | string | 登记人 |
| note | string | 备注（毕业去向、转入来源等自由文本） |
| revokedAt / revokedBy | string | 撤销留痕（撤销后不计入对账） |

**对账恒等式**：期初在册 + 流入合计 − 流出合计 ＝ 当前在册（台账页表头固定展示该对账行）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1068-1092`、`server/routes/resources.js:88`。

### 4.33 匿名反馈核查留痕（IssueReveal）

**对应服务端表**：`issue_reveals`（**仅服务端表**：无前端持久化域、不进快照写穿、**无通用 CRUD**）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键（`reveal-<8 位随机>`） |
| by | string | 查看人 personId |
| byRole | string | 查看人角色键（**恒为 `party-staff`**；非党委请求在路由层已 403，不会留下记录） |
| at | string | 查看时间（ISO） |
| revealedIds | string[] | 本次查看命中的**匿名**反馈 id 列表（实名条目真身本就公开，不计入） |

**表只增不改**：写入唯一入口＝`GET /api/v1/issues/reveal`（命中即写一条，与返回值同一次发生）。
**依据**：`content/04_web_design/data/DATA_MODEL.md:1096-1114`、`server/routes/resources.js:700-721`、`server/db.js:37-41`。

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

**依据**：`server/routes/member.js:106-117`、`docs/src/core/constants.js:206`。

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

### 4.39 报名记录（Signup，**来源 C·2026-09-19 批次 98 补**）

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
**种子**：服务端**有**种子（`server/seed.js:62` 从 `docs/src/mock/seed.js::SEED_SIGNUPS` 播种 7 条）。
**依据**：`docs/src/services/signup.js:4-8,73-86`、`docs/src/mock/seed.js:46-59`、`server/seed.js:62`、`server/routes/resources.js:36,158`。

### 4.40 宣传任务（PropTask，**来源 C·2026-09-19 批次 98 补**）

**对应服务端表**：`prop_tasks`（资源名 `propTasks`，新建 id 前缀 `ppt`）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `ppt`（种子里为 `pt1`…`pt8`） |
| source | string | 是 | 任务来源（如「支部委员会」「副支书」「组织委员」，自由文本） |
| type | string | 是 | 任务类型（新闻稿 / 推送排版 / 素材归档 / 周报报送） |
| summary | string | 是 | 任务摘要 |
| status | `'pending'\|'in_progress'\|'submitted'` | 是 | 状态流转：待接收 → 进行中 → 已提交（只前进、不后退） |
| createdAt | string（YYYY-MM-DD） | 是 | 创建日期 |

**服务端无种子**（`server/seed.js` 未播种本表）；示例数据在前端 `PROP_TASKS_SEED`（宣传台「宣传任务」页首次渲染时兜底注入 `mockDB`）。⇒ **API 形态首启本表为空**，与公开演示形态不一致，**如实登记**。
**依据**：`docs/src/entries/tabs/prop/tasks-tab.js:10-19,29-36,99`、`docs/src/core/domain.js:279`、`server/routes/resources.js:39,159`。

### 4.41 文件外发确认（ExternalDispatch，**来源 C·2026-09-19 批次 98 补**）

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
**依据**：`docs/src/services/external-dispatch.js:31-42,61-69,72-74`、`docs/src/core/domain.js:286`、`server/routes/resources.js:42,160`。

### 4.42 支部文件（BranchDoc，**来源 C·2026-09-19 批次 98 补**）

**对应服务端表**：`branch_docs`（资源名 `branchDocs`，新建 id 前缀 `bd`；**通用写口＝支委层**，见 §2.3.3）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | 唯一标识符，前缀 `bd` |
| purpose | `'doc'\|'institution'` | 否 | 用途：普通文件 / 制度文本（**旧数据无此字段一律按 `doc` 兼容**） |
| title | string | 是 | 标题 |
| desc | string | 否 | 描述（默认空串） |
| cat | string | 否 | 分类（普通文件 `party-doc` / 制度文本 `institution`） |
| status | `'draft'\|'current'\|'disabled'\|'archived'` | 否 | 状态：普通文件缺省 `draft`（会前草案）；制度文本 `current` 现行 / `disabled` 停用；历史版本 `superseded` **只出现在 `versions` 内、不驻留顶层** |
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

**写权分层**：新建 / 上传新版 / 停用启用**制度文本**＝支书 + 副支书（`INSTITUTION_MANAGER_ROLES`）；普通文件与其余资源写走**支委层**（`COMMISSIONER_WRITE = {'branchDocs'}`）。**删除记录会联动删物理文件**（§5.5 第 14 条同源口径）。
**依据**：`docs/src/services/branch-doc.js:15-21,101-136,150-196,204-227,241-258,296-297`、`server/routes/resources.js:45,162,206,280-286`。

### 4.43 子记录聚合域（actSubRecords / tfSubRecords，**来源 C·2026-09-19 批次 98 补**）

**对应服务端表**：`act_sub_records` / `tf_sub_records`（资源名 `actSubRecords` / `tfSubRecords`，新建 id 前缀 `asr` / `tfs`）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | 是 | **恒为 `'__root__'`**（聚合域约定的单行外壳，**不是主记录 id**） |
| body | object | 是 | 整域数据：`{ [主记录id]: { attendance?:[], materials?:[], publicity?:[] } }`（子记录树三种类型见 §4.2） |

**存储形态（后端须照做）**：这两张表**整域只存一行**——`{id:'__root__', body:<原对象>}`；前端 `init()` 拉取时按 `id==='__root__'` 解包回 `mockDB.actSubRecords` / `tfSubRecords` 对象，全量快照写穿时再包回单行。⚠ **不能按「一主记录一行」拆表而不改前端**——前端契约就是 `__root__` 单行。
**依据**：`server/routes/resources.js:43-44,161`、`docs/src/core/data-adapter.js:53-54,441-451,513-514,543-544`。

### 4.44 归档记录（archive_records，**来源 C·2026-09-19 批次 98 补**）

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

**服务端种子**：**有**（`server/seed.js:61` 从 `docs/src/mock/seed.js::SEED_ARCHIVE_RECORDS` 播种 6 条）。
**依据**：`docs/src/mock/seed.js:37-44`、`docs/src/entries/tabs/prop/archive-tab.js:873-892`（运行时新建）、`docs/src/services/secretary-overview.js:594`（`secretaryConfirmedAt` 读）、`docs/src/entries/tabs/secretary/todo-tab.js:737`（写）、`server/seed.js:61`、`server/routes/resources.js:44,161`。

---

## §5 部署环节

### 5.1 运行依赖

| 项 | 要求 | 依据 |
|---|---|---|
| Node.js | **根说明写 `Node ≥ 22`**；部署文档写「Node 18+」；**`server/package.json` 未声明 `engines`**（两处说法不一致，以实际运行环境为准，建议按 ≥ 22 准备） | `README.md:12`、`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:50`、`server/package.json` |
| 运行依赖（4 个） | `express ^4.19.0`、`better-sqlite3 ^12.0.0`、`multer ^1.4.5-lts.1`、`nodemailer ^9.0.6` | `server/package.json:14-19` |
| 开发依赖（仅测试用） | `playwright 1.60.0`（**锁定版本**）；全新环境需先 `npx playwright install chromium` 下载浏览器 | `server/package.json:20-22`、`server/README.md:43` |
| 前端依赖 | **无**——原生 ESM，**无打包器、无构建步骤**，浏览器直接加载 `docs/src/*.js` | `README.md:12`、`README.md:199` |
| 编译工具 | `better-sqlite3` 为原生模块，安装时可能需要本机编译工具链（或在有预编译包的平台安装） | 未取证（本仓未记录） |
| 数据库 | **无需外部数据库服务**——SQLite 单文件（内置） | `server/README.md:25` |

### 5.2 启动与构建方式

```bash
cd server
npm install                 # 安装依赖
npm start                   # 启动服务，默认端口 3000（PORT 可覆盖）
```

- **无构建步骤**：不需要 `npm run build`，前后端都是源码直接运行。
- 启动入口 `server/server.js`：初始化数据库 → **空库自动导入示例种子**（`DISABLE_SEED=1` 时跳过）→ 起服务 → 启动定时任务（每日 03:00 批量上报 + 每 10 分钟会议提醒扫描）。
- 启动后访问 `http://127.0.0.1:3000/login.html`。
- **测试**：`npm test`（全量）/ `npm run test:core` / `npm run test:fast` / `npm run clean:tmp`。测试脚本自带 `DISABLE_PASSWORD_CHECK=1` 注入。
- **前端 API 形态启用路径**：登录表单 → 本地 Mock 校验（学号 → personId）→ `POST /api/v1/auth/login`（**传 personId + password**）→ 拿到 token → 写入 `sessionStorage['gsm1921-api-token']` → 切换为 API 数据源；**失败静默降级为本地 mock 模式**。
- 静态托管形态（无后端）：把 `docs/` 当 Web 根目录即可，`docs/src/config/deploy.js` 保持 `DEPLOY_MODE = 'static'`；**Node 形态下由服务端动态注入**该文件为 `DEPLOY_MODE = "server"`（见 §6.12）。

**依据**：`server/server.js:1-23`、`server/README.md:5-19`、`:31-33`、`server/app.js:55-57`、`server/package.json:6-13`。

### 5.3 环境变量清单（共 18 项，**全部有缺省值**）

> ⚠ **重要**：**服务端自身不读取 `.env` 文件**（没有 dotenv 依赖）——`.env.example` 只是模板，需在启动脚本/容器/进程环境中注入。

| # | 变量 | 含义 | 是否必填 | 缺省 | 依据 |
|---|---|---|---|---|---|
| 1 | `PORT` | 服务监听端口 | 否 | `3000` | `server/server.js:8` |
| 2 | `DB_PATH` | SQLite 数据库文件路径（`:memory:` 为内存库，测试用） | 否 | `server/data.db` | `server/server.js:9`、`server/.env.example:9` |
| 3 | `DISABLE_SEED` | 置 `1` 时**空库也不导入演示种子**（真实部署务必开） | 否 | 未设置（＝播种） | `server/server.js:12-18` |
| 4 | `LOGIN_PASSWORD` | **统一登录口令**（所有账号共用），`/auth/login` 校验用 | 否 | `123456` | `server/routes/auth.js:17` |
| 5 | `DISABLE_PASSWORD_CHECK` | 置 `1` 时**跳过口令校验**，仅凭 personId 即可登录（**生产勿开**） | 否 | 未设置（＝校验） | `server/routes/auth.js:12-14` |
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
| 18 | `UPLOAD_DIR` | 附件上传目录（相对路径按**进程启动目录**解析，与 `DB_PATH` 同口径）；**部署时须可写、须与 `data.db` 一并备份** | 否 | `server/uploads`（按模块位置解析，非 cwd） | `server/routes/uploads.js:15-17`、`server/.env.example:10-12` |

> 另有**部署文档提到但代码中未使用**的变量，**未取证**（不要照抄）：`AI_API_BASE_URL`（AI 推理服务，见 `DEPLOYMENT_GUIDE.md:239`——在代码中未检索到消费点）。另有 `SEED_FALLBACK`：它是**前端构建期常量**（`docs/src/config/deploy.js:16`），**不是环境变量**。

### 5.4 数据存储形态

| 数据 | 位置 | 形态 | 依据 |
|---|---|---|---|
| 业务数据 | `server/data.db` | **SQLite 单文件**（WAL 日志模式）。业务表统一 `(id TEXT PRIMARY KEY, data TEXT NOT NULL)`——**整条记录序列化在 `data` 里的 JSON 字符串** | `server/db.js:62`、`:64-66` |
| 会话 | 同上，`sessions` 表 | 关系表（`token` / `person_id` / `created_at`） | `server/db.js:45-49` |
| 附件元数据 | 同上，`attachments` 表 | 关系表（文件名/路径/大小/上传人/时间） | `server/db.js:50-57` |
| 附件物理文件 | `server/uploads/`（可用 `UPLOAD_DIR` 改） | 磁盘文件，文件名＝`<uuid>.<ext>`；**首次启动自动创建目录** | `server/routes/uploads.js:18`、`:54-57` |
| 前端静态文件 | `docs/` | 由 Express 静态托管（**强制 `Cache-Control: no-cache, must-revalidate`**） | `server/app.js:63-66` |
| 备份 | —— | **备份＝复制 `data.db` 单文件 ＋ 附件目录（`UPLOAD_DIR`，缺省 `server/uploads/`）**（WAL 模式下建议同时带上 `-wal`/`-shm`，或先停服再复制）——**只备 `data.db` 会丢附件物理文件**（表里只存元数据） | `server/README.md:25`；WAL 见 `server/db.js:62`；附件目录见 §5.4 上一行 |
| 重置 | —— | **API 形态下 `?reset=` 三档不生效**；服务端重置＝删除 `server/data.db` 后重启自动重种，或 `DISABLE_SEED=1` 空库起步 | `server/README.md:19` |

### 5.5 服务器侧注意事项 / 限制（**请逐条核对**）

| # | 事项 | 说明 | 依据 |
|---|---|---|---|
| 1 | **资源列表读口需登录** | `GET /api/v1/<资源名>`（30 个）与 `GET /api/v1/bootstrap` **默认要登录**（未登录 401）；**唯一公开的资源读口＝`GET /api/v1/issues`**（处置结果公开可见，出口已脱敏）；`GET /api/v1/health` 公开。**白名单口径＝「有明确裁定公开的才公开」**，故 `users`（含姓名/学号）、考勤、考察、思想汇报、附件元数据等**一律不再公开**。**2026-09-18 批次 81 收紧前**为「全部公开」（那是本文件旧版所记的现状） | `server/routes/resources.js:187-200`（逐表读口）、`:416`（bootstrap）、`:695`（issues 公开） |
| 2 | **多数写口仅要求登录** | 30 类资源里只有 `branchDocs` 用支委门；其余（`activities` 除外有专门写门）**默认「登录即可写」**——普通成员可写 `todos`/`attendances`/`inspections`/`taskforces` 等 | `server/routes/resources.js:206-208` |
| 3 | **无 CORS 配置** | 未挂载 CORS 中间件 → 只能**同源部署**（前端与 API 同一域名/端口）；跨域调用会被浏览器拦截 | `server/app.js`（无 cors 挂载） |
| 4 | **无 HTTPS** | 服务自身只提供 HTTP；token 明文传输。真实部署应由反向代理终止 TLS | `server/server.js:21`；HTTPS 为对接前置条件见 `DEPLOYMENT_GUIDE.md:202` |
| 5 | **token 无过期时间** | `sessions` 表**没有过期字段**，退出登录靠显式 `POST /auth/logout` 删行；账号流出（`transferOut`）会使在途会话失效 | `server/db.js:45-49`、`server/routes/auth.js:74-77` |
| 6 | **无全局限流** | 只有意见反馈提交按 `tokenHash` 做频率窗口（10 分钟内 20 条）与判重（5 分钟同内容） | `server/routes/resources.js:691-693`、`:744-746` |
| 7 | **单进程 / 单文件库** | `better-sqlite3` 为同步 API；**不支持多实例并行写同一库**（横向扩容需改架构） | `server/db.js:2`、`:62` |
| 8 | **静态资源不缓存** | 响应头强制 `no-cache`（开发/测试期防旧模块），生产环境需评估带宽影响 | `server/app.js:63-66` |
| 9 | **请求体上限** | JSON 体 **2MB**；`/snapshot` 原始体 **4MB**（gzip 压缩体）；上传单文件 **10MB** | `server/app.js:22-23`、`server/routes/uploads.js:52` |
| 10 | **进程须常驻** | 定时任务（每日 03:00 上报 / 每 10 分钟会议提醒）依赖进程长期运行；进程需用 systemd / pm2 / 容器守护 | `server/server.js:22-23`、`server/services/reporting.js:229-249` |
| 11 | **邮件通道当前恒不生效** | 收件人从成员档案 `email` 字段读取，而**示例数据没有 `email` 字段** → 全部静默跳过（补上字段后自动生效，无需改代码） | `server/services/mailer.js:93-106`、`server/services/mailer-hooks.js:41` |
| 12 | **上报「默认拉取」** | 未配置 `REPORT_WEBHOOK_URL` 时 `/report/trigger` 返回 **409**（提示改用拉取模式） | `server/routes/report.js:20-22` |
| 13 | **附件下载需登录 ＋ 支部隔离** | `POST /api/v1/uploads` **＝支委层**（`requireCommissioner`，2026-09-18 批次 80 前为「登录即可上传」）；`GET /api/v1/uploads/:name` 需要登录、只取 basename（防路径穿越），并按**上传人所属支部**做隔离（党委跨支部可见；无记录 404）。⚠ 隔离判据是「**上传人现在所属支部**」——`attachments` 表**无支部字段**，故同一人换支部后其历史附件会跟着换支部 | `server/routes/uploads.js:69`、`:88-100` |
| 14 | **删除活动会级联删除子数据** | 删活动会连带删除其 `tasks`/`attendances`/`inspections`/`assignments`/`activity_reviews`/`makeup_tasks`，以及关联的报名与通知——**不可撤销** | `server/routes/resources.js:289-307` |
| 15 | **配置写留痕上限 100 条** | 超出后裁剪最早条目（低频可回滚，历史不改写） | `server/routes/resources.js:12,592` |
| 16 | **演示支委名单硬编码** | `COMMITTEE_IDS = ['p10','p11','p12','p13','p14']` 是**示例支部的支委 personId**，被成员变更广播与「旧活动表决名单兜底」引用；真实部署必须同步替换 | `docs/src/core/constants.js:206`、`server/routes/member.js:107`、`server/routes/committee.js:89` |
| 17 | **默认支部 id 硬编码兜底** | 大量读写在 `branchId` 缺省时回退常量 `'br-b1'`（示例支部 id）；真实部署若用别的 id，须保证所有写入都带 `branchId` | `server/routes/resources.js:103,665,754`、`server/routes/member.js:103,203` |

### 5.6 部署到真实环境需要替换的东西

| # | 要替换的 | 做法 | 依据 |
|---|---|---|---|
| 1 | **示例成员与账号** | 换 `docs/src/mock/people.js`、`accounts.js`、`branches.js`、`party-groups.js`、`activities.js`、`notices.js`、`taskforces.js`、`seed.js`；或**空库起步**（`DISABLE_SEED=1`）后从系统内录入 | `server/seed.js:41-83`、`README.md:164` |
| 2 | **登录口令** | 设 `LOGIN_PASSWORD`（**并确认未开 `DISABLE_PASSWORD_CHECK`**）；接入学校统一认证（IAAA）时替换 `POST /auth/login` 的校验逻辑 | `server/routes/auth.js:12-18`、`DEPLOYMENT_GUIDE.md:209,217` |
| 3 | **演示支委名单 / 默认支部 id** | `COMMITTEE_IDS` 与 `'br-b1'` 兜底常量（见 §5.5 第 16、17 条） | 同上 |
| 4 | **示例反馈种子** | `docs/data/issues.json`（服务端播种时读取；内部汇报型不脱敏、公开型脱敏） | `server/seed.js:19-39`、`:67` |
| 5 | **组织名称 / 主题 / 术语** | 支部名与 `config.headerTitle`；主题预设 `themePreset`（需支书特批的配色见 `COLOR_SYSTEM.md`）；术语权威源 `content/03_doc_system/USAGE_POLICY.md` | `README.md:158-172` |
| 6 | **制度参数默认值** | `docs/src/core/policy-defaults.js`（支部可调项）；制度固定项勿改 | `docs/src/core/policy-defaults.js:6-15` |
| 7 | **关闭演示数据回退（防污染真实账本）** | ① `DISABLE_SEED=1`；② 前端 `docs/src/config/deploy.js` 的 `SEED_FALLBACK` 改 `false`；③ 按部署文档附录 A.2 逐项关闭 services 层 **9 处空表回退** | `DEPLOYMENT_GUIDE.md:251`、`docs/src/config/deploy.js:11-16` |
| 8 | **平台对接地址** | `REPORT_WEBHOOK_URL` / `REPORT_TOKEN` / `REPORT_BASE_URL` / `REPORT_ADMIN_MAIL`；邮件 `SMTP_*` | `server/.env.example:19-32` |
| 9 | **API 基址** | 前端切换 API 形态时的 `apiBaseUrl`（`services/runtime.js` 的 `setDataSource('api', {...})`），对接计算中心域名 | `DEPLOYMENT_GUIDE.md:124-134` |
| 10 | **学校侧要提供的环境** | 域名 + ICP 备案、数据库、API 服务器、HTTPS（责任方为支书/计算中心） | `DEPLOYMENT_GUIDE.md:195-202` |
| 11 | **未接入项（需另行开发）** | ① 北大党校 / 智慧党建平台的数据同步（**规划，无代码**）；② 微信小程序（**规划，无代码**）；③ AI 本地推理（**规划**）；④ 北大 IAAA 单点登录（门控已预留落点，**未接入**） | `DEPLOYMENT_GUIDE.md:51-52,85-88,219-242` |

---

## §6 接口一览

> **基础路径**：`/api/v1`（认证路由挂在 `/api/v1/auth`）。**认证方式**：`Authorization: Bearer <token>`（token 由登录接口签发）。
> **数量口径（2026-09-19 批次 98 逐条核过、算式已改准）**：**显式声明的路由 38 条**——＝各路由文件的 `router.*` 声明 **40 条**（`server/routes/` 实测 40，其中 **4 条在通用资源循环里**）**减去那 4 条循环声明** 得 **36 条**，**再加 `server/app.js` 的 2 条**（`GET /api/v1/health`、`GET /src/config/deploy.js`，见 §6.12）；其中「通用资源 CRUD」是**循环注册**的（30 个资源名，见 §6.2），**循环展开 119 条**（GET 30 ＋ POST 29〔跳过 `branches`，它的 POST 走 §6.3 语义端点〕＋ PATCH 30 ＋ DELETE 30）。**展开后总路由数＝38 ＋ 119 ＝ 157 条**（原式「38 − 4 个循环族 + 119」把已在 38 里扣过的循环族又扣了一次，属算式笔误，本批改准；结论 157 不变）。

### 6.1 认证（`server/routes/auth.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/auth/login` | 登录：body `{personId, password}` → 返回 `{token, user}`；未知人员/口令错/账号已流出 → 401 | 公开 |
| POST | `/api/v1/auth/logout` | 注销：删除当前 token 会话 → 204 | 公开（带 token 才有效） |
| GET | `/api/v1/auth/me` | 取当前登录人档案 | 需 token（否则 401） |

### 6.2 通用资源（读 + CRUD，`server/routes/resources.js` 循环注册）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/<资源名>` | 列全表（JSON 数组） | **需登录**（30 个资源名**一律**；未登录 401。唯一公开的资源读口＝`GET /api/v1/issues`，见 §6.9） |
| POST | `/api/v1/<资源名>` | 新建单条；缺 `id` 时服务端生成 | 需登录（`branchDocs` 例外＝支委门）+ 资源写角色门（若有） |
| PATCH | `/api/v1/<资源名>/:id` | 局部合并更新 | 同上 |
| DELETE | `/api/v1/<资源名>/:id` | 删除（文件类资源联动删物理文件；删活动级联删子记录） | 同上 |

**资源名 ↔ 表名 ↔ id 前缀（30 个）**：

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
| 12 | `complianceReferences` | `compliance_references` | `cr` |
| 13 | `fileSpaceRecords` | `file_space_records` | `fs` |
| 14 | `imageRecords` | `image_records` | `img` |
| 15 | `signups` | `signups` | `su` |
| 16 | `activityReviews` | `activity_reviews` | `arw` |
| 17 | `taskforceReviews` | `taskforce_reviews` | `tfr` |
| 18 | `propTasks` | `prop_tasks` | `ppt` |
| 19 | `weeklyReports` | `weekly_reports` | `wr` |
| 20 | `archiveRecords` | `archive_records` | `ar` |
| 21 | `externalDispatches` | `external_dispatches` | `ed` |
| 22 | `actSubRecords` | `act_sub_records` | `asr` |
| 23 | `tfSubRecords` | `tf_sub_records` | `tfs` |
| 24 | `branchDocs` | `branch_docs` | `bd` |
| 25 | `branches` | `branches` | `br`（**POST 不走本条，见 §6.3**） |
| 26 | `appointmentRecords` | `appointment_records` | `appt` |
| 27 | `reviewRequests` | `review_requests` | `rq` |
| 28 | `thoughtReports` | `thought_reports` | `tr` |
| 29 | `partyGroups` | `party_groups` | `pg` |
| 30 | `memberFlows` | `member_flows` | `mf` |

> `users` 的 `POST/PATCH/DELETE` 门＝**仅 `party-staff`**；`branches`/`appointmentRecords` 同理。**依据**：`server/routes/resources.js:21-58`（映射）、`:77-89`（写门）、`:153-171`（id 前缀）。
> **GET 读口（2026-09-18 批次 81 收紧）**：30 个资源名**默认要登录**，**唯一留白名单的是「有明确裁定公开」的 `issues`**（且它不在这 30 个里，是独立语义端点）；**`branches` 不放行**（2026-09-18 裁定：批次 80 对它的判断标注为「存疑」⇒ 按「不放行」处理，宁严勿松）。**依据**：`server/routes/resources.js:187-200`。

### 6.3 支部与配置（`server/routes/resources.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/branches` | 语义创建支部：`{mode:'empty'\|'copy', sourceId?, name?, type?}` → 201 `{branch, ok:true}` | 需登录 + **仅 `party-staff`** |
| PATCH | `/api/v1/branches/:id/config` | 写支部配置：`config` 收 `modules`/`blocks`/`workforce`/`headerTitle`/`desc`/`themePreset`/`policyOverrides`；可选 `why`（写留痕） | 需登录 + 全量权（党委 / 本支部现任支书 / 本支部副支书）或域负责人（仅本域 `policyOverrides`） |
| PATCH | `/api/v1/branches/:id/config/rollback` | 配置单键回滚：`{targetEntryAt?\|index?, why?}` | 同上门（**不含域负责人**） |
| POST | `/api/v1/activities/:id/archive` | 活动归档（`archived=true`），并级联把该活动未完成任务置为已完成 | 需登录 |
| POST | `/api/v1/activities/:id/brand` | 切换活动品牌标记 `isBrand` | 需登录 |

### 6.4 全量读写

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/bootstrap` | 一次拉取全部资源的列表（**与逐表读等价**；前端 `init()` 实走 10 个逐表读口，**不经本口**——本口供外部对接/测试用） | **需登录**（与逐表同门；2026-09-18 批次 81 前为公开） |
| POST | `/api/v1/snapshot` | **全量快照写穿**：整表替换（前端 `persist()` 的落库目标）；支持 gzip 请求体 | 需登录 |

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

**已注册的 kind（共 20 种；2026-09-19 批次 98 逐条核过、改准）**：`thought-report-submitted`（思想汇报已提交）、`attendance-confirmed`（考勤已确认归档）、`activity-agenda-updated`（议程已更新）、`member-change-approved`（成员变更已审批）、`workforce-proposal-created` / `workforce-proposal-adopted`（支部分工议题待表决 / 已生效）、`committee-vote-progress` / `committee-vote-locked`（表态进度 / 表决截止）、`project-auth-granted`（赋权通知）、`external-dispatch-created`（材料外发待确认）、`weekly-report-submitted`（**周报已报送、待支书审核**，2026-09-19 批次 94 新增，裁定 `D-507`）、`review-request-submitted` / `review-request-decided`（支部上报待批复 / 上报结论）、`activity-created-broadcast`（活动已创建请建核心群）、`taskforce-vote-requested`（专班议案排入待表态）、`review-overdue-reminder` / `review-resubmit-reminder`（复盘超期 / 重提提醒）、`activity-notice-draft` / `taskforce-notice-draft`（活动 / 专班预拟通知）、`committee-dispatch`（党委下发）。
**依据**：`server/system-notice-kinds.js:57-293`（`KINDS` 注册表，20 个键）、`:205-212`（`weekly-report-submitted`）。

### 6.8 组长台聚合读（`server/routes/leader-progress.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/leader/member-progress?personIds=p4,p5&today=YYYY-MM-DD` | **服务端汇总**指定人员的进展：`{rows:[{personId, active, overdue, absent, inspPending, reportState, reportKind, reportTitle}], today}`；`personIds` 必填，缺 → 400 | 需登录 |

### 6.9 意见反馈（`server/routes/resources.js` 语义端点）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| GET | `/api/v1/issues` | 公开读反馈列表（**一律脱敏，不含提交人真身**） | **无门（公开）** |
| POST | `/api/v1/issues` | 提交反馈：`{title, body, scope, types[], anonymous?, submitterToken?}`。字段缺失 400；超频 429；重复 409。**匿名亦落库真实提交人 `_realPersonId`** | 需登录 |
| PATCH | `/api/v1/issues/:id` | 处置/回复：白名单字段局部合并（`status`/`closedReason`/`assignee`/`dispatchHistory`/`comments`/`hidden`/`mergedInto`…）；**读取原始记录后只合并白名单字段、原样写回**（不会抹掉真身） | **仅支书** |
| GET | `/api/v1/issues/reveal` | **查看匿名反馈的真实提交人**；命中即写一条 `issue_reveals` 留痕 | 需登录 + **仅 `party-staff`**（非党委 403） |

### 6.10 附件（`server/routes/uploads.js`）

| 方法 | 路径 | 用途 | 权限门 |
|---|---|---|---|
| POST | `/api/v1/uploads` | 上传附件（multipart，字段名 `file`；允许类型 jpg/jpeg/png/pdf/doc/docx/xlsx/mp4，单文件 ≤10MB）→ 201 元数据 `{id, filename, path, size, uploadedBy, uploadedAt}`；类型不支持/为空 → 400 | 需登录 + **支委层**（`requireCommissioner`；2026-09-18 批次 80 收紧前为「登录即可上传」） |
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

---

## §7 已知限制与未实现项（**如实列出**）

> 本节只写**能在代码/文档里指到出处**的项。凡我无法取证的，一律注明「未取证」，不用「应该是」。

### 7.1 安全与权限类（**最需要后端注意**）

| # | 项 | 现状 | 依据 |
|---|---|---|---|
| 1 | **资源列表读口已收紧（需登录）** | `GET /api/v1/<资源名>`（30 个）与 `/bootstrap` **默认要登录**（未登录 401）；**唯一公开的资源读口＝`GET /api/v1/issues`**（出口脱敏）。**2026-09-18 批次 81 前**为「不需要登录、直接返回全表 JSON」——那时 `users`（含姓名与学号）等可被未登录者全量列举。**仍留的读侧缺口是跨支部**（见第 2 条） | `server/routes/resources.js:187-200`、`:416`（bootstrap）、`:695`（issues 公开） |
| 2 | **服务端不做支部级读取过滤** | 列表读是「整表返回」；支部归属过滤（`withinBranch`）由**前端**做。同一台服务器上若存在多个支部，任一**已登录**读者可拿到全部支部的数据 | `server/routes/resources.js:60-62`（`listTable` 全表）、`:665`（注释原文：「支部归属（2026-09-15 裁定）：写入取 actor.branchId；**读取过滤在前端 withinBranch**」）、`docs/src/services/visibility.js`（可见性在前端计算） |
| 3 | **多数资源写口只要求登录** | 30 类资源中仅 `branchDocs` 使用支委门；`activities` 有专门活动写门；其余（`tasks`/`attendances`/`inspections`/`taskforces`/`todos`/`signups`/`weeklyReports`…）**任意登录成员均可 POST/PATCH/DELETE**。代码注释称「未设门：由既有 writeAuth 把关」，而 `writeAuth` 对它们就是 `requireAuth` | `server/routes/resources.js:92-94`、`:206-208` |
| 4 | **活动写门是有意留白** | 活动写门已拒「非支委层」，但**支委层的既有功能位（宣传归档、议程/结果编辑、状态更新）保持放行**——注释明确写「是否进一步收紧为『仅支书/副支书/党小组组长』列入待支书裁（避免误伤归档/议程链路）」 | `server/routes/resources.js:136-150`（尤其 141-142 行） |
| 5 | **token 无过期 / 无刷新机制** | 会话表无过期时间字段；仅显式 logout 或账号流出时失效 | `server/db.js:45-49`、`server/routes/auth.js:74-77` |
| 6 | **口令是「全支部统一口令」** | 所有账号共用 `LOGIN_PASSWORD`（缺省 `123456`）；系统**没有个人密码**概念。「新增成员自动建号」也是用这个统一口令 | `server/routes/auth.js:15-18`、`content/04_web_design/data/DATA_MODEL.md:1038` |
| 7 | **无 CORS / 无限流 / 无 HTTPS** | 同 §5.5 第 3、4、6 条 | 同左 |
| 8 | **前端限权 ≠ 服务端限权（多处）** | 对比示例：前端 `ROLE_PERMISSIONS` 判定的 `record_attendance`、`fill_review`、`dispatch_line` 等键在**服务端并无对应校验**（服务端只做上表的粗粒度门）；反之服务端的支部级校验（`actor.branchId`）在前端 mock 形态无对应实现 | `docs/src/services/auth.js:76-84`（前端键集）vs `server/routes/resources.js:77-120`（服务端门集） |

> **具体一例（前后端门不一致，后端须按服务端口径实现）**：独立档案页 `docs/person.html` 的 `EDIT_ROLES`（`docs/src/entries/person-entry.js:74`）＝`secretary / deputy-secretary / org-commissioner`，即**前端对支书、副支书放开了「编辑档案」**；而它写档走 `PATCH /api/v1/members/:id/profile`，服务端该门**只要组织委员**（`server/routes/member.js:230`，`ORG_COMMISSIONER_ROLES`）。⇒ **API 形态下支书 / 副支书在成员档案页对治理外字段点「编辑档案」会被服务端 403**（组织委员身份正常）。**这是代码里的既有一处不一致**（批次 87 真机发现并如实登记，`D-485` 批次的审计发现栏；非本文件笔误、也非本批引入）。要收口只有两条路——**把该 PATCH 门放开支书 / 副支书**，或**反过来收窄前端 `EDIT_ROLES`**——两条都改权限面，**本文件不替裁**；**当前后端按服务端（仅组织委员可写）实现**。

### 7.2 功能「有定义但跑不到」类

| # | 项 | 现状 | 依据 |
|---|---|---|---|
| 9 | **系列活动（SeriesRecord）无实现** | 数据模型有完整字段定义，但**前端 mockDB 无该域、服务端无该表、无任何读写入口** | `content/04_web_design/data/DATA_MODEL.md:257-279`（定义）；`docs/src/core/domain.js:215-333`（mockDB 全部域，**无 series 键**）；`server/db.js:9-42`（35 张资源表，无 series） |
| 10 | **`timeOffset: null` 的任务永不实例化** | `sopData.js` 中确有 **24 条**任务的 `timeOffset` 为 `null`（组织类场景）；而**两个消费口都显式过滤掉 null**：（a）SOP 推演 `instantiateSOP` 里 `if (task.timeOffset === null) return;`；（b）决策树时间轴展示 `scenario.tasks.filter(t => t.timeOffset !== null)`。⇒ 这 24 条任务**在系统内不会被实例化为任务/待办** | `docs/src/workflow/sopData.js:117-133` 等（24 处 `timeOffset: null`）、`docs/src/workflow/sop.js:20`、`docs/src/services/decision-tree.js:243` |
| 11 | **`outputBlocks.blockOrder` 无 UI 写入口** | 产出块的排序能力（纯函数侧）存在，但**没有界面可写**——原设计里的拖拽排序画布已于 2026-09-03 裁定撤销，向导保存时恒写 `[]`。「能力在、入口无」 | `content/04_web_design/data/DATA_MODEL.md:942`（原文标注） |
| 12 | **活动字段 `deliverableIds` 已废弃** | 字段仍在模型中（标注为废弃），交付物实际由「文件空间记录」覆盖 | `content/04_web_design/data/DATA_MODEL.md:48` |
| 13 | **归档材料 `url` 字段当前恒为 null** | 模型写明「阶段 2 后端支持时填充，mock 阶段为 null」 | `content/04_web_design/data/DATA_MODEL.md:869` |
| 14 | **邮件通道实际不会发出任何邮件** | 三重原因叠加：① 收件人从成员档案 `email` 读取，而**示例数据无该字段**；② 需 `MAIL_ENABLED=true` 且 `SMTP_*` 齐备；③ 即便发出，也只覆盖「通知发布 / 待办提醒 / 汇报」三类触发点，受众解析**只实现了 activity 定向与全体两种**（党小组/角色定向统一按全体处理） | `server/services/mailer.js:93-106`、`server/services/mailer-hooks.js:19-37` |
| 15 | **`handoffs`（三委数据交接记录）服务端无表** | 前端 mockDB 有 `handoffs` 域、mock 适配器会持久化它；**服务端 35 张资源表里没有 handoffs** ⇒ API 形态下该域不落库 | `docs/src/core/domain.js:267`、`docs/src/core/mock-adapter.js:92,269,1336`、`server/db.js:9-42` |
| 16 | **`pendingMemberConfirmations` 不落服务端** | 前端 mockDB 数组「仅承载内存读链」，跨刷新持久化由成员确认服务自管浏览器 localStorage 键；**服务端无对应表** ⇒ API 形态下该队列不落库 | `docs/src/core/domain.js:324-332` |
| 17 | **「副组长」制度有、代码无** | 制度文本规定「每个党小组设 1 名组长 + 1-2 名副组长，副组长可共享同组组长工作台的相关内容」；但**`docs/` 与 `server/` 全仓检索「副组长」零命中**——没有副组长角色键、没有账号类型、没有工作台共享实现 | `content/02_institution/SYSTEM_ROLE_PERMISSION.md:45`、`content/02_institution/sop/支委与党小组定人定责定岗说明.md:40`、`content/02_institution/sop/党小组组长工作手册.md:46-48`；检索证据：`docs/` 目录内「副组长」0 命中 |
| 18 | **`party-staff` 无可见性配置** | 「谁能看谁」（`ROLE_VISIBILITY`）表中**没有 `party-staff` 键** ⇒ 该角色的可见目标投影恒为空 | `docs/src/services/visibility.js:47-55`、`:98-100` |

### 7.3 未接入 / 无代码类（规划中）

| # | 项 | 现状 | 依据 |
|---|---|---|---|
| 19 | 北大党校系统（培训进度等）只读同步 | **规划（M0-M2），无代码** | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:85` |
| 20 | 北大智慧党建平台（党旗飘飘）双向协同 | **规划（M0-M4），无代码**；设计稿状态仍为 `draft` | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:86`、`content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md:7`（`status: draft`） |
| 21 | 微信小程序（移动端协同） | **规划阶段、无代码**（设计文档本身状态为 `active`，即设计有效、实现未开始） | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:52`、`content/04_web_design/deploy/WECHAT_INTEGRATION.md:6` |
| 22 | AI 本地推理（经验提炼 / 通知智能路由 / 活动建议） | **规划，无代码**；部署文档里写的 `AI_API_BASE_URL` 在代码中**检索不到消费点（未取证）** | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:219-242` |
| 23 | 北大 IAAA 单点登录 | **未接入**：当前登录落点是本地 `login.html`；门控层已把 IAAA 预留为「换登录落点、不改门控条件」 | `content/04_web_design/deploy/AUTHENTICATION_MODEL.md:75`、`DEPLOYMENT_GUIDE.md:217` |
| 24 | API 形态下的「一键重置」 | 前端 `?reset=` 三档**只在无 token 的 mock 形态生效**；API 形态没有对应接口，重置需运维手工删 `data.db` | `server/README.md:19` |
| 25 | 数据模型文档与部署文档的表数口径过期 | `DEPLOYMENT_GUIDE.md` 写「**32 资源表**」；**代码实测 35 张**（§2.29 已记录「资源表 34 → 35」）——后端按 **35 张**实现 | `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:104,160,180,259` vs `server/db.js:9-42`、`content/04_web_design/data/DATA_MODEL.md:1098` |

> **另有一处需要说明的「未取证」**：`server/test/` 下的测试套件规模（文件数/断言数）本文件不写具体数字——它随开发持续增长，`server/README.md:37` 明确「本文件不维护固定计数，以 `server/test/` 实际目录为准」。

---

## §8 取证索引

> 本文**每一节都在节末给出「依据：文件:行号」**。本节汇总**主要取证源**及其在本文中的作用，便于后端按图索骥。

### 8.1 后端（`server/`）

| 文件 | 作用 | 本文引用处 |
|---|---|---|
| `server/README.md` | 后端自述：安装/启动/环境变量/数据与文件/部署对接 | §1.3、§5 |
| `server/server.js` | 入口：端口、DB 路径、种子开关、定时任务 | §5.2、§5.5 |
| `server/app.js` | 应用装配：中间件、路由挂载、静态托管、错误处理、`deploy.js` 注入 | §5.5、§6.12 |
| `server/db.js` | 建表：35 张资源表 + `sessions`/`attachments`；键值表结构；WAL | §4.0、§4.37、§4.38、§7.2 |
| `server/seed.js` | 播种：从 `docs/src/mock/*` 导入、反馈种子按 kind 分流脱敏 | §1.3、§5.6 |
| `server/routes/auth.js` | 登录/注销/me；`requireAuth`/`requireRole`/`requireCommissioner` | §2.4、§5.3、§6.1 |
| `server/routes/resources.js` | 通用资源 CRUD、写角色门、活动写门、快照、支部配置、意见反馈语义端点 | §2.3.3、§2.4、§4.16、§5.5、§6.2-6.4、§6.9 |
| `server/routes/member.js` | 成员变更链路、名册语义端点、移出/撤销 | §2.2.3、§4.30、§4.34、§4.35、§6.5 |
| `server/routes/committee.js` | 线上表决：选项枚举、名单校验、无记名两段式、截止 | §4.36、§6.6 |
| `server/routes/system-notices.js` + `server/system-notice-kinds.js` | 系统派生通知：20 种 kind 的授权复算与文案生成 | §6.7 |
| `server/routes/leader-progress.js` | 组长台「组员进展」服务端汇总 | §3.2.5、§6.8 |
| `server/routes/uploads.js` | 附件上传/下载、类型与大小限制、物理文件删除 | §4.38、§5.5、§6.10 |
| `server/routes/report.js` + `server/services/reporting.js` | 四域数据上报（拉取/导出/推送）、定时任务、会议提醒 | §5.3、§6.11 |
| `server/services/mailer.js` + `mailer-hooks.js` | 邮件通道（SMTP）与触发钩子 | §5.3、§5.5、§7.2 |
| `server/.env.example` | 环境变量模板（**注意：服务端不读 .env 文件**） | §5.3、§5.6 |
| `server/package.json` | 依赖与脚本 | §5.1、§5.2 |

### 8.2 前端核心（`docs/src/`）

| 文件 | 作用 | 本文引用处 |
|---|---|---|
| `docs/src/core/constants.js` | **角色/枚举/权限集合/活动类型/通知受众/计票方式**等常量的单一源 | §2.1-2.3、§4.1、§4.10、§4.30、§5.5#16 |
| `docs/src/core/domain.js` | 领域 typedef 与 mockDB 全部持久化域清单 | §4.30、§7.2 |
| `docs/src/core/policy-defaults.js` | **制度参数与默认值**（可调 / 固定逐项标注）+ 域参数白名单 | §1.2、§3.4、§5.6 |
| `docs/src/core/state.js` | 前端 appState 与枚举 | §4.14 |
| `docs/src/core/config-clean.js` | config 净化（modules/blocks/workforce/org/policyOverrides）唯一实现 | §4.25 |
| `docs/src/core/mock-adapter.js` | mock 形态数据适配（含 `handoffs` 等域的本地持久化） | §7.2#15 |
| `docs/src/core/data-adapter.js` | 数据源 mock/api 切换抽象层 | §1.1、§5.2 |
| `docs/src/core/api-adapter.js` | REST API 适配器与路由映射（35 个资源分组） | §1.1、§5.6 |
| `docs/src/services/auth.js` | **权限键集 `ROLE_PERMISSIONS` / 项目角色 `PROJECT_PERMISSIONS` / 赋权链 `AUTHORIZE_CHAIN` / `canDo`** | §2.2、§2.3 |
| `docs/src/services/visibility.js` | 「谁能看谁」可见性矩阵（L0/L1/L2、块块） | §2.2.6、§7.1#2、§7.2#18 |
| `docs/src/services/{attendance,makeup,issues,thought-report,branch}.js` 等 | 各业务域服务（写层业务守卫落点） | §2.2、§7.1 |
| `docs/src/workflow/sopData.js` / `sop.js` / `decision-tree.js` | SOP 场景定义与推演、决策树 | §4.15、§7.2#10 |
| `docs/src/config/deploy.js` | 部署形态常量 `DEPLOY_MODE` 与空域回退开关 `SEED_FALLBACK` | §1.3、§5.2、§5.6 |
| `docs/src/mock/*.js` | 示例组织数据（成员/账号/支部/党小组/活动/通知/专班/种子） | §1.3、§5.6 |
| `docs/src/modules/capabilities/*-workspace.js` | **七台工作台的页签清单声明（单一源）** | §3.2 |
| `docs/data/issues.json` | 意见反馈的内容单一种子源 | §5.6 |

### 8.3 设计与制度文档（`content/`）与根说明

| 文件 | 作用 | 本文引用处 |
|---|---|---|
| `content/04_web_design/data/DATA_MODEL.md` | **静态数据模型唯一权威源**（§2.1–§2.29 字段表，即本文 §4 的来源 A） | §4 全节 |
| `content/02_institution/SYSTEM_ROLE_PERMISSION.md` | **系统角色权限矩阵（代码键级权威）**：§9a0 角色键全表、§9a–§9l 各矩阵与裁定 | §2 全节、§7.2#17 |
| `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` | **部署与对外对接总案（部署路径唯一权威源）**：就绪度、对接前置、邮件与上报 | §1、§5、§7.3 |
| `content/04_web_design/deploy/AUTHENTICATION_MODEL.md` | 部署形态 / 登录态 / 门控四层模型 | §3.1、§5.6 |
| `content/04_web_design/deploy/{PKU_PARTY_INTEGRATION,WECHAT_INTEGRATION}.md` | 北大党校·智慧党建对接 / 微信协同专项设计稿 | §7.3 |
| `content/04_web_design/README.md` | 设计层索引与「权威源速查」（含各文件状态语义） | §7.3 |
| `content/README.md` | 内容中心 5 类知识类型与「母本→子本」关系 | §1.2 |
| `README.md`（根） | 系统定位、功能地图、关键机制、替换入口总表、开发纪律 | §1、§3.4、§5.6 |
| `README-members.md` | 成员视角的角色工作台一览（与代码口径互校） | §3.2、§3.3 |
| `.ctx/` 目录 | 过程记录（执行/决策日志、快照、审查队列）——**审计底座，本文未据其断言现状** | — |

### 8.4 本文的自我约束（如实声明）

1. **不做无出处的断言**：本文所有「现状」均给出 `文件:行号`；凡证据不足者写明「未取证」（§5.1 编译工具、§5.3 `AI_API_BASE_URL`、§7.3#22）。
2. **不合并冲突口径**：文档与代码不一致处**并列呈现**（如 32 vs 35 张表见 §7.3#25；Node 18+ vs ≥22 见 §5.1）。
3. **区分「制度要求」与「系统实际」**：如「副组长」（§7.2#17）、「系列活动」（§7.2#9）、「数据交接」（§7.2#15）。
4. **本文档为说明件，不是契约**：接口与字段的最终判定以**代码与测试**为准（守卫见 `server/test/doc-consistency.test.mjs`、`server/test/link-integrity.test.mjs`、`server/test/catalog-sync.test.mjs`）。

