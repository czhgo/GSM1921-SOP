// role: [工程师]+[AI]
// ui-color-semantics.test.mjs — 颜色语义守卫（2026-10-18 立 · Task 2 / SubTask 2.5）
//
// 来源：Spec「工作台视觉语言」§2.10 颜色四问与明暗档；判例＝「逾期与删除失败同屏，两处都是红」。
// 病灶：`--functional-error` 同时承担「错误」和「逾期」，红色既是主题色又是状态色，用户无法判断语义。
//
// 判据：
//   C1 DESIGN_SYSTEM 有「颜色四问」与逾期 / warning / error / 琥珀口径；
//   C2 styles.css 有 `.state-badge--warning/success/info/accent` 变体；
//   C3 关键页面文件内「逾期」附近 120 字符不得出现 `--functional-error`；
//   C4 DESIGN_SYSTEM §2.10 写明三个反例（整圈红边 / 功能色主按钮 / 主题色状态徽章）；
//   C5 非空转自检：邻近判定在合成正 / 负样本上必须命中 / 不命中。
//
// 说明：C3 的存量页面由后续页面任务修复；若命中，失败信息会明确标注「待后续页面任务修复」，
//   不放宽为永远绿。
//
// 运行：node --test server/test/ui-color-semantics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');
const CSS = join(ROOT, 'docs', 'src', 'styles.css');

/** 关键页面（后续页面任务负责修；本守卫只做结构断言，不判视觉） */
const PAGES = [
  'docs/src/components/governance/work-overview.js',
  'docs/src/components/record/todo-list.js',
  'docs/src/components/record/todo-tab-shell.js',
  'docs/src/components/record/report-inbox.js',
  'docs/src/entries/tabs/secretary/committee-meeting-tab.js',
  'docs/src/components/dashboard/taskforce-list.js',
  'docs/src/components/governance/notice-view.js',
];

const ERROR_TOKEN = '--functional-error';
const WINDOW = 120;

/** 找出「逾期」附近 120 字符内出现 error 令牌的站点（导出便于非空转自检） */
export function overdueErrorSites(src) {
  const hits = [];
  let from = 0;
  while (true) {
    const i = src.indexOf('逾期', from);
    if (i < 0) break;
    const start = Math.max(0, i - WINDOW);
    const end = Math.min(src.length, i + '逾期'.length + WINDOW);
    if (src.slice(start, end).includes(ERROR_TOKEN)) hits.push(i);
    from = i + 1;
  }
  return hits;
}

test('C1 DESIGN_SYSTEM 含颜色四问与逾期 / warning / error 口径', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  for (const term of ['颜色四问', '逾期', 'warning', 'error', '琥珀']) {
    assert.ok(doc.includes(term), `DESIGN_SYSTEM 缺「${term}」（§2.10 颜色语义单一源）`);
  }
  assert.match(doc, /### 2\.10 颜色四问与明暗档/, 'DESIGN_SYSTEM 缺 §2.10 标题');
  assert.ok(doc.includes('阻断 / 失败 / 删除 / 驳回'), '§2.10 未写明 error 只保留给阻断 / 失败 / 删除 / 驳回');
});

test('C2 styles.css 含状态徽章变体（warning / success / info / accent）', () => {
  const css = readFileSync(CSS, 'utf8');
  for (const variant of ['neutral', 'success', 'warning', 'info', 'accent']) {
    assert.ok(css.includes(`.state-badge--${variant}`), `styles.css 缺 .state-badge--${variant}`);
  }
});

test('C3 关键页面「逾期」附近不得使用 --functional-error', () => {
  const offenders = [];
  for (const rel of PAGES) {
    const file = join(ROOT, rel);
    assert.ok(existsSync(file), `关键页面不存在：${rel}`);
    const src = readFileSync(file, 'utf8');
    const hits = overdueErrorSites(src);
    if (hits.length) offenders.push(`${rel} → ${hits.length} 处（逾期附近 120 字符出现 ${ERROR_TOKEN}）`);
  }
  assert.deepEqual(offenders, [],
    `以下页面仍把「逾期」写成错误红（待后续页面任务修复：逾期改 --functional-warning，`
    + `error 只留给阻断 / 失败 / 删除 / 驳回）：\n  ${offenders.join('\n  ')}`);
});

test('C4 §2.10 写明三个反例（整圈红边 / 功能色主按钮 / 主题色状态徽章）', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  for (const term of ['整圈红边', '功能色主按钮', '主题色状态徽章']) {
    assert.ok(doc.includes(term), `§2.10 缺反例「${term}」`);
  }
  assert.ok(doc.includes('主题色为红时，逾期仍用琥珀'), '§2.10 缺「主题色为红时，逾期仍用琥珀」口径');
});

test('C5 非空转：邻近判定在正 / 负样本上分别命中 / 不命中', () => {
  assert.equal(overdueErrorSites('逾期 <span style="color:var(--functional-error)">').length, 1,
    '邻近判定失效：逾期 + error 未被判出');
  assert.equal(overdueErrorSites('逾期 <span style="color:var(--functional-warning)">').length, 0,
    '邻近判定过宽：逾期 + warning 被误判');
  const far = '逾期'.padEnd(WINDOW + 20, '。') + 'var(--functional-error)';
  assert.equal(overdueErrorSites(far).length, 0, '邻近判定过宽：超出 120 字符仍被误判');
});
