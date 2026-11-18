// role: [工程师]+[AI]
// archive-entry.js — 归档库独立入口
// 2026-07-30: Tab 分类（活动/专班），替代原单一列表
// Task 3（2026-10-25）：`?tab=notice` 退役——消息有了唯一列表与「已归档」筛选，归档页只留活动、专班两栏。
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261110b';
import { renderHeader } from '../../components/shell/header.js?v=20261110b';
import { BranchService } from '../../services/core/runtime.js?v=20261110b';
import { mockDB, TaskforceStatus, TASKFORCE_TERMINAL_STATUSES } from '../../core/domain/domain.js?v=20261110b';
import { getPersonById, getPersonName } from '../../services/member/person.js?v=20261110b';
import { loadActivities } from '../../services/activity/activity.js?v=20261110b';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261110b';
import { getActivityTypeColors } from '../../core/domain/constants.js?v=20261110b';
// 活动「已结束」口径单一源（2026-09-13 收敛）：替代手写 status==='completed' || archived
// 2026-10-24 批次 508：归档库的「已归档活动」改用 `isActivityArchived`（仅看 archived 软标记），
//   与宣传台「档案归档」同口径——原 `isActivityEnded`（archived ∨ status==='completed'）会把
//   **已结束但尚未归档**的活动也算进归档库，与同页其它两栏（专班/通知只收归档件）不一致。
import { isActivityArchived } from '../../core/domain/constants.js?v=20261110b';
import { getBasePath, escHtml, showToast } from '../../core/base/utils.js?v=20261110b';
import { pageHref } from '../../core/base/page-url.js?v=20261110b';
// Task 6：归档弹窗是列表内预览（locate）⇒ 保留预览 + 「打开完整页」；深链校验归档终态。
import { objectDetailHref } from '../../core/domain/object-route.js?v=20261110b';
import { badgeHtml } from '../../components/ui/badges.js?v=20261110b';
// 图标单一源（批次 540：归档材料行的文件图标由内联 SVG 改为 icons.js）
import { icon } from '../../core/base/icons.js?v=20261110b';
// 翻页控件单一源（批次 38：全站手写翻页一律并轨 pagerHtml）
import { pagerHtml } from '../../components/ui/pager.js?v=20261110b';
import { openModal } from '../../components/ui/modal.js?v=20261110b';
// 批次 87：本页必须先 hydrate API 数据源再渲染——与 activity.html（批次 83 修好后的标准形）同款。
// 此前本页只调 BranchService.loadDB()（API 模式直接 return）⇒ api 形态下归档库读的是本地备份，
// 服务端已归档的活动 / 专班 / 通知看不到。
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261110b';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261110b';

import { emptyStateHtml } from '../../components/ui/empty-state.js?v=20261110b';
renderSidebar('archive');
renderHeader('archive');

/** 数据 hydrate（批次 87）：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。
 *  P0-2（2026-09-23 支书裁定「不许静默降级」）：判定收敛到 data/data-adapter.js::hydrateDataSource
 *  ——有 token 时 init() 失败即**显式失败**（「无法连接服务器」错误态 + 重试），不再回退可写 mock（静默丢单）。 */
async function _hydrateData() {
  try {
    const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
    if (!r.ok) return; // 错误态已由共享实现渲染（本页不再继续渲染业务内容）
  } catch (e) {
    console.warn('[archive-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

// ── Tab 切换 ──
const ARCHIVE_TABS = [
  { id: 'activity', label: '党建活动' },
  { id: 'taskforce', label: '专班' },
];
let _activeTab = 'activity';
// 2026-10-24 批次 508：归档库此前不读任何 URL 参数——外部深链（`?tab=taskforce&id=…`）一律落回
//   默认「党建活动」且不打开详情。现按既有页签 id 取值（非法值回落 activity），`id` 在首帧渲染后
//   打开对应详情浮窗（见 init 末尾 `_openArchivedDetail`）。
// Task 3（2026-10-25）：`?tab=notice` 已退役，重定向到消息中心「已归档」。
const _urlParams = new URLSearchParams(location.search);
const _tabParam = _urlParams.get('tab');
if (ARCHIVE_TABS.some(t => t.id === _tabParam)) _activeTab = _tabParam;
const _focusArchiveId = _urlParams.get('id') || '';
const _legacyNoticeTab = _tabParam === 'notice';
if (_legacyNoticeTab) {
  window.location.replace(pageHref(`${getBasePath()}messages.html?filter=archived`));
}

const tabContainer = document.getElementById('archive-tabs');
const contentContainer = document.getElementById('archive-tab-content');

function renderTabs() {
  if (!tabContainer) return;
  tabContainer.innerHTML = ARCHIVE_TABS.map(t => {
    const isActive = t.id === _activeTab;
    return `<button class="btn-tab ${isActive ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`;
  }).join('');

  tabContainer.querySelectorAll('.btn-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.tab;
      renderTabs();
      renderContent();
    });
  });
}

function renderContent() {
  if (!contentContainer) return;

  if (_activeTab === 'activity') renderActivityArchive();
  else if (_activeTab === 'taskforce') renderTaskforceArchive();
}

// ── 分页（支书 2026-08-08：归档数据无上限增长 → 前端分页，复用 query-view 分页模式）──
const PAGE_SIZE = 10;
const _pageState = { activity: 1, taskforce: 1 };

/** 搜索匹配（任一字段命中即显示） */
function _matchesQuery(...fields) {
  if (!_searchQuery) return true;
  const q = _searchQuery.toLowerCase();
  return fields.some(f => (f || '').toLowerCase().includes(q));
}

/** 分页控件（单一源 pagerHtml：共 N 条 · 第 x/y 页 + 上一页/页码/下一页；页数 ≤1 返回空串） */
function _renderPager(total, key) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cur = Math.min(_pageState[key], pages);
  return pagerHtml({ page: cur, pages, total, unit: '条' });
}

/** 归档行（活动 / 专班同一外壳）：标题 ＋ 可选徽标 ＋ 一行 meta。
 *  「已归档」不再逐行常驻——页名与页签已表达同一事实。 */
function _archiveRow({ type, id, title, badge = '', meta }) {
  return `
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:border-gray-200 active:bg-[var(--surface-active)] active:border-[var(--app-accent)] transition-colors cursor-pointer" role="button" tabindex="0" data-archive-item data-archive-type="${type}" data-archive-id="${id}">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-medium text-gray-800">${title}</span>
              ${badge}
            </div>
            <p class="text-xs text-gray-500">${meta}</p>
          </div>`;
}

// ── 活动归档 ──
/** 归档库全空态（`close-six-dim-gaps` T8 · DESIGN_SYSTEM §12.16 词表）：
 *  一句现状「归档库暂无活动」＋ **唯一动作「搜索归档内容」**；动作只聚焦页头既有 `#archive-search`，
 *  不新增路由、不新造筛选器。活动 / 专班两栏共用同一空态（同属「归档库」这一对象）。 */
function _archiveEmptyHtml() {
  return emptyStateHtml({
    text: '归档库暂无活动',
    variant: 'panel',
    actionHtml: '<button type="button" class="btn-outline" data-archive-focus-search>搜索归档内容</button>',
  });
}

function renderActivityArchive() {
  const all = loadActivities()
    .filter(a => isActivityArchived(a))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 新日期在前

  if (all.length === 0) {
    contentContainer.innerHTML = _archiveEmptyHtml();
    return;
  }
  const filtered = all.filter(a => _matchesQuery(a.title, a.date, a.type, (getPersonById(a.organizer) || {}).name));
  if (filtered.length === 0) {
    contentContainer.innerHTML = emptyStateHtml({ text: "无匹配归档内容", variant: 'panel' });
    return;
  }
  const cur = Math.min(_pageState.activity, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const items = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${items.map(a => {
        const organizer = getPersonById(a.organizer);
        return _archiveRow({
          type: 'activity',
          id: a.id,
          title: a.title || '未命名活动',
          badge: a.isBrand ? badgeHtml('品牌', 'brand') : '',
          meta: `${a.date || ''} · ${a.type || '活动'}${organizer ? ' · ' + organizer.name : ''} · 上传人：${escHtml(_archiveUploaderNameOf(a.id) || '登记时未采集')}`,
        });
      }).join('')}
    </div>
    ${_renderPager(filtered.length, 'activity')}
  `;
}

// ── 专班归档 ──
function renderTaskforceArchive() {
  const all = TaskForceRecordStore.getAll()
    // R10-B14：终态集单一源；归档页按现状**显式排除已解散**（dissolved 有独立留痕面，不混入「已归档专班」）。
    .filter(tf => TASKFORCE_TERMINAL_STATUSES.includes(tf.status) && tf.status !== TaskforceStatus.DISSOLVED)
    // 先取单一 sortKey（deadline 优先、缺则 createdAt）再比较：两栏各自回退会破坏传递性
    .sort((a, b) => { const keyOf = (x) => x.deadline || x.createdAt || ''; return keyOf(b).localeCompare(keyOf(a)); }); // 新日期在前

  if (all.length === 0) {
    contentContainer.innerHTML = _archiveEmptyHtml();
    return;
  }
  const filtered = all.filter(tf => _matchesQuery(tf.name, tf.createdAt, tf.deadline, (getPersonById(tf.initiator) || {}).name));
  if (filtered.length === 0) {
    contentContainer.innerHTML = emptyStateHtml({ text: "无匹配归档内容", variant: 'panel' });
    return;
  }
  const cur = Math.min(_pageState.taskforce, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const items = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${items.map(tf => {
        const initiator = getPersonById(tf.initiator);
        return _archiveRow({
          type: 'taskforce',
          id: tf.id,
          title: tf.name || '未命名专班',
          meta: `${tf.createdAt || ''} ~ ${tf.deadline || ''} · 专班${initiator ? ' · ' + initiator.name : ''}`,
        });
      }).join('')}
    </div>
    ${_renderPager(filtered.length, 'taskforce')}
  `;
}

// ── 搜索（重渲染 + 页码归 1）──
const archiveSearch = document.getElementById('archive-search');
let _searchQuery = '';

archiveSearch?.addEventListener('input', (e) => {
  _searchQuery = e.target.value.trim();
  _pageState[_activeTab] = 1;
  renderContent();
});

// ── 初始渲染（先 hydrate 再初始化各 Store / 渲染，见 _hydrateData 注释）──
(async () => {
  if (_legacyNoticeTab) return; // 已重定向到消息中心（见文件头 Task 3 说明）
  await _hydrateData();
  TaskForceRecordStore.init();
  renderTabs();
  renderContent();
  // 2026-10-24 批次 508：?id= 命中则渲染后打开对应详情浮窗（活动 / 专班）
  _openArchivedDetail(_focusArchiveId);
})();

// ════════════════════════════════════════════════════════════════
//  归档详情浮窗（阶段1C-4：点击归档条目查看详情）
//  浮窗展示活动/专班的完整归档元数据；形态走统一浮层（DESIGN_SYSTEM §4.27），
//  标题纯文本、焦点接管与关闭语义由 modal.js 单点提供。
// ════════════════════════════════════════════════════════════════

function _showArchiveDetail({ title, bodyHtml, fullHref }) {
  openModal({
    id: 'archive-detail',
    title,
    size: 'lg',
    bodyHtml,
    footerHtml: `
      ${fullHref ? `<a href="${escHtml(fullHref)}" class="btn-outline text-sm px-4 py-1.5" title="打开对象完整详情页">打开完整页 →</a>` : ''}
      <button type="button" data-modal-cancel="archive-detail" class="btn-outline text-sm px-4 py-1.5">关闭</button>`,
  });
}

/** 深链 `?id=` 的详情落点（2026-10-24 批次 508）：
 *  activity 页签 → 活动归档详情；taskforce 页签 → 专班归档详情；
 *  notice 页签的条目本身就是导航链接（无详情浮窗）⇒ 不造第二套浮窗。
 *  只读既有读口 + 既有详情渲染，不新增筛选/权限判定。 */
function _openArchivedDetail(id) {
  if (!id) return;
  if (_activeTab === 'activity') {
    const activity = loadActivities().find(a => a.id === id);
    // Task 6：深链必须命中「已归档」对象；命中不到 / 未归档 → 可见提示，不静默落回列表。
    if (!activity || !isActivityArchived(activity)) {
      showToast('info', '未找到该已归档活动（可能未归档、已删除或不属于本支部）');
      return;
    }
    _showArchiveDetail(_renderActivityDetail(activity));
    return;
  }
  if (_activeTab === 'taskforce') {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === id);
    if (!tf || !TASKFORCE_TERMINAL_STATUSES.includes(tf.status) || tf.status === TaskforceStatus.DISSOLVED) {
      showToast('info', '未找到该已归档专班（可能未归档、已解散或不属于本支部）');
      return;
    }
    _showArchiveDetail(_renderTaskforceDetail(tf));
  }
}

/** 归档详情四宫格（活动 / 专班同一外壳）；`note` 为可选补充说明 */
function _detailGrid(items) {
  return `
      <div class="modal-form-grid mb-5 text-xs">
        ${items.map(it => `<div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">${it.label}</p>
          <p class="text-gray-800 font-medium">${it.value}</p>
          ${it.note ? `<p class="mt-1 text-xs leading-5 text-gray-500">${it.note}</p>` : ''}
        </div>`).join('')}
      </div>`;
}

function _renderActivityDetail(activity) {
  const organizer = getPersonById(activity.organizer);
  const typeColors = getActivityTypeColors({ withLabel: true });
  const color = typeColors[activity.type] || { dot: '#6B7280', label: activity.type || '活动' };

  return {
    title: activity.title || '归档详情',
    fullHref: objectDetailHref('activity', activity.id, { entry: 'archive-modal' }),
    bodyHtml: `
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''};"></span>
        <span class="text-xs text-gray-500">${color.label}</span>
        ${activity.isBrand ? badgeHtml('品牌', 'brand') : ''}
      </div>

      ${_detailGrid([
        { label: '活动日期', value: activity.date || '未设定' },
        { label: '活动地点', value: activity.location || '未设定' },
        {
          label: '组织者',
          value: organizer ? organizer.name : '未指派',
          note: activity.organizerExceptionReason ? `跨组说明：${escHtml(activity.organizerExceptionReason)}` : '',
        },
        { label: '活动状态', value: badgeHtml('已归档', 'neutral') },
      ])}

      ${activity.description ? `
        <div class="mb-5">
          <p class="text-xs text-gray-500 mb-2">活动说明</p>
          <p class="text-sm text-gray-700 leading-relaxed">${activity.description}</p>
        </div>
      ` : ''}

      <div class="border-t border-gray-100 pt-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-medium text-gray-600">归档材料清单</p>
        </div>
        ${_renderArchiveMaterials(activity)}
      </div>
    `,
  };
}

/** A10：归档行上传人——优先读该活动归档材料的 uploadedBy（缺失 ⇒ 空串，由调用方显示「登记时未采集」） */
function _archiveUploaderNameOf(activityId) {
  const row = (mockDB.archiveRecords || []).find((r) => r.activityId === activityId && r.uploadedBy);
  return row ? (getPersonName(row.uploadedBy) || row.uploadedBy) : '';
}

/** 归档材料补真（2026-08-07）：优先读取 mockDB.archiveRecords 中同 activityId 的真实材料 */
function _renderArchiveMaterials(activity) {
  const records = (mockDB.archiveRecords || [])
    .filter(r => r.activityId === activity.id || r.activityName === activity.title)
    .sort((a, b) => (b.archiveDate || '').localeCompare(a.archiveDate || ''));
  if (records.length > 0) {
    const catBadge = {
      新闻稿: ['info', '新闻稿'],
      照片: ['success', '照片'],
      视频: ['brand', '视频'],
      其他: ['neutral', '其他'],
    };
    return `
      <div class="space-y-2">
        ${records.map(r => {
          const cb = catBadge[r.category] || catBadge.其他;
          return `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-surface-hover transition-colors">
              ${icon('fileText', { className: 'w-4 h-4 text-gray-500 flex-shrink-0', extra: ' aria-hidden="true"' })}
              <span class="text-sm text-gray-700 flex-1 truncate">${r.activityName || activity.title}${r.status === 'pending' ? '（待归档）' : ''}</span>
              ${badgeHtml(cb[1], cb[0])}
              <span class="text-xs text-gray-500">${r.archiveDate || ''} · 上传人：${escHtml(r.uploadedBy ? (getPersonName(r.uploadedBy) || r.uploadedBy) : '登记时未采集')}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  return emptyStateHtml({ text: "暂无归档材料", variant: 'panel' });
}

function _renderTaskforceDetail(tf) {
  const initiator = getPersonById(tf.initiator);
  const filledMembers = (tf.members || []).filter(m => m.personId);

  return {
    title: tf.name || '归档详情',
    fullHref: objectDetailHref('taskforce', tf.id, { entry: 'archive-modal' }),
    bodyHtml: `
      <div class="flex items-center gap-2 mb-4">
        ${badgeHtml('专班', 'info')}
        ${badgeHtml('已归档', 'neutral')}
      </div>

      ${_detailGrid([
        { label: '发起日期', value: tf.createdAt || '未设定' },
        { label: '截止日期', value: tf.deadline || '未设定' },
        { label: '发起人', value: initiator ? initiator.name : '未指派' },
        { label: '成员人数', value: `${filledMembers.length}/${tf.capacity || 0}` },
      ])}

      ${tf.task ? `
        <div class="mb-5">
          <p class="text-xs text-gray-500 mb-2">专班任务</p>
          <p class="text-sm text-gray-700 leading-relaxed">${tf.task}</p>
        </div>
      ` : ''}

      ${(tf.members && tf.members.length > 0) ? `
        <div class="border-t border-gray-100 pt-4">
          <p class="text-xs font-medium text-gray-600 mb-3">成员贡献记录</p>
          <div class="space-y-2">
            ${tf.members.map(m => {
              const person = getPersonById(m.personId);
              const contributions = (m.contributions || []).length;
              return `
                <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  <span class="text-sm text-gray-700 flex-1">${person ? person.name : (m.name || '未知成员')}</span>
                  <span class="text-xs text-gray-500">${m.role || '成员'}</span>
                  <span class="text-xs text-gray-500">${contributions} 项贡献</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `,
  };
}

// 事件委托：分页按钮 / 点击归档条目弹出详情浮窗
contentContainer?.addEventListener('click', (e) => {
  // 空态唯一动作「搜索归档内容」：只聚焦页头既有检索框（T8：不新增路由 / 不另造筛选器）
  if (e.target.closest('[data-archive-focus-search]')) {
    archiveSearch?.focus();
    return;
  }
  // 分页翻页（每页 10 条，控件标记由 pagerHtml 单一源产出）
  const pageBtn = e.target.closest('[data-lf-page]');
  if (pageBtn) {
    if (pageBtn.disabled) return;
    _pageState[_activeTab] = Number(pageBtn.dataset.lfPage) || 1;
    renderContent();
    return;
  }

  const item = e.target.closest('[data-archive-item]');
  if (!item) return;

  const type = item.dataset.archiveType;
  const id = item.dataset.archiveId;

  if (type === 'activity') {
    const activity = loadActivities().find(a => a.id === id);
    if (activity) _showArchiveDetail(_renderActivityDetail(activity));
  } else if (type === 'taskforce') {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === id);
    if (tf) _showArchiveDetail(_renderTaskforceDetail(tf));
  }
});

// 5.3：归档条目（活动 / 专班）整行可点但不是原生控件 —— 补 Enter / Space（与鼠标等效）。
contentContainer?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
  const item = e.target.closest('[data-archive-item][role="button"]');
  if (!item || item !== e.target) return;
  e.preventDefault();
  item.click();
});
