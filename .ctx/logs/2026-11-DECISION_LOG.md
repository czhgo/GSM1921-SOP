---
title: "2026年11月决策日志"
type: decision_log
role: "[工程师]+[AI]"
last_updated: 2026-11-17
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-11-DECISION_LOG.md, .ctx/logs/2026-10-DECISION_LOG.md, content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md, content/04_web_design/design-system/DS_03_COMPONENTS.md, content/04_web_design/design-system/DS_04_INTERACTION_AND_RESPONSIVE.md]
---

# 2026年11月决策日志

> 本文件记录 2026 年 11 月所有非显而易见的决策。每条决策包含背景/选项/决定/理由/影响范围/一改具改检查。
> **来源（2026-11-01 批次 524 换月）**：自 2026-10 文件续编，`D-827` 起记于本文件；每条只写「评议 → 裁定 → 落点文件」一句，过程见 `.ctx/logs/2026-10-EXECUTION_LOG.md` 与 `git`。

> **条目编号起止**：本文件当前 **`D-827` … `D-880`，共 54 条**；下一条自 **`D-881`**。

## 本月目录（2026-11）

> **说明**：本表**只索引、不重复内容**（`主题` / `条目` / `日期` / `状态`）。条目正文见下方各 `## D-xxx` 节。

| 主题 | 条目 | 日期 | 状态 |
|---|---|---|---|
| 数据表表头去灰：两条 `th` 规则统一白底 ＋ 1px 下边框 | `D-827` | 2026-11-01 | 已落（批次 524） |
| 可点行状态：灰底不作 hover，改主题 10% 淡底 ＋ `::before` 左条 | `D-828` | 2026-11-01 | 已落（批次 524） |
| 嵌入视图去嵌套卡：`embedded` 形态不再渲染自身 `card` 与卡头 | `D-829` | 2026-11-01 | 已落（批次 524） |
| 语义标签：`section` 必有可访问名称且不得嵌套 | `D-830` | 2026-11-01 | 已落（批次 524） |
| 只读文案由 `view-capability.js` 派生，未登记 kind 恒只读 | `D-831` | 2026-11-01 | 已落（批次 524） |
| 功能色分工：指标 / 状态用功能色，动作 / 导航 / 选中态用主题色 | `D-832` | 2026-11-01 | 已落（批次 524） |
| 输入控件单一源：只经 `forms.js`，裸输入存量只减不增 | `D-833` | 2026-11-01 | 已落（批次 524） |
| 搜索框收窄：`.lf-kw` 独占一行 ≤320px，≤640px 满宽 | `D-834` | 2026-11-01 | 已落（批次 524） |
| 关键词自动补全只用原生 `<datalist>`，不引第三方库 | `D-835` | 2026-11-01 | 已落（批次 524） |
| 待办跳转单一源：`todo-actions.js` ＋ `workspace-nav.js` | `D-836` | 2026-11-01 | 已落（批次 524） |
| 页签覆盖口径：旧 67 台账退役，改用 45 catalog（W1–W5） | `D-837` | 2026-11-02 | 已落（批次 526） |
| F1 口径：以 `TAB_BLOCK_BASELINE` 登记为准，DOM measured 只复核 | `D-838` | 2026-11-02 | 已落（批次 526） |
| 破坏性 CRUD 不在共享库真删，只做软回滚 / 静态门 | `D-839` | 2026-11-02 | 已落（批次 526） |
| `requireAuth` 通用写口按已知系统性风险记 exception | `D-840` | 2026-11-02 | 已落（批次 526） |
| 六维重评：测试与发布质量 78→80，其余维持 | `D-841` | 2026-11-02 | 已落（批次 526） |
| 审计简并：audit 只做报告层；四口径唯一表（F2 行数 / F4 H2 恰 1 / F7 hasPager / C1 requireAuth 例外） | `D-842` | 2026-11-02 | 已落（批次 527） |
| M1–M3 落地；4 个双列表页签登记「独立对象池」例外 | `D-843` | 2026-11-02 | 已落（批次 527） |
| 数据契约：47 表单一源 + fixtures；parity 值对照 26 表、结构 41 表 | `D-844` | 2026-11-02 | 已落（批次 527） |
| 换轨：export/import/preflight + 迁移前备份 + 拒绝降级；副本演练 48 表 542 行一致 | `D-845` | 2026-11-02 | 已落（批次 527） |
| 六维重评：运行部署 62→68（换轨闭环证据），其余维持 | `D-846` | 2026-11-02 | 已落（批次 527） |
| 写权限单一源：权限矩阵 141 行，C1 改矩阵判定 + 高风险抽样 | `D-847` | 2026-11-03 | 已落（上线专项） |
| 会话 3 小时过期；review / production 两档固化，review 独立库 | `D-848` | 2026-11-03 | 已落（上线专项） |
| 多支部同实例设计：Phase 1–2 完成前不得打开 ALLOW_MULTI_BRANCH | `D-849` | 2026-11-03 | 设计已出（未实现） |
| 上线残项单一台账 L-01…L-21；launch-blocker 6 条已关 / 1 条降级 | `D-850` | 2026-11-03 | 已落（上线专项） |
| 六维重评：安全 52→66 · 测试 80→83 · 架构 74→76 · 部署 68→73 · 数据 78→79；三成本维持 68 | `D-851` | 2026-11-03 | 已落（上线专项） |
| `.ctx` 三层：active 投影 + reference + provenance；规则进 content，ACTIVE_RULINGS 只留索引 | `D-852` | 2026-11-03 | 已落（批次 529） |
| CLAUDE 宪法化：规则写正文、历史进 logs、细则进 content；乙部只留 ≤12 行真任务 | `D-853` | 2026-11-03 | 已落（批次 530） |
| 丙部四项：旧 token 失效 / 成功色档已存在 / SD 留 CASES / 低密度卡先收拢 | `D-854` | 2026-11-03 | 已落（批次 531） |
| 乙部余项合并批：最小 Plan B + 全量对账 + 9 条 e2e + 长期棘轮 | `D-855` | 2026-11-04 | 已落（批次 533） |
| 界面信号统一：删左条 / 焦点单环不回潮 / 颜色单一权威 / 7 类待办服务端化 | `D-856` | 2026-11-04 | 已落（批次 534） |
| CLAUDE 三层恢复 / 通知受众 fail-closed / SD-60 行动行 | `D-857` | 2026-11-07 | 已落（批次 535） |
| V-11 裁定：党委内容域 + 公共门厅 + 支部幂等采用 | `D-858` | 2026-11-08 | 已落（批次 536） |
| 测试瘦身：结果优先、守卫按需（四层 daily / guards / precommit / weekly） | `D-859` | 2026-11-08 | 已落（批次 537） |
| 测试瘦身二阶段 + 安全 / 体验 / 部署梯度：六维 80/78/74/85/77/74 | `D-860` | 2026-11-08 | 已落（批次 538） |
| 六维批判性修正：业务 80→79 · 安全 78→77 · 体验 74→72 · 测试 85→83（架构 77 / 部署 74 维持） | `D-861` | 2026-11-09 | 已落（批次 539） |
| 批次 539 终评：待办计算化 + 分工页美学 + R2/IA + 部署 6/6；六维 80/77/77/83/77/76 | `D-862` | 2026-11-09 | 已落（批次 539） |
| 批次 540 前端交互契约与议程 / 表格 / 详情重设计；六维 81/77/78/84/78/76 | `D-863` | 2026-11-10 | 已落（批次 540） |
| 批次 541 全仓漏网之鱼审计与 P2 统一清理；P2 台账 31 条五类分拣 · 六维 82/79/79/84/79/76 | `D-864` | 2026-11-10 | 已落（批次 541） |
| 六维评分保守回调：81/78/78/83/78/76（三层关系与对象模型口径未统一、CI 未跑、P2 漂移） | `D-865` | 2026-11-11 | 已落（只改台账） |
| 产品对象模型/组长权限/上会广播/URL 形态：党小组→活动/专班→工作组（无指导支委）· 组长组内全权+支部提案 · 统一上会事项+回执 · 去后缀+兼容 | `D-866` | 2026-11-11 | 已裁（待实现） |
| 三项子裁定（支部级专班存在 / 决议受众含受影响人 / 组长提案全体支委可见）＋ URL B 实施（pageHref 单源＋运行时归一） | `D-867` | 2026-11-11 | 已落（URL）；子裁定待实现 |
| 对象模型落地：活动/专班并列、工作组执行载体、专班补承办方、专班不产生考勤 | `D-868` | 2026-11-11 | 已落（批次 545） |
| 支委提案：统一上会事项、状态机、回执、议程接入 | `D-869` | 2026-11-11 | 已落（批次 546） |
| 三台专项探查 P0 收口：提案↔议程单一事实 / 支委会写门 / 报表读口 / 宣传台只读 / 组长读门 / harness 补漏 | `D-870` | 2026-11-12 | 已落（批次 547） |
| 547 边界闭环：专班折叠区真机流 / 消息页 import / issue-unread 清角标 | `D-871` | 2026-11-13 | 已落（批次 548） |
| L-16 表决名单采「建会冻结快照」 | `D-872` | 2026-11-13 | 已落（批次 550） |
| L-22 / B-541-1 三处 IA 块数按 DOM 实测重基线 | `D-873` | 2026-11-13 | 已复核（D-874：探针误报，基线不改） |
| D-873 复核：三处块数 10/14/9 为探针误报，改探针计块口径、基线不改 | `D-874` | 2026-11-14 | 已落（批次 550） |
| 提交 / 分支 / 台账三项纪律：单批 1–3 commit、日志不落 hash；达标后合并回 main；乙部 ≥80 门槛 | `D-875` | 2026-11-14 | 已落（批次 551） |
| 删活动保留报名 / 表决留痕行 + 活动快照 | `D-876` | 2026-11-15 | 已落（批次 552） |
| 六维按行业基线严格重评：76 / 68 / 72 / 70 / 72 / 65，均 <80 ⇒ 不合并 | `D-877` | 2026-11-15 | 已落（批次 553） |
| 六维补齐后重评：78 / 78 / 78 / 74 / 76 / 74，仍 <80 ⇒ 继续不合并；四条硬缺口列出 | `D-878` | 2026-11-15 | 已落（批次 559） |
| 壳层全局 44px＋13px；八条数字口径；三处越权；列表 2000＋水合不截断；六维 79/79/80/75/77/74 仍不合并 | `D-879` | 2026-11-16 | 已落（批次 561） |
| 字段错配五项＋契约以实现为准＋XSS/上报校验＋写路径 updatedAt＋全资源 If-Match＋help 全量对齐；六维 81/80/81/76/78/74 仍不合并 | `D-880` | 2026-11-17 | 已落（批次 562–564） |

## D-827 2026-11-01 — 数据表表头去灰

> **评议 → 裁定 → 落点**：支书批「同一页 `<thead>` 表头显灰、`tbody` 的 `<th scope="row">` 显白，莫名的灰显脏」→ `.data-table th` 与 `.data-table thead th` 均不再声明 `background`，统一白底透出 ＋ 1px 下边框，两条规则本体保留 → `content/04_web_design/design-system/DS_03_COMPONENTS.md §4.3`（表格样式单一源）；守卫 `ui-control-system-guard::V9`。

## D-828 2026-11-01 — 可点行状态柔和化

> **评议 → 裁定 → 落点**：可点行用 `--surface-hover`（neutral-200）灰底，灰显得脏且与静态行难分 → 行取 `--radius-sm`（8px）；hover 底改 `--app-accent-tint`（主题 10%），灰底只承担静态分隔；3px 主题左条改 `::before` ＋ `opacity` 过渡（`--transition-fast`）；`:active` 用 `--app-accent-active-bg`；焦点环 `outline-offset:-2px` 压在行内随圆角走；删除死类 `list-row--selected` → `DS_04 §5.2` ＋ `DS_03 §12.15 SD-43`；守卫 `hover-state-guard::H11`（`H2` 放行装饰伪元素 opacity）。

## D-829 2026-11-01 — 嵌入视图不再套卡

> **评议 → 裁定 → 落点**：知情查看里出现「卡套卡」与双卡头 → `workgroup-view.js` / `taskforce-view.js` 新增 `embedded` 形态，嵌入时不渲染自身 `div.card` 与卡头；`insight-view.js` 对其他党小组区去掉 `card` 外层并向两者传 `embedded: true`；真机 `#secretary-insight-card .card = 0`、卡头只剩 1 个 → `docs/src/components/record/{workgroup-view,taskforce-view,insight-view}.js`；守卫 `card-summary-hero-guard::G4`。

## D-830 2026-11-01 — `section` 语义两条硬判据

> **评议 → 裁定 → 落点**：全站 `section` 既有无名也有嵌套，读屏 `region` 与视觉分区不一致 → `section` 必须有可访问名称（`aria-label` 或指向存在 id 的 `aria-labelledby`）、同页不得嵌套；`div` 管布局、`article` 管独立记录、`aside` 管次要信息；本轮只收两条硬判据、不重排既有 59 处分区 → `DS_03 §12.15 SD-55`；守卫 `a11y-tree::A10`。

## D-831 2026-11-01 — 只读由权限派生

> **评议 → 裁定 → 落点**：4 处卡头写死「· 只读」，换角色不跟随 → 新增 `core/domain/view-capability.js`（`RESOURCE_WRITE_ROLES` / `canWriteResource` / `readonlyMeta`），4 处文案改为派生；未登记的 kind（如知情查看）恒只读；角色键只取 `constants.js::ROLE_KEYS` → `docs/src/core/domain/view-capability.js` ＋ 四个 record 组件；守卫 `frontend-foundations-guard::F12`。

## D-832 2026-11-01 — 指标 / 状态与动作 / 导航分色

> **评议 → 裁定 → 落点**：全局概览几乎全是主题色，功能色没起注意力引导作用 → 指标与状态（待答复 / 待赋权 / 待归档 / 待补课 / 待汇报 / 组员汇报 / 逾期）改用功能色文字档，纯计数用 `--neutral-800`；动作 / 导航 / 选中态仍用主题色 → `DS_01 §2.10`（`work-overview.js::METRIC_TONE` ＋ `overview-dispatch-bar.js` 待答复条）；守卫 `ui-color-semantics::C6–C8`。

## D-833 2026-11-01 — 输入控件单一源

> **评议 → 裁定 → 落点**：裸 `<input class="input-flat">` 散落各页、绕开组件 → `form-field.js` 新增布局中立 `textInput` / `selectInput` 并经 `forms.js` 对外；新代码不得直接写裸控件，存量按 `style-baseline.mjs::RAW_INPUT_BASELINE` 逐文件只减不增（首批迁 5 文件，全站 251→192 处 / 58→57 文件）→ `DS_03 §12.15 SD-56`；守卫 `field-shell-guard::R1–R3`。

## D-834 2026-11-01 — 搜索框收窄

> **评议 → 裁定 → 落点**：独占一行的搜索框被 `flex: 1 1 160px` 拉满整卡 → `.lf-kw` 改 `flex: 0 1 var(--lf-kw-max, 320px)`（≤320px，可逐处覆盖），≤640px 满宽 → `docs/src/styles.css` 的 `.lf-kw` 段；守卫 `field-shell-guard::R1–R3`（输入单一源同批）。

## D-835 2026-11-01 — 关键词自动补全用原生 `datalist`

> **评议 → 裁定 → 落点**：筛选关键词没有补全、反复手输 → `list-filter.js` 支持 `keyword.suggestions`（数组或 `(rows) => string[]`），生成原生 `<datalist>`（去重、截断 50 条），工作组 / 专班已接入；不引第三方库 → `docs/src/components/ui/list-filter.js`；判据并入 `DS_03 §12.15 SD-56`。

## D-836 2026-11-01 — 待办跳转只经动作表与统一导航

> **评议 → 裁定 → 落点**：6 个 `todo-tab.js` 各自维护 tabMap、直点 DOM 页签按钮或写死 `workspace/*.html?tab=` → 新增 `core/domain/todo-actions.js`（`TODO_ACTIONS` ＋ `resolveTodoAction`，actionKey 优先、actionType 兜底、roleOverrides / scopeOverrides）与 `core/session/workspace-nav.js::goToWorkspaceTab`（只认 `data-ws-tab-btn`，可写 `PendingTarget`）；按钮文案由动作表派生 → `docs/src/core/domain/todo-actions.js` ＋ `docs/src/core/session/workspace-nav.js`；守卫 `tab-nav::G1–G4`。

## D-837 2026-11-02 — 页签覆盖口径改用 45 catalog

> **评议 → 裁定 → 落点**：`workbench-audit-coverage` 仍钉 2026-10 的 67 页签旧台账，而现行注册表是 45 页签 → 支书裁定「直接改用新口径」：旧 67 台账只作归档存在（W5），现行覆盖改由 `catalog.mjs`（45 键 ≡ capabilities ≡ `TAB_BLOCK_BASELINE`）＋ `endpoint-map.mjs` 承担（W1–W4）→ `server/test/workbench-audit-coverage.test.mjs`；审计资产 `server/scripts/audit-tabs.mjs` ＋ `audit/*`。

## D-838 2026-11-02 — F1 以基线登记为准

> **评议 → 裁定 → 落点**：F1 若直接用 DOM measured 判红，会因条件块显隐与同构列表变化误报 → F1 只认 `TAB_BLOCK_BASELINE` 的非空 `reason`：>4 且已登记记 `exception`，`reason` 为空才判 P1；DOM measured 仅作复核线索，不参与红绿 → `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md` §2.3 / §5、`DS_06 §五`。

## D-839 2026-11-02 — 破坏性 CRUD 不在共享库真删

> **评议 → 裁定 → 落点**：解散 / 归档 / 删除活动若在演示库真删会污染数据 → C2 默认在 `:memory:` 临时库做 create → 回读 → PATCH → 校验 → DELETE；破坏性流程只做软回滚或静态写门证明，报告记 `exception` ＋ `reason`；`--base` 连共享服务时 C2 自动 `skip`（原因 `shared-db`）→ `server/scripts/audit/checks-crud.mjs`、`endpoint-map.mjs`、`TAB_AUDIT_PLAYBOOK.md` §2.3 / §八。

## D-840 2026-11-02 — `requireAuth` 系统性风险记 exception

> **评议 → 裁定 → 落点**：C1 探针在 `disc.attendance` / `leader.attendance` / `org.taskforce` 三处命中 `PATCH /api/v1/signups/:id` 仅 `requireAuth`，visitor 可写 → 这是跨页签的系统性风险，按页签重复计 P0 只会放大噪声；统一记 `exception` 并回链 `ENGINEERING_ASSESSMENT` 阻断风险 2，修复仍按服务端写权限专项排 → `server/scripts/audit/severity.mjs`、`TAB_AUDIT_PLAYBOOK.md` §2.3、`GUARD_INVENTORY §十五`。

## D-841 2026-11-02 — 六维重评（批次 526）

> **评议 → 裁定 → 落点**：支书 2026-11-02 裁定本轮重打六维，证据为本轮 45 页签审计 + 既有测试 / 权限 / 部署证据；**不因「做了工具」自动加分**。
> - **测试与发布质量 78 → 80（+2）**：catalog 守卫（45 键 ≡ capabilities ≡ baseline）＋ 内存库 CRUD 往返 ＋ 最终 P0/P1=0 补上了「页签 → 读 / 写口 → 权限门」的常驻覆盖空白；审计脚本不进 `test:daily`，故只加 2 分。
> - **业务与数据正确性 78 → 78**：D1/D2 对账（roster 50）与 C2 往返证明现有主流程正确，未发现新的业务缺陷；不加分。
> - **安全与权限 52 → 52**：C1 只再次证实 3 个 `requireAuth` 例外，未放宽任何门、未补写权限；不加分。
> - **最小三成本体验（含前端与交互） 68 → 68**：F1–F8 全绿与局部 aria / section / 死入口修复不足以证明三成本实质下降；41 页签未重构；不加分。
> - **架构与可维护性 74 → 74**：审计分层与单一源是正面证据，但与 `page-sweep` / `module-load` / `a11y-tree` 部分重叠，未降低跨层变更成本；不加分。
> - **运行、部署与跨组织复用 62 → 62**：本轮无部署 / 多支部新证据（**证据不足**），维持原分。
> - 阻断风险逐条复核：5 条全部保留，无闭环、无新增（证据见 `.ctx/ENGINEERING_ASSESSMENT.md` §一）。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 / §5.2。

## D-842 2026-11-02 — 审计简并：audit 只做报告层

> **评议 → 裁定 → 落点**：`page-sweep` / `module-load` / `a11y-tree` / `audit-tabs` 四处都能判「分页 / H2 / 权限」，改一处口径要改四个脚本 → 支书裁定「audit 只做报告层、不替代 daily 门禁」，把四类漂移口径收进唯一表：F2 只判控件行数 ≤2、F4 只认 H2 恰 1、F7 统一 `hasPager()`、C1 `requireAuth` 写口记 exception；daily 的既有断言保留、不删 → `content/05_ai_coding/AUDIT_CANON.md` ＋ `server/scripts/audit/{checks-front,dom-probe,checks-data}.mjs`。

## D-843 2026-11-02 — M1–M3 与「独立对象池」例外

> **评议 → 裁定 → 落点**：信息经济只有 F1–F8 的版面判据，重复卡头与多条筛选条无人管 → 新增 M1（顶层块 >4 须有 `TAB_BLOCK_BASELINE` 理由）、M2（同页 H3 文本重复 ≥2）、M3（同页 `.lf-bar` >1）；4 个双列表页签（`org.talent` / `disc.review` / `disc.inspection` / `leader.members`）两个列表各自独立、不可合并，登记为「独立对象池」例外而不删规则 → `server/scripts/audit/checks-economy.mjs` ＋ `economy-exceptions.mjs`。

## D-844 2026-11-02 — 数据契约 47 表单一源

> **评议 → 裁定 → 落点**：换轨前无法机器判定「库结构 ≡ 功能实际」，mock 与 API 两种形态的字段漂移只能靠人记 → 建 `server/data/domain-contract.mjs`（47 表：34 资源 + 7 语义 + 6 工作组；`required` / `enums` / `seedCount` / `aliases` / `deprecated`）＋ fixtures ＋ `data-contract.test.mjs`；人为读版落 `content/04_web_design/data/DATA_CONTRACT.md`；parity 口径为值对照 26 表、结构 41 表。保留 JSON 宽表、不做列规范化 → `server/data/domain-contract.mjs`、`server/test/data-contract.test.mjs`、`content/04_web_design/data/DATA_CONTRACT.md`。

## D-845 2026-11-02 — 换轨管线与拒绝降级

> **评议 → 裁定 → 落点**：部署在即，数据换轨没有可演练、可回滚的单一入口 → `export-all`（48 表 ＋ `manifest.json`：schemaVersion / 行数 / sha256）、`import-all`（默认 dry-run、`--apply` 单事务、版本与 id 冲突校验、契约 required / enums）、`preflight-cutover`（版本 / 空库 / 基线账号 / 演示残留 / 孤儿外键 / 附件一致性）；`db.js` 迁移前自动备份、`user_version > SCHEMA_VERSION` 拒绝启动；副本演练 48 表 / 542 行逐表行数与 sha256 一致，preflight exit 0 → `server/scripts/{export-all,import-all,preflight-cutover}.mjs`、`server/db.js`、`deploy/CUTOVER_RUNBOOK.md`。

## D-846 2026-11-02 — 六维重评（批次 527）

> **评议 → 裁定 → 落点**：支书 2026-11-02 裁定按本批证据重打六维，证据为审计简并、数据契约与换轨演练；**不因「写了脚本」自动加分**。
> - **运行、部署与跨组织复用 62 → 68（+6）**：换轨从「有文档」变成「可演练、可回滚、可拒绝降级」——48 表 / 542 行 export → dry-run → apply 一致，preflight exit 0，迁移前备份与降级拒绝均实测；单实例多支部硬边界不变，故只加 6 分。
> - **最小三成本体验 68 → 68**：P2 4→3、exception 47，M1–M3 补了信息经济判据，但 41 页签仍未重构、无用户实测；不加分。
> - **测试与发布质量 80 → 80**：`data-contract` 6 条进 daily、audit 仍不进 daily；覆盖形态有增、发布时长未降；不加分。
> - **业务与数据正确性 78 → 78**、**安全与权限 52 → 52**、**架构与可维护性 74 → 74**：契约与分层是正面证据，但 JSON 宽表、通用写口、跨层同批维护三项残项未变；不加分。
> - 阻断风险逐条复核：5 条全部保留，无闭环、无新增（离轨相关的新增边界记入 §一 残项，不升级为阻断项）。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 / §5.2。

## D-847 2026-11-03 — 写权限单一源：权限矩阵

> **评议 → 裁定 → 落点**：审计按「中间件是不是 `requireAuth`」判越权，误伤 `signups` 这类 handler 级 guard → 建 `server/security/write-policy-matrix.mjs`（141 行：135 enforced / 4 self-service / 2 public / 0 known-risk），守卫断言 Express 运行期写路由 ≡ 矩阵；C1 改为矩阵判定 + 高风险抽样，`--probe-writes` 才逐口重探 → `server/security/write-policy-matrix.mjs`、`server/test/write-policy-matrix.test.mjs`、`server/scripts/audit/checks-crud.mjs`、`AUDIT_CANON.md`。

## D-848 2026-11-03 — 会话 3 小时过期与两档运行形态

> **评议 → 裁定 → 落点**：支书 2026-11-03 裁定「改成 3 个小时过期」→ `SESSION_TTL_HOURS` 缺省 3（旧 `SESSION_TTL_DAYS` 兼容换算），过期 token 在 `/auth/me` 与受保护写口 401 并删除会话行；production 档缺口令 / 多支部拒绝启动；新增 `npm run start:review` 缺省使用 `server/data.review.db`，视觉检验不写生产库 → `server/routes/auth.js`、`server/run-mode.js`、`server/scripts/start-review.mjs`、`deploy/env.production.example`。

## D-849 2026-11-03 — 多支部同实例设计稿

> **评议 → 裁定 → 落点**：支书要求「服务端要考虑多支部情况，需要有所设计」→ 设计四阶段（读口统一过滤 / 快照按支部 / 党委跨支部显式范围 / 索引），上线仍坚持一实例一支部，Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH` → `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`；`server/run-mode.js` 拒绝文案回链该节。

## D-850 2026-11-03 — 上线残项单一台账

> **评议 → 裁定 → 落点**：审计 / 换轨 / 部署 / 前端残项分散在多处 → 归总为 `L-01`…`L-21`（launch-blocker / post-launch / backlog 三档）；本批关闭 L-01/L-03/L-04/L-05/L-06/L-07，L-02 降级为 post-launch（Linux 真机未验）→ `.ctx/ENGINEERING_ASSESSMENT.md §四「上线残项」`。

## D-851 2026-11-03 — 六维重评（上线专项）

> **评议 → 裁定 → 落点**：按本批证据逐维重打，不因「写了工具」自动加分。
> - **业务与数据 78 → 79（+1）**：契约漂移修正 + 48 表 / 577 行往返一致。
> - **安全与权限 52 → 66（+14）**：矩阵 141 行 / 0 known-risk + 6 条缺口修复 + 3 小时会话 + 快照 P0；多支部读过滤仍未实现，故不到 70。
> - **最小三成本 68 → 68**：P2 3→2、exception 47→44，但无实质 UI 重构与用户实测。
> - **测试与发布 80 → 83（+3）**：矩阵 / 红队 / 缺口 / 会话 / 运行档五组测试进 daily。
> - **架构与可维护 74 → 76（+2）**：权限判据单源化，但新增同批维护点。
> - **运行部署 68 → 73（+5）**：严格 preflight exit 0 + 两档运行 + review 隔离；install/update 未真机验证。
> - 阻断风险：第 2 条部分闭环、第 4 条会话过期闭环、其余保留。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md §一 / §二 / §5.2`。

## D-852 2026-11-03 — `.ctx` 三层与 Active Context 预算

> **评议 → 裁定 → 落点**：支书批「`.ctx` 内容多、权责边界不清、更新频率不一致，容易污染上下文；但也有很多可复用资产」→ 裁定 **`.ctx` 是仓库、不是 active context**：新增 `.ctx/ACTIVE_CONTEXT.md` 作为唯一热投影（≤300 行 / 30KB）；规则 / 判例 / 方法正文先进 `content/01–05`，`.ctx/ACTIVE_RULINGS.md` 只留跨域摘要 + 16 领域索引；`SNAPSHOT` 删除批次小结、改由 `EXECUTION_LOG_INDEX` 承接；`ENGINEERING_ASSESSMENT` / `REVIEW_QUEUE` 标 `reference`；`ACTIVE_RULINGS` / `SNAPSHOT` 路径不移动（分别约 44 / 93 处引用）→ `.ctx/ACTIVE_CONTEXT.md`、`.ctx/README.md`、`.ctx/AGENTS.md`、`CLAUDE.md H26.4`、`content/05_ai_coding/{CONTEXT_MANAGEMENT,DOCUMENT_GOVERNANCE}.md`；守卫 `ctx-hygiene-guard::⑤–⑦`、`docs-governance-guard::G6`、`doc-consistency::S14/S15`。

## D-853 2026-11-03 — CLAUDE 宪法化与乙部清账

> **评议 → 裁定 → 落点**：支书批「乙部膨胀；甲部引用框太多、大多是沿革；CLAUDE 形成于 AI 不强的时期，应按最前沿 prompt / context engineering 重做」→ 裁定 **CLAUDE＝宪法 + 路由**：规则写正文祈使句；历史进 logs；细则进 content/05；甲部引用框 ≤15（只留「原话即规则」与守卫锚点）；乙部只留 ≤12 行真任务（假任务 / 冻结件 / 已完成删除，真任务排 530–532）；丙部只留 4 条真待裁；目标 ≤600 行 / 85KB（实际 197 行 / 17.5KB，10 个引用框）。不删除 H 编号与守卫锚点（H21/H21.3/H40.2/H20.2/H20.3/评议待办节头/批次 521 五编句）→ `CLAUDE.md`、`content/05_ai_coding/{CONTEXT_MANAGEMENT,DOCUMENT_GOVERNANCE,PARALLEL_SKILL_AUDIT,REVIEW_AND_EXPRESSION}.md`；守卫 `ctx-hygiene-guard::⑧–⑨`、`doc-consistency` R 表、`claude-parallel-audit`、`ia-critical-guard`、`ui-preflight-context`。

## D-854 2026-11-03 — 丙部四项裁定

> **评议 → 裁定 → 落点**（支书 grill-me 后裁定）：
> - **B-502-5 旧 token / 旧链接**：不做兼容跳转；账号改名同一事务内**删除旧会话**，旧 token 一律 401；旧书签带旧学号时按 404 处理并提示重新登录。落 `server/routes/member.js`（`DELETE FROM sessions` + `sessionsInvalidated:true`）、`server/test/account-rename.test.mjs`。
> - **B-519-3 成功色文字档**：`--status-success-text` 已存在（DS_01 §2.4），不新增；关闭。
> - **B-521-1 SD 判据表**：维持 `CASES` 迁移登记，不回迁 `DS_03 §12`；`DS_03 §12.6` 已是指针，避免双源。
> - **B-522-1 低密度卡**：先收拢「今天 / 归档」重复卡与空白区，不先补内容；用 `density-audit.json` 复测；排入批次 532。

## D-855 2026-11-04 — 乙部余项合并批与长期项收口

> **评议 → 裁定 → 落点**（支书 grill-me 四问后裁定，本批合并为批次 533）：
> - **B-500-7 待办派生服务端化**：先做**最小 Plan B**（服务端只读派生端点 + 客户端切读 + 兼容降级）；**完整 Plan B 的阶段门槛必须登记在乙部**（`B-500-7b`：七类 unsupported 组服务端化 → 纯函数抽零依赖叶子件 → 客户端本地派生摘除 → 读面前置解耦 → 缓存/性能）。落 `server/routes/todo-groups.js`、`docs/src/data/api-adapter.js`、`docs/src/components/record/todo-tab-shell.js`、`CLAUDE.md 乙部`。
> - **B-500-1 第五轮 P2/P3**：**全量对账**——逐条对现行代码机检，仍命中的修掉，已消失的留证据；本批关账。
> - **B-515-6 真缺陷与 e2e**：**9 条 precommit e2e 必须全部跑通**，不得留到发布前；4 条真缺陷中 2 条经探针证伪（写链已改资源 API / 权限判据已含 `deputy-leader`），向导校验与待批复种子补齐。
> - **B-515-5 / B-522-2 长期棘轮**：各迁一批（`text-xs` 23 处 · help.html 532 → 167 处），同批建 / 收紧守卫棘轮（`TEXT_XS_BASELINE`、help.html 从 `allowNew` 改 `false`），两条转持续任务 `C-5` 并移出乙部。
> - 判据 / 落点：`CLAUDE.md 乙部`、`server/test/type-scale-guard.test.mjs::Q6`、`server/test/hex-hardcode-guard.test.mjs::H7`、`content/04_web_design/design-system/DS_02_TYPE_AND_SIZE.md §3.2.2`。

## D-856 2026-11-04 — 界面信号统一、颜色单一权威与完整 Plan B 一期

> **评议 → 裁定 → 落点**（支书四轮 grill 后裁定，批次 536）：
> - **左条**：删除所有状态型 / 装饰型左侧强调条（hover、选中、当前、状态、提示、装饰）；身份与品牌改圆点 / 徽章，引述改全框 / 底色；只留 1px 结构边。落 `DS_03` SD-25 / §12.11 / §4.2、`DS_04 §5.2`、`UI_REVIEW_CHECKLIST ③-3`、`CASES` CASE-DESIGN-033；守卫 `hover-state-guard::H11`、`ui-control-system-guard::V7`、`ui-contrast-guard::K6` 改判「不得再有状态左条」。
> - **焦点**：沿用 SD-27 / DS_04 §5.7 单环（2px 实线、仅键盘触发、`box-shadow:none`），**不加宽、不收窄、不新增双层环 / 光晕 / 边框叠加**；输入族保持「只变边框」现状。回潮由 `FOCUS-1…5` / `ui-focus-ring::F1–F6` 守住。
> - **颜色**：`styles.css` 为唯一权威；`constants.js` / `tailwind-config.js` 做受守卫镜像（T12/T13 逐值相等）；`about.css` 从 `allowNew` 改 `false`（内容不动）；渲染层彩色 `rgba()` 清零；help 内联徽标改文档页类；`btn-action` / toast 用专用令牌（暗色不覆写，保持浅底深字）。顶栏「写入活动」实底 CTA 按 V-3 保持。
> - **完整 Plan B**：7 类实时组全部服务端化；测试先行＝先用客户端结果做标准答案、再逐字段对账、再加双支部夹具；服务端为默认源，客户端只留展示派生，失败兜底不得生成新业务事实。`B-500-7b-1` 已完成，`B-500-7b-2` 前置已达、**不以上线为前提**。
> - **数据分层**：`CLAUDE.md H32` 增补「服务端算业务事实 / 客户端算展示派生 / 兜底不得生成新事实」。

## D-857 2026-11-07 — CLAUDE 三层恢复、通知受众 fail-closed 与 SD-60 行动行

> **评议 → 裁定 → 落点**（支书 `/plan` 三项要求后裁定，批次 535）：
> - **CLAUDE 三层**：温层从 0 行恢复为「触发式任务表 + H60–H80」；热层 H10–H50、冷层 H90–H100；乙部删除批次历史叙述，完成项整行删除。守卫新增层边界、温层 3–60 行、乙部 ≤18 行且无「已核实完成 / 已清出」、触发表指针 `existsSync`。落 `CLAUDE.md`、`server/test/ctx-hygiene-guard.test.mjs`、`server/test/claude-parallel-audit.test.mjs::C4`、`server/test/ui-preflight-context.test.mjs::P5`。
> - **通知受众 fail-closed**：系统通知无受众＝不可读；广播必须显式 `audience:['all']`；未登录一律不可读；`project-auth-granted` 定向到被赋权人且授权人姓名由服务端按名册复算；存量迁移标 `legacyUnscoped`。落 `docs/src/services/governance/notice.js`、`server/system-notice-kinds.js`、`server/routes/system-notices.js`、`server/scripts/migrate-notice-audience.mjs`、`server/test/notice-audience-failclosed.test.mjs`。
> - **UI 行动行**：SD-60 四类排布（长组件伸缩 / 多短按钮 / 单枚低价值 / 筛选条），`.card-head` ≥641 不换行、标题让位、aside 不拆组；新增 `action-row-wrap-guard`。落 `DS_06 §二`、`DS_03 §4.2`、`docs/src/styles.css`、`CASE-DESIGN-034`。
> - **未登录公共入口**：只研究不改；三方向（A 最小收紧 / B 学院级入口 / C 公共门户）落 `content/04_web_design/evolution/PUBLIC_ENTRANCE.md`，进丙部 V-11 待裁。

## D-858 2026-11-08 — 党委内容域与公共门厅

> **评议 → 裁定 → 落点**（V-11 三方向比选后，支书裁定取 B 学院级公共门厅并同时立党委内容域，批次 536）：
> - **读面**：未登录只看党委公开内容——党委公开通知全文、党委公开活动摘要、公开资料（列表 / 详情 / 下载）与登录入口；登录后看党委与支部并集。党委组织员获得活动写入、下发、公开与多域写权。
> - **数据边界**：党委内容与支部内容同表，以 `ownerScope='committee'` ＋ `branchId='pc-gsm'` 标识；下发目标支部写 `['all']` 或支部 id。支部侧生成副本，副本只改执行字段（时间 / 地点 / 组织者 / 考勤），与原件手动同步，不自动回写；本支部已有副本时，支部列表隐藏党委原件。
> - **公开边界**：`publishScope` 三档（`branch` / `login` / `public`）；`public` 只归党委，必须有未来有效期，撤下与过期一律 fail-closed（匿名接口 404）；公开、撤下、有效期变更与匿名下载写入 `publication_audits` 留痕。
> - **通知与名册**：党委下发到支部的通知限支部内可见，同文重复下发按 24 小时限频；党委可导入支部名册、接收支部上报与提案，处置仍在支部侧。
> - **品牌**：未登录门厅品牌为党徽 ＋「光华管理学院党建平台」，不出现具体支部名、成员姓名、统计卡与工作组。
> - **未选方案**：A 最小收紧（无法承载公开内容）、C 公共门户（超出当前需求）；多支部 Phase 3–4 不以上线为前提，`ALLOW_MULTI_BRANCH` 保持关闭。
> - **落点**：`server/routes/resources/semantic-routes.js`（党委内容语义端点）、`server/routes/resources/branch-scope.js`、`server/routes/public-portal.js`、`server/routes/resources/publication-audit.js`、`docs/index.html`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md §9a.1`、`content/04_web_design/evolution/PUBLIC_ENTRANCE.md`、`content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`。

## D-859 2026-11-08 — 测试瘦身：结果优先、守卫按需

> **评议 → 裁定 → 落点**（支书 2026-11-08 补充裁定第 3 条，批次 537）：
> - **问题**：`test:daily` 已胀到 255 文件 / 1872 断言 / 约 150s，且**结论与过程混跑**——改一个样式要等全部静态守卫与域回归；同时 `server/package.json` 的 `test:daily` 显式清单长 8518 字符，超过 Windows 命令行 8191 上限，Linux 也因 `set X=1&&` 语法不能跑。
> - **裁定**：测试目的＝**暴露结果错误**；结果正确时不检查过程，结果错误时才按需看过程 ⇒ 四层：`daily` 只留**结果门禁**（权限 / 会话 / 数据契约与迁移 / 核心业务结果 / 构建可运行），`guards` 收**静态守卫**（样式 / 字号 / 颜色 / 动效 / 结构 / 文案 / 文档 / 行号 / 页签密度）按需跑，`precommit`＝daily＋guards＋非核心域回归＋e2e，`weekly` 留慢速普查。**不删任何测试文件或断言**，只改分层与触发方式；precommit / full 仍覆盖全部文件。
> - **读数**：daily 255 → **43 文件 / 294 断言**；guards **93 文件 / 759 断言**；precommit 158 文件（含 38 个 e2e）；weekly 2。daily 墙钟实测 **≈123s（并发 4）/ ≈148s（并发 8）**——**未达 ≤60s**：43 文件串行成本约 500s（bcrypt ＋ SQLite / uploads 写盘），并发不再线性加速；压到 60s 需砍到约 20 个文件，会丢登录 / 权限 / 迁移门禁，故保留覆盖并把差距计入 README。后续提速方向＝降测试内固定成本（共享 bootstrap 夹具 / 测试档降 bcrypt 轮数），不是删判据。
> - **未选方案**：① 继续把守卫留在 daily（改样式即等全量，违背「过程按需」）；② 直接删守卫 / 降 `skip`（丢判据，违反 H25）；③ 只把 daily 压到约 20 个文件换 60 秒（丢登录 / 权限 / 迁移结果门禁）。三条均不取。
> - **落点**：`server/test-tier-registry.mjs`（四层 ＋ 四个预算常量）、`server/scripts/{tier-runner,run-daily,run-guards,run-precommit,run-changed}.mjs`、`server/package.json`（`test:daily` / `test:guards` / `test:precommit` / `test:changed`，去掉 `set X=1&&`）、`server/test/test-tier-guard.test.mjs`（T1/T3/T4/T5）、`server/test/doc-consistency.test.mjs::S16`、`server/test/contract-doc-guard.test.mjs`（新增）、`server/test/test-isolation-guard.test.mjs::I1`、四个自查登记守卫（`claude-parallel-audit::C7` / `container-width-guard::C5` / `lf-bar-structure-guard::L5` / `roster-filter-guard::R5`）、`CLAUDE.md H25`、`server/README.md`、`README-server.md`、`server/AGENTS.md`、`server/test/AGENTS.md`。

## D-860 2026-11-08 — 测试瘦身二阶段与安全 / 体验 / 部署梯度

> **评议 → 裁定 → 落点**（支书要求「评分必须带证据卡、未达证据的检查点不加分」，批次 538；只改评分子本与台账，不改代码）：
> - **测试（83 → 85）**：daily **27 文件 / 207 断言 / 60.9s** 全绿，guards **99 文件 / 791 tests / 96.1s** 全绿；四层 runner 按 `test-tier-registry.mjs` 单一源执行，CI `daily.yml` 接 `test:daily` 与 `deploy-verify`。补的是「分层 runner 可复跑 + 结果门禁达时」。
> - **安全（66 → 78）**：B / E / G 三批证据——`security-hardening` 8/8（G4 名册提案复核 / G5 副本同步复核 / L-09 派发位 403 / v14 生成列与索引 / 读口分页 / 公共下载限频 429）、`multi-branch-read-filter` 9 组、`personal-password` 21/21、上传门党委 201 / 普通成员 403。共享口令仍作回退保留；`ALLOW_MULTI_BRANCH` 仍关闭。
> - **体验（68 → 74）**：C 波 2 条 B 项 ＋ 院级内容动作收敛 ＋ 下发通知空态；F 波 5 个 C 页签 IA 三问出结论（1 归档为 A、4 保留改 CTA）；H 波 5 个用户任务在 1440 / 390 双档 PASS，同批修复 `branch-doc` 与 `references` 院级过滤。**75 暂不授予**：用户任务为自动走查、未获真人签收；未登录资料查询页仍只给登录提示。
> - **部署（73 → 74）**：`deploy/verify-linux.sh` 本地 Git Bash 5/6（`bash -n` / `doctor` / `smoke` / `preflight` 过；`package` 因 msys `tar` 失败），PowerShell `package` 断言过；CI 增 `deploy-verify` job。**75 暂不授予**：CI job 未实跑绿、`package` 在 msys `tar` 未过；**80 需真机**。
> - **业务 79 → 80**：G4 / G5 写入前复核 + v14 审计索引 + 党委公开通知写口。**架构 76 → 77**：契约类落地 + registry runner 单源；行号 / 版本戳维护成本仍在。
> - **未选方案**：① 按「功能已做完」直接给体验 75 / 部署 75（违反「未达证据不加分」）；② 把自动走查记作真人签收（证据不成立）；③ 把 CI job 已配置记作已跑绿。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 用户任务走查 PASS 即等于体验达标，可给 75 | 走查是自动取证，真人签收才算体验验收；未登录资料查询页 GAP 未闭不加分 | 证据强度高估（自动 → 人工） | 加分必须写清证据类型；自动走查只能作下限，不得替代真人签收 |
| CI job 已配置即等于部署可验证 | 未实跑绿、`package` 未过即证据不成立 | 配置 ≠ 运行结果 | 部署类加分只认「本机 / CI 实跑读数」，配置只登记不记分 |
| 测试文件减少即等于测试变强 | 分层只改「哪一层跑」，覆盖不减；加分来自结果门禁达时与 runner 单源 | 手段 ≠ 判据 | 测试类加分按「结果门禁读数 + 覆盖未减」计，不按文件数计 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / §二 各维结论 / §四 L-02·L-09·L-10·L-11·L-12·L-13 / §5.2 当前值）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 538）。

## D-861 2026-11-09 — 六维评分批判性修正

> **评议 → 裁定 → 落点**（支书 2026-11-09 要求「六维分数立即修正」，批次 539 波次 S；只改 `.ctx` 台账与评估文档，不改代码 / 不改测试 / 不 commit / 不 bump）：
> - **业务 80 → 79**：D2 只对 3 个计数（`org.roster` 50 = 50、`secretary.group-progress` 3 = 3、`party-committee.branches` 1 = 1）；C2 在 46 页签 **0 pass**（34 skip / 12 exception），只有 `:memory:` 手工往返；`L-16` 表决名单服务端重算未闭。
> - **安全 78 → 77**：上传门代码 `server/routes/uploads.js:68-74` 已用 `requireUploader` 放行 `party-staff`（`security-hardening.test.mjs:304-324` 常驻断言 party-staff 201 / 普通成员 403），但 `server/security/write-policy-matrix.mjs:534-538` 仍登记 `requireCommissioner` / 支委层——唯一机读源与运行期不同批。
> - **体验 74 → 72**：H 波 5 个用户任务实为 **4/5 PASS**（任务 5 未登录资料查询只给登录提示，`R2` GAP）；`B11`（`org.talent` 录入考察沉底）未动；`R1` 台账仍写「只登记不修」，与已修代码不一致。
> - **测试 85 → 83**：daily 60.9s 来自断言 **294 → 207**（12 条域回归移出 daily）；CI `daily` / `deploy-verify` 均无实跑读数；`CLAUDE.md` 乙部 `B-500-7b-2` 仍写「daily 294 断言全绿」。
> - **架构 77 / 部署 74 维持**：本轮无新增可复跑证据。
> - **未选方案**：① 维持原分只加注（等于「已给分不回收」）；② 只调测试分、不动安全 / 体验（同批证据同源，分维口径不一致）；③ 顺手改代码 / 测试 / 版本戳把分补回来（越出「只改台账」授权）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| D2「计数对账一致」即可代表业务对账覆盖 | 只有 3 个计数被测，其余未测即未覆盖 | 抽样当全量 | 加分须写明样本量；「对账一致」必须给分母 |
| C2 在 `:memory:` 手工往返一次即写口已覆盖 | 46 页签 C2 0 pass（skip / exception），不能算日常门禁 | 一次性手工当常驻 | 写口覆盖只认常驻 tier 内的 pass，skip / exception 不计 |
| 测试断言减少但时长达标即测试变强 | 60.9s 是覆盖变窄换来的，须同报移出清单 | 手段当判据 | 时长与覆盖必须成对报，只报其一不得加分 |
| 上传门代码改了即安全口径已对齐 | 矩阵仍是唯一机读源，代码先行、矩阵未改即单源破裂 | 实现当权威 | 权限类加减分以「矩阵 ≡ 运行期门」为准，代码先行不算 |
| 自动走查 4/5 可记作 5 个任务全部 PASS | 未登录资料查询 GAP 未闭；自动走查不能替代真人签收 | 证据强度高估 | 体验验收按「任务分母 + 未闭 GAP + 签收人」三项计 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / §二 2.1·2.2·2.3·2.5 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md`、`.ctx/evidence/2026-11-08/user-task-test.md`（R1 改准）、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-862 2026-11-09 — 批次 539：待办计算化 + 分工页美学 + 体验 / 部署提分

> **评议 → 裁定 → 落点**（支书 2026-11-09 要求「更新批次 539 最终评分与台账」；只改 `.ctx` 台账与 `CLAUDE.md` 乙部读数，不改代码 / 不 commit / 不 bump）：
> - **业务 79 → 80**：待办「P0 漏提醒」修复——组织委员前置门由「有待办行」改「有成员发展数据」，空 `todos` 库不再吞发展节点 / 半年考察提醒；发展节点 / 半年考察 / 模块周期三类派生迁入 `todo-derive.js` 单一源（`server/routes/todo-groups.js` 删掉约 130 行复刻）；纪检「考勤 / 考察待确认」改由服务端派生（11 类组全同源）；`count === items.length` 成为唯一计数口径（议程派生行另计 `agendaCount`）；演示单据种子行（`todo_seed_*` / `mc-seed-*` / `mcr-seed-*`）纳入 `server/demo-data-guard.js` 的生产演示数据门。**81 不授予**：D2 / C2 覆盖未扩、`L-16` 表决名单重算未闭。
> - **安全维持 77**：`server/security/write-policy-matrix.mjs:534-536` 把 `POST /api/v1/uploads` 登记为 `requireAuth + (party-staff | requireCommissioner)` / `roleGate: 支委层或 party-staff`，唯一机读源与运行期 `requireUploader` 同批一致，补上 `D-861` 的失分项；但多支部读过滤未接线、`ALLOW_MULTI_BRANCH` 仍关闭，**78 不授予**。
> - **体验 72 → 77**：`secretary.work-map` 责任关系由主从两栏改单列对象列表（14 项逐行摊平、行载体走 `list-row.js`、≤640 展开整段说明）；`R2` 未登录资料查询接入匿名门厅读口（`references.js` → `loadPublicPortal`，含匿名下载 / 失败重试 / 「去登录」附注），补上 `D-861` 的 GAP；IA 三条（`party-committee.dispatch` / `leader.write` / `org.member-flow`）落结论；`disc.review` 复盘页动作收敛。**未做**：5 个 B 中 `party-committee.branches` 因既有契约（目录只创建 / 选择）回退。**78 不授予**：真人签收未完成（自动走查 ＋ 截图不计验收）。
> - **测试维持 83**：daily **27 文件 / 210 断言 / 63.5s**、guards **99 文件全绿**；断言 207 → 210 为待办 P0 回归净增，覆盖未缩；`CLAUDE.md` 乙部 `B-500-7b-2` 的「daily 294 断言」同批改准为「daily 210 断言（结果门禁）」。**CI 未实跑，84 不授予**。
> - **架构维持 77**：11 类待办派生收成 `todo-derive.js` 单源；行号 / 版本戳维护成本未降。
> - **部署 74 → 76**：`deploy/package.mjs:269-273` 改在 `OUT_DIR` 下用相对文件名调 `tar`、`deploy/verify-linux.sh:42-48` 用 `cygpath -u` 转 POSIX（修 msys 把 `D:` 当远程主机）；`VERIFY_TMPDIR=D:\…\.tmp` 下 **6/6 · 退出码 0**（语法 3/3 · doctor · 起服务 · smoke --login · preflight strict 阻断 0 / 警告 0 · package 460 文件 / 12.9 MB / 断言 0 命中），PowerShell 侧 package 回归退出 0。**77 / 80 不授予**：GitHub Actions `deploy-verify` 未实跑、真机 `install` / `update` 未验（`L-02`）。
> - **未选方案**：① 把「自动走查 + 截图」记作真人签收换体验 78（证据强度不足）；② 把 `verify-linux` 6/6 记作 CI 已绿、部署给 77（本机无 `gh`、本批不推送）；③ 越过「目录只创建 / 选择」契约强改 `party-committee.branches`（改 IA 契约须先裁定）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 待办提醒有服务端组即覆盖完整 | 前置门以「有待办行」为条件会吞掉提醒，须按业务数据判 | 前置条件当业务判据 | 派生组的启用门必须由业务数据决定，不得由别的派生产物决定 |
| 服务端按客户端口径复刻三类派生可接受 | 复刻即双源，改一处必漏一处；应进同一个叶子件 | 实现形态当单一源 | 派生规则只允许一份实现；双端只能 import，不得复刻 |
| 计数含派生批次行是既有口径 | 计数须等于条目数，附加行数另设字段 | 字段混用 | `count` 只数 `items`；任何附加计数必须有独立字段名 |
| verify 5/6 属环境差异、不必修 | 同一根因同时打中打包与校验两处，须同批修 | 环境归因掩盖根因 | 平台报错先定位根因；同一根因的多处调用须同批修 |
| 部署容器 6/6 等于 CI 已绿 | 未在 GitHub Actions 实跑即无读数，配置不算证据 | 本地等价当远端结果 | 部署加分只认目标环境实跑；本地等价仅作下限 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / 阻断风险注 / §二 2.1–2.6 / §四 L-02·L-12 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 539）、`.ctx/logs/EXECUTION_LOG_INDEX.md`、`.ctx/TIMESTAMPS.md`、`CLAUDE.md` 乙部 `B-500-7b-2`、`.ctx/evidence/2026-11-09/*/summary.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-863 2026-11-10 — 批次 540：前端交互契约与议程 / 表格 / 详情重设计

> **评议 → 裁定 → 落点**（支书 2026-11-10 要求「更新批次 540 判例、评分与台账」；只改文档 / 台账，不改代码、不 commit、不 bump）：
> - **前端交互契约**：待办 / 今天的一行被点后必须发生什么写成契约——每个动作键声明 `mode`（`inline` / `switch` / `direct`）、`kind`、`label` 与六台 `roleOverrides`；`switch` 未命中本台页签时 **fail-closed**（内容区给「本台无该模块」＋ 同义落点），禁 toast-only、禁静默留页、禁整页 `?tab=`。29 类动作 × 6 台已登记，`todo-jump-contract` 全绿。
> - **议程分类与待议池**：来源 → 类型（决策 / 讨论 / 同步）→ 待议池由一份纯函数算（`agenda-classify.js`，六类 ＋ 另纳入两类），客户端与服务端**同源 import**，服务端出 `GET /api/v1/committee/agenda-candidates`；`agenda-classify` 断言六类 × 四反例 × 两端逐项一致 × 双支部过滤。
> - **表格契约**：同列同语义 ≥3 行走 `renderDataTable`；列宽三档、行高 40、`colspan` 插行详情、横滚与首列吸附、列宽拖动、灰字分层；手写 `<table>` 只减不增（`table-contract-guard::T1–T7`）。
> - **详情与分工**：活动详情收为「对象头 → 信息 → 参与 → 议程 → 收口」四段，管理动作进页尾折叠；支部分工视图 4 → 2（责任关系 / 关系矩阵，「按项目」为转置故删除）。
> - **图标着色**：图标只经 `icons.js`；色值只许 `currentColor` / `none` / `var(--token)`；状态色经 `--tint` 取 `-text` 档；hex 扫描含 data-URI 的 `%23`（`icon-color-guard::G1–G5`）。`sidebar` / `person-picker` / `custom-select` / `archive-entry` 四处字面色同批收口。
> - **六维评分**：业务 **80 → 81**（议程链路同源分类，残项 `L-16` 未闭）；安全 **77**（本批不动写口与读面）；体验 **77 → 78**（跳转 / 议程 / 表格 / 详情 / 概况与分工 / SVG 六组落地，**80 不授予**：真人 5 任务签收未完成）；测试 **83 → 84**（daily 29 / 233 / 77.0s、guards 101 / 809，**85 不授予**：CI 未实跑）；架构 **77 → 78**（三份契约 ＋ 两处共享纯函数）；部署 **76**（无新增目标环境证据）。
> - **未选方案**：① 把「自动走查 ＋ 双档截图」记作真人签收换体验 80（证据强度不足）；② 把本机分层读数记作 CI 已绿换测试 85（配置与本地等价都不计）；③ 为凑分把 `L-16` 表决名单重算顺手写进服务端（越出「只改台账」授权，且须支书先定口径）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 待办点不动时弹一句 toast 也算「有反馈」 | 点在待办行上，用户要的是「到得了」；本台没有该模块时必须给出同义落点 | 反馈当落点 | 交互契约按「点了之后必须发生什么」写；未命中一律 fail-closed ＋ 同义落点，toast 不作兜底 |
| 同一事项在客户端判一次、服务端再判一次，各写一份类型即可 | 来源与类型只允许一份实现，两端 import 同一函数 | 双源并存 | 跨端派生必须同源 import；新增来源同批改契约、分类表与验收 |
| 表格各页手写 `<table>` 更自由，样式可以局部调 | 同列同语义 ≥3 行必须走同一组件出口；列宽 / 行高 / 截断只许一套 | 局部自写当灵活 | 组件出口纪律（`H31`）适用于表格；手写存量按棘轮只减不增并带反例守卫 |
| 详情页把信息全摊开就是「信息全」 | 首屏按事项轴分段，管理动作退到页尾；块数以「一眼看到主路径」为准 | 信息量当信息架构 | 块数判据同样适用于页面（详情页纳入 SD-57 同族）；超限部分折叠到页尾 |
| 同一份数据多给几种排法，用户总能找到顺手的 | 同一问句的另一种排法不立新视图；转置、平铺、矩阵各留一套只会增加选择成本 | 排列当问句 | 视图数按「问句数」计；同一问句的另一种排法并入已有视图的行内展开 |
| 图标用色只要「点缀色允许」就够了 | 同句后半要求「不单独承担状态语义，须同时有文字标签」 | 半句引用 | 带例外的规范须整句引完「允许 ＋ 例外 ＋ 兜底」（判例 `CASE-AI-009`） |

> **落点**：`content/04_web_design/design-system/CASES.md`（CASE-DESIGN-036…041）、`content/05_ai_coding/CASES.md`（CASE-AI-009）、`content/03_doc_system/CASES_INDEX.md`（＋6 design / ＋1 ai，域入口计数同步）、`.ctx/REVIEW_QUEUE.md`（四条新检查要点）、`.ctx/ENGINEERING_ASSESSMENT.md`（§一 / §二 2.1–2.6 / §四 L-12 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 540）、`.ctx/logs/EXECUTION_LOG_INDEX.md`、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-864 2026-11-10 — 批次 541：全仓漏网之鱼审计与 P2 统一清理

> **评议 → 裁定 → 落点**（支书 2026-11-10 要求「更新批次 541 最终评分与台账」；本批只改文档 / 台账，不改代码、不 commit、不 bump）：
> - **审计口径**：本轮按「全仓漏网之鱼」重扫——页签全量审计、代码健康评审余项与批次 540 收尾 P2 一并进同一张台账，按 **A / B / C / D / E 五类**分拣，**31 条**：A 11（本批已修）· B 11（带触发条件）· C 2（误报关闭）· D 4（重复，并入宿主）· E 3（不构成工程任务，出表）。台账＝`.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`；B 类落 `.ctx/REVIEW_QUEUE.md`（`B-541-1…11`）。
> - **分拣判据（布尔化）**：A 类＝真缺陷或判据被写坏且本批可修；B 类＝事实成立但开通条件未成立，**必须写触发**，触发未成立不得开工；C 类＝复核证据不成立，关闭不再复核；D 类＝与他条重复或已被常驻守卫覆盖；E 类＝不是工程任务（口径 / 节奏 / 冻结件 / 只能支书本人操作）。**禁止把 B 类当 A 类顺手改**，也禁止把 C 类挂账。
> - **本轮修复面**：① P0——今天页定位键改聚合组键 `groupKey`（`today-tab.js`，待办本体 id 不是行键），支书台考勤 / 考察 / 复盘补同义落点（`todo-actions.js`，支书台无该页签时不再落到「意见反馈」）；② 数据——应到口径单一源 `roster-eligibility.js`（滞留保留身份、应到剔除；已转出前置剔除）、服务端按支部 `config.policyOverrides` 算有效策略（`todo-groups.js`）、专班 `sourceType` 写入口径；③ 安全——公共门厅过期 / 缺失有效期一律 404 fail-closed（`public-portal.js`）、定向通知与支委层兜底同时比对支部（`notice.js`）；④ 守卫与判据——`icon-color-guard` 白名单只免生成点、`styles.css` data-URI hex 退场、判例与 `F10` 对齐、SD-62…SD-65 回填、跳转契约改精确等值并补最小 DOM 真渲、首屏块数改结构化计数、议程页禁本地自判；⑤ P2 S 项——制度下发 409、无附件不出下载链、限频表清理、提案迁移 v15 唯一、档案 422、枚举 422、审计基线、F6 误报复核；⑥ `G-1…G-8` 守卫补齐。
> - **六维评分**：业务 **81 → 82**（应到口径 / `policyOverrides` / `sourceType` / P2 数据项修复；**83 不授予**：`L-16` 表决名单重算未闭、D2 / C2 覆盖未扩）；安全 **77 → 79**（过期 `public` 与定向通知越读修复；**80 不授予**：多支部读过滤未接线、`ALLOW_MULTI_BRANCH` 仍关闭、门函数断言未补）；体验 **78 → 79**（A 类 11 条与今日 / 支书台落点落地；**80 不授予**：真人 5 任务签收仍未完成）；测试 **84 维持**（daily **29 文件 / 246 断言 / 101.6s**、guards **101 文件 / 809 tests / 152.9s** 全绿；**85 不授予**：CI 两 job 仍未实跑）；架构 **78 → 79**（待办读权限单源 `todo-read-policy.mjs`、P2 五类台账、契约 / 守卫同批补齐；**80 不授予**：行号 / 版本戳维护成本未降）；部署 **76 维持**（本批不动 `deploy/**` 与运行档，CI `deploy-verify` 未实跑）。
> - **审计未取终摘要**：`audit-tabs --all` 全量超时未出 summary；本次读数沿用守卫代理报告 **P0 0 / P1 0**，并新增 **3 条真实 P2 基线漂移**（`secretary.calendar` 10 vs 3、`secretary.report-up` 14 vs 4、`visitor.activities` 9 vs 3），登记 `L-22` / `B-541-1`，待支书裁定「按 DOM 实测重基线」。**不盲改 `TAB_BLOCK_BASELINE`**。
> - **未选方案**：① 按 DOM 实测直接改三处 `TAB_BLOCK_BASELINE` 把 P2 清零（会把真漂移洗白，且基线是「实测 ↔ 登记」的锚点）；② 把 B 类 11 条并入本批一起改（开通条件未成立，等于绕过触发条件）；③ 用全量审计未跑完为由把 P2 记 0（未覆盖不等于无问题）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 全量审计没跑完，先按「无新增问题」记账 | 没跑完只能说明没覆盖，必须显式写出缺口与替代证据来源 | 未覆盖当无问题 | 审计未出 summary 时只认替代报告并标注覆盖缺口，P2 数不得回落 |
| 基线漂移把 `TAB_BLOCK_BASELINE` 改成 DOM 实测就修好了 | 基线是「实测 ↔ 登记」的比对锚点，盲改会把真漂移洗白 | 同步当修复 | 漂移先定口径（重基线 / 收块）再由支书裁定，裁定前不得动基线 |
| P2 清单逐条修完即可清空 | P2 须按 A/B/C/D/E 分拣，B 类留队列并写触发条件 | 修完当关账 | 清账按类落处置；B 类未写触发即视为未分拣 |
| 过期内容只要不在列表里露出就够 | 过期 / 缺失有效期一律视为不公开，服务端 404 fail-closed | 状态标签当权限 | 可见性判据必须进服务端读口，缺一即拒绝，不给探测差异 |
| 定向通知 `audience` 命中即可读 | 定向通知还须比对支部，命中只是必要条件之一 | 命中一项当全条件 | 多条件可见性逐条判，任一缺失即不可读 |

> **落点**：`.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`（分拣与已修勾选）、`.ctx/REVIEW_QUEUE.md`（`B-541-1…11`）、`.ctx/ENGINEERING_ASSESSMENT.md`（§一 / §二 2.1–2.6 / §四 `L-12`·`L-22` / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 541）、`.ctx/logs/EXECUTION_LOG_INDEX.md`、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-865 2026-11-11 — 六维评分保守回调

> **评议 → 裁定 → 落点**（支书 2026-11-11 要求「六维评分更保守」；只改 `.ctx` 文档 / 台账，不改代码、不 commit、不 bump）：
> - **业务与数据 82 → 81**：工作组 / 活动 / 专班三层关系仍有口径冲突（专班是否独立成层、工作组与活动挂靠哪层未统一）；党小组台账判据与专班考勤口径未统一；`L-16` 表决名单服务端重算未闭；D2 只对 3 个计数、C2 在 46 页签 0 pass。批次 541 的应到口径单源、`policyOverrides`、`sourceType` 与四项 P2 数据修复仍计在基线内，不撤销。**需补证据**：三层关系与党小组 / 专班口径判据表落 content、D2 全量分母、C2 逐页签 pass。
> - **安全与权限 79 → 78**：过期 `public` 与定向通知两处越读已修，但多支部读过滤未接线到生产读面、共享口令回退仍在、CI 两个 job 未跑、门函数 ≡ 角色集合断言未补。**需补证据**：读过滤接读面后复核 0 known-risk、门函数断言、共享口令退出回退的部署证据、CI run id。
> - **最小三成本体验 79 → 78**：P2 三处真实块数漂移（`secretary.calendar` 10 vs 3、`secretary.report-up` 14 vs 4、`visitor.activities` 9 vs 3）说明块数口径可漂移而未被日常审计发现；真人 5 任务签收未完成。**需补证据**：`L-22` 裁定后块数不再漂移、真人签收 5 个用户任务（签收人 ＋ 日期）。
> - **测试与发布质量 84 → 83**：daily **246 断言 / 101.6s**、guards **809 tests / 166.3s** 全绿，但 CI 两个 job 未实跑；P2 基线漂移说明审计仍有盲区。**需补证据**：CI 首跑绿（run id / 日志）、P2 裁定后基线稳定。
> - **架构与可维护性 79 → 78**：对象模型（工作组 / 活动 / 专班 / 党小组）边界未定，三层挂靠关系仍在台账、读面与设计稿各写一份；待办读权限与应到口径两条单源已改善。**需补证据**：对象模型边界判据表、行号 / 版本戳维护成本下降的读数。
> - **运行、部署与跨组织复用 76 维持**：无新增目标环境证据，`deploy/verify-linux.sh` 6/6 读数继续有效。
> - **未选方案**：① 维持 `D-864` 分数只加注（同批证据已指出多层口径未统一，只加注等于不回收）；② 只回调个别维度、其余维持（同源证据跨维，分维口径不一致）；③ 顺手改代码 / 测试 / 契约把分补回来（越出「只改 `.ctx` 台账」授权）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 三条单源收口即可代表对象模型已经定清 | 工作组 / 活动 / 专班 / 党小组的层级与挂靠关系仍是各写一份，单源只覆盖其中一条链路 | 局部单源当全局定清 | 对象模型的加减分以「层级与挂靠关系有一份判据表」为准，不以单条链路收口替代 |
| 权威读数全绿即可维持高分 | 审计仍有盲区（P2 三处真实漂移未被日常发现），CI 未跑即无跨环境证据 | 读数全绿当覆盖完整 | 测试 / 体验分须同时给「绿读数 ＋ 覆盖盲区 ＋ CI 读数」，缺一不得维持原分 |
| 多支部开关关闭、写门未放宽即可按原分记账 | 读过滤未接线、共享口令回退仍在，风险仍在生产侧 | 未放宽当已闭环 | 安全分按「风险项是否闭环」计，不以「本批没有放宽」计 |
| 上批给过的分默认延续 | 分是当前证据的成熟度，证据不足即回调 | 存量分数当既得 | 每轮按证据重算，回调必须写「为何回调 ＋ 需补证据」，不得静默保留 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / 阻断风险注 / §二 2.1–2.6 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/DECISION_LOG.md`（月度索引）、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**
>
## D-866 2026-11-11 — 产品对象模型 / 组长权限 / 上会广播 / URL 形态

> **评议 → 裁定**（支书 2026-11-11 四项选择；本条目只记录裁定，不含实现）：
> - **工作组对象模型**：采纳「**党小组 → 活动 / 专班 → 工作组**」三层；工作组不设「指导支委」。与仓库现状的差异：现行 `DATA_MODEL` 把活动 / 专班当业务层、工作组当执行载体、党小组当独立组织单元，三层顺序与挂靠关系没有一份判据表；本裁定把党小组置为组织归属层，活动 / 专班挂 `hostGroupId`，工作组挂活动 / 专班 `workgroupId`，不再加指导支委字段。
> - **党小组组长**：采纳 A「组内全权 ＋ 支部提案」：本组活动建 / 改 / 考勤 / 材料 / 归档 / 通知 / 工作组全权；支部级活动只可提案，不直接发布。
> - **上会与广播**：采纳 A「统一上会事项 ＋ 回执」：保留八类来源；状态 `pending→queued→on-agenda→decided→closed/rejected`；回执到提案人，排期到支委，决议通知支委 ＋ 提案人 ＋ 受影响人；建会收口支书 / 副支书，其他支委可提案。
> - **URL 形态**：采纳 B「去后缀 ＋ 兼容」：服务端已支持无后缀（`express.static extensions:['html']`）；只改链接生成层 `page-url.js` / `object-route.js`，旧 `.html` 保持 200，不做 301、不目录化、不改 SPA，开关可回滚。
> - **未选方案**：工作组 B 活动容器 / C 统一 WorkItem；组长 B 提案＋支书发布 / C 共管；上会 B 只支委可报 / C 任何角色＋附议；URL A 只美化手输 / C 彻底 SPA。理由见 2026-11-11 产品调研：B/C 分别带来专班表合并、第二套报备、提案实体与迁移成本；A URL 不解决站内链接，C 会触发 26 页入口与冻结件重做。
> - **落点**：待写产品设计稿（对象模型判据表、权限矩阵、上会状态机、URL 生成单一源）；本条目**未改代码 / 未 commit / 未 bump**。

## D-867 2026-11-11 — 三项子裁定 ＋ URL B 实施

> **评议 → 裁定 → 落点**（支书 2026-11-11 三项追问的选择；URL 取「先做」）：
> - **支部级专班**：存在。`taskforces.hostGroupId` 可空；支部级专班 `organizingScope='branch'`、`hostGroupId=null`，承办方记为支委会；与支部级活动同构。
> - **决议默认受众**：支委层 ＋ 提案人 ＋ 受影响人；全支部知悉须由支书在记录决议时显式勾选。
> - **组长提案可见性**：全体支委可见（统一事项池）；事项池读权限保持 `requireCommissioner`，组长只新增提交口。
> - **URL B 实施**：`page-url.js::pageHref()` 为唯一后缀变换；`resolveDocumentUrl()` 内联调用；`object-route.js` 详情页去后缀；登录 / 登出 / 深链 / 跨台重定向等 `location` 调用统一经 `pageHref()`；`link-normalize.js` 在侧栏与登录页安装，对初始 DOM 与新增节点统一改写站内锚点。`help` / `about` 冻结面跳过；旧 `.html` 保持 200，不做 301；回滚只改 `URL_STYLE`。
> - **未选方案**：① 只改静态 `href`（`docs` 内 375 处 / 100 文件，测试断言 751 处，分类成本与回归面过大）；② 301 到无后缀（地址栏仍显示 `.html` 的旧链接不会变短，且多一次跳转）；③ 彻底 SPA（越出本轮范围，触发 26 页入口重做）。
> - **读数**：`test:guards` **101 文件全绿 / 101.8s**；`test:daily` **29 文件 / 246 断言 / 73.7s** 全绿；真机（Playwright）登录后 URL＝`http://localhost:3000/workspace/secretary?tab=today`，站内 `.html` 锚点剩余 **0**（`help` / `about` 除外）。
> - **落点**：`docs/src/core/base/page-url.js`、`docs/src/core/base/link-normalize.js`（新）、`docs/src/core/domain/object-route.js`、`docs/src/components/shell/{sidebar,header,tab-bar,workspace-shell}.js`、`docs/src/entries/**` 重定向点、`server/test/**` 期望值；设计稿 `content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md §五 / §七`。

## D-868 2026-11-11 — 对象模型落地（专班承办方 + 工作组挂靠唯一）

> **评议 → 裁定 → 落点**（支书要求「研究清楚活动 / 专班 / 工作组关系」后实施）：
> - **关系定案**：活动与专班是两类并列业务对象，互不挂靠；工作组是二者各自 1:1 的执行载体，不是第三类业务对象，也不是中间层；党小组是承办归属层。
> - **专班补字段**：`organizingScope`（`party-group|branch|null`）、`hostGroupId`（条件必填）、`legacyScope`（历史缺省标记）、`scopeFilledBy/At`（补选留痕）。新记录必须显式选择承办方，不猜；历史缺省显示「待补」，由组织委员 / 支书一次性补选后锁死。
> - **工作组挂靠**：`kind === sourceType`、`sourceId` 非空且指向同支部真实行；不新增 `activityId/taskforceId` 第二套键。
> - **专班不产生考勤**：`work-map.js` 专班产出改为 `['考察','材料']`。
> - **落点**：`content/04_web_design/data/DATA_MODEL.md §附二`、`server/routes/resources/workgroup-routes.js`、`server/routes/resources/index.js`、`docs/src/services/activity/taskforce.js`、`docs/src/entries/tabs/org/taskforce-tab.js`、`docs/src/core/domain/work-map.js`、`server/test/object-model-guard.test.mjs`。

## D-869 2026-11-11 — 支委提案（统一上会事项）与回执

> **评议 → 裁定 → 落点**：
> - **实体**：新增 `committee_proposals` / `committee_proposal_events`（schema v16，运行时域，种子为空）。
> - **状态机**：`pending → queued → on-agenda → decided → closed|rejected`；纯函数单一源 `docs/src/core/domain/committee-proposal.js`，非法迁移返回 `null`。
> - **权限**：组长 / 副组长可提；支委可受理 / 驳回；支书 / 副支书可排期 / 决议 / 归档；来源对象与会议均须同支部。
> - **议程**：只收 `queued` 提案，按现有「意见反馈」类落池，附 `proposalId/proposedBy`，不新增第九类。
> - **回执**：6 个系统通知 kind；提交 → 支委层，受理 / 驳回 / 归档 → 提案人，排期 / 决议 → 支委层 ＋ 提案人 ＋ 受影响人。
> - **决议回写**：`passed` 且无 `sourceId` 时生成同支部 `draft` 活动 / 专班并回指；已有对象不改状态，避免绕过既有审批门。
> - **落点**：`server/routes/committee-proposals.js`（新）、`server/db.js` v16、`server/data/domain-contract.mjs`、`server/system-notice-kinds.js`、`server/routes/system-notices.js`、`server/routes/committee.js`、`docs/src/services/governance/committee-proposal.js`（新）、`docs/src/entries/tabs/{leader/overview-tab,secretary/committee-meeting-tab}.js`、`server/test/committee-proposal-{state,routes}.test.mjs`。

## D-870 2026-11-12 — 三台专项探查 P0 收口

> **评议 → 裁定 → 落点**：
> - **提案 ↔ 议程单一事实**：`decide` 在事务内回写会议议程项 `result`；`recordAgendaResult` 对 `kinds:['proposal']` 只转发 `decide`，不二次写；排期幂等；`canRead` 纳入 `affectedPersonIds`。
> - **支委会写门**：建会 / 改议程 / 记录决议仅支书 / 副支书（党委 `party-staff` 保留入口）；普通活动写权不动，进一步收紧留丙部。
> - **报表读权**：`GET /report/export`、`GET /report/:domain` 收为支书 / 副支书 / 组织委员 / 党委；宣传与纪检委员不默认放开。
> - **宣传台闭环权**：看板移除「确认完成」，活动结束权归组织者 / 支书；专班收尾提示保留。
> - **组长进展读口**：组长仅本组、支委层看支部、其他角色 403；组归属单一源 `party-group-scope.js`。
> - **Harness**：M7/M8 迁移期望由 `SCHEMA_VERSION` 派生；S6 台账行号全量同步；新增写门矩阵 evidence 行号守卫。
> - **未选**：报表放开给全部支委（隐私面过大）；建会写门连普通活动一并收紧（误伤归档 / 议程链）；组长范围算法本批迁服务端（改动面过大，只先加读门）。
> - **落点**：`server/routes/committee-proposals.js`、`resources/gates.js`、`resources/index.js`、`report.js`、`leader-progress.js`、`docs/src/services/activity/agenda-follow-up.js`、`docs/src/services/governance/committee-proposal.js`、`docs/src/entries/tabs/prop/kanban-tab.js`、`docs/src/core/domain/party-group-scope.js`（新）、`server/test/{committee-flow-guard,committee-meeting-gate,report-read-gate,leader-progress-gate,prop-kanban-scope,write-policy-evidence-guard}.test.mjs`（新）。

## D-871 2026-11-13 — 547 边界闭环（真机流程 / 消息页 / issue-unread）

> **评议 → 裁定 → 落点**：
> - 专班三条真机流失败根因＝写块在默认收起的 `<details>` 内；修测试 `open` 链先点 `summary`，不改产品。
> - `messages-entry.js` 使用 `emptyStateHtml` 漏 import，独立页抛 `pageerror`、写私信按钮不渲染；补 import。
> - `issue-unread` 的 `secretary-review` 保留键此前只允许提交人 / 被指派人写；清支书角标是支书 / 副支书的读后动作 ⇒ 允许其写 `unread:false`，其余角色仍 403。
> - 落点：`server/test/form-loop-registry.mjs`、`docs/src/entries/pages/messages-entry.js`、`server/routes/resources/semantic-routes.js`、`server/security/write-policy-matrix.mjs`、`server/test/issue-unread-gate.test.mjs`。

## D-872 2026-11-13 — L-16 表决名单采「建会冻结快照」

> **评议 → 裁定 → 落点**：支书在对话中裁定：建会时按 `users` + 组织归属算一次 `voteConfig.voterIds` 并冻结；会议期间不随组织变动，组织变动下次建会生效。**未选**：每次读时重算（同一会议名单前后可能变化，需处理已投票但失去资格的人）；冻结+变更重算（实现与审计最复杂）。落点：`server/routes/committee.js`（待实现）、`.ctx/REVIEW_QUEUE.md` `B-541-5`、`EA L-16`。

## D-873 2026-11-13 — L-22 / B-541-1 三处 IA 块数按实测重基线

> **评议 → 裁定 → 落点**：支书在对话中裁定：`secretary.calendar` 10 / `secretary.report-up` 14 / `visitor.activities` 9 按 DOM 实测重基线，改 `TAB_BLOCK_BASELINE` 三处并复核例外理由。**未选**：收拢 UI 到 3/4/3（改动面大、可能删有用入口）；分页签处理（需逐页评审）。落点：`server/test/style-baseline.mjs::TAB_BLOCK_BASELINE`（待实现）、`.ctx/REVIEW_QUEUE.md` `B-541-1`、`EA L-22`。

## D-874 2026-11-14 — D-873 复核：三处块数 10/14/9 为探针误报，改探针口径、基线不改

> **评议 → 裁定 → 落点**：实现 D-873 前先证伪——`10 / 14 / 9` 逐条拆开是行内节点：`secretary.calendar` 10 = 9 个图例行内 `span` + 1 张卡；`visitor.activities` 9 = 8 个 SVG 节点（`line`/`rect`/`circle`）+ 1 张卡；`secretary.report-up` 14 = 3 张卡 + 1 个 `.disclosure-host` + 10 个列表行内 `span`/`p`。根因：`dom-probe.mjs::expandBlocks` 把「无子元素的行内叶子」也 push 成顶层块，与自身口径（块＝语义容器）不符。支书裁定「先修探针再按真实块数复核」→ 探针改为「子树有语义容器就只认语义容器；一个都没有时容器整体算 1 块」；修后实测 **2 / 4 / 2**（差额落在表头口径：基线含页头、探针排除页头），三处均 ≤ 4，按 `D-838` 保持 `TAB_BLOCK_BASELINE` 不改，L-22 / `B-541-1` 以「探针误报」关闭。**未选**：按字面登记 10/14/9（把行内元素固化成块定义，日后密度问题不告警）；只修探针不关 L-22（留僵尸条目）。落点：`server/scripts/audit/dom-probe.mjs`、`.ctx/evidence/2026-11-14/d873-block-remeasure.md`、`.ctx/ENGINEERING_ASSESSMENT.md §四 L-22`。

## D-875 2026-11-14 — 提交 / 分支 / 台账三项纪律加固

> **评议 → 裁定 → 落点**：支书指出三处 harness 缺口并裁定：① **提交粒度**——每批 1–3 个按逻辑拆分的 commit（学批次 515 / 516），禁止为回填 hash 追加第二个 commit；执行日志不落 commit hash，改动事实用 `git log --grep "批次 N｜"` 检索；收尾跑 `server/scripts/check-batch-commits.mjs` 自检。② **分支与合并**——`release/2026-11-launch` 自批次 523 累积、30 commit 领先 main 且无远端；取「达标后合并回 main」：合并门槛＝六维均 ≥80 ＋ `test:full` 绿 ＋ `audit-tabs --all` P0/P1=0 ＋ 支书确认；合并后回 main 直做，下一个发布点再开新分支；push 必须支书确认。③ **乙部门槛**——`B-500-7b-2` 与 `B-522-1` 标注「六维均 ≥80 后启动」（当前 81 / 78 / 78 / 83 / 78 / 76）。**未选**：立即合并（失去发布隔离、回滚粒度粗）；长期续用同一条 release 分支（main 长期滞后）；把 5 条 perf P2 升级为真问题（真机重测 p50 2–3ms、不复现）。落点：`CLAUDE.md H20.3 / H20.5 / H26.1 / 乙部`、`content/05_ai_coding/{DOCUMENT_GOVERNANCE,CONTEXT_MANAGEMENT}.md`、`server/scripts/check-batch-commits.mjs`、`.ctx/evidence/2026-11-14/p2-perf-recheck.md`、`.ctx/ACTIVE_CONTEXT.md §1 / §3`。

## D-876 2026-11-15 — 删除活动保留报名 / 表决留痕行 + 活动快照

> **评议 → 裁定 → 落点**：跨层专项发现活动删除事务级联物理删除 `signups` 与 `agenda_votes`，与既有判据「报名记录须保留；只能撤回 / 取消 / 作废，不得物理删除」冲突。支书裁定取「**保留留痕行 + 快照**」：删除活动时两类行不删，同事务写入 `activitySnapshot { id, title, date, type, scenarioId, deletedAt }`，活动本身仍可物理删除；匿名表决仍不得出现 `personId→选项` 映射。**未选**：禁止删除有记录的活动（支书误建时清理成本过高）；活动软删除（读口 / 导出 / 统计全要加过滤，改动面最大）。落点：`server/routes/resources/index.js::deleteActivityCascade`、`docs/src/data/mock-adapter.js`（前端 mock 同口径）、`README-server.md §5.5/§6.1`、`content/04_web_design/data/DATA_MODEL.md`、`server/test/activity-delete.test.mjs`。

## D-877 2026-11-15 — 六维按行业基线严格重评（门槛不降，本批不合并）

> **评议 → 裁定 → 落点**：支书令「重新探查评分，用行业要求约束，做到批判性、严格、不过度自信，该下调就下调；门槛不降」。按 `ENGINEERING_ASSESSMENT §一 行业基线` 重打：业务 **76**（81→76）、安全 **68**（78→68）、体验 **72**（78→72）、测试 **70**（83→70）、架构 **72**（78→72）、部署 **65**（76→65），**六维均 <80 ⇒ 不满足 `H20.5`，未合并回 main**。硬扣分：`npm audit --omit=dev` 4 条（1 critical `proxy-addr` / 2 high `body-parser`·`nodemailer` / 1 moderate `qs`）；CI 仅 `daily.yml`（precommit/full/audit 未进 CI）；`test:full` 1489s > H25 1200s；`L-02` Linux 真机未验；无 observability；无 a11y 常驻守卫；双算派生未摘（`B-500-7b-2`）。**未选**：维持旧分（掩盖 critical 依赖与 CI 缺口）；为凑合并门槛上调（违背支书「该降就降」）。落点：`ENGINEERING_ASSESSMENT §一/§二`、`.ctx/ACTIVE_CONTEXT.md §1/§3`。

## D-878 2026-11-15 — 六维补齐后重评：78 / 78 / 78 / 74 / 76 / 74（仍 <80，继续不合并）

> **评议 → 裁定 → 落点**：支书批准 `close-six-dim-gaps` spec，按「M1 敢用 → M2 好用 → M3 可交接」补齐；补完按**同一行业基线**重评：业务 **78**、安全 **78**、体验 **78**、测试 **74**、架构 **76**、部署 **74**，**六维仍均 <80 ⇒ 继续不合并回 main**（门禁不降，不为凑分上调）。已补证据：`npm audit --omit=dev` **0**；46 页签 **P0 0 / P1 0 / P2 0**（审计工具修复后 191s 真实读数）；匿名 `GET /archiveRecords` 越读修复；支部解析 fail-closed 且 `todo-groups` 与 `todos` 同判；党委进入支部服务端只读（403 `readOnly:true` 四条写口实测）＋ `branch_visits` 留痕（v17）；结构化日志 / 浅深健康检查 / 指标 / 30 分钟节流告警 / 备份每日巡跑 / systemd unit＋timer；恢复演练 57 表 · 864256 B · integrity 前后各一次 ok · exit 0；daily **254**、guards **109 文件 / 836**、夜间四片矩阵已配置。**未给 80 的四条硬缺口**：① CI 无 run id（未推送）、无安全扫描；② `test:full` 自 1489s 后未重跑、无覆盖率、flake 无隔离；③ `L-02` Linux 真机 install/update/preflight 未验、timer 未实触发；④ 共享口令回退（`L-11`）、routes 仍 87 处 / docs 77 处回落未清、无类型检查、真机签收（T11）未完成。**未选**：按「大部分完成」给 80（违背支书「该降就降、门槛不降」）；把多支部整体关掉当完成（违背「N=1 是特例」裁定）。落点：`ENGINEERING_ASSESSMENT §一/§二`、`.ctx/ACTIVE_CONTEXT.md §1/§3`、`.ctx/logs/2026-11-EXECUTION_LOG.md` 批次 554–558。

## D-879 2026-11-16 — 壳层顺手与「数字说真话」：六维 79 / 79 / 80 / 75 / 77 / 74（仍不合并）

> **评议 → 裁定 → 落点**：支书自查指出「页头与页签命中区偏小、侧栏与页签 12px」，并令其后的全栈探查继续找出可改进点。三路取证后逐条请支书裁定：壳层**全局**（页头 / 页签 / 侧栏页脚两档 44px＋13px，卡片与表格分批）；计算**八条全修**；三处支部越权**本轮一并堵**；列表**硬上限 2000 ＋ 水合不截断**（支书质疑 500 过小：200 人支部年考勤约 6000 行）。业务口径四条另裁：未录＝「待录入」且导出留空、表决分母保持冻结并单列「已转出，不计」、`in_progress` 不计逾期但单列「已过截止」、上报按本地日＋CSV 日期列。**落点**：`docs/src/styles.css`、`components/shell/tab-bar.js`、`core/base/date.js`、`services/governance/secretary-overview.js`、`services/activity/{attendance,vote-config,committee-vote}.js`、`server/services/reporting.js`、`server/routes/{uploads.js,resources/{index,gates,semantic-routes,write-validation}.js}`、`server/test/{date-canon-guard,multi-branch-five-proof,resource-write-validation-guard}`。**结论**：六维 **79 / 79 / 80 / 75 / 77 / 74**，仍有四维 <80（架构 77 / 测试 75 / 部署 74 / 业务·安全 79）⇒ **继续不合并**。**未选**：只改移动端（两档分叉）；统一 500（数据截断风险）；把「已转出」按实时应到重算（表决结果不可回溯）。

## D-880 2026-11-17 — 字段错配 / 安全边界 / help / 乐观锁：六维 81 / 80 / 81 / 76 / 78 / 74（仍不合并）

> **评议 → 裁定 → 落点**：支书令「继续查前端、后端、计算与显示逻辑，特别是姓名写成学号这类张冠李戴；更新 help 对齐前沿能力」。三路只读审计（字段错配 / help / 全栈逻辑）后逐条请支书裁定：① 五项字段错配**全修并加契约字段守卫**；② 契约枚举冲突**以实现为准改契约**（`branches: active|inactive`、工作组成员 `active|removed`）；③ 并发整行覆盖做**全资源 `If-Match`**（缺头 428 / 过期 409＋`latest`），`updatedAt` 打底取**应用层回填＋写路径统一**（不加 schema 列）；④ 批次拆为 **562（正确性与安全）/ 563（help）/ 564（乐观锁）** 三条 commit；⑤ help **功能/流程优先、技术压后**；⑥ 三项偏好（空态下一步、门厅截断提示、跨组口径服务端化）全部纳入。**落点**：`docs/src/services/{governance/todo,member/person,governance/issues}.js`、`components/record/{report-inbox,report-entry,other-groups-view,insight-view,todo-tab-shell}.js`、`data/{api-adapter,data-adapter}.js`、`server/data/domain-contract.mjs`、`server/routes/{report,public-portal}.js`、`server/routes/resources/{index,semantic-routes,write-validation}.js`、`server/db.js`（`backfillUpdatedAt`）、`server/server.js`、`docs/help.html`、`server/test/{contract-field-usage-guard,if-match}.test.mjs`。**结论**：六维 **81 / 80 / 81 / 76 / 78 / 74**，仍有三维 <80（测试 76 / 架构 78 / 部署 74）⇒ **继续不合并**。读数：daily **32 文件 / 259 断言 / 100.5s**；guards **111 文件 / 381 项 / 153.3s** 全绿；`If-Match` 真机三态 428 / 409＋`latest` / 200；跨组汇总 32/10、0/0、4/1（实到 ≤ 应到）。**未选**：只修显示可见错配（契约枚举暗雷保留）；以契约为准改实现（历史行迁移成本）；只加 `updatedAt` 不加锁（并发丢字段仍在）；help 只修错不补能力（帮助页继续落后）。**边界**：动作型语义 PATCH 与聚合根行不强制 `If-Match`（由状态机留痕与集合级 `_versions` 承担）；`test:full`、CI run id、Linux 真机仍未补。

> **本文件续编说明**：本文件按批追加、不改写既有条目；当前止于 `D-880`**（共 **54** 条）。

