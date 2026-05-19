---
title: "Agent Execution Ledger — 2026年05月"
type: log

## 2026-05-19 | T59 — 路径修复+getBasePath机制+文件名精简

- **来源**: 用户指示（网页跳转混乱+党徽不显示+文件名精简）
- **时间**: 2026-05-19
- **变更文件**: utils.js, sidebar.js, header.js, role-selector.js, commissioner-matrix.js, workspace-entry.js, party-entry.js, main-entry.js, SOP_WEB.md, SNAPSHOT.md, README.md, ARCHITECTURE.md + 14 个 HTML 文件重命名
- **关键动作**: getBasePath() ✅ 党徽修复 ✅ 文件名精简 ✅ 一改具改 ✅
- **变更详情**:
  - **getBasePath() 机制**：在 utils.js 新增 `getBasePath()` 函数，检测当前页面是否在子目录中，返回 `'../'` 或 `'./'`。sidebar.js/header.js/role-selector.js/commissioner-matrix.js/workspace-entry.js/party-entry.js/main-entry.js 共 8 个文件使用此函数动态拼接路径
  - **党徽图片修复**：header.js 中 `./assets/images/party_emblem.png` → `${getBasePath()}assets/images/party_emblem.png`
  - **文件名精简**：
    - workspace/: workspace.html→index.html, ws-secretary→secretary, ws-leader→leader, ws-organizer→organizer, ws-deep→deep, ws-org-commissioner→org, ws-prop-commissioner→prop, ws-disc-commissioner→disc, ws-visitor→visitor
    - party/: party.html→index.html, party-secretary→secretary, party-org→org, party-prop→prop, party-disc→disc
  - **一改具改**：SOP_WEB.md 4 处旧路径更新，SNAPSHOT.md 14 处文件名更新
- **设计决策**:
  - 使用 `getBasePath()` 动态路径而非硬编码——子目录页面和根目录页面共享同一套 JS 组件
  - sidebar.js 的 NAV_ITEMS 改为 `getNavItems()` 函数——每次调用时动态生成路径
  - entry JS 文件名保持不变（ws-secretary-entry.js 等）——避免修改 HTML 中的 script src
- **结果**: 全部完成，localhost 验证通过
- **蒸馏标签**: [经验蒸馏: 是 — HTML 分目录后 JS 组件中的相对路径必须使用动态 basePath 机制]

## 2026-05-18 | T58-1~T58-3 — HTML 文件分文件夹重组

- **来源**: 用户指示（仓库整洁度）
- **时间**: 2026-05-18
- **变更文件**: 14 个 HTML 文件移动 + 6 个 JS 文件路径更新 + 3 个拓扑文档更新 + CLAUDE.md
- **关键动作**: T58-1 ✅ T58-2 ✅ T58-3 ✅
- **变更详情**:
  - **T58-1: ws-*.html → docs/workspace/**：
    - 移动 9 个 HTML（workspace.html + 8 个 ws-*.html）到 docs/workspace/
    - 9 个 HTML 内路径 `./src/` → `../src/`、`./index.html` → `../index.html`
    - workspace-entry.js: 8 处 `./ws-*.html` → `./workspace/ws-*.html`
    - main-entry.js: 3 处 `./ws-*.html` → `./workspace/ws-*.html`
    - role-selector.js: 7 处 `./ws-*.html` → `./workspace/ws-*.html`
    - commissioner-matrix.js: 3 处 `./ws-*.html` → `./workspace/ws-*.html`
    - sidebar.js: `./workspace.html` → `./workspace/workspace.html`
    - index.html: 3 处 `./ws-*.html` → `./workspace/ws-*.html`
  - **T58-2: party-*.html → docs/party/**：
    - 移动 5 个 HTML（party.html + 4 个 party-*.html）到 docs/party/
    - 5 个 HTML 内路径 `./src/` → `../src/`、`./index.html` → `../index.html`、`./feedback.html` → `../feedback.html`
    - party-entry.js: 8 处 `./party-*.html` → `./party/party-*.html`
    - role-selector.js: 4 处 `./party-*.html` → `./party/party-*.html`
    - commissioner-matrix.js: 3 处 `./party-*.html` → `./party/party-*.html`
    - sidebar.js: `./party.html` → `./party/party.html`
  - **T58-3: 仓库拓扑更新**：
    - ARCHITECTURE.md: 目录树增加 workspace/ 和 party/ 子目录
    - SNAPSHOT.md: 拓扑树+分层架构+文件清单全面更新
    - README.md: 导航结构树+分层表格+数据变更铁律更新
- **设计决策**:
  - docs/ 根目录保留 5 个全局页面（index/about/archive/search/feedback）
  - workspace/ 和 party/ 子目录分别存放对应域的页面
  - HTML 中的相对路径统一加一层 `../`（因为多了一层目录）
- **结果**: 全部完成，localhost 验证通过
- **蒸馏标签**: [经验蒸馏: 是 — HTML 分目录后相对路径需统一加一层，JS 引用路径需加子目录前缀]

## 2026-05-18 | T58 — YAML/关联文献全域修复+README重写+SNAPSHOT v9

- **来源**: 用户指示（合并后检查+开源准备）
- **时间**: 2026-05-18
- **变更文件**: 组织委员工作流程指南.md, 宣传委员工作流程指南.md, ORG_BUILDING.md, MANAGEMENT_MODE.md, RECURRING_TASKS.md, 3个agent文件, 3个模板库文件, README.md, SNAPSHOT.md, CLAUDE.md
- **关键动作**: YAML修复 ✅ README重写 ✅ SNAPSHOT v9 ✅ 乙部更新 ✅
- **变更详情**:
  - **YAML/关联文献修复（34处）**：
    - 组织委员/宣传委员 SOP：删除 related_files 中不存在的模板引用，正文改为"（模板待创建）"
    - ORG_BUILDING.md：related_files 中 `index.html` → `docs/index.html`
    - MANAGEMENT_MODE.md：已归档文件链接改为纯文本"（已归档）"
    - RECURRING_TASKS.md：已归档文件引用改为纯文本
    - 3个 agent 文件：SSOT_INDEX.md 显示文本和路径修正
    - 3个模板库文件：related_files 非标准路径修正 + last_updated 更新
  - **README.md 重写**：
    - "新人5分钟上手" → "快速上手"，分"支部成员能做什么"和"支委和组长能做什么"两表
    - "仓库结构：人读索引" → "仓库导航"
    - 面向全体支部成员（不仅支委）
    - 新增组织者/深度参与者/党支书角色导航
  - **SNAPSHOT.md v9**：全面更新（拓扑树+术语+权限矩阵+版本里程碑）
  - **乙部新增**：T58-1~T58-3（HTML 文件分文件夹重组）
- **设计决策**:
  - 不存在的模板文件引用改为"（模板待创建）"而非直接删除——保留未来创建的提示
  - HTML 重组拆分为3个子任务写入乙部——涉及19个HTML+55处JS引用，需分步执行
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 否]
owner: "Org OS Agent 集群"
role: "[人机]"
last_updated: "2026-05-18"
version: "1.0"
status: active
---

---

# Agent Execution Ledger — 2026年05月

## 2026-05-18 | T57 — 合并后全仓库断链修复+术语一改具改

- **来源**: 用户指示（合并后检查）
- **时间**: 2026-05-18
- **变更文件**: ARCHITECTURE.md, DOC_MAP.md, ROLE_CLASSIFICATION.md, EMOJI_POLICY.md, AGENT_USAGE.md, DESIGN_SYSTEM.md, ORG_BUILDING.md, SOP_WEB.md, COMMISSIONER_SYSTEM.md, SSOT_INDEX.md, copilot-instructions.md, sopData.js, domain.js, mock.js, auth.js, ws-visitor-entry.js, ws-disc-commissioner-entry.js, header.js, workspace-entry.js, ws-visitor.html, about.html, 申报材料模板/README.md, 活动复盘/README.md, 活动复盘模板.md, CLAUDE.md
- **关键动作**: T55-7 ✅ 断链修复 ✅ 术语一改具改 ✅
- **变更详情**:
  - **断链修复（38→0）**：
    - guides 中 `src/` → `docs/src/` 路径修复（DATA.md/CALENDAR.md/MANAGEMENT_MODE.md/DOC_MAP.md/ROLE_CLASSIFICATION.md/EMOJI_POLICY.md/AGENT_USAGE.md/DESIGN_SYSTEM.md/ORG_BUILDING.md，共 15+ 处）
    - ARCHITECTURE.md 整体仓库结构图更新（`src/` → `docs/src/` + guides 扁平→子目录，共 31 处）
    - `content/references/模板库/` 下 `../../../content/SOP/` → `../../../SOP/`（7 处）
    - SSOT_INDEX.md `src/workflow/` → `docs/src/workflow/`（2 处）
    - copilot-instructions.md 过时引用修复（3 处）
    - MANAGEMENT_MODE.md 相对路径修复（`./SOP_WEB.md` → `../design/SOP_WEB.md` 等）
    - 删除对不存在文件 `src/events.js` 的引用
  - **术语一改具改**：
    - `visitor-observe` → `participant-observe`（5 JS + 3 MD = 8 处）
    - `访客只读` → `参与者只读`（2 JS + 3 MD + 2 HTML = 7 处）
    - `【活动建设】` → `【党建工作】`（sopData.js 7 处 + domain.js/mock.js Source 注释）
    - `【组织建设】` → `【党务工作】`（sopData.js 5 处）
    - `活动建设` → `活动组织实施`（COMMISSIONER_SYSTEM.md 1 处）
    - `活动组织者` → `组织者`（COMMISSIONER_SYSTEM.md + insights，约 10 处）
  - **T55-7 完成**：从乙部删除
- **设计决策**:
  - TERMINOLOGY.md 和 CLAUDE.md 废弃术语对照表中的旧术语保留不改（属于历史记录）
  - insights 中"推动组织建设更加扁平化"的"组织建设"为通用语，非双域术语，保留不改
  - `src/events.js` 引用直接删除（事件绑定已整合到各 entry 文件）
- **结果**: 全部完成，38 个断链已修复，废弃术语活跃引用已清零
- **蒸馏标签**: [经验蒸馏: 是 — 合并后必须做全仓库断链扫描+术语一改具改验证]

## 2026-05-18 | T56 — README开源重写+LICENSE创建+经验沉淀补充Harness/Context工程

- **来源**: 用户指示（开源准备）
- **时间**: 2026-05-18
- **变更文件**: README.md, LICENSE, 党支部管理与实务经验沉淀.md
- **关键动作**: README重写 ✅ LICENSE创建 ✅ 经验沉淀§8.5+§8.6补充 ✅
- **变更详情**:
  - **README.md 重写**：移除YAML header，新增MIT License引用，新人5分钟上手移至最前，突出经验沉淀和决策记录地位（含"为什么决策日志如此重要"段落），建立人读文件索引（SOP/经验沉淀/guides/模板/治理文件五类），新增Harness工程与Context工程章节，移除AI Agent治理群章节，补充技术架构和guides介绍
  - **LICENSE 创建**：MIT License，版权2025-2026
  - **经验沉淀补充**：新增§8.5 Harness工程（三层结构/常为新的/一改具改执行代价）和§8.6 Context工程（四载体分工/日志分离/快照按需/next_prompt提升/蒸馏闭环），速查表新增7条标签（#47~#53）
- **设计决策**:
  - README不讲解AI Agent治理群——开源面向人读，Agent是内部工具
  - 经验沉淀与决策记录被标注为"最有价值的部分之一"——制度会随届迭代，但探索历史和书记判定背后的理想状态设想才是可跨届传承的智慧
  - Harness/Context工程同时出现在README和insights中——README是入口索引，insights是详细论证
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — Harness/Context工程作为独立方法论被提炼和命名]

## 2026-05-18 | T55 — P.2决策执行+视图模式三分类精确化+T55-1/T55-4确认

- **来源**: 用户指示
- **时间**: 2026-05-18
- **变更文件**: CLAUDE.md, 党小组组长工作手册.md, INDEX.md, DOC_MAP.md, 支委与党小组定人定责定岗说明.md, 组织委员工作流程指南.md, 纪检委员工作流程指南.md, 宣传委员工作流程指南.md, MANAGEMENT_MODE.md, 党支部管理与实务经验沉淀.md, DECISION_LOG.md
- **关键动作**: T55-1 ✅ T55-4 ✅ P.2决策执行 ✅ H2.5视图模式精确化 ✅
- **变更详情**:
  - **P.2 决策执行（D-17）**：创建 content/SOP/党小组组长工作手册.md（7 章：角色定位/核心工作/条块协作/专班操作/赋权权限/常见问题/交叉引用），6 个文件的引用关系已建立（INDEX.md/DOC_MAP.md/定人定责定岗说明/三委员SOP）
  - **H2.5 视图模式三分类精确化**：从"管理+只读"二分法升级为"管理+管理者只读+参与者只读"三分类，明确身份切换器的核心目的是区分两种只读模式
  - **T55-1 确认**：双轨工作流已基本稳定（角色切换/视图渲染/权限控制三条主线均已实现），品牌维度可以启动。发现赋权域区分（专班域vs活动域）仅以注释标注，写入丙部 P.3
  - **T55-4 确认**：反馈卡模板（4类别输入）+网页意见反馈功能已实现，未实现：下载/提交/整合迭代/架构升级
  - **T55-7 新增**：代码术语对齐 visitor-observe → participant-observe（5处引用）
  - **经验沉淀同步**：§6.6 从"管理模式与只读模式的彻底分离"升级为"视图模式三分类"，速查表标签更新
  - **MANAGEMENT_MODE.md 同步**：视图模式三分类从 visitor-observe 更新为 participant-observe
- **设计决策**:
  - 党小组组长工作手册为独立文档而非嵌入——独立文档+交叉引用确保一改具改可追溯（关联决策: D-17）
  - 只读模式分管理者只读和参与者只读——两者看到的内容完全不同（管理视角vs个人视角）
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 独立文档+交叉引用>嵌入式文档、只读不是一种模式而是两种模式（管理者只读vs参与者只读）]

## 2026-05-18 | T54 — SSOT_INDEX迁移、.ignore配置、历史摘要清理、next_prompt独立、P.1决策执行、经验沉淀重构

- **来源**: 用户指示
- **时间**: 2026-05-18
- **变更文件**: SSOT_INDEX.md, .trae/.ignore, CLAUDE.md, ARCHITECTURE.md, state.js, DOC_MAP.md, ROLE_CLASSIFICATION.md, COMMISSIONER_SYSTEM.md, MANAGEMENT_MODE.md, DATA.md, DECISION_LOG.md, 党支部管理与实务经验沉淀.md
- **关键动作**: T54-1~T54-7 全部完成
- **变更详情**:
  - **T54-1 SSOT_INDEX.md 迁移**：从 `.github/SSOT_INDEX.md` 移至根目录 `SSOT_INDEX.md`，全仓库 12 处引用路径更新（CLAUDE.md/ARCHITECTURE.md/state.js/DOC_MAP.md/ROLE_CLASSIFICATION.md），已迁移文件索引表追加记录
  - **T54-2 .trae/.ignore 配置**：写入 `.github/` 忽略规则，隔离 VS Code Agent 专属配置
  - **T54-3 历史执行摘要清理**：从 CLAUDE.md 删除 T18~T53 共 9 条历史摘要（T 编号追溯链已断裂，删除无损失）
  - **T54-4 next_prompt 独立章节**：从 H1.2 Step 5 提升为 H1.3，原 H1.3~H1.7 顺延为 H1.4~H1.8，文内引用同步更新
  - **T54-5 P.1 决策执行（D-16）**：CLAUDE.md H2.1 新增纪检委员三支柱+党建/党务板块本质区分；COMMISSIONER_SYSTEM.md §C 双域分化（§C.1a 党建+§C.1b 党务）；MANAGEMENT_MODE.md §8.2 纪检委员党务管理视图修正；DATA.md §4.1 宣传委员禁止创建活动+同步规则
  - **T54-6 经验沉淀道术器重构**：v12.0→v13.0，按道（理论）/术（方法）/器（实践）三层重构，新增 §1.3 党建/党务板块本质区分、§6.3 纪检委员三支柱
  - **T54-7 H3.4 经验沉淀规则**：新增三条强制规则（结构兼容性判断、正反两面论、禁止冗余标记）
- **设计决策**:
  - SSOT_INDEX.md 放根目录而非 content/——它是 Layer 1 注册表层文档，与 CLAUDE.md 同级（关联决策: D-16）
  - next_prompt 提升为独立章节——独立章节=独立注意力=更高执行率
  - 经验沉淀按道/术/器分层——不同读者关心不同层面的知识
  - 党建板块服务同学们/党务板块供支委会决策——后台同源不同切面（关联决策: D-16）
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 文件层级匹配原则、工具隔离原则、上下文非档案馆原则、独立章节>子步骤、散落=漂移、描述≠名称]

## 2026-05-18 | T53 — D-15衍生：全仓库集中统一修改（T53-1~T53-5）

- **来源**: D-15 决策执行（书记7条评议）
- **时间**: 2026-05-18
- **变更文件**: CLAUDE.md, README.md, MANAGEMENT_MODE.md, SOP×4, constants.js, state.js, role-selector.js, sidebar.js, workspace-entry.js, ws-organizer-entry.js, ws-disc-commissioner-entry.js, sopData.js, auth.js, taskforces.js, about.html, workspace.html, ws-organizer.html, COMMISSIONER_SYSTEM.md, SOP_WEB.md, DATA.md, CALENDAR.md, ORG_BUILDING.md, 模板库×4, 党支部管理与实务经验沉淀.md
- **关键动作**: T53-1 术语替换 / T53-2 赋权链更新 / T53-3 核心定义重写 / T53-4 SOP更新 / T53-5 代码层修改
- **变更详情**:
  - **T53-1: 全仓库"活动组织者"→"组织者"术语替换**：81处替换，覆盖content/（15文件）、docs/（13文件）、根目录（CLAUDE.md+README.md）。"专班组织者/专班深度参与者"→"组织者/深度参与者（专班域赋权）"
  - **T53-2: CLAUDE.md H2.5 赋权关系链更新**：新增"组织者的两种赋权路径"（Ⅰ自上而下/Ⅱ自下而上）、"组织者退出机制"、核心规则新增"平等协商关系"条目
  - **T53-3: MANAGEMENT_MODE.md 核心定义重写**：§1.1架构图组织者从"统筹协调层"→"分工记录层"；§1.2数据流从"验收确认"→"分工记录汇总"；§二权限矩阵从"管理闭环"→"分工记录闭环"；§三"验收方式"→"记录方式"；§五 verifiedBy→divisionRecordedBy；§六"任务分配面板"→"分工记录面板"；§八"活动编辑视图"→"分工记录视图"；附录A组织者定义更新
  - **T53-4: SOP文件更新**：常见场景——考勤规则修正（组织者最好出席）、新增组织者定义引用+两种情况+产出物+退出机制；纪检委员——新增组织者考勤要求；宣传委员——新增组织者产出物衔接；定人定责定岗——新增扁平化设计引用
  - **T53-5: 代码层统一修改**：workspace-entry/role-selector desc "任务分配"→"分工记录"；sidebar desc "策划执行督办"→"分工记录·桥梁作用"；auth.js注释更新引用H2.5+H2.6+两种赋权路径；state.js "管理视图"→"分工记录视图"；sopData.js组织者职责描述更新；about.html "任务查看"→"分工记录"
- **设计决策**:
  - 术语替换是所有后续任务的前提——先统一术语再更新定义（D-15 ①）
  - 宪法层先行（H2.5/H2.6）→理论层跟进（MANAGEMENT_MODE.md）→操作层（SOP）→实现层（代码）
  - 组织者核心职能从"管理闭环"重新定义为"分工记录"——这是D-15最重要的理论修正
- **结果**: T53-1~T53-5 全部完成，乙部T53-1~T53-7已删除
- **蒸馏标签**: [经验蒸馏: 是 — 大规模术语替换应分目录并行执行以提高效率；宪法层→理论层→操作层→实现层的修改顺序确保下游修改有上游依据；"验收"→"分工记录"的替换不仅是术语变更，更是权力关系的重新定义——从上下级验收变为平等协商记录]

## 2026-05-18 | T53 — D-15衍生：7处不一致修复+guides组织者定义更新

- **来源**: Agent 执行（T53-6 + T53-7 合并执行）
- **时间**: 2026-05-18
- **变更文件**: MANAGEMENT_MODE.md, COMMISSIONER_SYSTEM.md, SOP_WEB.md, DATA.md, auth.js, 党支部管理与实务经验沉淀.md
- **关键动作**: T53-6 7处不一致修复 / T53-7 guides组织者定义更新
- **变更详情**:
  - **T53-6: 7处不一致逐一修复**：
    - `MANAGEMENT_MODE.md`: materials子记录典型写入者 "组织者/深度参与者" → "深度参与者（组织者打包提交）"（对齐D-15+H2.6产出物定义）
    - `MANAGEMENT_MODE.md`: "任务分配面板" → "分工记录面板"（4处：§6.2.1标题+面板UI+移动端适配表+Phase2风险表+Phase2子项）
    - `COMMISSIONER_SYSTEM.md`: 组织者协调清单 "任务分配" → "分工记录"（§F.2）
    - `MANAGEMENT_MODE.md`: organizer-card颜色 蓝色#3B82F6 → 紫色#8B5CF6（对齐workspace-entry.js代码）
    - `auth.js`: AUTHZ_CHAIN后添加域区分注释（leader→活动域赋权 vs org-commissioner→专班域赋权）
    - 验证：术语"活动组织者"/"专班组织者"全仓库零残留；组织者党务管理视图为"—"已确认；auth.js注释H2.5+H2.6已确认
  - **T53-7: guides文件组织者定义更新**：
    - `COMMISSIONER_SYSTEM.md`: §A.5活动筹备专班挂靠角色 "组织委员/组织者" → "组织委员"（H2.3唯一管理节点）；§F.2长期活动组织者职责补充"分工记录"
    - `SOP_WEB.md`: §B.5注释 "§0.2A+§0.3" → "H2.5+H2.6 (D-15)"；赋权链补充组织者两种赋权路径说明
    - `DATA.md`: §2.1B materials子记录写入角色补充D-15业务规则（深度参与者创建+组织者打包提交）
    - `党支部管理与实务经验沉淀.md`: 赋权链教训中旧章节号 "§0.2A+§0.3" → "H2.5+H2.6"
  - **YAML更新**: COMMISSIONER_SYSTEM.md/SOP_WEB.md/DATA.md last_updated → "2026-05-18"
- **设计决策**:
  - materials子记录写入者区分业务层（深度参与者创建+组织者打包）与实现层（党小组组长/宣传委员有写权限），DATA.md同时标注两层
  - AUTHZ_CHAIN扁平结构无法直接区分活动域/专班域，以注释说明域判定需结合assignedRoles.activity字段
- **结果**: 7处不一致全部修复，3个guides文件组织者定义更新完成，全仓库一改具改验证通过
- **蒸馏标签**: [经验蒸馏: 是 — 一改具改验证需覆盖insights文件（经验沉淀中的旧引用也需同步）；颜色标识不一致往往源于设计文档与代码分别迭代；术语统一后需检查所有衍生描述（如"任务分配"→"分工记录"需同步到面板标题、移动端适配表、风险表等所有引用位置）]

## 2026-05-18 | T53 — D-15决策记录+H2.6核心理论基石写入

- **来源**: P.4 书记评议 → D-15 决策执行
- **时间**: 2026-05-18
- **变更文件**: DECISION_LOG.md, CLAUDE.md
- **关键动作**: D-15 修正 + H2.6 写入
- **变更详情**:
  - **D-15 修正**：③中"自上而下布置的活动"→"自上而下布置的活动或专班"（书记指出表述疏忽，活动与专班并列）
  - **H2.6 组织者与深度参与者的扁平化设计**：写入 CLAUDE.md 甲部核心理论基石，包含——核心定义（活动与专班并列）、扁平化含义（无上下级≠无分工）、核心比喻（脑子与手）、组织者两种情况（Ⅰ自上而下/Ⅱ自下而上）、考勤要求、组织者核心职能（分工记录）、退出机制、产出物、术语规范（统一"组织者"）
- **设计决策**:
  - H2.6 作为核心理论基石而非执行事项——扁平化设计是党支部参与途径的理论基础，应与 H2.1~H2.5 并列
  - D-15 ③修正强调"活动或专班"并列——书记明确指出"绝不仅仅只有活动"
- **结果**: D-15 修正完成，H2.6 写入完成，T53-1~T53-7 待执行
- **蒸馏标签**: [经验蒸馏: 是 — 核心理论应写入甲部H2而非仅留在决策日志；术语修正（"活动组织者"→"组织者"）是概念并列性的体现——活动与专班并列，组织者不应绑定活动]

## 2026-05-17 | T52 — SOP 7维度全查+全量重写

- **来源**: P.3 决策执行（D-14）
- **时间**: 2026-05-17
- **变更文件**: 组织委员工作流程指南.md, 宣传委员工作流程指南.md, 纪检委员工作流程指南.md, 常见工作场景快速指南.md, 支委与党小组定人定责定岗说明.md, CLAUDE.md, DECISION_LOG.md
- **关键动作**: T52-1~T52-7 全部完成
- **变更详情**:
  - **T52-1 组织委员 SOP**：人名硬编码→角色名；添加文末版本号 v3.0；网页同步缺口标注（发布招募按钮）
  - **T52-2 宣传委员 SOP**：人名硬编码→角色名；党建域任务流从3步扩展为7步；网页同步缺口标注（拖拽子任务/照片墙/每周一报送/图片管理规则）；添加文末版本号 v3.0
  - **T52-3 纪检委员 SOP**：人名硬编码→角色名；网页同步缺口标注（批注按钮）；添加文末版本号 v5.0
  - **T52-4 常见工作场景快速指南全量重写**：623行→607行；人名硬编码20+处→0处；通知/考勤/宣传/经费规则抽取为4张公共规则表；条条支委工作引用化；版本号统一为 v4.0；条条/块块定义修正
  - **T52-5 定人定责定岗说明全量重写**：428行→263行；人名硬编码6处→0处；条条/块块定义修正（条条=纵向职能线，块块=横向党小组）；第六节删除改为指向快速指南；新增数据协作闭环/冲突解决/条块交叉区域；版本号统一为 v2.0
  - **T52-6 YAML 版本号一致性**：三份委员SOP添加文末版本号，与YAML一致
  - **T52-7 网页同步缺口标注**：组织委员（发布招募）、宣传委员（拖拽子任务/照片墙/每周一报送/图片管理规则）、纪检委员（批注按钮）
  - **CLAUDE.md 结构修复**：开篇"甲乙两部"→"甲乙丙三部"；丙部标题从##升为#；P.3从甲部移至丙部→决策完成→从丙部删除；乙部清理已完成条目+写入T52-1~T52-7
  - **D-14 决策记录**写入 DECISION_LOG.md
- **设计决策**:
  - 条条支委部分对齐各自SOP（引用而非重复），其他管理身份+相互关系对齐代码实现
  - 公共规则表模式——通知/考勤/宣传/经费规则只写一次，各场景通过锚点引用
  - 人名→角色名的替换是"去个人化"的关键步骤，确保SOP不因人员变动而失效
- **结果**: T52-1~T52-7 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — SOP审读7维度是可复用的审计框架；公共规则表模式消除信息冗余；人名→角色名是"去个人化"的通用原则；条条支委工作引用化避免SOP间重复]

## 2026-05-17 | T52 — P.3决策执行+CLAUDE.md结构修复

- **来源**: 用户指示（2项）
- **时间**: 2026-05-17
- **变更文件**: CLAUDE.md, DECISION_LOG.md
- **关键动作**: T52-0 CLAUDE.md结构修复 / P.3决策执行写入乙部
- **变更详情**:
  - **T52-0: CLAUDE.md 结构修复**：
    - 开篇从"甲乙两部"改为"甲乙丙三部"，新增丙部描述
    - 丙部标题从 `## 丙部` 升为 `# 丙部`，与甲部/乙部并列
    - 甲部 H1.7 模板中 `### P.<序号>` 改为 `## P.<序号>`
    - P.3 条目从甲部 H1.7 末尾移除（决策已完成，不再属于甲部）
    - 乙部清理：删除已完成条目（T48-1~4、T44-1~2、T30-1~4/10、T30-12），写入 P.3 衍生任务 T52-1~T52-7
  - **P.3 决策执行**：
    - 书记决策：方向A（按角色使用频率）+ 全部7维度都要审
    - 乙部写入 7 个衍生任务：T52-1~T52-3（三委员SOP审读）、T52-4~T52-5（常见场景+定人定责定岗全量重写）、T52-6（YAML版本号一致性）、T52-7（网页同步缺口标注）
    - DECISION_LOG.md 新增 D-14 决策记录
- **设计决策**:
  - 丙部与甲部/乙部并列——三者是同一层级的治理结构，不应嵌套
  - 已完成的乙部条目按 H1.6 规则删除（完成即删，不保留 ✅ 标记）
- **结果**: T52-0 完成，T52-1~T52-7 已写入乙部待执行
- **蒸馏标签**: [经验蒸馏: 是 — 文件结构应与逻辑结构一致——丙部是"三部"之一，标题层级必须与甲部/乙部并列；已完成条目应从乙部删除而非标记 ✅，否则乙部会膨胀失去"常为新的"特性]

## 2026-05-17 | T51 — P.3决策+YAML审计+ABOUT微调

- **来源**: 用户指示（3项）
- **时间**: 2026-05-17
- **变更文件**: CLAUDE.md, DECISION_LOG.md, about.html
- **关键动作**: T51-1 P.3决策推进 / T51-2 YAML审计 / T51-3 ABOUT致谢移位+目录加长
- **变更详情**:
  - **T51-1: P.3 SOP审读决策**：
    - `CLAUDE.md` 丙部 P.3：第一步已决策为方向 A（按角色使用频率），审读顺序：组织委员→宣传委员→纪检委员→常见场景→定人定责定岗
    - 推进到第二步：等待书记选择审读维度优先级
  - **T51-2: YAML header 审计**：
    - 发现 DECISION_LOG.md 和 CLAUDE.md 的 `last_updated` 仍为 2026-05-16，已修正为 2026-05-17
    - 其余文件（insights/README/SNAPSHOT/EXECUTION_LOG）已正确
    - **教训**：H4.1 检查清单第 6 条已规定"YAML 更新"，但执行中仍然遗漏——规则存在但执行时没有强制检查
  - **T51-3: ABOUT.html 微调**：
    - 致谢 section 从技术架构之后移到系统概述之前
    - 目录导航栏加长：padding 16px→24px，链接间距 6px→8px，字号 0.75rem→0.8rem，宽度 160px→170px
    - 目录链接顺序同步更新：致谢→系统概述→核心理论→...→免责声明
- **设计决策**:
  - 致谢放在系统概述之前——先表达感谢，再介绍系统，更符合中文礼仪
- **结果**: T51 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — YAML last_updated 遗漏是反复出现的问题，需要在 H4.1 检查清单中增加"修改文件后立即检查 YAML"的强制步骤]

## 2026-05-17 | T50 — 经验蒸馏+SNAPSHOT+README+ABOUT重写

- **来源**: 用户指示（4大任务）
- **时间**: 2026-05-17
- **变更文件**: 党支部管理与实务经验沉淀.md, DECISION_LOG.md, SNAPSHOT.md, README.md, about.html, CLAUDE.md
- **关键动作**: T50-1 insights v10.0 / T50-2 Decision Log 蒸馏标签 / T50-3 SNAPSHOT v8 / T50-4 README 重写 / T50-5 ABOUT 重写+右侧目录
- **变更详情**:
  - **T50-1: 经验蒸馏 insights v10.0**：
    - `党支部管理与实务经验沉淀.md`：v7.0→v10.0，新增 §11 子页面拆分与跨页面导航（6 条经验：拆分四步法/签名变更验证/URL参数导航/数据表搜索刚需/双域归属判断/Skill-Agent对齐）
    - 附录速查表新增 7 条（#29~#35）
    - frontmatter 更新：version/milestone/last_updated
  - **T50-2: Decision Log 蒸馏标签**：
    - `DECISION_LOG.md`：顶部新增蒸馏标签格式说明
    - D-13 添加蒸馏标签：[经验蒸馏: 是 — URL参数导航/入口权限/数据表搜索刚需]
    - D-12 添加蒸馏标签：[经验蒸馏: 是 — 按角色拆分/路由+子模块/侧边栏选择面板]
    - D-1~D-3 添加蒸馏标签：[经验蒸馏: 是 — 角色即视图/信息流面板/Header全局切换器]
  - **T50-3: SNAPSHOT v8**：
    - `SNAPSHOT.md`：v7→v8，全面更新物理拓扑（19个HTML页面+entries/components/core/services子目录）、前端页面清单（19页详细说明）、前端源码关键文件（10项）、核心理论新增赋权关系链、权限矩阵新增8角色完整版、版本里程碑新增v8
  - **T50-4: README 重写**：
    - `README.md`：全面重写为双职能文档——①产品经理视角（我们要做什么+双域管理理论）②使用者视角（页面功能+协同关系+权限体系+新人上手）
    - 新增章节：一、我们要做什么（制度即代码/角色即视图/经验可传承）；三、页面功能与协同关系（全局导航结构+各页面功能+页面协同关系）；四、权限体系（赋权关系链+写入权限+关键约束）
  - **T50-5: ABOUT.html 重写+右侧目录**：
    - `about.html`：全面重写内容结构（系统概述→核心理论5节→三委员双域职责→页面导航→权限体系→技术架构→致谢→免责声明）
    - 新增右侧固定目录导航栏（about-toc）：8个章节链接，点击平滑滚动，滚动时自动高亮当前章节
    - 页面导航章节使用委员色系区分（蓝/绿/琥珀）
    - 核心理论新增专班制、决策树、赋权关系链三个子节
    - 权限体系新增视图模式三分类表格
- **设计决策**:
  - Decision Log 蒸馏标签与执行日志蒸馏标签互补——前者提取"什么原则指导决策"，后者提取"怎么做更好"
  - README 双职能设计：第一节"我们要做什么"是产品经理视角，后续章节是使用者视角
  - ABOUT 右侧目录使用 fixed 定位+scroll 监听，1280px 以下自动隐藏
- **结果**: T50 全部完成
- **蒸馏标签**: [经验蒸馏: 否 — 文档更新与治理操作]

## 2026-05-17 | T30-13~15 — 回归测试（赋权持久化+视图切换+活动写入门禁）

- **来源**: 乙部 P3 测试任务
- **时间**: 2026-05-17
- **变更文件**: ws-secretary-entry.js, ws-leader-entry.js, ws-organizer-entry.js, ws-deep-entry.js, ws-org-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-disc-commissioner-entry.js, ws-visitor-entry.js, party-secretary-entry.js, party-org-entry.js, party-prop-entry.js, party-disc-entry.js, CLAUDE.md
- **关键动作**: T30-13 发现并修复 setActiveRole 参数 Bug / T30-14 视图切换逻辑验证通过 / T30-15 活动写入门禁验证通过
- **变更详情**:
  - **T30-13: 赋权持久化回归测试**：
    - 🔴 **发现 Bug**：所有 12 个子页面 entry JS 调用 `AuthStore.setActiveRole(role)` 只传了一个参数，但 `setActiveRole(module, role)` 需要两个参数
    - 结果：module 被设为角色字符串，role 为 undefined——角色没有被正确保存到 AuthStore
    - 🔧 **修复**：所有 12 个子页面更新为 `AuthStore.setActiveRole('workspace', role)` 或 `AuthStore.setActiveRole('party', role)`
    - ✅ 修复后验证：CrossPageState.load() → setActiveRole(module, role) → ViewModeStore.setMode() 逻辑链正确
  - **T30-14: 书记全局视图切换回归测试**：
    - ✅ AUTHZ_CHAIN 中书记的 visible 列表包含所有角色
    - ✅ getViewCategory('secretary', 'any-role') 返回 'manager-observe'
    - ⚠️ 设计限制：子页面拆分后书记无法在子页面内直接切换角色视图，需回到角色选择面板——这是 D-12 决策的设计，不是 Bug
  - **T30-15: 自下而上活动写入门禁测试**：
    - ✅ canWriteActivity(role) 限制为 secretary + leader
    - ✅ 活动写入 UI 只出现在 ws-secretary-entry.js 和 ws-leader-entry.js
    - ✅ 三委员/组织者/深度参与者的子页面均无活动写入入口
    - ✅ 符合 H2.1 规则：条条支委无权直接写入活动
- **设计决策**:
  - setActiveRole 参数 Bug 是子页面拆分时遗漏的——原 workspace-entry.js 中角色由路由函数设置，不需要 setActiveRole；子页面独立后需要自行设置，但遗漏了 module 参数
- **结果**: T30-13~15 全部完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 是 — 子页面拆分时必须验证所有状态初始化调用与原版一致；函数签名变更后全仓库搜索所有调用点并逐一验证参数]

## 2026-05-17 | T30-16 — 文档同步自动化机制建设

- **来源**: 乙部 P3 治理任务
- **时间**: 2026-05-17
- **变更文件**: sop-web-sync/SKILL.md（新建）, SSOT_INDEX.md, fagaiwei.agent.md, CLAUDE.md
- **关键动作**: T30-16 创建 sop-web-sync skill + 更新 SSOT 索引
- **变更详情**:
  - **sop-web-sync/SKILL.md**（新建）：SOP↔网页代码双向同步校验 skill
    - 三种模式：SOP→代码影响面分析 / 代码→SOP溯源校验 / 双向一致性校验
    - 映射表：13 条 SOP→代码对应关系（活动管理/考勤/考察/专班/宣传/补课/公邮/党员发展/档案/术语/委员系统/赋权/视图）
    - 输出模板：影响面报告 / 溯源报告 / 一致性校验报告
  - **SSOT_INDEX.md**：
    - 注册表映射新增 3 条：SOP→docs/src/、TERMINOLOGY→constants.js、DATA→数据结构代码
    - 同步触发矩阵新增 3 条：SOP 变更→代码、术语变更→全仓库、DATA 变更→数据结构代码
    - Skill 配置清单新增 sop-web-sync
    - 发改委关联 Skill 新增 sop-web-sync
  - **fagaiwei.agent.md**：专属能力挂载新增 sop-web-sync
- **设计决策**:
  - sop-web-sync 挂载在发改委而非工信部——因为其核心职责是"文本母本与内容层治理"，SOP 同步本质上是文本治理
  - 映射表驱动而非自动化脚本——当前阶段 AI Agent 按映射表执行 Grep 搜索即可，无需独立脚本
  - 与现有 sop-sync skill 互补：sop-sync 处理 SOP↔SOP 同步，sop-web-sync 处理 SOP↔代码同步
- **结果**: T30-16 完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 是 — Skill 设计应与现有 Agent 职责对齐，映射表驱动比脚本驱动更适合 AI Agent 工作流]

## 2026-05-17 | T48-6 — workspace-entry.js / party-entry.js 拆分为角色子模块

- **来源**: D-12 衍生任务
- **时间**: 2026-05-17
- **变更文件**: workspace-entry.js, party-entry.js, workspace.html, party.html, CLAUDE.md
- **关键动作**: T48-6 旧版单体 entry JS 瘦身为路由跳转页
- **变更详情**:
  - **workspace-entry.js**：从 2070 行瘦身为 65 行路由跳转页
    - 检测 CrossPageState/AuthStore 中的角色 → 自动 `window.location.replace()` 到对应子页面
    - 无角色时显示角色选择面板（8 个角色卡片，点击跳转子页面）
    - 移除全部旧版角色渲染逻辑（书记日历、组长写入、三委员看板、访客面板等）
  - **party-entry.js**：从 180 行瘦身为 57 行路由跳转页
    - 同上逻辑：检测角色 → 跳转子页面，无角色时显示选择面板
    - 移除旧版事件监听（sidebar:role-select、view:mode-change 等）和 PartyModule 渲染调用
  - **workspace.html**：给 `<main>` 添加 `id="workspace-main"`
  - **party.html**：给 `<main>` 添加 `id="party-main"`
- **设计决策**:
  - 使用 `window.location.replace()` 而非 `href` 赋值——replace 不产生历史记录，用户按返回不会回到空白路由页
  - 旧 URL 兼容性保留——直接访问 workspace.html/party.html 仍可用（自动跳转或显示选择面板）
  - 侧边栏链接仍指向 workspace.html/party.html——被 interceptSidebarNavigation 拦截弹出角色选择面板
- **全局引用验证**:
  - ✅ 无 JS 文件从 workspace-entry.js 或 party-entry.js 导入
  - ✅ 无 JS 代码直接跳转到 workspace.html 或 party.html
  - ✅ 无 HTML 文件直接链接到 workspace.html 或 party.html
  - ✅ role-selector.js 中 11 个角色跳转目标全部指向子页面
  - ✅ 12 个子页面 HTML 引用的 entry JS 路径全部正确
  - ✅ 12 个子页面 entry JS 文件全部存在
- **结果**: T48-6 完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 是 — 大型单体文件拆分为路由+子模块时，先确认子模块完全独立（无交叉引用），再瘦身为路由页；replace() 比 href 赋值更适合路由跳转]

## 2026-05-17 | T30-11 — 三委员双域职责网页端可视化呈现

- **来源**: 乙部 P2 功能开发
- **时间**: 2026-05-17
- **变更文件**: commissioner-matrix.js（新建）, about.html, CLAUDE.md
- **关键动作**: T30-11 三委员双域职责可视化组件
- **变更详情**:
  - **T30-11: 三委员双域职责可视化**：
    - `commissioner-matrix.js`（新建）：双域职责矩阵组件，展示三委员在党建工作台和党务管理中的不同职责
      - 数据源：H2.1 三委员双域职责表 + COMMISSIONER_SYSTEM.md §B.1 条条支委职责域
      - 布局：域标签（2列）→ 三委员卡片（各含双域分栏）→ 核心规则提示条
      - 交互：每个职责分栏可点击跳转至对应子页面
      - 色系：组织委员蓝色(#3B82F6)、宣传委员翠绿(#10B981)、纪检委员琥珀(#D97706)
    - `about.html`：在"二、核心理论"和"三、页面索引"之间插入双域职责矩阵卡片
- **设计决策**:
  - 放置在 about.html 而非 party.js——双域职责是系统级概念，适合在系统说明页展示
  - 每个职责分栏作为 `<a>` 链接指向对应子页面——与 D-12 页面拆分后的子页面结构对齐
  - 核心规则提示条复用 H2.1 关键判例——组织委员唯一专班管理节点、纪检不生长专班、考勤数据同源
- **结果**: T30-11 完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 否 — 常规功能开发]

## 2026-05-17 | T49-1~4 — P.2 决策执行：权限修正+视图切换+筛选搜索

- **来源**: 书记 P.2 决策（D-13）
- **时间**: 2026-05-17
- **变更文件**: ws-disc-commissioner-entry.js, main-entry.js, index.html, ws-visitor-entry.js, ws-prop-commissioner-entry.js, ws-org-commissioner-entry.js, cross-page-state.js, CLAUDE.md, DECISION_LOG.md
- **关键动作**: T49-1 权限修正 / T49-2 视图切换 / T49-3 考勤考察筛选 / T49-4 全仓库筛选搜索检查
- **变更详情**:
  - **T49-1: 首页跳转考勤面板权限修正**：
    - `ws-disc-commissioner-entry.js`: 从 URL 参数判断 `fromHomepage`，设置 ViewModeStore 为 `visitor-observe`（只读模式），显示琥珀色只读提示条
    - `main-entry.js`: 考勤跳转 URL 添加 `mode=readonly` 参数
    - `index.html`: 考勤"查看详情"链接添加 `?mode=readonly`
  - **T49-2: 访客只读面板日历/列表视图切换**：
    - `ws-visitor-entry.js`: 活动动态 tab 新增列表/日历视图切换按钮，日历视图按月分组展示活动卡片
  - **T49-3: 考勤总表/考察总表筛选搜索**：
    - `ws-disc-commissioner-entry.js`: 考勤总表新增搜索框+状态筛选（出勤/缺勤/请假），长格式和宽格式均受筛选影响
    - `ws-disc-commissioner-entry.js`: 考察总表新增搜索框+标签筛选（支部/党小组/专班）+状态筛选（已确认/待确认）
  - **T49-4: 全仓库大型数据表筛选搜索**：
    - `ws-visitor-entry.js`: 专班进展新增搜索+状态筛选，考勤概况新增搜索
    - `ws-prop-commissioner-entry.js`: 多维表格移除截断（原 slice(0,10)），新增搜索+类型筛选+状态筛选
    - `ws-org-commissioner-entry.js`: 专班管理看板新增搜索，追踪看板新增搜索
- **设计决策**:
  - 考勤面板从首页进入时为只读模式——根据 D-13 决策，考勤数据可查看但不可从首页入口修改
  - 多维表格移除截断限制——有搜索筛选后不再需要截断，用户可看到完整数据
  - 专班管理看板搜索使用 `bindCardClicks()` 提取为函数，因为看板动态渲染后需重新绑定事件
- **结果**: T49-1~T49-4 全部完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 是 — 大型数据表必须有搜索筛选是通用原则；动态渲染的列表需在渲染后重新绑定事件；URL 参数 mode=readonly 是权限控制的有效手段]

## 2026-05-17 | T48-7 — CrossPageState 扩展 + 首页跳转链接适配

- **来源**: D-12 衍生任务
- **时间**: 2026-05-17
- **变更文件**: cross-page-state.js, index.html, main-entry.js, ws-visitor-entry.js, ws-org-commissioner-entry.js, ws-disc-commissioner-entry.js, CLAUDE.md
- **关键动作**: T48-7 CrossPageState URL 参数支持 + 首页跳转适配
- **变更详情**:
  - **T48-7: CrossPageState 扩展 + 首页跳转链接适配**：
    - `cross-page-state.js`: 新增 `buildURL(page, params)` 和 `getURLParams()` 方法，支持 URL 参数构建与解析
    - `index.html`: 3 个"查看全部/详情"链接更新——近期活动→ws-visitor.html, 专班进展→ws-org-commissioner.html, 考勤概况→ws-disc-commissioner.html
    - `main-entry.js`: 点击处理器适配——活动条目→ws-visitor.html?activityId=xxx, 专班条目→ws-org-commissioner.html?taskforceId=xxx, 考勤条目→ws-disc-commissioner.html?activityId=xxx（新增考勤条目点击处理）
    - `ws-visitor-entry.js`: 读取 URL activityId 参数，高亮对应活动并自动滚动定位
    - `ws-org-commissioner-entry.js`: 读取 URL taskforceId 参数，自动展开对应专班详情面板
    - `ws-disc-commissioner-entry.js`: 读取 URL activityId 参数，按活动筛选考勤记录+筛选提示条+清除筛选按钮
- **设计决策**:
  - 考勤概况跳转目标从 party-disc.html 修正为 ws-disc-commissioner.html——根据 H2.1 双域管理理论，考勤数据属于党建工作台（纪检委员·考勤管理），不属于党务管理（纪检委员·补课制度/公邮管理）
  - URL 参数方案（丙部 P.2 选项 A）作为默认实现，可分享/收藏链接
- **结果**: T48-7 完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 是 — 双域归属判断：考勤→党建工作台而非党务管理，URL 参数传递是跨页面导航的最佳实践]

## 2026-05-17 | T48-5 — 党务管理子页面拆分（4 委员页面 + party.html 保留）

- **来源**: D-12 衍生任务
- **时间**: 2026-05-17
- **变更文件**: role-selector.js, party-org.html/js, party-prop.html/js, party-disc.html/js, party-secretary.html/js, CLAUDE.md
- **关键动作**: T48-5 党务管理子页面拆分完成
- **变更详情**:
  - **T48-5: 党务管理子页面拆分**：
    - `role-selector.js`: party 模块 4 个角色跳转目标从 `./party.html` 更新为子页面（secretary→party-secretary.html, org-commissioner→party-org.html, prop-commissioner→party-prop.html, disc-commissioner→party-disc.html）
    - 4 个党务管理子页面已在前轮创建完成（HTML + entry JS），本轮完成跳转路由收尾
    - party.html 保留原样（旧链接兼容，与 workspace.html 同策略）
- **设计决策**:
  - party.html 保留完整内容不改为跳转页，与 workspace.html 策略一致——侧边栏点击已被 interceptSidebarNavigation 拦截弹出角色选择面板，直接访问旧 URL 仍可正常使用
- **结果**: T48-5 完成，从乙部删除
- **蒸馏标签**: [经验蒸馏: 否 — 常规收尾]

## 2026-05-17 | T48-3+4 — 党建工作台子页面拆分 2/3+3/3（三委员+访客只读）

- **来源**: D-12 衍生任务
- **时间**: 2026-05-17
- **变更文件**: ws-org-commissioner.html/js, ws-prop-commissioner.html/js, ws-disc-commissioner.html/js, ws-visitor.html/js, role-selector.js
- **关键动作**: T48-3 三委员子页面 + T48-4 访客只读子页面
- **变更详情**:
  - 新增 4 个子页面 HTML + 4 个 entry JS：
    - ws-org-commissioner：组织委员工作台（2 Tab：专班管理三列看板+追踪看板）
    - ws-prop-commissioner：宣传委员工作台（3 Tab：活动与专班看板+宣传专班工作量+多维表格）
    - ws-disc-commissioner：纪检委员工作台（3 Tab：考勤管理长/宽格式+考察管理长/宽格式+活动监督复盘）
    - ws-visitor：访客只读面板（3 Tab：活动动态+专班进展+考勤概况+琥珀色只读提示条）
  - role-selector.js：三委员跳转目标更新为子页面
  - workspace.html 保留原样（旧链接兼容）
- **设计决策**:
  - 组织委员主色 #CE1126（红色系），宣传委员主色 #10B981（绿色系），纪检委员主色 #D97706（琥珀色系）
  - 纪检委员考勤/考察表格支持长格式/宽格式切换（与原 workspace-entry.js 一致）
  - 访客只读面板顶部有琥珀色提示条，提醒用户选择角色进入管理模式
- **结果**: 党建工作台全部 8 个角色子页面创建完成
- **蒸馏标签**: [经验蒸馏: 否]

## 2026-05-17 | T48-2 — 党建工作台子页面拆分 1/3（书记/组长/组织者/深度参与者）

- **来源**: D-12 衍生任务
- **时间**: 2026-05-17
- **变更文件**: ws-secretary.html, ws-leader.html, ws-organizer.html, ws-deep.html, ws-secretary-entry.js, ws-leader-entry.js, ws-organizer-entry.js, ws-deep-entry.js, role-selector.js
- **关键动作**: T48-2 党建工作台 4 角色子页面创建
- **变更详情**:
  - 新增 4 个子页面 HTML + 4 个 entry JS：
    - ws-secretary.html + ws-secretary-entry.js：书记工作台（统计卡片+日历+写入+赋权）
    - ws-leader.html + ws-leader-entry.js：组长工作台（3 Tab：活动写入/考勤上传/考察上传）
    - ws-organizer.html + ws-organizer-entry.js：组织者工作台（3 Tab：任务分配/复盘提交/考察查看）
    - ws-deep.html + ws-deep-entry.js：深度参与者工作台（单面板：任务状态更新）
  - role-selector.js：更新跳转目标——书记→ws-secretary.html、组长→ws-leader.html、组织者→ws-organizer.html、深度参与者→ws-deep.html
  - 三委员仍跳转 workspace.html（T48-3 待创建子页面后更新）
- **设计决策**:
  - 每个子页面独立 HTML + 独立 entry JS，共享 header/sidebar 组件
  - 每个子页面通过 CrossPageState 恢复角色状态，自动进入管理模式
  - 数据加载失败时 fallback 到 ACTIVITIES mock 数据（与主页一致）
  - 子页面保留"返回主页"链接，确保导航闭环
- **结果**: 4 个子页面全部创建完成，浏览器验证零 JS 错误
- **蒸馏标签**: [经验蒸馏: 是 — 子页面拆分的关键是共享组件（header/sidebar）+ 独立 entry + CrossPageState 角色恢复；每个 entry 都需要独立的 init 函数和 fallback 逻辑]

## 2026-05-17 | T48-1 — 角色选择面板组件

- **来源**: D-12 衍生任务
- **时间**: 2026-05-17
- **变更文件**: components/role-selector.js（新建）, components/sidebar.js
- **关键动作**: T48-1 角色选择面板组件
- **变更详情**:
  - `components/role-selector.js`（新建）：角色选择面板组件
    - `showRoleSelector(module)`：弹出角色选择面板，展示对应模块的所有角色卡片
    - `interceptSidebarNavigation()`：拦截侧边栏"党建工作台"/"党务管理"的点击事件，替代直接跳转
    - 角色卡片包含：角色图标 + 角色名 + 职责描述 + 右箭头
    - 选择角色后：保存 CrossPageState → 跳转到对应页面（携带角色参数）
    - 支持 ESC 关闭、点击遮罩关闭、关闭按钮关闭
  - `components/sidebar.js`：导入 interceptSidebarNavigation，在 renderSidebar 末尾调用
- **设计决策**:
  - 面板使用固定定位模态框（而非 sidebar 内展开），因为角色选择是跨页面的导航行为
  - 当前阶段选择角色后仍跳转到 workspace.html / party.html（携带角色参数），等 T48-2~T48-5 子页面创建后改为跳转子页面
  - 面板样式与现有设计系统一致：白色圆角卡片 + 半透明遮罩 + 毛玻璃效果
- **结果**: T48-1 完成，点击侧边栏"党建工作台"/"党务管理"时弹出角色选择面板
- **蒸馏标签**: [经验蒸馏: 否]

## 2026-05-17 | T48 — P.1 决策归档 + 衍生任务链写入乙部

- **来源**: 书记决策（P.1 页面架构演进方向）
- **时间**: 2026-05-17
- **变更文件**: CLAUDE.md, DECISION_LOG.md
- **关键动作**: T48 P.1 决策归档 + 衍生任务链
- **变更详情**:
  - **决策内容**（D-12）：
    - 第一步：A 拆——侧边栏导航不变，点击"党建工作台"/"党务管理"时弹出角色选择面板
    - 第二步：A 按角色拆分——职权互不交叉，不同界面指向同一后台数据，只是显示/筛选/交互方式不同
  - **丙部更新**：P.1 从丙部删除（已决策），P.2 保留（未决策）
  - **乙部衍生任务链**（7 项）：
    - T48-1：角色选择面板组件（点击侧边栏时弹出，替代直接跳转）
    - T48-2：党建工作台子页面拆分 1/3（书记/组长/组织者/深度参与者）
    - T48-3：党建工作台子页面拆分 2/3（三委员）
    - T48-4：党建工作台子页面拆分 3/3（访客只读 + workspace.html 入口跳转）
    - T48-5：党务管理子页面拆分（4 委员页面 + party.html 入口跳转）
    - T48-6：workspace-entry.js / party-entry.js 拆分为角色子模块
    - T48-7：CrossPageState 扩展 + 首页跳转链接适配
- **设计决策**:
  - 侧边栏保持 6 项不变，通过角色选择面板承载角色入口——避免导航膨胀，同时保留双域入口的语义
  - 按角色拆分而非按功能拆分——符合 H2.1 三委员双域职责的职权划分，且同一数据源不同切面展示符合 H2.2
  - workspace.html / party.html 保留为入口跳转页（而非删除），确保旧链接兼容
- **结果**: P.1 决策归档完成，7 项衍生任务写入乙部
- **蒸馏标签**: [经验蒸馏: 是 — 大规模架构拆分应先决策方向再分片执行；侧边栏不变+选择面板的方案兼顾导航简洁和功能扩展]

## 2026-05-17 | T47 — 丙部路线图重写 + 甲部丙部写作规范 + T30-10 跨页面刷新

- **来源**: 用户指示（丙部颗粒度改进 + 甲部规范补充 + T30-10）
- **时间**: 2026-05-17
- **变更文件**: CLAUDE.md, cross-page-state.js, workspace-entry.js, main-entry.js
- **关键动作**: T47-1 丙部路线图重写 / T47-2 甲部 H1.7 丙部写作规范 / T47-3 T30-10 跨页面刷新
- **变更详情**:
  - **T47-1: 丙部路线图重写**：
    - `CLAUDE.md` 丙部：P.1 从简单选项表重写为3步路线图（拆不拆→按什么维度拆→首页跳转怎么配合），P.2 从技术方案表重写为3步路线图（带不带状态→状态怎么传→跳转映射表）
    - 核心改变：每一步一个分歧点，选了再往下走；用日常语言描述选项含义和后果；标注"当前状态"和"等待书记选择第几步"
  - **T47-2: 甲部 H1.7 丙部写作规范**：
    - `CLAUDE.md` H1.7 第2节"格式"：从简单选项表模板改为路线图式模板
    - 新增写作原则："丙部的读者是书记，不是 AI 或开发者。必须让书记在 30 秒内理解为什么需要决策和选什么有什么后果"
    - 新增写作禁令：禁止文件路径、禁止技术变量名、禁止3+并列选项不说明选择逻辑
    - 新增写作要求：必须路线图式呈现、必须日常语言、必须标注当前状态
  - **T47-3: T30-10 跨页面刷新**：
    - `cross-page-state.js`：新增 bumpDataVersion() 和 getDataVersion() 方法，使用 localStorage 存储数据版本号
    - `workspace-entry.js`：活动写入成功后调用 CrossPageState.bumpDataVersion()
    - `main-entry.js`：导入 CrossPageState，添加 storage 事件监听（跨标签页实时刷新）和 visibilitychange 事件监听（同标签页返回时刷新）
- **设计决策**:
  - 跨页面刷新使用 dataVersion 机制而非直接传递活动数据，因为活动数据量大且格式复杂，版本号更轻量
  - 同时监听 storage 事件和 visibilitychange 事件，覆盖两种场景：不同标签页打开（storage 事件）和同一标签页切换（visibilitychange）
- **结果**: 3 项任务全部完成，T30-10 标记为已完成
- **蒸馏标签**: [经验蒸馏: 是 — 丙部写作应面向决策者而非开发者，路线图式呈现比选项表更易理解；跨页面数据刷新用版本号机制比传递完整数据更轻量]

## 2026-05-17 | T46 — 丙部写入 + hover 交互增强 + mock 数据显示修复

- **来源**: 用户指示（3项任务）
- **时间**: 2026-05-17
- **变更文件**: CLAUDE.md, main-entry.js, notice.js, mock.js
- **关键动作**: T46-1 丙部写入 / T46-2 hover 交互增强 / T46-3 mock 数据显示修复
- **变更详情**:
  - **T46-1: 丙部写入**：
    - `CLAUDE.md`：写入 P.1（workspace/party 子页面拆分方案，3选项：按角色拆/按功能域拆/保持现状+JS模块化）和 P.2（首页"查看全部"及 Mock 数据点击跳转的目标状态设计，3选项：URL参数/SessionStorage/混合方案）
    - P.2 包含完整的跳转映射表：近期活动→workspace、专班进展→workspace、考勤概况→party、活动条目→workspace+activityId、专班条目→workspace+taskforceId、通知条目→对应模块页
  - **T46-2: hover 交互效果增强**：
    - `main-entry.js`：统计卡片添加 hover:shadow-md + hover:-translate-y-0.5 微浮动效果
    - `main-entry.js`：活动列表添加 hover:shadow-md + hover:border-gray-200 + hover:-translate-y-0.5 + group-hover:text-blue-700 + group-hover:scale-125（圆点放大）+ title tooltip
    - `main-entry.js`：专班列表添加 hover:shadow-sm + group-hover:text-blue-700 + title tooltip
    - `main-entry.js`：考勤行添加 hover:bg-gray-50 + group-hover:text-blue-700 + title tooltip
    - `notice.js`：通知列表添加 hover:shadow-sm + group-hover:text-blue-700 + title tooltip
  - **T46-3: mock 数据显示修复**：
    - `mock.js`：SANDBOX_MODE 下 loadDB() 增加清除 workflowos_notices_v1 和 workflowos_taskforces_v1 的 localStorage，防止旧数据覆盖 MOCK 数据
    - `main-entry.js`：renderDashboard() 增加 activities fallback——当 state.activities 为空时直接使用导入的 ACTIVITIES 数据（绕过 BranchService.listActivities() 的 600ms 延迟和 10% 错误率）
- **设计决策**:
  - hover 效果统一使用 Tailwind group 模式：父元素添加 `group`，子元素用 `group-hover:` 响应
  - 所有可交互行添加 `title` 属性作为原生 tooltip，确保信息可读性
  - activities fallback 优先使用直接导入的 ACTIVITIES 数据，而非等待异步 API 返回，解决首页首次渲染数据为空的问题
- **结果**: 3 项任务全部完成，丙部 P.1/P.2 待书记决策
- **蒸馏标签**: [经验蒸馏: 是 — 异步数据加载的首屏空白问题可通过 fallback 数据源解决；hover 交互效果应统一使用 CSS group 模式而非 JS 事件]

## 2026-05-17 | T45-5 — 首页布局调整：重要通知长条+活动专班并列

- **来源**: 用户指示（布局调整，突出活动和专班是并列概念）
- **时间**: 2026-05-17
- **变更文件**: index.html
- **关键动作**: T45-5 首页布局调整
- **变更详情**:
  - `index.html`：首页布局从"通知+专班并列 → 活动全宽"调整为"通知全宽长条 → 活动+专班并列 → 考勤全宽"
  - 布局逻辑：重要通知独占全宽（长条），近期活动和专班进展并列展示（grid-cols-2），考勤概况独占全宽
  - 设计意图：近期活动与专班进展并列，体现 H2.1 中"活动建设与专班建设是党建工作下的并列概念"
- **设计决策**:
  - 重要通知全宽长条：通知是全局性信息，应横跨整个页面宽度，视觉权重最高
  - 活动+专班并列：两者是党建工作的并列子概念，并列展示比上下堆叠更能传达并列关系
- **结果**: 首页布局调整完成，零浏览器错误
- **蒸馏标签**: [经验蒸馏: 是 — 布局结构可以传达概念关系：并列概念用并列布局（grid-cols-2），从属概念用嵌套布局，全局性信息用全宽布局]

## 2026-05-17 | T45 — 首页数据挂载修复 + 致谢位置调整 + 铃铛设计修复 + feedback header 修复

- **来源**: 用户指示（4项任务）
- **时间**: 2026-05-17
- **变更文件**: services/mock.js, entries/main-entry.js, index.html, about.html, components/header.js, services/notice.js
- **关键动作**: T45-1 铃铛设计修复 / T45-2 feedback header 修复 / T45-3 首页数据挂载修复与增强 / T45-4 致谢位置调整
- **变更详情**:
  - **T45-1: 铃铛按钮设计修复**：
    - `components/header.js`：铃铛按钮改为 40x40px 半透明白色背景+白色边框+白色图标（参考汉堡按钮设计），放最右方（角色切换器和模式切换器之后），通知圆点改为党徽黄 #D4AF37 + border:1.5px solid #7A0010
  - **T45-2: feedback.html header 修复**：
    - `services/notice.js`：NoticeStore.getAll() 添加自动初始化（`if (this._notices.length === 0) this.init()`），确保非主页页面也能正确加载通知数据
  - **T45-3: 首页数据挂载修复与增强**：
    - `services/mock.js`：导入 ACTIVITIES 数据，在 loadDB() SANDBOX_MODE 分支中注入 mockDB.activities（将 mock/activities.js 的 18 条活动数据映射为 domain.js Activity 格式）
    - `entries/main-entry.js`：全量重写，新增 5 个数据渲染函数：
      - `_renderStats()`：4 格统计卡片（本月活动数/活跃专班数/未读通知数/本月出勤率）
      - `_renderActivityList()`：近期活动列表（按类型着色+状态标签+组织者+地点）
      - `_renderTaskforceList()`：专班进展列表（状态标签+进度条+成员填充率）
      - `_renderAttendanceSummary()`：考勤概况（按活动统计出勤/缺勤/请假+出勤率）
      - 修复 `_fmtDate()` 调用：传入 `new Date(a.date)` 而非字符串
    - `index.html`：首页结构从 3 板块（通知+招募+日历摘要）升级为 5 板块（统计卡片+通知+专班进展+近期活动+考勤概况）
  - **T45-4: 致谢位置调整**：
    - `about.html`：将"致谢"卡片从"系统概述"下方移到"系统概述"上方，字体和段落设置完全保留（font-title text-base text-gray-700 leading-loose + text-indent:2em）
- **设计决策**:
  - 首页数据为空的根本原因：mockDB.activities 在 domain.js 中初始化为空数组，而 ACTIVITIES mock 数据从未被注入。修复点在 mock.js 的 loadDB() 函数而非 domain.js，因为 loadDB() 是数据初始化的入口
  - 首页从"信息稀疏"升级为"数据仪表盘"：统计卡片提供全局概览，5 个板块覆盖活动/专班/通知/考勤四大业务域
  - 通知圆点使用党徽黄 #D4AF37 而非红色，因为红色在深色 header 背景上不可见
- **结果**: 4 项任务全部完成，首页展示 18 条活动 + 7 个专班 + 6 条通知 + 36 条考勤数据
- **蒸馏标签**: [经验蒸馏: 是 — mockDB 初始化为空数组是 Mock 数据"存在但不显示"的常见根因；首页数据挂载应系统梳理"什么地方挂载什么数据"，而非零散添加]

## 2026-05-16 | T44 — 通知铃铛 + Mock 数据丰富化

- **来源**: 用户指示
- **时间**: 2026-05-16
- **变更文件**: components/header.js, services/notice.js, mock/activities.js, mock/taskforces.js, mock/notices.js, mock/attendance.js, CLAUDE.md
- **关键动作**: T44-1 通知铃铛 / T44-2 Mock 数据丰富化
- **变更详情**:
  - **T44-1: Header 通知铃铛**：
    - `components/header.js`：新增 `_notificationBellHTML()` 渲染铃铛按钮+未读徽标；新增 `_bindNotificationBell()` 绑定点击展开下拉列表；新增 `_populateNotifDropdown()` 渲染通知列表（按优先级排序，紧急/一般/低）；新增 `_refreshBadge()` 刷新未读数；监听 `notice:new` 自定义事件自动刷新
    - `services/notice.js`：新增 `markRead(id)` 和 `markAllRead()` 方法
    - `mock/notices.js`：6 条通知（2 紧急 + 3 一般 + 1 低），5 条未读 + 1 条已读
  - **T44-2: Mock 数据丰富化**：
    - `mock/activities.js`：7 条 → 18 条，覆盖 7 种活动类型（主题党日/党小组会/支委会/支部党员大会/党课/座谈/参访/共建），4 种状态（completed/published/draft/archived），3 个月份（3-6月）
    - `mock/taskforces.js`：2 条 → 7 条，覆盖 4 种状态（recruiting/active/completed/draft），关联不同活动
    - `mock/attendance.js`：12 条 → 36 条，覆盖更多活动和人员
    - `mock/notices.js`：3 条 → 6 条，增加 read 字段和更多优先级
- **设计决策**:
  - 铃铛位于 Header 最右侧（角色切换器之前），固定显示
  - 未读徽标使用红色圆点+数字（9+ 截断），与品牌色 #CE1126 一致
  - 通知下拉列表按优先级排序（紧急 > 一般 > 低），支持单条已读和全部已读
  - Mock 数据覆盖 H2.2 四维度决策树的所有活动类型，确保不同角色视图有足够的测试数据
- **结果**: T44-1/T44-2 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 通知铃铛是跨角色信息传递的 UI 入口，与 NoticeStore 的 markRead/markAllRead 配合实现已读状态管理；Mock 数据丰富化应覆盖所有业务枚举值（活动类型/专班状态/通知优先级），确保不同角色视图有充分的展示数据]

---

## 2026-05-16 | T43-5 — JS 文件夹重组

## 2026-05-16 | T43-5 — JS 文件夹重组（entries/services/core/modules/components）

- **来源**: 用户指示（仓库 JS 文件分类汇总 + MECE 原则）
- **时间**: 2026-05-16
- **变更文件**: docs/src/ 全目录重组 + 6 个 HTML 文件 + 6 个 content/ 文档
- **删除文件**: 23 个旧位置 JS 文件
- **关键动作**: T43-5 JS 文件夹重组
- **变更详情**:
  - **目录结构重组**：
    - `entries/` — 6 个页面入口（main-entry.js, workspace-entry.js, party-entry.js, archive-entry.js, search-entry.js, feedback-entry.js）
    - `services/` — 7 个服务层文件（auth.js, feedback.js, mock.js, notice.js, roles.js, runtime.js, taskforce.js），去掉 service. 前缀
    - `core/` — 6 个核心基础层文件（constants.js, state.js, utils.js, id.js, domain.js, cross-page-state.js）
    - `modules/` — 2 个业务模块（party.js, references.js）
    - `components/` — 4 个共享 UI 组件（header.js, sidebar.js, calendar.js, inspector.js），扩展自原来的 2 个
    - `mock/` 和 `workflow/` 保持不变
  - **Import 路径更新**：51 处 import 路径转换，涉及所有移动文件
  - **HTML script 标签更新**：6 个 HTML 文件的 script src 路径更新
  - **一改具改**：SOP_WEB.md/CALENDAR.md/ORG_BUILDING.md/DATA.md/DOC_MAP.md/经验沉淀.md 共 46 处旧路径引用更新
- **设计决策**:
  - Entry 文件重命名：main.js → main-entry.js（统一命名规范）
  - Service 文件去前缀：service.auth.js → auth.js（目录名已表明身份）
  - Core 文件保持原名：constants.js/state.js/utils.js 等（目录名已表明身份）
  - Component 扩展：calendar.js 和 inspector.js 从根目录移入 components/
  - Module 归类：party.js 和 references.js 归入 modules/
- **结果**: 全部 23 个文件移动完成，51 处 import 更新，6 个 HTML 更新，46 处文档引用更新，零诊断错误
- **蒸馏标签**: [经验蒸馏: 是 — 大规模文件重组应按"先创建新文件→更新 import→删除旧文件"的顺序执行，避免中间状态导致 import 断裂；import 路径转换应建立完整的映射表后批量执行；文档中的文件路径引用属于一改具改的必要范围，容易遗漏]

---

## 2026-05-16 | T43 — 仓库治理：布局一致性 + 废弃清理 + 常量去重 + Mock 抽离

## 2026-05-16 | T43 — 仓库治理：布局一致性 + 废弃清理 + 常量去重 + Mock 抽离

- **来源**: 用户指示（三大治理任务）
- **时间**: 2026-05-16
- **变更文件**: workspace-entry.js, party-entry.js, service.auth.js, constants.js, mock/index.js, mock/attendance.js, mock/inspection.js, mock/review.js, mock/party.js, mock/notices.js(新建), mock/taskforces.js(新建), service.notice.js, service.taskforce.js, party.js, service.roles.js, CLAUDE.md
- **删除文件**: events.js, assets/.gitkeep, docs/assets/.gitkeep, .ctx/tmp/orig_card_*.html
- **关键动作**: T43-1 布局一致性 / T43-2 废弃清理 / T43-3 常量去重 / T43-4 Mock 抽离
- **变更详情**:
  - **T43-1: 布局宽度一致性修复**：
    - `workspace-entry.js`：新增 `_getContentContainer()` 辅助函数，返回 `.sidebar-main-content .max-w-6xl` 容器；`_showViewCategoryBanner` 和 `_showVisitorObservePanel` 改为插入到 `max-w-6xl` 容器内（而非 `sidebar-main-content` 直接子元素）
    - `party-entry.js`：`_showPartyCategoryBanner` 同样改为插入到 `max-w-6xl` 容器内
  - **T43-2: 废弃文件清理**：
    - 删除 `events.js`（已废弃，无消费者）
    - 删除 `assets/.gitkeep` 和 `docs/assets/.gitkeep`（冗余，目录已有实际内容）
    - 删除 `.ctx/tmp/orig_card_*.html`（临时文件残留）
    - 更新 `service.roles.js` 注释（移除对 events.js 的引用）
  - **T43-3: 常量去重**：
    - `constants.js`：ROLE_LABELS 统一为完整版（含 secretary/commissioner/all），secretary 标签统一为"党支部书记"
    - `service.auth.js`：删除内部 ROLE_LABELS 定义，改为从 `constants.js` 导入
    - `mock/index.js`：新增 `_personName`/`_activityTitle`/`_activityType` 三个公共辅助函数
    - `mock/attendance.js`/`inspection.js`/`review.js`：删除重复的辅助函数，改为从 `index.js` 导入
  - **T43-4: Mock 数据抽离**：
    - 新建 `mock/notices.js`：从 `service.notice.js` 抽离 MOCK_NOTICES
    - 新建 `mock/taskforces.js`：从 `service.taskforce.js` 抽离 MOCK_TASKFORCES
    - `mock/party.js`：新增 CANDIDATE_STAGES/COMPLIANCE_FILES/PUBLICITY_STANDARDS/TEMPLATE_LIST（从 party.js 抽离）
    - `mock/index.js`：导出新增的常量和 Mock 数据
    - `service.notice.js`/`service.taskforce.js`/`party.js`：删除内嵌数据，改为从 `mock/index.js` 导入
- **设计决策**:
  - 布局一致性：所有动态面板/横幅必须插入到 `max-w-6xl` 容器内，确保宽度与 HTML 预定义元素一致
  - 常量权威源：`constants.js` 是 ROLE_LABELS 的唯一权威源，`service.auth.js` 仅导入使用
  - Mock 数据分离：所有 Mock 数据统一存放在 `mock/` 目录，服务层仅保留 CRUD 逻辑
  - Mock helper 去重：`_personName`/`_activityTitle`/`_activityType` 提取到 `mock/index.js`，三文件共享
- **结果**: T43-1~T43-4 全部完成，T43-5（JS 文件夹重组）待下次迭代
- **蒸馏标签**: [经验蒸馏: 是 — 布局宽度不一致的根因是动态创建的 DOM 元素被插入到错误的容器层级；常量去重应遵循"单一权威源"原则（constants.js）；Mock 数据与业务逻辑分离是 C-1 组件化的前置条件；废弃文件（events.js）和冗余占位文件（.gitkeep）应定期清理]

---

## 2026-05-16 | T42-2 — 统一信息流面板 + T42-1 完成

- **来源**: 用户指示（丙部 P.2 决策 A 执行）
- **时间**: 2026-05-16
- **变更文件**: docs/src/workspace-entry.js, CLAUDE.md
- **关键动作**: T42-2 统一信息流面板 / T42-1 角色优先模式完成
- **变更详情**:
  - **T42-2: 统一信息流面板**：
    - `workspace-entry.js`：新增 `_showVisitorObservePanel()` 函数，访客只读模式展示聚合面板
    - 新增 4 个 Tab：活动动态（时间线列表）/ 专班进展（卡片网格+进度条）/ 考勤概况（统计摘要+出勤率）/ 活动日历（保留日历视图）
    - 新增 `_renderVoActivities()`：从 state.activities + ACTIVITIES 获取数据，按日期倒序展示最近10条，显示状态标签
    - 新增 `_renderVoTaskforces()`：从 TaskForceRecordStore 获取活跃专班，区分运行中/招募中，展示成员进度条
    - 新增 `_renderVoAttendance()`：从 ATTENDANCE_RECORDS 统计出勤率，4格统计卡+最近考勤记录表
    - 新增 `_renderVoCalendar()`：展示日历视图
    - 新增 `_renderVoTfCard()`：专班卡片组件（名称+描述+成员数+进度条）
    - 新增 `_hideVisitorObservePanel()`：隐藏面板
    - `_routeRolePanel` 更新：visitor-observe 路由到 `_showVisitorObservePanel()` 而非日历；manage/manager-observe 时调用 `_hideVisitorObservePanel()`
  - **T42-1 完成**：角色优先模式全部实现（自动进入管理模式 + 管理者只读/访客只读区分 + 统一信息流面板）
- **设计决策**:
  - 统一信息流面板 4 Tab 对齐双域管理理论：活动动态+专班进展（党建工作域）、考勤概况（党务工作域）、活动日历（跨域视图）
  - 不同 Tab 使用不同视图类型：时间线列表/卡片网格/统计摘要/日历，体现"不同的工作类型使用的面板视图类型可能是不一样的"
  - 日历保留为独立 Tab，而非替换为其他视图
  - 信息流面板比首页更详细：展示活动状态标签、专班进度条、考勤出勤率统计
- **结果**: T42-1/T42-2/T42-3 全部完成，丙部 P.1~P.3 决策全部落地
- **蒸馏标签**: [经验蒸馏: 是 — 统一信息流面板是"访客只读"模式的工程化落地，Tab划分工作类型体现了双域管理理论的视图差异化；不同Tab使用不同视图类型（列表/卡片/统计/日历）是"不同工作类型使用不同面板视图"的具体实现]

---

## 2026-05-16 | T42 — 全局角色切换器 + 视图模式三分类实施

- **来源**: 用户指示（丙部 P.1~P.3 决策执行）
- **时间**: 2026-05-16
- **变更文件**: docs/src/service.auth.js, docs/src/components/header.js, docs/src/components/sidebar.js, docs/src/workspace-entry.js, docs/src/party-entry.js, content/guides/design/SOP_WEB.md, content/guides/architecture/MANAGEMENT_MODE.md, CLAUDE.md
- **关键动作**: T42-3 全局角色切换器 / T42-1 角色优先模式（部分） / 视图模式三分类
- **变更详情**:
  - **T42-3: 全局角色切换器**：
    - `service.auth.js`：新增 ROLE_LABELS/MODULE_ROLES/AUTHZ_CHAIN 常量；AuthStore 新增 getPrimaryRole/setPrimaryRole/getActiveRole/setActiveRole/getVisibleRoles/getViewCategory/getRoleLabel/getModuleRoles 方法；ViewModeStore 新增 getViewCategory/isReadOnly 方法；导出 ROLE_LABELS/MODULE_ROLES/AUTHZ_CHAIN
    - `header.js`：全量重写，新增全局角色切换下拉选择器（_roleSwitcherHTML + _populateDropdown + _bindRoleSwitcher），下拉列表按"我的身份"/"可查看"分组，角色项显示管理/只读标记；模式切换器根据视图分类显示不同状态（管理模式红色/只读灰色/锁定只读）；新增 header:role-switch 自定义事件派发；新增 sidebar:role-select/sidebar:role-restore 双向同步
    - `sidebar.js`：_selectRole 更新为设置 primaryRole + activeRole + 自动进入管理模式；新增 header:role-switch 事件监听同步 active 卡片
    - `workspace-entry.js`：新增 header:role-switch 事件监听 + _showViewCategoryBanner 函数（管理者只读横幅/访客只读横幅）；_routeRolePanel 更新为根据视图模式三分类路由；view:mode-change 事件处理更新为包含视图分类横幅
    - `party-entry.js`：新增 AuthStore/ViewModeStore 导入 + header:role-switch 事件监听 + _showPartyCategoryBanner 函数
  - **一改具改**：
    - `SOP_WEB.md` B.2：从"管理模式/只读模式架构"更新为"角色优先模式+视图模式三分类架构"，新增视图模式三分类表/AuthStore 新增方法/ViewModeStore 扩展/赋权关系链/模式流转图
    - `MANAGEMENT_MODE.md` 6.3：从"角色切换与权限联动"更新为"Header全局角色切换器+Sidebar双入口"，新增赋权关系链规则
    - `CLAUDE.md` 乙部：T42-3 标记为已完成，T42-1 标记为进行中
- **设计决策**:
  - 角色优先模式：选择角色后自动进入管理模式，无需手动切换（丙部 P.1 决策 A）
  - 视图模式三分类：manage/manager-observe/visitor-observe，区分管理者只读和访客只读
  - 赋权关系链约束：AUTHZ_CHAIN 定义赋权关系，下拉列表按"我的身份"/"可查看"分组
  - Header/Sidebar 双入口同步：header:role-switch 和 sidebar:role-select 双向联动
  - sessionStorage 存储 primaryRole 和 activeRole，跨页面保持一致
- **结果**: T42-3 全局角色切换器完成，T42-1 角色优先模式部分完成（自动进入管理模式已实现，管理者只读/访客只读区分已实现，统一信息流面板待 T42-2 实现）
- **蒸馏标签**: [经验蒸馏: 是 — 赋权关系链(AUTHZ_CHAIN)是角色视图切换的权限基础，应作为核心理论基石(H2.5)维护；视图模式三分类(manage/manager-observe/visitor-observe)是"角色优先"决策的工程化落地；Header/Sidebar 双入口同步需要自定义事件(header:role-switch/sidebar:role-select)实现解耦]

---

## 2026-05-16 | T41 — 丙部写入（视图导航UX） + 专班建设概念确立

- **来源**: 用户指示（视图导航UX问题写入丙部 + 专班建设与活动建设并列概念）
- **时间**: 2026-05-16
- **变更文件**: CLAUDE.md, content/guides/governance/TERMINOLOGY.md, content/guides/design/COMMISSIONER_SYSTEM.md, .ctx/SNAPSHOT.md
- **关键动作**: 丙部P.1~P.3写入 / 专班建设概念确立
- **变更详情**:
  - **CLAUDE.md 丙部**：写入 P.1（视图导航与角色切换UX架构，3选项A/B/C）、P.2（只读面板信息架构，3选项A/B/C）、P.3（角色模拟功能设计，3选项A/B/C）
  - **CLAUDE.md H2.1**：新增"党建工作内部分类"条目——活动建设与专班建设为并列概念；组织委员描述更新为"专班建设（招募统筹·定人定责定岗）"
  - **TERMINOLOGY.md**：1.1核心定义表后新增"党建工作内部分类"声明
  - **COMMISSIONER_SYSTEM.md**：A.4专班制核心定义前新增"概念定位"段落
  - **SNAPSHOT.md**：专班制描述→"专班建设配套的定人定责定岗工作要点"；组织委员→"专班建设（招募统筹·定人定责定岗）"
- **设计决策**:
  - 专班建设与活动建设确立为党建工作下的并列概念，而非上下级关系
  - 专班制定位为专班建设配套的工作要点（定人定责定岗），而非独立概念
  - 视图导航UX问题提交丙部，等待书记决策
- **结果**: 丙部3项待决策事项已写入，专班建设概念已确立并一改具改
- **蒸馏标签**: [经验蒸馏: 是 — 概念体系的并列关系需要显式声明，否则容易在实现中被隐含为上下级关系；UX架构决策应提交用户而非AI自行决定]

---

## 2026-05-16 | T40 — Emoji 全量清除 + T30-1~T30-3 视图实现

- **来源**: 用户指示（Emoji 禁止 + T30-1~T30-3 执行）
- **时间**: 2026-05-16
- **变更文件**: docs/src/workspace-entry.js, docs/workspace.html, docs/src/workflow/definitions.js, docs/src/domain.js, content/guides/architecture/ORG_BUILDING.md, content/guides/architecture/MANAGEMENT_MODE.md, content/guides/design/CALENDAR.md, .github/copilot-instructions.md, .ctx/CONTEXT.md, CLAUDE.md
- **关键动作**: Emoji 全量清除(P0+P1+P2) / T30-1 宣传委员多维表格 / T30-2 党小组组长工作台 / T30-3 活动组织者+深度参与者工作台
- **变更详情**:
  - **Emoji 清除**：
    - workspace-entry.js：新增 SVG 常量对象(people/clipboard/calendar/close)，5处 Emoji→SVG，4处 ✕→SVG.close
    - workspace.html：3处 ✕→内联SVG，7处 ★→CSS::before伪元素
    - definitions.js：3处 ⏸️→（搁置）
    - ORG_BUILDING/MANAGEMENT_MODE/CALENDAR.md：📋📅→纯文本
    - domain.js：JSDoc 📋→纯文本
    - copilot-instructions.md：✅→[Y], ❌→[N], ⚠️→[WARNING]
    - CONTEXT.md：全量 Emoji→纯文本标记
  - **T30-1 宣传委员多维表格**：
    - 新增 `_renderPropMultitable()` 函数，接入 ActivityRecordStore
    - 12字段全显表格 + 全选复选框 + 新增行 + 批量删除 + 行点击展开子记录 + 编辑/删除按钮
    - 子记录三类型（考勤/材料/宣传）添加入口
  - **T30-2 党小组组长工作台**：
    - 新增 `_showLeaderWorkspace()` + 3个Tab（活动写入/考勤上传/考察上传）
    - 活动写入：过滤组长关联活动 + 创建按钮
    - 考勤上传：筛选党小组活动考勤 + 上传按钮
    - 考察上传：筛选党小组活动考察 + 上传按钮
  - **T30-3 活动组织者/深度参与者工作台**：
    - 新增 `_showOrganizerWorkspace()` + 3个Tab（任务分配/复盘提交/考察查看）
    - 复盘提交：展示复盘状态 + 提交按钮 + 等待确认提示
    - 考察查看：组织者只读权限
    - 新增 `_showDeepWorkspace()`：深度参与者任务状态更新面板
- **设计决策**:
  - SVG 图标采用 Lucide 风格（stroke-based, 12x12），与项目设计美学一致
  - 所有角色视图统一 Tab 切换模式，借鉴纪检委员视图的设计美学
  - 党小组组长/活动组织者/深度参与者从日历视图升级为专属工作台
- **结果**: Emoji 全量清除完成，T30-1~T30-3 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — SVG 常量对象是前端 Emoji 替换的标准模式；所有角色统一 Tab 切换是视图范式的一致性保障]

---

## 2026-05-16 | T39 — Emoji 全量清除（P0+P1+P2 三级修复）

- **来源**: 用户指示（不允许使用 Emoji，只允许 SVG 图标）
- **时间**: 2026-05-16
- **变更文件**: docs/src/workspace-entry.js, docs/workspace.html, docs/src/workflow/definitions.js, docs/src/domain.js, content/guides/architecture/ORG_BUILDING.md, content/guides/architecture/MANAGEMENT_MODE.md, content/guides/design/CALENDAR.md, .github/copilot-instructions.md, .ctx/CONTEXT.md
- **关键动作**: P0 网页 Emoji→SVG / P1 文档装饰性 Emoji→纯文本 / P2 [AI]文件 Emoji→[Y]/[N]标记
- **变更详情**:
  - **workspace-entry.js**：
    - 新增 `SVG` 对象（people/clipboard/calendar/close 四个内联 SVG 图标）
    - 5 处 `👥📋📅` → `${SVG.people}/${SVG.clipboard}/${SVG.calendar}`
    - 4 处 `✕` → `${SVG.close}`
  - **workspace.html**：
    - 3 处 `✕` → 内联 SVG close 图标
    - 7 处 `★` → 内联 SVG 星号图标
  - **definitions.js**：
    - 3 处 `⏸️` → `（搁置）`（title/label 字符串）
    - 2 处 `⏸️` → 纯文本（注释/JSDoc）
  - **ORG_BUILDING.md / MANAGEMENT_MODE.md**：`📋 分工声明` → `分工声明`
  - **CALENDAR.md**：`📅 2026年` → `2026年`
  - **domain.js**：JSDoc `📋 目录` → `目录`
  - **copilot-instructions.md**：`✅`→`[Y]`、`❌`→`[N]`、`⚠️`→`[WARNING]`（权限矩阵+周期性任务提醒）
  - **CONTEXT.md**：全量 Emoji→纯文本标记（`✅`→`[Y]`、`❌`→`[N]`、`🔄`→`[重构]`、`🔧`→`[修改]`、`🗑️`→`[删除]`、`➕`→`[新增]`、`⚠️`→`[WARNING]`、`🔴`→`[P0]`、`🟡`→`[P1]`、`🟠`→`[P2]`）
- **设计决策**:
  - SVG 图标采用 Lucide 风格（stroke-based, 12x12），与项目设计美学一致
  - [AI] 角色文件用 `[Y]/[N]/[WARNING]` 替代 Emoji，符合 EMOJI_POLICY §3.3
  - ★ 必填标记改为 SVG 星号，视觉更清晰
- **结果**: 全仓库 JS/HTML 文件零 Emoji，MD 文件装饰性 Emoji 已清除，[AI] 文件 Emoji 已替换为纯文本标记
- **蒸馏标签**: [经验蒸馏: 是 — SVG 图标常量对象是前端 Emoji 替换的标准模式；EMOJI_POLICY 的三级修复策略（P0网页/P1文档/P2 AI文件）值得复用]

---

## 2026-05-16 | T38 — Mock 数据架构 + 视图统一 + Long/Wide 切换

- **来源**: 用户指示（Mock 数据独立文件夹 + 角色视图 Tab 切换 + Long/Wide 视图切换）
- **时间**: 2026-05-16
- **变更文件**: docs/src/mock/（新建7文件）, docs/src/workspace-entry.js, docs/src/party.js, CLAUDE.md
- **关键动作**: Mock 数据架构重构 / 三委员视图统一 Tab 模式 / Long/Wide 切换
- **变更详情**:
  - **新建 `docs/src/mock/` 文件夹**（7 个文件）：
    - `people.js`：12 人共享数据源（id/name/studentId/partyGroup/developStage/roles）
    - `activities.js`：7 个活动共享数据源（id/title/date/type/organizer/direction）
    - `attendance.js`：12 条考勤记录 + `attendanceToLong()` + `attendanceToWide()` 转换函数
    - `inspection.js`：6 条考察记录 + `inspectionToLong()` + `inspectionToWide()` 转换函数
    - `review.js`：2 条活动复盘 + 1 条专班复盘 + `reviewToDisplay()` 转换函数
    - `kanban.js`：看板卡片 Mock（tf/prop/disc 三组）
    - `party.js`：党务面板 Mock（candidates/makeupTasks/feedbackItems）
    - `index.js`：统一导出
  - **workspace-entry.js**：
    - 删除硬编码 `COMMISSIONER_MOCKS`/`DISC_MOCK_ATTENDANCE`/`DISC_MOCK_INSPECTION`/`DISC_MOCK_REVIEW`（约 90 行）
    - 新增 `import { KANBAN_MOCKS, ATTENDANCE_RECORDS, ... } from './mock/index.js'`
    - 组织委员：`_showOrgTaskForceView()` → `_renderOrgWorkspaceView()`（Tab 切换：专班管理/追踪看板）
    - 宣传委员：`_showCommActivityView()` → Tab 切换（活动与专班/宣传专班工作量）
    - 考勤面板：新增 Long/Wide 视图切换按钮（Long=逐条记录，Wide=人×活动矩阵）
    - 考察面板：新增 Long/Wide 视图切换按钮
    - `_showPropWorkloadPanel()` 适配 Tab 模式（渲染到 `comm-tab-content`）
  - **party.js**：
    - 新增 `import { PARTY_MOCKS } from './mock/index.js'`
    - `loadAll()` 改为引用 `PARTY_MOCKS.candidates/makeupTasks/feedbackItems`
    - 删除 `_mockCandidates()`/`_mockMakeupTasks()`/`_mockFeedbackItems()` 三个工厂函数（约 30 行）
- **设计决策**:
  - Mock 数据分层：people（最底层）→ activities（第二层）→ attendance/inspection/review（第三层，引用 people + activities）
  - 数据共享：考勤/考察/复盘都引用同一个 people 和 activities 数据源，但各自有不同的生命周期（考勤确认状态 vs 考察确认状态 vs 复盘三态流转）
  - Long/Wide 切换：Long 格式每行一条记录（人×活动），Wide 格式行为人、列为活动、值为状态，适合查特定人的全量出勤
  - 三委员视图统一 Tab 模式：借鉴纪检委员视图的设计美学（干净的颜色使用 + Tab 切换），组织委员和宣传委员也改为 Tab 切换
- **结果**: Mock 数据架构重构完成，三委员视图统一为 Tab 切换模式，考勤/考察支持 Long/Wide 切换
- **蒸馏标签**: [经验蒸馏: 是 — Mock 数据分层架构是前端工程化的基础模式；Long/Wide 切换是数据查询的通用需求；Tab 切换是角色视图的统一范式]

---

## 2026-05-16 | T37 — 纪检委员职权全量更新（考勤·考察·活动监督复盘）

- **来源**: 用户指示（严格按用户提供内容更新纪检委员职权，一改具改）
- **时间**: 2026-05-16
- **变更文件**: content/SOP/纪检委员工作流程指南.md, content/guides/design/COMMISSIONER_SYSTEM.md, content/guides/architecture/MANAGEMENT_MODE.md, content/guides/architecture/DATA.md, content/guides/architecture/ORG_BUILDING.md, content/insights/党支部管理与实务经验沉淀.md, docs/src/workspace-entry.js, docs/workspace.html, docs/party.html, docs/src/party.js, docs/src/workflow/sopData.js, .github/copilot-instructions.md, .ctx/SNAPSHOT.md, CLAUDE.md
- **关键动作**: T30-4 纪检委员职权更新 / 一改具改全仓库同步
- **变更详情**:
  - **SOP 母本更新**（上一轮已完成）：`纪检委员工作流程指南.md` v4.0→v5.0，新增§一考勤管理/§二考察管理/§三活动监督复盘
  - **COMMISSIONER_SYSTEM.md**：
    - B.1 职责域：`补课跟踪/公邮提醒/参与汇总→组织委员/考勤汇总→宣传委员/复盘督办` → `考勤管理/考察管理/活动监督复盘/补课制度/公邮管理`
    - C.1 权限矩阵：新增考勤管理（6行）、考察管理（9行）、活动监督复盘（6行）三大权限块
    - D.3 面板子Tab：`补课跟踪/公邮提醒/参与汇总/复盘督办` → `考勤管理/考察管理/活动监督复盘/补课制度/公邮管理`
    - E.1 月度闭环：`参与汇总→组织委员` → `考勤→宣传委员 + 考察→支委会`
    - E.2 数据交接：新增组织→纪检（专班名单同步）、纪检→组织（考察记录）
    - F.2 时序表/协调清单：更新纪检角色描述
  - **MANAGEMENT_MODE.md**：
    - §8.2 视图矩阵：`活动视图+考勤面板` → `考勤管理·考察管理·活动监督复盘`
    - §6.2.2 督办面板 → 考勤·考察·监督复盘面板（完整 ASCII 线框图）
    - §8.4 视图组件：新增考勤总表/考察总表/活动监督复盘三行
    - §二 角色权限矩阵：`汇总` → `考察汇总`
    - §二 职能域流转模型：`复盘督办` → `考勤确认+考察确认/复盘监督（批注/打回/确认）`
  - **DATA.md**：纪检委员面板描述 → `补课制度、公邮管理`
  - **ORG_BUILDING.md**：党务管理子Tab/描述/函数签名同步更新
  - **insights**：纪检委员维度标签 → `考勤确认、考察确认、复盘监督`
  - **workspace-entry.js**：
    - 新增 DISC_MOCK_ATTENDANCE/DISC_MOCK_INSPECTION/DISC_MOCK_REVIEW 三组 Mock 数据
    - 新增 `_showDiscWorkspaceView()` 纪检委员专属工作台入口
    - 新增 `_renderDiscAttendanceContent()` 考勤管理面板（考勤总表+上传+超期提醒+提交至宣传委员）
    - 新增 `_renderDiscInspectionContent()` 考察管理面板（考察总表+类别标签+上传+超期提醒+提交至支委会）
    - 新增 `_renderDiscReviewContent()` 活动监督复盘面板（时间流阅览+超时邮件提醒+复盘三态流转：批注/打回/确认）
    - `_showCommissionerKanban()` 路由：disc-commissioner → `_showDiscWorkspaceView()`
    - 头部描述：`考勤考察·补课管理` → `考勤·考察·监督复盘`
  - **workspace.html**：新增 `disc-workspace-view` 容器；模态框描述更新
  - **party.html**：纪检委员党务面板从4 Tab精简为2 Tab（补课制度+公邮管理），移除出勤汇总和复盘督办
  - **party.js**：`refreshCommissionerPanel('inspector')` 不再调用 `refreshParticipationSummary()` 和 `refreshReviewSupervision()`，函数保留备用
  - **sopData.js**：工作流步骤更新（1b-5/1b-6a/1b-6b/1b-7c/1b-7b），新增考勤确认和考察确认步骤
  - **copilot-instructions.md**：纪检委员角色描述/权限矩阵/侧边栏模块/职能域描述全量更新
  - **SNAPSHOT.md**：权限矩阵摘要更新
  - **CLAUDE.md**：H2.1 三委员双域职责表/关键判例/T30-4 描述更新
- **设计决策**:
  - 纪检委员党建工作台从通用"活动与专班视图"升级为专属三Tab工作台（考勤管理/考察管理/活动监督复盘），与组织委员的专班看板、宣传委员的活动视图形成差异化
  - 党务管理面板精简为2 Tab（补课制度+公邮管理），参与汇总和复盘督办迁移至党建工作台
  - 复盘三态流转：已上传→批注中→确认（录入后台，活动结束）/打回（重新提交）
  - 考察类别标签自动填入：党小组活动→"党小组"标签，专班→"专班"标签
- **结果**: 纪检委员职权全量更新完成，一改具改检查通过（全仓库零旧版表述残留）
- **蒸馏标签**: [经验蒸馏: 是 — 纪检委员职权从"监督+汇总"升级为"确认+录入+监督"三段式，体现了双域管理理论中党建工作的"创新探索"定位]

---

## 2026-05-16 | T36 — T30-5/T30-6/T30-8/T30-9 完成

- **来源**: 用户指示（继续执行 T30-5~T30-6 + T30-8~T30-9）
- **时间**: 2026-05-16
- **变更文件**: docs/src/workspace-entry.js, docs/workspace.html, CLAUDE.md
- **关键动作**: T30-5 宣传工作量面板 / T30-6 通用专班需求流程 / T30-8 T30-9 确认已实现
- **变更详情**:
  - **T30-5 宣传专班工作量面板**：
    - `workspace-entry.js`：新增 `_showPropWorkloadPanel()`，从 TaskForceRecordStore 筛选宣传相关专班，统计成员贡献（产出数/专班数/角色）
    - `workspace.html`：新增 `prop-workload-panel` 容器
  - **T30-6 通用专班创建/解散流程**：
    - `workspace-entry.js`：新增 `_showTfRequestForm()`，宣传/纪检委员可发起专班需求（status: pending_review）
    - `workspace-entry.js`：组织委员看板新增"待审核"列（`kanban-tf-pending-review`），支持审核通过（→recruiting）和驳回（→rejected）
    - `workspace.html`：专班看板从 2 列改为 3 列（待审核/招募中/运行中），宣传委员视图新增"发起专班需求"按钮和需求表单
  - **T30-8 TaskForceRecord 持久化**：确认已实现（service.taskforce.js 使用 localStorage）
  - **T30-9 Notice 持久化**：确认已实现（service.notice.js 使用 localStorage）
  - **乙部清理**：T30-5/T30-6/T30-8/T30-9 从乙部删除，T30-7/T32-1 从 P1 删除
- **设计决策**:
  - 专班需求流程：非组织委员发起需求 → pending_review → 组织委员审核通过 → recruiting → 招募 → active → dissolved
  - 宣传工作量面板：从 Store 筛选宣传相关专班，按成员聚合统计
- **结果**: T30-5/T30-6/T30-8/T30-9 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 专班需求流程实现了"条条支委提出需求→组织委员审核"的条块衔接规则（H2.3）]

---

## 2026-05-16 | T35 — T30-7 补全 + T32-1 验证 + SNAPSHOT/丙部修正

- **来源**: 用户指示（继续执行 T30-7 + T32-1 + SNAPSHOT 修正 + Decision Log 写入者修正）
- **时间**: 2026-05-16
- **变更文件**: docs/workspace.html, docs/src/workspace-entry.js, .ctx/SNAPSHOT.md, CLAUDE.md
- **关键动作**: T30-7 补全 / T32-1 验证 / SNAPSHOT 充实 / Decision Log 写入者修正
- **变更详情**:
  - **T30-7 补全**：
    - `workspace.html`：专班发布表单从 4 字段（name/count/skill/duration）更新为 5 字段（name/capacity/initiator/deadline/task），与 TaskForceRecordStore 数据结构对齐
    - `workspace-entry.js`：招募成员从 `prompt()` 升级为内联表单（姓名+角色选择+加入/取消按钮）
    - `workspace-entry.js`：解散专班增加确认步骤（红色确认面板+确认/取消按钮），替代直接解散
  - **T32-1 验证**：
    - 确认 `_routeRolePanel` 路由逻辑：组织委员选择管理模式 → `_showCommissionerKanban('org-commissioner')` → `_showOrgTaskForceView()` → 展示专班协调看板（非日历）
    - T32-1 核心需求已在 T30-7 中实现，标记为已完成
  - **SNAPSHOT 修正**：
    - `.ctx/SNAPSHOT.md`：从 5 节扩充为 6 节，新增 III.核心文件清单（治理文件表+前端代码表）
    - I.全局物理拓扑：逐文件展开（SOP 6 文件、guides 15 文件按子目录逐个列出、.github/.ctx 子项展开）
    - `CLAUDE.md` H1.5：格式规范标注🔴强制（I+II 为强制最低要求），新增 III.核心文件清单
  - **Decision Log 写入者修正**：
    - H1.7 丙部与日志关系表：`书记（或经授权的 AI）` → `AI（记录书记的决策）`
    - H6.1 执行日志与决策日志权责划分表：同步修正
- **设计决策**:
  - 招募 UI 从 prompt() 升级为内联表单：避免浏览器原生弹窗阻断体验，支持角色选择
  - 解散 UI 增加确认步骤：防止误操作，符合"赋权回收"的严肃性
- **结果**: T30-7 完成、T32-1 完成、SNAPSHOT 格式规范化、Decision Log 写入者修正
- **蒸馏标签**: [经验蒸馏: 是 — prompt()→内联表单是 UI 升级的通用模式；SNAPSHOT 的 I+II 是不可妥协的最低标准]

---
## 2026-05-16 | T34 — SNAPSHOT 修复 + README 双职能 + 丙部待决策机制

- **来源**: 用户指示（SNAPSHOT 结构混乱 + README 双职能 + 丙部待决策模块）
- **时间**: 2026-05-16
- **变更文件**: .ctx/SNAPSHOT.md, README.md, CLAUDE.md
- **关键动作**: T34 SNAPSHOT/README/丙部三件套
- **变更详情**:
  - **SNAPSHOT.md 修复**：
    - `.ctx/SNAPSHOT.md`：从混乱结构恢复为 v3 格式（I.全局物理拓扑/II.分层架构/III.核心理论/IV.权限矩阵摘要/V.版本里程碑），版本升级至 v7
    - `CLAUDE.md` H1.5：新增 Snapshot 格式规范（5 节结构，不得自创）
  - **README.md 双职能重写**：
    - 一、产品介绍（面向使用者）：核心价值/双域架构/新人上手/角色导航/支委分工
    - 二、系统设计（面向开发者）：仓库结构/前中后台架构/数据变更铁律/Agent 集群
    - 三、知识库导航/四、迭代路线图/五、开源协作
  - **丙部待决策机制（H1.7）**：
    - `CLAUDE.md` 甲部新增 H1.7：定义丙部的写入条件/格式/生命周期/与日志关系/与乙部关系
    - `CLAUDE.md` 乙部之后新增丙部正文区域
    - 丙部条目编号：P.<序号>
    - 生命周期：写入 → next_prompt 提交 → 书记决策 → Decision Log 归档 → 执行 → 从丙部删除
    - next_prompt 强制包含丙部未决事项
- **设计决策**:
  - 丙部与 Decision Log 的区分：丙部=待决策（决策前），Decision Log=已决策（决策时），时序不同
  - 丙部与乙部的关系：互为上下游，丙部→决策→乙部→执行→可能发现新丙部条目
  - README 双职能分区：使用者看"一"、开发者看"二"，互不干扰
- **结果**: SNAPSHOT 格式规范化；README 双职能完成；丙部机制建立
- **蒸馏标签**: [经验蒸馏: 是 — 丙部填补了"AI 不敢决定"的空白：乙部管执行、丙部管决策、日志管记录，三者形成完整闭环]

---

## 2026-05-16 | T33 — 仓库文件定位修复 + T30-7 赋权面板重构

- **来源**: 用户指示（FEEDBACK_FORM 归属 + 全仓库错位/重复文件排查 + T30-7 执行）
- **时间**: 2026-05-16
- **变更文件**: CLAUDE.md, content/guides/feedback/→content/references/模板库/, content/SOP/Org_OS_极客操作手册.md→content/guides/governance/AGENT_HANDBOOK.md, content/SOP/README.md(删除), docs/src/workspace-entry.js, content/guides/README.md, content/README.md, content/references/README.md, content/guides/architecture/ORG_BUILDING.md, 全仓库 11 处引用更新
- **关键动作**: T33 仓库文件定位修复 / T30-7 赋权面板重构
- **变更详情**:
  - **仓库文件定位修复（5 项）**：
    - `FEEDBACK_FORM.md`：从 guides/feedback/ 移至 references/模板库/（type: reference→template），删除空 feedback 文件夹
    - `Org_OS_极客操作手册.md`：从 content/SOP/ 移至 guides/governance/ 并重命名为 AGENT_HANDBOOK.md（type: SOP→governance）
    - `content/SOP/README.md`：删除（与 INDEX.md 重复，违反 H7.2 唯一索引原则）
    - `content/README.md`：更新（移除过时的 POLICY/DECISION 目录引用）
    - `ORG_BUILDING.md`：删除过时注释（"文件名 ORGANIZATION_BUILDING_MODULE 为历史遗留"）
    - 全仓库 11 处引用一改具改，零残留验证通过
  - **T30-7 赋权面板重构**：
    - `workspace-entry.js`：组织委员专班看板从硬编码 Mock 数据接入 TaskForceRecordStore
    - 新增 `_renderTfFromStore()`：从 Store 渲染专班卡片（支持 recruiting/active/dissolved/completed 四状态）
    - 新增 `_bindTfDetailFromStore()`：点击卡片展示详情面板（成员列表+招募成员+解散专班）
    - 专班发布表单接入 `TaskForceRecordStore.add()`（支持 name/task/capacity/deadline/initiator）
    - 招募成员接入 `TaskForceRecordStore.addMember()`
    - 解散专班接入 `TaskForceRecordStore.update({ status: 'dissolved' })`
- **设计决策**:
  - FEEDBACK_FORM 归属判断：它不是设计理念（guides），而是可填写表单模板（references/模板库）
  - 极客操作手册归属判断：内容是 Agent 使用流程，不是支部工作流程（SOP），归入 guides/governance/
  - 专班看板数据源从 Mock 迁移到 Store，保持向后兼容（旧 _renderTfCol 仍用于宣传/纪检看板）
- **结果**: 仓库文件定位全部合规；T30-7 核心功能已实现（专班看板+招募+解散接入 Store），状态更新为 🔄 进行中
- **蒸馏标签**: [经验蒸馏: 是 — 文件定位三问法：(1)它代表设计理念吗？→guides (2)它是工作流程吗？→SOP (3)它是可复用模板/参考吗？→references；专班看板必须接入 Store 而非硬编码 Mock]

---

## 2026-05-16 | T32 — 甲部编号修复 + Guides 重命名 + 组织委员落地检查

- **来源**: 用户指示（编号混乱 + Guides 文件名优化 + 组织委员落地检查）
- **时间**: 2026-05-16
- **变更文件**: CLAUDE.md, content/guides/ 下 10 个文件重命名, 21 个文件引用更新
- **关键动作**: T32-1 甲部编号修复 / Guides 文件重命名一改具改 / 组织委员落地检查+乙部规划
- **变更详情**:
  - **甲部编号修复**：
    - `CLAUDE.md` H1: H1.2a→H1.3, H1.3→H1.4, H1.4→H1.5, H1.5→H1.6（消除非法编号格式）
    - `CLAUDE.md` 乙部: T30-17→T30-16（消除跳号）
    - `CLAUDE.md` H5.1: 更新编号语义对照表
  - **Guides 文件重命名（10 个文件）**：
    - `TERMINOLOGY_STANDARDS.md` → `TERMINOLOGY.md`
    - `DOCUMENTATION_MAP.md` → `DOC_MAP.md`
    - `RECURRING_TASKS_MECHANISM.md` → `RECURRING_TASKS.md`
    - `DATA_ARCHITECTURE.md` → `DATA.md`
    - `MANAGEMENT_MODE_ARCHITECTURE.md` → `MANAGEMENT_MODE.md`
    - `ORGANIZATION_BUILDING_MODULE.md` → `ORG_BUILDING.md`
    - `COMMISSIONER_SYSTEM_DESIGN.md` → `COMMISSIONER_SYSTEM.md`
    - `SOP_WEB_GUIDE.md` → `SOP_WEB.md`
    - `CALENDAR_DESIGN.md` → `CALENDAR.md`
    - `SOP优化提案反馈卡.md` → `FEEDBACK_FORM.md`
    - 全仓库 21 个文件共 168 处引用已一改具改，零残留验证通过
  - **组织委员落地检查**：
    - 已落地：党务管理面板（发展党员看板/材料催缴/思想汇报/合规文件）
    - 未落地：党建工作台专班协调看板 → 新增 T32-1 到乙部 P1
- **设计决策**:
  - 文件重命名策略：文件夹已提供分类上下文，文件名去掉冗余后缀（ARCHITECTURE/DESIGN/GUIDE/STANDARDS 等），保持大写+下划线风格
  - 中文文件名 `SOP优化提案反馈卡.md` 改为英文 `FEEDBACK_FORM.md`，提升跨平台兼容性
- **结果**: 甲部编号规范修复完成；Guides 文件名精简完成；组织委员缺失功能已规划入乙部
- **蒸馏标签**: [经验蒸馏: 是 — 文件夹分类后文件名可去冗余；编号格式必须严格遵循 H5.1 规则，非法格式（如 2a）必须修正]

---
## 2026-05-16 | T31 — 甲部 H2 瘦身 + 标准化工作流重构

- **来源**: 用户指示（甲部臃肿导致上下文丢失 + 标准化工作流规则模糊）
- **时间**: 2026-05-16
- **变更文件**: CLAUDE.md, content/guides/architecture/MANAGEMENT_MODE_ARCHITECTURE.md, content/guides/design/COMMISSIONER_SYSTEM_DESIGN.md, content/guides/architecture/DATA_ARCHITECTURE.md
- **关键动作**: T31-1 甲部 H2 瘦身 + 标准化工作流🔴🟡🟢标记
- **变更详情**:
  - **T31-1: 甲部 H2 核心理论基石瘦身**：
    - `CLAUDE.md` H2: 从~176行瘦身至~63行（-64%），仅保留核心原则+判例+引用链接
    - `MANAGEMENT_MODE_ARCHITECTURE.md` §八: 新增8.1~8.8完整差异化视图设计规范（双域视图矩阵/7色系/视图组件规范/子记录结构/四维度决策树/默认面板原则/宣传专班备注）
    - `COMMISSIONER_SYSTEM_DESIGN.md` §A.3~A.8: 新增完整专班制内容（条块二元结构/核心定义/专班类型矩阵/条块衔接规则/生命周期/双域管理升级注）
    - `DATA_ARCHITECTURE.md` §2.1B: 新增子记录关联结构（树形关联/类型定义/关键规则/与现有数据关系）
  - **标准化工作流重构**：
    - `CLAUDE.md` H1: 为每个子节添加执行优先级标记
    - 🔴必执行: H1.1审查、H1.2a甲部修改、H1.5乙部生命周期
    - 🟡条件执行: H1.2执行（Step5为强制）、H1.3钩稽联动
    - 🟢特定触发: H1.4 Snapshot更新
- **设计决策**:
  - H2 瘦身策略：甲部保留"核心原则+判例"（宪法层），详细设计归 guides（法律层），AI 按需读取链接文件减少上下文占用
  - 工作流标记策略：用🔴🟡🟢视觉标记区分执行优先级，消除"每次必须执行"与"条件执行"的模糊性
- **结果**: H2 占比从~29%降至~10%；信息零丢失（所有详细内容完整写入3个guides文件）；T31-1从乙部删除
- **蒸馏标签**: [经验蒸馏: 是 — 甲部瘦身模式可推广：甲部=核心原则+判例+链接，guides=详细设计，AI按需读取]

---

## 2026-05-03 | 经验沉淀 + 文档精简约简 + 侧边栏bug修复

- **来源**: 用户三项任务指示 + Agent 执行
- **时间**: 2026-05-03（第4轮）
- **变更文件**: .github/copilot-instructions.md, CLAUDE.md, src/events.js, .ctx/CONTEXT.md(§8.3)
- **关键动作**: T1系统性经验蒸馏 / T2 CLAUDE.md精简约简 / T3侧边栏「条条支委」点击后收拢bug修复
- **变更详情**:
  - **T1: 系统性经验沉淀**：
    - `.github/copilot-instructions.md` 新增`## 经验沉淀知识库`完整章节（~70行）：
      - ★理论创新一：活动管理四维度框架（时长×品牌×发起方向×子类型）——党支部数字化管理元模型
      - ★理论创新二：「写入」机制——活动从草稿→正式的身份转换仪式
      - ★理论创新三：多维表格数据模型（12字段+子记录关联结构）
      - ★设计模式沉淀表（6项模式含原因）
      - ★上下文连续性方案（三层防护）
      - ★关键经验教训（4条）
  - **T2: 文档精简约简**：
    - `CLAUDE.md §C1.1.7`：具体化任务目标（activity-type-input读取+四维度写入+赋权持久化）
    - `CLAUDE.md §C1.1.9`：标记✅完成，指向§C1.9详规
    - `CLAUDE.md §C1.2`：品牌活动从11行（含5子任务表格）→3行（搁置摘要）
    - `CLAUDE.md §C1.7`：三维度知识沉淀从20行→3行（"详见§C1.9"）
    - `CLAUDE.md §C2`："嵌套视图"→"弹窗选择"修正
    - `CLAUDE.md` "常为新"原则修正（已完成→保留简写供上下文）
    - 净精简约40行冗余内容
  - **T3: 侧边栏bug修复**：
    - `src/events.js`：`commissioner-group` 处理函数在 `modal.classList.remove('hidden')` 前添加 `closeSidebar()` 调用
    - 根因：点击条条支委→弹窗模态框显示，但侧边栏未自动收回（`return;` 提前退出，跳过了后面的 `closeSidebar()`）
    - 修复：在 `return;` 前显式调用 `closeSidebar()`，无论弹窗展开还是收起都先关侧边栏
- **设计决策**:
  - 经验沉淀写入 copilot-instructions.md 而非创建新文件——遵循"不创造过多文件"原则，且该文件为 AI 永久上下文
  - CLAUDE.md 的 "常为新" 原则从"彻底删除已完成"修正为"保留简写摘要"——实操中需要已完成项作为上下文锚点，否则新会话无法理解项目状态
- **结果**: 3项任务全部完成，零诊断错误，净增经验知识~70行，净减冗余~40行
- **蒸馏标签**: [经验蒸馏: 是 — 本次本身即蒸馏闭环] — 双维度视图规范（角色×活动类型）→ copilot-instructions 永久知识；CLAUDE.md 改写经验：已完成项不可全删，需保留一行摘要供上下文恢复

---

## 2026-05-03 | 六联任务执行（弹窗收回+多维表格+关联结构+虚假数据修正+视图方案+下一步建议）

- **来源**: 用户六项任务指示（含截图参考） + Agent 执行
- **时间**: 2026-05-03
- **变更文件**: src/events.js, src/styles.css, src/party.js, CLAUDE.md
- **关键动作**: T1弹窗toggle/T2宣传委员12字段多维表格/T3子记录关联结构/T4虚假数据全替换/T5双维度视图规范
- **变更详情**:
  - **T1: 条条支委弹窗即时收回**：
    - `src/events.js`: commissioner-group点击→检测modal是否已显示，已显示则收回（toggle），未显示则展开；CSS transition opacity/visibility确保<300ms平滑
    - `src/styles.css`: #commissioner-modal 新增 transition 规则（opacity 0.2s + visibility 延迟）
  - **T2: 宣传委员多维表格（基于用户截图）**：
    - `src/party.js`: import ActivityRecordStore; _ensureStore()初始化; refreshArchives()完全重写为12字段真实表格(☐ # 名称 主题 描述 🔗链接 📅时间 ✨类型 ✨领导 📷照片 填写人 +); 全选/新增行/编辑/删除事件绑定; 行点击展开子记录
    - `src/styles.css`: 新增 .pub-table-wrap/.pub-table/.pub-th/.pub-row/.pub-cell-name/desc/link/type-badge/.pub-row-actions 等全套CSS(~130行)
    - 数据来源: activityRecord.js MOCK_RECORDS (12条真实数据，含安佳晨填写人、真实活动名称如"光华管理学院党委迎新士生党支部与...")
  - **T3: 活动关联结构—主记录+子记录**：
    - `src/party.js`: _showSubRecords(recordId)方法实现——点击行展开子记录区，显示3种子记录类型(考勤/材料/宣传)，每种有"+添加"按钮；subRecords[]数组结构设计
  - **T4: 虚假数据修正**：
    - COMPLIANCE_FILES: 6个虚假PDF路径→#search跳转资料查询模块+note提示
    - 合规文件渲染器: 区分isSearchLink分支，搜索链接显示"前往资料查询→"按钮
    - refreshParticipationSummary(): 张三李四王五假名→store真实统计(活动数/填写人/类型覆盖)
    - refreshMaterialRemind(): 张三李四假名假材料→store不完整记录筛选
    - refreshReviewSupervision(): 假复盘问题→store最近5条活动列表+新增复盘按钮
    - refreshWeeklyReport(): 假周报状态→store本月活动统计+生成周报按钮
  - **T5: 双维度视图规范**：
    - `CLAUDE.md §C1.9`: 完整重写为4个子节(A角色维度8角色×权限/B活动类型维度7色系/C视图组件规范5种/D子记录关联结构图)
- **设计决策**:
  - 多维表格直接基于用户提供的截图实现——12字段完全匹配（名称/主题/描述/推送链接/时间/类型/出席领导/领导照片/填写人），这是用户在共享文档中实际使用的结构
  - 所有party.js面板的Mock数据统一替换为ActivityRecordStore真实数据源——消除张三/李四/王五等虚构名称
  - 合规文件路径从虚假本地文件引用改为跳转资料查询模块——建立正确的跨模块引用关系
- **结果**: 6项任务全部完成，零诊断错误，净增~200行有效代码（表格+CSS），消除全部虚构数据
- **蒸馏标签**: [经验蒸馏: 是] — 宣传委员多维表格是从实践中提炼的重大理论创新的具体落地；双维度视图规范（角色×活动类型）是系统架构的核心设计文档

---

## 2026-05-03 | 四联任务执行（C2同步+模块合并+后台可视化+三步走计划）

- **来源**: 用户四项任务指示（含修订） + Agent 执行
- **时间**: 2026-05-03
- **变更文件**: CLAUDE.md, index.html, src/styles.css, src/main.js, src/events.js, src/inspector.js
- **关键动作**: T1 C2板块全量审查同步 / T2 模板+参考→资料查询合并 / T3 管理视图角色标签+支委弹窗 / T4 三步走开发计划
- **变更详情**:
  - **T1: C2板块全面审查同步**：
    - `CLAUDE.md §C2`：重写为功能更新清单（D1~D5逐项状态+网页可见性）+ 已实现但未反映功能（8项）+ 测试验证报告（5项测试）
    - C2.D1.2 证实已完成，其余全部未启动
  - **T2: 模块合并**：
    - `index.html`：移除「模板与资产」module-tab + 移除 `#view-templates` 完整 section（56行虚假模板卡片）+ 移除 `#sidebar-templates-menu`；「参考资料」module-tab →「资料查询」；`#view-references` → `#view-search`
    - `src/main.js`：移除 `tplMenu` / `viewTpl` / `viewRefs` 引用；`'references'` → `'search'`；views 数组从5项→4项
    - `src/events.js`：module-tab 处理新增 `'search'` 分支
    - **关于用户问**："一个仓库只能形成一个网页吗？"——答：否。GitHub Pages 支持多 HTML 页面发布，同一仓库可部署任意数量页面（如 `/reference.html`、`/templates.html` 等）。当前项目为 SPA 架构，通过 JS 路由切换而非物理多页面。
  - **T3: 后台结构可视化优化**：
    - T3a: `src/inspector.js` 新增 mgrLabels 映射（7角色） + `.inspector-role-banner` 渲染（管理视图详情页展示角色身份标签）；`src/styles.css` 新增按角色着色（org蓝/prop绿/disc琥珀/secretary红）
    - T3b: 全库 grep 搜索「宣传素材整理结构」——**零匹配。如实回报：此设计文档/结构不存在。** 现有宣传委员面板（档案归档/材料标准/模板管理/周报报送）已可用。
    - T3c: `index.html` 移除 `.commissioner-chevron` + `#commissioner-sub-views` 完整区块（50行）；新增 `#commissioner-modal` 弹窗（3选项按钮含图标+描述）；`src/styles.css` 移除 sub-views/chevron/sub-card CSS（70行）→ 新增 .comm-modal-option/comm-modal-icon/comm-modal-text CSS；`src/events.js` commissioner-group 点击→模态框显示；新增 close/backdrop-click/option-select 事件处理
  - **T4: 三步走开发计划**：
    - `CLAUDE.md §G`：重写为三步执行计划（第一步C1.1.7补全4子任务 / 第二步C1.1.8党支书全视图4子任务 / 第三步DESIGN-OPT Phase D1 4子任务）+ 时间线+资源分配+进度跟踪机制
- **设计决策**:
  - 模板与资产板块移除的原因为"无真实可下载内容"——4个模板卡片均为占位 Mock，无实际文件，用户无法在网页中打开使用。保留即欺诈。
  - 支委从侧边栏下拉→弹窗的改动基于用户"移除侧边栏卡片下拉栏组件"的明确要求，弹窗交互更清晰，避免侧边栏层级膨胀。
  - 管理视图角色标签作为临时差异化方案——等 C1.1.8 党支书全视图实现后再升级为系统性差异展示。
- **结果**: 4项任务全部完成，零诊断错误，净删约210行无效代码（假模板+旧下拉组件）
- **蒸馏标签**: [经验蒸馏: 是] — Mock模板≠真实功能，宁可少而准；弹窗模式为复杂角色选择提供更清晰的交互路径；GitHub Pages支持多页面部署的知识点对SPA架构是重要补充

---

## 2026-05-03 | 四项综合任务执行（Snapshot按需生成+视图模式优化+显示系统优化+参考资料板块）

- **来源**: 用户四项任务指示 + Agent 执行
- **时间**: 2026-05-03
- **变更文件**: CLAUDE.md, .ctx/SNAPSHOT.md, .ctx/CONTEXT.md, .ctx/snapshots/*(新建), .github/copilot-instructions.md, index.html, src/styles.css, src/calendar.js, src/main.js, src/references.js(新建), content/guides/DESIGN_SYSTEM.md
- **关键动作**: T1 Snapshot按需生成机制 / T2 角色视图模式映射+日历图例系统 / T3 字体加载FOUT消除 / T4 参考资料板块完整开发
- **变更详情**:
  - **T1: Snapshot按需生成机制**：
    - `CLAUDE.md §A2.5`：移除"每次执行更新Snapshot"→改为三种触发条件(大版本升级/用户指令/阶段收官)
    - `CLAUDE.md §C1.6`：重写为Snapshot管理机制(归档路径/版本命名/索引清单/更新日志/可追溯性)
    - `.ctx/SNAPSHOT.md`：更新政策声明
    - `.ctx/snapshots/INDEX.md`(新建)：历史版本索引清单
    - `.ctx/snapshots/SNAPSHOT_v3_20260502.md`(新建)：v3版本入档
    - `.ctx/CONTEXT.md §4`：同步更新Snapshot规则
    - `.github/copilot-instructions.md`：新增Snapshot按需生成规则
  - **T2: 视图模式优化**：
    - `CLAUDE.md`：新增C1.1.9条目+C1.8角色视图模式映射表(8角色×主视图+辅助视图+数据范围)
    - `index.html`：新增#calendar-legend日历图例系统(标题+收起按钮+色块网格)
    - `src/styles.css`：新增legend-item/legend-swatch/legend-label/cal-activity-tag/cal-activity-dot样式
    - `src/calendar.js`：导入ACTIVITY_CATEGORY_COLORS+ACTIVITY_TYPE_LABELS；空状态时隐藏图例；新增_renderLegend()函数(按实际使用的颜色动态渲染+收起/展开切换)
    - `content/guides/DESIGN_SYSTEM.md`：新增§4.9日历图例系统规范+§4.10多视图模式组件规范(7种视图模式含当前状态)
  - **T3: 前端显示系统优化**：
    - `index.html`：新增字体woff2预加载链接(Noto Sans SC + Noto Serif SC)；FOUT消除内联style(system fonts回退)；body.fonts-not-loaded初始状态；字体加载JS(document.fonts.ready + 1.5s超时兜底)
  - **T4: 参考资料板块开发**：
    - `index.html`：新增sidebar module-tab(参考资料)+#view-references完整HTML(分类标签5项+网站群展示区+资料列表区+搜索框+空状态)
    - `src/references.js`(新建, ~170行)：ReferencesModule类含SITE_GROUPS(6站点)/REF_DOCS(6文档)/分类过滤/搜索过滤/渲染逻辑/图标SVG映射/文件格式徽章
    - `src/styles.css`：新增全套CSS(ref-cat-btn/ref-site-card/ref-doc-item/ref-file-badge/ref-download-btn/响应式)
    - `src/main.js`：import ReferencesModule + views数组添加viewRefs + renderUI添加references分支 + init调用ReferencesModule.init()
- **设计决策**:
  - Snapshot低频化：日常由日志承载，快照保持精准高密度——避免每次执行都产出的维护负担
  - 日历图例按需显示：仅渲染当前日历中实际使用的颜色类别，避免无关图例占用空间
  - FOUT策略采渐进增强：system fonts立即可用→Google Fonts无缝升级，杜绝"几秒后字体突变"
  - 参考资料分"网站群+文档列表"双层：网站群为外部链接快速入口，文档列表为可下载资料
- **结果**: 4项任务全部完成，零诊断错误，新增1个JS模块
- **蒸馏标签**: [经验蒸馏: 是] — FOUT渐进增强策略可推广；按需Snapshot机制为长周期项目的上下文管理提供参考范式

---

## 2026-05-03 | 四项综合任务执行（支委视图+CLAUDE.md审查+界面规范+上下文管理）

- **来源**: 用户四项任务指示 + 秘书处执行
- **时间**: 2026-05-03
- **变更文件**: index.html, src/styles.css, src/events.js, src/state.js, CLAUDE.md, content/guides/DESIGN_SYSTEM.md, .ctx/CONTEXT.md, .github/copilot-instructions.md
- **关键动作**: T1条条支委统一入口+嵌套子视图 / T2 CLAUDE.md系统性审查 / T3界面设计规范(select/input/衬线字体/设计文档) / T4上下文管理
- **变更详情**:
  - **T1: 条条支委统一入口+嵌套子视图**：
    - `index.html`：3个独立支委按钮→1个「条条支委」入口按钮+3个嵌套子项（组织委员/宣传委员/纪检委员），添加展开指示器chevron
    - `src/styles.css`：新增`.commissioner-sub-views`（max-height过渡动画+层级缩进+左侧border线）、`.commissioner-sub-card`（子项卡片）、`.commissioner-chevron`（箭头旋转180°）、`.org-icon/.prop-icon/.disc-icon`（三色图标）
    - `src/events.js`：`data-role="commissioner-group"`点击→展开/收起子视图；非支委角色点击→自动收起子视图
    - `src/state.js`：修复`MANAGEMENT_ROLES`引用不存在的`ROLE_TYPES.COMMISSIONER`→改为3个子类型
  - **T2: CLAUDE.md系统性审查**：
    - 发现C1.4重复编号→第二个重编号为C1.7
    - C1.1.7实际完成度~60%（activity-type-input未被读取、赋权未持久化、四维度未完整落地）
    - C1.1.8仅~25%完成（无书记专属面板/独占操作/全局视图切换）
    - domain.js/service层未被CLAUDE.md追踪
    - renderer.js僵尸代码未记录
    - 更新CLAUDE.md §G执行状态反映真实完成度
  - **T3: 界面设计规范**：
    - T3a: 6处`glass-input`→`input-flat`；新增`select.input-flat` CSS规则（移除原生下拉箭头+自定义SVG箭头+聚焦变色）
    - T3b: 字体栈添加华文中宋(`STZhongsong`/`华文中宋`)；推演工作台标题/活动类型标签/写入活动按钮/侧边栏标签统一使用`font-title-cn`
    - T3c: `#view-calendar label`+`.module-tab span`+`.btn-primary`统一衬线字体
    - T3d: 更新`DESIGN_SYSTEM.md`—字体使用规则表+select统一规则+条条支委嵌套视图规范
  - **T4: 上下文管理**：
    - 分析4种上下文丢失场景（会话重启/长任务中断/跨日继续/方向变更）
    - `.ctx/CONTEXT.md`新增§8会话交接协议（场景分析+捕获规则+最近会话状态模板）
    - `.github/copilot-instructions.md`新增Layer 1.5会话恢复层+会话交接规则
- **设计决策**:
  - 条条支委采用"统一入口+嵌套子视图"而非3个独立按钮——避免视图层级混乱，符合组织架构中"条条支委"作为统一概念的设计
  - select元素统一为input-flat样式——废弃浏览器原生下拉方框，自定义SVG箭头保持视觉一致性
  - 华文中宋优先于宋体/思源宋体——用户明确要求衬线字体用于标题，华文中宋是最正式的中文字体
  - 会话交接协议嵌入CONTEXT.md而非创建新文件——遵循"不创造过多文件"原则
- **结果**: 4项任务全部完成，零诊断错误
- **蒸馏标签**: [经验蒸馏: 是 — 重大] — 会话交接协议为解决AI上下文丢失的系统性方案，可推广至其他长周期AI协作项目

---

## 2026-05-03 | C1.1.6 + 方向重大调整（去可视化+日历着色+理论蒸馏）

- **来源**: 用户方向指示 + 秘书处执行
- **时间**: 2026-05-03
- **变更文件**: definitions.js(SYNCING), constants.js(ACTIVITY_CAT_COLOR), calendar.js(participant着色), events.js(去除workflow), main.js(去除import), index.html(去除panel), styles.css(清理), copilot-instructions(理论), CLAUDE.md
- **关键动作**: 1) C1.1.6 长期SYNCING子状态 → 2) 移除全部工作流可视化代码 → 3) 参与者日历按活动类型着色 → 4) 活动管理四维度理论蒸馏
- **变更详情**:
  - **definitions.js SYNCING 升级**：
    - +3个子状态：`content_sync`（prop-commissioner负责，3步：direction_aligned→content_shared→progress_synced）、`attendance_inspection`（disc-commissioner负责，3步：collected→summarized→reported）、`coordination_layer`（organizer负责，3步：relations_balanced→experience_shared→layer_stable）
    - 每个子状态含 stepsLabel 详细中文说明 + requiredRoles 白名单
  - **移除工作流可视化**（用户明确不要）：
    - `index.html`：删除 `#workflow-panel` 整段（模板选择器+模拟阻塞+刷新按钮+render-target）
    - `events.js`：删除 `import renderWorkflow`、`_initWorkflowPanel()`、`_renderWorkflowPanel()` 全部代码、calendar tab 中的 `setTimeout(_renderWorkflowPanel)`
    - `main.js`：删除 `import renderWorkflow`
    - `styles.css`：删除全部 `.workflow-*` CSS（478行），仅保留 `@keyframes pulse`
    - `renderer.js` 和 `index.js` 中的导出保留未动（作为代码知识沉淀，仅不再调用）
  - **日历视图重设计**（参与者默认视图从灰色→彩色）：
    - `constants.js`：新增 `ACTIVITY_CAT_COLOR` 对象 — 12色系×7大类配色方案（party-day-joint品红/p-study蓝/p-visit绿/p-talk橙/p-meeting紫/theme-general红/learning蓝/meeting紫/development蓝绿/training金黄/org-life红/long-term青/default灰）；新增 `getActivityColor(activity)` 函数 — 优先级 scenarioId→activityType→duration→兜底灰；新增 `SCENARIO_TO_CATEGORY` 映射10个scenarioId到颜色；新增 `ACTIVITY_TYPE_LABELS` 中文标签
    - `calendar.js`：import `getActivityColor`；participant 视图从 `bg-gray-100 text-gray-700 border-gray-200` 改为动态 `style="background:${color.bg};color:${color.text};border:1px solid ${color.border}"`；新增 `.cal-activity-dot` 6px彩点前缀；截断从3条扩展到4条
    - `styles.css`：新增 `.cal-activity-tag` 样式（flex+圆角+过渡）+ `.cal-activity-dot` + `.truncate` 溢出省略
  - **经验蒸馏（理论创新）**：
    - `copilot-instructions.md` 新增两大节：
      - 「活动管理的"写入"机制」：管理视图写入权→自下而上先赋权再写入→写入才有身份→日历=数据库全映射
      - 「活动管理维度（重大理论创新）✨」：四维度完整定义——
        1. 时长维度（短期/长期判定规则+组织特征+日历颜色）
        2. 品牌层级（品牌搁置/非品牌活跃）
        3. 发起方向（自上而下直接写入/自下而上先赋权再写）
        4. 子类型（7大类着色依据：品红共建/蓝学习/绿参访/橙座谈/紫会议/红主题教育/青长期）
- **设计决策**:
  - 日历着色用"子类型维度"（4个维度中最直观的）——参与者不需要知道活动的管理属性，但需要一眼区分共建/学习/参访等不同性质
  - renderer.js 代码保留不删——是知识资产，只是HTML入口关掉，未来如需恢复一键可接回
  - styles.css 从1681行砍到1200行（-29%），删除全部工作流可视化CSS，只保留universal的 `@keyframes pulse`
  - "写入"概念是这次设计的关键突破——活动不是随便添加的，必须在数据库建档才有正式地位
- **结果**: C1.1.1~C1.1.6 全部完成。零诊断零 JS 错误。参与者日历从全灰变为7色分类显示。四维度理论框架写入 copilot-instructions 永久知识
- **蒸馏标签**: [经验蒸馏: 是 — 重大] — 活动管理四维度（时长/品牌/发起/子类型）+ "写入"机制为支部实践重大理论创新

---

## 2026-05-03 | C1.1.5 引擎v2.0 + 活动记录数据模型

- **来源**: 用户指示（含宣传专班多维表格截图）+ 秘书处执行
- **时间**: 2026-05-03
- **变更文件**: engine.js(升级v2.0), definitions.js(subStates), activityRecord.js(新建), renderer.js(子状态面板), styles.css(子状态CSS), index.js, CLAUDE.md, copilot-instructions.md, DECISION_LOG.md
- **关键动作**: engine.js v2.0 子状态追踪 + 角色守卫 + 前置校验；activityRecord.js 宣传专班多维表格数据模型；角色权限矩阵设计
- **变更详情**:
  - **engine.js v2.0**（486行，从237行升级）：
    - `SubStateTracker` 类：name/label/sequence/ownerRole/currentIdx/steps/completed，支持 completeStep(stepName) 有序步骤推进 + progress 百分比 + toJSON 序列化
    - `WorkflowEngine.transition()` 升级：新增第3参数 operatorRole → 2) 角色守卫 _checkRoleGuard() 检查目标状态 requiredRoles → 3) 前置校验 _preTransitionCheck() 确认当前状态 subStates 全部完成才允许离开
    - `completeSubStep(subStateName, stepName, operator, operatorRole)`：完成一个子步骤，含角色校验（ownerRole 匹配或 secretary/leader 超权）
    - `getSubStateStatus()` / `areSubStatesComplete(stateName)`：查询子状态快照和完成状态
    - `ROLE_PERMISSIONS` 矩阵：9角色 × 4权限（read/write/confirm/assign）
    - `hasPermission(role, permission)` 纯函数权限检查
    - `EVENT_TYPES` 新增 6 个子状态事件常量
  - **definitions.js** PREPARING 状态升级：
    - 新增 `requiredRoles: ['organizer','leader','secretary','disc-commissioner','prop-commissioner']`
    - 新增 `subStates.attendance`：owner=disc-commissioner, sequence=[confirmed→executed→submitted], stepsLabel 含3步详细说明
    - 新增 `subStates.publicity`：owner=prop-commissioner, sequence=[reviewed→coordinated→archived], stepsLabel 含3步详细说明
  - **activityRecord.js**（新建280行）：
    - `ActivityRecord` 类：12字段（id/name/theme/desc/link/date/type/leaders/leaderPhotos/filledBy/workflowId/status/createdAt/updatedAt），含 update()/publish()/archive()/toJSON()
    - `ActivityRecordStore` 类：内存 Map 存储，CRUD + search()模糊搜索 + importBatch()批量导入
    - `ACTIVITY_TYPES` 枚举：13种活动类型（从截图中提取的真实值：党日日-共建/学习/参访/座谈/会议 + 主题党日 + 各主题教育主题）
    - `ACTIVITY_CATEGORIES` 分类映射：party-day(5种) / theme(8种)
    - `MOCK_RECORDS`：12条真实数据（来自用户截图中的实际活动记录）
    - `createStoreWithMockData()`：一键创建预填充 Store
    - `filterRecordsByRole(store, role)`：角色视图过滤 — participant/deep 只看 published 公开信息；organizer 看自己关联的；prop/disc 全看；leader/secretary/global 全部可编辑
  - **renderer.js**（+125行）：新增 `_renderSubStates()` 子状态面板渲染 — 卡片式布局显示每个子状态的名称/负责人/进度% + 步骤时间轴（done绿勾/current红脉冲/pending灰虚线）+ stepsLabel 详细说明 + "所有子状态完成后才能进入下一阶段"提示横幅
  - **styles.css**（+159行）：`.workflow-substates-*` 完整样式体系 — wrapper/card/header/done-tag/pct-tag/step-dot(三态)/step-content/step-label(完成划线)/step-meta/step-waiting/hint横幅
  - **CLAUDE.md §C1.1**：C1.1.4/C1.1.5 标记 ✅；新增 C1.1.8 活动记录数据模型条目；§G 更新
  - **copilot-instructions.md**：新增「角色权限矩阵 v2.0」（9×4表格 + 条块视图差异化说明 + 赋权与学校系统对接说明）；新增「宣传专班多维表格」知识（12字段表 + 代码实现指向）
- **设计决策**:
  - 子状态采用"有序步骤"模式而非独立布尔标记——考勤必须先确认要求才能执行签到，宣传统筹必须先审核标准才能统筹素材
  - 角色守卫在 transition 层面实施（谁可以触发流转），子状态层面也有角色校验（谁可以完成某步骤）
  - 前置校验确保 PREPARING 阶段的考勤和宣传统筹都完成后才能进入 IN_PROGRESS —— 这对应实践中"纪检确认考勤+宣传确认素材"是活动开始的前提条件
  - activityRecord.js 采用内存存储设计，明确标注"后续替换为持久化"，为接入学校用户系统预留接口层
  - Mock 数据直接使用截图中的 12 条真实记录（安佳晨/梁宸菲填写），确保演示真实性
- **结果**: 引擎v2.0 + 活动记录数据模型双就绪，零诊断零浏览器错误
- **蒸馏标签**: [经验蒸馏: 是] — 角色权限差异化视图、宣传专班多维表格管理模式均为支部实践宝贵总结

---

## 2026-05-03 | 工作流系统 v2.0 重构（按用户方向调整）

- **来源**: 用户指示 + 秘书处（Agent Mode 执行）
- **时间**: 2026-05-03
- **变更文件**: CLAUDE.md, copilot-instructions.md, COMMISSIONER_GROUP_INTERACTION.md, BRAND_ACTIVITY.md, definitions.js(重写), renderer.js(同步), index.js(同步), index.html(同步)
- **关键动作**: 按用户最新理解重构活动组织模式 — 短期/长期双轨工作流 + 三维度知识沉淀 + 品牌活动搁置
- **变更详情**:
  - **CLAUDE.md**：
    - §C1.1 重写：定位为"短期/长期双轨"，C1.1.4→definitions.js重写，C1.1.5→短期引擎完善，C1.1.6→长期引擎完善，C1.1.7→党支书全视图增强（新增），C1.1.8→集成
    - §C1.2 标记 ⏸️ 搁置：品牌活动网页架构本轮暂停
    - §C1.4 新增：活动分类三维度知识沉淀表（时长/品牌/发起方向）+ 条块协同聚焦说明
    - §G 更新：当前优先级指向 C1.1.4（definitions.js 按新理解重写）
  - **copilot-instructions.md**：
    - 领域知识大幅扩展：短期活动组织模式（流程图+说明）、长期活动组织模式（流程图+说明）、活动分类三维度表、条块协同（纪检+宣传优先）、党支书权限说明
    - 组织者/深度参与者/组织层概念明确定义
  - **COMMISSIONER_GROUP_INTERACTION.md**：
    - 新增 §B.4："活动组织中的条块协同模式（核心）"，含 B.4.1 短期活动协同（结构图+节点表）和 B.4.2 长期活动协同（结构图+角色定义+组织者协调清单）
    - 修复 B.3.3 紧急事项被覆盖
  - **BRAND_ACTIVITY.md**：顶部新增 ⏸️ 搁置说明
  - **definitions.js v2.0**（313行，重写）：
    - 新增 PREPARING 状态（短期活动筹备阶段——组织者对接纪检宣传）
    - 新增 GROUP_FORMING 状态（长期活动组建活动小组阶段）
    - 新增 SYNCING 状态（长期活动组织层同步阶段）
    - 所有定义新增 `duration`（替代旧 `category`）、`direction`（新增维度）字段
    - `THEME_PARTY_DAY_DEFINITION` — 7 状态（DRAFT→PENDING_LEADER→APPROVED→PREPARING→IN_PROGRESS→COMPLETED→ARCHIVED）
    - `SHORT_TERM_DEFINITION` — 同上 7 状态
    - `LONG_TERM_DEFINITION` — 9 状态（DRAFT→PENDING_LEADER→APPROVED→GROUP_FORMING→IN_PROGRESS→SYNCING→COMPLETED→IN_REVIEW→ARCHIVED）
    - 品牌模板保留但标记 ⏸️
    - 新增 `DIMENSION_DEFINITIONS` 三维度说明对象
    - 新增 `findDefinition(duration, isBrand, direction)` 三维度查询函数
    - `DEFINITION_META` 新增 `duration`/`direction`/`status` 字段
  - **renderer.js**（同步更新）：
    - import 新增 SHORT_TERM_DEFINITION、LONG_TERM_DEFINITION
    - TEMPLATE_REGISTRY 更新 key（short-term→新、long-term→新）
    - MOCK_EVENT_CHAINS 重写：新增 short-term/long-term 链，更新 theme-party-day→PREPARING 步骤
    - _renderStateLabel meta 字段：'类别'→'时长'，新增'发起'维度
  - **index.js**（导出更新）：SHORT_TERM_NON_BRAND_DEFINITION→SHORT_TERM_DEFINITION 等，新增 DIMENSION_DEFINITIONS、findDefinition
  - **index.html**（下拉更新）：'短期非品牌→短期活动'、'长期非品牌→长期活动'，品牌选项加 ⏸️
- **设计决策**:
  - 品牌活动"搁置而非删除"：文件保留作为知识沉淀，方便后续恢复
  - 三维度作为 metadata 嵌入每套定义（非独立文件），遵循"不创造过多文件"原则
  - 长期活动 GROUP_FORMING + SYNCING 两个新状态反映了用户对多小组协调 + 组织层运作的深刻理解
  - PREPARING 状态让纪检和宣传委员在短期活动中有明确的"入驻节点"
- **结果**: 全部 8 文件零诊断 + 零浏览器错误，网页正常运行，推演工作台工作流面板显示新的 5 模板（含搁置标记）
- **蒸馏标签**: [经验蒸馏: 是] — 短期/长期双轨组织模式、三维度分类均为支部实践宝贵总结

---

## 2026-05-03 | C1.1.3 工作流可视化界面开发

- **来源**: 秘书处（Agent Mode 执行）
- **时间**: 2026-05-03
- **变更文件**: src/workflow/renderer.js(新建), index.html(修改), src/styles.css(修改), src/main.js(修改), src/events.js(修改), src/workflow/index.js(修改), CLAUDE.md, DECISION_LOG.md
- **关键动作**: CLAUDE.md §C C1.1.3 工作流可视化界面开发（🔴 P0）— 推演工作台内嵌工作流可视化视图
- **变更详情**:
  - `src/workflow/renderer.js`（239行）：工作流可视化渲染器
    - `WorkflowRenderer` 类：`render(container)` → SVG节点图 + 进度条 + 状态标签 + 流转历史 + 阻塞横幅
    - SVG 管道图：水平排列状态节点（rect+text），连接线（line+polygon箭头），颜色映射（completed绿/active红/pending灰/blocked红闪）
    - 进度条：百分比 = currentIdx/(total-1)*100，blocked 态红色脉冲动画
    - 状态标签：dot 指示灯 + 阶段标签 + 元数据面板（模板/类别/品牌/状态数/流转次数）
    - 流转历史：spine 时间轴（dot+line）+ card 内容（事件类型→目标状态+时间戳+操作人）
    - 阻塞横幅：⚠ 图标 + 超时详情，hidden 类隐藏
    - 模拟引擎：`createMockEngine()`（5模板预设事件链→随机推进若干步）、`createMockBlockedEngine()`（手动设置 enteredAt 超时→checkBlocking）
    - `renderWorkflow(container, defId, blocked)` 一键渲染入口
  - `index.html`（+42行）：推演工作台末尾新增 `#workflow-panel`
    - 顶部：标题「工作流可视化」+ 模板下拉选择器（5选项）+ 「模拟阻塞」toggle 按钮 + 「刷新视图」按钮
    - 底部：`#workflow-render-target` 容器由渲染器动态填充
  - `src/styles.css`（+323行）：完整 `.workflow-*` 样式体系
    - 布局：render-container flex column gap 20px
    - SVG：svg-wrapper 圆角卡片 + 水平滚动
    - 进度条：track/bar 渐变 + blocked 脉冲动画 `@keyframes pulse-blocked`
    - 状态标签：dot 脉冲动画 + phase 标签 + meta items grid
    - 历史面板：spine timeline（dot+line）+ content（event tag + arrow + to + time + operator）
    - 阻塞横幅：红色背景 + icon + text
    - 交互：active-blocked toggle 红色按钮态
  - `src/main.js`：导入 `renderWorkflow`
  - `src/events.js`：新增 `_initWorkflowPanel()` + `_renderWorkflowPanel()`，事件绑定（template-select change / blocked-toggle click / refresh-btn click），日历 tab 切换时 setTimeout 刷新
  - `src/workflow/index.js`：新增 renderer 导出
- **设计决策**:
  - 推演工作台采用「抄底嵌入」策略：视图段放在日历 grid+inspector 之下（`#workflow-panel`），无需新模块 tab
  - SVG 用 `viewBox` 适配任意宽度，`preserveAspectRatio="xMidYMid meet"` 保持居中
  - 模拟数据用预设事件链（MOCK_EVENT_CHAINS）→逐步推进，无真实活动绑定（C1.1.5 解决）
  - 阻塞模拟通过手动修改 `current.enteredAt` 为过去时间 + `checkBlocking()` 触发
  - 模板切换→重新 render（新 engine 实例），不保留上次状态
- **结果**: 推演工作台内嵌工作流可视化面板上线 — SVG节点图/进度条/状态标签/流转历史/阻塞横幅全部可交互演示，零诊断零浏览器错误
- **风险/回滚**: renderer.js 为新增文件可删除；HTML/CSS/JS 修改为追加式，不影响原有功能
- **蒸馏标签**: [经验蒸馏: 否]

---

## 2026-05-03 | C1.1.1+1.1.2 工作流系统核心实施

- **来源**: 秘书处（Agent Mode 执行）
- **时间**: 2026-05-03
- **变更文件**: src/workflow/engine.js(新建), src/workflow/definitions.js(新建), src/workflow/index.js(更新), CLAUDE.md, .ctx/logs/DECISION_LOG.md
- **关键动作**: CLAUDE.md §C C1.1 工作流系统开发（最高优先级 P0 🔴）— C1.1.1 引擎核心 + C1.1.2 流程定义
- **变更详情**:
  - C1.1.1 `src/workflow/engine.js`（237行）：通用状态机引擎
    - `WorkflowEngine` 类：`registerState()` / `start()` / `transition()` / `checkBlocking()` / `getHistory()` / `getStatus()` / `getAvailableTransitions()` / `reset()`
    - `createEngine(definition, operator)` 工厂函数
    - `canTransition(stateMap, current, event)` 纯函数 — 无副作用流转合法性校验
    - `calcTimeoutStatus(node, now)` 纯函数 — 超时状态计算
    - `EVENT_TYPES` 常量：INIT / SUBMIT / APPROVE / REJECT / CANCEL / COMPLETE / REVIEW / ARCHIVE / CERTIFY / TIMEOUT
    - 阻塞检测：`checkBlocking()` 按 `timeoutHours` 判定，超时标记 blocked + 生成通知
    - 流转历史日志：每次 transition 记录 `{ from, to, eventType, operator, timestamp, payload }`
  - C1.1.2 `src/workflow/definitions.js`（226行）：5套活动流程定义模板
    - `THEME_PARTY_DAY_DEFINITION`（主题党日活动）— 7 状态节点，完整 sopTaskId 映射对齐 `sopData.js §theme-party`
    - `SHORT_TERM_NON_BRAND_DEFINITION`（短期非品牌）— 7 状态：DRAFT→PENDING_LEADER→APPROVED→IN_PROGRESS→COMPLETED→IN_REVIEW→ARCHIVED
    - `SHORT_TERM_BRAND_DEFINITION`（短期品牌）— 9 状态：继承短期 + CERTIFICATION_PENDING→CERTIFIED
    - `LONG_TERM_NON_BRAND_DEFINITION`（长期非品牌）— 7 状态，COMPLETED 允许回退 IN_PROGRESS
    - `LONG_TERM_BRAND_DEFINITION`（长期品牌）— 9 状态：POSITIONING→…→PROTOTYPE→ITERATING→ESTABLISHED→CERTIFICATION_PENDING→CERTIFIED→ARCHIVED
    - `getDefinition(category, isBrand)` 索引函数 + `DEFINITION_META` 元数据表
    - 每状态节点含 `timeoutHours`（阻塞阈值）+ `metadata`（phase/sopTaskId 等）
  - `src/workflow/index.js`（26行）：新增 engine.js 和 definitions.js 导出（`WorkflowEngine`, `createEngine`, `canTransition`, `calcTimeoutStatus`, `EVENT_TYPES`, 5 套定义, `getDefinition`, `DEFINITION_META`）
  - CLAUDE.md §C1.1 表格：C1.1.1+1.1.2 标记 ✅/~strikethrough~；§G 更新当前状态
  - DECISION_LOG.md：追加 D-029
- **设计决策**:
  - 状态机采用类实例模式（非纯函数），每个工作流实例独立追踪 history/notifications/blockedNodes
  - 阻塞检测为惰性调用（`checkBlocking()`），不自动轮询，由上层调度
  - definitions.js 使用工厂函数模式（`DRAFT(timeout)`, `PENDING_LEADER(timeout)` 等）实现超时参数可复用
  - 主题党日活动模板与 `sopData.js` 双向对齐：definition → sopTaskId 映射 + sopScenarioId 引用
  - `EVENT_TYPES` 作为共享常量避免字符串硬编码
- **结果**: 工作流引擎核心（237行）+ 5 套流程定义模板（226行）+ index.js 导出集成，零诊断错误，不破坏现有 events.js/main.js 引用
- **风险/回滚**: engine.js 和 definitions.js 为新增文件可删除；index.js 仅追加导出，未修改原有导出；git 历史可恢复
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-02 日志条目（CLAUDE.md 七项系统性整理）

- **来源**: 秘书处（Agent Mode 审查+执行）
- **时间**: 2026-05-02
- **变更文件**: .ctx/logs/DECISION_LOG.md (新建), CLAUDE.md, .ctx/SNAPSHOT.md
- **关键动作**: 执行用户 7 项指令：决策日志迁移 + 规划结构规范 + 已完成项清理 + 空白文档排查 + role 标注检查 + C2 实现审计 + 工作流管控
- **变更详情**:
  - Task1 决策日志迁移: 创建 `.ctx/logs/DECISION_LOG.md`（22 条历史决策 D-001~D-022 + 2 条悬置议题 H-1/H-2），从 EXECUTION_LOG 中提取所有「关键动作」决策记录，按时间倒序排列；修复 CLAUDE.md 中 2 处指向不存在 DECISION_LOG.md 的断链引用（L12 常为新原则声明 + L154 快速导航）
  - Task2 规划内容归集: 确认 CLAUDE.md 已采用 A-H 字母数字层级编号体系（§A 三步工作流 / §B 角色分类 / §C 统一待办规划 C1-C3 / §D 待讨论 D.1-D.3 / §E 待办修改 E.1 / §F 暂缓 F.1 / §G 当前状态 / §H 快速导航），C2 下 DESIGN-OPT 任务使用 C2.D1.1 ~ C2.D5.3 编号，结构完整无需调整
  - Task3 已完成项清理: 确认 CLAUDE.md 遵循"常为新"原则 — 零个"✅已完成"标记残留，§B 角色体系标注为"已完成，不再维护"而非保留完整内容，§G 仅含 1 条"🔜下一步"
  - Task4 空白文档排查: 全仓扫描 55 个 .md 文件，识别 6 个疑似小文件（SOP/INDEX、guides/README、references/README、SOP/README 等），经逐文件审查确认全部为合法目录索引/说明文件，无空白或冗余文档需删除
  - Task5 role 标注完整性检查: grep 全仓验证 — 39 个 .md 文件含 `role:` front matter ✅ / 14 个 .js 文件含 `// role:` ✅ / 1 个 .css 文件含 `/* role: */` ✅ / 1 个 .html 文件含 `<!-- role: -->` ✅ = **55/55 文件 100% 覆盖**
  - Task6 C2 实现状态核查: DESIGN_SYSTEM.md Phase D1-D5 检查清单共 23 项任务，当前状态 **全部 `[ ]` 未启动（0% 完成率）**；CLAUDE.md §C2 含完整的 23 任务实施计划表（C2.D1.1~C2.D5.3）+ Agent 角色分配表；CALENDAR_DESIGN.md 引用 C2 编号模式但属日历功能域非设计优化域；结论：C2 为纯规划状态，尚未进入执行阶段
  - Task7 工作流管控: 本次执行严格遵循三步工作流（Blueprint 审查 → 分任务执行 → 验证 → 闭环），未引入新线索
- **结果**: DECISION_LOG.md 新建并填补断链；CLAUDE.md 结构确认合规；零冗余文档；role 标注全覆盖；C2 审计基线建立
- **风险/回滚**: DECISION_LOG.md 为新增文件可删除；其余均为审查/确认操作无破坏性变更
- **蒸馏标签**: [经验蒸馏: 否]

---

---

### 2026-05-02 日志条目（CLAUDE.md §C 三项核心需求整合）

- **来源**: 秘书处（Agent Mode 规划+执行）
- **时间**: 2026-05-02
- **变更文件**: CLAUDE.md, .ctx/logs/DECISION_LOG.md
- **关键动作**: 将用户提出的 3 项核心需求详细记录并整合到 CLAUDE.md §C，按优先级重新编排
- **变更详情**:
  - CLAUDE.md §C1 扩展：从 3 项扩展至 6 项，新增子任务编号体系 C1.1.1~C1.1.5 / C1.2.1~C1.2.5 / C1.3.1~C1.3.5，总计 18 个子任务（原 3 项无子任务 → 现 18 个子任务）
  - C1.1 工作流系统开发（P0 最高优先级 🔴）：
    - C1.1.1 引擎核心设计（状态机+流转规则+事件触发）→ `src/workflow/engine.js`
    - C1.1.2 四类活动流程定义（长期/短期/品牌/非品牌）→ `src/workflow/definitions.js`
    - C1.1.3 工作流可视化界面开发（流程节点图/进度条/状态标签）→ `index.html`
    - C1.1.4 状态追踪与管理（当前步骤/历史日志/阻塞检测）→ `src/workflow/tracker.js`
    - C1.1.5 工作流与推演工作台+党务管理模块集成 → `main.js`
  - C1.2 品牌活动网页架构设计（P1）：
    - C1.2.1 展示系统扩展（网页集/模块化结构）→ `brand.js`
    - C1.2.2 组织者/深度参与者权限管理（复杂关系配置）→ `state.js`
    - C1.2.3 时间轴功能（持续迭代展示）→ `brand.js`
    - C1.2.4 小组层级管理结构 → `src/workflow/group.js`
    - C1.2.5 元学习能力评估与实现 → `src/workflow/analytics.js`
  - C1.3 SOP 反馈卡功能开发（P1）：
    - C1.3.1 反馈卡下载功能 → `index.html`
    - C1.3.2 提交入口+结构化输入系统 → `src/workflow/feedback.js`
    - C1.3.3 四类别输入（Permanent/Global/Role/Scenario-Specific）→ `feedback.js`
    - C1.3.4 反馈内容整合与长期迭代机制 → `feedback.js`
    - C1.3.5 架构问题自动识别→CLAUDE.md反馈通道 → `feedback.js`
  - 现有项重新编号：C1.4 E1.3-E1.8 / C1.5 DESIGN-OPT Phase D1 / C1.6 SNAPSHOT归档策略
  - §G 新增最高优先级标注（🔴 C1.1），§H 新增品牌活动+条块交互导航入口，D.3 引用从 C1.1 修正为 C1.6
- **结果**: CLAUDE.md §C1 从 3 项无子任务 → 6 项 18 子任务，工作流系统明确标记为最高优先级，编号体系完整一致
- **风险/回滚**: 纯规划性变更；可通过 git 历史回退
- **蒸馏标签**: [经验蒸馏: 否]

### 2026-05-02 日志条目（SNAPSHOT 瘦身 + 品牌活动修订 + 文件结构优化 + 条块交互机制）

- **来源**: 秘书处（Agent Mode + workflow-architect 执行）
- **时间**: 2026-05-02
- **变更文件**: .ctx/SNAPSHOT.md, .ctx/CONTEXT.md, .ctx/TIMESTAMPS.md, .github/copilot-instructions.md, content/guides/BRAND_ACTIVITY.md(新建), content/guides/SOP_WEB_GUIDE.md(新建), content/guides/COMMISSIONER_GROUP_INTERACTION.md(新建), content/guides/ROLE_CLASSIFICATION.md, content/guides/DOCUMENTATION_MAP.md, CLAUDE.md
- **关键动作**: SNAPSHOT 更新策略规范化 + 品牌活动文档修订合并 + guides/ 文件结构优化 + 条条支委与党小组交互机制设计
- **变更详情**:
  - SNAPSHOT.md: 从 167 行瘦身至 82 行（-51%），删除 §II文档产出矩阵/§III钩稽矩阵/§V短期规划/§VI断链状态/§VII版本历史（均与 CLAUDE.md/DECISION_LOG 重复），仅保留物理拓扑+分层架构+版本里程碑；更新策略改为"仅大版本里程碑更新（v3→v4）"
  - CONTEXT.md §4: 删除动态变更数据（待办修改项/暂缓议题/监控项），改为指向 CLAUDE.md + DECISION_LOG 的引用
  - TIMESTAMPS.md: 更新规则从"每次文件修改后同步更新"改为"仅周期性任务 M2 批量刷新"
  - copilot-instructions.md: SNAPSHOT 白名单从"版本 milestone 更新"改为"仅大版本里程碑更新"；TIMESTAMPS 白名单从"时间戳维护"改为"仅 M2 批量刷新"
  - BRAND_ACTIVITY.md(新建): 合并 BRAND_ACTIVITY_ARCHITECTURE.md + BRAND_ACTIVITY_ACTION_PLAN.md，重新定义品牌活动为"动态工作项目"（非静态展示），新增宣讲团+人生回望录两个案例，评分维度新增"成长性"(20%)，认定流程新增"复盘迭代"第五步
  - SOP_WEB_GUIDE.md(新建): 合并 SOP_WEB_OPTIMIZATION.md + SOP_DISPLAY_ISSUES.md + SOP优化提案反馈卡.md + SOP数据映射与同步指南.md，5章结构（问题诊断/优化方法论/展示问题清单/数据映射规则/优化提案机制）
  - COMMISSIONER_GROUP_INTERACTION.md(新建): 条条支委与党小组交互机制设计（职责边界+短期/长期交互模式+实施路径+冲突解决）
  - ROLE_CLASSIFICATION.md: 新增 §六可扩展性评估摘要（8.6/10），原 §六→§七
  - DOCUMENTATION_MAP.md: 更新所有旧文件引用为新文件路径
  - CLAUDE.md: 更新 2 处旧文件引用
  - 已删除 7 个旧文件：BRAND_ACTIVITY_ARCHITECTURE.md, BRAND_ACTIVITY_ACTION_PLAN.md, SOP_WEB_OPTIMIZATION.md, SOP_DISPLAY_ISSUES.md, SOP优化提案反馈卡.md, SOP数据映射与同步指南.md, ROLE_SCALABILITY_ASSESSMENT.md
- **结果**: guides/ 从 20 文件精简至 15 文件（-25%）；SNAPSHOT 更新频率从每次任务降低至大版本里程碑；品牌活动定义从"静态展示"升级为"动态迭代过程"
- **风险/回滚**: 合并文件可通过 git 历史恢复；SNAPSHOT 瘦身为纯删减性操作
- **蒸馏标签**: [经验蒸馏: 是] — SNAPSHOT 频繁更新问题的根因是"每次任务完成都触发重写"，解决方案是"仅大版本里程碑更新 + 日常变更由 DECISION_LOG/EXECUTION_LOG 承载"，此模式可推广至其他频繁更新的系统文件

### 2026-05-02 日志条目（E1 党务管理模块实施）

- **来源**: 秘书处（Agent Mode + frontend-architect 执行）
- **时间**: 2026-05-02
- **变更文件**: index.html, src/party.js(新建), src/main.js, src/events.js, src/styles.css, CLAUDE.md, .ctx/SNAPSHOT.md
- **关键动作**: E1 组织建设独立模块实施 — 第 4 个 module-tab「党务管理」+ 四面板架构 + 三委子 tab + 合规文件引用渲染
- **变更详情**:
  - index.html: 新增 `module-tab[data-module="party"]`（盾牌 SVG 图标）+ `view-section#view-party`（含四面板：panel-inspector/organizer/publicity/default + 子 tab bar + 合规文件引用区）
  - src/party.js(新建): PartyModule 对象 — Mock 数据工厂 + getActiveCommissioner() 角色判定 + renderCommissionerPanel() 面板切换 + switchSubTab() 子 tab 切换 + 12 个子功能渲染方法 + completeMakeup()/confirmMailboxCheck() 操作方法 + renderComplianceRefs() 引用渲染
  - src/main.js: import PartyModule + views 数组新增 viewParty + activeModule==='party' 时调用 renderCommissionerPanel()
  - src/events.js: import PartyModule + party case setState + commissioner-tab 点击事件 + 刷新按钮事件 + PartyModule.loadAll() 初始化
  - src/styles.css: 新增 .commissioner-tab-bar / .commissioner-tab / 三委色系(inspector:#D97706 / organizer:#3B82F6 / publicity:#10B981) / .party-stat-card / .compliance-ref-item.readonly::after
  - CLAUDE.md: §C1 新增 C1.1(E1.3-E1.8 子功能实施)；§G 更新下一步
  - SNAPSHOT.md: v3.6→v3.7
- **结果**: 党务管理模块上线 — 点击侧边栏 [党务管理] 切换至组织建设视图；默认显示概览面板(四宫格+联系方式)；条条支委角色显示对应面板(琥珀/蓝/翠绿 tab bar)；子 tab 切换正常；合规文件标注"只读"
- **风险/回滚**: party.js 为新增文件可删除；index.html 新增内容可 git 回退；CSS 为追加性修改
- **蒸馏标签**: [经验蒸馏: 否]

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: SYSTEM_CLAUDE.md
- **关键动作**: 重写 SYSTEM_CLAUDE.md 为「未来路线图+执行清单」中枢文档
- **变更详情**:
  - 修正定位：从「记录现状」改为「记录未来」（SNAPSHOT 管现状，CLAUDE.md 管未来）
  - 纳入 Phase 1-4 文件架构重整完整执行清单（含步骤表+CLI命令+影响矩阵+预期效果）
  - 纳入技术产品路线图 Phase 1-3
  - 纳入角色三分类体系（人/人机/AI）定义与实施计划
  - 纳入 README.md 优化策略与标准化模板
  - 纳入 knowledge/参考资料/docs 三区划界待讨论议题
  - 纳入决策日志与执行状态追踪
  - 确立三步标准化工作流（执行→next_prompt→Agent自主记账）
- **结果**: 文档从 v10.0 纯人读路线图改造为 [人机] 执行中枢，承载所有待实施计划
- **风险/回滚**: git 历史可回退至 v10.0 版本
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-02 日志条目（R4 OA1-OA4 优化实施）

- **来源**: 秘书处（Agent Mode 执行）
- **时间**: 2026-05-02
- **变更文件**: .github/copilot-instructions.md, src/state.js, .ctx/SNAPSHOT.md, .ctx/TIMESTAMPS.md, content/guides/ROLE_CLASSIFICATION.md
- **关键动作**: CLAUDE.md §八 P2 R4 — 基于 R2 评估报告（8.6/10）的 SA1/SA2 优化实施
- **变更详情**:
  - copilot-instructions.md：新增「写盘权限（can-modify 白名单）」节（SA2）— 8类文件权限表（宪章/母本/Agent/Skill/CONTEXT/SNAPSHOT/TIMESTAMPS/logs）；新增「动态角色判定规则」节（SA1）— SNAPSHOT.md 和 TIMESTAMPS.md 的 dynamic_role 上下文切换逻辑 + 执行流程 4 步
  - src/state.js：新增 DYNAMIC_ROLE_CONTEXT 常量 + resolveDynamicRole() + AI_CAN_MODIFY_WHITELIST + canAIModify() 函数
  - .ctx/SNAPSHOT.md：front matter 新增 `dynamic_role: {runtime:"[AI]", archived:"[人机]"}` 字段；role 头部仍为 [AI]（运行时生效）
  - .ctx/TIMESTAMPS.md：front matter 新增 `dynamic_role: {maintenance:"[人机]", auto_update:"[AI]"}` 字段
  - ROLE_CLASSIFICATION.md：§五覆盖度表新增 SA1/SA2 完成标记；§六一致性检查标注 v2.0；版本历史从 v1.1→**v2.0**
- **结果**: OA1/OA2 确认已完成（R3 + DOCUMENTATION_MAP 已覆盖）；SA1 动态角色判定上线（copilot-instructions + state.js + front matter 三层实现）；SA2 can-modify 白名单上线（宪章层 + 代码层双校验）
- **风险/回滚**: 纯添加性变更，不影响现有功能；dynamic_role 字段为向后兼容扩展，不影响无此字段的文件
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-02 日志条目（T1a+T3a+E3 三联执行）

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: .ctx/TIMESTAMPS.md, .github/copilot-instructions.md, content/guides/SOP_DISPLAY_ISSUES.md（新建）, content/guides/COMMISSIONER_ORGANIZATION_ROLE.md（新建）, content/guides/DOCUMENTATION_MAP.md, CLAUDE.md, .ctx/SNAPSHOT.md
- **关键动作**: CLAUDE.md §八 P1 T1a + P1 T3a + P2 E3 三联并行实施
- **变更详情**:
  - T1a: TIMESTAMPS.md 全量路径刷新（.vibe_context/→.ctx/, knowledge/→content/SOP/, docs/→content/guides/+, 参考资料/→content/references/）+ 新增周期性任务追踪表（W1-Y1 共12项）；copilot-instructions.md 追加「周期性任务自动唤醒」节（会话入口检查逻辑+四优先级排序+通知示例）
  - T3a: 产出 SOP_DISPLAY_ISSUES.md — 3份核心SOP逐项审查：纪检委员（7展示问题+5修改建议，综合7.3/10）、组织委员（8问题+6建议，5.8/10）、宣传委员（8问题+6建议，6.0/10），6项跨文档系统缺陷，P0/P1/P2三级行动计划
  - E3: 产出 COMMISSIONER_ORGANIZATION_ROLE.md — 三委权限矩阵（11操作×3角色+支部书记超集）、四面板架构含子Tab（纪检:补课/公邮/参与/复盘、组织:发展/催缴/汇报/合规、宣传:归档/标准/模板/周报）、默认只读概览面板、月度三委协作闭环数据流、CSS/JS集成方案（复用现有设计系统零新增CSS类）、P0-P3七级实施优先级
  - 同步: DOCUMENTATION_MAP.md 新增2个技术文档路由+引用关系图更新+快速入口；CLAUDE.md §七新增3条决策日志、§八移除已完成项（S2/S3/T1a/T3a/E3）、§十全面刷新执行状态；SNAPSHOT.md 升级至v3.2
- **结果**: 周期性醒机制上线（下次新会话即生效）；SOP展示问题清单就绪（17问题+6系统缺陷）；三委组织建设权限体系设计完成（可在E1 HTML骨架就位后直接施工）
- **风险/回滚**: git 历史可恢复；T1a的copilot-instructions修改可能影响后续会话行为（预期正向）
- **蒸馏标签**: [经验蒸馏: 是] — "常为新"原则的规模化应用：一次性将已完成项从CLAUDE.md §八批量移除并转记§七决策日志，保持路线图始终只含未来任务

---

### 2026-05-02 日志条目（CLAUDE.md 系统性清理与同步）

- **来源**: 秘书处（Agent Mode 审查+执行）
- **时间**: 2026-05-02
- **变更文件**: CLAUDE.md, .ctx/logs/EXECUTION_LOG_INDEX.md, .ctx/CONTEXT.md, .ctx/TIMESTAMPS.md, .ctx/SNAPSHOT.md
- **关键动作**: 全面 CLAUDE.md 审查与清理：逐项核对完成记录 + guides 文件交叉验证 + 三步工作流执行情况审查
- **变更详情**:
  - CLAUDE.md §二：标头改为「✅ 已完成」，移除过时的 R2/R3「实施计划」子表（两项均已在 §七 有决策日志 + §十 有完成标记），替换为实施历史摘要 + ROLE_CLASSIFICATION.md v2.0 引用
  - CLAUDE.md §四：SNAPSHOT 归档策略议题追加交叉引用「（已纳入短期规划 §八 D1）」
  - .ctx/logs/EXECUTION_LOG_INDEX.md：全部 4 条日志文件路径从 `.vibe_context/logs/` 修正为 `.ctx/logs/`（此前路径因架构迁移后未同步更新而陈旧）
  - .ctx/CONTEXT.md §4：「系统模式」从 Stable/Release v3.0 更新至 v3.4
  - .ctx/TIMESTAMPS.md：EXECUTION_LOG_INDEX 时间戳从 2026-05-01 更新至 2026-05-02；CLAUDE.md 备注从「未来执行路线图」改为「待实施路线图」
  - .ctx/SNAPSHOT.md：升级至 v3.5，milestone 更新为本次清理摘要
- **审查结论**:
  - §七 决策日志：21 条全部核实，均有对应日志条目或文件产出
  - §八 短期规划：仅余 D1（SNAPSHOT 归档策略），其余项均已实施并移除
  - §五 待办修改项：仅有「修改14」1 条 Pending（书记悬置）
  - §六 暂缓议题：H3 由书记锁定，未解锁
  - guides/ 文件 vs CLAUDE.md 描述：19 个 guides 文件中 5 个最新文档（ROLE_CLASSIFICATION v2.0、COMMISSIONER_ORGANIZATION_ROLE、SOP_DISPLAY_ISSUES 等）已在 CLAUDE.md §七 正确记录
  - 三步工作流执行情况：本次审查期间所有变更均遵循 Blueprint → 执行 → 日志 → next_prompt 闭环
- **结果**: CLAUDE.md 零陈旧引用、零未标记完成项、零路径不一致；T2/T3 编号双用为用户历史遗留（非本次修正范围）
- **风险/回滚**: 纯清理性变更；git 历史可回退
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-02 日志条目（R3 全仓角色标记写入）

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: 86 个（全仓库覆盖）
- **关键动作**: CLAUDE.md §八 P1 R3 — 将 [人]/[人机]/[AI] 角色标记写入全部文件注释中
- **变更详情**:
  - 根目录 4 文件：README.md(→[人] front matter)、ARCHITECTURE.md(→[人机] front matter)、CLAUDE.md(→[人机] front matter)、index.html(→[人机] HTML 注释)
  - content/guides/ 19 文件：全部 →[人机]，已有 front matter 的补充 role 字段，无 front matter 的添加最小 front matter
  - content/SOP/ 8 文件：全部 →[人机]
  - content/references/ 9 文件：全部 →[人]
  - content/insights/ 1 文件：→[人机]
  - .github/ 22 文件：全部 →[AI]（copilot-instructions、SSOT_INDEX、10 agents、10 skills）
  - .ctx/ 9 文件：CONTEXT+SNAPSHOT→[AI]、TIMESTAMPS+7 logs→[人机]
  - src/ 13 文件：全部 →[人机]（12 JS `// role:` + 1 CSS `/* role: */`）
- **结果**: 86/86 文件角色标记全覆盖；抽样验证通过（README/[人]、ARCHITECTURE/[人机]、copilot-instructions/[AI]、SOP/INDEX/[人机]、main.js/[人机]、styles.css/[人机]、index.html/[人机]、references/README/[人]、CONTEXT/[AI]）
- **风险/回滚**: 纯添加性修改，不影响任何功能逻辑；可通过删除对应行回滚
- **蒸馏标签**: [经验蒸馏: 否]

---

## 2026-05-02 18:00 | R2 角色体系可扩展性评估 + S1 断链验证 + S2 SNAPSHOT 更新 + 同步任务 + 额外项规划

- **来源**: 书记直接任务委派
- **时间**: 2026-05-02 18:00
- **操作者**: Trae IDE Agent (DeepSeek-V4-Pro) + workflow-architect + experience-distiller
- **类型**: 评估报告 + 文档更新 + 断链扫描 + 架构规划

### R2: 角色体系长期可扩展性评估
- **产出文件**: `content/guides/ROLE_SCALABILITY_ASSESSMENT.md`
- **输入**: `ROLE_CLASSIFICATION.md` + `EMOJI_POLICY.md`
- **评估结果**: 综合评分 8.6/10；识别 4 个中等风险瓶颈 + 2 个低风险缺口
- **优化建议**: OA1-OA4（立即）+ SA1-SA3（短期）+ MA1-MA3（中长期）

### S1: 全仓断链验证
- 扫描范围: 全仓 .md 文件中的 `docs/`、`knowledge/`、`.vibe_context/` 路径
- 结果: 所有匹配均为历史记录描述（决策日志、经验蒸馏上下文），无实时断链
- 新增 content/guides/ 3 文件引用已正确建立
- **零断链**

### S2: SNAPSHOT 版本更新
- 文件: `.ctx/SNAPSHOT.md` → v3.1
- 更新: 全局拓扑树、文档产出矩阵、钩稽快照、分层架构、短期规划、断链状态

### 同步任务
- EMOJI_POLICY.md → CLAUDE.md 钩稽矩阵（新增文件钩稽声明表）
- CALENDAR_DESIGN.md + BRAND_ACTIVITY_ARCHITECTURE.md → DOCUMENTATION_MAP.md 路由（Layer 5 + 引用关系图 + 快速入口）
- ROLE_SCALABILITY_ASSESSMENT.md → DOCUMENTATION_MAP.md 路由 + CLAUDE.md 钩稽

### 反向联动更新
- ROLE_CLASSIFICATION.md: 新增"子目录继承规则"+ "引用渲染机制"
- EMOJI_POLICY.md: 补充 §3.3 [AI] 角色文件 Emoji 策略（消除盲区）
- CLAUDE.md §七 决策日志: 补充 10 条新决策记录
- CLAUDE.md §八 短期规划: 移除已完成 R2/S1，新增 E1/E2/E3/R4

### 额外项规划（写入 CLAUDE.md §八）
- E1: 组织建设独立模块规划 — 侧边栏与推演工作台并列
- E2: 管理模式架构设计 — 组织者+深度参与者，考勤 vs 考察（援引纪检委员手册 §1.2）
- E3: 条条支委组织建设职能强化设计

- **结果**: R2 评估确认三角色体系健康（8.6/10），瓶颈可控；全仓零断链；SNAPSHOT 反映真实状态
- **风险/回滚**: 纯文档变更，无破坏性影响
- **蒸馏标签**: [经验蒸馏: 是] — 评估方法论（5维评分+瓶颈矩阵+优化路径）可供后续体系评估复用

---

## 2026-05-02 16:00 | 五项综合任务执行：CSS 修复 + 日历规划 + 经验蒸馏 + Emoji 规范 + 品牌活动架构

- **来源**: 书记直接任务委派（五项并发）
- **时间**: 2026-05-02 16:00
- **操作者**: Trae IDE Agent (DeepSeek-V4-Pro) + 3 个专项 Agent
- **类型**: 代码修改 + 文档规划 + 经验蒸馏 + 政策制定

### T1: 侧边栏角色卡片选中态 CSS 修复
- **目标文件**: `src/styles.css`
- **变更**:
  - `.role-card.active` 背景色: `neutral-50` → `primary-50`（浅红色）
  - 管理视图 5 角色 active 背景 → 各自淡色版 + 边框 → `transparent`
    - leader: `var(--primary-50)`
    - commissioner: `rgba(217,119,6,0.06)`
    - organizer: `rgba(59,130,246,0.06)`
    - deep: `rgba(16,185,129,0.06)`
    - secretary: `rgba(139,92,246,0.06)`
  - 参与视图 participant active 背景: `rgba(212,175,55,0.08)` + 边框保留
  - 策略: 管理视图左侧 `::before` 色条已做视觉指示，边框冗余 → 移除；参与视图保留边框
- **结果**: ✅ 7 处全部通过 grep 验证

### T2: 日历功能规划与设计
- **产出文件**: `content/guides/CALENDAR_DESIGN.md`
- **Agent**: workflow-architect
- **内容**: 四视图切换逻辑（月/周/日/列表）、文本溢出 +N more 策略、三种存储方案对比（localStorage/IndexedDB/后端API）、聚焦视图交互设计、技术实现建议（Grid/Flexbox/虚拟滚动/键盘导航）
- **结果**: ✅ 646 行规划文档已创建

### T3: 项目经验沉淀与文档优化
- **产出文件**: `content/insights/党支部管理与实务经验沉淀.md`
- **Agent**: experience-distiller（蓝图）+ Trae IDE Agent（执行写入）
- **变更**: v2.0→v3.0，新增第三篇「工程演进与治理经验（【器】）」含 5 个章节:
  - §3.1 架构迁移（先建后迁四步法）
  - §3.2 文件分类（三角色权限递进）
  - §3.3 三步工作流（Agent 协作协议）
  - §3.4 CLAUDE.md 管理（常为新原则）
  - §3.5 CSS 设计系统（Liquid Glass→Flat Matte）
- **新增**: 附录二「文档更新机制」（触发条件/责任/格式规范）
- **结果**: ✅ 文件版本升级至 v3.0

### T4: Emoji 使用规范制定
- **产出文件**: `content/guides/EMOJI_POLICY.md`
- **核心规定**:
  - 网页（index.html）绝对零 Emoji
  - [人] 文件完全允许，[人机] 文件仅功能性 Emoji
  - 功能性 vs 装饰性判定标准：能否用 ≤3 中文字符替代？
  - 白名单: ⚠️（警告）、✅（完成）、❌（失败）、🔜（即将）
  - 禁止列表: 💡🗺️📚🌟🎯📊🔑🔗👤⚡📝🗂️📌
- **结果**: ✅ 规范文档已创建

### T5: 品牌活动网页架构规划
- **产出文件**: `content/guides/BRAND_ACTIVITY_ARCHITECTURE.md`
- **Agent**: workflow-architect
- **内容**: 非平行结构展示方案（四层关系模型）、SPA→多页面扩展三阶段路径、RESTful API 设计、五维品牌评分算法、三条用户交互路径、分享功能设计
- **结果**: ✅ 架构规划文档已创建

### 验证审计

| 验证项 | 结果 |
|--------|------|
| CSS 7 处选中态背景+边框 | ✅ 全部通过 |
| CALENDAR_DESIGN.md 产出 | ✅ 存在 |
| 经验沉淀文件 v3.0 更新 | ✅ 第三篇 + 更新机制 |
| EMOJI_POLICY.md 产出 | ✅ 存在 |
| BRAND_ACTIVITY_ARCHITECTURE.md 产出 | ✅ 存在 |

- **风险/回滚**: CSS 变更仅影响视觉层；规划文档为纯新增，无破坏性变更
- **蒸馏标签**: [经验蒸馏: 是] — T3 已完成经验蒸馏闭环，T2/T5 规划文档可在后续执行中提炼经验

### 2026-05-02 日志条目（第五轮）

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: 7个空目录删除, .github/skills/experience-distiller/SKILL.md, .github/skills/log-recorder/SKILL.md, .github/skills/sop2code/SKILL.md, .github/agents/shekeyuan.agent.md, .github/agents/danganguan.agent.md, content/ 下15个文件, CLAUDE.md, content/guides/ROLE_CLASSIFICATION.md(新建)
- **关键动作**: 全仓断链修复 + R1 角色定义文档产出
- **变更详情**:
  - 清理7个空目录（.vibe_context/、docs/、knowledge/、参考资料/、.vscode/skills_backup_2026-04-01/ 等）
  - 修复 .github/ 下5个文件的旧路径引用（experience-distiller: docs/→content/insights/; log-recorder: .vibe_context/→.ctx/; sop2code: knowledge/SOP/→content/SOP/, .vibe_context/scenarios/→.ctx/CONTEXT.md; shekeyuan: docs/→content/insights/, .vibe_context/→.ctx/; danganguan: .vibe_context/→.ctx/）
  - 修复 content/ 下15个文件的旧路径引用（DOCUMENTATION_MAP、AGENT_USAGE、经验沉淀、SOP文件、模板文件等）
  - 更新 CLAUDE.md 添加短期规划（R1-R3、S1-S3、D1）
  - R1: 创建 content/guides/ROLE_CLASSIFICATION.md，定义 [人]/[人机]/[AI] 三种角色的职责、权限、协作、存储、读取机制，含可扩展性评估
- **结果**: 全仓断链修复完成（20个文件）；角色定义文档产出；CLAUDE.md 短期规划明确
- **风险/回滚**: git 历史可恢复
- **蒸馏标签**: [经验蒸馏: 是] — 大规模迁移后断链修复策略（先审计→按域批量修复→验证）为可复用项目治理经验

---

### 2026-05-02 日志条目（第四轮）

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: knowledge/SOP/*→content/SOP/, docs/*→content/guides/+content/insights/, 参考资料/*→content/references/, .vibe_context/*→.ctx/, SYSTEM_CLAUDE.md→CLAUDE.md, ARCHITECTURE.md, README.md, .github/copilot-instructions.md, .github/SSOT_INDEX.md, .ctx/CONTEXT.md
- **关键动作**: A1-A12 最优文件夹架构迁移
- **变更详情**:
  - A1: 创建 content/ 目录结构（SOP/ + guides/ + insights/ + references/）
  - A2: 迁移 knowledge/SOP/ → content/SOP/（8个文件）
  - A3: 迁移 docs/ 操作指南 → content/guides/（5个文件）
  - A4: 迁移 docs/经验沉淀 → content/insights/（1个文件）
  - A5: 迁移 参考资料/ → content/references/（含4个子目录）
  - A6-A8: 创建 .ctx/ 并迁移 .vibe_context/ 内容（CONTEXT.md + TIMESTAMPS.md + SNAPSHOT.md + logs/）
  - A9: 重命名 SYSTEM_CLAUDE.md → CLAUDE.md
  - A10: 旧目录（knowledge/、docs/、参考资料/、.vibe_context/）已自动清空
  - A11: 全仓路径引用更新：CLAUDE.md（301→146行）、ARCHITECTURE.md（364→302行）、README.md（202→204行）、copilot-instructions.md、SSOT_INDEX.md、CONTEXT.md
  - A12: 所有核心文档反映新结构
- **结果**: 仓库根目录精简为 README + ARCHITECTURE + CLAUDE.md + index.html + content/ + src/ + .github/ + .ctx/ + assets/，三区边界模糊问题彻底解决
- **风险/回滚**: git 历史可恢复；所有文件内容完整保留，仅路径变更
- **蒸馏标签**: [经验蒸馏: 是] — 大规模文件夹架构迁移的执行策略（先建目标→批量迁移→更新引用→清理旧目录）为可复用项目治理经验

---

### 2026-05-02 日志条目（第三轮）

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: .vibe_context/CONTEXT.md(新建), .vibe_context/AI_CONTEXT.md(删除), .vibe_context/REVIEW_STATE.md(删除), .vibe_context/SNAPSHOT_v1.3/v2.0/v2.1(删除), .vibe_context/SNAPSHOT_v3.0_20260502.md(新建), .github/copilot-instructions.md, SYSTEM_CLAUDE.md, ARCHITECTURE.md, .github/SSOT_INDEX.md, docs/DOCUMENTATION_MAP.md, .vibe_context/FILE_TIMESTAMPS.md
- **关键动作**: C1-C5 AI 上下文快速同步机制实施 + SNAPSHOT v3.0 生成
- **变更详情**:
  - C1: 创建 .vibe_context/CONTEXT.md（约100行），融合 AI_CONTEXT.md + REVIEW_STATE.md + 活跃 SNAPSHOT 核心信息为精简入口
  - C2: 更新 copilot-instructions.md 上下文同步协议，Layer 1 指向 CONTEXT.md
  - C3: 删除 AI_CONTEXT.md（内容已融合至 CONTEXT.md）
  - C4: 删除 REVIEW_STATE.md（内容已融合至 CONTEXT.md）
  - C5: 删除 SNAPSHOT_v1.3/v2.0/v2.1（全部归档），创建 SNAPSHOT_v3.0_20260502.md（按 v2.1 结构格式，反映当前最新状态）
  - 联动更新：ARCHITECTURE.md 分层架构+仓库结构+快速导航；SYSTEM_CLAUDE.md 钩稽矩阵+C1-C5状态+决策日志；SSOT_INDEX.md 已迁移文件索引；DOCUMENTATION_MAP.md 审计层+引用树+状态标记；FILE_TIMESTAMPS.md 结构+已删除记录
- **结果**: .vibe_context/ 从 6 文件+logs 精简至 3 文件+logs（CONTEXT + FILE_TIMESTAMPS + SNAPSHOT_v3.0）；新对话 AI 仅需读 copilot-instructions.md + CONTEXT.md 即可建立完整上下文
- **风险/回滚**: git 历史可恢复；AI_CONTEXT 和 REVIEW_STATE 内容在 CONTEXT.md 中完整保留；旧 SNAPSHOT 内容在 v3.0 中更新反映
- **蒸馏标签**: [经验蒸馏: 是] — 分层上下文加载模式（Layer 0/1/2）和 SNAPSHOT 版本迭代模式为可复用架构经验

---

### 2026-05-02 日志条目（第二轮）

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: SYSTEM_CLAUDE.md, .github/copilot-instructions.md, ARCHITECTURE.md, .github/SSOT_INDEX.md, docs/DOCUMENTATION_MAP.md, .vibe_context/REVIEW_STATE.md
- **关键动作**: SYSTEM_CLAUDE.md 「常为新」重写 + AI 上下文快速同步机制设计 + 最优文件夹架构方案
- **变更详情**:
  - SYSTEM_CLAUDE.md 全面重写：删除所有已完成内容（Phase 1-5 执行清单、README 优化策略、技术产品 Phase 1、历史决策日志冗余条目、已解决暂缓议题 H1/H4）；新增「座右铭：常为新」、钩稽关系与联动规则、AI 上下文快速同步机制（C1-C5）、最优文件夹架构方案（A1-A12，content/ 统一内容 + .ctx/ 替代 .vibe_context/）
  - copilot-instructions.md 新增「上下文同步协议」段落：定义 Layer 0/1/2 分层加载规则，禁止跳层读取和一次性全量加载
  - ARCHITECTURE.md 更新快速导航章节引用（§三→§七）
  - SSOT_INDEX.md 更新已迁移文件索引章节引用（§九→§七，§十→§八）
  - DOCUMENTATION_MAP.md 更新任务域入口和文件状态标记章节引用
  - REVIEW_STATE.md 更新指向引用章节编号
- **结果**: SYSTEM_CLAUDE.md 从 246 行历史堆积精简为 302 行纯未来规划；AI 上下文加载路径从 5-6 文件降为 2 层分级；最优架构方案作为待实施目标纳入路线图
- **风险/回滚**: git 历史可恢复；已完成内容删除不影响执行日志中的历史记录
- **蒸馏标签**: [经验蒸馏: 是] — 钩稽联动规则和分层上下文加载模式为可复用架构经验

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: ARCHITECTURE.md
- **关键动作**: Phase 1.1 — 融合四份文档，重写为单一架构说明
- **变更详情**:
  - 融合 AI_ENTRYPOINT.md（场景路由、AI Rules Summary、变更流水线）
  - 融合 ARCHITECTURE.md（数据模型、依赖链、System Change Pipeline）
  - 融合 SYSTEM_CLAUDE.md §四（技术产品路线图 Phase 1-3）
  - 融合 SSOT_INDEX.md（Agent 注册表摘要）
  - 去除版本号，添加 last_updated 日期戳，标注 [人机] 角色，一章说清全部架构
  - 中文统一，架构清晰，无版本冗余
- **结果**: 架构文档从 v11.0 双语混合改造为单一中文统一架构说明，目标读者 [人机]
- **风险/回滚**: git 历史可回退
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: SYSTEM_CLAUDE.md
- **关键动作**: 调整 Phase 1.2 README.md 安排，延后至最后编辑
- **变更详情**:
  - Phase 1 增加「状态」列
  - Phase 1.1 标记为「✅ 已完成」
  - Phase 1.2 README.md 标记为「❌ 延后至 Phase 1-4 完成后最后编辑」
- **结果**: README 作为对外门面的最后编辑环节确认，避免提前编辑导致重复工作
- **风险/回滚**: 无
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: docs/DOCUMENTATION_MAP.md
- **关键动作**: Phase 1.3 — 扩展为全局文档导航中心
- **变更详情**:
  - 从 3 行目录映射扩展为 166 行全局导航中心
  - 按 8 个权威性层级（Layer 0-7）排序：宪章层→中枢层→制度层→Agent层→代码层→技术文档层→审计层→官方底线层
  - 每个文件标注 [人]/[人机]/[AI] 角色、权威性等级、内容摘要、被引用方
  - 新增引用关系图（ASCII 树形图）
  - 新增按任务域快速入口表（8 个常见任务）
  - 新增文件状态标记系统（✅活跃/🔄待更新/⏳待创建/🗑️待删除）
  - 当前状态一览：标记 AI_ENTRYPOINT.md、governance/、backlog/、scenarios/ 为待删除；README.md 为待最后编辑；AGENT_USAGE.md 为待更新
- **结果**: 全局文档导航中心建立，任何角色均可快速定位所需文件
- **风险/回滚**: git 历史可回退
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: AI_ENTRYPOINT.md, .vibe_context/scenarios/core_logic.md, sop_sync.md, ui_scenario.md
- **关键动作**: Phase 2.1 + 2.3 — 删除已合并/过时的文件
- **变更详情**:
  - 删除 AI_ENTRYPOINT.md（内容已完整合并至 ARCHITECTURE.md §三、§八）
  - 删除 .vibe_context/scenarios/core_logic.md（过时场景定义）
  - 删除 .vibe_context/scenarios/sop_sync.md（过时场景定义）
  - 删除 .vibe_context/scenarios/ui_scenario.md（过时场景定义）
  - 保留 meta_audit.md（待 Phase 2.9 人工评估）
- **结果**: 4 个过时文件已清理，减少根目录和 scenarios/ 冗余
- **风险/回滚**: git 历史可恢复；AI_ENTRYPOINT.md 内容已在 ARCHITECTURE.md 中完整保留
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: governance/SUSPENDED_ISSUES.md, governance/WATCHLIST.md, backlog/PENDING_MODIFICATIONS.md, backlog/COMPLETED_TASKS.md, governance/README.md
- **关键动作**: Phase 2.4-2.8 — 迁移 governance/ 和 backlog/ 至 .vibe_context/
- **变更详情**:
  - 迁移 governance/SUSPENDED_ISSUES.md → .vibe_context/SUSPENDED_ISSUES.md
  - 迁移 governance/WATCHLIST.md → .vibe_context/WATCH_LOG.md（重命名）
  - 迁移 backlog/PENDING_MODIFICATIONS.md → .vibe_context/PENDING_MODIFICATIONS.md
  - 迁移 backlog/COMPLETED_TASKS.md → .vibe_context/COMPLETED_TASKS.md
  - 删除 governance/README.md（目录索引，过时）
  - 删除 governance/ 空目录
  - 删除 backlog/ 空目录
- **结果**: 5 个文件迁移完成，2 个空目录已删除，治理信息统一收敛至 .vibe_context/
- **风险/回滚**: git 历史可恢复；原路径已不存在
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: .vibe_context/scenarios/meta_audit.md
- **关键动作**: Phase 2.9 — 评估 meta_audit.md，判定整文件过时后删除
- **变更详情**:
  - 逐段评估 7 个段落与当前宪章和架构的一致性
  - §1 Execution Logging Rule: 日志格式已改为来源/时间/变更文件/关键动作/变更详情/结果/风险/蒸馏标签 → 过时
  - §2 Delete + Log Rule: 与宪章"遗留资产清理"规则一致但已完整覆盖 → 冗余
  - §3 Scenario Registry Guard: 核心场景固定为 4 → 3 个场景文件已删除，注册表规则已废弃
  - §4 Experience Distillation: 与 experience-distiller Skill 功能重复
  - Snapshot Freeze Note: 与当前 3 个 SNAPSHOT 共存状态不一致
  - Pre-Execution Checklist: 与三步标准化工作流冲突
  - 结论: 整文件过时，直接删除
  - 清空 .vibe_context/scenarios/ 空目录
- **结果**: Phase 2 全部完成，.vibe_context/scenarios/ 目录已清空并删除
- **风险/回滚**: git 历史可恢复；§2 规则已在宪章中完整保留
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: README.md, ARCHITECTURE.md, docs/DOCUMENTATION_MAP.md, .github/SSOT_INDEX.md
- **关键动作**: Phase 3 — 版本号与引用统一
- **变更详情**:
  - README.md: version "6.2" → last_updated "2026-05-01"
  - README.md: AI_ENTRYPOINT.md 引用×2 → ARCHITECTURE.md
  - README.md: governance/ 引用×3 → .vibe_context/
  - README.md: backlog/ 引用×3 → .vibe_context/
  - README.md: AI_CONTEXT.md 引用 → copilot-instructions.md
  - ARCHITECTURE.md: 仓库结构中移除 governance/ 和 backlog/，新增迁移文件条目
  - ARCHITECTURE.md: scenarios/ 标注"已清空删除"
  - docs/DOCUMENTATION_MAP.md: 4 项状态标记从 🗑️ 更新为 ✅
  - SSOT_INDEX.md: 审查顺序新增 SYSTEM_CLAUDE.md 为第 2 步
  - SSOT_INDEX.md: 新增"已迁移文件索引"表（6 条记录）
- **结果**: 全仓无任何文件引用已删除的 AI_ENTRYPOINT.md、governance/、backlog/ 路径
- **风险/回滚**: git 历史可恢复
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: docs/AGENT_USAGE.md, docs/DOCUMENTATION_MAP.md, .vibe_context/logs/EXECUTION_LOG_INDEX.md, .vibe_context/SNAPSHOT_v2.0_20260401.md, .vibe_context/SNAPSHOT_v2.1_20260406.md
- **关键动作**: Phase 4 — 文档内容更新
- **变更详情**:
  - 4.1: AGENT_USAGE.md 从旧版 6 部门 Cheat Sheet 重写为 10-Agent 模型（注册表+委派链路+治理闭环+调用方式+授权机制+口令示例）
  - 4.2: DOCUMENTATION_MAP.md AGENT_USAGE.md 状态从 🔄 更新为 ✅
  - 4.3: EXECUTION_LOG_INDEX.md 更新至当前月份（2026-05），新增 4 月归档条目，去除 version 号
  - 4.4: SNAPSHOT_v2.0 状态从 ACTIVE → ARCHIVED；SNAPSHOT_v2.1 状态从 BASELINE → CURRENT BASELINE；v1.3 已标记 DEPRECATED 无需修改
- **结果**: Phase 4 全部完成，Phase 1-4 文件架构重整仅剩 README.md 最终定稿
- **风险/回滚**: git 历史可恢复
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-01 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-01
- **变更文件**: README.md, SYSTEM_CLAUDE.md
- **关键动作**: Phase 1.2 — 精简 README.md 为对外门面（最终编辑环节）
- **变更详情**:
  - README.md 从 288 行精简至 202 行（-30%）
  - 去除冗余技术细节：前端架构解析（ES6模块化结构）、RBAC双轨视图模型、归档库模式、日历四色圆点、变更黄金铁律等已完整覆盖在 ARCHITECTURE.md 中
  - 新增：简化仓库结构树（含角色标注）、迭代路线图摘要表、开源协作贡献规则（Issue/PR/Change Trace 四要素）、License
  - 保留：一句话项目介绍+三要点、新人5分钟上手、按角色快速导航、Agent 注册表摘要、知识库导航
  - SYSTEM_CLAUDE.md Phase 1 标记全部完成
- **结果**: Phase 1-4 文件架构重整全部完成
- **风险/回滚**: git 历史可恢复
- **蒸馏标签**: [经验蒸馏: 否]

---

### 2026-05-02 日志条目

- **来源**: 秘书处（Agent Mode 协调执行）
- **时间**: 2026-05-02
- **变更文件**: .vibe_context/COMPLETED_TASKS.md, .vibe_context/PENDING_MODIFICATIONS.md, .vibe_context/SUSPENDED_ISSUES.md, .vibe_context/WATCH_LOG.md, SYSTEM_CLAUDE.md, .vibe_context/AI_CONTEXT.md, .vibe_context/REVIEW_STATE.md, ARCHITECTURE.md, .github/SSOT_INDEX.md, docs/DOCUMENTATION_MAP.md, .vibe_context/FILE_TIMESTAMPS.md
- **关键动作**: .vibe_context/ 二次清理 + 全文件时间戳同步机制建立
- **变更详情**:
  - Phase 1 文件迁移：删除 COMPLETED_TASKS.md（日志已覆盖）、WATCH_LOG.md（全部已解决）；将 PENDING_MODIFICATIONS.md 内容整合至 SYSTEM_CLAUDE.md §九、SUSPENDED_ISSUES.md 内容整合至 SYSTEM_CLAUDE.md §十
  - Phase 1 文档更新：AI_CONTEXT.md 移除过时场景路由和治理目录引用；REVIEW_STATE.md 精简为控制面板摘要；ARCHITECTURE.md 更新 .vibe_context/ 结构；SSOT_INDEX.md 更新已迁移文件索引；DOCUMENTATION_MAP.md 更新文件状态标记
  - Phase 2 时间戳同步：创建 .vibe_context/FILE_TIMESTAMPS.md，基于 git log 提取全项目文件最后更新时间，格式 YYYY-MM-DD HH:MM:SS，含更新规则、已删除文件记录
  - .vibe_context/ 从 12 个文件精简至 6 个文件 + logs/ 目录
- **结果**: .vibe_context/ 仅保留运行时必需文件（AI_CONTEXT + REVIEW_STATE + FILE_TIMESTAMPS + 3 SNAPSHOT + logs/），治理信息全部收敛至 SYSTEM_CLAUDE.md
- **风险/回滚**: git 历史可恢复；PENDING_MODIFICATIONS 和 SUSPENDED_ISSUES 内容已在 SYSTEM_CLAUDE.md 中完整保留
- **蒸馏标签**: [经验蒸馏: 否]

---

## 2026-05-02 14:30 | CLAUDE.md 系统性清理 + 界面 CSS 规范化

- **来源**: 书记直接任务委派
- **时间**: 2026-05-02 14:30
- **操作者**: Trae IDE Agent (DeepSeek-V4-Pro)
- **类型**: 文档清理 + 代码修改
- **目标文件**:
  - `CLAUDE.md`（597→255行，清洗+精简）
  - `index.html`（1374→958行，重复内容清除）
  - `src/styles.css`（7处边框颜色修改）
  - `content/guides/SOP优化提案反馈卡.md`（emoji清理）
  - `content/SOP/README.md`（emoji清理）
  - `content/references/模板库/活动复盘/README.md`（emoji清理）
  - `content/README.md`（emoji清理）
  - `content/guides/README.md`（emoji清理）
  - `content/references/README.md`（emoji清理）
- **关键动作**:
  - T1 完成状态清理：删除 CLAUDE.md §二/§八/§十 中已完成 R1 条目
  - T2 §九 DESIGN-OPT 精简：删除与 DESIGN_SYSTEM.md 重复的 434 行设计规范，保留核心规划内容 ~120 行（缩减 72%）
  - T3 Emoji 规范化：§八 🔴🟠🟡🟢 → P0/P1/P2/P3
  - T4 index.html 修复：修正 1 处旧路径 + 删除 417 行重复内容
  - T5 CSS 边框主题色化：7 处角色卡片 .active 状态边框 neutral-300 → primary-700
  - T6 全仓装饰性 emoji 清理：6 个文件
  - T7 中文乱码扫描：零异常
- **变更详情**:
  - CLAUDE.md：删除 7 个已完成标记，合并 DESIGN_OPT 冗余，统一 emoji 替换为文字级优先级
  - index.html：清理 Git 合并残留导致的 417 行尾部重复，修正 SOP 反馈卡路径
  - src/styles.css：侧边栏角色卡片选中态现在正确体现主题色（党建红 #CE1126）而非灰色
- **结果**: CLAUDE.md 遵循"常为新"原则，仅保留活跃/未来任务；网页内容无装饰性 emoji；侧边栏选中卡片使用主题色边框
- **风险/回滚**: 纯视觉层变更，无逻辑影响；git 历史可恢复所有被删内容
- **蒸馏标签**: [经验蒸馏: 否]

---

## 2026-05-02 20:00 | E1+E2 架构设计 + T1-T3 机制建设 + CLAUDE.md 刷新

- **来源**: 书记直接任务委派（继续 E1/E2 + 新增 T1-T3）
- **时间**: 2026-05-02 20:00
- **操作者**: Trae IDE Agent (DeepSeek-V4-Pro) + 2x workflow-architect
- **类型**: 架构规划 + 机制设计 + 文档产出

### E1: 组织建设独立模块规划
- **产出**: `content/guides/ORGANIZATION_BUILDING_MODULE.md` (484 行)
- **关键设计决策**: 方案 A 胜出 — 第 4 个 module-tab "党务管理"（与推演/指南/模板并列），零新增 CSS
- **覆盖**: 双域定位 / 方案 ABC 对比 / ASCII 界面线框图 / 引用渲染首次落地 / P0-P3 实施细则

### E2: 管理模式架构设计
- **产出**: `content/guides/MANAGEMENT_MODE_ARCHITECTURE.md`
- **关键设计决策**: 三级管理模式（组织者/深度参与者/普通参与者）考勤 vs 参与记录双轨
- **场景验证**: 宣讲团建设 + 人生回望录双重场景
- **覆盖**: ASCII 架构图 / 8x8 角色权限矩阵 / 短期&长期对比 / 组织者+纪检界面设计 / Phase 1-4 路径

### T1: 经常性工作管理机制
- **产出**: `content/guides/RECURRING_TASKS_MECHANISM.md`
- **设计**: 2 周级 + 6 月级 + 4 季/年级周期性任务
- **架构**: TIMESTAMPS.md 追踪 → SCHEDULER → DISPATCHER → 三步工作流闭环
- **唤醒**: copilot-instructions 会话入口检查 + /check-recurring 手动指令

### T2: 术语规范使用说明
- **产出**: `content/guides/TERMINOLOGY_STANDARDS.md`
- **核心**: "活动建设"/"组织建设"为个人临时划分，正式文档须用官方标准术语
- **追溯**: 纪检委员手册双域职责的历史背景

### T3: SOP 文档与模板库优化方向
- **产出**: `content/guides/SOP_WEB_OPTIMIZATION.md`
- **设计**: SOP-网页四步联动闭环（展示审查→倒推修改→SOP更新→网页同步）
- **覆盖**: 结构化标准 / 字数精简原则 / 模板可用性 / 诊断→修改→同步三阶段

### CLAUDE.md 同步更新
- §八: E1/E2 移除（已完成），新增 T1a/T3a 实施类任务
- §七 决策日志: +5 条新决策记录
- DOCUMENTATION_MAP: 新增 5 个 Layer 5 条目 + 引用关系图 + 代码层&治理机制层

- **结果**: E1/E2 架构完整可进入编码；T1-T3 机制具备可操作性；CLAUDE.md 反映最新进度
- **风险/回滚**: 纯文档变更，零破坏性
- **蒸馏标签**: [经验蒸馏: 否]

---

### Session T24-3 | 侧边栏/字体/布局综合修复 | 2026-05-05

**执行内容**：
1. 字体闪烁修复：`.font-title-cn` 移除 Noto Serif SC，仅依赖本地字体；移除 `fonts-not-loaded` 类切换机制（6 个 HTML 文件）
2. 侧边栏统一 overlay 模式：移除 `margin-left: 260px` 挤压逻辑；header.js 移除 `sidebar-shifted` 操作；sidebar.js 角色卡片点击后统一关闭侧边栏
3. 活动分类多选：workspace.html `<select>` → checkbox 多选（学习/会议/参访/座谈/共建）
4. 主页布局 2+1：`grid-cols-3` → `grid-cols-2` + 独立日历卡片；删除副标题 p；h2 text-xl → text-2xl
5. 侧边栏品牌区移除：sidebar.js 移除 sidebar-header/sidebar-brand 区块
6. 主页侧边栏重构：移除旧的内联角色卡片和归档区，改为与子页面一致的 sidebar-nav + sidebar-footer 结构
7. "关于"入口统一：所有页面侧边栏底部放置"关于"链接

**修改文件**：
- docs/src/styles.css（字体、overlay、hover 过渡）
- docs/src/components/sidebar.js（品牌区移除、overlay 关闭）
- docs/src/components/header.js（overlay 模式）
- docs/index.html（布局 2+1、侧边栏重构、字体机制移除）
- docs/workspace.html（活动分类多选、字体机制移除）
- docs/party.html / search.html / archive.html / about.html（字体机制移除）
- docs/src/workspace-entry.js（多选逻辑）

**验证**：localhost:8084 六页面零功能性错误
