// role: [工程师]+[AI]
// 组织委员工作台 Tab：专班管理（T-279 M3 拆分，照 M2 样板）
// 看板式专班全生命周期管理 + 发布招募表单 + 活动进度追踪（原追踪看板融入）。
// 私有状态（PersonPicker 实例）随模块自持；共享数据（taskforce 分类/activities）经 ctx 传入。

import { setState } from '../../../core/state.js?v=20260908d';
import { BranchService } from '../../../services/runtime.js?v=20260908d';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260908d';
import { SignupStore, resolveSignupReviewer, SignupStatus } from '../../../services/signup.js?v=20260908d';
import { AuthStore } from '../../../services/auth.js?v=20260908d';
import { loadTaskforceReviews, addTaskforceReview } from '../../../services/review.js?v=20260908d';
import { loadInspectionRecords } from '../../../services/inspection.js?v=20260908d'; // IA-C3 收敛单写入口 2026-09-06：saveInspectionRecords 已随考察写入口移除
import { TodoStore, TodoSourceType, TodoCategory, TodoActionType } from '../../../services/todo.js?v=20260908d';
import { NoticeStore } from '../../../services/notice.js?v=20260908d';
import { mockDB, SourceType, ReviewStatus } from '../../../core/domain.js?v=20260908d'; // IA-C3 收敛单写入口 2026-09-06：ParticipationLevel 随考察写入口移除
import { persist } from '../../../core/data-adapter.js?v=20260908d';
import { showToast } from '../../../core/utils.js?v=20260908d';
import { solidAccentStyle } from '../../../core/constants.js?v=20260908d';
import { icon } from '../../../core/icons.js?v=20260908d';
import { PersonPicker } from '../../../components/person-picker.js?v=20260908d';
import { recordFormShell } from '../../../components/forms.js?v=20260908d';
import { renderQueryView } from '../../../components/query-view.js?v=20260908d';
import { badgeHtml } from '../../../components/badges.js?v=20260908d';
import { getPersonName } from '../../../services/person.js?v=20260908d';

// 私有状态（随模块自持，不污染入口）
let _recruitPersonPicker = null;
let _tfOrgPicker = null;    // 专班详情：组织者多选
let _tfDeepPicker = null;   // 专班详情：深度参与者多选
let _tfContribPicker = null; // 专班详情：成员贡献录入多选（立项③阶段b）

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const { accent, accentBorder } = ctx;
  const pending = ctx.pending || [];
  const recruiting = ctx.recruiting || [];
  const active = ctx.active || [];
  const activities = ctx.activities || [];

  // 附录⑩ B批（R3-1/R3-2）：状态词对齐「支委会表决」语义——pending_review=待支委会表决；
  // 已完结桶含 completed / archived / dissolved（解散表决通过后置 dissolved，见服务层 applyCommitteeDecision）
  const statusLabel = { pending_review: '待支委会表决', recruiting: '招募中', active: '运行中', completed: '已完结', archived: '已归档', dissolved: '已解散', draft: '草稿' };
  const statusColor = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', archived: '#6B7280', dissolved: '#DC2626', draft: '#6B7280' };

  // 获取已完结专班（含 completed / archived 归档 / dissolved 表决通过解散），T223 新者在前
  const completed = TaskForceRecordStore.getAll()
    .filter(t => t.status === 'completed' || t.status === 'archived' || t.status === 'dissolved')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  container.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="org-tf-search" class="input-flat flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
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
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:#6366F1;--acc-text-dark:#A5B4FC;color:var(--accent-indigo);">待支委会表决 (${fp.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fp.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待支委会表决专班</p>' :
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
    // 撤销/删除专班（彻底删除 + 清理关联报名/待办）
    // 覆盖状态：recruiting（撤销招募）/ pending_review（待支委会表决撤销）/ draft（未通过草稿删除）
    container.querySelectorAll('.tf-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf) return;
        if (tf.status !== 'recruiting' && tf.status !== 'pending_review' && tf.status !== 'draft') return;
        const confirmMsg = tf.status === 'recruiting'
          ? `确认撤销招募「${tf.name}」？专班将被彻底删除，关联报名与待办一并清理。`
          : tf.status === 'pending_review'
            ? `确认撤销「${tf.name}」？专班仍在待支委会表决状态，撤销后将被彻底删除并清理关联待办。`
            : `确认删除「${tf.name}」？该专班为表决未通过草稿，删除后不可恢复。`;
        const confirmed = window.confirm(confirmMsg);
        if (!confirmed) return;
        TaskForceRecordStore.remove(tfId);
        // 清理关联报名（内存 + 落库同源）
        SignupStore._signups = SignupStore._signups.filter(s => !(s.sourceType === 'taskforce' && s.sourceId === tfId));
        mockDB.signups = [...SignupStore._signups];
        TodoStore.deleteBySource(TodoSourceType.TASKFORCE, tfId);
        persist();
        showToast('success', `专班「${tf.name}」已删除`);
        setState({});
      });
    });
    // 附录⑩ B批（R3-1）：被驳回专班（draft，表决未通过退回草稿）→ 修改后重新报送支委会表决
    // （组织侧无编辑表单，最小合理改法=清理表决痕迹后重新报送；内容修改可先删除重建）
    container.querySelectorAll('.tf-resubmit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'draft') return;
        if (tf.committeeRequest && tf.committeeRequest.status === 'pending') { showToast('info', '该专班已报送支委会表决，等待审议'); return; }
        const currentUserId = AuthStore.getCurrentUser()?.personId || '';
        const confirmed = window.confirm(`确认重新报送「${tf.name}」发起？将再次提交支委会表决。`);
        if (!confirmed) return;
        const updated = TaskForceRecordStore.submitForCommittee(tf.id, { kind: 'initiate', by: currentUserId, note: '表决未通过退回草稿后，修改重新报送' });
        if (!updated) { showToast('error', '重新报送失败，专班记录不存在或状态不允许'); return; }
        showToast('success', `专班「${tf.name}」已重新报送支委会表决`);
        setState({});
      });
    });
  }

  function bindCardClicks() {
    container.querySelectorAll('.tf-store-card').forEach(card => {
      card.addEventListener('click', () => _openTfDetail(card.dataset.tfId, { accent, accentBorder }));
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  E-1 专班详情分块刷新（2026-09-09 乙部评议待办 E-1）
//  判例：#wf-form-zone 表单区独立于列表容器（workforce-panel）；纪检考勤录入 CSS 保态。
//  详情面板 = 只读信息/状态区（壳层）+ 各写块独立容器（#tf-sec-*）。
//  任一写块操作成功只刷新对应容器（_refreshTfBlock），不再 card.click() 整详情重建——
//  其它写块内未提交草稿（专班复盘内容/进度说明/代录说明/材料表单/角色选择）不被清除；
//  写块提交成功仅重置自身。数据回写与留痕走既有服务层（TaskForceRecordStore /
//  addTaskforceReview / mockDB.tfSubRecords + persist），不与后端写冲突，服务层零改动。
// ════════════════════════════════════════════════════════════════

let _tfOpenId = null;
let _tfDetailCtx = null;

function _tfById(tfId) {
  return TaskForceRecordStore.getAll().find(r => r.id === tfId) || null;
}

function _tfAssignsOf(tf) {
  return Array.isArray(tf.members) ? tf.members.filter(m => m && m.personId) : [];
}

// 贡献条目兼容两种形态：种子字符串摘要 / B批对象条目 {id,desc,by,at,verifiedStatus?}
function _tfContribTextOf(c) {
  return typeof c === 'string' ? c : (c && (c.desc || c.description || c.title)) || (typeof c === 'string' ? c : JSON.stringify(c));
}
function _tfContribMetaOf(c) {
  if (!c || typeof c === 'string') return '';
  const bits = [];
  if (c.by) bits.push(getPersonName(c.by));
  if (c.at) bits.push(String(c.at).slice(0, 16).replace('T', ' '));
  return bits.length ? ' · ' + bits.join(' ') : '';
}
// B批 R3-3：对象条目核验态徽标（字符串摘要=历史只读，无核验态）
function _tfContribStatusOf(c) {
  if (!c || typeof c !== 'object' || !c.id) return '';
  if (c.verifiedStatus === 'approved') {
    return `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">已入档${c.verifiedBy ? ' · 核验人 ' + getPersonName(c.verifiedBy) : ''}</span>`;
  }
  if (c.verifiedStatus === 'rejected') {
    return `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">已退回${c.rejectNote ? ' · ' + c.rejectNote : ''}</span>`;
  }
  return '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">待核</span>';
}

/** 打开专班详情：只读信息/状态区壳层 + 各写块独立容器（分块渲染） */
function _openTfDetail(tfId, ctx) {
  const panel = document.getElementById('tf-detail-panel');
  const tf = _tfById(tfId);
  if (!panel || !tf) return;
  _tfOpenId = tfId;
  _tfDetailCtx = ctx;
  panel.classList.remove('hidden');

  const filled = _tfAssignsOf(tf).length;
  panel.innerHTML = `
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">${tf.name}</h3>
    <p class="text-xs text-gray-500 mb-2">${tf.task}</p>
    <div class="flex gap-4 text-xs text-gray-400 mb-3">
      <span>${filled}/${tf.capacity}</span>
      ${tf.deadline ? `<span>${tf.deadline}</span>` : ''}
      <span>发起: ${getPersonName(tf.initiator)}</span>
    </div>
    <div class="text-xs text-gray-500">成员：${_tfAssignsOf(tf).map(m => getPersonName(m.personId)).join('、')}</div>

    <!-- E-1 分块刷新：只读信息/状态区之上的各写块独立容器；操作成功仅刷对应容器 -->
    <div id="tf-sec-roles"></div>
    <div id="tf-sec-work"></div>
    <div id="tf-sec-contrib"></div>
    <div id="tf-sec-signup"></div>
    <div id="tf-sec-subs"></div>
    <div id="tf-sec-progress"></div>
    <div id="tf-sec-review"></div>
  `;

  _tfRenderRolesBlock(panel, tf, ctx);
  _tfRenderWorkBlock(panel, tf, ctx);
  _tfRenderContribBlock(panel, tf, ctx);
  _tfRenderSignupBlock(panel, tf, ctx);
  _tfRenderSubsBlock(panel, tf, ctx);
  _tfRenderProgressBlock(panel, tf, ctx);
  _tfRenderReviewBlock(panel, tf, ctx);
}

/** 只重渲染指定写块容器（数据源重读 store，保证与服务层落库一致） */
function _refreshTfBlock(blockId) {
  const tf = _tfOpenId ? _tfById(_tfOpenId) : null;
  const panel = document.getElementById('tf-detail-panel');
  if (!panel || !tf || !_tfDetailCtx) return;
  if (!panel.querySelector('#' + blockId)) return;
  const ctx = _tfDetailCtx;
  if (blockId === 'tf-sec-roles') _tfRenderRolesBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-work') _tfRenderWorkBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-contrib') _tfRenderContribBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-signup') _tfRenderSignupBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-subs') _tfRenderSubsBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-progress') _tfRenderProgressBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-review') _tfRenderReviewBlock(panel, tf, ctx);
}

// ── 写块①成员角色（独立容器；保存仍走 setState 整页刷新——成员主源变更影响看板名额） ──
function _tfRenderRolesBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-roles');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  if (_tfOrgPicker) { _tfOrgPicker.destroy(); _tfOrgPicker = null; }
  if (_tfDeepPicker) { _tfDeepPicker.destroy(); _tfDeepPicker = null; }

  mount.innerHTML = `
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
      <p class="text-[12px] text-gray-400 mt-2">提示：修改将同步到专班，被赋权人将收到通知。</p>
    </div>`;

  const tfAssigns = _tfAssignsOf(tf);
  const tfOrgEl = mount.querySelector('#tf-org-picker');
  const tfDeepEl = mount.querySelector('#tf-deep-picker');
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

  // 保存成员角色：syncProjectRoles 三合一（写主源 + 快照 + 通知）——行为不变
  mount.querySelector('#btn-save-tf-roles')?.addEventListener('click', async () => {
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
}

// ── 写块②工作量汇总/逐条核验（只含核验动作；代录表单独立为写块③） ──
function _tfRenderWorkBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-work');
  if (!mount) return;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  let html = '';
  if (tf.status === 'active' || tf.status === 'completed' || tf.status === 'archived') {
    const memberRows = _tfAssignsOf(tf).map(m => {
      const contribCount = (m.contributions || []).length;
      const contribList = (m.contributions || []).length > 0
        ? `<ul class="mt-1 space-y-0.5">${m.contributions.map(c =>
            `<li class="text-[12px] text-gray-400 pl-2">${_tfContribTextOf(c)}<span class="text-[10px] text-gray-300">${_tfContribMetaOf(c)}</span><span class="ml-1 align-middle">${_tfContribStatusOf(c)}</span></li>`
          ).join('')}</ul>`
        : '<span class="text-[12px] text-gray-300 pl-2">暂无贡献记录</span>';
      return `
        <div class="py-2 border-b border-gray-50 last:border-b-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-700">${getPersonName(m.personId)}</span>
            <div class="flex items-center gap-2">
              ${badgeHtml(m.role || '深度参与者', 'neutral')}
              <span class="text-xs text-gray-400">贡献 ${contribCount} 项</span>
            </div>
          </div>
          ${contribList}
        </div>`;
    }).join('');
    html += `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">工作量汇总</h5>
        ${_tfAssignsOf(tf).length === 0
          ? '<p class="text-xs text-gray-400">暂无成员</p>'
          : `<div class="rounded-lg px-3 py-1">${memberRows}</div>`
        }
      </div>`;

    if (tf.status === 'active') {
      // 当前待支委会表决请求（发起/解散均置 committeeRequest，B批 R3-1/R3-2）
      const tfPendReq = (tf.committeeRequest && tf.committeeRequest.status === 'pending') ? tf.committeeRequest : null;
      // B批 R3-2：解散走支委会表决——报送后状态不变（active），表决通过才落 dissolved
      const dissolveArea = (tfPendReq && tfPendReq.kind === 'dissolve')
        ? `<div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <span class="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-600">待解散表决</span>
            <span class="text-[11px] text-gray-400">${tfPendReq.by ? getPersonName(tfPendReq.by) : '组织委员'} ${String(tfPendReq.at || '').slice(0, 16).replace('T', ' ')} 已报送支委会表决</span>
          </div>`
        : `<div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button id="btn-dissolve-tf" class="btn-md btn-md-red">报送解散表决</button>
          </div>`;
      html += dissolveArea;

      // B批 R3-3：成员贡献=成员填报 → 组织委员逐条核（同意入档 / 退回补料，留痕）
      const contribVerifyRows = [];
      (tf.members || []).forEach(m => {
        if (!m || !m.personId) return;
        (m.contributions || []).forEach(c => {
          if (c && typeof c === 'object' && c.id) contribVerifyRows.push({ ...c, _memberName: getPersonName(m.personId) });
        });
      });
      const verifyListHtml = contribVerifyRows.length === 0
        ? '<p class="text-[12px] text-gray-400 pl-1 py-1">暂无待核条目——专班成员在本专班详情「我的产出填报」提交产出后，此处逐条核验</p>'
        : `<div class="space-y-2 max-h-56 overflow-y-auto">${contribVerifyRows.map(c => {
            const actions = c.verifiedStatus ? '' : `
              <button class="tf-contrib-verify-btn text-[11px] px-2.5 py-1 rounded-lg text-white hover:opacity-90 transition-colors flex-shrink-0" data-contrib-id="${c.id}" data-decision="approve" style="background:#10B981;">同意入档</button>
              <button class="tf-contrib-verify-btn text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors flex-shrink-0" data-contrib-id="${c.id}" data-decision="reject">退回补料</button>`;
            return `
              <div class="flex items-start gap-2 rounded-lg bg-white px-2.5 py-1.5">
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-gray-700 leading-snug">${_tfContribTextOf(c)}</p>
                  <p class="text-[11px] text-gray-400 mt-0.5">${c._memberName}${_tfContribMetaOf(c)}</p>
                  ${c.rejectNote ? `<p class="text-[11px] text-red-500 mt-0.5">退回原因：${c.rejectNote}</p>` : ''}
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0">${_tfContribStatusOf(c)}${actions}</div>
              </div>`;
          }).join('')}</div>`;
      html += `
        <div class="mt-4 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <h6 class="font-title-cn text-xs font-bold text-gray-600">逐条核验 <span class="text-gray-300 font-normal">· 成员填报的产出由组织委员逐条核（同意入档 / 退回补料）</span></h6>
            <span class="text-[11px] text-gray-400">共 ${contribVerifyRows.length} 条</span>
          </div>
          <div class="rounded-lg bg-gray-50 p-2.5">${verifyListHtml}</div>
        </div>`;
    }
  }
  mount.innerHTML = html;

  // 解散按钮（B批 R3-2：报送解散表决 → 支委会表决；行为不变）
  const dissolveBtn = mount.querySelector('#btn-dissolve-tf');
  if (dissolveBtn) {
    dissolveBtn.addEventListener('click', () => _dissolveTaskforce(tf));
  }

  // 逐条核验（同意入档 / 退回补料，留痕）——成功只刷新本容器
  mount.querySelectorAll('.tf-contrib-verify-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const contribId = btn.dataset.contribId;
      const decision = btn.dataset.decision;
      if (decision === 'approve') {
        const res = TaskForceRecordStore.verifyContributions(tf.id, { contributionIds: [contribId], decision: 'approve', by: currentUserId });
        if (!res || res.updated === 0) { showToast('info', '该条目已核验或不存在'); return; }
        showToast('success', '已同意入档');
      } else {
        // 退回补料需填原因（与 vote-summary-panel 的 window.prompt 先例一致）
        const reason = window.prompt('请填写退回原因（必填，将随留痕展示给成员）：', '');
        if (reason === null) return; // 取消
        if (!String(reason || '').trim()) { showToast('error', '请填写退回原因'); return; }
        const res = TaskForceRecordStore.verifyContributions(tf.id, { contributionIds: [contribId], decision: 'reject', by: currentUserId, note: String(reason).trim() });
        if (!res || res.updated === 0) { showToast('info', '该条目已核验或不存在'); return; }
        showToast('success', '已退回补料（留痕含原因）');
      }
      _refreshTfBlock('tf-sec-work');
    });
  });
}

// ── 写块③组织委员代录（独立容器：核验/其他写块操作不触碰本块未提交草稿） ──
function _tfRenderContribBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-contrib');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  if (_tfContribPicker) { _tfContribPicker.destroy(); _tfContribPicker = null; }
  if (tf.status !== 'active') { mount.innerHTML = ''; return; }

  mount.innerHTML = `
    <!-- 组织委员代录（兜底）：单条 desc + 选人（B批 R3-3，代录后仍需逐条核） -->
    <div class="mt-3 rounded-lg bg-white p-2.5 border border-dashed border-gray-200">
      <div class="text-[12px] text-gray-400 mb-1">组织委员代录（兜底）<span class="text-gray-300">· 单条代录成员产出，代录后仍需逐条核</span></div>
      <div class="flex flex-col md:flex-row gap-2">
        <div id="tf-contrib-picker" class="w-48 flex-shrink-0"></div>
        <textarea id="tf-contrib-desc" rows="1" placeholder="贡献说明（必填），如：完成活动策划与执行排期…" class="input-flat flex-1 min-w-[160px] resize-none"></textarea>
        <button id="btn-add-tf-contrib" class="text-xs px-3 py-2 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" style="${solidAccentStyle(accent, accentBorder)};">代录</button>
      </div>
    </div>`;

  const tfAssigns = _tfAssignsOf(tf);
  const contribEl = mount.querySelector('#tf-contrib-picker');
  if (contribEl) {
    const contribMemberIds = tfAssigns.map(m => m.personId);
    _tfContribPicker = new PersonPicker({
      mode: 'single',
      placeholder: '选择成员',
      accentColor: accent,
      initialIds: [],
      filter: (person) => contribMemberIds.includes(person.id),
      onSelect: () => {},
    });
    _tfContribPicker.render(contribEl);
  }

  // 代录提交：成功仅重置自身（选人/说明清空），另刷新写块②（新增待核条目与工作量计数）
  mount.querySelector('#btn-add-tf-contrib')?.addEventListener('click', () => {
    const desc = (mount.querySelector('#tf-contrib-desc')?.value || '').trim();
    if (!desc) { showToast('error', '请填写贡献说明'); return; }
    const ids = _tfContribPicker ? _tfContribPicker.getSelected() : [];
    if (ids.length === 0) { showToast('error', '请选择要代录的成员'); return; }
    const res = TaskForceRecordStore.addContributions(tf.id, { personIds: ids, desc, by: currentUserId });
    if (!res) { showToast('error', '代录失败：贡献说明为空或所选人员非该专班成员'); return; }
    showToast('success', `已代录 ${res.added} 名成员产出，请逐条核验`);
    _refreshTfBlock('tf-sec-work');
    _refreshTfBlock('tf-sec-contrib');
  });
}

// ── 写块④报名区（报名/审核写主源与名额 → 整页刷新，行为不变） ──
function _tfRenderSignupBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-signup');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  if (tf.status !== 'recruiting' && tf.status !== 'active') { mount.innerHTML = ''; return; }
  const filled = _tfAssignsOf(tf).length;

  const tfSignups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tf.id);
  const tfReviewerId = resolveSignupReviewer('taskforce', tf.id);
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
    ...rejectedSignups.map(s => `${getPersonName(s.personId)}（已拒绝）`),
    ...cancelledSignups.map(s => `${getPersonName(s.personId)}（已取消）`),
  ].join('、');

  const signupRows = approvedSignups.map(s => `
    <div class="flex items-center gap-2 py-1.5">
      <span class="text-xs font-medium text-gray-700">${getPersonName(s.personId)}</span>
      <span class="text-[11px] text-gray-400">${s.role === 'participant' ? '普通参与' : s.role === 'organizer' ? '组织者' : '深度参与'}</span>
      ${s.note ? `<span class="text-[11px] text-gray-400 truncate max-w-[120px]">${s.note}</span>` : ''}
      ${badgeHtml('已通过', 'success')}
    </div>`).join('');
  const pendingRows = isTfReviewer && pendingSignups.length > 0 ? pendingSignups.map(s => `
    <div class="flex items-center gap-2 py-1.5">
      <span class="text-xs font-medium text-gray-700">${getPersonName(s.personId)}</span>
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

  mount.innerHTML = `
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

  // 报名/审核（通过后写主源 members → 名额/看板计数变化 → 整页刷新，行为不变）
  mount.querySelector('#tf-signup-apply-btn')?.addEventListener('click', () => {
    const res = SignupStore.apply({ sourceType: 'taskforce', sourceId: tf.id, personId: currentUserId, role: 'participant', note: '' });
    if (!res.ok) { showToast('error', res.reason || '报名失败'); return; }
    showToast('success', '报名成功，已加入专班名单');
    setState({});
  });
  mount.querySelectorAll('.tf-signup-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await SignupStore.review(btn.dataset.signupId, { approve: btn.dataset.approve === '1', reviewer: currentUserId });
      if (!res.ok) { showToast('error', res.reason || '操作失败'); return; }
      showToast('success', btn.dataset.approve === '1' ? '已通过该报名' : '已拒绝该报名');
      setState({});
    });
  });
}

// ── 写块⑤子记录（考察只读展示 + 材料记录添加/删除；写口仅材料） ──
function _tfSubsData(tfId) {
  const rec = (mockDB.tfSubRecords && mockDB.tfSubRecords[tfId]) || { inspection: [], materials: [] };
  return { inspection: rec.inspection || [], materials: rec.materials || [] };
}
function _tfSaveSubs(tfId, tfSubs) {
  mockDB.tfSubRecords = { ...(mockDB.tfSubRecords || {}), [tfId]: tfSubs };
  persist();
}

function _tfSubTableHtml(type, items, readOnly) {
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
      ${readOnly ? '' : `<td class="px-2 py-1.5 text-center"><button class="sub-del-btn text-xs text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>`}
    </tr>
  `).join('');
  return `
    <div class="mt-3">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <h5 class="text-xs font-bold font-title-cn" style="color:${color}">${label} (${items.length})</h5>
        ${readOnly
          ? '<span class="text-[11px] text-amber-600 text-right">专班考察请统一到组织台『考察上传』录入</span>'
          : `<button class="sub-add-btn text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors" style="color:${color};border-color:${color}40" data-type="${type}">+ 添加</button>`}
      </div>
      ${items.length === 0
        ? '<p class="text-[12px] text-gray-300 pl-2">暂无记录</p>'
        : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
            ${fields.map(f => `<th class="px-2 py-1 text-xs font-medium text-gray-500">${f.label}</th>`).join('')}
            ${readOnly ? '' : '<th class="px-2 py-1 text-xs font-medium text-gray-500 w-12"></th>'}
          </tr></thead><tbody>${rows}</tbody></table>`
      }
    </div>`;
}

function _tfRenderSubsBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-subs');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const tfSubs = _tfSubsData(tf.id);

  mount.innerHTML = `
    <div class="mt-4 pt-3 border-t border-gray-100">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">子记录</h5>
      ${_tfSubTableHtml('inspection', tfSubs.inspection, true) /* IA-C3 收敛单写入口 2026-09-06：考察记录只读展示 */}
      ${_tfSubTableHtml('materials', tfSubs.materials)}
    </div>`;

  // 材料记录添加（内联表单）——成功仅刷新本容器
  mount.querySelectorAll('.sub-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type; // 仅 materials（attendance/inspection 只读无此按钮）
      const panelEl = btn.closest('.mt-3');
      const existing = panelEl?.querySelector('.record-form-shell');
      if (existing) { existing.remove(); return; }

      const formHtml = recordFormShell({
        title: '添加材料记录',
        saveText: '保存',
        accent,
        accentBorder,
        body: `
          <input class="f-name input-flat w-full mb-2" placeholder="材料名称（必填）">
          <input class="f-author input-flat w-full mb-2" placeholder="提交人（选填）">
          <input class="f-note input-flat w-full mb-2" placeholder="备注（选填）">`,
      });
      panelEl.insertAdjacentHTML('beforeend', formHtml);
      const form = panelEl.querySelector('.record-form-shell');

      form.querySelector('.record-cancel-btn').addEventListener('click', () => {
        form.remove();
      });

      form.querySelector('.record-save-btn').addEventListener('click', () => {
        const name = form.querySelector('.f-name').value.trim();
        if (!name) { showToast('error', '请填写材料名称'); return; }
        const cur = _tfSubsData(tf.id);
        cur.materials.push({
          name,
          author: form.querySelector('.f-author').value.trim(),
          note: form.querySelector('.f-note').value.trim(),
          recordedBy: currentUserId || 'u_org',
          recordedAt: new Date().toISOString(),
        });
        _tfSaveSubs(tf.id, cur);
        showToast('success', '已添加');
        _refreshTfBlock('tf-sec-subs');
      });
    });
  });

  // 材料记录删除——成功仅刷新本容器
  mount.querySelectorAll('.sub-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const idx = parseInt(btn.dataset.idx, 10);
      const cur = _tfSubsData(tf.id);
      cur[type].splice(idx, 1);
      _tfSaveSubs(tf.id, cur);
      _refreshTfBlock('tf-sec-subs');
    });
  });
}

// ── 写块⑥中间进度（时间线 + 添加/删除） ──
function _tfRenderProgressBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-progress');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const tfProgressList = Array.isArray(tf.progressList) ? tf.progressList : [];
  if (tfProgressList.length === 0 && tf.status !== 'active') { mount.innerHTML = ''; return; }

  const fmtTpAt = (iso) => (iso || '').slice(0, 16).replace('T', ' ') || '-';
  const tfProgressRows = tfProgressList.map(p => {
    const stageTag = p.stage
      ? `<span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#10B98115;color:#0D9488;">${p.stage}</span>`
      : '';
    // 本人可删：仅填报人本人可见删除入口（旧数据无 by 时给组织委员兜底可删）
    const canDel = currentUserId && (!p.by || p.by === currentUserId);
    const delBtn = canDel
      ? `<button class="tf-progress-del-btn text-[11px] text-red-400 hover:text-red-600" data-progress-id="${p.id}">删除</button>`
      : '';
    return `
      <div class="py-2 border-b border-gray-50 last:border-b-0 flex items-start gap-2">
        <span class="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:#10B981;"></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            ${stageTag}
            <span class="text-[11px] text-gray-400">${fmtTpAt(p.at)}</span>
            <span class="text-[11px] text-gray-400">${p.by ? getPersonName(p.by) : ''}</span>
            <span class="ml-auto">${delBtn}</span>
          </div>
          <p class="text-xs text-gray-600 leading-relaxed mt-0.5">${p.note || ''}</p>
        </div>
      </div>`;
  }).join('');

  // 有记录即渲染只读时间线；active 专班额外渲染填报表单（本 tab 属组织委员工作台独占 → 写仅组织委员）
  const progressFormHtml = tf.status === 'active' ? `
    <div class="mt-2 rounded-lg bg-gray-50 p-2.5">
      <div class="flex flex-wrap items-center gap-2">
        <select id="tf-progress-stage" class="input-flat w-28 flex-shrink-0">
          ${['筹备中', '执行中', '攻坚中', '收尾'].map(s => `<option>${s}</option>`).join('')}
        </select>
        <textarea id="tf-progress-note" rows="1" placeholder="进度说明（必填）…" class="input-flat flex-1 min-w-[160px] resize-none"></textarea>
        <button id="btn-add-tf-progress" class="text-xs px-3 py-2 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" style="${solidAccentStyle(accent, accentBorder)};">添加进度</button>
      </div>
    </div>` : '';

  mount.innerHTML = `
    <div class="mt-4 pt-3 border-t border-gray-100">
      <div class="flex items-center justify-between mb-1">
        <h6 class="font-title-cn text-xs font-bold text-gray-600">中间进度 <span class="text-gray-300 font-normal">· 运行期分阶段进展</span></h6>
        ${tfProgressList.length > 0 ? `<span class="text-[11px] text-gray-400">${tfProgressList.length} 条</span>` : ''}
      </div>
      ${tfProgressList.length === 0
        ? '<p class="text-[12px] text-gray-300 pl-2 mb-1">暂无中间进度记录</p>'
        : `<div class="mt-1">${tfProgressRows}</div>`}
      ${progressFormHtml}
    </div>`;

  // 添加进度——成功仅刷新本容器（本块自身重置）
  mount.querySelector('#btn-add-tf-progress')?.addEventListener('click', () => {
    const noteEl = mount.querySelector('#tf-progress-note');
    const note = (noteEl?.value || '').trim();
    if (!note) { showToast('error', '请填写进度说明'); return; }
    const stage = mount.querySelector('#tf-progress-stage')?.value || '';
    const updated = TaskForceRecordStore.addTaskforceProgress(tf.id, { stage, note, by: currentUserId });
    if (!updated) { showToast('error', '添加失败，专班记录不存在'); return; }
    showToast('success', '中间进度已记录');
    _refreshTfBlock('tf-sec-progress');
  });

  // 删除进度——成功仅刷新本容器
  mount.querySelectorAll('.tf-progress-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const removed = TaskForceRecordStore.removeTaskforceProgress(tf.id, btn.dataset.progressId, currentUserId);
      if (!removed) { showToast('error', '删除失败：仅填报人本人可删除'); return; }
      showToast('success', '已删除该条进度记录');
      _refreshTfBlock('tf-sec-progress');
    });
  });
}

// ── 写块⑦专班复盘（提交 → 纪检委员批注闭环；未提交时含 textarea 草稿） ──
function _tfRenderReviewBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-review');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  if (tf.status !== 'active') { mount.innerHTML = ''; return; }

  const tfReviewRecord = loadTaskforceReviews().find(r => r.sourceType === 'taskforce' && r.sourceName === tf.name) || null;
  const tfHasReview = !!tfReviewRecord && (tfReviewRecord.reviewContent || tfReviewRecord.reviewStatus !== ReviewStatus.NOT_SUBMITTED);
  if (tfHasReview) {
    mount.innerHTML = `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <h6 class="font-title-cn text-xs font-bold text-gray-600">专班复盘</h6>
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">已提交</span>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed">${tfReviewRecord.reviewContent || '（已提交，待纪检委员批注）'}</p>
        ${tfReviewRecord.issues?.length ? `<p class="text-[11px] text-amber-600 mt-1">问题：${tfReviewRecord.issues.join('；')}</p>` : ''}
      </div>`;
    return;
  }

  mount.innerHTML = `
    <div class="mt-4 pt-3 border-t border-gray-100">
      <div class="flex items-center justify-between mb-2">
        <h6 class="font-title-cn text-xs font-bold text-gray-600">专班复盘</h6>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">未提交</span>
      </div>
      <textarea id="tf-review-content" rows="3" placeholder="专班任务完成情况、工作成果与不足..." class="input-flat w-full resize-none"></textarea>
      <div class="flex items-center gap-2 mt-2">
        <input id="tf-review-issues" type="text" placeholder="待改进问题（选填，多条用；分隔）" class="input-flat flex-1" />
        <button id="btn-submit-tf-review" class="text-xs px-3 py-2 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" style="${solidAccentStyle(accent, accentBorder)};">提交复盘</button>
      </div>
    </div>`;

  // 提交复盘（T-209：组织委员提交 → 纪检委员批注全栈闭环）——成功仅刷新本容器
  mount.querySelector('#btn-submit-tf-review')?.addEventListener('click', () => {
    const contentEl = mount.querySelector('#tf-review-content');
    const content = (contentEl?.value || '').trim();
    if (!content) { showToast('error', '请填写专班复盘内容'); return; }
    const issues = (mount.querySelector('#tf-review-issues')?.value || '').split(/[；;]/).map(s => s.trim()).filter(Boolean);
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
    _refreshTfBlock('tf-sec-review');
  });
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
    `<p class="font-bold text-sm text-gray-800 mb-1">无法报送解散「${tf.name}」</p>`
    + '<p class="text-xs text-gray-500 mb-3">以下产出未齐，补齐后方可报送解散表决：</p>'
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
  // B批 R3-2：已报送解散表决（committeeRequest pending）时不可重复报送
  if (tf.committeeRequest && tf.committeeRequest.status === 'pending') {
    showToast('info', '该专班已报送解散表决，等待支委会审议');
    return;
  }

  // T-224 §7 专班关闭条件：考察确认 + 工作量报告；产出缺失阻塞解散报送，缺失项明确显示
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

  // B批 R3-2：前置校验通过后「报送解散表决」，不再由组织委员直接解散；
  // 表决通过后由书记侧 applyCommitteeDecision 落 dissolved（解散留痕），未通过专班继续运行
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const confirmed = window.confirm(`确认将「${tf.name}」报送解散表决？将提交支委会表决，表决通过后专班才会解散（当前仍运行中）。`);
  if (!confirmed) return;
  const updated = TaskForceRecordStore.submitForCommittee(tf.id, { kind: 'dissolve', by: currentUserId, note: '组织委员发起解散报送（考察确认+工作量前置已满足）' });
  if (!updated) {
    showToast('error', '报送失败：仅运行中的专班可报送解散表决');
    return;
  }
  showToast('success', `专班「${tf.name}」已报送支委会表决，通过后解散`);
  setState({});
}

function _renderTfCard(t, statusLabel, statusColor) {
  const filled = t.members.filter(m => m.personId).length;
  // B批 R3-1/R3-2：committeeRequest（pending）优先表达「待支委会表决/待解散表决」，状态字面值不变
  const pendReq = (t.committeeRequest && t.committeeRequest.status === 'pending') ? t.committeeRequest : null;
  const pendText = pendReq ? (pendReq.kind === 'dissolve' ? '待解散表决' : '待支委会表决') : null;
  const pendHex = pendReq ? (pendReq.kind === 'dissolve' ? '#D97706' : '#6366F1') : null;
  const color = pendHex || statusColor[t.status] || '#6B7280';
  // 内联徽章深色亮色映射（深色下提亮一档，由 html.theme-dark [style*="--acc-bg-dark"] 规则应用）
  const darkColorMap = { pending_review: '#A5B4FC', recruiting: '#FBBF24', active: '#34D399', completed: '#60A5FA', archived: '#94A3B8', dissolved: '#F87171', draft: '#94A3B8' };
  const darkColor = (pendHex ? (pendHex === '#D97706' ? '#FBBF24' : '#A5B4FC') : (darkColorMap[t.status])) || '#94A3B8';
  // 卡片状态徽标：待表决（committeeRequest pending）> draft（表决未通过退回）特判 > 状态映射
  const badgeText = pendText
    || ((t.status === 'draft' && t.approvalStatus === 'rejected') ? '未通过·草稿' : (statusLabel[t.status] || t.status));
  // 招募状态流转按钮：recruiting → active → archived
  let statusBtn = '';
  if (t.status === 'recruiting') {
    // B 档 CRUD 补全：招募中可撤销（彻底删除），误建/取消招募的专班可清理
    statusBtn = `<div class="flex gap-2 mt-2">
      <button class="tf-start-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();">启动专班</button>
      <button class="tf-delete-btn text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">撤销</button>
    </div>`;
  } else if (t.status === 'pending_review') {
    // B批 R3-1：pending_review=已报送发起、待支委会表决；无启动按钮，可撤销删除
    statusBtn = `<div class="flex gap-2 mt-2">
      <button class="tf-delete-btn text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">撤销</button>
    </div>`;
  } else if (t.status === 'active') {
    // B批 R3-2：active 专班（含已报送解散表决）仍可归档；解散报送入口在专班详情内
    statusBtn = `<button class="tf-archive-btn text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">归档专班</button>`;
  } else if (t.status === 'draft') {
    // B批 R3-1：draft=表决未通过退回草稿（可修改重报）；已重新报送等待审议时仅可撤销
    const resubmitBtn = pendReq ? '' : `<button class="tf-resubmit-btn text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();">重新报送支委会表决</button>`;
    const deleteText = pendReq ? '撤销' : '删除';
    statusBtn = `<div class="flex gap-2 mt-2">${resubmitBtn}
      <button class="tf-delete-btn text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">${deleteText}</button>
    </div>`;
  }
  return `
    <div class="kanban-card p-4 rounded-xl bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="badge" style="background:${color}15;color:${color};--acc-bg-dark:${darkColor}24;--acc-text-dark:${darkColor};">${badgeText}</span>
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
            <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="rf-notice-title">通知标题</label>
            <input type="text" id="rf-notice-title" class="input-flat w-full" placeholder="默认使用专班名称">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="rf-notice-content">通知内容</label>
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

// ── 专班发起表单提交（B批 R3-1：创建即自动报送支委会表决，不再派生书记单人审批待办） ──

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
  // B批 R3-1：发起即置 pending_review（待支委会表决），随后自动报送支委会表决；
  // 表决通过后由书记侧 applyCommitteeDecision 写 recruiting（进入招募中），不再单人审批
  const record = {
    name,
    task,
    status: 'pending_review',
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
    const actorId = AuthStore.getCurrentUser()?.personId;
    const created = TaskForceRecordStore.add(record);
    // 做事即销待办：专班创建即完成赋权 → 销组织委员「专班赋权」待办
    if (created) TodoStore.completeBySource(TodoSourceType.TASKFORCE, created.id);
    // T-190 同步赋权：追加审计快照 + 通知初始成员（主源已由招募写入，原则7 不重复填写）
    if (created && members.length > 0) {
      AuthStore.recordProjectGrants(created.id, members, actorId);
    }
    // B批 R3-1：创建后自动报送支委会表决（报送发起）；若自动报送失败（理论不发生），
    // 专班保留 pending_review，提示用户可在看板撤销重建后重报
    let submitOk = false;
    if (created) {
      const submitted = TaskForceRecordStore.submitForCommittee(created.id, { kind: 'initiate', by: actorId, note: '' });
      submitOk = !!submitted;
      if (!submitOk) showToast('error', `专班「${name}」已创建，但自动报送支委会失败，请稍后重试`);
    }
    if (created && submitOk) showToast('success', `专班「${name}」发布成功，已报送支委会表决`);

    // 预拟通知「只跑一次」（2026-08-05）：仅在表单填写了标题时发布一条通知，
    // NoticeStore.add 单次调用，通知→待办仅派生一次，不重复发。
    if (noticeTitle) {
      NoticeStore.add({
        title: noticeTitle,
        content: noticeContent || `专班「${name}」已报送支委会表决，表决通过后将开放招募（截止 ${deadline}），欢迎届时报名参与。`,
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
