// role: [工程师]+[AI]
// 组织委员工作台 Tab：考察上传（T-279 M3 拆分，照 M2 样板）
// 专班考察：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表。

import { loadInspectionRecords, saveInspectionRecords } from '../../../services/inspection.js?v=20260920g';
import { reconfirmReturnedInspectionRecord } from '../../../services/inspection.js?v=20260920g';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260920g';
import { anchorDetailToTrigger } from '../../../components/detail-anchor.js?v=20260920g';
import { AuthStore } from '../../../services/auth.js?v=20260920g';
import { PersonPicker } from '../../../components/person-picker.js?v=20260920g';
import { inspectionToLong } from '../../../services/inspection.js?v=20260920g';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260920g';
import { SourceType, ParticipationLevel } from '../../../core/domain.js?v=20260920g';
import { showToast, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260920g';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260920g';
import { generateId } from '../../../core/id.js?v=20260920g';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：考察明细表接入关键词 + 分面（≤8 行引擎自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260920g';

// 私有状态（随模块自持，不污染入口）
let _orgInspFormVisible = false;
let _orgInspPickerInstance = null;

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);

  if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const tfInspection = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE);

  // 批次 119（支书定案二「与纪检对齐，可打回」）：纪检打回 → 交上传方（专班负责人 / 组织委员）重新确认。
  // 专班考察无成员侧申诉口（申诉队列按活动登记），此处只承载「记录被打回」这一条回退态。
  const returnedRecords = tfInspection.filter(r => r.returnedBy);

  // T223 专班新者在前（createdAt 降序）
  const activeTaskforces = TaskForceRecordStore.getAll()
    .filter(t => t.status === 'active' || t.status === 'recruiting')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const formHtml = _orgInspFormVisible ? `
    <div class="mt-3 p-4 rounded-lg bg-white border border-gray-100 shadow-sm" id="org-insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传专班考察表单</div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择专班 <span class="text-red-600">*</span></label>
        <select id="org-insp-tf-select" class="input-flat w-full">
          <option value="">请选择专班</option>
          ${activeTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}（${tf.status === 'active' ? '运行中' : '招募中'}）</option>`).join('')}
        </select>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择人员 <span class="text-red-600">*</span></label>
        <div id="org-insp-person-picker-container"></div>
      </div>
      <div id="org-insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="org-insp-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考察</button>
        <button id="org-insp-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
      <p class="text-[11px] text-gray-500 mt-2">提交后自动投递：纪检确认 → 考察总表（组织委员建档），无需手动选择接收方</p>
    </div>
  ` : '';

  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-700' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-orange-100 text-orange-700' };

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班考察上传</h3>
        <button class="btn-md" id="btn-org-upload-insp" style="${_accVars}background:${accentRgba};color:color-mix(in srgb, ${accent} 60%, #000);border:1px solid ${accentBorder};">${_orgInspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">专班考察：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表</div>
      ${formHtml}
      <div class="overflow-x-auto ${_orgInspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <div id="org-insp-list-host"></div>
        <div id="org-insp-detail" class="hidden mt-3"></div>
      </div>
      ${returnedRecords.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">纪检打回 · 待你确认（${returnedRecords.length}）</div>
        <div class="text-xs text-gray-500 mb-2">纪检核实后打回，请重新确认该条专班考察（修改痕迹留存）；确认后回到纪检「待确认」队列复核</div>
        <div class="space-y-2">
          ${returnedRecords.map(r => `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-100">
              <span class="text-xs font-medium text-gray-800 min-w-[60px]">${esc(getPersonName(r.personId))}</span>
              <span class="text-xs text-gray-500 flex-1 min-w-0 truncate" title="${esc(r.returnReason || '')}">${esc(r.sourceName || '专班已下架')}${r.returnReason ? ` · ${esc(r.returnReason)}` : ''}</span>
              <button type="button" class="org-return-confirm text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-id="${r.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">确认并提交</button>
            </div>`).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 绑定上传按钮（保态折叠 2026-09-06：对齐纪检会议考勤录入判例——表单已渲染
  //（#org-insp-form-panel 在 DOM）时，收起/展开只切该容器 hidden，不销毁
  // _orgInspPickerInstance、不重建 innerHTML，已选专班/人员/逐人考察内容保留；
  // 外部 re-render 仍按 _orgInspFormVisible 原逻辑整容器重建，属既有行为可接受）
  container.querySelector('#btn-org-upload-insp')?.addEventListener('click', () => {
    const panel = container.querySelector('#org-insp-form-panel');
    const btn = container.querySelector('#btn-org-upload-insp');
    if (!panel) { // 首次打开（表单未渲染）：走 _orgInspFormVisible 渲染表单 + 创建 picker
      _orgInspFormVisible = true;
      renderContent(ctx);
      return;
    }
    const collapsed = panel.classList.toggle('hidden');
    if (btn) btn.textContent = collapsed ? '上传考察表单' : '收起表单';
  });

  // 统一检索引擎（table 模式：rowHtml 返回 <tr>，避免把 <div> 塞进 <tbody>）——
  // 关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册）；≤8 行引擎自动不渲染检索条
  const inspRows = tfInspection.map((r) => {
    const long = inspectionToLong([r])[0];
    const m = getPersonById(r.personId) || {};
    return {
      ...long,
      personId: r.personId,
      name: getPersonName(r.personId),
      partyGroup: m.partyGroup || '',
      developStage: m.developStage || '',
      role: m.role || '',
    };
  });
  const listHost = container.querySelector('#org-insp-list-host');
  renderFilteredList(listHost, {
    stateKey: 'org-inspection-table',
    rows: inspRows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '条',
    emptyMessage: '暂无专班考察记录',
    table: {
      colSpan: 5,
      headHtml: `<tr>
            <th>姓名</th>
            <th>专班</th>
            <th>标签</th>
            <th>考察内容</th>
            <th>状态</th>
          </tr>`,
    },
    rowHtml: (i) => `
            <tr class="cursor-pointer" data-insp-detail="${esc(i.id)}" title="点击查看考察详情">
              <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(i.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(i.personId))}</a></td>
              <td class="text-gray-600">${esc(i.source)}</td>
              <td><span class="px-1.5 py-0.5 rounded text-xs ${tagColor[i.sourceType] || 'bg-gray-50 text-gray-500'}">专班</span></td>
              <td class="text-gray-600">${esc(i.content)}</td>
              <td><span class="px-1.5 py-0.5 rounded-full text-xs ${statusColor[i.status] || 'bg-gray-100 text-gray-600'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>`,
  });

  // 考察记录行 → 行下展开详情预览（支书 2026-08-11 裁定：卡片主体可点，展示该条考察记录详情）
  // 事件委托：引擎筛选重渲染后行仍可点
  listHost.addEventListener('click', (e) => {
    // 姓名链接（→ 成员档案页）优先，不触发行点击展开考察详情
    if (e.target.closest('a')) return;
    const row = e.target.closest('[data-insp-detail]');
    if (!row) return;
    {
      const rec = tfInspection.find(r => r.id === row.dataset.inspDetail);
      const detailEl = container.querySelector('#org-insp-detail');
      if (!rec || !detailEl) return;
      const isOpen = detailEl.dataset.openId === rec.id;
      if (isOpen) {
        detailEl.classList.add('hidden');
        delete detailEl.dataset.openId;
        return;
      }
      const long = inspectionToLong([rec])[0];
      // 考察记录详情（支书 2026-08-11 四审纠正：深色=黑底白字 / 浅色=白底黑字，
      // 用 CSS 变量跟随主题——原 bg-gray-50/60 深色模式下无覆盖看不清；
      // 行列分隔线提升可读性，不再用高饱和实底+白字）
      const statusBadge = rec.status === 'confirmed'
        ? '<span class="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">已确认</span>'
        : '<span class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">待确认</span>';
      detailEl.innerHTML = `
        <div class="rounded-lg p-3" style="background:var(--neutral-50);border:1px solid var(--neutral-200);">
          <div class="flex items-center justify-between mb-2 pb-2" style="border-bottom:1px solid var(--neutral-200);">
            <p class="text-xs font-medium" style="color:var(--neutral-800);">考察记录详情</p>
            <span class="text-[11px]" style="color:var(--neutral-500);">上传人 ${getPersonName(rec.recordedBy) || '—'} · ${rec.recordedAt || '—'}</span>
          </div>
          <div class="text-xs">
            <div class="grid grid-cols-2 gap-x-6 py-1.5" style="border-bottom:1px solid var(--neutral-200);">
              <p style="color:var(--neutral-700);">姓名 <a href="${getBasePath()}person.html?id=${encodeURIComponent(rec.personId)}" class="hover:underline hover:text-sky-700 transition-colors" style="color:var(--neutral-800);font-weight:500;" title="查看完整档案">${esc(long.name)}</a></p>
              <p style="color:var(--neutral-700);">专班 <span style="color:var(--neutral-800);font-weight:500;">${long.source}</span></p>
            </div>
            <div class="grid grid-cols-2 gap-x-6 py-1.5" style="border-bottom:1px solid var(--neutral-200);">
              <p style="color:var(--neutral-700);">参与层级 <span style="color:var(--neutral-800);font-weight:500;">${long.level}</span></p>
              <p style="color:var(--neutral-700);">状态 ${statusBadge}</p>
            </div>
            <div class="grid grid-cols-1 gap-x-6 py-1.5">
              <p style="color:var(--neutral-700);">考察内容 <span style="color:var(--neutral-800);font-weight:500;">${rec.content || rec.role || '—'}</span></p>
            </div>
          </div>
          <p class="text-[11px] mt-2 pt-2" style="color:var(--neutral-500);border-top:1px solid var(--neutral-200);">流程：专班负责人/组织委员上传 → 纪检委员确认 → 录入考察总表</p>
        </div>`;
      // 触点即落点（全局 UX 反思批次 2026-09-13）：详情紧贴被点的考察行展开并滚入视野
      //（此前单例面板固定在整张表之后，行数一多就要下滚寻找）
      anchorDetailToTrigger(detailEl, row);
      detailEl.dataset.openId = rec.id;
    }
  });

  // 纪检打回：上传方重新确认（批次 119 · 与考勤打回同规）——清打回痕、回「待确认」交纪检复核
  container.querySelectorAll('.org-return-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      const actorId = AuthStore.getCurrentUser()?.personId || 'p13';
      const res = reconfirmReturnedInspectionRecord(btn.dataset.id, { actorId });
      if (!res.ok) { showToast('error', '确认失败：该记录不存在'); return; }
      showToast('success', '已重新提交，等待纪检复核');
      renderContent(ctx);
    });
  });

  if (_orgInspFormVisible) {
    _initOrgInspForm(container, activeTaskforces, ctx);
  }
}

function _initOrgInspForm(container, activeTaskforces, ctx) {
  const { accent } = ctx;

  const pickerContainer = container.querySelector('#org-insp-person-picker-container');
  if (pickerContainer) {
    _orgInspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderOrgInspContentRows(ids);
      }
    });
    _orgInspPickerInstance.render(pickerContainer);
  }

  _renderOrgInspContentRows([]);

  container.querySelector('#org-insp-form-cancel')?.addEventListener('click', () => {
    // 保态折叠（同 toggle）：取消 = 收起，保留已选与逐人填写内容；仅提交成功后才重置会话
    const panel = container.querySelector('#org-insp-form-panel');
    if (panel) panel.classList.add('hidden');
    const btn = container.querySelector('#btn-org-upload-insp');
    if (btn) btn.textContent = '上传考察表单';
  });

  container.querySelector('#org-insp-form-submit')?.addEventListener('click', () => {
    const tfSelect = container.querySelector('#org-insp-tf-select');
    const tfId = tfSelect?.value;
    const tfOption = tfSelect?.selectedOptions[0];
    if (!tfId) { showToast('error', '请选择专班'); return; }

    const tfName = tfOption?.dataset.name || tfId;
    const selectedIds = _orgInspPickerInstance ? _orgInspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    const records = [];
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#org-insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${getPersonName(personId)} 的考察内容`); return; }

      records.push({
        id: generateId('insp'),
        sourceType: SourceType.TASKFORCE,
        activityId: null,
        sourceName: tfName,
        personId,
        level: ParticipationLevel.DEEP_PARTICIPATE,
        content,                 // 2026-09-04 补齐 P1-5：考察内容入 content 字段（原误写 role）
        role: '深度参与者',       // role 恢复为角色标签（与 level deep 语义一致）
        recordedBy: AuthStore.getCurrentUser()?.personId || 'p13', // A1-2026-09-05：真实操作人（组织委员建档位临时承载专班上传，负责人位待另裁）
        recordedAt: new Date().toISOString(),
        status: 'pending',
      });
    }

    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `专班考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);
    _orgInspFormVisible = false;
    if (_orgInspPickerInstance) { _orgInspPickerInstance.destroy(); _orgInspPickerInstance = null; }
    renderContent(ctx);
  });
}

function _renderOrgInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('org-insp-content-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  // 保态（2026-09-14 批次 32）：同组长台考察上传——重建前收下已填内容，改选人员不清空已写内容
  const kept = {};
  rowsContainer.querySelectorAll('textarea[id^="org-insp-content-"]').forEach((t) => {
    kept[t.id.slice('org-insp-content-'.length)] = t.value;
  });

  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人考察内容</div>
    <div class="space-y-2 max-h-60 overflow-y-auto">
      ${selectedIds.map(pid => {
        const name = getPersonName(pid) || pid;
        return `
          <div class="flex items-start gap-2">
            <span class="text-xs font-medium text-gray-700 min-w-[3rem] pt-2">${name}</span>
            <textarea id="org-insp-content-${pid}" class="input-flat-sm w-full resize-none" rows="2" placeholder="请填写考察内容描述">${esc(kept[pid] || '')}</textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
