// role: [工程师]+[AI]
// perf-guard.test.mjs — 守卫归并件（2026-10-27 批次 516 · B-515-2）
// 归并来源：perf-render-guard.test.mjs · perf-todo-agg-cache.test.mjs · perf-version-token.test.mjs · perf-index-equivalence.test.mjs
// 纪律：只减文件数、不减断言数。每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息仍保留各源件的横幅与断言名，便于定位。
// 运行：node --test server/test/perf-guard.test.mjs

// ═══ 源件 1：perf-render-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { memoizeRender } = await import('../../docs/src/components/ui/memoize-render.js?v=20261026b');
  const { calendarMemoKey, calendarGridNeedsRebuild } = await import('../../docs/src/components/record/calendar.js?v=20261026b');

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

})();

// ═══ 源件 2：perf-todo-agg-cache.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261026b');
  const { MockAdapter } = await import('../../docs/src/data/mock-adapter.js?v=20261026b');
  const { setDataSource } = await import('../../docs/src/data/data-adapter.js?v=20261026b');
  const { TodoStore, TodoCategory, TodoStatus, WORK_DOMAIN } = await import('../../docs/src/services/governance/todo.js?v=20261026b');

  // role: [工程师]+[AI]
  // server/test/perf-todo-agg-cache.test.mjs — P0 提速批护栏：TodoStore 聚合级 memo 失效正确性（2026-09-07）
  // 依据：.trae/specs/2026-09-07-perf/spec.md §二.1/§五（一致性护栏：写→读必须变化、未写→复用）
  // 覆盖（member-persist 桩做法；seed 用 TodoStore.create 构造记录）：
  //   ① 未写时连续两次 getDomainsWithGroups：结果一致（同引用）且内部聚合只执行一次
  //     （TodoStore._aggCacheStats.aggregateRuns 计数不变）
  //   ② create 后：结果变化（新引用、计数 +1）且聚合重算
  //   ③ complete 后：结果变化（计数 +1）
  //   ④ refreshExpiredStatus 实际变更后：结果变化（计数 +1，组内条目 status → expired）
  //   ⑤ mergeRealtimeDomains 消费同轮 getDomainsWithGroups 缓存（不额外全扫）且不污染共享缓存
  // 运行：node --test test/perf-todo-agg-cache.test.mjs（server 目录）
  
  
  
  
  
  
  
  
  // ── localStorage 内存桩（member-persist 同款）─────────────────────
  const _store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
    setItem: (k, v) => _store.set(String(k), String(v)),
    removeItem: (k) => { _store.delete(String(k)); },
    clear: () => { _store.clear(); },
    key: (i) => [..._store.keys()][i] ?? null,
    get length() { return _store.size; },
  };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  
  /** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（与 loadDB 首启语义一致） */
  function beginMockCase() {
    _store.clear();
    delete globalThis.window;
    for (const k of [
      'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
      'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
      'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
      'appointmentRecords', 'reviewRequests', 'archiveRecords',
    ]) {
      mockDB[k] = [];
    }
    mockDB.branches = [];
    mockDB._loaded = false;
    setDataSource('mock'); // 数据源复位
    MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches（todos 留空直插）
  }
  
  /** 造一条 secretary 待办（默认 track/pending；显式 domain 保留） */
  function mk(partial) {
    return TodoStore.create({
      role: 'secretary',
      category: TodoCategory.TRACK,
      priority: 'normal',
      status: TodoStatus.PENDING,
      ...partial,
    });
  }
  
  /** 读累计聚合执行次数（TodoStore._aggCacheStats：缓存未命中才 +1） */
  function runs() {
    return TodoStore._aggCacheStats.aggregateRuns;
  }
  
  test('① 未写时连续两次 getDomainsWithGroups：结果一致（同引用）且内部聚合只执行一次', () => {
    beginMockCase();
    mk({ id: 'ag-1', domain: WORK_DOMAIN.PROJECT, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
    mk({ id: 'ag-2', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '考勤待录入', deadline: '2099-08-01' });
  
    const r0 = runs();
    const v1 = TodoStore.getDomainsWithGroups('secretary');
    const afterFirst = runs();
    assert.equal(afterFirst, r0 + 1, '首次调用聚合执行 1 次');
  
    const v2 = TodoStore.getDomainsWithGroups('secretary');
    assert.equal(runs(), afterFirst, '未写时第二次调用命中缓存：内部聚合不重复执行');
    assert.strictEqual(v2, v1, '未写时返回同一缓存引用（只读契约，调用方仅读）');
    assert.deepEqual(v2.map(d => d.domain), ['project', 'attendance'], '域序/内容一致');
  
    // 其它角色/其它聚合方法同样缓存（未写 → 计数不涨）
    assert.deepEqual(TodoStore.getDomainsWithGroups('prop-commissioner'), [], '空角色域视图');
    assert.equal(TodoStore.getDomainsWithGroups('prop-commissioner').length, 0, '再次命中不重算');
    assert.equal(runs(), afterFirst + 1, 'prop 角色首次调用 +1 后即缓存');
  });
  
  test('② create 后：getDomainsWithGroups 结果变化（新引用、计数 +1）', () => {
    beginMockCase();
    mk({ id: 'ag-10', domain: WORK_DOMAIN.PROJECT, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
    const v1 = TodoStore.getDomainsWithGroups('secretary');
    const runs1 = runs();
    assert.equal(v1[0].count, 1, '初始 1 条');
  
    mk({ id: 'ag-11', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '考勤待录入', deadline: '2099-08-01' });
    assert.equal(runs(), runs1, '写口本身不触发聚合');
  
    const v2 = TodoStore.getDomainsWithGroups('secretary');
    assert.equal(runs(), runs1 + 1, 'create 后重算（计数 +1）');
    assert.notStrictEqual(v2, v1, 'create 后结果为新引用');
    assert.equal(v2.length, 2, '新域出现（meeting + attendance）');
    assert.equal(v2.reduce((s, d) => s + d.count, 0), 2, '总条数随 create 增长');
  });
  
  test('③ complete 后：getDomainsWithGroups 结果变化（计数 +1，完成态排除）', () => {
    beginMockCase();
    mk({ id: 'ag-20', domain: WORK_DOMAIN.PROJECT, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
    const v1 = TodoStore.getDomainsWithGroups('secretary');
    const runs1 = runs();
    assert.equal(v1[0].count, 1);
  
    TodoStore.complete('ag-20'); // 写口 → 版本 +1（缓存应失效）
    assert.equal(runs(), runs1, '写口本身不触发聚合');
  
    const v2 = TodoStore.getDomainsWithGroups('secretary');
    assert.equal(runs(), runs1 + 1, 'complete 后重算（计数 +1）');
    assert.notStrictEqual(v2, v1, 'complete 后结果为新引用');
    assert.deepEqual(v2, [], '完成态待办被排除 → 域视图为空');
  });
  
  test('④ refreshExpiredStatus 实际变更后：结果变化（计数 +1，条目转 expired）', () => {
    beginMockCase();
    // 批次 500（B-499-3）：无会话不再写任何行 ⇒ 本用例以 secretary 会话执行，锁定「只写本人/本角色」。
    globalThis.localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId: '2400012347', role: 'secretary' }));
    // 远期正常待办 + 过期待办（pending、deadline 早于今日 → refresh 会置为 expired）
    mk({ id: 'ag-30', domain: WORK_DOMAIN.PROJECT, actionKey: 'participate', title: '参加党员大会', deadline: '2099-06-01' });
    const expiredId = mk({ id: 'ag-31', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-remind', title: '过期考勤待录入', deadline: '2000-01-01' }).id;
  
    const v1 = TodoStore.getDomainsWithGroups('secretary');
    const runs1 = runs();
    const att1 = v1.find(d => d.domain === 'attendance');
    const item1 = att1.groups[0].items.find(t => t.id === expiredId);
    assert.equal(item1.status, 'pending', 'refresh 前过期待办仍 pending');
  
    const refreshed = TodoStore.refreshExpiredStatus();
    assert.equal(refreshed.find(t => t.id === expiredId).status, 'expired', 'refresh 实际写入 expired');
    assert.equal(runs(), runs1, 'refresh 写口本身不触发聚合');
  
    const v2 = TodoStore.getDomainsWithGroups('secretary');
    assert.equal(runs(), runs1 + 1, 'refresh 实际变更后重算（计数 +1）');
    assert.notStrictEqual(v2, v1, 'refresh 后结果为新引用');
    const att2 = v2.find(d => d.domain === 'attendance');
    assert.equal(att2.expiredCount, 1, 'refresh 后域级逾期数正确');
    const item2 = att2.groups[0].items.find(t => t.id === expiredId);
    assert.equal(item2.status, 'expired', 'refresh 后组内条目 status=expired（缓存已正确失效重算）');
  });
  
  test('⑤ mergeRealtimeDomains 消费同轮缓存基准且不污染共享缓存；未写再次调用同引用', () => {
    beginMockCase();
    mk({ id: 'ag-40', domain: WORK_DOMAIN.ATTENDANCE, actionKey: 'attendance-confirm', title: '考勤待复核', deadline: '2099-09-01' });
  
    const base = TodoStore.getDomainsWithGroups('secretary'); // 基准全扫 1 次
    const runs1 = runs();
    const merged = TodoStore.mergeRealtimeDomains('secretary', []);
    assert.equal(runs(), runs1 + 1, 'merge 空实时组：仅 merge 自身 1 次（基准走缓存，不重复全扫）');
  
    // 并入实时组（member-dev 新增域 + attendance 域内追加）
    const realtime = [
      { groupKey: 'secretary:member-confirm', actionKey: 'member-confirm', domain: WORK_DOMAIN.MEMBER_DEV, title: '成员变更待确认', count: 2, items: [{ id: 'mc1' }, { id: 'mc2' }] },
      { groupKey: 'secretary:attendance-remind', actionKey: 'attendance-remind', domain: WORK_DOMAIN.ATTENDANCE, title: '考勤待录入', count: 1, items: [{ id: 'ar1', deadline: '2099-05-01' }] },
    ];
    const runs2 = runs();
    const mergedRt = TodoStore.mergeRealtimeDomains('secretary', realtime);
    assert.equal(runs(), runs2 + 1, '并入实时组：merge 重算（基准仍命中缓存）');
    assert.deepEqual(mergedRt.map(d => d.domain), ['attendance', 'member-dev'], '实时组新增域并入');
  
    // 共享缓存基准未被 merge 污染：getDomainsWithGroups 仍返回原纯持久化视图（同引用）
    const baseAfter = TodoStore.getDomainsWithGroups('secretary');
    assert.strictEqual(baseAfter, base, 'merge 在克隆基准上并入，不污染 getDomainsWithGroups 共享缓存');
    assert.deepEqual(baseAfter.map(d => d.domain), ['attendance'], '共享基准仍只有持久化域');
  
    // 未写再次调用 merge（同实时组）→ 同引用缓存命中
    const mergedAgain = TodoStore.mergeRealtimeDomains('secretary', realtime);
    assert.strictEqual(mergedAgain, mergedRt, '未写时 merge 命中缓存（同引用）');
  });

})();

// ═══ 源件 3：perf-version-token.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261026b');
  const { MockAdapter } = await import('../../docs/src/data/mock-adapter.js?v=20261026b');
  const { setDataSource } = await import('../../docs/src/data/data-adapter.js?v=20261026b');
  const { bumpToken, tokenOf, resetAllTokens } = await import('../../docs/src/core/base/version-token.js?v=20261026b');
  const { saveAttendanceRecords, loadAttendanceRecords } = await import('../../docs/src/services/activity/attendance.js?v=20261026b');
  const { saveInspectionRecords, loadInspectionRecords } = await import('../../docs/src/services/activity/inspection.js?v=20261026b');
  const { addActivityReview } = await import('../../docs/src/services/governance/review.js?v=20261026b');
  const { TaskForceRecordStore } = await import('../../docs/src/services/activity/taskforce.js?v=20261026b');
  const { SignupStore } = await import('../../docs/src/services/activity/signup.js?v=20261026b');
  const { saveFollowups } = await import('../../docs/src/services/governance/resolution-followup.js?v=20261026b');
  const { SecretaryOverviewStore, SecretaryTodoDeriver } = await import('../../docs/src/services/governance/secretary-overview.js?v=20261026b');

  // role: [工程师]+[AI]
  // server/test/perf-version-token.test.mjs — P0 提速批护栏：域写版本戳 bump 正确性（2026-09-07）
  // 依据：.trae/specs/2026-09-07-perf/spec.md §二.3/§五（version-token 域缓存：各域写口至少一条
  // 「写 → tokenOf 递增 / 聚合读数变化；未写 → tokenOf 不变」+ resetAllTokens 生效）
  // 覆盖（member-persist 桩做法）：
  //   attendance / inspection / activityReview / taskforce / resolution / signup
  //   每域：① 未写时连续 tokenOf 读数不变；② 走 service 写口后 tokenOf 递增；
  //   ③ resetAllTokens 清空后全部归零、可重新 bump。
  // 运行：node --test test/perf-version-token.test.mjs（server 目录）
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  // ── localStorage 内存桩（member-persist 同款）─────────────────────
  const _store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
    setItem: (k, v) => _store.set(String(k), String(v)),
    removeItem: (k) => { _store.delete(String(k)); },
    clear: () => { _store.clear(); },
    key: (i) => [..._store.keys()][i] ?? null,
    get length() { return _store.size; },
  };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  
  /** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（与 loadDB 首启语义一致） */
  function beginMockCase() {
    _store.clear();
    delete globalThis.window;
    for (const k of [
      'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
      'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
      'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
      'appointmentRecords', 'reviewRequests', 'archiveRecords',
    ]) {
      mockDB[k] = [];
    }
    mockDB.branches = [];
    mockDB._loaded = false;
    setDataSource('mock'); // 数据源复位
    MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches（todos 留空直插）
  }
  
  test('① attendance：未写 tokenOf 不变；saveAttendanceRecords 写口后递增', () => {
    beginMockCase();
    const b1 = tokenOf('attendance');
    assert.equal(tokenOf('attendance'), b1, '未写时读数不变');
    saveAttendanceRecords([...loadAttendanceRecords().slice(0, 1), {
      id: 'att-p0', activityId: 'act-x', personId: '2400012345', status: 'present',
      recordedBy: 'u_disc', recordedAt: '2026-09-06T08:00:00.000Z',
    }]);
    assert.ok(tokenOf('attendance') > b1, '考勤写口 → attendance token 递增');
  });
  
  test('② inspection：未写 tokenOf 不变；saveInspectionRecords 写口后递增', () => {
    beginMockCase();
    const b1 = tokenOf('inspection');
    assert.equal(tokenOf('inspection'), b1, '未写时读数不变');
    saveInspectionRecords([...loadInspectionRecords().slice(0, 1), {
      id: 'ins-p0', sourceType: 'activity', activityId: 'act-x', personId: '2400012345',
      level: 'organize', role: '策划', recordedBy: 'u_disc', recordedAt: '2026-09-06T08:00:00.000Z', status: 'pending',
    }]);
    assert.ok(tokenOf('inspection') > b1, '考察写口 → inspection token 递增');
  });
  
  test('③ activityReview：未写 tokenOf 不变；addActivityReview 写口后递增', () => {
    beginMockCase();
    const b1 = tokenOf('activityReview');
    assert.equal(tokenOf('activityReview'), b1, '未写时读数不变');
    addActivityReview({
      id: 'rev-p0', activityId: 'act-x', organizerId: '2400012345', progress: '已完成',
      reviewStatus: '未提交', reviewContent: '', issues: [],
    });
    assert.ok(tokenOf('activityReview') > b1, '活动复盘写口 → activityReview token 递增');
  });
  
  test('④ taskforce：未写 tokenOf 不变；TaskForceRecordStore.add 写口后递增', () => {
    beginMockCase();
    TaskForceRecordStore._records = []; // 复位模块级内存态（loadDB 不播专班种子）
    const b1 = tokenOf('taskforce');
    assert.equal(tokenOf('taskforce'), b1, '未写时读数不变');
    TaskForceRecordStore.add({ id: 'tf-p0', name: 'P0 测试专班', task: '测试', status: 'recruiting', manager: '2400012355', initiator: '2400012355', members: [{ personId: '2400012345', role: 'participant' }] });
    assert.ok(tokenOf('taskforce') > b1, '专班写口 → taskforce token 递增');
  });
  
  test('⑤ resolution：未写 tokenOf 不变；saveFollowups 写口后递增（决议=活动 agenda 内嵌）', async () => {
    beginMockCase();
    mockDB.activities = [{
      id: 'act-p0', title: 'P0 测试支委会', date: '2026-09-06', status: 'published',
      agenda: [{ id: 'ag-p0', item: '通过 P0 议题', result: 'passed', followups: [] }],
    }];
    const b1 = tokenOf('resolution');
    assert.equal(tokenOf('resolution'), b1, '未写时读数不变');
    await saveFollowups({
      activityId: 'act-p0', agendaItemId: 'ag-p0', actorId: '2300010001',
      followups: [{ item: '落实 P0 议题', ownerType: 'role', ownerId: 'org-commissioner', deadline: '2099-12-31' }],
    });
    assert.ok(tokenOf('resolution') > b1, '决议跟进写口 → resolution token 递增');
  });
  
  test('⑥ signup：未写 tokenOf 不变；SignupStore.apply 写口后递增', () => {
    beginMockCase();
    mockDB.activities = [...mockDB.activities, {
      id: 'act-su-p0', title: 'P0 报名活动', date: '2099-03-01', status: 'published',
      scenarioId: 'theme-party', organizer: '2400012345', createdBy: '2400012345', assignments: [],
    }];
    mockDB.taskforces = [];
    TaskForceRecordStore._records = [];
    SignupStore._signups = [];
    SignupStore.init();
    const b1 = tokenOf('signup');
    assert.equal(tokenOf('signup'), b1, '未写时读数不变');
    const r = SignupStore.apply({ sourceType: 'activity', sourceId: 'act-su-p0', personId: '2400012347', role: 'organizer' });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(tokenOf('signup') > b1, '报名写口 → signup token 递增');
  });
  
  test('⑦ bumpToken 单调 + resetAllTokens 生效后全部归零、可重新 bump', () => {
    beginMockCase();
    const keys = ['attendance', 'activity', 'inspection', 'activityReview', 'archiveRecord',
      'taskforce', 'resolution', 'signup', 'handoff', 'memberConfirmation', 'notice', 'member', 'todo'];
    // 单调递增（同文件前例已 bump 过 → 相对基线 +2 断言，勿假定从 0 起）
    const base = tokenOf('attendance');
    bumpToken('attendance');
    bumpToken('attendance');
    assert.equal(tokenOf('attendance'), base + 2, '同域多次 bump 单调递增');
    // resetAllTokens：全部归零
    resetAllTokens();
    for (const k of keys) {
      assert.equal(tokenOf(k), 0, `resetAllTokens 后 ${k} 归零`);
    }
    // 归零后可重新 bump（缓存重算通路可用）
    bumpToken('attendance');
    assert.equal(tokenOf('attendance'), 1, 'reset 后可重新 bump');
  });
  
  test('⑧ 聚合入口复合键缓存：未写同引用；attendance 写口后重算（computeAggregates / getOverview）', () => {
    beginMockCase();
    // 预热：getOverview 首次计算会触发 NoticeStore.init 等惰性副作用（可能 bump notice token）——
    // 应用启动期已落定，预热一次后再断言缓存同引用
    SecretaryOverviewStore.getOverview();
    SecretaryTodoDeriver.computeAggregates();
    const a1 = SecretaryTodoDeriver.computeAggregates();
    const o1 = SecretaryOverviewStore.getOverview();
    assert.strictEqual(SecretaryTodoDeriver.computeAggregates(), a1, 'computeAggregates 未写命中同引用（只读契约）');
    assert.strictEqual(SecretaryOverviewStore.getOverview(), o1, 'getOverview 未写命中同引用（只读契约）');
    // 写口（attendance）→ token 递增 → 复合键变 → 重算（新引用）
    saveAttendanceRecords([...loadAttendanceRecords(), {
      id: 'att-2400012352', activityId: 'act-zz', personId: '2400012345', status: 'present',
      recordedBy: 'u_disc', recordedAt: '2026-09-06T08:00:00.000Z',
    }]);
    assert.ok(tokenOf('attendance') > 0, 'attendance 写口已 bump');
    assert.notStrictEqual(SecretaryTodoDeriver.computeAggregates(), a1, 'attendance 写口后 computeAggregates 重算（新引用）');
    assert.notStrictEqual(SecretaryOverviewStore.getOverview(), o1, 'attendance 写口后 getOverview 重算（新引用）');
  });

})();

// ═══ 源件 4：perf-index-equivalence.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { mockDB } = await import('../../docs/src/core/domain/domain.js?v=20261026b');
  const { MockAdapter } = await import('../../docs/src/data/mock-adapter.js?v=20261026b');
  const { setDataSource } = await import('../../docs/src/data/data-adapter.js?v=20261026b');
  const { buildCalendarDayIndex } = await import('../../docs/src/components/record/calendar.js?v=20261026b');
  const { SecretaryTodoDeriver } = await import('../../docs/src/services/governance/secretary-overview.js?v=20261026b');
  const { buildApprovedSignupIndex, approvedSignupHit } = await import('../../docs/src/services/governance/today-summary.js?v=20261026b');
  const { TodoStatus, isTodoExpired } = await import('../../docs/src/services/governance/todo.js?v=20261026b');
  const { today: todayLocal } = await import('../services/reporting.js');

  // role: [工程师]+[AI]
  // server/test/perf-index-equivalence.test.mjs — P1 索引降复杂度·等价断言（2026-09-07）
  // 依据：.trae/specs/2026-09-07-perf/spec.md §三（P1 索引降复杂度）与 §五（等价测试）
  // 目的：P1 各「预建 Map/分组查表」改造与改造前逐格扫描 / 逐条 .some 输出严格等价——
  //   ① calendar 日索引（buildCalendarDayIndex）：分组输出 == 逐格扫描（同 data 同结果集合+保序）
  //   ② 考勤缺口 Map（SecretaryTodoDeriver._aggAttendanceRemind）：缺口活动序 == 旧嵌套
  //      activities.filter(结束>3 天).filter(!attendances.some(...)) 对偶实现
  //   ③ signup 索引（buildApprovedSignupIndex + approvedSignupHit）与旧 .some 判定等价
  //      （边界：pending / taskforce 源 / 重复行 / 源 id 缺失 / null 行）
  //   ④ isTodoExpired（todo.js 收敛单一实现）与旧四处判定等价（构造 expired/到期当天/未来/
  //      完成/进行中/无 deadline/无 status 实时条目样例）
  // 运行：node --test test/perf-index-equivalence.test.mjs（server 目录）
  
  
  
  
  
  
  // 日历日索引纯分组 helper（calendar.js 现为 node 可导：resize 监听已 typeof 守卫）
  
  
  
  
  // R-26③（2026-10-05 批次 388）：与生产同口径＝**本地**「今天」（服务端单一源）
  
  
  // ── localStorage 内存桩（member-persist 同款）─────────────────────
  const _store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
    setItem: (k, v) => _store.set(String(k), String(v)),
    removeItem: (k) => { _store.delete(String(k)); },
    clear: () => { _store.clear(); },
    key: (i) => [..._store.keys()][i] ?? null,
    get length() { return _store.size; },
  };
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  
  /** 每例独立现场：重置 mockDB 业务域 + 清存储 + 恢复 seed（与 loadDB 首启语义一致） */
  function beginMockCase() {
    _store.clear();
    delete globalThis.window;
    for (const k of [
      'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
      'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
      'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
      'appointmentRecords', 'reviewRequests', 'archiveRecords',
    ]) {
      mockDB[k] = [];
    }
    mockDB.branches = [];
    mockDB._loaded = false;
    setDataSource('mock'); // 数据源复位
    MockAdapter.loadDB(); // seed：activities/tasks/assignments/archiveRecords/signups/branches
  }
  
  // ═══════════════ ① calendar 日索引 ≡ 逐格扫描 ═══════════════
  
  test('① calendar 日索引：acts / viaTasksByDate 分组输出与逐格扫描同集合同序', () => {
    // 构造混合数据：带 date/不带 date 活动；带 date 任务 / 无 date 任务（引用现存活动/引用不存在
    // 活动 / 引用已归档活动 id）/ 双字段任务 / 空字段任务
    const activities = [
      { id: 'a1', title: '大会', date: '2026-09-01' },
      { id: 'a2', title: '党课', date: '2026-09-01' },
      { id: 'a3', title: '党小组会', date: '2026-09-03' },
      { id: 'a4', title: '无日期活动', date: null },      // 无 date 不入桶（与 filter(a.date===k) 一致）
      { id: 'a5', title: '已归档', date: '2026-09-04', archived: true }, // 调用方已滤 archived——测试主动集含它验证 id 匹配
      { id: 'a6', title: '空串日期', date: '' },          // 空串不入桶
    ];
    // 调用方语义 = 非归档（render 各视图传 activeActivities）
    const activeActivities = activities.filter(a => !a.archived);
    const tasks = [
      { id: 't1', title: '直排 09-01', date: '2026-09-01' },
      { id: 't2', title: '经活动归日', activityId: 'a2' },             // → 09-01
      { id: 't3', title: '经活动归日', activityId: 'a3' },             // → 09-03
      { id: 't4', title: '引用无日期活动', activityId: 'a4' },         // 无日期活动 → 不入任何桶
      { id: 't5', title: '引用已归档', activityId: 'a5' },             // 不在 activeActivities → 不入桶
      { id: 't6', title: '引用不存在活动', activityId: 'ghost' },      // 不入桶
      { id: 't7', title: '双字段任务', date: '2026-09-02', activityId: 'a1' }, // 有 date → 只算直排，不算 via
      { id: 't8', title: '直排 09-03', date: '2026-09-03' },
      { id: 't9', title: '无字段', date: '', activityId: null },
    ];
  
    const { acts, viaTasksByDate } = buildCalendarDayIndex(activeActivities, tasks);
  
    // ①a 全活动日期键集合一致（含无活动日不存在键）
    const expectedDates = [...new Set(activeActivities.filter(a => typeof a.date === 'string' && a.date).map(a => a.date))];
    assert.deepEqual([...acts.keys()].sort(), [...expectedDates].sort(), 'acts 键 = 有 date 活动的去重日期集');
  
    // ①b 逐格扫描对照：每日 acts == activeActivities.filter(a.date === k)（保序同集合）
    const queryDates = [...new Set([...expectedDates, '2026-09-02', '2026-09-05'])];
    for (const k of queryDates) {
      const grouped = (acts.get(k) || []).map(a => a.id);
      const scanned = activeActivities.filter(a => a.date === k).map(a => a.id);
      assert.deepEqual(grouped, scanned, `acts[${k}] 与逐格 filter 一致`);
    }
  
    // ①c via 任务逐格对照：viaTasksByDate[k] == tasks.filter(!t.date && activityId ∈ 当日活动 id 集)
    for (const k of queryDates) {
      const dayActIds = new Set(activeActivities.filter(a => a.date === k).map(a => a.id));
      const scanned = tasks.filter(t => !t.date && t.activityId && dayActIds.has(t.activityId)).map(t => t.id);
      const grouped = (viaTasksByDate.get(k) || []).map(t => t.id);
      assert.deepEqual(grouped, scanned, `viaTasks[${k}] 与逐格 filter 一致`);
    }
  
    // ①d 具体语义抽查：t2→09-01、t3→09-03；t5/t6/t4/t9 不入桶；t7 不入 via
    assert.deepEqual(viaTasksByDate.get('2026-09-01').map(t => t.id), ['t2']);
    assert.deepEqual(viaTasksByDate.get('2026-09-03').map(t => t.id), ['t3']);
    assert.ok(!viaTasksByDate.has('2026-09-04'), '引用已归档活动的任务不入桶（当日无 active 活动）');
    assert.deepEqual(acts.get('2026-09-01').map(a => a.id), ['a1', 'a2'], '同日多活动保序');
  });
  
  // ═══════════════ ② 考勤缺口 Map ≡ 旧嵌套对偶 ═══════════════
  
  test('② 考勤缺口（_aggAttendanceRemind Map 化）：缺口活动序与旧嵌套对偶实现一致', () => {
    beginMockCase();
    // 受控数据：全部替换（活动须为非空数组——loadActivities 空表回退静态种子，故必填自定义）
    const activities = [
      { id: 'g1', title: '结束未录-旧', date: '2000-01-01', status: 'completed' },   // >3 天且无记录 → 缺口
      { id: 'g2', title: '结束已录', date: '2000-01-02', status: 'completed' },      // 有记录 → 排除
      { id: 'g3', title: '归档未录', date: '2000-01-03', archived: true },           // >3 天且无记录 → 缺口
      { id: 'g4', title: '进行中', date: '2000-01-04', status: 'published' },        // 非结束态 → 排除
      { id: 'g5', title: '无日期结束', date: null, status: 'completed' },            // 无 date → 排除
      { id: 'g6', title: '结束未录-新', date: '2000-01-05', archived: true },        // → 缺口（隔在 g5 后验序）
    ];
    mockDB.activities = activities;
    mockDB.attendances = [
      { id: 'r1', activityId: 'g2', personId: '2400012345', status: 'present' },
      { id: 'r2', activityId: 'g2', personId: '2400012346', status: 'absent' },   // g2 已录（任意状态都算"已录"）→ 排除
    ];
  
    // 旧嵌套对偶实现（改造前逻辑逐字）
    const today = todayLocal();
    const daysBetween = (from, to) => Math.floor((new Date(to) - new Date(from)) / (24 * 60 * 60 * 1000));
    const refGapIds = activities
      .filter(a => (a.status === 'completed' || a.archived) && a.date)
      .filter(a => daysBetween(a.date, today) > 3)
      .filter(a => !mockDB.attendances.some(r => r.activityId === a.id))
      .map(a => a.id);
    assert.deepEqual(refGapIds, ['g1', 'g3', 'g6'], '参照实现自身合理性（g2/g1 有记录排除、g4/g5 非候选）');
  
    const groups = SecretaryTodoDeriver._aggAttendanceRemind();
    assert.equal(groups.length, 1, '提醒组仅一组');
    const group = groups[0];
    assert.equal(group.actionKey, 'attendance-remind');
    assert.deepEqual(group.items.map(it => it.activityId), refGapIds,
      'Map 查表缺口活动序 == 旧 attendances.some 嵌套');
    assert.equal(group.count, refGapIds.length);
  });
  
  // ═══════════════ ③ signup 索引 ≡ 旧 .some 判定 ═══════════════
  
  test('③ 报名索引（buildApprovedSignupIndex/approvedSignupHit）：与旧 _approvedSignup .some 全表判定等价', () => {
    // 旧判定对偶（today-summary 改造前逐字）
    const oldApproved = (signups, activityId, personId) =>
      (signups || []).some(s =>
        s && s.sourceType === 'activity' && s.sourceId === activityId &&
        s.personId === personId && s.status === 'approved'
      );
  
    const signups = [
      { id: 's1', sourceType: 'activity', sourceId: 'act-1', personId: '2400012345', status: 'approved' },
      { id: 's2', sourceType: 'activity', sourceId: 'act-1', personId: '2400012346', status: 'approved' },
      { id: 's3', sourceType: 'activity', sourceId: 'act-1', personId: '2400012347', status: 'pending' },   // pending 不计
      { id: 's4', sourceType: 'activity', sourceId: 'act-2', personId: '2400012345', status: 'approved' },
      { id: 's5', sourceType: 'taskforce', sourceId: 'act-1', personId: '2400012345', status: 'approved' }, // 异源同 id → 不得误命中
      { id: 's6', sourceType: 'activity', sourceId: 'act-3', personId: '2400012346', status: 'approved' },
      { id: 's7', sourceType: 'activity', sourceId: 'act-1', personId: '2400012345', status: 'approved' },  // 同人重复行
      null,                                                                                          // 脏行（旧 .some 跳过）
      { id: 's8', sourceType: 'activity', sourceId: 'act-x', personId: '2400012353', status: 'approved' },
      { id: 's9', sourceType: 'activity', sourceId: null, personId: '2400012345', status: 'approved' },     // 源 id 缺失
    ];
  
    const index = buildApprovedSignupIndex(signups);
    const queryActs = ['act-1', 'act-2', 'act-3', 'act-x', 'act-missing', null, undefined];
    const queryPersons = ['2400012345', '2400012346', '2400012347', '2400012353', 'nobody', null, undefined];
    for (const actId of queryActs) {
      for (const pid of queryPersons) {
        assert.equal(
          approvedSignupHit(index, actId, pid),
          oldApproved(signups, actId, pid),
          `(sourceId=${String(actId)}, person=${String(pid)}) 索引命中 == 旧 .some`
        );
      }
    }
    // 抽样显式断言：命中与反例
    assert.equal(approvedSignupHit(index, 'act-1', '2400012345'), true, 'approved 同人命中');
    assert.equal(approvedSignupHit(index, 'act-1', '2400012347'), false, 'pending 不计');
    assert.equal(approvedSignupHit(index, 'act-1', 'nobody'), false);
    assert.equal(approvedSignupHit(index, 'act-missing', '2400012345'), false, '无报名活动 miss');
    // 空表/缺省入参
    assert.equal(approvedSignupHit(buildApprovedSignupIndex([]), 'act-1', '2400012345'), false);
    assert.equal(approvedSignupHit(buildApprovedSignupIndex(null), 'act-1', '2400012345'), false);
  });
  
  // ═══════════════ ④ isTodoExpired ≡ 旧四处判定 ═══════════════
  
  test('④ isTodoExpired：与旧四处判定等价（过期/到期当天/未来/完成/进行中/无 deadline/无 status 实时条目）', () => {
    const today = '2026-09-10';
    // 旧实现对偶 A（todo.js _isTodoExpired / todo-list.js 渲染层）：expired 显式真；非 pending 假
    const oldStrict = (todo) => {
      if (todo.status === 'expired') return true;
      if (todo.status !== 'pending') return false;
      if (!todo.deadline) return false;
      return todo.deadline < today;
    };
    // 旧实现对偶 B（todo.js _isGroupItemExpired → 域 expiredCount / mergeRealtimeDomains）：
    // expired 真；completed/in_progress 假；其余（pending 及无 status 实时条目）按 deadline
    const oldGroupItem = (todo) => {
      if (todo.status === TodoStatus.EXPIRED) return true;
      if (todo.status === TodoStatus.COMPLETED || todo.status === TodoStatus.IN_PROGRESS) return false;
      if (!todo.deadline) return false;
      return todo.deadline < today;
    };
  
    const cases = [];
    const statuses = ['pending', 'in_progress', 'completed', 'expired', undefined, null];
    const deadlines = ['2026-09-09', '2026-09-10', '2099-01-01', null, undefined];
    for (const status of statuses) {
      for (const deadline of deadlines) {
        cases.push({ status, deadline });
      }
    }
  
    for (const t of cases) {
      const got = isTodoExpired(t, today);
      const isStatusBearing = typeof t.status === 'string';
      // 带 status 的持久化待办：四处旧口径一致（A==B），新实现须同时等于二者
      if (isStatusBearing) {
        assert.equal(oldStrict(t), oldGroupItem(t), `样例自洽 status=${t.status} deadline=${t.deadline}`);
        assert.equal(got, oldStrict(t), `status=${t.status} deadline=${t.deadline}`);
      }
      // 无 status 实时组条目：以域 expiredCount 口径（对偶 B）为准（todo-domain-view ⑤ 依赖此语义）
      assert.equal(got, oldGroupItem(t), `isTodoExpired(status=${String(t.status)}) deadline=${t.deadline}`);
    }
  
    // 显式语义命名样例（过期 / 到期当天 / 未来 / 完成态曾逾期 / 进行中 / 无 deadline / 实时条目）
    assert.equal(isTodoExpired({ status: 'pending', deadline: '2026-09-09' }, today), true, '过期：pending+昨日 → 逾期');
    assert.equal(isTodoExpired({ status: 'expired', deadline: '2026-09-09' }, today), true, '过期显式态');
    assert.equal(isTodoExpired({ status: 'pending', deadline: '2026-09-10' }, today), false, '到期当天不算逾期');
    assert.equal(isTodoExpired({ status: 'pending', deadline: '2099-01-01' }, today), false, '未来不算');
    assert.equal(isTodoExpired({ status: 'completed', deadline: '2026-09-01' }, today), false, '完成态曾逾期不计');
    assert.equal(isTodoExpired({ status: 'in_progress', deadline: '2026-09-01' }, today), false, '进行中不计逾期');
    assert.equal(isTodoExpired({ status: 'pending', deadline: null }, today), false, '无 deadline');
    assert.equal(isTodoExpired({ deadline: '2026-09-09' }, today), true, '无 status 实时条目（域 expiredCount 口径）→ 逾期');
    assert.equal(isTodoExpired({ deadline: '2099-01-01' }, today), false, '无 status 实时条目未来 → 不逾期');
    assert.equal(isTodoExpired(null, today), false, 'null 入参不崩');
    assert.equal(isTodoExpired({}, today), false, '空对象不崩');
    // Date 注入按本地时区取日（默认缺省按 UTC ISO——与旧实现一致，此处仅验证 Date 分支可跑）
    assert.equal(typeof isTodoExpired({ status: 'pending', deadline: '2020-01-01' }, new Date(2026, 8, 10)), 'boolean');
  });

})();
