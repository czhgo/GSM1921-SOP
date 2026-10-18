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
  // 2026-10-18 脏专项 Top 3：外层「列表 / 日历 / 查询」是唯一主切换；
  // 日历内层「月/周/日/列表」降为次级粒度条，且不再出现第二个「列表」。
  assert.match(visitor, /_demoteCalendarToolbar/, '日历内层工具条须降级');
  assert.match(visitor, /querySelector\('\[data-view="list"\]'\)\?\.remove\(\)/, '日历视图内不得出现内层「列表」');
  assert.match(visitor, /visitor-cal-granularity-label/, '内层工具条须有次级标识');
  assert.match(visitor, /params\.get\('subview'\) \|\| params\.get\('view'\)/, '深链视图参数须同时兼容 subview / view');
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

test('右栏活动卡与左栏同落点：提供「查看活动详情」链接到 activity.html', () => {
  const source = read('../../docs/src/entries/tabs/shared/activity-calendar-tab.js');
  assert.match(source, /function _bindActivityDetailLinks\(container\)/, '右栏须补详情出口');
  assert.match(source, /link\.href = `\.\/activity\.html\?id=\$\{encodeURIComponent\(id\)\}`/, '右栏链接须与左栏同一落点');
  assert.match(source, /查看活动详情 →/, '右栏卡片须有明确文字出口');
  assert.match(source, /new MutationObserver\(enhance\)/, '日期切换重绘后须保持链接');
});
