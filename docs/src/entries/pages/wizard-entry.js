// role: [工程师]+[AI]
// entries/pages/wizard-entry.js — 换组织向导独立页入口（2026-09-06 支书 R3/R4 裁定）
// 登录态感知（权限轨 A/B，写口校验同 branch 服务既有语义）：
//   · 现任支书（role=secretary 且为目标支部 secretaryId）→ 限本支部（?branch=br-b1 直达；不新增支书台常驻 tab）
//   · 党委（party-staff）→ 任意支部可选（canSwitchBranch）
//   · 未登录 / 其它角色 / 非现任支书 → 提示卡（无权限不渲染向导）
// 主体共用 components/governance/org-setup-wizard.js（party-config tab 同源）。
import { BranchService } from '../../services/core/runtime.js?v=20261005c'; // 副作用注册适配器 + BranchService 绑定（loadDB）
import { hydrateDataSource } from '../../data/data-adapter.js?v=20261005c';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261005c';
import { AuthStore } from '../../services/core/auth.js?v=20261005c';
import { getBranchById, getBranchIdOfPerson } from '../../services/branch/branch.js?v=20261005c';
import { mountOrgSetupWizard } from '../../components/governance/org-setup-wizard.js?v=20261005c';
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261005c';
import { renderHeader } from '../../components/shell/header.js?v=20261005c';
import { escHtml as esc } from '../../core/base/utils.js?v=20261005c';

renderSidebar('wizard');
renderHeader('wizard');

// 数据层初始化（P0-2 2026-09-23 收敛）：判定唯一源＝data/data-adapter.js::hydrateDataSource——
// 有 token 走 api、**失败即失败**（「无法连接服务器」错误态 + 重试，不再静默回退可写 mock＝静默丢单）；
// 无 token（同 search/notice 等独立页）走本地 mock。本地 mock 仍统一走 BranchService.loadDB()
// （可改 reset/init 触发链 + init 态种子过滤；不再直连 data-adapter.init() mock 分支，2026-09-08 C2 收口）。
try {
  await hydrateDataSource({
    apiAdapter: ApiAdapter,
    loadMock: () => { try { BranchService.loadDB(); } catch (e) { console.warn('[wizard] mock 数据加载失败', e); } },
  });
} catch (e) {
  console.warn('[wizard] 数据层初始化异常', e);
}

const content = document.getElementById('wizard-content');
const me = AuthStore.getCurrentUser();
const params = new URLSearchParams(location.search);
const reqBranch = params.get('branch');

// 开发演示快捷入口：未登录时本地访问 ?dev=party-staff / ?dev=secretary 直接以该角色进入
// （与 bootstrap 的 dev 绕过同语义；独立页不走 bootstrapPage，此处按需轻量实现）
if (!me) {
  const devRole = params.get('dev');
  const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (devRole && isLocalHost && ['party-staff', 'secretary'].includes(devRole)) {
    AuthStore.devLogin(devRole);
    params.delete('dev');
    const qs = params.toString();
    location.replace('./wizard.html' + (qs ? `?${qs}` : ''));
  }
}

/** 提示卡渲染（未登录/无权限/非现任支书共用） */
function showNotice(html) {
  if (!content) return;
  content.innerHTML = `<div class="rounded-xl border border-gray-200 bg-white p-6 max-w-xl">${html}</div>`;
}

if (!me) {
  showNotice(`
    <p class="font-title-cn text-sm font-bold text-gray-800">请先登录</p>
    <p class="text-xs text-gray-500 mt-1">换组织向导需要登录态：党委组织员可配置任意支部；现任支书可直达本支部（wizard.html?branch=自己的支部）。</p>
    <div class="flex gap-2 mt-3">
      <a href="./login.html" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style="background:var(--party-red);">去登录</a>
      <a href="./index.html" class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">返回主页</a>
    </div>
    <p class="text-[11px] text-gray-600 mt-3">开发演示：本地访问可用 <code class="text-[11px] bg-gray-100 px-1 py-0.5 rounded">?dev=party-staff</code> 或 <code class="text-[11px] bg-gray-100 px-1 py-0.5 rounded">?dev=secretary</code> 快速进入。</p>`);
} else if (me.role === 'party-staff') {
  // 权限轨 B：党委（party-staff）→ 任意支部可选
  const target = reqBranch && getBranchById(reqBranch) ? reqBranch : null;
  mountOrgSetupWizard(content, { actor: me, canSwitchBranch: true, branchId: target, embed: false });
} else if (me.role === 'secretary') {
  // 权限轨 A：现任支书 → 限本支部（独立 URL 直达；非本支部 → 提示）
  const own = getBranchIdOfPerson(me.personId);
  const branch = getBranchById(own);
  if (reqBranch && reqBranch !== own) {
    showNotice(`
      <p class="font-title-cn text-sm font-bold text-gray-800">仅限本支部</p>
      <p class="text-xs text-gray-500 mt-1">现任支书只能配置自己的支部（${esc(own)}）；请求的支部「${esc(reqBranch)}」不在权限范围。</p>
      <a href="./wizard.html?branch=${esc(own)}" class="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style="background:var(--party-red);">进入本支部向导</a>`);
  } else if (!branch || branch.secretaryId !== me.personId) {
    showNotice(`
      <p class="font-title-cn text-sm font-bold text-gray-800">非现任支书</p>
      <p class="text-xs text-gray-500 mt-1">本支部的配置权限归现任支书（secretaryId 匹配）；当前账号不满足，无法进入向导。</p>`);
  } else {
    mountOrgSetupWizard(content, { actor: me, canSwitchBranch: false, branchId: own, embed: false });
  }
} else {
  showNotice(`
    <p class="font-title-cn text-sm font-bold text-gray-800">无配置权限</p>
    <p class="text-xs text-gray-500 mt-1">换组织向导配置权限：党委组织员（party-staff）任意支部、现任支书本支部；当前角色（${esc(ROLE_LABEL(me.role))}）不在权限范围。</p>
    <a href="./index.html" class="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">返回主页</a>`);
}

/** 角色名（轻量本地映射，避免整表 import constants——与 auth 展示一致） */
function ROLE_LABEL(role) {
  const MAP = {
    'secretary': '支书', 'deputy-secretary': '副支书',
    'org-commissioner': '组织委员', 'prop-commissioner': '宣传委员',
    'disc-commissioner': '纪检委员', 'leader': '党小组组长',
    'participant': '普通参与者', 'party-staff': '党委组织员',
  };
  return MAP[role] || role;
}
