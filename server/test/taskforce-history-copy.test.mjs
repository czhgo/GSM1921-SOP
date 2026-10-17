import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('旧工作量展示明确标为历史分工并与结构化任务产出分开', () => {
  const source = readFileSync(new URL('../../docs/src/entries/tabs/org/taskforce-tab.js', import.meta.url), 'utf8');
  assert.match(source, /历史分工记录/);
  assert.match(source, /不自动迁移/);
  assert.match(source, /工作产出/);
});

test('专班成员的新产出进入结构化产出接口，历史贡献字段只读保留', () => {
  const source = readFileSync(new URL('../../docs/src/components/record/taskforce-view.js', import.meta.url), 'utf8');
  assert.match(source, /历史分工记录/);
  assert.match(source, /createWorkgroupOutput/);
  assert.doesNotMatch(source, /TaskForceRecordStore\.addContributions/);
});
