// role: [工程师]+[AI]
// activity-tone-guard.test.mjs — 活动类别语义 tone 守卫（2026-10-24 · 批次 508）
//
// 为什么要有本守卫：
//   · 批次 508 把「三会一课＝党建红 / 主题党日＝党徽金 / 其余＝中性」收敛为一条链：
//       activityTypeClassification（大类） → activityTypeTone（固定语义 tone）
//       → activityTypeBadgeVariant（组件变体，只做映射）。
//     此前各处可直接写 `badgeHtml(type, 'neutral'/'info')`，类别色会被状态色顶替；
//     本文件把「单一源」「语义隔离」「党建红不等于错误红」钉成可机检判据。
//   · 判据：
//       A1 非空转：activityTypeTone 是函数；8 个抽样类别返回值符合预期（含未知兜底 neutral）
//       A2 单一源：components/** 与 entries/** 的活动类别徽章不得直接写 badgeHtml(type, 'neutral'/'info')，
//          必须走 activityTypeBadgeVariant / activityTypeTone；例外逐条登记并给理由
//       A3 语义隔离：活动类别 / 活动状态路径不得出现 'info'；允许 info 的站点逐条登记，
//          清单与实测命中集双向相等（防僵尸白名单）
//       A4 党建红：.badge--brand 与 [data-tone="party-red"] 必须用 #CE1126，不得用 #B91C1C
//   · 说明（可改面约束）：本批只允许改 server/test/**，docs/** 不在可改面内；A2/A3 的存量
//     例外不是「合法新写法」，而是登记在案、禁止新增的待迁移项（命中集一旦变化即红）。
// 运行：node --test server/test/activity-tone-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  activityTypeTone, activityTypeBadgeVariant, activityTypeClassification,
} from '../../docs/src/core/domain/constants.js?v=20261026b';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS_SRC = join(ROOT, 'docs', 'src');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const relOf = (abs) => relative(ROOT, abs).replace(/\\/g, '/');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

/** 递归收集某目录下 .js（跳过注释行由调用方处理） */
function walkJs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'vendor' || e.name === 'fonts' || e.name === 'images') continue;
      walkJs(p, out);
      continue;
    }
    if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const UI_FILES = [...walkJs(join(DOCS_SRC, 'components')), ...walkJs(join(DOCS_SRC, 'entries'))];

/** 注释行（含块注释续行）不参与静态判据 */
const isCommentLine = (line) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};

/** 活动类别徽章直接写变体字面量：badgeHtml(<含 type 表达式>, 'neutral'|'info') */
const CATEGORY_LITERAL_RE = /badgeHtml\(([^\n]*\btype\b[^\n]*),\s*['"](neutral|info)['"]\s*\)/;

/**
 * A2 例外白名单：存量直接写 neutral/info 的活动类别徽章。
 * ⚠ 只登记、不鼓励：新增任何一条都会让「命中集 ≠ 白名单」而红。
 */
const CATEGORY_EXCEPTIONS = [];

/** 找出活动类别徽章直接写 neutral/info 的站点 */
function scanCategoryLiteralHits() {
  const hits = [];
  for (const abs of UI_FILES) {
    const rel = relOf(abs);
    readFileSync(abs, 'utf8').split('\n').forEach((line, idx) => {
      if (isCommentLine(line)) return;
      const m = CATEGORY_LITERAL_RE.exec(line);
      if (!m) return;
      hits.push({ file: rel, line: idx + 1, snippet: norm(line), variant: m[2] });
    });
  }
  return hits;
}

/** A3 扫描面：活动类别 / 活动状态路径 + 五类允许 info 的语义站点所在文件 */
const INFO_SCOPE_FILES = [
  // 活动类别 / 状态
  'docs/src/components/record/inspector.js',
  'docs/src/components/record/activity-view.js',
  'docs/src/components/governance/activity-progress.js',
  'docs/src/entries/pages/activity-entry.js',
  'docs/src/entries/pages/archive-entry.js',
  'docs/src/entries/tabs/prop/archive-tab.js',
  'docs/src/entries/tabs/prop/kanban-tab.js',
  'docs/src/entries/tabs/secretary/calendar-tab.js',
  'docs/src/entries/tabs/secretary/todo-tab.js',
  'docs/src/entries/tabs/secretary/group-progress-tab.js',
  'docs/src/entries/tabs/today/today-tab.js',
  // 允许 info 的五类语义（通知重要 / 已发布 / 待汇报 / 建议选修 / 配置标注）
  'docs/src/components/shell/header.js',
  'docs/src/components/governance/notice-view.js',
  'docs/src/components/record/todo-tab-shell.js',
  'docs/src/components/record/report-inbox.js',
  'docs/src/entries/tabs/disc/makeup-tab.js',
  'docs/src/entries/tabs/leader/attendance-tab.js',
  'docs/src/entries/pages/settings-entry.js',
];

/**
 * A3 白名单：逐条登记「允许 info」的语义站点。
 * `count` 缺省为 1；清单必须与实测命中集双向相等（多一条＝僵尸，少一条＝未登记）。
 */
const INFO_EXCEPTIONS = [
  { file: 'docs/src/components/shell/header.js', snippet: "normal: badgeHtml('重要', 'info'),", reason: '通知重要（normal 优先级）' },
  { file: 'docs/src/components/governance/notice-view.js', snippet: "normal: badgeHtml('重要', 'info'),", reason: '通知重要（normal 优先级）' },
  { file: 'docs/src/components/record/todo-tab-shell.js', snippet: "n.priority === 'normal' ? badgeHtml('重要', 'info')", reason: '通知重要（normal 优先级）' },
  // Task 3（2026-10-25）：归档库「通知」页签退役（归档页只留活动 / 专班），原白名单随之撤下。

  { file: 'docs/src/components/record/inspector.js', snippet: "label: '已发布', variant: 'info'", reason: '已发布（活动生命周期信息态；非类别恒灰问题）' },

  { file: 'docs/src/components/record/report-inbox.js', snippet: "'to-report': 'info',", reason: '待汇报（汇报状态）' },
  { file: 'docs/src/components/record/report-inbox.js', snippet: "assigned: 'info',", reason: '待汇报（已指派）' },

  { file: 'docs/src/entries/tabs/disc/makeup-tab.js', snippet: "badgeHtml('选修', 'info')", reason: '建议选修（补课方式）' },
  { file: 'docs/src/entries/tabs/leader/attendance-tab.js', snippet: "badgeHtml('建议', 'info')", reason: '建议选修（建议参加）' },

  { file: 'docs/src/entries/pages/settings-entry.js', snippet: "· 本支部可调`, 'info'", reason: '配置标注（本支部可调）' },
  { file: 'docs/src/entries/pages/settings-entry.js', snippet: "badgeHtml('支部制度参数', 'info')", reason: '配置标注（制度参数）' },
  { file: 'docs/src/entries/pages/settings-entry.js', snippet: "可调`, 'info'", reason: '配置标注（角色可调）', count: 3 },

  // 非活动类别 / 非活动生命周期：专班状态、归档材料分类、操作按钮信息态、待办状态
  { file: 'docs/src/entries/pages/activity-entry.js', snippet: "['组建中', 'info']", reason: '专班状态（本页同函数内的非活动分支）' },
  { file: 'docs/src/entries/pages/activity-entry.js', snippet: "['运行中', 'info']", reason: '专班状态（本页同函数内的非活动分支）' },
  { file: 'docs/src/entries/pages/archive-entry.js', snippet: "新闻稿: ['info', '新闻稿']", reason: '归档材料分类（非活动类别）' },
  { file: 'docs/src/entries/pages/archive-entry.js', snippet: "badgeHtml('专班', 'info')", reason: '专班标识（非活动类别）' },
  { file: 'docs/src/components/record/inspector.js', snippet: 'data-tone="info">编辑信息', reason: '操作按钮信息态（非活动类别 / 生命周期）' },
  { file: 'docs/src/components/record/todo-tab-shell.js', snippet: "in_progress: 'info',", reason: '待办进行中（非活动状态）' },
  { file: 'docs/src/entries/tabs/secretary/todo-tab.js', snippet: "in_progress: 'info',", reason: '待办进行中（非活动状态）' },
  { file: 'docs/src/entries/tabs/prop/archive-tab.js', snippet: 'data-tone="info"', reason: '归档材料文件图标标注（非活动类别 / 状态）' },
  // 2026-10-26 Task 4：宣传看板最后 3 处 info（类别徽章 + 两个分组标题）已迁移
  //   （类别走 activityTypeBadgeVariant、标题改 neutral）⇒ 白名单条目按僵尸规则删除。
];

/** 找出 A3 扫描面内所有语义 info 站点（排除注释与 showToast 过渡态） */
function scanInfoHits() {
  const hits = [];
  for (const rel of INFO_SCOPE_FILES) {
    const abs = join(ROOT, rel);
    assert.ok(existsSync(abs), `A3 扫描面文件不存在：${rel}`);
    readFileSync(abs, 'utf8').split('\n').forEach((line, idx) => {
      if (isCommentLine(line)) return;
      if (!/['"]info['"]|data-tone="info"/.test(line)) return;
      if (line.includes("showToast('info'")) return;
      hits.push({ file: rel, line: idx + 1, snippet: norm(line) });
    });
  }
  return hits;
}

/** 取 CSS 规则体（选择器列表精确匹配某一项；跳过注释） */
function ruleBody(css, selector) {
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const sels = m[1].split(',').map((s) => s.trim());
    if (sels.includes(selector)) return m[2];
  }
  return '';
}

test('A1 非空转：activityTypeTone 是函数，8 个抽样类别返回预期 tone', () => {
  assert.equal(typeof activityTypeTone, 'function', 'constants.js 未导出 activityTypeTone 函数');
  const cases = [
    ['党课', 'party-red'],
    ['支委会', 'party-red'],
    ['党小组会', 'party-red'],
    ['支部党员大会', 'party-red'],
    ['组织生活会', 'party-red'],
    ['主题党日', 'gold'],
    ['理论学习', 'gold'],
    ['完全未登记的类别', 'neutral'],
  ];
  assert.equal(cases.length, 8, '抽样类别应为 8 个（非空转）');
  const readings = [];
  for (const [type, expected] of cases) {
    const tone = activityTypeTone(type);
    const variant = activityTypeBadgeVariant(type);
    const expectedVariant = expected === 'party-red' ? 'brand' : expected === 'gold' ? 'gold' : 'neutral';
    readings.push(`${type} → ${tone}/${variant}`);
    assert.equal(tone, expected, `activityTypeTone('${type}') 应为 ${expected}，实际 ${tone}`);
    assert.equal(variant, expectedVariant, `activityTypeBadgeVariant('${type}') 应为 ${expectedVariant}，实际 ${variant}`);
  }
  console.log(`[activity-tone] 抽样：${readings.join(' · ')}`);
  // 与大类判据同源：三会一课族 / 主题党日族 / 其他
  assert.equal(activityTypeClassification('党课'), 'three-meetings');
  assert.equal(activityTypeClassification('理论学习'), 'theme-party');
  assert.equal(activityTypeClassification('完全未登记的类别'), 'other');
});

test('A2 单一源：活动类别徽章不得直接写 neutral/info，例外逐条登记', () => {
  const hits = scanCategoryLiteralHits();
  // 非空转改由合成样本承担（2026-10-26 Task 4：最后一处存量已迁移，实测命中集合法为空）
  assert.equal(CATEGORY_LITERAL_RE.test("badgeHtml(item.type, 'info')"), true,
    'A2 非空转失败：类别 + 字面变体正则写坏（合成样本未命中）');

  const unmatched = [];
  const used = new Map(CATEGORY_EXCEPTIONS.map((e) => [e, 0]));
  for (const hit of hits) {
    const ex = CATEGORY_EXCEPTIONS.find((e) => e.file === hit.file && hit.snippet.includes(e.snippet));
    if (!ex) {
      unmatched.push(`${hit.file}:${hit.line} ${hit.snippet}`);
      continue;
    }
    used.set(ex, used.get(ex) + 1);
  }
  assert.deepEqual(unmatched, [],
    `活动类别徽章必须经 activityTypeBadgeVariant / activityTypeTone（不得直接写 neutral/info）：\n  ${unmatched.join('\n  ')}`);

  const zombies = CATEGORY_EXCEPTIONS.filter((e) => used.get(e) === 0)
    .map((e) => `${e.file} ${e.snippet}（${e.reason}）`);
  assert.deepEqual(zombies, [], `A2 白名单存在僵尸条目（实测已无命中，请删除）：\n  ${zombies.join('\n  ')}`);

  // 单一源本身：badgeVariant 必须委托 tone，不得再自查类别表
  const constants = read('docs/src/core/domain/constants.js');
  const variantBody = (/export function activityTypeBadgeVariant\([\s\S]*?\n\}/.exec(constants)?.[0] || '')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.match(variantBody, /activityTypeTone\(type\)/, 'activityTypeBadgeVariant 必须调用 activityTypeTone（单一判据）');
  assert.doesNotMatch(variantBody, /_ACTIVITY_TYPE_BASE/, 'activityTypeBadgeVariant 不得再自查 _ACTIVITY_TYPE_BASE');

  // 非空转：确实有多个消费点走单一源
  const consumers = UI_FILES.filter((abs) => /activityTypeBadgeVariant\(|activityTypeTone\(/.test(readFileSync(abs, 'utf8')));
  assert.ok(consumers.length >= 5, `经单一源取类别色的消费点只有 ${consumers.length} 个（下限 5）：扫描面或导链可能写坏`);
});

test('A3 语义隔离：活动类别/状态路径不得出现 info，允许站点清单 ≡ 实测命中集', () => {
  const hits = scanInfoHits();
  assert.ok(hits.length >= 10, `A3 非空转失败：只扫描到 ${hits.length} 个 info 站点（下限 10）：扫描面可能写坏`);

  // 1) 活动类别判据本身不得产出 info
  const constants = read('docs/src/core/domain/constants.js');
  for (const [name, re] of [
    ['activityTypeTone', /export function activityTypeTone\([\s\S]*?\n\}/],
    ['activityTypeBadgeVariant', /export function activityTypeBadgeVariant\([\s\S]*?\n\}/],
  ]) {
    const body = re.exec(constants)?.[0] || '';
    assert.ok(body, `constants.js 缺少 ${name}`);
    assert.doesNotMatch(body, /['"]info['"]/, `${name} 不得产出 'info'（活动类别只用 party-red/gold/neutral）`);
  }
  const typeBase = /const _ACTIVITY_TYPE_BASE\s*=\s*\{([\s\S]*?)\n\};/.exec(constants)?.[1] || '';
  assert.ok(typeBase, 'constants.js 缺少 _ACTIVITY_TYPE_BASE');
  assert.doesNotMatch(typeBase, /['"]info['"]/, '_ACTIVITY_TYPE_BASE 不得出现 info（类别色表不承载状态色）');

  // 2) 活动生命周期表里 info 只允许 published（已发布）
  const inspector = read('docs/src/components/record/inspector.js');
  const lifecycle = /export const ACTIVITY_LIFECYCLE\s*=\s*\{([\s\S]*?)\n\};/.exec(inspector)?.[1] || '';
  assert.ok(lifecycle, 'inspector.js 缺少 ACTIVITY_LIFECYCLE（活动生命周期展示态单一源）');
  const infoKeys = [...lifecycle.matchAll(/^\s*([A-Za-z_]+)\s*:\s*\{[^}]*variant:\s*'info'/gm)].map((m) => m[1]);
  assert.deepEqual(infoKeys, ['published'], `活动生命周期中 info 只允许 published（已发布），实际：${infoKeys.join('/') || '无'}`);

  // 3) 实测命中集 ↔ 白名单 双向相等（防僵尸）
  const used = new Map(INFO_EXCEPTIONS.map((e) => [e, 0]));
  const unmatched = [];
  for (const hit of hits) {
    const ex = INFO_EXCEPTIONS.find((e) => e.file === hit.file && hit.snippet.includes(norm(e.snippet)));
    if (!ex) {
      unmatched.push(`${hit.file}:${hit.line} ${hit.snippet}`);
      continue;
    }
    used.set(ex, used.get(ex) + 1);
  }
  assert.deepEqual(unmatched, [],
    `活动类别 / 状态路径出现未登记的 info（允许的只有：通知重要 / 已发布 / 待汇报 / 建议选修 / 配置标注 + 已登记例外）：\n  ${unmatched.join('\n  ')}`);

  const zombieOrCountMismatch = INFO_EXCEPTIONS.filter((e) => used.get(e) !== (e.count || 1))
    .map((e) => `${e.file} ${e.snippet}（期望 ${e.count || 1} 处，实测 ${used.get(e)} 处；${e.reason}）`);
  assert.deepEqual(zombieOrCountMismatch, [],
    `A3 白名单与实测命中集不一致（僵尸条目 / 数量漂移）：\n  ${zombieOrCountMismatch.join('\n  ')}`);

  // 4) 非空转：五类允许语义都真实存在（不是只登记不消费）
  const reasons = new Set(INFO_EXCEPTIONS.map((e) => e.reason));
  for (const family of ['通知重要', '已发布', '待汇报', '建议选修', '配置标注']) {
    assert.ok([...reasons].some((r) => r.startsWith(family)), `允许 info 的五类语义缺「${family}」（白名单不完整）`);
  }
});

test('A4 党建红：.badge--brand 与 [data-tone="party-red"] 用功能红 #CE1126，不得用 #B91C1C', () => {
  const css = read('docs/src/styles.css');

  assert.match(css, /--party-red:\s*#CE1126\s*;/, '--party-red 必须固定为党建红 #CE1126');
  // 2026-10-27 Task 11.4：功能红 token 与党建红同值（#CE1126），徽章/类别改读功能红。
  assert.match(css, /--color-functional-red:\s*#CE1126\s*;/, '--color-functional-red 必须为 #CE1126');

  const brand = ruleBody(css, '.badge--brand');
  assert.ok(brand, 'styles.css 缺少 .badge--brand 规则');
  assert.match(brand, /var\(--color-functional-red\)|var\(--party-red\)|#CE1126/i,
    '.badge--brand 必须使用功能红 / 党建红 #CE1126');
  assert.doesNotMatch(brand, /#B91C1C|var\(--functional-error\)|var\(--status-error\)/i,
    '.badge--brand 不得用错误红 #B91C1C / --functional-error / --status-error');

  const tone = ruleBody(css, '[data-tone="party-red"]');
  assert.ok(tone, 'styles.css 缺少 [data-tone="party-red"] 规则');
  assert.match(tone, /var\(--color-functional-red\)|#CE1126/i,
    '[data-tone="party-red"] 必须使用功能红 #CE1126');
  assert.doesNotMatch(tone, /#B91C1C/i, '[data-tone="party-red"] 不得用 #B91C1C（那是 danger 功能错误红）');

  // 语义隔离的另一半：danger 仍是 #B91C1C（证明两档确实分开，而不是换个名字）
  const danger = ruleBody(css, '[data-tone="danger"]');
  assert.ok(danger, 'styles.css 缺少 [data-tone="danger"] 规则');
  assert.match(danger, /#B91C1C/i, 'danger 档应保留功能错误红 #B91C1C（与 party-red 分开）');
});

test('A5 暗色分离：类别红/金与 danger/warning 逐值不同，badge--brand 不借状态色', () => {
  const css = read('docs/src/styles.css');

  const darkPartyRed = ruleBody(css, 'html.theme-dark [data-tone="party-red"]');
  const darkDanger = ruleBody(css, 'html.theme-dark [data-tone="danger"]');
  assert.ok(darkPartyRed, 'styles.css 缺少暗色 [data-tone="party-red"] 规则');
  assert.ok(darkDanger, 'styles.css 缺少暗色 [data-tone="danger"] 规则');
  assert.notEqual(darkPartyRed.replace(/\s+/g, ' '), darkDanger.replace(/\s+/g, ' '),
    '暗色类别红不得与 danger 逐值相同（类别不得借状态色）');
  // 2026-10-27 Task 11.4：读功能红暗色 token（与类别 token 同值）。
  assert.match(darkPartyRed, /--color-functional-red-dark|--color-category-three-meetings-dark|#FCA5A5/i,
    '暗色类别红应读 --color-functional-red-dark（#FCA5A5）');
  assert.doesNotMatch(darkPartyRed, /#F87171/i, '暗色类别红不得用 danger 的 #F87171');

  const darkGold = ruleBody(css, 'html.theme-dark [data-tone="gold"]');
  const darkWarning = ruleBody(css, 'html.theme-dark [data-tone="warning"]');
  assert.ok(darkGold && darkWarning, '缺少暗色 gold / warning 规则');
  assert.match(darkGold, /--color-functional-gold-dark|--color-category-theme-day-dark|#FCD34D/i,
    '暗色主题党日金应读 --color-functional-gold-dark（#FCD34D）');
  assert.doesNotMatch(darkGold, /#FBBF24/i, '暗色主题党日金不得用 warning 的 #FBBF24');

  const darkBrand = ruleBody(css, 'html.theme-dark .badge--brand');
  assert.ok(darkBrand, '缺少暗色 .badge--brand 规则');
  assert.doesNotMatch(darkBrand, /--functional-error|--status-error|#F87171/i,
    '暗色 .badge--brand 不得借状态错误色');
  assert.match(darkBrand, /--color-functional-red-dark|--color-category-three-meetings-dark/i,
    '暗色 .badge--brand 应读功能红 / 类别红暗色 token');
});
