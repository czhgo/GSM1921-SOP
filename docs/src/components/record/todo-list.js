// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  todo-list.js — 待办列表组件（四档紧迫度 · 2026-10-18 工作台密度重组 Task 5）
//
//  职责：把待办聚合组按「逾期 / 今日 / 本周 / 以后」四档分组渲染；
//    每行只出「标题 + 一句说明 + 一个主行动」，作废 / 删除 / 催办收进行尾「更多」菜单。
//  单一源关系：
//    · 四档口径 = 本文件 buildUrgencySections（壳体摘要与列表共用同一批分组数据，不另算一套）；
//    · 行结构 = components/ui/list-row.js 的 listRowHtml（本件不手写行容器）；
//    · 空态 = components/ui/empty-state.js 的 emptyStateHtml；
//    · 逾期判定 = services/governance/todo.js 的 isTodoExpired（status=expired 亦计入）；
//    · 样式 = styles.css 的 .list-group / .list-row 与 .todo-urgency-* / .todo-more__* 段。
//  保留：bulkHtml 批量块、selectedTodoId 选中态、data-group-key 深链锚点、
//    催办状态、作废审批门、删除权限门（均由壳体注入回调，本件只渲染与转交）。
// ════════════════════════════════════════════════════════════════

import { badgeHtml } from '../ui/badges.js?v=20261018g';
import { listRowHtml } from '../ui/list-row.js?v=20261018g';
import { emptyStateHtml } from '../ui/empty-state.js?v=20261018g';
import { isTodoExpired } from '../../services/governance/todo.js?v=20261018g';
import { escHtml, todayLocal } from '../../core/base/utils.js?v=20261018g';

/** 四档展示顺序与组名（纯中文；空组由渲染层跳过） */
const URGENCY_LEVELS = [
  { key: 'overdue', label: '逾期' },
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'later', label: '以后' },
];

/** 组内条数（持久化组与实时组同口径：count 优先，缺省按 items 长度） */
function _groupCount(g) {
  if (!g) return 0;
  if (typeof g.count === 'number') return g.count;
  return Array.isArray(g.items) ? g.items.length : 0;
}

/** 组是否逾期：截止日早于今天，或组内任一 entry 为 expired 显式态 */
function _isGroupOverdue(g, today) {
  if (!g) return false;
  if (g.deadline && g.deadline < today) return true;
  return Array.isArray(g.items) && g.items.some(it => it && isTodoExpired(it, today));
}

/** 本周日日期键（周一为一周之始；今天为周日时返回今天） */
function _weekEndKey(today) {
  const parts = String(today || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return today;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const add = (7 - d.getDay()) % 7; // getDay: 0=周日
  d.setDate(d.getDate() + add);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 单组归入哪一档（单一判定，摘要与列表共用） */
function _urgencyKeyOf(g, today, weekEnd) {
  if (_isGroupOverdue(g, today)) return 'overdue';
  if (g.deadline === today) return 'today';
  if (g.deadline && g.deadline > today && g.deadline <= weekEnd) return 'week';
  return 'later';
}

/**
 * 把展平后的待办组分成四档，并算出摘要四数（同一批数据，不重复口径）。
 * @param {Array<Object>} groups 展平组（可带 domainLabel）
 * @param {string} [today] 日期键 YYYY-MM-DD（缺省=本机今天）
 * @returns {{sections: Array<{key:string,label:string,groups:Array}>, summary: {overdue:number,today:number,week:number,pending:number}}}
 */
export function buildUrgencySections(groups, today = todayLocal()) {
  const weekEnd = _weekEndKey(today);
  const sections = URGENCY_LEVELS.map(level => ({ ...level, groups: [] }));
  const byKey = new Map(sections.map(s => [s.key, s]));

  for (const g of groups || []) {
    if (!g || typeof g !== 'object') continue;
    byKey.get(_urgencyKeyOf(g, today, weekEnd)).groups.push(g);
  }

  // 档内排序：截止升序（无截止末位），再按 groupKey 稳定兜底
  for (const section of sections) {
    section.groups.sort((a, b) => {
      const dc = (a.deadline || '9999').localeCompare(b.deadline || '9999');
      return dc || String(a.groupKey || '').localeCompare(String(b.groupKey || ''));
    });
  }

  const summary = { overdue: 0, today: 0, week: 0, pending: 0 };
  for (const section of sections) {
    const count = section.groups.reduce((sum, g) => sum + _groupCount(g), 0);
    if (section.key !== 'later') summary[section.key] = count;
    summary.pending += count;
  }
  return { sections, summary };
}

/** 主行动文案（沿用原 actionKey 语义；无生产者死键不恢复） */
const ACTION_LABELS = {
  'attendance-confirm': '去考勤管理',
  'inspection-confirm': '去考察管理',
  'activity-archive': '去归档',
  'review-confirm': '去复核',
  'signup-review': '去审核',
  authorize: '去赋权',
  archive: '去归档',
  review: '去审核',
  read: '去阅读',
  submit: '去提交',
  track: '去追踪',
  participate: '去参与',
  'handoff-attendance-archival': '确认接收',
  'handoff-inspection-report': '确认接收',
  'handoff-material-shortage': '去补课',
};

/** 在四档分组中按 groupKey 找组 */
function _findGroup(sections, groupKey) {
  for (const section of sections || []) {
    const found = (section.groups || []).find(g => g.groupKey === groupKey);
    if (found) return found;
  }
  return null;
}

/** 行尾「更多」菜单（默认收起；button + aria-expanded；菜单项按权限渲染） */
function _moreMenuHtml(prefix, g, urge, canVoid, canDelete) {
  const items = [];
  if (urge) {
    items.push(`<button type="button" role="menuitem" class="todo-more__item ${prefix}-todo-urge-btn" data-group-key="${escHtml(g.groupKey)}" ${urge.state === 'urged' ? 'disabled' : ''} title="${escHtml(urge.title || '催办责任人')}">${escHtml(urge.label)}</button>`);
  }
  if (canVoid) {
    items.push(`<button type="button" role="menuitem" class="todo-more__item todo-more__item--danger ${prefix}-todo-void-btn" data-group-key="${escHtml(g.groupKey)}" title="作废该待办（不办了；需填原因）">作废</button>`);
  }
  if (canDelete) {
    items.push(`<button type="button" role="menuitem" class="todo-more__item todo-more__item--danger ${prefix}-todo-del-btn" data-group-key="${escHtml(g.groupKey)}" title="删除该组待办（不可恢复，仅支委层）">删除</button>`);
  }
  if (!items.length) return '';
  return `
    <div class="todo-more">
      <button type="button" class="btn-outline todo-more__btn text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" aria-haspopup="true" aria-expanded="false" aria-label="更多操作：${escHtml(g.title || '')}">更多</button>
      <div class="todo-more__menu hidden" role="menu">${items.join('')}</div>
    </div>`;
}

/** 渲染一条待办组行（标题 + 一句说明 + 一个主行动 + 行尾更多） */
function _renderUrgencyRow(prefix, g, opts, today, selectedTodoId) {
  const {
    onActionTodo, onDeleteTodo, onVoidTodo, urgeStateOf, actionBtnStyle = '',
  } = opts;
  const isSelected = g.groupKey === selectedTodoId;
  const hasVoidPending = Array.isArray(g.items) && g.items.some(t => t && t.voidPending);
  // 作废 / 删除只对落库待办组有意义（实时组无 id；审批门与角色门由壳体回调决定）
  const canVoid = g.persisted && typeof onVoidTodo === 'function';
  const canDelete = g.persisted && typeof onDeleteTodo === 'function';
  const urge = typeof urgeStateOf === 'function' ? urgeStateOf(g) : null;
  const actionLabel = ACTION_LABELS[g.actionKey] || ACTION_LABELS[g.actionType] || '去处理';

  const primaryBtn = g.hideActionBtn ? '' : `
    <button type="button" class="btn-accent-soft ${prefix}-todo-action-btn text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-90" data-group-key="${escHtml(g.groupKey)}" style="${actionBtnStyle}">${actionLabel}</button>`;
  const trailing = `${primaryBtn}${_moreMenuHtml(prefix, g, urge, canVoid, canDelete)}`;

  const metaParts = [];
  if (g.domainLabel) metaParts.push(g.domainLabel);
  const count = _groupCount(g);
  if (count > 1) metaParts.push(`${count} 条`);
  if (g.deadline) metaParts.push(`截止 ${g.deadline}`);

  const row = listRowHtml({
    leading: hasVoidPending ? badgeHtml('待支委会确认', 'warning') : '',
    title: g.title || '未命名待办',
    meta: metaParts.join(' · '),
    trailing,
    className: `todo-row ${prefix}-todo-item ${prefix}-todo-item-main${isSelected ? ' list-row--selected' : ''}`,
    dataAttrs: {
      'data-group-key': g.groupKey,
      'data-selected': isSelected ? 'true' : undefined,
      tabindex: '0',
      role: 'button',
      'aria-current': isSelected ? 'true' : undefined,
      'aria-label': `查看详情：${g.title || ''}`,
    },
  });

  // 批量块（成员确认等）跟在组行之后，保持原有勾选批量与逐项详情并行
  return g.bulkHtml
    ? `${row}<div class="${prefix}-todo-bulk rounded-b-lg bg-gray-50/40">${g.bulkHtml}</div>`
    : row;
}

/** 关闭容器内全部「更多」菜单（点击外部 / Esc 共用） */
function _closeMoreMenus(container) {
  container.querySelectorAll('.todo-more__menu').forEach(menu => {
    menu.classList.add('hidden');
    const btn = menu.closest('.todo-more')?.querySelector('.todo-more__btn');
    btn?.setAttribute('aria-expanded', 'false');
  });
}

// 文档级「点击外部关闭」每个容器只挂一次（容器跨重建复用，避免重复绑定累积）
const _menuDismissBound = new WeakSet();
function _bindMenuDismiss(container) {
  if (_menuDismissBound.has(container)) return;
  _menuDismissBound.add(container);
  document.addEventListener('click', (e) => {
    if (!container.isConnected) return;
    if (e.target.closest('.todo-more')) return;
    _closeMoreMenus(container);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !container.isConnected) return;
    _closeMoreMenus(container);
  });
}

/**
 * 渲染四档紧迫度待办列表（六台待办页主列）。
 * @param {Object} opts
 * @param {string} opts.prefix — 命名前缀
 * @param {Array} opts.sections — buildUrgencySections 输出的四档分组
 * @param {string} [opts.selectedTodoId] — 当前选中组 groupKey
 * @param {Function} [opts.onSelectTodo] — 点行进详情 (group) => void
 * @param {Function} [opts.onActionTodo] — 主行动回调 (group) => void
 * @param {Function|null} [opts.onDeleteTodo] — 删除回调（null=不渲染）
 * @param {Function|null} [opts.onVoidTodo] — 作废回调（null=不渲染；审批门在壳体）
 * @param {(group:Object)=>({state:'available'|'urged',label:string,title?:string}|null)} [opts.urgeStateOf]
 *        — 催办入口状态（null/缺省=不渲染）
 * @param {(group:Object)=>void} [opts.onUrgeTodo] — 催办回调
 * @param {string} [opts.actionBtnStyle] — 主行动自定义内联样式
 * @param {string} [opts.emptyHint] — 空态一句话
 * @returns {{ html: string, bindEvents: (container: HTMLElement) => void }}
 */
export function renderUrgencyTodoList(opts) {
  const {
    prefix,
    sections = [],
    selectedTodoId = null,
    onSelectTodo = () => {},
    onActionTodo = () => {},
    onDeleteTodo = null,
    onVoidTodo = null,
    urgeStateOf = null,
    onUrgeTodo = null,
    actionBtnStyle = '',
    emptyHint = '当前暂无待办。有新的活动、通知或待审事项时，会第一时间出现在这里。',
  } = opts;

  const today = todayLocal();
  let total = 0;
  const sectionsHtml = (sections || []).map(section => {
    const groups = section.groups || [];
    if (!groups.length) return '';
    total += groups.length;
    const danger = section.key === 'overdue';
    const rows = groups
      .map(g => _renderUrgencyRow(prefix, g, { onActionTodo, onDeleteTodo, onVoidTodo, urgeStateOf, actionBtnStyle }, today, selectedTodoId))
      .join('');
    return `
      <section class="todo-urgency-group ${prefix}-todo-urgency-group" data-urgency="${section.key}">
        <div class="todo-urgency-header ${prefix}-todo-urgency-header">
          <span class="todo-urgency-header__label${danger ? ' todo-urgency-header__label--danger' : ''}">${section.label}</span>
          <span class="todo-urgency-header__count${danger ? ' todo-urgency-header__count--danger' : ''}">${groups.reduce((sum, g) => sum + _groupCount(g), 0)}</span>
        </div>
        <div class="list-group">${rows}</div>
      </section>`;
  }).join('');

  const html = `
    <div class="${prefix}-todo-urgency-list">
      ${sectionsHtml}
      ${total === 0 ? emptyStateHtml(emptyHint) : ''}
    </div>
  `;

  function bindEvents(container) {
    if (!container) return;
    _bindMenuDismiss(container);

    // 行选择（点行进入右栏详情；行动按钮 / 更多菜单不触发选中）
    container.querySelectorAll(`.${prefix}-todo-item[data-group-key]`).forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button, .todo-more')) return;
        const g = _findGroup(sections, row.dataset.groupKey);
        if (g) onSelectTodo(g);
      });
      row.addEventListener('keydown', (e) => {
        if (e.target !== row || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        const g = _findGroup(sections, row.dataset.groupKey);
        if (g) onSelectTodo(g);
      });
    });

    // 「更多」展开 / 收起（键盘可达：原生 button + aria-expanded）
    container.querySelectorAll('.todo-more__btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.closest('.todo-more')?.querySelector('.todo-more__menu');
        if (!menu) return;
        const willOpen = menu.classList.contains('hidden');
        _closeMoreMenus(container);
        if (willOpen) {
          menu.classList.remove('hidden');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // 主行动
    container.querySelectorAll(`.${prefix}-todo-action-btn[data-group-key]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = _findGroup(sections, btn.dataset.groupKey);
        if (g) onActionTodo(g);
      });
    });

    // 催办（菜单项）
    container.querySelectorAll(`.${prefix}-todo-urge-btn[data-group-key]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        _closeMoreMenus(container);
        const g = _findGroup(sections, btn.dataset.groupKey);
        if (g && typeof onUrgeTodo === 'function') onUrgeTodo(g);
      });
    });

    // 作废（菜单项；审批门在壳体）
    container.querySelectorAll(`.${prefix}-todo-void-btn[data-group-key]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _closeMoreMenus(container);
        if (typeof onVoidTodo !== 'function') return;
        const g = _findGroup(sections, btn.dataset.groupKey);
        if (g) onVoidTodo(g);
      });
    });

    // 删除（菜单项；权限门在壳体）
    container.querySelectorAll(`.${prefix}-todo-del-btn[data-group-key]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _closeMoreMenus(container);
        if (typeof onDeleteTodo !== 'function') return;
        const g = _findGroup(sections, btn.dataset.groupKey);
        if (g) onDeleteTodo(g);
      });
    });
  }

  return { html, bindEvents };
}
