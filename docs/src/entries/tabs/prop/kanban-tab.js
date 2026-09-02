// role: [工程师]+[AI]
// 宣传委员工作台 Tab：项目看板（T-279 M3 拆分，照 M2 样板）
// 活动/专班合并看板（活动+专班分桶）+ 专班工作量区块；从 TaskForceRecordStore 动态派生（H-1 数据断裂修复）。

import { badgeHtml } from '../../../components/badge.js?v=20260901h';
import { BranchService } from '../../../services/runtime.js?v=20260901h';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260901h';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260901h';
import { NoticeStore } from '../../../services/notice.js?v=20260901h';
import { persist } from '../../../core/data-adapter.js?v=20260901h';
import { showToast } from '../../../core/utils.js?v=20260901h';
import { setState } from '../../../core/state.js?v=20260901h';
import { _personName } from '../../../mock/index.js?v=20260901h';

export function renderContent(ctx) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const activities = ctx.activities || [];
  const propTf = ctx.propTf || [];

  // ── 从 TaskForceRecordStore 动态派生看板数据（H-1 数据断裂修复） ──
  // 活动按状态分桶
  const pendingActs = activities.filter(a => a.status === 'draft');
  const activeActs = activities.filter(a => a.status === 'published' || a.status === 'ongoing');
  const completedActs = activities.filter(a => a.status === 'completed');

  // 专班按状态分桶（宣传相关）
  const pendingTf = propTf.filter(t => t.status === 'draft' || t.status === 'pending_review' || t.status === 'recruiting');
  const activeTf = propTf.filter(t => t.status === 'active');
  const completedTf = propTf.filter(t => t.status === 'completed' || t.status === 'archived');

  // 合并待启动：活动 + 专班（T223 桶内新者在前）
  const pending = [
    ...pendingActs.map(a => ({ _type: 'activity', ...a })),
    ...pendingTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // 合并进行中：活动 + 专班（T223 桶内新者在前）
  const active = [
    ...activeActs.map(a => ({ _type: 'activity', ...a })),
    ...activeTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  // 合并已归档：活动 + 专班（T223 桶内新者在前）
  const completed = [
    ...completedActs.map(a => ({ _type: 'activity', ...a })),
    ...completedTf.map(t => ({ _type: 'taskforce', id: t.id, title: t.name, date: t.deadline || t.createdAt, type: '专班', status: t.status, task: t.task, capacity: t.capacity, filled: t.members.filter(m => m.personId).length })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(37,99,235,0.06);color:#2563eb;border-bottom:2px solid rgba(37,99,235,0.15);">待启动 (${pending.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${pending.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待启动项目</p>' :
            pending.map(item => _renderKanbanItem(item)).join('')}
        </div>
      </div>
      <div class="card rounded-xl p-0 overflow-hidden">
        <div class="px-4 py-3 font-title-cn text-sm font-bold" style="--acc-bg-dark:rgba(96,165,250,0.10);--acc-text-dark:#60A5FA;--acc-border-dark:rgba(96,165,250,0.25);background:rgba(59,130,246,0.06);color:#3b82f6;border-bottom:2px solid rgba(59,130,246,0.15);">进行中 (${active.length})</div>
        <div class="p-3 space-y-2 min-h-[120px]">
          ${active.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无进行中项目</p>' :
            active.map(item => _renderKanbanItem(item, true)).join('')}
        </div>
      </div>
    </div>
    ${completed.length > 0 ? `
    <details class="card rounded-xl p-0 overflow-hidden">
      <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="--acc-bg-dark:rgba(148,163,184,0.10);--acc-text-dark:#94A3B8;--acc-border-dark:rgba(148,163,184,0.25);background:rgba(107,114,128,0.06);color:#6B7280;border-bottom:2px solid rgba(107,114,128,0.15);">已归档 (${completed.length})</summary>
      <div class="p-3 space-y-2">
        ${completed.map(item => _renderKanbanItem(item)).join('')}
      </div>
    </details>` : ''}
    ${_renderWorkloadBlock(propTf)}
  `;

  // ── "确认完成"按钮事件绑定 ──
  container.querySelectorAll('.activity-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归入已归档。`);
      if (!confirmed) return;
      activity.status = 'completed';
      BranchService.updateActivity(actId, { status: 'completed' });
      persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
      // 做事即销待办：活动完成 → 销宣传侧「活动归档」/书记「待复盘」
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, actId);
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, `review_${actId}`);
      showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
      setState({});
    });
  });
  container.querySelectorAll('.tf-complete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tfId = btn.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf || tf.status !== 'active') return;
      // T-224 §7 关闭权归组织委员：宣传端仅「归档」（active→archived 合法迁移），不置 completed（解散语义）
      const confirmed = window.confirm(`确认归档专班「${tf.name}」？归档不回收赋权、不生成工作量报告；解散由组织委员执行。`);
      if (!confirmed) return;
      TaskForceRecordStore.updateStatus(tfId, 'archived');
      // 做事即销待办：专班归档 → 销「专班归档」待办
      TodoStore.completeBySource(TodoSourceType.TASKFORCE, tfId);
      // 2026-08-08 归档闭环：专班归档 → 配套通知随之一并归档，退出工作区
      NoticeStore.archiveBySource('taskforce', tfId);
      showToast('success', `专班「${tf.name}」已归档`);
      setState({});
    });
  });
}

function _renderKanbanItem(item, showCompleteBtn = false) {
  const isTf = item._type === 'taskforce';
  const typeTag = isTf
    ? badgeHtml('专班', 'success')
    : (item.type ? badgeHtml(item.type, 'info') : '');
  const subInfo = isTf
    ? `<span class="text-xs text-gray-400">${item.filled}/${item.capacity} 人</span>`
    : '';
  const completeBtn = showCompleteBtn
    ? (isTf
      ? `<button class="tf-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-tf-id="${item.id}" onclick="event.stopPropagation();">归档专班</button>`
      : `<button class="activity-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-1" data-act-id="${item.id}" onclick="event.stopPropagation();">确认完成</button>`)
    : '';
  return `
    <div class="kanban-card p-3 rounded-xl bg-white hover:bg-gray-200 transition-colors cursor-pointer" data-kt="${item._type}" data-ki="${item.id}">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800">${item.title || '未命名'}</span>
        ${typeTag}
      </div>
      <div class="text-xs text-gray-500 mt-0.5">${item.date || ''} ${subInfo}</div>
      ${isTf && item.task ? `<div class="text-[12px] text-gray-400 mt-0.5 line-clamp-1">${item.task}</div>` : ''}
      ${completeBtn}
    </div>`;
}

// ── 专班工作量区块（融入项目看板 tab 底部） ──
function _renderWorkloadBlock(propTf) {
  const workloadMap = {};
  propTf.forEach(tf => {
    tf.members.forEach(m => {
      if (!m.personId) return;
      if (!workloadMap[m.personId]) workloadMap[m.personId] = { personId: m.personId, contributions: 0, tfCount: 0, roles: new Set() };
      workloadMap[m.personId].contributions += (m.contributions || []).length;
      workloadMap[m.personId].tfCount += 1;
      workloadMap[m.personId].roles.add(m.role);
    });
  });
  const members = Object.values(workloadMap);

  return `
    <div class="card rounded-xl p-5 mt-4">
      <div class="flex items-center gap-2 mb-3">
        <h4 class="text-sm font-bold text-gray-700">专班工作量</h4>
        ${badgeHtml(`${propTf.length} 个专班`, 'warning')}
      </div>
      ${members.length === 0 ? '<p class="text-xs text-gray-400">暂无宣传专班成员数据</p>' :
        `<div class="space-y-2">${members.map(m => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
              <span class="text-xs text-gray-400">${Array.from(m.roles).join('·')}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span>${m.contributions} 产出</span>
              <span>${m.tfCount} 专班</span>
            </div>
          </div>
        `).join('')}</div>`}
    </div>
  `;
}
