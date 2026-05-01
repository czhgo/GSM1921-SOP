# File Timestamp Registry

> 全项目文件最后更新时间注册表
> last_updated: 2026-05-02 | 类型: [人机] | 维护方式: 每次文件修改后同步更新

---

## 更新规则

1. 每次文件内容修改后，须同步更新本注册表中对应条目的 `last_updated` 时间戳
2. 时间戳格式: `YYYY-MM-DD HH:MM:SS`
3. 新增文件须在本注册表中追加条目
4. 删除文件须将对应条目标记为 `🗑️ 已删除`
5. 本文件自身的时间戳在每次更新时同步刷新

---

## 根目录

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| README.md | 2026-05-01 00:00:00 | [人] | 对外门面 |
| ARCHITECTURE.md | 2026-05-02 00:00:00 | [人机] | 核心架构说明 |
| SYSTEM_ROADMAP.md | 2026-05-02 00:00:00 | [人机] | 未来执行路线图 |
| index.html | 2026-04-29 01:47:32 | [人机] | UI 入口 |
| .markdownlint.json | 2026-04-06 17:12:44 | [工具] | Markdown 规范 |
| .markdownlintignore | 2026-04-01 02:28:01 | [工具] | Markdown 忽略 |

## .github/ (Agent 治理层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .github/copilot-instructions.md | 2026-04-30 01:59:30 | [AI] | 宪章 |
| .github/SSOT_INDEX.md | 2026-05-02 00:00:00 | [AI] | 母本注册表 |
| .github/agents/mishuchu.agent.md | 2026-04-29 01:47:32 | [AI] | 秘书处 |
| .github/agents/zuzhibu.agent.md | 2026-04-29 01:47:32 | [AI] | 组织部 |
| .github/agents/fagaiwei.agent.md | 2026-04-29 01:47:32 | [AI] | 发改委 |
| .github/agents/gongxinbu.agent.md | 2026-04-29 01:47:32 | [AI] | 工信部 |
| .github/agents/waijiaobu.agent.md | 2026-04-29 01:47:32 | [AI] | 外交部 |
| .github/agents/sifabu.agent.md | 2026-04-06 17:12:44 | [AI] | 司法部 |
| .github/agents/jianchayuan.agent.md | 2026-04-06 17:12:44 | [AI] | 检察院 |
| .github/agents/jiguandangwei.agent.md | 2026-04-06 17:12:44 | [AI] | 机关党委 |
| .github/agents/shekeyuan.agent.md | 2026-04-06 17:12:44 | [AI] | 社科院 |
| .github/agents/danganguan.agent.md | 2026-04-06 17:12:44 | [AI] | 档案馆 |
| .github/skills/term-cleaner/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/anchor-fixer/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/yaml-slim/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/sop-sync/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/log-recorder/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/audit-report/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/data-inspector/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/ui-verifier/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/experience-distiller/SKILL.md | 2026-04-06 17:12:44 | [AI] | |
| .github/skills/sop2code/SKILL.md | 2026-04-06 14:52:33 | [AI] | |

## .vibe_context/ (审计底座)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .vibe_context/CONTEXT.md | 2026-05-02 00:00:00 | [AI] | AI 快速同步入口 |
| .vibe_context/FILE_TIMESTAMPS.md | 2026-05-02 00:00:00 | [人机] | 本文件 |
| .vibe_context/SNAPSHOT_v3.0_20260502.md | 2026-05-02 00:00:00 | [AI] | ACTIVE |
| .vibe_context/logs/EXECUTION_LOG_INDEX.md | 2026-05-01 00:00:00 | [人机] | 日志索引 |
| .vibe_context/logs/2026-02-EXECUTION_LOG.md | 2026-02-28 14:00:25 | [人机] | 已归档 |
| .vibe_context/logs/2026-03-EXECUTION_LOG.md | 2026-03-31 11:12:14 | [人机] | 已归档 |
| .vibe_context/logs/2026-03-AUDIT_REPORT.md | 2026-03-24 14:52:36 | [人机] | 审计报告 |
| .vibe_context/logs/2026-04-EXECUTION_LOG.md | 2026-04-06 17:12:44 | [人机] | 已归档 |
| .vibe_context/logs/2026-05-EXECUTION_LOG.md | 2026-05-02 00:00:00 | [人机] | 活跃 |

## src/ (代码实现层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| src/main.js | 2026-04-29 01:47:32 | [人机] | 启动入口 |
| src/state.js | 2026-04-29 01:47:32 | [人机] | 全局状态中心 |
| src/events.js | 2026-04-29 01:47:32 | [人机] | DOM 事件绑定 |
| src/calendar.js | 2026-04-29 01:47:32 | [人机] | 日历渲染 |
| src/styles.css | 2026-04-29 01:47:32 | [人机] | 全局样式 |
| src/domain.js | 2026-03-17 07:46:46 | [人机] | 领域模型 |
| src/constants.js | 2026-03-25 06:20:42 | [人机] | 静态常量 |
| src/utils.js | 2026-03-20 11:16:27 | [人机] | 通用工具 |
| src/id.js | 2026-03-05 07:44:34 | [人机] | UUID 发生器 |
| src/inspector.js | 2026-03-23 07:48:36 | [人机] | 检查器面板 |
| src/service.mock.js | 2026-03-20 11:33:28 | [人机] | Mock 服务层 |
| src/service.runtime.js | 2026-03-04 15:56:42 | [人机] | 运行时插槽 |
| src/workflow/index.js | 2026-03-23 11:25:24 | [人机] | 桶文件 |
| src/workflow/sop.js | 2026-03-23 11:25:24 | [人机] | SOP 实例化 |
| src/workflow/sopData.js | 2026-03-26 12:31:50 | [人机] | SOP 数据模板 |

## knowledge/ (制度母本层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| knowledge/README.md | 2026-03-07 13:30:34 | [人机] | |
| knowledge/SOP/INDEX.md | 2026-03-07 08:54:51 | [人机] | SOP 导航 |
| knowledge/SOP/README.md | 2026-03-17 08:14:58 | [人机] | |
| knowledge/SOP/Org_OS_极客操作手册.md | 2026-04-29 01:47:32 | [人机] | |
| knowledge/SOP/常见工作场景快速指南.md | 2026-04-01 02:28:01 | [人机] | |
| knowledge/SOP/支委与党小组定人定责定岗说明.md | 2026-04-01 02:28:01 | [人机] | |
| knowledge/SOP/宣传委员工作流程指南.md | 2026-04-01 02:28:01 | [人机] | |
| knowledge/SOP/纪检委员工作流程指南.md | 2026-04-01 02:28:01 | [人机] | |
| knowledge/SOP/组织委员工作流程指南.md | 2026-04-01 02:28:01 | [人机] | |

## docs/ (技术文档层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| docs/AGENT_USAGE.md | 2026-04-30 01:59:30 | [人机] | Agent 使用指南 |
| docs/DOCUMENTATION_MAP.md | 2026-05-02 00:00:00 | [人机] | 文档导航中心 |
| docs/README.md | 2026-03-07 13:30:34 | [人机] | |
| docs/SOP优化提案反馈卡.md | 2026-03-31 11:02:06 | [人机] | |
| docs/SOP数据映射与同步指南.md | 2026-04-01 02:28:01 | [人机] | |
| docs/党支部管理与实务经验沉淀.md | 2026-04-30 01:59:30 | [人机] | |

## 参考资料/ (官方底线层)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| 参考资料/README.md | 2026-02-28 16:48:20 | [人] | |
| 参考资料/党小组会/*.pdf/docx | 2026-02-28 16:48:20 | [人] | 只读 |
| 参考资料/官方文件/*.pdf/docx | 2026-02-17 16:01:31 | [人] | 只读 |
| 参考资料/支部委员会/*.docx | 2026-02-28 16:48:20 | [人] | 只读 |
| 参考资料/模板库/**/*.md/docx | 2026-03-31 11:02:06 | [人] | 只读 |

## .vscode/ (工具配置)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| .vscode/settings.json | 2026-04-06 14:52:33 | [工具] | |

## assets/ (静态资源)

| 文件路径 | last_updated | 角色 | 备注 |
|---------|-------------|------|------|
| assets/.gitkeep | 2026-03-07 05:27:23 | [工具] | |
| assets/images/party_emblem.png | 2026-03-07 16:07:57 | [人] | |

---

## 已删除文件记录

| 原路径 | 删除日期 | 原因 |
|--------|---------|------|
| AI_ENTRYPOINT.md | 2026-05-01 | 内容已合并至 ARCHITECTURE.md |
| .vibe_context/COMPLETED_TASKS.md | 2026-05-02 | 日志已覆盖，汇总表删除 |
| .vibe_context/PENDING_MODIFICATIONS.md | 2026-05-02 | 内容整合至 SYSTEM_ROADMAP.md §七 |
| .vibe_context/SUSPENDED_ISSUES.md | 2026-05-02 | 内容整合至 SYSTEM_ROADMAP.md §八 |
| .vibe_context/WATCH_LOG.md | 2026-05-02 | 全部已解决，验证后删除 |
| .vibe_context/AI_CONTEXT.md | 2026-05-02 | 内容融合至 CONTEXT.md |
| .vibe_context/REVIEW_STATE.md | 2026-05-02 | 内容融合至 CONTEXT.md |
| .vibe_context/SNAPSHOT_v1.3_20260327.md | 2026-05-02 | 归档删除 |
| .vibe_context/SNAPSHOT_v2.0_20260401.md | 2026-05-02 | 归档删除 |
| .vibe_context/SNAPSHOT_v2.1_20260406.md | 2026-05-02 | 归档删除，新 v3.0 生成 |
| .vibe_context/scenarios/*.md | 2026-05-01 | 全部场景文件已评估删除 |
| governance/ | 2026-05-01 | 迁移至 .vibe_context/ 后整合 |
| backlog/ | 2026-05-01 | 迁移至 .vibe_context/ 后整合/删除 |
