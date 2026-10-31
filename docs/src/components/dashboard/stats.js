// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/stats.js — 首页统计卡 + 个人考勤弹窗（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：_renderStats + _bindAttendancePopover + ATTENDANCE_STATUS_DOT。
//  职责单一：统计卡渲染 + 考勤明细弹窗（点击统计卡查看本月考勤）。
// ════════════════════════════════════════════════════════════════

import { NoticeStore } from '../../services/governance/notice.js?v=20261031a';
import { _fmtDate } from '../../core/base/utils.js?v=20261031a';
import { icon } from '../../core/base/icons.js?v=20261031a';
// 活动「已归档」口径单一源（2026-09-13 收敛）：替代手写 !a.archived
import { isActivityArchived } from '../../core/domain/constants.js?v=20261031a';
import { isTaskforceActiveStatus } from '../../core/domain/domain.js?v=20261031a';
// R2-47：出勤率语义单一源——首页「个人考勤」按应到人次（不是按已录记录），未录显示「待录入」
import { summarizePersonAttendanceByRoster, attendanceRateTone } from '../../services/activity/attendance.js?v=20261031a';

// 出勤率档位 → 既有语义色 token（服务层只给档位，颜色映射留在展示层）
const ATTENDANCE_TONE_COLOR = {
  good: 'var(--status-success)',
  watch: 'var(--status-warning-text)',
  low: 'var(--status-error)',
  pending: 'var(--neutral-500)',
};
// 2026-10-28：数值（24px 大字）与图标分两档色。--status-success 对白卡仅 2.54:1，
//   大字要求 ≥3:1 ⇒「良好」档数值退回正文色 --neutral-800（对白卡 14.68:1），
//   绿色只留在 `.stat-icon-tint` 的图标笔触上（装饰性、aria-hidden，不承担信息）。
//   其余档位对白卡 ≥3:1（warning-text 7.09 / error 3.76 / neutral-500 4.83），数值与图标同色。
const ATTENDANCE_VALUE_COLOR = {
  ...ATTENDANCE_TONE_COLOR,
  good: 'var(--neutral-800)',
};

import { emptyStateHtml } from '../ui/empty-state.js?v=20261031a';
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

  // 加载中：显示骨架屏，避免 0→真实值 闪烁（2026-10-29 P2：骨架与正式卡同构——图标在左、数值/标签在右）
  if (isLoading) {
    const skeletonItems = ['本月活动', '活跃专班', '未读通知', '个人考勤'];
    container.innerHTML = skeletonItems.map(label => `
      <div class="card rounded-xl px-4 py-3 stat-card">
        <span class="stat-icon-tint" style="--tint:var(--neutral-300);" aria-hidden="true">
          <span class="h-5 w-5 rounded bg-gray-100 animate-pulse"></span>
        </span>
        <div class="stat-card__body">
          <p class="stat-card__value"><span class="h-6 w-12 inline-block rounded bg-gray-100 animate-pulse"></span></p>
          <p class="stat-card__label">${label}</p>
        </div>
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
  const myTone = attendanceRateTone(myRate);

  // 2026-10-28 支书裁定「四个数恢复彩色图标点缀」（CASE-DESIGN-030）：
  //   每张卡＝图标块（浅底 ＋ 同色笔触）＋ 数值（24px，同色）＋ 标签（12px 中性）；
  //   颜色一律取既有语义 token（--status-* / --neutral-*），不写 hex、不新增色相；
  //   图标不是唯一信息载体——标签与空态说明仍在。
  //
  // A-01 修复（历史）：图标底色曾用 8 位 hex 拼接，var+hex 无法解析 ⇒ 底色改由 `--tint` 在 CSS 派生。
  // 卡片过拟合修正（2026-09-13 支书裁定「专班只是工作的一部分；三会一课是规范表达，专班是本支部自己的表达」）：
  // 「活跃专班」是**本支部自创工作方法**（workflow/blocks/manifests.js: provenance='branch-custom'），
  // 非党内统一规范动作——原无论有无专班恒渲染（无专班的支部永远显示「0 个」）属**过拟合**。
  // 改为：仅在**确有活跃/招募中专班**时出现（规范类统计「本月活动」不受影响，始终保留）。
  // 2026-10-29 P2（支书：「一个 p 一行…摊大饼」）：数字组统一为「图标在左、数值/标签在右两行」；
  //   卡片不再写 `min-height`——四张等高由 #dashboard-stats 的栅格 `align-items: stretch` 保证。
  //   标签仍取短标签（4 字），状态说明降为 `.stat-card__note`。
  // 颜色 = 既有语义 token：活动信息蓝 / 专班琥珀文字档 / 未读错误红（0 条回落中性）/ 考勤按档位。
  const stats = [
    { label: '本月活动', value: monthActivities.length, unit: '场', color: 'var(--status-info)', icon: 'calendarHero', interactive: false },
    ...(activeTFs.length > 0
      ? [{ label: '活跃专班', value: activeTFs.length, unit: '个', color: 'var(--status-warning-text)', icon: 'usersGroup', interactive: false }]
      : []),
    { label: '未读通知', value: unreadNotices, unit: '条',
      color: unreadNotices > 0 ? 'var(--status-error)' : 'var(--neutral-500)', icon: 'bellHero', interactive: false },
    // 空态（P2-5）：没有记录不是「数据坏了」，而是「本月无记录」这一事实。
    // R2-47：有应到场次但一条都没录 → 「待录入」，不再把未录当成 0%。
    { label: '个人考勤',
      value: myTotal > 0 && myRate !== null ? `${myPresent}/${myTotal}` : '—',
      unit: '', color: ATTENDANCE_TONE_COLOR[myTone], valueColor: ATTENDANCE_VALUE_COLOR[myTone],
      icon: 'clipboard', interactive: true,
      note: myTotal === 0 ? '本月无记录' : (myRate === null ? '待录入' : ''),
      title: '分母＝本月应到场次（应到人次口径；未录场次单列「待录入」）' },
  ];

  // T-304 Q2 点击热区：不可点卡（前三张）不给 hover / 手型（纯展示卡不加 hover 伪装，DESIGN_SYSTEM §4.3）；
  // 仅可点卡（个人考勤）挂 .card--interactive，hover = 主题色边框 ＋ 10% 淡底，不阴影、不上浮。
  container.innerHTML = stats.map(s => `
    <div class="card rounded-xl px-4 py-3 stat-card ${s.interactive ? 'card--interactive cursor-pointer' : ''}"
         ${s.interactive ? 'role="button" tabindex="0" data-attendance-popover="1"' : ''} ${s.title ? `title="${s.title}"` : ''}>
      <span class="stat-icon-tint" style="--tint:${s.color};" aria-hidden="true">${icon(s.icon, { strokeWidth: 1.8, className: 'w-5 h-5' })}</span>
      <div class="stat-card__body">
        <p class="stat-card__value" style="color:${s.valueColor || s.color};">${s.value}${s.unit ? `<span class="stat-card__unit">${s.unit}</span>` : ''}</p>
        <p class="stat-card__label">${s.label}</p>
        ${s.note ? `<p class="text-xs stat-card__note" style="color:var(--neutral-500);">${s.note}</p>` : ''}
      </div>
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
