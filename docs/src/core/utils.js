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

  // 状态色圆形图标（白字 glyph）+ 深色正文（textContent 防注入）
  const iconEl = document.createElement('span');
  iconEl.style.cssText = [
    'display:inline-flex', 'align-items:center', 'justify-content:center',
    'width:18px', 'height:18px', 'border-radius:9999px',
    `background:${accent}`, 'color:#fff', 'font-size:11px', 'font-weight:700',
    'flex-shrink:0',
  ].join(';');
  iconEl.textContent = icon;
  const msgEl = document.createElement('span');
  msgEl.style.cssText = 'color:#1F2937;';
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
