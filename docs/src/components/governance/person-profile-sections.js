// role: [工程师]+[AI]
// 个人档案页的「本人自述」展示：折叠摘要 + 5 个子组。
// 字段顺序与含义沿用自我描述字段单一源（core/domain/self-profile.js）。
import { escHtml as esc } from '../../core/base/utils.js?v=20261018e';
import {
  isSelfProfileEmpty, SELF_PROFILE_FIELDS,
} from '../../core/domain/self-profile.js?v=20261018e';

/** 15 个自述字段的展示子组（顺序＝展开后的阅读顺序；键集≡SELF_PROFILE_FIELDS） */
export const SELF_PROFILE_GROUPS = [
  { title: '基本信息', keys: ['phone', 'grade', 'major'] },
  { title: '学生工作', keys: ['hasStudentWork', 'studentWorks', 'familiarWorks', 'familiarWorksOther'] },
  { title: '志愿服务与项目', keys: ['volunteered', 'volunteerHours', 'ledProject', 'keyProjects'] },
  { title: '发展方向', keys: ['futureDirections', 'futureDirectionsOther'] },
  { title: '荣誉与补充', keys: ['honors', 'extraNote'] },
];

/** 自述字段总数（摘要行「已填 N/15」的分母单一源） */
export const SELF_PROFILE_TOTAL = SELF_PROFILE_FIELDS.length;

const FIELD_BY_KEY = new Map(SELF_PROFILE_FIELDS.map((field) => [field.key, field]));

/** 主问题为「否」时，关联字段的空值语义（无 / 不适用，而不是「未填写」） */
const DEPENDENT_FIELDS = {
  studentWorks: { parent: 'hasStudentWork', empty: '无（本人填写为不担任）' },
  volunteerHours: { parent: 'volunteered', empty: '不适用' },
  keyProjects: { parent: 'ledProject', empty: '无' },
};

/** 长文本字段整宽显示（桌面端每行不少于约 45 个汉字） */
const LONG_TEXT_KEYS = new Set(['familiarWorksOther', 'futureDirectionsOther', 'extraNote']);

function hasValue(field, value) {
  if (field.type === 'bool') return value === true || value === false;
  if (field.type === 'multi') return Array.isArray(value) && value.some((item) => String(item == null ? '' : item).trim());
  if (field.type === 'list') {
    return Array.isArray(value) && value.some((row) => row && typeof row === 'object'
      && Object.values(row).some((cell) => String(cell == null ? '' : cell).trim()));
  }
  return String(value == null ? '' : value).trim() !== '';
}

/** 该字段是否「已回答」：主问题为否时，关联子表/补充不再算缺口 */
function isFieldAnswered(key, selfProfile) {
  const dep = DEPENDENT_FIELDS[key];
  if (dep && selfProfile?.[dep.parent] === false) return true;
  const field = FIELD_BY_KEY.get(key);
  return field ? hasValue(field, selfProfile?.[key]) : false;
}

/** 已填字段数（bool=false 计为已填；主问题为否时关联项计为已回答） */
export function countSelfProfileFilled(selfProfile) {
  return SELF_PROFILE_FIELDS.filter((field) => isFieldAnswered(field.key, selfProfile)).length;
}

/** 缺失子组名（最多 3 项；用于折叠摘要） */
export function selfProfileMissingGroupNames(selfProfile) {
  const missing = SELF_PROFILE_GROUPS
    .filter((group) => group.keys.some((key) => !isFieldAnswered(key, selfProfile)))
    .map((group) => group.title);
  if (missing.length === 0) return '已填全';
  return `缺失：${missing.slice(0, 3).join('、')}${missing.length > 3 ? ' 等' : ''}`;
}

function emptyTextFor(key, selfProfile) {
  const dep = DEPENDENT_FIELDS[key];
  if (dep && selfProfile?.[dep.parent] === false) return dep.empty;
  return '未填写';
}

/** 子表：表头 + 行（不为每行做白卡；子项不再加 data-field） */
function listTableHtml(field, value, emptyText) {
  const rows = Array.isArray(value)
    ? value.filter((row) => row && typeof row === 'object'
      && Object.values(row).some((cell) => String(cell == null ? '' : cell).trim()))
    : [];
  if (!rows.length) return esc(emptyText);
  const cols = field.itemFields || [];
  return `<div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr>${cols.map((col) => `<th scope="col" class="text-left text-[11px] font-normal text-gray-500 pb-1 pr-3 whitespace-nowrap">${esc(col.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr class="border-t border-gray-100 align-top">${cols.map((col) => `<td class="py-1.5 pr-3 text-gray-800 break-words whitespace-pre-wrap">${esc(row[col.key] || '—')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function fieldValueHtml(field, selfProfile) {
  const value = selfProfile?.[field.key];
  if (field.type === 'bool') {
    if (value === true) return '是';
    if (value === false) return '否';
    return '未填写';
  }
  if (field.type === 'multi') {
    const values = Array.isArray(value) ? value.filter((item) => String(item == null ? '' : item).trim()) : [];
    return values.length ? esc(values.join('、')) : esc(emptyTextFor(field.key, selfProfile));
  }
  if (field.type === 'list') {
    return listTableHtml(field, value, emptyTextFor(field.key, selfProfile));
  }
  const text = String(value == null ? '' : value).trim();
  return text ? esc(text) : esc(emptyTextFor(field.key, selfProfile));
}

function fieldRowHtml(field, selfProfile) {
  const fullWidth = field.type === 'list' || LONG_TEXT_KEYS.has(field.key);
  return `<div class="min-w-0 border-b border-gray-100 py-1.5${fullWidth ? ' sm:col-span-2' : ''}" data-field="${field.key}">
    <dt class="text-xs text-gray-500">${esc(field.label)}</dt>
    <dd class="mt-0.5 text-sm text-gray-800 break-words whitespace-pre-wrap">${fieldValueHtml(field, selfProfile)}</dd>
  </div>`;
}

function groupHtml(group, selfProfile) {
  return `<section class="mt-4 first:mt-0" aria-label="${esc(group.title)}">
    <h3 class="text-sm font-semibold text-gray-700">${esc(group.title)}</h3>
    <dl class="mt-1 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      ${group.keys.map((key) => fieldRowHtml(FIELD_BY_KEY.get(key), selfProfile)).join('')}
    </dl>
  </section>`;
}

/**
 * Render the self-description projection; authorization is enforced before this view receives data.
 * @param {Object} selfProfile
 * @param {Object} [options]
 * @param {boolean} [options.isSelf]         — 本人：显示「填写/编辑我的自述」
 * @param {boolean} [options.canDictate]     — 同支部组织委员代录：显示「代录自述」
 * @param {string}  [options.readOnlyReason] — 无权时的只读原因（不隐藏整块）
 */
export function renderSelfDescriptionSection(selfProfile, {
  isSelf = false, canDictate = false, readOnlyReason = '',
} = {}) {
  const empty = isSelfProfileEmpty(selfProfile);
  const filled = countSelfProfileFilled(selfProfile);
  const missingHint = selfProfileMissingGroupNames(selfProfile);
  const action = isSelf
    ? `<button type="button" id="person-self-profile-btn" data-mode="self" class="btn-outline text-sm px-4 py-2 rounded-lg">${empty ? '填写' : '编辑'}我的自述</button>`
    : canDictate
      ? '<button type="button" id="person-self-profile-btn" data-mode="dictate" class="btn-outline text-sm px-4 py-2 rounded-lg">代录自述</button>'
      : `<p class="text-xs text-gray-400">${esc(readOnlyReason || '仅本人或本支部组织委员可填写')}</p>`;

  const body = empty
    ? `<p class="mt-2 text-sm text-gray-600">${isSelf
      ? '尚未填写自我描述，可填写后完善个人情况。'
      : '本人尚未填写自我描述。'}</p>`
    : SELF_PROFILE_GROUPS.map((group) => groupHtml(group, selfProfile)).join('');

  return `<section id="person-self-description" aria-labelledby="person-self-description-heading" class="mb-6 border-b border-gray-100 pb-6">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <details id="person-self-details" class="min-w-0 flex-1">
        <summary class="flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 py-1">
          <span id="person-self-description-heading" class="text-base font-semibold text-gray-700">本人自述</span>
          <span class="text-xs text-gray-600">· 已填 ${filled}/${SELF_PROFILE_TOTAL}</span>
          <span class="text-xs text-gray-500">${esc(missingHint)}</span>
        </summary>
        <div class="mt-2 border-t border-gray-100 pt-1">${body}</div>
      </details>
      <div class="flex-shrink-0">${action}</div>
    </div>
  </section>`;
}
