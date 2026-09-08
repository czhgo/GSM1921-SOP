// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/gallery.js — 首页活动风采（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：_renderGallery + GALLERY_TYPE_GRADIENTS。
//  职责单一：品牌/已归档活动风采卡片（前 6 条，类型渐变底）。
// ════════════════════════════════════════════════════════════════

import { getAppState } from '../../core/state.js?v=20260908c';
import { _fmtDate } from '../../core/utils.js?v=20260908c';
import { getPersonName } from '../../services/person.js?v=20260908c';
import { getActivityTypeColors } from '../../core/constants.js?v=20260908c';
import { badgeHtml } from '../badges.js?v=20260908c';
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from '../inspector.js?v=20260908c';

const GALLERY_TYPE_GRADIENTS = {
  '主题党日': 'linear-gradient(135deg, #FEF2F2, #FECACA)',
  '共建':     'linear-gradient(135deg, #FDF2F8, #FBCFE8)',
  '党课':     'linear-gradient(135deg, #EFF6FF, #BFDBFE)',
  '参访':     'linear-gradient(135deg, #ECFDF5, #A7F3D0)',
  '座谈':     'linear-gradient(135deg, #F7FEE7, #D9F99D)',
  '支委会':   'linear-gradient(135deg, #F5F3FF, #C4B5FD)',
  '党小组会': 'linear-gradient(135deg, #F0F9FF, #BAE6FD)',
  '支部党员大会': 'linear-gradient(135deg, #FFFBEB, #FDE68A)',
};

const ACTIVITY_TYPE_COLORS = getActivityTypeColors({ withLabel: true });

/** 渲染首页活动风采（品牌 + 已归档活动，前 6 条） */
export function renderGallery(activities) {
  const container = document.getElementById('dashboard-gallery');
  if (!container) return;

  // T223 排序统一：未完成在前、已完成在后，组内均按 date 降序（新者在前）
  const isDone = a => a.archived || ['completed', 'cancelled'].includes(a.status);
  const candidates = activities.filter(a => (a.isBrand && !a.archived) || ((a.status === 'completed' || a.archived) && !a.isBrand));
  const sortByDate = (arr) => [...arr].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const display = [...sortByDate(candidates.filter(a => !isDone(a))), ...sortByDate(candidates.filter(a => isDone(a)))].slice(0, 6);

  if (display.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无风采展示</p>';
    return;
  }

  container.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
    display.map(a => {
      const gradient = GALLERY_TYPE_GRADIENTS[a.type] || 'linear-gradient(135deg, #F9FAFB, #E5E7EB)';
      const color = ACTIVITY_TYPE_COLORS[a.type] || { dot: '#6B7280', label: a.type || '活动' };
      const organizerName = getPersonName(a.organizer);
      // T229：生命周期态徽章
      const lifecycle = ACTIVITY_LIFECYCLE[deriveActivityLifecycleStatus(a, getAppState()?.tasks || [])] || ACTIVITY_LIFECYCLE.draft;

      return `
        <div class="rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
             data-gallery-activity-id="${a.id}">
          <div class="p-4 relative" style="background:${gradient};">
            ${a.isBrand ? badgeHtml('品牌', 'brand') : ''}
            <div class="flex items-center gap-1.5 mb-1.5">
              <div class="w-2.5 h-2.5 rounded-full" style="background:${color.dot}${color.dotBorder ? `;border:1px solid ${color.dotBorder}` : ''};"></div>
              <span class="text-xs font-medium text-gray-500">${color.label}</span>
            </div>
            <h4 class="font-title-cn text-sm font-bold text-gray-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">${a.title || '未命名活动'}</h4>
          </div>
          <div class="p-3 bg-white">
            <p class="text-xs text-gray-500">${a.date ? _fmtDate(new Date(a.date)) : ''}${organizerName ? ' · ' + organizerName : ''}</p>
            ${badgeHtml(lifecycle.label, lifecycle.variant)}
          </div>
        </div>
      `;
    }).join('') + '</div>';
}
