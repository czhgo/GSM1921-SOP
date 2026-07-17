// role: [工程师]+[AI]
// feedback-entry.js — 意见反馈入口（GitHub Issue 风格）

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { IssueStore } from '../services/issues.js';
import { MilestoneStore } from '../services/milestones.js';
import { AuthStore } from '../services/auth.js';
import { showToast } from '../core/utils.js';
import { renderIssueList } from '../components/issue-list.js';
import { renderIssueDetail } from '../components/issue-detail.js';
import { renderIssueForm } from '../components/issue-form.js';

renderSidebar('feedback');
renderHeader('feedback');

// ── URL 路由 ──
function getRouteParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

async function initRoute() {
  // 旧数据迁移（一次性）
  const migrated = IssueStore.migrateFromFeedbackStore();
  if (migrated > 0) {
    showToast('info', `已自动迁移 ${migrated} 条旧反馈到新 issue 格式`);
  }

  // 加载数据
  await IssueStore.loadAll();
  await MilestoneStore.loadAll();

  const id = getRouteParam('id');
  const isNew = getRouteParam('new') === '1';

  if (id) {
    showDetailView(id);
  } else if (isNew) {
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
}

function showNewView() {
  document.getElementById('issue-list-view')?.classList.add('hidden');
  document.getElementById('issue-detail-view')?.classList.add('hidden');
  document.getElementById('issue-new-view')?.classList.remove('hidden');
  renderIssueForm();
}

// 暴露给子组件调用（避免循环依赖）
window.__issueRouter = { showListView, showDetailView, showNewView };

initRoute();
