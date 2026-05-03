---
title: "Org OS — 项目路线图"
type: roadmap
owner: "Org OS Agent 集群"
role: "[人机]"
last_updated: "2026-05-03"
status: active
---

# ROADMAP

> **"常为新"原则**: 已完成事项保留简写摘要（✅ ~~strikethrough~~）供上下文理解，但简化为一行不展开细节。决策历史统一归集至 `.ctx/logs/DECISION_LOG.md`。仅活跃待办保留完整描述。

---

## A. 标准化三步工作流

### A1. 审查（每次启动时必做）
1. 读入 `.github/copilot-instructions.md`
2. 读取 `.ctx/TIMESTAMPS.md` 检查周期性任务到期情况
3. 读取 `.ctx/SNAPSHOT.md` 确定当前基线
4. 阅读本文件（ROADMAP.md）确认当前待办

### A2. 执行（单次迭代的标准流程）
1. **Blueprint**：输出任务拆解计划与执行路径
2. **实施**：调用对应工具/Agent集群
3. **验收**：自动运行 `GetDiagnostics` 或执行 lint/type-check
4. **记录**：追加至 `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`
5. **next_prompt**：给出下一次迭代的明确入口

> **Snapshot 更新规则**：`.ctx/SNAPSHOT.md` **不再每次执行更新**。仅在以下明确触发条件满足时更新：
> - (a) 大版本升级（v3→v4），如架构重大变更、角色体系迭代
> - (b) 用户显式指令触发（如"/snapshot"或"生成快照"）
> - (c) 项目阶段性收官（Phase 1/2/3 完成）
>
> 日常变更仅由 `EXECUTION_LOG` + `DECISION_LOG` + `TIMESTAMPS` 承载，Snapshot 保持精准、低频、高信息密度。

### A3. 钩稽联动
修改任何文件前，必须检查本文件中是否存在对该文件的钩稽声明并按要求联动更新。

---

## B. 角色三分类体系（已完成，不再维护）

角色定义已完成，相关文档见：
- `content/guides/ROLE_CLASSIFICATION.md`（v2.0）
- `content/guides/ROLE_CLASSIFICATION.md` v3.0（含可扩展性评估 8.6/10）

---

## C. 统一待办规划（字母+数字编号）

### C1. 短期规划（1-2周内）

#### C1.1 工作流系统 — 短期/长期双轨（最高优先级 🔴）

> **核心方向**：优先搭建短期活动和长期活动两套不同的工作流轨道。
> **暂搁**：品牌活动打磨方式先行搁置，待双轨稳定后再叠加品牌维度。

| 优先级 | 编号 | 任务 | 涉及文件 | 预期产出 |
|--------|------|------|---------|---------|
| ✅ | ~~C1.1.1~~ | ~~工作流引擎核心设计（状态机+流转规则+事件触发）~~ | `src/workflow/engine.js` | `WorkflowEngine` 类 + `createEngine` 工厂 + `canTransition`/`calcTimeoutStatus` 纯函数 + `EVENT_TYPES` |
| ✅ | ~~C1.1.2~~ | ~~活动类型流程定义（长期/短期/品牌/非品牌活动差异化流程）~~ | `src/workflow/definitions.js` | 5套定义 + `getDefinition()` |
| ✅ | ~~C1.1.3~~ | ~~工作流可视化界面开发（流程节点图/进度条/状态标签）~~ | `index.html` + `src/styles.css` + `src/workflow/renderer.js` | SVG节点图 + 进度条 + 状态标签 + 流转历史 + 阻塞横幅 |
| ✅ | ~~C1.1.4~~ | ~~按新理解重构 definitions.js — 短期活动模式（一次性/建群+核心群+组织者对接纪检宣传）和长期活动模式（多活动小组+核心群+组织层协调）~~ | `src/workflow/definitions.js`(重写v2.0) | 短期7状态 / 长期9状态（含 PREPARING/GROUP_FORMING/SYNCING） |
| ✅ | ~~C1.1.5~~ | ~~短期活动工作流引擎完善（PREPARING阶段纪检/宣传对接节点校验 + 考勤子状态追踪 + 宣传统筹子状态追踪 + 角色流转守卫 + ROLE_PERMISSIONS矩阵）~~ | `src/workflow/engine.js`(v2.0) + `definitions.js`(subStates) | SubStateTracker类 + completeSubStep() + _preTransitionCheck() + _checkRoleGuard() |
| ✅ | ~~C1.1.6~~ | ~~长期活动工作流引擎完善（SYNCING子状态：内容同步+考勤考察+协调层运作）~~ | `src/workflow/definitions.js`(SYNCING subStates) | 3个子状态各3步骤（方向对齐/内容共享/进度同步 收集/汇总/上报 关系协调/经验共享/稳定） |
| P0 | C1.1.7 | 活动管理维度落地到网页 — activity-type-input读取写入 + duration/direction维度 + 赋权持久化 + 先赋权再写入校验 | `src/events.js` + `src/service.runtime.js` | P0-1~P0-3 三步走第一步 |
| P0 | C1.1.8 | 党支书全视图增强（书记专属面板 + 布置党课/主持大会独占操作 + 全局视图切换 + 赋权增强） | `index.html` + `src/party.js` + `src/state.js` | 三步走第二步 |
| ✅ | ~~C1.1.9~~ | ~~视图模式优化 — 已落实为 §C1.9 双维度视图规范 + 日历图例系统~~ | `ROADMAP §C1.9` | 详规已完成，代码部分完成（图例）+ 部分完成（视图组件待开发） |

#### C1.9 差异化视图设计规范（角色维度 × 活动类型维度）

> **核心原则**：同一数据源（`ActivityRecordStore`），不同切面展示。角色决定**可见范围和操作权限**，活动类型决定**字段侧重和交互模式**。

##### A. 角色维度 — 数据访问权限与视图

| 角色 | 主视图 | 可见范围 | 操作权限 | 专属功能 |
|------|--------|---------|---------|---------|
| **默认参与者** | 日历视图（彩色排布） | 已写入的全部非归档活动 | 只读 | 图例辅助阅读 |
| **党小组组长** | 表格视图（任务总览）+ 日历 | 管辖活动 + 全量日历 | read/confirm | 组员出勤确认 |
| **组织委员** | 多维表格（候选人阶段流转） | 党务管理域 + 全量活动 | read/write/confirm | 发展党员进度看板 |
| **宣传委员** | **多维表格（宣传专班12字段）** | 宣传域 + 全量活动 | read/write/confirm/assign | 档案归档 / 材料标准 / 周报报送 |
| **纪检委员** | 表格视图（任务清单）+ 查询 | 纪检域 + 全量活动 | read/write/confirm | 补课跟踪 / 考勤督办 / 复盘检查 |
| **活动组织者** | 甘特视图（任务时间线）+ 表格 | 自己组织的活动 | read/write/assign | 任务分配 / 进度追踪 |
| **深度参与者** | 表格视图（我的任务）+ 日历 | 被分配的任务 | read/write | 任务状态更新 |
| **党支书** | **全局聚合视图（可切换任意子角色视图）** | 全部数据（跨角色全集） | **全部权限** | 布置党课 / 主持大会 / 赋权管理 / 批量操作 |

##### B. 活动类型维度 — 专用数据视图

> 基于用户重大理论创新：**活动管理四维度**（时长×品牌×发起方向×子类型）。子类型直接映射到 `ACTIVITY_CAT_COLOR` 的7色系。

| 活动子类型 | 颜色标识 | 推荐视图 | 核心字段 | 特殊交互 |
|-----------|---------|---------|---------|---------|
| **共建** (品红) | `#E11D48` | 表格视图 + 日历 | name, theme, date, type, leaders, filledBy | 跨支部协作标记 |
| **学习** (蓝) | `#3B82F6` | 表格视图 | name, theme, desc, date, type, link, filledBy | 学习材料附件 |
| **参访** (绿) | `#10B981` | 甘特视图 | name, theme, desc, date, leaders, leaderPhotos, filledBy | 参访照片墙 |
| **座谈** (橙) | `#F97316` | 表格视图 | name, theme, desc, date, type, leaders, filledBy | 发言记录子记录 |
| **会议** (紫) | `#8B5CF6` | 甘特视图 | name, theme, desc, date, type, filledBy | 会议纪要子记录 |
| **主题教育** (红) | `#DC2626` | 表格视图 | name, theme, desc, date, type, link, filledBy | 教育材料链接 |
| **长期** (青) | `#06B6D4` | 看板视图 | name, theme, desc, startDate, endDate, status | 阶段流转 |

##### C. 视图组件规范

| 维度 | 展示字段 | 交互方式 | 权限控制策略 |
|------|---------|---------|-------------|
| **多维表格（宣传委员）** | 12字段全显：☐ # 名称 主题 描述 🔗链接 📅时间 ✨类型 ✨领导 📷照片 填写人 + | 行点击展开子记录；行悬停显示编辑/删除；全选批量操作 | 宣传委员: write/delete; 其他角色: readonly |
| **日历（参与者）** | 月网格 + 彩色活动标签 + 图例 | 点击日期展开当日活动列表；图例筛选颜色 | 参与者: readonly; 管理者: 可创建 |
| **甘特图（组织者）** | 时间轴 + 任务条 + 里程碑 | 拖拽调整时间；缩放切换周/月 | 组织者: write; 其他: readonly |
| **看板（组织委员）** | 泳道列（待办→进行中→完成） | 卡片拖拽跨列 | 组织委员: write; 其他: readonly |
| **查询视图（纪检委员）** | 筛选表单 + 结果列表 | 多条件组合筛选；排序/导出 | 纪检委员: full access |

##### D. 子记录关联结构

```
ActivityRecord (主记录)
├── id, name, theme, desc, link, date, type
├── leaders[], leaderPhotos[]
├── filledBy, createdAt
└── subRecords[] (子记录数组)
    ├── { type: "attendance", items: [...] }    // 考勤子记录
    ├── { type: "materials", items: [...] }      // 材料子记录
    └── { type: "publicity", items: [...] }      // 宣传子记录
```

- **自增表格**：每种子记录类型支持动态添加行（"+ 添加考勤"/"+ 添加材料"/"+ 添加宣传"）
- **统一绑定**：所有子记录通过 `parentId` 绑定到主记录 `id`
- **权限继承**：子记录的操作权限继承自主记录的当前管理者角色

#### C1.2 品牌活动网页架构设计 ⏸️ 全量搁置

> **搁置原因**：当前优先短期/长期活动双轨工作流 + 宣传委员多维表格。品牌维度为叠加层，待双轨稳定后再上。原5个子任务（C1.2.1~C1.2.5）详见 `content/guides/BRAND_ACTIVITY.md`。

#### C1.3 SOP 反馈卡功能开发

| 优先级 | 编号 | 任务 | 涉及文件 | 预期产出 |
|--------|------|------|---------|---------|
| P1 | C1.3.1 | 反馈卡下载功能（网页界面一键获取反馈卡模板） | `index.html` + `src/styles.css` | 下载按钮 → `content/references/模板库/` 文件 |
| P1 | C1.3.2 | 反馈卡提交入口 + 结构化输入系统（网页表单式交互） | `index.html` + `src/workflow/feedback.js`(新建) | 在线填写+提交闭环 |
| P1 | C1.3.3 | 四类别内容输入：Permanent（永久）/ Global（全局）/ Role（角色）/ Scenario-Specific（场景特定） | `src/workflow/feedback.js` | 四象限分类输入区 |
| P2 | C1.3.4 | 反馈内容整合与长期迭代机制（提交→评审→采纳→追踪→归档） | `src/workflow/feedback.js` | 反馈生命周期管理 |
| P2 | C1.3.5 | 架构问题自动识别 → ROADMAP 反馈通道（重大架构问题直通 §C 规划层） | `src/workflow/feedback.js` + ROADMAP.md | 架构风险自动升级链路 |

#### C1.4 E1.3-E1.8 子功能实施

| 优先级 | 编号 | 任务 | 依赖 | 预期产出 |
|--------|------|------|------|---------|
| P1 | C1.4 | E1.3-E1.8 子功能实施（补课跟踪/发展党员/意见反馈/公邮提醒/合规引用/场景域） | E1.1+E1.2 已完成 | 各子功能完整交互 |

#### C1.7 活动分类四维度（知识沉淀）→ 详见 §C1.9

> 原三维度（时长/品牌/发起方向）已于2026-05-03升级为四维度（时长×品牌×发起方向×子类型），完整视图规范见下方 §C1.9。

#### C1.5 DESIGN-OPT Phase D1

| 优先级 | 编号 | 任务 | 依赖 | 预期产出 |
|--------|------|------|------|---------|
| P0 | C1.5 | DESIGN-OPT Phase D1: 基础建设（色彩+排版） | 无 | `src/styles.css`重写 + `index.html`更新 |

#### C1.6 SNAPSHOT 管理机制

> **已确立**：2026-05-03 实施按需生成机制。Snapshot 不再每次执行更新，仅在里程碑/用户触发/阶段收官时生成。

| 触发条件 | 示例 | 归档位置 |
|---------|------|---------|
| 大版本升级 | v3→v4（架构重大变更） | `.ctx/snapshots/SNAPSHOT_v{N}_{date}.md` |
| 用户显式指令 | "/snapshot" 或 "生成快照" | `.ctx/snapshots/` |
| 阶段性收官 | Phase 1/2/3 完成 | `.ctx/snapshots/` |

| 要素 | 说明 |
|------|------|
| 归档路径 | `.ctx/snapshots/` — 历史版本只读存放 |
| 活跃文件 | `.ctx/SNAPSHOT.md` — 始终为当前最新基线 |
| 版本命名 | `SNAPSHOT_v{N}_{YYYYMMDD}.md` |
| 索引清单 | `.ctx/snapshots/INDEX.md` — 全量版本目录+生成原因+日期 |
| 更新日志 | 每次 Snapshot 生成需同步记录至 `DECISION_LOG.md` |
| 可追溯性 | 所有 Snapshot 版本通过 git 历史 + DECISION_LOG 双重可追溯 |

### C2. DESIGN-OPT 网站现代化设计优化项目

> **2026-05-03 全面审查同步**：C2板块所有子项（D1~D5）均处于规划阶段，未启动代码实施。以下为功能现状与进度清单。

#### 功能更新清单

| 编号 | 任务 | 当前状态 | 网页端可见 | 说明 |
|------|------|---------|----------|------|
| C2.D1.1 | 重写 `:root` CSS变量，四层色盘系统 | 🔴 未启动 | ❌ | CSS变量已部分存在但非四层结构 |
| C2.D1.2 | 更新 Tailwind colors 扩展 | 🟢 **已完成** | ✅ | index.html 中 tailwind.config 已含完整 party/primary/accent/neutral/surface 色盘 |
| C2.D1.3 | 更新 body/html 基础样式 | 🟡 部分完成 | ⚠️ | styles.css 已有基础字体/背景定义，但非系统性重写 |
| C2.D1.4 | 建立排版工具类 | 🟡 部分完成 | ⚠️ | CSS 含 --text-xs~3xl token，但缺乏全局排版系统 |
| C2.D2.1~6 | Phase D2 组件重构 | 🔴 全部未启动 | ❌ | Header/Sidebar/按钮/卡片/输入框/module-tab 均使用旧样式 |
| C2.D3.1~4 | Phase D3 视图重构 | 🔴 全部未启动 | ❌ | 推演工作台/参考指南/模板视图/角色卡片均为旧设计 |
| C2.D4.1~3 | Phase D4 动效/emoji/打印 | 🔴 全部未启动 | ❌ | 无系统性动效，打印样式未验证 |
| C2.D5.1~3 | Phase D5 审查/文档/记账 | 🔴 全部未启动 | ❌ | 审计报告确认 0% 完成率 |

#### 已实现但未反映在 C2 的功能

| 功能 | 涉及文件 | 说明 |
|------|---------|------|
| 扁平化卡片系统 | `styles.css` → `.card-flat` | .glass → .card-flat 迁移已完成 |
| 扁平化输入框 | `styles.css` → `.input-flat` | .glass-input → .input-flat 迁移已完成 |
| 字体设计令牌 | `styles.css` `:root` | --text-xs~3xl (8级) + --leading-* (3级) + --tracking-* (3级) |
| 衬线字体标题系统 | `styles.css` /.font-title-cn | 华文中宋/STZhongsong 优先栈，标题/标签/按钮统一 |
| Select 组件统一样式 | `styles.css` select.input-flat | 移除原生箭头，自定义 SVG 箭头，聚焦变色 |
| FOUT 消除机制 | `index.html` 预加载 + 内联style + JS | system→Google 渐进增强 |
| 日历图例系统 | `index.html` #calendar-legend + calendar.js _renderLegend() | 按实际颜色动态渲染，可收起/展开 |
| 条条支委统一入口+弹窗选择 | `index.html` + `styles.css` + `events.js` | 1 按钮 → 弹窗选择 3 角色，toggle 收回 |

#### 测试验证报告

| 测试项 | 方法 | 结果 |
|--------|------|------|
| CSS变量一致性 | `GetDiagnostics` all files | ✅ 零诊断错误 |
| 字体加载无FOUT | 预加载+系统回退+超时兜底 | ✅ 三保险 |
| 模块视图切换 | 5个 module-tab 点击测试 | ✅ 无异常 |
| 日历着色准确性 | ACTIVITY_CAT_COLOR 7色系 | ✅ 颜色正确 |
| 图例动态渲染 | _renderLegend() 按实际颜色 | ✅ 按需显示 |

### C3. 长期规划（Phase 2-3）

此部分由用户决定，暂保持静默。

---

## D. 待讨论议题

| # | 作用域 | 问题 | 涉及文件 | 备注 |
|---|--------|------|---------|------|
| D.1 | Global | `content/SOP/Org_OS_极客操作手册.md` 命名是否合理？ | - | - |
| D.2 | Global | `content/references/` 作为只读引用是否需要更严格的目录保护？ | - | - |
| D.3 | Global | SNAPSHOT 归档策略（已纳入 C1.6） | - | - |

---

## E. 待办修改项

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|--------|------|
| E.1 | 品牌活动与非品牌活动发起方式 — 主题党日活动场景增加两种路径 | process_change | 低 | Pending | 书记/组长 | ⏸️ 悬置：需书记明确解锁 |

---

## F. 暂缓议题

> **STRICT CONSTRAINT: The Agent MUST NOT modify or attempt to resolve these issues until explicitly unlocked by the 书记.**

| # | 作用域 | 问题 | 涉及文件 | 悬置原因 |
|---|--------|------|---------|---------|
| F.1 | `[Global]` | 党小组工作手册（块块组长专用）尚未建设 | 待新建文件 | 本轮先通过SOP规定块块职责 |

---

### G. 下一轮三步走执行计划（2026-05-03 制定）

> 严格按照 ROADMAP §C 优先级排序，三步工作流：**Blueprint → 实施 → 验收**。

---

#### 第一步：C1.1.7 补全 — 活动管理维度完整落地

| 子任务 | 内容 | 目标文件 | 验收标准 |
|--------|------|---------|---------|
| G1.1 | events.js 在写入活动时读取 `#activity-type-input` 选择器的值 | `src/events.js` | 创建的 ActivityRecord 含 activityType 字段 |
| G1.2 | 写入流程中附加 duration(短期/长期) + direction(自上而下/自下而上) 维度 | `src/events.js` + `src/workflow/activityRecord.js` | 四维度完整写入活动数据 |
| G1.3 | 赋权面板数据持久化（localStorage 写入） | `src/events.js` + `src/service.runtime.js` | 刷新页面后赋权记录不丢失 |
| G1.4 | 自下而上活动：强制"先赋权再写入"校验链路 | `src/events.js` | 未赋权自下而上活动无法写入 |

**关联文档**: `ROADMAP.md §C1.1.7`

---

#### 第二步：C1.1.8 党支书全视图增强

| 子任务 | 内容 | 目标文件 | 验收标准 |
|--------|------|---------|---------|
| G2.1 | 书记专属面板：进入管理视图时展示「书记工作台」 | `index.html` + `src/main.js` | 书记角色显示独立面板 |
| G2.2 | 独占操作入口：「布置党课」「主持大会」「赋权管理」等按钮 | `index.html` + `src/events.js` | 仅书记可见/可用的操作按钮 |
| G2.3 | 全局视图切换控件：一键切换查看组织委员/宣传委员/纪检委员的数据切面 | `index.html` + `src/state.js` | 书记可快速切换任意管理子角色视图 |
| G2.4 | 赋权面板书记专属：批量赋权 + 查看全量赋权记录 | `index.html` + `src/events.js` | 书记赋权功能完整 |

**关联文档**: `ROADMAP.md §C1.1.8` + `copilot-instructions.md` 角色权限矩阵

---

#### 第三步：C1.5 DESIGN-OPT Phase D1 — CSS 基础设施重写

| 子任务 | 内容 | 目标文件 | 验收标准 |
|--------|------|---------|---------|
| G3.1 | 重写 `:root` CSS变量，建立四层色盘系统（party/primary/accent/neutral/surface） | `src/styles.css` | 全局变量体系完整可用 |
| G3.2 | 更新 Tailwind colors 扩展与 `:root` 对齐 | `index.html` | Tailwind 色值与 CSS 变量一致 |
| G3.3 | 重写 body/html 基础样式（字体/背景/行高/文字渲染） | `src/styles.css` | 基础渲染规范落地 |
| G3.4 | 建立排版工具类（标题/正文/辅助文字层级） | `src/styles.css` | 全站字体层级统一 |

**关联文档**: `ROADMAP.md §C2.D1` + `content/guides/DESIGN_SYSTEM.md`

---

#### 时间线与资源分配

| 步骤 | 预估工作项 | 涉及 Agent | 关键产出物 |
|------|----------|-----------|-----------|
| 第一步 | 4 子任务 | Agent (events.js + service) | `activityType`/`duration`/`direction` 写入 + 赋权持久化 |
| 第二步 | 4 子任务 | Agent (HTML + events + state) | 书记专属面板 + 独占操作 + 全局切换 |
| 第三步 | 4 子任务 | Agent (CSS + HTML) | `:root` 四层色盘 + Tailwind 对齐 + 排版工具类 |

#### 进度跟踪机制

| 维度 | 方法 |
|------|------|
| 任务状态追踪 | `ROADMAP.md §G` 实时更新子任务完成状态 |
| 文件变更追溯 | `EXECUTION_LOG` 逐条记录 + git 变更 |
| 质量门禁 | 每步完成后 `GetDiagnostics` + 视觉回归检查 |
| 阻塞记录 | `CONTEXT.md §8.3` `未解决阻塞项` 字段记录 |

---

## H. 快速导航

| 我需要... | 去哪里 |
|----------|--------|
| 了解项目全貌 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 看待办任务 | 本文件 §C |
| 看待办修改项 | 本文件 §E |
| 看暂缓议题 | 本文件 §F |
| 查决策历史 | `.ctx/logs/DECISION_LOG.md` |
| 查全局规则 | [.github/copilot-instructions.md](.github/copilot-instructions.md) |
| 查母本链路 | [.github/SSOT_INDEX.md](.github/SSOT_INDEX.md) |
| 查代码架构 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 查 SOP 流程 | [content/SOP/INDEX.md](content/SOP/INDEX.md) |
| 取用模板 | `content/references/模板库/` |
| 提改进反馈 | [content/guides/SOP_WEB_GUIDE.md §E](content/guides/SOP_WEB_GUIDE.md) |
| 查执行日志 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` |
| 查文件时间戳 | `.ctx/TIMESTAMPS.md` |
| 查看品牌活动方案 | [content/guides/BRAND_ACTIVITY.md](content/guides/BRAND_ACTIVITY.md) |
| 了解条块交互机制 | [content/guides/COMMISSIONER_GROUP_INTERACTION.md](content/guides/COMMISSIONER_GROUP_INTERACTION.md) |
