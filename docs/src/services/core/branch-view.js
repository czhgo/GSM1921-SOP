// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/core/branch-view.js — 党委台「进入某支部」只读查看（T14 · 2026-11-15）
// ════════════════════════════════════════════════════════════════
// 由来（`.trae/specs/close-six-dim-gaps/spec.md` Q10/Q13/Q14）：
//   党委进入某支部后只能看、不能改；留痕（谁 / 何时 / 哪个支部）＋ 一键退出；
//   只读强制在服务端（`server/branch-view.js`），本模块只做门面与顶栏常驻提示（H32）。
// 口径：
//   · 上下文形状与服务端 `viewContext` 同形：`{ branchId, branchName, enteredBy, visitId }` 或 null；
//   · 所有读写只经 `getAdapter().branchVisits`（api / mock 两形态同形），不在页面自造标志；
//   · 顶栏常驻条由 `components/shell/header.js` 在党委身份下调用本模块渲染。

import { getAdapter } from '../../data/data-adapter.js?v=20261120a';
import { readLoginSnapshot } from '../../core/session/login-snapshot.js?v=20261120a';
import { escHtml as esc, getBasePath, showToast } from '../../core/base/utils.js?v=20261120a';
import { pageHref } from '../../core/base/page-url.js?v=20261120a';

function describeError(error) {
  return String(error?.body?.error || error?.message || '服务暂不可用');
}

/** 当前会话是否处于「进入支部只读查看」；非党委身份恒 null（不请求） */
export async function loadBranchViewContext(role) {
  const currentRole = role || readLoginSnapshot()?.role;
  if (currentRole !== 'party-staff') return null;
  try {
    const context = await getAdapter().branchVisits.context();
    return context && context.branchId ? context : null;
  } catch (error) {
    console.warn('[branch-view] 读取查看上下文失败', error);
    return null;
  }
}

/** 进入只读查看（写一条留痕）；失败返回原因，由调用方决定是否阻断导航 */
export async function enterBranchView(branchId) {
  const id = String(branchId || '').trim();
  if (!id) return { ok: false, reason: '请先选择一个支部' };
  try {
    const visit = await getAdapter().branchVisits.enter(id);
    return { ok: true, visit };
  } catch (error) {
    // 本会话已有一条未退出留痕（服务端 409，一个 token 只允许一条）：
    //   同一支部视为「已进入」不重复留痕；其他支部明确拒绝，不静默换上下文。
    if (error?.status === 409 || error?.type === 'ConflictError') {
      const current = await loadBranchViewContext('party-staff');
      if (current && current.branchId === id) return { ok: true, visit: current, reused: true };
    }
    return { ok: false, reason: describeError(error) };
  }
}

/** 退出只读查看（置 exited_at）；成功后回党委台支部管理页 */
export async function exitBranchView(context) {
  if (!context?.visitId) return { ok: false, reason: '没有可退出的查看记录' };
  try {
    await getAdapter().branchVisits.exit(context.visitId);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: describeError(error) };
  }
}

/**
 * 顶栏常驻条：党委身份且处于查看态时，显示「正在查看 X 支部（只读）」＋ 一键退出。
 * 槽位由 `header.js` 预置（`#branch-view-slot`），本函数只填内容；无查看态即清空。
 */
export async function renderBranchViewBanner(header, { role = '' } = {}) {
  const slot = header?.querySelector('#branch-view-slot');
  if (!slot) return;
  const context = await loadBranchViewContext(role);
  if (!context) {
    slot.innerHTML = '';
    return;
  }
  slot.innerHTML = `
    <span class="text-[11px]" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:var(--radius-sm);background:var(--party-gold);color:var(--neutral-900);line-height:16px;white-space:nowrap;">
      <span>正在查看 ${esc(context.branchName || context.branchId)} 支部（只读）</span>
      <button id="branch-view-exit" type="button" class="btn-text" style="color:var(--neutral-900);">退出查看 ›</button>
    </span>`;
  const button = slot.querySelector('#branch-view-exit');
  button?.addEventListener('click', async () => {
    button.disabled = true;
    const result = await exitBranchView(context);
    if (!result.ok) {
      button.disabled = false;
      showToast('error', `退出查看失败：${result.reason}`);
      return;
    }
    showToast('success', '已退出只读查看，写能力已恢复。');
    window.location.assign(pageHref(`${getBasePath()}workspace/party-committee.html?tab=branches`));
  });
}
