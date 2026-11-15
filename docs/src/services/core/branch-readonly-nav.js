// role: [工程师]+[AI]
// 党委只读查看支部：始终保留党委身份和显式 branchId 范围。
import { getBranchById } from '../branch/branch.js?v=20261110b';
import { showToast } from '../../core/base/utils.js?v=20261110b';
import { pageHref } from '../../core/base/page-url.js?v=20261110b';

export function buildBranchReadOnlyUrl(branchId) {
  if (!branchId) return { ok: false, reason: '请先选择一个支部' };
  const branch = getBranchById(branchId);
  if (!branch) return { ok: false, reason: '支部不存在或已停用' };
  return {
    ok: true,
    url: pageHref(`./workspace/branch-readonly.html?branchId=${encodeURIComponent(branchId)}`),
    branchName: branch.config?.headerTitle || branch.name || branchId,
  };
}

export async function openBranchReadOnly(branchId) {
  const target = buildBranchReadOnlyUrl(branchId);
  if (!target.ok) {
    showToast('error', target.reason);
    return;
  }
  // T14（2026-11-15）：进入前先写一条服务端留痕；留痕失败不阻断只读视图本身（该页无写口），
  //   但服务端只读门不会生效——失败时明确提示，不静默降级。
  try {
    const { enterBranchView } = await import('./branch-view.js?v=20261110b');
    const entered = await enterBranchView(branchId);
    if (!entered.ok) {
      showToast('error', `无法进入只读查看：${entered.reason}`);
      return;
    }
  } catch (error) {
    console.warn('[branch-readonly] 进入留痕失败', error);
    showToast('error', '无法写入查看留痕：请检查服务连接后重试');
    return;
  }
  window.location.assign(target.url);
}

export function bindBranchReadOnlyButtons(root) {
  root?.querySelectorAll('.branch-readonly-enter[data-branch-id]').forEach((button) => {
    // T14：入口可能是 `<a href>`（如支部配置页的旧锚点）——必须拦掉默认导航，
    //   否则会出现「先跳页、留痕未写成」的旁路：进入支部必留痕、必只读。
    button.addEventListener('click', (event) => {
      event?.preventDefault?.();
      void openBranchReadOnly(button.dataset.branchId);
    });
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
