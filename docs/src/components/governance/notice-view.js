// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/notice-view.js —— **通知视图层**
//
//  分层纪律（G1 第③项，2026-09-28）：**服务层不产 UI**。「通知列表卡片 / 铃铛下拉浮窗 /
//  发布本组通知浮窗」原与 NoticeStore 同住 services/governance/notice.js，服务层因此 import
//  了组件（badges / modal）——本轮把**视图部分整体搬到这里**（逐字搬迁、零行为变化）；
//  数据侧只留在 services/governance/notice.js（NoticeStore / NoticePermission / resolveNoticeUrl）。
//
//  依赖方向正确：组件 → 服务（不是服务 → 组件）。守卫见 notice-audience / doc-consistency。
// ════════════════════════════════════════════════════════════════

import { badgeHtml } from '../ui/badges.js?v=20260928u';
import { openFormModal } from '../ui/modal.js?v=20260928u';
import { showToast, getBasePath } from '../../core/utils.js?v=20260928u';
import { ROLE_LABELS } from '../../core/constants.js?v=20260928u';
import { AuthStore } from '../../services/core/auth.js?v=20260928u';
import { getPersonById, liveMembers } from '../../services/member/person.js?v=20260928u';
import { isActivityOrganizer } from '../../services/activity/activity.js?v=20260928u';
import { NoticeStore, NoticePermission, resolveNoticeUrl } from '../../services/governance/notice.js?v=20260928u';

function committeeSourceChip() {
  return '<span style="display:inline-flex;align-items:center;padding:0 6px;border-radius:9999px;background:var(--party-red);color:#fff;font-size:10px;line-height:16px;flex-shrink:0;">党委下发</span>';
}

export function renderNoticeList(containerId, limit = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 支书规则（2026-08-01）：任何带时间字段的列示一律按时间倒序（最新在前）
  // 支书裁决（2026-08-05）：重要通知仅保留未读，紧急通知无论已读未读均展示
  const notices = NoticeStore.list({ activeOnly: true, limit, sortBy: 'date', retention: 'visible' });

  if (notices.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">暂无通知</p>';
    return;
  }

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
  };

  container.innerHTML = notices.map(n => `
    <div class="notice-item flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 hover:shadow-sm rounded-lg px-2 -mx-2 transition-all duration-200 group"
         data-target="${n.targetModule || ''}" data-notice-id="${n.id}" data-target-url="${n.targetUrl || ''}"
         title="${n.title} — ${n.content}">
      ${priorityBadge[n.priority] || ''}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 min-w-0">
          ${n.source === 'committee' ? committeeSourceChip() : ''}
          <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">${n.title}</p>
        </div>
        <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">${n.content}</p>
      </div>
      <div class="flex items-center gap-1 whitespace-nowrap mt-0.5">
        ${!n.read ? `<button class="notice-confirm-read text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors" data-notice-id="${n.id}">确认读取</button>` : ''}
        <span class="text-xs text-gray-500">${n.publishDate}</span>
      </div>
    </div>
  `).join('');

  // 绑定确认读取按钮：先弹出完整消息浮窗，浮窗中确认已读
  container.querySelectorAll('.notice-confirm-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (!notice) return;
      _showNoticePopover(notice, btn);
    });
  });

  // 绑定点击：标记已读 + 统一跳转（resolveNoticeUrl 业务页直达优先）
  container.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (id) NoticeStore.markRead(id);
      // 视觉反馈：点击后标题颜色变浅
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');
      const dest = resolveNoticeUrl(notice);
      const finalUrl = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${id}`;
      window.location.href = finalUrl;
    });
  });
}

/**
 * 通知浮窗：展示完整消息内容 + 确认已读按钮
 * 点击"确认读取"时弹出，确认后标记已读并关闭浮窗
 */
function _showNoticePopover(notice, triggerBtn) {
  // 移除已有浮窗
  const existing = document.getElementById('notice-read-popover');
  if (existing) existing.remove();

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
  };

  const popover = document.createElement('div');
  popover.id = 'notice-read-popover';
  popover.style.cssText = 'position:fixed;z-index:100;background:var(--surface-card);border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,0.15);border:1px solid var(--neutral-200);padding:16px;width:360px;max-height:80vh;overflow-y:auto;';

  popover.innerHTML = `
    <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div class="flex items-center gap-2">
          ${priorityBadge[notice.priority] || ''}
          ${notice.source === 'committee' ? committeeSourceChip() : ''}
          <h3 class="font-title-cn text-sm font-semibold text-gray-800">${notice.title}</h3>
        </div>
      <button id="notice-popover-close" class="text-gray-500 hover:text-gray-600 text-sm leading-none">&times;</button>
    </div>
    <div class="text-xs text-gray-500 mb-3">${notice.publishDate || ''}</div>
    <div class="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">${notice.content || '无内容'}</div>
    ${notice.meetingActivityId
      // SOP-B-5（D-293）：会议通知的「能否线上参会」在**详情页**确认时填——浮窗只作指路，
      // 不在此再放一份填写位（同一件事两处填＝两套口径）。
      ? '<div class="text-[11px] text-gray-500 mb-3 leading-5">本次会议可申报<b>能否线上参会</b>——请点通知标题打开详情页，在「确认读取」时填写（线上参会记请假、不计出席、不补课）。</div>'
      : ''}
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button id="notice-popover-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
      <button id="notice-popover-confirm" class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">确认已读</button>
    </div>
  `;

  document.body.appendChild(popover);

  // 定位：在触发按钮附近
  const rect = triggerBtn.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;
  // 防止溢出视口
  if (top + popoverRect.height > window.innerHeight) top = Math.max(8, rect.top - popoverRect.height - 8);
  if (left + 360 > window.innerWidth) left = Math.max(8, window.innerWidth - 368);
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  // 关闭浮窗
  const closePopover = () => popover.remove();

  popover.querySelector('#notice-popover-close')?.addEventListener('click', closePopover);
  popover.querySelector('#notice-popover-cancel')?.addEventListener('click', closePopover);

  // 确认已读
  popover.querySelector('#notice-popover-confirm')?.addEventListener('click', () => {
    NoticeStore.markRead(notice.id);
    // 视觉反馈：列表项标题变浅 + 移除"确认读取"按钮
    const item = triggerBtn.closest('.notice-item');
    if (item) {
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');
      triggerBtn.remove();
    }
    closePopover();
    showToast('success', '已确认读取');
  });

  // 点击外部关闭
  const outsideHandler = (e) => {
    if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
      closePopover();
      document.removeEventListener('click', outsideHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', outsideHandler, true), 0);

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closePopover(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

// ════════════════════════════════════════════════════════════════
//  本组通知发布口（2026-09-19 批次 91 · SOP-B-17 / `D-308` · `D-309` · §9k）
//  「组织者是信息流与任务流」——某人被指定为某场活动的组织者，**这场活动的发布口就在他台上**：
//    · 发布权随「被指定」动态获得（见 NoticePermission.canPublish），**不按角色静态加名单**；
//    · 受众＝**本组**（该场承办党小组 / 缺省取组织者所属党小组的成员 ＋ 组织者本人）；
//    · **全支部通知仍归支书**——本口不提供全支部广播，不做支书代发。
//  单一实现，供成员台「活动动态」与组长台「活动管理」两处行内入口共用（勿各自再写一份）。
// ════════════════════════════════════════════════════════════════

/** 该场活动的「本组」人员 id（承办党小组优先，缺省＝组织者所属党小组；恒含组织者本人） */
export function groupAudienceIdsOf(activity, organizerId) {
  const group = activity?.hostGroup
    || (getPersonById(organizerId) || {}).partyGroup
    || '';
  const ids = liveMembers().filter(p => p.partyGroup && p.partyGroup === group).map(p => p.id);
  if (organizerId && !ids.includes(organizerId)) ids.push(organizerId);
  return { group, ids };
}

/**
 * 打开「发布本组通知」浮窗（该场活动的组织者本人可用）
 * @param {{ activity:Object, accentColor?:string, onPublished?:Function }} opts
 * @returns {boolean} 是否打开了浮窗（无权限 / 无活动时返回 false 并给出提示）
 */
export function openGroupNoticeComposer({ activity, accentColor = '#3B82F6', onPublished = null } = {}) {
  const me = AuthStore.getCurrentUser();
  const meId = me?.personId || null;
  if (!activity || !meId) { showToast('error', '无法发布：活动或登录会话缺失'); return false; }
  if (!isActivityOrganizer(meId, activity.id)) {
    showToast('error', '只有本场活动的组织者才能发布本组通知');
    return false;
  }
  const { group, ids } = groupAudienceIdsOf(activity, meId);
  const audienceLabel = group ? `本组（${group}）` : '本组';

  openFormModal({
    id: 'group-notice-compose',
    title: `发布本组通知 · ${activity.title || '未命名活动'}`,
    accentColor,
    submitLabel: '发布',
    fields: [
      { key: 'title', label: '通知标题', required: true, placeholder: '如：本周党小组会时间与地点' },
      { key: 'content', label: '通知内容', required: true, type: 'textarea', placeholder: '写清时间、地点、需要谁做什么' },
    ],
    onSubmit: (values) => {
      const title = (values.title || '').trim();
      const content = (values.content || '').trim();
      if (!title) { showToast('error', '请填写通知标题'); return false; }
      if (!content) { showToast('error', '请填写通知内容'); return false; }
      const created = NoticeStore.add({
        title,
        content,
        priority: 'normal',
        publishDate: new Date().toISOString().slice(0, 10),
        expireDate: null,
        targetModule: 'activity',
        targetType: 'activity',
        targetId: activity.id,
        targetUrl: `activity.html?id=${encodeURIComponent(activity.id)}`,
        read: false,
        audience: [],
        audiencePersons: ids,
        audienceLabel: `${audienceLabel} · 组织者发布`,
        publishedBy: ROLE_LABELS[me.role] || me.role || '',
        publisherId: meId,
        createdBy: meId,
        source: 'activity-group',
      }, me.role, meId);
      if (!created) { showToast('error', '发布失败：无发布权限'); return false; }
      showToast('success', `已发布本组通知（${audienceLabel} ${ids.length} 人可见）`);
      if (typeof onPublished === 'function') onPublished(created);
      return true;
    },
  });
  return true;
}

