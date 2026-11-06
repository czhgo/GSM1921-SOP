# Checklist

## 一、四轮程序落盘

- [x] 四轮表包含 Round 1–4 的 lens / 输入 / 输出 / 停线 / 触发
- [x] Round 2 lens = `better-layout` / `better-accessibility` / `better-writing`
- [x] Round 3 lens = `frontend-design` / `design-with-taste` / `uicraft`
- [x] Round 4 lens = `fullstack-developer` / `domain-modeling` / `backend-architect`
- [x] Round 4 启动前有「安装/确认」前置
- [x] 写明「逐轮启动，不得四轮同时开」
- [x] H21 的 Round 1 状态已更新
- [x] 四轮表已同步写入 H21.2 与 `PARALLEL_SKILL_AUDIT.md` §9（持久层）

## 二、53 条 triage

- [x] 53 条全部出现在 triage 底表
- [x] 每条有类别
- [x] 每条有 lens A / B / C 三个结论
- [x] 每条有汇总（共识 / 分歧 / 待裁定 / 转轮次）
- [x] 每条有建议轮次
- [x] 每条有是否待支书裁定
- [x] 每条有证据指针
- [x] 没有空白、重复或静默丢项
- [x] 已闭环项已标出并排除

## 三、分层深审

- [x] 全部高风险页面/信息结构条目进入深审
- [x] 四类各至少 2 条样本（页面 8 / 交互 2 / 数据 3 / 证据 2）
- [x] 深审样本 ≤ 15 条（实际 15）
- [x] 取舍有书面理由
- [x] 非深审条目仍有三路一句话结论

## 四、三路独立审查

- [x] 三个子代理分别只加载 `web-design-guidelines` / `design-with-taste` / `frontend-design`
- [x] 代理之间未共享报告（各自只写 lens-a/b/c）
- [x] 每条发现带 `file:line` / DOM / 截图 / 运行证据
- [x] 无证据项已被剔除或标「需补证」

## 五、裁定与 diff

- [x] 共识 / 分歧 / 待裁定三节齐备
- [x] 每个分歧有 2–4 个互斥选项
- [x] 记录支书选择、日期、未选方案处理
- [x] 支书纠正 AI 理解的项已按 sample-diff-learning 记录 diff（U-05 · 5.5）
- [x] 未裁定项未被写成已裁定

## 六、Round 1 输出

- [x] `.ctx/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md` 存在且可独立读懂
- [x] `.trae/specs/round1-workbench-structure-remediation/spec.md` 存在
- [x] 同目录 `tasks.md` / `checklist.md` 存在
- [x] 修复 spec 只含已裁定项
- [x] 未裁定项只在审计报告
- [x] 本批未改生产代码
- [x] 未启动 Round 2

## 七、验证与提交

- [x] doc-consistency 通过（S1–S21）
- [x] frontmatter-freshness 通过
- [x] timestamps-note-guard 通过
- [x] link-integrity / version-stamp / claude-parallel-audit 通过
- [x] TIMESTAMPS 与执行日志已更新
- [x] commit 正文含 Why / What / Verification / Boundaries

## 八、临时上下文退出

- [x] 三份临时 `.ctx` 文件顶部有「退出条件」行
- [x] `.ctx/WORKBENCH_INFORMATION_AUDIT.md` 已移入 `.ctx/logs/archive/`
- [x] `.ctx/WORKBENCH_68_TAB_AUDIT_DRAFT.md` 已移入 `.ctx/logs/archive/`
- [x] `.ctx/UNFINISHED_AUDIT_BACKLOG.md` 的 53 条已并入审计报告后删除
- [x] 三路 lens 报告已移入 `.ctx/logs/archive/`
- [x] 不留「已完成但仍在」的临时台账
- [x] `.ctx/logs/*` 与 `REVIEW_QUEUE` 的持久/收口规则未被误用

## 九、集中 Grill

- [x] 每轮只开一次 frontier，不零散提问
- [x] 执行中的问题进入「待问清单」
- [x] 待问清单在收口点集中问
- [x] 每批 AskUserQuestion 不超过 4 题
- [x] 未回答项保持「待裁定」，未写成默认值
