// role: [工程师]+[AI]
// 参与者工作台 Tab：考勤概况（T-279 M3 拆分，照 M2 样板）
// 本月活动出勤一览（参与者视角：支部成员对自己的活动出勤有查询视图）。
// 支书 2026-09-10 裁定（卡片去留/合并批）：出勤行补入口——「查看个人明细」+「去补课/提交补课说明」。
//   补课入口仅在存在本人待补课任务时出现（制度无「请假」入口，故不设）。
// SOP-B-15 当事人可见侧（2026-09-20 批次 116 支书定案「支委会 ＋ 当事人本人」）：顶部一块
//   「本月我的出勤率」——只算当前登录人（当事人只能看到自己的），偏低时按同一提示线给一句提示。

// R2-47（2026-10-20）：出勤率统一走服务层的两个显式语义（按应到 / 按已录），页面不再自己相除；
//   R2-14：配色档位同源 attendanceRateTone（良好线 90 + 制度提示线 lowRateHint）。
import { loadActiveAttendanceRecords, absenceReasonLabel, createAttendanceAppeal, summarizePersonAttendanceByRoster, summarizeAttendanceByActivity, attendanceRateTone } from '../../../services/activity/attendance.js?v=20261029b';
import { getOrganizedActivities } from '../../../services/activity/activity.js?v=20261029b';
import { loadMakeupTasks, saveMakeupTasks } from '../../../services/activity/makeup.js?v=20261029b';
import { AttendanceStatus, ATTENDANCE_STATUS_LABELS } from '../../../core/domain/domain.js?v=20261029b';
import { POLICY_DEFAULTS, isAttendanceOverdue } from '../../../core/domain/policy-defaults.js?v=20261029b';
import { AuthStore } from '../../../services/core/auth.js?v=20261029b';
import { openFormModal } from '../../../components/ui/modal.js?v=20261029b';
import { showToast, todayLocal } from '../../../core/base/utils.js?v=20261029b';
// 活动「已归档」口径单一源（2026-09-13 收敛）：替代手写 !a.archived
import { isActivityArchived } from '../../../core/domain/constants.js?v=20261029b';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/ui/list-filter.js?v=20261029b';
// 材料页深链 focusActivityId 的通用定位（只滚动 + 闪烁，不另造筛选器）
import { focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261029b';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261029b';

import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261029b';
export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const activities = ctx.activities || [];
  const meId = AuthStore.getCurrentUser()?.personId || '';
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // 2026-10-01 批次 326 实跑修（**存量红**，`form-loop-sweep` 的 `visitor-attendance-makeup-proof` 在原基线上同样复现）：
  //   本列表原**只列本月活动**（`a.date.startsWith(thisMonth)`），而「去补课 · 提交补课说明」按钮长在活动行上
  //   ⇒ 一旦补课任务**跨月**（种子 `mk-seed-1` 挂 9 月的 `act-31`，时钟到 10 月），本人待补课的**唯一提交入口
  //   就消失**——变成**未完成义务的死链**（补课任务本身仍是 `pending`，`disc` 台仍在等它闭环）。
  //   修法取最小对症面：**仍待补课的往期活动一并列入**（新增一项、不缩小原有面）。
  const myPendingMakeupActIds = new Set(
    loadMakeupTasks().filter(t => t.personId === meId && t.status === 'pending').map(t => t.activityId),
  );
  const monthActs = activities.filter(a =>
    !isActivityArchived(a) && ((a.date || '').startsWith(thisMonth) || myPendingMakeupActIds.has(a.id)),
  );
  // D-808（2026-10-06 支书圈甲「组长和组织者是两个概念」）：被指定为组织者的成员，考勤上传位长在
  // 【本人】页面——个人考勤内容之后挂「由我组织的活动 · 考勤上传位」（实现单一源＝leader/attendance-tab.js，
  // host 宿主复用、不复制表单）；原「组织者兜底进组长台」跨台形态已同批撤除（bootstrap 放行门一并撤）。
  const myOrgActs = getOrganizedActivities(meId).filter(a => a.archived !== true);

  // 2026-10-18 成员台组织者投影：个人考勤内容（我的出勤率 / 本人明细 / 补课入口）在页首，
  // 组织者上传位放在个人内容之后；只渲染「由我组织」的活动，不再整页复用组长台的全组视图。
  tc.innerHTML = `
    ${renderTabHeader({ title: '考勤概况', description: '本月我的出勤率与活动出勤明细。' })}
    <div id="visitor-att-mine"></div>
    <div class="card rounded-xl p-5"><div id="visitor-att-list"></div></div>
    ${myOrgActs.length ? `
    <div class="mt-4">
      <div class="text-xs text-gray-500 mb-1.5">由我组织的活动 · 考勤上传位</div>
      <!-- 材料页「成员组织者」深链锚点（visitor.html?tab=attendance#org-host） -->
      <span id="org-host" aria-hidden="true"></span>
      <div id="visitor-org-att-host"></div>
    </div>` : ''}
  `;

  // 挂「由我组织的活动」上传位（实现单一源＝leader/attendance-tab，host 复用；scope=organizer 只投影本人活动）
  const _orgAttHost = document.getElementById('visitor-org-att-host');
  if (_orgAttHost) {
    import('../leader/attendance-tab.js?v=20261029b').then(m => { if (_orgAttHost.isConnected) m.renderContent(ctx, _orgAttHost, { scope: 'organizer' }); });
  }

  // SOP-B-15 当事人可见侧（2026-09-20 批次 116 支书定案「支委会 ＋ 当事人本人」）：
  //   「本月我的出勤率」**只算当前登录人**（服务层只传 meId ⇒ 当事人看不到别人的出勤率）；
  //   偏低时按同一提示线给一句提示——**只作呈现、不触发任何动作**（不生成补课 / 不影响评优 / 不生成处置）。
  const mineEl = document.getElementById('visitor-att-mine');
  if (mineEl) {
    // R2-47：分母 = 本月本人应到场次（冻结 roster / 在册应到名单），不再用「已录记录数」。
    // 未录场次单列「待录入」，避免只录 1 条就显示 100% 或 0%。
    const mine = summarizePersonAttendanceByRoster({ personId: meId, month: thisMonth });
    const hint = POLICY_DEFAULTS.attendance.lowRateHint;
    const mineTone = attendanceRateTone(mine.rate);
    const mineRateCls = mineTone === 'good' ? 'text-green-700'
      : mineTone === 'watch' ? 'text-amber-700'
      : mineTone === 'low' ? 'text-red-600' : 'text-gray-500';
    const mineRateText = mine.rate === null ? '待录入' : `${mine.rate}%`;
    mineEl.innerHTML = meId && mine.total > 0
      ? `<div class="card rounded-xl p-5 mb-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <p class="text-sm font-medium text-gray-800">本月我的出勤率</p>
            <p class="text-sm font-semibold ${mineRateCls}">${mineRateText}</p>
          </div>
          <p class="text-xs text-gray-500 mt-1">出勤 ${mine.present}/${mine.total}（应到人次口径；出勤含已补${mine.unrecorded > 0 ? ` · 未录 ${mine.unrecorded} 场` : ''}）${mine.rate !== null && mine.rate < hint ? ` · 低于提示线 ${hint}%，仅作提示、不触发任何处置` : ''}</p>
        </div>`
      : `<div class="card rounded-xl p-5 mb-3">
          <p class="text-sm font-medium text-gray-800">本月我的出勤率</p>
          ${emptyStateHtml({ variant: 'panel', text: '本月暂无你的考勤记录 · 下一步：活动组织者上传考勤后在此显示' })}
        </div>`;
  }

  // R2-47：场次出勤率一次汇总（应到人次分母），行内只读表，不再用 records.length 当分母。
  const rosterByAct = new Map(
    summarizeAttendanceByActivity({}).rows.map((row) => [row.activityId, row]),
  );

  /** 单条活动考勤行（本人视角；行内「查看个人明细」/「去补课」入口） */
  function rowHtml(act) {
    const records = loadActiveAttendanceRecords().filter(r => r.activityId === act.id);
    // R2-47：场次出勤率 = 出勤（含已补）/ 应到人次（rosterByAct 由服务层汇总，未录场次 coverage=0）。
    const summary = rosterByAct.get(act.id);
    const present = summary ? summary.present : 0;
    const total = summary ? summary.total : 0;
    const rate = summary && summary.coverage > 0 ? summary.rate : null;
    const tone = attendanceRateTone(rate);
    const rateColor = tone === 'good' ? 'text-green-700'
      : tone === 'watch' ? 'text-amber-700'
      : tone === 'low' ? 'text-red-600' : 'text-gray-500';
    // C3（2026-09-12）：分母为 0 或尚未录入时不再显示「0/0 · 0%」（语义错误）——中性占位。
    const rateText = rate === null
      ? (total > 0 ? '出勤 —（待录入）' : '出勤 —（暂无应到名单）')
      : `出勤 ${present}/${total} · ${rate}%${summary.unrecorded > 0 ? `（未录 ${summary.unrecorded} 人）` : ''}`;
    const rateCls = rate === null ? 'text-gray-500' : rateColor;
    const myRecord = meId ? records.find(r => r.personId === meId) : null;
    // R7-33：超期按「活动日 + 补课时限」现算（不再读记录上的 overdue 快照）
    const myOverdue = !!myRecord && isAttendanceOverdue({ ...myRecord, date: myRecord.date || act.date });
    // 本人待补课任务（按活动索引；补课入口出现条件）
    const myMakeup = loadMakeupTasks().find(t => t.personId === meId && t.activityId === act.id && t.status === 'pending');
    return `
      <div class="rounded-lg bg-white" data-act-id="${act.id}">
        <div class="flex items-center justify-between p-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800">${act.title}</p>
            <p class="text-xs text-gray-500">${act.date}</p>
          </div>
          <div class="text-xs font-medium ${rateCls}">${rateText}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2 px-3 pb-3">
          <button type="button" class="btn-neutral visitor-att-detail-btn text-xs px-2.5 py-1" data-act-id="${act.id}" aria-expanded="false" aria-controls="visitor-att-detail-${act.id}" style="cursor:pointer;">查看个人明细</button>
          ${myMakeup ? `<button type="button" class="btn-accent-soft visitor-att-makeup-btn text-xs px-2.5 py-1" data-act-id="${act.id}" style="cursor:pointer;">${myMakeup.proofContent ? '修改补课说明' : '去补课 · 提交补课说明'}</button>` : ''}
          ${(!myRecord || myRecord.status === AttendanceStatus.ABSENT) ? `<button type="button" class="btn-accent-soft visitor-att-appeal-btn text-xs px-2.5 py-1" data-act-id="${act.id}" style="cursor:pointer;">我参加了但没记上</button>` : ''}
        </div>
        <div id="visitor-att-detail-${act.id}" class="visitor-att-detail px-3 pb-3 pt-1 border-t border-gray-50" data-att-detail="${act.id}" hidden>
          <div class="text-[12px] text-gray-600 space-y-0.5">
            <div>我的出勤：${myRecord ? `<span class="font-medium text-gray-800">${ATTENDANCE_STATUS_LABELS[myRecord.status] || myRecord.status}</span>${myRecord.status === AttendanceStatus.ABSENT || myRecord.status === AttendanceStatus.LEAVE ? `（${myOverdue ? '已超期' : '待补'}）` : ''}` : '<span class="text-gray-500">无你的出勤记录</span>'}</div>
            ${myRecord && myRecord.absenceReason ? `<div>未到标因：${absenceReasonLabel(myRecord.absenceReason)}</div>` : ''}
            ${myMakeup ? `<div>补课截止：${myMakeup.deadline || '—'}${myMakeup.status === 'pending' && myMakeup.deadline && myMakeup.deadline < todayLocal() ? '（已逾期，请尽快提交）' : ''}${myMakeup.isMandatory ? '（必修：自学+心得）' : '（选修：自学）'}</div>` : ''}
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
      emptyMessage: '无匹配考勤数据 · 下一步：清除筛选或等待活动考勤上传',
      rowHtml,
    });
  }

  // 查看个人明细（行内展开/收起）——事件委托：引擎筛选会重渲染行
  // 2026-10-25 Task 3：状态由 `aria-expanded` + `hidden` 属性表达（不再用 `.hidden` 类）。
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.visitor-att-detail-btn');
    if (!btn) return;
    const detail = listEl.querySelector(`.visitor-att-detail[data-att-detail="${btn.dataset.actId}"]`);
    if (!detail) return;
    const willOpen = detail.hidden;
    detail.hidden = !willOpen;
    btn.setAttribute('aria-expanded', String(willOpen));
    btn.textContent = willOpen ? '收起明细' : '查看个人明细';
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

  // 材料页深链：本场活动的考勤行滚到视野（找不到则静默）。
  focusActivityAnchor(tc, ctx?.focusActivityId);
}
