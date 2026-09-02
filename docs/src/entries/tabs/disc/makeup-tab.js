// role: [工程师]+[AI]
// 纪检委员工作台 Tab：补课制度（T-279 M3 拆分）
// 缺勤/请假的三会一课、主题党日须在7日内补课，纪检委员确认完成。
// B3-1 修复（T-280）：确认补课完成时回写考勤 status=made_up——完成必须对应真实产物（打卡化判定）。

import { loadMakeupTasks, saveMakeupTasks } from '../../../services/makeup.js?v=20260901r';
import { loadAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260901r';
import { AttendanceStatus } from '../../../core/domain.js?v=20260901r';
import { getPersonName } from '../../../mock/index.js?v=20260901r';
import { badgeHtml } from '../../../components/badge.js?v=20260901r';
import { showToast } from '../../../core/utils.js?v=20260901r';
import { renderHandoffInboxHtml, bindHandoffInbox } from '../../../components/handoff-inbox.js?v=20260901r';
import { getAccentColors, resolveAccentRole } from '../../../core/constants.js?v=20260901r';

export function renderContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const tasks = loadMakeupTasks();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => new Date(t.deadline) < new Date());

  const statusBadge = (task) => {
    if (task.status === 'completed') return badgeHtml('已完成', 'success');
    if (new Date(task.deadline) < new Date()) return badgeHtml('已超期', 'danger');
    return badgeHtml('待补课', 'warning');
  };

  container.innerHTML = `
    <div class="space-y-4">
      ${renderHandoffInboxHtml({
        to: 'disc-commissioner',
        accent: getAccentColors(resolveAccentRole('disc-commissioner')).accent,
        title: '补课需求回执（组织→纪检）',
      })}
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">补课任务</h3>
          <div class="flex gap-4 text-xs">
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待补课</span><span class="font-bold text-orange-700">${pendingTasks.length}</span></div>
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-gray-600">已超期</span><span class="font-bold text-red-700">${overdueTasks.length}</span></div>
          </div>
        </div>
        <div class="text-xs text-gray-500 mb-3">缺勤/请假的三会一课、主题党日须在7日内补课，纪检委员确认完成</div>
        ${tasks.length === 0 ? '<div class="text-xs text-gray-400 py-6 text-center">暂无补课任务</div>' : `
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead><tr class="border-b border-gray-200">
              <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">缺席活动</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">补课方式</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">截止日期</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
              <th class="py-2 px-3 text-left text-gray-500 font-medium">操作</th>
            </tr></thead>
            <tbody>${tasks.map(t => {
              const isOverdue = t.status === 'pending' && new Date(t.deadline) < new Date();
              const rowBg = isOverdue ? 'bg-red-50/40' : t.status === 'completed' ? '' : 'bg-orange-50/20';
              return `
              <tr class="border-b border-gray-50 hover:bg-gray-50 ${rowBg}">
                <td class="py-2 px-3 font-medium text-gray-800">${t.personName || getPersonName(t.personId)}</td>
                <td class="py-2 px-3 text-gray-600">${t.activityName || '—'}</td>
                <td class="py-2 px-3 text-gray-600">${t.isMandatory ? badgeHtml('必修', 'danger') + ' 自学+心得' : badgeHtml('选修', 'info') + ' 自学'}</td>
                <td class="py-2 px-3 text-gray-600">${t.deadline || '—'}</td>
                <td class="py-2 px-3">${statusBadge(t)}</td>
                <td class="py-2 px-3">${t.status === 'pending' ? `<button class="btn-action btn-action-green btn-disc-confirm-makeup" data-task-id="${t.id}">确认完成</button>` : '<span class="text-xs text-gray-400">—</span>'}</td>
              </tr>
            `}).join('')}</tbody>
          </table>
        </div>
        `}
      </div>

      ${overdueTasks.length > 0 ? `
      <div class="bg-red-50 border border-red-200 rounded-xl p-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-red-700">超期提醒</span>
          ${badgeHtml(`${overdueTasks.length}条`, 'danger')}
        </div>
        <div class="text-xs text-red-600">以下补课任务已超期，请尽快督促完成</div>
        <div class="mt-2 space-y-1">
          ${overdueTasks.map(t => `
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-700">${t.personName || getPersonName(t.personId)} — ${t.activityName || '—'}</span>
              <span class="text-red-500">截止 ${t.deadline}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 绑定"确认完成"按钮事件
  container.querySelectorAll('.btn-disc-confirm-makeup').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      const tasks = loadMakeupTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        saveMakeupTasks(tasks);
        // B3-1 修复：补课完成 → 考勤回写 made_up（打卡化判定：完成必须对应真实产物）。
        // 用 loadAttendanceRecords（原始全表）避免 loadActiveAttendanceRecords 的归档过滤丢已归档考勤。
        if (task.attendanceRecordId) {
          const records = loadAttendanceRecords();
          const rec = records.find(r => r.id === task.attendanceRecordId);
          if (rec && (rec.status === AttendanceStatus.ABSENT || rec.status === AttendanceStatus.LEAVE)) {
            rec.status = AttendanceStatus.MADE_UP;
            rec.overdue = false; // 补课完成 = 缺勤闭环，不再逾期
            rec.madeUpAt = new Date().toISOString();
            saveAttendanceRecords(records);
          }
        }
        showToast('success', `${task.personName || getPersonName(task.personId)} 的补课任务已确认完成，考勤已回写「已补」`);
        renderContent();
      }
    });
  });

  // T-304 C2 数据交接：纪检确认补课需求回执（组织标记材料缺失 → 纪检收到并闭环）
  bindHandoffInbox(container, { to: 'disc-commissioner', onDone: () => { showToast('success', '补课需求回执已确认'); renderContent(); } });
}
