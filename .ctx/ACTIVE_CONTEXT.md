---
title: "Active Context — 当前判断入口"
type: active_context
role: "[AI]"
layer: active
last_updated: 2026-11-24
last_verified: "2026-11-24"
latest_decision: "D-928"
budget: "≤300 行 / ≤30KB"
source: [CLAUDE.md, .ctx/SNAPSHOT.md, .ctx/ENGINEERING_ASSESSMENT.md, .ctx/ACTIVE_RULINGS.md, .ctx/logs/2026-11-DECISION_LOG.md]
status: active
---

# Active Context — 当前判断入口

> **这是 active context，不是仓库。** 每次会话只读本文件 ＋ `CLAUDE.md`；其余 `.ctx` 文件按需读取。
> **`.ctx` 是仓库**：保存全量裁定、证据、日志、机器元数据。规则 / 判例 / 方法正文在 `content/01–05`；本文件只做当前投影。
> **预算**：≤300 行 / ≤30KB。超预算时把细节降级到参考文件并留指针，不得继续堆。
> **冲突顺序**：当月 `DECISION_LOG` ＞ 本文件 ＞ `content` 权威 ＞ `SNAPSHOT` ＞ `ENGINEERING_ASSESSMENT` ＞ `logs` / `evidence`。

## §1 系统现状（只读这一屏）

- **形态**：原生 ESM 多页应用 ＋ Node/Express ＋ better-sqlite3；页面 26 个（18 根 ＋ 8 工作台/只读视图）；工作台 7 个；党委台 4 页签。source：`.ctx/SNAPSHOT.md`。
- **URL**：无后缀已落地（`D-867`）；旧 `.html` 保持 200；站内锚点只经 `pageHref()`。
- **数据**：业务表 50 张；SQLite 宽表 `id + data(JSON)`；schema **v19**。source：`server/data/domain-contract.mjs`。
- **权限**：写入口矩阵 **163 条**（156 enforced / 5 self-service / 2 public / **0 known-risk**）；守卫断言运行期写路由 ≡ 矩阵。source：`server/security/write-policy-matrix.mjs`。
- **六维（`D-918` 重评）**：业务 **78** / 安全 **77** / 体验 **75** / 测试 **70** / 架构 **72** / 部署 **70**；只作诊断，不单独阻断合并（`D-894`）。
- **审计**：46 页签 **P0 0 / P1 0 / P2 0 / exception 44**（批次 603 实跑 239.7s，同值；source：`.ctx/evidence/2026-11-21/tab-audit/summary.md`）；D/C 维度（批次 605 实跑，批次 606 复跑同值）：**D2 处置 46/46**（5 条规则 pass ＋ 41 条 `countSkip` 理由）、**C2 37 pass** / 12 destructive exception、P0/P1/P2 0；复跑读数：`.ctx/evidence/2026-11-23/tab-audit/summary.md`。
- **测试（四层）**：daily **32 文件 / 264 断言**；guards **81 文件 / 907 断言**（52 源件已并 5 件，预算软告警）；`npm run probe:stage` 6 步断点探针。source：`server/test-tier-registry.mjs`。
- **换轨**：`preflight-cutover --strict` exit 0；契约 50 表；生产只走个人密码（`D-882`）。source：`deploy/CUTOVER_RUNBOOK.md`。
- **分支 / CI**：当前在 `main`（已合并 `release/2026-11-launch` 88 条）；619–624 已推送，远端 main = `f51e2d7f2`；CI run `45430226062`（daily / deploy-verify / install-linux 三 job success）@ `f51e2d7f2`；`P-7` 已按 `D-924` 恢复深链展开。

## §2 现行裁定摘要（只留仍影响下一步）

> 规则正文在 `content`；本条只给「一句话 ＋ D ＋ 落点」。全量索引见 `.ctx/ACTIVE_RULINGS.md §A/§B`，逐条沿革见当月 `DECISION_LOG`。

1. **多支部同实例只到设计稿**：Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH`；上线坚持一实例一支部。（`D-849` · `D-889`）→ `ARCHITECTURE_EVOLUTION §十`。
2. **会话 3 小时过期；production 多支部拒绝启动；review 档独立演示库；生产只走个人密码**。（`D-848` · `D-882`）→ `server/routes/auth.js`、`server/run-mode.js`。
3. **写权限唯一机读源＝矩阵**；新增写口未登记即判红。（`D-847`）→ `content/05_ai_coding/AUDIT_CANON.md`。
4. **公共门厅 fail-closed**：未登录只看未过期的党委公开内容；不存在 / 非公开 / 过期 / 无权统一 404。（`D-858`）→ `server/routes/public-portal.js`。
5. **测试四层**：daily 结果门禁、guards 静态按需、precommit / full 覆盖全量；不删测试与断言。（`D-859`）→ `server/test-tier-registry.mjs`、`CLAUDE.md H25`。
6. **六维只按证据加减分**；同一指标只留一个当前值；两段合并门槛（本机门 / 外部门）。（`D-894`）→ `EA §一 / §5.2`。
7. **evidence 只存被台账引用或被守卫消费的读数**；截图 / 压缩包 / 原始日志不留库。（`D-905`）→ `CLAUDE.md H26.3a`。
8. **URL 去后缀 ＋ 兼容**：`pageHref()` 单源，旧 `.html` 保持 200。（`D-867`）→ `content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md`。
9. **对象模型**：党小组 → 活动 / 专班 → 工作组；活动与专班并列；工作组不设指导支委。（`D-866` · `D-868`）→ 同上 §五。
10. **副支书同页同台、独立账号键**；四类主责动作操作权由 `role.deputySecretary` 三档决定，主责归支书。（`D-891`）→ `docs/src/core/domain/deputy-capability.js`。
11. **前端三契约**：待办跳转 fail-closed、议程分类两端同源、表格 `renderDataTable` 单一出口。（`D-863`）→ `content/04_web_design/contracts/`。
12. **表态按人存、只本人可撤**；出口只回计数与 `myReactions`，匿名反馈不回传表态人。（`D-906`）→ `server/routes/resources/index.js`。

## §3 当前风险与下一步

### 阻断级风险（5 条）

1. **多支部同实例会跨支部读出数据**：production 已硬拦；框架四条已落（`D-888` / `D-889`），开关仍关。
2. **通用写口权限**：矩阵 163 条 / 0 known-risk，6 条缺口已修。**闭环**。
3. **表决选民名单**：服务端建会冻结（`D-872`）。**闭环**。
4. **共享口令**：会话 3 小时过期，个人密码已落地；生产拒绝共享口令回退（`D-882`）。**部分闭环**。
5. **SQLite JSON 宽表**：万行前评估 `MIGRATIONS v2`。**保留**。

### 上线残项（详见 `EA §四`）

- `L-02`（**外部门**）Linux：CI `install-linux` 全链已绿（run `45430226062`）；systemd / useradd / cron / nginx 待真机。
- `M-01`（**外部门**）手机验收台已备（`npm run acceptance` → `/mobile`）；三任务真机点击待支书完成。
- `CI`（**外部门**）daily / deploy-verify / install-linux 三 job 已绿（run `45430226062`）；nightly 四片待次日定时。
- `L-13` 页签 IA：A 40 / B 6 / C 0；6 个超 4 块页签登记例外；F-2 待裁（`P-5`）。
- `L-14` / `L-15` 工作流新维度：先出方案；`L-17` 宽表阈值：单表 ≥ 1 万行触发；`L-18` 组件散件：随改动收敛。

### 下一批任务

1. **合并与推送已落**：`release/2026-11-launch` → `main`（merge `10c22ba0d`）；619–624 已 push（远端 `f51e2d7f2`）；nightly 四片待次日定时。
2. **外部门剩余真人动作**：M-01 手机三任务（`npm run acceptance` → `/mobile`）＋ `/signoff` 签收；SMTP 第三方实投需 `SMTP_*`。
3. **backlog（触发即做）**：`L-13`（余 8 条，F-2 见 `P-5`）、`L-14`·`L-15`（方案见 `WORKFLOW_BLOCK_CONTRACT §8.5`，形态见 `P-6`）、`L-17`（`probe:scale` 未触发）、`L-18`。
4. **发布前阻断**：本机门禁改为 `test:precommit`（`D-923`）；`S21` 已按 `D-924` 转绿；余外部门 `L-02` 的 systemd / nginx 真机段、M-01 真机点击与 `/signoff` 签收。
5. **已撤销**：`C-5`（`D-914`）——`text-xs` 是 DS_02 允许的「说明句」档，不设「全部上迁 13px」任务；新增由 `style-ratchet-guard::Q6` 的只减不增基线守住。

## §4 文件地图（读什么 / 不读什么）

| 层 | 文件 | 何时读 | 不读什么 |
|---|---|---|---|
| **active** | `CLAUDE.md` | 每次会话 | 历史沿革 |
| **active** | `.ctx/ACTIVE_CONTEXT.md`（本文件） | 每次会话 | 全量裁定、证据 |
| **温层** | `content/05_ai_coding/UI_REVIEW_CHECKLIST.md` | 改 UI / 布局 / 交互时 | 每次会话必读、规范正文 |
| reference | `.ctx/SNAPSHOT.md` | 需要目录 / 页面 / 表清单时 | 批次流水 |
| reference | `.ctx/ACTIVE_RULINGS.md` | 需要分域裁定索引时 | 规则正文 |
| reference | `.ctx/ENGINEERING_ASSESSMENT.md` | 定下一批 / 看评分证据时 | 活跃上下文默认不读 |
| reference | `.ctx/REVIEW_QUEUE.md` | 每批开工前扫未闭环 | 已闭环（已删） |
| reference | `.ctx/TIMESTAMPS.md` | 收尾核对 / 改文件后 | 叙述 |
| provenance | `.ctx/logs/YYYY-MM-*.md` | 追溯成因 / 裁定原文 | 不用于日常决策 |
| provenance | `.ctx/evidence/YYYY-MM-DD/` | 复核被引用读数 | 不用于日常决策 |
| knowledge | `content/01–05` | 按任务类型读 | 不重复 .ctx 状态 |

## §5 保鲜与冲突

- **更新触发**：每批收尾；每条新 `D-xxx`；六维评分变化；上线形态变化。
- **保鲜判据**：`latest_decision` ≥ 当月决策日志末条；`last_verified` ≥ 最新裁定日期。守卫：`ctx-hygiene-guard` / `docs-governance-guard`。
- **超预算处理**：先删「已不行动」的行；再把细节降级到 reference；最后才压缩措辞。
- **僵尸行**：连续 3 批未触发且不再影响动作的摘要行，删除或降级。
- **冲突处理**：当月决策日志 > 本文件 > content 权威 > SNAPSHOT > ASSESSMENT > logs；无 `D-xxx` 的冲突登记 `REVIEW_QUEUE` 或丙部。
