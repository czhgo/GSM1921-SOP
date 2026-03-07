---
title: "Repository Snapshot v11.0"
type: snapshot
generated: "2026-03-07"
generated_by: "Chief Architecture Auditor"
constraint: "Read-only extraction — zero code modifications"
status: active
---

# 🛡️ Repository Snapshot v11.0

> **生成日期：** 2026-03-07  
> **生成角色：** Chief Architecture Auditor  
> **约束：** 只读提取，零代码修改，客观呈现当前工作区物理结构  
> **变更说明：** 相较 v10.0（2026-03-05），本快照新增 `assets/`、`knowledge/`、`.vibe_context/scenarios/sop_data_sync.md`、`.vibe_context/scenarios/meta_audit_log.md`，并反映 `ARCHITECTURE.md` 的 System Change Pipeline 更新（Step 7）。

---

### Repository Snapshot

```text
/                                               # 仓库根目录
├── index.html                                  # 静态入口，Apple Liquid Glass UI 骨架，100% 保持原样
├── 党徽.png                                     # 静态资源（党徽图标）
├── src/                                        # 应用源码层（原生 ESM，无构建工具）
│   ├── domain.js                               # 领域层：SCHEMA_VERSION、Activity/Task JSDoc、mockDB、can() ACL
│   ├── id.js                                   # UUID 发生器（纯函数，Web Crypto API，无副作用）
│   ├── service.mock.js                         # Mock 服务层：LocalStorage 持久化、CRUD、级联归档
│   ├── service.runtime.js                      # 运行时插槽：USE_MOCK 开关，BranchService 暴露点
│   └── main.js                                 # 状态机 + UI 驱动入口（SOP Database 内嵌，~710 行）
├── assets/                                     # 静态资源目录（占位）
│   └── .gitkeep                                # 空占位文件，保持目录被 Git 追踪
├── knowledge/                                  # 制度知识库（SOP 文档层，最高权威）
│   ├── README.md                               # 知识库导航索引
│   └── SOP/                                    # 规范操作程序文档（Canonical Authority）
│       ├── README.md                           # SOP 目录说明
│       ├── 宣传委员工作流程指南.md              # 宣传委员职责与流程 SOP
│       ├── 常见工作场景快速指南.md              # 通用场景快速参考 SOP
│       ├── 支委与党小组定人定责定岗说明.md      # 职责分工与岗位绑定 SOP
│       ├── 纪检委员工作流程指南.md              # 纪检委员职责与流程 SOP
│       └── 组织委员工作流程指南.md              # 组织委员职责与流程 SOP
├── docs/                                       # 扩展文档（非规范，辅助参考）
│   ├── SOP优化提案反馈卡.md                     # SOP 改进反馈模板
│   ├── SOP数据映射与同步指南.md                 # Schema ↔ SOP 字段映射说明
│   └── 党支部管理与实务经验沉淀.md              # 实务经验总结文档
├── .vibe_context/                              # AI 代理上下文与审计底座（AI 必读）
│   ├── FILE_ACCESS.md                          # AI 路由白名单（所有 AI 必读，铁律）
│   ├── EXECUTION_LOG.md                        # 执行日志导航索引（自 Session 18 起为纯索引）
│   ├── REVIEW_STATE.md                         # 评审状态记录（每次 Session 追加一行）
│   ├── SNAPSHOT_v10.0.md                       # 历史快照 v10.0（2026-03-05，已归档）
│   ├── SNAPSHOT_v11.0.md                       # 本文件：当前快照 v11.0（2026-03-07）
│   ├── logs/                                   # 月度执行日志归档目录（物理审计底座）
│   │   ├── 2026-02-EXECUTION_LOG.md            # 2026年2月执行日志（archived，Sessions 4–18）
│   │   └── 2026-03-EXECUTION_LOG.md            # 2026年3月执行日志（active，当前月）
│   └── scenarios/                              # 场景路由定义（AI 场景分派规则）
│       ├── activity_rules_enforcement.md       # 场景路由：活动规则执行
│       ├── meta_audit_log.md                   # 场景路由：元审计日志 + Execution Logging Rule（Step 8）
│       ├── sop_data_sync.md                    # 场景路由：SOP ↔ Schema 数据同步
│       ├── sop_restructuring.md                # 场景路由：SOP 重构
│       └── yaml_metadata_fix.md                # 场景路由：YAML 元数据修复
├── 参考资料/                                    # 官方文件与会议记录（只读参考）
│   ├── 党小组会/                               # 党小组会议记录与流程图
│   │   ├── 20251130党支部月度会议-发布版.pdf
│   │   ├── 光华管理学院本科生党支部关于成立党小组的说明-2505.docx
│   │   └── 党建活动SOP流程图-初版-白文琦&孙睿.pdf
│   ├── 官方文件/                               # 党章、支部工作条例、党员教育管理条例等
│   │   ├── 【附件11】中国共产党章程.pdf
│   │   ├── 【附件12】党支部工作规范（学生）.pdf
│   │   ├── 【附件14】中国共产党党员教育管理工作条例（2019年5月21日）.docx
│   │   ├── 【附件15】中国共产党发展党员工作细则（2014年）.docx
│   │   ├── 【附件16】中国共产党普通高等学校基层组织工作条例（2010年8月13日）.docx
│   │   └── 【附件17】中国共产党支部工作条例（试行）（2018年10月28日）.docx
│   └── 支部委员会/                             # 支委工作手册
│       └── 支委工作手册26春.docx
├── 活动复盘/                                    # 活动复盘模板目录
│   ├── README.md
│   └── 活动复盘模板.md
├── 申报材料模板/                                # 申报与工作记录模板目录
│   ├── README.md
│   ├── 其他模板/                               # 通用模板（支部基本信息、活动总结）
│   │   ├── README.md
│   │   ├── 支部基本信息模板.md
│   │   └── 活动总结模板.md
│   ├── 宣传材料类/                             # 宣传类模板
│   │   └── README.md
│   └── 工作记录类/                             # 工作记录类模板
│       ├── README.md
│       └── 党支部工作记录.docx
├── REPO_ENTRYPOINT.md                          # AI 代理唯一入口（三条必读指令）
├── ARCHITECTURE.md                             # 核心架构说明 v10.0（含 System Change Pipeline，Step 7 已注入）
├── SYSTEM_ROADMAP.md                           # 产品路线图 v10.0（Phase 1/2/3）
├── CHEATSHEET.md                               # 快捷备忘单（AI 常用命令速查）
├── START_HERE.md                               # 启动说明（首次上手指引）
└── README.md                                   # 公开说明（GitHub 首页显示）
```

---

## 架构层级速览

| 层级 | 文件/目录 | 职责 |
|------|---------|------|
| **制度层（最高权威）** | `knowledge/SOP/*.md` | 所有变更的唯一起点，驱动下游 |
| **领域层** | `src/domain.js` | Schema、mockDB、ACL；无外部依赖 |
| **服务层（Mock）** | `src/service.mock.js` | CRUD、LocalStorage 持久化、级联归档 |
| **服务层（运行时）** | `src/service.runtime.js` | USE_MOCK 开关；`BranchService` 暴露点 |
| **UI 层** | `src/main.js` + `index.html` | 状态机、唯一 DOM 写入（renderUI）|
| **审计底座** | `.vibe_context/` | AI 路由规则、场景定义、执行日志 |
| **参考层（只读）** | `knowledge/`、`参考资料/`、`docs/` | 制度依据、辅助文档、历史记录 |

---

## 变更摘要（v10.0 → v11.0）

| 变更类型 | 文件 | 说明 |
|---------|------|------|
| ✅ 新增 | `assets/.gitkeep` | 静态资源目录占位 |
| ✅ 新增 | `knowledge/SOP/*.md` | 5 份委员工作流程 SOP 文件 |
| ✅ 新增 | `.vibe_context/scenarios/sop_data_sync.md` | SOP ↔ Schema 数据同步场景路由 |
| ✅ 新增 | `.vibe_context/scenarios/meta_audit_log.md` | 元审计日志场景规则（Step 8） |
| ✅ 更新 | `ARCHITECTURE.md` | 注入 `## System Change Pipeline`（Step 7） |

---

*本快照由 Chief Architecture Auditor 角色生成，内容为工作区物理目录的客观提取，不含任何建议或修改指令。过滤项：`.git/`, `node_modules/`, `dist/`, `build/`。*
