// role: [工程师]+[AI]
// filter-bar.js — 检索条配置片段（2026-10-18 立）
//
// 职责：只负责把「关键词 + 分面 + 阈值 + 分页」整理成 renderFilteredList 可直接吃的配置片段，
//   不复制 list-filter 的渲染逻辑，也不另写搜索框 / 下拉 / 计数 / 翻页标记。
// 单一源关系：
//   · 渲染引擎 = components/ui/list-filter.js::renderFilteredList；
//   · 出现阈值 = core/domain/constants.js::SEARCH_FILTER_MIN_ROWS（本件只转出，不造第二源）；
//   · 翻页 = components/ui/pager.js（由引擎内部调用）。
// 采用口径：表格 / 列表行数超过 8 行才出现检索条；小表不加搜索框（§4.20.2 / §4.21）。
import { SEARCH_FILTER_MIN_ROWS } from '../../core/domain/constants.js?v=20261018g';

export { SEARCH_FILTER_MIN_ROWS };

/**
 * 生成 renderFilteredList 的配置片段。
 * @param {Object} o
 * @param {Object} [o.keyword] 关键词配置（{ keys, placeholder, get? }）
 * @param {Array} [o.facets] 分面配置
 * @param {number} [o.minRows] 检索条出现门槛（缺省 SEARCH_FILTER_MIN_ROWS = 8）
 * @param {string} [o.stateKey] 状态保持键
 * @param {number} [o.pageSize] 每页条数（缺省 10；0 = 不分页）
 * @param {string} [o.countUnit] 计数单位
 * @returns {Object} 可直接展开给 renderFilteredList 的配置片段
 */
export function buildFilterBar({
  keyword, facets, minRows = SEARCH_FILTER_MIN_ROWS, stateKey, pageSize = 10, countUnit,
} = {}) {
  // 只写入调用方确实提供的键：undefined 会覆盖 renderFilteredList 的默认值。
  const cfg = { minRows, pageSize };
  if (keyword) cfg.keyword = keyword;
  if (facets) cfg.facets = facets;
  if (stateKey) cfg.stateKey = stateKey;
  if (countUnit) cfg.countUnit = countUnit;
  return cfg;
}
