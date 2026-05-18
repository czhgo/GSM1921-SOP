﻿---
title: "会话上下文"
type: reference
role: "[AI]"
owner: "Org OS Agent 集群"
last_updated: "2026-05-15"
status: active
---

# AI Context — 快速同步入口

> last_updated: 2026-05-05 | 类型: [AI] | T18 完成 (diff视图+emoji清零+消除重复统计)
> 详细架构见 [ARCHITECTURE.md](../ARCHITECTURE.md) | 待办见 [CLAUDE.md](../CLAUDE.md)

---

## 1. 系统架构摘要

```
SOP Layer       content/SOP/               制度母本，最高权威
Workflow Layer  src/workflow/              SOP 规则引擎（index/sop/sopData）
Service Layer   src/service.mock.js        CRUD + LocalStorage（唯一写入点）
State Layer     src/state.js               appState + setState + registerRenderCallback
Render Layer    src/calendar.js, inspector.js, events.js
Entry           src/main.js                initApp + renderUI（唯一 DOM 更新入口）
UI              index.html                 静态入口
```

**依赖方向**: `SOP → workflow → domain/utils → service → state → render → entry → UI`

---

## 2. 核心规则

- **Plan-Before-Execution**: 修改 main.js/domain.js/状态机前，必须先输出 `### Blueprint`
- **Service Layer Mutation**: 所有数据写入必须经 service.*.js，UI 层禁止直接操作存储
- **SOP Sovereignty**: content/SOP/ 优先于所有技术实现
- **Change Pipeline**: SOP → domain.js → service → state → UI，严禁逆向
- **Single DOM Updater**: renderUI(state) 是唯一合法 DOM 更新入口
- **Data Privacy**: src/* 和 index.html 中禁止硬编码真人姓名
- **Binary Preservation**: .pdf/.docx/.pptx/.xlsx 只读，禁止修改
- **Experience Distillation Marker**: 日志条目必须含 `[经验蒸馏: 是/否]`

---

## 3. 文件访问权限

| Route ID | 允许修改 | 禁止修改 |
|---------|---------|---------|
| `ui_ux_dev` | index.html, assets/* | src/*, content/SOP/*, .ctx/* |
| `core_logic_arch` | src/* (11 ESM) | index.html, content/SOP/*, .ctx/* |
| `sop_data_sync` | content/SOP/*, src/workflow/sopData/sop | index.html, src/main.js, .ctx/* |
| `meta_audit_log` | .ctx/* | 所有业务代码 |

---

## 4. 当前状态

**活跃快照**: .ctx/SNAPSHOT.md (v4)
**Snapshot 归档**: .ctx/snapshots/ (历史版本，见 INDEX.md)
**详细待办**: 见 [CLAUDE.md](../CLAUDE.md) §C

> [WARNING] 快照按需生成（里程碑/用户触发/阶段收官），非每次执行更新。日常变更记录于 DECISION_LOG + EXECUTION_LOG。

---

## 8. 会话交接协议（Context Continuity）

> **问题**：AI 会话上下文窗口有限，会话重启后全部任务进度和设计决策丢失。
> **目标**：确保任何新会话能在 30 秒内恢复到上一会话的精确断点。

### 8.1 上下文丢失场景分析

| 场景 | 触发条件 | 影响范围 | 严重度 |
|------|---------|---------|--------|
| 会话重启 | 上下文窗口满/IDE重启/新会话启动 | 全部任务进度、设计决策、代码修改上下文 | [P0] 严重 |
| 长任务中断 | 对话超出上下文窗口容量 | 当前任务前半段上下文丢失 | [P1] 中等 |
| 跨日继续 | 用户隔天继续工作 | 无法知道上次断点 | [P1] 中等 |
| 方向变更 | 用户在会话中改变需求方向 | 旧方向的设计决策与新方向混淆 | [P2] 较低 |

### 8.2 会话状态捕获规则

**每次会话结束前（或长任务中途），AI 必须更新本节 §8.3**：

1. 记录当前任务清单及完成状态
2. 记录本会话修改的文件列表
3. 记录关键设计决策（一句话摘要）
4. 记录下一步待办（精确到文件+行号）
5. 标记未解决的阻塞项

### 8.3 最近会话状态

**会话日期**: 2026-05-05（T18 — 差异化日历视图 + emoji全量清零 + 消除重复统计逻辑）

**会话目标**: 
1. **系统性排查渲染管道**：诊断 calendar/party 两模块渲染管道完全独立，role变更不会改变calendar内容
2. **main.js 差异化日历视图**：`_updateCalendarHeader`(5角色5色条) + `_renderCommissionerRedirect`(条条支委引导)
3. **events.js + party.js 路由分流与消重**：commissioner-group→calendar设state / party弹模态框；消除重复统计逻辑
4. **Emoji全量清除 + 返回链接标准化**：~100处emoji清零，三模块返回链接统一 `← 返回主页` 右侧位

**任务清单**:
| 任务 | 状态 | 关键产出 |
|------|------|---------|
| T18a: 系统性排查渲染管道 | [Y] 完成 | 诊断报告：calendar/party 独立渲染，role change不会改变calendar内容 |
| T18b: main.js 差异化日历视图 | [Y] 完成 | _updateCalendarHeader(5角色header) + _renderCommissionerRedirect |
| T18c: events.js 角色路由 | [Y] 完成 | commissioner-group calendar→设state redirect；party→弹模态框 |
| T18d: Emoji 全量清除 | [Y] 完成 | index.html~20处 + party.js~8处 + inspector.js~3处 + utils.js~3处 + renderer.js~4处 |
| T18e: 返回主页链接标准化 | [Y] 完成 | 三模块统一 `← 返回主页` 右侧位 |
| T18f: 代码重构消重 | [Y] 完成 | 新建 src/service.roles.js(90行)，events.js/party.js 共享 computeSecretaryStats |

**本会话修改文件**（共 10 个）:
| 文件 | 变更 | 说明 |
|------|------|------|
| `src/main.js` | [重构] 重构 | 日历模块50→20行；_updateCalendarHeader + _renderCommissionerRedirect |
| `src/events.js` | [修改] 修改 | 导入service.roles.js + commissioner-group路由分流 + _refreshSecretaryStats→共享函数 + _handleViewProxyChange修复 |
| `src/party.js` | [修改] 修改 | 导入computeSecretaryStats + refreshSecretaryAggregateView消除重复计算 |
| `index.html` | [修改] 修改 | 全量emoji清零 + 三模块返回链接位置标准化 |
| `src/service.roles.js` | [新增] 新建 | assignedRoles持久化 + computeSecretaryStats + filterForViewProxy |
| `src/inspector.js` | [修改] 修改 | emoji清除 |
| `src/utils.js` | [修改] 修改 | emoji清除 |
| `src/workflow/renderer.js` | [修改] 修改 | emoji清除 |
| `CLAUDE.md` | [修改] 同步 | §十更新为T18状态 |
| `.ctx/CONTEXT.md` | [修改] 同步 | T18条目

**未解决阻塞项**: 无

**历史会话参考**（前 18 轮摘要）:

**前一会话** (2026-05-04，T16-17)

**会话目标**: 
1. 用户3项任务（系统性经验沉淀 + 文档精简约简 + 侧边栏bug修复）
2. **紧急修正**: 经验沉淀逻辑错配迁移
3. **系统性仓库整理**: 诊断+修复6个陈旧文件+重写TIMESTAMPS+建立分类标准+冗余识别
4. **三步走第一步 C1.1.7 补全**: G1.1-G1.4 全部完成
5. **三步走第二步 C1.1.8 党支书全视图**: G2.1-G2.4 全部完成
6. **三步走第三步 C1.5 DESIGN-OPT Phase D1**: G3.1-G3.4 + 8个渲染缺类修复 — 全部完成
7. **CLAUDE.md 圆桌审计 + C2.D2 组件重构 + 活动表单决策树精修**: 决策树精炼 + 表单三行重构 + 宣传委员试点打磨 + ASCII示意图
8. **专班制探索 + UI 修正 + C2.D3 视图重构**: 专班制完整探索→CLAUDE.md §C4 + 去 Q 徽标 + 三委员面板增强
9. **三委员视图维度标签收尾 + 文档全量同步 + SOP↔网页双向规则**: 确保三委员视图"突出"分工（人/事标签）+ SNAPSHOT v4 + TIMESTAMPS全刷新 + CLAUDE.md §C5 双向规则

| 任务 | 状态 | 关键产出 |
|------|------|---------|
| T1: 系统性经验蒸馏 | [Y] 完成 | insights §1.5-§1.6-§2.3-§3.6 (~90行)：三大理论创新(四维度框架/写入机制/多维表格) + 6项设计模式 + 上下文连续性方案 + 4条经验教训 |
| T1修正: 经验沉淀迁移 | [Y] 完成 | 从 copilot-instructions.md 完整移除错误添加的经验沉淀章节，经验内容正确归入 content/insights/ 人类文档 |
| T2: 文档精简约简 | [Y] 完成 | CLAUDE.md §C1.1.7/§C1.1.9/§C1.2/§C1.7/§C2/常为新原则 6处精简(~40行净减)；DESIGN_SYSTEM.md 模板→资料查询；ORGANIZATION_BUILDING_MODULE/COMMISSIONER_ORGANIZATION_ROLE last_updated更新 |
| T3: 侧边栏bug修复 | [Y] 完成 | events.js: commissioner-group分支开头添加 closeSidebar() 调用，修复点击条条支委后侧边栏不收回的bug |
| T4: C1.1.8 党支书全视图（三步走第二步） | [Y] 完成 | G2.1 书记专属面板 → G2.2 党课/大会独占按钮 → G2.3 8角色全局视图代理 → G2.4 统计卡片+赋权刷新 |
| **T5: C1.5 DESIGN-OPT Phase D1（三步走第三步）** | [Y] 完成 | G3.1 :root四层色盘(Layer 0-4) → G3.2 Tailwind对齐(party.DEFAULT+primary.950) → G3.3 body/html重写(font-size:16px+Firefox滚动条+text-size-adjust) → G3.4 排版工具类(.text-h1~overline共8级) + **紧急修复8个渲染缺类**(btn-secondary/party-stat-3个/commissioner-4个) |
| **T6: CLAUDE.md圆桌审计 + C2.D2 + 活动表单决策树精修（第7轮 2026-05-04）** | [Y] 完成 | ① CLAUDE.md §C穷举审计：C1.1.8 P0→[Y]同步；② 决策树精炼：场景二分(主题党日/三会一课)，移除长期活动重影(Q3独立)，组织生活会→内容形态；③ 表单重构：决策树三行分组 + Q1/Q2-Q4/选填 + ★必填+层级徽标；④ C2.D2全组件五态→🟢完成；⑤ 宣传委员试点打磨：宣传专班卡片+材料规范+周报截止；⑥ CLAUDE.md ASCII决策树示意图 |
| **T7: 专班制制度探索 + UI 修正 + C2.D3 视图重构（第8轮 2026-05-04）** | [Y] 完成 | ① 专班制完整探索→CLAUDE.md §C4 (定义/类型矩阵/条块衔接/生命周期/数据模型/路线图)；② UI 修正：去 Q 徽标+说明文字+"党小组轮值"→"按需指定"，表单回归干净；③ 组织委员面板增强(四阶段概览+泳道追踪)；④ 纪检委员面板增强(内控隔离+三指标)；⑤ C2.D3.1~D3.4 全绿 |
| **T8: 三委员视图维度标签收尾（第9轮 2026-05-04）** | [Y] 完成 | ① 三委员面板 tab 按钮全部添加 (人)/(事) 维度标签；② CSS .dim-tag 组件样式（蓝色=人/绿色=事）；③ 纪检 alternating 人-事-人-事 标签明确双维管理；④ 宣传全部 (事) / 组织全部 (人) 一维突出；⑤ 全文档同步：SNAPSHOT v4 + TIMESTAMPS 全刷新 + CLAUDE.md 陈旧引用修正 + CONTEXT §8.3 同步 |
| **T11: 主页入口 + 布局修正 + 数据架构指南 + CLAUDE.md 全重构（第12轮 2026-05-04）** | [Y] 完成 | ① 侧边栏新增"主页"入口（home SVG icon + data-module="dashboard"，默认active）；② 主页布局重排：左上=重要通知/右上=人员招募/下方=活动日历（全宽）；③ 新建 DATA_ARCHITECTURE.md（6章：10类数据分类/字段规范表/前端数据流/8×8权限矩阵/动态角色/附录）；④ CLAUDE.md 系统性重构（739→1022行）：按工程工作流重排为基建层/数据层/视图层/交互层/制度层/维护层 + 新增下轮启动清单15条 |

**本会话修改文件**（共14个）:
| 文件 | 变更 | 说明 |
|------|------|------|
| `content/guides/BRAND_ACTIVITY.md` | [重构] 脱水重建 | ~1,020→~200行，保留品牌活动案例+精神文件，删除AI误解的认定评分算法，对齐四维度框架 |
| `content/guides/COMMISSIONER_SYSTEM_DESIGN.md` | [新增] 新建 | 合并 COMMISSIONER_ORGANIZATION_ROLE.md + COMMISSIONER_GROUP_INTERACTION.md，消除权限矩阵重复 |
| `content/guides/COMMISSIONER_ORGANIZATION_ROLE.md` | [删除] 删除 | 内容已并入 COMMISSIONER_SYSTEM_DESIGN.md |
| `content/guides/COMMISSIONER_GROUP_INTERACTION.md` | [删除] 删除 | 内容已并入 COMMISSIONER_SYSTEM_DESIGN.md |
| `content/guides/ORGANIZATION_BUILDING_MODULE.md` | [修改] 添加分工声明 | 明确"侧重UI/模块层面"，引用 MANAGEMENT_MODE 和 COMMISSIONER_SYSTEM_DESIGN |
| `content/guides/MANAGEMENT_MODE_ARCHITECTURE.md` | [修改] 添加分工声明 | 明确"侧重角色权限/逻辑层面"，引用 ORGANIZATION_BUILDING 和 COMMISSIONER_SYSTEM_DESIGN |
| `content/guides/README.md` | [修改] 同步 | COMMISSIONER 合并 + BRAND 脱水描述更新 |
| `content/guides/DOCUMENTATION_MAP.md` | [修改] 同步 | 修复 COMMISSIONER 和 BRAND 引用，全部旧链接→新链接 |
| `content/guides/SOP优化提案反馈卡.md` | [修改] 陈旧修复 | related_files 路径全部更新 |
| `content/insights/党支部管理与实务经验沉淀.md` | [重构] 结构重建 | v3.0→v3.1：修复frontmatter+完整TOC+§1.5/§1.6/§2.4/§3.6插入+附录8→11条+排序修正 |
| `ARCHITECTURE.md` | [修改] 同步 | guides列表 COMMISSIONER 2→1，Activity数据模型, Liquid Glass→Flat Matte |
| `.ctx/SNAPSHOT.md` | [修改] 更新 | 日期+里程碑+物理拓扑+版本表同步 |
| `.ctx/TIMESTAMPS.md` | [修改] 全新 | 全面重写，新增遗漏文件+修正错误文件名+COMMISSIONER旧删除/新添加 |
| `.ctx/CONTEXT.md` | [修改] 同步 | §8.3本条目

### C1.1.7 补全（第5轮 2026-05-03）
| `index.html` | [新增] 新增 | #duration-input(短期/长期) + #direction-input(自上而下/自下而上) 维度选择器 |
| `src/events.js` | [修改] 修改 | G1.1 genBtn 读取 #activity-type-input → actPayload.activityType；G1.2 读取 duration/direction → actPayload；G1.3 assignedRoles localStorage 持久化 (_load/_save)；G1.4 direction==='bottom-up' 时强制校验 assignedRoles 白名单，未赋权则 showToast 报错阻断 |
| `src/constants.js` | [修改] 修改 | getActivityColor() 扩展 activityType 直映射 (theme-party/learning/meeting/long-term + 原党日日-X 兼容) |
| `CLAUDE.md` | [修改] 同步 | C1.1.7 P0→[Y]完成, G1.1-G1.4 → [Y]完成 |

### C1.5 DESIGN-OPT Phase D1（第6轮 2026-05-04） — 三步走第三步
| `src/styles.css` | [重构] 全面重写 | 1,707→1,937行：:root四层色盘(Layer 0 Party→1 Primary→2 Accent→3 Neutral→4 Surface) + --primary-700引用--party-red + --primary-950:#4A000A新增 + body font-size:16px基线 + text-size-adjust + text-rendering:optimizeLegibility + Firefox scrollbar-color + 排版工具类.text-h1~h3(3级)+.text-body-lg~body(3级)+.text-caption+overline(2级) + .btn-secondary(缺类) + .party-stat-card/party-stat-number/party-stat-label(3缺类) + .commissioner-panel/commissioner-tab-bar/commissioner-tab/commissioner-subtab-content(4缺类) |
| `index.html` | [修改] 修改 | Tailwind colors: party.DEFAULT+'red'+'gold'语义键 + primary.950对齐 + 大小写统一(#4A000A) |
| `CLAUDE.md` | [修改] 同步 | C1.5 P0→[Y]完成 + C2.D1.1~D1.4全绿 + G3.1-G3.4 → [Y]完成 + 三步走全标[Y] |

### CLAUDE.md圆桌审计 + C2.D2 + 决策树精修（第7轮 2026-05-04）
| `index.html` | [重构] 重构 | 党建工作台表单：决策树三行分组(Q1行→Q2-Q4行→选填行) + 场景简化为主题党日/三会一课 + 活动形式5选(移除长期活动) + ★必填标记+Q级徽标 + 宣传委员面板增强(宣传专班+材料规范+周报截止) |
| `src/styles.css` | [新增] 新增 | .form-tree-row / .form-tree-badge / .required-mark / .publicity-taskforce-card / .taskforce-member-chip / .taskforce-empty |
| `src/events.js` | [修改] 修改 | _updateManagerVisibility → 白名单 prop-commissioner+secretary 才可见赋权按钮 |
| `src/constants.js` | [修改] 修改 | ACTIVITY_CAT_COLOR 新增 visit/discussion/joint；getActivityColor 扩展；ACTIVITY_TYPE_LABELS 同步新值 |
| `CLAUDE.md` | [重构] 更新 | C1.1.8 P0→[Y]同步 + §C1.9E 决策树ASCII示意图 + C2.D2.1~D2.6全绿 + §C2头部D2已完工标注 |
| `.ctx/CONTEXT.md` | [修改] 同步 | T6 + 第7轮变更 + 会话日期5-7轮 |

### 专班制探索 + UI 修正 + C2.D3（第8轮 2026-05-04）
| `index.html` | [重构] 修改 | 表单去 Q 徽标+说明文字，回归干净长相 + 组织委员面板增强(四阶段概览+泳道追踪+空态) + 纪检委员面板增强(内控隔离+三指标+出勤/复盘) |
| `CLAUDE.md` | [新增] 新增 | §C4 专班制完整探索(定义/矩阵/衔接规则/生命周期/数据模型/路线图) + ASCII决策树「党小组轮值」→「按需指定党小组」 + C2.D3.1~D3.4 状态全绿 + §C2头部D3完工标注 |
| `.ctx/CONTEXT.md` | [修改] 同步 | T7 + 第8轮变更 |

### 三委员视图维度标签收尾 + 文档全量同步 + SOP↔网页双向规则（第9轮 2026-05-04）
| `index.html` | [修改] 修改 | 三委员面板全部 tab 按钮添加 (人)/(事) 维度标签 |
| `src/styles.css` | [新增] 新增 | .dim-tag / .dim-people / .dim-event 组件样式 |
| `.ctx/SNAPSHOT.md` | [重构] 更新 | v3→v4：新里程碑+版本表追加 |
| `.ctx/TIMESTAMPS.md` | [重构] 全量刷新 | 删旧(COMMISSIONER_ORGANIZATION_ROLE+GROUP_INTERACTION)+增新(COMMISSIONER_SYSTEM_DESIGN)+16个文件日期更新至2026-05-04+周期性任务重置+已删文件记录追加 |
| `CLAUDE.md` | [新增] 新增 + [修改] 修正 | §C5 SOP↔网页双向修改规则 + SOP实操化诊断 + 陈旧引用COMMISSIONER_GROUP_INTERACTION→COMMISSIONER_SYSTEM_DESIGN + last_updated更新 |
| `.ctx/CONTEXT.md` | [修改] 同步 | T8+T9 + 第9轮变更 + 会话日期9轮 + SNAPSHOT v3→v4 |

**三步走计划 §G 全三部曲：[Y][Y][Y] —— 全部收官**

**未解决阻塞项**: 无

---

## 5. 仓库结构

```
/
├── README.md                    [人]  对外门面
├── ARCHITECTURE.md              [人机] 核心架构说明
├── CLAUDE.md                   [人机] 未来执行路线图
├── index.html                   [人机] UI 入口
├── src/                         [人机] 代码实现层
│   └── workflow/                [人机] SOP 规则引擎
├── content/                     [人机] 内容中心
│   ├── SOP/                     [人机] 制度母本层
│   ├── guides/                  [人机] 操作指南
│   ├── insights/                [人机] 经验沉淀
│   └── references/              [人]  官方底线（只读）
├── .github/                     [AI]  Agent 治理层（不可变动）
│   ├── copilot-instructions.md  [AI]  宪章
│   ├── SSOT_INDEX.md            [AI]  母本注册表
│   ├── agents/ (10)             [AI]  Agent 配置
│   └── skills/ (10)             [AI]  Skill 定义
├── .ctx/                        [AI]  运行时上下文
│   ├── CONTEXT.md               [AI]  本文件
│   ├── TIMESTAMPS.md            [人机] 时间戳注册表
│   ├── SNAPSHOT.md              [AI]  活跃快照
│   └── logs/                    [人机] 月度执行日志
└── assets/                      [人]  静态资源
```

---

## 6. Agent 注册表（摘要）

| Agent | 类型 | 职责 | Handoffs |
|-------|------|------|----------|
| 秘书处 | 协调型 | 计划拆解、排序 | [Y] |
| 组织部 | 执行型 | 文档规范、术语治理 | [Y]→档案馆 |
| 发改委 | 执行型 | 文本母本治理 | [Y]→档案馆 |
| 工信部 | 执行型 | 代码+SOP映射 | [Y]→档案馆 |
| 外交部 | 执行型 | UI交互 | [Y]→档案馆 |
| 司法部 | 执行型 | 违宪审查 | [Y]→档案馆 |
| 检察院 | 审查型 | 三层合规审查 | [N] |
| 机关党委 | 监督型 | 宪章+架构监督 | [N] |
| 社科院 | 分析型 | 经验提炼 | [N] |
| 档案馆 | 记录型 | 日志归档 | [N] |

---

## 7. 钩稽联动规则

任何文件变更必须沿钩稽链传播，禁止孤立修改：
- copilot-instructions.md → agents/*.md + skills/*.md
- SSOT_INDEX.md → 受影响 agents
- CLAUDE.md → ARCHITECTURE.md + README.md
- content/SOP/ → src/workflow/ + SSOT_INDEX.md
- .ctx/ 结构变更 → 本文件 §5

断链须在执行日志中标记 `[WARNING] 钩稽断链`
