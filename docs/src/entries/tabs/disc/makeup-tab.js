// role: [工程师]+[AI]
// 纪检委员工作台：补课（「考勤管理」tab 的「补课」一级分段渲染模块；2026-09-15 支书裁定并入考勤管理，
// 由 attendance-tab 传入分段容器调用；原为独立 tab，内部逻辑原样保留）。
// 补课口径（现行 = D-293）：范围＝支部党员大会 + 党课（支委会不补、主题党日不强制补课、
// 党小组会按写入活动时的勾选），缺勤/请假的这些场次须在 T+7 内补课，纪检委员确认完成；
// 请假且线上参会的**不补课**（判据单一源 = services/activity/makeup.js::shouldGenerateMakeupTask）。
// B3-1 修复（T-280）：确认补课完成时回写考勤 status=made_up——完成必须对应真实产物（打卡化判定）。

import { loadMakeupTasks, saveMakeupTasks } from '../../../services/activity/makeup.js?v=20261004c';
import { loadAttendanceRecords, saveAttendanceRecords } from '../../../services/activity/attendance.js?v=20261004c';
import { AttendanceStatus } from '../../../core/domain/domain.js?v=20261004c';
import { getPersonById, getPersonName } from '../../../services/member/person.js?v=20261004c';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261004c';
import { showToast, getBasePath, escHtml as esc } from '../../../core/base/utils.js?v=20261004c';
import { renderHandoffInboxHtml, bindHandoffInbox } from '../../../components/governance/handoff-inbox.js?v=20261004c';
// R1-A 点⑤（2026-09-09）：强调色渲染统一 person-aware 动态解析（替代 resolveAccentRole 只读全局键快照）
import { getAppliedAccentColors } from '../../../core/boot/theme.js?v=20261004c';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/ui/list-filter.js?v=20261004c';
// V-7（2026-10-01 批次 324）：纪检「催当事人」走系统派生通知单一入口（服务端 kind 注册表复算授权）
import { NoticeStore } from '../../../services/governance/notice.js?v=20261004c';
// 批次 346（`D-744`②）：补课任务「作废（软）」——统一写口 ＋ 支委层判据（支委可直接作废，其余报支委会）
import * as SoftVoid from '../../../services/governance/soft-void.js?v=20261004c';
// 批次 352（`D-746`）：作废弹窗改走**单一源**（`components/ui/void-record.js`）——本板块沿用既有 id，
//   故真机流 `disc-makeup-void-reason` 的选择器一字未改
import { openVoidModal } from '../../../components/ui/void-record.js?v=20261004c';

/**
 * @param {HTMLElement} [containerEl] — 挂载容器（缺省本台 tab 内容容器）。
 *   2026-09-15 支书裁定「补课并入考勤管理」后，本模块作为「考勤管理」tab 的「补课」分段子块，
 *   由 attendance-tab 传入分段容器调用。
 */
export function renderContent(containerEl) {
  const container = containerEl || document.getElementById('disc-tab-content');
  if (!container) return;

  // 批次 346：默认列表把已作废（`voided`）挡在外面（作废＝不办了、从列表消失；留痕仍可回查）
  const tasks = SoftVoid.filterActive('makeupTasks', loadMakeupTasks());
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => new Date(t.deadline) < new Date());

  const statusBadge = (task) => {
    // 批次 346（`D-744`②）：软作废的过渡态在状态格可见——「待支委会确认」＝已申请、尚未裁决
    if (task.voidPending && !task.voided) return badgeHtml('待支委会确认', 'warning');
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
                <td>${t.status === 'pending' ? `<button class="btn-action btn-action-green btn-disc-confirm-makeup" data-task-id="${t.id}">确认完成</button> <button class="btn-action btn-disc-urge-makeup" data-task-id="${t.id}" title="向当事人发送补课提醒（V-7：纪检催当事人）">催当事人</button>` : ''}${t.voidPending ? '<span class="text-xs text-gray-500">待支委会确认</span>' : `<button class="btn-action btn-action-gray btn-disc-void-makeup" data-task-id="${t.id}" title="软作废：默认列表出列、留痕可回查；支委可直接作废，其余人报支委会确认">作废</button>`}</td>
              </tr>`;
  };

  container.innerHTML = `
    <div class="space-y-4">
      ${renderHandoffInboxHtml({
        to: 'disc-commissioner',
        accent: getAppliedAccentColors('disc-commissioner').accent,
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
        <p class="text-xs text-gray-500 mb-2">补课范围按会议类型分：仅支部党员大会与党课须 7 日内补课（T+7）。<a href="./help.html#card-copy-makeup-scope" class="text-sky-600 hover:underline">见帮助 · 补课范围与归档</a></p>
        <details class="mb-3">
          <summary class="text-[11px] text-gray-500 cursor-pointer select-none">补课范围与归档口径 ▾</summary>
          <div class="text-[11px] text-gray-500 leading-5 mt-1">支委会与主题党日均不补课（后者不强制），党小组会依该场勾选进名单；请假且线上参会者不补课。补课记录随考勤自动归档（随「考勤管理」一并交付支委会），不另设「补课记录归档审查」个人动作——归档不靠重复劳动。</div>
        </details>
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
    facetStyle: 'chip',
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

  // 绑定操作按钮（事件委托：引擎筛选重渲染行后仍可点）
  container.querySelector('#disc-makeup-host')?.addEventListener('click', (e) => {
    // V-7（2026-10-01 批次 324 · 支书裁甲）：**纪检催当事人**——纪检是补课闭环责任人，
    //   当事人本人是补课主体。通知走服务端 kind 注册表（`makeup-remind`）复算授权与文案，
    //   受众＝**到人定向**（当事人一人），不广播给全支部。
    const urgeBtn = e.target.closest('.btn-disc-urge-makeup');
    if (urgeBtn) {
      const task = loadMakeupTasks().find((t) => t.id === urgeBtn.dataset.taskId);
      if (task) {
        NoticeStore.addSystem('makeup-remind', task.id, {
          personId: task.personId,
          personName: task.personName,
          activityName: task.activityName,
          deadline: task.deadline,
        });
        showToast('success', `已向 ${getPersonName(task.personId)} 发出补课提醒`);
      }
      return;
    }
    // 批次 346（`D-744`②）：软作废——支委层直接作废、其余人走审批门（申请→支委在支书台确认）
    const voidBtn = e.target.closest('.btn-disc-void-makeup');
    if (voidBtn) { _askMakeupVoid(voidBtn.dataset.taskId, container); return; }
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

// ── 补课任务「作废（软）」入口（批次 346 · `D-744`②；审批门同 `#1` 口径） ─────────────
/** 作废原因必填的弹窗 → 支委层直接作废（`confirmVoid`）／其余人报支委会（`requestVoid`，待支书台确认）。
 *  弹窗实现＝**单一源** `components/ui/void-record.js`（批次 352 抽出；本板块沿用其既有 id，
 *  故真机流 `disc-makeup-void-reason` 的选择器一字未改）。 */
function _askMakeupVoid(taskId, container) {
  const task = loadMakeupTasks().find((t) => t.id === taskId);
  if (!task) return;
  const who = getPersonName(task.personId) || task.personName || task.personId;
  openVoidModal({
    resource: 'makeupTasks',
    id: taskId,
    label: '补课任务',
    subject: `${who} · ${task.activityName || '补课'}`,
    modalId: 'makeup-void-modal',
    reasonId: 'makeup-void-reason',
    okAttr: 'data-makeup-void-ok',
    cancelAttr: 'data-makeup-void-cancel',
    onDone: () => renderContent(container),
  });
}
