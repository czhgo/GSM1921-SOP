// role: [工程师]+[AI]
// entries/tabs/shared/activity-calendar-tab.js — **全角色共用的只读「活动日历」页签**
//
// 由来（2026-09-30 批次 310，支书裁定，逐字）：「…即使是支部书记/其他支委 投票，在投票的时候
//   也就是普通党员。只把这个设计在 支书工作台中 是否欠妥？我不知道 每个人的 div 是否有所区别？
//   **每个人应该都有这样的活动日历界面，可以从桌面的部分日历 跳转过来！**」
//   ⇒ 此前「活动日历」只长在支书台（`secretary/calendar-tab.js`，含统计条 / 写入活动 / 活动查询
//   三件管侧与写侧面），其余六台**看不到本支部的活动日历**。本模块把「日历」这一面单独抽出，
//   供成员 / 党小组长 / 三委员五台挂载（支书台仍用其管侧那套，不改）；各台共用**同一个**渲染引擎。
//
// 本页签的**能力边界**（只读，不做第二套写口）：
//   · 只渲「月 / 周 / 日 / 列表」四视图 ＋ 类别图例 ＋ 月份选择（引擎单一源 `components/record/calendar.js`）；
//   · **不挂**写入按钮 / 统计条 / 活动查询 / 右侧 inspector 详情面板——那些是支书台的管侧面，
//     挂在各成员台上既越权、又与「详情页」重复建设；
//   · 点击活动条目 → `activity.html?id=…`（**既有落点**，与首页「近期活动」日历同一条跳转机制；
//     不新增机制、不在本页复刻详情）；日期格留白点击不产生动作（本页无 inspector 可消费选中态）。
//
// 容器约定：引擎按**固定 id** 取渲染槽（`month-selector` / `cal-main-grid` / `cal-view-switcher` /
//   `calendar-legend`）。每页只挂一份日历（支书台、首页各自独立页），故不冲突。
// 渲染槽存在性判定用 `#cal-main-grid`，**不用** `dataset.currentTab` 标记——后者在「其它 tab 换了
//   容器内容却没登记标记」时会把本页判成「已在位」而跳过骨架重建，留下空白（同 today-tab 2026-09-25
//   真机实测的残留病）。

import { getAppState } from '../../../core/base/state.js?v=20261003d';
import { populateMonthSelector, renderCalendarByActivities } from '../../../components/record/calendar.js?v=20261003d';

const TAB_HTML = `
  <div class="card rounded-xl p-5">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">活动日历</h3>
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <select id="month-selector" class="input-flat text-xs" style="min-width:120px;"></select>
      <div id="cal-view-switcher"></div>
    </div>
    <div id="cal-main-empty" class="hidden text-sm text-gray-500 text-center py-8">本月暂无活动</div>
    <div id="cal-main-grid"></div>
    <div id="calendar-legend" class="mt-3"></div>
  </div>
`;

/**
 * 渲染只读活动日历页签。
 * @param {HTMLElement} container — 本台页签内容容器（`<prefix>-tab-content`）
 * @param {Object} [state] — 全局 appState（取 activities / tasks / displayMonth / calendarView）；缺省现读
 */
export function renderContent(container, state) {
  if (!container) return;

  if (!container.querySelector('#cal-main-grid')) {
    container.innerHTML = TAB_HTML;
    // 活动条目 → 活动详情页。capture 阶段截断：引擎在条目自身上还绑了「选中日期 → 内部详情」链路
    // （本页没有 inspector 去消费它）——capture 先跑并 stopPropagation，目标节点的监听即不再执行。
    container.querySelector('#cal-main-grid')?.addEventListener('click', (e) => {
      const item = e.target.closest?.('.cal-activity-item');
      if (!item) return;
      e.stopPropagation();
      const id = item.dataset.actId;
      // 用 `window.location =`（不带 `.href`）——与 `today-tab.js` 同款：`link-integrity::L2`
      // 只扫「location 点 href 赋值」这一形态（连注释里的同形写法也会被它当跳转目标抽走），
      // 带 query 的拼接会被误判为「目标文件不存在」。
      if (id) window.location = 'activity.html?id=' + encodeURIComponent(id);
    }, true);
  }

  const st = state || getAppState() || {};
  const activities = st.activities || [];
  const displayMonth = populateMonthSelector(activities, st.displayMonth || undefined);
  renderCalendarByActivities({ ...st, activities }, displayMonth);
}
