// role: [工程师]+[AI]
// server/test/status-palette-text-guard.test.mjs — 状态文字禁用 Tailwind 调色板（2026-11-21 批次 587）
//
// 判据（`H40.3-2`、`DS_03` SD-46 / §4.21.2）：
//   ① 状态 / 提示文字只走 `--status-*-text` 或 `--neutral-*`；`docs/src` 的 `text-(amber|green|red|blue|emerald|rose|orange)-<n>`
//      按文件计数只减不增（存量基线 286 处；新文件出现即红）。
//   ② 卡片容器不得同时挂 `card` 与调色板底色（`bg-(gray|green|amber|red|blue)-(50|100)`）——卡片一律白底 ＋ hairline。
//   ③ 反例自证：注入计数与卡片底色必须被判红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const RE_PALETTE_TEXT = /text-(?:amber|green|red|blue|emerald|rose|orange|indigo|sky|teal|violet|purple)-\d+/g;
const RE_CARD_TINT = /class="([^"]*)"/g;

/** 存量基线（2026-11-21 批次 590 实测 291 处 / 56 文件；只减不增）。 */
export const PALETTE_TEXT_BASELINE = Object.freeze({
  'docs/src/components/feedback/issue-detail.js': 1,
  'docs/src/components/governance/org-setup-wizard.js': 11,
  'docs/src/components/governance/person-edit-modal.js': 2,
  'docs/src/components/governance/resolution-followup-manager.js': 1,
  'docs/src/components/governance/workgroup-member-editor.js': 4,
  'docs/src/components/record/calendar.js': 3,
  'docs/src/components/record/inspector.js': 9,
  'docs/src/components/record/report-inbox.js': 1,
  'docs/src/components/record/taskforce-view.js': 3,
  'docs/src/components/ui/modal.js': 1,
  'docs/src/entries/pages/activity-entry.js': 9,
  'docs/src/entries/pages/activity-materials-entry.js': 8,
  'docs/src/entries/pages/branch-config-entry.js': 1,
  'docs/src/entries/pages/login-entry.js': 1,
  'docs/src/entries/pages/messages-entry.js': 1,
  'docs/src/entries/pages/party-committee-meeting-entry.js': 3,
  'docs/src/entries/pages/person-entry.js': 1,
  'docs/src/entries/tabs/disc/attendance-tab.js': 18,
  'docs/src/entries/tabs/disc/inspection-tab.js': 12,
  'docs/src/entries/tabs/disc/makeup-tab.js': 2,
  'docs/src/entries/tabs/disc/review-tab.js': 6,
  'docs/src/entries/tabs/leader/attendance-tab.js': 9,
  'docs/src/entries/tabs/leader/inspection-tab.js': 5,
  'docs/src/entries/tabs/leader/members-tab.js': 3,
  'docs/src/entries/tabs/leader/my-tasks-section.js': 3,
  'docs/src/entries/tabs/leader/overview-tab.js': 1,
  'docs/src/entries/tabs/leader/review-tab.js': 8,
  'docs/src/entries/tabs/leader/write-tab.js': 8,
  'docs/src/entries/tabs/org/inspection-tab.js': 7,
  'docs/src/entries/tabs/org/member-flow-tab.js': 11,
  'docs/src/entries/tabs/org/roster-tab.js': 1,
  'docs/src/entries/tabs/org/talent-tab.js': 2,
  'docs/src/entries/tabs/org/taskforce-tab.js': 19,
  'docs/src/entries/tabs/party-committee/branches-tab.js': 4,
  'docs/src/entries/tabs/party-committee/content-tab.js': 2,
  'docs/src/entries/tabs/party-committee/dispatch-tab.js': 3,
  'docs/src/entries/tabs/party-committee/party-config-tab.js': 3,
  'docs/src/entries/tabs/party-committee/review-tab.js': 1,
  'docs/src/entries/tabs/prop/archive-tab.js': 20,
  'docs/src/entries/tabs/prop/tasks-tab.js': 8,
  'docs/src/entries/tabs/prop/weekly-tab.js': 5,
  'docs/src/entries/tabs/secretary/assign-tab.js': 5,
  'docs/src/entries/tabs/secretary/calendar-tab.js': 7,
  'docs/src/entries/tabs/secretary/feedback-tab.js': 4,
  'docs/src/entries/tabs/secretary/group-progress-tab.js': 2,
  'docs/src/entries/tabs/secretary/notification-tab.js': 13,
  'docs/src/entries/tabs/secretary/report-up-tab.js': 4,
  'docs/src/entries/tabs/secretary/todo-tab.js': 3,
  'docs/src/entries/tabs/secretary/workforce-panel.js': 1,
  'docs/src/entries/tabs/visitor/attendance-tab.js': 4,
  'docs/src/entries/tabs/visitor/inspection-tab.js': 2,
  'docs/src/entries/tabs/visitor/projects-tab.js': 11,
  'docs/src/entries/tabs/visitor/review-tab.js': 7,
  'docs/src/entries/tabs/visitor/thought-report-tab.js': 1,
  'docs/src/services/governance/issues.js': 4,
  'docs/src/services/governance/review.js': 2,
});

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** 返回 { rel → 计数 }；供守卫与反例共用。 */
export function paletteCountsOf(text) {
  return (String(text).match(RE_PALETTE_TEXT) || []).length;
}

/** 返回卡片容器里同时出现的调色板底色（字符串数组）。 */
export function cardTintOf(text) {
  const bad = [];
  for (const m of String(text).matchAll(RE_CARD_TINT)) {
    const cls = m[1];
    if (/\bcard\b/.test(cls) && /\bbg-(?:gray|green|amber|red|blue)-(?:50|100)\b/.test(cls)) bad.push(cls);
  }
  return bad;
}

const FILES = walk(SRC);

test('① 调色板状态文字按文件计数只减不增，且不得出现新文件', () => {
  const problems = [];
  for (const file of FILES) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const count = paletteCountsOf(readFileSync(file, 'utf8'));
    if (count === 0) continue;
    const base = PALETTE_TEXT_BASELINE[rel];
    if (base == null) problems.push(`${rel}（${count}）未登记：新代码请用 --status-*-text / --neutral-*`);
    else if (count > base) problems.push(`${rel}：${count} > 基线 ${base}（只减不增）`);
  }
  assert.deepEqual(problems, [], `调色板状态文字超基线：\n  ${problems.join('\n  ')}`);
});

test('② 卡片容器不得挂调色板底色（卡一律白底 ＋ hairline）', () => {
  const bad = [];
  for (const file of FILES) {
    const hits = cardTintOf(readFileSync(file, 'utf8'));
    if (hits.length) bad.push(`${relative(ROOT, file).replace(/\\/g, '/')} → ${hits.join(' | ')}`);
  }
  assert.deepEqual(bad, [], `卡片仍用调色板底色：\n  ${bad.join('\n  ')}`);
});

test('③ 反例自证：调色板计数与卡片底色都必须被判出', () => {
  assert.equal(paletteCountsOf('class="text-red-600"'), 1, '注入的调色板文字未被计数');
  assert.equal(cardTintOf('class="card card-standard bg-gray-50"').length, 1, '注入的灰底卡未被判出');
  assert.equal(cardTintOf('class="rounded-lg bg-gray-50"').length, 0, '非卡片容器被误伤');
});
