// server/scripts/sync-form-loop-lines.mjs —— 校验台账行号同步（批次 612）
// 用途：`test/form-loop-registry.mjs` 的 `line` 只记录文案所在行；docs/src 改动后会漂移，
//   `form-loop-sweep::S6` 因此判红。本脚本按 `msg` 首次出现的行重写 `line`，只改行号，不动 file/msg/flow。
// 用法：cd server; node scripts/sync-form-loop-lines.mjs
// 边界：找不到文案的条目保持原样（由 S4 报「文案不存在」）；多行对象不处理（台账口径为一行一条）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VALIDATION_SITES } from '../test/form-loop-registry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const REGISTRY = path.join(HERE, '..', 'test', 'form-loop-registry.mjs');
const text = fs.readFileSync(REGISTRY, 'utf8');
const lines = text.split(/\r?\n/);
let index = 0;
let changed = 0;

const next = lines.map((line) => {
  if (!/^\s*\{ file: /.test(line) || !/line: \d+/.test(line)) return line;
  const site = VALIDATION_SITES[index++];
  if (!site) return line;
  const abs = path.join(ROOT, site.file.split('?')[0]);
  if (!fs.existsSync(abs)) return line;
  const src = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  if ((src[site.line - 1] || '').includes(site.msg)) return line;
  const hits = src.map((row, i) => (row.includes(site.msg) ? i + 1 : 0)).filter(Boolean);
  if (!hits.length) return line;
  changed += 1;
  return line.replace(/line: \d+/, `line: ${hits[0]}`);
});

fs.writeFileSync(REGISTRY, next.join('\n'));
console.log(`[sync-form-loop-lines] 台账 ${index} 条 · 修正 ${changed} 条`);
