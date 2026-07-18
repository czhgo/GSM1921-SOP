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
  } = config;

  // 生成唯一 ID
  const uid = 'qv-' + Math.random().toString(36).slice(2, 8);

  // 搜索栏 + 筛选器 HTML
  const filtersHtml = filters.map(f => `
    <select id="${uid}-filter-${f.key}" class="input-flat text-xs" style="min-width:80px;">
      <option value="">${f.label}</option>
      ${f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
    </select>
  `).join('');

  container.innerHTML = `
    <div class="query-view">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input type="text" id="${uid}-search" class="input-flat text-xs flex-1 min-w-[160px]"
               placeholder="${searchPlaceholder}" />
        ${filtersHtml}
        <button id="${uid}-clear" class="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">清除</button>
      </div>
      <div id="${uid}-results" class="space-y-1"></div>
      <div id="${uid}-count" class="text-xs text-gray-400 mt-2"></div>
    </div>
  `;

  const searchEl = document.getElementById(`${uid}-search`);
  const resultsEl = document.getElementById(`${uid}-results`);
  const countEl = document.getElementById(`${uid}-count`);
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
      return true;
    });

    if (filtered.length === 0) {
      resultsEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">${emptyMessage}</p>`;
    } else {
      resultsEl.innerHTML = filtered.map(renderRow).join('');
    }
    countEl.textContent = `${filtered.length} / ${data.length} 条`;
  }

  // 绑定事件
  searchEl?.addEventListener('input', applyFilters);
  filters.forEach(f => {
    const el = document.getElementById(`${uid}-filter-${f.key}`);
    el?.addEventListener('change', applyFilters);
  });
  clearEl?.addEventListener('click', () => {
    searchEl.value = '';
    filters.forEach(f => {
      const el = document.getElementById(`${uid}-filter-${f.key}`);
      if (el) el.value = '';
    });
    applyFilters();
  });

  // 初始渲染
  applyFilters();

  return { uid, applyFilters };
}
