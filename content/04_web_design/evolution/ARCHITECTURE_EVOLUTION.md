---
title: "架构演进——组件化落地评估与轻量插件化设计"
type: design
role: "[工程师]+[AI]"
created: 2026-08-22
last_updated: "2026-11-16"
status: active
related_files: [DATA_MODEL.md, SOP_WEBSITE_GUIDE.md, DEPLOYMENT_GUIDE.md, ../module/PUBLIC_ENTRANCE.md, ../../03_doc_system/ARCHITECTURE.md, ../../05_ai_coding/README.md]
---

# 架构演进——组件化落地评估与轻量插件化设计

> **本文负责**：系统架构的**演进方向与承载机制**——组件化落地的历史结论、M1~M8 落地账、L1~L5 层级愿景，以及 L3/L4 的架构锚点与 YAGNI 边界。
> **本文不负责**：① **架构的现行描述**（分层 / 目录结构 / 单一事实源注册表）→ [ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md)；② **工程化现状与下一步改造行动线** → [ENGINEERING_ASSESSMENT.md](../../../.ctx/ENGINEERING_ASSESSMENT.md)（本文件的评估正文已由它承接）；③ **L3 块封装的字段规格** → [WORKFLOW_BLOCK_CONTRACT.md](../contracts/WORKFLOW_BLOCK_CONTRACT.md)；④ **支部工作地图（L4 的设计稿）** → [BRANCH_WORK_MAP.md](archive/BRANCH_WORK_MAP.md)。

> **定位**：一次关于系统架构的探索——「高度组件化、高度可复用」的目标落地到什么程度？距离「一切皆插件」的灵活性还有多远？上线后的多轮迭代靠什么机制承载？本文档只表达探索与选择，不代表最终结论，更不代表方案完备。
> **受众**：[工程师]+[AI]（架构维护者、开发者）+ 愿意给出架构反馈的外部评审者
> **关联**：[DATA_MODEL.md](../data/DATA_MODEL.md)（数据模型与数据流权威源）、[SOP_WEBSITE_GUIDE.md](../module/SOP_WEBSITE_GUIDE.md)（SOP-系统联动方法论）、[DEPLOYMENT_GUIDE.md](../deploy/DEPLOYMENT_GUIDE.md)（部署落地路径）、[ARCHITECTURE.md](../../03_doc_system/ARCHITECTURE.md)（核心架构说明）、[ENGINEERING_ASSESSMENT.md](../../../.ctx/ENGINEERING_ASSESSMENT.md)（工程化评估与改造行动线——评估结论的现行承接）。

---

## 一、出发点

设计之初就提出过一个方向性要求：**高度组件化、高度可复用**。这个方向本身没有异议，但它从未被系统性评估过——「落地到什么程度」是缺失的。本文档补上这次评估，并回答两个衍生问题：

1. 为了满足预期功能，可能存在的最优架构是什么？当前设计与它的差距在哪、优化空间有多大？
2. 系统上线后还会经历多轮迭代（功能增减、角色权限变化、技术栈演进），迭代靠什么机制承载？

评估过程中观察到一些外部架构实践（如「一切皆插件」的宿主架构），将其作为对照系引入分析，但对照只是参照，不是结论。

**本文档需要外部帮助的方向**：①架构评审意见（分层与注册机制是否合理）；②插件化设计的参考实现（同类轻量注册表的落地经验）；③迭代流程建议（功能开关、灰度、版本化怎么做最适合本系统规模）。

---

## 二、组件化落地评估与插件化演进（历史结论 · 2026-08-22 → 2026-09-03）

> **2026-09-03 精简**：本文档原评估正文（组件化落地评估 §二 / 迭代能力现状评估 §三 / 轻量插件化「能力注册表」设计 §四 / 迭代机制设计 §五 / 实施路径 §六 / 与既有文档关系 §七）已由 [ENGINEERING_ASSESSMENT.md](../../../.ctx/ENGINEERING_ASSESSMENT.md)（工程化评估与改造行动线——2026-09-03 支书问询「模块化/插件化/开源化 100 分评估怎么输出」后的固化评估，2026-09-09 更名）承接为**现行方向选择依据**。本节压为历史结论，各阶段详细验收记录不再展开，需要时查 git 历史或按 .ctx/ENGINEERING_ASSESSMENT.md 行动线追踪：

- **评估结论（2026-08-22）**：当前架构是「结构分层」而非「运行时可组合」——数据层已走对（DataAdapter 接口隔离），UI 层停在「静态组装」；系统不缺组件，缺「组件的目录」（能力注册表）。
- **演进路径 M1~M8 已全部落地（2026-08-22 → 2026-08-30）**：M1 注册表骨架（register/get/mount 三原语 + 活动日历首例）→ M2 工作台 tab 收敛（组长工作台样板先行）→ M3 数据源与工作流场景注册化（6 工作台全薄壳化）→ M4 迭代机制落地（unregister/resolveDeps、版本统一 20260823b）→ M5 入口/HTML 瘦身（公共脚本抽取 + main-entry 拆分）→ M6 组件能力化（components.js 注册层）→ M7 环境/角色开关消费点启用 → M8 代码减负（todo-tab/workspace-shell 抽壳、死代码清理，**净减 ~930 行**）。
- **支书铁律（2026-08-30，M8）**：「模块化只见代码增多，少见代码减少」——每个 M 阶段必须伴随净代码减负或持平，禁止纯横向拆分堆叠（防屎山代码）。
- **迭代机制设计（一句话结论）**：功能开关 = 能力清单按环境/角色过滤（`getCapabilities({ scope, role, env })`）；版本化 = 注册表整体版本替代各处 `?v=` 手改；灰度与回滚 = 能力按 scope 分批开放、问题能力单独注销即回滚。
- **与既有文档的关系（原 §七，维持不变）**：DATA_MODEL（注册化不动数据模型）、SOP_WEBSITE_GUIDE（场景注册化是 SOP-系统联动方法论的延伸）、DEPLOYMENT_GUIDE（M3/M4 依赖后端/小程序路径的环境配置）、ARCHITECTURE.md（注册表落地后回写为其中一节）。

---

## 八、远期愿景：工作流块的可视化拖拽编排（开源项目目标 · 支书 2026-09-03 定位）

> **一句话**：让「把支部工作流变成系统功能」这件事，从「改代码」逐步走向「拖积木」——支部按需把工作流块拖进画布、连好顺序，系统据此自动封装为可执行的代码化工作流。

### 8.1 为什么是这个方向

本系统的核心资产不是界面，而是**一套把支部工作流（SOP）代码化的方法论**：决策树引导写入、WorkflowEngine 纯数据驱动、SOP-系统双向映射（SOP_WEBSITE_GUIDE）。三者已经证明「流程可被描述、可被机器执行」。在此基础上，真正的复用瓶颈不再是"能不能写"而是"支部/用户能否自己组合"：

- 不同支部流程不同（本科 vs 硕博、常规 vs 专项），`enabledModules` 勾选已能排列组合（见 [PARTY_COMMITTEE_DESIGN.md](../contracts/PARTY_COMMITTEE_DESIGN.md) §2.5）；
- 能力注册表（见 §二 历史结论，M1~M8 已落地）已经为每个能力单元提供**目录**；
- 缺的最后一块拼图是：一个面向使用者的**可视化编排形态**——把「代码级能力」翻译为「可拖的工作流块」。

### 8.2 目标分层（渐进，不画大饼）

| 层 | 内容 | 状态 |
|---|---|---|
| L1 能力目录化 | 能力注册表 = 全仓能力的单一目录（M1~M8 已全落地，2026-08-30） | 已落地 |
| L2 支部组合化 | 支部 config.modules（hiddenTabIds/tabOrder）从已注册工作台 tab 中排列组合；**已落地（2026-09-03 支部自治/核心固定；2026-09-09 操作位收口）**——写权与操作位见 [PARTY_COMMITTEE_DESIGN.md](../contracts/PARTY_COMMITTEE_DESIGN.md) §2.5/§2.6 | 已落地（L2 定案） |
| L3 块封装契约 | 把一条 SOP 封装为一个「工作流块」：声明输入（发起角色/必填字段）、阶段（节点与顺序）、产出（待办/通知/归档联动） | 已落地（2026-09-03，S1~S4）→ 见 [WORKFLOW_BLOCK_CONTRACT.md](../contracts/WORKFLOW_BLOCK_CONTRACT.md) §六/§七 |
| L4 拖拽编排 | 画布拖拽块 → 连线定顺序/条件 → 导出为版本化工作流定义 JSON（可预览、可回退） | 远期愿景 |
| L5 块市场/分享 | 编排好的工作流块可命名、可导出、可复用于其他支部（开源社区的场景库） | 远期愿景 |

> **注（2026-09-03 后续落地）**：L3 契约与 L4 画布/地图设计已独立成文——[WORKFLOW_BLOCK_CONTRACT.md](../contracts/WORKFLOW_BLOCK_CONTRACT.md)（L3 块封装契约 v1.1 定稿）、[BRANCH_WORK_MAP.md](archive/BRANCH_WORK_MAP.md)（L4 支部工作地图设计稿 v2.1，支书放行编码）；本表与 §8.5 的草案状态以上述两文件为准。

### 8.3 落地时的架构锚点（不新造核心）

- **块 = 注册表中的能力/场景 + 元数据**（块并不独立于现有机制存在）；拖拽产物 = 一段受版本控制的 workflow definitions 数据，继续交给既有 WorkflowEngine/决策树执行，不引入第二套执行引擎。
- **权限与数据同源不因可视化而改变**：块可拖范围仍受角色与支部 config 约束；数据写入仍走 services 层收敛与 persist，界面只是"编排者"而非"新数据通道"。
- **原则：可视化是编辑器形态，不是目的**——目的是降低「把工作流交给代码」的门槛。若某编排超出注册块的能力边界，退回"提需求→代码封装新块"的既有闭环，不追求万能低代码平台（YAGNI）。

**工作组的分层位置与创建入口**：工作组不是新的执行引擎，也不是独立业务对象——它是活动/专班业务记录之上的协作结构。活动工作组随活动创建，入口分两处：本组活动由所属党小组组长/副组长从组长工作台创建，支书/副支书可建任意承办组活动（组织落点 `party-group`，承办党小组唯一），跨组只表示深度参与者招募范围（`recruitmentScope='cross-group'`），不是第三落点；专班工作组围绕事项、任务或产出建立，入口在组织委员工作台（默认扎口，支部制度参数可调整）。两类工作组只登记组织者与深度参与者，成员关系不自动授予系统权限。**考察依托工作组**：考察记录挂活动工作组或专班工作组，考察对象为该工作组成员。制度与数据边界见 [COMMISSIONER_DUTY_FRAMEWORK.md §A.4–A.7](../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)、[SYSTEM_ROLE_PERMISSION.md §9h.1](../../02_institution/SYSTEM_ROLE_PERMISSION.md)、[DATA_MODEL.md §2.3.1](../data/DATA_MODEL.md)。

### 8.4 与支部配置档案的衔接

支部「配置驱动实例」（PARTY_COMMITTEE_DESIGN §2.5）在未来形态下演进为：**支部管理员在画布上把系统已注册的工作流块拖成本支部的流程组合 → 自动写回 config.enabledModules 与场景清单**——"从已注册能力中勾选"的文本交互升级为"拖积木"的图形交互，数据模型不变。

### 8.5 L3 块封装契约草案 + L4 画布产物映射（原型专项前置 · 2026-09-03）

> 状态：草案，供原型专项落地时收敛；核心原则 = **块不独立于既有机制存在**（块 = 注册能力/场景 + 下述元数据），画布产物 = 一段版本化 workflow 数据，仍交给既有 WorkflowEngine/决策树执行。

**工作流块元数据草案（block manifest）**：

```jsonc
{
  "blockId": "act-organize",            // 对应 capability id 或 scenario id（不新造第三套 id）
  "name": "活动组织块",
  "sopRef": "02_institution/sop/...",  // 制度/SOP 溯源（一改具改锚点）
  "initiatorRoles": ["secretary"],
  "stages": [                          // 阶段即决策树/引擎的阶段序列
    { "id": "create",  "kind": "decision-tree", "outputs": ["activity"] },
    { "id": "assign",  "kind": "engine",        "outputs": ["assignment", "todo"] },
    { "id": "attend",  "kind": "engine",        "outputs": ["attendance"] },
    { "id": "review",  "kind": "engine",        "outputs": ["review"] }
  ],
  "inputs": { "required": ["title", "date"], "optional": ["location", "agenda"] }
}
```

**L4 画布 → 执行的映射（不做第二套引擎）**：拖拽产物 = `{ branchId, version, blocks: [blockId 序列 + 连线/条件] }`，经一次编译收敛为既有 workflow `definitions`（或 scenario 参数）→ WorkflowEngine 消费；权限仍在块粒度上受角色与支部 config 约束。

**原型最小实验范围（YAGNI 边界）**：v0 画布只做「块的**排序/启停**预览」——把一个 scenario 的阶段序列可视化排布、勾选启停并保存回 config.enabledModules（文本勾选 ↔ 画布双向同步）；图形化条件分支、块导出/市场（L5）不在 v0。这样既能拿到"拖积木"的真实手感，又不触碰执行引擎。

---

## 九、性能与交付形态（2026-10-27 方案 · **未执行**）

> **现状读数**（批次 515 实测）：26 个 HTML（18 根页 ＋ 8 工作台）· 312 个 JS / 94,036 行 · `styles.css` 6,454 行；26/26 页各 1 个 `type="module"`；首屏静态 import 链 ≥4 层（entry → 20 个模块 → `bootstrap` 16 个）；tab 模块走动态 `import()`。无 gzip / brotli；全部静态文件共用 `Cache-Control: no-cache, must-revalidate`；`modulepreload` 0 处；Tailwind 走无版本、无 SRI 的 Play CDN（25 页）。

### 9.1 结论：不引入打包器（bundler）

打包器的作用是构建期把 ESM 源文件合并 / 摇树 / 压缩成少量产物。本仓**不引入**，依据四条：

1. **请求数已被控制**：tab 渲染模块是动态 `import()`，首屏只拉壳层与数据层，312 个模块不会一次性请求。
2. **失效机制已自洽**：`?v=` 版本戳（`docs/scripts/bump-version.mjs`）＋ `version-stamp::S3`（全站唯一戳）＋ `cross-page-state.CODE_VERSION`，引入打包器要整体重写这套机制。
3. **零构建是当前部署前提**：26 页静态直出、GitHub Pages 只读演示、`deploy/package.mjs` 白名单出包，都建立在「源码即产物」上。
4. **瓶颈不在文件数**：真正的缺口是「无压缩 ＋ 无缓存分层」，见 9.2 第 1、2 项。

> 若未来确要引入，触发条件应是「首屏关键路径需要跨模块摇树」或「需要 tree-shaking 级体积优化」，而不是「文件多」。

### 9.2 四项必要项（本轮只出方案）

| # | 项 | 方案要点 | 验收判据 |
|---|---|---|---|
| 1 | 响应压缩 | `server/app.js` 挂 `compression`（gzip / brotli，按 `Accept-Encoding`）；`deploy/nginx.sample.conf` 同步开启 | 同一 JS 的传输体积下降；`/api/v1/snapshot` 已自带 gzip 请求体，确认不双压缩 |
| 2 | 缓存分层 | HTML 保持 no-store；URL 带 `?v=` 的 JS / CSS / 字体改 `public, max-age=31536000, immutable`；`/src/config/deploy.js` 保持动态 | 二次访问静态资源零回源；新增守卫断言「只有带戳资源可长缓存」 |
| 3 | `modulepreload` | 为 entry 的静态 import 与 `bootstrap` 的依赖生成 `<link rel=modulepreload>`，由 `bump-version.mjs` 同批维护 | 首屏瀑布减少 1–2 个 RTT；戳与资源一致、不重复下载 |
| 4 | Tailwind 锁定 / 本地化 | 二选一：① 保留 CDN 但锁固定版本 URL；② Tailwind CLI 生成静态 CSS 并纳入 `?v=` | 外部依赖不再「随时可变」；选 ② 会引入构建步骤，须单独裁定 |

> **优先级**：1 → 2 → 4 → 3。第 1、2 项收益最大且不动前端代码；第 3 项需与版本戳同批改；第 4 项涉及「无构建」现状，须支书裁定。
> **待办登记**：`CLAUDE.md` 乙部 `B-515-1`。

### 9.3 版本戳的成本收益（2026-10-28）

`?v=` 全站同戳不是免费的：本仓实测 **442 个文件**含版本戳，一次 bump 会把 JS 内部 import、HTML 入口与样式表 href、CSS `url()`、`server/test` 内戳、`modulepreload` 块与 `CODE_VERSION` 一并改写，**约 450 个文件进同一个 diff**。成本落在两处：一是评审与回滚——一次缓存换新会淹没真正的功能改动；二是 git 历史——每个提交都带几百行查询串变动，`git blame` 失去可读性。

收益同样明确：**① 无陈旧模块**——入口与其内部 import 同 URL 同戳，部署后不会出现「新入口拉起旧模块」的模块实例分裂（`DATA_CONSISTENCY_CHECKLIST` 的 `?v=` 口径即为此而立）；**② immutable 缓存**——URL 带戳即可给静态资源 `public, max-age=31536000, immutable`，HTML 保持回源，二次访问静态资源零回源（§9.2 第 2 项）。

取舍是把 bump 的**时机**从「每次改动」挪到「发布」：日常提交不动 `?v=`（降低 diff 噪音），发布前跑一次 `cd server; npm run release:stamp`（先全站补戳，再以 `--check` 核对陈旧戳与 `CODE_VERSION`）。这条取舍的前提是**部署必经 `release:stamp`**——若直接部署未 bump 的代码，`?v=` 未变的模块 URL 会命中旧缓存，新旧混用随即回来。

> **若将来要退出戳，必须先把内部模块改 no-cache 协商**——否则浏览器按 URL 缓存 ES Module 的语义不变，去掉 `?v=` 只会把「陈旧模块」从可见变成不可见。

---

## 十、多支部同实例与党委内容域（2026-11-08 · 设计与前置条件）

> **支书口径**：「服务端要考虑多支部情况，需要有所设计」。本节定**模型、阶段顺序与验收**，不改变当前上线形态——生产仍为「一实例一支部」，`ALLOW_MULTI_BRANCH` 开关**保持关闭**，多支部且未显式放行时 production 档拒绝启动。Phase 1–2 是打开开关的**前置**；Phase 3–4 不以上线为前提。

### 10.1 现状与风险

- 数据行已有 `branchId`（资源、语义、工作组表均带；历史缺字段回落 `br-b1`），写门已有支部校验（`branch-scope.js` / `RESOURCE_WRITE_GATE`）。
- **读面没有统一收口**：`listTable` 与部分语义端点整表读取，支部过滤靠前端投影；同实例多支部会串读。
- 快照写穿已做「写入行归属校验」，读取面未过滤，形成「写得住、看得穿」。
- 党委此前只有治理视野（监控 / 任命 / 审批 / 下发），没有内容域：院级活动、院级通知、院级资料无处落行。

### 10.2 目标模型（请求级支部上下文）

1. **单一来源**：每个请求由 `requireAuth` 注入 `req.actor.branchId`；无支部归属仅限 `party-staff` / 待归属账号。
2. **读口统一过滤**：`list` / `bootstrap` / 语义读口取得行后必须经过 `resourceRowsForActor(db, name, rows, actor, reader)`；不得在 handler 里 `JSON.parse` 后直接返回全表。
3. **治理面显式跨支部**：`party-staff` 跨支部读取必须带 `?branchId=` 或走党委专用端点，并留痕；不带范围时拒绝，不默认全量。
4. **写入面按内容归属分档**：`ownerScope` 决定写门；支部账号只写 `ownerScope='branch'` 且属于本支部的行，党委账号写支部业务记录时必须明确 `branchId`。
5. **索引随查询出现再加**：`MIGRATIONS` 追加 `branchId` 表达式索引（`json_extract(data,'$.branchId')`），只在实际出现跨支部查询后加。

### 10.3 党委伪支部 `pc-gsm` 与真实支部的边界

| 维度 | 党委伪支部 `pc-gsm` | 真实支部 |
|---|---|---|
| 支部目录 | 不进入；不参与支部数与统计 | 进入目录，参与统计 |
| 成员与考勤 | 不承载成员名册、考勤、工作组 | 承载 |
| 支书任命 | 不可任命 | 可任命 |
| 内容行 | 党委活动、党委通知、院级资料 | 支部活动、支部内部通知、支部资料 |
| 写入口 | 只对 `party-staff` 开放 | 支部账号写本支部行；党委写支部业务记录须明确 `branchId` |

- **跨支部副本唯一性**：唯一约束落在 `(branch_id, source_activity_id)`（排除空值），同一支部对一条党委活动最多一条副本；不同支部各自一条，互不影响。
- **公开路由与支部隔离**：公开路由不经支部作用域，只返回 `publishScope='public'` 且未过期的党委行；登录态读口仍走支部作用域 ＋ 党委可见行的并集。两条通道不共用同一条 SQL 分支。

### 10.4 实施顺序（每阶段可独立回归）

| 阶段 | 内容 | 验收判据 | 是否上线前置 |
|---|---|---|---|
| **Phase 1 数据模型** | `activities` 增 `ownerScope`、`targetBranchIds`、`sourceActivityId`、`sourceVersion`、`sourceSyncedAt`、`adoptedAt`、`adoptedBy`、`contentVersion`、`publicSummary`、`publishScope`、`publishExpiresAt`；党委活动行 `branchId='pc-gsm'`；`notices` / `branch_docs` 增 `publishScope` / `publishExpiresAt`；迁移追加生成列与部分唯一索引；存量行缺 `ownerScope` 读作 `branch` | 迁移后字段、生成列与索引齐备；`data-contract` / `db-integrity-guard` / `seed-contract-guard` 绿；存量活动与通知不丢失 | 是（打开开关的前置） |
| **Phase 2 读侧并集与写门** | `resourceRowsForActor` 对 `activities` / `notices` / `branchDocs` 支部账号返回「本支部行 ＋ 党委可见行」，已有副本时排除党委原件；写门按 `ownerScope` 判定；党委伪支部不进入支部目录与支部统计；其余资源维持支部隔离 | 双支部夹具下 A 支部读不到 B 支部任何行；支部汇总不含 `pc-gsm`；其他资源隔离不松动；单支部既有测试全绿 | 是（打开开关的前置） |
| **Phase 3 下发与采用** | 下发按目标支部创建系统通知（受众 `['secretary','deputy-secretary']`，同一 `contentVersion` 幂等）；支部幂等采用生成副本（并发由唯一索引 ＋ 事务兜底）；副本内容字段锁定，只允许执行字段；手动同步只覆盖内容字段并更新 `sourceVersion` / `sourceSyncedAt`；强调通知按 `(branchId, sourceActivityId)` 24 小时限频 | 重复下发不新增通知；重复采用返回同一副本；副本内容字段变更返回 422；越权采用 403；24 小时内重复强调通知返回 429 | 否 |
| **Phase 4 公开门厅与多实例部署** | 匿名只读接口（字段白名单、有效期 fail-closed、不存在与无权统一 404、下载写审计）；公开权限只归党委；多实例部署由 `ALLOW_MULTI_BRANCH` 控制，开关关闭时多支部配置拒绝启动 | 匿名响应不含成员与内部字段；过期后匿名 404；公开与撤下可在审计表查到；开关关闭时单支部正常启动、打开时通过多支部校验 | 否 |

### 10.5 不做什么

- 不把支部做成独立数据库 / 独立 schema（迁移与备份成本高，当前规模不需要）。
- 不在前端做「隐藏他支部数据」来替代服务端读过滤——前端隐藏不构成隔离。
- 不在 Phase 1–2 完成前打开 `ALLOW_MULTI_BRANCH`。
- 不为党委内容域另建一套活动表；党委活动与支部活动同表，由 `ownerScope` 区分。

> **决策待办**：Phase 2 之后「党委跨支部读取是否需要独立页面 / 入口，还是仅 API 参数」仍留给支书裁定，该决定影响党委工作台的 IA。开关打开本身另需支书裁定与部署放行，本节不预设时间。

### 10.6 判定点清单（T12 设计定稿 · 2026-11-15）

> **本节回答**：一次请求的行，按什么判定它「属于哪个支部 / 是否允许跨支部 / 与支部无关」。每条给 `文件:函数` 锚点与现状，T13 只按本节施工，不再另立判据。
> **判据形态**：每类都能布尔化——「这条读口返回的行是否全部经 `branch-scope` 解析并等于请求支部」「这条写口是否对外支部行返回 403」。锚点写函数名，不写行号（行号随插行漂移）。

**（a）必须按 `branchId` 过滤的域**

| 域 | 判据落点（`文件:函数`） | 现状 |
|---|---|---|
| 全部通用资源集合（`RESOURCE_TABLES` 全表） | `server/routes/resources/index.js::_resourceRowsForActor` → `server/routes/resources/branch-scope.js::resourceRowsForActor` | 已接线；例外见 10.7-1 |
| 活动 / 通知 / 支部资料（本支部 ＋ 党委可见行并集） | `branch-scope.js::resourceRowsForActor`（`isCommitteeRow` / `targetsBranch` / `isLoginVisible` / `isWithdrawnPublic`） | 已接线 |
| 待办 `todos`（含 `branchLegacy` 兼容期） | `branch-scope.js::resourceBranchId`（`name === 'todos'` 分支）＋ `resourceRowsForActor`（todos 分支） | 已接线；与 `todo-groups` 判据不同（10.7-3/4） |
| 归档记录 `archiveRecords`（未归属只给党委） | `branch-scope.js::resourceBranchId` ＋ `resourceRowsForActor`（archiveRecords 分支） | 支部读口已接线；匿名读口失守（10.7-1） |
| 聚合子记录 `actSubRecords` / `tfSubRecords` | `branch-scope.js::aggregateRows` / `aggregateWriteDeny` / `mergeAggregateBody` | 已接线（读写同判据） |
| 考勤 / 考察行级叠加 | `resources/index.js::_canReadAttendanceRow` / `_canReadInspectionRow` | 已接线（人物 / 组织者维度，支部维度由集合层承担） |
| 支部名册 | `server/routes/branch-roster.js::PUT /branches/:id/roster`（`cleanMemberRow` 固定路径支部） | 已接线；历史判定见 10.7-5 |
| 工作组域（6 表） | `server/routes/resources/workgroup-routes.js::ownBranch` ＋ 各 `(row.branchId \|\| DEFAULT_BRANCH_ID)` 比对 | 已接线，字面兜底 26 处 |
| 待办组派生 | `server/routes/todo-groups.js::_scopeBranchId` / `_belongsTo` / `_visibleTodos` / `_membersOfBranch` / `rowsOf` | 已接线，自成一套判据（10.7-3/4） |
| 报表四域 | `server/routes/report.js` ＋ `server/services/reporting.js::extractDomain({ branchId })` | 已接线；党委未选支部时 null 语义见 10.7-7 |
| 申诉 / 议题 / 名册变更等语义读口 | `server/routes/resources/semantic-routes.js::readScoped`、`server/routes/member.js::GET /member-change-requests`、`server/routes/committee.js`（agenda_votes） | 已接线（同一 helper） |
| 快照写穿 | `branch-scope.js::scopedSnapshotWriteDeny` / `mergeScopedSnapshotWrites`；`resources/index.js::_retainRowScopedSnapshotRows` | 已接线 |

**（b）本职跨支部的域**

| 域 | 判据落点 | 现状 |
|---|---|---|
| 支部目录与支部统计 | `branch-scope.js::projectBranchDirectoryRow` / `branchSummary`（`branches` 读口，党委未选支部给目录投影） | 已接线 |
| 支部上报审批 `reviewRequests` | `resourceRowsForActor`（党委未选支部时返回全部待批复） | 已接线（本职跨支部） |
| 党委活动 / 院级资料管理 | `semantic-routes.js::GET /committee/activities`、`GET /committee/documents`（`ownerScope === 'committee'`） | 已接线 |
| 党委档案读取 | `semantic-routes.js::GET /committee/archive-records`（`?branchId=` 可选过滤） | 已接线；不传参即全量 |
| 党委名册提案 | `semantic-routes.js::POST /committee/roster-proposals`（`body.branchId` 必填校验） | 已接线 |
| 任命档案 | `semantic-routes.js` 任命链（`appointment_records`） | 已接线 |
| 发布留痕 | `semantic-routes.js::GET /publication-audits`（全量只增不改） | 已接线 |
| 报表触发 / 导出 | `report.js::POST /report/trigger`、`GET /report/export`（党委须先选支部：`selectedBranchRequiredError`） | 已接线 |
| 党委下发通知 | `branch-scope.js::isCommitteeRow` 分支（`source === 'committee'` / `branchId === pc-gsm`） | 已接线 |

**（c）无支部维度的域**

| 域 | 判据落点 | 说明 |
|---|---|---|
| 里程碑 `milestones` | `semantic-routes.js::GET /milestones`（直接 `listTable`） | 内容单一源 `docs/data/milestones.json`，无支部字段 |
| 会话 `sessions` / 上传元数据 `attachments` | `server/db.js::SCHEMA` | 按人 / 会话，不按支部 |
| 集合版本号 `collection_versions` | `server/db.js` | 乐观锁元表 |
| 认证域 `/api/v1/auth/**` | `server/routes/auth.js` ＋ `server/read-only.js::isAuthPath` | 登录 / 登出不算业务写 |
| 匿名公开门厅的字段投影 | `server/routes/public-portal.js`（字段白名单） | 只出 `publishScope='public'` 且未过期行，按白名单裁字段 |

### 10.7 现状缺失与失败开放点（探针证据）

> 「失败开放」指缺字段或取不到支部上下文时放行，不拒绝。T13 的每条改动都要先指明它关掉哪一条。

| 编号 | 位置 | 现象 | 判定 |
|---|---|---|---|
| 1 | `branch-scope.js::resourceRowsForActor`（`if (!targetBranchId) return rows;`） | 无支部上下文（匿名 / 待归属）直接返回全表 | 失败开放。实测无 token `GET /archiveRecords` 返回 `ar-a,ar-b`（跨支部） |
| 2 | `branch-scope.js::resourceBranchId` 末尾 `return linked \|\| DEFAULT_BRANCH;` | 缺 `branchId` 的存量行归默认支部 | 多支部下把未归属行并入 `br-b1`；全仓 `\|\| DEFAULT_BRANCH(_ID)` 实测 **190 处 / 50 文件**（server 113/20、docs 77/30），线索所记「109 处 / 18 文件」未复现，最接近的是 server 面 113/20 |
| 3 | `todo-groups.js::_scopeBranchId` | `actorBranchId(actor) \|\| requested \|\| DEFAULT_BRANCH_ID`，比 `branch-scope.js::selectedBranch` 多一层默认回落 | 两套判据；党委未选支部时口径分歧 |
| 4 | `todo-groups.js::_belongsTo` | `(row.branchId \|\| DEFAULT_BRANCH_ID) === branchId`；`resourceBranchId('todos')` 用 `linked \|\| null` | 同一行两判（实测见 10.8-⑤） |
| 5 | `branch-roster.js::branchHasHistory` | SQL `IFNULL(json_extract(data,'$.branchId'),'<默认支部>')` 计历史 | 缺字段按默认支部算，删除支部前校验会误判 |
| 6 | `semantic-routes.js::GET /committee/*` 系列 | 不传 `?branchId=` 时全量返回 | 本职跨支部，可接受；缺留痕 |
| 7 | `report.js` 三处 `actorBranchId(actor) \|\| req.query.branchId \|\| null` | 党委未选支部时 `branchId = null` | `extractDomain` 的 null 语义须在 T13 前确认（是否等价全量） |
| 8 | 无 view 上下文 | `/committee/enter-branch` 返回 404；党委选支部后 `PATCH /branches/br-a/config` 返回 200，响应无 `readOnly` 字段 | 「进入支部只读」尚未存在（Q10 未落地） |

### 10.8 双支部夹具摸底（一次性探针 · 不落仓库文件）

> 方法：`:memory:` 库 ＋ `createApp` ＋ 真实 HTTP 登录；每次跑完删除探针目录，不写运行库 `server/data.db`。

| 证 | 结论 | 证据 |
|---|---|---|
| ① A 支部读不到 B 支部行 | **成立** | 甲支书 / 甲成员在 `/activities` `/notices` `/branchDocs` `/users` `/tasks` `/todos` `/archiveRecords` `/todo-groups` `/bootstrap` 9 个读口 0 泄漏；对照乙支书可见 `act-b` |
| ①补 匿名归档读口 | **不成立（跨支部可见）** | 无 token `GET /archiveRecords` 返回 `ar-a,ar-b`；根因 10.7-1 |
| ② 跨支部写被拒 | **成立** | 单行 `POST /activities` = 403；`PATCH /activities/act-b` = 403；快照含 B 行 = 403（`不能通过快照触碰其他支部记录`）；聚合父键 `PATCH /actSubRecords/__root__`（body 含 `act-b`）= 403；B 行未被改写 |
| ③ N=1 读集合与快照串不变 | **成立（基线已固化）** | 单支部 `br-b1` 下缺 `branchId` 行的可见性：`/activities:[act-1]`、`/notices:[ntc-1]`、`/users:[6100000001,6100000002]`（缺字段的 `6100000003` 不可见）、`/todos:[todo-1,todo-2]`（`todo-2` 走 `branchLegacy`）、`/archiveRecords:[]`（缺字段行对支部不可见）；`/bootstrap` 29 集合摘要 `4c42b6029aaf4d2e`；空快照 `POST /snapshot` = 204。**T13 改造后必须复跑同一夹具，摘要逐字节一致** |
| ④ 党委 view 内写被拒 | **不成立** | 党委 `?branchId=br-a` 读 200，随后 `PATCH /branches/br-a/config` = 200（配置写入成功），响应无 `readOnly`；`/committee/enter-branch` = 404 |
| ⑤ `todo-groups` 与 `todos` 同判 | **不成立** | 无 `branchId` 但 `sourceId=act-a` 的 `todo-lk`：`/todos` 可见 = true，`/todo-groups` 可见 = false；显式 `branchId=br-a` 的 `todo-ctl` 两处均可见 = true |

**覆盖范围**：读口 9 个、写口 4 类（单行 / 快照 / 聚合 / 配置）、N=1 与 N=2 两套库。**未覆盖**：工作组 6 表、上传口、公开门厅、`?page` 分页路径、`party-staff` 写支部业务行的全部矩阵项。

### 10.9 T13 施工顺序与前置断言

> 顺序按「先定判据、再动使用方、最后加门」。每步单独可回归，前一步不绿不进下一步。

| 步 | 改哪里 | 前置断言（进下一步的门） |
|---|---|---|
| 1 | `branch-scope.js`：把「缺字段回落默认支部」抽成显式策略（保留 `todos` / `archiveRecords` 的 `null` 口径），新增 `resolveRowBranchId` 作为统一入口 | 10.8-③ 基线摘要 `4c42b6029aaf4d2e` 与五条读集合逐字节不变 |
| 2 | `todo-groups.js`：删 `_scopeBranchId` / `_belongsTo`，改用 `branch-scope` 两个函数（`actorBranchId` ＋ `resourceBranchId`） | 10.8-⑤ 由「不成立」转「成立」；`todo-groups-api` / `todo-derive-parity` / `todo-branch-attribution` 全绿 |
| 3 | `resources/index.js`：`_resourceRowsForActor` 去掉 `!targetBranchId ⇒ return rows`，改为「无支部上下文只放行 `publishScope='public'` 且未过期的党委行」 | 匿名 `GET /archiveRecords` 不再含他支部行；`archive-record-write` / `public-portal` / `data-lifecycle-guard` 绿 |
| 4 | 新增 `server/branch-view.js`（仿 `read-only.js::createReadOnlyGuard` 的挂载位置与响应形状），党委进入支部写口统一 403 `{ readOnly: true }` | `write-policy-matrix` 141 → 143 条同批登记；`write-policy-gaps` / `permission-gate` / `r3-data-permission-regression` 绿 |
| 5 | 新增常驻守卫：支部解析只经 `branch-scope` 两个函数，新增 `\|\| DEFAULT_BRANCH` 判红 | `test:guards` 绿；既有 190 处按文件基线只减不增 |

**会引爆存量断言的改动（同批必须一起改）**

| 改动 | 受影响断言（实测文件 / 规模） |
|---|---|
| 待办判据收敛（步 2） | `todo-groups-api`（20 处 `br-b1`）、`todo-derive-parity` ＋ `test/fixtures/todo-derive/golden.json`、`todo-realtime-source`、`todo-branch-attribution`、`workbench-revision-contract`、`mock-api-parity-structure` |
| 默认支部回落改策略（步 1） | **108 个测试文件 / 769 处 `br-b1`**；重点 `branch-roster-import`、`branch-affiliation`、`branch-id-literal-guard`、`data-contract`、`seed-contract-guard`、`db-migration`、`workgroup-api`（34）、`permission-gate`（32）、`branch-config-audit`（31） |
| 匿名归档读口收紧（步 3） | `archive-record-write`、`public-portal`、`public-write-closure`、`mock-api-parity`、`data-lifecycle-guard` |
| view 只读门（步 4） | `write-policy-gaps`、`write-truth-guard`、`permission-gate`、`r3-data-permission-regression`、`security-redteam` |
| 待议池 | 丙部当前无相关待裁；在办项影响面涉及 `B-500-7b-2`（待办派生单源），施工前须先确认其前置读数不因步 2 变化 |

### 10.10 T13 / T15 施工进度（2026-11-15 本批收口）

> **本节回答**：`§10.9` 的五步做到哪一步、改了哪些文件、还剩哪些文件按「逐文件」节奏继续。判据＝双支部五证夹具全绿（`server/test/multi-branch-five-proof.test.mjs`）＋ 单源守卫绿（`server/test/branch-resolve-single-source-guard.test.mjs`）。

**已完成（本批）**

| 步 | 文件 | 改法 |
|---|---|---|
| 1 | `server/routes/resources/branch-scope.js` | 新增 `resolveRowBranchId`（行级）与 `resolveBranchIdForActor`（请求级）两个解析入口；缺字段回落改为 `LEGACY_DEFAULT_BRANCH_FALLBACK` 白名单（每条带 reason）；未登记域解析不出即 `null` |
| 2 | `server/routes/todo-groups.js` | 删 `_scopeBranchId` / `_belongsTo` 自带判据，改调上表两个函数；`_visibleTodos` 直接复用 `resourceRowsForActor`（与 `GET /todos` 同判） |
| 3 | `server/routes/resources/branch-scope.js` | 删 `!targetBranchId ⇒ return rows` 失败开放；匿名 / 无支部上下文只放行 `publishScope='public'` 且未过期的党委行 |
| 3 | `server/routes/report.js` | 三处 `actorBranchId(...) \|\| req.query.branchId \|\| null` 收敛为 `resolveBranchIdForActor`（口径不变） |
| 5 | `server/test/branch-resolve-single-source-guard.test.mjs` | 常驻守卫：`server/routes/**` 新增 `\|\| DEFAULT_BRANCH(_ID)` 即红，存量按文件基线只减不增 |
| 5 | `server/test/doc-lifecycle-guard.test.mjs` | 行号引用校验扩面到 `content/**`（复用 R1 同一解析；存量 26 条失效引用登记基线，只减不增） |

**未完成（后续批次；按文件逐条替换，不一次性改全仓）**

| 面 | 现状 | 处理 |
|---|---|---|
| `server/routes/**` 其余回落 | 13 文件 / 87 处（含 `branch-scope.js` 自身 7 处历史口径） | 按 `branch-resolve-single-source-guard::BRANCH_FALLBACK_BASELINE` 逐文件递减；改一处同批减一处 |
| `docs/**` 回落 | 77 处 / 30 文件（页面侧投影） | 未经本批改动；待服务端读面收敛后另批 |
| 步 4 党委 view 只读门 | 未做（T14） | 新增 `server/branch-view.js` 后同批登记 `write-policy-matrix` 141 → 143 |
| `branch-roster.js::branchHasHistory` | SQL `IFNULL(..., 缺省支部)` 仍按缺省支部计历史（10.7-5） | 随 `branch-roster.js` 的 2 处回落一起改 |

**读数（本批实测）**：五证夹具 6/6 绿（含 N=1 bootstrap 摘要 `a308adac0dae3cbd` 与改造前一致）；`test:daily` 254 断言全绿（31 文件 / 87.8s）；单源守卫 3 条绿；`content/**` 行号扩面 R7 绿（195 条引用 / 26 条存量基线）。

---

## 附：本次探索的自我限定

本文档不声明任何「正确性」或「专业性」。它是一份探索记录：评估了现状、指出了差距、给出了一条轻量演进路径。路径是否值得走、M1~M4 是否合理，需要实际迭代与外部评审来检验。唯一确定的是：**迭代一定会发生，而承载迭代的机制越早显式化，迭代成本越低。**
