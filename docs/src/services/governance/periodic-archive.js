// 周期归档期次与策略快照：周期由支部制度参数决定，提交记录保存当时口径。

function dateOnly(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  const text = String(value || '').slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function fmt(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isoWeek(date) {
  const thursday = new Date(date);
  const weekday = thursday.getDay() || 7;
  thursday.setDate(thursday.getDate() + 4 - weekday);
  const weekYear = thursday.getFullYear();
  const jan4 = new Date(weekYear, 0, 4, 12);
  const jan4Weekday = jan4.getDay() || 7;
  const firstThursday = new Date(jan4);
  firstThursday.setDate(firstThursday.getDate() + 4 - jan4Weekday);
  const week = 1 + Math.round((thursday - firstThursday) / 604800000);
  return { weekYear, week };
}

export function deriveArchivePeriod(unit, at = new Date()) {
  const date = dateOnly(at);
  if (unit === 'month') {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return {
      unit: 'month',
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${year}年${month}月`,
      range: `${year}-${String(month).padStart(2, '0')}-01 ~ ${fmt(new Date(year, month, 0, 12))}`,
    };
  }
  const monday = new Date(date);
  const weekday = monday.getDay() || 7;
  monday.setDate(monday.getDate() - weekday + 1);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const { weekYear, week } = isoWeek(date);
  return {
    unit: 'week',
    key: `${weekYear}-W${String(week).padStart(2, '0')}`,
    label: `第${week}周`,
    range: `${fmt(monday)} ~ ${fmt(friday)}`,
  };
}

function periodStart(report) {
  const range = report?.periodRange || report?.weekRange || '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(range).trim());
  if (match) return match[1];
  return String(report?.periodKey || report?.week || '');
}

export function compareArchivePeriodDesc(left, right) {
  return periodStart(right).localeCompare(periodStart(left));
}

export function attachArchivePolicySnapshot(report, policy, version = 1, submittedAt = new Date()) {
  if (!report || typeof report !== 'object') return report;
  if (report.archivePolicySnapshot) return report;
  const sourceRange = report.periodRange || report.weekRange || '';
  const periodDate = String(sourceRange).split('~')[0].trim() || submittedAt;
  const period = deriveArchivePeriod(policy?.unit, periodDate);
  return {
    ...report,
    periodUnit: period.unit,
    periodKey: period.key,
    periodLabel: period.label,
    periodRange: period.range,
    archivePolicySnapshot: {
      id: 'branch-periodic-archive',
      version: Math.max(1, Number.isInteger(version) ? version : 1),
      unit: period.unit,
      periodKey: period.key,
      periodLabel: period.label,
      periodRange: period.range,
    },
  };
}
