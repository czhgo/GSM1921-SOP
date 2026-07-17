// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
// party.js — 党务管理模块状态管理器
//  职责：管理四大子功能的数据加载、状态流转、DOM 渲染
//  依赖：state.js（读取 selectedRole）
// ════════════════════════════════════════════════════════════════

import { PARTY_MOCKS, CANDIDATE_STAGES, COMPLIANCE_FILES, PUBLICITY_STANDARDS, TEMPLATE_LIST, ACTIVITIES, getPersonName } from '../mock/index.js';
import { getAppState } from '../core/state.js';
import { showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { openFormModal } from '../components/modal.js';
import { filterForViewProxy, assignedRoles, computeSecretaryStats } from '../services/roles.js';
import { createStoreWithMockData } from '../workflow/index.js';
import { NoticeStore, NoticePermission } from '../services/notice.js';
import { FeedbackStore } from '../services/feedback.js';
import { ImageRecordStore } from '../services/image.js';
import { ACCENT_COLORS } from '../core/constants.js';
import { renderQueryView } from '../components/query-view.js';

// 报送记录归档 localStorage key（每周一报送流程）
const WEEKLY_REPORT_STORAGE_KEY = 'workflowos_weekly_report_records_v1';

// ════════════════════════════════════════════════════════════════
//  Mock 数据定义
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  PartyModule 对象
// ════════════════════════════════════════════════════════════════

export const PartyModule = {
  state: {
    candidates: [],
    makeupTasks: [],
    feedbackItems: [],
    mailboxLastCheck: null,
    weeklyReportRecords: [],
  },

  recordStore: null,

  _ensureStore() {
    if (!this.recordStore) {
      this.recordStore = createStoreWithMockData();
    }
    return this.recordStore;
  },

  // ── 每周一报送流程：报送记录归档（localStorage 持久化） ──
  _loadWeeklyReports() {
    try {
      const raw = localStorage.getItem(WEEKLY_REPORT_STORAGE_KEY);
      this.state.weeklyReportRecords = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[PartyModule] 报送记录加载失败：', e);
      this.state.weeklyReportRecords = [];
    }
    return this.state.weeklyReportRecords;
  },

  _saveWeeklyReports() {
    try {
      localStorage.setItem(WEEKLY_REPORT_STORAGE_KEY, JSON.stringify(this.state.weeklyReportRecords));
    } catch (e) {
      console.warn('[PartyModule] 报送记录保存失败：', e);
    }
  },

  // 汇总最近 7 天活动数据 → 生成"每周一报送"内容
  // 与"生成周报"区分：周报是支部内部（亮点/问题/下周计划），每周一报送是向学工周报负责人报送活动信息
  _buildWeeklySubmissionContent() {
    const st = getAppState();
    const activities = st.activities || [];

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10);

    const weekStart = fmt(sevenDaysAgo);
    const weekEnd = fmt(today);

    const weekActivities = activities.filter(a => {
      if (!a.date) return false;
      const d = a.date.replace(/\//g, '-');
      return d >= weekStart && d <= weekEnd;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const items = weekActivities.map(a => ({
      date: a.date,
      title: a.title,
      type: a.type || '—',
      location: a.location || '—',
      organizer: getPersonName(a.organizer),
      direction: a.direction === 'top-down' ? '支部发起' : (a.direction === 'bottom-up' ? '党小组发起' : '—'),
      status: a.status === 'completed' ? '已完成' : (a.status === 'draft' ? '筹备中' : (a.status || '—')),
    }));

    const summary = `本周（${weekStart} 至 ${weekEnd}）共开展 ${items.length} 项活动。` +
      (items.length > 0
        ? items.map((it, i) =>
            `${i + 1}. ${it.date} ${it.title}（${it.type}）：地点 ${it.location}，组织者 ${it.organizer}（${it.direction}），状态 ${it.status}`
          ).join('；')
        : '本周暂无活动记录。');

    return {
      weekStart,
      weekEnd,
      count: items.length,
      items,
      summary,
    };
  },

  // 提交每周一报送：生成内容 → 通知书记 → 归档
  // editedSummary 可选：用户在表单中编辑后的报送内容；省略则使用自动生成内容
  submitWeeklyReport(editedSummary) {
    const content = this._buildWeeklySubmissionContent();
    const summary = editedSummary || content.summary;

    const { selectedRole } = getAppState();
    const publisher = selectedRole || 'prop-commissioner';
    const today = new Date().toISOString().slice(0, 10);

    // 发送系统内部通知给书记
    const notice = NoticeStore.add({
      title: `每周一报送（${content.weekStart} 至 ${content.weekEnd}）`,
      content: summary,
      priority: 'normal',
      publishDate: today,
      targetModule: 'party',
      publisher,
    }, publisher);

    if (!notice) {
      showToast('error', '报送失败：通知权限不足');
      return null;
    }

    // 归档报送记录（报送时间/内容/通知ID）
    if (!this.state.weeklyReportRecords.length) {
      this._loadWeeklyReports();
    }
    const record = {
      id: 'wr-' + Date.now(),
      submitDate: today,
      weekStart: content.weekStart,
      weekEnd: content.weekEnd,
      count: content.count,
      summary,
      items: content.items,
      noticeId: notice.id,
      publisher,
    };
    this.state.weeklyReportRecords = [record, ...this.state.weeklyReportRecords];
    this._saveWeeklyReports();

    showToast('success', `报送已提交，通知已发送给书记（本周 ${content.count} 项活动）`);
    return record;
  },

  loadAll() {
    this.state.candidates = PARTY_MOCKS.candidates;
    this.state.makeupTasks = PARTY_MOCKS.makeupTasks;
    this.state.feedbackItems = PARTY_MOCKS.feedbackItems;
    this.state.mailboxLastCheck = '2026-04-28';
  },

  refreshAll() {
    this.loadAll();
    this.renderCommissionerPanel();
    showToast('success', '党务管理数据已刷新');
  },

  getActiveCommissioner() {
    const activeTab = document.querySelector('.commissioner-tab[data-commissioner].active');
    if (activeTab) return activeTab.dataset.commissioner;
    const { selectedRole } = getAppState();
    if (selectedRole === 'secretary')           return 'secretary';
    if (selectedRole === 'disc-commissioner')   return 'disc-commissioner';
    if (selectedRole === 'org-commissioner')    return 'organizer';
    if (selectedRole === 'prop-commissioner')   return 'prop-commissioner';
    return 'default';
  },

  renderCommissionerPanel() {
    const commissioner = this.getActiveCommissioner();

    document.querySelectorAll('.commissioner-panel').forEach(p => {
      p.classList.add('hidden');
    });

    const targetPanel = document.getElementById(`panel-${commissioner}`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }

    if (commissioner === 'secretary') {
      this.refreshSecretaryAggregateView();
    } else if (commissioner === 'disc-commissioner') {
      this.refreshMakeupStatus();
      this.refreshMailboxReminder();
    } else if (commissioner === 'organizer') {
      this.refreshCandidateTracker();
      this.refreshMaterialRemind();
      this.renderComplianceRefs('organizer-compliance-file-list', 'organizer-compliance-reader');
    } else if (commissioner === 'prop-commissioner') {
      this.refreshArchives();
      this.refreshMaterialStandards();
      this.refreshTemplateMgmt();
      this.refreshWeeklyReport();
    } else {
      this.refreshDefaultOverview();
      this.renderComplianceRefs('compliance-file-list', 'compliance-reader');
    }

    this.refreshNoticeSection();
  },

  switchSubTab(commissioner, subtab) {
    const panel = document.getElementById(`panel-${commissioner}`);
    if (!panel) return;

    panel.querySelectorAll('.commissioner-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.subtab === subtab);
    });

    panel.querySelectorAll('.commissioner-subtab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.subtabContent === subtab);
    });
  },

  refreshMakeupStatus() {
    const container = document.getElementById('disc-commissioner-makeup-list');
    if (!container) return;

    const tasks = this.state.makeupTasks;
    if (tasks.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">暂无补课任务</p>';
      return;
    }

    // 将 completed 布尔值转为字符串，以兼容 renderQueryView 的筛选比较逻辑
    // mock 数据中 status 字段为 'pending'/'completed'，需统一映射为 completed 布尔字符串
    const queryData = tasks.map(t => ({
      ...t,
      // 兼容字段：name = personName, absentActivity = activityName
      name: t.personName || t.name || '未知',
      absentActivity: t.activityName || t.absentActivity || '未知活动',
      absentDate: t.absentDate || '未记录',
      completed: String(t.status === 'completed' || t.completed === true),
    }));

    renderQueryView(container, {
      searchPlaceholder: '搜索姓名...',
      searchKey: 'name',
      filters: [{ key: 'completed', label: '状态', options: [{ value: 'false', label: '待补' }, { value: 'true', label: '已补' }] }],
      data: queryData,
      renderRow: (task) => `
        <div class="flex items-center justify-between p-3 bg-gray-100 rounded-xl">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${task.name}</div>
            <div class="text-xs text-gray-500 mt-1">缺勤活动：${task.absentActivity} | 缺勤日期：${task.absentDate}</div>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <span class="text-xs px-2 py-1 rounded-full ${task.completed === 'true' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${task.completed === 'true' ? '已补' : '待补'}</span>
            ${task.completed !== 'true' ? `<button class="btn-primary" style="padding:4px 12px;font-size:0.6875rem;" data-makeup-id="${task.id}">标记已补</button>` : ''}
          </div>
        </div>
      `,
      emptyMessage: '无匹配结果',
      accentColor: ACCENT_COLORS['disc-commissioner'].hex,
    });

    // renderQueryView 渲染后重新绑定"标记已补"按钮事件
    container.querySelectorAll('[data-makeup-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.makeupId;
        this.completeMakeup(id);
      });
    });
  },

  completeMakeup(taskId) {
    const task = this.state.makeupTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      this.refreshMakeupStatus();
      showToast('success', `${task.name} 的补课已标记完成，考勤记录已回写`);
    }
  },

  refreshMailboxReminder() {
    const container = document.getElementById('disc-commissioner-mailbox-info');
    if (!container) return;

    const lastCheck = this.state.mailboxLastCheck || '未查收';
    const today = new Date();
    const lastDate = this.state.mailboxLastCheck ? new Date(this.state.mailboxLastCheck) : null;
    const daysSince = lastDate ? Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) : null;
    const nextReminder = lastDate ? new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    const nextReminderStr = nextReminder ? nextReminder.toISOString().slice(0, 10) : '—';
    const isOverdue = daysSince !== null && daysSince >= 7;

    container.innerHTML = `
      <div class="flex items-center justify-between p-3 bg-gray-100 rounded-xl">
        <div class="flex-1">
          <div class="text-sm text-gray-800">上次查收：<strong>${lastCheck}</strong></div>
          <div class="text-xs text-gray-500 mt-1">距上次查收：${daysSince !== null ? daysSince + ' 天' : '—'}</div>
          <div class="text-xs text-gray-500">下次提醒：${nextReminderStr}</div>
        </div>
        <div class="flex items-center gap-2 ml-4">
          ${isOverdue ? '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">已超期</span>' : '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">正常</span>'}
          <button class="btn-primary" style="padding:4px 12px;font-size:0.6875rem;" id="btn-confirm-mailbox">确认查收</button>
        </div>
      </div>
    `;

    const confirmBtn = document.getElementById('btn-confirm-mailbox');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.confirmMailboxCheck();
      });
    }
  },

  confirmMailboxCheck() {
    const today = new Date().toISOString().slice(0, 10);
    this.state.mailboxLastCheck = today;
    this.refreshMailboxReminder();
    showToast('success', '公邮查收已确认，计时器已重置');
  },

  refreshParticipationSummary() {
    const container = document.getElementById('disc-commissioner-participation-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll();
    const uniqueFillers = [...new Set(records.map(r => r.filledBy).filter(Boolean))];

    const summaryData = [
      { label: '本月已开展活动', value: `${records.length} 项` },
      { label: '填写人（去重）', value: uniqueFillers.length > 0 ? uniqueFillers.join('、') : '暂无记录' },
      { label: '活动类型覆盖', value: [...new Set(records.map(r => r.type).filter(Boolean))].join('、') || '—' },
      { label: '最近更新', value: new Date().toLocaleDateString('zh-CN') },
    ];

    container.innerHTML = summaryData.map(item => `
      <div class="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
        <span class="text-xs text-gray-600">${item.label}</span>
        <span class="text-sm font-medium text-gray-800">${item.value}</span>
      </div>
    `).join('') + `
      <div class="mt-3">
        <button class="btn-primary" style="padding:6px 16px;font-size:0.75rem;" id="btn-submit-to-organizer">提交至组织委员</button>
        <button class="btn-primary" style="padding:6px 16px;font-size:0.75rem;margin-left:8px;background-color:var(--accent-prop-commissioner-light);" id="btn-submit-to-prop-commissioner">提交至宣传委员</button>
      </div>
    `;

    const btnOrg = document.getElementById('btn-submit-to-organizer');
    const btnPub = document.getElementById('btn-submit-to-prop-commissioner');
    if (btnOrg) btnOrg.addEventListener('click', () => showToast('success', '考察记录已提交至组织委员'));
    if (btnPub) btnPub.addEventListener('click', () => showToast('success', '考勤记录已提交至宣传委员'));
  },

  refreshReviewSupervision() {
    const container = document.getElementById('disc-commissioner-review-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll({ sortByDate: true });
    const recentRecords = records.slice(-5);

    if (recentRecords.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 py-4">暂无活动记录可供复盘</p>';
      return;
    }

    container.innerHTML = `
      <div class="text-xs text-gray-500 mb-3">最近 ${recentRecords.length} 项活动（按时间倒序）：</div>
      ${recentRecords.map(r => `
        <div class="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
          <span class="text-xs font-medium text-gray-700">${r.name}</span>
          <span class="text-xs text-gray-400">${r.date || '—'}</span>
        </div>
      `).join('')}
      <button id="pub-review-btn" class="mt-3 w-full py-2 text-xs border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-300 hover:text-primary-700 transition-colors" style="background:none;cursor:pointer;">+ 新增复盘记录</button>
    `;

    const reviewBtn = document.getElementById('pub-review-btn');
    if (reviewBtn) reviewBtn.addEventListener('click', () => openFormModal({
      id: 'review-editor',
      title: '编辑复盘记录',
      fields: [
        { key: 'content', label: '复盘内容', type: 'textarea', required: true, placeholder: '请输入复盘内容...' },
        { key: 'rating', label: '评价等级', type: 'select', options: [
          { value: 'excellent', label: '优秀' },
          { value: 'good', label: '良好' },
          { value: 'average', label: '一般' },
          { value: 'needs_improvement', label: '待改进' }
        ]}
      ],
      onSubmit: (values) => {
        showToast('success', '复盘记录已保存');
      },
      accentColor: ACCENT_COLORS[getAppState().selectedRole] || ACCENT_COLORS.secretary
    }));
  },

  refreshCandidateTracker() {
    const container = document.getElementById('organizer-candidates-list');
    if (!container) return;

    const candidates = this.state.candidates;
    if (candidates.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">暂无发展党员记录</p>';
      return;
    }

    // 默认人视图（行=人，列=阶段）
    const currentView = container.dataset.view || 'person';
    container.dataset.view = currentView;

    const toggleBtn = `
      <div class="flex items-center gap-2 mb-3">
        <button id="candidate-view-toggle" class="text-xs px-3 py-1 rounded-lg border transition-colors"
          style="border-color:${ACCENT_COLORS['org-commissioner'].hex};color:${ACCENT_COLORS['org-commissioner'].hex};background:${currentView === 'person' ? 'rgba(14,165,233,0.08)' : 'transparent'};">
          ${currentView === 'person' ? '人视图' : '阶段视图'}
          <span class="ml-1 text-gray-400">⇄ 切换</span>
        </button>
        <span class="text-[10px] text-gray-400">${currentView === 'person' ? '行=候选人，列=阶段' : '行=阶段，列=候选人'}</span>
      </div>
    `;

    let contentHtml = '';
    if (currentView === 'person') {
      // 人视图：使用查询视图渲染人员卡片列表
      contentHtml = '<div id="candidate-query-view"></div>';
    } else {
      // 阶段视图（转置）：行=阶段，列=候选人
      const stageGroups = {};
      CANDIDATE_STAGES.forEach(s => { stageGroups[s] = []; });
      candidates.forEach(c => {
        if (stageGroups[c.stage]) stageGroups[c.stage].push(c);
      });

      contentHtml = `
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="bg-gray-50">
                <th class="py-2 px-3 text-left text-gray-600 font-medium sticky left-0 bg-gray-50 z-10">阶段</th>
                <th class="py-2 px-3 text-left text-gray-600 font-medium">人数</th>
                <th class="py-2 px-3 text-left text-gray-600 font-medium">人员</th>
                <th class="py-2 px-3 text-left text-gray-600 font-medium">材料待补</th>
              </tr>
            </thead>
            <tbody>
              ${CANDIDATE_STAGES.map(s => {
                const group = stageGroups[s];
                if (group.length === 0) return '';
                const incompleteCount = group.filter(c => !c.materialsComplete).length;
                return `
                  <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white z-10"><span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">${s}</span></td>
                    <td class="py-2 px-3 text-gray-700">${group.length}</td>
                    <td class="py-2 px-3 text-gray-700">${group.map(c => c.name || c.personId).join('、')}</td>
                    <td class="py-2 px-3">${incompleteCount > 0 ? '<span class="text-orange-600">' + incompleteCount + ' 人</span>' : '<span class="text-green-600">—</span>'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = toggleBtn + contentHtml;

    // 绑定转置切换
    const toggleEl = document.getElementById('candidate-view-toggle');
    if (toggleEl) {
      toggleEl.addEventListener('click', () => {
        container.dataset.view = currentView === 'person' ? 'stage' : 'person';
        this.refreshCandidateTracker();
      });
    }

    // 人视图：渲染查询视图（搜索姓名 + 筛选阶段）
    if (currentView === 'person') {
      const queryContainer = document.getElementById('candidate-query-view');
      if (queryContainer) {
        renderQueryView(queryContainer, {
          searchPlaceholder: '搜索姓名...',
          searchKey: 'name',
          filters: [{ key: 'stage', label: '阶段', options: CANDIDATE_STAGES.map(s => ({ value: s, label: s })) }],
          data: candidates,
          renderRow: (c) => {
            const stageIndex = CANDIDATE_STAGES.indexOf(c.stage);
            const progressPct = ((stageIndex + 1) / CANDIDATE_STAGES.length * 100).toFixed(0);
            return `
              <div class="flex items-center justify-between p-3 bg-gray-100 rounded-xl">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800">${c.name || c.personId}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">${c.stage}</span>
                    <span class="text-xs text-gray-500">进度 ${progressPct}%</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">${c.materialsComplete ? '<span class="text-green-600">材料齐全</span>' : '<span class="text-orange-600">材料不齐全</span>'}${c.missingMaterials > 0 ? ' · 缺 ' + c.missingMaterials + ' 项' : ''}</div>
                </div>
                <div class="ml-4 w-20">
                  <div class="w-full bg-gray-200 rounded-full h-1.5">
                    <div class="h-1.5 rounded-full" style="width:${progressPct}%;background:${ACCENT_COLORS['org-commissioner'].hex};"></div>
                  </div>
                </div>
              </div>
            `;
          },
          emptyMessage: '无匹配候选人',
          accentColor: ACCENT_COLORS['org-commissioner'].hex,
        });
      }
    }
  },

  refreshMaterialRemind() {
    const container = document.getElementById('organizer-material-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll({ sortByDate: true });
    const incompleteRecords = records.filter(r => !r.desc || r.link === '' || !r.type);

    if (incompleteRecords.length === 0) {
      container.innerHTML = '<p class="text-sm text-green-600 py-4">所有活动记录已完整填写</p>';
      return;
    }

    renderQueryView(container, {
      searchPlaceholder: '搜索活动名称...',
      searchKey: 'name',
      data: incompleteRecords,
      renderRow: (r) => `
        <div class="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${r.name}</div>
            <div class="text-xs text-gray-500 mt-0.5">${r.date || '—'} · ${r.type || '未分类'}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 ml-2">待补充</span>
        </div>
      `,
      emptyMessage: '无匹配结果',
      accentColor: ACCENT_COLORS['org-commissioner'].hex,
    });
  },

  refreshThoughtReport() {
    // D-241: 思想汇报不在系统业务范围（手写提交），此方法保留为空以避免外部调用报错
    // UI Tab 已从 party-org-entry.js 移除，此方法仅作为向后兼容的空占位
    return;
  },

  refreshArchives() {
    const container = document.getElementById('prop-commissioner-archives-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll({ sortByDate: true });

    if (records.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 py-6">暂无活动记录</p>';
      return;
    }

    // 提取类型选项（去重）
    const typeOptions = [...new Set(records.map(r => r.type).filter(Boolean))].map(t => ({ value: t, label: t }));

    // 容器分为查询栏 + 表格区两部分
    container.innerHTML = `
      <div id="archives-query-bar"></div>
      <div id="archives-table-area"></div>
    `;

    const queryBar = document.getElementById('archives-query-bar');
    const tableArea = document.getElementById('archives-table-area');

    // 渲染查询栏（搜索活动名 + 筛选类型），renderRow 渲染简化卡片
    const { uid } = renderQueryView(queryBar, {
      searchPlaceholder: '搜索活动名称...',
      searchKey: 'name',
      filters: [{ key: 'type', label: '类型', options: typeOptions }],
      data: records,
      renderRow: (r) => `
        <div class="p-2 bg-gray-100 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-800 truncate max-w-[200px]">${r.name}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">${r.type || '—'}</span>
          </div>
          <div class="text-xs text-gray-400 mt-0.5">${r.date || '—'} · ${r.filledBy || '—'}</div>
        </div>
      `,
      emptyMessage: '无匹配记录',
      accentColor: ACCENT_COLORS['prop-commissioner'].hex,
    });

    // 根据查询栏状态过滤 records 并重新渲染表格（不破坏表格结构与事件绑定）
    const applyTableFilter = () => {
      const searchEl = document.getElementById(`${uid}-search`);
      const filterEl = document.getElementById(`${uid}-filter-type`);
      const query = (searchEl?.value || '').trim().toLowerCase();
      const typeVal = filterEl?.value || '';

      const filtered = records.filter(r => {
        if (query && !String(r.name || '').toLowerCase().includes(query)) return false;
        if (typeVal && (r.type || '') !== typeVal) return false;
        return true;
      });
      this._renderArchivesTable(tableArea, filtered);
    };

    // 监听查询栏变化，重新渲染表格
    document.getElementById(`${uid}-search`)?.addEventListener('input', applyTableFilter);
    document.getElementById(`${uid}-filter-type`)?.addEventListener('change', applyTableFilter);
    document.getElementById(`${uid}-clear`)?.addEventListener('click', () => setTimeout(applyTableFilter, 0));

    // 初始渲染表格
    applyTableFilter();
  },

  // 辅助方法：在指定容器中渲染档案表格（保留原有结构与事件绑定）
  _renderArchivesTable(container, records) {
    if (records.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 py-6">无匹配记录</p>';
      return;
    }
    container.innerHTML = `
      <div class="pub-table-wrap">
        <table class="pub-table">
          <thead>
            <tr>
              <th class="pub-th pub-th-check"><input type="checkbox" id="pub-select-all" aria-label="全选"></th>
              <th class="pub-th">#</th>
              <th class="pub-th">活动名称</th>
              <th class="pub-th">主主题</th>
              <th class="pub-th">活动描述</th>
              <th class="pub-th">推送链接</th>
              <th class="pub-th">时间</th>
              <th class="pub-th">类型</th>
              <th class="pub-th">出席领导</th>
              <th class="pub-th">照片</th>
              <th class="pub-th">填写人</th>
              <th class="pub-th pub-th-action"><button id="pub-add-row-btn" class="text-xs" style="background:none;border:none;cursor:pointer;color:var(--primary-700);font-weight:600;">+ 新增</button></th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, i) => {
              const leaderStr = r.leaders && r.leaders.length > 0 ? r.leaders.join('、') : '无';
              const photoStr = r.leaderPhotos && r.leaderPhotos.length > 0 ? '有' : '无';
              return `
                <tr data-record-id="${r.id}" class="pub-row">
                  <td><input type="checkbox" class="pub-row-check" aria-label="选择第${i+1}行"></td>
                  <td class="pub-cell-num">${i + 1}</td>
                  <td class="pub-cell-name" title="${r.name}">${r.name}</td>
                  <td>${r.theme || ''}</td>
                  <td class="pub-cell-desc" title="${r.desc || ''}">${r.desc || '—'}</td>
                  <td><a href="${r.link || '#'}" target="_blank" rel="noopener" class="pub-link" ${r.link ? '' : 'style="color:var(--neutral-400);pointer-events:none;"'}>链接</a></td>
                  <td>${r.date || ''}</td>
                  <td><span class="pub-type-badge">${r.type || '—'}</span></td>
                  <td>${leaderStr}</td>
                  <td>${photoStr}</td>
                  <td>${r.filledBy || ''}</td>
                  <td>
                    <div class="pub-row-actions">
                      <button class="pub-action-edit" data-id="${r.id}" title="编辑">编辑</button>
                      <button class="pub-action-del" data-id="${r.id}" title="删除">删除</button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div id="pub-subrecords-area" class="hidden mt-4">
          <h4 class="font-title-cn text-xs font-bold text-gray-600 mb-2">子记录（关联详情）</h4>
          <div id="pub-subrecords-body"></div>
        </div>
      </div>`;
    this._bindPubTableEvents();
  },

  _bindPubTableEvents() {
    const selectAll = document.getElementById('pub-select-all');
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        document.querySelectorAll('.pub-row-check').forEach(c => c.checked = selectAll.checked);
      });
    }
    const addBtn = document.getElementById('pub-add-row-btn');
    if (addBtn) addBtn.addEventListener('click', () => this._showAddRecordForm());
    document.querySelectorAll('.pub-action-edit').forEach(btn => btn.addEventListener('click', () => this._editRecord(btn.dataset.id)));
    document.querySelectorAll('.pub-action-del').forEach(btn => btn.addEventListener('click', () => this._deleteRecord(btn.dataset.id)));
    document.querySelectorAll('.pub-row').forEach(row => row.addEventListener('click', (e) => {
      if (e.target.closest('.pub-row-actions') || e.target.closest('input[type=checkbox]')) return;
      const recordId = row.dataset.recordId;
      if (recordId) this._showSubRecords(recordId);
    }));
  },

  _showAddRecordForm() {
    const store = this._ensureStore();
    const newRecord = store.create({
      name: '新活动',
      theme: '',
      desc: '',
      link: '',
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      type: '',
      leaders: [],
      leaderPhotos: [],
      filledBy: '当前用户',
    });
    this.refreshArchives();
    showToast('success', '已新增空行，请点击编辑按钮编辑');
  },

  _editRecord(id) {
    openFormModal({
      id: `edit-record-${id}`,
      title: '编辑记录',
      fields: [
        { key: 'content', label: '记录内容', type: 'textarea', required: true, placeholder: '修改记录内容...' },
        { key: 'note', label: '备注', type: 'textarea', placeholder: '补充说明...' }
      ],
      onSubmit: (values) => {
        showToast('success', `记录 ${id} 已更新`);
      },
      accentColor: ACCENT_COLORS[getAppState().selectedRole] || ACCENT_COLORS.secretary
    });
  },

  _deleteRecord(id) {
    const store = this._ensureStore();
    store.delete(id);
    this.refreshArchives();
    showToast('success', '已删除该条记录');
  },

  _showSubRecords(recordId) {
    const store = this._ensureStore();
    const record = store.get(recordId);
    const area = document.getElementById('pub-subrecords-area');
    const body = document.getElementById('pub-subrecords-body');
    if (!area || !body || !record) return;

    area.classList.remove('hidden');
    body.innerHTML = `
      <div class="pub-sub-info mb-3 p-3 bg-gray-100 rounded-lg">
        <span class="font-medium text-sm">${record.name}</span>
        <span class="text-xs text-gray-400 ml-2">ID: ${recordId}</span>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between p-2 border border-dashed border-gray-300 rounded-lg">
          <span class="text-xs text-gray-500">考勤子记录</span>
          <button class="pub-sub-add-btn" data-type="attendance" data-parent="${recordId}">+ 添加考勤</button>
        </div>
        <div class="flex items-center justify-between p-2 border border-dashed border-gray-300 rounded-lg">
          <span class="text-xs text-gray-500">材料子记录</span>
          <button class="pub-sub-add-btn" data-type="materials" data-parent="${recordId}">+ 添加材料</button>
        </div>
        <div class="flex items-center justify-between p-2 border border-dashed border-gray-300 rounded-lg">
          <span class="text-xs text-gray-500">宣传子记录</span>
          <button class="pub-sub-add-btn" data-type="publicity" data-parent="${recordId}">+ 添加宣传</button>
        </div>
      </div>`;

    body.querySelectorAll('.pub-sub-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        openFormModal({
          id: `add-subrecord-${type}`,
          title: `添加${type}子记录`,
          fields: [
            { key: 'title', label: '标题', type: 'text', required: true, placeholder: '子记录标题' },
            { key: 'content', label: '内容', type: 'textarea', required: true, placeholder: '详细内容...' },
            { key: 'date', label: '日期', type: 'text', placeholder: 'YYYY-MM-DD' }
          ],
          onSubmit: (values) => {
            showToast('success', `${type}子记录已添加`);
          },
          accentColor: ACCENT_COLORS[getAppState().selectedRole] || ACCENT_COLORS.secretary
        });
      });
    });
  },

  refreshMaterialStandards() {
    const container = document.getElementById('prop-commissioner-standards-content');
    if (!container) return;

    container.innerHTML = PUBLICITY_STANDARDS.map(cat => `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">${cat.category}</h4>
        <ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
          ${cat.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  },

  refreshTemplateMgmt() {
    const container = document.getElementById('prop-commissioner-template-list');
    if (!container) return;

    container.innerHTML = TEMPLATE_LIST.map(t => `
      <div class="card rounded-xl p-4 cursor-pointer">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:${t.bgColor};">
            ${icon('file', { size: 20, stroke: t.color })}
          </div>
          <div>
            <div class="text-sm font-medium text-gray-800">${t.name}</div>
            <div class="text-xs text-gray-500">${t.desc}</div>
          </div>
        </div>
      </div>
    `).join('');
  },

  refreshWeeklyReport() {
    const container = document.getElementById('prop-commissioner-weekly-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll({ sortByDate: true });
    const thisMonthRecords = records.filter(r => {
      if (!r.date) return false;
      const d = r.date.replace(/\//g, '-');
      return d.startsWith(new Date().toISOString().slice(0, 7));
    });

    // 加载历史报送记录（每周一报送流程归档）
    if (!this.state.weeklyReportRecords.length) {
      this._loadWeeklyReports();
    }
    const reportRecords = this.state.weeklyReportRecords;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs text-gray-500">本月活动统计</span>
        <span class="text-xs font-medium">${thisMonthRecords.length} 项</span>
      </div>
      ${thisMonthRecords.length > 0 ? `
        <div class="space-y-2 mb-3">
          ${thisMonthRecords.map(r => `<div class="p-2 bg-gray-100 rounded-lg"><span class="text-xs font-medium">${r.name}</span><span class="text-xs text-gray-400 ml-2">${r.type || '—'}</span></div>`).join('')}
        </div>
      ` : '<p class="text-sm text-gray-400 py-2">本月暂无记录</p>'}
      <div class="grid grid-cols-2 gap-2 mb-4">
        <button id="pub-weekly-btn" class="py-2 btn-primary" style="font-size:0.75rem;">生成周报</button>
        <button id="pub-submit-btn" class="py-2 btn-primary" style="font-size:0.75rem; background:#0EA5E9;">每周一报送</button>
      </div>
      <div class="border-t border-gray-200 pt-3 mt-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-500">每周一报送记录</span>
          <span class="text-xs font-medium">${reportRecords.length} 条</span>
        </div>
        <div id="weekly-report-query"></div>
      </div>
    `;

    // 渲染报送记录查询视图（搜索周报范围 + 无筛选器）
    const queryContainer = document.getElementById('weekly-report-query');
    if (queryContainer) {
      renderQueryView(queryContainer, {
        searchPlaceholder: '搜索周报范围（起始日期）...',
        searchKey: 'weekStart',
        data: reportRecords,
        renderRow: (r) => `
          <div class="p-2 bg-blue-50 rounded-lg border border-blue-100">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-blue-800">${r.weekStart} 至 ${r.weekEnd}</span>
              <span class="text-[10px] text-gray-500">${r.submitDate}</span>
            </div>
            <div class="text-[11px] text-gray-600">本周 ${r.count} 项活动 · 通知ID: ${r.noticeId}</div>
            <details class="mt-1">
              <summary class="text-[10px] text-gray-400 cursor-pointer">查看报送内容</summary>
              <p class="text-[11px] text-gray-600 mt-1 leading-relaxed">${r.summary}</p>
            </details>
          </div>
        `,
        emptyMessage: '暂无匹配的报送记录',
        accentColor: ACCENT_COLORS['prop-commissioner'].hex,
      });
    }

    const weeklyBtn = document.getElementById('pub-weekly-btn');
    if (weeklyBtn) weeklyBtn.addEventListener('click', () => openFormModal({
      id: 'weekly-report',
      title: '生成周报',
      fields: [
        { key: 'weekRange', label: '周报范围', type: 'text', required: true, placeholder: '例：5.19-5.25' },
        { key: 'highlights', label: '本周亮点', type: 'textarea', required: true, placeholder: '本周重要工作成果...' },
        { key: 'issues', label: '存在问题', type: 'textarea', placeholder: '需要关注的问题...' },
        { key: 'nextPlan', label: '下周计划', type: 'textarea', placeholder: '下周重点工作...' }
      ],
      submitLabel: '生成',
      onSubmit: (values) => {
        showToast('success', '周报已生成');
      },
      accentColor: ACCENT_COLORS[getAppState().selectedRole] || ACCENT_COLORS.secretary
    }));

    // 每周一报送：基于活动数据自动生成报送内容 → 提交后通知书记 + 归档
    const submitBtn = document.getElementById('pub-submit-btn');
    if (submitBtn) submitBtn.addEventListener('click', () => {
      const content = this._buildWeeklySubmissionContent();
      openFormModal({
        id: 'weekly-submission',
        title: `每周一报送（${content.weekStart} 至 ${content.weekEnd}）`,
        fields: [
          { key: 'weekRange', label: '报送范围', type: 'text', required: true },
          { key: 'activityCount', label: '本周活动数', type: 'text', required: true },
          { key: 'summary', label: '报送内容（自动生成，可编辑）', type: 'textarea', required: true, placeholder: '本周活动汇总...' }
        ],
        initialValues: {
          weekRange: `${content.weekStart} 至 ${content.weekEnd}`,
          activityCount: String(content.count),
          summary: content.summary,
        },
        submitLabel: '提交报送',
        onSubmit: (values) => {
          // 若用户编辑了 summary，使用编辑后的内容覆盖自动生成内容
          const record = this.submitWeeklyReport(values.summary || content.summary);
          if (record) {
            this.refreshWeeklyReport();
          }
        },
        accentColor: ACCENT_COLORS[getAppState().selectedRole] || ACCENT_COLORS.secretary
      });
    });
  },

  refreshImageGallery() {
    const container = document.getElementById('prop-commissioner-image-gallery');
    if (!container) return;

    const records = ImageRecordStore.list();
    if (records.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 py-4">暂无图片记录，请上传图片</p>';
      return;
    }

    // 按日期分组（list 已按日期倒序）
    const groups = {};
    records.forEach(r => {
      const dateKey = r.date || '未知日期';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(r);
    });

    const groupHtml = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      const items = groups[date];
      return `
        <div class="mb-4">
          <div class="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b border-gray-200">${date}（${items.length} 张）</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            ${items.map(r => {
              const actTitle = r.activityId ? (ACTIVITIES.find(a => a.id === r.activityId)?.title || '—') : '—';
              return `
                <div class="pub-image-card" data-image-id="${r.id}" style="cursor:pointer;">
                  <div class="rounded-lg overflow-hidden border border-gray-200" style="aspect-ratio:4/3;background:#f3f4f6;">
                    <img src="${r.base64}" alt="${r.title}" class="w-full h-full object-cover" />
                  </div>
                  <div class="text-xs text-gray-700 mt-1 truncate">${r.title}</div>
                  <div class="pub-image-detail hidden mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                    <div><span class="text-gray-400">日期：</span>${r.date || '—'}</div>
                    <div><span class="text-gray-400">标题：</span>${r.title}</div>
                    <div><span class="text-gray-400">拍摄主体：</span>${r.subject || '—'}</div>
                    <div><span class="text-gray-400">关联活动：</span>${actTitle}</div>
                    <div><span class="text-gray-400">上传人：</span>${r.uploadedBy || '—'}</div>
                    <button class="pub-image-del-btn text-xs text-red-500 hover:text-red-700" data-id="${r.id}" style="background:none;border:none;cursor:pointer;padding:2px 0;">删除此图片</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    container.innerHTML = groupHtml;

    // 绑定点击展开/收起标注信息
    container.querySelectorAll('.pub-image-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.pub-image-del-btn')) return;
        const detail = card.querySelector('.pub-image-detail');
        if (detail) detail.classList.toggle('hidden');
      });
    });

    // 绑定删除按钮
    container.querySelectorAll('.pub-image-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (ImageRecordStore.remove(id)) {
          showToast('success', '图片已删除');
          this.refreshImageGallery();
        }
      });
    });
  },

  refreshDefaultOverview() {
    const candidates = this.state.candidates;
    const makeupTasks = this.state.makeupTasks;
    const feedbackItems = this.state.feedbackItems;
    const mailboxLastCheck = this.state.mailboxLastCheck;

    const inTransit = candidates.filter(c => c.stage !== '正式党员').length;
    const statCandidates = document.getElementById('default-stat-candidates');
    if (statCandidates) statCandidates.textContent = inTransit;

    const totalMakeup = makeupTasks.length;
    const completedMakeup = makeupTasks.filter(t => t.completed).length;
    const makeupRate = totalMakeup > 0 ? Math.round(completedMakeup / totalMakeup * 100) + '%' : '—';
    const statMakeup = document.getElementById('default-stat-makeup');
    if (statMakeup) statMakeup.textContent = makeupRate;

    const pendingFeedback = feedbackItems.filter(f => f.status === 'pending').length;
    const statFeedback = document.getElementById('default-stat-feedback');
    if (statFeedback) statFeedback.textContent = pendingFeedback;

    const statMailbox = document.getElementById('default-stat-mailbox');
    if (statMailbox) statMailbox.textContent = mailboxLastCheck || '—';

    const st = getAppState();
    const as = computeSecretaryStats(st.activities || []);
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    s('default-stat-active',  as.activeEvents);
    s('default-stat-month',   as.monthEvents);
    s('default-stat-pending', as.pendingAuth);
    s('default-stat-archive', as.archivedEvents);
  },

  renderComplianceRefs(listId, readerId) {
    const listContainer = document.getElementById(listId);
    const readerContainer = document.getElementById(readerId);
    if (!listContainer) return;

    listContainer.innerHTML = COMPLIANCE_FILES.map(file => `
      <div class="compliance-ref-card" data-file-path="${file.path}" data-file-note="${file.note || ''}">
        <div class="flex items-center gap-2">
          ${icon('fileText', { size: 14 })}
          <span class="text-sm text-gray-700">${file.name}</span>
        </div>
        <span class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">资料查询 →</span>
      </div>
    `).join('');

    listContainer.querySelectorAll('.compliance-ref-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelector('[data-module="search"]')?.click();
      });
    });
  },

  _noticeFormBound: false,

  refreshNoticeSection() {
    const panel = document.getElementById('notice-publish-panel');
    const denyMsg = document.getElementById('notice-permission-deny');
    if (!panel) return;

    const { selectedRole } = getAppState();
    const canPublish = NoticePermission.canPublish(selectedRole);

    if (!canPublish) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    if (denyMsg) denyMsg.classList.add('hidden');

    if (!this._noticeFormBound) {
      this._initNoticeForm();
      this._noticeFormBound = true;
    }
  },

  _initNoticeForm() {
    const btn = document.getElementById('btn-publish-notice');
    if (!btn) return;

    btn.addEventListener('click', () => this._publishNotice());
  },

  _publishNotice() {
    const title = document.getElementById('notice-title-input')?.value.trim();
    const content = document.getElementById('notice-content-input')?.value.trim();
    const priority = document.getElementById('notice-priority-input')?.value || 'normal';
    const expireDate = document.getElementById('notice-expire-input')?.value || '';
    const targetModule = document.getElementById('notice-target-input')?.value || 'calendar';
    const msgEl = document.getElementById('notice-publish-msg');

    if (!title || !content) {
      const titleInput = document.getElementById('notice-title-input');
      if (!title && titleInput) {
        titleInput.focus();
        titleInput.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.55)';
        setTimeout(() => { titleInput.style.boxShadow = ''; }, 1800);
      }
      showToast('error', '标题和内容为必填项');
      return;
    }

    const { selectedRole } = getAppState();
    const result = NoticeStore.add({
      title,
      content,
      priority,
      publishDate: new Date().toISOString().slice(0, 10),
      expireDate: expireDate || null,
      targetModule,
      publisher: selectedRole,
    }, selectedRole);

    if (!result) {
      showToast('error', '发布失败：权限不足');
      return;
    }

    document.getElementById('notice-title-input').value = '';
    document.getElementById('notice-content-input').value = '';
    document.getElementById('notice-priority-input').value = 'normal';
    document.getElementById('notice-expire-input').value = '';

    if (msgEl) {
      msgEl.classList.remove('hidden');
      setTimeout(() => msgEl.classList.add('hidden'), 2500);
    }
    showToast('success', `通知「${title}」已发布`);
  },

  _secBatchOpsBound: false,
  _secShortcutsBound: false,

  refreshSecretaryAggregateView() {
    const st = getAppState();
    const acts = st.activities || [];
    const stats = computeSecretaryStats(acts);

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sec-stat-active',   stats.activeEvents);
    set('sec-stat-month',    stats.monthEvents);
    set('sec-stat-pending',  stats.pendingAuth);
    set('sec-stat-auth',     stats.authGranted);
    set('sec-stat-archived', stats.archivedEvents);

    this._refreshFeedbackData();

    if (!this._secBatchOpsBound) {
      this._initSecretaryBatchOps();
      this._secBatchOpsBound = true;
    }

    if (!this._secShortcutsBound) {
      this._initSecretaryShortcuts();
      this._secShortcutsBound = true;
    }
  },

  _refreshFeedbackData() {
    const counts = FeedbackStore.countByStatus();
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    s('sec-fb-pending',    counts.pending);
    s('sec-fb-processing', counts.processing);
    s('sec-fb-done',       counts.done);

    const listContainer = document.getElementById('sec-feedback-list');
    if (!listContainer) return;

    const pending = FeedbackStore.getPending();
    if (pending.length === 0) {
      listContainer.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">暂无待处理的意见反馈</p>';
      return;
    }

    const scopeLabels = { permanent: '底层架构', global: '全局通用', role: '权责调整', scenario: '特定场景' };
    renderQueryView(listContainer, {
      searchPlaceholder: '搜索反馈内容...',
      searchKey: 'painPoint',
      filters: [{ key: 'scope', label: '范围', options: [
        { value: 'permanent', label: '底层架构' },
        { value: 'global', label: '全局通用' },
        { value: 'role', label: '权责调整' },
        { value: 'scenario', label: '特定场景' },
      ] }],
      data: pending,
      renderRow: (f) => `
        <div class="p-2 bg-gray-100 rounded-lg">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium text-gray-700 truncate max-w-[200px]">${f.painPoint || f.proposedFix}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">${scopeLabels[f.scope] || f.scope}</span>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>${f.submittedBy}</span>
            <span>${f.submittedAt}</span>
          </div>
        </div>
      `,
      emptyMessage: '暂无匹配的反馈',
      accentColor: ACCENT_COLORS['secretary'].hex,
    });
  },

  _initSecretaryShortcuts() {
    document.querySelector('.sec-btn-lecture')?.addEventListener('click', () => {
      document.getElementById('btn-party-lecture')?.click();
    });
    document.querySelector('.sec-btn-congress')?.addEventListener('click', () => {
      document.getElementById('btn-host-congress')?.click();
    });
  },

  _initSecretaryBatchOps() {
    const msgEl = document.getElementById('batch-op-msg');

    document.getElementById('btn-batch-remind')?.addEventListener('click', () => {
      const st = getAppState();
      const pending = (st.activities || []).filter(a =>
        !a.archived && a.direction === 'bottom-up' && !(a.authorizedBy || a.authorized)
      );
      const count = pending.length;
      if (msgEl) {
        msgEl.classList.remove('hidden');
        msgEl.textContent = count > 0
          ? `已向 ${count} 个待赋权活动的组织者发送催缴提醒`
          : '暂无待赋权活动';
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
      }
      showToast('info', count > 0 ? `批量催缴：${count} 个活动` : '无待催缴项');
    });

    document.getElementById('btn-batch-archive')?.addEventListener('click', () => {
      const st = getAppState();
      const now = new Date();
      const toArchive = (st.activities || []).filter(a => {
        if (a.archived) return false;
        const d = new Date(a.date);
        return d < new Date(now.getFullYear(), now.getMonth() - 1, 1);
      });
      const count = toArchive.length;
      if (msgEl) {
        msgEl.classList.remove('hidden');
        msgEl.textContent = count > 0
          ? `已标记 ${count} 个历史活动为「待归档」状态`
          : '暂无符合归档条件的活动（上月以前）';
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
      }
      showToast('info', count > 0 ? `批量归档：${count} 个活动` : '无待归档项');
    });

    document.getElementById('btn-batch-export')?.addEventListener('click', () => {
      const st = getAppState();
      const acts = st.activities || [];
      if (acts.length === 0) {
        showToast('error', '无活动数据可导出');
        return;
      }
      const csvHeader = 'title,date,category,status,assignedTo,authorizedBy\n';
      const csvRows = acts.map(a =>
        [a.title || '', a.date || '', a.category || '', a.archived ? 'archived' : 'active', a.assignedTo || '', a.authorizedBy || ''].join(',')
      ).join('\n');
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activities-export-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('success', `已导出 ${acts.length} 条活动记录`);
    });
  },

};
