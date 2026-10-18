import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolveDocumentUrl } from '../../docs/src/core/base/page-url.js?v=20261018h';

const adapterSource = readFileSync(new URL('../../docs/src/data/data-adapter.js', import.meta.url), 'utf8');
const todaySource = readFileSync(new URL('../../docs/src/entries/tabs/today/today-tab.js', import.meta.url), 'utf8');
const workspaceNavigationSources = [
  ['bootstrap authentication gates', '../../docs/src/core/boot/bootstrap.js'],
  ['todo notice summary', '../../docs/src/components/record/todo-tab-shell.js'],
  ['todo direct jumps', '../../docs/src/components/record/todo-jump.js'],
  ['member project cards', '../../docs/src/entries/tabs/visitor/projects-tab.js'],
  ['publicity project board', '../../docs/src/entries/tabs/prop/kanban-tab.js'],
].map(([name, path]) => ({ name, source: readFileSync(new URL(path, import.meta.url), 'utf8') }));

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
