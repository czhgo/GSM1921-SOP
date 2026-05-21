import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { PersonPicker } from '../components/person-picker.js';
import { ParticipationLevel, PARTICIPATION_LEVEL_LABELS } from '../core/domain.js';
import { INSPECTION_RECORDS, inspectionToLong, REVIEW_RECORDS, reviewToDisplay, ACTIVITIES, PARTICIPATION_RECORDS, participationToDisplay, MOCK_TASKFORCES } from '../mock/index.js';
import { PEOPLE } from '../mock/people.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'organizer');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('workspace', 'manage');

const accent = '#3B82F6';
const accentRgba = 'rgba(59,130,246,0.1)';
const accentBorder = 'rgba(59,130,246,0.3)';

function _filterByRole(state, role) {
  const activities = (state.activities || []).filter(a => {
    if (role === 'organizer') return a.organizer && !a.organizer.includes('leader');
    return true;
  });
  return { ...state, activities };
}

function renderOrganizerUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('organizer-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'organizer');
  const filteredActivities = filteredState.activities || [];

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="tasks" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">任务分配</button>
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="review" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">复盘提交</button>
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="inspection" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考察查看</button>
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="handover" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">数据交接</button>
      <button class="orgz-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-orgz-tab="filespace" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">文件空间</button>
    </div>
    <div id="orgz-tab-content"></div>
  `;

  container.querySelectorAll('.orgz-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.orgz-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.orgzTab;
      if (tab === 'tasks') _renderTasksContent(filteredActivities);
      else if (tab === 'review') _renderReviewContent();
      else if (tab === 'inspection') _renderInspectionContent();
      else if (tab === 'handover') _renderHandoverContent(filteredActivities);
      else if (tab === 'filespace') _renderFileSpaceContent(filteredActivities);
    });
  });

  _renderTasksContent(filteredActivities);
}

// ── 分工记录数据层（localStorage） ────────────────────────────
const ASSIGNMENT_STORAGE_KEY = 'assignment_records';

/** 读取所有分工记录 */
function _loadAssignmentRecords() {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ws-organizer] 读取分工记录失败', e);
    return [];
  }
}

/** 写入所有分工记录 */
function _saveAssignmentRecords(records) {
  try {
    localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('[ws-organizer] 写入分工记录失败', e);
  }
}

/** 自动逾期检测：将所有 in_progress 且 DDL 已过的记录更新为 overdue */
function _checkOverdue(records) {
  const now = new Date();
  let changed = false;
  records.forEach(r => {
    if (r.status === 'in_progress' && new Date(r.ddl) < now) {
      r.status = 'overdue';
      changed = true;
    }
  });
  if (changed) _saveAssignmentRecords(records);
  return records;
}

/** 新增一条分工记录 */
function _addAssignmentRecord(record) {
  const records = _loadAssignmentRecords();
  records.push(record);
  _saveAssignmentRecords(records);
  return records;
}

/** 标记分工记录为已完成 */
function _completeAssignmentRecord(recordId) {
  const records = _loadAssignmentRecords();
  const r = records.find(r => r.id === recordId);
  if (r && r.status !== 'completed') {
    r.status = 'completed';
    r.completedAt = new Date().toISOString();
    _saveAssignmentRecords(records);
  }
  return records;
}

// ── 交接记录数据层（localStorage） ────────────────────────────
const HANDOVER_STORAGE_KEY = 'handover_records';
const HANDOVER_ORGANIZER_ID = 'p3'; // 组织者 personId

/** 读取所有交接记录 */
function _loadHandoverRecords() {
  try {
    const raw = localStorage.getItem(HANDOVER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ws-organizer] 读取交接记录失败', e);
    return [];
  }
}

/** 写入所有交接记录 */
function _saveHandoverRecords(records) {
  try {
    localStorage.setItem(HANDOVER_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('[ws-organizer] 写入交接记录失败', e);
  }
}

/** 新增一条交接记录 */
function _addHandoverRecord(record) {
  const records = _loadHandoverRecords();
  records.push(record);
  _saveHandoverRecords(records);
  return records;
}

/** 更新交接记录 */
function _updateHandoverRecord(recordId, updates) {
  const records = _loadHandoverRecords();
  const r = records.find(r => r.id === recordId);
  if (r) {
    Object.assign(r, updates);
    _saveHandoverRecords(records);
  }
  return records;
}

/** 标记交接项为已完成 */
function _completeHandoverItem(recordId, itemIndex) {
  const records = _loadHandoverRecords();
  const r = records.find(r => r.id === recordId);
  if (r && r.items[itemIndex]) {
    r.items[itemIndex].status = 'completed';
    _saveHandoverRecords(records);
  }
  return records;
}

// ── 参与记录临时状态 ──────────────────────────────────────────
let _participationDraft = {
  activityId: '',
  selectedPersonIds: [],
  personDetails: {},  // personId → { level, role }
};

// ── 分工记录临时状态 ──────────────────────────────────────────
let _assignmentDraft = {
  activityId: '',
  assigneeId: '',
  workName: '',
  workDescription: '',
  ddl: '',
};

// ── 交接记录临时状态 ──────────────────────────────────────────
let _handoverDraft = {
  type: 'activity',        // 'activity' | 'taskforce'
  sourceId: '',
  items: [],               // [{ name, description, assigneeId }]
  hasArchiveAssignment: false,
  archiveAssigneeId: '',
};

function _renderTasksContent(activities) {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;

  // 筛选当前组织者负责的活动（organizer 字段包含 p3 或 organizer 角色）
  const organizerActivities = activities.filter(a =>
    a.organizer === 'p3' || (typeof a.organizer === 'string' && a.organizer.includes('p3'))
  );

  // 已有参与记录（仅展示当前组织者关联活动的）
  const existingRecords = participationToDisplay(
    PARTICIPATION_RECORDS.filter(r => organizerActivities.some(a => a.id === r.activityId))
  );

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 关联活动列表 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">关联活动</h4>
        <div class="text-xs text-gray-500 mb-3">组织者对关联活动有任务分配和进度追踪权限</div>
        <div class="space-y-2">
          ${organizerActivities.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无关联活动</p>' :
            organizerActivities.map(a => `
              <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${a.status === 'published' ? 'bg-green-100 text-green-700' : a.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}">${a.status === 'published' ? '已发布' : a.status === 'completed' ? '已完成' : '草稿'}</span>
              </div>
            `).join('')}
        </div>
      </div>

      <!-- 参与记录录入 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">参与记录录入</h4>
        <div class="text-xs text-gray-500 mb-4">记录参与层级（组织/深度参与/出勤）与分工角色</div>

        <!-- Step 1: 选择关联活动 -->
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">选择关联活动</label>
          <select id="part-activity-select" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;">
            <option value="">-- 请选择活动 --</option>
            ${organizerActivities.map(a => `<option value="${a.id}" ${_participationDraft.activityId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`).join('')}
          </select>
        </div>

        <!-- Step 2: 选择参与人员 -->
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">选择参与人员</label>
          <div id="part-person-picker-mount"></div>
        </div>

        <!-- Step 3: 逐人设置层级+分工 -->
        <div id="part-person-details" class="mb-4"></div>

        <!-- Step 4: 提交按钮 -->
        <div class="flex items-center gap-3">
          <button id="part-submit-btn" class="px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors" style="background:#CE1126;" disabled>提交参与记录</button>
          <span id="part-submit-hint" class="text-[10px] text-gray-400"></span>
        </div>
      </div>

      <!-- 已有参与记录 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">已有参与记录</h4>
        <div class="text-xs text-gray-500 mb-3">当前组织者关联活动的参与记录</div>
        ${existingRecords.length === 0
          ? '<p class="text-xs text-gray-400 text-center py-4">暂无参与记录</p>'
          : `<div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead><tr class="border-b border-gray-200">
                  <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
                  <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
                  <th class="py-2 px-3 text-left text-gray-500 font-medium">参与层级</th>
                  <th class="py-2 px-3 text-left text-gray-500 font-medium">分工角色</th>
                  <th class="py-2 px-3 text-left text-gray-500 font-medium">记录人</th>
                </tr></thead>
                <tbody>${existingRecords.map(r => `
                  <tr class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="py-2 px-3 font-medium text-gray-800">${r.personName}</td>
                    <td class="py-2 px-3 text-gray-600">${r.activityTitle}</td>
                    <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${_levelTagStyle(r.level)}">${r.levelLabel}</span></td>
                    <td class="py-2 px-3 text-gray-600">${r.role}</td>
                    <td class="py-2 px-3 text-gray-400">${r.recordedByName}</td>
                  </tr>
                `).join('')}</tbody>
              </table>
            </div>`
        }
      </div>

      <!-- 分工记录录入 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#8B5CF6;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">分工记录录入</h4>
        <div class="text-xs text-gray-500 mb-4">为关联活动创建分工，跟踪完成度（进行中/已完成/已逾期）</div>

        <!-- 选择关联活动 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">选择关联活动</label>
          <select id="assign-activity-select" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;">
            <option value="">-- 请选择活动 --</option>
            ${organizerActivities.map(a => `<option value="${a.id}" ${_assignmentDraft.activityId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`).join('')}
          </select>
        </div>

        <!-- 选择被分配人 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">选择被分配人</label>
          <div id="assign-person-picker-mount"></div>
        </div>

        <!-- 工作名 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">工作名</label>
          <input type="text" id="assign-work-name" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;" placeholder="如：场地布置、物资采购" value="${_assignmentDraft.workName}" />
        </div>

        <!-- 工作描述 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">工作描述</label>
          <textarea id="assign-work-desc" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" rows="2" style="max-width:360px;" placeholder="详细描述工作内容与要求">${_assignmentDraft.workDescription}</textarea>
        </div>

        <!-- DDL -->
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">截止时间（DDL）</label>
          <input type="datetime-local" id="assign-ddl" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400" style="max-width:360px;" value="${_assignmentDraft.ddl}" />
        </div>

        <!-- 提交按钮 -->
        <div class="flex items-center gap-3">
          <button id="assign-submit-btn" class="px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors" style="background:#8B5CF6;" disabled>提交分工记录</button>
          <span id="assign-submit-hint" class="text-[10px] text-gray-400"></span>
        </div>
      </div>

      <!-- 分工记录展示 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#F59E0B;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">分工记录</h4>
        <div class="text-xs text-gray-500 mb-3">按活动分组展示，逾期状态根据DDL自动判断</div>
        <div id="assignment-records-list">
          ${_renderAssignmentRecordsHTML(organizerActivities)}
        </div>
      </div>
    </div>
  `;

  _bindParticipationEvents(organizerActivities);
  _bindAssignmentEvents(organizerActivities);
}

/** 分工记录状态标签样式 */
function _assignStatusStyle(status) {
  switch (status) {
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'overdue': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** 分工记录状态标签文字 */
function _assignStatusLabel(status) {
  switch (status) {
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    case 'overdue': return '已逾期';
    default: return status;
  }
}

/** 格式化 DDL 显示（精确到分钟） */
function _formatDDL(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 格式化完成时间 */
function _formatCompletedAt(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 渲染分工记录展示区域 HTML */
function _renderAssignmentRecordsHTML(organizerActivities) {
  let records = _loadAssignmentRecords();
  records = _checkOverdue(records);

  // 筛选当前组织者关联活动的记录
  const activityIds = new Set(organizerActivities.map(a => a.id));
  const relevantRecords = records.filter(r => activityIds.has(r.activityId));

  if (relevantRecords.length === 0) {
    return '<p class="text-xs text-gray-400 text-center py-4">暂无分工记录</p>';
  }

  // 按活动分组
  const grouped = {};
  relevantRecords.forEach(r => {
    if (!grouped[r.activityId]) grouped[r.activityId] = [];
    grouped[r.activityId].push(r);
  });

  const activityMap = {};
  organizerActivities.forEach(a => { activityMap[a.id] = a; });

  // 统计
  const total = relevantRecords.length;
  const completed = relevantRecords.filter(r => r.status === 'completed').length;
  const overdue = relevantRecords.filter(r => r.status === 'overdue').length;

  let html = `
    <div class="flex items-center gap-4 mb-3 text-xs text-gray-500">
      <span>共 ${total} 项</span>
      <span class="text-blue-600">进行中 ${total - completed - overdue}</span>
      <span class="text-green-600">已完成 ${completed}</span>
      <span class="text-red-600">已逾期 ${overdue}</span>
    </div>
  `;

  Object.entries(grouped).forEach(([activityId, recs]) => {
    const activity = activityMap[activityId];
    const activityTitle = activity ? activity.title : '未知活动';
    html += `
      <div class="mb-3">
        <div class="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full" style="background:#F59E0B;"></span>
          ${activityTitle}
        </div>
        <div class="space-y-1.5">
          ${recs.map(r => {
            const person = PEOPLE.find(p => p.id === r.assigneeId);
            const personName = person ? person.name : r.assigneeId;
            return `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50" data-assign-id="${r.id}">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-gray-800">${r.workName}</span>
                    <span class="px-1.5 py-0.5 rounded-full text-[10px] ${_assignStatusStyle(r.status)}">${_assignStatusLabel(r.status)}</span>
                  </div>
                  <div class="text-[10px] text-gray-500 mt-0.5">
                    <span>被分配人：${personName}</span>
                    <span class="mx-1">|</span>
                    <span>DDL：${_formatDDL(r.ddl)}</span>
                    ${r.status === 'completed' && r.completedAt ? `<span class="mx-1">|</span><span class="text-green-600">完成于 ${_formatCompletedAt(r.completedAt)}</span>` : ''}
                  </div>
                  ${r.workDescription ? `<div class="text-[10px] text-gray-400 mt-0.5 truncate">${r.workDescription}</div>` : ''}
                </div>
                ${r.status !== 'completed' ? `<button class="btn-mark-complete ml-2 px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors" style="background:rgba(16,185,129,0.1);color:#059669;border:1px solid rgba(16,185,129,0.3);cursor:pointer;" data-assign-id="${r.id}">标记完成</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  return html;
}

/** 绑定分工记录录入区域的事件 */
function _bindAssignmentEvents(organizerActivities) {
  // 活动选择
  const activitySelect = document.getElementById('assign-activity-select');
  if (activitySelect) {
    activitySelect.addEventListener('change', (e) => {
      _assignmentDraft.activityId = e.target.value;
      _updateAssignSubmitState();
    });
  }

  // PersonPicker 初始化（单选模式）
  const pickerMount = document.getElementById('assign-person-picker-mount');
  if (pickerMount) {
    const picker = new PersonPicker({
      mode: 'single',
      placeholder: '选择被分配人',
      onSelect: (personIds) => {
        _assignmentDraft.assigneeId = personIds[0] || '';
        _updateAssignSubmitState();
      },
    });
    picker.render(pickerMount);
  }

  // 工作名输入
  const workNameInput = document.getElementById('assign-work-name');
  if (workNameInput) {
    workNameInput.addEventListener('input', (e) => {
      _assignmentDraft.workName = e.target.value;
      _updateAssignSubmitState();
    });
  }

  // 工作描述输入
  const workDescInput = document.getElementById('assign-work-desc');
  if (workDescInput) {
    workDescInput.addEventListener('input', (e) => {
      _assignmentDraft.workDescription = e.target.value;
    });
  }

  // DDL 输入
  const ddlInput = document.getElementById('assign-ddl');
  if (ddlInput) {
    ddlInput.addEventListener('input', (e) => {
      _assignmentDraft.ddl = e.target.value;
      _updateAssignSubmitState();
    });
  }

  // 提交按钮
  const submitBtn = document.getElementById('assign-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      _submitAssignment(organizerActivities);
    });
    submitBtn.addEventListener('mouseenter', function() {
      if (!this.disabled) this.style.background = '#7C3AED';
    });
    submitBtn.addEventListener('mouseleave', function() {
      if (!this.disabled) this.style.background = '#8B5CF6';
      else this.style.background = '#9CA3AF';
    });
  }

  // 标记完成按钮（事件委托）
  const recordsList = document.getElementById('assignment-records-list');
  if (recordsList) {
    recordsList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-mark-complete');
      if (btn) {
        const recordId = btn.dataset.assignId;
        _completeAssignmentRecord(recordId);
        showToast('success', '已标记为完成');
        // 刷新展示区域
        const state = getAppState();
        const activities = state.activities || [];
        const filteredState = _filterByRole(state, 'organizer');
        _refreshAssignmentList(filteredState.activities || activities);
      }
    });
  }

  _updateAssignSubmitState();
}

/** 更新分工记录提交按钮状态 */
function _updateAssignSubmitState() {
  const btn = document.getElementById('assign-submit-btn');
  const hint = document.getElementById('assign-submit-hint');
  if (!btn) return;

  const { activityId, assigneeId, workName, ddl } = _assignmentDraft;
  const hasActivity = !!activityId;
  const hasAssignee = !!assigneeId;
  const hasWorkName = workName.trim().length > 0;
  const hasDDL = !!ddl;

  const canSubmit = hasActivity && hasAssignee && hasWorkName && hasDDL;
  btn.disabled = !canSubmit;
  btn.style.background = canSubmit ? '#8B5CF6' : '#9CA3AF';
  btn.style.cursor = canSubmit ? 'pointer' : 'not-allowed';

  if (hint) {
    if (!hasActivity) hint.textContent = '请先选择活动';
    else if (!hasAssignee) hint.textContent = '请选择被分配人';
    else if (!hasWorkName) hint.textContent = '请填写工作名';
    else if (!hasDDL) hint.textContent = '请设置截止时间';
    else hint.textContent = '';
  }
}

/** 提交分工记录 */
function _submitAssignment(organizerActivities) {
  const { activityId, assigneeId, workName, workDescription, ddl } = _assignmentDraft;
  if (!activityId || !assigneeId || !workName.trim() || !ddl) return;

  const record = {
    id: 'assign_' + Date.now(),
    activityId,
    workName: workName.trim(),
    workDescription: workDescription.trim(),
    ddl: new Date(ddl).toISOString(),
    assigneeId,
    status: 'in_progress',
    createdBy: 'p3',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  _addAssignmentRecord(record);
  showToast('success', `分工记录「${record.workName}」已创建`);

  // 重置草稿
  _assignmentDraft = { activityId: '', assigneeId: '', workName: '', workDescription: '', ddl: '' };

  // 重新渲染
  const state = getAppState();
  const activities = state.activities || [];
  const filteredState = _filterByRole(state, 'organizer');
  _renderTasksContent(filteredState.activities || activities);
}

/** 刷新分工记录展示区域（不重绘整个 Tab） */
function _refreshAssignmentList(organizerActivities) {
  const listEl = document.getElementById('assignment-records-list');
  if (listEl) {
    listEl.innerHTML = _renderAssignmentRecordsHTML(organizerActivities);
  }
}

/** 参与层级标签样式 */
function _levelTagStyle(level) {
  switch (level) {
    case ParticipationLevel.ORGANIZE: return 'bg-red-100 text-red-700';
    case ParticipationLevel.DEEP_PARTICIPATE: return 'bg-blue-100 text-blue-700';
    case ParticipationLevel.ATTEND: return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** 绑定参与记录录入区域的事件 */
function _bindParticipationEvents(organizerActivities) {
  // 活动选择
  const activitySelect = document.getElementById('part-activity-select');
  if (activitySelect) {
    activitySelect.addEventListener('change', (e) => {
      _participationDraft.activityId = e.target.value;
      _updateSubmitState();
    });
  }

  // PersonPicker 初始化
  const pickerMount = document.getElementById('part-person-picker-mount');
  if (pickerMount) {
    const picker = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参与人员（可多选）',
      onSelect: (personIds) => {
        _participationDraft.selectedPersonIds = personIds;
        // 为新增人员初始化默认值
        personIds.forEach(pid => {
          if (!_participationDraft.personDetails[pid]) {
            _participationDraft.personDetails[pid] = { level: ParticipationLevel.ATTEND, role: '' };
          }
        });
        // 清除已取消选择的人员
        Object.keys(_participationDraft.personDetails).forEach(pid => {
          if (!personIds.includes(pid)) {
            delete _participationDraft.personDetails[pid];
          }
        });
        _renderPersonDetails();
        _updateSubmitState();
      },
    });
    picker.render(pickerMount);
  }

  // 提交按钮
  const submitBtn = document.getElementById('part-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      _submitParticipation();
    });
    submitBtn.addEventListener('mouseenter', function() {
      if (!this.disabled) this.style.background = '#A0001A';
    });
    submitBtn.addEventListener('mouseleave', function() {
      if (!this.disabled) this.style.background = '#CE1126';
      else this.style.background = '#9CA3AF';
    });
  }

  _updateSubmitState();
}

/** 渲染逐人层级+分工设置 */
function _renderPersonDetails() {
  const container = document.getElementById('part-person-details');
  if (!container) return;

  const { selectedPersonIds, personDetails } = _participationDraft;

  if (selectedPersonIds.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 mb-1">逐人设置参与层级与分工</label>
      ${selectedPersonIds.map(pid => {
        const person = PEOPLE.find(p => p.id === pid);
        const detail = personDetails[pid] || { level: ParticipationLevel.ATTEND, role: '' };
        const name = person ? person.name : pid;
        return `
          <div class="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50" data-person-row="${pid}">
            <span class="text-xs font-medium text-gray-800 w-16 flex-shrink-0">${name}</span>
            <select class="part-level-select px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400" data-person-id="${pid}" style="min-width:90px;">
              <option value="${ParticipationLevel.ORGANIZE}" ${detail.level === ParticipationLevel.ORGANIZE ? 'selected' : ''}>组织</option>
              <option value="${ParticipationLevel.DEEP_PARTICIPATE}" ${detail.level === ParticipationLevel.DEEP_PARTICIPATE ? 'selected' : ''}>深度参与</option>
              <option value="${ParticipationLevel.ATTEND}" ${detail.level === ParticipationLevel.ATTEND ? 'selected' : ''}>出勤</option>
            </select>
            <input type="text" class="part-role-input flex-1 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" placeholder="分工角色+描述（如：策划+全流程统筹）" data-person-id="${pid}" value="${detail.role}" />
          </div>
        `;
      }).join('')}
    </div>
  `;

  // 绑定层级选择和角色输入事件
  container.querySelectorAll('.part-level-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const pid = e.target.dataset.personId;
      if (_participationDraft.personDetails[pid]) {
        _participationDraft.personDetails[pid].level = e.target.value;
      }
    });
  });
  container.querySelectorAll('.part-role-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const pid = e.target.dataset.personId;
      if (_participationDraft.personDetails[pid]) {
        _participationDraft.personDetails[pid].role = e.target.value;
      }
      _updateSubmitState();
    });
  });
}

/** 更新提交按钮状态 */
function _updateSubmitState() {
  const btn = document.getElementById('part-submit-btn');
  const hint = document.getElementById('part-submit-hint');
  if (!btn) return;

  const { activityId, selectedPersonIds, personDetails } = _participationDraft;
  const hasActivity = !!activityId;
  const hasPeople = selectedPersonIds.length > 0;
  const allHaveRole = selectedPersonIds.every(pid => personDetails[pid]?.role?.trim());

  const canSubmit = hasActivity && hasPeople && allHaveRole;
  btn.disabled = !canSubmit;
  btn.style.background = canSubmit ? '#CE1126' : '#9CA3AF';
  btn.style.cursor = canSubmit ? 'pointer' : 'not-allowed';

  if (hint) {
    if (!hasActivity) hint.textContent = '请先选择活动';
    else if (!hasPeople) hint.textContent = '请选择参与人员';
    else if (!allHaveRole) hint.textContent = '请填写所有人员的分工角色';
    else hint.textContent = '';
  }
}

/** 提交参与记录 */
function _submitParticipation() {
  const { activityId, selectedPersonIds, personDetails } = _participationDraft;
  if (!activityId || selectedPersonIds.length === 0) return;

  const count = selectedPersonIds.length;
  // Mock 提交：生成记录并显示 toast
  const newRecords = selectedPersonIds.map((pid, idx) => ({
    id: `part-new-${Date.now()}-${idx}`,
    activityId,
    personId: pid,
    level: personDetails[pid]?.level || ParticipationLevel.ATTEND,
    role: personDetails[pid]?.role || '',
    recordedBy: 'p3',
    recordedAt: new Date().toISOString(),
  }));

  // 在实际场景中应写入 store，此处 mock 仅 toast 提示
  console.log('[ws-organizer] 参与记录已提交:', newRecords);
  showToast('success', `已提交 ${count} 条参与记录`);

  // 重置草稿
  _participationDraft = { activityId: '', selectedPersonIds: [], personDetails: {} };

  // 重新渲染
  const state = getAppState();
  const activities = state.activities || [];
  const filteredState = _filterByRole(state, 'organizer');
  _renderTasksContent(filteredState.activities || activities);
}

function _renderReviewContent() {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;
  const reviewData = reviewToDisplay(REVIEW_RECORDS, []);
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">复盘提交</h4>
      <div class="text-xs text-gray-500 mb-3">组织者须在活动结束后 T+7 天内提交复盘总结，纪检委员监督</div>
      <div class="space-y-2">
        ${reviewData.map(r => `
          <div class="p-3 rounded-xl bg-gray-50">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium text-gray-800">${r.activity}</div>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full ${r.reviewStatus === '已上传' ? 'bg-amber-100 text-amber-700' : r.reviewStatus === '未提交' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}">${r.reviewStatus}</span>
            </div>
            ${r.reviewContent ? `<div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded-lg border border-gray-100">${r.reviewContent}</div>` : ''}
            <div class="flex gap-2">
              ${r.reviewStatus === '—' || r.reviewStatus === '未提交' ? '<button class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 btn-orgz-submit-review" style="cursor:pointer;">提交复盘</button>' : ''}
              ${r.reviewStatus === '已上传' ? '<span class="text-[10px] text-amber-600">等待纪检委员确认</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.querySelectorAll('.btn-orgz-submit-review').forEach(btn => {
    btn.addEventListener('click', () => showToast('info', '复盘提交表单 — 待实现'));
  });
}

function _renderInspectionContent() {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;
  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#3B82F6;">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">考察查看</h4>
      <div class="text-xs text-gray-500 mb-3">组织者对自己组织的活动整体考察情况有只读权限</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(INSPECTION_RECORDS).map(i => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${i.name}</td>
              <td class="py-2 px-3 text-gray-600">${i.source}</td>
              <td class="py-2 px-3 text-gray-600">${i.content}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${i.status === '已确认' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${i.status}</span></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ── 交接记录状态标签 ──────────────────────────────────────────
function _handoverStatusStyle(status) {
  switch (status) {
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    case 'submitted': return 'bg-amber-100 text-amber-700';
    case 'confirmed': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function _handoverStatusLabel(status) {
  switch (status) {
    case 'in_progress': return '进行中';
    case 'submitted': return '已提交';
    case 'confirmed': return '已确认';
    default: return status;
  }
}

/** 渲染数据交接 Tab 内容 */
function _renderHandoverContent(activities) {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;

  // 组织者负责的活动和专班
  const organizerActivities = activities.filter(a =>
    a.organizer === HANDOVER_ORGANIZER_ID || (typeof a.organizer === 'string' && a.organizer.includes(HANDOVER_ORGANIZER_ID))
  );
  const organizerTaskforces = MOCK_TASKFORCES.filter(tf =>
    tf.initiator === HANDOVER_ORGANIZER_ID || tf.members.some(m => m.personId === HANDOVER_ORGANIZER_ID && m.role === '组织者')
  );

  // 已有交接记录
  const allRecords = _loadHandoverRecords();
  const myRecords = allRecords.filter(r => r.recorderId === HANDOVER_ORGANIZER_ID);

  // 按来源分组
  const activityRecords = myRecords.filter(r => r.type === 'activity');
  const taskforceRecords = myRecords.filter(r => r.type === 'taskforce');

  // 来源下拉选项
  const sourceOptions = _handoverDraft.type === 'activity'
    ? organizerActivities.map(a => `<option value="${a.id}" ${_handoverDraft.sourceId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`).join('')
    : organizerTaskforces.map(tf => `<option value="${tf.id}" ${_handoverDraft.sourceId === tf.id ? 'selected' : ''}>${tf.name}</option>`).join('');

  // 交接项动态列表
  const itemsHTML = _handoverDraft.items.length === 0
    ? '<p class="text-xs text-gray-400 text-center py-3">暂无交接项，请点击下方按钮添加</p>'
    : _handoverDraft.items.map((item, idx) => `
      <div class="p-3 rounded-xl bg-gray-50 space-y-2 relative" data-handover-item-idx="${idx}">
        <button class="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-xs btn-handover-remove-item" data-item-idx="${idx}" style="cursor:pointer;border:none;line-height:1;">x</button>
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="block text-[10px] font-medium text-gray-500 mb-1">交接项名称</label>
            <input type="text" class="handover-item-name w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" placeholder="如：考勤数据、宣传档案" data-item-idx="${idx}" value="${item.name}" />
          </div>
          <div class="flex-1">
            <label class="block text-[10px] font-medium text-gray-500 mb-1">描述</label>
            <input type="text" class="handover-item-desc w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" placeholder="交接项说明" data-item-idx="${idx}" value="${item.description}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-1">负责人</label>
          <div id="handover-item-picker-${idx}" class="handover-item-picker-mount"></div>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 创建交接记录 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#0EA5E9;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">创建交接记录</h4>
        <div class="text-xs text-gray-500 mb-4">活动组织者记录活动交接数据，专班组织者记录专班交接数据，汇总到纪检委员处</div>

        <!-- 来源类型 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">来源类型</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="handover-type" value="activity" ${_handoverDraft.type === 'activity' ? 'checked' : ''} class="handover-type-radio" />
              <span class="text-xs text-gray-700">活动</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="handover-type" value="taskforce" ${_handoverDraft.type === 'taskforce' ? 'checked' : ''} class="handover-type-radio" />
              <span class="text-xs text-gray-700">专班</span>
            </label>
          </div>
        </div>

        <!-- 选择来源 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">选择${_handoverDraft.type === 'activity' ? '活动' : '专班'}</label>
          <select id="handover-source-select" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;">
            <option value="">-- 请选择${_handoverDraft.type === 'activity' ? '活动' : '专班'} --</option>
            ${sourceOptions}
          </select>
        </div>

        <!-- 交接项列表 -->
        <div class="mb-3">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-medium text-gray-600">交接项列表</label>
            <button id="btn-add-handover-item" class="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors" style="cursor:pointer;">+ 添加交接项</button>
          </div>
          <div id="handover-items-list" class="space-y-2">
            ${itemsHTML}
          </div>
        </div>

        <!-- 归档沉淀维护分工 -->
        <div class="mb-4">
          <label class="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" id="handover-archive-check" ${_handoverDraft.hasArchiveAssignment ? 'checked' : ''} class="rounded" />
            <span class="text-xs text-gray-700">需要专门的"归档沉淀维护"分工</span>
          </label>
          <div id="handover-archive-picker-area" class="${_handoverDraft.hasArchiveAssignment ? '' : 'hidden'}">
            <label class="block text-[10px] font-medium text-gray-500 mb-1">归档沉淀维护负责人</label>
            <div id="handover-archive-picker-mount"></div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="flex items-center gap-3">
          <button id="handover-submit-btn" class="px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors" style="background:#0EA5E9;" disabled>创建交接记录</button>
          <span id="handover-submit-hint" class="text-[10px] text-gray-400"></span>
        </div>
      </div>

      <!-- 已有交接记录 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#6366F1;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">已有交接记录</h4>
        <div class="text-xs text-gray-500 mb-3">按来源分组展示，所有交接项完成后可提交交接</div>
        <div id="handover-records-list">
          ${_renderHandoverRecordsHTML(activityRecords, taskforceRecords)}
        </div>
      </div>
    </div>
  `;

  _bindHandoverEvents(organizerActivities, organizerTaskforces);
}

/** 渲染已有交接记录 HTML */
function _renderHandoverRecordsHTML(activityRecords, taskforceRecords) {
  if (activityRecords.length === 0 && taskforceRecords.length === 0) {
    return '<p class="text-xs text-gray-400 text-center py-4">暂无交接记录</p>';
  }

  let html = '';

  if (activityRecords.length > 0) {
    html += `
      <div class="mb-3">
        <div class="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          活动交接
        </div>
        <div class="space-y-2">
          ${activityRecords.map(r => _renderSingleHandoverRecord(r)).join('')}
        </div>
      </div>
    `;
  }

  if (taskforceRecords.length > 0) {
    html += `
      <div class="mb-3">
        <div class="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          专班交接
        </div>
        <div class="space-y-2">
          ${taskforceRecords.map(r => _renderSingleHandoverRecord(r)).join('')}
        </div>
      </div>
    `;
  }

  return html;
}

/** 渲染单条交接记录 */
function _renderSingleHandoverRecord(r) {
  const completedItems = r.items.filter(i => i.status === 'completed').length;
  const totalItems = r.items.length;
  const allItemsCompleted = totalItems > 0 && completedItems === totalItems;

  return `
    <div class="p-3 rounded-xl bg-gray-50" data-handover-record-id="${r.id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">${r.sourceName}</span>
          <span class="px-1.5 py-0.5 rounded-full text-[10px] ${_handoverStatusStyle(r.status)}">${_handoverStatusLabel(r.status)}</span>
        </div>
        <div class="text-[10px] text-gray-500">${completedItems}/${totalItems} 项已完成</div>
      </div>
      ${r.hasArchiveAssignment ? `<div class="text-[10px] text-indigo-600 mb-1">归档沉淀维护：${PEOPLE.find(p => p.id === r.archiveAssigneeId)?.name || r.archiveAssigneeId || '—'}</div>` : ''}
      <div class="space-y-1">
        ${r.items.map((item, idx) => {
          const assigneeName = PEOPLE.find(p => p.id === item.assigneeId)?.name || item.assigneeId;
          return `
            <div class="flex items-center justify-between p-2 rounded-lg ${item.status === 'completed' ? 'bg-green-50' : 'bg-white'} border border-gray-100">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium text-gray-700">${item.name}</span>
                  <span class="px-1 py-0.5 rounded text-[10px] ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">${item.status === 'completed' ? '已完成' : '待完成'}</span>
                </div>
                <div class="text-[10px] text-gray-400 mt-0.5">${item.description ? item.description + ' · ' : ''}负责人：${assigneeName}</div>
              </div>
              ${item.status !== 'completed' && r.status === 'in_progress' ? `<button class="btn-complete-handover-item ml-2 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors" style="background:rgba(16,185,129,0.1);color:#059669;border:1px solid rgba(16,185,129,0.3);cursor:pointer;" data-record-id="${r.id}" data-item-idx="${idx}">标记完成</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      ${r.status === 'in_progress' && allItemsCompleted ? `
        <div class="mt-2">
          <button class="btn-submit-handover px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors" style="background:#0EA5E9;cursor:pointer;" data-record-id="${r.id}">提交交接</button>
        </div>
      ` : ''}
      ${r.status === 'submitted' ? '<div class="mt-2 text-[10px] text-amber-600">已提交，等待纪检委员确认</div>' : ''}
      ${r.status === 'confirmed' ? `<div class="mt-2 text-[10px] text-green-600">已确认${r.confirmedAt ? ' · ' + _formatCompletedAt(r.confirmedAt) : ''}</div>` : ''}
    </div>
  `;
}

/** 绑定数据交接 Tab 事件 */
function _bindHandoverEvents(organizerActivities, organizerTaskforces) {
  const tabContent = document.getElementById('orgz-tab-content');

  // 来源类型切换
  tabContent.querySelectorAll('.handover-type-radio').forEach(radio => {
    radio.addEventListener('change', (e) => {
      _handoverDraft.type = e.target.value;
      _handoverDraft.sourceId = '';
      // 重新渲染整个 Tab
      const state = getAppState();
      const activities = state.activities || [];
      const filteredState = _filterByRole(state, 'organizer');
      _renderHandoverContent(filteredState.activities || activities);
    });
  });

  // 来源选择
  const sourceSelect = document.getElementById('handover-source-select');
  if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
      _handoverDraft.sourceId = e.target.value;
      _updateHandoverSubmitState();
    });
  }

  // 添加交接项
  const addItemBtn = document.getElementById('btn-add-handover-item');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      _handoverDraft.items.push({ name: '', description: '', assigneeId: '' });
      // 重新渲染整个 Tab
      const state = getAppState();
      const activities = state.activities || [];
      const filteredState = _filterByRole(state, 'organizer');
      _renderHandoverContent(filteredState.activities || activities);
    });
  }

  // 删除交接项（事件委托）
  const itemsList = document.getElementById('handover-items-list');
  if (itemsList) {
    itemsList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-handover-remove-item');
      if (btn) {
        const idx = parseInt(btn.dataset.itemIdx, 10);
        _handoverDraft.items.splice(idx, 1);
        const state = getAppState();
        const activities = state.activities || [];
        const filteredState = _filterByRole(state, 'organizer');
        _renderHandoverContent(filteredState.activities || activities);
      }
    });

    // 交接项名称输入
    itemsList.addEventListener('input', (e) => {
      if (e.target.classList.contains('handover-item-name')) {
        const idx = parseInt(e.target.dataset.itemIdx, 10);
        if (_handoverDraft.items[idx]) {
          _handoverDraft.items[idx].name = e.target.value;
          _updateHandoverSubmitState();
        }
      }
      if (e.target.classList.contains('handover-item-desc')) {
        const idx = parseInt(e.target.dataset.itemIdx, 10);
        if (_handoverDraft.items[idx]) {
          _handoverDraft.items[idx].description = e.target.value;
        }
      }
    });
  }

  // 为每个交接项初始化 PersonPicker
  _handoverDraft.items.forEach((item, idx) => {
    const pickerMount = document.getElementById(`handover-item-picker-${idx}`);
    if (pickerMount) {
      const picker = new PersonPicker({
        mode: 'single',
        placeholder: '选择负责人',
        initialIds: item.assigneeId ? [item.assigneeId] : [],
        onSelect: (personIds) => {
          _handoverDraft.items[idx].assigneeId = personIds[0] || '';
          _updateHandoverSubmitState();
        },
      });
      picker.render(pickerMount);
    }
  });

  // 归档沉淀维护 checkbox
  const archiveCheck = document.getElementById('handover-archive-check');
  if (archiveCheck) {
    archiveCheck.addEventListener('change', (e) => {
      _handoverDraft.hasArchiveAssignment = e.target.checked;
      const archiveArea = document.getElementById('handover-archive-picker-area');
      if (archiveArea) {
        archiveArea.classList.toggle('hidden', !e.target.checked);
      }
      if (e.target.checked) {
        // 初始化归档负责人 PersonPicker
        const archivePickerMount = document.getElementById('handover-archive-picker-mount');
        if (archivePickerMount && !archivePickerMount.hasChildNodes()) {
          const picker = new PersonPicker({
            mode: 'single',
            placeholder: '选择归档沉淀维护负责人',
            initialIds: _handoverDraft.archiveAssigneeId ? [_handoverDraft.archiveAssigneeId] : [],
            onSelect: (personIds) => {
              _handoverDraft.archiveAssigneeId = personIds[0] || '';
              _updateHandoverSubmitState();
            },
          });
          picker.render(archivePickerMount);
        }
      }
      _updateHandoverSubmitState();
    });
  }

  // 如果勾选了归档分工，初始化 PersonPicker
  if (_handoverDraft.hasArchiveAssignment) {
    const archivePickerMount = document.getElementById('handover-archive-picker-mount');
    if (archivePickerMount) {
      const picker = new PersonPicker({
        mode: 'single',
        placeholder: '选择归档沉淀维护负责人',
        initialIds: _handoverDraft.archiveAssigneeId ? [_handoverDraft.archiveAssigneeId] : [],
        onSelect: (personIds) => {
          _handoverDraft.archiveAssigneeId = personIds[0] || '';
          _updateHandoverSubmitState();
        },
      });
      picker.render(archivePickerMount);
    }
  }

  // 提交按钮
  const submitBtn = document.getElementById('handover-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      _submitHandoverRecord(organizerActivities, organizerTaskforces);
    });
    submitBtn.addEventListener('mouseenter', function() {
      if (!this.disabled) this.style.background = '#0284C7';
    });
    submitBtn.addEventListener('mouseleave', function() {
      if (!this.disabled) this.style.background = '#0EA5E9';
      else this.style.background = '#9CA3AF';
    });
  }

  // 标记交接项完成（事件委托）
  const recordsList = document.getElementById('handover-records-list');
  if (recordsList) {
    recordsList.addEventListener('click', (e) => {
      const completeBtn = e.target.closest('.btn-complete-handover-item');
      if (completeBtn) {
        const recordId = completeBtn.dataset.recordId;
        const itemIdx = parseInt(completeBtn.dataset.itemIdx, 10);
        _completeHandoverItem(recordId, itemIdx);
        showToast('success', '交接项已标记为完成');
        _refreshHandoverRecordsList();
      }

      const submitHandoverBtn = e.target.closest('.btn-submit-handover');
      if (submitHandoverBtn) {
        const recordId = submitHandoverBtn.dataset.recordId;
        _updateHandoverRecord(recordId, {
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        });
        showToast('success', '交接记录已提交，等待纪检委员确认');
        _refreshHandoverRecordsList();
      }
    });
  }

  _updateHandoverSubmitState();
}

/** 更新交接记录提交按钮状态 */
function _updateHandoverSubmitState() {
  const btn = document.getElementById('handover-submit-btn');
  const hint = document.getElementById('handover-submit-hint');
  if (!btn) return;

  const { type, sourceId, items, hasArchiveAssignment, archiveAssigneeId } = _handoverDraft;
  const hasSource = !!sourceId;
  const hasItems = items.length > 0;
  const allItemsHaveName = items.every(i => i.name.trim().length > 0);
  const allItemsHaveAssignee = items.every(i => !!i.assigneeId);
  const archiveOk = !hasArchiveAssignment || !!archiveAssigneeId;

  const canSubmit = hasSource && hasItems && allItemsHaveName && allItemsHaveAssignee && archiveOk;
  btn.disabled = !canSubmit;
  btn.style.background = canSubmit ? '#0EA5E9' : '#9CA3AF';
  btn.style.cursor = canSubmit ? 'pointer' : 'not-allowed';

  if (hint) {
    if (!hasSource) hint.textContent = `请选择${type === 'activity' ? '活动' : '专班'}`;
    else if (!hasItems) hint.textContent = '请添加至少一个交接项';
    else if (!allItemsHaveName) hint.textContent = '请填写所有交接项名称';
    else if (!allItemsHaveAssignee) hint.textContent = '请为所有交接项选择负责人';
    else if (!archiveOk) hint.textContent = '请选择归档沉淀维护负责人';
    else hint.textContent = '';
  }
}

/** 提交交接记录 */
function _submitHandoverRecord(organizerActivities, organizerTaskforces) {
  const { type, sourceId, items, hasArchiveAssignment, archiveAssigneeId } = _handoverDraft;
  if (!sourceId || items.length === 0) return;

  const sourceName = type === 'activity'
    ? (organizerActivities.find(a => a.id === sourceId)?.title || sourceId)
    : (organizerTaskforces.find(tf => tf.id === sourceId)?.name || sourceId);

  const record = {
    id: 'ho_' + Date.now(),
    type,
    sourceId,
    sourceName,
    recorderId: HANDOVER_ORGANIZER_ID,
    items: items.map(i => ({
      name: i.name.trim(),
      description: i.description.trim(),
      status: 'pending',
      assigneeId: i.assigneeId,
    })),
    hasArchiveAssignment,
    archiveAssigneeId: hasArchiveAssignment ? archiveAssigneeId : null,
    status: 'in_progress',
    submittedAt: null,
    confirmedAt: null,
    createdAt: new Date().toISOString(),
  };

  _addHandoverRecord(record);
  showToast('success', `交接记录「${sourceName}」已创建`);

  // 重置草稿
  _handoverDraft = { type: 'activity', sourceId: '', items: [], hasArchiveAssignment: false, archiveAssigneeId: '' };

  // 重新渲染
  const state = getAppState();
  const activities = state.activities || [];
  const filteredState = _filterByRole(state, 'organizer');
  _renderHandoverContent(filteredState.activities || activities);
}

/** 刷新交接记录展示区域 */
function _refreshHandoverRecordsList() {
  const listEl = document.getElementById('handover-records-list');
  if (!listEl) return;

  const allRecords = _loadHandoverRecords();
  const myRecords = allRecords.filter(r => r.recorderId === HANDOVER_ORGANIZER_ID);
  const activityRecords = myRecords.filter(r => r.type === 'activity');
  const taskforceRecords = myRecords.filter(r => r.type === 'taskforce');

  listEl.innerHTML = _renderHandoverRecordsHTML(activityRecords, taskforceRecords);
}

// ── 文件空间数据层（localStorage） ────────────────────────────
const FILESPACE_STORAGE_KEY = 'file_space_records';
const FILESPACE_ORGANIZER_ID = 'p3';

const FILE_CATEGORY_LABELS = {
  experience: '经验沉淀',
  raw: '原始文件',
  publicity: '宣传素材',
};
const FILE_CATEGORY_STYLES = {
  experience: 'bg-purple-100 text-purple-700',
  raw: 'bg-amber-100 text-amber-700',
  publicity: 'bg-pink-100 text-pink-700',
};
const FILE_CATEGORY_ICONS = {
  experience: '📝',
  raw: '📎',
  publicity: '🎨',
};

/** 读取所有文件空间记录 */
function _loadFileSpaceRecords() {
  try {
    const raw = localStorage.getItem(FILESPACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ws-organizer] 读取文件空间记录失败', e);
    return [];
  }
}

/** 写入所有文件空间记录 */
function _saveFileSpaceRecords(records) {
  try {
    localStorage.setItem(FILESPACE_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('[ws-organizer] 写入文件空间记录失败', e);
  }
}

/** 新增一条文件记录 */
function _addFileSpaceRecord(record) {
  const records = _loadFileSpaceRecords();
  records.push(record);
  _saveFileSpaceRecords(records);
  return records;
}

/** 删除一条文件记录 */
function _deleteFileSpaceRecord(recordId) {
  let records = _loadFileSpaceRecords();
  records = records.filter(r => r.id !== recordId);
  _saveFileSpaceRecords(records);
  return records;
}

// ── 文件空间临时状态 ──────────────────────────────────────────
let _fileSpaceDraft = {
  fileName: '',
  category: 'experience',
  description: '',
  sourceType: 'standalone',
  sourceId: '',
  tags: '',
};

/** 渲染文件空间 Tab 内容 */
function _renderFileSpaceContent(activities) {
  const container = document.getElementById('orgz-tab-content');
  if (!container) return;

  const allRecords = _loadFileSpaceRecords();
  const myRecords = allRecords.filter(r => r.uploadedBy === FILESPACE_ORGANIZER_ID);

  // 按分类统计
  const stats = { experience: 0, raw: 0, publicity: 0 };
  myRecords.forEach(r => { if (stats[r.category] !== undefined) stats[r.category]++; });

  // 来源下拉选项
  const sourceOptions = _fileSpaceDraft.sourceType === 'activity'
    ? activities.map(a => `<option value="${a.id}" ${_fileSpaceDraft.sourceId === a.id ? 'selected' : ''}>${a.title}（${a.date}）</option>`).join('')
    : _fileSpaceDraft.sourceType === 'taskforce'
    ? MOCK_TASKFORCES.map(tf => `<option value="${tf.id}" ${_fileSpaceDraft.sourceId === tf.id ? 'selected' : ''}>${tf.name}</option>`).join('')
    : '';

  // 按分类分组的文件列表
  const groupedRecords = {};
  myRecords.forEach(r => {
    if (!groupedRecords[r.category]) groupedRecords[r.category] = [];
    groupedRecords[r.category].push(r);
  });

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 统计概览 -->
      <div class="flex gap-3">
        <div class="flex-1 card rounded-2xl p-4 text-center border-l-4" style="border-left-color:#8B5CF6;">
          <div class="text-2xl font-bold text-purple-600">${stats.experience}</div>
          <div class="text-[10px] text-gray-500 mt-1">经验沉淀</div>
        </div>
        <div class="flex-1 card rounded-2xl p-4 text-center border-l-4" style="border-left-color:#F59E0B;">
          <div class="text-2xl font-bold text-amber-600">${stats.raw}</div>
          <div class="text-[10px] text-gray-500 mt-1">原始文件</div>
        </div>
        <div class="flex-1 card rounded-2xl p-4 text-center border-l-4" style="border-left-color:#EC4899;">
          <div class="text-2xl font-bold text-pink-600">${stats.publicity}</div>
          <div class="text-[10px] text-gray-500 mt-1">宣传素材</div>
        </div>
      </div>

      <!-- 添加文件记录 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#10B981;">
        <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">添加文件记录</h4>
        <div class="text-xs text-gray-500 mb-4">记录文件元数据（文件名、分类、描述、关联来源），纯前端暂不支持实际文件上传</div>

        <!-- 文件名 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">文件名</label>
          <input type="text" id="fs-file-name" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;" placeholder="如：2026年5月党小组会记录.docx" value="${_fileSpaceDraft.fileName}" />
        </div>

        <!-- 分类 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">文件分类</label>
          <div class="flex gap-2">
            ${Object.entries(FILE_CATEGORY_LABELS).map(([key, label]) => `
              <label class="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-xs transition-colors ${_fileSpaceDraft.category === key ? FILE_CATEGORY_STYLES[key] + ' border-current' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}">
                <input type="radio" name="fs-category" value="${key}" ${_fileSpaceDraft.category === key ? 'checked' : ''} class="fs-category-radio" />
                <span>${FILE_CATEGORY_ICONS[key]} ${label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- 描述 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">文件描述</label>
          <textarea id="fs-description" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" rows="2" style="max-width:360px;" placeholder="简要描述文件内容与用途">${_fileSpaceDraft.description}</textarea>
        </div>

        <!-- 关联来源 -->
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">关联来源</label>
          <div class="flex gap-3 mb-2">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="fs-source-type" value="standalone" ${_fileSpaceDraft.sourceType === 'standalone' ? 'checked' : ''} class="fs-source-type-radio" />
              <span class="text-xs text-gray-700">独立文件</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="fs-source-type" value="activity" ${_fileSpaceDraft.sourceType === 'activity' ? 'checked' : ''} class="fs-source-type-radio" />
              <span class="text-xs text-gray-700">关联活动</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="fs-source-type" value="taskforce" ${_fileSpaceDraft.sourceType === 'taskforce' ? 'checked' : ''} class="fs-source-type-radio" />
              <span class="text-xs text-gray-700">关联专班</span>
            </label>
          </div>
          ${_fileSpaceDraft.sourceType !== 'standalone' ? `
            <select id="fs-source-select" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;">
              <option value="">-- 请选择${_fileSpaceDraft.sourceType === 'activity' ? '活动' : '专班'} --</option>
              ${sourceOptions}
            </select>
          ` : ''}
        </div>

        <!-- 标签 -->
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">标签（逗号分隔）</label>
          <input type="text" id="fs-tags" class="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 font-stheiti" style="max-width:360px;" placeholder="如：考勤, 三会一课, 宣传" value="${_fileSpaceDraft.tags}" />
        </div>

        <!-- 提交按钮 -->
        <div class="flex items-center gap-3">
          <button id="fs-submit-btn" class="px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors" style="background:#10B981;" disabled>添加文件记录</button>
          <span id="fs-submit-hint" class="text-[10px] text-gray-400"></span>
        </div>
      </div>

      <!-- 文件列表 -->
      ${Object.entries(FILE_CATEGORY_LABELS).map(([cat, catLabel]) => {
        const catRecords = groupedRecords[cat] || [];
        if (catRecords.length === 0) return '';
        return `
          <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:${cat === 'experience' ? '#8B5CF6' : cat === 'raw' ? '#F59E0B' : '#EC4899'};">
            <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">${FILE_CATEGORY_ICONS[cat]} ${catLabel}（${catRecords.length}）</h4>
            <div class="space-y-2">
              ${catRecords.map(r => {
                const uploader = PEOPLE.find(p => p.id === r.uploadedBy);
                const uploaderName = uploader ? uploader.name : r.uploadedBy;
                const uploadDate = r.uploadedAt ? _formatCompletedAt(r.uploadedAt) : '—';
                return `
                  <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50" data-fs-id="${r.id}">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-800">${r.fileName}</span>
                        ${r.sourceName ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">${r.sourceName}</span>` : ''}
                      </div>
                      <div class="text-[10px] text-gray-500 mt-0.5">
                        <span>上传人：${uploaderName}</span>
                        <span class="mx-1">|</span>
                        <span>${uploadDate}</span>
                        ${r.tags ? `<span class="mx-1">|</span><span class="text-gray-400">${r.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => '#' + t).join(' ')}</span>` : ''}
                      </div>
                      ${r.description ? `<div class="text-[10px] text-gray-400 mt-0.5 truncate">${r.description}</div>` : ''}
                    </div>
                    <button class="btn-delete-fs ml-2 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors" style="background:rgba(239,68,68,0.1);color:#DC2626;border:1px solid rgba(239,68,68,0.3);cursor:pointer;" data-fs-id="${r.id}">删除</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}

      ${myRecords.length === 0 ? '<p class="text-xs text-gray-400 text-center py-8">暂无文件记录，请点击上方添加</p>' : ''}
    </div>
  `;

  _bindFileSpaceEvents(activities);
}

/** 绑定文件空间 Tab 事件 */
function _bindFileSpaceEvents(activities) {
  // 文件名输入
  const fileNameInput = document.getElementById('fs-file-name');
  if (fileNameInput) {
    fileNameInput.addEventListener('input', (e) => {
      _fileSpaceDraft.fileName = e.target.value;
      _updateFileSpaceSubmitState();
    });
  }

  // 分类切换
  document.querySelectorAll('.fs-category-radio').forEach(radio => {
    radio.addEventListener('change', (e) => {
      _fileSpaceDraft.category = e.target.value;
      // 重新渲染以更新分类按钮样式
      const state = getAppState();
      const filteredState = _filterByRole(state, 'organizer');
      _renderFileSpaceContent(filteredState.activities || activities);
    });
  });

  // 描述输入
  const descInput = document.getElementById('fs-description');
  if (descInput) {
    descInput.addEventListener('input', (e) => {
      _fileSpaceDraft.description = e.target.value;
    });
  }

  // 来源类型切换
  document.querySelectorAll('.fs-source-type-radio').forEach(radio => {
    radio.addEventListener('change', (e) => {
      _fileSpaceDraft.sourceType = e.target.value;
      _fileSpaceDraft.sourceId = '';
      const state = getAppState();
      const filteredState = _filterByRole(state, 'organizer');
      _renderFileSpaceContent(filteredState.activities || activities);
    });
  });

  // 来源选择
  const sourceSelect = document.getElementById('fs-source-select');
  if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
      _fileSpaceDraft.sourceId = e.target.value;
    });
  }

  // 标签输入
  const tagsInput = document.getElementById('fs-tags');
  if (tagsInput) {
    tagsInput.addEventListener('input', (e) => {
      _fileSpaceDraft.tags = e.target.value;
    });
  }

  // 提交按钮
  const submitBtn = document.getElementById('fs-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      _submitFileSpaceRecord(activities);
    });
    submitBtn.addEventListener('mouseenter', function() {
      if (!this.disabled) this.style.background = '#059669';
    });
    submitBtn.addEventListener('mouseleave', function() {
      if (!this.disabled) this.style.background = '#10B981';
      else this.style.background = '#9CA3AF';
    });
  }

  // 删除按钮（事件委托）
  const tabContent = document.getElementById('orgz-tab-content');
  if (tabContent) {
    tabContent.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete-fs');
      if (btn) {
        const recordId = btn.dataset.fsId;
        if (confirm('确定删除此文件记录？')) {
          _deleteFileSpaceRecord(recordId);
          showToast('success', '文件记录已删除');
          const state = getAppState();
          const filteredState = _filterByRole(state, 'organizer');
          _renderFileSpaceContent(filteredState.activities || activities);
        }
      }
    });
  }

  _updateFileSpaceSubmitState();
}

/** 更新文件空间提交按钮状态 */
function _updateFileSpaceSubmitState() {
  const btn = document.getElementById('fs-submit-btn');
  const hint = document.getElementById('fs-submit-hint');
  if (!btn) return;

  const hasFileName = _fileSpaceDraft.fileName.trim().length > 0;
  btn.disabled = !hasFileName;
  btn.style.background = hasFileName ? '#10B981' : '#9CA3AF';
  btn.style.cursor = hasFileName ? 'pointer' : 'not-allowed';

  if (hint) {
    hint.textContent = hasFileName ? '' : '请填写文件名';
  }
}

/** 提交文件空间记录 */
function _submitFileSpaceRecord(activities) {
  const { fileName, category, description, sourceType, sourceId, tags } = _fileSpaceDraft;
  if (!fileName.trim()) return;

  // 获取来源名称
  let sourceName = '';
  if (sourceType === 'activity' && sourceId) {
    const activity = activities.find(a => a.id === sourceId);
    sourceName = activity ? activity.title : '';
  } else if (sourceType === 'taskforce' && sourceId) {
    const tf = MOCK_TASKFORCES.find(t => t.id === sourceId);
    sourceName = tf ? tf.name : '';
  }

  const record = {
    id: 'fs_' + Date.now(),
    fileName: fileName.trim(),
    category,
    description: description.trim(),
    sourceType,
    sourceId: sourceType === 'standalone' ? '' : sourceId,
    sourceName,
    uploadedBy: FILESPACE_ORGANIZER_ID,
    uploadedAt: new Date().toISOString(),
    tags: tags.trim(),
  };

  _addFileSpaceRecord(record);
  showToast('success', `文件记录「${record.fileName}」已添加`);

  // 重置草稿
  _fileSpaceDraft = { fileName: '', category: 'experience', description: '', sourceType: 'standalone', sourceId: '', tags: '' };

  // 重新渲染
  const state = getAppState();
  const filteredState = _filterByRole(state, 'organizer');
  _renderFileSpaceContent(filteredState.activities || activities);
}

registerRenderCallback(renderOrganizerUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); } catch (e) { console.warn('[ws-organizer] loadDB error', e); }
  setState({ domain: 'activity', role: 'organizer', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'organizer' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-organizer] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
