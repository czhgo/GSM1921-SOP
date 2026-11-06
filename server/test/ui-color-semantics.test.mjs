// role: [工程师]+[AI]
// ui-color-semantics.test.mjs — 颜色语义守卫（2026-10-18 立 · Task 2 / SubTask 2.5）
//
// 来源：Spec「工作台视觉语言」§2.10 颜色四问与明暗档；判例＝「逾期与删除失败同屏，两处都是红」。
// 病灶：`--functional-error` 同时承担「错误」和「逾期」，红色既是主题色又是状态色，用户无法判断语义。
//
// 判据：
//   C1 DESIGN_SYSTEM 有「颜色四问」与逾期 / warning / error / 琥珀口径；
//   C2 styles.css 有 `.state-badge--warning/success/info/accent` 变体；
//   C3 关键页面文件内「逾期」附近 120 字符不得出现 `--functional-error`；
//   C4 DESIGN_SYSTEM §2.10 写明三个反例（整圈红边 / 功能色主按钮 / 主题色状态徽章）；
//   C5 非空转自检：邻近判定在合成正 / 负样本上必须命中 / 不命中。
//
// 说明：C3 的存量页面由后续页面任务修复；若命中，失败信息会明确标注「待后续页面任务修复」，
//   不放宽为永远绿。
//
// 运行：node --test server/test/ui-color-semantics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_01_COLOR_AND_THEME.md');
const CSS = join(ROOT, 'docs', 'src', 'styles.css');

/** 关键页面（后续页面任务负责修；本守卫只做结构断言，不判视觉） */
const PAGES = [
  'docs/src/components/governance/work-overview.js',
  'docs/src/components/record/todo-list.js',
  'docs/src/components/record/todo-tab-shell.js',
  'docs/src/components/record/report-inbox.js',
  'docs/src/entries/tabs/secretary/committee-meeting-tab.js',
  'docs/src/components/dashboard/taskforce-list.js',
  'docs/src/components/governance/notice-view.js',
];

const ERROR_TOKENS = ['--functional-error', '--status-error'];
const WINDOW = 120;

/** 找出「逾期」附近 120 字符内出现 error 令牌的站点（导出便于非空转自检） */
export function overdueErrorSites(src) {
  const hits = [];
  let from = 0;
  while (true) {
    const i = src.indexOf('逾期', from);
    if (i < 0) break;
    const start = Math.max(0, i - WINDOW);
    const end = Math.min(src.length, i + '逾期'.length + WINDOW);
    const slice = src.slice(start, end);
    if (ERROR_TOKENS.some((t) => slice.includes(t))) hits.push(i);
    from = i + 1;
  }
  return hits;
}

test('C1 DESIGN_SYSTEM 含颜色四问与逾期 / warning / error 口径', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  for (const term of ['颜色四问', '逾期', 'warning', 'error', '琥珀']) {
    assert.ok(doc.includes(term), `DESIGN_SYSTEM 缺「${term}」（§2.10 颜色语义单一源）`);
  }
  assert.match(doc, /### 2\.10 颜色四问与明暗档/, 'DESIGN_SYSTEM 缺 §2.10 标题');
  assert.ok(doc.includes('阻断 / 失败 / 删除 / 驳回'), '§2.10 未写明 error 只保留给阻断 / 失败 / 删除 / 驳回');
});

test('C2 styles.css 含状态徽章变体（warning / success / info / accent）', () => {
  const css = readFileSync(CSS, 'utf8');
  for (const variant of ['neutral', 'success', 'warning', 'info', 'accent']) {
    assert.ok(css.includes(`.state-badge--${variant}`), `styles.css 缺 .state-badge--${variant}`);
  }
});

test('C3 关键页面「逾期」附近不得使用 --functional-error', () => {
  const offenders = [];
  for (const rel of PAGES) {
    const file = join(ROOT, rel);
    assert.ok(existsSync(file), `关键页面不存在：${rel}`);
    const src = readFileSync(file, 'utf8');
    const hits = overdueErrorSites(src);
    if (hits.length) offenders.push(`${rel} → ${hits.length} 处（逾期附近 120 字符出现 error 状态色）`);
  }
  assert.deepEqual(offenders, [],
    `以下页面仍把「逾期」写成错误红（待后续页面任务修复：逾期改 --status-warning，`
    + `error 只留给阻断 / 失败 / 删除 / 驳回）：\n  ${offenders.join('\n  ')}`);
});

test('C4 §2.10 写明三个反例（整圈红边 / 功能色主按钮 / 主题色状态徽章）', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  for (const term of ['整圈红边', '功能色主按钮', '主题色状态徽章']) {
    assert.ok(doc.includes(term), `§2.10 缺反例「${term}」`);
  }
  assert.ok(doc.includes('主题色为红时，逾期仍用琥珀'), '§2.10 缺「主题色为红时，逾期仍用琥珀」口径');
});

test('C5 非空转：邻近判定在正 / 负样本上分别命中 / 不命中', () => {
  assert.equal(overdueErrorSites('逾期 <span style="color:var(--functional-error)">').length, 1,
    '邻近判定失效：逾期 + 旧 error token 未被判出');
  assert.equal(overdueErrorSites('逾期 <span style="color:var(--status-error)">').length, 1,
    '邻近判定失效：逾期 + --status-error 未被判出');
  assert.equal(overdueErrorSites('逾期 <span style="color:var(--status-warning)">').length, 0,
    '邻近判定过宽：逾期 + warning 被误判');
  const far = '逾期'.padEnd(WINDOW + 20, '。') + 'var(--status-error)';
  assert.equal(overdueErrorSites(far).length, 0, '邻近判定过宽：超出 120 字符仍被误判');
});

// ── C6 / C7：指标色分工（2026-11-01 批次 524 · 支书评议 #1） ───────────────
// 病灶：「全局概览几乎全是主题色，功能色没起注意力引导作用」。裁定：指标与状态用功能色；
//   动作 / 导航 / 选中态继续主题色。工作台结论带 6 处「待…」指标与「组员汇报」原本都是
//   `--app-accent-soft-text`，逾期是唯一的 warning ⇒ 主题色即「正常」，功能色反而不显眼。
const WORK_OVERVIEW = join(ROOT, 'docs', 'src', 'components', 'governance', 'work-overview.js');
const DISPATCH_BAR = join(ROOT, 'docs', 'src', 'components', 'governance', 'overview-dispatch-bar.js');

/** 指标声明抽取：同一行内 `label: '…'` 之后跟随 `color:`（字面 token 或 METRIC_TONE.x 引用） */
const METRIC_LINE_RE = /label:\s*'([^'\n]+)'[^}\n]*?color:\s*(?:'([^'\n]+)'|([A-Za-z_$][\w.$]*))/g;
/** 哪些标签属于「指标 / 状态」——主题色会抹平状态差异，必须取功能色 */
export function isStatusMetricLabel(label) {
  return label.startsWith('待') || label === '逾期' || label === '组员汇报';
}
/** 允许的指标文字色：功能状态文字档或中性档（动作 / 导航的 text-accent 不在本判据内） */
const ALLOWED_METRIC_TONE = /^var\(--(?:status-[a-z]+-text|neutral-\d+)\)$/;

/** 解析 `METRIC_TONE` 单一源（键 → 实际 token），供「引用常量」的指标解析到最终色 */
export function parseMetricTone(src) {
  const block = /const METRIC_TONE = \{([\s\S]*?)\};/.exec(src)?.[1] || '';
  return Object.fromEntries([...block.matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
}

/** 抽取 `label → color` 站点（导出便于非空转自检）；`METRIC_TONE.x` 解析成实际 token */
export function metricToneSites(src, tones = parseMetricTone(src)) {
  return [...src.matchAll(METRIC_LINE_RE)].map((m) => {
    const raw = m[2] || m[3];
    const ref = /^METRIC_TONE\.(\w+)$/.exec(raw);
    return { label: m[1], raw, color: ref ? (tones[ref[1]] || '') : raw };
  });
}

/** 返回不合规的指标色（空数组 = 绿） */
export function metricToneViolations(src, tones = parseMetricTone(src)) {
  return metricToneSites(src, tones)
    .filter((s) => isStatusMetricLabel(s.label)
      && (!ALLOWED_METRIC_TONE.test(s.color) || s.color.includes('--app-accent')))
    .map((s) => `${s.label} → ${s.raw}${s.raw === s.color ? '' : `（${s.color}）`}`);
}

/** 待答复直达条：状态指标，不得再用角色主题色（accent / --app-accent） */
export function dispatchBarToneViolations(src) {
  const out = [];
  if (/--app-accent|\$\{accent\}/.test(src)) out.push('待答复条仍用主题色（--app-accent / ${accent}）');
  if (!/color:\s*var\(--status-info-text\)/.test(src)) out.push('待答复条未使用 --status-info-text');
  return out;
}

test('C6 工作台结论带：待处理 / 逾期指标只取功能色，出现 --app-accent 即红', () => {
  const src = readFileSync(WORK_OVERVIEW, 'utf8');
  assert.match(src, /const METRIC_TONE = \{\s*\n\s*pending:\s*'var\(--status-info-text\)',\s*\n\s*overdue:\s*'var\(--status-warning-text\)',\s*\n\s*normal:\s*'var\(--neutral-800\)',/,
    'work-overview.js 缺 METRIC_TONE 单一源（pending / overdue / normal 三档）');
  const sites = metricToneSites(src).filter((s) => isStatusMetricLabel(s.label));
  assert.ok(sites.length >= 8, `指标色抽取只命中 ${sites.length} 处（应 ≥8：逾期 / 待办 / 待答复 / 待赋权 / 待归档 / 待补课 / 组员汇报 / 待汇报）`);
  assert.deepEqual(metricToneViolations(src), [],
    `以下指标仍用主题色（判据：仅允许 --status-*-text / --neutral-*）：\n  ${metricToneViolations(src).join('\n  ')}`);
  assert.doesNotMatch(src, /--app-accent/, 'work-overview.js 不得再用 --app-accent*（动作 / 导航用 .text-accent 类，不写死变量）');
});

test('C7 待答复直达条：状态条取 info 功能色，不得再用角色主题色', () => {
  const src = readFileSync(DISPATCH_BAR, 'utf8');
  assert.deepEqual(dispatchBarToneViolations(src), [],
    `overview-dispatch-bar.js 待答复条不满足功能色口径：\n  ${dispatchBarToneViolations(src).join('\n  ')}`);
});

test('C8 非空转：指标色与直达条判定在旧 / 新写法上分别判红 / 判绿', () => {
  const oldMetric = "metrics: _metrics({ label: '待答复', icon: 'message', color: 'var(--app-accent-soft-text)', value: (t) => t.answer }),";
  const newMetric = "metrics: _metrics({ label: '待答复', icon: 'message', color: METRIC_TONE.pending, value: (t) => t.answer }),";
  assert.equal(metricToneViolations(oldMetric).length, 1, '非空转失效：旧写法 --app-accent-soft-text 未被判红');
  assert.equal(metricToneViolations(newMetric, { pending: 'var(--status-info-text)' }).length, 0, '非空转过严：METRIC_TONE.pending 被误判');
  assert.equal(metricToneViolations("label: '待办', icon: 'list', color: 'var(--neutral-800)'").length, 0,
    '非空转过严：纯计数取中性档被误判');
  assert.equal(metricToneViolations("label: '在办', color: 'var(--neutral-500)'").length, 0,
    '非空转过严：非状态指标不应纳入判据');

  const oldBar = 'style="background:${accent}1A;border:1px solid ${accent}40;color:${accent};"';
  const newBar = 'style="background:color-mix(in srgb, var(--status-info-text) 12%, transparent);color:var(--status-info-text);"';
  assert.ok(dispatchBarToneViolations(oldBar).length >= 1, '非空转失效：旧主题色直达条未被判红');
  assert.deepEqual(dispatchBarToneViolations(newBar), [], '非空转过严：info 功能色直达条被误判');
});
