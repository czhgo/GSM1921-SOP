---
title: "Active Context — 当前判断入口"
type: active_context
role: "[AI]"
layer: active
last_updated: 2026-11-21
last_verified: "2026-11-21"
latest_decision: "D-899"
budget: "≤300 行 / ≤30KB"
source: [CLAUDE.md, .ctx/SNAPSHOT.md, .ctx/ENGINEERING_ASSESSMENT.md, .ctx/ACTIVE_RULINGS.md, .ctx/logs/2026-11-DECISION_LOG.md]
status: active
---

# Active Context — 当前判断入口

> **这是 active context，不是仓库。** 每次会话只读本文件 ＋ `CLAUDE.md`；其余 `.ctx` 文件按需读取。
> **`.ctx` 是仓库**：保存全量裁定、证据、日志、机器元数据。规则 / 判例 / 方法正文在 `content/01–05`；本文件只做当前投影。
> **预算**：≤300 行 / ≤30KB。超预算时把细节降级到参考文件并留指针，不得继续堆。
> **冲突顺序**：当月 `DECISION_LOG` ＞ 本文件 ＞ `content` 权威 ＞ `SNAPSHOT` ＞ `ENGINEERING_ASSESSMENT` ＞ `logs` / `evidence`。发现冲突先找最新 `D-xxx`；找不到就补一条裁定，不静默择一。

## §1 系统现状（只读这一屏）

- **形态**：原生 ESM 多页应用 ＋ Node/Express ＋ better-sqlite3；页面 26 个（18 根页 ＋ 8 工作台/只读视图）；工作台 7 个（支书 / 组织 / 宣传 / 纪检 / 组长 / 成员 / 党委）；党委台 4 页签（下发通知 / 院级内容 / 支部上报 / 支部管理）。
  - source：`.ctx/SNAPSHOT.md §I/§III`。
- **URL**：无后缀已落地（`D-867`）：`pageHref()` 单源 ＋ `resolveDocumentUrl` ＋ 运行时 `link-normalize`；旧 `.html` 保持 200；真机登录后 URL＝`/workspace/secretary?tab=today`，站内 `.html` 锚点 0（`help` / `about` 除外）。
- **数据**：业务表 50 张（34 资源 ＋ 10 语义 ＋ 6 工作组）；SQLite 宽表 `id + data(JSON)`；schema **v19**（v13 生成列 / v16 提案两表 / v17 `branch_visits` / v18 报名唯一索引 / v19 多支部键级：`collection_versions(branch_id,name)`、`sessions.branch_id`、`attachments.branch_id`）；空库首启补最小组织基线。
  - source：`server/data/domain-contract.mjs`、`content/04_web_design/data/DATA_CONTRACT.md`。
- **权限**：写入口权限矩阵 **162 条**（156 enforced / 4 self-service / 2 public / **0 known-risk**）；守卫断言运行期写路由 ≡ 矩阵；审计 C1 查矩阵 + 高风险抽样。统计口径：`WRITE_POLICY_MATRIX` 按 `status` 计数（2026-11-15 实测；T14 新增进入 / 退出支部查看两写口）。
  - source：`server/security/write-policy-matrix.mjs`、`content/05_ai_coding/AUDIT_CANON.md`。
- **六维（`D-883` 重校，批次 589 · `D-899` 复核未变）**：业务 **80** / 安全 **78** / 体验 **79** / 测试 **73** / 架构 **76** / 部署 **71**；**只作诊断，不单独阻断本机合并**（`D-894` 两段门槛）。未闭：CI 无 run id、`test:full` 未整体重跑、Linux 真机未验（L-02）、D2 计数对账仅 3 页签、C2 写口往返 0 pass、真人签收未完成。
- **审计**：46 页签 **P0 0 / P1 0 / P2 0 / exception 44**（2026-11-21 批次 589 实跑）；审计工具已修复（URL 跟随无后缀 canonical、登录失败 `exit 2`）。F1–F8 全绿；M1–M3 在位。
  - source：`.ctx/evidence/2026-11-21/tab-audit/summary.md`（原始截图与 findings.json 可重跑再生，未入库）。
- **测试（四层，`D-859` / `D-860` / `D-863`）**：daily **32 文件 / 265 断言 / 106.8s**（结果门禁，2026-11-21 批次 589 读数）；guards **125 文件**（registry 登记；静态调用点 884 / 预算 884；E4 真机装配已扩到 8 页、属 precommit 层）；precommit＝daily＋guards＋非核心域回归＋e2e；`test:full` 最近读数 **1779.0s**（三通道各 1 红已逐文件分诊并修复，**未整体重跑**）；weekly 2。四层 runner 按 registry 单一源执行；CI 已配置 daily ＋ nightly 四片矩阵（**尚无 run id，不得称已绿**）。
  - source：`server/test-tier-registry.mjs`、`.ctx/logs/2026-11-DECISION_LOG.md §D-859 / §D-860 / §D-863 / §D-864`。
- **工程评分（`D-883`，2026-11-19 保守重校）**：业务与数据 **80** · 安全与权限 **78** · 最小三成本 **79** · 测试与发布 **73** · 架构与可维护性 **76** · 运行部署 **71**；不设平均总分；分数只作诊断（`D-894`）。
  - source：`.ctx/ENGINEERING_ASSESSMENT.md §一 / §二 / §5.2`、`.ctx/logs/2026-11-DECISION_LOG.md §D-883`。
- **版本戳**：`20261120a`（`bump-version --check`：0 处陈旧，CODE_VERSION 一致）。
  - source：`docs/scripts/bump-version.mjs --check`。
- **换轨**：生产空库 `preflight-cutover --strict` exit 0 / 警告 0；契约现为 50 表，正式换轨前按 runbook 重跑 export → dry-run → apply 并落 evidence（`D-845`）；生产路径只走个人密码（`D-882`）。
  - source：`deploy/CUTOVER_RUNBOOK.md`、`.ctx/evidence/2026-11-03/security/summary.md`。

## §2 现行裁定摘要（跨域、仍生效、会影响下一步）

> 规则正文在 `content`；本表只给「一句话 + D + 落点」。分域索引见 `.ctx/ACTIVE_RULINGS.md §B`。

- **支委会＝支部领导管理机构，也是组织型主体**：可作「承担方」，但不是角色键、不能登录；支委层权限仍由五个委员角色键承载。（`D-550` · `D-573` · `D-612`）→ `content/02_institution/SYSTEM_ROLE_PERMISSION.md` 附录。
- **写入活动＝党小组组长；写入时指定组织者，指定即赋权、解除即收回**；全支部通知仍归支书。（`D-308` · `D-309` · `D-312`）→ `SYSTEM_ROLE_PERMISSION §9h/§9i`。
- **组织者上传位在成员本人页面**，不进入组长台；组长与组织者是两个概念。（`D-494` · `D-808`）→ `content/04_web_design/PRODUCT_IA.md`。
- **活动一律报备**（走微信群，报备通过后写入）；不写「报备即知情 / 默认同意」。（`D-286` · `D-289` · `D-311`）→ `content/02_institution/sop/常见工作场景快速指南.md`。
- **补课范围：支部党员大会 / 党课为硬要求，任何单场活动不能关；其余类型逐场开关**。（`D-293` · `D-545`）→ `SYSTEM_ROLE_PERMISSION §9l`。
- **思想汇报篇幅提醒只给提交人本人**；组织侧不留「篇幅不足」标记。（`D-547`）→ `SYSTEM_ROLE_PERMISSION §9l`、`DATA_MODEL §2.25`。
- **出勤率只提示、不设阈值；只给支委会与本人，不公示**。（`D-304` · `D-537`）→ `SYSTEM_ROLE_PERMISSION` 附录、纪检指南。
- **意见反馈处置归支委层，匿名支部内闭环、不揭名**；事项领域只给归口建议、不自动派单。（`D-550` · `D-824` · `D-551`）→ `SYSTEM_ROLE_PERMISSION §9j`。
- **写权限唯一机读源＝矩阵**；新增写入口未登记即判红；C1 不再按中间件字符串判风险。（`D-847`）→ `content/05_ai_coding/AUDIT_CANON.md`。
- **会话 3 小时过期**；production 多支部拒绝启动；review 档使用独立演示库。（`D-848`）→ `server/routes/auth.js`、`server/run-mode.js`。
- **多支部同实例只到设计稿**：Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH`；上线坚持一实例一支部。（`D-849`）→ `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`。
- **规则与判例先进 content，再进 .ctx 索引**；`.ctx` 不再承担规则正文。（`D-850` · `D-852`）→ `.ctx/README.md`、`content/05_ai_coding/CONTEXT_MANAGEMENT.md`。
- **乙部余项合并批**：待办派生先上最小 Plan B（服务端只读端点 + 客户端切读 + 降级），完整版阶段门槛登记为 `B-500-7b`；R5 旧账全量对账；9 条 precommit e2e 全绿；`text-xs` / help.html 色转守卫棘轮。（`D-855`）→ `server/routes/todo-groups.js`、`CLAUDE.md 乙部`、`type-scale-guard::Q6`。
- **界面信号与颜色权威**：状态 / 装饰左条退出（CASE-DESIGN-033）；焦点沿用 SD-27 单环、2px 不加宽、双层环不得回潮；`styles.css` 为唯一颜色权威，`constants.js` / `tailwind-config.js` 受守卫镜像；7 类待办组全部服务端化且测试先行；数据分层写入 `H32`。（`D-856`）→ `DS_03 SD-25`、`theme-palette-guard::T12/T13`、`server/test/todo-derive-parity.test.mjs`。
- **CLAUDE 三层与通知受众**：温层恢复为「触发表 + H60–H80」，层边界 / 乙部去历史有守卫；系统通知无受众＝不可读、广播必须显式 `all`、未登录一律不可读；行动行按 SD-60 四类排布。（`D-857`）→ `CLAUDE.md`、`notice.js`、`DS_06 SD-60`、`action-row-wrap-guard`。
- **党委内容域与公共门厅**：未登录只看党委公开内容（公开通知全文 / 活动摘要 / 公开资料），登录后看党委与支部并集；`public` 只归党委、必须带未来有效期并留痕 `publication_audits`；支部副本只改执行字段、手动同步。（`D-858`）→ `SYSTEM_ROLE_PERMISSION §9a.1`、`PUBLIC_ENTRANCE.md`、`server/routes/public-portal.js`。
- **测试瘦身（结果优先、守卫按需）**：四层 daily / guards / precommit / weekly；daily 只留结果门禁（权限、会话、数据契约与迁移、核心业务结果、构建可运行），静态守卫迁 guards 按需跑；不删任何测试或断言，precommit / full 仍覆盖全部文件。（`D-859`）→ `server/test-tier-registry.mjs`、`server/scripts/run-{daily,guards,precommit,changed}.mjs`、`CLAUDE.md H25`。
- **六维评分口径（`D-862`）与当前值（`D-883`，见 §1）**：只按证据加减分，不因「做了工具」自动加分；同一指标只留一个当前值，历史读数只查 `DECISION_LOG`（`H26.5`）。加分只认实跑读数，配置、自动走查、文件数、本地等价不计满分（部署 6/6 只作下限）。→ `.ctx/ENGINEERING_ASSESSMENT.md §一 / §二 / §5.2`。
- **批次 540 前端交互契约**：待办跳转未命中本台页签一律 fail-closed（可见提示「本台无该模块」＋ 同义落点），禁 toast-only；议程「来源 → 类型 → 待议池」两端同源 import；同列同语义 ≥3 行只走 `renderDataTable`；活动详情四段收口、分工视图 4 → 2；图标色值只许 `currentColor` / `none` / `var(--token)`，hex 扫描含 data-URI 的 `%23`。（`D-863`）→ `content/04_web_design/contracts/{INTERACTION_AND_NAVIGATION,AGENDA_DERIVATION,TABLE_COMPONENT}_CONTRACT.md`、`content/04_web_design/design-system/CASES.md` CASE-DESIGN-036…041、`DS_03 §4.11.2`。
- **批次 541 P2 分拣与三条读面口径**：P2 按 A / B / C / D / E 五类分拣，B 类未写触发不得开工，C 类关闭不再复核；应到口径单一源＝`roster-eligibility.js`（滞留保留身份、应到剔除；已转出前置剔除），待办行读权限单一源＝`todo-read-policy.mjs`，公共门厅过期 / 缺失有效期一律 404 fail-closed，定向通知须同时比对支部。（`D-864`）→ `.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`、`.ctx/REVIEW_QUEUE.md B-541-1…11`。
- **产品对象模型与议事流**：三层为「党小组 → 活动 / 专班 → 工作组」，工作组不设指导支委；组长「组内全权 ＋ 支部提案」；上会「统一事项 ＋ 回执」，建会与决议只归支书 / 副支书；URL 取「去后缀 ＋ 兼容」，旧 `.html` 保持 200。（`D-866`）→ `content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md`。
- **三项子裁定 ＋ URL B 已落**：支部级专班存在（`taskforces.hostGroupId` 可空）；决议默认受众＝支委 ＋ 提案人 ＋ 受影响人；组长提案对全体支委可见；URL 由 `pageHref()` 单源＋运行时归一出清。（`D-867`）→ 设计稿 §五 / §七。
- **对象模型已落**：活动与专班并列、互不挂靠；工作组是二者各自 1:1 执行载体；专班补 `organizingScope/hostGroupId`，新记录必选承办方，历史「待补」一次性补选；专班不产生考勤。（`D-868`）→ `DATA_MODEL §附二`、`workgroup-routes.js`、`taskforce-tab.js`。
- **支委提案已落**：`committee_proposals` / 事件表（schema v16）；`pending → queued → on-agenda → decided → closed|rejected`；组长可提、支委受理、支书排期/决议；回执 6 类，决议可回写草案活动 / 专班。（`D-869`）→ `server/routes/committee-proposals.js`、`committee-proposal.js`。
- **三台专项探查 P0 收口**：提案决议与议程同事务单一事实；支委会建会 / 议程结果仅支书 / 副支书；报表读口收为支书 / 副支书 / 组织委员 / 党委；宣传台看板只读不闭环活动；组长进展读口按角色 / 组收口；M7/M8 迁移期望改由 `SCHEMA_VERSION` 派生，新增写门矩阵 evidence 行号守卫。（`D-870`）→ `server/routes/{committee-proposals,report,leader-progress}.js`、`resources/gates.js`、`docs/src/core/domain/party-group-scope.js`。
- **547 边界已闭环**：专班折叠区真机流补 `summary` 展开；消息页补 `emptyStateHtml` import；`issue-unread` 清 `secretary-review` 角标仅支书 / 副支书可写 `unread:false`（矩阵与回归测试同批）。（`D-871`）→ `form-loop-registry.mjs`、`messages-entry.js`、`semantic-routes.js`、`write-policy-matrix.mjs`、`issue-unread-gate.test.mjs`。
- **L-16 已落**：表决名单 `voteConfig.voterIds` 由服务端建会冻结——写库前按 `users` ＋ 组织归属算一次（剔滞留 / 已转出），客户端提交值不作数；会议期间不随组织变动，组织变动下次建会生效。（`D-872`）→ `server/routes/committee.js::resolveFrozenVoterIds`、`server/test/agenda-votes.test.mjs`。
- **删活动留痕（D-876）**：报名与表决行保留 ＋ `activitySnapshot`（标题 / 日期 / 类型 / 场景 / deletedAt）；匿名表决仍无个人选项映射；前端 mock 同口径。→ `server/routes/resources/index.js`、`docs/src/data/mock-adapter.js`。
- **L-22 / B-541-1 已复核关闭**：三处「10 / 14 / 9 块」是 `dom-probe` 把行内叶子计成块的误报；探针改口径后实测 2 / 4 / 2，基线不改。（`D-873` · `D-874`）→ `server/scripts/audit/dom-probe.mjs`、`.ctx/evidence/2026-11-14/d873-block-remeasure.md`。
- **待裁清零（`D-885`，批次 573）**：12 条口径一次落盘并代码化——副组长＝独立身份键只共享工作台；解除组织者补「更正」通知（新 kind `organizer-designation-corrected`）；工作流标签＝待支委会审议 / 已审议；支委会档「未通过」＝退回待批；组织者任务随活动完成自动销项；制度草案按领域派生待办 ＋ 改派（批次 574）；`SOP-B-33` / `SOP-F-5-⑥` 裁定不做；`SOP-B-27` / `SOP-B-44` 进 Phase 3。→ `SYSTEM_ROLE_PERMISSION §9a0`、`system-notice-kinds.js`、`definitions.js`、`DATA_MODEL §状态表`、`activity.js`、`G1` 守卫。
- **制度与任务派生（`D-886`，批次 574）**：制度草案按「领域 → 主体」派生推进待办，改领域即换主体（先撤旧条再派生）；组织者分配的「工作分工」进「我的任务」，完成即回写工作分工；演示种子补 `executor`；组长台「我的任务」复核为已落地（U-35）。→ `todo.js::InstitutionTodoDeriver`、`branch-doc.js`、`activity.js`、`leader/my-tasks-section.js`。
- **发展对象硬门（`D-887`，批次 575）**：进入「发展对象」必须存在支委会讨论通过留痕，否则 422；积极分子最短考察期 `member.activistMinMonths`（默认 12，0＝不设期限，组织域可调）。→ `server/routes/member.js`、`policy-defaults.js`、`settings-entry.js`。
- **sample-diff 收口（`D-890`，批次 578）**：六条样本支书全取保留；四条可布尔化口径入判例——缺证据即拒 / 缺省可见性冻结 / 派生随来源终止 / 提问自解释；本批无代码、六维不加分。→ `content/05_ai_coding/TEST_AND_VERIFICATION.md`。
- **副支书操作权参数（`D-891`，批次 579）**：副支书与支书同页同台、独立账号键；**主责归支书**，任务 / 提醒 / 统计不随参数变化。四类主责动作（活动编辑 / 全支部通知 / 名册阶段 / 支部配置）的操作权由 `role.deputySecretary` 三档（`full` 默认 / `standard` / `custom`）决定；设置中心可改。→ `docs/src/core/domain/deputy-capability.js`、`server/routes/resources/deputy-policy.js`。
- **全仓历史目标对账（`D-892`，批次 580）**：作废 / 删除 12 项（B-3、F-3/4/5、B-8/9、L-08/11/12/16、B-541-11/H-12/H-18）；重规划 6 项（L-10 逐读口取证、L-02/CI/签收归外部门、L-14/15 合并、L-17 可测阈值）；`B-522-1` / `B-500-7b-2` 改单项证据门；跨平台脚本改 `scripts/with-env.mjs`。→ `.ctx/evidence/2026-11-20/backlog-reconcile.md`。
- **前端美学收口（`D-893`，批次 581）**：卡厚度统一 16/12（`.card-standard` / `.card-compact`，`p-5` 退出卡内边距）；手写卡头 600；状态色统一 `--status-warning-text` 并删暗色僵尸补丁；假徽章 / 灰底卡 / 越档 / 无名 section 同批修；新增 `card-consistency-guard`。卡头全量迁移已在批次 586 补齐（`D-896`）；`B-522-1` 低密度页已在批次 588 收口（`D-898`）。
- **评分即资产与两段门槛（`D-894`，批次 584）**：`H80` 增第 6 条——评分必须产出「对象 / 证据 / 结论 / 改进项 / 复评触发」，开工先检索 `EA §5.2` 资产索引；`H20.5` 合并门槛拆本机门 / 外部门，六维 <80 只作诊断；新增 `evaluation-asset-guard`（2.1–2.6 改进项指针 ＋ 资产索引 ＋ 两段门槛 ＋ 反例）。→ `.ctx/ENGINEERING_ASSESSMENT.md §5.2`、`server/test/evaluation-asset-guard.test.mjs`。
- **卡头单源收口（`D-896`，批次 586）**：70 处页面级 / 面板级卡头（29 文件）改 `renderCardHeader`，内嵌面板走 `variant:'panel'`（14/600，`.card-head--panel`）；`docs/src` 手写卡头 H3 归零，`card-consistency-guard::②` 锁死（静态页 `search.html` 白名单）；真机设置 / 今天 / 活动详情三页 PASS。→ `docs/src/components/shell/page-frame.js`、`docs/src/styles.css`。
- **前端存量清零（`D-897`，批次 587）**：调色板状态色按文件棘轮只减不增（286 处基线，本轮目标文件清零）；假徽章改 `badgeHtml`；日历翻页 `h-8` 改 `.btn-sm`；新增 `status-palette-text-guard` / `badge-single-source-guard` / `button-height-guard`。→ `docs/src/**`（10 文件）、`server/test/*-guard.test.mjs`。
- **B-522-1 低密度与空态（`D-898`，批次 588）**：首页 / 概况数字卡按内容收窄（`.stat-grid--content` / `.metric-band--cards--content`，真机四卡 133.6–157.6px）；日历 31 格登记特例；今天页并入「最近动态 3 条 ＋ 下一步」，首屏空白 0.715 → 0；归档空态补「最近归档 ＋ 下一步」（演示库非空未触发）。→ `docs/src/{styles.css,services/governance/today-summary.js,entries/tabs/today/today-tab.js,entries/tabs/prop/archive-tab.js}`。
- **兜底仪表与资产命中（`D-899`，批次 589）**：`todo-tab-shell` 增兜底计数 ＋ `window.__TODO_DERIVE_FALLBACK__`；新增 `todo-derive-instrument-guard`（ok 路径不调用 7 类 builder、`UNSUPPORTED_GROUP_KEYS` 为空）；`check-batch-commits` 强制 body 写「资产命中：<EA §x / D-xxx>」；乙部删除 C-3 / C-4 / B-522-1 / B-500-7b-2。→ `server/scripts/check-batch-commits.mjs`、`CLAUDE.md`。

## §3 当前风险与下一步

### 阻断级风险（5 条，逐条复核）

1. **多支部同实例会跨支部读出数据**：读面未统一过滤；production 已硬拦多支部。四条框架缺口已按 `D-888` / `D-889` 落地（版本键 / 会话 / 附件 / 门厅支部维度），`ALLOW_MULTI_BRANCH` 仍关闭。**框架层闭环，开关未开**。
2. **通用写口权限**：矩阵 **162 条** / 0 known-risk，6 条缺口已修；`issue-unread` 派发位已加 403 校验，清支书角标仅支书/副支书（`D-871`）。**闭环**（多支部框架缺口已按 `D-889` 落地）。
3. **表决选民名单来自活动数据本身**：服务端已改为建会时按 `users` ＋ 组织归属计算并冻结（`D-872`），客户端提交值不作数。**闭环**。
4. **共享口令**：会话已 3 小时过期，个人密码已落地（21/21）。**部分闭环**；生产形态已拒绝共享口令回退（`D-882`，569 实现），共享口令仅非生产演示；`preflight-cutover` ⑧ 检查个人密码覆盖。
5. **SQLite JSON 宽表是规模边界**：无业务字段索引；万行级前评估 `MIGRATIONS v2`。**保留**。

### 上线残项中仍 open 的（详见 `.ctx/ENGINEERING_ASSESSMENT.md §四`）

- `L-02`（**外部门**）`install.sh` / `install.ps1` / `update.sh` 未在 Linux 真机验证；容器可验证部分 `deploy/verify-linux.sh` **6/6**，CI `deploy-verify` job 未实跑；由支书授权后一次性补齐，不阻断本机合并。
- `L-10` 读口已统一走 `resourceRowsForActor`；余「逐读口取证 ＋ `ALLOW_MULTI_BRANCH` 开关演练」，开关仍关闭。
- `L-13` 页签 IA 未闭项 **A 37 / B 9 / C 0**；6 个超 4 块页签登记例外；默认两条已复核为波次 C 落地（`D-887`）。
- **公开内容与党委内容读面（`D-858`）**：未登录只读 `publishScope='public'` 且未过期的党委内容，过期即 404 fail-closed；党委内容只经服务端读口（`/committee/*` 与公开门厅），客户端不得本地派生可见性、不得带出支部名与成员字段。
- `L-14` / `L-15` 工作流块停用与画布：先出方案，未出方案前不排执行状态。
- `L-17` 宽表与索引：单表 ≥ 1 万行或 p95 查询 > 200ms 触发评估。
- `L-18` 组件出口散件。

### 下一批任务

1. **分支与合并（`H20.5` 两段门槛 · `D-894`）**：`release/2026-11-launch` 尚未推远端（SSH host key 未授信、`gh` 未安装）。**本机门**＝`test:daily` ＋ `test:guards` 绿、`audit-tabs --all` P0/P1=0、工作树无意外改动、六维诊断表已刷新，＋支书确认即可合并；**外部门**＝Linux 真机 `L-02`、CI run id、真人签收、SMTP 实投，只阻断上线。六维 <80 只作诊断。
2. **单项证据门任务**：已清零——`B-522-1`（批次 588 · 8 页读数见 `.ctx/evidence/2026-11-21/density-8pages.md`）、`B-500-7b-2`（批次 589 · 兜底仪表 ＋ 7 类对账守卫）。
3. **外部 / 真人清单**：Linux 真机 L-02、CI run id、push / PR、SMTP、真机三任务、签收、timer。

## §4 文件地图（读什么 / 不读什么）

| 层 | 文件 | 何时读 | 不读什么 |
|---|---|---|---|
| **active** | `CLAUDE.md` | 每次会话 | 历史沿革 |
| **active** | `.ctx/ACTIVE_CONTEXT.md`（本文件） | 每次会话 | 全量裁定、证据 |
| **温层** | `content/05_ai_coding/UI_REVIEW_CHECKLIST.md` | 改 UI / 布局 / 交互时（按任务组） | 每次会话必读、规范正文（在 DS 各编） |
| reference | `.ctx/SNAPSHOT.md` | 需要目录 / 页面 / 表清单时 | 批次流水（已迁 index） |
| reference | `.ctx/ACTIVE_RULINGS.md` | 需要分域裁定索引时 | 规则正文（在 content） |
| reference | `.ctx/ENGINEERING_ASSESSMENT.md` | 定下一批 / 看评分证据时 | 活跃上下文默认不读 |
| reference | `.ctx/REVIEW_QUEUE.md` | 每批开工前扫未闭环 | 已闭环（已删） |
| reference | `.ctx/TIMESTAMPS.md` | 收尾核对 / 改文件后 | 叙述 |
| provenance | `.ctx/logs/YYYY-MM-*.md` | 追溯成因 / 裁定原文 | 不用于日常决策 |
| provenance | `.ctx/evidence/YYYY-MM-DD/` | 复核真机读数 / 截图 | 不用于日常决策 |
| knowledge | `content/01–05` | 按任务类型读 | 不重复 .ctx 状态 |

## §5 保鲜与冲突

- **更新触发**：每批收尾；每条新 `D-xxx`；六维评分变化；上线形态变化。
- **保鲜判据**：`latest_decision` 必须 ≥ 当月决策日志最后一条 `D-xxx`；`last_verified` 必须 ≥ 最新裁定日期。守卫：`ctx-hygiene-guard` / `docs-governance-guard`。
- **超预算处理**：先删「已不行动」的行；再把细节降级到 reference；最后才压缩措辞。不得用缩小字号 / 合并长句逃避预算。
- **僵尸行**：连续 3 批未触发且不再影响动作的摘要行，删除或降级。
- **冲突处理**：当月决策日志 > 本文件 > content 权威 > SNAPSHOT > ASSESSMENT > logs；无 `D-xxx` 的冲突不得自行择边，登记到 `REVIEW_QUEUE` 或丙部待裁。
