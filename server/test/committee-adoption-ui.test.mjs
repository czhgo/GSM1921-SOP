// role: [工程师]+[AI]
// committee-adoption-ui.test.mjs — 党委活动在支部侧的采用界面（批次 534 · Task 9）静态守卫
//
// 为什么用静态断言：这层界面全部依赖服务端语义端点（采用 / 同步 / 强调通知），
//   纯 node 形态无法起支部会话与党委内容夹具；本文件只钉「入口在、判据在、文案在、口径不漂」，
//   行为验收仍由 server/test/committee-activities.test.mjs（服务端）与真机冒烟承担。
//
// 判据：
//   U1 服务模块导出采用 / 同步 / 强调通知 / canAdopt，且走 Bearer + api 数据源门；
//   U2 详情页承载「院级 / 源自党委活动 / 采用到本支部 / 同步党委内容 / 发送强调通知 / 已采用只读横幅」；
//   U3 支书列表与成员列表都有「院级」来源标识；成员列表不得出现采用入口（采用权在支书 / 副支书）；
//   U4 副本版本落后提示与强调通知 24 小时限频判据在位；
//   U5 新增界面不引入裸 `text-[13px]`，新增文案块不写硬编码 hex。
//
// 运行：node --test server/test/committee-adoption-ui.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const read = (rel) => readFileSync(join(SRC, rel), 'utf8');
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;

/** 取 start 之后、end 之前的源码（找不到时返回空串；供「新增块」局部断言） */
function between(src, start, end) {
  const from = src.indexOf(start);
  if (from < 0) return '';
  const to = src.indexOf(end, from + start.length);
  return to < 0 ? src.slice(from) : src.slice(from, to);
}

test('U1 服务模块：采用 / 同步 / 强调通知 / canAdopt 导出且走服务端语义端点', () => {
  const src = read('services/activity/committee-activity.js');
  for (const fn of ['canAdopt', 'adoptActivity', 'syncFromSource', 'sendEmphasisNotice', 'emphasisCooldownMs', 'isSourceOutdated']) {
    assert.ok(new RegExp(`export function ${fn}\\(`).test(src), `服务模块缺导出 ${fn}()`);
  }
  assert.match(src, /\/api\/v1\/activities\/\$\{encodeURIComponent\(id\)\}\/adopt/, '缺 adopt 端点');
  assert.match(src, /\/api\/v1\/activities\/\$\{encodeURIComponent\(id\)\}\/sync-source/, '缺 sync-source 端点');
  assert.match(src, /\/api\/v1\/activities\/\$\{encodeURIComponent\(id\)\}\/emphasis-notice/, '缺 emphasis-notice 端点');
  assert.ok(src.includes("Authorization: `Bearer ${getAuthToken()}`"), '语义端点须带 Bearer token');
  assert.ok(src.includes("getDataSource() !== 'api'"), '非 api 数据源须显式拒绝（不得假装本地成功）');
  assert.ok(src.includes('status: 408'), '超时须落 408（供调用方区分网络失败）');
  assert.ok(src.includes('EMPHASIS_NOTICE_WINDOW_MS'), '限频窗口须消费 constants 单一源');
});

test('U2 详情页：院级 / 副本来源 / 采用 / 同步 / 强调通知 / 已采用只读横幅齐备', () => {
  const src = read('entries/pages/activity-entry.js');
  for (const text of [
    '院级', '源自党委活动', '采用到本支部', '同步党委内容', '发送强调通知',
    '本支部已采用，请在支部副本中维护执行信息',
  ]) {
    assert.ok(src.includes(text), `详情页缺文案「${text}」`);
  }
  assert.ok(src.includes('adoptActivity('), '详情页未调用 adoptActivity');
  assert.ok(src.includes('syncFromSource('), '详情页未调用 syncFromSource');
  assert.ok(src.includes('sendEmphasisNotice('), '详情页未调用 sendEmphasisNotice');
  assert.ok(src.includes('role="note"'), '只读横幅须用 role="note"（不得用 alert）');
  assert.ok(src.includes('committeeSourceLocked'), '缺「本支部已有副本 ⇒ 原件只读」判据');
  assert.ok(src.includes('committeeTargetsMe') && src.includes('targetsBranch('),
    '党委原件详情门须按目标支部命中放行（否则支部账号直开原件被跨支部门挡掉）');
});

test('U3 列表：支书台与成员台都有「院级」来源标识；成员台不得出现采用入口', () => {
  const secretary = read('entries/tabs/secretary/calendar-tab.js');
  const visitor = read('entries/tabs/visitor/activities-tab.js');
  assert.ok(secretary.includes('院级'), '支书活动列表缺「院级」标识');
  assert.ok(secretary.includes('源自党委'), '支书活动列表缺「源自党委」标识');
  assert.ok(secretary.includes('上级 v'), '支书活动列表缺副本「上级 vN」');
  assert.ok(secretary.includes('canAdopt('), '支书列表缺可采用判据');
  assert.ok(secretary.includes('adoptActivity('), '支书列表缺采用写口');

  assert.ok(visitor.includes('院级'), '成员活动列表缺「院级」标识');
  assert.ok(visitor.includes('源自党委'), '成员活动列表缺「源自党委」标识');
  assert.ok(!visitor.includes('canAdopt(') && !visitor.includes('adoptActivity('),
    '成员列表不得出现采用入口（采用权在支书 / 副支书）');
});

test('U4 副本版本落后提示与强调通知 24 小时限频判据在位', () => {
  const entry = read('entries/pages/activity-entry.js');
  assert.ok(entry.includes('党委已更新至 v'), '详情页缺「党委已更新至 vN」提示');
  assert.ok(entry.includes('isSourceOutdated('), '详情页未消费 isSourceOutdated()');
  assert.ok(entry.includes('emphasisCooldownMs('), '详情页未消费 emphasisCooldownMs()');
  assert.ok(entry.includes('retryAfterMs'), '429 时须用服务端 retryAfterMs 报剩余时间');
  assert.ok(entry.includes('小时后可再次发送'), '缺限频剩余时间文案');
});

test('U5 新增界面不引入裸 text-[13px]，新增块无硬编码 hex', () => {
  const service = read('services/activity/committee-activity.js');
  assert.ok(!HEX_RE.test(service), '新增服务模块不得写硬编码 hex（颜色一律走令牌 / 组件类）');
  assert.ok(!service.includes('text-[13px]'), '新增服务模块不得写裸 text-[13px]');

  const entry = read('entries/pages/activity-entry.js');
  assert.ok(!entry.includes('text-[13px]'), '详情页新增块不得写裸 text-[13px]');
  const banner = between(entry, '${committeeActivity ? `', '${_nextStepRowHtml(');
  assert.ok(banner.length > 200, '抽取口径失效：详情横幅块为空（守卫会恒真）');
  assert.ok(!HEX_RE.test(banner), '详情横幅块不得写硬编码 hex');
  const emphasisCard = between(entry, '${committeeCopy && canManageThisCopy', '<!-- 报名名单 -->');
  assert.ok(emphasisCard.length > 100, '抽取口径失效：强调通知块为空');
  assert.ok(!HEX_RE.test(emphasisCard), '强调通知块不得写硬编码 hex');

  const calendar = read('entries/tabs/secretary/calendar-tab.js');
  assert.ok(!calendar.includes('text-[13px]'), '支书列表新增块不得写裸 text-[13px]');
  const calendarBlock = between(calendar, 'let _committeeMarkObserver = null;', 'function _watchCommitteeRows()');
  assert.ok(calendarBlock.length > 500, '抽取口径失效：支书列表院级块为空');
  assert.ok(!HEX_RE.test(calendarBlock), '支书列表院级块不得写硬编码 hex');

  const visitor = read('entries/tabs/visitor/activities-tab.js');
  const visitorRow = between(visitor, 'function _activityRowHtml(a) {', '// 活动动态列表分页');
  assert.ok(visitorRow.length > 300, '抽取口径失效：成员列表行为空');
  assert.ok(!visitorRow.includes('text-[13px]'), '成员列表行新增块不得写裸 text-[13px]');
});
