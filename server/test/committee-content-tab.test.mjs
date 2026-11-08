// role: [工程师]+[AI]
// committee-content-tab.test.mjs — 党委台「院级内容」页签静态守卫（2026-11-08 批次 536 · spec Task 8）
//
// 为什么纯静态：本页是党委工作台新增页签，真机 / 真库覆盖在 audit-tabs 与 page-sweep 中；
//   本件只锁「页签存在、两个子视图齐备、输入控件走 forms.js、写口组已接线」四条结构事实，
//   防止后续改版把页签或子视图悄悄删掉而无人发现。
// 判据：
//   T1 capability 注册 gov-content 页签，label＝院级内容，入口指向 content-tab.js；
//   T2 content-tab.js 存在、导出 renderContent、登记 dataset.currentTab='gov-content'；
//   T3 页内 activities / docs 两个子视图与 `?subview=` 协议齐备；
//   T4 表单控件只从 components/ui/forms.js 具名导入；
//   T5 页内 <input> 只有 type="checkbox"；不得手写 .input-flat 裸输入（文件选择走 forms.js::fileField）；
//   T6 api-adapter 的 committeeContent 组覆盖活动与资料的读 / 写口。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const CAPABILITY = 'docs/src/capabilities/party-committee-workspace.js';
const TAB = 'docs/src/entries/tabs/party-committee/content-tab.js';
const DISPATCH = 'docs/src/entries/tabs/party-committee/dispatch-tab.js';
const ADAPTER = 'docs/src/data/api-adapter.js';

test('T1 页签注册：gov-content / 院级内容 / content-tab.js', () => {
  const src = read(CAPABILITY);
  assert.match(src, /\{\s*id:\s*'gov-content',\s*label:\s*'院级内容'/,
    '党委台能力未注册 gov-content 页签（label 须为「院级内容」）');
  assert.match(src, /content-tab\.js\?v=\d{8}[a-z]/,
    'gov-content 页签入口未指向 content-tab.js（须带当前活动版本戳）');
});

test('T2 页签模块：存在、导出 renderContent、登记当前 tab', () => {
  assert.ok(existsSync(join(ROOT, TAB)), `缺页签模块：${TAB}`);
  const src = read(TAB);
  assert.match(src, /export function renderContent\s*\(/, 'content-tab.js 未导出 renderContent');
  assert.match(src, /dataset\.currentTab\s*=\s*'gov-content'/, 'content-tab.js 未登记 dataset.currentTab');
});

test('T3 两个子视图：活动 / 资料 与 ?subview= 协议', () => {
  const src = read(TAB);
  assert.match(src, /data-content-view="activities"/, '缺「活动」子视图按钮');
  assert.match(src, /data-content-view="docs"/, '缺「资料」子视图按钮');
  assert.match(src, /\.get\('subview'\)/, '未读取 ?subview= 深链参数');
  assert.match(src, /\.set\('subview'/, '未写回 ?subview= 深链参数');
});

test('T4 表单控件只经 forms.js 具名导出', () => {
  const src = read(TAB);
  const importLine = src.match(/import\s*\{([^}]*)\}\s*from\s*'[^']*components\/ui\/forms\.js[^']*'/);
  assert.ok(importLine, 'content-tab.js 未从 components/ui/forms.js 具名导入');
  const names = importLine[1].split(',').map((item) => item.trim()).filter(Boolean);
  for (const name of ['textField', 'textareaField', 'selectField', 'dateField', 'fileField']) {
    assert.ok(names.includes(name), `forms.js 导入缺 ${name}`);
  }
});

test('T5 无裸文本输入：<input> 仅复选框，且不手写 .input-flat', () => {
  const src = read(TAB);
  const inputs = [...src.matchAll(/<input\b[^>]*>/g)].map((match) => match[0]);
  assert.ok(inputs.length > 0, '未扫描到目标支部复选框（判据可能失效）');
  const offenders = inputs.filter((tag) => !/type="checkbox"/.test(tag));
  assert.deepEqual(offenders, [], `页内出现非复选框裸输入：\n  ${offenders.join('\n  ')}`);
  assert.ok(!/class="[^"]*input-flat/.test(src),
    '页内手写了 .input-flat 裸输入（应改走 forms.js 的 textField / selectField / dateField / fileField）');
});

test('T6 api-adapter::committeeContent 覆盖活动与资料写口', () => {
  const src = read(ADAPTER);
  assert.match(src, /committeeContent:\s*\{/, 'api-adapter 缺 committeeContent 组');
  for (const path of ['/api/v1/committee/activities', '/api/v1/committee/documents', '/api/v1/committee/notices']) {
    assert.ok(src.includes(path), `api-adapter 缺端点：${path}`);
  }
  for (const fn of ['create', 'update', 'cancel', 'archive', 'updatePublication', 'dispatch', 'withdraw']) {
    assert.match(src, new RegExp(`\\b${fn}\\(`), `committeeContent 缺方法：${fn}`);
  }
});

test('T7 下发页第三子视图「公开通知」：?subview=public、撰写 + 列表 + 撤下', () => {
  const src = read(DISPATCH);
  assert.match(src, /VIEW_PUBLIC\s*=\s*'public'/, '未登记 public 子视图常量');
  assert.match(src, /data-dispatch-view="public"/, '缺「公开通知」子视图按钮');
  assert.match(src, /committeeContent\?\.notices/, '未接线 committeeContent.notices');
  assert.match(src, /public-notice-title/, '缺标题输入');
  assert.match(src, /public-notice-content/, '缺正文输入');
  assert.match(src, /public-notice-scope/, '缺发布范围选择');
  assert.match(src, /public-notice-expires/, '缺有效期输入');
  assert.match(src, /data-public-withdraw/, '已发布列表缺撤下入口');
  assert.match(src, /emptyStateHtml\(\{\s*variant:\s*'panel'/, '列表空态须走 emptyStateHtml({ variant: "panel" })');
});

test('T8 读失败不回落 mock：分块结算 + 分支错误 + panel 空态重试', () => {
  const src = read(TAB);
  assert.ok(!/import\s*\{[^}]*\bmockDB\b[^}]*\}\s*from/.test(src), 'content-tab.js 不得导入 mockDB（读失败不得回落本地数据，H32）');
  assert.ok(!/mockDB\.branches\s*\|\|/.test(src), 'content-tab.js 不得以 mockDB.branches 兜底');
  assert.match(src, /Promise\.allSettled\(/, '三块读取须各自结算（allSettled）');
  assert.match(src, /activitiesError/, '缺活动分块错误态');
  assert.match(src, /documentsError/, '缺资料分块错误态');
  assert.match(src, /branchesError/, '缺支部名单错误态');
  assert.match(src, /data-content-retry/, '缺重试入口');
  assert.match(src, /emptyStateHtml\(\{[\s\S]{0,80}variant:\s*'panel'/, '分块失败须显示 emptyStateHtml({ variant: "panel" })');
  const dispatchBlock = src.slice(src.indexOf('async function dispatchActivity'), src.indexOf('async function unpublishActivity'));
  assert.ok(dispatchBlock.length > 200, '抽取口径失效：dispatchActivity 块为空');
  assert.match(dispatchBlock, /branchesError/, '支部名单读失败须阻断下发');
  assert.match(dispatchBlock, /showToast\('error'/, '阻断下发须给出可懂提示');
});
