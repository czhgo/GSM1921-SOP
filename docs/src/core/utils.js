// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  utils.js — 格式化工具、动画辅助、Toast 组件
// ════════════════════════════════════════════════════════════════

// ── 日期格式化 ─────────────────────────────────────────────────
function _pad(n) { return n < 10 ? '0' + n : '' + n; }

export function _fmtDate(d) {
  return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
}

export function _fmtChinese(d) {
  const DN = ['日','一','二','三','四','五','六'];
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（周' + DN[d.getDay()] + '）';
}

export function _currentYearMonth() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

/** ISO 时间串 → 'YYYY-MM-DD HH:mm'（去 T 分隔；空值返回 ''） */
export function fmtDt(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 16).replace('T', ' ');
}

// ── HTML 转义（innerHTML 渲染前统一出口，防存储型 XSS）─────────
export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Toast 组件 — 浮层通知（固定定位，不影响文档流）─────────────
let _toastContainer = null;

/**
 * 显示一条浮层 Toast 通知
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 */
export function showToast(type, message) {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.setAttribute('role', 'status');          // B4 无障碍（2026-09-03）：异步更新需 aria-live
    _toastContainer.setAttribute('aria-live', 'polite');
    _toastContainer.style.cssText = [
      'position:fixed', 'bottom:1.5rem', 'right:1.5rem',
      'z-index:9999', 'display:flex', 'flex-direction:column',
      'gap:0.5rem', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(_toastContainer);
  }

  // 状态色点缀（DESIGN_SYSTEM 状态色统一：完成绿 #16A34A / 告警红 #EF4444 / 信息蓝 #3B82F6）
  // 主色收敛原则：Toast 为状态指示，用状态色而非角色主题色；白色实底 + 深色文字保证高对比度
  const COLORS = {
    success: { accent: '#16A34A', bg: '#F0FDF4', icon: '✓' },
    error:   { accent: '#EF4444', bg: '#FEF2F2', icon: '!' },
    info:    { accent: '#3B82F6', bg: '#EFF6FF', icon: 'i' },
  };
  const { accent, bg, icon } = COLORS[type] || COLORS.info;

  const toast = document.createElement('div');
  toast.style.cssText = [
    `--acc-bg-dark:#1E293B`, `--acc-text-dark:#E2E8F0`, `--acc-border-dark:${accent}`,
    `background:${bg}`,
    `border:1px solid ${accent}`, `border-left:4px solid ${accent}`,
    'border-radius:var(--radius-md)',
    'padding:0.625rem 1rem', 'display:flex', 'align-items:center',
    'gap:0.625rem', 'font-size:0.875rem', 'color:#1F2937',
    'box-shadow:0 4px 24px rgba(0,0,0,0.12)',
    'opacity:0', 'transform:translateY(0.5rem)',
    'transition:opacity 0.25s ease,transform 0.25s ease',
    'pointer-events:none', 'max-width:22rem', 'word-break:break-word',
  ].join(';');

  // 状态色圆形图标：状态色实底白字（书记 2026-08-11 裁定——toast 状态色本就三色平行，
  // 不属于角色功能色 2×2 规则范围，保持实底白字醒目状态指示）+ 深色正文（textContent 防注入）
  const iconEl = document.createElement('span');
  iconEl.style.cssText = [
    'display:inline-flex', 'align-items:center', 'justify-content:center',
    'width:18px', 'height:18px', 'border-radius:9999px',
    `background:${accent}`, 'color:#fff', 'font-size:11px', 'font-weight:700',
    'flex-shrink:0',
  ].join(';');
  iconEl.textContent = icon;
  const msgEl = document.createElement('span');
  msgEl.style.cssText = 'color:#1F2937;--acc-text-dark:#E2E8F0;';
  msgEl.textContent = message;
  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  _toastContainer.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }));

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.5rem)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export function getBasePath() {
  // 子目录页面已通过 <base href="../"> 将基准URL调至 docs/
  // JS动态内容同样受 <base> 影响，因此始终返回 './'
  return './';
}

/**
 * 跳转定位高亮（书记 2026-08-08 裁定：高亮须自动褪去，不得一直亮着）
 * 首页跳转携带 activityId/taskforceId 等参数时，工作台定位元素后应用本高亮：
 *  - 定时自动褪去（默认 2.8s）
 *  - 用户点击该元素即提前褪去
 *  - 褪去时通过 transition 平滑淡出（非硬切）
 * @param {HTMLElement} el — 目标元素
 * @param {Object} [opts]
 * @param {number} [opts.duration=2800] — 自动褪去毫秒数
 * @param {string} [opts.className='nav-flash-highlight'] — 高亮 CSS 类
 */
export function flashHighlight(el, { duration = 2800, className = 'nav-flash-highlight' } = {}) {
  if (!el || !el.classList || typeof el.classList.add !== 'function') return;
  el.classList.add(className);
  const off = () => {
    el.style.transition = 'box-shadow .6s ease, border-color .6s ease, background .6s ease';
    el.classList.remove(className);
  };
  el.addEventListener('click', off, { once: true });
  setTimeout(off, duration);
}

/** 2026-08-28 T-304 A 档下载闭环：通用 CSV 导出（UTF-8 BOM，Excel 中文不乱码） */
export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 2026-08-28 T-304 A 档下载闭环：触发打印（配合 @media print 样式） */
export function triggerPrint() {
  window.print();
}

/** 2026-08-28 T-304 A 档下载闭环：通用 Blob 下载（模板/材料/导出共用） */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 2026-08-28 T-304 A 档下载闭环：通用 URL 下载（dataURL 直下 / 服务端文件带鉴权拉取） */
export async function downloadUrl(url, filename, fetchInit) {
  try {
    const resp = await fetch(url, fetchInit);
    if (!resp.ok) throw new Error(`下载失败(${resp.status})`);
    downloadBlob(filename, await resp.blob());
    return true;
  } catch (e) {
    console.warn('[downloadUrl]', e);
    return false;
  }
}
