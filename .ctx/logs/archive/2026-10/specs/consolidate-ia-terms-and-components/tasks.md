# Tasks

> 边界：本批是**体系收敛**，不是再加一套。顺序：先把文档与术语立住，再改组件，最后动页签。
> 并行边界：Task 1（文档）与 Task 3（组件）文件不重叠，可并行；Task 2 依赖 Task 1 的术语表；Task 5 依赖 Task 1/2；Task 4 依赖 Task 3；Task 6 最后。

- [x] Task 1: 上批结论补账 + IA 索引 + 术语表骨架
  - [x] SubTask 1.1 重写 `content/04_web_design/data/DATA_MODEL.md §2.9` 为消息对象（`kind`、`audience/audiencePersons`、`targetType/targetId`、`reads[]`、`archivedBy[]`、`archived`、`replyTo`、有效期派生），删除 `targetModule` 与全局 `read`；同步 §2.19 的已读字段与待办幂等键（含收件人维度）。
  - [x] SubTask 1.2 修正四组页签名：`DESIGN_SYSTEM §4`、`ARCHITECTURE`、`MODULE_UI_DESIGN`、`help.html` 统一为「总览 / 我的职责 / 协作与知情 / 制度与答复」；同步 §10.7 承载面表增「消息」行（列表 `messages.html`、全貌 `notice.html?id=`）。
  - [x] SubTask 1.3 `DESIGN_SYSTEM §12.15` 新增 SD-37（知情查看分层）、SD-38（折叠契约）、SD-39（标题不得进入交互元素）；SD-34 补三条布尔判据：进入详情即已读、回执区不因已读隐藏、导航前不预写已读。
  - [x] SubTask 1.4 新建 `content/04_web_design/PRODUCT_IA.md`：派生索引（来源 `function-catalog.js` + `capabilities/*`），逐台逐页签写「一句话职责 / 主对象 / 主操作 / 分组 / 新落点」；`DOC_MAP §二/§五/§六` 与 `content/04_web_design/README.md` 登记「派生索引，不承担规范，禁止手改」。
  - [x] SubTask 1.5 新建 `content/03_doc_system/TERMINOLOGY.md` 骨架：词条 / 定义 / 层级 / 上位下位 / 允许并列集 / 禁用写法 / 权威文档 / 代码键 / 合法别名；首批收录活动、专班、项目、工作组、活动工作组、专班工作组、党小组、组织者、深度参与者、分工、考察、能力包、模块、流程块、产出块、授权、报名、会议。`OPERATIONS_GUIDE §19` 与 `sop/INDEX.md` 术语段改为指针。

- [x] Task 2: 术语对照 Harness
  - [x] SubTask 2.1 `docs-governance-guard` 增 H-T1「并列组层级一致」：解析 `insight-view` 分段与各台 `views`，同一容器标签的术语层级必须全同；`{workgroup,taskforce,group}` 判红，`{activity,taskforce}` 合法。
  - [x] SubTask 2.2 H-T2「页签名覆盖段集合」：页签 label 必须覆盖其内部分段对象；「专班动态」含工作组段判红。
  - [x] SubTask 2.3 H-T3「结构性标签登记」：tab label / 分段 label / `<th>` / facet label / option 文本必须命中术语表（首轮存量收基线，新增即红）；排除人名、编号、动态拼接、长句正文。
  - [x] SubTask 2.4 H-T4「废弃写法零残留」：`项目组`、`协作组`、`活动项目赋权`、`专班负责人`、`会议活动` 全仓 grep=0（否定句与判例正文豁免）；基线只降不升。
  - [x] SubTask 2.5 关系钉死：守卫同时断言 `TERMINOLOGY.md` 存在、`OPERATIONS_GUIDE §19` 只含指针、`sop/INDEX.md` 只含指针；重复定义（同一词条在别处出现定义句）判红。

- [x] Task 3: 组件契约与横向迁移
  - [x] SubTask 3.1 新增 `components/ui/disclosure.js`（`details/summary` 封装：标题兄弟节点、`aria-labelledby`、统一 chevron、`toggle` 钩子）与 `components/ui/menu-button.js`（`aria-haspopup/menu`、`aria-expanded`、`aria-controls`、Esc/焦点归还）；`Modal` 沿用现有 `modal.js`。
  - [x] SubTask 3.2 修 4 处标题嵌套：`secretary/calendar-tab.js:311`（button>h3）、`work-overview.js:539`（summary>h3）、`todo-tab-shell.js:387`（summary>role=heading）、`gallery.js:126`（role=button>h3）——标题移到兄弟节点。
  - [x] SubTask 3.3 4 个 `div` 伪开关升级为原生 button/summary：`visitor/review-tab.js:131`、`leader/review-tab.js:101`、`secretary/group-progress-tab.js:606`、`leader/write-tab.js:732`；保证 Tab 可达。
  - [x] SubTask 3.4 24 个无 ARIA 的 class/data 折叠：阅读型改 `Disclosure`，动作型改 `MenuButton`；删除重复的 `_xxxOpen` 模块变量与手写 chevron。
  - [x] SubTask 3.5 `ui-control-system-guard` 增「交互元素内无 `h1..h6`/`role=heading`」「折叠状态可静态回读（`open` 或 `aria-expanded`）」「同一文件同类折叠只用一种原语」。

- [x] Task 4: 同屏纵向一致
  - [x] SubTask 4.1 选三屏做样板：支书「活动管理」、支书「知情查看」、支书「支部分工」。逐屏列出分区头/折叠头/按钮/计数/说明的组件与字号，统一到同一套。
  - [x] SubTask 4.2 活动管理：所有折叠头同形（同字号/同 chevron/同内边距）、行内动作同档、说明后置；统计条拆掉「党小组组长」这个组织域指标。
  - [x] SubTask 4.3 写一份「一屏元素清单」进 `PRODUCT_IA.md` 的样板节（只作检查清单，不写规范条文），并把可机检项（同文件只用一种折叠原语、同屏标题档位）交给 Task 5/6 的守卫。

- [x] Task 5: IA 62 → 45
  - [x] SubTask 5.1 先落目标地图（`PRODUCT_IA.md` 附录）：62 → 45，逐条写「删除/降级 / 新落点 / 深链重定向 / help 段落」。任何删除必须三件齐备才允许动代码。
  - [x] SubTask 5.2 活动管理收敛：查询并入日历工具栏（删 `#query-toggle/#query-collapsible` 与 `bindQueryToggle/renderQueryPanel`）；党小组活动改筛选；修「+ 新建党小组活动 不预置 `direction:'bottom-up'`」；深链 `?apage=` 迁移。
  - [x] SubTask 5.3 赋权归位：专班赋权回组织台「专班管理」；活动赋权留活动行内/详情；支书活动管理删 `#cal-activity-auth-host`；同步 `#tf-auth-panel` 待办深链与 `secretary-assign-project-auth` 流程。
  - [x] SubTask 5.4 知情查看：支书删除页签（入口改工作概况卡）；组长「其他党小组」并入组员进展；成员「专班动态」并入项目分工；`insight-view` 分段改「活动工作组 / 专班工作组」。
  - [x] SubTask 5.5 其余降级（按 62→45 名单）：支书成员流动收口组织台；四台活动日历降为工作概况入口；五台「我的处置」并入待办「我经办的反馈」组；宣传任务并入项目看板；组长考察管理降为组员进展页内动作；成员思想汇报/我的考察/我的复盘合并为「我的成长」（三个子区）。
  - [x] SubTask 5.6 每删一个页签同步：`function-catalog.js`、`PRODUCT_IA.md`、`help.html`、`doc-consistency` 页签计数、`page-sweep`、深链重定向与 e2e 选择器。

- [x] Task 6: 守卫、日志与验证
  - [x] SubTask 6.1 守卫以扩展为主：`catalog-sync` 校验 IA 地图与页签集合；`docs-governance-guard` 承载 Task 2 的四条术语断言与 Task 3 的标题/折叠断言；`page-title-guard` 增「标题不得在交互元素内」。新增守卫文件 ≤1。
  - [x] SubTask 6.2 判例：`CASES.md` 增 CASE-DESIGN-017（工作组/专班并列）、018（button>h3）、019（62 页签重复注册）；`CASES_INDEX` 同步。
  - [x] SubTask 6.3 sample-diff：把支书 4 条反馈逐条写「样本 / AI 假设 / 人类意图 / 泛化规则 / 守卫」，落判例库与执行日志。
  - [x] SubTask 6.4 验证三通道：定向（术语/组件/IA/doc）→ `npm run test:daily` → `SWEEP_SHARD=all`；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 2 依赖 Task 1.5 的术语表；Task 5 依赖 Task 1.4 的 IA 地图与 Task 2 的命名裁决。
- Task 4 依赖 Task 3 的 Disclosure/MenuButton；Task 3 可与 Task 1/2 并行（文件不重叠）。
- Task 5.1 的目标地图未落盘前，禁止改 `capabilities/*`。
- Task 6 最后写，避免与 Task 2/3/5 的断言重复。

## 附：62 → 45 目标名单（基线，Task 5.1 可微调，但总数必须 45）

| 台 | 删除/降级 | 新落点 | 台内变化 |
|---|---|---|---:|
| 支书 12 | 知情查看 | 工作概况页内卡 | 11 |
| 支书 12 | 成员流动 | 组织台「成员流动」 | 10 |
| 组织 10 | 活动日历 | 工作概况入口 | 9 |
| 组织 10 | 我的处置 | 待办「我经办的反馈」 | 8 |
| 宣传 8 | 活动日历 | 工作概况入口 | 7 |
| 宣传 8 | 我的处置 | 待办「我经办的反馈」 | 6 |
| 宣传 8 | 宣传任务（并入项目看板） | 项目看板泳道「宣传任务」 | 5 |
| 纪检 8 | 活动日历 | 工作概况入口 | 7 |
| 纪检 8 | 我的处置 | 待办「我经办的反馈」 | 6 |
| 组长 10 | 活动日历 | 工作概况入口 | 9 |
| 组长 10 | 我的处置 | 待办「我经办的反馈」 | 8 |
| 组长 10 | 知情查看 | 组员进展「其他党小组」区 | 7 |
| 组长 10 | 考察管理 | 组员进展页内「上传考察」 | 6 |
| 成员 11 | 我的处置 | 待办「我经办的反馈」 | 10 |
| 成员 11 | 专班动态 | 项目分工「专班」区 | 9 |
| 成员 11 | 思想汇报 + 我的考察 + 我的复盘 | 合并为「我的成长」三子区（−2） | 7 |
| 党委 3 | — | — | 3 |
| **合计** | **−17** | | **45** |
