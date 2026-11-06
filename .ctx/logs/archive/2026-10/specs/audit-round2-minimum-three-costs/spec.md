# Round 2 最小三成本审查与修复 Spec

## Why

Round 1 修复批已完成并提交（`bba9ef3e4`，批次 484）。按四轮程序，下一轮是 Round 2「最小三成本」，lens 为 `better-layout` / `better-accessibility` / `better-writing`。

Round 1 还留下四件必须在 Round 2 收口的事：
1. U-01「周期归档·支书待审核」确认入口断裂（服务层有写口、页面零消费、通知深链落空）。
2. P7 表档仍红：`styles.css` 的 12px 表头 / 14px 首列与 13px 单档契约冲突；支书已裁定**回退 13px**。
3. S1 矩阵样本基线 4 已过期（实测 2）；支书已裁定**下调到 2**。
4. S19 README 措辞与解析锚点不一致；需按既有事实对齐。

另有一条执行纪律：上一轮把读屏复核写成「留人工」。支书要求「需要做的事情不要拖」——本批改为 **Chromium 可访问性树断言**，不再把读屏可读性停在人工承诺上。

## What Changes

- **Round 2 三 lens 独立审查**：7 个工作台 + 关键公共页；三路子代理各自只加载一个 skill、不互读报告；主代理只汇总共识 / 分歧 / 待裁定。
- **P7 回退 13px**：`.data-table thead th` 与 `tbody td:first-child` 字号回 13px，保留字重与颜色强调；P7 判据不动。
- **S1 基线校准**：`page-sweep` 矩阵样本门槛 4 → **2**，注释写实测与「范围未缩水」。
- **S19 措辞对齐**：根 `README.md` 的页签句改回含「逐枚页签（共 67 个）」，让锚定正则与文档同源。
- **U-01 完整闭环**：支书台「工作概况」补周期归档待审卡；消费通知 `?highlight=` 深链；「待我处理」计入周报待审。
- **无障碍验证落成机检**：新增 Chromium 可访问性树断言（dialog 名称 / `aria-pressed` / label 关联 / 空态出口），不再以「留人工」作为完成条件。
- 新增/更新守卫，版本戳 bump，TIMESTAMPS / 执行日志同步。

## Impact

- 受影响页面：7 个工作台（重点支书台「工作概况」「待办」）、活动详情 / 材料闭环。
- 受影响代码：`docs/src/styles.css`、`docs/src/entries/tabs/secretary/overview-tab.js`、`components/governance/work-overview.js`、`server/test/page-sweep.test.mjs`、`README.md`、新增 a11y 测试。
- 受影响守卫：P7、S1、S19 与新增 a11y 树断言。
- 不受影响：后端 API、数据模型、权限链；U-53 画布仍留 Round 4。

## ADDED Requirements

### Requirement: Round 2 三 lens 独立审查

Round 2 SHALL 按 H21 多代理独立审查协议执行：

1. 三路子代理分别只加载 `better-layout` / `better-accessibility` / `better-writing`，不互读报告。
2. 覆盖 7 个工作台全部页签 + 活动详情 / 材料闭环 / 首页关键面。
3. 每条输出：现象 / 证据（文件:行号或真机读数）/ 影响 / 建议方向 / 严重度 / 可能冲突。
4. 主代理只汇总共识 / 分歧 / 待裁定，不代填结论。
5. 汇总后只开**一次** grilling frontier，所有待裁定集中问。

#### Scenario: 上下文压缩后恢复

- **WHEN** 只剩审计报告与修复 spec
- **THEN** 能读出每条问题的 lens、证据、归属与裁定状态
- **THEN** 不重新发明 Round 2 范围

### Requirement: P7 表档回退 13px

系统 SHALL 让 `.data-table` 的表头与首列回到 13px 单档：

1. `.data-table thead th` 字号 13px；保留 `font-weight: 600` 与 `color: var(--neutral-600)`。
2. `.data-table tbody td:first-child` 字号 13px；保留 `font-weight: 500`。
3. 不放宽 `page-sweep::P7` 的 `cellPx = 13`。
4. 新增守卫断言这两条规则不再出现 12px / 14px。

#### Scenario: 支部管理表复核

- **WHEN** 打开党委台「支部管理」
- **THEN** 表头与首列均为 13px
- **THEN** P7 不再报离群

### Requirement: S1 矩阵样本基线校准

`page-sweep::S1` SHALL 以实测校准矩阵样本门槛：

1. `SWEEP.matrices` 门槛由 4 改为 **2**。
2. 注释写明：2026-10-19 实测 2；2026-10 单一轴整并后，考勤矩阵移入「数据查看」、专班矩阵移入「报名总表」二级视图；七台全部 tab 仍逐一进页面，范围未缩水。
3. 不放宽 P2 的「人维 ≤ 10」判据。

#### Scenario: 非空转

- **WHEN** 重跑 page-sweep
- **THEN** S1 通过，且 P2 仍有至少 2 个矩阵可判

### Requirement: S19 台账措辞对齐

根 `README.md` SHALL 与 `page-sweep::S19` 的锚定句同源：

1. 页签句包含「**逐枚页签**（共 67 个）」。
2. 不改 `README-server.md §3.2` 的七台计数。

#### Scenario: 台账对账

- **WHEN** 跑 page-sweep
- **THEN** S19 解析到根 README 的 67 个并一致

### Requirement: U-01 周期归档待审完整闭环

系统 SHALL 在支书台恢复「周期归档待审核」的可用承载面：

1. **待审卡**：支书台「工作概况」列出 `listPeriodicArchivesPendingReview()` 的条目（期次 / 提交人 / 提交时间），行内提供「通过」「退回」。
2. **写口**：通过 / 退回统一走 `reviewPeriodicArchive`；退回可填一句说明。
3. **深链**：进入 `workspace/secretary.html?tab=overview&highlight=<id>` 时定位并高亮对应待审行；找不到时给「该周期归档已处理或不存在」提示。
4. **待我处理**：`work-overview` 的「待我处理」计数纳入周报待审，判据与 `PERIODIC_ARCHIVE_REVIEW_STATUS.PENDING` 同源。
5. **空态**：无待审时显示「暂无待审周期归档」+ 去宣传台查看的唯一下游入口。

#### Scenario: 通知直达并审核

- **WHEN** 支书点击「周期归档待审核」通知
- **THEN** 落到工作概况并高亮该条
- **THEN** 点「通过」后该条离开待审卡，通知不再重复提醒
- **THEN** 「待我处理」计数同步减一

### Requirement: 无障碍验证由机检承担

系统 SHALL 用 Chromium 可访问性树替代「留人工」：

1. 招募浮窗：`role="dialog"` 且可访问名称等于标题。
2. 专班三视图与项目分工三子视图：`aria-pressed` 可被可访问性树读出。
3. 会议活动 `select` 的可访问名称包含「会议活动」。
4. 项目分工空态出口按钮可聚焦、可访问名称非空。
5. 断言失败即红；NVDA / VoiceOver 真人抽测改为可选补充，不再作为阻塞项。

#### Scenario: 读屏结构可读

- **WHEN** 运行 a11y 树断言
- **THEN** 上述四处均按角色 / 名称 / 状态命中
- **THEN** 不依赖人工口头确认

## MODIFIED Requirements

### Requirement: H21 Round 2 状态

Round 2 状态由「待触发」更新为「本 spec 批准后启动；先出审计报告与修复 spec，再执行修复批」。Round 3 / 4 保持待触发。

## REMOVED Requirements

无。

## Acceptance

- Round 2 审计报告落盘，三 lens 独立，覆盖 7 台全部页签与关键公共页。
- 审计报告含共识 / 分歧 / 待裁定；待裁定一次性集中问。
- P7 回退 13px 后 page-sweep P7 转绿。
- S1 基线 2、S19 措辞对齐后两项转绿；P2/P3 判据未放宽。
- U-01 真机走通：通知 → highlight → 通过 / 退回；「待我处理」计数正确。
- a11y 树断言通过；checklist 中不再有「留人工」阻塞项。
- 静态 / 守卫组全绿；版本戳 bump；TIMESTAMPS / 执行日志更新；提交含 Why / What / Verification / Boundaries。

## Non-goals

- 不启动 Round 3 / 4。
- 不改后端 API、数据模型、权限链。
- 不重写 68 页签；不实施 U-53 画布。
- 不为 P7 改 DESIGN_SYSTEM 的 13px 单档契约。
