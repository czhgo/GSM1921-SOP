// role: [工程师]+[AI]
// about-freeze-guard.test.mjs — About「独立冻结件」内容基线守卫（2026-10-29）
//
// 为什么立这道守卫：支书多次强调 **About 是独立冻结件**——三件套（`docs/about.html` /
//   `docs/src/about.css` / `docs/src/entries/pages/about-entry.js`）**原样保留**，它的两处引用面
//   （功能目录「关于」卡、帮助页正文的页面清单）**也不许改**。此前这条规则只写在文档里
//   （`.ctx/AGENTS.md` 常见坑、`content/04_web_design/PRODUCT_IA.md` 附节），**没有守卫**；
//   上一轮 AI 擅自删了功能卡与帮助页清单，被支书要求全部回退。本守卫把规则变成内容基线：
//   **恰好 5 个位置**，任一处变化即红并指出差异。
//
// 五个位置与定位方式（基线数据见 `about-freeze-baseline.mjs`）：
//   ① docs/about.html                              整文件 SHA-256
//   ② docs/src/about.css                           整文件 SHA-256
//   ③ docs/src/entries/pages/about-entry.js        整文件 SHA-256
//   ④ docs/src/core/domain/function-catalog.js     定位串 `{ id: 'about', name: '关于',` → 该行 trim() 后哈希
//   ⑤ docs/help.html                               定位串 `系统页面分为根页面`       → 该行 trim() 后哈希
//   ④⑤ **不做整文件哈希**：这两个文件会因别的原因正常变动（新增功能卡 / 正文微调），
//   整文件哈希会把正常改动也判红。定位串未命中 ⇒ 同样判红（文案「定位串未命中，条目可能被删」），
//   防「直接删掉那条」冒充合规。
//
// 判据 B1–B5：
//   B1 基线条目**恰好 5 条**、字段齐备、文件集合与五个位置逐字相等（防漏项 / 防换条）。
//   B2 三件套整文件哈希 ≡ 基线（去 BOM ＋ 换行统一 `\n`；行尾差异不算改动）。
//   B3 两处引用面定位片段哈希 ≡ 基线（差异逐条报文件、行号与实际片段）。
//   B4 非空转：两处定位串在真实文件里**恰好命中 1 行**、片段非空（否则 B3 会恒真 / 恒假）。
//   B5 反例：把 5 个文件复制到临时目录（**不碰真实文件**），逐处改动 ⇒ 必须判红；
//      副本原样 ⇒ 必须判绿（证明判定器既不是恒红、也不是恒绿）。
//
// 运行：node --test server/test/about-freeze-guard.test.mjs（纯 node，不起服务）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { ABOUT_FREEZE_BASELINE } from './about-freeze-baseline.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

/** 五个位置（防「条数对但换了对象」） */
const EXPECTED_FILES = [
  'docs/about.html',
  'docs/help.html',
  'docs/src/about.css',
  'docs/src/core/domain/function-catalog.js',
  'docs/src/entries/pages/about-entry.js',
];

/** 去 BOM ＋ 换行统一为 `\n` ＋ 版本戳归一（行尾或发布补戳都不算内容改动）
 *  由来：2026-10-29 发布补戳把 about.html 里 `?v=` 从 20261029a 换成 b，整文件哈希变了，
 *  冻结守卫误判为「About 被改动」。冻结的是内容，缓存戳属于发布机械字段，故先归一。 */
const normalize = (s) => s
  .replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/\?v=[0-9A-Za-z]+/g, '?v=__STAMP__');
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const brief = (s, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** 定位串命中行（1-based 行号 ＋ trim 后文本） */
function locateLines(text, locator) {
  const hits = [];
  normalize(text).split('\n').forEach((line, i) => {
    if (line.includes(locator)) hits.push({ line: i + 1, text: line.trim() });
  });
  return hits;
}

/**
 * 逐条核基线，返回问题清单（空数组＝全绿）。
 * `root` 可指向临时副本（B5 反例复用同一判定器，不改判据）。
 */
function checkBaseline(root, entries = ABOUT_FREEZE_BASELINE) {
  const problems = [];
  for (const e of entries) {
    const abs = join(root, e.file);
    if (!existsSync(abs)) {
      problems.push(`${e.file}：文件不存在（About 冻结件被删？）`);
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    if (!e.locator) {
      const actual = sha256(normalize(text));
      if (actual !== e.sha256) {
        problems.push(`${e.file}：整文件内容与基线不一致（基线 ${e.sha256.slice(0, 12)}… / 实为 `
          + `${actual.slice(0, 12)}…）——About 冻结件被改动`);
      }
      continue;
    }
    const hits = locateLines(text, e.locator);
    if (hits.length === 0) {
      problems.push(`${e.file}：定位串未命中，条目可能被删（定位串「${e.locator}」）`);
      continue;
    }
    if (hits.length > 1) {
      problems.push(`${e.file}：定位串命中 ${hits.length} 行（应恰好 1 行）——判据不确定，`
        + `命中行 ${hits.map((h) => h.line).join(' / ')}`);
      continue;
    }
    const actual = sha256(hits[0].text);
    if (actual !== e.sha256) {
      problems.push(`${e.file}:${hits[0].line}：定位片段与基线不一致（基线 ${e.sha256.slice(0, 12)}… `
        + `/ 实为 ${actual.slice(0, 12)}…）\n    实际片段：${brief(hits[0].text)}`);
    }
  }
  return problems;
}

// ── B1 基线规模与字段 ────────────────────────────────────────────────────────
test('B1 基线条目恰好 5 条：字段齐备 · 文件集合＝五个冻结位置（防漏项 / 换条）', () => {
  assert.equal(ABOUT_FREEZE_BASELINE.length, 5,
    `About 冻结基线应恰好 5 条（3 件套 ＋ 2 处引用面），实为 ${ABOUT_FREEZE_BASELINE.length} 条——条目被删或漏登记`);

  for (const e of ABOUT_FREEZE_BASELINE) {
    assert.equal(typeof e.file, 'string', `基线条目缺 file：${JSON.stringify(e)}`);
    assert.ok(Object.hasOwn(e, 'locator'), `${e.file}：条目缺 locator 字段（整文件哈希者写 null）`);
    assert.match(e.sha256, /^[0-9a-f]{64}$/, `${e.file}：sha256 不是 64 位小写十六进制`);
    assert.ok(typeof e.reason === 'string' && e.reason.length >= 10, `${e.file}：缺一行理由（≥10 字）`);
    if (e.locator !== null) {
      assert.ok(typeof e.locator === 'string' && e.locator.trim().length >= 4,
        `${e.file}：定位串为空或过短（无法定位最小片段）`);
    }
  }

  assert.deepEqual(ABOUT_FREEZE_BASELINE.map((e) => e.file).sort(), EXPECTED_FILES,
    'About 冻结基线的文件集合与五个冻结位置不一致（条目被替换 / 新增了不该有的位置）');
  assert.deepEqual(ABOUT_FREEZE_BASELINE.filter((e) => e.locator === null).map((e) => e.file).sort(),
    EXPECTED_FILES.filter((f) => !f.endsWith('function-catalog.js') && !f.endsWith('help.html')),
    '整文件哈希条目应恰为三件套（about.html / about.css / about-entry.js）');
});

// ── B2 三件套整文件 ──────────────────────────────────────────────────────────
test('B2 三件套整文件哈希 ≡ 基线（About 页面 / 样式 / 入口脚本一字不动）', () => {
  const entries = ABOUT_FREEZE_BASELINE.filter((e) => e.locator === null);
  const problems = checkBaseline(ROOT, entries);
  assert.deepEqual(problems, [], `About 三件套被改动：\n  ${problems.join('\n  ')}`);
  console.log(`[B2] 三件套整文件哈希：${entries.length} 件一致`);
});

// ── B3 两处引用面 ────────────────────────────────────────────────────────────
test('B3 两处引用面定位片段 ≡ 基线（功能目录「关于」卡 · help 正文页面清单）', () => {
  const entries = ABOUT_FREEZE_BASELINE.filter((e) => e.locator !== null);
  const problems = checkBaseline(ROOT, entries);
  assert.deepEqual(problems, [], `About 引用面被改动：\n  ${problems.join('\n  ')}`);
  console.log(`[B3] 引用面定位片段：${entries.length} 处一致`);
});

// ── B4 非空转：定位串在真实文件里恰好命中 1 行 ───────────────────────────────
test('B4 非空转：每条定位串在真实文件里恰好命中 1 行且片段非空', () => {
  const entries = ABOUT_FREEZE_BASELINE.filter((e) => e.locator !== null);
  assert.equal(entries.length, 2, `定位串条目应为 2 条（实为 ${entries.length}）：B3 的判红面被削`);
  for (const e of entries) {
    const hits = locateLines(readFileSync(join(ROOT, e.file), 'utf8'), e.locator);
    assert.equal(hits.length, 1,
      `${e.file}：定位串「${e.locator}」命中 ${hits.length} 行（应恰好 1 行）——定位串未命中，条目可能被删；`
      + '命中多行则判据不确定');
    assert.ok(hits[0].text.length >= 20,
      `${e.file}:${hits[0].line}：定位片段只有 ${hits[0].text.length} 字，过短不足以承载条目内容`);
  }
  console.log(`[B4] 定位串命中：${entries.map((e) => e.file).join(' · ')}`);
});

// ── B5 反例：临时副本改动任一处必须判红 ─────────────────────────────────────
test('B5 反例：临时副本改动任一处必须判红（真实文件不动）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'about-freeze-'));
  try {
    for (const e of ABOUT_FREEZE_BASELINE) {
      const dst = join(dir, e.file);
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(join(ROOT, e.file), dst);
    }

    // ① 原样副本 ⇒ 必须判绿（否则判定器恒红，反例没有证明力）
    assert.deepEqual(checkBaseline(dir), [], '临时副本原样却判红：判定器恒红，本守卫的绿不成立');

    // ② 逐处改内容 ⇒ 必须判红
    for (const e of ABOUT_FREEZE_BASELINE) {
      const p = join(dir, e.file);
      const original = readFileSync(p, 'utf8');
      let tampered;
      if (!e.locator) {
        tampered = `${original}\n<!-- freeze-tamper -->\n`;          // 整文件：追加一行即改哈希
      } else {
        tampered = normalize(original).replace(e.locator, `${e.locator}　`); // 定位片段：只改命中行
      }
      writeFileSync(p, tampered, 'utf8');
      const problems = checkBaseline(dir);
      assert.ok(problems.some((s) => s.startsWith(`${e.file}:`) || s.startsWith(`${e.file}：`)),
        `${e.file}：内容改动后未判红（反例失效）——问题清单：${JSON.stringify(problems)}`);
      writeFileSync(p, original, 'utf8');
    }

    // ③ 引用面整行删除 ⇒ 必须报「定位串未命中，条目可能被删」
    for (const e of ABOUT_FREEZE_BASELINE.filter((x) => x.locator !== null)) {
      const p = join(dir, e.file);
      const original = readFileSync(p, 'utf8');
      const kept = normalize(original).split('\n').filter((line) => !line.includes(e.locator)).join('\n');
      writeFileSync(p, kept, 'utf8');
      const problems = checkBaseline(dir);
      assert.ok(problems.some((s) => s.includes('定位串未命中，条目可能被删')),
        `${e.file}：删掉该行后未报「定位串未命中，条目可能被删」——防「删条目冒充合规」的判据失效`);
      writeFileSync(p, original, 'utf8');
    }

    // ④ 反例跑完，真实文件仍应与基线一致（证明全程只动临时副本）
    assert.deepEqual(checkBaseline(ROOT), [], '反例过程中真实 About 冻结件被改动');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log('[B5] 反例：5 处逐个改动均判红 · 副本原样判绿 · 真实文件未动');
});
