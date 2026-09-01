// role: [工程师]+[AI]
// ws-prop-commissioner-entry.js — 宣传委员工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { createWorkspaceShell } from '../components/workspace-shell.js?v=20260901f';
import { renderReportEntryHtml, bindReportEntry } from '../components/report-entry.js?v=20260901f';
import { flashHighlight } from '../core/utils.js?v=20260901f';
import { loadActivities } from '../services/activity.js?v=20260901f';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260901f';
import { seedTodos } from '../services/todo.js?v=20260901f';
// 副作用导入触发宣传委员工作台能力注册（tab 清单）
import '../modules/capabilities/prop-workspace.js?v=20260812d';

await createWorkspaceShell({
  accentRole: 'prop-commissioner',
  scope: 'workspace:prop',
  capId: 'prop-workspace',
  containerId: 'prop-content',
  prefix: 'prop',
  storageKey: 'workflowos_tab_prop',
  defaultTab: 'todo',
  // 角色特有渲染上下文：宣传相关专班（名称含"宣传"或发起人为宣传委员）
  renderCtxExtras: (state) => {
    const taskforces = TaskForceRecordStore.getAll();
    return {
      activities: state.activities || [],
      propTf: taskforces.filter(t => t.name.includes('宣传') || t.initiator === 'p12'),
    };
  },
  // 一键汇报入口（书记 2026-08-10 裁定：复用 Issue 体系）
  extraRightHtml: ({ accent, accentRgba }) => renderReportEntryHtml({ accent, accentRgba }),
  bindExtras: (container) => bindReportEntry(container),
  // ── 首页跳转落点（书记 2026-08-08 裁定）：宣传无活动/专班专属 tab，由「项目看板」承载（现状即权限），定位高亮卡片
  onNavTarget: (nav, state, shell) => {
    shell.activate('kanban');
    if (nav.tfId || nav.actId) {
      const sel = nav.tfId
        ? `.kanban-card[data-kt="taskforce"][data-ki="${nav.tfId}"]`
        : `.kanban-card[data-kt="activity"][data-ki="${nav.actId}"]`;
      // B1-5 轮询定位：看板数据可能延迟到达，轮询直至卡片出现再定位高亮
      let attempts = 0;
      const tryLocate = () => {
        const target = document.querySelector(sel);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(target);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(tryLocate, 300);
        }
      };
      setTimeout(tryLocate, 150);
    }
    return { tabId: 'kanban' };
  },
  loadOptions: {
    role: 'prop-commissioner',
    storeInits: [() => TaskForceRecordStore.init()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-prop',
    seedTodos,
  },
});
