import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('治理页面使用受约束的流动版心和共享卡片节奏', async () => {
  const styles = await read('../../docs/src/styles.css');
  const partyPage = await read('../../docs/workspace/party-committee.html');
  assert.match(styles, /\.layout-shell\s*\{[\s\S]*?width:\s*100%[\s\S]*?margin-inline:\s*auto/);
  assert.match(styles, /layout-shell--content[\s\S]*?72rem/);
  assert.match(styles, /layout-shell--wide[\s\S]*?80rem/);
  assert.match(styles, /layout-shell--form[\s\S]*?48rem/);
  assert.match(partyPage, /layout-shell layout-shell--wide/);
});

test('党委五个页签统一使用页面层级和白底业务分区', async () => {
  const paths = [
    '../../docs/src/entries/tabs/party-committee/governance-overview-tab.js',
    '../../docs/src/entries/tabs/party-committee/monitor-tab.js',
    '../../docs/src/entries/tabs/party-committee/branches-tab.js',
    '../../docs/src/entries/tabs/party-committee/review-tab.js',
    '../../docs/src/entries/tabs/party-committee/dispatch-tab.js',
  ];
  for (const path of paths) {
    const source = await read(path);
    assert.match(source, /class="party-page(?:\s|")/, `${path} has a consistent page wrapper`);
    assert.match(source, /class="card(?:\s|")/, `${path} uses the shared card for a meaningful section`);
  }
  const header = await read('../../docs/src/components/shell/header.js');
  assert.match(header, /role !== 'party-staff'/, '党委 does not get a personal-profile entry');
});

test('党委页内标签具备面板关联与方向键切换', async () => {
  const review = await read('../../docs/src/entries/tabs/party-committee/review-tab.js');
  const dispatch = await read('../../docs/src/entries/tabs/party-committee/dispatch-tab.js');
  for (const source of [review, dispatch]) {
    assert.match(source, /role="tab"[^>]*aria-controls=/);
    assert.match(source, /role="tabpanel"[^>]*aria-labelledby=/);
    assert.match(source, /event\.key === 'ArrowRight'/);
    assert.match(source, /event\.key === 'ArrowLeft'/);
    assert.match(source, /tabindex="\$\{[^}]*'-1'/);
  }
});

test('党委支部动态和目录用表格比较同类支部数据', async () => {
  const monitor = await read('../../docs/src/entries/tabs/party-committee/monitor-tab.js');
  const branches = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.match(monitor, /<table class="data-table"[\s\S]*?支部运行台账/);
  assert.match(branches, /<table class="data-table"[\s\S]*?支部目录/);
  for (const source of [monitor, branches]) {
    assert.match(source, /class="pc-table-scroll(?:\s|")/);
    assert.match(source, /<th scope="col"/);
  }
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
