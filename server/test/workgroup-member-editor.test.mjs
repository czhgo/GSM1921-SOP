import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkgroupMemberEditor } from '../../docs/src/components/governance/workgroup-member-editor.js?v=20261017g';
import { MockAdapter } from '../../docs/src/data/mock-adapter.js?v=20261017g';
import { ensureLegacySourceWorkgroups } from '../../docs/src/data/workgroup-seed-sync.js?v=20261017g';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261017g';
import { workgroupPermissionTemplates } from '../../docs/src/core/domain/workgroup-policy.js?v=20261017g';
import { renderSignupSection, renderSignupList } from '../../docs/src/components/governance/signup-panel.js?v=20261017g';

test('活动成员编辑器把组织者/深度参与者与已通过报名的一般参与者分层展示', () => {
  const html = renderWorkgroupMemberEditor({
    workgroupId: 'wg-activity-a1', kind: 'activity', canEdit: true,
    members: [{ personId: 'p1', name: '甲', role: 'organizer' }, { personId: 'p2', name: '乙', role: 'deep' }],
    participants: [{ personId: 'p3', name: '丙' }], grants: [], legacyRows: [],
  });
  assert.match(html, /活动工作组成员/);
  assert.match(html, /组织者/);
  assert.match(html, /深度参与者/);
  assert.match(html, /一般参与者.*已通过报名/);
  assert.match(html, /丙/);
  assert.doesNotMatch(html, /<option[^>]*value="participant"/);
  assert.match(html, /保存成员和权限/);
  assert.match(html, /aria-live="polite"/);
});

test('专班成员编辑器不提供一般参与或考勤，只把历史普通参与行标为待核', () => {
  const html = renderWorkgroupMemberEditor({
    workgroupId: 'wg-taskforce-t1', kind: 'taskforce', canEdit: true,
    members: [{ personId: 'p1', name: '甲', role: 'organizer' }], grants: [],
    legacyRows: [{ personId: 'p2', name: '乙', role: 'participant' }],
  });
  assert.match(html, /专班工作组成员/);
  assert.match(html, /历史普通参与记录待核/);
  assert.match(html, /不设一般参与者报名.*组织者\/深度参与者入组申请由组织台受理/);
  assert.doesNotMatch(html, /<option[^>]*value="participant"/);
  assert.doesNotMatch(html, /<button[^>]*>[^<]*(考勤|应到名单)/);
  assert.deepEqual(workgroupPermissionTemplates('taskforce').organizer.includes('activity.attendance.record'), false);
  assert.deepEqual(workgroupPermissionTemplates('taskforce').deep.includes('activity.signup.manage'), false);
});

test('只读成员展示不暴露增删、角色编辑或授权表单', () => {
  const html = renderWorkgroupMemberEditor({
    workgroupId: 'wg-activity-readonly', kind: 'activity', canEdit: false,
    members: [{ personId: 'p1', name: '甲', role: 'deep' }], grants: [], participants: [], legacyRows: [],
  });
  assert.match(html, /甲/);
  assert.doesNotMatch(html, /保存成员和权限|移除.*甲|data-member-role/);
  assert.doesNotMatch(html, /<details/, '只读成员卡没有可展开控件，不暗示还有空白身份详情');
  assert.match(html, /未授予操作权限/, '只读卡直接说明成员的独立授权状态');
});

test('报名角色和说明控件有可见标签，已通过的主题党日组织者能看见线下意向', () => {
  const form = renderSignupSection({ sourceType: 'activity', sourceId: 'act-labels', title: '主题党日', source: { type: '主题党日' }, signups: [], myId: 'p1' });
  assert.match(form, /<label[^>]*>报名角色\s*<select id="signup-role-select"/);
  assert.match(form, /<label[^>]*>附加说明（选填）\s*<input id="signup-note-input"/);
  assert.match(form, /id="signup-role-select"/);
  assert.match(form, /id="signup-note-input"/);

  const approved = renderSignupSection({
    sourceType: 'activity', sourceId: 'act-labels', title: '主题党日', source: { type: '主题党日' }, myId: 'p1',
    signups: [{ id: 's1', personId: 'p1', role: 'organizer', status: 'approved', onsite: false }],
  });
  assert.match(approved, /已选择不线下参加/);

  const list = renderSignupList({
    sourceType: 'activity', sourceId: 'act-labels', source: { type: '主题党日' }, myId: null,
    signups: [
      { id: 's1', personId: 'p1', role: 'organizer', status: 'approved', onsite: false },
      { id: 's2', personId: 'p2', role: 'deep', status: 'approved', onsite: true },
      { id: 's3', personId: 'p3', role: 'organizer', status: 'pending', onsite: true },
    ],
  });
  assert.match(list, /组织者\/深度参与者已通过报名：线下参加 1 人 · 不线下参加 1 人/);
  assert.doesNotMatch(list, /线下参加 2 人/, '待审核意向不计入已通过报名汇总');
});

test('旧演示活动和专班补齐稳定工作组映射，participant 保留在原业务记录', () => {
  const keys = ['activities', 'taskforces', 'workgroups', 'workgroupMembers'];
  const before = Object.fromEntries(keys.map((key) => [key, mockDB[key]]));
  mockDB.activities = [{
    id: 'legacy-activity', title: '历史活动', organizer: 'p1', branchId: 'br-b1',
    organizingScope: 'cross-group', assignments: [
      { personId: 'p1', role: 'organizer' }, { personId: 'p2', role: 'deep' }, { personId: 'p3', role: 'participant' },
    ],
  }];
  mockDB.taskforces = [{
    id: 'legacy-taskforce', name: '历史专班', task: '整理历史材料', status: 'active', branchId: 'br-b1',
    members: [
      { personId: 'p1', role: 'organizer' }, { personId: 'p2', role: 'deep' },
      { personId: 'p3', role: 'participant', contributions: ['历史记录'] },
    ],
  }];
  mockDB.workgroups = [];
  mockDB.workgroupMembers = [];
  try {
    assert.equal(ensureLegacySourceWorkgroups(mockDB), true);
    assert.equal(mockDB.activities[0].workgroupId, 'wg-activity-legacy-activity');
    assert.equal(mockDB.taskforces[0].workgroupId, 'wg-taskforce-legacy-taskforce');
    assert.equal(mockDB.workgroups.length, 2);
    assert.equal(mockDB.workgroups.find((row) => row.kind === 'taskforce').migrationState, 'pending-review');
    assert.deepEqual(mockDB.workgroupMembers.map((row) => [row.workgroupId, row.personId, row.role]), [
      ['wg-activity-legacy-activity', 'p1', 'organizer'],
      ['wg-activity-legacy-activity', 'p2', 'deep'],
      ['wg-taskforce-legacy-taskforce', 'p1', 'organizer'],
      ['wg-taskforce-legacy-taskforce', 'p2', 'deep'],
    ]);
    assert.ok(mockDB.activities[0].assignments.some((row) => row.role === 'participant'));
    assert.ok(mockDB.taskforces[0].members.some((row) => row.role === 'participant' && row.contributions[0] === '历史记录'));
    assert.equal(ensureLegacySourceWorkgroups(mockDB), false, '重复同步不新增工作组或成员');
    assert.equal(mockDB.workgroups.length, 2);
  } finally {
    for (const key of keys) mockDB[key] = before[key];
  }
});

test('旧数据同步清除指向类型冲突或异支部工作组的错误关联', () => {
  const keys = ['activities', 'taskforces', 'workgroups', 'workgroupMembers'];
  const before = Object.fromEntries(keys.map((key) => [key, mockDB[key]]));
  mockDB.activities = [{
    id: 'unsafe-link-activity', title: '活动', branchId: 'br-b1', workgroupId: 'existing-taskforce-group', assignments: [],
  }, {
    id: 'cross-branch-link-activity', title: '跨支部关联', branchId: 'br-b1', workgroupId: 'existing-other-branch', assignments: [],
  }, {
    id: 'empty-existing-group-activity', title: '已编辑为空的活动', branchId: 'br-b1', workgroupId: 'existing-empty-group',
    assignments: [{ personId: 'p1', role: 'organizer' }],
  }, {
    id: 'conflicting-source-activity', title: '来源字段冲突', branchId: 'br-b1', assignments: [],
  }];
  mockDB.taskforces = [];
  mockDB.workgroups = [{
    id: 'existing-taskforce-group', branchId: 'br-b1', kind: 'taskforce', sourceType: 'taskforce',
    sourceId: 'tf-existing', status: 'active',
  }, {
    id: 'existing-other-branch', branchId: 'br-b2', kind: 'activity', sourceType: 'activity',
    sourceId: 'act-other', status: 'active',
  }, {
    id: 'existing-empty-group', branchId: 'br-b1', kind: 'activity', sourceType: 'activity',
    sourceId: 'empty-existing-group-activity', status: 'active',
  }, {
    id: 'conflicting-source-group', branchId: 'br-b2', kind: 'activity', sourceType: 'activity',
    sourceId: 'conflicting-source-activity', status: 'active',
  }];
  mockDB.workgroupMembers = [];
  try {
    assert.equal(ensureLegacySourceWorkgroups(mockDB), true);
    assert.equal(mockDB.activities[0].workgroupId, null);
    assert.equal(mockDB.activities[1].workgroupId, null);
    assert.equal(mockDB.activities[2].workgroupId, 'existing-empty-group');
    assert.equal(mockDB.activities[3].workgroupId, undefined, '无显式链接的冲突来源记录保持待核，不自动再建一条工作组');
    assert.deepEqual(mockDB.workgroups.map((row) => row.id), ['existing-taskforce-group', 'existing-other-branch', 'existing-empty-group', 'conflicting-source-group']);
    assert.deepEqual(mockDB.workgroupMembers, [], '已有工作组的空成员集可能代表有意移空，不能从旧 assignments 反向补人');
  } finally {
    for (const key of keys) mockDB[key] = before[key];
  }
});

test('MockAdapter 首次加载的活动与专班种子都建立工作组主记录', () => {
  const keys = [
    'activities', 'taskforces', 'workgroups', 'workgroupMembers', 'tasks', 'assignments',
    'archiveRecords', 'signups', 'reviewRequests', 'makeupTasks', 'branches', '_loaded',
  ];
  const before = Object.fromEntries(keys.map((key) => [key, mockDB[key]]));
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    removeItem: () => {},
    setItem: () => {},
  };
  for (const key of keys) {
    if (Array.isArray(mockDB[key])) mockDB[key] = [];
  }
  mockDB._loaded = false;
  try {
    MockAdapter.loadDB();
    assert.ok(mockDB.workgroups.some((row) => row.id === 'wg-activity-act-3'));
    assert.ok(mockDB.workgroups.some((row) => row.id === 'wg-taskforce-tf-001'));
    assert.ok(mockDB.workgroupMembers.some((row) => row.workgroupId === 'wg-taskforce-tf-001' && row.role === 'deep'));
    assert.equal(mockDB.workgroupMembers.some((row) => row.role === 'participant'), false);
  } finally {
    for (const key of keys) mockDB[key] = before[key];
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});

test('MockAdapter 保存全量成员与权限时撤销被移出成员的授权并同步活动镜像', async () => {
  const keys = ['workgroups', 'workgroupMembers', 'workgroupGrants', 'activities', 'taskforces', 'users', '_loaded'];
  const before = Object.fromEntries(keys.map((key) => [key, mockDB[key]]));
  const oldStorage = globalThis.localStorage;
  const values = new Map([['gsm1921-login-user', JSON.stringify({ personId: 'p1' })]]);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  const workgroupId = 'wg-activity-editor-test';
  const activity = { id: 'activity-editor-test', workgroupId, branchId: 'br-b1', assignments: [
    { personId: 'p1', role: 'organizer' }, { personId: 'p2', role: 'deep' },
  ] };
  mockDB._loaded = true;
  mockDB.workgroups = [{ id: workgroupId, branchId: 'br-b1', kind: 'activity', sourceType: 'activity', sourceId: activity.id, status: 'active' }];
  mockDB.activities = [activity];
  mockDB.taskforces = [];
  mockDB.users = [{ id: 'p1', branchId: 'br-b1' }, { id: 'p2', branchId: 'br-b1' }, { id: 'p3', branchId: 'br-b1' }];
  mockDB.workgroupMembers = [
    { id: `wgm-${workgroupId}-p1`, workgroupId, branchId: 'br-b1', personId: 'p1', role: 'organizer', status: 'active' },
    { id: `wgm-${workgroupId}-p2`, workgroupId, branchId: 'br-b1', personId: 'p2', role: 'deep', status: 'active' },
  ];
  mockDB.workgroupGrants = [{ id: 'grant-old', workgroupId, branchId: 'br-b1', personId: 'p2', status: 'active', permissionKeys: ['task.complete'] }];
  try {
    const result = await MockAdapter.workgroups.members.saveAll(workgroupId, {
      members: [{ personId: 'p3', role: 'deep', templateKey: 'deep', permissionKeys: ['task.complete'], reason: '任务执行' }],
    });
    assert.deepEqual(result.members.filter((row) => row.status === 'active').map((row) => [row.personId, row.role]), [['p3', 'deep']]);
    assert.equal(mockDB.workgroupGrants.find((row) => row.id === 'grant-old').status, 'revoked');
    assert.deepEqual(mockDB.activities[0].assignments, [{ personId: 'p3', role: 'deep' }]);
  } finally {
    for (const key of keys) mockDB[key] = before[key];
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});
