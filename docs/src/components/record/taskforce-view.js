// role: [工程师]+[AI]
// taskforce-view.js — 只读专班查看组件（知情权组件，支书 2026-08-08 裁定）
// 供无专班 tab 的工作台（党支书/党小组组长/纪检委员等）承载 taskforceId 跳转落点：
// 专班列表（状态分组）+ 只读详情（成员/角色/贡献）。依据支书第五轮裁定「新建专班查看组件（列表+详情）」。
// 支书设计原则：「无职责 不代表 没有知情权」。

import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261018f';
import { getPersonName } from '../../services/member/person.js?v=20261018f';
import { mockDB } from '../../core/domain/domain.js?v=20261018f';
import { AuthStore } from '../../services/core/auth.js?v=20261018f';
import { canRevealActivityMemberNames } from '../../services/core/visibility.js?v=20261018f';
import { badgeHtml } from '../ui/badges.js?v=20261018f';
import { dotDarkVars } from '../../core/domain/constants.js?v=20261018f';
import { flashHighlight, showToast, escHtml as esc } from '../../core/base/utils.js?v=20261018f';
import { anchorDetailToTrigger } from '../ui/detail-anchor.js?v=20261018f';
// 统一检索引擎（2026-09-14 裁定）：只读详情「成员贡献」（第一列是人 → 配姓名关键词）与
// 「中间进度」（时间线 → 只给分页：keyword null + facets []）各接一个实例
import { renderFilteredList } from '../ui/list-filter.js?v=20261018f';

// 附录⑩ B批：状态词对齐「支委会表决」语义（pending_review=待支委会表决；dissolved=表决通过解散）
const STATUS_LABEL = { draft: '草稿', pending_review: '待支委会表决', recruiting: '招募中', active: '运行中', completed: '已完结', archived: '已归档', dissolved: '已解散' };
const STATUS_COLOR = { pending_review: '#6366F1', recruiting: '#D97706', active: '#10B981', completed: '#3B82F6', archived: '#6B7280', dissolved: '#DC2626', draft: '#6B7280' };
// 内联徽章深色亮色映射（深色下提亮一档，由 html.theme-dark [style*="--acc-bg-dark"] 规则应用）
const STATUS_COLOR_DARK = { pending_review: '#A5B4FC', recruiting: '#FBBF24', active: '#34D399', completed: '#60A5FA', archived: '#94A3B8', dissolved: '#F87171', draft: '#94A3B8' };
// 内联徽章双套色：日 = 原色 15% 透明底 + 原色字；夜 = 亮色 24% 透明底 + 亮色字
function statusBadgeStyle(status) {
  const c = STATUS_COLOR[status] || '#6B7280';
  const dc = STATUS_COLOR_DARK[status] || '#94A3B8';
  return `background:${c}15;color:color-mix(in srgb, ${c} 60%, #000);--acc-bg-dark:${dc}24;--acc-text-dark:${dc}`;
}
// B批：徽标文字（committeeRequest pending / draft 未通过 优先于纯状态映射）
function statusText(t) {
  if (!t) return '—';
  const pendReq = (t.committeeRequest && t.committeeRequest.status === 'pending') ? t.committeeRequest : null;
  if (pendReq) return pendReq.kind === 'dissolve' ? '待解散表决' : '待支委会表决';
  if (t.status === 'draft' && t.approvalStatus === 'rejected') return '未通过·草稿';
  return STATUS_LABEL[t.status] || t.status;
}

/**
 * 渲染只读专班查看视图
 * @param {HTMLElement} container — 工作台 tab 内容容器（#xxx-tab-content）
 * @param {Object} [opts]
 * @param {Array}  [opts.taskforces] — 专班数据（缺省回退 TaskForceRecordStore）
 * @param {string} [opts.highlightId] — URL 携带的 taskforceId（定位+高亮该专班）
 */
export function renderTaskforceView(container, opts = {}) {
  if (!container) return;
  const taskforces = opts.taskforces || TaskForceRecordStore.getAll() || [];
  const highlightId = opts.highlightId || null;

  // 骨架（首次渲染，tab 重渲染时保留容器）
  if (container.dataset.tfvInited !== '1') {
    container.dataset.tfvInited = '1';
    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">专班查看</h3>
          <span class="text-xs text-gray-500">全支部专班一览 · 点击卡片查看详情（只读）</span>
        </div>
        <div class="lf-bar mb-3">
          <input type="text" id="tfv-search" class="input-flat text-xs lf-kw" placeholder="搜索专班名称或任务...">
        </div>
        <div id="tfv-list"></div>
        <div id="tfv-detail" class="hidden card rounded-xl p-5 mt-4"></div>
      </div>`;
  }

  // 搜索过滤
  const searchEl = container.querySelector('#tfv-search');
  const q = (searchEl?.value || '').trim().toLowerCase();
  const filtered = q
    ? taskforces.filter(t => (t.name || '').toLowerCase().includes(q) || (t.task || '').toLowerCase().includes(q))
    : taskforces;

  // T223 排序统一：桶内 createdAt 降序（新者在前），与组织委员专班管理看板一致
  const sortTfByNew = (arr) => [...arr].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // 状态分组（与组织委员专班管理一致的组序：待支委会表决/招募中/运行中/已完结；dissolved 归已完结桶）
  const groups = [
    { key: 'pending_review', label: '待支委会表决', color: '#6366F1', list: sortTfByNew(filtered.filter(t => t.status === 'pending_review' || t.status === 'draft')) },
    { key: 'recruiting',     label: '招募中', color: '#D97706', list: sortTfByNew(filtered.filter(t => t.status === 'recruiting')) },
    { key: 'active',         label: '运行中', color: '#10B981', list: sortTfByNew(filtered.filter(t => t.status === 'active')) },
    { key: 'completed',      label: '已完结', color: '#3B82F6', list: sortTfByNew(filtered.filter(t => t.status === 'completed' || t.status === 'archived' || t.status === 'dissolved')) },
  ];

  const listEl = container.querySelector('#tfv-list');
  if (listEl) {
    const hasAny = groups.some(g => g.list.length > 0);
    listEl.innerHTML = !hasAny
      ? '<p class="text-sm text-gray-500 text-center py-8">暂无专班</p>'
      : groups.filter(g => g.list.length > 0).map(g => `
          <div class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-block w-2 h-2 rounded-full" style="${dotDarkVars(g.color)}background:${g.color};"></span>
              <span class="font-title-cn text-sm font-bold text-gray-700">${g.label}</span>
              <span class="text-xs text-gray-500">${g.list.length}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${g.list.map(t => _renderTfCard(t)).join('')}
            </div>
          </div>
        `).join('');
  }

  // 卡片点击 → 只读详情
  container.querySelectorAll('.tfv-card').forEach(card => {
    if (card.dataset.bound) return;
    card.dataset.bound = '1';
    card.addEventListener('click', async () => {
      const tfId = card.dataset.tfId;
      const tf = taskforces.find(r => r.id === tfId);
      if (tf) {
        try {
          await _renderTfDetail(container, tf, highlightId);
        } catch (error) {
          console.warn('[taskforce-view] 专班详情读取失败：', error);
          const detail = container.querySelector('#tfv-detail');
          if (detail) detail.innerHTML = '<p class="text-sm text-red-600" role="alert">详情暂时无法加载，请稍后重试。</p>';
        }
        // 触点即落点（全局 UX 反思批次 2026-09-13）：详情原先固定在看板末尾（跨 5 个工作台共用），
        // 点第一张卡也要下滚才看得到 → 现紧贴被点卡片展开并滚入视野
        anchorDetailToTrigger(container.querySelector('#tfv-detail'), card);
      }
      // 点击即褪去定位高亮
      card.classList.remove('nav-flash-highlight');
    });
  });

  // 搜索输入即时过滤
  if (searchEl) searchEl.oninput = () => renderTaskforceView(container, opts);

  // 定位高亮（定时自动褪去，支书 2026-08-08 裁定）
  if (highlightId) {
    setTimeout(() => {
      const card = container.querySelector(`.tfv-card[data-tf-id="${highlightId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(card);
        // 通知调用方：定位完成，可清除导航目标（防重渲染反复定位）
        if (typeof opts.onLocated === 'function') opts.onLocated();
      }
    }, 180);
  }
}

/** 专班卡片（只读，无流转按钮） */
function _renderTfCard(t) {
  const filled = (t.members || []).filter(m => m.personId).length;
  const color = STATUS_COLOR[t.status] || '#6B7280';
  return `
    <div class="tfv-card p-4 rounded-xl bg-white border border-gray-100 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all" data-tf-id="${esc(t.id)}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-sm font-semibold text-gray-800 leading-snug">${esc(t.name)}</span>
        <span class="badge" style="${statusBadgeStyle(t.status)}">${statusText(t)}</span>
      </div>
      ${t.task ? `<p class="text-xs text-gray-500 mb-2 line-clamp-2">${esc(t.task)}</p>` : ''}
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>${filled}/${t.capacity || 0} 人</span>
        ${t.deadline ? `<span>截止 ${esc(t.deadline)}</span>` : ''}
      </div>
    </div>`;
}

/** B批 R3-3：对象贡献条目核验态小标签（字符串摘要=历史只读，无核验态） */
function _contribTagOf(c) {
  if (!c || typeof c !== 'object' || !c.id) return '';
  if (c.verifiedStatus === 'approved') {
    return `<span class="ml-1 inline-block align-middle text-[11px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">已入档${c.verifiedBy ? ' · ' + esc(getPersonName(c.verifiedBy)) : ''}</span>`;
  }
  if (c.verifiedStatus === 'rejected') {
    return `<span class="ml-1 inline-block align-middle text-[11px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">已退回${c.rejectNote ? ' · ' + esc(c.rejectNote) : ''}</span>`;
  }
  return '<span class="ml-1 inline-block align-middle text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">待核</span>';
}

/** 只读详情：基本信息 + 历史分工 + 结构化工作产出登记 */
async function _renderTfDetail(container, tf, highlightId) {
  const panel = container.querySelector('#tfv-detail');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = '<p class="py-4 text-sm text-gray-500" role="status">正在加载专班详情…</p>';
  const filled = (tf.members || []).filter(m => m.personId);
  const viewer = AuthStore.getCurrentUser();
  const me = viewer?.personId || null;
  const isMember = !!me && filled.some(m => m.personId === me);
  const workgroupId = tf.workgroupId || `wg-taskforce-${tf.id}`;
  const workgroup = mockDB.workgroups.find((row) => row.id === workgroupId);
  const branchId = tf.branchId || workgroup?.branchId || '';
  const canRevealNames = canRevealActivityMemberNames({ ...tf, branchId }, viewer, new URLSearchParams(window.location.search).get('branchId') || '');
  let tasks = [];
  let outputs = [];
  try {
    [tasks, outputs] = await Promise.all([
      TaskForceRecordStore.listWorkgroupTasks(tf.id),
      TaskForceRecordStore.listWorkgroupOutputs(tf.id),
    ]);
  } catch (error) {
    console.warn('[taskforce-view] 工作组任务/产出读取失败：', error);
  }
  const canSubmitOutput = !!me && tf.status === 'active' && isMember
    && AuthStore.canDo(me, 'fill_review', { projectId: tf.id });

  // 成员贡献行改由统一检索引擎渲染（第一列是人 → 配姓名关键词；≤8 人不渲染检索条，观感不变）；
  // 空态（无成员）留在引擎外，逐字保留原文案
  const memberRows = filled.length === 0
    ? '<p class="text-xs text-gray-500">暂无成员</p>'
    : canRevealNames
      ? '<div id="tfv-member-host"></div>'
      : `<p class="text-xs text-gray-600">工作组成员：组织者 ${filled.filter((member) => member.role === 'organizer').length} 人、深度参与者 ${filled.filter((member) => member.role === 'deep').length} 人。登录并进入所属支部后可查看姓名。</p>`;

  // ── 立项③阶段a：专班中间进度只读时间线（有记录才渲染，减少噪音） ──
  // 谁可看：本组件承载纪检/组长/全员只读专班查看，凡可展开详情者即可见，无额外权限过滤
  const tfProgressList = Array.isArray(tf.progressList) ? tf.progressList : [];
  const progressHtml = tfProgressList.length > 0 ? `
    <div class="pt-3 border-t border-gray-100 mt-3">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">中间进度 <span class="text-gray-500 font-normal">· ${tfProgressList.length} 条</span></h5>
      <div id="tfv-progress-host"></div>
    </div>` : '';

  // 新产出写入 workgroup_outputs；旧 contributions 仅只读显示，避免新内容继续混入历史字段。
  const myFillHtml = canSubmitOutput ? `
    <div class="pt-3 border-t border-gray-100 mt-3">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">登记工作产出 <span class="text-gray-500 font-normal">· 保存到结构化工作产出记录</span></h5>
      <div class="rounded-lg bg-gray-50 p-2.5">
        <label for="tfv-output-title" class="block text-xs text-gray-600">产出名称（必填）</label>
        <input id="tfv-output-title" class="input-flat mt-1 w-full text-sm" maxlength="160" placeholder="例如：专题稿件初稿">
        <label for="tfv-output-task" class="block mt-2 text-xs text-gray-600">关联任务（选填）</label>
        <select id="tfv-output-task" class="input-flat mt-1 w-full text-sm">
          <option value="">暂不关联具体任务</option>
          ${tasks.map((task) => `<option value="${esc(task.id)}">${esc(task.title || task.name || '未命名任务')}</option>`).join('')}
        </select>
        <label for="tfv-output-desc" class="block mt-2 text-xs text-gray-600">产出说明（选填）</label>
        <textarea id="tfv-output-desc" rows="2" maxlength="2000" placeholder="简要说明完成内容或存放位置" class="input-flat mt-1 w-full resize-y"></textarea>
        <div class="flex justify-end mt-2">
          <button id="tfv-output-add" class="btn-action-green text-xs px-3 py-1.5">登记产出</button>
        </div>
      </div>
    </div>` : (isMember && tf.status === 'active'
      ? '<p class="mt-3 text-xs text-gray-500">工作组成员身份不会自动赋予提交权限；当前账号尚未获得“提交工作产出”授权。</p>'
      : '');
  const outputStatus = { submitted: '已登记', accepted: '已采纳', archived: '已归档', pending: '待处理' };
  const outputHtml = `
    <div class="pt-3 border-t border-gray-100 mt-3">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">工作产出（${outputs.length}）</h5>
      ${outputs.length ? `<ul class="space-y-2">${outputs.map((output) => `
        <li class="rounded-lg bg-gray-50 px-3 py-2">
          <div class="flex flex-wrap items-center gap-2"><span class="text-xs font-medium text-gray-800">${esc(output.title || '未命名产出')}</span><span class="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-600">${esc(outputStatus[output.status] || output.status || '已登记')}</span></div>
          ${output.taskId ? `<p class="mt-1 text-xs text-gray-500">任务：${esc(tasks.find((task) => task.id === output.taskId)?.title || output.taskId)}</p>` : ''}
          ${output.description ? `<p class="mt-1 whitespace-pre-wrap text-xs text-gray-600">${esc(output.description)}</p>` : ''}
        </li>`).join('')}</ul>` : '<p class="text-xs text-gray-500">暂无结构化工作产出。</p>'}
    </div>`;

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-2 mb-3">
      <h4 class="font-title-cn text-sm font-bold text-gray-800">${esc(tf.name)}</h4>
      <span class="badge" style="${statusBadgeStyle(tf.status)}">${statusText(tf)}</span>
    </div>
    <div class="space-y-1.5 text-xs text-gray-600 mb-4">
      ${tf.task ? `<p><span class="text-gray-500">任务：</span>${esc(tf.task)}</p>` : ''}
      <p><span class="text-gray-500">人数：</span>${filled.length}/${tf.capacity || 0}</p>
      ${tf.deadline ? `<p><span class="text-gray-500">截止：</span>${esc(tf.deadline)}</p>` : ''}
      ${tf.initiator ? `<p><span class="text-gray-500">发起人：</span>${canRevealNames ? esc(getPersonName(tf.initiator)) : '组织者 1 人'}</p>` : ''}
    </div>
    ${myFillHtml}
    <div class="pt-3 border-t border-gray-100">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-1">历史分工记录（旧版工作量）</h5>
      <p class="mb-2 text-xs leading-5 text-gray-500">旧成员贡献仅作历史分工记录保留，不自动迁移为任务或产出；新登记的工作内容单独保存在下方“工作产出”。${canRevealNames ? '' : '登录并进入所属支部后可查看历史分工明细。'}</p>
      ${memberRows}
    </div>
    ${outputHtml}
    ${progressHtml}`;

  // ── 统一检索引擎两处接入（2026-09-14 裁定）─────────────────────
  // ① 成员贡献：第一列是人 → 姓名关键词（成员对象无 name 字段，取 personId 经 getPersonName 命中）；
  //    stateKey 带专班 id：详情面板换专班时搜索/页码不串台（同一专班重渲染仍保持）。
  if (filled.length > 0 && canRevealNames) {
    renderFilteredList(panel.querySelector('#tfv-member-host'), {
      stateKey: `tfv-member-contrib-${tf.id}`,
      rows: filled,
      keyword: { keys: ['personId'], placeholder: '搜索成员姓名…', get: (m) => getPersonName(m.personId) },
      facets: [],
      countUnit: '人',
      listClass: '',
      emptyMessage: '无匹配成员',
      rowHtml: (m) => {
        const contribs = (m.contributions || []).length;
        const list = contribs > 0
          ? `<ul class="mt-1 space-y-0.5">${(m.contributions || []).map(c => {
              const desc = typeof c === 'string' ? c : (c.desc || c.description || c.title || JSON.stringify(c));
              const meta = (c && typeof c === 'object' && (c.by || c.at))
                ? `<span class="text-[11px] text-gray-500"> · ${[c.by ? esc(getPersonName(c.by)) : '', c.at ? esc(String(c.at).slice(0, 16).replace('T', ' ')) : ''].filter(Boolean).join(' ')}</span>`
                : '';
              return `<li class="text-[12px] text-gray-500 pl-2">${esc(desc)}${meta}${_contribTagOf(c)}</li>`;
            }).join('')}</ul>`
          : '<span class="text-[12px] text-gray-500 pl-2">暂无贡献记录</span>';
        return `
          <div class="py-2 border-b border-gray-50 last:border-b-0">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-700">${esc(getPersonName(m.personId))}</span>
              <div class="flex items-center gap-2">
                ${badgeHtml(m.role || '深度参与者', 'neutral')}
                <span class="text-xs text-gray-500">贡献 ${contribs} 项</span>
              </div>
            </div>
            ${list}
          </div>`;
      },
    });
  }

  // ② 中间进度（时间线）：只给分页（keyword null + facets [] → 不渲染检索条；≤8 条不出翻页控件）
  if (tfProgressList.length > 0) {
    renderFilteredList(panel.querySelector('#tfv-progress-host'), {
      stateKey: `tfv-progress-${tf.id}`,
      rows: tfProgressList,
      keyword: null,
      facets: [],
      countUnit: '条',
      listClass: '',
      emptyMessage: '暂无进度记录',
      rowHtml: (p) => `
          <div class="py-2 border-b border-gray-50 last:border-b-0 flex items-start gap-2">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:var(--functional-success);"></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                ${p.stage ? `<span class="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style="background:#10B98115;color:#0D9488;">${esc(p.stage)}</span>` : ''}
                <span class="text-[11px] text-gray-500">${esc((p.at || '').slice(0, 16).replace('T', ' '))}</span>
                <span class="text-[11px] text-gray-500">${p.by ? (canRevealNames ? esc(getPersonName(p.by)) : '成员') : ''}</span>
              </div>
              <p class="text-xs text-gray-600 leading-relaxed mt-0.5">${esc(p.note || '')}</p>
            </div>
          </div>`,
    });
  }

  // B批 R3-3：本人填报提交（写口 addContributions，by=填报人=本人）
  panel.querySelector('#tfv-output-add')?.addEventListener('click', async (event) => {
    if (!me || !canSubmitOutput) return;
    const button = event.currentTarget;
    const title = (panel.querySelector('#tfv-output-title')?.value || '').trim();
    if (!title) { showToast('error', '请填写产出名称'); return; }
    button.disabled = true;
    try {
      await TaskForceRecordStore.createWorkgroupOutput(tf.id, {
        title,
        taskId: panel.querySelector('#tfv-output-task')?.value || null,
        description: (panel.querySelector('#tfv-output-desc')?.value || '').trim(),
      });
      showToast('success', '工作产出已登记');
      const fresh = TaskForceRecordStore.getAll().find(x => x.id === tf.id) || tf;
      await _renderTfDetail(container, fresh, highlightId);
    } catch (error) {
      showToast('error', error?.message || '工作产出登记失败');
      button.disabled = false;
    }
  });
}
