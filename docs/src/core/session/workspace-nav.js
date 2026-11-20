// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/session/workspace-nav.js — 工作台页签统一导航（2026-11-01 批次 524 · #7；
//  2026-11-10 批次 540 波次 1 按 `INTERACTION_AND_NAVIGATION_CONTRACT §二` 改准）
//
//  背景：各台待办曾用 `<role>-tab-btn[data-<role>-tab="..."]` 直接点按钮切页，类名/属性名
//  逐台复制；硬编码选择器一改页签名就静默失效。
//  现在：页签按钮统一带 `data-ws-tab-btn="<id>"`（tab-bar 单一处产出），导航只认这个属性；
//  需要定位目标项时，先写 PendingTarget，再由目标页签 render 后消费（不新增第二套深链）。
//
//  本批契约（`content/04_web_design/contracts/INTERACTION_AND_NAVIGATION_CONTRACT.md`）：
//   · switch：先查本台注册表（`workspace-tabs.js`）与 DOM 页签按钮，**命中才** PendingTarget.set ＋ click；
//   · 未命中：fail-closed——在内容区渲染「本台无该模块」＋同义落点，**不得只 toast**；
//   · 缺 id：可落目标页顶部，但目标页必须显示「未定位到具体条目」（由 PendingTarget 消费方或本文件的
//     超时兜底给出）；
//   · direct：活动 / 专班 / 通知详情走 `object-route`（不经工作台页签）。
// ════════════════════════════════════════════════════════════════

import { PendingTarget } from './pending-target.js?v=20261120a';
import { resolveTodoAction } from '../domain/todo-actions.js?v=20261120a';
import { synonymWorkspaceTab, WORKSPACE_TAB_LABELS } from '../domain/workspace-tabs.js?v=20261120a';
import { objectDetailHref } from '../domain/object-route.js?v=20261120a';
import { resolveDocumentUrl } from '../base/page-url.js?v=20261120a';

/** fail-closed 提示主文（守卫按此字符串核对，不在调用点另写一套） */
export const NAV_MODULE_MISSING_TEXT = '本台无该模块';
/** 缺 id 时的显式提示（可落页顶，但不得静默） */
export const NAV_ITEM_MISSING_TEXT = '未定位到具体条目';
/** 缺 id 落页顶后，等待目标页消费 PendingTarget 的兜底时长（超时则本文件显式提示并清理） */
const MISSING_ITEM_FALLBACK_MS = 2000;

/** 取当前工作台内容容器（tab-bar 产出 `#<prefix>-tab-content`，由页签按钮的 aria-controls 关联） */
function _contentHost() {
  if (typeof document === 'undefined') return null;
  const btn = document.querySelector('[data-ws-tab-btn]');
  const contentId = btn && btn.getAttribute('aria-controls');
  if (contentId) return document.getElementById(contentId);
  return document.getElementById(`${btn ? (btn.id || '').replace(/-tab-.*$/, '') : ''}-tab-content`)
    || document.querySelector('[id$="-tab-content"]');
}

/**
 * 在内容区顶部渲染一条可见提示（幂等：同屏只留一条 `data-ws-nav-notice`）。
 * @param {{message:string, hint?:string, fallback?:{tab:string,label:string}|null}} opts
 * @returns {boolean} 是否渲染成功（无内容容器时为 false，调用方仍不得改为静默）
 */
function _renderNavNotice({ message, hint = '', fallback = null } = {}) {
  const host = _contentHost();
  if (!host || !message) {
    console.warn('[workspace-nav] 导航提示无落点：', message, hint);
    return false;
  }
  host.querySelectorAll('[data-ws-nav-notice]').forEach((el) => el.remove());
  const card = document.createElement('div');
  card.dataset.wsNavNotice = '1';
  card.setAttribute('role', 'alert');
  card.className = 'card rounded-xl px-4 py-2.5 mb-3';
  const main = document.createElement('p');
  main.className = 'text-body-sm text-[var(--status-warning-text)]';
  main.textContent = message;
  card.appendChild(main);
  if (hint) {
    const sub = document.createElement('p');
    sub.className = 'text-body-sm text-gray-600 mt-1';
    sub.textContent = hint;
    card.appendChild(sub);
  }
  if (fallback && fallback.tab) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-outline btn-sm mt-2';
    btn.dataset.wsNavFallbackGo = fallback.tab;
    btn.textContent = `去${fallback.label || WORKSPACE_TAB_LABELS[fallback.tab] || fallback.tab}`;
    btn.addEventListener('click', () => goToWorkspaceTab(fallback.tab));
    card.appendChild(btn);
  }
  host.prepend(card);
  return true;
}

/**
 * fail-closed：目标页签不在本台时给出可见提示与同义落点（替代此前的 toast-only）。
 * @param {{tabId?:string, role?:string, message?:string}} opts
 */
export function showNavFallback({ tabId = '', role = '', message = '' } = {}) {
  const label = WORKSPACE_TAB_LABELS[tabId] || tabId || '未知页签';
  const fallback = synonymWorkspaceTab(role, tabId);
  return _renderNavNotice({
    message: message || `${NAV_MODULE_MISSING_TEXT}（目标：${label}）`,
    hint: fallback
      ? `同义落点：${fallback.label}；也可从页签栏选择本台现有模块。`
      : '本台没有可替代的页签，请从页签栏选择。',
    fallback,
  });
}

/** 缺 id / 目标条目已消失时的显式提示（不静默落页顶） */
export function showMissingItemNotice(message = '') {
  return _renderNavNotice({
    message: message || NAV_ITEM_MISSING_TEXT,
    hint: '已落到目标页顶部；具体条目可能已处理或已移出列表。',
  });
}

/** 缺 id 的超时兜底：目标页未消费 PendingTarget 时，由本文件显式提示并清理 */
function _scheduleMissingItemFallback(tabId) {
  if (typeof setTimeout !== 'function') return;
  setTimeout(() => {
    const pending = PendingTarget.peek();
    if (!pending || pending.tab !== tabId || pending.id) return;
    PendingTarget.consume();
    showMissingItemNotice();
  }, MISSING_ITEM_FALLBACK_MS);
}

/**
 * 切到当前工作台的指定页签。
 * @param {string} tabId 目标页签 id（须为当前工作台已注册的 tab）
 * @param {{kind?:string, id?:string|null, section?:string}} [target] 目标项（命中页签后才写入 PendingTarget）
 * @param {string} [role] 本台待办角色键（未命中时用于取同义落点；缺省按 DOM 兜底）
 * @returns {boolean} 是否找到并点击了页签按钮
 */
export function goToWorkspaceTab(tabId, target, role = '') {
  if (!tabId) {
    showNavFallback({ role });
    return false;
  }
  const btn = document.querySelector(`[data-ws-tab-btn="${tabId}"]`);
  if (!btn) {
    showNavFallback({ tabId, role });
    return false;
  }
  if (target) PendingTarget.set({ tab: tabId, ...target });
  btn.click();
  if (target && !target.id && target.kind) _scheduleMissingItemFallback(tabId);
  return true;
}

/** 组内首条 / 本体上可定位的业务 id（活动 / 记录 / 成员） */
export function todoTargetId(todo) {
  if (!todo) return '';
  const first = Array.isArray(todo.items) ? todo.items[0] : null;
  return (first && (first.activityId || first.sourceId || first.id))
    || todo.sourceId
    || todo.id
    || '';
}

/** direct 专用：对象本体 id（活动 / 专班 / 通知的来源 id；缺来源时不用待办本体 id 冒充对象 id） */
function _objectSourceIdOf(todo) {
  if (!todo) return '';
  const first = (Array.isArray(todo.items) ? todo.items[0] : null) || todo;
  return first.activityId
    || (first.actionData && (first.actionData.activityId || first.actionData.taskforceId || first.actionData.noticeId))
    || first.sourceId
    || todo.sourceId
    || '';
}

/** direct 落点：通知详情页 / 活动或专班详情页（统一走 object-route，不在调用点拼第二套 URL） */
function _directHref(action, todo, id) {
  if (!id) return '';
  const first = (todo && todo.items && todo.items[0]) || todo || {};
  const sourceType = first.sourceType || (todo && todo.sourceType) || '';
  if (action.kind === 'notice' || sourceType === 'notice') {
    return resolveDocumentUrl('notice.html', { searchParams: { id } });
  }
  const isTaskforce = sourceType === 'taskforce' || String(id).startsWith('tf-');
  const href = objectDetailHref(isTaskforce ? 'taskforce' : 'activity', id, { entry: 'todo' });
  return href ? resolveDocumentUrl(href.split('?')[0], { searchParams: { id } }) : '';
}

/**
 * 执行待办主行动（六台单一出口；契约 §一 三模式）。
 * 调用点只做角色特有后置动作（展开赋权面板 / 高亮归档行），不再各自解析 tab。
 * @param {Object} todo 待办或聚合组
 * @param {string} role 本台角色键
 * @returns {{action:Object|null, ok:boolean}} ok=false 时已在内容区给出可见提示（不得再补 toast 兜底）
 */
export function executeTodoAction(todo, role) {
  const action = resolveTodoAction(todo, role);
  if (!action) {
    _renderNavNotice({
      message: '该待办未登记跳转落点',
      hint: '请在待办列表行内处理，或到对应模块查看。',
    });
    return { action: null, ok: false };
  }
  if (action.mode === 'inline') {
    _renderNavNotice({
      message: `「${action.label || '去处理'}」在本页行尾或浮窗完成，不跳页`,
      hint: '请使用该行行尾按钮或右侧详情的动作位。',
    });
    return { action, ok: false };
  }
  // switch 定位键：显式 `pendingId`（今天页传聚合组键）优先；否则按待办对象 / 首条业务 id。
  //   direct 只认对象本体 id（其下分支自取），不吃 pendingId。
  const id = (action.mode === 'switch' && todo.pendingId)
    ? String(todo.pendingId)
    : (todoTargetId(todo) || action.id || '');
  if (action.mode === 'direct') {
    // direct 只认对象本体 id（活动 / 专班 / 通知来源）；不得用待办本体 id 冒充对象 id
    const href = _directHref(action, todo, _objectSourceIdOf(todo) || action.id || '');
    if (!href) {
      showMissingItemNotice(`${NAV_ITEM_MISSING_TEXT}（本条未带可直达的对象编号）`);
      return { action, ok: false };
    }
    window.location.href = href;
    return { action, ok: true };
  }
  const ok = goToWorkspaceTab(
    action.tab,
    { kind: action.kind, id: id || null, ...(action.section ? { section: action.section } : {}) },
    role,
  );
  return { action, ok };
}
