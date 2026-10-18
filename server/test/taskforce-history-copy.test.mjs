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

test('专班详情四对象各一顶层区，打开后锚定被点卡片并标 aria-current', () => {
  const source = readFileSync(new URL('../../docs/src/entries/tabs/org/taskforce-tab.js', import.meta.url), 'utf8');
  // 四个对象各自一个 section + h3 分区标题（16px = text-base）
  for (const label of ['成员与授权', '任务与产出', '历史分工', '核验与代录']) {
    assert.match(source, new RegExp(`sectionHead\\('[^']+', '${label}'\\)`), `缺少顶层分区：${label}`);
  }
  assert.match(source, /aria-labelledby="tf-section-roles"/);
  assert.match(source, /aria-labelledby="tf-section-tasks"/);
  assert.match(source, /aria-labelledby="tf-section-work"/);
  assert.match(source, /aria-labelledby="tf-section-verify"/);
  assert.match(source, /sectionHead = \(id, label\) => `<h3[^>]*text-base/, '分区标题须为 16px h3');
  // 触点即落点：被点卡片 aria-current + 滚入视野；详情紧贴卡片
  assert.match(source, /setAttribute\('aria-current', 'true'\)/);
  assert.match(source, /triggerEl\.scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(source, /anchorDetailToTrigger\(panel, triggerEl/);
  // 历史分工与逐条核验各有独立容器（不再叠在同一块）
  assert.match(source, /id="tf-sec-work"/);
  assert.match(source, /id="tf-sec-verify"/);
});
