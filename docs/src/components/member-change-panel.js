// role: [工程师]+[AI]
// member-change-panel.js — 成员变更审批面板（2026-09-01 书记点验链路 ③④ 前端入口）
// org-commissioner：待审批（pending-org-approval）→ 通过（approve，自动广播全体支委）
// secretary：待确认（pending-secretary）→ 确认（confirm，更新成员发展阶段）
// 数据闭环：议程「记录通过」→ 自动建申请 → 本面板审批 → 广播/更新阶段。
//
// 2026-09-08 顶卡同步化（书记台/各台待办页顶卡弹跳与排布修复）：
//   · 拆纯函数 renderMemberChangePanelHtml(requests,{mode,accent}) + bindMemberChangePanel(container,…)
//     （原 L39-65 HTML / L69-101 事件绑定；内容与行为逻辑零变化）；
//   · 请求列表改模块级缓存：preloadMemberChangeRequests() 供各台 onBeforeRender await 预载
//     （本地数据签名与缓存一致则秒回、不一致才 await 拉取）→ extraTopHtml 同步产出真实卡 HTML，
//     消除「0 高裸挂点 + 600ms 后整卡插入把下方整体下推」；
//   · 保留 async renderMemberChangePanel(container,…) 兜底入口：先同步写「等高占位卡（同 frame
//     p-4 mb-4 灰块骨架/文案）」再 await 填充同 frame 真实内容；
//   · approve/confirm 为「仅改 status、数组长度不变」的 adapter 直写（mock-adapter 禁改，故在
//     本组件写口处显式 bumpToken('memberChangeRequests')）——todo-tab-shell _comboKeyOf 已并入
//     该 token+长度指纹 → 书记确认/组织审批后渲染守卫键变化 → 重建而非命中跳过（stale 修补）。

import { getAdapter } from '../core/data-adapter.js?v=20260903c';
import { mockDB } from '../core/domain.js?v=20260903c';
import { bumpToken } from '../core/version-token.js?v=20260907b';
import { getPersonById, getPersonName } from '../services/person.js?v=20260903c';
import { loadActivities } from '../services/activity.js?v=20260903c';
import { showToast } from '../core/utils.js?v=20260903c';
import { badgeHtml } from './badges.js?v=20260903c';
import { NoticeStore } from '../services/notice.js?v=20260903c';

const STATUS_LABEL = {
  'pending-org-approval': '待组织委员审批',
  'pending-secretary': '待书记确认',
  completed: '已完成',
  rejected: '已驳回',
};

const _pendingStatusOf = (mode) => (mode === 'org-approve' ? 'pending-org-approval' : 'pending-secretary');
const _titleOf = (mode) => (mode === 'org-approve' ? '成员变更审批' : '成员变更确认');

// ── 请求列表模块级缓存（2026-09-08 顶卡同步化） ──────────────
// 渲染从「fetch 后整卡插入」改为「预载缓存 → 同步产物」：各台 onBeforeRender
// await preloadMemberChangeRequests()，extraTopHtml 以 getCached… 同步产出真实卡。
// 签名 = 长度 + 逐行 status（本地 mockDB 即权威源，改动必使签名变 → 触发一次真拉取）；
// 未变 → 秒回，守卫命中路径不额外加延迟。
const _cache = { loaded: false, requests: [] };

function _sigOf(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  return `${arr.length}:${arr.map((r) => `${r.id}=${r.status}`).join(',')}`;
}

/**
 * 预载成员变更申请列表到模块级缓存。
 * 本地数据（mockDB.memberChangeRequests）与缓存签名一致 → 直接复用（快路径，无 await 延迟）；
 * 不一致（外部新建/终态/作废等直写）→ await adapter.list() 刷新。失败容错为空数组。
 * @returns {Promise<Object[]>}
 */
export async function preloadMemberChangeRequests() {
  const live = Array.isArray(mockDB.memberChangeRequests) ? mockDB.memberChangeRequests : [];
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

/** 读取预载缓存（extraTopHtml 同步产物用；未预载 → 空数组） */
export function getCachedMemberChangeRequests() {
  return _cache.requests;
}

/** 面板内容签名（按 mode 过滤后的长度 + 逐行 id=status；写 data-mc-key 供渲染守卫/调试观测） */
export function memberChangePanelDataKey(requests, mode) {
  const pendingStatus = _pendingStatusOf(mode);
  const list = (Array.isArray(requests) ? requests : []).filter((r) => r.status === pendingStatus);
  return `${list.length}:${list.map((r) => `${r.id}=${r.status}`).join(',')}`;
}

/** 单行：姓名 from→to + 活动/时间 + 操作按钮（原 L53-62 逐字保留） */
function _rowHtml(r, mode, accent) {
  const person = getPersonById(r.personId);
  const act = loadActivities().find((a) => a.id === r.activityId);
  return `
    <div class="flex items-center justify-between gap-3 py-2" data-mcr-id="${r.id}">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-medium text-gray-800 truncate">${person?.name || r.personId}：${r.fromStage || ''} → ${r.toStage || ''}</span>
          ${badgeHtml(STATUS_LABEL[r.status] || r.status, 'warning')}
        </div>
        <div class="text-xs text-gray-400 truncate">${act?.title || '活动'} · ${(r.createdAt || '').slice(0, 16).replace('T', ' ')}</div>
      </div>
      <button type="button" class="mcr-action text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" style="background:${mode === 'org-approve' ? '#16A34A' : accent};cursor:pointer;">${mode === 'org-approve' ? '通过' : '确认'}</button>
    </div>`;
}

/**
 * 渲染成员变更审批/确认面板卡 HTML（同步纯函数；frame 与页顶其它卡统一：
 * card rounded-xl p-4 mb-4 + 标题 font-title-cn text-sm font-bold text-gray-800 + 头行 mb-3
 * + 右侧计数 text-xs text-gray-400 + 空态 text-xs text-gray-400 py-1）。
 * @param {Object[]} requests — 全量申请（组件内按 mode 过滤待办状态）
 * @param {{mode: 'org-approve'|'secretary-confirm', accent?: string}} opts
 * @returns {string}
 */
export function renderMemberChangePanelHtml(requests, { mode, accent = '#B91C1C' } = {}) {
  const pendingStatus = _pendingStatusOf(mode);
  const list = (Array.isArray(requests) ? requests : []).filter((r) => r.status === pendingStatus);
  const countHtml = list.length > 0
    ? `<span class="text-xs text-gray-400 tabular-nums">${list.length} 条待处理</span>`
    : '<span class="text-xs text-gray-400">已清空</span>';
  return `
    <div class="card rounded-xl p-4 mb-4" data-mc-panel="${mode}" data-mc-key="${memberChangePanelDataKey(requests, mode)}">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${_titleOf(mode)}</h4>
        ${countHtml}
      </div>
      <div class="text-xs text-gray-500 mb-2">议事留痕：议程通过后自动派生，组织委员审批 → 书记确认 → 更新成员阶段</div>
      ${list.length === 0
        ? '<p class="text-xs text-gray-400 py-1">暂无待处理项</p>'
        : `<div class="divide-y divide-gray-50">
            ${list.map((r) => _rowHtml(r, mode, accent)).join('')}
          </div>`}
    </div>`;
}

/**
 * 绑定成员变更面板操作按钮（rebuild 后调用；内容已由 renderMemberChangePanelHtml 同步产物）。
 * approve/confirm 成功后 bumpToken('memberChangeRequests') → 渲染守卫键变 → 整卡重建（stale 修补）。
 * @param {HTMLElement|null} container — 面板卡根元素（[data-mc-panel=…]）
 * @param {{mode: 'org-approve'|'secretary-confirm', requests?: Object[], onDone?: () => void}} opts
 */
export function bindMemberChangePanel(container, { mode, requests = [], onDone } = {}) {
  if (!container) return;
  const refresh = () => { if (typeof onDone === 'function') onDone(); };

  container.querySelectorAll('.mcr-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('[data-mcr-id]');
      const id = row.dataset.mcrId;
      try {
        if (mode === 'org-approve') {
          await getAdapter().memberChangeRequests.approve(id);
          bumpToken('memberChangeRequests'); // P0（2026-09-08）：status 直写不改长度 → 显式 bump 供渲染守卫失效
          showToast('success', '已审批通过，广播已发送全体支委');
          // P2（2026-09-01 代码审查）：审批通过后发全员通知 = 广播送达证据（书记点验链路 ③「确认全体支委收到广播」）
          try {
            const r = requests.find((x) => x.id === id);
            const person = r && getPersonById(r.personId);
            const act = r && loadActivities().find((a) => a.id === r.activityId);
            NoticeStore.add({
              title: '成员变更已审批通过',
              content: `${person?.name || r?.personId || ''}：${r?.fromStage || ''}→${r?.toStage || ''} 已通过组织委员审批（${act?.title || '活动'}），待书记确认后更新发展阶段。`,
              priority: 'normal',
              targetUrl: 'workspace/secretary.html',
            });
          } catch (ne) {
            console.warn('[member-change-panel] 广播通知发送失败：', ne);
          }
        } else {
          await getAdapter().memberChangeRequests.confirm(id);
          bumpToken('memberChangeRequests'); // P0（2026-09-08）：status 直写不改长度 → 显式 bump 供渲染守卫失效
          showToast('success', '已确认，成员发展阶段已更新');
        }
        refresh();
      } catch (e) {
        console.warn('[member-change-panel] 操作失败：', e);
        showToast('error', e.message || '操作失败');
      }
    });
  });
}

/** 等高占位卡（灰块骨架/文案；frame 与真实卡同：card rounded-xl p-4 mb-4，防弹入下推） */
function _placeholderHtml(mode) {
  return `
    <div class="card rounded-xl p-4 mb-4" data-mc-panel="${mode}">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-title-cn text-sm font-bold text-gray-800">${_titleOf(mode)}</h4>
        <span class="text-xs text-gray-400">加载中…</span>
      </div>
      <div class="text-xs text-gray-500 mb-2">议事留痕：议程通过后自动派生，组织委员审批 → 书记确认 → 更新成员阶段</div>
      <div class="space-y-2">
        <div class="h-8 rounded-lg bg-gray-100 animate-pulse"></div>
        <div class="h-8 rounded-lg bg-gray-100 animate-pulse"></div>
      </div>
    </div>`;
}

/**
 * 异步兜底入口（无 onBeforeRender 预载的调用方用）：先同步写入等高占位卡（消除 0 高帧），
 * await 拉取后同 frame 内 fill 真实内容并绑定事件；结果同步回模块级缓存。
 * @param {HTMLElement} container
 * @param {{mode: 'org-approve'|'secretary-confirm', accent?: string, onDone?: () => void}} opts
 */
export async function renderMemberChangePanel(container, { mode, accent = '#B91C1C', onDone } = {}) {
  if (!container) return;
  container.innerHTML = _placeholderHtml(mode);
  let requests;
  try {
    requests = await getAdapter().memberChangeRequests.list();
  } catch (e) {
    console.warn('[member-change-panel] 申请列表加载失败：', e);
    requests = [];
  }
  _cache.requests = requests;
  _cache.loaded = true;
  container.innerHTML = renderMemberChangePanelHtml(requests, { mode, accent });
  bindMemberChangePanel(container, { mode, requests, onDone });
}
