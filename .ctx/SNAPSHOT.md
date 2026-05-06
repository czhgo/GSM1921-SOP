# SNAPSHOT v6

> **角色**: [AI]
> **生成**: 2026-05-05 — T18+T19 会话后快照
> **上版**: v5 (2026-05-04)
> **变更来源**: T18(差异化视图+emoji清零+消除重复统计) + T19(双域分化+默认面板+虚假引用修复+术语清理)

## 架构摘要

- **双域管理**: 党建工作(创新探索) × 党务工作(合规运行) — 乘积关系
- **专班制**: 专班 = 赋权 × 工作量考察 — 组织委员唯一管理节点
- **决策树**: L1组织场景→L2活动形式→L3时长→L4发起方向
- **条块二元**: 条=功能决策权，块=信息触达权
- **主页(默认首页)**: 三组件 — 重要通知(左) / 人员招募(右) / 活动日历(下)
- **侧边栏**: 主页 / 党建工作台 / 党务管理 / 资料查询

## 核心文件 v6 清单

| 文件 | 状态 | 版本 |
|------|------|------|
| `ROADMAP.md` | ✅ | v6.0 — §0.2A双域分化二维矩阵 |
| `ARCHITECTURE.md` | ✅ | v1.4 |
| `.ctx/CONTEXT.md` | ✅ | T19 |
| `.ctx/SNAPSHOT.md` | ✅ | v6 |
| `.ctx/TIMESTAMPS.md` | ✅ | v6 |
| `.ctx/logs/DECISION_LOG.md` | ✅ | 38条决策 |
| `.github/copilot-instructions.md` | ✅ | v4.0(权限矩阵双域)+v5.0(决策树)+系统架构速览 |
| `content/insights/党支部管理与实务经验沉淀.md` | ✅ | v5.0 — 10章全历史复盘白皮书 |
| `content/guides/DATA_ARCHITECTURE.md` | ✅ | 数据模型+权限矩阵 |
| `content/guides/TERMINOLOGY_STANDARDS.md` | ✅ | 双域术语统一 |
| `content/SOP/组织委员工作流程指南.md` | ✅ | v1.9(专班管理) |
| `content/SOP/宣传委员工作流程指南.md` | ✅ | v2.0(宣传→组织流) |
| `content/SOP/纪检委员工作流程指南.md` | ✅ | v3.11(共享数据) |

## 前端代码 v5 清单

| 文件 | 状态 | 新增/变更说明 |
|------|------|-------------|
| `index.html` | ✅ | 主页三组件HTML + Notice发布表单 + 返回主页链接×4 |
| `src/main.js` | ✅ | renderDashboard + 导航联动事件委派 + 全局data-nav + 服务初始化 |
| `src/state.js` | ✅ | activeModule='dashboard' |
| `src/events.js` | ✅ | 侧边栏切换 + assign-modal |
| `src/party.js` | ✅ | 三委员会面板 + default overview + refreshNoticeSection + publishNotice |
| `src/calendar.js` | ✅ | 日历渲染引擎 |
| `src/styles.css` | ✅ | 四层色盘 + Flat Design + Dashboard CSS |
| `src/constants.js` | ✅ | ACTIVITY_CAT_COLOR扩展 |
| `src/service.mock.js` | ✅ | Activity/Task/Deliverable CRUD |
| `src/service.runtime.js` | ✅ | 运行时代理 |
| `src/service.notice.js` | ✅ | NoticeStore + NoticePermission(D4.2) + renderNoticeList |
| `src/service.taskforce.js` | ✅ | TaskForceRecordStore + migrateFromLegacy + renderRecruitmentList |
| `src/workflow/` | ✅ | engine.js + definitions.js + renderer.js |

## 权限矩阵 v4.0 摘要（双域分化）

| 角色 | 党建工作台 | 党务管理 |
|------|-----------|---------|
| 普通参与者 | 全量只读 | — |
| 深度参与者 | 关联活动只读 | — |
| 活动组织者 | write(自己关联) | — |
| 宣传委员 | read+confirm(宣传) | write(宣传档案域) |
| 纪检委员 | read+confirm(考勤) | write(纪检域) |
| 组织委员 | read+confirm+赋权 | write(发展党员域) |
| 党小组组长 | write(承办写入) | — |
| 党支书 | 全部权限 | 全部职能域write |
