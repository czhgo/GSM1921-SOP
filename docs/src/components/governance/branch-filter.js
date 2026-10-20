// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/branch-filter.js — 「支部筛选」下拉（党委台「全院治理」组各页**共用**）
// ════════════════════════════════════════════════════════════════
// 2026-10-04 批次 374 · 支书 `#10` 单一轴（支书圈**甲**）：支书逐字「**如果叫全院治理，那就按照下设支部
//   筛选信息。**」⇒ 该组的信息页页首加「支部筛选」下拉（**全部支部** ＋ 各支部），选中后各页只出该支部的行。
// **组件复用律**（`D-765` ⑤）：当前支部筛选由党委台「支部审核」「下发通知」「支部监控」三页共用——不各写一份。
// 体例：筛选一律用**下拉**（禁 chip，规范 §筛选）；选择随模块自持（同 `list-filter` 的 `stateKey` 体例）
//   ⇒ 页内重绘不丢选择。支部管理页自身就是支部目录，因此不重复挂筛选。
import { mockDB } from '../../core/domain/domain.js?v=20261020e';
import { escHtml } from '../../core/base/utils.js?v=20261020e';

/** `stateKey` → 当前选中支部 id。API 模式的范围放在 URL，便于整页共用。 */
const _selected = new Map();

/** 取当前选中支部 id；页面重载后从 URL 恢复。 */
export function getBranchFilter(stateKey) {
  // F11（2026-10-20）：显式清除（''）也是有效选择，不能被 `||` 回退成 URL 里的旧值。
  // 判据用 Map.has：有记录（含空串）即以记忆为准；无记录才读 URL。
  if (_selected.has(stateKey)) return _selected.get(stateKey);
  return typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('branchId') || ''
    : '';
}

/** 支部名（与生产口径同源：`config.headerTitle` 优先） */
function _label(b) {
  return b?.config?.headerTitle || b?.name || b?.id || '';
}

/**
 * 渲染「支部筛选」下拉到宿主机。
 * @param {HTMLElement} host
 * @param {Object} opts
 * @param {string} opts.stateKey — 各页唯一（选择随它记忆）
 * @param {Function} [opts.onChange] — 选中变化后回调（通常＝重渲本页）
 * @param {string} [opts.tabId] — API 模式整页跳转时写入 `?tab=`（缺省沿用当前 URL）。
 *   2026-10-20 IA A05：支部管理页的筛选迁入后必须留在本页（登录缺省 tab 已改为 review），
 *   故调用点显式传 `tabId: 'branches'`；未传者行为不变。
 */
export function renderBranchFilter(host, { stateKey, onChange, tabId } = {}) {
  if (!host || !stateKey) return;
  const branches = mockDB.branches || [];
  const cur = getBranchFilter(stateKey);
  const apiMode = document.documentElement.dataset.dataSource === 'api';
  host.innerHTML = `
    <div class="lf-bar flex items-center gap-2">
      <label class="text-xs text-gray-500 shrink-0" for="${escHtml(stateKey)}-branch-select">支部筛选</label>
      <select id="${escHtml(stateKey)}-branch-select" class="input-flat text-xs">
        <option value=""${cur ? '' : ' selected'}>${apiMode ? '选择支部查看明细' : `全部支部（${branches.length}）`}</option>
        ${branches.map(b => `<option value="${escHtml(b.id)}"${b.id === cur ? ' selected' : ''}>${escHtml(_label(b))}</option>`).join('')}
      </select>
    </div>`;
  host.querySelector('select')?.addEventListener('change', (e) => {
    const selected = e.target.value || '';
    _selected.set(stateKey, selected);
    if (apiMode) {
      const url = new URL(window.location.href);
      if (tabId) url.searchParams.set('tab', tabId);
      if (selected) url.searchParams.set('branchId', selected);
      else url.searchParams.delete('branchId');
      window.location.assign(url.toString());
      return;
    }
    // F11：mock 形态清除筛选时也删 URL 参数——否则下次重载又按 URL 旧值恢复出「清不掉」的筛选。
    // 用 replaceState（不跳转、不新增历史），与 CrossPageState.clearParam 同体例。
    try {
      const url = new URL(window.location.href);
      if (selected) url.searchParams.set('branchId', selected);
      else url.searchParams.delete('branchId');
      window.history.replaceState({}, '', url);
    } catch (_) { /* 非浏览器 / 老浏览器：忽略 */ }
    onChange?.();
  });
}

/** 按当前筛选过的支部过滤行（缺失 branchId 的旧记录沿用服务端兼容默认 br-b1） */
export function filterByBranch(rows, stateKey) {
  const fid = getBranchFilter(stateKey);
  if (!fid) return rows;
  return (rows || []).filter(r => r && String(r.branchId || 'br-b1') === fid);
}
