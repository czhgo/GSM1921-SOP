// role: [工程师]+[AI]
// member-change-panel.js — 成员变更审批面板（2026-09-01 书记点验链路 ③④ 前端入口）
// org-commissioner：待审批（pending-org-approval）→ 通过（approve，自动广播全体支委）
// secretary：待确认（pending-secretary）→ 确认（confirm，更新成员发展阶段）
// 数据闭环：议程「记录通过」→ 自动建申请 → 本面板审批 → 广播/更新阶段。

import { getAdapter } from '../core/data-adapter.js?v=20260901y';
import { getPersonById, getPersonName } from '../mock/index.js?v=20260901y';
import { loadActivities } from '../services/activity.js?v=20260901y';
import { showToast } from '../core/utils.js?v=20260901y';
import { badgeHtml } from './badge.js?v=20260901y';
import { NoticeStore } from '../services/notice.js?v=20260901y';

const STATUS_LABEL = {
  'pending-org-approval': '待组织委员审批',
  'pending-secretary': '待书记确认',
  completed: '已完成',
  rejected: '已驳回',
};

/**
 * 渲染成员变更审批/确认面板。
 * @param {HTMLElement} container
 * @param {{mode: 'org-approve'|'secretary-confirm', accent: string, onDone?: () => void}} opts
 */
export async function renderMemberChangePanel(container, { mode, accent = '#B91C1C', onDone } = {}) {
  if (!container) return;
  const adapter = getAdapter();
  let requests = [];
  try {
    requests = await adapter.memberChangeRequests.list();
  } catch (e) {
    console.warn('[member-change-panel] 申请列表加载失败：', e);
  }
  const pendingStatus = mode === 'org-approve' ? 'pending-org-approval' : 'pending-secretary';
  const list = requests.filter((r) => r.status === pendingStatus);
  const title = mode === 'org-approve' ? '成员变更审批' : '成员变更确认';

  container.innerHTML = `
    <div class="card rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between mb-1.5">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${title}</h4>
        ${list.length > 0 ? badgeHtml(`${list.length} 条待处理`, 'warning') : badgeHtml('已清空', 'neutral')}
      </div>
      <div class="text-xs text-gray-500 mb-2">议事留痕：议程通过后自动派生，组织委员审批 → 书记确认 → 更新成员阶段</div>
      ${list.length === 0
        ? '<p class="text-xs text-gray-400 py-1">暂无待处理项</p>'
        : `<div class="divide-y divide-gray-50">
            ${list.map((r) => {
              const person = getPersonById(r.personId);
              const act = loadActivities().find((a) => a.id === r.activityId);
              return `
                <div class="flex items-center justify-between gap-3 py-2" data-mcr-id="${r.id}">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm font-medium text-gray-800 truncate">${person?.name || r.personId}：${r.fromStage || ''} → ${r.toStage || ''}</span>
                      ${badgeHtml(STATUS_LABEL[r.status] || r.status, 'warning')}
                    </div>
                    <div class="text-xs text-gray-400 truncate">${act?.title || '活动'} · ${(r.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
                  </div>
                  <button type="button" class="mcr-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" style="background:${mode === 'org-approve' ? '#16A34A' : accent};cursor:pointer;">${mode === 'org-approve' ? '通过' : '确认'}</button>
                </div>`;
            }).join('')}
          </div>`}
    </div>`;

  const refresh = () => { if (typeof onDone === 'function') onDone(); };

  container.querySelectorAll('.mcr-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('[data-mcr-id]');
      const id = row.dataset.mcrId;
      try {
        if (mode === 'org-approve') {
          await adapter.memberChangeRequests.approve(id);
          showToast('success', '已审批通过，广播已发送全体支委');
          // P2（2026-09-01 代码审查）：审批通过后发全员通知 = 广播送达证据（书记点验链路 ③「确认全体支委收到广播」）
          try {
            const r = requests.find((x) => x.id === id);
            const person = r && getPersonById(r.personId);
            const act = r && loadActivities().find((a) => a.id === r.activityId);
            NoticeStore.add({
              title: '成员变更已审批通过',
              content: `${person?.name || r?.personId || ''}：${r?.fromStage || ''}→${r?.toStage || ''} 已通过组织委员审批（${act?.title || '活动'}），待书记确认后更新发展阶段。`,
              priority: 'normal',
              targetUrl: 'workspace/secretary.html',
            });
          } catch (ne) {
            console.warn('[member-change-panel] 广播通知发送失败：', ne);
          }
        } else {
          await adapter.memberChangeRequests.confirm(id);
          showToast('success', '已确认，成员发展阶段已更新');
        }
        refresh();
      } catch (e) {
        console.warn('[member-change-panel] 操作失败：', e);
        showToast('error', e.message || '操作失败');
      }
    });
  });
}
