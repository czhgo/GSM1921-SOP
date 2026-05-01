# AI Context — 快速同步入口

> last_updated: 2026-05-02 | 类型: [AI] | 由 copilot-instructions.md 自动指针引导读取
> 详细架构见 [ARCHITECTURE.md](../ARCHITECTURE.md) | 待办见 [ROADMAP.md](../ROADMAP.md)

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

**系统模式**: Stable/Release v3.0
**活跃快照**: .ctx/SNAPSHOT.md

| 类别 | 数量 |
|------|------|
| 待办修改项 | 1（见 ROADMAP.md §五） |
| 暂缓议题 | 1（H3，见 ROADMAP.md §六） |
| 监控项 | 0（全部已解决） |

---

## 5. 仓库结构

```
/
├── README.md                    [人]  对外门面
├── ARCHITECTURE.md              [人机] 核心架构说明
├── ROADMAP.md                   [人机] 未来执行路线图
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
| 秘书处 | 协调型 | 计划拆解、排序 | ✅ |
| 组织部 | 执行型 | 文档规范、术语治理 | ✅→档案馆 |
| 发改委 | 执行型 | 文本母本治理 | ✅→档案馆 |
| 工信部 | 执行型 | 代码+SOP映射 | ✅→档案馆 |
| 外交部 | 执行型 | UI交互 | ✅→档案馆 |
| 司法部 | 执行型 | 违宪审查 | ✅→档案馆 |
| 检察院 | 审查型 | 三层合规审查 | ❌ |
| 机关党委 | 监督型 | 宪章+架构监督 | ❌ |
| 社科院 | 分析型 | 经验提炼 | ❌ |
| 档案馆 | 记录型 | 日志归档 | ❌ |

---

## 7. 钩稽联动规则

任何文件变更必须沿钩稽链传播，禁止孤立修改：
- copilot-instructions.md → agents/*.md + skills/*.md
- SSOT_INDEX.md → 受影响 agents
- ROADMAP.md → ARCHITECTURE.md + README.md
- content/SOP/ → src/workflow/ + SSOT_INDEX.md
- .ctx/ 结构变更 → 本文件 §5

断链须在执行日志中标记 `⚠️ 钩稽断链`
