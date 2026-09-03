// role: [工程师]+[AI]
// components/form-shell.js — 行内记录小表单外壳（B1 表单美学批次，2026-09-03）
// 收敛 write-tab/taskforce-tab 等 5 处复制粘贴的"灰底块 + 标题 + 取消/保存按钮行"：
//   - 外壳/按钮 HTML 唯一实现（class 统一 record-*，消除 act-sub-*/sub-* 双轨类名）
//   - 各调用方只传 title + body（字段差异留在调用方，保持零行为变化）
// 设计源：COMPONENT_SPEC §4.3 输入统一原则 + styles.css 按钮档位（默认档 text-xs px-3 py-1.5）
// 美学批次：B1 共用小表单 / B2 将在此基础上演进字段积木（FormField 目录）

/** 渲染行内记录表单外壳（灰底块 + 标题 + body + 取消/保存按钮行） */
export function recordFormShell({ title, body, saveText = '提交', accent, accentBorder }) {
  return `
    <div class="record-form-shell mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
      <div class="text-[12px] font-bold text-gray-600 mb-2">${title}</div>
      ${body}
      <div class="flex gap-2 justify-end">
        <button type="button" class="record-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
        <button type="button" class="record-save-btn text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-colors" style="background:${accent || '#C8102E'};${accentBorder ? `border:1px solid ${accentBorder};` : ''}">${saveText}</button>
      </div>
    </div>`;
}
