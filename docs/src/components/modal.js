// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  modal.js — 通用浮窗组件
// ════════════════════════════════════════════════════════════════
//  设计原则：点击按钮→弹出浮窗→在浮窗中完成写入→关闭浮窗
//  页面保持清爽，所有表单/编辑器都在浮窗中完成

// 2026-09-13 修复（成员档案模态走查暴露）：Esc 监听原只在「按 Esc 关闭」这一条路径上注销，
// 走遮罩点击/关闭按钮/程序化 closeModal 关闭时监听残留 → 反复打开同一 id 浮窗会累积 keydown
// 监听（内存泄漏 + 多次无谓 closeModal）。现改为**按 id 登记**，closeModal 统一注销（全路径覆盖）。
const _escHandlers = new Map();

/**
 * 打开一个浮窗
 * @param {Object} options
 * @param {string} options.id - 浮窗唯一标识（用于关闭时查找）
 * @param {string} options.title - 浮窗标题
 * @param {string} options.bodyHtml - 浮窗内容 HTML
 * @param {Function} options.onMount - 浮窗挂载后的回调（绑定事件等），参数为浮窗容器
 * @param {string} [options.width='480px'] - 浮窗宽度
 * @param {string} [options.accentColor='#3B82F6'] - 标题栏强调色
 * @param {{href:string,text:string}} [options.settingsLink] - 页脚「设置」入口（可选；不传则无此行）
 * @returns {HTMLElement} 浮窗面板元素
 */
// 2026-09-21 批次 138（支书第 ⑤ 条「浮窗的特定位置 → 跳转 setting」）：把批次 99 在支书台「写入活动」
// 浮窗里手写的那条页脚深链收进本组件做**单一源**——位置固定在浮窗**页脚**（`.modal-body` 之外，
// 切步骤/切换内容不消失），各调用点只传 `settingsLink`（href + 文案），不再各写一套 DOM。
// 未传者不渲染（确认 / 删除类浮窗不加，避免噪声）。
// 2026-09-21 批次 139：把「浮窗页脚那条相关设置深链」的**标记**抽成本导出——单一源供两类浮窗共用：
//   ① 本组件自身的 `openModal`（常规浮窗）；② **自建浮层**（不走本组件、自持 body 的那种，见
//   `entries/tabs/prop/archive-tab.js` 的上传浮层）——它只需在自己的页脚插入本函数的结果，
//   不必复制一份 HTML（避免"同一段标记两处各写一套"）。文案与样式与批次 99 手写那条逐字同款。
export function settingsLinkHTML(settingsLink) {
  return settingsLink
    ? `<div class="modal-settings-link" style="padding:10px 20px;border-top:1px solid var(--neutral-200);font-size:0.72rem;line-height:1.7;color:var(--neutral-500);">相关设置：<a href="${settingsLink.href}" style="color:var(--app-accent,#B91C1C);text-decoration:underline;">${settingsLink.text}</a></div>`
    : '';
}

export function openModal({ id, title, bodyHtml, onMount, width = '480px', accentColor = '#3B82F6', settingsLink = null }) {
  // 关闭已有同 id 浮窗
  closeModal(id);

  const overlay = document.createElement('div');
  overlay.id = `modal-overlay-${id}`;
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;';

  const panel = document.createElement('div');
  panel.style.cssText = `width:${width};max-width:calc(100vw - 32px);max-height:85vh;background:var(--surface-card);border-radius:var(--radius-md);box-shadow:0 20px 60px rgba(0,0,0,0.2);display:flex;flex-direction:column;animation:slideUp 0.2s ease;overflow:hidden;`;

  const settingsHTML = settingsLinkHTML(settingsLink);

  panel.innerHTML = `
    <div style="padding:16px 20px;border-bottom:1px solid var(--neutral-200);display:flex;align-items:center;justify-content:space-between;">
      <h3 class="font-title-cn text-sm font-semibold text-gray-800">${title}</h3>
      <button data-modal-close="${id}" style="background:none;border:none;cursor:pointer;color:var(--neutral-400);line-height:1;padding:4px 8px;border-radius:var(--radius-sm);transition:all 0.15s;" class="text-xl" onmouseover="this.style.background='var(--neutral-100)';this.style.color='var(--neutral-600)'" onmouseout="this.style.background='none';this.style.color='var(--neutral-400)'">&times;</button>
    </div>
    <div class="modal-body" style="padding:20px;overflow-y:auto;flex:1;">
      ${bodyHtml}
    </div>
    ${settingsHTML}
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });

  // 关闭按钮
  panel.querySelector(`[data-modal-close="${id}"]`).addEventListener('click', () => closeModal(id));

  // ESC 关闭（监听按 id 登记，closeModal 全路径统一注销）
  const escHandler = (e) => {
    if (e.key === 'Escape') closeModal(id);
  };
  _escHandlers.set(id, escHandler);
  document.addEventListener('keydown', escHandler);

  // 回调
  if (onMount) onMount(panel);

  return panel;
}

/**
 * 关闭浮窗
 * @param {string} id - 浮窗标识
 */
export function closeModal(id) {
  const escHandler = _escHandlers.get(id);
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    _escHandlers.delete(id);
  }
  const overlay = document.getElementById(`modal-overlay-${id}`);
  if (overlay) overlay.remove();
}

/**
 * 快速创建表单浮窗
 * @param {Object} options
 * @param {string} options.id - 浮窗标识
 * @param {string} options.title - 标题
 * @param {Array} options.fields - 字段定义 [{key, label, type, placeholder, required, options}]
 * @param {Function} options.onSubmit - 提交回调，参数为字段值对象
 * @param {string} [options.submitLabel='提交'] - 提交按钮文字
 * @param {string} [options.accentColor] - 强调色
 * @param {Object} [options.initialValues] - 初始值（编辑模式）
 * @param {{href:string,text:string}} [options.settingsLink] - 页脚「设置」入口（透传 openModal，可选）
 */
export function openFormModal({ id, title, fields, onSubmit, submitLabel = '提交', accentColor = '#3B82F6', initialValues = {}, settingsLink = null }) {
  const fieldsHtml = fields.map(f => {
    const val = initialValues[f.key] || '';
    const req = f.required ? '<span style="--acc-text-dark:#F87171;color:#EF4444;">*</span>' : '';
    if (f.type === 'select') {
      const opts = (f.options || []).map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
      return `<div style="margin-bottom:14px;"><label style="--acc-text-dark:#CBD5E1;display:block;font-weight:500;color:#374151;margin-bottom:4px;" class="text-body-sm">${f.label}${req}</label><select data-field="${f.key}" class="input-flat w-full">${opts}</select></div>`;
    }
    if (f.type === 'textarea') {
      return `<div style="margin-bottom:14px;"><label style="--acc-text-dark:#CBD5E1;display:block;font-weight:500;color:#374151;margin-bottom:4px;" class="text-body-sm">${f.label}${req}</label><textarea data-field="${f.key}" rows="3" placeholder="${f.placeholder || ''}" class="input-flat-sm w-full" style="--acc-text-dark:#CBD5E1;color:#374151;resize:vertical;">${val}</textarea></div>`;
    }
    return `<div style="margin-bottom:14px;"><label style="--acc-text-dark:#CBD5E1;display:block;font-weight:500;color:#374151;margin-bottom:4px;" class="text-body-sm">${f.label}${req}</label><input data-field="${f.key}" type="${f.type || 'text'}" value="${val}" placeholder="${f.placeholder || ''}" class="input-flat-sm w-full" style="--acc-text-dark:#CBD5E1;color:#374151;" /></div>`;
  }).join('');

  const bodyHtml = `
    <form data-modal-form="${id}">
      ${fieldsHtml}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
        <button type="button" data-modal-cancel="${id}" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90 font-medium" style="background:${accentColor};cursor:pointer;">${submitLabel}</button>
      </div>
    </form>
  `;

  return openModal({
    id,
    title,
    bodyHtml,
    width: '480px',
    accentColor,
    settingsLink,
    onMount: (panel) => {
      // 取消按钮
      panel.querySelector(`[data-modal-cancel="${id}"]`)?.addEventListener('click', () => closeModal(id));
      // 提交
      panel.querySelector(`[data-modal-form="${id}"]`)?.addEventListener('submit', (e) => {
        e.preventDefault();
        const values = {};
        panel.querySelectorAll('[data-field]').forEach(el => {
          values[el.dataset.field] = el.value;
        });
        const result = onSubmit(values);
        if (result === false) return; // onSubmit 返回 false 表示验证失败，不关闭浮窗
        closeModal(id);
      });
    }
  });
}
