import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITY_PACKAGES, CAPABILITY_PACKAGE_BY_ID, disabledCapabilityChildIds } from '../../docs/src/core/domain/capability-packages.js?v=20261017h';

test('业务能力包目录记录正交治理属性、页面子项与版本，未核实项保持待核', () => {
  const ids = new Set(CAPABILITY_PACKAGES.map((item) => item.id));
  assert.equal(ids.size, CAPABILITY_PACKAGES.length, '能力包 id 唯一');
  for (const item of CAPABILITY_PACKAGES) {
    assert.ok(item.name && item.version);
    assert.ok(['required', 'optional', 'local', 'pending'].includes(item.applicability));
    assert.equal(item.configurationAuthority, 'branch');
    assert.ok(['verified', 'pending'].includes(item.basisStatus));
    assert.ok(Array.isArray(item.pages) && Array.isArray(item.workflowBlockIds) && Array.isArray(item.outputBlockIds));
    assert.ok(Array.isArray(item.dependencies));
    for (const dependency of item.dependencies) assert.ok(ids.has(dependency), `${item.id} 依赖必须指向目录条目`);
  }
  assert.equal(CAPABILITY_PACKAGE_BY_ID.get('taskforce-workgroup').applicability, 'local');
  assert.equal(CAPABILITY_PACKAGE_BY_ID.get('activity-organization').applicability, 'pending');
});

test('共享产出块只在全部所属业务能力包关闭时停用', () => {
  const packageState = { 'activity-organization': true, 'activity-attendance': false };
  assert.ok(!disabledCapabilityChildIds(packageState, 'outputBlockIds').includes('attendance'));
  packageState['activity-organization'] = false;
  assert.ok(disabledCapabilityChildIds(packageState, 'outputBlockIds').includes('attendance'));
  assert.ok(!CAPABILITY_PACKAGE_BY_ID.get('taskforce-workgroup').outputBlockIds.includes('materials'));
});
