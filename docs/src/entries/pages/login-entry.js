// role: [工程师]+[AI]
// login-entry.js — 登录页入口（重构版）
// 支持: 账号密码 Mock 校验 + 开发模式直接选身份

import { AuthStore } from '../../services/core/auth.js?v=20261006c';
import { getAccentColors, solidAccentStyle, dotDarkVars, isBranchPendingUser } from '../../core/domain/constants.js?v=20261006c';
import { escHtml } from '../../core/base/utils.js?v=20261006c';

// 2026-09-29 批次 277（IAAA 入站）：带 `#iaaa=<会话 token>` 回跳时先走落地流程，
//   不走「已登录直接跳工作台」；**待归属支部**者也不跳（由选支部面板承接）。
//   判据单一源＝`domain/constants.js::isBranchPendingUser`（与 `core/boot/bootstrap.js` 同源）。
const _IAAA_HASH = /[#&]iaaa=/.test(window.location.hash || '');
const _user = AuthStore.getCurrentUser();
if (!_IAAA_HASH && !isBranchPendingUser(_user)) {
  if (_user) _goToWorkspace(_user.role);
}

// 登录成功后按角色直达对应工作台（最小三成本：登录→工作台 ≤2 跳）
// 2026-08-24 最小三成本专项评议 P2 修复：原固定跳首页，改为直达角色工作台
// 2026-08-29 T-304 遗留修复：page 规范化补 .html 后缀（防御内嵌视图剥后缀导致的 404）
function _goToWorkspace(role) {
  const raw = AuthStore.getPageForRole('workspace', role);
  const page = raw && !raw.endsWith('.html') ? raw + '.html' : raw;
  if (page) {
    window.location.href = `./workspace/${page}`;
  } else {
    window.location.href = './index.html';
  }
}

// ── 开发模式卡片数据 ──────────────────────────────
const DEV_CARDS = [
  { role: 'party-staff',       label: '党委组织员',   desc: '党务老师 · 治理总览·监控全院支部' },
  { role: 'secretary',         label: '支书',   desc: '组织统筹决策' },
  { role: 'deputy-secretary',  label: '副支书', desc: '协助支书工作' },
  { role: 'org-commissioner',  label: '组织委员',     desc: '人才库' },
  { role: 'prop-commissioner', label: '宣传委员',     desc: '宣传档案' },
  { role: 'disc-commissioner', label: '纪检委员',     desc: '考勤考察' },
  { role: 'leader',            label: '党小组组长',   desc: '活动统筹' },
  // 2026-09-21 批次 139（D-571）：副组长＝与组长可区分的第二个身份、同一套工作台（任务优先给组长）
  { role: 'deputy-leader',     label: '党小组副组长', desc: '同组长工作台 · 任务优先给组长' },
  { role: 'participant',       label: '普通参与者',   desc: '查看信息' },
];

// ── 渲染开发模式卡片 ──────────────────────────────
function _renderDevCards() {
  const container = document.getElementById('dev-cards');
  if (!container) return;

  container.innerHTML = DEV_CARDS.map(card => {
    const { accent, accentBorder } = getAccentColors(card.role);
    return `
      <div class="login-card bg-white rounded-xl p-3 border border-gray-200 cursor-pointer" data-role="${card.role}">
        <div class="flex items-center gap-2 mb-2">
          <div style="${dotDarkVars(accent)}width:8px;height:8px;border-radius:50%;background:${accent};"></div>
          <span class="font-medium text-sm text-gray-800">${card.label}</span>
        </div>
        <p class="text-xs text-gray-500 mb-2">${card.desc}</p>
        <!-- 2026-09-24 无障碍：9 张身份卡的按钮可访问名原为清一色「登录」（身份名「组织委员」等
             只在兄弟 <span> 里、不进可访问名）⇒ 读屏分不出身份。此处把身份名并入按钮的可访问名；
             视觉与点击行为不变（点击仍由外层 .login-card 的委托处理）。 -->
        <button class="btn-accent login-btn w-full text-sm px-4 py-[7px] font-medium" aria-label="以 ${card.label} 身份登录" >登录</button>
      </div>
    `;
  }).join('');

  // 绑定点击（直达角色工作台，最小三成本：登录→工作台 ≤2 跳）
  container.querySelectorAll('[data-role]').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      AuthStore.devLogin(role);
      _goToWorkspace(role);
    });
  });
}

// ── 开发模式开关 ──────────────────────────────────
const devToggle = document.getElementById('dev-toggle');
const devSection = document.getElementById('login-dev');
const defaultSection = document.getElementById('login-default');

if (devToggle) {
  devToggle.addEventListener('change', () => {
    if (devToggle.checked) {
      devSection.classList.add('visible');
      defaultSection.style.display = 'none';
      // 批次 277：切到开发模式时收起「选支部」面板（三者互斥，避免两面板同屏）
      document.getElementById('login-branch')?.classList.remove('visible');
      _renderDevCards();
    } else {
      devSection.classList.remove('visible');
      defaultSection.style.display = 'block';
    }
  });
}

// ── 账号密码登录 ──────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('student-id').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('login-error');

    const result = AuthStore.verifyCredentials(studentId, password);
    if (!result.ok) {
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');
    // 等待登录完成（含后端 token 获取）后再跳转，确保 API 模式在导航前已生效
    // 2026-09-03 P1b：向后端一并传递账号密码，供 /login 口令校验（演示账号 123456）
    AuthStore.login(result.personId, password).then(() => {
      _goToWorkspace(AuthStore.getCurrentUser()?.role);
    });
  });
}

// ── C5③（2026-09-12）无动画兜底 ──────────────────────────────────
// login.html 的登录卡片用 loginFadeUp 入场动画（animation-fill-mode:both → 起始 opacity:0）。
// 后台标签页/浏览器节流时动画可能不推进，卡片会永久停在 opacity:0 不可见 → 表单不可达。
// 兜底：动画应已结束的时刻（500ms 动画 + ≤120ms 延迟 → 900ms）若仍为 opacity:0，则强制显示；
// 前台正常播完（opacity:1）时不做任何改动，不改变既定动效。
function _ensureLoginVisible() {
  document.querySelectorAll('.login-card-anim, .login-card-anim-delay-1, .login-card-anim-delay-2').forEach(el => {
    if (parseFloat(getComputedStyle(el).opacity) === 0) {
      el.style.animation = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
    }
  });
}
setTimeout(_ensureLoginVisible, 900);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') _ensureLoginVisible();
});

// ════════════════════════════════════════════════════════════════
//  IAAA 统一身份认证 ＋ 「选支部」阻断层（2026-09-29 批次 277）
//  契约单一源＝`server/routes/iaaa.js`（守卫 `server/test/iaaa-onboarding.test.mjs` T1–T8）：
//    ① 点「统一身份认证登录」→ `GET /api/v1/auth/iaaa/login`
//       （配置就绪 ⇒ 302 到 IAAA 授权页；未配置 ⇒ 503 ＋ 可懂原因；本地 `IAAA_MOCK=1` ⇒ 假想回调）
//    ② 回调换会话后 302 回本页 `#iaaa=<会话 token>`（走 hash：不进服务端日志、不被 Referer 带出）
//    ③ 本页取 token 落地会话（`AuthStore.startIaaaSession`）→ 已归属 ⇒ 进工作台；
//       未归属（`branchId === null`）⇒ 就地「选择支部」→ `POST bind-branch` → 待支部确认。
//  ⚠ 「选支部」复用本页（`#login-branch` 面板），**不新开页面**（不触发页面 × 页签计数类守卫）。
// ════════════════════════════════════════════════════════════════
const IAAA_LOGIN_URL = './api/v1/auth/iaaa/login';
const IAAA_BIND_URL = './api/v1/auth/iaaa/bind-branch';
const ME_URL = './api/v1/auth/me';

function _token() {
  try { return sessionStorage.getItem('gsm1921-api-token') || ''; } catch { return ''; }
}
function _authHeaders() {
  const t = _token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function _iaaaNote(msg) {
  const el = document.getElementById('iaaa-note');
  if (!el) return;
  if (!msg) { el.textContent = ''; el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}
function _branchNote(msg) {
  const el = document.getElementById('branch-note');
  if (el) el.textContent = msg || '';
}

/** 显示「选择支部」面板（收起账号卡与开发模式卡） */
function _showBranchPanel() {
  const def = document.getElementById('login-default');
  if (def) def.style.display = 'none';
  const dev = document.getElementById('login-dev');
  if (dev) dev.classList.remove('visible');
  const panel = document.getElementById('login-branch');
  if (panel) panel.classList.add('visible');
  _loadBranches();
}

/** 支部清单 → 可选按钮（登录用户可读 `GET /api/v1/branches`） */
async function _loadBranches() {
  const list = document.getElementById('branch-list');
  if (!list) return;
  if (!_token()) { list.innerHTML = '<p class="text-xs text-gray-500">会话已失效，请重新登录。</p>'; return; }
  list.innerHTML = '<p class="text-xs text-gray-500">正在加载…</p>';
  try {
    const r = await fetch('./api/v1/branches', { headers: _authHeaders() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const body = await r.json();
    const rows = Array.isArray(body) ? body : (body && body.data) || [];
    if (!rows.length) { list.innerHTML = '<p class="text-xs text-gray-500">暂无可用支部，请联系党委组织员。</p>'; return; }
    list.innerHTML = rows.map((b) => `<button type="button" class="btn-outline login-btn w-full text-sm px-3 py-2 font-medium" data-branch="${escHtml(b.id)}">${escHtml(b.name || b.id)}</button>`).join('');
    list.querySelectorAll('[data-branch]').forEach((btn) => {
      btn.addEventListener('click', () => _bindBranch(btn.dataset.branch, btn.textContent.trim()));
    });
  } catch (e) {
    list.innerHTML = `<p class="text-xs text-red-600">支部清单加载失败：${escHtml(e && e.message ? e.message : '')}</p>`;
  }
}

/** 提交入站意向（服务端写 `joinIntent`；**此刻仍是 branchId null**，须支部确认） */
async function _bindBranch(branchId, label) {
  const list = document.getElementById('branch-list');
  try {
    const r = await fetch(IAAA_BIND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ..._authHeaders() },
      body: JSON.stringify({ branchId }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
    if (list) list.innerHTML = `<p class="text-sm text-gray-700">已提交「${escHtml(label)}」的加入申请</p>`;
    _branchNote('等待支部确认；确认后即可进入工作台。');
  } catch (e) {
    _branchNote('提交失败：' + (e && e.message ? e.message : ''));
  }
}

/** 刷新确认状态：已归属 ⇒ 进工作台；否则提示仍在等待 */
async function _refreshBranchStatus() {
  try {
    const r = await fetch(ME_URL, { headers: _authHeaders() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const me = await r.json();
    if (me.branchId) { AuthStore.startIaaaSession(_token(), me); _goToWorkspace(me.role); return; }
    _branchNote('仍在等待支部确认；若被驳回，请重新选择支部。');
  } catch (e) {
    _branchNote('状态查询失败：' + (e && e.message ? e.message : ''));
  }
}

// ── ① IAAA 登录按钮：先探一次「是否已配置」，免得把 503 的 JSON 甩给用户 ──
const iaaaBtn = document.getElementById('iaaa-login');
if (iaaaBtn) {
  iaaaBtn.addEventListener('click', async () => {
    _iaaaNote('');
    iaaaBtn.disabled = true;
    try {
      const r = await fetch(IAAA_LOGIN_URL, { redirect: 'manual' });
      // 302（含跨域到 IAAA 授权页）在 fetch 里表现为 opaqueredirect / status 0
      if (r.type === 'opaqueredirect' || r.status === 0 || (r.status >= 300 && r.status < 400)) {
        window.location.assign(IAAA_LOGIN_URL);      // 交回浏览器跟随 302
        return;
      }
      let msg = '统一身份认证暂不可用';
      try { const j = await r.json(); msg = j.error || msg; } catch { /* 非 JSON 响应 */ }
      _iaaaNote(msg);
    } catch (e) {
      _iaaaNote('无法连接服务器：' + (e && e.message ? e.message : ''));
    } finally {
      iaaaBtn.disabled = false;
    }
  });
}

// ── ② 回调落地：`#iaaa=<会话 token>`（取到后**立即**清 hash） ──
async function _handleIaaaReturn() {
  const m = /[#&]iaaa=([^&]+)/.exec(window.location.hash || '');
  if (!m) return;
  const token = decodeURIComponent(m[1]);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  try {
    const r = await fetch(ME_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error('会话校验失败（HTTP ' + r.status + '）');
    const me = await r.json();
    AuthStore.startIaaaSession(token, me);
    if (me.branchId) { _goToWorkspace(me.role); return; }
    _showBranchPanel();                              // 未归属 ⇒ 就地选支部
  } catch (e) {
    _iaaaNote('统一身份认证登录失败：' + (e && e.message ? e.message : ''));
  }
}

// ── ③ 刷新按钮 ＋ 入口分派 ──
const branchRefresh = document.getElementById('branch-refresh');
if (branchRefresh) branchRefresh.addEventListener('click', _refreshBranchStatus);

if (_IAAA_HASH) {
  _handleIaaaReturn();
} else if (new URLSearchParams(window.location.search).has('need-branch') || isBranchPendingUser(_user)) {
  _showBranchPanel();
}
