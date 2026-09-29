// role: [工程师]+[AI]
// 党委工作台 Tab：支部配置 → 换组织向导（2026-09-06 支书 R3/R4：向导吸收合并原 party-config）
// 支书 2026-09-03 裁定：原「工作台配置」定位不对 + UI 过重 → 已移出支书日常台收拢党委台；本次再升级为
// 5 步引导式「换组织向导」（组织信息/模块块组合/角色分工/术语制度+工作单/验证与重置），
// 裸开关清单收进步骤②；主体渲染下沉共享组件 components/governance/org-setup-wizard.js
// （party-config 内容区 与 wizard.html 独立页 同源，防止两处未同步的情况）。
// 权限：党委台仅 party-staff 进入（canSwitchBranch 任意支部）；现任支书走独立页 wizard.html?branch=
// 写口：branch 服务既有校验语义（config 写口 = party-staff / 本支部现任支书）+ 即时生效留痕。

import { AuthStore } from '../../../services/core/auth.js?v=20260929d';
import { mountOrgSetupWizard } from '../../../components/governance/org-setup-wizard.js?v=20260929d';
import { getAuthToken, getApiBaseUrl, getDataSource } from '../../../data/data-adapter.js?v=20260929d';

// ════════════════════════════════════════════════════════════════
//  「部署与对接」面板（2026-09-29 批次 273 新增）
//  由来（支书）：「能不能用一个 wizard 界面，让我可以配置需要改变的内容！」
//  档位 = **A（只读状态 ＋ 可复制配置）**：
//    · 逐项显示「已配 / 未配」（服务端 `GET /api/v1/setup/setup-status` 只回**有没有**，**绝不回值**）；
//    · 列出「**你还需要改什么**」＋每条的怎么办；
//    · 给一段**可一键复制**的环境变量模板（只有键名与占位，不含任何真实值）；
//    · 密钥（口令等）**不入库、不回显**——这是本档的安全底线。
//  为什么放这里：党委台「支部配置」**只有 party-staff 能进**（服务端同门），且这是**部署期**用的东西，
//    不该出现在支部日常台。（刻意不做成新 tab/新页面：避免动页面与页签计数类守卫。）
// ════════════════════════════════════════════════════════════════
async function renderDeployPanel(host) {
  if (!host) return;
  if (getDataSource() !== 'api' || !getAuthToken()) {
    host.innerHTML = `<div class="rounded-lg border border-gray-200 bg-white p-4">
      <p class="text-xs text-gray-500">部署与对接 · 仅**服务端形态**可用（当前是只读演示形态，未接服务端）</p></div>`;
    return;
  }
  host.innerHTML = `<div class="rounded-lg border border-gray-200 bg-white p-4">
    <p class="text-xs text-gray-500">部署与对接 · 正在读取当前配置…</p></div>`;
  let data;
  try {
    const resp = await fetch(`${getApiBaseUrl()}/api/v1/setup/setup-status`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!resp.ok) {
      host.innerHTML = `<div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="text-xs text-red-600">读取失败（HTTP ${resp.status}）——本面板仅党委组织员可见</p></div>`;
      return;
    }
    data = await resp.json();
  } catch (e) {
    host.innerHTML = `<div class="rounded-lg border border-gray-200 bg-white p-4">
      <p class="text-xs text-red-600">读取失败：${String(e && e.message || e)}</p></div>`;
    return;
  }

  const bad = (data.checklist || []).filter((c) => !c.ok);
  // ⚠ 必须转义：`envTemplate` 里满是 `<强口令>` 这类占位符，直接进 innerHTML 会被浏览器当成标签**吃掉**
  //   （2026-09-29 批次 273 自查发现）。只转这三个字符即可，`<pre>` 里不需要更复杂的转义。
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const row = (label, okv, extra = '') =>
    `<li class="flex items-start gap-2 py-1"><span>${okv ? '✅' : '⚠'}</span>`
    + `<span class="text-gray-700">${label}</span>${extra ? `<span class="text-gray-400">${extra}</span>` : ''}</li>`;

  host.innerHTML = `
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <p class="text-xs text-gray-500">部署与对接 · 部署期/运维自查（只读，密钥一概不回显）</p>
      <p class="font-title-cn text-base font-bold text-gray-800 mt-0.5">
        ${bad.length === 0 ? '全部就绪' : `还需处理 ${bad.length} 项`}</p>

      <ul class="text-xs mt-2">
        ${row(`运行形态：${data.deploy.appEnv}`, data.deploy.appEnv === 'production',
          `Node ${data.deploy.node}`)}
        ${(data.checklist || []).map((c) => row(c.label, c.ok)).join('')}
      </ul>

      ${bad.length ? `<div class="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
        <p class="text-xs font-bold text-amber-800">你还需要改这些</p>
        <ol class="text-xs text-amber-900 mt-1 list-decimal pl-5 space-y-1">
          ${bad.map((c) => `<li><b>${c.label}</b><br>${c.howto}</li>`).join('')}
        </ol></div>` : ''}

      <div class="mt-3 text-xs text-gray-600">
        <p>库里现状：党委账号 <b>${data.db.partyStaff}</b> · 支部 <b>${data.db.branches}</b> ·
           已归属成员 <b>${data.db.members}</b> · 待确认归属 <b>${data.db.unassigned}</b> ·
           演示名册残留 <b>${data.db.demoAccounts}</b> · 库结构版本 v${data.db.schemaVersion}</p>
        <p class="mt-1 text-gray-500">${data.codeHint || ''}</p>
      </div>

      <div class="mt-3">
        <button id="pc-copy-env" class="text-xs px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50">
          复制环境变量模板</button>
        <span id="pc-copy-msg" class="text-xs text-green-700 ml-2"></span>
        <pre class="mt-2 text-[11px] leading-5 bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">${esc(data.envTemplate)}</pre>
      </div>
    </div>`;

  const btn = host.querySelector('#pc-copy-env');
  if (btn) {
    btn.addEventListener('click', async () => {
      const msg = host.querySelector('#pc-copy-msg');
      try {
        await navigator.clipboard.writeText(data.envTemplate || '');
        if (msg) msg.textContent = '已复制（粘到 /etc/gsm1921.env 再把 <…> 换成你的值）';
      } catch {
        if (msg) msg.textContent = '浏览器不允许自动复制，请手动选中上面的文本';
      }
    });
  }
}

export function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;

  if (el.dataset.currentTab !== 'party-config') {
    el.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-500">党委侧 · 换组织向导（吸收合并原「支部配置」；部署期/调整期使用，不在支部日常台出现）</p>
          <p class="font-title-cn text-base font-bold text-gray-800 mt-0.5">换组织向导 · 支部配置</p>
          <p class="text-xs text-gray-500 mt-1">其中<b>第③步「角色分工」</b>即支部分工编排（与支部侧「支部分工」tab 同源、同一数据）：</p>
          <p class="text-xs text-gray-500">· <b>支部日常</b>：支书工作台「支部分工」——调整走支委会议题表决后生效，分工变更自动派生责任人履职待办；</p>
          <p class="text-xs text-gray-500">· <b>党委/部署期</b>：本向导第③步可直接编排（换壳/新建支部时定基线），日常内政仍由支部自行调整。</p>
        </div>
        <div id="pc-wizard-host"></div>
        <div id="pc-deploy-panel"></div>
      </div>`;
    el.dataset.currentTab = 'party-config';
  }

  // 部署与对接面板（批次 273）：与向导**并列**、读服务端只读状态；挂在最后 ⇒ 不动既有 DOM 顺序与 e2e 选择器
  renderDeployPanel(el.querySelector('#pc-deploy-panel'));

  const host = el.querySelector('#pc-wizard-host');
  if (!host) return;
  // 党委台能力仅 party-staff 可见；组件内再按 actor 角色兜底（非 party-staff 渲染无权限卡）
  const me = (typeof AuthStore?.getCurrentUser === 'function') ? AuthStore.getCurrentUser() : null;
  mountOrgSetupWizard(host, {
    actor: { personId: me && (me.personId || me.id), role: me ? me.role : '' },
    canSwitchBranch: true,
    branchId: null, // 默认首支部
    embed: true,
  });
}
