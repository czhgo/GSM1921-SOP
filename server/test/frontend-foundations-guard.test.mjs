// role: [工程师]+[AI]
// frontend-foundations-guard.test.mjs — 表单 / 错误文案 / nudge 基础设施守卫（batch 2B，2026-10-19）
//
// 覆盖四类「地基」改动（逐条对应本轮审计条目）：
//   F1 label for/id（R4-F05/B06/D08）：四个重点表单的 label 必须指向控件 id；
//      openFormModal 自动生成 `${id}-${key}` 并双向关联。
//   F2 必填与字段错误（R4-F05）：required / aria-required 落到控件；提交失败渲染
//      data-field-error 行、aria-invalid / aria-describedby，并聚焦首个错误字段。
//   F3 错误文案分流（R4-F09/B05/B08）：describeWriteError 按状态码给业务语言，界面不出现 HTTP 数字。
//   F4 nudge 动词（R3-F07）：每个 nudge 场景都有 verb，标题用「本步一般由{who}{verb}」。
//   F5 浮窗退出（R3-D06）：closeModal 150ms 淡出（reduced-motion 为 0），inert / 焦点立即回还。
//   F6 活动详情（R3-D07）：不再出现原生 confirm / prompt / alert。
// 运行：node --test server/test/frontend-foundations-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeWriteError } from '../../docs/src/core/base/utils.js?v=20261020b';
import { NUDGE_TEXTS } from '../../docs/src/components/ui/modal.js?v=20261020b';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const MODAL = read('docs/src/components/ui/modal.js');
const REVIEW_TAB = read('docs/src/entries/tabs/disc/review-tab.js');
const CALENDAR_TAB = read('docs/src/entries/tabs/secretary/calendar-tab.js');
const MEMBER_FLOW = read('docs/src/entries/tabs/org/member-flow-tab.js');
const ACTIVITY = read('docs/src/entries/pages/activity-entry.js');
const PARTY_CONFIG = read('docs/src/entries/tabs/party-committee/party-config-tab.js');
const API_ADAPTER = read('docs/src/data/api-adapter.js');

test('F1 label for/id：四个重点表单的 label 与控件 id 成对', () => {
  const forms = [
    ['docs/src/entries/tabs/secretary/calendar-tab.js', CALENDAR_TAB,
      ['wp-title', 'wp-date', 'wp-time', 'wp-location', 'wp-host']],
    ['docs/src/entries/tabs/org/member-flow-tab.js', MEMBER_FLOW,
      ['flow-intake-name', 'flow-intake-student-id', 'flow-intake-enroll-year', 'flow-intake-party-group', 'flow-intake-text']],
    ['docs/src/entries/pages/activity-entry.js', ACTIVITY,
      ['wa-work-name', 'wa-ddl', 'wa-work-description', 'wa-status']],
  ];
  for (const [rel, src, ids] of forms) {
    for (const id of ids) {
      assert.match(src, new RegExp(`for="${id}"`), `${rel} 缺少 label[for="${id}"]`);
      assert.match(src, new RegExp(`id="${id}"`), `${rel} 缺少控件[id="${id}"]`);
    }
  }

  // 批注 / 经验沉淀走 openFormModal：id 与 label for 由组件统一生成
  assert.match(MODAL, /const fieldId = \(key\) => `\$\{id\}-\$\{key\}`/,
    'openFormModal 应生成稳定字段 id `${id}-${key}`');
  assert.match(MODAL, /<label for="\$\{escHtml\(fid\)\}"/,
    'openFormModal 的 label 应用 for 指向生成 id');
  assert.match(MODAL, /id="\$\{escHtml\(fid\)\}"/,
    'openFormModal 的控件应有对应 id');
  assert.match(REVIEW_TAB, /openFormModal\(/g, '批注 / 经验沉淀应走 openFormModal');
});

test('F2 必填与字段错误：required/aria-required + 错误行 + aria 关联 + 聚焦首错', () => {
  assert.match(MODAL, /required aria-required="true"/,
    'openFormModal 应把 required / aria-required 落到控件');
  assert.match(MODAL, /data-field-error=/,
    'openFormModal 应渲染字段错误行（data-field-error）');
  assert.match(MODAL, /aria-invalid/,
    '字段错误时应设置 aria-invalid');
  assert.match(MODAL, /aria-describedby/,
    '字段错误行应以 aria-describedby 关联控件');
  assert.match(MODAL, /firstControl\?\.focus\(\)/,
    '提交失败应聚焦首个错误字段');
  assert.match(MODAL, /result && result\.ok === false/,
    'onSubmit 应支持 {ok:false, errors} 返回');
});

test('F3 describeWriteError：按状态码分流且界面不出现 HTTP 数字', () => {
  const cases = [
    [{ status: 401 }, '登录已过期，请重新登录'],
    [{ status: 403 }, '当前账号无权办理'],
    [{ status: 403, body: { error: '仅支书可办理' } }, '当前账号无权办理：仅支书可办理'],
    [{ status: 404 }, '记录不存在或已删除'],
    [{ status: 409 }, '已被他人更新，请刷新后重试'],
    [{ status: 428 }, '页面版本过旧，请刷新'],
    [{ status: 408 }, '服务暂时不可用，请稍后重试'],
    [{ status: 500 }, '服务暂时不可用，请稍后重试'],
    [{ status: 503 }, '服务暂时不可用，请稍后重试'],
    [{ type: 'NetworkError' }, '网络异常，请检查连接'],
    [{ name: 'TypeError', message: 'Failed to fetch' }, '网络异常，请检查连接'],
    [{ status: 400, body: { error: '活动名称不能为空' } }, '活动名称不能为空'],
  ];
  for (const [err, expected] of cases) {
    const msg = describeWriteError(err);
    assert.equal(msg, expected, `describeWriteError(${JSON.stringify(err)}) 文案不符`);
    assert.doesNotMatch(msg, /\b[45]\d{2}\b/, `错误文案不得出现 HTTP 状态数字：${msg}`);
  }
  assert.doesNotMatch(describeWriteError({ status: 403, message: 'API 请求失败: 403 Forbidden' }),
    /403|HTTP|API/, '403 的兜底文案不得泄露状态码或原始异常');
});

test('F4 API / 调用点：服务端 body.error 优先，party-config / calendar 走统一文案', () => {
  assert.match(API_ADAPTER, /const serverError = body && typeof body\.error === 'string'/,
    '_request 应优先读取服务端 body.error');
  assert.match(API_ADAPTER, /new Error\(serverError \|\|/, '_request 应优先用 body.error 作 message');
  assert.match(API_ADAPTER, /error\.body = body;/, '_request 应保留结构化 body');
  assert.match(API_ADAPTER, /error\.status = response\.status;/, '_request 应保留 status');

  assert.match(PARTY_CONFIG, /describeWriteError/, 'party-config-tab 应使用 describeWriteError');
  assert.doesNotMatch(PARTY_CONFIG, /HTTP \$\{resp\.status\}/,
    'party-config-tab 不应把 HTTP 状态码显示到界面');
  assert.doesNotMatch(PARTY_CONFIG, /String\(e && e\.message/,
    'party-config-tab 不应把原始异常显示到界面');
  assert.match(CALENDAR_TAB, /showToast\('error', describeWriteError\(err\)\)/,
    'calendar-tab 写入失败分支应走 describeWriteError');
});

test('F5 nudge 动词：每个场景都有 verb，标题按「本步一般由{who}{verb}」', () => {
  const verbs = new Set(['写入', '催办', '赋权', '上传']);
  for (const [key, text] of Object.entries(NUDGE_TEXTS)) {
    assert.ok(verbs.has(text.verb), `${key} 的 nudge verb 缺失或不在约定集合：${text.verb}`);
  }
  assert.match(MODAL, /title: `本步一般由\$\{_nudgeEsc\(whoText\)\}\$\{_nudgeEsc\(verbText\)\}`/,
    'confirmNudge 标题应使用 who + verb');
  assert.match(MODAL, /const verbText = text\.verb \|\| '办理'/, 'nudge 应有 verb 兜底');
});

test('F6 表单按钮与浮窗退出：默认「保存」+ 150ms 淡出 + inert/焦点立即回还', () => {
  assert.match(MODAL, /submitLabel = '保存'/, 'openFormModal 默认提交按钮应为「保存」');
  assert.match(REVIEW_TAB, /submitLabel: '保存批注'/, '批注浮窗应显式「保存批注」');
  assert.match(REVIEW_TAB, /submitLabel: '保存经验沉淀'/, '经验沉淀浮窗应显式「保存经验沉淀」');

  assert.match(MODAL, /prefers-reduced-motion: reduce/, 'closeModal 应尊重 reduced-motion');
  assert.match(MODAL, /setTimeout\(\(\) => overlay\.remove\(\), 150\)/,
    'closeModal 应先 150ms 淡出再移除节点');
  assert.match(MODAL, /_releaseInert\(id\)/, 'inert 还原与焦点回还应立即执行');
});

test('F7 活动详情：7 处原生对话框已全部改为 openModal', () => {
  assert.doesNotMatch(ACTIVITY, /window\.(confirm|prompt|alert)\s*\(/,
    'activity-entry 不应再使用 window.confirm / prompt / alert');
  assert.match(ACTIVITY, /_openConfirm\(\{/, '应使用 _openConfirm 二次确认');
  assert.match(ACTIVITY, /_openNotePrompt\(\{/, '复盘要求应使用 _openNotePrompt（textarea 必填）');
  assert.match(ACTIVITY, /activity-note-input/, '复盘要求应有 textarea');
  assert.match(ACTIVITY, /请写明一句要求内容/, '空值应就地报错');
});
