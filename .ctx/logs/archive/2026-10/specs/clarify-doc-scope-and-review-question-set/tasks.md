# Tasks

> 边界：本批只做**文档与守卫**，不改产品代码与视觉。
> 并行边界：Task 1（倒查）与 Task 2（分职）都要动 `content/`，串行；Task 3（.ctx）独立；Task 4/5（README/AGENTS）可并行；Task 6（守卫精简）最后，因为它要读 4/5 的最终结构。

- [x] Task 1: 旧轮倒查 ≥40 轮 → 审查问题集 v1
  - [x] SubTask 1.1 样本面：`.trae/specs` 全部 **35 个** spec（名单见 spec 附录）＋ `.ctx/logs/2026-10-EXECUTION_LOG.md` 最近 **40 条**批次 ＋ `.ctx/logs/archive/2026-10/AUDIT_*.md` **12 份**审计。
  - [x] SubTask 1.2 每份样本抽「用户反馈原句 / 根因 / 修复动作」三元组；同一根因跨轮合并，统计出现轮次。
  - [x] SubTask 1.3 产出 `content/05_ai_coding/REVIEW_QUESTION_SET.md`：**14–20 条**布尔问题，按命中频次排序，四组（语义 / 状态 / 闭环 / 结构）；每条含判据、真实反例、守卫或人工检查点、误报边界、来源轮次。
  - [x] SubTask 1.4 产出 `content/05_ai_coding/QUESTION_HIT_MATRIX.md`：35 行 × N 列的命中表（`●` 命中 / `○` 不适用 / 空 未覆盖），用于下一轮查漏。
  - [x] SubTask 1.5 标出 **低频高危**条目（只出现 1 次但代价高，如「归档空壳」「深色键变灰」），单独成组，避免被频次排序挤掉。

- [x] Task 2: 文档四类分职
  - [x] SubTask 2.1 `content/03_doc_system/OPERATIONS_GUIDE.md` 新增 §32「文档分职与判例编号」：四类载体表（职责 / 允许 / 禁止 / 落点）、判例编号规则（`D-` 决策 / `SD-` 设计 / `SR-` 制度 / `OP-` 运行）、「判例不得产生规范效力」。
  - [x] SubTask 2.2 新建 `content/03_doc_system/CASES_INDEX.md`（判例总索引：编号 / 一句话 / 所属域 / 链接 / 对应规范编号）与三个域判例库：`04_web_design/design-system/CASES.md`、`02_institution/CASES.md`、`05_ai_coding/CASES.md`。
  - [x] SubTask 2.3 规范侧抽样迁移（不全量重写）：把 `DESIGN_SYSTEM` 中 SD-22…SD-32 的判例性文字抽到 `04/design-system/CASES.md`，正文只留「适用范围 + 布尔判据 + 守卫指针 + 判例编号」；其余 SD 条目登记为后续批次。
  - [x] SubTask 2.4 `DOC_MAP.md` 增两节：「目录作用表」（一级/二级目录 × 作用 / README / AGENTS / 权威源 / 是否留原始材料）与「四类载体索引」。
  - [x] SubTask 2.5 规范侧自检：五份规范文件（`DESIGN_SYSTEM` / `DATA_MODEL` / `SYSTEM_ROLE_PERMISSION` / `DEPLOYMENT_GUIDE` / `OPERATIONS_GUIDE`）各抽 3 节，确认「不含判例正文、SHALL 均有编号、均有守卫或人工检查点」；不达标处只补骨架，不重写正文。

- [x] Task 3: `.ctx` 治理与阶段小结复建
  - [x] SubTask 3.1 逻辑分桶（不物理移动，避免断链）：`evidence/`（原始证据）、`logs/`（过程）、`logs/archive/`（历史）、`state/`（`ACTIVE_RULINGS` / `SNAPSHOT` / `REVIEW_QUEUE` / `ENGINEERING_ASSESSMENT` / `TIMESTAMPS`）、`index/`（`EXECUTION_LOG_INDEX`）。
  - [x] SubTask 3.2 新建 `.ctx/README.md`：桶表、每桶「该放什么 / 不该放什么 / 谁来读」、检索入口、与 `content/` 的同步判据（可复用且能布尔化 → content；一次性证据 → evidence；两者 → 双向指针）。
  - [x] SubTask 3.3 读 `SNAPSHOT.md` 现状，恢复「每批一次 5 行小结」：做了什么 / 结论 / 未决 / 已迁 content 的条目 / 下批入口；并补本批小结。
  - [x] SubTask 3.4 弃用根因实证：找出至少 1 个「曾落地、后来无人执行」的机制（候选：阶段小结 / 复盘 / 判例归档），写出「指令缺哪一环导致 AI 逃逸」的因果链。
  - [x] SubTask 3.5 防逃逸三件套落地：`CLAUDE H50.1` 与 6 个 `AGENTS.md` 中，每条长期纪律必须同时有触发条件、唯一落点、检查方式。

- [x] Task 4: README 体系（只讲作用）
  - [x] SubTask 4.1 模板：**作用 / 不负责什么 / 文件清单（一句话）/ 权威源指针 / 知识流向 / 是否保留原始材料 / 维护触发器**；明确「不写规范条文、不写沿革（压一行指针）」。
  - [x] SubTask 4.2 重写现有 6 个（`content/README.md`、`01…05/README.md`、`insights/README.md`）；`04` 同时删 `DATA_MODEL` 重复行、刷 `last_updated`、补 §12.11–12.14 与四个新守卫指针。
  - [x] SubTask 4.3 新增 11 个：`docs/README.md`、`deploy/README.md`、`.ctx/README.md`（与 Task 3.2 合并）、`content/02_institution/sop/README.md`、`content/04_web_design/{data,deploy,design-system,evolution,module}/README.md`、`content/01_strategy/references/README.md`、`content/05_ai_coding/README.md`（已有则按模板重写）。
  - [x] SubTask 4.4 根 `README.md` 增「去哪找什么」路由表（用户手册 / 部署 / 设计 / 文档治理 / AI 协作 / 证据）。

- [x] Task 5: AGENTS.md（只讲操作）
  - [x] SubTask 5.1 模板：**读什么（≤3）/ 改什么 / 禁什么（3 条硬禁）/ 验证命令（定向＋全量，可直接复制）/ 交接口 / 常见坑**。
  - [x] SubTask 5.2 落地 6 个：`docs/src`、`server`、`server/test`、`content/04_web_design`、`content/05_ai_coding`、`.ctx`。
  - [x] SubTask 5.3 每个 AGENTS 必须含「防逃逸三件套」示例（至少一条：触发条件 / 唯一落点 / 检查方式）。

- [x] Task 6: 守卫精简（先研究，再执行）
  - [x] SubTask 6.1 清点：`server/test` 264 个文件中约 70 个 guard 类，逐条填「检查对象 / 断言数 / 覆盖文件 / 近 3 批命中次数 / 与谁重叠」。
  - [x] SubTask 6.2 重叠矩阵 → 合并提案：按「同一文件族 / 同一规则族」给出组，估算目标数量（以「任一故障能被唯一守卫定位」为约束，不设固定数字）。
  - [x] SubTask 6.3 本批**只执行 3 组**合并（其余登记后续批次），建议优先级：
    ① 颜色族：`theme-palette` ＋ `gold-accent` ＋ `ui-color-semantics` ＋ `activity-tone`；
    ② 交互族：`field-shell` ＋ `hover-state` ＋ `density-spacing` ＋ `button-system` ＋ `ui-control-system`；
    ③ 文档族：`doc-consistency` ＋ `doc-line-ref` ＋ `frontmatter-freshness` ＋ `timestamps-note`。
  - [x] SubTask 6.4 每组合并后做**故障注入**（故意改坏一处），确认新守卫仍报错且报出「文件 + 根因」；不满足则不合。
  - [x] SubTask 6.5 输出 `content/05_ai_coding/GUARD_INVENTORY.md`（清点表 + 合并记录 + 目标数量 + 后续批次清单），作为长期维护基线。

- [x] Task 7: 只加 1 个新守卫
  - [x] SubTask 7.1 新增 `server/test/docs-governance-guard.test.mjs`，一次覆盖：README 覆盖与必填字段、6 个 AGENTS 存在与命令块、规范侧不含判例正文（抽样白名单）、`SNAPSHOT` 有本批小结段、`CASES_INDEX` 每条判例有归属域。
  - [x] SubTask 7.2 登记 `test-tier-registry.mjs` 与 `package.json::test:daily`；说明「为何不拆成 3 个守卫」（避免守卫生殖）。
  - [x] SubTask 7.3 非空转：目录数、AGENTS 数、判例数、小结段数四类下限断言。

- [x] Task 8: 文档与验证
  - [x] SubTask 8.1 执行日志批次 509（Why / What / Verification / Boundaries / sample-diff：把六轮反馈写成问题集条目，并标命中矩阵）。
  - [x] SubTask 8.2 `TIMESTAMPS` 增行（新守卫、问题集、命中矩阵、判例库、README/AGENTS），备注总量控制在预算内。
  - [x] SubTask 8.3 定向（新守卫 + 合并后的三族 + `doc-*` / `timestamps` / `frontmatter`）→ daily → 全量三通道；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 1 是 Task 3.4（弃用根因）与 Task 6（重叠判断）的输入。
- Task 2 的「目录作用表」是 Task 4/7 的输入。
- Task 6 依赖 Task 4/5 落地后的目录结构；Task 6.3 的合并必须逐组过 6.4 才继续下一组。
- Task 7 最后写，避免重复断言。
