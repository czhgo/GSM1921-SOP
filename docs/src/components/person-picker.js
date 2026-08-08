// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  person-picker.js — 通用人员选择组件
//  功能：点击触发按钮弹出选择面板，支持搜索/筛选/单选/多选
//  数据源：从 ../mock/people.js 导入 PEOPLE
//  用途：赋权管理、考察记录、专班成员选择等所有涉及写入人名的场景
//  样式：提取至 person-picker.css，主题色通过 CSS 变量 --pp-* 注入
// ════════════════════════════════════════════════════════════════

import { PEOPLE, getPersonById } from '../mock/index.js?v=20260808j';
import { icon } from '../core/icons.js?v=20260808j';
import { ROLE_LABELS, ACCENT_COLORS } from '../core/constants.js?v=20260808j';

// ── 辅助：从 hex 生成 rgba 字符串 ──────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── 辅助：简易加深 hex（每通道减 30） ──────────────────────────
function darkenHex(hex) {
  return '#' + [1, 3, 5].map(i =>
    Math.max(0, parseInt(hex.slice(i, i + 2), 16) - 30).toString(16).padStart(2, '0')
  ).join('');
}

// ── 党小组列表（从数据中动态提取） ──────────────────────────────
const PARTY_GROUPS = [...new Set(PEOPLE.map(p => p.partyGroup))];

// ── 发展阶段标签映射 ───────────────────────────────────────────
const STAGE_LABELS = {
  '正式党员': '正式',
  '预备党员': '预备',
  '发展对象': '发展',
  '积极分子': '积极',
};

// ── 发展阶段颜色映射 ───────────────────────────────────────────
const STAGE_COLORS = {
  '正式党员': { bg: 'rgba(206,17,38,0.08)', text: '#991B1B', border: 'rgba(206,17,38,0.20)' },
  '预备党员': { bg: 'rgba(59,130,246,0.08)', text: '#1D4ED8', border: 'rgba(59,130,246,0.20)' },
  '发展对象': { bg: 'rgba(245,158,11,0.08)', text: '#B45309', border: 'rgba(245,158,11,0.20)' },
  '积极分子': { bg: 'rgba(16,185,129,0.08)', text: '#047857', border: 'rgba(16,185,129,0.20)' },
};

// ════════════════════════════════════════════════════════════════
//  PersonPicker 类
// ════════════════════════════════════════════════════════════════

export class PersonPicker {
  /**
   * @param {Object} options
   * @param {'single'|'multi'}  options.mode       - 选择模式：单选/多选
   * @param {string}            options.placeholder - 触发按钮占位文字
   * @param {Function}          [options.filter]    - 人员筛选函数 (person) => boolean
   * @param {Function}          [options.onSelect]  - 选中回调 (personIds: string[]) => void
   * @param {string[]}          [options.initialIds]- 初始选中的人员 ID 列表
   * @param {string}            [options.accentColor] - 主题色 hex，默认 '#CE1126'
   */
  constructor(options = {}) {
    this._mode = options.mode || 'single';
    this._placeholder = options.placeholder || '选择人员';
    this._filter = options.filter || null;
    this._onSelect = options.onSelect || null;
    this._selected = new Set(options.initialIds || []);
    this._searchQuery = '';
    this._activeGroup = '全部';
    this._panelOpen = false;
    this._accent = options.accentColor || '#CE1126';

    // 预计算主题色 CSS 变量（注入到 wrapper 上，供 person-picker.css 使用）
    this._cssVars = {
      '--pp-accent': this._accent,
      '--pp-accent-06': hexToRgba(this._accent, 0.06),
      '--pp-accent-10': hexToRgba(this._accent, 0.10),
      '--pp-accent-12': hexToRgba(this._accent, 0.12),
      '--pp-accent-20': hexToRgba(this._accent, 0.20),
      '--pp-accent-25': hexToRgba(this._accent, 0.25),
      '--pp-accent-darker': darkenHex(this._accent),
    };

    // DOM 引用
    this._container = null;
    this._triggerBtn = null;
    this._panelEl = null;
    this._overlayEl = null;

    // 过滤后的人员列表（缓存）
    this._filteredPeople = this._applyFilter(PEOPLE);

    // 事件监听器引用（用于清理）
    this._boundDocClick = null;
    this._boundEscKey = null;
  }

  // ── 辅助：在元素上注入主题色 CSS 变量 ──────────────────────────
  _applyCssVars(el) {
    Object.entries(this._cssVars).forEach(([key, value]) => {
      el.style.setProperty(key, value);
    });
  }

  // ── 过滤逻辑 ────────────────────────────────────────────────

  _applyFilter(people) {
    return this._filter ? people.filter(this._filter) : [...people];
  }

  _getVisiblePeople() {
    let list = this._filteredPeople;
    // 党小组筛选
    if (this._activeGroup !== '全部') {
      list = list.filter(p => p.partyGroup === this._activeGroup);
    }
    // 搜索
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q)
      );
    }
    return list;
  }

  // ── 渲染入口 ────────────────────────────────────────────────

  /**
   * 将组件渲染到指定容器
   * @param {HTMLElement} container - 容器元素
   */
  render(container) {
    if (!container) return;
    this._container = container;
    this._renderTrigger();
  }

  // ── 触发按钮 ────────────────────────────────────────────────

  _renderTrigger() {
    if (!this._container) return;

    const selectedNames = this._getSelectedNames();
    const hasSelection = this._selected.size > 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'person-picker-wrapper';
    this._applyCssVars(wrapper);

    // 触发按钮
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'person-picker-trigger ';
    btn.setAttribute('aria-expanded', 'false');

    if (hasSelection) {
      if (this._mode === 'multi') {
        btn.innerHTML = `
          <span class="person-picker-trigger-name">${selectedNames}</span>
          <span class="person-picker-trigger-badge">${this._selected.size}</span>
        `;
      } else {
        btn.innerHTML = `<span class="person-picker-trigger-name">${selectedNames}</span>`;
      }
    } else {
      btn.innerHTML = `<span class="person-picker-trigger-placeholder">${this._placeholder}</span>`;
    }

    // 下拉箭头
    const arrow = document.createElement('span');
    arrow.className = 'person-picker-arrow';
    arrow.innerHTML = icon('chevronDown', { className: 'w-3.5 h-3.5', extra: ' aria-hidden="true"' });
    btn.appendChild(arrow);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._togglePanel();
    });

    this._triggerBtn = btn;
    wrapper.appendChild(btn);
    this._container.innerHTML = '';
    this._container.appendChild(wrapper);
  }

  // ── 面板开关 ────────────────────────────────────────────────

  _togglePanel() {
    if (this._panelOpen) {
      this._closePanel();
    } else {
      this._openPanel();
    }
  }

  _openPanel() {
    if (this._panelOpen) return;
    this._panelOpen = true;
    this._triggerBtn?.setAttribute('aria-expanded', 'true');

    // 更新触发按钮样式（通过类名切换，CSS 控制具体样式）
    if (this._triggerBtn) {
      this._triggerBtn.classList.add('open');
      const arrow = this._triggerBtn.querySelector('.person-picker-arrow');
      if (arrow) arrow.classList.add('open');
    }

    this._createPanel();
    this._bindGlobalEvents();
  }

  _closePanel() {
    if (!this._panelOpen) return;
    this._panelOpen = false;
    this._triggerBtn?.setAttribute('aria-expanded', 'false');

    // 恢复触发按钮样式
    if (this._triggerBtn) {
      this._triggerBtn.classList.remove('open');
      const arrow = this._triggerBtn.querySelector('.person-picker-arrow');
      if (arrow) arrow.classList.remove('open');
    }

    // 移除遮罩与面板（二者现为 body 同级节点，需分别移除）
    if (this._overlayEl) {
      this._overlayEl.remove();
      this._overlayEl = null;
    }
    if (this._panelEl) {
      this._panelEl.remove();
    }
    this._panelEl = null;

    // 解绑全局事件
    this._unbindGlobalEvents();

    // 关闭后归还焦点到触发按钮（rAF 保证重建 DOM 后执行）
    requestAnimationFrame(() => this._triggerBtn?.focus());
  }

  // ── 面板创建 ────────────────────────────────────────────────

  _createPanel() {
    // 遮罩层（纯视觉 backdrop，无语义内容：点击空白关闭）
    const overlay = document.createElement('div');
    overlay.className = 'person-picker-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closePanel();
    });
    this._overlayEl = overlay;

    // 面板主体（dialog 语义 + modal 焦点管理）
    const panel = document.createElement('div');
    panel.className = 'person-picker-panel card rounded-2xl shadow-xl';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '选择人员');

    // 定位面板（在触发按钮下方）
    this._positionPanel(panel);

    // ── 面板头部 ──
    const header = document.createElement('div');
    header.className = 'person-picker-header';
    header.innerHTML = `
      <div class="person-picker-header-row">
        <h4 class="person-picker-title ">选择人员</h4>
        <button type="button" class="person-picker-close-btn" aria-label="关闭">
          ${icon('close', { stroke: '#6B7280', className: 'w-3.5 h-3.5', extra: ' aria-hidden="true"' })}
        </button>
      </div>
      <input type="text" class="person-picker-search " placeholder="搜索姓名或学号…" aria-label="搜索人员" />
    `;
    panel.appendChild(header);

    // 关闭按钮事件
    header.querySelector('.person-picker-close-btn').addEventListener('click', () => this._closePanel());

    // 搜索框事件
    const searchInput = header.querySelector('.person-picker-search');
    searchInput.addEventListener('input', (e) => {
      this._searchQuery = e.target.value.trim();
      this._renderList();
    });

    // ── 党小组筛选 Tab ──
    const tabBar = document.createElement('div');
    tabBar.className = 'person-picker-tabs';

    const groups = ['全部', ...PARTY_GROUPS];
    groups.forEach(group => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'person-picker-tab ';
      tab.textContent = group === '全部' ? '全部' : group.replace('党小组', '');
      tab.dataset.group = group;

      if (group === this._activeGroup) {
        tab.classList.add('active');
      }

      tab.addEventListener('click', () => {
        this._activeGroup = group;
        // 更新 tab 激活状态（类名切换，CSS 控制具体样式）
        tabBar.querySelectorAll('.person-picker-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.group === this._activeGroup);
        });
        this._renderList();
      });

      tabBar.appendChild(tab);
    });
    panel.appendChild(tabBar);

    // ── 人员列表 ──
    const listContainer = document.createElement('div');
    listContainer.className = 'person-picker-list';
    panel.appendChild(listContainer);

    // ── 底部操作栏（多选模式） ──
    if (this._mode === 'multi') {
      const footer = document.createElement('div');
      footer.className = 'person-picker-footer';

      const countSpan = document.createElement('span');
      countSpan.className = 'person-picker-count ';
      countSpan.textContent = `已选 ${this._selected.size} 人`;
      footer.appendChild(countSpan);

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'person-picker-confirm ';
      confirmBtn.textContent = '确认选择';
      confirmBtn.addEventListener('click', () => {
        this._fireOnSelect();
        this._closePanel();
        this._renderTrigger();
      });
      footer.appendChild(confirmBtn);

      panel.appendChild(footer);
    }

    // 组装：overlay 与 panel 均直接挂 body 且为同级节点。
    // 修复（2026-08-06）：panel 曾作为 overlay 子节点，其 z-index 601 只在
    // overlay(600) 的层叠上下文内生效，根层叠下整体仅 600，会被 z-index 更高
    // 的浮层（如 status-badge-popover）压住。同级挂载后 panel 自身 z-index 801
    // 在根层叠上下文生效，确保选人浮窗始终浮在最上端。
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    this._panelEl = panel;

    // 渲染人员列表
    this._renderList();

    // 聚焦搜索框
    requestAnimationFrame(() => searchInput.focus());
  }

  // ── 面板定位 ────────────────────────────────────────────────
  // 修复（2026-08-06）：重写为「永不溢出视口」的确定性定位。
  // 规则：优先放触发按钮下方；下方放不下且上方够时翻到上方；
  // 面板高度按可用空间收敛（下限 160px），宽度收敛到视口内，
  // 保证「确认选择」等底部操作栏始终可见可点。
  _positionPanel(panel) {
    if (!this._triggerBtn) {
      // 无触发按钮时居中
      panel.style.top = '50%';
      panel.style.left = '50%';
      panel.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = this._triggerBtn.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const GAP = 6;
    const MIN_PANEL_H = 160;
    const MAX_PANEL_H = 520;
    const PANEL_W = Math.min(380, viewportW - 16);

    const belowH = viewportH - rect.bottom - GAP;
    const aboveH = rect.top - GAP;
    // 下方放得下（>= 下限）优先下方；否则上方放得下才翻到上方
    const placeBelow = belowH >= MIN_PANEL_H && (aboveH < MIN_PANEL_H || belowH >= aboveH);

    let top, panelH;
    if (placeBelow) {
      top = rect.bottom + GAP;
      panelH = Math.min(MAX_PANEL_H, Math.max(MIN_PANEL_H, belowH));
      panelH = Math.min(panelH, viewportH - top - 8); // 兜底不溢出视口底
    } else {
      panelH = Math.min(MAX_PANEL_H, Math.max(MIN_PANEL_H, aboveH));
      panelH = Math.min(panelH, rect.top - GAP - 8);   // 兜底不遮住触发按钮
      top = Math.max(8, rect.top - GAP - panelH);
    }

    panel.style.width = `${PANEL_W}px`;
    panel.style.maxHeight = `${Math.max(120, panelH)}px`;
    panel.style.top = `${top}px`;
    panel.style.left = `${Math.max(8, Math.min(rect.left, viewportW - PANEL_W - 8))}px`;
  }

  // ── 人员列表渲染 ────────────────────────────────────────────

  _renderList() {
    const listEl = this._panelEl?.querySelector('.person-picker-list');
    if (!listEl) return;

    const people = this._getVisiblePeople();

    if (people.length === 0) {
      listEl.innerHTML = `
        <div class="person-picker-empty ">
          ${this._searchQuery ? '未找到匹配的人员' : '暂无可选人员'}
        </div>
      `;
      return;
    }

    listEl.innerHTML = people.map(person => {
      const isSelected = this._selected.has(person.id);
      const stageColor = STAGE_COLORS[person.developStage] || STAGE_COLORS['正式党员'];
      const stageLabel = STAGE_LABELS[person.developStage] || person.developStage;
      const roleLabel = person.role ? (ROLE_LABELS[person.role] || person.role) : '';

      return `
        <button type="button" class="person-picker-item ${isSelected ? 'selected' : ''}"
             data-person-id="${person.id}"
             aria-pressed="${isSelected}">
          <span class="person-picker-item-avatar" aria-hidden="true">
            ${person.name.charAt(0)}
          </span>
          <span class="person-picker-item-info">
            <span class="person-picker-item-name-row">
              <span class="person-picker-item-name">${person.name}</span>
              <span class="person-picker-item-stage" style="background:${stageColor.bg};color:${stageColor.text};border:1px solid ${stageColor.border};">${stageLabel}</span>
            </span>
            <span class="person-picker-item-meta">
              <span class="person-picker-item-meta-text">${person.studentId}</span>
              <span class="person-picker-item-meta-text">${person.partyGroup.replace('党小组', '')}</span>
              ${roleLabel ? `<span class="person-picker-item-role">${roleLabel}</span>` : ''}
            </span>
          </span>
          ${isSelected ? icon('check', { strokeWidth: 2.5, stroke: this._accent, className: 'w-4 h-4 person-picker-check', extra: ' aria-hidden="true"' }) : ''}
        </button>
      `;
    }).join('');

    // 绑定点击事件
    listEl.querySelectorAll('.person-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const personId = item.dataset.personId;
        this._handleSelect(personId);
      });
    });
  }

  // ── 选中逻辑 ────────────────────────────────────────────────

  _handleSelect(personId) {
    if (this._mode === 'single') {
      // 单选：切换选中，立即回调并关闭
      if (this._selected.has(personId)) {
        this._selected.delete(personId);
      } else {
        this._selected.clear();
        this._selected.add(personId);
      }
      this._fireOnSelect();
      this._closePanel();
      this._renderTrigger();
    } else {
      // 多选：切换选中，刷新列表
      if (this._selected.has(personId)) {
        this._selected.delete(personId);
      } else {
        this._selected.add(personId);
      }
      this._renderList();
      this._updateFooterCount();
      // 多选模式下也实时更新触发按钮
      this._renderTrigger();
    }
  }

  _updateFooterCount() {
    const countEl = this._panelEl?.querySelector('.person-picker-count');
    if (countEl) {
      countEl.textContent = `已选 ${this._selected.size} 人`;
    }
  }

  // ── 回调触发 ────────────────────────────────────────────────

  _fireOnSelect() {
    if (this._onSelect) {
      this._onSelect([...this._selected]);
    }
  }

  // ── 全局事件 ────────────────────────────────────────────────

  _bindGlobalEvents() {
    this._boundEscKey = (e) => {
      if (e.key === 'Escape') this._closePanel();
    };
    document.addEventListener('keydown', this._boundEscKey);
  }

  _unbindGlobalEvents() {
    if (this._boundEscKey) {
      document.removeEventListener('keydown', this._boundEscKey);
      this._boundEscKey = null;
    }
  }

  // ── 公开 API ────────────────────────────────────────────────

  /**
   * 获取当前选中的人员 ID 列表
   * @returns {string[]}
   */
  getSelected() {
    return [...this._selected];
  }

  /**
   * 获取当前选中人员的姓名列表
   * @returns {string[]}
   */
  getSelectedNames() {
    return this._getSelectedNames().split('、').filter(Boolean);
  }

  /**
   * 设置选中的人员 ID 列表
   * @param {string[]} ids
   */
  setSelected(ids) {
    this._selected = new Set(ids);
    this._renderTrigger();
  }

  /**
   * 清空选中
   */
  clearSelection() {
    this._selected.clear();
    this._renderTrigger();
  }

  /**
   * 销毁组件，清理 DOM 和事件
   */
  destroy() {
    this._closePanel();
    if (this._container) {
      this._container.innerHTML = '';
    }
    this._container = null;
    this._triggerBtn = null;
  }

  // ── 内部辅助 ────────────────────────────────────────────────

  _getSelectedNames() {
    return [...this._selected]
      .map(id => {
        const person = getPersonById(id);
        return person ? person.name : '';
      })
      .filter(Boolean)
      .join('、');
  }
}
