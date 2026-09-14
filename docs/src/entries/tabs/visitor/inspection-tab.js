// role: [工程师]+[AI]
// 参与者工作台 Tab：我的考察（T-279 M3 拆分，照 M2 样板）
// 个人考察记录查询视图（spec §五 数据访问规则：支部成员对自己的历次活动参与考察情况有查询视图）。

import { AuthStore } from '../../../services/auth.js?v=20260914b';
import { loadActiveInspectionRecords } from '../../../services/inspection.js?v=20260914b';
import { inspectionToDisplay } from '../../../services/inspection.js?v=20260914b';
import { loadActivities } from '../../../services/activity.js?v=20260914b';
import { ROLE_COLORS } from '../../../core/constants.js?v=20260914b';
import { badgeHtml } from '../../../components/badges.js?v=20260914b';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/list-filter.js?v=20260914b';

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    tc.innerHTML = '<p class="text-sm text-gray-500 text-center py-6">请先登录</p>';
    return;
  }

  const personId = user.personId;
  const allRecords = loadActiveInspectionRecords();
  const myRecords = allRecords.filter(r => r.personId === personId);
  const display = inspectionToDisplay(myRecords);
  const total = display.length;
  const confirmed = display.filter(r => r.status === 'confirmed').length;
  const pending = display.filter(r => r.status === 'pending').length;

  // 按录入时间倒序
  const sorted = [...display].sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));

  tc.innerHTML = `
    <div class="mb-3 p-3 rounded-lg bg-white flex items-center gap-4">
      <div class="flex-1">
        <p class="text-sm font-semibold text-gray-800">我的考察记录</p>
        <p class="text-xs text-gray-500 mt-0.5">共 ${total} 条 · 已确认 ${confirmed} · 待确认 ${pending}</p>
      </div>
    </div>
    <div id="visitor-insp-list" class="space-y-2"></div>
  `;

  const listEl = document.getElementById('visitor-insp-list');
  if (!listEl) return;

  if (sorted.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-500 text-center py-6">暂无考察记录</p>';
    return;
  }

  const SOURCE_TYPE_LABEL = { activity: '活动', taskforce: '专班' };
  const LEVEL_LABEL = { organize: '组织者', deep: '深度参与者' };
  // 考察等级本质是角色维度 → 复用 ROLE_COLORS 冷色系（organizer=天蓝 / deep=紫），不再用红（支书 2026-08-01）
  const LEVEL_ROLE = { organize: 'organizer', deep: 'deep' };

  // 活动「已归档」口径单一源（2026-09-13 收敛）：替代手写 !a.archived
  const _actById = new Map(loadActivities().map(a => [a.id, a]));
  /** 补活动字段（供关键词/分面取用；来源为专班或无活动的记录回退快照标题） */
  const _withAct = (r) => {
    const a = r.activityId ? _actById.get(r.activityId) : null;
    return {
      ...r,
      title: r.activityTitle || r.sourceName || '—',
      name: r.activityTitle || r.sourceName || '',
      date: a?.date || '',
      type: a?.type || '',
      location: a?.location || '',
      status: a?.status,
      archived: a?.archived,
    };
  };

  const rowHtml = (r) => {
    const statusCls = r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
    const statusText = r.status === 'confirmed' ? '已确认' : '待确认';
    const sourceLabel = SOURCE_TYPE_LABEL[r.sourceType] || r.sourceType;
    const levelLabel = LEVEL_LABEL[r.level] || r.level;
    const levelRole = LEVEL_ROLE[r.level] || 'participant';
    const lc = ROLE_COLORS[levelRole] || ROLE_COLORS.participant;
    const sourceTitle = r.activityTitle || r.sourceName || '—';
    const recordedDate = r.recordedAt ? r.recordedAt.slice(0, 10) : '—';

    return `
      <div class="p-3 rounded-lg bg-white hover:shadow-sm transition-shadow">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            ${badgeHtml(sourceLabel, 'neutral')}
            <span class="badge" style="--acc-bg-dark:${lc.bgDark};--acc-text-dark:${lc.textDark};--acc-border-dark:${lc.borderDark};background:${lc.bg};color:color-mix(in srgb, ${lc.text} 60%, #000);border:1px solid ${lc.border};">${levelLabel}</span>
          </div>
          <span class="px-1.5 py-0.5 text-xs font-medium rounded-full ${statusCls}">${statusText}</span>
        </div>
        ${r.activityId
          ? `<a href="../activity.html?id=${encodeURIComponent(r.activityId)}" class="block" style="text-decoration:none;color:inherit;" title="查看活动详情"><p class="text-sm font-medium text-gray-800">${sourceTitle}</p></a>`
          : `<p class="text-sm font-medium text-gray-800">${sourceTitle}</p>`}
        ${r.role ? `<p class="text-xs text-gray-500 mt-1">工作内容：${r.role}</p>` : ''}
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <p class="text-xs text-gray-500">录入人：${r.recordedByName || '—'}</p>
          <p class="text-xs text-gray-500">${recordedDate}</p>
        </div>
      </div>
    `;
  };

  renderFilteredList(listEl, {
    stateKey: 'visitor-inspection',
    rows: sorted.map(_withAct),
    keyword: activityKeyword('搜索活动名称…'),
    facets: activityFacets(),
    countUnit: '条',
    listClass: 'space-y-2',
    emptyMessage: '无匹配考察记录',
    rowHtml,
  });
}
