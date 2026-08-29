// role: [工程师]+[AI]
// taskforce-view.js — 只读专班查看组件（知情权组件，书记 2026-08-08 裁定）
// 供无专班 tab 的工作台（党支书/党小组组长/纪检委员等）承载 taskforceId 跳转落点：
// 专班列表（状态分组）+ 只读详情（成员/角色/贡献）。依据书记第五轮裁定「新建专班查看组件（列表+详情）」。
// 书记设计原则：「无职责 不代表 没有知情权」。

import { TaskForceRecordStore } from '../services/taskforce.js?v=20260829h';
import { _personName } from '../mock/index.js?v=20260829h';
import { badgeHtml } from './badge.js?v=20260829h';
import { dotDarkVars } from '../core/constants.js?v=20260829h';
import { flashHighlight } from '../core/utils.js?v=20260829h';

const STATUS_LABEL = { draft: '草稿', pending_review: '待审核', recruiting: '招募中', active: '运行中', completed: '已完结', archived: '已归档' };
const STATUS_COLOR = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', archived: '#6B7280', draft: '#6B7280' };
// 内联徽章深色亮色映射（深色下提亮一档，由 html.theme-dark [style*="--acc-bg-dark"] 规则应用）
const STATUS_COLOR_DARK = { pending_review: '#A5B4FC', recruiting: '#FBBF24', active: '#34D399', completed: '#60A5FA', archived: '#94A3B8', draft: '#94A3B8' };
// 内联徽章双套色：日 = 原色 15% 透明底 + 原色字；夜 = 亮色 24% 透明底 + 亮色字
function statusBadgeStyle(status) {
  const c = STATUS_COLOR[status] || '#6B7280';
  const dc = STATUS_COLOR_DARK[status] || '#94A3B8';
  return `background:${c}15;color:${c};--acc-bg-dark:${dc}24;--acc-text-dark:${dc}`;
}

/**
 * 渲染只读专班查看视图
 * @param {HTMLElement} container — 工作台 tab 内容容器（#xxx-tab-content）
 * @param {Object} [opts]
 * @param {Array}  [opts.taskforces] — 专班数据（缺省回退 TaskForceRecordStore）
 * @param {string} [opts.highlightId] — URL 携带的 taskforceId（定位+高亮该专班）
 */
export function renderTaskforceView(container, opts = {}) {
  if (!container) return;
  const taskforces = opts.taskforces || TaskForceRecordStore.getAll() || [];
  const highlightId = opts.highlightId || null;

  // 骨架（首次渲染，tab 重渲染时保留容器）
  if (container.dataset.tfvInited !== '1') {
    container.dataset.tfvInited = '1';
    container.innerHTML = `
      <div class="card rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">专班查看</h3>
          <span class="text-xs text-gray-400">全支部专班一览 · 点击卡片查看详情（只读）</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-3">
          <input type="text" id="tfv-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
        </div>
        <div id="tfv-list"></div>
        <div id="tfv-detail" class="hidden card rounded-xl p-5 mt-4"></div>
      </div>`;
  }

  // 搜索过滤
  const searchEl = container.querySelector('#tfv-search');
  const q = (searchEl?.value || '').trim().toLowerCase();
  const filtered = q
    ? taskforces.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q))
    : taskforces;

  // T223 排序统一：桶内 createdAt 降序（新者在前），与组织委员专班管理看板一致
  const sortTfByNew = (arr) => [...arr].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // 状态分组（与组织委员专班管理一致的组序：待审核/招募中/运行中/已完结）
  const groups = [
    { key: 'pending_review', label: '待审核', color: '#6366F1', list: sortTfByNew(filtered.filter(t => t.status === 'pending_review' || t.status === 'draft')) },
    { key: 'recruiting',     label: '招募中', color: '#D97706', list: sortTfByNew(filtered.filter(t => t.status === 'recruiting')) },
    { key: 'active',         label: '运行中', color: '#10B981', list: sortTfByNew(filtered.filter(t => t.status === 'active')) },
    { key: 'completed',      label: '已完结', color: '#3B82F6', list: sortTfByNew(filtered.filter(t => t.status === 'completed' || t.status === 'archived')) },
  ];

  const listEl = container.querySelector('#tfv-list');
  if (listEl) {
    const hasAny = groups.some(g => g.list.length > 0);
    listEl.innerHTML = !hasAny
      ? '<p class="text-sm text-gray-400 text-center py-8">暂无专班</p>'
      : groups.filter(g => g.list.length > 0).map(g => `
          <div class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-block w-2 h-2 rounded-full" style="${dotDarkVars(g.color)}background:${g.color};"></span>
              <span class="font-title-cn text-sm font-bold text-gray-700">${g.label}</span>
              <span class="text-xs text-gray-400">${g.list.length}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${g.list.map(t => _renderTfCard(t)).join('')}
            </div>
          </div>
        `).join('');
  }

  // 卡片点击 → 只读详情
  container.querySelectorAll('.tfv-card').forEach(card => {
    if (card.dataset.bound) return;
    card.dataset.bound = '1';
    card.addEventListener('click', () => {
      const tfId = card.dataset.tfId;
      const tf = taskforces.find(r => r.id === tfId);
      if (tf) _renderTfDetail(container, tf, highlightId);
      // 点击即褪去定位高亮
      card.classList.remove('nav-flash-highlight');
    });
  });

  // 搜索输入即时过滤
  if (searchEl) searchEl.oninput = () => renderTaskforceView(container, opts);

  // 定位高亮（定时自动褪去，书记 2026-08-08 裁定）
  if (highlightId) {
    setTimeout(() => {
      const card = container.querySelector(`.tfv-card[data-tf-id="${highlightId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(card);
        // 通知调用方：定位完成，可清除导航目标（防重渲染反复定位）
        if (typeof opts.onLocated === 'function') opts.onLocated();
      }
    }, 180);
  }
}

/** 专班卡片（只读，无流转按钮） */
function _renderTfCard(t) {
  const filled = (t.members || []).filter(m => m.personId).length;
  const color = STATUS_COLOR[t.status] || '#6B7280';
  return `
    <div class="tfv-card p-4 rounded-xl bg-white border border-gray-100 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="badge" style="${statusBadgeStyle(t.status)}">${STATUS_LABEL[t.status] || t.status}</span>
      </div>
      ${t.task ? `<p class="text-xs text-gray-500 mb-2 line-clamp-2">${t.task}</p>` : ''}
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>${filled}/${t.capacity || 0} 人</span>
        ${t.deadline ? `<span>截止 ${t.deadline}</span>` : ''}
      </div>
    </div>`;
}

/** 只读详情：基本信息 + 成员工作量汇总 */
function _renderTfDetail(container, tf, highlightId) {
  const panel = container.querySelector('#tfv-detail');
  if (!panel) return;
  panel.classList.remove('hidden');
  const filled = (tf.members || []).filter(m => m.personId);

  const memberRows = filled.length === 0
    ? '<p class="text-xs text-gray-400">暂无成员</p>'
    : filled.map(m => {
        const contribs = (m.contributions || []).length;
        const list = contribs > 0
          ? `<ul class="mt-1 space-y-0.5">${(m.contributions || []).map(c =>
              `<li class="text-[12px] text-gray-400 pl-2">${typeof c === 'string' ? c : (c.description || c.title || JSON.stringify(c))}</li>`
            ).join('')}</ul>`
          : '<span class="text-[12px] text-gray-300 pl-2">暂无贡献记录</span>';
        return `
          <div class="py-2 border-b border-gray-50 last:border-b-0">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
              <div class="flex items-center gap-2">
                ${badgeHtml(m.role || '深度参与者', 'neutral')}
                <span class="text-xs text-gray-400">贡献 ${contribs} 项</span>
              </div>
            </div>
            ${list}
          </div>`;
      }).join('');

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-2 mb-3">
      <h4 class="font-title-cn text-sm font-bold text-gray-800">${tf.name}</h4>
      <span class="badge" style="${statusBadgeStyle(tf.status)}">${STATUS_LABEL[tf.status] || tf.status}</span>
    </div>
    <div class="space-y-1.5 text-xs text-gray-600 mb-4">
      ${tf.task ? `<p><span class="text-gray-400">任务：</span>${tf.task}</p>` : ''}
      <p><span class="text-gray-400">人数：</span>${filled.length}/${tf.capacity || 0}</p>
      ${tf.deadline ? `<p><span class="text-gray-400">截止：</span>${tf.deadline}</p>` : ''}
      ${tf.initiator ? `<p><span class="text-gray-400">发起人：</span>${_personName(tf.initiator)}</p>` : ''}
    </div>
    <div class="pt-3 border-t border-gray-100">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">成员与工作量</h5>
      ${memberRows}
    </div>`;
}
