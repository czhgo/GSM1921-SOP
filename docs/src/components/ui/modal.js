// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  modal.js — 通用浮窗组件
// ════════════════════════════════════════════════════════════════
//  设计原则：点击按钮→弹出浮窗→在浮窗中完成写入→关闭浮窗
//  页面保持清爽，所有表单/编辑器都在浮窗中完成

import { escHtml } from '../../core/base/utils.js?v=20261023a';

// 2026-09-13 修复（成员档案模态走查暴露）：Esc 监听原只在「按 Esc 关闭」这一条路径上注销，
// 走遮罩点击/关闭按钮/程序化 closeModal 关闭时监听残留 → 反复打开同一 id 浮窗会累积 keydown
// 监听（内存泄漏 + 多次无谓 closeModal）。现改为**按 id 登记**，closeModal 统一注销（全路径覆盖）。
const _escHandlers = new Map();
// 「必须点按钮才能关」的浮窗 id 集（`openModal({dismissable:false})` ⇒ 现只有「本位」nudge，见 `confirmNudge`）。
// 它开着时，**其它浮窗的 Esc 关闭一律让位**——2026-09-23 真机核验发现：nudge 弹在写入浮窗之上时按一下 Esc，
// 会把**底下那个还没提交的表单浮窗**关掉（表单一关、nudge 却还在，用户已填内容无声丢失）。
// 故 Esc 只在「没有 blocking 浮窗」时才生效（nudge 自身本就不挂 Esc 监听）。
const _blockingModalIds = new Set();
// 2026-09-24 无障碍（对话框语义 / 焦点接管）：本组件此前用 div 拼浮窗——无 role="dialog"、无 aria-modal、
// 打开不把焦点移入、背景仍可 Tab（实测：打开「写入活动」后 activeElement=BODY、浮窗后 53 个可聚焦元素在 Tab 序列）。
// 现补两本台账：
//   · `_openers`    —— 打开浮窗前的 `document.activeElement`（关闭时把焦点**还给打开它的那个元素**）；
//   · `_inertState` —— 打开时给「浮窗之外的 body 子元素」（header / 侧栏 / 主内容）保存的 inert 原值，
//                      关闭时逐条还原（**不是**一律设 false——侧栏折叠态本就 inert，不能被顺手解除）。
// 嵌套浮窗（nudge 压在表单浮窗之上）由「逐层保存 / 逐层还原」自然处理。
const _openers = new Map();
const _inertState = new Map();
// 取消回调台账（2026-10-20 · R3-02）：ESC / 遮罩 / × / [data-modal-cancel] 四条「放弃」路径统一走
// `_requestCancel`，先执行调用方的 `onCancel` 清临时状态，再关窗。提交成功走 `closeModal`（不触发）。
// 为什么集中在这里：取消语义必须是「放弃本次编辑」，若每个调用点各写一套，总有一条路径会漏（R3-02 即此）。
const _cancelHandlers = new Map();

/** 浮窗尺寸档（统一体例；调用方仍可用 width 覆盖） */
const MODAL_SIZES = { sm: '400px', md: '480px', lg: '720px' };

/** 浮窗内可聚焦元素的选择器（排除 tabindex="-1" 这类只可编程聚焦的节点） */
const _FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * 把焦点移入浮窗：优先「正文（.modal-body）里第一个可聚焦元素」——
 * 避免一进浮窗焦点就落在右上角 × 上；正文里没有可聚焦元素时退回 panel 内任意可聚焦元素；
 * 再没有就把 panel 自身设为 tabindex="-1" 后聚焦（此时至少要读得到标题）。
 */
function _focusInto(panel) {
  // ⚠ 选择器必须**限定在 .modal-body 内**：原写法 `.modal-body ${_FOCUSABLE}` 只给第一个
  //   逗号分支加了前缀，`panel.querySelector` 会把 header 里的 × 当成首个可聚焦元素
  //   （2026-10-19 U-05 真机复核实测：打开招募浮窗后 activeElement 是关闭按钮）。
  const body = panel.querySelector('.modal-body');
  const target = (body && body.querySelector(_FOCUSABLE)) || panel.querySelector(_FOCUSABLE);
  if (target) { target.focus(); return; }
  panel.setAttribute('tabindex', '-1');
  panel.focus();
}

/** 打开浮窗时：把浮窗之外的 body 子元素设为 inert（覆盖 header / 侧栏 / 主内容），并记下原值供还原 */
function _applyInert(overlay, id) {
  const saved = [];
  for (const el of Array.from(document.body.children)) {
    if (el === overlay) continue; // 浮窗自己（及其内容）不得 inert，否则浮窗内也点不动 / 聚焦不了
    saved.push([el, el.inert]);
    el.inert = true;
  }
  _inertState.set(id, saved);
}

/** 「取消」统一入口：先跑调用方的 onCancel（清临时状态），再关窗 */
function _requestCancel(id) {
  const fn = _cancelHandlers.get(id);
  _cancelHandlers.delete(id);
  if (typeof fn === 'function') {
    try { fn(); } catch (err) { console.warn('[modal] onCancel 回调异常：', err); }
  }
  closeModal(id);
}

/** 关闭浮窗时：还原 inert 原值 + 把焦点还给打开它的元素 */
function _releaseInert(id) {
  const saved = _inertState.get(id);
  if (saved) {
    for (const [el, prev] of saved) { if (document.contains(el)) el.inert = prev; }
    _inertState.delete(id);
  }
  const opener = _openers.get(id);
  _openers.delete(id);
  if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
}

/**
 * 打开一个浮窗
 * @param {Object} options
 * @param {string} options.id - 浮窗唯一标识（用于关闭时查找）
 * @param {string} options.title - 浮窗标题（**纯文本**；以 textContent 写入，传 HTML 也只会显示原文）
 * @param {string} options.bodyHtml - 浮窗内容 HTML（表单请用 `<fieldset class="modal-fieldset">` 分组）
 * @param {Function} options.onMount - 浮窗挂载后的回调（绑定事件等），参数为浮窗容器
 * @param {string} [options.width] - 覆盖宽度（一般不传，改用 size）
 * @param {'sm'|'md'|'lg'} [options.size='md'] - 尺寸档（400 / 480 / 720px）
 * @param {string} [options.accentColor='var(--accent-blue)'] - 标题栏强调色
 * @param {string} [options.footerHtml=''] - 页脚动作 HTML（取消 + 提交；**固定在 `.modal-body` 之外**）
 * @param {boolean} [options.footerSticky=true] - 页脚是否 sticky（默认即符合体例，调用方不必重复写）
 * @param {Function} [options.onCancel] - 「取消」回调（取消按钮 / Esc / 遮罩 / × 四条路径统一触发；
 *   用于清临时状态。提交成功的 `closeModal` 不触发）
 * @param {{href:string,text:string}} [options.settingsLink] - 页脚「设置」入口（可选；不传则无此行）
 * @param {boolean} [options.dismissable=true] - 是否可「非按钮」关闭（点遮罩 / 按 Esc / 右上角 ×）。
 *   缺省 true＝既有行为；**false 只给「本位」nudge 用**（见 `confirmNudge`）——那种弹窗**必须点按钮才能关**。
 * @returns {HTMLElement} 浮窗面板元素
 */
// 2026-09-21 批次 138（支书第 ⑤ 条「浮窗的特定位置 → 跳转 setting」）：把批次 99 在支书台「写入活动」
// 浮窗里手写的那条页脚深链收进本组件做**单一源**——位置固定在浮窗**页脚**（`.modal-body` 之外，
// 切步骤/切换内容不消失），各调用点只传 `settingsLink`（href + 文案），不再各写一套 DOM。
// 未传者不渲染（确认 / 删除类浮窗不加，避免噪声）。
// 2026-09-21 批次 139：把「浮窗页脚那条相关设置深链」的**标记**抽成本导出——单一源供两类浮窗共用：
//   ① 本组件自身的 `openModal`（常规浮窗）；② **自建浮层**（不走本组件、自持 body 的那种，见
//   `entries/tabs/prop/archive-tab.js` 的上传浮层）——它只需在自己的页脚插入本函数的结果，
//   不必复制一份 HTML（避免"同一段标记两处各写一套"）。文案与样式与批次 99 手写那条逐字同款。
/** 页脚设置深链的统一短文案（R3-25：完整口径在 help，不在浮窗里折行写长句） */
export const SETTINGS_LINK_TEXT = '制度参数 →';

/** 文案归一：缺省或过长一律回落到统一短文案（调用点不必各写一遍长度判断） */
function _normalizeSettingsText(text) {
  const raw = String(text == null ? '' : text).trim();
  return raw && raw.length <= 12 ? raw : SETTINGS_LINK_TEXT;
}

export function settingsLinkHTML(settingsLink) {
  if (!settingsLink) return '';
  const text = _normalizeSettingsText(escHtml(settingsLink.text));
  return `<div class="modal-settings-link" style="padding:10px 20px;border-top:1px solid var(--neutral-200);font-size:0.72rem;line-height:1.7;color:var(--neutral-500);"><a href="${escHtml(settingsLink.href)}" style="color:var(--app-accent-text);text-decoration:underline;white-space:nowrap;">${text}</a></div>`;
}

// ════════════════════════════════════════════════════════════════
//  浮窗统一体例（2026-10-20 · R3-01/02/09/10）
//  · 结构：header（纯文本标题，禁止 HTML）/ body（分组 fieldset）/ footer（取消 + 提交，sticky）
//  · 尺寸：max-height:min(92dvh, 900px)（软键盘弹起也不遮底部）；≤640px 单列；footer 吃 safe-area
//  · 状态：取消 / Esc / 遮罩 / × 统一走 `onCancel`；提交中由调用方禁用按钮；失败留在浮窗内
//  调用方只需给 `footerHtml`（动作行）与 `onCancel`（清临时状态），布局与关闭语义由本组件统一。
// ════════════════════════════════════════════════════════════════
export function openModal({
  id, title, bodyHtml, onMount,
  width = '', size = 'md',
  accentColor = 'var(--accent-blue)', settingsLink = null,
  dismissable = true,
  footerHtml = '', footerSticky = true,
  onCancel = null,
}) {
  // 关闭已有同 id 浮窗
  closeModal(id);
  // 上一个同 id 浮窗可能还在 150ms 淡出中：立刻摘掉它，避免与新浮窗同 id 并存
  let stale = document.getElementById(`modal-overlay-${id}`);
  while (stale) {
    stale.remove();
    stale = document.getElementById(`modal-overlay-${id}`);
  }

  // 打开前的焦点位置：关闭时还给它（键盘用户不再被丢回页面开头）
  const opener = document.activeElement;
  const titleId = `modal-title-${id}`;

  const overlay = document.createElement('div');
  overlay.id = `modal-overlay-${id}`;
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;';

  const panel = document.createElement('div');
  // role="dialog" + aria-modal + aria-labelledby：让读屏把浮窗识别为模态对话框并以标题为名
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', titleId);
  const sizeWidth = MODAL_SIZES[size] || MODAL_SIZES.md;
  panel.className = `modal-panel modal-panel--${size}`;
  panel.style.setProperty('--modal-width', width || sizeWidth);
  panel.style.setProperty('--modal-accent', accentColor);
  panel.style.animation = 'slideUp 0.2s ease';

  const settingsHTML = settingsLinkHTML(settingsLink);

  // dismissable=false（「本位」nudge 专用，见 confirmNudge）：**不渲染右上角 ×**——
  // 那种弹窗只给两个动作按钮（主 / 次），不给第二条退出路径（2026-09-23 支书裁定）。
  const closeBtnHTML = dismissable
    ? `<button data-modal-close="${id}" aria-label="关闭" style="background:none;border:none;cursor:pointer;color:var(--neutral-400);line-height:1;padding:4px 8px;border-radius:var(--radius-sm);transition:background-color 0.15s ease, color 0.15s ease;" class="btn-ghost text-xl modal-close-btn" onmouseover="this.style.background='var(--neutral-100)';this.style.color='var(--neutral-600)'" onmouseout="this.style.background='none';this.style.color='var(--neutral-400)'">&times;</button>`
    : '';

  // 页脚：动作行固定在 `.modal-body` 之外（长表单滚到底也能点），sticky 吃 safe-area。
  const footerHTML = footerHtml
    ? `<div class="modal-footer${footerSticky ? ' modal-footer--sticky' : ''}" data-modal-footer>${footerHtml}</div>`
    : '';

  panel.innerHTML = `
    <div class="modal-header">
      <h3 id="${titleId}" class="modal-title font-title-cn"></h3>
      ${closeBtnHTML}
    </div>
    <div class="modal-body">
      ${bodyHtml}
    </div>
    ${footerHTML}
    ${settingsHTML}
  `;
  // 标题唯一入口 = textContent：调用方即使误传 HTML 也只会显示原文（R3-01 根因是 escHtml 后仍按 HTML 解释）
  const titleEl = panel.querySelector('.modal-title');
  if (titleEl) titleEl.textContent = String(title == null ? '' : title);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 背景 inert（浮窗之外的 body 子元素）——浮窗开着时背景不进 Tab 序列、读屏也读不到；
  // 关闭时由 `_releaseInert` 逐条还原（保留他处对 inert 的使用，如折叠侧栏）
  _applyInert(overlay, id);
  _openers.set(id, opener);
  if (typeof onCancel === 'function') _cancelHandlers.set(id, onCancel);

  // 取消按钮（footer / body 内任意 [data-modal-cancel]）走统一入口，调用方无需各绑一次
  panel.addEventListener('click', (e) => {
    if (e.target.closest(`[data-modal-cancel="${id}"]`)) _requestCancel(id);
  });

  // 三条「非按钮」关闭路径（遮罩点击 / × / Esc）**只在 dismissable 时挂**——
  // nudge 弹窗要求「必须点击按钮才可以关闭」：不点遮罩关、不按 Esc 关、不自动超时。
  if (dismissable) {
    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _requestCancel(id);
    });

    // 关闭按钮
    panel.querySelector(`[data-modal-close="${id}"]`).addEventListener('click', () => _requestCancel(id));

    // ESC 关闭（监听按 id 登记，closeModal 全路径统一注销）
    const escHandler = (e) => {
      if (e.key !== 'Escape') return;
      // 有 blocking 浮窗（nudge）在顶 ⇒ 让位：不得把底下的表单浮窗关掉（见 _blockingModalIds 注释）
      if (_blockingModalIds.size > 0) return;
      _requestCancel(id);
    };
    _escHandlers.set(id, escHandler);
    document.addEventListener('keydown', escHandler);
  } else {
    _blockingModalIds.add(id);
  }

  // 回调
  if (onMount) onMount(panel);

  // 焦点接管：最后一步移入浮窗（在 onMount 之后，确保业务自己绑的控件已在位）
  _focusInto(panel);

  return panel;
}

/**
 * 关闭浮窗
 * @param {string} id - 浮窗标识
 */
export function closeModal(id) {
  _blockingModalIds.delete(id); // blocking 浮窗关闭即摘牌（Esc 让位随之解除）
  _cancelHandlers.delete(id);   // 程序化关闭 / 提交成功 = 不执行 onCancel（取消语义只走 _requestCancel）
  const escHandler = _escHandlers.get(id);
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    _escHandlers.delete(id);
  }
  const overlay = document.getElementById(`modal-overlay-${id}`);
  if (overlay && !overlay.dataset.closing) {
    overlay.dataset.closing = '1';
    // 先淡出再把节点摘掉（150ms；尊重 prefers-reduced-motion）。inert 还原与焦点回还**立即执行**，
    // 不随淡出延后——键盘用户按 Esc 后应马上回到打开它的元素。
    const reduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      overlay.remove();
    } else {
      overlay.style.transition = 'opacity 0.15s ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 150);
    }
  }
  _releaseInert(id); // 还原背景 inert + 焦点还给打开它的元素（无浮窗时是空操作）
}

/**
 * 快速创建表单浮窗（统一体例：body 分组 fieldset / footer sticky / 取消清临时状态 / 提交态）
 * @param {Object} options
 * @param {string} options.id - 浮窗标识
 * @param {string} options.title - 标题（纯文本）
 * @param {Array} options.fields - 字段定义 [{key, label, type, placeholder, required, options, group}]
 *   `group` 相同且连续的字段归入同一 fieldset；不传则归入 `groupTitle` 一组。
 * @param {Function} options.onSubmit - 提交回调，参数为字段值对象；可返回 Promise / false / {ok:false,errors}
 * @param {string} [options.submitLabel='保存'] - 提交按钮文字
 * @param {string} [options.groupTitle='填写内容'] - 未指定 group 时的分组标题
 * @param {string} [options.accentColor] - 强调色
 * @param {Object} [options.initialValues] - 初始值（编辑模式）
 * @param {string} [options.size='md'] - 尺寸档 sm/md/lg
 * @param {boolean} [options.footerSticky=true] - 页脚动作是否吸底
 * @param {Function} [options.onCancel] - 取消（含 Esc / 遮罩 / ×）时清理临时状态
 * @param {{href:string,text:string}} [options.settingsLink] - 页脚「设置」入口（透传 openModal，可选）
 */
export function openFormModal({
  id, title, fields, onSubmit, submitLabel = '保存',
  accentColor = 'var(--accent-blue)', initialValues = {}, settingsLink = null,
  size = 'md', footerSticky = true, onCancel = null,
  groupTitle = '填写内容',
}) {
  const labelStyle = '--acc-text-dark:#CBD5E1;display:block;font-weight:500;color:var(--neutral-700);margin-bottom:4px;';
  const controlStyle = '--acc-text-dark:#CBD5E1;color:var(--neutral-700);';
  const fieldId = (key) => `${id}-${key}`;
  const errorHtml = (fid, key) =>
    `<p class="text-xs text-red-600 mt-1" id="${escHtml(fid)}-err" data-field-error="${escHtml(key)}" hidden></p>`;
  // 未知 type 一律回退 text（R3-28：原样输出 type="input" 是非法类型）
  const inputType = (t) => {
    const known = ['text', 'number', 'date', 'time', 'email', 'tel', 'url', 'password'];
    return known.includes(t) ? t : 'text';
  };

  const fieldHtml = (f) => {
    const val = initialValues[f.key] != null ? initialValues[f.key] : '';
    const fid = fieldId(f.key);
    const reqMark = f.required ? '<span style="--acc-text-dark:#F87171;color:var(--functional-error);">*</span>' : '';
    const requiredAttr = f.required ? ' required aria-required="true"' : '';
    const label = `<label for="${escHtml(fid)}" style="${labelStyle}" class="text-body-sm">${escHtml(f.label)}${reqMark}</label>`;
    if (f.type === 'select') {
      const opts = (f.options || []).map((o) => `<option value="${escHtml(o.value)}" ${String(val) === String(o.value) ? 'selected' : ''}>${escHtml(o.label)}</option>`).join('');
      return `<div style="margin-bottom:14px;">${label}<select id="${escHtml(fid)}" data-field="${escHtml(f.key)}" class="input-flat w-full"${requiredAttr}>${opts}</select>${errorHtml(fid, f.key)}</div>`;
    }
    if (f.type === 'textarea') {
      return `<div style="margin-bottom:14px;">${label}<textarea id="${escHtml(fid)}" data-field="${escHtml(f.key)}" rows="3" placeholder="${escHtml(f.placeholder || '')}" class="input-flat-sm w-full" style="${controlStyle}resize:vertical;"${requiredAttr}>${escHtml(val)}</textarea>${errorHtml(fid, f.key)}</div>`;
    }
    return `<div style="margin-bottom:14px;">${label}<input id="${escHtml(fid)}" data-field="${escHtml(f.key)}" type="${escHtml(inputType(f.type))}" value="${escHtml(val)}" placeholder="${escHtml(f.placeholder || '')}" class="input-flat-sm w-full" style="${controlStyle}"${requiredAttr} />${errorHtml(fid, f.key)}</div>`;
  };

  // 分组：连续同 group 的字段归入一个 fieldset（体例要求 body 可分组，短表单也不另写样式）
  const groups = [];
  for (const f of fields) {
    const name = f.group || '';
    if (!groups.length || groups[groups.length - 1].name !== name) groups.push({ name, fields: [] });
    groups[groups.length - 1].fields.push(f);
  }
  const fieldsHtml = groups.map((g, i) => `
    <fieldset class="modal-fieldset">
      <legend class="modal-fieldset__legend">${escHtml(g.name || groupTitle)}</legend>
      <div class="modal-fieldset__body">${g.fields.map(fieldHtml).join('')}</div>
    </fieldset>`).join('');

  const formId = `${id}-modal-form`;
  const bodyHtml = `<form id="${escHtml(formId)}" data-modal-form="${escHtml(id)}" novalidate>${fieldsHtml}</form>`;

  const footerHtml = `
    <p class="modal-form-error" data-modal-error hidden></p>
    <button type="button" data-modal-cancel="${escHtml(id)}" class="btn-outline" style="cursor:pointer;">取消</button>
    <button type="submit" form="${escHtml(formId)}" data-modal-submit="${escHtml(id)}" class="btn-accent">${escHtml(submitLabel)}</button>`;

  return openModal({
    id,
    title,
    bodyHtml,
    size,
    footerHtml,
    footerSticky,
    onCancel,
    accentColor,
    settingsLink,
    onMount: (panel) => {
      const fieldEl = (key) => Array.from(panel.querySelectorAll('[data-field]')).find((el) => el.dataset.field === key);
      const errorEl = (key) => Array.from(panel.querySelectorAll('[data-field-error]')).find((el) => el.dataset.fieldError === key);
      const submitBtn = panel.querySelector(`[data-modal-submit="${id}"]`);
      const cancelBtn = panel.querySelector(`[data-modal-cancel="${id}"]`);
      const generalError = panel.querySelector('[data-modal-error]');
      const clearErrors = () => {
        panel.querySelectorAll('[data-field-error]').forEach((el) => {
          el.innerHTML = '';
          el.hidden = true;
        });
        panel.querySelectorAll('[data-field]').forEach((el) => {
          el.removeAttribute('aria-invalid');
          const described = el.getAttribute('aria-describedby') || '';
          if (described.endsWith('-err')) el.removeAttribute('aria-describedby');
        });
        if (generalError) { generalError.textContent = ''; generalError.hidden = true; }
      };
      /** 渲染字段错误行（aria-invalid / aria-describedby）并聚焦首个错误字段 */
      const showErrors = (errors) => {
        let firstControl = null;
        Object.entries(errors || {}).forEach(([key, raw]) => {
          const msg = String(raw == null ? '' : raw).trim();
          if (!msg) return;
          const control = fieldEl(key);
          const errEl = errorEl(key);
          if (!control) return;
          if (errEl) {
            errEl.innerHTML = escHtml(msg);
            errEl.hidden = false;
          }
          control.setAttribute('aria-invalid', 'true');
          if (errEl) control.setAttribute('aria-describedby', errEl.id);
          if (!firstControl) firstControl = control;
        });
        firstControl?.focus();
      };
      /** 失败留在浮窗内：不关窗、不丢已填内容 */
      const showGeneralError = (msg) => {
        if (!generalError) return;
        generalError.textContent = String(msg || '提交失败，请稍后重试');
        generalError.hidden = false;
      };
      const setBusy = (busy) => {
        if (submitBtn) {
          submitBtn.disabled = busy;
          submitBtn.textContent = busy ? '提交中…' : submitLabel;
          submitBtn.classList.toggle('opacity-50', busy);
        }
        if (cancelBtn) cancelBtn.disabled = busy;
      };

      // 提交（取消由 openModal 统一处理：取消 = 放弃本次编辑）
      panel.querySelector(`[data-modal-form="${id}"]`)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn?.disabled) return;
        clearErrors();
        const values = {};
        panel.querySelectorAll('[data-field]').forEach((el) => {
          values[el.dataset.field] = el.value;
        });
        setBusy(true);
        try {
          const result = await onSubmit(values);
          if (result === false) { setBusy(false); return; } // onSubmit 返回 false 表示验证失败，不关闭浮窗
          if (result && result.ok === false) {
            showErrors(result.errors);
            if (result.reason) showGeneralError(result.reason);
            setBusy(false);
            return;
          }
          closeModal(id);
        } catch (err) {
          showGeneralError(err?.message || '提交失败，请稍后重试');
          setBusy(false);
        }
      });
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  「本位」nudge 确认弹窗（2026-09-23 支书裁定 · 单一源）
// ════════════════════════════════════════════════════════════════
// 支书原话（逐字）：「我觉得 所有涉及到 可以介入但一般不越俎代庖的场景，可以有一个弹窗提示一下，
//   【一般由谁来写入】，然后弹窗要点击确认才可以关闭。这样来实现越俎代庖的一种 nudge式的防止。」
// ⇒ 体例：标题「本步一般由…写入」；正文一行说清**一般由谁写入 + 为什么**（业务语言，不给用户看裁定编号）；
//   两个动作＝主按钮「仍由我继续」（继续执行原动作）／次按钮「取消」（放弃本次动作）。
// ⚠ **硬要求（与其它浮窗故意不同，勿"顺手统一"）**：**必须点按钮才能关**——
//   不点遮罩关、不按 Esc 关、**不自动超时**（走的正是 `openModal({dismissable:false})`）。
// ⚠ **只在「不是你本位」时弹**：本位操作人走原路径、零打扰 ——「是不是本位」由**调用点**判，
//   判据单一源＝各服务的 `isXxxHomePosition`（见 `services/activity/attendance.js` / `services/activity/inspection.js` /
//   `services/activity/taskforce.js`），本组件只负责「弹」这一件事。
// ⚠ 「一般由谁写入」的**业务口径**（不写裁定号给用户看）：
//   · 活动写入 ＝ 党小组组长写入（母本《党小组组长工作手册》「创建活动仅限支书、副支书和党小组组长」＋
//     《常见工作场景快速指南》「活动由党小组组长写入」，写入时同时指定本场组织者）；
//   · 考察 / 考勤上传 ＝ 材料上传主体一律「组织者」（该场活动 / 该专班的组织者）；
//   · 考勤另按会议类型分（党课 / 支部党员大会＝纪检委员，党小组会 / 组织生活会 / 主题党日＝该场组织者）。
export const NUDGE_TEXTS = {
  'activity-write': {
    who: '党小组组长',
    verb: '写入',
    why: '支部的活动由各党小组组长写入——写入时同时指定本次活动的组织者，本场的任务与通知发布随该指定归到组织者。支书 / 副支书也可以写入，但一般不由其代办。',
  },
  'inspection-upload': {
    who: '该场活动的组织者',
    verb: '上传',
    why: '考察记录由该场活动的组织者上传——谁组织这场，谁上传本场材料；上传后交纪检委员确认。',
  },
  'attendance-upload': {
    who: '该场活动的组织者',
    verb: '上传',
    why: '考勤由该场活动的组织者上传（党课 / 支部党员大会的上传位在纪检委员），上传后交纪检委员确认。',
  },
  'taskforce-upload': {
    who: '该专班的组织者',
    verb: '上传',
    why: '专班的材料与考察由该专班承担人（组织者）提交；组织委员负责建档与汇总，一般不直接录原始数据。',
  },
  // 2026-09-27 增设（支书裁定「两处都加」）——另两处「可介入但一般不越俎代庖」位的本位口径（业务语言，
  //   不写裁定号给用户看）：材料催办（一般归组织委员）＋ 赋权三情景（常设 / 活动项目 / 专班，本位各不同）。
  //   文案照既有体例改写自母本口径（`.ctx/ACTIVE_RULINGS.md`「一、角色与分工」的 `D-391`（材料催缴与审核
  //   督办归组织委员；支书有权催办，但一般不越俎代庖）与 `D-434` / `D-614`（赋权共三个情景：① 常设赋权
  //   赋权者＝支书 / 副支书〔副书同权〕② 活动项目赋权本位＝党小组组长 ③ 专班赋权本位＝组织委员；支书在
  //   三个情景里都可介入））。
  'todo-urge': {
    who: '组织委员',
    verb: '催办',
    why: '材料的催缴与审核督办归组织委员——支书也有权催办，但一般不越俎代庖（本条属例外操作）。',
  },
  'assign-leader': {
    who: '支书 / 副支书',
    verb: '赋权',
    why: '常设赋权（设党小组组长 / 配置支委身份）由支书、副支书写入（副书同权）——一把手层身份归党委，其余归支书 / 副支书。',
  },
  'assign-activity': {
    who: '党小组组长',
    verb: '赋权',
    why: '活动项目赋权由党小组组长写入（办活动即党小组承办）——支书在三个赋权情景里都可介入，但一般不由其代办。',
  },
  'assign-taskforce': {
    who: '组织委员',
    verb: '赋权',
    why: '专班赋权由组织委员写入（专班招募统筹收口）——支书可介入，但一般不由其代办。',
  },
};

/** nudge 文案里的用户可见文本转义（活动 / 专班名称来自表单，不能直接拼进 HTML） */
function _nudgeEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * 「必须点按钮才能关」的确认浮窗（内部共用机制 · 2026-10-01 批次 326 抽出）：
 * `confirmNudge`（本位 nudge）与 `confirmWriteWithoutGrant`（未赋权软提示）走同一套动作语义——
 * 点主按钮 ⇒ resolve(true)（继续执行原动作）；点次按钮 ⇒ resolve(false)（放弃本次动作）。
 * 弹窗**必须点按钮才能关**（不点遮罩 / 不按 Esc / 不自动超时）；关闭一律走 `closeModal`（不留监听）。
 * @param {Object} o
 * @param {string} o.id 浮窗 id
 * @param {string} o.title 标题
 * @param {string} o.bodyHtml 正文 HTML（按钮行由本函数追加）
 * @param {string} [o.confirmLabel] 主按钮文案（缺省「仍由我继续」）
 * @param {string} [o.cancelLabel] 次按钮文案（缺省「取消」）
 * @param {(panel:HTMLElement)=>void} [o.onPanel] 拿到面板后的锚定回调（如写 `dataset.nudgeKey`）
 * @returns {Promise<boolean>}
 */
function _mustPressConfirm({ id, title, bodyHtml, confirmLabel = '仍由我继续', cancelLabel = '取消', onPanel }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      closeModal(id);
      resolve(ok);
    };
    const panel = openModal({
      id,
      title,
      width: '460px',
      dismissable: false,
      bodyHtml,
      // 动作行同样走 sticky footer（统一体例；nudge 只是不允许「非按钮」关闭）
      footerHtml: `
          <button type="button" data-nudge-cancel class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">${_nudgeEsc(cancelLabel)}</button>
          <button type="button" data-nudge-confirm class="btn-accent text-sm px-4 py-1.5 font-medium">${_nudgeEsc(confirmLabel)}</button>`,
      onMount: (p) => {
        p.querySelector('[data-nudge-confirm]')?.addEventListener('click', () => finish(true));
        p.querySelector('[data-nudge-cancel]')?.addEventListener('click', () => finish(false));
      },
    });
    onPanel?.(panel);
  });
}

/**
 * 「写入未赋权」提示正文（**单一源**：折进 `confirmNudge` 的 `noGrant` 与独立弹窗 `confirmWriteWithoutGrant`
 * 共用同一份措辞 —— 2026-10-01 批次 326 · 支书裁定 `SOP-G-2-①` ＝ **乙：软提示**）。
 * 母本依据：《常见工作场景快速指南》「写入活动时同时指定该次活动的组织者——指定即完成该次活动的赋权」。
 * @param {string} subject 对象称谓（活动 / 专班）
 * @param {string} [context] 具体对象名
 */
function _noGrantNoteHtml(subject, context = '') {
  const s = _nudgeEsc(subject);
  const who = context ? `本${s}（${_nudgeEsc(context)}）` : `本${s}`;
  return `<p style="margin:10px 0 0;font-size:0.8rem;line-height:1.75;color:var(--neutral-700);">另外，${who}尚未指定<b>组织者</b>（也就是还没有完成赋权）。</p>
        <p style="margin:6px 0 0;font-size:0.8rem;line-height:1.75;color:var(--neutral-700);">按支部惯例，<b>写入时同时指定组织者</b>——指定即完成本${s}的赋权，任务与通知发布随之归到组织者；如确需先写入、稍后补指定，确认继续即可。</p>`;
}

/**
 * 「本位」nudge 确认弹窗（2026-09-23 支书裁定）：**只在操作人不是本位时**由调用点调用。
 * 三个动作语义：点主按钮 ⇒ resolve(true)（继续执行原动作）；点次按钮 ⇒ resolve(false)（放弃本次动作）。
 * 弹窗**必须点按钮才能关**（不点遮罩 / 不按 Esc / 不自动超时）；关闭一律走 `closeModal`（不留监听）。
 * @param {Object} options
 * @param {'activity-write'|'inspection-upload'|'attendance-upload'|'taskforce-upload'} options.nudgeKey
 *   nudge 场景键（**单一源**：文案取自 `NUDGE_TEXTS`；同时落到弹窗 DOM 供统计 / 测试锚定）
 * @param {string} [options.who] 本位承担人（不传取 `NUDGE_TEXTS[nudgeKey].who`）
 * @param {string} [options.why] 「为什么」（不传取 `NUDGE_TEXTS[nudgeKey].why`）
 * @param {string} [options.context] 具体对象名（活动 / 专班名称），用于正文点名
 * @param {{subject?:string, context?:string}} [options.noGrant] 同时**未赋权**时传入 ⇒ 本窗**追加一段**
 *   「尚未指定组织者」提示（避免同一次提交连弹两个窗；`SOP-G-2-①` 软提示的落法）
 * @returns {Promise<boolean>} true＝仍由我继续；false＝取消
 */
export function confirmNudge({ nudgeKey, who, why, context = '', noGrant = null }) {
  const text = NUDGE_TEXTS[nudgeKey] || { who: '本位承担人', verb: '办理', why: '' };
  const whoText = who || text.who;
  const verbText = text.verb || '办理';
  const whyText = why || text.why;
  const grantNote = noGrant ? _noGrantNoteHtml(noGrant.subject || '活动', noGrant.context || '') : '';
  return _mustPressConfirm({
    id: `nudge-${nudgeKey}`,
    title: `本步一般由${_nudgeEsc(whoText)}${_nudgeEsc(verbText)}`,
    bodyHtml: `
        <p style="margin:0;font-size:0.8rem;line-height:1.75;color:var(--neutral-700);">${context ? `本场（${_nudgeEsc(context)}）` : '这一步'}一般由<b>${_nudgeEsc(whoText)}</b>${_nudgeEsc(verbText)}。${_nudgeEsc(whyText)}</p>${grantNote}
        <p style="margin:10px 0 0;font-size:0.72rem;line-height:1.7;color:var(--neutral-500);">确需由您经办时，点「仍由我继续」即可——这只表示本次按例外办法办，不改动任何权限。</p>`,
    onPanel: (panel) => { panel.dataset.nudgeKey = nudgeKey; }, // 统计 / 测试锚定（`#modal-overlay-nudge-<key>` 亦可定位）
  });
}

/**
 * 「写入未赋权」软提示（2026-10-01 批次 326 · 支书裁定 `SOP-G-2-①` ＝ **乙：软提示**）：
 * 写入活动 / 专班时**未指定组织者（＝尚未完成赋权）**即偏离母本《常见工作场景快速指南》
 * 「写入活动时同时指定该次活动的组织者——指定即完成该次活动的赋权」⇒ **提交前弹一次软提示**，
 * **可继续提交**（不阻断写入 —— 母本未禁止「先写后补指定」）。
 * ⚠ 若同一次提交**另有「本位」nudge**（写入人不是本位），调用点应改用 `confirmNudge({ noGrant })`
 *   把本段**折进那一窗**，避免连弹两个窗。机制同「本位」nudge。
 * @param {Object} o
 * @param {string} [o.subject='活动'] 对象称谓（活动 / 专班）
 * @param {string} [o.context=''] 具体对象名（活动 / 专班名称）
 * @returns {Promise<boolean>} true＝仍然提交；false＝返回补指定
 */
export function confirmWriteWithoutGrant({ subject = '活动', context = '' } = {}) {
  return _mustPressConfirm({
    id: 'write-without-grant',
    title: `尚未指定${subject}组织者`,
    confirmLabel: '仍然提交',
    cancelLabel: '返回指定',
    bodyHtml: `${_noGrantNoteHtml(subject, context)}
        <p style="margin:10px 0 0;font-size:0.72rem;line-height:1.7;color:var(--neutral-500);">点「仍然提交」＝本次先写入、稍后补指定；点「返回指定」＝回到表单先指定组织者。这不改动任何权限。</p>`,
  });
}

