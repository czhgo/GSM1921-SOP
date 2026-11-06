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
  // 2026-10-24 批次 508：`view` 是工作台壳的协议参数（壳会消费并清掉），页签改读
  //   ① 壳透传的 `ctx.navTarget.view`；② `?subview=` 深链。不再保留读不到的 `?view=` 分支。
  assert.match(visitor, /get\('subview'\)/, '深链视图参数须兼容 subview');
  assert.match(visitor, /ctx\?\.navTarget\?\.view/, '须消费壳透传的 navTarget.view');
  assert.doesNotMatch(visitor.replace(/\/\/[^\n]*/g, ''), /params\.get\('view'\)/, '不得再读已被壳清掉的 ?view=（注释除外）');
});

test('四个只读角色入口仍指向相同的共享渲染器；支书保留含写入的活动管理页', () => {
  // 2026-10-25 IA 62→45：org/prop/disc/leader 的「活动日历」**页签已删**，降为「工作概况」页内折叠卡
  //   ⇒ 判据改为「概览页复用同一份共享日历」，不再要求能力注册里出现 calendar 页签。
  const root = '../../docs/src/capabilities';
  for (const page of ['org', 'prop', 'disc', 'leader']) {
    const source = read(`${root}/${page}-workspace.js`);
    assert.doesNotMatch(source, /id: 'calendar'/, `${page} 台注册不应再含 calendar 页签（已降为工作概况折叠卡）`);
    assert.match(source, /overview-tab\.js/, `${page} 台须保留工作概况承接页`);
    const overview = read(`../../docs/src/entries/tabs/${page}/overview-tab.js`);
    assert.match(overview, /renderCalendarCard/, `${page} 工作概况须挂共享日历卡（单一源）`);
  }
  // 组织台的包装件仍是「共享日历 + 跨组招募 + 活动进展」三段，单一源不变。
  const wrapper = read('../../docs/src/entries/tabs/org/activity-calendar-tab.js');
  assert.match(wrapper, /entries\/tabs\/shared\/activity-calendar-tab\.js/,
    '组织台包装件须复用共享日历实现');
  assert.match(wrapper, /renderCalendarView/, '组织台须导出页内版渲染入口');
  const orgOverview = read('../../docs/src/entries/tabs/org/overview-tab.js');
  assert.match(orgOverview, /renderCalendarView/, '组织台工作概况须复用本台三段包装件');

  const secretary = read(`${root}/secretary-workspace.js`);
  assert.match(secretary, /id: 'calendar', label: '活动管理'/,
    '支书侧的活动创建与管理职责继续放在活动管理入口');
});

test('右栏活动卡与左栏同落点：提供「查看活动详情」链接到 activity.html', () => {
  const source = read('../../docs/src/entries/tabs/shared/activity-calendar-tab.js');
  assert.match(source, /function _bindActivityDetailLinks\(container\)/, '右栏须补详情出口');
  // Task 6（2026-10-26）：左右栏落点统一由 objectDetailHref 生成（同一 `activity.html?id=` 形态、缺 id 不给链接），
  //   故断言「同一 resolver → link.href」而非字面量 URL。
  assert.match(source, /const href = objectDetailHref\('activity', id, \{ entry: 'shared-calendar' \}\);[\s\S]{0,600}link\.href = `\.\/\$\{href\}`/, '右栏链接须与左栏同一落点（经统一对象路由）');
  assert.match(source, /查看活动详情 →/, '右栏卡片须有明确文字出口');
  assert.match(source, /new MutationObserver\(enhance\)/, '日期切换重绘后须保持链接');
});
