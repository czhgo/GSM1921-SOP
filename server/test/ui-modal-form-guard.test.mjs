// role: [工程师]+[AI]
// ui-modal-form-guard.test.mjs — 浮窗表单统一体例守卫（2026-10-20 · R3-01/02/09/10）
//
// 背景（`.ctx/logs/archive/2026-10/UI_AUDIT_R3.md` 判例②）：
//   浮窗的问题不在字段多少，而在「动作位置 / 关闭语义 / 移动端」三处——
//   · R3-01 成员档案标题拼 HTML，被 escHtml 后逐字显示；
//   · R3-02 取消写入不 reset，`pendingAuth` 残留到下一次写入；
//   · R3-10 提交按钮写在 `.modal-body` 文末，长表单滚出视口；390px 两列挤压。
// 判据（本守卫）：
//   1. modal.js 必须提供 sticky footer / dvh / safe-area / onCancel，标题只走 textContent；
//   2. 全站 openModal 调用不得在 footerHtml 之外放提交按钮（白名单需写理由）；
//   3. person-edit-modal 的标题必须是纯文本（链接在 body 内）；
//   4. 写入活动的取消 / Esc / 遮罩必须清 `wp.pendingAuth`。
// 非空转：先跑「提取调用 / 判定提交按钮」的自检，防止解析写坏后恒绿。
// 运行：node --test server/test/ui-modal-form-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const MODAL = readFileSync(join(SRC, 'components/ui/modal.js'), 'utf8');
const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8');

const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

/** 递归列出 docs/src 下全部 .js（跳过生成物 / 第三方） */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

/**
 * 从 `openModal(` 起点截取完整调用（括号配平；跳过字符串 / 模板串）。
 * 为什么要自己配平：bodyHtml 里全是模板串与花括号，正则截不准。
 */
function extractCall(src, startIdx) {
  const open = src.indexOf('(', startIdx);
  if (open === -1) return '';
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  return src.slice(startIdx);
}

/** 提交类按钮的标记（openFormModal 的 footer 用 data-modal-submit；写入活动用 data-action） */
const SUBMIT_MARK = /type="submit"|data-action="wp-submit"|data-modal-submit=/;

/** 判定一个 openModal 调用是否把提交按钮写在了 footer 之外 */
function submitOutsideFooter(callText) {
  const submitIdx = callText.search(SUBMIT_MARK);
  if (submitIdx === -1) return false;
  const footerIdx = callText.indexOf('footerHtml');
  return footerIdx === -1 || submitIdx < footerIdx;
}

// 白名单：{ 文件相对路径: 理由 }。当前无例外——新增例外必须在这里写明「为什么不能进 footer」。
const SUBMIT_OUTSIDE_FOOTER_WHITELIST = {};

test('G1 非空转自检：能截取调用，且能识别 body 内 / footer 内的提交按钮', () => {
  const src = [
    'openModal({ id: "a", bodyHtml: `<button type="submit">保存</button>` });',
    'openModal({ id: "b", bodyHtml: `<p>x</p>`, footerHtml: `<button type="submit">保存</button>` });',
  ].join('\n');
  const a = extractCall(src, src.indexOf('openModal'));
  const b = extractCall(src, src.indexOf('openModal', src.indexOf('openModal') + 1));
  assert.match(a, /bodyHtml/);
  assert.equal(submitOutsideFooter(a), true, 'body 内的提交按钮应被判为违规');
  assert.equal(submitOutsideFooter(b), false, 'footer 内的提交按钮不应被判为违规');
});

test('G2 modal.js：header 纯文本 / sticky footer / dvh / safe-area / onCancel 齐备', () => {
  assert.match(MODAL, /export function openModal\(/, 'openModal 应保留统一入口');
  assert.match(MODAL, /footerHtml = ''/, 'openModal 应提供 footerHtml');
  assert.match(MODAL, /footerSticky = true/, '页脚应默认 sticky（调用方不必重复写）');
  assert.match(MODAL, /onCancel = null/, 'openModal 应提供 onCancel');
  assert.match(MODAL, /_requestCancel\(id\)/, 'Esc / 遮罩 / × 应走统一取消入口');
  assert.match(MODAL, /class="modal-footer\$?\{?/, '页脚应由统一类名渲染');
  assert.match(MODAL, /titleEl\.textContent\s*=/, '标题必须用 textContent 写入（禁止 HTML）');
  assert.doesNotMatch(MODAL, /<h3[^>]*>\$\{/, '标题不得直接以 HTML 插值');

  // CSS：高度 dvh（软键盘不遮底）、footer sticky、safe-area、≤640px 单列
  const panelRule = CSS.match(/\.modal-panel\s*\{[\s\S]*?\}/)?.[0] || '';
  assert.match(panelRule, /max-height:\s*min\(92dvh/, '浮窗高度应用 min(92dvh, …)');
  const footerRule = CSS.match(/\.modal-footer--sticky\s*\{[\s\S]*?\}/)?.[0] || '';
  assert.match(footerRule, /position:\s*sticky/, 'footer 必须 sticky');
  assert.match(footerRule, /env\(safe-area-inset-bottom/, 'footer 必须支持 safe-area');
  const mobile = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));
  assert.match(mobile, /\.modal-form-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/, '≤640px 表单应单列');
});

test('G3 全站 openModal：提交按钮不得在 footerHtml 之外（白名单须写理由）', () => {
  const violations = [];
  let calls = 0;
  let footerCalls = 0;
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    let idx = src.indexOf('openModal(');
    while (idx !== -1) {
      // 跳过定义处 `export function openModal(`
      if (!/function\s+$/.test(src.slice(Math.max(0, idx - 24), idx))) {
        calls += 1;
        const call = extractCall(src, idx);
        if (call.includes('footerHtml')) footerCalls += 1;
        if (submitOutsideFooter(call)) {
          const rel = relative(ROOT, file).replace(/\\/g, '/');
          if (!SUBMIT_OUTSIDE_FOOTER_WHITELIST[rel]) violations.push(rel);
        }
      }
      idx = src.indexOf('openModal(', idx + 1);
    }
  }
  assert.ok(calls >= 20, `openModal 调用盘点面不足（${calls}），解析可能写坏`);
  assert.ok(footerCalls >= 15, `采用统一 footer 的调用面不足（${footerCalls}），体例未铺开`);
  assert.deepEqual([...new Set(violations)], [],
    `以下 openModal 调用把提交按钮放在 footer 之外：${[...new Set(violations)].join(', ')}`);
});

test('G4 成员档案浮窗：标题纯文本，完整档案入口在 body 内', () => {
  const src = read('components/governance/person-edit-modal.js');
  const title = src.match(/title:\s*`([^`]*)`/)?.[1] ?? '';
  assert.ok(title, 'person-edit-modal 应有 title');
  assert.doesNotMatch(title, /<[a-z/]/i, 'R3-01：标题不得拼 HTML 标签');
  assert.match(src, /data-person-archive-link/, '「查看完整档案」应作为 body 内按钮');
  assert.match(src, /data-modal-submit="\$\{MODAL_ID\}"/, '保存按钮应在统一 footer');
  // 只读区去重：非 selfOnly 时只保留不可改的 3 项（角色 / 支部 / 留痕）
  assert.match(src, /selfOnly \? readonlyAll : \[/, '只读区应按 selfOnly 分流');
});

test('G5 写入活动：取消 / Esc / 遮罩都清 pendingAuth', () => {
  const cal = read('entries/tabs/secretary/calendar-tab.js');
  const dt = read('services/activity/decision-tree.js');
  assert.match(cal, /onCancel:\s*_resetWriteState/, 'openModal 应挂 onCancel');
  assert.match(cal, /function _resetWriteState\(\)\s*\{[\s\S]*?wp\.reset\(\)/, '_resetWriteState 应调用 wp.reset()');
  assert.match(cal, /case 'wp-cancel'[\s\S]*?_resetWriteState\(\)/, '取消按钮应清临时状态');
  const resetBody = dt.match(/reset\(\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '';
  assert.match(resetBody, /this\.pendingAuth\s*=\s*\[\]/, 'DecisionTreeState.reset 应清 pendingAuth');
});
