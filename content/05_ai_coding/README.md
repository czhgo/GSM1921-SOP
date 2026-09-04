---
title: "AI coding 技术层索引——网站系统的 AI coding 技术方法"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-09-04"
status: active
---

# AI coding 技术层索引——网站系统的 AI coding 技术方法

> **定位：** 本目录存放**知识类型 5：网站系统的 AI coding 技术方法**——回答"AI coding 的具体技术方法与常见错误教训"。
> **2026-09-04 书记分层裁决：05 = 唯一 AI 协作方法论层（活跃上下文）**——AI 协作方法论按协作环节拆细归入本层分篇；其余域（业务/制度/设计/文档治理等）的方法论请勿写入 05。
> **受众：** [工程师]+[AI]

---

## 文件清单

| 文件 | 定位 | read_strategy |
|------|------|---------------|
| [FILE_OPERATION_RULES.md](FILE_OPERATION_RULES.md) | 文件修改持久化 / 临时文件遗留 / 工具选择 / 子组件导入版本参数 / 同区域连续编辑覆盖 / 批量脚本沙箱重复执行 | on-demand |
| [TEST_AND_VERIFICATION.md](TEST_AND_VERIFICATION.md) | Subagent 验证虚假确认 / 同一套数据原则盲区 / 代码复杂度标准 / 受限视觉验证三件套 / 共享状态版本分裂 / e2e 写穿断言；含「数据同源一致性校验」节（指针见下） | on-demand |
| [DOCUMENT_GOVERNANCE.md](DOCUMENT_GOVERNANCE.md) | 一改具改执行 / 分层体系冲突记录 / 一改具改遗漏典型场景 | on-demand |
| [CONTEXT_MANAGEMENT.md](CONTEXT_MANAGEMENT.md) | 上下文丢失后制度推断 / 上下文丢失教训 / 对话总结虚假完成；含书记裁决落活层闭环规则 | active |
| [REVIEW_AND_EXPRESSION.md](REVIEW_AND_EXPRESSION.md) | 经验沉淀位置（insights 与 CLAUDE.md 分工） | on-demand |
| [DATA_CONSISTENCY_CHECKLIST.md](DATA_CONSISTENCY_CHECKLIST.md) | 数据同源一致性校验手册（工程质检流程，按数据类别逐步检查；机器检查+人工检查分工）——测试验证纪律域**配套手册**，被 [TEST_AND_VERIFICATION.md](TEST_AND_VERIFICATION.md)「数据同源一致性校验」节引用 | on-demand |

> 各分篇小节标题保留「原 §N」出处备注以溯源（如「一改具改执行陷阱（原 KNOWN_PITFALLS §2）」）；篇内正文对原编号（§1/§14/§17 等）的交叉引用亦保留原义。

---

## 分流来源声明（2026-09-04 重构）

- **原 KNOWN_PITFALLS.md（v1.17，19 条总篇）已拆分删除**：19 条按协作环节分归上述 5 个分篇（文件操作纪律 6 条 / 测试验证纪律 6 条 / 文档治理与一改具改 3 条 / 上下文管理与防失忆 3 条 / 评议与表达纪律 1 条），原文件不再存在。
- **DATA_CONSISTENCY_CHECKLIST.md**：2026-09-04 自 `content/04_web_design/evolution/` 迁入（AI 方法论归 05），为「测试验证纪律」域配套手册，保持独立文件（T1.3 已迁入）。
- **insights 工程方法论 AI 部分**：将于批次 2 并入本层（预留）。

---

## 与其他知识类型的关系

- **知识类型 1（战略）**：AI coding 的战略依据，见 `content/01_strategy/`
- **知识类型 3（文档系统管理）**：本目录文档的治理规范，见 `content/03_doc_system/`
- **知识类型 4（网站设计）**：AI coding 的设计依据，见 `content/04_web_design/`
- **经验沉淀**：AI coding 的经验沉淀，见 `content/insights/`
