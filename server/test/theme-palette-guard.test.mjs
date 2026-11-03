// role: [工程师]+[AI]
// theme-palette-guard.test.mjs — 7 主题显式色板守卫（spec redesign-theme-palette-and-density · Task 9）
//
// 本文件由 `theme-palette-guard.test.mjs` / `gold-accent-guard.test.mjs` 合并而来（2026-10-24 批次 509）：
//   原 `gold-accent-guard` 的 G1–G5 断言**逐条搬入本文件末尾**，未删一条。
//   为什么做一个而不是两个：两者检查的是**同一张主题色表**（`ACCENT_COLORS`）与**同一组 CSS token**，
//   失败根因都是「色值 / 派生链与主题表不一致」；拆开只会在红的时候多一次「该去哪个文件找」的跳转。
//
// 为什么要有本守卫：
//   · 批次 505 把主题色从「1 个 hex + color-mix 公式」改成「7 主题 × 亮/暗 × 9 个手选 hex」。
//     公式退场后，**没有任何守卫校验色值本身**：改错一个 hex、少写一个 token、把某主题
//     退回 color-mix，都不会有红灯。本文件把色板结构、对比度、彩度与「固定语义色分离」
//     钉成可机检判据。
//   · 判据（与 spec「ADDED Requirements」逐条对应）：
//       T1 结构：ACCENT_COLORS 恰 7 主题；每主题 light/dark 各 9 个合法 hex
//       T2 对比度：softText/softBg 4.5–12；strongInk/strongBg ≥4.5；strongBg/卡片底 ≥3；
//                  softBg 与白 1.08–1.35；strongBg HSL 饱和度 ≤85%
//       T3 色板：ACCENT_PALETTE 恰 7 项、旧键（sky/light-blue/deep）不在其中且有别名回落
//       T4 选择器：appearance-controls.js 只列 7 项、每项 2 枚小样、消费 getAccentColors、无 hex 字面量
//       T5 语义色分离：活动类别色 / 党徽金不读 --app-accent*
//       T6 strongHover（批次 508 第 9 token）：与 strongBg 同色相且不同值、与 strongInk ≥4.5:1、
//          不得等于 activeBg（否则 hover 与选中态无法区分）
//       T7 strongHover 非空转：7 主题 × 亮/暗都真实存在（不是 undefined），且注入 / 别名链齐备
//   · 非空转：每类断言都先核「命中数 >0」，避免正则/解析写坏导致恒真。
// 运行：node --test server/test/theme-palette-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCENT_COLORS, ACCENT_PALETTE, ACCENT_KEY_ALIASES, normalizeAccentKey, getAccentColors,
  accentButtonColors, ROLE_COLORS,
} from '../../docs/src/core/domain/constants.js?v=20261102b';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const STYLES = read('docs/src/styles.css');
const CONSTANTS = read('docs/src/core/domain/constants.js');

/** 取某选择器的规则体（逗号分隔后精确匹配；先剥注释） */
function ruleBody(css, selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim().split(',').map((s) => s.trim()).includes(selector)) return m[2];
  }
  return '';
}

const THEME_KEYS = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple'];
const TOKEN_KEYS = ['base', 'softBg', 'softBorder', 'softText', 'strongBg', 'strongInk', 'strongHover', 'hoverBg', 'activeBg'];
const OLD_KEYS = ['sky', 'light-blue', 'deep'];
const HEX_VALUE_RE = /^#[0-9A-Fa-f]{6}$/;
const CARD_LIGHT = '#FFFFFF';
const CARD_DARK = '#141D2F';

// ── 颜色工具（WCAG 2.x；与 ui-contrast-guard 同式，避免依赖第三方） ──
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex) => {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const luminance = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
/** HSL 饱和度（0–100）：S = (max-min) / (1 - |max+min-1|) */
const hslSaturation = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  return ((max - min) / (1 - Math.abs(max + min - 1))) * 100;
};
/** HSL 色相（0–360），用于判 strongHover 与 strongBg 是否同色相 */
const hue = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const hueDiff = (a, b) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};

test('T1 结构：ACCENT_COLORS 恰 7 主题 × 亮/暗 × 9 个合法 hex token', () => {
  const keys = Object.keys(ACCENT_COLORS);
  assert.equal(keys.length, 7, `主题数应为 7，实际 ${keys.length}：${keys.join('/')}`);
  assert.deepEqual([...keys].sort(), [...THEME_KEYS].sort(), '主题键必须恰为 gold/red/orange/green/cyan/blue/purple');

  let tokenCount = 0;
  for (const key of THEME_KEYS) {
    const entry = ACCENT_COLORS[key];
    assert.ok(entry, `缺少主题 ${key}`);
    assert.equal(entry.key, key, `${key}.key 应为 '${key}'`);
    for (const mode of ['light', 'dark']) {
      const tokens = entry[mode];
      assert.ok(tokens, `${key}.${mode} 缺失`);
      const tokenKeys = Object.keys(tokens);
      assert.equal(tokenKeys.length, 9, `${key}.${mode} 应有 9 个 token，实际 ${tokenKeys.length}：${tokenKeys.join('/')}`);
      assert.deepEqual([...tokenKeys].sort(), [...TOKEN_KEYS].sort(), `${key}.${mode} token 名不符`);
      for (const name of TOKEN_KEYS) {
        const value = tokens[name];
        assert.match(value, HEX_VALUE_RE,
          `${key}.${mode}.${name} 必须是手选 6 位 hex（当前 ${JSON.stringify(value)}）：不得 color-mix / rgba / var 派生`);
        tokenCount += 1;
      }
    }
  }
  assert.equal(tokenCount, 7 * 2 * 9, `token 总数应为 126，实际 ${tokenCount}`);
});

test('T2 对比度与彩度：7 主题 × 亮/暗逐项达标', () => {
  const problems = [];
  const readings = [];
  for (const key of THEME_KEYS) {
    for (const mode of ['light', 'dark']) {
      const t = ACCENT_COLORS[key][mode];
      const soft = contrast(t.softText, t.softBg);
      const ink = contrast(t.strongInk, t.strongBg);
      const strongCard = contrast(t.strongBg, mode === 'light' ? CARD_LIGHT : CARD_DARK);
      const softWhite = contrast(t.softBg, CARD_LIGHT);
      const sat = hslSaturation(t.strongBg);
      readings.push(`${key}.${mode}: soft ${soft.toFixed(2)} / ink ${ink.toFixed(2)} / strong-vs-card ${strongCard.toFixed(2)} / softBg-vs-white ${softWhite.toFixed(2)} / sat ${sat.toFixed(1)}%`);
      if (soft < 4.5) problems.push(`${key}.${mode} softText/softBg=${soft.toFixed(2)} < 4.5`);
      if (soft > 12) problems.push(`${key}.${mode} softText/softBg=${soft.toFixed(2)} > 12（刺眼）`);
      if (ink < 4.5) problems.push(`${key}.${mode} strongInk/strongBg=${ink.toFixed(2)} < 4.5`);
      if (strongCard < 3) problems.push(`${key}.${mode} strongBg/卡片底=${strongCard.toFixed(2)} < 3`);
      // softBg 的低彩度只对亮色档可测（暗色 softBg 是深底，与白对比天然 >1.35）
      if (mode === 'light' && (softWhite < 1.08 || softWhite > 1.35)) {
        problems.push(`${key}.light softBg 与白=${softWhite.toFixed(2)}，应落在 1.08–1.35`);
      }
      if (sat > 85) problems.push(`${key}.${mode} strongBg 饱和度=${sat.toFixed(1)}% > 85%（固定语义色除外，主题表内不得刺眼）`);
    }
  }
  assert.ok(readings.length === 14, `应产出 14 行读数，实际 ${readings.length}`);
  console.log(`[theme-palette] 对比度/彩度实测：\n  ${readings.join('\n  ')}`);
  assert.deepEqual(problems, [], `主题色板对比度/彩度不达标：\n  ${problems.join('\n  ')}`);
});

test('T3 色板：ACCENT_PALETTE 恰 7 项、旧键退场且有别名回落', () => {
  assert.equal(ACCENT_PALETTE.length, 7, `ACCENT_PALETTE 应为 7 项，实际 ${ACCENT_PALETTE.length}`);
  const paletteKeys = ACCENT_PALETTE.map((c) => c.key);
  assert.deepEqual([...paletteKeys].sort(), [...THEME_KEYS].sort(), 'ACCENT_PALETTE 键必须恰为 7 主题');
  for (const old of OLD_KEYS) {
    assert.ok(!paletteKeys.includes(old), `旧键 ${old} 仍在色板里（紫只留一个、蓝只留一个）`);
    assert.ok(ACCENT_KEY_ALIASES[old], `旧键 ${old} 缺少别名回落映射`);
  }
  // 旧值回落：天蓝/亮蓝 → 蓝；雾紫/深度参与者 → 紫；角色键收敛到 7 项。
  assert.equal(normalizeAccentKey('sky'), 'blue', 'sky 应回落 blue');
  assert.equal(normalizeAccentKey('light-blue'), 'blue', 'light-blue 应回落 blue');
  assert.equal(normalizeAccentKey('deep'), 'purple', 'deep 应回落 purple');
  assert.equal(normalizeAccentKey('participant'), 'gold', 'participant 应回落 gold（默认金）');
  assert.equal(normalizeAccentKey('secretary'), 'red', 'secretary 应收敛 red');
  assert.equal(normalizeAccentKey('totally-unknown'), 'gold', '未知键应回落 gold');
  // 查表返回 9 个 token + 旧别名，且不再做亮度分流
  const t = getAccentColors('gold', 'light');
  for (const name of TOKEN_KEYS) assert.equal(t[name], ACCENT_COLORS.gold.light[name], `getAccentColors 未按表返回 ${name}`);
  assert.equal(t.bg, t.softBg, '兼容别名 bg 应指向 softBg');
  assert.equal(t.strong, t.strongBg, '兼容别名 strong 应指向 strongBg');
  assert.equal(t.ink, t.strongInk, '兼容别名 ink 应指向 strongInk');
});

test('T4 主题选择器：只列 7 项、每项 2 枚小样、消费 getAccentColors、无 hex 字面量', () => {
  const src = read('docs/src/components/shell/appearance-controls.js');
  assert.match(src, /import\s*\{[^}]*ACCENT_PALETTE[^}]*\}\s*from\s*['"][^'"]*constants\.js/,
    'appearance-controls.js 应从 constants.js 导入 ACCENT_PALETTE（单一源）');
  assert.match(src, /import\s*\{[^}]*getAccentColors[^}]*\}\s*from\s*['"][^'"]*constants\.js/,
    'appearance-controls.js 应导入 getAccentColors（消费主题表，不写死色值）');
  assert.match(src, /ACCENT_PALETTE\.map\(/, '主题项应由 ACCENT_PALETTE.map 生成（只列 7 项）');
  const sampleHits = [...src.matchAll(/data-accent-sample=/g)].length;
  assert.equal(sampleHits, 2, `每个主题项应有 2 枚小样（soft / strong），模板里 data-accent-sample 出现 ${sampleHits} 次`);
  assert.match(src, /data-accent-sample="soft"/, '缺少「浅底 + 深字」小样');
  assert.match(src, /data-accent-sample="strong"/, '缺少「实底 + 字」小样');
  assert.match(src, /getAccentColors\(el\.dataset\.accentKey,\s*mode\)/,
    '小样重绘应按当前亮/暗从主题表取色');
  const hex = src.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  assert.deepEqual(hex, [], `appearance-controls.js 不得出现 hex 字面量：${hex.join(' ')}`);
  // 旧键回落提示与 constants.js 同口径
  assert.match(src, /sky:\s*'blue'/, '旧键 sky 应回落 blue');
  assert.match(src, /'light-blue':\s*'blue'/, '旧键 light-blue 应回落 blue');
  assert.match(src, /deep:\s*'purple'/, '旧键 deep 应回落 purple');
});

test('T5 固定语义色分离：活动类别色 / 党徽金不读 --app-accent*', () => {
  const constants = read('docs/src/core/domain/constants.js');
  const typeBase = /const _ACTIVITY_TYPE_BASE\s*=\s*\{([\s\S]*?)\n\};/.exec(constants);
  assert.ok(typeBase, 'constants.js 缺少 _ACTIVITY_TYPE_BASE（活动类别色表）');
  assert.doesNotMatch(typeBase[1], /--app-accent/, '_ACTIVITY_TYPE_BASE 不得读主题 token（活动类别色是固定语义色）');
  assert.match(typeBase[1], /partyGold|_C\.partyGold/, '主题党日系应使用固定党徽金（_C.partyGold）');
  assert.match(typeBase[1], /partyRedBrand|_C\.partyRedBrand/, '三会一课系应使用固定党建红（_C.partyRedBrand）');

  const classification = /export const ACTIVITY_CLASSIFICATION\s*=\s*\{([\s\S]*?)\n\};/.exec(constants);
  assert.ok(classification, 'constants.js 缺少 ACTIVITY_CLASSIFICATION');
  assert.doesNotMatch(classification[1], /--app-accent/, 'ACTIVITY_CLASSIFICATION 不得读主题 token');

  const styles = read('docs/src/styles.css');
  assert.match(styles, /--party-gold:\s*#FFD700\s*;/, '党徽金应为固定 #FFD700（与主题金分开定义）');
  assert.match(styles, /--party-red:\s*#CE1126\s*;/, '党建红应为固定 #CE1126');
  assert.doesNotMatch(styles, /--party-gold:\s*var\(--app-accent/, '党徽金不得指向主题色变量');
  // 主题金与党徽金不同值（支书口径「党徽金 ≠ 主题金」）
  assert.notEqual(ACCENT_COLORS.gold.light.base.toLowerCase(), '#ffd700', '主题金不应等于党徽金 #FFD700（主题金应更沉稳）');
});

test('T6 strongHover：与 strongBg 同色相且不同值、与 strongInk ≥4.5:1、不得等于 activeBg', () => {
  const problems = [];
  const readings = [];
  for (const key of THEME_KEYS) {
    for (const mode of ['light', 'dark']) {
      const t = ACCENT_COLORS[key][mode];
      const hd = hueDiff(t.strongBg, t.strongHover);
      const ink = contrast(t.strongInk, t.strongHover);
      readings.push(`${key}.${mode}: hueΔ ${hd.toFixed(2)}° / ink-hover ${ink.toFixed(2)} / hover≠bg ${t.strongHover !== t.strongBg} / hover≠active ${t.strongHover !== t.activeBg}`);
      if (hd > 3) problems.push(`${key}.${mode} strongHover 与 strongBg 色相差 ${hd.toFixed(2)}° > 3°（实底 hover 必须同色相加深，不得换色相）`);
      if (t.strongHover === t.strongBg) problems.push(`${key}.${mode} strongHover 与 strongBg 同值（hover 无可见变化）`);
      if (t.strongHover === t.activeBg) problems.push(`${key}.${mode} strongHover 与 activeBg 同值（hover 与选中态无法区分）`);
      // 留 1e-9 容差：暗色红/橙/蓝/紫实测 4.50 恰好贴线，避免浮点尾差误判
      if (ink < 4.5 - 1e-9) problems.push(`${key}.${mode} strongInk/strongHover=${ink.toFixed(2)} < 4.5`);
    }
  }
  assert.equal(readings.length, 14, `应产出 14 行读数，实际 ${readings.length}`);
  console.log(`[theme-palette] strongHover 实测：\n  ${readings.join('\n  ')}`);
  assert.deepEqual(problems, [], `strongHover 不达标：\n  ${problems.join('\n  ')}`);
});

test('T7 strongHover 非空转：7 主题 × 亮/暗都真实存在，且注入 / 别名链齐备', () => {
  const presets = [];
  for (const key of THEME_KEYS) {
    for (const mode of ['light', 'dark']) {
      const tokens = ACCENT_COLORS[key][mode];
      assert.ok(Object.prototype.hasOwnProperty.call(tokens, 'strongHover'),
        `${key}.${mode} 缺少 strongHover 键（undefined / 未登记）`);
      assert.equal(typeof tokens.strongHover, 'string', `${key}.${mode}.strongHover 必须是字符串`);
      assert.match(tokens.strongHover, HEX_VALUE_RE, `${key}.${mode}.strongHover 必须是 6 位 hex`);
      const viaLookup = getAccentColors(key, mode).strongHover;
      assert.equal(viaLookup, tokens.strongHover, `getAccentColors('${key}','${mode}') 未返回 strongHover`);
      assert.notEqual(viaLookup, undefined, `${key}.${mode} getAccentColors().strongHover 为 undefined`);
      presets.push(viaLookup);
    }
  }
  assert.equal(presets.length, 14, `应核对 14 个 strongHover 值，实际 ${presets.length}`);

  // 注入链：theme.js 的 9 个后缀与 token 数组都含 strongHover；styles.css 有亮/暗原始变量与选边别名。
  const theme = read('docs/src/core/boot/theme.js');
  assert.match(theme, /ACCENT_TOKEN_SUFFIXES\s*=\s*\[[^\]]*'strong-hover'[^\]]*\]/,
    'theme.js 的 ACCENT_TOKEN_SUFFIXES 缺 strong-hover（第 9 token 不会注入）');
  assert.match(theme, /light\.strongHover/, 'theme.js 亮色 token 数组缺 strongHover');
  assert.match(theme, /dark\.strongHover/, 'theme.js 暗色 token 数组缺 strongHover');
  const styles = read('docs/src/styles.css');
  for (const name of ['--app-accent-strong-hover-light', '--app-accent-strong-hover-dark', '--app-accent-strong-hover']) {
    assert.ok(styles.includes(`${name}:`), `styles.css 缺 ${name} 定义`);
  }
  assert.match(styles, /html\.theme-dark\s*\{[\s\S]*?--app-accent-strong-hover:\s*var\(--app-accent-strong-hover-dark\)/,
    'styles.css 暗色段未把 --app-accent-strong-hover 选边到 *-dark');
});

// ═════════════════════════════════════════════════════════════════════════════
// T8–T9：功能色层（2026-10-26 Task 4）
//   T8 状态 / 类别 / 身份 token 齐备：--status-* 与别名；类别暗色 ≠ 状态暗色；
//      --color-identity-* 逐值等于 ROLE_COLORS（text / textDark）；
//      --color-link / --color-text-* / --color-border-* 语义别名存在。
//   T9 僵尸 token 零消费者：12 个已删 token 在 docs/ 下不得再出现（注释也算）。
// ═════════════════════════════════════════════════════════════════════════════

/** 取 :root 内某变量值（先剥注释） */
function rootVar(css, name) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(clean);
  return m ? m[1].trim() : '';
}

/** 解 var(--x) 别名链（只到 hex；用于功能色 → 类别色的单一源核对） */
function resolveVarChain(css, value, depth = 0) {
  const v = String(value || '').trim();
  const m = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
  if (!m || depth > 8) return v;
  return resolveVarChain(css, rootVar(css, m[1]), depth + 1);
}

/** 取 html.theme-dark 块文本（大括号配对） */
function darkBlock(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = src.indexOf('html.theme-dark {');
  if (i < 0) return '';
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let p = start; p < src.length; p += 1) {
    if (src[p] === '{') depth += 1;
    else if (src[p] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, p);
    }
  }
  return '';
}

/** 递归收集 docs/src 下 .js */
function walkJs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
      walkJs(p, out);
      continue;
    }
    if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const IDENTITY_ROLES = Object.keys(ROLE_COLORS);

test('T8 功能色层：状态 / 类别 / 身份 / 语义别名齐备且身份色与 ROLE_COLORS 同值', () => {
  // ① 状态 4 色 + 短期别名（组件只读 --status-*）
  for (const key of ['success', 'warning', 'error', 'info']) {
    assert.match(rootVar(STYLES, `--status-${key}`), HEX_VALUE_RE, `styles.css 缺 --status-${key} 亮色值`);
    assert.equal(rootVar(STYLES, `--functional-${key}`), `var(--status-${key})`,
      `--functional-${key} 应仅为 --status-${key} 的兼容别名`);
  }
  const dark = darkBlock(STYLES);
  assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');
  for (const key of ['success', 'warning', 'error', 'info']) {
    assert.match(rootVar(dark, `--status-${key}`), HEX_VALUE_RE, `暗色段缺 --status-${key} 的暗色值`);
  }

  // ② 类别 3 色；暗色类别与状态色分开（不再逐值相同）
  //    2026-10-27 Task 11.4：类别改为引用功能 color token（var 链），这里解析到最终 hex 再核。
  const functionalRed = rootVar(STYLES, '--color-functional-red');
  const functionalRedDark = rootVar(STYLES, '--color-functional-red-dark');
  const functionalGold = rootVar(STYLES, '--color-functional-gold');
  const functionalGoldDark = rootVar(STYLES, '--color-functional-gold-dark');
  assert.match(functionalRed, HEX_VALUE_RE, '缺功能红亮色 token');
  assert.match(functionalRedDark, HEX_VALUE_RE, '缺功能红暗色 token');
  assert.match(functionalGold, HEX_VALUE_RE, '缺功能金亮色 token');
  assert.match(functionalGoldDark, HEX_VALUE_RE, '缺功能金暗色 token');
  assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-three-meetings')), functionalRed,
    '类别红应引用 --color-functional-red（单一源）');
  assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-three-meetings-dark')), functionalRedDark,
    '类别红暗色应引用 --color-functional-red-dark');
  assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-theme-day')), functionalGold,
    '主题党日金应引用 --color-functional-gold');
  assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-theme-day-dark')), functionalGoldDark,
    '主题党日金暗色应引用 --color-functional-gold-dark');
  assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-theme-day-dot')), '#FFD700',
    '主题党日圆点应仍取党徽金 --party-gold（#FFD700）');
  assert.match(rootVar(STYLES, '--color-category-other'), HEX_VALUE_RE, '缺类别中性 token');
  const categoryRedDark = functionalRedDark;
  const categoryGoldDark = functionalGoldDark;
  const statusErrorDark = rootVar(dark, '--status-error');
  const statusWarningDark = rootVar(dark, '--status-warning');
  assert.notEqual(categoryRedDark.toLowerCase(), statusErrorDark.toLowerCase(),
    `暗色类别红 ${categoryRedDark} 不得等于 danger ${statusErrorDark}（类别不得借状态色）`);
  assert.notEqual(categoryGoldDark.toLowerCase(), statusWarningDark.toLowerCase(),
    `暗色主题党日金 ${categoryGoldDark} 不得等于 warning ${statusWarningDark}`);

  // ③ 身份色逐值等于 ROLE_COLORS.text / textDark（单一源；CSS 只放同值 token）
  assert.ok(IDENTITY_ROLES.length >= 10, `ROLE_COLORS 角色数过少（${IDENTITY_ROLES.length}）`);
  for (const role of IDENTITY_ROLES) {
    const expected = ROLE_COLORS[role].text;
    const expectedDark = ROLE_COLORS[role].textDark;
    assert.equal(rootVar(STYLES, `--color-identity-${role}`), expected,
      `--color-identity-${role} 应等于 ROLE_COLORS['${role}'].text（${expected}）`);
    assert.equal(rootVar(STYLES, `--color-identity-${role}-dark`), expectedDark,
      `--color-identity-${role}-dark 应等于 ROLE_COLORS['${role}'].textDark（${expectedDark}）`);
  }

  // ④ 语义别名（组件只读这一层）
  assert.equal(rootVar(STYLES, '--color-link'), 'var(--app-accent-soft-text)',
    '--color-link 应指向主题 soft-text（全站唯一链接色）');
  for (const [name, target] of [
    ['--color-text-primary', 'var(--neutral-800)'],
    ['--color-text-secondary', 'var(--neutral-600)'],
    ['--color-text-tertiary', 'var(--neutral-500)'],
    ['--color-border-subtle', 'var(--neutral-200)'],
    ['--color-border-strong', 'var(--neutral-300)'],
  ]) {
    assert.equal(rootVar(STYLES, name), target, `${name} 应指向 ${target}`);
  }
});

test('T9 僵尸 token 零消费者：12 个已删 token 在 docs 下不得再出现', () => {
  const ZOMBIES = [
    '--accent-sky', '--accent-indigo', '--accent-violet', '--accent-violet-light',
    '--accent-blue', '--accent-emerald', '--accent-amber', '--status-live',
    '--blue-hover', '--sky-hover', '--error-dark', '--brand-amber-dark',
  ];
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (/\.(js|mjs|css|html)$/.test(e.name)) files.push(p);
    }
  };
  walk(join(ROOT, 'docs'));
  assert.ok(files.length >= 100, `扫描面过小（${files.length} 个文件）`);
  const hits = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const token of ZOMBIES) {
      if (src.includes(token)) hits.push(`${relative(ROOT, f)} → ${token}`);
    }
  }
  assert.deepEqual(hits, [], `已删除的僵尸 token 仍有消费者 / 残留：\n  ${hits.join('\n  ')}`);

  // 组件只写 --status-*：JS 源码不得再出现 --functional-*
  const jsFiles = walkJs(join(ROOT, 'docs', 'src'));
  const legacy = [];
  for (const f of jsFiles) {
    if (readFileSync(f, 'utf8').includes('--functional-')) legacy.push(relative(ROOT, f));
  }
  assert.deepEqual(legacy, [], `组件仍在使用 --functional-*（应改 --status-*）：\n  ${legacy.join('\n  ')}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// T10：功能色分离（2026-10-27 Task 11.4）
//   功能红/金只服务三会一课 / 主题党日等类别；与 danger / warning / 7 主题 accent
//   逐值不同，文字 vs 徽章底 ≥4.5:1。
// ═════════════════════════════════════════════════════════════════════════════
test('T10 功能色分离：亮/暗齐备、与 danger/warning/主题 accent 不撞值、文字 ≥4.5:1', () => {
  const red = rootVar(STYLES, '--color-functional-red');
  const redDark = rootVar(STYLES, '--color-functional-red-dark');
  const gold = rootVar(STYLES, '--color-functional-gold');
  const goldDark = rootVar(STYLES, '--color-functional-gold-dark');
  const functional = [red, redDark, gold, goldDark].map((v) => v.toLowerCase());
  assert.deepEqual(functional, ['#ce1126', '#fca5a5', '#a16207', '#fcd34d'],
    `功能色应为红 #CE1126/#FCA5A5、金 #A16207/#FCD34D，实际 ${functional.join('/')}`);

  // 与状态色逐值不同（亮/暗两档都要核）
  for (const [mode, values] of [
    ['light', ['--status-error', '--status-warning']],
    ['dark', ['--status-error', '--status-warning']],
  ]) {
    const block = mode === 'light' ? STYLES : darkBlock(STYLES);
    for (const name of values) {
      const status = rootVar(block, name).toLowerCase();
      assert.ok(!functional.includes(status), `${mode} ${name}（${status}）不得等于任何功能色`);
    }
  }

  // 与 7 主题 × 亮/暗的所有 accent token 不撞值
  const collisions = [];
  for (const key of THEME_KEYS) {
    for (const mode of ['light', 'dark']) {
      for (const [name, value] of Object.entries(ACCENT_COLORS[key][mode])) {
        if (functional.includes(String(value).toLowerCase())) collisions.push(`${key}.${mode}.${name}=${value}`);
      }
    }
  }
  assert.deepEqual(collisions, [], `功能色不得与主题 accent 同值：${collisions.join(' ')}`);

  // 文字 vs 徽章底 ≥4.5:1
  const mixHex = (a, b, p) => {
    const [ar, ag, ab] = rgb(a);
    const [br, bg, bb] = rgb(b);
    return `#${[ar * p + br * (1 - p), ag * p + bg * (1 - p), ab * p + bb * (1 - p)]
      .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  };
  const redDarkBg = mixHex(red, '#0F172A', 0.16);
  const readings = [
    ['功能红/亮徽章底', contrast(red, '#FEF2F2')],
    ['功能金/亮徽章底', contrast(gold, '#FEF9C3')],
    ['功能红/暗徽章底', contrast(redDark, redDarkBg)],
    ['功能金/暗徽章底', contrast(goldDark, '#2E2510')],
  ].map(([label, ratio]) => `${label} ${ratio.toFixed(2)}:1`);
  console.log(`[theme-palette] T10 功能色对比度：${readings.join(' · ')}`);
  for (const [label, ratio] of [
    ['功能红/亮徽章底', contrast(red, '#FEF2F2')],
    ['功能金/亮徽章底', contrast(gold, '#FEF9C3')],
    ['功能红/暗徽章底', contrast(redDark, redDarkBg)],
    ['功能金/暗徽章底', contrast(goldDark, '#2E2510')],
  ]) {
    assert.ok(ratio >= 4.5, `${label} ${ratio.toFixed(2)}:1 < 4.5`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// T11：暗色色阶补齐（2026-10-31 P8）
//   病灶：`--primary-50/100/200` 在 `html.theme-dark` 段完全没有反向，
//   `.workflow-state-phase` 等亮暗两模式渲成同一块 `#FEF2F2`；`--color-identity-*`
//   也只有 `-dark` 后缀档、基础名在暗色下仍取亮色值。
//   判据：① 暗色段必须定义 primary-50/100/200 与全部 identity 基础名（缺一即红）；
//         ② 抽 6 个真实元素（规则体 background 取 token），断言亮/暗解析值不同；
//         ③ 暗色 primary-200（描边）≥3:1、primary-50 上的文字 ≥4.5:1、identity 暗色文字 ≥4.5:1。
// ═════════════════════════════════════════════════════════════════════════════
test('T11 暗色色阶：primary-50/100/200 与 identity 基础名全部有暗色值；6 个元素亮暗背景不同', () => {
  const dark = darkBlock(STYLES);
  assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');

  /** 在指定块内解 var() 链；块内没有则回落全文件 :root */
  const resolveIn = (block, value) => {
    let v = String(value || '').trim();
    for (let i = 0; i < 8; i += 1) {
      const m = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
      if (!m) break;
      const next = rootVar(block, m[1]) || rootVar(STYLES, m[1]);
      if (!next) break;
      v = next;
    }
    return v;
  };

  // ① primary 低阶三档
  for (const name of ['--primary-50', '--primary-100', '--primary-200']) {
    const darkRaw = rootVar(dark, name);
    assert.ok(darkRaw, `暗色段缺 ${name}（深色下会退回亮白块）`);
    const light = resolveIn('', rootVar(STYLES, name));
    const darkVal = resolveIn(dark, darkRaw);
    assert.match(darkVal, HEX_VALUE_RE, `${name} 暗色值解析不到 hex（${darkRaw}）`);
    assert.notEqual(darkVal.toLowerCase(), light.toLowerCase(), `${name} 亮/暗同值（${light}）：暗色段没有真正反向`);
  }

  // ② identity 基础名：全部 role（含 CSS 独有的 deputy-leader）
  const identityNames = [
    ...IDENTITY_ROLES.map((r) => `--color-identity-${r}`),
    '--color-identity-deputy-leader',
  ];
  assert.ok(identityNames.length >= 5, `identity 核对面过小（${identityNames.length}）`);
  for (const name of identityNames) {
    const darkRaw = rootVar(dark, name);
    assert.ok(darkRaw, `暗色段缺 ${name}（消费方写基础名时仍取亮色值）`);
    const light = resolveIn('', rootVar(STYLES, name));
    const darkVal = resolveIn(dark, darkRaw);
    assert.match(darkVal, HEX_VALUE_RE, `${name} 暗色值解析不到 hex（${darkRaw}）`);
    assert.notEqual(darkVal.toLowerCase(), light.toLowerCase(), `${name} 亮/暗同值（${light}）`);
    assert.equal(darkVal.toLowerCase(), resolveIn(dark, rootVar(STYLES, `${name}-dark`)).toLowerCase(),
      `${name} 暗色值应等于 -dark 档（单一源＝ROLE_COLORS.textDark）`);
  }

  // ③ 6 个真实元素：规则体的 backgroundColor token 在亮/暗下必须解析成不同值
  const elements = [
    ['.workflow-state-phase', '--primary-50'],
    ['.cal-cell-mobile.has-tasks:active', '--primary-50'],
    ['.branch-config-nav [aria-current="page"]', '--primary-50'],
    ['.ref-download-btn', '--primary-50'],
    ['.ref-download-btn:hover', '--primary-100'],
    ['.ref-doc-action-danger', '--primary-50'],
  ];
  const readings = [];
  for (const [selector, expected] of elements) {
    const body = ruleBody(STYLES, selector);
    assert.ok(body, `styles.css 缺少 ${selector} 规则`);
    const m = /background(?:-color)?:\s*var\((--[a-z0-9-]+)\)/i.exec(body);
    assert.ok(m, `${selector} 的 background 应为 var(--token)（实际：${body.trim().slice(0, 80)}）`);
    assert.equal(m[1], expected, `${selector} 的 background token 应为 ${expected}，实际 ${m[1]}`);
    const light = resolveIn('', rootVar(STYLES, m[1]));
    const darkVal = resolveIn(dark, rootVar(dark, m[1]));
    assert.notEqual(darkVal.toLowerCase(), light.toLowerCase(),
      `${selector} 亮/暗 backgroundColor 相同（${light}）：元素在深色下仍是亮块`);
    readings.push(`${selector} ${light} → ${darkVal}`);
  }
  assert.equal(readings.length, 6, `应核对 6 个元素，实际 ${readings.length}`);
  console.log(`[theme-palette] T11 亮/暗背景：${readings.join(' · ')}`);

  // ④ 对比度：描边 / 文字
  const p200 = resolveIn(dark, rootVar(dark, '--primary-200'));
  const p50 = resolveIn(dark, rootVar(dark, '--primary-50'));
  const p300 = resolveIn('', rootVar(STYLES, '--primary-300'));
  const border = contrast(p200, CARD_DARK);
  const text = contrast(p300, p50);
  assert.ok(border >= 3, `primary-200 暗色描边对深卡 ${border.toFixed(2)}:1 < 3`);
  assert.ok(text >= 4.5, `primary-300 文字对 primary-50 暗底 ${text.toFixed(2)}:1 < 4.5`);
  const identityRows = identityNames.map((name) => {
    const v = resolveIn(dark, rootVar(dark, name));
    return [name, contrast(v, CARD_DARK), contrast(v, '#0B1220')];
  });
  const bad = identityRows.filter(([, c]) => c < 4.5);
  assert.deepEqual(bad.map(([n]) => n), [], `identity 暗色对深卡 <4.5:1：${bad.map(([n, c]) => `${n}=${c.toFixed(2)}`).join(' ')}`);
  console.log(`[theme-palette] T11 对比度：primary-200/深卡 ${border.toFixed(2)} · primary-300/primary-50 暗底 ${text.toFixed(2)}`
    + ` · identity 暗色/深卡 最低 ${Math.min(...identityRows.map(([, c]) => c)).toFixed(2)}`);
});

// ═════════════════════════════════════════════════════════════════════════════
//
// 历史：该守卫原为「默认现代金 #F5C518 + 深色字」而设（2026-10-19）。
// 批次 505 起主题色改为 **7 主题 × 亮/暗 × 8 个手选 hex**：金主题是更沉稳的琥珀金 #A97A12，
// 实底/实底字/浅底/浅底字各自独立成 token，`filter: brightness`、`--app-accent-strong: var(--app-accent)`
// `--app-accent-text: #1F2937` 等旧派生机制全部退场。本守卫改为锁「新 token 语义」，
// 同时保留党徽金 / 党建红固定色的断言（它们不随主题变化）。
//
// 断言：
//   G1 styles.css：无 #F5C518 / 无 brightness；默认金 8 token 齐备；旧派生写法绝迹；党徽金/党建红固定；
//   G2 constants.js：gold 主题 8 token 为手选 hex；accentButtonColors 查表返回 strongBg/strongInk；
//   G3 四个注入点都走 applyAccentThemeTokens / getAccentColors（16 个原始变量），不再写旧三件套；
//   G4 内存样本：gold 实底 #9A6B0F + 白字、red 实底 #9B2C22 + 白字；非法入参回落 gold（不是 var()）；
//   G5 文字色/焦点环：浅底深字只走 --app-accent-soft-text；不得直接用裸 var(--app-accent)。

test('G1 styles.css：默认金 8 token 齐备；无 #F5C518 / brightness / 旧派生；固定语义色不动', () => {
  // 注释里会写「2026-10-23 Task 7：hover 不再用 filter: brightness」，负例先剥注释再判。
  const bare = STYLES.replace(/\/\*[\s\S]*?\*\//g, '');
  // 旧实现退场：真金 #F5C518 与亮度派生都不得回来
  assert.doesNotMatch(bare, /#F5C518/i, 'styles.css 不得再出现旧默认金 #F5C518');
  assert.doesNotMatch(bare, /filter\s*:\s*brightness/i, 'hover 不得再用 filter: brightness（改用 hoverBg）');
  assert.doesNotMatch(bare, /--app-accent-strong\s*:\s*var\(--app-accent\)\s*;/,
    '--app-accent-strong 不得退回「本色」别名（实底必须查 strongBg）');
  assert.doesNotMatch(bare, /--app-accent-text\s*:\s*#1F2937/i,
    '--app-accent-text 不得退回中性近黑（浅底字必须查 softText）');

  // 默认金（:root 的亮/暗两套原始变量）
  const light = ACCENT_COLORS.gold.light;
  const dark = ACCENT_COLORS.gold.dark;
  for (const [suffix, value] of [
    ['base', light.base], ['soft-bg', light.softBg], ['soft-border', light.softBorder],
    ['soft-text', light.softText], ['strong-bg', light.strongBg], ['strong-ink', light.strongInk],
    ['hover-bg', light.hoverBg], ['active-bg', light.activeBg],
  ]) {
    assert.match(STYLES, new RegExp(`--app-accent-${suffix}-light:\\s*${value}\\s*;`, 'i'),
      `styles.css 缺少默认金 --app-accent-${suffix}-light: ${value}`);
  }
  for (const [suffix, value] of [
    ['base', dark.base], ['soft-bg', dark.softBg], ['soft-border', dark.softBorder],
    ['soft-text', dark.softText], ['strong-bg', dark.strongBg], ['strong-ink', dark.strongInk],
    ['hover-bg', dark.hoverBg], ['active-bg', dark.activeBg],
  ]) {
    assert.match(STYLES, new RegExp(`--app-accent-${suffix}-dark:\\s*${value}\\s*;`, 'i'),
      `styles.css 缺少默认金 --app-accent-${suffix}-dark: ${value}`);
  }
  // 亮/暗选边别名
  assert.match(STYLES, /--app-accent-strong-bg:\s*var\(--app-accent-strong-bg-light\)/,
    '--app-accent-strong-bg 应指向 *-light（亮色选边）');
  assert.match(STYLES, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-light\)/,
    '--app-accent-soft-text 应指向 *-light（亮色选边）');

  // 固定语义色：党徽金 / 党建红不随主题变化
  assert.match(STYLES, /--party-gold:\s*#FFD700\s*;/, '党徽金应固定为 #FFD700');
  assert.match(STYLES, /--party-red:\s*#CE1126\s*;/, '党建红应固定为 #CE1126');
  assert.doesNotMatch(STYLES, /--party-gold:\s*var\(--app-accent/, '党徽金不得指向主题色');
});

test('G2 constants.js：gold 主题 8 token 为手选 hex；accentButtonColors 查表', () => {
  const g = ACCENT_COLORS.gold;
  assert.equal(g.light.base, '#A97A12', 'docs/src/core/domain/constants.js：gold.light.base 应为沉稳琥珀金 #A97A12');
  assert.equal(g.light.softBg, '#FBF3DC', 'docs/src/core/domain/constants.js：gold.light.softBg 应为 #FBF3DC');
  assert.equal(g.light.softBorder, '#E8D5A3', 'docs/src/core/domain/constants.js：gold.light.softBorder 应为 #E8D5A3');
  assert.equal(g.light.softText, '#6E4E08', 'docs/src/core/domain/constants.js：gold.light.softText 应为 #6E4E08');
  assert.equal(g.light.strongBg, '#9A6B0F', 'docs/src/core/domain/constants.js：gold.light.strongBg 应为 #9A6B0F');
  assert.equal(g.light.strongInk, '#FFFFFF', 'docs/src/core/domain/constants.js：gold.light.strongInk 应为白字');
  assert.equal(g.light.hoverBg, '#F6EAC6', 'docs/src/core/domain/constants.js：gold.light.hoverBg 应为 #F6EAC6');
  assert.equal(g.light.activeBg, '#F0DFAC', 'docs/src/core/domain/constants.js：gold.light.activeBg 应为 #F0DFAC');
  assert.equal(g.dark.strongBg, '#C89A34', 'docs/src/core/domain/constants.js：gold.dark.strongBg 应为 #C89A34');
  assert.equal(g.dark.strongInk, '#1E1503', 'docs/src/core/domain/constants.js：gold.dark.strongInk 应为深字 #1E1503');

  assert.match(CONSTANTS, /export function accentButtonColors/, 'constants.js 应导出 accentButtonColors');
  assert.equal(typeof accentButtonColors, 'function', 'accentButtonColors 应可直接 import');
  // 2026-10-24 批次 508：第 9 token strongHover 一并返回（实底 hover 同色相加深）。
  assert.match(CONSTANTS, /return \{ bg: t\.strongBg, text: t\.strongInk, strong: t\.strongBg, ink: t\.strongInk, strongHover: t\.strongHover \};/,
    'accentButtonColors 应直接查表返回 strongBg / strongInk / strongHover（无亮度分流）');
});

test('G3 四个注入点都走 16 个原始变量（applyAccentThemeTokens / getAccentColors）', () => {
  const sites = [
    'docs/src/core/boot/theme.js',
    'docs/src/core/boot/bootstrap.js',
    'docs/src/entries/pages/settings-entry.js',
    'docs/src/components/governance/org-setup-wizard.js',
  ];
  for (const rel of sites) {
    const src = read(rel);
    assert.match(src, /(applyAccentThemeTokens|getAccentColors)\(/, `${rel} 应经主题表取色 / 注入（不写死旧三件套）`);
    assert.doesNotMatch(src, /--app-accent-text',\s*btn\.text/, `${rel} 不应再写旧 --app-accent-text 三件套`);
    assert.doesNotMatch(src, /--app-accent-strong',\s*btn\.strong/, `${rel} 不应再写旧 --app-accent-strong 三件套`);
  }
  // 原始变量清单 = 9 个 token × 亮/暗（批次 508 增补 strong-hover）
  const theme = read('docs/src/core/boot/theme.js');
  assert.match(theme, /const ACCENT_TOKEN_SUFFIXES = \['base', 'soft-bg', 'soft-border', 'soft-text', 'strong-bg', 'strong-ink', 'strong-hover', 'hover-bg', 'active-bg'\]/,
    'theme.js 应一次注入 9 个 token 的亮/暗两套');
  assert.match(theme, /--app-accent-\$\{suffix\}-light/, 'theme.js 应写 *-light 原始变量');
  assert.match(theme, /--app-accent-\$\{suffix\}-dark/, 'theme.js 应写 *-dark 原始变量');
});

test('G4 内存样本：gold 实底白字 / red 实底白字 / 非法入参回落 gold', () => {
  const gold = accentButtonColors('gold');
  assert.equal(gold.strong, '#9A6B0F', 'gold 实底应为 strongBg #9A6B0F');
  assert.equal(gold.ink, '#FFFFFF', 'gold 实底字应为 strongInk #FFFFFF');
  assert.equal(gold.bg, '#9A6B0F', '旧字段 bg 应指向 strongBg');

  const red = accentButtonColors('red');
  assert.equal(red.strong, '#9B2C22', 'red 实底应为 strongBg #9B2C22');
  assert.equal(red.ink, '#FFFFFF', 'red 实底字应为白字');

  // 暗色档按表取 *-dark
  const goldDark = accentButtonColors('gold', 'dark');
  assert.equal(goldDark.strong, '#C89A34', 'gold 暗色实底应为 #C89A34');
  assert.equal(goldDark.ink, '#1E1503', 'gold 暗色实底字应为 #1E1503');

  // 非法输入兜底：不崩溃、回落到 gold 主题（不是运行时 var()）
  assert.deepEqual(accentButtonColors(''), {
    bg: '#9A6B0F', text: '#FFFFFF', strong: '#9A6B0F', ink: '#FFFFFF', strongHover: '#91650D',
  }, '非法入参应回落 gold 主题的显式 token');
});

test('G5 浅底深字：不得直接用裸 var(--app-accent)；焦点环只用 --app-accent', () => {
  const textRules = [
    '.text-accent',
    '.chip-option:hover',
    '.chip-accent-on',
    '.sel-accent-on',
    'button.metric-band__item.is-active .stat-card__label',
    '.page-num.is-current',
    '.wp-dim-chip.wp-dim-on',
    '.wp-brand-chip.wp-brand-on',
    '.wp-agenda-kind.wp-agenda-kind-on',
    '.cs-option.is-selected',
    '.accent-avatar',
    '.state-badge--accent',
  ];
  for (const selector of textRules) {
    const body = ruleBody(STYLES, selector);
    assert.ok(body, `styles.css 缺少 ${selector} 规则`);
    assert.match(body, /(?:^|[;\s])color:\s*var\(--app-accent-soft-text\)/,
      `${selector} 的文字色应走 --app-accent-soft-text（浅底深字显式查表）`);
    assert.doesNotMatch(body, /(?:^|[;\s])color:\s*var\(--app-accent\)\s*(?:!important)?\s*;/,
      `${selector} 仍在使用裸 var(--app-accent) 作文字色`);
  }

  const focusRules = [
    'button:focus-visible',
    '.ws-tab-scroll button:focus-visible',
    '.notif-dropdown-item:focus-visible',
    '.status-badge:focus-visible',
    'button.metric-band__item:focus-visible',
    // 2026-10-29 P1：行焦点三种写法合并为 `[data-interactive="true"]` 单一来源；
    //   行内焦点工具类统一走语义类 `.focus-ring`（同一几何）。
    '[data-interactive="true"]:focus-visible',
    '.focus-ring:focus-visible',
    '.todo-more__item:focus-visible',
    // 2026-10-28（支书裁定「消除假反馈」）：画廊卡的唯一交互元素是标题链，焦点环由它承担；
    //   原先挂在整卡上的 `.gallery-card:focus-visible` 已删除（卡片不进 tab 序列 ⇒ 不可达的死规则）。
    '.gallery-card__open:focus-visible',
  ];
  for (const selector of focusRules) {
    const body = ruleBody(STYLES, selector);
    assert.ok(body, `styles.css 缺少 ${selector} 规则`);
    // 2026-10-28 支书裁定：焦点环只用主题色 --app-accent（2px / offset 1px / 无 box-shadow）。
    assert.match(body, /outline:\s*2px solid var\(--app-accent\)/,
      `${selector} 的焦点环应使用主题色 --app-accent`);
    assert.match(body, /outline-offset:\s*1px\s*;/, `${selector} 的焦点环偏移应为 1px`);
    assert.match(body, /box-shadow:\s*none\s*;/, `${selector} 的焦点环不得再叠 box-shadow 光晕`);
    assert.doesNotMatch(body, /--focus-ring/, `${selector} 不得再引用旧 --focus-ring`);
  }

  // 反向判据（不降强度）：整卡既不可聚焦也不可点 ⇒ 不得残留环／手型光标。
  assert.equal(ruleBody(STYLES, '.gallery-card:focus-visible'), '',
    '整卡不可聚焦 ⇒ 不得再有 .gallery-card:focus-visible（焦点环由 .gallery-card__open 承担）');
  assert.doesNotMatch(ruleBody(STYLES, '.gallery-card'), /cursor:\s*pointer/,
    '.gallery-card 整卡不可点 ⇒ 不得有 cursor: pointer（看着能点其实点不动的假反馈）');
});
