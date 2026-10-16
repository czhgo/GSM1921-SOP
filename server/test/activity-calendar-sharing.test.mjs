import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(import.meta.dirname, path), 'utf8');

test('成员台保留活动动态入口，同时复用各角色共享的只读日历实现', () => {
  const visitor = read('../../docs/src/entries/tabs/visitor/activities-tab.js');
  const visitorWorkspace = read('../../docs/src/capabilities/visitor-workspace.js');
  assert.match(visitorWorkspace, /id: 'activities', label: '活动动态'/);
  assert.match(visitor, /from '\.\.\/shared\/activity-calendar-tab\.js/);
  assert.match(visitor, /renderSharedActivityCalendar\(vc,/);
  assert.doesNotMatch(visitor, /const byMonth = \{\}/, '成员台不再保留第二套按月卡片日历');
});

test('四个只读角色入口仍指向相同的共享渲染器；支书保留含写入的活动管理页', () => {
  const root = '../../docs/src/capabilities';
  for (const page of ['org', 'prop', 'disc', 'leader']) {
    const source = read(`${root}/${page}-workspace.js`);
    assert.match(source, /entries\/tabs\/shared\/activity-calendar-tab\.js/,
      `${page} 工作台应复用共享日历实现`);
  }
  const secretary = read(`${root}/secretary-workspace.js`);
  assert.match(secretary, /id: 'calendar', label: '活动管理'/,
    '支书侧的活动创建与管理职责继续放在活动管理入口');
});
