// role: [工程师]+[AI]
// 纪检委员工作台：补课（「考勤管理」tab 的「补课」一级分段渲染模块；2026-09-15 支书裁定并入考勤管理，
// 由 attendance-tab 传入分段容器调用；原为独立 tab，内部逻辑原样保留）。
// 缺勤/请假的三会一课、主题党日须在7日内补课，纪检委员确认完成。
// B3-1 修复（T-280）：确认补课完成时回写考勤 status=made_up——完成必须对应真实产物（打卡化判定）。

import { loadMakeupTasks, saveMakeupTasks } from '../../../services/makeup.js?v=20260915g';
import { loadAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260915g';
import { AttendanceStatus } from '../../../core/domain.js?v=20260915g';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260915g';
import { badgeHtml } from '../../../components/badges.js?v=20260915g';
import { showToast, getBasePath, escHtml as esc } from '../../../core/utils.js?v=20260915g';
import { renderHandoffInboxHtml, bindHandoffInbox } from '../../../components/handoff-inbox.js?v=20260915g';
// R1-A 点⑤（2026-09-09）：强调色渲染统一 person-aware 动态解析（替代 resolveAccentRole 只读全局键快照）
import { getAppliedAccentColors } from '../../../core/theme.js?v=20260915g';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260915g';

/**
 * @param {HTMLElement} [containerEl] — 挂载容器（缺省本台 tab 内容容器）。
 *   2026-09-15 支书裁定「补课并入考勤管理」后，本模块作为「考勤管理」tab 的「补课」分段子块，
 *   由 attendance-tab 传入分段容器调用。
 */
export function renderContent(containerEl) {
  const container = containerEl || document.getElementById('disc-tab-content');
  if (!container) return;

  const tasks = loadMakeupTasks();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => new Date(t.deadline) < new Date());

  const statusBadge = (task) => {
    if (task.status === 'completed') return badgeHtml('已完成', 'success');
    if (new Date(task.deadline) < new Date()) return badgeHtml('已超期', 'danger');
    return badgeHtml('待补课', 'warning');
  };

  // 统一检索引擎（table 模式）：行数据按 personId 现取档案补齐分面字段（人名一律 getPersonName(id)，禁用记录内快照）
  const makeupRows = tasks.map(t => {
    const m = getPersonById(t.personId) || {};
    return {
      ...t,
      personId: t.personId,
      name: getPersonName(t.personId),
      studentId: m.studentId || '',
      partyGroup: m.partyGroup || '',
      developStage: m.developStage || '',
      role: m.role || '',
      residenceStatus: m.residenceStatus || '',
    };
  });

  const rowHtml = (t) => {
    const isOverdue = t.status === 'pending' && new Date(t.deadline) < new Date();
    const rowBg = isOverdue ? 'bg-red-50/40' : t.status === 'completed' ? '' : 'bg-orange-50/20';
    return `
              <tr${rowBg ? ` class="${rowBg}"` : ''}>
                <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(t.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(t.personId))}</a></td>
                <td class="text-gray-600">${t.activityName || '—'}</td>
                <td class="text-gray-600">${t.isMandatory ? badgeHtml('必修', 'danger') + ' 自学+心得' : badgeHtml('选修', 'info') + ' 自学'}</td>
                <td class="text-gray-600">${t.deadline || '—'}</td>
                <td>${statusBadge(t)}</td>
                <td>${t.status === 'pending' ? `<button class="btn-action btn-action-green btn-disc-confirm-makeup" data-task-id="${t.id}">确认完成</button>` : '<span class="text-xs text-gray-500">—</span>'}</td>
              </tr>`;
  };

  container.innerHTML = `
    <div class="space-y-4">
      ${renderHandoffInboxHtml({
        to: 'disc-commissioner',
        accent: getAppliedAccentColors('disc-commissioner').accent,
        title: '补课需求回执（组织→纪检）',
      })}
      <div class="card rounded-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">补课任务</h3>
          <div class="flex gap-4 text-xs">
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span><span class="text-gray-600">待补课</span><span class="font-bold text-orange-700">${pendingTasks.length}</span></div>
            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-gray-600">已超期</span><span class="font-bold text-red-700">${overdueTasks.length}</span></div>
          </div>
        </div>
        <div class="text-xs text-gray-500 mb-3">缺勤/请假的三会一课、主题党日须在7日内补课，纪检委员确认完成</div>
        <div class="overflow-x-auto">
          <div id="disc-makeup-host"></div>
        </div>
      </div>
    </div>
  `;

  // 统一检索引擎（table 模式：rowHtml 返回 <tr>，表格样式由 styles.css::.data-table 单一源提供）：
  // 关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册）；行数 ≤8 时引擎自动不渲染检索条。
  renderFilteredList(container.querySelector('#disc-makeup-host'), {
    stateKey: 'disc-makeup-list',
    rows: makeupRows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    emptyMessage: '暂无补课任务',
    table: {
      colSpan: 6,
      headHtml: `<tr>
              <th>姓名</th>
              <th>缺席活动</th>
              <th>补课方式</th>
              <th>截止日期</th>
              <th>状态</th>
              <th>操作</th>
            </tr>`,
    },
    rowHtml,
  });

  // 绑定"确认完成"按钮事件（事件委托：引擎筛选重渲染行后仍可点）
  container.querySelector('#disc-makeup-host')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-disc-confirm-makeup');
    if (!btn) return;
    {
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
        showToast('success', `${getPersonName(task.personId)} 的补课任务已确认完成，考勤已回写「已补」`);
        renderContent(container);
      }
    }
  });

  // T-304 C2 数据交接：纪检确认补课需求回执（组织标记材料缺失 → 纪检收到并闭环）
  bindHandoffInbox(container, { to: 'disc-commissioner', onDone: () => { showToast('success', '补课需求回执已确认'); renderContent(container); } });
}
