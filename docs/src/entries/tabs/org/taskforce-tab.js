// role: [工程师]+[AI]
// 组织委员工作台 Tab：专班管理（T-279 M3 拆分，照 M2 样板）
// 看板式专班全生命周期管理 + 发布招募表单 + 活动进度追踪（原追踪看板融入）。
// 私有状态（PersonPicker 实例）随模块自持；共享数据（taskforce 分类/activities）经 ctx 传入。

import { setState } from '../../../core/state.js?v=20260829m';
import { BranchService } from '../../../services/runtime.js?v=20260829m';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260829m';
import { SignupStore, resolveSignupReviewer, SignupStatus } from '../../../services/signup.js?v=20260829m';
import { AuthStore } from '../../../services/auth.js?v=20260829m';
import { loadTaskforceReviews, addTaskforceReview } from '../../../services/review.js?v=20260829m';
import { loadInspectionRecords, saveInspectionRecords } from '../../../services/inspection.js?v=20260829m';
import { TodoStore, TodoSourceType, TodoCategory, TodoActionType } from '../../../services/todo.js?v=20260829m';
import { NoticeStore } from '../../../services/notice.js?v=20260829m';
import { mockDB, SourceType, ParticipationLevel, ReviewStatus } from '../../../core/domain.js?v=20260829m';
import { persist } from '../../../core/data-adapter.js?v=20260829m';
import { showToast } from '../../../core/utils.js?v=20260829m';
import { solidAccentStyle } from '../../../core/constants.js?v=20260829m';
import { icon } from '../../../core/icons.js?v=20260829m';
import { PersonPicker } from '../../../components/person-picker.js?v=20260829m';
import { renderQueryView } from '../../../components/query-view.js?v=20260829m';
import { badgeHtml } from '../../../components/badge.js?v=20260829m';
import { _personName, getPersonName } from '../../../mock/index.js?v=20260829m';

// 私有状态（随模块自持，不污染入口）
let _recruitPersonPicker = null;
let _tfOrgPicker = null;    // 专班详情：组织者多选
let _tfDeepPicker = null;   // 专班详情：深度参与者多选

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const { accent, accentBorder } = ctx;
  const pending = ctx.pending || [];
  const recruiting = ctx.recruiting || [];
  const active = ctx.active || [];
  const activities = ctx.activities || [];

  const statusLabel = { pending_review: '待审核', recruiting: '招募中', active: '运行中', completed: '已完结', archived: '已归档', draft: '草稿' };
  const statusColor = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', archived: '#6B7280', draft: '#6B7280' };

  // 获取已完结专班（含 completed 解散 / archived 归档），T223 新者在前
  const completed = TaskForceRecordStore.getAll()
    .filter(t => t.status === 'completed' || t.status === 'archived')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  container.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="org-tf-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
    </div>
    <div id="org-tf-kanban"></div>
    <div id="tf-detail-panel" class="hidden card rounded-xl p-5"></div>
    <div id="org-activity-progress" class="mt-4"></div>
  `;

  function renderKanban() {
    const kb = document.getElementById('org-tf-kanban');
    if (!kb) return;
    const q = (document.getElementById('org-tf-search')?.value || '').trim().toLowerCase();
    const fp = q ? pending.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : pending;
    const fr = q ? recruiting.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : recruiting;
    const fa = q ? active.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : active;
    const fc = q ? completed.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : completed;
    kb.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#6366F1;--acc-text-dark:#A5B4FC;color:var(--accent-indigo);">待审核 (${fp.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fp.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待审核专班</p>' :
              fp.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#D97706;--acc-text-dark:#FBBF24;color:#D97706;">招募中 (${fr.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fr.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无招募中专班</p>' :
              fr.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#8B5CF6;color:var(--accent-org-commissioner-light);">运行中 (${fa.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fa.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无运行中专班</p>' :
              fa.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
      </div>
      ${fc.length > 0 ? `
      <details class="card rounded-xl p-0 overflow-hidden">
        <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none tf-section-head" style="--tint:#3B82F6;--acc-text-dark:#60A5FA;color:var(--accent-blue);">已完结 (${fc.length})</summary>
        <div class="p-3 space-y-3">
          ${fc.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
        </div>
      </details>` : ''}
    `;
    bindCardClicks();
    bindStatusButtons();
  }

  document.getElementById('org-tf-search')?.addEventListener('input', renderKanban);
  renderKanban();

  // ── 活动进度区块（原追踪看板内容融入） ──
  _renderActivityProgress(activities, ctx);

  // ── 招募状态流转按钮事件绑定（recruiting → active → archived） ──
  function bindStatusButtons() {
    // 启动专班：recruiting → active
    container.querySelectorAll('.tf-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'recruiting') return;
        const confirmed = window.confirm(`确认启动专班「${tf.name}」？启动后状态转为运行中。`);
        if (!confirmed) return;
        const updated = TaskForceRecordStore.updateStatus(tf.id, 'active');
        if (updated) {
          showToast('success', `专班「${tf.name}」已启动`);
          setState({});
        } else {
          showToast('error', '启动失败，状态流转不合法');
        }
      });
    });
    // 归档专班：active → archived
    container.querySelectorAll('.tf-archive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'active') return;
        const confirmed = window.confirm(`确认归档专班「${tf.name}」？归档后专班转入已归档状态。`);
        if (!confirmed) return;
        const updated = TaskForceRecordStore.updateStatus(tf.id, 'archived');
        if (updated) {
          // 做事即销待办：归档专班 → 销「专班归档」待办
          TodoStore.completeBySource(TodoSourceType.TASKFORCE, tf.id);
          // 2026-08-08 归档闭环：专班归档 → 配套通知随之一并归档，退出工作区
          NoticeStore.archiveBySource('taskforce', tf.id);
          showToast('success', `专班「${tf.name}」已归档`);
          setState({});
        } else {
          showToast('error', '归档失败，状态流转不合法');
        }
      });
    });
    // B 档 CRUD 补全：撤销招募中专班（彻底删除 + 清理关联报名/待办）
    container.querySelectorAll('.tf-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'recruiting') return;
        const confirmed = window.confirm(`确认撤销招募「${tf.name}」？专班将被彻底删除，关联报名与待办一并清理。`);
        if (!confirmed) return;
        TaskForceRecordStore.remove(tfId);
        // 清理关联报名（内存 + 落库同源）
        SignupStore._signups = SignupStore._signups.filter(s => !(s.sourceType === 'taskforce' && s.sourceId === tfId));
        mockDB.signups = [...SignupStore._signups];
        TodoStore.deleteBySource(TodoSourceType.TASKFORCE, tfId);
        persist();
        showToast('success', `专班「${tf.name}」已撤销删除`);
        setState({});
      });
    });
  }

  function bindCardClicks() {
    container.querySelectorAll('.tf-store-card').forEach(card => {
    card.addEventListener('click', () => {
      const tfId = card.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf) return;
      const panel = document.getElementById('tf-detail-panel');
      if (!panel) return;
      panel.classList.remove('hidden');
      const filled = tf.members.filter(m => m.personId).length;

      // ── 工作量汇总区域（运行中/已完结/已归档专班展示） ──
      let workSummaryHtml = '';
      if (tf.status === 'active' || tf.status === 'completed' || tf.status === 'archived') {
        const memberRows = tf.members.filter(m => m.personId).map(m => {
          const contribCount = (m.contributions || []).length;
          const contribList = (m.contributions || []).length > 0
            ? `<ul class="mt-1 space-y-0.5">${m.contributions.map(c =>
                `<li class="text-[12px] text-gray-400 pl-2">${typeof c === 'string' ? c : (c.description || c.title || JSON.stringify(c))}</li>`
              ).join('')}</ul>`
            : '<span class="text-[12px] text-gray-300 pl-2">暂无贡献记录</span>';
          return `
            <div class="py-2 border-b border-gray-50 last:border-b-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
                <div class="flex items-center gap-2">
                  ${badgeHtml(m.role || '深度参与者', 'neutral')}
                  <span class="text-xs text-gray-400">贡献 ${contribCount} 项</span>
                </div>
              </div>
              ${contribList}
            </div>`;
        }).join('');

        workSummaryHtml = `
          <div class="mt-4 pt-3 border-t border-gray-100">
            <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">工作量汇总</h5>
            ${tf.members.filter(m => m.personId).length === 0
              ? '<p class="text-xs text-gray-400">暂无成员</p>'
              : `<div class="rounded-lg px-3 py-1">${memberRows}</div>`
            }
          </div>`;

        // 仅运行中专班显示解散按钮
        if (tf.status === 'active') {
          workSummaryHtml += `
          <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button id="btn-dissolve-tf" class="btn-md btn-md-red">解散专班</button>
          </div>`;
        }
      }

      // ── 子记录区域（P3-4：专班挂载考察+材料2子记录） ──
      let subRecords = { ...mockDB.tfSubRecords };
      const tfSubs = subRecords[tfId] || { inspection: [], materials: [] };

      function saveTfSubs() {
        mockDB.tfSubRecords = { ...mockDB.tfSubRecords, [tfId]: tfSubs };
        persist();
      }

      function renderSubTable(type, items) {
        const label = type === 'inspection' ? '考察记录' : '材料记录';
        const color = type === 'inspection' ? '#D97706' : '#3B82F6';
        const fields = type === 'inspection'
          ? [{ key: 'person', label: '被考察人' }, { key: 'content', label: '考察内容' }, { key: 'result', label: '考察结论' }, { key: 'time', label: '时间' }]
          : [{ key: 'name', label: '材料名称' }, { key: 'author', label: '提交人' }, { key: 'note', label: '备注' }, { key: 'time', label: '时间' }];

        const cellOf = (item, key) => {
          if (key === 'time') return (item.recordedAt || '').slice(0, 16).replace('T', ' ') || '-';
          return item[key] || '-';
        };
        const rows = items.map((item, idx) => `
          <tr class="border-b border-gray-50">
            ${fields.map(f => `<td class="px-2 py-1.5 text-xs text-gray-700">${cellOf(item, f.key)}</td>`).join('')}
            <td class="px-2 py-1.5 text-center"><button class="sub-del-btn text-xs text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <h5 class="text-xs font-bold font-title-cn" style="color:${color}">${label} (${items.length})</h5>
              <button class="sub-add-btn text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors" style="color:${color};border-color:${color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[12px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${fields.map(f => `<th class="px-2 py-1 text-xs font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-xs font-medium text-gray-500 w-12"></th>
                </tr></thead><tbody>${rows}</tbody></table>`
            }
          </div>`;
      }

      const subRecordsHtml = `
        <div class="mt-4 pt-3 border-t border-gray-100">
          <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">子记录</h5>
          ${renderSubTable('inspection', tfSubs.inspection)}
          ${renderSubTable('materials', tfSubs.materials)}
        </div>`;

      // ── T233 报名区（招募中专班：名额 x/y + 名单 + 审核 + 报名入口） ──
      const currentUserId = AuthStore.getCurrentUser()?.personId || '';
      const tfSignups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tfId);
      const tfReviewerId = resolveSignupReviewer('taskforce', tfId);
      const isTfReviewer = !!currentUserId && tfReviewerId === currentUserId;
      const approvedSignups = tfSignups.filter(s => s.status === SignupStatus.APPROVED);
      const pendingSignups = tfSignups.filter(s => s.status === SignupStatus.PENDING);
      const rejectedSignups = tfSignups.filter(s => s.status === SignupStatus.REJECTED);
      const cancelledSignups = tfSignups.filter(s => s.status === SignupStatus.CANCELLED);
      const tfToday = new Date().toISOString().slice(0, 10);
      const tfOpen = tf.status === 'recruiting' &&
        (!tf.deadline || tf.deadline >= tfToday) &&
        (!tf.capacity || filled < tf.capacity);
      const myApplied = tfSignups.some(s => s.personId === currentUserId &&
        (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING));
      const otherSignupTxt = [
        ...rejectedSignups.map(s => `${_personName(s.personId)}（已拒绝）`),
        ...cancelledSignups.map(s => `${_personName(s.personId)}（已取消）`),
      ].join('、');
      let signupSectionHtml = '';
      if (tf.status === 'recruiting' || tf.status === 'active') {
        const signupRows = approvedSignups.map(s => `
          <div class="flex items-center gap-2 py-1.5">
            <span class="text-xs font-medium text-gray-700">${_personName(s.personId)}</span>
            <span class="text-[11px] text-gray-400">${s.role === 'participant' ? '普通参与' : s.role === 'organizer' ? '组织者' : '深度参与'}</span>
            ${s.note ? `<span class="text-[11px] text-gray-400 truncate max-w-[120px]">${s.note}</span>` : ''}
            ${badgeHtml('已通过', 'success')}
          </div>`).join('');
        const pendingRows = isTfReviewer && pendingSignups.length > 0 ? pendingSignups.map(s => `
          <div class="flex items-center gap-2 py-1.5">
            <span class="text-xs font-medium text-gray-700">${_personName(s.personId)}</span>
            <span class="text-[11px] text-gray-400">${s.role === 'participant' ? '普通参与' : s.role === 'organizer' ? '组织者' : '深度参与'}</span>
            ${s.note ? `<span class="text-[11px] text-gray-400 truncate max-w-[120px]">${s.note}</span>` : ''}
            <span class="ml-auto flex items-center gap-1.5">
              <button class="tf-signup-review-btn text-[11px] px-2.5 py-1 rounded-lg text-white hover:opacity-90 transition-colors" data-signup-id="${s.id}" data-approve="1" style="background:#10B981;">通过</button>
              <button class="tf-signup-review-btn text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors" data-signup-id="${s.id}" data-approve="0">拒绝</button>
            </span>
          </div>`).join('') : '';
        const applyBtn = tfOpen && currentUserId && !myApplied
          ? `<button id="tf-signup-apply-btn" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};">报名加入</button>`
          : '';
        signupSectionHtml = `
          <div class="mt-4 pt-3 border-t border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <h6 class="font-title-cn text-xs font-bold text-gray-600">报名名单（${approvedSignups.length}）<span class="text-gray-300 font-normal">· 名额 ${filled}/${tf.capacity}</span></h6>
              ${applyBtn}
            </div>
            ${approvedSignups.length === 0 && !pendingRows
              ? '<p class="text-[12px] text-gray-300 pl-2">暂无报名</p>'
              : `<div>${signupRows}${pendingRows}</div>`}
            ${otherSignupTxt ? `<p class="text-[11px] text-gray-300 mt-1">${otherSignupTxt}</p>` : ''}
          </div>`;
      }

      // ── 专班复盘提交（T-209 改进项①：组织委员提交专班复盘 → 纪检委员批注全栈闭环） ──
      const tfReviewRecord = loadTaskforceReviews().find(r => r.sourceType === 'taskforce' && r.sourceName === tf.name) || null;
      const tfHasReview = !!tfReviewRecord && (tfReviewRecord.reviewContent || tfReviewRecord.reviewStatus !== ReviewStatus.NOT_SUBMITTED);
      let reviewSectionHtml = '';
      if (tf.status === 'active') {
        if (tfHasReview) {
          reviewSectionHtml = `
            <div class="mt-4 pt-3 border-t border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <h6 class="font-title-cn text-xs font-bold text-gray-600">专班复盘</h6>
                <span class="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">已提交</span>
              </div>
              <p class="text-xs text-gray-600 leading-relaxed">${tfReviewRecord.reviewContent || '（已提交，待纪检委员批注）'}</p>
              ${tfReviewRecord.issues?.length ? `<p class="text-[11px] text-amber-600 mt-1">问题：${tfReviewRecord.issues.join('；')}</p>` : ''}
            </div>`;
        } else {
          reviewSectionHtml = `
            <div class="mt-4 pt-3 border-t border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <h6 class="font-title-cn text-xs font-bold text-gray-600">专班复盘</h6>
                <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">未提交</span>
              </div>
              <textarea id="tf-review-content" rows="3" placeholder="专班任务完成情况、工作成果与不足..." class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"></textarea>
              <div class="flex items-center gap-2 mt-2">
                <input id="tf-review-issues" type="text" placeholder="待改进问题（选填，多条用；分隔）" class="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" />
                <button id="btn-submit-tf-review" class="text-xs px-3 py-2 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" style="${solidAccentStyle(accent, accentBorder)};">提交复盘</button>
              </div>
            </div>`;
        }
      }

      panel.innerHTML = `
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">${tf.name}</h3>
        <p class="text-xs text-gray-500 mb-2">${tf.task}</p>
        <div class="flex gap-4 text-xs text-gray-400 mb-3">
          <span>${filled}/${tf.capacity}</span>
          ${tf.deadline ? `<span>${tf.deadline}</span>` : ''}
          <span>发起: ${_personName(tf.initiator)}</span>
        </div>
        <div class="text-xs text-gray-500">成员：${tf.members.map(m => _personName(m.personId)).join('、')}</div>

        <!-- T-190 成员角色内联编辑：主源 members 预填，保存走 syncProjectRoles 三合一 -->
        <div class="mt-4 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <h6 class="font-title-cn text-xs font-bold text-gray-600">成员角色</h6>
            <button id="btn-save-tf-roles" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};">保存角色</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-[12px] text-gray-400 mb-1">组织者</div>
              <div id="tf-org-picker"></div>
            </div>
            <div>
              <div class="text-[12px] text-gray-400 mb-1">深度参与者</div>
              <div id="tf-deep-picker"></div>
            </div>
          </div>
          <p class="text-[12px] text-gray-400 mt-2">提示：此处修改将同步写入专班主源数据，被赋权人将收到通知。</p>
        </div>

        ${workSummaryHtml}
        ${signupSectionHtml}
        ${subRecordsHtml}
        ${reviewSectionHtml}
      `;

      // 初始化成员角色 PersonPicker（预填主源 members）
      if (_tfOrgPicker) { _tfOrgPicker.destroy(); _tfOrgPicker = null; }
      if (_tfDeepPicker) { _tfDeepPicker.destroy(); _tfDeepPicker = null; }
      const tfOrgEl = panel.querySelector('#tf-org-picker');
      const tfDeepEl = panel.querySelector('#tf-deep-picker');
      const tfAssigns = Array.isArray(tf.members) ? tf.members.filter(m => m.personId) : [];
      if (tfOrgEl) {
        _tfOrgPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择组织者',
          accentColor: accent,
          initialIds: tfAssigns.filter(m => m.role === 'organizer').map(m => m.personId),
          onSelect: () => {},
        });
        _tfOrgPicker.render(tfOrgEl);
      }
      if (tfDeepEl) {
        _tfDeepPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择深度参与者',
          accentColor: accent,
          initialIds: tfAssigns.filter(m => m.role === 'deep').map(m => m.personId),
          onSelect: () => {},
        });
        _tfDeepPicker.render(tfDeepEl);
      }

      // 保存成员角色：syncProjectRoles 三合一
      panel.querySelector('#btn-save-tf-roles')?.addEventListener('click', async () => {
        const orgIds = _tfOrgPicker ? _tfOrgPicker.getSelected() : [];
        const deepIds = _tfDeepPicker ? _tfDeepPicker.getSelected() : [];
        const newAssignments = [
          ...orgIds.map(personId => ({ personId, role: 'organizer' })),
          ...deepIds.map(personId => ({ personId, role: 'deep' })),
        ];
        const actorId = AuthStore.getCurrentUser()?.personId;
        const { added, removed } = await AuthStore.syncProjectRoles({ scopeRef: tf.id, assignments: newAssignments, actorId });
        // 做事即销待办：保存成员角色 → 销组织委员「专班赋权」待办
        TodoStore.completeBySource(TodoSourceType.TASKFORCE, tf.id);
        if (added > 0 || removed > 0) {
          showToast('success', `专班成员角色已更新：新增 ${added} 人，移除 ${removed} 人`);
        } else {
          showToast('info', '专班成员角色未发生变化');
        }
        setState({});
      });

      // ── 专班复盘提交事件（T-209 改进项①） ──
      panel.querySelector('#btn-submit-tf-review')?.addEventListener('click', () => {
        const contentEl = panel.querySelector('#tf-review-content');
        const content = (contentEl?.value || '').trim();
        if (!content) { showToast('error', '请填写专班复盘内容'); return; }
        const issues = (panel.querySelector('#tf-review-issues')?.value || '').split(/[；;]/).map(s => s.trim()).filter(Boolean);
        addTaskforceReview({
          id: 'tfrev_' + Date.now(),
          sourceType: 'taskforce',
          sourceName: tf.name,
          taskforceId: tf.id,
          organizerId: currentUserId || 'u_org',
          progress: '进行中',
          overdue: false,
          reviewStatus: ReviewStatus.UPLOADED,
          reviewContent: content,
          issues,
          submittedAt: new Date().toISOString(),
        });
        showToast('success', '专班复盘已提交，待纪检委员批注');
        card.click();
      });

      // ── 解散专班按钮事件 ──
      const dissolveBtn = panel.querySelector('#btn-dissolve-tf');
      if (dissolveBtn) {
        dissolveBtn.addEventListener('click', () => _dissolveTaskforce(tf));
      }

      // ── T233 报名区事件：报名加入 + 审核（通过/拒绝） ──
      panel.querySelector('#tf-signup-apply-btn')?.addEventListener('click', () => {
        const res = SignupStore.apply({ sourceType: 'taskforce', sourceId: tfId, personId: currentUserId, role: 'participant', note: '' });
        if (!res.ok) { showToast('error', res.reason || '报名失败'); return; }
        showToast('success', '报名成功，已加入专班名单');
        setState({});
      });
      panel.querySelectorAll('.tf-signup-review-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const res = await SignupStore.review(btn.dataset.signupId, { approve: btn.dataset.approve === '1', reviewer: currentUserId });
          if (!res.ok) { showToast('error', res.reason || '操作失败'); return; }
          showToast('success', btn.dataset.approve === '1' ? '已通过该报名' : '已拒绝该报名');
          setState({});
        });
      });

      // ── 子记录添加/删除事件（P3-4）— 内联表单替代 prompt，考察同步正式考察库 ──
      panel.querySelectorAll('.sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const panelEl = btn.closest('.mt-3');
          const existing = panelEl?.querySelector('.sub-inline-form');
          if (existing) { existing.remove(); return; }

          const resultOpts = ['考察合格', '待观察', '需补材料'];
          let formHtml = '';
          if (type === 'inspection') {
            formHtml = `
              <div class="sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加考察记录（同步正式考察库，待纪检委员确认）</div>
                <div class="mb-2 sub-picker"></div>
                <textarea class="f-content input-flat text-xs w-full resize-none mb-2" rows="2" placeholder="考察内容描述（必填）"></textarea>
                <select class="f-result input-flat text-xs w-full mb-2">${resultOpts.map(r => `<option>${r}</option>`).join('')}</select>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">保存</button>
                </div>
              </div>`;
          } else {
            formHtml = `
              <div class="sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加材料记录</div>
                <input class="f-name input-flat text-xs w-full mb-2" placeholder="材料名称（必填）">
                <input class="f-author input-flat text-xs w-full mb-2" placeholder="提交人（选填）">
                <input class="f-note input-flat text-xs w-full mb-2" placeholder="备注（选填）">
                <div class="flex gap-2 justify-end">
                  <button type="button" class="sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">保存</button>
                </div>
              </div>`;
          }

          panelEl.insertAdjacentHTML('beforeend', formHtml);
          const form = panelEl.querySelector('.sub-inline-form');

          if (type === 'inspection') {
            const picker = new PersonPicker({ mode: 'multi', placeholder: '选择被考察人', accentColor: accent, onSelect: () => {} });
            picker.render(form.querySelector('.sub-picker'));
            form._picker = picker;
          }

          form.querySelector('.sub-cancel-btn').addEventListener('click', () => {
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
          });

          form.querySelector('.sub-save-btn').addEventListener('click', () => {
            if (type === 'inspection') {
              const content = form.querySelector('.f-content').value.trim();
              if (!content) { showToast('error', '请填写考察内容'); return; }
              const ids = form._picker ? form._picker.getSelected() : [];
              if (ids.length === 0) { showToast('error', '请选择被考察人'); return; }
              const result = form.querySelector('.f-result').value;
              const newRecords = [];
              ids.forEach(pid => {
                tfSubs.inspection.push({ person: getPersonName(pid), personId: pid, content, result, recordedBy: currentUserId || 'u_org', recordedAt: new Date().toISOString() });
                // P1-5 语义修复：考察内容入 content，role 存角色职责标签
                newRecords.push({
                  id: 'insp_' + Date.now() + '_' + pid,
                  sourceType: SourceType.TASKFORCE, activityId: null, sourceName: tf.name,
                  personId: pid, level: ParticipationLevel.DEEP_PARTICIPATE,
                  content, role: '深度参与者',
                  recordedBy: 'u_exec', recordedAt: new Date().toISOString(), status: 'pending',
                });
              });
              const all = loadInspectionRecords();
              saveInspectionRecords([...all, ...newRecords]);
              showToast('success', `已添加 ${ids.length} 条考察记录并同步正式考察库`);
            } else {
              const name = form.querySelector('.f-name').value.trim();
              if (!name) { showToast('error', '请填写材料名称'); return; }
              tfSubs.materials.push({
                name,
                author: form.querySelector('.f-author').value.trim(),
                note: form.querySelector('.f-note').value.trim(),
                recordedBy: currentUserId || 'u_org',
                recordedAt: new Date().toISOString(),
              });
              showToast('success', '已添加');
            }
            saveTfSubs();
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
            // 重新渲染详情面板
            card.click();
          });
        });
      });

      panel.querySelectorAll('.sub-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          tfSubs[type].splice(idx, 1);
          saveTfSubs();
          // 重新渲染详情面板
          card.click();
        });
      });
    });
  });
  }
}

// ════════════════════════════════════════════════════════════════
//  专班解散流程（P1-5）
// ════════════════════════════════════════════════════════════════

function _showDissolveBlockModal(tf, missing) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:var(--radius-lg);padding:20px 22px;max-width:360px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';
  card.innerHTML =
    `<p class="font-bold text-sm text-gray-800 mb-1">无法解散「${tf.name}」</p>`
    + '<p class="text-xs text-gray-500 mb-3">以下产出未齐，补齐后方可解散：</p>'
    + '<ul class="space-y-1.5 mb-4">'
    + missing.map(m =>
        `<li class="text-xs text-red-600 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>${m}</li>`
      ).join('')
    + '</ul>'
    + '<button class="text-xs text-white px-3 py-1.5 rounded-lg w-full transition-colors" style="background:#CE1126;">知道了</button>';
  card.querySelector('button').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

async function _dissolveTaskforce(tf) {
  if (!tf || tf.status !== 'active') return;

  // T-224 §7 专班关闭条件：考察确认 + 工作量报告；产出缺失阻塞解散，缺失项明确显示
  const tfInspections = loadInspectionRecords().filter(r => r.sourceType === SourceType.TASKFORCE && r.sourceName === tf.name);
  const inspPending = tfInspections.filter(r => r.status !== 'confirmed').length;
  const hasWorkload = (tf.members || []).some(m => (m.contributions || []).length > 0);
  const missing = [];
  if (tfInspections.length === 0) missing.push('专班考察记录（尚未上传考察）');
  else if (inspPending > 0) missing.push(`考察确认（${inspPending} 条待纪检确认）`);
  if (!hasWorkload) missing.push('工作量报告（成员无产出记录）');

  if (missing.length > 0) {
    _showDissolveBlockModal(tf, missing);
    return;
  }

  const confirmed = window.confirm(`确定解散专班「${tf.name}」？解散后将自动生成工作量汇总报告并回收所有相关赋权记录。`);
  if (!confirmed) return;

  // 1. 主源：清空 members（含角色）并置状态 completed
  const assignedMembers = (tf.members || []).filter(m => m.personId && (m.role === 'organizer' || m.role === 'deep'));
  const updated = TaskForceRecordStore.update(tf.id, { status: 'completed', members: [] });
  if (!updated) {
    showToast('error', '解散失败：专班记录未找到');
    return;
  }

  // 2. 审计快照：为原 organizer/deep 成员追加 revoke 记录（只增不改）
  const actorId = AuthStore.getCurrentUser()?.personId;
  const revokedCount = AuthStore.recordProjectRevokes(
    tf.id,
    assignedMembers.map(m => ({ personId: m.personId, role: m.role })),
    actorId
  );

  // 3. toast 反馈
  const revokeMsg = revokedCount > 0
    ? `，已回收 ${revokedCount} 条赋权记录`
    : '';
  showToast('success', `专班「${tf.name}」已解散${revokeMsg}`);

  // 4. 刷新看板
  setState({});
}

function _renderTfCard(t, statusLabel, statusColor) {
  const filled = t.members.filter(m => m.personId).length;
  const color = statusColor[t.status] || '#6B7280';
  // 内联徽章深色亮色映射（深色下提亮一档，由 html.theme-dark [style*="--acc-bg-dark"] 规则应用）
  const darkColor = { pending_review: '#A5B4FC', recruiting: '#FBBF24', active: '#34D399', completed: '#60A5FA', archived: '#94A3B8', draft: '#94A3B8' }[t.status] || '#94A3B8';
  // 招募状态流转按钮：recruiting → active → archived
  let statusBtn = '';
  if (t.status === 'recruiting') {
    // B 档 CRUD 补全：招募中可撤销（彻底删除），误建/取消招募的专班可清理
    statusBtn = `<div class="flex gap-2 mt-2">
      <button class="tf-start-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();">启动专班</button>
      <button class="tf-delete-btn text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">撤销</button>
    </div>`;
  } else if (t.status === 'active') {
    statusBtn = `<button class="tf-archive-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">归档专班</button>`;
  }
  return `
    <div class="kanban-card p-4 rounded-xl bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="badge" style="background:${color}15;color:${color};--acc-bg-dark:${darkColor}24;--acc-text-dark:${darkColor};">${statusLabel[t.status] || t.status}</span>
      </div>
      <p class="text-xs text-gray-500 mb-2 line-clamp-2">${t.task}</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>${filled}/${t.capacity}</span>
        ${t.deadline ? `<span>${t.deadline}</span>` : ''}
      </div>
      ${statusBtn}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  发布招募表单面板（入口 extraRightHtml「发布招募」按钮消费）
// ════════════════════════════════════════════════════════════════

export function openRecruitForm(ctx) {
  const { accent, accentBorder } = ctx;

  // 移除已有面板
  _closeRecruitForm();

  const overlay = document.createElement('div');
  overlay.id = 'recruit-form-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeRecruitForm();
  });

  const panel = document.createElement('div');
  panel.className = 'card rounded-xl';
  panel.style.cssText = 'width:560px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto;padding:24px;position:relative;';
  // 统一表单基建（2026-08-05 书记裁决「统一表单基建」）：与「写入活动」表单对齐
  // input-flat / text-xs 标签 / 红色必填星号 / 同规格按钮
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h3 class="font-title-cn text-sm font-semibold text-gray-800">发布专班招募</h3>
      <button id="recruit-form-close" type="button" style="width:32px;height:32px;border-radius:var(--radius-sm);border:none;background:var(--neutral-100);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">
        ${icon('close', { stroke: 'var(--neutral-500)', className: 'w-3.5 h-3.5' })}
      </button>
    </div>

    <form id="recruit-form" autocomplete="off">
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">专班名称 <span class="text-red-500">*</span></label>
        <input type="text" id="rf-name" required placeholder="如：宣传专班（第三期）" class="input-flat w-full">
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">任务描述 <span class="text-red-500">*</span></label>
        <textarea id="rf-task" required rows="3" placeholder="描述专班的核心任务与目标" class="input-flat w-full"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">所需人数 <span class="text-red-500">*</span></label>
          <input type="number" id="rf-capacity" required min="1" max="50" placeholder="如：5" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">截止日期 <span class="text-red-500">*</span></label>
          <input type="date" id="rf-deadline" required class="input-flat w-full">
        </div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">技能要求 <span class="text-gray-300">（选填）</span></label>
        <input type="text" id="rf-skills" placeholder="如：视频剪辑、文案撰写" class="input-flat w-full">
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">周期起始 <span class="text-gray-300">（选填）</span></label>
          <input type="date" id="rf-period-start" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">周期结束 <span class="text-gray-300">（选填）</span></label>
          <input type="date" id="rf-period-end" class="input-flat w-full">
        </div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">初始成员 <span class="text-gray-300">（选填）</span></label>
        <div id="rf-members-picker"></div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">说明 <span class="text-gray-300">（选填）</span></label>
        <textarea id="rf-notes" rows="2" placeholder="补充说明" class="input-flat w-full"></textarea>
      </div>

      <div class="mb-4">
        <div class="wp-collapse-toggle text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none" onclick="this.nextElementSibling.classList.toggle('hidden')">自动发布通知（选填，发布专班后立即通知全体成员）</div>
        <div class="mt-2 space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题</label>
            <input type="text" id="rf-notice-title" class="input-flat w-full" placeholder="默认使用专班名称">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容</label>
            <textarea id="rf-notice-content" rows="3" class="input-flat w-full" placeholder="如：宣传专班（第三期）招募中，截止 8月20日，欢迎报名参与。"></textarea>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button type="button" id="recruit-form-cancel" class="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
        <button type="submit" class="text-sm px-4 py-[7px] rounded-lg text-white hover:opacity-90 transition-opacity font-medium" style="${solidAccentStyle(accent, accentBorder)};">发布</button>
      </div>
    </form>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 关闭按钮
  panel.querySelector('#recruit-form-close').addEventListener('click', () => _closeRecruitForm());
  panel.querySelector('#recruit-form-cancel').addEventListener('click', () => _closeRecruitForm());

  // 初始化 PersonPicker
  const pickerContainer = panel.querySelector('#rf-members-picker');
  _recruitPersonPicker = new PersonPicker({
    mode: 'multi',
    placeholder: '选择初始成员（选填）',
    accentColor: accent,
    onSelect: () => {},
  });
  _recruitPersonPicker.render(pickerContainer);

  // 表单提交
  panel.querySelector('#recruit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    _submitRecruitForm(ctx);
  });
}

function _closeRecruitForm() {
  if (_recruitPersonPicker) {
    _recruitPersonPicker.destroy();
    _recruitPersonPicker = null;
  }
  const overlay = document.getElementById('recruit-form-overlay');
  if (overlay) overlay.remove();
}

function _submitRecruitForm(ctx) {
  const name = document.getElementById('rf-name')?.value?.trim();
  const task = document.getElementById('rf-task')?.value?.trim();
  const capacity = parseInt(document.getElementById('rf-capacity')?.value, 10);
  const deadline = document.getElementById('rf-deadline')?.value || '';
  const skills = document.getElementById('rf-skills')?.value?.trim() || '';
  const periodStart = document.getElementById('rf-period-start')?.value || '';
  const periodEnd = document.getElementById('rf-period-end')?.value || '';
  const notes = document.getElementById('rf-notes')?.value?.trim() || '';

  // 预拟通知（选填，2026-08-05 书记裁决「表单内预拟通知·只跑一次」）
  const noticeTitle = document.getElementById('rf-notice-title')?.value?.trim();
  const noticeContent = document.getElementById('rf-notice-content')?.value?.trim();

  // 校验必填项
  if (!name) { showToast('error', '请填写专班名称'); return; }
  if (!task) { showToast('error', '请填写任务描述'); return; }
  if (!capacity || capacity < 1) { showToast('error', '请填写有效的所需人数'); return; }
  if (!deadline) { showToast('error', '请选择截止日期'); return; }

  // 获取初始成员（统一英文编码 role: 'deep'，T-190 修复 P1-2 中英文混用）
  const selectedIds = _recruitPersonPicker ? _recruitPersonPicker.getSelected() : [];
  const members = selectedIds.map(pid => ({
    personId: pid,
    role: 'deep',
    contributions: [],
  }));

  // 构建专班记录
  const record = {
    name,
    task,
    status: 'recruiting',
    manager: 'p11',
    initiator: 'p11',
    members,
    capacity,
    deadline,
    activityId: null, // T-190 修复：招募表单无活动关联字段，原 activityId 未声明抛 ReferenceError
    createdAt: new Date().toISOString().slice(0, 10),
  };

  // 附加可选字段
  if (skills) record.skills = skills;
  if (periodStart && periodEnd) record.period = `${periodStart} ~ ${periodEnd}`;
  if (notes) record.notes = notes;

  try {
    const created = TaskForceRecordStore.add(record);
    // 做事即销待办：专班创建即完成赋权 → 销组织委员「专班赋权」待办
    if (created) TodoStore.completeBySource(TodoSourceType.TASKFORCE, created.id);
    // T-190 同步赋权：追加审计快照 + 通知初始成员（主源已由招募写入，原则7 不重复填写）
    if (created && members.length > 0) {
      const actorId = AuthStore.getCurrentUser()?.personId;
      AuthStore.recordProjectGrants(created.id, members, actorId);
    }
    // T-304 C3 专班发起审批环节：组织委员发起 → 自动派生书记审批待办（书记批准/驳回写专班记录）
    if (created) {
      TodoStore.create({
        title: `审批专班发起「${name}」`,
        description: `组织委员发起专班招募（任务：${task || '—'}），请书记审批是否批准发起`,
        role: 'secretary',
        category: TodoCategory.REVIEW,
        priority: 'urgent',
        deadline: deadline || null,
        sourceType: TodoSourceType.TASKFORCE,
        sourceId: created.id,
        actionType: TodoActionType.REVIEW,
        actionKey: 'taskforce-approval',
        actionData: { taskforceId: created.id, taskforceName: name },
        flow: '专班发起 → 书记审批 → 正式招募',
      });
    }
    showToast('success', `专班「${name}」发布成功，已提交书记审批`);

    // 预拟通知「只跑一次」（2026-08-05）：仅在表单填写了标题时发布一条通知，
    // NoticeStore.add 单次调用，通知→待办仅派生一次，不重复发。
    if (noticeTitle) {
      NoticeStore.add({
        title: noticeTitle,
        content: noticeContent || `专班「${name}」招募中，截止 ${deadline}，欢迎报名参与。`,
        priority: 'normal',
        publishDate: new Date().toISOString().slice(0, 10),
        expireDate: deadline,
        targetModule: 'workspace',
        targetType: 'taskforce',
        targetId: created.id,
        read: false,
      });
      showToast('success', '已自动发布通知');
    }

    _closeRecruitForm();
    // 刷新看板
    setState({});
  } catch (err) {
    console.error('[recruit-form] 创建专班失败：', err);
    showToast('error', '发布失败，请重试');
  }
}

// ── 活动进度区块（融入专班管理tab，原追踪看板） ──
function _renderActivityProgress(activities, ctx) {
  const progressEl = document.getElementById('org-activity-progress');
  if (!progressEl) return;

  const typeOptions = [...new Set(activities.map(a => a.type).filter(Boolean))].map(t => ({ value: t, label: t }));
  const queryData = activities.map(a => ({ ...a, archived: String(a.status === 'completed') }));

  progressEl.innerHTML = `
    <div class="card rounded-xl p-5">
      <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">活动进度</h3>
      <div class="text-xs text-gray-500 mb-3">追踪所有已发布活动的执行状态</div>
      <div id="org-activity-query"></div>
    </div>
  `;

  const queryContainer = document.getElementById('org-activity-query');
  if (!queryContainer) return;

  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索活动名称...',
    searchKey: 'title',
    filters: [
      { key: 'type', label: '活动类型', options: typeOptions },
      { key: 'archived', label: '状态', options: [
        { value: '', label: '全部' },
        { value: 'false', label: '进行中' },
        { value: 'true', label: '已归档' },
      ]},
    ],
    data: queryData,
    renderRow: (a) => {
      const isArchived = a.status === 'completed';
      const statusTag = isArchived
        ? badgeHtml('已归档', 'neutral')
        : badgeHtml('已发布', 'success');
      const completeBtn = !isArchived
        ? `<button class="track-complete-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors" data-act-id="${a.id}">确认完成</button>`
        : '';
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white transition-colors">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium ${isArchived ? 'text-gray-500 line-through' : 'text-gray-800'}">${a.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${a.date || ''}${a.type ? ' · ' + a.type : ''}${a.location ? ' · ' + a.location : ''}</div>
          </div>
          <div class="flex items-center gap-2">
            ${statusTag}
            ${completeBtn}
          </div>
        </div>
      `;
    },
    emptyMessage: '无匹配活动',
    accentColor: ctx.accent,
    sortKey: 'date',
    sortDir: 'desc',
    pageSize: 10,      // 活动无上限增长 → 分页（2026-08-07）
    pageParam: 'opage',
  });

  // 绑定确认完成按钮
  queryContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.track-complete-btn');
    if (!btn) return;
    const actId = btn.dataset.actId;
    const activity = activities.find(a => a.id === actId);
    if (!activity) return;
    const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归档。`);
    if (!confirmed) return;
    BranchService.updateActivity(actId, { status: 'completed' });
    persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
    showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
    setState({});
  });
}
