import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolveDocumentUrl } from '../../docs/src/core/base/page-url.js?v=20261022a';

const adapterSource = readFileSync(new URL('../../docs/src/data/data-adapter.js', import.meta.url), 'utf8');
const todaySource = readFileSync(new URL('../../docs/src/entries/tabs/today/today-tab.js', import.meta.url), 'utf8');
const workspaceNavigationSources = [
  ['bootstrap authentication gates', '../../docs/src/core/boot/bootstrap.js'],
  ['todo notice summary', '../../docs/src/components/record/todo-tab-shell.js'],
  ['todo direct jumps', '../../docs/src/components/record/todo-jump.js'],
  ['member project cards', '../../docs/src/entries/tabs/visitor/projects-tab.js'],
  ['publicity project board', '../../docs/src/entries/tabs/prop/kanban-tab.js'],
].map(([name, path]) => ({ name, source: readFileSync(new URL(path, import.meta.url), 'utf8') }));

const activityEntrySource = readFileSync(new URL('../../docs/src/entries/pages/activity-entry.js', import.meta.url), 'utf8');
const thoughtReviewSource = readFileSync(new URL('../../docs/src/entries/tabs/org/thought-review-tab.js', import.meta.url), 'utf8');
const leaderTodoSource = readFileSync(new URL('../../docs/src/entries/tabs/leader/todo-tab.js', import.meta.url), 'utf8');
const leaderWorkspaceSource = readFileSync(new URL('../../docs/src/capabilities/leader-workspace.js', import.meta.url), 'utf8');

test('workspace fallbacks resolve from document base to the site root', () => {
  const workspaceBase = 'http://127.0.0.1:3001/'; // workspace HTML <base href="../">

  assert.equal(resolveDocumentUrl('login.html', { baseURI: workspaceBase }), `${workspaceBase}login.html`);
  assert.equal(
    resolveDocumentUrl('notice.html', { baseURI: workspaceBase, searchParams: { id: 'notice 1&2' } }),
    `${workspaceBase}notice.html?id=notice+1%262`,
  );
});

test('workspace fallbacks preserve a project deployment prefix', () => {
  const projectBase = 'https://example.org/GSM1921-SOP/'; // /workspace/*.html with <base href="../">

  assert.equal(resolveDocumentUrl('login.html', { baseURI: projectBase }), `${projectBase}login.html`);
  assert.equal(resolveDocumentUrl('notice.html', { baseURI: projectBase, searchParams: { id: 'n1' } }), `${projectBase}notice.html?id=n1`);
  for (const page of ['activity.html', 'taskforce.html']) {
    assert.equal(resolveDocumentUrl(page, { baseURI: projectBase, searchParams: { id: 'item-1' } }), `${projectBase}${page}?id=item-1`);
  }
});

test('session-expired and today-notice fallbacks use the shared document URL resolver', () => {
  assert.match(adapterSource, /resolveDocumentUrl\(['"]login\.html['"]\)/);
  assert.match(todaySource, /resolveDocumentUrl\(['"]notice\.html['"],\s*\{\s*searchParams:\s*\{\s*id:\s*noticeId\s*\}\s*\}\)/);
});

test('workspace navigation callers use the shared resolver and avoid escaping the project prefix', () => {
  for (const { name, source } of workspaceNavigationSources) {
    assert.match(source, /resolveDocumentUrl\(/, `${name} should resolve destinations against document.baseURI`);
    assert.doesNotMatch(
      source,
      /pathname\.includes\(['"]\/workspace\/['"]\)\s*\?\s*['"]\.\.\/['"]/,
      `${name} must not construct a parent-relative workspace destination`,
    );
  }
});

test('resolved fallback pages exist at the docs site root', () => {
  assert.equal(existsSync(new URL('../../docs/login.html', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../docs/notice.html', import.meta.url)), true);
});

// ════════════════════════════════════════════════════════════════
//  IA 链接真值（2026-10-21 · R3 Task 6）
// ════════════════════════════════════════════════════════════════

test('活动详情接受 id || activityId 别名，并按同一 sourceId 分流', () => {
  assert.match(activityEntrySource, /params\.get\('id'\)\s*\|\|\s*params\.get\('activityId'\)/, 'activity.html 须接受 ?activityId= 别名');
  assert.match(activityEntrySource, /const sourceId = params\.get\('id'\)\s*\|\|\s*params\.get\('activityId'\)\s*\|\|\s*''/,
    '两个参数须归一为同一 sourceId（后续分流只读它）');
});

test('思想汇报「完整记录」落个人档案，不得落名册聚合页', () => {
  assert.match(thoughtReviewSource, /person\.html\?id=\$\{encodeURIComponent\(personId\)\}/, '须给 person.html?id= 的真实档案落点');
  assert.doesNotMatch(thoughtReviewSource, /workspace\/org\.html\?tab=roster/, '不得把「完整记录」指向名册聚合页');
});

test('组长 todo tabMap 的每个值都存在于 leader-workspace 的 tab 集合', () => {
  const mapBody = leaderTodoSource.match(/const tabMap = \{([\s\S]*?)\};/)?.[1] || '';
  const values = [...mapBody.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(values.length >= 2, 'tabMap 解析失败（至少 authorize / review 两项）');
  for (const id of values) {
    assert.match(leaderWorkspaceSource, new RegExp(`\\{ id: '${id}'`), `leader-workspace 不存在 tabMap 目标页签「${id}」`);
  }
});

// ════════════════════════════════════════════════════════════════
//  R5A-01/02（2026-10-21）：<base href="../"> 下的同文档锚点与相对 ?tab= 链接
// ════════════════════════════════════════════════════════════════
test('工作台 skip link 在 <base> 下必须落回当前文档（不得指向 docs 根）', () => {
  const workspaceDir = new URL('../../docs/workspace/', import.meta.url);
  const pages = readdirSync(workspaceDir).filter((name) => name.endsWith('.html')).sort();
  assert.ok(pages.length >= 7, `工作台页面应不少于 7 个，实测 ${pages.length}`);

  for (const name of pages) {
    const html = readFileSync(new URL(name, workspaceDir), 'utf8');
    const baseHref = html.match(/<base href="([^"]+)"/)?.[1];
    assert.equal(baseHref, '../', `${name} 的 <base> 口径变了（本守卫按 ../ 解析）`);

    const skipHref = html.match(/<a href="([^"]+)"[^>]*class="[^"]*skip-link/)?.[1] || '';
    assert.ok(skipHref, `${name} 缺少 skip link`);
    assert.doesNotMatch(skipHref, /^#/, `${name} 的 skip link 仍在用裸 #：<base> 下会解析到 docs 根`);

    const docUrl = new URL(`https://example.org/GSM1921-SOP/workspace/${name}`);
    const baseUrl = new URL(baseHref, docUrl);
    const resolved = new URL(skipHref, baseUrl);
    assert.equal(resolved.pathname, `/GSM1921-SOP/workspace/${name}`,
      `${name} 的 skip link 解析到了 ${resolved.pathname}（应留在当前工作台）`);
    assert.equal(resolved.hash, '#main-content', `${name} 的 skip link 目标不是 #main-content`);
  }
});

test('概况 / 组长任务 / 支部只读页的 # 锚点必须经 docAnchorHref 运行时归一', () => {
  const sources = [
    ['工作概况 #wo-*', '../../docs/src/components/governance/work-overview.js', /href="#wo-/],
    ['组长「我的任务」', '../../docs/src/entries/tabs/leader/my-tasks-section.js', /href="#leader-activity-lists"/],
    ['支部只读目录', '../../docs/src/entries/pages/branch-readonly-entry.js', /href="#branch-overview"/],
  ];
  for (const [label, path, bareAnchor] of sources) {
    const src = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(src, /docAnchorHref\(/, `${label} 的页内锚点须经 docAnchorHref 转成当前文档路径`);
    assert.doesNotMatch(src, bareAnchor, `${label} 仍输出裸 # 锚点：<base href="../"> 下会离开工作台`);
  }
});

test('R5A-02：跨 tab 链接写明工作台页面路径，不再用裸 ?tab=', () => {
  const kanban = readFileSync(new URL('../../docs/src/entries/tabs/prop/kanban-tab.js', import.meta.url), 'utf8');
  assert.doesNotMatch(kanban, /href="\?tab=/, '宣传看板「去档案归档」仍是裸 ?tab=：<base> 下会变成 docs/?tab=archive');
  assert.match(kanban, /href="(?:\.\/|getBasePath\(\)\})?workspace\/prop\.html\?tab=archive"/,
    '宣传看板「去档案归档」须指向 workspace/prop.html?tab=archive');

  const branches = readFileSync(new URL('../../docs/src/entries/tabs/party-committee/branches-tab.js', import.meta.url), 'utf8');
  assert.doesNotMatch(branches, /href="\?tab=/, '党委台待批复链接仍是裸 ?tab=：<base> 下会变成 docs/?tab=review');
  assert.match(branches, /getBasePath\(\)\}workspace\/party-committee\.html\?tab=review/,
    '党委台待批复链接须指向 workspace/party-committee.html?tab=review');
});
