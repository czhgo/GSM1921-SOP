// role: [工程师]+[AI]
// 组织委员工作台 Tab：思想汇报台账（人 × 期次）
// 2026-09-18 批次 86（`SOP-B-28`）：**取消「初阅通过才归档」这道门**——提交即入库即归档，
//   故原「待初阅队列」整卡撤除（没有待阅队列了）。
// 2026-09-21 批次 124（`SOP-B-11` 待定项 ①：支书 2026-09-20 定案「**只给提交人本人**」）：
//   原「篇幅不足（少于 1200 字）」一览整卡撤除——篇幅提醒**只在提交人本人的提交页 / 阅读页出现**，
//   组织侧**不留任何「篇幅不足」标记**、也不经手（组织委员看的是台账与正文本身）。
// 2026-09-13 面板数据改造（支书裁定「我认为还是需要用一个界面来承载！而不是展开！」）：
//  本 tab 只做**入口导航**——逐条跳**独立阅读页** docs/thought-report.html（单篇 ?id= / 按人 ?personId=）；
//  打回（事后反馈）、正文阅读均在该页完成，本 tab 不再行内展开。
// 角色自 AuthStore.getCurrentUser() 取（勿自由传参）；非组织委员（org-commissioner）防御：仅提示无权限。

import { listAllThoughtReports, comparePeriodDesc } from '../../../services/governance/thought-report.js?v=20261003f';
import { getPersonName, liveMembers } from '../../../services/member/person.js?v=20261003f';
import { AuthStore } from '../../../services/core/auth.js?v=20261003f';
import { escHtml as esc } from '../../../core/base/utils.js?v=20261003f';
// 人×期次矩阵单一源（2026-09-14 批次 35/38；批次 41 本域接入）
import { renderRelationMatrix } from '../../../components/ui/relation-matrix.js?v=20261003f';

// ── 审阅状态：徽标样式 + 中文标签 + 就高不就低的优先级 ──
// 读取侧归一由服务层 _effective 保证（无状态 / 状态非法 / 旧 'pending' → 已入库）
const STATUS_META = {
  needs_revision: { label: '已打回·待补充', dot: 'bg-red-600' },
  archived:       { label: '已入库', dot: 'bg-green-600' },
};

/** 状态优先级（同一人同一期次多篇时，cell 取最靠前者——就高不就低） */
const STATUS_PRIORITY = ['needs_revision', 'archived'];

// 台账视图（2026-09-15 批次 43）：'person'＝行＝人（默认）／'period'＝行＝期次（转置）
// 转置口径与考勤 / 考察 / 支部分工 / 专班报名 一致：**只是换视角，不换数据、不换 cell 语义**
let _view = 'person';

// 互斥视图钮视觉（照 disc/inspection-tab.js 的 data-view 钮组：主题浅底 + 主题色字/边框；不自造 chip）
const SEG_ON_CLASSES = [
  'bg-[var(--app-accent-bg)]',
  'border-[var(--app-accent)]',
  '[color:color-mix(in_srgb,var(--app-accent)_60%,#000)]',
];
const SEG_OFF_CLASSES = ['bg-white', 'border-neutral-200', 'text-gray-600'];

function _syncViewBtns(container) {
  container.querySelectorAll('.tr-view-btn').forEach(btn => {
    const on = btn.dataset.trview === _view;
    SEG_ON_CLASSES.forEach(c => btn.classList.toggle(c, on));
    SEG_OFF_CLASSES.forEach(c => btn.classList.toggle(c, !on));
  });
}

/** 台账单元格＝**状态小色块**（2026-09-29 批次 295 紧凑化：格内不再放文字徽标，全文进 title——支书评「每一列这么宽」） */
const _statusDotHtml = (status) => {
  const m = STATUS_META[status] || STATUS_META.archived;
  return `<span class="inline-block w-2.5 h-2.5 rounded-sm ${m.dot}"></span>`;
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
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">思想汇报台账（人 × 期次）</h3>
          <div class="flex items-center gap-2">
            <button type="button" class="btn-tab tr-view-btn px-3 py-1.5 text-xs font-medium" data-trview="person">按人</button>
            <button type="button" class="btn-tab tr-view-btn px-3 py-1.5 text-xs font-medium" data-trview="period">按期次</button>
            <span class="text-xs text-gray-500">${members.length} 人 · ${periods.length} 期</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 mb-3">留痕台账 · 不提供删除（打回 / 重交走状态）</div>
        <div id="tr-ledger-host"></div>
      </div>
    `;

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
      // 2026-09-29 批次 295（支书评「啰嗦」⇒ 说明段**全删**）：行列结构由表头自明；
      // 真正非自明的两条（状态取「就高不就低」· 点击去向）改落**表头悬浮 title**（见 headTitle）。
      headTitle: '状态＝该期次汇总（已打回·待补充 ＞ 已入库，就高不就低）；点色块进入阅读页',
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
        return `<a href="${href}" class="inline-flex items-center hover:opacity-80 transition-opacity" title="${esc(tip)}">${_statusDotHtml(status)}</a>`;
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
