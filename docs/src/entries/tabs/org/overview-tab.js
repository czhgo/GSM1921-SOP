// role: [工程师]+[AI]
// 组织委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：概况顶部挂「待答复 n · 去处理」直达条。
// 2026-10-18 繁专项 Task 6：work-overview 汇报区已降为只读摘要 +「去我的处置」，
// 顶部直达条属重复动作 ⇒ 外壳不再挂条，只保留骨架占位。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 原地渲染概况（不推挤正文）。
// 2026-10-18 繁专项 Task 14（组织台）：共享 work-overview 不改，本外壳在渲染后补齐两处组织台落点——
//   · 履职卡「发展党员」原映射到已摘除的 `development` 页签 ⇒ 改落 `talent`（人才库 / 阶段推进写位）；
//   · 条线缺口行原为纯文本 ⇒ 按缺口语义补真实页签动作（专班管理 / 活动日历等）。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261018e';
import { AuthStore } from '../../../services/core/auth.js?v=20261018e';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261018e';

/** 组织台条线缺口 → 真实页签（缺口文案含关键词即命中；均为本台已注册页签） */
const ORG_GAP_ACTIONS = [
  { match: /专班招募/, tab: 'taskforce', label: '去专班管理' },
  { match: /待赋权活动/, tab: 'calendar', label: '去活动日历' },
  { match: /待支书确认|成员变更|名册/, tab: 'roster', label: '去成员名册' },
  { match: /考察|发展对象|积极分子/, tab: 'talent', label: '去人才库' },
  { match: /思想汇报|汇报待补充/, tab: 'thought-review', label: '去思想汇报' },
];

/** 点击本台页签（页签按钮 = `.org-tab-btn[data-org-tab]`，见 components/shell/tab-bar.js） */
function _gotoOrgTab(tabId) {
  document.querySelector(`.org-tab-btn[data-org-tab="${tabId}"]`)?.click();
}

/**
 * 渲染后补齐组织台专属落点（不改共享 work-overview / workforce-duty-card 的实现）。
 * @param {HTMLElement} el 概况容器 `#org-tab-content`
 */
function _enhanceOrgOverview(el) {
  // ① 履职卡：`development` 页签已摘除（capabilities/org-workspace.js 明令不得再注册）
  //    ⇒ 同一「发展党员」职责改落 `talent`（人才库；阶段推进写位 = 个人总表，由人才库卡片直达）。
  el.querySelectorAll('.wfd-duty[data-tab="development"]').forEach((btn) => {
    btn.setAttribute('data-tab', 'talent');
    btn.setAttribute('title', '去履职（人才库）');
  });

  // ② 条线缺口：行结构 = 色点 / 「条线缺口」标签 / 缺口文案；按文案补真实页签动作。
  el.querySelectorAll('div').forEach((row) => {
    if (row.children.length < 3) return;
    if (row.children[1]?.textContent?.trim() !== '条线缺口') return;
    if (row.dataset.orgGapBound) return;
    const text = row.textContent || '';
    const action = ORG_GAP_ACTIONS.find((a) => a.match.test(text));
    if (!action) return;
    row.dataset.orgGapBound = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-outline text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0';
    btn.setAttribute('data-org-gap-tab', action.tab);
    btn.setAttribute('aria-label', `${action.label}：处理${text.trim()}`);
    btn.textContent = `${action.label} →`;
    btn.addEventListener('click', () => _gotoOrgTab(action.tab));
    row.appendChild(btn);
  });
}

export async function renderContent(ctx) {
  const el = document.getElementById('org-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p11';
  beginOverviewShell(el);
  await renderWorkOverview(el, {
    role: 'org-commissioner',
    personId,
    accent: ctx.accent,
    prefix: 'org',
  });
  _enhanceOrgOverview(el);
  return null;
}
