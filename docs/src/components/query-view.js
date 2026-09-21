/**
 * QueryView — 可复用查询视图组件
 * 提供搜索 + 筛选 + 结果列表的标准化查询界面
 * 遵循 D-205 查询视图原则：长期积累数据必须配备查询视图
 *
 * 用法：
 *   import { renderQueryView } from '../components/query-view.js';
 *   renderQueryView(container, {
 *     searchPlaceholder: '搜索活动名称...',
 *     filters: [{ key: 'type', label: '类型', options: [...] }],
 *     data: activities,
 *     renderRow: (item) => `<div>...</div>`,
 *     emptyMessage: '无匹配结果',
 *   });
 */

// 翻页控件单一源（批次 38：全站手写翻页一律并轨 pagerHtml）
import { pagerHtml } from './pager.js?v=20260921m';

/** 属性/文本转义（子类下拉选项由配置派生，仍统一转义） */
function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 渲染查询视图
 * @param {HTMLElement} container - 挂载容器
 * @param {Object} config
 * @param {string} config.searchPlaceholder - 搜索框占位文字
 * @param {string} [config.searchKey='name'] - 搜索匹配的字段名
 * @param {Array} config.filters - 筛选器配置 [{key, label, options:[{value,label}]}]
 * @param {Array} config.data - 数据数组
 * @param {Function} config.renderRow - 单行渲染函数 (item) => htmlString
 * @param {string} [config.emptyMessage='无匹配结果'] - 空结果提示
 * @param {string} [config.accentColor='#3B82F6'] - 强调色（仅用于内部 accent，不再渲染左侧竖线——外层 card 已提供视觉边界）
 * @param {string} [config.sortKey='date'] - 默认排序字段（组件层强制排序，根治"屡禁不止"正序问题）
 * @param {string} [config.sortDir='desc'] - 默认排序方向：desc 倒序（最新在前）/ asc 正序
 */
export function renderQueryView(container, config) {
  const {
    searchPlaceholder = '搜索...',
    searchKey = 'name',
    filters = [],
    data = [],
    renderRow,
    emptyMessage = '无匹配结果',
    accentColor = '#3B82F6',
    sortKey = 'date',
    sortDir = 'desc',
    pageSize = 10,      // 默认每页条数；传 0/Infinity 表示不分页（2026-08-07）
    pageParam = 'page', // URL query 参数名（多视图共存时传入区分）
    category = null,     // { label, groups: { 父值: [子值...] }, match(item, subValue, catValue) }
    brandChip = null,    // { label } → 布尔开关「只看品牌」
  } = config;

  // 生成唯一 ID
  const uid = 'qv-' + Math.random().toString(36).slice(2, 8);

  // 搜索栏 + 筛选器 HTML（筛选行载体单一源：styles.css::.lf-bar / .lf-kw / .lf-select / .lf-btn；
  // 分面一律下拉，禁 chip —— 2026-09-14 批次 27 支书裁定）
  const filtersHtml = filters.map(f => `
    <select id="${uid}-filter-${f.key}" class="input-flat text-xs lf-select" aria-label="${_esc(f.label)}筛选">
      <option value="">${_esc(f.label)}：全部</option>
      ${f.options.map(o => `<option value="${_esc(o.value)}">${_esc(o.label)}</option>`).join('')}
    </select>
  `).join('');

  // T229：级联大类下拉 + 子类下拉（活动类型体系层级化表达；子类下拉随大类联动重建）
  const categoryHtml = category ? `
    <select id="${uid}-cat" class="input-flat text-xs lf-select">
      <option value="">${category.label}</option>
      ${Object.keys(category.groups).map(g => `<option value="${g}">${g}</option>`).join('')}
    </select>
    <span id="${uid}-sub-host" class="hidden"></span>
  ` : '';
  const brandHtml = brandChip ? `
    <select id="${uid}-brand" class="input-flat text-xs lf-select" aria-label="${_esc(brandChip.label)}筛选">
      <option value="">${_esc(brandChip.label)}：全部</option>
      <option value="1">只看${_esc(brandChip.label)}</option>
    </select>
  ` : '';

  container.innerHTML = `
    <div class="query-view">
      <div class="lf-bar mb-3">
        <input type="text" id="${uid}-search" class="input-flat text-xs lf-kw"
               placeholder="${searchPlaceholder}" />
        ${filtersHtml}
        ${categoryHtml}
        ${brandHtml}
        <button id="${uid}-clear" class="lf-btn">清除</button>
      </div>
      <div id="${uid}-results" class="space-y-1"></div>
      <div id="${uid}-count" class="text-xs text-gray-500 mt-2"></div>
      <div id="${uid}-pager"></div>
    </div>
  `;

  const searchEl = document.getElementById(`${uid}-search`);
  const resultsEl = document.getElementById(`${uid}-results`);
  const countEl = document.getElementById(`${uid}-count`);
  const pagerEl = document.getElementById(`${uid}-pager`);
  const clearEl = document.getElementById(`${uid}-clear`);

  function applyFilters() {
    const query = (searchEl?.value || '').trim().toLowerCase();
    const filterValues = {};
    filters.forEach(f => {
      const el = document.getElementById(`${uid}-filter-${f.key}`);
      if (el) filterValues[f.key] = el.value;
    });

    const filtered = data.filter(item => {
      // 搜索匹配
      if (query) {
        const val = String(item[searchKey] || '').toLowerCase();
        // 也搜索其他文本字段
        const allText = Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase();
        if (!val.includes(query) && !allText.includes(query)) return false;
      }
      // 筛选匹配
      for (const [key, value] of Object.entries(filterValues)) {
        if (value && String(item[key] || '') !== value) return false;
      }
      // T229：级联大类 + 子类（类型体系层级化：大类下拉 → 子类 chips 联动）
      if (activeCategory) {
        if (activeSub) {
          if (!category.match(item, activeSub, activeCategory)) return false;
        } else if (category.match(item, '', activeCategory) === false) {
          return false;
        }
      }
      // T229：品牌 chip（布尔开关）
      if (brandOn && !item.isBrand) return false;
      return true;
    });

    // 组件层强制默认排序（根治"屡禁不止"正序问题）
    filtered.sort((a, b) => {
      const va = String(a[sortKey] || '');
      const vb = String(b[sortKey] || '');
      return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
    });

    // ── 分页（2026-08-07）──
    const total = filtered.length;
    const pages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    let page = pageSize > 0 ? (Number(new URLSearchParams(window.location.search).get(pageParam)) || 1) : 1;
    page = Math.min(Math.max(1, page), pages);
    const paged = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

    if (paged.length === 0) {
      resultsEl.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">${emptyMessage}</p>`;
    } else {
      resultsEl.innerHTML = paged.map(renderRow).join('');
    }
    countEl.textContent = pageSize > 0 && pages > 1
      ? `第 ${page}/${pages} 页 · ${total} / ${data.length} 条`
      : `${total} / ${data.length} 条`;

    // 分页控件（单一源 pagerHtml：共 N 条 · 第 x/y 页 + 上一页/页码/下一页；页数 ≤1 返回空串）
    pagerEl.innerHTML = pagerHtml({ page, pages, total, unit: '条' });
  }

  // 翻页（委托一次：pagerEl 内容由 applyFilters 重绘，绑定不随之丢失；标记由 pagerHtml 单一源产出）
  pagerEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lf-page]');
    if (!btn || btn.disabled) return;
    const p = Number(btn.dataset.lfPage);
    if (!(p >= 1)) return;
    const u = new URL(window.location.href);
    u.searchParams.set(pageParam, String(p));
    window.history.replaceState(null, '', u);
    applyFilters();
  });

  // 筛选/搜索变化 → 页码重置 1（删除 URL page 参数后重渲染）
  function resetPageAndApply() {
    const u = new URL(window.location.href);
    if (u.searchParams.has(pageParam)) {
      u.searchParams.delete(pageParam);
      window.history.replaceState(null, '', u);
    }
    applyFilters();
  }

  // 绑定事件
  searchEl?.addEventListener('input', resetPageAndApply);
  filters.forEach(f => {
    const el = document.getElementById(`${uid}-filter-${f.key}`);
    el?.addEventListener('change', resetPageAndApply);
  });

  // ── T229：级联大类 + 子类下拉 + 品牌下拉（筛选行一律下拉，禁 chip）──
  const catEl = document.getElementById(`${uid}-cat`);
  const subHostEl = document.getElementById(`${uid}-sub-host`);
  let activeCategory = '';
  let activeSub = '';

  /** 子类下拉：随大类联动重建（宿主整段重建 → 全局 MutationObserver 自动重新增强为圆角下拉） */
  function renderSubOptions() {
    if (!catEl || !subHostEl) return;
    const subs = activeCategory ? category.groups[activeCategory] || [] : [];
    if (subs.length === 0) { subHostEl.classList.add('hidden'); subHostEl.innerHTML = ''; return; }
    subHostEl.classList.remove('hidden');
    subHostEl.innerHTML = `<select id="${uid}-sub" class="input-flat text-xs lf-select" aria-label="子类筛选">
      <option value="">子类：全部</option>
      ${subs.map(s => `<option value="${_esc(s)}"${s === activeSub ? ' selected' : ''}>${_esc(s)}</option>`).join('')}
    </select>`;
    document.getElementById(`${uid}-sub`)?.addEventListener('change', (e) => {
      activeSub = e.target.value || '';
      resetPageAndApply();
    });
  }

  catEl?.addEventListener('change', () => {
    activeCategory = catEl.value;
    activeSub = '';
    renderSubOptions();
    resetPageAndApply();
  });
  const brandEl = document.getElementById(`${uid}-brand`);
  let brandOn = false;
  brandEl?.addEventListener('change', () => {
    brandOn = brandEl.value === '1';
    resetPageAndApply();
  });

  clearEl?.addEventListener('click', () => {
    searchEl.value = '';
    filters.forEach(f => {
      const el = document.getElementById(`${uid}-filter-${f.key}`);
      if (el) el.value = '';
    });
    // T229：重置级联与品牌
    activeCategory = ''; activeSub = '';
    if (catEl) catEl.value = '';
    renderSubOptions();
    if (brandEl) { brandOn = false; brandEl.value = ''; }
    resetPageAndApply();
  });

  // 初始渲染
  applyFilters();

  return { uid, applyFilters };
}
