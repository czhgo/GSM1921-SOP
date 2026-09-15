// role: [工程师]+[AI]
// 组长工作台 Tab：活动管理（T-279 M2 拆分）
// 党小组组长可创建党小组会、主题党日活动，写入后自动生成SOP任务节点。
// 含决策树引导式写入（DecisionTreeState）+ 活动详情/子记录内联编辑 + 活动角色赋权。

import { setState, getAppState } from '../../../core/state.js?v=20260915d';
import { BranchService } from '../../../services/runtime.js?v=20260915d';
import { DecisionTreeState, DECISION_TREE_CONFIGS, renderWorkflowPanel, writeActivityWithSOP, hostGroups as buildHostGroupOptions } from '../../../services/decision-tree.js?v=20260915d';
// 党小组常态清单唯一来源（活组、按 seq 升序）——承办党小组选项不再写死
import { groupOptions } from '../../../services/party-group.js?v=20260915d';
import { AuthStore } from '../../../services/auth.js?v=20260915d';
import { TodoStore, TodoSourceType } from '../../../services/todo.js?v=20260915d';
import { mockDB, OutputType, deriveOutputRoute } from '../../../core/domain.js?v=20260915d';
import { persist } from '../../../core/data-adapter.js?v=20260915d';
import { PersonPicker } from '../../../components/person-picker.js?v=20260915d';
import { recordFormShell } from '../../../components/forms.js?v=20260915d';
import { getBranchIdOfPerson, getBranchOutputBlocks, applyOutputBlockPolicy } from '../../../services/branch.js?v=20260915d';
import { badgeHtml } from '../../../components/badges.js?v=20260915d';
// 活动生命周期展示态单一源（草稿/已发布/进行中/待归档/已执行/已归档/已取消）——勿在本文件另造中文标签
import { activityLifecycleBadgeHtml } from '../../../components/inspector.js?v=20260915d';
import { showToast, escHtml } from '../../../core/utils.js?v=20260915d';
import { solidAccentStyle, accDarkVars, accDarkParts, OUTPUT_BLOCK_DEFS, isActivityEnded, ACTIVITY_SUBTYPES, normalizeActivityType } from '../../../core/constants.js?v=20260915d';
import { filterByRole, getCurrentLeaderId, currentLeaderGroup } from './_shared.js?v=20260915d';
import { anchorDetailToTrigger } from '../../../components/detail-anchor.js?v=20260915d';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList, activityKeyword, activityFacets } from '../../../components/list-filter.js?v=20260915d';

/**
 * 活动角色可编辑性（dogfood 权限专项 2026-09-13）
 * 制度依据：组长手册 §5.2「只读，不可修改其他角色数据」、CF §D.1「活动赋权限于自己创建的活动」。
 * 判据：支书/副支书全量；组长仅可编辑「非支部级（bottom-up 本组）」活动——
 *   支部级(top-down：支委会/党员大会/上级部署)的组织者由支书侧定，组长只读。
 * 实证缺口：此前保存角色直调 AuthStore.syncProjectRoles（该函数无角色校验）→ 组长可改派支委会角色。
 */
function _canEditActivityRoles(activity, me) {
  if (!activity) return false;
  const role = (me || {}).role;
  if (role === 'secretary' || role === 'deputy-secretary') return true;
  return (activity.direction || 'bottom-up') !== 'top-down';
}

// 私有状态（随模块自持，不污染入口）
const dt = new DecisionTreeState('leader');
const DECISION_TREE = DECISION_TREE_CONFIGS.leader;
let _dtOrgPicker = null;      // 决策树表单：组织者多选
let _dtDeepPicker = null;     // 决策树表单：深度参与者多选
let _detailOrgPicker = null;   // 活动详情：组织者多选（预填现有 assignments）
let _detailDeepPicker = null;  // 活动详情：深度参与者多选
let _dtActivities = [];        // C② 默认预选数据源：最近一次渲染的组长可见活动（ctx.filteredActivities）
let _dtAdvOpen = false;        // C② 高级设置折叠区展开态（跨面板重建保态，便于连续选择）

// E-2 活动写入步骤草稿（2026-09-09 乙部评议待办）：
// 步骤（L1-L4/承办党小组）重选或重进时会重建决策面板与输入框/角色 PersonPicker，
// 已填 title/date/location/desc/角色选择若只存于 DOM 会被整段丢弃。
// 此处以模块级轻量草稿兜底：输入/选人即写入 dtDraft，重建面板时回填；
// C6（2026-09-12）起草稿落 localStorage 跨整页刷新保留 + beforeunload 提醒；
// 仅「写入成功」或表单内「取消」（dt.reset 重置会话）时清空。
const dtDraft = { date: '', location: '', title: '', desc: '', orgIds: null, deepIds: null };

// C6（2026-09-12）跨整页刷新草稿保护：dtDraft 同步落 localStorage，F5/误关闭后可恢复；
// 存在未提交内容时 beforeunload 二次确认，避免「填了一半刷新即丢光且无提醒」。
const DT_DRAFT_KEY = 'workflowos_leader_activity_draft';

function _dtDraftDirty() {
  return !!(dtDraft.date || dtDraft.location || dtDraft.title || dtDraft.desc
    || (Array.isArray(dtDraft.orgIds) && dtDraft.orgIds.length > 0)
    || (Array.isArray(dtDraft.deepIds) && dtDraft.deepIds.length > 0));
}
function _dtDraftSave() {
  try { localStorage.setItem(DT_DRAFT_KEY, JSON.stringify(dtDraft)); } catch (e) { /* 隐私模式/配额失败忽略 */ }
}
/** 恢复刷新前草稿；返回是否有待提交内容（决定面板默认展开与离开提醒） */
function _dtDraftRestore() {
  try {
    const raw = localStorage.getItem(DT_DRAFT_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return false;
    Object.keys(dtDraft).forEach(k => { if (k in o) dtDraft[k] = o[k]; });
    return _dtDraftDirty();
  } catch (e) { return false; }
}

function _dtDraftClear() {
  dtDraft.date = '';
  dtDraft.location = '';
  dtDraft.title = '';
  dtDraft.desc = '';
  dtDraft.orgIds = null;
  dtDraft.deepIds = null;
  try { localStorage.removeItem(DT_DRAFT_KEY); } catch (e) { /* 忽略 */ }
}

/** 重建前兜底：把面板内已填表单值/角色选择捕获进草稿（正常时 input 事件已实时同步） */
function _dtDraftCapture(scope) {
  const root = scope || document;
  const fieldMap = { '#dt-target-date': 'date', '#dt-location': 'location', '#dt-title': 'title', '#dt-desc': 'desc' };
  Object.keys(fieldMap).forEach(sel => {
    const el = root.querySelector(sel);
    if (el) dtDraft[fieldMap[sel]] = el.value;
  });
  if (_dtOrgPicker) dtDraft.orgIds = _dtOrgPicker.getSelected();
  if (_dtDeepPicker) dtDraft.deepIds = _dtDeepPicker.getSelected();
  _dtDraftSave();
}

// 恢复刷新前草稿：有内容则默认展开撰写面板并套用默认步骤（保证表单字段渲染、值可见）
if (_dtDraftRestore()) {
  dt.showPanel = true;
  _dtApplyDefaults();
}

// 未提交内容离开提醒（绑定一次；仅在草稿非空时拦截浏览器关闭/刷新）
let _dtUnloadGuardBound = false;
function _dtBindUnloadGuard() {
  if (_dtUnloadGuardBound) return;
  _dtUnloadGuardBound = true;
  window.addEventListener('beforeunload', (e) => {
    if (!_dtDraftDirty()) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
}
_dtBindUnloadGuard();

export function renderContent(ctx) {
  const container = document.getElementById('leader-tab-content');
  if (!container) return;

  const { accent, accentRgba, accentBorder } = ctx;
  const _accVars = accDarkVars(accent);
  const _dtSelDark = accDarkParts(accent);
  const _dtBtnStyle = (selected) => selected
    ? `--acc-bg-dark:${_dtSelDark.bg};--acc-text-dark:${_dtSelDark.text};--acc-border-dark:${_dtSelDark.border};background:${accentRgba};color:color-mix(in srgb, ${accent} 60%, #000);border:1.5px solid ${accentBorder};`
    : `--acc-bg-dark:#1E293B;--acc-text-dark:#CBD5E1;--acc-border-dark:#334155;background:white;color:#6B7280;border:1.5px solid #E5E7EB;`;

  const activities = ctx.filteredActivities || [];
  _dtActivities = activities; // C② 默认预选数据源（本人既有同类活动）

  // T223 排序统一：未完成在前、已完成在后，组内按 date 降序（新者在前）
  // 已结束/已归档判据单一源 = isActivityEnded（已取消另行并入「已完成」档，保留原排序语义）
  const isDone = a => isActivityEnded(a) || a.status === 'cancelled';
  const sorted = [...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const display = [...sorted.filter(a => !isDone(a)), ...sorted.filter(a => isDone(a))];

  // 活动状态徽标：单一源 = components/inspector.js 的活动生命周期展示态
  // （草稿/已发布/进行中/待归档/已执行/已归档/已取消；执行态由任务进度派生）。
  // 2026-09-13 收敛：原为本地二档「已发布/草稿」，属口径漂移（与 DATA_MODEL §2.1 全站徽章统一要求不符）。
  const _lifecycleBadge = (a) => activityLifecycleBadgeHtml(a, getAppState()?.tasks || []);

  const panelVisible = dt.showPanel;

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">活动写入</h3>
        <button class="btn-md" id="btn-leader-create" style="${_accVars}background:${accentRgba};color:color-mix(in srgb, ${accent} 60%, #000);border:1px solid ${accentBorder};">${panelVisible ? '收起面板' : '创建活动'}</button>
      </div>
      <div class="text-xs text-gray-500 mb-3">可创建党小组会与主题党日活动，创建后自动生成后续待办</div>

      <div id="dt-panel-wrap" class="${panelVisible ? '' : 'hidden'}">
        ${_renderDecisionTreePanel({ accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark })}
      </div>

      <div class="mt-4 pt-3 border-t border-gray-100">
        <div class="text-xs text-gray-500 mb-2">已有关联活动</div>
        <div class="space-y-2" id="leader-activity-list"></div>
        <div id="leader-act-detail" class="hidden mt-3 rounded-lg p-4"></div>
      </div>
    </div>
  `;

  // 统一检索引擎（活动列表：关键词 名称/地点 + 分面 月份/类别/类型/状态；行数 ≤8 时自动不渲染检索条）
  renderFilteredList(container.querySelector('#leader-activity-list'), {
    stateKey: 'leader-write-activity-list',
    rows: display,
    keyword: activityKeyword(),
    facets: activityFacets(),
    countUnit: '条',
    listClass: 'space-y-2',
    emptyMessage: '暂无关联活动',
    rowHtml: (a) => `
              <div class="leader-act-item flex items-center justify-between p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE1126]" role="button" tabindex="0" aria-label="展开 ${escHtml(a.title || '未命名')} 详情与子记录" data-act-id="${a.id}">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-800">${escHtml(a.title || '未命名')}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${a.date || ''} ${a.type ? '· ' + a.type : ''}</div>
                </div>
                ${_lifecycleBadge(a)}
              </div>`,
  });

  _bindDecisionTreeEvents(container, { accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark });

  // ── 活动点击展开详情+子记录（P3-4） ──
  // 事件委托：统一检索引擎筛选后会重渲染行，直接对行 addEventListener 会失效
  const _openActivityDetail = (item) => {
      const actId = item.dataset.actId;
      const activity = activities.find(a => a.id === actId);
      if (!activity) return;
      const detailPanel = document.getElementById('leader-act-detail');
      if (!detailPanel) return;
      // 触点即落点（全局 UX 反思批次 2026-09-13）：详情紧贴被点的活动卡片展开并滚入视野——
      // 此前单例面板固定在整张列表之后，点第一条也要下滚约 1600~2000px 才看得到（用户实报）
      anchorDetailToTrigger(detailPanel, item);

      const actSubs = (mockDB.actSubRecords && mockDB.actSubRecords[actId]) || Object.fromEntries(OUTPUT_BLOCK_DEFS.map(d => [d.id, []]));

      // 块画布 v0（2026-09-03）：活动产出块策略随支部 config.blocks（支部治理「模块/块组合」启停/排序）；缺省全开
      // 产出块 id 单一源 = OUTPUT_BLOCK_DEFS（2026-09-03 去重收口，勿再手写 id 数组）
      const visBlocks = applyOutputBlockPolicy(
        OUTPUT_BLOCK_DEFS.map(d => d.id),
        getBranchOutputBlocks(getBranchIdOfPerson(AuthStore.getCurrentUser()?.personId))
      );

      function saveActSubs() {
        mockDB.actSubRecords = { ...mockDB.actSubRecords, [actId]: actSubs };
        persist();
      }

      // D7 裁决批二（2026-09-08）：子记录区只读化——考勤/考察类 readOnly=true（双写口消除，
      // 统一走对应「上传」页：考勤上传 / 考察上传，与专班详情只读化先例同款）；宣传/材料记录
      // 无对应上传页，保留内联添加/删除（readOnly=false）。
      // 子记录表：统一检索引擎（支书 2026-09-14 裁定）——table 模式（rowHtml 返回 <tr>）+ 关键词 + 分页；
      // 行数 ≤8 不渲染检索条；表头/行线/悬停由 styles.css::.data-table 单一源提供（勿在行内重复声明）。
      function renderActSubTable(hostEl, type, items, readOnly) {
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
        hostEl.insertAdjacentHTML('beforeend', `
          <div class="mt-3">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <h5 class="text-xs font-bold font-title-cn" style="color:${cfg.color}">${cfg.label} (${items.length})</h5>
              ${readOnly
                ? `<span class="text-[11px] text-amber-700 text-right">${type === 'attendance' ? '考勤请到「考勤上传」录入' : '考察请到「考察上传」录入'}</span>`
                : `<button class="act-sub-add-btn text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors" style="color:${cfg.color};border-color:${cfg.color}40" data-type="${type}">+ 添加</button>`}
            </div>
            <div class="act-sub-table-host"></div>
          </div>`);
        renderFilteredList(hostEl.lastElementChild.querySelector('.act-sub-table-host'), {
          stateKey: `leader-act-sub-${actId}-${type}`,
          rows: items,
          keyword: { keys: cfg.fields.map(f => (f.key === 'time' ? 'recordedAt' : f.key)), placeholder: `搜索${cfg.label}…` },
          countUnit: '条',
          emptyMessage: '暂无记录',
          table: {
            headHtml: `<tr>${cfg.fields.map(f => `<th>${f.label}</th>`).join('')}${readOnly ? '' : '<th class="w-12"></th>'}</tr>`,
            colSpan: cfg.fields.length + (readOnly ? 0 : 1),
          },
          rowHtml: (item) => {
            // 删除按全量下标（分页切片下 i 只是页内序，故用 indexOf 取原下标，语义与改前一致）
            const idx = items.indexOf(item);
            return `
              <tr>
                ${cfg.fields.map(f => `<td class="text-gray-700">${cellOf(item, f.key)}</td>`).join('')}
                ${readOnly ? '' : `<td class="text-center"><button class="act-sub-del-btn text-xs text-red-600 hover:text-red-700" data-type="${type}" data-idx="${idx}">删除</button></td>`}
              </tr>
            `;
          },
        });
      }

      // dogfood 权限专项 2026-09-13：角色编辑权（支部级定向活动组长只读，与按钮禁用同源）
      const roleEditable = _canEditActivityRoles(activity, AuthStore.getCurrentUser());
      detailPanel.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h5 class="font-title-cn text-sm font-bold text-gray-700">${activity.title || '未命名'}</h5>
          <button id="btn-close-act-detail" class="text-xs text-gray-500 hover:text-gray-600">收起</button>
        </div>
        <div class="text-xs text-gray-500 mb-2">${activity.date || ''} ${activity.type ? '· ' + activity.type : ''}</div>

        <!-- T-190 活动角色内联编辑：主源 assignments 预填，保存走 syncProjectRoles 三合一 -->
        <!-- dogfood 权限专项 2026-09-13：支部级(top-down)活动角色由支书侧确定 → 组长只读（按钮禁用 + 明示） -->
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex items-center justify-between mb-2">
            <h6 class="font-title-cn text-xs font-bold text-gray-600">${roleEditable ? '活动角色' : '活动角色（只读）'}</h6>
            <button id="btn-save-activity-roles" ${roleEditable ? '' : 'disabled'} title="${roleEditable ? '' : '支部级（定向）活动的组织者由支书侧确定，组长此处只读'}" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed" style="${solidAccentStyle(accent, accentBorder)};">保存角色</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="text-[12px] text-gray-500 mb-1">组织者</div>
              <div id="detail-org-picker"></div>
            </div>
            <div>
              <div class="text-[12px] text-gray-500 mb-1">深度参与者</div>
              <div id="detail-deep-picker"></div>
            </div>
          </div>
          <p class="text-[12px] text-gray-500 mt-2">提示：修改将同步到活动，被赋权人将收到通知。</p>
        </div>

        <div class="mt-3 pt-3 border-t border-gray-100">
          <h6 class="font-title-cn text-xs font-bold text-gray-600 mb-1">子记录</h6>
          ${visBlocks.length === 0
            ? '<p class="text-[12px] text-gray-500 pl-2">本支部已停用全部活动产出块——如需启用请联系党委在「支部配置」开启</p>'
            : '<div id="act-subs-host"></div>'}
        </div>
      `;

      // 子记录表逐块接入统一检索引擎（每块一实例，stateKey 带活动+类型 → 跨重渲染保筛选/页码）
      const subsHost = detailPanel.querySelector('#act-subs-host');
      if (subsHost) {
        visBlocks.forEach(type => renderActSubTable(subsHost, type, actSubs[type] || [], type === 'attendance' || type === 'inspection'));
        // 删除子记录（D7：仅宣传/材料有删除按钮）：事件委托——引擎筛选/翻页会重绘行，行内直接绑定会失效
        subsHost.addEventListener('click', (e) => {
          const btn = e.target.closest('.act-sub-del-btn');
          if (!btn) return;
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.idx);
          actSubs[type].splice(idx, 1);
          saveActSubs();
          const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
          if (actEl) actEl.click();
        });
      }

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
        // dogfood 权限专项 2026-09-13：支部级(top-down)活动的组织者由支书侧确定，组长不得改派
        if (!_canEditActivityRoles(activity, AuthStore.getCurrentUser())) {
          showToast('error', '支部级（定向）活动的组织者由支书侧确定，组长此处只读');
          return;
        }
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

      // 添加子记录（内联表单替代 prompt 弹窗）
      // D7 裁决批二（2026-09-08）：考勤/考察子记录已只读化（无此添加按钮，见 renderActSubTable
      // readOnly 引导文案 → 去对应「上传」页）；此处仅剩宣传/材料记录（无对应上传页）保留内联添加。
      detailPanel.querySelectorAll('.act-sub-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type; // 仅 publicity / materials（attendance/inspection 只读无此按钮）
          const panelEl = btn.closest('.mt-3');
          const existing = panelEl?.querySelector('.record-form-shell');
          if (existing) { existing.remove(); return; }

          const textFields = {
            publicity: [['title', '宣传标题'], ['author', '撰写人'], ['channel', '发布渠道']],
            materials: [['name', '材料名称'], ['author', '提交人'], ['note', '备注']],
          };
          const fields = textFields[type];

          // T-224 §5.5：投递去向由产出类型派生（系统内置），组织者只见「提交」不见「发送对象」
          const route = type === 'publicity' ? deriveOutputRoute(OutputType.PUBLICITY) : null;
          const routeHint = route ? `<div class="text-[11px] text-gray-500 mb-2">提交后自动投递：${route.route} → ${route.sink}</div>` : '';

          const formHtml = recordFormShell({
            title: `添加${type === 'publicity' ? '宣传' : '材料'}记录`,
            accent,
            accentBorder,
            body: `${routeHint}
              ${fields.map(([key, label]) => `<input class="f-${key} input-flat w-full mb-2" placeholder="${label}${key === 'title' || key === 'name' ? '（必填）' : '（选填）'}">`).join('')}`,
          });

          panelEl.insertAdjacentHTML('beforeend', formHtml);
          const form = panelEl.querySelector('.record-form-shell');

          form.querySelector('.record-cancel-btn').addEventListener('click', () => {
            form.remove();
          });

          form.querySelector('.record-save-btn').addEventListener('click', () => {
            const requiredKey = type === 'publicity' ? 'title' : 'name';
            const requiredVal = form.querySelector(`.f-${requiredKey}`).value.trim();
            if (!requiredVal) { showToast('error', `请填写${type === 'publicity' ? '宣传标题' : '材料名称'}`); return; }
            const entry = {};
            fields.forEach(([key]) => { entry[key] = form.querySelector(`.f-${key}`).value.trim(); });
            entry.recordedBy = AuthStore.getCurrentUser()?.personId || 'u_exec';
            entry.recordedAt = new Date().toISOString();
            actSubs[type].push(entry);
            showToast('success', '已添加');
            saveActSubs();
            form.remove();
            const actEl = container.querySelector(`.leader-act-item[data-act-id="${actId}"]`);
            if (actEl) actEl.click();
          });
        });
      });
  };
  const actListHost = container.querySelector('#leader-activity-list');
  actListHost?.addEventListener('click', (e) => {
    const item = e.target.closest('.leader-act-item');
    if (item) _openActivityDetail(item);
  });
  // dogfood #13（2026-09-12）：行为 role=button 的 div，补 Enter/Space 键盘激活（事件委托版）
  actListHost?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.leader-act-item');
    if (!item) return;
    e.preventDefault();
    _openActivityDetail(item);
  });
}

// ── C② 默认预选（2026-09-10 支书裁定）────────────────────────────
// 进入建活动面板时按上下文派生默认值，使常规路径 0–1 次输入即可提交。
// 派生依据全部来自既有数据源（勿臆造新规则）：
//   · 承办党小组 = 组长所属党小组（_shared.currentLeaderGroup）
//   · 活动类型/形式/时长/发起方向 = 本人既有同类活动（ctx.filteredActivities 中本人组织/创建，
//     场景限组长可用 L1；常用场景取出现次数最多、并列取最近，再取该场景最近一次派生其余维度）。
/** 组长可用场景 id（与 DECISION_TREE.L1 同源，避免第二份清单） */
function _dtLeaderScenarioIds() {
  return DECISION_TREE.L1.map(o => o.value);
}

/** 派生默认选择（全新会话用） */
function _dtDeriveDefaults(activities) {
  const { leaderId, group } = currentLeaderGroup();
  const allowed = _dtLeaderScenarioIds();
  const mine = (activities || [])
    .filter(a => a && allowed.includes(a.scenarioId) && (
      a.createdBy === leaderId || a.organizer === leaderId ||
      (Array.isArray(a.assignments) && a.assignments.some(x => x.personId === leaderId && x.role === 'organizer'))
    ))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 最近在前

  // 常用场景：出现次数最多；并列时取最近一次（reduce 自最近端起，> 保证取最近）
  const count = {};
  mine.forEach(a => { count[a.scenarioId] = (count[a.scenarioId] || 0) + 1; });
  const L1 = mine.length
    ? mine.reduce((best, a) => (count[a.scenarioId] > count[best] ? a.scenarioId : best), mine[0].scenarioId)
    : 'party-group-meeting';

  // 该场景最近一次既有活动 → 派生 L2/L3/L4
  const last = mine.find(a => a.scenarioId === L1) || null;
  const l2Options = DECISION_TREE.L2[L1] || [];
  let L2 = l2Options[0]?.value || null;
  if (L1 === 'theme-party') {
    const carrier = Array.isArray(last?.carriers) ? last.carriers[0] : null;
    if (l2Options.some(o => o.value === carrier)) L2 = carrier;
  }
  const L3 = (last && ['short', 'long'].includes(last.duration)) ? last.duration : 'short';
  const L4 = (last && ['top-down', 'bottom-up'].includes(last.direction)) ? last.direction : 'bottom-up';

  return { L1, L2, L3, L4, hostGroup: group || null };
}

/** 全新会话（尚未选过活动类型）时套用派生默认值；已选则保态不覆盖 */
function _dtApplyDefaults() {
  if (dt.selections.L1) return;
  const d = _dtDeriveDefaults(_dtActivities);
  dt.select('L1', d.L1);
  dt.select('L2', d.L2);
  dt.select('L3', d.L3);
  dt.select('L4', d.L4);
  dt.select('hostGroup', d.hostGroup);
}

/** 当前选择的白话摘要（首屏可见，避免展开高级区即可确认默认值） */
function _dtSummaryLine() {
  const { L1, L2, L3, L4, hostGroup } = dt.selections;
  const l1 = DECISION_TREE.L1.find(o => o.value === L1)?.label;
  const l2 = (DECISION_TREE.L2[L1] || []).find(o => o.value === L2)?.label;
  const l3 = DECISION_TREE.L3.find(o => o.value === L3)?.label;
  const l4 = DECISION_TREE.L4.find(o => o.value === L4)?.label;
  const parts = [];
  if (l1) parts.push(`活动类型 ${l1}`);
  if (l2 && l2 !== l1) parts.push(`活动形式 ${l2}`);
  if (l3) parts.push(`时长 ${l3}`);
  if (l4) parts.push(`发起方向 ${l4}`);
  if (hostGroup) parts.push(`承办 ${hostGroup}`);
  return parts.join(' · ');
}

function _renderDecisionTreePanel({ accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark }) {
  const { L1, L2, L3, L4, hostGroup } = dt.selections;

  // 当前进行到第几步（S6 修复：原代码引用未定义变量 step 导致面板渲染崩溃）
  // 步骤指示器：活动类型→活动形式→时长→发起方向（白话，无 L1–L4 缩写）
  const step = !L1 ? 1 : !L2 ? 2 : !L3 ? 3 : 4;

  // 步骤指示器（随高级设置折叠区一并收起，默认不占首屏）
  const steps = ['活动类型', '活动形式', '时长', '发起方向'];
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
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="--acc-bg-dark:${isDone || isActive ? _dtSelDark.bg : '#1E293B'};--acc-text-dark:${isDone || isActive ? _dtSelDark.text : '#94A3B8'};--acc-border-dark:${isDone || isActive ? _dtSelDark.border : '#475569'};background:${isDone || isActive ? accentRgba : '#F3F4F6'};color:color-mix(in srgb, ${dotColor} 60%, #000);border:1.5px solid ${dotColor};">${isDone ? '&#10003;' : i + 1}</div>
            <span class="text-xs ${isActive ? 'font-bold' : ''}" style="--acc-text-dark:${dotColor === accent ? _dtSelDark.text : '#CBD5E1'};color:color-mix(in srgb, ${dotColor} 60%, #000);">${s}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // 承办党小组选项：活组清单渲染时现取 groupOptions()（新增/改名/解散后即时可见），
  // 再经 hostGroups() 补入「组长本组」（本组可能不在活组清单内，如历史数据）——
  // 不改权限，仅保证「组长本组承办」这一既有语义可提交，且改选后仍能回选本组。
  const hostGroups = buildHostGroupOptions(groupOptions(), currentLeaderGroup().group);

  // 活动类型
  const l1Html = `
    <div class="mb-4">
      <div class="font-title-cn text-sm font-bold text-gray-700 mb-2">活动类型 <span class="text-red-600">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L1.map(opt => {
          const selected = L1 === opt.value;
          return `<button class="dt-l1-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  `;

  // 承办党小组选择器（活动类型选择后显示）
  const hostGroupHtml = L1 ? `
    <div class="mb-4">
      <div class="font-title-cn text-sm font-bold text-gray-700 mb-2">承办党小组 <span class="text-red-600">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${hostGroups.map(g => {
          const selected = hostGroup === g;
          return `<button class="dt-host-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${g}" style="${_dtBtnStyle(selected)}cursor:pointer;">${g}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 活动形式（活动类型选择后显示）
  const l2Options = L1 ? (DECISION_TREE.L2[L1] || []) : [];
  const l2Html = L1 ? `
    <div class="mb-4">
      <div class="font-title-cn text-sm font-bold text-gray-700 mb-2">活动形式 <span class="text-red-600">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${l2Options.map(opt => {
          const selected = L2 === opt.value;
          return `<button class="dt-l2-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 时长（活动形式选择后显示）
  const l3Html = L2 ? `
    <div class="mb-4">
      <div class="font-title-cn text-sm font-bold text-gray-700 mb-2">时长 <span class="text-red-600">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L3.map(opt => {
          const selected = L3 === opt.value;
          return `<button class="dt-l3-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 发起方向（时长选择后显示）
  const l4Html = L3 ? `
    <div class="mb-4">
      <div class="font-title-cn text-sm font-bold text-gray-700 mb-2">发起方向 <span class="text-red-600">*</span></div>
      <div class="flex flex-wrap gap-2">
        ${DECISION_TREE.L4.map(opt => {
          const selected = L4 === opt.value;
          return `<button class="dt-l4-btn px-4 py-2 text-sm font-medium rounded-lg transition-all" data-value="${opt.value}" style="${_dtBtnStyle(selected)}cursor:pointer;">${opt.label}</button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // 高级设置折叠区（默认收起）：L1–L4/承办党小组能力与「全选齐」校验保持不变，
  // 展开后与原行为一致（步骤指示器 + 各层选择按钮）。展开态跨面板重建保态（_dtAdvOpen）。
  const advBodyHtml = `${stepperHtml}${l1Html}${hostGroupHtml}${l2Html}${l3Html}${l4Html}`;
  const advHtml = `
    <div class="mb-4">
      <div id="dt-adv-toggle" class="text-xs text-gray-500 cursor-pointer hover:text-gray-600 select-none flex items-center gap-1">
        <span id="dt-adv-caret">${_dtAdvOpen ? '▴' : '▾'}</span>
        <span>高级设置（可选）：活动类型 / 活动形式 / 时长 / 发起方向 / 承办党小组</span>
      </div>
      <div id="dt-adv-body" class="mt-3 ${_dtAdvOpen ? '' : 'hidden'}">${advBodyHtml}</div>
    </div>
  `;

  // 首屏白话摘要：默认预选结果一览，无需展开高级区即可确认
  const summary = _dtSummaryLine();
  const summaryHtml = summary ? `<div class="text-xs text-gray-500 mb-3">当前设置：${summary}</div>` : '';

  // 表单区域（L4选择后显示）
  const allSelected = L1 && L2 && L3 && L4 && hostGroup;
  const formHtml = allSelected ? `
    <div class="mt-4 pt-4 border-t border-dashed border-gray-200">
      <div class="font-title-cn text-sm font-bold text-gray-700 mb-3">填写活动信息</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">T-0 日期 <span class="text-red-600">*</span></label>
          <input type="date" id="dt-target-date" class="input-flat w-full" value="${escHtml(dtDraft.date || new Date().toISOString().slice(0, 10))}">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动地点 <span class="text-red-600">*</span></label>
          <input type="text" id="dt-location" class="input-flat w-full" placeholder="活动地点" value="${escHtml(dtDraft.location)}">
        </div>
      </div>
      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动名称 <span class="text-red-600">*</span></label>
        <input type="text" id="dt-title" class="input-flat w-full" placeholder="活动名称" value="${escHtml(dtDraft.title)}">
      </div>
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="dt-desc">活动描述 <span class="text-gray-500">（选填）</span></label>
        <textarea id="dt-desc" class="input-flat w-full resize-none" rows="2" placeholder="简要描述活动内容">${escHtml(dtDraft.desc)}</textarea>
      </div>

      <!-- T-190 活动角色：创建即赋权，组织者默认组长本人 -->
      <div class="mb-4">
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">活动角色（创建即赋权，组织者默认组长本人）</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="text-[12px] text-gray-500 mb-1">组织者（默认组长本人，可改）</div>
            <div id="dt-org-picker"></div>
          </div>
          <div>
            <div class="text-[12px] text-gray-500 mb-1">深度参与者 <span class="text-gray-500">（选填）</span></div>
            <div id="dt-deep-picker"></div>
          </div>
        </div>
      </div>

      <!-- SOP 预览 -->
      <div class="mb-4 card rounded-xl p-4">
        <div class="font-title-cn text-sm font-bold text-gray-700 mb-2">后续待办预览</div>
        <div id="dt-sop-preview" class="space-y-1 text-xs text-gray-500">
          ${_renderSopPreview()}
        </div>
      </div>

      <div class="flex items-center justify-end gap-3">
        <button id="dt-cancel" type="button" class="text-sm px-4 py-[7px] rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button id="dt-submit" type="button" class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(accent, accentBorder)};cursor:pointer;">写入活动</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="card rounded-xl p-4">
      ${summaryHtml}
      ${advHtml}
      ${formHtml}
    </div>
  `;
}

function _renderSopPreview() {
  return dt.renderSopPreview();
}

function _bindDecisionTreeEvents(container, ctx) {
  const { accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark } = ctx;

  // 创建/收起按钮（保态折叠 2026-09-08：面板常驻 DOM（#dt-panel-wrap），收起/展开只切 hidden——
  // 不再 dt.reset() + 整页重建，进行中的步骤选择/已填活动信息/角色选择保留；
  // 重置会话 = 表单内「取消」按钮（dt.reset）或提交成功后自动重置）
  // C② 默认预选（2026-09-10）：展开时若为全新会话（未选活动类型），先派生默认值再重建面板，
  // 使常规路径进入即可填写提交（0–1 次输入）；已选则保态不覆盖。
  container.querySelector('#btn-leader-create')?.addEventListener('click', () => {
    const wrap = container.querySelector('#dt-panel-wrap');
    if (!wrap) return;
    const willShow = wrap.classList.contains('hidden');
    if (willShow) {
      _dtApplyDefaults();
      dt.showPanel = true;
      _refreshDtArea();
    } else {
      dt.showPanel = false;
      wrap.classList.add('hidden');
      const btn = container.querySelector('#btn-leader-create');
      if (btn) btn.textContent = '创建活动';
    }
  });

  // E-2 面板区轻量刷新（2026-09-09）：只重建决策面板动态区（步骤/校验依赖区），
  // 不再整容器重建——活动列表/详情等其余 DOM 不被触碰；已填字段经 dtDraft 回填不丢。
  const _refreshDtArea = () => {
    const wrap = container.querySelector('#dt-panel-wrap');
    if (!wrap) return;
    _dtDraftCapture(wrap); // 兜底：把 DOM 中已填值先落草稿再重建
    if (_dtOrgPicker) { _dtOrgPicker.destroy(); _dtOrgPicker = null; }
    if (_dtDeepPicker) { _dtDeepPicker.destroy(); _dtDeepPicker = null; }
    wrap.innerHTML = _renderDecisionTreePanel({ accent, accentRgba, accentBorder, _dtBtnStyle, _dtSelDark });
    _dtBindPanelArea(container, ctx, _refreshDtArea);
    wrap.classList.toggle('hidden', !dt.showPanel);
    const btn = container.querySelector('#btn-leader-create');
    if (btn) btn.textContent = dt.showPanel ? '收起面板' : '创建活动';
  };

  _dtBindPanelArea(container, ctx, _refreshDtArea);
}

/**
 * 绑定决策面板动态区（步骤按钮/承办党小组/取消/写入 + 表单草稿捕获 + 角色 PersonPicker）。
 * E-2 面板区每次重建后须重跑；PersonPicker 重建前先 destroy 旧实例（防重复全局事件）。
 */
function _dtBindPanelArea(container, ctx, refresh) {
  const { accent } = ctx;
  const wrap = container.querySelector('#dt-panel-wrap');
  if (!wrap) return;
  // 整容器重建路径下旧实例仍持有全局监听 → 统一先销毁（与面板区重建路径同语义）
  if (_dtOrgPicker) { _dtOrgPicker.destroy(); _dtOrgPicker = null; }
  if (_dtDeepPicker) { _dtDeepPicker.destroy(); _dtDeepPicker = null; }

  // 高级设置折叠区（默认收起；展开态跨面板重建保态 _dtAdvOpen，便于连续选择各层）
  wrap.querySelector('#dt-adv-toggle')?.addEventListener('click', () => {
    _dtAdvOpen = !_dtAdvOpen;
    const body = wrap.querySelector('#dt-adv-body');
    const caret = wrap.querySelector('#dt-adv-caret');
    if (body) body.classList.toggle('hidden', !_dtAdvOpen);
    if (caret) caret.textContent = _dtAdvOpen ? '▴' : '▾';
  });

  // 表单输入即存草稿（E-2）：步骤重选/重进重建面板时按草稿回填，不丢已填内容
  const draftFieldMap = { '#dt-target-date': 'date', '#dt-location': 'location', '#dt-title': 'title', '#dt-desc': 'desc' };
  Object.keys(draftFieldMap).forEach(sel => {
    const el = wrap.querySelector(sel);
    if (!el) return;
    const key = draftFieldMap[sel];
    el.addEventListener('input', () => { dtDraft[key] = el.value; _dtDraftSave(); });
  });

  // 决策树表单内联赋权 PersonPicker（initialIds 草稿回填；null=跟随默认——组织者默认组长本人）
  const currentLeaderId = getCurrentLeaderId();
  const dtOrgEl = wrap.querySelector('#dt-org-picker');
  const dtDeepEl = wrap.querySelector('#dt-deep-picker');
  if (dtOrgEl) {
    _dtOrgPicker = new PersonPicker({
      mode: 'multi',
      placeholder: '选择组织者',
      accentColor: accent,
      initialIds: dtDraft.orgIds !== null ? dtDraft.orgIds : [currentLeaderId],
      onSelect: (ids) => { dtDraft.orgIds = ids; _dtDraftSave(); },
    });
    _dtOrgPicker.render(dtOrgEl);
  }
  if (dtDeepEl) {
    _dtDeepPicker = new PersonPicker({
      mode: 'multi',
      placeholder: '选择深度参与者',
      accentColor: accent,
      initialIds: dtDraft.deepIds !== null ? dtDraft.deepIds : [],
      onSelect: (ids) => { dtDraft.deepIds = ids; _dtDraftSave(); },
    });
    _dtDeepPicker.render(dtDeepEl);
  }

  // L1 按钮（变更时重置后续选择，轻量刷新面板动态区）
  wrap.querySelectorAll('.dt-l1-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      dt.select('L1', val);
      // L1 变更时重置后续选择
      dt.select('L2', null);
      dt.select('L3', null);
      dt.select('L4', null);
      dt.select('hostGroup', null);
      refresh();
    });
  });

  // 承办党小组按钮
  wrap.querySelectorAll('.dt-host-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('hostGroup', btn.dataset.value);
      refresh();
    });
  });

  // L2 按钮
  wrap.querySelectorAll('.dt-l2-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L2', btn.dataset.value);
      dt.select('L3', null);
      dt.select('L4', null);
      refresh();
    });
  });

  // L3 按钮
  wrap.querySelectorAll('.dt-l3-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L3', btn.dataset.value);
      dt.select('L4', null);
      refresh();
    });
  });

  // L4 按钮
  wrap.querySelectorAll('.dt-l4-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      dt.select('L4', btn.dataset.value);
      refresh();
    });
  });

  // 取消按钮（重置会话 = 决策树 + 步骤草稿一并清空；高级区回到默认收起）
  wrap.querySelector('#dt-cancel')?.addEventListener('click', () => {
    dt.reset();
    _dtDraftClear();
    _dtAdvOpen = false;
    refresh();
  });

  // 写入活动按钮
  wrap.querySelector('#dt-submit')?.addEventListener('click', async () => {
    const { L1, L2, L3, L4, hostGroup } = dt.selections;
    const targetDate = wrap.querySelector('#dt-target-date')?.value;
    const location = wrap.querySelector('#dt-location')?.value?.trim();
    const title = wrap.querySelector('#dt-title')?.value?.trim();
    const desc = wrap.querySelector('#dt-desc')?.value?.trim();

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
        // 权威类型取值 = 子类中文名（单一源 ACTIVITY_SUBTYPES；组长台 L1 标签即权威子类名），
        // 不再写 '大类·子类'（读取侧 normalizeActivityType 归一，写入侧须直接落权威值）
        type: ACTIVITY_SUBTYPES.includes(l1Label) ? l1Label : normalizeActivityType(l2Label || l1Label),
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
        showToast('success', `已生成 ${taskCount} 项后续待办`);
      }

      // 4. 渲染工作流可视化面板
      const definitionId = dt.mapToDefinitionId();
      renderWorkflowPanel('leader-workflow', 'leader-tab-content', definitionId, title, 'append');

      // 5. 提交成功 → 重置决策树并清空步骤草稿（高级区回默认收起），刷新列表
      dt.reset();
      _dtDraftClear();
      _dtAdvOpen = false;
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (err) {
      console.error('[ws-leader] 创建活动失败：', err);
      showToast('error', `创建失败：${err.message}`);
    }
  });
}
