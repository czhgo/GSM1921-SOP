// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  list-filter.js — 统一名单检索引擎（2026-09-13 支书裁定）
// ════════════════════════════════════════════════════════════════
//  立项依据（支书原话）：
//   ·「涉及第一列是人的表格，一定要安排搜索功能，一定要安排合理的设计」
//   ·「只读情形实现最小查阅成本；可操作情形实现最小操作成本」
//   ·「搜索框/分面本身也可能过拟合——3~7 行的小表加搜索框是负担」
//
//  设计裁决（2026-09-13 grill-me 面谈定案，共 15 问；2026-09-14 批次 27 修订筛选行载体）：
//   ① 单一引擎：28 张按人表 + 32 张活动表共用本组件，勿各页手写搜索（现状：按人表 0 复用）。
//   ② 能力 = 关键词（多字段模糊）+ 分面下拉 + 结果计数；
//      分面**一律下拉**（.lf-select，首项「全部」，走全局 enhanceSelects 圆角增强），
//      **筛选行禁用 chip**（支书 2026-09-14 裁定）——chip 只属表单多选；
//      分面取值可 auto 派生（免各表手写枚举），取值 ≤1 种时该维度自动隐藏（空维度不占位）。
//   ③ 出现门槛：当前视图行数 ≤ SEARCH_FILTER_MIN_ROWS（单一源 constants.js）→ **不渲染检索条**；
//      行数变化自动出现/隐藏（动态，非静态按表判定）。
//   ④ 状态保持：同一 stateKey 跨重渲染保留关键词与已选分面——
//      表格因写入而重渲染时筛选不丢（最小操作成本的关键）。
//   ⑤ 档位唯一：筛选行控件统一 34px 高 / 12px 字（input-flat text-xs 与 cs-trigger.text-xs 同档）。
//
//  用法（替换原「container.innerHTML = rows.map(...)」）：
//    renderFilteredList(bodyEl, {
//      stateKey: 'org-development-table',        // 同一张表固定串（状态保持键）
//      rows: candidates,
//      keyword: personKeyword(),
//      facets: personFacets({ roleLabel: (r) => ROLE_LABELS[r] || r }),
//      rowHtml: (p) => `<div class="...">${p.name}</div>`,
//      countUnit: '人',
//    });
//  数据变化后：同 stateKey 再调用一次，或 hold 返回值调 .update(newRows)。
// ════════════════════════════════════════════════════════════════

import { escHtml as esc } from '../core/utils.js?v=20260914e';
import {
  SEARCH_FILTER_MIN_ROWS, ROLE_LABELS, ACTIVITY_CLASSIFICATION,
  classifyActivityType, normalizeActivityType,
} from '../core/constants.js?v=20260914e';
// 活动生命周期**展示态**单一源 = components/inspector.js（草稿/已发布/进行中/待归档/已执行/已归档/已取消）
// ——勿在本组件另写一套中文标签（constants.js 里曾短暂加过的副本已撤除）
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from './inspector.js?v=20260914e';

/** 每个 stateKey 的筛选状态（跨重渲染保持；键集合有界 = 全站表格数，不做回收） */
const _states = new Map();
let _seq = 0;

function _stateOf(key) {
  if (!_states.has(key)) _states.set(key, { q: '', facets: {} });
  return _states.get(key);
}

/** 清空某张表的筛选状态（表结构变更/显式重置时用） */
export function resetFilterState(stateKey) {
  _states.delete(stateKey);
}

/** 分面取值（优先 f.get(item)，否则 item[f.key]） */
function _valueOf(item, facet) {
  const v = typeof facet.get === 'function' ? facet.get(item) : item?.[facet.key];
  return v === undefined || v === null ? '' : String(v);
}

/** 关键词命中：keyword.keys 任一字段模糊包含；未声明 keys 时退回全部字符串字段 */
function _keywordHit(item, q, keyword) {
  if (!q) return true;
  const keys = keyword && keyword.keys;
  if (Array.isArray(keys) && keys.length) {
    return keys.some(k => {
      const v = keyword.get ? keyword.get(item, k) : item?.[k];
      return v !== undefined && v !== null && String(v).toLowerCase().includes(q);
    });
  }
  return Object.values(item || {})
    .filter(v => typeof v === 'string')
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/**
 * 渲染「检索条 + 结果列表」（门槛未达 = 只渲染列表）
 * @param {HTMLElement} container 挂载容器
 * @param {Object} cfg
 * @param {string} [cfg.stateKey] 状态保持键（同一张表固定串）
 * @param {Array} cfg.rows 数据集
 * @param {Function} cfg.rowHtml (item, index) => htmlString
 * @param {Object} [cfg.keyword] { keys:[字段], placeholder, get?(item,key) }
 * @param {Array} [cfg.facets] [{ key, label, options?:[{value,label}]|'auto', get?, format?(v) }]
 * @param {number} [cfg.minRows] 检索条出现门槛（缺省 = SEARCH_FILTER_MIN_ROWS 单一源）
 * @param {string} [cfg.emptyMessage] 空结果文案
 * @param {Function} [cfg.sort] 排序比较器（缺省保持传入顺序）
 * @param {string} [cfg.listClass] 结果区 class（列表模式：行容器）
 * @param {string} [cfg.countUnit] 计数单位（'人' / '条'）
 * @param {{headHtml:string,colSpan:number,className?:string}} [cfg.table] 表格模式：结果区渲染为
 *   `<table class="data-table">`（表头/行线/悬停/内边距由 styles.css 单一源提供；
 *   rowHtml 须返回 `<tr>`，表头 `<th>` 不要再写 py-2 px-3 text-left 等重复类）——
 *   避免把 `<div>` 塞进 `<tbody>`（非法 HTML）。不传则为 div 列表模式。
 * @returns {{visible:boolean, state:Object, apply:Function, update:Function}}
 */
export function renderFilteredList(container, cfg) {
  if (!container) return { visible: false, apply() {}, update() {} };
  const config = Object.assign({
    stateKey: 'lf-' + (_seq += 1),
    rows: [],
    rowHtml: () => '',
    keyword: null,
    facets: [],
    minRows: SEARCH_FILTER_MIN_ROWS,
    emptyMessage: '无匹配结果',
    sort: null,
    listClass: 'space-y-1',
    countUnit: '条',
    table: null,
  }, cfg || {});

  const st = _stateOf(config.stateKey);
  const uid = 'lf' + (_seq += 1);
  let data = Array.isArray(config.rows) ? [...config.rows] : [];
  let visible = data.length > config.minRows;
  let facetDefs = [];

  container.innerHTML = `
    <div class="lf-root">
      <div class="lf-bar"></div>
      <div class="lf-list"></div>
      <div class="lf-count" role="status" aria-live="polite"></div>
    </div>`;
  const barEl = container.querySelector('.lf-bar');
  const listEl = container.querySelector('.lf-list');
  const countEl = container.querySelector('.lf-count');
  // 表格模式：class 作用于 <table>（.data-table 单一源）；列表模式：作用于行容器
  listEl.className = config.table ? 'lf-list' : 'lf-list ' + config.listClass;

  /** 分面解析：auto = 首现序派生；取值 ≤1 种 → 该维度隐藏（空维度不占位） */
  function resolveFacets() {
    return config.facets
      .map(f => {
        let options = f.options;
        if (!options || options === 'auto') {
          const seen = [];
          const set = new Set();
          for (const r of data) {
            const v = _valueOf(r, f);
            if (!v || set.has(v)) continue;
            set.add(v);
            seen.push({ value: v, label: f.format ? f.format(v) : v });
          }
          options = seen;
        }
        return Object.assign({}, f, { options });
      })
      .filter(f => f.options.length > 1);
  }

  function renderBar() {
    barEl.hidden = !visible;
    if (!visible) { barEl.innerHTML = ''; return; }
    const qHtml = config.keyword
      ? `<input type="text" id="${uid}-q" class="input-flat text-xs lf-kw"
             placeholder="${esc(config.keyword.placeholder || '搜索…')}"
             aria-label="${esc(config.keyword.placeholder || '搜索')}" value="${esc(st.q)}" />`
      : '';
    // 分面 = 下拉（首项「全部」承载维度名，自身即状态显示位，故改动无需重绘）
    const facetsHtml = facetDefs.map(f => {
      const sel = st.facets[f.key] || '';
      return `<select id="${uid}-f-${esc(f.key)}" class="input-flat text-xs lf-select"
                data-facet="${esc(f.key)}" aria-label="${esc(f.label)}筛选">
        <option value="">${esc(f.label)}：全部</option>
        ${f.options.map(o => `<option value="${esc(o.value)}"${sel === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>`;
    }).join('');
    barEl.innerHTML = `${qHtml}${facetsHtml}
      <button type="button" class="lf-clear lf-btn">清除</button>`;

    barEl.querySelector(`#${uid}-q`)?.addEventListener('input', (e) => {
      st.q = String(e.target.value || '').trim().toLowerCase();
      renderList();
    });
    barEl.querySelectorAll('.lf-select').forEach(sel => {
      sel.addEventListener('change', () => {
        st.facets[sel.dataset.facet] = sel.value || '';
        renderList();
      });
    });
    barEl.querySelector('.lf-clear')?.addEventListener('click', () => {
      st.q = '';
      st.facets = {};
      renderBar();
      renderList();
    });
  }

  function renderList() {
    let filtered = data.filter(item => {
      if (!_keywordHit(item, st.q, config.keyword)) return false;
      for (const f of facetDefs) {
        const sel = st.facets[f.key];
        if (sel && _valueOf(item, f) !== sel) return false;
      }
      return true;
    });
    if (typeof config.sort === 'function') filtered = filtered.sort(config.sort);
    if (config.table) {
      const empty = `<tr class="is-empty"><td colspan="${config.table.colSpan || 1}" class="is-empty">${esc(config.emptyMessage)}</td></tr>`;
      // 表格样式单一源：表头/行线/悬停/内边距全部由 styles.css::.data-table 提供（各表勿再重复声明）
      listEl.innerHTML = `<table class="data-table ${config.table.className || ''}">
        ${config.table.headHtml ? `<thead>${config.table.headHtml}</thead>` : ''}
        <tbody>${filtered.length === 0 ? empty : filtered.map((item, i) => config.rowHtml(item, i)).join('')}</tbody>
      </table>`;
    } else {
      listEl.innerHTML = filtered.length === 0
        ? `<p class="text-xs text-gray-500 text-center py-4">${esc(config.emptyMessage)}</p>`
        : filtered.map((item, i) => config.rowHtml(item, i)).join('');
    }
    countEl.hidden = !visible;
    if (visible) {
      const active = !!st.q || Object.values(st.facets).some(Boolean);
      countEl.textContent = active
        ? `筛选出 ${filtered.length} / ${data.length} ${config.countUnit}`
        : `共 ${data.length} ${config.countUnit}`;
    }
  }

  function renderAll() {
    facetDefs = resolveFacets();
    renderBar();
    renderList();
  }

  renderAll();

  return {
    get visible() { return visible; },
    state: st,
    apply: renderList,
    /** 数据变化（写入后重取）：跨门槛则重建检索条，否则只重算结果（保住输入焦点） */
    update(nextRows) {
      const nowVisible = (Array.isArray(nextRows) ? nextRows.length : 0) > config.minRows;
      data = Array.isArray(nextRows) ? [...nextRows] : [];
      if (nowVisible !== visible) { visible = nowVisible; }
      renderAll();
    },
  };
}

/**
 * 人名检索分面描述符（按人表共用；取值 auto 派生）
 * @param {Object} [opts]
 * @param {Function} [opts.roleLabel] 角色键 → 中文标签（通常传 ROLE_LABELS）
 * @returns {Array} facets 配置
 */
export function personFacets(opts = {}) {
  const roleLabel = opts.roleLabel || ((v) => v);
  return [
    { key: 'partyGroup', label: '党小组' },
    { key: 'developStage', label: '发展阶段' },
    { key: 'role', label: '角色', format: roleLabel },
    { key: 'residenceStatus', label: '在册' },
  ];
}

/** 按人表标准关键词配置（姓名 / 学号 模糊命中——切忌凭姓名匹配业务身份，此处仅用于筛选显示） */
export function personKeyword(placeholder = '搜索姓名 / 学号…') {
  return { keys: ['name', 'studentId'], placeholder };
}

/** 活动表标准关键词配置（标题 / 地点 模糊命中） */
export function activityKeyword(placeholder = '搜索活动名称 / 地点…') {
  return { keys: ['title', 'name', 'location'], placeholder };
}

/**
 * 活动表标准分面（月份 / 类别 / 类型 / 状态）——取值 auto 派生，标签走各自 format。
 * 口径单一源：类别 = classifyActivityType、类型 = normalizeActivityType（'大类·子类' 归一）、
 * 状态 = **既有生命周期展示态源** components/inspector.js::deriveActivityLifecycleStatus。
 * @param {Object} [opts]
 * @param {Function} [opts.monthOf] 月份取值（缺省 a.date 前 7 位）
 * @param {Array} [opts.tasks] 任务列表——传了才能按任务进度派生「进行中/已执行」（缺省不传 = 按存储态）
 * @param {Function} [opts.lifecycleOf] 自定义状态派生（缺省走 inspector 单一源）
 * @returns {Array} facets 配置
 */
export function activityFacets(opts = {}) {
  const monthOf = opts.monthOf || ((a) => String(a?.date || '').slice(0, 7));
  const tasks = Array.isArray(opts.tasks) ? opts.tasks : [];
  const lifecycleOf = opts.lifecycleOf || ((a) => deriveActivityLifecycleStatus(a, tasks));
  return [
    { key: 'month', label: '月份', get: monthOf },
    {
      key: 'activityClass', label: '类别',
      get: (a) => classifyActivityType(normalizeActivityType(a?.type)) || '',
      format: (v) => (ACTIVITY_CLASSIFICATION[v] && ACTIVITY_CLASSIFICATION[v].label) || v,
    },
    { key: 'type', label: '类型', get: (a) => normalizeActivityType(a?.type) },
    {
      key: 'lifecycle', label: '状态',
      get: lifecycleOf,
      format: (v) => (ACTIVITY_LIFECYCLE[v] && ACTIVITY_LIFECYCLE[v].label) || v,
    },
  ];
}

/** 复用点：角色键 → 中文标签（personFacets 的 format 缺省回退） */
export const roleLabelOf = (key) => ROLE_LABELS[key] || key;
