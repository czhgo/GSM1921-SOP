// role: [工程师]+[AI]
// ui-home-deeplink.test.mjs — 首页「完整日历 / 查看全部」深链守卫（2026-10-18 · Spec Task 8）
//
// 判据：
//   D1 首页两个入口均带 data-ws-tab（深链协议仍在，不是裸 href）；
//   D2 每台解析后的目标页签（data-ws-tab-<page> 覆盖 data-ws-tab）必须命中该台注册 tab id；
//   D3 「完整日历」＝各台真实日历页签：支书/组织/宣传/纪检/组长 → calendar；成员台无独立日历页签
//      → activities（＋subview=calendar）；党委台无日历页签 → 最近的 monitor；
//   D4 「查看全部」＝真实工作组页签：组织台 → taskforce；其余五台 → tf-view；党委台 → monitor；
//   D5 不再出现「不存在的 tab=activities / tab=taskforce」——activities 只允许成员台、taskforce 只允许组织台；
//   D6 main-entry.js 确实按角色消费 data-ws-tab-<page>，且 subview 只在 activities 上附加；
//   D7 版本戳保持 20261018i（本批不升版本）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = join(ROOT, 'docs', 'index.html');
const MAIN_ENTRY = join(ROOT, 'docs', 'src', 'entries', 'pages', 'main-entry.js');
const CAP_DIR = join(ROOT, 'docs', 'src', 'capabilities');

// 首页链接可能落到的全部工作台页（与 ROLE_PAGE_MAP 对齐；党委台无支部内页签，另作最近可用映射）
const PAGE_CAPS = {
  secretary: 'secretary-workspace.js',
  org: 'org-workspace.js',
  prop: 'prop-workspace.js',
  disc: 'disc-workspace.js',
  leader: 'leader-workspace.js',
  visitor: 'visitor-workspace.js',
  'party-committee': 'party-committee-workspace.js',
};
const SIX_BRANCH_PAGES = ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor'];

const TAB_ID_RE = /^\s*\{\s*id:\s*'([^']+)'/gm;

function tabIdsOf(file) {
  const src = readFileSync(join(CAP_DIR, file), 'utf8');
  return new Set([...src.matchAll(TAB_ID_RE)].map((m) => m[1]));
}

const REGISTERED = Object.fromEntries(
  Object.entries(PAGE_CAPS).map(([page, file]) => [page, tabIdsOf(file)]),
);

/** data-ws-tab-party-committee → PartyCommittee（与 main-entry.js 的解析规则一致） */
function camelPage(page) {
  return page.replace(/(^|-)([a-z])/g, (_, _sep, ch) => ch.toUpperCase());
}

/** 解析 index.html 中所有带 data-ws-tab* 的锚点 */
function deeplinkAnchors() {
  const html = readFileSync(INDEX, 'utf8');
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/\bdata-ws-([\w-]+)(?:="([^"]*)")?/g)) {
      attrs[a[1]] = a[2] ?? '';
    }
    if (attrs.tab === undefined) continue;
    out.push({
      text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      attrs,
    });
  }
  return out;
}

/** 该台实际会被写入 ?tab= 的值：优先 data-ws-tab-<page>，否则 data-ws-tab */
function targetTabFor(anchor, page) {
  return anchor.attrs[`tab-${page}`] ?? anchor.attrs.tab;
}

const anchors = deeplinkAnchors();
const calendarLink = anchors.find((a) => a.text.includes('完整日历'));
const taskforceLink = anchors.find((a) => a.text.includes('查看全部'));

test('D1 首页「完整日历 / 查看全部」都走 data-ws-tab 深链', () => {
  assert.ok(calendarLink, 'index.html 未找到「完整日历 →」');
  assert.ok(taskforceLink, 'index.html 未找到「查看全部 →」');
  assert.equal(calendarLink.attrs.tab, 'calendar', '「完整日历」默认页签应为 calendar');
  assert.equal(taskforceLink.attrs.tab, 'taskforce', '「查看全部」默认页签应为 taskforce');
});

test('D2 每台解析后的目标页签都命中该台注册 tab id', () => {
  for (const [name, anchor] of [['完整日历', calendarLink], ['查看全部', taskforceLink]]) {
    for (const page of Object.keys(PAGE_CAPS)) {
      const target = targetTabFor(anchor, page);
      assert.ok(target, `${name} 在 ${page} 台解析出的页签为空`);
      assert.ok(
        REGISTERED[page].has(target),
        `${name} 在 ${page} 台落到不存在的 tab="${target}"；该台注册页签：${[...REGISTERED[page]].join(', ')}`,
      );
    }
  }
});

test('D3 「完整日历」落各台真实日历页签', () => {
  for (const page of SIX_BRANCH_PAGES) {
    const expected = page === 'visitor' ? 'activities' : 'calendar';
    assert.equal(
      targetTabFor(calendarLink, page),
      expected,
      `「完整日历」在 ${page} 台应落 ${expected}`,
    );
  }
  // 成员台无独立日历页签：activities + subview=calendar（日历视图）
  assert.equal(calendarLink.attrs.view, 'calendar', '「完整日历」缺少 data-ws-view="calendar"');
  assert.equal(targetTabFor(calendarLink, 'visitor'), 'activities', '成员台应落活动动态的日历视图');
  assert.equal(
    targetTabFor(calendarLink, 'party-committee'),
    'monitor',
    '党委台无日历页签，应落到最近的支部动态（monitor）',
  );
});

test('D4 「查看全部」落各台真实工作组页签', () => {
  assert.equal(targetTabFor(taskforceLink, 'org'), 'taskforce', '组织台应落专班管理（taskforce）');
  for (const page of ['secretary', 'prop', 'disc', 'leader', 'visitor']) {
    assert.equal(
      targetTabFor(taskforceLink, page),
      'tf-view',
      `「查看全部」在 ${page} 台应落知情查看/专班动态（tf-view）`,
    );
  }
  assert.equal(
    targetTabFor(taskforceLink, 'party-committee'),
    'monitor',
    '党委台无工作组页签，应落到最近的支部动态（monitor）',
  );
});

test('D5 不再出现不存在的 tab=activities / tab=taskforce', () => {
  // 默认（未覆盖）值不得是 activities——成员台以外的台没有该 id
  assert.notEqual(calendarLink.attrs.tab, 'activities', '「完整日历」默认值不得写 activities');
  for (const anchor of [calendarLink, taskforceLink]) {
    for (const page of Object.keys(PAGE_CAPS)) {
      const target = targetTabFor(anchor, page);
      if (page !== 'visitor') {
        assert.notEqual(target, 'activities', `${page} 台没有 activities 页签，不得落 tab=activities`);
      }
      if (page !== 'org') {
        assert.notEqual(target, 'taskforce', `${page} 台没有 taskforce 页签，不得落 tab=taskforce`);
      }
    }
  }
});

test('D6 main-entry.js 按角色消费 data-ws-tab-<page>，subview 只在 activities 上附加', () => {
  const src = readFileSync(MAIN_ENTRY, 'utf8');
  assert.match(src, /wsTab\$\{pageSuffix\}/, 'main-entry.js 未按角色读取 data-ws-tab-<page>');
  assert.match(src, /dataset\.wsTab\b/, 'main-entry.js 未保留 data-ws-tab 兜底');
  assert.match(src, /tab\s*===\s*'activities'/, 'subview 应只在目标为 activities 时附加');
  assert.doesNotMatch(
    src,
    /a\.dataset\.wsView\s*\?/,
    'main-entry.js 仍无条件附加 subview（其它台会带无用参数）',
  );
});

test('D7 index 与 main-entry 共用同一活动版本戳（发版不写死版本号）', () => {
  const stampOf = (file) => [...readFileSync(file, 'utf8').matchAll(/\?v=(\d{8}[a-z])/g)].map((m) => m[1]);
  const indexStamps = new Set(stampOf(INDEX));
  const mainStamps = new Set(stampOf(MAIN_ENTRY));
  assert.equal(indexStamps.size, 1, `index.html 应只含一个活动版本戳，实测：${[...indexStamps].join(', ')}`);
  assert.equal(mainStamps.size, 1, `main-entry.js 应只含一个活动版本戳，实测：${[...mainStamps].join(', ')}`);
  assert.deepEqual([...mainStamps], [...indexStamps], 'index.html 与 main-entry.js 的版本戳必须一致（否则模块实例分裂）');
});
