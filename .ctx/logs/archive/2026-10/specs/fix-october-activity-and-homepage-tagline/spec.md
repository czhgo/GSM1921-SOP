# 十月活动状态与首页小字修正 Spec

## Why
宣传形态（GitHub Pages / 本地静态）首页仍挂着一句「本系统面向各类党支部与学生组织——每个组织可部署自己的实例……」的平台化小字，暴露「通用模板」性质，与「做得像真支部一样、可截图宣传」的目标相冲；同时十月活动 `act-36`（党建思想学习会，**2026-10-15**）被写成 `status: 'completed'`（已举办）——但今天（2026-10-11）尚未到活动日，它已被判为「已执行 / 待归档」并进入归档口径（生命周期派生 `executed`/`pending_archive`、归档库「已结束」筛选命中），与真实时间线矛盾（支书原话：「10月15日还没到，所以我们还没有归档这个活动！！」）。

## What Changes
- 删除三处同句平台化小字（首页 `docs/index.html`、帮助页 `docs/help.html`、关于页 `docs/src/entries/pages/about-entry.js`）。
- 将 `act-36`（党建思想学习会，2026-10-15）状态由 `completed` 改准为 `published`（已发布 · 计划中），并同步该条的说明注释；使其不再被判为「已执行 / 待归档」，也不再进入归档库口径。
- 同步守卫：`copy-master-guard` 中 `about-entry.js` 的基线条目收档（该句删除后重合清零，否则 N3「僵尸登记」判红），并随之下调 `BASELINE_FILE_COUNT` / `BASELINE_TOTAL` 及 N3 下限；处理删除行带来的行号引用漂移。
- 版本戳 bump（改动 `.js`，按 H25 纪律）。
- 真机收尾：服务已运行，重新登录后复核首页（十月两活动可见、`act-36` 非「已执行 / 待归档」、待办「已过期」为 0、无平台化小字）。
- **不 push**（支书自行推送）。

## Impact
- Affected specs: 宣传形态（未登录 / 静态托管的首页与文档页）· 活动生命周期派生口径
- Affected code:
  - `docs/index.html`（首页小字）
  - `docs/help.html`（帮助页小字）
  - `docs/src/entries/pages/about-entry.js`（关于页小字）
  - `docs/src/data/mock/activities.js`（`act-36` 状态 + 注释；单一源，mock 与 `server/seed.js` 同源）
  - `server/test/copy-master-guard.test.mjs`（基线同步）
  - 连带：全站版本戳、可能需改准的行号引用（`doc-line-ref` / `doc-consistency` 报出的漂移）

## ADDED Requirements

### Requirement: 首页 / 文档页不出现「通用模板」性质的平台化小字
系统 SHALL 在宣传形态的用户可见面上不出现「本系统面向各类党支部与学生组织——每个组织可部署自己的实例（自有名称、人员、制度、配色与数据）。」这句暴露「通用模板」性质的可见文案。

#### Scenario: 首页
- **WHEN** 打开首页（登录或未登录）
- **THEN** 支部名「光华管理学院本科生党支部」下方不再出现该平台化小字，页面其余结构（重要通知 / 数据统计 / 近期活动）不变

#### Scenario: 帮助页 / 关于页
- **WHEN** 打开帮助页或关于页
- **THEN** 同样不再出现该小字（关于页 hero 保留其余内容，如「从入党申请人到正式党员」「以本支部为例」）

### Requirement: 未到日期的活动不得判为「已执行 / 待归档」
系统 SHALL 使活动状态字面值与生命周期派生自洽：活动日期尚未到来时，不得判为「已执行（executed）」或「待归档（pending_archive）」，也不得进入归档库「已结束」口径。

#### Scenario: 10-15 党建思想学习会（今天 2026-10-11）
- **WHEN** 查看首页「近期活动」或活动详情
- **THEN** `act-36` 生命周期显示为「已发布」（计划中），归入「未完成」分组；不再显示「已执行 / 待归档」
- **WHEN** 查看归档库
- **THEN** 归档库不含 `act-36`

#### Scenario: 10-22 红色徒步·香山行（对照，保持不变）
- **WHEN** 查看首页「近期活动」
- **THEN** `act-37` 仍为「已发布」（计划中），与两条活动一致处于「未完成」分组

## MODIFIED Requirements
（无）

## REMOVED Requirements
（无）

## 边界与不做
- 不改动活动日期、通知、待办等其他十月基线内容。
- 不新增演示 / 测试性质文案。
- 不 push（支书自行推送）。
