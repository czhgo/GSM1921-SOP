import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { BranchService } from '../services/runtime.js';
import { showToast } from '../core/utils.js';
import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { ATTENDANCE_RECORDS, attendanceToLong, INSPECTION_RECORDS, inspectionToLong, ACTIVITIES, PEOPLE, MOCK_TASKFORCES } from '../mock/index.js';
import { PersonPicker } from '../components/person-picker.js';
import { sopDatabase } from '../workflow/sopData.js';
import { instantiateSOP } from '../workflow/sop.js';
import { renderWorkflow } from '../workflow/renderer.js';

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
AuthStore.setActiveRole('workspace', savedState.selectedRole || 'leader');
if (savedState.stance) AuthStore.setPrimaryRole(savedState.stance);
ViewModeStore.setMode('workspace', 'manage');

const accent = '#CE1126';
const accentRgba = 'rgba(206,17,38,0.1)';
const accentBorder = 'rgba(206,17,38,0.3)';

// ── localStorage 辅助函数 ──────────────────────────────────────
function _loadAttendanceRecords() {
  try {
    const raw = localStorage.getItem('attendance_records');
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('[ws-leader] load attendance_records error', e); }
  return null;
}

function _saveAttendanceRecords(records) {
  localStorage.setItem('attendance_records', JSON.stringify(records));
}

function _getAttendanceRecords() {
  const stored = _loadAttendanceRecords();
  return stored && stored.length > 0 ? stored : [...ATTENDANCE_RECORDS];
}

function _loadInspectionRecords() {
  try {
    const raw = localStorage.getItem('inspection_records');
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('[ws-leader] load inspection_records error', e); }
  return null;
}

function _saveInspectionRecords(records) {
  localStorage.setItem('inspection_records', JSON.stringify(records));
}

function _getInspectionRecords() {
  const stored = _loadInspectionRecords();
  return stored && stored.length > 0 ? stored : [...INSPECTION_RECORDS];
}

// ── 表单状态 ──────────────────────────────────────────────────
let _attFormVisible = false;
let _attPickerInstance = null;
let _inspFormVisible = false;
let _inspPickerInstance = null;

// ── 组长→党小组映射 ──────────────────────────────────────────
const LEADER_GROUP_MAP = {
  'p4': '第三党小组',  // 赵六（第三党小组组长）
  'p6': '第一党小组',  // 孙八（第一党小组组长）
};

// ── 补课任务数据层（只读） ────────────────────────────────────
const MAKEUP_STORAGE_KEY = 'makeup_tasks';

function _loadMakeupTasks() {
  try {
    const raw = localStorage.getItem(MAKEUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ws-leader] 读取补课任务失败', e);
    return [];
  }
}

function _filterByRole(state, role) {
  const activities = (state.activities || []).filter(a => {
    if (role === 'leader') return a.direction === 'top-down' || (a.organizer && a.organizer.includes('leader'));
    return true;
  });
  return { ...state, activities };
}

function renderLeaderUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('leader-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'leader');
  const filteredActivities = filteredState.activities || [];

  container.innerHTML = `
    <div class="flex gap-2 mb-4">
      <button class="leader-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-leader-tab="write" style="background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">活动写入</button>
      <button class="leader-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-leader-tab="attendance" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考勤上传</button>
      <button class="leader-tab-btn px-4 py-2 text-xs font-medium rounded-lg transition-colors" data-leader-tab="inspection" style="background:white;color:#6B7280;border:1px solid #E5E7EB;">考察上传</button>
    </div>
    <div id="leader-tab-content"></div>
  `;

  container.querySelectorAll('.leader-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.leader-tab-btn').forEach(b => {
        b.style.background = 'white'; b.style.color = '#6B7280'; b.style.border = '1px solid #E5E7EB';
      });
      btn.style.background = accentRgba; btn.style.color = accent; btn.style.border = `1px solid ${accentBorder}`;
      const tab = btn.dataset.leaderTab;
      if (tab === 'write') _renderWriteContent(filteredActivities);
      else if (tab === 'attendance') _renderAttendanceContent();
      else if (tab === 'inspection') _renderInspectionContent();
    });
  });

  _renderWriteContent(filteredActivities);
}

// ── 决策树配置 ──────────────────────────────────────────────────
const DECISION_TREE = {
  L1: [
    { value: 'party-group-meeting', label: '党小组会', color: '#7C3AED' },
    { value: 'theme-party', label: '主题党日', color: '#2563EB' },
  ],
  L2: {
    'party-group-meeting': [
      { value: 'meeting', label: '会议', color: '#7C3AED' },
    ],
    'theme-party': [
      { value: 'study', label: '学习', color: '#2563EB' },
      { value: 'visit', label: '参访', color: '#059669' },
      { value: 'forum', label: '座谈', color: '#EA580C' },
      { value: 'co-build', label: '共建', color: '#DB2777' },
      { value: 'meeting', label: '会议', color: '#7C3AED' },
    ],
  },
  L3: [
    { value: 'short', label: '短期' },
    { value: 'long', label: '长期' },
  ],
  L4: [
    { value: 'top-down', label: '自上而下' },
    { value: 'bottom-up', label: '自下而上' },
  ],
  HOST_GROUPS: ['第二党小组', '第三党小组'],
  SCENARIO_MAP: {
    'party-group-meeting': 'party-group-meeting',
    'theme-party': 'theme-party',
  },
};

// 决策树状态
let dtState = { step: 0, L1: null, L2: null, L3: null, L4: null, hostGroup: null, showPanel: false };

function _resetDtState() {
  dtState = { step: 0, L1: null, L2: null, L3: null, L4: null, hostGroup: null, showPanel: false };
}

/** 根据决策树选择（L3时长 + L1场景）映射工作流定义ID */
function _mapToDefinitionId() {
  if (dtState.L1 === 'theme-party') return 'theme-party-day';
  // 党小组会场景：根据 L3 时长决定
  return dtState.L3 === 'long' ? 'long-term' : 'short-term';
}

/** 渲染工作流可视化面板 */
function _renderWorkflowPanel(definitionId, activityTitle) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 移除已有的工作流面板（避免重复）
  const existing = document.getElementById('leader-workflow');
  if (existing) existing.remove();

  // 创建面板容器
  const panel = document.createElement('div');
  panel.id = 'leader-workflow';
  panel.className = 'workflow-panel-card';
  panel.innerHTML = `
    <div class="workflow-panel-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      工作流追踪 — ${activityTitle || '新活动'}
    </div>
    <div id="leader-workflow-content"></div>
  `;

  // 插入到容器末尾（活动列表下方）
  container.appendChild(panel);

  // 渲染工作流可视化
  const contentEl = document.getElementById('leader-workflow-content');
  if (contentEl) {
    try {
      renderWorkflow(contentEl, definitionId, false);
    } catch (err) {
      console.warn('[ws-leader] renderWorkflow failed:', err);
      contentEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">工作流渲染失败</p>';
    }
  }

  // 滚动到工作流面板
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _renderWriteContent(activities) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const panelVisible = dtState.showPanel;

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">活动写入</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 transition-colors hover:bg-red-100" id="btn-leader-create" style="cursor:pointer;">${panelVisible ? '收起面板' : '创建活动'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">组长可创建党小组会、主题党日活动，写入后自动生成SOP任务节点</div>

      ${panelVisible ? _renderDecisionTreePanel() : ''}

      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs text-gray-400 mb-2">已有关联活动</div>
        <div class="space-y-2" id="leader-activity-list">
          ${activities.length === 0 ? '<p class="text-xs text-gray-400 text-center py-4">暂无关联活动</p>' :
            activities.map(a => `
              <div class="leader-act-item flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" data-act-id="${a.id}">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full ${a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${a.status === 'published' ? '已发布' : '草稿'}</span>
              </div>
            `).join('')}
        </div>
        <div id="leader-act-detail" class="hidden mt-3 card rounded-xl p-4 border border-gray-200"></div>
      </div>
    </div>
  `;

  _bindDecisionTreeEvents(container);

  // ── 活动点击展开详情+子记录（P3-4） ──
  const ACT_SUB_KEY = 'act_sub_records';
  container.querySelectorAll('.leader-act-item').forEach(item => {
    item.addEventListener('click', () => {
      const actId = item.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const detailPanel = document.getElementById('leader-act-detail');
      if (!detailPanel) return;
      detailPanel.classList.remove('hidden');

      let subRecords = JSON.parse(localStorage.getItem(ACT_SUB_KEY) || '{}');
      const actSubs = subRecords[actId] || { attendance: [], inspection: [], publicity: [], materials: [] };

      function saveActSubs() {
        subRecords[actId] = actSubs;
        localStorage.setItem(ACT_SUB_KEY, JSON.stringify(subRecords));
      }

      function renderActSubTable(type, items) {
        const configs = {
          attendance: { label: '考勤记录', color: '#10B981', fields: [{ key: 'person', label: '姓名' }, { key: 'status', label: '出勤状态' }, { key: 'note', label: '备注' }] },
          inspection: { label: '考察记录', color: '#D97706', fields: [{ key: 'person', label: '被考察人' }, { key: 'content', label: '考察内容' }, { key: 'result', label: '考察结论' }] },
          publicity: { label: '宣传记录', color: '#8B5CF6', fields: [{ key: 'title', label: '宣传标题' }, { key: 'author', label: '撰写人' }, { key: 'channel', label: '发布渠道' }] },
          materials: { label: '材料记录', color: '#3B82F6', fields: [{ key: 'name', label: '材料名称' }, { key: 'author', label: '提交人' }, { key: 'note', label: '备注' }] },
        };
        const cfg = configs[type];
        const rows = items.map((item, idx) => `
          <tr class="border-b border-gray-50">
            ${cfg.fields.map(f => `<td class="px-2 py-1.5 text-xs text-gray-700">${item[f.key] || '-'}</td>`).join('')}
            <td class="px-2 py-1.5 text-center"><button class="act-sub-del-btn text-[10px] text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold font-title-cn" style="color:${cfg.color}">${cfg.label} (${items.length})</span>
              <button class="act-sub-add-btn text-[10px] px-2 py-1 rounded border hover:bg-gray-50 transition-colors" style="color:${cfg.color};border-color:${cfg.color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[11px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${cfg.fields.map(f => `<th class="px-2 py-1 text-[10px] font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-[10px] font-medium text-gray-500 w-12"></th>
                </tr></thead><tbody>${rows}</tbody></table>`
            }
          </div>`;
      }

      detailPanel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h5 class="font-title-cn text-sm font-bold text-gray-700">${activity.title || '未命名'}</h5>
          <button id="btn-close-act-detail" class="text-xs text-gray-400 hover:text-gray-600">收起</button>
        </div>
        <div class="text-xs text-gray-500 mb-2">${activity.date || ''} ${activity.type ? '· ' + activity.type : ''}</div>
        <div class="mt-3 pt-3 border-t border-gray-100">
          <h6 class="font-title-cn text-xs font-bold text-gray-600 mb-1">子记录</h6>
          ${renderActSubTable('attendance', actSubs.attendance)}
          ${renderActSubTable('inspection', actSubs.inspection)}
          ${renderActSubTable('publicity', actSubs.publicity)}
          ${renderActSubTable('materials', actSubs.materials)}
        </div>
      `;

      // 收起按钮
      detailPanel.querySelector('#btn-close-act-detail')?.addEventListener('click', () => {
        detailPanel.classList.add('hidden');
      });

      // 添加子记录
      detailPanel.querySelectorAll('.act-sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const prompts = {
            attendance: [['姓名', 'person'], ['出勤状态', 'status'], ['备注', 'note']],
            inspection: [['被考察人', 'person'], ['考察内容', 'content'], ['考察结论', 'result']],
            publicity: [['宣传标题', 'title'], ['撰写人', 'author'], ['发布渠道', 'channel']],
            materials: [['材料名称', 'name'], ['提交人', 'author'], ['备注', 'note']],
          };
          const fields = prompts[type];
          const newEntry = {};
          for (const [label, key] of fields) {
            const val = prompt(label + '：');
            if (key === fields[0][1] && !val) return;
            newEntry[key] = val || '';
          }
          actSubs[type].push(newEntry);
          saveActSubs();
          // 重新点击活动项刷新详情
          const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
          if (actEl) actEl.click();
        });
      });

      // 删除子记录
      detailPanel.querySelectorAll('.act-sub-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          actSubs[type].splice(idx, 1);
          saveActSubs();
          const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
          if (actEl) actEl.click();
        });
      });
    });
  });
}

function _renderDecisionTreePanel() {
  const { step, L1, L2, L3, L4, hostGroup } = dtState;

  // 步骤指示器
  const steps = ['组织场景', '活动形式', '时长', '发起方向'];
  const stepperHtml = `
    <div class="flex items-center gap-1 mb-5">
      ${steps.map((s, i) => {
        const isActive = i === step - 1;
        const isDone = i < step - 1;
        const dotColor = isDone ? accent : isActive ? accent : '#D1D5DB';
        const lineColor = isDone ? accent : '#E5E7EB';
        return `
          ${i > 0 ? `<div class="flex-1 h-0.5 rounded" style="background:${lineColor};"></div>` : ''}
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style="background:${isDone || isActive ? accentRgba : '#F3F4F6'};color:${dotColor};border:1.5px solid ${dotColor};">${isDone ? '&#10003;' : i + 1}</div>
            <span class="text-[10px] ${isActive ? 'font-bold' : ''}" style="color:${dotColor};">${s}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // L1 选择
  const l1Html = `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L1 组织场景 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L1.map(opt => {
          const selected = L1 === opt.value;
          return `<button class="dt-l1-btn px-4 py-2 text-xs font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  `;

  // 承办党小组选择器（L1选择后显示）
  const hostGroupHtml = L1 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">承办党小组 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.HOST_GROUPS.map(g => {
          const selected = hostGroup === g;
          return `<button class="dt-host-btn px-4 py-2 text-xs font-medium rounded-lg transition-all" data-value="${g}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${g}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L2 选择（L1选择后显示）
  const l2Options = L1 ? (DECISION_TREE.L2[L1] || []) : [];
  const l2Html = L1 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L2 活动形式 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${l2Options.map(opt => {
          const selected = L2 === opt.value;
          return `<button class="dt-l2-btn px-4 py-2 text-xs font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L3 选择（L2选择后显示）
  const l3Html = L2 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L3 时长 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L3.map(opt => {
          const selected = L3 === opt.value;
          return `<button class="dt-l3-btn px-4 py-2 text-xs font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L4 选择（L3选择后显示）
  const l4Html = L3 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L4 发起方向 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L4.map(opt => {
          const selected = L4 === opt.value;
          return `<button class="dt-l4-btn px-4 py-2 text-xs font-medium rounded-lg transition-all" data-value="${opt.value}" style="background:${selected ? accentRgba : 'white'};color:${selected ? accent : '#6B7280'};border:1.5px solid ${selected ? accentBorder : '#E5E7EB'};cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 表单区域（L4选择后显示）
  const allSelected = L1 && L2 && L3 && L4 && hostGroup;
  const formHtml = allSelected ? `
    <div class="mt-4 pt-4 border-t border-dashed border-gray-200">
      <div class="text-xs font-bold text-gray-600 mb-3">填写活动信息</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">T-0 日期 <span class="text-red-500">*</span></label>
          <input type="date" id="dt-target-date" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">活动地点 <span class="text-red-500">*</span></label>
          <input type="text" id="dt-location" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors" placeholder="活动地点">
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">活动名称 <span class="text-red-500">*</span></label>
        <input type="text" id="dt-title" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors" placeholder="活动名称">
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1 block">活动描述（选填）</label>
        <textarea id="dt-desc" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors resize-none" rows="2" placeholder="简要描述活动内容"></textarea>
      </div>

      <!-- SOP 预览 -->
      <div class="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">SOP 任务节点预览</div>
        <div id="dt-sop-preview" class="space-y-1 text-xs text-gray-500">
          ${_renderSopPreview()}
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button id="dt-submit" class="text-sm px-5 py-2 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">写入活动</button>
        <button id="dt-cancel" class="text-sm px-4 py-2 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
      ${stepperHtml}
      ${l1Html}
      ${hostGroupHtml}
      ${l2Html}
      ${l3Html}
      ${l4Html}
      ${formHtml}
    </div>
  `;
}

function _renderSopPreview() {
  const { L1 } = dtState;
  if (!L1) return '<p class="text-gray-400">请先选择组织场景</p>';

  const scenarioId = DECISION_TREE.SCENARIO_MAP[L1];
  const scenario = sopDatabase.scenarios.find(s => s.scenarioId === scenarioId);
  if (!scenario) return '<p class="text-gray-400">未找到对应SOP模板</p>';

  const tasks = scenario.tasks.filter(t => t.timeOffset !== null);
  if (tasks.length === 0) return '<p class="text-gray-400">该场景无时间锚点任务</p>';

  // 按时间偏移分组
  const phases = [
    { label: '会前准备', test: t => t.timeOffset < 0 },
    { label: '会中实施', test: t => t.timeOffset === 0 },
    { label: '会后归档', test: t => t.timeOffset > 0 },
  ];

  return phases.map(phase => {
    const phaseTasks = tasks.filter(phase.test);
    if (phaseTasks.length === 0) return '';
    return `
      <div class="mb-2">
        <div class="font-medium text-gray-700 mb-1">${phase.label}（${phaseTasks.length}项）</div>
        ${phaseTasks.slice(0, 4).map(t => `
          <div class="pl-2 py-0.5 flex items-center gap-1">
            <span class="text-gray-300">·</span>
            <span>T${t.timeOffset >= 0 ? '+' : ''}${t.timeOffset} ${t.title}</span>
          </div>
        `).join('')}
        ${phaseTasks.length > 4 ? `<div class="pl-2 text-gray-400">...及其他${phaseTasks.length - 4}项</div>` : ''}
      </div>
    `;
  }).join('');
}

function _bindDecisionTreeEvents(container) {
  // 创建/收起按钮
  container.querySelector('#btn-leader-create')?.addEventListener('click', () => {
    dtState.showPanel = !dtState.showPanel;
    if (!dtState.showPanel) _resetDtState();
    const state = getAppState();
    const filteredState = _filterByRole(state, 'leader');
    _renderWriteContent(filteredState.activities || []);
  });

  // L1 按钮
  container.querySelectorAll('.dt-l1-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      dtState.L1 = val;
      dtState.step = 1;
      // L1 变更时重置后续选择
      dtState.L2 = null;
      dtState.L3 = null;
      dtState.L4 = null;
      dtState.hostGroup = null;
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // 承办党小组按钮
  container.querySelectorAll('.dt-host-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dtState.hostGroup = btn.dataset.value;
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // L2 按钮
  container.querySelectorAll('.dt-l2-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dtState.L2 = btn.dataset.value;
      dtState.step = 2;
      dtState.L3 = null;
      dtState.L4 = null;
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // L3 按钮
  container.querySelectorAll('.dt-l3-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dtState.L3 = btn.dataset.value;
      dtState.step = 3;
      dtState.L4 = null;
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // L4 按钮
  container.querySelectorAll('.dt-l4-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dtState.L4 = btn.dataset.value;
      dtState.step = 4;
      const state = getAppState();
      const filteredState = _filterByRole(state, 'leader');
      _renderWriteContent(filteredState.activities || []);
    });
  });

  // 取消按钮
  container.querySelector('#dt-cancel')?.addEventListener('click', () => {
    _resetDtState();
    const state = getAppState();
    const filteredState = _filterByRole(state, 'leader');
    _renderWriteContent(filteredState.activities || []);
  });

  // 写入活动按钮
  container.querySelector('#dt-submit')?.addEventListener('click', async () => {
    const { L1, L2, L3, L4, hostGroup } = dtState;
    const targetDate = container.querySelector('#dt-target-date')?.value;
    const location = container.querySelector('#dt-location')?.value?.trim();
    const title = container.querySelector('#dt-title')?.value?.trim();
    const desc = container.querySelector('#dt-desc')?.value?.trim();

    // 校验必填
    if (!targetDate) { showToast('error', '请填写 T-0 日期'); return; }
    if (!location) { showToast('error', '请填写活动地点'); return; }
    if (!title) { showToast('error', '请填写活动名称'); return; }

    const l1Label = DECISION_TREE.L1.find(o => o.value === L1)?.label || L1;
    const l2Label = DECISION_TREE.L2[L1]?.find(o => o.value === L2)?.label || L2;
    const scenarioId = DECISION_TREE.SCENARIO_MAP[L1];

    try {
      // 1. 创建活动
      const activityData = {
        title,
        type: `${l1Label}·${l2Label}`,
        date: targetDate,
        targetDate,
        location,
        description: desc || '',
        organizer: 'leader',
        direction: L4,
        duration: L3,
        hostGroup,
        scenarioId,
        status: 'draft',
        visibility: 'group',
        createdBy: 'leader',
      };
      const activity = await BranchService.createActivity(activityData);
      showToast('success', `活动「${title}」创建成功`);

      // 2. 实例化 SOP 任务节点
      const taskNodes = instantiateSOP([scenarioId], targetDate);
      if (taskNodes.length > 0) {
        // 3. 为每个任务节点创建 Task
        for (const node of taskNodes) {
          await BranchService.createTask({
            activityId: activity.id,
            taskId: node.taskId,
            title: node.title,
            executor: node.executor,
            supervisor: node.supervisor,
            timeOffset: node.timeOffset,
            date: node.date.toISOString().slice(0, 10),
            desc: node.desc,
            status: 'pending',
          });
        }
        showToast('success', `已生成 ${taskNodes.length} 个SOP任务节点`);
      }

      // 4. 渲染工作流可视化面板
      const definitionId = _mapToDefinitionId();
      _renderWorkflowPanel(definitionId, title);

      // 5. 重置面板并刷新
      _resetDtState();
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (err) {
      console.error('[ws-leader] 创建活动失败：', err);
      showToast('error', `创建失败：${err.message}`);
    }
  });
}

function _renderAttendanceContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 清理旧的 PersonPicker 实例
  if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }

  const allRecords = _getAttendanceRecords();
  const myAttendance = allRecords.filter(r => r.activityId && ACTIVITIES.find(a => a.id === r.activityId)?.type === '党小组');

  // 筛选三会一课和主题党日活动
  const eligibleActivities = ACTIVITIES.filter(a =>
    a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会'
  );

  // 获取本组待补课人员
  const currentLeaderId = 'p4'; // 当前组长（根据实际登录角色调整）
  const myGroup = LEADER_GROUP_MAP[currentLeaderId] || '';
  const myGroupMembers = PEOPLE.filter(p => p.partyGroup === myGroup);
  const myGroupMemberIds = myGroupMembers.map(p => p.id);
  const makeupTasks = _loadMakeupTasks();
  const myGroupMakeupTasks = makeupTasks.filter(t =>
    myGroupMemberIds.includes(t.personId) && t.status !== 'completed'
  );

  const formHtml = _attFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="att-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考勤表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">选择活动 <span class="text-red-500">*</span></label>
          <select id="att-activity-select" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors">
            <option value="">请选择活动</option>
            ${eligibleActivities.map(a => `<option value="${a.id}">${a.title}（${a.date}）</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择参会人员 <span class="text-red-500">*</span></label>
        <div id="att-person-picker-container"></div>
      </div>
      <div id="att-status-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="att-form-submit" class="text-sm px-5 py-2 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">提交考勤</button>
        <button id="att-form-cancel" class="text-sm px-4 py-2 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考勤上传</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200" id="btn-leader-upload-att" style="cursor:pointer;">${_attFormVisible ? '收起表单' : '上传考勤表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考勤：组长上传 → 纪检委员确认 → 录入考勤总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_attFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">状态</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${attendanceToLong(myAttendance).map(a => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
              <td class="py-2 px-3 font-medium text-gray-800">${a.name}</td>
              <td class="py-2 px-3 text-gray-600">${a.activity}</td>
              <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded-full text-[10px] ${a.status === '出勤' ? 'bg-green-100 text-green-700' : a.status === '缺勤' ? 'bg-red-100 text-red-700' : a.status === '已补' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${a.status}</span></td>
              <td class="py-2 px-3 text-gray-500">${a.confirmer === '—' ? '<span class="text-amber-600">待确认</span>' : '<span class="text-green-600">已确认</span>'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
      ${myGroupMakeupTasks.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">待补课人员（${myGroup}）</div>
        <div class="text-xs text-gray-500 mb-2">本组有 ${myGroupMakeupTasks.length} 人缺勤，已生成补课任务</div>
        <div class="space-y-1.5">
          ${myGroupMakeupTasks.map(t => `
            <div class="flex items-center justify-between p-2 rounded-lg ${t.status === 'overdue' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-gray-800">${t.personName}</span>
                <span class="text-[10px] text-gray-500">${t.activityName}</span>
              </div>
              <div class="flex items-center gap-2">
                ${t.isMandatory
                  ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">必须</span>'
                  : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">建议</span>'
                }
                ${t.status === 'overdue'
                  ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">超期</span>'
                  : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">待补课</span>'
                }
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 绑定上传按钮
  container.querySelector('#btn-leader-upload-att')?.addEventListener('click', () => {
    _attFormVisible = !_attFormVisible;
    if (!_attFormVisible && _attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    _renderAttendanceContent();
  });

  // 如果表单可见，初始化 PersonPicker 和绑定事件
  if (_attFormVisible) {
    _initAttForm(container, eligibleActivities);
  }
}

function _initAttForm(container, eligibleActivities) {
  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#att-person-picker-container');
  if (pickerContainer) {
    _attPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参会人员',
      onSelect: (ids) => {
        _renderAttStatusRows(ids);
      }
    });
    _attPickerInstance.render(pickerContainer);
  }

  // 渲染初始状态行（空）
  _renderAttStatusRows([]);

  // 取消按钮
  container.querySelector('#att-form-cancel')?.addEventListener('click', () => {
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    _renderAttendanceContent();
  });

  // 提交按钮
  container.querySelector('#att-form-submit')?.addEventListener('click', () => {
    const activityId = container.querySelector('#att-activity-select')?.value;
    if (!activityId) { showToast('error', '请选择活动'); return; }

    const selectedIds = _attPickerInstance ? _attPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择参会人员'); return; }

    // 收集每人的出勤状态
    const records = [];
    for (const personId of selectedIds) {
      const statusEl = container.querySelector(`#att-status-${personId}`);
      const status = statusEl ? statusEl.value : '出勤';
      records.push({
        id: 'att_' + Date.now() + '_' + personId,
        personId,
        activityId,
        status,
        confirmer: null,
        overdue: false,
      });
    }

    // 写入 localStorage
    const allRecords = _getAttendanceRecords();
    allRecords.push(...records);
    _saveAttendanceRecords(allRecords);

    // 检查本组是否有缺勤人员
    const absentCount = records.filter(r => r.status === '缺勤' || r.status === '请假').length;
    const baseMsg = `考勤上传成功，共 ${records.length} 条记录，等待纪检委员确认`;
    if (absentCount > 0) {
      showToast('success', `${baseMsg}。本组有 ${absentCount} 人缺勤，已生成补课任务`);
    } else {
      showToast('success', baseMsg);
    }

    // 清理并刷新
    _attFormVisible = false;
    if (_attPickerInstance) { _attPickerInstance.destroy(); _attPickerInstance = null; }
    _renderAttendanceContent();
  });
}

function _renderAttStatusRows(selectedIds) {
  const rowsContainer = document.getElementById('att-status-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人出勤状态</div>
    <div class="space-y-2 max-h-48 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = PEOPLE.find(p => p.id === pid);
        const name = person ? person.name : pid;
        return `
          <div class="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            <span class="text-sm font-medium text-gray-800 min-w-[60px]">${name}</span>
            <select id="att-status-${pid}" class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-red-300">
              <option value="出勤">出勤</option>
              <option value="缺勤">缺勤</option>
              <option value="请假">请假</option>
            </select>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function _renderInspectionContent() {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  // 清理旧的 PersonPicker 实例
  if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }

  const allRecords = _getInspectionRecords();
  const myInspection = allRecords.filter(r => r.tag === '党小组');

  // 来源类型选项
  const sourceActivities = ACTIVITIES.filter(a =>
    a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会'
  );
  const sourceTaskforces = MOCK_TASKFORCES;

  const formHtml = _inspFormVisible ? `
    <div class="mt-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm" id="insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考察表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">来源类型 <span class="text-red-500">*</span></label>
          <select id="insp-source-type" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors">
            <option value="">请选择来源类型</option>
            <option value="activity">活动</option>
            <option value="taskforce">专班</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">选择具体来源 <span class="text-red-500">*</span></label>
          <select id="insp-source-select" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors" disabled>
            <option value="">请先选择来源类型</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择人员 <span class="text-red-500">*</span></label>
        <div id="insp-person-picker-container"></div>
      </div>
      <div id="insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="insp-form-submit" class="text-sm px-5 py-2 rounded-lg text-white transition-colors hover:opacity-90" style="background:${accent};cursor:pointer;">提交考察</button>
        <button id="insp-form-cancel" class="text-sm px-4 py-2 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#CE1126;">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-title-cn text-sm font-bold text-gray-700">考察上传</h4>
        <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200" id="btn-leader-upload-insp" style="cursor:pointer;">${_inspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考察：组长上传 → 纪检委员确认 → 录入考察总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_inspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-200">
            <th class="py-2 px-3 text-left text-gray-500 font-medium">姓名</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">活动</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">考察内容</th>
            <th class="py-2 px-3 text-left text-gray-500 font-medium">确认状态</th>
          </tr></thead>
          <tbody>${inspectionToLong(myInspection).map(i => `
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

  // 绑定上传按钮
  container.querySelector('#btn-leader-upload-insp')?.addEventListener('click', () => {
    _inspFormVisible = !_inspFormVisible;
    if (!_inspFormVisible && _inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    _renderInspectionContent();
  });

  // 如果表单可见，初始化事件绑定
  if (_inspFormVisible) {
    _initInspForm(container, sourceActivities, sourceTaskforces);
  }
}

function _initInspForm(container, sourceActivities, sourceTaskforces) {
  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#insp-person-picker-container');
  if (pickerContainer) {
    _inspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      onSelect: (ids) => {
        _renderInspContentRows(ids);
      }
    });
    _inspPickerInstance.render(pickerContainer);
  }

  // 渲染初始内容行（空）
  _renderInspContentRows([]);

  // 来源类型切换
  const sourceTypeSelect = container.querySelector('#insp-source-type');
  const sourceSelect = container.querySelector('#insp-source-select');
  if (sourceTypeSelect && sourceSelect) {
    sourceTypeSelect.addEventListener('change', () => {
      const type = sourceTypeSelect.value;
      sourceSelect.disabled = !type;
      if (type === 'activity') {
        sourceSelect.innerHTML = `<option value="">请选择活动</option>` +
          sourceActivities.map(a => `<option value="${a.id}" data-name="${a.title}">${a.title}（${a.date}）</option>`).join('');
      } else if (type === 'taskforce') {
        sourceSelect.innerHTML = `<option value="">请选择专班</option>` +
          sourceTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}</option>`).join('');
      } else {
        sourceSelect.innerHTML = '<option value="">请先选择来源类型</option>';
      }
    });
  }

  // 取消按钮
  container.querySelector('#insp-form-cancel')?.addEventListener('click', () => {
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    _renderInspectionContent();
  });

  // 提交按钮
  container.querySelector('#insp-form-submit')?.addEventListener('click', () => {
    const sourceType = container.querySelector('#insp-source-type')?.value;
    if (!sourceType) { showToast('error', '请选择来源类型'); return; }

    const sourceOption = container.querySelector('#insp-source-select')?.selectedOptions[0];
    const sourceId = container.querySelector('#insp-source-select')?.value;
    if (!sourceId) { showToast('error', '请选择具体来源'); return; }

    const selectedIds = _inspPickerInstance ? _inspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    // 收集每人的考察内容
    const records = [];
    const tag = sourceType === 'activity' ? '党小组' : '专班';
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${PEOPLE.find(p => p.id === personId)?.name || personId} 的考察内容`); return; }

      const record = {
        id: 'insp_' + Date.now() + '_' + personId,
        personId,
        tag,
        content,
        status: '待确认',
      };

      if (sourceType === 'activity') {
        record.activityId = sourceId;
      } else {
        record.sourceType = 'taskforce';
        record.sourceName = sourceOption?.dataset.name || sourceId;
      }

      records.push(record);
    }

    // 写入 localStorage
    const allRecords = _getInspectionRecords();
    allRecords.push(...records);
    _saveInspectionRecords(allRecords);

    showToast('success', `考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);

    // 清理并刷新
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    _renderInspectionContent();
  });
}

function _renderInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('insp-content-rows');
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
          <div class="p-2 rounded-lg bg-gray-50">
            <div class="text-sm font-medium text-gray-800 mb-1">${name}</div>
            <textarea id="insp-content-${pid}" class="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-colors resize-none" rows="2" placeholder="请填写考察内容描述"></textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

registerRenderCallback(renderLeaderUI);

(async function init() {
  try { if (typeof BranchService.loadDB === 'function') BranchService.loadDB(); } catch (e) { console.warn('[ws-leader] loadDB error', e); }
  setState({ domain: 'activity', role: 'leader', activeModule: 'workspace', status: STATE.LOADING, selectedRole: 'leader' });
  try {
    const activities = await BranchService.listActivities();
    setState({ status: STATE.IDLE, activities });
  } catch (err) {
    console.warn('[ws-leader] load failed', err);
    setState({ status: STATE.IDLE, activities: ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() })) });
  }
}());
