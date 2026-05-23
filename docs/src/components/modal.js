// role: [人机]
// ════════════════════════════════════════════════════════════════
//  modal.js — 通用浮窗组件
// ════════════════════════════════════════════════════════════════
//  设计原则：点击按钮→弹出浮窗→在浮窗中完成写入→关闭浮窗
//  页面保持清爽，所有表单/编辑器都在浮窗中完成

/**
 * 打开一个浮窗
 * @param {Object} options
 * @param {string} options.id - 浮窗唯一标识（用于关闭时查找）
 * @param {string} options.title - 浮窗标题
 * @param {string} options.bodyHtml - 浮窗内容 HTML
 * @param {Function} options.onMount - 浮窗挂载后的回调（绑定事件等），参数为浮窗容器
 * @param {string} [options.width='480px'] - 浮窗宽度
 * @param {string} [options.accentColor='#3B82F6'] - 标题栏强调色
 * @returns {HTMLElement} 浮窗面板元素
 */
export function openModal({ id, title, bodyHtml, onMount, width = '480px', accentColor = '#3B82F6' }) {
  // 关闭已有同 id 浮窗
  closeModal(id);

  const overlay = document.createElement('div');
  overlay.id = `modal-overlay-${id}`;
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.35);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease;';

  const panel = document.createElement('div');
  panel.style.cssText = `width:${width};max-height:85vh;background:white;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.2);display:flex;flex-direction:column;animation:slideUp 0.2s ease;overflow:hidden;`;

  panel.innerHTML = `
    <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;">
      <h3 style="margin:0;font-size:15px;font-weight:600;color:#1F2937;">${title}</h3>
      <button data-modal-close="${id}" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:20px;line-height:1;padding:4px 8px;border-radius:6px;transition:all 0.15s;" onmouseover="this.style.background='#F3F4F6';this.style.color='#374151'" onmouseout="this.style.background='none';this.style.color='#9CA3AF'">&times;</button>
    </div>
    <div class="modal-body" style="padding:20px;overflow-y:auto;flex:1;">
      ${bodyHtml}
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });

  // 关闭按钮
  panel.querySelector(`[data-modal-close="${id}"]`).addEventListener('click', () => closeModal(id));

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeModal(id); document.removeEventListener('keydown', escHandler); }
  };
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
 */
export function openFormModal({ id, title, fields, onSubmit, submitLabel = '提交', accentColor = '#3B82F6', initialValues = {} }) {
  const fieldsHtml = fields.map(f => {
    const val = initialValues[f.key] || '';
    const req = f.required ? '<span style="color:#EF4444;">*</span>' : '';
    if (f.type === 'select') {
      const opts = (f.options || []).map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
      return `<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;">${f.label}${req}</label><select data-field="${f.key}" style="width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;color:#374151;background:white;">${opts}</select></div>`;
    }
    if (f.type === 'textarea') {
      return `<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;">${f.label}${req}</label><textarea data-field="${f.key}" rows="3" placeholder="${f.placeholder || ''}" style="width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;color:#374151;resize:vertical;">${val}</textarea></div>`;
    }
    return `<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;">${f.label}${req}</label><input data-field="${f.key}" type="${f.type || 'text'}" value="${val}" placeholder="${f.placeholder || ''}" style="width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:8px;font-size:13px;color:#374151;" /></div>`;
  }).join('');

  const bodyHtml = `
    <form data-modal-form="${id}">
      ${fieldsHtml}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
        <button type="button" data-modal-cancel="${id}" style="padding:8px 16px;border:1px solid #D1D5DB;border-radius:8px;background:white;color:#6B7280;font-size:13px;cursor:pointer;">取消</button>
        <button type="submit" style="padding:8px 16px;border:none;border-radius:8px;background:${accentColor};color:white;font-size:13px;font-weight:500;cursor:pointer;">${submitLabel}</button>
      </div>
    </form>
  `;

  return openModal({
    id,
    title,
    bodyHtml,
    width: '480px',
    accentColor,
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
