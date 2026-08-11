---
role: "[工程师]+[AI]"
last_updated: "2026-08-12"
dynamic_role:
  maintenance: "[工程师]+[AI]"
  auto_update: "[AI]"
---

# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: "2026-08-12" | 类型: [工程师]+[AI] | 维护方式: 每次文件修改后同步更新

---

## 更新规则

1. 本注册表在周期性任务 M2（SNAPSHOT 更新）执行时批量刷新，不随日常文件修改逐条更新
2. 时间戳格式: `YYYY-MM-DD`（精确时间仅在有 git log 依据时使用 `YYYY-MM-DD HH:MM:SS`）
3. 新增文件须在本注册表中追加条目
4. 删除文件须将对应条目标记为 `🗑️ 已删除`
5. 本文件自身的时间戳在每次批量刷新时同步

---

## 根目录

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| README.md | 2026-08-10 | [用户]+[AI] | 对外门面（设计理念章重构） |
| CLAUDE.md | 2026-08-12 | [工程师]+[AI] | Harness（甲部 H10-H100 约束力三层 + 乙部执行 + 丙部待决策） |
| CHECKLIST.md | — | — | 🗑️ 已删除（迁移至 content/04_web_design/CHECKLIST.md） |
| LICENSE | 2026-02-17 | [用户] | 开源许可 |
| .gitignore | 2026-04-06 | [工具] | Git 忽略 |
| .markdownlint.json | 2026-04-06 | [工具] | Markdown 规范 |
| ARCHITECTURE.md | — | — | 🗑️ 已删除（迁移至 content/03_doc_system/ARCHITECTURE.md） |
| index.html | — | — | 🗑️ 已删除（迁移至 docs/index.html） |

## .ctx/ (审计底座)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .ctx/TIMESTAMPS.md | 2026-08-11 | [工程师]+[AI] | 本文件 |
| .ctx/SNAPSHOT.md | 2026-08-11 | [AI] | 当前基线（v17） |
| .ctx/REVIEW_QUEUE.md | 2026-08-11 | [工程师]+[AI] | 书记评议队列（W4 五专项附录承接区，含最小三成本侧重维度基线，H60 评议细节已指针化至 OPERATIONS_GUIDE §18） |
| .ctx/snapshots/INDEX.md | 2026-05-03 | [工程师]+[AI] | 快照历史索引 |
| .ctx/snapshots/SNAPSHOT_v3_20260502.md | 2026-05-02 | [工程师]+[AI] | v3 快照 |
| .ctx/logs/EXECUTION_LOG_INDEX.md | 2026-05-02 | [工程师]+[AI] | 日志索引 |
| .ctx/logs/DECISION_LOG.md | 2026-07-31 | [工程师]+[AI] | 总决策日志 |
| .ctx/logs/2026-02-EXECUTION_LOG.md | 2026-02-28 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-03-EXECUTION_LOG.md | 2026-03-31 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-04-EXECUTION_LOG.md | 2026-04-06 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-05-EXECUTION_LOG.md | 2026-05-03 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-05-DECISION_LOG.md | 2026-05-31 | [工程师]+[AI] | 5月决策日志 |
| .ctx/logs/2026-06-EXECUTION_LOG.md | 2026-06-30 | [工程师]+[AI] | 已归档 |
| .ctx/logs/2026-06-DECISION_LOG.md | 2026-06-30 | [工程师]+[AI] | 6月决策日志 |
| .ctx/logs/2026-07-EXECUTION_LOG.md | 2026-07-31 | [工程师]+[AI] | 7月执行日志（当前活跃） |
| .ctx/logs/2026-07-DECISION_LOG.md | 2026-07-31 | [工程师]+[AI] | 7月决策日志 |
| .ctx/logs/2026-08-EXECUTION_LOG.md | 2026-08-11 | [工程师]+[AI] | 8月执行日志（当前活跃） |
| .ctx/logs/2026-08-DECISION_LOG.md | 2026-08-06 | [工程师]+[AI] | 8月决策日志 |
| .ctx/logs/archive/2026-05-early-EXECUTION_LOG.md | 2026-05-03 | [工程师]+[AI] | 5月早期条目归档 |
| .ctx/logs/archive/2026-07-early-entries.md | 2026-07-12 | [工程师]+[AI] | T22-T90 早期条目归档（母本：2026-07-EXECUTION_LOG.md） |

## content/01_strategy/ (战略路线层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/01_strategy/DEVELOPMENT_PATH.md | 2026-08-05 | [用户]+[AI] | 发展路径（原 MANAGE_SERVE.md→strategy/DEVELOPMENT_PATH.md，文档逻辑顺序重组后迁至01_strategy/） |
| content/01_strategy/SECRETARY_PRONOUNCEMENTS.md | 2026-08-05 | [用户]+[AI] | 书记论断（项目顶级战略文档） |
| content/01_strategy/README.md | 2026-08-04 | [用户]+[AI] | 01_strategy 目录索引 |
| content/01_strategy/references/历史会议材料/ | 2026-02-28 | [用户] | 只读 |
| content/01_strategy/references/合规文件/ | 2026-02-17 | [用户] | 只读 |
| content/01_strategy/references/建设探索/ | 2026-02-28 | [用户] | 只读 |
| content/01_strategy/references/党支部工作记录.docx | 2026-02-28 | [用户] | 只读 |

## content/02_institution/ (制度层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/02_institution/COMMISSIONER_FRAMEWORK.md | 2026-08-05 | [用户]+[AI] | 支委框架与赋权（含§D赋权入口设计） |
| content/02_institution/FLAT_DESIGN.md | 2026-08-05 | [工程师]+[AI] | 扁平化设计 |
| content/02_institution/ROLE_CLASSIFICATION.md | 2026-08-10 | [工程师]+[AI] | 角色分类（[AI] 角色描述去开发期 Agent 术语） |
| content/02_institution/README.md | 2026-08-10 | [用户]+[AI] | 02_institution 目录索引 |
| content/02_institution/sop/INDEX.md | 2026-08-04 | [用户]+[AI] | SOP 导航 |
| content/02_institution/sop/常见工作场景快速指南.md | 2026-08-05 | [用户]+[AI] | |
| content/02_institution/sop/支委与党小组定人定责定岗说明.md | 2026-08-05 | [用户]+[AI] | |
| content/02_institution/sop/宣传委员工作流程指南.md | 2026-08-05 | [用户]+[AI] | |
| content/02_institution/sop/纪检委员工作流程指南.md | 2026-08-05 | [用户]+[AI] | |
| content/02_institution/sop/组织委员工作流程指南.md | 2026-08-05 | [用户]+[AI] | |
| content/02_institution/sop/党小组组长工作手册.md | 2026-08-03 | [用户]+[AI] | |

## content/03_doc_system/ (系统治理层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/03_doc_system/OPERATIONS_GUIDE.md | 2026-08-11 | [工程师]+[AI] | 运行标准（含 §1.3 分层体系索引 + §1.4 一致性检查规范 + §12 文件命名规范 + §11 反论表述审核标准 + §16 吸收外部输入流程 + §17 周期性任务与自动唤醒机制，W4 含五专项 + §18 书记评议工作流细节，承接甲部 H60 指针化细节） |
| content/03_doc_system/USAGE_POLICY.md | 2026-08-12 | [工程师]+[AI] | 使用规范（术语 §一 + Emoji §二） |
| content/03_doc_system/ARCHITECTURE.md | 2026-08-03 | [工程师]+[AI] | 核心架构说明（迁移自根目录 ARCHITECTURE.md） |
| content/03_doc_system/DOC_MAP.md | 2026-08-12 | [工程师]+[AI] | 全局文档导航 |
| content/03_doc_system/SSOT_INDEX.md | 2026-08-05 | [工程师]+[AI] | 母本子本注册表 |
| content/03_doc_system/SERVICE_CATALOG.md | 2026-08-12 | [工程师]+[AI] | 服务目录（v4.0 有机重组：清单总表+权限矩阵+权威源指针） |
| content/03_doc_system/README.md | 2026-08-10 | [工程师]+[AI] | 03_doc_system 目录索引 |
| content/03_doc_system/工作模板/经验沉淀辅助提示词.md | 2026-08-05 | [工程师]+[AI] | 沉淀辅助 |

## content/04_web_design/ (设计理念层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/04_web_design/DESIGN_SYSTEM.md | 2026-08-11 | [工程师]+[AI] | 前端设计系统（含§一第2条"最小三成本"原则） |
| content/04_web_design/CHECKLIST.md | 2026-08-12 | [用户]+[AI] | 数据同源一致性校验手册 |
| content/04_web_design/DATA_ARCHITECTURE.md | 2026-08-12 | [工程师]+[AI] | 数据架构设计（含§2.18-§2.20 待办任务数据模型） |
| content/04_web_design/MODULE_UI_DESIGN.md | 2026-08-04 | [工程师]+[AI] | 模块界面设计 |
| content/04_web_design/SOP_WEB.md | 2026-08-05 | [工程师]+[AI] | SOP-系统联动方法 |
| content/04_web_design/SCHOOL_IT_DEPLOYMENT.md | 2026-07-31 | [工程师]+[AI] | 部署方案 |
| content/04_web_design/README.md | 2026-07-21 | [工程师]+[AI] | 04_web_design 目录索引 |

## content/05_ai_coding/ (AI 编码层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/05_ai_coding/KNOWN_PITFALLS.md | 2026-08-11 | [工程师]+[AI] | 已知陷阱（含 §7 分层体系冲突记录 + §14 同区域连续编辑陷阱） |
| content/05_ai_coding/README.md | 2026-07-21 | [工程师]+[AI] | 05_ai_coding 目录索引 |

## content/insights/ (经验沉淀)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/insights/党支部管理与实务经验沉淀.md | 2026-08-11 | [用户]+[AI] | 党建与党务工作理论贡献 |
| content/insights/工程演进与设计方法论.md | 2026-08-11 | [用户]+[AI] | 工程演进与设计方法论（文档逻辑顺序重组后拆分为独立文件） |

## content/README.md

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/README.md | 2026-08-03 | [用户]+[AI] | content 目录总索引 |

## server/ (后端服务)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| server/server.js | 2026-08-03 | [工程师]+[AI] | 启动入口（node server.js，默认端口 3000） |
| server/app.js | 2026-08-03 | [工程师]+[AI] | createApp 工厂 + JSON 错误中间件 |
| server/db.js | 2026-08-03 | [工程师]+[AI] | 25 资源表 + sessions/attachments |
| server/seed.js | 2026-08-03 | [工程师]+[AI] | 复用前端 mock 导入种子 |
| server/routes/auth.js | 2026-08-03 | [工程师]+[AI] | 登录/token/me |
| server/routes/resources.js | 2026-08-03 | [工程师]+[AI] | 25 资源 list/create/update + bootstrap + snapshot |
| server/routes/uploads.js | 2026-08-03 | [工程师]+[AI] | 附件上传（jpg/png/pdf/docx/xlsx，≤10MB） |
| server/test/*.test.js | 2026-08-03 | [工程师]+[AI] | 8 测试文件 16 用例（含 Playwright E2E） |
| server/README.md | 2026-08-10 | [工程师]+[AI] | 安装/启动/测试/部署对接说明 |
| server/package.json | 2026-08-03 | [工程师]+[AI] | better-sqlite3 ^12.0.0、playwright 1.60.0 |
| server/package-lock.json | 2026-08-03 | [工具] | 依赖锁文件 |
| server/.gitignore | 2026-08-03 | [工具] | 忽略 data.db/uploads 等运行时产物 |
| server/data.db | — | — | 🗑️ 运行时产物（不入库，.gitignore 忽略） |

## docs/ (前端应用)

### docs/ HTML 页面

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/index.html | 2026-07-31 | [用户]+[AI] | 首页入口（含日历） |
| docs/login.html | 2026-07-31 | [用户]+[AI] | 登录页 |
| docs/about.html | 2026-08-03 | [用户]+[AI] | 关于页（支部的故事） |
| docs/archive.html | 2026-07-31 | [用户]+[AI] | 归档页 |
| docs/feedback.html | 2026-07-31 | [用户]+[AI] | 反馈页 |
| docs/help.html | 2026-08-03 | [用户]+[AI] | 帮助页（系统说明书） |
| docs/notice.html | 2026-07-31 | [用户]+[AI] | 通知页 |
| docs/search.html | 2026-07-31 | [用户]+[AI] | 搜索页 |
| docs/workspace/secretary.html | 2026-07-31 | [用户]+[AI] | 书记工作台 |
| docs/workspace/org.html | 2026-07-31 | [用户]+[AI] | 组织委员工作台 |
| docs/workspace/prop.html | 2026-07-31 | [用户]+[AI] | 宣传委员工作台 |
| docs/workspace/disc.html | 2026-07-31 | [用户]+[AI] | 纪检委员工作台 |
| docs/workspace/leader.html | 2026-07-31 | [用户]+[AI] | 党小组组长工作台 |
| docs/workspace/visitor.html | 2026-07-31 | [用户]+[AI] | 访客工作台 |

### docs/src/core/ (核心层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/core/bootstrap.js | 2026-08-06 | [工程师]+[AI] | 引导启动（主题色 resolveAccentRole） |
| docs/src/core/constants.js | 2026-08-06 | [工程师]+[AI] | 静态常量（ACCENT_PALETTE/resolveAccentRole） |
| docs/src/core/cross-page-state.js | 2026-07-31 | [工程师]+[AI] | 跨页状态 |
| docs/src/core/data-loader.js | 2026-07-31 | [工程师]+[AI] | 数据加载 |
| docs/src/core/data-adapter.js | 2026-08-03 | [工程师]+[AI] | 数据适配器（setDataSource/init/persist） |
| docs/src/core/api-adapter.js | 2026-08-03 | [工程师]+[AI] | API 模式适配器（10 资源 + snapshot） |
| docs/src/core/mock-adapter.js | 2026-08-03 | [工程师]+[AI] | Mock 模式适配器（restoreNicheCollections） |
| docs/src/core/domain.js | 2026-07-31 | [工程师]+[AI] | 领域模型 |
| docs/src/core/icons.js | 2026-08-06 | [工程师]+[AI] | 图标系统（含 upload 上传图标） |
| docs/src/core/id.js | 2026-07-31 | [工程师]+[AI] | UUID 发生器 |
| docs/src/core/state.js | 2026-07-31 | [工程师]+[AI] | 全局状态 |
| docs/src/core/utils.js | 2026-07-31 | [工程师]+[AI] | 通用工具 |

### docs/src/components/ (组件层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/components/header.js | 2026-08-06 | [工程师]+[AI] | 页头组件（未读角标/主题色标签） |
| docs/src/components/sidebar.js | 2026-08-06 | [工程师]+[AI] | 侧边栏组件（字号+主题色设置） |
| docs/src/components/calendar.js | 2026-08-06 | [工程师]+[AI] | 日历组件 |
| docs/src/components/inspector.js | 2026-08-06 | [工程师]+[AI] | 检查器组件（产出物区/分类型关闭条件） |
| docs/src/components/modal.js | 2026-07-31 | [工程师]+[AI] | 模态框组件 |
| docs/src/components/tab-bar.js | 2026-07-31 | [工程师]+[AI] | 标签栏组件 |
| docs/src/components/todo-list.js | 2026-08-06 | [工程师]+[AI] | 待办列表组件（E2 flow 内嵌小字） |
| docs/src/components/commissioner-matrix.js | 2026-07-31 | [工程师]+[AI] | 支委矩阵组件 |
| docs/src/components/issue-detail.js | 2026-08-06 | [工程师]+[AI] | 事项详情组件 |
| docs/src/components/issue-form.js | 2026-08-06 | [工程师]+[AI] | 事项表单组件（提交按钮主 CTA 档） |
| docs/src/components/issue-list.js | 2026-08-06 | [工程师]+[AI] | 事项列表组件 |
| docs/src/components/custom-select.js | 2026-08-06 | [工程师]+[AI] | 自定义下拉组件（阈值内嵌搜索+智能定位翻转） |
| docs/src/components/person-picker.js | 2026-07-31 | [工程师]+[AI] | 人员选择器组件 |
| docs/src/components/person-picker.css | 2026-07-31 | [工程师]+[AI] | 人员选择器样式 |
| docs/src/components/query-view.js | 2026-08-06 | [工程师]+[AI] | 查询视图组件 |
| docs/src/components/reactions.js | 2026-07-31 | [工程师]+[AI] | 表态组件 |
| docs/src/components/role-hierarchy.js | 2026-07-31 | [工程师]+[AI] | 角色层级组件 |
| docs/src/components/workspace-popover.js | 2026-07-31 | [工程师]+[AI] | 工作台浮窗组件 |

### docs/src/entries/ (页面入口层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/entries/main-entry.js | 2026-07-31 | [工程师]+[AI] | 首页入口（含日历+通知待办） |
| docs/src/entries/login-entry.js | 2026-08-06 | [工程师]+[AI] | 登录页入口（按钮主 CTA 档） |
| docs/src/entries/about-entry.js | 2026-08-03 | [工程师]+[AI] | 关于页入口（支部的故事） |
| docs/src/entries/archive-entry.js | 2026-08-06 | [工程师]+[AI] | 归档页入口 |
| docs/src/entries/feedback-entry.js | 2026-07-31 | [工程师]+[AI] | 反馈页入口 |
| docs/src/entries/help-entry.js | 2026-08-03 | [工程师]+[AI] | 帮助页入口（系统说明书） |
| docs/src/entries/notice-entry.js | 2026-08-06 | [工程师]+[AI] | 通知页入口 |
| docs/src/entries/search-entry.js | 2026-07-31 | [工程师]+[AI] | 搜索页入口 |
| docs/src/entries/workspace-entry.js | 2026-07-31 | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理） |
| docs/src/entries/ws-secretary-entry.js | 2026-08-06 | [工程师]+[AI] | 书记工作台入口 |
| docs/src/entries/ws-org-commissioner-entry.js | 2026-08-06 | [工程师]+[AI] | 组织委员工作台入口 |
| docs/src/entries/ws-prop-commissioner-entry.js | 2026-08-06 | [工程师]+[AI] | 宣传委员工作台入口（附件上传/下拉搜索/按钮规范） |
| docs/src/entries/ws-disc-commissioner-entry.js | 2026-08-06 | [工程师]+[AI] | 纪检委员工作台入口 |
| docs/src/entries/ws-leader-entry.js | 2026-08-06 | [工程师]+[AI] | 党小组组长工作台入口 |
| docs/src/entries/ws-visitor-entry.js | 2026-08-06 | [工程师]+[AI] | 访客工作台入口 |

### docs/src/services/ (服务层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/services/mock.js | 2026-07-31 | [工程师]+[AI] | Mock 数据总服务 |
| docs/src/services/auth.js | 2026-07-31 | [工程师]+[AI] | 认证与赋权服务 |
| docs/src/services/activity.js | 2026-07-31 | [工程师]+[AI] | 活动服务 |
| docs/src/services/attendance.js | 2026-07-31 | [工程师]+[AI] | 考勤服务 |
| docs/src/services/decision-tree.js | 2026-07-31 | [工程师]+[AI] | 决策树服务 |
| docs/src/services/feedback.js | 2026-07-31 | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理，反馈功能由 issues.js IssueStore 承接） |
| docs/src/services/image.js | 2026-07-31 | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理，图片记录由 core/data-adapter.js imageRecords 承接） |
| docs/src/services/inspection.js | 2026-07-31 | [工程师]+[AI] | 纪检服务 |
| docs/src/services/issues.js | 2026-08-06 | [工程师]+[AI] | 事项服务 |
| docs/src/services/makeup.js | 2026-07-31 | [工程师]+[AI] | 补课服务 |
| docs/src/services/milestones.js | 2026-07-31 | [工程师]+[AI] | 里程碑服务 |
| docs/src/services/notice.js | 2026-08-12 | [工程师]+[AI] | 通知服务（含通知→待办派生） |
| docs/src/services/person.js | 2026-08-03 | [工程师]+[AI] | 人员数据抽象服务（PersonStore，T-142 阶段2） |
| docs/src/services/secretary-overview.js | 2026-08-06 | [工程师]+[AI] | 书记全局概况服务（T-143，E2 派生待办 flow） |
| docs/src/services/review.js | 2026-07-31 | [工程师]+[AI] | 审查服务 |
| docs/src/services/roles.js | 2026-07-31 | [工程师]+[AI] | 角色服务 |
| docs/src/services/runtime.js | 2026-07-31 | [工程师]+[AI] | 运行时插槽 |
| docs/src/services/taskforce.js | 2026-07-31 | [工程师]+[AI] | 专班服务（含专班→待办派生） |
| docs/src/services/todo.js | 2026-08-06 | [工程师]+[AI] | 待办服务（TodoStore+NoticeTodoDeriver+LifecycleTodoDeriver，E2 flow 标注） |

### docs/src/mock/ (Mock 数据层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/mock/index.js | 2026-07-31 | [工程师]+[AI] | Mock 数据桶文件 |
| docs/src/mock/accounts.js | 2026-07-31 | [工程师]+[AI] | 账户数据 |
| docs/src/mock/activities.js | 2026-07-31 | [工程师]+[AI] | 活动数据 |
| docs/src/mock/attendance.js | 2026-07-31 | [工程师]+[AI] | 考勤数据 |
| docs/src/mock/inspection.js | 2026-07-31 | [工程师]+[AI] | 纪检数据 |
| docs/src/mock/notices.js | 2026-07-31 | [工程师]+[AI] | 通知数据 |
| docs/src/mock/people.js | 2026-07-31 | [工程师]+[AI] | 人员数据 |
| docs/src/mock/review.js | 2026-07-31 | [工程师]+[AI] | 审查数据 |
| docs/src/mock/seed.js | 2026-07-31 | [工程师]+[AI] | 种子数据 |
| docs/src/mock/taskforces.js | 2026-07-31 | [工程师]+[AI] | 专班数据 |

### docs/src/modules/ (功能模块层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/modules/references.js | 2026-07-31 | [工程师]+[AI] | 资料查询模块 |

### docs/src/workflow/ (工作流层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/workflow/index.js | 2026-07-31 | [工程师]+[AI] | 桶文件 |
| docs/src/workflow/sop.js | 2026-07-31 | [工程师]+[AI] | SOP 实例化 |
| docs/src/workflow/sopData.js | 2026-07-31 | [工程师]+[AI] | SOP 数据模板 |
| docs/src/workflow/engine.js | 2026-07-31 | [工程师]+[AI] | 工作流引擎 |
| docs/src/workflow/definitions.js | 2026-07-31 | [工程师]+[AI] | 工作流定义 |
| docs/src/workflow/renderer.js | 2026-07-31 | [工程师]+[AI] | 工作流渲染器 |

### docs/src/ 其他

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/styles.css | 2026-08-06 | [工程师]+[AI] | 全局样式（D3 深色主题/按钮四档/主题色选择器） |
| docs/src/config/branch.json | 2026-07-31 | [工程师]+[AI] | 分支配置 |

### docs/ 其他

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/assets/images/party_emblem.png | 2026-03-07 | [用户] | 党徽 |
| docs/data/issues.json | 2026-07-31 | [工程师]+[AI] | 事项数据 |
| docs/data/milestones.json | 2026-07-31 | [工程师]+[AI] | 里程碑数据 |

---

## 周期性任务最后执行时间

| 编号 | 任务 | 最后执行 | 下次到期 | 状态 |
|------|------|---------|---------|------|
| W1 | 执行日志扫描 | 2026-07-31 | 2026-08-07 | OK |
| W2 | Emoji 合规扫描 | 2026-07-31 | 2026-08-07 | OK |
| W3 | 书记内容评议 | 2026-07-31 | 2026-08-07 | 待书记触发 |
| W4 | 专项评议循环 | 2026-08-10 | 2026-08-17 | OK（T-209 建立；反论 T-116/理论复用 T-117/黑话审查 T-195/原话复核 T-200 四专项承接） |
| M1 | CLAUDE.md 清理 | 2026-07-31 | 2026-08-31 | OK |
| M2 | SNAPSHOT 更新 | 2026-08-10 | 2026-08-31 | OK（v16 升版） |
| M3 | 全仓断链扫描 | 2026-07-31 | 2026-08-31 | OK |
| M4 | Insights 经验蒸馏 | 2026-07-31 | 2026-08-31 | OK |
| M5 | DOCUMENTATION_MAP 审查 | 2026-07-31 | 2026-08-31 | OK |
| M6 | README 审查 | 2026-08-10 | 2026-08-31 | OK（门面重构） |
| Q1 | ARCHITECTURE 审查 | — | — | 待初始化 |
| Q2 | 角色体系健康度 | — | — | 待初始化 |
| Q3 | SOP 文本审查 | — | — | 待初始化 |
| Y1 | 年度系统审计 | — | — | 待初始化 |

---

## 已删除文件记录

| 原路径 | 删除日期 | 原因 |
|--------|---------|------|
| AI_ENTRYPOINT.md | 2026-05-01 | 内容已合并至 ARCHITECTURE.md |
| .ctx/COMPLETED_TASKS.md | 2026-05-02 | 日志已覆盖，汇总表删除 |
| .ctx/PENDING_MODIFICATIONS.md | 2026-05-02 | 内容整合至 CLAUDE.md |
| .ctx/SUSPENDED_ISSUES.md | 2026-05-02 | 内容整合至 CLAUDE.md |
| .ctx/WATCH_LOG.md | 2026-05-02 | 全部已解决，验证后删除 |
| .ctx/AI_CONTEXT.md | 2026-05-02 | 内容已整合至 .ctx/ 审计底座 |
| .ctx/REVIEW_STATE.md | 2026-05-02 | 内容已整合至 .ctx/ 审计底座 |
| .ctx/SNAPSHOT_v1.3_20260327.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.0_20260401.md | 2026-05-02 | 归档删除 |
| .ctx/SNAPSHOT_v2.1_20260406.md | 2026-05-02 | 归档删除，新 v3.0 生成 |
| .ctx/scenarios/*.md | 2026-05-01 | 全部场景文件已评估删除 |
| governance/ | 2026-05-01 | 迁移至 .ctx/ 后整合 |
| backlog/ | 2026-05-01 | 迁移至 .ctx/ 后整合/删除 |
| knowledge/ | 2026-05-01 | 迁移至 content/sop/ |
| docs/ | 2026-05-01 | 迁移至 content/guides/ + content/insights/ |
| 参考资料/ | 2026-05-01 | 迁移至 content/references/ |
| content/guides/SOP数据映射与同步指南.md | 2026-05-02 | 已合并至 SOP_WEB_GUIDE.md |
| content/guides/COMMISSIONER_ORGANIZATION_ROLE.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/guides/COMMISSIONER_GROUP_INTERACTION.md | 2026-05-03 | 已合并至 COMMISSIONER_SYSTEM_DESIGN.md |
| content/governance/LAYERING_FRAMEWORK.md | 2026-07-09 | 独有内容合并至 OPERATIONS_GUIDE.md §1.3/§1.4 + KNOWN_PITFALLS.md §7 + RECURRING_TASKS.md Q4 |
| content/governance/TERMINOLOGY.md | 2026-07-12 | 已合并至 USAGE_POLICY.md §一（术语使用规范） |
| content/governance/EMOJI_POLICY.md | 2026-07-12 | 已合并至 USAGE_POLICY.md §三（Emoji 使用规范） |
| content/governance/RECURRING_TASKS.md | 2026-07-12 | 已合并至 OPERATIONS_GUIDE.md §17（周期性任务与自动唤醒机制） |
| content/governance/SYNC_EXTERNAL.md | 2026-07-11 | 已合并入 OPERATIONS_GUIDE.md §16 |
| content/governance/AGENT_HANDBOOK.md | 2026-07-03 | Agent 操作手册（废弃） |
| content/governance/AGENT_USAGE.md | 2026-07-03 | Agent 使用指南（废弃） |
| content/strategy/MANAGE_SERVE.md | 2026-07-14 | 改名为 DEVELOPMENT_PATH.md |
| content/strategy/README.md | 2026-07-14 | 目录迁至 content/01_strategy/ |
| content/strategy/FLAT_DESIGN.md | 2026-07-14 | 迁至 content/02_institution/FLAT_DESIGN.md |
| content/strategy/COMMISSIONER_FRAMEWORK.md | 2026-07-14 | 迁至 content/02_institution/COMMISSIONER_FRAMEWORK.md |
| content/sop/ | 2026-07-14 | 迁至 content/02_institution/sop/ |
| content/design/ | 2026-07-14 | 迁至 content/04_web_design/ |
| content/governance/ | 2026-07-14 | 迁至 content/03_doc_system/ |
| content/references/ | 2026-07-14 | 迁至 content/01_strategy/references/ |
| src/ (根目录) | 2026-07-14 | 迁至 docs/src/（目录结构重组） |
| index.html (根目录) | 2026-07-14 | 迁至 docs/index.html |
| content/references/工作模板/FEEDBACK_FORM.md | 2026-07-18 | 系统已有 feedback.html 在线反馈功能，模板冗余 |
| docs/superpowers/ | 2026-07-18 | 过程文件目录删除 |
| .ctx/tmp/ | 2026-07-18 | 空目录删除 |
| .superpowers/ | 2026-07-18 | 空目录删除 |
| .tools/ | 2026-07-18 | 空目录删除 |
| src/party.js | 2026-07-21 | 迁至 docs/src/modules/party.js |
| src/main.js | 2026-07-21 | 拆分为 docs/src/entries/main-entry.js |
| src/state.js | 2026-07-21 | 迁至 docs/src/core/state.js |
| src/events.js | 2026-07-21 | 事件逻辑分散至各 entry 文件 |
| src/calendar.js | 2026-07-21 | 迁至 docs/src/components/calendar.js |
| src/inspector.js | 2026-07-21 | 迁至 docs/src/components/inspector.js |
| src/references.js | 2026-07-21 | 迁至 docs/src/modules/references.js |
| src/domain.js | 2026-07-21 | 迁至 docs/src/core/domain.js |
| src/constants.js | 2026-07-21 | 迁至 docs/src/core/constants.js |
| src/utils.js | 2026-07-21 | 迁至 docs/src/core/utils.js |
| src/id.js | 2026-07-21 | 迁至 docs/src/core/id.js |
| src/service.mock.js | 2026-07-21 | 迁至 docs/src/services/mock.js |
| src/service.runtime.js | 2026-07-21 | 迁至 docs/src/services/runtime.js |
| src/styles.css | 2026-07-21 | 迁至 docs/src/styles.css |
| assets/ | 2026-07-21 | 迁至 docs/assets/ |
| .vscode/ | 2026-07-21 | 工具配置删除 |
| ARCHITECTURE.md (根目录) | 2026-07-21 | 迁至 content/03_doc_system/ARCHITECTURE.md |
| content/insights/党支部管理与实务经验沉淀.md (旧路径 content/strategy/...) | 2026-07-21 | 目录重组，路径不变但旧引用过时 |
| docs/members.html | 2026-08-02 | T-189 删除，项目赋权迁入书记工作台「赋权管理」tab |
| docs/src/entries/members-entry.js | 2026-08-02 | 随 members.html 删除 |
| docs/src/mock/party.js | 2026-07-29 | v13 角色单页制重构移除 party/ 体系 |
| docs/src/modules/party.js | 2026-07-29 | v13 角色单页制重构移除 party/ 体系 |
| docs/src/components/party-cross-nav.js | 2026-07-29 | v13 角色单页制重构移除 |
| docs/src/workflow/activityRecord.js | 2026-07-29 | v13 角色单页制重构移除 |
| docs/src/services/assignment.js | 2026-07-29 | v13 数据同源迁移（AuthStore→mockDB.authorizations） |
| docs/src/services/permission-manager.js | 2026-07-29 | v13 权限体系重构移除 |
| docs/superpowers/ | 2026-08-04 | 过程文件目录删除（specs 6 + plans 4，共 10 文件） |
| .trae/ | 2026-08-04 | 过程文件/脚本清理（specs 7 目录 + documents 1 + skills 空目录） |
| .vscode/settings.json | 2026-08-04 | 个人 IDE 配置删除（引用已不存在的 .github/skills 与 .vibe_context） |
| .superpowers/ | 2026-08-04 | brainstorm 会话过程文件删除 |
| .tools/ | 2026-08-04 | 一次性修复脚本删除（_fix_*.py ×4） |
| .ctx/audit/ | 2026-08-04 | 空目录删除 |
| server/uploads/ | 2026-08-04 | 空目录删除（uploads.js 运行时自动重建） |
| docs/src/services/handover.js | 2026-08-06 | T-224 废除数据交接 |
