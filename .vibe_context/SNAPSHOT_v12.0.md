# Repository Snapshot v12.0
Date: 2026-03-07

## 0. Physical Directory Tree (tree -L 4)

```text
GSM1921-SOP/
├── .vibe_context/                        # AI治理上下文（AI governance context）
│   ├── AI_CONTEXT.md                     # AI核心规则（三模块，44行）
│   ├── EXECUTION_LOG.md                  # 已废弃根日志（迁移至 logs/）
│   ├── FILE_ACCESS.md                    # 文件访问与二进制保护规则
│   ├── REVIEW_STATE.md                   # 审计状态追踪
│   ├── SNAPSHOT_INDEX.md                 # 快照版本索引
│   ├── SNAPSHOT_v10.0.md                 # 历史快照 v10.0
│   ├── SNAPSHOT_v11.0.md                 # 历史快照 v11.0
│   ├── SNAPSHOT_v12.0.md                 # 本文件（当前快照）
│   ├── logs/                             # 月度执行日志
│   │   ├── 2026-02-EXECUTION_LOG.md
│   │   └── 2026-03-EXECUTION_LOG.md      # ← 最新日志
│   └── scenarios/                        # AI场景策略文件（4个核心场景）
│       ├── core_logic.md
│       ├── meta_audit.md
│       ├── sop_sync.md
│       └── ui_scenario.md
├── assets/                               # 静态资源（占位，.gitkeep）
│   └── .gitkeep
├── docs/                                 # 技术文档区
│   ├── DOCUMENTATION_MAP.md              # 全局文档层拓扑图
│   ├── README.md
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md
│   └── 党支部管理与实务经验沉淀.md
├── knowledge/                            # 制度知识库（SOP母本）
│   ├── README.md
│   └── SOP/                             # SOP制度文件
│       ├── INDEX.md                      # SOP全局索引
│       ├── README.md
│       ├── 宣传委员工作流程指南.md
│       ├── 常见工作场景快速指南.md
│       ├── 支委与党小组定人定责定岗说明.md
│       ├── 纪检委员工作流程指南.md
│       └── 组织委员工作流程指南.md
├── src/                                  # 前端 ESM 源码（GitHub Pages 应用）
│   ├── domain.js                         # 数据领域模型
│   ├── id.js                             # ID生成工具
│   ├── main.js                           # 主应用入口（状态机 v8.5）
│   ├── service.mock.js                   # Mock服务层
│   └── service.runtime.js               # 运行时服务层
├── 参考资料/                              # 只读官方文件与会议记录（11个二进制文件）
│   ├── README.md
│   ├── 党小组会/
│   │   ├── 20251130党支部月度会议-发布版.pdf
│   │   ├── 光华管理学院本科生党支部关于成立党小组的说明-2505.docx
│   │   └── 党建活动SOP流程图-初版-白文琦&孙睿.pdf
│   ├── 官方文件/
│   │   ├── 【附件11】中国共产党章程.pdf
│   │   ├── 【附件12】党支部工作规范（学生）.pdf
│   │   ├── 【附件14】中国共产党党员教育管理工作条例（2019年5月21日）.docx
│   │   ├── 【附件15】中国共产党发展党员工作细则（2014年）.docx
│   │   ├── 【附件16】中国共产党普通高等学校基层组织工作条例（2010年8月13日）.docx
│   │   ├── 【附件17】中国共产党支部工作条例（试行）（2018年10月28日）.docx
│   │   └── (1 more .docx)
│   └── 支部委员会/
│       └── 支委工作手册26春.docx
├── 活动复盘/                              # 活动复盘记录模板
│   ├── README.md
│   └── 活动复盘模板.md
├── 申报材料模板/                          # 申报材料模板库
│   ├── README.md
│   ├── 其他模板/
│   │   ├── README.md
│   │   ├── 支部基本信息模板.md
│   │   └── 活动总结模板.md
│   ├── 宣传材料类/
│   │   └── README.md
│   └── 工作记录类/
│       ├── README.md
│       └── 党支部工作记录.docx
├── AI_ENTRYPOINT.md                      # AI统一入口（83行）
├── ARCHITECTURE.md                       # 系统架构文档
├── README.md                             # 项目主页（Org OS 驾驶舱）
├── SYSTEM_ROADMAP.md                     # 系统演进路线图
├── index.html                            # GitHub Pages 静态入口
└── 党徽.png                              # 党徽图像资源
```

## 1. Structural Overview
Root directories: `assets/`, `docs/`, `knowledge/`, `src/`, `参考资料/`, `活动复盘/`, `申报材料模板/`
Key files: `AI_ENTRYPOINT.md`, `README.md`, `docs/DOCUMENTATION_MAP.md`, `knowledge/SOP/INDEX.md`

## 2. AI System State
AI Entrypoint: `AI_ENTRYPOINT.md`
AI Context: `.vibe_context/AI_CONTEXT.md`
Scenario files: `core_logic.md`, `meta_audit.md`, `sop_sync.md`, `ui_scenario.md`

## 3. Governance System
Active governance protocol: Repository Clarity & Governance Audit Protocol v6
Logging system: `.vibe_context/logs/`
Latest execution log: `2026-03-EXECUTION_LOG.md`

## 4. SOP System
SOP location: `knowledge/SOP/`
SOP index: `knowledge/SOP/INDEX.md`
Total SOP files: 5 (组织委员工作流程指南.md, 宣传委员工作流程指南.md, 纪检委员工作流程指南.md, 常见工作场景快速指南.md, 支委与党小组定人定责定岗说明.md)

## 5. Binary Documents
Protected file types: pdf, docx, pptx, xlsx
Binary file count: 11

## 6. Change Summary Since v11.0
Major structural actions: AI_CONTEXT.md compressed to 44-line three-module core subconscious (Steps 7); README.md fully rewritten as 121-line Chinese Org OS dashboard (Step 8); SOP navigation index (knowledge/SOP/INDEX.md) created; DOCUMENTATION_MAP.md created; Binary Preservation Rule injected into FILE_ACCESS.md; Governance Audit Protocol v6 Steps 1–9 executed in full; Change Log Governance audit records appended to 2026-03-EXECUTION_LOG.md.
