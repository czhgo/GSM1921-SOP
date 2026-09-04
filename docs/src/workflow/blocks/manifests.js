// role: [工程师]+[AI]
// workflow/blocks/manifests.js — L3 工作流块清单（S1 试点，2026-09-03）
// 契约权威源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md（v1.1）
// 书记裁定（v1.1 §〇）：块差异化 = ①流程组合 ②表单条目（fields 可收拢）③参与人范围（participants 可配）；
// 制度来源分层 provenance ∈ institution-common（三会一课等全党通用）| branch-custom（支部自创制度尝试）。
// S1 试点块（书记点名）：主题党日（通用）+ 专班运行（自创，验 organizer-deep 组织模式）。
// 原则：块不独立于既有机制存在——manifest 仅元数据；渲染走 components/forms.js，执行走既有引擎/services。
// validateBlockManifest 为纯函数（浏览器/Node 均可用），白名单内联自 core/constants.js（ROLE_KEYS/OUTPUT_BLOCK_DEFS）。

import { ROLE_KEYS, OUTPUT_BLOCK_DEFS } from '../../core/constants.js?v=20260903c';

const FIELD_KINDS = new Set(['textField', 'textareaField', 'selectField', 'dateField']);
const PROVENANCE_SET = new Set(['institution-common', 'branch-custom']);
const PARTICIPANT_MODE_SET = new Set(['fixed', 'configurable']);
const ORG_MODE_SET = new Set(['none', 'organizer-deep']);
const OUTPUT_BLOCK_IDS = new Set((OUTPUT_BLOCK_DEFS || []).map(b => b.id));

// capabilityId → 制度来源权威对照（防「通用制度谎报为支部自创」；新块须在此登记）
const CAPABILITY_PROVENANCE = {
  'activity-calendar': 'institution-common', // 三会一课/主题党日 = 全党通用
  'taskforce': 'branch-custom',              // 专班 = 支部自创制度尝试
};

// ── S1 试点块一：主题党日（通用制度源）────────────────────────────
export const THEME_PARTY_DAY_MANIFEST = {
  blockId: 'theme-party-day',
  name: '主题党日组织块',
  version: '1.0.0',
  provenance: 'institution-common',
  sopRef: 'content/02_institution/sop/theme_party_day.md',
  capabilityId: 'activity-calendar',
  scope: ['workspace:secretary', 'workspace:leader'],
  inputs: {
    fields: [
      { fieldId: 'title', label: '活动名称', kind: 'textField', required: true, requiredConfigurable: false, hint: '如：学习两会精神主题党日', enabledDefault: true },
      { fieldId: 'date', label: '日期', kind: 'dateField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
      { fieldId: 'type', label: '类型', kind: 'selectField', required: true, requiredConfigurable: true, hint: '', enabledDefault: true, options: [{ value: 'theme', label: '主题党日' }] },
    ],
  },
  participants: { mode: 'fixed', defaultRoles: ['party-member'], orgMode: 'none' },
  stages: [
    { id: 'create', kind: 'decision-tree', outputs: ['activity'] },
    { id: 'attend', kind: 'engine', outputs: ['attendance'] },
  ],
  outputs: {
    entities: ['activity', 'attendance', 'todo'],
    outputBlocks: ['attendance', 'publicity'],
  },
  events: { emits: ['data:activity:created'], listens: [] },
  validation: { initiatorRoles: ['secretary'], requiredSop: true, enabledByDefault: true },
};

// ── S1 试点块二：专班运行（支部自创制度源，验 ②③ 维度）─────────────
export const TASKFORCE_RUN_MANIFEST = {
  blockId: 'taskforce-run',
  name: '专班运行块',
  version: '1.0.0',
  provenance: 'branch-custom',
  sopRef: 'content/02_institution/sop/taskforce.md',
  capabilityId: 'taskforce',
  scope: ['workspace:org-commissioner', 'workspace:secretary'],
  inputs: {
    fields: [
      { fieldId: 'name', label: '专班名称', kind: 'textField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
      { fieldId: 'goal', label: '目标', kind: 'textareaField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
      { fieldId: 'roles', label: '参与角色', kind: 'selectField', required: true, requiredConfigurable: true, hint: '组织者/深度参与者为支部自创组织尝试', enabledDefault: true, options: [{ value: 'organizer', label: '组织者' }, { value: 'deep', label: '深度参与者' }] },
      { fieldId: 'quota', label: '涉及人数上限', kind: 'textField', required: false, requiredConfigurable: false, hint: '可留空不限制', enabledDefault: false },
    ],
  },
  participants: { mode: 'configurable', defaultRoles: ['party-member'], orgMode: 'organizer-deep' },
  stages: [
    { id: 'create', kind: 'decision-tree', outputs: ['taskforce', 'assignment'] },
    { id: 'attend', kind: 'engine', outputs: ['inspection'] },
  ],
  outputs: {
    entities: ['taskforce', 'assignment', 'inspection'],
    outputBlocks: ['inspection', 'materials'],
  },
  events: { emits: ['data:taskforce:created'], listens: [] },
  validation: { initiatorRoles: ['secretary', 'org-commissioner'], requiredSop: true, enabledByDefault: true },
};

/** 全量块清单（S1 试点目录） */
export const BLOCK_MANIFESTS = [THEME_PARTY_DAY_MANIFEST, TASKFORCE_RUN_MANIFEST];

/**
 * 校验单个块 manifest（纯函数；错误累积返回）
 * @param {Object} m - 待校验 manifest
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateBlockManifest(m) {
  const errors = [];
  if (!m || typeof m !== 'object') return { ok: false, errors: ['manifest 不是对象'] };

  // ── identity ──
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(String(m.blockId || ''))) errors.push('blockId 须匹配 ^[a-z][a-z0-9-]{2,63}$');
  if (typeof m.name !== 'string' || !m.name) errors.push('name 缺失');
  if (typeof m.version !== 'string' || !m.version) errors.push('version 缺失');
  if (!PROVENANCE_SET.has(m.provenance)) errors.push(`provenance 须为 institution-common | branch-custom，实际 ${m.provenance}`);
  if (!m.sopRef || typeof m.sopRef !== 'string') errors.push('sopRef 缺失（制度溯源强制）');

  // ── capability ──
  if (typeof m.capabilityId !== 'string' || !m.capabilityId) errors.push('capabilityId 缺失');
  const expectedProv = CAPABILITY_PROVENANCE[m.capabilityId];
  if (expectedProv && m.provenance !== expectedProv) {
    errors.push(`capabilityId=${m.capabilityId} 制度来源应为 ${expectedProv}，声明 ${m.provenance}（通用/自创不可谎报）`);
  }

  // ── inputs.fields（表单条目可组装）──
  const seen = new Set();
  (m.inputs?.fields || []).forEach((f, i) => {
    if (!f || typeof f !== 'object') return errors.push(`fields[${i}] 非对象`);
    if (!/^[a-z][a-zA-Z0-9-]{0,63}$/.test(String(f.fieldId || ''))) errors.push(`fields[${i}].fieldId 非法`);
    if (seen.has(f.fieldId)) errors.push(`fields[${i}].fieldId 重复: ${f.fieldId}`);
    seen.add(f.fieldId);
    if (!FIELD_KINDS.has(f.kind)) errors.push(`fields[${i}].kind 非法: ${f.kind}（仅 ${[...FIELD_KINDS].join('/')}）`);
    if (typeof f.label !== 'string' || !f.label) errors.push(`fields[${i}].label 缺失`);
    if (typeof f.required !== 'boolean') errors.push(`fields[${i}].required 须为布尔`);
  });

  // ── participants（参与人范围可组装）──
  const p = m.participants || {};
  if (!PARTICIPANT_MODE_SET.has(p.mode)) errors.push(`participants.mode 须为 fixed | configurable，实际 ${p.mode}`);
  if (!ORG_MODE_SET.has(p.orgMode)) errors.push(`participants.orgMode 须为 none | organizer-deep，实际 ${p.orgMode}`);
  if (p.mode === 'configurable' && !Array.isArray(p.defaultRoles)) errors.push('participants.configurable 须提供 defaultRoles');

  // ── stages ──
  if (!Array.isArray(m.stages) || m.stages.length === 0) errors.push('stages 须为非空数组');

  // ── outputs ──
  const outs = m.outputs || {};
  if (!Array.isArray(outs.entities) || outs.entities.length === 0) errors.push('outputs.entities 须为非空数组');
  (outs.outputBlocks || []).forEach((id, i) => {
    if (!OUTPUT_BLOCK_IDS.has(id)) errors.push(`outputs.outputBlocks[${i}] 未知产出块: ${id}（须 ∈ OUTPUT_BLOCK_DEFS）`);
  });

  // ── validation ──
  const v = m.validation || {};
  if (!Array.isArray(v.initiatorRoles) || v.initiatorRoles.length === 0) errors.push('validation.initiatorRoles 须为非空数组');
  v.initiatorRoles?.forEach((r, i) => {
    if (!ROLE_KEYS.includes(r)) errors.push(`validation.initiatorRoles[${i}] 未知角色键: ${r}`);
  });

  return { ok: errors.length === 0, errors };
}

/** 全量清单体检（模块加载即自检；不合规打警告但不阻断——防契约漂移静默） */
BLOCK_MANIFESTS.forEach((m) => {
  const res = validateBlockManifest(m);
  if (!res.ok) console.warn(`[workflow/blocks] manifest 不合规 ${m?.blockId}: ${res.errors.join('; ')}`);
});
