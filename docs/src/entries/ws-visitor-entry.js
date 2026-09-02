// role: [工程师]+[AI]
// ws-visitor-entry.js — 参与者工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { createWorkspaceShell } from '../components/workspace-shell.js?v=20260901n';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260901n';
import { loadActivities } from '../services/activity.js?v=20260901n';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260901n';
import { NoticeStore } from '../services/notice.js?v=20260901n';
import { SignupStore } from '../services/signup.js?v=20260901n';
import { AuthStore } from '../services/auth.js?v=20260901n';
import { PEOPLE } from '../mock/index.js?v=20260901n';
import { TodoStore, seedTodos, VisitorTodoDeriver } from '../services/todo.js?v=20260901n';
// 副作用导入触发参与者工作台能力注册（tab 清单）
import '../modules/capabilities/visitor-workspace.js?v=20260812a';

await createWorkspaceShell({
  accentRole: 'participant',
  scope: 'workspace:visitor',
  capId: 'visitor-workspace',
  containerId: 'visitor-content',
  prefix: 'visitor',
  storageKey: 'workflowos_tab_visitor',
  defaultTab: 'todo',
  // 角色特有渲染上下文：活动 + 全部专班 + 授权记录 + 双高亮目标
  renderCtxExtras: (state, ctx) => ({
    activities: state.activities || [],
    allTf: TaskForceRecordStore.getAll(),
    authRecords: AuthStore.getAuthorizations(),
    highlightId: ctx.highlightTfId,      // 活动动态高亮
    highlightTfId: ctx.highlightTfId,    // 项目分工高亮（对齐原入口双高亮字段）
  }),
  // 欢迎语替代身份标记（普通参与者无右上角 role-label，书记 2026-08-01 决策）
  topHtml: () => {
    const currentUser = AuthStore.getCurrentUser();
    const userName = currentUser?.personId ? (PEOPLE.find(p => p.id === currentUser.personId)?.name || '') : '';
    return userName
      ? `
    <div class="mb-4 flex items-center gap-2.5">
      <span class="inline-block w-1 h-4 rounded-full flex-shrink-0" style="background:var(--party-red);"></span>
      <p class="text-sm text-gray-700"><span class="font-semibold text-gray-800">欢迎回来，${userName}</span><span class="text-xs text-gray-400 ml-1">· 支部动态与个人成长一览</span></p>
    </div>`
      : '';
  },
  // 待办派生：通知待阅读 + 活动/专班待参与（幂等去重，可随渲染重复调用）
  beforeRender: (state) => {
    const currentUser = AuthStore.getCurrentUser();
    const taskforces = TaskForceRecordStore.getAll();
    const notices = NoticeStore.getAll();
    const signups = SignupStore.getAll();
    const activities = state.activities || [];
    if (currentUser?.personId) {
      VisitorTodoDeriver.deriveAll({
        personId: currentUser.personId,
        person: PEOPLE.find(p => p.id === currentUser.personId) || null,
        notices,
        activities,
        signups,
      });
      VisitorTodoDeriver.deriveFromTaskforceSignups({ personId: currentUser.personId, taskforces, signups });
    }
  },
  // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  extraRightHtml: ({ accent, accentRgba }) => renderReportEntryHtml({ accent, accentRgba }),
  bindExtras: (container) => bindReportEntry(container),
  // ── 首页跳转落点（书记 2026-08-08 裁定）：tfId → 项目分工 tab 定位高亮专班卡片；actId/view → 活动动态 tab 定位高亮活动
  onNavTarget: (nav, state, shell) => {
    if (nav.tfId) {
      shell.setHighlight(nav.tfId, `.visitor-proj-card[data-tf-id="${nav.tfId}"]`);
      shell.activate('projects');
      return { tabId: 'projects', highlightId: nav.tfId };
    }
    shell.activate('activities');
    if (nav.actId) {
      shell.setHighlight(nav.actId, `[data-visitor-act-id="${nav.actId}"]`);
      return { tabId: 'activities', highlightId: nav.actId };
    }
    return { tabId: 'activities' };
  },
  loadOptions: {
    role: 'all',
    selectedRole: null,
    storeInits: [() => NoticeStore.init(), () => TaskForceRecordStore.init(), () => SignupStore.init()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-visitor',
    seedTodos,
  },
});
