# 用户任务走查 · 波次 H（体验 73→75）

- 日期：2026-11-08
- 服务：`http://127.0.0.1:3000`（review 档，`server/data.review.db`，未停止）
- 视口：1440×900 / 390×844
- 账号：党委组织员 `9000000001`、支书 `2300010001`、党员 `2500010001`（口令 `123456`）
- 截图：`.ctx/evidence/2026-11-08/user-task-test/shots/`
- 结论：5 个任务 **4/5 PASS**；任务 5 仅登录态 PASS，未登录资料查询页留 GAP（R2）；R1 上传门已修复并常驻断言（2026-11-09 复核改准，见 §四）。

## 一、任务结论

| 任务 | 1440 | 390 | 结论 |
|---|---|---|---|
| 1 未登录看公开内容 | PASS | PASS | 党徽 +「光华管理学院党建平台」+ 公开通知全文 / 公开资料；无支部名、无统计卡 |
| 2 党委发公开通知 | PASS | PASS | 党委台「下发通知 → 公开通知」发布成功；未登录门厅显示标题与正文全文 |
| 3 支书采用党委活动 | PASS | PASS | strip 提示「院级活动待采用 1」→ 二次确认 → 生成副本 → 列表隐藏原件 |
| 4 发强调通知 | PASS | PASS | 党员铃铛收到「活动强调：…」；再发返回 429（24h 限频） |
| 5 资料查询 | PASS（登录态） | PASS（登录态） | 登录后可见院级 `login` / `public` 资料；未登录资料查询页仅「请先登录后使用」＝ **R2 GAP**，本任务计为未全通过 |

走查数据（review 库）：
- 公开通知：`ntc-c832878e` / `ntc-752831c5` 等（标题「用户任务走查·公开通知（1440/390）」）。
- 党委活动原件：`act-84f9278e`（published，`targetBranchIds:["all"]`）；支部副本：`act-aa170449`。
- 院级资料：`bd-6b12274b`（public）、`bd-2e3ec07d`（login）。
- 强调通知：`systemKind=activity-emphasis`，`audience:["all"]`；再发 429 `retryAfterMs=86347228`、`retryAt=2026-11-09T17:10:23.669Z`。

## 二、「找得到 / 看得懂 / 点得动」三关

### 任务 1（未登录门厅）
- 找得到：PASS。`#view-public-portal` 可见，`#view-dashboard` 隐藏；首屏有「登录」按钮。
- 看得懂：PASS。标题「光华管理学院党建平台」；「重要通知 / 近期活动 / 公开资料」三块各有空态或内容；正文无支部名（`body.innerText` 不含「光华管理学院本科生党支部」）。
- 点得动：PASS。登录链接指向 `./login.html?next=…`；390 无横向溢出（`scrollWidth=390`）。

### 任务 2（党委发公开通知）
- 找得到：PASS。党委台 `?tab=dispatch&subview=public`，页内「公开通知」子页签带计数。
- 看得懂：PASS。说明「『公开』范围会进入未登录公共门厅，到期自动下线」；表单含「发布范围 / 公开到期时间」。
- 点得动：PASS。提交后 toast「已发布到公共门厅」，列表出现「公开」徽标与到期日；未登录首页显示标题与正文全文。
- 备注：`public` 必须带未来到期时间，前端 `dispatch-tab.js:359-364` 与服务端双校验。

### 任务 3（支书采用党委活动）
- 找得到：PASS。支书台「活动管理」顶部 `#committee-activity-strip` 显示「院级活动待采用 1」+「采用」按钮（`calendar-tab.js:2033-2057`）。
- 看得懂：PASS。strip 与详情页均写明「采用后生成本支部副本；日期 / 地点 / 承办党小组 / 报名 / 考勤等执行信息在副本中维护」。
- 点得动：PASS。点击后出现「采用到本支部」确认面（`modal.js::confirmAction`，与详情页共用）；确认后重载，strip 收起。
  - 原件 `activity.html?id=act-84f9278e` 显示「本支部已采用」+「打开支部副本 →」；无「采用到本支部」按钮。
  - 服务端读口核对：支书 `GET /api/v1/activities` 中 `hasSource=false` / `hasCopy=true`，列表隐藏原件成立。
- 390：活动管理无溢出；副本详情无溢出，强调通知入口在位。

### 任务 4（发强调通知）
- 找得到：PASS。副本详情「强调通知」行，按钮 `#committee-emphasis-btn`（`activity-entry.js:770-776`）。
- 看得懂：PASS。行内写明「向本支部全体党员推送一条提醒；同一活动 24 小时内最多一条」。
- 点得动：PASS。确认面「发送强调通知」→「继续」→ 填写面（可留空）→ 发送；党员铃铛出现「活动强调：用户任务走查·院级主题党日（待采用）」。
- 限频表现：发送后按钮变为禁用并显示「24 小时后可再次发送」，行内同步显示剩余小时；直接再调端点返回 `429 {error:"同一活动 24 小时内只能发送一次强调通知"}`。
  - 观察（P3）：禁用态下用户无法再点出 429 文案，界面只靠倒计时表达限制；口径一致，不改。

### 任务 5（资料查询）
- 找得到：
  - 修复前 FAIL：支书 / 党员打开 `search.html`，「支部文件」区为空（`#ref-branch-docs-list` 无文本），院级资料不可见。
  - 修复后 PASS：两条院级资料均出现，标题正确。
  - 未登录：`search.html` 仍只显示「请先登录后使用 / 去登录」（GAP，见 §四 R2）；未登录首页门厅可见 `public` 资料且不含 `login` 资料。
- 看得懂：PASS（修复后）。行内文案为「院级资料 · 公开」/「院级资料 · 登录可见」，不再误标「已归档」。
- 点得动：PASS（修复后）。「下载」链接在位；院级资料不再向支部侧显示「修改 / 删除」（写口只归党委）。
- 党委创建资料的「点得动」：修复前 FAIL → 上传 `POST /api/v1/uploads` 返回 **403 无权限**（R1），页面无可见错误，只在控制台报错；本走查改用 `POST /api/v1/committee/documents`（带 `fileData`）落数据。
  - 2026-11-09 复核改准：`server/routes/uploads.js:68-74` 已用 `requireUploader` 放行 `party-staff`，`server/test/security-hardening.test.mjs:304-324` 常驻断言 party-staff **201** / 普通成员 **403** ⇒ 该 UI 链路恢复。矩阵仍写支委层（`write-policy-matrix.mjs:534-538`），单源未同批 → 记为 `D-861` 安全失分依据。

## 三、小修复（已改、已复跑）

1. `docs/src/services/branch/branch-doc.js:256-260`
   - 改：`listDocs` 对 `ownerScope='committee'` / `branchId='pc-gsm'` 的院级资料跳过支部隔离过滤。
   - 原因：服务端 `branch-scope.js:337-342` 已按 D-858 把「本支部 ∪ 党委登录可见」并集返回；客户端再按 `branchId` 过滤会把院级资料整体丢掉。
   - 复跑：支书 / 党员 1440、支书 390 均可见两条院级资料；无横向溢出。
2. `docs/src/components/sections/references.js:399-406、463-471`
   - 改：① 成员可见过滤对院级资料放行（服务端已按 `publishScope` 过滤）；② 普通文件行对院级资料显示「院级资料 · 公开 / 登录可见」；③ 院级资料不显示「修改 / 删除」。
   - 原因：院级资料 `status='current'` 会被成员过滤掉；旧文案「已归档」与实际不符；支部侧写口会被服务端 403。
   - 复跑：党员 / 支书可见；文案与徽标正确；无「修改 / 删除」。

验证读数：
- `cd server; node --test test/branch-doc.test.mjs` → **19 pass / 0 fail**。
- `cd server; node --test test/copy-guard.test.mjs test/dead-selector-guard.test.mjs test/version-stamp.test.mjs` → **49 pass / 0 fail**。
- `cd server; node scripts/audit-tabs.mjs --base http://127.0.0.1:3000 --tab secretary.calendar --tab party-committee.gov-content` → **P0 0 / P1 0 / P2 0**。
- `cd server; npm run test:daily` → **203 pass / 0 fail**，墙钟 60.6s，全绿。
- 未改服务端路由、未改测试分层、未 commit、未 bump 版本戳。

## 四、登记项（2026-11-09 复核改准）

| ID | 级别 | 问题 | 状态与证据 |
|---|---|---|---|
| R1 | P1 | 党委组织员上传院级资料被 403「无权限」：`POST /api/v1/uploads` 原走 `requireCommissioner`，party-staff 无支部委员身份，院级资料「上传并保存」UI 链路因此不可用 | **已修**：`server/routes/uploads.js:68-74` 用 `requireUploader` 放行 party-staff，普通成员仍拒绝；`server/test/security-hardening.test.mjs:304-324` 常驻断言 **201 / 403**。**残项已清（批次 539）**：`write-policy-matrix.mjs:534-536` 已改准为 `requireAuth + (party-staff \| requireCommissioner)` / `roleGate: 支委层或 party-staff`，单源与运行期同批（`D-862`） |
| R2 | P2 | 未登录 `search.html` 不展示公开院级资料，只给「请先登录后使用」；公开资料只在 `index.html` 公共门厅可见 | **已修（批次 539）**：`docs/src/components/sections/references.js` 匿名分支改消费匿名门厅读口 `loadPublicPortal`（服务端 `server/routes/public-portal.js`），含匿名下载 / 失败重试 / 「去登录」附注；证据 `.ctx/evidence/2026-11-09/ia/`（`D-862`） |
| R3 | P3 | 强调通知 24h 内二次发送时按钮直接禁用，用户看不到 429 文案，仅看倒计时 | **不修**（口径一致）。`docs/src/entries/pages/activity-entry.js:774-776、943-966` |

R1 已按「party-staff 单独放行上传」落地并常驻断言，矩阵已于批次 539 同批改准（`D-862`）；R2 已于批次 539 把公开资料接进资料查询页（匿名门厅读口，`D-862`）。

## 五、证据文件

- 任务 1：`shots/t1-anon-1440.png`、`shots/t1-anon-390.png`
- 任务 2：`shots/t2-form-1440.png`、`shots/t2-list-1440.png`、`shots/t2-portal-1440.png`、`shots/t2-form-390.png`、`shots/t2-list-390.png`、`shots/t2-portal-390.png`
- 任务 3：`shots/t3-create-form-1440.png`、`shots/t3-create-list-1440.png`、`shots/t3-strip-1440.png`、`shots/t3-confirm-modal-1440.png`、`shots/t3-after-adopt-1440.png`、`shots/t3-source-detail-1440.png`、`shots/t3-calendar-390.png`、`shots/t3-copy-detail-390.png`
- 任务 4：`shots/t4-before-1440.png`、`shots/t4-confirm-1440.png`、`shots/t4-composer-1440.png`、`shots/t4-after-1440.png`、`shots/t4-copy-detail-1440.png`、`shots/t4-member-bell-1440.png`、`shots/t4-copy-390.png`、`shots/t4-member-bell-390.png`
- 任务 5：`shots/t5-secretary-1440.png`、`shots/t5-participant-1440.png`、`shots/t5-secretary-390.png`、`shots/t5-anon-search-1440.png`、`shots/t5-anon-search-390.png`、`shots/t5-portal-anon-search-1440.png`、`shots/t5-portal-anon-search-390.png`、`shots/t5-doc-form-1440.png`

## 六、未覆盖

- 390 下党委「撰写党委活动」表单未实测（任务 3 的创建步骤只在 1440 走通；390 覆盖了活动管理与副本详情）。
- 强调通知「窗口过后可再发」只验服务端单测口径，未在本轮等待 24h 做真机。
- 院级资料《撤下》与《编辑》未走查（本次只覆盖新建与查询）。
