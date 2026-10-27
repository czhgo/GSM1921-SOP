# 信息架构收敛、组件契约与术语体系 Spec

## Why

支书指出四类「不自觉地设计」：① 上批探索的长期结论没有全部落进文档体系，`DATA_MODEL` 仍写着旧消息模型；② 同一折叠功能存在 `<details>` 与 `<button>` 两套实现，`button` 里嵌 `h3`、`summary` 里嵌 `span[role=heading]`；③ 62 个页签中约 20 个是同一渲染器重复注册，支书台「活动管理」把日历、查询、党小组活动、项目赋权四件事塞在一页；④ 「工作组 / 专班 / 其他组」把协作结构、业务对象、党小组三个层级并列成一排按钮，而全仓没有单一术语表。

四份独立审计（文档落地 / 组件语义 / 62 页签 IA / 术语）确认了这些问题，并给出可执行的收敛路径。支书裁定：组件按我的判断定契约；IA 全面重组 62→45；术语可新建唯一文件，但必须与 `OPERATIONS_GUIDE` 的关系用 Harness 钉死；知情查看改为「对象切换 + 独立区」。

## What Changes

- **BREAKING**：新建 `content/03_doc_system/TERMINOLOGY.md` 作为全仓唯一术语权威；`OPERATIONS_GUIDE §19`、`sop/INDEX.md` 的术语段改为指针，禁止二次定义。
- **BREAKING**：组件契约三分——折叠＝原生 `<details>/<summary>`；菜单＝`MenuButton`（`button` + `aria-expanded` + `aria-controls`）；浮窗＝`Modal`。标题永远不进入交互元素，必须是兄弟节点。
- **BREAKING**：页签 62 → 45；删除/降级的页签必须有明确新落点、深链重定向、help 同步与守卫更新。
- **BREAKING**：知情查看一级分段只放同层对象「活动工作组 / 专班工作组」；「其他党小组」独立成区，不与工作组同排。
- `DATA_MODEL` 的消息模型重写为 `kind / targetType+targetId / reads[] / archivedBy[] / archived / replyTo`，删除 `targetModule` 与全局 `read`。
- `DESIGN_SYSTEM` 同步四组页签名「总览 / 我的职责 / 协作与知情 / 制度与答复」，补 SD-37（知情查看分段）、SD-38（折叠契约）、SD-39（标题不得进入交互元素），SD-34 补「已读≠回执」三条判据。
- `content/04_web_design/PRODUCT_IA.md` 新建为派生索引（页签功能地图），由 `catalog-sync` 守卫与 `function-catalog.js` 对齐。
- 上批遗留的 `help.html` 口径漂移（分组名、默认视图、知情查看分段、活动管理页头）同批修正。

## Impact

- Affected specs：`OPERATIONS_GUIDE §19/§32`、`ARCHITECTURE`（SSOT 与页面清单）、`DESIGN_SYSTEM`（§4/§10.7/§12.15）、`DATA_MODEL §2.9/§2.19/§2.30`、`DOC_MAP`、`help.html`。
- Affected code：
  - 折叠与菜单：`docs/src/components/ui/`（新增 Disclosure/MenuButton 封装）、`docs/src/components/record/todo-tab-shell.js`、`docs/src/components/governance/work-overview.js`、`docs/src/components/dashboard/gallery.js`、`docs/src/entries/tabs/{secretary,visitor,leader}/**`
  - IA：`docs/src/capabilities/*-workspace.js`、`docs/src/core/domain/function-catalog.js`、`docs/src/entries/tabs/secretary/{calendar-tab,assign-tab,group-progress-tab}.js`、`docs/src/components/record/insight-view.js`
  - 术语：新增 `content/03_doc_system/TERMINOLOGY.md`；`docs/help.html`、`docs/src/**` 的用户可见并列标签
  - 守卫：`server/test/docs-governance-guard.test.mjs`、`ui-control-system-guard.test.mjs`、`frontend-foundations-guard.test.mjs`、`catalog-sync.test.mjs`、`copy-*`、`page-title-guard`
- 环境假设：`npx skills check` 发现 18 个技能更新与若干高星 IA 技能，但 git 克隆被网络拒绝；本批以本地 `frontend-design` / `web-design-guidelines` 为准，并在日志登记该限制。

## ADDED Requirements

### Requirement: 单一术语权威
系统 SHALL 以 `content/03_doc_system/TERMINOLOGY.md` 为唯一术语定义源，每条含词条、定义、层级、上位/下位、允许并列集、禁用写法、权威文档、代码键、合法别名。

#### Scenario: 工作组与专班不得并列
- **WHEN** UI 在同一按钮组/表头/筛选行里展示「工作组」与「专班」
- **THEN** 守卫判红；合法写法只能是「活动工作组 / 专班工作组」（同属工作组，按业务对象分）或「活动 / 专班」（同属项目）

#### Scenario: 旧术语文件只留指针
- **WHEN** 打开 `OPERATIONS_GUIDE §19` 或 `sop/INDEX.md` 术语段
- **THEN** 只看到指向 `TERMINOLOGY.md` 的指针，不出现第二份词条定义；重复定义由 Harness 判红

### Requirement: 知情查看分层
系统 SHALL 用一层按钮切换「活动工作组 / 专班工作组」；「其他党小组」SHALL 作为独立区域/二级入口，不与工作组同排。

#### Scenario: 支书打开知情查看
- **WHEN** 进入「协作与知情 · 知情查看」
- **THEN** 只看到「活动工作组」「专班工作组」两枚同级按钮；「其他党小组」在独立分区，读屏可分辨三者层级

### Requirement: 折叠组件唯一
系统 SHALL 以原生 `<details>/<summary>` 承担所有「阅读型折叠」；菜单 SHALL 使用 `MenuButton`；浮窗 SHALL 使用 `Modal`。

#### Scenario: 活动查询折叠
- **WHEN** 用户打开「活动管理」
- **THEN** 查询区由 `<details>` 承担，`summary` 内只有文本/`span`，未读状态可由 `open` 属性静态读出

#### Scenario: 禁止标题进入交互元素
- **WHEN** 任一 `button` / `summary` / `role=button` 的直接内容里出现 `h1..h6` 或 `role=heading`
- **THEN** 守卫判红（标题必须是兄弟节点，用 `aria-labelledby` 关联）

### Requirement: 同一屏纵向一致
系统 SHALL 对同一页面内的分区头、折叠头、按钮、计数、说明使用同一套组件与字号档位；同类元素不得一屏多套。

#### Scenario: 活动管理单屏
- **WHEN** 审查「活动管理」首屏
- **THEN** 所有折叠头同形（同字号/同 chevron/同内边距）、所有行内动作同档、说明一律后置

### Requirement: 62 → 45 的 IA 收敛
系统 SHALL 把页签收敛到 45 个；每个被删除/降级的页签必须有新落点、深链重定向与 help 更新。

#### Scenario: 删除页签后入口仍可达
- **WHEN** 用户从旧深链或书签进入已删除页签
- **THEN** 重定向到新落点并给出可见说明，不出现空页

### Requirement: 产品 IA 派生索引
系统 SHALL 维护 `content/04_web_design/PRODUCT_IA.md`，逐台逐页签写「一句话职责 / 主对象 / 主操作 / 所属分组 / 新落点」；页签集合必须与 `function-catalog.js` 一致。

#### Scenario: 页签漂移
- **WHEN** 新增/删除页签但未更新 `PRODUCT_IA.md`
- **THEN** `catalog-sync` 判红

## MODIFIED Requirements

### Requirement: 消息对象数据模型
`DATA_MODEL §2.9` SHALL 改为消息对象：`kind`、`audience/audiencePersons`、`targetType/targetId`、`reads[]`、`archivedBy[]`、`archived`、`replyTo`、有效期派生；删除 `targetModule` 与全局 `read`。

### Requirement: 页签分组轴
`DESIGN_SYSTEM §4`、`ARCHITECTURE`、`MODULE_UI_DESIGN`、`help.html` SHALL 统一为「总览 / 我的职责 / 协作与知情 / 制度与答复」。

### Requirement: 活动管理
支书台「活动管理」SHALL 只承担活动生命周期：查询并入日历工具栏；党小组活动改为筛选并修复「新建不预置方向」；项目赋权移出（活动赋权留活动行内，专班赋权回组织台）。

### Requirement: 守卫口径
`docs-governance-guard` SHALL 增加「术语表覆盖率 / 禁止并列集 / 交互元素内无标题 / 折叠可回读」；`catalog-sync` SHALL 校验 IA 地图与页签集合；`ui-control-system-guard` SHALL 校验同一屏同类元素同组件。

## REMOVED Requirements

### Requirement: `insight-view` 的 `workgroup / taskforce / group` 同排
**Reason**：三者分属协作结构、业务对象、组织单元，不能并列。
**Migration**：改为「活动工作组 / 专班工作组」；「其他党小组」独立区。

### Requirement: 支书台「成员流动」与组织台重复注册
**Reason**：同一文件两个页签位，组织台为本位。
**Migration**：支书台删除，入口改指组织台并保留只读深链。

### Requirement: 各台独立「我的处置」页签
**Reason**：与待办同属「我的待处理」，只是对象为反馈。
**Migration**：并入待办页「我经办的反馈」组，深链 `?tab=todo&filter=dispatch` 重定向。
