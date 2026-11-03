// role: [工程师]+[AI]
// entries/tabs/leader/members-low-frequency.js — 组长台「组员进展」低频查阅折叠区（批次 525 Task 7）
// 背景：本页主阅读区（卡点/进度、组员汇报）用 aria-expanded 动作型显隐；
//   低频查阅是**阅读型折叠**，按 T3-3「同一文件同类折叠只用一种原语」拆到本文件，
//   让 members-tab.js 只保留动作型 aria-expanded，本文件只保留阅读型 details。
// 内容与绑定单一源不变：复盘正文由调用方传入，其他党小组宿主仍由 members-tab 填充。

export function lowFrequencyFoldsHtml({ reviewBodyHtml = '', reviewCounts = {}, reviewOpen = false, groupsOpen = false } = {}) {
  const pending = Number(reviewCounts.pending) || 0;
  const completed = Number(reviewCounts.completed) || 0;
  return `
    <div class="disclosure-host">
      <h4 class="disclosure__title" id="leader-review-fold-title">本组活动复盘状态<span class="disclosure__meta">待复盘 ${pending} · 已复盘 ${completed}</span></h4>
      <details class="disclosure" id="leader-review-fold"${reviewOpen ? ' open' : ''}>
        <summary class="disclosure__summary" aria-labelledby="leader-review-fold-title"></summary>
        <div class="disclosure__body" id="leader-review-body">${reviewBodyHtml}</div>
      </details>
    </div>
    <!-- 2026-10-25 IA 62→45：原「知情查看」页签降为折叠只读区（组织单元 ≠ 协作结构） -->
    <div class="disclosure-host pt-3 border-t border-gray-100" id="leader-groups-card">
      <h4 class="disclosure__title" id="leader-groups-fold-title">其他党小组<span class="disclosure__meta">只读 · 看 ≠ 做</span></h4>
      <details class="disclosure" id="leader-groups-fold"${groupsOpen ? ' open' : ''}>
        <summary class="disclosure__summary" aria-labelledby="leader-groups-fold-title"></summary>
        <div class="disclosure__body" id="leader-groups-host"></div>
      </details>
    </div>`;
}
