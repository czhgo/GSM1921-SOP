// role: [工程师]+[AI]
// 纪检委员工作台 Tab：考察管理（T-279 M3 拆分）
// 专班名单区（组织→纪检 自动同步，纪检只读同源）+ 考察总表（确认/删除）。

import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260921j';
import { loadActiveInspectionRecords, getOverdueRecords, confirmInspectionRecord, deleteInspectionRecord, listInspectionSupervision } from '../../../services/inspection.js?v=20260921j';
import { returnInspectionRecord, loadInspectionAppeals, returnInspectionAppeal, closeInspectionAppeal } from '../../../services/inspection.js?v=20260921j';
import { inspectionToLong, inspectionToWide } from '../../../services/inspection.js?v=20260921j';
import { getPersonById, getPersonName } from '../../../services/person.js?v=20260921j';
import { SourceType, OutputType, deriveOutputRoute } from '../../../core/domain.js?v=20260921j';
// P3c 单一源（批4 副本收编 2026-09-09）：超期天数与文案由 policy 派生，勿在此写字面量
import { POLICY_DEFAULTS } from '../../../core/policy-defaults.js?v=20260921j';
import { badgeHtml } from '../../../components/badges.js?v=20260921j';
import { showToast, downloadCSV, triggerPrint, _fmtDate, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260921j';
import { HandoffStore } from '../../../services/handoff.js?v=20260921j';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260921j';
// 统一检索引擎（支书 2026-09-13 裁定）：可搜索表一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260921j';
// 人×项目矩阵单一源（支书 2026-09-14 批次 35 裁定：宽表默认 + 矩阵推广到其它二元关系域）
import { renderRelationMatrix, MATRIX_COL_LIMIT } from '../../../components/relation-matrix.js?v=20260921j';

export function renderContent(ctx) {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const allRecords = loadActiveInspectionRecords();
  const longData = inspectionToLong(allRecords);
  const wideData = inspectionToWide(allRecords);
  const overdueRecords = getOverdueRecords(); // 缺省阈值 = POLICY_DEFAULTS.inspection.overdueDays（批4 单一源）
  // SOP-B-10：纪检委员的入口＝「未闭环 / 超期」项（以人为第一列），不是「一批批待她汇总的表」
  const supervisionRows = listInspectionSupervision();
  // 批次 119（支书定案二「与纪检对齐，可打回」）：考察打回的回退态与申诉队列（语义同考勤打回）
  const returnedRecs = allRecords.filter(r => r.returnedBy);
  const appeals = loadInspectionAppeals();
  const pendingAppeals = appeals.filter(a => a.status === 'pending');
  const returnedAppeals = appeals.filter(a => a.status === 'returned');
  const returnedIds = new Set(returnedRecs.map(r => r.id));
  const tagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-700' };
  const statusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-orange-100 text-orange-700', 'overdue': 'bg-red-100 text-red-700' };
  const overdueDays = POLICY_DEFAULTS.inspection.overdueDays; // 超期文案天数（批4 单一源派生）

  container.innerHTML = `
    ${_buildTaskforceRosterHTML()}
    ${_buildSupervisionCardHTML(supervisionRows, overdueDays, returnedRecs)}
    ${_buildAppealCardHTML(pendingAppeals, returnedAppeals)}
    <div class="card rounded-lg p-5">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">考察总表</h3>
          ${overdueRecords.length > 0
            ? badgeHtml(`${overdueRecords.length} 条超期`, 'danger', { title: `以下考察记录已超过${overdueDays}天未确认，请尽快处理` })
            : ''}
          <!-- 就近深链（2026-09-17 支书已裁）：超期天数就是本域可调参数，就地给去设置该分区的入口 -->
          <a href="${getBasePath()}settings.html#domain-disc" class="text-xs text-gray-500 hover:text-gray-700 underline transition-colors whitespace-nowrap">超期天数 → 纪检职责参数（设置）</a>
        </div>
        <div class="flex items-center flex-wrap justify-end gap-2">
          <!-- UI-A（2026-09-07）：互斥视图切换回退=独立小圆角钮组（去胶囊底衬；激活=主题浅底+主题色字/边框，data-view 切换逻辑照旧） -->
          <!-- 批次 35（2026-09-14 支书裁定）：宽表默认（按人）＋补「按项目」＝与「按人」互为转置；long form 降为「明细」下钻 -->
          <div class="flex items-center gap-2">
            <button class="insp-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-[var(--app-accent-bg)] border-[var(--app-accent)] [color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]" style="--acc-text-dark:color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)" data-view="wide">按人</button>
            <button class="insp-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-white border-neutral-200 text-gray-600 hover:bg-gray-50" data-view="wideItem">按项目</button>
            <button class="insp-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-white border-neutral-200 text-gray-600 hover:bg-gray-50" data-view="long">明细</button>
          </div>
          <!-- 2026-08-28 T-304 A 档下载闭环：考察总表导出 CSV + 打印 -->
          <!-- U5b（2026-09-07）：低频操作钮统一 32px 圆角（与下拉/胶囊同 32px 档，hover 统一 bg-gray-50） -->
          <button class="insp-export-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">导出 CSV</button>
          <button class="insp-print-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">打印</button>
          <!-- 2026-08-29 T-304 C2 数据交接协议：纪检→组织 考察记录提交 -->
          <button class="insp-handoff-btn h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">提交考察至支委会</button>
          ${HandoffStore.hasPendingFor('inspection-report', 'inspection') ? '<span class="text-xs text-teal-600 font-medium">待组织接收</span>' : ''}
        </div>
      </div>
      <div class="text-xs text-gray-500 mb-3">纪检委员管理考察记录，党小组组长/组织委员上传 → 纪检确认 → 录入考察总表</div>
      <!-- U5b（2026-09-07）：搜索输入统一 text-xs 紧凑档；2026-09-14 批次 27：载体收敛 lf-bar/lf-kw（34px/12px）。
           来源/状态筛选已收敛为统一检索引擎分面下拉（活动视图）；本行仅用于「人视图」姓名检索 -->
      <div class="lf-bar mb-3" id="insp-filter-row">
        <input type="text" id="insp-search-input" class="input-flat text-xs lf-kw" placeholder="搜索姓名...">
      </div>
      <div id="insp-table-container"></div>
    </div>
  `;

  const overdueIds = new Set(overdueRecords.map(r => r.id));

  // SOP-B-10 督办清单（**以人为第一列**）：只列「未闭环 / 超期」项，随记录产生即时更新——
  // 纪检在这一处推动闭环，不在月末另行汇总；**督办不等于接手**（建档与核对仍归组织委员）。
  renderFilteredList(document.getElementById('insp-sup-list'), {
    stateKey: 'disc-inspection-supervision',
    rows: supervisionRows,
    keyword: { keys: ['name', 'studentId'], placeholder: '搜索姓名 / 学号…' },
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    emptyMessage: '无未闭环 / 超期项',
    sort: null,
    table: {
      colSpan: 5,
      headHtml: `<tr>
            <th>姓名</th>
            <th>所属党小组</th>
            <th>未闭环</th>
            <th>超期</th>
            <th>最近记录人</th>
          </tr>`,
    },
    rowHtml: (s) => `
            <tr>
              <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(s.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(s.name)}</a></td>
              <td class="text-gray-600">${esc(s.partyGroup || '—')}</td>
              <td class="text-orange-700 font-medium">${s.pendingCount} 条</td>
              <td>${s.overdueCount > 0 ? `<span class="text-red-700 font-medium">${s.overdueCount} 条</span>` : '<span class="text-gray-500">—</span>'}</td>
              <td class="text-gray-600">${esc(s.latestRecordedByName || '—')}</td>
            </tr>`,
  });

  /** 考察行状态标签（单一口径；供引擎分面 get 与导出共用） */
  const statusLabelOf = (i) => returnedIds.has(i.id) ? '已打回' : (overdueIds.has(i.id) ? '超期' : (i.status === 'confirmed' ? '已确认' : '待确认'));

  // 统一检索引擎行数据：按 personId 现取档案补齐分面字段（人名一律 getPersonName(id)，禁用记录内快照）
  const longRows = allRecords.map(rec => {
    const i = inspectionToLong([rec])[0];
    const m = getPersonById(rec.personId) || {};
    return {
      ...i,
      personId: rec.personId,
      name: getPersonName(rec.personId),
      studentId: m.studentId || '',
      partyGroup: m.partyGroup || '',
      developStage: m.developStage || '',
      role: m.role || '',
      residenceStatus: m.residenceStatus || '',
    };
  });

  // 活动视图关键词（沿用原「姓名/内容/角色/来源」模糊命中，另加学号）
  const inspKeyword = { keys: ['name', 'studentId', 'content', 'role', 'source'], placeholder: '搜索姓名 / 学号 / 内容 / 来源…' };
  // 分面 = 按人分面 + 来源类别 + 状态（原「全部来源/全部状态」下拉收敛为 chips）
  const inspFacets = [
    ...personFacets({ roleLabel: roleLabelOf }),
    { key: 'srcType', label: '来源类别', get: (r) => r.sourceType === '活动' ? '活动' : '专班' },
    { key: 'statusLabel', label: '状态', get: (r) => statusLabelOf(r) },
  ];

  /** 导出用：按引擎当前筛选态（关键词 + 分面）复算行（引擎语义镜像，供 CSV 导出保持「所见即所得」） */
  function _matchLongRow(r, st) {
    if (!st) return true;
    if (st.q && !inspKeyword.keys.some(k => String(r[k] ?? '').toLowerCase().includes(st.q))) return false;
    if (st.facets.srcType && (r.sourceType === '活动' ? '活动' : '专班') !== st.facets.srcType) return false;
    if (st.facets.statusLabel && statusLabelOf(r) !== st.facets.statusLabel) return false;
    return true;
  }

  const inspSearchInput = document.getElementById('insp-search-input');
  // 本行仅服务「人视图」（活动视图自带引擎检索条，见 renderLong）
  if (inspSearchInput) inspSearchInput.addEventListener('input', () => { renderWide(); });

  let longHandle = null;
  let matrixHandle = null;
  function renderLong() {
    const tc = document.getElementById('insp-table-container');
    if (!tc) return;
    // 活动视图：检索条由引擎内建 → 隐藏仅供人视图的搜索行
    document.getElementById('insp-filter-row')?.classList.add('hidden');
    longHandle = renderFilteredList(tc, {
      stateKey: 'disc-inspection-long',
      rows: longRows,
      keyword: inspKeyword,
      facets: inspFacets,
      countUnit: '条',
      emptyMessage: '无匹配考察记录',
      table: {
        colSpan: 7,
        headHtml: `<tr>
            <th>姓名</th>
            <th>来源</th>
            <th>类别</th>
            <th>内容</th>
            <th>记录人</th>
            <th>状态</th>
            <th>操作</th>
          </tr>`,
      },
      rowHtml: (i) => {
        const isReturned = returnedIds.has(i.id);
        const isPending = i.status === 'pending';
        const isOverdue = overdueIds.has(i.id);
        const rowBg = isReturned ? 'bg-amber-50/40' : isOverdue ? 'bg-red-50/40' : isPending ? 'bg-orange-50/30' : '';
        const statusCls = isReturned ? 'bg-amber-100 text-amber-700' : (isOverdue ? statusColor.overdue : statusColor[i.status] || 'bg-gray-100 text-gray-600');
        return `
            <tr${rowBg ? ` class="${rowBg}"` : ''}>
              <td class="font-medium text-gray-800"><a href="${getBasePath()}person.html?id=${encodeURIComponent(i.personId)}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(i.personId))}</a></td>
              <td class="text-gray-600">${i.activityId ? `<a class="text-blue-600 hover:underline" href="../activity.html?id=${i.activityId}">${i.source}</a>` : i.source}</td>
              <td><span class="px-1.5 py-0.5 rounded text-xs ${i.sourceType === '活动' ? tagColor.activity : tagColor.taskforce}">${i.sourceType === '活动' ? '活动' : '专班'}</span></td>
              <td class="text-gray-600">${i.content || i.role}</td>
              <td class="text-gray-600">${i.recordedByName ? esc(i.recordedByName) : '—'}</td>
              <td><span class="px-1.5 py-0.5 rounded-full text-xs ${statusCls}">${statusLabelOf(i)}</span></td>
              <td>${isReturned
                ? '<span class="text-xs text-amber-700" title="已打回，待上传方重新确认（修改痕迹留存）">已打回 · 待上传方确认</span>'
                : (isPending || isOverdue
                  ? `<button class="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors btn-disc-confirm-insp" data-record-id="${i.id}" style="cursor:pointer;">确认</button> <button class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors btn-disc-delete-insp" data-record-id="${i.id}" style="cursor:pointer;">删除</button>`
                  : `<span class="text-xs text-green-700 mr-2">已确认</span><button class="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors btn-disc-return-insp" data-record-id="${i.id}" style="cursor:pointer;" title="打回后交上传方重新确认">打回</button>`)}</td>
            </tr>`;
      },
    });
  }

  // 确认/删除（事件委托：引擎筛选重渲染行后仍可点）
  document.getElementById('insp-table-container')?.addEventListener('click', (e) => {
    const confirmBtn = e.target.closest('.btn-disc-confirm-insp');
    if (confirmBtn) {
      confirmInspectionRecord(confirmBtn.dataset.recordId);
      showToast('success', '考察记录已确认');
      renderContent(ctx);
      return;
    }
    const delBtn = e.target.closest('.btn-disc-delete-insp');
    if (delBtn) {
      const recordId = delBtn.dataset.recordId;
      if (!confirm('确认删除该考察记录？')) return;
      if (deleteInspectionRecord(recordId)) {
        showToast('success', '考察记录已删除');
        renderContent(ctx);
      } else {
        showToast('error', '只能删除待确认状态的记录');
      }
      return;
    }
    // 打回（批次 119 · 与考勤打回同语义）：回退到「待确认」并留痕，交上传方重新确认
    const returnBtn = e.target.closest('.btn-disc-return-insp');
    if (returnBtn) {
      const recordId = returnBtn.dataset.recordId;
      const who = getPersonName(longRows.find(r => r.id === recordId)?.personId) || '该同志';
      const reason = window.prompt(`打回「${who}」的考察记录？写一句打回原因（将交上传方重新确认）：`, '');
      if (reason === null) return; // 取消
      const res = returnInspectionRecord(recordId, { by: DISC_COMMISSIONER_ID, note: reason });
      if (res.ok) showToast('success', '已打回，交上传方重新确认');
      else showToast('error', '打回失败：记录不存在');
      renderContent(ctx);
      return;
    }
    // 考察申诉（批次 119）：核实属实 → 打回上传方；不属实 → 关闭
    // ⚠ 申诉卡本体在 `#insp-table-container` 之外 ⇒ 其按钮由下方「申诉卡」监听处理（2026-09-20 批次 119 真机发现并修正）
  });

  // 考察申诉卡（批次 119）：卡本体不在表格容器内，故另挂一支；载体每次渲染重建 ⇒ 随重建重挂（与上同款，不重复绑定）
  document.getElementById('insp-appeal-card')?.addEventListener('click', (e) => {
    const appealReturnBtn = e.target.closest('.insp-appeal-return');
    if (appealReturnBtn) {
      const note = window.prompt('打回说明（可留空）——属实漏记将交上传方核实补录：', '');
      if (note === null) return;
      const res = returnInspectionAppeal(appealReturnBtn.dataset.appealId, { by: DISC_COMMISSIONER_ID, note });
      if (res.ok) showToast('success', res.hadRecord ? '已打回该考察记录，交上传方重新确认' : '已打回，交上传方核实补录');
      else showToast('error', '该申诉已处理');
      renderContent(ctx);
      return;
    }
    const appealCloseBtn = e.target.closest('.insp-appeal-close');
    if (appealCloseBtn) {
      const res = closeInspectionAppeal(appealCloseBtn.dataset.appealId, { by: DISC_COMMISSIONER_ID });
      if (res.ok) showToast('success', '该申诉已关闭（核实不属实或已另行处理）');
      else showToast('error', '该申诉已处理');
      renderContent(ctx);
    }
  });

  function renderWide(view = currentView) {
    const tc = document.getElementById('insp-table-container');
    if (!tc) return;
    document.getElementById('insp-filter-row')?.classList.remove('hidden');
    const searchEl = document.getElementById('insp-search-input');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    // 人维＝全量行（受姓名检索收窄）；项目维＝来源列，**按最近记录时间倒序**（列上限＝最近 6 项的口径）
    const persons = wideData.rows
      .filter(r => !q || (r.name || '').toLowerCase().includes(q))
      .map(r => ({ id: r.personId, name: r.name }));
    const latestOf = new Map();
    allRecords.forEach(r => {
      const k = r.activityId || r.sourceName;
      const d = r.date || r.createdAt || r.updatedAt || '';
      if (!latestOf.has(k) || d > latestOf.get(k)) latestOf.set(k, d);
    });
    const items = wideData.columns
      .map(c => ({ id: c.key, title: c.title, sub: c.type, _d: latestOf.get(c.key) || '' }))
      .sort((a, b) => String(b._d).localeCompare(String(a._d)))
      .map(c => ({ id: c.id, title: c.title, sub: c.sub }));
    const rowOf = new Map(wideData.rows.map(r => [r.personId, r]));

    // 人×项目矩阵单一源（批次 35）：wide＝行=人/列=来源；wideItem＝行=来源/列=人（互为转置）
    matrixHandle = renderRelationMatrix(tc, {
      stateKey: 'disc-inspection-matrix',
      mode: view === 'wideItem' ? 'byItem' : 'byPerson',
      persons,
      items,
      cell: (pid, iid) => {
        const v = rowOf.get(pid)?.cells?.[iid];
        return v ? `<span class="text-xs text-gray-600" title="${esc(v)}">${esc(v)}</span>` : null;
      },
      personLabel: '姓名',
      itemLabel: '来源',
      emptyText: '无考察记录（请调整筛选）',
    });
  }

  // T-304 A 档下载闭环：当前视图跟踪（导出 CSV 按当前视图导出）
  // 批次 35（2026-09-14 支书裁定）：**宽表默认**（按人），long form 降为「明细」
  let currentView = 'wide';
  container.querySelectorAll('.insp-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // UI-A（2026-09-07）：激活态=主题浅底+主题色字/边框（独立小圆角钮，无衬不再用 ov-sub-tab-active）
      container.querySelectorAll('.insp-view-btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('bg-[var(--app-accent-bg)]', on);
        b.classList.toggle('border-[var(--app-accent)]', on);
        b.classList.toggle('[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]', on);
        if (on) b.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)'); else b.style.removeProperty('--acc-text-dark');
        b.classList.toggle('bg-white', !on);
        b.classList.toggle('border-neutral-200', !on);
        b.classList.toggle('text-gray-600', !on);
      });
      currentView = btn.dataset.view;
      if (btn.dataset.view === 'long') renderLong(); else renderWide(btn.dataset.view);
    });
  });

  // T-304 A 档下载闭环：导出当前视图 CSV（明细随统一检索引擎当前筛选态；宽表随姓名检索 + 矩阵当前列上限）+ 打印
  container.querySelector('.insp-export-btn')?.addEventListener('click', () => {
    const stamp = _fmtDate(new Date());
    if (currentView === 'long') {
      // 与引擎同口径复算当前筛选结果（关键词 + 来源类别 + 状态）
      const st = longHandle ? longHandle.state : null;
      const rows = longRows.filter(r => _matchLongRow(r, st))
        .map(i => [i.name, i.source, i.sourceType, i.level, i.role || i.content, i.recordedByName || '', statusLabelOf(i)]);
      downloadCSV(`考察总表_${stamp}.csv`, ['姓名', '来源', '类别', '参与层级', '内容/角色', '记录人', '状态'], rows);
    } else {
      // 宽表「所见即所得」：列随矩阵当前列上限（未展开＝最近 6 项），行随姓名检索；按项目视图导出转置后的形态
      const searchEl = document.getElementById('insp-search-input');
      const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
      const cols = matrixHandle?.state?.showAll ? wideData.columns : wideData.columns.slice(0, MATRIX_COL_LIMIT);
      const rows = wideData.rows.filter(r => !q || (r.name || '').toLowerCase().includes(q));
      if (currentView === 'wideItem') {
        downloadCSV(
          `考察宽表_按项目_${stamp}.csv`,
          ['来源', ...rows.map(r => r.name)],
          cols.map(c => [`${c.title}（${c.type}）`, ...rows.map(r => r.cells[c.key] || '')])
        );
      } else {
        downloadCSV(
          `考察宽表_按人_${stamp}.csv`,
          ['姓名', ...cols.map(c => `${c.title}（${c.type}）`)],
          rows.map(row => [row.name, ...cols.map(c => row.cells[c.key] || '')])
        );
      }
    }
    showToast('success', `考察表已导出（${currentView === 'long' ? '明细' : currentView === 'wideItem' ? '按项目' : '按人'}）`);
  });
  container.querySelector('.insp-print-btn')?.addEventListener('click', () => {
    triggerPrint();
  });

  // T-304 C2 数据交接协议：纪检→组织 考察记录提交（后台自动派生组织侧待办）
  // T-304 第5轮 P6 源头审校+抽查：不再要求全部确认才可提交——按已确认部分按需提交，
  // 未确认/历史超期不再阻塞已确认记录的流转（每考察记录含 recordedBy 上传人=源头审校人）。
  container.querySelector('.insp-handoff-btn')?.addEventListener('click', () => {
    if (HandoffStore.hasPendingFor('inspection-report', 'inspection')) {
      showToast('info', '考察记录已提交待组织接收，请勿重复提交');
      return;
    }
    const confirmedCount = longData.filter(r => r.status === 'confirmed').length;
    if (confirmedCount === 0) {
      showToast('error', '暂无可提交的已确认考察，请先确认（或抽查）后再提交');
      return;
    }
    HandoffStore.create({
      type: 'inspection-report',
      refType: 'inspection',
      refLabel: '考察总表',
      refId: 'inspection',
      note: `考察总表共 ${longData.length} 条，已确认 ${confirmedCount} 条提交建档（未确认 ${longData.length - confirmedCount} 条可后续补提）`,
    });
    showToast('success', `考察记录（已确认 ${confirmedCount} 条）已提交至支委会，等待组织委员接收`);
    renderContent(ctx);
  });

  renderWide();
}

// ── 督办清单卡（SOP-B-10 · 以人为第一列）──
// 纪检委员的入口＝「未闭环 / 超期」项；数据由 listInspectionSupervision 按人聚合、随记录即时更新。
// 批次 119：卡内补「已打回 · 待上传方重新确认」只读区（回退态交上传方，纪检只读掌握、不代确认）。
function _buildSupervisionCardHTML(rows, overdueDays, returnedRecs = []) {
  const overdueCount = rows.reduce((n, r) => n + r.overdueCount, 0);
  const returnedHtml = returnedRecs.length === 0 ? '' : `
      <div class="mt-3 pt-3 border-t border-gray-100">
        <div class="text-xs text-gray-600 mb-1.5">已打回 · 待上传方重新确认（${returnedRecs.length}）</div>
        <div class="space-y-1">
          ${returnedRecs.map(r => `
            <div class="flex items-center gap-2 py-1.5">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#94A3B8"></span>
              <span class="text-xs text-gray-700 flex-shrink-0">${esc(getPersonName(r.personId))}</span>
              <span class="text-xs text-gray-500 flex-1 truncate">${esc(inspectionToLong([r])[0].source || '—')}${r.returnReason ? ` · ${esc(r.returnReason)}` : ''}</span>
              ${badgeHtml('已打回', 'info')}
            </div>`).join('')}
        </div>
      </div>`;
  return `
    <div class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">督办清单（未闭环 / 超期）</h3>
        <div class="flex gap-3 text-xs">
          <span class="text-gray-600">待督办 <span class="font-bold text-orange-700">${rows.length}</span> 人</span>
          <span class="text-gray-600">超期 <span class="font-bold text-red-700">${overdueCount}</span></span>
        </div>
      </div>
      <div class="text-[11px] text-gray-500 leading-5 mb-3">以人为第一列 · 随记录产生即时更新（没有「本月待汇总的表」）。<b>未闭环</b>＝已有考察记录未确认；<b>超期</b>＝未确认超过 ${overdueDays} 天。点姓名去推动闭环——<b>督办不等于接手</b>，建档与核对仍归组织委员；已确认的单条有误可「打回」，交上传方重新确认。</div>
      <div class="overflow-x-auto"><div id="insp-sup-list"></div></div>
      ${returnedHtml}
    </div>
  `;
}

// ── 考察申诉卡（批次 119 · 与考勤申诉同语义）──
// 同学报「我参与了但没记上」→ 纪检先核实：属实 → 「打回上传方」；不属实 → 关闭。
// 已打回的申诉此处只读展示（回退态交给上传方）。
function _buildAppealCardHTML(pendingAppeals, returnedAppeals) {
  if (pendingAppeals.length === 0 && returnedAppeals.length === 0) return '';
  const row = (a, actionable) => {
    const rec = loadActiveInspectionRecords().find(r => r.personId === a.personId && r.activityId === a.activityId);
    const title = rec ? (inspectionToLong([rec])[0].source || '') : a.activityId;
    return `
      <div class="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
        <a href="${getBasePath()}person.html?id=${encodeURIComponent(a.personId)}" class="text-sm font-medium text-gray-800 hover:underline hover:text-sky-700 transition-colors flex-shrink-0" title="查看完整档案">${esc(getPersonName(a.personId))}</a>
        <span class="flex-1 min-w-0">
          <span class="block text-xs text-gray-600 truncate" title="${esc(title)}">${esc(title)}</span>
          ${a.note ? `<span class="block text-xs text-gray-500 truncate">申诉说明：${esc(a.note)}</span>` : ''}
          ${a.returnNote ? `<span class="block text-xs text-amber-700 truncate">打回说明：${esc(a.returnNote)}</span>` : ''}
        </span>
        ${actionable ? `
          <button type="button" class="insp-appeal-return text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0" data-appeal-id="${a.id}" style="cursor:pointer;background:#B45309;">核实属实，打回上传方</button>
          <button type="button" class="insp-appeal-close text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0" data-appeal-id="${a.id}" style="cursor:pointer;">不属实，关闭</button>`
        : badgeHtml('已打回 · 待上传方确认', 'warning')}
      </div>`;
  };
  return `
    <div class="card rounded-lg p-4 mb-4" id="insp-appeal-card">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">考察申诉（待核实）</h3>
        <span class="text-xs text-gray-500">同学报「我参与了但没记上」——纪检<b>先核实</b>，属实再打回上传方</span>
      </div>
      ${pendingAppeals.length > 0
        ? `<div class="text-xs text-gray-600 mb-1.5">待核实（${pendingAppeals.length}）</div>${pendingAppeals.map(a => row(a, true)).join('')}`
        : '<div class="text-xs text-gray-500 py-2">无待核实申诉</div>'}
      ${returnedAppeals.length > 0
        ? `<div class="text-xs text-gray-600 mt-3 mb-1.5">已打回 · 待上传方确认（${returnedAppeals.length}）</div>${returnedAppeals.map(a => row(a, false)).join('')}`
        : ''}
    </div>
  `;
}

// ── 专班名单区（组织→纪检 自动同步，纪检只读同源 + 考察确认进度） ──
function _buildTaskforceRosterHTML() {
  const tfs = TaskForceRecordStore.getAll().filter(t => t.status === 'recruiting' || t.status === 'active');
  if (tfs.length === 0) return '';
  const allRecords = loadActiveInspectionRecords();
  const statusMeta = {
    recruiting: { label: '招募中', cls: 'bg-blue-100 text-blue-700' },
    active: { label: '进行中', cls: 'bg-green-100 text-green-700' },
  };
  const rows = tfs.map(tf => {
    const meta = statusMeta[tf.status] || statusMeta.active;
    const tfRecords = allRecords.filter(r => r.sourceType === SourceType.TASKFORCE && r.sourceName === tf.name);
    const total = tfRecords.length;
    const confirmed = tfRecords.filter(r => r.status === 'confirmed').length;
    const pending = total - confirmed;
    const memberNames = (tf.members || []).map(m => getPersonName(m.personId) || m.name || m.personId).filter(Boolean).join('、') || '—';
    const progressCls = pending > 0 ? 'text-orange-700' : 'text-green-700';
    // T-224 §8 产出物查看区（纪检项目看板卡片展开面板，同源读取）
    const inspRoute = deriveOutputRoute(OutputType.TASKFORCE_INSPECTION);
    const workloadRoute = deriveOutputRoute(OutputType.WORKLOAD);
    const workloadItems = (tf.members || []).flatMap(m =>
      (m.contributions || []).map(c => ({
        name: getPersonName(m.personId) || m.name || '成员',
        item: typeof c === 'string' ? c : (c.description || c.title || ''),
      }))
    );
    return `
      <div class="rounded-lg border border-gray-100 p-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-bold text-gray-800">${tf.name}</span>
          <span class="text-xs px-1.5 py-0.5 rounded-full ${meta.cls}">${meta.label}</span>
        </div>
        <p class="text-xs text-gray-500 mb-1">${tf.task || ''}</p>
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-600 truncate mr-2">成员：${memberNames}</span>
          <span class="${progressCls} font-medium whitespace-nowrap">考察确认 ${confirmed}/${total}${pending > 0 ? `（待确认 ${pending}）` : ''}</span>
        </div>
        <div class="mt-2 pt-2 border-t border-gray-100">
          <button class="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1" onclick="this.nextElementSibling.classList.toggle('hidden')">
            产出物 <span>▾</span>
          </button>
          <div class="hidden mt-2 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${inspRoute.color};"></span>考察记录</span>
              <span>${total === 0 ? '未提交' : pending > 0 ? `待确认 ${pending}/${total}` : `已确认 ${total}`}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${workloadRoute.color};"></span>工作量报告</span>
              <span>${workloadItems.length > 0 ? `${workloadItems.length} 项产出` : '未生成'}</span>
            </div>
            ${workloadItems.length > 0 ? `
              <ul class="space-y-1.5 pl-3">
                ${workloadItems.slice(0, 5).map(w => `<li class="text-[11px] text-gray-500 truncate">${w.name}：${w.item}</li>`).join('')}
                ${workloadItems.length > 5 ? `<li class="text-[11px] text-gray-500">…另有 ${workloadItems.length - 5} 项</li>` : ''}
              </ul>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">专班名单</h3>
        <span class="text-xs text-gray-500">名单由组织委员管理，纪检只读同步（前置）</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${rows}</div>
    </div>
  `;
}
