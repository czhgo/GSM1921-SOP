---
role: "[工程师]+[AI]"
last_updated: "2026-08-27"
dynamic_role:
  maintenance: "[工程师]+[AI]"
  auto_update: "[AI]"
---

# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: "2026-08-24" | 类型: [工程师]+[AI] | 维护方式: 每次文件修改后同步更新

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
| CLAUDE.md | 2026-08-27 | [工程师]+[AI] | Harness（甲部 H10-H100 约束力三层 + 乙部执行 + 丙部待决策；T-272 乙部登记 + P.8/P.9/P.10 丙部退出清空 + T-280 网页逻辑梳理乙部注册 + T-283 最小三成本第4轮 + T-284 链接审查） |
| CHECKLIST.md | — | — | 🗑️ 已删除（迁移至 content/04_web_design/evolution/CHECKLIST.md） |
| LICENSE | 2026-02-17 | [用户] | 开源许可 |
| .gitignore | 2026-04-06 | [工具] | Git 忽略 |
| .markdownlint.json | 2026-04-06 | [工具] | Markdown 规范 |
| ARCHITECTURE.md | — | — | 🗑️ 已删除（迁移至 content/03_doc_system/ARCHITECTURE.md） |
| index.html | — | — | 🗑️ 已删除（迁移至 docs/index.html） |

## .ctx/ (审计底座)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .ctx/TIMESTAMPS.md | 2026-08-22 | [工程师]+[AI] | 本文件（T-279 M2 时间戳批量刷新） |
| .ctx/SNAPSHOT.md | 2026-08-11 | [AI] | 当前基线（v17） |
| .ctx/REVIEW_QUEUE.md | 2026-08-11 | [工程师]+[AI] | 书记评议队列（W4 五专项附录承接区，含最小三成本侧重维度基线，H60 评议细节已指针化至 PROCESS_GUIDE §18） |
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
| .ctx/logs/2026-08-EXECUTION_LOG.md | 2026-08-24 | [工程师]+[AI] | 8月执行日志（当前活跃；T-279 + T-280 B1~B6 实测 + T-281 论断 refinement 讨论 + T-282 content 体系优化归档，L4777~5208） |
| .ctx/PLAN_网页逻辑梳理.md | — | [工程师]+[AI] | 已删除（2026-08-24 T-280 B1~B6 全部完成，规划已归档至 8月执行日志） |
| .ctx/logs/2026-08-DECISION_LOG.md | 2026-08-19 | [工程师]+[AI] | 8月决策日志（D-270~D-272 丙部退出归档） |
| .ctx/logs/archive/2026-05-early-EXECUTION_LOG.md | 2026-05-03 | [工程师]+[AI] | 5月早期条目归档 |
| .ctx/logs/archive/2026-07-early-entries.md | 2026-07-12 | [工程师]+[AI] | T22-T90 早期条目归档（母本：2026-07-EXECUTION_LOG.md） |

## content/01_strategy/ (战略路线层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/01_strategy/DEVELOPMENT_PATH.md | 2026-08-19 | [用户]+[AI] | 发展路径（原 MANAGE_SERVE.md→strategy/DEVELOPMENT_PATH.md，文档逻辑顺序重组后迁至01_strategy/；P.10 清理「不是…而是」句式 10 处） |
| content/01_strategy/SECRETARY_PRONOUNCEMENTS.md | 2026-08-05 | [用户]+[AI] | 书记论断（项目顶级战略文档） |
| content/01_strategy/README.md | 2026-08-24 | [用户]+[AI] | 01_strategy 目录索引（2026-08-24 补充 references 子目录性质划分） |
| content/01_strategy/references/历史会议材料/ | 2026-08-24 | [用户] | 只读（2026-08-24 党支部工作记录.docx 归位于此） |
| content/01_strategy/references/合规文件/ | 2026-02-17 | [用户] | 只读 |
| content/01_strategy/references/建设探索/ | 2026-02-28 | [用户] | 只读 |

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
| content/03_doc_system/OPERATIONS_GUIDE.md | 2026-08-24 | [工程师]+[AI] | 运行标准·文档规范（§1-14：权威层级/术语/关系/角色/YAML/编码/排版/有机性/编号/日志/反论/命名/面向用户/角色操作；2026-08-24 T-282 拆分 §15-18 至 PROCESS_GUIDE） |
| content/03_doc_system/PROCESS_GUIDE.md | 2026-08-24 | [工程师]+[AI] | 运行标准·流程机制（§15 甲部修改/§16 吸收外部输入/§17 周期性任务含 W4 五专项/§18 书记评议细节；T-282 自 OPERATIONS_GUIDE 拆分） |
| content/03_doc_system/USAGE_POLICY.md | 2026-08-12 | [工程师]+[AI] | 使用规范（术语 §一 + Emoji §二） |
| content/03_doc_system/ARCHITECTURE.md | 2026-08-03 | [工程师]+[AI] | 核心架构说明（迁移自根目录 ARCHITECTURE.md） |
| content/03_doc_system/DOC_MAP.md | 2026-08-19 | [工程师]+[AI] | 全局文档导航 |
| content/03_doc_system/SSOT_INDEX.md | 2026-08-05 | [工程师]+[AI] | 母本子本注册表 |
| content/03_doc_system/SERVICE_CATALOG.md | 2026-08-12 | [工程师]+[AI] | 服务目录（v4.0 有机重组：清单总表+权限矩阵+权威源指针） |
| content/03_doc_system/README.md | 2026-08-10 | [工程师]+[AI] | 03_doc_system 目录索引 |
| content/03_doc_system/工作模板/经验沉淀辅助提示词.md | 2026-08-05 | [工程师]+[AI] | 沉淀辅助 |

## content/04_web_design/ (设计理念层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/04_web_design/design-system/DESIGN_SYSTEM.md | 2026-08-24 | [工程师]+[AI] | 设计系统规范（含§一第2条"最小三成本"原则；T-282 拆分 §二→COLOR_SYSTEM、§四→COMPONENT_SPEC） |
| content/04_web_design/design-system/COLOR_SYSTEM.md | 2026-08-24 | [工程师]+[AI] | 色彩系统规范（T-282 自 DESIGN_SYSTEM 拆分 §二：色盘/主色/辅助色/中性色/功能色/表面色/配色规则） |
| content/04_web_design/design-system/COMPONENT_SPEC.md | 2026-08-24 | [工程师]+[AI] | 组件规范（T-282 自 DESIGN_SYSTEM 拆分 §四：按钮/卡片/输入/侧边栏/导航/日历图例/数据展示/图标/选人/状态徽章） |
| content/04_web_design/module/ABOUT_DESIGN_SYSTEM.md | 2026-08-22 | [工程师]+[AI] | About 页面设计系统（超参数设定原则/防风格疲劳/无竖线红线，新建 T-272；T-278 无人称修缮） |
| content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md | 2026-08-22 | [工程师]+[AI] | 北大党校与智慧党建系统对接设计（党校单向爬取+智慧党建双向同步+数据映射+小程序归位说明+待确认清单，新建；对接授权=党委组织部支持；T-278 无人称修缮） |
| content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md | 2026-08-22 | [工程师]+[AI] | 架构演进（组件化落地评估+轻量插件化「能力注册表」设计+迭代机制+实施路径，新建 T-276；无人称文体） |
| content/04_web_design/deploy/WECHAT_INTEGRATION.md | 2026-08-22 | [工程师]+[AI] | 微信协同与小程序设计方案（§八 新增北大对接数据展示；小程序独立问题归位本文档；T-278 无人称修缮） |
| content/04_web_design/evolution/CHECKLIST.md | 2026-08-24 | [用户]+[AI] | 数据同源一致性校验手册（T-278 无人称修缮；T-280 B1-1 登录跳转表述修正 + §16 登录门控 + 待办直达检查项 + T-235 第3轮实测回填） |
| content/04_web_design/data/DATA_MODEL.md | 2026-08-24 | [工程师]+[AI] | 数据模型设计（T-282 自 DATA_ARCHITECTURE 拆分 §二：20 类模型 + 写入验证 + 待办/通知派生 + 归档字段） |
| content/04_web_design/data/DATA_FLOW.md | 2026-08-24 | [工程师]+[AI] | 数据流设计（T-282 自 DATA_ARCHITECTURE 拆分 §一/§三/§四：总览 + 参与者数据流 + 前端数据流） |
| content/04_web_design/data/DATA_ARCHITECTURE.md | 2026-08-24 | [工程师]+[AI] | 数据架构设计（T-282 拆分后转为路由薄壳，正文已迁至 DATA_MODEL/DATA_FLOW） |
| content/04_web_design/module/MODULE_UI_DESIGN.md | 2026-08-09 | [工程师]+[AI] | 模块界面设计 |
| content/04_web_design/module/SOP_WEB.md | 2026-08-22 | [工程师]+[AI] | SOP-系统联动方法（T-278 无人称修缮） |
| content/04_web_design/deploy/DEPLOYMENT_ROADMAP.md | 2026-08-24 | [工程师]+[AI] | 部署落地总览（四条路径 + 决策矩阵；2026-08-24 并入 SCHOOL_IT_DEPLOYMENT 全部内容为 §三 计算中心对接全案） |
| content/04_web_design/deploy/DEPLOYMENT_AUTH_MODEL.md | 2026-08-22 | [工程师]+[AI] | 部署与认证场景模型（5 场景两轴正交 + 侧边栏统一 + 登录门控四层；T-278 无人称修缮） |
| content/04_web_design/SCHOOL_IT_DEPLOYMENT.md | 2026-08-24 | [工程师]+[AI] | 已并入 DEPLOYMENT_ROADMAP.md §三（计算中心对接全案），2026-08-24 合并删除 |
| content/04_web_design/README.md | 2026-08-24 | [工程师]+[AI] | 04_web_design 目录索引（2026-08-24 部署类重组更新） |

## content/05_ai_coding/ (AI 编码层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/05_ai_coding/KNOWN_PITFALLS.md | 2026-08-23 | [工程师]+[AI] | 已知陷阱（含 §14 同区域连续编辑陷阱 + §16 无视觉代码验证三件套 + §17 共享状态模块版本分裂含 prop 补充判例；T-277/T-279 M2 M3 判例，version 1.15） |
| docs/src/core/registry.js | 2026-08-22 | [工程师]+[AI] | 能力注册表三原语（registerCapability/getCapabilities/getCapability/mountCapability，T-279 M1 新建） |
| docs/src/modules/capabilities/activity-calendar.js | 2026-08-22 | [工程师]+[AI] | 首页活动日历能力声明（自注册模式，T-279 M1 新建） |
| docs/src/modules/capabilities/leader-workspace.js | 2026-08-22 | [工程师]+[AI] | 组长工作台能力声明（tab 清单自注册，scope='workspace:leader'，T-279 M2e 新建） |
| docs/src/modules/capabilities/org-workspace.js | 2026-08-23 | [工程师]+[AI] | 组织委员工作台能力声明（tab 清单自注册，scope='workspace:org'，T-279 M3 新建） |
| docs/src/modules/capabilities/prop-workspace.js | 2026-08-23 | [工程师]+[AI] | 宣传委员工作台能力声明（tab 清单自注册，scope='workspace:prop'，T-279 M3 新建） |
| docs/src/modules/capabilities/disc-workspace.js | 2026-08-23 | [工程师]+[AI] | 纪检委员工作台能力声明（tab 清单自注册，scope='workspace:disc'，T-279 M3 新建） |
| docs/src/modules/capabilities/visitor-workspace.js | 2026-08-23 | [工程师]+[AI] | 成员工作台能力声明（tab 清单自注册，scope='workspace:visitor'，T-279 M3 新建） |
| content/05_ai_coding/README.md | 2026-07-21 | [工程师]+[AI] | 05_ai_coding 目录索引 |

## content/insights/ (经验沉淀)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| content/insights/README.md | 2026-08-24 | [用户]+[工程师] | 经验沉淀层目录索引（2026-08-24 新增，与其他目录对齐） |
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
| server/test/t235-browser-regression.mjs | 2026-08-24 | [工程师]+[AI] | T-235 首页跳转直达回归脚本（T-280 B1-2 新建，34 项 Playwright 断言） |
| server/test/m4-browser-regression.mjs | 2026-08-24 | [工程师]+[AI] | T-279 M4 浏览器回归（T-280 B1-5 版本戳同步 20260824b） |
| server/test/b3-1-makeup-writeback.test.mjs | 2026-08-24 | [工程师]+[AI] | B3-1 补课完成→考勤回写验证（T-280 新建，5 项断言） |
| server/test/probe*.mjs | — | — | 🗑️ 已删除（T-280 B1 临时探针，定位完成清理） |
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
| docs/about.html | 2026-08-12 | [用户]+[AI] | 关于页（支部的故事；静态壳模式 + about.css 独立引用） |
| docs/archive.html | 2026-07-31 | [用户]+[AI] | 归档页 |
| docs/feedback.html | 2026-07-31 | [用户]+[AI] | 反馈页 |
| docs/help.html | 2026-08-12 | [用户]+[AI] | 帮助页（系统说明书；静态壳模式） |
| docs/notice.html | 2026-07-31 | [用户]+[AI] | 通知页 |
| docs/search.html | 2026-07-31 | [用户]+[AI] | 搜索页 |
| docs/workspace/secretary.html | 2026-07-31 | [用户]+[AI] | 书记工作台 |
| docs/workspace/org.html | 2026-08-23 | [用户]+[AI] | 组织委员工作台（T-279 M3 入口版本 bump 20260823d） |
| docs/workspace/prop.html | 2026-07-31 | [用户]+[AI] | 宣传委员工作台 |
| docs/workspace/disc.html | 2026-07-31 | [用户]+[AI] | 纪检委员工作台 |
| docs/workspace/leader.html | 2026-08-23 | [用户]+[AI] | 党小组组长工作台（T-279 M2 入口版本 20260822e；2026-08-23 styles.css 引用 bump 20260823a） |
| docs/workspace/visitor.html | 2026-07-31 | [用户]+[AI] | 访客工作台 |

### docs/src/core/ (核心层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/core/bootstrap.js | 2026-08-12 | [工程师]+[AI] | 引导启动（主题色 resolveAccentRole；header/sidebar 版本引用） |
| docs/src/core/constants.js | 2026-08-06 | [工程师]+[AI] | 静态常量（ACCENT_PALETTE/resolveAccentRole） |
| docs/src/core/cross-page-state.js | 2026-08-24 | [工程师]+[AI] | 跨页状态（T-280 B1-5 版本化 bump CODE_VERSION 32→40；20260824d 全站 bump 后为 40） |
| docs/src/core/data-loader.js | 2026-07-31 | [工程师]+[AI] | 数据加载 |
| docs/src/core/data-adapter.js | 2026-08-03 | [工程师]+[AI] | 数据适配器（setDataSource/init/persist） |
| docs/src/core/login-snapshot.js | 2026-08-12 | [工程师]+[AI] | 登录快照轻量读取（零依赖，静态页登录态感知壳用） |
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
| docs/src/components/header.js | 2026-08-12 | [工程师]+[AI] | 页头组件（未读角标/主题色标签；数据层按需加载 + staticShell） |
| docs/src/components/sidebar.js | 2026-08-12 | [工程师]+[AI] | 侧边栏组件（字号+主题色设置；AuthStore 按需加载 + staticShell） |
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
| docs/src/entries/about-entry.js | 2026-08-19 | [工程师]+[AI] | 关于页入口（支部的故事；静态壳 + 死代码清理；T-272 对话三段角速度统一 PLATEAU 0.55） |
| docs/src/entries/archive-entry.js | 2026-08-06 | [工程师]+[AI] | 归档页入口 |
| docs/src/entries/feedback-entry.js | 2026-07-31 | [工程师]+[AI] | 反馈页入口 |
| docs/src/entries/help-entry.js | 2026-08-12 | [工程师]+[AI] | 帮助页入口（系统说明书；静态壳模式） |
| docs/src/entries/notice-entry.js | 2026-08-06 | [工程师]+[AI] | 通知页入口 |
| docs/src/entries/search-entry.js | 2026-07-31 | [工程师]+[AI] | 搜索页入口 |
| docs/src/entries/workspace-entry.js | 2026-07-31 | [工程师]+[AI] | 🗑️ 已删除（2026-08 P0 死模块清理） |
| docs/src/entries/ws-secretary-entry.js | 2026-08-24 | [工程师]+[AI] | 书记工作台入口（T-280 B1-5 条件抑制重渲染+高亮存活） |
| docs/src/entries/ws-org-commissioner-entry.js | 2026-08-24 | [工程师]+[AI] | 组织委员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+轮询定位） |
| docs/src/entries/ws-prop-commissioner-entry.js | 2026-08-24 | [工程师]+[AI] | 宣传委员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+轮询定位） |
| docs/src/entries/ws-disc-commissioner-entry.js | 2026-08-24 | [工程师]+[AI] | 纪检委员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+高亮存活） |
| docs/src/entries/ws-leader-entry.js | 2026-08-24 | [工程师]+[AI] | 党小组组长工作台入口（T-279 M2 薄壳化 + T-280 B1-5 条件抑制+轮询定位） |
| docs/src/entries/ws-visitor-entry.js | 2026-08-24 | [工程师]+[AI] | 访客/成员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+高亮存活） |

### docs/src/entries/tabs/ (工作台 Tab 模块层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/entries/tabs/leader/_shared.js | 2026-08-22 | [工程师]+[AI] | 组长工作台共享上下文（纯函数 currentLeaderGroup/filterByRole，T-279 M2 新建） |
| docs/src/entries/tabs/leader/todo-tab.js | 2026-08-22 | [工程师]+[AI] | 组长待办 tab（T-279 M2 新建） |
| docs/src/entries/tabs/leader/overview-tab.js | 2026-08-22 | [工程师]+[AI] | 组长工作概况 tab（T-279 M2 新建） |
| docs/src/entries/tabs/leader/write-tab.js | 2026-08-22 | [工程师]+[AI] | 组长活动管理 tab（含决策树引导式写入，T-279 M2 新建） |
| docs/src/entries/tabs/leader/attendance-tab.js | 2026-08-22 | [工程师]+[AI] | 组长考勤上传 tab（T-279 M2 新建） |
| docs/src/entries/tabs/leader/inspection-tab.js | 2026-08-22 | [工程师]+[AI] | 组长考察上传 tab（T-279 M2 新建） |
| docs/src/entries/tabs/leader/review-tab.js | 2026-08-22 | [工程师]+[AI] | 组长复盘提交 tab（T-279 M2 新建） |
| docs/src/entries/tabs/leader/members-tab.js | 2026-08-22 | [工程师]+[AI] | 组长组员进展 tab（三区：卡点/进度/汇报，T-279 M2 新建） |
| docs/src/entries/tabs/leader/tf-view-tab.js | 2026-08-22 | [工程师]+[AI] | 组长专班查看 tab（URL 直达高亮，T-279 M2 新建） |
| docs/src/entries/tabs/leader/my-dispatch-tab.js | 2026-08-22 | [工程师]+[AI] | 组长我的处置 tab（T-279 M2 新建） |

### docs/src/entries/tabs/org/ (组织委员工作台 Tab 模块层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/entries/tabs/org/todo-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员待办 tab（T-279 M3 新建） |
| docs/src/entries/tabs/org/overview-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员工作概况 tab（T-279 M3 新建） |
| docs/src/entries/tabs/org/inspection-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员考察上传 tab（T-279 M3 新建） |
| docs/src/entries/tabs/org/taskforce-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员专班管理 tab（含发布招募，T-279 M3 新建） |
| docs/src/entries/tabs/org/talent-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员人才库 tab（T-279 M3 新建） |
| docs/src/entries/tabs/org/development-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员发展数据 tab（T-279 M3 新建） |
| docs/src/entries/tabs/org/activity-view-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员活动查看 tab（T-279 M3 新建） |
| docs/src/entries/tabs/org/my-dispatch-tab.js | 2026-08-23 | [工程师]+[AI] | 组织委员我的处置 tab（T-279 M3 新建） |

### docs/src/entries/tabs/prop/ (宣传委员工作台 Tab 模块层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/entries/tabs/prop/todo-tab.js | 2026-08-23 | [工程师]+[AI] | 宣传委员待办 tab（T-279 M3 新建） |
| docs/src/entries/tabs/prop/overview-tab.js | 2026-08-23 | [工程师]+[AI] | 宣传委员工作概况 tab（T-279 M3 新建） |
| docs/src/entries/tabs/prop/tasks-tab.js | 2026-08-23 | [工程师]+[AI] | 宣传任务 tab（T-279 M3 新建） |
| docs/src/entries/tabs/prop/kanban-tab.js | 2026-08-23 | [工程师]+[AI] | 项目看板 tab（T-279 M3 新建） |
| docs/src/entries/tabs/prop/weekly-tab.js | 2026-08-23 | [工程师]+[AI] | 周报报送 tab（T-279 M3 新建） |
| docs/src/entries/tabs/prop/archive-tab.js | 2026-08-23 | [工程师]+[AI] | 档案归档 tab（T-279 M3 新建） |
| docs/src/entries/tabs/prop/my-dispatch-tab.js | 2026-08-23 | [工程师]+[AI] | 宣传委员我的处置 tab（T-279 M3 新建） |

### docs/src/entries/tabs/disc/ (纪检委员工作台 Tab 模块层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/entries/tabs/disc/_shared.js | 2026-08-23 | [工程师]+[AI] | 纪检委员共享上下文（DISC_COMMISSIONER_ID，T-279 M3 新建） |
| docs/src/entries/tabs/disc/todo-tab.js | 2026-08-23 | [工程师]+[AI] | 纪检委员待办 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/overview-tab.js | 2026-08-23 | [工程师]+[AI] | 纪检委员工作概况 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/attendance-tab.js | 2026-08-23 | [工程师]+[AI] | 考勤管理 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/review-tab.js | 2026-08-23 | [工程师]+[AI] | 活动监督复盘 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/inspection-tab.js | 2026-08-23 | [工程师]+[AI] | 考察管理 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/makeup-tab.js | 2026-08-24 | [工程师]+[AI] | 补课制度 tab（T-279 M3 新建 + T-280 B3-1 确认完成回写考勤 made_up） |
| docs/src/entries/tabs/disc/mailbox-tab.js | 2026-08-23 | [工程师]+[AI] | 公邮管理 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/tf-view-tab.js | 2026-08-23 | [工程师]+[AI] | 纪检委员专班查看 tab（T-279 M3 新建） |
| docs/src/entries/tabs/disc/my-dispatch-tab.js | 2026-08-23 | [工程师]+[AI] | 纪检委员我的处置 tab（T-279 M3 新建） |

### docs/src/entries/tabs/visitor/ (成员工作台 Tab 模块层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/src/entries/tabs/visitor/todo-tab.js | 2026-08-23 | [工程师]+[AI] | 成员待办 tab（T-279 M3 新建） |
| docs/src/entries/tabs/visitor/overview-tab.js | 2026-08-23 | [工程师]+[AI] | 成员工作概况 tab（T-279 M3 新建） |
| docs/src/entries/tabs/visitor/projects-tab.js | 2026-08-23 | [工程师]+[AI] | 项目分工 tab（T-279 M3 新建） |
| docs/src/entries/tabs/visitor/activities-tab.js | 2026-08-23 | [工程师]+[AI] | 活动动态 tab（T-279 M3 新建） |
| docs/src/entries/tabs/visitor/attendance-tab.js | 2026-08-23 | [工程师]+[AI] | 考勤概况 tab（T-279 M3 新建） |
| docs/src/entries/tabs/visitor/inspection-tab.js | 2026-08-23 | [工程师]+[AI] | 我的考察 tab（T-279 M3 新建） |

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
| docs/src/styles.css | 2026-08-23 | [工程师]+[AI] | 全局样式（D3 深色主题/按钮四档/主题色选择器/ab-* 拆出至 about.css；2026-08-23 新增 .ws-tab-scroll 单行滚动样式） |
| docs/src/about.css | 2026-08-19 | [工程师]+[AI] | 关于页独立样式表（ab-* 内容区 + 南西油墨宋 @font-face + Tailwind 最小兜底，about.html 独占引用；T-272 第一章错落无竖线/第二章文字优先） |
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
