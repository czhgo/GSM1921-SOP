// S 类守卫：党委台「支部管理」目录行须呈现活动/专班/通知摘要，并支持行内展开名册。
// 判据只读源码，不依赖演示数据；缺失值口径必须是 `??`（0 是有效读数，不得被 `||` 吞成兜底）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../../docs/src/entries/tabs/party-committee/branches-tab.js', import.meta.url);

test('S 支部目录：活动/专班/通知三列 + 行内名册展开', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  // 非空转自检：确实读到了目录实现（而不是空文件/占位）
  assert.ok(source.length > 3000, `支部目录源码过短（${source.length} 字节），守卫不得空转`);
  assert.match(source, /data-branch-card/, '守卫目标应为支部目录行');

  // ① 表头：在「在册党员」之后、「组织提醒」之前插入活动/专班/通知三列；
  //    2026-10-20 A05：支部动态撤页后，「待批复」列并入本表（与 review 深链同口径）。
  // 2026-10-21 批次 500：宽表卡式化给表加了 data-responsive，守卫读取时允许附加属性，不放松列序断言。
  const head = /<table[^>]*data-table--compare[^>]*>[\s\S]*?<thead>([\s\S]*?)<\/thead>/.exec(source)?.[1] || '';
  assert.match(head, /<th scope="col">在册党员<\/th><th scope="col">活动<\/th><th scope="col">专班<\/th><th scope="col">通知<\/th><th scope="col">待批复<\/th><th scope="col">组织提醒<\/th>/,
    '表头须按「在册党员 → 活动 → 专班 → 通知 → 待批复 → 组织提醒」排列');
  assert.equal((head.match(/<th scope="col">/g) || []).length, 10, '支部目录应为 10 列（含行内名册的 colspan 对齐）');

  // ② 行内取值：活动 active/total、专班 active/total、通知总数
  assert.match(source, /summary\.activeActivityCount/, '活动列须读 summary.activeActivityCount');
  assert.match(source, /summary\.activityCount/, '活动列须读 summary.activityCount 作为总数');
  assert.match(source, /summary\.activeTaskforceCount/, '专班列须读 summary.activeTaskforceCount');
  assert.match(source, /summary\.taskforceCount/, '专班列须读 summary.taskforceCount 作为总数');
  assert.match(source, /summary\.noticeCount/, '通知列须读 summary.noticeCount');

  // ③ 缺失值口径：`??` 而非 `||`（0 是有效读数）
  for (const key of ['activeActivityCount', 'activityCount', 'activeTaskforceCount', 'taskforceCount', 'noticeCount']) {
    assert.match(source, new RegExp(`summary\\.${key}\\s*\\?\\?`), `summary.${key} 缺失值须用 ?? 兜底`);
    assert.doesNotMatch(source, new RegExp(`summary\\.${key}\\s*\\|\\|`), `summary.${key} 不得用 || 兜底（会把 0 当缺失）`);
  }

  // ④ 行内名册：按钮、展开行、列宽、滚动与无障碍状态
  assert.match(source, /data-branch-roster-toggle/, '操作列须有「名册」按钮');
  assert.match(source, /branch-roster-row/, '展开行须带 branch-roster-row 标识');
  assert.match(source, /colspan="10"/, '展开行须跨满 10 列');
  assert.match(source, /aria-expanded/, '名册按钮须同步 aria-expanded');
  assert.match(source, /max-h-80/, '名册区须限制最大高度');
  assert.match(source, /overflow-y-auto/, '名册区须纵向滚动');
  assert.match(source, /暂无在册成员/, '名册空态文案须为「暂无在册成员」');
  assert.match(source, /PersonStore\.getMembers\(\)[\s\S]*?\(person\.branchId \|\| 'br-b1'\) === branchId/,
    '名册取数须经 PersonStore.getMembers() 且按支部归属过滤');
});
