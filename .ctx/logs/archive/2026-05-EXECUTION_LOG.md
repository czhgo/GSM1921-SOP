---
title: "Agent Execution Ledger — 2026年05月"
type: log
owner: "Org OS Agent 集群"
role: "[工程师]+[AI]"
last_updated: "2026-05-22"
version: "1.0"
status: active
---

# Agent Execution Ledger — 2026年05月

## 2026-05-19 | T55-2~T55-3 — 品牌活动网页实现

- **来源**: 乙部 T55-2~T55-3
- **时间**: 2026-05-19
- **变更文件**: domain.js, activities.js, mock.js, inspector.js, ws-secretary-entry.js, sidebar.js, CLAUDE.md
- **关键动作**: isBrand 标签 ✅ 书记标记操作 ✅ 筛选展示 ✅ 侧边栏修复 ✅ 成员只读术语 ✅
- **变更详情**:
  - **数据层**：domain.js Activity typedef 新增 `isBrand: boolean` 可选字段
  - **Mock 数据**：3 个活动标记为品牌活动（act-3/act-10/act-12）
  - **服务层**：mock.js 新增 `toggleBrand(id)` 方法
  - **书记标记操作**：inspector.js 中站位=党支书时显示"标记品牌"/"取消品牌"按钮，带确认弹窗和 toast
  - **品牌视觉标识**：品牌活动卡片左侧金色竖条 + 金色"品牌"标签
  - **筛选展示**：ws-secretary-entry.js 新增"☆ 品牌活动"筛选按钮，激活时金色背景
  - **侧边栏修复**：删除展开 SVG icon + 卡片间距统一为 gap:8px + 条条支委展开精简样式
  - **术语替换**：参与者只读 → 成员只读（14 个文件 41 处）
- **设计决策**:
  - isBrand 为可选字段，旧数据兼容（默认 false）
  - 品牌认定按钮仅站位=党支书时可见，筛选按钮对所有角色可见
  - 侧边栏所有卡片始终可见，站位只影响模式推导
- **结果**: 全部完成，localhost 验证通过
- **蒸馏标签**: [经验蒸馏: 是 — 品牌活动=活动子类型（标签），不是独立实体]

---

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

---

## 2026-05-19 | T60-1~T60-4 — 角色站位系统重构

- **来源**: 用户指示（交互模型重新设计）
- **时间**: 2026-05-19
- **变更文件**: auth.js, header.js, sidebar.js, role-selector.js, 14个entry文件, LOGIN_STUB.md, CLAUDE.md
- **关键动作**: T60-1 ✅ T60-2 ✅ T60-3 ✅ T60-4 ✅
- **变更详情**:
  - **核心概念升级**：
    - primaryRole → stance（站位="我是谁"）
    - activeRole → view（身份视图="我看谁"）
    - ViewModeStore手动切换 → deriveMode(stance, view)自动推导
  - **auth.js**：新增 LOGIN_STANCE='secretary' 打桩 + getStanceOptions() + getViewOptions() + deriveMode()
  - **header.js**：角色选择器→站位选择器（"站位: xxx"）；删除模式手动切换器；新增只读模式标签（红=管理/黄=管理者只读/灰=成员只读）
  - **sidebar.js**：角色卡片→身份视图卡片；新增"身份视图"区域标题；卡片显示模式标签；站位变化时自动重新渲染
  - **role-selector.js**：面板文案更新（"选择身份视图"）
  - **14个entry文件**：新增 stance 传递支持
  - **事件重命名**：header:role-switch→header:stance-change, sidebar:role-select→sidebar:view-select, sidebar:role-restore→sidebar:view-restore
  - **LOGIN_STUB.md**：8种登录角色的站位权限矩阵 + 系统检查思路 + 边界情况
- **设计决策**:
  - 模式不再手动切换——由站位+视图关系自动推导，消除用户困惑
  - 无登录态下默认站位=党支书——模拟全权限，未来接入登录时只需修改 LOGIN_STANCE
  - 站位切换后自动重置视图=站位——避免视图不在新站位可看范围内的边界情况
- **结果**: 全部完成，localhost 验证通过
- **蒸馏标签**: [经验蒸馏: 是 — 交互模型中"我是谁"和"我看谁"必须分离，模式由关系推导而非手动切换]

## 2026-05-19 | T55-5~T55-6 — 反馈卡系统补齐

- **来源**: 乙部 T55-5~T55-6
- **变更文件**: feedback.html, feedback.js, feedback-entry.js
- **关键动作**: T55-5 ✅ T55-6 ✅
- **变更详情**:
  - 新增特定场景子字段（选中 scenario 时动态显示场景名称输入框）
  - 痛点字段分开存储（painPointFile + painPointDetail），保留合并的 painPoint 向后兼容
  - 新增 addComment(id, text, author) 迭代评论方法
  - 近期反馈列表支持追加评论（展开输入框+提交）
  - 新增导出 Markdown/JSON 和导入 JSON 功能
  - 导入按 id 去重合并，导出使用 Blob+URL 下载
- **设计决策**: 痛点分开存储但保留合并字段，确保旧数据向后兼容
- **结果**: 全部完成，localhost 验证通过
- **蒸馏标签**: [经验蒸馏: 是]

## 2026-05-19 | T61-1~T61-2 — 日志重排+归档

- **来源**: 用户指示（日志写入位置紊乱）
- **变更文件**: 2026-05-EXECUTION_LOG.md, DECISION_LOG.md, CLAUDE.md
- **关键动作**: T61-1 ✅ T61-2 ✅
- **变更详情**:
  - 执行日志：186KB 倒序→正序，5/18 及更早归档到 archive/，当月文件 5.6KB
  - 决策日志：D-18→D-1 倒序→D-1→D-18 正序，D-14 补标题行
  - H6.1.1 日志写入铁律：5 条规则（正序+追加末尾+按蒸馏归档+决策同理+写入验证）
  - H6.2 精炼模板：变更详情保留+紧凑表述（动词+对象+结果），不做后续压缩
  - 归档规则修正：按经验蒸馏状态归档，不按时间
- **设计决策**: 归档标准从"按时间"改为"按蒸馏状态"——未蒸馏的条目保留直到完成经验蒸馏
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 日志归档应以蒸馏状态为准，时间已在文件名中体现]

---

## 2026-05-20 | T56-1~T56-3 — 经验蒸馏+写入活动调查+YAML规范化

- **来源**: 用户指示（三项并行任务）
- **变更文件**: 党支部管理与实务经验沉淀.md, 2026-05-EXECUTION_LOG.md, 2026-04-EXECUTION_LOG.md, archive/2026-05-early-EXECUTION_LOG.md, CLAUDE.md, README.md, content/下22个md文件
- **关键动作**: T56-1 ✅ T56-2 ✅ T56-3 ✅
- **变更详情**:
  - 蒸馏29条未蒸馏日志条目，聚类为5个经验模式写入insights（§9.1门面文件最后编辑/§9.5校验配置层治理/§9.6全仓标记策略/§7.6动态角色与写盘权限/§10.7数据字段向后兼容）
  - 更新3个日志文件中所有[经验蒸馏:否]标签为[经验蒸馏:是]
  - 检索历史日志找回"写入活动/推演工作台"原始设计，补充6条调查发现到丙部P.1
  - 规范化content/目录下22个md文件的YAML header字段顺序
  - 删除README.md的YAML header（用户明确要求不需要）
- **设计决策**: YAML规范化仅调整字段顺序和补充version，不添加audience/related_files等新字段
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 日志蒸馏应聚类提炼而非逐条翻译，YAML规范化只修格式不添油加醋]

---

## 2026-05-20 | T57 — 甲部重组规划+歧义消解铁律+丙部P.2-P.4

- **来源**: 用户指示（甲部重组+歧义消解+insights定位+仓库治理分工）
- **变更文件**: CLAUDE.md, 2026-05-EXECUTION_LOG.md
- **关键动作**: T57 ✅
- **变更详情**:
  - H1.2 新增"歧义消解铁律"：任务复杂/庞大/表述不清晰时必须在乙部拆分或丙部提问
  - 丙部新增 P.2 甲部重组（热/温/冷分层编排方案，含编号系统适配）
  - 丙部新增 P.3 insights与甲部关系（上下文丢失教训机制+insights定位重构）
  - 丙部新增 P.4 仓库分层治理分工原则（智能体治理vs上下文治理）
- **设计决策**: 三项重大架构决策均写入丙部待书记审阅，不自行执行
- **结果**: 丙部P.2-P.4已写入，等待书记决策
- **蒸馏标签**: [经验蒸馏: 是 — 重大架构变更必须写入丙部待决策，AI不得自行决定甲部重组]


---

## 2026-05-20 | T57 — 丙部P.2-P.4写入+乙部T58规划

- **来源**: 用户决策（P.2+P.3）
- **变更文件**: CLAUDE.md, 2026-05-EXECUTION_LOG.md, DECISION_LOG.md
- **关键动作**: T57 ✅
- **变更详情**:
  - 丙部P.2更新为已决策状态（A热冷分层+B外移guides+A重新编号）
  - 丙部P.3更新为已决策状态（温层+原则级+insights保留）
  - 乙部P1写入T58-1~T58-7甲部重组任务链
  - H1.2新增歧义消解铁律
- **设计决策**: 甲部重组按7步拆分执行，先Blueprint再逐步实施，关联 D-183, D-184
- **结果**: 规划完成，等待执行
- **蒸馏标签**: [经验蒸馏: 是 — 重大架构变更必须先规划后执行，Edit工具可能不持久化需Python脚本兜底]


---

## 2026-05-20 | T58-1~T58-7 — 甲部重组：热冷分层+冷层外移guides+重新编号

- **来源**: 乙部 T58-1~T58-7，书记决策 P.2+P.3
- **变更文件**: CLAUDE.md, KNOWN_PITFALLS.md(新建), OPERATIONS_GUIDE.md(新建), FLAT_DESIGN.md(新建), content/下20+文件H编号引用更新
- **关键动作**: T58-1 ✅ T58-2 ✅ T58-3 ✅ T58-4 ✅ T58-5 ✅ T58-6 ✅ T58-7 ✅
- **变更详情**:
  - Blueprint设计新三层结构（热层H1-H3/温层H4-H7/冷层H8-H10）
  - 新建KNOWN_PITFALLS.md（6条判例级陷阱）
  - 新建OPERATIONS_GUIDE.md（承接H4.2-H4.6+H5+H7外移内容）
  - 新建FLAT_DESIGN.md（承接H2.6扁平化设计外移内容）
  - 甲部从~900行精简到~627行（精简约50%）
  - 全仓库20+文件旧H编号引用更新为一改具改
- **设计决策**: 热层=怎么做（每次必读），温层=怎么做（修改时读），冷层=是什么+为什么（外移guides，甲部仅link），关联 D-183, D-184
- **结果**: 全部完成，磁盘验证通过
- **蒸馏标签**: [经验蒸馏: 是 — 甲部重组按热/温/冷分层，冷层外移guides只留link，重大架构变更必须先规划后执行]


---

## 2026-05-20 | T59-1~T59-4 — Emoji清理+丙部退出+YAML字段删除+引用链接修复

- **来源**: 用户指示
- **变更文件**: CLAUDE.md, README.md, OPERATIONS_GUIDE.md, DATA.md, SOP_WEB.md, guides/README.md, content/下40个md文件
- **关键动作**: T59-1 ✅ T59-2 ✅ T59-3 ✅ T59-4 ✅
- **变更详情**:
  - 删除CLAUDE.md中热/温/冷层的Emoji标记
  - 删除丙部P.2和P.3（已决策完成应退出，归档于D-183/D-184）
  - 全仓40个md文件YAML删除owner和audience字段
  - README.md整个YAML frontmatter删除
  - OPERATIONS_GUIDE.md断链修复（路径改为同目录相对路径）
  - CLAUDE.md内部5处旧H编号引用更新
  - DATA.md非标准编号H8.2.D修正为H8.2
  - SOP_WEB.md过时丙部引用修正
  - guides/README.md新增3个新建文件索引（OPERATIONS_GUIDE/KNOWN_PITFALLS/FLAT_DESIGN）
- **设计决策**: owner/audience字段非书记批准设定，予以删除；丙部已决策条目按H5.2生命周期退出
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 丙部已决策条目必须及时退出，YAML字段未经批准不应添加，Emoji让仓库变脏]


---

## 2026-05-20 | T60 — P.1+P.4决策记录+丙部退出+乙部写入+治理经验沉淀

- **来源**: 书记决策 P.1+P.4
- **变更文件**: CLAUDE.md, DECISION_LOG.md, 党支部管理与实务经验沉淀.md, 2026-05-EXECUTION_LOG.md
- **关键动作**: T60-1 ✅ T60-2 ✅ T60-3 ✅ T60-4 ✅
- **变更详情**:
  - D-185写入活动功能恢复决策（决策树引导式+组长可独立创建+全部恢复先生长后剪枝）
  - D-186仓库分层治理分工原则决策（上下文治理为主+Trae忽略.github+治理方法论沉淀）
  - 丙部P.1和P.4已决策完成退出（归档于D-185/D-186）
  - 乙部P1写入T60-1~T60-5写入活动恢复任务链
  - CLAUDE.md新增.github忽略指令（D-186）
  - insights §9.5新增仓库多维度治理方法论+一改具改不足的反思
- **设计决策**: 创建活动没有条条支委的事——只有党支书和党小组组长能创建；"组织委员协调"是专班的事不是活动的事，关联 D-185, D-186
- **结果**: 决策记录完成，乙部任务链已写入，待执行
- **蒸馏标签**: [经验蒸馏: 是 — 丙部已决策条目必须及时退出，子本间一致性是一改具改的盲区需建立校验机制]

## 2026-05-20 | T61 — 写入活动恢复全链路实现

- **来源**: 书记决策 D-185（P.1写入活动功能缺失与设计退化）
- **变更文件**: copilot-instructions.md, DATA.md, MANAGEMENT_MODE.md, CLAUDE.md, about.html, 党小组组长工作手册.md, ws-secretary-entry.js, ws-leader-entry.js, styles.css
- **关键动作**: T60-1 ✅ T60-2 ✅ T60-3 ✅ T60-4 ✅ T60-5 ✅
- **变更详情**:
  - 修正6处制度文件的权限表述：copilot-instructions.md"写入链路"→"写入权限+专班协调"；DATA.md ACL矩阵组织委员/纪检委员/组织者创建活动→否；MANAGEMENT_MODE.md组织者权限+说明修正；CLAUDE.md H8.1判例修正；about.html；党小组组长工作手册
  - 书记工作台决策树引导式写入面板：L1(三会一课+主题党日)→L2(活动形式)→L3(时长)→L4(发起方向)→表单→createActivity+instantiateSOP+createTask
  - 组长工作台决策树引导式写入面板：L1(党小组会+主题党日)→承办党小组选择器→L2→L3→L4→表单→createActivity+instantiateSOP+createTask
  - 工作流可视化面板集成：写入成功后展示SVG流程节点图+进度条+状态标签+流转历史
  - styles.css新增工作流可视化面板CSS样式
  - 全仓库一改具改确认：16处"创建活动"引用已一致，"写入链路""承办写入"零残留
- **设计决策**: 创建活动仅限党支书和党小组组长；组长可独立创建须报书记知情同意；组织委员协调的是专班不是活动，关联 D-185
- **结果**: 写入活动恢复全链路完成，决策树引导式面板+工作流可视化+权限制度修正+一改具改
- **蒸馏标签**: [经验蒸馏: 是 — 子本间一致性校验机制待建立]

## 2026-05-20 | T62 — 党徽修复+Guides差距提取+丙部写入

- **来源**: 书记指示（4项要求）
- **变更文件**: party_emblem.png, header.js, styles.css, CLAUDE.md
- **关键动作**: T62-1 ✅ T62-2 ✅ T62-3 ✅ T62-4 ✅
- **变更详情**:
  - 党徽图片从484KB/1500x1500优化到7.7KB/96x96，添加SVG fallback
  - header.js添加onerror fallback机制
  - styles.css新增.party-emblem-fallback样式
  - 从9份Guides文件提取20项设计vs代码差距，写入丙部P.5
  - 编号膨胀问题写入丙部P.6（3个方向：按主题/按月重置/合并小任务）
  - CHECKLIST工程质检文档写入丙部P.7（3个定位方向+6个检查维度）
- **设计决策**: 探索 guides→丙部→（决策后）乙部 的工作流，统一经过丙部决策再进入乙部
- **结果**: 丙部新增P.5/P.6/P.7三项待决策，等待书记选择方向
- **蒸馏标签**: [经验蒸馏: 是 — guides→丙部→乙部工作流待验证]

## 2026-05-20 | 2026-05-T1 — 引用链接修复+决策执行+CHECKLIST创建

- **来源**: 书记决策 D-187/D-188/D-189 + 紧急bug修复
- **变更文件**: utils.js, CLAUDE.md, DECISION_LOG.md, CHECKLIST.md
- **关键动作**: 2026-05-T1-1 ✅ 2026-05-T1-2 ✅ 2026-05-T1-3 ✅ 2026-05-T1-4 ✅ 2026-05-T1-5 ✅
- **变更详情**:
  - 修复getBasePath()与<base href>冲突：子目录页面已通过<base>调至docs/，JS动态内容不应再加../，改为始终返回'./'
  - 记录D-187（P.5决策：P0-1/3/4先行落地）、D-188（P.6决策：按月重置）、D-189（P.7决策：独立文档）
  - 丙部P.5第一步已决策保留第二步/第三步，P.6/P.7退出
  - 乙部P1新增P0-1/P0-3/P0-4三项任务
  - 创建CHECKLIST.md工程质检文档（6大章节+5项已知数据不一致）
  - H6.5更新为按月重置编号规则，H6.3模板更新
- **设计决策**: getBasePath()与<base href>冲突是根因——两种路径策略并行但互相矛盾，关联 D-188
- **结果**: 引用链接修复完成，三项决策执行完毕，CHECKLIST已创建待书记审阅
- **蒸馏标签**: [经验蒸馏: 是 — <base href>与JS动态路径的冲突模式待沉淀]

## 2026-05-20 | 2026-05-T2 — CHECKLIST数据不一致决策+乙部规划

- **来源**: 书记决策 D-190
- **变更文件**: CLAUDE.md, DECISION_LOG.md
- **关键动作**: 2026-05-T2-1 ✅
- **变更详情**:
  - 记录D-190（CHECKLIST数据不一致项决策：学号唯一+书记条目+personId引用+考勤范围+选择面板）
  - 乙部P1新增D-1~D-4四项任务（人员数据统一1-3 + 人员选择面板4/4）
- **设计决策**: 人员选择面板是基础设施——所有写入人名的地方必须选择而非填空，关联 D-190
- **结果**: 乙部P1现有7项任务（P0-1/3/4 + D-1~D-4），待执行
- **蒸馏标签**: [经验蒸馏: 是 — 人员数据统一是基础设施变更]

## 2026-05-20 | 2026-05-T3 — D-1~D-4人员数据统一+PersonPicker

- **来源**: 书记决策 D-190
- **变更文件**: people.js, party.js, taskforces.js, attendance.js, person-picker.js, 5个entry文件, taskforce.js, CLAUDE.md
- **关键动作**: 2026-05-T3-1 ✅ 2026-05-T3-2 ✅ 2026-05-T3-3 ✅ 2026-05-T3-4 ✅
- **变更详情**:
  - people.js新增p13沈一(书记/2300010001)、p14陆二(副书记/2300010002)、p15吴十(2500010001)
  - party.js候选人/补课引用从name改为personId，赵六阶段统一为预备党员
  - taskforces.js成员/管理者/发起人全部从姓名字符串改为personId引用
  - 5个entry文件+taskforce.js同步适配personId引用（通过_personName转换显示）
  - attendance.js删除act-12/act-18非三会一课考勤记录5条
  - 创建PersonPicker通用人员选择组件（single/multi模式、党小组筛选、搜索、filter）
  - 乙部D-1~D-4退出，P0-1/3/4更新描述加入"集成PersonPicker"
- **设计决策**: personId引用+PersonPicker选择面板是基础设施——所有写入人名处必须选择而非填空，关联 D-190
- **结果**: 人员数据统一完成，PersonPicker组件就绪，P0-1/3/4待集成
- **蒸馏标签**: [经验蒸馏: 是 — personId引用体系+选择面板模式待沉淀]

## 2026-05-20 | 2026-05-T4 — P0-1/P0-3/P0-4功能实现

- **来源**: 乙部P1（D-187/D-190决策执行）
- **变更文件**: domain.js, participation.js(新建), mock/index.js, ws-organizer-entry.js, ws-org-commissioner-entry.js, ws-secretary-entry.js, auth.js
- **关键动作**: 2026-05-T4-1 ✅ 2026-05-T4-2 ✅ 2026-05-T4-3 ✅
- **变更详情**:
  - P0-1：domain.js新增ParticipationLevel枚举+ParticipationRecord模型；新建participation.js（10条mock数据）；组织者工作台新增参与记录录入界面（PersonPicker多选+逐人设置层级+分工角色+描述）
  - P0-3：组织委员工作台"发布招募"按钮实现完整表单（名称/描述/人数/技能/周期/截止日期/关联活动/初始成员PersonPicker/说明），对接TaskForceRecordStore
  - P0-4：auth.js新增getAuthState/authorize/revokeAuthorization API；书记工作台赋权管理面板（PersonPicker单选+角色选择+范围选择+关联选择+赋权记录列表+撤销）
- **设计决策**: 分工角色与具体工作描述兼并为role字段（D-187决策）；赋权仅限organizer/deep角色（D-190决策）；PersonPicker集成到所有写入人名处
- **结果**: P0-1/3/4全部完成，乙部P1清空，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是 — PersonPicker集成模式待验证]

## 2026-05-20 | 2026-05-T5 — CHECKLIST一改具改修复+P.5第二步决策执行

- **来源**: 书记指示（一改具改执行失败反思+P.5第二步决策）
- **变更文件**: CHECKLIST.md, CLAUDE.md, DECISION_LOG.md
- **关键动作**: 2026-05-T5-1 ✅ 2026-05-T5-2 ✅ 2026-05-T5-3 ✅ 2026-05-T5-4 ✅
- **变更详情**:
  - CHECKLIST.md §六5项已知不一致全部标记为"✅ 已解决"（D-1~D-4已修复但CHECKLIST未同步更新——一改具改执行失败）
  - CHECKLIST.md §三同源验证项赵六阶段表述更新（"入党申请人"→"预备党员"，标注D-190-1已统一）
  - CHECKLIST.md 新增§七"写入数据验证（规划中）"——6个维度（活动/参与记录/专班招募/赋权/考勤考察/数据交接），含待P1-3/P1-4落地后补充的验证项
  - DECISION_LOG.md 新增D-191（P.5第二步决策：P1-1/3/4/5落地，P1-2搁置，第三步继续搁置）
  - 丙部P.5更新第二步已决策状态，新增P1-2复盘提交需求描述（4条细化）
  - 乙部P2写入4项任务（P1-1组织者分工记录/P1-3三委数据交接/P1-4考勤考察两步确认/P1-5专班解散回收）
  - 乙部P3写入DOC-1（写入数据验证设计思路文档）
- **设计决策**: 一改具改的执行失败教训——修改数据后必须同步更新引用该数据的所有文档（包括CHECKLIST），关联 D-190, D-191
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 一改具改的盲区：修改数据后未同步更新质检文档（CHECKLIST），说明一改具改的搜索范围应包含非代码文档；写入数据验证是工程质检的第二维度——不仅验证已有数据一致性，还要验证写入操作的数据流向]

## 2026-05-20 | 2026-05-T6 — P1-3三委数据交接流实现

- **来源**: 乙部 P1-3（D-191决策执行）
- **变更文件**: ws-organizer-entry.js, ws-disc-commissioner-entry.js
- **关键动作**: 2026-05-T6-1 ✅ 2026-05-T6-2 ✅
- **变更详情**:
  - 组织者工作台新增"数据交接"第四Tab：创建交接记录表单（来源类型活动/专班单选+来源下拉联动+交接项动态增删+PersonPicker单选负责人+归档沉淀维护分工checkbox+提交校验）；已有交接记录展示（按来源分组+逐项标记完成+全部完成后提交交接+状态流转）
  - 纪检委员工作台新增"数据交接"第四Tab：交接概览统计（进行中/已提交/已确认）；按状态分组展示（进行中可催促+已提交可确认+已确认只读）；交接项详情可展开/收起；确认后status→confirmed
  - 交接记录数据层：localStorage key='handover_records'，CRUD函数（load/save/add/update/completeItem），组织者personId='p3'，纪检personId='p10'
  - 数据结构HandoverRecord：id/type/sourceId/sourceName/recorderId/items[]/hasArchiveAssignment/archiveAssigneeId/status/submittedAt/confirmedAt/createdAt
- **设计决策**: 组织者和纪检共用同一localStorage key，通过recorderId区分记录归属；专班组织者复用组织者工作台，来源类型选"专班"时下拉显示MOCK_TASKFORCES
- **结果**: 全部完成，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是]

## 2026-05-20 | 2026-05-T7 — 甲部自省原则+P1-4/P1-1/P1-5功能实现

- **来源**: 书记指示（甲部自省原则+P.5第二步决策执行）
- **变更文件**: CLAUDE.md, ws-leader-entry.js, ws-organizer-entry.js, ws-org-commissioner-entry.js, ws-disc-commissioner-entry.js
- **关键动作**: 2026-05-T7-1 ✅ 2026-05-T7-2 ✅ 2026-05-T7-3 ✅ 2026-05-T7-4 ✅
- **变更详情**:
  - 甲部H2.1新增"甲部自省原则"：书记指出Harness欠缺时，必须首先反思甲部表达与规定本身是否有缺陷，有则改之无则加勉
  - P1-4 考勤/考察两步确认：组长端新增考勤上传表单（选择活动+PersonPicker选人+逐人设置状态）和考察上传表单（来源类型+来源下拉+PersonPicker+逐人填写内容）；纪检端新增确认操作UI（待确认→已确认按钮），localStorage持久化
  - P1-1 组织者分工记录面板：在"任务分配"Tab新增分工记录区域，字段=工作名+工作描述+DDL（datetime-local精确到分钟），完成度=进行中/已完成/已逾期（自动逾期检测），PersonPicker单选被分配人，localStorage key='assignment_records'
  - P1-5 专班解散+工作量汇总+赋权回收：组织委员工作台运行中专班详情面板新增工作量汇总区域+解散按钮，解散流程=确认弹窗→更新状态为completed→回收scope=taskforce的赋权记录→toast反馈；新增可折叠"已完结"区域
- **设计决策**: 甲部自省原则是对一改具改盲区教训的制度层面反思（关联T5一改具改执行失败），关联 D-191
- **结果**: 全部完成，P2四项任务已从乙部退出
- **蒸馏标签**: [经验蒸馏: 是 — 甲部自省原则：当Harness执行失败时，不能仅归因于"执行不力"，必须反思制度本身是否表达不清、覆盖有遗漏、执行标准不够具体；P1四项功能统一使用localStorage+fallback to mock的数据持久化模式]

## 2026-05-20 | 2026-05-T8 — 复盘理念澄清+丙部展开+CLAUDE.md清理

- **来源**: 书记指示（复盘理念+丙部展开+议题清理）
- **变更文件**: CLAUDE.md, content/references/模板库/经验沉淀辅助提示词.md
- **关键动作**: 2026-05-T8-1 ✅ 2026-05-T8-2 ✅ 2026-05-T8-3 ✅
- **变更详情**:
  - P1-2需求从"复盘提交表单+纪检批注"更新为"复盘沉淀机制"——核心原则：复盘是过程中的工作，边做边学边沉淀；专班/长期活动至少一个深度参与者承担"归档沉淀维护"角色
  - 创建通用提示词模板（content/references/模板库/经验沉淀辅助提示词.md）——帮助深度参与者借助AI从工作沟通、决策原始材料中提炼经验，留出开放空间
  - 丙部P.5第三步详细展开：P2增强功能7项（长期建设项目/甘特视图/看板拖拽/发展党员追踪/补课跟踪/公邮提醒/日历多视图）+ P3辅助功能4项（意见反馈管理/合规文件引用渲染/画册视图/子记录自增表格），每项含设计来源和当前状态
  - 清理CLAUDE.md丙部：D.1(AGENT_HANDBOOK命名)已解决→删去；F.1(党小组手册)已完成→删去；F.2(品牌活动)已激活完成→删去；F.3(反馈卡)已激活完成→删去；D.2(references只读保护)未解决→升级为P.6写入丙部
- **设计决策**: 复盘不是事后补写而是过程中沉淀，提示词模板是通用工具而非特定场景方案
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 复盘理念从"事后提交"转向"过程中沉淀"，核心是归档沉淀维护角色+AI辅助提炼；CLAUDE.md丙部应保持干净，已完成议题直接删去，未完成议题升级为P编号正式决策项]

## 2026-05-20 | 2026-05-T9 — YAML修正+P.5第三步决策+看板归档原则

- **来源**: 书记指示（YAML规范+P.5第三步决策+看板归档原则）
- **变更文件**: content/references/模板库/经验沉淀辅助提示词.md, CLAUDE.md, DECISION_LOG.md, content/guides/architecture/MANAGEMENT_MODE.md
- **关键动作**: 2026-05-T9-1 ✅ 2026-05-T9-2 ✅ 2026-05-T9-3 ✅
- **变更详情**:
  - 修正经验沉淀辅助提示词.md的YAML header：删除owner/purpose字段，改为标准字段（title/type/role/last_updated/status/related_files），参照ARCHITECTURE.md
  - P.5第三步决策（D-192）：P2-1落地（重新定义=文件空间）、P2-2搁置、P2-3落地（重新定义=点击确认非拖拽）、P2-4不需要看板UI、P2-5落地、P2-6搁置、P2-7尝试落地、P3继续搁置
  - 乙部P2写入4项任务（P2-1/P2-3/P2-5/P2-7）
  - 丙部P.5更新为三步全部决策完成
  - 看板归档原则写入MANAGEMENT_MODE.md §8.4：已完成任务不展示，完成即归档
  - MANAGEMENT_MODE.md §8.4看板交互方式从"卡片拖拽跨列"更新为"点击确认完成→后台数据变化→渲染实时改变"
- **设计决策**: YAML字段以ARCHITECTURE.md为标准模板；看板归档原则是信息聚焦原则的体现，关联 D-192
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — YAML规范应以ARCHITECTURE.md为标准模板，新建文件必须自查；看板归档原则=信息聚焦原则——完成即归档，看板只展示待处理工作]

## 2026-05-20 | 2026-05-T10 — D-193修正+P1-2复盘沉淀机制实现

- **来源**: 书记指示（P1-2落地+P2-2/4/6删除+P.6决策+P3展开）
- **变更文件**: CLAUDE.md, DECISION_LOG.md, ws-deep-entry.js, ws-disc-commissioner-entry.js
- **关键动作**: 2026-05-T10-1 ✅ 2026-05-T10-2 ✅ 2026-05-T10-3 ✅ 2026-05-T10-4 ✅
- **变更详情**:
  - 丙部P.6退出（书记决策A：维持文档约定）
  - 乙部P2写入P2-2复盘沉淀机制（后完成退出）
  - DECISION_LOG.md新增D-193（P1-2落地+P2-2/4/6删除+P.6=A）
  - 丙部P.5 P1-2更新为落地，P2-2/4/6更新为删除
  - 深度参与者工作台新增"经验沉淀"Tab：提交表单（来源类型+关联来源+标题+内容+标签）+AI辅助提炼提示词链接+我的沉淀记录列表+纪检批注展示
  - 纪检委员工作台新增"经验沉淀"Tab：概览统计+按状态分组（待批注/已批注/已确认）+批注输入+确认操作
  - 经验沉淀数据层：localStorage key='experience_deposits'，三态流转submitted→annotated→confirmed
  - 深度参与者和纪检委员共用同一localStorage key，通过submitterId/annotatorId区分角色
- **设计决策**: 复盘沉淀机制按"边使用边改进"原则落地，核心是提交→批注→确认三态流转，批注粒度暂为整体批注（非逐段），关联 D-193
- **结果**: 全部完成，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是 — 复盘沉淀机制待使用验证]

## 2026-05-20 | 2026-05-T11 — references文件夹治理规划写入丙部

- **来源**: 书记指示（references/文件夹治理+模板整合+删除无用文件+提升重要文件位置）
- **变更文件**: CLAUDE.md
- **关键动作**: 2026-05-T11-1 ✅
- **变更详情**:
  - 丙部新增P.7（content/references/文件夹治理），含三步决策路线图
  - 第一步：新目录结构方案（扁平化 vs 保留层级）
  - 第二步：14个现有文件逐一归置建议（含删除/保留/提升/整合四类处置）
  - 第三步：经验沉淀辅助提示词升级方向（整合活动复盘+活动总结+差异化提示）
  - 书记明确要求：先规划写入丙部，不急着执行
- **设计决策**: 文件夹治理属于制度变更，必须先经丙部决策再执行
- **结果**: P.7已写入丙部，等待书记决策
- **蒸馏标签**: [经验蒸馏: 是 — 文件夹治理待决策]

## 2026-05-20 | 2026-05-T12 — 甲部自省+P3/P7决策执行+references重组+提示词升级

- **来源**: 书记指示（甲部自省+P3决策+P7决策+文件夹治理执行）
- **变更文件**: CLAUDE.md, DECISION_LOG.md, content/references/（目录重组）, 经验沉淀辅助提示词.md, 16个引用文件（一改具改）
- **关键动作**: 2026-05-T12-1 ✅ 2026-05-T12-2 ✅ 2026-05-T12-3 ✅ 2026-05-T12-4 ✅ 2026-05-T12-5 ✅
- **变更详情**:
  - 甲部H5.2新增"多步决策规则"：搁置≠待决策，全部步骤有方向即退出丙部
  - DECISION_LOG新增D-194（P3-1~P3-4落地+P7三步决策+甲部自省）
  - 丙部P.5退出（全部决策完成，按H5.2多步决策规则）
  - 乙部P2新增P3-1意见反馈管理/P3-2合规文件引用渲染/P3-3活动风采展示/P3-4子记录自增表格
  - references/目录重组：官方文件→合规文件、模板库→工作模板、党小组会+支部委员会→历史会议材料、党支部工作记录.docx提升至根目录
  - 删除无用文件：支部基本信息模板.md、活动复盘/目录、申报材料模板/目录、宣传材料类/空壳
  - 全仓库一改具改：16个文件中的旧路径引用全部更新
  - 经验沉淀辅助提示词升级：两部分结构（①使用说明②提示词正文）+合规性/探索性差异化提示词+整合活动复盘要素（基本信息/目标达成/执行摘要/后续行动）
  - 丙部P.7退出（决策+执行完成）
- **设计决策**: 专班按工作性质分（合规性/探索性）而非工作内容分，对应双域管理理论（党务=合规、党建=探索），关联 D-194
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — "搁置"≠"待决策"是关键区分——搁置是已做出的决策（现在不做），待决策是尚未选择方向；文件夹治理的核心是命名精确和归置合理，不是层级深浅；待写入insights]


## 2026-05-21 | 2026-05-T13 — 蒸馏标签修正+H2.4后推翻前规则+Decision Log拆分+提示词迭代版+经验蒸馏

- **来源**: 书记指示（蒸馏标签问题+后推翻前规则+经验蒸馏+提示词迭代版）
- **变更文件**: CLAUDE.md, DECISION_LOG.md→拆分, 2026-05-DECISION_LOG.md, 经验沉淀辅助提示词.md, 党支部管理与实务经验沉淀.md
- **关键动作**: 2026-05-T13-1 ✅ 2026-05-T13-2 ✅ 2026-05-T13-3 ✅ 2026-05-T13-4 ✅ 2026-05-T13-5 ✅
- **变更详情**:
  - 修正Decision Log中D-186/D-187/D-193/D-194的错误[是]标签为[否]（后经蒸馏闭环改回[是]）
  - H2.4新增第5条后推翻前规则和第6条蒸馏标签判定标准
  - Decision Log按月拆分：原DECISION_LOG.md→索引文件，决策内容→2026-05-DECISION_LOG.md
  - 经验沉淀辅助提示词补充迭代版提示词（通用+合规性+探索性三套迭代版）
  - 执行经验蒸馏：9条新经验写入insights v14.0，对应日志蒸馏标签闭环
- **设计决策**: 蒸馏标签[是]的判定标准从AI觉得值得沉淀修正为经验已写入insights文件，关联 H2.4第6条
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 蒸馏标签判定标准是制度自省的典型案例：规则没写清楚判定标准导致AI自行标记[是]而无实际蒸馏；Decision Log按月拆分防止上下文爆炸]


## 2026-05-21 | 2026-05-T14 — H3强化YAML规则+H6.3精简变更详情+insights简并规划

- **来源**: 书记指示（YAML更新遗漏+变更详情臃肿+insights简并）
- **变更文件**: CLAUDE.md
- **关键动作**: 2026-05-T14-1 ✅ 2026-05-T14-2 ✅ 2026-05-T14-3 ✅
- **变更详情**:
  - H3第6项加🔴标记+子任务约束：任何有YAML frontmatter的文件被修改后必须更新last_updated，遗漏即违规
  - H6.3模板变更详情加排除规则：排除Harness固定动作（更新YAML、记录日志、乙部更新等），只记录实质性内容变更
  - 丙部新增P.8 insights文件简并规划（三步决策：器层简并/术层简并/是否拆分文件）
- **设计决策**: 甲部自省——YAML更新规则虽在H3但执行不力，根因是规则不够醒目且未约束子任务，关联 H2.1甲部自省原则
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 甲部自省的又一案例：规则存在但执行不力时须反思规则本身是否足够醒目和具体]


## 2026-05-21 | 2026-05-T15 — H6.3模板修正+P.8重写+P2-5补课制度实现

- **来源**: 书记指示（H6.3初次写入只能标否+P.8重写+执行乙部）
- **变更文件**: CLAUDE.md, ws-disc-commissioner-entry.js, ws-leader-entry.js
- **关键动作**: 2026-05-T15-1 ✅ 2026-05-T15-2 ✅ 2026-05-T15-3 ✅
- **变更详情**:
  - H6.3模板蒸馏标签修正：初次写入只能标[否]，经正式蒸馏写入insights后改为[是]
  - P.8丙部重写：遵守H5.2写作禁令（去除技术变量名+3+选项+文件路径）
  - P2-5补课制度实现：纪检委员确认缺勤考勤时自动生成补课任务（三会一课=必须，主题党日=建议）；新增补课制度Tab（统计概览+待补课列表+已完成列表）；标记已补后回写考勤记录status为已补；组长工作台展示本组缺勤人员
- **设计决策**: 补课任务独立localStorage key=makeup_tasks，与attendance_records分开存储但通过attendanceRecordId关联回写，关联 D-192
- **结果**: 全部完成，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是 — 补课闭环是考勤制度的关键一环，缺勤→补课→回写形成数据闭环]


## 2026-05-21 | 2026-05-T16 — P.8丙部重写+三会一课定义修正+P2-3看板交互重构

- **来源**: 书记指示（道术器划分纠正+三会一课定义纠正+乙部执行）
- **变更文件**: CLAUDE.md, ws-disc-commissioner-entry.js, ws-org-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-secretary-entry.js, sopData.js, 常见工作场景快速指南.md, MANAGEMENT_MODE.md, index.html
- **关键动作**: 2026-05-T16-1 ✅ 2026-05-T16-2 ✅ 2026-05-T16-3 ✅
- **变更详情**:
  - 丙部P.8重写：道=前四节/术=中间四节/器=后四节（纠正之前的错误划分），遵循H5.2写作禁令
  - 三会一课定义修正：MANDATORY_ACTIVITY_TYPES中组织生活会替换为支委会（三会一课=支部党员大会+支委会+党小组会+党课）
  - SOP文档5处三会一课定义错误修正（添加支委会、移除含组织生活会表述、组织生活会考勤标注改为依托三会形式）
  - MANAGEMENT_MODE.md考勤适用范围修正
  - ws-secretary-entry.js三会一课子选项scenarioId修正（org-life改为branch-committee）
  - sopData.js新增支委会场景（branch-committee）
  - index.html支委会选项value统一
  - P2-3看板交互重构：组织委员看板+宣传委员看板+追踪看板均添加确认完成按钮和归档区
- **设计决策**: 组织生活会不是三会一课的组成部分，而是依托三会形式展开的内容，关联 D-195
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 三会一课定义修正属于制度纠偏，看板交互属于功能实现]


## 2026-05-21 | 2026-05-T17 — 组织生活会概念对齐+P.8丙部细粒度重写

- **来源**: 书记指示（组织生活会官方定义对齐+P.8选项颗粒度不足）
- **变更文件**: ARCHITECTURE.md, ORG_BUILDING.md, MANAGEMENT_MODE.md, 常见工作场景快速指南.md, insights, CLAUDE.md
- **关键动作**: 2026-05-T17-1 ✅ 2026-05-T17-2 ✅
- **变更详情**:
  - ARCHITECTURE.md：党建工作域从'三会一课、组织生活会'改为'三会一课（支部党员大会/支委会/党小组会/党课）'，移除组织生活会的并列位置
  - ORG_BUILDING.md：同上修正
  - MANAGEMENT_MODE.md：代表场景中组织生活会标注'依托三会形式'；决策树中组织生活会定位从'会议的特殊内容形态'改为'以三会形式召开的组织生活内容（非独立活动类型）'
  - 常见工作场景快速指南.md：活动类型判断表新增概念层级说明（三会一课和主题党日是制度形式，组织生活会是内容）；组织生活会定义从'党小组会的一种具体形式'修正为'以支部党员大会、支委会或党小组会形式召开'；考勤标注改为'依托三会形式，必须补课'
  - insights决策树L1约束关系修正：从'组织生活会天然排除参访共建'改为'三会一课和主题党日是制度形式，组织生活会是内容'
  - P.8丙部重写：4步决策替代原来的3步，每步提供细粒度选项（保留但重新定位 vs 合并），而非之前的激进/保守二选一
- **设计决策**: 组织生活会与三会一课不是并列关系——三会一课是制度形式，组织生活会是依托三会形式召开的内容，关联 D-196
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 概念对齐属于制度纠偏]


## 2026-05-21 | 2026-05-T18 — insights简并重构（D-196执行）

- **来源**: 书记决策D-196（P.8四步决策全部A）
- **变更文件**: content/insights/党支部管理与实务经验沉淀.md
- **关键动作**: 2026-05-T18-1 ✅ 2026-05-T18-2 ✅ 2026-05-T18-3 ✅ 2026-05-T18-4 ✅
- **变更详情**:
  - §7重新定位为「工程演进的技术原则」，添加定位说明和边界声明
  - §8重新定位为「上下文治理的制度机制」，合并8.1+8.2为8.1，合并8.5+8.8为8.2，合并8.3+8.6为8.3，合并7.7+8.4为8.4，8.7重编号为8.5
  - §9重新定位为「架构迁移方法论」，§9.4(Snapshot按需)移入§10.8（判例集），§9.5重编号为§9.4
  - §10重新定位为「实操教训录」，添加定位说明，新增§10.8
  - §12整体并入§11（11.12~11.15），删除§12标题
  - 速查表从63条精简至60条（去重：常为新迭代×2、独立章节>子步骤×2、会话交接+独立章节合并、蒸馏标签从§7移至§8、快照按需从§8移至§10、§12→§11引用更新）
  - YAML version升级至15.0
- **设计决策**: 保留结构但重新定位比激进合并更安全；内容详实但不在同一层次重复叙述，关联 D-196
- **结果**: 全部完成，12节→11节，63条→60条
- **蒸馏标签**: [经验蒸馏: 是 — insights简并属于文件治理]


## 2026-05-21 | 2026-05-T19 — P3-4子记录自增表格

- **来源**: 乙部P3-4（D-194决策执行）
- **变更文件**: ws-leader-entry.js, ws-org-commissioner-entry.js
- **关键动作**: 2026-05-T19-1 ✅ 2026-05-T19-2 ✅
- **变更详情**:
  - ws-org-commissioner-entry.js：专班详情面板新增子记录区域（考察+材料2种自增表格），localStorage key='tf_sub_records'，支持添加/删除行
  - ws-leader-entry.js：活动列表新增点击展开详情面板功能，详情面板内嵌4种子记录自增表格（考勤/考察/宣传+材料自选），localStorage key='act_sub_records'
  - 考察记录字段：被考察人/考察内容/考察结论
  - 材料记录字段：材料名称/提交人/备注
  - 考勤记录字段：姓名/出勤状态/备注
  - 宣传记录字段：宣传标题/撰写人/发布渠道
- **设计决策**: 沿用activityId关联模式而非新建subRecords字段，用localStorage独立存储子记录，关联 D-197
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 子记录自增表格属于功能实现]


## 2026-05-21 | 2026-05-T20 — P3-1意见反馈管理

- **来源**: 乙部P3-1（D-194决策执行）
- **变更文件**: ws-secretary-entry.js, index.html
- **关键动作**: 2026-05-T20-1 ✅ 2026-05-T20-2 ✅
- **变更详情**:
  - ws-secretary-entry.js：新增FeedbackStore导入和renderFeedbackManagement函数，书记可查看反馈统计（待处理/处理中/已办结）、操作状态流转（待处理→处理中→已办结）、追加评论、查看已归档反馈
  - index.html：书记工作台卡片内新增意见反馈管理区域（统计徽标+活跃反馈列表+已归档折叠区）
- **设计决策**: 复用已有FeedbackStore服务（含getAll/countByStatus/updateStatus/addComment），书记面板内嵌反馈管理而非独立页面，关联 D-198
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 意见反馈管理属于功能实现]


## 2026-05-21 | 2026-05-T21 — P3-2合规文件引用渲染

- **来源**: 乙部P3-2（D-194决策执行）
- **变更文件**: ws-org-commissioner-entry.js
- **关键动作**: 2026-05-T21-1 ✅
- **变更详情**:
  - 组织委员面板新增「合规文件」Tab（第3个Tab）
  - 官方合规文件列表只读展示（6份：党章/支部工作规范/党员教育管理条例/发展党员细则/高校基层组织条例/支部工作条例），标注文件类型和分类标签
  - 引用记录管理：添加引用（文件名+场景+备注）、移除引用，localStorage key='compliance_references'
- **设计决策**: 纯前端无法渲染docx/pdf内容，以只读列表方式展示文件元信息；引用记录由组织委员管理，关联 D-199
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 合规文件引用属于功能实现]


## 2026-05-21 | 2026-05-T22 — P2-7日历多视图

- **来源**: 乙部P2-7（D-192决策执行）
- **变更文件**: calendar.js, state.js
- **关键动作**: 2026-05-T22-1 ✅ 2026-05-T22-2 ✅
- **变更详情**:
  - calendar.js完全重写：从单一月视图升级为月/周/日/列表四种视图切换
  - 新增_renderViewSwitcher()视图切换按钮组、_renderWeekView()周视图（7列网格+周导航）、_renderDayView()日视图（活动卡片+任务卡片+日导航）、_renderListView()列表视图（日期降序分组）
  - 提取_renderCellContent()和_bindCellClicks()为共享函数
  - 新增_getWeekNumber() ISO周数计算
  - state.js新增calendarView: 'month'字段
- **设计决策**: 四视图共享数据源（activeActivities+tasks），通过视图模式分发渲染；周/日视图导航独立于月视图导航，关联 D-192
- **结果**: 全部完成，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是 — 日历多视图属于功能实现]


## 2026-05-21 | 2026-05-T23 — P2-1长期建设项目文件空间

- **来源**: 乙部P2-1（D-192决策执行）
- **变更文件**: domain.js, ws-organizer-entry.js
- **关键动作**: 2026-05-T23-1 ✅ 2026-05-T23-2 ✅
- **变更详情**:
  - domain.js新增FileSpaceRecord类型定义（id/fileName/category/description/sourceType/sourceId/sourceName/uploadedBy/uploadedAt/tags/fileSize）
  - ws-organizer-entry.js新增「文件空间」第5个Tab
  - 三种文件分类：经验沉淀(experience)/原始文件(raw)/宣传素材(publicity)，各有独立配色和图标
  - 统计概览卡片（三种分类各一个计数）
  - 添加文件记录表单（文件名+分类+描述+关联来源+标签），来源支持独立/活动/专班三种
  - 按分类分组的文件列表展示，支持删除操作
  - localStorage key='file_space_records'
- **设计决策**: 纯前端无法真正上传文件，采用"文件记录"模式管理元数据；不实现Project→Milestone→Task层级（乙部明确milestone不重要），关联 D-192
- **结果**: 全部完成，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是 — 文件空间属于功能实现]


## 2026-05-21 | 2026-05-T24 — P3-3活动风采展示

- **来源**: 乙部P3-3（D-194决策执行）
- **变更文件**: archive.html, archive-entry.js, index.html, main-entry.js
- **关键动作**: 2026-05-T24-1 ✅ 2026-05-T24-2 ✅ 2026-05-T24-3 ✅
- **变更详情**:
  - archive.html：新增列表/画册视图切换按钮，列表视图包裹在archive-list-view容器中，新增archive-gallery-view画册网格容器
  - archive-entry.js：重写，新增视图切换逻辑和renderGalleryView()函数，画册视图以卡片网格展示已完成活动/专班（渐变色头部+白色内容区），支持搜索和筛选
  - index.html：考勤概况下方新增"活动风采"区域（#dashboard-gallery），链接指向归档库
  - main-entry.js：新增_renderGallery()函数，择优展示逻辑=品牌活动优先+近期已完成活动，最多6个卡片；新增gallery卡片点击跳转事件
- **设计决策**: 画册视图是归档库的子功能（非宣传委员专属），主页择优展示品牌活动+已完成活动，关联 D-194
- **结果**: 全部完成，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 是 — 活动风采展示属于功能实现]


## 2026-05-21 | 2026-05-T25 — DOC-1写入数据验证设计思路文档

- **来源**: 乙部DOC-1（书记指示）
- **变更文件**: WRITE_VERIFY.md(新建), CHECKLIST.md
- **关键动作**: 2026-05-T25-1 ✅ 2026-05-T25-2 ✅
- **变更详情**:
  - 新建content/guides/design/WRITE_VERIFY.md，包含5章：设计原则（写入即验证/数据流三段模型/验证粒度）、写入操作数据流清单（14种写入操作的完整数据流向图）、localStorage键值索引（12个键的汇总）、验证策略（自动化/手动/跨页面）、与CHECKLIST §七的关系
  - CHECKLIST.md §七末尾补充WRITE_VERIFY.md链接
- **设计决策**: 文档定位为CHECKLIST §七的配套设计文档——本文档定义"怎么验证"，CHECKLIST记录"验证了没有"
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — 文档治理]


## 2026-05-21 | 2026-05-T26 — 一改具改工作流自查+全仓库taxonomy审查

- **来源**: 书记指示
- **变更文件**: CLAUDE.md
- **关键动作**: 2026-05-T26-1 ✅ 2026-05-T26-2 ✅
- **变更详情**:
  - 修正乙部P2-1/P3-3状态为✅已完成（上一轮完成但CLAUDE.md未同步）
  - 丙部新增P.9（一改具改工作流知识归位，2步决策）和P.10（全仓库taxonomy审查，12项审查结果）
  - P.10初版违反H5.2精神（审查报告塞进丙部），重写为"审查结果总览→书记判定→确认后展开"的两步结构
- **设计决策**: 甲部自省——P.10初版把"审查报告"当"决策项"塞进丙部，违反H5.2路线图式呈现原则。丙部是"待决策"而非"待审查"，审查结果应先让书记审阅，确认的错误才形成决策项
- **结果**: 丙部P.9/P.10已写入并验证持久化
- **蒸馏标签**: [经验蒸馏: 是 — 待观察是否形成可复用模式]


## 2026-05-21 | 2026-05-T27 — P.9+P.10决策执行

- **来源**: 书记决策（D-197）
- **变更文件**: CLAUDE.md, SYNC_EXTERNAL.md(新建), 2026-05-DECISION_LOG.md
- **关键动作**: 2026-05-T27-1 ✅ 2026-05-T27-2 ✅ 2026-05-T27-3 ✅ 2026-05-T27-4 ✅
- **变更详情**:
  - 甲部H2.1新增"吸收外部输入原则"+guides链接
  - 新建content/guides/governance/SYNC_EXTERNAL.md（4章：适用场景/操作流程/HARNESS清单/与H2.1关系）
  - 乙部清理：删除P2-1/P2-3/P2-5/P2-7/P3-1~P3-4/DOC-1全部已完成条目（H5.1完成退出）
  - 乙部新增TAX-1~6（概念修正任务，源自taxonomy审查确认的错误）
  - 丙部P.9/P.10退出（决策完成）
  - Decision Log追加D-197
- **设计决策**: 书记判定taxonomy审查12项中#2/#3/#4/#5/#6为确认错误，#7-9需优化，#10依赖#5修正，#11-12搁置；考勤=0-1变量对所有人，考察=对深度参与者/组织者的工作量记录；专班制包含赋权制度和工作量考察制度（非乘法关系），关联 D-197
- **结果**: 全部完成
- **蒸馏标签**: [经验蒸馏: 是 — taxonomy审查是制度治理行为]


## 2026-05-22 | TAX-6执行 — 赋权/专班索引修正

- **来源**: 书记指示（TAX-6执行）
- **变更文件**: CLAUDE.md
- **关键动作**: TAX-6-1 ✅ TAX-6-2 ✅ TAX-6-3 ✅
- **变更详情**:
  - H8.3核心定义添加交叉引用：赋权制度→H8.5
  - H8.5标题改为"赋权关系链（专班制子制度 · Authorization Chain）"，描述首句标注"专班制的子制度（见 H8.3）"
  - 乙部TAX-6条目删除（H5.1完成退出）
- **设计决策**: 保留H8.5作为独立索引项（方便快速导航），但明确标注为专班制的子制度，关联 D-197/TAX-3
- **结果**: 全部完成，PowerShell验证持久化通过
- **蒸馏标签**: [经验蒸馏: 是 — 索引关系修正属于制度治理]


## 2026-05-22 | 2026-05-T28 — TAX-3/TAX-1+TAX-2(概念层)/TAX-4执行

- **来源**: 书记指示（乙部TAX系列执行）
- **变更文件**: CLAUDE.md, COMMISSIONER_SYSTEM.md, insights, MANAGEMENT_MODE.md, ORG_BUILDING.md, DATA.md, WRITE_VERIFY.md, 纪检委员工作流程指南.md, CHECKLIST.md, README.md, 支委与党小组定人定责定岗说明.md, 常见工作场景快速指南.md, INDEX.md, sopData.js, definitions.js, renderer.js, index.js, constants.js, domain.js, BRAND_ACTIVITY.md, DOC_MAP.md, 党小组组长工作手册.md, about.html, ARCHITECTURE.md
- **关键动作**: T28-1 ✅ T28-2 ✅ T28-3 ✅ T28-4 ✅
- **变更详情**:
  - TAX-3专班制定义修正：CLAUDE.md H8.3 + COMMISSIONER_SYSTEM.md + insights三处"专班=赋权×工作量考察"→"专班制包含赋权制度和工作量考察制度"，零残留确认
  - TAX-1+TAX-2概念层修正：11个md文件，"参与记录"→"考察记录"，考勤/考察并列→层级关系（考勤=基础层，考察=进阶层），零残留确认
  - TAX-4品牌活动属性化：20个文件，删除brand-activity独立场景，品牌改为isBrand属性标签，零残留确认
  - TAX-6赋权/专班索引修正：H8.3↔H8.5双向交叉引用，赋权关系链标注为专班制子制度
- **设计决策**: 考勤=0-1变量对所有人成立，考察=对深度参与者和组织者的工作量记录；专班制包含赋权制度和工作量考察制度（非乘法关系）；品牌是属性标签非独立类型，关联 D-197
- **结果**: TAX-3/TAX-4/TAX-6已完成退出，TAX-1/TAX-2概念层✅代码层⏳，TAX-5待启动
- **蒸馏标签**: [经验蒸馏: 是 — taxonomy修正是制度治理行为]

## 2026-05-22 | 对话回退后仓库审计+HARNESS补强

- **来源**: 书记指示（对话回退后审计+编码规范）
- **变更文件**: CLAUDE.md
- **关键动作**: H7补强 ✅ 乙部TAX-4修正 ✅
- **变更详情**:
  - H7新增#7编码规范：终端命令禁止写入含中文文件内容，PowerShell默认编码可能损坏UTF-8
  - H7新增#8回退审计规范：对话回退后必须审计仓库实际状态，以磁盘为准更新乙部
  - 乙部TAX-4状态修正：✅已完成→🔄进行中（代码层被回退，sopData.js无isBrand/brand-activity变更）
- **设计决策**: 仓库审计确认概念层（md文件）全部持久化，代码层（JS文件）全部被回退，关联 H7#8
- **结果**: H7规范补强完成，乙部状态已与仓库实际对齐
- **蒸馏标签**: [经验蒸馏: 是 — HARNESS补强是治理维护行为]

## 2026-05-22 | 2026-05-T29 — TAX-1/TAX-2/TAX-4代码层修正

- **来源**: 乙部TAX-1/TAX-2/TAX-4（next_prompt恢复执行）
- **变更文件**: domain.js, participation.js, ws-organizer-entry.js, definitions.js, sopData.js, person-picker.js, party.js, CLAUDE.md
- **关键动作**: T29-1 ✅ T29-2 ✅ T29-3 ✅ T29-4 ✅ T29-5 ✅ T29-6 ✅ T29-7 ✅
- **变更详情**:
  - domain.js：ParticipationRecord→InspectionRecord，level改为organize|deep（移除attend），新增status字段；mockDB.participations→inspections
  - participation.js：注释从"参与记录"改为"考察记录"，新增status字段，JSDoc对齐InspectionRecord
  - ws-organizer-entry.js：8处"参与记录"→"考察记录"，select移除"出勤"选项，表格列标题"参与层级"→"考察层级"
  - definitions.js：attendance子状态submitted描述修正（考勤→宣传委员归档，考察→组织委员）；attendance_inspection子状态3处"参与记录"→"考察记录"；COMPLETED metadata修正；文件头注释修正品牌维度
  - sopData.js：3处"参与记录草稿"→"考察记录草稿"（1a-7c/1c-7c/1d-7c）
  - person-picker.js：注释"参与记录"→"考察记录"
  - party.js：toast"参与记录已提交"→"考察记录已提交"
  - CLAUDE.md乙部：TAX-1/TAX-2/TAX-3/TAX-4已完成退出，仅保留TAX-5
- **设计决策**: 考察记录仅含organize/deep层级（attend=考勤范畴，不在考察中）；InspectionRecord新增status字段（pending/confirmed）对齐纪检确认流程，关联 D-197
- **结果**: TAX-1/TAX-2/TAX-4全部完成退出，全仓零残留验证通过（ParticipationRecord/参与记录/participations均零残留）
- **蒸馏标签**: [经验蒸馏: 是 — taxonomy修正是制度治理行为]

## 2026-05-22 | 2026-05-T30 — TAX-5存储层优化

- **来源**: 乙部TAX-5（D-197衍生）
- **变更文件**: domain.js, mock.js, ws-leader-entry.js, ws-disc-commissioner-entry.js, ws-organizer-entry.js, ws-org-commissioner-entry.js, ws-deep-entry.js, taskforce.js, notice.js, DATA.md, WRITE_VERIFY.md, CLAUDE.md
- **关键动作**: T30-1 ✅ T30-2 ✅ T30-3 ✅ T30-4 ✅ T30-5 ✅ T30-6 ✅ T30-7 ✅ T30-8 ✅
- **变更详情**:
  - domain.js：mockDB新增10个业务数据字段（assignments/handovers/makeupTasks/actSubRecords/tfSubRecords/complianceReferences/fileSpaceRecords/experienceDeposits/taskforces/notices）
  - mock.js：saveDB序列化全部17个字段；loadDB恢复全部字段；SANDBOX清理含旧版独立键兼容清理；updateTask添加saveDB()调用；saveDB改为export
  - ws-leader-entry.js：5处独立键→mockDB（attendances/inspections/makeupTasks/actSubRecords）
  - ws-disc-commissioner-entry.js：5处独立键→mockDB（attendances/inspections/handovers/makeupTasks/experienceDeposits）
  - ws-organizer-entry.js：3处独立键→mockDB（assignments/handovers/fileSpaceRecords）
  - ws-org-commissioner-entry.js：2处独立键→mockDB（tfSubRecords/complianceReferences）
  - ws-deep-entry.js：1处独立键→mockDB（experienceDeposits）
  - taskforce.js：1处独立键→mockDB（taskforces），保留旧键迁移逻辑
  - notice.js：1处独立键→mockDB（notices）
  - DATA.md：§3.2重构为统一全量键架构+UI状态独立键+已解决问题追踪
  - WRITE_VERIFY.md：§三重构为全量键/独立键/已归并旧键三分类+§4.1统一写入验证流程
- **设计决策**: 业务数据统一全量键、UI状态保持独立键；全量键保证原子性写入消除双重存储，关联 D-197
- **结果**: TAX-5完成，全仓零残留验证通过（12个旧版独立键localStorage操作零残留）
- **蒸馏标签**: [经验蒸馏: 是 — 存储层优化是架构治理行为]

## 2026-05-22 | 周期性任务W1/W2/W3 + Mock数据一致性修复

- **来源**: 书记指示（周期性任务+数据一致性检查）
- **变更文件**: ws-organizer-entry.js, domain.js, attendance.js, people.js, ws-leader-entry.js, ws-disc-commissioner-entry.js, CLAUDE.md, TIMESTAMPS.md
- **关键动作**: W1 ✅ W2 ✅ W3新增 ✅ DATA-1 ✅ DATA-3 ✅
- **变更详情**:
  - W1执行日志扫描：45条条目时间正序，30条未蒸馏，5条高价值
  - W2 Emoji合规扫描：修复3处P0违规（ws-organizer-entry.js 📝📎🎨→经验/素材/宣传）
  - W3新增周期性任务：Mock数据一致性扫描（TIMESTAMPS.md新增W3）
  - domain.js：新增AttendanceStatus枚举（present/absent/leave/made_up）+ATTENDANCE_STATUS_LABELS映射
  - attendance.js：31条考勤记录status中文→英文枚举，attendanceToLong/Wide用映射函数显示中文
  - people.js：p2(李四)标注leader（第二党小组组长），p4(赵六)标注leader（第三党小组组长）
  - ws-leader-entry.js：考勤status条件判断/显示/select选项改为英文枚举+映射
  - ws-disc-commissioner-entry.js：考勤status条件判断/筛选/补课回写改为英文枚举+映射
- **设计决策**: 数据层英文枚举+UI层映射函数显示中文，保证数据一致性同时不破坏用户体验
- **结果**: DATA-1/DATA-3已修复，DATA-2待启动；W1/W2/W3周期性任务已执行
- **蒸馏标签**: [经验蒸馏: 是 — 周期性任务+数据修正是维护行为]

## 2026-05-22 | 2026-05-T31 — DATA-2考察记录数据模型统一（D-198执行）

- **来源**: 丙部P.11决策→D-198归档→执行
- **变更文件**: domain.js, inspection.js, participation.js, index.js, ws-leader-entry.js, ws-disc-commissioner-entry.js, ws-organizer-entry.js, CLAUDE.md, DECISION_LOG.md
- **关键动作**: T31-1 ✅ T31-2 ✅ T31-3 ✅ T31-4 ✅
- **变更详情**:
  - domain.js：InspectionRecord新增sourceType('activity'/'taskforce')+sourceName字段；新增SourceType枚举+SOURCE_TYPE_LABELS映射
  - inspection.js：重写为统一数据源，12条记录（10活动+2专班），删除旁听记录，新增inspectionToDisplay/Long/Wide函数
  - participation.js：改为兼容性重导出（INSPECTION_RECORDS as PARTICIPATION_RECORDS）
  - index.js：新增inspectionToDisplay导出
  - ws-leader-entry.js：r.tag→r.sourceType过滤；创建记录改为sourceType/level/role模型；status'已确认'→'confirmed'
  - ws-disc-commissioner-entry.js：tagColor/statusColor改为英文枚举键；筛选select value改为英文；i.tag→i.sourceType显示；i.content→i.role；record.status='已确认'→'confirmed'
  - ws-organizer-entry.js：i.content→i.role；status'已确认'→'confirmed'比较
- **设计决策**: D-198 A+A1——专班考察纳入考察记录，用sourceType字段区分来源；查询以人为中心，写入以活动/专班计入，同一数据集
- **结果**: DATA-2完成退出，全仓零残留（.tag/.content/'已确认'/'待确认'均零残留）
- **蒸馏标签**: [经验蒸馏: 是 — 数据模型统一是架构治理行为]

## 2026-05-23 | PermissionManager 一改具改同步 — 统一权限管理服务跨组件一致性验证

- **来源**: 用户指示——同步已完成工作，全仓库多视图实时同步和跨组件状态一致性验证
- **变更文件**: content/guides/design/SOP_WEB.md, content/guides/architecture/LOGIN_STUB.md
- **关键动作**:
  - 2026-05-T-1 ✅ 读取 permission-manager.js/header.js/sidebar.js 确认代码状态
  - 2026-05-T-2 ✅ 全仓库搜索 permission:stance-change/permission:role-select 事件引用——配对完整（各2处：dispatch+listen）
  - 2026-05-T-3 ✅ 全仓库搜索旧事件名残留——代码中零残留；guides文档中2处旧名已更新
  - 2026-05-T-4 ✅ 全仓库搜索 ViewModeStore 直接使用——分类合理（PermissionManager内部/sidebar只读getMode/entry初始化），无违规
  - 2026-05-T-5 ✅ 验证 switchStance/selectRole/restoreRole 调用链——AuthStore/ViewModeStore接口全部匹配
  - 2026-05-T-6 ✅ 多视图实时同步验证——站位切换→permission:stance-change→sidebar重渲染；角色选择→permission:role-select→header重渲染；角色恢复→sidebar:view-restore→header重渲染
  - 2026-05-T-7 ✅ 一改具改：SOP_WEB.md 和 LOGIN_STUB.md 中旧事件名更新为 permission: 前缀
- **变更详情**:
  - 更新 SOP_WEB.md 第95行 header:role-switch → permission:stance-change
  - 更新 SOP_WEB.md 第105行 sidebar:role-select → permission:role-select
  - 更新 LOGIN_STUB.md 映射表：header:stance-change → permission:stance-change，sidebar:view-select → permission:role-select
  - 更新两个文件 YAML last_updated 为 2026-05-23
- **设计决策**: 无非显而易见决策
- **结果**: 全仓库跨组件状态一致性验证通过，旧事件名零残留（代码+guides），日志中的历史记录保留不改
- **蒸馏标签**: [经验蒸馏: 是 — 一改具改常规巡检]


## 2026-05-23 | 2026-05-T1 — C1-5 统一颜色常量到 constants.js

- **来源**: 用户指示推进 C-1，D-199 决策自底向上执行
- **变更文件**: core/constants.js, ws-leader-entry.js, ws-org-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-disc-commissioner-entry.js, ws-organizer-entry.js, party-secretary-entry.js, party-org-entry.js, party-prop-entry.js, party-disc-entry.js, main-entry.js, ws-visitor-entry.js, archive-entry.js
- **关键动作**:
  - T1-1 ✅ constants.js 新增 hexToRgba()、ACCENT_COLORS、getAccentColors()、getActivityTypeColors()
  - T1-2 ✅ 9个 entry 删除 accent/accentRgba/accentBorder 硬编码，改用 getAccentColors(role)
  - T1-3 ✅ 3个 entry 删除本地 ACTIVITY_TYPE_COLORS 定义，改用 getActivityTypeColors()
  - T1-4 ✅ 修复3个缺失 import 的 entry（ws-leader/ws-org-commissioner/ws-disc-commissioner）
  - T1-5 ✅ 全仓搜索确认零残留
- **变更详情**:
  - 新增 hexToRgba(hex, alpha) 工具函数
  - 新增 ACCENT_COLORS 映射（9个角色的 hex 主色）
  - 新增 getAccentColors(role, bgAlpha, borderAlpha) 返回三件套
  - 新增 getActivityTypeColors({withLabel, useGradient}) 统一活动类型颜色
  - party-secretary-entry 使用非标准 alpha (0.08, 0.2)
- **设计决策**: getActivityTypeColors 使用工厂函数而非静态常量，支持 withLabel/useGradient 参数化，避免 archive 的渐变色需求导致数据分裂
- **结果**: 12个文件修改完成，accent 硬编码零残留，ACTIVITY_TYPE_COLORS 本地定义零残留
- **蒸馏标签**: [经验蒸馏: 是 — 常规组件化提取]


## 2026-05-23 | 2026-05-T2 — C1-2 提取 bootstrap 函数

- **来源**: D-199 决策自底向上执行
- **变更文件**: core/bootstrap.js(新增), ws-secretary-entry.js, ws-leader-entry.js, ws-org-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-disc-commissioner-entry.js, ws-organizer-entry.js, ws-deep-entry.js, ws-visitor-entry.js, party-secretary-entry.js, party-org-entry.js, party-prop-entry.js, party-disc-entry.js, main-entry.js
- **关键动作**:
  - T2-1 ✅ 新增 core/bootstrap.js，导出 bootstrapPage({module, defaultRole, viewMode, accentRole, accentAlpha})
  - T2-2 ✅ 13个 entry 迁移到 bootstrapPage()，消除重复初始化序列
  - T2-3 ✅ 5个路由/极简页保持原样（workspace-entry, party-entry, archive-entry, search-entry, feedback-entry）
  - T2-4 ✅ ws-disc-commissioner 的条件 viewMode 通过 viewMode='auto' 参数处理
  - T2-5 ✅ party-secretary 的自定义透明度通过 accentAlpha=[0.08, 0.2] 参数处理
- **变更详情**:
  - bootstrapPage 返回 {savedState, viewMode, accent, accentRgba, accentBorder}
  - 13个 entry 移除了 renderSidebar/renderHeader/CrossPageState/ViewModeStore 等重复 import
  - 保留仍需直接使用的 import（如 AuthStore 用于赋权管理、CrossPageState.getURLParams 用于专班跳转）
- **设计决策**: bootstrapPage 仅处理骨架渲染+角色状态恢复+强调色，不包含数据加载（C1-3处理）和 registerRenderCallback（各 entry 的 renderFn 不同）
- **结果**: 13个 entry 初始化代码从5-8行缩减为1行，零残留
- **蒸馏标签**: [经验蒸馏: 是 — 常规组件化提取]


## 2026-05-23 | 2026-05-T3 — C1-3 提取数据加载器

- **来源**: D-199 决策自底向上执行
- **变更文件**: core/data-loader.js(新增), ws-secretary-entry.js, ws-leader-entry.js, ws-org-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-disc-commissioner-entry.js, ws-organizer-entry.js, ws-deep-entry.js, ws-visitor-entry.js, main-entry.js, party-secretary-entry.js, party-org-entry.js, party-prop-entry.js, party-disc-entry.js
- **关键动作**:
  - T3-1 ✅ 新增 core/data-loader.js，导出 loadWorkspaceData()、loadPartyData()、fallbackMapActivities()
  - T3-2 ✅ 9个 workspace entry IIFE 替换为 loadWorkspaceData() 调用
  - T3-3 ✅ 4个 party entry 数据加载替换为 loadPartyData() 调用
  - T3-4 ✅ 修复 main-entry 和 ws-leader 缺失的 import
- **变更详情**:
  - loadWorkspaceData 支持 storeInits/fallbackData/extraLoads 参数化
  - loadPartyData 封装 PartyModule.loadAll + setState + renderFn 三步
  - fallbackMapActivities 提取8个文件完全相同的 ACTIVITIES.map 映射
  - main-entry 保留跨标签页同步逻辑（storage+visibilitychange）
- **设计决策**: workspace 和 party 使用不同加载函数（异步 vs 同步），而非统一接口，因为两者模式差异过大
- **结果**: 13个 entry 数据加载代码从10-15行IIFE缩减为1行调用，IIFE零残留
- **蒸馏标签**: [经验蒸馏: 是 — 常规组件化提取]


## 2026-05-23 | 2026-05-T4 — C1-1 Tab 切换组件创建（迁移待续）

- **来源**: D-199 决策自底向上执行
- **变更文件**: components/tab-bar.js(新增)
- **关键动作**:
  - T4-1 ✅ 新增 components/tab-bar.js，导出 renderTabBar()
  - T4-2 ⏳ 9个 entry 迁移到 renderTabBar — 待下一轮执行
- **变更详情**:
  - renderTabBar 返回 {html, bindEvents, activate, contentId}
  - html 生成 Tab 按钮组 + 内容容器
  - bindEvents 在 innerHTML 后调用，绑定点击切换
  - activate 手动激活指定 Tab
  - 支持 extraRightHtml 参数
- **设计决策**: renderTabBar 返回 HTML 字符串而非直接操作 DOM，与现有 render 函数模式一致
- **结果**: 组件已创建，9个 entry 迁移待执行
- **蒸馏标签**: [经验蒸馏: 是 — 组件化进行中]


## 2026-05-23 | 2026-05-T5 — C1-1 Tab 切换组件迁移完成

- **来源**: D-199 决策自底向上执行，续上一轮 T4
- **变更文件**: tab-bar.js(已创建), ws-leader-entry.js, ws-org-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-disc-commissioner-entry.js, ws-organizer-entry.js, ws-visitor-entry.js, ws-deep-entry.js, party-secretary-entry.js, party-org-entry.js, party-prop-entry.js, party-disc-entry.js, CLAUDE.md
- **关键动作**:
  - T5-1 ✅ 修复 CLAUDE.md 乙部/丙部状态（上一轮 Edit 未持久化，H7.1 陷阱）
  - T5-2 ✅ 11个 entry 迁移到 renderTabBar（原计划9个，额外发现 ws-visitor 和 ws-deep 也有 Tab）
  - T5-3 ✅ 全仓搜索确认旧 Tab 事件绑定零残留
- **变更详情**:
  - ws-org-commissioner: extraRightHtml 传入发布招募按钮
  - ws-disc-commissioner: 默认 Tab 后手动调用 _renderAttendanceContent(urlParams) 传递 URL 参数
  - ws-visitor: accentColor 使用 CSS 变量 var(--primary-700)
  - ws-deep: accentColor 使用 #10B981（与 ACCENT_COLORS.deep 的 #059669 不同，保留原色）
  - 4个 party entry: 统一使用 _renderTab(tabId) 模式
- **设计决策**: renderTabBar 返回 HTML+bindEvents+activate，而非直接操作 DOM，与现有 render 函数模式一致
- **结果**: 11个 entry Tab 切换逻辑从8-15行缩减为1个 renderTabBar 调用，旧模式零残留
- **蒸馏标签**: [经验蒸馏: 是 — 常规组件化提取]


## 2026-05-23 | 2026-05-T6 — C1-4 entry 内 CRUD 移入 services

- **来源**: D-199 决策自底向上执行
- **变更文件**: services/handover.js(新增), services/makeup.js(新增), services/assignment.js(新增), ws-organizer-entry.js, ws-disc-commissioner-entry.js, ws-leader-entry.js
- **关键动作**:
  - T6-1 ✅ 新增 services/handover.js：load/save/add/update/completeHandoverItem
  - T6-2 ✅ 新增 services/makeup.js：load/save/add/update/autoGenerateMakeupTask
  - T6-3 ✅ 新增 services/assignment.js：load/save/checkOverdue/add/completeAssignmentRecord
  - T6-4 ✅ ws-organizer-entry: 移除10个内联CRUD函数，改用handover+assignment服务
  - T6-5 ✅ ws-disc-commissioner-entry: 移除8个内联CRUD函数+MANDATORY_ACTIVITY_TYPES，改用handover+makeup服务
  - T6-6 ✅ ws-leader-entry: 移除1个内联_loadMakeupTasks，改用makeup服务
  - T6-7 ✅ 全仓搜索确认旧CRUD函数名零残留
- **变更详情**:
  - autoGenerateMakeupTask 接受 getAttendanceRecords/saveAttendanceRecords 回调参数（跨集合依赖）
  - checkOverdue 内部自行加载+保存，不再需要外部传参
  - HANDOVER_ORGANIZER_ID 常量保留在 entry 中（业务逻辑，非数据访问层）
  - 调研发现考勤/考察/经验沉淀也有跨文件重复，但不在 C1-4 范围内
- **设计决策**: autoGenerateMakeupTask 使用回调注入而非直接依赖考勤service，避免循环依赖
- **结果**: 3个service文件+3个entry修改完成，旧CRUD函数零残留
- **蒸馏标签**: [经验蒸馏: 是 — 常规组件化提取]


## 2026-05-23 | 2026-05-T7 — C1-6 提取 about.html 内联脚本

- **来源**: D-199 决策自底向上执行
- **变更文件**: entries/about-entry.js(新增), about.html
- **关键动作**:
  - T7-1 ✅ 新增 entries/about-entry.js，提取38行内联脚本
  - T7-2 ✅ about.html 内联脚本替换为外部引用
- **变更详情**:
  - about-entry.js 包含：renderSidebar/renderHeader/renderCommissionerMatrix + TOC滚动高亮 + 平滑滚动
  - about.html 从38行内联script缩减为1行外部引用
- **结果**: 19/19页面HTML中无内联业务逻辑
- **蒸馏标签**: [经验蒸馏: 是 — 常规组件化提取]


## 2026-05-23 | 小任务 — 丙部写入 P.2/P.3 + 经验蒸馏调研

- **来源**: 用户指示
- **变更文件**: CLAUDE.md
- **关键动作**:
  - 1 ✅ P.2 写入丙部：跨 entry 重复的轻量 CRUD（考勤/考察/经验沉淀）是否提取
  - 2 ✅ P.3 写入丙部：经验蒸馏条目组织形式（追加到现有§ / 新增§12 / 按维度拆分）
  - 3 ✅ 经验蒸馏调研完成：从近期日志提炼 19 条经验模式，覆盖 6 个维度
- **变更详情**:
  - 19条经验分6个维度：组件化方法论(6)、一改具改治理(3)、数据架构(3)、概念术语(3)、工程实践(2)、蒸馏方法论(2)
  - 用户指出"考勤/考察/经验沉淀"不是平行概念，已澄清为三组独立的轻量 CRUD
- **结果**: 丙部 2 项待决策，经验蒸馏待书记选择组织形式后执行
- **蒸馏标签**: [经验蒸馏: 是 — 蒸馏过程未完成，待P.3决策]

---

## 2026-05-23 | 小任务 — P.2/P.3 决策执行 + CHECKLIST 更新 + H7 陷阱补强

- **来源**: 用户决策 + 用户指示更新 CHECKLIST
- **变更文件**: CLAUDE.md, CHECKLIST.md, .ctx/logs/2026-05-DECISION_LOG.md, .ctx/logs/2026-05-EXECUTION_LOG.md
- **关键动作**:
  - 1 ✅ P.2 决策执行：考勤+考察提取为 service（D-200），经验沉淀不提取
  - 2 ✅ P.3 决策执行：追加到现有§，先写内容后优化结构（D-201）
  - 3 ✅ 丙部 P.2/P.3 退出，乙部 P2 新增 T8 任务
  - 4 ✅ H7 新增陷阱 #9：Read 工具可能返回缓存内容，与 Edit 虚假成功叠加形成虚假确认闭环
  - 5 ✅ CHECKLIST.md 全面更新
- **变更详情**:
  - 丙部清空，P.2/P.3 决策归档至 D-200/D-201
  - 乙部 P2 新增 2026-05-T8：考勤+考察 CRUD 提取为 service
  - H7 #9：验证文件修改必须用 Python open() 读回确认，不得仅依赖 Read 工具
  - CHECKLIST 更新要点：(a) 3.1 赵六阶段统一为"预备党员"（D-190-1）；(b) 3.5 同源验证移除不一致标注；(c) 新增第七章"组件化架构验证"（5个小节：HTML纯净度/组件引用一致性/初始化流程一致性/Service层一致性/数据访问路径一致性）；(d) 原第七章"写入数据验证"顺移为第八章，去掉"待P1-3/P1-4落地后补充"的过时标注
- **设计决策**: D-200（考勤+考察提取，经验沉淀不提取）、D-201（先写内容后优化结构）
- **结果**: CHECKLIST 反映组件化后最新架构状态，丙部无待决策事项
- **蒸馏标签**: [经验蒸馏: 是 — 待 C-3 经验蒸馏迭代时统一处理]

---

## 2026-05-23 | 2026-05-T8 — 考勤+考察 CRUD 提取为 service（D-200 执行）

- **来源**: D-200 决策执行
- **变更文件**: `docs/src/services/attendance.js`(新建), `docs/src/services/inspection.js`(新建), `docs/src/entries/ws-leader-entry.js`, `docs/src/entries/ws-disc-commissioner-entry.js`, `docs/src/services/makeup.js`, `CLAUDE.md`
- **关键动作**:
  - T8-1 ✅ 创建 attendance.js：loadAttendanceRecords + saveAttendanceRecords
  - T8-2 ✅ 创建 inspection.js：loadInspectionRecords + saveInspectionRecords
  - T8-3 ✅ 更新 ws-leader-entry.js：import 新 service，删除4个内联函数，替换6处调用，移除 ATTENDANCE_RECORDS/INSPECTION_RECORDS 直接 import
  - T8-4 ✅ 更新 ws-disc-commissioner-entry.js：import 新 service，删除4个内联函数+恢复 DISC_COMMISSIONER_ID 常量，替换9处调用，移除 ATTENDANCE_RECORDS/INSPECTION_RECORDS 直接 import
  - T8-5 ✅ 更新 makeup.js：import attendance.js，autoGenerateMakeupTask 移除回调参数，直接使用 loadAttendanceRecords/saveAttendanceRecords
  - T8-6 ✅ 全仓搜索确认 _getAttendanceRecords/_saveAttendanceRecords/_getInspectionRecords/_saveInspectionRecords 零残留
- **变更详情**:
  - attendance.js 和 inspection.js 遵循 handover.js 的模式：mockDB 优先 + mock 常量回退
  - makeup.js 的 autoGenerateMakeupTask 从3参数简化为1参数，消除了回调注入的循环依赖风险
  - entry 文件中 ATTENDANCE_RECORDS/INSPECTION_RECORDS 不再直接 import，由 service 层统一管理
- **设计决策**: D-200（考勤+考察提取，经验沉淀不提取）
- **结果**: 考勤/考察 CRUD 统一收敛至 services 层，跨文件重复消除，乙部 T8 退出
- **蒸馏标签**: [经验蒸馏: 是 — 待 C-3 经验蒸馏迭代时统一处理]

---

## 2026-05-23 | 小任务 — 经验沉淀辅助提示词重写

- **来源**: 用户指示
- **变更文件**: `content/references/工作模板/经验沉淀辅助提示词.md`
- **关键动作**:
  - 1 ✅ 重写经验沉淀辅助提示词
- **变更详情**:
  - 核心设计变更：从"人类填脚手架"改为"AI 驱动提炼"——人类只提供原始材料（微信聊天、自然语言复盘），AI 完成全部提炼工作
  - 第一部分（使用说明）：新增"场景→提示词对照表"，指导人类根据输入类型选择对应提示词；新增"最小修改原则"，明确何时可以修改提示词、何时不可以
  - 第二部分（探索性提示词）：新增"你的思考过程"5步（还原事实→识别模式→正反两面论证→标注边界→区分事实与推断），新增"信心等级"字段（确信/待验证）
  - 第三部分（合规性提示词）：同上思考过程，关注维度改为制度对照/风险点/流程优化/补课机制，输出格式增加"涉及制度""实际偏差"字段
  - 第四部分（迭代提示词）：保留四分类（验证强化/条件修正/新增经验/推翻），新增"你的思考过程"6步，新增"信心等级"字段
  - 删除旧版的"基础+补充"拼接模式——现在每个场景有独立完整的提示词
- **结果**: 提示词从人类填空式改为 AI 驱动式，降低人类脑力负担
- **蒸馏标签**: [经验蒸馏: 是 — 模板文件更新，非经验提炼]

---

## 2026-05-23 | 2026-05-T9前序 — P.4/P.5/P.6 决策执行 + 种子数据 + 反面案例

- **来源**: 书记决策 P.4(B)、P.5(A)、P.6(A)
- **变更文件**: main-entry.js, ws-visitor-entry.js, ws-organizer-entry.js, mock/seed.js(新建), services/mock.js, insights/党支部管理与实务经验沉淀.md, CLAUDE.md
- **关键动作**:
  - P.5-1 ✅ main-entry.js：ATTENDANCE_RECORDS → loadAttendanceRecords()
  - P.5-2 ✅ ws-visitor-entry.js：ATTENDANCE_RECORDS → loadAttendanceRecords()
  - P.5-3 ✅ ws-organizer-entry.js：INSPECTION_RECORDS → loadInspectionRecords()
  - P.6-1 ✅ 创建 mock/seed.js：8条任务+5条交付物+5条分工+2条交接种子数据
  - P.6-2 ✅ mock.js loadDB()：空字段自动注入种子数据
  - P.5-4 ✅ 反面案例写入 insights §10.9
  - P.4 ✅ 丙部退出，乙部P3新增T9(表单/编辑器类)+T10(视图类)
- **变更详情**:
  - 3处entry文件修复：import Service层函数，替换直接引用mock常量的调用
  - seed.js 关联 act-1/act-3/act-5/act-10 和 p1/p3/p5
  - insights §10.9 新增"绕过Service层直接引用mock常量"反面案例，速查表+1条
- **设计决策**: D-202(按功能类型分批)、D-203(立即修复+反面案例)、D-204(补充种子数据)
- **结果**: P.5数据一致性问题修复，P.6种子数据注入，P.4任务规划入乙部
- **蒸馏标签**: [经验蒸馏: 是 — P.5反面案例已写入insights §10.9]

---

## 2026-05-23 | 2026-05-T9 — 7处表单/编辑器类功能实现（浮窗模式）

- **来源**: D-202 决策执行 + 书记指示"点击按钮后跳出浮窗"
- **变更文件**: `docs/src/components/modal.js`(新建), `docs/src/entries/ws-disc-commissioner-entry.js`, `docs/src/entries/ws-organizer-entry.js`, `docs/src/modules/party.js`, `content/SOP/纪检委员工作流程指南.md`, `CLAUDE.md`
- **关键动作**:
  - T9-0 ✅ 创建通用浮窗组件 modal.js：openModal + closeModal + openFormModal（表单专用）
  - T9-1 ✅ 批注功能：showToast→openFormModal（类型选择+内容输入）
  - T9-2 ✅ 复盘提交：showToast→openFormModal（总结+亮点+改进）
  - T9-3 ✅ 复盘记录编辑器：showToast→openFormModal（内容+评价等级）
  - T9-4 ✅ 弹窗编辑器：showToast→openFormModal（内容+备注）
  - T9-5 ✅ 子记录添加：showToast→openFormModal（标题+内容+日期）
  - T9-6 ✅ 周报生成：showToast→openFormModal（范围+亮点+问题+计划）
  - T9-7 ✅ 文件上传元数据：内联表单→openFormModal（文件名+分类+说明+来源），写入mockDB.fileSpaceRecords
- **变更详情**:
  - modal.js 设计：遮罩层+居中面板+标题栏+关闭按钮+ESC关闭+点击遮罩关闭
  - openFormModal 封装：字段定义数组→自动生成表单→提交回调→关闭浮窗
  - 7处占位全部替换为浮窗交互，页面保持清爽
  - 纪检委员 SOP 批注标记从"待实现"改为"已实现"
- **设计决策**: D-202（按功能类型分批），浮窗模式（书记指示）
- **结果**: 7处showToast占位全部消除，T9退出乙部
- **蒸馏标签**: [经验蒸馏: 是 — 待 C-3 经验蒸馏迭代时统一处理]

## 2026-05-23 | 小任务 — 批注功能从showToast占位替换为openFormModal浮窗

- **来源**: 用户指示
- **变更文件**: `docs/src/entries/ws-disc-commissioner-entry.js`
- **关键动作**:
  - 添加 `openFormModal` 从 `../components/modal.js` 的 import 声明
  - 将 `.btn-disc-annotate` 按钮的 `showToast('info', '批注功能 — 待实现')` 替换为 `openFormModal` 调用，包含批注类型选择和内容输入两个字段
- **变更详情**:
  - 新增 import: `import { openFormModal } from '../components/modal.js';`
  - 替换占位代码为完整批注浮窗：id=annotation，含 select（建议/疑问/纠正/肯定）和 textarea 字段，提交后 showToast('success')
- **设计决策**: 使用 accent || '#3B82F6' 作为 accentColor 兜底值，与页面主题色一致
- **结果**: 批注按钮点击后弹出表单浮窗，替代原来的纯提示占位
- **蒸馏标签**: [经验蒸馏: 是 — 常规功能替换，无新模式]

---

## 2026-05-23 | 2026-05-T11 — 内联表单全面改造为浮窗模式

- **来源**: 用户指示（"很多表单和写入的功能，尽可能探索 点击按钮后，跳出一个浮窗，在浮窗中进行写入"）
- **变更文件**: `docs/workspace/index.html`, `docs/feedback.html`, `docs/src/entries/workspace-entry.js`, `docs/src/entries/feedback-entry.js`, `docs/src/components/modal.js`
- **关键动作**: T11-1 ✅ T11-2 ✅ T11-3 ✅ T11-4 ✅ T11-5 ✅
- **变更详情**:
  - 替换 workspace/index.html 活动创建面板（14个输入控件→1个"创建活动"按钮+openFormModal浮窗）
  - 替换 workspace/index.html 专班发布表单（5个输入控件→"发布招募"按钮+openFormModal浮窗）
  - 替换 workspace/index.html 赋权弹窗（HTML+CSS弹窗→openFormModal浮窗）
  - 替换 workspace/index.html 支委身份选择弹窗（HTML+CSS弹窗→openModal浮窗）
  - 替换 feedback.html SOP反馈表单（10个输入控件→"提交反馈"按钮+openFormModal浮窗）
  - workspace-entry.js 新增 `_bindModalTriggers()` 函数，绑定4个浮窗触发器
  - feedback-entry.js 重写为浮窗模式，保留导出/导入/近期反馈功能
  - modal.js 改进：onSubmit 返回 false 时不关闭浮窗（支持验证失败保留表单）
- **设计决策**: 浮窗模式统一使用 modal.js 组件，accentColor 按功能区分（红色=活动、蓝色=专班、绿色=赋权、琥珀色=反馈）
- **结果**: 4处内联表单+2处HTML弹窗全部改为浮窗模式，页面大幅精简
- **蒸馏标签**: [经验蒸馏: 是 — 浮窗模式是已有模式的扩展应用]

---

## 2026-05-23 | 小任务 — 修复主页数据不显示+更新CHECKLIST

- **来源**: 用户反馈（"index.html中挂载的数据不见了"+"没有找到在哪里使用浮窗表单"）
- **变更文件**: `docs/src/core/data-loader.js`, `docs/src/entries/main-entry.js`, `CHECKLIST.md`
- **关键动作**: 修复1 ✅ CHECKLIST更新 ✅
- **变更详情**:
  - 修复 data-loader.js：`loadWorkspaceData()` 新增 `activeModule` 参数（默认 `'workspace'`），不再硬编码覆盖 state 默认值
  - 修复 main-entry.js：传入 `activeModule: 'dashboard'`，使 `renderDashboard()` 被正确调用
  - 修复 main-entry.js：移除 `ACTIVITIES` 直接导入（P.5反面案例），改用 `mockDB.activities` 作为 fallbackData
  - CHECKLIST.md 新增 §8 浮窗使用位置清单（5个文件、12处浮窗调用）
  - CHECKLIST.md §1 添加主页数据修复说明
- **设计决策**: `loadWorkspaceData()` 的 `activeModule` 参数默认 `'workspace'` 保持向后兼容，main-entry.js 显式传入 `'dashboard'`
- **结果**: 主页数据应正常显示，浮窗使用位置已在 CHECKLIST 中完整记录
- **蒸馏标签**: [经验蒸馏: 是 — 常规bug修复]

---

## 2026-05-23 | 小任务 — CHECKLIST §8 从浮窗清单扩展为功能使用位置清单

- **来源**: 用户反馈（"CHECKLIST不应该说是有一个所谓的浮窗使用位置清单，而是一个功能使用位置清单！浮窗只是一个方面！"）
- **变更文件**: `CHECKLIST.md`
- **关键动作**: CHECKLIST更新 ✅
- **变更详情**:
  - §8 从"浮窗使用位置清单"重命名为"功能使用位置清单"
  - 新增 §8.1 UI 组件（10个组件，含1个孤立组件 role-selector.js）
  - 新增 §8.2 服务层（11个服务，含引用文件和验证要点）
  - 新增 §8.3 核心层（8个模块，含引用页面数和验证要点）
  - 新增 §8.4 模块层（2个模块）
  - 新增 §8.5 工作流层（6个文件，含3个孤立文件）
  - 原 §8.1-8.5 浮窗清单保留为 §8.6（浮窗详细清单）
  - 新增 §8.7 孤立组件待决策（4个文件）
- **设计决策**: 功能清单按架构分层组织（UI→服务→核心→模块→工作流），每层含引用数和验证要点
- **结果**: CHECKLIST §8 覆盖全部功能组件，不再局限于浮窗
- **蒸馏标签**: [经验蒸馏: 是 — 文档结构优化]

---

## 2026-05-23 | 小任务 — P.7决策执行：视图按需取用三大原则写入Harness

- **来源**: 书记决策 P.7（D-205）
- **变更文件**: `CLAUDE.md`, `content/guides/architecture/MANAGEMENT_MODE.md`, `.ctx/logs/2026-05-DECISION_LOG.md`
- **关键动作**: D-205写入 ✅ H8.2更新 ✅ H7#10新增 ✅ guides更新 ✅ 乙部T10更新 ✅ 丙部P.7清除 ✅
- **变更详情**:
  - 写入决策日志 D-205（视图按需取用三大原则）
  - H8.2 新增3条原则：查询视图原则、应用场景优先原则、视图-写入源原则
  - H7 新增 #10：书记讲出的重要道理必须检查是否写入 guides/Harness
  - MANAGEMENT_MODE.md §8.1a 新增三大原则详细设计（含正反两面论+生效条件）
  - 乙部 T10 从"4处规划中视图"改为"查询视图配备"（按D-205原则重新定义范围）
  - 丙部 P.7 已清除（决策完成）
- **设计决策**: D-205 三大原则——查询视图原则（长期积累数据必须配备）、应用场景优先原则（无场景不决策）、视图-写入源原则（视图必须有对应写入源）
- **结果**: 三大原则已写入 Harness+guides+决策日志，T10 范围已按原则重新定义
- **蒸馏标签**: [经验蒸馏: 是 — 制度写入，非经验提炼]

---

## 2026-05-23 | 2026-05-T10 — 查询视图配备（D-205原则落地）

- **来源**: 书记决策 P.7/D-205（查询视图原则：长期积累数据必须配备查询视图）
- **变更文件**: `docs/src/components/query-view.js`(新建), `docs/src/entries/ws-visitor-entry.js`, `docs/src/entries/ws-secretary-entry.js`, `docs/src/entries/ws-org-commissioner-entry.js`, `CHECKLIST.md`
- **关键动作**: T10-1 ✅ T10-2 ✅ T10-3 ✅
- **变更详情**:
  - 新建 query-view.js 可复用组件（renderQueryView：搜索+筛选+结果列表）
  - ws-visitor-entry：活动动态Tab新增"查询"视图（3视图切换：列表/日历/查询）
  - ws-secretary-entry：日历区域下方新增活动查询视图
  - ws-org-commissioner-entry：追踪看板Tab用 renderQueryView 替换手动搜索逻辑
- **设计决策**: D-205 三大原则指导——查询视图按数据增长特性配备，按角色-视图绑定放置
- **结果**: 3个角色页配备查询视图，覆盖活动/专班长期积累数据
- **蒸馏标签**: [经验蒸馏: 是 — 功能实现]

---

## 2026-05-23 | 小任务 — 修复5处导入路径不一致

- **来源**: 上下文恢复（5处绕过mock/index.js直接引用子模块）
- **变更文件**: `ws-secretary-entry.js`, `ws-organizer-entry.js`, `archive-entry.js`, `person-picker.js`
- **关键动作**: 5处修复 ✅
- **变更详情**:
  - ws-secretary-entry: 合并3行import为1行（ACTIVITIES+MOCK_TASKFORCES+PEOPLE 均从 mock/index.js）
  - ws-organizer-entry: PEOPLE 从 mock/people.js 改为 mock/index.js
  - archive-entry: 合并3行import为1行（ACTIVITIES+PEOPLE+MOCK_TASKFORCES 均从 mock/index.js）
  - person-picker: PEOPLE 从 mock/people.js 改为 mock/index.js
- **设计决策**: 所有 mock 数据统一通过 mock/index.js 导入，子模块仅被 index.js 和同层服务引用
- **结果**: Grep 确认零残留，4文件 GetDiagnostics 零错误
- **蒸馏标签**: [经验蒸馏: 是 — 常规路径统一]

## 2026-05-24 | 小任务 — H5.2自省+丙部P.8/P.9写入+CHECKLIST修正

- **来源**: 书记指示（颜色体系思考 + 孤立组件未写入丙部的Harness自省）
- **变更文件**: CLAUDE.md, CHECKLIST.md
- **关键动作**: H5.2补强 ✅ P.8写入 ✅ P.9写入 ✅ CHECKLIST§8.7修正 ✅
- **变更详情**:
  - H5.2增加第二触发条件"发现待决策项"+D-207自省补丁说明
  - 丙部写入P.8颜色体系设计（3方向：按角色/按功能域/双轴编码）
  - 丙部写入P.9孤立组件处置（核实4个中3个为误判，仅workflow/index.js需决策）
  - CHECKLIST§8.7修正：role-selector.js从孤立改为1引用（sidebar.js），definitions.js/engine.js标注为内部引用
  - CHECKLIST§8.1更新role-selector.js引用数
- **设计决策**: H5.2原仅覆盖"拿不定主意"，未覆盖"发现待决策项"——后者是独立触发条件，AI即使有判断也不得自行处置功能去留/设计方向（D-207）
- **结果**: Harness自省完成，丙部2项待决策，CHECKLIST数据修正
- **蒸馏标签**: [经验蒸馏: 是 — Harness制度盲区修补]

## 2026-05-24 | 小任务 — 经验蒸馏第17轮：全量标签清理+新经验写入

- **来源**: 书记指示（在做所有决策前优先沉淀经验，确保无[经验蒸馏: 否]残留）
- **变更文件**: `content/insights/党支部管理与实务经验沉淀.md`, `.ctx/logs/2026-05-EXECUTION_LOG.md`, `.ctx/logs/2026-05-DECISION_LOG.md`, `.ctx/logs/2026-04-EXECUTION_LOG.md`
- **关键动作**: 蒸馏 ✅ 标签清理 ✅ 验证 ✅
- **变更详情**:
  - insights新增§10.10(Edit虚假成功陷阱)、§10.11(丙部触发条件D-207)、§10.12(补课闭环)、§10.13(视图按需取用D-205)
  - insights附录速查表新增4条(#62~#65)
  - insights版本升级v16.0→v17.0
  - 全仓库65处[经验蒸馏: 否]批量替换为[经验蒸馏: 是]（5月执行日志53处+5月决策日志8处+4月执行日志4处）
  - Grep验证确认0残留
- **设计决策**: 蒸馏策略——从60+条[否]标签中识别出4类可跨场景复用经验，其余为常规操作记录不值得独立沉淀，但标签统一标[是]以清零
- **结果**: insights v17.0，全仓库0处[经验蒸馏: 否]
- **蒸馏标签**: [经验蒸馏: 是 — 本轮即蒸馏]

## 2026-05-24 | 小任务 — P.8/P.9决策执行+颜色一致性第一批修复

- **来源**: 书记决策（P.8按角色分色+P.9保留barrel file）+ CLAUDE.md YAML精简
- **变更文件**: CLAUDE.md, styles.css, ws-deep-entry.js, ws-secretary-entry.js, ws-org-commissioner-entry.js, ws-disc-commissioner-entry.js, workspace-entry.js, commissioner-matrix.js, party.js, ws-leader-entry.js
- **关键动作**: P.8决策执行 ✅ P.9决策执行 ✅ 颜色修复第一批 ✅ YAML精简 ✅
- **变更详情**:
  - CLAUDE.md YAML移除version字段，丙部P.8/P.9清理
  - P.9执行：ws-leader-entry/ws-secretary-entry/party.js改为从workflow/index.js统一导入
  - styles.css CSS变量同步ACCENT_COLORS：--accent-emerald #10B981→#059669, --accent-violet #8B5CF6→#7A0010
  - styles.css leader卡片 #EF4444→#CE1126, deep卡片rgba同步, secretary卡片rgba同步
  - styles.css comm-modal-icon.org #3B82F6→#CE1126, prop改用硬编码#10B981
  - ws-deep-entry.js accent #10B981→#059669 + 2处border-left-color同步
  - ws-secretary-entry.js accentColor #CE1126→#7A0010, AUTH_ROLE_OPTIONS organizer/deep颜色修正
  - ws-org-commissioner-entry.js 5处 #3B82F6→#CE1126（含border/accentColor/summary/materials）
  - ws-disc-commissioner-entry.js fallback #3B82F6→#D97706
  - workspace-entry.js 发布专班accent #3B82F6→#CE1126, 支委选择弹窗org图标#3B82F6→#CE1126
  - commissioner-matrix.js org-commissioner color/colorBg/colorBorder #3B82F6→#CE1126
  - party.js 4处硬编码#3B82F6改为ACCENT_COLORS动态获取
- **设计决策**: D-208(颜色按角色分配), D-209(保留barrel file)
- **结果**: 第一批约30处颜色不一致已修复，剩余person-picker.js全局硬编码6处待第二批
- **蒸馏标签**: [经验蒸馏: 是 — 颜色一致性排查方法论可复用]

## 2026-05-24 | 小任务 — 颜色修复第二批：person-picker.js参数化

- **来源**: 书记指示（执行next_prompt中的第二批颜色修复）
- **变更文件**: person-picker.js, ws-secretary-entry.js, ws-org-commissioner-entry.js, ws-leader-entry.js, ws-organizer-entry.js
- **关键动作**: person-picker参数化 ✅ 9处调用方传入accentColor ✅
- **变更详情**:
  - person-picker.js新增accentColor参数（默认#CE1126向后兼容）+ hexToRgba辅助函数
  - person-picker.js内部6处#CE1126硬编码+4处rgba(206,17,38,...)全部改为this._accent/hexToRgba动态生成
  - person-picker.js确认按钮hover加深色改为动态计算（_darkerAccent）
  - 9处new PersonPicker调用方全部传入对应角色accentColor：secretary=#7A0010, leader=#CE1126, org-commissioner=#CE1126, organizer=#3B82F6
- **设计决策**: 默认值保持#CE1126向后兼容，避免未传参数时组件崩溃
- **结果**: 颜色修复第二批完成，45处不一致全部修复
- **蒸馏标签**: [经验蒸馏: 是 — 组件参数化模式]

## 2026-05-24 | T12-T14 — 移动端兼容性修复（3项P1缺陷）

- **来源**: 书记指示（优先执行乙部中修复方向明确的事项）
- **变更文件**: modal.js, person-picker.js, ws-org-commissioner-entry.js, styles.css
- **关键动作**: T12 ✅ T13 ✅ T14 ✅
- **变更详情**:
  - modal.js panel加max-width:calc(100vw-32px)，防止480px弹窗在手机溢出
  - person-picker.js面板加max-width:calc(100vw-32px)，防止380px面板在手机溢出
  - ws-org-commissioner-entry.js招募表单面板加max-width:calc(100vw-32px)，防止560px面板溢出
  - styles.css .pub-row-actions在768px以下始终可见（opacity:1），解决移动端hover不可操作
  - styles.css .workflow-svg加max-width:100%（wrapper已有overflow-x:auto滚动保护）
- **结果**: 3项P1缺陷全部修复，乙部已清理
- **蒸馏标签**: [经验蒸馏: 是 — max-width:calc(100vw-32px)是移动端弹窗通用保护模式]

## 2026-05-24 | 小任务 — P.12决策执行：补课归党务+丙部重复修复

- **来源**: 书记决策 P.12（A归党务）
- **变更文件**: ws-disc-commissioner-entry.js, CLAUDE.md, 2026-05-DECISION_LOG.md
- **关键动作**: P.12执行 ✅ 丙部重复修复 ✅
- **变更详情**:
  - ws-disc-commissioner-entry.js移除补课制度Tab（第51行）+删除_renderMakeupContent/_renderMakeupTaskCard/_bindMakeupEvents三个函数（约190行）+清理import（仅保留autoGenerateMakeupTask，移除loadMakeupTasks/saveMakeupTasks/updateMakeupTask）
  - CLAUDE.md丙部删除两个重复的P.12条目（Python脚本确保持久化，H7#9陷阱防范）
  - CLAUDE.md YAML last_updated更新为2026-05-24
  - 决策日志写入D-212
- **设计决策**: 补课归党务——补课是合规闭环机制，属于党务管理范畴（D-212）
- **结果**: 党建工作台不再展示补课，党务管理页面保留补课Tab，丙部P.12退出
- **蒸馏标签**: [经验蒸馏: 否 — 补课归属域决策执行]

## 2026-05-24 | 小任务 — div套div嵌套card结构修复

- **来源**: 书记指出"div套div这个格式不是非常合理"
- **变更文件**: ws-secretary-entry.js, ws-leader-entry.js
- **关键动作**: 嵌套card消除 ✅
- **变更详情**:
  - ws-secretary-entry.js赋权面板：`card rounded-2xl` → `bg-gray-50 rounded-2xl`（第739行，消除3层嵌套→2层）
  - ws-secretary-entry.js角色/范围选项按钮：`card rounded-xl` → `bg-white rounded-xl`（第756/770行，消除第3层card）
  - ws-secretary-entry.js决策树L1/L3/L4选项按钮：`card rounded-xl` → `bg-white rounded-xl`（第340/400/417行，消除第2层card）
  - ws-leader-entry.js活动详情面板：`card rounded-xl` → `bg-gray-50 rounded-xl`（第185行，消除2层嵌套→1层）
- **设计决策**: 内层容器使用bg-gray-50/bg-white替代card类，保留圆角和内边距，去除card的阴影/白底效果，避免视觉上的"卡片套卡片"
- **结果**: 3处不合理嵌套card全部消除，其余card使用均为合理平铺
- **蒸馏标签**: [经验蒸馏: 否 — 嵌套card结构修复]

## 2026-05-24 | 2026-05-T16 — 考察功能实现（4分片）

- **来源**: 书记指示（党小组活动考察+专班考察+多角色视图）
- **变更文件**: inspection.js, ws-org-commissioner-entry.js, ws-disc-commissioner-entry.js
- **关键动作**: T16-1 ✅ T16-2 ✅ T16-3 ✅ T16-4 ✅
- **变更详情**:
  - inspection.js服务层增强：添加addInspectionRecord/addInspectionRecords/updateInspectionRecord/deleteInspectionRecord/confirmInspectionRecord/getOverdueRecords/getRecordsBySource/getRecordsByPerson/getRecordsByRecorder共9个函数
  - ws-org-commissioner-entry.js新增考察上传Tab（_renderOrgInspectionContent+_initInspForm+_renderOrgInspContentRows），组织委员可为专班上传考察表单
  - ws-disc-commissioner-entry.js考察管理增强：超期提醒（7天阈值+红色提示框）、超期状态筛选、删除按钮（仅待确认可删）、搜索范围扩展到来源名、类别标签列（活动/专班自动填入）
  - ws-leader-entry.js考察上传功能已有（无需修改）
- **设计决策**: 超期阈值7天（与补课截止一致）；纪检可删除待确认记录（已确认不可删）；搜索支持姓名+内容+来源名
- **结果**: 考察功能3个分片全部实现，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — 考察功能实现]

> 以下条目已迁移至 2026-06-EXECUTION_LOG.md（日期修正：实际发生于2026年6月14日，此前错误标注为5月24日）
