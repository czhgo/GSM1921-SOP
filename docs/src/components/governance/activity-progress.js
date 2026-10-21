// role: [工程师]+[AI]
// components/governance/activity-progress.js — 组织台「活动进展」分段（2026-10-20 第三轮 IA 判例④）
//
// 为什么从「专班管理」拆出：
//   原组织台「专班管理」页内并列三视图（专班工作组 / 活动工作组 / 报名总表），其中「活动工作组」
//   查询的是**全部活动**，与组织台「活动日历」回答同一个问题（支部有哪些活动、进展如何），
//   且让「专班管理」这个页签名覆盖了它不管理的对象（D-442 锁定页签名，不能改名）。
//   裁定：页签名保留，活动进展迁回「活动日历」页作为组织侧分段；本组件即该分段的唯一实现。
//
// 为什么把旧按钮文案改为「标记完成」：
//   旧按钮只执行 `updateActivity(status:'completed')`，却 toast「已完成并归档」——既没有调用归档服务，
//   也绕过了支书台归档前的材料 / 考勤闸门。本次不新增第二套归档写口（归档仍走活动详情的材料闸门），
//   文案与提示只说「标记完成」，不再声称「完成即归档」。

import { BranchService } from '../../services/core/runtime.js?v=20261021c';
import { persist } from '../../data/data-adapter.js?v=20261021c';
import { showToast, escHtml as esc } from '../../core/base/utils.js?v=20261021c';
import { isActivityEnded } from '../../core/domain/constants.js?v=20261021c';
import { getPersonName } from '../../services/member/person.js?v=20261021c';
import { badgeHtml } from '../ui/badges.js?v=20261021c';
import { renderQueryView } from './query-view.js?v=20261021c';

/**
 * 渲染活动进展分段（全部活动查询 + 材料出口 + 标记完成）。
 * @param {HTMLElement} host 挂载容器
 * @param {{activities?:Array, accent?:string, onChange?:Function}} opts
 */
export function renderActivityProgress(host, { activities = [], accent, onChange } = {}) {
  if (!host) return;
  const typeOptions = [...new Set(activities.map((a) => a.type).filter(Boolean))]
    .map((t) => ({ value: t, label: t }));
  const queryData = activities.map((a) => ({ ...a, ended: String(isActivityEnded(a)) }));

  host.innerHTML = `
    <details class="card rounded-xl p-5" id="org-activity-progress-card">
      <summary class="cursor-pointer select-none flex flex-wrap items-baseline gap-x-2">
        <span class="font-title-cn text-base font-semibold text-gray-800">活动进展</span>
        <span class="text-xs text-gray-500 tabular-nums">${activities.length} 项</span>
      </summary>
      <p class="text-xs text-gray-500 mt-3 mb-3">按承办范围查看活动；归档仍在活动详情按材料 / 考勤闸门办理。</p>
      <div id="org-activity-query"></div>
    </details>
  `;

  const queryContainer = host.querySelector('#org-activity-query');
  if (!queryContainer) return;

  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索活动名称…',
    searchKey: 'title',
    filters: [
      { key: 'type', label: '活动类型', options: typeOptions },
      { key: 'ended', label: '状态', options: [
        { value: 'false', label: '进行中' },
        { value: 'true', label: '已结束' },
      ] },
    ],
    data: queryData,
    renderRow: (a) => {
      const ended = isActivityEnded(a);
      const scopeLabel = a.organizingScope === 'party-group' ? '组内承办'
        : a.organizingScope === 'cross-group' ? '跨组承办'
          : a.organizingScope === 'branch' ? '支部级' : '承办范围未填';
      const organizers = [...new Set([
        a.organizer,
        ...(Array.isArray(a.assignments)
          ? a.assignments.filter((member) => member.role === 'organizer').map((member) => member.personId)
          : []),
      ].filter(Boolean))];
      const deepCount = Array.isArray(a.assignments)
        ? a.assignments.filter((member) => member.role === 'deep').length : 0;
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white transition-colors">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium ${ended ? 'text-gray-500' : 'text-gray-800'}">${esc(a.title || '未命名')}</div>
            <div class="text-xs text-gray-500 mt-0.5">${esc(a.date || '')}${a.type ? ' · ' + esc(a.type) : ''}${a.location ? ' · ' + esc(a.location) : ''}</div>
            <div class="text-[11px] text-gray-500 mt-1">${scopeLabel} · 责任组：${esc(a.hostGroup || '—')} · 组织者：${organizers.length ? organizers.map((id) => getPersonName(id)).join('、') : '待指定'} · 深度参与 ${deepCount} 人</div>
          </div>
          <div class="flex items-center gap-2">
            ${ended ? badgeHtml('已结束', 'neutral') : badgeHtml('进行中', 'success')}
            <a href="./activity-materials.html?id=${encodeURIComponent(a.id)}" class="text-xs text-sky-700 hover:underline" title="材料清单 → 上传/核对 → 提交归档">材料与归档</a>
            ${ended ? '' : `<button type="button" class="btn-accent-soft track-complete-btn text-xs px-3 py-1.5" data-act-id="${esc(a.id)}">标记完成</button>`}
          </div>
        </div>
      `;
    },
    emptyMessage: '无匹配活动',
    accentColor: accent,
    sortKey: 'date',
    sortDir: 'desc',
    pageSize: 10,
    pageParam: 'opage',
  });

  queryContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.track-complete-btn');
    if (!btn) return;
    const actId = btn.dataset.actId;
    const activity = activities.find((a) => a.id === actId);
    if (!activity) return;
    const ok = window.confirm(`确认将「${activity.title || '未命名'}」标记为完成？归档仍需在活动详情按材料 / 考勤闸门办理。`);
    if (!ok) return;
    BranchService.updateActivity(actId, { status: 'completed' });
    persist();
    showToast('success', `活动「${activity.title || '未命名'}」已标记完成（未归档）`);
    onChange?.();
  });
}
