// server/test/member-progress.test.mjs — 「本组组员进展」服务端汇总守卫（2026-09-15 批次 47-I · Q-23-41 ②）
//
// 来源（支书 2026-09-15 裁定）：批次 47-G 抽样「辅助小字」时撞见「开学第 1 周：请逐人归集…」提醒，
//   支书连问三句——「为什么自动生成」「我从来没说过要有一个**收集过程**」「照理说理想状态下，
//   后台服务器已经**自动把相关信息都计算汇总好了**」→ 裁定 **① 立纪律 + 加守卫**、**② 改为服务端汇总**。
//
// 本守卫四条：
//   S1 **单一源（结构）**：接口**不得自行聚合**——必须 import `docs/src/services/member-progress.js`，
//      且 route 源码里不得出现自写判定（`isTodoExpired` / `AttendanceStatus` / `reportCategory` …）。
//      这条专治本仓库反复吃亏的病：**同一口径在两端各写一套**。
//   S2 **四项真被算到（非空转）**：造出在办/超期/缺勤/考察待确认/汇报卡点各一条，逐个断言——
//      缺任一项恒为 0 即证明该维度没真算。
//   S3 **双态同源**：mock 态（前端直接调纯函数）与 api 态（打接口）结果**逐字相等**。
//   S4 **参数守卫**：缺 personIds → 400（不得静默返回全量人员）。
//
// 数据源：服务端四张键值表 `todos` / `attendances` / `inspections` / `issues`（id + data JSON）。
// 目标人用**合成 id**（`mp-p1`）——避免与种子库里的真实人员数据相互污染。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { aggregateMemberProgress } from '../../docs/src/services/member-progress.js?v=20260922h';

const ROOT = join(import.meta.dirname, '..', '..');
const TODAY = '2026-09-15';
const TARGET = 'mp-p1'; // 合成人员：不与种子数据交叉

let server, base, db, token;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  await seedDatabase(db);

  const put = (table, id, data) =>
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(data));

  // 在办事项：1 条超期 + 1 条在办未超期 + 1 条已完成（已完成两条口径都不计）
  put('todos', 'mp-t1', { id: 'mp-t1', personId: TARGET, title: '超期待办', status: 'pending', deadline: '2026-09-01' });
  put('todos', 'mp-t2', { id: 'mp-t2', personId: TARGET, title: '在办未超期', status: 'pending', deadline: '2026-12-31' });
  put('todos', 'mp-t3', { id: 'mp-t3', personId: TARGET, title: '已完成', status: 'completed' });
  // 出勤：1 缺勤 + 1 出席（只有缺勤计入）
  put('attendances', 'mp-a1', { id: 'mp-a1', personId: TARGET, activityId: 'act-1', status: 'absent' });
  put('attendances', 'mp-a2', { id: 'mp-a2', personId: TARGET, activityId: 'act-2', status: 'present' });
  // 考察：1 条待确认
  put('inspections', 'mp-i1', { id: 'mp-i1', personId: TARGET, status: 'pending', content: '考察内容' });
  // 汇报：1 条卡点上报（open）
  put('issues', 'mp-r1', {
    id: 'mp-r1', kind: 'report', submittedBy: TARGET, status: 'open',
    reportCategory: 'blocked', title: '卡点事由',
  });

  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId: 'p13', password: '123456' }),
  });
  token = (await r.json()).token;
  assert.ok(token, '登录取 token 失败——后续断言将全部 401');
});

after(() => server?.close());

const fetchRows = async (query) => {
  const res = await fetch(`${base}/api/v1/leader/member-progress${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json() };
};

test('S1 单一源（结构）：接口不得自行聚合，口径必须来自 member-progress.js', () => {
  const src = readFileSync(join(ROOT, 'server', 'routes', 'leader-progress.js'), 'utf8');
  assert.match(
    src,
    /from '\.\.\/\.\.\/docs\/src\/services\/member-progress\.js'/,
    'route 未 import 单一源聚合模块 docs/src/services/member-progress.js——服务端若自写聚合，就是第二套口径',
  );
  for (const bad of ['isTodoExpired', 'AttendanceStatus', "=== 'absent'", 'reportCategory', "'pending'"]) {
    assert.ok(
      !src.includes(bad),
      `route 里出现了自写判定「${bad}」——聚合口径必须单一源（同源判定在 member-progress.js 内），勿在服务端重写`,
    );
  }
});

test('S2 四项真被算到（非空转）：在办 2 / 超期 1 / 缺勤 1 / 考察待确认 1 / 汇报=卡点', async () => {
  const { status, body } = await fetchRows(`?personIds=${TARGET}&today=${TODAY}`);
  assert.equal(status, 200);
  assert.equal(body.rows.length, 1, '按 personIds 应只聚合出 1 行');
  const r = body.rows[0];
  assert.equal(r.personId, TARGET);
  assert.equal(r.active, 2, `在办应为 2（已完成不计）——实测 ${r.active}`);
  assert.equal(r.overdue, 1, `超期应为 1——实测 ${r.overdue}`);
  assert.equal(r.absent, 1, `缺勤应为 1——实测 ${r.absent}`);
  assert.equal(r.inspPending, 1, `考察待确认应为 1——实测 ${r.inspPending}`);
  assert.equal(r.reportKind, 'blocked', `汇报态应为卡点——实测 ${r.reportKind}`);
  assert.equal(r.reportTitle, '卡点事由');
});

test('S3 双态同源：mock 态调纯函数 ≡ api 态打接口（逐字相等）', async () => {
  const readAll = (t) => db.prepare(`SELECT data FROM ${t}`).all().map((x) => JSON.parse(x.data));
  const mockRows = aggregateMemberProgress({
    persons: [{ personId: TARGET }],
    todos: readAll('todos'),
    attendance: readAll('attendances'),
    inspections: readAll('inspections'),
    issues: readAll('issues'),
    today: TODAY,
  });
  const { body } = await fetchRows(`?personIds=${TARGET}&today=${TODAY}`);
  assert.deepEqual(body.rows, mockRows, 'mock 态与 api 态结果不一致——说明存在两套聚合口径');
  assert.equal(body.today, TODAY, '接口须回显所用「今天」口径（防两端各自取时区）');
});

test('S4 参数守卫：缺 personIds → 400（不得静默返回全量）', async () => {
  const { status } = await fetchRows('');
  assert.equal(status, 400);
  const noAuth = await fetch(`${base}/api/v1/leader/member-progress?personIds=${TARGET}`);
  assert.equal(noAuth.status, 401, '未登录须 401（进度属敏感读）');
});
