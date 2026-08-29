// role: [工程师]+[AI]
// 组长工作台 Tab：活动管理（T-279 M2 拆分）
// 党小组组长可创建党小组会、主题党日活动，写入后自动生成SOP任务节点。
// 含决策树引导式写入（DecisionTreeState）+ 活动详情/子记录内联编辑 + 活动角色赋权。

import { setState, getAppState } from '../../../core/state.js?v=20260829a';
import { BranchService } from '../../../services/runtime.js?v=20260829a';
import { DecisionTreeState, DECISION_TREE_CONFIGS, renderWorkflowPanel, writeActivityWithSOP } from '../../../services/decision-tree.js?v=20260829a';
import { AuthStore } from '../../../services/auth.js?v=20260829a';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260829a';
import { mockDB, AttendanceStatus, ATTENDANCE_STATUS_LABELS, SourceType, ParticipationLevel, OutputType, deriveOutputRoute } from '../../../core/domain.js?v=20260829a';
import { persist } from '../../../core/data-adapter.js?v=20260829a';
import { loadAttendanceRecords, saveAttendanceRecords } from '../../../services/attendance.js?v=20260829a';
import { loadInspectionRecords, saveInspectionRecords } from '../../../services/inspection.js?v=20260829a';
import { PersonPicker } from '../../../components/person-picker.js?v=20260829a';
import { getPersonName, PEOPLE } from '../../../mock/index.js?v=20260829a';
import { badgeHtml } from '../../../components/badge.js?v=20260829a';
import { showToast } from '../../../core/utils.js?v=20260829a';
import { solidAccentStyle, accDarkVars, accDarkParts } from '../../../core/constants.js?v=20260829a';
import { filterByRole, getCurrentLeaderId } from './_shared.js?v=20260829a';

// 私有状态（随模块自持，不污染入口）
const dt = new DecisionTreeState('leader');
const DECISION_TREE = DECISION_TREE_CONFIGS.leader;
let _dtOrgPicker = null;      // 决策树表单：组织者多选
let _dtDeepPicker = null;     // 决策树表单：深度参与者多选
let _detailOrgPicker = null;   // 活动详情：组织者多选（预填现有 assignments）
let _detailDeepPicker = null;  // 活动详情：深度参与者多选

export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);
  const _dtSelDark = accDarkParts(accent);
  const _dtBtnStyle = (selected) => selected
    ? `--acc-bg-dark:${_dtSelDark.bg};--acc-text-dark:${_dtSelDark.text};--acc-border-dark:${_dtSelDark.border};background:${accentRgba};color:${accent};border:1.5px solid ${accentBorder};`
    : `--acc-bg-dark:#1E293B;--acc-text-dark:#CBD5E1;--acc-border-dark:#334155;background:white;color:#6B7280;border:1.5px solid #E5E7EB;`;

  const activities = ctx.filteredActivities || [];

  // T223 排序统一：未完成在前、已完成在后，组内按 date 降序（新者在前）
  const isDone = a => a.archived || ['completed', 'cancelled'].includes(a.status);
  const sorted = [...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const display = [...sorted.filter(a => !isDone(a)), ...sorted.filter(a => isDone(a))];

  const panelVisible = dt.showPanel;

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">活动写入</h3>
        <button class="btn-md" id="btn-leader-create" style="${_accVars}background:${accentRgba};color:${accent};border:1px solid ${accentBorder};">${panelVisible ? '收起面板' : '创建活动'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">党小组组长可创建党小组会、主题党日活动，写入后自动生成SOP任务节点</div>

      ${panelVisible ? _renderDecisionTreePanel({ accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark }) : ''}

      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs text-gray-400 mb-2">已有关联活动</div>
        <div class="space-y-2" id="leader-activity-list">
          ${display.length === 0 ? '<p class="text-xs text-gray-400 text-center py-4">暂无关联活动</p>' :
            display.map(a => `
              <div class="leader-act-item flex items-center justify-between p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer" data-act-id="${a.id}">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800">${a.title || '未命名'}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
                </div>
                ${badgeHtml(a.status === 'published' ? '已发布' : '草稿', a.status === 'published' ? 'success' : 'warning')}
              </div>
            `).join('')}
        </div>
        <div id="leader-act-detail" class="hidden mt-3 rounded-xl p-4"></div>
      </div>
    </div>
  `;

  _bindDecisionTreeEvents(container, { accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark });

  // ── 决策树表单内联赋权 PersonPicker（表单可见时初始化，随渲染重建） ──
  const dtOrgEl = container.querySelector('#dt-org-picker');
  const dtDeepEl = container.querySelector('#dt-deep-picker');
  const currentLeaderId = getCurrentLeaderId(); // 组长本人（默认赋权对象）
  if (dtOrgEl) {
    if (_dtOrgPicker) { _dtOrgPicker.destroy(); _dtOrgPicker = null; }
    _dtOrgPicker = new PersonPicker({ mode: 'multi', placeholder: '选择组织者', accentColor: accent, initialIds: [currentLeaderId], onSelect: () => {} });
    _dtOrgPicker.render(dtOrgEl);
  }
  if (dtDeepEl) {
    if (_dtDeepPicker) { _dtDeepPicker.destroy(); _dtDeepPicker = null; }
    _dtDeepPicker = new PersonPicker({ mode: 'multi', placeholder: '选择深度参与者', accentColor: accent, onSelect: () => {} });
    _dtDeepPicker.render(dtDeepEl);
  }

  // ── 活动点击展开详情+子记录（P3-4） ──
  container.querySelectorAll('.leader-act-item').forEach(item => {
    item.addEventListener('click', () => {
      const actId = item.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const detailPanel = document.getElementById('leader-act-detail');
      if (!detailPanel) return;
      detailPanel.classList.remove('hidden');

      const actSubs = (mockDB.actSubRecords && mockDB.actSubRecords[actId]) || { attendance: [], inspection: [], publicity: [], materials: [] };

      function saveActSubs() {
        mockDB.actSubRecords = { ...mockDB.actSubRecords, [actId]: actSubs };
        persist();
      }

      function renderActSubTable(type, items) {
        const configs = {
          attendance: { label: '考勤记录', color: '#10B981', fields: [{ key: 'person', label: '姓名' }, { key: 'status', label: '出勤状态' }, { key: 'note', label: '备注' }, { key: 'time', label: '时间' }] },
          inspection: { label: '考察记录', color: '#D97706', fields: [{ key: 'person', label: '被考察人' }, { key: 'content', label: '考察内容' }, { key: 'result', label: '考察结论' }, { key: 'time', label: '时间' }] },
          publicity: { label: '宣传记录', color: '#0E7490', fields: [{ key: 'title', label: '宣传标题' }, { key: 'author', label: '撰写人' }, { key: 'channel', label: '发布渠道' }, { key: 'time', label: '时间' }] },
          materials: { label: '材料记录', color: '#3B82F6', fields: [{ key: 'name', label: '材料名称' }, { key: 'author', label: '提交人' }, { key: 'note', label: '备注' }, { key: 'time', label: '时间' }] },
        };
        const cfg = configs[type];
        const cellOf = (item, key) => {
          if (key === 'time') return (item.recordedAt || '').slice(0, 16).replace('T', ' ') || '-';
          return item[key] || '-';
        };
        const rows = items.map((item, idx) => `
          <tr class="border-b border-gray-50">
            ${cfg.fields.map(f => `<td class="px-2 py-1.5 text-xs text-gray-700">${cellOf(item, f.key)}</td>`).join('')}
            <td class="px-2 py-1.5 text-center"><button class="act-sub-del-btn text-xs text-red-400 hover:text-red-600" data-type="${type}" data-idx="${idx}">删除</button></td>
          </tr>
        `).join('');

        return `
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <h5 class="text-xs font-bold font-title-cn" style="color:${cfg.color}">${cfg.label} (${items.length})</h5>
              <button class="act-sub-add-btn text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors" style="color:${cfg.color};border-color:${cfg.color}40" data-type="${type}">+ 添加</button>
            </div>
            ${items.length === 0
              ? '<p class="text-[12px] text-gray-300 pl-2">暂无记录</p>'
              : `<table class="w-full text-left"><thead><tr class="border-b border-gray-200">
                  ${cfg.fields.map(f => `<th class="px-2 py-1 text-xs font-medium text-gray-500">${f.label}</th>`).join('')}
                  <th class="px-2 py-1 text-xs font-medium text-gray-500 w-12"></th>
                </tr></thead><tbody>${rows}</tbody></table>`
            }
          </div>`;
      }

      detailPanel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h5 class="font-title-cn text-sm font-bold text-gray-700">${activity.title || '未命名'}</h5>
          <button id="btn-close-act-detail" class="text-xs text-gray-400 hover:text-gray-600">收起</button>
        </div>
        <div class="text-xs text-gray-500 mb-2">${activity.date || ''} ${activity.type ? '· ' + activity.type : ''}</div>

        <!-- T-190 活动角色内联编辑：主源 assignments 预填，保存走 syncProjectRoles 三合一 -->
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <h6 class="font-title-cn text-xs font-bold text-gray-600">活动角色</h6>
            <button id="btn-save-activity-roles" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};">保存角色</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-[12px] text-gray-400 mb-1">组织者</div>
              <div id="detail-org-picker"></div>
            </div>
            <div>
              <div class="text-[12px] text-gray-400 mb-1">深度参与者</div>
              <div id="detail-deep-picker"></div>
            </div>
          </div>
          <p class="text-[12px] text-gray-400 mt-2">提示：此处修改将同步写入活动主源数据，被赋权人将收到通知。</p>
        </div>

        <div class="mt-3 pt-3 border-t border-gray-100">
          <h6 class="font-title-cn text-xs font-bold text-gray-600 mb-1">子记录</h6>
          ${renderActSubTable('attendance', actSubs.attendance)}
          ${renderActSubTable('inspection', actSubs.inspection)}
          ${renderActSubTable('publicity', actSubs.publicity)}
          ${renderActSubTable('materials', actSubs.materials)}
        </div>
      `;

      // 初始化详情角色 PersonPicker（预填主源 assignments）
      if (_detailOrgPicker) { _detailOrgPicker.destroy(); _detailOrgPicker = null; }
      if (_detailDeepPicker) { _detailDeepPicker.destroy(); _detailDeepPicker = null; }
      const detailOrgEl = detailPanel.querySelector('#detail-org-picker');
      const detailDeepEl = detailPanel.querySelector('#detail-deep-picker');
      const actAssigns = Array.isArray(activity.assignments) ? activity.assignments : [];
      if (detailOrgEl) {
        _detailOrgPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择组织者',
          accentColor: accent,
          initialIds: actAssigns.filter(x => x.role === 'organizer').map(x => x.personId),
          onSelect: () => {},
        });
        _detailOrgPicker.render(detailOrgEl);
      }
      if (detailDeepEl) {
        _detailDeepPicker = new PersonPicker({
          mode: 'multi',
          placeholder: '选择深度参与者',
          accentColor: accent,
          initialIds: actAssigns.filter(x => x.role === 'deep').map(x => x.personId),
          onSelect: () => {},
        });
        _detailDeepPicker.render(detailDeepEl);
      }

      // 保存角色：syncProjectRoles 三合一（写主源 + 快照 + 通知）
      detailPanel.querySelector('#btn-save-activity-roles')?.addEventListener('click', async () => {
        const orgIds = _detailOrgPicker ? _detailOrgPicker.getSelected() : [];
        const deepIds = _detailDeepPicker ? _detailDeepPicker.getSelected() : [];
        const newAssignments = [
          ...orgIds.map(personId => ({ personId, role: 'organizer' })),
          ...deepIds.map(personId => ({ personId, role: 'deep' })),
        ];
        const actorId = AuthStore.getCurrentUser()?.personId;
        const { added, removed } = await AuthStore.syncProjectRoles({ scopeRef: actId, assignments: newAssignments, actorId });
        // 做事即销待办：保存角色 → 销组长「赋权」待办
        TodoStore.completeBySource(TodoSourceType.ACTIVITY, actId);
        if (added > 0 || removed > 0) {
          showToast('success', `活动角色已更新：新增 ${added} 人，移除 ${removed} 人`);
        } else {
          showToast('info', '活动角色未发生变化');
        }
        // 刷新活动列表与详情（读取最新主源）
        const fresh = await BranchService.listActivities();
        setState({ activities: fresh });
        detailPanel.querySelector('#btn-close-act-detail')?.click();
      });

      // 收起按钮
      detailPanel.querySelector('#btn-close-act-detail')?.addEventListener('click', () => {
        detailPanel.classList.add('hidden');
      });

      // 添加子记录（内联表单替代 prompt 弹窗；attendance/inspection 同步写入正式考勤/考察库，消除双轨维护）
      detailPanel.querySelectorAll('.act-sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const panelEl = btn.closest('.mt-3');
          const existing = panelEl?.querySelector('.act-sub-inline-form');
          if (existing) { existing.remove(); return; }

          // 内联表单 HTML（person 字段由 PersonPicker 渲染，其余为原生控件）
          const statusOpts = [
            { value: AttendanceStatus.PRESENT, label: '出勤' },
            { value: AttendanceStatus.LEAVE, label: '请假' },
            { value: AttendanceStatus.ABSENT, label: '缺席' },
            { value: AttendanceStatus.MADE_UP, label: '已补课' },
          ];
          const resultOpts = ['考察合格', '待观察', '需补材料'];
          const textFields = {
            publicity: [['title', '宣传标题'], ['author', '撰写人'], ['channel', '发布渠道']],
            materials: [['name', '材料名称'], ['author', '提交人'], ['note', '备注']],
          };

          let formHtml = '';
          // T-224 §5.5：投递去向由产出类型派生（系统内置），组织者只见「提交」不见「发送对象」
          const routeHint = (type) => {
            const map = {
              attendance: OutputType.ATTENDANCE,
              inspection: OutputType.INSPECTION,
              publicity: OutputType.PUBLICITY,
            };
            const route = deriveOutputRoute(map[type]);
            return route ? `<div class="text-[11px] text-gray-400 mb-2">提交后自动投递：${route.route} → ${route.sink}</div>` : '';
          };
          if (type === 'attendance') {
            formHtml = `
              <div class="act-sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加考勤记录（同步正式考勤库）</div>
                ${routeHint('attendance')}
                <div class="mb-2 act-sub-picker"></div>
                <div class="flex gap-2 mb-2">
                  <select class="f-status input-flat text-xs flex-1">${statusOpts.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}</select>
                  <input class="f-note input-flat text-xs flex-1" placeholder="备注（选填）">
                </div>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="act-sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="act-sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">提交</button>
                </div>
              </div>`;
          } else if (type === 'inspection') {
            formHtml = `
              <div class="act-sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加考察记录（同步正式考察库，待纪检委员确认）</div>
                ${routeHint('inspection')}
                <div class="mb-2 act-sub-picker"></div>
                <textarea class="f-content input-flat text-xs w-full resize-none mb-2" rows="2" placeholder="考察内容描述（必填）"></textarea>
                <select class="f-result input-flat text-xs w-full mb-2">${resultOpts.map(r => `<option>${r}</option>`).join('')}</select>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="act-sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="act-sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">提交</button>
                </div>
              </div>`;
          } else {
            const fields = textFields[type];
            formHtml = `
              <div class="act-sub-inline-form mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div class="text-[12px] font-bold text-gray-600 mb-2">添加${type === 'publicity' ? '宣传' : '材料'}记录</div>
                ${routeHint(type)}
                ${fields.map(([key, label]) => `<input class="f-${key} input-flat text-xs w-full mb-2" placeholder="${label}${key === 'title' || key === 'name' ? '（必填）' : '（选填）'}">`).join('')}
                <div class="flex gap-2 justify-end">
                  <button type="button" class="act-sub-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                  <button type="button" class="act-sub-save-btn text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(accent, accentBorder)};">提交</button>
                </div>
              </div>`;
          }

          panelEl.insertAdjacentHTML('beforeend', formHtml);
          const form = panelEl.querySelector('.act-sub-inline-form');

          // person 类记录用 PersonPicker 选人（直接得 personId，对齐正式库）
          if (type === 'attendance' || type === 'inspection') {
            const picker = new PersonPicker({ mode: 'multi', placeholder: '选择人员', accentColor: accent, onSelect: () => {} });
            picker.render(form.querySelector('.act-sub-picker'));
            form._picker = picker;
          }

          form.querySelector('.act-sub-cancel-btn').addEventListener('click', () => {
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
          });

          form.querySelector('.act-sub-save-btn').addEventListener('click', () => {
            if (type === 'attendance') {
              const ids = form._picker ? form._picker.getSelected() : [];
              if (ids.length === 0) { showToast('error', '请选择人员'); return; }
              const statusEnum = form.querySelector('.f-status').value;
              const note = form.querySelector('.f-note').value.trim();
              const newAtts = [];
              ids.forEach(pid => {
                actSubs[type].push({ person: getPersonName(pid), personId: pid, status: ATTENDANCE_STATUS_LABELS[statusEnum], note, recordedBy: AuthStore.getCurrentUser()?.personId || 'u_exec', recordedAt: new Date().toISOString() });
                newAtts.push({ id: 'att_' + Date.now() + '_' + pid, personId: pid, activityId: actId, status: statusEnum, recordedBy: 'u_exec', recordedAt: new Date().toISOString(), overdue: false });
              });
              const all = loadAttendanceRecords();
              saveAttendanceRecords([...all, ...newAtts]);
              showToast('success', `已添加 ${ids.length} 条考勤记录并同步正式考勤库`);
            } else if (type === 'inspection') {
              const content = form.querySelector('.f-content').value.trim();
              if (!content) { showToast('error', '请填写考察内容'); return; }
              const ids = form._picker ? form._picker.getSelected() : [];
              if (ids.length === 0) { showToast('error', '请选择被考察人'); return; }
              const result = form.querySelector('.f-result').value;
              const newRecords = [];
              ids.forEach(pid => {
                actSubs[type].push({ person: getPersonName(pid), personId: pid, content, result, recordedBy: AuthStore.getCurrentUser()?.personId || 'u_exec', recordedAt: new Date().toISOString() });
                // P1-5 语义修复：考察内容入 content，role 存角色职责标签
                newRecords.push({
                  id: 'insp_' + Date.now() + '_' + pid,
                  sourceType: SourceType.ACTIVITY, activityId: actId, sourceName: null,
                  personId: pid, level: ParticipationLevel.ORGANIZE,
                  content, role: '组织者',
                  recordedBy: 'u_exec', recordedAt: new Date().toISOString(), status: 'pending',
                });
              });
              const all = loadInspectionRecords();
              saveInspectionRecords([...all, ...newRecords]);
              showToast('success', `已添加 ${ids.length} 条考察记录并同步正式考察库`);
            } else {
              const fields = textFields[type];
              const requiredKey = type === 'publicity' ? 'title' : 'name';
              const requiredVal = form.querySelector(`.f-${requiredKey}`).value.trim();
              if (!requiredVal) { showToast('error', `请填写${type === 'publicity' ? '宣传标题' : '材料名称'}`); return; }
              const entry = {};
              fields.forEach(([key]) => { entry[key] = form.querySelector(`.f-${key}`).value.trim(); });
              entry.recordedBy = AuthStore.getCurrentUser()?.personId || 'u_exec';
              entry.recordedAt = new Date().toISOString();
              actSubs[type].push(entry);
              showToast('success', '已添加');
            }
            saveActSubs();
            if (form._picker?.destroy) form._picker.destroy();
            form.remove();
            const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
            if (actEl) actEl.click();
          });
        });
      });

      // 删除子记录
      detailPanel.querySelectorAll('.act-sub-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          actSubs[type].splice(idx, 1);
          saveActSubs();
          const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
          if (actEl) actEl.click();
        });
      });
    });
  });
}

function _renderDecisionTreePanel({ accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark }) {
  const { L1, L2, L3, L4, hostGroup } = dt.selections;

  // 当前进行到第几步（S6 修复：原代码引用未定义变量 step 导致面板渲染崩溃）
  // 步骤指示器：组织场景→活动形式→时长→发起方向
  const step = !L1 ? 1 : !L2 ? 2 : !L3 ? 3 : 4;

  // 步骤指示器
  const steps = ['组织场景', '活动形式', '时长', '发起方向'];
  const stepperHtml = `
    <div class="flex items-center gap-1 mb-5">
      ${steps.map((s, i) => {
        const isActive = i === step - 1;
        const isDone = i < step - 1;
        const dotColor = isDone ? accent : isActive ? accent : '#D1D5DB';
        const lineColor = isDone ? accent : '#E5E7EB';
        return `
          ${i > 0 ? `<div class="flex-1 h-0.5 rounded" style="--acc-dot-dark:${lineColor === accent ? _dtSelDark.text : '#475569'};background:${lineColor};"></div>` : ''}
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="--acc-bg-dark:${isDone || isActive ? _dtSelDark.bg : '#1E293B'};--acc-text-dark:${isDone || isActive ? _dtSelDark.text : '#94A3B8'};--acc-border-dark:${isDone || isActive ? _dtSelDark.border : '#475569'};background:${isDone || isActive ? accentRgba : '#F3F4F6'};color:${dotColor};border:1.5px solid ${dotColor};">${isDone ? '&#10003;' : i + 1}</div>
            <span class="text-xs ${isActive ? 'font-bold' : ''}" style="--acc-text-dark:${dotColor === accent ? _dtSelDark.text : '#CBD5E1'};color:${dotColor};">${s}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // L1 选择
  const l1Html = `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L1 组织场景 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L1.map(opt => {
          const selected = L1 === opt.value;
          return `<button class="dt-l1-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  `;

  // 承办党小组选择器（L1选择后显示）
  const hostGroupHtml = L1 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">承办党小组 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.HOST_GROUPS.map(g => {
          const selected = hostGroup === g;
          return `<button class="dt-host-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${g}" style="${_dtBtnStyle(selected)}cursor:pointer;">${g}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L2 选择（L1选择后显示）
  const l2Options = L1 ? (DECISION_TREE.L2[L1] || []) : [];
  const l2Html = L1 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L2 活动形式 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${l2Options.map(opt => {
          const selected = L2 === opt.value;
          return `<button class="dt-l2-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L3 选择（L2选择后显示）
  const l3Html = L2 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L3 时长 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L3.map(opt => {
          const selected = L3 === opt.value;
          return `<button class="dt-l3-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // L4 选择（L3选择后显示）
  const l4Html = L3 ? `
    <div class="mb-4">
      <div class="text-xs font-bold text-gray-600 mb-2">L4 发起方向 <span class="text-red-500">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L4.map(opt => {
          const selected = L4 === opt.value;
          return `<button class="dt-l4-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 表单区域（L4选择后显示）
  const allSelected = L1 && L2 && L3 && L4 && hostGroup;
  const formHtml = allSelected ? `
    <div class="mt-4 pt-4 border-t border-dashed border-gray-200">
      <div class="text-xs font-bold text-gray-600 mb-3">填写活动信息</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">T-0 日期 <span class="text-red-500">*</span></label>
          <input type="date" id="dt-target-date" class="input-flat w-full">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动地点 <span class="text-red-500">*</span></label>
          <input type="text" id="dt-location" class="input-flat w-full" placeholder="活动地点">
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动名称 <span class="text-red-500">*</span></label>
        <input type="text" id="dt-title" class="input-flat w-full" placeholder="活动名称">
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动描述（选填）</label>
        <textarea id="dt-desc" class="input-flat w-full resize-none" rows="2" placeholder="简要描述活动内容"></textarea>
      </div>

      <!-- T-190 活动角色：创建即赋权，组织者默认组长本人 -->
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动角色（创建即赋权，组织者默认组长本人）</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-[12px] text-gray-400 mb-1">组织者（默认组长本人，可改）</div>
            <div id="dt-org-picker"></div>
          </div>
          <div>
            <div class="text-[12px] text-gray-400 mb-1">深度参与者（选填）</div>
            <div id="dt-deep-picker"></div>
          </div>
        </div>
      </div>

      <!-- SOP 预览 -->
      <div class="mb-4 p-3 rounded-lg bg-white">
        <div class="text-xs font-bold text-gray-600 mb-2">SOP 任务节点预览</div>
        <div id="dt-sop-preview" class="space-y-1 text-xs text-gray-500">
          ${_renderSopPreview()}
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button id="dt-submit" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">写入活动</button>
        <button id="dt-cancel" class="text-sm px-4 py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
      ${stepperHtml}
      ${l1Html}
      ${hostGroupHtml}
      ${l2Html}
      ${l3Html}
      ${l4Html}
      ${formHtml}
    </div>
  `;
}

function _renderSopPreview() {
  return dt.renderSopPreview();
}

function _bindDecisionTreeEvents(container, ctx) {
  const { accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark } = ctx;

  const _refresh = () => {
    const state = getAppState();
    const filteredState = filterByRole(state, 'leader');
    renderContent({ ...ctx, filteredActivities: filteredState.activities || [] });
  };

  // 创建/收起按钮
  container.querySelector('#btn-leader-create')?.addEventListener('click', () => {
    dt.showPanel = !dt.showPanel;
    if (!dt.showPanel) dt.reset();
    _refresh();
  });

  // L1 按钮
  container.querySelectorAll('.dt-l1-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      dt.select('L1', val);
      // L1 变更时重置后续选择
      dt.select('L2', null);
      dt.select('L3', null);
      dt.select('L4', null);
      dt.select('hostGroup', null);
      _refresh();
    });
  });

  // 承办党小组按钮
  container.querySelectorAll('.dt-host-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('hostGroup', btn.dataset.value);
      _refresh();
    });
  });

  // L2 按钮
  container.querySelectorAll('.dt-l2-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L2', btn.dataset.value);
      dt.select('L3', null);
      dt.select('L4', null);
      _refresh();
    });
  });

  // L3 按钮
  container.querySelectorAll('.dt-l3-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L3', btn.dataset.value);
      dt.select('L4', null);
      _refresh();
    });
  });

  // L4 按钮
  container.querySelectorAll('.dt-l4-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L4', btn.dataset.value);
      _refresh();
    });
  });

  // 取消按钮
  container.querySelector('#dt-cancel')?.addEventListener('click', () => {
    dt.reset();
    _refresh();
  });

  // 写入活动按钮
  container.querySelector('#dt-submit')?.addEventListener('click', async () => {
    const { L1, L2, L3, L4, hostGroup } = dt.selections;
    const targetDate = container.querySelector('#dt-target-date')?.value;
    const location = container.querySelector('#dt-location')?.value?.trim();
    const title = container.querySelector('#dt-title')?.value?.trim();
    const desc = container.querySelector('#dt-desc')?.value?.trim();

    // 校验必填
    if (!targetDate) { showToast('error', '请填写 T-0 日期'); return; }
    if (!location) { showToast('error', '请填写活动地点'); return; }
    if (!title) { showToast('error', '请填写活动名称'); return; }

    const l1Label = DECISION_TREE.L1.find(o => o.value === L1)?.label || L1;
    const l2Label = DECISION_TREE.L2[L1]?.find(o => o.value === L2)?.label || L2;
    const scenarioId = dt.getScenarioId();

    try {
      const currentLeaderId = getCurrentLeaderId();
      const activityData = {
        title,
        // L2 与 L1 同名时（党小组会无子分类）不重复拼接
        type: l2Label && l2Label !== l1Label ? `${l1Label}·${l2Label}` : l1Label,
        date: targetDate,
        targetDate,
        location,
        description: desc || '',
        organizer: currentLeaderId, // 顶层 organizer 写真实 personId（原则7 同一套数据，修复 'leader' 角色名临时方案）
        direction: L4,
        duration: L3,
        hostGroup,
        scenarioId,
        status: 'draft',
        visibility: 'group',
        createdBy: currentLeaderId,
      };

      // T-190：创建时同步赋权——组织者（默认组长本人）+ 深度参与者写入主源 assignments
      const organizerIds = _dtOrgPicker ? _dtOrgPicker.getSelected() : [currentLeaderId];
      const deepIds = _dtDeepPicker ? _dtDeepPicker.getSelected() : [];
      const assignments = [
        ...organizerIds.map(personId => ({ personId, role: 'organizer' })),
        ...deepIds.map(personId => ({ personId, role: 'deep' })),
      ];
      // T-190 修复：删除「清空后强加组长本人」兜底——与 spec 偏差A「未选人保留待办兜底」矛盾，
      // 该兜底使 assignments 永不为空，mock.js 的 assignments.length===0 分支永不触发，待办从未派生
      activityData.assignments = assignments;

      const { activity, taskCount } = await writeActivityWithSOP(activityData, scenarioId, targetDate);

      // 做事即销待办：创建活动即完成赋权 → 销组长「赋权」待办
      TodoStore.completeBySource(TodoSourceType.ACTIVITY, activity.id);

      // 同步赋权：追加审计快照 + 通知被赋权人（主源已由创建写入，原则7 不重复填写）
      // 组长本人作为默认组织者属发起人，不重复计入赋权统计/快照/通知
      const actorId = AuthStore.getCurrentUser()?.personId;
      const grantedEntries = assignments.filter(a => a.personId !== currentLeaderId);
      const granted = AuthStore.recordProjectGrants(activity.id, grantedEntries, actorId);
      if (granted > 0) {
        showToast('success', `已同步赋权 ${granted} 名成员`);
      }

      showToast('success', `活动「${title}」创建成功`);
      if (taskCount > 0) {
        showToast('success', `已生成 ${taskCount} 个SOP任务节点`);
      }

      // 4. 渲染工作流可视化面板
      const definitionId = dt.mapToDefinitionId();
      renderWorkflowPanel('leader-workflow', 'leader-tab-content', definitionId, title, 'append');

      // 5. 重置面板并刷新
      dt.reset();
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (err) {
      console.error('[ws-leader] 创建活动失败：', err);
      showToast('error', `创建失败：${err.message}`);
    }
  });
}
