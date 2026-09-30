// role: [工程师]+[AI]
// components/ui/form-shell.js — 行内记录小表单外壳（B1 表单美学批次，2026-09-03）
// 收敛 write-tab/taskforce-tab 等 5 处复制粘贴的"灰底块 + 标题 + 取消/保存按钮行"：
//   - 外壳/按钮 HTML 唯一实现（class 统一 record-*，消除 act-sub-*/sub-* 双轨类名）
//   - 各调用方只传 title + body（字段差异留在调用方，保持零行为变化）
// 设计源：DESIGN_SYSTEM §4.3 输入统一原则 + §4.2 内嵌面板（card rounded-xl p-4）+ 按钮档位 text-sm px-4 py-[7px]
// 美学批次：B1 共用小表单 / B2 将在此基础上演进字段积木（FormField 目录）

/** 渲染行内记录表单外壳（card 面板 + 标题 + body + 取消/保存按钮行）
 *  ⚠ 2026-09-30 批次 300：保存按钮归**主操作族** `.btn-accent`（原为 `.btn-ghost` ＋ 内联主题色实底＝
 *  借用文字族形状伪装实底，违反 `DESIGN_SYSTEM §4.1 何时用哪族`）。台主题色一律走 `--app-accent`，
 *  故入参 `accent` 不再需要（调用方仍可传，忽略之）；`accentBorder` 仅在显式给定时保留细边。 */
export function recordFormShell({ title, body, saveText = '提交', accentBorder }) {
  return `
    <div class="record-form-shell mt-2 card rounded-xl p-4">
      <div class="font-title-cn text-xs font-bold text-gray-600 mb-2">${title}</div>
      ${body}
      <div class="flex gap-2 justify-end">
        <button type="button" class="btn-outline record-cancel-btn text-sm px-4 py-[7px]">取消</button>
        <button type="button" class="btn-accent record-save-btn text-sm px-4 py-[7px] font-medium"${accentBorder ? ` style="border:1px solid ${accentBorder};"` : ''}>${saveText}</button>
      </div>
    </div>`;
}
