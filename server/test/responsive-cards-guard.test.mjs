// role: [工程师]+[AI]
// responsive-cards-guard.test.mjs — 宽表窄屏承载守卫（2026-10-21 · Task 7 / B-499-10）
//
// 口径（DESIGN_SYSTEM §4.10-9 / §4.20.2 / §4.20.7-5 / §6.2）：
//   ① 表格 ≤640px 可切卡式行（`data-responsive="cards"`）：thead 隐藏、一行一卡、每格 `data-label`；
//   ② 矩阵 ≤640px 堆叠＝**同一关系行的响应式形态**（同一张表 + data-label），不是第二套卡片矩阵；
//   ③ 卡式行内 sticky / min-width 必须清零，页面主体不得横向溢出；
//   ④ 打印时 `@media print` 恢复表格形态；
//   ⑤ 信息完整性：每个数据 td 都有 data-label，且覆盖表头全部列名。
//
// 本守卫只做**静态**断言；「390×844 无横向溢出」由 `page-sweep.test.mjs` 真机审次承担。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 递归列出 docs/src 下全部 .js（R5-C03：守卫改为扫描所有表格配置，不再点名文件）。 */
function walkJs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** 配置块的列数：静态 <th> 数、colSpan 常量、或动态 colSpan（`4 + types.length` 视为 ≥5）。 */
function colsOf(block) {
  const th = (block.match(/<th\b/g) || []).length;
  const col = Number(/colSpan:\s*(\d+)/.exec(block)?.[1] || 0);
  const dynamic = /colSpan:\s*[^,\n]*\+/.test(block) ? 5 : 0;
  return Math.max(th, col, dynamic);
}

/** 取 `table: { … }` 配置块（花括号配平）。 */
function tableConfigBlocks(src) {
  const blocks = [];
  let i = 0;
  while ((i = src.indexOf('table: {', i)) >= 0) {
    let depth = 0;
    let j = i + 7;
    for (; j < src.length; j += 1) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') {
        depth -= 1;
        if (depth === 0) { j += 1; break; }
      }
    }
    blocks.push({ start: i, text: src.slice(i, j) });
    i = j;
  }
  return blocks;
}

const STYLES = read('docs/src/styles.css');
const MATRIX = read('docs/src/components/ui/relation-matrix.js');
const ATT = read('docs/src/entries/tabs/disc/attendance-tab.js');
const FLOW = read('docs/src/entries/tabs/org/member-flow-tab.js');
const GROUP = read('docs/src/entries/tabs/secretary/group-progress-tab.js');
const OVERVIEW = read('docs/src/components/governance/work-overview.js');
const COMMITTEE = read('docs/src/entries/tabs/secretary/committee-meeting-tab.js');
const ENGINE = read('docs/src/components/ui/list-filter.js');
const CAL_CARD = read('docs/src/entries/tabs/shared/activity-calendar-tab.js');

/** 去掉括号补充说明与空白，用于「表头 ↔ data-label」覆盖比较（如「人数（含党员）」≡「人数」）。 */
const norm = (s) => String(s).replace(/（[^）]*）/g, '').replace(/\s+/g, '').trim();

/** 取函数体片段（从 `start` 到 `end`），用于按行模板核对 td/data-label。 */
function slice(src, start, end) {
  const a = src.indexOf(start);
  assert.ok(a >= 0, `未找到片段起点：${start}`);
  const b = src.indexOf(end, a);
  assert.ok(b > a, `未找到片段终点：${end}`);
  return src.slice(a, b);
}

/** 数据 td 行（排除空态 colspan 行）里缺 data-label 的行。 */
function missingLabels(chunk) {
  return chunk.split('\n')
    .filter((line) => /<td\b/.test(line) && !/colspan=/.test(line) && !/data-label=/.test(line))
    .map((line) => line.trim().slice(0, 80));
}

/** 某段行模板里的 data-label 集合。 */
function labelsOf(chunk) {
  return [...chunk.matchAll(/data-label="([^"]+)"/g)].map((m) => m[1]);
}

test('C1 styles.css 卡式行单一源：thead 隐藏 / data-label / sticky 与 min-width 清零', () => {
  assert.match(STYLES, /@media \(max-width: 640px\) \{[\s\S]*?\.data-table\[data-responsive="cards"\] thead \{ display: none; \}/,
    '≤640px 须隐藏卡式表的 thead');
  assert.match(STYLES, /\.data-table\[data-responsive="cards"\] th,\s*\.data-table\[data-responsive="cards"\] td \{[\s\S]*?position: static;[\s\S]*?min-width: 0;/,
    '卡式行内 th/td 须清零 sticky 与 min-width');
  assert.match(STYLES, /\.data-table\[data-responsive="cards"\] td::before \{[\s\S]*?content: attr\(data-label\)/,
    '卡式行字段名须由 td[data-label] 提供');
  assert.match(STYLES, /\.data-table\[data-responsive="cards"\] tbody th \{[\s\S]*?position: static|\.data-table\[data-responsive="cards"\] th,\s*\.data-table\[data-responsive="cards"\] td \{[\s\S]*?position: static/,
    '矩阵行表头（tbody th）在卡式行内不得吸附');
  assert.match(STYLES, /\.rm-root \.rm-scroll \{[\s\S]*?max-height: none;[\s\S]*?overflow-x: visible;/,
    '矩阵卡式形态须解除容器限高与横滚');
});

test('C2 打印恢复表格形态：@media print 覆盖卡式行', () => {
  assert.match(STYLES, /@media print \{[\s\S]*?\.data-table\[data-responsive="cards"\] \{[\s\S]*?display: table !important/,
    '打印时卡式表须恢复 display:table');
  assert.match(STYLES, /@media print \{[\s\S]*?\.data-table\[data-responsive="cards"\] thead \{ display: table-header-group !important; \}/,
    '打印时表头须恢复');
  assert.match(STYLES, /@media print \{[\s\S]*?\.data-table\[data-responsive="cards"\] td::before \{ content: none !important; \}/,
    '打印时不得输出卡式字段名');
});

test('C3 手写卡式表：每个数据 td 都有 data-label（考勤汇总 / 党小组 / 条线）', () => {
  const attChunk = slice(ATT, 'function _renderTable', '// 翻页控件');
  assert.match(attChunk, /<table class="data-table" data-responsive="cards">/, '纪检考勤汇总须声明 data-responsive="cards"');
  assert.deepEqual(missingLabels(attChunk), [], '考勤汇总存在未带 data-label 的数据 td');
  const attLabels = labelsOf(attChunk);
  for (const label of ['姓名', '学号', '发展阶段', '所属党小组', '活动', '类别', '状态', '备注（标因/补录）', '确认人', '操作']) {
    assert.ok(attLabels.includes(label), `考勤汇总 td 缺 data-label="${label}"`);
  }
  const attHeads = [...attChunk.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map((m) => norm(m[1]));
  const attNorm = new Set(attLabels.map(norm));
  const attMissingCols = attHeads.filter((h) => h && !attNorm.has(h));
  assert.deepEqual(attMissingCols, [], `考勤汇总 data-label 未覆盖表头列：${attMissingCols.join(' / ')}`);

  // 2026-11-01 Task 4：党小组页改主从双栏，原「党小组清单」表撤；卡式行落在「活动台账」表
  assert.match(GROUP, /<table class="data-table" data-responsive="cards">/, '活动台账须声明卡式行');
  const groupChunk = slice(GROUP, 'function _ledgerRowHtml', 'function _reviewStatusCellHtml');
  assert.deepEqual(missingLabels(groupChunk), [], '活动台账存在未带 data-label 的数据 td');
  const groupLabels = labelsOf(groupChunk);
  for (const label of ['日期', '活动', '复盘状态', '应到·实到']) {
    assert.ok(groupLabels.includes(label), `活动台账 td 缺 data-label="${label}"`);
  }

  const woChunk = slice(OVERVIEW, 'const tableRows = lineRows.map', 'const shownActions');
  assert.deepEqual(missingLabels(woChunk), [], '工作分工表存在未带 data-label 的数据 td');
  const woLabels = labelsOf(woChunk);
  for (const label of ['工作分工', '负责人', '在办', '逾期', '待处理']) {
    assert.ok(woLabels.includes(label), `工作分工表 td 缺 data-label="${label}"`);
  }
});

test('C4 全站引擎表扫描：列数 ≥5 的表格配置必须 opt-in 卡式行，且每个数据 td 有 data-label', () => {
  const offenders = [];
  for (const file of walkJs(join(ROOT, 'docs/src'))) {
    const src = readFileSync(file, 'utf8');
    const blocks = tableConfigBlocks(src);
    if (!blocks.length) continue;
    const hasWide = blocks.some((b) => colsOf(b.text) >= 5);
    blocks.forEach((b) => {
      const cols = colsOf(b.text);
      if (cols >= 5 && !/responsive:\s*true/.test(b.text)) {
        offenders.push(`${file.replace(ROOT + '\\', '')} 第 ${src.slice(0, b.start).split('\n').length} 行：${cols} 列未开 responsive`);
      }
    });
    if (hasWide) {
      // 同一文件内的行模板：任何非 colspan 的数据 td 都必须带 data-label（卡式行字段名单一源）。
      src.split('\n').forEach((line, idx) => {
        if (/<td\b/.test(line) && !/colspan=/.test(line) && !/data-label=/.test(line) && !/\$\{.*<td/.test(line)) {
          offenders.push(`${file.replace(ROOT + '\\', '')}:${idx + 1} 数据 td 缺 data-label`);
        }
      });
    }
  }
  assert.equal(offenders.length, 0,
    `以下宽表未满足「≥5 列必须卡式行 + 每格 data-label」：\n  ${offenders.join('\n  ')}`);
  // 非空转：确认扫描确实命中宽表配置（防正则失配导致恒真）。
  const wide = walkJs(join(ROOT, 'docs/src')).flatMap((f) => tableConfigBlocks(readFileSync(f, 'utf8')))
    .filter((b) => colsOf(b.text) >= 5);
  assert.ok(wide.length >= 9, `扫描到的 ≥5 列引擎表配置只有 ${wide.length} 个（基线 9）`);
});

test('C4b 引擎卡式表：成员流动 8 列 / 支委两表 5 列全覆盖', () => {
  assert.match(FLOW, /responsive: true/, '成员流动台账须 opt-in 卡式行');
  const flowChunk = slice(FLOW, 'function _flowRowHtml', '/** 未登记人员清单');
  assert.deepEqual(missingLabels(flowChunk), [], '成员流动台账存在未带 data-label 的数据 td');
  const flowLabels = labelsOf(flowChunk);
  for (const label of ['类型', '姓名', '学号', '届别', '日期', '经手人', '备注', '操作']) {
    assert.ok(flowLabels.includes(label), `成员流动台账 td 缺 data-label="${label}"`);
  }
  // 2026-10-23 批次 505（R7-08）：成员流动表头改为 `heads` 数组（空列按 hasValue 动态隐藏），
  //   `headHtml` 只剩 `${heads}`；表头列名改从 heads 数组的 <th> 字面量收集，判据（列数一致 + 覆盖）不变。
  const flowHeads = /headHtml: '<tr>(.*?)<\/tr>'/.exec(FLOW)?.[1] || '';
  let flowHeadCols = [...flowHeads.matchAll(/<th>([^<]+)<\/th>/g)].map((m) => norm(m[1]));
  if (flowHeadCols.length === 0) {
    const headsBlock = /const heads = \[([\s\S]*?)\]\.filter\(Boolean\)/.exec(FLOW)?.[1] || '';
    flowHeadCols = [...headsBlock.matchAll(/<th>([^<]+)<\/th>/g)].map((m) => norm(m[1]));
  }
  assert.equal(flowLabels.length, flowHeadCols.length, `成员流动台账 td 数 ${flowLabels.length} 与表头列数 ${flowHeadCols.length} 不一致`);
  assert.deepEqual(flowHeadCols.filter((h) => !new Set(flowLabels.map(norm)).has(h)), [], '成员流动台账 data-label 未覆盖全部列名');

  assert.equal((COMMITTEE.match(/responsive: true/g) || []).length, 2, '支委构成 / 支委会会议两表都须 opt-in 卡式行');
  const rosterChunk = slice(COMMITTEE, 'function rosterRowHtml', '/** 最近 8 场支委会');
  const meetingChunk = slice(COMMITTEE, 'function meetingRowHtml', '/** 行内选人实例');
  for (const [name, chunk, labels] of [
    ['支委构成', rosterChunk, ['姓名', '身份', '来源', '状态', '操作']],
    ['支委会会议', meetingChunk, ['日期', '议题', '状态', '应到', '操作']],
  ]) {
    assert.deepEqual(missingLabels(chunk), [], `${name}存在未带 data-label 的数据 td`);
    const got = labelsOf(chunk);
    assert.equal(got.length, labels.length, `${name} td 数 ${got.length} 与表头列数 ${labels.length} 不一致`);
    for (const label of labels) assert.ok(got.includes(label), `${name} td 缺 data-label="${label}"`);
  }
});

test('C6 手写 data-table：静态表头 ≥5 列必须 data-responsive="cards" 且每格 data-label', () => {
  const offenders = [];
  for (const file of walkJs(join(ROOT, 'docs/src'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/<table class="data-table([^"]*)"([^>]*)>([\s\S]{0,1200}?)<thead>([\s\S]*?)<\/thead>/g)) {
      const cols = (m[4].match(/<th\b/g) || []).length;
      if (cols < 5) continue;
      const rel = file.replace(ROOT + '\\', '');
      if (!/data-responsive="cards"/.test(m[2])) offenders.push(`${rel}：${cols} 列手写表未声明 data-responsive="cards"`);
      const body = m[3] + src.slice(m.index, src.indexOf('</table>', m.index));
      if (/<td\b/.test(body)) {
        body.split('\n').forEach((line, idx) => {
          if (/<td\b/.test(line) && !/colspan=/.test(line) && !/data-label=/.test(line)) {
            offenders.push(`${rel}：手写宽表数据 td 缺 data-label（${line.trim().slice(0, 60)}）`);
          }
        });
      }
    }
  }
  assert.equal(offenders.length, 0, `手写宽表卡式行不合规：\n  ${offenders.join('\n  ')}`);
});

test('C5 矩阵卡式结构：同一张表 + data-label + rm-scroll，保留 — / sticky / 列上限', () => {
  assert.match(MATRIX, /<table class="data-table rm-table" data-responsive="cards">/,
    '矩阵须与引擎表共用同一套卡式规则（同一张表，不新造第二套矩阵）');
  assert.match(MATRIX, /class="rm-scroll[^"]*"/, '矩阵滚动容器须挂 .rm-scroll（窄屏解除限高/横滚）');
  assert.match(MATRIX, /data-label="\$\{esc\(label\)\}" title="\$\{esc\(label\)\}"[^>]*>/,
    '矩阵每个 td 须带 data-label（当前可见列名）');
  assert.match(MATRIX, /cellOf\(p\.id, it\.id, it\.title\)/, 'byPerson：卡内逐项目名（data-label＝项目名）');
  assert.match(MATRIX, /cellOf\(p\.id, it\.id, p\.name\)/, 'byItem：卡内逐人姓名（data-label＝姓名）');
  assert.ok(/—<\/td>/.test(MATRIX), '空单元格仍须显示「—」');
  assert.match(MATRIX, /sticky left-0/, '桌面宽表仍保留首列吸附');
  assert.match(MATRIX, /export const MATRIX_COL_LIMIT = 6/, '项目维列上限 6 不得改动');
  assert.match(MATRIX, /export const MATRIX_ROW_LIMIT = 10/, '人维分页不得改动');
  // 引擎表格模式仍输出同一属性（单一源）
  assert.match(ENGINE, /data-responsive="cards"/, '统一检索引擎仍须输出 data-responsive="cards"');
});

test('C7 日历折叠卡（2026-10-27 Task 6.3）：40×40 摘要槽只留 chevron + aria-label，不塞整句', () => {
  const m = /<summary class="disclosure__summary"([^>]*)>([^<]*)<\/summary>/.exec(CAL_CARD);
  assert.ok(m, '未找到共享日历折叠卡的 <summary class="disclosure__summary">');
  assert.match(m[1], /aria-label="[^"]+"/, '折叠钮须有可访问名（aria-label）');
  assert.equal(m[2].trim(), '', '40px 摘要槽内不得再放整句文字（会竖排折行压卡）');
  // 四台（org / prop / disc / leader）的工作概况都复用同一实现。
  for (const page of ['org', 'prop', 'disc', 'leader']) {
    assert.match(read(`docs/src/entries/tabs/${page}/overview-tab.js`), /renderCalendarCard/,
      `${page} 台工作概况须复用共享日历折叠卡（单一源）`);
  }
});
