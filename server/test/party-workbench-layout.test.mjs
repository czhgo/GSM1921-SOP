import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const PARTY_TABS = [
  'dispatch-tab.js',
  'review-tab.js',
  'branches-tab.js',
];
const partyTab = (name) => `../../docs/src/entries/tabs/party-committee/${name}`;

test('治理页面使用受约束的流动版心和共享卡片节奏', async () => {
  const styles = await read('../../docs/src/styles.css');
  const partyPage = await read('../../docs/workspace/party-committee.html');
  assert.match(styles, /\.layout-shell\s*\{[\s\S]*?width:\s*100%[\s\S]*?margin-inline:\s*auto/);
  assert.match(styles, /layout-shell--content[\s\S]*?72rem/);
  assert.match(styles, /layout-shell--wide[\s\S]*?80rem/);
  // 2026-10-19 口径同步：批次 467-471 已撤 `.layout-shell--form`（表单宽度改由 `.page-section--form` 承担）。
  assert.match(partyPage, /layout-shell layout-shell--wide/);
});

test('党委台只有一个页面标题，页签内容不重复页面标题', async () => {
  const page = await read('../../docs/workspace/party-committee.html');
  // 2026-10-22 第九轮 9B-6.1：H1＝顶栏品牌（`header.js` 渲染，全站唯一）⇒ 页内标题降为 H2。
  assert.equal((page.match(/<h1\b/g) || []).length, 0, '页面壳不得再渲染 <h1>（顶栏品牌是唯一 H1）');
  assert.match(page, /class="page-frame page-frame--wide"/);
  assert.match(page, /<h2 class="page-frame__title">党委工作台<\/h2>/, '页内标题须为 H2');
  assert.doesNotMatch(page, /返回主页/, '党委侧边栏无首页入口，页面不得出现指向首页的动作');
  assert.doesNotMatch(page, /page-frame__eyebrow|page-frame__description/, '页面级眉题与说明缀词已移除');

  const duplicatePageHeading = /<h2[^>]*>\s*(?:支部上报|支部管理|下发通知)\s*<\/h2>/;
  for (const name of PARTY_TABS) {
    const source = await read(partyTab(name));
    assert.doesNotMatch(source, /party-page/, `${name} 不再使用旧页面层级类`);
    assert.match(source, /page-section-stack/, `${name} 使用共享分区栈`);
    assert.doesNotMatch(source, duplicatePageHeading, `${name} 不重复页签级页面标题`);
  }
});

test('党委页签顺序为下发通知、支部上报、支部管理（A05/A06 合并后三项）', async () => {
  const registry = await read('../../docs/src/capabilities/party-committee-workspace.js');
  const order = [...registry.matchAll(/\{ id: '([^']+)', label: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(order, ['dispatch', 'review', 'branches']);
});

test('党委页头不提供个人档案入口', async () => {
  const header = await read('../../docs/src/components/shell/header.js');
  assert.match(header, /role !== 'party-staff'/, '党委 does not get a personal-profile entry');
});

test('党委页签名与页面身份一致（A05/A06 撤页后只剩三项）', async () => {
  const registry = await read('../../docs/src/capabilities/party-committee-workspace.js');
  assert.match(registry, /id: 'dispatch', label: '下发通知'/);
  assert.match(registry, /id: 'review', label: '支部上报'/);
  assert.match(registry, /id: 'branches', label: '支部管理'/);
  assert.doesNotMatch(registry, /id: 'monitor'/);
  assert.doesNotMatch(registry, /id: 'governance-overview'/);
  assert.doesNotMatch(registry, /支部监控台账/);

  const branches = await read(partyTab('branches-tab.js'));
  assert.match(branches, /renderSectionHeader/);
  assert.match(branches, /title: '支部目录'/);

  const page = await read('../../docs/workspace/party-committee.html');
  assert.doesNotMatch(page, /支部监控台账/);
});

test('党委三页共用页面骨架且不切换页面级版心', async () => {
  for (const name of PARTY_TABS) {
    const source = await read(partyTab(name));
    for (const legacy of ['page-frame--wide', 'page-frame--content', 'party-page--wide']) {
      assert.ok(!source.includes(legacy), `${name} 不切换页面级版心（${legacy}）`);
    }
  }
  const styles = await read('../../docs/src/styles.css');
  // 2026-10-19 口径同步（批次 467-471 已撤 `.party-page*` / `.page-section--reading`）：
  //   党委五页共用工作台骨架，版心单一源改为 `.layout-shell--content` / `.page-frame--content` 72rem；
  //   不再断言已不存在的 `.page-frame { max-width: 80rem }` 与 `.page-section--reading`。
  assert.match(styles, /\.layout-shell--content\s*\{[^}]*max-width:\s*72rem/);
  assert.match(styles, /\.page-frame--content\s*\{[^}]*max-width:\s*72rem/);
  assert.doesNotMatch(styles, /\.page-section--reading/, '旧版心类已撤，不得回潮');
  assert.match(styles, /\.page-section--form\s*\{[^}]*width:\s*70%[^}]*max-width:\s*none/);
  assert.match(styles, /@media \(max-width: 768px\) \{[\s\S]*?\.page-section--form\s*\{\s*width:\s*100%/);
  assert.match(styles, /\.data-table--compare\s*\{[^}]*width:\s*auto/);
});

test('党委异常行有明确动作，页头不重复页签导航', async () => {
  // A06：原「治理总览」的组织待补已并入支部管理的「组织提醒」列（不另建页）。
  const branches = await read(partyTab('branches-tab.js'));
  assert.match(branches, /branch-config\.html\?branchId=/);
  assert.match(branches, /待任命支书/);
  assert.doesNotMatch(branches, /党委治理入口/);
  assert.doesNotMatch(branches, /\?tab=monitor/, '旧页头导航已删除');
});

test('党委二级切换使用从属样式', async () => {
  for (const name of ['review-tab.js', 'dispatch-tab.js']) {
    const source = await read(partyTab(name));
    assert.match(source, /class="subtabs"/, `${name} 使用从属二级切换容器`);
    assert.match(source, /class="subtab"/, `${name} 使用从属二级切换按钮`);
    assert.doesNotMatch(source, /border-red-700/, `${name} 不再与一级页签争夺强调色`);
  }
  const styles = await read('../../docs/src/styles.css');
  assert.match(styles, /\.subtabs\s*\{/);
  assert.match(styles, /\.subtab\[aria-selected="true"\]\s*\{/);
});

test('党委页内标签具备面板关联与方向键切换', async () => {
  const review = await read(partyTab('review-tab.js'));
  const dispatch = await read(partyTab('dispatch-tab.js'));
  for (const source of [review, dispatch]) {
    assert.match(source, /role="tab"[^>]*aria-controls=/);
    assert.match(source, /role="tabpanel"[^>]*aria-labelledby=/);
    assert.match(source, /event\.key === 'ArrowRight'/);
    assert.match(source, /event\.key === 'ArrowLeft'/);
    assert.match(source, /tabindex="\$\{[^}]*'-1'/);
  }
});

test('党委支部管理用表格比较同类支部数据', async () => {
  const branches = await read(partyTab('branches-tab.js'));
  assert.match(branches, /<table class="data-table data-table--compare"[\s\S]*?支部目录/);
  assert.match(branches, /class="pc-table-scroll(?:\s|")/);
  assert.match(branches, /<th scope="col"/);
  assert.match(await read('../../docs/src/styles.css'), /\.pc-table-scroll\s*\{[^}]*overflow-x:\s*auto/);
});

test('支部配置以紧凑导航切换单一活动面板', async () => {
  const page = await read('../../docs/branch-config.html');
  const entry = await read('../../docs/src/entries/pages/branch-config-entry.js');
  const wizard = await read('../../docs/src/components/governance/org-setup-wizard.js');
  const styles = await read('../../docs/src/styles.css');
  assert.match(page, /id="branch-config-nav"/);
  assert.match(page, /id="branch-config-section-select"/);
  assert.match(page, />设置领域</);
  assert.match(entry, /data-config-nav/);
  assert.match(entry, /aria-current/);
  assert.match(entry, /new PersonPicker/);
  assert.match(entry, /person\.branchId === branchId/);
  assert.match(styles, /#branch-secretary-picker \.person-picker-wrapper\s*\{\s*width:\s*100%/);
  assert.match(styles, /#branch-secretary-picker \.person-picker-trigger\s*\{\s*width:\s*100%/);
  assert.match(page, /data-config-panel/);
  assert.match(entry, /panel\.hidden/);
  assert.match(wizard, /card p-5 org-config-step-panel/);
  assert.match(wizard, /aria-label="业务配置步骤"/);
  assert.match(styles, /org-config-step-panel > \.space-y-4 > \.rounded-xl\.border/);
});

test('支部配置用内容区范围胶囊承载当前支部，不再使用页面级眉题', async () => {
  const page = await read('../../docs/branch-config.html');
  assert.match(page, /class="page-scope" id="branch-config-scope" aria-live="polite"/);
  assert.doesNotMatch(page, /page-frame__eyebrow|page-frame__description/);
});

test('窄屏折叠导航完整移出固定标题栏', async () => {
  const styles = await read('../../docs/src/styles.css');
  assert.ok(styles.includes('transform: translateY(calc(-100% - 56px))'), 'mobile sidebar clears the fixed 56px header');
});

test('支部只读名册提供可筛选分页的语义表格和独立活动区', async () => {
  const page = await read('../../docs/workspace/branch-readonly.html');
  const entry = await read('../../docs/src/entries/pages/branch-readonly-entry.js');
  assert.match(page, /layout-shell layout-shell--wide/);
  assert.match(entry, /id="branch-member-search"/);
  assert.match(entry, /id="branch-member-group-filter"/);
  assert.match(entry, /id="branch-member-stage-filter"/);
  assert.match(entry, /<table class="data-table"[\s\S]*?成员名册/);
  assert.match(entry, /<th scope="col"/);
  assert.match(entry, /PAGE_SIZE/);
  assert.match(entry, /id="branch-activity-heading"/);
});
