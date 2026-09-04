---
title: "AI coding 技术层索引——网站系统的 AI coding 技术方法"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-09-05"
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
| [FILE_OPERATION_RULES.md](FILE_OPERATION_RULES.md) | 文件修改持久化 / 临时文件遗留 / 工具选择 / 子组件导入版本参数 / 同区域连续编辑覆盖 / 批量脚本沙箱重复执行 + 删除三铁律/架构迁移四步/仓库卫生（原 insights §2.3/§5.1/§5.11 并入） | on-demand |
| [TEST_AND_VERIFICATION.md](TEST_AND_VERIFICATION.md) | Subagent 验证虚假确认 / 同一套数据原则盲区 / 代码复杂度标准 / 受限视觉验证三件套 / 共享状态版本分裂 / e2e 写穿断言 + 模拟数据一致性/人工检查写法/修复前 Grep 定位/排序覆盖下拉/兜底模式/CSS 注释陷阱（原 insights §4.12.2/§5.10/§6.17/§6.25/§6.26/§6.29 并入）；含「数据同源一致性校验」节（指针见下） | on-demand |
| [DOCUMENT_GOVERNANCE.md](DOCUMENT_GOVERNANCE.md) | 一改具改执行 / 分层体系冲突记录 / 一改具改遗漏典型场景 + 命名/SSOT/单一表达/历史不可变/文件归置/spec 全流程/被否决残留（原 insights §1.1/§1.2/§1.3/§3.6/§4.8/§5.2-§5.4/§5.9/§6.4/§6.15/§6.27 并入） | on-demand |
| [CONTEXT_MANAGEMENT.md](CONTEXT_MANAGEMENT.md) | 上下文丢失后制度推断 / 上下文丢失教训 / 对话总结虚假完成 + 减负审查/只留当前/决策三分/看板归档/上下文工程/轮值推定/丙部触发（原 insights §2.1/§2.2/§2.5/§2.6/§3.1/§3.2/§3.3/§6.1/§6.5/§6.11 并入）；含书记裁决落活层闭环规则 | active |
| [REVIEW_AND_EXPRESSION.md](REVIEW_AND_EXPRESSION.md) | 经验沉淀位置（insights 与 CLAUDE.md 分工）+ 内容归属/沉淀闭环/复盘理念/反论纪律/表达可读性/讲解三层/T3 行话/Skill 检验（原 insights §1.6/§3.4/§3.7/§4.5-§4.8/§4.12.6/§4.15/§5.10/§6.2/§6.18/§7.1-§7.5 并入） | on-demand |
| [DATA_CONSISTENCY_CHECKLIST.md](DATA_CONSISTENCY_CHECKLIST.md) | 数据同源一致性校验手册（工程质检流程，按数据类别逐步检查；机器检查+人工检查分工）——测试验证纪律域**配套手册**，被 [TEST_AND_VERIFICATION.md](TEST_AND_VERIFICATION.md)「数据同源一致性校验」节引用 | on-demand |

> 各分篇小节标题保留「原 §N」出处备注以溯源（如「一改具改执行陷阱（原 KNOWN_PITFALLS §2）」）；篇内正文对原编号的交叉引用仅在本篇范围内保留原义；**跨篇互引必须带篇名 + 原编号**（如 FILE_OPERATION_RULES.md『同区域连续编辑相互覆盖陷阱』节（原 §14）），禁止裸「§N」。

---

## 分流来源声明（2026-09-04 重构）

- **原 KNOWN_PITFALLS.md（v1.17，19 条总篇）已拆分删除**：19 条按协作环节分归上述 5 个分篇（文件操作纪律 6 条 / 测试验证纪律 6 条 / 文档治理与一改具改 3 条 / 上下文管理与防失忆 3 条 / 评议与表达纪律 1 条），原文件不再存在。
- **DATA_CONSISTENCY_CHECKLIST.md**：2026-09-04 自 `content/04_web_design/evolution/` 迁入（AI 方法论归 05），为「测试验证纪律」域配套手册，保持独立文件（T1.3 已迁入）。
- **insights 工程方法论 AI 部分**：已并入本层（2026-09-04，随原「工程演进与设计方法论.md」整体分流归位；各分篇按协作环节承接，小节含「原 insights §N」出处注记，并入主题见上方文件清单定位列）。

---

## 与其他知识类型的关系

- **知识类型 1（战略）**：AI coding 的战略依据，见 `content/01_strategy/`
- **知识类型 3（文档系统管理）**：本目录文档的治理规范，见 `content/03_doc_system/`
- **知识类型 4（网站设计）**：AI coding 的设计依据，见 `content/04_web_design/`
- **经验沉淀**：AI coding 的经验沉淀，见 `content/insights/`
