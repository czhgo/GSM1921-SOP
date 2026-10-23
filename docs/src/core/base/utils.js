// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  utils.js — 格式化工具、动画辅助、Toast 组件
// ════════════════════════════════════════════════════════════════

import { hasPendingWrites, settleScope, settleWrites } from '../session/pending-writes.js?v=20261023b';

// ── 日期格式化 ─────────────────────────────────────────────────
// R-26③（2026-10-05 批次 388）：日期口径单一源下沉到**零依赖叶子** `core/base/date.js`
//   （`core/domain/constants.js` 这类「被全站 import 且要求双端可载」的件只能引零依赖件；
//   而 `utils.js` 牵 `core/session/pending-writes.js`）⇒ 此处**转出**，既有 `from '…/utils.js'` 调用点不变。
export { _fmtDate, todayLocal } from './date.js?v=20261023b';

export function _fmtChinese(d) {
  const DN = ['日','一','二','三','四','五','六'];
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（周' + DN[d.getDay()] + '）';
}

export function _currentYearMonth() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

/** ISO 时间串 → 'YYYY-MM-DD HH:mm'（去 T 分隔；空值返回 ''） */
export function fmtDt(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 16).replace('T', ' ');
}

// ── HTML 转义（innerHTML 渲染前统一出口，防存储型 XSS）─────────
export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── 写入失败文案（B05 / B08 / R4-F09）──────────────────────────
// 用户界面只讲「发生了什么 + 下一步」，**不显示 HTTP 状态码与原始异常**。
// 401 / 403 才提权限；5xx / 408 一律「稍后重试」；网络层失败单独成句。
/** 服务端错误是否只是技术性报文（不该透给用户） */
function _isTechnicalErrorText(s) {
  return !s || /API 请求失败|Failed to fetch|NetworkError|Load failed|请求超时|Forbidden|Unauthorized|HTTP\s*\d{3}|status\s*\d{3}/i.test(s);
}

/**
 * 把写入异常翻译成用户可读文案。
 * @param {any} err 写入异常（通常带 status / type / body）
 * @returns {string} 面向用户的失败文案
 */
export function describeWriteError(err) {
  const e = err || {};
  const status = Number(e.status || e.body?.status || 0);
  const bodyReason = e.body && typeof e.body.error === 'string' ? e.body.error.trim() : '';
  const message = typeof e.message === 'string' ? e.message.trim() : '';
  const reason = !_isTechnicalErrorText(bodyReason) ? bodyReason
    : (!_isTechnicalErrorText(message) ? message : '');

  if (status === 401) return '登录已过期，请重新登录';
  if (status === 403) return reason ? `当前账号无权办理：${reason}` : '当前账号无权办理';
  if (status === 404) return '记录不存在或已删除';
  if (status === 409) return '已被他人更新，请刷新后重试';
  if (status === 428) return '页面版本过旧，请刷新';
  if (status === 408 || status >= 500) return '服务暂时不可用，请稍后重试';
  if (!status && (e.type === 'NetworkError' || e.name === 'TypeError'
    || /Failed to fetch|NetworkError|Load failed|网络异常|网络连接/i.test(message))) {
    return '网络异常，请检查连接';
  }
  if (reason) return reason;
  return '保存未完成，请稍后重试';
}

// ── Toast 组件 — 浮层通知（固定定位，不影响文档流）─────────────
let _toastContainer = null;

/** 已渲染的 toast 记录（去重 / 上限 / 计时用） */
const _toastRecords = [];
const TOAST_MAX_VISIBLE = 3;
const TOAST_DURATION_MS = 2500;
const TOAST_ERROR_DURATION_MS = 6000;
const TOAST_PENDING_ID = '__pending__';

/**
 * 成功提示的等待裁决（纯函数，供测试直接断言）。
 * @param {{ message: string, error?: any, timedOut?: boolean }} p
 * @returns {{ ok: boolean, type: 'success'|'error', message: string }}
 */
export function resolveToastOutcome({ message, error, timedOut }) {
  if (error) return { ok: false, type: 'error', message: describeWriteError(error) };
  if (timedOut) return { ok: false, type: 'error', message: '保存超时，请检查网络后重试' };
  return { ok: true, type: 'success', message };
}

/**
 * 显示一条浮层 Toast 通知
 *
 * 全站统一「存好了才报成功」（2026-09-17 批次 49，支书裁定）：`success` 是对用户的
 * **承诺**——必须先等这次动作的后台落库真正落地才报；任一落库失败，改报失败，
 * 绝不出现「提示成功、其实没存上」。机制与由来见 `core/session/pending-writes.js`。
 * · 传 `{ scope }` ⇒ **只等本动作的写**（并发动作互不污染）；不传则等全局兜底。
 * · 无在途写（mock 形态常是同步落盘）⇒ 立即渲染，零延迟、与改造前行为一致。
 * · 等待超过 `SUCCESS_TOAST_MAX_WAIT_MS` ⇒ 报超时而非成功（**不许在未确认时声称成功**）。
 * · 失败文案统一走 `describeWriteError`（401/403/408/409/5xx 分级），不暴露原始异常。
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 * @param {{ scope?: any }} [options]
 * @returns {Promise<{ok: boolean, type: string, message: string}>} 最终裁决（便于调用方决定是否刷新）
 */
export function showToast(type, message, options = {}) {
  if (type !== 'success') return Promise.resolve(_renderToast(type, message));
  const scope = options && options.scope;
  if (hasPendingWrites(scope)) _renderToast('info', '保存中…', { key: TOAST_PENDING_ID });   // 超过一瞬的等待先给过渡态，防用户以为卡住而重复点
  let failure = null;
  const settled = (scope ? settleScope(scope) : settleWrites()).catch((e) => { failure = e || new Error('write failed'); });
  const timeout = new Promise((res) => setTimeout(res, SUCCESS_TOAST_MAX_WAIT_MS));
  return Promise.race([settled, timeout]).then(() => {
    const timedOut = !failure && hasPendingWrites(scope);
    if (failure) {
      const outcome = resolveToastOutcome({ message, error: failure });
      _dismissToast(TOAST_PENDING_ID);
      _renderToast('error', outcome.message);
      return outcome;
    }
    if (timedOut) {
      const outcome = resolveToastOutcome({ message, timedOut: true });
      _dismissToast(TOAST_PENDING_ID);
      _renderToast('error', outcome.message);
      return outcome;
    }
    _dismissToast(TOAST_PENDING_ID);
    return _renderToast('success', message);
  });
}

/** 成功提示前的最长确认等待（ms）：等不到确认就报超时，不报成功 */
const SUCCESS_TOAST_MAX_WAIT_MS = 15000;

/**
 * Toast 实际渲染（成功提示的等待逻辑在 `showToast` 收口，见上）。
 * · 同文案同类型去重（更新计数，不追加）；
 * · 最多同时 3 条（超出移除最旧）；
 * · 每条可手动关闭；悬停/聚焦暂停计时；
 * · error 用独立 `role="alert"`（assertive），success/info 用 `role="status"`（polite）。
 * @returns {{ ok: boolean, type: string, message: string }}
 */
function _renderToast(type, message, options = {}) {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.setAttribute('aria-label', '操作提示');
    _toastContainer.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'right:1.5rem',
      'z-index:9999', 'display:flex', 'flex-direction:column',
      'gap:0.5rem', 'pointer-events:auto',
    ].join(';');
    document.body.appendChild(_toastContainer);
  }

  const key = options.key || null;
  // 外部清空容器（如测试/页面重置）后记录失效 ⇒ 先剔除，去重与上限只看真实在屏的
  for (let i = _toastRecords.length - 1; i >= 0; i -= 1) {
    if (!_toastRecords[i].el.isConnected) _toastRecords.splice(i, 1);
  }
  const duplicate = _toastRecords.find((rec) => rec.type === type && rec.key === key
    && rec.message === message && rec.el.isConnected);
  if (duplicate) {
    if (key !== TOAST_PENDING_ID) {
      duplicate.count += 1;
      _paintMessage(duplicate);
    }
    _armToastTimer(duplicate);
    return { ok: type !== 'error', type, message };
  }

  // 状态色点缀（DESIGN_SYSTEM 状态色统一：完成绿 #16A34A / 告警红 #EF4444 / 信息蓝 #3B82F6）
  // 主色收敛原则：Toast 为状态指示，用状态色而非角色主题色；白色实底 + 深色文字保证高对比度
  const COLORS = {
    success: { accent: '#16A34A', bg: '#F0FDF4', icon: '✓' },
    error:   { accent: '#EF4444', bg: '#FEF2F2', icon: '!' },
    info:    { accent: '#3B82F6', bg: '#EFF6FF', icon: 'i' },
  };
  const { accent, bg, icon } = COLORS[type] || COLORS.info;

  const toast = document.createElement('div');
  // error 独立 alert 区（assertive）；success/info 保持 polite
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.style.cssText = [
    `--acc-bg-dark:#1E293B`, `--acc-text-dark:#E2E8F0`, `--acc-border-dark:${accent}`,
    `background:${bg}`,
    `border:1px solid ${accent}`, `border-left:4px solid ${accent}`,
    'border-radius:var(--radius-md)',
    'padding:0.625rem 1rem', 'display:flex', 'align-items:center',
    'gap:0.625rem', 'font-size:0.875rem', 'color:#1F2937',
    'box-shadow:0 4px 24px rgba(0,0,0,0.12)',
    'opacity:0', 'transform:translateY(0.5rem)',
    'transition:opacity 0.25s ease,transform 0.25s ease',
    'pointer-events:auto', 'max-width:22rem', 'word-break:break-word',
  ].join(';');

  // 状态色圆形图标：状态色实底白字（支书 2026-08-11 裁定——toast 状态色本就三色平行，
  // 不属于角色功能色 2×2 规则范围，保持实底白字醒目状态指示）+ 深色正文（textContent 防注入）
  const iconEl = document.createElement('span');
  iconEl.style.cssText = [
    'display:inline-flex', 'align-items:center', 'justify-content:center',
    'width:18px', 'height:18px', 'border-radius:9999px',
    `background:${accent}`, 'color:#fff', 'font-size:11px', 'font-weight:700',
    'flex-shrink:0',
  ].join(';');
  iconEl.textContent = icon;
  const msgEl = document.createElement('span');
  msgEl.style.cssText = 'color:#1F2937;--acc-text-dark:#E2E8F0;flex:1;';
  msgEl.textContent = message;
  const closeEl = document.createElement('button');
  closeEl.type = 'button';
  closeEl.setAttribute('aria-label', '关闭提示');
  closeEl.textContent = '×';
  closeEl.style.cssText = [
    'border:0', 'background:transparent', 'color:inherit', 'opacity:0.55', 'cursor:pointer',
    'font-size:14px', 'line-height:1', 'padding:0 0 0 4px', 'flex-shrink:0',
  ].join(';');

  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  toast.appendChild(closeEl);

  const rec = {
    el: toast, msgEl, key, type, message,
    count: 1,
    duration: type === 'error' ? TOAST_ERROR_DURATION_MS : TOAST_DURATION_MS,
    timer: null,
    paused: false,
  };

  // 上限：超出移除最旧（保持「最新最重要」）
  while (_toastRecords.length >= TOAST_MAX_VISIBLE) {
    _removeToast(_toastRecords[0]);
  }

  _toastRecords.push(rec);
  _toastContainer.appendChild(toast);

  closeEl.addEventListener('click', () => _removeToast(rec));
  toast.addEventListener('mouseenter', () => _pauseToast(rec));
  toast.addEventListener('mouseleave', () => _resumeToast(rec));
  toast.addEventListener('focusin', () => _pauseToast(rec));
  toast.addEventListener('focusout', (e) => { if (!toast.contains(e.relatedTarget)) _resumeToast(rec); });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }));

  _armToastTimer(rec);
  return { ok: type !== 'error', type, message };
}

function _paintMessage(rec) {
  rec.msgEl.textContent = rec.count > 1 ? `${rec.message}（×${rec.count}）` : rec.message;
}

function _armToastTimer(rec) {
  clearTimeout(rec.timer);
  if (rec.paused) return;
  rec.timer = setTimeout(() => _removeToast(rec), rec.duration);
}

function _pauseToast(rec) {
  rec.paused = true;
  clearTimeout(rec.timer);
}

function _resumeToast(rec) {
  if (!rec.paused) return;
  rec.paused = false;
  _armToastTimer(rec);
}

function _removeToast(rec) {
  clearTimeout(rec.timer);
  const i = _toastRecords.indexOf(rec);
  if (i >= 0) _toastRecords.splice(i, 1);
  rec.el.style.opacity = '0';
  rec.el.style.transform = 'translateY(0.5rem)';
  setTimeout(() => rec.el.remove(), 300);
}

/** 取走过渡态（最终结果出现时替换掉它，不叠加） */
function _dismissToast(key) {
  for (const rec of [..._toastRecords]) {
    if (rec.key === key) _removeToast(rec);
  }
}

export function getBasePath() {
  // 子目录页面已通过 <base href="../"> 将基准URL调至 docs/
  // JS动态内容同样受 <base> 影响，因此始终返回 './'
  return './';
}

/**
 * 同文档锚点（R5A-01）：工作台 `<base href="../">` 下，裸 `href="#x"` 会被解析成
 * 「站点根 + #x」而不是当前文档。动态生成的页内锚点一律经此函数转成
 * `当前路径 + 当前查询串 + #x`，点击时只滚动、不离开当前工作台。
 * @param {string} hash 形如 '#wo-lines' 或 'wo-lines'
 * @returns {string}
 */
export function docAnchorHref(hash) {
  const frag = String(hash || '').startsWith('#') ? String(hash) : `#${hash}`;
  if (typeof window === 'undefined' || !window.location) return frag;
  return `${window.location.pathname}${window.location.search}${frag}`;
}

/**
 * 跳转定位高亮（支书 2026-08-08 裁定：高亮须自动褪去，不得一直亮着）
 * 首页跳转携带 activityId/taskforceId 等参数时，工作台定位元素后应用本高亮：
 *  - 定时自动褪去（默认 2.8s）
 *  - 用户点击该元素即提前褪去
 *  - 褪去时通过 transition 平滑淡出（非硬切）
 * @param {HTMLElement} el — 目标元素
 * @param {Object} [opts]
 * @param {number} [opts.duration=2800] — 自动褪去毫秒数
 * @param {string} [opts.className='nav-flash-highlight'] — 高亮 CSS 类
 */
export function flashHighlight(el, { duration = 2800, className = 'nav-flash-highlight' } = {}) {
  if (!el || !el.classList || typeof el.classList.add !== 'function') return;
  el.classList.add(className);
  const off = () => {
    el.style.transition = 'box-shadow .6s ease, border-color .6s ease, background .6s ease';
    el.classList.remove(className);
  };
  el.addEventListener('click', off, { once: true });
  setTimeout(off, duration);
}

/** 2026-08-28 T-304 A 档下载闭环：通用 CSV 导出（UTF-8 BOM，Excel 中文不乱码） */
export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 2026-08-28 T-304 A 档下载闭环：触发打印（配合 @media print 样式） */
export function triggerPrint() {
  window.print();
}

/** 2026-08-28 T-304 A 档下载闭环：通用 Blob 下载（模板/材料/导出共用） */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 2026-08-28 T-304 A 档下载闭环：通用 URL 下载（dataURL 直下 / 服务端文件带鉴权拉取） */
export async function downloadUrl(url, filename, fetchInit) {
  try {
    const resp = await fetch(url, fetchInit);
    if (!resp.ok) throw new Error(`下载失败(${resp.status})`);
    downloadBlob(filename, await resp.blob());
    return true;
  } catch (e) {
    console.warn('[downloadUrl]', e);
    return false;
  }
}
