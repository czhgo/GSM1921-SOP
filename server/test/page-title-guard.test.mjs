// role: [工程师]+[AI]
// page-title-guard.test.mjs — 页题层级守卫（2026-10-21 R5-B F-01 / R5-C C-02）
//
// 口径（DESIGN_SYSTEM §3.3.1 / §4.25）：
//   · H1 = 顶栏品牌（全站唯一）⇒ 每个 tab 的页面标题必须是 H2；
//   · H2 字号统一 20px（.page-frame__title = 1.25rem）；
//   · 卡头 / 内嵌面板标题降为 H3，不得再用 H4 + 16px 冒充分区。
//
// 本守卫是**静态**结构断言（真机「每个 tab 恰好一个 H2」由 page-sweep 承担）：
//   P1 能力注册里的每个 tab，其渲染模块自身或共享件必须提供 H2（含 renderTabHeader）；
//   P2 页题字号单一源 1.25rem，今天页 H2 用 text-xl；
//   P3 全站源码不得再有 H4 + text-base（16px）的卡头；
//   P4 七个工作台静态壳不得再输出页题（静态台名已移除，唯一 H2 由页签 renderTabHeader 提供）；
//   P5 活动/专班详情 H3/H4 顺序合法（H4 不得先于 H3；汇报收件箱的 H4 前先出 H3）；
//   P6 党委台卡头不复述页签名（「支部上报」只在页签 H2 出现一次）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const read = (abs) => readFileSync(abs, 'utf8');

const CAPABILITY_FILES = [
  'docs/src/capabilities/secretary-workspace.js',
  'docs/src/capabilities/org-workspace.js',
  'docs/src/capabilities/disc-workspace.js',
  'docs/src/capabilities/leader-workspace.js',
  'docs/src/capabilities/prop-workspace.js',
  'docs/src/capabilities/visitor-workspace.js',
  'docs/src/capabilities/party-committee-workspace.js',
];

/** 七个工作台静态壳：页题 H2 只由页签 renderTabHeader 提供，静态壳不得再占 H2。 */
const WORKSPACE_SHELLS = ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor', 'party-committee'];

/** 由共享件承担 H2 的渲染模块（登记例外，不是豁免：共享件自身由 P0 校验）。 */
const SHARED_H2_PROVIDERS = [
  { marker: 'todo-tab-shell', where: 'components/record/todo-tab-shell.js' },
  { marker: 'work-overview', where: 'components/governance/work-overview.js' },
  { marker: 'issue-dispatch-view', where: 'components/feedback/issue-dispatch-view.js' },
  { marker: 'insight-view', where: 'components/record/insight-view.js' },
  { marker: 'today-tab', where: 'entries/tabs/today/today-tab.js' },
  { marker: 'shared/activity-calendar-tab', where: 'entries/tabs/shared/activity-calendar-tab.js' },
];

/** 从能力注册行取 tab 的 render import 目标（每个 tab 声明都在首行带 import('…')）。 */
function tabModules(capFile) {
  const abs = join(ROOT, capFile);
  const out = [];
  for (const line of read(abs).split('\n')) {
    if (!/\{ id: '[^']+', label: '[^']+'/.test(line)) continue;
    const m = /import\('([^']+)'\)/.exec(line);
    if (!m) continue;
    const target = resolve(join(abs, '..'), m[1].split('?')[0]);
    out.push({
      cap: capFile,
      id: /\{ id: '([^']+)'/.exec(line)[1],
      label: /\{ label: '([^']+)'/.exec(line)?.[1] || '',
      target,
    });
  }
  return out;
}

/** 模块是否提供页题 H2（自身或登记共享件）。 */
function providesH2(file) {
  const src = read(file);
  if (/<h2\b/.test(src)) return 'self';
  if (/renderTabHeader\s*\(/.test(src)) return 'self';
  for (const p of SHARED_H2_PROVIDERS) {
    if (src.includes(p.marker)) return p.where;
  }
  return null;
}

test('P0 页题单一源：renderTabHeader 产出 H2，字号 1.25rem', () => {
  const frame = read(join(SRC, 'components/shell/page-frame.js'));
  assert.match(frame, /<h2 class="page-frame__title">/, 'renderTabHeader 必须输出 H2');
  const css = read(join(SRC, 'styles.css'));
  assert.match(css, /\.page-frame__title\s*\{[^}]*font-size:\s*1\.25rem/, '页题 H2 字号须为 1.25rem（20px）');
  const today = read(join(SRC, 'entries/tabs/today/today-tab.js'));
  assert.match(today, /<h2 class="page-frame__title">今天/, '今天页 H2 须复用 .page-frame__title（20px，单一源）');
  assert.doesNotMatch(today, /<h2 class="font-title-cn text-lg/, '今天页 H2 不得再用 18px（text-lg）');
});

test('P1 每个 tab 的渲染模块都提供 H2（自身或登记共享件）', () => {
  const seen = new Map();
  const missing = [];
  for (const cap of CAPABILITY_FILES) {
    for (const t of tabModules(cap)) {
      if (!existsSync(t.target)) {
        missing.push(`${cap} · ${t.label}：渲染模块不存在 ${relative(ROOT, t.target)}`);
        continue;
      }
      const via = providesH2(t.target);
      if (!via) missing.push(`${cap} · ${t.label}：${relative(ROOT, t.target)} 无 H2 / renderTabHeader / 登记共享件`);
      else seen.set(`${cap}:${t.id}`, via);
    }
  }
  // 2026-10-25 IA 62→45：基线随页签总数改准（原 62 → 45）。
  assert.ok(seen.size >= 45, `页题覆盖数只有 ${seen.size}（基线 45）`);
  assert.deepEqual(missing, [], `以下 tab 缺页级 H2：\n  ${missing.join('\n  ')}`);
});

test('P2 登记共享件自身必须有 H2', () => {
  for (const p of SHARED_H2_PROVIDERS) {
    const src = read(join(SRC, p.where));
    assert.ok(/<h2\b/.test(src) || /renderTabHeader\s*\(/.test(src), `${p.where} 未提供 H2`);
  }
});

test('P3 卡头不得再用 H4 + 16px 冒充分区', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      read(p).split('\n').forEach((line, idx) => {
        if (/<h4[^>]*(text-base|text-lg|font-size:\s*1rem)/.test(line)) {
          offenders.push(`${relative(ROOT, p)}:${idx + 1} ${line.trim().slice(0, 100)}`);
        }
      });
    }
  };
  walk(SRC);
  assert.deepEqual(offenders, [], `H4 越级（应改 H3 + 14px）：\n  ${offenders.join('\n  ')}`);
});

test('P4 工作台静态壳不再输出页题：唯一 H2 由页签 renderTabHeader 提供', () => {
  const offenders = [];
  for (const page of WORKSPACE_SHELLS) {
    const rel = `docs/workspace/${page}.html`;
    const src = read(join(ROOT, rel));
    if (/<h2\b/.test(src)) offenders.push(`${rel}：静态壳仍有 <h2>（静态台名应移除）`);
    if (/page-frame__title/.test(src)) offenders.push(`${rel}：静态壳仍有 .page-frame__title 页题元素`);
    if (!new RegExp(`id="${page}-content"`).test(src)) offenders.push(`${rel}：缺少页签内容容器 #${page}-content`);
  }
  assert.deepEqual(offenders, [], `页题单层被破坏（静态台名与页签 H2 重复）：\n  ${offenders.join('\n  ')}`);
});

test('P5 活动/专班详情 H3/H4 顺序合法：H4 不得先于 H3，汇报收件箱前先出 H3', () => {
  const src = read(join(SRC, 'entries/pages/activity-entry.js'));
  const firstH3 = src.indexOf('<h3');
  const firstH4 = src.indexOf('<h4');
  assert.ok(firstH3 >= 0, 'activity-entry.js 未找到任何 H3：详情分区标题层级丢失');
  if (firstH4 >= 0) {
    assert.ok(firstH3 < firstH4, 'activity-entry.js 出现 H4 先于 H3（应先出分区 H3，再进卡头 H4）');
  }
  assert.match(src, /<h3[^>]*>汇报明细<\/h3>[\s\S]{0,400}renderReportInboxHtml\(/,
    '汇报收件箱（卡头 H4）前须先出 H3「汇报明细」，不得 H4 先于 H3');
  // 内部语：原始 act-* / tf-* 不再作为正文徽章；只允许出现在复制链接的 title 里。
  assert.doesNotMatch(src, /<span class="text-xs text-gray-500">\$\{(?:act|tf)\.id\}<\/span>/,
    '活动/专班详情不得再把原始 ID 当正文徽章');
  assert.match(src, /title="对象编号 \$\{esc\((?:act|tf)\.id\)\}/, '原始 ID 只应移入复制链接的 title');
});

test('P6 党委台卡头不复述页签名：支部上报只在页签 H2 出现一次', () => {
  const src = read(join(SRC, 'entries/tabs/party-committee/review-tab.js'));
  assert.match(src, /renderTabHeader\(\{ title: '支部上报'/, '页签 H2 须由 renderTabHeader 提供');
  assert.doesNotMatch(src, /<h3[^>]*>\s*支部上报(?:处理)?\s*<\/h3>/, '卡头 H3 不得逐字复述页签名「支部上报」');
  assert.doesNotMatch(src, /renderSectionHeader\(\{[^}]*支部上报处理/, '「支部上报处理」卡头应降为普通文本或移除');
});
