---
title: "多支部读面逐口取证表（批次 606 · B-605-2）"
type: evidence
role: "[工程师]+[AI]"
last_updated: 2026-11-23
status: active
---

# 多支部读面逐口取证表（批次 606 · `B-605-2` / 原 `B-541-3` / `L-10`）

> **本表只答一个问题**：一次请求返回的行，是否全部经 `branch-scope` 解析并等于请求支部（或属本职跨支部 / 无支部维度）。
> 锚点写 `文件::函数`，不写行号（行号随插行漂移，口径同 `ARCHITECTURE_EVOLUTION §10.6`）。
> **结论**：业务读面全部已接线，本批**无新增过滤代码**；本批交付＝本表 ＋ 可重复开关演练命令（`cd server; npm run test:multi-branch`）＋ 双支部夹具补 `/bootstrap`。

## 一、必须等于请求支部的读口

| 读口 | 单一出口（文件::函数） | 支部参数来源 | 双支部夹具 |
|---|---|---|---|
| `GET /<资源名>`（`RESOURCE_TABLES` 全表：activities / notices / branchDocs / users / tasks / todos / attendances / inspections / archiveRecords / branches …） | `server/routes/resources/index.js::_resourceRowsForActor` → `branch-scope.js::resourceRowsForActor` | `req.query.branchId`；支部账号跨支部传参由 `branchSelectionError` 前置 403 | ✅ 12 集合（`multi-branch-read-filter`） |
| `GET /bootstrap`（50 表整包） | `resources/index.js::GET /bootstrap`（逐表同一 helper） | 同上 | ✅ 本批加入夹具 |
| `GET /snapshot/versions` | `resources/index.js::GET /snapshot/versions` → `branch-scope.js::resolveVersionBranchId` | 本人支部 → `?branchId=` → 缺省支部 | 版本键隔离由五证「集合版本按支部隔离」覆盖 |
| `GET /issues` | `resources/index.js::GET /issues` → `resourceRowsForActor` ＋ `canReadIssue` 受众投影 | 同上（党委无支部 ⇒ `[]`） | ✅ issues 行 |
| `GET /issues/reveal` | `resources/index.js::GET /issues/reveal` | 恒 403（无系统揭名入口，`D-824`） | 不适用 |
| `GET /todo-groups` | `server/routes/todo-groups.js::registerTodoGroupRoutes`（`_scopeBranchId`=`resolveBranchIdForActor`；`_visibleTodos`→`resourceRowsForActor`） | `resolveBranchIdForActor` | ✅ 只断言不跨支部（与 `todos` 同判见五证⑤） |
| `GET /attendance-appeals` `GET /inspection-appeals` | `semantic-routes.js::readScoped` | `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /issue-unread` | `semantic-routes.js::readScoped` | `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /auth-audit` | `semantic-routes.js::readScoped`（另加支委 / 党委角色门） | `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /handoffs` | `semantic-routes.js::readScoped` | `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /member-confirmations` | `semantic-routes.js::readScoped` ＋ `aliasMemberChangeRow` | `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /member-change-requests` | `server/routes/member.js::GET /member-change-requests` → `resourceRowsForActor` | `?branchId=` | ✅ 夹具行 |
| `GET /committeeBroadcasts` | `member.js::GET /committeeBroadcasts` → `resourceRowsForActor` | `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /members/:id/profile` | `member.js::canReadMemberProfile` ＋ `branchSelectionError` / `selectedBranchRequiredError` | 本人 / 本支部支委 / 党委显式所选支部 | 未覆盖：有判据、无夹具 |
| `GET /agenda-votes` | `server/routes/committee.js::GET /agenda-votes` → `resourceRowsForActor` | `?branchId=` | ✅ 夹具行 |
| `GET /leader/member-progress` | `server/routes/leader-progress.js::GET /leader/member-progress`（逐表 `resourceRowsForActor`，党小组长另限本组） | `actorBranchId` → `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /group-attendance-summary` | `semantic-routes.js::GET /group-attendance-summary`（`actorBranchId` ＋ 逐行 `resourceBranchId`） | 本人支部（无支部 403） | 未覆盖：有判据、无夹具 |
| `GET /workgroups` `/workgroup-members` `/workgroup-grants` `/workgroups/:id/members|grants|tasks|outputs` | `workgroup-routes.js::registerWorkgroupRoutes`（`ownBranch` ＋ `row.branchId` 比对；跨支部 403） | `actorBranchId` → `?branchId=` | 未覆盖：有判据、无夹具（工作组 6 表） |
| `GET /attendance-rosters` `/activities/:id/expected-roster` | `workgroup-routes.js::GET /attendance-rosters`（行支部比对）／`expected-roster`（`ownBranch` 403） | `actorBranchId` → `?branchId=` | 未覆盖：有判据、无夹具 |
| `GET /report/:domain` `GET /report/export` | `server/routes/report.js` → `resolveBranchIdForActor` ＋ `services/reporting.js::extractDomain({ branchId })` | `?branchId=`；党委须先选支部 | 未覆盖：有判据、无夹具 |
| `GET /uploads/:name` | `server/routes/uploads.js::GET /uploads/:name`（`attachments.branch_id` 冻结 ＋ 支部比对） | 行内固化值；党委须显式选支部 | ✅ 五证⑥（待归属 403 / 同支部 200） |
| `GET /committee/proposals` `/committee/proposals/:id` `/committee/proposals/:id/events` | `server/routes/committee-proposals.js`（`p.branchId === actor.branchId`） | 本人支部（无 `?branchId=` 口） | 未覆盖：有判据、无夹具 |

## 二、本职跨支部（党委专用，按制度可见全部或显式选支部）

| 读口 | 出口 | 说明 |
|---|---|---|
| `GET /committee/notices` `/committee/activities` `/committee/documents` `/committee/archive-records` `/committee/roster-proposals` `/committee/publication-audits` `/committee/agenda-candidates` | `semantic-routes.js` / `committee-notices.js` / `committee.js`（`requireRole` party-staff / `requireCommissioner`） | 党委本职台账：不传 `?branchId=` 即全量；发布 / 撤下留痕落 `publication_audits` |

## 三、无支部维度的读口

| 读口 | 出口 | 说明 |
|---|---|---|
| `GET /milestones` | `semantic-routes.js::GET /milestones`（直接 `listTable`） | 内容单一源 `docs/data/milestones.json`，无支部字段 |
| `GET /auth/me` `/auth/login` `/auth/logout` `/auth/iaaa/*` | `server/routes/auth.js`、`iaaa.js` | 会话按人；`/auth/iaaa/branches` 只出 `id/name/type/status`（待归属选支部目录），`/auth/iaaa/pending` 只出 `joinIntent` 并按本支部过滤 |
| `GET /setup-status` | `server/routes/setup.js` | 仅党委组织员；只回布尔与计数，不列人名 |
| `GET /health/deep` `/metrics` | `server/routes/health.js` | 运维读数，无业务行 |
| `GET /api/v1/portal` `/portal/notices/:id` `/portal/activities/:id` `/portal/documents/:id(/download)` | `server/routes/public-portal.js` | 匿名白名单 ＋ `publishScope='public'` 且未过期；不存在 / 无权统一 404（`D-858`） |
| `GET /branch-name` | `server/routes/public-info.js` | 公开品牌名 |

## 四、开关演练读数（2026-11-23）

| 命令 | 覆盖 | 结果 |
|---|---|---|
| `cd server; npm run test:multi-branch`（`ALLOW_MULTI_BRANCH=1` ＋ `DISABLE_PASSWORD_CHECK=1`） | `multi-branch-read-filter` 9 组 ＋ `multi-branch-five-proof` 10 条 ＋ `run-mode` R1–R7 | **26 / 26 pass · fail 0 · 13.2s** |

结论：开关打开不改变读面行为（夹具 9 组仍全绿）；运行档判定 R3 / R4 仍分别「默认拒绝 / 显式放行」。

## 五、限制（不伪装覆盖）

- 双支部夹具覆盖 **13 个读口**（12 集合 ＋ `/bootstrap`）；其余 15 个业务读口有单一出口判据但无跨支部端到端读数，逐条已标「未覆盖：有判据、无夹具」。
- 补夹具的触发：动到该域（申诉 / 未读 / 授权审计 / 交接 / 名册确认 / 工作组 / 考勤名单 / 报表 / 提案）时同批把该域行加进 `multi-branch-read-filter` 夹具。
- `ALLOW_MULTI_BRANCH` 仍**关闭**：本次是演练，不是打开开关；上线形态仍一实例一支部（`D-849` / `D-889`）。
