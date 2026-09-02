// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/stats.js — 首页统计卡 + 个人考勤弹窗（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：_renderStats + _bindAttendancePopover + ATTENDANCE_STATUS_DOT。
//  职责单一：统计卡渲染 + 考勤明细弹窗（点击统计卡查看本月考勤）。
// ════════════════════════════════════════════════════════════════

import { NoticeStore } from '../../services/notice.js?v=20260901o';
import { _fmtDate } from '../../core/utils.js?v=20260901o';
import { icon } from '../../core/icons.js?v=20260901o';

const ATTENDANCE_STATUS_DOT = {
  present:  { text: '出勤', cls: 'text-green-600', dot: '#10B981' },
  absent:   { text: '缺勤', cls: 'text-red-500',  dot: '#EF4444' },
  leave:    { text: '请假', cls: 'text-orange-500', dot: '#F97316' },
  made_up:  { text: '已补', cls: 'text-blue-500', dot: '#3B82F6' },
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

  // 加载中：显示骨架屏，避免 0→真实值 闪烁
  if (isLoading) {
    const skeletonItems = [
      { label: '本月活动', icon: 'calendarHero' },
      { label: '活跃专班', icon: 'usersGroup' },
      { label: '未读通知', icon: 'bellHero' },
      { label: '个人考勤', icon: 'clipboard' },
    ];
    container.innerHTML = skeletonItems.map(s => `
      <div class="card rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 animate-pulse">
          ${icon(s.icon, { strokeWidth: 1.8, stroke: '#D1D5DB', className: 'w-5 h-5' })}
        </div>
        <div>
          <div class="h-7 w-12 rounded bg-gray-100 animate-pulse mb-1"></div>
          <p class="text-xs" style="color:var(--neutral-400);">${s.label}</p>
        </div>
      </div>
    `).join('');
    return;
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActivities = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);
  const activeTFs = taskforces.filter(t => t.status === 'active' || t.status === 'recruiting');
  const unreadNotices = NoticeStore.list({ activeOnly: true }).filter(n => !n.read).length;

  // 我的考勤（本月）
  const userPersonId = user?.personId;
  const myMonthAttendance = userPersonId
    ? attendanceRecords.filter(r => {
        if (r.personId !== userPersonId) return false;
        const act = activities.find(a => a.id === r.activityId);
        return act && act.date && act.date.startsWith(thisMonth);
      })
    : [];
  // 数字一致性审计（2026-08-07）：出勤率口径与书记概况统一 = (出勤 + 已补) / 总记录；
  // 补课语义为"最终出勤"，made_up 记录计入出勤数。颜色阈值全站统一 90/70。
  const myPresent = myMonthAttendance.filter(r => r.status === 'present' || r.status === 'made_up').length;
  const myTotal = myMonthAttendance.length;
  const myRate = myTotal > 0 ? Math.round((myPresent / myTotal) * 100) : 0;
  const myColor = myTotal === 0 ? '#9CA3AF'
    : myRate >= 90 ? '#059669'
    : myRate >= 70 ? '#D97706'
    : '#DC2626';

  // A-01 修复：color 统一为 hex 常量，图标底色用 8 位 hex（${hex}15），var+hex 拼接无法解析
  // 2026-08-10 书记两次裁定·首页统计卡最终配色：活动=蓝 #3B82F6 / 专班=亮金 #F59E0B / 未读通知=红 #DC2626 / 考勤=状态三色
  const stats = [
    { label: '本月活动', value: monthActivities.length, unit: '场', color: '#3B82F6', icon: 'calendarHero', interactive: false },
    { label: '活跃专班', value: activeTFs.length, unit: '个', color: '#F59E0B', icon: 'usersGroup', interactive: false },
    { label: '未读通知', value: unreadNotices, unit: '条', color: unreadNotices > 0 ? '#DC2626' : '#9CA3AF', icon: 'bellHero', interactive: false },
    { label: '个人考勤', value: myTotal > 0 ? `${myPresent}/${myTotal}` : '—', unit: '', color: myColor, icon: 'clipboard', interactive: true },
  ];

  // T-304 Q2 点击热区：不可点卡（前三张）不再 hover 上浮（纯展示卡不加 hover 伪装，COMPONENT_SPEC §4.3）；
  // 仅可点卡（个人考勤）保留 hover 反馈。统一 cursor：可点卡 pointer / 展示卡 default。
  container.innerHTML = stats.map(s => `
    <div class="card rounded-xl p-4 flex items-center gap-3 ${s.interactive ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}"
         ${s.interactive ? 'data-attendance-popover="1"' : ''}>
      <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 stat-icon-tint" style="--tint:${s.color};">
        ${icon(s.icon, { strokeWidth: 1.8, stroke: s.color, className: 'w-5 h-5' })}
      </div>
      <div>
        <p class="text-2xl font-bold" style="color:${s.color};line-height:1.2;">${s.value}<span class="text-xs font-normal ml-0.5" style="color:var(--neutral-400);">${s.unit}</span></p>
        <p class="text-xs" style="color:var(--neutral-400);">${s.label}</p>
      </div>
    </div>
  `).join('');

  // 绑定我的考勤弹窗
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
        ? '<p class="text-xs text-gray-400 text-center py-4">本月暂无考勤记录</p>'
        : myRecords.map(r => {
            const act = activities.find(a => a.id === r.activityId);
            const s = ATTENDANCE_STATUS_DOT[r.status] || { text: r.status, cls: 'text-gray-400', dot: '#9CA3AF' };
            return `
              <div class="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-b-0">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${s.dot};"></span>
                <span class="text-sm text-gray-700 truncate flex-1">${act?.title || r.activityId}</span>
                <span class="text-xs text-gray-400 flex-shrink-0">${act?.date ? _fmtDate(new Date(act.date)) : ''}</span>
                <span class="text-xs font-medium ${s.cls} flex-shrink-0 w-8 text-right">${s.text}</span>
              </div>
            `;
          }).join('');

      popover.innerHTML = `
        <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <h3 class="font-title-cn text-sm font-semibold text-gray-800">我的本月考勤</h3>
          <span class="text-xs text-gray-400">${myRecords.length} 条记录</span>
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
