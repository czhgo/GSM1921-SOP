// role: [工程师]+[AI]
// object-model-guard.test.mjs — 对象模型三层判据守卫（D-868）
//   只守「形状与单一源」：工作组挂靠三字段一致、专班承办方必填、历史补选一次性、专班不产生考勤、母本判据在位。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workgroupRoutes = readFileSync(new URL('../routes/resources/workgroup-routes.js', import.meta.url), 'utf8');
const resourceRoutes = readFileSync(new URL('../routes/resources/index.js', import.meta.url), 'utf8');
const dataModel = readFileSync(new URL('../../content/04_web_design/data/DATA_MODEL.md', import.meta.url), 'utf8');
const { WORK_MAP_MODULES } = await import('../../docs/src/core/domain/work-map.js?v=20261110b');

test('O1 工作组挂靠形状：kind / sourceType / sourceId 三字段一致且创建点过校验', () => {
  assert.match(workgroupRoutes, /export function workgroupShapeDeny/, '缺少 workgroupShapeDeny 单一校验');
  assert.match(workgroupRoutes, /workgroup\.sourceType !== workgroup\.kind/, '必须校验 kind 与 sourceType 一致');
  assert.match(workgroupRoutes, /工作组缺少业务来源/, '必须校验 sourceId 非空');
  const createBlocks = workgroupRoutes.match(/export function create(?:Activity|Taskforce)Workgroup[\s\S]*?\n}/g) || [];
  assert.equal(createBlocks.length, 2, `应有两处创建函数，实测 ${createBlocks.length}`);
  for (const block of createBlocks) assert.match(block, /workgroupShapeDeny\(workgroup\)/, '创建函数必须过形状校验');
});

test('O2 专班新记录必须显式选择承办方（支部级或党小组）', () => {
  assert.match(workgroupRoutes, /export function taskforceScopeDeny/, '缺少 taskforceScopeDeny');
  assert.match(workgroupRoutes, /专班必须选择承办方/, '缺承办方时必须给出明确拒绝');
  assert.match(workgroupRoutes, /支部级专班不指定承办党小组/, '支部级专班不得带 hostGroupId');
  assert.match(resourceRoutes, /taskforceScopeDeny\(db, req\.actor, data\)/, 'POST /taskforces 必须调用承办方校验');
});

test('O3 历史专班承办方只允许一次性补选，且补选后写工作组', () => {
  assert.match(workgroupRoutes, /export function taskforceScopePatchDeny/, '缺少 PATCH 门');
  assert.match(workgroupRoutes, /专班承办方创建后不可修改/, '已声明承办方必须锁死');
  assert.match(resourceRoutes, /taskforceScopePatchDeny\(db, req\.actor, current, req\.body/, 'PATCH /taskforces 必须调用补选门');
  assert.match(resourceRoutes, /scopeFilledBy: req\.actor\.id/, '补选必须留痕操作人');
  assert.match(resourceRoutes, /organizingScope: merged\.organizingScope/, '补选必须同步到工作组');
});

test('O4 专班不产生考勤：work-map 产出只保留考察 / 材料', () => {
  const taskforce = WORK_MAP_MODULES.find((module) => module.id === 'taskforce');
  assert.ok(taskforce, 'work-map 缺 taskforce 模块');
  assert.ok(!taskforce.outputs.includes('考勤'), `专班产出不得含考勤：${JSON.stringify(taskforce.outputs)}`);
  assert.deepEqual(taskforce.outputs, ['考察', '材料']);
});

test('O5 母本写入三层判据与「活动 / 专班并列」边界', () => {
  assert.match(dataModel, /对象模型三层判据/, 'DATA_MODEL 缺三层判据节');
  assert.match(dataModel, /活动与专班互不挂靠/, '必须写明活动与专班并列');
  assert.match(dataModel, /工作组不是第三类业务对象/, '必须写明工作组不是第三类对象');
  assert.match(dataModel, /专班不产生考勤/, '必须写明专班不产生考勤');
});
