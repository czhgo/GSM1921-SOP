---
title: "SOP 系统优化与同步指南"
type: guide
role: "[工程师]+[AI]"
last_updated: "2026-08-22"
version: "4.1"
---

# SOP 系统优化与同步指南

> **定位：** 本指南是党支部管理引擎（GSM1921-SOP）设计思路的系统呈现，整合了 SOP 文档优化方法论、系统架构设计方案、数据映射规则、优化提案机制与 Mock/真实鉴权辨析，供 SOP-系统联动维护参考。

---

## A. 问题诊断

### A.1 内容两极分化

当前 SOP 文档和模板库存在两极分化问题：

| 问题类型 | 症状 | 影响 |
|---------|------|------|
| **内容冗余** | 部分 SOP 过多重复的上下文铺垫、过长的引言段落 | 核心流程被淹没，可读性差 |
| **内容粗糙** | 部分模板仅占位、缺少可操作的步骤指引 | 模板无法直接使用，实用性低 |
| **结构不统一** | 文档间信息层级不一致（有的3层，有的5层） | 导航混乱，查找成本高 |

### A.2 跨文档系统性缺陷

| 编号 | 问题 | 影响范围 | 优先级 | 建议 |
|------|------|---------|--------|------|
| G-01 | **三份 SOP 均缺少「一句话摘要」** | 全部 | **P0** | 立即补充，这是系统角色卡片 hover 面板的必需要素 |
| G-02 | **无统一的 Front Matter `summary` 字段** | 全部 | **P0** | 在 YAML front matter 中增加 `summary: "≤30字摘要"`，系统和 AI 均可直接读取 |
| G-03 | **内嵌模板与 SOP 正文混排** | 纪检/组织/宣传 | **P1** | 所有代码块格式的内嵌模板一律提取至 `content/03_doc_system/工作模板/`，SOP 中仅保留链接引用 |
| G-04 | **目录锚点不稳定** | 全部 | P2 | 锚点含中文、括号、特殊符号时，GitHub 锚点转换行为不可预测 |
| G-05 | **文档更新记录全部内嵌于 SOP 末尾** | 全部 | P3 | 版本记录在系统展示中无价值却占据空间；仅保留最近 3 条 |
| G-06 | **无统一的「关联文档」尾节** | 组织 | P3 | 组织委员 SOP 缺少独立的「关联文档」节，与纪检/宣传委员不一致 |

---

## B. 系统架构设计

### B.1 MPA 多页面架构

系统采用 **MPA（Multi-Page Application）** 架构，共有 **8 个根 HTML 页面 + workspace/ 6 个角色工作台**：

| 页面 | 文件 | 用途 | 入口 |
|------|------|------|------|
| **登录页** | `docs/login.html` | 身份验证登录 | login-entry.js |
| **主页** | `docs/index.html` | 通知 + 人员招募 + 活动日历摘要 | main-entry.js |
| **通知页** | `docs/notice.html` | 通知独立页 | notice-entry.js |
| **归档库** | `docs/archive.html` | 历史活动/专班归档查询 | archive-entry.js |
| **资料查询** | `docs/search.html` | 参考资料、网站群、规章文件 | search-entry.js |
| **意见反馈** | `docs/feedback.html` | GitHub Issue 风格开源讨论、列表/详情/新建三视图 | feedback-entry.js, issue-list.js, issue-detail.js, issue-form.js |
| **系统说明书** | `docs/help.html` | 分章节系统说明书 | help-entry.js |
| **支部的故事** | `docs/about.html` | 支部的故事叙事（角色体系+发展路径可视化） | about-entry.js |
| **角色工作台** | `docs/workspace/{secretary,leader,org,prop,disc,visitor}.html` | 六类角色工作台（书记/党小组组长/三支委/成员） | 对应 ws-*-entry.js |

**共享组件架构**：
- `header.js` — 全局顶栏（含全局角色切换器）
- `sidebar.js` — 全局侧边栏（角色快捷选择器，与 Header 角色切换器双向同步）
- `styles.css` — 全局样式（五层色盘系统 + Flat Design System）
- `services/auth.js` — 权限判定（ROLE_PERMISSIONS + canDo() + 赋权链 AUTHORIZE_CHAIN）

### B.2 角色优先 + canDo() 统一判定 架构

> **T42 轮核心架构决策**（决策归档：D-1/D-2/D-3）。
> **2026-07-12 权限系统重构**：去掉 stance/view/mode 三元组，改为 常设角色 + 项目角色 → canDo() 统一判定（spec: 2026-07-12-permission-system-redesign-design.md）。

#### 设计原则

- **角色优先**：登录后按 `ROLE_PAGE_MAP` 进入角色对应工作台，无手动模式切换
- **权限判定**：常设角色（secretary/deputy-secretary/org-commissioner/prop-commissioner/disc-commissioner）+ 项目角色（organizer/deep）+ leader → `AuthStore.canDo()` 统一判定（`ROLE_PERMISSIONS` + `PROJECT_PERMISSIONS` 并集）
- **按人视图**：书记/副书记在全局概况以"按维度/按人"子切换查看各角色在办任务（L1 条线视角，[DESIGN_SYSTEM §一 原则9](../design-system/DESIGN_SYSTEM.md)）——只读视角切换机制已随 2026-08-08 权限重构删除，不再切他人身份进他人工作台，按人视图按知情边界（P-011 第四道防线）替代
- **Header 为工作台切换入口**：全局角色切换器（仅工作台切换，无只读视角切换）
- **Sidebar 为角色快捷选择器**：与 Header 双向同步

#### 权限判定（ROLE_PERMISSIONS + canDo()）

- 权限表 `ROLE_PERMISSIONS`：各常设角色持有的权限项（如 `view_all`/`create_activity`/`assign_task`/`modify_assignment`/`mark_complete`/`initiate_taskforce`/`authorize_taskforce`/`manage_taskforce`/`archive` 等）
- 项目权限表 `PROJECT_PERMISSIONS`：organizer/deep 在项目内持有的权限（如 `view_project`/`assign_task`/`mark_complete`/`fill_review`/`record_inspection`/`assign_project_role` 等）
- `AuthStore.canDo(personId, action, context)`：常设角色权限与项目角色权限取并集统一判定；`view_all`/`view_project` 分别兜底 `view_*` 前缀权限项

#### AuthStore 现行方法

```javascript
AuthStore.getUserRole(personId)              → 常设角色（赋权记录 > mock 数据 > participant）
AuthStore.getEffectiveRole(personId)         → 有效角色（回退常设角色）
AuthStore.getProjectRole(personId, projectId) → 项目角色（'organizer' | 'deep' | null）
AuthStore.canDo(personId, action, context)   → boolean（常设 + 项目角色权限并集统一判定）
AuthStore.getRoleLabel(role)                 → string（ROLE_LABELS）
AuthStore.getPageForRole(module, role)       → string（ROLE_PAGE_MAP 页面映射）
AuthStore.isCommissioner(role)               → boolean（常设角色集合判定）
```

#### 赋权关系链 (AUTHORIZE_CHAIN)

> **权威源**：[COMMISSIONER_FRAMEWORK.md §C](../../02_institution/COMMISSIONER_FRAMEWORK.md)（赋权关系链，原 PERMISSION_MATRIX.md §二）。本表为该权威源在系统架构中的切面视图，冲突时以权威源为准。
> 系统内实现为 `AUTHORIZE_CHAIN`（auth.js）：secretary/deputy-secretary → leader/organizer/deep；org-commissioner/leader → organizer/deep；organizer → deep。

```
党支书 → [组织委员, 宣传委员, 纪检委员, 党小组组长, 组织者, 深度参与者]
组织委员 → [宣传委员, 纪检委员, 组织者, 深度参与者]
宣传委员 → [组织委员, 纪检委员]
纪检委员 → [组织委员, 宣传委员]
党小组组长 → [组织者, 深度参与者]
组织者 → []
深度参与者 → []
```

### B.3 三支委看板视图体系

> **T29 核心创新：支委在管理工作台不需要日历，需要任务看板。**

#### 视图路由（工作台角色视图）

| 角色 | 路由面板 | 核心组件 |
|------|---------|---------|
| **secretary / deputy-secretary** | 活动写入面板 + 日历 | write panel + calendar（副支书与书记共享书记工作台） |
| **leader** | 活动写入面板 + 日历 | write panel + calendar |
| **org-commissioner** | 专班协调看板 | 2列看板（待启动/进行中）+ 发布招募表单 + 专班详情展开 |
| **prop-commissioner** | 项目看板 | 2列看板 + 卡片展开子任务详情 |
| **disc-commissioner** | 项目看板 | 2列看板 + 卡片展开子任务详情 |
| **participant / organizer / deep** | 成员工作台 | 待办 / 项目分工 / 活动动态 / 考勤概况 / 我的考察（项目角色承载于成员工作台） |

#### 看板设计原则

- **仅两列**：待启动 + 进行中 —— 无"已完成"列
- 活动/专班全部完成后 → 归档，不在看板中保留
- 子任务完成后不消失：灰显文字 + 删除线 + opacity:0.5 + 绿色对勾 ✓
- 完成的子任务沉到子任务列表底部
- 设计精神：已完成子任务灰显沉底，既不消失也不干扰进行中内容

#### 宣传/纪检「项目看板」

- 卡片区分 `type`（活动/专班），用 domain tag 着色
- 点击任意卡片 → 展开子任务详情面板
- 子任务分"进行中"和"已完成"两组
- 宣传委员蓝色调，纪检委员琥珀色调
- 宣传/纪检在党建维度**服务于**活动和专班，不直接写入活动

#### 写入门禁原则

> **来源：**[USAGE_POLICY.md](../../03_doc_system/USAGE_POLICY.md) §1.2.5 — 术语权威源；[ROLE_CLASSIFICATION.md §九 角色权限矩阵](../../02_institution/ROLE_CLASSIFICATION.md) — 权限矩阵权威源（原 PERMISSION_MATRIX.md §一/§四）

**仅党支部书记、党支部副书记、党小组组长可直接创建/修改活动数据；宣传委员、纪检委员通过审核、确认、备案等流程间接参与，不直接写入活动。**

- `create_activity` 仅 secretary/deputy-secretary/leader 持有；`canWriteActivity(role)` 是旧实现（@deprecated，判定范围与之相同）
- 参与路径：纪检委员确认考勤 → 备案；宣传委员审核素材 → 备案
- 组织委员不持有 `create_activity`，专班创建/管理走 `initiate_taskforce`/`authorize_taskforce` 通道；其"维护人才库"是基于考察信息的信息流处理，不是"归档"原始材料（依据 [党支部管理与实务经验沉淀.md §4.8](../../insights/党支部管理与实务经验沉淀.md) 组织委员职责规则）

#### 组织委员「专班协调视图」

- 最高优先级：专班管理（党建工作职能）
- 组织委员不是唯一发起者（党小组组长、支委、书记均可发起专班）
- 组织委员是**唯一招募统筹者**
- 含「发布招募」按钮 → 展开招募表单（名称/人数/技能/周期/说明）
- 「发起专班」按钮 — initiate_taskforce 权限

### B.4 日历视图范围限定

> **T29 关键修正：日历 = 参与者工具；看板 = 管理者工具。**

| 场景 | 显示日历 | 原因 |
|------|:---:|------|
| 默认浏览（全员） | ✅ | 信息浏览基线 |
| 工作台 · secretary/leader | ✅ | 需要同时管理活动和看日历 |
| 工作台 · organizer/deep | ✅ | 需要知道何时何地参会 |
| 工作台 · org-commissioner | ❌ | 只看专班协调看板 |
| 工作台 · prop-commissioner | ❌ | 只看项目看板 |
| 工作台 · disc-commissioner | ❌ | 只看项目看板 |

### B.5 赋权链 (Authorization Chain)

> **2026-05-18 修正，对齐 SECRETARY_PRONOUNCEMENTS.md（P-029 身份≠权限 + P-008~P-009 扁平化设计，D-15）**

```
党支书（secretary）
  ├──→ 党小组组长（leader）
  ├──→ 组织委员（org-commissioner）
  ├──→ 宣传委员（prop-commissioner）
  └──→ 纪检委员（disc-commissioner）

党小组组长（leader）→ 组织者 / 深度参与者（活动赋权）
  注：组织者两种赋权路径 — Ⅰ自上而下(赋权随承包自动生效) Ⅱ自下而上(须经赋权后方可分派)

组织委员（org-commissioner）
  ├──→ 组织者 / 深度参与者（专班赋权）
  └──→ 专班成员（招募赋权）

宣传委员 / 纪检委员 → 无赋权能力（职能性质决定）
```

**权限判定函数** (`services/auth.js`)：
- `canManage(role)` → 角色是否有管理权限
- `canWriteActivity(role)` → 能否写入活动（仅 secretary/leader）— **写入门禁原则的代码实现**
- `canRecruitTaskForce(role)` → 能否招募专班（仅 secretary/org-commissioner）
- `canAuthorize(role)` → 能否赋权他人（secretary/leader/org-commissioner）
- `canInitiateTaskForce(role)` → 能否发起专班（secretary/leader/org-commissioner/prop-commissioner/disc-commissioner）

### B.6 数据模型全家福

| 模型 | ID | 核心字段 | 状态 |
|------|------|------|------|
| **ActivityRecord** | B1.1 | id, title, type, date, location, duration, direction, leaders[], subRecords[] | ✅ 已落地 |
| **TaskForceRecord** | B1.2 | id, name, sponsorRole, members[{contributions[]}] | ✅ 已落地 |
| **Notice** | B1.3 | id, title, content, priority, publisher, targetModule | ✅ 已落地 |
| **SeriesRecord** | B1.4 | id, title, recurrenceRule{frequency,interval,startDate,endDate}, subActivityIds[] | 🟡 模型已设计 |

#### 系列活动模型 (SeriesRecord B1.4)

> **2026-05-06 新增设计。** 长期活动 ≠ 专班 —— 三者独立但关联。

| 概念 | 维度 | 管理角色 |
|------|------|---------|
| **短期活动** | 事件（一次性） | 党小组组长写入 |
| **系列活动** (= 长期活动) | 时间模式（重复性） | 党小组组长创建、书记审核 |
| **专班** | 人员组织（功能性） | 组织委员招募统筹 |

```
系列活动 (SeriesRecord)
  │ 创建时选择 recurrenceRule (weekly/monthly/quarterly + interval)
  │ 系统自动展开为多个子 ActivityRecord
  ▼
├── 子活动 1 ← 宣传专班服务于此
├── 子活动 2 ← 宣传专班服务于此
├── 子活动 3 ← 宣传专班服务于此
  │
  │ 全部子活动完成 → series.archived = true → 归档
  ▼
归档库
```

---

## C. 优化方法论

### C.1 核心策略：系统可视化驱动的倒推优化

> **以系统可视化展示为下游应用目标，推动 SOP 内容的结构化与优化。**

系统不是 SOP 的"复制粘贴展示区"，而是 SOP 的**可视化检验工具**：
- 当 SOP 在系统上展示效果差 → SOP 本身需要先优化
- 当模板在系统上无法直接填充使用 → 模板结构需要先调整

### C.2 联动优化闭环（4步循环）

```
STEP 1: 系统展示效果审查
  将当前 SOP / 模板渲染到系统界面上
  目视检查：信息层级是否清晰？核心流程是否能一眼定位？

STEP 2: 倒推 SOP 修改点
  根据展示问题反向推导 SOP 缺陷
  产出: SOP 修改建议清单

STEP 3: 执行 SOP 更新
  按修改建议清单逐项更新 SOP 源文件
  更新 SOP Front Matter 中的 last_updated

STEP 4: 同步更新系统渲染
  将更新后的 SOP 重新渲染到系统
  记录: SOP vX.Y → 系统更新 → 验证展示效果一致
```

### C.3 SOP 结构化标准

每份 SOP 文档理想结构：

```markdown
# [文档标题]

> **一句话**: [30字以内的核心摘要]

## 适用角色

## 核心流程
### [阶段1]: [名称]（时间窗口）
1. [动作1]
2. [动作2]

## Checklist
- [ ] [检查项1] — [负责人] / [时限]

## 关联文档
- [文档A](链接) — [关系说明]
```

### C.4 字数精简原则

| 当前问题 | 优化原则 |
|---------|---------|
| 大段政治背景铺垫 | 移至独立的"背景说明.md"，正文只保留 1 行引用链接 |
| 重复的"为什么要做这件事" | 每份 SOP 只在开头有一段 ≤80 字的 Why |
| 历史过程叙述 | 不放在操作指南中，移至 Insights 的经验沉淀 |

---

## E. 数据映射规则

### E.1 数据源架构

当前系统采用 **MPA 多页面 + 模块化 JS** 架构。HTML 页面通过 `<script type="module">` 加载对应入口 JS，不依赖编译代理。

| 页面 | 入口 JS | 数据源 |
|------|---------|--------|
| workspace/{secretary,leader,org,prop,disc,visitor}.html | 对应 `entries/ws-*-entry.js` | 统一经 services/ 层 + data-adapter（mockDB，持久化 localStorage: `workflowos_branch_db_v1`） |
| feedback.html | `entries/feedback-entry.js` | FeedbackStore (localStorage) |
| index.html | `entries/main-entry.js` | 经 services/ 层读 mockDB |

### E.2 跨页面状态管理

由于 MPA 架构下各页面为独立文档，跨页面状态通过以下机制共享：

| 机制 | 存储 | 用途 |
|------|------|------|
| **登录会话**（`gsm1921-login-user`） | localStorage | 登录用户 { personId, role, tabId }（A-11 防串扰） |
| **会话快照**（`gsm1921-session-snap`） | sessionStorage | 本标签页登录会话快照（localStorage 被覆盖时回退，A-11） |
| **AuthStore** | localStorage | 赋权审计快照（键 `sop_org_os_auth_audit`，grant/revoke 追加语义，跨会话持久化） |
| **mockDB（data-adapter）** | localStorage | 业务数据（活动/考勤/考察/专班/分工等，键 `workflowos_branch_db_v1`，跨页面共享） |
| **CrossPageState** | sessionStorage | 页面间临时传参（如从主页跳到工作台时传递选中活动ID） |

### E.3 同步安全区（低成本变更）

| 操作类型 | 示例 | 成本 |
|---------|------|------|
| 修改步骤的描述文本 | 优化措辞 | 极低 |
| 修改联系人姓名 | 更新人事 | 极低 |
| 调整步骤的时间偏移 | T-7天 → T-5天 | 极低 |
| 在现有场景末尾追加新步骤 | 新增一步 | 低 |
| 修改合规模板文件名 | 新版文件名 | 低 |

### E.4 架构雷区（高危变更）

| 危险操作 | 正确做法 |
|---------|---------|
| 擅自改变时间锚点书写格式 | 必须保持 `` `[时间: T-N天]` `` 固定格式 |
| 擅自增加新角色类别 | 必须先扩展 role-btn 路由再写标签 |
| 修改场景标题的领域前缀 | 保持 `## 【党建工作】...` 或 `## 【党务工作】...` |
| 在中间插入步骤而不重新编号 | 后续步骤全部重新编号 |
| 合并多步骤为一行 | 每个需独立过滤的步骤必须单独一行 |

---

## G. Mock 数据 vs 真实鉴权

### G.1 当前处于 Mock 状态的功能

| 功能 | Mock 方式 | 未来真实方式 |
|------|----------|------------|
| 用户身份识别 | sessionStorage 手动选择角色 | OAuth/SSO 登录后从数据库读取 |
| 赋权记录 | localStorage `_defaultAuth()` Mock 数据 | 数据库 `auth_records` 表 |
| 支委权限 | 代码硬编码始终为 true | 数据库查询用户是否持有对应支委角色 |
| 反馈提交人 | 手动输入姓名（选填，默认"匿名"） | 自动从登录 session 读取 |

### G.2 赋权链的 Mock 与真实形态

**当前 Mock 逻辑**：
- 支委天然有自身板块管理权限（无需赋权）
- secretary 和 leader 有全范围管理权限
- organizer 和 deep 需 leader 赋权
- 当前所有需赋权角色均已预设 Mock 赋权记录

**未来真实逻辑**：
1. 用户通过学校统一认证（SSO）登录
2. 后端根据 uid 查询 `user_roles` 表 → 返回角色列表
3. 支委角色由党委在后台直接指派
4. 组织者/深度参与者由党小组组长在系统内赋权产生 `auth_records`
5. 工作台可进入性由后端鉴权接口实时判定

### G.3 不变的设计原则

- **身份 ≠ 权限**：身份决定角色，权限由 `canDo()` 统一判定
- **支委天然权限**：组织/宣传/纪检委员在自己的职能内无需赋权
- **赋权仅针对活动角色**：只有 organizer 和 deep 需要被赋权
- **知情边界**：任何角色的信息可见范围精确等于其职责空间所需的最小充分信息（[P-011 第四道防线](../../01_strategy/SECRETARY_PRONOUNCEMENTS.md#p-011-组织内控总论职责分离主动回避书记仲裁与知情边界)）——按人视图按赋权链投影（L1 条线视角），不暴露他人操作细节；"看 ≠ 做"，监督停留方向把握（原 P-027②）

> **（论断 原 P-029 退役说明，2026-08-09 自论断汇编迁出至 04）**：原论断「管理模式 / 管理者只读 / 参与者只读」视图模式三分类已随 2026-08-08 权限系统重构移除（现行判定为常设角色 + 项目角色 → canDo()，顶栏仅保留工作台切换）；"身份≠权限"作为一般原则仍然成立，本条在此保留为历史决策记录。

### G.4 书记全局概览的补充意见入口（原 P-027②，2026-08-09 提出）

**设计任务**（原话精神，UI 怎么设计值得仔细思考）：全局概览中，书记【默认】不介入已经进行的活动，但书记可以看到是否可以对于特定活动或者专班补充意见——即书记能否把握已有活动的审批信息，并提供方向性意见。

> 论断 原 P-027 已拆解（2026-08-09）：报备/审批的"程序规范化"归 [COMMISSIONER_FRAMEWORK.md §审批流程规范](../../02_institution/COMMISSIONER_FRAMEWORK.md)；本条记录"书记对已开展活动/专班补充意见"的 UI 设计需求——书记的审批反馈是活动执行方向把握的关键环节（原 P-027②）。

---

*本指南整合了 SOP 优化方法论、系统架构设计、数据映射规则、优化提案机制与 Mock/真实鉴权辨析。2026-05-06 v4.0 更新：全面反映 T25-T29 架构决策——MPA 架构、Mode 统一、三支委看板体系、日历限定、赋权链全量重写、系列活动模型。*
