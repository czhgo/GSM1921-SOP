import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { AuthStore } from '../services/auth.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { TaskForceRecordStore } from '../services/taskforce.js';
import { PersonPicker } from '../components/person-picker.js';
import { ACTIVITIES, _personName, PEOPLE, MOCK_TASKFORCES, inspectionToLong } from '../mock/index.js';
import { mockDB, SourceType, ParticipationLevel } from '../core/domain.js';
import { saveDB } from '../services/mock.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';
import { renderQueryView } from '../components/query-view.js';
import { loadInspectionRecords, saveInspectionRecords } from '../services/inspection.js';

const { savedState, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', defaultRole: 'org-commissioner', viewMode: 'manage', accentRole: 'org-commissioner' });

const SVG = {
  people: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
};

function renderOrgUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('org-content');
  if (!container) return;

  const taskforces = TaskForceRecordStore.getAll();
  const pending = taskforces.filter(t => t.status === 'draft' || t.status === 'pending_review');
  const recruiting = taskforces.filter(t => t.status === 'recruiting');
  const active = taskforces.filter(t => t.status === 'active');

  const tabBar = renderTabBar({
    prefix: 'org',
    tabs: [
      { id: 'taskforce', label: '专班管理', render: (ctx) => _renderTaskforceContent(ctx.pending, ctx.recruiting, ctx.active) },
      { id: 'inspection', label: '考察上传', render: () => _renderOrgInspectionContent() },
      { id: 'tracking', label: '追踪看板', render: (ctx) => _renderTrackingContent(ctx.activities) },
      { id: 'compliance', label: '合规文件', render: () => _renderComplianceContent() },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    extraRightHtml: '<button id="btn-publish-tf" class="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" style="cursor:pointer;">发布招募</button>',
    renderCtx: { pending, recruiting, active, activities },
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  container.querySelector('#btn-publish-tf')?.addEventListener('click', () => _openRecruitForm());
  tabBar.activate('taskforce');

  const urlParams = CrossPageState.getURLParams();
  if (urlParams.taskforceId) {
    setTimeout(() => {
      const card = container.querySelector(`.tf-store-card[data-tf-id="${urlParams.taskforceId}"]`);
      if (card) {
        card.click();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}

function _renderTaskforceContent(pending, recruiting, active) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const statusLabel = { pending_review: '待审核', recruiting: '招募中', active: '运行中', completed: '已完结', draft: '草稿' };
  const statusColor = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', draft: '#6B7280' };

  // 获取已完结专班
  const completed = TaskForceRecordStore.getAll().filter(t => t.status === 'completed');

  container.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="org-tf-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索专班名称或任务...">
    </div>
    <div id="org-tf-kanban"></div>
    <div id="tf-detail-panel" class="hidden card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;"></div>
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
        <div class="card rounded-2xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(99,102,241,0.06);color:#6366F1;border-bottom:2px solid rgba(99,102,241,0.15);">待审核 (${fp.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fp.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无待审核专班</p>' :
              fp.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-2xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(217,119,6,0.06);color:#D97706;border-bottom:2px solid rgba(217,119,6,0.15);">招募中 (${fr.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fr.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无招募中专班</p>' :
              fr.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
        <div class="card rounded-2xl p-0 overflow-hidden">
          <div class="px-4 py-3 font-title-cn text-sm font-bold" style="background:rgba(16,185,129,0.06);color:#10B981;border-bottom:2px solid rgba(16,185,129,0.15);">运行中 (${fa.length})</div>
          <div class="p-3 space-y-3 min-h-[120px]">
            ${fa.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无运行中专班</p>' :
              fa.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
          </div>
        </div>
      </div>
      ${fc.length > 0 ? `
      <details class="card rounded-2xl p-0 overflow-hidden">
        <summary class="px-4 py-3 font-title-cn text-sm font-bold cursor-pointer select-none" style="background:rgba(59,130,246,0.06);color:#3B82F6;border-bottom:2px solid rgba(59,130,246,0.15);">已完结 (${fc.length})</summary>
        <div class="p-3 space-y-3">
          ${fc.map(t => _renderTfCard(t, statusLabel, statusColor)).join('')}
        </div>
      </details>` : ''}
    `;
    bindCardClicks();
    bindCompleteButtons();
  }

  document.getElementById('org-tf-search')?.addEventListener('input', renderKanban);
  renderKanban();

  // ── "确认完成"按钮事件绑定（P2-3 看板交互重构） ──
  function bindCompleteButtons() {
    container.querySelectorAll('.tf-complete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
        if (!tf || tf.status !== 'active') return;
        const confirmed = window.confirm(`确认完成专班「${tf.name}」？完成后将回收所有相关赋权记录，专班归入已完结。`);
        if (!confirmed) return;
        _dissolveTaskforce(tf);
      });
    });
  }

  function bindCardClicks() {
    container.querySelectorAll('.tf-store-card').forEach(card => {
    card.addEventListener('click', () => {
      const tfId = card.dataset.tfId;
      const tf = TaskForceRecordStore.getAll().find(r => r.id === tfId);
      if (!tf) return;
      const panel = document.getElementById('tf-detail-panel');
      if (!panel) return;
      panel.classList.remove('hidden');
      const filled = tf.members.filter(m => m.personId).length;

      // ── 工作量汇总区域（运行中/已完结专班展示） ──
      let workSummaryHtml = '';
      if (tf.status === 'active' || tf.status === 'completed') {
        const memberRows = tf.members.filter(m => m.personId).map(m => {
          const contribCount = (m.contributions || []).length;
          const contribList = (m.contributions || []).length > 0
            ? `<ul class="mt-1 space-y-0.5">${m.contributions.map(c =>
                `<li class="text-[11px] text-gray-400 pl-2 border-l-2 border-gray-200">${typeof c === 'string' ? c : (c.description || c.title || JSON.stringify(c))}</li>`
              ).join('')}</ul>`
            : '<span class="text-[11px] text-gray-300 pl-2">暂无贡献记录</span>';
          return `
            <div class="py-2 border-b border-gray-50 last:border-b-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-700">${_personName(m.personId)}</span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">${m.role || '深度参与者'}</span>
                  <span class="text-[10px] text-gray-400">贡献 ${contribCount} 项</span>
                </div>
              </div>
              ${contribList}
            </div>`;
        }).join('');

        workSummaryHtml = `
          <div class="mt-4 pt-3 border-t border-gray-100">
            <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">${SVG.clipboard} 工作量汇总</h5>
            ${tf.members.filter(m => m.personId).length === 0
              ? '<p class="text-xs text-gray-400">暂无成员</p>'
              : `<div class="bg-gray-50 rounded-lg px-3 py-1">${memberRows}</div>`
            }
          </div>`;

        // 仅运行中专班显示解散按钮
        if (tf.status === 'active') {
          workSummaryHtml += `
          <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button id="btn-dissolve-tf" class="text-xs px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" style="cursor:pointer;">解散专班</button>
          </div>`;
        }
      }

      // ── 子记录区域（P3-4：专班挂载考察+材料2子记录） ──
      let subRecords = { ...mockDB.tfSubRecords };
      const tfSubs = subRecords[tfId] || { inspection: [], materials: [] };

      function saveTfSubs() {
        mockDB.tfSubRecords = { ...mockDB.tfSubRecords, [tfId]: tfSubs };
        saveDB();
      }

      function renderSubTable(type, items) {
        const label = type === 'inspection' ? '考察记录' : '材料记录';
        const color = type === 'inspection' ? '#D97706' : '#3B82F6';
        const fields = type === 'inspection'
          ? [{ key: 'person', label: '被考察人' }, { key: 'content', label: '考察内容' }, { key: 'result', label: '考察结论' }]
          : [{ key: 'name', label: '材料名称' }, { key: 'author', label: '提交人' }, { key: 'note', label: '备注' }];

        const rows = items.map((item, idx) => `
          <tr class="border-b border-gray-50">
            ${fields.map(f => `<td class="px-2 py-1.5 text-xs text-gray-700">${item[f.key] || '-'}</td>`).join('')}
            <td class="px-2 py-1.5 text-center"><button class="sub-del-btn text-[10px] text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold font-title-cn" style="color:${color}">${label} (${items.length})</span>
              <button class="sub-add-btn text-[10px] px-2 py-1 rounded border hover:bg-gray-50 transition-colors" style="color:${color};border-color:${color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[11px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${fields.map(f => `<th class="px-2 py-1 text-[10px] font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-[10px] font-medium text-gray-500 w-12"></th>
                </tr></thead><tbody>${rows}</tbody></table>`
            }
          </div>`;
      }

      const subRecordsHtml = `
        <div class="mt-4 pt-3 border-t border-gray-100">
          <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">${SVG.clipboard} 子记录</h5>
          ${renderSubTable('inspection', tfSubs.inspection)}
          ${renderSubTable('materials', tfSubs.materials)}
        </div>`;

      panel.innerHTML = `
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">${tf.name}</h4>
        <p class="text-xs text-gray-500 mb-2">${tf.task}</p>
        <div class="flex gap-4 text-xs text-gray-400 mb-3">
          <span>${SVG.people} ${filled}/${tf.capacity}</span>
          ${tf.deadline ? `<span>${SVG.calendar} ${tf.deadline}</span>` : ''}
          <span>发起: ${_personName(tf.initiator)}</span>
        </div>
        <div class="text-xs text-gray-500">成员：${tf.members.map(m => _personName(m.personId)).join('、')}</div>
        ${workSummaryHtml}
        ${subRecordsHtml}
      `;

      // ── 解散专班按钮事件 ──
      const dissolveBtn = panel.querySelector('#btn-dissolve-tf');
      if (dissolveBtn) {
        dissolveBtn.addEventListener('click', () => _dissolveTaskforce(tf));
      }

      // ── 子记录添加/删除事件（P3-4） ──
      panel.querySelectorAll('.sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          if (type === 'inspection') {
            const person = prompt('被考察人：');
            if (!person) return;
            const content = prompt('考察内容：') || '';
            const result = prompt('考察结论：') || '';
            tfSubs.inspection.push({ person, content, result });
          } else {
            const name = prompt('材料名称：');
            if (!name) return;
            const author = prompt('提交人：') || '';
            const note = prompt('备注：') || '';
            tfSubs.materials.push({ name, author, note });
          }
          saveTfSubs();
          // 重新渲染详情面板
          card.click();
        });
      });

      panel.querySelectorAll('.sub-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          tfSubs[type].splice(idx, 1);
          saveTfSubs();
          // 重新渲染详情面板
          card.click();
        });
      });
    });
  });
  }
}

// ════════════════════════════════════════════════════════════════
//  专班解散流程（P1-5）
// ════════════════════════════════════════════════════════════════

function _dissolveTaskforce(tf) {
  if (!tf || tf.status !== 'active') return;

  const confirmed = window.confirm(`确定解散专班「${tf.name}」？解散后将回收所有相关赋权记录。`);
  if (!confirmed) return;

  // 1. 更新专班状态为 completed
  const updated = TaskForceRecordStore.update(tf.id, { status: 'completed' });
  if (!updated) {
    showToast('error', '解散失败：专班记录未找到');
    return;
  }

  // 2. 回收该专班相关的赋权记录
  const authRecords = AuthStore.getAuthState();
  const relatedRecords = authRecords.filter(r =>
    r.scope === 'taskforce' && r.scopeRef === tf.id
  );
  let revokedCount = 0;
  relatedRecords.forEach(r => {
    const ok = AuthStore.revokeAuthorization(r.id);
    if (ok) revokedCount++;
  });

  // 3. toast 反馈
  const revokeMsg = relatedRecords.length > 0
    ? `，已回收 ${revokedCount} 条赋权记录`
    : '';
  showToast('success', `专班「${tf.name}」已解散${revokeMsg}`);

  // 4. 刷新看板
  renderOrgUI(getAppState());
}

function _renderTfCard(t, statusLabel, statusColor) {
  const filled = t.members.filter(m => m.personId).length;
  const color = statusColor[t.status] || '#6B7280';
  // 运行中专班显示"确认完成"按钮
  const completeBtn = t.status === 'active'
    ? `<button class="tf-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors mt-2" data-tf-id="${t.id}" onclick="event.stopPropagation();">确认完成</button>`
    : '';
  return `
    <div class="kanban-card p-4 rounded-xl border border-gray-100 bg-white cursor-pointer tf-store-card hover:shadow-sm transition-shadow" data-tf-id="${t.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${t.name}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background:${color}15;color:${color};">${statusLabel[t.status] || t.status}</span>
      </div>
      <p class="text-xs text-gray-500 mb-2 line-clamp-2">${t.task}</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>${SVG.people} ${filled}/${t.capacity}</span>
        ${t.deadline ? `<span>${SVG.calendar} ${t.deadline}</span>` : ''}
      </div>
      ${completeBtn}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  发布招募表单面板
// ════════════════════════════════════════════════════════════════

let _recruitPersonPicker = null;

function _openRecruitForm() {
  // 移除已有面板
  _closeRecruitForm();

  const overlay = document.createElement('div');
  overlay.id = 'recruit-form-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.35);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeRecruitForm();
  });

  const publishedActivities = ACTIVITIES.filter(a => a.status === 'published' || a.status === 'ongoing' || a.status === 'draft');

  const panel = document.createElement('div');
  panel.className = 'card rounded-2xl';
  panel.style.cssText = 'width:560px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto;padding:24px;position:relative;';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <h3 class="font-title-cn" style="font-size:1.125rem;font-weight:700;color:#1F2937;margin:0;">发布专班招募</h3>
      <button id="recruit-form-close" type="button" style="width:32px;height:32px;border-radius:8px;border:none;background:#F3F4F6;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <form id="recruit-form" autocomplete="off">
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">专班名称 <span style="color:#CE1126;">*</span></label>
        <input type="text" id="rf-name" required placeholder="如：宣传专班（第三期）" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">任务描述 <span style="color:#CE1126;">*</span></label>
        <textarea id="rf-task" required rows="3" placeholder="描述专班的核心任务与目标" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;resize:vertical;"></textarea>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">所需人数 <span style="color:#CE1126;">*</span></label>
          <input type="number" id="rf-capacity" required min="1" max="50" placeholder="如：5" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">截止日期 <span style="color:#CE1126;">*</span></label>
          <input type="date" id="rf-deadline" required class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">技能要求</label>
        <input type="text" id="rf-skills" placeholder="如：视频剪辑、文案撰写（选填）" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
      </div>

      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">周期起始</label>
          <input type="date" id="rf-period-start" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
        <div style="flex:1;">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">周期结束</label>
          <input type="date" id="rf-period-end" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;" />
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">关联活动</label>
        <select id="rf-activity" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;background:white;">
          <option value="">不关联活动</option>
          ${publishedActivities.map(a => `<option value="${a.id}">${a.title}（${a.date}）</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">初始成员</label>
        <div id="rf-members-picker"></div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.8125rem;font-weight:600;color:#374151;margin-bottom:6px;">说明</label>
        <textarea id="rf-notes" rows="2" placeholder="补充说明（选填）" class="input rounded-lg border px-3 py-2" style="width:100%;font-size:0.8125rem;border:1.5px solid #E5E7EB;outline:none;transition:border-color 0.15s;resize:vertical;"></textarea>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button type="button" id="recruit-form-cancel" style="padding:8px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;color:#6B7280;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:all 0.15s;">取消</button>
        <button type="submit" style="padding:8px 24px;border-radius:10px;border:none;background:#CE1126;color:white;font-size:0.8125rem;font-weight:600;cursor:pointer;transition:background 0.15s;">发布</button>
      </div>
    </form>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 关闭按钮
  panel.querySelector('#recruit-form-close').addEventListener('click', () => _closeRecruitForm());
  panel.querySelector('#recruit-form-cancel').addEventListener('click', () => _closeRecruitForm());

  // 输入框聚焦样式
  panel.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('focus', function() { this.style.borderColor = '#CE1126'; });
    el.addEventListener('blur', function() { this.style.borderColor = '#E5E7EB'; });
  });

  // 初始化 PersonPicker
  const pickerContainer = panel.querySelector('#rf-members-picker');
  _recruitPersonPicker = new PersonPicker({
    mode: 'multi',
    placeholder: '选择初始成员（选填）',
    accentColor: '#CE1126',
    onSelect: () => {},
  });
  _recruitPersonPicker.render(pickerContainer);

  // 表单提交
  panel.querySelector('#recruit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    _submitRecruitForm();
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

function _submitRecruitForm() {
  const name = document.getElementById('rf-name')?.value?.trim();
  const task = document.getElementById('rf-task')?.value?.trim();
  const capacity = parseInt(document.getElementById('rf-capacity')?.value, 10);
  const deadline = document.getElementById('rf-deadline')?.value || '';
  const skills = document.getElementById('rf-skills')?.value?.trim() || '';
  const periodStart = document.getElementById('rf-period-start')?.value || '';
  const periodEnd = document.getElementById('rf-period-end')?.value || '';
  const activityId = document.getElementById('rf-activity')?.value || null;
  const notes = document.getElementById('rf-notes')?.value?.trim() || '';

  // 校验必填项
  if (!name) { showToast('error', '请填写专班名称'); return; }
  if (!task) { showToast('error', '请填写任务描述'); return; }
  if (!capacity || capacity < 1) { showToast('error', '请填写有效的所需人数'); return; }
  if (!deadline) { showToast('error', '请选择截止日期'); return; }

  // 获取初始成员
  const selectedIds = _recruitPersonPicker ? _recruitPersonPicker.getSelected() : [];
  const members = selectedIds.map(pid => ({
    personId: pid,
    role: '深度参与者',
    contributions: [],
  }));

  // 构建专班记录
  const record = {
    name,
    task,
    status: 'recruiting',
    manager: 'p11',
    initiator: 'p11',
    members,
    capacity,
    deadline,
    activityId: activityId || null,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  // 附加可选字段
  if (skills) record.skills = skills;
  if (periodStart && periodEnd) record.period = `${periodStart} ~ ${periodEnd}`;
  if (notes) record.notes = notes;

  try {
    TaskForceRecordStore.add(record);
    showToast('success', `专班「${name}」发布成功`);
    _closeRecruitForm();
    // 刷新看板
    renderOrgUI(getAppState());
  } catch (err) {
    console.error('[recruit-form] 创建专班失败：', err);
    showToast('error', '发布失败，请重试');
  }
}

function _renderTrackingContent(activities) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // Prepare data with archived field for filtering
  const queryData = activities.map(a => ({
    ...a,
    archived: String(a.status === 'completed'),
  }));

  // Extract type options from activities
  const typeOptions = [...new Set(activities.map(a => a.type).filter(Boolean))].map(t => ({ value: t, label: t }));

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">活动追踪看板</h4>
      <div class="text-xs text-gray-500 mb-3">组织委员可追踪所有已发布活动的执行状态</div>
      <div id="org-tracking-query"></div>
    </div>
  `;

  const queryContainer = document.getElementById('org-tracking-query');
  if (queryContainer) {
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
          ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">已归档</span>'
          : '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">已发布</span>';
        const completeBtn = !isArchived
          ? `<button class="track-complete-btn text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors" data-act-id="${a.id}">确认完成</button>`
          : '';
        return `
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
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
      accentColor: '#CE1126',
    });

    // Bind confirm complete buttons using event delegation
    queryContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.track-complete-btn');
      if (!btn) return;
      const actId = btn.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const confirmed = window.confirm(`确认完成活动「${activity.title || '未命名'}」？完成后将归档。`);
      if (!confirmed) return;
      BranchService.updateActivity(actId, { status: 'completed' });
      showToast('success', `活动「${activity.title || '未命名'}」已完成并归档`);
      renderOrgUI(getAppState());
    });
  }
}

// ── 合规文件引用渲染（P3-2：只读不可变，组织委员管理引用列表） ──
function _renderComplianceContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  let refs = [...mockDB.complianceReferences];

  // 官方合规文件（只读不可变）
  const officialDocs = [
    { id: 'doc-11', title: '中国共产党章程', type: 'pdf', tag: '根本大法' },
    { id: 'doc-12', title: '党支部工作规范（学生）', type: 'pdf', tag: '工作规范' },
    { id: 'doc-14', title: '中国共产党党员教育管理工作条例', type: 'docx', tag: '教育管理' },
    { id: 'doc-15', title: '中国共产党发展党员工作细则', type: 'docx', tag: '发展党员' },
    { id: 'doc-16', title: '中国共产党普通高等学校基层组织工作条例', type: 'docx', tag: '高校党建' },
    { id: 'doc-17', title: '中国共产党支部工作条例（试行）', type: 'docx', tag: '支部工作' },
  ];

  function saveRefs() {
    mockDB.complianceReferences = [...refs];
    saveDB();
  }

  function renderRefList() {
    return refs.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-4">暂无引用记录</p>'
      : refs.map((r, idx) => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800">${r.docTitle || '未指定'}</div>
              <div class="text-xs text-gray-500 mt-0.5">引用场景：${r.scene || '-'}</div>
              ${r.note ? `<div class="text-xs text-gray-400 mt-0.5">备注：${r.note}</div>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">${r.docTag || ''}</span>
              <button class="ref-del-btn text-[10px] text-red-400 hover:text-red-600" data-idx="${idx}">移除</button>
            </div>
          </div>
        `).join('');
  }

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-1">合规文件引用管理</h4>
      <p class="text-xs text-gray-500 mb-4">官方合规文件内容只读不可变，组织委员管理引用列表</p>

      <div class="mb-4">
        <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">官方合规文件（只读）</h5>
        <div class="space-y-1.5">
          ${officialDocs.map(d => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50/80 border border-gray-100">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-gray-700">${d.title}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">${d.type.toUpperCase()}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">${d.tag}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <h5 class="font-title-cn text-xs font-bold text-gray-600">引用记录</h5>
          <button id="btn-add-ref" class="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">+ 添加引用</button>
        </div>
        <div id="compliance-ref-list" class="space-y-2">${renderRefList()}</div>
      </div>
    </div>
  `;

  // 添加引用
  container.querySelector('#btn-add-ref')?.addEventListener('click', () => {
    const docTitle = prompt('引用的合规文件名称：');
    if (!docTitle) return;
    const scene = prompt('引用场景（如：三会一课考勤规则依据）：') || '';
    const note = prompt('备注（选填）：') || '';
    const matchedDoc = officialDocs.find(d => d.title.includes(docTitle) || docTitle.includes(d.title));
    refs.push({
      docTitle,
      docTag: matchedDoc ? matchedDoc.tag : '自定义',
      scene,
      note,
      addedAt: new Date().toISOString().slice(0, 10),
    });
    saveRefs();
    _renderComplianceContent();
    showToast('success', '引用已添加');
  });

  // 移除引用
  container.querySelectorAll('.ref-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      refs.splice(idx, 1);
      saveRefs();
      _renderComplianceContent();
      showToast('success', '引用已移除');
    });
  });
}

// ── 考察上传 Tab（组织委员视角） ──────────────────────────────
let _orgInspFormVisible = false;
let _orgInspPickerInstance = null;

function _renderOrgInspectionContent() {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const tfInspection = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE);

  const activeTaskforces = TaskForceRecordStore.getAll().filter(t => t.status === 'active' || t.status === 'recruiting');

  const formHtml = _orgInspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="org-insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传专班考察表单</div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择专班 <span class="text-red-500">*</span></label>
        <select id="org-insp-tf-select" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors">
          <option value="">请选择专班</option>
          ${activeTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}（${tf.status === 'active' ? '运行中' : '招募中'}）</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择人员 <span class="text-red-500">*</span></label>
        <div id="org-insp-person-picker-container"></div>
      </div>
      <div id="org-insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="org-insp-form-submit" class="text-sm px-5 py-2 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">提交考察</button>
        <button id="org-insp-form-cancel" class="text-sm px-4 py-2 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-amber-100 text-amber-700' };

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">专班考察上传</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200" id="btn-org-upload-insp" style="cursor:pointer;">${_orgInspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">专班考察：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_orgInspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">专班</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">标签</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(tfInspection).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded text-[10px] ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">专班</span></td>
              <td class="py-2 px-3 text-gray-600">${i.role}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${statusColor[i.status] || 'bg-gray-100 text-gray-500'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
        ${tfInspection.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无专班考察记录</p>' : ''}
      </div>
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-org-upload-insp')?.addEventListener('click', () => {
    _orgInspFormVisible = !_orgInspFormVisible;
    if (!_orgInspFormVisible && _orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    _renderOrgInspectionContent();
  });

  if (_orgInspFormVisible) {
    _initOrgInspForm(container, activeTaskforces);
  }
}

function _initOrgInspForm(container, activeTaskforces) {
  const pickerContainer = container.querySelector('#org-insp-person-picker-container');
  if (pickerContainer) {
    _orgInspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: '#CE1126',
      onSelect: (ids) => {
        _renderOrgInspContentRows(ids);
      }
    });
    _orgInspPickerInstance.render(pickerContainer);
  }

  _renderOrgInspContentRows([]);

  container.querySelector('#org-insp-form-cancel')?.addEventListener('click', () => {
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    _renderOrgInspectionContent();
  });

  container.querySelector('#org-insp-form-submit')?.addEventListener('click', () => {
    const tfSelect = container.querySelector('#org-insp-tf-select');
    const tfId = tfSelect?.value;
    const tfOption = tfSelect?.selectedOptions[0];
    if (!tfId) { showToast('error', '请选择专班'); return; }

    const tfName = tfOption?.dataset.name || tfId;
    const selectedIds = _orgInspPickerInstance ? _orgInspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    const records = [];
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#org-insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${PEOPLE.find(p => p.id === personId)?.name || personId} 的考察内容`); return; }

      records.push({
        id: 'insp_' + Date.now() + '_' + personId,
        sourceType: SourceType.TASKFORCE,
        activityId: null,
        sourceName: tfName,
        personId,
        level: ParticipationLevel.DEEP_PARTICIPATE,
        role: content,
        recordedBy: 'p13', // 组织委员
        recordedAt: new Date().toISOString(),
        status: 'pending',
      });
    }

    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `专班考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    _renderOrgInspectionContent();
  });
}

function _renderOrgInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('org-insp-content-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人考察内容</div>
    <div class="space-y-2 max-h-60 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = PEOPLE.find(p => p.id === pid);
        const name = person ? person.name : pid;
        return `
          <div class="flex items-start gap-2">
            <span class="text-xs font-medium text-gray-700 min-w-[3rem] pt-2">${name}</span>
            <textarea id="org-insp-content-${pid}" class="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors resize-none" rows="2" placeholder="请填写考察内容描述"></textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

registerRenderCallback(renderOrgUI);

loadWorkspaceData({ role: 'org-commissioner', storeInits: [() => TaskForceRecordStore.init()], fallbackData: () => ACTIVITIES, logTag: 'ws-org' });
