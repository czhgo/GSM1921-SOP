// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  thought-report.js — 思想汇报服务（2026-08-30 书记决策启动数字化）
//  算法归档原则（书记 2026-08-30 强调）：党员/发展对象在系统内提交，
//  提交即入库即归档——算法按 personId 自动归集至个人档案，无人工归档环节，
//  组织委员只做查看/调用（考察发展党员时直接调用思想汇报记录）。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260829a';
import { persist } from '../core/data-adapter.js?v=20260829a';
import { THOUGHT_REPORTS } from '../mock/index.js?v=20260829a';
import { NoticeStore } from './notice.js?v=20260829a';
import { getPersonById } from './person.js?v=20260829a';

/** 读取全部思想汇报（算法归集的完整集合；持久化为空时回退 seed，与 inspection.js 同模式） */
export function loadThoughtReports() {
  return Array.isArray(mockDB.thoughtReports) && mockDB.thoughtReports.length > 0
    ? [...mockDB.thoughtReports]
    : [...THOUGHT_REPORTS];
}

/**
 * 提交思想汇报（提交即归档：写入集合即完成归集，无需人工归档环节）
 * @param {Object} rec
 * @param {string} rec.personId   — 提交人（党员/发展对象）
 * @param {string} rec.content    — 思想汇报正文
 * @param {string} [rec.title]    — 标题（可选，默认「思想汇报」）
 */
export function addThoughtReport({ personId, content, title }) {
  const person = getPersonById(personId);
  const rec = {
    id: 'tr_' + Date.now(),
    personId,
    personName: person?.name || personId,
    title: title || '思想汇报',
    content: (content || '').trim(),
    submittedAt: new Date().toISOString(),
  };
  mockDB.thoughtReports = [...loadThoughtReports(), rec];
  persist();
  // 自动广播（算法归档）：提交即入库 → 站内通知组织委员「系统已自动归档」，无需人工归档环节
  try {
    NoticeStore.add({
      title: '思想汇报已提交',
      content: `${rec.personName} 已提交思想汇报，系统已自动归档至其个人档案，可前往「发展数据」查看调用。`,
      priority: 'normal',
      targetUrl: 'workspace/org.html',
    });
  } catch (e) {
    console.warn('[thought-report] 提交通知失败（不影响归档）：', e);
  }
  return rec;
}

/**
 * 按人归集查询（算法归档的读取侧：给定个人档案 → 返回其全部思想汇报，按提交时间倒序）
 * @param {string} personId
 */
export function listThoughtReportsByPerson(personId) {
  return loadThoughtReports()
    .filter(r => r.personId === personId)
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
}

/** 某人的思想汇报提交数（供档案/列表角标） */
export function countThoughtReportsByPerson(personId) {
  return loadThoughtReports().filter(r => r.personId === personId).length;
}
