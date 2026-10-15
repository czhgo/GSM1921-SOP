import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('周期归档界面按期次日期混合排序并显示冻结规则标签', async () => {
  const source = await read('../../docs/src/entries/tabs/prop/weekly-tab.js');
  assert.match(source, /compareArchivePeriodDesc/);
  assert.match(source, /archivePolicySnapshot\?\.periodLabel/);
  assert.match(source, /archivePolicySnapshot\?\.periodRange/);
  const archive = await read('../../docs/src/entries/tabs/prop/archive-tab.js');
  assert.ok(/周期归档/.test(archive), 'archive view identifies periodic reporting as part of the archive capability');
  const overview = await read('../../docs/src/entries/tabs/secretary/overview-tab.js');
  assert.ok(/archivePolicySnapshot\?\.periodLabel/.test(overview), 'review queue displays the frozen period label');
});

test('党委支部配置默认收起，并在用户展开后才挂载配置向导', async () => {
  const source = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.ok(/<details id="branch-config-details"/.test(source), 'configuration is a collapsible details section');
  assert.ok(/configDetails\?\.addEventListener\('toggle',[\s\S]*mountConfigIfOpen\(\)/.test(source), 'opening triggers lazy mount');
  assert.ok(/if \(!configDetails\?\.open \|\| configDetails\.dataset\.mounted === 'true'\) return/.test(source), 'mount runs only while open and once per render');
  const mountCall = source.indexOf("mountPartyConfig({ wizardHost: el.querySelector('#pc-wizard-host')");
  const lazyGuard = source.lastIndexOf('const mountConfigIfOpen', mountCall);
  assert.ok(mountCall > lazyGuard && lazyGuard >= 0, 'mount call is inside the lazy-mount helper');
});

test('组织委员工作组页提供专班、活动工作组和报名总表的互斥视图', async () => {
  const source = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(source, /data-view="workgroups"[^>]*>专班工作组/);
  assert.match(source, /data-view="activities"[^>]*>活动工作组/);
  assert.match(source, /data-view="matrix"[^>]*>报名总表/);
  assert.match(source, /organizingScope/);
  assert.match(source, /const inspectionHtml = tfSubs\.inspection\.length \? ins\.shellHtml : ''/);
  assert.match(source, /if \(tfSubs\.inspection\.length\) \{[\s\S]*?renderFilteredList\(mount\.querySelector\('#tf-sub-host-inspection'\)/);
  assert.match(source, /const closedOutputCount = outputs\.filter/);
  assert.match(source, /全部任务与产出闭合后，才可以结束工作组/);
  assert.match(source, /btn-dissolve-tf[\s\S]*?closureReady/);
});

test('工作组结束入口不再保留绕过任务与产出闭合校验的直接归档按钮', async () => {
  const org = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const prop = await read('../../docs/src/entries/tabs/prop/kanban-tab.js');
  const taskforceService = await read('../../docs/src/services/activity/taskforce.js');
  assert.doesNotMatch(org, /tf-archive-btn|updateStatus\(tf\.id, 'archived'\)/);
  assert.doesNotMatch(prop, /tf-complete-btn|updateStatus\(tfId, 'archived'\)/);
  const transitionBlock = taskforceService.match(/const validTransitions = \{([\s\S]*?)\n    \};/)?.[1] || '';
  assert.match(transitionBlock, /recruiting:\s*\['active'\]/, 'ordinary flow can only start a recruiting group');
  assert.match(transitionBlock, /active:\s*\[\]/, 'running groups cannot bypass semantic close through updateStatus');
  const activeTransition = transitionBlock.match(/active:\s*\[([^\]]*)\]/)?.[1] || '';
  assert.doesNotMatch(activeTransition, /archived|dissolved/);
  assert.match(taskforceService, /update\(id, patch,[\s\S]*?status[\s\S]*?dissolved/, 'generic store updates also guard terminal transitions in mock mode');
});

test('专班招募创建走工作组语义 API，原始快照只承载后续可编辑字段', async () => {
  const tab = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const service = await read('../../docs/src/services/activity/taskforce.js');
  assert.match(tab, /const created = await TaskForceRecordStore\.create\(record\)/);
  assert.match(service, /async create\(record\)[\s\S]*?getAdapter\(\)\.taskforces\.create\(payload\)/);
});

test('支委会批准收尾后统一工作组主记录同步为已结束', async () => {
  const service = await read('../../docs/src/services/activity/taskforce.js');
  const start = service.indexOf('applyCommitteeDecision(tfId');
  const end = service.indexOf('\n  /**', start);
  const method = service.slice(start, end);
  assert.match(method, /decision === 'approved'/);
  assert.match(method, /mockDB\.workgroups = mockDB\.workgroups\.map/);
  assert.match(method, /status:\s*'dissolved'/);
});

test('工作组成员不再自动出现在纪检考察清单中', async () => {
  const disc = await read('../../docs/src/entries/tabs/disc/inspection-tab.js');
  assert.doesNotMatch(disc, /TaskForceRecordStore|_buildTaskforceRosterHTML/);
  assert.doesNotMatch(disc, /专班名单区（组织→纪检 自动同步/);
  const org = await read('../../docs/src/entries/tabs/org/inspection-tab.js');
  assert.match(org, /仅制度、议程或具体事项明确要求时录入/);
  assert.match(org, /工作组成员名单不会自动生成考察名单/);
});
