// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test-tier-registry.mjs — 测试分层**单一源**
//  （B-499-5 · Task 9 建表；2026-11-08 批次 537 按支书裁定改四层「结果优先、守卫按需」）
//
//  四层口径（互不重叠、并集 = 磁盘全部 `server/test/*.test.{js,mjs}`）：
//    · daily     —— 结果门禁，每次改完必跑（墙钟目标 ≤75s）。只回答「结果对不对」：
//                   服务启动 / 登录与会话 / 权限与写门 / 数据契约与迁移 / 核心业务结果
//                   （党委内容 / 公开门厅 / 名册 / 考勤 / 待办派生）/ 构建可运行。
//    · guards    —— 静态守卫，按需跑（`npm run test:guards` 或按改动面 `npm run test:changed`）。
//                   CSS / 字号 / 间距 / 颜色 / 动效 / 结构 / 文案 / 文档 / 行号 / 页签密度。
//    · precommit —— 提交前 / 发布前：daily + guards + 非核心域回归 + Playwright e2e。
//    · weekly    —— 更慢的视觉 / 审计普查；precommit 与 full 仍覆盖（不因分层丢判据）。
//
//  约束（由 `test-tier-guard.test.mjs` 机械核对）：
//    ① 磁盘测试文件 ↔ 四层并集**双向相等**；四层互不重叠；
//    ② 不 import playwright 的纯 node 测试必须在 daily / guards / precommit，**不得在 weekly**
//       （`doc-consistency::S16` 同口径）；
//    ③ daily 不含 page-sweep / form-loop-sweep / 任何 `*-e2e`；
//    ④ daily / guards 各自的文件数与静态 `test(` 调用点数不得高于下方预算常量。
//
//  本文件只做数据 + 纯函数：不改判据、不删测试。分层只决定「哪一层跑」，不决定「跑不跑」
//  （precommit / full 仍覆盖全部文件）。
// ════════════════════════════════════════════════════════════════

/** 层级名（顺序即执行频次：daily → guards → precommit → weekly） */
export const TIERS = ['daily', 'guards', 'precommit', 'weekly'];

/** fixture 数据面四类（2026-10-26 Task 6）：
 *  · memory        —— `:memory:` 库 / 纯函数 / 临时 mkdtemp 后即删；
 *  · tmp           —— 临时库或临时目录（`mkdtemp` / `:memory:` + `listen(0)`），测试后不留运行库；
 *  · external-read —— 连外部 `:3000` 服务**只读**审计（依赖已起服务；不起则红属环境类）；
 *  · external-write—— 连外部 `:3000` **写入**（必须 `DB_PATH != server/data.db` 或有 `finally` 清理证据）。
 */
export const FIXTURE_CLASSES = ['memory', 'tmp', 'external-read', 'external-write'];

/** 按层的缺省 fixtureClass（显式字段优先；见 `fixtureClassOf`） */
export const DEFAULT_FIXTURE_CLASS = { daily: 'memory', guards: 'memory', precommit: 'tmp', weekly: 'tmp' };

/** 查某测试文件的 fixtureClass；未登记返回 undefined。显式 `fixtureClass` → 层缺省。 */
export const fixtureClassOf = (file) => {
  const entry = TEST_TIERS.find((e) => e.file === file);
  if (!entry) return undefined;
  return entry.fixtureClass || DEFAULT_FIXTURE_CLASS[entry.tier];
};

/** 四类各自的文件清单（守卫与报告共用） */
export const filesByFixtureClass = (fixtureClass) => TEST_TIERS
  .filter((e) => fixtureClassOf(e.file) === fixtureClass)
  .map((e) => e.file);

/** daily 文件数预算（新增 daily 测试须同批上调并写明理由）
 *  2026-11-08 批次 537（`D-859`「结果优先、守卫按需」）：daily 由「全部纯 node」收敛为结果门禁白名单；
 *    不删任何测试文件 / 断言，只改分层与触发方式。
 *  2026-11-08 波次 A（daily 墙钟收口）：43 → **25 文件 / 187 断言**——六个静态守卫
 *    （`public-brand-guard` / `public-portal-leak-guard` / `import-path-guard` / `test-tier-guard` /
 *    `test-isolation-guard` / `contract-doc-guard`）迁 guards；十二个非核心结果回归
 *    （`write-policy-gaps` / `notice-audience` / `seed-baseline` / `branch-roster-import` /
 *    `member-change-flow` / `member-change-cross-session` / `activity-creation-transaction` /
 *    `attendance-roster-union` / `attendance-batch` / `inspection-workgroup-key` / `run-mode` /
 *    `version-stamp`）迁 precommit（判据不丢：precommit / full 仍覆盖）。
 *    `version-stamp` 按 `--timing` 实测最慢（23.0s）且不属业务结果，按「最慢非关键件移 precommit」处理。
 *    按实然值 27 登记。
 *  2026-11-15 六维补齐 T2：新增 `observability`（结构化日志脱敏 ＋ 浅/深健康检查为结果门禁）⇒
 *    实测 30 文件，按 30 登记。 */
export const DAILY_FILE_BUDGET = 30;

/** daily 静态 `test(` / `it(` 调用点预算（含子测试；新增断言须同批上调并写明理由）
 *  2026-11-08 波次 A：实测 187，按 189 登记（留 2 条余量；结果门禁上限 220）。
 *  2026-11-08 波次 B/E/G：并入 security-hardening / multi-branch-read-filter / personal-password，
 *    并把 auth-password 移 precommit；实测 207，按 209 登记。
 *  2026-11-15 六维补齐 T2：新增 `observability` 4 条断言（脱敏 / 5xx 串联 / 两级健康 / 反例）⇒
 *    实测 247，按 248 登记（留 1 条余量）。 */
export const DAILY_TEST_BUDGET = 248;

/** guards 文件数预算（静态守卫；按需跑，不阻塞日常）
 *  2026-11-08 波次 A：daily 迁入 6 件 ⇒ 实测 99 文件，按 99 登记。
 *  2026-11-15 `close-six-dim-gaps` T10：新增 `a11y-guard.test.mjs`（可访问性常驻静态守卫），
 *    实然 108 文件；按 111 登记——同批可能还有其它守卫件并入，留 ≤4 文件余量（`test-tier-guard::T4`）。 */
export const GUARDS_FILE_BUDGET = 111;

/** guards 静态 `test(` / `it(` 调用点预算
 *  2026-11-08 波次 A：实测 788 断言，按 791 登记（断言留 3 条余量）。
 *  2026-11-15 `close-six-dim-gaps` T10：`a11y-guard` 增 2 条静态 `test(` 调用点（扫描面自检 ＋ 六条判据合并一项），
 *    实然 824；按 860 登记——同批可能有其它守卫断言并入，留 ≤40 条余量（`test-tier-guard::T4`）。 */
export const GUARDS_TEST_BUDGET = 860;

const group = (tier, reason, list) => list.map((file) => ({ file, tier, reason }));

/** 全量分层登记表：每条 = { file, tier, reason } */
export const TEST_TIERS = [
  // ── daily · 结果门禁（只回答「结果对不对」）──────────────────────────────
  ...group('daily', '结果门禁 · 运行 / 登录 / 会话 / 权限 / 写门结果', [
    'server-base.test.mjs',
    'auth.test.js',
    'personal-password.test.mjs',
    'session-ttl.test.mjs',
    'permission-gate.test.mjs',
    'r3-data-permission-regression.test.mjs',
    'write-policy-matrix.test.mjs',
    'security-redteam.test.mjs',
    // 2026-11-08 批次 537 波次 1（另一代理）：公开面写口收口（结果门禁）
    'public-write-closure.test.mjs',
    'security-hardening.test.mjs',
    // 2026-11-15 六维补齐 T2：结构化日志（脱敏 / 请求 id）＋ 两级健康检查（结果门禁）
    'observability.test.mjs',
  ]),
  ...group('daily', '结果门禁 · 数据契约 / 迁移 / 种子结果', [
    'data-contract.test.mjs',
    'db-integrity-guard.test.mjs',
    'db-migration.test.mjs',
    'seed-contract-guard.test.mjs',
  ]),
  ...group('daily', '结果门禁 · 支部 / 名册 / 成员变更结果', [
    'branch-resource-isolation.test.mjs',
    'member-persist.test.mjs',
    'multi-branch-read-filter.test.mjs',
  ]),
  ...group('daily', '结果门禁 · 公开面 / 党委内容结果', [
    'public-portal.test.mjs',
    'committee-activities.test.mjs',
    'committee-public-notices.test.mjs',
    'committee-multidomain.test.mjs',
    'committee-owner-scope.test.mjs',
    'activity-adoption.test.mjs',
    'notice-emphasis-limit.test.mjs',
  ]),
  ...group('daily', '结果门禁 · 待办派生结果', [
    'todo-groups-api.test.mjs',
    'todo-derive-parity.test.mjs',
    'todo-jump-contract.test.mjs',
    'agenda-classify.test.mjs',
  ]),
  ...group('daily', '结果门禁 · 构建可运行', [
    'esm-parse-guard.test.mjs',
  ]),

  // ── guards · 静态守卫（按需跑；precommit / full 仍全量覆盖）─────────────
  ...group('guards', '静态样式守卫 · 字号 / 间距 / 颜色 / 动效 / 交互态 / 密度 / 文案', [
    'icon-color-guard.test.mjs',
    'table-contract-guard.test.mjs',
    'action-row-wrap-guard.test.mjs',
    'activity-tone-guard.test.mjs',
    'card-summary-hero-guard.test.mjs',
    'container-width-guard.test.mjs',
    'density-spacing-guard.test.mjs',
    'field-shell-guard.test.mjs',
    'hex-hardcode-guard.test.mjs',
    'hover-state-guard.test.mjs',
    'lf-bar-structure-guard.test.mjs',
    'link-color-guard.test.mjs',
    'loading-experience-guard.test.mjs',
    'motion-guard.test.mjs',
    'nested-interaction-guard.test.mjs',
    'page-title-guard.test.mjs',
    'responsive-cards-guard.test.mjs',
    'row-markup-guard.test.mjs',
    'spacing-scale-guard.test.mjs',
    'status-color-guard.test.mjs',
    'theme-palette-guard.test.mjs',
    'theme-pref.test.mjs',
    'touch-target-guard.test.mjs',
    'type-scale-guard.test.mjs',
    'ux-guard.test.mjs',
    'copy-guard.test.mjs',
    'filter-row.test.mjs',
    'committee-meeting-density.test.mjs',
    'committee-tab-density.test.mjs',
    'person-picker-density.test.mjs',
    'party-workbench-layout.test.mjs',
    'work-overview-layers.test.mjs',
    'ui-button-four-types.test.mjs',
    'ui-color-semantics.test.mjs',
    'ui-contrast-guard.test.mjs',
    'ui-control-system-guard.test.mjs',
    'ui-custom-select.test.mjs',
    'ui-first-screen-order.test.mjs',
    'ui-focus-ring.test.mjs',
    'ui-help-note.test.mjs',
    'ui-home-deeplink.test.mjs',
    'ui-home-hero.test.mjs',
    'ui-motion-guard.test.mjs',
    'ui-phase2-urgent.test.mjs',
    'ui-picker-focus.test.mjs',
    'ui-preflight-context.test.mjs',
    'ui-primary-cta-color.test.mjs',
    'ui-redundancy-guard.test.mjs',
    'ui-row-interaction.test.mjs',
    'ui-select-appearance-guard.test.mjs',
    'ui-tab-overflow.test.mjs',
  ]),
  ...group('guards', '静态结构 / UI / 路由 / 写链结构守卫', [
    'archive-action-guard.test.mjs',
    'archive-deeplink-guard.test.mjs',
    'branch-id-literal-guard.test.mjs',
    'committee-adoption-ui.test.mjs',
    'committee-content-tab.test.mjs',
    'dead-selector-guard.test.mjs',
    'feedback-integrity.test.mjs',
    'frontend-foundations-guard.test.mjs',
    'handoff-state-guard.test.mjs',
    'ia-critical-guard.test.mjs',
    'identity-student-id-guard.test.mjs',
    // 2026-11-08 波次 A：daily 迁入（静态解析 / 分层自检，不属结果门禁）
    'import-path-guard.test.mjs',
    'test-isolation-guard.test.mjs',
    'test-tier-guard.test.mjs',
    'link-target-guard.test.mjs',
    'localstorage-key-guard.test.mjs',
    'modal-guard.test.mjs',
    'no-about-route-guard.test.mjs',
    'no-underline-guard.test.mjs',
    'notice-deeplink-guard.test.mjs',
    'object-route-guard.test.mjs',
    'object-model-guard.test.mjs',
    'committee-proposal-state.test.mjs',
    'party-branch-directory-context.test.mjs',
    'party-branch-directory-guard.test.mjs',
    'perf-guard.test.mjs',
    // 2026-11-08 波次 A：daily 迁入（公开面品牌 / 泄露静态扫描）
    'public-brand-guard.test.mjs',
    'public-portal-leak-guard.test.mjs',
    'publicity-static-guard.test.mjs',
    'roster-filter-guard.test.mjs',
    'round1-remediation-guard.test.mjs',
    'round3-4-batch1.test.mjs',
    'runtime-tab-lifecycle-guard.test.mjs',
    'state-enum-guard.test.mjs',
    'structural-round3.test.mjs',
    'suite-shard.test.mjs',
    'tab-alias-guard.test.mjs',
    'taskforce-history-copy.test.mjs',
    'validation-site-coverage.test.mjs',
    'prop-kanban-scope.test.mjs',
    'workbench-audit-coverage.test.mjs',
    'workbench-revision-contract.test.mjs',
    'write-path-guard.test.mjs',
    'write-policy-evidence-guard.test.mjs',
    'write-truth-guard.test.mjs',
  ]),
  ...group('guards', '静态可访问性守卫（可访问名 / 表单标签 / section / tab / role=button / 图标钮）', [
    // 2026-11-15 `close-six-dim-gaps` T10：六条可静态判定的 a11y 底线，存量按 a11y-baseline 只减不增
    'a11y-guard.test.mjs',
  ]),
  ...group('guards', '静态文档 / 台账 / 行号 / 冻结件守卫', [
    'about-freeze-guard.test.mjs',
    'claude-parallel-audit.test.mjs',
    // 2026-11-08 波次 A：daily 迁入（测试与契约文档一致性）
    'contract-doc-guard.test.mjs',
    'ctx-hygiene-guard.test.mjs',
    'data-lifecycle-guard.test.mjs',
    'date-canon-guard.test.mjs',
    'mock-import-guard.test.mjs',
    'roster-denominator-guard.test.mjs',
    'demo-window-guard.test.mjs',
    'doc-consistency.test.mjs',
    'docs-governance-guard.test.mjs',
  ]),

  // ── precommit · 非核心域回归（提交前 / 发布前覆盖；进 daily 会拖长日常）─────
  ...group('precommit', '纯 node 域回归（非结果门禁核心；提交前 / 发布前跑）', [
    'account-rename.test.mjs',
    'auth-password.test.mjs',
    'activity-block-gate.test.mjs',
    'activity-calendar-sharing.test.mjs',
    'activity-delete-client.test.mjs',
    'activity-delete.test.mjs',
    'activity-member-privacy.test.mjs',
    'activity-party-group-assignment.test.mjs',
    'activity-workgroup-sync.test.mjs',
    'agenda-closure-core.test.mjs',
    'agenda-editing.test.mjs',
    'agenda-follow-up.test.mjs',
    'agenda-quorum.test.mjs',
    'agenda-relations.test.mjs',
    'agenda-votes.test.mjs',
    'archive-record-write.test.mjs',
    'attendance-matrix-model.test.mjs',
    'auth-audit-scope.test.mjs',
    'backup-restore.test.mjs',
    'base-data-preview.test.mjs',
    'block-field-policy.test.mjs',
    'block-orchestration.test.mjs',
    'branch-affiliation.test.mjs',
    'branch-appoint-inline.test.mjs',
    'branch-appointment-atomic.test.mjs',
    'branch-config-audit.test.mjs',
    'branch-doc.test.mjs',
    'branch-module-catalog.test.mjs',
    'branch-status.test.mjs',
    'capability-package-catalog.test.mjs',
    'capability-registry.test.mjs',
    'catalog-sync.test.mjs',
    'cross-group-activity-probe.test.mjs',
    'cross-group-recruitment.test.mjs',
    'empty-template.test.mjs',
    'group-view.test.mjs',
    'home-workgroup-progress.test.mjs',
    'iaaa-onboarding.test.mjs',
    'id-uniqueness.test.mjs',
    'inspection-write-gate.test.mjs',
    'issue-audience-projection.test.mjs',
    'issue-branch-policy.test.mjs',
    'issue-branch.test.mjs',
    'issue-mock-identity.test.mjs',
    'material-link-truth.test.mjs',
    'meeting-attendance-rules.test.mjs',
    'member-confirmation.test.mjs',
    'member-flow.test.mjs',
    'member-progress.test.mjs',
    'member-roster-api-read.test.mjs',
    'mock-api-parity-structure.test.mjs',
    'mock-api-parity.test.mjs',
    'mock-multi-branch.test.mjs',
    'module-compose.test.mjs',
    'module-config.test.mjs',
    'module-cycle-remind.test.mjs',
    'module-owner-authz.test.mjs',
    'notice-audience-failclosed.test.mjs',
    'notice-message.test.mjs',
    'org-config.test.mjs',
    'output-block-policy.test.mjs',
    'page-navigation-url.test.mjs',
    'participant-scope.test.mjs',
    'party-group.test.mjs',
    'party-overview-model.test.mjs',
    'pending-writes.test.mjs',
    'periodic-archive-api.test.mjs',
    'periodic-archive-migration.test.mjs',
    'periodic-archive-policy.test.mjs',
    'periodic-archive-scope.test.mjs',
    'person-consistency.test.mjs',
    'person-profile-presentation.test.mjs',
    'person-profile-service.test.mjs',
    'policy-config.test.mjs',
    'report-branch-webhook.test.mjs',
    'report-count.test.mjs',
    'report.test.js',
    'reset-tier-init.test.mjs',
    'reset-tier.test.mjs',
    'resolution-followup.test.mjs',
    'roles-sync.test.mjs',
    'roster-ui-logic.test.mjs',
    'roster.test.mjs',
    'round3-4-security.test.mjs',
    'scene-write-sync.test.mjs',
    'schema-split-gate.test.mjs',
    'schema-split-shadow.test.mjs',
    'secretary-overview-attendance.test.mjs',
    'seed-drift.test.mjs',
    'self-profile-import.test.mjs',
    'self-profile.test.mjs',
    'setup-status.test.mjs',
    'signup-onsite-roster.test.mjs',
    'skeleton.test.js',
    'soft-void.test.mjs',
    'system-notice-branch-source.test.mjs',
    'system-notice-project-auth-authorize.test.mjs',
    'tab-nav.test.mjs',
    'taskforce-lifecycle.test.mjs',
    'taskforce-workgroup-source.test.mjs',
    'thought-report-panel.test.mjs',
    'thought-review.test.mjs',
    'today-summary.test.mjs',
    'todo-branch-attribution.test.mjs',
    'todo-cross-role-safety.test.mjs',
    'todo-deriver-domain.test.mjs',
    'todo-domain-view.test.mjs',
    'todo-domain.test.mjs',
    'todo-realtime-source.test.mjs',
    'todo-role-write-gate.test.mjs',
    'todo-urgency.test.mjs',
    'todo-void-flow.test.mjs',
    'wizard-config.test.mjs',
    'wizard-report.test.mjs',
    'work-map.test.mjs',
    'workflow-block-config.test.mjs',
    'workforce-gate.test.mjs',
    'workgroup-api.test.mjs',
    'workgroup-batch-adapter.test.mjs',
    'workgroup-branch-scope.test.mjs',
    'workgroup-member-editor.test.mjs',
    'workgroup-member-grant-revoke.test.mjs',
    'workgroup-member-semantics.test.mjs',
  ]),

  // ── precommit · 原 daily 业务回归（2026-11-08 波次 A 降频；判据不丢，日常墙钟收口）───
  ...group('precommit', '原 daily 业务回归（波次 A 降频：进 precommit 保留判据，不占日常墙钟）', [
    'activity-creation-transaction.test.mjs',
    'attendance-batch.test.mjs',
    'attendance-roster-union.test.mjs',
    'branch-roster-import.test.mjs',
    'inspection-workgroup-key.test.mjs',
    'member-change-cross-session.test.js',
    'member-change-flow.test.js',
    'notice-audience.test.mjs',
    'run-mode.test.mjs',
    'seed-baseline.test.mjs',
    'version-stamp.test.mjs',
    'write-policy-gaps.test.mjs',
  ]),

  // ── precommit · 真机浏览器 e2e（shared :3000 与自托管混排）─────────────────
  ...group('precommit', '真机浏览器 e2e（precommit 全量；发布前必跑）', [
    'a11y-tree.test.mjs',
    'agenda-closure.test.mjs',
    'agenda-flow.test.mjs',
    'async-vote.test.mjs',
    'attendance-queue-selection-e2e.test.mjs',
    'b3-1-makeup-writeback.test.mjs',
    'block-canvas-e2e.test.mjs',
    'block-config-ui-e2e.test.mjs',
    'block-entry-guard-e2e.test.mjs',
    'block-manifest.test.mjs',
    'copy-anchor-guard-e2e.test.mjs',
    'e2e-login.test.js',
    'form-loop-sweep.test.mjs',
    'help-e2e.test.mjs',
    'committee-proposal-routes.test.mjs',
    'committee-flow-guard.test.mjs',
    'committee-meeting-gate.test.mjs',
    'leader-progress-gate.test.mjs',
    'report-read-gate.test.mjs',
    'issue-unread-gate.test.mjs',
    'iaaa-ui-onboarding.test.mjs',
    'inspection-loop-e2e.test.mjs',
    'issue-anonymity.test.mjs',
    'link-integrity.test.mjs',
    'list-filter-chip-e2e.test.mjs',
    'module-config-e2e.test.mjs',
    'module-load.test.mjs',
    'multi-tab-sync.test.mjs',
    'multi-user-write.test.mjs',
    'online-committee.test.mjs',
    'page-sweep.test.mjs',
    'page-error-smoke.test.mjs',
    'party-committee-dispatch.test.mjs',
    'party-committee-review.test.mjs',
    'party-committee.test.mjs',
    'preferences.test.mjs',
    'records-endpoints.test.mjs',
    'relation-matrix.test.mjs',
    'self-profile-e2e.test.mjs',
    'today-action-groups-e2e.test.mjs',
    'write-grant-prompt-e2e.test.mjs',
    'write-hover-e2e.test.mjs',
  ]),

  // ── weekly · 慢速视觉 / 审计普查（precommit / full 仍覆盖）────────────────
  { file: 'click-cost.test.mjs', tier: 'weekly', fixtureClass: 'external-read', reason: '点击成本审计（慢速视觉 / 审计；weekly 频率，precommit/full 仍覆盖；连 :3000 只读审计）' },
  { file: 'copy-screen-guard.test.mjs', tier: 'weekly', reason: '逐屏文案视觉普查（慢速视觉 / 审计；weekly 频率，precommit/full 仍覆盖）' },

  // ── 数据面非层缺省的显式登记（fixtureClass 与所在层缺省不同，必须写死）────────
  { file: 'mock-integrity.test.mjs', tier: 'precommit', fixtureClass: 'external-read', reason: '真机浏览器 e2e（precommit 全量）：mock 完整性真机（连 :3000 只读审计，非 tmp）' },
];

// ── 纯函数（守卫与脚本共用；不读磁盘、不依赖 cwd）──────────────────────────
/** 按层取文件（保持登记顺序） */
export const filesByTier = (tier) => TEST_TIERS.filter((e) => e.tier === tier).map((e) => e.file);

export const dailyFiles = filesByTier('daily');
export const guardsFiles = filesByTier('guards');
export const precommitFiles = filesByTier('precommit');
export const weeklyFiles = filesByTier('weekly');

/** 四层并集（去重前的原样数组；重复项由 `diffTiers` 判红） */
export const allRegisteredFiles = () => TEST_TIERS.map((e) => e.file);

/** 查某文件的层级；未登记返回 undefined */
export const tierOf = (file) => TEST_TIERS.find((e) => e.file === file)?.tier;

/** 判定源码是否 import playwright（与 `sweep-shard.mjs` 的 e2e 标记同口径） */
export const isPlaywrightSource = (src) => /from\s+['"]playwright['"]|import\(\s*['"]playwright['"]\s*\)/.test(src);

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
