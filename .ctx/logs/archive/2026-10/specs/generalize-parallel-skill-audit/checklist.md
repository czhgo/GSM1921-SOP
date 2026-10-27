# Checklist

## 一、H21 协议

- [x] CLAUDE.md 热层存在 `## H21. 多代理独立审查协议`
- [x] 协议写明「一个代理只用一个 skill」
- [x] 协议写明「代理之间不读彼此报告」
- [x] 协议写明「每条发现必须带证据」
- [x] 协议写明「主代理只汇总共识 / 分歧 / 待裁定」
- [x] 协议写明「用 AskUserQuestion 请支书裁定，不替支书决定」
- [x] 协议写明「裁定后落 spec / tasks / checklist 再实施」
- [x] H20.2 有 H21 入口，其余步骤未改

## 二、判例与路线图

- [x] 判例包含 `web-design-guidelines` / `design-with-taste` / `frontend-design` 三个 skill
- [x] 判例写明 6 项共识、5 项分歧
- [x] 判例写明四项支书裁定
- [x] 四轮路线图齐备：脏乱繁 / 最小三成本 / 功能与美观 / 全栈数据结构
- [x] 写明「逐轮启动，不得四轮同时开」

## 三、详版手册

- [x] `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` 存在
- [x] 含代理提示词模板
- [x] 含输出 schema（现象 / 证据 / 影响 / 方向 / 严重度 / 冲突）
- [x] 含汇总模板（共识 / 分歧 / 待裁定）
- [x] 含决策记录模板与反模式清单
- [x] H21 有一行指针指向该手册

## 四、守卫

- [x] `server/test/claude-parallel-audit.test.mjs` 存在
- [x] 守卫断言 H21、协议关键词、判例三 skill、四轮路线图
- [x] 守卫已登记 `test:daily`
- [x] 守卫非空转：正文可抽取且关键词数量达标

## 五、Skill 矩阵

- [x] Round 1 三个 lens 已标注可用
- [x] Round 2 / 3 / 4 候选已列出
- [x] 不可用 skill 已标注替代方案
- [x] 未确认 skill 未写死进 H21 正文
- [x] 矩阵已提交支书确认（Round 2–4 的选择待支书答复）

## 六、未完成清单

- [x] 覆盖 `.ctx/WORKBENCH_INFORMATION_AUDIT.md`
- [x] 覆盖 `.ctx/WORKBENCH_68_TAB_AUDIT_DRAFT.md`
- [x] 覆盖 `.ctx/REVIEW_QUEUE.md` 未闭环项
- [x] 每条含来源 / 问题 / 证据 / 状态 / 建议轮次 / 是否待裁定
- [x] 已闭环项已排除
- [x] 本批未实施清单内任何修复

## 七、验证与提交

- [x] 新守卫 7/7 通过
- [x] doc-consistency / frontmatter-freshness / timestamps-note-guard / link-integrity 通过
- [x] version-stamp 通过（`20261018p`）
- [x] H21 正文约 36 行、可读
- [x] CLAUDE.md `last_updated` 与 TIMESTAMPS 表行同步
- [x] 执行日志已写
- [x] commit 正文含 Why / What / Verification / Boundaries
