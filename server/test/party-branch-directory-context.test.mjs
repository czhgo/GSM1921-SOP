import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const source = async (path) => readFile(new URL(path, root), 'utf8');

test('党委支部目录只创建和选择；已有支部维护统一在所选支部配置上下文', async () => {
  const directory = await source('docs/src/entries/tabs/party-committee/branches-tab.js');
  const config = await source('docs/src/entries/pages/branch-config-entry.js');

  assert.match(directory, /createBranch/, '党委仍可从目录创建支部');
  assert.match(directory, /branch-readonly-enter/, '目录保留进入支部只读视图的入口');
  assert.doesNotMatch(directory, /renameBranch|appointSecretary|setBranchActive/,
    '目录不应提供改名、任命或状态变更写入口');
  assert.doesNotMatch(directory, /branch-rename|branch-appoint|branch-status-toggle|branch-roster-file/,
    '目录不应内嵌已有支部维护与名册导入');
  assert.match(config, /renameBranch/, '选中支部配置页保留改名能力');
  assert.match(config, /appointSecretary/, '选中支部配置页保留任命能力');
  assert.match(config, /setBranchActive/, '选中支部配置页保留状态维护能力');
  assert.match(config, /mountBranchRosterImport/, '空支部名册导入保留在配置上下文');
  assert.match(config, /branch-readonly\.html\?branchId=/, '只读下钻仍绑定到所选支部');
});
