// role: [工程师]+[AI]
// workflow/blocks/form-renderer.js — L3 S2：manifest → forms.js 字段积木渲染桥（2026-09-03）
// 职责：给定 block manifest（inputs.fields 声明）→ 用 forms.js 库的字段积木生成表单 HTML。
// 只读 mapping，不改积木：kind ∈ textField/textareaField/selectField/dateField 一一对应 forms.js 同名函数，
// label for/必填/aria/placeholder… 体系由积木自带（B2 交付），渲染桥只负责「声明 → 参数」翻译与块级 id 前缀。
// 表单条目可组装（书记裁定维度②）：enabledDefault=false 的字段默认不渲染（支部 config 未启用即收起）；
// includeDisabled=true 供配置面预览全量条目。
// 契约源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md v1.1（S2）
// 设计纪律：不在此做事件绑定/提交——宿主 tab 各自持有提交逻辑（S4 迁移试点再收敛）。

import { textField, textareaField, selectField, dateField } from '../../components/forms.js?v=20260909e';

const KIND_RENDERER = { textField, textareaField, selectField, dateField };

/** 块内字段 id → 页面级唯一 id（防多块同屏冲突） */
export function fieldDomId(blockId, fieldId) {
  return `${blockId}__${fieldId}`;
}

/**
 * 按 manifest 渲染输入字段 HTML（可组装：enabledDefault=false 默认收起）
 * @param {Object} manifest - 块 manifest（含 inputs.fields）
 * @param {{ includeDisabled?: boolean }} opts - includeDisabled=true 时渲染全部字段（配置面预览）
 * @returns {string} 拼接后的字段 HTML（空字段集返回 ''）
 */
export function renderManifestFields(manifest, { includeDisabled = false } = {}) {
  const fields = manifest?.inputs?.fields || [];
  return fields
    .filter((f) => includeDisabled || f.enabledDefault !== false)
    .map((f) => {
      const render = KIND_RENDERER[f.kind];
      if (!render) return '';
      const id = fieldDomId(manifest.blockId, f.fieldId);
      const args = {
        id,
        label: f.label,
        required: !!f.required,
        hint: f.hint || '',
        // 块级字段一律走稳定 id，name 用 fieldId（提交按 fieldId 取值的约定）
        name: f.fieldId,
        ...(Array.isArray(f.options) ? { options: f.options } : {}),
        ...(f.placeholder ? { placeholder: f.placeholder } : {}),
      };
      if (f.kind === 'textareaField' && f.rows) args.rows = f.rows;
      return render(args);
    })
    .join('');
}

/** 块可用字段清单（id+label；供配置面展示「表单条目收拢」范围，S3 用） */
export function manifestFieldCatalog(manifest) {
  return (manifest?.inputs?.fields || []).map((f) => ({
    fieldId: f.fieldId,
    label: f.label,
    kind: f.kind,
    enabledDefault: f.enabledDefault !== false,
    required: !!f.required,
    requiredConfigurable: !!f.requiredConfigurable,
  }));
}
