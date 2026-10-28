// role: [工程师]+[AI]
// notice-entry.js — 统一「消息详情」入口（Task 3 · 2026-10-25）
// 一条消息三种布局：
//   · 公告 announcement：正文 + 发布人 + 受众 + 时间（无对象卡）
//   · 系统 system：正文 + 对象卡 + 唯一动作
//   · 私信 message：会话线程（同一 replyTo 链，时间升序）+ 回复框
// 已读与回执分离：进入详情即 markRead（只标记当前人）；「确认收到 / 线上参加」属业务回执，
//   独立渲染、不因已读隐藏。
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261028e';
import { renderHeader } from '../../components/shell/header.js?v=20261028e';
import { NoticeStore, canReadNotice, kindOf, isArchivedFor, replyToMessage } from '../../services/governance/notice.js?v=20261028e';
import { getBasePath, showToast, escHtml } from '../../core/base/utils.js?v=20261028e';
import { AuthStore } from '../../services/core/auth.js?v=20261028e';
import { getPersonName } from '../../services/member/person.js?v=20261028e';
import { badgeHtml } from '../../components/ui/badges.js?v=20261028e';
import { NOTICE_AUDIENCE_SENTINELS } from '../../core/domain/constants.js?v=20261028e';
// S1（2026-09-12）：通知详情页必须先完成数据 hydrate（loadDB/API init）再按 id 取数，
// 否则 NoticeStore 只剩 MOCK_NOTICES 内存兜底 → 用户/服务端通知一律「不存在或已过期」。
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261028e';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261028e';
import { BranchService } from '../../services/core/runtime.js?v=20261028e';
// SOP-B-5（D-293）：通知确认时填「能否线上参会」——线上参会落该场考勤为「请假 + 线上」、只免补课
import { declareOnlineAttend, loadAttendanceRecords } from '../../services/activity/attendance.js?v=20261028e';
import { loadActivities } from '../../services/activity/activity.js?v=20261028e';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261028e';
// Task 6：对象卡直达详情页（通知不在对象所属工作台内 ⇒ direct）。
import { objectDetailHref } from '../../core/domain/object-route.js?v=20261028e';

renderSidebar('messages');
renderHeader('messages');

const KIND_LABEL = { announcement: ['公告', 'info'], system: ['系统', 'brand'], message: ['私信', 'neutral'] };

/** 通知详情页数据 hydrate：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。 */
async function _hydrateData() {
  try {
    const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
    if (!r.ok) return; // 错误态已由共享实现渲染
  } catch (e) {
    console.warn('[notice-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

const params = new URLSearchParams(window.location.search);
const noticeId = params.get('id');
const cardEl = document.getElementById('notice-detail-card');

const backBtn = document.getElementById('notice-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'messages.html';
});

function _empty(html) {
  if (cardEl) cardEl.innerHTML = html;
}

(async () => {
  await _hydrateData();

  if (!noticeId) { _empty('<p class="text-sm text-gray-500 text-center py-12">未指定消息</p>'); return; }

  const notice = NoticeStore.getById(noticeId);
  if (!notice) {
    _empty('<p class="text-sm text-gray-500 text-center py-12">消息不存在或已删除</p>');
    return;
  }
  if (!canReadNotice(notice)) {
    const noSession = !AuthStore.getCurrentUser();
    _empty(`
      <p class="text-sm text-gray-500 text-center py-12">无权查看该消息</p>
      ${noSession ? `<div class="text-center pb-12"><a href="${getBasePath()}login.html" class="text-sm text-accent">去登录</a></div>` : ''}
    `);
    return;
  }

  // 进入详情即已读（只标记当前人）——回执不因此隐藏，见下方回执区。
  if (!notice.read) {
    try { NoticeStore.markRead(notice.id); } catch (err) { console.warn('[notice] 标记已读失败', err); }
  }
  renderDetail(NoticeStore.getById(notice.id) || notice);
})();

// ── 通知者 / 被通知者推断 ──
function _personNameOf(id) {
  if (!id) return '';
  const name = getPersonName(id);
  return name && name !== id ? name : '';
}

function inferPublisher(n) {
  const name = _personNameOf(n.fromPersonId || n.publisherId || n.createdBy);
  if (name) return name;
  if (n.publisher) return n.publisher;
  if (n.publishedBy) return n.publishedBy;
  // 历史种子通知未写发布人：沿用 targetModule 推断（与改造前同口径），系统通知才显示「系统」。
  const modulePublisherMap = { activity: '支书', party: '组织委员', workspace: '支书', attendance: '纪检委员' };
  if (modulePublisherMap[n.targetModule]) return modulePublisherMap[n.targetModule];
  return kindOf(n) === 'system' ? '系统' : '支部';
}

function inferRecipients(n) {
  if (n.audienceLabel) return n.audienceLabel;
  if (Array.isArray(n.audiencePersons) && n.audiencePersons.length) {
    return n.audiencePersons.map((id) => _personNameOf(id) || id).filter(Boolean).join('、');
  }
  if (n.audience) {
    const values = Array.isArray(n.audience) ? n.audience : [n.audience];
    return values.map((value) => NOTICE_AUDIENCE_SENTINELS[value]?.label || value).filter(Boolean).join('、');
  }
  if (n.recipients) return n.recipients;
  const moduleRecipientMap = {
    activity: '全体党员',
    party: '组织委员、相关发展对象',
    workspace: '全体支委',
    attendance: '纪检委员',
  };
  return moduleRecipientMap[n.targetModule] || '全体成员';
}

const _fmtTime = (n) => String(n.createdAt || n.publishDate || '').slice(0, 16).replace('T', ' ');

// ── 对象卡（只按 targetType/targetId 取数；取不到给可见提示）──────────
const OBJECT_META = {
  activity: { label: '活动', href: (id) => objectDetailHref('activity', id, { entry: 'notice' }), action: '去活动详情' },
  taskforce: { label: '专班', href: (id) => objectDetailHref('taskforce', id, { entry: 'notice' }), action: '去专班详情' },
  thoughtReport: { label: '思想汇报', href: (id) => `thought-report.html?id=${encodeURIComponent(id)}`, action: '查看思想汇报' },
  person: { label: '成员', href: (id) => `person.html?id=${encodeURIComponent(id)}`, action: '查看成员档案' },
  member: { label: '成员', href: (id) => `person.html?id=${encodeURIComponent(id)}`, action: '查看成员档案' },
  feedback: { label: '反馈', href: () => 'feedback.html', action: '查看反馈' },
  issue: { label: '反馈', href: () => 'feedback.html', action: '查看反馈' },
  makeup: { label: '补课任务', action: '前往考勤概况' },
  todo: { label: '待办', action: '去待办' },
  memberChange: { label: '成员变更申请', action: '去确认' },
  periodicArchive: { label: '周期归档', action: '去审核' },
  reviewRequest: { label: '支部上报', action: '去处理' },
  externalDispatch: { label: '材料外发', action: '去确认' },
  record: { label: '业务记录', action: '查看记录' },
  branch: { label: '所属支部', action: '' },
};

/** 对象卡数据；activity / taskforce 需要真实对象存在，否则返回 { missing:true } */
function _objectOf(n) {
  const type = n.targetType;
  const id = n.targetId;
  if (!type || !id) return null;
  const meta = OBJECT_META[type] || { label: type, action: '前往相关页面' };
  const base = { type, id, meta, href: meta.href ? meta.href(id) : (n.targetUrl ? getBasePath() + n.targetUrl : ''), fields: [] };
  if (type === 'activity') {
    const act = loadActivities().find((a) => a.id === id);
    if (!act) return { ...base, missing: true, label: '关联活动' };
    return { ...base, title: act.title || '未命名活动', fields: [['日期', act.date], ['地点', act.location], ['类型', act.type]].filter(([, v]) => v) };
  }
  if (type === 'taskforce') {
    const tf = TaskForceRecordStore.getAll().find((t) => t.id === id);
    if (!tf) return { ...base, missing: true, label: '关联专班' };
    return { ...base, title: tf.name || '未命名专班', fields: [['截止', tf.deadline], ['成员', `${(tf.members || []).filter((m) => m.personId).length} 人`]].filter(([, v]) => v) };
  }
  if (type === 'thoughtReport') {
    return { ...base, label: '关联思想汇报', fields: [['编号', id]] };
  }
  return { ...base, label: `关联${meta.label}`, fields: [['编号', id]] };
}

function _objectCardHtml(n) {
  const obj = _objectOf(n);
  if (!obj) {
    return `<div class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">这条系统通知未关联对象，无法定位到业务页。</div>`;
  }
  if (obj.missing) {
    return `<div class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">${escHtml(obj.label)}未找到（可能已删除）；正文仍可查看。</div>`;
  }
  return `
    <div class="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
      <div class="flex items-center gap-2 mb-2">
        ${badgeHtml(obj.meta.label, 'neutral')}
        ${obj.href
          ? `<a href="${escHtml(obj.href)}" class="link text-sm font-medium" title="打开${escHtml(obj.meta.label)}完整页">${escHtml(obj.title || obj.label)} →</a>`
          : `<span class="text-sm font-medium text-gray-800">${escHtml(obj.title || obj.label)}</span>`}
      </div>
      ${obj.fields.length ? `<p class="text-xs text-gray-500">${obj.fields.map(([k, v]) => `${escHtml(k)}：${escHtml(String(v))}`).join(' · ')}</p>` : ''}
    </div>`;
}

/** 系统通知的唯一动作（公告无动作；私信以回复框为主） */
function _actionHtml(n) {
  if (kindOf(n) !== 'system') return '';
  const obj = _objectOf(n);
  if (obj && obj.missing) return '';
  const href = obj?.href || (n.targetUrl ? getBasePath() + n.targetUrl : '');
  if (!href) return '';
  const label = obj?.meta?.action || '前往相关页面';
  return `<a href="${escHtml(href)}" class="btn-accent-soft inline-flex items-center gap-2 font-medium">${escHtml(label)} →</a>`;
}

// ── 回执区（已读与回执分离）────────────────────────────────────
function _meetingActivityOf(n) {
  // 与改造前同口径：只有发布时显式关联了「会议活动」（meetingActivityId）才进入业务回执区；
  // 系统通知的对象卡仍可指向任意活动，但不据此臆造「线上参会」回执。
  const activityId = n.meetingActivityId || null;
  if (!activityId) return null;
  return loadActivities().find((a) => a.id === activityId && !a.archived) || null;
}

function _hasOnlineReceipt(activityId, personId) {
  if (!activityId || !personId) return false;
  return loadAttendanceRecords().some((r) => r.activityId === activityId && r.personId === personId && r.onlineAttend === true);
}

function _receiptHtml(n) {
  const meeting = _meetingActivityOf(n);
  if (!meeting) return '';
  const me = AuthStore.getCurrentUser();
  const receipted = _hasOnlineReceipt(meeting.id, me?.personId);
  return `
    <div class="mt-6 pt-4 border-t border-gray-100" data-notice-receipt>
      <div class="text-xs text-gray-500 mb-2">业务回执 · 关联会议：<b class="text-gray-700">${escHtml(meeting.title || '会议 / 活动')}</b>${meeting.date ? `（${escHtml(meeting.date)}）` : ''}</div>
      ${receipted
        ? '<p class="text-xs text-gray-600">已申报线上参会：本场考勤记「请假」、不计出席、不补课。</p>'
        : `<label class="text-xs text-gray-500 mb-2 block font-medium" for="notice-online-attend">本次会议您能否线上参会？<span class="text-gray-500">（选填；确认收到时填写）</span></label>
           <select id="notice-online-attend" class="input-flat w-full mb-2">
             <option value="">暂不申报</option>
             <option value="yes">能，线上参加</option>
           </select>
           <button type="button" id="notice-receipt-btn" class="btn-accent-soft inline-flex items-center gap-2 font-medium">确认收到</button>`}
    </div>`;
}

function _metaRows(rows) {
  return rows.filter(([, v]) => v).map(([label, value]) => `
    <div class="flex items-start gap-3">
      <span class="text-gray-500 flex-shrink-0 w-16 text-right text-xs leading-6">${label}</span>
      <span class="text-gray-700 text-sm">${value}</span>
    </div>`).join('');
}

/** 归档 / 恢复（页顶） */
function _archiveHtml(n) {
  if (n.archived === true) return '<span class="text-xs text-gray-500">已系统归档</span>';
  if (isArchivedFor(n, AuthStore.getCurrentUser()?.personId)) {
    return `<button type="button" id="notice-restore-btn" class="btn-outline">恢复</button>`;
  }
  return `<button type="button" id="notice-archive-btn" class="btn-outline">归档</button>`;
}

// ── 私信会话 ──
function _threadHtml(n) {
  const me = AuthStore.getCurrentUser() || {};
  const thread = NoticeStore.messageThreadOf(n.id);
  const bubbles = (thread.length ? thread : [n]).map((m) => {
    const mine = m.fromPersonId && m.fromPersonId === me.personId;
    const who = _personNameOf(m.fromPersonId) || (mine ? '我' : '对方');
    return `
      <div class="rounded-lg p-3 ${mine ? 'bg-[var(--app-accent-soft-bg)]' : 'bg-gray-50'}">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium text-gray-700">${escHtml(who)}</span>
          <span class="text-xs text-gray-500">${escHtml(_fmtTime(m))}</span>
          ${m.replyTo ? '<span class="text-xs text-gray-500">回复</span>' : ''}
        </div>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">${escHtml(m.content || '（无正文）')}</p>
      </div>`;
  }).join('');
  return `
    <div class="space-y-2 mb-4" data-thread-id="${escHtml(n.id)}">${bubbles}</div>
    <div class="flex items-end gap-2">
      <textarea id="notice-reply-input" class="input-flat w-full" rows="3" maxlength="2000" placeholder="回复 ${escHtml(_personNameOf(n.fromPersonId) || '对方')}"></textarea>
      <button type="button" id="notice-reply-btn" class="btn-accent flex-shrink-0">回复</button>
    </div>
    <p class="help-note mt-2">回复只你与对方可见，并在原信下接成一线。</p>`;
}

function renderDetail(n) {
  if (!cardEl) return;
  const kind = kindOf(n);
  const [kindLabel, kindVariant] = KIND_LABEL[kind] || KIND_LABEL.announcement;
  const currentUser = AuthStore.getCurrentUser();
  const isMessage = kind === 'message';
  const publisher = inferPublisher(n);
  const recipients = inferRecipients(n);
  const replyToPerson = isMessage
    ? (_personNameOf(n.fromPersonId) === _personNameOf(currentUser?.personId)
      ? ((n.audiencePersons || []).map((id) => _personNameOf(id) || id).join('、') || '对方')
      : (_personNameOf(n.fromPersonId) || '对方'))
    : '';

  const metaRows = isMessage
    ? [['对方', escHtml(replyToPerson)], ['时间', escHtml(_fmtTime(n))]]
    : [
      ['发布人', escHtml(publisher)],
      ['受众', escHtml(recipients)],
      ['时间', escHtml(_fmtTime(n)) + (n.expireDate ? ` <span class="text-gray-500">· 截止 ${escHtml(n.expireDate)}</span>` : '')],
    ];

  cardEl.innerHTML = `
    <div class="mb-5 pb-4 border-b border-gray-100">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        ${badgeHtml(kindLabel, kindVariant)}
        ${n.source === 'committee' ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white" style="background:var(--party-red);">党委下发</span>' : ''}
        ${n.priority === 'urgent' ? badgeHtml('紧急', 'gold') : ''}
        ${!n.read ? badgeHtml('未读', 'warning') : ''}
        <span class="ml-auto">${_archiveHtml(n)}</span>
      </div>
      <div class="space-y-2">${_metaRows(metaRows)}</div>
    </div>

    <h2 class="font-title-cn text-xl font-bold text-gray-800 leading-snug mb-4">${escHtml(n.title || '（无标题）')}</h2>

    ${isMessage ? '' : `<div class="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">${escHtml(n.content || '')}</div>`}

    ${kind === 'system' ? `<div class="mb-6 space-y-3">${_objectCardHtml(n)}</div>` : ''}

    ${isMessage ? _threadHtml(n) : ''}

    ${_receiptHtml(n)}

    ${_actionHtml(n) ? `<div class="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">${_actionHtml(n)}</div>` : ''}
  `;

  _bindArchive(n);
  _bindReceipt(n);
  _bindReply(n);
}

function _bindArchive(n) {
  document.getElementById('notice-archive-btn')?.addEventListener('click', () => {
    if (!NoticeStore.archiveForViewer(n.id, true)) { showToast('error', '归档失败：该消息已被系统归档'); return; }
    showToast('success', '已归档，可在消息中心「已归档」中恢复');
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    renderDetail(NoticeStore.getById(n.id) || n);
  });
  document.getElementById('notice-restore-btn')?.addEventListener('click', () => {
    if (!NoticeStore.restoreForViewer(n.id)) { showToast('error', '恢复失败：系统归档的消息不可恢复'); return; }
    showToast('success', '已恢复');
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    renderDetail(NoticeStore.getById(n.id) || n);
  });
}

function _bindReceipt(n) {
  const btn = document.getElementById('notice-receipt-btn');
  if (!btn) return;
  const meeting = _meetingActivityOf(n);
  btn.addEventListener('click', () => {
    let declared = false;
    const onlineSel = document.getElementById('notice-online-attend');
    if (meeting && onlineSel && onlineSel.value === 'yes') {
      const me = AuthStore.getCurrentUser();
      if (!me || !me.personId) { showToast('error', '请先登录后再申报线上参会'); return; }
      const res = declareOnlineAttend({ activityId: meeting.id, personId: me.personId });
      if (!res.ok) { showToast('error', res.reason || '线上参会申报失败'); return; }
      declared = true;
    }
    // 回执不替代已读：进入详情时已读过，这里仍独立落回执 / 给出确认反馈。
    NoticeStore.markRead(n.id);
    showToast('success', declared
      ? '已申报线上参会：本场考勤记「请假」、不计出席、不补课'
      : '已确认收到');
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    renderDetail(NoticeStore.getById(n.id) || n);
  });
}

function _bindReply(n) {
  const btn = document.getElementById('notice-reply-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const input = document.getElementById('notice-reply-input');
    const content = (input?.value || '').trim();
    if (!content) { showToast('error', '请填写正文'); input?.focus(); return; }
    // 服务层单一写口：回信＝新私信 + replyTo 指向原信（同一线程）
    const sent = replyToMessage(n.id, { content });
    if (!sent) { showToast('error', '回复未发出（原信不存在或对方缺失）'); return; }
    showToast('success', '回复已发出（仅你与对方可见）');
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    renderDetail(NoticeStore.getById(n.id) || n);
  });
}
