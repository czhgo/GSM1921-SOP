# Tasks

> 顺序即依赖顺序；无依赖的 Task 可并行。每完成一项即在本文件勾选。
> 全局约束：① 单实例命名一律走**数据驱动**（支部配置档案），不得在别处新增第二份支部名字面量；② 改完 `.js` 必须 `node docs/scripts/bump-version.mjs`（H25）；③ 只提交不推送。

## Task 1：未登录静态壳显示支部名（数据驱动）【无依赖】
- [x] 1.1 `docs/src/services/branch/branch.js`：段⑤（未登录/查无档案）改返回**支部显示名**（去「示例组织（未登录）」与「（未登录）」后缀）；段④（已登录确无归属 → 「未绑定支部」）保持不变；同步更新函数头注释与 `HEADER_SEGMENT_LABELS`⑤ 文案。
- [x] 1.2 `docs/src/entries/pages/main-entry.js`：首页 hero 标题**无论登录与否**都按 `getHeaderTitle()` 落地（现仅登录态改写）；未登录时不再落回 HTML 硬编码。
- [x] 1.3 静态 HTML 头名同步：`docs/index.html`、`docs/login.html`、`docs/help.html` 的标题由「示例组织（未登录）」改为「光华管理学院本科生党支部」；`docs/index.html`/`help.html` 的说明句去掉「当前页面展示的是示例组织的一套部署」。
- [x] 1.4 `docs/src/entries/pages/about-entry.js`：三处「示例组织」表述（`以示例组织为例` / 首段 / 并列成长机会句）改为支部主体表述（不出现「示例组织」）。
- [x] 1.5 更新 `server/test/branch-affiliation.test.mjs`（③ 未登录 → 支部显示名；段⑤ 断言）与 `server/test/copy-master-guard.test.mjs`（关于页首段句）断言。
- **验证**：`node --test server/test/branch-affiliation.test.mjs server/test/copy-master-guard.test.mjs`；`grep` 确认 `示例组织` 在 `docs/` 用户可见面归零。

## Task 2：清除其余用户可见「演示 / Mock」文案【无依赖，可并行 Task 1】
- [x] 2.1 `docs/login.html`：「演示账号（学号 ＋ 密码）」→ 中性（如「账号（学号 ＋ 密码）」）；「Mock 校验 · 开发阶段」删除或改中性。
- [x] 2.2 `docs/help.html`：0.3「登录说明」删除**真实姓名 + 学号 + 统一口令**的演示账号串；「进入支部（演示）」→ 中性；「mock 本地演示」等数据源措辞改中性；reset 说明保留但改中性措辞。
- [x] 2.3 `docs/src/components/shell/workspace-shell.js`：党委下钻横幅「党委演示只读视图」→ 中性（保留「只读查看 / 写操作按权限拒绝」语义）。`docs/src/entries/tabs/party-committee/party-config-tab.js`：「只读演示形态」→ 中性。
- [x] 2.4 `docs/src/data/data-adapter.js`：`DEMO_READONLY_MESSAGE` 去「演示」字样（保留「不保存到本机 / 登录后用服务器数据」语义）。
- [x] 2.5 组织信息向导文案含「（演示=跨支部兼任/调任）」（用户可见）→ 改中性（如「（如跨支部兼任 / 调任）」）；同步 `server/test/copy-length-guard.test.mjs` 白名单文本。
- **验证**：全仓 grep 用户可见面（`docs/*.html` 与 `docs/src/**` 非 mock）中「演示 / Mock / 示例组织」仅剩注释或已白名单项；`node --test server/test/copy-length-guard.test.mjs server/test/copy-master-guard.test.mjs`。

## Task 3：十月活动与通知（单一源）【无依赖】
- [x] 3.1 `docs/src/data/mock/activities.js` 新增：
  - `act-36`「党建思想学习会」`2026-10-15` `type:'党课'` `status:'completed'`（已举办）
  - `act-37`「红色徒步·香山行（纪念长征胜利 90 周年）」`2026-10-22` `type:'主题党日'` `status:'published'`（计划中）、`isOutdoor:true`、`carriers:['实践参访']`
  - 组织者 / 参与人取既有合法 `personId`（与既有同类活动一致）。
- [x] 3.2 `docs/src/data/mock/notices.js` 新增 1–2 条十月通知（覆盖上述两活动，`publishDate` 十月、`expireDate` ≥ 活动日），使首页「重要通知」不再只有 7 月内容。
- [x] 3.3 自洽校核：`completed` 活动不得挂未完成任务；`voteConfig` 类字段不误加；状态字面值与派生执行态一致（参照文件内既有注释口径）。
- **验证**：起静态/本地 mock，首页活动区默认落 `2026-10` 且可见两活动；`node --test server/test/permission-gate.test.mjs`（既有活动结构守卫）等不回归。

## Task 4：种子无超期待办【无依赖】
- [x] 4.1 `docs/src/services/governance/todo.js` 的 `SEED_TODOS`：`todo_seed_6`（截止 `2026-08-01`，唯一过期项）重定向为十月主题、截止日改为**未来**；确认种子内**再无**过去截止的未完成待办。
- [x] 4.2 新增机检：种子待办无「截止日 < 今天且未完成」项（防回归）。
- **验证**：干净种子下工作台「我的超期」区为空态；机检绿。

## Task 5：旧本地演示数据自动失效【依赖 Task 3、Task 4（种子定稿后再版本化）】
- [x] 5.1 `docs/src/core/domain/domain.js`：新增 `SEED_DATA_VERSION`（种子数据版本号）。
- [x] 5.2 `docs/src/data/mock-adapter.js`：`_saveToStorage` 写入 `_seedVersion`；`_loadFromStorage` 读到版本不一致时**丢弃整库并按种子重新初始化**（`localStorage.removeItem(STORAGE_KEY)` → `_seedInitialData()`）；顺手把 `_schema` 不匹配分支由「中止（可能空页）」改为同样「丢弃 + 重播」。
- [x] 5.3 单测/机检：写入一个「旧 `_seedVersion`」的库 → 再 `loadDB()` → 断言取到当前种子（含十月活动）。
- **验证**：`node --test` 新增/相关件绿；真机：先造旧数据 → 刷新 → 数据回到新种子。

## Task 6：静态托管形态判定修正【依赖 Task 2（同一文件附近的措辞）】
- [x] 6.1 `docs/src/config/deploy.js`：`DEPLOY_MODE` 在**非 Node 托管**下判为 `'static'`、Node 下为 `'server'`（`server/app.js` 注入路径不变）；同步文件头注释。
- [x] 6.2 文档同步：`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md`（§四 认证与登录门控 / §附录 A.2）中关于「GitHub Pages 演示部署时改回 static」的表述改为「自动判定」。
- **验证**：静态托管页面无「会话已失效」浮层、侧边栏出现「关于」；Node 托管（`npm start`）仍为 `server`。

## Task 7：版本戳 + 帮助页清理说明 + 仓库登记【依赖 Task 1–6】
- [x] 7.1 运行 `node docs/scripts/bump-version.mjs`（全站版本戳 + `CODE_VERSION`）。
- [x] 7.2 `docs/help.html`：写清「如何清掉旧的本地演示数据」——访问 `?reset=demo`（全回种子）/ `?reset=preview`（仅清草稿），并说明静态托管的刷新与缓存口径。
- [x] 7.3 登记 `.ctx/logs/2026-10-EXECUTION_LOG.md`、`.ctx/logs/2026-10-DECISION_LOG.md`（新决策号）、`.ctx/TIMESTAMPS.md`（新建/改动文件）。
- **验证**：`node docs/scripts/bump-version.mjs` 后 `git diff` 仅版本戳位变；TIMESTAMPS 守卫绿。

## Task 8：宣传形态机检 + 回归 + 提交【依赖全部】
- [x] 8.1 新增机检件（静态/用户可见面）：
  - `docs/` 用户可见面**无**「示例组织 / 演示 / Mock / 演示账号」字样（带白名单，白名单只允许注释类）；
  - 十月两活动在册（`activities.js` 含 `act-36`/`act-37` 与对应日期）；
  - 种子待办无过去截止（与 Task 4.2 合并）。
- [x] 8.2 回归：`cd server && npm test`（分片档，≤15min）；若新增 e2e 须登记 `server/test/sweep-shard.mjs`。真机探针（静态形态）核验：首页标题=光华管理学院本科生党支部、十月活动可见、无超期待办、无演示字样。
- [x] 8.3 `git commit`（批次号 440 起；**不 push**）。
- **验证**：测试全绿；探针输出全部达成；`git status` 干净。

# Task Dependencies

- Task 5 depends on Task 3、Task 4（种子定稿后才能定版本号）
- Task 6 depends on Task 2（同文件区措辞）
- Task 7 depends on Task 1–6
- Task 8 depends on Task 1–7
- Task 1 / 2 / 3 / 4 相互独立，可并行
