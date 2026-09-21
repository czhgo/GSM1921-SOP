// role: [工程师]+[AI]
// feedback-entry.js — 意见反馈入口（GitHub Issue 风格）

import { renderSidebar } from '../components/sidebar.js?v=20260921f';
import { renderHeader } from '../components/header.js?v=20260921f';
import { BranchService } from '../services/runtime.js?v=20260921f';
// D-486（2026-09-18 批次 88）：本页必须先 hydrate API 数据源再取数——与 activity / archive 独立页同款标准形。
// 此前本页连 runtime.js 都未 import ⇒ api 形态下 getDataSource() 仍是 mock，意见列表读的是本地
// issues.json / localStorage（种子能开、服务端新数据打不开）。本批与评论写链（issue-detail.js 改走
// 服务层）一并处置——只补 hydrate 而写链没接，会把「评论落本机、自见」变成「评论静默丢失」。
import { registerApiAdapter, init as dataInit, setDataSource, notifyDataLoaded } from '../core/data-adapter.js?v=20260921f';
import { ApiAdapter } from '../core/api-adapter.js?v=20260921f';
import { IssueStore } from '../services/issues.js?v=20260921f';
import { MilestoneStore } from '../services/milestones.js?v=20260921f';
import { showToast, getBasePath } from '../core/utils.js?v=20260921f';
import { AuthStore } from '../services/auth.js?v=20260921f';
import { renderIssueList } from '../components/issue-list.js?v=20260921f';
import { renderIssueDetail } from '../components/issue-detail.js?v=20260921f';
import { scrollDetailIntoView } from '../components/detail-anchor.js?v=20260921f';
import { renderIssueForm } from '../components/issue-form.js?v=20260921f';

renderSidebar('feedback');
renderHeader('feedback');

/** 数据 hydrate（批次 88 · D-486）：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。 */
async function _hydrateData() {
  try {
    registerApiAdapter(ApiAdapter);
    let token = null;
    try { token = sessionStorage.getItem('gsm1921-api-token'); } catch (_) { /* 隐私模式无 sessionStorage */ }
    if (token) {
      setDataSource('api', { apiBaseUrl: '', authToken: token });
      try {
        await dataInit();
      } catch (e) {
        console.warn('[feedback-entry] API 数据加载失败，回退本地 mock', e);
        setDataSource('mock');
        BranchService.loadDB();
      }
    } else {
      BranchService.loadDB();
    }
  } catch (e) {
    console.warn('[feedback-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

// ── URL 路由 ──
function getRouteParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

async function initRoute() {
  // 旧数据迁移（一次性）
  const migrated = IssueStore.migrateFromFeedbackStore();
  if (migrated > 0) {
    showToast('info', `已自动迁移 ${migrated} 条旧反馈到新数据格式`);
  }

  // 加载数据
  await IssueStore.loadAll();
  await MilestoneStore.loadAll();

  const id = getRouteParam('id');
  const isNew = getRouteParam('new') === '1';

  if (id) {
    showDetailView(id);
  } else if (isNew) {
    // L2 功能门控：提交反馈需登录（支书 2026-08-18 裁决），未登录跳登录页
    if (!AuthStore.getCurrentUser()) {
      window.location.href = getBasePath() + 'login.html';
      return;
    }
    showNewView();
  } else {
    showListView();
  }
}

function showListView() {
  document.getElementById('issue-list-view')?.classList.remove('hidden');
  document.getElementById('issue-detail-view')?.classList.add('hidden');
  document.getElementById('issue-new-view')?.classList.add('hidden');
  renderIssueList();
}

function showDetailView(id) {
  document.getElementById('issue-list-view')?.classList.add('hidden');
  document.getElementById('issue-detail-view')?.classList.remove('hidden');
  document.getElementById('issue-new-view')?.classList.add('hidden');
  renderIssueDetail(id);
  // 触点即落点（全局 UX 反思批次 2026-09-13）：列表被详情视图替换、详情 DOM 在列表上方，
  // 点靠下的条目后用户需「反向向上」寻找 → 打开后把详情滚入视野
  scrollDetailIntoView(document.getElementById('issue-detail-view'));
}

function showNewView() {
  document.getElementById('issue-list-view')?.classList.add('hidden');
  document.getElementById('issue-detail-view')?.classList.add('hidden');
  document.getElementById('issue-new-view')?.classList.remove('hidden');
  renderIssueForm();
}

// 暴露给子组件调用（避免循环依赖）
window.__issueRouter = { showListView, showDetailView, showNewView };

// 初始渲染：先 hydrate 数据源，再路由 / 取数（IssueStore.loadAll / MilestoneStore.loadAll 在 initRoute 内）
(async () => {
  await _hydrateData();
  initRoute();
})();
