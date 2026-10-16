// Retained as a compatibility target for stale bookmarks and cached workspace config.
// D-824: feedback is a branch-internal workflow; the Party Committee has no read or reveal view.

export function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  el.dataset.currentTab = 'issue-review';
  el.innerHTML = `
    <section class="rounded-lg border border-gray-200 bg-white p-6 text-center">
      <h2 class="font-title-cn text-base font-bold text-gray-800">此事项在支部内处理</h2>
      <p class="mt-2 text-sm text-gray-600">匿名反馈不是向党委上报的入口。党委工作台不读取反馈内容或提交人身份。</p>
    </section>`;
}
