// role: [工程师]+[AI]
// 纪检委员工作台 Tab：工作概况（T-279 M3 拆分，照 M2 样板）
// 支书 2026-08-10 裁定：全部角色新增——汇报/卡点/在办三区总览，个人视角。
// IA-C2 收敛（2026-09-06）：概况顶部挂「待答复 n · 去处理」直达条。
// 2026-10-18 繁专项 Task 6：work-overview 汇报区已降为只读摘要 +「去我的处置」，
// 顶部直达条属重复动作 ⇒ 外壳不再挂条，只保留骨架占位。
// U3（2026-09-07）：先 beginOverviewShell 骨架/槽位占位 → 原地渲染概况（不推挤正文）。

import { renderWorkOverview } from '../../../components/governance/work-overview.js?v=20261018e';
import { getDiscCommissionerId } from './_shared.js?v=20261018e';
import { beginOverviewShell } from '../../../components/governance/overview-dispatch-bar.js?v=20261018e';

/**
 * 条线缺口行补真实动作（2026-10-18 繁专项 Task 15）。
 * work-overview 的条线缺口原本只有「数字」没有落点；概况外壳在渲染后把缺口行升级为按钮，
 * 直达对应职责页签（补课 → 考勤管理·补课分段；考察超期 → 考察管理）。
 */
const DISC_GAP_TARGETS = [
  { test: /补课待完成/, tab: 'attendance', segment: 'makeup', label: '考勤管理' },
  { test: /考察超期/, tab: 'inspection', label: '考察管理' },
];

async function _goGapTarget(tab, segment) {
  if (segment === 'makeup') {
    try {
      const m = await import('./attendance-tab.js?v=20261018e');
      m.focusSegment('makeup');
    } catch (_) { /* 分段记忆失败时仍进考勤页 */ }
  }
  const btn = document.querySelector(`.disc-tab-btn[data-disc-tab="${tab}"]`);
  if (btn) btn.click();
}

function _bindLineGapActions(container) {
  if (!container) return;
  // 只在概况骨架内生效，避免同一容器切到其他 tab 后误判。
  const headings = [...container.querySelectorAll('h4')].map(h => h.textContent.trim());
  if (!headings.includes('卡点') && !headings.includes('在办')) return;
  container.querySelectorAll('span').forEach(label => {
    if (label.textContent.trim() !== '条线缺口') return;
    const row = label.parentElement;
    if (!row || row.dataset.woGapBound) return;
    const text = row.textContent.replace(/\s+/g, ' ');
    const target = DISC_GAP_TARGETS.find(t => t.test.test(text));
    if (!target) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-ghost ${row.className} w-full text-left`;
    btn.dataset.woGap = target.tab;
    btn.dataset.woGapBound = '1';
    btn.title = `前往${target.label}处理`;
    btn.innerHTML = `${row.innerHTML}<span class="text-xs text-gray-500 flex-shrink-0">去${target.label} ›</span>`;
    row.replaceWith(btn);
    btn.addEventListener('click', () => { _goGapTarget(target.tab, target.segment); });
  });
}

export async function renderContent(ctx) {
  const el = document.getElementById('disc-tab-content');
  if (!el) return null;
  const personId = getDiscCommissionerId();
  beginOverviewShell(el);
  const done = await renderWorkOverview(el, {
    role: 'disc-commissioner',
    personId,
    accent: ctx.accent,
    prefix: 'disc',
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
