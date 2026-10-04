// role: [工程师]+[AI]
// entries/tabs/secretary/notification-tab.js — 支书工作台·通知发布 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分。
// 数据源：NoticeStore（与首页/全局概况/visitor 同源，消除双数据源脱节）。

import { NoticeStore, sendDirectMessage } from '../../../services/governance/notice.js?v=20261004l';
import { AuthStore } from '../../../services/core/auth.js?v=20261004l';
import { showToast, getBasePath, _fmtDate } from '../../../core/base/utils.js?v=20261004l';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261004l';
import { openModal, closeModal } from '../../../components/ui/modal.js?v=20261004l';
// 统一检索引擎（2026-09-14 批次 37）：已发布通知列表接入关键词（标题/正文）+ 分页
import { renderFilteredList } from '../../../components/ui/list-filter.js?v=20261004l';
// Q-22-1（2026-09-13）：受众选项改引 core/domain/constants.js 单一源（NOTICE_AUDIENCE_SENTINELS）——
// 发布侧写入值必须与消费端可见性判定同源，勿再本地手写 sentinel 列表（否则 ['all'] 永不命中）。
import { NOTICE_AUDIENCE_OPTIONS, ACTIVITY_CLASSIFICATION } from '../../../core/domain/constants.js?v=20261004l';
// SOP-B-5（D-293）：发布三会一课通知时选定本次活动 —— 被通知人在「确认读取」时填「能否线上参会」
import { loadActivities } from '../../../services/activity/activity.js?v=20261004l';
// B1（2026-09-12）：党委下钻支部的演示只读视图判定（单一源 = services/core/branch-demo-nav.js）
import { isReadonlyBranchDrilldown } from '../../../services/core/branch-demo-nav.js?v=20261004l';
// 站内信（批次 348 · 支书 `#4`「站内信是一个很重要的形式」）：受众「指定人（私发）」——选人用 PersonPicker
//（选人规范 §2.2：姓名/学号搜索，不手写名单）
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261004l';

const NOTIFICATION_TAB_HTML = `
  <div class="card rounded-xl p-5 mb-6">
    <div class="flex items-center justify-between mb-1">
      <h3 class="font-title-cn text-base font-semibold text-gray-800">发布通知</h3>
      <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">动作</span>
    </div>
    <!-- 2026-10-04 批次 373 · 支书 #10「页内导语写明动作属性」：本页保名，页内点明它是「动作」而非对象台账 -->
    <p class="text-xs text-gray-500 mb-4">本页是<strong>动作</strong>页：一次性向选定受众发布通知 / 站内信（发出即入下方「已发布通知」台账），不承载对象管理。</p>
    <div id="notification-form-area"></div>
  </div>
  <div class="card rounded-xl p-5">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">已发布通知</h3>
    <div id="notification-list-area"></div>
  </div>
`;

/** 渲染通知发布 tab */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'notification') {
    tc.innerHTML = NOTIFICATION_TAB_HTML;
    tc.dataset.currentTab = 'notification';
  }
  renderNotificationPanel();
}

/** 渲染通知发布面板（表单 + 列表） */
function renderNotificationPanel() {
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染发布表单 */
function renderNotificationForm() {
  const formArea = document.getElementById('notification-form-area');
  if (!formArea) return;

  // B1（2026-09-12）：党委下钻只读视图 → 不渲染发布表单，改为只读说明
  if (isReadonlyBranchDrilldown()) {
    formArea.innerHTML = '<p class="text-xs text-gray-500 leading-relaxed">党委演示只读视图：本页仅供只读查看，不可发布/编辑/删除通知（写操作按角色权限拒绝）。</p>';
    return;
  }

  let html = '';

  // 通知标题
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题 <span class="text-red-600">*</span></label>`;
  html += `<input type="text" id="notif-title" class="input-flat w-full" placeholder="通知标题">`;
  html += `</div>`;

  // 通知内容
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容 <span class="text-red-600">*</span></label>`;
  html += `<textarea id="notif-content" rows="4" class="input-flat w-full" placeholder="通知正文"></textarea>`;
  html += `</div>`;

  // 目标受众
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">目标受众 <span class="text-red-600">*</span></label>`;
  html += `<div class="flex flex-wrap gap-2">`;
  NOTICE_AUDIENCE_OPTIONS.forEach(a => {
    const on = _selectedAudience.includes(a.value);
    html += `<button data-notif-action="select-audience" data-value="${a.value}" class="btn-tab chip-option text-sm px-4 py-2 rounded-lg${on ? ' chip-accent-on font-medium' : ''}"${on ? ' style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)"' : ''}>${a.label}</button>`;
  });
  html += `</div>`;
  // 站内信（批次 348 · 支书 `#4`）：与「群体受众」并列的一档——**指定人（私发）**（点对点 / 点对多人）
  html += `<div class="mt-2 flex flex-wrap gap-2">`;
  html += `<button data-notif-action="toggle-direct" class="btn-tab chip-option text-sm px-4 py-2 rounded-lg${_directMode ? ' chip-accent-on font-medium' : ''}">指定人（私发 · 站内信）</button>`; // 选中态只借 `.chip-accent-on`（其 color 走主题变量）——**不写内联色**（`hex-hardcode-guard::H1` 禁新增硬编码）
  html += `</div>`;
  html += `</div>`;
  if (_directMode) {
    html += `<div class="mb-5 rounded-lg border border-gray-200 bg-white p-3">`;
    html += `<p class="text-xs text-gray-500 mb-2">收件人（可多选）——站内信<b>仅你与收件人可见</b>，不进支部公告。</p>`;
    html += `<div id="notif-direct-host"></div>`;
    html += `</div>`;
  }

  // 关联三会一课活动（选填，SOP-B-5）
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium" for="notif-meeting-activity">关联会议活动 <span class="text-gray-500">（选填；发布三会一课通知时选定本次活动）</span></label>`;
  html += `<select id="notif-meeting-activity" class="input-flat w-full">`;
  html += `<option value="">不关联（普通通知）</option>`;
  _meetingActivityOptions().forEach(a => {
    html += `<option value="${a.id}">${a.title}（${a.date || '未排期'} · ${a.type}）</option>`;
  });
  html += `</select>`;
  html += `<p class="text-[11px] text-gray-500 mt-1 leading-5">关联后，被通知人在通知详情点「确认读取」时可填<b>能否线上参会</b>；线上参会按制度记「请假」、<b>不计入出席、只免补课</b>。</p>`;
  html += `</div>`;

  // 发布按钮
  html += `<button data-notif-action="publish" class="btn-accent text-sm px-4 py-[7px] font-medium">发布通知</button>`;

  formArea.innerHTML = html;

  // 绑定事件
  formArea.querySelectorAll('[data-notif-action]').forEach(el => {
    el.addEventListener('click', handleNotifAction);
  });

  // 站内信（批次 348）：指定人档的选人器（每次重渲染重建；destroy 防叠加）
  if (_directMode) {
    _directPicker?.destroy();
    _directPicker = new PersonPicker({ mode: 'multi', placeholder: '搜索姓名或学号选择收件人' });
    const host = document.getElementById('notif-direct-host');
    if (host) _directPicker.render(host);
  }
}

/** 通知表单状态（2026-08-08 多选改造：受众支持同时选择多个群体） */
let _selectedAudience = [];

/** 站内信（私发）状态（批次 348）：是否切到「指定人」档 ＋ 选人器实例 */
let _directMode = false;
let _directPicker = null;

/** 处理通知面板操作 */
function handleNotifAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.notifAction;

  switch (action) {
    case 'select-audience': {
      // 多选切换：已选则移除，未选则加入
      const value = btn.dataset.value;
      _selectedAudience = _selectedAudience.includes(value)
        ? _selectedAudience.filter(v => v !== value)
        : [..._selectedAudience, value];
      // 更新按钮视觉状态（选中项红色高亮）
      const formArea = document.getElementById('notification-form-area');
      if (formArea) {
        formArea.querySelectorAll('[data-notif-action="select-audience"]').forEach(b => {
          const isSelected = _selectedAudience.includes(b.dataset.value);
          b.className = isSelected
            ? 'chip-accent-on chip-option text-sm px-4 py-2 rounded-lg font-medium'
            : 'chip-option text-sm px-4 py-2 rounded-lg';
          if (isSelected) b.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent) 55%, #fff)');
          else b.style.removeProperty('--acc-text-dark');
        });
      }
      break;
    }

    case 'toggle-direct': {
      // 站内信（批次 348）：切「指定人（私发）」档（重渲染以显示 / 隐藏选人器）
      _directMode = !_directMode;
      renderNotificationForm();
      break;
    }

    case 'publish': {
      handlePublishNotification();
      break;
    }

    default:
      return;
  }
}

/** 按受众值数组取标签列表 */
function _audienceLabels(values) {
  return values.map(v => {
    const found = NOTICE_AUDIENCE_OPTIONS.find(a => a.value === v);
    return found ? found.label : v;
  });
}

/**
 * 可关联的**三会一课活动**（发布会议通知用，SOP-B-5）——类型清单派生自 ACTIVITY_CLASSIFICATION（单一源），
 * 排除已归档 / 已取消；按日期倒序（最近的在前）。
 */
function _meetingActivityOptions() {
  const types = ACTIVITY_CLASSIFICATION['three-meetings'].subtypes;
  return loadActivities()
    .filter(a => a && !a.archived && a.status !== 'cancelled' && types.includes(a.type))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/** 发布通知（写入 NoticeStore，与首页/全局概况/visitor 同源） */
function handlePublishNotification() {
  // B1（2026-09-12）提交处显式拒绝兜底：党委下钻只读视图不得发布通知
  if (isReadonlyBranchDrilldown()) {
    showToast('error', '党委演示只读视图：不可发布通知（写操作按角色权限拒绝）');
    return;
  }
  const titleEl = document.getElementById('notif-title');
  const contentEl = document.getElementById('notif-content');

  const title = titleEl?.value?.trim();
  const content = contentEl?.value?.trim();

  if (!title) { showToast('error', '请填写通知标题'); titleEl?.focus(); return; }
  if (!content) { showToast('error', '请填写通知内容'); contentEl?.focus(); return; }
  // 站内信（批次 348）：指定人档的「受众」＝已选收件人；未选人**沿用同一条既有校验文案**
  //（「请选择目标受众」——不新增字段级校验点，台账 / 真机流零改签）
  const _directRecipients = _directMode ? (_directPicker?.getSelected() || []) : [];
  if (_directMode ? _directRecipients.length === 0 : _selectedAudience.length === 0) {
    showToast('error', '请选择目标受众');
    return;
  }

  const _me = AuthStore.getCurrentUser() || {};

  // 站内信（批次 348 · 支书 `#4`「站内信是一个很重要的形式」；批次 353 改走**服务层单一写口**）：
  //   逐人 **fan-out**（每人一条、`audiencePersons:[该人]`）——① 未读 / 已读沿用既有全局 `read` 语义
  //   （**不误灭他人未读**，无需改读侧与角标）；② 可见性由 `canReadNotice` 的私信判据收口
  //   （**仅发件人 ＋ 收件人**，见 services/governance/notice.js ⑥）；③ 发送权口径与服务层同源
  //   （`D-748`：支委层 ∪ 党小组组长）。
  if (_directMode) {
    const sent = sendDirectMessage({
      title,
      content,
      toPersonIds: _directRecipients,
      actorRole: _me.role || 'secretary',
      actorPersonId: _me.personId || null,
    });
    if (!sent) { showToast('error', '站内信未发出：请确认正文与收件人（发送权＝支委层 / 党小组组长）'); return; }
    showToast('success', `站内信「${title}」已发送给 ${sent} 人（仅你与收件人可见）`);
    _selectedAudience = [];
    _directMode = false;
    renderNotificationForm();
    renderNotificationList();
    return;
  }

  // 关联会议活动（选填，SOP-B-5）：关联后该通知的「确认读取」可填「能否线上参会」，落该场考勤
  const meetingActivityId = document.getElementById('notif-meeting-activity')?.value || null;

  const audienceLabels = _audienceLabels(_selectedAudience);
  const notification = {
    title,
    content,
    priority: 'normal',
    publishDate: new Date().toISOString().slice(0, 10),
    expireDate: null,
    targetModule: 'workspace',
    read: false,
    audience: [..._selectedAudience],
    audienceLabel: audienceLabels.join('、'),
    // 关联的三会一课活动 id（不关联则 null）——通知→考勤的线上参会申报靠它定位活动
    meetingActivityId,
    // 落款按实际发布角色（dogfood 权限专项 2026-09-13）：此前硬编码「支书」，
    // 副支书发布也显示「支书」→ 审计失真；现按当前登录角色取「支书/副支书」
    publishedBy: (AuthStore.getCurrentUser() || {}).role === 'deputy-secretary' ? '副支书' : '支书',
  };

  // 2026-09-19 批次 91（SOP-B-17）：发布权判定一并带 personId——白名单角色不变，
  //   本组通知另按「此人是否该场组织者」放行（支书台的发布口仍是全支部通知主位）。
  NoticeStore.add(notification, _me.role || 'secretary', _me.personId || null);

  showToast('success', `通知「${title}」已发布至${audienceLabels.join('、')}`);

  // 重置表单
  _selectedAudience = [];
  renderNotificationForm();
  renderNotificationList();
}

/** 渲染已发布通知列表（NoticeStore 全部通知，按发布日期倒序） */
function renderNotificationList() {
  const listArea = document.getElementById('notification-list-area');
  if (!listArea) return;

  // P3 党委下发（2026-09-02）：audience='committee' 的党委下发通知不进支部「已发布」管理列表
  // （方向：上级下发为只读治理信息，支部不可在其自发通知管理区删改）
  const notifications = NoticeStore.getAll()
    .filter(n => n.source !== 'committee')
    .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));

  // 统一检索引擎（2026-09-14 批次 37）：关键词（标题/正文）+ 分页一站式；
  // 空态文案迁移为 emptyMessage，原「暂无已发布通知」分支删除。
  // #notification-list-area 由本页模板持有、跨重渲染复用，故委托监听只挂一次（dataset 守卫）。
  renderFilteredList(listArea, {
    stateKey: 'secretary-notification-published',
    rows: notifications,
    keyword: { keys: ['title', 'content'], placeholder: '搜索通知标题 / 正文…' },
    countUnit: '条',
    listClass: 'divide-y divide-gray-100',
    emptyMessage: '暂无已发布通知',
    rowHtml: (n) => {
      // 受众徽章：兼容旧数据（audience 为字符串）与新数据（audience 为数组），按受众各渲染一枚徽章
      const audienceValues = Array.isArray(n.audience) ? n.audience : (n.audience ? [n.audience] : []);
      const audienceBadges = audienceValues.length > 0
        ? _audienceLabels(audienceValues).map(l => badgeHtml(l, 'warning')).join('')
        : badgeHtml(n.audienceLabel || '全体党员', 'warning');
      // publishDate 为字符串（'2026-07-15'）时直接切片，兼容 Date 对象走 _fmtDate
      const dateStr = n.publishDate
        ? (typeof n.publishDate === 'string' ? n.publishDate.slice(0, 10) : _fmtDate(n.publishDate))
        : '';
      // B1（2026-09-12）：党委下钻只读视图 → 不渲染删除/编辑写入口
      const writeBtns = isReadonlyBranchDrilldown() ? '' : `
          <button data-notif-action="delete" data-notif-id="${n.id}" class="btn-ghost text-xs ml-2 flex-shrink-0 px-3 py-1.5">删除</button>
          <!-- B 档 CRUD 补全：通知编辑（复用 NoticeStore.update，同源写穿） -->
          <button data-notif-action="edit" data-notif-id="${n.id}" class="btn-outline text-xs flex-shrink-0 px-3 py-1.5" title="编辑该通知">编辑</button>`;
      return `
      <div class="py-3 px-4 rounded-xl bg-white transition-colors group cursor-pointer hover:bg-gray-50" data-notif-id="${n.id}" data-notif-row="1" title="查看通知详情">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-800">${n.title}</span>
            ${audienceBadges}
          </div>
          ${writeBtns}
        </div>
        <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">${n.content}</p>
        <p class="text-xs text-gray-500 mt-1.5">${n.publishedBy || '支书'} · ${dateStr}</p>
      </div>
    `;
    },
  });

  // 行内「删除 / 编辑」与整卡「查看详情」改事件委托（引擎翻页/筛选会重绘列表，行内直接绑定会失效）：
  // 挂在持久容器 #notification-list-area 上；先判按钮后判整卡，等效原 stopPropagation（按钮不触发跳转）。
  if (!listArea.dataset.notifDelegated) {
    listArea.dataset.notifDelegated = '1';
    listArea.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-notif-action="delete"]');
      if (delBtn) {
        NoticeStore.remove(delBtn.dataset.notifId, 'secretary');
        showToast('success', '通知已删除');
        renderNotificationList();
        return;
      }
      const editBtn = e.target.closest('[data-notif-action="edit"]');
      if (editBtn) {
        const notice = NoticeStore.getAll().find(n => n.id === editBtn.dataset.notifId);
        if (notice) _openNoticeEditModal(notice);
        return;
      }
      const row = e.target.closest('[data-notif-row="1"]');
      if (row) window.location.href = `${getBasePath()}notice.html?id=${row.dataset.notifId}`;
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  B 档 CRUD 补全：通知编辑浮窗（预填 → NoticeStore.update 同源写穿）
// ════════════════════════════════════════════════════════════════
function _openNoticeEditModal(notice) {
  const audienceValues = Array.isArray(notice.audience) ? notice.audience : (notice.audience ? [notice.audience] : []);
  const chips = NOTICE_AUDIENCE_OPTIONS.map(a => {
    const on = audienceValues.includes(a.value) ? ' chip-accent-on font-medium' : '';
    return `<button type="button" data-notif-edit-aud="${a.value}" class="btn-tab chip-option text-sm px-4 py-2 rounded-lg${on}"${on ? ' style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)"' : ''}>${a.label}</button>`;
  }).join('');

  openModal({
    id: 'notice-edit',
    title: '编辑通知',
    width: '560px',
    accentColor: '#CE1126',
    bodyHtml: `
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题 <span class="text-red-600">*</span></label>
          <input type="text" id="ne-title" class="input-flat w-full" value="${notice.title || ''}">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容 <span class="text-red-600">*</span></label>
          <textarea id="ne-content" rows="4" class="input-flat w-full">${notice.content || ''}</textarea>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">目标受众</label>
          <div class="flex flex-wrap gap-2">${chips}</div>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="ne-priority">优先级</label>
          <select id="ne-priority" class="input-flat w-full">
            <option value="normal" ${notice.priority !== 'urgent' ? 'selected' : ''}>普通</option>
            <option value="urgent" ${notice.priority === 'urgent' ? 'selected' : ''}>紧急</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button id="ne-cancel" class="btn-ghost text-xs px-3 py-1.5">取消</button>
        <button id="ne-save" class="btn-accent text-xs px-3 py-1.5">保存</button>
      </div>
    `,
    onMount: (panel) => {
      panel.querySelectorAll('[data-notif-edit-aud]').forEach(chip => {
        chip.addEventListener('click', () => chip.classList.toggle('chip-accent-on'));
      });
      panel.querySelector('#ne-cancel')?.addEventListener('click', () => closeModal('notice-edit'));
      panel.querySelector('#ne-save')?.addEventListener('click', () => {
        const title = panel.querySelector('#ne-title')?.value?.trim();
        const content = panel.querySelector('#ne-content')?.value?.trim();
        if (!title) { showToast('error', '请填写通知标题'); return; }
        if (!content) { showToast('error', '请填写通知内容'); return; }
        const values = [...panel.querySelectorAll('[data-notif-edit-aud].chip-accent-on')].map(c => c.dataset.notifEditAud);
        const updated = NoticeStore.update(notice.id, {
          title,
          content,
          audience: values,
          audienceLabel: _audienceLabels(values).join('、'),
          priority: panel.querySelector('#ne-priority')?.value || 'normal',
        }, 'secretary');
        if (!updated) { showToast('error', '通知更新失败'); return; }
        showToast('success', '通知已更新');
        closeModal('notice-edit');
        renderNotificationList();
      });
    },
  });
}
