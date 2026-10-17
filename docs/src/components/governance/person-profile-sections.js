// role: [工程师]+[AI]
// 个人档案页的自我描述展示：字段顺序与含义沿用自我描述字段单一源。
import { escHtml as esc } from '../../core/base/utils.js?v=20261017b';
import { isSelfProfileEmpty, SELF_PROFILE_FIELDS } from '../../core/domain/self-profile.js?v=20261017b';

function fieldValueHtml(field, value) {
  if (field.type === 'bool') {
    if (value === true) return '是';
    if (value === false) return '否';
    return '未填写';
  }
  if (field.type === 'multi') {
    const values = Array.isArray(value) ? value.filter(Boolean) : [];
    return values.length ? esc(values.join('、')) : '未填写';
  }
  if (field.type === 'list') {
    const rows = Array.isArray(value) ? value.filter((row) => row && typeof row === 'object') : [];
    if (!rows.length) return '未填写';
    return `<ul class="space-y-2">${rows.map((row) => `
      <li class="rounded-lg bg-white px-3 py-2 border border-gray-100">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">${(field.itemFields || []).map((item) => `
          <div class="min-w-0">
            <dt class="text-[11px] text-gray-500">${esc(item.label)}</dt>
            <dd class="text-sm text-gray-800 break-words whitespace-pre-wrap">${esc(row[item.key] || '—')}</dd>
          </div>`).join('')}
        </dl>
      </li>`).join('')}
    </ul>`;
  }
  const text = String(value ?? '').trim();
  return text ? esc(text) : '未填写';
}

/** Render the self-description projection; authorization is enforced before this view receives data. */
export function renderSelfDescriptionSection(selfProfile, { isSelf = false } = {}) {
  const empty = isSelfProfileEmpty(selfProfile);
  const selfEditButton = isSelf
    ? `<button type="button" id="person-self-profile-btn" class="btn-outline text-sm px-4 py-2 rounded-lg">${empty ? '填写' : '编辑'}我的自我描述</button>`
    : '';
  if (empty) {
    return `<section id="person-self-description" aria-labelledby="person-self-description-heading" class="mb-6">
      <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h2 id="person-self-description-heading" class="text-base font-semibold text-gray-700">自我描述</h2>
          <p class="text-xs text-gray-500 mt-1">由本人填写，用于介绍个人情况、经历与发展方向。</p>
        </div>
        ${selfEditButton}
      </div>
      <p class="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">${isSelf
        ? '尚未填写自我描述，可填写后完善个人情况。'
        : '本人尚未填写自我描述。'}</p>
    </section>`;
  }

  return `<section id="person-self-description" aria-labelledby="person-self-description-heading" class="mb-6">
    <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
      <div>
        <h2 id="person-self-description-heading" class="text-base font-semibold text-gray-700">自我描述</h2>
        <p class="text-xs text-gray-500 mt-1">由本人填写，用于介绍个人情况、经历与发展方向。</p>
      </div>
      ${selfEditButton}
    </div>
    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3">${SELF_PROFILE_FIELDS.map((field) => `
      <div class="min-w-0 rounded-xl bg-gray-50 px-4 py-3 ${field.type === 'list' ? 'sm:col-span-2' : ''}">
        <dt class="text-xs text-gray-500 mb-1">${esc(field.label)}</dt>
        <dd class="text-sm text-gray-800 break-words whitespace-pre-wrap">${fieldValueHtml(field, selfProfile?.[field.key])}</dd>
      </div>`).join('')}
    </dl>
  </section>`;
}
