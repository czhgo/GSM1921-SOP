---
title: "AI coding 技术层索引——网站系统的 AI coding 技术方法"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-11-03"
status: active
---

# AI coding 技术层索引——网站系统的 AI coding 技术方法

> 目录定位见 [DOC_MAP.md §五 目录作用表](../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录存放**知识类型 5：网站系统的 AI coding 技术方法**（权威定义见 [OPERATIONS_GUIDE.md §二](../03_doc_system/OPERATIONS_GUIDE.md)），回答「AI 编码的经验教训与陷阱、审查该先问什么」。

## 不负责什么

- 不写业务、制度与设计方法论——分别归 `02_institution/`、`04_web_design/`。
- 不写项目沿革与逐批过程——归 `.ctx/logs/`。
- 不写规范条文于本 README——规范正文在五个分篇，本文件只做索引。
- 不存截图与读数证据——归 `.ctx/evidence/`。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） | 读取策略 |
|------|-----------|-------------------|---------|
| [FILE_OPERATION_RULES.md](FILE_OPERATION_RULES.md) | 文件操作纪律：持久化、临时文件、工具选择、连续编辑、批量脚本与删除/迁移/仓库卫生 | **是**——文件操作域规范 | on-demand |
| [TEST_AND_VERIFICATION.md](TEST_AND_VERIFICATION.md) | 测试验证纪律：虚假确认、同一套数据盲区、受限视觉验证、e2e 写穿与承载形态守卫 | **是**——测试验证域规范 | on-demand |
| [DOCUMENT_GOVERNANCE.md](DOCUMENT_GOVERNANCE.md) | 文档治理与一改具改：执行规范、分层冲突、遗漏场景与文件归置 | **是**——文档治理执行域规范 | on-demand |
| [CONTEXT_MANAGEMENT.md](CONTEXT_MANAGEMENT.md) | 上下文管理与防失忆：上下文丢失、制度推断、总结失真与决策三分 | **是**——上下文域规范 | active |
| [REVIEW_AND_EXPRESSION.md](REVIEW_AND_EXPRESSION.md) | 评议与表达纪律：沉淀闭环、复盘、反论审核、尺度分类与叙述表达 | **是**——评议表达域规范 | on-demand |
| [DATA_CONSISTENCY_CHECKLIST.md](DATA_CONSISTENCY_CHECKLIST.md) | 数据同源一致性校验手册：按数据类别逐步检查，区分机器检查与人工检查 | 指针——测试验证域的配套手册 | on-demand |
| [PARALLEL_SKILL_AUDIT.md](PARALLEL_SKILL_AUDIT.md) | 多代理独立审查操作手册：提示词模板、输出 schema、汇总与反模式 | 指针——`CLAUDE.md H21` 的详版 | on-demand |
| [REVIEW_QUESTION_SET.md](REVIEW_QUESTION_SET.md) | 审查问题集：每轮开工逐条回答的布尔判据 | **是**——审查问题判据 | on-demand |
| [QUESTION_HIT_MATRIX.md](QUESTION_HIT_MATRIX.md) | 审查问题集命中矩阵：历史 spec × 问题的命中记录 | 派生——由 `REVIEW_QUESTION_SET` 与历史审查生成 | on-demand |
| [CASES.md](CASES.md) | AI 协作域判例：场景、结论、边界、对应规范编号与证据指针 | 否——判例不产生规范效力 | on-demand |
| [GUARD_INVENTORY.md](GUARD_INVENTORY.md) | 守卫清单与断言台账：按域分组、新增 / 合并 / 归并候选的登记处 | 指针——判据在各守卫源码与对应规范 | on-demand |
| [TAB_AUDIT_PLAYBOOK.md](TAB_AUDIT_PLAYBOOK.md) | 页签审计手册：45 页签五维检查怎么跑、怎么判、怎么加检查与加页签 | 指针——判据在 DS_06 / `audit/severity.mjs` | on-demand |
| [AUDIT_CANON.md](AUDIT_CANON.md) | 审计口径唯一表：F2 / F4 / F7-D2 / C1 / F1 的唯一判据与 daily / precommit / audit 分工 | 指针——规范在 DS_06，实现见 `server/scripts/audit/*` | on-demand |
| [AGENTS.md](AGENTS.md) | 本目录协作说明：分层裁决（不写规范判据）、验证命令与常见坑 | 指针 → 本 README 与五个分篇 | on-demand |
| `README.md` | 本层索引（分篇入口、边界与维护规则） | 指针 → 上述分篇 | active |

> **分篇章节指针：** `PARALLEL_SKILL_AUDIT.md` §14 SKILL 路由（前端 / 后端 / 全栈）——按任务类型选 skill、各类禁止项与并行审查纪律。

## 权威源与派生

- **权威源**：五个分篇 `FILE_OPERATION_RULES` / `TEST_AND_VERIFICATION` / `DOCUMENT_GOVERNANCE` / `CONTEXT_MANAGEMENT` / `REVIEW_AND_EXPRESSION` 是 AI 协作方法的规范正文。
- **派生/索引**：本 README 只做入口；`QUESTION_HIT_MATRIX.md` 从审查问题集派生；`CASES.md` 是判例档案（无规范效力）。
- **上位指针**：跨会话强制规则以根 `CLAUDE.md` 的 `H` 编号为准；本目录分篇是其展开，冲突时以 `CLAUDE.md` 为准。

## 知识流向

项目中的真实踩坑、评审意见与测试失败 → 在五个分篇沉淀为可复用规则 → 具代表性的写成 `CASES.md` 判例并保留证据指针 → 归纳出的检查问句进 `REVIEW_QUESTION_SET.md`，命中记录进 `QUESTION_HIT_MATRIX.md` → 跨会话强制执行的部分登记到 `CLAUDE.md`。

## 是否保留原始材料

不保留。原始过程在 `.ctx/logs/`（执行与决策日志），真机证据在 `.ctx/evidence/`；本目录只存加工后的规则、判例与审查判据。

## 维护触发器

- 新增、删除或重命名任一分篇或索引文件；
- 某分篇的规范条目变更（权威源变更）；
- 新增判例、更新审查问题集或命中矩阵；
- `CLAUDE.md` 的 `H` 编号与分篇对应关系变化。
