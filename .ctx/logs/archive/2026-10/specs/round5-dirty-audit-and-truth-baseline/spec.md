# 第五轮：脏乱繁专项 × 数据真值基线 Spec

## Why

支书本轮提出四件事，并纠正批次 498 的一条受众口径：

1. **mock 不得削足适履**：mock 数据与适配器必须是服务端 API 结构的真实呈现，结构以 API 为准，改 mock 而不是改 API 迁就演示数据。
2. **daily test 需要精简**：抓主要矛盾、抓关键 probe，在效率与安全之间取平衡（当前 `test:daily` 含 206 个文件、约 1309 条断言、单次约 6 分钟；全套 237 个文件）。
3. **再来一轮 parallel agents 驱动的【脏乱繁】专项**：审查发现要能沉淀为可复用原则，不能只修页面。
4. **每批结束必须报告专项清单与下一轮建议**：专项较多，需要一张现行台账，而不是散落在各批日志里。

同时支书明确修正：内部汇报**起码是支委层＋当事人**可读；有工作组时要保护支委知情权；汇报要尽可能由**组织者汇总工作组、党小组组长汇总党小组**。

## What Changes

- **修正汇报受众与汇总口径（BREAKING，覆盖批次 498 的「支书层」口径）**：可见面改为支委层＋当事人＋该汇报工作组的组织者＋汇报人所在党小组的组长；新增「按工作组汇总」「按党小组汇总」两个只读汇总面。
- **新增数据真值基线**：建立 mock ↔ API 字段结构对照，产出差异报告并修 mock/seed；新增 seed 行漂移检测与修复（只更新既有 seed id，不新增数据）。
- **测试分层**：`test:daily` 收敛为「关键 probe」，全量守卫与真机普查分层运行；新增 probe 预算与分层登记守卫，删除须有覆盖证据。
- **第五轮【脏乱繁】平行审查**：三路独立 lens（不互读），只读产出报告；共识落规则、分歧交支书裁定、修复另落 spec。
- **专项台账与每批报告机制**：在 `.ctx/ENGINEERING_ASSESSMENT.md §四` 建「专项台账」，并在 `CLAUDE.md H20.3` 的 next_prompt 中强制报告台账快照与下轮建议。

## Impact

- Affected specs：`report-parent-and-issue-projection`（受众口径被本 spec 修正）、`audit-round3-modals-and-ia`（脏乱繁审查方法沿用）、`plan-four-round-audit-program`（新增第五轮）、`assign-cross-group-activity-to-party-group`（工作组责任党小组与跨组招募，决定「按工作组 / 按党小组汇总」的组织落点；两 spec 的 Task 1 需同批对齐）。
- Affected code：`docs/src/core/domain/issue-visibility.js`、`docs/src/services/governance/issues.js`、`components/record/report-inbox.js`、`entries/tabs/leader/*`、`entries/tabs/org/*`、`docs/src/data/mock/**`、`docs/src/data/mock-adapter.js`、`server/seed.js`、`server/test/**`、`server/package.json`。
- Affected docs：`SECRETARY_DIRECTIVES.md`、`DATA_MODEL.md`、`PARALLEL_SKILL_AUDIT.md`、`TEST_AND_VERIFICATION.md`、`CLAUDE.md`、`.ctx/ENGINEERING_ASSESSMENT.md`。

## ADDED Requirements

### Requirement: 汇报的组织汇总与知情权

系统 SHALL 让内部汇报按组织关系汇总，同时保证支委层的知情权。

#### Scenario: 支委层可读
- **WHEN** 查看者是支书 / 副支书 / 组织 / 宣传 / 纪检委员
- **THEN** 可读本支部全部内部汇报（含挂工作组与个人汇报）

#### Scenario: 工作组组织者汇总
- **WHEN** 查看者是一场活动或一个专班的组织者，且该汇报挂了对应工作组
- **THEN** 可读该工作组下的全部汇报，并在活动 / 专班上下文看到本组汇总（条数与列表）

#### Scenario: 党小组组长汇总
- **WHEN** 查看者是一个党小组的组长，且汇报人属于该党小组
- **THEN** 可读本组成员提交的汇报，并在组长台看到本组汇总

#### Scenario: 当事人
- **WHEN** 查看者是汇报人、被请求人或被指派人
- **THEN** 可读该条汇报

#### Scenario: 无关成员
- **WHEN** 查看者既非支委层、也非上述当事人 / 组织者 / 组长
- **THEN** 列表与直连接口都读不到该汇报

### Requirement: mock 与 API 结构同构

mock 数据与适配器 SHALL 以服务端 API 的字段结构为准；不得为保留 mock 而削弱 API 或数据模型。

#### Scenario: 结构对照
- **WHEN** 分别在种子库与 mock 形态加载同一集合
- **THEN** 字段集合与类型一致；仅允许带理由的「客户端投影字段」白名单（如按人计算的 `read`）

#### Scenario: 发现漂移
- **WHEN** mock 多出 API 不存在的字段，或缺少 API 必填字段
- **THEN** 修 mock / seed，并登记差异；不得改 API 去迁就 mock

### Requirement: seed 行漂移可检测

种子行（`SEED_*` / seed id）在既有库中 SHALL 可检测是否落后于当前种子，并可幂等修复。

#### Scenario: 旧库升级
- **WHEN** 既有 `data.db` 中的 seed 行与当前 `SEED_*` 不一致
- **THEN** 只更新既有 seed id 的行，不新增、不删除用户数据；重复执行无副作用

### Requirement: 测试分层与 probe 预算

测试 SHALL 分层运行：daily 只保留关键 probe；全量守卫与真机普查另行成档。

#### Scenario: daily 预算
- **WHEN** 运行 `test:daily`
- **THEN** 文件数、断言数与时长不超过登记预算；新增测试须同批登记层级

#### Scenario: 删除有据
- **WHEN** 从 daily 移除或删除一条守卫
- **THEN** 必须给出「被哪条覆盖 / mutation 验证其确已失效」的证据；不得因跑得慢而静默删测

### Requirement: 第五轮脏乱繁平行审查

审查 SHALL 按 H21 协议执行：三路 lens、每路一个 skill、不互读报告。

#### Scenario: 汇总
- **WHEN** 三路报告完成
- **THEN** 主代理只输出共识 / 分歧 / 待裁定，并给出「模式还是个案」判断；共识落原则文档，修复另落 spec

### Requirement: 专项台账与每批报告

系统 SHALL 维护一张现行专项台账，并在每批结束时报告台账快照与下一轮建议。

#### Scenario: 每批收尾
- **WHEN** 任一批次完成
- **THEN** 回复中列出：现行专项、各自状态、下一轮建议；台账以 `.ctx/ENGINEERING_ASSESSMENT.md` 为单一源

## MODIFIED Requirements

### Requirement: 内部汇报可见面（批次 498）

由「支书层＋当事人」改为「支委层＋当事人＋该工作组组织者＋汇报人所在党小组组长」；服务端 `GET /issues` 与前端所有读口继续共用同一判据。

## REMOVED Requirements

### Requirement: 以 mock 现状反推 API

**Reason**：与「数据适配功能」相悖，导致 mock 结构漂移、演示数据绑架真实模型。
**Migration**：以 API / 数据模型为权威，修 mock 与 seed；保留字段须进白名单并写理由。
