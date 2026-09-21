// role: [工程师]+[AI]
// 参与者工作台 Tab：项目分工（T-279 M3 拆分，照 M2 样板）
// 支书 2026-08-10 裁定第5点：区分「我的分工」（以人为中心）与「全局分工」（全局查询）。
// REVIEW_QUEUE J2 裁定（2026-08-08）：首页专班跳转 → 项目分工 tab 定位高亮专班卡片（ctx.highlightTfId 一次性消费）。

import { liveMembers, PersonStore } from '../../../services/person.js?v=20260921l';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { AuthStore } from '../../../services/auth.js?v=20260921l';
import { ROLE_COLORS } from '../../../core/constants.js?v=20260921l';
// 活动「仍在办」口径单一源（2026-09-13 收敛）：替代手写 !archived && status!=='cancelled'
import { isActivityLive } from '../../../core/constants.js?v=20260921l';
import { flashHighlight } from '../../../core/utils.js?v=20260921l';
// 党小组筛选项单一源（活组按 seq 升序；2026-09-14 批次 29 收敛，原从成员档案派生）
import { groupOptions } from '../../../services/party-group.js?v=20260921l';
// 活动生命周期展示态单一源（2026-09-13 支书裁定：「活动与专班是并列的概念，各走各的」）——
// 活动状态文案改走 components/inspector.js，专班状态词维持各自来源，不强行统一。
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from '../../../components/inspector.js?v=20260921l';
import { getAppState } from '../../../core/state.js?v=20260921l';
// 统一检索引擎（支书 2026-09-14 裁定）：手写 lf-bar 筛选整体收敛为 keyword + facets + 分页
import { renderFilteredList } from '../../../components/list-filter.js?v=20260921l';
// 「我的任务」承担人单一源（2026-09-19 批次 93 · SOP-B-31）：按项目内身份读，复用组织者身份单一源
import { listMyProjectTasks } from '../../../services/activity.js?v=20260921l';

// 子视图（`SOP-B-31` 已定口径一）：**主口径＝「我的任务」**（按「我」切），
// 「项目分工」是**同一份事实的转置**（按「项目」切）——同一份数据、两种切法，不建第二份清单。
// 另保留既有「我的分工 / 全局分工」两档（支书 2026-08-10 裁定第5点：区分以人为中心与全局查询）。
let _projSubView = 'tasks'; // 'tasks' | 'mine' | 'all'
// 首页专班跳转定位目标（快照自 ctx，一次性消费后清除）
let _highlightTfId = null;

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const activities = ctx.activities || [];
  const taskforces = ctx.allTf || [];
  const authRecords = ctx.authRecords || [];
  _highlightTfId = ctx.highlightTfId || null;
  // 活动生命周期派生所需的全量任务（与 inspector/list-filter 同源取法）
  const allTasks = getAppState()?.tasks || [];

  // 构建统一项目列表：活动 + 专班
  const actProjects = activities
    .filter(a => isActivityLive(a))
    .map(a => {
      // 人员：从 assignments + authRecords 合并
      const personnel = _buildPersonnel(a.id, a.assignments || [], authRecords);
      const organizer = PEOPLE.find(p => p.id === a.organizer);
      // 支书裁定（2026-09-13）：「活动与专班是并列的概念，各走各的」——
      // 活动的状态文案单一源 = components/inspector.js 生命周期展示态（草稿/已发布/进行中/待归档/已执行/已归档/已取消），
      // 不再本地手写映射；专班分支沿用 _tfStatusLabel/_tfStatusColor，二者不强行统一。
      const lifecycle = ACTIVITY_LIFECYCLE[deriveActivityLifecycleStatus(a, allTasks)] || ACTIVITY_LIFECYCLE.draft;
      return {
        id: a.id,
        name: a.title || '未命名',
        type: '活动',
        typeBadge: a.type || '活动',
        group: organizer ? organizer.partyGroup : '',
        status: lifecycle.label,
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
      status: _tfStatusLabel(t.status, t.deadline),
      statusColor: _tfStatusColor(t.status, t.deadline),
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

  // 党小组筛选项：活组清单单一源（2026-09-14 批次 29 收敛——原从成员档案现取，新增的空组会漏项）
  const partyGroups = groupOptions();

  const currentUserId = AuthStore.getCurrentUser()?.personId || '';
  // 首页专班跳转定位：目标专班可能不在「我的分工」中 → 强制切全局分工视图后再定位
  if (_highlightTfId) _projSubView = 'all';

  // 子视图切换：主口径「我的任务」（按「我」切，`SOP-B-31` 已定口径一）；
  // 「我的分工 / 全局分工」＝同一份事实按「项目」切（支书 2026-08-10 裁定第5点，保留）。
  const subTabs = [
    { key: 'tasks', label: '我的任务' },
    { key: 'mine', label: '我的分工' },
    { key: 'all', label: '全局分工' },
  ];
  const subTabsHtml = `
    <div class="flex items-center gap-2 mb-3">
      ${subTabs.map(t => `
        <button type="button"
          class="visitor-proj-sub px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${_projSubView === t.key ? 'bg-[var(--app-accent-bg)] border-[var(--app-accent)] [color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]' : 'bg-white border-neutral-200 text-gray-600 hover:bg-gray-50'}"
          ${_projSubView === t.key ? 'style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)"' : ''}
          data-proj-subview="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  tc.innerHTML = `
    ${subTabsHtml}
    <div id="visitor-proj-host"></div>
  `;
  const host = tc.querySelector('#visitor-proj-host');

  function renderList() {
    // 主口径「我的任务」：同一份事实按「我」切（承担人单一源见 services/activity.js）
    if (_projSubView === 'tasks') { renderTaskList(); return; }

    // 子视图基准：我的分工 = 我参与的项目（以人为中心）；全局分工 = 全部项目
    const base = _projSubView === 'mine'
      ? allProjects.filter(p => p.personnel.some(pm => pm.personId === currentUserId))
      : allProjects;

    // 统一检索引擎（支书 2026-09-14 裁定）：原手写 lf-bar（类型 / 党小组 / 搜索框）与「N 个项目」计数
    // 整体收敛为引擎的 keyword + facets（引擎自带分页）；数据随子视图切换重取。
    const engine = renderFilteredList(host, {
      stateKey: 'visitor-proj-list',
      rows: base,
      keyword: {
        keys: ['name', 'personnel'],
        placeholder: '搜索项目名称或人员…',
        get: (p, k) => (k === 'personnel' ? p.personnel.map(pm => pm.name).join(' ') : p[k]),
      },
      facets: [
        { key: 'type', label: '类型', options: [{ value: '活动', label: '活动' }, { value: '专班', label: '专班' }] },
        { key: 'group', label: '党小组', options: partyGroups.map(g => ({ value: g, label: g })) },
      ],
      countUnit: '个',
      listClass: 'space-y-2',
      emptyMessage: _projSubView === 'mine' ? '你暂未参与任何项目' : '无匹配项目',
      rowHtml: (p) => _renderProjectCard(p, currentUserId),
    });

    // 卡片可点（所有项目卡都带 tf/act id）：cursor 一次落在 .lf-list 上——该容器跨引擎重绘复用
    host.querySelector('.lf-list')?.style.setProperty('cursor', 'pointer');

    // REVIEW_QUEUE J2 裁定（2026-08-08）：首页专班跳转 → 项目分工 tab 定位高亮专班卡片
    // 分页下目标可能不在第 1 页 → 先按其在基准列表中的位置定位到所在页（引擎缺省 10 条/页）
    if (_highlightTfId) {
      const idx = base.findIndex(p => p.type === '专班' && p.id === _highlightTfId);
      if (idx >= 0) { engine.state.page = Math.floor(idx / 10) + 1; engine.apply(); }
      const target = host.querySelector(`.visitor-proj-card[data-tf-id="${_highlightTfId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(target);
      }
      _highlightTfId = null; // 一次性消费
      if (typeof ctx.onNavLocated === 'function') ctx.onNavLocated();
    }
  }

  // 主口径「我的任务」（`SOP-B-31` 已定口径一 · 二）：只列**按项目内身份派给本人**的 SOP 任务节点
  //  （组织者那份 / 深度参与者那份）；承担人判据单源＝`services/activity.js::listMyProjectTasks`。
  //  ⚠ 与「我的分工」是**同一份事实的转置**（此按「我」切、彼按「项目」切），不是第二份数据。
  function renderTaskList() {
    const rows = listMyProjectTasks(currentUserId).map(x => ({
      name: x.task.title || '未命名任务',
      project: x.activity.title || '未命名活动',
      projectId: x.activity.id,
      role: x.projectRole,
      status: x.task.status || 'pending',
      date: x.task.date || x.activity.date || '',
    }));
    // 状态中文标签（与 Task.status 枚举一一对应；位置与项目卡一致：右上角状态位）
    const STATUS_LABEL = { pending: '待办', in_progress: '进行中', completed: '已完成' };
    const STATUS_CLASS = { pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };
    renderFilteredList(host, {
      stateKey: 'visitor-mytask-list',
      rows,
      keyword: { keys: ['name', 'project'], placeholder: '搜索任务或项目…' },
      facets: [
        { key: 'status', label: '状态', options: [{ value: 'pending', label: '待办' }, { value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' }] },
      ],
      countUnit: '项',
      listClass: 'space-y-2',
      emptyMessage: '你暂无可承接的项目任务',
      rowHtml: (r) => _renderTaskCard(r, STATUS_LABEL, STATUS_CLASS),
    });
    host.querySelector('.lf-list')?.style.setProperty('cursor', 'pointer');
  }

  // 卡片点击直达详情页（T-304 第5轮 P8 专班报名可达性 / D7 活动卡一致行为）：
  // 事件委托挂在 host 上——引擎筛选/翻页会重绘行，行内直接绑定会失效
  host.addEventListener('click', (e) => {
    const card = e.target.closest('.visitor-proj-card, .visitor-task-card');
    if (!card) return;
    const tfId = card.dataset.tfId;
    const actId = card.dataset.actId;
    if (!tfId && !actId) return;
    const basePath = window.location.pathname.includes('/workspace/') ? '../' : '';
    window.location.href = tfId ? `${basePath}taskforce.html?id=${tfId}` : `${basePath}activity.html?id=${actId}`;
  });

  tc.querySelectorAll('.visitor-proj-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      _projSubView = btn.dataset.projSubview;
      tc.querySelectorAll('.visitor-proj-sub').forEach(b => {
        const active = b === btn;
        b.classList.toggle('bg-[var(--app-accent-bg)]', active);
        b.classList.toggle('border-[var(--app-accent)]', active);
        b.classList.toggle('[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]', active);
        if (active) b.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)'); else b.style.removeProperty('--acc-text-dark');
        b.classList.toggle('bg-white', !active);
        b.classList.toggle('border-neutral-200', !active);
        b.classList.toggle('text-gray-600', !active);
      });
      renderList();
    });
  });

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

// _actStatusLabel 已撤除（2026-09-13 支书裁定）：活动状态文案改走生命周期展示态单一源
// （components/inspector.js::ACTIVITY_LIFECYCLE），本文件不再自持活动中文状态映射。
function _actStatusColor(status) {
  const map = { completed: 'bg-green-100 text-green-700', ongoing: 'bg-green-100 text-green-700', published: 'bg-blue-100 text-blue-700', draft: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-700' };
  return map[status] || 'bg-gray-100 text-gray-600';
}
function _tfStatusLabel(status, deadline) {
  // 2026-09-02 支书裁决（未同步②）：专班状态词全站统一 —— 内部工作台/首页为「运行中/已完结」，
  // 公共活动页此前误用任务态「进行中/已完成」，一并对齐
  // C3（2026-09-12）：状态由截止日派生——招募中但已过截止日不再显示「招募中」（语义修正）
  if (status === 'recruiting' && deadline && deadline < _todayKey()) return '报名已截止';
  const map = { recruiting: '招募中', active: '运行中', completed: '已完结', dissolved: '已解散', draft: '草稿' };
  return map[status] || status || '运行中';
}
function _tfStatusColor(status, deadline) {
  if (status === 'recruiting' && deadline && deadline < _todayKey()) return 'bg-gray-100 text-gray-600';
  const map = { recruiting: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', dissolved: 'bg-red-100 text-red-700', draft: 'bg-yellow-100 text-yellow-700' };
  return map[status] || 'bg-gray-100 text-gray-600';
}
function _todayKey() { return new Date().toISOString().slice(0, 10); }

function _personnelRoleLabel(role) {
  const map = { organizer: '组织者', deep: '深度参与', participant: '参与者', initiator: '发起人' };
  return map[role] || role;
}

// 「我的任务」卡（`SOP-B-31`）：行＝任务，带所属项目与本人在这份任务上的项目身份。
// 点击仍走 host 上的事件委托 → 打开该任务所属活动详情（与项目卡一致的行为）。
function _renderTaskCard(r, statusLabel, statusClass) {
  return `
    <div class="visitor-task-card p-3 rounded-lg bg-white" data-act-id="${r.projectId}">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusClass[r.status] || 'bg-gray-100 text-gray-600'}">${statusLabel[r.status] || r.status}</span>
          <p class="text-sm font-medium text-gray-800 truncate">${r.name}</p>
        </div>
        <span class="badge inline-flex items-center gap-0.5 flex-shrink-0" style="${_personnelRoleColor(r.role)}">${_personnelRoleLabel(r.role)}</span>
      </div>
      <div class="flex items-center gap-3 text-[12px] text-gray-500">
        <span>${r.project}</span>
        ${r.date ? `<span>${r.date}</span>` : ''}
      </div>
    </div>
  `;
}

function _personnelRoleColor(role) {
  // 角色色统一来自 ROLE_COLORS（organizer=天蓝 / deep=紫 / participant=灰 / initiator=靛蓝），
  // 与活动类型暖色系（红/金）彻底区分，避免"红色太多、意义不明确"（支书 2026-08-01 决策）
  // ROLE_COLORS 经 _applyDark 生成 bgDark/textDark/borderDark，一并输出做深色适配
  const c = ROLE_COLORS[role] || ROLE_COLORS.participant;
  return `--acc-bg-dark:${c.bgDark};--acc-text-dark:${c.textDark};--acc-border-dark:${c.borderDark};background:${c.bg};color:color-mix(in srgb, ${c.text} 60%, #000);border:1px solid ${c.border};`;
}

function _renderProjectCard(project, currentUserId) {
  const organizers = project.personnel.filter(p => p.role === 'organizer' || p.role === 'initiator');
  const deepParticipants = project.personnel.filter(p => p.role === 'deep');
  const others = project.personnel.filter(p => p.role === 'participant');

  // 人员徽章：「我」参与的项目中，本人徽章加红色描边 + 「·我」标记（以人为中心的直观表现）
  const badge = (p, withRole) => {
    const isMe = !!(currentUserId && p.personId && p.personId === currentUserId);
    return `
      <span class="badge inline-flex items-center gap-0.5" style="${_personnelRoleColor(p.role)}${isMe ? 'box-shadow:0 0 0 1.5px rgba(206,17,38,0.45);' : ''}">${p.name}${withRole ? '·' + _personnelRoleLabel(p.role) : ''}${isMe ? '<span class="text-[10px] font-bold" style="color:#CE1126;--acc-text-dark:#FCA5A5;">·我</span>' : ''}</span>`;
  };

  return `
    <div class="visitor-proj-card p-3 rounded-lg bg-white" data-tf-id="${project.type === '专班' ? project.id : ''}" data-act-id="${project.type === '活动' ? project.id : ''}">
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
      ` : '<p class="text-xs text-gray-500">暂无人员</p>'}
    </div>
  `;
}
