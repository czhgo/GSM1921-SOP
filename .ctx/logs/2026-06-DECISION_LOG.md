---
title: "2026年6月决策日志"
type: log
role: "[机]"
last_updated: "2026-07-01"
---

# 2026年6月决策日志

> 本文件记录2026年6月的所有非显而易见的决策。

## D-216 2026-06-14 — "写入型 vs 支撑型"角色分类确立

### 背景
书记指出"管理"和"服务"的逻辑需要区分清楚，特别是写入guides文件中作为理论基础。经分析，仓库中"管理"已有三层明确含义（双域管理/管理模式/三级管理），引入"管理型vs服务型"会造成概念冲突。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 用"写入型 vs 支撑型" | 按数据写入权限区分角色 | 概念清晰，与代码层canWriteActivity()对齐，不与现有"管理"概念冲突 |
| B. 用"管理型 vs 服务型" | 按职能性质区分角色 | "管理"概念与仓库现有三层含义冲突，"服务"不是仓库正式概念 |

### 决定
A. 用"写入型 vs 支撑型"角色分类。

### 理由
1. 仓库中"管理"已有三层含义，引入新含义造成概念冲突
2. "写入 vs 支撑"更准确描述实际区分维度——写入型角色可直接创建/修改活动数据，支撑型角色通过审核/确认/备案间接参与
3. 与代码层 `canWriteActivity()` 函数对齐，可验证
4. "支撑型"不等于"附属性"——宣传委员和纪检委员在各自职能域内具有独立性和专业权威

### 影响范围
- TERMINOLOGY.md §2.5（已新增）
- MANAGEMENT_MODE.md（需补充宣传/纪检在党建域的正式定位）
- SOP_WEB.md（需将"服务于"零散表述提炼为写入门禁原则）

### 一改具改检查
- [x] TERMINOLOGY.md §2.5 已新增"写入型 vs 支撑型"角色分类
- [x] MANAGEMENT_MODE.md §2a 补充写入型vs支撑型分类+写入门禁原则
- [x] SOP_WEB.md B.3 新增写入门禁原则小节 + B.5 权限函数注释

## D-217 2026-06-14 — 表格视图转置原则

### 背景
书记指出表格视图区分"长视图"和"宽视图"不是本意，本意是"转置"——可以是人的视图，也可以是活动/专班视图，两者互为转置关系。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 保留"长格式/宽格式"命名 | 按数据形态命名 | 命名不反映语义，用户难以理解切换含义 |
| B. 改为"人视图/活动视图" | 按观察维度命名 | 语义清晰，体现转置关系，与书记意图一致 |

### 决定
B. 统一使用"人视图/活动视图"（或"人视图/阶段视图"），体现转置关系。

### 理由
1. "长/宽"描述的是数据形态，不是用户意图
2. 转置的核心是观察维度的切换——"看人"还是"看活动"
3. 命名应反映语义，让用户一眼理解切换含义

### 影响范围
- ws-disc-commissioner-entry.js（考勤/考察总表按钮标签已修改）
- party.js（候选人追踪看板已改为表格+转置切换）
- MANAGEMENT_MODE.md §8.1b（新增转置原则）

### 一改具改检查
- [x] ws-disc-commissioner-entry.js 按钮标签已修改
- [x] party.js 候选人追踪已改为表格+转置
- [x] MANAGEMENT_MODE.md §8.1b 转置原则已写入

## D-218 2026-06-14 — 文档权威层级：SOP与guides正交维度模型（P.13 决策）

### 背景
M5 审查发现 DOC_MAP 的层级排序与 OPERATIONS_GUIDE §7.1 存在4处系统性矛盾：guides vs SOP 顺序、ARCHITECTURE.md 层级、references 层级、CLAUDE.md 是否最高。核心问题是 SOP 和 guides 谁在上谁在下。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 以 OPERATIONS_GUIDE §7.1 为准 | guides > SOP > 代码，CLAUDE.md 最高 | DOC_MAP 需大幅重构 |
| B. 以 DOC_MAP 现有排序为准 | SOP > guides | OPERATIONS_GUIDE 需改写 |
| C. SOP 与 guides 为正交维度 | 不排先后，按维度分类 | 两个文件都需重构层级模型 |

### 决定
C. SOP 与 guides 为正交维度，不排先后。CLAUDE.md 为最高层上下文入口。

### 理由
1. SOP 是执行细节（怎么做），guides 是理念概括（为什么这样做）——两者不是同一维度的内容，无法简单排序
2. CLAUDE.md 作为系统层级的上下文，承接理念和具体细节，是快速恢复上下文和实现 HARNESS 的入口
3. 线性排序（谁在上谁在下）是错误的问题框架——正确的问题是"它们各自解决什么问题"

### 影响范围
- OPERATIONS_GUIDE.md §7.1（层级模型需重构为正交维度）
- DOC_MAP.md（层级排序需重构为正交维度）
- CLAUDE.md（丙部P.13退出）

### 一改具改检查
- [x] OPERATIONS_GUIDE.md §7.1 层级模型重构为正交维度
- [x] DOC_MAP.md 层级排序重构为正交维度（Layer 2理念维度+Layer 3执行维度）
- [x] CLAUDE.md 丙部P.13退出

## D-219 2026-06-14 — 登录系统实现路径（P.14 决策）

### 背景
LOGIN_STUB.md v2.0 已完成设计文档，但实现路径取决于部署环境和开发节奏。需要决定登录页面实现方式和认证方式。

### 选项
第一步：独立登录页 vs 侧边栏内嵌登录
第二步：Mock 登录 vs 直接对接学校 SSO

### 决定
第一步：A. 独立登录页（新增 login.html）
第二步：A. Mock 登录（开发优先，后续对接 SSO）

### 理由
1. 独立登录页流程清晰，与现有角色选择器解耦，便于后续对接 SSO
2. Mock 登录可快速出原型，验证权限体系和视图切换逻辑，不依赖外部服务
3. 后续对接 SSO 时只需替换认证层，不影响登录页 UI 和权限逻辑

### 影响范围
- 新增 docs/login.html + docs/src/entries/login-entry.js
- auth.js 扩展（Mock 认证逻辑）
- 所有页面需增加未登录→跳转登录页的逻辑

### 一改具改检查
- [x] login.html 创建
- [x] login-entry.js 创建
- [x] auth.js Mock 认证逻辑扩展（LOGIN_STANCE动态化+setLoginStance+logout）
- [x] bootstrap.js 登录检查（未登录跳转login.html）
- [x] sidebar.js 退出登录按钮
- [x] CLAUDE.md 丙部P.14退出

## D-220 2026-06-14 — 移除站位选择器（P.15 伪问题纠正）

### 背景
P.15 提交了"站位选择器去留"的丙部条目，前提是"移除会失去管理者只读功能"。书记指出这是错误理解：管理者只读由【用户身份】+【浏览页面】决定，不由下拉框决定。登录系统已确定身份，侧边栏确定页面，站位选择器纯粹多余。

### 选项
无选项——这是基于错误前提的伪问题，直接移除。

### 决定
移除站位选择器。同时写入 Harness 补丁：提交丙部前必须验证理解正确性。

### 理由
1. 站位选择器是 Mock 登录的替代品，登录系统上线后完全冗余
2. 视图模式（管理模式/只读模式）由身份+页面派生，不依赖站位切换器
3. AI 基于错误理解提交了丙部条目，浪费书记时间——需写入制度防止再犯

### 影响范围
- header.js（移除站位切换器 UI+逻辑）
- auth.js（移除 getStanceOptions）
- permission-manager.js（移除 switchStance）
- sidebar.js（移除 stance-change 事件监听）
- CLAUDE.md H5.2（新增理解验证补丁 D-220）

### 一改具改检查
- [x] header.js 站位切换器移除
- [x] auth.js getStanceOptions 移除
- [x] permission-manager.js switchStance 移除
- [x] sidebar.js stance-change 监听移除
- [x] LOGIN_STUB.md 标注已移除
- [x] SOP_WEB.md 模式流转图更新
- [x] CHECKLIST.md switchStance 移除
- [x] CLAUDE.md H5.2 理解验证补丁写入
- [x] CLAUDE.md 丙部P.15退出

## D-221 2026-06-26 — P.16 SOP一致性修复方向决策

### 背景
审计content/SOP/发现5个P0级一致性问题，AI无法自行判断正确版本，提交丙部P.16。书记做出三步决策。

### 选项
- 第一步（组织架构数量）：A. 5名支委兼组长 / B. 3名块块组长
- 第二步（思想汇报流向）：A. 党员直交组织委员 / B. 纪检转交 / C. 纪检自行归档
- 第三步（其他P0修复策略）：A. AI统一修复 / B. 逐项确认

### 决定
- **第一步：B**（3个党小组3个组长）。删除"5名支委兼组长"表述。书记原则："职务是职务，职权跟着职务走，人可以兼任。这不影响操作逻辑"
- **第二步：A**（党员直交组织委员归档）
- **第三步：A**（AI统一修复章节编号/YAML日期/版本号）

### 理由
1. 实际组织架构是3个党小组，每个党小组1个组长——事实如此
2. "5名支委兼组长"是把职务和人员身份混淆，应区分职务与兼任
3. 思想汇报由党员直接交给组织委员归档，纪检委员不介入此流程，仅负责考勤考察
4. P0问题中的编号/日期/版本号属技术性不一致，AI按权威源统一修复高效

### 影响范围
- content/SOP/党小组组长工作手册.md（删除"5名支委兼组长"表述，修正章节编号）
- content/SOP/常见工作场景快速指南.md（修正版本号冲突）
- content/SOP/各文件YAML last_updated统一
- content/SOP/思想汇报流向三处统一为"党员→组织委员归档"

### 一改具改检查
- [ ] 删除"5名支委兼组长"表述
- [ ] 修正章节编号错乱
- [ ] 统一思想汇报流向为"党员直交组织委员"
- [ ] 统一YAML last_updated与页脚日期
- [ ] 修正版本号冲突
- [ ] CLAUDE.md丙部P.16退出
- [ ] 执行日志T21记录

## D-222 2026-06-30 — 探索工作动画区分对待原则

### 背景
v4.3.5 探索工作 SVG 动画存在 dasharray 覆盖 bug：JS 对所有 edge path 设置 `strokeDasharray=length` 以实现绘制动画，但覆盖了 CSS 中 info 虚线（`8 4`）和 collab 点线（`2 6`）的样式，导致虚线/点线变实线，三类边视觉无法区分。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 动画区分对待 | task 边用 dashoffset 绘制（有方向），info/collab 边用 opacity 渐显（保留 CSS 虚线/点线） | 三类边视觉清晰区分，但动画形式不统一 |
| B. 统一绘制动画 | 所有边都用 dashoffset 绘制，放弃 CSS 虚线/点线 | 动画形式统一，但三类边视觉同质化，无法区分类型 |

### 决定
A. 动画区分对待。task 边有方向性（派活交付流），用 dashoffset 绘制强化方向感；info 边有方向但需保留虚线样式，用 opacity 渐显；collab 边无方向（平等配合），用 opacity 渐显且无箭头。

### 理由
1. 三类边（task/info/collab）的本质区别是"交付物方向性"——task 有交付物转移，info 有信息传递，collab 无方向。动画形式应服务于这个语义区分。
2. dashoffset 绘制动画有"方向感"（从起点画到终点），适合 task 的派活交付；opacity 渐显无方向，适合 info 的信息传递和 collab 的平等配合。
3. 修复 dasharray 覆盖 bug 的根本方式是不再对 info/collab 边设置 JS dasharray，让 CSS 的虚线/点线样式生效。

### 影响范围
- docs/src/entries/help-entry.js（bindExplorationScrollDriven 函数 5 处修改：init/reduced-motion/mobile/scrollable<=0/desktop 主循环）
- docs/src/styles.css（.help-edge--task stroke 颜色、.help-edge--info dasharray 微调）

### 一改具改检查
- [x] init 阶段：仅 task 边设 dasharray/dashoffset，info/collab 用 opacity
- [x] reduced-motion 阶段：task 边 dashoffset=0，info/collab opacity=1
- [x] mobile 阶段：同 reduced-motion
- [x] scrollable<=0 阶段：同 reduced-motion
- [x] desktop 主循环：edgeType 检测 + 区分对待
- [x] 执行日志 T33 记录

## D-223 2026-06-30 — 报备改双向边显性化书记审批

### 背景
v4.3.5 探索工作 SVG 中，organizer→secretary 的报备边是单向 info 边，仅表示"组织者向书记报备"，未显性化书记的审批反馈。同时存在 secretary↔organizer collab 边，与报备边物理重合，视觉冗余。用户反馈"支部书记怎么这么边缘化？"。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 报备改双向边 | organizer↔secretary info 边添加 bidirectional:true，label"报备"→"报备/审批"；删除 secretary↔organizer collab 边 | 显性化书记审批反馈，消除视觉冗余，但需 SVG 支持反向箭头 |
| B. 保留单向+强化 collab | 保留 organizer→secretary 单向报备边，强化 secretary↔organizer collab 边视觉 | 改动小，但报备与配合视觉混淆，书记审批仍不显性 |

### 决定
A. 报备改双向边。在 info 边数据添加 `bidirectional: true`，renderNetworkSVG 在起点添加反向箭头（`translate(path.x1,y1) rotate(angle+180)`）；label 改为"报备/审批"显性化双向语义；删除 secretary↔organizer collab 边（与报备边物理重合，由双向报备边替代）。

### 理由
1. 书记的审批反馈是活动执行方向把握的关键环节，单向报备边无法表达这个双向关系。
2. collab 边（横向配合）与报备边物理重合，视觉冗余——双向报备边已包含"配合"语义，无需单独画 collab 边。
3. EXPLORATION_STAGES stage 1 同步更新：title"组织者向支书报备"→"组织者向支书报备·支书审批"，flows 删除"支书↔组织者（横向配合）"改为"组织者↔支书（报备/审批）"。

### 影响范围
- docs/src/entries/help-entry.js（ACTIVITY_NETWORK edges 数据、renderNetworkSVG 箭头逻辑、EXPLORATION_STAGES stage 1）
- docs/src/styles.css（无，info 边样式不变）

### 一改具改检查
- [x] ACTIVITY_NETWORK：organizer→secretary 边添加 bidirectional:true + label"报备/审批"
- [x] ACTIVITY_NETWORK：删除 secretary↔organizer collab 边
- [x] renderNetworkSVG：新增 bidirectional 反向箭头支持
- [x] EXPLORATION_STAGES stage 1：title 和 flows 同步更新
- [x] 执行日志 T33 记录

## D-226 2026-07-01 — P.17 书记定位表述裁定（选 C 方向）

### 背景
P.17 提交 insights §3.2 L123 "书记独立于条块之上"违反 project_memory 硬约束（避免"之上/之下"术语，使用"分工/配合"代替）。提交了三种替代表述方向待书记裁定。

### 选项
| 方向 | 含义 | 后果 |
|------|------|------|
| A. 超脱于条块分工 | 强调书记不在条块分工序列中，超越具体分工 | 语义清晰，但"超脱"略带主观色彩 |
| B. 不在条块分工序列中 | 客观陈述书记的位置 | 最中性，但略显生硬 |
| C. 横跨条块但不属于任何单一条块 | 强调书记的跨条块属性 | 突出书记的统筹角色，但表述较长 |

### 决定
C. 横跨条块但不属于任何单一条块。

### 理由
书记指出：要突出书记作为协调节点的作用。C 方向强调书记的跨条块属性，最准确表达书记作为条块间协调节点的定位——既不属于条也不属于块，而是横跨条块发挥协调作用。

### 影响范围
- content/insights/党支部管理与实务经验沉淀.md L123（"书记独立于条块之上"→"书记横跨条块但不属于任何单一条块，作为条块间的协调节点"）
- CLAUDE.md 丙部 P.17 退出

### 一改具改检查
- [x] insights L123 表述已修改为 C 方向
- [x] CLAUDE.md 丙部 P.17 已退出
- [x] 决策日志 D-226 已记录
- [x] 执行日志 T36 已记录

