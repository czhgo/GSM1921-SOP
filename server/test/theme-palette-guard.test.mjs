// role: [工程师]+[AI]
// theme-palette-guard.test.mjs — 7 主题显式色板守卫（spec redesign-theme-palette-and-density · Task 9）
//
// 为什么要有本守卫：
//   · 批次 505 把主题色从「1 个 hex + color-mix 公式」改成「7 主题 × 亮/暗 × 8 个手选 hex」。
//     公式退场后，**没有任何守卫校验色值本身**：改错一个 hex、少写一个 token、把某主题
//     退回 color-mix，都不会有红灯。本文件把色板结构、对比度、彩度与「固定语义色分离」
//     钉成可机检判据。
//   · 判据（与 spec「ADDED Requirements」逐条对应）：
//       T1 结构：ACCENT_COLORS 恰 7 主题；每主题 light/dark 各 8 个合法 hex
//       T2 对比度：softText/softBg 4.5–12；strongInk/strongBg ≥4.5；strongBg/卡片底 ≥3；
//                  softBg 与白 1.08–1.35；strongBg HSL 饱和度 ≤85%
//       T3 色板：ACCENT_PALETTE 恰 7 项、旧键（sky/light-blue/deep）不在其中且有别名回落
//       T4 选择器：appearance-controls.js 只列 7 项、每项 2 枚小样、消费 getAccentColors、无 hex 字面量
//       T5 语义色分离：活动类别色 / 党徽金不读 --app-accent*
//   · 非空转：每类断言都先核「命中数 >0」，避免正则/解析写坏导致恒真。
// 运行：node --test server/test/theme-palette-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCENT_COLORS, ACCENT_PALETTE, ACCENT_KEY_ALIASES, normalizeAccentKey, getAccentColors,
} from '../../docs/src/core/domain/constants.js?v=20261023c';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const THEME_KEYS = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple'];
const TOKEN_KEYS = ['base', 'softBg', 'softBorder', 'softText', 'strongBg', 'strongInk', 'hoverBg', 'activeBg'];
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

test('T1 结构：ACCENT_COLORS 恰 7 主题 × 亮/暗 × 8 个合法 hex token', () => {
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
      assert.equal(tokenKeys.length, 8, `${key}.${mode} 应有 8 个 token，实际 ${tokenKeys.length}：${tokenKeys.join('/')}`);
      assert.deepEqual([...tokenKeys].sort(), [...TOKEN_KEYS].sort(), `${key}.${mode} token 名不符`);
      for (const name of TOKEN_KEYS) {
        const value = tokens[name];
        assert.match(value, HEX_VALUE_RE,
          `${key}.${mode}.${name} 必须是手选 6 位 hex（当前 ${JSON.stringify(value)}）：不得 color-mix / rgba / var 派生`);
        tokenCount += 1;
      }
    }
  }
  assert.equal(tokenCount, 7 * 2 * 8, `token 总数应为 112，实际 ${tokenCount}`);
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
  // 查表返回 8 个 token + 旧别名，且不再做亮度分流
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
