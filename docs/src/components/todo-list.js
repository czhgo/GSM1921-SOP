// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  todo-list.js — 待办列表组件
//  最小三成本原则落地：进入工作台第一眼即见待办
//  2026-09-07 IA-C1 Task4：新增 renderDomainTodoList（9 业务域折组列表，六台待办页主列；
//  数据源=TodoStore.getDomainsWithGroups/mergeRealtimeDomains，域头=域名+计数+逾期红点）
//  2026-09-07 IA-C1 Task5：旧 renderTodoList（按分类/actionType 大列表）已无调用者移除
//  （六台待办页 C1 Task4 已改挂 renderDomainTodoList）；按钮文案表去无生产者死键
//  （taskforce-archive/notice-read/review-submit，详见 _renderAggregateItem 登记注释）
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18.2
//         content/04_web_design/design-system/DESIGN_SYSTEM.md §一 第6条
// ════════════════════════════════════════════════════════════════

import { badgeHtml } from './badges.js?v=20260903c';
import { solidAccentStyle } from '../core/constants.js?v=20260903c';
// P1（2026-09-07）：渲染层过期红点收敛于 todo.js isTodoExpired（单一过期判定实现 · spec §三.6）
import { isTodoExpired } from '../services/todo.js?v=20260906j';

/**
 * 渲染「9 业务域折组」待办列表（IA 收敛 C1 Task4 六台待办页主列；替代旧按分类/actionType 大列表）。
 *
 * 数据源 = TodoStore.getDomainsWithGroups(role) / mergeRealtimeDomains(role, realtimeGroups) 输出：
 *   [{ domain, label, count, expiredCount, groups: [{ groupKey, actionKey, title, deadline, count, items }] }]
 * 呈现（spec 一）：域有活才显；域头=域名 + 计数 + 逾期红点；组行沿用聚合卡行（标题/截止/处理按钮），
 * 域内组顺序由数据源保证（先逾期 → deadline → actionKey 稳定）。
 * 默认展开：含逾期域全部展开；无逾期 → count 最大 1-2 个域展开（并列取 2），其余折叠；
 * 组头点击展开/收起（与既有分类折叠同交互）。
 *
 * @param {Object} opts
 * @param {string} opts.prefix          — 命名前缀（如 'leader'/'secretary'）
 * @param {Array}  opts.domains         — 域视图数组（getDomainsWithGroups/mergeRealtimeDomains 返回）
 * @param {string} opts.accent          — 强调色
 * @param {string} [opts.selectedTodoId]— 当前选中组 groupKey
 * @param {Function} [opts.onSelectTodo]— 点击组行回调 (group) => void（进详情）
 * @param {Function} [opts.onActionTodo]— 行动按钮回调 (group) => void
 * @param {Function|null} [opts.onDeleteTodo] — 删除组回调（null=不渲染删除键；实时组台禁用）
 * @param {string} [opts.actionBtnStyle]— 行动按钮自定义内联样式（visitor 金色系）
 * @param {string} [opts.emptyHint]     — 空态引导文案
 * @returns {{ html: string, bindEvents: (container: HTMLElement) => void }}
 */
export function renderDomainTodoList(opts) {
  const {
    prefix,
    domains,
    accent,
    selectedTodoId = null,
    onSelectTodo = () => {},
    onActionTodo = () => {},
    onDeleteTodo = null,
    actionBtnStyle = '',
    emptyHint = '当前暂无待办。有新的活动、通知或待审事项时，会第一时间出现在这里。',
  } = opts;

  const today = new Date().toISOString().slice(0, 10);
  const list = Array.isArray(domains) ? domains : [];

  // 默认展开域：含逾期 → 全部展开；否则 count 最大 1-2 个域（count 并列取 2）
  const expandedDomains = new Set();
  const expiredDomains = list.filter(d => (d.expiredCount || 0) > 0);
  if (expiredDomains.length > 0) {
    expiredDomains.forEach(d => expandedDomains.add(d.domain));
  } else {
    const sorted = [...list].sort((a, b) => (b.count || 0) - (a.count || 0));
    const take = (sorted.length > 1 && sorted[0] && sorted[0].count === sorted[1].count) ? 2 : 1;
    sorted.slice(0, take).forEach(d => expandedDomains.add(d.domain));
  }

  const groupsHtml = list.map(domain => {
    const isExpanded = expandedDomains.has(domain.domain);
    const itemsHtml = (domain.groups || [])
      .map(g => _renderAggregateItem(prefix, g, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo))
      .join('');
    return `
      <div class="${prefix}-todo-group mb-3" data-domain="${domain.domain}">
        <button type="button" class="${prefix}-todo-group-header w-full text-left flex items-center justify-between px-3 py-2 rounded-t-lg cursor-pointer bg-transparent border-0 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-2">
            <svg class="${prefix}-todo-arrow w-3 h-3 text-gray-400 transition-transform" style="transform:${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
            <span class="font-title-cn text-sm font-bold text-gray-700">${domain.label || domain.domain}</span>
            ${(domain.expiredCount || 0) > 0 ? badgeHtml(`${domain.expiredCount} 条逾期`, 'danger') : ''}
          </div>
          <span class="text-xs text-gray-400 tabular-nums">${domain.count || 0}</span>
        </button>
        <div class="${prefix}-todo-group-items ${isExpanded ? '' : 'hidden'} rounded-b-lg">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  const emptyHtml = list.length === 0 ? `
    <div class="text-center py-12 text-gray-400">
      <p class="text-sm">${emptyHint}</p>
    </div>
  ` : '';

  const html = `
    <div class="${prefix}-todo-domain-list">
      ${groupsHtml}
      ${emptyHtml}
    </div>
  `;

  function bindEvents(container) {
    if (!container) return;

    // 域折组展开/收起（与既有分类折叠同交互）
    container.querySelectorAll(`.${prefix}-todo-group-header`).forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest(`.${prefix}-todo-group`);
        const items = group?.querySelector(`.${prefix}-todo-group-items`);
        const arrow = header.querySelector(`.${prefix}-todo-arrow`);
        if (items) {
          items.classList.toggle('hidden');
          if (arrow) arrow.style.transform = items.classList.contains('hidden') ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
      });
    });

    // 组行点击 → 选中进详情
    container.querySelectorAll(`.${prefix}-todo-item-main[data-group-key]`).forEach(main => {
      main.addEventListener('click', () => {
        const g = _findGroupInDomains(list, main.dataset.groupKey);
        if (g) onSelectTodo(g);
      });
    });

    // 组行动按钮（"处理"）
    container.querySelectorAll(`.${prefix}-todo-action-btn[data-group-key]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = _findGroupInDomains(list, btn.dataset.groupKey);
        if (g) onActionTodo(g);
      });
    });

    // 删除按钮（域折组内删除 = 删除整组；实时组台 onDeleteTodo=null 不渲染）
    if (typeof onDeleteTodo === 'function') {
      container.querySelectorAll(`.${prefix}-todo-del-btn[data-group-key]`).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const g = _findGroupInDomains(list, btn.dataset.groupKey);
          if (g) onDeleteTodo(g);
        });
      });
    }
  }

  return { html, bindEvents };
}

/** 域视图（展平）中按 groupKey 找组 */
function _findGroupInDomains(domains, groupKey) {
  for (const d of domains || []) {
    const g = (d.groups || []).find(x => x.groupKey === groupKey);
    if (g) return g;
  }
  return null;
}

// ── 渲染单个聚合卡（同跳转目标合并，数量角标 + 处理按钮）──
function _renderAggregateItem(prefix, g, accent, today, selectedTodoId, actionBtnStyle, onDeleteTodo) {
  const isSelected = g.groupKey === selectedTodoId;
  const hasExpired = g.items.some(t => isTodoExpired(t, today));

  // 2026-08-07 闭环化：actionKey 优先决定按钮文案（同 actionType 不同业务域区分），actionType 兜底
  // 无生产者死键（IA-C1 Task5 登记 2026-09-06）：
  //   taskforce-archive —— 专班归档待办无派生（专班生命周期已改支委会表决/解散闭环，无归档动作待办）
  //   notice-read       —— 通知阅读已移页顶「未读 N 条」轻量条（domain=NONE 不入域折组），条内自带阅读键
  //   review-submit     —— 复盘提交不派生待办（组织者/深度在复盘 tab 内直接提交，无 todo 生产者）
  // 该三键对应旧按钮文案「去归档/去阅读/去提交」随之移除；未知 actionKey 落入 actionType 兜底或 '处理'。
  const actionLabels = {
    'attendance-confirm': '去确认',
    'inspection-confirm': '去确认',
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
  };
  const actionLabel = actionLabels[g.actionKey] || actionLabels[g.actionType] || '处理';

  return `
    <div class="${prefix}-todo-item flex items-center border-b border-gray-50 last:border-b-0" data-group-key="${g.groupKey}">
      <button type="button" class="${prefix}-todo-item-main flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left bg-transparent border-0 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}" data-group-key="${g.groupKey}">
        <span class="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <span class="flex items-center gap-1.5 min-w-0 w-full">
            ${hasExpired ? badgeHtml('含过期', 'danger') : ''}
            <span class="text-sm font-medium text-gray-800 truncate">${g.title}</span>
            <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums flex-shrink-0">${g.count}</span>
          </span>
          ${g.flow ? `<span class="block text-[11px] text-gray-400 truncate">${g.flow}</span>` : ''}
        </span>
        <span class="flex items-center gap-2 flex-shrink-0">
          ${g.deadline ? `<span class="text-xs ${isTodoExpired({ status: 'pending', deadline: g.deadline }, today) ? 'text-red-600' : 'text-gray-400'}">${g.deadline}</span>` : ''}
        </span>
      </button>
      <div class="flex items-center gap-1.5 ml-2 pr-3 flex-shrink-0">
        ${g.hideActionBtn ? '' : `<button type="button" class="${prefix}-todo-action-btn text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-90" data-group-key="${g.groupKey}" style="${actionBtnStyle || solidAccentStyle(accent)}">${actionLabel}</button>`}
        ${onDeleteTodo ? `<button type="button" class="${prefix}-todo-del-btn text-xs text-gray-300 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors" data-group-key="${g.groupKey}" title="删除该组待办" style="cursor:pointer;">✕</button>` : ''}
      </div>
    </div>
  `;
}

// ── 工具函数 ──────────────────────────────────────────────────
// P1：过期判定已收敛于 services/todo.js isTodoExpired（2026-09-07）；本地实现移除
