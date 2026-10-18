// role: [工程师]+[AI]
// committee-meeting-density.test.mjs — 支委会独立会议页去说明化守卫
//（2026-10-18 · Spec「工作台密度与组件重组」Task 4）
//
// 判据：
//   M1 页面源码含五步：范围 / 议程 / 表态 / 截止 / 留存；
//   M2 主内容模板串内无超过 120 字的连续说明段（剥注释、折叠区与 help 链接文本）；
//   M3 同屏主按钮克制：源码里 btn-accent 的出现不超过 2 处（当前步只留一个，其余为次按钮）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'docs', 'src', 'entries', 'pages', 'party-committee-meeting-entry.js');
const RAW = readFileSync(FILE, 'utf8');

/** 剥注释（与 copy-length-guard 同口径；CRLF 先归一） */
function stripComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

/** 只取模板串（界面 HTML 均在模板串里；普通字符串不参与「连续说明段」判定） */
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

test('M1 步骤条五词齐备：范围 → 议程 → 表态 → 截止 → 留存', () => {
  for (const word of ['范围', '议程', '表态', '截止', '留存']) {
    assert.ok(RAW.includes(word), `会议页缺步骤词「${word}」`);
  }
});

test('M2 主内容模板串内无超过 120 字的连续说明段', () => {
  const long = BLOCKS.filter((t) => t.length > 120);
  assert.deepEqual(long, [], `会议页出现长说明段（应改为一句短提示 + help 锚点）：\n  ${long.join('\n  ')}`);
});

test('M3 btn-accent 主按钮不超过 2 处（当前步只留一个）', () => {
  const n = (CODE.match(/btn-accent/g) || []).length;
  assert.ok(n <= 2, `会议页 btn-accent 出现 ${n} 处（上限 2）：当前步只留一个主按钮，其余降为次按钮`);
});
