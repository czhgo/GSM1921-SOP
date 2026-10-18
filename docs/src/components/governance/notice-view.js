// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/notice-view.js —— **通知视图层**
//
//  分层纪律（G1 第③项，2026-09-28）：**服务层不产 UI**。「通知列表卡片 / 铃铛下拉浮窗 /
//  发布本组通知浮窗」原与 NoticeStore 同住 services/governance/notice.js，服务层因此 import
//  了组件（badges / modal）——本轮把**视图部分整体搬到这里**（逐字搬迁、零行为变化）；
//  数据侧只留在 services/governance/notice.js（NoticeStore / NoticePermission / resolveNoticeUrl）。
//
//  依赖方向正确：组件 → 服务（不是服务 → 组件）。守卫见 notice-audience / doc-consistency。
// ════════════════════════════════════════════════════════════════

import { badgeHtml } from '../ui/badges.js?v=20261018h';
import { openFormModal } from '../ui/modal.js?v=20261018h';
import { showToast, getBasePath, todayLocal } from '../../core/base/utils.js?v=20261018h';
import { ROLE_LABELS } from '../../core/domain/constants.js?v=20261018h';
import { AuthStore } from '../../services/core/auth.js?v=20261018h';
import { getPersonById, liveMembers } from '../../services/member/person.js?v=20261018h';
import { isActivityOrganizer } from '../../services/activity/activity.js?v=20261018h';
import { NoticeStore, NoticePermission, resolveNoticeUrl } from '../../services/governance/notice.js?v=20261018h';

function committeeSourceChip() {
  return '<span style="display:inline-flex;align-items:center;padding:0 6px;border-radius:9999px;background:var(--party-red);color:#fff;font-size:10px;line-height:16px;flex-shrink:0;">党委下发</span>';
}

/**
 * 渲染通知列表。
 *
 * 2026-09-29 批次 280/282（支书评议 + 裁定）：**首页不该是消息垃圾桶**——
 *   ① 明细列表只列「**不成类**」的通知（标题只出现 1 次者）；
 *   ② **同类**（标题相同且 ≥2 条）**自动归并为一条**，置于列表**上方**（样式突出但**不写「置顶」二字**），
 *      点开**就地展开**（支书逐字：「待办催办…应当全部打包！！而不是应该 每一条都列出来」
 *      ／「代办催办 也没有 统合起来呀？我觉得这很不合理！」）。
 *   ✅ 判定**不依赖任何标记或 kind 枚举**：**标题相同且 ≥2 条 ⇒ 归并**。
 *      ⚠ 批次 280 曾把归并建在 `systemDerived` 布尔上——该标记**已随 R-22 移除**（见
 *      `services/governance/notice.js`）⇒ 归并**从未触发**；批次 282 据此改为标题归并（**修正**）。
 *   ⚠ `opts.groupSystem` 只由**首页**传（`main-entry.js`）；工作台沿用原行为——**默认零影响**。
 */
export function renderNoticeList(containerId, limit = 5, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 支书规则（2026-08-01）：任何带时间字段的列示一律按时间倒序（最新在前）
  // 支书裁决（2026-08-05）：重要通知仅保留未读，紧急通知无论已读未读均展示
  const notices = NoticeStore.list({ activeOnly: true, sortBy: 'date', retention: 'visible' });

  // 同类归并（2026-09-29 批次 282 —— **修正批次 280 的错**）：
  //   ⚠ 批次 280 把归并建在 `systemDerived` 布尔上；而该标记**已随旧通道关闭而移除**
  //     （见 `services/governance/notice.js` R-22 批注：「原『不传 actorRole 即打标 systemDerived』已移除」）
  //     ⇒ 归并**从未触发**，首页仍逐条列「待办催办」（支书实报：「代办催办 也没有 统合起来呀？我觉得这很不合理！」）。
  //   ✅ 改为**不依赖任何标记/枚举**的判定：**标题相同且 ≥2 条 ⇒ 自动归并成一条**（可展开）；
  //     只出现 1 条的照常进明细列表。跨来源、跨批次都成立，且新增通知类不会漏网。
  const groupSystem = opts.groupSystem === true;
  let shown = groupSystem ? notices.slice(0, limit) : notices.slice(0, limit);
  let byClassList = [];
  if (groupSystem) {
    const countByTitle = new Map();
    for (const n of notices) {
      const k = n.title || '通知';
      countByTitle.set(k, (countByTitle.get(k) || 0) + 1);
    }
    const isClass = (n) => countByTitle.get(n.title || '通知') >= 2;
    const singles = notices.filter((n) => !isClass(n));
    const grouped = new Map();
    for (const n of notices.filter(isClass)) {
      const k = n.title || '通知';
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k).push(n);
    }
    byClassList = [...grouped.entries()];
    shown = singles.slice(0, limit);
  }

  if (shown.length === 0 && byClassList.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">暂无通知</p>';
    return;
  }

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
  };

  /**
   * 单条通知行（列表与聚合展开共用，避免落第二份标记）。
   * 导航行：整行可点，阅读详情即已读；不再单设「确认读取」第二动作。
   * 用原生 <a> 承载整行，保留 data-notice-id / data-target / data-target-url 落点；
   * 真实去向仍由统一的点击处理决定（resolveNoticeUrl）。
   */
  const rowHtml = (n) => `
    <a href="${n.targetUrl || `${getBasePath()}notice.html?id=${encodeURIComponent(n.id)}`}" class="notice-item notice-row row-quiet w-full p-0 text-left cursor-pointer hover:bg-gray-50 rounded-lg transition-colors group"
         data-target="${n.targetModule || ''}" data-notice-id="${n.id}" data-target-url="${n.targetUrl || ''}"
         title="${n.title} — ${n.content}">
      ${priorityBadge[n.priority] || ''}
      <div class="notice-row__main">
        <div class="flex items-center gap-1.5 min-w-0">
          ${n.source === 'committee' ? committeeSourceChip() : ''}
          <span class="notice-row__title group-hover:text-blue-700 transition-colors">${n.title}</span>
        </div>
        <span class="notice-row__meta line-clamp-2">${n.content}</span>
      </div>
      <div class="notice-row__actions">
        <span class="notice-row__meta notice-row__meta--flush">${n.publishDate}</span>
      </div>
    </a>`;

  // ── 同类：按「类」（通知标题）归并 ──
  // 2026-09-29 批次 286（支书第二轮评议）：
  //   ① 「`badge badge--info`『3 条』我觉得很丑」⇒ 弃用**文字胶囊**，改**红底数字小圆**（沿 2026-09-29 批次 285 支书认可的微信范式·提醒语义；>9 收敛 `9+`）；
  //   ② 「每排就这么几个字，有点浪费」「字体大小不好看」⇒ 一类**不再独占一整行**——
  //      各类**并排成一行 chips**（`flex flex-wrap`，横向铺满、自动换行），类名升到 `text-sm`
  //      （与通知标题同档，不再用弱化的 `text-xs`），去掉冗余的「展开 ›」文字。
  //   ⚠ 仍**不写「置顶」二字**（沿 2026-09-29 批次 280 支书裁定）；仍**不落 hex / 不新增字号档**（圆内文字用既有 `text-xs`）。
  let summaryHtml = '';
  if (byClassList.length) {
    const countCircle = (n) => '<span class="text-xs text-white font-semibold rounded-full flex items-center justify-center"'
      + ' style="min-width:16px;height:16px;padding:0 4px;background:var(--party-red);">'
      + `${n > 9 ? '9+' : n}</span>`;
    // 2026-09-29 批次 294（支书评议：「summary 展开后好丑…宽度有一定规则…收拢时两个 summary 要舒服」）：
    //   收拢＝**并排小胶囊**（等距 `gap` + 等内边距，不再随内容挤）；展开＝**整行铺开**
    //   （`.notice-group-chip[open]{ flex:1 0 100% }`，见 styles.css）⇒ 展开内容**不再挤在胶囊宽度里**；
    //   展开态与收起态之间加一条分隔线（`[open] > summary` 的下边框）。
    summaryHtml = `<div class="notice-group-bar">${byClassList.map(([label, list]) => `
      <details class="notice-group-chip">
        <summary class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-sm text-gray-800 hover:bg-gray-50 transition-colors">
          <span class="font-medium">${label}</span>${countCircle(list.length)}
        </summary>
        <div class="notice-group-body row-divider divide-y divide-gray-100">${list.map(rowHtml).join('')}</div>
      </details>`).join('')}</div>`;
  }

  const listHtml = shown.length ? `<div class="row-divider divide-y divide-gray-100">${shown.map(rowHtml).join('')}</div>`
    : '<p class="text-sm text-gray-500">暂无新通知</p>';
  container.innerHTML = summaryHtml + listHtml;

  // 整行为导航动作：阅读详情即已读（与工作台未读条同口径），不再设「确认读取」第二动作
  container.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const id = item.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (id) NoticeStore.markRead(id);
      // 视觉反馈：点击后标题颜色变浅
      item.querySelector('.notice-row__title')?.classList.add('text-gray-500');
      const dest = resolveNoticeUrl(notice);
      const finalUrl = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${id}`;
      window.location.href = finalUrl;
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  本组通知发布口（2026-09-19 批次 91 · SOP-B-17 / `D-308` · `D-309` · §9k）
//  「组织者是信息流与任务流」——某人被指定为某场活动的组织者，**这场活动的发布口就在他台上**：
//    · 发布权随「被指定」动态获得（见 NoticePermission.canPublish），**不按角色静态加名单**；
//    · 受众＝**本组**（该场承办党小组 / 缺省取组织者所属党小组的成员 ＋ 组织者本人）；
//    · **全支部通知仍归支书**——本口不提供全支部广播，不做支书代发。
//  单一实现，供成员台「活动动态」与组长台「活动管理」两处行内入口共用（勿各自再写一份）。
// ════════════════════════════════════════════════════════════════

/** 该场活动的「本组」人员 id（承办党小组优先，缺省＝组织者所属党小组；恒含组织者本人） */
export function groupAudienceIdsOf(activity, organizerId) {
  const group = activity?.hostGroup
    || (getPersonById(organizerId) || {}).partyGroup
    || '';
  const ids = liveMembers().filter(p => p.partyGroup && p.partyGroup === group).map(p => p.id);
  if (organizerId && !ids.includes(organizerId)) ids.push(organizerId);
  return { group, ids };
}

/**
 * 打开「发布本组通知」浮窗（该场活动的组织者本人可用）
 * @param {{ activity:Object, accentColor?:string, onPublished?:Function }} opts
 * @returns {boolean} 是否打开了浮窗（无权限 / 无活动时返回 false 并给出提示）
 */
export function openGroupNoticeComposer({ activity, accentColor = '#3B82F6', onPublished = null } = {}) {
  const me = AuthStore.getCurrentUser();
  const meId = me?.personId || null;
  if (!activity || !meId) { showToast('error', '无法发布：活动或登录会话缺失'); return false; }
  if (!isActivityOrganizer(meId, activity.id)) {
    showToast('error', '只有本场活动的组织者才能发布本组通知');
    return false;
  }
  const { group, ids } = groupAudienceIdsOf(activity, meId);
  const audienceLabel = group ? `本组（${group}）` : '本组';

  openFormModal({
    id: 'group-notice-compose',
    title: `发布本组通知 · ${activity.title || '未命名活动'}`,
    accentColor,
    submitLabel: '发布',
    fields: [
      { key: 'title', label: '通知标题', required: true, placeholder: '如：本周党小组会时间与地点' },
      { key: 'content', label: '通知内容', required: true, type: 'textarea', placeholder: '写清时间、地点、需要谁做什么' },
    ],
    onSubmit: (values) => {
      const title = (values.title || '').trim();
      const content = (values.content || '').trim();
      if (!title) { showToast('error', '请填写通知标题'); return false; }
      if (!content) { showToast('error', '请填写通知内容'); return false; }
      const created = NoticeStore.add({
        title,
        content,
        priority: 'normal',
        publishDate: todayLocal(),
        expireDate: null,
        targetModule: 'activity',
        targetType: 'activity',
        targetId: activity.id,
        targetUrl: `activity.html?id=${encodeURIComponent(activity.id)}`,
        read: false,
        audience: [],
        audiencePersons: ids,
        audienceLabel: `${audienceLabel} · 组织者发布`,
        publishedBy: ROLE_LABELS[me.role] || me.role || '',
        publisherId: meId,
        createdBy: meId,
        source: 'activity-group',
      }, me.role, meId);
      if (!created) { showToast('error', '发布失败：无发布权限'); return false; }
      showToast('success', `已发布本组通知（${audienceLabel} ${ids.length} 人可见）`);
      if (typeof onPublished === 'function') onPublished(created);
      return true;
    },
  });
  return true;
}

