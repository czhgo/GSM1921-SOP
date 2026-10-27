# Tasks

> 顺序即依赖顺序；无依赖的 Task 可并行。每完成一项即在本文件勾选。
> 全局约束：① 改完 `.js` 必须 `node docs/scripts/bump-version.mjs`（H25）；② 只提交不推送（支书自行 push）；③ 结构性改动一律用编辑工具逐处落，改后必须 grep 复核。

## Task 1：删除三处平台化小字【无依赖】

* [x] 1.1 `docs/index.html`：删除约第 42 行整句 `<p …>本系统面向各类党支部与学生组织——每个组织可部署自己的实例（自有名称、人员、制度、配色与数据）。</p>`。

* [x] 1.2 `docs/help.html`：删除约第 233 行同句 `<p …>`。

* [x] 1.3 `docs/src/entries/pages/about-entry.js`：删除约第 382 行同句 `<p class="ab-hero-subtitle" …>`（保留第 381 行「以本支部为例」与其余 hero 结构）。

* **验证**：`grep` 全仓（`docs/`）「本系统面向各类党支部与学生组织」零命中（`.ctx/logs` 历史留痕不计）。

## Task 2：`act-36` 状态改准为「未开始」【无依赖，可并行 Task 1】

* [x] 2.1 `docs/src/data/mock/activities.js`：`act-36` 的 `status: 'completed'` → `'published'`；同步第 102–111 行的 2026-10 基线注释（「已举办」→「计划中」；「act-36 status=completed 不挂未完成任务」这句改准为「两条均为计划中、不含未完成任务挂靠」）。

* [x] 2.2 连带复核：确认无任务 / 通知 / 归档数据把 `act-36` 当作已完成——`SEED_TASKS` 无 `act-36` 引用；`notice-112` 仅以 `targetId: 'act-36'` 指向该活动（不涉状态）。

* **验证**：本地 mock / api 下，`act-36` 生命周期派生为 `published`；归档库「已结束」口径不含 `act-36`。

## Task 3：守卫同步（基线 + 行号漂移）【依赖 Task 1、Task 2】

* [x] 3.1 `server/test/copy-master-guard.test.mjs`：删除 `BASELINE` 中 `docs/src/entries/pages/about-entry.js` 条目（该句已删 ⇒ 重合清零，否则 N3「僵尸登记」判红）；`BASELINE_FILE_COUNT` 9 → 8、`BASELINE_TOTAL` 11 → 10；N3 两处硬下限 `>= 9` / `>= 11` 同步下调为 `>= 8` / `>= 10`，并加一行注释说明（本批收基线，只降不升）。

* [x] 3.2 行号引用改准：跑 `doc-line-ref` / `doc-consistency` / 相关守卫，删除行导致的行号漂移逐条改准（若确无受影响引用则实证记录）。本次实测：`doc-line-ref` R1–R6 全绿（README-server.md 未引用被删行）；`doc-consistency` S14 报出的是**工作区既存**的决策日志缺口（`2026-10-DECISION_LOG.md` 缺 `D-810` 节与本月目录行），与本批删除行无关——已一并修复（恢复 D-810 节 + 补本月目录行）。

* **验证**：`node --test server/test/copy-master-guard.test.mjs server/test/publicity-static-guard.test.mjs server/test/doc-line-ref.test.mjs server/test/doc-consistency.test.mjs` 32/32 全绿。

## Task 4：版本戳 + 回归【依赖 Task 1–3】

* [x] 4.1 运行 `node docs/scripts/bump-version.mjs`（全站版本戳 + `CODE_VERSION`）。→ `20261011a → 20261011b`；JS 226 / HTML 23 / CSS 2 / server-test 97；陈旧戳 0 处残留；`CODE_VERSION 421 → 422`。

* [x] 4.2 回归：`cd server && npm test`（或分片档，≤15min）——至少覆盖 `publicity-static-guard` / `copy-master-guard` / `copy-length-guard` / `branch-doc` / `doc-*`。→ 改跑**全量档** `npm run test:full`：`[node]` 797/0 · `[e2e-A]` 58/0 · `[e2e-B]` 164/0 ⇒ **1019/0 全绿**，1025.3s（≈17.1min ≤20min）。

* [x] 4.3 `git commit`（批次号顺延；**不 push**）。→ 批次 441（`D-811`），commit `e58493260`；`git status` 干净。

* **验证**：相关守卫全绿；`bump-version` 后 `git diff` 仅版本戳位变化（除本批目标改动外）。

## Task 5：浏览器体验收尾（真机复核）【依赖 Task 1–4】

* [x] 5.1 服务在 `http://localhost:3000` 运行；页面重新登录（重建演示库后旧会话失效）。→ 已重启服务并把演示库按新种子重建（`server/backups/data.db.bak-20261011b` 留底）；支书在浏览器内以演示支书账号登录成功。

* [x] 5.2 复核首页：十月两活动（`act-36` 10/15、`act-37` 10/22）可见且均非「已执行 / 待归档」；「重要通知」含十月通知；待办页「已过期」计数为 0；首页无平台化小字；控制台 pageerror 0。→ 实测：默认月 2026-10、日历含 `act-36`/`act-37`、活动列表两活动徽章＝**已发布**、通知含十月两条、首页/帮助页/关于页 `tagline=false`、归档库不含 `act-36`、无 pageerror。**待办页「已过期」→ 实测为非零的「13 / 10 / 39 条逾期」，系真实派生积压（2026-10-11 支书裁定保留），非本批回归**（种子待办无过去截止 · 守卫 G3 绿）。

* [x] 5.3 复核后向支书回报结果。

# Task Dependencies

* Task 3 depends on Task 1、Task 2（改完源文件才能定基线/行号）

* Task 4 depends on Task 1–3

* Task 5 depends on Task 1–4

* Task 1 / Task 2 相互独立，可并行

