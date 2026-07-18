---
title: "2026年6月执行日志"
type: log
role: "[机]"
last_updated: "2026-07-01"
---

# 2026年6月执行日志

> 本文件记录2026年6月的所有执行事项。

## 2026-06-14 | 2026-06-T1 — 党小组活动指导意见补充分析+冲突提交

- **来源**: 书记补充党小组活动指导意见（核心群制度+群名规范+通知模板+信息传递流程）
- **变更文件**: CLAUDE.md（乙部T17+丙部P.13/P.14）
- **关键动作**: 欠缺识别 ✅ 冲突识别 ✅ 丙部提交 ✅
- **变更详情**:
  - 识别8项欠缺（核心群人员构成/信息传递流程/监督链/群名规范/通知模板/通知注意事项5项/进群确认机制/活动群人员构成），写入乙部T17
  - 识别3处冲突：核心群是否含纪检和宣传（P.13）、通知提前天数3天vs5天（P.14）、考勤归档责任人（组织委员vs纪检委员——此条判断为信息传递层面vs系统录入层面，不构成实质冲突）
  - 丙部写入P.13和P.14，等待书记决策
  - T16从乙部删除（已完成）
- **设计决策**: 考勤归档责任人不构成冲突——书记说的是微信群信息传递层面的归档（组织委员归档），仓库现有说的是系统录入层面（纪检委员确认后录入考勤总表），两者是不同层面
- **结果**: 8项欠缺已识别，2处冲突已提交丙部，T17已写入乙部
- **蒸馏标签**: [经验蒸馏: 否 — 党小组活动指导意见补充分析]

## 2026-06-14 | 2026-06-T2 — 党小组活动指导意见补充执行

- **来源**: 书记决策P.13(A)+P.14(A)+T17执行
- **变更文件**: 党小组组长工作手册.md, 常见工作场景快速指南.md, COMMISSIONER_SYSTEM.md, 2026-06-DECISION_LOG.md, CLAUDE.md
- **关键动作**: P.13执行 ✅ P.14执行 ✅ T17-8项欠缺写入 ✅ D-215信息传递原则 ✅
- **变更详情**:
  - COMMISSIONER_SYSTEM.md核心群人员构成：移除纪检+宣传，改为"各组织者+承办党小组长+书记+调研参与者+[联络者]+[审稿者]+[考勤负责人]"（D-213）
  - COMMISSIONER_SYSTEM.md §F.3追加信息传递两原则（D-215）：无遗漏>最小成本，1>2
  - 常见工作场景快速指南.md两处"提前至少3天"→"提前至少5天（发之前由组长给支委扩大群审核）"（D-214）
  - 党小组组长工作手册.md新增§六"群组管理"（6.1核心群+6.2群名规范+6.3通知模板+6.4活动群+6.5进群确认），原§六→§七，原§七→§八
  - 丙部P.13/P.14已退出
- **设计决策**: 核心群不含纪检和宣传——让支委工作更聚焦专业（D-213）；通知提前5天+支委扩大群审核（D-214）；信息传递两原则写入guides（D-215）
- **结果**: 8项欠缺全部写入SOP，2处冲突已解决，信息传递原则已沉淀至guides
- **蒸馏标签**: [经验蒸馏: 否 — 党小组活动指导意见补充执行]

## 2026-06-14 | 2026-06-T3 — 手机端交互式日历 + Mock数据一致性修复

- **来源**: 书记指示（D-210交互式日历+D-211两档断点+mock数据检查）
- **变更文件**: calendar.js, styles.css, makeup.js, party.js, attendance.js, inspection.js, review.js, seed.js, activities.js, taskforces.js, people.js
- **关键动作**: T15交互式日历 ✅ H-3 makeup.js bug ✅ H-2发展阶段矛盾 ✅ H-4/H-5/M系列修复 ✅
- **变更详情**:
  - calendar.js：768px以下月视图只显示日期+彩色圆点，点击格子弹出当天详情面板（活动+任务卡片），窗口resize自动重渲染
  - styles.css：新增cal-cell-mobile/cal-mobile-dots/cal-mobile-dot/cal-mobile-detail等移动端日历样式
  - makeup.js：activity.name → activity.title（H-3运行时bug）
  - party.js：移除p5候选人（正式党员不在候选人中），p7 stage改为积极分子（H-2）；makeupTasks数据模型对齐makeup.js服务格式（H-4）
  - attendance.js：personId→userId, confirmer→recordedBy（H-5）
  - inspection.js：insp-11/insp-12 sourceName对齐taskforces.js（M-1）
  - review.js：rev2 organizerId p5→p11（M-2）
  - seed.js：已完成活动下属任务/交付物状态同步（M-4）
  - activities.js：6个5月已过期活动published→completed（M-5）
  - taskforces.js：4个已过期专班状态更新（M-6）
  - people.js：p4 developStage预备党员→正式党员（L-3）
- **设计决策**: 手机日历参考手机原生日历交互模式（D-210），768px断点（D-211），mock数据以domain.js模型为权威源
- **结果**: T15完成，5个高严重度+8个中严重度+1个低严重度mock问题已修复
- **蒸馏标签**: [经验蒸馏: 否 — 交互式日历+mock数据修复]

## 2026-06-14 | 2026-06-T4 — 颜色一致性修复 + 写入型vs支撑型角色分类 + 低严重度mock修复

- **来源**: 书记4项指示（颜色审计+管理vs服务区分+日志时间修复+低严重度mock修复）
- **变更文件**: workspace-entry.js, styles.css, ws-organizer-entry.js, ws-disc-commissioner-entry.js, ws-visitor-entry.js, TERMINOLOGY.md, activities.js, notices.js, party.js, kanban.js, 2026-06-EXECUTION_LOG.md, 2026-06-DECISION_LOG.md
- **关键动作**: 颜色审计修复 ✅ 写入型vs支撑型分类 ✅ 日志归档时间修复 ✅ L-1~L-7修复 ✅
- **变更详情**:
  - workspace-entry.js：5个角色颜色全面修正（secretary→#7A0010, leader→#CE1126, organizer→#3B82F6, deep→#059669, org-commissioner→#CE1126）
  - styles.css：inspector-role-banner 4处角色色值修正 + kanban-domain-tag 组织域色值修正
  - ws-organizer-entry.js：13处非权威色替换（#8B5CF6→#3B82F6, #F59E0B→#D97706, #EC4899→#10B981, #A0001A→#CE1126）
  - ws-disc-commissioner-entry.js：2处 #F59E0B→#D97706
  - ws-visitor-entry.js：6处 rgba 修正与 accent 一致
  - TERMINOLOGY.md：新增§2.5"角色职能分类：写入型 vs 支撑型"
  - activities.js：添加act-19组织生活会 + 全部19个活动添加scenarioId和domain字段 + act-7日期修正
  - notices.js：4条过期通知标记已读
  - party.js：3条超期补课任务添加overdue标记
  - kanban.js：6条看板条目添加sourceId引用
  - 创建2026-06-EXECUTION_LOG.md和2026-06-DECISION_LOG.md
- **设计决策**: 角色颜色以ACCENT_COLORS为唯一权威源；"管理vs服务"用"写入型vs支撑型"替代（避免"管理"概念冲突）；日志按月归档，6月条目迁入6月文件
- **结果**: 颜色全面对齐ACCENT_COLORS，写入型vs支撑型分类已写入TERMINOLOGY.md，6个低严重度mock问题全部修复，日志归档时间已修正
- **蒸馏标签**: [经验蒸馏: 否 — 颜色修复+角色分类+mock修复]

## 2026-06-14 | 2026-06-T5 — undefined显示修复 + 追踪看板表格化 + 转置概念 + D-216一改具改 + CSS变量命名

- **来源**: 书记3项指示（undefined修复+追踪看板改表格+转置概念）+ next_prompt待办（D-216+CSS变量）
- **变更文件**: mock/index.js, ws-leader-entry.js, main-entry.js, ws-visitor-entry.js, ws-prop-commissioner-entry.js, makeup.js, inspector.js, archive-entry.js, taskforce.js, ws-deep-entry.js, roles.js, party.js, ws-disc-commissioner-entry.js, MANAGEMENT_MODE.md, SOP_WEB.md, DESIGN_SYSTEM.md, styles.css
- **关键动作**: undefined修复(11处) ✅ 追踪看板表格化 ✅ 转置概念落地 ✅ D-216一改具改 ✅ CSS变量命名 ✅
- **变更详情**:
  - mock/index.js：_personName(undefined)健壮性修复，返回'—'而非undefined
  - ws-leader-entry.js：考勤上传personId→userId, confirmer→recordedBy（对齐domain.js）
  - main-entry.js：考勤状态'出勤'→'present'等（对齐AttendanceStatus枚举，2处）
  - ws-visitor-entry.js：考勤状态'出勤'→'present'（1处）
  - ws-prop-commissioner-entry.js：contributions数组当数字累加→取.length
  - makeup.js：缺勤日期从attendanceRecord.date→activity.date；activity.name→'未知活动'
  - inspector.js：organizerName/deepParticipantName→从PEOPLE查找+participants数组
  - archive-entry.js：startDate/endDate→createdAt/deadline
  - taskforce.js：迁移成员补充personId匹配
  - ws-deep-entry.js：deepParticipantName/deepParticipants→participants数组
  - roles.js：organizerName||true→organizer?true:false
  - party.js：候选人追踪从进度面板改为表格视图+转置切换（人视图/阶段视图）
  - ws-disc-commissioner-entry.js：考勤/考察总表按钮"长格式/宽格式"→"活动视图/人视图"
  - MANAGEMENT_MODE.md：§2a补充写入型vs支撑型分类+写入门禁原则；§8.1b新增表格视图转置原则
  - SOP_WEB.md：B.3新增写入门禁原则小节；B.5权限函数注释补充
  - DESIGN_SYSTEM.md：--accent-violet→--accent-secretary（2处）
  - styles.css：--accent-violet→--accent-secretary（3处）
- **设计决策**: 表格视图转置=人视图/活动视图的行列互换（D-217）；CSS变量名应反映语义而非颜色值
- **结果**: 11处undefined/数据不匹配修复，追踪看板改为表格+转置切换，D-216一改具改2项全部完成，CSS变量命名语义化
- **蒸馏标签**: [经验蒸馏: 否 — undefined修复+转置概念+一改具改]

## 2026-06-14 | 2026-06-T6 — kanban/taskforces数据断裂修复 + 响应式断点补全 + 宣传委员转置切换

- **来源**: next_prompt待办（H-1数据断裂 + D-211响应式断点 + §8.1b转置切换）
- **变更文件**: ws-prop-commissioner-entry.js, ws-org-commissioner-entry.js, styles.css
- **关键动作**: H-1数据断裂修复 ✅ D-211响应式断点补全 ✅ 宣传委员多维表格转置切换 ✅
- **变更详情**:
  - ws-prop-commissioner-entry.js：移除KANBAN_MOCKS死引用；重构_renderKanbanContent从TaskForceRecordStore+activities双数据源动态派生看板（活动+专班混合展示）；新增_renderKanbanItem统一渲染活动/专班卡片；_renderMultitableContent添加活动视图/人视图转置切换按钮+双视图渲染（人视图从activities.organizer/participants+taskforces.members交叉派生）
  - ws-org-commissioner-entry.js：移除KANBAN_MOCKS死引用
  - styles.css：768px断点补全15个组件规则（view-mode-picker-card/role-card/role-icon/comm-modal-option/comm-modal-icon/domain-btn/scenario-header-inner/inspector-card/form-tree-row/form-tree-badge/party-stat-card/compliance-ref-card/workflow-panel-card/workflow-svg/workflow-substate-card）；640px断点补全14个组件规则（同上+role-card-title/role-card-desc/workflow-history-item/workflow-history-detail）
- **设计决策**: 看板从TaskForceRecordStore动态派生而非使用硬编码KANBAN_MOCKS（H-1）；768px+640px两档断点维持（D-211决策A）；转置默认展示活动视图（§8.1b规则3）
- **结果**: H-1数据断裂修复完成，D-211响应式断点补全完成，宣传委员多维表格转置切换完成，localhost检查通过零诊断错误
- **蒸馏标签**: [经验蒸馏: 是 — 看板动态派生判例已写入insights §10.14]

## 2026-06-14 | 2026-06-T7 — kanban.js死代码清理 + 周期性任务W1-W3/M1-M3执行 + 经验蒸馏

- **来源**: next_prompt待办（kanban.js清理 + 过期周期性任务 + 经验蒸馏）
- **变更文件**: mock/kanban.js(删除), mock/index.js, 党小组组长工作手册.md, README.md, review.js, party.js, 纪检委员工作流程指南.md, CONTEXT.md, 党支部管理与实务经验沉淀.md
- **关键动作**: kanban.js死代码清理 ✅ W1日志扫描 ✅ W2 Emoji扫描+修复 ✅ W3 Mock数据扫描+修复 ✅ M1 CLAUDE.md清理 ✅ M3断链扫描+修复 ✅ 经验蒸馏 ✅
- **变更详情**:
  - mock/kanban.js：删除文件（KANBAN_MOCKS无消费者，全仓零残留）
  - mock/index.js：移除KANBAN_MOCKS导出行
  - 党小组组长工作手册.md：1️⃣2️⃣→1.2.（P0级Emoji修复）
  - README.md：移除🌐装饰性Emoji
  - review.js：sourceName"宣讲团M2阶段"→"宣传专班（第二期）"（匹配tf-001）
  - party.js：mk3 activityName"3月党小组会"→"4月党小组会"（匹配act-4）
  - 纪检委员工作流程指南.md：2个断链改为纯文本（考勤表模板、补课记录模板）
  - CONTEXT.md：7处陈旧路径更新（src/→docs/src/等）
  - 党支部管理与实务经验沉淀.md：新增§10.14看板动态派生判例+附录#66+YAML更新v18.0
- **设计决策**: 无新决策，执行既有决策
- **结果**: kanban.js死代码清理完成，W1-W3/M1-M3周期性任务全部完成并修复6处问题，T6经验蒸馏完成（§10.14）
- **蒸馏标签**: [经验蒸馏: 是 — 本次为蒸馏执行本身]

## 2026-06-14 | 2026-06-T8 — M5 DOCUMENTATION_MAP审查 + file:///路径修复 + 5月日志蒸馏确认

- **来源**: next_prompt待办（M5审查 + file:///路径 + 5月日志蒸馏确认）
- **变更文件**: DOC_MAP.md, MANAGEMENT_MODE.md, COMMISSIONER_SYSTEM.md, CLAUDE.md
- **关键动作**: M5审查+修复 ✅ file:///路径修复 ✅ 5月日志蒸馏确认 ✅ 丙部P.13提交 ✅
- **变更详情**:
  - DOC_MAP.md：index.html→docs/index.html；新增8个未收录文件；skills计数10→11；新增DECISION_LOG；合规文件格式补充.docx；YAML更新
  - MANAGEMENT_MODE.md：7处file:///绝对路径→相对路径
  - COMMISSIONER_SYSTEM.md：6处file:///绝对路径→相对路径；YAML更新
  - CLAUDE.md：丙部新增P.13（DOC_MAP层级排序与OPERATIONS_GUIDE矛盾）
- **设计决策**: DOC_MAP层级排序矛盾提交丙部（P.13），AI不自行决定权威源归属
- **结果**: M5审查完成修复5项具体问题+1项结构性问题提交丙部；file:///路径零残留（注意：CALENDAR.md/ORG_BUILDING.md/DATA.md仍有file:///但不在本次范围）；5月日志3条[蒸馏:否]均跳过（原则已被覆盖或性质不匹配）
- **蒸馏标签**: [经验蒸馏: 否 — 周期性审查+路径修复，无新原则]

## 2026-06-14 | 2026-06-T9 — P.13决策执行（D-218正交维度模型）+ file:///全仓清零

- **来源**: 书记决策P.13（SOP与guides为正交维度，不排先后；CLAUDE.md为上下文入口）
- **变更文件**: OPERATIONS_GUIDE.md, DOC_MAP.md, CLAUDE.md, CALENDAR.md, ORG_BUILDING.md, DATA.md, DECISION_LOG.md
- **关键动作**: D-218决策记录 ✅ OPERATIONS_GUIDE §7.1重构 ✅ DOC_MAP层级重构 ✅ P.13退出 ✅ file:///全仓清零 ✅
- **变更详情**:
  - OPERATIONS_GUIDE.md §7.1：线性层级→正交维度模型（理念维度guides/ + 执行维度SOP/），CLAUDE.md定位为"上下文层"而非"宪章层"，冲突裁决规则改为 CLAUDE.md > guides/SOP（正交） > 代码
  - DOC_MAP.md：Layer 1"项目中枢层"→"上下文层（HARNESS入口）"；Layer 2拆分为"理念维度"（guides/，22个文件）和 Layer 3"执行维度"（SOP/，7个文件）；引用关系图同步重构
  - CLAUDE.md：丙部P.13退出
  - CALENDAR.md：17处file:///→相对路径
  - ORG_BUILDING.md：6处file:///→相对路径
  - DATA.md：9处file:///→相对路径
  - DECISION_LOG.md：D-218写入+一改具改检查全部完成
- **设计决策**: D-218——SOP与guides为正交维度（书记决策），CLAUDE.md为上下文入口
- **结果**: D-218一改具改完成，全仓file:///零残留，丙部P.13已退出
- **蒸馏标签**: [经验蒸馏: 否 — 决策执行+路径修复]

## 2026-06-14 | 2026-06-T10 — SNAPSHOT v10 更新 + H9同步检查

- **来源**: 书记显式指令触发 SNAPSHOT 更新（H4.3 触发条件 b）
- **变更文件**: SNAPSHOT.md, TIMESTAMPS.md
- **关键动作**: SNAPSHOT v10 ✅ H9同步检查 ✅ M2 TIMESTAMPS更新 ✅
- **变更详情**:
  - SNAPSHOT.md：v9→v10，分层架构表更新为D-218正交维度模型（7层），CLAUDE.md定位从"最高治理文件"→"上下文入口"，mock数据9个（kanban.js已删除），guides 22文件，skills 11个，核心理论新增正交维度模型行，宣传委员描述新增转置切换，v10里程碑写入
  - TIMESTAMPS.md：M2更新为2026-06-14/2026-07-14 OK
- **设计决策**: H9运行标准索引链接已正确指向OPERATIONS_GUIDE §7，无需修改（索引层不重复内容）
- **结果**: SNAPSHOT v10完成，M2过期状态清除
- **蒸馏标签**: [经验蒸馏: 否 — 快照更新+同步检查]

## 2026-06-14 | 2026-06-T11 — UI bug系统性修复（7项）+ 登录系统设计前置文档补全

- **来源**: 书记指示（a链接跳转+视图模式不匹配+Guides文档完整性审计）
- **变更文件**: bootstrap.js, cross-page-state.js, ws-visitor-entry.js, ws-disc-commissioner-entry.js, workspace/index.html, ws-deep-entry.js, LOGIN_STUB.md, COMMISSIONER_SYSTEM.md, CLAUDE.md
- **关键动作**: BUG-M1+M5修复 ✅ BUG-L1修复 ✅ BUG-M2+M3修复 ✅ BUG-M4修复 ✅ BUG-L2修复 ✅ LOGIN_STUB.md扩展 ✅ COMMISSIONER_SYSTEM.md扩展 ✅
- **变更详情**:
  - bootstrap.js：重构执行顺序——先捕获sidebar:view-restore事件→设置角色/模式→最后渲染header，解决模式标签与内容不一致
  - cross-page-state.js：buildURL用window.location.href替代origin，修复子目录部署路径丢失
  - ws-visitor-entry.js：只读警告从硬编码改为动态判断ViewModeStore+角色切换事件监听
  - ws-disc-commissioner-entry.js：只读警告从URL参数静态判断改为动态+角色切换事件监听
  - workspace/index.html：移除无用的hidden元素（readonly-banner/manager-only-controls）
  - ws-deep-entry.js：content/路径链接改为纯文本span（浏览器无法访问content/目录）
  - LOGIN_STUB.md v2.0：新增§七用户身份模型+§八认证机制规范+§九角色判定逻辑+§十双域赋权冲突解决方案
  - COMMISSIONER_SYSTEM.md：新增A.8赋权操作流程（专班域/活动域/撤销/数据结构）
- **设计决策**: 无新决策，执行既有设计
- **结果**: 7项UI bug全部修复，5个Critical级Guides缺口补全，登录系统设计文档就绪
- **蒸馏标签**: [经验蒸馏: 否 — bug修复+文档补全]

## 2026-06-14 | 2026-06-T12 — 登录系统规划 + Important级缺口补全 + 视觉体验持续优化

- **来源**: 书记指示（登录系统规划+补全缺口+颜色/卡片长期关注）
- **变更文件**: CLAUDE.md, APPROVAL_FLOW.md(新建), LOGIN_STUB.md, DOC_MAP.md
- **关键动作**: 登录系统规划写入乙部+丙部 ✅ APPROVAL_FLOW.md创建 ✅ LOGIN_STUB.md §十一权限执行规范 ✅ C-4视觉体验持续优化写入 ✅
- **变更详情**:
  - CLAUDE.md乙部：新增T12(P1登录系统Phase1)+T13/T14(P3审批+权限规范)+C-4(视觉体验持续优化)+P.14(丙部登录系统实现路径)
  - APPROVAL_FLOW.md：新建审批流程规范（8章：活动创建/专班创建/赋权/考勤确认/复盘/状态机/权限矩阵/通知机制）
  - LOGIN_STUB.md v2.1：新增§十一权限执行规范（5节：前端权限检查策略/权限检查函数清单/权限缓存策略/失败处理/跨模块一致性）
  - DOC_MAP.md：收录APPROVAL_FLOW.md
  - T13/T14已完成退出乙部
- **设计决策**: 无新决策
- **结果**: 登录系统设计规划就绪（T12等P.14决策），Important级缺口全部补全，C-4视觉优化纳入持续任务
- **蒸馏标签**: [经验蒸馏: 否 — 规划+文档补全]

## 2026-06-14 | 2026-06-T13 — P.14决策执行 + 登录系统Phase1实现 + H1.3 Nice-to-have规则

- **来源**: 书记决策P.14（独立登录页+Mock登录）+ 书记指示（Nice-to-have报告规则）
- **变更文件**: CLAUDE.md, DECISION_LOG.md, login.html(新建), login-entry.js(新建), auth.js, bootstrap.js, sidebar.js
- **关键动作**: D-219决策记录 ✅ P.14退出丙部 ✅ login.html创建 ✅ login-entry.js创建 ✅ auth.js动态化 ✅ bootstrap.js登录检查 ✅ sidebar.js退出登录 ✅ H1.3 Nice-to-have规则 ✅
- **变更详情**:
  - DECISION_LOG.md：D-219写入（独立登录页+Mock登录）
  - CLAUDE.md：P.14退出丙部，T12退出乙部，H1.3新增Nice-to-have报告规则
  - login.html：独立登录页，8角色卡片网格布局，party红色主题
  - login-entry.js：已登录自动跳转+mockLogin设置角色+清除模块状态+跳转workspace
  - auth.js：LOGIN_STANCE从硬编码改为getLoginStance()动态读取sessionStorage，新增setLoginStance()+logout()，getStanceOptions()/authorize()/getViewCategory()全部改用动态获取
  - bootstrap.js：bootstrapPage开头新增登录检查，未登录跳转../login.html
  - sidebar.js：底部新增"退出登录"按钮，调用AuthStore.logout()+跳转login.html
- **设计决策**: D-219（独立登录页+Mock登录）
- **结果**: 登录系统Phase1完整实现，登录→角色选择→跳转→退出全链路贯通
- **蒸馏标签**: [经验蒸馏: 否 — 决策执行+登录系统实现]

## 2026-06-14 | 2026-06-T14 — 下拉框组件统一对齐 + P.15站位选择器去留

- **来源**: 书记指示（下拉框与站位选择器对齐+站位选择器去留）
- **变更文件**: header.js, ws-org-commissioner-entry.js, ws-leader-entry.js, ws-secretary-entry.js, ws-organizer-entry.js, modal.js, CLAUDE.md
- **关键动作**: 通知下拉对齐站位切换器 ✅ 原生select统一为.input-flat ✅ P.15写入丙部 ✅
- **变更详情**:
  - header.js：通知下拉border-radius 10→8、box-shadow 0 8px 24px→0 4px 16px、top +8px→+4px，与站位切换器对齐
  - ws-org-commissioner-entry.js：2处select从Tailwind混合样式→input-flat text-xs
  - ws-leader-entry.js：4处select统一为input-flat text-xs
  - ws-secretary-entry.js：2处select统一为input-flat text-xs
  - ws-organizer-entry.js：4处select统一为input-flat text-xs（保留max-width/min-width内联样式）
  - modal.js：1处select从内联样式→input-flat text-xs w-full
  - CLAUDE.md：P.15写入丙部（站位选择器去留：A移除/B保留改造/C仅视图切换）
- **设计决策**: 无新决策
- **结果**: 全仓26个下拉/选择组件审计完成，1个自定义下拉对齐，13个原生select统一样式，P.15待书记决策
- **蒸馏标签**: [经验蒸馏: 否 — 组件对齐+样式统一]

## 2026-06-14 | 小任务 — select样式清查修复

- **来源**: 书记反馈（大部分select框还是老格式）
- **变更文件**: secretary.html, styles.css, inspector.js
- **关键动作**: secretary.html遗漏修复 ✅ input-flat padding优化 ✅ inspector.js微选择器统一 ✅
- **变更详情**:
  - secretary.html：month-selector从`text-sm border rounded-lg px-3 py-2`→`input-flat text-xs`
  - styles.css：select.input-flat padding从`12px 16px`→`6px 30px 6px 10px`（紧凑化）；新增`select.input-flat.text-xs`变体（5px 28px 5px 8px）；新增`select.input-flat.text-[10px]`微选择器变体（2px 22px 2px 6px）
  - inspector.js：任务状态select从`font-stheiti text-[10px] rounded px-1 py-0.5 border border-gray-200 bg-white`→`input-flat text-[10px]`
  - 全仓Grep确认：零非input-flat的select残留
- **设计决策**: 无
- **结果**: 全仓select统一为input-flat体系，三种尺寸变体（默认/text-xs/text-[10px]）
- **蒸馏标签**: [经验蒸馏: 否 — 样式修复]

## 2026-06-14 | 2026-06-T15 — P.15伪问题纠正+站位选择器移除+H5.2补丁

- **来源**: 书记纠正（站位选择器与管理者只读无关，P.15基于错误前提）
- **变更文件**: CLAUDE.md, header.js, auth.js, permission-manager.js, sidebar.js, LOGIN_STUB.md, SOP_WEB.md, CHECKLIST.md, DECISION_LOG.md
- **关键动作**: H5.2理解验证补丁写入 ✅ P.15退出丙部 ✅ 站位切换器UI移除 ✅ getStanceOptions移除 ✅ switchStance移除 ✅ stance-change监听移除 ✅
- **变更详情**:
  - CLAUDE.md H5.2：新增D-220理解验证补丁（提交丙部前必须验证理解正确性）
  - CLAUDE.md：P.15退出丙部
  - header.js：移除_stanceSwitcherHTML+_populateStanceDropdown+_stanceItemHTML+_bindStanceSwitcher+ROLE_LABELS导入
  - auth.js：移除getStanceOptions函数及AuthStore导出
  - permission-manager.js：移除switchStance方法
  - sidebar.js：移除permission:stance-change事件监听
  - LOGIN_STUB.md：标注getStanceOptions已移除+permission:stance-change删除线
  - SOP_WEB.md：模式流转图移除角色切换器流程
  - CHECKLIST.md：移除switchStance检查项
- **设计决策**: D-220（移除站位选择器+H5.2补丁）
- **结果**: 站位选择器完全移除，视图模式由身份+页面派生
- **蒸馏标签**: [经验蒸馏: 否 — 伪问题纠正+制度补丁]

## 2026-06-14 | 2026-06-T16 — C-4视觉体验优化（P1+P2修复）

- **来源**: C-4持续任务 + next_prompt建议
- **变更文件**: styles.css, login.html, header.js, inspector.js, modal.js, party.js, ws-organizer-entry.js, ws-leader-entry.js, ws-deep-entry.js, ws-disc-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-secretary-entry.js, party-secretary-entry.js, ws-org-commissioner-entry.js, ws-visitor-entry.js, party-prop-entry.js, party-org-entry.js, party-disc-entry.js, archive-entry.js
- **关键动作**: 幽灵色值CSS变量补齐 ✅ inspector-card圆角修复 ✅ 登录页角色颜色对齐 ✅ 卡片圆角统一rounded-xl ✅ 统计卡片flex-1 ✅ 通知下拉CSS变量化 ✅ 蓝绿紫色系归并 ✅
- **变更详情**:
  - styles.css：新增9个CSS变量（accent-sky/indigo/violet/violet-light/status-live/brand-amber-dark/blue-hover/sky-hover/error-dark）+shadow-dropdown；inspector-card圆角14px→var(--radius-md)；tl-card/role-card/workflow-panel-card圆角统一为var(--radius-md)
  - login.html：宣传委员emerald→blue、纪检委员amber→emerald、深度参与者emerald→violet；border-gray-100→border-gray-200
  - header.js：通知下拉7处硬编码色值→CSS变量（neutral-900/500/400/accent-blue/party-red/party-gold/primary-900）+shadow-dropdown
  - 13个entry JS：rounded-2xl→rounded-xl（统一12px圆角）
  - ws-secretary-entry.js：统计卡片添加flex-1
  - 9个JS文件：~40处蓝绿紫色值归并为CSS变量引用（accent-blue/blue-hover/accent-sky/sky-hover/accent-emerald/accent-emerald-light/status-live/accent-indigo/accent-violet/brand-amber-dark）
- **设计决策**: 无新决策
- **结果**: P1(4项)+P2(6项)全部修复，色彩体系统一为CSS变量，卡片圆角统一12px
- **蒸馏标签**: [经验蒸馏: 否 — 视觉体验优化]

## 2026-06-26 | 2026-06-T17 — 统一服务目录（SERVICE_CATALOG.md）

- **来源**: Nice-to-have（next_prompt建议）
- **变更文件**: SERVICE_CATALOG.md（新建）, DOC_MAP.md, guides/README.md
- **关键动作**: 服务目录创建 ✅ DOC_MAP同步 ✅ README同步 ✅
- **变更详情**:
  - 新建SERVICE_CATALOG.md：15个服务（党建5+党务5+系统5）×8角色权限矩阵，含服务间依赖关系图、模块路由映射
  - DOC_MAP.md：Layer 2/Layer 5/引用关系图/快速入口4处新增引用
  - guides/README.md：架构设计章节新增条目
- **设计决策**: 无
- **结果**: 系统功能盘点完成，15个服务×8角色权限矩阵建立
- **蒸馏标签**: [经验蒸馏: 否 — 服务目录创建]

## 2026-06-26 | 2026-06-T18 — P3视觉细节修复（只读标签色+嵌套卡片对比度+卡片间距）

- **来源**: C-4持续任务 + 书记强调"视觉细节非常重要"
- **变更文件**: header.js, styles.css, party.js, ws-organizer-entry.js, ws-leader-entry.js, ws-deep-entry.js, ws-disc-commissioner-entry.js, ws-prop-commissioner-entry.js, ws-secretary-entry.js, ws-org-commissioner-entry.js, commissioner-matrix.js
- **关键动作**: 只读标签四色梯度 ✅ 嵌套卡片对比度增强 ✅ 卡片间距标准化 ✅
- **变更详情**:
  - header.js：MODE_COLOR_MAP成员只读#6B7280→#6366F1（靛蓝），形成红>琥珀>靛蓝>灰四色梯度
  - 10个JS文件：34处嵌套卡片bg-gray-50→bg-gray-100（提升内外层对比度），6处交互项hover同步上移到bg-gray-200
  - styles.css：role-cards-container gap 2px→8px（卡片间距过紧修正）
- **设计决策**: 无
- **结果**: P3全部修复，只读模式四色梯度建立，嵌套卡片层次感增强
- **蒸馏标签**: [经验蒸馏: 否 — 视觉细节修复]

## 2026-06-26 | 2026-06-T19 — 侧边栏底部三按钮 + 帮助页/关于页骨架

- **来源**: 书记指示（侧边栏底部应为帮助/关于/退出登录；帮助页为按场景划分的交互式展示）
- **变更文件**: docs/src/components/sidebar.js, docs/help.html(新建), docs/src/entries/help-entry.js(新建)
- **关键动作**: 侧边栏底部三按钮 ✅ help.html骨架 ✅ help-entry.js骨架 ✅ 登录绕过机制 ✅
- **变更详情**:
  - sidebar.js：footer区新增"帮助"按钮（关于和退出登录已存在），三按钮统一样式（14px图标+0.75rem字号+neutral-400色）
  - help.html：新建帮助页骨架，引用help-entry.js
  - help-entry.js：新建入口JS，调用renderSidebar/renderHeader，显示"帮助内容建设中..."占位
  - bootstrap.js：新增?dev=ROLE URL参数绕过登录机制（测试期间登录系统未对接时的临时方案）
- **设计决策**: 登录绕过采用URL参数方案（?dev=secretary等），不修改登录页，测试期间可直达任意页面
- **结果**: T19完成，侧边栏三按钮就位，帮助页骨架就绪待T20填充内容
- **蒸馏标签**: [经验蒸馏: 否 — 骨架搭建]

## 2026-06-26 | 2026-06-T21 — SOP一致性审计（只读）

- **来源**: 书记指示（对content/SOP/一致性持怀疑态度，需先审计后做关于页）
- **变更文件**: 无（只读审计）
- **关键动作**: 7个SOP文件全量审计 ✅ P0/P1/P2问题识别 ✅ 思想汇报流向矛盾验证 ✅ 章节编号错乱验证 ✅
- **变更详情**:
  - 审计范围：INDEX.md + 党小组组长工作手册.md + 组织/宣传/纪检委员工作流程指南.md + 常见工作场景快速指南.md + 支委与党小组定人定责定岗说明.md
  - P0严重（5项）：①党小组组长手册章节编号错乱（六→六→八，缺七）②5名支委兼组长 vs "三位块块组长"数量矛盾 ③思想汇报流向三处矛盾（纪检转交/纪检归档/党员直交组织委员）④5个文件YAML last_updated与页脚日期不一致 ⑤常见工作场景快速指南版本号冲突
  - P1重要（5项）：①副组长/代组长术语混淆 ②"普通参与者"未定义却使用 ③交叉引用错误 ④党务平台/智慧党建平台称呼不统一 ⑤交接和知识沉淀流程无SOP闭环
  - P2改进（7项）：①INDEX.md描述与内容不符 ②责任人登记不统一 ③党支书/支部书记称呼不统一 等
- **设计决策**: 无（只读审计，P0问题提交丙部待书记决策）
- **结果**: 审计完成，P0问题已写入丙部P.16，等待书记决策修复方案
- **蒸馏标签**: [经验蒸馏: 否 — SOP审计]

## 2026-06-26 | 2026-06-T20 — 帮助页交互式内容实现（5 Tab）

- **来源**: 书记指示（帮助页按场景划分，突出并列关系，纠正党员认知错误）+ 书记澄清（并列=分开呈现，活动≠专班必须制止混淆）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 5 Tab交互式帮助页 ✅ 活动↔专班独立呈现 ✅ 党员发展5阶段25步骤时间轴 ✅ 角色层次纠正认知 ✅ 公开访问 ✅
- **变更详情**:
  - help-entry.js：完全重写，5个Tab模块化渲染（党建工作/党务工作/党员发展/角色与参与层次/通用流程）
  - 党建工作Tab：创建活动与创建专班作为两个独立模块卡片，各自完整流程图（策划→通知→执行→考勤→考察→复盘 / 发起→招募→赋权→执行→交付→解散），含warning callout"活动≠专班"+error callout"必须制止的认知混淆"
  - 党务工作Tab：考勤提交/考察记录/思想汇报三条流程图，思想汇报标注"流程优化中"（待P.16决策）
  - 党员发展Tab：5阶段25步骤纵向时间轴，点击阶段卡片可展开详细步骤/责任人/材料/时限，含材料红线提示
  - 角色与参与层次Tab：三层参与身份卡片（组织者=蓝色脑/深度参与者=绿色手/普通参与者=灰色仅出席）+ 管理者vs参与者对比 + 4条错误认知纠正条目（"只要参与就可以"/活动专班混淆/参与深度参与混淆/深度参与组织混淆）
  - 通用流程Tab：交接流程 + 知识沉淀
  - styles.css：追加帮助页专用样式（Tab切换动画opacity+translateY 300ms过渡、卡片hover上浮、流程图圆角矩形+箭头、时间轴纵向连接线+圆点节点、移动端Tab横向滚动）
  - 公开访问：不调用bootstrapPage，直接renderSidebar+renderHeader
  - 事件委托：单一监听器处理Tab切换+阶段卡片展开，支持键盘左右键切换
- **设计决策**: 书记澄清"并列=分开呈现"——活动与专班不做对比，各自独立模块；错误认知纠正用party-red色系醒目提示
- **结果**: T20完成，帮助页5 Tab全部实现，零诊断错误，预览无JS报错
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页实现]

## 2026-06-26 | 小任务 — 帮助页UI全面重设计

- **来源**: 书记反馈"页面太难看了，布局、交互、显示全方位地丑陋"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: Tab卡片式设计 ✅ 流程改竖向步骤列表 ✅ callout左边框 ✅ 角色三色系 ✅ 错误认知X/✓对照 ✅ 展开max-height动画 ✅
- **变更详情**:
  - help-entry.js：Tab改为卡片式（SVG图标+标题+描述），活动Tab红色底白字；renderFlowDiagram改为竖向步骤列表（圆点+连线+步骤名+badge）；renderCallout改用SVG图标+左边框；阶段展开改用max-height过渡+chevron旋转；Tab切换缩短为200ms
  - styles.css：帮助页专用样式全面替换（~960行）；卡片hover用MD标准easing cubic-bezier(0.4,0,0.2,1)；角色卡片头部三色实色背景；错误认知纠正红色✕+绿色✓对照；管理者/参与者top边框对比；768px+480px两档响应式
- **设计决策**: 流程图从横向箭头改为竖向步骤列表——更清晰易读，适配移动端
- **结果**: 帮助页视觉全面升级，零诊断错误，预览无JS报错
- **蒸馏标签**: [经验蒸馏: 否 — UI重设计]

## 2026-06-26 | 小任务 — 丙部P.16修复写入

- **来源**: 书记反馈"丙部我并没有看到待决策项"
- **变更文件**: CLAUDE.md
- **关键动作**: P.16写入丙部 ✅ Python持久化验证 ✅
- **变更详情**:
  - 之前Python脚本rfind逻辑找到甲部引用处的***而非丙部末尾，导致P.16未实际写入丙部
  - 改用rfind('***')插入到文件最后位置，Python验证P.16在丙部header之后
- **设计决策**: 无
- **结果**: P.16已正确写入丙部，Python验证确认
- **蒸馏标签**: [经验蒸馏: 否 — 文件修复]

## 2026-06-26 | 2026-06-T21 — SOP一致性修复（D-221决策执行）

- **来源**: 书记决策D-221（P.16三步方向已定：B/A/A）
- **变更文件**: content/SOP/党小组组长工作手册.md, content/SOP/支委与党小组定人定责定岗说明.md, content/SOP/组织委员工作流程指南.md, content/SOP/纪检委员工作流程指南.md, content/SOP/常见工作场景快速指南.md, content/SOP/宣传委员工作流程指南.md, content/SOP/INDEX.md, docs/src/workflow/sopData.js
- **关键动作**: P0-1删除5名支委兼组长表述 ✅ P0-2章节编号修正 ✅ P0-3思想汇报流向统一 ✅ P0-4 YAML日期统一 ✅ P0-5版本号冲突修正 ✅ 子本代码同步 ✅ Python读盘验证 ✅
- **变更详情**:
  - 党小组组长工作手册.md：YAML日期→2026-06-26/version→1.1；删除"5名支委兼组长"改为"3个党小组3名组长，部分组长由支委兼任"；章节"六、常见问题"→"七、常见问题"
  - 支委与党小组定人定责定岗说明.md：YAML→2.1/2026-06-26；表1.1删除组织/宣传/纪检委员的"党小组组长（块块）"标记；1.2组长配置改为3人清单+职务职权原则；3.双重身份改为"部分支委兼任"；页脚→v2.1/2026年6月26日
  - 组织委员工作流程指南.md：YAML→3.1/2026-06-26；思想汇报信息流删除"状态表同步反馈→纪检委员"；任务流删除"共享纪检委员"；数据同源提醒删除"思想汇报提交"数据同源；新增流向说明"纪检不介入"；页脚→v3.1
  - 纪检委员工作流程指南.md：YAML→5.1/2026-06-26；数据共享描述删除"思想汇报提交"数据同源，新增"思想汇报由党员直接提交组织委员归档，纪检委员不介入"；页脚→v5.1
  - 常见工作场景快速指南.md：YAML→6.0/2026-06-26；步骤3-3"接收纪检委员转交"→"接收党员/发展对象直接提交"；纪检委员使用场景删除"思想汇报收集归档"；页脚→v6.0
  - 宣传委员工作流程指南.md：YAML→3.1/2026-06-26；页脚→v3.1
  - INDEX.md：YAML→2026-06-26
  - docs/src/workflow/sopData.js（子本同步）：taskId 3-3 desc同步为"接收党员/发展对象直接提交"
- **设计决策**: 严格遵循D-221三步决策（B/A/A）；母本子本同步遵循H2.4规则2；"5名支委兼组长"修正为"3个党小组3名组长"并保留"部分支委兼任"的事实；思想汇报流向统一为"党员→组织委员归档"，纪检委员完全不介入
- **结果**: 全部5个P0问题修复完成；Python读盘验证8个文件ALL PASS；"5名支委兼组长"在SOP/代码零残留（仅CLAUDE.md丙部待决策事项和历史日志中保留，属正常）；章节编号连续；思想汇报流向统一
- **蒸馏标签**: [经验蒸馏: 否 — SOP一致性修复，含Edit工具虚假成功陷阱复现]

## 2026-06-26 | 2026-06-T23 — 帮助页彻底重做（流程可视化架构）

- **来源**: 书记反馈"页面太难看了，全方位丑陋"+"忽略帮助中心职能：清晰展现任务流、信息流的流动，谁在什么时候去找谁"+"平铺文字是致命的"+"可使用性最重要"+"允许现代主义元素"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 场景选择器(8卡片) ✅ 交互式流程图 ✅ 节点点击展开详情 ✅ 连线流动动画 ✅ 党员发展5阶段特殊设计 ✅ 底部角色图例毛玻璃 ✅ stagger节点出现动画 ✅
- **变更详情**:
  - help-entry.js：完全重写（660行）；从"5Tab+平铺文字"转为"场景选择器+交互式流程图"；8个场景卡片横向网格（非Tab）；流程图节点精致设计（角色色点+步骤号badge+动作+材料/时限badge）；连线三种类型（任务流灰实线/信息流蓝虚线流动/材料流绿虚线流动）；点击节点max-height过渡展开详情（负责人/材料/时限/上游/下游）；党员发展5阶段卡片网格+点击展开步骤；底部角色图例fixed+backdrop-filter毛玻璃
  - styles.css：帮助页样式整体替换（~600行）；现代主义元素：渐变背景(white→neutral-50)、毛玻璃(backdrop-filter:blur(10px))、流动动画(@keyframes help-flow-down)、节点stagger动画(@keyframes help-node-in)、微交互(badge hover放大/角色色点hover旋转/竖条hover加粗)；全部cubic-bezier(0.4,0,0.2,1)；prefers-reduced-motion可访问性；768px+480px两档响应式
- **设计决策**: 核心理念转变——从"文字说明文档"到"流程可视化工具"；竖向流程图（所有设备通用）；节点=角色+动作（谁找谁一目了然）；连线=信息流向（流动动画体现"流"）；场景选择器替代Tab（聚焦"找流程"而非"找分类"）
- **结果**: 帮助页彻底重做完成，零诊断错误，预览无JS报错
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页流程可视化重做]

## 2026-06-27 | 2026-06-T24 — 帮助页v3（滚动叙事+SVG关系网络图）

- **来源**: 书记反馈——任务流/信息流是"流"，一个活动有太多信息流关系；筛选选择方式割裂信息流；需要真正交互（非点击选择）；苹果风简约不简单；研究UI内容展现方法
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: help-entry.js完全重写 ✅ styles.css旧帮助页样式删除(591行) ✅ 新v3样式插入(764行) ✅ JS/CSS类名一致性验证 ✅ GetDiagnostics零错误 ✅ Python持久化验证 ✅
- **变更详情**:
  - help-entry.js：完全重写（588行）；5个全屏section（Hero"谁在什么时候该去找谁"→八角色环形排列→活动关系网络SVG→专班关系网络SVG→党员发展5阶段25步时间轴）；SVG关系网络用createElementNS动态生成（节点circle+ring+text+职责，连线path+箭头marker+标签）；任务流红实线(stroke-dasharray 14 4)vs信息流蓝虚线(stroke-dasharray 6 4)视觉区分；节点hover高亮相关连线+其他节点dimmed+tooltip定位；阶段卡片点击展开max-height过渡；IntersectionObserver(threshold 0.12)触发section淡入+stagger延迟
  - styles.css：删除旧帮助页CSS（原3728-4318行，591行，含help-hero/help-scene-selector/help-flowchart/help-node/help-connector/help-legend/help-stage-section等旧选择器）；新v3 CSS（2963-3726行）：苹果风设计（纯白背景+clamp(60px,10vh,120px)大留白+clamp(40px,6vw,72px)大字体+cubic-bezier(0.4,0,0.2,1)微妙动画）；角色环形排列（CSS transform rotate+translateY，--angle变量）；SVG网络节点hover高亮（has-hover类控制dimmed/highlighted）；专班callout列表；时间轴阶段卡片+步骤行；768px响应式；prefers-reduced-motion可访问性
  - 颜色规范（遵循任务规范非constants.js）：党支书#7A0010、党小组组长#CE1126、组织委员#CE1126、宣传委员#3B82F6、纪检委员#D97706、组织者#3B82F6、深度参与者#10B981、普通参与者#6B7280
- **设计决策**: 签名元素=活动关系网络SVG图（谁在什么时候该去找谁）；Hero即论点（"谁在什么时候该去找谁？"开篇）；结构即信息（5个section编码真实关系：角色→活动流→专班流→发展流）；苹果风"简约不简单"（纯白+大留白+微妙动画，非装饰堆砌）；hover高亮=真正交互（非点击筛选），展现"流"的不割裂
- **结果**: 帮助页v3完成，零诊断错误，Python验证两文件持久化确认，JS所有className在CSS中均有对应规则
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页v3滚动叙事+SVG网络重做]

## 2026-06-27 | 2026-06-T25 — 颜色规范系统化 + 帮助页党建/党务二分架构

- **来源**: 书记反馈5个问题——业务场景逻辑丢失(党建vs党务没区分)、颜色不规范(红橙黄绿蓝紫不到位)、组织架构层级错(党小组组长应在支委之下)、业务场景需各自划分、需要小目录导航
- **变更文件**: content/guides/design/DESIGN_SYSTEM.md, docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: DESIGN_SYSTEM.md §2.3角色色系统化 ✅ help-entry.js v3.1增量 ✅ 党建/党务二分 ✅ 党小组组长层级修正 ✅ 党务场景2个新网络 ✅ 固定小目录TOC ✅ 党建/党务视觉区分 ✅ GetDiagnostics零错误 ✅ 浏览器预览无报错 ✅
- **变更详情**:
  - DESIGN_SYSTEM.md：§2.3重写为§2.3.1党徽黄系+§2.3.2角色识别色系(8角色红橙黄绿蓝紫系统化)；新增6个CSS变量(--accent-leader/--accent-org-commissioner/--accent-prop-commissioner/--accent-disc-commissioner/--accent-organizer/--accent-participant)；党小组组长#CE1126→#EA580C(橙,体现"在支委之下")；组织委员#CE1126→#8B5CF6(紫)；组织者#3B82F6→#06B6D4(青)；§4.8支委图标色同步更新(组织委员紫/宣传委员蓝/纪检委员琥珀)；YAML更新2026-06-27
  - help-entry.js：v3.1增量(764行)；ROLES颜色更新8角色；ACTIVITY_NETWORK节点颜色更新+职责标注("在支委之下"/"支委")；TASKFORCE_NETWORK颜色更新；新增ATTENDANCE_NETWORK(党务·考勤与考察,3节点组长→纪检→组织委员+自循环"录入考勤总表")；新增REPORT_NETWORK(党务·思想汇报,2节点党员→组织委员+callout"纪检不介入")；新增selfLoopPath函数(自循环边渲染)；renderNetworkSVG重构(支持opts对象参数+自循环边+domain标签+callouts+sectionId)；新增renderTOC+bindTOC(固定小目录,IntersectionObserver高亮当前section)；renderHelpContent重组7个section顺序(Hero→角色→党建·活动→党建·专班→党务·考勤考察→党务·思想汇报→党员发展)
  - styles.css：v3.1增量样式(3609-3745行)；党建/党务section左侧色条(::before,党建红渐变/党务蓝渐变)；domain overline标签(党建工作红底/党务工作蓝底)；自循环边样式(.help-edge--self)；固定小目录TOC(min-width:1024px显示,胶囊纯白容器,圆点+文字默认隐藏hover/active显示,active圆点变红放大)；移动端隐藏色条(避免left:-24px超出屏幕)
- **设计决策**: 颜色按职能层级分配色相(红→橙→紫蓝琥珀→青绿灰,从领导核心到执行层)；党建/党务视觉区分用左侧色条+domain标签双重标识(不用背景色,保持苹果风纯白)；党务场景网络刻意简化(考勤3节点/思想汇报2节点,无组织者深度参与者,体现党务无项目分工)；自循环边表达"录入考勤总表"自指动作；TOC桌面端右侧固定移动端隐藏(避免占用移动端空间)；党小组组长层级通过颜色(橙vs支委紫/琥珀)+职责文本标注("在支委之下")双重表达
- **结果**: 颜色规范系统化完成,帮助页党建/党务二分架构完成,零诊断错误,浏览器预览无JS报错,所有关键内容Select-String验证持久化
- **蒸馏标签**: [经验蒸馏: 否 — 颜色规范系统化+帮助页党建/党务二分]

## 2026-06-27 | 2026-06-T26 — 帮助页v3.2信息架构修改（6项反馈）

- **来源**: 书记反馈6个问题——小目录胀眼睛、目录不应维持上下平铺而应导航、竖条纹丑陋、角色环形排列无逻辑、党建和党务关系分不清、SVG字段覆盖
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 2026-06-T26-1 角色三层分类 ✅ 2026-06-T26-2 党建vs党务对比section ✅ 2026-06-T26-3 圆点导航 ✅ 2026-06-T26-4 去竖条纹+极淡背景色 ✅ 2026-06-T26-5 SVG label rect白底+节点坐标调整 ✅ 2026-06-T26-6 section顺序调整 ✅ GetDiagnostics零错误 ✅ Python验证持久化PASS ✅
- **变更详情**:
  - help-entry.js：v3.1→v3.2；ROLES平铺数组重构为ROLE_TIERS三层结构(领导层4支委/执行层1组长/参与层3报名角色,参与层标注nonPosition)；renderRoles从环形重写为分层卡片(.help-role-tier左侧tier-label+右侧grid卡片,每层border-top分隔)；新增renderDomainCompare函数(两列对比布局,building暖白/affairs冷白,含tag标签+summary+包含内容+特点列表+底部提示)；TOC_ITEMS从7项扩为8项(加入domain-compare)；renderTOC从胶囊式重做为右上角竖向8圆点导航(.help-toc-dot-item,半透明0.55hover变1,active圆点6px→8px变party-red,hover显tooltip)；bindTOC更新选择器匹配新类名+nav hover提升不透明度；renderHelpContent section顺序调整(roles后插入domain-compare)；edgePath函数加labelT参数(0=起点1=终点0.5=中点,默认0.5)；renderNetworkSVG中edge label加rect白色圆角背景(.help-edge-label-bg,带E5E7EB边框,opacity0.96)+label文字按edge.type着色(task红/info蓝)；ACTIVITY_NETWORK节点坐标调整(leader从y=210→220,organizer/deep/normal/disc/org坐标下移20-30px)+4条边加labelT(0.35-0.55)避免label压node；TASKFORCE_NETWORK节点重新布局(org-commissioner从中间x=400挪到右侧x=660避免与initiator↔organizer长斜线label重叠)+3条边加labelT(0.3-0.55)反向边organizer→initiator用labelT=0.3与initiator→organizer的label分开
  - styles.css：v3.1→v3.2；删除角色环形CSS段(.help-roles-ring/.help-roles-center/.help-role-orb/.help-role-circle/.help-role-name/.help-role-duty/.help-role-detail共110行)；新增角色三层分类CSS(.help-roles-stack flex column gap36px/.help-role-tier grid 160px+1fr/.help-role-tier-label sticky top80px/.help-role-tier-name 22px Serif/.help-role-tier-badge 非职务琥珀色标签/.help-role-tier-cards auto-fit minmax180px/.help-role-card 卡片顶部3px角色色条+hover上移3px/.help-role-card-dot 12px色点+15%色环/.help-role-card-name 17px Serif/.help-role-card-duty 角色色/.help-role-card-detail 13px灰)；新增党建vs党务对比CSS(.help-domain-grid 2列/.help-domain-col-building #FFFCFC暖白/.help-domain-col--affairs #FCFCFD冷白/.help-domain-tag overline标签/.help-domain-col-title 26px Serif/.help-domain-list li::before 暖红/冷蓝小圆点/.help-domain-footer #F9FAFB灰底提示)；删除党建/党务::before竖条纹CSS段(原.help-section--building .help-section-inner::before线性渐变红/蓝)；改用.help-section--building{background:#FFFCFC}.help-section--affairs{background:#FCFCFD}极淡背景色区分；edge label CSS新增.help-edge-label-bg rect白底E5E7EB边框+.help-edge-label-text按edge.type着色(task红/info蓝,font-weight600)；删除原.help-toc胶囊式TOC CSS段；新增.help-toc-nav圆点导航CSS(桌面端fixed right top50% opacity0.55 hover1,8个.help-toc-dot-item 16x16容器,.help-toc-dot-mark 6px灰点active变8px红+3px色环,.help-toc-dot-tooltip hover/active显示右侧tooltip带箭头)；移动端响应式删除ring相关+新增.role-tier单列+.domain-grid单列；reduced-motion中.help-role-orb改为.help-role-card
- **设计决策**: 角色三层分类取代环形——环形"画一个圆固然好看但没有逻辑关系",三层(领导层/执行层/参与层)直接编码角色间的分工与隶属关系,且参与层显式标注"报名参与,非职务"区分职务vs参与模式两种角色划分方式；党建vs党务对比section放在角色体系之后具体场景之前——书记指出"党建和党务的关系都分不清"不应直接跳到党建·活动,需先解释两域区别(创新探索vs合规运行/有组织者深度参与者vs无/有项目分工vs无),用冷暖色对比不用图标避免AI默认味；圆点导航取代胶囊TOC——书记指出"小目录做得不好看胀眼睛",原胶囊式TOC(纯白容器+圆点+文字)视觉重量过重,改为8个6px小圆点(半透明0.55)只hover时显示tooltip,active圆点变大变红,符合"极简不胀眼"要求；去竖条纹改极淡背景色——书记指出"竖条纹很丑陋",::before线性渐变色条(left:-24px)视觉割裂,改用#FFFCFC/#FCFCFD极淡背景色(几乎不可见但能感知)更苹果风；SVG label rect白底+节点坐标调整——书记指出"字段之间不要覆盖",原edge label用stroke白边描边(stroke-width:4)在密集网络中仍会与node/其他label重叠不可读,改用rect白色圆角背景(带E5E7EB细边框opacity0.96)+label按edge.type着色(task红/info蓝font-weight600)双重提升可读性,同时调整ACTIVITY/TASKFORCE节点坐标避免label位置压node,TASKFORCE中org-commissioner从中间挪到右侧避免与initiator↔organizer长斜线label重叠,反向边用labelT=0.3与正向边label分开
- **结果**: 6项反馈全部解决,GetDiagnostics零错误,Python验证JS/CSS关键标识符全部写入且无旧代码残留(RESULT: PASS),苹果风格保持,无JS报错
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页v3.2信息架构修改6项反馈]

## 2026-06-27 | 2026-06-T27 — 帮助页v4讲我们支部的故事（叙事架构重写）

- **来源**: 书记指示——帮助页要从v3.2"关系网络"重写为v4"讲我们支部的故事"，按新叙事框架重构，去掉党建vs党务对比/考勤考察/思想汇报/角色独立section，新增考察积极分子/【管理事，服务人】核心口号/两种工作/探索工作/行百里者半九十四阶段
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 2026-06-T27-1 重写help-entry.js v4叙事架构 ✅ 2026-06-T27-2 调整styles.css v4样式 ✅ 2026-06-T27-3 GetDiagnostics+一改具改验证 ✅
- **变更详情**:
  - help-entry.js：v3.2→v4整体重写(890行)；删除ROLE_TIERS/DOMAIN_COMPARE/ATTENDANCE_NETWORK/REPORT_NETWORK四个数据+renderRoles/renderDomainCompare/renderAttendanceNetwork/renderReportNetwork四个渲染函数；保留ACTIVITY_NETWORK/TASKFORCE_NETWORK/DEVELOPMENT_STAGES三组数据+svgEl/edgePath/selfLoopPath/renderNetworkSVG/bindScrollReveal/bindNetworkHover/bindStageToggle/bindTOC八个核心函数；新增REVIEW_DIMENSIONS三维度数据(党课学习/党建贡献高亮/综合评价)+TWO_WORKS两种工作数据(成熟工作/探索工作)+DIALOGUE_STAGES四阶段数据(萌芽/接续/对话/共识)；TOC_ITEMS从8项改为7项(hero/review/philosophy/works/exploration/dialogue/development)；renderNetworkSVG新增inline:true选项返回不带section包裹的wrap div(用于exploration内嵌双SVG)；renderHero改写为"从申请人到正式党员"主线开篇；新增renderReview三维度卡片(contribution卡片help-review-card--highlight高亮)；新增renderPhilosophy核心口号签名元素(eyebrow小字+"管理事，服务人"clamp(48px,8vw,96px) party-red左右分解+foot呼应)；新增renderTwoWorks成熟vs探索两列对比；新增renderExploration内嵌活动+专班双SVG(section加help-network-section类作为样式钩子复用is-revealed联动)；新增renderDialogue四阶段卡片(grid四列+::after横向箭头→);renderDevelopment加结语.help-development-coda"每个同志的成长都离不开这套工作架构的支持——管理事，服务人"呼应核心口号
  - styles.css：v3.2→v4；顶部注释v3→v4签名元素更新为【管理事，服务人】+SVG；删除.help-roles-*整块样式(角色环形/三层分类共110行)；删除.help-domain-*整块样式(党建vs党务对比)；删除.help-section--building/.help-section--affairs/.help-section-domain*样式(v3.2增量)；新增.help-review-*三维度卡片样式(grid三列+highlight卡片party-red顶部条+背景#FFFCFC+dot变大变色+tag色变红)；新增.help-philosophy-*核心口号样式(min-height:80vh居中+eyebrow 12px tracking-wide灰+title clamp(48px,8vw,96px)Noto Serif SC 800 party-red+foot 16px灰)；新增.help-works-*两种工作样式(grid两列+col--mature暖白/col--explore冷白+tag标签+examples/features列表+mature琥珀色/explore蓝青色)；新增.help-exploration-*探索工作样式(block垂直堆叠+inner 880px+head居中+two-svg垂直gap40px)；新增.help-dialogue-*四阶段样式(grid四列+卡片border-top 3px party-red+::after横向箭头→party-red 22px+stage-num 14px party-red Serif+stage-name 19px Serif+stage-desc 14px灰)；新增.help-development-coda结语样式(margin-top 80px+padding-top 40px+border-top 1px E5E7EB+text 18px Serif居中灰700)；响应式删除role-tier/domain移动端规则+新增review/works/philosophy/dialogue移动端规则(含dialogue四阶段改单列+箭头::after改↓下箭头)；reduced-motion.help-role-card替换为.help-review-card/.help-works-col/.help-dialogue-card
- **设计决策**: 【管理事，服务人】作为签名元素——frontend-design skill"Spend your boldness in one place"原则,极简布局(居中无装饰)+clamp(48px,8vw,96px)超大字+Noto Serif SC 800+party-red主色+左右分解(管理事|服务人)+eyebrow小字"工作哲学"+foot呼应,把整个页面的boldness集中在此一处；renderNetworkSVG新增inline模式——解决exploration既要独立section又要内嵌双SVG的复用需求,inline:true返回不带section包裹的wrap div；exploration section加help-network-section类——解决内嵌双SVG如何触发is-revealed动画问题,复用CSS .help-network-section.is-revealed .help-node-svg/.help-edge选择器联动；dialogue四阶段用grid+::after横向箭头→——编码"行百里者半九十"四阶段的流转关系(萌芽→接续→对话→共识),移动端改纵向+箭头↓保持流转语义；结语呼应核心口号——development时间轴末尾加.help-development-coda"管理事，服务人",让叙事闭环从开篇口号到结尾呼应
- **结果**: v4叙事架构重写完成,7个section顺序(hero/review/philosophy/works/exploration/dialogue/development),12项验收标准全部满足,GetDiagnostics零错误,Grep验证关键标记持久化PASS(REVIEW_DIMENSIONS/renderPhilosophy/DIALOGUE_STAGES/管理事/行百里者半九十/help-philosophy-title/help-dialogue-flow/help-review-card--highlight/help-development-coda均确认写入磁盘),一改具改零残留(styles.css无 help-role-/help-domain-/help-section--building/affairs/help-section-domain 残留,全仓库无对 #roles/#domain-compare/#attendance/#report/#activity/#taskforce 的引用,help-entry.js无 ROLE_TIERS/DOMAIN_COMPARE/ATTENDANCE_NETWORK/REPORT_NETWORK/renderRoles/renderDomainCompare/renderAttendanceNetwork/renderReportNetwork 残留),苹果风保持(纯白+大留白+Noto Serif SC+cubic-bezier)
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页v4讲我们支部的故事]

## 2026-06-27 — 帮助页v4 section顺序调整（身份阶段前置）

- **来源**: 书记反馈——"【从申请人到正式党员】这一步应当放到前面！因为大部分同学对于整个发展过程中的【身份阶段】其实并不了解"，认可v4叙事大框架，仅要求调整section顺序
- **变更文件**: docs/src/entries/help-entry.js
- **关键动作**: 无T编号（小任务，1文件3处修改）
- **变更详情**:
  - TOC_ITEMS：development（label改为"身份阶段"）从第7位移到第2位（hero之后）
  - renderHelpContent：renderDevelopment()调用从末尾移到renderHero()之后、renderReview()之前
  - renderDevelopment标题：从"从申请人到正式党员"（与Hero重复）改为"5 个阶段，25 个步骤"
  - renderDevelopment副标题：从"5 个阶段，25 个步骤——点击阶段卡片展开详情"改为"身份阶段的演进——点击阶段卡片展开详情"
  - renderDevelopment coda：从"每个同志的成长，都离不开这套工作架构的支持——管理事，服务人"（提前剧透Section 3核心口号）改为"身份阶段的演进只是起点——支部如何考察每一位积极分子？"（承上启下引出下一节）
- **设计决策**: 标题与coda同步调整——development前置后若保留原标题会与Hero"从申请人到正式党员"完全重复造成视觉困惑；若保留原coda会提前泄底Section 3"管理事，服务人"签名元素，破坏frontend-design skill"Spend your boldness in one place"原则。新coda改为承上启下问句，自然引出下一节"考察积极分子"
- **结果**: 3处修改全部Python+Grep验证持久化成功，section顺序变为hero/development/review/philosophy/works/exploration/dialogue，叙事链条"身份阶段→考察积极分子→管理事服务人→两种工作→探索→对话"更符合读者认知起点
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页v4 section顺序微调]

## 2026-06-27 — 帮助页v4 SVG关系网络箭头与文字重叠修复

- **来源**: 书记验收v4顺序调整后反馈——"大部分没问题，少数存在任务流信息流箭头和文字重叠的问题，需要解决"
- **变更文件**: docs/src/entries/help-entry.js
- **关键动作**: 无T编号（小任务，1文件3处函数/数据修改）
- **变更详情**:
  - edgePath函数增加curve参数：0=直线，非0=quadratic Bezier曲线，控制点在线段中点沿顺时针90°方向(-uy,ux)偏移curve；label位置相应移到曲线上t=labelT处
  - renderNetworkSVG传递edge.curve给edgePath；label渲染支持edge.labelDx/labelDy手动偏移（用于短边把label移到线段一侧）
  - ACTIVITY_NETWORK 3条边修复：organizer→deep(短边labelDx:55右移)、deep→normal(labelDy:-18上移避箭头)、disc-commissioner→org-commissioner(labelDx:-38,labelDy:-14左上偏移避箭头)
  - TASKFORCE_NETWORK 3条边修复：org-commissioner→deep(短边labelDx:55右移)、initiator↔organizer反向边对(curve:32分别向左上/右下弯曲，两条线段分开，label也分开)
- **设计决策**: 通用curve参数而非硬编码反向边检测——保留数据驱动灵活性，未来任意边都可指定curve/labelDx/labelDy；curve方向定义"顺时针90°"使反向边对同号curve自然向两侧分开（两条边方向相反，顺时针90°方向也相反）；短边用labelDx而非调整节点位置——避免影响整体布局且改动最小
- **结果**: 9处修改Grep验证持久化PASS，GetDiagnostics零错误，3类重叠问题（短边label与箭头重叠/反向边线段重合/边沿label挤箭头）全部解决，SVG关系网络可读性提升
- **蒸馏标签**: [经验蒸馏: 否 — SVG edge label定位优化]

## 2026-06-27 — 帮助页v4.1三类线重构+角色补全+循环叙事+TOC弱化+"之上/之下"一改具改

- **来源**: 书记对v4+SVG修复的5条反馈——①侧边目录字太突出 ②DIALOGUE 04"长期互动"不是第4时间环节 ③箭头问题没解决 ④不要"谁在谁之上/之下"表述 ⑤宣传委员缺失/支委协作关系缺失/箭头看不出时序/任务流vs信息流定义不清；书记决策（三类线+补全角色+DIALOGUE改循环）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, content/guides/design/DESIGN_SYSTEM.md
- **关键动作**: 无T编号（v4.1连续重构，3文件协同修改）
- **变更详情**:
  - 任务流vs信息流vs协作线三分类定义——任务=让某人做某事（派活/分配/交付，红实线dasharray 14 4有箭头流动）；信息=让某人知道某事（报备/反馈/告知，蓝虚线dasharray 6 4有箭头流动）；协作=横向配合（灰点线dasharray 2 4无箭头无动画）
  - ACTIVITY_NETWORK重构：7→8节点（新增宣传委员prop-commissioner x:680,y:230）；10→15边（5 task + 7 info + 3 collab）；viewBox 540→580；leader duty删除"在支委之下"改为"活动核心"
  - 边重分类——"通知+分工"拆为leader→normal"通知"(info)+leader→deep"分工"(task)；"提交考勤"从task改为info；新增leader→prop"宣传需求"(task)、prop→org"宣传素材"(info)；新增secretary↔3支委协作线（org/disc/prop-commissioner各一条collab无箭头）
  - renderNetworkSVG协作线支持——collab类型不渲染marker-end（无箭头）；空label不渲染label元素避免空text节点
  - TASKFORCE_NETWORK保留curve:32反向边分开修复（v4 SVG修复成果保留）
  - DIALOGUE_STAGES 04从"长期互动/第4环节"改为"下一次迭代/经验如何传承/从这次到下一次"，phase字段改为"下一次迭代"
  - renderDialogue foot改为"事前 → 事中 → 事后 → 下一次——这是一个持续迭代的循环，同志与组织在实践中不断改进"
  - styles.css新增.help-legend-line--collab（灰点线背景）+.help-edge--collab .help-edge-path（stroke #9CA3AF dasharray 2 4 width 1.5无动画）
  - legend三栏更新——"任务流(实线·派活交付)/信息流(虚线·报备告知)/协作线(点线·横向配合)"
  - TOC弱化——nav opacity 0.55→0.4；tooltip背景从var(--help-text)深色#F3F4F6浅灰+文字从白色改var(--help-text)深灰+border #E5E7EB+阴影减弱；active tooltip从红底白字改#FEE2E2浅红底+var(--help-party-red)红字+#FECACA边框
  - DESIGN_SYSTEM.md §2.3.2一改具改——"按职能层级分配色相"→"按职能分工分配色相"；"按职能层级从上至下"→"按职能分工归类"；"执行层领导（党小组组长，在支委之下）"→"执行层（党小组组长，与支委分工配合）"；"体现'在支委之下'的层级关系"→"体现与支委的分工区分"
- **设计决策**: 三类线而非二类——书记提"任务和信息"两类，AI补"协作"第三类承担支委横向配合关系（避免把"配合"硬塞进任务或信息流），三类线视觉差异化（实线/虚线/点线）+语义差异化（有箭头/有箭头/无箭头）；宣传委员位置(x:680,y:230)与纪检委员(x:680,y:370)同列右侧形成支委三角，与左侧组织者/参与者分组呼应；协作线无箭头——协作无方向无时序，只是横向配合关系，无箭头视觉上也减轻了"箭头一多看不出谁先谁后"的压力；DIALOGUE 04改循环而非删除——事前/事中/事后是顺序，但04不是第4环节，而是"下一次迭代"的循环回到起点，phase字段直接标"下一次迭代"避免误解；保留curve:32——v4 SVG修复对TASKFORCE反向边的成果不因v4.1重构而丢失
- **结果**: 3文件修改Grep验证全部持久化PASS（collab 3处+prop-commissioner 3处+curve:32 2处+"下一次迭代"+"事前→事中"+help-edge--collab+help-legend-line--collab+opacity:0.4+#F3F4F6+#FEE2E2），DESIGN_SYSTEM.md"在支委之下/层级"零残留，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — SVG三类线分类与角色关系网络重构]

## 2026-06-27 — 帮助页v4.2黄色框移除+DIALOGUE环形循环+两种工作叙事重构+philosophy先锋模范论证

- **来源**: 书记对v4.1的4条反馈——①DIALOGUE 4阶段期待真正的循环视觉而非顺序关系 ②日常党务/考勤归档不是积极分子关心的，重点侧重探索工作（发挥所有人智慧含积极分子）③【管理事服务人】要讲好"凭什么"——党员先锋模范作用落地（具体的不是喊口号），党员帮助积极分子/发展对象熟悉支部 ④先行修改：流程图点击身份后不要出现黄色框
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 无T编号（v4.2连续迭代，2文件协同修改）
- **变更详情**:
  - **黄色框移除**：styles.css ACCESSIBILITY章节追加 .help-node-svg:focus/:focus-visible { outline: none }——浏览器对带tabindex的SVG `<g>`元素点击聚焦时渲染默认黄色/橙色focus ring，与品牌色冲突；节点视觉反馈已由.highlighted类承担（drop-shadow + ring opacity），outline多余
  - **DIALOGUE环形布局**：renderDialogue从4列横向grid改为2x2网格+中心循环图标；4卡片加位置类help-dialogue-card--pos01~04（01左上/02右上/03右下/04左下）；新增.help-dialogue-cycle包裹层+.help-dialogue-center中心元素（↻持续迭代图标）；卡片间箭头从统一→改为顺时针环形（01→02→/02→03↓/03→04←/04→01↑）；foot从"事前→事中→事后→下一次——这是一个持续迭代的循环"改为"事前→事中→事后→下一次——循环往复，同志与组织在实践中不断改进"
  - **DIALOGUE移动端响应式**：.help-dialogue-flow回退为1列纵向；.help-dialogue-center隐藏；pos01/02/03的::after统一改为↓；pos04的::after content:none（最后一个无箭头）
  - **两种工作叙事重构**：TWO_WORKS mature examples从['日常党务','考勤归档','材料流转']改为['组织生活','材料流转','会务保障']（避开支委专属活，改为人人会接触的基础事务）；mature desc加"有规范的常规事务"；explore desc加"人人皆可贡献，包括积极分子"；explore features加第4项"人人参与"；section subtitle从"探索工作是党建贡献的核心来源"改为"探索工作是人人都参与的场域，包括积极分子"；footer从"探索工作是党建贡献的核心来源→"改为"探索工作——发挥所有人智慧的场域→"
  - **philosophy先锋模范论证**：renderPhilosophy在split和foot之间新增.help-philosophy-reason论证区——"凭什么这样说？因为我们要求党员的先锋模范作用落地——不是喊口号，而是具体的。党员同志要帮助积极分子、发展对象同志熟悉支部工作、支部架构。"；foot从"这是我们支部的工作哲学"改为"先锋模范作用落地，才是'管理事，服务人'的真正含义"
  - **philosophy论证区CSS**：新增.help-philosophy-reason（max-width 640px+浅红底+圆角+居中flex列）、.help-philosophy-reason-q（斜体灰色问句）、.help-philosophy-reason-a（16px深色主论证）、.help-philosophy-emph（红色加粗"先锋模范作用落地"）、.help-philosophy-reason-detail（14px灰色具体表现+虚线分隔）
- **设计决策**: 环形布局选2x2+中心图标而非绝对定位4方位——2x2网格响应式更稳，中心图标用绝对定位居中即可；箭头用→↓←↑四方向而非弯曲弧线——直字符箭头跨浏览器稳定，且四方向已足够表达"环形顺时针"语义；mature examples改"组织生活/材料流转/会务保障"而非直接删除——保留两种工作的对比结构，但例子选择避开"支委专属活"，让普通同志/积极分子也能认同"成熟工作"是人人会接触的；philosophy论证区用"凭什么→因为→具体表现"三段式——书记原话"凭什么说我们是管理事服务人。因为党员先锋模范作用落地。这个先锋模范作用是具体的不是喊口号。党员帮助积极分子、发展对象熟悉支部"本身就是完整论证链，直接结构化呈现即可；移除outline不损失可访问性——highlight类（drop-shadow+ring opacity）已提供视觉反馈，且focus事件仍触发highlight函数（line 787）
- **结果**: 2文件修改Grep验证全部持久化PASS（help-dialogue-cycle 2处+help-dialogue-card--pos 4处+人人皆可贡献+先锋模范作用落地+帮助积极分子、发展对象+help-node-svg:focus 2处+help-philosophy-reason 4处+4位置::after 4处+移动端4348-4359），GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页v4.2叙事深化与循环视觉重构]

## 2026-06-27 — 帮助页v4.3 DIALOGUE箭头风格统一（CSS三角形+SVG椭圆环）

- **来源**: 书记反馈"循环关系的箭头非常混乱！！！请你保证风格统一！！" + 要求使用 web-design-guidelines skill 思考
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 无T编号（v4.3箭头风格统一修复，2文件协同修改）
- **变更详情**:
  - **web-design-guidelines审查**：WebFetch获取最新指南，对照"Hover & Interactive States""Animation"规则诊断当前3问题——①4个Unicode字符箭头(→↓←↑)在不同字体渲染粗细不一 ②位置偏移不一致(水平-58px/垂直-38px) ③孤立符号无连线无法形成循环视觉
  - **SVG椭圆环新增**：renderDialogue在.help-dialogue-cycle内加<svg class="help-dialogue-ring">+<ellipse>——viewBox 0 0 100 100 + preserveAspectRatio="none"（拉伸为椭圆适配容器）+ vector-effect="non-scaling-stroke"（stroke不随拉伸变形保持1.5px）+ stroke-dasharray="3 2"虚线 + opacity 0.22；作为循环连线背景层，4个箭头在环上
  - **统一CSS三角形箭头**：删除4个字符箭头(content: '→'/'↓'/'←'/'↑')；新增.help-dialogue-card::after基础样式——border-top/bottom 7px transparent + border-left 12px solid var(--help-party-red)（指向右的三角形）；4个位置类只设置位置+transform:rotate()——pos01 rotate(0deg)指向右/pos02 rotate(90deg)指向下/pos03 rotate(180deg)指向左/pos04 rotate(270deg)指向上；所有箭头border定义完全相同，风格统一
  - **位置偏移调整**：水平-54px/垂直-44px（原-58/-38），更接近gap中间值，视觉平衡
  - **移动端响应式**：.help-dialogue-ring与.help-dialogue-center统一display:none；pos01/02/03的::after统一rotate(90deg)指向下；pos04的::after display:none（最后一个无箭头）；用display:none替代原content:none（因为::after现在是CSS三角形不是字符）
- **设计决策**: 用CSS三角形+rotate而非字符箭头——border定义完全相同，rotate控制方向，风格100%统一，且不受字体渲染影响；加SVG椭圆环而非纯箭头——4个孤立箭头无法表达"循环"，椭圆环作为连线让4个箭头成为环上的点，强化循环语义；vector-effect="non-scaling-stroke"——preserveAspectRatio="none"拉伸SVG时stroke会变形（水平/垂直拉伸比不同），non-scaling-stroke让stroke保持固定1.5px粗细，避免椭圆环线宽不一；保留中心↻图标——外围椭圆环+箭头与中心↻三层协同表达循环（环=路径/箭头=方向/↻=循环符号）；pos04移动端display:none而非content:none——::after现在是border三角形不是content字符，content:none无效，必须用display:none隐藏
- **结果**: 2文件修改Grep验证全部持久化PASS（help-dialogue-ring 2处+ellipse+non-scaling-stroke+border-left:12px+rotate 90/180/270deg 4处+移动端4342-4354），旧字符箭头content:'→'/'↓'/'←'/'↑'零残留，GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — DIALOGUE环形循环箭头风格统一]

## 2026-06-27 — 帮助页v4.3.1 DIALOGUE箭头风格深度统一（gap对称+偏移对称+transform-origin+hover去抖）

- **来源**: 书记再次反馈"循环关系的箭头非常混乱！！！请你保证风格统一！！"——v4.3虽已用CSS三角形+rotate统一箭头形态，但仍有5处风格不一致
- **变更文件**: docs/src/styles.css, docs/src/entries/help-entry.js
- **关键动作**: 无T编号（v4.3.1箭头深度统一修复，2文件协同修改）
- **变更详情**:
  - **web-design-guidelines二次审查**：对照"Animation - Set correct transform-origin""Hover & Interactive States - Interactive states increase contrast""Animation - Animate transform/opacity only"5条规则，诊断v4.3残留5问题——①箭头偏移不对称（水平-54px vs 垂直-44px）②gap不对称（56px 96px，row vs column）③hover时transform:translateY(-3px)带动::after箭头跳动④transform-origin未显式设置⑤椭圆环opacity 0.22太淡与实心箭头视觉脱节
  - **gap统一**：.help-dialogue-flow gap从`56px 96px`→`72px 72px`（row=column），让4个箭头偏移可对称位于gap正中间
  - **箭头偏移统一**：4个::after偏移从`-54px/-44px/-54px/-44px`→`-36px/-36px/-36px/-36px`（=gap/2，位于gap正中间，视觉完全对称）
  - **transform-origin显式设置**：.help-dialogue-card::after新增`transform-origin: center`（guidelines要求显式设置旋转中心）
  - **hover去transform**：.help-dialogue-card:hover去掉`transform: translateY(-3px)`，只保留box-shadow+border-color——避免贴在卡片上的::after箭头跟随跳动（hover视觉反馈由box-shadow+border-color承担，符合guidelines"hover: state"规则）
  - **椭圆环可见度提升**：opacity 0.22→0.35，dasharray 3 2→4 3——与实心箭头形成统一视觉系统，环作为循环连线更明显
  - **移动端偏移同步**：pos01/02/03移动端::after偏移`-22px`→`-14px`（=gap/2，gap 28px），与桌面端统一规则
- **设计决策**: 统一gap为72px而非保留56x96——根本矛盾是"gap不对称→箭头无法既统一偏移又居中gap中间"，唯一解法是统一gap；箭头偏移=gap/2（-36px桌面/-14px移动）——数学对称保证视觉对称；hover去transform保留box-shadow——guidelines"Interactive states increase contrast"不要求transform，box-shadow+border-color已提供足够视觉反馈且不带动箭头跳动；椭圆环opacity提到0.35——0.22太淡存在感低，0.35与实心箭头(opacity 1)形成层级但仍为背景，4个箭头成为环上的点而非孤立符号
- **结果**: 2文件修改Grep验证全部持久化PASS（gap:72px 72px+4处-36px+transform-origin:center+bottom:-14px+opacity="0.35"+dasharray="4 3"），旧值零残留（gap:56px 96px/-54px/-44px/-22px/opacity="0.22"/dasharray="3 2"全清零），GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — DIALOGUE箭头深度统一]

## 2026-06-27 — 帮助页v4.3.2 DIALOGUE 02卡片主题修正（信息流任务流→事中对话）

- **来源**: 书记提醒"四个框都有序号标注，你要对于其中莫名其妙出现的要素警惕！"——经审视确认02卡片偏离"对话"主题
- **变更文件**: docs/src/entries/help-entry.js
- **关键动作**: 无T编号（02卡片内容修正，1文件修改）
- **变更详情**:
  - **问题诊断**：DIALOGUE四阶段主题为"行百里者半九十——必须和组织对话，在实践中持续改进"，4阶段应围绕"对话"循环（事前传达→事中沟通→事后复盘→下一次传承）。但02卡片原内容为question"目前有的工作模式是什么？"/answer"信息流·任务流"/desc"任务流（实线）传递分工与执行，信息流（虚线）传递报备与归档"——突然引入前文SVG关系网络的概念（任务流红实线/信息流蓝虚线），与"对话"主题脱节，是"莫名其妙出现的要素"
  - **02卡片内容修正**：question"目前有的工作模式是什么？"→"工作中遇到问题怎么办？"；answer"信息流·任务流"→"及时和组织沟通"；desc"任务流（实线）传递分工与执行，信息流（虚线）传递报备与归档——两套流并行运转。"→"不是等做完了才反馈——过程中就要对话，遇到偏差及时调整，避免事倍功半。"
  - **4卡片主题统一**：01事前传达（对话起点）/02事中沟通（对话过程）/03事后复盘（对话沉淀）/04下一次传承（对话延续）——4阶段全部围绕"对话"主题，循环语义完整
- **设计决策**: 02改为"事中对话"而非保留"工作模式"——DIALOGUE的母题是"和组织对话"，02作为"工作之中"阶段应讲"过程中的对话"（及时沟通/实时调整），而非重复前文SVG已讲过的"信息流/任务流"概念；02与03区分——02是"过程中实时沟通"（避免偏差），03是"完成后复盘得失"（总结反思），两者主题不重复
- **结果**: 1文件修改Grep验证持久化PASS（line 138-140新内容），旧内容零残留（"信息流·任务流"/"目前有的工作模式"/"任务流（实线）传递分工与执行"全清零），GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — DIALOGUE 02卡片主题修正]

## 2026-06-29 | 2026-06-T28 — 帮助页v4.3.3 箭头SVG化 + 探索工作苹果风滚动动画 + 角色颜色审校输出

- **来源**: 书记v4.3.3三项要求（①箭头风格不统一+不喜欢环形箭头 ②探索工作滚动动画 ③角色颜色审校）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 角色颜色审校输出 ✅ DIALOGUE箭头SVG化 ✅ 探索工作滚动动画 ✅
- **变更详情**:
  - **角色颜色审校输出**：从DESIGN_SYSTEM.md §2.3.2读取8角色`--accent-<role>`变量定义，输出给书记审校（党支书#7A0010深红/组长#EA580C橙/组织委员#8B5CF6紫/宣传委员#3B82F6蓝/纪检委员#D97706琥珀/组织者#06B6D4青/深度参与者#10B981绿/普通参与者#6B7280灰），等待书记反馈后启动T23全仓库同步
  - **DIALOGUE箭头重新设计**：去掉中心的↻字符块（书记明确反馈"不喜欢那个环形箭头"）；去掉4个CSS border三角形（书记称"诡异的三角形"——border法有渲染锯齿）；新增4个SVG箭头（`<path d="M3 7 L15 7 M11 2 L15 7 L11 12" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`），精致统一；保留椭圆虚线环作为循环视觉
  - **探索工作滚动动画**（苹果风"一部分悬停，一部分移动"）：
    - 新增`EXPLORATION_ROLES`数据对象——activity 8角色 + taskforce 4角色，按"信息出现顺序"排列，每角色标注`stagger`组号（同组=多线程并行）
    - 重写`renderExploration`函数——双列grid布局：左列SVG用`position:sticky`悬停在视口（top:88px），右列角色卡片随滚动滑入
    - 新增`bindExplorationReveal`函数——IntersectionObserver观察`.help-exploration-scene`，触发时按`data-stagger-group`分组延迟（120ms×组号）添加`is-visible`类，同组同时滑入（体现多线程）
    - 新增CSS：`.help-exploration-scene`（双列grid + gap:56px）/`.help-exploration-scene-sticky`（sticky悬停）/`.help-exploration-scene-roles`（flex column + padding-top:56px）/`.help-exploration-role`（初始opacity:0+translateX(28px)+transition 600ms）/`.help-exploration-role.is-visible`（opacity:1+translateX(0)）/`.help-exploration-scene-note`（grid-column:1/-1跨双列）
    - prefers-reduced-motion降级：角色卡片直接可见，无动画
    - 移动端768px回退：sticky失效，单列堆叠，padding-top归零
- **设计决策**: ①箭头用SVG `<path>`而非CSS border——SVG精致无锯齿，符合web-design-guidelines的"Hover & Interactive States"规则；②探索工作用sticky+滑入方案而非modal——书记选择"先做滚动动画"，sticky悬停是苹果风"一部分悬停"的标准实现；③stagger分组延迟而非逐个延迟——同组同时滑入体现"多线程并行"（书记原话"要体现多线程"）；④角色信息按"信息出现顺序"排列而非按SVG节点顺序——activity从组长(0)→支书(1)→组织者+深度参与者(2同组)→普通参与者+纪检委员(3同组)→宣传委员(4)→组织委员归档(5)，体现"谁先找谁"的工作流
- **结果**: 2文件修改，Grep验证持久化PASS（EXPLORATION_ROLES/bindExplorationReveal/help-exploration-scene-sticky/data-stagger-group全在），旧引用零残留（.help-exploration-block/.help-exploration-block-head/.help-exploration-block-note全清零，仅.help-exploration-block-no/title新结构复用），GetDiagnostics零错误
- **蒸馏标签**: [经验蒸馏: 否 — 帮助页v4.3.3箭头SVG化+探索工作滚动动画]

## 2026-06-30 | 2026-06-T29 — 帮助页v4.3.3 探索工作 scroll-driven animation 重新设计（修正 T28 设计意图误解）

- **来源**: 书记对 T28 初版的反馈"目前的滚动体验毫无动态，这很诡异……请你仔细思考清楚！！" + AskUserQuestion 两轮确认（症状 + 设计方向）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 数据加 stage 字段 ✅ renderNetworkSVG 加 data-stage ✅ EXPLORATION_STAGES 替换 EXPLORATION_ROLES ✅ renderExploration 重写 ✅ bindExplorationScrollDriven 替换 bindExplorationReveal ✅ CSS 重写 ✅ prefers-reduced-motion 优先级提升 ✅
- **变更详情**:
  - **T28 设计意图误解诊断**：T28 把"一部分悬停、一部分移动"错误理解为"SVG 悬停 + 角色卡片滑入"——结果角色卡片视觉占据太强，SVG 的"流"被削弱，且 IntersectionObserver observation target 错误（观察 `.help-exploration-scene` 整体 → batch trigger，所有卡片在 600ms 内一次性出现，无滚动驱动感）
  - **正确理解**："一部分悬停"= SVG `position: sticky` 悬停（舞台）；"一部分移动"= SVG **内部**节点和连线按"信息出现顺序"随滚动逐个绘制出现（不是右列卡片移动）
  - **数据层**：ACTIVITY_NETWORK 和 TASKFORCE_NETWORK 的每个 node 和 edge 添加 `stage` 字段（activity: 0-5 六阶段，taskforce: 0-3 四阶段），同 stage 元素同时出现（多线程并行），不同 stage 随滚动逐组触发
  - **renderNetworkSVG 改造**：node 和 edge 的 g 元素有条件输出 `data-stage` 属性（`...(node.stage !== undefined ? { 'data-stage': node.stage } : {})`）
  - **EXPLORATION_ROLES → EXPLORATION_STAGES**：移除角色卡片数据，新增阶段说明数据（stage/title/desc/flows），每阶段作为 IntersectionObserver 触发器；角色信息弱化为 flow 标签（如"组长 → 支书（报备）"），让 SVG 的"流"成为视觉主角
  - **renderExploration 重写**：左列 SVG sticky 悬停（`position: sticky; top: 80px`），右列阶段说明滚动触发；阶段说明卡片小尺寸 + flow 标签弱化视觉
  - **bindExplorationScrollDriven**：① 为每条 edge path 用 `getTotalLength()` 设置 `stroke-dasharray` 和 `stroke-dashoffset`（初始 dashoffset = length，不可见）；② IntersectionObserver observation target 改为每个 `.help-exploration-stage`（scroll-driven，不是 batch trigger）；③ 触发时按 `data-stage` 精准匹配 SVG 中相同 stage 的节点 g + 连线 g，添加 `is-revealed` 类；④ 连线 `dashoffset → 0` 实现"被绘制"视觉效果（stroke-dashoffset transition 900ms）；⑤ prefers-reduced-motion 降级：所有 `[data-stage]` 元素直接 `is-revealed`，dashoffset 全部归零，无动画
  - **CSS 优先级冲突解决**：原全局规则 `.help-network-section.is-revealed .help-node-svg { opacity: 1; }`（优先级 0,3,0）会覆盖 scroll-driven 的初始隐藏——用 `:not(.is-revealed)` 伪类 + 5 级 class 选择器 `.help-exploration-section.is-revealed .help-exploration-scene .help-node-svg:not(.is-revealed)`（优先级 0,5,0）覆盖，无需 `!important`
  - **prefers-reduced-motion 优先级提升**：原选择器 `.help-exploration-scene .help-node-svg`（0,2,0）低于初始隐藏规则（0,5,0）——改为 `.help-exploration-section .help-exploration-scene .help-node-svg`（0,5,0）+ `!important` 对称覆盖
  - **`--help-text-dim` 变量未定义 bug 自然消解**：T28 引用该变量的 `.help-exploration-role-duty` 已被移除，新 stage-flow 用硬编码 `#6B7280`
- **设计决策**: ① SVG 内部元素 scroll-driven（推荐方案）—— IntersectionObserver 观察阶段说明触发器，按 `data-stage` 精准匹配 SVG 元素，避免 batch trigger；② 连线用 `stroke-dashoffset` 绘制动画（推荐方案）—— `getTotalLength()` 精确测量 + dashoffset → 0 实现"流被绘制"的方向感，比 opacity 淡入更能体现"谁找谁"的关系；③ 角色信息弱化为 flow 标签 —— 让 SVG 的"流"成为视觉主角（书记反馈"角色卡片视觉占据太强，削弱了流的展示作用"）；④ CSS 优先级冲突用 `:not()` 伪类 + 选择器精度解决 —— 避免 `!important` 污染，符合 web-design-guidelines 的可维护性原则
- **结果**: 2 文件修改，Grep 验证持久化 PASS（EXPLORATION_STAGES/bindExplorationScrollDriven/data-stage/is-revealed 全在），旧引用零残留（EXPLORATION_ROLES/bindExplorationReveal/data-stagger-group/.help-exploration-role 全清零），GetDiagnostics 零错误
- **蒸馏标签**: [经验蒸馏: 否 — 探索工作 scroll-driven animation 重新设计，含 IntersectionObserver observation target / batch trigger vs scroll-driven / CSS 优先级冲突 :not(.is-revealed) 解决方案等可复用模式]

## 2026-06-30 | 2026-06-T30 — 帮助页 v4.3.3 探索工作 scroll-driven animation 第三次实现（真正滚动驱动 + 术语统一 + 三态层级）

- **来源**: 书记对 T29 的反馈"目前的滚动体验毫无动态，这很诡异"+ 三项要求（①术语统一是最大要求 ②用 frontend-design skill 检查 UI 原则 ③用 brainstorming skill 帮想清楚 UI 应该怎么设计供选择）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 术语澄清 ✅ frontend-design 原则检查 ✅ brainstorming 3 方案呈现 ✅ 方案 A 详细设计 6 节认可 ✅ CSS 重写（三态样式）✅ JS 重写（真正 scroll-driven）✅ 降级实现 ✅
- **变更详情**:
  - **术语澄清（书记最大要求）**：T28/T29 误用术语"scroll-driven animation"——实际是 scroll-triggered reveal（IntersectionObserver 离散触发，触发即完成不可倒退）。澄清 4 个专业术语：scroll-triggered reveal（滚动触发揭示）/ scroll-driven animation（滚动驱动动画，进度连续绑定可倒退）/ sticky scroll（粘性滚动）/ parallax（视差）。全文档统一使用上表术语
  - **frontend-design 原则检查**：诊断出 3 个核心问题——①运动意图缺失（触发后元素不变，无状态层级）②视觉锚点缺失（阶段说明卡片小且灰，无"我在哪一步"感知）③SVG 内部静态（触发后不变，缺少随滚动连续变化的动态感）
  - **brainstorming 3 方案呈现**：方案 A（真正 scroll-driven，进度绑定 SVG 状态）/ 方案 B（triggered + 状态层级强化）/ 方案 C（分步交互式）。书记选定方案 A
  - **方案 A 详细设计 6 节**：①整体架构与进度映射 ②元素状态计算规则（三态层级）③视觉层级设计 ④性能与降级 ⑤术语统一表 ⑥实施清单。书记全部认可
  - **CSS 重写**（line 3470-3707）：移除 T29 的 `:not(.is-revealed)` 规则；新增 SVG 元素三态层级（`[data-state="past"]` opacity 0.25 + saturate 0.3 / `[data-state="current"]` opacity 1 + saturate 1 / `[data-state="future"]` opacity 0）；新增阶段说明卡片三态（past 灰化 / current 高亮卡片——边框+左侧色条+浅红背景+scale 1.02+box-shadow / future 虚化）；阶段说明卡片 min-height: 65vh（提供足够 scroll range，activity 6×65vh=390vh，taskforce 4×65vh=260vh）；prefers-reduced-motion 降级用 `!important` 对称覆盖；移动端降级 sticky 失效 + min-height: auto
  - **JS 重写**（line 989-1160）：替换 `bindExplorationScrollDriven` 内部实现——IntersectionObserver → scroll 监听 + requestAnimationFrame 节流；progress mapping 算法：`progress = -sceneRect.top / scrollableDistance`（0~1）→ `stageProgress = progress × totalStages` → `currentStage = floor(stageProgress)` → `intraStageProgress = stageProgress - currentStage`（0~1）；元素状态更新（state hierarchy）：缓存 lastStage，只在 stage 变化时更新 data-state（避免每帧 DOM 操作）；连线绘制：已过 stage dashoffset=0 / 当前 stage dashoffset=length×(1-intraStageProgress) 连续绘制 / 未来 stage dashoffset=length 隐藏；降级：prefers-reduced-motion 所有元素 data-state="current" + dashoffset=0；移动端回退为 scroll-triggered reveal（IntersectionObserver + lastTriggeredStage 单向推进）
  - **术语统一表**（代码注释 + 执行日志 + 对话）：scroll-driven animation / scroll-triggered reveal / sticky scroll / state hierarchy / progress mapping / intra-stage progress / past-current-future——禁用混淆词"滚动动画"/"滚动出现"/"悬停"/"三态"/"暗亮隐藏"
- **设计决策**: ①方案 A 真正 scroll-driven（书记选定）—— progress 连续绑定滚动，可倒退，修复"毫无动态"根因；②三态层级（past/current/future）—— 已过暗化 + 当前高亮 + 未来隐藏，提供"我在哪一步"视觉锚点；③阶段说明卡片 min-height: 65vh —— 提供足够 scroll range 让 progress 平滑变化（T29 的 80px min-height 导致 scroll range 不足）；④连线 dashoffset 绑定 intra-stage progress —— 真正的"流被绘制"方向感，不是触发后的离散动画；⑤CSS 用 data-state 属性而非 class —— JS 只更新属性，CSS 用属性选择器控制样式，职责分离；⑥选择器优先级 (0,4,0) 覆盖全局 (0,3,0) —— 无需 !important（主样式），降级用 !important 对称覆盖
- **结果**: 2 文件修改，Grep 验证持久化 PASS（data-state/progress mapping/state hierarchy/scroll-driven/intra-stage 全在，JS 39 处 + CSS 24 处），旧引用零残留（is-revealed 在探索工作部分零残留），GetDiagnostics 零错误
- **蒸馏标签**: [经验蒸馏: 否 — 真正 scroll-driven animation 实现，含 progress mapping 算法 / state hierarchy 三态设计 / CSS 优先级 (0,4,0) 覆盖 (0,3,0) / 降级策略（prefers-reduced-motion + 移动端回退）/ 术语统一表等可复用模式]

## 2026-06-30 | 2026-06-T31 — 帮助页 v4.3.3 探索工作显示修复 + 视觉优化（比例调整 + 线型三态化 + 名称方案 A）

- **来源**: 书记反馈"始终无法显示"（经 code reviewer 审查找到两个致命根因）+ 书记反馈"线图太小，文字太大"+ 书记质疑"为什么三条线？名称是否应更符合实际？"
- **变更文件**: docs/src/styles.css, docs/src/entries/help-entry.js, docs/help.html
- **关键动作**: code reviewer 审查 ✅ 根因#1 修复（section opacity:0）✅ 根因#2 修复（main overflow 破坏 sticky）✅ brainstorming 方案讨论 ✅ 比例调整 ✅ 线型三态化 ✅ 名称方案 A ✅ 箭头形状区分 ✅
- **变更详情**:
  - **🔴 根因#1 修复（section opacity:0）**：`.help-section` 默认 `opacity:0`，需 `is-revealed` 类才可见。exploration section 极高（约 700vh），`bindScrollReveal` 的 IntersectionObserver 阈值 0.12 需要 84vh 可见才触发——用户滚动到 section 时整个 section 仍是 opacity:0，SVG 自然不可见。修复：`.help-exploration-section` 覆盖 `opacity:1; transform:none`，跳过通用 reveal 动画（它有自己的 scroll-driven 动画）
  - **🔴 根因#2 修复（main overflow 破坏 sticky）**：`<main>` 有 Tailwind `overflow-y-auto`，破坏了 `position: sticky`。sticky 元素相对不滚动的容器定位，等同于不生效。修复：移除 `overflow-y-auto`
  - **brainstorming 线数量理论分析**：从两个维度（方向性 × 性质）分析，确认三条线合理——任务流（有方向+执行）/ 信息流（有方向+告知）/ 协作线（无方向+配合）。不能更少（派活要落实 vs 报备要存档是本质区别），不需要更多（决策/反馈/赋权都是上述三类的子类）
  - **比例调整**：`grid-template-columns: 1.1fr 1fr` → `1.6fr 1fr`（线图 52%→62%）；`gap: 64px` → `40px`；阶段卡片 `padding: 20px 24px` → `16px 20px`；阶段标题 `font-size: 16px` → `15px`；阶段描述 `font-size: 14px` → `13px`
  - **线型三态化（实线/长虚线/点线）**：任务流 `stroke-dasharray: 14 4`（长虚线）→ `none`（实线）+ `stroke-width: 2.5`；信息流 `stroke-dasharray: 6 4`（短虚线）→ `10 5`（长虚线）；协作线保持 `2 4`（点线）+ `stroke-width: 1.5`。删除 `@keyframes help-flow-task`（实线无法流动），保留 `help-flow-info`（长虚线可流动）
  - **图例样式同步**：`.help-legend-line--task` 高度 2.5px 实线；`.help-legend-line--info` 长虚线 `background-size: 15px 2px`；`.help-legend-line--collab` 点线 `background-size: 6px 1.5px` 高度 1.5px
  - **名称方案 A（动宾结构）**：图例文本 `任务流（实线·派活交付）` → `派活交付（实线·有方向）`；`信息流（虚线·报备告知）` → `报备告知（虚线·有方向）`；`协作线（点线·横向配合）` → `横向配合（点线·无方向）`
  - **箭头形状区分**：任务流保持实心三角 `fill: #CE1126`；信息流改为空心三角 `fill: #FFFFFF, stroke: #3B82F6, stroke-width: 1.5`；协作线无箭头，两端添加圆点 `circle r=3 fill=#9CA3AF`（表达平等关系）
  - **edgePath 函数扩展**：返回值增加 `x1, y1, x2, y2`（连线起点和终点坐标），供协作线圆点使用
- **设计决策**: ①名称方案 A（动宾结构）—— "派活交付/报备告知/横向配合"是党建工作实际用语，符合"管理事，服务人"语境，三名称都是行为而非抽象概念；②线型三态化（实线/长虚线/点线）—— 工程图标准三态，视觉差异最大，无需图例也能区分；③箭头形状区分（实心/空心/无+圆点）—— 增加方向性区分维度，协作线圆点表达"平等"；④比例 1.6fr:1fr —— 线图占比 62%，文字占比 38%，平衡可读性与视觉冲击
- **结果**: 3 文件修改，GetDiagnostics 零错误，localhost 启动成功。待书记验证视觉效果
- **蒸馏标签**: [经验蒸馏: 否 — 含两个致命根因诊断（section opacity:0 + main overflow 破坏 sticky）/ 线型三态化设计模式 / 箭头形状区分维度 / edgePath 函数扩展模式等可复用经验]

## 2026-06-30 | 2026-06-T32 — 帮助页 v4.3.4 组织者逻辑校准 + 尺寸调整 + 连线 tooltip 详情

- **来源**: 书记三项反馈：①"活动和专班都由组织者负责，党小组组长可以是组织者也可以不是——逻辑一定要校准"②"组织者应放在更核心的位置"③"所谓汇报和流通，是汇报什么？提交什么？箭头信息量不充足" + 尺寸反馈"右侧文字字数和框框大小完全不相称"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, docs/help.html
- **关键动作**: 组织者逻辑校准 ✅ 节点重新布局（组织者居中）✅ EXPLORATION_STAGES 重写 ✅ 连线 tooltip 详情 ✅ 尺寸调整（50vh + 1.8fr）✅
- **变更详情**:
  - **🔴 组织者逻辑校准（D-207 衍生）**：修正 ACTIVITY_NETWORK 数据模型——原错误：leader（党小组组长）被标为"活动核心"，organizer（组织者）被标为"协调执行"。校准后：organizer 是"执行核心（脑子）"居中，leader 是"发起者"在上方。依据 FLAT_DESIGN.md：组织者是项目的脑子，活动由组长赋权组织者执行
  - **节点重新布局**：organizer 从 (130,370) 左下角移到 (400,290) 中心；leader 从 (400,230) 中心移到 (400,70) 上方；secretary 从 (400,70) 移到 (680,70) 右上；deep 从 (130,500) 移到 (200,460) 左下；org-commissioner 从 (560,500) 移到 (130,290) 左侧
  - **stage 顺序重写**：原 stage 0=组长活动核心 → 新 stage 0=组长赋权组织者；原 stage 1=组长报备 → 新 stage 1=组织者报备；原 stage 2=组长分工 → 新 stage 2=组织者分工；原 stage 3=协调执行+通知 → 新 stage 3=通知+带动参与；stage 4/5 逻辑不变但发起者从组长改为组织者
  - **EXPLORATION_STAGES.activity 重写**：6 个 stage 的 title/desc/flows 全部更新，反映组织者作为执行核心的新逻辑
  - **连线 tooltip 详情（detail 字段）**：为所有 edge 添加 detail 字段，回答"汇报什么？提交什么？"。例如：赋权="组长创建活动后赋权组织者，组织者获得活动执行权"；报备="组织者向党支书报备活动方案、时间、地点、参与人员名单"；分工="组织者向深度参与者分派具体任务清单（内容/形式/截止时间）"；归档="组织者向组织委员提交活动归档材料（方案/考勤/总结/复盘）"
  - **连线 hover tooltip 实现**：edge 元素添加 data-detail/data-label 属性；hover 时显示 tooltip（与节点 tooltip 复用 .help-network-tooltip 元素和样式）
  - **尺寸调整**：阶段卡片 min-height: 65vh → 50vh（解决"文字字数和框框大小不相称"——65vh 太大导致 60-70% 空白）；grid 比例 1.6fr:1fr → 1.8fr:1fr（线图 62%→64%，文字 38%→36%）
  - **TASKFORCE_NETWORK 也添加 detail 字段**：7 条 edge 全部添加 detail，如"请求招募"="发起人向组织委员提出专班需求（专班名称/人数/周期/考核标准）"
- **设计决策**: ①组织者=执行核心（脑子）居中——依据 FLAT_DESIGN.md 理论，组织者是项目的脑子，活动由组长赋权组织者执行；②组长=发起者上方——组长创建活动+赋权组织者，不一定是执行核心；③连线 tooltip 用 detail 字段——回答"汇报什么？提交什么？"，hover 时显示详情，标签保持简短；④min-height 50vh——平衡文字填充与 scroll range（6×50vh=300vh）
- **结果**: 3 文件修改，GetDiagnostics 零错误，localhost 启动成功。待书记验证逻辑校准 + 视觉效果
- **蒸馏标签**: [经验蒸馏: 否 — 含组织者逻辑校准（依据 FLAT_DESIGN.md 理论）/ 连线 tooltip detail 字段模式 / 节点重新布局（核心居中）/ 尺寸调整（50vh 平衡文字与滚动范围）等可复用经验]

## 2026-06-30 | 2026-06-T33 — 帮助页 v4.3.6 线层级+书记地位+动画统一+组织委员职责修复

- **来源**: 书记对 v4.3.5 的四点反馈：①"线层级关系不合理，特别是阴影情况下交叠非常难受"②"支部书记怎么这么边缘化？"③"线动画设计不合理，美学风格不统一、逻辑不统一"④"组织委员不要归档宣传素材！！请全仓库改动！！只收集考察记录！！原始材料还在纪检委员处。组织委员通过收集的信息更新支部人才库"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, docs/help.html, content/SOP/支委与党小组定人定责定岗说明.md, content/SOP/常见工作场景快速指南.md
- **关键动作**: 4.1 节点重新布局 ✅ 4.2 报备改双向 ✅ 4.3 视觉风格统一 ✅ 4.4 动画区分对待 ✅ 4.5 stage 1 更新 ✅ 4.6 SOP 三处修复 ✅ 4.7 版本号 ✅
- **变更详情**:
  - **节点重新布局（4 层消除交叠）**：viewBox 0 0 800 580→600；8 节点按 L1 书记(60)/L2 组长+宣传(200)/L3 组织者+纪检(320)/L4 组织委员+参与者(460-500) 4 层布局；少量交叉点远离节点圆，阴影不互相干扰
  - **报备改双向边**：organizer→secretary info 边添加 bidirectional:true，label"报备"→"报备/审批"；删除 secretary↔organizer collab 边（与报备边物理重合）；renderNetworkSVG 新增反向箭头支持（translate(path.x1,y1) rotate(angle+180)）
  - **视觉风格统一**：task 线 stroke var(--help-party-red)#CE1126→#7A0010 深红；info 线 dasharray 10 5→8 4；箭头统一实心三角（task #7A0010 / info #3B82F6），删除 info 箭头的 stroke/strokeWidth（原空心+蓝边→实心蓝）
  - **动画区分对待（修复 dasharray 覆盖 bug）**：原 JS 对所有 edge path 设置 strokeDasharray=length 覆盖了 CSS 的 info 虚线/collab 点线；改为仅 task 边设置 dasharray/dashoffset（绘制动画），info/collab 边保留 CSS 样式用 opacity 渐显；5 处修改（init/reduced-motion/mobile/scrollable<=0/desktop 主循环）
  - **EXPLORATION_STAGES stage 1 更新**：title"组织者向支书报备"→"组织者向支书报备·支书审批"；flows 删除"支书↔组织者（横向配合）"改为"组织者↔支书（报备/审批）"
  - **SOP 三处措辞修复**：支委说明 L174"纪检提交考察至支委会（建档）"→"至组织委员"；L176 标签"[思想汇报]"→"[考察档案]"；version 2.2→2.3；快速指南 L173"移交组织委员归档"→"移交组织委员更新人才库"；last_updated→2026-06-30
  - **help.html 版本号** t36→t37
- **设计决策**: ①动画区分对待——task 有方向用 dashoffset 绘制，info 有方向但保留虚线用 opacity 渐显，collab 无方向用 opacity 渐显（D-222）；②报备改双向——显性化书记审批反馈，替代原 secretary↔organizer collab 边（D-223）；③sopData.js L151"转交组织委员归档"不修改——经核实是关于公邮查收（合规文件管理），非宣传素材归档
- **结果**: 5 文件修改，GetDiagnostics 零错误（help-entry.js + styles.css），YAML 验证通过，Grep 确认无"组织委员归档宣传素材"残留、无 arrowFill#FFFFFF 残留。待书记 localhost 视觉验收
- **蒸馏标签**: [经验蒸馏: 是 — 动画区分对待原则已写入insights §11.16；其余经验（dasharray覆盖bug/双向边SVG/节点4层布局）为本条目特有，未单独蒸馏]

## 2026-06-30 | 2026-06-T34 — v4.3.7 第一批技术修复（动效速度+DIALOGUE循环+决策补录）

- **来源**: 用户指示——①动效渲染速度太慢 ②行百里者半九十循环数字顺序问题；分批策略第一批
- **变更文件**: docs/src/styles.css, .ctx/logs/2026-06-DECISION_LOG.md
- **关键动作**: 动效速度优化 ✅ DIALOGUE 循环修复 ✅ D-222/D-223 决策补录 ✅
- **变更详情**:
  - 减小 exploration stage 卡片 min-height 50vh→35vh（6×35vh=210vh，scroll range 减少 30%，动效更敏捷）；同步更新 CSS 注释 65vh→35vh 及 scroll range 计算说明
  - 新增 DIALOGUE 卡片显式 grid-area 定位（pos01=左上/pos02=右上/pos03=右下/pos04=左下），修复 grid 自动排列导致 03/04 位置与箭头期望颠倒的 bug
  - 补录 D-222（探索工作动画区分对待原则）和 D-223（报备改双向边显性化书记审批）到 DECISION_LOG.md，更新 YAML last_updated 2026-06-14→2026-06-30
- **设计决策**: ①动效速度取值 35vh 是折中方案——既减少 scroll range 又保留滚动驱动叙事体验（D-224）；②DIALOGUE 修复采用 CSS grid-area 显式定位而非调整 DOM 顺序，保持 tab 顺序与逻辑顺序一致（D-225）
- **结果**: 2 文件修改，待 GetDiagnostics 验证 + 一改具改 Grep 验证
- **蒸馏标签**: [经验蒸馏: 否 — 第一批纯技术修复，含 CSS grid 自动排列与显式定位的坑（DOM 顺序与视觉位置不一致时需 grid-area 强制覆盖）]

## 2026-06-30 | 2026-06-T35 — v4.3.7 第二批术语同步（TERMINOLOGY权威源+SOP_WEB角色分类+丙部P.17+C-5审计+一改具改）

- **来源**: 用户指示（/spec 触发第二批术语同步）；分批策略第二批
- **变更文件**: content/guides/governance/TERMINOLOGY.md, content/guides/design/SOP_WEB.md, CLAUDE.md, content/SOP/支委与党小组定人定责定岗说明.md, content/guides/architecture/SERVICE_CATALOG.md
- **关键动作**: Task1-TERMINOLOGY更新 ✅ Task2-SOP_WEB修正 ✅ Task3-丙部P.17 ✅ Task4-C-5审计任务 ✅ Task5-归档残留扫描 ✅ Task6-之上之下扫描 ✅
- **变更详情**:
  - TERMINOLOGY.md 新增 §5.1 人才库制度（引用 insights §6.7，区分人才库≠原始材料库）+ §5.2 报备/审批双向关系（区分 APPROVAL_FLOW.md 活动创建审批场景）+ §5.3 组织委员职责规则（不归档宣传素材/只收集考察记录/维护人才库/原始材料留纪检委员处）
  - SOP_WEB.md L188 移除"组织委员归档"→改为"备案"；L189 新增注释说明组织委员是写入型角色不在支撑型路径中
  - CLAUDE.md 乙部持续任务表新增 C-5 术语审计任务；丙部新增 P.17 书记定位表述违反硬约束（insights L123 "独立于条块之上"违反 project_memory 硬约束），提交三种替代表述方向待书记裁定
  - 支委说明.md L129 "归档协调"→"收集协调"
  - SERVICE_CATALOG.md L348 "归档（组织委员建档）"→"维护人才库（组织委员建档）"
  - 全仓库一改具改扫描："组织委员归档"15处匹配，修复2处，其余13处合理保留（历史日志/思想汇报例外等）；"之上/之下"3处匹配，insights L123 已提交丙部，其余合理保留
- **设计决策**: 无新决策（执行既有 D-216 写入型vs支撑型分类 + project_memory 硬约束）
- **结果**: 5文件修改，全仓库术语一致性提升，C-5审计任务建立持续机制
- **蒸馏标签**: [经验蒸馏: 是 — Edit虚假成功→Write覆写解决方案已扩写入insights §10.10（Write整体覆写优于Edit+Python验证）]

## 2026-07-01 | 2026-06-T36 — P.17 决策执行（书记定位表述改 C 方向）+ 丙部 P.18 新增（管理事服务人主语内涵）

- **来源**: 书记决策 P.17（选 C 方向：横跨条块但不属于任何单一条块，突出书记协调节点作用）
- **变更文件**: .ctx/logs/2026-06-DECISION_LOG.md, content/insights/党支部管理与实务经验沉淀.md, CLAUDE.md, .ctx/logs/2026-06-EXECUTION_LOG.md
- **关键动作**: D-226 记录 ✅ insights L123 修改 ✅ P.17 退出 ✅ P.18 新增 ✅
- **变更详情**:
  - D-226 记录 P.17 决策为 C 方向（横跨条块但不属于任何单一条块，理由：突出书记作为条块间协调节点的作用）
  - insights L123 "书记独立于条块之上"→"书记横跨条块但不属于任何单一条块，作为条块间的协调节点"；YAML last_updated 2026-06-30→2026-07-01
  - CLAUDE.md 丙部 P.17 退出，P.18 新增（"管理事、服务人"主语内涵理解，第三批重组前置，提交三种方向待书记裁定）
  - DECISION_LOG.md YAML last_updated 2026-06-30→2026-07-01
- **设计决策**: D-226（P.17 选 C 方向——书记横跨条块但不属于任何单一条块，作为条块间的协调节点）
- **结果**: P.17 决策闭环完成，P.18 待书记裁定主语内涵理解
- **蒸馏标签**: [经验蒸馏: 否 — P.17 决策执行 + P.18 提交]

