// role: [工程师]+[AI]
// modules/branch-demo-nav.js — 党委「进入支部（演示）」导航门（立项⑦ B波，2026-09-06）
// 语义：治理总览/支部管理 的支部卡「进入支部」→ 以分支上下文打开该支部书记工作台（演示视图）。
// 演示形态 = 打开 secretary.html?branch=<id>（bootstrap 身份门放行 party-staff + branch 参数）。
//
// 放行边界（与 core/bootstrap.js 顶部注释同口径，双端一致）：
//   · 仅本地开发环境（localhost/127.0.0.1/::1）且非 API 登录（无 gsm1921-api-token）时放行；
//   · 真实后端登录 → 拒绝并提示「需对应用户身份」（演示视图只读、不得伪冒支部角色）；
//   · 页面侧 bootstrap 校验登录角色（仅 party-staff 可带 ?branch= 进入支部层页面）——
//     本模块不自行放行任何未登录 / 非 party-staff 会话（按钮只渲染在党委工作台=party-staff 已就位）。

import { getBranchById } from '../services/branch.js?v=20260908c';
import { showToast } from '../core/utils.js?v=20260908c';

// 演示目标页：支部书记工作台（演示形态固定 secretary.html；后续如需演示其他支委角色在此扩展）
const DEMO_PAGE = 'secretary.html';

// 与 bootstrap DEV_HOSTNAME_WHITELIST 同源（本地回环 = dev/demo 形态判定）
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function _isApiSession() {
  try { return !!sessionStorage.getItem('gsm1921-api-token'); } catch (_) { return false; }
}

/**
 * 校验并生成「进入支部（演示）」目标 URL（纯判定，不跳转）
 * @param {string} branchId
 * @returns {{ ok: true, url: string, branchName: string } | { ok: false, reason: string }}
 */
export function buildBranchDemoUrl(branchId) {
  if (!branchId) return { ok: false, reason: '缺少支部标识' };
  const branch = getBranchById(branchId);
  if (!branch) return { ok: false, reason: '支部不存在（可能已被移除）' };
  if (!LOCAL_HOSTS.has(window.location.hostname)) {
    return { ok: false, reason: '「进入支部（演示）」仅本地开发环境可用（localhost/127.0.0.1）' };
  }
  if (_isApiSession()) {
    return { ok: false, reason: '真实后端登录暂不支持演示视图——请以该支部对应角色账号（如支部书记）登录后进入支部层' };
  }
  return {
    ok: true,
    url: `./workspace/${DEMO_PAGE}?branch=${encodeURIComponent(branchId)}`,
    branchName: branch?.config?.headerTitle || branch?.name || branchId,
  };
}

/** 支部卡「进入支部（演示）」动作：校验通过跳转，否则 Toast 说明原因 */
export function openBranchDemo(branchId) {
  const res = buildBranchDemoUrl(branchId);
  if (!res.ok) {
    showToast('error', res.reason);
    return;
  }
  window.location.href = res.url;
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
