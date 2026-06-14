# Decision Ledger — 2026年5月 决策历史

> **蒸馏标签说明**：每条决策可附加 `[经验蒸馏: 是/否 — 理由]` 标签，标记该决策的推理过程是否包含可复用的管理/工程原则。执行日志的蒸馏标签提取"怎么做更好"，决策日志的蒸馏标签提取"什么原则指导决策"。两者互补。早期决策（D-001~D-083）将在后续蒸馏轮次中逐步补标。

---

## 早期决策（2026-05-01 ~ 05-02）

| # | 决策 | 来源任务 | 涉及文件 | 结果 |
|---|------|---------|---------|------|
| D-001 | **Phase 3 版本号与引用统一**：README 去版本号改日期戳 + 全仓引用修正 | 引用统一 | README.md, ARCHITECTURE.md 等 | ✅ 零断链 |
| D-002 | **Phase 2.9 meta_audit.md 评估删除**：逐段评估后判定整文件过时 | 审计删除 | meta_audit.md | ✅ 已删除 |
| D-003 | **Phase 2.4-2.8 治理信息迁移**：governance/ 和 backlog/ 迁移至 .vibe_context/ | 目录迁移 | 5个文件迁移 | ✅ 统一收敛 |
| D-004 | **Phase 2.1+2.3 过时文件清理**：删除 AI_ENTRYPOINT.md + scenarios/core_logic/sop_sync/ui_scenario | 文件清理 | 4个文件删除 | ✅ 冗余清除 |
| D-005 | **Phase 1.3 文档导航中心扩展**：DOCUMENTATION_MAP 从3行扩展至166行全局导航中心（8层级+引用关系图+快速入口+状态标记） | 导航扩展 | docs/DOCUMENTATION_MAP.md | ✅ 导航中心建立 |
| D-006 | **Phase 1.1 架构融合**：AI_ENTRYPOINT + ARCHITECTURE + CLAUDE.md§四 + SSOT_INDEX 四合一 | 架构融合 | ARCHITECTURE.md | ✅ 单一架构说明 |
| D-007 | **SYSTEM_CLAUDE.md "常为新"重写**：删除所有已完成内容（597→302行），新增钩稽联动规则+分层上下文+最优架构方案 | CLAUDE.md 重写 | SYSTEM_CLAUDE.md | ✅ 纯未来路线图 |
| D-008 | **".vibe_context/" 二次清理**：COMPLETED_TASKS/WATCH_LOG 删除，PENDING/SUSPENDED 整合至 SYSTEM_CLAUDE.md，FILE_TIMESTAMPS 同步机制建立 | 二次清理 | .vibe_context/ 精简至6文件 | ✅ 收敛完成 |
| D-009 | **Phase 1-4 文件架构重整全部完成**：ARCHITECTURE融合(1.1) → README延后(1.2) → DOCUMENTATION_MAP扩展(1.3) → 过时文件清理(2.1/2.3/2.9) → governance/backlog迁移(2.4-2.8) → 版本号统一(3) → 内容更新(4) → README最终定稿(1.2终版) | Phase 1-4 | ARCHITECTURE.md, README.md, DOCUMENTATION_MAP.md 等 | ✅ 重整收官 |
| D-010 | **C1-C5 AI 上下文同步**：CONTEXT.md 融合入口 + Layer 0/1/2 分层加载 + 旧文件删除(AI_CONTEXT/REVIEW_STATE/旧SNAPSHOT) | 上下文优化 | .ctx/CONTEXT.md, copilot-instructions.md | ✅ 加载路径精简 |
| D-011 | **A1-A12 文件架构迁移**：knowledge→content/SOP, docs→content/guides+insights, 参考资料→content/references, .vibe_context→.ctx, SYSTEM_CLAUDE.md→CLAUDE.md | 架构迁移 | 全仓路径更新 | ✅ 新架构落地 |

---

## 2026-05-02 决策记录

| # | 决策 | 来源任务 | 涉及文件 | 结果 |
|---|------|---------|---------|------|
| D-012 | **R1 角色定义**：创建 [人]/[人机]/[AI] 三分类体系（职责/权限/协作/存储/读取） | R1 定义 | ROLE_CLASSIFICATION.md (新建) | ✅ 体系建立 |
| D-013 | **R2 角色可扩展性评估**：综合评分 8.6/10，4 中等风险瓶颈 + 2 低风险缺口，OA1-OA4+SA1-SA3+MA1-MA3 优化路径 | R2 评估 | ROLE_SCALABILITY_ASSESSMENT.md | ✅ 评估完成 |
| D-014 | **五项综合任务并行**：CSS 修复(T1) + 日历规划(T2) + 经验蒸馏(T3) + Emoji规范(T4) + 品牌架构(T5) | 五项并发 | styles.css, CALENDAR_DESIGN.md, insights/, EMOJI_POLICY.md, BRAND_ACTIVITY_ARCHITECTURE.md | ✅ 五项全部交付 |
| D-015 | **"常为新"原则规模化应用**：一次性将已完成项从 CLAUDE.md §八 批量移除并转记决策日志 | T1a+T3a+E3 三联 | CLAUDE.md | ✅ 路线图精简 |
| D-016 | **CLAUDE.md 系统性清理**：§二标完成移除过时子表、EXECUTION_LOG_INDEX 路径修复、CONTEXT 版本号同步 | CLAUDE.md 清理 | CLAUDE.md, EXECUTION_LOG_INDEX.md, CONTEXT.md | ✅ 零陈旧引用 |
| D-017 | **T1a 周期性醒机制**：TIMESTAMPS.md 追踪表（12项 W/Y/M/Q）+ copilot-instructions 会话入口检查逻辑 | T1a 周期机制 | TIMESTAMPS.md, copilot-instructions.md | ✅ 醒机制上线 |
| D-018 | **T3a SOP-网页联动诊断**：3份核心SOP展示问题清单（纪检7.3/10、组织5.8/10、宣传6.0/10），17问题+6系统缺陷 | T3a SOP诊断 | SOP_DISPLAY_ISSUES.md (新建) | ✅ 问题清单就绪 |
| D-019 | **E3 三委组织建设职能设计**：三委权限矩阵（11操作×3角色）+ 四面板架构 + CSS/JS 集成方案 + P0-P3 实施路径 | E3 组织建设 | COMMISSIONER_ORGANIZATION_ROLE.md (新建) | ✅ 设计文档就绪 |
| D-020 | **R3 全仓角色标记**：86/86 文件写入 [人]/[人机]/[AI] 标记（39 md + 15 code + 1 html） | R3 角色标记 | 全仓库 | ✅ 100% 覆盖 |
| D-021 | **R4 OA1-OA4 实施**：SA1 动态角色判定（dynamic_role front matter + copilot-instructions 判定逻辑）+ SA2 can-modify 白名单（8类文件权限表） | R4 角色优化 | copilot-instructions.md, state.js, SNAPSHOT.md, TIMESTAMPS.md, ROLE_CLASSIFICATION.md v2.0 | ✅ 双层权限体系上线 |
| D-022 | **CLAUDE.md 结构重组**：从数字编号（§一~§十一）改为字母编号（A~H），规划内容统一归集至 §C，决策日志外置至本文件 | CLAUDE.md 系统性清理 | CLAUDE.md (162行) | ✅ A-H 层级结构上线 |
| D-023 | **E1 党务管理模块实施**：第 4 个 module-tab「党务管理」+ 四面板架构（纪检/组织/宣传/概览）+ 子 tab 切换 + 合规文件引用渲染 + Mock 数据 | E1 组织建设 | index.html, src/party.js(新建), src/main.js, src/events.js, src/styles.css | ✅ 模块上线 |
| D-024 | **SNAPSHOT 更新策略规范化**：仅大版本里程碑更新（v3→v4），日常变更由 DECISION_LOG/EXECUTION_LOG 承载；SNAPSHOT 从 167 行瘦身至 82 行 | SNAPSHOT 优化 | .ctx/SNAPSHOT.md, .ctx/CONTEXT.md, .ctx/TIMESTAMPS.md, copilot-instructions.md | ✅ 频繁更新问题解决 |
| D-025 | **品牌活动定义修订**：从"静态展示的精品橱窗"重新定义为"持续迭代、逐步完善的动态工作项目"；新增宣讲团+人生回望录案例；评分维度新增"成长性"(20%)；认定流程新增"复盘迭代"第五步 | 品牌活动修订 | BRAND_ACTIVITY.md(合并新建) | ✅ 新定义上线 |
| D-026 | **guides/ 文件结构优化**：7 个旧文件合并为 3 个新文件（BRAND_ACTIVITY.md / SOP_WEB_GUIDE.md / COMMISSIONER_GROUP_INTERACTION.md）；ROLE_SCALABILITY_ASSESSMENT.md 合并入 ROLE_CLASSIFICATION.md §六；guides/ 从 20 文件精简至 15 文件 | 文件优化 | content/guides/ | ✅ 精简完成 |
| D-027 | **条条支委与党小组交互机制设计**：职责边界（条条/块块/交叉区域）+ 短期交互模式（任务对接/信息共享/协同决策）+ 长期数字化工作流 + 冲突解决机制 | 条块交互 | COMMISSIONER_GROUP_INTERACTION.md(新建) | ✅ 设计完成 |
| D-028 | **CLAUDE.md §C1 扩展**：3项核心需求（工作流引擎/品牌活动架构/SOP反馈卡）整合入短期规划，C1 从 3 项扩展至 6 项 18 子任务，工作流系统标记为最高优先级（P0 🔴） | CLAUDE.md规划 | CLAUDE.md §C1 (18子任务) | ✅ 规划就绪 |
| D-029 | **C1.1.1+1.1.2 工作流系统核心实施**：创建通用状态机引擎 `engine.js`（`WorkflowEngine` 类 + `createEngine` 工厂 + `canTransition`/`calcTimeoutStatus` 纯函数 + `EVENT_TYPES` 常量 + 阻塞检测）；创建活动流程定义 `definitions.js`（5套模板：主题党日活动/短期非品牌/短期品牌/长期非品牌/长期品牌，含 `getDefinition()` 索引）；更新 `index.js` 导出新模块 | C1.1 工作流系统 | src/workflow/engine.js(新建237行), src/workflow/definitions.js(新建226行), src/workflow/index.js(更新) | ✅ 引擎+定义就绪 |
| D-030 | **C1.1.3 工作流可视化界面开发**：创建 `renderer.js`（`WorkflowRenderer` 类 — SVG 流程节点图 + 进度条 + 状态标签 + 流转历史面板 + 阻塞警告横幅）；推演工作台新增「工作流可视化」面板（模板选择器 + 模拟阻塞开关 + 刷新按钮）；CSS 新增 323 行 `.workflow-*` 样式体系；集成 `main.js`/`events.js`/`index.js` | C1.1 工作流系统 | src/workflow/renderer.js(新建239行), index.html(新增42行), src/styles.css(+323行), src/main.js, src/events.js, src/workflow/index.js | ✅ 可视化上线 |
| D-031 | **工作流系统v2.0重构** | 用户方向调整 | 全文档同步 | ✅ 文档+代码同步就绪 |
| D-034 | **四项综合任务执行** — T1:侧边栏卡片组件扁平化统一（glass→card-flat, glass-input→input-flat, HTML同步更新8处）；T2:字体排版变量体系建立（:root新增8级字号+3级行高+3级字距变量）；T3:角色权限系统修复（ROLE_TYPES commissioner泛化→3细分org/prop/disc-commissioner, HTML角色选择器1→3按钮, inspector.js filterTasksByManagementRole兼容3细分）；T4:C1.1.7活动管理维度落地（写入按钮+活动类型选择器9选项+赋权面板模态框+管理视图显隐控制+赋权/撤销/成功反馈） | 四项综合任务 | styles.css, index.html, state.js, inspector.js, events.js, constants.js | ✅ 全部完成 |
| D-035 | **D4.2 Notice 发布界面**：党务管理模块新增支委/支书专属通知发布表单（title/content/priority/expireDate/targetModule）+ NoticePermission.canPublish 前置校验 + party.js publishNotice 方法 | D4.2 通知发布 | index.html(+42行), src/party.js(+70行), src/service.notice.js(引用) | ✅ 发布界面上线 |
| D-036 | **C1.5 招募→赋权面板直达 + D1.4 主页←→子模块双向联动**：主页招募卡片点击→党务管理+自动打开赋权面板（assign-modal）；三子模块（日历/党务/资料查询）顶部新增「返回主页」链接 + 全局 data-nav 事件委派 | C1.5+D1.4 导航 | src/main.js, index.html(+4处链接) | ✅ 双向联动闭环 |
| D-037 | **全仓文档收束 v5.0**：SNAPSHOT v4→v5 全量更新、TIMESTAMPS 重新统计、DECISION_LOG 追记本轮 3 条决策（D-035/D-036/D-037） | 维护层收束 | SNAPSHOT.md, TIMESTAMPS.md, DECISION_LOG.md, CONTEXT.md | ✅ v5.0 里程碑 |
| D-038 | **§0.2A 双域分化 v6.0**：角色视图矩阵升维为二维（党建台×党务管理）；新增默认信息面板原则（进入模块→全量只读）；全量虚假引用修复（硬编码路径→资料查询模块）；权限矩阵同步至 copilot-instructions v4.0；资料查询 REF_DOCS 扩充至 13 条（含 6 项规章文件） | §0.2A+T19 | CLAUDE.md, src/main.js, src/party.js, index.html, src/references.js, .github/copilot-instructions.md, .ctx/CONTEXT.md | ✅ 双域分化落地 |

---

## 2026-05-05 决策记录

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

### D-050 | 文档组织更新（CLAUDE.md + insights） | 2026-05-05
**问题**：用户要求整理 CLAUDE.md、guides、insights，保持 CLAUDE.md "常为新"、guides 作为持久设计思路、insights 同时沉淀设计理念。
**决策**：
- CLAUDE.md: 更新 last_updated → 2026-05-05；§十 新增 T25-1~T25-6 六项任务及状态 + T25 成果摘要；下一步中心工作调整
- insights「党支部管理与实务经验沉淀」: v5.0 → v6.0（milestone 更新）；新增 v8.0 经验蒸馏（4 项：DOM优先检测 / 标题统领卡片 / 反馈系统自治 / 侧边栏全局导航）
- DECISION_LOG.md: 新增 D-047~D-050 四条决策记录
**影响**：CLAUDE.md, insights 文件, DECISION_LOG.md

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

### D-063 | 赋权链全量重写（对齐 CLAUDE.md §0.2A+§0.3） | 2026-05-05
**问题**：前两轮的赋权链完全错误——条条支委被误认为需要 secretary 赋权，宣传/纪检被误认为有赋权能力，organizer/deep 的赋权人也不完整。
**根因**：未严格对齐 CLAUDE.md 中已有的明确规范。
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

---

## 2026-05-06 决策记录

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
**影响**：CLAUDE.md（+52行 B1.4 模型设计 + 三者关系表 + 数据流图）

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
- 经验 5：赋权链的教训——先看 CLAUDE.md，再写代码
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

---

## 2026-05-16 决策记录

## D-1 2026-05-16 — 视图导航与角色切换 UX 架构

### 背景
当前页面跳转后默认进入只读模式，不同角色视图切换不便，缺少角色模拟功能，只读面板信息量不足。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A | 角色优先模式 | 减少操作步骤 | 管理者可能有时只想浏览 |
| B | 模式优先模式 | 只读面板信息完整 | 只读面板可能信息过载 |
| C | 双入口分离 | 职责清晰 | 侧边栏变复杂 |

### 决定
A. 角色优先模式，但为管理者保留右上角的只读模式切换。除党支部书记外，其他管理身份相互之间可以看对方在做什么但不能修改——区分管理者只读模式和普通访客只读模式。

### 理由
角色即视图是最直觉的交互方式，管理者只读模式保留灵活性，跨角色只读查看促进信息透明。

### 影响范围
sidebar.js / header.js / service.auth.js / workspace-entry.js / party-entry.js

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — 角色即视图是最直觉的交互方式；管理者只读模式保留灵活性；跨角色只读查看促进信息透明]

## D-2 2026-05-16 — 只读面板的信息架构

### 背景
当前只读模式仅展示日历视图，信息量不足。用户需要了解"在干活的人最近在做什么"。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A | 统一信息流面板 | 信息密度高 | 需设计信息流布局 |
| B | 看板摘要面板 | 结构化 | 需为每个角色设计摘要指标 |
| C | 日历增强模式 | 改动最小 | 信息量可能仍不足 |

### 决定
A. 统一信息流面板，比首页更详细。允许使用Tab划分不同工作类型，不同工作类型使用不同面板视图类型（日历可保留）。

### 理由
信息流面板最灵活，Tab划分可承载不同视图类型，比首页更详细满足只读用户的信息需求。

### 影响范围
workspace-entry.js / workspace.html / main.js

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — 信息流面板比看板摘要更灵活；Tab 划分可承载不同视图类型；比首页更详细满足只读用户信息需求]

## D-3 2026-05-16 — 角色模拟功能设计

### 背景
无后台登录系统，需要让用户直观看到不同角色视角下的网页样式。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A | 侧边栏角色卡片增强 | 改动最小 | 侧边栏可能变拥挤 |
| B | Header全局角色切换器 | 入口显眼 | Header空间有限 |
| C | 独立角色模拟页面 | 展示完整 | 需新增页面 |

### 决定
B. Header全局角色切换器，允许在所有身份之间切换。赋权者有权切换所有被赋权者的视图。

### 理由
Header切换器最显眼，赋权关系约束确保权限合规。赋权关系链：党支书>条条支委；党支书>党小组组长；组织委员>专班组织者和深度参与者；党小组组长>活动组织者和深度参与者。

### 影响范围
header.js / service.auth.js / workspace-entry.js / party-entry.js / CLAUDE.md H2

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — Header 全局角色切换器最显眼；赋权关系约束确保权限合规；赋权者可查看被赋权者视图]

---

## 2026-05-17 决策记录

## D-12 2026-05-17 — 页面架构演进方向

### 背景
workspace.html 承载 8 种角色视图（约 2000 行 JS），party.html 承载 5 个委员面板。文件体量大，改一处牵全身。需要决定是否拆分及如何拆分。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 拆 | 拆成多个小页面 | 逻辑隔离 | 工作量大 |
| B 不拆 | 只拆 JS 模块 | 零页面增长 | 页面仍臃肿 |

第二步选项（仅 A 触发）：
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 按角色 | 每个角色独立页面 | 职权不交叉 | 页面多 |
| B 按功能 | 每类功能独立页面 | 页面少 | 同角色跨页面 |

### 决定
第一步：**A 拆**——侧边栏导航不变，点击"党建工作台"/"党务管理"时弹出角色选择面板（而非直接跳转）
第二步：**A 按角色拆分**——职权互不交叉，但不同界面指向同一后台数据，只是显示方式/筛选方式/交互方式不同

### 理由
- 按角色拆分符合 H2.1 双域管理理论中"三委员双域职责"的职权划分
- 侧边栏保持简洁（6 项不变），通过选择面板承载角色入口，避免导航膨胀
- 同一数据源不同切面展示，符合 H2.2 差异化视图设计规范

### 影响范围
- 新增 11 个子页面 HTML + 对应 entry JS
- sidebar.js 需拦截 workspace/party 点击，弹出角色选择面板
- workspace-entry.js / party-entry.js 需拆分为角色子模块
- CrossPageState 需扩展支持新页面结构

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — 按角色拆分页面符合职权不交叉原则；大型单体文件拆分为路由+子模块是可复用的工程模式；侧边栏保持简洁通过选择面板承载角色入口]

## D-13 2026-05-17 — 首页跳转体验设计

### 背景
首页有"查看全部"链接和可点击的数据条目，但点进去看不到对应内容。需要决定跳转时是否带状态、如何传状态、跳转映射表。

### 选项
**第一步：跳转时带不带状态？**
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 带 | 通过网址参数传递"要看什么" | 点进去就能看到对应内容；可收藏/分享 | 网址变长 |
| B 不带 | 目标页面自己判断 | 网址干净 | 可能空白 |

**第二步：状态怎么传？**
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 网址参数 | `?activityId=xxx` | 直观、可分享、刷新不丢 | 网址长 |
| B 临时存储 | sessionStorage | 网址干净 | 刷新丢失 |
| C 混合 | URL 为主 | 兼顾 | 维护两套 |

**第三步：跳转映射表 + 权限**
| 首页位置 | 跳转目标 | 看到什么 | 权限 |
|---------|---------|---------|------|
| 近期活动→查看全部 | ws-visitor.html | 访客只读面板（活动动态） | 只读 |
| 近期活动→某条活动 | ws-visitor.html?activityId=xxx | 高亮该活动+自动定位 | 只读 |
| 专班进展→查看全部 | ws-org-commissioner.html | 组织委员专班管理 | 管理 |
| 专班进展→某个专班 | ws-org-commissioner.html?taskforceId=xxx | 展开该专班详情 | 管理 |
| 考勤概况→查看详情 | ws-disc-commissioner.html | 纪检委员考勤面板 | **只读** |
| 考勤概况→某条考勤 | ws-disc-commissioner.html?activityId=xxx | 按活动筛选考勤 | **只读** |

### 决定
第一步：**A 带**——"查看全部"是列表页，"具体条目"是详情页，两层可互相导航。探索与 workspace/party 只读模式的关系，鼓励不重复建设。
第二步：**C 混合（偏 A）**——URL 参数为主，因为无后台服务器，临时存储无法持久化 mock 变更。
第三步：同意映射表，但**考勤面板必须为只读模式**，不能是管理模式。

### 理由
- URL 参数方案可分享/收藏，且 mock 数据无法随 sessionStorage 变化
- 考勤数据可查看但不可从首页入口修改，权限隔离
- "查看全部"页面与 workspace/party 只读模式复用，不重复建设

### 补充要求
① 活动展示支持日历/列表视图切换（底层同一数据，展示方式不同）
② 涉及所有人/所有活动的大型数据表（考勤、考察）必须有筛选和搜索功能

### 影响范围
- cross-page-state.js（URL 参数支持，已实现）
- index.html（链接更新，已实现）
- main-entry.js（点击处理器，已实现）
- ws-visitor-entry.js（activityId 高亮 + 日历/列表视图切换）
- ws-org-commissioner-entry.js（taskforceId 自动展开）
- ws-disc-commissioner-entry.js（activityId 筛选 + 只读模式 + 搜索筛选）
- 其他大型数据表页面（筛选搜索功能）

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — URL 参数是纯前端架构中跨页面导航的最佳实践；入口来源决定权限级别（公共入口→默认只读）；大型数据表搜索筛选是刚需而非可选]

## D-14 2026-05-17 — SOP 审读优先级与维度

### 背景
5 份 SOP 文档是系统的制度母本，但当前质量参差不齐。网页端已实现大量功能，SOP 需要同步更新为"实操可执行"版本。7 个审读维度被识别：步骤实操性、信息冗余、内容重复、人名硬编码、版本号不一致、条条/块块定义、网页同步缺口。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 按角色使用频率 | 组织委员→宣传委员→纪检委员→常见场景→定人定责定岗 | 高频文档先审，立竿见影 | 低频文档可能拖延 |
| B 按文档长度 | 最长的先审 | 改进空间最大的先处理 | 可能不是最紧急的 |
| C 全部并行 | 5 份同时审 | 效率最高 | 书记负担重 |

### 决定
A 按角色使用频率，且全部 7 个维度都要审。

### 理由
高频文档影响面最大，先审立竿见影。全部维度都要审是因为这些问题相互关联——人名硬编码和版本号不一致是全量问题，条条/块块定义错误影响理解基础。常见场景和定人定责定岗两份文件可能需要全量重写，但必须保留 mermaid 流程图。

### 影响范围
- `content/SOP/组织委员工作流程指南.md`
- `content/SOP/宣传委员工作流程指南.md`
- `content/SOP/纪检委员工作流程指南.md`
- `content/SOP/常见工作场景快速指南.md`
- `content/SOP/支委与党小组定人定责定岗说明.md`

### 一改具改检查
- [x] 乙部已写入 T52-1~T52-7 衍生任务
- [ ] 审读完成后全仓库引用同步

**蒸馏标签**: [经验蒸馏: 是 — 全量审计优于选择性审计——问题相互关联，遗漏任一维度会导致后续返工；下游文件（常见场景/定人定责定岗）在涉及条条支委时对齐各自SOP，在其他管理身份和相互关系时对齐代码实现——这是"母本优先"原则的细化]

## D-15 2026-05-17 — 组织者与深度参与者的定义、工作流与信息流

### 背景
P.4 丙部待决策事项。组织者和深度参与者是党支部扁平化参与途径的核心角色，但全仓库存在 7 处不一致。书记对两者的定义、关系、工作流进行了全面评议。

### 书记评议（逐条记录）

**① 术语修正**：活动和专班是一对并列概念，都需要人手。摒弃"活动组织者"说法，统一为"组织者"。

**② 扁平化的核心含义**：组织者和深度参与者之间没有上下级关系，只是分工内容不同。身份不是最重要的，年级和政治面貌不决定是否胜任。

**③ 组织者的两种情况**：
- Ⅰ 自上而下布置的活动或专班：从支委或党小组组长处承包任务，发挥本组和支委/党小组组长之间的桥梁作用，及时同步任务进展。对深度参与者进行分工（分派任务），分工需经平等协商。
- Ⅱ 自下而上创建的活动或专班：必须联系本组党小组组长或组织委员，由党小组组长或组织委员赋权后方可进行任务分派。

**④ 考勤要求**：
- 活动：深度参与者必须出席；组织者最好出席（允许因特定原因无法出席，但必须与深度参与者和支委/党小组组长同步工作）
- 专班：没有严格的活动地点、时间限制，对高年级同志更加友好

**⑤ 组织者的核心职能与流动性**：
- 组织者可能不参与具体工作（也可以参与），但最重要的职能是做好分工记录
- 支委会根据实际工作完成情况进行对组织者的考察
- 长期活动/专班中，深度参与者可更频繁调整，但组织者最好保持留在岗位，帮助深度参与者负责地交接工作
- 组织者也可根据实际情况调整，但必须由支委会确定好接手的组织者并负责地完成工作交接后方可退出

**⑥ 产出物**：
- 活动：组织者必须打包好深度参与者的工作成果（考勤数据+宣传档案材料），形成对深度参与者的工作考察记录及自己的工作记录（如参与了具体分工），鼓励提交活动复盘和创新提案
- 专班：组织者必须提交对深度参与者的工作考察记录及自己的工作记录，鼓励提交创新提案

**⑦ 核心比喻**：组织者是项目的脑子，深度参与者是项目的手。

### 决定
全面采纳书记评议，作为组织者与深度参与者的权威定义。全仓库集中统一修改。

### 理由
书记的评议从党支部实务出发，修正了三个关键偏差：(1) "活动组织者"→"组织者"——活动与专班并列，组织者不应绑定活动；(2) 扁平化≠无分工，而是无上下级——这修正了 MANAGEMENT_MODE.md 中"组织者验收深度参与者"的层级暗示；(3) 组织者的核心职能是"分工记录"而非"管理闭环"——这重新定义了组织者的产出物。

### 影响范围
- CLAUDE.md H2.5 赋权关系链
- content/guides/architecture/MANAGEMENT_MODE.md（核心理论定义）
- content/guides/design/COMMISSIONER_SYSTEM.md
- content/guides/design/SOP_WEB.md
- content/guides/architecture/DATA.md
- content/SOP/常见工作场景快速指南.md
- content/SOP/纪检委员工作流程指南.md
- content/SOP/宣传委员工作流程指南.md
- content/SOP/支委与党小组定人定责定岗说明.md
- docs/src/core/constants.js（ROLE_LABELS: 'organizer'→'组织者'）
- docs/src/components/role-selector.js
- docs/src/components/sidebar.js
- docs/src/entries/workspace-entry.js
- docs/src/entries/ws-organizer-entry.js
- docs/src/entries/ws-deep-entry.js
- docs/src/services/auth.js
- docs/src/workflow/sopData.js
- docs/about.html
- README.md

### 一改具改检查
- [ ] 全仓库"活动组织者"→"组织者"
- [ ] MANAGEMENT_MODE.md 核心定义重写
- [ ] 7 处不一致逐一修复
- [ ] 代码 ROLE_LABELS 更新
- [ ] 信息流图更新

**蒸馏标签**: [经验蒸馏: 是 — 扁平化≠无分工，而是无上下级；活动与专班并列决定组织者不应绑定活动；组织者的核心职能是"分工记录"而非"管理闭环"；组织者退出需经支委会确认并完成交接——这是责任连续性的保障]

---

## 2026-05-18 决策记录

## D-16 2026-05-18 — 角色权限矩阵三文件一致性校准

### 背景
CLAUDE.md 链接出去的三个文件（COMMISSIONER_SYSTEM.md、MANAGEMENT_MODE.md、DATA.md）各自有权限矩阵，但彼此存在实质性不一致：纪检委员党务管理视图定义冲突、COMMISSIONER_SYSTEM.md 未区分双域、宣传委员创建活动权限分歧。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A1 以 CLAUDE.md 为准 | 纪检委员党务管理 = 补课制度/公邮管理 | 与甲部一致 | 需修改 MANAGEMENT_MODE.md |
| A2 以 MANAGEMENT_MODE.md 为准 | 纪检委员党务管理 = 查询视图 | 交互逻辑清晰 | 需修改甲部，触发 H1.4 |
| B1 双域分化 | §C.1 拆分为党建/党务两个子矩阵 | 与双域理论一致 | 增加文档复杂度 |
| B2 保持现状 | §C.1 不区分双域 | 操作级权限一目了然 | 与双域理论脱节 |
| C1 禁止创建 | 宣传委员不可直接创建活动 | 与写入链路规则一致 | 需修改 DATA.md |
| C2 允许创建 | 宣传委员可直接创建活动 | 操作更灵活 | 与写入链路规则矛盾 |

### 决定
- 第一步：A1+融合——两者不冲突，一个讲内容（补课制度/公邮管理），一个讲交互逻辑（查询视图）。统一按纪检委员自述组织三支柱（考勤/考察/活动监督复盘），覆盖活动+专班。党建板块服务同学们，党务板块供支委会决策，后台同源不同切面。
- 第二步：B1 双域分化
- 第三步：C1 禁止创建，但要求活动创建后宣传委员版面及时同步

### 理由
书记明确指出：党建板块供同学们查询自己的出勤情况，党务板块供支委会进行下一步发展决策。党建和党务对于纪检委员在后台指向同一件事情。纪检委员的考勤考察工作也涉及专班，和活动是平行的。

### 影响范围
- CLAUDE.md H2.1（新增纪检委员三支柱+党建/党务板块本质区分）
- COMMISSIONER_SYSTEM.md §C（双域分化+三支柱详细权限）
- MANAGEMENT_MODE.md §8.2（纪检委员党务管理视图修正+同源说明）
- DATA.md §4.1（宣传委员创建活动权限+纪检委员权限补充）

### 一改具改检查
- [x] CLAUDE.md H2.1 已更新
- [x] COMMISSIONER_SYSTEM.md §C 已更新
- [x] MANAGEMENT_MODE.md §8.2 已更新
- [x] DATA.md §4.1 已更新
- [x] 经验沉淀文档已同步（§6.3 纪检委员三支柱 + §1.3 党建/党务板块本质区分）

[经验蒸馏: 是 — 党建板块服务同学们/党务板块供支委会决策的本质区分、散落=漂移的交叉审查原则]

## D-17 2026-05-18 — 党小组工作手册定位

### 背景
F.1 暂缓议题的悬置原因"本轮先通过 SOP 规定块块职责"已满足，但"党小组工作手册"本身尚未建设。需要决定手册的定位。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 独立文档 | 创建专用的"党小组组长工作手册"，类似三委员 SOP | 组长有独立操作指南，文档间引用关系清晰 | 增加文档维护成本 |
| B 嵌入现有 SOP | 将组长操作指南嵌入"常见工作场景快速指南"或"定人定责定岗说明" | 不新增文档 | 组长指南可能被其他内容淹没 |

### 决定
A 独立文档。书记要求做好文档间引用关系的建设，方便后期一改具改。

### 理由
独立文档确保组长有专属的操作入口，不会被其他内容淹没。文档间通过 related_files 和正文交叉引用建立双向链接，确保一改具改时可追溯。

### 影响范围
- 新增 content/SOP/党小组组长工作手册.md
- 更新 INDEX.md、DOC_MAP.md、定人定责定岗说明、三委员 SOP 的 related_files

### 一改具改检查
- [x] 党小组组长工作手册.md 已创建
- [x] INDEX.md 已更新（导航表 + Reconciliation）
- [x] DOC_MAP.md Layer 2 已更新
- [x] 定人定责定岗说明 related_files + 块块职责链接已更新
- [x] 三委员 SOP related_files 已更新

[经验蒸馏: 是 — 独立文档+交叉引用 > 嵌入式文档，前者确保一改具改可追溯]

## D-18 2026-05-18 — 品牌活动在当前架构中的定位

### 背景
T55-1 确认双轨工作流已基本稳定，品牌维度可以启动。但品牌活动在当前架构中的定位需要明确——它影响数据结构、赋权逻辑和视图设计。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A1 活动子类型 | 品牌活动是主题党日的一个标签 | 简单，现有数据结构无需改动 | 灵活性有限 |
| A2 独立实体 | 品牌活动有自己的数据字段 | 灵活 | 需新增数据模型和 CRUD 流程 |
| B1 书记认定 | 品牌活动须经书记审批标记 | 权威性高 | 增加书记工作量 |
| B2 支委会认定 | 品牌活动须经支委会讨论后标记 | 集体决策 | 流程较长 |

### 决定
- 第一步：A1 活动子类型。优先考虑简单模式。品牌活动如需独立展示网页，将来可探索，写入 guides 作为设计理念
- 第二步：B1/B2 均可。品牌认定在网页上的操作由书记执行

### 理由
品牌活动本质上是"被认定的活动"——它首先是活动，其次才是品牌。标签模式足以满足当前需求，独立实体会增加不必要的复杂度。品牌认定由书记操作，确保权威性。

### 影响范围
- CLAUDE.md H2.2（新增品牌活动定位声明）
- BRAND_ACTIVITY.md（suspended → active，全面重写）
- DATA.md §2.1（ActivityRecord 新增 isBrand 字段）

### 一改具改检查
- [x] CLAUDE.md H2.2 已更新
- [x] BRAND_ACTIVITY.md 已重写
- [x] DATA.md §2.1 已新增 isBrand 字段

[经验蒸馏: 是 — 优先简单模式（标签>独立实体），复杂度延后探索]

---

## 2026-05-20 决策记录

## D-183 2026-05-20 — 甲部重组决策（P.2）

### 背景
甲部约900行按逻辑主题编排，AI每次启动都需读取全文但实际只需热层。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A | 热冷分层 | 热层每次必读放最前，冷层外移节省上下文 | 需重新编号 |
| B | 保持现状 | 无改动成本 | AI每次读取全文浪费上下文 |

### 决定
A热冷分层 + B冷层外移至guides + A重新编号

### 理由
实用主义——热层每次必读放最前，冷层外移节省上下文，"是什么"和"为什么"归Guides，只有"怎么做"留在甲部。

### 影响范围
CLAUDE.md甲部全部章节、所有引用H编号的文件

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — 热冷分层是上下文治理的核心手段，"怎么做"留甲部、"是什么/为什么"归Guides]


## D-184 2026-05-20 — insights与甲部关系决策（P.3）

### 背景
AI上下文丢失后重复犯错，教训散落在insights中但AI不读取。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A | 甲部热层 | AI每次必读 | 甲部过度膨胀 |
| B | 甲部冷层 | 不膨胀 | AI不读取冷层 |
| C | 保留insights | 独立存放 | AI不主动读取 |

### 决定
写入温层 + 其他文件中写入已知陷阱（链接让AI按需读取）；CLAUDE.md中原则级，其他文件中判例级；insights保留，AI行为规范可写入CLAUDE.md

### 理由
温层在修改时读取，既不过度膨胀甲部，又能在需要时看到；判例级细节通过链接按需获取。

### 影响范围
CLAUDE.md甲部、content/insights/、content/guides/governance/

### 一改具改检查
- [ ] 全仓库引用已同步

**蒸馏标签**: [经验蒸馏: 是 — 温层是热层与冷层之间的缓冲——修改时读取，既不膨胀甲部又不丢失教训；原则级入甲部、判例级入其他文件+链接；待写入insights]


## D-185 2026-05-20 — 写入活动功能恢复决策（P.1）

### 背景
写入活动是党建工作台的核心操作，但当前网页实现严重退化——书记工作台仅3字段+toast占位，组长工作台仅toast"待实现"，决策树引导和SOP模板自动匹配在MPA重构后丢失。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 决策树引导式 | 按四层决策树逐步选择，系统自动匹配SOP模板 | 写入流程规范，核心价值回归 | 实现复杂度高 |
| B 简单表单式 | 保持当前三个字段的简单表单 | 实现简单 | 丢失推演工作台核心价值 |

### 决定
A 决策树引导式 + A 组长可独立创建 + B 全部恢复先生长后剪枝

### 理由
1. 决策树引导是推演工作台的核心价值，必须恢复
2. 首选项=组织场景（三会一课/主题党日），三会一课下分支党员大会、党小组会、支委会
3. 组长仅能创建党小组会和主题党日，选项后显示承办党小组选择器
4. "组织委员协调"是专班的事不是活动的事——copilot-instructions.md表述有误需修正
5. 创建活动没有条条支委的事——只有党支书和党小组组长能创建
6. 全部恢复先生长后剪枝——先确保功能完整再优化

### 影响范围
- docs/src/entries/ws-leader-entry.js, ws-secretary-entry.js
- docs/src/services/auth.js, docs/src/workflow/sopData.js, sop.js
- content/guides/architecture/DATA.md（ACL矩阵需修正）
- .github/copilot-instructions.md（"组织委员协调"表述需修正）

### 一改具改检查
- [ ] copilot-instructions.md 修正
- [ ] DATA.md ACL矩阵修正
- [ ] auth.js canWriteActivity() 确认与决策一致

**蒸馏标签**: [经验蒸馏: 是 — 功能恢复决策，待实施后观察]

## D-186 2026-05-20 — 仓库分层治理分工原则决策（P.4）

### 背景
仓库分了很多层，每层存在勾稽关联。智能体治理（.github/agents/）仅在VSCode中可被调用，在Trae中不是执行层。需要确立治理分工原则。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A 原则优先 | 先确立什么问题用什么方式治理 | 灵活适配 | 需要书记判断归属 |
| B 统一归口 | 所有规则归入CLAUDE.md | 集中易维护 | CLAUDE.md可能膨胀 |
| C 双轨并行 | CLAUDE.md管原则约束，智能体配置管能力工具 | 分工清晰 | 需确保不冲突 |

### 决定
A+B不冲突。上下文治理（CLAUDE.md）为主，管原则和执行workflow。智能体治理仅在VSCode中可用，Trae中忽略.github文件夹。保留仓库多维度治理方法论（前端/中端/后端/文本）作为经验沉淀。

### 理由
1. CLAUDE.md是跨平台通用的治理文件，智能体配置仅VSCode可用
2. 仓库多维度治理方法论（前端/中端/后端/文本的分工原则）是值得沉淀的系统治理经验
3. 在Trae中长期忽略.github文件夹，减少无效上下文

### 影响范围
- CLAUDE.md（新增.github忽略指令）
- content/insights/（沉淀治理方法论经验）

### 一改具改检查
- [ ] CLAUDE.md新增忽略.github指令
- [ ] insights沉淀治理方法论

**蒸馏标签**: [经验蒸馏: 是 — 治理方法论：上下文治理为主+智能体治理仅VSCode可用+Trae忽略.github]

## D-187 2026-05-20 — Guides→代码差距开发优先级（P.5）

### 背景
从9份Guides文件中提取出20项设计已明确但代码未实现的功能，需要书记决定开发优先级。

### 决定
- P0-1 参与记录三层录入：先行落地（分工角色与具体工作描述可兼并）
- P0-2 系列活动模型：暂缓
- P0-3 专班发布招募表单：先行落地
- P0-4 赋权管理面板：先行落地
- P1/P2/P3：暂缓决策，留在丙部

### 理由
P0-1/3/4本质上是前端写入内容要能进入后端（尽管现在还没有后端，但已定义了数据结构DATA）。P0-2系列活动模型可以缓一缓。

### 影响范围
- 乙部新增P0-1/P0-3/P0-4三项任务
- 丙部P.5第二步/第三步保留

**蒸馏标签**: [经验蒸馏: 是 — 待实施后观察]

## D-188 2026-05-20 — 编号膨胀问题（P.6）

### 背景
T编号已达61，很多轮次是一次性小任务，编号膨胀导致日志难以阅读。

### 决定
B 按月重置——每月从T1重新开始（如2026-05-T1、2026-06-T1）

### 理由
月内编号可控，跨月引用加前缀即可。这是大工程，需要逐步实施。

### 影响范围
- H6.5 分片规则
- OPERATIONS_GUIDE.md §6
- 执行日志命名和编号体系

**蒸馏标签**: [经验蒸馏: 是 — 编号体系变更待实施]

## D-189 2026-05-20 — 工程质检CHECKLIST文档（P.7）

### 背景
需要一个人机共读的CHECKLIST文档，作为工程质检流程。

### 决定
A 独立文档。检查项是操作步骤——"如果在某处看到了某数据，可以预期在其他地方看到同源数据"。

### 理由
书记作为人工去检验网页时一步步检查。初步维度（人员/活动/专班/检索筛选/Long-Wide/权限）是好的，但检查项应该是操作步骤而非维度描述。

### 影响范围
- 根目录新建CHECKLIST.md
- 书记审阅后调整

**蒸馏标签**: [经验蒸馏: 是 — CHECKLIST待创建和审阅]

## D-190 2026-05-20 — CHECKLIST数据不一致项决策

### 背景
CHECKLIST.md §六发现5项mock数据不一致，书记逐一决策。

### 决定
1. 发展阶段必须统一，每个人有姓名+学号（学号格式2x0001xxxx，2x为入学年份），学号唯一确定，允许重名
2. 书记需要创建条目（化名），书记和副书记都是"书记"权限
3. 专班成员必须用personId引用，所有人员来自统一的人员引用
4. party.js独有人员（吴十）需同步进入people.js
5. 考勤仅限三会一课和主题党日活动，考察覆盖活动和专班
6. 所有涉及写入人名的地方（赋权/参与记录/专班成员等）必须使用人员选择面板，而非填空

### 理由
学号唯一确定人员，避免重名混淆；统一人员引用是一改具改的基础；选择面板防止数据不一致。

### 影响范围
- people.js：新增书记/副书记/吴十条目，添加学号字段
- taskforces.js：成员引用从name改为personId
- attendance.js/inspection.js：考勤范围限定，引用统一
- party.js：候选人引用统一
- 新建person-picker.js：通用人员选择组件
- P0-4赋权面板、P0-1参与记录等需集成PersonPicker

### 一改具改检查
- people.js变更后，所有引用people的mock数据需同步更新
- CHECKLIST.md §六已知不一致项需标记为已解决

**蒸馏标签**: [经验蒸馏: 是 — 人员数据统一是基础设施变更]

## D-191 2026-05-20 — P.5第二步决策：P1关键工作流优先级

### 背景
P.5第一步已决策P0-1/3/4先行落地（D-187），P0-2暂缓。P1关键工作流5项待决策。

### 决定
- P1-1 组织者分工记录面板：**落地**。跟踪完成度=进行中/已完成/已逾期三种状态；组织者分工字段=工作名+工作描述+DDL（精确到分钟）
- P1-2 复盘提交表单+纪检批注：**搁置**，但需在丙部更清晰描述需求
- P1-3 三委数据交接流：**落地**。派工的人记录，最终汇总到纪检处；纪检有义务催促；一般活动由活动组织者记录，专班由专班组织者记录；专班或长期活动需专门分工"归档沉淀维护"便于交接工作
- P1-4 考勤/考察两步确认流程（组长上传→纪检确认）：**尽快落地**
- P1-5 专班解散+工作量汇总+赋权回收：**尽快落地**
- P.5第三步（P2增强+P3辅助）：**继续搁置**

### 理由
P1-1/3/4/5是核心工作流闭环的必要环节。P1-2复盘提交不是最要紧的，但需求描述需更清晰后保留在丙部。数据交接的关键设计是"派工者记录→纪检汇总催促"，专班/长期活动需专门分工归档沉淀维护。

### 影响范围
- 乙部新增P1-1/P1-3/P1-4/P1-5四项任务
- 丙部P.5更新第二步已决策，P1-2需求待细化
- CHECKLIST需新增"写入数据验证"维度（书记要求长期规划+设计思路文档）

### 一改具改检查
- [ ] 丙部P.5更新
- [ ] 乙部写入P1任务
- [ ] P1-2需求描述细化

**蒸馏标签**: [经验蒸馏: 是 — P1工作流待实施]

## D-192 2026-05-20 — P.5第三步决策：P2/P3优先级

### 背景
P.5第一步（P0）和第二步（P1）已决策落地。第三步P2增强功能7项+P3辅助功能4项待决策。

### 决定
- P1-2 复盘沉淀机制：**认同当前范式，继续搁置**
- P2-1 长期建设项目：**落地**，但重新定义——核心是"文件空间"（上传经验沉淀/原始文件/宣传素材），milestone不重要
- P2-2 甘特视图：**搁置**——分工合理的组织不需要甘特视图
- P2-3 看板交互：**落地**，但重新定义——不是拖拽，而是点击确认完成后后台数据变化带动渲染实时改变
- P2-4 发展党员追踪看板：**不需要看板UI**，但后台保留发展阶段数据供组织委员和党支书查询筛选
- P2-5 补课制度跟踪+回写考勤：**落地**
- P2-6 公邮定时提醒：**搁置**——公邮用得越来越少
- P2-7 日历多视图：**尝试落地**
- P3-1~P3-4：**继续搁置**

### 额外原则
- 看板归档原则：已完成的任务不需要展示，完成即归档

### 理由
P2-1文件空间是长期项目迭代的核心需求；P2-3看板交互应反映真实工作流（确认完成→状态变化→渲染更新）；P2-5补课闭环是考勤制度的必要补充；P2-7日历多视图可提升体验。甘特视图和公邮提醒优先级低。

### 影响范围
- 乙部新增P2-1/P2-3/P2-5/P2-7四项任务
- 丙部P.5第三步已决策，P3继续搁置
- 看板归档原则需写入设计规范

### 一改具改检查
- [ ] 丙部P.5更新
- [ ] 乙部写入P2任务
- [ ] 看板归档原则写入guides

**蒸馏标签**: [经验蒸馏: 是 — P2功能待实施]

## D-193 2026-05-20 — D-192修正：P1-2落地+P2-2/4/6删除+P.6决策

### 背景
书记对D-192的三项修正：(1) P1-2复盘沉淀机制从"搁置"改为"落地"（边使用边改进）；(2) P2-2/P2-4/P2-6从"搁置"改为"删除"（书记明确表示"不需要"而非"暂缓"）；(3) P.6 content/references/只读保护决策为A（维持文档约定）。

### 选项
| 选项 | 描述 | 优势 | 劣势 |
|------|------|------|------|
| A1 P1-2搁置 | 等需求完全明确再落地 | 需求清晰 | 延迟价值 |
| A2 P1-2落地 | 边使用边改进 | 尽早验证 | 需求边界不完全清晰 |
| B1 P2-2/4/6搁置 | 保留未来可能性 | 灵活 | 丙部堆积 |
| B2 P2-2/4/6删除 | 明确不需要 | 丙部干净 | 不可逆 |
| C1 P.6技术保护 | 增加只读机制 | 安全 | 维护成本 |
| C2 P.6文档约定 | 仅靠自律 | 简单 | 误改风险 |

### 决定
- A2：P1-2复盘沉淀机制**落地**，边使用边改进
- B2：P2-2甘特视图**删除**（不需要）、P2-4发展党员追踪看板**删除**（后台保留数据供查询筛选即可，不需要看板UI）、P2-6公邮定时提醒**删除**（不需要）
- C2：P.6 content/references/只读保护选择**A维持文档约定**

### 理由
1. 复盘沉淀机制的核心原则已明确（过程中沉淀+归档沉淀维护角色+AI辅助提炼），具体细节可在使用中迭代
2. 书记明确指出"不需要"≠"暂缓"——搁置意味着未来可能需要，删除意味着明确不需要
3. P2-4后台保留发展阶段数据供查询筛选，只是不需要看板UI
4. content/references/只读保护靠文档约定即可，团队规模小，技术保护增加维护成本不值得

### 影响范围
- 乙部P2新增P2-2复盘沉淀机制
- 丙部P.5更新P2-2/4/6为删除状态
- 丙部P.6退出（已决策）
- 丙部P.5 P1-2更新为落地状态

### 一改具改检查
- [x] 丙部P.5 P1-2更新为落地
- [x] 丙部P.5 P2-2/4/6更新为删除
- [x] 丙部P.6退出
- [x] 乙部P2写入P2-2

**蒸馏标签**: [经验蒸馏: 是 — "不需要"≠"搁置"——搁置保留可能性，删除是明确否定；边使用边改进是务实的产品迭代策略]

## D-194 2026-05-20 — P3辅助功能决策+P7文件夹治理决策+甲部自省

### 背景
书记对P.5第四步（P3辅助功能）做出决策，对P.7三步路线图做出决策，同时指出丙部已完成工作残留问题（甲部自省触发）。

### 选项与决定

**P3辅助功能决策**：
| 编号 | 功能 | 决定 | 关键修正 |
|------|------|------|---------|
| P3-1 | 意见反馈管理 | **落地** | 处理后意见归档，对归档库建设提出更高要求 |
| P3-2 | 合规文件引用渲染 | **落地** | 官方文件以官方为准，只读不可变 |
| P3-3 | 画册视图 | **落地（重新定义）** | 不是宣传委员专属，是所有人的视图；在归档库中建立活动风采展示子功能，主页择优展示 |
| P3-4 | 子记录自增表格 | **落地** | 活动挂载考勤/考察/宣传3个子记录（材料自选），专班挂载考察/材料2个子记录 |

**P7文件夹治理决策**：
| 步骤 | 决定 |
|------|------|
| 第一步：目录结构 | B保留层级——但重新排布（非原样保留） |
| 第二步：文件归置 | 党小组会+支部委员会→合并为"历史会议材料"；其他归置建议全部同意 |
| 第三步：提示词升级 | 文件分两大部分（①使用说明 ②提示词正文）；专班按工作性质分（合规性/探索性），非按工作内容分 |

**甲部自省**：H5.2丙部生命周期缺少"多步决策部分退出规则"——"搁置"≠"待决策"，搁置是已做出的决策。

### 理由
1. P3-1归档要求与看板归档原则一致——完成即归档，信息聚焦
2. P3-3画册视图从宣传委员专属升级为全员可见，体现"活动风采"的公共属性
3. P3-4子记录分类反映业务逻辑：活动必挂考勤/考察/宣传，专班必挂考察/材料
4. P7保留层级但重新排布——层级本身不是问题，命名和归置才是问题
5. 专班按合规性/探索性分类，对应双域管理理论（党务=合规、党建=探索）

### 影响范围
- 丙部P.5退出（全部决策完成）
- 丙部P.7更新决策状态后执行
- 乙部P2新增P3-1~P3-4四个功能项
- 甲部H5.2新增多步决策规则
- content/references/目录重组
- 经验沉淀辅助提示词升级

### 一改具改检查
- [x] 甲部H5.2新增多步决策规则
- [ ] 丙部P.5退出
- [ ] 丙部P.7更新决策状态
- [ ] 乙部P2新增P3-1~P3-4
- [ ] references/目录重组
- [ ] 经验沉淀辅助提示词升级

**蒸馏标签**: [经验蒸馏: 是 — "搁置"≠"待决策"——搁置是书记已做出的决策（现在不做），待决策是书记尚未选择方向；多步决策条目在所有步骤均有方向时应退出丙部]

---

## 悬置议题

| # | 议题 | 状态 | 锁定者 | 备注 |
|---|------|------|--------|------|
| H-1 | E.1 品牌活动与非品牌活动发起方式 — 主题党日活动场景增加两种路径 | ⏸️ Pending | 书记 | 需书记明确解锁 |
| H-2 | 党小组工作手册（块块组长专用）尚未建设 | 🔒 Locked | 书记 | 本轮先通过SOP规定块块职责 |

---

## 统计摘要

| 指标 | 数值 |
|------|------|
| 总决策数 | 83+ 条 |
| 2026-05-01 ~ 早期 | 11 条（D-001~D-011） |
| 2026-05-02 | 27 条（D-012~D-038） |
| 2026-05-05 | 29 条（D-039~D-067） |
| 2026-05-06 | 16 条（D-068~D-083） |
| 2026-05-16 | 3 条（D-1~D-3） |
| 2026-05-17 | 4 条（D-12~D-15） |
| 2026-05-18 | 3 条（D-16~D-18） |
| 2026-05-20 | 12 条（D-183~D-194） |
| 悬置议题 | 2 条 |
| 已解锁待处理 | 1 条（H-1） |
| 书记锁定 | 1 条（H-2） |


## D-195 2026-05-21 — 组织生活会与三会一课概念关系修正

### 背景
AI在代码和文档中将组织生活会与三会一课并列，或将组织生活会归为三会一课的组成部分。书记提供官方定义纠正。

### 选项
A 组织生活会是三会一课的组成部分（错误）
B 组织生活会与三会一课并列（错误）
C 组织生活会是内容，以三会形式召开，不是与三会一课并列的活动类型（正确）

### 决定
C。三会一课=支部党员大会+支委会+党小组会+党课（制度形式）。组织生活会是党的组织生活的重要内容，以支部党员大会、支委会或党小组会形式召开。

### 理由
官方定义明确：组织生活会一般以党支部党员大会、党支部委员会会议或者党小组会形式召开。它是内容不是形式，与三会一课不是并列关系。

### 影响范围
ARCHITECTURE.md, ORG_BUILDING.md, MANAGEMENT_MODE.md, 常见工作场景快速指南.md, insights, ws-disc-commissioner-entry.js, ws-secretary-entry.js, sopData.js, index.html

### 一改具改检查
全仓搜索'组织生活会'确认无并列关系残留

---

## D-196 2026-05-21 — 经验沉淀文件简并规划（P.8）

### 背景
insights文件12节63条出现臃肿苗头，子条目间有重叠。

### 选项（4步决策）
第一步：器层'踩过的坑'两节 → A保留但重新定位 / B合并
第二步：器层'前端工程'两节 → A子页面拆分并入网页工程 / B保留
第三步：术层'工程演进'与'上下文治理' → A保留但重新划界 / B合并
第四步：是否拆分 → A保持单文件 / B按维度拆分

### 决定
第一步A：保留两节，架构迁移=方法论，实操教训=判例集
第二步A：子页面拆分并入网页工程
第三步A：保留两节，工程演进=技术原则，上下文治理=制度机制
第四步A：保持单文件
补充要求：内部简并去重，内容详实但不在同一层次重复叙述

### 理由
保留结构但重新定位比激进合并更安全；子页面拆分确实是网页工程的子集；技术原则和制度机制虽然都是'怎么管项目'但关切不同；单文件便于全文检索。

### 影响范围
content/insights/党支部管理与实务经验沉淀.md

### 一改具改检查
insights内部重构，不涉及外部引用变更

## D-197 2026-05-21 — 一改具改知识归位+全仓库taxonomy审查

### 背景
P.9（一改具改工作流知识归位）和P.10（全仓库taxonomy审查）两项丙部待决策事项。

### 选项与决定

**P.9 一改具改知识归位**：
- 第一步：A 甲部补原则+guides写流程
- 第二步：A 不需要references模板，要的是AI生成过程中的HARNESS清单

**P.10 taxonomy审查12项判定**：
| # | 问题 | 判定 |
|---|------|------|
| 1 | 权限矩阵双重定义 | 保留——只要内部不冲突矛盾，允许各有侧重 |
| 2 | 考勤/考察概念捆绑 | **确认错误**——考勤=0-1变量对所有人成立；考察=对深度参与者和组织者的工作量记录 |
| 3 | 乙部已完成条目未退出 | **确认错误**——应退出，检查未退出理由 |
| 4 | 考勤/参与记录重复定义 | **确认错误**——不存在统一的"参与记录"，要么考勤记录要么考察记录 |
| 5 | 赋权链双重定义 | **确认错误**——专班≠赋权×工作量考察；专班制包含赋权制度和工作量考察制度 |
| 6 | 品牌活动独立场景 | **确认错误**——品牌是属性标签，被赋予标签后可有更多归档/展示方面的制度探索 |
| 7-9 | 存储层问题 | **需优化**——按内存最小、信息丢失最小、信息协同效率最高原则安排 |
| 10 | 赋权/专班索引拆分 | **需修正**——先修改#5的专班制定义后根据精神修改 |
| 11-12 | 低严重度 | 暂时不成问题，搁置 |

### 理由
1. 甲部补原则+guides写流程符合热冷分层原则——甲部稳定，guides承载细节
2. 考勤和考察是本质不同的机制：考勤是出勤/缺勤的二元判断，考察是对工作量的质性记录
3. 专班制是一个制度体系，包含赋权制度和工作量考察制度两个子制度，不是乘法关系
4. 品牌是活动的属性而非独立类型，标签模式已足够

### 影响范围
- CLAUDE.md 甲部H2.1（新增吸收外部输入原则）
- content/guides/governance/SYNC_EXTERNAL.md（新建）
- CLAUDE.md 乙部（已完成条目删除，TAX-1~6写入）
- CLAUDE.md 丙部（P.9/P.10退出）
- 待修正：全仓库考勤/考察概念、ParticipationRecord、专班制定义、品牌活动、存储架构

### 一改具改检查
- [x] 甲部H2.1已增加吸收外部输入原则
- [x] SYNC_EXTERNAL.md已创建
- [x] 乙部已完成条目已删除
- [x] TAX-1~6已写入乙部
- [x] 丙部P.9/P.10已退出
- [ ] TAX-1~6执行（待下次工作）

## D-198 2026-05-22 — 考察记录统一方案（P.11决策）

### 背景
inspection.js覆盖活动+专班两种考察来源（tag/content模型），participation.js只覆盖活动考察（level/role模型）。两套数据模型不一致，需统一。

### 选项
- A. 专班考察纳入考察记录（同一数据集）
- B. 专班考察不纳入（单独管理）
- A1. sourceType字段区分来源 / A2. 两条子记录

### 决定
A + A1：专班考察纳入考察记录，用sourceType字段区分来源

### 理由
书记指出：考察的查询是以人为中心展开的，写入是以"活动"或"专班"的具体工作中计入的。来源可以有活动和专班，但写入到的数据集和查询的数据集是同一个。这保证了以人为中心的查询不需要跨数据集拼接。

### 影响范围
- domain.js InspectionRecord：新增sourceType/sourceName字段
- inspection.js + participation.js：合并为单一数据源
- entry文件：引用更新

### 一改具改检查
- [ ] domain.js InspectionRecord类型定义
- [ ] inspection.js数据合并
- [ ] participation.js数据合并/废弃
- [ ] entry文件引用更新
- [ ] mock/index.js桶文件更新


## D-199 2026-05-23 — C-1 JS组件化推进路线图

### 背景
C-1 持续任务拆分为6个子任务（C1-1~C1-6），涉及18个entry文件重构，执行顺序和CRUD粒度需要决策。

### 选项
- 执行顺序：A.自底向上 / B.自顶向下 / C.按影响面排序
- CRUD粒度：A.三个独立文件 / B.合并为一个文件

### 决定
- 执行顺序：A. 自底向上（C1-5→C1-2→C1-3→C1-1→C1-4→C1-6）
- CRUD粒度：A. 三个独立文件（handover.js + makeup.js + assignment.js）

### 理由
自底向上先稳定底层依赖（颜色常量、bootstrap、data-loader），再改上层UI组件，风险最低。三个独立文件职责清晰，符合单一职责原则。

### 影响范围
docs/src/ 下18个entry文件 + 新增5个文件（bootstrap.js, data-loader.js, tab-bar.js, handover.js, makeup.js, assignment.js）

### 一改具改检查
颜色常量统一后需全仓搜索确认旧accent定义零残留

---

## D-200 2026-05-23 — 轻量 CRUD 提取范围（P.2 决策）

### 背景
C1-4 提取了交接/补课/分工三组 CRUD，调研发现考勤(attendance)、考察(inspection)、经验沉淀(deposits) 三组也有跨文件重复。是否提取需要判断。

### 选项
- A. 三组都提取为 service
- B. 仅提取考勤+考察，经验沉淀不提取
- C. 三组都不提取

### 决定
B. 仅提取考勤+考察为 service，经验沉淀不提取

### 理由
经验沉淀目前与网页无关，不属于 C-1 组件化范围。考勤和考察在 ws-leader-entry 和 ws-disc-commissioner-entry 中完全重复（4个函数零差异），且涉及数据持久化一致性，应提取。

### 影响范围
新增 attendance.js + inspection.js 两个 service 文件，修改 ws-leader-entry.js 和 ws-disc-commissioner-entry.js

### 一改具改检查
提取后需确认两个 entry 中旧的内联 CRUD 函数已删除，且 makeup.js 中通过回调注入的考勤接口可改为直接引用

---

## D-201 2026-05-23 — 经验蒸馏条目组织形式（P.3 决策）

### 背景
从近期日志提炼出约19条经验模式，覆盖6个维度。现有 insights 文件已有11个 §，新增内容如何归位需要决策。

### 选项
- A. 追加到现有 §
- B. 新增 §12
- C. 按维度拆分为多个 §

### 决定
A. 追加到现有 §

### 理由
书记指示：经验蒸馏必须先写入内容，然后在给定所有内容基础上做结构优化，断不可同时进行。先有内容再优化结构，避免空壳章节。

### 影响范围
content/insights/党支部管理与实务经验沉淀.md

### 一改具改检查
追加后需确认与现有 § 的边界不冲突，结构优化留待后续独立迭代

---

## D-202 2026-05-23 — 待实现功能按功能类型分批推进（P.4 决策）

### 背景
全仓库扫描发现 7 处 JS showToast 占位 + 4 处 SOP 声明网页待实现 + 4 处 guides 规划中视图，需确定推进顺序。

### 选项
- A. 按角色分批
- B. 按功能类型分批
- C. 只做 showToast 占位的 7 处

### 决定
B. 按功能类型分批，最终目标是角色体验完整

### 理由
同类功能可复用组件，降低开发成本。先做表单/编辑器类（7处showToast占位），再做视图类（4处规划中视图）。

### 影响范围
docs/src/entries/、docs/src/modules/、docs/src/components/

### 一改具改检查
实现后需更新 SOP 中的"网页待实现"标记为"已实现"

---

## D-203 2026-05-23 — 绕过 Service 层直接使用 mock 常量修复（P.5 决策）

### 背景
main-entry.js 和 ws-visitor-entry.js 直接使用 ATTENDANCE_RECORDS，ws-organizer-entry.js 直接使用 INSPECTION_RECORDS，绕过 Service 层导致运行时数据不一致。

### 选项
- A. 立即修复
- B. 记录为已知限制

### 决定
A. 立即修复，并记录为反面案例

### 理由
数据不一致是严重问题，且修复成本低（3个文件各改1-2行）。反面案例写入 insights §10.9。

### 影响范围
main-entry.js、ws-visitor-entry.js、ws-organizer-entry.js

### 一改具改检查
修复后需确认 entry 中无 ATTENDANCE_RECORDS/INSPECTION_RECORDS 直接引用残留

---

## D-204 2026-05-23 — 补充 mockDB 核心种子数据（P.6 决策）

### 背景
mockDB 17 个字段中 9 个初始为空，用户首次进入页面看不到示例数据。

### 选项
- A. 补充核心种子数据
- B. 保持现状

### 决定
A. 补充核心种子数据

### 理由
首次体验完整性是 demo 的基本要求。为 tasks（8条）、deliverables（5条）、assignments（5条）、handovers（2条）补充种子数据。

### 影响范围
新建 docs/src/mock/seed.js，修改 docs/src/services/mock.js

### 一改具改检查
种子数据中的 activityId/personId 需与现有 mock 数据一致

---

## D-205 2026-05-23 — 视图功能按需取用三大原则（P.7 决策）

### 背景
T10 规划了4种视图（查询/看板/甘特/画册），但不是每种视图都适合每个角色页。书记提出三条根本性原则，超越本次决策，应作为视图设计的长期指导。

### 选项
- 第一步：查询视图放哪 → 书记否决了"仅某角色"的选项，提出"长期积累数据必须配备查询视图"原则
- 第二步：看板视图如何处理 → 书记否决：没有应用场景就不决策
- 第三步：甘特视图放哪 → 书记提出"视图必须有对应写入源"原则
- 第四步：画册视图放哪 → A. 不新增

### 决定
**三大原则**（写入 Harness H8.2）：

1. **查询视图原则**：长期写入越写越多的数据，都要配备查询视图。适用范围：活动、专班、归档库、个人考勤等。视图放在哪里取决于"什么站位/身份能看什么"（角色-视图绑定）。

2. **应用场景优先原则**：没有应用场景就不做视图决策。视图不是功能清单的勾选项，而是解决具体问题的工具。

3. **视图-写入源原则**：视图必须有对应的写入源。如果数据没有开始/结束字段，不需要甘特视图；如果没有状态流转字段，不需要看板视图。

**具体决定**：
- 查询视图：所有长期积累数据的页面均需配备
- 看板视图：搁置，待有具体应用场景再决策
- 甘特视图：仅对有开始/结束字段的数据启用
- 画册视图：不新增

### 理由
视图不是装饰，是解决"数据多了怎么找"的问题。没有写入源就没有视图需求，没有应用场景就不做决策——这是工程务实主义。

### 影响范围
- Harness H8.2（新增三大原则）
- guides/MANAGEMENT_MODE.md §八（详细设计）
- 乙部 T10（重新定义范围）
- 丙部 P.7（删除）

### 一改具改检查
H8.2 修改后需同步更新 MANAGEMENT_MODE.md §八，T10 描述需与原则一致

## D-207 2026-05-24 — H5.2丙部触发条件补强（甲部自省）

### 背景
书记指出：CHECKLIST §8.7 标记了4个孤立组件，AI应将其写入丙部但未写入。经自省，H5.2 仅覆盖"AI拿不定主意"这一触发条件，未覆盖"AI发现待决策项"的场景。后者是独立触发条件——AI可能对某事项有自己的判断，但该事项涉及功能去留/设计方向，属于人类决策权范畴。

### 选项
- A. 仅修改CHECKLIST数据，不改Harness → 治标不治本，下次仍可能遗漏
- B. 补强H5.2触发条件 → 从制度层面堵住盲区

### 决定
B. H5.2增加第二触发条件"发现待决策项"，并附D-207自省补丁说明。

### 理由
H2.1甲部自省原则要求：当书记指出Harness存在欠缺时，必须首先反思甲部的表达与规定本身是否有缺陷。H5.2原表述"AI遇到拿不定主意的问题时"确实存在覆盖盲区——"发现待决策项"不等于"拿不定主意"，前者是客观识别，后者是主观困难。两者都是写入丙部的正当理由，但触发逻辑不同。

### 影响范围
- Harness H5.2（增加第二触发条件+自省补丁）
- 丙部 P.9（孤立组件处置——核实后仅workflow/index.js需决策）
- CHECKLIST §8.7（修正3处误判）

### 一改具改检查
H5.2修改后，丙部P.9已按新触发条件写入，CHECKLIST已同步修正

## D-208 2026-05-24 — 颜色体系按角色分配（P.8 决策）

### 背景
当前颜色按角色分配，但角色数量增长后区分度不足。颜色是巨大的信息来源，需要系统设计。

### 选项
- A. 按角色——每角色专属色
- B. 按功能域——党建/党务/归档各一色系
- C. 双轴编码——主色=功能域，辅色=角色

### 决定
A. 按角色分配。补充决定：
1. 8种角色需要8种可区分颜色：党小组组长、组织委员、宣传委员、纪检委员、组织者、深度参与者、党支书 + 1（默认参与者/全体相关）
2. 侧边栏角色卡片(1)与Tab栏高亮(5)颜色必须一致
3. 排查并修复角色卡片边框色与accent色不一致的问题——白底卡片的border-left等边框颜色应与角色accent色统一

### 理由
角色是用户识别"我在哪里"的第一信号。颜色按角色分配，用户一眼就知道当前处于哪个角色的视图。边框色不一致会破坏这种信号——用户看到红色边框但Tab是蓝色，产生困惑。

### 影响范围
- constants.js（ACCENT_COLORS/ROLE_COLORS）
- 各entry中的accentColor硬编码
- sidebar.js角色卡片边框色
- tab-bar.js Tab高亮色

### 一改具改检查
颜色变更需全仓搜索所有accentColor/ROLE_COLORS引用

## D-209 2026-05-24 — workflow/index.js保留并修正引用（P.9 决策）

### 背景
workflow/index.js 作为 barrel file 设计但无外部引用，entries 直接引用子模块绕过了它。

### 选项
- A. 保留并修正引用——让 entries 改为从 index.js 统一导入
- B. 删除——entries 直接引用子模块，index.js 无存在必要

### 决定
A. 保留并修正引用。架构规范性优先。

### 理由
barrel file 是模块层的统一入口，提供封装和重导出。entries 直接引用子模块虽然少一层间接，但破坏了模块的封装性——未来 workflow 内部重构时，所有引用子模块的 entries 都需要修改。

### 影响范围
- ws-leader-entry.js（引用 sopData/sop/renderer）
- ws-secretary-entry.js（引用 sopData/sop/renderer）
- party.js（引用 activityRecord）

### 一改具改检查
修改后需确认 entries 不再直接引用 workflow 子模块

## D-210 2026-05-24 — 日历手机端交互式视图（P.10 决策）

### 背景
日历7列网格在手机上每列仅45px，内容严重挤压不可读。原选项为A列表/B滚动/C当天，但书记提出了新方向。

### 选项
- A. 列表视图
- B. 横向滚动
- C. 仅显示当天
- D.（书记新方向）交互式日历视图——参考手机原生日历，点击日期展示详情，不平铺所有内容

### 决定
D. 交互式日历视图。手机端保持日历网格，但改为交互式：点击某天展示该天详情，而非在格子内平铺所有活动/任务文字。

### 理由
手机原生日历就是交互式的——网格只显示日期和标记点，点击后展开详情。平铺所有内容在手机上既不可读也不必要。交互式设计让用户主动获取信息，而非被动接受信息轰炸。

### 影响范围
- calendar.js（需要增加移动端交互逻辑：点击日期→展开详情面板）
- styles.css（移动端日历格子样式调整：隐藏文字，显示标记点）

### 一改具改检查
日历组件修改需同步更新所有使用日历的entry（ws-visitor-entry, ws-secretary-entry, ws-org-commissioner-entry等）

## D-211 2026-05-24 — 响应式断点维持两档（P.11 决策）

### 背景
当前仅有768px和640px两个断点，覆盖不完整。是否需要增加480px断点？

### 选项
- A. 两档维持（768px+640px），补全覆盖
- B. 三档（增加480px）
- C. 全响应式

### 决定
A. 维持两档。只考虑一般智能手机（375px+），不考虑特殊小屏机。

### 理由
项目面向党支部成员使用，目标设备是主流智能手机和平板。特殊小屏机（<375px）不在支持范围内，增加断点会增加维护成本但收益有限。

### 影响范围
- styles.css（在768px和640px断点内补全缺失的响应式规则）

### 一改具改检查
无跨文件影响

## D-212 2026-05-24 — 补课功能归属域决策（P.12 决策）

### 背景
补课制度同时出现在纪检委员的党建工作台（ws-disc-commissioner-entry.js）和党务管理页面（party-disc-entry.js），功能重复。需要确定补课的归属域。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 归党务 | 补课是合规运行的闭环，只在党务管理页面出现 | 党建工作台不再展示补课，纪检委员需切换到党务页面操作 |
| B. 归党建 | 补课是党建活动的延伸，只在党建工作台出现 | 党务管理页面不再展示补课 |
| C. 两处都保留 | 不同入口看同一数据 | 维持现状，但用户可能困惑 |

### 决定
A. 补课归党务。补课是合规运行的闭环机制，属于党务管理范畴。

### 理由
补课制度的核心是"缺勤→补课→回写考勤"的合规闭环，这属于党务管理的合规运行域，而非党建的创新探索域。党建工作台聚焦考勤/考察/监督复盘等管理功能，补课操作移至党务管理页面，职责边界更清晰。

### 影响范围
- ws-disc-commissioner-entry.js（移除补课Tab + 清理相关函数和import）
- party-disc-entry.js（保留补课Tab，无变更）
- CLAUDE.md（丙部P.12退出）

### 一改具改检查
- [x] ws-disc-commissioner-entry.js 补课Tab已移除
- [x] 丙部P.12已退出（含重复条目修复）
- [x] party-disc-entry.js保留补课Tab确认

> 以下决策已迁移至 2026-06-DECISION_LOG.md（日期修正：实际发生于2026年6月14日）
