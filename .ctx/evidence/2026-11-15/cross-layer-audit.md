# 跨层专项扫描（2026-11-15 · 批次 552）

四域独立扫描（计算逻辑 / 全栈契约 / 后端健壮性 / 前端可访问性），共 20 条候选。
处置规则：错值 > 崩溃 > 写失败 > 体验；有既有判据的按判据修，没有的登记 `REVIEW_QUEUE` 带触发条件。

## 已修（14 条）

| # | 域 | 位置 | 问题 | 处置 |
|---|---|---|---|---|
| C1 | 计算 | `docs/src/services/activity/attendance.js` | 党小组会无 `hostGroup`、组织者无 `partyGroup` ⇒ 分母空集，覆盖率恒 100% | 活动语境层回退支部在册应到；考勤卡提示「缺小组归属，按支部应到计」 |
| C2 | 计算 | `docs/src/core/domain/todo-derive.js` | `recordedAt.slice(0,10)` 取 UTC 日 ⇒ 半年边界误派 | 改本地日 `_localDayOf` |
| C3 | 计算 | `docs/src/services/activity/makeup.js` | `toISOString().split('T')[0]` ⇒ 截止日早一天 | 本地日 + T+7 |
| C4 | 计算 | `docs/src/components/governance/vote-summary-panel.js` | 提示「出席 ≥ ceil(n/2)」与执行判据 `> n/2` 不一致 | 提示对齐为 `floor(n/2)+1` |
| F1 | 全栈 | `docs/src/data/api-adapter.js::users.list` | 丢弃 `branchId` ⇒ 党委选支部名册空 / 串支部 | 同时转发 `branchId` + `includeTransferredOut` |
| F2 | 全栈 | `docs/src/services/core/visibility.js` | api 形态仍用静态 `PEOPLE`（违 `H32`） | 改走 `PersonStore` 门面，签名不变 |
| B1 | 后端 | `server/routes/resources/index.js` | 删活动物理删报名 / 表决（违反「报名记录须保留」） | `D-876`：保留行 + `activitySnapshot`；前端 mock 同口径 |
| B2 | 后端 | `server/routes/report.js` | Express 4 async 路由无兜底 ⇒ 悬挂 / 未处理拒绝 | `try/catch → next(e)` |
| B3 | 后端 | `server/app.js` | 500 回传 `err.message` 泄漏 SQLite 细节 | 对外通用文案，细节只进日志 |
| U1 | 前端 | `docs/src/components/feedback/issue-form.js` | 4 字段无 `label for`；提交无 pending | label/id、`aria-required`、pending + 禁用 |
| U2 | 前端 | `docs/src/entries/tabs/org/talent-tab.js` | 可点 `div` 键盘不可达 | `role=button` + `tabindex` + Enter/Space |
| U3 | 前端 | `docs/src/entries/pages/settings-entry.js` | `dt/dd` 不在 `dl`；select 无名称 | `dl` 包裹 + `aria-label` |
| U4 | 前端 | `docs/src/components/notice/message-search-bar.js`、`components/feedback/issue-list.js` | 搜索框只有 placeholder | 补 `aria-label` |
| U5 | 前端 | 同上 4 处 | 表单 / 交互可访问性 | 并入 U1–U4 同批验证 |

## 登记（6 条，触发即开工）

| # | 域 | 位置 | 问题 | 触发 |
|---|---|---|---|---|
| C5 | 计算 | `docs/src/services/governance/secretary-overview.js` | 逾期数自算 `deadline < today`，绕过 `isTodoExpired` | 下次改概况逾期统计时按单一源收口 |
| F3 | 全栈 | `docs/src/data/api-adapter.js` + `server/routes/resources/index.js` | list 无分页返回数组、有分页返回 `{rows,total}`，适配器原样转发 | 首个分页调用点出现前统一形状 |
| F4 | 全栈 | `docs/src/services/member/person.js` | 名册写口发 `{}` / 非党委带 `branchId` ⇒ 400 | 下次改名册保存 / 角色配置时校验 body |
| B4 | 后端 | `server/routes/resources/index.js::/snapshot` | `gunzipSync` 无解压上限 | 快照接口改造或出现异常内存读数时加限 |
| B5 | 后端 | `server/routes/system-notices.js` | 无幂等键，重发 / 双击重复落库 | 通知发送改造时加入幂等键 |
| B6 | 后端 | `server/security/signup-write-guard.js` | 报名查重只在应用层，无唯一索引 | 迁移 v2 或出现并发重复读数时补索引 |

## 读数

- 定向：`activity-delete` 2/2、`report` 9/9、`meeting-attendance-rules` ＋ `attendance-roster-union` ＋ `todo-deriver-domain` 19/19、`agenda-quorum` 11/11、`member-roster-api-read` ＋ `mock-api-parity` ＋ `roster-ui-logic` 16/16。
- 守卫：`docs-governance` 30/30、`form-loop-sweep::S6` 1/1、`nested-interaction-guard`（含 talent-tab 白名单登记，缺陷基线 14 不变）。
