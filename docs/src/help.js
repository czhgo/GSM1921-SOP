// help.html 内联脚本外抽（2026-11-22 批次 601 · D-911）——只搬不改
// 章节折叠：目录点击 / 搜索命中 / 深链进入时，先展开目标所在的 <details>，再交给原有滚动逻辑。
// 只操作 open 状态，不改锚点 id、不删正文；目录与搜索机制仍由 help-catalog.js 负责。
(function () {
  function openAncestors(el) {
    if (!el) return;
    var box = el.closest('details');
    while (box) {
      box.open = true;
      box = box.parentElement ? box.parentElement.closest('details') : null;
    }
  }
  function byHash(hash) {
    var raw = String(hash || '').replace(/^#/, '');
    if (!raw) return null;
    try { return document.getElementById(decodeURIComponent(raw)); }
    catch (e) { return document.getElementById(raw); }
  }
  function openHash() {
    var el = byHash(window.location.hash);
    if (!el) return;
    openAncestors(el);
    window.requestAnimationFrame(function () {
      el.scrollIntoView({ block: 'start' });
    });
  }
  document.addEventListener('click', function (e) {
    // 连续检索时只保留本次命中卡片的高亮，避免上一轮 2.6s 高亮与本次叠加。
    if (e.target.closest('.help-search-result')) {
      document.querySelectorAll('.is-highlighted').forEach(function (el) {
        el.classList.remove('is-highlighted');
      });
    }
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    openAncestors(byHash(link.getAttribute('href')));
  }, true);
  window.addEventListener('hashchange', openHash);
  openHash();
  document.addEventListener('DOMContentLoaded', openHash);
})();
