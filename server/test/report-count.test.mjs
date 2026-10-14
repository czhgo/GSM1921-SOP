// 活动上报名单人数：只数分配成员与已通过、未作废的活动报名，并按 personId 去重。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';
import { extractDomain } from '../services/reporting.js';

test('activity participantCount：分配成员与有效报名按 personId 去重', () => {
  const db = initDb(':memory:');
  try {
    const activityId = 'act-report-count-rule';
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(activityId, JSON.stringify({
      id: activityId,
      title: '人数口径回归活动',
      date: '2026-10-12',
      type: '主题党日',
      status: 'completed',
      assignments: [
        { personId: 'p1', role: 'organizer' },
        { personId: 'p2', role: 'participant' },
        { personId: 'p2', role: 'deep' },
        { role: 'participant' },
      ],
    }));
    const signups = [
      { id: 'su-count-overlap', personId: 'p2', status: 'approved' },
      { id: 'su-count-approved', personId: 'p3', status: 'approved' },
      { id: 'su-count-pending', personId: 'p4', status: 'pending' },
      { id: 'su-count-rejected', personId: 'p5', status: 'rejected' },
      { id: 'su-count-cancelled', personId: 'p6', status: 'cancelled' },
      { id: 'su-count-voided', personId: 'p7', status: 'approved', voided: true },
      { id: 'su-count-no-person', status: 'approved' },
    ];
    for (const signup of signups) {
      db.prepare('INSERT INTO signups (id, data) VALUES (?, ?)').run(signup.id, JSON.stringify({
        ...signup,
        sourceType: 'activity',
        sourceId: activityId,
      }));
    }
    db.prepare('INSERT INTO signups (id, data) VALUES (?, ?)').run('su-count-taskforce', JSON.stringify({
      id: 'su-count-taskforce', sourceType: 'taskforce', sourceId: 'tf-count', personId: 'p8', status: 'approved',
    }));

    const rows = extractDomain(db, 'activity', '2026-10-12', '2026-10-12');
    const item = rows.find((row) => row.id === activityId);
    assert.ok(item, '活动应出现在上报结果中');
    assert.equal(item.participantCount, 3, '名单应为 p1、p2、p3，各计一次');

    const updateSignup = (signupId, patch) => {
      const row = db.prepare('SELECT data FROM signups WHERE id = ?').get(signupId);
      const current = JSON.parse(row.data);
      db.prepare('UPDATE signups SET data = ? WHERE id = ?').run(JSON.stringify({ ...current, ...patch }), signupId);
    };
    updateSignup('su-count-approved', { status: 'pending' });
    assert.equal(extractDomain(db, 'activity', '2026-10-12', '2026-10-12')
      .find((row) => row.id === activityId).participantCount, 2, '报名转待审核后不计入名单');
    updateSignup('su-count-approved', { status: 'approved', voided: true });
    assert.equal(extractDomain(db, 'activity', '2026-10-12', '2026-10-12')
      .find((row) => row.id === activityId).participantCount, 2, '通过报名作废后不计入名单');
    updateSignup('su-count-approved', { status: 'approved', voided: false });
    assert.equal(extractDomain(db, 'activity', '2026-10-12', '2026-10-12')
      .find((row) => row.id === activityId).participantCount, 3, '恢复为有效通过后重新计入');
  } finally {
    db.close();
  }
});
