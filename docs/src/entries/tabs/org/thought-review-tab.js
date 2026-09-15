// role: [工程师]+[AI]
// 组织委员工作台 Tab：思想汇报 初阅（R6-2 把关式初阅 UI 层，2026-09-07）
// 2026-09-13 面板数据改造（支书裁定「我认为还是需要用一个界面来承载！而不是展开！」）：
//  本 tab 只做**入口导航**——待初阅队列/台账矩阵逐条跳**独立阅读页** docs/thought-report.html
//  （单篇 ?id= / 按人 ?personId=）；初阅动作（通过·归档 / 退回）、正文阅读均在该页完成，
//  本 tab 不再行内展开（已删 .tr-detail/.tr-expand-btn 与就地初阅）。
// 2026-09-14 批次 41（Q-23-18 余项，支书裁定四项口径）：原按人分组列表（按人分组 + 组内每篇一行，
//  行数随篇数无限增长）改为**人 × 期次宽表台账**——行＝支部在册成员（未交即「—」，漏交一眼可见）、
//  列＝期次（新→旧，最近 6 期 + 一键展开）、cell＝该期**最需处理**的状态徽标（待初阅 ＞ 已退回 ＞ 已归档）
//  多篇时附「N 篇」；矩阵走单一源 components/relation-matrix.js（人维每页 10 人）。
//  期次列取自台账**实有期次**（不臆造空期次）；本域只给「按人」视图（按期次转置视图未开，需要再定）。
// 角色自 AuthStore.getCurrentUser() 取（勿自由传参）；非组织委员（org-commissioner）防御：仅提示无权限。

import { listPendingReviews, listAllThoughtReports, comparePeriodDesc } from '../../../services/thought-report.js?v=20260915d';
import { getPersonName, liveMembers } from '../../../services/person.js?v=20260915d';
import { AuthStore } from '../../../services/auth.js?v=20260915d';
import { escHtml as esc } from '../../../core/utils.js?v=20260915d';
// 统一检索引擎（2026-09-14 批次 37）：待初阅队列接一个实例（仅分页）
import { renderFilteredList } from '../../../components/list-filter.js?v=20260915d';
// 人×期次矩阵单一源（2026-09-14 批次 35/38；批次 41 本域接入）
import { renderRelationMatrix } from '../../../components/relation-matrix.js?v=20260915d';

// ── R6-2 初阅状态：徽标样式 + 中文标签 + 就高不就低的优先级 ──
// 读取侧归一由服务层 _effective 保证（状态缺省/非法 → 已归档），本处只做展示与「最需处理」排序
const STATUS_META = {
  pending:        { label: '待初阅', cls: 'bg-orange-100 text-orange-700' },
  needs_revision: { label: '已退回·需补充', cls: 'bg-red-100 text-red-700' },
  archived:       { label: '已归档', cls: 'bg-green-100 text-green-700' },
};

/** 状态优先级（同一人同一期次多篇时，cell 取最靠前者——就高不就低） */
const STATUS_PRIORITY = ['pending', 'needs_revision', 'archived'];

// 台账视图（2026-09-15 批次 43）：'person'＝行＝人（默认）／'period'＝行＝期次（转置）
// 转置口径与考勤 / 考察 / 支部分工 / 专班报名 一致：**只是换视角，不换数据、不换 cell 语义**
let _view = 'person';

// 互斥视图钮视觉（照 disc/inspection-tab.js 的 data-view 钮组：主题浅底 + 主题色字/边框；不自造 chip）
const SEG_ON_CLASSES = [
  'bg-[var(--app-accent-bg)]',
  'border-[var(--app-accent)]',
  '[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]',
];
const SEG_OFF_CLASSES = ['bg-white', 'border-neutral-200', 'text-gray-600'];

function _syncViewBtns(container) {
  container.querySelectorAll('.tr-view-btn').forEach(btn => {
    const on = btn.dataset.trview === _view;
    SEG_ON_CLASSES.forEach(c => btn.classList.toggle(c, on));
    SEG_OFF_CLASSES.forEach(c => btn.classList.toggle(c, !on));
  });
}

const _date = (iso) => (iso || '').slice(0, 10);
const _brief = (s) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > 40 ? t.slice(0, 40) + '…' : t; };

const _statusBadgeHtml = (status) => {
  const m = STATUS_META[status] || STATUS_META.archived;
  return `<span class="text-xs px-1.5 py-0.5 rounded-full font-medium ${m.cls}">${m.label}</span>`;
};

export function renderContent(ctx) { // ctx 对齐 org 其它 tab（accent 等共享只读配置；本 tab 不需消费）
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    container.innerHTML = '<div class="card rounded-xl p-5"><p class="text-xs text-gray-500 text-center py-6">请先登录后使用</p></div>';
    return;
  }
  // 防御：非组织委员不渲染（提示无权限）
  if (user.role !== 'org-commissioner') {
    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <p class="text-xs text-gray-500 text-center py-6">无权限：仅组织委员可初阅思想汇报（当前角色：${esc(user.role || '—')}）</p>
      </div>`;
    return;
  }

  function render() {
    // 待初阅队列：先到先阅（服务层 listPendingReviews 已按提交时间升序）
    const queue = listPendingReviews();
    // 台账矩阵数据（服务层已归一：期次/状态字段完整）：全量记录 + 人 × 期次分桶
    const recs = listAllThoughtReports();
    const periods = [...new Set(recs.map(r => r.period))].sort(comparePeriodDesc); // 期次倒序（新→旧）
    const bucket = new Map(); // `${personId}|${period}` → 该人该期次的篇目
    recs.forEach(r => {
      const k = `${r.personId || 'unknown'}|${r.period}`;
      if (!bucket.has(k)) bucket.set(k, []);
      bucket.get(k).push(r);
    });
    // 行＝支部在册成员（实时视图：名册新增/移出即时反映；未提交者整格「—」＝漏交可见）
    const members = [...liveMembers()].map(p => ({ id: p.id, name: getPersonName(p.id) || p.name || p.id }));

    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">待初阅队列</h3>
          <span class="text-xs text-gray-500">${queue.length} 篇 · 先到先阅</span>
        </div>
        <p class="text-xs text-gray-500 mb-3">组织初阅把关：通过才正式归档；退回请附意见（提交者可见并可修改重交）。点击任一条进入阅读页进行初阅。</p>
        <div id="tr-queue-host"></div>
      </div>
      <div class="card rounded-xl p-5 mt-3">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">思想汇报台账（人 × 期次）</h3>
          <div class="flex items-center gap-2">
            <button type="button" class="tr-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200" data-trview="person">按人</button>
            <button type="button" class="tr-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200" data-trview="period">按期次</button>
            <span class="text-xs text-gray-500">${members.length} 人 · ${periods.length} 期</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mb-3">${_view === 'period'
          ? '行＝期次（新→旧）；列＝支部在册成员（每页 10 人）；徽标＝该成员该期最需处理的状态（待初阅 ＞ 已退回 ＞ 已归档），多篇时附「N 篇」；「—」＝该期未提交。点击进入阅读页。'
          : '行＝支部在册成员（每页 10 人）；列＝期次（新→旧，最近 6 期，可一键展开）；徽标＝该期次最需处理的状态（待初阅 ＞ 已退回 ＞ 已归档，就高不就低），多篇时附「N 篇」；「—」＝该期次未提交。点击进入阅读页（单篇直达该篇，多篇进按人视图）。'}</p>
        <div id="tr-ledger-host"></div>
      </div>
    `;

    // 待初阅队列接统一检索引擎（行 HTML 原样；原空态文案迁移为 emptyMessage）
    // 首列＝人（提交人姓名），按「第一列是人必配搜索」的既成规矩给关键词（姓名/标题/正文模糊命中）
    renderFilteredList(container.querySelector('#tr-queue-host'), {
      stateKey: 'org-thought-review-queue',
      rows: queue,
      keyword: {
        keys: ['personName', 'title', 'content'],
        placeholder: '搜索姓名 / 标题…',
        get: (r, k) => (k === 'personName' ? (getPersonName(r.personId) || '') : r[k]),
      },
      countUnit: '篇',
      listClass: 'space-y-2',
      emptyMessage: '暂无待初阅的思想汇报——成员新提交将在此按提交时间先后待阅',
      rowHtml: (r) => {
        const who = esc(getPersonName(r.personId) || r.personId);
        const title = esc(r.title || '思想汇报');
        return `
          <a href="thought-report.html?id=${r.id}" data-tr-id="${r.id}" class="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-50 hover:bg-gray-50 transition-colors">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-semibold text-gray-800">${who}</span>
                <span class="text-xs font-medium text-gray-600">《${title}》</span>
                <span class="text-[11px] text-gray-500">${_date(r.submittedAt)}</span>
              </div>
              <p class="text-[12px] text-gray-500 mt-1">${esc(_brief(r.content))}</p>
            </div>
            <span class="text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap flex-shrink-0">阅读并初阅 →</span>
          </a>`;
      },
    });

    // 台账矩阵接单一源（行＝人 / 行＝期次两视图互为转置；人维分页与列上限由组件缺省提供）
    // 转置只换视角：同一份 bucket、同一个 cell 语义，不做第二套渲染
    renderRelationMatrix(container.querySelector('#tr-ledger-host'), {
      stateKey: 'org-thought-ledger-matrix',
      mode: _view === 'period' ? 'byItem' : 'byPerson',
      persons: members,
      items: periods.map(p => ({ id: p, title: p })),
      personLabel: '姓名',
      itemLabel: '期次',
      personUnit: '人',
      emptyText: '暂无思想汇报记录',
      hintText: _view === 'period'
        ? '行＝期次（新→旧）；列＝支部在册成员（每页 10 人）；「—」＝该期未提交'
        : '行＝支部在册成员（每页 10 人）；列＝期次（新→旧，最近 6 期）；「—」＝该期未提交',
      cell: (personId, period) => {
        const arr = bucket.get(`${personId}|${period}`);
        if (!arr || !arr.length) return null; // 空 → 组件渲染「—」（漏交可见）
        const latest = [...arr].sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))[0];
        const status = STATUS_PRIORITY.find(s => arr.some(r => r.reviewStatus === s)) || 'archived';
        const n = arr.length;
        // 单篇 → 直达该篇阅读页；多篇 → 该人按人阅读页（期内多篇全部可见）
        const href = n === 1
          ? `thought-report.html?id=${latest.id}`
          : `thought-report.html?personId=${encodeURIComponent(personId)}`;
        const tip = `${STATUS_META[status].label}${n > 1 ? ` · 共 ${n} 篇` : ''}`;
        return `<a href="${href}" class="inline-flex items-center gap-1 hover:opacity-80 transition-opacity" title="${esc(tip)}">
            ${_statusBadgeHtml(status)}${n > 1 ? `<span class="text-[11px] text-gray-500">${n} 篇</span>` : ''}
          </a>`;
      },
    });

    // 视图钮：切「按人 / 按期次」（互斥视图笔法；切换即整块重渲染，保留在册成员与期次数据）
    _syncViewBtns(container);
    container.querySelectorAll('.tr-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.trview === _view) return;
        _view = btn.dataset.trview;
        render();
      });
    });
  }

  render();
}
