// role: [工程师]+[AI]
// main-entry.js — 主页入口（调度层，方案 B 入口拆分 2026-08-29）
// index.html 专属，处理 dashboard 全量数据渲染；
// 各区块渲染已拆至 components/dashboard/：stats（统计卡+考勤弹窗）/ activity-panel（活动日历+列表）/ taskforce-list / gallery。
// 本文件仅保留：bootstrap、工作台链接修正、renderUI 调度、renderDashboard 组装+导航委托、数据变更即时刷新。

import { BranchService } from '../services/runtime.js?v=20260901f';
import { STATE, setState, registerRenderCallback, getAppState } from '../core/state.js?v=20260901f';
import { NoticeStore, renderNoticeList } from '../services/notice.js?v=20260901f';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260901f';
import { getBasePath } from '../core/utils.js?v=20260901f';
import { loadAttendanceRecords, loadActiveAttendanceRecords } from '../services/attendance.js?v=20260901f';
import { loadActivities } from '../services/activity.js?v=20260901f';
import { CrossPageState } from '../core/cross-page-state.js?v=20260901f';
import { bootstrapPage } from '../core/bootstrap.js?v=20260901f';
import { AuthStore } from '../services/auth.js?v=20260901f';
import { loadWorkspaceData } from '../core/data-loader.js?v=20260901f';
import { DATA_CHANGED_EVENT } from '../core/data-adapter.js?v=20260901f';
import '../modules/capabilities/activity-calendar.js?v=20260822a'; // 副作用导入：注册首页活动日历能力
// ── 方案 B 入口拆分：dashboard 区块渲染模块 ──
import { renderDashboardStats } from '../components/dashboard/stats.js?v=20260901f';
import { renderActivityList, renderActivityCalendar, initActivityTabs, getInitialActivityView } from '../components/dashboard/activity-panel.js?v=20260901f';
import { renderTaskforceList } from '../components/dashboard/taskforce-list.js?v=20260901f';
import { renderGallery } from '../components/dashboard/gallery.js?v=20260901f';

const { user } = await bootstrapPage({ module: 'dashboard' });

// 根据用户角色更新 dashboard 中的 workspace 链接
// T-284：未登录统一直达登录页，消除「公开页→工作台→门控踢→login」的绕路跳转
const wsLinks = document.querySelectorAll('a[href*="workspace/"]');
if (user) {
  const wsPage = AuthStore.getPageForRole('workspace', user.role) || 'visitor.html';
  const wsBase = getBasePath() + 'workspace/' + wsPage;
  wsLinks.forEach(a => { a.href = wsBase; });
} else {
  wsLinks.forEach(a => { a.href = getBasePath() + 'login.html'; });
}

function renderUI(state) {
  document.querySelectorAll('.module-tab[data-module]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.module === 'dashboard');
  });

  if (state.activeModule === 'dashboard') {
    renderDashboard(state);
  }
}

registerRenderCallback(renderUI);

function renderDashboard(state) {
  const activities = state.activities || [];
  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();
  const isLoading = state.status === STATE.LOADING && activities.length === 0;

  renderDashboardStats({ activities, taskforces, notices, attendanceRecords: loadAttendanceRecords(), user, isLoading });

  if (isLoading) return; // 等数据就绪再渲染其余区域，避免"暂无"→实际数据闪烁

  renderNoticeList('dashboard-notice-list', 5);
  const noticeCount = document.getElementById('dashboard-notice-count');
  if (noticeCount) {
    const activeUnread = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;
    noticeCount.textContent = activeUnread > 0 ? `${activeUnread} 条未读` : '';
  }

  renderTaskforceList(taskforces);
  renderActivityList(activities, user);
  // 考勤概况已迁移至书记+纪检工作区，首页不再渲染
  renderGallery(activities);

  // ── 近期活动卡片渲染（日历/列表 + URL 同步 + 日历能力挂载）──
  renderActivityCalendar(state);

  const dashContainer = document.getElementById('view-dashboard');
  if (!dashContainer || dashContainer.dataset.navBound === 'true') return;

  dashContainer.dataset.navBound = 'true';

  dashContainer.addEventListener('click', (e) => {
    // T-304 方案B 修复：user 判空——未登录时点击直达登录页（T-284 意图），消除 user.role 空引用 TypeError
    const wsBase = user
      ? getBasePath() + 'workspace/' + (AuthStore.getPageForRole('workspace', user.role) || 'visitor.html')
      : getBasePath() + 'login.html';

    const actItem = e.target.closest('[data-activity-id]');
    if (actItem) {
      const actId = actItem.dataset.activityId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
        : wsBase;
      window.location.href = url;
      return;
    }
    const tfItem = e.target.closest('[data-tf-id]');
    if (tfItem) {
      const tfId = tfItem.dataset.tfId;
      const url = tfId
        ? CrossPageState.buildURL(wsBase, { taskforceId: tfId })
        : wsBase;
      window.location.href = url;
      return;
    }
    const galleryItem = e.target.closest('[data-gallery-activity-id]');
    if (galleryItem) {
      const actId = galleryItem.dataset.galleryActivityId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
        : wsBase;
      window.location.href = url;
      return;
    }
    // 日历活动条目点击：跳转到对应工作台
    const calItem = e.target.closest('.cal-activity-item');
    if (calItem) {
      const actId = calItem.dataset.actId;
      const url = actId
        ? CrossPageState.buildURL(wsBase, { activityId: actId })
        : wsBase;
      window.location.href = url;
      return;
    }
  });
}

// T223 修复：活动 tab 在模块初始化即绑定（tab 按钮为静态 HTML），
// 避免异步数据加载期间用户点击「列表」时监听器尚未绑定而丢失点击。
initActivityTabs();

loadWorkspaceData({
  role: 'all',
  selectedRole: null,
  activeModule: 'dashboard',
  fallbackData: () => loadActivities(),
  storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init()],
  extraLoads: [() => typeof BranchService.listTasks === 'function' ? BranchService.listTasks() : Promise.resolve([])],
  logTag: 'initApp'
});

// ── 数据变更即时刷新（2026-08-05，响应书记"计算需手动刷新"）──────
// 任何业务写（通知已读、待办完成、考勤确认等）经 persist() 派发 DATA_CHANGED_EVENT，
// 首页订阅后即时重算统计卡/通知列表/我的考勤，无需手动刷新页面。
function _refreshDashboardSnapshot() {
  const state = getAppState();
  const activities = state.activities || [];
  const taskforces = TaskForceRecordStore.getAll();
  const notices = NoticeStore.getAll();

  renderDashboardStats({ activities, taskforces, notices, attendanceRecords: loadActiveAttendanceRecords(), user });
  if (state.status === STATE.LOADING && activities.length === 0) return;

  renderNoticeList('dashboard-notice-list', 5);
  const noticeCount = document.getElementById('dashboard-notice-count');
  if (noticeCount) {
    const activeUnread = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;
    noticeCount.textContent = activeUnread > 0 ? `${activeUnread} 条未读` : '';
  }

  renderTaskforceList(taskforces);
  renderActivityList(activities, user);
  renderGallery(activities);
}

document.addEventListener(DATA_CHANGED_EVENT, () => {
  if (getAppState().activeModule !== 'dashboard') return;
  _refreshDashboardSnapshot();
});

const _lastDataVersion = CrossPageState.getDataVersion();

window.addEventListener('storage', (e) => {
  if (e.key === 'sop_org_os_data_version') {
    const newVersion = CrossPageState.getDataVersion();
    if (newVersion !== _lastDataVersion) {
      BranchService.listActivities().then(activities => {
        setState({ activities });
      }).catch(() => {});
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const newVersion = CrossPageState.getDataVersion();
    if (newVersion !== _lastDataVersion) {
      BranchService.listActivities().then(activities => {
        setState({ activities });
      }).catch(() => {});
    }
  }
});
