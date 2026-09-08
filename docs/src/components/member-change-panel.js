// role: [工程师]+[AI]
// member-change-panel.js — 成员变更「域内批量确认」组件（REVIEW_QUEUE 裁决批一 D1/D3 2026-09-08）
// org-commissioner：待审批（pending-org-approval）→ 通过（approve，自动广播全体支委）
// secretary：待确认（pending-secretary）→ 确认（confirm，更新成员发展阶段）
// 数据闭环：议程「记录通过」→ 自动建申请 → 本组件审批 → 广播/更新阶段。
//
// 2026-09-08 裁决批一（D1/D3 成员变更=域内确认+批量去顶卡；纪律=同一队列不得顶卡+域折组双呈，
// 批量优先于置顶）：
//   · 顶卡面板（renderMemberChangePanelHtml 等）移除——secretary/org 待办页顶部不再挂 member 面板卡，
//     确认位唯一化 = 「成员发展」域实时组内批量块（secretary:member-confirm / org-commissioner:member-approve）；
//   · buildMcBulkRows 统一两类来源行：agenda=会议待讨论名单（memberChangeRequests，来源徽标）
//     / roster=名册报送确权（member-confirmation pending，来源徽标区分）；
//   · renderMcBulkRowsHtml：checkbox 列 + 全选 + 「确认/通过 N 项」+ 来源徽标 + 从→到 + 发起·时间；
//   · bindMcBulk：全选/计数/批量写口 + onDone 重渲染；单条写口抽出
//     approveMemberChangeRequest/confirmMemberChangeRequest 供逐项（详情）/批量共用——
//     留痕不变（approve/confirm 仍为「仅改 status、数组长度不变」的 adapter 直写
//     （mock-adapter 禁改，故在本组件写口处显式 bumpToken('memberChangeRequests')）；
//     roster 链经 decideConfirmation 写 decidedBy/decidedAt，bulk 内显式按决策人留痕）。
//   · 预载缓存（preload/getCached）保留：buildRealtimeGroups 为同步纯计算，靠 onBeforeRender
//     预载后经缓存读取（签名未变秒回、变才 await 拉取）——todo-tab-shell _comboKeyOf 已并入
//     该 token+长度指纹 → 确认/审批后渲染守卫键变化 → 重建而非命中跳过。

import { getAdapter } from '../core/data-adapter.js?v=20260908c';
import { mockDB } from '../core/domain.js?v=20260908c';
import { bumpToken } from '../core/version-token.js?v=20260908c';
import { getPersonById, getPersonName } from '../services/person.js?v=20260908c';
import { loadActivities } from '../services/activity.js?v=20260908c';
import { showToast, escHtml as esc } from '../core/utils.js?v=20260908c';
import { NoticeStore } from '../services/notice.js?v=20260908c';
import { AuthStore } from '../services/auth.js?v=20260908c';
// roster=名册报送确权链（组织委员发起 → 书记确认/退回；bulk 行仅确认，退回留在详情逐项）
import { listPendingConfirmations, decideConfirmation, MC_ACTION_LABEL } from '../services/member-confirmation.js?v=20260908c';

const _pendingStatusOf = (mode) => (mode === 'org-approve' ? 'pending-org-approval' : 'pending-secretary');

// ── 请求列表模块级缓存（预载 → buildRealtimeGroups 同步产物；见头注） ──────
const _cache = { loaded: false, requests: [] };

function _sigOf(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  return `${arr.length}:${arr.map((r) => `${r.id}=${r.status}`).join(',')}`;
}

/**
 * 预载成员变更申请列表到模块级缓存（各台 onBeforeRender await；成功后同步渲染）。
 * @returns {Promise<Object[]>}
 */
export async function preloadMemberChangeRequests() {
  const live = Array.isArray(mockDB?.memberChangeRequests) ? mockDB.memberChangeRequests : [];
  if (_cache.loaded && _sigOf(live) === _sigOf(_cache.requests)) return _cache.requests;
  try {
    _cache.requests = await getAdapter().memberChangeRequests.list();
  } catch (e) {
    console.warn('[member-change-panel] 申请列表加载失败：', e);
    _cache.requests = [];
  }
  _cache.loaded = true;
  return _cache.requests;
}

/** 读取预载缓存（buildRealtimeGroups 同步产物用；未预载 → 空数组） */
export function getCachedMemberChangeRequests() {
  return _cache.requests;
}

// ── 统一两类来源的批量行（1b：agenda / roster 来源徽标区分） ──────────────

/**
 * 汇总待处理批量行（同步纯计算；依赖 onBeforeRender 已 preload agenda 链缓存）。
 * agenda=会议待讨论名单（memberChangeRequests，pending-org-approval / pending-secretary 按 mode）
 * roster=名册报送确权（member-confirmation pending，仅书记 secretary-confirm 侧）。
 * @param {'secretary-confirm'|'org-approve'} [mode]
 * @returns {Array<{id:string, source:'agenda'|'roster', personName:string, from:string, to:string,
 *                   meta:string, byName:string, at:string}>}
 */
export function buildMcBulkRows(mode = 'secretary-confirm') {
  const pendingStatus = _pendingStatusOf(mode);
  const agenda = (Array.isArray(_cache.requests) ? _cache.requests : [])
    .filter(r => r.status === pendingStatus)
    .map(r => {
      const person = getPersonById(r.personId);
      const act = loadActivities().find(a => a.id === r.activityId);
      return {
        id: r.id,
        source: 'agenda',
        personName: person?.name || r.personId || '未知成员',
        from: r.fromStage || '',
        to: r.toStage || '',
        meta: act?.title || '会议议程',
        byName: '议程派生',
        at: r.createdAt || '',
      };
    });
  const roster = mode === 'org-approve' ? [] : listPendingConfirmations().map(r => ({
    id: r.id,
    source: 'roster',
    personName: r.name || r.personId || '未知成员',
    from: r.from || '',
    to: r.to || '',
    meta: MC_ACTION_LABEL[r.action] || (r.kind === 'transferOut' ? '移出' : '变更'),
    byName: r.by ? (getPersonName(r.by) || r.by) : '组织委员',
    at: r.at || '',
  }));
  return [...agenda, ...roster];
}

/**
 * 渲染批量块 HTML（1b；todo-list 组行渲染扩展：组对象带 bulkHtml → 直接内嵌）。
 * 源徽标：agenda=「议程」sky / roster=「名册」amber；verb 按 mode（通过/确认）。
 * @param {Array} rows — buildMcBulkRows 产物
 * @param {{mode:string, accent?:string}} opts
 * @returns {string}
 */
export function renderMcBulkRowsHtml(rows, { mode = 'secretary-confirm', accent = '#B91C1C' } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return '';
  const verb = mode === 'org-approve' ? '通过' : '确认';
  const sourceBadge = (s) => (s === 'agenda'
    ? '<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 flex-shrink-0">议程</span>'
    : '<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 flex-shrink-0">名册</span>');
  const rowsHtml = list.map(r => `
    <label class="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer" data-mcb-row>
      <input type="checkbox" class="mcb-check shrink-0" style="cursor:pointer;" data-mcb-source="${r.source}" data-mcb-id="${esc(r.id)}" />
      <span class="flex flex-col items-start gap-0.5 min-w-0 flex-1">
        <span class="flex items-center gap-1.5 min-w-0 w-full">
          ${sourceBadge(r.source)}
          <span class="text-sm font-medium text-gray-800 truncate">${esc(r.personName)}</span>
          <span class="text-[11px] text-gray-400 truncate">${esc(r.from || '')} → ${esc(r.to || '')}</span>
        </span>
        <span class="block text-[11px] text-gray-400 truncate w-full">${esc(r.meta || '')}${r.byName ? ` · ${esc(r.byName)}` : ''}${r.at ? ` · ${String(r.at).slice(0, 16).replace('T', ' ')}` : ''}</span>
      </span>
    </label>`).join('');
  return `
    <div class="px-2.5 py-2 space-y-0.5" data-mcb-panel="${mode}">
      <div class="flex items-center justify-between pb-1 border-b border-gray-100 mb-1">
        <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input type="checkbox" class="mcb-all shrink-0" style="cursor:pointer;" />
          全选（${list.length} 条）
        </label>
        <span class="text-[11px] text-gray-400">勾选后批量${verb}，逐项处理见详情</span>
      </div>
      <div class="divide-y divide-gray-50 max-h-56 overflow-y-auto">${rowsHtml}</div>
      <div class="pt-2 flex items-center gap-2">
        <button type="button" class="mcb-apply text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed" style="background:${accent};cursor:pointer;" disabled>${verb} 0 项</button>
        <span class="text-[11px] text-gray-400">批量${verb}同逐项同一写口（留痕不变）</span>
      </div>
    </div>`;
}

/**
 * 绑定批量块交互（全选 / 计数 / 批量写口 + onDone 重渲染；无面板 → no-op）。
 * 写口：agenda 链 = approveMemberChangeRequest/confirmMemberChangeRequest（adapter 直写 + 显式 bump）；
 * roster 链 = decideConfirmation approved（decidedBy/decidedAt 留痕，决策人=当前用户兜底书记位）。
 * @param {HTMLElement|null} container — 壳根容器（含 [data-mcb-panel=…]）
 * @param {{mode:string, onDone?:()=>void}} opts
 */
export function bindMcBulk(container, { mode = 'secretary-confirm', onDone } = {}) {
  const panel = container?.querySelector(`[data-mcb-panel="${mode}"]`);
  if (!panel) return;
  const verb = mode === 'org-approve' ? '通过' : '确认';
  const checks = () => [...panel.querySelectorAll('.mcb-check')];
  const allBox = panel.querySelector('.mcb-all');
  const applyBtn = panel.querySelector('.mcb-apply');
  const sync = () => {
    const arr = checks();
    const n = arr.filter(c => c.checked).length;
    if (applyBtn) {
      applyBtn.disabled = n === 0;
      applyBtn.textContent = `${verb} ${n} 项`;
    }
    if (allBox) {
      allBox.checked = arr.length > 0 && n === arr.length;
      allBox.indeterminate = n > 0 && n < arr.length;
    }
  };
  allBox?.addEventListener('change', () => {
    checks().forEach(c => { c.checked = allBox.checked; });
    sync();
  });
  checks().forEach(c => c.addEventListener('change', sync));
  sync();
  applyBtn?.addEventListener('click', async () => {
    const picked = checks().filter(c => c.checked)
      .map(c => ({ id: c.dataset.mcbId, source: c.dataset.mcbSource }));
    if (picked.length === 0) return;
    applyBtn.disabled = true;
    let okN = 0;
    let errN = 0;
    for (const p of picked) {
      try {
        if (p.source === 'agenda') {
          if (mode === 'org-approve') await approveMemberChangeRequest(p.id);
          else await confirmMemberChangeRequest(p.id);
        } else if (p.source === 'roster' && mode !== 'org-approve') {
          const by = AuthStore.getCurrentUser()?.personId || 'p13';
          const r = await decideConfirmation(p.id, { decision: 'approved', by, note: '' });
          if (!r.ok) throw new Error(r.reason || '确认失败');
        } else {
          throw new Error('未知批量项类型');
        }
        okN += 1;
      } catch (e) {
        console.warn('[member-change-panel] 批量项处理失败：', p, e);
        errN += 1;
      }
    }
    if (okN > 0) {
      showToast('success', errN > 0 ? `已${verb} ${okN} 项（${errN} 项失败）` : `已${verb} ${okN} 项`);
    } else if (errN > 0) {
      showToast('error', '批量处理失败，请重试');
    }
    if (typeof onDone === 'function') onDone();
  });
}

// ── 单条写口（逐项详情 / 批量共用；留痕与既有顶卡面板一致） ──────────────

/**
 * 组织委员审批通过单条（agenda 链；approve → pending-secretary + 广播全体支委 + 显式 bump）。
 * @param {string} id — memberChangeRequests 申请 id
 */
export async function approveMemberChangeRequest(id) {
  const r = (Array.isArray(_cache.requests) ? _cache.requests : []).find(x => x.id === id);
  await getAdapter().memberChangeRequests.approve(id);
  bumpToken('memberChangeRequests'); // P0（2026-09-08）：status 直写不改长度 → 显式 bump 供渲染守卫失效
  // P2（2026-09-01 代码审查）：审批通过后发全员通知 = 广播送达证据（书记点验链路 ③「确认全体支委收到广播」）
  try {
    const person = r && getPersonById(r.personId);
    const act = r && loadActivities().find(a => a.id === r.activityId);
    NoticeStore.add({
      title: '成员变更已审批通过',
      content: `${person?.name || r?.personId || ''}：${r?.fromStage || ''}→${r?.toStage || ''} 已通过组织委员审批（${act?.title || '活动'}），待书记确认后更新发展阶段。`,
      priority: 'normal',
      targetUrl: 'workspace/secretary.html',
    });
  } catch (ne) {
    console.warn('[member-change-panel] 广播通知发送失败：', ne);
  }
}

/**
 * 书记确认单条（agenda 链；confirm → completed + confirmedAt + 更新成员发展阶段 + 显式 bump）。
 * @param {string} id — memberChangeRequests 申请 id
 */
export async function confirmMemberChangeRequest(id) {
  await getAdapter().memberChangeRequests.confirm(id);
  bumpToken('memberChangeRequests'); // P0（2026-09-08）：status 直写不改长度 → 显式 bump 供渲染守卫失效
}
