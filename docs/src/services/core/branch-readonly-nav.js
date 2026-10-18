// role: [工程师]+[AI]
// 党委只读查看支部：始终保留党委身份和显式 branchId 范围。
import { getBranchById } from '../branch/branch.js?v=20261018g';
import { showToast } from '../../core/base/utils.js?v=20261018g';

export function buildBranchReadOnlyUrl(branchId) {
  if (!branchId) return { ok: false, reason: '请先选择一个支部' };
  const branch = getBranchById(branchId);
  if (!branch) return { ok: false, reason: '支部不存在或已停用' };
  return {
    ok: true,
    url: `./workspace/branch-readonly.html?branchId=${encodeURIComponent(branchId)}`,
    branchName: branch.config?.headerTitle || branch.name || branchId,
  };
}

export function openBranchReadOnly(branchId) {
  const target = buildBranchReadOnlyUrl(branchId);
  if (!target.ok) {
    showToast('error', target.reason);
    return;
  }
  window.location.assign(target.url);
}

export function bindBranchReadOnlyButtons(root) {
  root?.querySelectorAll('.branch-readonly-enter[data-branch-id]').forEach((button) => {
    button.addEventListener('click', () => openBranchReadOnly(button.dataset.branchId));
  });
}

export function isPartyStaffBranchReadOnlyAllowed(role, page, branchId) {
  return role === 'party-staff'
    && String(page || '').split('/').pop().replace(/\.html$/, '') === 'branch-readonly'
    && !!branchId;
}

/** Workspace shells no longer support cross-role drilldown. Kept for stale callers during migration. */
export function isReadonlyBranchDrilldown() {
  return false;
}
