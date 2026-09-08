// role: [工程师]+[AI]
// entries/wizard-entry.js — 换组织向导独立页入口（2026-09-06 书记 R3/R4 裁定）
// 登录态感知（权限轨 A/B，写口校验同 branch 服务既有语义）：
//   · 现任书记（role=secretary 且为目标支部 secretaryId）→ 限本支部（?branch=br-b1 直达；不新增书记台常驻 tab）
//   · 党委（party-staff）→ 任意支部可选（canSwitchBranch）
//   · 未登录 / 其它角色 / 非现任书记 → 提示卡（无权限不渲染向导）
// 主体共用 components/org-setup-wizard.js（party-config tab 同源）。
import { BranchService } from '../services/runtime.js?v=20260908d'; // 副作用注册适配器 + BranchService 绑定（loadDB）
import { registerApiAdapter, setDataSource, init } from '../core/data-adapter.js?v=20260908d';
import { ApiAdapter } from '../core/api-adapter.js?v=20260908d';
import { AuthStore } from '../services/auth.js?v=20260908d';
import { getBranchById, getBranchIdOfPerson } from '../services/branch.js?v=20260908d';
import { mountOrgSetupWizard } from '../components/org-setup-wizard.js?v=20260908d';
import { renderSidebar } from '../components/sidebar.js?v=20260908d';
import { renderHeader } from '../components/header.js?v=20260908d';
import { escHtml as esc } from '../core/utils.js?v=20260908d';

renderSidebar('wizard');
renderHeader('wizard');

// 数据层初始化：已登录且有 token 时切 API 数据源；否则恢复本地 mock（同 search/notice 等独立页）
registerApiAdapter(ApiAdapter);
const savedToken = sessionStorage.getItem('gsm1921-api-token');
if (savedToken) {
  setDataSource('api', { apiBaseUrl: '', authToken: savedToken });
  try {
    await init();
  } catch (e) {
    console.warn('[wizard] API 数据加载失败，回退本地 mock', e);
    setDataSource('mock');
  }
} else {
  // 本地 mock：统一走 BranchService.loadDB()（可改 reset/init 触发链 + init 态种子过滤）。
  // 不再直连 data-adapter.init() mock 分支（其 adapter.loadDB() 直连 MockAdapter.loadDB，
  // 绕过 init 档检测与演示种子剔除——?reset=init 后的空支部态在本页会回填演示数据，2026-09-08 C2 收口）。
  try {
    BranchService.loadDB();
  } catch (e) {
    console.warn('[wizard] mock 数据加载失败', e);
  }
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

/** 提示卡渲染（未登录/无权限/非现任书记共用） */
function showNotice(html) {
  if (!content) return;
  content.innerHTML = `<div class="rounded-xl border border-gray-200 bg-white p-6 max-w-xl">${html}</div>`;
}

if (!me) {
  showNotice(`
    <p class="font-title-cn text-sm font-bold text-gray-800">请先登录</p>
    <p class="text-xs text-gray-500 mt-1">换组织向导需要登录态：党委组织员可配置任意支部；现任书记可直达本支部（wizard.html?branch=自己的支部）。</p>
    <div class="flex gap-2 mt-3">
      <a href="./login.html" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style="background:#C8102E;">去登录</a>
      <a href="./index.html" class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">返回主页</a>
    </div>
    <p class="text-[11px] text-gray-400 mt-3">开发演示：本地访问可用 <code class="text-[10px] bg-gray-100 px-1 py-0.5 rounded">?dev=party-staff</code> 或 <code class="text-[10px] bg-gray-100 px-1 py-0.5 rounded">?dev=secretary</code> 快速进入。</p>`);
} else if (me.role === 'party-staff') {
  // 权限轨 B：党委（party-staff）→ 任意支部可选
  const target = reqBranch && getBranchById(reqBranch) ? reqBranch : null;
  mountOrgSetupWizard(content, { actor: me, canSwitchBranch: true, branchId: target, embed: false });
} else if (me.role === 'secretary') {
  // 权限轨 A：现任书记 → 限本支部（独立 URL 直达；非本支部 → 提示）
  const own = getBranchIdOfPerson(me.personId);
  const branch = getBranchById(own);
  if (reqBranch && reqBranch !== own) {
    showNotice(`
      <p class="font-title-cn text-sm font-bold text-gray-800">仅限本支部</p>
      <p class="text-xs text-gray-500 mt-1">现任书记只能配置自己的支部（${esc(own)}）；请求的支部「${esc(reqBranch)}」不在权限范围。</p>
      <a href="./wizard.html?branch=${esc(own)}" class="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style="background:#C8102E;">进入本支部向导</a>`);
  } else if (!branch || branch.secretaryId !== me.personId) {
    showNotice(`
      <p class="font-title-cn text-sm font-bold text-gray-800">非现任书记</p>
      <p class="text-xs text-gray-500 mt-1">本支部的配置权限归现任书记（secretaryId 匹配）；当前账号不满足，无法进入向导。</p>`);
  } else {
    mountOrgSetupWizard(content, { actor: me, canSwitchBranch: false, branchId: own, embed: false });
  }
} else {
  showNotice(`
    <p class="font-title-cn text-sm font-bold text-gray-800">无配置权限</p>
    <p class="text-xs text-gray-500 mt-1">换组织向导配置权限：党委组织员（party-staff）任意支部、现任书记本支部；当前角色（${esc(ROLE_LABEL(me.role))}）不在权限范围。</p>
    <a href="./index.html" class="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">返回主页</a>`);
}

/** 角色名（轻量本地映射，避免整表 import constants——与 auth 展示一致） */
function ROLE_LABEL(role) {
  const MAP = {
    'secretary': '党支部书记', 'deputy-secretary': '党支部副书记',
    'org-commissioner': '组织委员', 'prop-commissioner': '宣传委员',
    'disc-commissioner': '纪检委员', 'leader': '党小组组长',
    'participant': '普通参与者', 'party-staff': '党委组织员',
  };
  return MAP[role] || role;
}
