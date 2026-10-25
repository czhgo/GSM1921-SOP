// role: [工程师]+[AI]
// tab-alias-guard.test.mjs — IA 修复批次的旧深链兼容守卫（Task 6.1）
//
// 病灶（2026-10-20 IA 审查 A01/A02/A04/A05/A06）：五个页签被删除/并入后，
//   `?tab=<旧id>` 若无别名会静默落到默认 tab —— 用户以为链接坏了，且对象全丢。
// 判据（两条）：
//   ① 已删页签不得再出现在该台能力注册里；
//   ② 每个旧 id 别名都必须指向**该台真实存在的页签**（承接页），不得指向空。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CAP = join(ROOT, 'docs', 'src', 'capabilities');
const SHELL = join(ROOT, 'docs', 'src', 'components', 'shell', 'workspace-shell.js');

const read = (f) => readFileSync(f, 'utf8');

/** 能力注册文件里的页签 id 集合（与 doc-consistency::tabsOf 同口径：只认行首 `{ id: '…'`） */
function tabIdsOf(file) {
  const ids = new Set();
  for (const line of read(join(CAP, file)).split(/\r?\n/)) {
    const t = line.trimStart();
    if (t.startsWith('//') || !t.startsWith('{ id: ')) continue;
    const id = /id: '([^']+)'/.exec(line)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

const WORKS = {
  'workspace:secretary': 'secretary-workspace.js',
  'workspace:org': 'org-workspace.js',
  'workspace:prop': 'prop-workspace.js',
  'workspace:disc': 'disc-workspace.js',
  'workspace:leader': 'leader-workspace.js',
  'workspace:visitor': 'visitor-workspace.js',
  'workspace:party-committee': 'party-committee-workspace.js',
};

/** 取 `'workspace:<key>': { … }` 的对象体（大括号配对——2026-10-25 起别名值可为对象，不能再按首个 `}` 截断） */
function aliasBlockOf(scope) {
  const src = read(SHELL);
  const esc = scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`'${esc}':\\s*\\{`).exec(src);
  if (!m) return null;
  const start = src.indexOf('{', m.index);
  let depth = 0;
  for (let p = start; p < src.length; p += 1) {
    if (src[p] === '{') depth += 1;
    else if (src[p] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, p);
    }
  }
  return null;
}

/** 解析别名：值可为 `'新id'` 或 `{ tab: '新id', section/filter/lane }` */
function aliasesOf(scope) {
  const body = aliasBlockOf(scope);
  if (body === null) return null;
  const out = {};
  for (const m of body.matchAll(/'?([\w-]+)'?\s*:\s*(?:\{([^}]*)\}|'([^']+)')/g)) {
    const [, oldId, objBody, strVal] = m;
    if (strVal) { out[oldId] = { tab: strVal }; continue; }
    const tab = /tab:\s*'([^']+)'/.exec(objBody)?.[1];
    if (!tab) continue;
    out[oldId] = {
      tab,
      section: /section:\s*'([^']+)'/.exec(objBody)?.[1],
      filter: /filter:\s*'([^']+)'/.exec(objBody)?.[1],
      lane: /lane:\s*'([^']+)'/.exec(objBody)?.[1],
    };
  }
  return out;
}

test('已撤页签不得回潮（含 2026-10-25 IA 62→45 的 17 项）', () => {
  const gone = {
    'disc-workspace.js': ['tf-view', 'calendar', 'my-dispatch'],
    'prop-workspace.js': ['tf-view', 'calendar', 'my-dispatch', 'tasks'],
    'org-workspace.js': ['tf-view', 'calendar', 'my-dispatch'],
    'leader-workspace.js': ['tf-view', 'calendar', 'my-dispatch', 'inspection'],
    'visitor-workspace.js': ['tf-view', 'my-dispatch', 'thought-report', 'inspection', 'review'],
    'secretary-workspace.js': ['tf-view', 'member-flow'],
    'party-committee-workspace.js': ['monitor', 'governance-overview'],
  };
  for (const [file, ids] of Object.entries(gone)) {
    const live = tabIdsOf(file);
    for (const id of ids) assert.ok(!live.has(id), `${file} 仍注册已撤页签 ${id}（IA 62→45）`);
  }
});

test('旧 id 别名必须落到该台真实承接页（不白屏），且页内落点参数齐全', () => {
  const expected = {
    'workspace:secretary': { 'tf-view': ['overview', 'insight'] },
    'workspace:org': {
      'tf-view': ['taskforce', null],
      calendar: ['overview', 'calendar'],
      'my-dispatch': ['todo', null, 'dispatch'],
    },
    'workspace:prop': {
      'tf-view': ['kanban', null],
      calendar: ['overview', 'calendar'],
      'my-dispatch': ['todo', null, 'dispatch'],
      tasks: ['kanban', null, null, 'tasks'],
    },
    'workspace:disc': {
      makeup: ['attendance', null],
      'tf-view': ['overview', 'calendar'],
      calendar: ['overview', 'calendar'],
      'my-dispatch': ['todo', null, 'dispatch'],
    },
    'workspace:leader': {
      calendar: ['overview', 'calendar'],
      'my-dispatch': ['todo', null, 'dispatch'],
      'tf-view': ['members', 'groups'],
      inspection: ['members', 'inspection'],
    },
    'workspace:visitor': {
      'my-dispatch': ['todo', null, 'dispatch'],
      'tf-view': ['projects', 'taskforce'],
      'thought-report': ['growth', 'thought'],
      inspection: ['growth', 'inspection'],
      review: ['growth', 'review'],
    },
    'workspace:party-committee': { monitor: ['branches', null], 'governance-overview': ['review', null] },
  };
  for (const [scope, table] of Object.entries(expected)) {
    const aliases = aliasesOf(scope);
    assert.ok(aliases, `workspace-shell.js 缺 ${scope} 的旧 id 别名块`);
    const live = tabIdsOf(WORKS[scope]);
    for (const [oldId, [newId, section, filter, lane]] of Object.entries(table)) {
      assert.ok(aliases[oldId], `${scope} 缺旧 id「${oldId}」别名`);
      assert.equal(aliases[oldId].tab, newId, `${scope} 的旧 id「${oldId}」应落「${newId}」`);
      assert.ok(live.has(newId), `${scope} 的承接页「${newId}」不在能力注册里 —— 别名会指向空`);
      if (section !== null) assert.equal(aliases[oldId].section, section, `${scope}/${oldId} 的 section 落点不符`);
      if (filter) assert.equal(aliases[oldId].filter, filter, `${scope}/${oldId} 的 filter 落点不符`);
      if (lane) assert.equal(aliases[oldId].lane, lane, `${scope}/${oldId} 的 lane 落点不符`);
    }
  }
});

test('跨台迁移（支书成员流动 → 组织台）走页面级重定向，且落地带 legacy 说明', () => {
  // 2026-10-25 IA 62→45：同源组件两个页签位 ⇒ 收口组织台本位；本台不再有别名，改为换页。
  const src = read(SHELL);
  assert.match(src, /_legacyPageRedirects/, '缺跨台重定向表');
  assert.match(src, /'member-flow': 'org\.html\?tab=member-flow&legacy=member-flow'/, '成员流动须跳组织台本位并带 legacy');
  assert.match(src, /__wsLegacyNoticeShown/, '落地须给一次可见说明（toast）');
});
