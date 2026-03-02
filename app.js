// ════════════════════════════════════════════════════════════════
//  光华管理学院本科生党支部 SOP 引擎 — app.js
//  AI 静态编译版 · 极简交互（≤30行）· 2026-03-02
//  唯一职能：监听角色 Tab，切换 hidden 类，无任何动态 fetch 逻辑
// ════════════════════════════════════════════════════════════════

(function () {
  var SECTIONS = ['all', 'leader', 'commissioner', 'organizer', 'deep'];

  function switchRole(key) {
    SECTIONS.forEach(function (r) {
      var s = document.getElementById('section-' + r);
      if (s) s.classList.toggle('hidden', r !== key);
    });
    document.querySelectorAll('[data-role]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.role === key);
    });
    var btn = document.querySelector('[data-role="' + key + '"]');
    if (btn) {
      var hl = document.getElementById('role-headline');
      var sl = document.getElementById('role-subline');
      if (hl) hl.textContent = btn.dataset.headline || '';
      if (sl) sl.textContent = btn.dataset.subline || '';
    }
  }

  document.querySelectorAll('[data-role]').forEach(function (btn) {
    btn.addEventListener('click', function () { switchRole(btn.dataset.role); });
  });

  switchRole('all');
  var pill = document.getElementById('status-pill');
  if (pill) pill.classList.remove('hidden');
  var dot = document.getElementById('status-dot');
  if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-green-300';
  var txt = document.getElementById('status-text');
  if (txt) txt.textContent = '静态编译版';
}());
