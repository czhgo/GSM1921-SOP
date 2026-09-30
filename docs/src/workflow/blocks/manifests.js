// role: [工程师]+[AI]
// workflow/blocks/manifests.js — L3 工作流块清单（S1 试点，2026-09-03）
// 契约权威源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md（v1.1）
// 支书 2026-09-03 裁定（v1.1 §〇）：块差异化 = ①流程组合 ②表单条目（fields 可收拢）③参与人范围（participants 可配）；
// 制度来源分层 provenance ∈ institution-common（三会一课等全党通用）| branch-custom（支部自创制度尝试）。
// S1 试点块（支书点名）：主题党日（通用）+ 专班运行（自创，验 organizer-deep 组织模式）。
// 原则：块不独立于既有机制存在——manifest 仅元数据；渲染走 components/ui/forms.js，执行走既有引擎/services。
// validateBlockManifest 为纯函数（浏览器/Node 均可用），白名单内联自 core/domain/constants.js（ROLE_KEYS/OUTPUT_BLOCK_DEFS）。

import { ROLE_KEYS, OUTPUT_BLOCK_DEFS } from '../../core/domain/constants.js?v=20260930j';
// P3d v0 组合声明校验（2026-09-05）：块级 depends/conflictsWith 组合体检，见 WORKFLOW_BLOCK_CONTRACT
import { assertComposeValid } from '../../core/base/module-compose.js?v=20260930j';

const FIELD_KINDS = new Set(['textField', 'textareaField', 'selectField', 'dateField']);
// ② 表单条目轴（契约 §8.2，2026-09-29 批次 275）：字段「承载形态」白名单——
//   `carrier:'template-card'` = 该条目**不在 Step2 表单里渲染**，而由 Step1「模板卡」承担
//   （如主题党日的 `type`：类型由选模板那一步决定，Step2 不再出现类型控件）。
//   有了这个标注，「声明 ↔ 实现」就不再存在第三态（既非表单字段、也非漏声明）。
const FIELD_CARRIERS = new Set(['template-card']);
const PROVENANCE_SET = new Set(['institution-common', 'branch-custom']);
const PARTICIPANT_MODE_SET = new Set(['fixed', 'configurable']);
const ORG_MODE_SET = new Set(['none', 'organizer-deep']);
const OUTPUT_BLOCK_IDS = new Set((OUTPUT_BLOCK_DEFS || []).map(b => b.id));

// capabilityId → 制度来源权威对照（防「通用制度谎报为支部自创」；新块须在此登记）
// ⚠ 2026-09-28（G1 第④项）：本表已**经守卫对账**——`block-manifest.test.mjs::S4` 要求每条
//   manifest 的 capabilityId 在本表有登记（未登记＝能力名写错/新块漏登，原先被静默放过）。
export const CAPABILITY_PROVENANCE = {
  'activity-calendar': 'institution-common', // 三会一课/主题党日 = 全党通用
  'taskforce': 'branch-custom',              // 专班 = 支部自创制度尝试
};

// 场景 id → 块 id 的**唯一允许别名**（2026-09-29 批次 274：从 `server/test/scene-write-sync.test.mjs`
//   上提为**单一源**——因为「支部停用某块」的服务端硬执行（`server/routes/resources/gates.js`）也要用它，
//   若各留一份就会出现「守卫认、运行时不认」的第二套）。
//   默认对应＝**同名**（三会一课四块 `blockId ≡ scenarioId`）；唯一例外是主题党日块（契约 §四 原例 id，
//   历史命名、不改）。**新增别名＝同批在此登记**（守卫与运行时门同读本表）。
export const BLOCK_ID_ALIASES = {
  'theme-party': 'theme-party-day',
};

// 制度溯源断链修复（2026-09-13 content 自检）：原 sopRef 指向 content/02_institution/sop/theme_party_day.md
// 与 .../taskforce.md，**两个文件均不存在**（制度溯源断链）。repoint 到真实存在的制度文件：
//   主题党日 → 常见工作场景快速指南.md（主题党日为其中场景）；专班 → 组织委员工作流程指南.md（专班由组织委员主责）。

// ── S1 试点块一：主题党日（通用制度源）────────────────────────────
export const THEME_PARTY_DAY_MANIFEST = {
  blockId: 'theme-party-day',
  name: '主题党日组织块',
  version: '1.0.0',
  provenance: 'institution-common',
  sopRef: 'content/02_institution/sop/常见工作场景快速指南.md',
  capabilityId: 'activity-calendar',
  scope: ['workspace:secretary', 'workspace:leader'],
  // P3d v0 组合声明，见 WORKFLOW_BLOCK_CONTRACT
  depends: [],        // 依赖的其他块 blockId（引用须 ∈ 块清单，禁环）
  conflictsWith: [],  // 互斥块 blockId（同一组合不得同含双方）
  inputs: {
    fields: [
      { fieldId: 'title', label: '活动名称', kind: 'textField', required: true, requiredConfigurable: false, hint: '如：学习两会精神主题党日', enabledDefault: true },
      { fieldId: 'date', label: '日期', kind: 'dateField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
      // ② §8.2 情形③：类型由**Step1 模板卡**承担（选「主题党日」模板即定型）⇒ 标 `carrier:'template-card'`，
      //   不计入 Step2 表单字段（Step2 不渲染类型控件）。
      { fieldId: 'type', label: '类型', kind: 'selectField', required: true, requiredConfigurable: true, hint: '', enabledDefault: true, carrier: 'template-card', options: [{ value: 'theme', label: '主题党日' }] },
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
  blockId: 'taskforce',
  name: '专班运行块',
  version: '1.0.0',
  provenance: 'branch-custom',
  sopRef: 'content/02_institution/sop/组织委员工作流程指南.md',
  capabilityId: 'taskforce',
  scope: ['workspace:org-commissioner', 'workspace:secretary'],
  // P3d v0 组合声明，见 WORKFLOW_BLOCK_CONTRACT
  depends: [],        // 依赖的其他块 blockId（引用须 ∈ 块清单，禁环）
  conflictsWith: [],  // 互斥块 blockId（同一组合不得同含双方）
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

// ── L3 块清单铺开：三会一课四场景（2026-09-28 批次 248）────────────────────
// 支书裁定（2026-09-28）：「块差异＝**流程组合**」＋「同类场景铺开**复用既有场景 id**」。
// 逐条事实来源（可核，不猜）：
//   · `blockId` ＝ **既有 SOP 场景 id**（`workflow/sopData.js::sopDatabase.scenarios` 的四个三会一课场景）；
//   · `sopRef` ＝ `常见工作场景快速指南.md`——其 `## 三会一课` 下正是「支部委员会 / 支部党员大会 / 党课 / 党小组会」四小节；
//   · `capabilityId` ＝ `activity-calendar`——四场景均由**活动日历写入面板**创建
//     （`calendar-tab.js::WRITE_TEMPLATES` 的 `three-meetings` 子类，派生自 `SCENARIO_WRITE_IDS['three-meetings']`）；
//   · `scope` ＝ `['workspace:secretary']`——该写面板**只在 secretary.html 呈现**（`calendar-tab.js` 原注：
//     「本写入面板仅在支书/副支书工作台（secretary.html）呈现」）；
//   · `inputs.fields` ＝ 该写面板**真实呈现的扁平字段**（`calendar-tab.js::renderFormStep`：名称 / 日期 / 地点必填，
//     时间 / 主持人 / 备注选填）。**结构化区（会议议程 / 线上异步表决）刻意不在此声明**——它们由既有引擎数据承载
//     （`sopData` / `vote-config`），manifest 只做 L3 粗粒度元数据（契约 §一「块不独立于既有机制存在」）；
//   · `stages` / `outputs` / `events` 取与主题党日块**同形**的粗粒度（写入活动 → 考勤；活动 / 考勤 / 待办 ＋ 考勤·宣传产出块；
//     `data:activity:created`）——四场景与主题党日同走 `writeActivityWithSOP` 一条写口。
const THREE_MEETINGS_SOP_REF = 'content/02_institution/sop/常见工作场景快速指南.md';

/** 造一个三会一课场景块（每次调用返回**全新对象**，避免四条 manifest 共享嵌套引用） */
function _threeMeetingsBlock(blockId, name) {
  return {
    blockId,
    name,
    version: '1.0.0',
    provenance: 'institution-common',
    sopRef: THREE_MEETINGS_SOP_REF,
    capabilityId: 'activity-calendar',
    scope: ['workspace:secretary'],
    depends: [],
    conflictsWith: [],
    inputs: {
      fields: [
        { fieldId: 'title', label: '活动名称', kind: 'textField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
        { fieldId: 'date', label: '日期', kind: 'dateField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
        { fieldId: 'location', label: '地点', kind: 'textField', required: true, requiredConfigurable: false, hint: '', enabledDefault: true },
        { fieldId: 'time', label: '时间', kind: 'textField', required: false, requiredConfigurable: false, hint: '如 14:00-16:00', enabledDefault: true },
        { fieldId: 'host', label: '主持人', kind: 'textField', required: false, requiredConfigurable: false, hint: '默认为当前用户', enabledDefault: true },
        { fieldId: 'desc', label: '备注', kind: 'textareaField', required: false, requiredConfigurable: false, hint: '活动内容/目标等', enabledDefault: true },
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
}

/** 三会一课四块（blockId 即既有场景 id；顺序与 `SCENARIO_WRITE_IDS['three-meetings']` 一致） */
export const THREE_MEETINGS_MANIFESTS = [
  { blockId: 'branch-party-meeting', name: '支部党员大会块' },
  { blockId: 'branch-committee', name: '支委会块' },
  { blockId: 'party-group-meeting', name: '党小组会块' },
  { blockId: 'party-lecture', name: '党课块' },
].map(({ blockId, name }) => _threeMeetingsBlock(blockId, name));

/** 全量块清单（S1 试点目录 ＋ 三会一课四块） */
export const BLOCK_MANIFESTS = [
  THEME_PARTY_DAY_MANIFEST, TASKFORCE_RUN_MANIFEST, ...THREE_MEETINGS_MANIFESTS,
];

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
    // ② §8.2：可选承载标注——出现时须在白名单内（`template-card` = 由 Step1 模板卡承担）
    if (f.carrier !== undefined && !FIELD_CARRIERS.has(f.carrier)) errors.push(`fields[${i}].carrier 非法: ${f.carrier}（仅 ${[...FIELD_CARRIERS].join('/')}）`);
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

/** 全量清单体检（模块加载即自检；不合规打警告但不阻断——防止契约未同步被静默吞掉） */
BLOCK_MANIFESTS.forEach((m) => {
  const res = validateBlockManifest(m);
  if (!res.ok) console.warn(`[workflow/blocks] manifest 不合规 ${m?.blockId}: ${res.errors.join('; ')}`);
});

// P3d v0 组合声明体检（同挂模块加载自检，2026-09-05）：引用缺失/互斥同含/depends 成环打警告不阻断
try {
  assertComposeValid(BLOCK_MANIFESTS);
} catch (e) {
  console.warn(`[workflow/blocks] 组合声明不合规: ${e.message}`);
}
