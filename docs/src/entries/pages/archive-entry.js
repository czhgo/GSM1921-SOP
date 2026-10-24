// role: [工程师]+[AI]
// archive-entry.js — 归档库独立入口
// 2026-07-30: Tab 分类（活动/专班/通知），替代原单一列表
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261024b';
import { renderHeader } from '../../components/shell/header.js?v=20261024b';
import { BranchService } from '../../services/core/runtime.js?v=20261024b';
import { mockDB, TaskforceStatus, TASKFORCE_TERMINAL_STATUSES } from '../../core/domain/domain.js?v=20261024b';
import { getPersonById, getPersonName } from '../../services/member/person.js?v=20261024b';
import { loadActivities } from '../../services/activity/activity.js?v=20261024b';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261024b';
import { getActivityTypeColors } from '../../core/domain/constants.js?v=20261024b';
// 活动「已结束」口径单一源（2026-09-13 收敛）：替代手写 status==='completed' || archived
// 2026-10-24 批次 508：归档库的「已归档活动」改用 `isActivityArchived`（仅看 archived 软标记），
//   与宣传台「档案归档」同口径——原 `isActivityEnded`（archived ∨ status==='completed'）会把
//   **已结束但尚未归档**的活动也算进归档库，与同页其它两栏（专班/通知只收归档件）不一致。
import { isActivityArchived } from '../../core/domain/constants.js?v=20261024b';
import { NoticeStore, resolveNoticeUrl } from '../../services/governance/notice.js?v=20261024b';
import { getBasePath, todayLocal, escHtml } from '../../core/base/utils.js?v=20261024b';
import { AuthStore } from '../../services/core/auth.js?v=20261024b';
import { badgeHtml } from '../../components/ui/badges.js?v=20261024b';
// 翻页控件单一源（批次 38：全站手写翻页一律并轨 pagerHtml）
import { pagerHtml } from '../../components/ui/pager.js?v=20261024b';
import { openModal } from '../../components/ui/modal.js?v=20261024b';
// 批次 87：本页必须先 hydrate API 数据源再渲染——与 activity.html（批次 83 修好后的标准形）同款。
// 此前本页只调 BranchService.loadDB()（API 模式直接 return）⇒ api 形态下归档库读的是本地备份，
// 服务端已归档的活动 / 专班 / 通知看不到。
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261024b';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261024b';

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
  { id: 'notice', label: '通知' },
];
let _activeTab = 'activity';
// 2026-10-24 批次 508：归档库此前不读任何 URL 参数——外部深链（`?tab=taskforce&id=…`）一律落回
//   默认「党建活动」且不打开详情。现按既有三页签 id 取值（非法值回落 activity），`id` 在首帧渲染后
//   打开对应详情浮窗（见 init 末尾 `_openArchivedDetail`）。
const _urlParams = new URLSearchParams(location.search);
const _tabParam = _urlParams.get('tab');
if (ARCHIVE_TABS.some(t => t.id === _tabParam)) _activeTab = _tabParam;
const _focusArchiveId = _urlParams.get('id') || '';

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
  else if (_activeTab === 'notice') renderNoticeArchive();
}

// ── 分页（支书 2026-08-08：归档数据无上限增长 → 前端分页，复用 query-view 分页模式）──
const PAGE_SIZE = 10;
const _pageState = { activity: 1, taskforce: 1, notice: 1 };

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

// ── 活动归档 ──
function renderActivityArchive() {
  const all = loadActivities()
    .filter(a => isActivityArchived(a))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 新日期在前

  if (all.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">暂无已归档活动</p>';
    return;
  }
  const filtered = all.filter(a => _matchesQuery(a.title, a.date, a.type, (getPersonById(a.organizer) || {}).name));
  if (filtered.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">无匹配归档活动</p>';
    return;
  }
  const cur = Math.min(_pageState.activity, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const items = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${items.map(a => {
        const organizer = getPersonById(a.organizer);
        const isBrand = !!a.isBrand;
        return `
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:border-gray-200 transition-colors cursor-pointer" role="button" tabindex="0" data-archive-item data-archive-type="activity" data-archive-id="${a.id}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-800">${a.title || '未命名活动'}</span>
                ${isBrand ? badgeHtml('品牌', 'brand') : ''}
              </div>
              ${badgeHtml('已归档', 'neutral')}
            </div>
            <p class="text-xs text-gray-500">${a.date || ''} · ${a.type || '活动'}${organizer ? ' · ' + organizer.name : ''} · 上传人：${escHtml(_archiveUploaderNameOf(a.id) || '登记时未采集')}</p>
          </div>
        `;
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
    .sort((a, b) => (b.deadline || b.createdAt || '').localeCompare(a.deadline || a.createdAt || '')); // 新日期在前

  if (all.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">暂无已归档专班</p>';
    return;
  }
  const filtered = all.filter(tf => _matchesQuery(tf.name, tf.createdAt, tf.deadline, (getPersonById(tf.initiator) || {}).name));
  if (filtered.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">无匹配归档专班</p>';
    return;
  }
  const cur = Math.min(_pageState.taskforce, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const items = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${items.map(tf => {
        const initiator = getPersonById(tf.initiator);
        return `
          <div class="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:border-gray-200 transition-colors cursor-pointer" role="button" tabindex="0" data-archive-item data-archive-type="taskforce" data-archive-id="${tf.id}">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-800">${tf.name || '未命名专班'}</span>
              ${badgeHtml('已归档', 'neutral')}
            </div>
            <p class="text-xs text-gray-500">${tf.createdAt || ''} ~ ${tf.deadline || ''} · 专班${initiator ? ' · ' + initiator.name : ''}</p>
          </div>
        `;
      }).join('')}
    </div>
    ${_renderPager(filtered.length, 'taskforce')}
  `;
}

// ── 通知归档 ──
function renderNoticeArchive() {
  // 2026-08-08 归档闭环：归档库只承载「已退出工作区」的通知——
  //   ① 随活动/专班归档的通知（archived=true）
  //   ② 自然过期（expireDate < 今天）的历史通知
  // 工作区（首页/支书通知发布/全局概况）仅保留未归档的有效通知，杜绝列表爆炸。
  const today = todayLocal();
  const all = NoticeStore.getAll({ includeArchived: true })
    .filter(n => n.archived === true || (n.expireDate && n.expireDate < today));

  if (all.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">暂无归档通知</p>';
    return;
  }
  const filtered = all.filter(n => _matchesQuery(n.title, n.content, n.publishDate));
  if (filtered.length === 0) {
    contentContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-12">无匹配归档通知</p>';
    return;
  }
  const cur = Math.min(_pageState.notice, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const items = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'danger'),
    normal: badgeHtml('重要', 'info'),
  };

  // 5.3（2026-10-22 第九轮）：通知归档条目是**导航**（去向是固定 URL）⇒ 改原生 `<a href>`，
  //   键盘 / 读屏 / 新标签打开都由浏览器承担；落点仍走全站统一 resolveNoticeUrl（业务页直达优先）。
  const currentRole = AuthStore.getCurrentUser()?.role || null;
  contentContainer.innerHTML = `
    <div class="space-y-3">
      ${items.map(n => {
        const dest = resolveNoticeUrl(n, currentRole);
        const href = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${encodeURIComponent(n.id)}`;
        return `
        <a href="${escHtml(href)}" class="block p-4 rounded-lg border border-gray-100 bg-gray-50/50 transition-colors cursor-pointer" data-notice-id="${n.id}">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              ${priorityBadge[n.priority] || ''}
              <span class="text-sm font-medium text-gray-800">${n.title}</span>
              ${n.archived === true ? badgeHtml('已归档', 'neutral') : badgeHtml('已过期', 'neutral')}
            </div>
            <span class="text-xs text-gray-500">${n.publishDate || ''}</span>
          </div>
          <p class="text-xs text-gray-500 line-clamp-2">${n.content || ''}</p>
        </a>
      `;
      }).join('')}
    </div>
    ${_renderPager(filtered.length, 'notice')}
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
  await _hydrateData();
  TaskForceRecordStore.init();
  NoticeStore.init();
  renderTabs();
  renderContent();
  // 2026-10-24 批次 508：?id= 命中则渲染后打开对应详情浮窗（通知页签无详情浮窗，不做假入口）
  _openArchivedDetail(_focusArchiveId);
})();

// ════════════════════════════════════════════════════════════════
//  归档详情浮窗（阶段1C-4：点击归档条目查看详情）
//  浮窗展示活动/专班的完整归档元数据；形态走统一浮层（DESIGN_SYSTEM §4.27），
//  标题纯文本、焦点接管与关闭语义由 modal.js 单点提供。
// ════════════════════════════════════════════════════════════════

function _showArchiveDetail({ title, bodyHtml }) {
  openModal({
    id: 'archive-detail',
    title,
    size: 'lg',
    bodyHtml,
    footerHtml: `<button type="button" data-modal-cancel="archive-detail" class="btn-outline text-sm px-4 py-1.5">关闭</button>`,
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
    if (activity) _showArchiveDetail(_renderActivityDetail(activity));
    return;
  }
  if (_activeTab === 'taskforce') {
    const tf = TaskForceRecordStore.getAll().find(t => t.id === id);
    if (tf) _showArchiveDetail(_renderTaskforceDetail(tf));
  }
}

function _renderActivityDetail(activity) {
  const organizer = getPersonById(activity.organizer);
  const typeColors = getActivityTypeColors({ withLabel: true });
  const color = typeColors[activity.type] || { dot: '#6B7280', label: activity.type || '活动' };

  return {
    title: activity.title || '归档详情',
    bodyHtml: `
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''};"></span>
        <span class="text-xs text-gray-500">${color.label}</span>
        ${activity.isBrand ? badgeHtml('品牌', 'brand') : ''}
      </div>

      <div class="modal-form-grid mb-5 text-xs">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">活动日期</p>
          <p class="text-gray-800 font-medium">${activity.date || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">活动地点</p>
          <p class="text-gray-800 font-medium">${activity.location || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">组织者</p>
          <p class="text-gray-800 font-medium">${organizer ? organizer.name : '未指派'}</p>
          ${activity.organizerExceptionReason ? `<p class="mt-1 text-xs leading-5 text-gray-500">跨组说明：${escHtml(activity.organizerExceptionReason)}</p>` : ''}
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">活动状态</p>
          <p class="text-gray-800 font-medium">${badgeHtml('已归档', 'neutral')}</p>
        </div>
      </div>

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
              <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <span class="text-sm text-gray-700 flex-1 truncate">${r.activityName || activity.title}${r.status === 'pending' ? '（待归档）' : ''}</span>
              ${badgeHtml(cb[1], cb[0])}
              <span class="text-xs text-gray-500">${r.archiveDate || ''} · 上传人：${escHtml(r.uploadedBy ? (getPersonName(r.uploadedBy) || r.uploadedBy) : '登记时未采集')}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  return '<p class="text-xs text-gray-500 text-center py-4">暂无归档材料</p>';
}

function _renderTaskforceDetail(tf) {
  const initiator = getPersonById(tf.initiator);
  const filledMembers = (tf.members || []).filter(m => m.personId);

  return {
    title: tf.name || '归档详情',
    bodyHtml: `
      <div class="flex items-center gap-2 mb-4">
        ${badgeHtml('专班', 'info')}
        ${badgeHtml('已归档', 'neutral')}
      </div>

      <div class="modal-form-grid mb-5 text-xs">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">发起日期</p>
          <p class="text-gray-800 font-medium">${tf.createdAt || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">截止日期</p>
          <p class="text-gray-800 font-medium">${tf.deadline || '未设定'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">发起人</p>
          <p class="text-gray-800 font-medium">${initiator ? initiator.name : '未指派'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-gray-500 mb-1">成员人数</p>
          <p class="text-gray-800 font-medium">${filledMembers.length}/${tf.capacity || 0}</p>
        </div>
      </div>

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
