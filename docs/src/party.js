// role: [人机]
// ════════════════════════════════════════════════════════════════
// party.js — 党务管理模块状态管理器
//  职责：管理四大子功能的数据加载、状态流转、DOM 渲染
//  依赖：state.js（读取 selectedRole）
// ════════════════════════════════════════════════════════════════

import { getAppState } from './state.js';
import { showToast } from './utils.js';
import { filterForViewProxy, assignedRoles, computeSecretaryStats } from './service.roles.js';
import { createStoreWithMockData } from './workflow/activityRecord.js';
import { NoticeStore, NoticePermission } from './service.notice.js';
import { FeedbackStore } from './service.feedback.js';

// ════════════════════════════════════════════════════════════════
//  Mock 数据定义
// ════════════════════════════════════════════════════════════════

/** 发展党员候选人阶段枚举 */
const CANDIDATE_STAGES = ['入党申请人', '积极分子', '发展对象', '预备党员', '正式党员'];

/** 合规文件列表 — 引用资料查询模块中的真实文件 */
const COMPLIANCE_FILES = [
  { name: '中国共产党章程', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '党支部工作规范（学生）', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '党员教育管理工作条例', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '发展党员工作细则', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '高校基层组织工作条例', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '支部工作条例（试行）', path: '#search', note: '请通过「资料查询」模块获取' },
];

/** 宣传材料格式规范（静态内容） */
const PUBLICITY_STANDARDS = [
  { category: '照片规范', items: ['活动照片不少于3张，含全景1张+特写2张', '照片分辨率不低于1920x1080', '横版优先，竖版不超过1/3', '禁止使用美颜滤镜'] },
  { category: '文字规范', items: ['新闻稿字数500-800字', '标题使用黑体二号加粗', '正文使用仿宋三号', '行间距28磅'] },
  { category: '排版规范', items: ['A4纸排版，页边距上下2.54cm、左右3.17cm', '页码居中，底部5cm处', '正文首行缩进2字符'] },
];

/** 模板库列表 */
const TEMPLATE_LIST = [
  { name: '活动总结模板', desc: '用于总结各类党支部活动', color: '#CE1126', bgColor: 'rgba(206,17,38,0.08)' },
  { name: '会议记录模板', desc: '规范记录党支部会议内容', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)' },
  { name: '入党申请书模板', desc: '入党申请人撰写参考', color: '#10B981', bgColor: 'rgba(16,185,129,0.08)' },
  { name: '思想汇报模板', desc: '季度思想汇报撰写参考', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.08)' },
  { name: '转正申请书模板', desc: '预备党员转正申请参考', color: '#D97706', bgColor: 'rgba(217,119,6,0.08)' },
  { name: '活动复盘模板', desc: '活动复盘与经验总结', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)' },
];

// ════════════════════════════════════════════════════════════════
//  PartyModule 对象
// ════════════════════════════════════════════════════════════════

export const PartyModule = {
  // ── 状态定义 ─────────────────────────────────────────────────
  state: {
    candidates: [],
    makeupTasks: [],
    feedbackItems: [],
    mailboxLastCheck: null,
  },

  recordStore: null,

  _ensureStore() {
    if (!this.recordStore) {
      this.recordStore = createStoreWithMockData();
    }
    return this.recordStore;
  },

  // ══════════════════════════════════════════════════════════════
  //  数据加载
  // ══════════════════════════════════════════════════════════════

  /** 从 Mock 数据初始化全部状态 */
  loadAll() {
    this.state.candidates = this._mockCandidates();
    this.state.makeupTasks = this._mockMakeupTasks();
    this.state.feedbackItems = this._mockFeedbackItems();
    this.state.mailboxLastCheck = '2026-04-28';
  },

  /** 刷新所有面板数据（重新加载 Mock） */
  refreshAll() {
    this.loadAll();
    this.renderCommissionerPanel();
    showToast('success', '党务管理数据已刷新');
  },

  // ══════════════════════════════════════════════════════════════
  //  角色判定 + 面板切换
  // ══════════════════════════════════════════════════════════════

  /** 根据当前激活的 tab 判定应显示哪个支委面板（DOM 优先，state 兜底） */
  getActiveCommissioner() {
    const activeTab = document.querySelector('.commissioner-tab[data-commissioner].active');
    if (activeTab) return activeTab.dataset.commissioner;
    const { selectedRole } = getAppState();
    if (selectedRole === 'secretary')           return 'secretary';
    if (selectedRole === 'disc-commissioner')   return 'inspector';
    if (selectedRole === 'org-commissioner')    return 'organizer';
    if (selectedRole === 'prop-commissioner')   return 'publicity';
    return 'default';
  },

  /** 渲染对应支委面板（隐藏其他面板） */
  renderCommissionerPanel() {
    const commissioner = this.getActiveCommissioner();

    // 隐藏所有 commissioner-panel
    document.querySelectorAll('.commissioner-panel').forEach(p => {
      p.classList.add('hidden');
    });

    // 显示对应面板
    const targetPanel = document.getElementById(`panel-${commissioner}`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }

    // 根据面板类型渲染内容
    if (commissioner === 'secretary') {
      this.refreshSecretaryAggregateView();
    } else if (commissioner === 'inspector') {
      this.refreshMakeupStatus();
      this.refreshMailboxReminder();
      this.refreshParticipationSummary();
      this.refreshReviewSupervision();
    } else if (commissioner === 'organizer') {
      this.refreshCandidateTracker();
      this.refreshMaterialRemind();
      this.refreshThoughtReport();
      this.renderComplianceRefs('organizer-compliance-file-list', 'organizer-compliance-reader');
    } else if (commissioner === 'publicity') {
      this.refreshArchives();
      this.refreshMaterialStandards();
      this.refreshTemplateMgmt();
      this.refreshWeeklyReport();
    } else {
      // 默认概览面板
      this.refreshDefaultOverview();
      this.renderComplianceRefs('compliance-file-list', 'compliance-reader');
    }

    this.refreshNoticeSection();
  },

  // ══════════════════════════════════════════════════════════════
  //  子 tab 切换
  // ══════════════════════════════════════════════════════════════

  /** 切换指定支委面板内的子 tab */
  switchSubTab(commissioner, subtab) {
    const panel = document.getElementById(`panel-${commissioner}`);
    if (!panel) return;

    // 更新 tab 按钮激活态
    panel.querySelectorAll('.commissioner-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.subtab === subtab);
    });

    // 更新内容区显示
    panel.querySelectorAll('.commissioner-subtab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.subtabContent === subtab);
    });
  },

  // ══════════════════════════════════════════════════════════════
  //  纪检委员面板渲染
  // ══════════════════════════════════════════════════════════════

  /** 更新补课完成度 */
  refreshMakeupStatus() {
    const container = document.getElementById('inspector-makeup-list');
    if (!container) return;

    const tasks = this.state.makeupTasks;
    if (tasks.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">暂无补课任务</p>';
      return;
    }

    container.innerHTML = tasks.map(task => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-800">${task.name}</div>
          <div class="text-xs text-gray-500 mt-1">缺勤活动：${task.absentActivity} | 缺勤日期：${task.absentDate}</div>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <span class="text-xs px-2 py-1 rounded-full ${task.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${task.completed ? '已补' : '待补'}</span>
          ${!task.completed ? `<button class="btn-primary" style="padding:4px 12px;font-size:0.6875rem;" data-makeup-id="${task.id}">标记已补</button>` : ''}
        </div>
      </div>
    `).join('');

    // 绑定标记已补按钮
    container.querySelectorAll('[data-makeup-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.makeupId;
        this.completeMakeup(id);
      });
    });
  },

  /** 补课完成 → 回写考勤记录 */
  completeMakeup(taskId) {
    const task = this.state.makeupTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      this.refreshMakeupStatus();
      showToast('success', `${task.name} 的补课已标记完成，考勤记录已回写`);
    }
  },

  /** 更新公邮提醒 */
  refreshMailboxReminder() {
    const container = document.getElementById('inspector-mailbox-info');
    if (!container) return;

    const lastCheck = this.state.mailboxLastCheck || '未查收';
    const today = new Date();
    const lastDate = this.state.mailboxLastCheck ? new Date(this.state.mailboxLastCheck) : null;
    const daysSince = lastDate ? Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) : null;
    const nextReminder = lastDate ? new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    const nextReminderStr = nextReminder ? nextReminder.toISOString().slice(0, 10) : '—';
    const isOverdue = daysSince !== null && daysSince >= 7;

    container.innerHTML = `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
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

    // 绑定确认查收按钮
    const confirmBtn = document.getElementById('btn-confirm-mailbox');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.confirmMailboxCheck();
      });
    }
  },

  /** 确认查收 → 重置计时器 */
  confirmMailboxCheck() {
    const today = new Date().toISOString().slice(0, 10);
    this.state.mailboxLastCheck = today;
    this.refreshMailboxReminder();
    showToast('success', '公邮查收已确认，计时器已重置');
  },

  /** 更新参与汇总 */
  refreshParticipationSummary() {
    const container = document.getElementById('inspector-participation-list');
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
      <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <span class="text-xs text-gray-600">${item.label}</span>
        <span class="text-sm font-medium text-gray-800">${item.value}</span>
      </div>
    `).join('') + `
      <div class="mt-3">
        <button class="btn-primary" style="padding:6px 16px;font-size:0.75rem;" id="btn-submit-to-organizer">提交至组织委员</button>
        <button class="btn-primary" style="padding:6px 16px;font-size:0.75rem;margin-left:8px;background-color:#10B981;" id="btn-submit-to-publicity">提交至宣传委员</button>
      </div>
    `;

    // 绑定提交按钮
    const btnOrg = document.getElementById('btn-submit-to-organizer');
    const btnPub = document.getElementById('btn-submit-to-publicity');
    if (btnOrg) btnOrg.addEventListener('click', () => showToast('success', '参与记录已提交至组织委员'));
    if (btnPub) btnPub.addEventListener('click', () => showToast('success', '考勤记录已提交至宣传委员'));
  },

  /** 更新复盘督办 */
  refreshReviewSupervision() {
    const container = document.getElementById('inspector-review-list');
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
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <span class="text-xs font-medium text-gray-700">${r.name}</span>
          <span class="text-xs text-gray-400">${r.date || '—'}</span>
        </div>
      `).join('')}
      <button id="pub-review-btn" class="mt-3 w-full py-2 text-xs border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-300 hover:text-primary-700 transition-colors" style="background:none;cursor:pointer;">+ 新增复盘记录</button>
    `;

    const reviewBtn = document.getElementById('pub-review-btn');
    if (reviewBtn) reviewBtn.addEventListener('click', () => showToast('info', '复盘记录编辑器 — 待实现'));
  },

  // ══════════════════════════════════════════════════════════════
  //  组织委员面板渲染
  // ══════════════════════════════════════════════════════════════

  /** 更新发展党员看板 */
  refreshCandidateTracker() {
    const container = document.getElementById('organizer-candidates-list');
    if (!container) return;

    const candidates = this.state.candidates;
    if (candidates.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">暂无发展党员记录</p>';
      return;
    }

    container.innerHTML = candidates.map(c => {
      const stageIndex = CANDIDATE_STAGES.indexOf(c.stage);
      const progressPct = ((stageIndex + 1) / CANDIDATE_STAGES.length * 100).toFixed(0);
      return `
        <div class="p-4 bg-gray-50 rounded-xl">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium text-gray-800">${c.name}</div>
            <span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">${c.stage}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div class="h-2 rounded-full" style="width:${progressPct}%;background:#3B82F6;"></div>
          </div>
          <div class="flex gap-1 text-xs text-gray-400">
            ${CANDIDATE_STAGES.map((s, i) => `<span class="${i <= stageIndex ? 'text-blue-600 font-medium' : ''}">${s}</span>`).join('<span class="mx-0.5">→</span>')}
          </div>
          <div class="text-xs text-gray-500 mt-2">材料状态：${c.materialsComplete ? '<span class="text-green-600">齐全</span>' : '<span class="text-amber-600">缺 ' + c.missingMaterials + ' 项</span>'}</div>
        </div>
      `;
    }).join('');
  },

  /** 更新材料催缴 */
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

    container.innerHTML = `
      <p class="text-xs text-gray-500 mb-3">以下 ${incompleteRecords.length} 项活动记录信息不完整，请补充：</p>
      ${incompleteRecords.map(r => `
        <div class="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
          <span class="text-sm font-medium text-gray-800">${r.name}</span>
          <span class="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">待补充</span>
        </div>
      `).join('')}
    `;
  },

  /** 更新思想汇报统计 */
  refreshThoughtReport() {
    const container = document.getElementById('organizer-thought-list');
    if (!container) return;

    const mockData = [
      { quarter: '2026 Q1', total: 15, submitted: 13, rate: '86.7%' },
      { quarter: '2025 Q4', total: 15, submitted: 15, rate: '100%' },
    ];

    container.innerHTML = mockData.map(item => `
      <div class="p-3 bg-gray-50 rounded-xl">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-gray-800">${item.quarter}</div>
          <span class="text-xs px-2 py-1 rounded-full ${parseFloat(item.rate) >= 90 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">提交率：${item.rate}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">已提交：${item.submitted}/${item.total}</div>
        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
          <div class="h-1.5 rounded-full" style="width:${item.rate};background:#3B82F6;"></div>
        </div>
      </div>
    `).join('');
  },

  // ══════════════════════════════════════════════════════════════
  //  宣传委员面板渲染
  // ══════════════════════════════════════════════════════════════

  /** 更新档案归档 — 宣传委员多维表格（基于截图12字段） */
  refreshArchives() {
    const container = document.getElementById('publicity-archives-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll({ sortByDate: true });

    if (records.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400 py-6">暂无活动记录</p>';
      return;
    }

    const headerHtml = `
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

    container.innerHTML = headerHtml;
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
    showToast('info', `编辑记录 ${id} — 弹窗编辑器待实现（当前可直接修改 store 数据）`);
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
      <div class="pub-sub-info mb-3 p-3 bg-gray-50 rounded-lg">
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
        showToast('success', `${type} 子记录添加功能 — 待接入持久化层`);
      });
    });
  },

  /** 更新材料标准 */
  refreshMaterialStandards() {
    const container = document.getElementById('publicity-standards-content');
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

  /** 更新模板管理 */
  refreshTemplateMgmt() {
    const container = document.getElementById('publicity-template-list');
    if (!container) return;

    container.innerHTML = TEMPLATE_LIST.map(t => `
      <div class="card rounded-xl p-4 cursor-pointer">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:${t.bgColor};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${t.color}" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-800">${t.name}</div>
            <div class="text-xs text-gray-500">${t.desc}</div>
          </div>
        </div>
      </div>
    `).join('');
  },

  /** 更新周报报送 */
  refreshWeeklyReport() {
    const container = document.getElementById('publicity-weekly-list');
    if (!container) return;

    const store = this._ensureStore();
    const records = store.getAll({ sortByDate: true });
    const thisMonthRecords = records.filter(r => {
      if (!r.date) return false;
      const d = r.date.replace(/\//g, '-');
      return d.startsWith(new Date().toISOString().slice(0, 7));
    });

    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs text-gray-500">本月活动统计</span>
        <span class="text-xs font-medium">${thisMonthRecords.length} 项</span>
      </div>
      ${thisMonthRecords.length > 0 ? `
        <div class="space-y-2 mb-3">
          ${thisMonthRecords.map(r => `<div class="p-2 bg-gray-50 rounded-lg"><span class="text-xs font-medium">${r.name}</span><span class="text-xs text-gray-400 ml-2">${r.type || '—'}</span></div>`).join('')}
        </div>
      ` : '<p class="text-sm text-gray-400 py-2">本月暂无记录</p>'}
      <button id="pub-weekly-btn" class="w-full py-2 btn-primary" style="font-size:0.75rem;">生成周报</button>
    `;

    const weeklyBtn = document.getElementById('pub-weekly-btn');
    if (weeklyBtn) weeklyBtn.addEventListener('click', () => showToast('info', '周报生成功能 — 待接入服务层'));
  },

  // ══════════════════════════════════════════════════════════════
  //  默认概览面板渲染
  // ══════════════════════════════════════════════════════════════

  /** 更新默认概览面板的四宫格统计 */
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

  // ══════════════════════════════════════════════════════════════
  //  合规文件引用渲染
  // ══════════════════════════════════════════════════════════════

  /** 渲染合规文件列表（只读展示 content/references/ 文件） */
  renderComplianceRefs(listId, readerId) {
    const listContainer = document.getElementById(listId);
    const readerContainer = document.getElementById(readerId);
    if (!listContainer) return;

    listContainer.innerHTML = COMPLIANCE_FILES.map(file => `
      <div class="compliance-ref-card" data-file-path="${file.path}" data-file-note="${file.note || ''}">
        <div class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
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

  // ══════════════════════════════════════════════════════════════
  //  D4.2 通知发布界面
  // ══════════════════════════════════════════════════════════════

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
      expireDate: expireDate || undefined,
      targetModule,
      publisher: selectedRole,
    }, selectedRole);

    if (!result) {
      showToast('error', '发布失败：权限不足');
      return;
    }

    // 清空表单
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

  // ══════════════════════════════════════════════════════════════
  //  C5 党支书全局聚合视图
  // ══════════════════════════════════════════════════════════════

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
    listContainer.innerHTML = pending.slice(0, 5).map(f => `
      <div class="p-2 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-700 truncate max-w-[200px]">${f.painPoint || f.proposedFix}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">${scopeLabels[f.scope] || f.scope}</span>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>${f.submittedBy}</span>
          <span>${f.submittedAt}</span>
        </div>
      </div>
    `).join('');
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

  // ══════════════════════════════════════════════════════════════
  //  Mock 数据工厂
  // ══════════════════════════════════════════════════════════════

  _mockCandidates() {
    return [
      { id: 'c1', name: '赵六', stage: '入党申请人', materialsComplete: false, missingMaterials: 3 },
      { id: 'c2', name: '钱七', stage: '积极分子', materialsComplete: false, missingMaterials: 1 },
      { id: 'c3', name: '孙八', stage: '发展对象', materialsComplete: true, missingMaterials: 0 },
      { id: 'c4', name: '周九', stage: '预备党员', materialsComplete: true, missingMaterials: 0 },
      { id: 'c5', name: '吴十', stage: '积极分子', materialsComplete: false, missingMaterials: 2 },
    ];
  },

  _mockMakeupTasks() {
    return [
      { id: 'mk1', name: '张三', absentActivity: '4月主题党日活动', absentDate: '2026-04-15', completed: false },
      { id: 'mk2', name: '李四', absentActivity: '4月支委会', absentDate: '2026-04-18', completed: false },
      { id: 'mk3', name: '王五', absentActivity: '3月党小组会', absentDate: '2026-03-20', completed: true },
      { id: 'mk4', name: '赵六', absentActivity: '4月党课', absentDate: '2026-04-25', completed: false },
      { id: 'mk5', name: '钱七', absentActivity: '3月主题党日活动', absentDate: '2026-03-14', completed: true },
    ];
  },

  _mockFeedbackItems() {
    return [
      { id: 'fb1', content: '建议增加线上学习渠道', status: 'pending', date: '2026-04-20' },
      { id: 'fb2', content: '活动时间冲突反馈', status: 'processing', date: '2026-04-18' },
      { id: 'fb3', content: '培训内容建议', status: 'pending', date: '2026-04-22' },
      { id: 'fb4', content: '会议效率改进建议', status: 'done', date: '2026-04-10' },
      { id: 'fb5', content: '材料模板更新需求', status: 'done', date: '2026-04-05' },
    ];
  },
};
