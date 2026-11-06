---
title: ".ctx 上下文仓库：三层分职与准入规则"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-11-03"
status: active
---

# .ctx 上下文仓库：三层分职与准入规则

> **定位（2026-11-03 批次 529 改准）**：`.ctx` **不是 active context，而是上下文仓库**。active context 是它的一个有界投影。
> **本文件只回答三件事**：① 什么内容进哪一层；② 每层读什么、什么时候读；③ 冲突与保鲜怎么处理。不复制任何台账正文。

## 一、三层

| 层 | 文件 / 目录 | 内容类型 | 更新频率 | 读取策略 |
|---|---|---|---|---|
| **active（热）** | `CLAUDE.md` ／ `.ctx/ACTIVE_CONTEXT.md` | 当前状态、当前判断、下一步动作、读取地图 | 每批 / 每条新裁定 | **每次会话必读** |
| **reference（温）** | `SNAPSHOT.md` ／ `ACTIVE_RULINGS.md` ／ `ENGINEERING_ASSESSMENT.md` ／ `REVIEW_QUEUE.md` ／ `TIMESTAMPS.md` | 系统形态、规则索引、评分证据、待评议、机器元数据 | 按批 / 按裁定 / 按文件 | 按需读，不默认全读 |
| **provenance（冷）** | `logs/` ／ `evidence/` | 执行 / 决策 / 审计原文；截图与读数 | 追加 | 只追溯时读；不改写历史 |

> **判据**：只有「**当前状态 / 当前判断**」有资格进 active；「**规则 / 判例 / 方法**」进 `content/01–05`；「**原始证据**」进 `evidence/`；「**过程流水**」进 `logs/`；「**何时动过**」进 `TIMESTAMPS.md`。

## 二、准入判据（新内容先过三问）

1. **知识类型**：是当前事实、规则、判例、方法、证据，还是元数据？
2. **更新频率**：每会话 / 每批 / 每裁定 / 每次改文件 / 只增不改？
3. **权威性**：它是权威源、投影、索引，还是一次性记录？

| 三问结果 | 去哪 |
|---|---|
| 当前事实 / 当前判断，且每批会变 | `.ctx/ACTIVE_CONTEXT.md`（active） |
| 长期规则，跨组织可复用 | `content/01–05` 对应层；`.ctx` 只留索引 |
| 判例 / 方法 / 审查步骤 | `content/05_ai_coding/`（或 04 的判例集） |
| 系统形态 / 页面 / 表清单 | `.ctx/SNAPSHOT.md`（reference） |
| 评分 / 阻断风险 / 行动线 | `.ctx/ENGINEERING_ASSESSMENT.md`（reference） |
| 待评议 / 待裁 | `.ctx/REVIEW_QUEUE.md`（reference） |
| 原始截图 / 读数 / 真机日志 | `.ctx/evidence/YYYY-MM-DD/`（provenance） |
| 执行 / 决策 / 审计原文 | `.ctx/logs/`（provenance） |

**禁止**：把规则正文写进 `.ctx` 顶层；把一次性证据写进 `ACTIVE_CONTEXT`；把已闭环待办留在 `REVIEW_QUEUE`；把历史论证塞进 `SNAPSHOT`。

## 三、读取顺序

1. 每次会话：`CLAUDE.md` → `.ctx/ACTIVE_CONTEXT.md`。
2. 需要系统形态 / 目录 / 表清单：`.ctx/SNAPSHOT.md`。
3. 需要分域裁定：`.ctx/ACTIVE_RULINGS.md` → 再按索引去 `content`。
4. 需要评分 / 下一批依据：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §四 / §5.2。
5. 需要待评议：`.ctx/REVIEW_QUEUE.md`。
6. 只有追溯成因 / 证据时：`.ctx/logs/`、`.ctx/evidence/`。

## 四、预算与保鲜

- `ACTIVE_CONTEXT.md`：**≤300 行 / ≤30KB**；超预算先把细节降级到 reference，再压缩措辞。
- `ACTIVE_RULINGS.md`：**≤150 行**；只留索引，不复制规则。
- `SNAPSHOT.md`：**≤250 行**；不再放批次小结。
- 每次收尾：`wc -l -c .ctx/ACTIVE_CONTEXT.md`；`latest_decision` 必须 ≥ 当月决策日志最后一条 `D-xxx`。
- 连续 3 批未触发、且不再影响动作的 active 行：删除或降级。

## 五、冲突处理

**权威顺序**：当月 `DECISION_LOG` ＞ `.ctx/ACTIVE_CONTEXT.md` ＞ `content` 权威 ＞ `SNAPSHOT.md` ＞ `ENGINEERING_ASSESSMENT.md` ＞ `logs` / `evidence`。

- 发现两处口径冲突：先找最新 `D-xxx`；找到即按它改投影与 content。
- 找不到：不得自行择边；登记到 `.ctx/REVIEW_QUEUE.md` 或 `CLAUDE.md` 丙部待裁。
- 改裁时三处一起动：决策日志追加新 `D-xxx` → `content` 对应节改准 → `ACTIVE_CONTEXT` / `ACTIVE_RULINGS` 投影同步。

## 六、文件索引

| 文件 | 层 | 只答一个问题 |
|---|---|---|
| `ACTIVE_CONTEXT.md` | active | 现在该知道什么、下一步做什么 |
| `SNAPSHOT.md` | reference | 系统现在长什么样 |
| `ACTIVE_RULINGS.md` | reference | 某条现行口径到哪找（索引） |
| `ENGINEERING_ASSESSMENT.md` | reference | 工程化到几成、先改哪条边界 |
| `REVIEW_QUEUE.md` | reference | 还要评议什么、怎么评 |
| `TIMESTAMPS.md` | reference | 哪个文件何时动过 |
| `logs/` | provenance | 当时为什么这么定、做了什么 |
| `evidence/` | provenance | 哪天的什么证据支持哪条判断 |

## 七、可复用资产（指针，不复制正文）

| 资产 | 落点 |
|---|---|
| 上下文三层 / 预算 / 冲突 | `content/05_ai_coding/CONTEXT_MANAGEMENT.md` |
| 文档准入 / 晋升 / 删除 | `content/05_ai_coding/DOCUMENT_GOVERNANCE.md` |
| 批次收尾协议 | `CLAUDE.md H40` + `content/05_ai_coding/TEST_AND_VERIFICATION.md` |
| 决策 → 裁定投影 | 本文件 §二 / §五 + `ACTIVE_RULINGS.md` |
| 证据索引 | `.ctx/logs/EXECUTION_LOG_INDEX.md` |
| 六维评分方法 | `.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 |
| 页签审计 | `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md` + `AUDIT_CANON.md` |
