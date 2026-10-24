// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test-tier-registry.mjs — 测试分层**单一源**（B-499-5 · Task 9，2026-10-21）
//
//  三层口径（互不重叠、并集 = 磁盘全部 `server/test/*.test.{js,mjs}`）：
//    · daily     —— 每次改完必跑（墙钟目标 ≈4 分钟）。权限、数据真值、迁移、写链、
//                   构建完整性、本批改动面、防假绿守卫，全部纯 node（不 import playwright）。
//    · precommit —— 提交前 / 发布前全量。真机浏览器 e2e、page-sweep、form-loop-sweep 等重活。
//    · weekly    —— 更慢的视觉 / 审计普查；precommit 与 full 仍覆盖（不因分层丢判据）。
//
//  约束（由 `test-tier-guard.test.mjs` 机械核对）：
//    ① 磁盘测试文件 ↔ 三层并集**双向相等**；三层互不重叠；
//    ② 不 import playwright 的纯 node 守卫**必须全部在 daily**（`doc-consistency::S16`）；
//    ③ daily 不含 page-sweep / form-loop-sweep / 任何 `*-e2e`；
//    ④ daily 文件数与静态 `test(` 调用点数不得高于下方预算常量（新增测试须显式改预算）。
//
//  本文件只做数据 + 纯函数：不改判据、不删测试。移层条目在 `reason` 里写明覆盖来源。
// ════════════════════════════════════════════════════════════════

/** 层级名（顺序即执行频次：daily → precommit → weekly） */
export const TIERS = ['daily', 'precommit', 'weekly'];

/** daily 文件数预算（含本守卫自身；新增 daily 测试须同批上调并写明理由）
 *  2026-10-21 R5 P1：新增 page-title-guard / ui-contrast-guard，并补登记既有
 *  ui-custom-select / ui-focus-ring（纯 node 守卫）⇒ 209 → 213。
 *  2026-10-22 第七轮 P2：新增 branch-id-literal-guard（缺省支部字面量守卫，纯 node）⇒ 213 → 214。
 *  2026-10-22 第七轮 R7-01：新增 account-rename（人员主键改名受控端点，纯 node）⇒ 214 → 215。
 *  2026-10-22 第九轮 Task 4：新增 activity-workgroup-sync / taskforce-workgroup-source（纯 node）⇒ 215 → 217。
 *  2026-10-22 第九轮 Task 6：新增 ui-motion-guard（卡片悬停 / transition-all 棘轮，纯 node）⇒ 217 → 218。
 *  2026-10-23 R11 Task 12.1：补登 feedback-integrity / modal-contract / schema-split-gate
 *    （此前只落盘未登记）＋ 新增 ui-control-system-guard（均纯 node）⇒ 220 → 224。
 *  2026-10-23 批次 505（spec redesign-theme-palette-and-density Task 9）：新增
 *    theme-palette-guard / density-spacing-guard / hover-state-guard（均纯 node）⇒ 224 → 227。
 *  2026-10-23 批次 507（spec unify-link-and-press-states）：新增 link-color-guard（纯 node）⇒ 227 → 228。
 *  2026-10-24 批次 508：新增 activity-tone-guard / field-shell-guard / motion-guard /
 *    archive-deeplink-guard（均纯 node）⇒ 228 → 232。 */
export const DAILY_FILE_BUDGET = 232;

/** daily 静态 `test(` / `it(` 调用点预算（含子测试；新增断言须同批上调并写明理由）
 *  2026-10-21 R5 P1：页题守卫 4 条 + 对比度守卫 5 条 + 补登记的既有两条守卫 ⇒ 1351 → 1377。
 *  2026-10-21 批次 500 收尾：`todo-role-write-gate` 补 S5–S10（派生待办：支委代办 / 来源可证 / 伪造来源拒 / 无 actionKey 拒 / 推进仍归本人 / 无主 visitor 拒）⇒ 1377 → 1383。
 *  2026-10-22 第七轮 P2：`branch-id-literal-guard` 2 条 + 副组长同权用例 2 条 ⇒ 1383 → 1387。
 *  2026-10-22 第七轮 R7-33：`policy-config` 补考勤/复盘超期现算 2 条纯函数用例 ⇒ 1387 → 1389。
 *  2026-10-22 第七轮 R7-01：`account-rename` 4 条（成功 / 409 / 403 / p* 400）⇒ 1389 → 1393。
 *  2026-10-22 第九轮 Task 4：新增 activity-workgroup-sync（4）/ taskforce-workgroup-source（2），
 *    seed-drift +1、workgroup-api +1、mock-api-parity +1、home-workgroup-progress +1 ⇒ 1393 → 1403。
 *  2026-10-22 第九轮 Task 5：`frontend-foundations-guard` 新增 F8（可点容器键盘可达）1 条 ⇒ 1403 → 1404。
 *  2026-10-22 第八轮 Task 2.8：`r3-data-permission-regression` 新增「纪检确认考勤」1 条 ⇒ 1404 → 1405。
 *  2026-10-22 第九轮 Task 6：新增 ui-motion-guard（M1 悬停 / M2 transition-all / M3 非空转）3 条 ⇒ 1405 → 1408。
 *  2026-10-22 第九轮 Task 7.3：`frontend-foundations-guard` 新增 F9（写口失败不得提示成功）1 条 ⇒ 1408 → 1409。
 *  2026-10-23 批次 504（schema v11）：新增 todo-branch-attribution（6）/ schema-split-shadow（3）⇒ 1409 → 1418。
 *  2026-10-23 R11 Task 12.1：补登 feedback-integrity（12）/ modal-contract（5）/ schema-split-gate（4）
 *    ＋ 新增 ui-control-system-guard（7）⇒ 1418 → 1446。
 *  2026-10-23 批次 505（Task 9）：新增 theme-palette-guard（5）/ density-spacing-guard（7）/
 *    hover-state-guard（5）⇒ 按实况 1464（上批声明 1446 与实际差 1，本批一并校准）。
 *  2026-10-23 批次 507：新增 link-color-guard（5）＋ hover-state-guard 增补按压 H6/H7（2）⇒ 1464 → 1471。
 *  2026-10-24 批次 508：新增 activity-tone-guard（4）/ field-shell-guard（6）/ motion-guard（6）/
 *    archive-deeplink-guard（5）＋ theme-palette-guard 增补 strongHover T6/T7（2）⇒ 1471 → 1494。 */
export const DAILY_TEST_BUDGET = 1494;

const group = (tier, reason, list) => list.map((file) => ({ file, tier, reason }));

/** 全量分层登记表：每条 = { file, tier, reason } */
export const TEST_TIERS = [
  // daily · 权限 / 角色 / 受众 / 作用域
  ...group('daily', '权限 / 角色 / 受众 / 作用域', [
    'activity-member-privacy.test.mjs',
    // 2026-10-22 第九轮 Task 4.3：活动 ↔ 工作组同事务同步（纯 node；含服务端 HTTP + mock 镜像）
    'activity-workgroup-sync.test.mjs',
    // 2026-10-23 批次 504：v11 Todo 归属（回填 / 400 / 兼容期）与影子子表（回填 / 篡改 / 回滚）
    'schema-split-shadow.test.mjs',
    'todo-branch-attribution.test.mjs',
    'auth-audit-scope.test.mjs',
    'auth-password.test.mjs',
    'auth.test.js',
    'block-field-policy.test.mjs',
    'capability-package-catalog.test.mjs',
    'capability-registry.test.mjs',
    'handoff-state-guard.test.mjs',
    'iaaa-onboarding.test.mjs',
    'inspection-write-gate.test.mjs',
    'issue-audience-projection.test.mjs',
    'issue-branch-policy.test.mjs',
    'module-owner-authz.test.mjs',
    'notice-audience.test.mjs',
    'output-block-policy.test.mjs',
    'participant-scope.test.mjs',
    'periodic-archive-policy.test.mjs',
    'periodic-archive-scope.test.mjs',
    'permission-gate.test.mjs',
    'policy-config.test.mjs',
    'r3-data-permission-regression.test.mjs',
    'roles-sync.test.mjs',
    'round3-4-security.test.mjs',
    'system-notice-project-auth-authorize.test.mjs',
    'todo-cross-role-safety.test.mjs',
    'todo-role-write-gate.test.mjs',
    'workforce-gate.test.mjs',
    'workgroup-branch-scope.test.mjs',
    'workgroup-member-grant-revoke.test.mjs',
  ]),
  // daily · 数据真值 / 迁移 / 种子 / 备份
  ...group('daily', '数据真值 / 迁移 / 种子 / 备份', [
    'account-rename.test.mjs',
    'archive-action-guard.test.mjs',
    'archive-record-write.test.mjs',
    'backup-restore.test.mjs',
    'catalog-sync.test.mjs',
    'data-lifecycle-guard.test.mjs',
    'db-integrity-guard.test.mjs',
    'db-migration.test.mjs',
    'id-uniqueness.test.mjs',
    'identity-student-id-guard.test.mjs',
    'material-link-truth.test.mjs',
    'mock-api-parity-structure.test.mjs',
    'mock-api-parity.test.mjs',
    'mock-multi-branch.test.mjs',
    'periodic-archive-api.test.mjs',
    'periodic-archive-migration.test.mjs',
    'person-consistency.test.mjs',
    'reset-tier-init.test.mjs',
    'reset-tier.test.mjs',
    // 2026-10-23 R11 Task 12.1：拆表切换闸门（C2 埋点 / C4 历史 / NOT_READY 不切读路径，纯 node）
    'schema-split-gate.test.mjs',
    'seed-baseline.test.mjs',
    'seed-drift.test.mjs',
  ]),
  // daily · 文档真值 / 版本 / 构建完整性
  ...group('daily', '文档真值 / 版本 / 构建完整性', [
    'claude-parallel-audit.test.mjs',
    'ctx-hygiene-guard.test.mjs',
    'doc-consistency.test.mjs',
    'doc-line-ref.test.mjs',
    'frontmatter-freshness.test.mjs',
    'import-path-guard.test.mjs',
    'timestamps-note-guard.test.mjs',
    'version-stamp.test.mjs',
  ]),
  // daily · 静态结构 / UI / 文案 / 防假绿守卫
  ...group('daily', '静态结构 / UI / 文案 / 防假绿守卫', [
    'activity-block-gate.test.mjs',
    // 2026-10-24 批次 508：活动类别 tone 单一源 / info 语义隔离 / 党建红 ≠ 错误红（纯 node）
    'activity-tone-guard.test.mjs',
    // 2026-10-24 批次 508：归档 ?tab=/?id= 深链、focusActivityId 展开折叠区、复盘落点（纯 node）
    'archive-deeplink-guard.test.mjs',
    'block-orchestration.test.mjs',
    'branch-id-literal-guard.test.mjs',
    'button-system-guard.test.mjs',
    'committee-meeting-density.test.mjs',
    'committee-tab-density.test.mjs',
    'control-font-guard.test.mjs',
    'copy-fold-guard.test.mjs',
    'copy-length-guard.test.mjs',
    'copy-master-guard.test.mjs',
    'date-canon-guard.test.mjs',
    'dead-selector-guard.test.mjs',
    // 2026-10-24 批次 508：字段外壳焦点态唯一源 / 禁用只读分态 / select 统一增强（纯 node）
    'field-shell-guard.test.mjs',
    // 2026-10-23 批次 505（Task 9）：组件密度 / 按钮高度 / 间距五档 / Tailwind 数值档棘轮（纯 node）
    'density-spacing-guard.test.mjs',
    // 2026-10-23 R11 Task 12.1：操作结果反馈可信（作用域写等待 / 失败不报成功，纯 node）
    'feedback-integrity.test.mjs',
    'filter-row.test.mjs',
    'frontend-foundations-guard.test.mjs',
    'gold-accent-guard.test.mjs',
    'hex-hardcode-guard.test.mjs',
    // 2026-10-23 批次 505（Task 9）：hover/active/selected 三态、@media (hover:hover) 门控、静态行无 hover（纯 node）
    'hover-state-guard.test.mjs',
    'ia-critical-guard.test.mjs',
    // 2026-10-23 批次 507：跳转链接颜色单一源（`<a>` 不得用 Tailwind 蓝；`.link` 消费 softText，纯 node）
    'link-color-guard.test.mjs',
    'localstorage-key-guard.test.mjs',
    // 2026-10-23 R11 Task 12.1：弹窗交互闭环契约（提交中禁止关闭 / alert / onSubmit 契约，纯 node）
    'modal-contract.test.mjs',
    'modal-escape-guard.test.mjs',
    // 2026-10-24 批次 508：动效令牌 / 时长与属性白名单 / reduced-motion / .motion-* 四件套（纯 node）
    'motion-guard.test.mjs',
    'page-title-guard.test.mjs',
    'party-branch-directory-context.test.mjs',
    'party-branch-directory-guard.test.mjs',
    'party-workbench-layout.test.mjs',
    'perf-index-equivalence.test.mjs',
    'perf-render-guard.test.mjs',
    'perf-todo-agg-cache.test.mjs',
    'perf-version-token.test.mjs',
    'person-picker-density.test.mjs',
    'publicity-static-guard.test.mjs',
    'responsive-cards-guard.test.mjs',
    'roster-filter-guard.test.mjs',
    'round1-remediation-guard.test.mjs',
    'round3-4-batch1.test.mjs',
    'row-markup-guard.test.mjs',
    'self-evident-copy-guard.test.mjs',
    'small-text-guard.test.mjs',
    'spacing-scale-guard.test.mjs',
    'state-enum-guard.test.mjs',
    'structural-round3.test.mjs',
    'suite-shard.test.mjs',
    'tab-alias-guard.test.mjs',
    'tab-nav.test.mjs',
    'table-type-scale-guard.test.mjs',
    'text-tier-guard.test.mjs',
    // 2026-10-23 批次 505（Task 9）：7 主题 × 亮/暗 × 8 token 色板、对比度/彩度、固定语义色分离（纯 node）
    'theme-palette-guard.test.mjs',
    'ui-button-four-types.test.mjs',
    'ui-color-semantics.test.mjs',
    'ui-contrast-guard.test.mjs',
    // 2026-10-23 R11 Task 12.1：控件层单一源（SD-1/2/3/4/6/9/10 静态断言，纯 node）
    'ui-control-system-guard.test.mjs',
    'ui-custom-select.test.mjs',
    'ui-first-screen-order.test.mjs',
    'ui-focus-ring.test.mjs',
    'ui-help-note.test.mjs',
    'ui-home-deeplink.test.mjs',
    'ui-home-hero.test.mjs',
    'ui-modal-form-guard.test.mjs',
    // 2026-10-22 第九轮 Task 6：卡片悬停不得上浮/加阴影 ＋ transition-all 棘轮（纯 node）
    'ui-motion-guard.test.mjs',
    'ui-phase2-urgent.test.mjs',
    'ui-picker-focus.test.mjs',
    'ui-preflight-context.test.mjs',
    'ui-primary-cta-color.test.mjs',
    'ui-redundancy-guard.test.mjs',
    'ui-row-interaction.test.mjs',
    'ui-select-appearance-guard.test.mjs',
    'ui-tab-overflow.test.mjs',
    'ux-guard.test.mjs',
    'validation-site-coverage.test.mjs',
    'work-overview-layers.test.mjs',
    'workbench-audit-coverage.test.mjs',
    'workbench-revision-contract.test.mjs',
    'workflow-block-config.test.mjs',
  ]),
  // daily · 业务域回归 / 写链 / 事务 / 状态机
  ...group('daily', '业务域回归 / 写链 / 事务 / 状态机', [
    'activity-calendar-sharing.test.mjs',
    'activity-creation-transaction.test.mjs',
    'activity-delete-client.test.mjs',
    'activity-delete.test.mjs',
    'activity-party-group-assignment.test.mjs',
    'agenda-closure-core.test.mjs',
    'agenda-editing.test.mjs',
    'agenda-follow-up.test.mjs',
    'agenda-quorum.test.mjs',
    'agenda-relations.test.mjs',
    'agenda-votes.test.mjs',
    'attendance-batch.test.mjs',
    'attendance-matrix-model.test.mjs',
    'attendance-roster-union.test.mjs',
    'base-data-preview.test.mjs',
    'branch-affiliation.test.mjs',
    'branch-appoint-inline.test.mjs',
    'branch-appointment-atomic.test.mjs',
    'branch-config-audit.test.mjs',
    'branch-doc.test.mjs',
    'branch-module-catalog.test.mjs',
    'branch-resource-isolation.test.mjs',
    'branch-roster-import.test.mjs',
    'branch-status.test.mjs',
    'cross-group-activity-probe.test.mjs',
    'cross-group-recruitment.test.mjs',
    'empty-template.test.mjs',
    'group-view.test.mjs',
    'home-workgroup-progress.test.mjs',
    'inspection-workgroup-key.test.mjs',
    'issue-branch.test.mjs',
    'issue-mock-identity.test.mjs',
    'link-target-guard.test.mjs',
    'meeting-attendance-rules.test.mjs',
    'member-change-cross-session.test.js',
    'member-change-flow.test.js',
    'member-confirmation.test.mjs',
    'member-flow.test.mjs',
    'member-persist.test.mjs',
    'member-progress.test.mjs',
    'member-roster-api-read.test.mjs',
    'module-compose.test.mjs',
    'module-config.test.mjs',
    'module-cycle-remind.test.mjs',
    'notice-deeplink-guard.test.mjs',
    'notice-message.test.mjs',
    'org-config.test.mjs',
    'page-navigation-url.test.mjs',
    'party-group.test.mjs',
    'party-overview-model.test.mjs',
    'pending-writes.test.mjs',
    'person-profile-presentation.test.mjs',
    'person-profile-service.test.mjs',
    'report-branch-webhook.test.mjs',
    'report-count.test.mjs',
    'report.test.js',
    'resolution-followup.test.mjs',
    'roster-ui-logic.test.mjs',
    'roster.test.mjs',
    'scene-write-sync.test.mjs',
    'secretary-overview-attendance.test.mjs',
    'self-profile-import.test.mjs',
    'self-profile.test.mjs',
    'server-base.test.mjs',
    'setup-status.test.mjs',
    'signup-onsite-roster.test.mjs',
    'skeleton.test.js',
    'soft-void.test.mjs',
    'system-notice-branch-source.test.mjs',
    'taskforce-history-copy.test.mjs',
    'taskforce-lifecycle.test.mjs',
    // 2026-10-22 第九轮 Task 4.2：专班成员 / 贡献走工作组主源（纯 node）
    'taskforce-workgroup-source.test.mjs',
    'theme-pref.test.mjs',
    'thought-report-panel.test.mjs',
    'thought-review.test.mjs',
    'today-summary.test.mjs',
    'todo-deriver-domain.test.mjs',
    'todo-domain-view.test.mjs',
    'todo-domain.test.mjs',
    'todo-urgency.test.mjs',
    'todo-void-flow.test.mjs',
    'wizard-config.test.mjs',
    'wizard-report.test.mjs',
    'work-map.test.mjs',
    'workgroup-api.test.mjs',
    'workgroup-batch-adapter.test.mjs',
    'workgroup-member-editor.test.mjs',
    'workgroup-member-semantics.test.mjs',
    'write-path-guard.test.mjs',
  ]),
  // daily · 测试分层 / 预算 / 防假绿编排守卫
  ...group('daily', '测试分层 / 预算 / 防假绿编排守卫', [
    'test-tier-guard.test.mjs',
  ]),
  { file: 'a11y-tree.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：可访问性树真机核对' },
  { file: 'agenda-closure.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：议程闭环真机' },
  { file: 'agenda-flow.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：议程流转真机' },
  { file: 'async-vote.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：异步投票真机' },
  { file: 'attendance-queue-selection-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：纪检考勤队列选择真机流程' },
  { file: 'b3-1-makeup-writeback.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：补录回写真机' },
  { file: 'block-canvas-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块画布真机' },
  { file: 'block-config-ui-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块配置 UI 真机' },
  { file: 'block-entry-guard-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块入口守卫真机' },
  { file: 'block-manifest.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块清单真机' },
  { file: 'copy-anchor-guard-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：文案锚点真机' },
  { file: 'e2e-login.test.js', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：登录流程真机' },
  { file: 'form-loop-sweep.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：全站表单校验 / 载体闭环真机普查' },
  { file: 'help-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：帮助页真机' },
  { file: 'iaaa-ui-onboarding.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：IAAA 引导 UI 真机' },
  { file: 'inspection-loop-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：纪检闭环真机' },
  { file: 'issue-anonymity.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：议题匿名真机' },
  { file: 'link-integrity.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：链接完整性真机' },
  { file: 'list-filter-chip-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：列表筛选 chip 真机' },
  { file: 'mock-integrity.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：mock 完整性真机' },
  { file: 'module-config-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：模块配置真机' },
  { file: 'module-load.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：模块装载真机' },
  { file: 'multi-tab-sync.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：多标签同步真机' },
  { file: 'multi-user-write.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：多用户写入真机' },
  { file: 'online-committee.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：线上支委真机' },
  { file: 'page-sweep.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：全站分页 / 宽表 / 检索真机普查' },
  { file: 'party-committee-dispatch.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：党委台派发真机' },
  { file: 'party-committee-review.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：党委台审议真机' },
  { file: 'party-committee.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：党委台真机' },
  { file: 'preferences.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：偏好设置真机' },
  { file: 'records-endpoints.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：记录端点真机' },
  { file: 'relation-matrix.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：关系矩阵真机' },
  { file: 'self-profile-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：个人资料真机' },
  { file: 'today-action-groups-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：今日行动分组真机' },
  { file: 'write-grant-prompt-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：写权限提示真机' },
  { file: 'write-hover-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：写入悬停态真机' },
  { file: 'click-cost.test.mjs', tier: 'weekly', reason: '点击成本审计（慢速视觉 / 审计；weekly 频率，precommit/full 仍覆盖）' },
  { file: 'copy-screen-guard.test.mjs', tier: 'weekly', reason: '逐屏文案视觉普查（慢速视觉 / 审计；weekly 频率，precommit/full 仍覆盖）' },
];

// ── 纯函数（守卫与脚本共用；不读磁盘、不依赖 cwd）──────────────────────────
/** 按层取文件（保持登记顺序） */
export const filesByTier = (tier) => TEST_TIERS.filter((e) => e.tier === tier).map((e) => e.file);

export const dailyFiles = filesByTier('daily');
export const precommitFiles = filesByTier('precommit');
export const weeklyFiles = filesByTier('weekly');

/** 三层并集（去重前的原样数组；重复项由 `diffTiers` 判红） */
export const allRegisteredFiles = () => TEST_TIERS.map((e) => e.file);

/** 查某文件的层级；未登记返回 undefined */
export const tierOf = (file) => TEST_TIERS.find((e) => e.file === file)?.tier;

/** 判定源码是否 import playwright（与 `sweep-shard.mjs` 的 e2e 标记同口径） */
export const isPlaywrightSource = (src) => /from\s+['\"]playwright['\"]|import\(\s*['\"]playwright['\"]\s*\)/.test(src);

/** 静态 `test(` / `it(` 调用点计数（含 `t.test(`；预算与守卫共用同一口径） */
export const countTestCases = (src) => (src.match(/^\s*(?:await\s+)?(?:test|it|t\.test)\s*\(/gm) || []).length;

/**
 * 比较磁盘文件与登记表，返回 { missing, extra, duplicates }；
 * 纯函数（便于守卫以人为构造的差集自检，证明比较器不是恒真）。
 */
export function diffTiers(diskFiles, entries = TEST_TIERS) {
  const registered = entries.map((e) => e.file);
  const seen = new Set();
  const duplicates = [];
  for (const f of registered) {
    if (seen.has(f)) duplicates.push(f);
    seen.add(f);
  }
  const disk = new Set(diskFiles);
  const missing = [...disk].filter((f) => !seen.has(f)).sort();
  const extra = [...seen].filter((f) => !disk.has(f)).sort();
  return { missing, extra, duplicates: [...new Set(duplicates)].sort() };
}

/** 从 npm script 里解析显式 `test/xxx.test.mjs` 清单（与 `doc-consistency::S16` 同口径） */
export const parseScriptFiles = (cmd) => (String(cmd).match(/test\/[A-Za-z0-9_.-]+\.test\.m?js/g) || [])
  .map((x) => x.replace(/^test\//, ''));
