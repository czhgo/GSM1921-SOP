// role: [工程师]+[AI]
// server/test/button-height-guard.test.mjs — h-8 只留档5 低频（2026-11-21 批次 587）
//
// 判据（`DS_03:120` 档5 32px）：`h-8` 只允许「导出 / 打印 / 分页 / 图标关闭 / 低频上传」语境；
//   导航（日历周 / 日前后翻页）与表单动作必须走 `.btn-sm` / `.btn-md` 行高档。
//   白名单按文件写死，只减不增；新文件出现 `h-8` 即红。反例自证在 ②。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const RE_H8_ANY = /<button[^>]*class="[^"]*\bh-8\b[^"]*"/;
const RE_H8_CLASS = /<button[^>]*class="[^"]*\bh-8\b[^"]*"/;

/** 档5 / 图标白名单（2026-11-21 实测；只减不增）。 */
export const H8_ALLOW = Object.freeze({
  'docs/src/components/ui/modal.js': '图标关闭按钮（w-8 h-8，非行内动作）',
  'docs/src/entries/tabs/disc/inspection-tab.js': '档5：代录考察表单（低频上传）',
  'docs/src/components/record/activity-view.js': '档5：导出 CSV',
});

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

test('① h-8 只允许白名单文件（日历导航已改 btn-sm）', () => {
  const problems = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const src = readFileSync(file, 'utf8');
    if (!RE_H8_ANY.test(src)) continue;
    if (!H8_ALLOW[rel]) problems.push(`${rel} 出现 h-8：请归 .btn-sm / .btn-md 档`);
  }
  assert.deepEqual(problems, [], `h-8 越档：\n  ${problems.join('\n  ')}`);
});

test('② 反例自证：白名单外注入 h-8 必须判红', () => {
  const sample = '<button class="btn-outline h-8 px-3">x</button>';
  assert.equal(RE_H8_CLASS.test(sample), true, '注入的 h-8 未被判出');
  assert.equal(H8_ALLOW['docs/src/entries/tabs/secretary/calendar-tab.js'], undefined,
    '白名单不得包含日历导航文件（导航必须走 .btn-sm）');
});
