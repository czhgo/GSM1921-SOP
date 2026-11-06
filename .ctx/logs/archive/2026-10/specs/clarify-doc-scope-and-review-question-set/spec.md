# 文档分职、旧轮倒查与守卫精简 Spec

## Why

连着几轮专项（506 主题色、507 链接与按压、508 字段外壳）暴露的不是「没想到某个细节」，而是**知识系统没有分职**：

1. **规范与判例混居**——`DESIGN_SYSTEM` 里 SD 规则、论证、历史判例、操作步骤写在同一节；读者无法判断「哪句是必须遵守的法条、哪句只是某次的边界说明」。上一版 spec 试图用「六段结构」把它们装进同一份文档，方向错了：**应该是文档之间各司其职，不是一份文档里堆六段**。
2. **审查靠 lens，不靠清单**——每轮换一个视角就换一批盲区；`.trae/specs` 里躺着 **35 个 spec**，从未被交叉复盘成「问题集」。
3. **`.ctx` 又脏又全**——8 类文件混放（evidence / logs / archive / rulings / assessment / queue / snapshot / timestamps），既是最重要的信息源，也是最难检索的地方；过去做过的「阶段小结」没有延续，落地过的总结后续被弃用。
4. **守卫泛滥**——`server/test` 264 个文件里约 **70 个** 属于 guard/truth/integrity/contract/parity/baseline；大量断言重叠，故障时只报「某处不符合」，定位成本高。

四件事的共同根因：**CLAUDE / AGENTS 只写了「要做什么」，没写「触发条件、唯一落点、怎么检查」⇒ AI 按最近一次上下文行事（逃逸）**。

## What Changes

- **文档四类分职（BREAKING）**：规范（法条）/ 判例库 / 索引（README、DOC_MAP）/ 过程记录（`.ctx`）各自只放一类内容，用编号互相引用，禁止混写。
- **旧轮倒查（≥40 轮）**：把 `.trae/specs` 35 个 spec ＋ 执行日志最近 40 条作为样本，产出「审查问题集 v1」与「历史命中矩阵」。
- **`.ctx` 治理**：定义 5 类桶与唯一归属；恢复「每批一次阶段小结」并以 `SNAPSHOT.md` 为唯一载体；对「过去落地后被弃用」做根因分析并给出防逃逸三件套。
- **守卫精简（BREAKING）**：清点 70 个守卫 → 重叠矩阵 → 合并到目标数量（以「故障可定位」为约束，而非越少越好）；**本批不新增第三个文档守卫，只加 1 个合并守卫**。
- **README / AGENTS**：README 只讲「作用 / 不负责 / 流向 / 是否留原始材料」；AGENTS 只讲「操作」，两者都不承载规范条文。

## Impact

- Affected specs: 文档治理（03）、AI 协作方法论（05）、设计系统索引（04）、审查协议（CLAUDE H21）、乙部生命周期（H50.1）
- Affected code / docs:
  - `content/03_doc_system/`（`OPERATIONS_GUIDE` 新增 §32 文档分职、`DOC_MAP` 目录作用表、新建 `CASES_INDEX.md`）
  - `content/04_web_design/design-system/`（规范正文去判例、新建 `CASES.md`）
  - `content/05_ai_coding/`（`REVIEW_QUESTION_SET.md`、`REVIEW_AND_EXPRESSION.md` 增「漏项原因」、`PARALLEL_SKILL_AUDIT.md` 前置步骤）
  - `.ctx/`（新增 `README.md`、`AGENTS.md`；`SNAPSHOT.md` 恢复为阶段小结；`EXECUTION_LOG_INDEX.md` 增「已被 content 吸收」列）
  - 11 个新 README ＋ 6 个 `AGENTS.md`
  - `server/test/`（新增 1 个 `docs-governance-guard.test.mjs`；合并/删除一批重复守卫）

## ADDED Requirements

### Requirement: 文档四类分职

系统 SHALL 把知识拆成四类载体，每类只承担一种职能：

| 类别 | 唯一职责 | 允许内容 | 禁止内容 | 落点 |
|---|---|---|---|---|
| **规范（法条）** | 说「必须／不得」 | 适用范围、SHALL 编号、布尔判据、守卫指针 | 判例正文、历史沿革、操作步骤 | `DESIGN_SYSTEM` / `DATA_MODEL` / `SYSTEM_ROLE_PERMISSION` / `DEPLOYMENT_GUIDE` / `OPERATIONS_GUIDE` |
| **判例库** | 说「为什么／边界在哪」 | 编号、场景、结论、反例、生效条件 | 新增要求（判例不得产生规范效力） | `content/03_doc_system/CASES_INDEX.md` ＋ 各域 `CASES.md` |
| **索引** | 说「东西在哪」 | 目录作用、权威源指针、阅读顺序 | 规范条文、判例正文 | 各目录 `README.md`、`DOC_MAP.md` |
| **过程记录** | 说「当时发生了什么」 | 时间线、证据、逐条过程 | 规则、结论沉淀（须迁 `content`） | `.ctx/logs`、`.ctx/evidence` |

#### Scenario: 新增一条设计规则
- **WHEN** 作者要加「选中态必须用主题 soft」
- **THEN** 在 `DESIGN_SYSTEM` 只写 `SD-25`（适用范围＋布尔判据＋守卫指针），把「待办行曾是 `#F3F4F6`」写进 `04/design-system/CASES.md` 并编号；两边互相引用，任一侧不重复另一侧正文

#### Scenario: 判例不得升级为要求
- **WHEN** 判例里出现「以后都应该这样」
- **THEN** 该句必须迁到规范侧成为带编号的 SHALL，否则判例侧删掉这句话

### Requirement: 审查问题集（≥40 轮倒查）

系统 SHALL 提供跨轮次的问题清单，且其条目必须来自对既有 spec 的倒查，而不是凭记忆。

#### Scenario: 下一轮换主题审查
- **WHEN** 开始一轮与色彩无关的审查
- **THEN** 仍须逐条回答清单（有 / 无 / 不适用＋理由），并输出「命中矩阵」

### Requirement: `.ctx` 分桶与阶段小结

系统 SHALL 让 `.ctx` 每个文件只有一个归属桶，并恢复「每批一次阶段小结」。

#### Scenario: 一批工作结束
- **WHEN** 批次收尾
- **THEN** `SNAPSHOT.md` 追加一段 5 行小结（做了什么 / 结论 / 未决 / 已迁 content 的条目 / 下批入口），并在执行日志留指针

### Requirement: 守卫最优数量

系统 SHALL 用「故障可定位」为约束精简守卫，而不是以数量为目标。

#### Scenario: 合并两个重叠守卫
- **WHEN** 两个守卫检查同一文件的同一规则族
- **THEN** 合并为一个，保留信息量最大的断言（fail 能指出文件＋根因），并做故障注入验证仍能报出

### Requirement: README 只讲作用

系统 SHALL 让 README 只回答「这个文件夹负责什么 / 不负责什么 / 知识流向 / 是否保留原始材料 / 何时需要更新」。

#### Scenario: 新人找部署
- **WHEN** 打开仓库根 README
- **THEN** 能按「去哪找什么」表走到 `deploy/README.md`，再进权威文档，全程不读代码

### Requirement: AGENTS 只讲操作

系统 SHALL 在 6 个高频目录提供 `AGENTS.md`，写明读什么、改什么、禁什么、怎么验、跨目录找谁、常见坑。

#### Scenario: AI 改 docs/src
- **WHEN** 任务落在 `docs/src/**`
- **THEN** 先读 `docs/src/AGENTS.md`，按其中命令自检后再提交

### Requirement: 防逃逸三件套

系统 SHALL 让每条长期纪律同时具备：**触发条件**（何时必须做）、**唯一落点**（写在哪）、**检查方式**（守卫或人工检查点）。

#### Scenario: 「阶段小结」不再被遗忘
- **WHEN** 批次收尾
- **THEN** CLAUDE H50.1 写明触发条件（批次收尾）、唯一落点（`SNAPSHOT.md`）、检查方式（`docs-governance-guard` 校验小结段存在）

## MODIFIED Requirements

### Requirement: 多代理独立审查协议（H21）

增加前置步骤：每轮先跑问题集并输出命中矩阵，再分 lens；未输出命中矩阵的轮次不算完成。

### Requirement: 乙部生命周期（H50.1）

完成项删除前，若产生可复用结论，必须先按四类分职落到对应载体（规范 / 判例 / 索引），并在 `EXECUTION_LOG_INDEX` 标「已被 content 吸收」。

### Requirement: 文档导航（DOC_MAP）

增加「目录作用表」与「四类载体索引」两节；目录作用表是 README 覆盖的唯一权威。

## REMOVED Requirements

### Requirement: 规范文档内嵌判例与沿革

**Reason**: 同一节里法条、判例、沿革混写，读者无法判断效力层级；上一轮用「六段结构」补救，反而把混写制度化。
**Migration**: 规范侧只留 SHALL 与判据；判例迁入各域 `CASES.md`；沿革压成一行指针回链执行日志。

### Requirement: 用新增守卫解决每个新问题

**Reason**: 70 个守卫里大量断言重叠，故障定位成本高于收益。
**Migration**: 新问题优先并入既有守卫或问题集；确需新增时，同批提交「与哪个守卫重叠、为何不能合并」的说明。
