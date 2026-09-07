// role: [工程师]+[AI]
// 参与者工作台 Tab：项目分工（T-279 M3 拆分，照 M2 样板）
// 书记 2026-08-10 裁定第5点：区分「我的分工」（以人为中心）与「全局分工」（全局查询）。
// REVIEW_QUEUE J2 裁定（2026-08-08）：首页专班跳转 → 项目分工 tab 定位高亮专班卡片（ctx.highlightTfId 一次性消费）。

import { PersonStore } from '../../../services/person.js?v=20260907b';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
const PEOPLE = PersonStore.getMembers();
import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { ROLE_COLORS } from '../../../core/constants.js?v=20260903c';
import { flashHighlight } from '../../../core/utils.js?v=20260903c';

// 项目分工子视图（书记 2026-08-10 裁定第5点）：区分「我的分工」（以人为中心）与「全局分工」（全局查询）
let _projSubView = 'mine'; // 'mine' | 'all'
// 首页专班跳转定位目标（快照自 ctx，一次性消费后清除）
let _highlightTfId = null;

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const activities = ctx.activities || [];
  const taskforces = ctx.allTf || [];
  const authRecords = ctx.authRecords || [];
  _highlightTfId = ctx.highlightTfId || null;

  // 构建统一项目列表：活动 + 专班
  const actProjects = activities
    .filter(a => !a.archived && a.status !== 'cancelled')
    .map(a => {
      // 人员：从 assignments + authRecords 合并
      const personnel = _buildPersonnel(a.id, a.assignments || [], authRecords);
      const organizer = PEOPLE.find(p => p.id === a.organizer);
      return {
        id: a.id,
        name: a.title || '未命名',
        type: '活动',
        typeBadge: a.type || '活动',
        group: organizer ? organizer.partyGroup : '',
        status: _actStatusLabel(a.status),
        statusColor: _actStatusColor(a.status),
        date: a.date || '',
        personnel,
        done: a.archived || ['completed', 'cancelled'].includes(a.status),
      };
    });

  const tfProjects = taskforces.map(t => {
    const personnel = _buildPersonnelFromTf(t, authRecords);
    return {
      id: t.id,
      name: t.name || '未命名',
      type: '专班',
      typeBadge: '专班',
      group: '',
      status: _tfStatusLabel(t.status),
      statusColor: _tfStatusColor(t.status),
      date: t.deadline || t.createdAt || '',
      personnel,
      done: ['completed', 'archived', 'dissolved'].includes(t.status),
    };
  });

  // T223 排序统一：未完成在前、已完成在后，组内按时间降序（新者在前）
  const allProjects = [...actProjects, ...tfProjects].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (b.date || '').localeCompare(a.date || '');
  });

  // 党小组列表（用于筛选）
  const partyGroups = [...new Set(PEOPLE.map(p => p.partyGroup).filter(Boolean))].sort();

  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  // 首页专班跳转定位：目标专班可能不在「我的分工」中 → 强制切全局分工视图后再定位
  if (_highlightTfId) _projSubView = 'all';

  // 子视图切换（书记 2026-08-10 裁定第5点）：我的分工（以人为中心）/ 全局分工（全局查询）
  const subTabs = [
    { key: 'mine', label: '我的分工' },
    { key: 'all', label: '全局分工' },
  ];
  const subTabsHtml = `
    <div class="flex items-center gap-2 mb-3">
      ${subTabs.map(t => `
        <button type="button"
          class="visitor-proj-sub px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${_projSubView === t.key ? 'bg-[var(--app-accent-bg)] border-[var(--app-accent)] text-[var(--app-accent)]' : 'bg-white border-neutral-200 text-gray-600 hover:bg-gray-50'}"
          data-proj-subview="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  tc.innerHTML = `
    ${subTabsHtml}
    <div class="flex flex-wrap gap-2 mb-3 items-center">
      <select id="visitor-proj-type" class="input-flat w-20">
        <option value="">全部</option>
        <option value="活动">活动</option>
        <option value="专班">专班</option>
      </select>
      <select id="visitor-proj-group" class="input-flat w-28">
        <option value="">全部党小组</option>
        ${partyGroups.map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
      <input type="text" id="visitor-proj-search" class="input-flat flex-1 min-w-[140px]" placeholder="搜索项目名称或人员...">
      <span id="visitor-proj-count" class="text-xs text-gray-400 ml-1"></span>
    </div>
    <div id="visitor-proj-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-proj-list');
    const countEl = document.getElementById('visitor-proj-count');
    if (!listEl) return;
    const typeFilter = document.getElementById('visitor-proj-type')?.value || '';
    const groupFilter = document.getElementById('visitor-proj-group')?.value || '';
    const q = (document.getElementById('visitor-proj-search')?.value || '').trim().toLowerCase();

    // 子视图基准：我的分工 = 我参与的项目（以人为中心）；全局分工 = 全部项目
    const base = _projSubView === 'mine'
      ? allProjects.filter(p => p.personnel.some(pm => pm.personId === currentUserId))
      : allProjects;

    const filtered = base.filter(p => {
      if (typeFilter && p.type !== typeFilter) return false;
      if (groupFilter && p.group !== groupFilter) return false;
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const personnelMatch = p.personnel.some(pm => pm.name.toLowerCase().includes(q));
        if (!nameMatch && !personnelMatch) return false;
      }
      return true;
    });

    if (countEl) countEl.textContent = `${filtered.length} 个项目`;

    const emptyText = _projSubView === 'mine' && !filtered.length
      ? '你暂未参与任何项目'
      : '无匹配项目';
    listEl.innerHTML = filtered.length === 0
      ? `<p class="text-xs text-gray-400 text-center py-6">${emptyText}</p>`
      : `<div class="space-y-2">${filtered.map(p => _renderProjectCard(p, currentUserId)).join('')}</div>`;

    // T-304 第5轮 P8：专班卡片点击直达详情页（含报名入口）——补 visitor 报名可达性
    // （此前报名入口仅独立页 taskforce.html 可达，工作台内卡片无跳转 = 报名断链）
    listEl.querySelectorAll('.visitor-proj-card[data-tf-id]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        const tfId = card.dataset.tfId;
        const base = window.location.pathname.includes('/workspace/') ? '../' : '';
        window.location.href = `${base}taskforce.html?id=${tfId}`;
      });
    });

    // REVIEW_QUEUE J2 裁定（2026-08-08）：首页专班跳转 → 项目分工 tab 定位高亮专班卡片
    if (_highlightTfId) {
      const target = listEl.querySelector(`.visitor-proj-card[data-tf-id="${_highlightTfId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(target);
      }
      _highlightTfId = null; // 一次性消费
      if (typeof ctx.onNavLocated === 'function') ctx.onNavLocated();
    }
  }

  tc.querySelectorAll('.visitor-proj-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      _projSubView = btn.dataset.projSubview;
      tc.querySelectorAll('.visitor-proj-sub').forEach(b => {
        const active = b === btn;
        b.classList.toggle('bg-[var(--app-accent-bg)]', active);
        b.classList.toggle('border-[var(--app-accent)]', active);
        b.classList.toggle('text-[var(--app-accent)]', active);
        b.classList.toggle('bg-white', !active);
        b.classList.toggle('border-neutral-200', !active);
        b.classList.toggle('text-gray-600', !active);
      });
      renderList();
    });
  });

  document.getElementById('visitor-proj-type')?.addEventListener('change', renderList);
  document.getElementById('visitor-proj-group')?.addEventListener('change', renderList);
  document.getElementById('visitor-proj-search')?.addEventListener('input', renderList);
  renderList();
}

function _buildPersonnel(projectId, assignments, authRecords) {
  // 合并 assignments（mock）+ authRecords（运行时赋权）
  const map = new Map(); // personId → { name, role, personId }
  for (const a of assignments) {
    const person = PEOPLE.find(p => p.id === a.personId);
    if (person) map.set(a.personId, { name: person.name, role: a.role, personId: a.personId });
  }
  for (const r of authRecords) {
    if (r.scopeRef === projectId && ['organizer', 'deep'].includes(r.role)) {
      const person = PEOPLE.find(p => p.id === r.targetPersonId);
      if (person && !map.has(r.targetPersonId)) {
        map.set(r.targetPersonId, { name: person.name, role: r.role, personId: r.targetPersonId });
      }
    }
  }
  return [...map.values()];
}

function _buildPersonnelFromTf(tf, authRecords) {
  const map = new Map();
  // members 数组
  if (Array.isArray(tf.members)) {
    for (const m of tf.members) {
      if (!m.personId) continue;
      const person = PEOPLE.find(p => p.id === m.personId);
      if (person) map.set(m.personId, { name: person.name, role: m.role, personId: m.personId });
    }
  }
  // initiator
  if (tf.initiator) {
    const person = PEOPLE.find(p => p.id === tf.initiator);
    if (person && !map.has(tf.initiator)) {
      map.set(tf.initiator, { name: person.name, role: 'initiator', personId: tf.initiator });
    }
  }
  // authRecords 补充
  for (const r of authRecords) {
    if (r.scopeRef === tf.id && ['organizer', 'deep'].includes(r.role)) {
      const person = PEOPLE.find(p => p.id === r.targetPersonId);
      if (person && !map.has(r.targetPersonId)) {
        map.set(r.targetPersonId, { name: person.name, role: r.role, personId: r.targetPersonId });
      }
    }
  }
  return [...map.values()];
}

function _actStatusLabel(status) {
  // 2026-08-07：活动状态与全站生命周期语义对齐（"已完成"不再是活动字面状态）
  const map = { completed: '已执行', ongoing: '进行中', published: '已发布', draft: '草稿', cancelled: '已取消' };
  return map[status] || status || '进行中';
}
function _actStatusColor(status) {
  const map = { completed: 'bg-green-100 text-green-700', ongoing: 'bg-green-100 text-green-700', published: 'bg-blue-100 text-blue-700', draft: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-600' };
  return map[status] || 'bg-gray-100 text-gray-500';
}
function _tfStatusLabel(status) {
  // 2026-09-02 书记裁决（漂移②）：专班状态词全站统一 —— 内部工作台/首页为「运行中/已完结」，
  // 公共活动页此前误用任务态「进行中/已完成」，一并对齐
  const map = { recruiting: '招募中', active: '运行中', completed: '已完结', dissolved: '已解散', draft: '草稿' };
  return map[status] || status || '运行中';
}
function _tfStatusColor(status) {
  const map = { recruiting: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', dissolved: 'bg-red-100 text-red-600', draft: 'bg-yellow-100 text-yellow-700' };
  return map[status] || 'bg-gray-100 text-gray-500';
}

function _personnelRoleLabel(role) {
  const map = { organizer: '组织者', deep: '深度参与', participant: '参与者', initiator: '发起人' };
  return map[role] || role;
}
function _personnelRoleColor(role) {
  // 角色色统一来自 ROLE_COLORS（organizer=天蓝 / deep=紫 / participant=灰 / initiator=靛蓝），
  // 与活动类型暖色系（红/金）彻底区分，避免"红色太多、意义不明确"（书记 2026-08-01 决策）
  // ROLE_COLORS 经 _applyDark 生成 bgDark/textDark/borderDark，一并输出做深色适配
  const c = ROLE_COLORS[role] || ROLE_COLORS.participant;
  return `--acc-bg-dark:${c.bgDark};--acc-text-dark:${c.textDark};--acc-border-dark:${c.borderDark};background:${c.bg};color:${c.text};border:1px solid ${c.border};`;
}

function _renderProjectCard(project, currentUserId) {
  const organizers = project.personnel.filter(p => p.role === 'organizer' || p.role === 'initiator');
  const deepParticipants = project.personnel.filter(p => p.role === 'deep');
  const others = project.personnel.filter(p => p.role === 'participant');

  // 人员徽章：「我」参与的项目中，本人徽章加红色描边 + 「·我」标记（以人为中心的直观表现）
  const badge = (p, withRole) => {
    const isMe = !!(currentUserId && p.personId && p.personId === currentUserId);
    return `
      <span class="badge inline-flex items-center gap-0.5" style="${_personnelRoleColor(p.role)}${isMe ? 'box-shadow:0 0 0 1.5px rgba(206,17,38,0.45);' : ''}">${p.name}${withRole ? '·' + _personnelRoleLabel(p.role) : ''}${isMe ? '<span class="text-[10px] font-bold" style="color:#CE1126;">·我</span>' : ''}</span>`;
  };

  return `
    <div class="visitor-proj-card p-3 rounded-lg bg-white" data-tf-id="${project.type === '专班' ? project.id : ''}">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border ${project.type === '活动' ? 'text-red-700 border-red-200' : 'text-amber-700 border-amber-200'}">${project.typeBadge}</span>
          <p class="text-sm font-medium text-gray-800 truncate">${project.name}</p>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${project.statusColor}">${project.status}</span>
      </div>
      <div class="flex items-center gap-3 text-[12px] text-gray-500 mb-2">
        ${project.group ? `<span class="flex items-center gap-0.5">${project.group}</span>` : ''}
        ${project.date ? `<span class="flex items-center gap-0.5">${project.date}</span>` : ''}
      </div>
      ${project.personnel.length > 0 ? `
        <div class="flex flex-wrap gap-1.5">
          ${organizers.map(p => badge(p, true)).join('')}
          ${deepParticipants.map(p => badge(p, true)).join('')}
          ${others.map(p => badge(p, false)).join('')}
        </div>
      ` : '<p class="text-xs text-gray-400">暂无人员</p>'}
    </div>
  `;
}
