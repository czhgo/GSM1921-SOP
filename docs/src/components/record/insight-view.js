// role: [工程师]+[AI]
// insight-view.js — 「知情查看」共享组件（支书 2026-09-14 裁定：功能同质薄壳合并）
// 合并前：纪检台/组长台「专班查看」、组织台「活动查看」是三个各 12~14 行的薄壳，内容同为只读知情视图。
// 合并后：每组一个「知情查看」tab，内部分段（互斥视图切换允许分段钮，仅筛选行禁 chip）：
//   · 工作组 = 复用 workgroup-view.js（本支部 `kind='activity'` 的活动工作组，只读）
//   · 专班   = 复用 taskforce-view.js
//   · 其他组 = 复用 other-groups-view.js（仅组长台；只读别组的组员进展 / 复盘 / 考勤 / 考察）
// 分段钮沿用既有互斥视图笔法（照 disc/inspection-tab.js:41-44 + 204-216 的 data-view 钮组，不自造 chip）。
// 设计原则沿用支书原裁定：「无职责 不代表 没有知情权」。
// 2026-10-03 批次 366（`D-755` 支书口径「**知情查看 查看的是 他的赋权下游**」）：
//   **分段集合可传入**（`opts.views`）——由「赋权下游」派生时只出命中段（判据单一源
//   `core/domain/work-map.js::downstreamViewSegments`；**下游可配置** ⇒ 分段随之可配置）。
// 2026-10-24（spec rebuild-notification-and-data-truth · Task 5）：支书问「工作组 为什么只有专班？」
//   ⇒ 补「工作组」段；缺省分段改为 `workgroup + taskforce`。**活动一览不再在本页重复**
//   （活动管理 / 活动日历已承载），故本组件不再引用 activity-view.js。
// 页内说明只留一句：本页只读；活动工作组在活动详情可办事。

// 2026-10-25（spec Task 5 · IA 62→45）：**一级分段只放同层对象**——「活动工作组 / 专班工作组」两枚；
//   「其他党小组」不再进分段集合（组织单元 ≠ 协作结构），改由调用方以**独立区**呈现
//   （`opts.groupSection`；组件仍复用 `other-groups-view.js`，组长台用）。
//   `opts.embedded` 供「工作概况」页内卡复用（不重复页头 H2）。

// 分段当前值（'workgroup' | 'taskforce'）；模块级记忆，同台内切换后保留（参照既有 tab 的 _view 模式）
import { renderTabHeader, renderCardHeader } from '../shell/page-frame.js?v=20261028e';

let _view = null;
// 已消费的深链定位目标：同一目标只强制分段一次，之后不覆盖用户手动的分段选择
let _consumedHighlight = null;

const SEG_LABEL = { workgroup: '活动工作组', taskforce: '专班工作组' };
const SEG_TYPES = ['workgroup', 'taskforce'];

/** 分段钮激活态同步：与 `.btn-tab.active` 同一选中态单一源（theme soft 三件套）。 */
function _syncSegBtns(container, view) {
  container.querySelectorAll('.insight-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.iview === view);
  });
}

/**
 * 渲染「知情查看」视图（**活动工作组 / 专班工作组** 两段互斥切换；其他党小组走独立区）
 * @param {HTMLElement} container — 工作台 tab 内容容器（#xxx-tab-content）
 * @param {Object} [opts]
 * @param {'workgroup'|'taskforce'} [opts.defaultView] — 首次进入的分段（缺省 workgroup）
 * @param {string} [opts.highlightWorkgroupId] — URL 携带的工作组 id（优先切到「活动工作组」分段并定位+高亮）
 * @param {string} [opts.highlightActId] — URL 携带的 activityId（映射到「活动工作组」段的所属活动，定位+高亮）
 * @param {string} [opts.highlightTfId]  — URL 携带的 taskforceId（命中则切到「专班工作组」分段并定位+高亮）
 * @param {boolean} [opts.readonly] — 只读形态（知情查看恒为只读，保留入参兼容既有调用方）
 * @param {Array} [opts.taskforces] — 专班分段的数据集合（缺省回退 `TaskForceRecordStore.getAll()`）
 * @param {Array<'workgroup'|'taskforce'>} [opts.views] — **允许的分段集合**（缺省＝两段）
 * @param {boolean} [opts.groupSection] — 是否在分段之下追加**独立区**「其他党小组」（组长台用；不与分段钮同排）
 * @param {boolean} [opts.embedded] — 页内卡形态（不渲染页头 H2；供工作概况复用）
 * @param {Function} [opts.onLocated] — 定位完成后回调（调用方据此清除导航目标）
 * @returns {Promise} 分段内容懒加载完成的 Promise（供 tab-bar 占位收尾）
 */
export function renderInsightView(container, opts = {}) {
  if (!container) return;
  // 跨 tab 共享容器约定（同 todo / overview / calendar / group-progress …）：登记当前 tab 标记，防
  //   「活动管理 → 知情查看 → 活动管理」残留旧内容（calendar-tab 等以 dataset.currentTab 守卫决定是否重建骨架）。
  //   本组件被多台共用（支书 / 组长 / 成员），各台此 tab 的注册 id 统一为 `tf-view`
  //   ⇒ 标记即 'tf-view'（与各调用点注册 id 同值）。
  container.dataset.currentTab = 'tf-view';
  // 深链定位优先（仅首次）：定位目标属于哪一段就切到哪一段（对齐合并前「直达即落在该 tab」的行为）；
  // 已消费过的同一目标不再强制，避免重渲染把用户手切的分段顶回去。
  const hlKey = opts.highlightWorkgroupId ? `w:${opts.highlightWorkgroupId}`
    : (opts.highlightActId ? `a:${opts.highlightActId}`
      : (opts.highlightTfId ? `t:${opts.highlightTfId}` : null));
  // 允许的分段集合：缺省＝活动工作组 + 专班工作组；历史 'group' 值一律丢弃（组织单元不进分段）。
  const _want = Array.isArray(opts.views) ? opts.views.filter((v) => SEG_TYPES.includes(v)) : [];
  const ALLOWED = _want.length ? _want.slice() : ['workgroup', 'taskforce'];
  if (hlKey && hlKey !== _consumedHighlight) {
    _consumedHighlight = hlKey;
    // **深链目标优先**：定位目标所属段若不在允许集合内，临时并入——否则「URL 定位目标无处可显」
    //   （台账 2026-08-08 支书裁定「activityId 必须消费」；本并入**只在该次定位**生效，如实登记）。
    const target = (opts.highlightWorkgroupId || opts.highlightActId) ? 'workgroup' : 'taskforce';
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
    // 2026-10-25 Task 4（同屏纵向一致）：分段钮只保留 `.btn-tab`（32px / 13px，选中 `.active`）；
    //   独立区卡头与其它分区头同走 renderCardHeader；说明一律后置到内容之后。
    container.innerHTML = `
      ${opts.embedded ? '' : renderTabHeader({ title: opts.title || '知情查看' })}
      <div class="flex items-center gap-2 mb-3" role="group" aria-label="工作组对象切换">
        ${ALLOWED.map((v) => `<button type="button" class="btn-tab insight-view-btn" data-iview="${v}">${SEG_LABEL[v]}</button>`).join('')}
      </div>
      <div id="insight-seg-body"></div>
      ${opts.groupSection ? `<div class="card rounded-xl p-4 mt-4" id="insight-group-section">
        ${renderCardHeader({ title: '其他党小组 · 只读' })}
        <div id="insight-group-body"></div>
      </div>` : ''}
      <p class="text-xs text-gray-500 mt-3">${opts.embedded ? '活动工作组在活动详情可办事。' : '本页只读；活动工作组在活动详情可办事。'}</p>`;
    container.querySelectorAll('.insight-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.iview === _view) return;
        _view = btn.dataset.iview;
        renderInsightView(container, opts);
      });
    });
  }
  _syncSegBtns(container, view);

  // 分段内容容器每次都换新节点：子组件（workgroup-view / taskforce-view）以容器标志判断首帧骨架，
  // 换新节点可保证切换分段后子组件完整重建骨架，不残留上一段 DOM、不误判「已初始化」。
  const body = document.createElement('div');
  body.id = 'insight-seg-body';
  container.querySelector('#insight-seg-body').replaceWith(body);

  let done;
  if (view === 'taskforce') {
    done = import('./taskforce-view.js?v=20261028e').then(m => m.renderTaskforceView(body, {
      highlightId: opts.highlightTfId || null,
      taskforces: opts.taskforces,
      onLocated: opts.onLocated,
    }));
  } else {
    done = import('./workgroup-view.js?v=20261028e').then(m => m.renderWorkgroupView(body, {
      highlightWorkgroupId: opts.highlightWorkgroupId || null,
      highlightActId: opts.highlightActId || null,
      onLocated: opts.onLocated,
    }));
  }

  // 「其他党小组」独立区：**不与上方分段钮同排**（组织单元 ≠ 协作结构）；只读、看≠做。
  let groupDone;
  if (opts.groupSection) {
    const groupBody = document.createElement('div');
    groupBody.id = 'insight-group-body';
    container.querySelector('#insight-group-body')?.replaceWith(groupBody);
    groupDone = import('./other-groups-view.js?v=20261028e')
      .then(m => m.renderOtherGroupsView(groupBody));
  }
  return Promise.all([done, groupDone]);
}
