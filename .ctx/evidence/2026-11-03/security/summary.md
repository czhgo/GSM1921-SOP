# 安全与权限专项报告（2026-11-03）

> 范围：写入口权限矩阵、快照整表写穿、会话过期、生产运行档。
> 方法：矩阵静态全覆盖 + `:memory:` 临时库真 HTTP 探针 + 现有权限回归。
> 结论：**P0 = 0 / P1 = 0**；`known-risk = 0`；剩余风险均已登记到 `.ctx/ENGINEERING_ASSESSMENT.md §四 上线残项`。

## 一、写入口覆盖

- 矩阵单一源：`server/security/write-policy-matrix.mjs`
- 行数：**141**（45 个顶层路由组）
- 状态分布：`enforced` **135** · `self-service` **4** · `public` **2** · `known-risk` **0**
- 覆盖完整性由 `server/test/write-policy-matrix.test.mjs` 断言：Express 运行期写路由集合 **≡** 矩阵集合；反例（新增未登记路由 / 删除矩阵行）均判红。

## 二、本轮修复的权限缺口

| 写口 | 原状 | 现判据 |
|---|---|---|
| `DELETE /api/v1/attendances/:id` | 仅登录 + 同支部 | 支委层/党委 ∪ 本场组织者 ∪ 记录人本人 |
| `POST/PATCH /api/v1/actSubRecords` | 仅登录 + 父记录支部 | 支委层/党委 ∪ 父活动组织者/深度协作者；PATCH 换父键同判 |
| `POST/PATCH /api/v1/tfSubRecords` | 仅登录 + 父记录支部 | 支委层/党委 ∪ 专班组织者/深度协作者 |
| `POST /api/v1/issue-unread` | 任意登录成员可写他人 | 本人 ∪ 派发位（支委层/组长/党委）∪ 事项当事人 |
| `POST /api/v1/snapshot` 聚合子记录 | 直接 `continue`，可空 body 清空 | 按父键复算值变化与删除面，复用聚合写门 |
| `POST /api/v1/snapshot` 考勤集合 | 无集合门，可整集合删 | `attendances` 增加 `attendance-row` 删除门，快照删除面保留存量 |

## 三、会话与运行档

- 会话 TTL：`SESSION_TTL_DAYS`（默认 7，非法值回落 7）；过期 token 在 `/auth/me` 与受保护写口均 401，并删除过期 session 行。
- 生产单支部：`branches > 1` 且未设 `ALLOW_MULTI_BRANCH=1` ⇒ 启动 exit 1。
- review 档：`npm run start:review` 缺省使用 `server/data.review.db`，避免视觉检验写入生产库。

## 四、证据

- `test-run.log`：`security-redteam` + `write-policy-gaps` + `session-ttl` + `write-policy-matrix` 共 **15 / 15 pass**。
- 既有回归：`permission-gate` / `r3-data-permission-regression` / `attendance-batch` / `issue-audience-projection` / `workgroup-api` / `auth` 等 83 / 83 pass（见任务 4 读数）。
- 矩阵反例：未登记路由判红、删除矩阵行判红（`write-policy-matrix.test.mjs`）。

## 五、剩余风险（已入台账，不在本批修）

- `L-09`：`issue-unread` 派发位仍可给同支部任意成员写未读，未强校验 `assignee === issue.assignee`；已收窄到派发位并做支部校验。
- `L-10`：单实例多支部硬边界；服务端按支部读过滤未做，上线坚持一实例一支部。
- `L-11`：全支部共享一个 `LOGIN_PASSWORD`，无个人密码；受控部署 + 定期换口令。
- `L-02`：`install/update` 未在 Linux 真机验证，首次部署前必须在测试机逐条核对。
