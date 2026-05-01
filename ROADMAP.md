# System Roadmap

> **座右铭：常为新 — 已完成即删除，仅留待实施；一改俱改，钩稽联动**
> Org OS 未来执行路线图 — 仅记录待实施计划与决策上下文
> 最后更新：2026-05-02 | 类型：[人机] | **SNAPSHOT 记录现状，ROADMAP 记录未来**

---

## 钩稽关系与联动规则

> **核心原则：一改俱改** — 任何文件变更必须沿钩稽链传播，禁止孤立修改。

### 文档钩稽矩阵

| 变更源 | 必须同步的目标 | 同步方向 | 验证方式 |
|--------|---------------|---------|---------|
| `copilot-instructions.md` | 所有 agents/*.agent.md、skills/*/SKILL.md | 宪章→下游 | SSOT_INDEX.md 注册表校验 |
| `SSOT_INDEX.md` | 受影响的 agents/*.agent.md | 注册表→配置 | 映射关系一致性 |
| `ROADMAP.md` | ARCHITECTURE.md（架构变更时）、README.md（路线图摘要时） | 路线图→架构/门面 | 交叉引用校验 |
| `ARCHITECTURE.md` | CONTEXT.md（代码架构段）、DOCUMENTATION_MAP.md（层级描述） | 架构→上下文/导航 | 结构描述一致性 |
| `content/SOP/` | src/workflow/、SSOT_INDEX.md（映射关系） | 母本→代码 | Change Trace 四要素 |
| `src/workflow/` | CONTEXT.md（模块架构段） | 代码→上下文 | 依赖链校验 |
| `.ctx/` 结构变更 | CONTEXT.md、TIMESTAMPS.md | 底座→状态 | 目录树校验 |

### 联动执行协议

1. 变更发起方须在 Blueprint 中声明「钩稽影响面」
2. 变更完成后须沿钩稽链逐文件同步
3. 同步完成后须输出《联动校验报告》
4. 任何断链须在执行日志中标记 `⚠️ 钩稽断链`

---

## 一、标准化三步工作流

```
① 执行任务 → 按提示词完成，满足验收标准
② 生成 next_prompt → 格式：「下一步提示词：[内容]」，含目标+验收标准
③ 调用 @档案馆 记账 → Agent 自主调用 log-recorder Skill，
   将本次行动详情、结果、决策以 append-only 写入当月执行日志
```

**监督**：②缺失→任务未完成；③缺失→下次会话标记"待记账"

---

## 二、角色三分类体系（待实施）

| 角色 | 标记 | 职责 | 权限边界 | AI 读取规则 |
|------|------|------|---------|------------|
| 【人】 | `[人]` | 人类独立阅读、决策、授权 | AI 不可自动修改 | AI 不主动加载，仅被指向时读取 |
| 【人+AI】 | `[人机]` | 人类消费 + AI 自主读取用作上下文 | AI 可读，修改须 /ask 授权 | AI 按需检索 |
| 【AI】 | `[AI]` | AI Agent 专用指令与配置 | AI 读写（受宪章约束） | always-on 或 relevance-triggered |

### 实施计划

| 步骤 | 内容 | 依赖 |
|------|------|------|
| R1 | 产出正式角色定义文档，含职责/权限/协作方式/存储读取机制 | 待设计 |
| R2 | 评估角色体系长期可扩展性，制定迭代方案 | R1 完成后 |
| R3 | 将角色标记写入仓库全部文件的注释中 | R1 完成后批量执行 |

---

## 三、技术产品路线图

### Phase 2 — Supabase Backend（规划中）

- 接入 Supabase 后端（`service.supabase.js`）
- 将 `service.runtime.js` 中 `USE_MOCK` 切换为 `false`
- 用户认证（Supabase Auth）
- 实时同步（Supabase Realtime）
- 考察档案 ACL 隔离（仅支委可读写 `evaluation` 资源）

### Phase 3 — Workflow Engine（规划中）

- 完整 Workflow 引擎：Task 自动实例化、状态流转、提醒推送
- `dueDate` 驱动的自动化提醒（基于 `priority` 分级）
- SOP 场景与 Activity/Task 的全链路绑定
- 数据导出与审计报告生成
- **前置条件**: Phase 2 完成

---

## 四、待讨论议题

- `content/SOP/Org_OS_极客操作手册.md` 命名是否合理？
- `content/references/` 作为只读引用是否需要更严格的目录保护？
- SNAPSHOT 归档策略：是否需要保留历史快照，还是仅保留活跃快照？

---

## 五、待办修改项

| ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 备注 |
|----|------|------|--------|------|--------|------|
| 修改14 | 品牌活动与非品牌活动发起方式 — 主题党日活动场景增加两种路径 | process_change | 低 | Pending | 书记/组长 | ⏸️ 悬置：需书记明确解锁 |

---

## 六、暂缓议题

> **STRICT CONSTRAINT: The Agent MUST NOT modify or attempt to resolve these issues until explicitly unlocked by the 书记.**

| # | 作用域 | 问题 | 涉及文件 | 悬置原因 |
|---|--------|------|---------|---------|
| H3 | `[Global]` | 党小组工作手册（块块组长专用）尚未建设 | 待新建文件 | 本轮先通过SOP规定块块职责 |

---

## 七、决策日志

| 日期 | 决策 | 上下文 |
|------|------|--------|
| 2026-05-02 | 最优文件夹架构迁移完成：content/ 统一内容、.ctx/ 替代 .vibe_context/、SYSTEM_ROADMAP→ROADMAP | 消除三区边界模糊、降低 AI 上下文 token 消耗 |
| 2026-05-02 | C1-C5 AI 上下文快速同步机制实施完成 | CONTEXT.md 替代 AI_CONTEXT + REVIEW_STATE；旧 SNAPSHOT 归档，新 v3.0 生成 |

---

## 八、短期规划（1-2 周内）

| 优先级 | 编号 | 内容 | 依赖 | 预期产出 |
|--------|------|------|------|---------|
| 🔴 最高 | R1 | 产出正式角色定义文档 | 无 | content/guides/ROLE_CLASSIFICATION.md |
| 🔴 最高 | R2 | 评估角色体系长期可扩展性 | R1 | 可扩展性评估报告 |
| 🟠 高 | S1 | 验证全仓断链修复完整性 | 无 | grep 审计报告 |
| 🟠 高 | S2 | 更新 .ctx/SNAPSHOT.md 反映架构迁移后状态 | 无 | SNAPSHOT 更新 |
| 🟡 中 | S3 | 更新 .ctx/TIMESTAMPS.md 反映所有文件变更 | 无 | 时间戳刷新 |
| 🟡 中 | R3 | 将角色标记写入仓库全部文件注释中 | R1 | 全仓文件角色标注 |
| 🟢 低 | D1 | 讨论并决定 SNAPSHOT 归档策略 | 无 | 策略文档 |

---

## 九、当前执行状态

| 状态 | 说明 |
|------|------|
| ✅ 已完成 | A1-A12: 最优文件夹架构迁移 |
| ✅ 已完成 | C1-C5: AI 上下文快速同步机制 |
| ✅ 已完成 | 全仓断链修复（.github/ + content/ 共 20 个文件） |
| 🔜 下一步 | 执行 R1：产出正式角色定义文档 |
| 🔜 下一步 | 执行 S1-S3：断链验证 + SNAPSHOT/TIMESTAMPS 更新 |

---

## 十、快速导航

| 我需要... | 去哪里 |
|----------|--------|
| 了解项目全貌 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 看待办任务 | 本文件 §五 |
| 看暂缓议题 | 本文件 §六 |
| 查全局规则 | [.github/copilot-instructions.md](.github/copilot-instructions.md) |
| 查母本链路 | [.github/SSOT_INDEX.md](.github/SSOT_INDEX.md) |
| 查代码架构 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 查 SOP 流程 | [content/SOP/INDEX.md](content/SOP/INDEX.md) |
| 取用模板 | `content/references/模板库/` |
| 提改进反馈 | [content/guides/SOP优化提案反馈卡.md](content/guides/SOP优化提案反馈卡.md) |
| 查执行日志 | `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` |
| 查文件时间戳 | `.ctx/TIMESTAMPS.md` |
