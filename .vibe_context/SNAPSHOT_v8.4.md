# SNAPSHOT_v8.4 — 系统快照

> **生成时间：** 2026-03-04  
> **版本节点：** v8.4（全局双面板文档对齐 + 架构宪法注入）  
> **上一版本：** v8.3（原生 ESM 分层架构落地）  
> **维护方：** 书记 + AI 代理

---

## 📁 项目文件树（Tree Structure）

```
GSM1921-SOP/
│
├── 📄 README.md                          # SaaS 中台产品主页（v2.0，含仓库版图）
├── 📄 START_HERE.md                      # 5分钟新成员上手指南
├── 📄 CHEATSHEET.md                      # 速查卡（角色/场景/模板快速索引）
│
├── 🧠 src/                               # 系统大脑（原生 ES Modules，v8.3+）
│   ├── domain.js                         # 领域层：Activity typedef + can() ACL + mockDB
│   ├── service.mock.js                   # Mock 服务：createActivity，600ms+10%错误注入
│   ├── service.runtime.js                # 运行时插槽：BranchService，未来 Supabase 替换点
│   └── main.js                           # 主状态机：STATE枚举+appState+setState+renderUI+防竞态
│
├── 🖼️  index.html                        # 前端壳体：Apple Liquid Glass UI（123KB，无内联业务逻辑）
│
├── 📚 docs/                              # 技术参考文档
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md           # AI 代理编译规范（已清除数字编号）
│   └── 党支部管理与实务经验沉淀.md         # 双轨制经验库 + 考勤/考察分离体系
│
├── 📖 流程指南/                           # 人类可读的制度母本
│   ├── README.md                         # 按角色导航（已清除数字编号）
│   ├── 常见工作场景快速指南.md             # 10 个核心场景全流程（已语义化）
│   ├── 支委与党小组定人定责定岗说明.md     # 条条×块块责任矩阵（已语义化）
│   ├── 组织委员工作流程指南.md
│   ├── 宣传委员工作流程指南.md
│   └── 纪检委员工作流程指南.md
│
├── 📝 申报材料模板/                        # 物理资产挂载点
│   ├── README.md
│   ├── 工作记录类/                        # 三会一课记录、党员大会记录
│   ├── 宣传材料类/                        # 推文模板、配图规范
│   └── 其他模板/                          # 积极分子考察、活动策划等
│
├── 🔄 活动复盘/
│   ├── README.md
│   └── 活动复盘模板.md
│
├── 📦 参考资料/                           # 官方法规文件（只读）
│   ├── 官方文件/                          # 党章、党支部工作规范等
│   ├── 党小组会/                          # 历次党小组会记录
│   └── 支部委员会/                        # 支委工作手册
│
└── 🤖 .vibe_context/                     # AI 控制平面与审计日志区
    ├── WORKFLOW_MASTER.md                 # AI 工作流宪法（v1.12）
    ├── REVIEW_STATE.md                    # 任务状态机（v4.9）
    ├── SNAPSHOT_v8.4.md                   # ← 本文件
    ├── CONTENT_MAP.md                     # 全仓库内容地图
    ├── EXECUTION_LOG.md                   # 日志入口（重定向至 logs/）
    ├── logs/
    │   ├── 2026-02-EXECUTION_LOG.md
    │   └── 2026-03-EXECUTION_LOG.md       # 当前月日志
    └── scenarios/
        ├── activity_rules_enforcement.md
        ├── sop_restructuring.md
        └── yaml_metadata_fix.md
```

---

## 🏗️ 核心架构栈

| 层级 | 文件 | 技术栈 | 说明 |
|------|------|--------|------|
| **Domain 层** | `src/domain.js` | 原生 ESM + JSDoc 强契约 | Activity typedef，`can()` ACL，`mockDB` |
| **Service Mock 层** | `src/service.mock.js` | Promise + 随机错误注入 | 600ms 延迟，5% NetworkError，5% PermissionError |
| **Runtime 插槽** | `src/service.runtime.js` | ESM 动态路由 | `USE_MOCK` 开关，`notImplemented` Proxy 快速失败 |
| **Main/UI 层** | `src/main.js` | 状态机 + DOM API | STATE枚举，immutable appState，防竞态 reqId |
| **前端壳体** | `index.html` | HTML5 + Tailwind CDN | Apple Liquid Glass UI，无内联业务逻辑 |
| **部署平台** | GitHub Pages | 零构建，静态托管 | https://czhgo.github.io/GSM1921-SOP/ |

**依赖方向（不可违反）：**
```
domain.js → service.mock.js → service.runtime.js → main.js → index.html
```

**状态机架构（main.js）：**
```
appState = { status: STATE.IDLE|SUBMITTING|SUCCESS|ERROR, activities: [], error: null,
             domain: string, role: string, activeModule: string }
setState(patch) → appState = { ...appState, ...patch } → renderUI(appState)
```

---

## 📋 业务场景清单（语义化名称，v8.4 版）

### 【活动建设】领域（domain: 'activity'）

| scenarioId | 场景名称 | 考勤性质 |
|------------|---------|---------|
| `org-life` | **【活动建设】组织生活会** | 刚性考勤（三会一课） |
| `theme-party` | **【活动建设】党小组主题党日活动** | 弹性考勤 |
| `joint-event` | **【活动建设】团支部合办活动** | 按活动性质认定 |
| `brand-activity` | **【活动建设】党小组品牌活动建设** | 考察积极分子重点场域 |

### 【组织建设】领域（domain: 'organization'）

| scenarioId | 场景名称 | 主导角色 |
|------------|---------|---------|
| `new-system` | **【组织建设】制度制定与迭代** | 块块委员 |
| `develop-activist` | **【组织建设】考察积极分子** | 组织委员 + 条条组长 |
| `info-platform` | **【组织建设】信息平台支持** | 组织委员 |
| `attendance-check` | **【组织建设】查考勤记录** | 纪检委员 |
| `branch-discussion` | **【组织建设】支部讨论重要事项** | 支委会 |
| `feedback-handling` | **【组织建设】处理意见建议反馈** | 纪检委员 + 支委会 |

---

## 🔐 数据安全摘要（ACL Summary）

| 数据类型 | 可读范围 | 可写范围 |
|---------|---------|---------|
| **考勤信息** | 全员公开 | 纪检委员 + 支委 |
| **考察档案** | 仅支委 | 仅支委 |
| **活动记录** | 全员公开 | 活动组织者 + 支委 |
| **制度文件** | 全员公开 | 支委会审议后 |

---

## 📊 版本演进轨迹

| 版本 | 核心变更 | 日期 |
|------|---------|------|
| v7.9 | 侧边栏 CSS Transform + 角色粒化 + 数据规约 | 2026-03-04 |
| v7.9.1 | 知识库合并 + ACL 注入 + 单一侧边栏 DOM | 2026-03-04 |
| v8.3 | 原生 ESM 分层架构（Domain/Service/Runtime/Main） | 2026-03-04 |
| **v8.4** | **全局双面板文档对齐：README 仓库版图 + 废弃数字编号 + 架构宪法 + 本快照** | **2026-03-04** |
