// role: [工程师]+[AI]
// card-summary-hero-guard.test.mjs — 卡片末行 / 折叠头 / hero 特例三组守卫
// （2026-10-31 支书补充批次 P13–P15）
//
// 判据：
//   G1 卡片末行不得出现「只有右对齐操作」的独立行——右下角孤零零一个「查看更多」不算一个末行；
//      末行若有动作，必须与左侧信息同一行（flex justify-between / 左侧有内容）。
//   G2 折叠头 summary：空内容 summary 必须宽度 100%、高度 ≥44；标题行 ≥44；可见文字不得塞进 summary。
//   G3 hero 特例白名单：DS_05 §10.5.1 登记「居中整幅」；index 保持 text-center、48px 党徽；
//      CSS / main-entry 不得再写 muted 左对齐降级。
//   G4 嵌入形态不得再套卡（批次 524 · C/#3 #8）：`workgroup-view` / `taskforce-view` 必须接受
//      `opts.embedded`，嵌入模板里不得出现 `class="card`；`insight-view` 必须给两者传 `embedded: true`。
//   四组各带反例（合成样本命中 / 不误伤）。
//
// 运行：node --test server/test/card-summary-hero-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const INDEX = join(ROOT, 'docs', 'index.html');
const CSS = join(SRC, 'styles.css');
const MAIN = join(SRC, 'entries', 'pages', 'main-entry.js');
const DS5 = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_05_MAP_AND_REFERENCE.md');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { walk(p, out); continue; }
    if (/\.(js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 「只有右对齐操作」的独立行：`text-right` 末行容器，**唯一**动作就是 a/button，
 *  且没有其它元素（左侧计数 / 说明 / 第二枚按钮）。动作组工具栏因此不误伤。
 *  卡片末行有动作时必须与左侧信息同一行（如 flex justify-between）。 */
export function hasRightOnlyActionRow(src) {
  const re = /<div\b[^>]*class="[^"]*\btext-right\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(src))) {
    const inner = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
    const actions = (inner.match(/<(?:a|button)\b/gi) || []).length;
    const otherEl = /<(?!\/?(?:a|button)\b)[a-z][\w-]*\b/i.test(inner);
    if (actions === 1 && !otherEl) return true;
  }
  return false;
}

/** 空 summary 的 CSS 块是否「宽 100% 且高 ≥44」。 */
export function summaryCoversRow(css) {
  const block = /\.disclosure__summary:empty\s*\{([^}]*)\}/.exec(css);
  if (!block) return false;
  const body = block[1];
  const width = /width:\s*100%/.test(body);
  const height = /height:\s*(\d+)px/.exec(body);
  return width && !!height && Number(height[1]) >= 44;
}

/** CSS 是否回潮了 hero 左对齐降级（muted 块 text-align:start 或党徽 24px）。 */
export function hasHeroLeftAlignDowngrade(css) {
  return /#dashboard-hero\[data-hero="muted"\]\s*\{[^}]*text-align:\s*start/.test(css)
    || /#dashboard-hero\[data-hero="muted"\]\s+\.dashboard-hero__emblem\s*\{[^}]*width:\s*24px/.test(css);
}

/** 取出 `const embeddedHtml = \`…\`;` 的模板正文（嵌入形态唯一落点）。 */
export function embeddedTemplateOf(src) {
  const m = /const embeddedHtml = `([\s\S]*?)`;/.exec(src);
  return m ? m[1] : null;
}

/** 嵌入形态口径：接受 opts.embedded ＋ 嵌入模板不套 `.card`。 */
export function embeddedShapeProblems(src) {
  const problems = [];
  if (!/opts\.embedded === true\s*\?\s*embeddedHtml/.test(src)) {
    problems.push('未按 `opts.embedded === true ? embeddedHtml : …` 分叉（嵌入形态没有独立模板）');
  }
  const tpl = embeddedTemplateOf(src);
  if (tpl === null) problems.push('缺 `const embeddedHtml = \\`…\\`;` 模板常量');
  else if (/class="card\b/.test(tpl)) problems.push('嵌入模板仍出现 `class="card`（卡套卡）');
  return problems;
}

test('G1 卡片末行：不得只有右对齐操作（带左侧信息的同行合法）', () => {
  const files = [INDEX, ...walk(SRC)];
  const offenders = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    if (hasRightOnlyActionRow(src)) offenders.push(relative(ROOT, file).replace(/\\/g, '/'));
  }
  assert.deepEqual(offenders, [],
    `卡片末行出现「只有右对齐操作」的独立行（未读数/说明须与动作同一行）：\n${offenders.join('\n')}`);

  // 反例：孤零零一个右对齐链接判红；左侧有未读数、右侧动作判绿。
  assert.equal(hasRightOnlyActionRow('<div class="pt-2 text-right"><a class="text-xs text-accent">查看更多 →</a></div>'), true);
  assert.equal(hasRightOnlyActionRow('<div class="mt-2 flex items-center justify-between gap-2"><span>2 条未读</span><a>查看更多 →</a></div>'), false);
  assert.equal(hasRightOnlyActionRow('<div class="text-right"><span>合计</span><a>查看</a></div>'), false);
});

test('G2 折叠头 summary：空内容 summary 宽 100% / 高 ≥44，标题行 ≥44', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.ok(summaryCoversRow(css), 'styles.css 的 .disclosure__summary:empty 必须 width:100% 且 height ≥44');
  const titleBlock = /\.disclosure__title\s*\{([^}]*)\}/.exec(css);
  assert.ok(titleBlock, 'styles.css 缺 .disclosure__title');
  const minH = /min-height:\s*(\d+)px/.exec(titleBlock[1]);
  assert.ok(minH && Number(minH[1]) >= 44, '折叠标题行 min-height 须 ≥44');

  // summary 内不得再塞可见文字（文字应回标题的 .disclosure__meta）。
  const withText = [];
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    if (/class="disclosure__summary"[^>]*>[^<\s]/.test(src)) {
      withText.push(relative(ROOT, file).replace(/\\/g, '/'));
    }
  }
  assert.deepEqual(withText, [], `summary 内不得有可见文字（迁回标题）：\n${withText.join('\n')}`);

  // 反例：40×40 小块判不中；44 宽 100% 判中；可见文字样本能被识别。
  assert.equal(summaryCoversRow('.disclosure__summary:empty { width: 40px; height: 40px; }'), false);
  assert.equal(summaryCoversRow('.disclosure__summary:empty { width: 100%; height: 44px; }'), true);
  assert.match('<summary class="disclosure__summary">展开</summary>', /class="disclosure__summary"[^>]*>[^<\s]/);
  assert.doesNotMatch('<summary class="disclosure__summary"></summary>', /class="disclosure__summary"[^>]*>[^<\s]/);
});

test('G3 hero 特例白名单：DS_05 登记居中；CSS/入口不得回退左对齐降级', () => {
  const ds5 = readFileSync(DS5, 'utf8');
  const index = readFileSync(INDEX, 'utf8');
  const css = readFileSync(CSS, 'utf8');
  const main = readFileSync(MAIN, 'utf8');

  assert.match(ds5, /### 10\.5\.1 首页 hero 特例/, 'DS_05 缺 §10.5.1 hero 特例白名单');
  assert.match(ds5, /恒为居中整幅/, '白名单须写明「恒为居中整幅」');
  assert.match(ds5, /不得出现 24px 降级/, '白名单须写明不得 24px 降级');
  assert.match(index, /<div\b[^>]*class="[^"]*\btext-center\b[^"]*"[^>]*\bid="dashboard-hero"/,
    '#dashboard-hero 必须是居中（text-center）');
  assert.match(css, /\.dashboard-hero__emblem\s*\{[^}]*width:\s*48px[^}]*height:\s*48px/,
    '党徽必须 48×48');
  assert.equal(hasHeroLeftAlignDowngrade(css), false, 'CSS 不得回潮 muted 左对齐 / 24px 降级');
  assert.doesNotMatch(main, /data-hero\s*=\s*['"]muted['"]/, 'main-entry.js 不得再写 data-hero=muted');

  // 反例：左对齐块 / 24px 版必须被同一口径判红；普通居中块判绿。
  assert.equal(hasHeroLeftAlignDowngrade('#dashboard-hero[data-hero="muted"] { text-align: start; }'), true);
  assert.equal(hasHeroLeftAlignDowngrade('#dashboard-hero[data-hero="muted"] .dashboard-hero__emblem { width: 24px; height: 24px; }'), true);
  assert.equal(hasHeroLeftAlignDowngrade('#dashboard-hero { text-align: center; }'), false);
});

// G4：嵌入形态不得再套卡（批次 524 · C/#3 #8）
//   病灶：`insight-view` 已用 embedded 跳过页头，但 `workgroup-view` / `taskforce-view`
//   仍在内部渲染 `div.card` + 第二套卡头 ⇒ 「卡套卡」+ 双卡头。
test('G4 嵌入形态不得再套卡：embedded 模板无 .card，insight-view 给两者传 embedded:true', () => {
  const WG = readFileSync(join(SRC, 'components', 'record', 'workgroup-view.js'), 'utf8');
  const TF = readFileSync(join(SRC, 'components', 'record', 'taskforce-view.js'), 'utf8');
  const INSIGHT = readFileSync(join(SRC, 'components', 'record', 'insight-view.js'), 'utf8');

  for (const [name, src] of [['workgroup-view.js', WG], ['taskforce-view.js', TF]]) {
    assert.deepEqual(embeddedShapeProblems(src), [],
      `${name} 的嵌入形态口径被改坏：\n  ${embeddedShapeProblems(src).join('\n  ')}`);
  }

  // insight-view 必须把两个子组件都切到嵌入形态
  assert.match(INSIGHT, /renderWorkgroupView\(body,\s*\{[\s\S]{0,240}?embedded:\s*true/,
    'insight-view 调 renderWorkgroupView 未传 embedded: true（会再套一层卡）');
  assert.match(INSIGHT, /renderTaskforceView\(body,\s*\{[\s\S]{0,240}?embedded:\s*true/,
    'insight-view 调 renderTaskforceView 未传 embedded: true（会再套一层卡）');

  // 反例：嵌入模板塞回 .card 必须判红；不接 embedded 也必须判红；独立形态的卡不受影响。
  const withCard = WG.replace('const embeddedHtml = `', 'const embeddedHtml = `<div class="card">');
  assert.ok(embeddedShapeProblems(withCard).some((p) => p.includes('class="card')),
    '反例：嵌入模板出现 class="card 未被判红');
  const noBranch = TF.replace(/opts\.embedded === true \? embeddedHtml :/, '');
  assert.ok(embeddedShapeProblems(noBranch).length > 0, '反例：去掉 embedded 分叉未被判红');
  const standaloneOnly = 'const x = `\n    <div class="card rounded-xl p-5"></div>`;';
  assert.equal(/class="card\b/.test(embeddedTemplateOf(standaloneOnly) || ''), false,
    '负例：不含 embeddedHtml 的源码不应被判出嵌入模板');
});
