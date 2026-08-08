// role: [工程师]+[AI]
// activity-entry.js — 活动/专班统一详情页入口（T233 报名渠道）
//  URL 前缀分流：act-* 渲染活动详情，tf-* 渲染专班详情。
//  报名区仅在「可报名」时展示（活动 published/ongoing 且日期未过、专班 recruiting 且未截止）。
import { renderSidebar } from '../components/sidebar.js?v=20260808e';
import { renderHeader } from '../components/header.js?v=20260808e';
import { BranchService } from '../services/runtime.js?v=20260808e';
import { mockDB } from '../core/domain.js?v=20260808e';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260808e';
import { NoticeStore } from '../services/notice.js?v=20260808e';
import { SignupStore, resolveSignupReviewer, SignupStatus, SIGNUP_STATUS_LABELS, SIGNUP_ROLE_LABELS } from '../services/signup.js?v=20260808e';
import { AuthStore } from '../services/auth.js?v=20260808e';
import { getPersonById } from '../mock/index.js?v=20260808e';
import { getBasePath, showToast } from '../core/utils.js?v=20260808e';
import { getActivityTypeColors } from '../core/constants.js?v=20260808e';
import { badgeHtml } from '../components/badge.js?v=20260808e';

renderSidebar('dashboard');
renderHeader('dashboard');

BranchService.loadDB();
TaskForceRecordStore.init();
NoticeStore.init();
SignupStore.init();

const cardEl = document.getElementById('activity-detail-card');
const backBtn = document.getElementById('activity-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const ACTIVITY_TYPE_COLORS = getActivityTypeColors();
const currentUser = AuthStore.getCurrentUser();
const myId = currentUser?.personId || '';

/** 状态 → 徽章（活动 + 专班共用） */
const STATUS_BADGE = {
  published: ['已发布', 'success'],
  ongoing: ['进行中', 'info'],
  completed: ['已完成', 'neutral'],
  cancelled: ['已取消', 'danger'],
  draft: ['草稿', 'warning'],
  recruiting: ['招募中', 'success'],
  active: ['进行中', 'info'],
  archived: ['已归档', 'neutral'],
  dissolved: ['已解散', 'danger'],
};
function statusBadge(status) {
  const cfg = STATUS_BADGE[status];
  return cfg ? badgeHtml(cfg[0], cfg[1]) : badgeHtml(status || '—', 'neutral');
}

/** 角色标签（报名/专班/活动 assignments 共用） */
function roleLabel(role) {
  return SIGNUP_ROLE_LABELS[role] || role || '';
}

/** 今日 YYYY-MM-DD */
function _today() { return new Date().toISOString().slice(0, 10); }

/** 该来源是否可报名（与 signup.js _sourceOpen 同规则） */
function _canSignup(sourceType, source) {
  if (sourceType === 'activity') {
    if (!source || source.archived || source.status === 'cancelled' || source.status === 'draft') return false;
    if (!source.date || source.date < _today()) return false;
    return true;
  }
  if (!source || (source.status !== 'recruiting' && source.status !== 'active')) return false;
  if (source.deadline && source.deadline < _today()) return false;
  return true;
}

// ════════════════════════════════════════════════════════════════
//  入口分流
// ════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const sourceId = params.get('id') || '';

if (!sourceId) {
  if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">未指定对象</p>';
} else if (sourceId.startsWith('tf-')) {
  const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
  if (!tf) {
    if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">专班不存在或已解散</p>';
  } else {
    renderTaskforce(tf);
  }
} else {
  renderActivity(sourceId);
}

// ════════════════════════════════════════════════════════════════
//  活动详情
// ════════════════════════════════════════════════════════════════

function renderActivity(id) {
  if (!cardEl) return;
  const act = mockDB.activities.find(a => a.id === id);
  if (!act) {
    cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">活动不存在</p>';
    return;
  }

  const typeColor = ACTIVITY_TYPE_COLORS[act.type] || { color: '#6B7280' };
  const organizerName = act.organizer ? (getPersonById(act.organizer)?.name || act.organizer) : '—';
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'activity' && s.sourceId === act.id);
  const assignments = Array.isArray(act.assignments) ? act.assignments : [];
  const canSignup = _canSignup('activity', act);

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(act.status)}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="background:${typeColor.color}14;color:${typeColor.color};">${act.type || '活动'}</span>
        <span class="text-xs text-gray-400">${act.id}</span>
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${act.title || '未命名活动'}</h2>
      <p class="text-sm text-gray-500 mt-1">${act.date || '—'}${act.location ? ' · ' + act.location : ''}</p>
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-400 mb-0.5">组织者</p>
        <p class="text-sm font-medium text-gray-800">${organizerName}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-400 mb-0.5">活动方向</p>
        <p class="text-sm font-medium text-gray-800">${act.direction === 'bottom-up' ? '自下而上（党小组发起）' : '自上而下（支部部署）'}</p>
      </div>
    </div>

    ${canSignup ? renderSignupSection('activity', act.id, act.title, signups) : ''}

    <!-- 报名名单 -->
    ${renderSignupList('activity', act.id, signups)}

    <!-- 参与人员（assignments） -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">参与人员（${assignments.length}）</h3>
      ${assignments.length === 0
        ? '<p class="text-sm text-gray-400">暂无参与人员</p>'
        : `<div class="flex flex-wrap gap-2.5">${assignments.map(x => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0" style="background:${typeColor.color};">${(getPersonById(x.personId)?.name || '?').slice(0, 1)}</span>
              <span class="text-xs font-medium text-gray-700">${getPersonById(x.personId)?.name || x.personId}</span>
              <span class="text-[11px] text-gray-400">${roleLabel(x.role)}</span>
            </span>`).join('')}</div>`}
    </div>
  `;

  bindSignupEvents('activity', act.id, act.title);
}

// ════════════════════════════════════════════════════════════════
//  专班详情
// ════════════════════════════════════════════════════════════════

function renderTaskforce(tf) {
  if (!cardEl) return;
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tf.id);
  const members = Array.isArray(tf.members) ? tf.members : [];
  const canSignup = _canSignup('taskforce', tf);
  const initiatorName = tf.initiator ? (getPersonById(tf.initiator)?.name || tf.initiator) : '—';
  const fullLabel = tf.capacity ? `${members.length} / ${tf.capacity}` : `${members.length}`;

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(tf.status)}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-600">专班</span>
        <span class="text-xs text-gray-400">${tf.id}</span>
      </div>
      <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug">${tf.name || '未命名专班'}</h2>
      <p class="text-sm text-gray-500 mt-1">${tf.task || ''}</p>
    </div>

    <!-- 基本信息 -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-400 mb-0.5">发起人</p>
        <p class="text-sm font-medium text-gray-800">${initiatorName}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-400 mb-0.5">名额</p>
        <p class="text-sm font-medium text-gray-800">${fullLabel}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-400 mb-0.5">报名截止</p>
        <p class="text-sm font-medium text-gray-800">${tf.deadline || '—'}</p>
      </div>
      <div class="rounded-xl bg-gray-50 px-4 py-3">
        <p class="text-xs text-gray-400 mb-0.5">创建时间</p>
        <p class="text-sm font-medium text-gray-800">${tf.createdAt || '—'}</p>
      </div>
    </div>

    ${canSignup ? renderSignupSection('taskforce', tf.id, tf.name, signups) : ''}

    <!-- 报名名单 -->
    ${renderSignupList('taskforce', tf.id, signups)}

    <!-- 专班成员 -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">专班成员（${members.length}）</h3>
      ${members.length === 0
        ? '<p class="text-sm text-gray-400">暂无成员</p>'
        : `<div class="flex flex-wrap gap-2.5">${members.map(x => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0" style="background:#8B5CF6;">${(getPersonById(x.personId)?.name || '?').slice(0, 1)}</span>
              <span class="text-xs font-medium text-gray-700">${getPersonById(x.personId)?.name || x.personId}</span>
              <span class="text-[11px] text-gray-400">${roleLabel(x.role)}</span>
            </span>`).join('')}</div>`}
    </div>
  `;

  bindSignupEvents('taskforce', tf.id, tf.name);
}

// ════════════════════════════════════════════════════════════════
//  报名区（本人视角状态机）
// ════════════════════════════════════════════════════════════════

function renderSignupSection(sourceType, sourceId, title, signups) {
  const mySignup = myId ? signups.find(s => s.personId === myId && (s.status === SignupStatus.APPROVED || s.status === SignupStatus.PENDING || s.status === SignupStatus.REJECTED)) : null;
  const roleOptions = [
    { value: 'participant', label: '报名参加（普通参与）' },
    { value: 'deep', label: '申请深度参与' },
    { value: 'organizer', label: '申请组织者' },
  ];

  let body;
  if (!myId) {
    body = '<p class="text-sm text-gray-400">请登录后报名参与。</p>';
  } else if (!mySignup) {
    body = `
      <div class="flex items-start gap-3 flex-wrap">
        <select id="signup-role-select" class="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:border-blue-400">
          ${roleOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
        <input id="signup-note-input" type="text" placeholder="附加说明（选填，如可承担的角色）"
          class="text-sm flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:border-blue-400">
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
        <select id="signup-role-select" class="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:border-blue-400">
          ${roleOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
        <input id="signup-note-input" type="text" placeholder="附加说明（选填）"
          class="text-sm flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:border-blue-400">
        <button id="signup-submit-btn" class="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-lg font-medium text-white transition-colors hover:opacity-90" style="background:#CE1126;">
          重新申请
        </button>
      </div>`;
  }

  return `
    <div class="rounded-2xl border border-red-100 bg-red-50/40 p-5 mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">报名参与</h3>
      ${body}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  报名名单（pending 仅审核人可见）
// ════════════════════════════════════════════════════════════════

function renderSignupList(sourceType, sourceId, signups) {
  const reviewerId = resolveSignupReviewer(sourceType, sourceId);
  const isReviewer = myId && reviewerId === myId;
  const approvedList = signups.filter(s => s.status === SignupStatus.APPROVED);
  const pendingList = signups.filter(s => s.status === SignupStatus.PENDING);
  const rejectedList = signups.filter(s => s.status === SignupStatus.REJECTED);
  const cancelledList = signups.filter(s => s.status === SignupStatus.CANCELLED);

  const rows = approvedList.map(s => `
    <div class="flex items-center gap-2.5 py-2">
      <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:#CE1126;">${(getPersonById(s.personId)?.name || '?').slice(0, 1)}</span>
      <span class="text-sm font-medium text-gray-700">${getPersonById(s.personId)?.name || s.personId}</span>
      <span class="text-xs text-gray-400">${roleLabel(s.role)}</span>
      ${s.note ? `<span class="text-xs text-gray-400 truncate max-w-[160px]">${s.note}</span>` : ''}
      <span class="ml-auto">${badgeHtml('已通过', 'success')}</span>
    </div>`).join('');

  const pendingRows = isReviewer && pendingList.length > 0 ? `
    <div class="mt-4 pt-3 border-t border-gray-100">
      <p class="text-xs font-medium text-gray-400 mb-2">待审核申请（${pendingList.length}）</p>
      ${pendingList.map(s => `
        <div class="flex items-center gap-2.5 py-2">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0" style="background:#F59E0B;">${(getPersonById(s.personId)?.name || '?').slice(0, 1)}</span>
          <span class="text-sm font-medium text-gray-700">${getPersonById(s.personId)?.name || s.personId}</span>
          <span class="text-xs text-gray-400">${roleLabel(s.role)}</span>
          ${s.note ? `<span class="text-xs text-gray-400 truncate max-w-[140px]">${s.note}</span>` : ''}
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
      ${approvedList.length === 0 ? '<p class="text-sm text-gray-400">暂无已报名成员</p>' : rows}
      ${pendingRows}
      ${others ? `<p class="text-[11px] text-gray-400 mt-2">${others}</p>` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  事件绑定
// ════════════════════════════════════════════════════════════════

function bindSignupEvents(sourceType, sourceId, title) {
  const submitBtn = document.getElementById('signup-submit-btn');
  submitBtn?.addEventListener('click', async () => {
    const role = document.getElementById('signup-role-select')?.value || 'participant';
    const note = document.getElementById('signup-note-input')?.value?.trim() || '';
    const res = SignupStore.apply({ sourceType, sourceId, personId: myId, role, note });
    if (!res.ok) {
      showToast('error', res.reason || '报名失败');
      return;
    }
    showToast('success', role === 'participant' ? '报名成功，已加入名单' : '报名已提交，等待发起人审核');
    setTimeout(() => window.location.reload(), 400);
  });

  const cancelBtn = document.getElementById('signup-cancel-btn');
  cancelBtn?.addEventListener('click', () => {
    const mySignup = SignupStore.getMySignups(myId)
      .find(s => s.sourceType === sourceType && s.sourceId === sourceId && (s.status === SignupStatus.PENDING || s.status === SignupStatus.APPROVED));
    if (!mySignup) return;
    const res = SignupStore.cancel(mySignup.id, myId);
    if (!res.ok) {
      showToast('error', res.reason || '取消失败');
      return;
    }
    showToast('success', '已取消报名');
    setTimeout(() => window.location.reload(), 400);
  });

  // 审核：通过/拒绝（事件委托，绑定于 cardEl）
  cardEl?.querySelectorAll('.signup-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const signupId = btn.dataset.signupId;
      const approve = btn.dataset.approve === '1';
      const res = await SignupStore.review(signupId, { approve, reviewer: myId });
      if (!res.ok) {
        showToast('error', res.reason || '操作失败');
        return;
      }
      showToast('success', approve ? '已通过该报名' : '已拒绝该报名');
      setTimeout(() => window.location.reload(), 400);
    });
  });
}
