// role: [工程师]+[AI]
// 宣传委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：概况顶部挂「待答复 n · 去处理」直达条。
// 2026-10-18 繁专项 Task 6：work-overview 汇报区已降为只读摘要 +「去我的处置」，
// 顶部直达条属重复动作 ⇒ 外壳不再挂条，只保留骨架占位。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 原地渲染概况（不推挤正文）。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261018h';
import { AuthStore } from '../../../services/core/auth.js?v=20261018h';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261018h';

/**
 * 条线缺口行补真实动作（2026-10-18 繁专项 Task 15）。
 * work-overview 的条线缺口/态势原本只有「数字」没有落点；概况外壳在渲染后把待归档缺口行升级为
 * 按钮，直达「档案归档」页签。
 */
const PROP_GAP_TARGETS = [
  { test: /待归档活动/, tab: 'archive', label: '档案归档' },
];

function _upgradeGapRow(row, target) {
  if (!row || row.dataset.woGapBound) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn-ghost ${row.className} w-full text-left`;
  btn.dataset.woGap = target.tab;
  btn.dataset.woGapBound = '1';
  btn.title = `前往${target.label}处理`;
  btn.innerHTML = `${row.innerHTML}<span class="text-xs text-gray-500 flex-shrink-0">去${target.label} ›</span>`;
  row.replaceWith(btn);
  btn.addEventListener('click', () => {
    const tabBtn = document.querySelector(`.prop-tab-btn[data-prop-tab="${target.tab}"]`);
    if (tabBtn) tabBtn.click();
  });
}

function _bindLineGapActions(container) {
  if (!container) return;
  // 只在概况骨架内生效，避免同一容器切到其他 tab 后误判。
  const headings = [...container.querySelectorAll('h4')].map(h => h.textContent.trim());
  if (!headings.includes('卡点') && !headings.includes('在办')) return;
  container.querySelectorAll('span').forEach(label => {
    const text = label.textContent.trim();
    const row = label.parentElement;
    if (!row || row.dataset.woGapBound) return;
    if (text === '条线缺口') {
      const target = PROP_GAP_TARGETS.find(t => t.test.test(row.textContent));
      if (target) _upgradeGapRow(row, target);
      return;
    }
    // 「在办」底部条线态势里的「档案 · 待归档 N 个」同样是缺口，给同一落点。
    if (text === '档案' && row.textContent.includes('待归档')) {
      _upgradeGapRow(row, { tab: 'archive', label: '档案归档' });
    }
  });
}

export async function renderContent(ctx) {
  const el = document.getElementById('prop-tab-content');
  if (!el) return null;
  const personId = AuthStore.getCurrentUser()?.personId || 'p12';
  beginOverviewShell(el);
  const done = await renderWorkOverview(el, {
    role: 'prop-commissioner',
    personId,
    accent: ctx.accent,
    prefix: 'prop',
  });
  _observeLineGapActions(el);
  return done;
}

/** work-overview 内部下钻返回/外发确认会自行重绘 ⇒ 用观察器把缺口动作补回（不内改共享件）。 */
function _observeLineGapActions(container) {
  _bindLineGapActions(container);
  if (!container || container.dataset.woGapObserved === '1') return;
  container.dataset.woGapObserved = '1';
  new MutationObserver(() => _bindLineGapActions(container))
    .observe(container, { childList: true, subtree: true });
}
