---
title: "契约类文档目录（04/contracts/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-11-18
status: active
---

# 契约类文档目录（04/contracts/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)；载体分职规则见 [OPERATIONS_GUIDE.md §32.1](../../03_doc_system/OPERATIONS_GUIDE.md) 第五类「契约」。

## 作用

本目录回答**「实现必须遵守什么结构 / 版本 / 兼容 / 验收」**，存放有规范效力、可被守卫或验收清单机检的契约文档。契约只写「必须遵守什么」，不写「为什么这样定」。

## 不负责什么

- 不写为什么、反例与沿革——归判例库（各域 `CASES.md`）或过程记录（`.ctx/logs/`）。
- 不写现行视觉、组件与布局条文——归 [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md) 与 `DS_01`…`DS_06`。
- 不写数据字段定义——归 [DATA_MODEL.md](../data/DATA_MODEL.md)。
- 不写角色权限矩阵——归 [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)。
- 不写页面入口形态设计——页面与模块设计归 `../module/`。

## 文件清单

| 文件 | 契约内容 | 状态 | 版本 | owner | 验收判据 |
|---|---|---|---|---|---|
| [WORKFLOW_BLOCK_CONTRACT.md](WORKFLOW_BLOCK_CONTRACT.md) | L3 工作流块封装契约：块差异化三维度、契约总则、`block manifest` 字段规格与取值校验 | active | 1.1 | 支书（契约裁决）；[工程师]+[AI]（维护） | `server/test/block-manifest.test.mjs`、`server/test/module-compose.test.mjs` 绿 |
| [PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md) | 院系党委 → 支部多实例两级治理契约：两级组织模型、配置写权分层、整行写口 `If-Match` 版本约束、公开与审计边界、分期验收 | approved-by-secretary | 1.1 | 支书（契约裁决）；[工程师]+[AI]（维护） | `SYSTEM_ROLE_PERMISSION §9a.1` ＋ `server/test/party-committee*.test.mjs` 绿 |
| [INTERACTION_AND_NAVIGATION_CONTRACT.md](INTERACTION_AND_NAVIGATION_CONTRACT.md) | 待办 / 今天跳转与就地动作契约：`actionKey` 三模式（inline / switch / direct）、六台页签覆盖、fail-closed 与缺 id 提示、PendingTarget 一次性清理 | active | 1.0 | 支书（契约裁决）；[工程师]+[AI]（维护） | `server/test/todo-jump-contract.test.mjs`、`server/test/todo-cross-role-safety.test.mjs` 绿 |
| [AGENDA_DERIVATION_CONTRACT.md](AGENDA_DERIVATION_CONTRACT.md) | 支委会议程来源分类与待议池契约：六类来源与另纳入两类、类型三值与四反例、服务端与客户端计算分工、`GET /api/v1/committee/agenda-candidates` 字段 | active | 1.0.0 | 支书（契约裁决）；[工程师]+[AI]（维护） | `server/test/agenda-classify.test.mjs` 绿 |
| [TABLE_COMPONENT_CONTRACT.md](TABLE_COMPONENT_CONTRACT.md) | 表格组件（`renderDataTable`）契约：载体判据（≥3 行 / ≤12 项）、列宽三档（auto / colgroup% / min-width）、行高 40 与 colspan 插行详情、`.dt-scroll` 横滚与 ≥5 列首列吸附、≥1024px 列宽拖动与 `localStorage['table:cols:<key>']`、灰字四层 | active | 1.0.0 | 支书（契约裁决）；[工程师]+[AI]（维护） | `server/test/table-contract-guard.test.mjs` 绿 |

## 状态词与变更规则

- **状态词**（frontmatter `status`，只取三值）：
  - `active`——现行有效，实现必须遵守；
  - `approved-by-secretary`——支书已逐段批准，仍在生效；
  - `landed`——契约内容已全部落为实现，文档转为档案，权威移至代码与对应规范。
- **每份契约必备 frontmatter 五键**：`type: contract`、`status`、`version`、`owner`、`acceptance`；缺一即由 `contract-doc-guard::CD1` 判红。
- **变更规则**：改动契约正文必须同批改 `version`、确认 `owner`、复核 `acceptance`；`acceptance` 写可执行的验收判据（守卫名或测试文件），不写「应该满足」这类空话。
- **落点单一**：`type: contract` 只允许出现在本目录；其他目录声明即由 `contract-doc-guard::CD2` 判红。
- **不拆为拆**：`ARCHITECTURE_EVOLUTION.md §十`（多支部同实例 Phase 1–4）仍留 `../evolution/`，需要引用时由本 README 指向，不单独复制成契约文件。

## 守卫映射

| 检查 | 守卫 | 判据 |
|---|---|---|
| 契约必备字段 | `server/test/contract-doc-guard.test.mjs::CD1` | `contracts/*.md` 逐份具备 `type / status / version / owner / acceptance` |
| 契约不得越界 | `server/test/contract-doc-guard.test.mjs::CD2` | 非 `contracts/` 文档不得声明 `type: contract` |
| 守卫自身不空转 | `server/test/contract-doc-guard.test.mjs::CD3` | 合成合格契约判绿；逐个缺字段判红 |
| 契约实现可运行 | `server/test/block-manifest.test.mjs`、`server/test/party-committee*.test.mjs` | 契约声明的结构与代码一致 |
| 表格契约可运行 | `server/test/table-contract-guard.test.mjs` | 组件参数 / colgroup / 手写表棘轮 / 灰字分层 / 390 无溢出与契约逐条对应 |

## 旧路径重定向

| 旧路径 | 现路径 |
|---|---|
| `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md` | `content/04_web_design/contracts/WORKFLOW_BLOCK_CONTRACT.md` |
| `content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md` | `content/04_web_design/contracts/PARTY_COMMITTEE_DESIGN.md` |
| `content/04_web_design/evolution/PUBLIC_ENTRANCE.md` | `content/04_web_design/module/PUBLIC_ENTRANCE.md`（页面入口设计，非契约） |
| `content/04_web_design/evolution/BRANCH_WORK_MAP.md` | `content/04_web_design/evolution/archive/BRANCH_WORK_MAP.md` |
| `content/04_web_design/evolution/ROLE_PERMISSION_DESIGN.md` | `content/04_web_design/evolution/archive/ROLE_PERMISSION_DESIGN.md` |
| `content/04_web_design/evolution/DESIGN_METHODOLOGY.md` | `content/04_web_design/evolution/archive/DESIGN_METHODOLOGY.md` |

> 历史日志与证据（`.ctx/logs/**`、`.ctx/evidence/**`）里的旧路径按「历史不可变」保留，不改写。

## 权威源与派生

- **本目录即契约权威**：各份契约在各自主题上承担规范效力，优先于任何复述它们的索引或论证档案。
- **从属关系**：契约服从上位规范——角色与权限矩阵以 `SYSTEM_ROLE_PERMISSION.md` 为准，视觉与组件以 `DESIGN_SYSTEM.md` 为准；冲突时以上位规范为准并回改契约。
- **派生档案**：契约落地后的「为什么、选了什么方向」留在 `../evolution/archive/` 与各域 `CASES.md`，本目录不重复。

## 知识流向

制度与裁定（`02_institution` / `.ctx` 决策日志）→ 在本目录形成「必须遵守什么」的契约 → 由 `docs/src/**` 与 `server/**` 实现 → 守卫与验收清单回证契约 → 契约全部落地后标 `landed`，论证部分转 `evolution/archive/`。

## 是否保留原始材料

不保留。契约只存结论与验收判据；真机读数、截图与逐批过程在 `.ctx/evidence/` 与 `.ctx/logs/`。

## 维护触发器

- 新增、删除或重命名本目录文件；
- 任一契约的 `status` / `version` / `owner` / `acceptance` 变化；
- 上位规范（`SYSTEM_ROLE_PERMISSION` / `DESIGN_SYSTEM` / `DATA_MODEL`）变更导致契约条款失效；
- 契约声明的结构在代码中被替换，验收判据需同步改写。
