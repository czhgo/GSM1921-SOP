// role: [工程师]+[AI]
// 组长工作台 Tab：考察上传（T-279 M2 拆分）
// 党小组活动考察：组织者上传 → 纪检委员确认 → 录入考察总表。

import { loadInspectionRecords, saveInspectionRecords, canUploadInspection } from '../../../services/inspection.js?v=20260921f';
import { loadInspectionAppeals, reconfirmReturnedInspectionRecord, resolveInspectionAppeal } from '../../../services/inspection.js?v=20260921f';
import { loadActivities } from '../../../services/activity.js?v=20260921f';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260921f';
import { PersonPicker } from '../../../components/person-picker.js?v=20260921f';
import { inspectionToLong } from '../../../services/inspection.js?v=20260921f';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260921f';
import { SourceType, ParticipationLevel } from '../../../core/domain.js?v=20260921f';
import { showToast, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260921f';
import { solidAccentStyle, accDarkVars } from '../../../core/constants.js?v=20260921f';
import { currentLeaderGroup } from './_shared.js?v=20260921f';
import { generateId } from '../../../core/id.js?v=20260921f';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是人的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260921f';

// 私有状态（随模块自持，不污染入口）
let _inspFormVisible = false;
let _inspPickerInstance = null;

export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);

  // 清理旧的 PersonPicker 实例
  if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }

  const allRecords = loadInspectionRecords();
  const myInspection = allRecords.filter(r => r.sourceType === SourceType.ACTIVITY);
  // 当前组长身份先取出（批次 119 的回退态过滤要用；原声明在下方「来源类型选项」处，
  // 顺序在新代码之前 → TDZ ReferenceError，本批修正为本行声明、下方复用）
  const { leaderId } = currentLeaderGroup();

  // 批次 119（支书定案二「与纪检对齐，可打回」）：纪检打回 / 考察申诉 → 交上传方（本组长为上传位）核实确认。
  // 回退态两条来源（与组长台考勤上传同规）：① 考察申诉（成员报「我参与了但没记上」，纪检查实后打回）；
  //                                          ② 纪检对已确认考察记录直接打回。两者都在此处回到上传方手里。
  const returnedAppeals = loadInspectionAppeals()
    .filter(a => a.status === 'returned' && canUploadInspection(leaderId, SourceType.ACTIVITY, a.activityId));
  const pendingConfirm = [
    ...returnedAppeals.map(a => ({ kind: 'appeal', id: a.id, personId: a.personId, activityId: a.activityId, reason: a.returnNote || '' })),
    ...allRecords.filter(r => r.returnedBy && canUploadInspection(leaderId, SourceType.ACTIVITY, r.activityId))
      .map(r => ({ kind: 'record', id: r.id, personId: r.personId, activityId: r.activityId, reason: r.returnReason || '' })),
  ];

  // 来源类型选项
  // T223 排序统一：来源活动 date 降序（新者在前），专班 createdAt 降序
  // A1-2026-09-05 上传位门禁：活动类仅列本组长可上传（本组党小组会 / 本人为该活动组织者）且未归档者；专班类暂放行（负责人位待身份编码）
  const sourceActivities = loadActivities()
    .filter(a =>
      (a.type === '党小组会' || a.type === '主题党日' || a.type === '党课' || a.type === '支部党员大会') &&
      a.status !== 'cancelled' && // dogfood 组长#5（2026-09-12）：已取消活动不再出现在上传下拉（此前可选中提交，落为无效考察）
      canUploadInspection(leaderId, SourceType.ACTIVITY, a.id)
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const sourceTaskforces = TaskForceRecordStore.getAll()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // 统一检索引擎（table 模式）：明细行按人检索——关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册），
  // 行数据按 personId 现取档案补齐分面字段（人名一律 getPersonName(id)）
  const inspRows = myInspection.map(r => {
    const long = inspectionToLong([r])[0];
    const m = getPersonById(r.personId) || {};
    return {
      ...long,
      personId: r.personId,
      name: getPersonName(r.personId),
      studentId: m.studentId || '',
      partyGroup: m.partyGroup || '',
      developStage: m.developStage || '',
      role: m.role || '',
      residenceStatus: m.residenceStatus || '',
    };
  });

  const formHtml = _inspFormVisible ? `
    <div class="mt-3 p-4 rounded-lg bg-white border border-gray-100 shadow-sm" id="insp-form-panel">
      <div class="text-xs font-bold text-gray-600 mb-3">上传考察表单</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">来源类型 <span class="text-red-600">*</span></label>
          <select id="insp-source-type" class="input-flat w-full">
            <option value="">请选择来源类型</option>
            <option value="activity">活动</option>
            <option value="taskforce">专班</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择具体来源 <span class="text-red-600">*</span></label>
          <select id="insp-source-select" class="input-flat w-full" disabled>
            <option value="">请先选择来源类型</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择人员 <span class="text-red-600">*</span></label>
        <div id="insp-person-picker-container"></div>
      </div>
      <div id="insp-content-rows" class="mb-3"></div>
      <div class="flex items-center gap-3">
        <button id="insp-form-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">提交考察</button>
        <button id="insp-form-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="card rounded-lg p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考察上传</h3>
        <button class="btn-md" id="btn-leader-upload-insp" style="${_accVars}background:${accentRgba};color:color-mix(in srgb, ${accent} 60%, #000);border:1px solid ${accentBorder};">${_inspFormVisible ? '收起表单' : '上传考察表单'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组活动考察：组织者上传 → 纪检委员确认 → 录入考察总表。仅列本组党小组会/本人组织的活动（其余活动由该活动组织者上传；组长非组织者=本组监督位，督促上传）</div>
      ${formHtml}
      <div class="overflow-x-auto ${_inspFormVisible ? 'mt-4 pt-3 border-t border-gray-100' : ''}">
        <div id="insp-list-host"></div>
      </div>
      ${pendingConfirm.length > 0 ? `
      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs font-bold text-gray-600 mb-2">纪检打回 · 待你确认（${pendingConfirm.length}）</div>
        <div class="text-xs text-gray-500 mb-2">纪检核实后打回，请重新确认该场考察（修改痕迹留存）；确认后回到纪检「待确认」队列复核。补录时请选参与层级并填考察内容</div>
        <div class="space-y-2">
          ${pendingConfirm.map(pc => {
            const act = loadActivities().find(a => a.id === pc.activityId);
            return `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-100 flex-wrap">
              <span class="text-xs font-medium text-gray-800 min-w-[60px]">${esc(getPersonName(pc.personId))}</span>
              <span class="text-xs text-gray-500 flex-1 min-w-0 truncate" title="${esc(pc.reason)}">${esc(act ? act.title : '活动已下架')}${pc.reason ? ` · ${esc(pc.reason)}` : ''}</span>
              ${pc.kind === 'appeal' ? `
              <select class="input-flat text-xs leader-return-level" data-id="${pc.id}" aria-label="参与层级">
                <option value="organize">组织者</option>
                <option value="deep">深度参与者</option>
              </select>
              <input type="text" class="input-flat text-xs leader-return-content" data-id="${pc.id}" placeholder="考察内容" style="min-width:140px;">` : ''}
              <button type="button" class="leader-return-confirm text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-kind="${pc.kind}" data-id="${pc.id}" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">${pc.kind === 'appeal' ? '补录并提交' : '确认并提交'}</button>
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  // 统一检索引擎（table 模式：rowHtml 返回 <tr>，表格样式由 styles.css::.data-table 单一源提供）：
  // 关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册）；行数 ≤8 时引擎自动不渲染检索条。
  renderFilteredList(container.querySelector('#insp-list-host'), {
    stateKey: 'leader-inspection-list',
    rows: inspRows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    emptyMessage: '暂无考察明细',
    table: {
      colSpan: 4,
      headHtml: `<tr>
            <th>姓名</th>
            <th>活动</th>
            <th>考察内容</th>
            <th>确认状态</th>
          </tr>`,
    },
    rowHtml: (i) => `
            <tr>
              <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(i.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(i.personId))}</a></td>
              <td class="text-gray-600">${i.activityId ? `<a class="text-blue-600 hover:underline" href="../activity.html?id=${i.activityId}">${esc(i.source)}</a>` : esc(i.source)}</td>
              <td class="text-gray-600">${esc(i.content || i.role)}</td>
              <td><span class="px-1.5 py-0.5 rounded-full text-xs ${i.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${i.status === 'confirmed' ? '已确认' : '待确认'}</span></td>
            </tr>`,
  });

  // 绑定上传按钮（保态折叠 2026-09-08：对齐纪检会议考勤录入/组长考勤表单判例——表单已渲染
  //（#insp-form-panel 在 DOM）时，收起/展开只切该容器 hidden，不销毁 _inspPickerInstance、
  // 不重建 innerHTML，已选来源/人员/逐人考察内容保留；
  // 外部 re-render 仍按 _inspFormVisible 原逻辑整容器重建，属既有行为可接受）
  container.querySelector('#btn-leader-upload-insp')?.addEventListener('click', () => {
    const panel = container.querySelector('#insp-form-panel');
    const btn = container.querySelector('#btn-leader-upload-insp');
    if (!panel) { // 首次打开（表单未渲染）：走 _inspFormVisible 渲染表单 + 创建 picker
      _inspFormVisible = true;
      renderContent(ctx);
      return;
    }
    const collapsed = panel.classList.toggle('hidden');
    if (btn) btn.textContent = collapsed ? '上传考察表单' : '收起表单';
  });

  // 纪检打回 / 考察申诉：上传方确认并重新提交（批次 119 · 与组长台考勤打回同规）——
  // 记录类：清打回痕、回「待确认」交纪检复核；申诉类：按所选层级/内容补录（同样回「待确认」，确认权归纪检）。
  container.querySelectorAll('.leader-return-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind;
      const id = btn.dataset.id;
      const { leaderId } = currentLeaderGroup();
      let res;
      if (kind === 'appeal') {
        const sel = container.querySelector(`.leader-return-level[data-id="${id}"]`);
        const input = container.querySelector(`.leader-return-content[data-id="${id}"]`);
        const level = sel ? sel.value : ParticipationLevel.ORGANIZE;
        const content = input ? input.value.trim() : '';
        if (!content) { showToast('error', '请填写考察内容'); return; }
        res = resolveInspectionAppeal({ appealId: id, actorId: leaderId, level, content });
      } else {
        res = reconfirmReturnedInspectionRecord(id, { actorId: leaderId });
      }
      if (!res.ok) { showToast('error', '确认失败：该记录不存在'); return; }
      showToast('success', '已重新提交，等待纪检复核');
      renderContent(ctx);
    });
  });

  // 如果表单可见，初始化事件绑定
  if (_inspFormVisible) {
    _initInspForm(container, sourceActivities, sourceTaskforces, ctx, myInspection);
  }
}

function _initInspForm(container, sourceActivities, sourceTaskforces, ctx, myInspection) {
  const { accent } = ctx;

  // 初始化 PersonPicker
  const pickerContainer = container.querySelector('#insp-person-picker-container');
  if (pickerContainer) {
    _inspPickerInstance = new PersonPicker({
      mode: 'multi',
      placeholder: '选择人员',
      accentColor: accent,
      onSelect: (ids) => {
        _renderInspContentRows(ids);
      }
    });
    _inspPickerInstance.render(pickerContainer);
  }

  // 渲染初始内容行（空）
  _renderInspContentRows([]);

  // 来源类型切换
  const sourceTypeSelect = container.querySelector('#insp-source-type');
  const sourceSelect = container.querySelector('#insp-source-select');
  if (sourceTypeSelect && sourceSelect) {
    sourceTypeSelect.addEventListener('change', () => {
      const type = sourceTypeSelect.value;
      sourceSelect.disabled = !type;
      if (type === 'activity') {
        sourceSelect.innerHTML = `<option value="">请选择活动</option>` +
          (sourceActivities.length === 0 ? '<option value="" disabled>本组暂无可上传活动（仅本组党小组会与本组承办活动可上传）</option>' : '') +
          sourceActivities.map(a => `<option value="${a.id}" data-name="${a.title}">${a.title}（${a.date}）${myInspection.some(r => r.activityId === a.id) ? ' · 已上传' : ''}</option>`).join('');
      } else if (type === 'taskforce') {
        sourceSelect.innerHTML = `<option value="">请选择专班</option>` +
          sourceTaskforces.map(tf => `<option value="${tf.id}" data-name="${tf.name}">${tf.name}</option>`).join('');
      } else {
        sourceSelect.innerHTML = '<option value="">请先选择来源类型</option>';
      }
    });
  }

  // 取消按钮（保态折叠 2026-09-08：取消 = 收起，保留已选与逐人填写内容；仅提交成功后才重置会话）
  container.querySelector('#insp-form-cancel')?.addEventListener('click', () => {
    const panel = container.querySelector('#insp-form-panel');
    if (panel) panel.classList.add('hidden');
    const btn = container.querySelector('#btn-leader-upload-insp');
    if (btn) btn.textContent = '上传考察表单';
  });

  // 提交按钮
  container.querySelector('#insp-form-submit')?.addEventListener('click', () => {
    const sourceType = container.querySelector('#insp-source-type')?.value;
    if (!sourceType) { showToast('error', '请选择来源类型'); return; }

    const sourceOption = container.querySelector('#insp-source-select')?.selectedOptions[0];
    const sourceId = container.querySelector('#insp-source-select')?.value;
    if (!sourceId) { showToast('error', '请选择具体来源'); return; }

    const selectedIds = _inspPickerInstance ? _inspPickerInstance.getSelected() : [];
    if (selectedIds.length === 0) { showToast('error', '请选择人员'); return; }

    // A1-2026-09-05 上传位守卫：活动类须为本人可上传（本组党小组会 / 本人为该活动组织者）；专班类暂放行（负责人位待身份编码）
    const { leaderId } = currentLeaderGroup();
    if (sourceType === 'activity' && !canUploadInspection(leaderId, SourceType.ACTIVITY, sourceId)) {
      showToast('error', '该活动不在您的考察上传位内（仅本组党小组会/本人组织的活动可上传）'); return;
    }

    // 收集每人的考察内容
    const records = [];
    for (const personId of selectedIds) {
      const contentEl = container.querySelector(`#insp-content-${personId}`);
      const content = contentEl ? contentEl.value.trim() : '';
      if (!content) { showToast('error', `请填写 ${getPersonName(personId)} 的考察内容`); return; }

      const record = {
        id: generateId('insp'),
        sourceType: sourceType === 'activity' ? SourceType.ACTIVITY : SourceType.TASKFORCE,
        activityId: sourceType === 'activity' ? sourceId : null,
        sourceName: sourceType === 'activity' ? null : (sourceOption?.dataset.name || sourceId),
        personId,
        level: ParticipationLevel.ORGANIZE, // 默认组织层级，可由用户选择
        content,   // P1-5 修复：考察内容入 content 字段
        role: '组织者', // role 字段恢复为角色职责标签
        recordedBy: leaderId, // A1-2026-09-05：recordedBy 记真实操作人（组长），弃幽灵 u_exec
        recordedAt: new Date().toISOString(),
        status: 'pending',
      };

      records.push(record);
    }

    // 写入 mockDB
    const allRecords = loadInspectionRecords();
    allRecords.push(...records);
    saveInspectionRecords(allRecords);

    showToast('success', `考察上传成功，共 ${records.length} 条记录，等待纪检委员确认`);

    // 清理并刷新
    _inspFormVisible = false;
    if (_inspPickerInstance) { _inspPickerInstance.destroy(); _inspPickerInstance = null; }
    renderContent(ctx);
  });
}

function _renderInspContentRows(selectedIds) {
  const rowsContainer = document.getElementById('insp-content-rows');
  if (!rowsContainer) return;

  if (selectedIds.length === 0) {
    rowsContainer.innerHTML = '';
    return;
  }

  // 保态（2026-09-14 批次 32）：重建前先收下已填内容。点选即回调后本函数会被频繁调用；
  // 若不保态，「先给 A 填、再选 B」会把 A 已写的内容清空（原「确认选择」路径同样有此病）。
  const kept = {};
  rowsContainer.querySelectorAll('textarea[id^="insp-content-"]').forEach((t) => {
    kept[t.id.slice('insp-content-'.length)] = t.value;
  });

  rowsContainer.innerHTML = `
    <div class="text-xs font-bold text-gray-600 mb-2">逐人考察内容</div>
    <div class="space-y-2 max-h-60 overflow-y-auto">
      ${selectedIds.map(pid => {
        const person = getPersonById(pid);
        const name = person ? person.name : pid;
        return `
          <div class="p-2 rounded-lg bg-white">
            <div class="text-sm font-medium text-gray-800 mb-1">${name}</div>
            <textarea id="insp-content-${pid}" class="input-flat w-full text-xs resize-none" rows="2" placeholder="请填写考察内容描述">${esc(kept[pid] || '')}</textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
