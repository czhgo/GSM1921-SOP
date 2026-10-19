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

/** 从壳源码里解析 `'workspace:<key>': { 旧id: '新id', … }` 别名块 */
function aliasesOf(scope) {
  const src = read(SHELL);
  const esc = scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`'${esc}':\\s*\\{([^}]*)\\}`).exec(src);
  if (!m) return null;
  const out = {};
  for (const p of m[1].matchAll(/(?:'([\w-]+)'|([\w-]+))\s*:\s*'([^']+)'/g)) {
    out[p[1] || p[2]] = p[3];
  }
  return out;
}

test('A01/A02/A04/A05/A06：已撤页签不得回潮', () => {
  const gone = {
    'disc-workspace.js': ['tf-view'],
    'prop-workspace.js': ['tf-view'],
    'org-workspace.js': ['tf-view'],
    'party-committee-workspace.js': ['monitor', 'governance-overview'],
  };
  for (const [file, ids] of Object.entries(gone)) {
    const live = tabIdsOf(file);
    for (const id of ids) assert.ok(!live.has(id), `${file} 仍注册已撤页签 ${id}（IA A01/A02/A04/A05/A06）`);
  }
});

test('旧 id 别名必须落到该台真实承接页（不白屏）', () => {
  const expected = {
    'workspace:disc': { 'tf-view': 'calendar' },
    'workspace:prop': { 'tf-view': 'kanban' },
    'workspace:org': { 'tf-view': 'taskforce' },
    'workspace:party-committee': { monitor: 'branches', 'governance-overview': 'review' },
  };
  for (const [scope, table] of Object.entries(expected)) {
    const aliases = aliasesOf(scope);
    assert.ok(aliases, `workspace-shell.js 缺 ${scope} 的旧 id 别名块`);
    const live = tabIdsOf(WORKS[scope]);
    for (const [oldId, newId] of Object.entries(table)) {
      assert.equal(aliases[oldId], newId, `${scope} 的旧 id「${oldId}」应落「${newId}」`);
      assert.ok(live.has(newId), `${scope} 的承接页「${newId}」不在能力注册里 —— 别名会指向空`);
    }
  }
});

test('未登记的台不凭空长别名（零影响现行 id）', () => {
  for (const scope of ['workspace:secretary', 'workspace:leader', 'workspace:visitor']) {
    const aliases = aliasesOf(scope);
    assert.equal(aliases, null, `${scope} 不应新增别名块（本次裁定未涉及）`);
  }
});
