// server/test/id-uniqueness.test.mjs
// ════════════════════════════════════════════════════════════════
//  「全站实体 id 唯一性」守卫（2026-09-13 Q-21-2 全站排查后立）
// ════════════════════════════════════════════════════════════════
//  起因（实测暴露）：`services/thought-report.js` 的 `'tr_' + Date.now()` 在**同毫秒连提两篇**
//  时生成同一 id（重复主键 → 归集/初阅指向错乱）。全站排查后又发现 30+ 处同型写法
//  （`'ed_' / 'ho_' / 'cmt-' / 'notice-' / `mk_` + personId …），其中「时间戳是唯一区分因子」
//  者在批量写入、连点、同毫秒两次调用时**必撞**。
//
//  裁定（2026-09-13 支书批「A+B+C 全改」）：**所有实体 id 一律经 `core/id.js` 生成**，
//  禁止再写 `前缀 + Date.now()`；禁止用 `Math.random()` 参与 id 生成。
//  前缀契约：连字符前缀（`tf-` / `notice-` / `cmt-` / `mc-` …）必须传 `sep='-'`——
//    `sourceId.startsWith('tf-')` 用于区分专班/活动（activity-entry.js、todo-jump.js），
//    `startsWith('notice-')` 见 services/todo.js 与种子 `notice-101…110`。
//
//  两层法（与 `person-consistency.test.mjs` 同构，见 DATA_CONSISTENCY_CHECKLIST §0）：
//    结构层 S1：禁止「前缀 + Date.now()」生成实体 id（回潮即红）
//    结构层 S2：禁止 Math.random() 参与实体 id 生成
//    结构层 S3：`core/id.js` 单一源在位（导出 generateId + randomHex，含降级链）
//    数据层 D1：种子集合内 id 唯一、非空、同集合口径不分裂
//    数据层 D2：同一 id 不得跨集合出现（id 维度上的「张冠李戴」）
//    数据层 D3：id 形态不与前缀契约冲突（tf-/notice- 类连字符前缀不得被改成下划线形态）
//    数据层 D4：唯一源本身可用（连续生成的 id 互不相同）
//
//  说明：数据层以**种子语料**（docs/src/mock 的具名导出）为准，而非 mockDB——
//    MockAdapter.loadDB() 只按需水合部分业务域，不能代表种子全量（D1 首版误用 mockDB
//    只查到 70 条，即此因；已改为遍历 mock 命名空间）。
//
//  ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 `?v=`；bump 版本后本文件戳须同步。
// ════════════════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as MOCK from '../../docs/src/mock/index.js?v=20260922h';
import { generateId, randomHex } from '../../docs/src/core/id.js?v=20260922h';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'docs', 'src');

/**
 * 种子语料里的全部「数组型集合」（按**数组引用**去重——mock/index.js 可能把同一数组
 * 以两个名字导出，别名会造成 D2 的假阳性）
 * @returns {Array<[string, Array]>}
 */
function seedCollections() {
  const seenArrays = new Set();
  const out = [];
  for (const [name, value] of Object.entries(MOCK)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (seenArrays.has(value)) continue;
    seenArrays.add(value);
    out.push([name, value]);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  D 数据层
// ════════════════════════════════════════════════════════════════

test('D1 种子集合内 id 唯一、非空、同集合口径不分裂', () => {
  const collections = seedCollections();
  const bad = [];
  let inspected = 0;
  for (const [name, list] of collections) {
    const objects = list.filter((x) => x && typeof x === 'object');
    const withId = objects.filter((x) => x.id !== undefined);
    // 同一集合里「有的有 id、有的没有」= 口径分裂，按 id 反查时会漏
    if (withId.length > 0 && withId.length !== objects.length) {
      bad.push(`${name}：${objects.length} 条中仅 ${withId.length} 条带 id（同集合口径分裂）`);
    }
    const seen = new Map();
    withId.forEach((item, i) => {
      if (typeof item.id !== 'string' || item.id.trim() === '') {
        bad.push(`${name}[${i}] id 为空或非字符串（${JSON.stringify(item.id)}）`);
        return;
      }
      inspected += 1;
      if (seen.has(item.id)) bad.push(`${name} 内 id 重复：${item.id}（下标 ${seen.get(item.id)} 与 ${i}）`);
      else seen.set(item.id, i);
    });
  }
  assert.ok(inspected >= 100, `检查的实体数过少（${inspected}），疑似种子装载失败`);
  assert.deepEqual(bad, [], `发现 ${bad.length} 处 id 缺失/重复——同一主键指向两条记录，归集与引用必错`);
});

test('D2 同一 id 不得跨集合出现（id 维度上的「张冠李戴」）', () => {
  const owner = new Map();
  const bad = [];
  for (const [name, list] of seedCollections()) {
    for (const item of list) {
      const id = item && item.id;
      if (typeof id !== 'string' || !id) continue;
      if (owner.has(id) && owner.get(id) !== name) bad.push(`${id} 同时出现在 ${owner.get(id)} 与 ${name}`);
      else owner.set(id, name);
    }
  }
  assert.deepEqual(bad, [], `发现 ${bad.length} 处跨集合 id 冲突——按 id 反查实体时会取到另一类记录`);
});

test('D3 id 形态不与前缀契约冲突（tf- / notice- 连字符前缀不得被改成下划线形态）', () => {
  const DASH_CONTRACT = ['tf-', 'notice-'];
  const bad = [];
  for (const [name, list] of seedCollections()) {
    for (const item of list) {
      const id = String((item && item.id) || '');
      for (const p of DASH_CONTRACT) {
        const family = p.replace(/-$/, '');
        if (id.startsWith(family + '_')) bad.push(`${name}: 「${id}」把连字符前缀「${p}」写成了下划线形态`);
      }
    }
  }
  assert.deepEqual(bad, [],
    `发现 ${bad.length} 处前缀形态冲突——会打断 startsWith('tf-') / startsWith('notice-') 的跳转判定`);
});

test('D4 唯一源可用：generateId 保留前缀与分隔符，且连续生成互不相同', () => {
  const a = generateId('att');
  const b = generateId('att');
  assert.notEqual(a, b, '同毫秒连生两个 id 必须不同（原 Date.now() 实现会相同）');
  assert.match(a, /^att_[0-9a-f-]{8,}$/i, 'generateId 缺省分隔符为下划线，前缀保留');

  const tf = generateId('tf', '-');
  assert.ok(tf.startsWith('tf-'), 'tf- 前缀契约（startsWith 判定）必须成立');
  assert.match(tf, /^tf-[0-9a-f-]{8,}$/i, '连字符前缀必须显式传 sep 并保留连字符');

  assert.ok(generateId('notice', '-').startsWith('notice-'), 'notice- 前缀契约必须成立');
  // randomHex 必须是**真十六进制**且长度精确：services/branch.js 用它产出 `br-<8hex>`
  // （server/test/empty-template.test.mjs 与 branch-roster-import.test.mjs 断言该形态）
  assert.match(randomHex(), /^[0-9a-f]+$/, 'randomHex 必须返回十六进制（降级链亦不得退化为 base36）');
  assert.equal(randomHex(4).length, 8, 'randomHex(4) 必须恰好 8 位（br-<8hex> 形态契约依赖此长度）');
  assert.match('br-' + randomHex(4), /^br-[0-9a-f]{8}$/, '支部 id 形态契约 br-<8hex> 必须成立');

  const bag = new Set(Array.from({ length: 1000 }, () => generateId('x')));
  assert.equal(bag.size, 1000, '连续生成的 id 必须互不相同');
});

// ════════════════════════════════════════════════════════════════
//  S 结构层（静态扫描 docs/src）
// ════════════════════════════════════════════════════════════════

/** 递归收集 docs/src 下全部 .js（排除 mock 种子仓：种子是静态历史数据，其 id 为既有常量） */
function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'mock') continue;
      walkJs(full, out);
    } else if (name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/** 纯注释行（`//…` / JSDoc 续行 `*…`）不参与扫描——注释里可以引用反模式字样做说明 */
const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

/**
 * 该行是否在为「实体 id」赋值。
 * 判定：`id: …` / `draftId: …` / `record.id = …` / `const msgId = …`（词首 `id` 或以大写 `Id` 结尾）。
 * **不认 `uid`**：`const uid = 'qv-' + Math.random()`（components/query-view.js）是 DOM 元素 id，
 * 不落库、不参与实体引用，故不入扫描（首版正则误命中，已收紧）。
 */
const isIdAssignment = (line) => /(\b\w*Id|\bid)\s*[:=]/.test(line);

test('S1 禁止「前缀 + Date.now()」生成实体 id（回潮即红）', () => {
  const offenders = [];
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    if (rel === 'core/id.js') continue; // 唯一 id 源的末级兜底（授权处）
    const src = readFileSync(file, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (!/Date\.now\(\)/.test(line)) return;
      if (isIdAssignment(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [],
    '发现用 Date.now() 生成实体 id（同毫秒连提/批量写入必撞 id）。'
    + "请改用 core/id.js 的 generateId(prefix, sep?)——连字符前缀必须传 '-'。");
});

test('S2 禁止 Math.random() 参与实体 id 生成', () => {
  const offenders = [];
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    if (rel === 'core/id.js') continue; // 降级链末级兜底（授权处）
    const src = readFileSync(file, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (!/Math\.random\(\)/.test(line)) return;
      if (isIdAssignment(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [],
    '发现用 Math.random() 参与实体 id 生成（非加密强随机且无唯一性保证）。'
    + '请改用 core/id.js 的 generateId()。');
});

test('S3 单一源在位：core/id.js 导出 generateId + randomHex（含降级链）', () => {
  const src = readFileSync(join(SRC_DIR, 'core', 'id.js'), 'utf8');
  assert.match(src, /export function generateId\s*\(/, 'core/id.js 必须导出 generateId()');
  assert.match(src, /export function randomHex\s*\(/, 'core/id.js 必须导出 randomHex()（降级链单一源）');
  assert.match(src, /randomUUID/, '降级链首级应为 crypto.randomUUID');
  assert.match(src, /getRandomValues/, '降级链次级应为 crypto.getRandomValues');
});
