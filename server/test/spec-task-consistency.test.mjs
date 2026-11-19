// role: [工程师]+[AI]
// spec-task-consistency.test.mjs — spec 台账噪声棘轮（2026-11-19 批次 572 · G2）
//
// 病灶：tasks.md 里父项 `[x]`、子项 `[ ]` 长期并存（历史 525 处 / 15 个文件），
//   每轮扫 spec 都会“新发现”同一批未勾项 ⇒ 报告挤牙膏、永远清不零。
// 判据：
//   ① 每个 spec 的「父项已勾 + 子项未勾」计数不得超过基线（只减不增）；
//   ② 基线里不该再出现新文件；
//   ③ `checklist.md` 与 `tasks.md` 的矛盾必须消除：tasks 有「阻塞」的 PR 子项时，
//      checklist 不得把「PR 正文 / PR URL」写成 `[x]`。
// 收敛路径：按 checklist 真完成情况逐项回勾（或把父项改回 `[ ]`），再把该文件计数从基线下调。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SPECS = join(ROOT, '.trae', 'specs');

/** 历史噪声基线（2026-11-19 批次 572 已清零；只减不增，新噪声必须当批回勾） */
const NOISE_BASELINE = Object.freeze({});

function tasksFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (name !== 'tasks.md') continue;
      if (full.includes('_TEMPLATE')) continue;
      out.push(full);
    }
  };
  walk(SPECS);
  return out;
}

/** 父项 [x] 且其下仍有 [ ] 的行数（按缩进维护祖先栈） */
export function noiseCount(src) {
  const stack = [];
  let count = 0;
  for (const line of src.split(/\r?\n/)) {
    const m = /^(\s*)-\s*\[( |x)\]\s+(.*)$/.exec(line);
    if (!m) continue;
    const indent = m[1].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (m[2] === ' ' && stack.some((item) => item.done)) count += 1;
    stack.push({ indent, done: m[2] === 'x' });
  }
  return count;
}

test('G2 spec 台账：每份 tasks.md 的「父勾子未勾」计数不超过基线', () => {
  const measured = {};
  for (const full of tasksFiles()) {
    const rel = relative(SPECS, full).split('\\').join('/');
    measured[rel] = noiseCount(readFileSync(full, 'utf8'));
  }
  const over = [];
  const added = [];
  for (const [rel, count] of Object.entries(measured)) {
    if (!(rel in NOISE_BASELINE)) { if (count > 0) added.push(`${rel}（${count}）`); continue; }
    if (count > NOISE_BASELINE[rel]) over.push(`${rel}：${count} > 基线 ${NOISE_BASELINE[rel]}`);
  }
  const stale = Object.keys(NOISE_BASELINE).filter((rel) => !(rel in measured));
  assert.deepEqual(added, [], `新增 spec 台账噪声（父勾子未勾）：${added.join(' / ')}——先回勾再入基线`);
  assert.deepEqual(over, [], `spec 台账噪声回涨：${over.join(' / ')}——只允许减少`);
  assert.deepEqual(stale, [], `基线里的文件已不存在：${stale.join(' / ')}——把条目从基线删除`);
});

test('G2 反例自证：父项未勾时不计数，子项补勾后计数必须下降', () => {
  const bad = '- [x] 父\n  - [ ] 子\n';
  const ok = '- [x] 父\n  - [x] 子\n';
  assert.equal(noiseCount(bad), 1);
  assert.equal(noiseCount(ok), 0);
});

test('G2 checklist ↔ tasks 矛盾：tasks 里 PR 阻塞时，checklist 不得写 PR 已完成', () => {
  const tasks = readFileSync(join(SPECS, 'harden-launch-and-permissions', 'tasks.md'), 'utf8');
  const checklist = readFileSync(join(SPECS, 'harden-launch-and-permissions', 'checklist.md'), 'utf8');
  if (!/\[ \].*阻塞/.test(tasks)) return;
  const bad = checklist.split(/\r?\n/)
    .filter((line) => /\[x\]/.test(line) && /PR URL|PR 正文/.test(line));
  assert.deepEqual(bad, [], `tasks 仍标阻塞，checklist 却勾了 PR 完成：\n  ${bad.join('\n  ')}`);
});
