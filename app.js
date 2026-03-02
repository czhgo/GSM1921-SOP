// ════════════════════════════════════════════════════════════════
//  光华管理学院本科生党支部 SOP 引擎 — app.js
//  v5.0 · Domain Router + Timeline WWH State Machine · 2026-03-02
//  Architecture: SSOT {domain,role} + renderViews + expand/collapse
//  Constraint: 严禁在事件回调中直接操作 element.style.*
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var TRANSITION_DURATION = 320;

  // ── 全局唯一真相源 (SSOT) ──────────────────────────────────────
  var store = {
    state: { domain: 'activity', role: 'all' },
    _listeners: [],
    setState: function (newState) {
      Object.assign(this.state, newState);
      this._listeners.forEach(function (fn) { fn(); });
    },
    subscribe: function (fn) { this._listeners.push(fn); }
  };

  // ── 动画工具：进入 / 离开 ─────────────────────────────────────
  function enterEl(el) {
    clearTimeout(el._leaveTimer);
    el.classList.remove('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.remove('opacity-0', 'translate-y-4');
        el.classList.add('opacity-100', 'translate-y-0');
      });
    });
  }

  function leaveEl(el) {
    el.classList.remove('opacity-100', 'translate-y-0');
    el.classList.add('opacity-0', 'translate-y-4');
    clearTimeout(el._leaveTimer);
    el._leaveTimer = setTimeout(function () {
      el.classList.add('hidden');
    }, TRANSITION_DURATION);
  }

  // ── 响应式渲染流 ──────────────────────────────────────────────
  function renderViews() {
    var domain = store.state.domain;
    var role   = store.state.role;

    // 1. 顶层领域按钮激活态
    document.querySelectorAll('.domain-btn[data-domain]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.domain === domain);
    });

    // 2. 角色按钮激活态
    document.querySelectorAll('.role-btn[data-role]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.role === role);
    });

    // 3. 标题区更新
    var activeRoleBtn = document.querySelector('.role-btn[data-role="' + role + '"]');
    if (activeRoleBtn) {
      var hl = document.getElementById('role-headline');
      var sl = document.getElementById('role-subline');
      if (hl) hl.textContent = activeRoleBtn.dataset.headline || '';
      if (sl) sl.textContent = activeRoleBtn.dataset.subline || '';
    }

    // 4. 场景标题行 — 仅按 domain 过滤
    document.querySelectorAll('.scenario-header[data-domain]').forEach(function (hdr) {
      if (hdr.dataset.domain === domain) {
        enterEl(hdr);
      } else {
        leaveEl(hdr);
      }
    });

    // 5. 时间轴节点 — 按 domain + role 过滤
    document.querySelectorAll('.timeline-node[data-domain]').forEach(function (node) {
      var domainMatch = node.dataset.domain === domain;
      var nodeRole    = node.dataset.role || 'all';
      var roleMatch   = role === 'all' || nodeRole === role || nodeRole === 'all';

      if (domainMatch && roleMatch) {
        enterEl(node);
      } else {
        leaveEl(node);
      }
    });
  }

  // ── 交互劫持：领域按钮 → store.setState() ────────────────────
  document.querySelectorAll('.domain-btn[data-domain]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      store.setState({ domain: btn.dataset.domain });
    });
  });

  // ── 交互劫持：角色按钮 → store.setState() ────────────────────
  document.querySelectorAll('.role-btn[data-role]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      store.setState({ role: btn.dataset.role });
    });
  });

  // ── 展开/折叠 (expand/collapse) ──────────────────────────────
  document.querySelectorAll('.js-expand-trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var card    = trigger.closest('.tl-card');
      if (!card) return;
      var target  = card.querySelector('.js-expand-target');
      var chevron = trigger.querySelector('.wwh-chevron');
      if (!target) return;

      var isExpanded = target.classList.contains('expanded');
      if (isExpanded) {
        target.classList.remove('expanded');
        if (chevron) chevron.classList.remove('rotated');
      } else {
        target.classList.add('expanded');
        if (chevron) chevron.classList.add('rotated');
      }
    });
  });

  // ── 状态机初始化 ──────────────────────────────────────────────
  store.subscribe(renderViews);

  // 所有节点和场景头初始隐藏
  document.querySelectorAll('.timeline-node[data-domain], .scenario-header[data-domain]').forEach(function (el) {
    el.classList.add('hidden', 'opacity-0', 'translate-y-4');
  });

  // 触发首次渲染 — domain=activity, role=all
  store.setState({ domain: 'activity', role: 'all' });

  // 状态 Pill 更新
  var pill = document.getElementById('status-pill');
  if (pill) pill.classList.remove('hidden');
  var dot  = document.getElementById('status-dot');
  if (dot)  dot.className = 'w-1.5 h-1.5 rounded-full bg-green-300';
  var txt  = document.getElementById('status-text');
  if (txt)  txt.textContent = '状态机 v5.0';
}());
