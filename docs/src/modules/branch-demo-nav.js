// role: [工程师]+[AI]
// modules/branch-demo-nav.js — 党委「进入支部（演示）」导航门（立项⑦ B波，2026-09-06）
// 语义：治理总览/支部管理 的支部卡「进入支部」→ 以分支上下文打开该支部书记工作台（演示视图）。
// 演示形态 = 打开 secretary.html?branch=<id>（bootstrap 身份门放行 party-staff + branch 参数）。
//
// 放行边界（与 core/bootstrap.js 身份门同口径，双端一致）：
//   · 仅本地开发环境（localhost/127.0.0.1/::1）放行；
//   · 真实后端登录（API 会话）同样放行（书记 2026-09-10 裁定 A⑤：党委应能下钻查看支部只读视图）——
//     下钻视图为「只读查看」，写操作仍由角色权限层拒绝（见下「看≠做」口径）；
//   · 页面侧 bootstrap 校验登录角色（仅 party-staff 可带 ?branch= 进入支部层页面）——
//     本模块不自行放行任何未登录 / 非 party-staff 会话（按钮只渲染在党委工作台=party-staff 已就位）。
//
// 「看≠做」口径（依据 content/02_institution/SYSTEM_ROLE_PERMISSION.md 角色矩阵 +
// PARTY_COMMITTEE_DESIGN.md 党委监控为只读监督）：party-staff 属组织级角色、不入支部业务角色矩阵
// （auth.js ROLE_PERMISSIONS 无 party-staff 键）→ 可见 ≠ 可写；本模块只放开「进入支部」的可见性
// 放行（只读），不放宽任何写权限（requiredRoles / 权限键一律不动）。

import { getBranchById } from '../services/branch.js?v=20260912f';
import { showToast } from '../core/utils.js?v=20260912f';
import { AuthStore } from '../services/auth.js?v=20260912f';
import { CrossPageState } from '../core/cross-page-state.js?v=20260912f';

// 演示目标页：支部书记工作台（演示形态固定 secretary.html；后续如需演示其他支委角色在此扩展）
const DEMO_PAGE = 'secretary.html';

// 与 bootstrap DEV_HOSTNAME_WHITELIST 同源（本地回环 = dev/demo 形态判定）
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * 校验并生成「进入支部（演示）」目标 URL（纯判定，不跳转；仅供本模块内部与 openBranchDemo 使用）
 * @param {string} branchId
 * @returns {{ ok: true, url: string, branchName: string } | { ok: false, reason: string }}
 */
function buildBranchDemoUrl(branchId) {
  if (!branchId) return { ok: false, reason: '缺少支部标识' };
  const branch = getBranchById(branchId);
  if (!branch) return { ok: false, reason: '支部不存在（可能已被移除）' };
  if (!LOCAL_HOSTS.has(window.location.hostname)) {
    return { ok: false, reason: '「进入支部（演示）」仅本地开发环境可用（localhost/127.0.0.1）' };
  }
  // API 会话不再拒绝（书记 2026-09-10 裁定 A⑤）：党委在真实后端登录下同样可下钻查看支部只读视图，
  // 写操作由角色权限层拒绝（party-staff 不在支部业务角色矩阵，无任何写权限键）。
  return {
    ok: true,
    url: `./workspace/${DEMO_PAGE}?branch=${encodeURIComponent(branchId)}`,
    branchName: branch?.config?.headerTitle || branch?.name || branchId,
  };
}

/** 支部卡「进入支部（演示）」动作：校验通过跳转，否则 Toast 说明原因（仅 bindBranchDemoButtons 内部调用） */
function openBranchDemo(branchId) {
  const res = buildBranchDemoUrl(branchId);
  if (!res.ok) {
    showToast('error', res.reason);
    return;
  }
  window.location.href = res.url;
}

/** 页面名归一化（bootstrap 侧 currentPage 已剥 .html 后缀；此处两侧同归一，避免恒不匹配） */
const _normPage = (p) => String(p || '').replace(/\.html$/, '');

/**
 * 页面门（与「进入支部（演示）」按钮同口径，双端一致）：
 * party-staff 携带 ?branch= 打开支部层演示页面时的最小放行判定。
 * 纯判定（不读支部数据，规避 bootstrap 期数据未加载误判）；受控条件：
 *   role=party-staff · 目标页=DEMO_PAGE · 本地回环 host · branch 参数非空。
 * 会话形态（本地示例 / 真实后端 API 登录）不参与判定——两者同口径放行（只读，
 * 写操作由角色权限层拒绝；见文件头「看≠做」口径）。其余角色/会话一律 false（不新增越权放行）。
 * @param {string} role - 登录角色
 * @param {string} page - 当前页面（可带/不带 .html）
 * @param {string} [branchId] - URL ?branch= 支部标识
 * @returns {boolean}
 */
export function isPartyStaffBranchDemoAllowed(role, page, branchId) {
  if (role !== 'party-staff') return false;
  if (_normPage(page) !== _normPage(DEMO_PAGE)) return false;
  if (!branchId) return false;
  if (!LOCAL_HOSTS.has(window.location.hostname)) return false;
  return true;
}

/**
 * 当前会话是否处于「党委下钻支部的演示只读视图」（B1 2026-09-12）。
 * 判定单一源复用 isPartyStaffBranchDemoAllowed（role=当前登录角色 · page=当前页 · ?branch=），
 * 供支部层页面（如书记台各 tab）隐藏/禁用写入口；提交处另加显式拒绝兜底。
 * 浏览器外（无 window）返回 false（node 测试安全）。
 * @returns {boolean}
 */
export function isReadonlyBranchDrilldown() {
  try {
    const role = AuthStore.getCurrentUser()?.role || null;
    const page = (window.location.pathname.split('/').pop() || '');
    const branchId = CrossPageState.getParam('branch');
    return isPartyStaffBranchDemoAllowed(role, page, branchId);
  } catch (_) {
    return false;
  }
}

/**
 * 绑定容器内所有「进入支部（演示）」按钮（.branch-demo-enter[data-branch-id]）
 * @param {HTMLElement} root 已渲染 tab 内容的容器元素
 */
export function bindBranchDemoButtons(root) {
  if (!root) return;
  root.querySelectorAll('.branch-demo-enter').forEach((btn) => {
    btn.addEventListener('click', () => openBranchDemo(btn.dataset.branchId));
  });
}
