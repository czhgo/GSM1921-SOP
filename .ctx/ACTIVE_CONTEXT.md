---
title: "Active Context — 当前判断入口"
type: active_context
role: "[AI]"
layer: active
last_updated: "2026-11-03"
last_verified: "2026-11-03"
latest_decision: "D-852"
budget: "≤300 行 / ≤30KB"
source: [CLAUDE.md, .ctx/SNAPSHOT.md, .ctx/ENGINEERING_ASSESSMENT.md, .ctx/ACTIVE_RULINGS.md, .ctx/logs/2026-11-DECISION_LOG.md]
status: active
---

# Active Context — 当前判断入口

> **这是 active context，不是仓库。** 每次会话只读本文件 ＋ `CLAUDE.md`；其余 `.ctx` 文件按需读取。
> **`.ctx` 是仓库**：保存全量裁定、证据、日志、机器元数据。规则 / 判例 / 方法正文在 `content/01–05`；本文件只做当前投影。
> **预算**：≤300 行 / ≤30KB。超预算时把细节降级到参考文件并留指针，不得继续堆。
> **冲突顺序**：当月 `DECISION_LOG` ＞ 本文件 ＞ `content` 权威 ＞ `SNAPSHOT` ＞ `ENGINEERING_ASSESSMENT` ＞ `logs` / `evidence`。发现冲突先找最新 `D-xxx`；找不到就补一条裁定，不静默择一。

## §1 系统现状（只读这一屏）

- **形态**：原生 ESM 多页应用 ＋ Node/Express ＋ better-sqlite3；页面 26 个（18 根页 ＋ 8 工作台/只读视图）；工作台 7 个（支书 / 组织 / 宣传 / 纪检 / 组长 / 成员 / 党委）。
  - source：`.ctx/SNAPSHOT.md §I/§III`。
- **数据**：业务表 47 张（34 资源 ＋ 7 语义 ＋ 6 工作组）；SQLite 宽表 `id + data(JSON)`；schema **v12**；空库首启补最小组织基线（1 支部 ＋ 党委账号 ＋ 6 角色账号）。
  - source：`server/data/domain-contract.mjs`、`content/04_web_design/data/DATA_CONTRACT.md`。
- **权限**：写入口权限矩阵 **141 条**（135 enforced / 4 self-service / 2 public / **0 known-risk**）；守卫断言运行期写路由 ≡ 矩阵；审计 C1 查矩阵 + 高风险抽样。
  - source：`server/security/write-policy-matrix.mjs`、`content/05_ai_coding/AUDIT_CANON.md`。
- **审计**：45 页签 **P0 0 / P1 0 / P2 2 / exception 44**；F1–F8 全绿；M1–M3 在位。
  - source：`.ctx/evidence/2026-11-03/tab-audit/summary.md`。
- **测试**：`npm run test:daily` **1765 / 1765**（约 341s）；docs / ctx 守卫 65 / 65。
  - source：`.ctx/logs/2026-11-EXECUTION_LOG.md §五`、`.ctx/ENGINEERING_ASSESSMENT.md §二 2.5`。
- **版本戳**：`20261102b`，0 处陈旧。
  - source：`docs/scripts/bump-version.mjs --check`。
- **换轨**：副本 **48 表 / 577 行** export → dry-run → apply 一致；生产空库 `preflight-cutover --strict` exit 0 / 警告 0。
  - source：`deploy/CUTOVER_RUNBOOK.md`、`.ctx/evidence/2026-11-03/security/summary.md`。

## §2 现行裁定摘要（跨域、仍生效、会影响下一步）

> 规则正文在 `content`；本表只给「一句话 + D + 落点」。分域索引见 `.ctx/ACTIVE_RULINGS.md §B`。

- **支委会＝支部领导管理机构，也是组织型主体**：可作「承担方」，但不是角色键、不能登录；支委层权限仍由五个委员角色键承载。（`D-550` · `D-573` · `D-612`）→ `content/02_institution/SYSTEM_ROLE_PERMISSION.md` 附录。
- **写入活动＝党小组组长；写入时指定组织者，指定即赋权、解除即收回**；全支部通知仍归支书。（`D-308` · `D-309` · `D-312`）→ `SYSTEM_ROLE_PERMISSION §9h/§9i`。
- **组织者上传位在成员本人页面**，不进入组长台；组长与组织者是两个概念。（`D-494` · `D-808`）→ `content/04_web_design/PRODUCT_IA.md`。
- **活动一律报备**（走微信群，报备通过后写入）；不写「报备即知情 / 默认同意」。（`D-286` · `D-289` · `D-311`）→ `content/02_institution/sop/常见工作场景快速指南.md`。
- **补课范围：支部党员大会 / 党课为硬要求，任何单场活动不能关；其余类型逐场开关**。（`D-293` · `D-545`）→ `SYSTEM_ROLE_PERMISSION §9l`。
- **思想汇报篇幅提醒只给提交人本人**；组织侧不留「篇幅不足」标记。（`D-547`）→ `SYSTEM_ROLE_PERMISSION §9l`、`DATA_MODEL §2.25`。
- **出勤率只提示、不设阈值；只给支委会与本人，不公示**。（`D-304` · `D-537`）→ `SYSTEM_ROLE_PERMISSION` 附录、纪检指南。
- **意见反馈处置归支委层，匿名支部内闭环、不揭名**；事项领域只给归口建议、不自动派单。（`D-550` · `D-824` · `D-551`）→ `SYSTEM_ROLE_PERMISSION §9j`。
- **写权限唯一机读源＝矩阵**；新增写入口未登记即判红；C1 不再按中间件字符串判风险。（`D-847`）→ `content/05_ai_coding/AUDIT_CANON.md`。
- **会话 3 小时过期**；production 多支部拒绝启动；review 档使用独立演示库。（`D-848`）→ `server/routes/auth.js`、`server/run-mode.js`。
- **多支部同实例只到设计稿**：Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH`；上线坚持一实例一支部。（`D-849`）→ `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`。
- **规则与判例先进 content，再进 .ctx 索引**；`.ctx` 不再承担规则正文。（`D-850` · `D-852`）→ `.ctx/README.md`、`content/05_ai_coding/CONTEXT_MANAGEMENT.md`。

## §3 当前风险与下一步

### 阻断级风险（5 条，逐条复核）

1. **多支部同实例会跨支部读出数据**：读面未统一过滤；production 已硬拦多支部；设计见 `ARCHITECTURE_EVOLUTION §十`。**保留**。
2. **通用写口权限**：矩阵 141 行 / 0 known-risk，6 条缺口已修。**部分闭环**；残项：共享口令、多支部读过滤、`issue-unread` 派发位未强校验 `assignee`。
3. **表决选民名单来自活动数据本身**：服务端未按场景重算 `voteConfig.voterIds`。**保留**。
4. **共享口令**：会话已 3 小时过期。**部分闭环**；共享口令仍在，生产用 systemd 注入强口令并定期更换。
5. **SQLite JSON 宽表是规模边界**：无业务字段索引；万行级前评估 `MIGRATIONS v2`。**保留**。

### 上线残项中仍 open 的（详见 `.ctx/ENGINEERING_ASSESSMENT.md §四`）

- `L-02` `install.sh` / `install.ps1` / `update.sh` 未在 Linux 真机验证（post-launch；首次部署前必须跑）。
- `L-08` 47 条 exception 无固定复核节奏（每次全量审计同批复核）。
- `L-09` `issue-unread` 派发位未强校验 `assignee`。
- `L-10` 多支部读过滤未实现（设计已出）。
- `L-11` 共享口令。
- `L-12` 审计脚本不进 daily（发布前硬门）。
- `L-13` 41 个页签仅登记未重构。
- `L-14` / `L-15` 块停用与画布 / 按角色配置（先出方案）。
- `L-16` 表决名单重算待支书裁定。
- `L-17` 宽表与索引。
- `L-18` 组件出口散件。

### 下一批最该做的 3 件事

1. **首次部署前验证**：在 Linux 测试机跑 `install/update` + `preflight-cutover --strict`，把 `L-02` 关掉。
2. **多支部 Phase 1**：读口统一接入 `resourceRowsForActor`，双支部夹具证明 A 读不到 B；完成前不打开 `ALLOW_MULTI_BRANCH`。
3. **收口 `issue-unread`**：补 `assignee === issue.assignee` 或改为服务端派生未读，关 `L-09`。

## §4 文件地图（读什么 / 不读什么）

| 层 | 文件 | 何时读 | 不读什么 |
|---|---|---|---|
| **active** | `CLAUDE.md` | 每次会话 | 历史沿革 |
| **active** | `.ctx/ACTIVE_CONTEXT.md`（本文件） | 每次会话 | 全量裁定、证据 |
| reference | `.ctx/SNAPSHOT.md` | 需要目录 / 页面 / 表清单时 | 批次流水（已迁 index） |
| reference | `.ctx/ACTIVE_RULINGS.md` | 需要分域裁定索引时 | 规则正文（在 content） |
| reference | `.ctx/ENGINEERING_ASSESSMENT.md` | 定下一批 / 看评分证据时 | 活跃上下文默认不读 |
| reference | `.ctx/REVIEW_QUEUE.md` | 每批开工前扫未闭环 | 已闭环（已删） |
| reference | `.ctx/TIMESTAMPS.md` | 收尾核对 / 改文件后 | 叙述 |
| provenance | `.ctx/logs/YYYY-MM-*.md` | 追溯成因 / 裁定原文 | 不用于日常决策 |
| provenance | `.ctx/evidence/YYYY-MM-DD/` | 复核真机读数 / 截图 | 不用于日常决策 |
| knowledge | `content/01–05` | 按任务类型读 | 不重复 .ctx 状态 |

## §5 保鲜与冲突

- **更新触发**：每批收尾；每条新 `D-xxx`；六维评分变化；上线形态变化。
- **保鲜判据**：`latest_decision` 必须 ≥ 当月决策日志最后一条 `D-xxx`；`last_verified` 必须 ≥ 最新裁定日期。守卫：`ctx-hygiene-guard` / `docs-governance-guard`。
- **超预算处理**：先删「已不行动」的行；再把细节降级到 reference；最后才压缩措辞。不得用缩小字号 / 合并长句逃避预算。
- **僵尸行**：连续 3 批未触发且不再影响动作的摘要行，删除或降级。
- **冲突处理**：当月决策日志 > 本文件 > content 权威 > SNAPSHOT > ASSESSMENT > logs；无 `D-xxx` 的冲突不得自行择边，登记到 `REVIEW_QUEUE` 或丙部待裁。
