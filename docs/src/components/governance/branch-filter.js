// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/branch-filter.js — 「支部筛选」下拉（党委台「全院治理」组各页**共用**）
// ════════════════════════════════════════════════════════════════
// 2026-10-04 批次 374 · 支书 `#10` 单一轴（支书圈**甲**）：支书逐字「**如果叫全院治理，那就按照下设支部
//   筛选信息。**」⇒ 该组的信息页页首加「支部筛选」下拉（**全部支部** ＋ 各支部），选中后各页只出该支部的行。
// **组件复用律**（`D-765` ⑤）：三页（支部上报 / 匿名反馈核查 / 下发通知）**共用本件**——**不各写一份**。
// 体例：筛选一律用**下拉**（禁 chip，规范 §筛选）；选择随模块自持（同 `list-filter` 的 `stateKey` 体例）
//   ⇒ 页内重绘不丢选择。**豁免**：支部监控台账（本就是逐支部卡）与支部管理（它本身就是支部清单）。
import { mockDB } from '../../core/domain/domain.js?v=20261005l';

/** `stateKey` → 当前选中支部 id（''＝全部）。模块级自持。 */
const _selected = new Map();

/** 取当前选中的支部 id（''＝全部支部） */
export function getBranchFilter(stateKey) {
  return _selected.get(stateKey) || '';
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
 */
export function renderBranchFilter(host, { stateKey, onChange } = {}) {
  if (!host || !stateKey) return;
  const branches = mockDB.branches || [];
  const cur = getBranchFilter(stateKey);
  host.innerHTML = `
    <div class="lf-bar flex items-center gap-2">
      <label class="text-xs text-gray-500 shrink-0" for="${stateKey}-branch-select">支部筛选</label>
      <select id="${stateKey}-branch-select" class="input-flat text-xs">
        <option value=""${cur ? '' : ' selected'}>全部支部（${branches.length}）</option>
        ${branches.map(b => `<option value="${b.id}"${b.id === cur ? ' selected' : ''}>${_label(b)}</option>`).join('')}
      </select>
    </div>`;
  host.querySelector('select')?.addEventListener('change', (e) => {
    _selected.set(stateKey, e.target.value || '');
    onChange?.();
  });
}

/** 按当前筛选过的支部过滤行（`''`＝不过滤；行 `branchId` 缺失时**仅在未筛选时**保留，避免静默丢行） */
export function filterByBranch(rows, stateKey) {
  const fid = getBranchFilter(stateKey);
  if (!fid) return rows;
  return (rows || []).filter(r => !r || !r.branchId || r.branchId === fid);
}
