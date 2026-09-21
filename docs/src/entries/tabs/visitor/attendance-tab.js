// role: [工程师]+[AI]
// 参与者工作台 Tab：考勤概况（T-279 M3 拆分，照 M2 样板）
// 本月活动出勤一览（参与者视角：支部成员对自己的活动出勤有查询视图）。
// 支书 2026-09-10 裁定（卡片去留/合并批）：出勤行补入口——「查看个人明细」+「去补课/提交补课说明」。
//   补课入口仅在存在本人待补课任务时出现（制度无「请假」入口，故不设）。
// SOP-B-15 当事人可见侧（2026-09-20 批次 116 支书定案「支委会 ＋ 当事人本人」）：顶部一块
//   「本月我的出勤率」——只算当前登录人（当事人只能看到自己的），偏低时按同一提示线给一句提示。

import { loadActiveAttendanceRecords, absenceReasonLabel, createAttendanceAppeal, summarizePersonAttendance } from '../../../services/attendance.js?v=20260921l';
import { loadMakeupTasks, saveMakeupTasks } from '../../../services/makeup.js?v=20260921l';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain.js?v=20260921l';
import { POLICY_DEFAULTS } from '../../../core/policy-defaults.js?v=20260921l';
import { AuthStore } from '../../../services/auth.js?v=20260921l';
import { openFormModal } from '../../../components/modal.js?v=20260921l';
import { showToast } from '../../../core/utils.js?v=20260921l';
// 活动「已归档」口径单一源（2026-09-13 收敛）：替代手写 !a.archived
import { isActivityArchived } from '../../../core/constants.js?v=20260921l';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/list-filter.js?v=20260921l';

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const activities = ctx.activities || [];
  const meId = AuthStore.getCurrentUser()?.personId || '';
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActs = activities.filter(a => (a.date || '').startsWith(thisMonth) && !isActivityArchived(a));
  tc.innerHTML = `
    <div id="visitor-att-mine"></div>
    <div id="visitor-att-list"></div>
  `;

  // SOP-B-15 当事人可见侧（2026-09-20 批次 116 支书定案「支委会 ＋ 当事人本人」）：
  //   「本月我的出勤率」**只算当前登录人**（服务层只传 meId ⇒ 当事人看不到别人的出勤率）；
  //   偏低时按同一提示线给一句提示——**只作呈现、不触发任何动作**（不生成补课 / 不影响评优 / 不生成处置）。
  const mineEl = document.getElementById('visitor-att-mine');
  if (mineEl) {
    const mine = summarizePersonAttendance({ personId: meId, month: thisMonth });
    const hint = POLICY_DEFAULTS.attendance.lowRateHint;
    const mineRateCls = mine.rate >= 90 ? 'text-green-700' : mine.rate >= hint ? 'text-amber-700' : 'text-red-600';
    mineEl.innerHTML = meId && mine.total > 0
      ? `<div class="rounded-lg bg-white p-3 mb-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <p class="text-sm font-medium text-gray-800">本月我的出勤率</p>
            <p class="text-sm font-semibold ${mineRateCls}">${mine.rate}%</p>
          </div>
          <p class="text-xs text-gray-500 mt-1">出勤 ${mine.present}/${mine.total}（出勤含已补）${mine.rate < hint ? ` · 低于提示线 ${hint}%，仅作提示、不触发任何处置` : ''}</p>
        </div>`
      : `<div class="rounded-lg bg-white p-3 mb-3">
          <p class="text-sm font-medium text-gray-800">本月我的出勤率</p>
          <p class="text-xs text-gray-400 mt-1">本月暂无你的考勤记录</p>
        </div>`;
  }

  /** 单条活动考勤行（本人视角；行内「查看个人明细」/「去补课」入口） */
  function rowHtml(act) {
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
    // 本人待补课任务（按活动索引；补课入口出现条件）
    const myMakeup = loadMakeupTasks().find(t => t.personId === meId && t.activityId === act.id && t.status === 'pending');
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
          ${(!myRecord || myRecord.status === AttendanceStatus.ABSENT) ? `<button type="button" class="visitor-att-appeal-btn text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors" data-act-id="${act.id}" style="cursor:pointer;">我参加了但没记上</button>` : ''}
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
  }

  const listEl = document.getElementById('visitor-att-list');
  if (!listEl) return;

  function renderList() {
    renderFilteredList(listEl, {
      stateKey: 'visitor-attendance',
      rows: monthActs,
      keyword: activityKeyword('搜索活动名称…'),
      facets: activityFacets(),
      countUnit: '条',
      listClass: 'space-y-2',
      emptyMessage: '无匹配考勤数据',
      rowHtml,
    });
  }

  // 查看个人明细（行内展开/收起）——事件委托：引擎筛选会重渲染行
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.visitor-att-detail-btn');
    if (!btn) return;
    const detail = listEl.querySelector(`.visitor-att-detail[data-att-detail="${btn.dataset.actId}"]`);
    if (!detail) return;
    const collapsed = detail.classList.contains('hidden');
    detail.classList.toggle('hidden', !collapsed);
    btn.textContent = collapsed ? '收起明细' : '查看个人明细';
  });

  // 去补课 / 提交补课说明（仅本人待补课任务出现；提交写入 task.proofContent）
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.visitor-att-makeup-btn');
    if (!btn) return;
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

  // 我参加了但没记上（SOP-B-42 / D-456）：同学反映漏记 → 交纪检委员先核实（属实再交活动组织方确认）
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.visitor-att-appeal-btn');
    if (!btn) return;
    const actId = btn.dataset.actId;
    const act = monthActs.find(a => a.id === actId);
    openFormModal({
      id: 'visitor-att-appeal',
      title: `我参加了但没记上 · ${act?.title || '活动'}`,
      fields: [{ key: 'note', label: '说明（什么情况）', type: 'textarea', required: true, placeholder: '如：我当天到场签到，但考勤里没有我' }],
      submitLabel: '提交给纪检委员',
      accentColor: ctx.accent || '#3B82F6',
      onSubmit: (values) => {
        const note = (values.note || '').trim();
        if (!note) { showToast('error', '请填写说明'); return false; }
        const res = createAttendanceAppeal({ personId: meId, activityId: actId, note });
        if (!res.ok) {
          showToast('error', res.reason === 'already' ? '你已经提过这条，纪检正在核实' : '提交失败，请稍后再试');
          return false;
        }
        showToast('success', '已提交给纪检委员，纪检会先核实再处理');
        return true;
      },
    });
  });

  renderList();
}
