import { getAppState, setState, STATE, registerRenderCallback } from '../core/state.js';
import { showToast } from '../core/utils.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { ACTIVITIES, PEOPLE, MOCK_TASKFORCES } from '../mock/index.js';
import { mockDB } from '../core/domain.js';
import { saveDB } from '../services/mock.js';
import { loadWorkspaceData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';

const { savedState } = bootstrapPage({ module: 'workspace', defaultRole: 'deep', viewMode: 'manage' });

// ── 经验沉淀数据层（mockDB） ────────────────────────────
const DEEP_PERSON_ID = 'p5'; // 深度参与者 personId（模拟）

function _loadDeposits() {
  try {
    return [...mockDB.experienceDeposits];
  } catch (e) {
    console.warn('[ws-deep] 读取经验沉淀失败', e);
    return [];
  }
}

function _saveDeposits(deposits) {
  try {
    mockDB.experienceDeposits = [...deposits];
    saveDB();
  } catch (e) {
    console.warn('[ws-deep] 写入经验沉淀失败', e);
  }
}

function _addDeposit(deposit) {
  const deposits = _loadDeposits();
  deposits.push(deposit);
  _saveDeposits(deposits);
}

function _updateDeposit(depositId, updates) {
  const deposits = _loadDeposits();
  const d = deposits.find(d => d.id === depositId);
  if (d) {
    Object.assign(d, updates);
    _saveDeposits(deposits);
  }
  return deposits;
}

/** 格式化时间（月-日 时:分） */
function _formatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _filterByRole(state, role) {
  const activities = (state.activities || []).filter(a => {
    if (role === 'deep') return a.deepParticipantName || a.deepParticipants;
    return true;
  });
  return { ...state, activities };
}

function renderDeepUI(state) {
  let activities = state.activities || [];
  if (activities.length === 0 && ACTIVITIES.length > 0) {
    activities = ACTIVITIES.map(a => ({ ...a, visibility: 'branch', executor: a.organizer || 'u_exec', supervisor: null, createdBy: a.organizer || 'u_exec', createdAt: a.date || new Date().toISOString() }));
    setState({ activities });
    return;
  }

  const container = document.getElementById('deep-content');
  if (!container) return;

  const filteredState = _filterByRole(state, 'deep');
  const filteredActivities = filteredState.activities || [];

  const tabBar = renderTabBar({
    prefix: 'deep',
    tabs: [
      { id: 'activities', label: '关联活动', render: (ctx) => _renderActivitiesContent(ctx.filteredActivities) },
      { id: 'deposit', label: '经验沉淀', render: () => _renderDepositContent() },
    ],
    accentColor: { accent: '#059669', accentRgba: 'rgba(5,150,105,0.1)', accentBorder: 'rgba(5,150,105,0.3)' },
    defaultTab: 'activities',
    renderCtx: { filteredActivities },
  });

  container.innerHTML = tabBar.html;

  tabBar.bindEvents(container);
  tabBar.activate('activities');
}

function _renderActivitiesContent(filteredActivities) {
  const tc = document.getElementById('deep-tab-content');
  if (!tc) return;

  tc.innerHTML = `
    <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#059669;">
      <div class="mb-4">
        <h3 class="font-title-cn text-base font-bold text-gray-800">关联活动</h3>
        <p class="text-xs text-gray-500 mt-1">深度参与者可更新关联活动的任务状态</p>
      </div>
      <div class="space-y-2">
        ${filteredActivities.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">暂无关联活动</p>' :
          filteredActivities.map(a => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
              </div>
              <button class="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors" style="cursor:pointer;">更新状态</button>
            </div>
          `).join('')}
      </div>
    </div>
  `;
}

function _renderDepositContent() {
  const tc = document.getElementById('deep-tab-content');
  if (!tc) return;

  const deposits = _loadDeposits();
  const myDeposits = deposits.filter(d => d.submitterId === DEEP_PERSON_ID);

  // 来源选项
  const activityOptions = ACTIVITIES.map(a => `<option value="act_${a.id}">${a.title || a.id}</option>`).join('');
  const taskforceOptions = MOCK_TASKFORCES.map(t => `<option value="tf_${t.id}">${t.name || t.id}</option>`).join('');

  tc.innerHTML = `
    <div class="space-y-4">
      <!-- 提交表单 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#059669;">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-title-cn text-base font-bold text-gray-800">提交经验沉淀</h3>
            <p class="text-xs text-gray-500 mt-1">边做边学边沉淀——过程中的工作，不是事后补写</p>
          </div>
          <a href="./src/../../content/references/工作模板/经验沉淀辅助提示词.md" target="_blank" class="text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg bg-emerald-50">AI辅助提炼提示词</a>
        </div>
        <div class="space-y-3">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-xs text-gray-600 font-medium mb-1 block">来源类型</label>
              <select id="deposit-source-type" class="input-flat text-xs w-full">
                <option value="activity">活动</option>
                <option value="taskforce">专班</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="text-xs text-gray-600 font-medium mb-1 block">关联来源</label>
              <select id="deposit-source-id" class="input-flat text-xs w-full">
                ${activityOptions}
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1 block">沉淀标题</label>
            <input type="text" id="deposit-title" class="input-flat text-xs w-full" placeholder="一句话概括这次经验的核心要点">
          </div>
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1 block">沉淀内容</label>
            <textarea id="deposit-content" class="input-flat text-xs w-full" rows="5" placeholder="可以包括：做了什么、遇到了什么问题、怎么解决的、有什么收获、下次可以怎么做更好...&#10;&#10;提示：可使用右上角「AI辅助提炼提示词」，从工作沟通和决策原始材料中提炼经验"></textarea>
          </div>
          <div>
            <label class="text-xs text-gray-600 font-medium mb-1 block">标签（可选）</label>
            <input type="text" id="deposit-tags" class="input-flat text-xs w-full" placeholder="用逗号分隔，如：沟通技巧,时间管理,活动策划">
          </div>
          <button id="btn-submit-deposit" class="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" style="cursor:pointer;">提交沉淀</button>
        </div>
      </div>

      <!-- 我的沉淀记录 -->
      <div class="card rounded-2xl p-5 border-l-4" style="border-left-color:#6B7280;">
        <h3 class="font-title-cn text-base font-bold text-gray-800 mb-3">我的沉淀记录</h3>
        ${myDeposits.length === 0 ? '<p class="text-xs text-gray-400 text-center py-4">暂无沉淀记录</p>' : `
          <div class="space-y-2">
            ${myDeposits.map(d => _renderDepositCard(d)).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // 来源类型联动
  const sourceTypeEl = document.getElementById('deposit-source-type');
  const sourceIdEl = document.getElementById('deposit-source-id');
  if (sourceTypeEl && sourceIdEl) {
    sourceTypeEl.addEventListener('change', () => {
      const type = sourceTypeEl.value;
      sourceIdEl.innerHTML = type === 'activity' ? activityOptions : taskforceOptions;
    });
  }

  // 提交按钮
  const submitBtn = document.getElementById('btn-submit-deposit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const sourceType = document.getElementById('deposit-source-type')?.value;
      const sourceId = document.getElementById('deposit-source-id')?.value;
      const title = document.getElementById('deposit-title')?.value?.trim();
      const content = document.getElementById('deposit-content')?.value?.trim();
      const tagsStr = document.getElementById('deposit-tags')?.value?.trim();

      if (!title) { showToast('error', '请填写沉淀标题'); return; }
      if (!content) { showToast('error', '请填写沉淀内容'); return; }

      const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
      const sourceName = _getSourceName(sourceType, sourceId);

      const deposit = {
        id: `dep_${Date.now()}`,
        sourceType,
        sourceId,
        sourceName,
        title,
        content,
        tags,
        submitterId: DEEP_PERSON_ID,
        status: 'submitted', // submitted / annotated / confirmed
        annotations: [],
        createdAt: new Date().toISOString(),
      };

      _addDeposit(deposit);
      showToast('success', '经验沉淀已提交，纪检委员将进行批注确认');
      _renderDepositContent();
    });
  }
}

function _getSourceName(sourceType, sourceId) {
  if (sourceType === 'activity') {
    const a = ACTIVITIES.find(a => `act_${a.id}` === sourceId);
    return a ? a.title : sourceId;
  } else {
    const t = MOCK_TASKFORCES.find(t => `tf_${t.id}` === sourceId);
    return t ? t.name : sourceId;
  }
}

function _renderDepositCard(d) {
  const statusStyle = {
    'submitted': 'bg-blue-100 text-blue-700',
    'annotated': 'bg-amber-100 text-amber-700',
    'confirmed': 'bg-green-100 text-green-700',
  };
  const statusLabel = {
    'submitted': '已提交',
    'annotated': '已批注',
    'confirmed': '已确认',
  };
  const sourceLabel = d.sourceType === 'activity' ? '活动' : '专班';
  const sourceColor = d.sourceType === 'activity' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600';

  return `
    <div class="p-3 rounded-xl bg-gray-50">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-1.5 py-0.5 rounded ${sourceColor}">${sourceLabel}</span>
          <span class="text-sm font-medium text-gray-800">${d.title}</span>
          <span class="px-1.5 py-0.5 rounded-full text-[10px] ${statusStyle[d.status] || 'bg-gray-100 text-gray-500'}">${statusLabel[d.status] || d.status}</span>
        </div>
        <span class="text-[10px] text-gray-400">${_formatTime(d.createdAt)}</span>
      </div>
      <div class="text-xs text-gray-500 mb-1">来源：${d.sourceName}</div>
      <div class="text-xs text-gray-700 mb-2 p-2 bg-white rounded-lg border border-gray-100 whitespace-pre-wrap">${d.content}</div>
      ${d.tags && d.tags.length > 0 ? `<div class="flex flex-wrap gap-1 mb-2">${d.tags.map(t => `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">${t}</span>`).join('')}</div>` : ''}
      ${d.annotations && d.annotations.length > 0 ? `
        <div class="border-t border-gray-200 pt-2 mt-2">
          <div class="text-[10px] text-amber-600 font-medium mb-1">纪检批注：</div>
          ${d.annotations.map(a => `
            <div class="text-xs text-gray-600 p-1.5 bg-amber-50 rounded mb-1">${a.content} <span class="text-[10px] text-gray-400">— ${_formatTime(a.annotatedAt)}</span></div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

registerRenderCallback(renderDeepUI);

loadWorkspaceData({ role: 'deep', fallbackData: () => ACTIVITIES, logTag: 'ws-deep' });
