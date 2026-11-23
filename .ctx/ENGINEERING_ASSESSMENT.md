---
title: "工程化评估与改造行动线"
type: audit_report
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: 2026-11-23
status: active
layer: reference
related_files: [content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md, content/04_web_design/contracts/WORKFLOW_BLOCK_CONTRACT.md, content/04_web_design/contracts/PARTY_COMMITTEE_DESIGN.md, content/04_web_design/module/SOP_WEBSITE_GUIDE.md, content/04_web_design/deploy/DEPLOYMENT_GUIDE.md, .ctx/REVIEW_QUEUE.md, CLAUDE.md, content/03_doc_system/DOC_MAP.md, content/insights/README.md, content/insights/工程与AI协作的全栈实践.md, server/README.md, docs/help.html]
---

# 工程化评估与改造行动线

> **层（reference）**：本文件是评分证据与残项台账，不是 active context。当前值 / 下一步在 `.ctx/ACTIVE_CONTEXT.md`；逐批沿革与打分论证在 `.ctx/logs/`（`H26.5`：同一指标只留一个当前值）。
> **回答什么**：六个工程维度的当前证据、阻断级风险与未闭残项（§一 / §二 / §四），以及评价资产索引（§5.2）。
> **不回答什么**：哪一批做了什么 → `.ctx/logs/`；规则判据 → `CLAUDE.md` 与 `content/05_ai_coding`；系统形态 → `.ctx/SNAPSHOT.md`；文档导航 → `content/03_doc_system/DOC_MAP.md`。

## 一、当前评分与结论

> 评分只表达当前证据下的成熟度，不作六维平均。高风险单独列出；同一系统可在本地单支部场景很好用，却仍不适合多支部共享部署。
>
> **当前值（`D-913` 重评）**：业务与数据 **77** · 安全与权限 **75** · 最小三成本体验 **74** · 测试与发布 **69** · 架构与可维护性 **73** · 运行部署 **67**。**重评依据（`D-913`）**：只认证据、不加努力分；本批新增反面证据两条——① 评分台账测试读数漂移（§2.5 / §5.2 写 129 文件 / 902 断言，实为 81 / 898，守卫 ⑫ 只校六维元组未拦住）；② 顶栏同族漏改（`<a>` 改 36、同位 `<button>` 仍 44）。其余维度按支书口径收紧下调（未获新读数的项不再按乐观值计）。下表单元格保留「已核实证据 / 未闭项」；带 `D-86x` 标记的数值属当时口径，沿革只查 `DECISION_LOG`。

| 维度 | 得分 | 证据、风险与未完成项 |
|------|------|---------------------|
| 业务与数据正确性 | **77 / 100** | 46 页签 D1 读口全 2xx；换轨逐表行数与 sha256 一致（批次 527，契约 50 表）；应到口径单一源 `roster-eligibility.js`、待办读权限 `todo-read-policy.mjs`；议程分类两端同源；D2 处置 46/46（5 条对账规则 pass ＋ 41 条 `countSkip` 理由，`W7` 守）；C2 往返 **37 pass** / 12 destructive exception（有理由）。残项：三层关系口径未统一、D2 规则仅覆盖 5 个「单集合」页签。 |
| 安全与权限 | **75 / 100** | 矩阵 **163 条**（156 enforced / 5 self-service / 2 public / 0 known-risk），守卫断言运行期路由 ≡ 矩阵；会话 3 小时；production 单支部；public 门厅 fail-closed；`security-hardening` 8/8、`multi-branch-read-filter` 9 组、个人密码 21/21。残项：多支部读过滤未接线、共享口令仅非生产回退、CI 无 run id。 |
| 最小三成本体验（含前端与交互） | **74 / 100** | 46 页签 **P0 0 / P1 0 / P2 0 / exception 44**；F1–F8 全绿；跳转 fail-closed、活动详情四段、卡头单源、三份前端契约。残项：真人 5 任务签收未完成、页签 IA A 37 / B 9 / C 0、6 个超 4 块页签登记例外；本批实测顶栏同族漏改一次（`CASE-DESIGN-044`）。 |
| 测试与发布质量 | **69 / 100** | daily **32 文件 / 264 断言**；guards **81 文件 / 906 断言**；四层 runner 由 registry 单一源驱动。残项：CI 两个 job 无 run id、`test:full` 自批次 553 未整体重跑、审计脚本不进 daily；批次 604 写「266 断言」系多记 3 条（实测 263），批次 605 改正并加 `W7` ⇒ 264。 |
| 架构与可维护性（原「架构复杂度与变更成本」） | **73 / 100** | `write-policy-matrix` 为写权限唯一机读源；契约落 `content/04_web_design/contracts/`；四层 runner 单源。残项：对象模型边界未定（三层关系判据表待落）、双适配器 / 版本戳 / 行号守卫抬高跨层成本；壳层尺寸规则散在三段（基础 / 移动 / 组件例外），易漏改。 |
| 运行、部署与跨组织复用 | **67 / 100** | 换轨逐表 sha256 一致（批次 527）；生产空库 `preflight-cutover --strict` exit 0 / 警告 0；迁移前备份；`start:review` 独立库；`deploy/verify-linux.sh` 6/6。残项：`L-02` 真机未验、`deploy-verify` 无 run id、附件 / 会话按 runbook 另搬。 |

### 评分锚点

- **90–100**：关键路径有单一事实源和服务端约束，自动测试覆盖主要失败形态，部署边界清晰且已验证。
- **75–89**：主流程成熟且有自动检查，仍存在可定位的高成本残项或低频风险。
- **60–74**：核心能力可用，但重要边界依赖部署约束、人工流程或跨层同步。
- **40–59**：有明确的生产权限/数据风险，或关键规则尚不能由权威写口独立保证。
- **0–39**：无法稳定运行、验证或安全维护。

**行业基线（2026-11-15 批次 553 增补；任一不满足即不得进入 85+）**：

- **测试**：CI 必须覆盖 daily ＋ precommit（或 full）；有覆盖率读数；e2e 在 CI 跑；flake 有隔离机制。
- **安全**：无共享口令回退；生产依赖无 high / critical；写门矩阵与运行期一致；生产密钥外置。
- **部署**：Linux 真机 install / update / preflight 已验证；有备份恢复演练；有日志与健康检查；进程托管（systemd）。
- **架构**：模块边界有守卫；无「同一事实两处计算」；有类型检查或等价构建期静态检查。
- **业务数据**：跨人 / 跨设备事实服务端单一源；多支部隔离接线；宽表规模边界有读数。
- **体验**：可访问性有常驻检查；空态 / 错误态 / 加载态完整；键盘可达。

### 阻断级风险

> **本轮复核（2026-11-08 批次 538 评分证据卡；2026-11-09 `D-862`、2026-11-10 `D-863` / `D-864` 按批次 539 / 540 / 541 实跑读数复核；2026-11-11 `D-865` 只做评分保守回调，风险结论未变；2026-11-14 批次 550 `D-872` 关闭第 3 条）**：逐条标注「保留 / 部分闭环 / 闭环 / 新增」，闭环必须给证据。结论：第 2 条部分闭环（矩阵 163 条、0 known-risk、6 条缺口已修，`issue-unread` 派发位已加强校验；批次 539 已把上传门矩阵 `roleGate` 同批改准为 `party-staff | 支委层`；批次 541 未放宽任何写门）；第 3 条闭环（批次 550 服务端建会冻结表决名单）；第 4 条的会话过期已闭环，个人密码已落地、共享口令作回退保留；第 1、5 条保留（批次 550 未动多支部读过滤与宽表边界）。

1. **多支部共用一个服务实例会跨支部读出数据。** **保留（读面已统一）**。业务读面全部经 `branch-scope` 单一出口过滤；逐读口取证与开关演练读数见 `.ctx/evidence/2026-11-23/multi-branch-read-ports.md`（`cd server; npm run test:multi-branch` 26/26）；`ALLOW_MULTI_BRANCH` 仍关闭，上线形态一实例一支部；设计稿见 `ARCHITECTURE_EVOLUTION §十`。
2. **多数通用写口只验证登录。** **部分闭环**。权限矩阵 163 条覆盖全部写路由，`known-risk` 清零；考勤删除、活动/专班子记录、`issue-unread`、快照聚合/考勤清空 6 条缺口已补服务端判据；增 G4 / G5 写入前复核与 `issue-unread` 派发位 403；批次 539 把上传门矩阵 `roleGate` 改准为 `party-staff | 支委层`，与运行期 `requireUploader` 同批。残项：共享口令。
3. **表决选民名单来自活动数据本身。** **闭环（2026-11-14 批次 550 · `D-872`）**。创建活动的服务端在写库前按 `users` ＋ 组织归属算一次 `voteConfig.voterIds` 并冻结（`resources/index.js::_activityVoteConfigDeny` → `committee.js::resolveFrozenVoterIds`），客户端提交的名单不作数；范围非法 fail-closed 400。会议期间不随组织变动，组织变动下次建会生效；历史快照不回改。回归：`agenda-votes.test.mjs`「建会冻结名单」＋ `async-vote.test.mjs`（应到 10 名在册正式党员）。
4. **共用口令只适合受控部署。** **部分闭环**。会话已按 `SESSION_TTL_HOURS`（缺省 3 小时）过期；个人密码已落地（`personal-password` 21/21），共享口令仅作回退保留；生产用 systemd 注入强口令并定期更换。
5. **SQLite JSON 宽表是规模边界。** **保留**。批次 538 只加 `publication_audits` 的 v14 生成列与审计索引，宽表本身与业务字段索引边界未变。

依据见 server/README.md「部署前必知限制」、server/.env.example、server/routes/committee.js 的票决授权注释及 server/routes/resources/index.js 的资源写口。上述边界不靠提升分数抵消。

## 二、六维评分依据

> 每维只留「当前证据 / 残项 / 下一改进项」；逐批论证与历史读数见 `.ctx/logs/`（`H26.5`：同一指标只留一个当前值）。

### 2.1 业务与数据正确性 —— 77/100

**证据**：46 页签 D1 读口全 2xx / JSON 可解析 / ≤500KB；换轨逐表行数与 sha256 一致（批次 527；现行契约 50 表）；应到口径单一源 `docs/src/core/domain/roster-eligibility.js`（滞留保留身份、应到剔除；已转出前置剔除），报备 / 考勤 / 考察 / 复盘同源 import；待办行读权限单一源 `server/routes/resources/todo-read-policy.mjs`；议程「来源 → 类型 → 待议池」两端同源 import。
**残项**：D2 仅 46 个页签中 5 个有可对账的「单集合」列表（其余 41 个为派生 / 分段 / 表单视图，已逐页签登记 `countSkip` 理由并由 `W7` 守）；C2 的 12 条 exception 均为 destructive 流程（无配方，已写理由）。
**下一改进项**（`B-605-1` 已收口）：D2 处置完整性由 `workbench-audit-coverage::W7` 机检（有规则或写理由、total 规则带 `countSelector`、规则数只增不减）；C2 验收＝审计报告 `C2 pass > 0`（现值 **37**）。后续每新增「单集合」列表页签，须同批补规则并上调 `D2_RULE_BASELINE`。复评触发：任一页签新增列表 / 计数面。

### 2.2 安全与权限 —— 75/100

**证据**：`write-policy-matrix` **163 条**（0 known-risk），守卫断言 Express 运行期写路由 ≡ 矩阵登记面并带反例；`SESSION_TTL_HOURS` 缺省 3 小时；production 多支部拒绝启动；`start:review` 独立演示库；`security-hardening` 8/8、`multi-branch-read-filter` 9 组、`personal-password` 21/21；公共门厅过期 / 缺失有效期一律 404 fail-closed。
**残项**：共享口令仅非生产回退；CI 安全类守卫无 run id。多支部读面已接线并完成开关演练（`ALLOW_MULTI_BRANCH` 仍关闭）。
**下一改进项**（`B-603-2` / `B-541-3` 已收口）：矩阵「门函数 / 角色集合 ≡ 运行期」断言与多支部开关演练均已落（读数见 `.ctx/evidence/2026-11-23/multi-branch-read-ports.md`，26/26）。新增写口登记时同批补矩阵行；新增读口时同批补双支部夹具或在取证表写明「有判据、无夹具」。复评触发：任一新写口 / 新读口登记。

### 2.3 最小三成本体验（含前端与交互） —— 74/100

**证据**：46 页签 **P0 0 / P1 0 / P2 0 / exception 44**；F1–F8 全绿；M1–M3 与 4 个独立对象池例外在位；待办跳转 fail-closed（31 类动作 × 6 台登记）；议程待议池同源；`renderDataTable` 单一出口；活动详情四段；分工视图 2；卡头单源；三份前端契约常驻。
**残项**：真人 5 任务签收未完成（自动走查 ＋ 截图不计验收）；页签 IA **A 40 / B 6 / C 0**；6 个超 4 块页签登记例外；顶栏同族漏改一次（`CASE-DESIGN-044`：`<a>` 改 36、`<button>` 仍 44）。
**下一改进项**（`B-603-3`）：**不再设「压到 200 以下」这类数字目标**——调色板状态文字（基线 **291 处 / 56 文件**）与手拼徽章（基线 **43 文件**）的验收标准就是守卫本身：逐文件不超基线、不出现新文件（`color-ratchet-guard::①` / `component-ratchet-guard::①`）。新增代码必须走 `--status-*-text` / `badgeHtml()`；存量只在动到该文件时顺带下降并同批下调基线。复评触发：任一基线计数下降或出现新文件（守卫判红）。

### 2.4 架构与可维护性（原「架构复杂度与变更成本」） —— 73/100

**证据**：审计分层沿用；`write-policy-matrix` 为写权限唯一机读源；多支部同实例设计稿落 `ARCHITECTURE_EVOLUTION §十`；契约类落 `content/04_web_design/contracts/`；测试分层由 `test-tier-registry.mjs` 单一源驱动四个 runner。
**残项**：双数据适配器、活动内嵌数据、静态版本戳与行号守卫抬高跨层变更成本；壳层尺寸规则散在基础段 / 移动段 / 组件例外三段，改一处易漏另两处。
**下一改进项**（`B-603-5`）：对象模型边界已收口（定义只在 `OBJECT_MODEL §2.1`，`PARTY_COMMITTEE_DESIGN §2.7` 只留指针）；余 `B-541-7`（`L-18`）组件出口散件在下次动到该组件域时同批收敛。判据：散件只减不增（`style-baseline` 只减不增基线）。复评触发：组件域被改动。

### 2.5 测试与发布质量 —— 69/100

**证据**：daily **32 文件 / 264 断言**；guards **81 文件 / 906 断言**；`workbench-audit-coverage::W1–W5` 常驻；`write-policy-matrix`（路由 ≡ 矩阵 + 门名处理分支 + 反例）、`security-hardening`、`session-ttl`、`run-mode` 均登记 tier；四层 runner 按 registry 单一源执行；`daily.yml` 已接 `test:daily` 与 `deploy-verify`；`evaluation-asset-guard::⑤` 把 EA 测试读数锁到 registry（批次 604 立）；`component-ratchet-guard` 新源件 16 `viewport-and-touch-guard` 把外部准则五条写成带反例的验收判据（批次 604 续）；`doc-lifecycle-guard` 源件 5 `guard-citation-guard` 断言「文档引用的守卫文件必须存在」（批次 604 续，修掉 21 处归并后悬空引用）；`style-ratchet-guard::S5` 曾拦下新增非令牌间距（批次 603）。
**残项**：CI 两个 job 未实跑（无 run id）；`test:full` 自批次 553 未整体重跑；审计脚本仍不进 daily；precommit / full 时长仍是发布风险。
**下一改进项**（`B-603-4`）：EA 读数 ≡ registry 已收口（`evaluation-asset-guard::⑤`，改一处即红）；余 CI 两个 job 实跑归**外部门**（判据：run id ＋ 日志，与 2.6 的 `L-02` 同批，由支书授权推送后一次性补齐）；审计脚本入 daily 前先给耗时读数。复评触发：CI 出 run id、或 guards 预算变更。

### 2.6 运行、部署与跨组织复用 —— 67/100

**证据**：换轨闭环实测逐表行数与 sha256 一致（批次 527）；生产空库首启补 6 角色账号后 `preflight-cutover --strict` **exit 0 / 警告 0**；`user_version` 拒绝降级；迁移前备份；`start:review` 隔离演示库；production 单支部断言；`deploy/verify-linux.sh` **6/6**。
**残项**：`install.sh` / `install.ps1` / `update.sh` 未在 Linux 真机验证（`L-02`）；GitHub Actions `deploy-verify` 未实跑（无 `gh`、本机不推送）；附件 / 会话按 runbook 另搬；多支部开关未开（读面已接线，见 2.2）。
**下一改进项**（`B-603-6`）：`L-02` ＋ `deploy-verify` 实跑归**外部门**（判据：Linux 真机 `install → preflight → update` 三步退出码 0 ＋ CI run id）；多支部开关是否打开另需支书裁定（`D-849` / `D-889`）。复评触发：真机三步任一跑通。

### 2.7 七个月工程复盘（结论）

> 复盘正文与逐批论证见 `.ctx/logs/`。结论：真返工集中在「同一事实两处计算」与「测试分层漂移」；已由 `D-859`（四层）、`D-894`（评分即资产）与注册表单源收口。

### 简并机会与范围

> 见 §三 R13–R30 台账（保留原表）；本节不复述。

### 本地数据库与测试库的选择

> 见 `server/README.md`「运行档」与 `deploy/CUTOVER_RUNBOOK.md`；本文件不重复。

## 三、工程做法与纪律

> 本节是**纪律与方法论**（长期有效，不是沿革）：3.1 出口扎口做法 · 3.2 数据域接线契约 · 3.3 去重审计证据（R1–R12） · 3.4 单一源 / 引擎化收敛台账（R13–R30 ＋ 可迁移要点 ①–⑫，**`content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 引本节的「理论口述版」**）。

### 3.1 统一扎口做法（本评估确立的第一个工程做法）

支书定调：**同一域可以有若干个函数（甚至若干个实现文件），但对外只暴露一个库文件；调用方一律 import 该库，不直接触碰内部实现。**

落地样板：`components/ui/forms.js`（表单域唯一出口）· `components/ui/badges.js`（徽章域）· `components/record/reporting.js`（汇报域）——三库建成后，组件平铺层「同域多文件」收敛（行动项 §四 P0·统一扎口）。同批回归：`module-load` + 相关 E2E 全绿，**零行为变化**。

**改造纪律（每次扎口必守）**：
1. 新增库**聚合重导出**，内部实现文件不搬运、不改名。
2. 调用方**只改 import 来源一行**；运行期零行为变化。
3. 每批扎口后跑 `module-load` + 受影响 E2E 回归。
4. **禁止双轨**：一旦建库，同域内新代码一律走库，存量直连同步收口。

### 3.2 数据域接线契约 v1（person 域试点确立）

**背景**：曾盘点出全站 68 处直连 `mock`；`data/mock/index.js` 实为「旧兼容中转」（person 函数早已落到 `services/member/person.js` 又被 re-export 回 mock）。债根 = **UI / 服务层 import 面挂在 `mock`，而非真正实现所在的 service**。**收官态 = UI 层（`entries` / `components` / `modules`）对 `mock` 的 import 直连清零**——全仓 `mock` 引用仅存于 `services/core` 数据层（种子接入点，契约允许）。**已达成**（逐批过程见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`；行动项 §四 P0·数据域接线）。

**契约条款（长期有效）**：
1. **人名与人员对象获取**（`getPersonById` / `getPersonName` / `PersonStore`）唯一出口 = `services/member/person.js`；**任何层禁止从 `mock/*` 获取人名**。
2. **成员名单**（PEOPLE 语义）唯一出口 = `PersonStore.getMembers()`；UI / tab / 组件层禁止直连 mock 种子数组；**种子数据仅许 service 层引用**。
3. **展示格式化函数**（`attendanceToLong` / `inspectionToLong` / `reviewToDisplay` 等）统一栖身各业务 domain service（`attendance` / `inspection` / `review`），随记录读写同域演进；**mock 数据模块不承载格式化逻辑**。
4. 新代码一律遵守 1~3；存量收口按批次推进，每批回归。

### 3.3 冗余 / 重复去重审计（R1–R12：证据与收敛去向）

> **定位**：支书 2026-09-03 要求「对多余、冗余、重复实现的代码高度批判性地思考并执行」。本表只收录**可证实（文件 + 行号）**的重复。**审计原则：先统一「同一业务事实的唯一出口」，再谈删代码——先扎口后去重，避免删完又长出第二份。**（逐批明细见 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md`）

| 组 | 重复事实 | **收敛去向（单一源；现状）** |
|----|---------|------------------|
| R1 | HTML 转义 `esc` 至少 10 个文件各写一份；`fmtDt` 双份 | ✅ `core/base/utils.js::escHtml` / `fmtDt` 唯一出口（各文件 import 别名 `esc`，调用面零改动） |
| R2 | 三会四子类清单三份；阶段枚举另见 `CANDIDATE_STAGES` 与各 seed | ✅ `MEETING_TYPES` → `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 派生；**2 项复核保留**（见下「复核保留」） |
| R3 | 产出块 id 消费端手写（write-tab 4 个 id / calendar-tab 手写 blockId） | ✅ → `OUTPUT_BLOCK_DEFS` / `THEME_PARTY_DAY_MANIFEST.blockId` 派生 |
| R4 | 活动场景 id + label + 颜色三处手写 | ✅ `constants.js::SCENARIO_WRITE_IDS` / `SCENARIO_LABELS` 派生（全集唯一源 = `sopData.js`）；守卫 `scene-write-sync` |
| R5 | 业务链路 flow 语义三写、无键集比对测试 | ✅ 新增 `catalog-sync::T2` 键集**双向**断言（任一侧增删即红） |
| R6 | tab id 散落导航侧、隐藏后静默 no-op | ✅ `core/boot/tab-nav.js` 纯决策 + `tab-bar` 守卫（隐藏 tab 回退首个可见 tab）；`tab-nav` 4 态测试 |
| R7 | 支部 config 净化规则 server / 前端各一份 | ✅ 共享纯模块 `services/branch/config-clean.js`，**server 严格口径单向权威**、两端同源引用 |
| R8 | 表决规则（optionSet 枚举 + 异议附言）跨层重复 | ✅ `OPTION_ENUMS` 单一源 + `catalog-sync::T4` 键集双向断言 |
| R9 | 支委 / 支书 / 党委组织员角色 `Set` ≥5 份 | ✅ `constants.js` 四常量单一源；守卫 `roles-sync` 4 断言 |
| R10 | 删除 / 归档级联 server 与前端同构实现 | **观察**（未列入去重队列） |
| R11 | 资源名 / ID 注册表两端各一 | **观察**（未列入去重队列） |
| R12 | 运行安全：server 登录不验密码、账号明文口令 | ✅ **出仓子项撤销**（见 §一 末注）＋ **运行安全项已修**（行动项 §四 P1b：可换 `LOGIN_PASSWORD`、生产未设启动即拒） |

> 反例（无需拆分，防过度去重）：block manifest 校验唯一源在前端 `manifests.js`（server 测试经浏览器复用同文件），职责与 R7 的「config 形状净化」不同——**勿误并**。

### 3.4 单一源 / 引擎化收敛台账（R13–R30；**可迁移要点 ①–⑫ 见本节末**）

> **定位**：3.3 处理「同一事实被抄了几份」；本台账处理**更高一层的同类病灶**——**能力与口径散落在调用点**（各写一份分页 / 各写一套矩阵 / 档位靠环境供给 / 组清单在加载期被物化成快照 / 说明文件里的数字与名称无人守）。判据与守卫一并登记。**三轮之别**：R13–R20「**收进引擎**」；R21–R25「**收口到底**」；**R26 起「把口径变成断言」**——不再依赖人记得同步。

| 组 | 病灶形态 | **收敛去向（单一源）** | 守卫 |
|----|---------|-----------------|------|
| R13 版本号推导三处各写 | `bump-version.mjs` 内联「当天日期 + a」、无参运行会把同日戳往回写；注释排除规则只在一处置信 | `docs/scripts/version-next.mjs` 纯函数单一源（`nextVersionFor` / `isForward` / `isCommentLine` + `codePartOf`）；**批次 236 扩为「版本与发版治理」单一源**（+ `nextSemver` / `isSemverForward` / `parseChangelog` / `classifyChanges`，供 `release.mjs` 与守卫共用） | `version-stamp.test.mjs` S1–S7 + D1–D11（含「全站活动戳取值集合规模为 1」与发版一致性 `S7`） |
| R14 分页散落 5 处、引擎无分页 | 全站分页只在 issue-list / query-view / archive-entry / 反馈 / 活动动态 各写一版；**统一检索引擎自身没有分页** → 其承载的 28 处按人 / 按活动表无分页 | `components/ui/list-filter.js` **引擎内置分页**（每页 10、页码并入 `stateKey`、筛选回第 1 页、页数 ≤1 不出控件），28 处一次受益 | `filter-row.test.mjs::S10` |
| R15 矩阵三处各自为政 + 列无上限 | 考勤矩阵 / 考察人视图 / 表决 `.vs-matrix` 各写一套；宽表列随项目无限增长 | `components/ui/relation-matrix.js`（`byPerson` / `byItem` 互为转置、项目维列上限 6 + 一键展开、横向滚动 + 首列吸附） | `relation-matrix.test.mjs` S1–S6 + 真机① |
| R16 组清单「派生化快照 / 种子枚举代跑」 | 模块顶层 `[...new Set(PEOPLE.map(p => p.partyGroup))]` 展开 Proxy 即冻结；运行时用 `PARTY_GROUP_OPTIONS` 净化导入与统计 | `services/member/party-group.js::groupOptions()`（活组实体唯一条出口） | `party-group.test.mjs` S1–S4 |
| R17 控件档位 / 表格 / 分页样式各写 | 表格表头 7 处各写一份；档位靠 UA 与 CDN 工具类供给（同表单实测 42 / 43 / 47 三值并存） | `docs/src/styles.css` 类族单一源（`.data-table` / `.lf-*` / `.page-btn` + `.page-num` + `.is-current`）；档位算式显式（单档 38px × 13px） | `filter-row.test.mjs` S1–S12 + D1–D2 |
| R18 选人载体口径过宽 | §4.13「禁止 select 列人名」与实现有 4 处口径差 | 规范改**语义两分**（选名单成员 → `PersonPicker`；任命 / 指派到人 → 允许下拉）+ 例外台账 | `filter-row.test.mjs::S9` |
| R19 同一业务动作两个写门 | 成员流动「流入登记」与「名册新增」在 API 形态角色门冲突 | `server/routes/member.js` **同一实现体 `createMemberRow` 挂两个写门** | `member-flow::S4`、`permission-gate` ⑤d/⑥/⑦、`member-persist` api ⑫ |
| R20 状态与载体失配（非闭环） | 多选后关面板即「已选」、逐人填写框从未出现；`destroy()` 成环（用例由 11 秒劣化为 17.6 分钟超时） | `person-picker.js` 多选**点选即回调 + 关面板再回调**、调用方**重建前保态**、**销毁前先摘回调** | `inspection-loop-e2e`、`ux-guard::⑦` |
| R21 分页「收进引擎」但未收口 | 绕过引擎、自己手写渲染的仍有 13 处以上 | 21 个文件接入 `renderFilteredList`；引擎补「**无关键词无分面则不渲染检索条**」；**分组结构一律每组一实例、只给分页、不推平** | `filter-row.test.mjs::S12` |
| R22 翻页标记仍散（且单一源位置会成环） | 仍有 6 处手写翻页控件；翻页标记若留在 `list-filter.js` 会与矩阵形成模块环 | 抽为**叶子件** `components/ui/pager.js::pagerHtml`，引擎与矩阵共用；6 处并轨后统一读 `data-lf-page` | `filter-row` S10 + **S11**（`page-btn` / `page-num` 只允许由 `pager.js` 产出） |
| R23 矩阵人维无上限 + 单一源吞语义 | R15 只封顶项目维；表态矩阵的「异议红底 / 未投灰字」若并入通用矩阵会被吞 | `relation-matrix.js` 补 `MATRIX_ROW_LIMIT = 10`（人维在行 / 列同一切片）、`cfg.rowLimit`；新增 `cfg.cellClass()` **挂载点**（单一源只给挂载点，不吞领域语义） | `relation-matrix` S1 + **S5** |
| R24 宽表只覆盖 2 域 + 被取代实现留痕 | 其余域未迁；表态矩阵并入后留 5 条 `.vs-matrix*` 死样式与一条失真注释 | 推广三域（支部分工 / 专班报名 / 表态矩阵）→ **全站矩阵实现收敛为 1 处**；清死样式 + 修正注释；**保留语义类** `.vs-none` / `.vs-object` / `.vs-note` / `.vs-tally` / `.vs-quorum` / `.vs-locked` | `relation-matrix::S4` + `filter-row::S3` |
| R25 「归一」出口不全 → 调用点各写兜底 | 思想汇报读侧归一此前只有「按人」「待初阅」两出口，跨人取全量归一集合无处可取 | `services/governance/thought-report.js` 补**全量归一出口** `listAllThoughtReports()`（归一只此一处）；台账改用 `renderRelationMatrix` | `relation-matrix::S6` + 真机② |
| R26 说明文件里的数字与名称无人守 | 文档与代码积了 34 处口径未同步；**根因是没有守卫** | ① 全部按**代码实测**修正；② 数字分**五口径**并写明定义（mockDB 顶层业务域 / 持久化域 / server 表 / 资源名 / 快照键，**严禁互相代入**）；③ 新增 `server/test/doc-consistency.test.mjs` 把口径变常驻断言 | `doc-consistency`（**现到 `S1–S16`**：S1–S9 原口径 + S10/S11 守卫清单与断言号真实性 · S12 授权声明带日期 · S13 `TIMESTAMPS` ↔ frontmatter（规模判据 = 推导式恒等式）· S14 可数事实对账 · S15 弱清单 · **S16 守卫注册完整性**（S 类测试须全数列入 `test:daily`）；与 `DATA_CONSISTENCY_CHECKLIST §0.2` 同批取齐） |
| R27 结构层守卫锁「形态」锁不住「体验」 | 分页 / 矩阵守卫全是静态断言，证明不了「每个工作台每个 tab 跑起来真的分了页」 | 新增**真机全站普查** `server/test/page-sweep.test.mjs`（七台 × 全部 tab 逐一断言；门槛值由 S0 锁单一源） | `page-sweep.test.mjs`（S0 + 普查 + S1 非空转）。唯一初始告警经复核为**守卫口径过严** ⇒ **修守卫、不改产品** |
| R28 「同一病灶只修一处」当成「修完」 | 「提交报必填、框却不在位」修好后，**同一形态全站还有 92 处** | ① 立**台账** `server/test/form-loop-registry.mjs`；② 建**真机闭环普查** `form-loop-sweep.test.mjs`（空必填点须报**可见**提示，且提示点名的字段**须有可见载体**；另含真机成功路径）；③ 台账守卫 S0–S6；④ 纪律入 `DATA_CONSISTENCY_CHECKLIST` 第十三范本 + §0.1「同类规模」问 + `CLAUDE.md R-67`（后续强化 `R-73` / `R-78`） | `form-loop-sweep.test.mjs`（S0–S6 + 真机闭环 + 成功路径） |
| R28-附 工具脚本把「**数据**」当「**代码**」改写 | `bump-version.mjs` 补戳正则命中台账数据（`form-loop-registry.mjs` 113 条 `file` 字段被改坏，**真事故**） | 缓存键**语境判据**抽为单一源 `version-next.mjs::isCacheKeyLine`；台账数据改写为 `SRC + '相对路径'` 拼接 | `version-stamp` S4–S6 + D7–D9；`form-loop-sweep::S4`（数据里不得出现 `?v=`） |
| R29 授权声明必须可核验（注释不得伪造「支书批」） | 一条提醒随批进仓、注释写「支书 2026-09-09 批」，而全仓找不到该具体功能的问答记录 | 立 `CLAUDE.md R-70`：新增**面向用户的提醒 / 流程 / 人工动作**须**逐项**请支书确认，不得随批「一起进」；注释里的「支书批」**必须能指到具体问答记录**。判据收窄到「支书作为批准者的断言」（370 → 229 条命中） | `doc-consistency::S12`（同一行须带可核验日期 `YYYY-MM-DD`；迁移台账已清空 = 此后零容忍）。⚠ **日期能否真指到问答记录，机器查不了**——该半截靠支书复核，**不假装守卫覆盖整句纪律** |
| R30 「人工归集」类要求须由服务端代劳 | 提醒要求支书「请逐人归集」组员进展，而四项都已建服务端表、缺的只是按 `personId` 聚合的读接口——**算得出来的东西派给人做 = 虚假工作量** | 纯聚合单一源 `services/member/member-progress.js::aggregateMemberProgress`（服务端**同源 import**）+ 读接口 `GET /api/v1/leader/member-progress` + 前端双态载入器；界面由「催人干活」改「**呈报实况**」 | `member-progress.test.mjs::S1–S4`（S1 结构单一源：接口源码不得自写判定） |

> **本轮方法论要点（可迁移，①–⑫）**：①「**同一事实几份**」→ 3.3 去重；「**同一能力几处**」→ 本台账**引擎化**（R14/R15）；②「**口径寄生环境**」→ 算式显式（R17）与「量尺须生产同构」；③「**绕过守卫的等价写法**」→ 守卫须按**语义**判而非按字面判（R16 快照 / R18 人名变量 / R13 注释两级规则）；④「**为修一个 bug 复制一份实现**」→ 同一实现体挂多门（R19）；⑤「**能力收进引擎 ≠ 已收口**」→ 必须**反向枚举**（先查使用点、再查实现点）（R21/R22）；⑥「**单一源搬迁 = 一次全仓改签**」→ 换文件 / 换名字后须 grep 旧路径（含 `?v=`）并断言 0 命中，静态守卫只锁形态、锁不住引用完整性（R22 真实事故）；⑦「**单一源不吞语义**」→ 通用能力只提供**挂载点**（如 `cellClass`），领域语义留在域内（R23）；⑧「**被取代的实现痕迹要连注释一起清**」——注释与代码不同源即误导，会被后续 AI 当规范读（R24）；⑨「**归一也是一份口径**」——读侧归一同样只能有一个出口（R25）；⑩「**文档里的数字与名称也是口径**」——不一致不是文风问题，而是**缺守卫**（R26）；⑪「**静态断言锁形态、真机普查锁体验**」——支书以「我体验到的」提出的病灶，必须用**真机全站普查**取证（R27）；⑫「**只修一处 = 没修完**」——病灶是「**一类形态**」不是「一处 bug」：修完立刻数「同一形态全站还有几处」（按语义枚举），>1 处即建台账 + 真机覆盖，并让守卫把「新增同类未纳入覆盖」变红（R28）。
> **并附（2026-09-29 批次 262 增）**：⑬「**弃用只做到引用层、没做到资产层**」——删引用 ≠ 删资产（`docs/assets/vendor/` 曾留下两件零引用死库，见 `.ctx/REVIEW_QUEUE.md` `H-17`）；「目录分层 / 改路径」后必须扫**动态 import 的模板字面量**（静态守卫与 `module-load` 曾双双绕开，见 `H-15`）。

#### 复核保留（2026-09-03 定，防过度合并）
- ① `TYPE_META` / `STATUS_META`：支部侧（「待党委批复」+ desc）与党委侧（「待批复」）文案不同，属**双视角差异**，暂不合并。
- ② `makeup::MANDATORY_ACTIVITY_TYPES`（刚性考勤子集 + 主题党日）与 gallery 色名：业务语义 ≠ 三会子类清单，不并入 subtypes。

#### 复核约定
- 每完成一个行动线条目，回 §四 更新状态并留日志（`.ctx/logs/**`）。
- 评分按季度或重大架构变更后复核一次，防「评估僵尸化」。
- 用户否决某条优先级时，只调顺序不改表结构；新方向裁决追加为后续编号行。

---

## 四、改造行动线（现行唯一行动清单）

> 状态：✅ 已收口 / 🟡 在办 / 后续。已完成的总账（P0–P14 / G0–G2 / 8.7 系列 / 各轮审查 P1–P2）见 `.ctx/logs/` 与 `.trae/specs/`；本节只挂**仍未闭**的动作。

### 专项台账（`H20.3(e)` 快照）

| 专项 | 状态 | 下一动作 | 单一源指针 |
|---|---|---|---|
| mock ↔ API 结构真值 | ✅ 持续 | 新表 / 新字段必须进 manifest 并过 parity | `seed-manifest.js`、`mock-api-parity` |
| seed 漂移与数据生命周期 | ✅ 安全模式 | cleanup / rebuild 按需运行；保留期策略待支书裁定 | `seed-drift.js`、`server/scripts/{cleanup,rebuild-demo}.mjs` |
| daily 分层与预算 | ✅ | 预算只降不升；新增测试同批登记层级 | `test-tier-registry.mjs`、`test-tier-guard` |
| 多支部形态与 P13 余项（`B-503-2`） | 🟡 在办 | 待支书裁定；裁定后与读过滤下推、写门同批 | `.ctx/logs/archive/2026-10/2026-10-AUDIT_R9_DATA_STRUCTURE.md` |
| 其余已收口专项 | ✅ | 沿革见 logs；计划见 `.trae/specs/`（跨组责任 / 汇报受众 / 派生待办 / 任命事务 / 浮层 / form-loop / 党委代配置 / 跨组落点 / 各轮审查） | 同左 |

### 上线残项（只留未闭）

| 编号 | 残项 | 状态 | 下一动作 / 指针 |
|---|---|---|---|
| L-02 | Linux 真机 `install.sh` / `update.sh` 未验 | 外部门 | 见下表；容器侧 `deploy/verify-linux.sh` 6/6 |
| L-13 | 页签 IA **A 40 / B 6 / C 0** | backlog | 按 `.ctx/evidence/2026-11-08/tab-review-ledger.md §四` 排批（剩余 8 条，F-2 待支书裁定 `P-5`） |
| L-14 / L-15 | 工作流块停用 / 画布 UI | backlog | 先出方案（`WORKFLOW_BLOCK_CONTRACT §8.4`） |
| L-17 | SQLite 宽表与索引 | backlog | `cd server; npm run probe:scale`（现读数：最大 679 行 / p95 ≤ 5.2ms，未触发）；单表 ≥ 1 万行或 p95 > 200ms 触发 `MIGRATIONS v2` |
| L-18 | 组件出口散件 | backlog | 随组件域改动同批收敛（`B-541-7`） |

> 已关闭项（L-09 / L-19 / L-20 / L-22 等）与逐条证据见 `.ctx/logs/` 与 `.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`，不再逐行占用本表。

### 外部门（不阻断本机合并 · 单一台账）

> **性质**：需要仓库外的人 / 机器 / 账号才能证明的事项。**不阻断本机合并**（`CLAUDE.md H20.5` 两段门槛 · `D-894`），只阻断上线；乙部、计划清账表、`next_prompt` 一律**只引用本表，不复制**（`open-items-guard` 机检五项列全）。
> **责任人口径**：五项的责任人都是支书（授权与外部协调），AI 只准备命令、证据模板与判据。

| 编号 | 事项 | 责任人 | 证据口径 | 复评触发 |
|---|---|---|---|---|
| L-02 | Linux 真机跑 `install.sh` / `install.ps1`（WSL 或测试机）/ `update.sh` | 支书授权，AI 出命令 | 三条脚本各自退出码 0 ＋ 安装后 `/login.html` 200 ＋ 附件目录可写；**批次 607 已取**：Windows 本机 200 ＋ uploads 可写；Linux 走 CI `install-linux`（读数 `.ctx/evidence/2026-11-23/deploy-l02.md`）；systemd / useradd / cron / 反代仍待真机 | 每次改动 `deploy/**` 或发布包白名单后 |
| CI | 首次 GitHub Actions run id（daily ＋ nightly 四片） | 支书提供仓库访问 | run id ＋ 结论；**无 run id 不得称已绿** | 首次 push 后；此后每次 workflow 改动 |
| 签收 | 真人（支书 / 支委）在 review 档完整走一遍上线路径并签收 | 支书 | 签收记录（日期 ＋ 账号 ＋ 走过页面清单）写 `.ctx/evidence/` | 每轮候选发布前 |
| SMTP | 真实邮件服务器实投（非 mock） | 支书提供凭据 | **批次 607 已取本机真实 SMTP 协议读数**（正常投递 / 认证失败 535 / 连接超时，`.ctx/evidence/2026-11-23/smtp.md`）；第三方服务商实投仍待支书提供 `SMTP_*` 后加 `--remote` 复跑 | 邮件通道配置或 `mailer*` 改动后 |
| M-01 | 移动端三任务：看通知并回执 / 表决投票 / 查看考勤（375 / 390 两档） | 支书提供真机 | 三任务各走通一次；无横向滚动、可交互文字 ≥13px、命中区 ≥44。AI 仿真 375 已过（命中区 44，不计真人验收） | 每次改动移动端布局或 `.vote-btn` 命中区后 |

**执行顺序**：① 外部门五项由支书授权后一次性补齐（只阻断上线）；② backlog 只登记、触发即做；③ 本表只归总残项与顺序，不改 §一 / §二 / §五 的评分与论证。

---

## 五、经验索引与当前值（便于 check；2026-09-15 批次 44 建）

> **本节唯一职责**：让人（支书）与 AI 在**一屏内**看清「**现在是什么** → 由谁守 → 还欠什么**」。**本节不复述细节**——判据在守卫文件、规则在 `DATA_CONSISTENCY_CHECKLIST §0.2`、**逐批沿革与打分论证在执行日志**（单一源 + 指针纪律）。

### 5.1 逐批沿革与打分论证（**已迁出 → 日志**）

> **迁出去向说明**：本节标题保留（`§五` 的编号被多处按「§五 → 沿革」的心智引用过）。**迁到哪儿**：沿革表 + 逐批「为何 +1 / 不加分」论证 + 分数与规模演进链 → `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：工程化评估逐批沿革**」节。**为什么迁**：本文件职能＝回答「现在工程化到几成、下一步该改哪里」，不答「哪一批做了什么」。**现在要查**：沿革去日志；现状看 §一 / §二 / §3.4 / §5.2。

### 5.2 当前值（一屏看现状）

- **六维（当前 · `D-913` 重评）**：业务与数据正确性 **77** · 安全与权限 **75** · 最小三成本体验（含前端与交互） **74** · 测试与发布质量 **69** · 架构与可维护性 **73** · 运行/部署/跨组织复用 **67**。**不计算平均总分**；高风险见 §一「阻断级风险」，逐维依据见 §二；重评理由见 `DECISION_LOG D-913`。
- **目录分层（当前 · 2026-09-29 批次 267 收官）**：`core/` **4 子域**（base 7 · domain 7 · boot 4 · session 4 = 22 件）· `data/` **新立**（4 适配器 ＋ `mock/` 15 件）· `services/` **5 域**（core 9 · member 9 · activity 12 · governance 11 · branch 8 = 49 件）· `components/` **7 域**（ui 13 · shell 6 · sections 2 · feedback 4 · record 11 · governance 13 · dashboard 4 = 53 件）· `capabilities/` **顶层 12 件**（2026-09-29 批次 268 增 `taskforce.js`） · `entries/` **3 类**（pages 15 · workspace 7 · tabs 68）· `workflow/` 8 件 · `config/` 1 件。**`modules/` 已消解**（能力声明上提顶层；3 件跨页件按判据归位：`branch-demo-nav` → `services/core/` · `references`/`help-catalog` → `components/sections/`）。落地方式与硬成本 ⇒ 见 §六 G2。
- **测试规模**：**动态口径，不写死**——以 `server/test/` 实测为准（分档见 `server/README.md`「测试耗时台账」）。
- **纪律与判据索引（当前）**：`§3.4` 收敛台账 **R13–R30 共 19 行**（含 `R28-附` / `R29` / `R30`）；`CLAUDE.md` 现行纪律 **R-68 ~ R-80**（真机同环境量测 · 不得以「等裁定」结束回合 · 授权声明可核验 · 异常面下沉动作级 · 守卫覆盖按接口逐维数 · 台账完备性三缺一 · 等待窗口须覆盖真实耗时 · 判据落在事实上而非手段上 · 增量而非绝对值 · 判据之间不得互相冒充 · 「不可达」只有两条出口 · 「成功」须确认落库 · 每个字段都要有判据）；自查问句 = `DATA_CONSISTENCY_CHECKLIST §0.1`（**现到二十七问**）；范本 = 同文件（**第六–第二十七**）；判例集 = `content/05_ai_coding/TEST_AND_VERIFICATION.md`。**逐条「哪一批增了哪一问 / 哪一范本」属沿革 ⇒ 见日志**。
- **浏览器本地业务数据（当前）**：**已无「暂留本机·未服务端化」的业务事实**。其余本机键按性质三类（草稿 / 预览 · 本机令牌 / 运行态 · 偏好与会话），判定与逐条理由 = `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.3`（机检镜像 = `localstorage-key-guard`）。

**评价资产索引（`D-894` 立；每次评分必须产出「证据 → 结论 → 改进项 → 复评触发」，开工先检索本表）**：

| 维度 / 对象 | 已有评价资产（证据落点） | 下一改进项（可验收判据 ＋ 落点） |
|---|---|---|
| 业务与数据正确性 | §2.1 得分依据 ＋ `D-864` / `D-886` / `D-887`；`.ctx/evidence/2026-11-20/backlog-reconcile.md` | 三层挂靠已收口：定义只在 `OBJECT_MODEL §2.1`、指针在 `PARTY_COMMITTEE_DESIGN §2.7`（`single-fact-consistency::⑥`）；D2 处置完整性已收口（`workbench-audit-coverage::W7`）；C2 验收＝审计报告 pass > 0（现值 37） |
| 安全与权限 | §2.2 ＋ `write-policy-matrix` 163 条 ＋ `multi-branch-read-filter` 9 组 | 门名处理分支已收口（`write-policy-matrix` R2）；多支部读面逐口取证 ＋ 开关演练已收口（`evidence/2026-11-23/multi-branch-read-ports.md`）；余 CI run id（外部门） |
| 最小三成本体验 | §2.3 ＋ 46 页签审计读数 ＋ `.ctx/evidence/2026-11-21/density-8pages.md` | 不设数字目标：调色板状态文字（291 处 / 56 文件）与手拼徽章（43 文件）逐文件不超基线、不出现新文件（`B-603-3`） |
| 测试与发布质量 | §2.5 读数（daily 264 / guards 81 文件 / 906 断言）＋ `test-tier-registry.mjs` | EA 读数 ≡ registry 已收口（`evaluation-asset-guard::⑤`）；余 CI run id（外部门） |
| 架构与可维护性 | §2.4 ＋ `D-888` 键级隔离 ＋ 三份契约 | 对象模型单一源已收口（同 2.1）；余 `B-541-7` 组件散件随改动收敛 |
| 运行、部署与跨组织复用 | §2.6 ＋ 批次 527 换轨读数 ＋ `deploy/verify-linux.sh` 6/6 | `L-02` 真机三步 ＋ `deploy-verify` run id（外部门） |
| 前端美学专项 | `D-893` ＋ `D-896`~`D-898` ＋ `card-consistency-guard` / `spacing-ratchet-guard` / 三份新守卫基线 | 不设数字目标；逐文件不超基线、不出现新文件；8 页读数复尺 |
| 台账与投影 | `ACTIVE_CONTEXT §3` ＋ `REVIEW_QUEUE` ＋ `.ctx/TIMESTAMPS.md` | 已作废项不得在任何 open 列表复现（批次 580 `D-892` 对账结论） |

### 5.3 一页指针

> 完整导航见 `content/03_doc_system/DOC_MAP.md`；本节只留最常查的四类。

| 想查什么 | 去哪里（唯一权威） |
|---|---|
| 规则 → 由哪个守卫守 → 当前状态 | `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2` |
| 判例（什么条件下会失效、怎么被抓住） | `content/05_ai_coding/TEST_AND_VERIFICATION.md` |
| 定了什么（裁定原文） | `.ctx/logs/YYYY-MM-DECISION_LOG.md` |
| 术语与口径唯一化 | `content/03_doc_system/OPERATIONS_GUIDE.md §19` |
| 换轨 / 部署 / 块数读数 | `.ctx/evidence/2026-11-03/security/summary.md`、`.ctx/evidence/2026-11-09/deploy-verify.md`、`.ctx/evidence/2026-11-14/d873-block-remeasure.md` |

### 5.4 每批任务的入口顺序（三步，谁改谁负责）

1. **改前**：读 `DATA_CONSISTENCY_CHECKLIST §0.2` 扫与本次改动相关的规则，再读 §0.1 十四问自问（答不实**先问支书**）；
2. **改中**：新能力 / 口径一律收进单一源（引擎 / 叶子件 / 常量表），**反向枚举**确认没有绕过单一源的自写实现；**同类病灶先数规模**（>1 处即建台账 + 真机覆盖）；
3. **改后**：更新 §0.2 总索引 + 相应守卫（新增断言即更新 `README` 守卫清单语区）；**交付报告第一屏给提交命令与未提交规模**（`R-66`）；**定向测试为主，交付前才跑全量**。

---

## 六、改进梯度（G0–G3）

> 排序原则：先做「机械可验证、失败可定位」的，再动「一改就牵动全链」的；每级可独立交付、独立复跑。

| 梯度 | 内容 | 状态 |
|---|---|---|
| G0 零风险 | 说明文件口径统一、服务可用性入口口径 | ✅ |
| G1 小步可验证 | 表单 / 徽章 / 表格 / 分页四库出口 ＋ 常驻守卫 | ✅ 已完成（各带守卫） |
| G2 结构性 | 物理目录分层（`core/data/services/components/entries`） | ✅ 已完成 |
| G3 已获支书点选 | G3-1 语义化 release；G3-2 全量 config 引擎（`POLICY_DEFAULTS` 26 叶键）；G3-3 工作流组合推广 | G3-1 / G3-2 ✅；G3-3 🟡（块停用与画布 UI 先出方案） |

**梯度纪律**：不许跳级；每级验收判据与风险见本节历史版本（`.ctx/logs/`）；新方向裁决追加为后续编号行。

## 附：沿革与口径注

> **迁出去向说明**：本节原有四段（评估沿革（一句）、关键日期与支书再评定调要点、文件沿革（旧路径段）、执行日志索引）已于 2026-09-17 **逐字迁出**至 `.ctx/logs/archive/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节。**为什么迁**：本文件职能＝评估结论、工程纪律与行动优先级，「历轮分数怎么变 / 关键日期 / 文件改过什么名 / 日志索引」是沿革。**现在要查**：沿革去上述日志附节；现状看 §一 / §二 / §3.4 / §5.2。
