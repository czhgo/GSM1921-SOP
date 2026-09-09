---
title: "工作流块封装契约"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-05"
status: active
related_files: [ARCHITECTURE_EVOLUTION.md, ../../../.ctx/ENGINEERING_ASSESSMENT.md, PARTY_COMMITTEE_DESIGN.md, ../../03_doc_system/ARCHITECTURE.md]
---

# 工作流块封装契约

> **定位**：根 README 顶层愿景 L1→L5 的第 3 层（L3 块封装契约）。把一条 SOP 封装为一个「工作流块」：声明输入（fields，渲染器 = 既有 forms.js 字段积木）、阶段（引擎阶段序列）、产出（todo/notice/归档等既有联动）。契约与示例已随 S1~S4 编码落地（2026-09-03，见 §七）；本文档当前为契约定义 + 落地进度档案。
> **受众**：[工程师]+[AI]（工作流/表单/能力注册三个面的维护者）+ 书记（交互与边界裁决人）
> **关联**：[ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) §8（愿景与 §8.5 草案）、[ENGINEERING_ASSESSMENT.md](../../../.ctx/ENGINEERING_ASSESSMENT.md)（行动线 P2）、[PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md)（两级治理）。

---

## 〇、书记裁定（2026-09-03，v1.1 吸收）：块差异化 = 三个可组装维度

书记对「首批块选哪几条 SOP」的回应不是选择题，而是一条**框架性裁定**，本契约据此扩展：

> 三会一课是所有支部共通的；专班是支部自己的制度尝试；组织者/深度参与者也是支部自己的组织尝试。**表单中有哪些条目、需要涉及到多少人——都是可以被模块化组装的。**

据此，支部之间的差异（差异化组装）由三个正交维度表达，缺一不可：

| 维度 | 含义 | manifest 载体 | 现状锚点 |
|------|------|--------------|---------|
| ① 流程组合 | 做哪些流程、启停与顺序 | `stages` + 支部 `config.modules/blocks` 启停 | ✅ config.modules/blocks（已落地） |
| ② 表单条目 | 一个块的表单显示哪些字段、哪些必填 | `inputs.fields`（字段级可启停/可必填覆盖） | ⬜ 本契约新增（渲染 = forms.js 积木） |
| ③ 参与人范围 | 流程涉及哪些人/角色/组织模式（如 普通党员 vs 组织者+深度参与者） | `participants`（角色集合可配置） | ⬜ 本契约新增（名单解析 = person 服务） |

**制度来源分层（provenance）**：块必须声明自身属「全党通用制度」（三会一课类，`institution-common`）还是「支部自创制度尝试」（专班/组织者-深度参与类，`branch-custom`）——通用块随系统分发不可删（可停用展示），支部自创块是支部的差异化资产。两者都受支部 config 启停约束。

---

## 一、契约总则（三条，先于一切字段定义）

1. **块不独立于既有机制存在**：块 = 能力注册表中已注册能力/场景 + 一层元数据（manifest）。不新造第三套 id、不引入第二套执行引擎。
2. **渲染不新造控件**：块声明的输入字段（inputs.fields）由既有 `components/forms.js` 库的字段积木渲染（textField/textareaField/selectField/dateField + label for/必填/aria 体系）。
3. **执行不新造通道**：块产物仍走既有 services 层写入 + persist；跨面联动仍走 `DATA_CHANGED_EVENT`；权限仍在角色与支部 config 约束内。可视化只是「编排者」，不是新数据通道。

---

## 二、block manifest v1 字段规格

```jsonc
{
  // ── 身份（identity）────────────────────────────────────
  "blockId": "act-organize",        // 对应 capability id 或 scenario id，不新造
  "name": "活动组织块",
  "version": "1.0.0",               // 语义化（L1 软版本 ?v= 之上的块级版本）
  "sopRef": "02_institution/sop/…", // 制度/SOP 溯源（一改具改锚点，L1 术语纪律）
  "provenance": "institution-common" | "branch-custom", // 通用制度 vs 支部自创制度尝试

  // ── 能力关联（capability）──────────────────────────────
  "capabilityId": "activity-calendar",   // 注册表 id（core/registry.js 同源）
  "scope": ["workspace:secretary"],      // 可见/可拖的台面范围（复用既有 scope）

  // ── 输入声明（inputs → 渲染器 = forms.js 字段积木；表单条目可组装）──
  "inputs": {
    "fields": [
      {
        "fieldId": "title",
        "label": "活动名称",
        "kind": "textField",             // textField|textareaField|selectField|dateField
        "required": true,
        "requiredConfigurable": true,    // 支部可否把该字段改为非必填（表单条目组装）
        "hint": "与支部计划清单一致",
        "options": [],                    // selectField 专用 {value,label}[]
        "default": "",
        "enabledDefault": true            // 支部 config 可对字段级启停（收拢/扩展表单条目）
      }
    ]
  },

  // ── 参与人范围（participants → 涉及多少人/角色/组织模式）──
  "participants": {
    "mode": "configurable",              // fixed=名单固定；configurable=支部可配（组织者/深度参与者等）
    "defaultRoles": ["party-member"],    // 默认参与角色（person 服务角色键）
    "orgMode": "none"                    // 组织模式：none | organizer-deep（支部自创「组织者+深度参与者」分层）
  },

  // ── 工作流阶段（workflow → 引擎阶段序列）──────────────────
  "stages": [
    { "id": "create", "kind": "decision-tree", "outputs": ["activity"] },
    { "id": "assign", "kind": "engine",        "outputs": ["assignment", "todo"] }
  ],

  // ── 产出声明（outputs → 既有联动面）──────────────────────
  "outputs": {
    "entities": ["activity", "todo", "notice"], // 落库实体（services 对应表）
    "outputBlocks": ["attendance", "publicity"] // 活动产出块（config.blocks 同目录）
  },

  // ── 事件接线（events → DATA_CHANGED_EVENT 派生面）────────
  "events": {
    "emits":  ["data:activity:created"],
    "listens": ["data:activity:archived"]
  },

  // ── 校验（validation → 块级守卫）────────────────────────
  "validation": {
    "initiatorRoles": ["secretary"],     // 谁可发起（角色键）
    "requiredSop": true,                 // 必须带 sopRef（防漂移）
    "enabledByDefault": true             // 支部 config 未显式配置时的缺省
  }
}
```

### 字段取值合法性（校验规则）

| 维度 | 规则 |
|------|------|
| blockId | `^[a-z][a-z0-9-]{2,63}$`；与 capability/scenario id 一一对应，注册表缺失即契约失效 |
| provenance | 仅 2 值：`institution-common`（三会一课等全党通用）\| `branch-custom`（支部自创制度尝试）；通用块禁止声明为 branch-custom |
| kind | 仅 4 值：`textField/textareaField/selectField/dateField`（新增字段类型 = forms.js 库扩，不是块特例） |
| inputs.fields | fieldId 块内唯一；requiredConfigurable=true 时支部 config 可改必填；enabledDefault=false 的字段默认收起 |
| participants | mode=`configurable` 时须提供 defaultRoles；**角色键 = [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md) §9a0 角色键全表 / `docs/src/core/constants.js` `ROLE_KEYS` 之一**（两源同构对齐，见 ROLE_PERMISSION_DESIGN 收敛）；orgMode ∈ none \| organizer-deep（后者为支部自创组织模式，名单解析走 person 服务） |
| outputs.entities | 仅 services 层已存在实体名；不存在即声明即错误 |
| outputs.outputBlocks | 仅 OUTPUT_BLOCK_DEFS 目录内 id |
| validation.initiatorRoles | 仅 ROLE 常量内角色键；块对不可见角色自动隐藏（不泄露） |
| sopRef | 指向 content 内真实制度文档（死链四层法同款校验） |

### 组合声明（P3d v0，2026-09-05）

> 定位：把「块之间可组合关系」显式化——manifest 新增两个**可选**组合元数据字段。v0 为前端纯校验（模块加载自检 + 单测），**不进 server 端 config/路由校验**（服务端组合校验后续版本接入）。

| 字段 | 类型 | 语义 | 规则 |
|------|------|------|------|
| depends | `string[]` | 本块依赖的其他块 `blockId`（组合内先满足的块） | 引用必须 ∈ 本组合块 id 集合；**不允许成环**（含自依赖，DFS 检出） |
| conflictsWith | `string[]` | 与本块互斥的块 `blockId` | 引用必须 ∈ 本组合块 id 集合；**同一组合不得同时含互斥双方** |

- **引用必须存在**：`depends`/`conflictsWith` 的每个引用都必须是组合内某块的 `blockId`（引用组合外 id = 声明即错误，防笔误/漂移）。
- **互斥同含拦截**：同一组合清单同时出现 `conflictsWith` 双方即不合规（互斥对按 id 序规范化、去重，不偏袒声明方）。
- **depends 禁环**：`depends` 不允许成环——DFS（三色标记）检出并返回完整环路径。
- **收集式体检**：`resolveConflicts(items)` 不抛错，一次返回 `{ missingRefs, mutual, cycles }` 三类问题全集；`assertComposeValid(items)` 任一非空即抛错——错误信息含缺失引用（`引用方 -> 缺失 id`）、互斥双方 id、环路径；全部干净返回 `true`。
- **v0 边界**：前端纯校验，不进 server 路由与 `config-clean` 校验；服务端组合校验后续版本接入。
- **实现**：`docs/src/core/module-compose.js`（纯 ESM、零依赖、浏览器/Node 双端可加载）；试点块已按本契约在 `docs/src/workflow/blocks/manifests.js` 声明 `depends: []` / `conflictsWith: []`，块清单模块加载自检 + `server/test/module-compose.test.mjs` 接线断言。

---

## 三、与现有资产的映射表（落地不新造）

| manifest 段 | 落地资产 | 现状 |
|---|---|---|
| identity/capability | `core/registry.js` 注册表 + `mock/branches.js config` | ✅ 已有（M1~M4 / 支部 config.modules） |
| inputs.fields | `components/forms.js` 字段积木 | ✅ 已有（B2 交付；本契约使 forms 成为块输入渲染器） |
| workflow.stages | `WorkflowEngine` / scenario definitions | ✅ 已有（纯数据驱动，`docs/src/workflow/`） |
| outputs.entities/outputBlocks | services 层写口 + `OUTPUT_BLOCK_DEFS` + config.blocks | ✅ 已有（2026-09-03 产出块目录与支部级启停） |
| events | `DATA_CHANGED_EVENT` 广播 | ✅ 已有 |
| validation | 角色常量 + 支部 config + content 死链校验 | ✅ 已有（permission-gate / link-integrity） |
| **manifest 数据文件** | `docs/src/workflow/blocks/manifests.js`（THEME_PARTY_DAY_MANIFEST + TASKFORCE_RUN_MANIFEST，与引擎数据同目录；不另建 *.json） | ✅ 已编码（2026-09-03，见 §六 S1 / §七 S1） |
| **manifest 校验器** | 纯函数 `validateBlockManifest(m)`（无 DOM 依赖，可单测） | ✅ 已编码（2026-09-03，见 §七 S1：正/反样例单测绿） |

> 结论：**契约的每一个字段都已能找到既有落点**——L3 的唯一新增物是一份「元数据文件 + 校验器」，不触碰执行与渲染核心。

---

## 四、示例一：主题党日块（通用制度类，映射既有闭环）

```jsonc
{
  "blockId": "theme-party-day",
  "name": "主题党日组织块",
  "version": "1.0.0",
  "provenance": "institution-common",      // 三会一课/主题党日 = 全党通用制度
  "sopRef": "02_institution/sop/常见工作场景快速指南.md", // 主题党日 SOP 实际栖身此文件（「主题党日」节）
  "capabilityId": "activity-calendar",
  "scope": ["workspace:secretary", "workspace:leader"],
  "inputs": {
    "fields": [
      { "fieldId": "title", "label": "活动名称", "kind": "textField",  "required": true,  "hint": "如：学习两会精神主题党日" },
      { "fieldId": "date",   "label": "日期",     "kind": "dateField",  "required": true },
      { "fieldId": "type",   "label": "类型",     "kind": "selectField", "required": true, "requiredConfigurable": true,
        "options": [{ "value": "theme", "label": "主题党日" }] }
    ]
  },
  "participants": { "mode": "fixed", "defaultRoles": ["party-member"], "orgMode": "none" },
  "stages": [
    { "id": "create",  "kind": "decision-tree", "outputs": ["activity"] },
    { "id": "attend",  "kind": "engine",        "outputs": ["attendance"] }
  ],
  "outputs": { "entities": ["activity", "attendance", "todo"],
               "outputBlocks": ["attendance", "publicity"] },
  "events": { "emits": ["data:activity:created"] },
  "validation": { "initiatorRoles": ["secretary"], "requiredSop": true, "enabledByDefault": true }
}
```

对应闭环：书记在日历新建主题党日（forms.js 渲染 title/date/type）→ 决策树引导 → 整卡点击进入写入侧（write-tab 语义，2026-09-03 定稿）→ 出勤记录走考勤产出块（支部 config.blocks 控制是否启用）。

## 五、示例二：专班运行块（支部自创制度类，验证差异维度 ②③）

```jsonc
{
  "blockId": "taskforce-run",
  "name": "专班运行块",
  "version": "1.0.0",
  "provenance": "branch-custom",            // 专班 = 支部自己的制度尝试
  "sopRef": "02_institution/sop/组织委员工作流程指南.md", // 专班招募/运行 SOP（组织委员 = 唯一专班管理节点）；制度定义另见 COMMISSIONER_DUTY_FRAMEWORK.md §A.4~A.7
  "capabilityId": "taskforce",
  "scope": ["workspace:org-commissioner", "workspace:secretary"],
  "inputs": {
    "fields": [
      { "fieldId": "name",        "label": "专班名称",   "kind": "textField",    "required": true },
      { "fieldId": "goal",        "label": "目标",       "kind": "textareaField", "required": true },
      { "fieldId": "roles",       "label": "参与角色",   "kind": "selectField",   "required": true, "requiredConfigurable": true,
        "options": [{ "value": "organizer", "label": "组织者" }, { "value": "deep", "label": "深度参与者" }] },
      { "fieldId": "quota",       "label": "涉及人数上限", "kind": "textField",   "required": false, "enabledDefault": false }
    ]
  },
  "participants": { "mode": "configurable", "defaultRoles": ["party-member"],
                    "orgMode": "organizer-deep" },   // 支部自创「组织者+深度参与者」组织分层
  "stages": [
    { "id": "create",  "kind": "decision-tree", "outputs": ["taskforce", "assignment"] },
    { "id": "attend",  "kind": "engine",        "outputs": ["inspection"] }
  ],
  "outputs": { "entities": ["taskforce", "assignment", "inspection"],
               "outputBlocks": ["inspection", "materials"] },
  "events": { "emits": ["data:taskforce:created"] },
  "validation": { "initiatorRoles": ["secretary", "org-commissioner"], "requiredSop": true, "enabledByDefault": true }
}
```

> 该示例显式示范书记裁定的两块拼图：**表单条目可组装**（roles/quota 字段由支部配置收拢或扩展）与**参与人范围可组装**（组织者+深度参与者的组织模式来自支部自身实践，非上级制度统一规定）。

---

## 六、编码落地拆分（S1~S4 已按此拆分落地，2026-09-03；完成进度见 §七）

| 步 | 内容 | 验收 |
|----|------|------|
| S1 | `docs/src/workflow/blocks/manifests.js`：首批块 manifest + `validateBlockManifest` 纯校验器 | 校验器单测绿（合法/非法样例）；无 DOM 依赖 |
| S2 | 表单渲染桥（**2026-09-09 撤回 · 历史**）：原「manifest → forms.js 积木」独立桥 `blocks/form-renderer.js` 随代码减负删除——表单渲染由 forms.js 积木 + 消费方直读 manifest 元数据承担（S4 试点为存活路径） | 独立桥与单测已随撤回删除；存活验收 = S4 表单元数据单一源 E2E |
| S3 | 配置面接线：党委台「支部配置」按 manifest 目录展示块级启停与字段级收拢（config.blocks 语义不变） | E2E：停某块 → 对应入口消失 → 恢复回归 |
| S4 | 迁移试点：把一个既有 tab 的「新建表单 + 产出联动」改为由 manifest 驱动（行为零变化对比） | 前后 E2E 同一套全绿 |

**不做（YAGNI 边界）**：图形化条件分支连线（L4 部分）、块导出/市场（L5）、多版本回滚 UI。S1~S4 全部落地后，L4 画布仅剩"拖拽 → 写 config"的编辑器形态。

---

## 七、裁决记录与进度

**已裁决（2026-09-03）**：
- ✅ 差异框架：块差异化 = 流程组合 + 表单条目 + 参与人范围（三维正交）；制度来源分层 institution-common / branch-custom（§〇）。
- ✅ manifest 数据栖身：`docs/src/workflow/blocks/manifests.js`（与引擎数据同目录）。
- ✅ S3 配置面：党委台「支部配置」内展示块级启停与字段级收拢（不另设页面）。

**S1~S4 落地进度（2026-09-03，按书记裁定路线图）**：
- ✅ S1 已完成（书记点名 主题党日+专班，2026-09-03）：`docs/src/workflow/blocks/manifests.js`（THEME_PARTY_DAY_MANIFEST + TASKFORCE_RUN_MANIFEST + `validateBlockManifest` 纯校验器 + capability→provenance 权威对照防谎报）；单测 `server/test/block-manifest.test.mjs`（正/反 5 样例）+ module-load 全绿。
- ⚪ S2 独立渲染桥（2026-09-03 曾落地）已于 **2026-09-09 代码减负撤回**（书记批）：`blocks/form-renderer.js` 及其单测 `server/test/block-form-renderer.test.mjs` 删除——表单渲染回归「forms.js 积木 + 消费方直读 manifest 元数据」（S4 试点为存活路径，见下），字段语义（kind 映射 / enabledDefault 收拢）不变。
- ✅ S3 已完成（2026-09-03）：config.blocks 增 `workflowBlocks.hiddenBlockIds`（与 outputBlocks 平级，书记裁定）；branch.js 增 getWorkflowBlockPolicy/applyWorkflowBlockPolicy 纯策略；server config 校验兼容 { outputBlocks?, workflowBlocks? }；党委台「支部配置」新增「工作流块」区（manifest 目录 chips + 制度来源标签 通用制度/支部自创，启停/保存/恢复默认）；测试 workflow-block-config（HTTP+纯函数）+ block-config-ui-e2e 全绿。
- ✅ S4 已完成（2026-09-03，书记裁定挂载 主题党日创建侧）：calendar-tab（书记台写入面板）接入 manifest 驱动试点——①入口守卫：支部停用 theme-party-day → Step1 主题党日模板卡消失 + 停用提示（三会一课模板不受影响）；②表单元数据单一源：主题党日 Step2 标题字段 label/required/hint 读 THEME_PARTY_DAY_MANIFEST.inputs.fields.title（默认态渲染与既有完全一致）。测试 block-entry-guard-e2e（停用→消失+提示→恢复→回归）+ write-hover 回归（默认态整卡可点语义不变）全绿。

> L3 契约面 S1~S4 已落地（2026-09-03）；S2 独立渲染桥已于 2026-09-09 代码减负撤回（见上），S4 manifest 驱动为存活路径。L4 画布编辑器形态（拖拽→写 config.blocks.workflowBlocks）此前 YAGNI 排除，待后续批次。
