---
title: "Decision Ledger — 决策历史归档"
type: decision_log
owner: "Org OS Agent 集群"
role: "[人机]"
last_updated: "2026-05-06"
status: active
---

# Decision Ledger — 决策历史

> 本文件收录所有项目级决策记录。决策来源为 EXECUTION_LOG 中的「关键动作」条目，按时间倒序排列。
> ROADMAP.md 仅保留未来待办与进行中项；所有历史决策均归集于此。

---

## 一、2026-05-02 决策记录

| # | 决策 | 来源任务 | 涉及文件 | 结果 |
|---|------|---------|---------|------|
| D-022 | **ROADMAP 结构重组**：从数字编号（§一~§十一）改为字母编号（A~H），规划内容统一归集至 §C，决策日志外置至本文件 | ROADMAP 系统性清理 | ROADMAP.md (162行) | ✅ A-H 层级结构上线 |
| D-023 | **E1 党务管理模块实施**：第 4 个 module-tab「党务管理」+ 四面板架构（纪检/组织/宣传/概览）+ 子 tab 切换 + 合规文件引用渲染 + Mock 数据 | E1 组织建设 | index.html, src/party.js(新建), src/main.js, src/events.js, src/styles.css | ✅ 模块上线 |
| D-024 | **SNAPSHOT 更新策略规范化**：仅大版本里程碑更新（v3→v4），日常变更由 DECISION_LOG/EXECUTION_LOG 承载；SNAPSHOT 从 167 行瘦身至 82 行 | SNAPSHOT 优化 | .ctx/SNAPSHOT.md, .ctx/CONTEXT.md, .ctx/TIMESTAMPS.md, copilot-instructions.md | ✅ 频繁更新问题解决 |
| D-025 | **品牌活动定义修订**：从"静态展示的精品橱窗"重新定义为"持续迭代、逐步完善的动态工作项目"；新增宣讲团+人生回望录案例；评分维度新增"成长性"(20%)；认定流程新增"复盘迭代"第五步 | 品牌活动修订 | BRAND_ACTIVITY.md(合并新建) | ✅ 新定义上线 |
| D-026 | **guides/ 文件结构优化**：7 个旧文件合并为 3 个新文件（BRAND_ACTIVITY.md / SOP_WEB_GUIDE.md / COMMISSIONER_GROUP_INTERACTION.md）；ROLE_SCALABILITY_ASSESSMENT.md 合并入 ROLE_CLASSIFICATION.md §六；guides/ 从 20 文件精简至 15 文件 | 文件优化 | content/guides/ | ✅ 精简完成 |
| D-027 | **条条支委与党小组交互机制设计**：职责边界（条条/块块/交叉区域）+ 短期交互模式（任务对接/信息共享/协同决策）+ 长期数字化工作流 + 冲突解决机制 | 条块交互 | COMMISSIONER_GROUP_INTERACTION.md(新建) | ✅ 设计完成 |
| D-034 | **四项综合任务执行** — T1:侧边栏卡片组件扁平化统一（glass→card-flat, glass-input→input-flat, HTML同步更新8处）；T2:字体排版变量体系建立（:root新增8级字号+3级行高+3级字距变量）；T3:角色权限系统修复（ROLE_TYPES commissioner泛化→3细分org/prop/disc-commissioner, HTML角色选择器1→3按钮, inspector.js filterTasksByManagementRole兼容3细分）；T4:C1.1.7活动管理维度落地（写入按钮+活动类型选择器9选项+赋权面板模态框+管理视图显隐控制+赋权/撤销/成功反馈） | 四项综合任务 | styles.css, index.html, state.js, inspector.js, events.js, constants.js | ✅ 全部完成 |
| D-031 | **工作流系统v2.0重构** | 用户方向调整 | 全文档同步 | ✅ 文档+代码同步就绪 |
| D-030 | **C1.1.3 工作流可视化界面开发**：创建 `renderer.js`（`WorkflowRenderer` 类 — SVG 流程节点图 + 进度条 + 状态标签 + 流转历史面板 + 阻塞警告横幅）；推演工作台新增「工作流可视化」面板（模板选择器 + 模拟阻塞开关 + 刷新按钮）；CSS 新增 323 行 `.workflow-*` 样式体系；集成 `main.js`/`events.js`/`index.js` | C1.1 工作流系统 | src/workflow/renderer.js(新建239行), index.html(新增42行), src/styles.css(+323行), src/main.js, src/events.js, src/workflow/index.js | ✅ 可视化上线 |
| D-029 | **C1.1.1+1.1.2 工作流系统核心实施**：创建通用状态机引擎 `engine.js`（`WorkflowEngine` 类 + `createEngine` 工厂 + `canTransition`/`calcTimeoutStatus` 纯函数 + `EVENT_TYPES` 常量 + 阻塞检测）；创建活动流程定义 `definitions.js`（5套模板：主题党日活动/短期非品牌/短期品牌/长期非品牌/长期品牌，含 `getDefinition()` 索引）；更新 `index.js` 导出新模块 | C1.1 工作流系统 | src/workflow/engine.js(新建237行), src/workflow/definitions.js(新建226行), src/workflow/index.js(更新) | ✅ 引擎+定义就绪 |
| D-028 | **ROADMAP §C1 扩展**：3项核心需求（工作流引擎/品牌活动架构/SOP反馈卡）整合入短期规划，C1 从 3 项扩展至 6 项 18 子任务，工作流系统标记为最高优先级（P0 🔴） | ROADMAP规划 | ROADMAP.md §C1 (18子任务) | ✅ 规划就绪 |
| D-021 | **R4 OA1-OA4 实施**：SA1 动态角色判定（dynamic_role front matter + copilot-instructions 判定逻辑）+ SA2 can-modify 白名单（8类文件权限表） | R4 角色优化 | copilot-instructions.md, state.js, SNAPSHOT.md, TIMESTAMPS.md, ROLE_CLASSIFICATION.md v2.0 | ✅ 双层权限体系上线 |
| D-020 | **R3 全仓角色标记**：86/86 文件写入 [人]/[人机]/[AI] 标记（39 md + 15 code + 1 html） | R3 角色标记 | 全仓库 | ✅ 100% 覆盖 |
| D-019 | **E3 三委组织建设职能设计**：三委权限矩阵（11操作×3角色）+ 四面板架构 + CSS/JS 集成方案 + P0-P3 实施路径 | E3 组织建设 | COMMISSIONER_ORGANIZATION_ROLE.md (新建) | ✅ 设计文档就绪 |
| D-035 | **D4.2 Notice 发布界面**：党务管理模块新增支委/支书专属通知发布表单（title/content/priority/expireDate/targetModule）+ NoticePermission.canPublish 前置校验 + party.js publishNotice 方法 | D4.2 通知发布 | index.html(+42行), src/party.js(+70行), src/service.notice.js(引用) | ✅ 发布界面上线 |
| D-036 | **C1.5 招募→赋权面板直达 + D1.4 主页←→子模块双向联动**：主页招募卡片点击→党务管理+自动打开赋权面板（assign-modal）；三子模块（日历/党务/资料查询）顶部新增「返回主页」链接 + 全局 data-nav 事件委派 | C1.5+D1.4 导航 | src/main.js, index.html(+4处链接) | ✅ 双向联动闭环 |
| D-037 | **全仓文档收束 v5.0**：SNAPSHOT v4→v5 全量更新、TIMESTAMPS 重新统计、DECISION_LOG 追记本轮 3 条决策（D-035/D-036/D-037） | 维护层收束 | SNAPSHOT.md, TIMESTAMPS.md, DECISION_LOG.md, CONTEXT.md | ✅ v5.0 里程碑 |
| D-038 | **§0.2A 双域分化 v6.0**：角色视图矩阵升维为二维（党建台×党务管理）；新增默认信息面板原则（进入模块→全量只读）；全量虚假引用修复（硬编码路径→资料查询模块）；权限矩阵同步至 copilot-instructions v4.0；资料查询 REF_DOCS 扩充至 13 条（含 6 项规章文件） | §0.2A+T19 | ROADMAP.md, src/main.js, src/party.js, index.html, src/references.js, .github/copilot-instructions.md, .ctx/CONTEXT.md | ✅ 双域分化落地 |
| D-018 | **T3a SOP-网页联动诊断**：3份核心SOP展示问题清单（纪检7.3/10、组织5.8/10、宣传6.0/10），17问题+6系统缺陷 | T3a SOP诊断 | SOP_DISPLAY_ISSUES.md (新建) | ✅ 问题清单就绪 |
| D-017 | **T1a 周期性醒机制**：TIMESTAMPS.md 追踪表（12项 W/Y/M/Q）+ copilot-instructions 会话入口检查逻辑 | T1a 周期机制 | TIMESTAMPS.md, copilot-instructions.md | ✅ 醒机制上线 |
| D-016 | **ROADMAP 系统性清理**：§二标完成移除过时子表、EXECUTION_LOG_INDEX 路径修复、CONTEXT 版本号同步 | ROADMAP 清理 | ROADMAP.md, EXECUTION_LOG_INDEX.md, CONTEXT.md | ✅ 零陈旧引用 |
| D-015 | **"常为新"原则规模化应用**：一次性将已完成项从 ROADMAP §八 批量移除并转记决策日志 | T1a+T3a+E3 三联 | ROADMAP.md | ✅ 路线图精简 |
| D-014 | **五项综合任务并行**：CSS 修复(T1) + 日历规划(T2) + 经验蒸馏(T3) + Emoji规范(T4) + 品牌架构(T5) | 五项并发 | styles.css, CALENDAR_DESIGN.md, insights/, EMOJI_POLICY.md, BRAND_ACTIVITY_ARCHITECTURE.md | ✅ 五项全部交付 |
| D-013 | **R2 角色可扩展性评估**：综合评分 8.6/10，4 中等风险瓶颈 + 2 低风险缺口，OA1-OA4+SA1-SA3+MA1-MA3 优化路径 | R2 评估 | ROLE_SCALABILITY_ASSESSMENT.md | ✅ 评估完成 |
| D-012 | **R1 角色定义**：创建 [人]/[人机]/[AI] 三分类体系（职责/权限/协作/存储/读取） | R1 定义 | ROLE_CLASSIFICATION.md (新建) | ✅ 体系建立 |

---

## 二、2026-05-01 ~ 2026-05-02 早期决策记录

| # | 决策 | 来源任务 | 涉及文件 | 结果 |
|---|------|---------|---------|------|
| D-011 | **A1-A12 文件架构迁移**：knowledge→content/SOP, docs→content/guides+insights, 参考资料→content/references, .vibe_context→.ctx, SYSTEM_ROADMAP→ROADMAP | 架构迁移 | 全仓路径更新 | ✅ 新架构落地 |
| D-010 | **C1-C5 AI 上下文同步**：CONTEXT.md 融合入口 + Layer 0/1/2 分层加载 + 旧文件删除(AI_CONTEXT/REVIEW_STATE/旧SNAPSHOT) | 上下文优化 | .ctx/CONTEXT.md, copilot-instructions.md | ✅ 加载路径精简 |
| D-009 | **Phase 1-4 文件架构重整全部完成**：ARCHITECTURE融合(1.1) → README延后(1.2) → DOCUMENTATION_MAP扩展(1.3) → 过时文件清理(2.1/2.3/2.9) → governance/backlog迁移(2.4-2.8) → 版本号统一(3) → 内容更新(4) → README最终定稿(1.2终版) | Phase 1-4 | ARCHITECTURE.md, README.md, DOCUMENTATION_MAP.md 等 | ✅ 重整收官 |
| D-008 | **".vibe_context/" 二次清理**：COMPLETED_TASKS/WATCH_LOG 删除，PENDING/SUSPENDED 整合至 SYSTEM_ROADMAP，FILE_TIMESTAMPS 同步机制建立 | 二次清理 | .vibe_context/ 精简至6文件 | ✅ 收敛完成 |
| D-007 | **SYSTEM_ROADMAP "常为新"重写**：删除所有已完成内容（597→302行），新增钩稽联动规则+分层上下文+最优架构方案 | ROADMAP 重写 | SYSTEM_ROADMAP.md | ✅ 纯未来路线图 |
| D-006 | **Phase 1.1 架构融合**：AI_ENTRYPOINT + ARCHITECTURE + ROADMAP§四 + SSOT_INDEX 四合一 | 架构融合 | ARCHITECTURE.md | ✅ 单一架构说明 |
| D-005 | **Phase 1.3 文档导航中心扩展**：DOCUMENTATION_MAP 从3行扩展至166行全局导航中心（8层级+引用关系图+快速入口+状态标记） | 导航扩展 | docs/DOCUMENTATION_MAP.md | ✅ 导航中心建立 |
| D-004 | **Phase 2.1+2.3 过时文件清理**：删除 AI_ENTRYPOINT.md + scenarios/core_logic/sop_sync/ui_scenario | 文件清理 | 4个文件删除 | ✅ 冗余清除 |
| D-003 | **Phase 2.4-2.8 治理信息迁移**：governance/ 和 backlog/ 迁移至 .vibe_context/ | 目录迁移 | 5个文件迁移 | ✅ 统一收敛 |
| D-002 | **Phase 2.9 meta_audit.md 评估删除**：逐段评估后判定整文件过时 | 审计删除 | meta_audit.md | ✅ 已删除 |
| D-001 | **Phase 3 版本号与引用统一**：README 去版本号改日期戳 + 全仓引用修正 | 引用统一 | README.md, ARCHITECTURE.md 等 | ✅ 零断链 |

---

## 三、悬置议题

| # | 议题 | 状态 | 锁定者 | 备注 |
|---|------|------|--------|------|
| H-1 | E.1 品牌活动与非品牌活动发起方式 — 主题党日活动场景增加两种路径 | ⏸️ Pending | 书记 | 需书记明确解锁 |
| H-2 | 党小组工作手册（块块组长专用）尚未建设 | 🔒 Locked | 书记 | 本轮先通过SOP规定块块职责 |

---

## 四、统计摘要

| 指标 | 数值 |
|------|------|
| 总决策数 | 83 条 |
| 2026-05-06 | 16 条 |
| 2026-05-05 | 38 条 |
| 2026-05-04 | 3 条 |
| 2026-05-03 | 19 条 |
| 2026-05-01 ~ 早期 | 10 条 |
| 悬置议题 | 2 条 |
| 已解锁待处理 | 1 条（H-1） |
| 书记锁定 | 1 条（H-2） |

### D-039 | 字体闪烁修复 | 2026-05-05
**问题**：页面加载时出现字体闪烁——先渲染 fallback 字体（STSong/SimSun），Google Fonts 加载完成后跳变为 Noto Serif SC。
**根因**：`.font-title-cn` 的 font-family 列表中包含远程字体 `Noto Serif SC`，加载延迟导致两次渲染。
**决策**：`.font-title-cn` 仅依赖本地字体（STZhongsong → 华文中宋 → STSong → SimSun → PingFang SC），移除 Noto Serif SC。同时移除 `fonts-not-loaded` / `fonts-loaded` 类切换机制。
**影响**：标题字体不再有加载闪烁，但无华文中宋的设备将使用宋体渲染。

### D-040 | 侧边栏统一 overlay 模式 | 2026-05-05
**问题**：桌面端侧边栏展开时挤压主内容区（margin-left: 260px），用户明确要求改为 overlay 弹出模式。
**决策**：移除 `.sidebar-main-content` 的 `margin-left` 挤压逻辑，侧边栏改为纯 fixed overlay。点击汉堡按钮弹出，点击 overlay 或角色卡片后关闭。
**影响**：所有页面（index / workspace / party / search / archive / about）侧边栏行为统一。

### D-041 | 活动分类多选 | 2026-05-05
**问题**：学习活动和会议活动往往同时发生，参访和座谈也常同时，单选无法表达。
**决策**：活动形式从 `<select>` 单选改为 checkbox 多选（学习/会议/参访/座谈/共建），选中值用 `+` 连接存储。
**影响**：workspace.html 表单、workspace-entry.js 写入逻辑。

### D-042 | 主页布局 2+1 排布 | 2026-05-05
**问题**：用户明确要求左上通知、右上招募、下方日历的 2+1 排布，而非三等分。
**决策**：`grid-cols-2`（通知+招募）+ 独立日历卡片。删除副标题 p 标签。h2 字号从 text-xl 提升到 text-2xl。
**影响**：index.html 主内容区布局。

### D-043 | 权限模型重构：视图=只读+写入分离 | 2026-05-05
**问题**：原设计中角色视图=写入权限，导致普通党员无法查看管理者视图（监督+学习管理技巧的需求被忽视）。
**决策**：所有角色都可以查看任何视图，但只有授权角色可以写入。视图切换只影响"看到什么"和"能否编辑"，不影响"能否查看"。
**原则**：查看权 > 写入权。任何党员都可以切换到任何身份视图进行只读浏览。
**影响**：workspace-entry.js 的 WRITE_ROLES 集合仅控制写入，不控制视图访问。

### D-044 | 条条支委不再自动跳转党务管理 | 2026-05-05
**问题**：点击"条条支委"角色卡片自动跳转到党务管理页面，但条条支委在党建工作台有自己的分管领域（专班统筹等）。
**决策**：条条支委在党建工作台显示自己的职能面板（三委员卡片+只读日历），不再自动跳转。面板中提供"党务管理 →"链接供主动跳转。
**影响**：sidebar.js 移除 commissioner-group 跳转逻辑；workspace-entry.js 新增 _renderCommissionerPanel()。

### D-045 | 默认信息面板移到 header 右上角 | 2026-05-05
**问题**：默认信息面板（calendar-role-header）占据主内容区空间，且选定视图后无法回到默认状态。
**决策**：header 右上角添加"默认视图"按钮，点击后重置角色选择（role=null），回到全量只读信息面板。角色 header 仅在选定角色后显示。
**影响**：header.js 新增 btn-reset-view 按钮；workspace-entry.js 中 role=null 时隐藏 calendar-role-header。

### D-046 | 侧边栏角色卡片描述精简 | 2026-05-05
**问题**：角色卡片描述过长（如"管辖活动总览 · 承办写入"），用户要求精简。
**决策**：采用用户指定表述——党小组组长：党小组活动统筹；条条支委：组织/宣传/纪检；活动组织者：策划执行督办；深度参与者：承担具体分工；党支部书记：组织统筹决策；组织委员：党员发展；宣传委员：宣传档案；纪检委员：考勤考察。同时移除"身份视图"section title。
**影响**：sidebar.js ROLE_CARDS 描述更新，移除 sidebar-section-title。

### D-047 | Commission tab DOM 优先检测 | 2026-05-05
**问题**：党务管理页面点击 commission tab（概览/组织委员/宣传委员/纪检委员/党支书）后始终展示默认概览，因为 `getActiveCommissioner()` 依赖 `getAppState().selectedRole`，而 tab 点击不写入 state。
**根因**：全局 state 与 DOM 实际状态脱节。renderCommissionerPanel() 调用 getActiveCommissioner() → 读 state → 永远返回 'default'。
**决策**：getActiveCommissioner() 改为 DOM 优先：先检查 `.commissioner-tab[data-commissioner].active` 的 `data-commissioner` 值，命中即返回；未命中才 fallback 到 state。
**原则**：`DOM优先 → state兜底` — DOM 是"事实"，state 是"意图"，事实优于意图。
**影响**：party.js getActiveCommissioner() 方法 +3 行。

### D-048 | h2 标题移至卡片外部 | 2026-05-05
**问题**：全视图的 h2 标题均被包裹在 `div.card` 内部，视觉位置"中不溜"。
**决策**：页面级 h2 移至卡片上方作为统领元素，卡片仅承载操作/数据。字号统一 `text-lg` → `text-xl`。
**影响**：workspace.html（党建工作台）/ party.html（党务管理）/ search.html（参考资料）/ archive.html（归档库）4 个 HTML 文件。

### D-049 | 意见反馈独立子页面 | 2026-05-05
**问题**：header "意见反馈"链接指向 search.html，且无实际反馈功能。用户要求将其做成独立子页面，集成 SOP 反馈卡内容。
**决策**：
- 新建 `feedback.html` — 表单页（Scope radio × Pain Point input + textarea × Proposed Fix textarea + 提交人选填 + 近期反馈列表）
- 新建 `src/service.feedback.js` — FeedbackStore（localStorage 持久化，CRUD + countByStatus + getPending）
- 新建 `src/feedback-entry.js` — 页面入口，提交/清空/renderRecentFeedback
- header.js `意见反馈` 链接 search.html → feedback.html
- sidebar.js 新增 feedback 导航项（聊天气泡 SVG）
- party.html panel-secretary 新增「意见反馈数据集」卡片（待处理/处理中/已处理统计 + 待处理列表 + 跳转链接）
- party.js 导入 FeedbackStore，refreshSecretaryAggregateView 新增 _refreshFeedbackData()，移除旧的 sec-btn-feedback 事件
**影响**：+3 新文件，修改 5 个已有文件。

### D-050 | 文档组织更新（ROADMAP + insights） | 2026-05-05
**问题**：用户要求整理 ROADMAP、guides、insights，保持 ROADMAP "常为新"、guides 作为持久设计思路、insights 同时沉淀设计理念。
**决策**：
- ROADMAP.md: 更新 last_updated → 2026-05-05；§十 新增 T25-1~T25-6 六项任务及状态 + T25 成果摘要；下一步中心工作调整
- insights「党支部管理与实务经验沉淀」: v5.0 → v6.0（milestone 更新）；新增 v8.0 经验蒸馏（4 项：DOM优先检测 / 标题统领卡片 / 反馈系统自治 / 侧边栏全局导航）
- DECISION_LOG.md: 新增 D-047~D-050 四条决策记录
**影响**：ROADMAP.md, insights 文件, DECISION_LOG.md

### D-051 | 赋权系统 Mock + 视图模式（管理/观摩）| 2026-05-05
**问题**：用户指出当前"点角色卡即进入管理视图"的逻辑错误——真正有写入权限的只有被特定人赋权后的角色。需要引入「管理视图」和「观摩视图」的选择机制。
**决策**：
- 新建 `src/service.auth.js` — AuthStore（localStorage Mock 赋权记录：secretary 赋权支委，leader 赋权 organizer/deep/commissioner-group）+ ViewModeStore（sessionStorage 视图模式）
- 权限链：secretary → org-commissioner / prop-commissioner / disc-commissioner / leader；leader → organizer / deep / commissioner-group
- ViewModeStore.getMode(module) → 'manage' | 'observe'；canManage() 判断赋权状态
- 当前所有角色均已 Mock 赋权（对接用户数据库后台后替换真实鉴权）
**原则**："选择身份"不等于"获得写入权限"——身份是你是谁，权限是谁给你了。两者分离。
**影响**：+1 新文件 service.auth.js

### D-052 | header 重构 — 撤 subtitle + action-btn，换视图模式切换 | 2026-05-05
**问题**：header 右上角的 `意见反馈` 和 `默认视图` action-btn 属于冗余入口（反馈已有独立页面，默认视图逻辑归入 sidebar）。`header-subtitle` div（"党建工作台"/"党务管理"/"归档库"）与 h2 标题重复。
**决策**：
- 移除 header-action-btn 全部渲染
- 移除 header-subtitle 渲染
- header-actions 区域改为 `view-mode-switcher`：显示当前角色名 + 视图模式 badge（管理/观摩）+ 下拉箭头
- 点击 switcher 切换 manage ↔ observe，派发 `view:mode-change` 事件
- hamburger 和 overlay 事件绑定内聚到 renderHeader() 中
**影响**：header.js 完全重写（-40行），styles.css 移除 .header-subtitle 样式块 + 新增 .view-mode-switcher 样式

### D-053 | sidebar 改造 — 角色卡片点击 → 视图模式选择器 | 2026-05-05
**问题**：旧逻辑点击角色卡直接 dispatch `sidebar:role-select` 进入管理视图，无区分。
**决策**：
- 点击角色卡 → 弹出居中 Modal（view-mode-picker）→ 两个按钮：【观摩视图】（🔍 只读浏览）和【管理视图】（⚙️ 编辑写入）
- 未赋权角色「管理视图」按钮 disabled + 灰色 + 下方提示"需党支部书记或党小组组长赋权后解锁"
- 选择后：commitMode() → 保存 role + mode → dispatch `sidebar:role-select`（含 mode）→ 关闭 sidebar → 更新 header badge
- `sidebar:role-restore` 事件同时传递 mode
**影响**：sidebar.js 完全重写（+60行）

### D-054 | index.html 硬编码 → 共享组件替换 | 2026-05-05
**问题**：主页使用硬编码 sidebar 和 header，缺少 feedback 导航项。
**决策**：index.html 移除硬编码的 `<header id="app-header">...</header>` 和 `<aside id="sidebar-main">...</aside>`，替换为空容器 `<header id="app-header">` + `<aside id="app-sidebar">`。main.js 在顶部调用 renderSidebar('dashboard') + renderHeader('dashboard')。移除旧的 hamburger/overlay 手动绑定（现在由 renderHeader 内聚处理）。移除对已不存在的 status-pill 元素的引用。
**影响**：index.html -48行，main.js +5行

### D-055 | About 页面重写为分章节系统说明书 | 2026-05-05
**问题**：about.html 内容过于简略，缺少致谢和责任自负声明。
**决策**：一章系统概述 + 二章核心理论 + 三章页面索引 + 四章权限体系 + 五章技术栈 + 致谢 + 责任自负声明。采用 amber 色警示卡片。
**影响**：about.html 完全重写（76→160行）

### D-056 | 赋权链修正 — 条条支委天然权限 | 2026-05-05
**问题**：旧 auth 逻辑要求条条支委（组织/宣传/纪检委员）也需 secretary 赋权，与制度设计不符。
**根因**：条条支委由党委直接任命，其管理权限是制度赋予的，不是某个角色"授予"的。
**决策**：
- canManage() 中 partyRoles（org-commissioner / prop-commissioner / disc-commissioner）直接返回 true
- 赋权链简化为：leader → organizer, deep（仅活动组织者和深度参与者需赋权）
- commissioner-group 从 auth records 中移除（不再需要赋权记录）
**原则**：制度赋予的权限 ≠ 可被授予的权限。条条支委的权限是"身份自带"，不是"角色转授"。
**影响**：service.auth.js _defaultAuth(), canManage() 精简

### D-057 | 术语重命名 — 观摩→只读模式, 管理→管理模式 | 2026-05-05
**问题**："观摩视图"有居高临下的审视意味，不符合扁平化协作精神。
**决策**：全量替换标签文本 — 「观摩视图」→「只读模式」，「管理视图」→「管理模式」。内部变量名不变（observe/manage），仅 UI 标签变更。
**影响**：header.js, sidebar.js, workspace-entry.js, about.html 共 4 个文件的文本标签

### D-058 | view-mode-switcher 样式重构 | 2026-05-05
**问题**：旧 switcher 显示角色名（如 "secretary"）+ 气泡 badge 样式，不适合 header 顶栏的正式风格。
**决策**：
- 移除角色名 span（roleDisplay）
- 样式改为纯色矩形方框（管理模式 #CE1126 / 只读模式 #4B5563），白色文字填充
- 仅在 workspace 和 party 页面渲染（MODULE_VIEW_MODES 白名单）
**影响**：header.js 重写，styles.css 精简

### D-059 | 删除面板中的视图代理冗余 | 2026-05-05
**问题**：panel-secretary 中「视图代理」卡片（sec-proxy-btn 按钮组）与新的 管理模式/只读模式 功能重叠。党支书在管理模式中已天然拥有切换任意视角的权利，不需要单独的代理入口。
**决策**：移除 party.html 中「视图代理」卡片 HTML + party.js 中 _initSecretaryProxyView() 方法 + _secProxyBound 属性。同时移除 workspace.html 中 secretary-dashboard 的 proxy select 下拉菜单。
**原则**：一个概念只在一个地方表达。管理模式自带视角切换能力，不再需要独立的"代理视图"入口。
**影响**：party.html -1 card, party.js -22行, workspace.html -11行（移除 select 下拉）

### D-060 | secretary-dashboard 角色色对齐 | 2026-05-05
**问题**：secretary-dashboard 使用 `border-red-600` (`#DC2626`) 和 `text-red-700/800` 等 Tailwind 红色，与党的标准红 `#CE1126` / `#7A0010` 不一致。
**决策**：统一使用 party 色板 — border-left-color: #CE1126, title color: #7A0010, button bg: #CE1126, stats 数字色: #CE1126。移除 `card-flat` stats 改为 `bg-red-50/50 rounded-lg` 柔化。移除冗余的 proxy select 下拉。
**影响**：workspace.html secretary-dashboard 区域

### D-061 | 删除 root src/ 冗余目录 | 2026-05-05
**问题**：项目存在两套 src（docs/src/ 和 src/），后者为前者的同步副本，维护成本和混淆风险均高。
**决策**：果断删除 root src/ 目录。docs/ 是唯一部署目录，docs/src/ 是唯一源码目录。HTML 文件均在 docs/ 下，`./src/` 引用均正确解析到 `docs/src/`。
**原则**：一改则全改 → 既然决定精简，就一次性干到底。
**影响**：删除 src/ 目录（含所有文件）

### D-062 | guides 中 Mock vs 真实鉴权辨析 | 2026-05-05
**问题**：系统大量使用 localStorage Mock 模拟赋权和用户身份，但文档中缺乏清晰说明哪些是 Mock、哪些是真实能力。
**决策**：在 SOP_WEB_GUIDE.md 新增 §F（Mock 数据 vs 真实鉴权），包含 F.1~F.4 四个子节。
**影响**：SOP_WEB_GUIDE.md +52行

### D-063 | 赋权链全量重写（对齐 ROADMAP §0.2A+§0.3） | 2026-05-05
**问题**：前两轮的赋权链完全错误——条条支委被误认为需要 secretary 赋权，宣传/纪检被误认为有赋权能力，organizer/deep 的赋权人也不完整。
**根因**：未严格对齐 ROADMAP 中已有的明确规范。
**正确赋权链**：
- 党支书（secretary）→ 党小组组长 / 条条支委（最高赋权力量）
- 党小组组长（leader）→ 活动组织者 / 深度参与者（活动域赋权）
- 组织委员（org-commissioner）→ 活动组织者 / 深度参与者 + 专班成员（专班域赋权）
- 宣传委员 / 纪检委员 → 无赋权能力（职能性质决定，与内控要求相关）
**影响**：service.auth.js 完全重写，新增 canWriteActivity / canRecruitTaskForce / canAuthorize 三个精确判定方法

### D-064 | 工作台面板路由重写 — 按角色差异而非全员写活动 | 2026-05-05
**问题**：前两轮的 workspace-entry.js 将"管理模式"错误等同于"所有人都看到同一个活动写入面板"。条条支委、活动组织者、深度参与者切换到管理模式后均跳出活动写入表单——完全不合理。
**决策**：引入 `_routeRolePanel()` 面板路由：
- secretary/leader + 管理模式 → 活动写入面板（write-only 可见）
- org-commissioner + 管理模式 → 专班招募面板（当前复用 write-only，未来专属化）
- commissioner-group(条条支委) + 管理模式 → 三委员重定向卡片（一次性创建，不重复）
- organizer/deep + 管理模式 → 保持日历视图（任务查看，无写入权限）
- 所有角色 + 只读模式 → 全量日历视图
**原则**：权限是角色×模块×模式的笛卡尔积——不是"有写入还是没写入"的二元开关。
**影响**：workspace-entry.js 重写（_routeRolePanel + _showWritePanel + _showTaskForcePanel + _showCommissionerRedirect + _showCalendar）

### D-065 | Bug修复 — commissioner-redirect div 重复创建 | 2026-05-05
**根因**：旧代码 `_renderCommissionerPanel` 中 `panel.querySelector('.commissioner-redirect')` 在 `calendar-create-panel` 内搜索，但 div 实际被 `calGrid.parentNode.insertBefore(redirect, calGrid)` 插入到 panel 外部。每次渲染都找不到已有 div，导致重复创建。
**修复**：改为 `panel.appendChild(redirect)`，确保 div 在 panel 内部；querySelector 可正确命中。同时 `_routeRolePanel` 在隐藏阶段统一处理 `.commissioner-redirect` 的 visibility。
**影响**：workspace-entry.js _showCommissionerRedirect 方法

### D-066 | ★必填标记视觉柔和化 | 2026-05-05
**问题**：用户反馈 label 中的红色 ★ 必填标记过于突兀，与页面整体扁平设计风格不协调。
**决策**：`.required-mark` 颜色从 `var(--primary-700)` → `var(--neutral-400)`，字号从 `0.65rem` → `0.55rem`，margin-left 从 `2px` → `1px`。
**影响**：styles.css 单处修改

### D-067 | 关于图标从 info circle 改为 question mark circle | 2026-05-05
**问题**：侧边栏"关于"使用 info(i) circle SVG，用户要求改为圆圈内问号。
**决策**：替换 SVG path — 旧 `<line x1=12 y1=16 x2=12 y2=12/><line x1=12 y1=8 x2=12.01 y2=8/>` → 新 `<path d="M9.09 9a3..."/><line x1=12 y1=17 x2=12.01 y2=17/>`
**影响**：sidebar.js 单处修改

### D-068 | canInitiateTaskForce 权限判定 | 2026-05-06
**问题**：用户明确指出"党小组组长、条条支委、书记都可以在他们的管理模式下发起专班。由组织委员招募统筹"，但 canRecruitTaskForce 只覆盖了招募权限，缺少发起权限判定。
**决策**：新增 `ViewModeStore.canInitiateTaskForce(role)` — secretary / leader / org-commissioner / prop-commissioner / disc-commissioner 均可发起专班。招募（canRecruitTaskForce）仅限 secretary / org-commissioner。发起≠招募——发起是提出需求，招募是统筹执行。
**影响**：service.auth.js +8行

### D-069 | 条条支委看板视图替代日历 | 2026-05-06
**问题**：用户严厉指出"所有的视图好像都离不开日历视图。这是极大的错误！！乃至于日历视图的那些残留深刻影响着页面排布！！"宣传委员和纪检委员在党建维度服务于活动和专班，不需要日历视图（日历是提醒参与者何时何地参会用的）。
**决策**：
- 三条条支委（组织/宣传/纪检）在管理模式中展示**任务看板**而非日历
- 新增 `#commissioner-kanban-panel`（三列：待启动/进行中/已完成），含 Mock 任务数据
- `_showCommissionerKanban(role)` 按角色填充对应域的任务卡片
- 每个 commissioner 看板顶部有「发起专班」按钮（canInitiateTaskForce）
- **日历视图仅**在以下情况展示：(a) 只读模式全员；(b) 管理模式仅 organizer/deep（需要知道何时何地参会）
**原则**：日历=参与者工具；看板=管理者工具。两者不可混淆。
**影响**：workspace.html +22行（kanban panel HTML），workspace-entry.js 全面重写（+112行），styles.css +25行（kanban 样式）

### D-070 | 日历视图范围限定 | 2026-05-06
**问题**：_routeRolePanel() 中所有非 writeRoles 角色在管理模式都 fallthrough 到 _showCalendar()，包括条条支委（org/prop/disc-commissioner）。commissioner-group 的三种角色也在显示日历。
**决策**：
- `_routeRolePanel()` 显式路由三种管理模式：
  - writeRoles (secretary/leader) → writePanel + calendar（既要写活动也要看日历）
  - commissionerRoles (org/prop/disc-commissioner) → commissionerKanban（只看看板）
  - compositeRoles (commissioner-group) → commissionerRedirect（选具体支委）
  - organizer/deep → calendar（看何时何地参会）
- 日历 section 用 `#calendar-view-section` ID 包裹，统一 show/hide
- `_showCalendar()` 统一显示 calSection + renderByActivities + renderInspector
**影响**：workspace.html（grid 加 id），workspace-entry.js（_routeRolePanel + _showCalendar 重写）

### D-071 | party.html 移除专班管理 — 归位至党建 | 2026-05-06
**问题**：用户明确指出"把专班管理放在了党务工作中！我不理解！"专班属于党建工作（创新探索），被错误放置在党务管理（合规运行）的 组织委员面板中。
**决策**：
- party.html panel-organizer 移除 `data-subtab="taskforce-mgmt"` tab
- 移除 taskforce-mgmt subtab content div
- 移除 `org-stat-taskforces` 统计指标
- 移除 "党建工作域 -> 专班统筹" 描述文本
- 标题「党务管理 · 专班管理(党建) + 党员发展(党务)」→「组织委员 · 党员发展（党务）」
- 「追踪看板」设为组织委员默认 active tab
- 专班功能完全归位于党建工作台（workspace.html 的 kanban 面板）
**原则**：党建的事在党建台做，党务的事在党务台做。专班是党建创新工具，不是党务合规流程。
**影响**：party.html -15行（panel-organizer 区域精简）

### D-072 | About 排版重写 — 仿宋+加宽+行距+致谢段落化 | 2026-05-06
**问题**：用户批评 about 页面 "card可以再宽一点！字体用仿宋GB2312。行间距可以宽一点！致谢部分的排版更是没有什么诚意！完全可以对重要的人事物加粗处理！写成完整段落就行！有时候没有无序列表或者有序列表的地方，一句话一段怪怪的！"
**决策**：
- Container: `max-w-3xl` → `max-w-4xl`（+33%宽度）
- Font: 新增 `fangsong` 字体系列（FangSong_GB2312 → FangSong → 仿宋_GB2312 → 仿宋 → STFangsong → fallback serif）
- Line-height: `leading-relaxed` → `leading-loose`（行距显著加宽）
- 致谢: 从 `<br>` 断行的机械清单 → 完整流畅段落（首行缩进2em），重要人物/贡献 `<strong>` 加粗
- 每张卡片 padding 从 `p-6` → `p-8`，标题从 `text-base` → `text-lg`，间距 mb-4 → mb-5
- 理论章节 2.2 条块二元增加 "宣传/纪检服务于活动和专班" 说明
- 权限表增加 "条条支委在管理模式的视图为任务看板而非日历" 注释
**影响**：about.html 全面重写排版（+fangsong fontFamily 配置，容器/字体/行距全局升级，致谢 9 段→1 个完整段落）

### D-073 | 关于页面字体：仿宋GB2312→方正小标宋简体 | 2026-05-06
**问题**：用户反馈"仿宋GB2312不好看，请全面清除！改用方正小标宋简体！！"
**决策**：
- Tailwind fontFamily: 移除 `fangsong`，新增 `xbs`（FZXiaoBiaoSong-B05S → 方正小标宋简体 → STZhongsong → 华文中宋 → Noto Serif SC → SimSun）
- 全局替换 `font-fangsong` → `font-xbs`（共 11 处）
- 方正小标宋简体系严肃公文常用字体，更契合支部管理系统的正式定位
**影响**：about.html（fontFamily 配置 + 11 处 class 替换）

### D-074 | 侧边栏·header mode 去重叠 | 2026-05-06
**问题**：用户指出"侧边栏的选择模式和右上角的选择模式并不等价。这里面一定有一些不合理的重叠。"
**分析**：sidebar 的 `_showViewModePicker` modal 和 header 的 `view:mode-change` 是两个独立控制 mode 的入口。sidebar 点击角色后弹出 modal 选模式，header 点击 switcher 切换模式，两者互相不知道对方的状态变化——当 sidebar 设置 mode 后会覆盖 header 的 badge，但 header 点击后又覆盖 sidebar 的逻辑。
**决策**：
- **header 成为 mode 的唯一主控入口** — view-mode-switcher 是 mode 切换的唯一 UI
- sidebar 角色卡片点击 → 不再弹出 mode picker modal，直接选择角色并使用当前 ViewModeStore.getMode(module) 作为 mode
- 若角色无管理权限（如 organizer 未赋权）→ sidebar 自动将 mode 设为 'observe'
- sidebar 不再有 `_showViewModePicker` 和 `_commitMode` 函数
- sidebar 不再直接更新 header 的 badge/color
- header 新增 `_bindSidebarSync` — 监听 `sidebar:role-select`，自动同步 badge 和 ViewModeStore
- mode 控制权 100% 归 header，sidebar 只是角色选择器
**影响**：sidebar.js（-75 行，移除 picker+modal 逻辑），header.js（+20 行 `_bindSidebarSync`），workspace-entry.js（sidebar:role-select listener 已适配）

### D-075 | 组织委员专班发布渠道 | 2026-05-06
**问题**：用户指出"组织委员没有发布组建专班的说明的渠道啊。只有一个发布的案件，这算什么？"此前组织委员看板只有一个 toast 按钮，无实质发布功能。
**决策**：
- 组织委员看板新增"发布招募"按钮 → 展开 `#tf-publish-form` 表单
- 表单字段：专班名称、所需人数、所需技能、存续周期、专班说明
- 确认发布 → toast 通知（Mock）、关闭表单
- 表单可折叠（✕ 按钮收起），不影响看板布局
**影响**：workspace.html（+17行 publish form HTML），workspace-entry.js（`_bindTfPublish` +20行）

### D-076 | 宣传/纪检：活动与专班混合视图 | 2026-05-06
**问题**：用户明确指出"宣传和纪检在党建领域其实都是围绕着活动和专班在工作，所以要有一个活动和专班视图。选中具体的专班或者活动后，可以看到更详情的内容，没有选中就是关于已完成、进行中、待启动的信息！"
**决策**：
- 宣传委员和纪检委员在党建工作台的管理视图从通用"任务看板"改为"活动与专班视图"
- 看板卡片区分 `type`（活动/专班），用 domain tag 着色
- 点击任意卡片 → 在 `#ca-detail-panel` 展开子任务详情
- 子任务分为"进行中"（未完成）和"已完成"两组，已完成子任务灰显+删除线+50%不透明度（但不消失）
- 收起按钮关闭详情面板
- 宣传委员显示蓝色调，纪检委员显示琥珀色调
**影响**：workspace.html（+comm-activity-view 区域），workspace-entry.js（_showCommActivityView + _renderCaCol + _bindCaDetail +115行）

### D-077 | 看板去已完成列 · 完成后归档 | 2026-05-06
**问题**：用户强调"活动或专班要是全部完成就可以归档了；不需要有已完成活动或专班的看板。而具体活动或专班下的子任务。只要完成了，虽然不消失，但也就可以放在一边了！"
**决策**：
- 看板从三列（待启动/进行中/已完成）改为两列（待启动/进行中）
- 顶层活动/专班全部完成后 → 不在看板中保留，走归档流程
- 子任务完成后 → 保持可见，但样式退化为：灰显文字 + 删除线 + opacity:0.5 + 绿色对勾标记，沉到子任务列表底部
- 这体现了"完成不放飞，但不下沉视野"的设计精神
**影响**：workspace.html（-已完成列 HTML），workspace-entry.js（所有 render 函数从 3 列→2 列，详情展开的子任务分组 logic）

### D-078 | 关于页面：方正小标宋→华文中宋 | 2026-05-06
**问题**：用户反馈"请抛弃方正小标宋简体，改用华文中宋！"
**决策**：Tailwind fontFamily 移除 `xbs` 系列，全页 `font-xbs` → `font-title`（font-title 的首选字体 STZhongsong 即华文中宋 CSS 名）。华文中宋已存在于现有 font-title 栈中，无需新增字体系列配置。
**影响**：about.html（-fontFamily xbs 行，11 处 class 替换）

### D-079 | 活动写入表单补地点字段 | 2026-05-06
**问题**：用户指出"党建工作台写入活动，目前格式相对不统一。只有时间，还没有地点！"
**决策**：
- Row 1 在日期和场景之间插入「活动地点」input（id: location-input-cal）
- 写入按钮校验新增地点必填："请填写必填项：日期、地点、场景、名称"
- ActivityRecord 新增 `location` 字段
- 标题输入增加 .trim() 防空白
**影响**：workspace.html（+4行 location input），workspace-entry.js（+4行 location read/write/validate）

### D-080 | 长期活动/系列活动模型设计 | 2026-05-06
**问题**：用户提问"如果是长期活动，应该怎么写入？是算作专班还是别的？"
**答案**：
- **长期活动 ≠ 专班** — 两者是不同维度
- 长期活动 = **系列活动**（时间维度，recurrence pattern）: 由党小组组长/书记创建
- 短期活动 = 一次性事件
- 专班 = **人员组织**（人的维度，team structure）: 由组织委员招募统筹
- 三者关系：系列活动展开为多个短期子活动，专班为这些子活动提供功能性支持（宣传/纪检）
**决策**：
- 新增 `SeriesRecord` 数据模型 B1.4（含 recurrenceRule: frequency×interval×startDate×endDate）
- 系列活动展开后生成子 ActivityRecord
- 全部子活动完成 → series.archived = true → 归档（不在看板中保留）
- 当前 duration: 'short'|'long' 字段保留，'long' 待 Q3 弹出 recurrenceRule 配置面板
**影响**：ROADMAP.md（+52行 B1.4 模型设计 + 三者关系表 + 数据流图）

### D-081 | SOP_WEB_GUIDE 全面重写（v4.0） | 2026-05-06
**问题**：SOP_WEB_GUIDE.md 停留在 T25 之前的旧架构认知中——引用单文件架构、无看板视图、无 Mode 统一、无日历限定、无系列活动模型。
**决策**：
- 全面重写为 v4.0（"设计思路最先进最完整体现"）
- 新增 §B.1 MPA 多页面架构（7 页完整清单）
- 新增 §B.2 管理模式/只读模式架构（Header 为 mode 唯一主控、Sidebar 为纯角色选择器）
- 新增 §B.3 三委员看板视图体系（专班协调视图 / 活动与专班视图 + 路由表）
- 新增 §B.4 日历视图范围限定（参与者工具 vs 管理者工具）
- 新增 §B.5 赋权链（完整 4 函数接口 + 树形图）
- 新增 §B.6 数据模型全家福（含 SeriesRecord B1.4）
- 全部 §D 展示问题清单更新（新增 J-05/Z-03/X-03 三委员党建域缺失问题）
**影响**：content/guides/SOP_WEB_GUIDE.md（577 行 → v4.0 完整重写）

### D-082 | Insights 经验沉淀 v7.0 — 三委员差异化视图经验 | 2026-05-06
**问题**：Insights 文件停留在 v6.0（T25 经验），缺少 T26-T29 四轮的核心经验。
**决策**：
- 版本升至 v7.0，新增 8 条 v9.0 经验（共 4,100 字）
- 经验 1：管理模式与只读模式的彻底分离（"身份 ≠ 权限"）
- 经验 2：日历 = 参与者工具，看板 = 管理者工具（打破日历作为"默认视图"的惯性）
- 经验 3：看板的两列哲学——完成不放飞，但不下沉
- 经验 4：条条支委的自然分工——按对象维度区分（事·笔杆子 / 人·枢纽 / 事+人·盾牌）
- 经验 5：赋权链的教训——先看 ROADMAP，再写代码
- 经验 6：推广"同一概念只在一个地方表达"——删除冗余视图代理
- 经验 7：表单必有地点字段
- 经验 8：长期活动的本质——系列活动 ≠ 专班
**影响**：content/insights/党支部管理与实务经验沉淀.md（v6.0 → v7.0）

### D-083 | 三委员 SOP 全面精简重写 | 2026-05-06
**问题**：三份 SOP 存在严重冗余和过时——组织 695 行、宣传 674 行、纪检 409 行。缺少党建域视图说明。用户要求"不要管得过宽压力过大，也不要管得太少。每一项活动只挑选最重要缺少不行的信息流、任务流以及验收成果即可！"
**决策**：
- **组织委员 SOP** v3.0：695→172 行。专班协调视图升至最高优先级，强调发起≠招募，数据同源提醒。剔除冗长党员发展子流程（委托至材料清单模板）。
- **宣传委员 SOP** v3.0：674→150 行。明确「活动服务者」定位（不直接写入活动），活动与专班视图替代日历，三要素产出标准（照片/简讯/报送格式）。
- **纪检委员 SOP** v4.0：409→159 行。明确「纪律维护者」定位，三层追溯体系首次用数据流图呈现，考勤数据→考察档案的通用同源设计首次写入。
- 三份 SOP 统一结构：Front Matter summary → 一句话摘要 → 适用角色 → 党建域视图（信息流+任务流+验收成果）→ 党务域核心业务 → 检查清单 → 关联文档。
- 总计：1,778 行 → 481 行（精简 73%）。
**影响**：content/SOP/组织委员工作流程指南.md、content/SOP/宣传委员工作流程指南.md、content/SOP/纪检委员工作流程指南.md
