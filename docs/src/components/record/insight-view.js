// role: [工程师]+[AI]
// insight-view.js — 「知情查看」共享组件（支书 2026-09-14 裁定：功能同质薄壳合并）
// 合并前：纪检台/组长台「专班查看」、组织台「活动查看」是三个各 12~14 行的薄壳，内容同为只读知情视图。
// 合并后：每组一个「知情查看」tab，内部分段（互斥视图切换允许分段钮，仅筛选行禁 chip）：
//   · 活动 = 复用 activity-view.js（只读 readonly 形态，组织台原 readonly:true 不变）
//   · 专班 = 复用 taskforce-view.js
// 分段钮沿用既有互斥视图笔法（照 disc/inspection-tab.js:41-44 + 204-216 的 data-view 钮组，不自造 chip）。
// 设计原则沿用支书原裁定：「无职责 不代表 没有知情权」。
// 2026-10-03 批次 366（`D-755` 支书口径「**知情查看 查看的是 他的赋权下游**」）：
//   **分段集合可传入**（`opts.views`）——由「赋权下游」派生时只出命中段（判据单一源
//   `core/domain/work-map.js::downstreamViewSegments`；**下游可配置** ⇒ 分段随之可配置）。
//   缺省（不传）＝两段都有 ⇒ **既有 5 台行为零变化**，逐台分批再切。

// 分段当前值（'activity' | 'taskforce'）；模块级记忆，同台内切换后保留（参照既有 tab 的 _view 模式）
let _view = null;
// 已消费的深链定位目标：同一目标只强制分段一次，之后不覆盖用户手动的分段选择
let _consumedHighlight = null;

const SEG_ON_CLASSES = [
  'bg-[var(--app-accent-bg)]',
  'border-[var(--app-accent)]',
  '[color:color-mix(in_srgb,var(--app-accent)_60%,#000)]',
];
const SEG_OFF_CLASSES = ['bg-white', 'border-neutral-200', 'text-gray-600'];

/** 分段钮激活态同步（与 disc/inspection-tab.js 的视图钮同款视觉：主题浅底 + 主题色字/边框） */
function _syncSegBtns(container, view) {
  container.querySelectorAll('.insight-view-btn').forEach(btn => {
    const on = btn.dataset.iview === view;
    SEG_ON_CLASSES.forEach(c => btn.classList.toggle(c, on));
    SEG_OFF_CLASSES.forEach(c => btn.classList.toggle(c, !on));
    if (on) btn.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent) 55%, #fff)');
    else btn.style.removeProperty('--acc-text-dark');
  });
}

/**
 * 渲染「知情查看」视图（活动 / 专班 两分段互斥切换）
 * @param {HTMLElement} container — 工作台 tab 内容容器（#xxx-tab-content）
 * @param {Object} [opts]
 * @param {'activity'|'taskforce'} [opts.defaultView] — 首次进入的分段（缺省 activity）
 * @param {string} [opts.highlightActId] — URL 携带的 activityId（命中则切到「活动」分段并定位+高亮）
 * @param {string} [opts.highlightTfId]  — URL 携带的 taskforceId（命中则切到「专班」分段并定位+高亮）
 * @param {boolean} [opts.readonly] — 活动分段只读（缺省 true，知情查看=只读形态）
 * @param {Array<'activity'|'taskforce'>} [opts.views] — **允许的分段集合**（缺省＝两段都有；由「赋权下游」派生时只出命中段）
 * @param {Function} [opts.onLocated] — 定位完成后回调（调用方据此清除导航目标）
 * @returns {Promise} 分段内容懒加载完成的 Promise（供 tab-bar 占位收尾）
 */
export function renderInsightView(container, opts = {}) {
  if (!container) return;
  // 跨 tab 共享容器约定（同 todo / overview / calendar / group-progress …）：登记当前 tab 标记，防
  //   「活动管理 → 知情查看 → 活动管理」残留旧内容（calendar-tab 等以 dataset.currentTab 守卫决定是否重建骨架）。
  //   本组件被 6 台共用（支书 / 纪检 / 组长 / 组织 / 宣传 / 成员），各台此 tab 的注册 id 统一为 `tf-view`
  //   ⇒ 标记即 'tf-view'（与各调用点注册 id 同值）。
  container.dataset.currentTab = 'tf-view';
  // 深链定位优先（仅首次）：定位目标属于哪一段就切到哪一段（对齐合并前「直达即落在该 tab」的行为）；
  // 已消费过的同一目标不再强制，避免重渲染把用户手切的分段顶回去。
  const hlKey = opts.highlightActId ? `a:${opts.highlightActId}` : (opts.highlightTfId ? `t:${opts.highlightTfId}` : null);
  // 允许的分段集合（2026-10-03 批次 366 · `D-755`）：缺省＝两段；**由「赋权下游」派生时只出命中段**。
  const _want = Array.isArray(opts.views) ? opts.views.filter((v) => v === 'activity' || v === 'taskforce') : [];
  const ALLOWED = _want.length ? _want.slice() : ['activity', 'taskforce'];
  if (hlKey && hlKey !== _consumedHighlight) {
    _consumedHighlight = hlKey;
    // **深链目标优先**：定位目标所属段若不在允许集合内，临时并入——否则「URL 定位目标无处可显」
    //   （台账 2026-08-08 支书裁定「activityId 必须消费」；本并入**只在该次定位**生效，如实登记）。
    const target = opts.highlightActId ? 'activity' : 'taskforce';
    if (!ALLOWED.includes(target)) ALLOWED.unshift(target);
    _view = target;
  }
  const view = (_view && ALLOWED.includes(_view))
    ? _view
    : (ALLOWED.includes(opts.defaultView) ? opts.defaultView : ALLOWED[0]);
  _view = view;

  // 骨架（含分段钮）。以 #insight-seg-body 是否存在为准而非 dataset 标志：
  // tab 内容容器跨 tab 切换复用，dataset 标志在「切走再切回」时会残留，导致骨架不再重建。
  // 另：分段钮集合与 ALLOWED 不一致时（如深链并入后）也要重建，否则切不回去。
  const _segBtns = [...container.querySelectorAll('.insight-view-btn')];
  const _segSame = _segBtns.length === ALLOWED.length && _segBtns.every((b) => ALLOWED.includes(b.dataset.iview));
  if (!container.querySelector('#insight-seg-body') || !_segSame) {
    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs text-gray-500">全支部一览 · 点击条目查看详情（只读）</span>
        <div class="flex items-center gap-2">
          ${ALLOWED.map((v) => `<button type="button" class="btn-tab insight-view-btn px-3 py-1.5 text-xs font-medium" data-iview="${v}">${v === 'activity' ? '活动' : '专班'}</button>`).join('')}
        </div>
      </div>
      <div id="insight-seg-body"></div>`;
    container.querySelectorAll('.insight-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.iview === _view) return;
        _view = btn.dataset.iview;
        renderInsightView(container, opts);
      });
    });
  }
  _syncSegBtns(container, view);

  // 分段内容容器每次都换新节点：子组件（activity-view / taskforce-view）以容器 dataset 标志判断首帧骨架，
  // 换新节点可保证切换分段后子组件完整重建骨架，不残留上一段 DOM、不误判「已初始化」。
  const body = document.createElement('div');
  body.id = 'insight-seg-body';
  container.querySelector('#insight-seg-body').replaceWith(body);

  if (view === 'taskforce') {
    return import('./taskforce-view.js?v=20261004d').then(m => m.renderTaskforceView(body, {
      highlightId: opts.highlightTfId || null,
      onLocated: opts.onLocated,
    }));
  }
  return import('./activity-view.js?v=20261004d').then(m => m.renderActivityView(body, {
    highlightId: opts.highlightActId || null,
    // 知情查看 = 只读形态（组织台原「活动查看（只读）」的 readonly:true 合并后保持不变）
    readonly: opts.readonly !== false,
    onLocated: opts.onLocated,
  }));
}
