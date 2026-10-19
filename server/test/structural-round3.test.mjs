// role: [工程师]+[AI]
// structural-round3.test.mjs — Round 3 结构守卫（batch 2C · 2026-10-19）
//
// 覆盖三项结构收口（只做静态断言，S 类，不启浏览器）：
//   R3-F01/D04 待办窄屏：详情列 order-first + 选中 scrollIntoView + 详情卡 aria-live；
//   R3-F04/B04 组织台专班卡：role=button / tabindex=0 / aria-label + Enter·Space，卡内控件不劫持；
//   R3-D03/F08 页头/外壳：待办页不再重复页签名，概况标题由调用方按台传值（默认「工作概况」）。
// 版心宽度不动：六台仍为 max-w-6xl（72rem）；党委台 page-frame--wide（80rem）是宽表例外。
//
// 运行：cd server && node --test test/structural-round3.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const TODO_SHELL = 'docs/src/components/record/todo-tab-shell.js';
const TASKFORCE_TAB = 'docs/src/entries/tabs/org/taskforce-tab.js';
const WORK_OVERVIEW = 'docs/src/components/governance/work-overview.js';
const WORKBENCHES = ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor'];

test('S0 守卫自检：被测源文件非空且关键锚点可命中（防空转）', () => {
  for (const rel of [TODO_SHELL, TASKFORCE_TAB, WORK_OVERVIEW]) {
    const src = read(rel);
    assert.ok(src.length > 1000, `${rel} 内容过短（${src.length}），守卫可能空转`);
  }
  const todo = read(TODO_SHELL);
  assert.ok((todo.match(/scrollIntoView/g) || []).length >= 1, '待办壳未出现 scrollIntoView，断言将空转');
  const tf = read(TASKFORCE_TAB);
  assert.ok((tf.match(/tf-store-card/g) || []).length >= 1, '专班卡选择器未出现，断言将空转');
  const overview = read(WORK_OVERVIEW);
  assert.ok((overview.match(/renderTabHeader/g) || []).length >= 1, '概况页头未出现，断言将空转');
});

test('S1 待办窄屏：详情列 order-first / 列表 order-last，选中滚入详情卡，详情卡 aria-live', () => {
  const src = read(TODO_SHELL);
  // 窄屏（<lg）详情列先于列表；lg 回到源码顺序（列表在左、详情在右）。
  assert.match(src, /class="lg:col-span-1 order-first lg:order-none"/, '详情列缺 order-first（窄屏应排在列表之前）');
  assert.match(src, /class="lg:col-span-2 order-last lg:order-none"/, '列表列缺 order-last（窄屏应排在详情之后）');
  // 选中待办后滚动到详情卡顶部（block: 'start'）。
  assert.match(src, /data-ws-todo-detail/, '详情卡缺 data-ws-todo-detail 定位标记');
  assert.match(src, /\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/, '选中后未对详情卡 scrollIntoView');
  assert.match(src, /_selectedTodoId = todo\.groupKey \|\| todo\.id;[\s\S]{0,120}?renderContent\(ctx\)\.then\(_scrollDetailIntoView\)/,
    '选中后应在重建完成时滚动到详情');
  // 读屏可感知详情变化。
  assert.match(src, /data-ws-todo-detail aria-live="polite"/, '详情卡缺 aria-live="polite"');
  // 空态不再写「左侧」（窄屏详情在上方），且不再重复页签名。
  assert.doesNotMatch(src, /点击左侧待办查看详情/, '空态不得再写「左侧」');
  assert.match(src, /选择一条待办查看详情/, '空态文案应为「选择一条待办查看详情」');
  assert.doesNotMatch(src, /renderTabHeader\(\{ title: '待办' \}\)/, '待办页不得再重复页签名 H2');
  assert.doesNotMatch(src, /import \{ renderTabHeader \}/, '待办壳已不调用页头，不应保留 import');
});

test('S2 专班卡：role=button / tabindex=0 / aria-label，Enter·Space 展开且不劫持卡内控件', () => {
  const src = read(TASKFORCE_TAB);
  const cardTag = (src.match(/<div class="kanban-card[^"]*"[^>]*>/) || [''])[0];
  assert.ok(cardTag, '未找到 .kanban-card 卡片标签');
  assert.match(cardTag, /role="button"/, '专班卡缺 role="button"');
  assert.match(cardTag, /tabindex="0"/, '专班卡缺 tabindex="0"');
  assert.match(cardTag, /aria-label="查看专班：\$\{esc\(t\.name\)\}"/, '专班卡缺可读的 aria-label');
  assert.ok(!/^<a\b/.test(cardTag), '专班卡不得改成 <a>');
  // 容器 keydown：先放行卡内按钮 / 链接 / 表单控件，再处理 Enter / Space。
  assert.match(src, /host\.addEventListener\('keydown', \(e\) => \{[\s\S]*?if \(e\.target\.closest\('button,a,input,textarea,select'\)\) return;/,
    'keydown 缺卡内控件守卫');
  assert.match(src, /if \(e\.key !== 'Enter' && e\.key !== ' '\) return;/, 'keydown 未限定 Enter / Space');
  assert.match(src, /_openTfDetail\(card\.dataset\.tfId, \{ accent, accentBorder \}, card\)/, '键盘展开未复用整卡点击入口');
  // 不再把已可聚焦的卡片降为 tabindex=-1（否则键盘 Tab 无法再次到达）。
  assert.doesNotMatch(src, /triggerEl\.setAttribute\('tabindex', '-1'\)/, '卡片已 tabindex=0，不得在打开后降为 -1');
});

test('S3 概况标题：work-overview 支持 title 参数（默认「工作概况」），六台按身份传值', () => {
  const overview = read(WORK_OVERVIEW);
  assert.match(overview, /title = '工作概况'/, 'work-overview 未提供 title 参数默认值「工作概况」');
  assert.match(overview, /renderTabHeader\(\{ title \}\)/, 'work-overview 页头未使用 title 参数');
  assert.match(overview, /const rerenderOpts = \{[^}]*\btitle\b/, '重渲染参数未透传 title（下钻返回会丢标题）');

  const expected = {
    secretary: '全局概况',
    org: '工作概况',
    prop: '工作概况',
    disc: '工作概况',
    leader: '工作概况',
    visitor: '我的工作概况',
  };
  for (const [role, title] of Object.entries(expected)) {
    const src = read(`docs/src/entries/tabs/${role}/overview-tab.js`);
    assert.match(src, new RegExp(`title:\\s*'${title}'`), `${role} 台未传 title: '${title}'`);
  }
});

test('S4 六台外壳：页头 H2 保留、版心不扩（党委台 80rem 为宽表例外）', () => {
  const headings = {
    secretary: '支书工作台',
    org: '组织委员工作台',
    prop: '宣传委员工作台',
    disc: '纪检委员工作台',
    leader: '党小组组长工作台',
    visitor: '工作台',
  };
  for (const [role, heading] of Object.entries(headings)) {
    const html = read(`docs/workspace/${role}.html`);
    assert.match(html, new RegExp(`<h2[^>]*>${heading}</h2>`), `${role}.html 页头 H2「${heading}」丢失`);
    assert.match(html, /class="max-w-6xl mx-auto"/, `${role}.html 版心宽度被改动（应保持 72rem）`);
    assert.match(html, /党委台 page-frame--wide 80rem 为宽表例外/, `${role}.html 缺版心例外注释`);
  }
});
