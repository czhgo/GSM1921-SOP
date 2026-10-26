// role: [工程师]+[AI]
// object-route-guard.test.mjs — 详情路由（direct / locate / none）守卫（Task 6 · 2026-10-26）
//
// 判据：
//   R1 入口矩阵单一源：每个入口只声明一种 mode，并写明理由；未知入口不得放行。
//   R2 direct / locate 落点：通知/待办/首页/共享日历/跨页深链/归档行 → direct；
//      支书活动管理/组织台专班管理/成员项目分工/工作概况预览/归档弹窗 → locate。
//   R3 门：缺 id → none；跨支部普通角色 → none；党委/组织员 → 放行。
//   R4 已归档只读：activity.archived / 专班终态 → readOnly；activity-entry 的写口全部关闭。
//   R5 生成点收口：docs/src 内不得再有裸 `activity.html?id=` / `taskforce.html?id=` 生成；
//      全部入口文件必须 import object-route。
//   R6 无空 id 可点：不得出现 `... || ''` 拼出的详情链接。
//   R7 可点节点可键盘：taskforce-view / 项目分工卡 / inspector 卡 / 归档行均带 role+tabindex+keydown。
//   R8 同一页只有一个完整详情落点：归档弹窗/工作概况预览/专班面板只保留预览 + 「打开完整页」。
//
// 故障注入（人工，不入仓）：
//   · 把任一入口从 OBJECT_ROUTE_ENTRIES 删除 → R1 / R5 红；
//   · 在任一入口文件写回 `activity.html?id=${id}` → R5 红；
//   · 把 `canManageMembers = !readOnly && ...` 的 `!readOnly` 去掉 → R4 红；
//   · 把归档弹窗的 fullHref 删除 → R8 红。
//
// 运行：node --test server/test/object-route-guard.test.mjs（纯 node）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  OBJECT_ROUTE_ENTRIES,
  OBJECT_DETAIL_PAGES,
  canViewObjectDetail,
  isTerminal,
  objectDetailHref,
  resolveObjectRoute,
} from '../../docs/src/core/domain/object-route.js?v=20261026a';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 递归收集 docs/src 下 .js（posix 相对路径） */
function jsFiles(dir = SRC, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) jsFiles(p, out);
    else if (entry.name.endsWith('.js')) out.push(relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out.sort();
}

const DIRECT_ENTRIES = ['notice', 'todo', 'home', 'today', 'shared-calendar', 'cross-page-deeplink', 'archive-row', 'workspace-aggregate'];
const LOCATE_ENTRIES = ['owner-workspace', 'archive-modal', 'overview-preview'];

/** 必须经统一路由的入口文件（渲染点 / 跳转点） */
const ROUTE_CONSUMERS = [
  'docs/src/entries/pages/notice-entry.js',
  'docs/src/components/record/todo-jump.js',
  'docs/src/entries/pages/main-entry.js',
  'docs/src/entries/tabs/shared/activity-calendar-tab.js',
  'docs/src/components/dashboard/gallery.js',
  'docs/src/entries/tabs/prop/archive-tab.js',
  'docs/src/entries/tabs/org/taskforce-tab.js',
  'docs/src/entries/tabs/visitor/projects-tab.js',
  'docs/src/components/record/inspector.js',
  'docs/src/components/record/taskforce-view.js',
  'docs/src/components/record/activity-view.js',
  'docs/src/entries/pages/archive-entry.js',
  'docs/src/entries/tabs/secretary/calendar-tab.js',
  'docs/src/entries/tabs/today/today-tab.js',
  'docs/src/entries/tabs/secretary/todo-tab.js',
  'docs/src/entries/tabs/prop/kanban-tab.js',
];

const view = { personId: '2400012349', role: 'participant', branchId: 'br-b1' };
const obj = { id: 'act-1', branchId: 'br-b1' };

test('R1 入口矩阵：每个入口只声明一种 mode 并写理由，未知入口不得放行', () => {
  for (const entry of [...DIRECT_ENTRIES, ...LOCATE_ENTRIES]) {
    const def = OBJECT_ROUTE_ENTRIES[entry];
    assert.ok(def, `入口矩阵缺少 ${entry}`);
    assert.ok(['direct', 'locate'].includes(def.mode), `${entry} 的 mode 必须是 direct/locate`);
    assert.ok(String(def.reason || '').length >= 12, `${entry} 必须写清「为什么不是另一种 mode」`);
  }
  for (const entry of DIRECT_ENTRIES) assert.equal(OBJECT_ROUTE_ENTRIES[entry].mode, 'direct', `${entry} 应为 direct`);
  for (const entry of LOCATE_ENTRIES) assert.equal(OBJECT_ROUTE_ENTRIES[entry].mode, 'locate', `${entry} 应为 locate`);
  assert.equal(resolveObjectRoute({ type: 'activity', obj, viewer: view, entry: 'unknown' }).mode, 'none');
  assert.equal(OBJECT_DETAIL_PAGES.activity, 'activity.html');
  assert.equal(OBJECT_DETAIL_PAGES.taskforce, 'taskforce.html');
});

test('R2 落点：direct 直达详情页 / locate 同页定位但 href 仍指向完整页', () => {
  for (const entry of DIRECT_ENTRIES) {
    const route = resolveObjectRoute({ type: 'activity', obj, viewer: view, entry });
    assert.equal(route.mode, 'direct', `${entry} 应 direct`);
    assert.equal(route.href, 'activity.html?id=act-1', `${entry} 的直达 href 不正确`);
  }
  for (const entry of LOCATE_ENTRIES) {
    const route = resolveObjectRoute({ type: 'activity', obj, viewer: view, entry });
    assert.equal(route.mode, 'locate', `${entry} 应 locate`);
    assert.equal(route.href, 'activity.html?id=act-1', `${entry} 的「打开完整页」href 不正确`);
  }
  assert.equal(resolveObjectRoute({ type: 'taskforce', obj: { id: 'tf-1' }, viewer: view, entry: 'owner-workspace' }).href,
    'taskforce.html?id=tf-1');
});

test('R3 门：缺 id / 跨支部拒绝；同支部与党委/组织员放行', () => {
  for (const entry of [...DIRECT_ENTRIES, ...LOCATE_ENTRIES]) {
    const route = resolveObjectRoute({ type: 'activity', obj: { id: '' }, viewer: view, entry });
    assert.equal(route.mode, 'none', `${entry} 缺 id 时必须 none`);
    assert.equal(route.href, '', `${entry} 缺 id 时不得给 href`);
  }
  assert.equal(canViewObjectDetail({ type: 'activity', obj: { id: '' }, viewer: view }), false, '缺 id 必须拒绝');
  assert.equal(canViewObjectDetail({ type: 'activity', obj: { id: 'a', branchId: 'br-b2' }, viewer: view }), false, '跨支部普通角色必须拒绝');
  assert.equal(canViewObjectDetail({ type: 'activity', obj: { id: 'a', branchId: 'br-b1' }, viewer: view }), true, '同支部必须放行');
  assert.equal(canViewObjectDetail({ type: 'activity', obj: { id: 'a', branchId: 'br-b2' }, viewer: { ...view, role: 'party-staff' } }), true, '党委必须放行');
  assert.equal(canViewObjectDetail({ type: 'activity', obj: { id: 'a', branchId: 'br-b2' }, viewer: { ...view, role: 'org-commissioner' } }), true, '组织员必须放行');
  assert.equal(resolveObjectRoute({ type: 'activity', obj: { id: 'a', branchId: 'br-b2' }, viewer: view, entry: 'notice' }).mode, 'none');
});

test('R4 已归档/终态只读：resolveObjectRoute.readOnly 与 activity-entry 写口门一致', () => {
  assert.equal(isTerminal('activity', { archived: true }), true);
  assert.equal(isTerminal('activity', { archived: false }), false);
  assert.equal(isTerminal('taskforce', { status: 'completed' }), true);
  assert.equal(isTerminal('taskforce', { status: 'archived' }), true);
  assert.equal(isTerminal('taskforce', { status: 'dissolved' }), true);
  assert.equal(isTerminal('taskforce', { status: 'active' }), false);
  const archivedRoute = resolveObjectRoute({ type: 'activity', obj: { id: 'a', archived: true }, viewer: view, entry: 'owner-workspace' });
  assert.equal(archivedRoute.mode, 'locate', '已归档仍可点（只读）');
  assert.equal(archivedRoute.readOnly, true, '已归档必须 readOnly');

  const entry = read('docs/src/entries/pages/activity-entry.js');
  assert.match(entry, /const readOnly = act\.archived === true;/, 'activity-entry 缺 archived 只读判定');
  assert.match(entry, /const canManageMembers = !readOnly && !formalRoster/, '已归档活动的 canManageMembers 必须为 false');
  assert.match(entry, /已归档，只读保留/, '已归档详情必须显示「已归档，只读保留」');
  for (const gate of ['canSignup = !readOnly', 'canCloseSignup = !readOnly', 'canManageWork = !readOnly', 'canInitiateTransfer = !readOnly']) {
    assert.ok(entry.includes(gate), `activity-entry 写口未纳入只读门：${gate}`);
  }
  assert.match(entry, /isTaskforceTerminalStatus\(tf\.status\)/, '专班终态必须与归档库同一 isTerminal 口径');
});

test('R5 生成点收口：docs/src 无裸详情 URL 生成，入口文件都走统一路由', () => {
  const files = jsFiles();
  assert.ok(files.length >= 180, `只扫到 ${files.length} 个 docs/src/*.js（扫描范围异常）`);
  const offenders = [];
  let resolverRefs = 0;
  for (const file of files) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    resolverRefs += (src.match(/objectDetailHref\s*\(/g) || []).length;
    if (file === 'docs/src/core/domain/object-route.js') continue; // 单一出口自身
    src.split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (/\b(?:activity|taskforce)\.html\?id=/.test(line)) {
        offenders.push(`${file}:${i + 1} → ${t.slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `仍有裸详情 URL 生成点（应走 objectDetailHref / resolveObjectRoute）：\n  ${offenders.join('\n  ')}`);
  assert.ok(resolverRefs >= 30, `objectDetailHref 调用点仅 ${resolverRefs}（下限 30）：收口可能被回退`);

  for (const file of ROUTE_CONSUMERS) {
    const src = read(file);
    assert.match(src, /object-route\.js\?v=/, `${file} 未接入统一对象路由`);
    assert.match(src, /objectDetailHref|resolveObjectRoute|canViewObjectDetail/, `${file} 未消费统一对象路由`);
  }
});

test('R6 无空 id 可点：不得用 `|| \'\'` 拼详情链接', () => {
  const offenders = [];
  for (const file of jsFiles()) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (/(?:activity|taskforce)\.html\?id=\$\{[^}]*\|\|\s*''/.test(line)) offenders.push(`${file}:${i + 1}`);
      if (/objectDetailHref\([^)]*\|\|\s*''/.test(line)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `空 id 详情链接：${offenders.join(', ')}`);
});

test('R7 可点节点可键盘：卡片/行带 role + tabindex + keydown（或原生 a/button）', () => {
  const tfv = read('docs/src/components/record/taskforce-view.js');
  assert.match(tfv, /class="tfv-card[^>]*role="button"[^>]*tabindex="0"/, '专班卡缺 role/tabindex');
  assert.match(tfv, /querySelectorAll\('\.tfv-card'\)[\s\S]{0,500}addEventListener\('keydown'/, '专班卡缺 keydown');

  const projects = read('docs/src/entries/tabs/visitor/projects-tab.js');
  assert.match(projects, /class="visitor-proj-card[^>]*role="button"[^>]*tabindex="0"/, '项目分工卡缺 role/tabindex');
  assert.match(projects, /host\.addEventListener\('keydown'/, '项目分工卡缺 keydown');

  const inspector = read('docs/src/components/record/inspector.js');
  assert.match(inspector, /inspector-card--action" role="button" tabindex="0"/, 'inspector 卡缺 role/tabindex');
  assert.match(inspector, /querySelectorAll\('\[data-act-id\]\[role="button"\]'\)/, 'inspector 卡缺键盘绑定');
  assert.doesNotMatch(inspector, /inspector-card[^>]*style="cursor:pointer;/, '不得再保留「整卡 cursor:pointer 但只有标题可点」');

  const archiveEntry = read('docs/src/entries/pages/archive-entry.js');
  assert.match(archiveEntry, /role="button" tabindex="0"[^>]*data-archive-item/, '归档条目缺 role/tabindex');
  assert.match(archiveEntry, /addEventListener\('keydown'/, '归档条目缺 keydown');

  const archiveTab = read('docs/src/entries/tabs/prop/archive-tab.js');
  assert.match(archiveTab, /function _activityLinkHtml/, '档案行缺统一链接出口');
  assert.match(archiveTab, /hover:underline/, '档案行缺 hover/下划线');
  assert.match(archiveTab, /text-accent" aria-hidden="true">→/, '档案行缺箭头线索');
  assert.doesNotMatch(archiveTab, /style="text-decoration:none;color:inherit;"/, '档案行仍有「无下划线无色」的伪可点');
});

test('R8 同一页只有一个完整详情落点：弹窗/预览保留并补「打开完整页」', () => {
  const archiveEntry = read('docs/src/entries/pages/archive-entry.js');
  assert.match(archiveEntry, /fullHref: objectDetailHref\('activity'[\s\S]{0,80}entry: 'archive-modal'/, '归档活动弹窗缺完整页出口');
  assert.match(archiveEntry, /fullHref: objectDetailHref\('taskforce'[\s\S]{0,80}entry: 'archive-modal'/, '归档专班弹窗缺完整页出口');
  assert.match(archiveEntry, /打开完整页/, '归档弹窗必须展示「打开完整页」');
  assert.match(archiveEntry, /未找到该已归档活动/, '归档深链未命中必须有可见提示');
  assert.match(archiveEntry, /未找到该已归档专班/, '归档专班深链未命中必须有可见提示');

  const activityView = read('docs/src/components/record/activity-view.js');
  assert.match(activityView, /entry: 'overview-preview'/, '工作概况活动预览应走 overview-preview（locate）');
  assert.match(activityView, /打开完整页/, '工作概况活动预览缺「打开完整页」');

  const tfv = read('docs/src/components/record/taskforce-view.js');
  assert.match(tfv, /entry: 'owner-workspace'/, '专班同页详情应走 owner-workspace（locate）');
  assert.match(tfv, /打开完整页/, '专班详情缺「打开完整页」');

  const projects = read('docs/src/entries/tabs/visitor/projects-tab.js');
  assert.match(projects, /renderTaskforceDetailPanel/, '成员台专班卡应复用唯一详情渲染器');
  assert.doesNotMatch(projects, /function _renderTfDetail/, '成员台不得复制第二套专班详情渲染');

  const orgTab = read('docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(orgTab, /entry: 'owner-workspace'/, '组织台专班面板应走 owner-workspace（locate）');
  assert.match(orgTab, /打开完整页/, '组织台专班面板缺「打开完整页」');
  assert.match(orgTab, /未找到该专班/, '组织台 ?taskforceId= 定位失败必须有可见提示');
});
