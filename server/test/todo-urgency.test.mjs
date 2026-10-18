// role: [工程师]+[AI]
// server/test/todo-urgency.test.mjs — 我的待办四档紧迫度守卫（2026-10-18 · 工作台密度重组 Task 5）
//
// 覆盖：
//   ① 壳体纯中文四数摘要：逾期 / 今日 / 本周 / 待处理；
//   ② 列表四档组名：逾期 / 今日 / 本周 / 以后；空组不渲染；
//   ③ 四档计算口径：逾期=截止日早于今天或 expired；今日=当天；本周=今天之后且不晚于本周日；
//      待处理=全部未完成条数（摘要与列表共用 buildUrgencySections）；
//   ④ 六台 todo-tab 仍共用 createTodoTab（不逐台复制四档渲染）；
//   ⑤ 待办相关源码不出现 Overdue / Today / This week 等中英混排展示词；
//   ⑥ 深链锚点 data-group-key 仍在。
// 运行：node --test server/test/todo-urgency.test.mjs（仓库根目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildUrgencySections,
  renderUrgencyTodoList,
} from '../../docs/src/components/record/todo-list.js?v=20261018h';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const TODO_TABS = [
  'docs/src/entries/tabs/visitor/todo-tab.js',
  'docs/src/entries/tabs/secretary/todo-tab.js',
  'docs/src/entries/tabs/prop/todo-tab.js',
  'docs/src/entries/tabs/org/todo-tab.js',
  'docs/src/entries/tabs/leader/todo-tab.js',
  'docs/src/entries/tabs/disc/todo-tab.js',
];

test('① 壳体四数摘要为纯中文：逾期 / 今日 / 本周 / 待处理', () => {
  const shell = read('docs/src/components/record/todo-tab-shell.js');
  for (const word of ['逾期', '今日', '本周', '待处理']) {
    assert.ok(shell.includes(`'${word}'`), `壳体摘要应包含「${word}」`);
  }
  assert.match(shell, /buildUrgencySections\(/, '摘要数值应与列表共用四档分组数据');
  assert.match(shell, /_urgencySummaryHtml\(urgency\.summary\)/, '摘要带应由同一批分组结果渲染');
  assert.match(shell, /renderUrgencyTodoList\(/, '待办列表应改挂四档渲染函数');
});

test('② 列表四档组名：逾期 / 今日 / 本周 / 以后；空组不渲染', () => {
  const list = read('docs/src/components/record/todo-list.js');
  for (const word of ['逾期', '今日', '本周', '以后']) {
    assert.ok(list.includes(`label: '${word}'`), `列表档位应包含「${word}」`);
  }
  assert.match(list, /if \(!groups\.length\) return '';/, '空组不得渲染');
});

test('③ 四档计算：逾期/今日/本周/以后 + 摘要四数与列表同源', () => {
  const groups = [
    { groupKey: 'g-overdue', count: 2, deadline: '2026-10-13', items: [] },
    { groupKey: 'g-overdue-expired', count: 1, deadline: '2026-10-20', items: [{ status: 'expired' }] },
    { groupKey: 'g-today', count: 1, deadline: '2026-10-14', items: [] },
    { groupKey: 'g-week', count: 3, deadline: '2026-10-18', items: [] },
    { groupKey: 'g-later', count: 4, deadline: '2026-10-19', items: [] },
    { groupKey: 'g-none', count: 5, deadline: null, items: [] },
  ];
  const { sections, summary } = buildUrgencySections(groups, '2026-10-14'); // 周三；本周日=10-18

  const byKey = Object.fromEntries(sections.map(s => [s.key, s.groups.map(g => g.groupKey)]));
  assert.deepEqual(byKey.overdue, ['g-overdue', 'g-overdue-expired'], '截止日早于今天或 expired 显式态入逾期');
  assert.deepEqual(byKey.today, ['g-today'], '当天截止入今日');
  assert.deepEqual(byKey.week, ['g-week'], '今天之后且不晚于本周日入本周');
  assert.deepEqual(byKey.later, ['g-later', 'g-none'], '更晚或无截止入以后');

  assert.deepEqual(summary, { overdue: 3, today: 1, week: 3, pending: 16 },
    '摘要四数=同一批分组条数（待处理含全部未完成）');
});

test('④ 行内只保留标题/说明/主行动，作废等次要动作进入「更多」', () => {
  const { sections } = buildUrgencySections([
    {
      groupKey: 'secretary:member-confirm',
      actionKey: 'member-confirm',
      title: '成员变更待确认',
      count: 2,
      deadline: '2026-10-14',
      persisted: true,
      domainLabel: '成员发展',
      items: [{ id: 'a' }, { id: 'b' }],
    },
  ], '2026-10-14');

  const { html } = renderUrgencyTodoList({
    prefix: 'secretary',
    sections,
    selectedTodoId: 'secretary:member-confirm',
    onVoidTodo: () => {},
    onDeleteTodo: () => {},
    urgeStateOf: () => ({ state: 'available', label: '催办' }),
    onUrgeTodo: () => {},
  });

  assert.match(html, /class="list-row /, '行结构应复用 list-row');
  assert.match(html, /成员发展/, '业务域应降为行内 12px 次级标签');
  assert.match(html, /data-group-key="secretary:member-confirm"/, '深链锚点应保留');
  assert.match(html, /secretary-todo-action-btn/, '行内应保留一个主行动');
  assert.match(html, /todo-more__btn[^>]*aria-expanded="false"/, '更多菜单默认收起且键盘可达');
  assert.match(html, /secretary-todo-void-btn/, '作废应收进更多菜单');
  assert.match(html, /secretary-todo-del-btn/, '删除应收进更多菜单');
  assert.match(html, /secretary-todo-urge-btn/, '催办应收进更多菜单');
});

test('⑤ 六台 todo-tab 仍共用 createTodoTab（不逐台复制四档渲染）', () => {
  for (const rel of TODO_TABS) {
    const src = read(rel);
    assert.match(src, /createTodoTab\s*\(/, `${rel} 应调用共享壳 createTodoTab`);
    assert.doesNotMatch(src, /renderUrgencyTodoList\(/, `${rel} 不得逐台复制四档列表渲染`);
  }
});

test('⑥ 待办相关源码不出现 Overdue / Today / This week 等中英混排展示词', () => {
  const files = ['docs/src/components/record/todo-tab-shell.js', 'docs/src/components/record/todo-list.js', ...TODO_TABS];
  for (const rel of files) {
    const src = read(rel);
    assert.doesNotMatch(src, /(['"`>])Overdue\b/, `${rel} 不得出现展示词 Overdue`);
    assert.doesNotMatch(src, /(['"`>])Today\b/, `${rel} 不得出现展示词 Today`);
    assert.doesNotMatch(src, /This week/i, `${rel} 不得出现展示词 This week`);
  }
});

test('⑦ 深链定位逻辑仍在：data-group-key 锚点 + groupKey 查找', () => {
  const list = read('docs/src/components/record/todo-list.js');
  assert.match(list, /'data-group-key': g\.groupKey/, '行根应保留 data-group-key（?tab=todo&highlight=<groupKey> 定位）');
  assert.match(list, /_findGroup\(sections, row\.dataset\.groupKey\)/, '点行应按 groupKey 找回分组');
});
