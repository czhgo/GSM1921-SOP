// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/stats.js — 首页统计卡 + 个人考勤弹窗（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：_renderStats + _bindAttendancePopover + ATTENDANCE_STATUS_DOT。
//  职责单一：统计卡渲染 + 考勤明细弹窗（点击统计卡查看本月考勤）。
// ════════════════════════════════════════════════════════════════

import { NoticeStore } from '../../services/governance/notice.js?v=20261028b';
import { _fmtDate } from '../../core/base/utils.js?v=20261028b';
// 活动「已归档」口径单一源（2026-09-13 收敛）：替代手写 !a.archived
import { isActivityArchived } from '../../core/domain/constants.js?v=20261028b';
import { isTaskforceActiveStatus } from '../../core/domain/domain.js?v=20261028b';
// R2-47：出勤率语义单一源——首页「个人考勤」按应到人次（不是按已录记录），未录显示「待录入」
import { summarizePersonAttendanceByRoster } from '../../services/activity/attendance.js?v=20261028b';

import { emptyStateHtml } from '../ui/empty-state.js?v=20261028b';
const ATTENDANCE_STATUS_DOT = {
  present:  { text: '出勤', cls: 'text-green-700', dot: 'var(--status-success)' },
  absent:   { text: '缺勤', cls: 'text-red-600',  dot: 'var(--status-error)' },
  leave:    { text: '请假', cls: 'text-orange-500', dot: '#F97316' },
  made_up:  { text: '已补', cls: 'text-blue-500', dot: 'var(--status-info)' },
};

// 弹窗的 document 级关闭监听防重绑定（统计卡即时刷新会反复调用）
let _attDocBound = false;

/**
 * 渲染首页统计卡 + 绑定个人考勤弹窗
 * @param {{activities: Array, taskforces: Array, notices: Array, attendanceRecords: Array, user: Object|null, isLoading?: boolean}} opts
 */
export function renderDashboardStats({ activities, taskforces, notices, attendanceRecords, user, isLoading = false }) {
  const container = document.getElementById('dashboard-stats');
  if (!container) return;

  // 加载中：显示骨架屏，避免 0→真实值 闪烁（2026-10-28：骨架与正式卡同构——数字 + 标签两行）
  if (isLoading) {
    const skeletonItems = ['本月活动', '活跃专班', '未读通知', '个人考勤'];
    container.innerHTML = skeletonItems.map(label => `
      <div class="card rounded-xl p-4 stat-card">
        <div class="h-6 w-12 rounded bg-gray-100 animate-pulse mb-1"></div>
        <p class="text-xs" style="color:var(--neutral-500);">${label}</p>
      </div>
    `).join('');
    return;
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActivities = activities.filter(a => (a.date || '').startsWith(thisMonth) && !isActivityArchived(a));
  const activeTFs = taskforces.filter(t => isTaskforceActiveStatus(t.status));
  const unreadNotices = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;

  const userPersonId = user?.personId;
  // R2-47（2026-10-20）：原口径 = (出勤+已补) / 本月**已录记录数**——只录 3 条全勤也显示 100%，
  //   与支书概况/纪检台的「应到人次」分母不一致。现统一走服务层按应到人次统计：
  //   本条卡片的数值语义 = 出勤（含已补）/ 本月应到场次；未录（rate=null）显示「待录入」。
  const myRoster = userPersonId
    ? summarizePersonAttendanceByRoster({ personId: userPersonId, month: thisMonth })
    : { total: 0, present: 0, rate: null };
  const myPresent = myRoster.present;
  const myTotal = myRoster.total;
  const myRate = myRoster.rate;

  // 2026-10-28 支书裁定「四个数统一为卡片数字」：卡片只留「数字（24px）＋ 标签（12px）」，
  //   删除彩色图标块与彩色数字（数字一律正文色）；「逾期」类着色仍由 .metric-band__value--warning 承担。
  //
  // A-01 修复（历史）：图标底色曾用 8 位 hex 拼接，var+hex 无法解析——图标块已随本次裁定删除。
  // 卡片过拟合修正（2026-09-13 支书裁定「专班只是工作的一部分；三会一课是规范表达，专班是本支部自己的表达」）：
  // 「活跃专班」是**本支部自创工作方法**（workflow/blocks/manifests.js: provenance='branch-custom'），
  // 非党内统一规范动作——原无论有无专班恒渲染（无专班的支部永远显示「0 个」）属**过拟合**。
  // 改为：仅在**确有活跃/招募中专班**时出现（规范类统计「本月活动」不受影响，始终保留）。
  // 2026-10-27 Task 6.4（脏乱繁）：390 两列网格里长标签（「个人考勤（本月无记录）」）会折行把卡片撑成
  //   两种高度 ⇒ 标签统一 4 字（短标签），状态说明降为第二行小字（`.stat-card__note`）；
  //   卡片统一 `min-height`，四张等高。
  const stats = [
    { label: '本月活动', value: monthActivities.length, unit: '场', interactive: false },
    ...(activeTFs.length > 0
      ? [{ label: '活跃专班', value: activeTFs.length, unit: '个', interactive: false }]
      : []),
    { label: '未读通知', value: unreadNotices, unit: '条', interactive: false },
    // 空态（P2-5）：没有记录不是「数据坏了」，而是「本月无记录」这一事实。
    // R2-47：有应到场次但一条都没录 → 「待录入」，不再把未录当成 0%。
    { label: '个人考勤',
      value: myTotal > 0 && myRate !== null ? `${myPresent}/${myTotal}` : '—',
      unit: '', interactive: true,
      note: myTotal === 0 ? '本月无记录' : (myRate === null ? '待录入' : ''),
      title: '分母＝本月应到场次（应到人次口径；未录场次单列「待录入」）' },
  ];

  // T-304 Q2 点击热区：不可点卡（前三张）不再 hover 上浮（纯展示卡不加 hover 伪装，DESIGN_SYSTEM §4.3）；
  // 仅可点卡（个人考勤）保留 hover 反馈。统一 cursor：可点卡 pointer / 展示卡 default。
  container.innerHTML = stats.map(s => `
    <div class="card rounded-xl p-4 stat-card ${s.interactive ? 'card--interactive transition-colors duration-200 cursor-pointer' : ''}"
         ${s.interactive ? 'role="button" tabindex="0" data-attendance-popover="1"' : ''} ${s.title ? `title="${s.title}"` : ''}>
      <p class="metric-band__value">${s.value}<span class="text-xs font-normal ml-0.5" style="color:var(--neutral-500);">${s.unit}</span></p>
      <p class="metric-band__label">${s.label}</p>
      ${s.note ? `<p class="text-xs stat-card__note" style="color:var(--neutral-500);">${s.note}</p>` : ''}
    </div>
  `).join('');

  if (userPersonId) {
    _bindAttendancePopover(activities, attendanceRecords, thisMonth, user);
  }
}

/** 个人考勤弹窗（点击统计卡 → 本月考勤明细） */
function _bindAttendancePopover(activities, attendanceRecords, thisMonth, user) {
  const trigger = document.querySelector('[data-attendance-popover="1"]');
  if (!trigger) return;

  let popover = document.getElementById('attendance-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'attendance-popover';
    popover.style.cssText = 'position:absolute;z-index:50;background:var(--surface-card);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);border:1px solid var(--neutral-200);padding:12px;width:300px;display:none;';
    document.body.appendChild(popover);
  }

  // 5.3（2026-10-22 第九轮）：可点卡不是原生按钮 —— 补原子 Enter / Space 触发（与鼠标等效）。
  trigger.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    trigger.click();
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popover.style.display === 'none' || popover.style.display === '') {
      const userPersonId = user.personId;
      const myRecords = attendanceRecords.filter(r => {
        if (r.personId !== userPersonId) return false;
        const act = activities.find(a => a.id === r.activityId);
        return act && act.date && act.date.startsWith(thisMonth);
      }).sort((a, b) => {
        const actA = activities.find(x => x.id === a.activityId);
        const actB = activities.find(x => x.id === b.activityId);
        return (actB?.date || '').localeCompare(actA?.date || '');
      });

      const listHTML = myRecords.length === 0
        ? emptyStateHtml({ text: "本月暂无考勤记录", variant: 'panel' })
        : myRecords.map(r => {
            const act = activities.find(a => a.id === r.activityId);
            const s = ATTENDANCE_STATUS_DOT[r.status] || { text: r.status, cls: 'text-gray-500', dot: 'var(--neutral-400)' };
            return `
              <div class="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-b-0">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${s.dot};"></span>
                <span class="text-sm text-gray-700 truncate flex-1">${act?.title || r.activityId}</span>
                <span class="text-xs text-gray-500 flex-shrink-0">${act?.date ? _fmtDate(new Date(act.date)) : ''}</span>
                <span class="text-xs font-medium ${s.cls} flex-shrink-0 w-8 text-right">${s.text}</span>
              </div>
            `;
          }).join('');

      popover.innerHTML = `
        <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <h3 class="font-title-cn text-sm font-semibold text-gray-800">我的本月考勤</h3>
          <span class="text-xs text-gray-500">${myRecords.length} 条记录</span>
        </div>
        <div class="max-h-64 overflow-y-auto">${listHTML}</div>
      `;

      // A-02 修复：clamp 定位，防止第 4 列统计卡触发时右缘溢出视口
      const rect = trigger.getBoundingClientRect();
      const POPOVER_WIDTH = 300;
      const POPOVER_MARGIN = 8;
      const popoverLeft = Math.min(rect.left + window.scrollX, window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN);
      popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
      popover.style.left = `${Math.max(POPOVER_MARGIN, popoverLeft)}px`;
      popover.style.display = 'block';
    } else {
      popover.style.display = 'none';
    }
  });

  // document 级关闭监听：仅绑定一次（统计卡即时刷新会反复调用本函数）
  if (!_attDocBound) {
    _attDocBound = true;
    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && !trigger.contains(e.target)) {
        popover.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') popover.style.display = 'none';
    });
  }
}
