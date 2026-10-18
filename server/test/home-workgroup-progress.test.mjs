// role: [工程师]+[AI]
// home-workgroup-progress.test.mjs — 首页「工作组进展」口径守卫（2026-10-18 · Spec Task 8）
//
// 判据：
//   H1 index.html 含「工作组进展」，且不再出现旧标题「专班进展」；
//   H2 taskforce-list.js 同时处理 kind === 'activity' 与 kind === 'taskforce' 两类；
//   H3 任务完成数读 workgroupTasks：completed 为分子，分母排除 cancelled；
//   H4 不再用 capacity 报名填充率冒充进度（源码无 pct / capacity）；
//   H5 卡内组名「活动工作组」「专班工作组」齐备。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = join(ROOT, 'docs', 'index.html');
const SRC = join(ROOT, 'docs', 'src', 'components', 'dashboard', 'taskforce-list.js');

const indexHtml = readFileSync(INDEX, 'utf8');
const source = readFileSync(SRC, 'utf8');

test('H1 首页标题为「工作组进展」，旧标题「专班进展」不再出现', () => {
  assert.ok(indexHtml.includes('工作组进展'), 'index.html 缺「工作组进展」标题');
  assert.ok(!indexHtml.includes('专班进展'), 'index.html 仍残留旧标题「专班进展」');
});

test('H2 同时处理活动工作组与专班工作组两类', () => {
  assert.match(source, /kind === 'activity'/, 'taskforce-list.js 未处理 kind === \'activity\'');
  assert.match(source, /kind === 'taskforce'/, 'taskforce-list.js 未处理 kind === \'taskforce\'');
});

test('H3 任务完成数读 workgroupTasks，分母排除 cancelled', () => {
  assert.match(source, /workgroupTasks/, 'taskforce-list.js 未读 workgroupTasks');
  assert.match(source, /status === 'completed'/, 'taskforce-list.js 未统计 completed 任务');
  assert.match(source, /status !== 'cancelled'/, 'taskforce-list.js 未把 cancelled 排除出任务分母');
});

test('H4 不再以 capacity 报名填充率作为进度', () => {
  assert.ok(!/pct/i.test(source), 'taskforce-list.js 仍出现 pct（报名填充率残留）');
  assert.ok(!source.includes('capacity'), 'taskforce-list.js 仍读 capacity（报名填充率残留）');
});

test('H5 卡内两类组名齐备', () => {
  for (const label of ['活动工作组', '专班工作组']) {
    assert.ok(source.includes(label), `taskforce-list.js 缺组名「${label}」`);
  }
});
