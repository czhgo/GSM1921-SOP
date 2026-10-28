// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/record/workgroup-view.js — 「活动工作组」只读一览
// ════════════════════════════════════════════════════════════════
// 由来（2026-10-24 spec rebuild-notification-and-data-truth · Task 5）：
//   支书问「知情查看工作组 为什么只有专班？」——根因是调用方写死分段（支书台 `views:['taskforce']`），
//   组件从未提供「活动工作组」段。工作组数据本身完整（`workgroups.kind==='activity'`，
//   由活动派生，含 members / grants / tasks），故本件只补**只读读口**，不新建数据源。
//
// 口径（看 ≠ 做）：
//   · 数据＝既有 `mockDB.workgroups / workgroupMembers`（hydrate 后与当前数据源同步）+ `loadActivities()`，
//     不新增接口、不复制第二份集合；
//   · 只读：**不渲染任何写入口**（无增删成员 / 授权 / 编辑控件），办事一律回活动详情；
//   · 行结构＝`components/ui/list-row.js::listRowHtml`（nav 行，整行可点）；检索 / 翻页＝`ui/list-filter.js`；
//     空态＝`ui/empty-state.js`（一句话 + 一个下一步）；状态＝`.state-badge` 既有族。
import { mockDB } from '../../core/domain/domain.js?v=20261028e';
import { loadActivities } from '../../services/activity/activity.js?v=20261028e';
import { getPersonName } from '../../services/member/person.js?v=20261028e';
import { AuthStore } from '../../services/core/auth.js?v=20261028e';
import { getBranchIdOfPerson } from '../../services/branch/branch.js?v=20261028e';
import { listRowHtml } from '../ui/list-row.js?v=20261028e';
import { renderFilteredList } from '../ui/list-filter.js?v=20261028e';
import { emptyStateHtml } from '../ui/empty-state.js?v=20261028e';
import { renderCardHeader } from '../shell/page-frame.js?v=20261028e';
import { flashHighlight, escHtml as esc } from '../../core/base/utils.js?v=20261028e';
// Task 6：工作组行 → 所属活动完整详情页（direct）；缺 id 时不给 href。
import { objectDetailHref } from '../../core/domain/object-route.js?v=20261028e';

// 工作组状态 → 文案 / 色调（活动工作组只会出现 active / archived，其余键沿用统一状态词）
const STATUS_META = {
  active: { label: '进行中', tone: 'success' },
  recruiting: { label: '招募中', tone: 'warning' },
  pending_review: { label: '待表决', tone: 'info' },
  draft: { label: '草稿', tone: 'neutral' },
  completed: { label: '已完结', tone: 'success' },
  archived: { label: '已归档', tone: 'neutral' },
  dissolved: { label: '已解散', tone: 'neutral' },
};

function _statusOf(status) {
  return STATUS_META[status] || { label: status || '—', tone: 'neutral' };
}

/** 本支部活动工作组集合（只读投影；成员数 / 负责人均取工作组主源，不读活动镜像） */
function _loadActivityWorkgroups(branchId) {
  const activities = loadActivities();
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const members = Array.isArray(mockDB.workgroupMembers) ? mockDB.workgroupMembers : [];
  const rows = (Array.isArray(mockDB.workgroups) ? mockDB.workgroups : [])
    .filter((w) => w && w.kind === 'activity' && w.sourceId)
    .filter((w) => (w.branchId || activityById.get(w.sourceId)?.branchId || branchId) === branchId)
    .map((w) => {
      const activity = activityById.get(w.sourceId) || null;
      const groupMembers = members.filter((m) => m && m.workgroupId === w.id && m.status !== 'removed');
      const organizer = groupMembers.find((m) => m.role === 'organizer')?.personId || activity?.organizer || null;
      return {
        id: w.id,
        name: w.name || activity?.title || w.id,
        sourceId: w.sourceId,
        activity,
        status: w.status,
        ownerId: organizer,
        memberCount: groupMembers.length,
      };
    });
  // 新活动在前；同日按组名稳定排序
  return rows.sort((a, b) => String(b.activity?.date || '').localeCompare(String(a.activity?.date || ''))
    || String(a.name).localeCompare(String(b.name)));
}

/** 深链目标：`highlightWorkgroupId` 优先；旧 `highlightActId` 映射到该活动的工作组 */
function _resolveTarget(rows, opts) {
  if (opts.highlightWorkgroupId) {
    return rows.find((r) => r.id === opts.highlightWorkgroupId) || null;
  }
  if (opts.highlightActId) {
    return rows.find((r) => r.sourceId === opts.highlightActId) || null;
  }
  return null;
}

function _requestedHighlight(opts) {
  return !!(opts.highlightWorkgroupId || opts.highlightActId);
}

/** 「去看活动日历」：点当前台的日历 / 活动动态页签（各台 id 不同，按 data-*-tab 值匹配，不写死台名） */
function _bindGoCalendar(container) {
  container.querySelector('[data-wg-go-calendar]')?.addEventListener('click', () => {
    const tabs = [...document.querySelectorAll('button.tab-btn')];
    const target = tabs.find((btn) => {
      const attr = [...btn.attributes].map((a) => a.name).find((n) => /^data-[\w-]+-tab$/.test(n));
      return attr && ['calendar', 'activities'].includes(btn.getAttribute(attr));
    });
    target?.click();
  });
}

/** 单行：工作组名 + 所属活动 / 负责人 / 成员数 + 状态徽标；整行点进活动详情 */
function _rowHtml(row) {
  const status = _statusOf(row.status);
  const ownerName = row.ownerId ? (getPersonName(row.ownerId) || row.ownerId) : '—';
  const activityTitle = row.activity?.title || '';
  // 活动工作组名由活动标题派生 ⇒ 两者同名时不重复复述；日期用于区分同名活动
  const sourceParts = [activityTitle && activityTitle !== row.name ? activityTitle : '', row.activity?.date || '']
    .filter(Boolean);
  const sourcePart = sourceParts.length ? `所属活动 ${sourceParts.join(' · ')} · ` : '';
  const detailHref = objectDetailHref('activity', row.sourceId, { entry: 'workspace-aggregate' });
  const href = detailHref ? `./${detailHref}` : '';
  return listRowHtml({
    title: row.name,
    meta: `${sourcePart}负责人 ${ownerName} · 成员 ${row.memberCount} 人`,
    trailing: `<span class="state-badge state-badge--${status.tone}">${esc(status.label)}</span>`
      + '<span class="text-xs text-accent whitespace-nowrap">进入活动 →</span>',
    href,
    dataAttrs: { 'data-wg-id': row.id, 'data-wg-activity-id': row.sourceId },
    rowType: 'nav',
  });
}

/**
 * 渲染「活动工作组」只读段。
 * @param {HTMLElement} container — `insight-view` 的 `#insight-seg-body`（每次换新节点）
 * @param {Object} [opts]
 * @param {string} [opts.highlightWorkgroupId] — 深链工作组 id（定位 + 高亮）
 * @param {string} [opts.highlightActId] — 旧深链活动 id（映射到所属活动的工作组）
 * @param {Function} [opts.onLocated] — 定位完成后回调
 */
export function renderWorkgroupView(container, opts = {}) {
  if (!container) return;
  const me = AuthStore.getCurrentUser() || {};
  const branchId = me.branchId || getBranchIdOfPerson(me.personId);
  const allRows = _loadActivityWorkgroups(branchId);
  const target = _resolveTarget(allRows, opts);
  const locateFailed = _requestedHighlight(opts) && !target;
  // 深链目标置顶（否则分页后定位目标可能不在当前页）
  const rows = target ? [target, ...allRows.filter((r) => r.id !== target.id)] : allRows;

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      ${renderCardHeader({ title: '活动工作组', meta: '本支部 · 只读' })}
      ${locateFailed
        ? '<p class="mt-2 text-xs text-amber-700" role="status">未找到对应的活动工作组（可能已归档或不属于本支部）。</p>'
        : ''}
      <div id="wgv-list" class="mt-3"></div>
    </div>`;

  const listEl = container.querySelector('#wgv-list');
  if (!rows.length) {
    listEl.innerHTML = emptyStateHtml('暂无活动工作组。', {
      actionHtml: '<button type="button" class="btn-outline" data-wg-go-calendar>去看活动日历</button>',
    });
    _bindGoCalendar(container);
    return;
  }

  renderFilteredList(listEl, {
    stateKey: 'insight-workgroup-list',
    rows,
    keyword: { keys: ['name'], placeholder: '搜索工作组名称…' },
    facets: [],
    countUnit: '个',
    // 深链目标在场时不分页，保证定位可落；日常浏览按引擎缺省 10 条分页
    pageSize: target ? 0 : 10,
    emptyMessage: '没有匹配的工作组',
    rowHtml: (row) => _rowHtml(row),
  });

  if (!target) return;
  setTimeout(() => {
    const rowEl = [...container.querySelectorAll('[data-wg-id]')].find((el) => el.dataset.wgId === target.id);
    if (!rowEl) return;
    rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flashHighlight(rowEl);
    if (typeof opts.onLocated === 'function') opts.onLocated();
  }, 180);
}
