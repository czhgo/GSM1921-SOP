// role: [工程师]+[AI]
// ws-org-commissioner-entry.js — 组织委员工作台入口（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 workspace-shell）
// 入口职责：壳配置（注册表 tab 清单 + 导航落点 + 数据加载），角色特有逻辑仅保留。

import { getAppState, setState } from '../../core/base/state.js?v=20261102b';
import { createWorkspaceShell } from '../../components/shell/workspace-shell.js?v=20261102b';
import { flashHighlight, showToast, smoothScroll } from '../../core/base/utils.js?v=20261102b';
import { loadActivities } from '../../services/activity/activity.js?v=20261102b';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261102b';
import { SignupStore } from '../../services/activity/signup.js?v=20261102b';
import { seedTodos } from '../../services/governance/todo.js?v=20261102b';
import { solidAccentStyle } from '../../core/domain/constants.js?v=20261102b';
import { AuthStore } from '../../services/core/auth.js?v=20261102b';
import { getBranchIdOfPerson, getBranchCapabilityPackageState } from '../../services/branch/branch.js?v=20261102b';
import { openRecruitForm } from '../tabs/org/taskforce-tab.js?v=20261102b';
// 副作用导入触发组织委员工作台能力注册（tab 清单；含 立项⑥B波 成员名册 tab）
import '../../capabilities/org-workspace.js?v=20261102b';

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
      taskforcePackageEnabled: getBranchCapabilityPackageState(getBranchIdOfPerson(AuthStore.getCurrentUser?.()?.personId || AuthStore.getCurrentUser?.()?.id))['taskforce-workgroup'] !== false,
      highlightActId: ctx.highlightTfId, // 对齐 org tab 的高亮字段名（activity-view 组件）
    };
  },
  // 本台唯一主 CTA＝「发布招募」（2026-09-30 批次 297-2：页头只留 1 枚本台主 CTA；
  //   「一键汇报」已收进顶栏全局固定位 ⇒ 不再在此并排第二枚彩色按钮）
  extraRightHtml: ({ accent, accentBorder }) => {
    const me = AuthStore.getCurrentUser?.();
    const branchId = getBranchIdOfPerson(me?.personId || me?.id);
    const enabled = getBranchCapabilityPackageState(branchId)['taskforce-workgroup'] !== false;
    return '<button id="btn-publish-tf" ' + (enabled ? '' : 'disabled aria-disabled="true" title="本支部已停用专班工作组；可继续处理在办事项并查阅历史" ') + 'style="' + solidAccentStyle(accent, accentBorder) + ';border:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;cursor:' + (enabled ? 'pointer' : 'not-allowed') + ';opacity:' + (enabled ? '1' : '.55') + ';"' + '>发布招募</button>';
  },
  bindExtras: (container, shell) => {
    container.querySelector('#btn-publish-tf')?.addEventListener('click', (event) => {
      if (event.currentTarget.disabled) return;
      openRecruitForm(shell.renderCtx(getAppState()));
    });
  },
  // ── 首页跳转落点（支书 2026-08-08 裁定：activityId / view=activities / taskforceId 必须消费）──
  onNavTarget: (nav, state, shell) => {
    if (nav.actId || nav.view) {
      // 2026-10-25 IA 62→45：「活动日历」页签已降为**工作概况页内折叠卡** ⇒ 深链落 overview 并展开该卡。
      //   定位做法不变：把月份切到该活动所在月 + 高亮 `.cal-activity-item[data-act-id]`（壳的定位轮询）。
      shell.activate('overview');
      setTimeout(() => document.dispatchEvent(new CustomEvent('ws:open-calendar')), 300);
      if (nav.actId) {
        shell.setHighlight(nav.actId, `[data-act-id="${nav.actId}"]`);
        const act = (state.activities || []).find(a => a.id === nav.actId);
        setState({ displayMonth: act?.date?.slice(0, 7) || undefined, selectedActivityId: nav.actId });
        return { tabId: 'overview', highlightId: nav.actId };
      }
      return { tabId: 'overview' };
    }
    if (nav.tfId) {
      // 专班定位：轮询直至卡片出现再展开详情+高亮（B1-5）
      shell.activate('taskforce');
      const tfId = nav.tfId;
      // 2026-10-24 批次 508：同时把高亮目标登记给壳（选择器与本处轮询锚点一致）——
      //   原实现只在本函数内轮询点击/闪烁，壳的高亮快照仍为空 ⇒ 导航抑制窗口内一旦重渲染，
      //   专班卡片被换掉、定位链路就断在半路（列表在、高亮不在）。登记后两条链路同源。
      shell.setHighlight(tfId, `.tf-store-card[data-tf-id="${tfId}"]`);
      let attempts = 0;
      const tryLocate = () => {
        const card = document.querySelector(`.tf-store-card[data-tf-id="${tfId}"]`);
        if (card) {
          card.click(); // 展开详情
          smoothScroll(card, { block: 'center' });
          flashHighlight(card);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(tryLocate, 300);
        } else {
          // Task 6：轮询耗尽仍定位不到专班 → 可见提示（深链可能指向已删除 / 他支部专班）。
          showToast('info', '未找到该专班（可能已删除、已解散或不在本支部）；请刷新列表后重试');
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
