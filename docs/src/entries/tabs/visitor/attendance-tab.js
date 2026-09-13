// role: [工程师]+[AI]
// 参与者工作台 Tab：考勤概况（T-279 M3 拆分，照 M2 样板）
// 本月活动出勤一览（参与者视角：支部成员对自己的活动出勤有查询视图）。
// 支书裁定（卡片去留/合并批）：出勤行补入口——「查看个人明细」+「去补课/提交补课说明」。
//   补课入口仅在存在本人待补课任务时出现（制度无「请假」入口，故不设）。

import { loadActiveAttendanceRecords, absenceReasonLabel } from '../../../services/attendance.js?v=20260913e';
import { loadMakeupTasks, saveMakeupTasks } from '../../../services/makeup.js?v=20260913e';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260913e';
import { AuthStore } from '../../../services/auth.js?v=20260913e';
import { openFormModal } from '../../../components/modal.js?v=20260913e';
import { showToast } from '../../../core/utils.js?v=20260913e';

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const activities = ctx.activities || [];
  const meId = AuthStore.getCurrentUser()?.personId || '';
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActs = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);
  tc.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="visitor-att-search" class="input-flat flex-1 min-w-[140px]" placeholder="搜索活动名称...">
    </div>
    <div id="visitor-att-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-att-list');
    if (!listEl) return;
    const q = (document.getElementById('visitor-att-search')?.value || '').trim().toLowerCase();
    const filtered = q ? monthActs.filter(a => (a.title || '').toLowerCase().includes(q)) : monthActs;
    // 本人待补课任务（按活动索引；补课入口出现条件）
    const myMakeupTasks = loadMakeupTasks().filter(t => t.personId === meId);
    listEl.innerHTML = `
      <div class="space-y-2">
        ${filtered.length === 0 ? '<p class="text-xs text-gray-500 text-center py-6">无匹配考勤数据</p>' :
          filtered.map(act => {
            const records = loadActiveAttendanceRecords().filter(r => r.activityId === act.id);
            // 出勤口径统一（2026-08-07）：已补（made_up）计入出勤，与支书概况出勤率一致
            const present = records.filter(r => r.status === 'present' || r.status === 'made_up').length;
            const total = records.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            const rateColor = rate >= 90 ? 'text-green-700' : rate >= 70 ? 'text-amber-700' : 'text-red-600';
            // C3（2026-09-12）：分母为 0 时不再显示「0/0 · 0%」（语义错误）——中性占位
            const rateText = total > 0 ? `出勤 ${present}/${total} · ${rate}%` : '出勤 —（暂无考勤记录）';
            const rateCls = total > 0 ? rateColor : 'text-gray-400';
            const myRecord = meId ? records.find(r => r.personId === meId) : null;
            const myMakeup = myMakeupTasks.find(t => t.activityId === act.id && t.status === 'pending');
            return `
              <div class="rounded-lg bg-white">
                <div class="flex items-center justify-between p-3">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800">${act.title}</p>
                    <p class="text-xs text-gray-500">${act.date}</p>
                  </div>
                  <div class="text-xs font-medium ${rateCls}">${rateText}</div>
                </div>
                <div class="flex items-center gap-2 px-3 pb-3">
                  <button type="button" class="visitor-att-detail-btn text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors" data-act-id="${act.id}" style="cursor:pointer;">查看个人明细</button>
                  ${myMakeup ? `<button type="button" class="visitor-att-makeup-btn text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors" data-act-id="${act.id}" style="cursor:pointer;">${myMakeup.proofContent ? '修改补课说明' : '去补课 · 提交补课说明'}</button>` : ''}
                </div>
                <div class="visitor-att-detail hidden px-3 pb-3 pt-1 border-t border-gray-50" data-att-detail="${act.id}">
                  <div class="text-[12px] text-gray-600 space-y-0.5">
                    <div>我的出勤：${myRecord ? `<span class="font-medium text-gray-800">${ATTENDANCE_STATUS_LABELS[myRecord.status] || myRecord.status}</span>${myRecord.status === AttendanceStatus.ABSENT || myRecord.status === AttendanceStatus.LEAVE ? `（${myRecord.overdue ? '已超期' : '待补'}）` : ''}` : '<span class="text-gray-500">无你的出勤记录</span>'}</div>
                    ${myRecord && myRecord.absenceReason ? `<div>未到标因：${absenceReasonLabel(myRecord.absenceReason)}</div>` : ''}
                    ${myMakeup ? `<div>补课截止：${myMakeup.deadline || '—'}${myMakeup.isMandatory ? '（必修：自学+心得）' : '（选修：自学）'}</div>` : ''}
                    ${myMakeup ? `<div>补课说明：${myMakeup.proofContent ? `<span class="text-gray-700 whitespace-pre-wrap">${myMakeup.proofContent}</span>` : '<span class="text-gray-500">未提交</span>'}</div>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;

    // 查看个人明细（行内展开/收起）
    listEl.querySelectorAll('.visitor-att-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const detail = listEl.querySelector(`.visitor-att-detail[data-att-detail="${btn.dataset.actId}"]`);
        if (!detail) return;
        const collapsed = detail.classList.contains('hidden');
        detail.classList.toggle('hidden', !collapsed);
        btn.textContent = collapsed ? '收起明细' : '查看个人明细';
      });
    });

    // 去补课 / 提交补课说明（仅本人待补课任务出现；提交写入 task.proofContent）
    listEl.querySelectorAll('.visitor-att-makeup-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const actId = btn.dataset.actId;
        const task = loadMakeupTasks().find(t => t.personId === meId && t.activityId === actId && t.status === 'pending');
        if (!task) { showToast('error', '未找到你的待补课任务，请刷新后重试'); return; }
        openFormModal({
          id: 'visitor-makeup-proof',
          title: `补课说明 · ${task.activityName || '缺勤活动'}`,
          fields: [{ key: 'proof', label: '补课说明（补课方式与心得要点）', type: 'textarea', required: true, placeholder: '如：已观看党课录像并撰写学习心得……' }],
          initialValues: { proof: task.proofContent || '' },
          submitLabel: '提交',
          accentColor: ctx.accent || '#3B82F6',
          onSubmit: (values) => {
            const proof = (values.proof || '').trim();
            if (!proof) { showToast('error', '请填写补课说明'); return false; }
            const tasks = loadMakeupTasks();
            const t = tasks.find(x => x.id === task.id);
            if (t) { t.proofContent = proof; saveMakeupTasks(tasks); }
            showToast('success', '补课说明已提交，待纪检确认后考勤回写「已补」');
            renderList();
            return true;
          },
        });
      });
    });
  }

  document.getElementById('visitor-att-search')?.addEventListener('input', renderList);
  renderList();
}
