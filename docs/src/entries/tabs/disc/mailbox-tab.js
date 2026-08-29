// role: [工程师]+[AI]
// 纪检委员工作台 Tab：公邮管理（T-279 M3 拆分）
// 支部公邮配置/查收周期倒计时 + 查收历史；配置与历史经 mockDB 持久化（seed 兜底注入一次）。

import { mockDB } from '../../../core/domain.js?v=20260829h';
import { persist } from '../../../core/data-adapter.js?v=20260829h';
import { getPersonName } from '../../../mock/index.js?v=20260829h';
import { showToast } from '../../../core/utils.js?v=20260829h';
import { DISC_COMMISSIONER_ID } from './_shared.js?v=20260829h';

// ── 公邮管理 seed 数据（2026-08-05：seed 常量 + mockDB 持久化，刷新不再丢失）──
const MAILBOX_CONFIG_SEED = {
  email: 'gsm1921_branch@edu.cn',
  checkCycleDays: 3,
  lastCheckAt: '2026-07-27T10:00:00Z',
};

const MAILBOX_HISTORY_SEED = [
  { id: 'mh1', checkedAt: '2026-07-27T10:00:00Z', checkedBy: 'p10', summary: '收到学院通知1封，已转发至支委群', hasAction: false },
  { id: 'mh2', checkedAt: '2026-07-24T09:30:00Z', checkedBy: 'p10', summary: '收到组织关系转接确认函，已归档', hasAction: true },
  { id: 'mh3', checkedAt: '2026-07-21T11:00:00Z', checkedBy: 'p10', summary: '无新邮件', hasAction: false },
  { id: 'mh4', checkedAt: '2026-07-18T10:15:00Z', checkedBy: 'p10', summary: '收到主题党日通知，已安排宣传委员跟进', hasAction: true },
  { id: 'mh5', checkedAt: '2026-07-15T09:45:00Z', checkedBy: 'p10', summary: '收到党委文件1份，已存档', hasAction: true },
];

// 从 mockDB 读取（seed 兜底注入一次）；写操作须更新 mockDB.mailboxConfig/mailboxHistory 后调用 persist()
function _loadMailboxConfig() {
  if (!mockDB.mailboxConfig) {
    mockDB.mailboxConfig = { ...MAILBOX_CONFIG_SEED };
  }
  return mockDB.mailboxConfig;
}

function _loadMailboxHistory() {
  if (mockDB.mailboxHistory.length === 0 && MAILBOX_HISTORY_SEED.length > 0) {
    mockDB.mailboxHistory = MAILBOX_HISTORY_SEED.map(h => ({ ...h }));
  }
  return mockDB.mailboxHistory;
}

/** 格式化时间（月-日 时:分） */
function _discFormatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function renderContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  const mailboxConfig = _loadMailboxConfig();
  const mailboxHistory = _loadMailboxHistory();

  // 计算下次查收倒计时
  const lastCheck = new Date(mailboxConfig.lastCheckAt);
  const nextCheck = new Date(lastCheck);
  nextCheck.setDate(nextCheck.getDate() + mailboxConfig.checkCycleDays);
  const now = new Date();
  const diffMs = nextCheck - now;
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  const daysLeft = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const countdownText = isOverdue
    ? `已超期 ${daysLeft}天${hoursLeft}小时`
    : `${daysLeft}天${hoursLeft}小时`;
  const countdownColor = isOverdue ? 'text-red-600' : 'text-green-600';
  const countdownBg = isOverdue ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 邮箱信息 + 倒计时 -->
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">支部公邮</h3>
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1">
            <div class="text-xs text-gray-500 mb-1">邮箱地址</div>
            <div class="text-sm font-mono font-medium text-gray-800">${mailboxConfig.email}</div>
          </div>
          <div class="flex-1">
            <div class="text-xs text-gray-500 mb-1">查收周期</div>
            <div class="text-sm font-medium text-gray-800">每 ${mailboxConfig.checkCycleDays} 天</div>
          </div>
        </div>
        <div class="p-3 rounded-xl border ${countdownBg}">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-gray-600 mb-0.5">${isOverdue ? '距上次查收已过' : '距下次查收'}</div>
              <div class="text-lg font-bold ${countdownColor}">${countdownText}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">上次查收</div>
              <div class="text-xs text-gray-600">${_discFormatTime(mailboxConfig.lastCheckAt)}</div>
            </div>
          </div>
          ${isOverdue ? '<div class="text-xs text-red-500 mt-2">已超期，请尽快查收公邮</div>' : ''}
        </div>
        <div class="mt-3 flex gap-2">
          <button class="btn-md btn-md-green btn-disc-check-mailbox">标记已查收</button>
        </div>
      </div>

      <!-- 查收历史 -->
      <div class="card rounded-xl p-5">
        <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-3">查收历史</h3>
        <div class="text-xs text-gray-500 mb-3">纪检委员定期查收支部公邮，处理来往邮件</div>
        <div class="space-y-2">
          ${mailboxHistory.map(h => `
            <div class="p-3 rounded-xl bg-white">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded ${h.hasAction ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'}">${h.hasAction ? '有处理' : '无待办'}</span>
                  <span class="text-xs text-gray-600">${_discFormatTime(h.checkedAt)}</span>
                </div>
                <span class="text-xs text-gray-400">${getPersonName(h.checkedBy)}</span>
              </div>
              <div class="text-xs text-gray-700">${h.summary}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // 绑定"标记已查收"按钮事件
  container.querySelector('.btn-disc-check-mailbox')?.addEventListener('click', () => {
    const now = new Date().toISOString();
    const newRecord = {
      id: 'mh_' + Date.now(),
      checkedAt: now,
      checkedBy: DISC_COMMISSIONER_ID,
      summary: '已查收，暂无待处理邮件',
      hasAction: false,
    };
    mailboxHistory.unshift(newRecord);
    mailboxConfig.lastCheckAt = now;
    persist();
    showToast('success', '公邮查收已记录');
    renderContent();
  });
}
