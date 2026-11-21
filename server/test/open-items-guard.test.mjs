// role: [工程师]+[AI]
// server/test/open-items-guard.test.mjs — 计划收尾清账门（2026-11-21 批次 591 · CLAUDE H50.3）
//
// 判据（H50.3）：计划报「已完成」时，四类 open 源必须各有结论，不得留「口头待办」。
//   ① `.ctx/REVIEW_QUEUE.md`：不得出现「已闭环」行（闭环即删，沿革归 git）；
//   ② `CLAUDE.md` 乙部：每条必须有「ID / 一句话 / 判据或出处 / 状态」四要素，状态 ∈ {在办, 待触发}，`待触发` 必须写触发条件；
//   ③ `.trae/documents/*.md`：有 `- [ ]` 时必须含 `<!-- parked: D-xxx -->` 或 frontmatter `status: archived`；
//   ④ `.ctx/ENGINEERING_ASSESSMENT.md §四`：必须有「外部门」小节，且 L-02 / CI / 签收 / SMTP 四项列全；
//   ⑤ 反例自证：把合格样本改坏后，同一判据必须判红（守卫不是空转）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/** 乙部行判据（T2 / T5 共用）：返回不合格原因，空串＝合格 */
function yiBuProblem(row) {
  const cells = row.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 4) return `列数 ${cells.length} < 4：${row.slice(0, 60)}`;
  const status = cells[cells.length - 1];
  if (!/在办|待触发/.test(status)) return `状态不在 {在办, 待触发}：${status}`;
  if (/待触发/.test(status) && !/触发|当|时|后/.test(cells.slice(2, -1).join(' '))) {
    return `待触发缺触发条件：${row.slice(0, 60)}`;
  }
  if (cells.slice(0, 3).some((c) => !c)) return `四要素有空格：${row.slice(0, 60)}`;
  return '';
}

/** 计划文件是否已处置（T3 / T5 共用） */
function planDisposed(text) {
  return /<!--\s*parked:\s*D-\d+\s*-->/.test(text) || /^---[\s\S]*?status:\s*archived[\s\S]*?---/m.test(text);
}

test('① REVIEW_QUEUE 不得留「已闭环」行（闭环即删）', () => {
  const text = read('.ctx/REVIEW_QUEUE.md');
  const hits = text.split('\n').map((l, i) => ({ l, n: i + 1 }))
    .filter(({ l }) => l.startsWith('|') && /已闭环/.test(l));
  assert.deepEqual(hits.map((h) => `:${h.n} ${h.l.slice(0, 60)}`), [], '闭环条目须删行，不得在台账里标「已闭环」');
});

test('② CLAUDE 乙部每条四要素齐，状态 ∈ {在办, 待触发}', () => {
  const text = read('CLAUDE.md');
  const start = text.indexOf('# 乙部');
  const end = text.indexOf('# 丙部');
  assert.ok(start > 0 && end > start, 'CLAUDE.md 缺乙部 / 丙部区块');
  const rows = text.slice(start, end)
    .split('\n')
    .filter((l) => l.startsWith('|') && !/^\|\s*-+/.test(l) && !/^\|\s*ID\s*\|/.test(l) && !/^\|\s*目标批次\s*\|/.test(l));
  assert.ok(rows.length >= 1, '乙部解析为空（表格口径被改坏）');
  const bad = rows.map(yiBuProblem).filter(Boolean);
  assert.deepEqual(bad, [], `乙部行不合格：\n  ${bad.join('\n  ')}`);
});

test('③ .trae/documents 有未勾项 ⇒ 必须 parked 或 archived', () => {
  const dir = path.join(ROOT, '.trae', 'documents');
  const bad = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const text = readFileSync(path.join(dir, name), 'utf8');
    if (/^- \[ \]/m.test(text) && !planDisposed(text)) bad.push(name);
  }
  assert.deepEqual(bad, [], `含未勾项却未处置（加 <!-- parked: D-xxx --> 或 status: archived）：${bad.join(', ')}`);
});

test('④ EA §四 外部门小节列全 L-02 / CI / 签收 / SMTP', () => {
  const text = read('.ctx/ENGINEERING_ASSESSMENT.md');
  const start = text.indexOf('## 四、');
  const end = text.indexOf('## 五、');
  assert.ok(start > 0 && end > start, 'EA 缺 §四 / §五 区块');
  const section = text.slice(start, end);
  const at = section.indexOf('### 外部门');
  assert.ok(at > 0, '§四 缺「外部门（不阻断本机合并）」小节');
  const block = section.slice(at, at + 3000);
  for (const key of ['L-02', 'CI', '签收', 'SMTP']) {
    assert.ok(block.includes(key), `外部门小节缺「${key}」行`);
  }
});

test('⑤ 反例自证：改坏的样本必须判红', () => {
  const good = yiBuProblem('| X-1 | 一句话 | 判据 | 在办 |');
  assert.equal(good, '');
  assert.notEqual(yiBuProblem('| X-1 | 一句话 | 判据 | 完成 |'), '', '状态越界未判红');
  assert.notEqual(yiBuProblem('| X-1 |  | 判据 | 在办 |'), '', '四要素空格未判红');
  assert.notEqual(yiBuProblem('| X-1 | 一句话 | 判据 | 待触发 |'), '', '待触发缺条件未判红');
  assert.equal(planDisposed('---\nstatus: archived\n---\n- [ ] 未勾'), true);
  assert.equal(planDisposed('<!-- parked: D-900 -->\n- [ ] 未勾'), true);
  assert.equal(planDisposed('- [ ] 未勾且无处置'), false);
});
