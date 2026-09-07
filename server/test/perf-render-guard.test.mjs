// role: [工程师]+[AI]
// server/test/perf-render-guard.test.mjs — P2 提速批护栏：渲染守卫与视图缓存（2026-09-07）
// 依据：.trae/specs/2026-09-07-perf/spec.md §四（P2 渲染守卫：数据未变时聚合页跳过整链
//       重算与整卡重建；行为差异零、状态安全）与 §五（渲染守卫：buildFn 计数 / 状态保留）。
// 覆盖（桩容器对象模拟 container dataset/firstElementChild/innerHTML；helper 无 DOM 直导）：
//   ① 数据键未变两次 memoizeRender → buildFn 仅执行 1 次，且 container 内容未被覆盖
//     （同 key 命中：跳过重建，现 DOM 保留 = 折叠/选中等状态不丢）
//   ② 键变化 → buildFn 共 2 次且内容更新（数据变化重建回默认）
//   ③ 内容被外部清空（firstElementChild=null）后同键再调 → 重建（容器无真实产物不命中）
//   ④ marker：同内容容器被异方整体替换（dataset.memoKey 残留但内容标记消失）→ 同键仍重建
//     （防工作台多 tab 复用同一内容容器时「切回本 tab 错留上一 tab 内容」）
//   ⑤ calendar 视图缓存：同月同视图同数据仅 1 次网格重建（calendarGridNeedsRebuild 计数），
//     切月/切视图/数据变化（活动增删 / 任务内容变）均触发重建；期间键一致则跳过
// 运行：node --test test/perf-render-guard.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { memoizeRender } from '../../docs/src/components/memoize-render.js?v=20260907b';
import {
  calendarMemoKey, calendarGridNeedsRebuild,
} from '../../docs/src/components/calendar.js?v=20260907b';

// ── 桩容器对象（模拟 container：dataset / firstElementChild / innerHTML / querySelector）──
function makeContainer(initialHtml = '', hasChild = false) {
  const c = {
    dataset: {},
    innerHTML: initialHtml,
    firstElementChild: hasChild ? { tagName: 'DIV' } : null,
  };
  // 简化 querySelector：按内联 data-ws-memo="x" 标记扫描 innerHTML（命中标记 = 内容仍属本卡）
  c.querySelector = (sel) => {
    const m = /data-ws-memo="([^"]+)"/.exec(c.innerHTML);
    if (!m) return null;
    const expect = /data-ws-memo="([^"]+)"/.exec(sel);
    return m[1] === (expect && expect[1]) ? { dataset: { wsMemo: m[1] } } : null;
  };
  return c;
}

/** 计数 buildFn：写内容（含标记）+ 置 firstElementChild（模拟 DOM 有真实产物） */
function makeBuild(box) {
  return () => {
    box.count += 1;
    box.container.innerHTML = `<div class="card" data-ws-memo="x">内容 v${box.count}</div>`;
    box.container.firstElementChild = { tagName: 'DIV' };
  };
}

test('① 数据键未变两次 memoizeRender：buildFn 仅执行 1 次且 container 内容未被覆盖（同 innerHTML）', () => {
  const box = { container: makeContainer(), count: 0 };
  const build = makeBuild(box);
  const key = 'day=2026-09-07|todo=0|member=1';

  const r1 = memoizeRender(box.container, key, build);
  assert.equal(r1, true, '首次未命中 → 重建并记键');
  assert.equal(box.count, 1, '首次 buildFn 执行 1 次');
  const htmlAfterFirst = box.container.innerHTML;
  assert.ok(htmlAfterFirst.includes('内容 v1'), '首次已写入内容');

  const r2 = memoizeRender(box.container, key, build);
  assert.equal(r2, false, '键未变且内容在 → 命中跳过重建');
  assert.equal(box.count, 1, '第二次同键：buildFn 不重复执行');
  assert.strictEqual(box.container.innerHTML, htmlAfterFirst, '命中时内容未被覆盖（同 innerHTML 引用）');
  assert.equal(box.container.dataset.memoKey, key, 'memoKey 已记录');
  assert.ok(box.container.firstElementChild, '现 DOM 保留（firstElementChild 仍存在 → 折叠/选中状态不丢）');
});

test('② 数据键变化两次 memoizeRender：buildFn 共 2 次且内容更新', () => {
  const box = { container: makeContainer(), count: 0 };
  const build = makeBuild(box);

  const key1 = 'day=2026-09-07|todo=0|member=1';
  memoizeRender(box.container, key1, build);
  assert.equal(box.count, 1);
  const oldHtml = box.container.innerHTML;

  const key2 = 'day=2026-09-07|todo=1|member=1'; // 数据变化（todo 写版本 +1）
  const r2 = memoizeRender(box.container, key2, build);
  assert.equal(r2, true, '键变化 → 重建');
  assert.equal(box.count, 2, 'buildFn 第 2 次执行（数据变化后重建回默认）');
  assert.notStrictEqual(box.container.innerHTML, oldHtml, '内容随新键更新');
  assert.ok(box.container.innerHTML.includes('内容 v2'), '重建内容为最新数据产物');
  assert.equal(box.container.dataset.memoKey, key2, 'memoKey 更新为新键');
});

test('③ 内容被外部清空（firstElementChild null）后同键再调 → 重建', () => {
  const box = { container: makeContainer(), count: 0 };
  const build = makeBuild(box);
  const key = 'day=2026-09-07|todo=0|member=1';

  memoizeRender(box.container, key, build);
  assert.equal(box.count, 1);

  // 外部清空内容（如宿主重建/异方渲染覆盖为空）：firstElementChild 丢失
  box.container.firstElementChild = null;
  box.container.innerHTML = '';

  const r2 = memoizeRender(box.container, key, build);
  assert.equal(r2, true, '内容已空 → 同键也须重建（不命中空容器）');
  assert.equal(box.count, 2, '清空后同键再调：buildFn 重新执行');
  assert.ok(box.container.firstElementChild, '重建后现 DOM 有内容');
});

test('④ marker：dataset.memoKey 残留但内容被异方整体替换（标记消失）→ 同键仍重建，防跨 tab 错留旧内容', () => {
  // 场景：工作台内容容器被其它 tab 渲染整体替换 innerHTML，本卡 dataset.memoKey 残留。
  const box = { container: makeContainer(), count: 0 };
  const build = () => {
    box.count += 1;
    box.container.innerHTML = '<div class="space-y-4" data-ws-memo="today">今天内容</div>';
    box.container.firstElementChild = { tagName: 'DIV' };
  };
  const key = 'today-key-v1';

  const r1 = memoizeRender(box.container, key, build, { marker: '[data-ws-memo="today"]' });
  assert.equal(r1, true, '首次重建');
  assert.equal(box.count, 1);

  const r2 = memoizeRender(box.container, key, build, { marker: '[data-ws-memo="today"]' });
  assert.equal(r2, false, '键同 + 标记在 → 命中跳过');
  assert.equal(box.count, 1);

  // 异方整体替换内容（如切到待办 tab）：dataset.memoKey 残留、标记消失
  box.container.innerHTML = '<div>另一 tab 的内容（无 today 标记）</div>';
  box.container.firstElementChild = { tagName: 'DIV' };

  const r3 = memoizeRender(box.container, key, build, { marker: '[data-ws-memo="today"]' });
  assert.equal(r3, true, '标记缺失 → 同键也强制重建（绝不把别的 tab 内容当成本卡命中）');
  assert.equal(box.count, 2, '重建回本卡真实内容');
  assert.ok(box.container.innerHTML.includes('data-ws-memo="today"'), '重建内容含本卡标记');
});

test('⑤ calendar 视图缓存：同月同视图同数据仅 1 次网格重建；切月/切视图/数据变化重建', () => {
  const grid = { dataset: {}, firstElementChild: null, innerHTML: '' };
  const activities = [
    { id: 'a1', title: '党员大会', date: '2026-09-01', archived: false, status: 'published' },
    { id: 'a2', title: '党课', date: '2026-09-05', archived: false, status: 'published' },
  ];
  const tasks = [{ id: 't1', title: '布置会场', date: '2026-09-01', activityId: null, status: 'pending', executor: 'org' }];
  const state = { calendarView: 'month', selectedDate: null, selectedActivityId: null, viewType: 'manager', managementRole: 'secretary' };

  /** 模拟一次渲染流程：需重建才计入 build 次数（与 calendar.js 渲染入口同判定+同标记） */
  let builds = 0;
  const renderOnce = (st, month, acts, tks) => {
    const key = calendarMemoKey(st, month, acts, tks);
    if (!calendarGridNeedsRebuild(grid, key)) return 0; // 命中：跳过
    builds += 1;
    grid.dataset.memoKey = key;
    grid.firstElementChild = { tagName: 'DIV' };
    grid.innerHTML = `<div>${month} ${st.calendarView}</div>`;
    return 1;
  };

  // ① 同月同视图同数据：仅 1 次网格构建（第二次调用命中缓存）
  assert.equal(renderOnce(state, '2026-09', activities, tasks), 1, '首次构建');
  assert.equal(builds, 1);
  assert.equal(renderOnce(state, '2026-09', activities, tasks), 0, '同键命中：不再构建');
  assert.equal(builds, 1, '同月同视图同数据仅 1 次网格构建（计数）');

  // ② 切月（2026-10）：重建
  assert.equal(renderOnce({ ...state, calendarView: 'month' }, '2026-10', activities, tasks), 1, '切月重建');
  assert.equal(builds, 2);

  // ③ 切视图（week）：重建（视图参数变）
  assert.equal(renderOnce({ ...state, calendarView: 'week', selectedDate: '2026-09-01' }, '2026-09', activities, tasks), 1, '切视图重建');
  assert.equal(builds, 3);

  // ④ 数据变化（新增活动）：重建
  const moreActs = [...activities, { id: 'a3', title: '主题党日', date: '2026-09-10', archived: false, status: 'published' }];
  assert.equal(renderOnce({ ...state, calendarView: 'week', selectedDate: '2026-09-01' }, '2026-09', moreActs, tasks), 1, '活动数据变化重建');
  assert.equal(builds, 4);

  // ⑤ 任务内容变化（updateTask 类：同 id 状态翻转为 done——task 写口无 token、长度不变 → 内容签名兜底）
  const doneTasks = [{ ...tasks[0], status: 'done' }];
  assert.equal(renderOnce({ ...state, calendarView: 'week', selectedDate: '2026-09-01' }, '2026-09', moreActs, doneTasks), 1, '任务内容变化重建（签名兜底）');
  assert.equal(builds, 5);

  // ⑥ 数据未变再调：稳定跳过
  assert.equal(renderOnce({ ...state, calendarView: 'week', selectedDate: '2026-09-01' }, '2026-09', moreActs, doneTasks), 0, '数据未变命中');
  assert.equal(builds, 5, '计数不再增长');

  // ⑦ key 覆盖视图参数抽查：不同 view/月/数据 → key 串不同（防误命中）
  const kMonth = calendarMemoKey(state, '2026-09', activities, tasks);
  const kMonth2 = calendarMemoKey(state, '2026-10', activities, tasks);
  const kWeek = calendarMemoKey({ ...state, calendarView: 'week' }, '2026-09', activities, tasks);
  const kData = calendarMemoKey(state, '2026-09', moreActs, tasks);
  assert.notEqual(kMonth2, kMonth, '切月键变');
  assert.notEqual(kWeek, kMonth, '切视图键变');
  assert.notEqual(kData, kMonth, '活动数据变键变');
});
