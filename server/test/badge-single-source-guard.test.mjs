// role: [工程师]+[AI]
// server/test/badge-single-source-guard.test.mjs — 徽章只从 badgeHtml 出（2026-11-21 批次 587）
//
// 判据（`H31` 组件复用纪律、`DS_03` 徽章单源）：
//   ① `docs/src` 不得手拼徽章（同一 class 串里 `rounded-full` ＋ `px-1.5|2|2.5` ＋ `py-0.5`）；
//      存量按文件基线**只减不增**，新文件出现即红；徽章组件自身（`components/ui/badge*`）豁免。
//   ② 反例自证：手拼徽章必须判红，`badgeHtml(...)` 产物模板不得被误伤。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const RE_CLASS = /class="([^"]*rounded(?:-full)?\b[^"]*)"/g;

/** 存量基线（2026-11-21 批次 590 实测 43 文件；只减不增）。 */
export const HAND_BADGE_BASELINE = new Set([
  'docs/src/components/feedback/issue-dispatch-view.js',
  'docs/src/components/feedback/reactions.js',
  'docs/src/components/governance/org-setup-wizard.js',
  'docs/src/components/governance/person-edit-modal.js',
  'docs/src/components/governance/resolution-followup-manager.js',
  'docs/src/components/governance/workforce-duty-card.js',
  'docs/src/components/governance/workgroup-member-editor.js',
  'docs/src/components/record/activity-view.js',
  'docs/src/components/record/inspector.js',
  'docs/src/components/record/taskforce-view.js',
  'docs/src/entries/pages/activity-entry.js',
  'docs/src/entries/pages/activity-materials-entry.js',
  'docs/src/entries/pages/messages-entry.js',
  'docs/src/entries/pages/notice-entry.js',
  'docs/src/entries/pages/party-committee-meeting-entry.js',
  'docs/src/entries/pages/person-entry.js',
  'docs/src/entries/pages/thought-report-entry.js',
  'docs/src/entries/tabs/disc/inspection-tab.js',
  'docs/src/entries/tabs/disc/review-tab.js',
  'docs/src/entries/tabs/leader/attendance-tab.js',
  'docs/src/entries/tabs/leader/inspection-tab.js',
  'docs/src/entries/tabs/leader/my-tasks-section.js',
  'docs/src/entries/tabs/leader/overview-tab.js',
  'docs/src/entries/tabs/leader/review-tab.js',
  'docs/src/entries/tabs/leader/write-tab.js',
  'docs/src/entries/tabs/org/inspection-tab.js',
  'docs/src/entries/tabs/org/member-flow-tab.js',
  'docs/src/entries/tabs/org/talent-tab.js',
  'docs/src/entries/tabs/org/taskforce-tab.js',
  'docs/src/entries/tabs/prop/archive-tab.js',
  'docs/src/entries/tabs/prop/tasks-tab.js',
  'docs/src/entries/tabs/prop/weekly-tab.js',
  'docs/src/entries/tabs/secretary/assign-tab.js',
  'docs/src/entries/tabs/secretary/feedback-tab.js',
  'docs/src/entries/tabs/secretary/group-progress-tab.js',
  'docs/src/entries/tabs/secretary/notification-tab.js',
  'docs/src/entries/tabs/secretary/report-up-tab.js',
  'docs/src/entries/tabs/secretary/todo-tab.js',
  'docs/src/entries/tabs/secretary/work-map-tab.js',
  'docs/src/entries/tabs/secretary/workforce-panel.js',
  'docs/src/entries/tabs/visitor/inspection-tab.js',
  'docs/src/entries/tabs/visitor/projects-tab.js',
  'docs/src/entries/tabs/visitor/review-tab.js',
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** 是否手拼徽章（供守卫与反例共用）。 */
export function isHandBadge(text) {
  for (const m of String(text).matchAll(RE_CLASS)) {
    const cls = m[1];
    if (/px-(?:1\.5|2|2\.5)\b/.test(cls) && /\bpy-0\.5\b/.test(cls)) return true;
  }
  return false;
}

const COMPONENT_ALLOW = /docs\/src\/components\/ui\/(?:badge|badges|status-badge)\.js$/;

test('① 手拼徽章只减不增：新文件出现即红', () => {
  const problems = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (COMPONENT_ALLOW.test(rel)) continue;
    if (!isHandBadge(readFileSync(file, 'utf8'))) continue;
    if (!HAND_BADGE_BASELINE.has(rel)) problems.push(`${rel} 手拼徽章：请改用 badgeHtml(label, tone)`);
  }
  assert.deepEqual(problems, [], `手拼徽章未登记：\n  ${problems.join('\n  ')}`);
});

test('② 反例自证：手拼判红、组件产物不误伤', () => {
  assert.equal(isHandBadge('<span class="text-xs px-2 py-0.5 rounded-full bg-blue-50">x</span>'), true,
    '注入的手拼徽章未被判出');
  assert.equal(isHandBadge('<span class="badge badge--info">x</span>'), false, 'badgeHtml 产物被误伤');
  assert.equal(isHandBadge('<span class="px-2 py-1 rounded-full">x</span>'), false, 'py-1 不属于徽章口径');
});
