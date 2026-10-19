// role: [工程师]+[AI]
// committee-tab-density.test.mjs — 支委会 tab 密度守卫（2026-10-18 · Spec「工作台密度与组件重组」Task 3）
//
// 判据（只锁本轮重组形态，不重新定义业务）：
//   T1 支委构成 / 会议两表走统一数据表（renderDataTable 或 .data-table）；
//   T2 不再挂载全局「选人 → 选身份 → 确认」表单（源码不得出现 mountCommissionerAssign）；
//   T3 模板串内无超过 120 字的连续说明段（剥注释、折叠区与 help 链接文本，避免误伤代码注释）；
//   T4 五类支委身份词齐备：支书 / 副支书 / 组织委员 / 宣传委员 / 纪检委员；
//   T5 含「新建线上支委会」入口。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'committee-meeting-tab.js');
const RAW = readFileSync(FILE, 'utf8');

/** 剥注释（与 copy-length-guard 同口径；CRLF 先归一） */
function stripComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

/** 只取模板串（界面 HTML 均在模板串里；单引号数据不参与「连续说明段」判定） */
function templatesOf(src) {
  return String(src).match(/`[\s\S]*?`/g) || [];
}

/** 块级切段：折叠区、help 链接文本与控件不计入 */
const BLOCK_TAGS = ['p', 'div', 'li', 'ul', 'ol', 'section', 'article', 'aside', 'header', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'tr', 'table', 'thead', 'tbody', 'form', 'summary',
  'blockquote', 'pre', 'figure', 'dl', 'dt', 'dd', 'fieldset', 'legend', 'caption', 'br'];
const BLOCK_RE = new RegExp(`</?(?:${BLOCK_TAGS.join('|')})\\b[^>]*>`, 'gi');

function blocksOfTemplate(tpl) {
  const s = String(tpl)
    .replace(/\$\{[^}]*\}/g, ' ')
    .replace(/<details\b[\s\S]*?<\/details>/gi, ' ')
    .replace(/<a\b[\s\S]*?<\/a>/gi, ' ')
    .replace(BLOCK_RE, '\n')
    .replace(/<[^>]*>/g, ' ');
  return s.split('\n')
    .map((t) => t.replace(/[\s\u3000]+/g, ''))
    .filter((t) => t && /[\u4e00-\u9fff]/.test(t));
}

const CODE = stripComments(RAW);
const BLOCKS = templatesOf(CODE).flatMap(blocksOfTemplate);

test('T1 支委构成表与会议表走统一数据表', () => {
  assert.match(RAW, /renderDataTable|data-table/, '支委会 tab 未使用 renderDataTable / .data-table');
});

test('T2 不再挂载全局「选人 → 选身份 → 确认」表单', () => {
  assert.ok(!RAW.includes('mountCommissionerAssign'), '支委会 tab 仍挂载全局支委身份表单');
});

test('T3 模板串内无超过 120 字的连续说明段', () => {
  const long = BLOCKS.filter((t) => t.length > 120);
  assert.deepEqual(long, [], `支委会 tab 出现长说明段（应压到一行或移入 help）：\n  ${long.join('\n  ')}`);
});

test('T4 五类支委身份词齐备', () => {
  for (const word of ['支书', '副支书', '组织委员', '宣传委员', '纪检委员']) {
    assert.ok(RAW.includes(word), `支委会 tab 缺身份词「${word}」`);
  }
});

test('T5 含「新建线上支委会」入口', () => {
  assert.ok(RAW.includes('新建线上支委会'), '支委会 tab 缺「新建线上支委会」入口');
});

test('T6 帮助注释在两张表之后（说明后置）', () => {
  const helpIdx = RAW.indexOf('help-note');
  const rosterIdx = RAW.indexOf('cm-roster-table');
  const meetingIdx = RAW.indexOf('cm-meeting-table');
  assert.ok(helpIdx > rosterIdx && helpIdx > meetingIdx,
    '帮助注释应后置到两张表之后，不再压在标题下');
});

test('T7 标题区只有一个主操作按钮，且行内不再出现 btn-ghost', () => {
  const header = RAW.slice(RAW.indexOf('<header'), RAW.indexOf('</header>'));
  const accentCount = (header.match(/btn-accent(?![\w-])/g) || []).length;
  assert.equal(accentCount, 1, `标题区 btn-accent 应为 1 个（新建 CTA），实测 ${accentCount}`);
  assert.ok(!/\bbtn-ghost\b/.test(RAW), '支委会 tab 行内动作仍在使用 btn-ghost');
});

/** 取函数体（从 `function name` 到下一个顶层 `function`） */
function functionBody(src, name) {
  const start = src.indexOf(`function ${name}`);
  assert.ok(start >= 0, `未找到函数 ${name}`);
  const next = src.indexOf('\nfunction ', start + 1);
  return next < 0 ? src.slice(start) : src.slice(start, next);
}

test('T8 委员表每行可见动作 ≤2：改派/补选 + 更多，撤销在菜单内', () => {
  const body = functionBody(RAW, 'rosterRowHtml');
  assert.match(body, /<details class="row-more">/, '委员行未使用「更多」菜单');
  assert.match(body, /<summary class="btn-outline btn-sm">更多<\/summary>/, '「更多」触发器应为 btn-outline btn-sm');
  const menu = body.slice(body.indexOf('row-more__menu'), body.indexOf('</details>'));
  assert.ok(menu.includes('data-cm-revoke'), '撤销应在 row-more 菜单内');
  const visible = body.replace(/<details[\s\S]*?<\/details>/g, '');
  const count = (visible.match(/<button\b/g) || []).length;
  assert.ok(count <= 2, `委员行可见动作应 ≤2（1 主 + 更多），实测 ${count}`);
});
