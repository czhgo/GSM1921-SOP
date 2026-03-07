# Repository Map

> **AI 必读顺序（每次会话起点）：**
> 1. `ARCHITECTURE.md` — 分层架构与 System Change Pipeline
> 2. `SYSTEM_ROADMAP.md` — 产品三阶段路线图
> 3. `.vibe_context/FILE_ACCESS.md` — 路由白名单与铁律

## 文件树（核心层）

```
/
├── index.html              # UI 入口（Apple Liquid Glass 骨架）
├── src/
│   ├── domain.js           # 领域层：Schema、mockDB、ACL
│   ├── id.js               # UUID 工具（纯函数）
│   ├── service.mock.js     # Mock 服务层：CRUD + LocalStorage
│   ├── service.runtime.js  # 运行时插槽：USE_MOCK + BranchService
│   └── main.js             # 状态机 + 唯一 DOM 入口（renderUI）
├── knowledge/SOP/          # 制度层（最高权威，所有变更起点）
├── .vibe_context/          # AI 审计底座（路由规则、场景定义、执行日志）
├── ARCHITECTURE.md         # 核心架构（含 System Change Pipeline）
├── SYSTEM_ROADMAP.md       # 产品路线图（Phase 1/2/3）
└── AI_ENTRYPOINT.md        # 本文件：AI 全局唯一入口
```

## 场景路由引擎（Scenario Routing）

| 场景 | 触发关键词 | 允许操作范围 |
|------|----------|------------|
| `META_AUDIT` | AI规则、审计、协议、日志 | `.vibe_context/*` |
| `SOP_SYNC` | 流程、制度、职责、负责人、时间节点、规则 | `knowledge/SOP/*`, `src/domain.js` |
| `CORE_LOGIC` | 字段、schema、activity、task、数据结构、API | `src/*` |
| `UI_SCENARIO` | UI、页面、按钮、布局、样式、体验 | `index.html`, `assets/*` |

**优先级（冲突时从左执行）：META_AUDIT → SOP_SYNC → CORE_LOGIC → UI_SCENARIO**

---

# AI Rules Summary

1. **唯一入口**：本文件是 AI 会话的全局起点，不得再创建其他入口文件。
2. **修改前声明**：任何文件修改前必须在对话框输出「Detected Scenario / Allowed Scope / Modification Plan」三要素。
3. **场景不明则停止**：场景完全不明确时，AI 必须暂停并向用户确认，不得自行推测执行。
4. **UI 不绕过 Service**：`main.js` 只通过 `BranchService`（`service.runtime.js`）调用服务，禁止直接操作 `mockDB`。
5. **DOM 唯一出口**：所有 DOM 写操作须经由 `renderUI()` 入口，禁止散落的 `document.querySelector().innerHTML` 直写。
6. **删除须记录**：任何文件删除须在 `.vibe_context/logs/2026-03-EXECUTION_LOG.md` 追加审计条目，包含日期、操作类型、被删路径、信息去向摘要。

## 人工快速导航（委员参考）

| 我需要... | 去哪里 |
|----------|--------|
| 了解工作流程 | `knowledge/SOP/常见工作场景快速指南.md` |
| 查我的职责分工 | `knowledge/SOP/支委与党小组定人定责定岗说明.md` |
| 取用工作模板 | `申报材料模板/` |
| 活动后复盘 | `活动复盘/活动复盘模板.md` |
| 查官方合规文件 | `参考资料/官方文件/` |
| 提交 SOP 改进反馈 | `docs/SOP优化提案反馈卡.md` |

**AI 协同标准调用指令：**
```
@workspace 请严格遵守 ARCHITECTURE.md 的 System Change Pipeline。本次场景为 [场景名]。
请先读取 .vibe_context/REVIEW_STATE.md 掌握当前进度，然后执行：[具体需求]。完成后更新 REVIEW_STATE.md。
```

---

# Change Protocol Entry

**单向变更流水线（铁律，不可逆序）：**

```
knowledge/SOP/*.md  →  src/domain.js  →  src/service.mock.js  →  src/main.js / index.html
     制度层（起点）        Schema 层          服务层                      UI 层（终点）
```

**Checkpoint 6 门控（每次执行）：**
- 修改 Service 或 UI 层前，必须确认 SOP 已更新且 Schema 已同步。
- 未通过 Checkpoint 6 → 禁止写入 Service/UI，必须停止并报告。

**Change Trace 三要素（修改任何 src/ 或 index.html 前必须输出）：**
1. `SOP change:` 本次 SOP 变更依据（引用 `knowledge/SOP/` 具体文件与条款）
2. `Schema impact:` `domain.js` 字段增删改情况（无变化须写 `none`）
3. `Service impact:` `service.mock.js` 方法增删改情况（无变化须写 `none`）
