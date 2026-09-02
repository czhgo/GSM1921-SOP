﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  taskforce-entry.js — 专班详情独立入口
//  书记 2026-08-11 裁定：专班拥有自己的界面与数据集（便于长期共享）。
//  数据源 TaskForceRecordStore（独立持久化 workflowos_taskforces_v1），
//  报名面板复用 signup-panel.js 组件（与活动详情页共用，避免重复散落）。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../components/sidebar.js?v=20260901r';
import { renderHeader } from '../components/header.js?v=20260901r';
import { BranchService } from '../services/runtime.js?v=20260901r';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260901r';
import { NoticeStore } from '../services/notice.js?v=20260901r';
import { SignupStore } from '../services/signup.js?v=20260901r';
import { AuthStore } from '../services/auth.js?v=20260901r';
import { getPersonById } from '../mock/index.js?v=20260901r';
import { getBasePath } from '../core/utils.js?v=20260901r';
import { badgeHtml } from '../components/badge.js?v=20260901r';
import { enhanceSelects } from '../components/custom-select.js?v=20260901r';
import { canSignup, renderSignupSection, renderSignupList, bindSignupEvents, roleLabel } from '../components/signup-panel.js?v=20260901r';
import { renderShareButtonHtml, bindShareButton } from '../components/share-button.js?v=20260901r';

renderSidebar('dashboard');
renderHeader('dashboard');

BranchService.loadDB();
TaskForceRecordStore.init();
NoticeStore.init();
SignupStore.init();

const cardEl = document.getElementById('taskforce-detail-card');
const backBtn = document.getElementById('taskforce-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const currentUser = AuthStore.getCurrentUser();
const myId = currentUser?.personId || '';

/** 状态 → 徽章（专班专用） */
const STATUS_BADGE = {
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
//  入口：仅接受 tf-* 专班 id
// ════════════════════════════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const sourceId = params.get('id') || '';

if (!sourceId) {
  if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">未指定专班</p>';
} else {
  const tf = TaskForceRecordStore.getAll().find(t => t.id === sourceId);
  if (!tf) {
    if (cardEl) cardEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-12">专班不存在或已解散</p>';
  } else {
    renderTaskforce(tf);
  }
}

// ════════════════════════════════════════════════════════════════
//  专班详情
// ════════════════════════════════════════════════════════════════

function renderTaskforce(tf) {
  if (!cardEl) return;
  const signups = SignupStore.getAll().filter(s => s.sourceType === 'taskforce' && s.sourceId === tf.id);
  const members = Array.isArray(tf.members) ? tf.members : [];
  const openForSignup = canSignup('taskforce', tf);
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

    ${openForSignup ? renderSignupSection({ sourceType: 'taskforce', sourceId: tf.id, title: tf.name, signups, myId }) : ''}

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
