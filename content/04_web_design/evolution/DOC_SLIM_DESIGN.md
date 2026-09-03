---
title: "文档精简执行方案（批次 1-3）"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-03"
status: approved-by-secretary
related_files: [content/README.md, content/04_web_design/README.md, content/03_doc_system/README.md]
---

# 文档精简执行方案

> **书记 2026-09-03 批准**：文档数太多是主要矛盾。方案 = 删 2 / 归档 3 / 重复段收敛 / 索引同步。
> 目标形态：`content/` 60 篇 → 55 篇；无整篇废弃堆；同主题一律单一权威载体。
> 依据：三区取证（04_web_design / 03_doc_system / 01·02·05·insights）逐篇定位与互引核实。

## 一、三批动作清单

### 批次 1 · 结构（删 / 归档 / 瘦身 / 修复）
| 动作 | 文件 | 具体 |
|---|---|---|
| 删 | `content/04_web_design/data/DATA_ARCHITECTURE.md` | 正文已拆空（T-282），仅存跳转路由；跳转表并入 `04_web_design/README.md` 数据组说明后删除 |
| 删 | `content/03_doc_system/FUNCTION_MAP.md` | 自动生成派生稿（权威=function-catalog.js 与 SERVICE_CATALOG）；`docs/scripts/gen-function-mermaid.mjs` 改为只写 README 内嵌地图 |
| 归档 | `content/04_web_design/evolution/ROLE_SSOT_DESIGN.md` | S1~S10 已验收达成（§4.2 S9 participant↔visitor 映射并入 ROLE_CLASSIFICATION 注记后归档） |
| 归档 | `content/04_web_design/module/MODULE_UI_DESIGN.md` | 与 SOP_WEB/COMPONENT_SPEC 重叠、停更 |
| 新建 | `content/04_web_design/archive/README.md` | 归档索引：每篇迁入日期 + 原因 + 指向替代权威 |
| 瘦身 | `evolution/ARCHITECTURE_EVOLUTION.md` | 评估正文（被 MODULARIZATION_ASSESSMENT 承接）压为历史结论段，保留 §八 拖拽愿景定位 |
| 瘦身 | `module/SOP_WEB.md` | §B 架构/§E 数据映射/§G Mock-vs-鉴权 改指向权威源（DATA_* / ARCHITECTURE / DEPLOYMENT_AUTH_MODEL） |
| 瘦身 | `03_doc_system/README.md` | 文件清单与逐篇说明收敛（DOC_MAP 承担全仓库导航），压缩为目录入口 + 权威归属一句话 |
| 修复 | `04_web_design/README.md` | evolution 目录补录 BLOCK_MANIFEST_CONTRACT / L4_CANVAS_DESIGN / MODULARIZATION_ASSESSMENT；module 组更新（MODULE_UI 已归档） |
| 修复 | `deploy/DEPLOYMENT_AUTH_MODEL.md` | front matter `status: draft` → `active`（被 ROADMAP/README 当权威引用） |
| 修复 | `deploy/DEPLOYMENT_ROADMAP.md` | 尾部章节编号错乱修复（七→六→九 → 连续编号） |
| 修复 | `design-system/DESIGN_SYSTEM.md`、`module/SOP_WEB.md` 等 | front matter `last_updated` 回填正文实际更新日期 |

### 批次 2 · A1+A2 权威收口（涉及书记在意内容，先对照后落笔）
| 动作 | 具体 |
|---|---|
| A1 权限矩阵单一源 | ROLE_CLASSIFICATION §九 = 系统角色权限唯一权威；COMMISSIONER_FRAMEWORK §C 业务视角表**保留要点行**（书记可读视角），矩阵细则改为指向 §九；两处重复"同规则双编码"消除 |
| A2 同题章节归属 | USAGE_POLICY ↔ OPERATIONS_GUIDE 同题：术语规范 / 表达方式分类原则 / AI 展开原则——每主题确定唯一载体，另一处只留一行指针；章节编号重排（USAGE_POLICY 已知有跳号，一并修复） |

> 执行前：向书记呈现「每一处留哪一句 / 删哪一句」对照表，获确认后再编辑（本方案不授权自行删改书记表述）。

### 批次 3 · A3+A4+A5
| 动作 | 具体 |
|---|---|
| A3 指南规则收口 | 快速指南「公共规则表」= 通知/考勤/宣传/经费规则唯一载体；纪检/宣传/组长手册重述段改引用；组织↔纪检「考勤与考察档案同源、思想汇报自动归档」整句重复 → 单句定位快速指南公共规则表，两指南引用 |
| A4 定义句+死链 | FLAT_DESIGN §一 ↔ COMMISSIONER §A.4「专班并列概念」定义句单向化；快速指南 L43「附录 B」→ 修正为实际存在的「附录 A」或删除该引用 |
| A5 FUNCTION_MAP | 删除独立 md；gen 脚本 `--write` 目标仅 README（保留脚本备用于按需生成）；README 相关引用同步 |

## 二、风险控制与验证
- **链接完整性**：每批后跑 `cd server && npm test test/link-integrity.test.mjs test/references-official-links.test.mjs`（纯 node，沙箱可跑）；并全仓 grep 被删/被归档文件名，改链（DOC_MAP / SSOT_INDEX / 各 README / CLAUDE.md 引用，`.ctx` 不改）。
- **归档可追溯**：archive/README 记迁入日期与原路径；正文首行注明「已归档（YYYY-MM-DD），历史结论仍可读」。
- **不动**：`.ctx`、references/ 历史材料、官方合规原文、在用母本/指南正文事实（除 A3/A4 明确收敛句）。

## 三、验收
1. `content/` 根与三层 README 无指向已删/已归档文件的死链（link-integrity 绿）。
2. 同主题重复段收敛到单一载体（grep 抽查：专班定义句、公共规则、同源句、权限矩阵各剩唯一正文句）。
3. 批次间各一次提交（少而精，3 批 3 commit 上下）。
4. 全程不 push（待书记批准）。
