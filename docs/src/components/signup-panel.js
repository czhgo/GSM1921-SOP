// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  component.signup-panel.js — 报名面板组件（T233 报名渠道）
//  活动详情页（activity-entry.js）与专班详情页（taskforce-entry.js）共用，
//  避免「活动/专班统一报名逻辑」在两处重复散落（C-2 一改具改巡检，支书 2026-08-11 裁定专班独立页面）。
// ════════════════════════════════════════════════════════════════
import { SignupStore, resolveSignupReviewer, SignupStatus, SIGNUP_ROLE_LABELS } from '../services/signup.js?v=20260921a';
import { getPersonById, getPersonName } from '../services/person.js?v=20260921a';
import { getBasePath, showToast } from '../core/utils.js?v=20260921a';
import { badgeHtml } from './badges.js?v=20260921a';
// 活动「已归档」口径单一源（2026-09-13 收敛）：替代手写 source.archived
import { isActivityArchived } from '../core/constants.js?v=20260921a';
// 统一检索引擎（2026-09-14 批次 37）：报名名单（已通过）接入关键词 + 分页
import { renderFilteredList } from './list-filter.js?v=20260921a';
// 批次 49 口径（「存好了才报成功」）：刷新前先等在途落库结算，见 _reloadAfterSettle
import { settleWrites } from '../core/pending-writes.js?v=20260921a';

/**
 * 落库结算后再整页刷新（2026-09-18 批次 83 · SOP-B-2）
 * 病灶（真机实测）：原实现是 `setTimeout(() => location.reload(), 400)` —— 而 `persist()` 在 API
 * 形态下排的是 800ms 防抖快照，400ms 就刷新会把在途快照**打断**（实测 `POST /api/v1/snapshot`
 * 以 `ERR_ABORTED` 收场）⇒ **报名只留在本机，服务端一条都没有**，组长台/纪检台的
 * 「考勤候选默认选中报名者」随之落空。故按批次 49「存好了才报成功」的同一口径：先结算、再刷新。
 */
async function _reloadAfterSettle() {
  try { await settleWrites(); } catch (e) { console.warn('[signup-panel] 落库未成功，仍刷新以读取最新状态：', e); }
  window.location.reload();
}

/** 角色标签（报名/专班/活动 assignments 共用） */
export function roleLabel(role) {
  return SIGNUP_ROLE_LABELS[role] || role || '';
}

/** 今日 YYYY-MM-DD */
function _today() { return new Date().toISOString().slice(0, 10); }

/** 该来源是否可报名（与 signup.js _sourceOpen 同规则） */
export function canSignup(sourceType, source) {
  if (sourceType === 'activity') {
    if (!source || isActivityArchived(source) || source.status === 'cancelled') return false;
    // 草稿活动默认不可报名；写入活动时勾「开放报名」者例外（同 signup.js::_sourceOpen，SOP-B-2）
    if (source.status === 'draft' && source.signupEnabled !== true) return false;
    if (!source.date || source.date < _today()) return false;
    return true;
  }
  if (!source || (source.status !== 'recruiting' && source.status !== 'active')) return false;
  if (source.deadline && source.deadline < _today()) return false;
  return true;
}

// ════════════════════════════════════════════════════════════════
//  报名区（本人视角状态机）
// ════════════════════════════════════════════════════════════════

export function renderSignupSection({ sourceType, sourceId, title, signups, myId }) {
  const mySignup = myId ? signups.find(s => s.personId === myId && (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING || s.status === SignupStatus.REJECTED)) : null;
  const roleOptions = [
    { value: 'participant', label: '报名参加（普通参与）' },
    { value: 'deep', label: '申请深度参与' },
    { value: 'organizer', label: '申请组织者' },
  ];

  let body;
  if (!myId) {
    // 未登录：提示附「去登录」入口（支书 2026-09-07 U1 批准，样式同 wizard-entry 去登录小按钮）
    body = `
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-sm text-gray-500">请登录后报名参与。</p>
        <a href="${getBasePath()}login.html" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style="background:#C8102E;text-decoration:none;">去登录</a>
      </div>`;
  } else if (!mySignup) {
    body = `
      <div class="flex items-start gap-3 flex-wrap">
        <select id="signup-role-select" class="input-flat min-w-[180px]">
          ${roleOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
        <input id="signup-note-input" type="text" placeholder="附加说明（选填，如可承担的角色）"
          class="input-flat flex-1 min-w-[200px]">
        <button id="signup-submit-btn" class="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-lg font-medium text-white transition-colors hover:opacity-90" style="background:#CE1126;">
          报名
        </button>
      </div>`;
  } else if (mySignup.status === SignupStatus.APPROVED) {
    body = `
      <div class="flex items-center gap-2.5 flex-wrap">
        ${badgeHtml('已报名 · ' + roleLabel(mySignup.role), 'success')}
        <button id="signup-cancel-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors">取消报名</button>
      </div>`;
  } else if (mySignup.status === SignupStatus.PENDING) {
    body = `
      <div class="flex items-center gap-2.5">
        ${badgeHtml('待审核 · ' + roleLabel(mySignup.role), 'warning')}
        <button id="signup-cancel-btn" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors">撤回申请</button>
      </div>`;
  } else if (mySignup.status === SignupStatus.REJECTED) {
    body = `
      <div class="flex items-start gap-3 flex-wrap">
        ${badgeHtml('已拒绝 · ' + roleLabel(mySignup.role), 'danger')}
        <select id="signup-role-select" class="input-flat min-w-[180px]">
          ${roleOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
        <input id="signup-note-input" type="text" placeholder="附加说明（选填）"
          class="input-flat flex-1 min-w-[200px]">
        <button id="signup-submit-btn" class="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-lg font-medium text-white transition-colors hover:opacity-90" style="background:#CE1126;">
          重新申请
        </button>
      </div>`;
  }

  return `
    <div class="rounded-xl border border-red-100 bg-red-50/40 p-5 mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">报名参与</h3>
      ${body}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  报名名单（pending 仅审核人可见）
// ════════════════════════════════════════════════════════════════

export function renderSignupList({ sourceType, sourceId, signups, myId }) {
  const reviewerId = resolveSignupReviewer(sourceType, sourceId);
  const isReviewer = myId && reviewerId === myId;
  const approvedList = signups.filter(s => s.status === SignupStatus.APPROVED);
  const pendingList = signups.filter(s => s.status === SignupStatus.PENDING);
  const rejectedList = signups.filter(s => s.status === SignupStatus.REJECTED);
  const cancelledList = signups.filter(s => s.status === SignupStatus.CANCELLED);

  // 已通过名单改由统一检索引擎渲染（宿主 div 见下方 return；引擎挂载在 bindSignupEvents —— 那是
  // entry 侧 innerHTML 就位后的钩子）。行 HTML 与角色标签保持原样，仅迁为 rowHtml。

  const pendingRows = isReviewer && pendingList.length > 0 ? `
    <div class="mt-4 pt-3 border-t border-gray-100">
      <p class="text-xs font-medium text-gray-500 mb-2">待审核申请（${pendingList.length}）</p>
      ${pendingList.map(s => `
        <div class="flex items-center gap-2.5 py-2">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:#F59E0B;">${(getPersonById(s.personId)?.name || '?').slice(0, 1)}</span>
          <a href="${getBasePath()}person.html?id=${encodeURIComponent(s.personId)}" class="text-sm font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${getPersonName(s.personId)}</a>
          <span class="text-xs text-gray-500">${roleLabel(s.role)}</span>
          ${s.note ? `<span class="text-xs text-gray-500 truncate max-w-[140px]">${s.note}</span>` : ''}
          <span class="ml-auto flex items-center gap-2">
            <button class="signup-review-btn text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors hover:opacity-90" data-signup-id="${s.id}" data-approve="1" style="background:#10B981;">通过</button>
            <button class="signup-review-btn text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors" data-signup-id="${s.id}" data-approve="0">拒绝</button>
          </span>
        </div>`).join('')}
    </div>` : '';

  const others = [
    ...rejectedList.map(s => `${getPersonById(s.personId)?.name || s.personId}（已拒绝）`),
    ...cancelledList.map(s => `${getPersonById(s.personId)?.name || s.personId}（已取消）`),
  ].join('、');

  if (approvedList.length === 0 && !pendingRows && !others) {
    return '';
  }

  return `
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-3">报名名单（${approvedList.length}）</h3>
      <div data-signup-list-host></div>
      ${pendingRows}
      ${others ? `<p class="text-[11px] text-gray-500 mt-2">${others}</p>` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  事件绑定（提交/取消/审核）
// ════════════════════════════════════════════════════════════════

export function bindSignupEvents({ sourceType, sourceId, title, myId, cardEl }) {
  const submitBtn = cardEl?.querySelector('#signup-submit-btn');
  submitBtn?.addEventListener('click', async () => {
    const role = cardEl.querySelector('#signup-role-select')?.value || 'participant';
    const note = cardEl.querySelector('#signup-note-input')?.value?.trim() || '';
    const res = SignupStore.apply({ sourceType, sourceId, personId: myId, role, note });
    if (!res.ok) {
      showToast('error', res.reason || '报名失败');
      return;
    }
    showToast('success', role === 'participant' ? '报名成功，已加入名单' : '报名已提交，等待发起人审核');
    await _reloadAfterSettle();
  });

  const cancelBtn = cardEl?.querySelector('#signup-cancel-btn');
  cancelBtn?.addEventListener('click', async () => {
    const mySignup = SignupStore.getMySignups(myId)
      .find(s => s.sourceType === sourceType && s.sourceId === sourceId && (s.status === SignupStatus.PENDING || s.status === SignupStatus.APPROVED));
    if (!mySignup) return;
    const res = SignupStore.cancel(mySignup.id, myId);
    if (!res.ok) {
      showToast('error', res.reason || '取消失败');
      return;
    }
    showToast('success', '已取消报名');
    await _reloadAfterSettle();
  });

  // 报名名单（已通过）接统一检索引擎：需在 DOM 就位后挂载，故放在本函数（entry 侧均先 innerHTML 再调用）。
  // 行内无按钮；待审核申请的「通过 / 拒绝」在引擎宿主之外，不受翻页重绘影响，绑定保持原样。
  const signupListHost = cardEl?.querySelector('[data-signup-list-host]');
  if (signupListHost) {
    const approvedRows = SignupStore.getAll()
      .filter(s => s.sourceType === sourceType && s.sourceId === sourceId && s.status === SignupStatus.APPROVED);
    renderFilteredList(signupListHost, {
      stateKey: `signup-list-${sourceType}-${sourceId}`,
      rows: approvedRows,
      keyword: {
        keys: ['name', 'role'],
        placeholder: '搜索姓名 / 角色…',
        get: (s, k) => (k === 'name' ? getPersonName(s.personId) : roleLabel(s.role)),
      },
      countUnit: '人',
      listClass: 'space-y-0',
      // 原空态文案迁移为 emptyMessage
      emptyMessage: '暂无已报名成员',
      rowHtml: (s) => `
        <div class="flex items-center gap-2.5 py-2">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:#CE1126;">${(getPersonById(s.personId)?.name || '?').slice(0, 1)}</span>
          <a href="${getBasePath()}person.html?id=${encodeURIComponent(s.personId)}" class="text-sm font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${getPersonName(s.personId)}</a>
          <span class="text-xs text-gray-500">${roleLabel(s.role)}</span>
          ${s.note ? `<span class="text-xs text-gray-500 truncate max-w-[160px]">${s.note}</span>` : ''}
          <span class="ml-auto">${badgeHtml('已通过', 'success')}</span>
        </div>`,
    });
  }

  // 审核：通过/拒绝（事件委托，绑定于 cardEl）
  cardEl?.querySelectorAll('.signup-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const signupId = btn.dataset.signupId;
      const approve = btn.dataset.approve === '1';
      // C2 危险操作二次确认：拒绝不可撤销，先确认（2026-09-12）
      if (!approve && !window.confirm('确认拒绝该报名申请？拒绝后申请人需重新提交。')) return;
      const res = await SignupStore.review(signupId, { approve, reviewer: myId });
      if (!res.ok) {
        showToast('error', res.reason || '操作失败');
        return;
      }
      showToast('success', approve ? '已通过该报名' : '已拒绝该报名');
      await _reloadAfterSettle();
    });
  });
}
