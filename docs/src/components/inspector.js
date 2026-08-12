﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspector.js — 右侧检查器面板渲染逻辑
//  包含：filterTasksByManagementRole, renderInspectorFromState,
//        renderInspectorList, renderInspectorDetail
// ════════════════════════════════════════════════════════════════

import { setState, STATE, getAppState } from '../core/state.js?v=20260812a';
import { ROLE_COLORS, ROLE_LABELS, ROLE_THEME_CLASS, COMMISSIONER_ROLES } from '../core/constants.js?v=20260812a';
import { _fmtChinese, showToast } from '../core/utils.js?v=20260812a';
import { icon } from '../core/icons.js?v=20260812a';
import { PEOPLE, getPersonById } from '../mock/index.js?v=20260812a';
import { BranchService } from '../services/runtime.js?v=20260812a';
import { AuthStore } from '../services/auth.js?v=20260812a';
import { statusBadgeHtml, bindStatusBadge } from './status-badge.js?v=20260812a';
import { badgeHtml } from './badge.js?v=20260812a';
import { persist } from '../core/data-adapter.js?v=20260812a';
import { loadAttendanceRecords } from '../services/attendance.js?v=20260812a';
import { loadInspectionRecords } from '../services/inspection.js?v=20260812a';
import { loadActivityReviews } from '../services/review.js?v=20260812a';
import { mockDB, OutputType, deriveOutputRoute, ReviewStatus, AttendanceStatus } from '../core/domain.js?v=20260812a';

// T-217 §2.4：任务状态定义（status-badge 用，色点 + 文字）
const TASK_STATUSES = {
  pending:     { label: '待处理', color: '#9CA3AF' },
  in_progress: { label: '进行中', color: '#D97706' },
  completed:   { label: '已完成', color: '#16A34A' },
};

// T-218：活动执行态由任务进度派生（书记裁决 2026-08-05「进度驱动活动状态」）
// - 有关联任务且全部 completed → 'completed'（已完成）
// - 有关联任务且未全部完成 → 'ongoing'（进行中）
// - 无关联任务 → 保持计划态（draft/published）原样
// 以全活动任务为准（呼应书记「书记看全部任务」裁决）；展示与写联动统一走本函数。
export function deriveActivityExecutionStatus(activity, allTasks) {
  const actTasks = allTasks.filter(t => t.activityId === activity.id);
  if (actTasks.length === 0) return activity.status;
  const allDone = actTasks.every(t => t.status === 'completed');
  return allDone ? 'completed' : 'ongoing';
}

// ── 活动生命周期态（2026-08-07 书记裁决：消除"已完成 vs 未归档"矛盾）──
// 草稿→已发布→进行中→已执行→待归档→已归档（+已取消）
// "已完成"字样全站移除：执行完毕且产出齐备才为"已执行"，产出缺失为"待归档"。
export const ACTIVITY_LIFECYCLE = {
  draft:          { label: '草稿',   variant: 'neutral' },
  published:      { label: '已发布', variant: 'info' },
  ongoing:        { label: '进行中', variant: 'warning' },
  pending_archive:{ label: '待归档', variant: 'warning' },
  executed:       { label: '已执行', variant: 'success' },
  archived:       { label: '已归档', variant: 'neutral' },
  cancelled:      { label: '已取消', variant: 'neutral' },
};

export function deriveActivityLifecycleStatus(activity, allTasks) {
  if (activity.status === 'cancelled') return 'cancelled';
  if (activity.archived) return 'archived';
  if (activity.status === 'draft') return 'draft';
  const exec = deriveActivityExecutionStatus(activity, allTasks || []);
  if (exec === 'completed') {
    const { canClose, missing } = checkActivityCloseConditions(activity);
    return canClose ? 'executed' : 'pending_archive';
  }
  return exec; // published | ongoing
}

export function activityLifecycleBadgeHtml(activity, allTasks) {
  const st = deriveActivityLifecycleStatus(activity, allTasks || []);
  const meta = ACTIVITY_LIFECYCLE[st] || ACTIVITY_LIFECYCLE.draft;
  const title = st === 'pending_archive'
    ? `待归档：${checkActivityCloseConditions(activity).missing.join('、')}`
    : undefined;
  return badgeHtml(meta.label, meta.variant, { title });
}

// ════════════════════════════════════════════════════════════════
//  RBAC 任务过滤核
//  commissioner 系列：兼容多种 executor/supervisor 字符串
// ════════════════════════════════════════════════════════════════
export function filterTasksByManagementRole(tasks, managementRole) {
  if (managementRole === 'participant' || !managementRole) return tasks;
  // 书记（党支书）为支部总负责人：活动详情展示该活动全部任务节点，便于全面监督（T-217 书记裁决 2026-08-05）
  if (managementRole === 'secretary') return tasks;
  return tasks.filter(t => {
    const ex  = t.executor  || '';
    const sup = t.supervisor || '';
    if (managementRole === 'org-commissioner' || managementRole === 'prop-commissioner' || managementRole === 'disc-commissioner') {
      return COMMISSIONER_ROLES.has(ex) || COMMISSIONER_ROLES.has(sup) || ex === managementRole || sup === managementRole;
    }
    return ex === managementRole || sup === managementRole;
  });
}

// ════════════════════════════════════════════════════════════════
//  检查器状态路由分发（根据 viewMode / viewType 切换 List / Detail）
// ════════════════════════════════════════════════════════════════
export function renderInspectorFromState(state) {
  if (state.viewType === 'participant' && state.viewMode !== 'detail') {
    renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
    return;
  }

  if (state.viewMode === 'detail' && state.selectedActivityId) {
    const act = state.activities.find(a => a.id === state.selectedActivityId);
    if (act) {
      const actTasks = state.tasks.filter(t => t.activityId === act.id);
      renderInspectorDetail(act, actTasks, state.managementRole);
    } else {
      renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
    }
  } else {
    renderInspectorList(state.activities, state.selectedDate, state.viewType, state.viewArchived);
  }
}

// ════════════════════════════════════════════════════════════════
//  轻量参与者浮层（DOM Modal）
// ════════════════════════════════════════════════════════════════
function _showParticipantModal(act) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:var(--radius-lg);padding:20px 22px;max-width:320px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';

  let extraHtml = '';
  const orgPerson = getPersonById(act.organizer);
  if (orgPerson) {
    extraHtml += `<p class=" text-sm text-gray-700 mb-1">组织者：${orgPerson.name}</p>`;
  }
  if (act.participants && act.participants.length > 0) {
    const deepNames = act.participants
      .filter(pid => pid !== act.organizer)
      .map(pid => getPersonById(pid)?.name)
      .filter(Boolean);
    if (deepNames.length > 0) {
      extraHtml += `<p class=" text-sm text-gray-700 mb-1">参与者：${deepNames.join('、')}</p>`;
    }
  }

  card.innerHTML =
    '<p class=" font-bold text-sm text-gray-800 mb-3">【活动摘要】</p>'
    + `<p class=" text-sm text-gray-700 mb-1">标题：${act.title}</p>`
    + `<p class=" text-sm text-gray-700 mb-2">日期：${act.date || '未设定'}</p>`
    + extraHtml
    + '<p class=" text-xs text-gray-500 border-t border-gray-100 pt-3 mt-2 leading-relaxed">'
    + '如需查看任务详情，请前往对应的工作台页面。</p>'
    + '<button class=" text-sm text-white px-4 py-[7px] rounded-lg mt-4 w-full transition-colors" '
    + 'style="background:#CE1126;">关闭</button>';
  card.querySelector('button').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ════════════════════════════════════════════════════════════════
//  列表视图：渲染指定日期的活动列表（普通或归档模式）
// ════════════════════════════════════════════════════════════════
export function renderInspectorList(activities, dateKey, viewType, viewArchived = false) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  let dateActivities;
  if (viewArchived) {
    dateActivities = activities.filter(a => a.archived === true);
  } else {
    dateActivities = dateKey
      ? activities.filter(a => !a.archived && a.date === dateKey)
      : [];
  }

  if (dateActivities.length === 0) {
    defEl.classList.remove('hidden');
    if (viewArchived) {
      defEl.innerHTML = '<p class=" text-sm text-gray-400 text-center py-8">归档库暂无内容</p>';
    } else if (dateKey) {
      defEl.innerHTML = '<div class="text-center text-gray-400 py-8  text-sm">当日暂无活动</div>';
    } else {
      defEl.innerHTML = '<div class="text-center text-gray-400 py-8  text-sm">点击日历日期查看活动</div>';
    }
    contentEl.classList.add('hidden');
    return;
  }
  defEl.innerHTML = '';

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) {
    titleEl.textContent = viewArchived
      ? '归档库 · 已归档活动'
      : _fmtChinese(new Date(dateKey + 'T00:00:00')) + ' · 活动列表';
  }

  // 确保 inspector 可见：滚动到视图中
  contentEl.closest('#inspector-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const isParticipant = !viewArchived && (viewType === 'participant' || !viewType);

  const allTasks = (getAppState() || {}).tasks || [];
  let html = '';
  dateActivities.forEach(act => {
    // T229：生命周期徽章（草稿→已发布→进行中→待归档→已执行→已归档），进度+产出共同驱动
    const isBrand = !!act.isBrand;
    const brandTag = isBrand ? badgeHtml('品牌', 'brand') : '';
    if (isParticipant) {
      html += `<div class="inspector-card" data-act-id="${act.id}" style="${isBrand ? 'border-left:3px solid #EAB308;' : ''}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class=" font-bold text-sm text-gray-800 leading-snug flex-1">${act.title}</p>`;
      html += activityLifecycleBadgeHtml(act, allTasks);
      html += '</div>';
      html += `<div class="flex items-center gap-1.5">${brandTag}<p class=" text-xs text-gray-400">活动信息 · 点击查看</p></div>`;
      html += '</div>';
    } else {
      html += `<div class="inspector-card" style="cursor:pointer;${isBrand ? 'border-left:3px solid #EAB308;' : ''}" data-act-id="${act.id}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<div class="flex items-center gap-1.5 flex-1"><p class=" font-bold text-sm text-gray-800 leading-snug">${act.title}</p>${brandTag}</div>`;
      html += activityLifecycleBadgeHtml(act, allTasks);
      html += '</div>';
      html += `<p class=" text-xs text-gray-400">点击查看任务详情 →</p>`;
      html += '</div>';
    }
  });

  if (cardsEl) {
    cardsEl.innerHTML = html;

    if (!isParticipant) {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          setState({ viewMode: 'detail', selectedActivityId: card.dataset.actId });
        });
      });
    } else {
      cardsEl.querySelectorAll('[data-act-id]').forEach(card => {
        card.addEventListener('click', () => {
          const act = dateActivities.find(a => a.id === card.dataset.actId);
          if (act) _showParticipantModal(act);
        });
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  产出物区（T-224 §8 附件查看窗口）
//  同源读取：考勤/考察正式库 + actSubRecords 子记录 + 档案归档记录，
//  投递去向由产出类型派生（OUTPUT_ROUTES 路由表，非人工录入）。
// ════════════════════════════════════════════════════════════════
function _buildOutputsSectionHTML(activity) {
  const actId = activity.id;

  // 考勤数据（正式库，同源）
  const atts = loadAttendanceRecords().filter(r => r.activityId === actId);
  const attRoute = deriveOutputRoute(OutputType.ATTENDANCE);

  // 工作考察（正式库，同源；专班考察不计入活动详情）
  const inss = loadInspectionRecords().filter(r => r.activityId === actId);
  const inspRoute = deriveOutputRoute(OutputType.INSPECTION);

  // 宣传材料（同源：leader actSubRecords.publicity + 宣传委员 archiveRecords）
  // 归档记录以 activityId 为主关联键（2026-08-06 书记裁决），无 activityId 的兜底按活动标题匹配
  const actSubs = (mockDB.actSubRecords && mockDB.actSubRecords[actId]) || {};
  const publicitySubs = actSubs.publicity || [];
  const archiveRecs = (mockDB.archiveRecords || []).filter(r =>
    (r.activityId && r.activityId === actId) || (!r.activityId && r.activityName === activity.title)
  );
  const pubRoute = deriveOutputRoute(OutputType.PUBLICITY);

  // 复盘总结（正式库，同源）
  const review = loadActivityReviews().find(r => r.activityId === actId) || null;
  const reviewRoute = deriveOutputRoute(OutputType.REVIEW);

  // 产出物行：色点 + 名称 + 自动投递去向 + 状态徽标
  const row = (label, route, statusHtml) => `
    <div class="flex items-center gap-2 text-xs py-1">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${route && route.color || '#9CA3AF'};"></span>
      <span class="text-gray-600 flex-shrink-0">${label}</span>
      <span class="text-gray-400 text-[11px] flex-1 truncate">${route ? route.route : ''}</span>
      ${statusHtml}
    </div>`;

  const attStatus = atts.length === 0
    ? badgeHtml('未提交', 'neutral')
    : atts.every(r => r.recordedBy)
      ? badgeHtml(`已确认 ${atts.length}`, 'success')
      : badgeHtml(`待确认 ${atts.filter(r => !r.recordedBy).length}`, 'warning');

  const inspStatus = inss.length === 0
    ? badgeHtml('未提交', 'neutral')
    : inss.every(r => r.status === 'confirmed')
      ? badgeHtml(`已确认 ${inss.length}`, 'success')
      : badgeHtml(`待确认 ${inss.filter(r => r.status !== 'confirmed').length}`, 'warning');

  const pubItems = [
    ...publicitySubs.map(p => ({ title: p.title || '宣传材料', meta: [p.author, p.channel].filter(Boolean).join(' · '), status: '已提交' })),
    ...archiveRecs.map(a => ({ title: `${a.category || '材料'}：${a.activityName}`, meta: [a.archiveDate, a.fileName].filter(Boolean).join(' · '), status: a.status === 'archived' ? '已归档' : (a.status === 'in_progress' ? '归档中' : '待归档') })),
  ];
  const pubStatus = pubItems.length === 0
    ? badgeHtml('未归档', 'neutral')
    : badgeHtml(`${pubItems.length} 项`, 'info');

  const reviewStatus = !review
    ? badgeHtml('未提交', 'neutral')
    : (review.reviewStatus === ReviewStatus.CONFIRMED
      ? badgeHtml('已确认', 'success')
      : badgeHtml(review.reviewStatus || '待处理', 'warning'));

  return `
    <div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
      <div class="flex items-center justify-between mb-1.5">
        <p class="text-xs text-gray-400">产出物</p>
        <span class="text-[11px] text-gray-300">投递去向由类型自动确定</span>
      </div>
      ${row('考勤', attRoute, attStatus)}
      ${row('考察', inspRoute, inspStatus)}
      ${row('宣传', pubRoute, pubStatus)}
      ${row('复盘', reviewRoute, reviewStatus)}
      ${pubItems.length > 0 ? `
        <div class="mt-1.5 pt-1.5 border-t border-gray-100">
          <div class="text-[11px] text-gray-400 mb-1">宣传材料预览：</div>
          ${pubItems.slice(0, 5).map(it => `
            <div class="flex items-center justify-between text-[11px] text-gray-600 py-0.5">
              <span class="truncate pr-2">${it.title}</span>
              <span class="text-gray-400 flex-shrink-0">${it.meta ? it.meta + ' · ' : ''}${it.status}</span>
            </div>`).join('')}
          ${pubItems.length > 5 ? `<div class="text-[11px] text-gray-400">…另有 ${pubItems.length - 5} 项</div>` : ''}
        </div>` : ''}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  分类型关闭条件（T-224 §7）
//  三会一课（党小组会/支委会/党课/支部党员大会）→ 书记关闭：
//    会议纪要 + 请假已确认（缺勤需补课闭环）
//  主题党日 → 书记关闭：
//    考勤确认 + 考察确认 + 复盘确认 + 宣传归档
//  专班 → 组织委员解散（另见 ws-org-commissioner-entry）：
//    考察确认 + 工作量报告
//  产出缺失阻塞关闭，缺失项在关闭入口明确显示（最小信息成本）。
// ════════════════════════════════════════════════════════════════
const MEETING_TYPES = ['党小组会', '支委会', '党课', '支部党员大会'];

export function checkActivityCloseConditions(activity) {
  const actId = activity.id;
  const type = activity.type || '';
  const missing = [];

  const atts = loadAttendanceRecords().filter(r => r.activityId === actId);
  const inss = loadInspectionRecords().filter(r => r.activityId === actId);
  const review = loadActivityReviews().find(r => r.activityId === actId) || null;
  const actSubs = (mockDB.actSubRecords && mockDB.actSubRecords[actId]) || {};
  const pubItems = [
    ...(actSubs.publicity || []),
    ...(mockDB.archiveRecords || []).filter(r =>
      (r.activityId && r.activityId === actId) || (!r.activityId && r.activityName === activity.title)
    ),
  ];

  if (MEETING_TYPES.includes(type)) {
    // 三会一课：请假已确认 + 缺勤补课闭环 + 会议纪要
    const leavePending = atts.filter(r => r.status === AttendanceStatus.LEAVE && !r.recordedBy).length;
    const absentUnclosed = atts.filter(r => r.status === AttendanceStatus.ABSENT).length;
    if (leavePending > 0) missing.push(`请假确认（${leavePending} 条待确认）`);
    if (absentUnclosed > 0) missing.push(`缺勤补课闭环（${absentUnclosed} 人缺勤未补）`);
    if ((actSubs.materials || []).length === 0) missing.push('会议纪要');
  } else if (type === '主题党日') {
    // 主题党日：考勤确认 + 考察确认 + 复盘确认 + 宣传归档
    if (atts.length === 0) {
      missing.push('考勤');
    } else {
      const attPending = atts.filter(r => !r.recordedBy).length;
      if (attPending > 0) missing.push(`考勤确认（${attPending} 条待确认）`);
    }
    if (inss.length === 0) {
      missing.push('考察');
    } else {
      const inspPending = inss.filter(r => r.status !== 'confirmed').length;
      if (inspPending > 0) missing.push(`考察确认（${inspPending} 条待确认）`);
    }
    if (!review || review.reviewStatus !== ReviewStatus.CONFIRMED) missing.push('复盘确认');
    if (pubItems.length === 0) missing.push('宣传归档');
  }
  // 其他活动类型无强制关闭前置

  return { canClose: missing.length === 0, missing };
}

function _showCloseBlockModal(activity, missing) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:var(--radius-lg);padding:20px 22px;max-width:360px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);';
  card.innerHTML =
    `<p class="font-bold text-sm text-gray-800 mb-1">无法关闭「${activity.title}」</p>`
    + '<p class="text-xs text-gray-500 mb-3">以下产出未齐，补齐后方可关闭：</p>'
    + '<ul class="space-y-1.5 mb-4">'
    + missing.map(m =>
        `<li class="text-xs text-red-600 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>${m}</li>`
      ).join('')
    + '</ul>'
    + '<button class="text-sm text-white px-4 py-[7px] rounded-lg w-full transition-colors" style="background:#CE1126;">知道了</button>';
  card.querySelector('button').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  card.addEventListener('click', e => e.stopPropagation());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ════════════════════════════════════════════════════════════════
//  详情视图：渲染单个活动的任务列表与危险操作按钮
// ════════════════════════════════════════════════════════════════
function renderInspectorDetail(activity, tasks, managementRole) {
  const defEl     = document.getElementById('inspector-default');
  const contentEl = document.getElementById('inspector-content');
  const titleEl   = document.getElementById('inspector-date-title');
  const cardsEl   = document.getElementById('inspector-cards');
  if (!defEl || !contentEl) return;

  defEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  if (titleEl) titleEl.textContent = activity.title;

  // 确保 inspector 可见：滚动到视图中
  contentEl.closest('#inspector-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const visibleTasks = filterTasksByManagementRole(tasks, managementRole);
  const themeClass   = ROLE_THEME_CLASS[managementRole] || '';
  const isArchived   = activity.archived === true;
  const _user = AuthStore.getCurrentUser();
  const isSecretary = _user?.role === 'secretary';
  const isBrandActive = !!activity.isBrand;

  let html = '';

  html += '<button id="inspector-back-btn"'
    + ' class=" text-xs text-red-700 hover:text-red-900 mb-3'
    + ' flex items-center gap-1 transition-colors"'
    + ' style="background:none;border:none;cursor:pointer;padding:0;">'
    + '← 返回列表</button>';

  const mgrLabels = {
    'org-commissioner': '组织委员',
    'prop-commissioner': '宣传委员',
    'disc-commissioner': '纪检委员',
    secretary: '党支书',
    organizer: '组织者',
    deep: '深度参与者',
    leader: '党小组组长',
  };
  const mgrLabel = mgrLabels[managementRole] || managementRole;
  const mgrTheme = ROLE_THEME_CLASS[managementRole] || '';
  if (managementRole && managementRole !== 'participant') {
    html += `<div class="inspector-role-banner ${mgrTheme}"><span class="font-semibold">${mgrLabel}</span></div>`;
  }

  html += '<div class="flex items-center gap-1.5 flex-wrap mb-3">';
  // T229：顶部徽章走生命周期态（进度+产出共同驱动；已归档由生命周期态覆盖，不再单独渲染）
  html += activityLifecycleBadgeHtml(activity, tasks);
  if (activity.date) {
    html += `<span class=" text-xs text-gray-400">${activity.date}</span>`;
  }
  html += '</div>';

  // ── 活动信息（复用写入时收集的详情字段：时间/地点/主持人/组织者/参与者/方向/维度/描述）──
  const infoRows = [];
  if (activity.time) infoRows.push({ label: '时间', value: activity.time });
  if (activity.location) infoRows.push({ label: '地点', value: activity.location });
  if (activity.host) infoRows.push({ label: '主持人', value: activity.host });
  if (activity.organizer) {
    const orgPerson = getPersonById(activity.organizer);
    if (orgPerson) infoRows.push({ label: '组织者', value: orgPerson.name });
  }
  let memberNames = [];
  if (Array.isArray(activity.participants)) {
    memberNames = activity.participants.filter(pid => pid !== activity.organizer).map(pid => getPersonById(pid)?.name).filter(Boolean);
  }
  if (memberNames.length === 0 && Array.isArray(activity.assignments)) {
    memberNames = activity.assignments.filter(a => a.role !== 'organizer').map(a => getPersonById(a.personId)?.name).filter(Boolean);
  }
  if (memberNames.length) infoRows.push({ label: '参与者', value: memberNames.join('、') });
  const directionVal = activity._dt_direction || activity.direction;
  if (directionVal) infoRows.push({ label: '发起方向', value: directionVal === 'top-down' ? '自上而下' : directionVal === 'bottom-up' ? '自下而上' : directionVal });
  const durationVal = activity._dt_duration;
  if (durationVal) infoRows.push({ label: '时长', value: durationVal === 'short' ? '短期' : durationVal === 'long' ? '长期' : durationVal });
  const dimParts = [];
  if (activity.isJoint !== undefined && activity.isJoint !== '') dimParts.push(activity.isJoint === 'true' || activity.isJoint === true ? '共建开展' : '独立开展');
  if (activity.isOutdoor !== undefined && activity.isOutdoor !== '') dimParts.push(activity.isOutdoor === 'true' || activity.isOutdoor === true ? '校外' : '校内');
  if (Array.isArray(activity.carriers) && activity.carriers.length) dimParts.push(activity.carriers.join('、'));
  if (dimParts.length) infoRows.push({ label: '活动维度', value: dimParts.join(' · ') });

  if (infoRows.length) {
    html += '<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1">';
    infoRows.forEach(r => {
      html += `<div class="flex items-start gap-2 text-xs"><span class="text-gray-400 flex-shrink-0 w-14">${r.label}</span><span class="text-gray-700">${r.value}</span></div>`;
    });
    html += '</div>';
  }
  if (activity.description) {
    html += `<div class="mb-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"><p class="text-xs text-gray-400 mb-1">活动详情</p><p class="text-xs text-gray-700 leading-relaxed">${activity.description}</p></div>`;
  }

  // ── 产出物区（T-224 §8 附件查看窗口：同源读取，点击展开预览） ──
  html += _buildOutputsSectionHTML(activity);

  if (visibleTasks.length > 0) {
    // 2026-08-10 书记裁定（设计原则 11）：进度指标只显未完成类——「已完成 N/总数」无信息增量，
    // 仅保留待完成数（>0 时有提示价值；全部完成时无未完成=无需提示，不渲染）。
    const pendingCount = visibleTasks.filter(t => t.status !== 'completed').length;
    if (pendingCount > 0) {
      html += `<p class=" text-xs text-gray-500 mb-3">待完成 ${pendingCount} 项</p>`;
    }
  }

  if (visibleTasks.length > 0) {
    visibleTasks.forEach(t => {
      const cardClass = themeClass ? `inspector-card ${themeClass}` : 'inspector-card';
      html += `<div class="${cardClass}">`;
      html += `<div class="flex items-start justify-between gap-2 mb-1">`;
      html += `<p class=" font-bold text-sm leading-snug flex-1">${t.title}</p>`;
      // T-217 §2.4：任务状态由行内 select 改为 status-badge（色点+文字+悬浮选择器）
      html += statusBadgeHtml(t.status, {
        statuses: TASK_STATUSES,
        disabled: isArchived,
        attrs: `data-task-id="${t.id}"`,
      });
      html += '</div>';
      html += '</div>';
    });
  } else if (tasks.length > 0) {
    html += '<div class=" text-gray-400 text-center py-8">该角色在此活动中暂无专属任务节点</div>';
  } else {
    html += '<p class=" text-xs text-gray-400 py-2">暂无关联任务</p>';
  }

  if (isSecretary && !isArchived) {
    html += '<div class="mt-3">';
    html += `<button id="inspector-brand-toggle-btn" class=" text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1" style="${isBrandActive ? '--acc-bg-dark:rgba(251,191,36,0.16);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.35);background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);' : '--acc-bg-dark:rgba(251,191,36,0.10);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.25);background:rgba(234,179,8,0.06);color:#92400E;border:1px solid rgba(234,179,8,0.25);'}">${isBrandActive ? icon('starFilled', { className: 'w-3 h-3' }) + ' 取消品牌认定' : icon('starOutline', { className: 'w-3 h-3' }) + ' 标记为品牌活动'}</button>`;
    html += '</div>';
  }

  html += '<div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">';
  if (isArchived) {
    html += '<button id="inspector-restore-btn"'
      + ' class=" text-xs text-green-700 hover:text-green-900 px-3 py-1.5 rounded-lg transition-colors"'
      + ' style="--acc-bg-dark:rgba(52,211,153,0.16);--acc-text-dark:#34D399;--acc-border-dark:rgba(52,211,153,0.35);background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.40);">恢复活动</button>';
  } else {
    html += '<button id="inspector-archive-btn"'
      + ' class=" text-xs text-orange-700 hover:text-orange-900 px-3 py-1.5 rounded-lg transition-colors"'
      + ' style="--acc-bg-dark:rgba(251,191,36,0.16);--acc-text-dark:#FBBF24;--acc-border-dark:rgba(251,191,36,0.35);background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.40);">归档活动</button>';
  }
  html += '<button id="inspector-delete-btn"'
    + ' class=" text-xs text-red-700 hover:text-red-900 px-3 py-1.5 rounded-lg transition-colors"'
    + ' style="--acc-bg-dark:rgba(248,113,113,0.16);--acc-text-dark:#F87171;--acc-border-dark:rgba(248,113,113,0.35);background:rgba(239,68,68,0.10);border:1px solid rgba(239,68,68,0.40);">删除活动</button>';
  html += '</div>';

  if (!cardsEl) return;
  cardsEl.innerHTML = html;

  if (!isArchived) {
    cardsEl.querySelectorAll('[data-status-badge]').forEach(badge => {
      bindStatusBadge(badge, {
        statuses: TASK_STATUSES,
        onChange: async (newStatus) => {
          const taskId = badge.dataset.taskId;
          const newTasks = BranchService.updateTask(taskId, { status: newStatus });
          // T-218：进度驱动活动状态——任务变更后重算活动执行态并落库
          // （BranchService 直写路径仅 saveDB() 本地，必须显式 persist() 写穿服务器）
          const newActStatus = deriveActivityExecutionStatus(activity, newTasks);
          if (newActStatus !== activity.status) {
            await BranchService.updateActivity(activity.id, { status: newActStatus });
          }
          setState({
            tasks: newTasks,
            activities: getAppState().activities.map(a => (a.id === activity.id ? { ...a, status: newActStatus } : a)),
          });
          persist();
        },
      });
    });
  }

  const brandToggleBtn = document.getElementById('inspector-brand-toggle-btn');
  if (brandToggleBtn) {
    brandToggleBtn.addEventListener('click', async () => {
      const action = isBrandActive ? '取消品牌认定' : '标记为品牌活动';
      if (!window.confirm(`确认${action}？`)) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.toggleBrand(activity.id);
        const activities = await BranchService.listActivities();
        setState({ status: STATE.IDLE, activities });
        showToast('success', `${action}成功`);
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) || '操作失败');
      }
    });
  }

  const backBtn = document.getElementById('inspector-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setState({ viewMode: 'list', selectedActivityId: null });
    });
  }

  const restoreBtn = document.getElementById('inspector-restore-btn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      if (!window.confirm('确认将该活动恢复至主视图？')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.updateActivity(activity.id, { archived: false });
        persist(); // 扎口修复（Z1/Z3）：updateActivity 内部不落盘，必须显式 persist 写穿
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null, viewArchived: false });
        showToast('success', '活动已恢复，可在主视图中查看。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '恢复失败，请稍后重试。');
      }
    });
  }

  const archiveBtn = document.getElementById('inspector-archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', async () => {
      // T-224 §7 分类型关闭条件：产出缺失阻塞归档，缺失项明确显示
      const { canClose, missing } = checkActivityCloseConditions(activity);
      if (!canClose) {
        _showCloseBlockModal(activity, missing);
        return;
      }
      if (!window.confirm('确认归档该活动？它将从主视图消失。')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.archiveActivity(activity.id);
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null });
        showToast('success', '活动已归档。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '归档失败，请稍后重试。');
      }
    });
  }

  const deleteBtn = document.getElementById('inspector-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!window.confirm('警告：彻底删除该活动及关联数据？')) return;
      try {
        setState({ status: STATE.SUBMITTING });
        await BranchService.deleteActivity(activity.id);
        const [activities, tasks2] = await Promise.all([
          BranchService.listActivities(),
          typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([]),
        ]);
        setState({ status: STATE.IDLE, activities, tasks: tasks2, viewMode: 'list', selectedActivityId: null });
        showToast('success', '活动已删除。');
      } catch (err) {
        setState({ status: STATE.ERROR, error: err });
        showToast('error', (err && err.message) ? err.message : '删除失败，请稍后重试。');
      }
    });
  }
}
