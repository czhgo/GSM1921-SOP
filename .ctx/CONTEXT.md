---
role: "[AI]"
---

# AI Context — 快速同步入口

> last_updated: 2026-05-03 | 类型: [AI] | 由 copilot-instructions.md 自动指针引导读取
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

**活跃快照**: .ctx/SNAPSHOT.md (v3)
**Snapshot 归档**: .ctx/snapshots/ (历史版本，见 INDEX.md)
**详细待办**: 见 [ROADMAP.md](../ROADMAP.md) §C

> ⚠️ 快照按需生成（里程碑/用户触发/阶段收官），非每次执行更新。日常变更记录于 DECISION_LOG + EXECUTION_LOG。

---

## 8. 会话交接协议（Context Continuity）

> **问题**：AI 会话上下文窗口有限，会话重启后全部任务进度和设计决策丢失。
> **目标**：确保任何新会话能在 30 秒内恢复到上一会话的精确断点。

### 8.1 上下文丢失场景分析

| 场景 | 触发条件 | 影响范围 | 严重度 |
|------|---------|---------|--------|
| 会话重启 | 上下文窗口满/IDE重启/新会话启动 | 全部任务进度、设计决策、代码修改上下文 | 🔴 严重 |
| 长任务中断 | 对话超出上下文窗口容量 | 当前任务前半段上下文丢失 | 🟡 中等 |
| 跨日继续 | 用户隔天继续工作 | 无法知道上次断点 | 🟡 中等 |
| 方向变更 | 用户在会话中改变需求方向 | 旧方向的设计决策与新方向混淆 | 🟠 较低 |

### 8.2 会话状态捕获规则

**每次会话结束前（或长任务中途），AI 必须更新本节 §8.3**：

1. 记录当前任务清单及完成状态
2. 记录本会话修改的文件列表
3. 记录关键设计决策（一句话摘要）
4. 记录下一步待办（精确到文件+行号）
5. 标记未解决的阻塞项

### 8.3 最近会话状态

**会话日期**: 2026-05-03（第4轮+修正）
**会话目标**: 
1. 用户3项任务（系统性经验沉淀 + 文档精简约简 + 侧边栏bug修复）
2. **紧急修正**: 经验沉淀逻辑错配，从 `.github/copilot-instructions.md` 迁移到 `content/insights/党支部管理与实务经验沉淀.md`

| 任务 | 状态 | 关键产出 |
|------|------|---------|
| T1: 系统性经验蒸馏 | ✅ 完成 | insights §1.5-§1.6-§2.3-§3.6 (~90行)：三大理论创新(四维度框架/写入机制/多维表格) + 6项设计模式 + 上下文连续性方案 + 4条经验教训 |
| T1修正: 经验沉淀迁移 | ✅ 完成 | 从 copilot-instructions.md 完整移除错误添加的经验沉淀章节，经验内容正确归入 content/insights/ 人类文档 |
| T2: 文档精简约简 | ✅ 完成 | ROADMAP §C1.1.7/§C1.1.9/§C1.2/§C1.7/§C2/常为新原则 6处精简(~40行净减)；DESIGN_SYSTEM.md 模板→资料查询；ORGANIZATION_BUILDING_MODULE/COMMISSIONER_ORGANIZATION_ROLE last_updated更新 |
| T3: 侧边栏bug修复 | ✅ 完成 | events.js: commissioner-group分支开头添加 closeSidebar() 调用，修复点击条条支委后侧边栏不收回的bug |

**本会话修改文件**:
- `content/insights/党支部管理与实务经验沉淀.md`: 新增§1.5/§1.6/§2.3/§3.6，版本 v3.0→v3.1，last_updated: 2026-05-03
- `.github/copilot-instructions.md`: 删除错误添加的经验沉淀章节 (~70行)
- `ROADMAP.md`: 6处精简约简（~40行净减）
- `src/events.js`: 侧边栏bug修复（+1行 closeSidebar()）
- `content/guides/DESIGN_SYSTEM.md`: 模板与资产→资料查询
- `content/guides/ORGANIZATION_BUILDING_MODULE.md`: last_updated更新
- `content/guides/COMMISSIONER_ORGANIZATION_ROLE.md`: last_updated更新
- `.ctx/CONTEXT.md`: §8.3本条目

**下一步待办** (三步走):
1. 第一步: C1.1.7 补全 (activity-type-input读取写入 + duration/direction维度 + 赋权持久化 + 先赋权再写入校验)
2. 第二步: C1.1.8 党支书全视图 (书记面板 + 独占操作 + 全局切换 + 赋权增强)
3. 第三步: C1.5 DESIGN-OPT Phase D1 (:root四层色盘 + Tailwind对齐 + body重写 + 排版工具类)

**未解决阻塞项**: 无

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
