// role: [人机]
// ════════════════════════════════════════════════════════════════
//  person-picker.js — 通用人员选择组件
//  功能：点击触发按钮弹出选择面板，支持搜索/筛选/单选/多选
//  数据源：从 ../mock/people.js 导入 PEOPLE
//  用途：赋权管理、考察记录、专班成员选择等所有涉及写入人名的场景
// ════════════════════════════════════════════════════════════════

import { PEOPLE } from '../mock/index.js';
import { ROLE_LABELS, ACCENT_COLORS } from '../core/constants.js';

// ── 辅助：从 hex 生成 rgba 字符串 ──────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    // 触发按钮
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'person-picker-trigger font-stheiti';
    btn.style.cssText = [
      'display:inline-flex;align-items:center;gap:8px;',
      'padding:8px 14px;border-radius:10px;',
      'border:1.5px solid #E5E7EB;background:white;',
      'cursor:pointer;transition:all 0.15s;',
      'font-size:0.8125rem;color:#374151;',
      'min-width:120px;max-width:320px;',
    ].join('');

    if (hasSelection) {
      if (this._mode === 'multi') {
        btn.innerHTML = `
          <span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${selectedNames}</span>
          <span style="background:${this._accent};color:white;font-size:10px;min-width:18px;height:18px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;font-weight:600;">${this._selected.size}</span>
        `;
      } else {
        btn.innerHTML = `<span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${selectedNames}</span>`;
      }
    } else {
      btn.innerHTML = `<span style="flex:1;text-align:left;color:#9CA3AF;">${this._placeholder}</span>`;
    }

    // 下拉箭头
    const arrow = document.createElement('span');
    arrow.style.cssText = 'flex-shrink:0;color:#9CA3AF;transition:transform 0.2s;';
    arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    btn.appendChild(arrow);

    // hover 效果
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = this._accent;
      btn.style.boxShadow = `0 2px 8px ${hexToRgba(this._accent, 0.10)}`;
    });
    btn.addEventListener('mouseleave', () => {
      if (!this._panelOpen) {
        btn.style.borderColor = '#E5E7EB';
        btn.style.boxShadow = 'none';
      }
    });

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

    // 更新触发按钮样式
    if (this._triggerBtn) {
      this._triggerBtn.style.borderColor = this._accent;
      this._triggerBtn.style.boxShadow = `0 2px 8px ${hexToRgba(this._accent, 0.10)}`;
      // 箭头旋转
      const arrowSvg = this._triggerBtn.querySelector('svg');
      if (arrowSvg) arrowSvg.style.transform = 'rotate(180deg)';
    }

    this._createPanel();
    this._bindGlobalEvents();
  }

  _closePanel() {
    if (!this._panelOpen) return;
    this._panelOpen = false;

    // 恢复触发按钮样式
    if (this._triggerBtn) {
      this._triggerBtn.style.borderColor = '#E5E7EB';
      this._triggerBtn.style.boxShadow = 'none';
      const arrowSvg = this._triggerBtn.querySelector('svg');
      if (arrowSvg) arrowSvg.style.transform = 'rotate(0deg)';
    }

    // 移除面板
    if (this._overlayEl) {
      this._overlayEl.remove();
      this._overlayEl = null;
    }
    this._panelEl = null;

    // 解绑全局事件
    this._unbindGlobalEvents();
  }

  // ── 面板创建 ────────────────────────────────────────────────

  _createPanel() {
    const _accent = this._accent;
    // 简易加深：将 hex 每个通道减 30
    const _darkerAccent = '#' + [1,3,5].map(i => Math.max(0, parseInt(_accent.slice(i, i+2), 16) - 30).toString(16).padStart(2, '0')).join('');

    // 遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'person-picker-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.3);backdrop-filter:blur(2px);';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closePanel();
    });
    this._overlayEl = overlay;

    // 面板主体
    const panel = document.createElement('div');
    panel.className = 'person-picker-panel card rounded-2xl shadow-xl';
    panel.style.cssText = [
      'position:fixed;z-index:301;',
      'background:white;border-radius:16px;',
      'box-shadow:0 20px 60px rgba(0,0,0,0.15);',
      'width:380px;max-width:calc(100vw - 32px);max-height:520px;',
      'display:flex;flex-direction:column;overflow:hidden;',
    ].join('');

    // 定位面板（在触发按钮下方）
    this._positionPanel(panel);

    // ── 面板头部 ──
    const header = document.createElement('div');
    header.style.cssText = 'padding:16px 16px 12px;border-bottom:1px solid #F3F4F6;';
    header.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h4 class="font-stheiti" style="font-size:0.9375rem;font-weight:700;color:#1F2937;margin:0;">选择人员</h4>
        <button type="button" class="person-picker-close-btn" style="width:28px;height:28px;border-radius:8px;border:none;background:#F3F4F6;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <input type="text" class="person-picker-search font-stheiti" placeholder="搜索姓名或学号..."
        style="width:100%;padding:8px 12px 8px 34px;border-radius:10px;border:1.5px solid #E5E7EB;font-size:0.8125rem;outline:none;transition:border-color 0.15s;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239CA3AF%22 stroke-width=%222%22><circle cx=%2211%22 cy=%2211%22 r=%228%22/><line x1=%2221%22 y1=%2221%22 x2=%2216.65%22 y2=%2216.65%22/></svg>') no-repeat 10px center;background-color:white;box-sizing:border-box;" />
    `;
    panel.appendChild(header);

    // 关闭按钮事件
    header.querySelector('.person-picker-close-btn').addEventListener('click', () => this._closePanel());
    header.querySelector('.person-picker-close-btn').addEventListener('mouseenter', function() { this.style.background = '#E5E7EB'; });
    header.querySelector('.person-picker-close-btn').addEventListener('mouseleave', function() { this.style.background = '#F3F4F6'; });

    // 搜索框事件
    const searchInput = header.querySelector('.person-picker-search');
    searchInput.addEventListener('input', (e) => {
      this._searchQuery = e.target.value.trim();
      this._renderList();
    });
    searchInput.addEventListener('focus', () => { searchInput.style.borderColor = this._accent; });
    searchInput.addEventListener('blur', function() { this.style.borderColor = '#E5E7EB'; });

    // ── 党小组筛选 Tab ──
    const tabBar = document.createElement('div');
    tabBar.className = 'person-picker-tabs';
    tabBar.style.cssText = 'display:flex;gap:4px;padding:10px 16px 6px;overflow-x:auto;flex-shrink:0;';

    const groups = ['全部', ...PARTY_GROUPS];
    groups.forEach(group => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'person-picker-tab font-stheiti';
      tab.textContent = group === '全部' ? '全部' : group.replace('党小组', '');
      tab.dataset.group = group;

      const isActive = group === this._activeGroup;
      tab.style.cssText = [
        'padding:4px 12px;border-radius:8px;font-size:0.75rem;',
        'border:1px solid transparent;cursor:pointer;',
        'transition:all 0.15s;white-space:nowrap;',
        isActive
          ? `background:${hexToRgba(_accent, 0.10)};color:${_darkerAccent};border-color:${hexToRgba(_accent, 0.25)};font-weight:600;`
          : 'background:#F9FAFB;color:#6B7280;border-color:#E5E7EB;',
      ].join('');

      tab.addEventListener('click', () => {
        this._activeGroup = group;
        // 更新 tab 样式
        tabBar.querySelectorAll('.person-picker-tab').forEach(t => {
          const active = t.dataset.group === this._activeGroup;
          t.style.cssText = [
            'padding:4px 12px;border-radius:8px;font-size:0.75rem;',
            'border:1px solid transparent;cursor:pointer;',
            'transition:all 0.15s;white-space:nowrap;',
            active
              ? 'background:rgba(206,17,38,0.10);color:#991B1B;border-color:rgba(206,17,38,0.25);font-weight:600;'
              : 'background:#F9FAFB;color:#6B7280;border-color:#E5E7EB;',
          ].join('');
        });
        this._renderList();
      });

      tabBar.appendChild(tab);
    });
    panel.appendChild(tabBar);

    // ── 人员列表 ──
    const listContainer = document.createElement('div');
    listContainer.className = 'person-picker-list';
    listContainer.style.cssText = 'flex:1;overflow-y:auto;padding:4px 8px 8px;min-height:0;';
    panel.appendChild(listContainer);

    // ── 底部操作栏（多选模式） ──
    if (this._mode === 'multi') {
      const footer = document.createElement('div');
      footer.className = 'person-picker-footer';
      footer.style.cssText = 'padding:10px 16px;border-top:1px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';

      const countSpan = document.createElement('span');
      countSpan.className = 'person-picker-count font-stheiti';
      countSpan.style.cssText = 'font-size:0.75rem;color:#6B7280;';
      countSpan.textContent = `已选 ${this._selected.size} 人`;
      footer.appendChild(countSpan);

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'person-picker-confirm font-stheiti';
      confirmBtn.textContent = '确认选择';
      confirmBtn.style.cssText = [
        'padding:6px 16px;border-radius:10px;border:none;',
        `background:${this._accent};color:white;font-size:0.8125rem;font-weight:600;`,
        'cursor:pointer;transition:background 0.15s;',
      ].join('');
      confirmBtn.addEventListener('mouseenter', function() { this.style.background = _darkerAccent; });
      confirmBtn.addEventListener('mouseleave', function() { this.style.background = _accent; });
      confirmBtn.addEventListener('click', () => {
        this._fireOnSelect();
        this._closePanel();
        this._renderTrigger();
      });
      footer.appendChild(confirmBtn);

      panel.appendChild(footer);
    }

    // 组装
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this._panelEl = panel;

    // 渲染人员列表
    this._renderList();

    // 聚焦搜索框
    requestAnimationFrame(() => searchInput.focus());
  }

  // ── 面板定位 ────────────────────────────────────────────────

  _positionPanel(panel) {
    if (!this._triggerBtn) {
      // 无触发按钮时居中
      panel.style.top = '50%';
      panel.style.left = '50%';
      panel.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = this._triggerBtn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    // 优先在下方显示，空间不足时在上方
    if (spaceBelow >= 400 || spaceBelow >= spaceAbove) {
      panel.style.top = `${rect.bottom + 6}px`;
    } else {
      panel.style.bottom = `${viewportH - rect.top + 6}px`;
    }
    panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 396))}px`;
  }

  // ── 人员列表渲染 ────────────────────────────────────────────

  _renderList() {
    const listEl = this._panelEl?.querySelector('.person-picker-list');
    if (!listEl) return;

    const people = this._getVisiblePeople();

    if (people.length === 0) {
      listEl.innerHTML = `
        <div class="font-stheiti" style="text-align:center;padding:32px 16px;color:#9CA3AF;font-size:0.8125rem;">
          ${this._searchQuery ? '未找到匹配的人员' : '暂无可选人员'}
        </div>
      `;
      return;
    }

    listEl.innerHTML = people.map(person => {
      const isSelected = this._selected.has(person.id);
      const stageColor = STAGE_COLORS[person.developStage] || STAGE_COLORS['正式党员'];
      const stageLabel = STAGE_LABELS[person.developStage] || person.developStage;
      const roleLabel = person.roles.length > 0
        ? person.roles.map(r => ROLE_LABELS[r] || r).join('、')
        : '';

      return `
        <div class="person-picker-item font-stheiti ${isSelected ? 'selected' : ''}"
             data-person-id="${person.id}"
             style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:all 0.12s;border:1.5px solid transparent;${isSelected ? `background:${hexToRgba(this._accent, 0.06)};border-color:${hexToRgba(this._accent, 0.20)};` : ''}">
          <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${isSelected ? hexToRgba(this._accent, 0.12) : '#F3F4F6'};color:${isSelected ? this._accent : '#6B7280'};font-size:0.75rem;font-weight:600;">
            ${person.name.charAt(0)}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:0.8125rem;font-weight:600;color:#1F2937;">${person.name}</span>
              <span style="font-size:0.625rem;padding:1px 6px;border-radius:4px;background:${stageColor.bg};color:${stageColor.text};border:1px solid ${stageColor.border};">${stageLabel}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span style="font-size:0.6875rem;color:#9CA3AF;">${person.studentId}</span>
              <span style="font-size:0.6875rem;color:#9CA3AF;">${person.partyGroup.replace('党小组', '')}</span>
              ${roleLabel ? `<span style="font-size:0.625rem;color:#6B7280;">${roleLabel}</span>` : ''}
            </div>
          </div>
          ${isSelected ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${this._accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
      `;
    }).join('');

    // 绑定点击事件
    listEl.querySelectorAll('.person-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const personId = item.dataset.personId;
        this._handleSelect(personId);
      });
      // hover 效果
      item.addEventListener('mouseenter', function() {
        if (!this.classList.contains('selected')) {
          this.style.background = '#F9FAFB';
        }
      });
      item.addEventListener('mouseleave', function() {
        if (!this.classList.contains('selected')) {
          this.style.background = '';
        }
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
        const person = PEOPLE.find(p => p.id === id);
        return person ? person.name : '';
      })
      .filter(Boolean)
      .join('、');
  }
}
