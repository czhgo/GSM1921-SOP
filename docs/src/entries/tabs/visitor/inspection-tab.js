// role: [工程师]+[AI]
// 参与者工作台 Tab：我的考察（T-279 M3 拆分，照 M2 样板）
// 个人考察记录查询视图（spec §五 数据访问规则：支部成员对自己的历次活动参与考察情况有查询视图）。

import { AuthStore } from '../../../services/auth.js?v=20260901p';
import { loadActiveInspectionRecords } from '../../../services/inspection.js?v=20260901p';
import { inspectionToDisplay } from '../../../mock/index.js?v=20260901p';
import { ROLE_COLORS } from '../../../core/constants.js?v=20260901p';
import { badgeHtml } from '../../../components/badge.js?v=20260901p';

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    tc.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">请先登录</p>';
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
        <p class="text-xs text-gray-400 mt-0.5">共 ${total} 条 · 已确认 ${confirmed} · 待确认 ${pending}</p>
      </div>
    </div>
    <div id="visitor-insp-list" class="space-y-2"></div>
  `;

  const listEl = document.getElementById('visitor-insp-list');
  if (!listEl) return;

  if (sorted.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无考察记录</p>';
    return;
  }

  const SOURCE_TYPE_LABEL = { activity: '活动', taskforce: '专班' };
  const LEVEL_LABEL = { organize: '组织者', deep: '深度参与者' };
  // 考察等级本质是角色维度 → 复用 ROLE_COLORS 冷色系（organizer=天蓝 / deep=紫），不再用红（书记 2026-08-01）
  const LEVEL_ROLE = { organize: 'organizer', deep: 'deep' };

  listEl.innerHTML = sorted.map(r => {
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
            <span class="badge" style="--acc-bg-dark:${lc.bgDark};--acc-text-dark:${lc.textDark};--acc-border-dark:${lc.borderDark};background:${lc.bg};color:${lc.text};border:1px solid ${lc.border};">${levelLabel}</span>
          </div>
          <span class="px-1.5 py-0.5 text-xs font-medium rounded-full ${statusCls}">${statusText}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${sourceTitle}</p>
        ${r.role ? `<p class="text-xs text-gray-500 mt-1">工作内容：${r.role}</p>` : ''}
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <p class="text-xs text-gray-400">录入人：${r.recordedByName || '—'}</p>
          <p class="text-xs text-gray-400">${recordedDate}</p>
        </div>
      </div>
    `;
  }).join('');
}
