// role: [工程师]+[AI]
// components/todo-tab-shell.js — 待办 tab 公共壳（T-304 代码减负 2026-08-30；IA-C1 Task4 域化重构 2026-09-07）
// 背景：6 个工作台 todo-tab 骨架逐字重复（选中首条 / renderTodoList / 两栏 HTML / 删除 / 详情按钮绑定），
//       书记 2026-08-30：「模块化只见代码增多少见代码减少」→ 共性抽壳。
// 设计：createTodoTab(opts) 工厂，每个角色一个实例（状态自持，与原模块级私有状态等价）。
// IA-C1 Task4（按工作类型 9 域折组，spec .trae/specs/2026-09-06-ia-todo-cards/spec.md）：
//   输出区 = ① 页顶「未读通知 N 条」轻量条（getUnreadNotices；点击展开阅读列表，点读即消）
//          ② 9 业务域折组列表（getDomainsWithGroups + buildRealtimeGroups 实时组经
//            mergeRealtimeDomains 并入对应域；域头=域名+计数+逾期红点，有活才显）
//          ③ 各角色自定义渲染区（extraTopHtml/bindExtras）照旧挂载
//   角色差异经参数注入：containerId/prefix/role/onAction/buildRealtimeGroups/renderDetail/
//       onBeforeRender/onAfterRender/extraTopHtml/bindExtras/emptyHint/detailTitle/
//       detailBtnClass/detailBtnStyle/onDeleteTodo。
// 视觉沿用 card/rounded/折叠既有体系（域折组渲染在 components/todo-list.js renderDomainTodoList）。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §六 M6（共性抽象净减）

import { TodoStore } from '../services/todo.js?v=20260907b';
import { renderDomainTodoList } from './todo-list.js?v=20260907b';
import { badgeHtml } from './badges.js?v=20260903c';
import { showToast } from '../core/utils.js?v=20260903c';
import { solidAccentStyle } from '../core/constants.js?v=20260903c';
import { mockDB } from '../core/domain.js?v=20260903c';
import { tokenOf } from '../core/version-token.js?v=20260907b'; // P0 域写版本戳（spec §二.4）
import { memoizeRender } from './memoize-render.js?v=20260907b'; // P2 渲染守卫（spec §四.1）

// ── P0 组合数据复合键（2026-09-07 · spec §二.4）──────────────────
// 组合点（buildRealtimeGroups + mergeRealtimeDomains + getUnreadNotices）以
// 「各域写版本戳 tokenOf + 各源数组 length + todo 写版本 + 日期」为键记忆化：
// 未写 → 直接复用上次组合结果（⚠️ 返回对象只读契约——调用方仅读渲染）；
// 数据变化经写口 bump / 源数组长度指纹触发键变重算（含禁改 adapter 直写路径的 length 兜底）。
// role 每壳固定（createTodoTab 单角色实例）仍纳入键，防未来同壳复用。
const _COMBO_LEN_KEYS = [
  ['attendance', 'attendances'],
  ['activity', 'activities'],
  ['inspection', 'inspections'],
  ['activityReview', 'activityReviews'],
  ['archiveRecord', 'archiveRecords'],
  ['taskforce', 'taskforces'],
  ['resolution', null], // 决议 = 活动 agenda 内嵌：activities 长度 + activity/resolution 令牌已覆盖
  ['signup', 'signups'],
  ['handoff', 'handoffs'],
  ['memberConfirmation', 'pendingMemberConfirmations'],
  ['notice', 'notices'],
];
function _comboKeyOf(role) {
  const parts = _COMBO_LEN_KEYS.map(([tok, arr]) => {
    const len = arr ? (Array.isArray(mockDB[arr]) ? mockDB[arr].length : '') : '';
    return len === '' ? `${tok}=${tokenOf(tok)}` : `${tok}=${tokenOf(tok)}+${len}`;
  });
  parts.push(`todo=${tokenOf('todo')}`);
  parts.push(`member=${tokenOf('member')}`);
  parts.push(`day=${new Date().toISOString().slice(0, 10)}`);
  parts.push(`role=${role}`);
  return parts.join(',');
}

/**
 * 创建待办 tab 壳实例
 * @param {Object} opts
 * @param {string} opts.containerId         工作台内容容器 id（如 'org-tab-content'）
 * @param {string} opts.prefix              事件/选择器前缀（如 'org'）
 * @param {string} opts.role                待办角色键（getByRole/getUnreadNotices 用）
 * @param {(todo:Object, ctx:Object)=>void} opts.onAction  角色特有动作处理（必填）
 * @param {(ctx:Object)=>Array} [opts.buildRealtimeGroups] 各台自定义「不落库」实时聚合组
 *        （书记 SecretaryTodoDeriver 组/决议逾期/成员变更/纪检队列等；壳统一
 *        mergeRealtimeDomains 并入对应业务域；缺省=[] 纯持久化域视图）
 * @param {(todo:Object, ctx:Object)=>string} [opts.renderDetail] 自定义详情渲染
 *        （书记按 kind/groupKey 分发；缺省=壳内置概要「去处理」）
 * @param {async (ctx:Object)=>void} [opts.onBeforeRender] 渲染前钩子（seedTodos/异步预载；await）
 * @param {async (container:Element, ctx:Object, api:Object)=>void} [opts.onAfterRender] 渲染后钩子
 *        （异步面板挂载，如书记成员变更确认面板；api={renderContent,clearSelection,selectedTodo}）
 * @param {string|(ctx:Object)=>string} [opts.extraTopHtml] 列表上方额外区块 HTML（数据交接/收件箱/专班区等）
 * @param {(container:Element, ctx:Object, api:Object)=>void} [opts.bindExtras] 额外绑定
 *        （handoff/成员变更/详情自定义按钮等；api 见 onAfterRender）
 * @param {string} [opts.emptyHint]         空态提示文案（缺省=通用）
 * @param {string} [opts.detailTitle]       右侧详情卡标题（缺省='详情'）
 * @param {string} [opts.detailBtnClass]    内置详情按钮 class（缺省=prefix-todo-detail-action）
 * @param {string} [opts.detailBtnStyle]    内置详情按钮内联样式（缺省=solidAccentStyle 主题色）
 * @param {null|(todo:Object, ctx:Object)=>void} [opts.onDeleteTodo] null=不渲染删除键（书记等实时组台）；
 *        函数=自定义；缺省=内置确认删除（聚合组删整组）
 */
export function createTodoTab(opts) {
  const {
    containerId,
    prefix,
    role,
    onAction,
    buildRealtimeGroups,
    renderDetail,
    onBeforeRender,
    onAfterRender,
    extraTopHtml = '',
    bindExtras,
    emptyHint = '或直接点击"去赋权/去审核"等按钮处理',
    detailTitle = '详情',
    detailBtnClass = `${prefix}-todo-detail-action`,
    detailBtnStyle,
    onDeleteTodo,
  } = opts;

  // 私有状态（随壳实例自持，不污染入口——与原模块级私有状态等价）
  let _selectedTodoId = null;
  // P0 组合点记忆化（每实例自持：复合键未变 → 复用上次组合数据对象；只读契约，见 _comboKeyOf 注释）
  let _lastComboKey = null;
  let _lastCombo = null; // { domains, allGroups, unreadNotices }

  /** U3（2026-09-07）待办两栏等高骨架（await onBeforeRender/数据聚合期间占位；styles.css 禁改不碰） */
  function _todoShellSkeletonHtml() {
    const row = '<div class="h-9 rounded-lg bg-gray-100 animate-pulse"></div>';
    return `
      <div data-ws-todo-skeleton class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 card rounded-xl p-5" style="min-height:340px;">
          <div class="h-4 w-20 rounded bg-gray-100 animate-pulse mb-4"></div>
          <div class="space-y-2.5">${row}${row}${row}${row}${row}</div>
        </div>
        <div class="lg:col-span-1 card rounded-xl p-5" style="min-height:220px;">
          <div class="h-4 w-12 rounded bg-gray-100 animate-pulse mb-4"></div>
          <div class="h-24 rounded-lg bg-gray-100 animate-pulse"></div>
        </div>
      </div>`;
  }

  /**
   * 详情渲染（内置缺省：聚合组 = 概要 + 处理入口；单项 = 状态 + 描述 + 处理）。
   * 角色自定义详情经 opts.renderDetail 覆盖（如书记 confirm/remind/成员确权逐项面板）。
   */
  function _renderTodoDetail(todo, ctx) {
    const btnStyle = detailBtnStyle || solidAccentStyle(ctx.accent, ctx.accentBorder);
    if (todo.groupKey) {
      return `
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="agg-count-badge text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums">${todo.count} 条待处理</span>
            ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
          </div>
          <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
          ${todo.flow ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.flow}</p>` : ''}
          ${todo.deadline ? `<div class="text-xs text-gray-500">最早截止：${todo.deadline}</div>` : ''}
          <div class="pt-3 border-t border-gray-100 flex gap-2">
            <button class="${detailBtnClass} text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${btnStyle}">去处理</button>
          </div>
        </div>
      `;
    }

    const statusLabel = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      expired: '已过期',
    }[todo.status] || todo.status;

    const statusColor = {
      pending: 'bg-orange-100 text-orange-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
    }[todo.status] || 'bg-gray-100 text-gray-500';

    return `
      <div class="space-y-3">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
            ${todo.priority === 'urgent' ? badgeHtml('紧急', 'warning') : ''}
          </div>
          <p class="font-title-cn text-sm font-bold text-gray-800">${todo.title}</p>
        </div>
        ${todo.description ? `<p class="text-xs text-gray-600 leading-relaxed">${todo.description}</p>` : ''}
        ${todo.deadline ? `<div class="text-xs text-gray-500">截止：${todo.deadline}</div>` : ''}
        <div class="text-xs text-gray-400">创建：${(todo.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
        <div class="pt-3 border-t border-gray-100 flex gap-2">
          ${todo.actionType ? `<button class="${detailBtnClass} text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">处理</button>` : ''}
        </div>
      </div>
    `;
  }

  /** 页顶「未读通知 N 条」轻量条（IA-C1：通知移出待办主列；无未读整条隐藏） */
  function _unreadBarHtml(notices) {
    const rows = notices.map(n => {
      const timeText = n.deadline
        ? `截止 ${n.deadline}`
        : String(n.createdAt || '').slice(0, 16).replace('T', ' ');
      return `
        <div class="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
          <span class="flex-1 min-w-0">
            <span class="block text-sm text-gray-800 truncate">${n.title || '未命名通知'}</span>
            <span class="block text-[11px] text-gray-400">${timeText}</span>
          </span>
          <button type="button" class="${prefix}-unread-open-btn text-xs px-2.5 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0" data-notice-id="${n.id}" style="cursor:pointer;">阅读</button>
          <button type="button" class="${prefix}-unread-read-btn text-xs px-2.5 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0" data-notice-id="${n.id}" style="cursor:pointer;">标记已读</button>
        </div>`;
    }).join('');
    return `
      <div class="card rounded-xl px-4 py-2.5 mb-4">
        <button type="button" class="${prefix}-unread-toggle w-full flex items-center justify-between text-left bg-transparent border-0 cursor-pointer px-1 py-1.5 rounded-lg hover:bg-gray-50 transition-colors" style="cursor:pointer;">
          <span class="flex items-center gap-2">
            <svg class="${prefix}-unread-arrow w-3 h-3 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
            <span class="font-title-cn text-sm font-semibold text-gray-800">未读通知 <span class="tabular-nums">${notices.length}</span> 条</span>
          </span>
        </button>
        <div class="${prefix}-unread-items hidden">
          ${rows}
        </div>
      </div>
    `;
  }

  async function renderContent(ctx) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // U3（2026-09-07）：onBeforeRender（seedTodos/异步预载）挂起期间若容器仍为壳骨架/空 →
    // 先换为待办两栏等高骨架（防 await 期 0 高与整块弹出）；已有真实内容（重渲染）保留由 tab-bar 置灰过渡
    // P2（2026-09-07）：此处分支会整体替换内容为骨架（非上次真实产物）→ 清 memoKey，
    //   渲染守卫随之落入重建路径（不会对骨架误命中跳过、留下无内容骨架）
    if (!container.innerHTML.trim() || container.querySelector('[data-ws-tab-loading-bar]')) {
      container.innerHTML = _todoShellSkeletonHtml();
      delete container.dataset.memoKey;
    }

    // 渲染前钩子（书记：seedTodos + 异步预载待答复汇报等）
    if (onBeforeRender) await onBeforeRender(ctx);

    // 刷新过期状态（P0 渲染链去重后唯一入口：各 todo-tab 的 onBeforeRender 不再重复调用；
    // 有实际变更 → TodoStore 写版本 +1 → 聚合缓存/组合键随之失效重算）
    TodoStore.refreshExpiredStatus();

    // P0 组合点记忆化：域视图数据（realtimeGroups 并入 + 未读通知）复合键未变 → 直接复用
    const comboKey = _comboKeyOf(role);
    let combo;
    if (comboKey === _lastComboKey && _lastCombo) {
      combo = _lastCombo;
    } else {
      const rtGroups = buildRealtimeGroups ? (buildRealtimeGroups(ctx) || []) : [];
      const domains = TodoStore.mergeRealtimeDomains(role, rtGroups);
      // 全部组（选中态查找；含持久化聚合组与并入的实时组）
      const allGroups = [];
      for (const d of domains) {
        if (Array.isArray(d.groups)) allGroups.push(...d.groups);
      }
      const unreadNotices = TodoStore.getUnreadNotices(role);
      combo = { domains, allGroups, unreadNotices };
      _lastComboKey = comboKey;
      _lastCombo = combo;
    }
    const { domains, allGroups, unreadNotices } = combo;

    // 自动选中首条（书记 2026-08-10 裁定推广）：进入待办即见第一条详情，减一次点击
    if (!_selectedTodoId && allGroups.length > 0) {
      _selectedTodoId = allGroups[0].groupKey;
    }
    const selectedTodo = _selectedTodoId
      ? (allGroups.find(g => g.groupKey === _selectedTodoId) || TodoStore.getById(_selectedTodoId) || null)
      : null;

    // ── P2 渲染守卫（2026-09-07 · spec §四.1/§四.2）─────────────────
    // 数据与视图参数未变 → 跳过整卡 HTML 拼装 / DOM 重建 / 事件绑定 / 异步面板重跑，
    // 现 DOM 原样保留（域折组折叠/组行选中/面板内交互状态不丢，旧事件绑定仍在）。
    // key = P0 组合复合键 comboKey（各域 token+length 指纹 + todo/member + 日期 + role）
    //   + 本卡自持交互状态（选中项 _selectedTodoId：换行选中须走重建）
    //   + issue 版本（书记 extraTopHtml「待答复收件箱/汇报时间线」依赖 IssueStore，
    //     其写口 bumpToken('issue') 见 services/issues.js——保证 extraTopHtml 内容随键覆盖；
    //     命中跳过时 bindExtras/onAfterRender/extraTopHtml 不再重跑，内容仍正确）。
    const renderKey = `${comboKey}|sel=${_selectedTodoId || ''}|issue=${tokenOf('issue')}`;

    const api = {
      renderContent: () => renderContent(ctx),
      clearSelection: () => { _selectedTodoId = null; },
      selectedTodo,
    };

    /** 整卡重建（仅守卫未命中时执行；产物含 data-ws-memo="todo-shell" 标记防跨 tab 误命中） */
    const rebuild = () => {
      // 删除处理：opts.onDeleteTodo=null → 禁删（实时组台）；函数 → 自定义；缺省 → 内置确认删除
      let deleteHandler = null;
      if (onDeleteTodo === null) {
        deleteHandler = null;
      } else if (typeof onDeleteTodo === 'function') {
        deleteHandler = (todo) => onDeleteTodo(todo, ctx);
      } else {
        deleteHandler = (todo) => {
          const items = todo.items && todo.items.length ? todo.items : [todo];
          const label = items.length === 1 ? items[0].title : `${items[0].title} 等 ${items.length} 条`;
          if (!window.confirm(`确认删除待办「${label}」？删除后不可恢复。`)) return;
          items.forEach(t => TodoStore.delete(t.id));
          showToast('success', '待办已删除');
          renderContent(ctx);
        };
      }

      const { html: domainListHtml, bindEvents } = renderDomainTodoList({
        prefix,
        domains,
        accent: ctx.accent,
        selectedTodoId: _selectedTodoId,
        onSelectTodo: (todo) => {
          _selectedTodoId = todo.groupKey || todo.id;
          renderContent(ctx);
        },
        onActionTodo: (todo) => {
          onAction(todo, ctx);
        },
        onDeleteTodo: deleteHandler,
        emptyHint,
      });

      // 未读通知条（无未读 → 整条隐藏；数据来自 P0 组合点记忆化结果，见上）
      const unreadHtml = unreadNotices.length > 0 ? _unreadBarHtml(unreadNotices) : '';

      const detailHtml = selectedTodo
        ? (renderDetail ? renderDetail(selectedTodo, ctx) : _renderTodoDetail(selectedTodo, ctx))
        : `
          <div class="text-center py-12 text-gray-400">
            <p class="text-sm">点击左侧待办查看详情</p>
            <p class="text-xs mt-1">${emptyHint}</p>
          </div>
        `;

      container.innerHTML = `
        ${typeof extraTopHtml === 'function' ? extraTopHtml(ctx) : extraTopHtml}
        ${unreadHtml}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4" data-ws-memo="todo-shell">
          <div class="lg:col-span-2">
            <div class="card rounded-xl p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-title-cn text-base font-semibold text-gray-800">我的待办</h3>
              </div>
              ${domainListHtml}
            </div>
          </div>
          <div class="lg:col-span-1">
            <div class="card rounded-xl p-5 sticky top-20">
              <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">${detailTitle}</h3>
              ${detailHtml}
            </div>
          </div>
        </div>
      `;

      // 域折组折叠 / 组行选中 / 行动按钮 / 删除
      bindEvents(container);

      // 未读条：展开阅读列表 + 标记已读（读后即消，重渲染）
      container.querySelector(`.${prefix}-unread-toggle`)?.addEventListener('click', () => {
        const items = container.querySelector(`.${prefix}-unread-items`);
        const arrow = container.querySelector(`.${prefix}-unread-arrow`);
        if (!items) return;
        items.classList.toggle('hidden');
        if (arrow) arrow.style.transform = items.classList.contains('hidden') ? 'rotate(-90deg)' : 'rotate(0deg)';
      });
      container.querySelectorAll(`.${prefix}-unread-open-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const notice = unreadNotices.find(x => x.id === btn.dataset.noticeId);
          if (!notice) return;
          // 直达通知详情页（T-234 F1 同款）；notice 页内已读自动销「通知阅读」待办
          const noticeId = notice.actionData?.noticeId || notice.sourceId || notice.id;
          const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
          window.location.href = `${basePath}notice.html?id=${noticeId}`;
        });
      });
      container.querySelectorAll(`.${prefix}-unread-read-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.noticeId;
          if (!id) return;
          TodoStore.complete(id);
          showToast('success', '已标记已读');
          renderContent(ctx);
        });
      });

      // 详情面板按钮事件（内置概要详情 / 书记 remind·seed 详情共用 detailBtnClass）
      container.querySelector(`.${detailBtnClass}`)?.addEventListener('click', () => {
        if (!_selectedTodoId) return;
        const group = allGroups.find(g => g.groupKey === _selectedTodoId);
        if (group) { onAction(group, ctx); return; }
        const todo = TodoStore.getById(_selectedTodoId);
        if (todo) onAction(todo, ctx);
      });

      // 角色扩展（handoff / 成员变更面板 / 自定义详情按钮如一键确认·逐项确认/退回 等）
      bindExtras?.(container, ctx, api);
    };

    // 命中（返回 false）→ 整卡保留、异步面板不再重跑（其内容随 renderKey 未变而正确）
    if (!memoizeRender(container, renderKey, rebuild, { marker: '[data-ws-memo="todo-shell"]' })) {
      return;
    }
    if (onAfterRender) await onAfterRender(container, ctx, api);
  }

  return { renderContent };
}
