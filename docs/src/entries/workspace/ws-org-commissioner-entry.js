// role: [工程师]+[AI]
// ws-org-commissioner-entry.js — 组织委员工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { getAppState, setState } from '../../core/base/state.js?v=20261001e';
import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261001e';
import { flashHighlight } from '../../core/base/utils.js?v=20261001e';
import { loadActivities } from '../../services/activity/activity.js?v=20261001e';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261001e';
import { SignupStore } from '../../services/activity/signup.js?v=20261001e';
import { seedTodos } from '../../services/governance/todo.js?v=20261001e';
import { solidAccentStyle } from '../../core/domain/constants.js?v=20261001e';
import { openRecruitForm } from '../tabs/org/taskforce-tab.js?v=20261001e';
// 副作用导入触发组织委员工作台能力注册（tab 清单；含 立项⑥B波 成员名册 tab）
import '../../capabilities/org-workspace.js?v=20261001e';

await createWorkspaceShell({
  accentRole: 'org-commissioner',
  scope: 'workspace:org',
  capId: 'org-workspace',
  containerId: 'org-content',
  prefix: 'org',
  storageKey: 'workflowos_tab_org',
  defaultTab: 'today',
  // 角色特有渲染上下文：专班各状态栏分组排序（T223 新者在前）
  renderCtxExtras: (state, ctx) => {
    const taskforces = TaskForceRecordStore.getAll();
    const sortTfByNew = (arr) => [...arr].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return {
      activities: state.activities || [],
      pending: sortTfByNew(taskforces.filter(t => t.status === 'draft' || t.status === 'pending_review')),
      recruiting: sortTfByNew(taskforces.filter(t => t.status === 'recruiting')),
      active: sortTfByNew(taskforces.filter(t => t.status === 'active')),
      highlightActId: ctx.highlightTfId, // 对齐 org tab 的高亮字段名（activity-view 组件）
    };
  },
  // 本台唯一主 CTA＝「发布招募」（2026-09-30 批次 297-2：页头只留 1 枚本台主 CTA；
  //   「一键汇报」已收进顶栏全局固定位 ⇒ 不再在此并排第二枚彩色按钮）
  extraRightHtml: ({ accent, accentBorder }) =>
    '<button id="btn-publish-tf" style="' + solidAccentStyle(accent, accentBorder) + ';border:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;cursor:pointer;transition:opacity 0.15s;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">发布招募</button>',
  bindExtras: (container, shell) => {
    container.querySelector('#btn-publish-tf')?.addEventListener('click', () => openRecruitForm(shell.renderCtx(getAppState())));
  },
  // ── 首页跳转落点（支书 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  onNavTarget: (nav, state, shell) => {
    if (nav.actId || nav.view) {
      // 活动查看（组织台 2026-09-14 起由「知情查看」承载——活动/专班分段，原独立 activity-view 已合并）
      shell.activate('tf-view');
      if (nav.actId) {
        shell.setHighlight(nav.actId, `[data-act-id="${nav.actId}"], [data-activity-id="${nav.actId}"]`);
        // 2026-08-08 修复：activity-view 组件默认渲染当前月，URL 活动在旧月时日历无该条目 → 高亮无目标。
        const act = (state.activities || []).find(a => a.id === nav.actId);
        setState({ displayMonth: act?.date?.slice(0, 7) || undefined, selectedActivityId: nav.actId });
        return { tabId: 'tf-view', highlightId: nav.actId };
      }
      return { tabId: 'tf-view' };
    }
    if (nav.tfId) {
      // 专班定位：轮询直至卡片出现再展开详情+高亮（B1-5）
      shell.activate('taskforce');
      const tfId = nav.tfId;
      let attempts = 0;
      const tryLocate = () => {
        const card = document.querySelector(`.tf-store-card[data-tf-id="${tfId}"]`);
        if (card) {
          card.click(); // 展开详情
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          flashHighlight(card);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(tryLocate, 300);
        }
      };
      setTimeout(tryLocate, 150);
      return { tabId: 'taskforce' };
    }
    return false;
  },
  loadOptions: {
    role: 'org-commissioner',
    storeInits: [() => TaskForceRecordStore.init(), () => SignupStore.init()],
    fallbackData: () => loadActivities(),
    logTag: 'ws-org',
    seedTodos,
  },
});
