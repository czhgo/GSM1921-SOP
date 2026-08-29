﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// activity-entry.js — 活动/专班统一详情页入口（T233 报名渠道）
//  URL 前缀分流：act-* 渲染活动详情，tf-* 渲染专班详情。
//  报名区仅在「可报名」时展示（活动 published/ongoing 且日期未过、专班 recruiting 且未截止）。
import { renderSidebar } from '../components/sidebar.js?v=20260829r';
import { renderHeader } from '../components/header.js?v=20260829r';
import { BranchService } from '../services/runtime.js?v=20260829r';
import { mockDB } from '../core/domain.js?v=20260829r';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260829r';
import { NoticeStore } from '../services/notice.js?v=20260829r';
import { SignupStore } from '../services/signup.js?v=20260829r';
import { AuthStore } from '../services/auth.js?v=20260829r';
import { getPersonById } from '../mock/index.js?v=20260829r';
import { getBasePath } from '../core/utils.js?v=20260829r';
import { getActivityTypeColors } from '../core/constants.js?v=20260829r';
import { badgeHtml } from '../components/badge.js?v=20260829r';
import { enhanceSelects } from '../components/custom-select.js?v=20260829r';
import { canSignup as _canSignup, renderSignupSection, renderSignupList, bindSignupEvents, roleLabel } from '../components/signup-panel.js?v=20260829r';
import { renderShareButtonHtml, bindShareButton } from '../components/share-button.js?v=20260829r';

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
  // 活动类型标签色：金系用深金 text（浅底可读），红系回退 dot（_ACTIVITY_TYPE_BASE 无 color 字段）
  const tagColor = typeColor.text || typeColor.dot || '#6B7280';
  const tagColorDark = { '#CE1126': '#F87171', '#A16207': '#FBBF24', '#FFD700': '#FDE68A' }[tagColor] || '#94A3B8';
  const organizerName = act.organizer ? (getPersonById(act.organizer)?.name || act.organizer) : '—';
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'activity' && s.sourceId === act.id);
  const assignments = Array.isArray(act.assignments) ? act.assignments : [];
  const canSignup = _canSignup('activity', act);

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${statusBadge(act.status)}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="background:${tagColor}14;color:${tagColor};--acc-bg-dark:${tagColorDark}24;--acc-text-dark:${tagColorDark};">${act.type || '活动'}</span>
        <span class="text-xs text-gray-400">${act.id}</span>
        <span class="ml-auto">${renderShareButtonHtml()}</span>
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

    ${canSignup ? renderSignupSection({ sourceType: 'activity', sourceId: act.id, title: act.title, signups, myId }) : ''}

    <!-- 报名名单 -->
    ${renderSignupList({ sourceType: 'activity', sourceId: act.id, signups, myId })}

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

  // 报名区 select 增强为统一自定义下拉（本页无 bootstrap 全局 MutationObserver）
  enhanceSelects(cardEl);
  bindSignupEvents({ sourceType: 'activity', sourceId: act.id, title: act.title, myId, cardEl });
  bindShareButton(cardEl);
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
        <span class="ml-auto">${renderShareButtonHtml()}</span>
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

    ${canSignup ? renderSignupSection({ sourceType: 'taskforce', sourceId: tf.id, title: tf.name, signups, myId }) : ''}

    <!-- 报名名单 -->
    ${renderSignupList({ sourceType: 'taskforce', sourceId: tf.id, signups, myId })}

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

  // 报名区 select 增强为统一自定义下拉（本页无 bootstrap 全局 MutationObserver）
  enhanceSelects(cardEl);
  bindSignupEvents({ sourceType: 'taskforce', sourceId: tf.id, title: tf.name, myId, cardEl });
  bindShareButton(cardEl);
}
