# Tasks

- [x] Task 1: 落盘四轮程序与 Round 1 范围
  - [x] SubTask 1.1 确认本 spec 的四轮表、R2–R4 lens 矩阵、停线与触发条件
  - [x] SubTask 1.2 更新 H21 的 Round 1 状态为「本 spec 批准后启动；停在审计报告 + 修复 spec」
  - [x] SubTask 1.3 在 `.ctx/UNFINISHED_AUDIT_BACKLOG.md` 顶部加「轮次程序指针」，指向本 spec
  - [x] SubTask 1.4 把四轮表同步写入 `CLAUDE.md` H21.2 与 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` §9（持久层）
  - [x] SubTask 1.5 给三份临时 `.ctx` 文件加「退出条件」行：WORKBENCH_INFORMATION_AUDIT / WORKBENCH_68_TAB_AUDIT_DRAFT / UNFINISHED_AUDIT_BACKLOG

- [x] Task 2: 建 53 条 triage 底表
  - [x] SubTask 2.1 读取 `.ctx/UNFINISHED_AUDIT_BACKLOG.md` 的 U-01…U-53
  - [x] SubTask 2.2 为每条标注类别（页面/信息结构 · 交互/流程 · 数据/API/权限 · 文档/证据）
  - [x] SubTask 2.3 标注高风险（是否待支书裁定=是 且页面/信息结构）
  - [x] SubTask 2.4 按 `sample-diff-learning` 选深审样本：全部高风险 + 每类至少 2 条，上限 15
  - [x] SubTask 2.5 输出底表到 `.ctx/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md` 的「一、triage 底表」

- [x] Task 3: 三路并行独立审查（深审样本）
  - [x] SubTask 3.1 启动三个子代理，分别只加载 `web-design-guidelines` / `design-with-taste` / `frontend-design`
  - [x] SubTask 3.2 每个代理只拿深审样本 + 统一提示词；不读其他代理报告
  - [x] SubTask 3.3 每个代理按输出 schema 给「现象 / 证据 / 影响 / 建议方向 / 严重度 / 可能冲突」
  - [x] SubTask 3.4 主代理核对证据，剔除无证据项

- [x] Task 4: 53 条全量 disposition
  - [x] SubTask 4.1 对非深审条目做三路 desk review（每条一句话结论 + 证据）
  - [x] SubTask 4.2 每条填「lens A/B/C 结论 · 汇总 · 建议轮次 · 是否待裁定」
  - [x] SubTask 4.3 检查 53 条无空白、无重复、无静默丢项
  - [x] SubTask 4.4 把已闭环项标出并从 Round 1 候选排除

- [x] Task 5: 汇总与 grill 裁定
  - [x] SubTask 5.1 写共识 / 分歧 / 待裁定三节
  - [x] SubTask 5.2 汇总执行中待问清单；能继续的独立工作继续做
  - [x] SubTask 5.3 用 grilling 的 frontier 方式，**一次性**列出所有待裁定问题（编号 + 推荐答案）
  - [x] SubTask 5.4 记录每个裁定的选项 / 支书选择 / 日期 / 未选方案处理
  - [x] SubTask 5.5 对支书纠正 AI 理解的项，按 `sample-diff-learning` 记录 diff
  - [x] SubTask 5.6 未回答项保持「待裁定」，不写成默认值

- [x] Task 6: 写 Round 1 审计报告与修复 spec
  - [x] SubTask 6.1 完成 `.ctx/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md`（53 条表 + 共识/分歧/待裁定 + 证据 + 裁定记录）
  - [x] SubTask 6.2 新建 `.trae/specs/round1-workbench-structure-remediation/spec.md`
  - [x] SubTask 6.3 新建同目录 `tasks.md` / `checklist.md`，只含已裁定项
  - [x] SubTask 6.4 未裁定项只留在审计报告，不进入修复 spec
  - [x] SubTask 6.5 临时上下文退出：可复用结论并入权威文档；三份临时 `.ctx` 文件按退出表删除/归档/留一行指针

- [x] Task 7: 验证与提交
  - [x] SubTask 7.1 检查 53 条全部有三路 disposition；深审样本 ≤15 且有取舍理由
  - [x] SubTask 7.2 检查修复 spec 不含未裁定项
  - [x] SubTask 7.3 运行 doc-consistency / frontmatter-freshness / timestamps-note-guard
  - [x] SubTask 7.4 更新 TIMESTAMPS 与执行日志；按 Why / What / Verification / Boundaries 提交
  - [x] SubTask 7.5 明确停线：不实施修复，不启动 Round 2
  - [x] SubTask 7.6 检查临时上下文退出：三份 `.ctx` 文件无「已完成但仍在」；持久层四轮表可独立读懂

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3、Task 4 依赖 Task 2，可并行
- Task 5 依赖 Task 3 + Task 4
- Task 6 依赖 Task 5
- Task 7 依赖 Task 6
