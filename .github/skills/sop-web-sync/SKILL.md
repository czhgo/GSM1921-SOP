---
role: "[AI]"
name: sop-web-sync
description: SOP 母本与网页代码的双向同步校验。适用场景：SOP 变更后识别受影响代码、代码变更后溯源 SOP、术语/流程一致性校验。
last_updated: "2026-07-03"
---

# SOP ↔ 网页双向同步校验

## 目标

确保 SOP 母本（`content/sop/`）与网页代码（`docs/src/`）之间的双向一致性，支撑 H2.4（SOP↔网页双向修改规则）和 H3.1（一改具改）的自动化校验。

## 输入项

- **变更方向**：SOP→代码 / 代码→SOP / 双向校验
- **变更源文件**：被修改的文件路径
- **模式**：只读分析（产出影响面报告）或写盘（执行同步）
- **校验范围**：术语一致性 / 流程描述一致性 / 字段映射一致性

## 映射表

SOP 母本与代码的对应关系：

| SOP 母本 | 代码子本 | 关系 |
|---------|---------|------|
| `content/sop/活动管理.md` | `docs/src/entries/ws-leader-entry.js`（活动写入） | 活动写入流程 |
| `content/sop/活动管理.md` | `docs/src/entries/ws-secretary-entry.js`（日历+写入） | 活动写入流程 |
| `content/sop/考勤管理.md` | `docs/src/entries/ws-disc-commissioner-entry.js`（考勤 Tab） | 考勤管理流程 |
| `content/sop/考察管理.md` | `docs/src/entries/ws-disc-commissioner-entry.js`（考察 Tab） | 考察管理流程 |
| `content/sop/专班管理.md` | `docs/src/entries/ws-org-commissioner-entry.js` | 专班管理流程 |
| `content/sop/宣传管理.md` | `docs/src/entries/ws-prop-commissioner-entry.js` | 宣传管理流程 |
| `content/sop/补课制度.md` | `docs/src/entries/party-disc-entry.js` | 补课制度流程 |
| `content/sop/公邮管理.md` | `docs/src/entries/party-disc-entry.js` | 公邮管理流程 |
| `content/sop/党员发展.md` | `docs/src/entries/party-org-entry.js` | 党员发展流程 |
| `content/sop/档案归档.md` | `docs/src/entries/party-prop-entry.js` | 档案归档流程 |
| `content/governance/TERMINOLOGY.md` | `docs/src/core/constants.js`（ROLE_LABELS 等） | 术语权威源 |
| `content/design/COMMISSIONER_SYSTEM.md` | `docs/src/components/commissioner-matrix.js` | 委员系统设计 |
| `content/design/COMMISSIONER_SYSTEM.md` | `docs/src/services/auth.js`（AUTHZ_CHAIN） | 赋权关系链 |
| `content/design/MANAGEMENT_MODE.md` | `docs/src/entries/ws-*-entry.js`（各角色视图） | 差异化视图设计 |

## Gotchas

- **母本优先**：SOP 与代码不一致时，以 SOP 母本为准（H2.4 规则 3）
- **先改母本再改代码**：任何修改先改 `content/sop/`，再改 `docs/src/`（H2.4 规则 2）
- **术语权威源**：TERMINOLOGY.md 是术语的唯一权威源，constants.js 必须与其保持一致
- **代码豁免**：代码中的技术实现细节（CSS 类名、DOM 结构、事件处理）不属于 SOP 同步范围
- **数据结构是桥梁**：`content/design/DATA.md` 定义的数据字段是 SOP 和代码的共同约束

## 执行流程

### 模式 A：SOP→代码影响面分析

1. **读取变更 SOP**：识别修改的章节、术语、流程步骤
2. **术语扫描**：Grep 全仓库搜索变更术语在代码中的引用
3. **流程映射**：根据映射表定位受影响的代码文件
4. **影响面报告**：列出所有需要同步的代码文件 + 具体位置 + 修改建议

### 模式 B：代码→SOP 溯源校验

1. **读取变更代码**：识别修改的功能、数据字段、流程逻辑
2. **SOP 溯源**：根据映射表定位对应的 SOP 条款
3. **差异分析**：对比代码实现与 SOP 描述是否一致
4. **溯源报告**：列出需要同步的 SOP 文件 + 具体条款 + 修改建议

### 模式 C：双向一致性校验

1. **术语一致性**：对比 TERMINOLOGY.md 与 constants.js 中的术语
2. **流程一致性**：对比 SOP 流程步骤与代码中的实际逻辑
3. **字段一致性**：对比 DATA.md 中的字段定义与代码中的数据结构
4. **输出校验报告**：标记不一致项 + 修正建议

## 输出模板

```markdown
### SOP→代码影响面报告

**变更源**: <SOP 文件路径>
**变更内容**: <修改的章节/术语/流程>

| 受影响代码文件 | 引用位置 | 引用内容 | 同步操作 |
|--------------|---------|---------|---------|
| <文件路径> | <行号> | <当前值> | <需改为> |

**一改具改检查**:
- [ ] 全仓库引用已同步

### 代码→SOP 溯源报告

**变更源**: <代码文件路径>
**变更内容**: <修改的功能/字段/逻辑>

| 需同步 SOP 文件 | 对应条款 | 当前描述 | 需改为 |
|----------------|---------|---------|-------|

**母本优先检查**:
- [ ] SOP 母本已先于代码更新

### 双向一致性校验报告

| 维度 | SOP 母本 | 代码实现 | 状态 |
|------|---------|---------|------|
| 术语 | <TERMINOLOGY.md 值> | <constants.js 值> | ✅/❌ |
| 流程 | <SOP 步骤> | <代码逻辑> | ✅/❌ |
| 字段 | <DATA.md 定义> | <代码结构> | ✅/❌ |
```
