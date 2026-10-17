import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as visibility from '../../docs/src/services/core/visibility.js?v=20261017h';

test('活动与工作组姓名仅向登录且处于本支部或明确选中支部的查看者开放', () => {
  assert.equal(typeof visibility.canRevealActivityMemberNames, 'function', '应存在活动成员姓名可见性单一判据');
  const canReveal = visibility.canRevealActivityMemberNames;
  const activity = { id: 'act-private-names', branchId: 'br-b1' };
  assert.equal(canReveal(activity, null), false, '未登录分享页隐藏成员姓名');
  assert.equal(canReveal(activity, { id: 'member-1', role: 'participant', branchId: 'br-b1' }), true);
  assert.equal(canReveal(activity, { id: 'member-2', role: 'participant', branchId: 'br-b2' }), false);
  assert.equal(canReveal(activity, { id: 'party-user', role: 'party-staff' }, 'br-b1'), true, '党委需明确选中该支部');
  assert.equal(canReveal(activity, { id: 'party-user', role: 'party-staff' }, ''), false);
  assert.equal(canReveal({ id: 'legacy-without-branch' }, { id: 'member-1', role: 'participant', branchId: 'br-b1' }), false, '归属不明时默认隐藏姓名');
});

test('活动与共享专班只读详情均执行姓名遮蔽判据', () => {
  const root = resolve(import.meta.dirname, '../..');
  const activityEntry = readFileSync(resolve(root, 'docs/src/entries/pages/activity-entry.js'), 'utf8');
  const taskforceView = readFileSync(resolve(root, 'docs/src/components/record/taskforce-view.js'), 'utf8');
  assert.match(activityEntry, /canRevealActivityMemberNames/);
  assert.match(activityEntry, /!canRevealMemberNames[\s\S]{0,350}正式名单/);
  assert.match(taskforceView, /canRevealActivityMemberNames/);
  assert.match(taskforceView, /const memberRows = filled\.length === 0[\s\S]{0,300}canRevealNames/);
  assert.match(taskforceView, /登录并进入所属支部后可查看姓名/);
});
