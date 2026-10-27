# Tasks

- [x] Task 1: 写 H21 热层协议与判例
  - [x] SubTask 1.1 在 CLAUDE.md 热层新增 `## H21. 多代理独立审查协议`
  - [x] SubTask 1.2 写入协议八条：定题 / 独立审查 / 证据 / 输出 schema / 汇总 / 人类裁定 / 落 spec / 复盘
  - [x] SubTask 1.3 写入 2026-10-19 判例：三 skill、6 共识、5 分歧、四项裁定
  - [x] SubTask 1.4 写入四轮路线图与「逐轮启动、不得同时开四轮」约束
  - [x] SubTask 1.5 在 H20.2 增加 H21 入口，不改其余步骤

- [x] Task 2: 写详版操作手册
  - [x] SubTask 2.1 新建 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md`
  - [x] SubTask 2.2 写代理提示词模板（单 skill、不互看、证据格式）
  - [x] SubTask 2.3 写输出 schema 与汇总模板（共识 / 分歧 / 待裁定）
  - [x] SubTask 2.4 写 AskUserQuestion 决策记录模板与反模式清单
  - [x] SubTask 2.5 在 H21 留一行指针指向该手册

- [x] Task 3: 守卫测试
  - [x] SubTask 3.1 新建 `server/test/claude-parallel-audit.test.mjs`
  - [x] SubTask 3.2 断言 H21 存在、协议八条关键词齐备、判例三 skill 齐备、四轮路线图齐备
  - [x] SubTask 3.3 断言 H21 含「一个代理一个 skill」「不读其他代理报告」「AskUserQuestion」「不替支书决定」
  - [x] SubTask 3.4 登记进 `server/package.json` 的 `test:daily`
  - [x] SubTask 3.5 非空转：H21 正文可抽取且不少于约定关键词数

- [x] Task 4: Skill 发现矩阵
  - [x] SubTask 4.1 读取当前可用 skill 清单，按四轮各列 3 个候选
  - [x] SubTask 4.2 用 `npx skills find` 补查最小三成本 / 全栈数据结构候选
  - [x] SubTask 4.3 标注「可用 / 不可用 / 待确认」，不把未确认项写死进 H21
  - [x] SubTask 4.4 把矩阵写入 spec 附录，交支书确认（已提交，Round 2–4 待支书选择）

- [x] Task 5: 未完成清单
  - [x] SubTask 5.1 读取两份 68 页签审计稿与 `.ctx/REVIEW_QUEUE.md`
  - [x] SubTask 5.2 每条记录来源 / 问题 / 证据 / 状态 / 建议轮次 / 是否待裁定
  - [x] SubTask 5.3 去重并标注已闭环项，形成 Round 1 候选清单
  - [x] SubTask 5.4 只盘点，不实施任何修复

- [x] Task 6: 验证与提交
  - [x] SubTask 6.1 运行新守卫 + doc-consistency + frontmatter-freshness + link-integrity + version-stamp
  - [x] SubTask 6.2 复核 H21 正文长度与可读性（约 36 行）
  - [x] SubTask 6.3 更新 CLAUDE.md frontmatter `last_updated` 与 `.ctx/TIMESTAMPS.md`
  - [x] SubTask 6.4 写执行日志并按 Why / What / Verification / Boundaries 提交 commit

# Task Dependencies

- Task 2 依赖 Task 1（先有 H21 再写详版）
- Task 3 依赖 Task 1（守卫检查 H21）
- Task 4、Task 5 可与 Task 2/3 并行
- Task 6 依赖全部任务
