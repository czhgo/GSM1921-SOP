// role: [工程师]+[AI]
// 组织委员工作台 Tab：专班管理（T-279 M3 拆分，照 M2 样板）
// 看板式专班全生命周期管理 + 发布招募表单 + 活动进度追踪（原追踪看板融入）。
// 私有状态（PersonPicker 实例）随模块自持；共享数据（taskforce 分类/activities）经 ctx 传入。

import { setState } from '../../../core/base/state.js?v=20261018f';
import { BranchService } from '../../../services/core/runtime.js?v=20261018f';
import { TaskForceRecordStore, isTaskforceOrganizer } from '../../../services/activity/taskforce.js?v=20261018f';
import { legacyParticipantAssignmentRows, workgroupMembers } from '../../../services/activity/workgroup-members.js?v=20261018f';
import { SignupStore, resolveSignupReviewer, SignupStatus, SIGNUP_ROLE_LABELS, SIGNUP_STATUS_LABELS } from '../../../services/activity/signup.js?v=20261018f';
import { AuthStore } from '../../../services/core/auth.js?v=20261018f';
import { loadTaskforceReviews, addTaskforceReview } from '../../../services/governance/review.js?v=20261018f';
import { TodoStore, TodoSourceType, TodoCategory, TodoActionType } from '../../../services/governance/todo.js?v=20261018f';
import { NoticeStore } from '../../../services/governance/notice.js?v=20261018f';
import { mockDB, ReviewStatus } from '../../../core/domain/domain.js?v=20261018f'; // IA-C3 收敛单写入口 2026-09-06：ParticipationLevel 随考察写入口移除
import { persist } from '../../../data/data-adapter.js?v=20261018f';
import { settleWrites } from '../../../core/session/pending-writes.js?v=20261018f';
import { showToast, escHtml as esc, getBasePath, todayLocal } from '../../../core/base/utils.js?v=20261018f';
import { generateId } from '../../../core/base/id.js?v=20261018f';
import { solidAccentStyle } from '../../../core/domain/constants.js?v=20261018f';
// 活动「已结束/已归档」判据单一源（2026-09-13 收敛）：替代手写 `status === 'completed'`
import { isActivityEnded } from '../../../core/domain/constants.js?v=20261018f';
import { icon } from '../../../core/base/icons.js?v=20261018f';
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261018f';
import { renderWorkgroupPermissionEditor, readWorkgroupPermissionEditor } from '../../../components/governance/workgroup-permissions.js?v=20261018f';
import { renderWorkgroupMemberEditor, bindWorkgroupMemberEditor } from '../../../components/governance/workgroup-member-editor.js?v=20261018f';
import { getAdapter } from '../../../data/data-adapter.js?v=20261018f';
import { recordFormShell } from '../../../components/ui/forms.js?v=20261018f';
// 「本位」nudge 确认弹窗（2026-09-23 支书裁定 · 单一源 = components/ui/modal.js::confirmNudge）
import { confirmNudge, confirmWriteWithoutGrant } from '../../../components/ui/modal.js?v=20261018f';
// 转交组织者（SOP-G-2-② · 2026-10-01 批次 327 · 支书裁「乙：直接转交 ＋ 留痕」）：判据 / 写口 /
//   弹窗单一源＝`components/governance/organizer-transfer.js`（本台只挂入口，不复制一份实现）。
import { canTransferOrganizer, openOrganizerTransfer } from '../../../components/governance/organizer-transfer.js?v=20261018f';
import { renderQueryView } from '../../../components/governance/query-view.js?v=20261018f';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261018f';
// 人×项目矩阵单一源（支书 2026-09-14 裁定：把宽表推广到其它二元关系域 → 本批「专班报名」域）
import { renderRelationMatrix } from '../../../components/ui/relation-matrix.js?v=20261018f';
import { getPersonName, PersonStore } from '../../../services/member/person.js?v=20261018f';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：报名名单等按人段落接入关键词 + 分面
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/ui/list-filter.js?v=20261018f';
// 详情锚定单一源（2026-10-18 繁专项 Task 14）：与 taskforce-view.js 同款「触点即落点」
import { anchorDetailToTrigger, scrollDetailIntoView } from '../../../components/ui/detail-anchor.js?v=20261018f';
// 私有状态（随模块自持，不污染入口）
let _recruitOrganizerPicker = null;
let _recruitDeepPicker = null;
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
    <!-- 工作组为主对象：专班与活动工作组并列，报名总表作为跨专班关系视图。 -->
    <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
      <div class="flex items-center gap-2" id="org-tf-view-btns">
        <button type="button" class="btn-tab org-tf-view-btn px-3 py-1.5 text-xs font-medium [color:color-mix(in_srgb,var(--app-accent)_60%,#000)]" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-view="workgroups">专班工作组</button>
        <button type="button" class="btn-tab org-tf-view-btn px-3 py-1.5 text-xs font-medium" data-view="activities">活动工作组</button>
        <button type="button" class="btn-tab org-tf-view-btn px-3 py-1.5 text-xs font-medium" data-view="matrix">报名总表</button>
      </div>
    </div>
    <div class="lf-bar mb-3" id="org-tf-search-bar">
      <input type="text" id="org-tf-search" class="input-flat text-xs lf-kw" placeholder="搜索专班名称或任务...">
    </div>
    <div id="org-tf-kanban"></div>
    <div id="org-tf-activity-area" class="hidden"><div id="org-activity-progress"></div></div>
    <div id="org-tf-matrix-area" class="hidden">
      <!-- 转置双视图钮（缺省「按人」＝宽表默认，与全站口径一致）：data-mode 直接映射矩阵 mode -->
      <div class="flex items-center gap-2 mb-3" id="org-tf-mode-btns">
        <button type="button" class="btn-outline org-tf-mode-btn px-3 py-1.5 text-xs font-medium [color:color-mix(in_srgb,var(--app-accent)_60%,#000)]" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-mode="byPerson">按人</button>
        <button type="button" class="btn-outline org-tf-mode-btn px-3 py-1.5 text-xs font-medium" data-mode="byItem">按项目</button>
      </div>
      <div id="org-tf-signup-matrix"></div>
    </div>
    <div id="tf-detail-panel" class="hidden card rounded-xl p-5"></div>
  `;

  function renderKanban() {
    const kb = document.getElementById('org-tf-kanban');
    if (!kb) return;
    // 详情锚定后 `#tf-detail-panel` 会紧贴被点卡片（位于看板内）；看板整体重建前先移出，
    // 避免搜索/筛选把已打开的详情面板一并覆盖（2026-10-18 Task 14）。
    const openPanel = document.getElementById('tf-detail-panel');
    if (openPanel && kb.contains(openPanel)) container.appendChild(openPanel);
    const q = (document.getElementById('org-tf-search')?.value || '').trim().toLowerCase();
    const fp = q ? pending.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : pending;
    const fr = q ? recruiting.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : recruiting;
    const fa = q ? active.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : active;
    const fc = q ? completed.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q)) : completed;
    // 过拟合修正（2026-09-13 支书裁定「专班只是工作的一部分」）：专班＝本支部自创工作方法
    //（workflow/blocks/manifests.js: provenance='branch-custom'），看板**空分桶不保留常驻占位卡**
    //（原三桶恒渲染、空桶显「暂无…专班」并撑 min-h-[120px]）。改为只渲染**有内容**的分桶，列数随桶数自适应。
    const BUCKETS = [
      { key: 'pending', title: '待支委会表决', list: fp, tint: '#6366F1', tintDark: '#A5B4FC' },
      { key: 'recruiting', title: '招募中', list: fr, tint: '#D97706', tintDark: '#FBBF24' },
      { key: 'active', title: '运行中', list: fa, tint: '#8B5CF6', tintDark: '#C4B5FD' },
    ].filter((b) => b.list.length > 0);
    const colsClass = BUCKETS.length >= 3 ? 'md:grid-cols-3' : BUCKETS.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1';
    const emptyAll = BUCKETS.length === 0 && fc.length === 0;
    kb.innerHTML = `
      ${BUCKETS.length ? `<div class="grid grid-cols-1 ${colsClass} gap-4 mb-4">
        ${BUCKETS.map((b) => `
        <div class="card rounded-xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold tf-section-head" style="--tint:${b.tint};--acc-text-dark:${b.tintDark};color:color-mix(in srgb, ${b.tint} 60%, #000);">${b.title} (${b.list.length})</div>
          <div class="p-3" id="tf-bucket-${b.key}"></div>
        </div>`).join('')}
      </div>` : ''}
      ${fc.length > 0 ? `
      <details class="card rounded-xl p-0 overflow-hidden">
        <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none tf-section-head" style="--tint:#3B82F6;--acc-text-dark:#60A5FA;color:color-mix(in srgb, var(--accent-blue) 60%, #000);">已完结 (${fc.length})</summary>
        <div class="p-3" id="tf-bucket-completed"></div>
      </details>` : ''}
      ${emptyAll ? '<p class="text-xs text-gray-500 text-center py-6">暂无专班——本支部当前未开展专班工作；如需开展，可在「支部分工」把「专班」列为工作方法并指定负责人。</p>' : ''}
    `;

    // 各桶各接一个引擎实例：keyword null + facets [] → 引擎不渲染检索条，只出分页
    //（≤8 条不出翻页控件，三桶观感与卡片 HTML 零改动；行内状态按钮/整卡点击改事件委托，挂各桶宿主）
    const bucketDefs = [
      ...BUCKETS.map((b) => ({ id: `tf-bucket-${b.key}`, stateKey: `org-taskforce-bucket-${b.key}`, rows: b.list, emptyMessage: `暂无${b.title}专班` })),
      ...(fc.length > 0 ? [{ id: 'tf-bucket-completed', stateKey: 'org-taskforce-bucket-completed', rows: fc, emptyMessage: '暂无已完结专班' }] : []),
    ];
    bucketDefs.forEach(({ id, stateKey, rows, emptyMessage }) => {
      const host = kb.querySelector(`#${id}`);
      if (!host) return;
      renderFilteredList(host, {
        stateKey,
        rows,
        keyword: null,
        facets: [],
        countUnit: '个',
        listClass: 'space-y-3',
        emptyMessage,
        rowHtml: (t) => _renderTfCard(t, statusLabel, statusColor),
      });
      bindCardClicks(host);
      bindStatusButtons(host);
    });
  }

  document.getElementById('org-tf-search')?.addEventListener('input', renderKanban);
  renderKanban();

  // ── 报名总表（批次 39 · 2026-09-14）：人×专班宽表，与看板并列的**新增**子视图 ──
  //  人维＝支部成员（沿用组织台成员名册口径：PersonStore.getMembers() 取 branchId 非空者，同 roster/talent tab）；
  //  项目维＝专班（getAll() 按 createdAt 倒序传入，列先后＝新旧）；
  //  值＝该人在该专班的报名记录（SignupStore.getAll()，键 sourceType/sourceId/personId）。
  //  表格/横向滚动/首列吸附/列上限展开/人维分页一律由 renderRelationMatrix 单一源产出（本处不自造矩阵标记）。
  let matrixMode = 'byPerson'; // byPerson（行=人，列=专班）| byItem（行=专班，列=人）——互为转置，仅换视角
  function renderSignupMatrix() {
    const host = document.getElementById('org-tf-signup-matrix');
    if (!host) return;
    const persons = PersonStore.getMembers()
      .filter(p => p.branchId !== null && p.branchId !== undefined)
      .map(p => ({ id: p.id, name: p.name }));
    const tfList = TaskForceRecordStore.getAll()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const signups = SignupStore.getAll();
    renderRelationMatrix(host, {
      stateKey: 'org-taskforce-signup-matrix',
      mode: matrixMode,
      persons,
      items: tfList.map(t => ({ id: t.id, title: t.name, sub: statusLabel[t.status] || '' })),
      cell: (personId, tfId) => {
        // 同一 (专班, 人) 可存在多条历史报名（拒绝/取消后可再报），取 createdAt 最新一条为准
        const rec = signups
          .filter(s => s.sourceType === 'taskforce' && s.sourceId === tfId && s.personId === personId)
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
        if (!rec) return null; // 无报名 → 组件渲染灰色「—」
        const variant = rec.status === SignupStatus.APPROVED ? 'success'
          : rec.status === SignupStatus.PENDING ? 'warning'
            : rec.status === SignupStatus.REJECTED ? 'danger' : 'neutral';
        return `<span class="inline-flex flex-col items-center gap-0.5">${badgeHtml(SIGNUP_STATUS_LABELS[rec.status] || rec.status, variant)}<span class="text-[11px] text-gray-500">${esc(SIGNUP_ROLE_LABELS[rec.role] || rec.role || '')}</span></span>`;
      },
      personLabel: '成员',
      itemLabel: '专班',
      // colLimit 不传＝组件缺省 6（MATRIX_COL_LIMIT）：专班会随年份无限累积，列必须封顶；
      // 「显示全部 N 项 / 只看最近 6 项」展开钮由组件自带
      emptyText: '暂无报名记录',
      hintText: '列＝最近 6 个专班（按创建时间倒序）；「显示全部」可展开更早专班',
    });
  }

  // 子视图切换：「看板」（缺省，现有看板 DOM 只做显隐、不重绘 → 行为/外观不变）|「报名总表」
  const kbViewEl = document.getElementById('org-tf-kanban');
  const searchBarEl = document.getElementById('org-tf-search-bar');
  const activityAreaEl = document.getElementById('org-tf-activity-area');
  const matrixAreaEl = document.getElementById('org-tf-matrix-area');
  const viewBtnsEl = document.getElementById('org-tf-view-btns');
  viewBtnsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.org-tf-view-btn');
    if (!btn) return;
    // 激活态＝主题浅底+主题色字/边框（沿用考勤矩阵/考察总表既有写法）
    viewBtnsEl.querySelectorAll('.org-tf-view-btn').forEach(b => {
      const on = b === btn;
      b.classList.toggle('bg-[var(--app-accent-bg)]', on);
      b.classList.toggle('border-[var(--app-accent)]', on);
      b.classList.toggle('[color:color-mix(in_srgb,var(--app-accent)_60%,#000)]', on);
      if (on) b.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent) 55%, #fff)'); else b.style.removeProperty('--acc-text-dark');
      b.classList.toggle('bg-white', !on);
      b.classList.toggle('border-neutral-200', !on);
      b.classList.toggle('text-gray-600', !on);
    });
    const view = btn.dataset.view;
    const isWorkgroups = view === 'workgroups';
    const isActivities = view === 'activities';
    const isMatrix = view === 'matrix';
    kbViewEl?.classList.toggle('hidden', !isWorkgroups);
    activityAreaEl?.classList.toggle('hidden', !isActivities);
    // 检索条只服务工作组看板；活动列表与宽表各自提供查询维度。
    searchBarEl?.classList.toggle('hidden', !isWorkgroups);
    matrixAreaEl?.classList.toggle('hidden', !isMatrix);
    if (isActivities) _renderActivityProgress(activities, ctx);
    if (isMatrix) renderSignupMatrix();
  });
  const modeBtnsEl = document.getElementById('org-tf-mode-btns');
  modeBtnsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.org-tf-mode-btn');
    if (!btn) return;
    modeBtnsEl.querySelectorAll('.org-tf-mode-btn').forEach(b => {
      const on = b === btn;
      b.classList.toggle('bg-[var(--app-accent-bg)]', on);
      b.classList.toggle('border-[var(--app-accent)]', on);
      b.classList.toggle('[color:color-mix(in_srgb,var(--app-accent)_60%,#000)]', on);
      if (on) b.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent) 55%, #fff)'); else b.style.removeProperty('--acc-text-dark');
      b.classList.toggle('bg-white', !on);
      b.classList.toggle('border-neutral-200', !on);
      b.classList.toggle('text-gray-600', !on);
    });
    matrixMode = btn.dataset.mode; // 直接映射 renderRelationMatrix 的 mode（byPerson / byItem）
    renderSignupMatrix();
  });

  // ── 招募状态流转按钮事件委托（仅 recruiting → active；运行中工作组统一走语义收尾） ──
  function bindStatusButtons(host) {
    host.addEventListener('click', (e) => {
      // 启动专班：recruiting → active
      const startBtn = e.target.closest('.tf-start-btn');
      if (startBtn) {
        const tfId = startBtn.dataset.tfId;
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
        return;
      }
      // 撤销/删除专班（B6③ 2026-09-12：文案改「撤销并删除」+ 二次确认 + 软删除留痕）
      // 覆盖状态：recruiting（撤销招募）/ pending_review（待支委会表决撤销）/ draft（未通过草稿删除）
      const deleteBtn = e.target.closest('.tf-delete-btn');
      if (deleteBtn) {
        const tfId = deleteBtn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf) return;
        if (tf.status !== 'recruiting' && tf.status !== 'pending_review' && tf.status !== 'draft') return;
        const confirmMsg = tf.status === 'recruiting'
          ? `确认撤销并删除招募中的专班「${tf.name}」？删除后该专班及其关联报名/待办将从工作区移除（保留删除留痕，不可恢复）。`
          : tf.status === 'pending_review'
            ? `确认撤销并删除「${tf.name}」？该专班仍在待支委会表决状态，删除后将从工作区移除并清理关联待办（保留删除留痕，不可恢复）。`
            : `确认删除「${tf.name}」？该专班为表决未通过草稿，删除后将从工作区移除并清理关联待办（保留删除留痕，不可恢复）。`;
        if (!window.confirm(confirmMsg)) return;
        // 二次确认：不可恢复动作再确认一次（防误点）
        if (!window.confirm(`再次确认：删除「${tf.name}」后不可恢复，是否继续？`)) return;
        TaskForceRecordStore.softRemove(tfId, { by: AuthStore.getCurrentUser()?.personId || '' });
        // 清理关联报名（统一走 SignupStore 写口——2026-10-02 批次 343 `D-744` D 档：
        //   原先在此直接改 `SignupStore._signups` 私有字段 ＋ 手写 `mockDB.signups` ＋ `persist()`，
        //   绕过了其 `_saveSignups` 的 `bumpToken('signup')` ⇒ 报名域缓存不失效）
        SignupStore.deleteBySource('taskforce', tfId);
        TodoStore.deleteBySource(TodoSourceType.TASKFORCE, tfId);
        persist();
        showToast('success', `专班「${tf.name}」已撤销并删除（保留删除留痕）`);
        setState({});
        return;
      }
      // 附录⑩ B批（R3-1）：被驳回专班（draft，表决未通过退回草稿）→ 修改后重新报送支委会表决
      // （组织侧无编辑表单，最小合理改法=清理表决痕迹后重新报送；内容修改可先删除重建）
      const resubmitBtn = e.target.closest('.tf-resubmit-btn');
      if (resubmitBtn) {
        const tfId = resubmitBtn.dataset.tfId;
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
      }
    }, true);
  }

  // 整卡点击跳详情：事件委托挂各桶宿主（引擎翻页/筛选会重绘行）；
  // 捕获阶段 + 按钮守卫：行内状态按钮自带 inline stopPropagation，冒泡阶段拦不到宿主。
  function bindCardClicks(host) {
    host.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // 行内按钮由 bindStatusButtons 处理
      const card = e.target.closest('.tf-store-card');
      if (card) _openTfDetail(card.dataset.tfId, { accent, accentBorder }, card);
    }, true);
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
  return workgroupMembers(tf.members);
}

function _tfLegacyRowsOf(tf) {
  return legacyParticipantAssignmentRows(tf.members);
}

function _tfAllRowsOf(tf) {
  return Array.isArray(tf.members) ? tf.members.filter((member) => member?.personId) : [];
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
    return `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">已入档${c.verifiedBy ? ' · 核验人 ' + getPersonName(c.verifiedBy) : ''}</span>`;
  }
  if (c.verifiedStatus === 'rejected') {
    return `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">已退回${c.rejectNote ? ' · ' + c.rejectNote : ''}</span>`;
  }
  return '<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">待核</span>';
}

/**
 * 打开专班详情：只读概览 + **四个对象各一顶层分区**（2026-10-18 繁专项 Task 14）：
 *   ① 成员与授权 ② 任务与产出 ③ 历史分工 ④ 核验与代录；
 *   报名/子记录、收尾/复盘作为其后的辅助分区。分区标题统一 h3 / 16px，正文 12–13px。
 * 点击卡片打开时把面板紧贴被点卡片并标 `aria-current`（触点即落点），不再只出现在列表末尾。
 */
function _openTfDetail(tfId, ctx, triggerEl = null) {
  const panel = document.getElementById('tf-detail-panel');
  const tf = _tfById(tfId);
  if (!panel || !tf) return;
  _tfOpenId = tfId;
  _tfDetailCtx = ctx;
  panel.classList.remove('hidden');

  const filled = _tfAssignsOf(tf).length;
  const legacyRows = _tfLegacyRowsOf(tf);
  const sectionHead = (id, label) => `<h3 id="${id}" class="font-title-cn text-base font-semibold text-gray-800 mb-2">${label}</h3>`;
  panel.innerHTML = `
    <div class="flex items-start justify-between gap-3 mb-2">
      <div class="min-w-0">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">${tf.name}</h3>
        <p class="mt-1 text-[13px] leading-5 text-gray-500">${tf.task}</p>
      </div>
      <div class="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-gray-500 flex-shrink-0">
        <span>${filled}/${tf.capacity}</span>
        ${tf.deadline ? `<span>${tf.deadline}</span>` : ''}
        <span>发起: ${getPersonName(tf.initiator)}</span>
      </div>
    </div>
    <div class="text-[13px] leading-5 text-gray-500">工作组成员：${_tfAssignsOf(tf).map(m => getPersonName(m.personId)).join('、') || '暂无'}</div>
    ${legacyRows.length ? `<details class="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
      <summary class="cursor-pointer text-xs font-medium text-amber-800">历史普通参与记录待核（${legacyRows.length}）</summary>
      <p class="mt-1 text-xs text-amber-800">专班不设普通参与成员；旧记录保留查看，不计入成员与名额。</p>
      <p class="mt-1 text-xs text-gray-600">${legacyRows.map((member) => esc(getPersonName(member.personId))).join('、')}</p>
    </details>` : ''}

    <!-- E-1 分块刷新：四个对象各一顶层分区；操作成功仅刷对应容器 -->
    <section class="mt-5 pt-4 border-t border-gray-100" aria-labelledby="tf-section-roles">
      ${sectionHead('tf-section-roles', '成员与授权')}
      <div id="tf-sec-roles"></div>
    </section>
    <section class="mt-5 pt-4 border-t border-gray-100" aria-labelledby="tf-section-tasks">
      ${sectionHead('tf-section-tasks', '任务与产出')}
      <div id="tf-sec-tasks"></div>
    </section>
    <section class="mt-5 pt-4 border-t border-gray-100" aria-labelledby="tf-section-work">
      ${sectionHead('tf-section-work', '历史分工')}
      <div id="tf-sec-work"></div>
    </section>
    <section class="mt-5 pt-4 border-t border-gray-100" aria-labelledby="tf-section-verify">
      ${sectionHead('tf-section-verify', '核验与代录')}
      <div id="tf-sec-verify"></div>
      <div id="tf-sec-contrib"></div>
    </section>
    <section class="mt-5 pt-4 border-t border-gray-100" aria-labelledby="tf-section-records">
      ${sectionHead('tf-section-records', '报名与记录')}
      <div id="tf-sec-signup"></div>
      <div id="tf-sec-subs"></div>
    </section>
    <section class="mt-5 pt-4 border-t border-gray-100" aria-labelledby="tf-section-close">
      ${sectionHead('tf-section-close', '收尾与复盘')}
      <div id="tf-sec-progress"></div>
      <div id="tf-sec-review"></div>
    </section>
  `;

  _tfRenderRolesBlock(panel, tf, ctx);
  _tfRenderTasksBlock(panel, tf, ctx);
  _tfRenderWorkBlock(panel, tf, ctx);
  _tfRenderVerifyBlock(panel, tf, ctx);
  _tfRenderContribBlock(panel, tf, ctx);
  _tfRenderSignupBlock(panel, tf, ctx);
  _tfRenderSubsBlock(panel, tf, ctx);
  _tfRenderProgressBlock(panel, tf, ctx);
  _tfRenderReviewBlock(panel, tf, ctx);
  _syncTfSections(panel);

  // 触点即落点：被点卡片标 aria-current 并滚入视野；详情面板紧贴其后（与 taskforce-view 同款锚定）。
  if (triggerEl && triggerEl.parentElement) {
    triggerEl.parentElement.querySelectorAll('.tf-store-card[aria-current]').forEach((card) => card.removeAttribute('aria-current'));
    triggerEl.setAttribute('aria-current', 'true');
    triggerEl.setAttribute('tabindex', '-1');
    try { triggerEl.focus({ preventScroll: true }); } catch (_) { /* 旧浏览器无 preventScroll 时忽略 */ }
    anchorDetailToTrigger(panel, triggerEl, { block: 'nearest', smooth: true });
    triggerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    scrollDetailIntoView(panel, { block: 'nearest', smooth: true });
  }
}

/** 空分区不占标题：四个对象区 + 辅助区渲染后，整段无内容则隐藏该 section（保持「有活才显」）。 */
function _syncTfSections(panel) {
  panel.querySelectorAll('section[aria-labelledby]').forEach((section) => {
    const bodies = section.querySelectorAll('[id^="tf-sec-"]');
    const has = [...bodies].some((el) => el.children.length > 0 || String(el.textContent || '').trim());
    section.classList.toggle('hidden', !has);
  });
}

/** 只重渲染指定写块容器（数据源重读 store，保证与服务层落库一致） */
function _refreshTfBlock(blockId) {
  const tf = _tfOpenId ? _tfById(_tfOpenId) : null;
  const panel = document.getElementById('tf-detail-panel');
  if (!panel || !tf || !_tfDetailCtx) return;
  if (!panel.querySelector('#' + blockId)) return;
  const ctx = _tfDetailCtx;
  if (blockId === 'tf-sec-roles') _tfRenderRolesBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-tasks') _tfRenderTasksBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-work') _tfRenderWorkBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-verify') _tfRenderVerifyBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-contrib') _tfRenderContribBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-signup') _tfRenderSignupBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-subs') _tfRenderSubsBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-progress') _tfRenderProgressBlock(panel, tf, ctx);
  else if (blockId === 'tf-sec-review') _tfRenderReviewBlock(panel, tf, ctx);
}

const _TASK_STATUS_LABEL = { open: '待开始', in_progress: '进行中', completed: '已完成', cancelled: '已取消' };
const _OUTPUT_STATUS_LABEL = { draft: '待登记', pending: '待处理', submitted: '已登记', accepted: '已确认', archived: '已归档' };

async function _tfRenderTasksBlock(panel, tf, ctx = {}) {
  const mount = panel.querySelector('#tf-sec-tasks');
  if (!mount) return;
  mount.innerHTML = '<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">正在读取登记任务与产出…</div>';
  try {
    const [tasks, outputs] = await Promise.all([
      TaskForceRecordStore.listWorkgroupTasks(tf.id),
      TaskForceRecordStore.listWorkgroupOutputs(tf.id),
    ]);
    if (_tfOpenId !== tf.id || !mount.isConnected) return;
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const closedCount = tasks.filter((task) => ['completed', 'cancelled'].includes(task.status)).length;
    const closedOutputCount = outputs.filter((output) => ['submitted', 'accepted', 'archived'].includes(output.status)).length;
    const packageEnabled = ctx.taskforcePackageEnabled !== false;
    const unfinishedTasks = tasks.filter((task) => ['open', 'in_progress'].includes(task.status));
    const unfinishedOutputs = outputs.filter((output) => !['submitted', 'accepted', 'archived'].includes(output.status));
    const closureReady = tasks.length > 0 && unfinishedTasks.length === 0 && unfinishedOutputs.length === 0;
    const pendingDissolution = tf.committeeRequest?.kind === 'dissolve' && tf.committeeRequest.status === 'pending';
    const needsPurposeRepair = tf.status === 'active' && tasks.length === 0;
    mount.innerHTML = `
      <section aria-labelledby="tf-task-output-title">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <h4 id="tf-task-output-title" class="font-title-cn text-[13px] font-semibold text-gray-700">任务清单与产出记录</h4>
            <p class="mt-1 text-xs leading-5 text-gray-500">结束前须闭合所有登记任务与产出；历史记录保留。纪检考察仅在事项明确要求时办理。</p>
          </div>
          <span class="text-[11px] text-gray-500 flex-shrink-0">任务 ${closedCount}/${tasks.length} · 产出 ${closedOutputCount}/${outputs.length}</span>
        </div>
        ${tasks.length ? `<ul class="space-y-2">${tasks.map((task) => `
          <li class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-gray-700">${esc(task.title)}${task.isPurpose ? '<span class="ml-1 text-[11px] text-gray-400">工作组主任务</span>' : ''}</p>
              <p class="mt-0.5 text-xs text-gray-500">${_TASK_STATUS_LABEL[task.status] || '状态待核'}${task.completedAt ? ` · ${String(task.completedAt).slice(0, 10)}完成` : ''}</p>
            </div>
            ${tf.status === 'active' && ['open', 'in_progress'].includes(task.status) ? `<div class="flex gap-1.5">
              ${task.status === 'open' ? `<button type="button" class="btn-outline tf-task-status-btn text-xs px-2 py-1" data-task-id="${esc(task.id)}" data-status="in_progress">开始办理</button>` : ''}
              <button type="button" class="btn-accent-soft tf-task-status-btn text-xs px-2 py-1" data-task-id="${esc(task.id)}" data-status="completed">标记完成</button>
            </div>` : ''}
          </li>`).join('')}</ul>` : '<p class="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">暂无登记任务</p>'}
        ${tf.status === 'active' && (packageEnabled || needsPurposeRepair) ? `<form id="tf-new-task-form" class="mt-2 flex flex-wrap gap-2">
          <label class="sr-only" for="tf-new-task-title">新增任务名称</label>
          <input id="tf-new-task-title" name="title" class="input-flat min-w-0 flex-1 text-xs" required maxlength="160" placeholder="${needsPurposeRepair ? '核对并补登记工作组主任务' : '登记一项新任务'}">
          <button class="btn-outline px-3 py-1.5 text-xs" type="submit">${needsPurposeRepair ? '补登记主任务' : '添加任务'}</button>
        </form>` : ''}
        <div class="mt-3">
          <h5 class="mb-1.5 text-xs font-semibold text-gray-600">产出记录（${outputs.length}）</h5>
          ${outputs.length ? `<ul class="space-y-1">${outputs.map((output) => `<li class="rounded-lg border border-gray-100 px-3 py-2 text-[11px] text-gray-600">${esc(output.title)}${output.taskId && taskById.has(output.taskId) ? ` · ${esc(taskById.get(output.taskId).title)}` : ''} · ${_OUTPUT_STATUS_LABEL[output.status] || '状态待核'}</li>`).join('')}</ul>` : '<p class="text-xs text-gray-400">尚无登记产出</p>'}
        </div>
        ${tf.status === 'active' ? `<div class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
          <p class="text-xs text-gray-600">${pendingDissolution ? '收尾事项已提交支委会，等待表决。' : closureReady ? '任务与产出均已闭合，可以结束工作组。' : '全部任务与产出闭合后，才可以结束工作组。'}</p>
          ${pendingDissolution ? '<span class="text-[11px] text-amber-700">待事项表决</span>' : `<button type="button" id="btn-dissolve-tf" class="btn-md btn-md-red" ${closureReady ? '' : 'disabled title="请先闭合全部登记任务与产出"'}>结束工作组</button>`}
        </div>` : ''}
        ${tf.status === 'active' && (packageEnabled || unfinishedTasks.length > 0) ? `<form id="tf-new-output-form" class="mt-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <label class="sr-only" for="tf-new-output-title">新增产出名称</label>
          <input id="tf-new-output-title" name="title" class="input-flat min-w-0 text-xs" required maxlength="160" placeholder="登记已提交的工作产出">
          <label class="sr-only" for="tf-new-output-task">关联任务</label>
          <select id="tf-new-output-task" name="taskId" class="input-flat text-xs" ${packageEnabled ? '' : 'required'}>
            ${packageEnabled ? '<option value="">不关联具体任务</option>' : ''}
            ${(packageEnabled ? tasks : unfinishedTasks).map((task) => `<option value="${esc(task.id)}">${esc(task.title)}</option>`).join('')}
          </select>
          <button class="btn-outline px-3 py-1.5 text-xs" type="submit">登记产出</button>
        </form>` : ''}
        ${tf.status === 'active' && !packageEnabled ? `<p class="mt-2 text-xs text-amber-700">本支部已停用专班工作组：不再登记新任务；可完成既有任务，并为在办任务登记收尾产出。${needsPurposeRepair ? '该历史工作组缺少主任务，请核对原记录后补登记。' : ''}</p>` : ''}
      </section>`;
    mount.querySelector('#tf-new-task-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const input = form.elements.title;
      const title = input.value.trim();
      if (!title) return;
      const button = form.querySelector('button'); button.disabled = true;
      try {
        await TaskForceRecordStore.createWorkgroupTask(tf.id, { title, isPurpose: needsPurposeRepair });
        showToast('success', needsPurposeRepair ? '主任务已补登记' : '任务已登记');
        _refreshTfBlock('tf-sec-tasks');
      } catch (error) {
        button.disabled = false;
        showToast('error', error?.message || '任务登记失败');
      }
    });
    mount.querySelector('#tf-new-output-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const title = form.elements.title.value.trim();
      if (!title) return;
      const button = form.querySelector('button'); button.disabled = true;
      try {
        await TaskForceRecordStore.createWorkgroupOutput(tf.id, {
          title, taskId: form.elements.taskId.value || null,
        });
        showToast('success', '产出已登记并保留历史');
        _refreshTfBlock('tf-sec-tasks');
      } catch (error) {
        button.disabled = false;
        showToast('error', error?.message || '产出登记失败');
      }
    });
    mount.querySelectorAll('.tf-task-status-btn').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await TaskForceRecordStore.updateWorkgroupTask(tf.id, button.dataset.taskId, { status: button.dataset.status });
        showToast('success', button.dataset.status === 'completed' ? '任务已标记完成' : '任务已进入办理中');
        _refreshTfBlock('tf-sec-tasks');
      } catch (error) {
        button.disabled = false;
        showToast('error', error?.message || '任务状态更新失败');
      }
    }));
    mount.querySelector('#btn-dissolve-tf')?.addEventListener('click', () => _showTaskforceDissolutionDialog(tf));
  } catch (error) {
    if (_tfOpenId !== tf.id || !mount.isConnected) return;
    mount.innerHTML = `<div class="mt-4 border-t border-gray-100 pt-3 text-xs text-red-600">登记任务读取失败：${esc(error?.message || '请稍后重试')}</div>`;
  }
}

// ── 写块①工作组成员（统一列表与权限编辑器；保存走事务式成员/授权接口） ──
async function _tfRenderRolesBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-roles');
  if (!mount) return;
  const workgroupId = tf.workgroupId || `wg-taskforce-${tf.id}`;
  const isClosedHistory = ['completed', 'archived', 'dissolved'].includes(tf.status);
  const isDisabledHistory = ctx.taskforcePackageEnabled === false && isClosedHistory;
  const canEdit = !isClosedHistory;
  const legacyRows = _tfLegacyRowsOf(tf);
  mount.innerHTML = '<div class="text-xs text-gray-500">正在读取工作组成员与授权…</div>';
  let grants = [];
  let grantsError = '';
  try {
    grants = await getAdapter().workgroups.grants.list(workgroupId);
  } catch (error) {
    grantsError = error?.message || '读取工作组授权失败';
  }
  if (_tfOpenId !== tf.id || !mount.isConnected) return;
  const storedMembers = mockDB.workgroupMembers.filter((row) => row.workgroupId === workgroupId && row.status !== 'removed');
  const members = storedMembers.length ? workgroupMembers(storedMembers) : _tfAssignsOf(tf);
  const _meId = AuthStore.getCurrentUser()?.personId;
  const _canTransfer = canTransferOrganizer('taskforce', tf.id, _meId);
  const editorCanEdit = canEdit && !grantsError;
  mount.innerHTML = `
    ${isClosedHistory ? `<p class="mb-2 text-xs text-gray-500">工作组已结束，成员与授权记录只读保留。${isDisabledHistory ? '本支部已停用该能力包。' : ''}</p>` : ''}
    ${_canTransfer && !isClosedHistory ? '<div class="mt-4 flex justify-end"><button id="btn-transfer-tf-org" type="button" class="btn-outline min-h-10 px-3 text-sm">转交组织者</button></div>' : ''}
    ${renderWorkgroupMemberEditor({ workgroupId, kind: 'taskforce', canEdit: editorCanEdit, members, grants, legacyRows })}
    ${grantsError ? `<p class="mt-2 text-xs text-red-700" role="status">${esc(grantsError)}。${canEdit ? '为避免覆盖现有授权，成员编辑暂不可用。' : '授权明细暂不可读取。'}</p>` : ''}`;

  bindWorkgroupMemberEditor(mount, { onSaved: async () => {
    // 保留原专班赋权完成待办的联动；事务接口成功后刷新服务端镜像。
    TodoStore.completeBySource(TodoSourceType.TASKFORCE, tf.id);
    persist();
    try {
      await settleWrites();
    } catch (error) {
      showToast('error', '成员与授权已保存，但专班待办同步失败；页面未刷新，请刷新后核对待办。');
      console.warn('[org-taskforce] 专班成员已保存，但待办快照未结算：', error);
      return;
    }
    // 语义 API 已原子保存成员与授权；重载工作区以从服务端重新读取名单和角色镜像。
    window.location.reload();
  } });

  // 转交组织者（2026-10-01 批次 327 · SOP-G-2-② · 支书裁「乙：直接转交 ＋ 留痕」）：
  //   与「保存角色」并列但**语义更窄**——只换组织者（旧人退出、新人接手），立即生效并留痕；
  //   判据 / 写口 / 弹窗全在 organizer-transfer.js（单一源）。
  mount.querySelector('#btn-transfer-tf-org')?.addEventListener('click', () => {
    openOrganizerTransfer({
      subject: 'taskforce', scopeRef: tf.id, subjectName: tf.name,
      onDone: () => setState({}),
    });
  });
}

// ── 写块②历史分工（只读历史工作量；逐条核验独立为写块②b，代录独立为写块③） ──
function _tfRenderWorkBlock(panel, tf) {
  const mount = panel.querySelector('#tf-sec-work');
  if (!mount) return;
  let html = '';
  if (tf.status === 'active' || tf.status === 'completed' || tf.status === 'archived') {
    // 只在解散事项已有明确表决依据并已提交时显示待表决状态；收尾操作在任务/产出区展示。
    const tfPendReq = (tf.committeeRequest && tf.committeeRequest.status === 'pending') ? tf.committeeRequest : null;
    html += (tfPendReq && tfPendReq.kind === 'dissolve')
      ? `<div class="mb-2 flex items-center justify-end gap-2">
          <span class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">待事项表决</span>
          <span class="text-xs text-gray-500">${tfPendReq.by ? getPersonName(tfPendReq.by) : '组织委员'} ${String(tfPendReq.at || '').slice(0, 16).replace('T', ' ')} 已报送支委会表决</span>
        </div>`
      : '';
    html += `
      <p class="mb-2 text-[13px] leading-5 text-gray-500">历史分工记录：旧版成员贡献字段中的历史记录，与「任务与产出」分别保存、不自动迁移；待核条目在「核验与代录」逐条处理。</p>
      <div class="rounded-lg px-3 py-1" id="tf-work-host"></div>`;
  }
  mount.innerHTML = html;

  // 工作量汇总：接引擎实例（行 HTML 原样；首列＝人，按规矩配姓名搜索）
  const workHost = mount.querySelector('#tf-work-host');
  if (workHost) {
    renderFilteredList(workHost, {
      stateKey: `org-taskforce-work-${tf.id}`,
      rows: _tfAllRowsOf(tf).filter((member) => (member.contributions || []).length > 0 || member.role !== 'participant'),
      keyword: { keys: ['personId'], placeholder: '搜索成员姓名…', get: (m) => getPersonName(m.personId) },
      countUnit: '人',
      listClass: 'space-y-0',
      emptyMessage: '暂无成员',
      rowHtml: (m) => {
        const contribCount = (m.contributions || []).length;
        const contribList = (m.contributions || []).length > 0
          ? `<ul class="mt-1 space-y-0.5">${m.contributions.map(c =>
              `<li class="text-[12px] text-gray-500 pl-2">${_tfContribTextOf(c)}<span class="text-xs text-gray-500">${_tfContribMetaOf(c)}</span><span class="ml-1 align-middle">${_tfContribStatusOf(c)}</span></li>`
            ).join('')}</ul>`
          : '<span class="text-[12px] text-gray-500 pl-2">暂无贡献记录</span>';
        return `
        <div class="py-2 border-b border-gray-50 last:border-b-0">
          <div class="flex items-center justify-between">
            <a href="${getBasePath()}person.html?id=${encodeURIComponent(m.personId)}" class="text-xs font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(m.personId))}</a>
            <div class="flex items-center gap-2">
              ${badgeHtml(m.role === 'participant' ? '历史记录待核' : (m.role || '深度参与者'), m.role === 'participant' ? 'warning' : 'neutral')}
              <span class="text-xs text-gray-500">贡献 ${contribCount} 项</span>
            </div>
          </div>
          ${contribList}
        </div>`;
      },
    });
  }
}

// ── 写块②b逐条核验（独立顶层区；代录表单独立为写块③） ──
function _tfRenderVerifyBlock(panel, tf) {
  const mount = panel.querySelector('#tf-sec-verify');
  if (!mount) return;
  if (tf.status !== 'active') { mount.innerHTML = ''; return; }
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const contribVerifyRows = [];
  // B批 R3-3：成员贡献=成员填报 → 组织委员逐条核（同意入档 / 退回补料，留痕）
  (tf.members || []).forEach(m => {
    if (!m || !m.personId) return;
    (m.contributions || []).forEach(c => {
      if (c && typeof c === 'object' && c.id) contribVerifyRows.push({ ...c, _memberName: getPersonName(m.personId) });
    });
  });
  mount.innerHTML = `
    <div class="mb-2 flex items-center justify-between gap-2">
      <h4 class="font-title-cn text-[13px] font-semibold text-gray-700">逐条核验 <span class="text-xs font-normal text-gray-500">· 核验旧版贡献记录；新工作产出在「任务与产出」登记</span></h4>
      <span class="text-xs text-gray-500">共 ${contribVerifyRows.length} 条</span>
    </div>
    <div class="rounded-lg bg-gray-50 p-2.5"><div id="tf-verify-host"></div></div>`;

  // 逐条核验：接引擎实例（行 HTML 原样；原空态文案迁为 emptyMessage；行内含成员姓名，按规矩配姓名搜索）
  const verifyHost = mount.querySelector('#tf-verify-host');
  if (!verifyHost) return;
  renderFilteredList(verifyHost, {
    stateKey: `org-taskforce-verify-${tf.id}`,
    rows: contribVerifyRows,
    keyword: { keys: ['_memberName'], placeholder: '搜索成员姓名…' },
    countUnit: '条',
    listClass: 'space-y-2',
    emptyMessage: '暂无待核条目——专班成员在本专班详情「我的产出填报」提交产出后，此处逐条核验',
    rowHtml: (c) => {
      const actions = c.verifiedStatus ? '' : `
            <button class="btn-action-green tf-contrib-verify-btn px-2.5 py-1 flex-shrink-0" data-contrib-id="${c.id}" data-decision="approve">同意入档</button>
            <button class="btn-outline tf-contrib-verify-btn px-2.5 py-1 flex-shrink-0" data-contrib-id="${c.id}" data-decision="reject">退回补料</button>`;
      return `
            <div class="flex items-start gap-2 rounded-lg bg-white px-2.5 py-1.5">
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-700 leading-snug">${_tfContribTextOf(c)}</p>
                <p class="text-xs text-gray-500 mt-0.5">${c._memberName}${_tfContribMetaOf(c)}</p>
                ${c.rejectNote ? `<p class="text-xs text-red-600 mt-0.5">退回原因：${c.rejectNote}</p>` : ''}
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">${_tfContribStatusOf(c)}${actions}</div>
            </div>`;
    },
  });
  // 逐条核验（同意入档 / 退回补料，留痕）——事件委托挂宿主（引擎翻页/筛选会重绘行，行内直接绑定会失效）
  verifyHost.addEventListener('click', (e) => {
    const btn = e.target.closest('.tf-contrib-verify-btn');
    if (!btn) return;
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
    _refreshTfBlock('tf-sec-verify');
    _refreshTfBlock('tf-sec-work');
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
      <h4 class="font-title-cn text-[13px] font-semibold text-gray-700 mb-1">组织委员代录（兜底）<span class="text-xs font-normal text-gray-500">· 单条代录成员产出，代录后仍需逐条核</span></h4>
      <div class="flex flex-col md:flex-row gap-2">
        <div id="tf-contrib-picker" class="w-48 flex-shrink-0"></div>
        <textarea id="tf-contrib-desc" rows="1" placeholder="贡献说明（必填），如：完成活动策划与执行排期…" class="input-flat flex-1 min-w-[160px] resize-none"></textarea>
        <button id="btn-add-tf-contrib" class="btn-accent-soft text-xs px-3 py-2 flex-shrink-0" >代录</button>
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
  mount.querySelector('#btn-add-tf-contrib')?.addEventListener('click', async () => {
    const desc = (mount.querySelector('#tf-contrib-desc')?.value || '').trim();
    if (!desc) { showToast('error', '请填写贡献说明'); return; }
    const ids = _tfContribPicker ? _tfContribPicker.getSelected() : [];
    if (ids.length === 0) { showToast('error', '请选择要代录的成员'); return; }
    // 本位 nudge（2026-09-23 支书裁定 · 单一源 `components/ui/modal.js::confirmNudge`）：
    //   **专班的承担人（组织者）**是这一步的本位（本台是「组织委员代录（兜底）」位，代录属**例外代办**）
    //   ⇒ 操作人不是该专班组织者时，**写库前**弹一次确认（点「仍由我继续」才继续）。
    //   弹窗**必须点按钮才能关**（不点遮罩 / 不按 Esc / 不自动超时）；「取消」＝放弃本次代录。
    if (!isTaskforceOrganizer(currentUserId, tf.id)) {
      const _homeOk = await confirmNudge({ nudgeKey: 'taskforce-upload', context: tf.name });
      if (!_homeOk) return;
    }
    const res = TaskForceRecordStore.addContributions(tf.id, { personIds: ids, desc, by: currentUserId });
    if (!res) { showToast('error', '代录失败：贡献说明为空或所选人员非该专班成员'); return; }
    showToast('success', `已代录 ${res.added} 名成员产出，请逐条核验`);
    _refreshTfBlock('tf-sec-verify');
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
  const otherSignupTxt = [
    ...rejectedSignups.map(s => `${getPersonName(s.personId)}（已拒绝）`),
    ...cancelledSignups.map(s => `${getPersonName(s.personId)}（已取消）`),
  ].join('、');

  const _roleText = (r) => (r === 'participant' ? '历史身份待核' : r === 'organizer' ? '组织者' : '深度参与');
  // 统一检索引擎行数据：已通过 + （审批人视角）待审核，按人；≤8 行引擎自动不渲染检索条
  const signupListRows = [
    ...approvedSignups.map(s => ({ ...s, name: getPersonName(s.personId), role: _roleText(s.role), _pendingRow: false })),
    ...(isTfReviewer ? pendingSignups.map(s => ({ ...s, name: getPersonName(s.personId), role: _roleText(s.role), _pendingRow: true })) : []),
  ];
  mount.innerHTML = `
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-title-cn text-[13px] font-semibold text-gray-700">工作组申请记录（${approvedSignups.length}）<span class="text-xs font-normal text-gray-500">· 成员 ${filled}/${tf.capacity}</span></h4>
      </div>
      <div id="tf-signup-list"></div>
      ${otherSignupTxt ? `<p class="text-[11px] text-gray-500 mt-1">${otherSignupTxt}</p>` : ''}
    </div>`;

  const signupHost = mount.querySelector('#tf-signup-list');
  renderFilteredList(signupHost, {
    stateKey: `org-taskforce-signup-${tf.id}`,
    rows: signupListRows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    facetStyle: 'chip',
    countUnit: '人',
    listClass: 'space-y-0',
    emptyMessage: '暂无报名',
    rowHtml: (s) => `
      <div class="flex items-center gap-2 py-1.5">
        <a href="${getBasePath()}person.html?id=${encodeURIComponent(s.personId)}" class="text-xs font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(s.personId))}</a>
        <span class="text-[11px] text-gray-500">${esc(s.role)}</span>
        ${s.note ? `<span class="text-[11px] text-gray-500 truncate max-w-[120px]">${esc(s.note)}</span>` : ''}
        ${s._pendingRow
          ? `<span class="ml-auto flex items-center gap-1.5">
              ${s.role === 'participant' ? '<span class="text-[11px] text-amber-700">历史身份待核，不得转为成员</span>' : '<button class="btn-tab tf-signup-review-btn px-2.5 py-1" data-signup-id="' + esc(s.id) + '" data-approve="1" style="background:var(--functional-success);">通过</button>'}
              <button class="btn-tab tf-signup-review-btn px-2.5 py-1" data-signup-id="${esc(s.id)}" data-approve="0">拒绝</button>
            </span>`
          : badgeHtml('已通过', 'success')}
      </div>`,
  });

  // 专班的新申请从专班详情页选择组织者/深度参与者；本台只处理已有申请。
  // 审核按钮事件委托（引擎筛选重渲染后仍可点）
  signupHost.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tf-signup-review-btn');
    if (!btn) return;
    const res = await SignupStore.review(btn.dataset.signupId, { approve: btn.dataset.approve === '1', reviewer: currentUserId });
    if (!res.ok) { showToast('error', res.reason || '操作失败'); return; }
    showToast('success', btn.dataset.approve === '1' ? '已通过该报名' : '已拒绝该报名');
    setState({});
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

/** 子记录表（统一检索引擎 table 模式）：返回块壳 shellHtml + 表格件 table/rowHtml（供 renderFilteredList 消费） */
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
  return {
    shellHtml: `
    <div class="mt-3">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <h5 class="text-xs font-bold font-title-cn" style="--acc-text-dark:${color};color:color-mix(in srgb, ${color} 60%, #000)">${label} (${items.length})</h5>
        ${readOnly
          ? '<span class="text-[11px] text-amber-700 text-right">专班考察请统一到组织台『人才库』页底「录入考察」录入</span>'
          : `<button class="btn-outline sub-add-btn text-xs px-3 py-1.5" style="--acc-text-dark:${color};color:color-mix(in srgb, ${color} 60%, #000);border-color:${color}40" data-type="${type}">+ 添加</button>`}
      </div>
      <div id="tf-sub-host-${type}"></div>
    </div>`,
    table: {
      headHtml: `<tr>
            ${fields.map(f => `<th>${f.label}</th>`).join('')}
            ${readOnly ? '' : '<th class="w-12"></th>'}
          </tr>`,
      colSpan: fields.length + (readOnly ? 0 : 1),
    },
    // 行 HTML 原样；删除按数组原下标（引擎只传当页下标，故取 items.indexOf）
    rowHtml: (item) => `
    <tr>
      ${fields.map(f => `<td class="text-gray-700">${cellOf(item, f.key)}</td>`).join('')}
      ${readOnly ? '' : `<td class="text-center"><button class="btn-ghost sub-del-btn text-xs" data-type="${type}" data-idx="${items.indexOf(item)}">删除</button></td>`}
    </tr>`,
  };
}

function _tfRenderSubsBlock(panel, tf, ctx) {
  const mount = panel.querySelector('#tf-sec-subs');
  if (!mount) return;
  const { accent, accentBorder } = ctx;
  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  const tfSubs = _tfSubsData(tf.id);
  const ins = _tfSubTableHtml('inspection', tfSubs.inspection, true);
  const mat = _tfSubTableHtml('materials', tfSubs.materials);
  const inspectionHtml = tfSubs.inspection.length ? ins.shellHtml : '';

  mount.innerHTML = `
    <div class="mt-3">
      <h4 class="font-title-cn text-[13px] font-semibold text-gray-700 mb-2">子记录</h4>
      ${inspectionHtml /* 仅有明确事项并已有记录时展示；新事项不被误导成必须考察 */}
      ${mat.shellHtml}
    </div>`;

  // 考察仅是按事项要求产生的记录；有记录时保留只读查询，没有时不展示空的流程入口。
  if (tfSubs.inspection.length) {
    renderFilteredList(mount.querySelector('#tf-sub-host-inspection'), {
      stateKey: `org-taskforce-subs-inspection-${tf.id}`,
      rows: tfSubs.inspection,
      keyword: { keys: ['person', 'content'], placeholder: '搜索被考察人 / 考察内容…' },
      countUnit: '条',
      table: ins.table,
      emptyMessage: '暂无记录',
      rowHtml: ins.rowHtml,
    });
  }
  const matHost = mount.querySelector('#tf-sub-host-materials');
  renderFilteredList(matHost, {
    stateKey: `org-taskforce-subs-materials-${tf.id}`,
    rows: tfSubs.materials,
    keyword: { keys: ['name', 'author'], placeholder: '搜索材料名称 / 提交人…' },
    countUnit: '条',
    table: mat.table,
    emptyMessage: '暂无记录',
    rowHtml: mat.rowHtml,
  });

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

      form.querySelector('.record-save-btn').addEventListener('click', async () => {
        const name = form.querySelector('.f-name').value.trim();
        if (!name) { showToast('error', '请填写材料名称'); return; }
        // 本位 nudge（2026-09-23 支书裁定 · 单一源 `components/ui/modal.js::confirmNudge`）：
        //   **材料上传主体一律组织者**——专班材料的一般写入人是**该专班的组织者**；本台由组织委员
        //   代加材料属**例外代办** ⇒ 操作人不是该专班组织者时，**写库前**弹一次确认。
        //   弹窗**必须点按钮才能关**；「取消」＝放弃本次添加（表单保留）。
        if (!isTaskforceOrganizer(currentUserId, tf.id)) {
          const _homeOk = await confirmNudge({ nudgeKey: 'taskforce-upload', context: tf.name });
          if (!_homeOk) return;
        }
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

  // 材料记录删除——事件委托挂材料表宿主（引擎翻页/筛选会重绘行，行内直接绑定会失效）
  matHost?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sub-del-btn');
    if (!btn) return;
    const type = btn.dataset.type;
    const idx = parseInt(btn.dataset.idx, 10);
    const cur = _tfSubsData(tf.id);
    cur[type].splice(idx, 1);
    _tfSaveSubs(tf.id, cur);
    _refreshTfBlock('tf-sec-subs');
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
      ? `<button class="btn-ghost tf-progress-del-btn" data-progress-id="${p.id}">删除</button>`
      : '';
    return `
      <div class="py-2 border-b border-gray-50 last:border-b-0 flex items-start gap-2">
        <span class="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:var(--functional-success);"></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            ${stageTag}
            <span class="text-[11px] text-gray-500">${fmtTpAt(p.at)}</span>
            <span class="text-[11px] text-gray-500">${p.by ? getPersonName(p.by) : ''}</span>
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
        <button id="btn-add-tf-progress" class="btn-accent-soft text-xs px-3 py-2 flex-shrink-0" >添加进度</button>
      </div>
    </div>` : '';

  mount.innerHTML = `
    <div>
      <div class="flex items-center justify-between mb-1">
        <h4 class="font-title-cn text-[13px] font-semibold text-gray-700">中间进度 <span class="text-xs font-normal text-gray-500">· 运行期分阶段进展</span></h4>
        ${tfProgressList.length > 0 ? `<span class="text-[11px] text-gray-500">${tfProgressList.length} 条</span>` : ''}
      </div>
      ${tfProgressList.length === 0
        ? '<p class="text-[12px] text-gray-500 pl-2 mb-1">暂无中间进度记录</p>'
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
      <div class="mt-3">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-title-cn text-[13px] font-semibold text-gray-700">专班复盘</h4>
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">已提交</span>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed">${tfReviewRecord.reviewContent || '（已提交，待纪检委员批注）'}</p>
        ${tfReviewRecord.issues?.length ? `<p class="text-[11px] text-amber-700 mt-1">问题：${tfReviewRecord.issues.join('；')}</p>` : ''}
      </div>`;
    return;
  }

  mount.innerHTML = `
    <div class="mt-3">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-title-cn text-[13px] font-semibold text-gray-700">专班复盘</h4>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">未提交</span>
      </div>
      <textarea id="tf-review-content" rows="3" placeholder="专班任务完成情况、工作成果与不足..." class="input-flat w-full resize-none"></textarea>
      <div class="flex items-center gap-2 mt-2">
        <input id="tf-review-issues" type="text" placeholder="待改进问题（选填，多条用；分隔）" class="input-flat flex-1" />
        <button id="btn-submit-tf-review" class="btn-accent-soft text-xs px-3 py-2 flex-shrink-0" >提交复盘</button>
      </div>
    </div>`;

  // 提交复盘（T-209：组织委员提交 → 纪检委员批注全栈闭环）——成功仅刷新本容器
  mount.querySelector('#btn-submit-tf-review')?.addEventListener('click', () => {
    const contentEl = mount.querySelector('#tf-review-content');
    const content = (contentEl?.value || '').trim();
    if (!content) { showToast('error', '请填写专班复盘内容'); return; }
    const issues = (mount.querySelector('#tf-review-issues')?.value || '').split(/[；;]/).map(s => s.trim()).filter(Boolean);
    addTaskforceReview({
      id: generateId('tfrev'),
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

async function _dissolveTaskforce(tf) {
  if (!tf || tf.status !== 'active') return;
  // 已有事项待表决时不可重复报送。
  if (tf.committeeRequest && tf.committeeRequest.status === 'pending') {
    showToast('info', '该工作组已有待审议事项');
    return;
  }

  _showTaskforceDissolutionDialog(tf);
}

function _showTaskforceDissolutionDialog(tf) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.48);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('section');
  card.className = 'card rounded-xl';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'tf-dissolve-title');
  card.style.cssText = 'width:480px;max-width:100%;padding:22px;';
  card.innerHTML = `
    <h3 id="tf-dissolve-title" class="font-title-cn text-sm font-semibold text-gray-800">结束工作组：${esc(tf.name)}</h3>
    <p class="mt-2 text-xs leading-5 text-gray-600">登记任务闭合后即可结束，工作组与产出历史会保留。纪检考察只在该事项明确要求时办理；只有制度或议程明确要求表决时，才提交表决。</p>
    <label class="mt-4 flex items-start gap-2 rounded-lg border border-gray-200 p-3 text-xs text-gray-700">
      <input id="tf-dissolve-vote" type="checkbox" class="mt-0.5 accent-red-600">
      <span>本事项有明确的制度或议程表决依据</span>
    </label>
    <div id="tf-dissolve-basis-wrap" class="mt-3 hidden">
      <label for="tf-dissolve-basis" class="mb-1 block text-xs font-medium text-gray-600">制度条款或议程事项 <span class="text-red-600">*</span></label>
      <textarea id="tf-dissolve-basis" rows="2" class="input-flat w-full" placeholder="写明要求支委会表决的具体依据"></textarea>
    </div>
    <div class="mt-3">
      <label for="tf-dissolve-note" class="mb-1 block text-xs font-medium text-gray-600">收尾说明 <span class="font-normal text-gray-500">（选填）</span></label>
      <textarea id="tf-dissolve-note" rows="2" class="input-flat w-full" placeholder="记录事项完成情况或后续交接"></textarea>
    </div>
    <div class="mt-5 flex justify-end gap-2">
      <button type="button" id="tf-dissolve-cancel" class="btn-outline text-xs px-3 py-2">返回</button>
      <button type="button" id="tf-dissolve-submit" class="btn-md btn-md-red">直接结束工作组</button>
    </div>`;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const vote = card.querySelector('#tf-dissolve-vote');
  const basisWrap = card.querySelector('#tf-dissolve-basis-wrap');
  const basis = card.querySelector('#tf-dissolve-basis');
  const submit = card.querySelector('#tf-dissolve-submit');
  vote.addEventListener('change', () => {
    basisWrap.classList.toggle('hidden', !vote.checked);
    basis.required = vote.checked;
    submit.textContent = vote.checked ? '提交支委会表决' : '直接结束工作组';
    if (vote.checked) basis.focus();
  });
  const close = () => overlay.remove();
  card.querySelector('#tf-dissolve-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  const onKeydown = (event) => {
    if (event.key === 'Escape') close();
  };
  overlay.addEventListener('keydown', onKeydown);
  submit.addEventListener('click', async () => {
    const governanceReason = basis.value.trim();
    if (vote.checked && !governanceReason) {
      showToast('error', '请写明制度或议程表决依据');
      basis.focus();
      return;
    }
    submit.disabled = true;
    const currentUserId = AuthStore.getCurrentUser()?.personId || '';
    try {
      const updated = await TaskForceRecordStore.dissolve(tf.id, {
        requiresCommitteeVote: vote.checked,
        governanceReason,
        note: card.querySelector('#tf-dissolve-note').value.trim(),
        by: currentUserId,
      });
      if (!updated) {
        showToast('error', '工作组收尾失败：请刷新后检查状态与权限');
        submit.disabled = false;
        return;
      }
      if (!vote.checked) {
        // 任务和产出均闭合后直接结束，才销掉收尾待办并归档配套通知。
        TodoStore.completeBySource(TodoSourceType.TASKFORCE, tf.id);
        NoticeStore.archiveBySource('taskforce', tf.id);
      }
      close();
      showToast('success', vote.checked
        ? `工作组「${tf.name}」已提交支委会表决`
        : `工作组「${tf.name}」已结束，历史记录保留`);
      setState({});
    } catch (error) {
      submit.disabled = false;
      showToast('error', error?.message || '工作组收尾失败，请稍后重试');
    }
  });
  card.querySelector('#tf-dissolve-cancel').focus();
}

function _renderTfCard(t, statusLabel, statusColor) {
  const filled = _tfAssignsOf(t).length;
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
  // 招募状态流转按钮：recruiting → active；运行中工作组从详情统一办理收尾
  let statusBtn = '';
  if (t.status === 'recruiting') {
    // B 档 CRUD 补全：招募中可撤销（彻底删除），误建/取消招募的专班可清理
    statusBtn = `<div class="flex gap-2 mt-2">
      <button class="btn-accent-soft tf-start-btn text-xs px-3 py-1.5" data-tf-id="${t.id}" onclick="event.stopPropagation();">启动专班</button>
      <button class="btn-danger tf-delete-btn text-xs px-3 py-1.5" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">撤销并删除</button>
    </div>`;
  } else if (t.status === 'pending_review') {
    // B批 R3-1：pending_review=已报送发起、待支委会表决；无启动按钮，可撤销删除
    statusBtn = `<div class="flex gap-2 mt-2">
      <button class="btn-danger tf-delete-btn text-xs px-3 py-1.5" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">撤销并删除</button>
    </div>`;
  } else if (t.status === 'draft') {
    // B批 R3-1：draft=表决未通过退回草稿（可修改重报）；已重新报送等待审议时仅可撤销
    const resubmitBtn = pendReq ? '' : `<button class="btn-accent-soft tf-resubmit-btn text-xs px-3 py-1.5" data-tf-id="${t.id}" onclick="event.stopPropagation();">重新报送支委会表决</button>`;
    const deleteText = pendReq ? '撤销并删除' : '删除';
    statusBtn = `<div class="flex gap-2 mt-2">${resubmitBtn}
      <button class="btn-danger tf-delete-btn text-xs px-3 py-1.5" data-tf-id="${t.id}" onclick="event.stopPropagation();" style="cursor:pointer;">${deleteText}</button>
    </div>`;
  }
  return `
    <div class="kanban-card p-4 rounded-xl bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="badge" style="background:${color}15;color:color-mix(in srgb, ${color} 60%, #000);--acc-bg-dark:${darkColor}24;--acc-text-dark:${darkColor};">${badgeText}</span>
      </div>
      <p class="text-xs text-gray-500 mb-2 line-clamp-2">${t.task}</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
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
  // 统一表单基建（2026-08-05 支书裁决「统一表单基建」）：与「写入活动」表单对齐
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
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">专班名称 <span class="text-red-600">*</span></label>
        <input type="text" id="rf-name" required placeholder="如：宣传专班（第三期）" class="input-flat w-full">
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">任务描述 <span class="text-red-600">*</span></label>
        <textarea id="rf-task" required rows="3" placeholder="描述专班的核心任务与目标" class="input-flat w-full"></textarea>
      </div>

      <div class="mb-3 rounded-lg border border-gray-200 p-3">
        <label class="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
          <input id="rf-governance-vote" type="checkbox" class="mt-0.5 accent-red-600">
          <span><b>本事项需支委会表决</b>（仅在制度或议程明确要求时勾选）</span>
        </label>
        <textarea id="rf-governance-reason" rows="2" class="input-flat w-full mt-2 hidden" placeholder="写明对应制度条款或议程事项"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">所需人数 <span class="text-red-600">*</span></label>
          <input type="number" id="rf-capacity" required min="1" max="50" placeholder="如：5" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">截止日期 <span class="text-red-600">*</span></label>
          <input type="date" id="rf-deadline" required class="input-flat w-full">
        </div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">技能要求 <span class="text-gray-500">（选填）</span></label>
        <input type="text" id="rf-skills" placeholder="如：视频剪辑、文案撰写" class="input-flat w-full">
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">周期起始 <span class="text-gray-500">（选填）</span></label>
          <input type="date" id="rf-period-start" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">周期结束 <span class="text-gray-500">（选填）</span></label>
          <input type="date" id="rf-period-end" class="input-flat w-full">
        </div>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">工作组成员与职责 <span class="text-gray-500">（选填）</span></label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><div class="text-[12px] text-gray-500 mb-1">组织者</div><div id="rf-organizers-picker"></div></div>
          <div><div class="text-[12px] text-gray-500 mb-1">深度参与者</div><div id="rf-deep-picker"></div></div>
        </div>
        ${renderWorkgroupPermissionEditor('taskforce-create', 'taskforce')}
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">说明 <span class="text-gray-500">（选填）</span></label>
        <textarea id="rf-notes" rows="2" placeholder="补充说明" class="input-flat w-full"></textarea>
      </div>

      <div class="mb-4">
        <div class="wp-collapse-toggle text-xs text-gray-500 cursor-pointer hover:text-gray-600 select-none" onclick="this.nextElementSibling.classList.toggle('hidden')">自动发布通知（选填，发布专班后立即通知全体成员）</div>
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
        <button type="button" id="recruit-form-cancel" class="btn-outline text-sm px-4 py-[7px]">取消</button>
        <button type="submit" class="btn-accent text-sm px-4 py-[7px] font-medium" >发布</button>
      </div>
    </form>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 关闭按钮
  panel.querySelector('#recruit-form-close').addEventListener('click', () => _closeRecruitForm());
  panel.querySelector('#recruit-form-cancel').addEventListener('click', () => _closeRecruitForm());

  // 工作组成员身份与操作权限分开配置。
  const organizerContainer = panel.querySelector('#rf-organizers-picker');
  _recruitOrganizerPicker = new PersonPicker({
    mode: 'multi',
    placeholder: '选择组织者',
    accentColor: accent,
    onSelect: () => {},
  });
  _recruitOrganizerPicker.render(organizerContainer);
  const deepContainer = panel.querySelector('#rf-deep-picker');
  _recruitDeepPicker = new PersonPicker({ mode: 'multi', placeholder: '选择深度参与者', accentColor: accent, onSelect: () => {} });
  _recruitDeepPicker.render(deepContainer);
  const voteRequired = panel.querySelector('#rf-governance-vote');
  const voteReason = panel.querySelector('#rf-governance-reason');
  voteRequired?.addEventListener('change', () => {
    voteReason?.classList.toggle('hidden', !voteRequired.checked);
    if (voteReason) voteReason.required = voteRequired.checked;
  });

  // 表单提交
  panel.querySelector('#recruit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    void _submitRecruitForm(ctx);
  });
}

function _closeRecruitForm() {
  _recruitOrganizerPicker?.destroy();
  _recruitDeepPicker?.destroy();
  _recruitOrganizerPicker = null;
  _recruitDeepPicker = null;
  const overlay = document.getElementById('recruit-form-overlay');
  if (overlay) overlay.remove();
}

// ── 专班工作组发起（仅明确要求表决的事项才报送支委会） ──

async function _submitRecruitForm(ctx) {
  const name = document.getElementById('rf-name')?.value?.trim();
  const task = document.getElementById('rf-task')?.value?.trim();
  const capacity = parseInt(document.getElementById('rf-capacity')?.value, 10);
  const deadline = document.getElementById('rf-deadline')?.value || '';
  const skills = document.getElementById('rf-skills')?.value?.trim() || '';
  const periodStart = document.getElementById('rf-period-start')?.value || '';
  const periodEnd = document.getElementById('rf-period-end')?.value || '';
  const notes = document.getElementById('rf-notes')?.value?.trim() || '';
  const requiresCommitteeVote = !!document.getElementById('rf-governance-vote')?.checked;
  const governanceReason = document.getElementById('rf-governance-reason')?.value?.trim() || '';

  // 预拟通知（选填，2026-08-05 支书裁决「表单内预拟通知·只跑一次」）
  const noticeTitle = document.getElementById('rf-notice-title')?.value?.trim();
  const noticeContent = document.getElementById('rf-notice-content')?.value?.trim();

  // 校验必填项
  if (!name) { showToast('error', '请填写专班名称'); return; }
  if (!task) { showToast('error', '请填写任务描述'); return; }
  if (!capacity || capacity < 1) { showToast('error', '请填写有效的所需人数'); return; }
  if (!deadline) { showToast('error', '请选择截止日期'); return; }
  if (requiresCommitteeVote && !governanceReason) { showToast('error', '请写明要求支委会表决的制度或议程依据'); return; }

  // 获取初始成员（统一英文编码 role: 'deep'，T-190 修复 P1-2 中英文混用）
  const organizers = _recruitOrganizerPicker?.getSelected() || [];
  const deepParticipants = _recruitDeepPicker?.getSelected() || [];
  const members = [
    ...organizers.map((personId) => ({ personId, role: 'organizer', contributions: [] })),
    ...deepParticipants.filter((personId) => !organizers.includes(personId)).map((personId) => ({ personId, role: 'deep', contributions: [] })),
  ];

  // 未赋权软提示（2026-10-01 批次 326 · 支书裁定 `SOP-G-2-①` ＝ 乙）：初始成员里没有组织者
  //   ⇒ 本专班尚未完成赋权（专班组织者也可在后续「定人定责定岗」中指定）⇒ 提交前软提示一次，
  //   **可继续提交**。机制同「本位」nudge（单一源 `components/ui/modal.js::confirmWriteWithoutGrant`）。
  if (!members.some(m => m.role === 'organizer')) {
    const _grantOk = await confirmWriteWithoutGrant({ subject: '专班', context: name });
    if (!_grantOk) return;
  }

  // 构建专班记录
  // 普通事项直接进入招募；只有勾选明确表决依据时才进入 pending_review。
  const record = {
    name,
    task,
    status: requiresCommitteeVote ? 'pending_review' : 'recruiting',
    manager: AuthStore.getCurrentUser()?.personId || null,
    initiator: AuthStore.getCurrentUser()?.personId || null,
    governanceRequired: requiresCommitteeVote,
    governanceReason: requiresCommitteeVote ? governanceReason : '',
    members,
    capacity,
    deadline,
    activityId: null, // T-190 修复：招募表单无活动关联字段，原 activityId 未声明抛 ReferenceError
    createdAt: todayLocal(),
  };

  // 附加可选字段
  if (skills) record.skills = skills;
  if (periodStart && periodEnd) record.period = `${periodStart} ~ ${periodEnd}`;
  if (notes) record.notes = notes;

  try {
    const actorId = AuthStore.getCurrentUser()?.personId;
    const created = await TaskForceRecordStore.create(record);
    // 做事即销待办：专班创建即完成赋权 → 销组织委员「专班赋权」待办
    if (created) TodoStore.completeBySource(TodoSourceType.TASKFORCE, created.id);
    // T-190 同步赋权：追加审计快照 + 通知初始成员（主源已由招募写入，原则7 不重复填写）
    if (created && members.length > 0) {
      const permissionKeysByRole = readWorkgroupPermissionEditor(document.getElementById('recruit-form'), 'taskforce-create', { includeDefaults: true, kind: 'taskforce' });
      await AuthStore.recordProjectGrants(created.id, members, actorId, { permissionKeysByRole });
    }
    // 治理按事项而定：只有表单记录了制度/议程依据时才报送支委会；其余事项直接进入招募。
    let submitOk = !requiresCommitteeVote;
    if (created && requiresCommitteeVote) {
      const submitted = TaskForceRecordStore.submitForCommittee(created.id, { kind: 'initiate', by: actorId, note: '' });
      submitOk = !!submitted;
      if (!submitOk) showToast('error', `专班「${name}」已创建，但提交明确表决事项失败，请稍后重试`);
    }
    if (created && submitOk) showToast('success', requiresCommitteeVote
      ? `专班「${name}」已报送支委会表决`
      : `专班「${name}」已创建并进入招募`);

    // 预拟通知「只跑一次」（2026-08-05）：仅在表单填写了标题时发布一条通知，单次调用不重复发。
    // R-22（2026-09-13）：系统派生通知改由服务端生成（kind 注册表复算授权 + 落点；标题/正文为发布人所填）
    if (noticeTitle) {
      NoticeStore.addSystem('taskforce-notice-draft', created.id, {
        title: noticeTitle,
        content: noticeContent,
        deadline,
        taskforceName: name,
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
  const queryData = activities.map(a => ({ ...a, archived: String(isActivityEnded(a)) }));

  progressEl.innerHTML = `
    <div class="card rounded-xl p-5">
      <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-1">活动工作组</h3>
      <div class="text-xs text-gray-500 mb-3">按承办范围查看活动；参加活动不改变成员原党小组归属。</div>
      <div id="org-activity-query"></div>
    </div>
  `;

  const queryContainer = document.getElementById('org-activity-query');
  if (!queryContainer) return;

  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索活动名称...',
    searchKey: 'title',
    filters: [
      // 分面一律下拉（首项「<维度>：全部」由组件统一补，勿在 options 里再放空值「全部」项）
      { key: 'type', label: '活动类型', options: typeOptions },
      { key: 'archived', label: '状态', options: [
        { value: 'false', label: '进行中' },
        { value: 'true', label: '已归档' },
      ]},
    ],
    data: queryData,
    renderRow: (a) => {
      const isArchived = isActivityEnded(a);
      const scopeLabel = a.organizingScope === 'party-group' ? '组内承办'
        : a.organizingScope === 'cross-group' ? '跨组承办' : '承办范围待核';
      const organizers = [...new Set([
        a.organizer,
        ...(Array.isArray(a.assignments) ? a.assignments.filter((member) => member.role === 'organizer').map((member) => member.personId) : []),
      ].filter(Boolean))];
      const deepCount = Array.isArray(a.assignments) ? a.assignments.filter((member) => member.role === 'deep').length : 0;
      const statusTag = isArchived
        ? badgeHtml('已归档', 'neutral')
        : badgeHtml('已发布', 'success');
      const completeBtn = !isArchived
        ? `<button class="btn-accent-soft track-complete-btn text-xs px-3 py-1.5" data-act-id="${a.id}">确认完成</button>`
        : '';
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white transition-colors">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium ${isArchived ? 'text-gray-500 line-through' : 'text-gray-800'}">${a.title || '未命名'}</div>
            <div class="text-xs text-gray-500 mt-0.5">${a.date || ''}${a.type ? ' · ' + a.type : ''}${a.location ? ' · ' + a.location : ''}</div>
            <div class="text-[11px] text-gray-500 mt-1">${scopeLabel} · 组织者：${organizers.length ? organizers.map((id) => getPersonName(id)).join('、') : '待指定'} · 深度参与 ${deepCount} 人</div>
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
