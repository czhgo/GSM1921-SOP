---
title: ".ctx 审计底座：分桶说明与检索索引"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-10-24"
status: active
related_files: [CLAUDE.md, .ctx/SNAPSHOT.md, .ctx/logs/EXECUTION_LOG_INDEX.md, content/03_doc_system/DOC_MAP.md]
---

# .ctx 审计底座：分桶说明与检索索引

> **定位**：本文件只回答「`.ctx` 里的东西该放哪、去哪找」，不复制任何台账正文。
> **只做逻辑分桶**：不物理移动任何既有文件（避免断链、断历史）；桶是阅读与检索口径，不是新目录。
> **覆盖范围**：新建本文件前，`.ctx` 现存 **124 个文件**（`evidence/` 66 · `logs/` 53 · `state` 5）。其中「index」桶的 1 个文件物理位于 `logs/`，不移动。

## 一、五桶

| 桶 | 目录 / 文件（物理位置） | 该放什么 | 不该放什么 | 谁读 |
|---|---|---|---|---|
| **evidence** | `.ctx/evidence/YYYY-MM-DD/` | 截图、`metrics.json`、真机日志、交互采样等**原始证据**；文件名要能回答「哪天、哪个页面、什么状态」 | 结论、规则、待办、可复用方法 | `[AI]` 取证与复核时按日期查；`[工程师]` 复核证据链 |
| **logs** | `.ctx/logs/*.md`（当月执行 / 决策日志、审计原文） | 执行日志、决策日志、审计报告；带批次号 / `D-` 号 / 证据指针 | 规则（规则进 `CLAUDE.md` / `content`）、已闭环待办、可复用规范 | `[AI]` 每批开工与收尾；`[工程师]` 审计追溯 |
| **logs/archive** | `.ctx/logs/archive/YYYY-MM/` | 历史月份日志、已完成轮次的审计原文；**原样保留** | 新内容、回填改写（历史不可变） | `[AI]` 按需；**只读** |
| **state** | `.ctx/` 顶层 5 份台账（见 §二） | 当前基线、现行裁定投影、评议队列、工程评分、文件时间戳 | 逐批过程、一次性证据、未沉淀的结论 | `[AI]` 新会话开局同步现状；`[工程师]` 决策前查阅 |
| **index** | `.ctx/logs/EXECUTION_LOG_INDEX.md`（逻辑桶，**文件不移动**） | 跨批检索入口：月份文件目录、T 编号速查、归档指针、每条是否已被 `content` 吸收 | 执行正文、规则正文 | `[AI]` 找「哪批做过什么」；`[工程师]` 追溯来源 |

## 二、state 桶：五份台账各是什么

| 文件 | 回答什么问题 | 不回答什么（去哪） |
|---|---|---|
| `.ctx/SNAPSHOT.md` | **系统现在长什么样**：目录结构、页面与数据表清单、角色与基线口径；末尾另存**每批 5 行小结**（见 §四） | 沿革与逐批细节 → `logs/YYYY-MM-EXECUTION_LOG.md`；工程打分 → `ENGINEERING_ASSESSMENT.md` |
| `.ctx/ACTIVE_RULINGS.md` | **现在该怎么判**：现行有效裁定速查，每行指到 `D-` 号 | 决议正文、已废止裁定、沿革 → `logs/YYYY-MM-DECISION_LOG.md` |
| `.ctx/REVIEW_QUEUE.md` | **要评议什么、评议怎么做**：需多轮启动的专项、待裁 / 待落地命题、支书检查要点 | 过程、进度、逐批沿革、落地细节 → `logs/` |
| `.ctx/ENGINEERING_ASSESSMENT.md` | **工程短板在哪、先改哪条边界**：六维评分、残项、改造行动线 | 逐批论证与沿革 → `logs/`；规则判据 → `CLAUDE.md` / `content/05_ai_coding/` |
| `.ctx/TIMESTAMPS.md` | **哪些文件何时被谁动过、周期任务何时到期** | 改了什么、为什么改 → `logs/`；系统现状 → `SNAPSHOT.md` |

## 三、与 `content` 的同步判据（三问）

任何 `.ctx` 产出要进 `content` 前，先逐条回答三问：

1. **可复用？**——能脱离本批场景 / 本支部，被下一位 AI 或另一个支部直接复用。
2. **有结论？**——写的是结论，不是过程、不是待定项、不是纯数据。
3. **能布尔化？**——能落成可判定的判据、清单或守卫断言（至少能写出「什么算违反」）。

| 三问结果 | 去哪 | 写法 |
|---|---|---|
| 三问全「是」 | **`content/`** | 按分职落位：规范 → `03_doc_system/` / `04_web_design/`；判例 → `05_ai_coding/`；索引 → 对应 `README` / `DOC_MAP` |
| 只有一次性取证价值 | **`evidence/`** 原件 + `logs/` 一行指针 | 不写结论，只写「哪天的什么证据、支持哪条判断」 |
| 两者都要 | **双向指针** | `content` 写结论并带 `evidence` / `logs` 的 `file:line`；`evidence` 原件与日志段保留回链；**不复制正文** |
| 任一「否」 | 留 `logs/` | 不得以「先写进 content 再说」污染母本；待结论成形后再迁 |

> **判据速记**：可复用 → 规范；有结论 + 可布尔化 → 判例 / 守卫；只有现场价值 → 证据。删除任何 `.ctx` 条目前先过这张表（`CLAUDE.md H50.1 §3.1`）。

## 四、阶段小结：唯一落点 / 触发条件 / 检查方式

> 防逃逸三件套必须同时具备；缺一即会重演「建立后无人执行」（判例与因果链见 `content/05_ai_coding/REVIEW_AND_EXPRESSION.md`「审查漏项的结构性原因」）。

| 件 | 内容 |
|---|---|
| **唯一落点** | `.ctx/SNAPSHOT.md` 末尾的 `## 批次 NNN 小结（YYYY-MM-DD）` 段；固定 5 行：**做了什么 / 结论 / 未决 / 已迁 content 的条目 / 下批入口**。不另起文件，不写进 `REVIEW_QUEUE` / `ENGINEERING_ASSESSMENT`。 |
| **触发条件** | **每批收尾**：执行日志写完、测试读数落盘之后，向用户回报之前。 |
| **检查方式** | `docs-governance-guard` 校验 `SNAPSHOT.md` 存在**最近一批**小结段且 5 行齐全；缺段 / 缺行即红。 |

> **现状（如实）**：本仓现有 `server/test/ctx-hygiene-guard.test.mjs` 只守 `.ctx` 顶层白名单与归档指针，尚未断言小结段；`docs-governance-guard` 的该条断言待后续批次补入。本批授权面不含 `server/**`，故当前以 `CLAUDE.md H50.1 §3.2` + 本表人工核对。
>
> **与基线的关系**：小结段是**每批索引**，只追加、不重写 §I–§VI；不改变 `OPERATIONS_GUIDE §15.3` 的基线重生成触发条件。

## 五、检索入口

| 想找什么 | 去哪 | 关键词 / 入口 |
|---|---|---|
| **某条规则**（现行怎么判） | `CLAUDE.md` 甲部 / 乙部 → `content/05_ai_coding/` / `content/03_doc_system/`；现行裁定速查 → `.ctx/ACTIVE_RULINGS.md` | `H` 编号、`R-` 编号、`D-` 编号 |
| **某次为什么这么改** | `.ctx/logs/YYYY-MM-DECISION_LOG.md`（决议）→ 同月 `EXECUTION_LOG.md`（过程）；跨批先查 **index 桶** | `D-` 号、批次号、文件名 |
| **某张截图 / 某组读数** | `.ctx/evidence/YYYY-MM-DD/`；引用点看执行日志里的 `evidence` 路径 | 日期 + 页面名 + `metrics` |
| **系统现在长什么样** | `.ctx/SNAPSHOT.md` | 目录、页面、表数、角色 |
| **工程短板 / 下一批做什么** | `.ctx/ENGINEERING_ASSESSMENT.md` | 六维、残项、行动线 |
| **待评议命题 / 检查要点** | `.ctx/REVIEW_QUEUE.md` | 专项编号、`SOP-` 编号 |
| **历史月份 / 旧审计原文** | `.ctx/logs/archive/YYYY-MM/`（只读） | 月份 + 文件名 |

## 六、维护规则

1. **先判桶再落笔**：新增文件先按 §一判定归属；不属于任何桶的，先沉淀到正式文档再归档。
2. **不物理移动既有文件**：本 README 只是索引；归档动作只允许「新增到 `logs/archive/YYYY-MM/`」或按既有归档规则移动，不改写历史内容。
3. **白名单**：`.ctx` 顶层准入以 `CLAUDE.md H26.3` 为准（当前 7 项）。本 README 是索引文件，属新增第 8 项——白名单与 `ctx-hygiene-guard` 的断言需在后续批次同步；本批不改 `server/**`。
4. **每批收尾**：按 §四 在 `SNAPSHOT.md` 追加 5 行；同时检查「已迁 content 的条目」是否有指针。
