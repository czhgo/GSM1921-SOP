# 全前端冒烟（冒烟遍历）测试报告 — 2026-09-08

> 范围：docs 11 个公共页 + 7 个工作台全部注册 tab + 关键交互；目标 0 console/page error。
> 方法：本地静态服务 `http://127.0.0.1:8765`（docs 为根）+ Playwright chromium headless（1440×900）；TMP/TEMP 重定向仓库内目录；每页/tab 等渲染完成（无骨架 loading 且内容非空）后断言；console error / pageerror / 请求失败全量收集并分类（code=代码异常，resource=资源加载，resource-ext=外部 CDN）。
> 环境说明：tailwind CDN 在本沙箱直连被 403（已实测），浏览器内可加载成功，未产生页面错误。

## 0. 结论摘要

- A 公共页 11/11 ✅（index 五区统计/日历/近期活动/通知/专班/图库均渲染；登录页、search 官方+支部文件、feedback、archive 三 tab、activity/taskforce/notice 详情、wizard、help 0-7 章、about 均正常）。
- B 工作台 7 台 × 65 tab 全部渲染 ✅；注册清单与 capability 声明完全一致（无缺无多）；全程 0 条代码类 console/page error。
- C 关键交互 10 项：9 项 ✅ 实际触发并验证（含重跑复核）；1 项 ⚠️ 不可触发 = 组织「待办审批批量」需待批数据，种子当前无待批成员变更（数据态，非代码缺陷）。
- 修复真实前端缺陷 2 个（见 §D），修复后定向复验通过，`module-load.test.mjs` 147/147 通过。
- 代码类 console error：0 条。唯一 1 条 console error 为表单登录时 POST 到纯静态服务器的 501（环境性，见 §E 错误清单）。
- 加载性能：DCL>2s 仅 help.html（3.4s）1 页，见 §E。

## A. 公共页遍历矩阵（11 页）

| 页面 | 结果 | DCL/load (ms) | 正文内容要点（渲染验证） |
|---|---|---|---|
| index.html | PASS | 372 / 372 | 统计四卡(本月活动/活跃专班/未读通知/个人考勤)+通知+日历(月历 9 月,含党会)+专班列表+活动风采图库+列表视图切换均渲染 |
| login.html | PASS | 1448 / 1826 | 登录表单/错误位/dev 开关齐备 |
| search.html | PASS | 1723 / 2231 | 官方文件 5 项可查+搜索框；支部文件区空态/登录提示按设计显示（见 §D2） |
| feedback.html | PASS | 1790 / 2343 | 意见列表 4 条(全部/开放中/已关闭筛选)+新反馈入口 |
| archive.html | PASS | 1756 / 2192 | 3 tab：党建活动/专班/通知，内容区有已归档数据 |
| activity.html?id=act-1 | PASS | 1489 / 1943 | 活动详情渲染（无“未指定/不存在”文案） |
| taskforce.html?id=tf-001 | PASS | 1752 / 2393 | 专班详情渲染（无“不存在或已解散”） |
| notice.html?id=notice-101 | PASS | 1546 / 2272 | 通知详情渲染（无“未指定通知”） |
| wizard.html | PASS | 1417 / 2306 | 匿名=请先登录提示卡（设计）；登录态 5 步向导完整可走（§D2 复验） |
| help.html | PASS | 3433 / 5735 | TOC 含致谢+0-7 章+免责声明，目录区与正文区均渲染（正文 3.7K 字） |
| about.html | PASS | 1138 / 8562 | about 内容区渲染（3.9K 字） |

## B. 工作台 7 台 × 65 tab 遍历矩阵

### secretary.html — 书记(储子禾 p13)（12 个 tab，登录落点 DCL 415ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | today | 今天 | 20 | ✅ |
| 2 | todo | 待办 | 597 | ✅ |
| 3 | overview | 全局概况 | 751 | ✅ |
| 4 | calendar | 活动管理 | 209 | ✅ |
| 5 | work-map | 支部分工 | 731 | ✅ |
| 6 | assign | 赋权管理 | 963 | ✅ |
| 7 | branch-config | 支部配置 | 432 | ✅ |
| 8 | notification | 通知发布 | 1121 | ✅ |
| 9 | tf-view | 专班查看 | 504 | ✅ |
| 10 | group-progress | 党小组进展 | 1201 | ✅ |
| 11 | feedback | 反馈管理 | 387 | ✅ |
| 12 | report-up | 上报党委 | 82 | ✅ |


### org.html — 组织委员(高翔宇 p11)（11 个 tab，登录落点 DCL 404ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | today | 今天 | 20 | ✅ |
| 2 | todo | 待办 | 120 | ✅ |
| 3 | overview | 工作概况 | 257 | ✅ |
| 4 | inspection | 考察上传 | 118 | ✅ |
| 5 | thought-review | 思想汇报 | 187 | ✅ |
| 6 | taskforce | 专班管理 | 916 | ✅ |
| 7 | roster | 成员名册 | 3640 | ✅ |
| 8 | talent | 人才库 | 3271 | ✅ |
| 9 | development | 发展数据 | 2206 | ✅ |
| 10 | activity-view | 活动查看 | 202 | ✅ |
| 11 | my-dispatch | 我的处置 | 105 | ✅ |


### prop.html — 宣传委员(方文静 p12)（8 个 tab，登录落点 DCL 259ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | today | 今天 | 92 | ✅ |
| 2 | todo | 待办 | 135 | ✅ |
| 3 | overview | 工作概况 | 203 | ✅ |
| 4 | tasks | 宣传任务 | 382 | ✅ |
| 5 | kanban | 项目看板 | 497 | ✅ |
| 6 | weekly | 周报报送 | 375 | ✅ |
| 7 | archive | 档案归档 | 448 | ✅ |
| 8 | my-dispatch | 我的处置 | 38 | ✅ |


### disc.html — 纪检委员(董建军 p10)（10 个 tab，登录落点 DCL 343ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | today | 今天 | 20 | ✅ |
| 2 | todo | 待办 | 99 | ✅ |
| 3 | overview | 工作概况 | 200 | ✅ |
| 4 | attendance | 考勤管理 | 6671 | ✅ |
| 5 | review | 活动监督复盘 | 1608 | ✅ |
| 6 | inspection | 考察管理 | 1919 | ✅ |
| 7 | mailbox | 公邮管理 | 291 | ✅ |
| 8 | makeup | 补课制度 | 86 | ✅ |
| 9 | tf-view | 专班查看 | 504 | ✅ |
| 10 | my-dispatch | 我的处置 | 38 | ✅ |


### leader.html — 组长(罗文杰 p1)（9 个 tab，登录落点 DCL 354ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | today | 今天 | 20 | ✅ |
| 2 | todo | 待办 | 62 | ✅ |
| 3 | overview | 工作概况 | 168 | ✅ |
| 4 | write | 活动管理 | 798 | ✅ |
| 5 | attendance | 考勤上传 | 1244 | ✅ |
| 6 | inspection | 考察上传 | 1202 | ✅ |
| 7 | members | 组员进展 | 1617 | ✅ |
| 8 | tf-view | 专班查看 | 504 | ✅ |
| 9 | my-dispatch | 我的处置 | 105 | ✅ |


### visitor.html — 普通成员(宋佳宁 p5)（9 个 tab，登录落点 DCL 410ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | today | 今天 | 20 | ✅ |
| 2 | todo | 待办 | 62 | ✅ |
| 3 | overview | 工作概况 | 146 | ✅ |
| 4 | projects | 项目分工 | 689 | ✅ |
| 5 | activities | 活动动态 | 493 | ✅ |
| 6 | attendance | 考勤概况 | 41 | ✅ |
| 7 | inspection | 我的考察 | 221 | ✅ |
| 8 | thought-report | 思想汇报 | 81 | ✅ |
| 9 | review | 我的复盘 | 475 | ✅ |


### party-committee.html — 党委组织员(p_pc)（6 个 tab，登录落点 DCL 409ms）

| # | tab id | 中文 | 渲染长度 | 状态 |
|---|---|---|---|---|
| 1 | governance-overview | 治理总览 | 304 | ✅ |
| 2 | monitor | 支部监控台账 | 275 | ✅ |
| 3 | review | 上报审批 | 86 | ✅ |
| 4 | branches | 支部管理 | 194 | ✅ |
| 5 | dispatch | 下发通知 | 197 | ✅ |
| 6 | party-config | 支部配置 | 508 | ✅ |



## C. 关键交互冒烟结果

| 工作台 | 交互 | 结果 | 实测说明 |
|---|---|---|---|
| secretary.html | 待办批量块/域折组展开 | ✅ | 点击「复盘待复核 2」组块展开/收起联动（内容区 597→445 字切换）；无 console error |
| secretary.html | 待办定位跳转（去赋权） | ✅ | todo 组行点「去赋权」→ 自动切到 assign tab 且赋权面板展开（常设赋权/项目赋权可见） |
| secretary.html | 党小组进展组切换 | ✅ | 点击「第二党小组」→ 下方组员进展摘要/复盘状态联动切换（1201→427 字）；无 console error |
| org.html | 待办审批批量 | ⚠️ | 种子无待批成员变更/交接记录（批量块 0 项）→ 无可点击目标；按钮/流程代码存在于 todo-tab 批量块，需待批数据后复测 |
| disc.html | 待办跳转考勤 | ✅ | todo「去考勤管理」→ 切到考勤管理 tab 待确认队列（请假 10/缺勤 5/超期 15/出勤自动确认 121） |
| leader.html | 写活动表单打开 | ✅ | 「创建活动」→ 决策树面板打开（步骤 1 组织场景…4 发起方向），按钮文案切「收起面板"] |
| visitor.html | 提交思想汇报表单 | ✅ | 「提交」→ 展开思想汇报 textarea（#tr-content，placeholder 提示字数要求） |
| party-committee.html | branches tab 修复复验 | ✅ | 支部实例卡渲染（支部列表/任命/改名/导入入口），不再报 bindBranchDemoButtons 错误 |
| help.html | 搜索 | ✅ | 目录/正文搜索框输入关键词后过滤正常，无 console error |
| login.html | 登录→登出→登录 + dev toggle | ✅ | dev 开关 8 张身份卡 ↔ 表单切换；账号密码登录秘书台→登出回 login→dev 卡登录成员台，全程正常 |

> 注：初跑脚本存在 3 项交互未真实点击的脚本 bug（Playwright evaluate 传参错误），已用修正脚本 fx 逐个重跑复核（上表为复核后结果，均 ✅、零 console error）。

## D. 修复的前端缺陷（本批修复并验证）

### D1【高】wizard.html 与 search.html mock 数据加载失败 → 向导不可用 / 支部文件恒空
- 现象：登录态打开 `wizard.html?branch=br-b1` 显示「非现任书记」门禁（实际现任书记本人）；`search.html` 支部文件区登录后也为空（无任何提示）。
- 根因：`docs/src/entries/wizard-entry.js:37` 与 `docs/src/entries/search-entry.js:29` 调用 `BranchService.loadDB()`，但两文件仅做了 `import '../services/runtime.js'` 副作用导入、未绑定 `BranchService` 标识符（同仓库其余 activity/archive/taskforce/main 入口均为 `import { BranchService } from runtime.js`）→ mock 路径抛 `ReferenceError: BranchService is not defined`，被各自 try/catch 吞成 console.warning → DB 从未加载：wizard 分支数据为空误入权限门，search 支部文件列表空。
- 修复：两文件改为具名导入 `import { BranchService } from '../services/runtime.js?v=20260908c';`（副作用保留）。
- 验证：修复后秘书登录态 `wizard.html?branch=br-b1` 完整走通 5 步（1组织信息 → 2模块/块组合 → 3角色分工 → 4术语制度指引+工作单 → 5验证与重置，无下一步即末步）；search 登录态显示「暂无支部文件」空态、匿名显示「登录后查看支部文件」，均无 BranchService 警告。`module-load.test.mjs` 147/147 通过。

### D2【中】党委工作台 branches tab 渲染失败（ReferenceError: bindBranchDemoButtons is not defined）
- 现象：party-committee → 支部管理 tab 渲染抛异常（`[tab-bar] tab「branches」渲染失败`），支部卡渲染中断。
- 根因：`docs/src/entries/tabs/party-committee/branches-tab.js:173` 调用 `bindBranchDemoButtons(el)` 但文件未 import（仅同目录 governance-overview-tab.js 有 import）。
- 修复：补 `import { bindBranchDemoButtons } from '../../../modules/branch-demo-nav.js?v=20260908c';`。
- 验证：修复后 branches tab 正常渲染（支部实例/任命/导入），主冒烟全程该 tab 无 console error；module-load 147/147。

## E. 控制台错误清单（全程）

### E1 代码类 console/page error：0 条（65 tab + 11 页 + 全部交互）
### E2 环境类 console error：1 条（非前端代码缺陷）

| 来源 | 错误 | 说明 |
|---|---|---|
| login 表单登录（全局流程 G） | `Failed to load resource: the server responded with a status of 501 (Unsupported method ('POST'))` | 账号密码登录时前端向 `/api/v1/auth/login` 发 POST；本冒烟使用**纯静态 http.server** 无后端路由 → 501；前端已按设计回退本地 mock 并正常进入工作台（loginOk=true）。真实部署由 server/app.js 提供该路由（server/test e2e-login 覆盖）。 |

### E3 修复前捕获、修复后已消失的错误（登记留档）

| 文件:行 | 错误 | 级别 | 状态 |
|---|---|---|---|
| entries/tabs/party-committee/branches-tab.js:173 | ReferenceError: bindBranchDemoButtons is not defined | console error | ✅ 已修（D2） |
| entries/wizard-entry.js:37 / entries/search-entry.js:29 | ReferenceError: BranchService is not defined | console warning（被 try/catch 吞） | ✅ 已修（D1） |

## F. 其它发现与建议（非阻塞）

- ⚠️ 组织台「待办审批批量」在演示种子下无待批数据，无法实测批量审批块；建议在 mock 种子补 1 条待批成员变更（或走完整成员变更流程后）再补测一次。
- ℹ️ wizard.html 在数据未加载/权限不足时统一显示「非现任书记」文案，语义上偏窄（曾误导排查）；现根因已修复不再出现，可评估把数据未加载与权限不足的提示文案区分（低优先级体验优化）。
- ℹ️ search 支部文件：匿名=登录提示、登录后无文件=「暂无支部文件」空态（D1 修复后复验），符合设计；官方文件匿名可查。
- ℹ️ 未发现遗留的「禁改文件」问题（本次修复均落在非禁改的 entry/tab 模块）。

## G. 加载性能粗测（DCL=DOMContentLoaded，标注 >2s）

| 页面 | DCL ms | load ms | 备注 |
|---|---|---|---|
| index.html | 372 | 372 | |
| login.html | 1448 | 1826 | |
| search.html | 1723 | 2231 | |
| feedback.html | 1790 | 2343 | |
| archive.html | 1756 | 2192 | |
| activity.html?id=act-1 | 1489 | 1943 | |
| taskforce.html?id=tf-001 | 1752 | 2393 | |
| notice.html?id=notice-101 | 1546 | 2272 | |
| wizard.html | 1417 | 2306 | |
| help.html | 3433 ⚠️>2s | 5735 | |
| about.html | 1138 | 8562 | |

| 工作台登录落点 | DCL ms | load ms |
|---|---|---|
| secretary.html | 415 | 870 |
| org.html | 404 | 425 |
| prop.html | 259 | 273 |
| disc.html | 343 | 366 |
| leader.html | 354 | 372 |
| visitor.html | 410 | 437 |
| party-committee.html | 409 | 1174 |

- 结论：DCL>2s 仅 help.html（3433ms，静态正文约 47K 字符 + TOC/搜索模块），建议按需懒渲染或拆分章节加载（可选优化）；about.html load 事件 8.5s 由 GSAP/ScrollTrigger 动画资源拖长，但首屏 DCL 1138ms 达标。工作台登录落点 DCL 均 <500ms。

## H. 证据与产物

- 结果 JSON：`.ctx/logs/2026-09-08-smoke-run/smoke-results.json`（含每页/每 tab 探测数据与错误明细）
- 复核 JSON：`.ctx/logs/2026-09-08-smoke-run/fx-results.json` / `fx2-` / `fx8-`（交互复核、wizard 走查、search 复验）
- 脚本：`recon.py` / `smoke.py` / `fx*.py`（同目录，不入库）
- 失败截图：无（0 失败项，故未生成）
- 代码改动：3 个文件（见 §D），`module-load.test.mjs` 147/147 通过

---
*生成：2026-09-08 全前端冒烟自动化（chromium headless @127.0.0.1:8765）*