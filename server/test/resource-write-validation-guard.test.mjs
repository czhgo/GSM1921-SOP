// server/test/resource-write-validation-guard.test.mjs — 通用资源写口字段校验 ＋ 列表硬上限守卫（T12 · 2026-11-16）
//
// 判据（spec `历史 spec（已删）` T12）：
//   G1 覆盖声明：`RESOURCE_TABLES` 的每个通用资源，要么在 `RESOURCE_WRITE_VALIDATION` 有字段校验，
//      要么在 `RESOURCE_WRITE_VALIDATION_EXEMPTIONS` 有非空理由（**不得两者都无 / 两者都有**）
//      ⇒ 新增通用资源必须“声明校验或显式豁免”，不能静默漏过。
//   G2 单一源：校验模块的枚举只从既有导出取（constants.js / domain.js），本文件不另造枚举表。
//   G3 接线：`routes/resources/index.js` 的通用 POST / PATCH 在落库前调用 `validateResourceWrite`
//      且失败返回 422；列表读口未分页时按 `LIST_PAGE_ROW_LIMIT` 截断并用
//      `X-Total-Count` / `X-Has-More` 给出可判定信号；`_paginateRows` 的 pageSize 用同一常量且回 `hasMore`。
//   G4 行为：校验器真的会判（乱码 status / 超长 title / 非法日期 / 空 title），也真的会放过合法值。
//   G5 非空转：G1 的覆盖判定是纯函数，注入“漏声明”的假集合必须判红。
//
// 豁免（不在本守卫面内）：语义端点的既有校验（`semantic-routes.js` 等）与快照写穿（`/snapshot`）
//   不由本守卫判；纯内嵌快照域（actSubRecords / tfSubRecords）在豁免表登记理由即可。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RESOURCE_TABLES } from '../routes/resources/store.js';
import {
  LIST_PAGE_ROW_LIMIT, RESOURCE_WRITE_VALIDATION, RESOURCE_WRITE_VALIDATION_EXEMPTIONS,
  TITLE_MAX_LENGTH, validateResourceWrite,
} from '../routes/resources/write-validation.js';
import { normalizeListPayload } from '../../docs/src/data/api-adapter.js?v=20261120a';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 纯函数：返回 { missing, duplicated }（G1 判据；G5 用假集合自证） */
export function coverageGaps(resourceNames, validationTable = RESOURCE_WRITE_VALIDATION, exemptions = RESOURCE_WRITE_VALIDATION_EXEMPTIONS) {
  const missing = [];
  const duplicated = [];
  for (const name of resourceNames) {
    const validated = Object.prototype.hasOwnProperty.call(validationTable, name);
    const exempted = Object.prototype.hasOwnProperty.call(exemptions, name)
      && String(exemptions[name] || '').trim().length >= 8;
    if (!validated && !exempted) missing.push(name);
    if (validated && Object.prototype.hasOwnProperty.call(exemptions, name)) duplicated.push(name);
  }
  return { missing, duplicated };
}

test('G1 每个通用资源都声明字段校验或显式豁免（双向）', () => {
  const names = Object.keys(RESOURCE_TABLES);
  assert.ok(names.length >= 25, `只解析到 ${names.length} 个通用资源（基线 25）：抽取面被改坏`);
  const { missing, duplicated } = coverageGaps(names);
  assert.deepEqual(missing, [], `以下通用资源既无字段校验也无豁免理由（请在 write-validation.js 声明）：${missing.join(' / ')}`);
  assert.deepEqual(duplicated, [], `以下资源同时出现在校验表与豁免表（口径冲突）：${duplicated.join(' / ')}`);

  // 校验表条目必须至少声明一个可判字段；否则“有声明”是空的
  const empty = Object.entries(RESOURCE_WRITE_VALIDATION)
    .filter(([, spec]) => !spec || (!spec.title && !spec.status && !spec.type && !(spec.dates || []).length))
    .map(([name]) => name);
  assert.deepEqual(empty, [], `以下资源的校验声明没有任何字段约束：${empty.join(' / ')}`);
});

test('G2 枚举单一源：校验模块从 constants.js / domain.js 取枚举，不另造任务/考勤状态表', () => {
  const src = read('server/routes/resources/write-validation.js');
  assert.match(src, /from '\.\.\/\.\.\/\.\.\/docs\/src\/core\/domain\/constants\.js'/,
    'write-validation.js 未从 core/domain/constants.js 取活动类型 / 任务三态');
  assert.match(src, /from '\.\.\/\.\.\/\.\.\/docs\/src\/core\/domain\/domain\.js'/,
    'write-validation.js 未从 core/domain/domain.js 取考勤状态');
  assert.match(src, /ACTIVITY_SUBTYPES/, '未使用 ACTIVITY_SUBTYPES（活动类型权威子类）');
  assert.match(src, /TASK_STATUS_TONE/, '未使用 TASK_STATUS_TONE（任务三态单一源）');
  assert.match(src, /AttendanceStatus/, '未使用 AttendanceStatus（考勤状态单一源）');
  // 不得在本地手抄任务三态 / 考勤状态字面量数组
  assert.doesNotMatch(src, /\[\s*'pending'\s*,\s*'in_progress'/, '本地手抄了任务三态数组（应引用 TASK_STATUS_TONE）');
  assert.doesNotMatch(src, /\[\s*'present'\s*,\s*'absent'/, '本地手抄了考勤状态数组（应引用 AttendanceStatus）');
});

test('G3 接线：POST / PATCH 落库前校验并返回 422；列表未分页按 LIST_PAGE_ROW_LIMIT 截断且给信号', () => {
  const src = read('server/routes/resources/index.js');
  assert.match(src, /from '\.\/write-validation\.js'/, 'index.js 未引入 write-validation.js');
  assert.match(src, /validateResourceWrite/, 'index.js 未引入 validateResourceWrite');
  assert.match(src, /LIST_PAGE_ROW_LIMIT/, 'index.js 未引入 LIST_PAGE_ROW_LIMIT');

  const postCalls = [...src.matchAll(/validateResourceWrite\(name, row, 'post'\)/g)].length;
  const patchCalls = [...src.matchAll(/validateResourceWrite\(name, req\.body, 'patch'\)/g)].length;
  assert.equal(postCalls, 1, `通用 POST 应恰有一处写口校验（实测 ${postCalls}）`);
  assert.equal(patchCalls, 1, `通用 PATCH 应恰有一处写口校验（实测 ${patchCalls}）`);
  assert.match(src, /writeInvalid\) return res\.status\(422\)/, 'POST 校验失败必须返回 422');
  assert.match(src, /patchInvalid\) return res\.status\(422\)/, 'PATCH 校验失败必须返回 422');

  assert.match(src, /res\.set\('X-Total-Count', String\(rows\.length\)\)/, '列表读口缺 X-Total-Count 信号');
  assert.match(src, /X-Has-More/, '列表读口缺 X-Has-More 信号（不得静默截断）');
  assert.match(src, /rows\.slice\(0, LIST_PAGE_ROW_LIMIT\)/, '列表读口未按 LIST_PAGE_ROW_LIMIT 截断');
  assert.match(src, /Math\.min\(LIST_PAGE_ROW_LIMIT, Number\(query\.pageSize\)/, 'pageSize 未用同一硬上限');
  assert.match(src, /hasMore: start \+ slice\.length < sorted\.length/, '分页响应缺 hasMore 字段');
});

test('G4 行为：乱码 status / 超长 title / 非法日期判 422 文案；合法值放行', () => {
  assert.match(validateResourceWrite('tasks', { title: '任务', status: '乱码' }, 'post') || '', /status 不在允许取值内/,
    'tasks 的乱码 status 必须被判出');
  assert.ok(validateResourceWrite('tasks', { title: '任务', status: 'in_progress' }, 'post') === null,
    'tasks 的合法 status 不得误报');

  const longTitle = 'x'.repeat(TITLE_MAX_LENGTH + 1);
  assert.match(validateResourceWrite('notices', { title: longTitle, content: 'x' }, 'post') || '', /长度不得超过/,
    '超长 title 必须被判出');
  assert.ok(validateResourceWrite('notices', { title: 'x'.repeat(TITLE_MAX_LENGTH) }, 'post') === null,
    '恰好 200 字的 title 必须放行');
  assert.match(validateResourceWrite('notices', { title: '   ' }, 'post') || '', /不得为空/, '纯空白 title 必须被判出');
  assert.ok(validateResourceWrite('todos', {}, 'post') === null,
    '请求体未携带 title 时不得强制必填（历史 / 局部更新兼容；必填仍由前端表单与既有 handler 判据负责）');
  assert.ok(validateResourceWrite('todos', { status: 'completed' }, 'patch') === null,
    'PATCH 未携带 title 时不得要求必填（局部更新）');

  assert.match(validateResourceWrite('activities', { title: '活动', date: '2026/09/08' }, 'post') || '', /YYYY-MM-DD/,
    '非法日期格式必须被判出');
  assert.ok(validateResourceWrite('activities', { title: '活动', date: '2026-09-08', type: '三会一课·党小组会' }, 'post') === null,
    '合法日期与「大类·子类」活动类型必须放行（归一后合法）');
  assert.match(validateResourceWrite('activities', { title: '活动', type: '乱造类型' }, 'post') || '', /type 不在允许取值内/,
    '枚举外活动类型必须被判出');
  assert.match(validateResourceWrite('attendances', { status: 'unknown' }, 'post') || '', /status 不在允许取值内/,
    '枚举外考勤状态必须被判出');
});

test('G5 非空转：G1 覆盖判定对“漏声明”的假集合判红，对完整集合判绿', () => {
  const fakeValidation = { alpha: { title: 'title' } };
  const fakeExemptions = { beta: '聚合快照域，行由父记录复算' };
  const bad = coverageGaps(['alpha', 'beta', 'gamma'], fakeValidation, fakeExemptions);
  assert.deepEqual(bad.missing, ['gamma'], '漏声明的资源未被判出 ⇒ G1 恒真');
  const dup = coverageGaps(['alpha'], fakeValidation, { alpha: '同时声明了两边' });
  assert.deepEqual(dup.duplicated, ['alpha'], '双重声明未被判出 ⇒ G1 半边失效');
  const ok = coverageGaps(['alpha', 'beta'], fakeValidation, fakeExemptions);
  assert.deepEqual(ok, { missing: [], duplicated: [] }, '完整声明被误判 ⇒ 判据过严');
});

test('G6 列表响应形状归一（B-552-2）：分页对象在读口归一为数组，非列表端点不被误伤', () => {
  const adapterSrc = read('docs/src/data/api-adapter.js');
  assert.match(adapterSrc, /_isResourceListPath\(path\) \? normalizeListPayload\(payload\) : payload/,
    'api-adapter 的 `_get` 未在读口应用列表形状归一');
  assert.match(adapterSrc, /Array\.isArray\(payload\.rows\)/,
    '归一判据须只看 `rows` 是否为数组（游标分页不带数字 `total`）');
  assert.doesNotMatch(adapterSrc, /typeof payload\.total === 'number'/,
    '不得再以数字 `total` 为前提，否则游标分支（rows ＋ nextCursor ＋ hasMore）会被漏掉');

  assert.deepEqual(normalizeListPayload([{ id: 'a' }]), [{ id: 'a' }], '裸数组须原样返回');
  const paged = normalizeListPayload({ rows: [{ id: 'a' }], total: 1, pageSize: 20, nextCursor: null, hasMore: false });
  assert.deepEqual([...paged], [{ id: 'a' }], '分页对象须归一为 `rows` 数组');
  assert.equal(paged.nextCursor, null, '`nextCursor` 须保留在归一结果上（不丢元信息）');
  assert.equal(paged.hasMore, false, '`hasMore` 须保留在归一结果上（不丢元信息）');
  const cursorOnly = normalizeListPayload({ rows: [{ id: 'b' }], nextCursor: 'c2', hasMore: true });
  assert.deepEqual([...cursorOnly], [{ id: 'b' }], '游标分支（无数字 `total`）也须归一为数组');
  assert.equal(cursorOnly.nextCursor, 'c2', '游标分支的 `nextCursor` 须保留');
  assert.equal(cursorOnly.hasMore, true, '游标分支的 `hasMore` 须保留');
  const objectEndpoint = { branchId: 'br-b1', asOf: '2026-11-18', items: [{ id: 'g' }] };
  assert.equal(normalizeListPayload(objectEndpoint), objectEndpoint, '非分页对象（如 group-attendance-summary）不得被拆包');
  assert.equal(normalizeListPayload(null), null, '空响应须原样返回');
});
