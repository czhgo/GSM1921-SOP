// ════════════════════════════════════════════════════════════════
//  光华管理学院本科生党支部 SOP 引擎 — app.js
//  v4.0 · Gov-Grade Vanilla JS 状态机 · 2026-03-02
//  Architecture: SSOT store + setState + renderViews
//  Constraint: 严禁在事件回调中直接操作 element.style.*
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Transition duration (must match CSS 'transition: all 300ms ...' + small buffer)
  var TRANSITION_DURATION = 320;

  // ── 全局唯一真相源 (SSOT) ──────────────────────────────────────
  var store = {
    state: { role: 'all', domain: 'activity' },
    _listeners: [],
    setState: function (newState) {
      Object.assign(this.state, newState);
      this._listeners.forEach(function (fn) { fn(); });
    },
    subscribe: function (fn) { this._listeners.push(fn); }
  };

  // ── 动画工具：进入 / 离开 ─────────────────────────────────────
  function enterCard(card) {
    clearTimeout(card._leaveTimer);
    card.classList.remove('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.classList.remove('opacity-0', 'translate-y-4');
        card.classList.add('opacity-100', 'translate-y-0');
      });
    });
  }

  function leaveCard(card) {
    card.classList.remove('opacity-100', 'translate-y-0');
    card.classList.add('opacity-0', 'translate-y-4');
    clearTimeout(card._leaveTimer);
    card._leaveTimer = setTimeout(function () {
      card.classList.add('hidden');
    }, TRANSITION_DURATION);
  }

  // ── 响应式渲染流 ──────────────────────────────────────────────
  function renderViews() {
    var role = store.state.role;

    // 1. 角色按钮激活态
    document.querySelectorAll('.role-btn[data-role]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.role === role);
    });

    // 2. 标题区更新
    var activeBtn = document.querySelector('.role-btn[data-role="' + role + '"]');
    if (activeBtn) {
      var hl = document.getElementById('role-headline');
      var sl = document.getElementById('role-subline');
      if (hl) hl.textContent = activeBtn.dataset.headline || '';
      if (sl) sl.textContent = activeBtn.dataset.subline || '';
    }

    // 3. 遍历所有 data-role 卡片，应用进入 / 离开动画
    document.querySelectorAll('.scene-card[data-role]').forEach(function (card) {
      if (card.dataset.role === role) {
        enterCard(card);
      } else {
        leaveCard(card);
      }
    });
  }

  // ── 交互劫持：Tab 点击 → store.setState() ────────────────────
  document.querySelectorAll('.role-btn[data-role]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      store.setState({ role: btn.dataset.role });
    });
  });

  // ── 状态机初始化 ──────────────────────────────────────────────
  store.subscribe(renderViews);

  // 所有卡片设为 hidden + opacity-0（初始不可见）
  document.querySelectorAll('.scene-card[data-role]').forEach(function (card) {
    card.classList.add('hidden', 'opacity-0', 'translate-y-4');
  });

  // 第一次渲染 → 展示 role=all 的卡片
  store.setState({ role: 'all' });

  // 状态 Pill
  var pill = document.getElementById('status-pill');
  if (pill) pill.classList.remove('hidden');
  var dot = document.getElementById('status-dot');
  if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-green-300';
  var txt = document.getElementById('status-text');
  if (txt) txt.textContent = '状态机 v4.0';
}());
