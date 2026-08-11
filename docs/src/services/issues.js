﻿﻿﻿// role: [工程师]+[AI]
// issues.js — GitHub Issue 风格意见反馈数据服务
// 权威源 docs/data/issues.json + localStorage 个人草稿

import { AuthStore } from './auth.js?v=20260811c';
import { PersonStore } from './person.js?v=20260811c';

/** 解析人员 ID → 姓名（反馈系统统一走 PersonStore 唯一解析源） */
function _displayName(id) {
  return id ? PersonStore.getName(id) : '';
}

const ISSUES_JSON_PATH = './data/issues.json';
const DRAFT_KEY = 'gsm1921-issue-drafts';
// 2026-07-30 v2：新增 dispatchHistory/comments.kind/hidden/mergedInto 字段，需重新加载 mock 数据
// 2026-08-01 v3：反馈数据长 ID（u_org_commissioner 等）统一改短 ID（u_org），强制清旧缓存重拉
const CACHE_KEY = 'gsm1921-issue-cache-v3';
const CACHE_VERSION_KEY = 'gsm1921-issue-cache-version';
const CACHE_VERSION = '3';
const MIGRATED_KEY = 'gsm1921-feedback-migrated';

let _issuesCache = null;

/** 获取当前登录用户 personId（plan 中为 AuthStore.getCurrentPersonId，修正为实际 API） */
function _currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || '匿名';
}

export const IssueStore = {
  /**
   * 从权威源加载所有 issue（带 localStorage 缓存）
   * @returns {Promise<Array>} issues 列表
   */
  async loadAll() {
    // 优先从内存缓存读
    if (_issuesCache) return _issuesCache;
    // 缓存版本检查：版本不匹配则丢弃旧缓存，强制从 issues.json 重新加载
    try {
      const cachedVer = localStorage.getItem(CACHE_VERSION_KEY);
      if (cachedVer !== CACHE_VERSION) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      }
    } catch {}
    // 其次从 localStorage 缓存读
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        _issuesCache = JSON.parse(cached);
        return _issuesCache;
      }
    } catch {}
    // 最后从 issues.json 拉取
    try {
      const resp = await fetch(ISSUES_JSON_PATH);
      const data = await resp.json();
      _issuesCache = data.issues || [];
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      return _issuesCache;
    } catch {
      _issuesCache = [];
      return _issuesCache;
    }
  },

  /** 同步读取（需先调用 loadAll） */
  getAll() {
    return _issuesCache || [];
  },

  /** 按 ID 获取 */
  getById(id) {
    return (_issuesCache || []).find(i => i.id === id);
  },

  /** 按 number 获取 */
  getByNumber(num) {
    return (_issuesCache || []).find(i => i.number === num);
  },

  /** 获取下一个可用 number */
  nextNumber() {
    const list = _issuesCache || [];
    return list.reduce((max, i) => Math.max(max, i.number || 0), 0) + 1;
  },

  /** 过滤 */
  filter({ status, scope, type, milestone, keyword } = {}) {
    let list = _issuesCache || [];
    if (status && status !== 'all') list = list.filter(i => i.status === status);
    if (scope && scope !== 'all') list = list.filter(i => i.scope === scope);
    if (type && type !== 'all') list = list.filter(i => (i.types || []).includes(type));
    if (milestone && milestone !== 'all') list = list.filter(i => i.milestone === milestone);
    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter(i =>
        (i.title || '').toLowerCase().includes(kw) ||
        (i.body || '').toLowerCase().includes(kw)
      );
    }
    return list;
  },

  /** 统计 */
  countByStatus() {
    const list = _issuesCache || [];
    return {
      total: list.length,
      open: list.filter(i => i.status === 'open').length,
      closed: list.filter(i => i.status === 'closed').length,
    };
  },

  // ── 草稿（localStorage）──

  /** 读取个人草稿 */
  getDrafts() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    } catch { return []; }
  },

  /** 添加草稿（新建/评论/反应都先进草稿） */
  addDraft(draft) {
    const list = this.getDrafts();
    const record = {
      draftId: 'dft-' + Date.now(),
      type: draft.type, // 'new-issue' | 'comment' | 'reaction'
      targetIssueId: draft.targetIssueId || null,
      payload: draft.payload,
      author: _currentPersonId(),
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'pending', // pending | approved | rejected
      reviewNote: null,
    };
    list.push(record);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(list)); } catch {}
    return record;
  },

  /** 书记审核通过：合并到 issues.json（实际操作：本地更新+提示书记保存文件） */
  approveDraft(draftId) {
    const drafts = this.getDrafts();
    const d = drafts.find(x => x.draftId === draftId);
    if (!d) return null;
    d.status = 'approved';
    d.reviewNote = 'approved by secretary';
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch {}

    // 应用到本地缓存（模拟"合并到 issues.json"）
    if (d.type === 'new-issue') {
      const issue = {
        ...d.payload,
        id: 'issue-' + Date.now(),
        number: this.nextNumber(),
        status: 'open',
        closedReason: null,
        closedAt: null,
        submittedAt: new Date().toISOString().slice(0, 10),
        reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
        mentions: [],
        references: [],
        comments: [],
        participants: [d.author],
        commentCount: 0,
      };
      _issuesCache = _issuesCache || [];
      _issuesCache.push(issue);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      return issue;
    }
    if (d.type === 'comment') {
      const issue = this.getById(d.targetIssueId);
      if (issue) {
        issue.comments.push({
          id: 'cmt-' + Date.now(),
          author: d.author,
          body: d.payload.body,
          createdAt: new Date().toISOString().slice(0, 10),
          hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
        });
        if (!issue.participants.includes(d.author)) issue.participants.push(d.author);
        issue.commentCount = (issue.commentCount || 0) + 1;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      }
    }
    if (d.type === 'reaction') {
      const issue = this.getById(d.targetIssueId);
      if (issue) {
        const list = issue.reactions[d.payload.type] || [];
        if (!list.includes(d.author)) list.push(d.author);
        issue.reactions[d.payload.type] = list;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      }
    }
    return d;
  },

  /** 书记驳回 */
  rejectDraft(draftId, reason) {
    const drafts = this.getDrafts();
    const d = drafts.find(x => x.draftId === draftId);
    if (!d) return null;
    d.status = 'rejected';
    d.reviewNote = reason;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch {}
    return d;
  },

  // ── 书记专属操作（直接修改缓存，需书记手动同步到 issues.json） ──

  /** 书记改状态 */
  changeStatus(id, status, closedReason = null) {
    const issue = this.getById(id);
    if (!issue) return null;
    issue.status = status;
    if (status === 'closed') {
      issue.closedReason = closedReason || 'completed';
      issue.closedAt = new Date().toISOString().slice(0, 10);
    } else {
      issue.closedReason = null;
      issue.closedAt = null;
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  /** 书记软隐藏评论 */
  hideComment(issueId, commentId, reason) {
    const issue = this.getById(issueId);
    if (!issue) return null;
    const c = (issue.comments || []).find(c => c.id === commentId);
    if (!c) return null;
    c.hidden = true;
    c.hiddenBy = _currentPersonId();
    c.hiddenReason = reason;
    c.hiddenAt = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  /** 书记编辑 issue */
  editIssue(id, updates) {
    const issue = this.getById(id);
    if (!issue) return null;
    Object.assign(issue, updates);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  /** 书记设置 assignee（旧接口，保留兼容；新代码用 assignIssue） */
  setAssignee(id, personId) {
    return this.editIssue(id, { assignee: personId });
  },

  // ── 2026-07-30 新增：反馈分发与处置（spec §3.1） ──────────────

  /**
   * 书记指派反馈给某人
   * @param {string} issueId
   * @param {string} assigneeId   被指派人 personId（如 'u_org'）
   * @param {string} assigneeRole 被指派人角色键（'org-commissioner' | 'leader' | 'secretary' | ...）
   * @param {string} note         指派备注（可选）
   * @returns {Object|null} 更新后的 issue
   */
  assignIssue(issueId, assigneeId, assigneeRole, note = '') {
    const issue = this.getById(issueId);
    if (!issue) return null;
    const prevAssignee = issue.assignee || null;
    const by = _currentPersonId();
    const at = new Date().toISOString().slice(0, 10);
    issue.assignee = assigneeId;
    issue.assigneeRole = assigneeRole || null;
    // 指派历史时间线
    if (!Array.isArray(issue.dispatchHistory)) issue.dispatchHistory = [];
    issue.dispatchHistory.push({ from: prevAssignee, to: assigneeId, by, at, note });
    // 同时作为评论时间线的一条 kind='dispatch' 事件
    if (!Array.isArray(issue.comments)) issue.comments = [];
    issue.comments.push({
      id: 'cmt-' + Date.now(),
      author: by,
      authorRole: 'secretary',
      body: note ? `指派给 ${assigneeRole || assigneeId}：${note}` : `指派给 ${assigneeRole || assigneeId}`,
      createdAt: at,
      kind: 'dispatch',
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    issue.commentCount = (issue.commentCount || 0) + 1;
    if (!issue.participants.includes(by)) issue.participants.push(by);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    // 触发通知：被指派人工作台「我的处置」Tab 角标 +1
    if (assigneeId && assigneeId !== by) {
      IssueNotify.markUnread(assigneeId, issueId);
    }
    return issue;
  },

  /**
   * 添加评论 / 批复 / 处置结果
   * @param {string} issueId
   * @param {string} author       personId
   * @param {string} authorRole   角色键
   * @param {string} body         正文
   * @param {string} kind         'comment' | 'verdict' | 'dispatch' | 'result'
   * @returns {Object|null} 更新后的 issue
   */
  addComment(issueId, author, authorRole, body, kind = 'comment') {
    const issue = this.getById(issueId);
    if (!issue) return null;
    if (!Array.isArray(issue.comments)) issue.comments = [];
    const at = new Date().toISOString().slice(0, 10);
    issue.comments.push({
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      author,
      authorRole: authorRole || null,
      body,
      createdAt: at,
      kind,
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    issue.commentCount = (issue.commentCount || 0) + 1;
    if (!issue.participants.includes(author)) issue.participants.push(author);
    // 处置结果提交后，标记 issue 为「待终审」（resultPending=true），等待书记关闭
    if (kind === 'result') {
      issue.resultPending = true;
      issue.resultSubmittedAt = at;
      // 触发书记工作台「待终审」高亮
      IssueNotify.markSecretaryReviewPending(issueId);
    }
    // 正式答复发回：通知汇报人（发回回路，汇报人「我的处置」角标 +1）
    if (kind === 'reply') {
      const recipient = issue.submittedBy;
      if (recipient && recipient !== author) {
        IssueNotify.markUnread(recipient, issueId);
      }
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  /**
   * 书记关闭反馈
   * @param {string} issueId
   * @param {string} reason  'completed' | 'duplicate' | 'wontfix' | 'not_planned'
   * @param {string} note    关闭备注（可选）
   */
  closeIssue(issueId, reason = 'completed', note = '') {
    const issue = this.getById(issueId);
    if (!issue) return null;
    issue.status = 'closed';
    issue.closedReason = reason;
    issue.closedAt = new Date().toISOString().slice(0, 10);
    issue.resultPending = false;
    // 关闭后清除「待终审」未读标记
    IssueNotify.markSecretaryReviewRead(issueId);
    if (note) {
      // 关闭备注作为 verdict 评论记录
      this.addComment(issueId, _currentPersonId(), 'secretary', `关闭反馈（${reason}）：${note}`, 'verdict');
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  /** 书记重新开放 */
  reopenIssue(issueId) {
    const issue = this.getById(issueId);
    if (!issue) return null;
    issue.status = 'open';
    issue.closedReason = null;
    issue.closedAt = null;
    issue.resultPending = false;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  // ── 2026-08-10 新增：工作汇报闭环（kind='report'） ────────────

  /**
   * 成员主动发起工作汇报（发往书记；三类：进度/卡点/请示）
   * @param {{ category: 'progress'|'blocked'|'ask', body: string }} params
   * @returns {Object|null} 新建的汇报 issue
   */
  submitReport({ category = 'progress', body = '' } = {}) {
    if (!body.trim()) return null;
    const by = _currentPersonId();
    const now = new Date().toISOString().slice(0, 10);
    const issue = {
      id: 'report-' + Date.now(),
      number: this.nextNumber(),
      title: `【${REPORT_CATEGORIES[category] || '进度'}汇报】`,
      body: body.trim(),
      kind: 'report',
      reportCategory: category,
      scope: 'report',
      types: [category],
      status: 'open',
      closedReason: null,
      closedAt: null,
      submittedBy: by,
      submittedAt: now,
      assignee: null, // 未指派 → 默认发往书记待答复
      assigneeRole: null,
      dispatchHistory: [],
      comments: [],
      participants: [by],
      commentCount: 0,
      reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
      mentions: [],
      references: [],
      resultPending: false,
    };
    _issuesCache = _issuesCache || [];
    _issuesCache.push(issue);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    // 书记"待答复"高亮（复用 secretary-review 未读通道）
    IssueNotify.markSecretaryReviewPending(issue.id);
    return issue;
  },

  /**
   * 书记"了解进展"：请某人就某事项汇报（温和请求，界面措辞不用"要求"）
   * @param {string} targetPersonId — 被请汇报人 personId
   * @param {string} targetRole      — 被请汇报人角色键
   * @param {string} note            — 请汇报事项（选填）
   * @returns {Object|null} 新建的请求 issue
   */
  requestReport(targetPersonId, targetRole = null, note = '') {
    if (!targetPersonId) return null;
    const by = _currentPersonId();
    const now = new Date().toISOString().slice(0, 10);
    const noteText = (note || '').trim();
    const issue = {
      id: 'report-req-' + Date.now(),
      number: this.nextNumber(),
      title: noteText ? `了解进展：${noteText}` : '了解进展：请同步当前进度',
      body: noteText || '请同步当前进度',
      kind: 'report',
      reportCategory: 'progress',
      scope: 'report',
      types: ['request'],
      status: 'open',
      closedReason: null,
      closedAt: null,
      submittedBy: by,       // 书记发起
      requestedBy: by,       // 标记"了解进展"来源
      requestedAt: now,
      requestedNote: noteText,
      assignee: targetPersonId,
      assigneeRole: targetRole || null,
      dispatchHistory: [{ from: null, to: targetPersonId, by, at: now, note: noteText || '了解进展' }],
      comments: [],
      participants: [by, targetPersonId],
      commentCount: 0,
      reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
      mentions: [],
      references: [],
      resultPending: false,
    };
    _issuesCache = _issuesCache || [];
    _issuesCache.push(issue);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    // 被请汇报人工作台「我的处置」角标 +1
    IssueNotify.markUnread(targetPersonId, issue.id);
    return issue;
  },

  /** 汇报人确认已收到答复 → 关闭闭环 */
  confirmReport(issueId) {
    const issue = this.getById(issueId);
    if (!issue) return null;
    if (!Array.isArray(issue.comments)) issue.comments = [];
    issue.comments.push({
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      author: _currentPersonId(),
      authorRole: null,
      body: '已收到答复',
      createdAt: new Date().toISOString().slice(0, 10),
      kind: 'verdict',
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    issue.status = 'closed';
    issue.closedReason = 'completed';
    issue.closedAt = new Date().toISOString().slice(0, 10);
    issue.resultPending = false;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return issue;
  },

  /** 我发起的汇报（全部状态） */
  getMyReports(userId) {
    return (_issuesCache || []).filter(i =>
      i.kind === 'report' && i.submittedBy === userId && !i.hidden && !i.mergedInto
    );
  },

  /** 书记请我汇报、尚未提交的请求 */
  getReportRequestsFor(userId) {
    return (_issuesCache || []).filter(i =>
      i.kind === 'report' && i.requestedBy && i.assignee === userId &&
      i.status === 'open' && !i.hidden && !i.mergedInto
    );
  },

  /** 书记待答复/待终审的汇报（开放中，含成员主动汇报与请求后的回应） */
  getSecretaryPendingReports() {
    return (_issuesCache || []).filter(i =>
      i.kind === 'report' && i.status === 'open' && !i.hidden && !i.mergedInto
    );
  },

  /** 某人发起的全部汇报（含已关闭，供条线知情视角——组长看本组组员汇报状态） */
  getReportsBySubmitter(personId) {
    return (_issuesCache || []).filter(i =>
      i.kind === 'report' && i.submittedBy === personId && !i.hidden && !i.mergedInto
    );
  },

  /** 书记隐藏反馈（不在公开列表显示） */
  hideIssue(issueId) {
    return this.editIssue(issueId, { hidden: true });
  },

  /** 书记取消隐藏 */
  unhideIssue(issueId) {
    return this.editIssue(issueId, { hidden: false });
  },

  /**
   * 书记合并反馈：将 sourceId 合并到 targetId
   * - source 标记 mergedInto=targetId 并隐藏
   * - target 评论时间线追加一条 merge 事件
   */
  mergeIssue(sourceId, targetId) {
    const source = this.getById(sourceId);
    const target = this.getById(targetId);
    if (!source || !target) return null;
    source.mergedInto = targetId;
    source.hidden = true;
    source.status = 'closed';
    source.closedReason = 'duplicate';
    source.closedAt = new Date().toISOString().slice(0, 10);
    if (!Array.isArray(target.comments)) target.comments = [];
    target.comments.push({
      id: 'cmt-merge-' + Date.now(),
      author: _currentPersonId(),
      authorRole: 'secretary',
      body: `合并自 #${source.number || source.id}：${source.title || ''}`,
      createdAt: new Date().toISOString().slice(0, 10),
      kind: 'verdict',
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    target.commentCount = (target.commentCount || 0) + 1;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    return { source, target };
  },

  /** 被指派给某人的反馈（开放中） */
  getAssignedTo(userId) {
    return (_issuesCache || []).filter(i =>
      i.assignee === userId && i.status === 'open' && !i.hidden && !i.mergedInto
    );
  },

  /** 被指派给某角色的反馈（开放中） */
  getAssignedToRole(role) {
    return (_issuesCache || []).filter(i =>
      i.assigneeRole === role && i.status === 'open' && !i.hidden && !i.mergedInto
    );
  },

  /** 书记设置 milestone */
  setMilestone(id, milestoneId) {
    return this.editIssue(id, { milestone: milestoneId });
  },

  /** 导出为 JSON（供书记手动同步到 issues.json） */
  exportJSON() {
    return JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString().slice(0, 10),
      issues: _issuesCache || [],
    }, null, 2);
  },

  // ── 旧数据迁移 ──

  /** 从 FeedbackStore 旧数据迁移 */
  migrateFromFeedbackStore() {
    if (localStorage.getItem(MIGRATED_KEY)) return 0;
    try {
      const raw = localStorage.getItem('gsm1921-feedback-submissions');
      if (!raw) { localStorage.setItem(MIGRATED_KEY, '1'); return 0; }
      const oldList = JSON.parse(raw);
      _issuesCache = _issuesCache || [];
      let added = 0;
      oldList.forEach((f, i) => {
        const newIssue = {
          id: f.id || ('issue-migrated-' + i),
          number: this.nextNumber(),
          title: f.painPointFile || f.scenarioName || '迁移的反馈 #' + (i + 1),
          body: [f.painPointDetail, f.proposedFix].filter(Boolean).join('\n\n'),
          scope: f.scope || 'scenario',
          types: ['bug'],
          status: f.status === 'done' ? 'closed' : 'open',
          closedReason: f.status === 'done' ? 'completed' : null,
          closedAt: f.status === 'done' ? f.submittedAt : null,
          submittedBy: f.submittedBy || '匿名',
          submittedAt: f.submittedAt || new Date().toISOString().slice(0, 10),
          assignee: null,
          milestone: null,
          reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
          mentions: [],
          references: [],
          comments: (f.comments || []).map((c, ci) => ({
            id: 'cmt-migrated-' + i + '-' + ci,
            author: c.author || '匿名',
            body: c.text || '',
            createdAt: c.date || f.submittedAt,
            hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
          })),
          participants: [f.submittedBy, ...(f.comments || []).map(c => c.author)].filter(Boolean),
          commentCount: (f.comments || []).length,
        };
        _issuesCache.push(newIssue);
        added++;
      });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache));
        localStorage.setItem(MIGRATED_KEY, '1');
        // 归一：迁移完成后清理旧键，避免历史提交数据残留污染（P2）
        localStorage.removeItem('gsm1921-feedback-submissions');
      } catch {}
      return added;
    } catch { return 0; }
  },

  /** 清除缓存（开发调试用） */
  clearCache() {
    _issuesCache = null;
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  },
};

// ════════════════════════════════════════════════════════════════
//  工作汇报（Report）——复用 Issue 结构，kind='report'
//  与意见反馈（kind 缺省/'feedback'）同源同库，UI 以 kind 分流。
//  分类（书记 2026-08-10 裁定）：进度 / 卡点 / 请示
//  "了解进展"请求：书记主动请人汇报（requestedBy/requestedAt/requestedNote），
//  界面措辞刻意避开"要求"二字（书记裁定），以温和请求语义呈现。
// ════════════════════════════════════════════════════════════════

export const REPORT_CATEGORIES = {
  progress: '进度',
  blocked:  '卡点',
  ask:      '请示',
};

// ════════════════════════════════════════════════════════════════
//  派生显示状态（UI 层使用，数据层不存储）
//  根据 status / assignee / resultPending 派生「开放中 / 已指派 / 处置中 / 待终审 / 已关闭」
// ════════════════════════════════════════════════════════════════

/**
 * 计算反馈的派生显示状态
 * @param {Object} issue
 * @returns {{ key: string, label: string, badgeClass: string }}
 */
export function deriveIssueDisplayState(issue) {
  if (!issue) return { key: 'unknown', label: '未知', badgeClass: 'bg-gray-100 text-gray-500' };
  if (issue.status === 'closed') {
    return { key: 'closed', label: '已关闭', badgeClass: 'bg-gray-100 text-gray-600' };
  }
  // 工作汇报分支（kind='report'）
  if (issue.kind === 'report') {
    // 书记"了解进展"请求、成员尚未回应 → 待汇报
    if (issue.requestedBy && !issue.resultPending) {
      return { key: 'to-report', label: '待汇报', badgeClass: 'bg-blue-100 text-blue-700' };
    }
    // 成员已提交汇报内容，等待书记答复 → 待答复
    if (issue.resultPending) {
      return { key: 'pending-review', label: '待答复', badgeClass: 'bg-amber-100 text-amber-700' };
    }
    return { key: 'open', label: '进行中', badgeClass: 'bg-green-100 text-green-700' };
  }
  // 开放中分支（意见反馈）
  if (issue.resultPending) {
    return { key: 'pending-review', label: '待终审', badgeClass: 'bg-amber-100 text-amber-700' };
  }
  if (issue.assignee) {
    // 有指派人，且评论时间线中存在 kind='result' 但 resultPending 还未触发（理论上不会）— 简化为「处置中」
    const hasResult = (issue.comments || []).some(c => c.kind === 'result');
    if (hasResult) {
      return { key: 'pending-review', label: '待终审', badgeClass: 'bg-amber-100 text-amber-700' };
    }
    return { key: 'assigned', label: '已指派', badgeClass: 'bg-blue-100 text-blue-700' };
  }
  return { key: 'open', label: '开放中', badgeClass: 'bg-green-100 text-green-700' };
}

/** 通知未读计数（按被指派人 personId 维度，localStorage 标记） */
const UNREAD_KEY_PREFIX = 'gsm1921-issue-unread-';

export const IssueNotify = {
  /** 标记某条指派为未读（被指派人维度） */
  markUnread(assigneeId, issueId) {
    try {
      const key = UNREAD_KEY_PREFIX + assigneeId;
      const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
      set.add(issueId);
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {}
  },
  /** 标记已读 */
  markRead(assigneeId, issueId) {
    try {
      const key = UNREAD_KEY_PREFIX + assigneeId;
      const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
      set.delete(issueId);
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {}
  },
  /** 获取未读反馈 ID 列表 */
  getUnread(assigneeId) {
    try {
      return JSON.parse(localStorage.getItem(UNREAD_KEY_PREFIX + assigneeId) || '[]');
    } catch { return []; }
  },
  /** 获取未读数 */
  getUnreadCount(assigneeId) {
    return this.getUnread(assigneeId).length;
  },
  /** 标记某 issue 为「待终审」未读（书记维度） */
  markSecretaryReviewPending(issueId) {
    try {
      const set = new Set(JSON.parse(localStorage.getItem(UNREAD_KEY_PREFIX + 'secretary-review') || '[]'));
      set.add(issueId);
      localStorage.setItem(UNREAD_KEY_PREFIX + 'secretary-review', JSON.stringify([...set]));
    } catch {}
  },
  markSecretaryReviewRead(issueId) {
    try {
      const set = new Set(JSON.parse(localStorage.getItem(UNREAD_KEY_PREFIX + 'secretary-review') || '[]'));
      set.delete(issueId);
      localStorage.setItem(UNREAD_KEY_PREFIX + 'secretary-review', JSON.stringify([...set]));
    } catch {}
  },
  getSecretaryReviewUnread() {
    try {
      return JSON.parse(localStorage.getItem(UNREAD_KEY_PREFIX + 'secretary-review') || '[]');
    } catch { return []; }
  },
};

// ════════════════════════════════════════════════════════════════
//  「我的处置」Tab 渲染工具（各角色工作台复用）
//  2026-07-30 新增：被指派人视角的反馈列表+详情+评论/提交处置结果
// ════════════════════════════════════════════════════════════════

/**
 * 渲染「我的处置」Tab 内容
 * @param {string} role 角色键（如 'org-commissioner'）
 * @param {string} userId 被指派人 personId（如 'u_org'）
 * @returns {string} HTML
 */
export function renderMyDispatchTab(role, userId) {
  // 书记规则（2026-08-01）：带时间字段的列示按提交时间倒序（最新在前）
  const issues = IssueStore.getAssignedTo(userId)
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  const unread = IssueNotify.getUnread(userId);

  // 标记全部已读
  unread.forEach(id => IssueNotify.markRead(userId, id));

  // ── 我的汇报（2026-08-10 新增，书记裁定：信息双向互动）──
  const reportRequests = IssueStore.getReportRequestsFor(userId); // 书记"了解进展"请我汇报
  const myReports = IssueStore.getMyReports(userId)
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  let html = `<div class="space-y-3">`;

  // ① 上级"了解进展"请求（待我汇报，行内填写即发；发起人可能是书记或组长）
  if (reportRequests.length) {
    const requesterName = _displayName(reportRequests[0].requestedBy) || '上级';
    html += `<div class="rounded-xl border border-blue-200 bg-blue-50/40 p-3">`;
    html += `<p class="text-xs font-medium text-blue-700 mb-2">${requesterName}请汇报 · ${reportRequests.length}</p>`;
    reportRequests.forEach(r => {
      html += `<div class="rounded-lg bg-white border border-blue-100 p-3 mb-2">`;
      html += `<p class="text-sm font-medium text-gray-800">${r.title}</p>`;
      if (r.body && r.body !== r.title) html += `<p class="text-xs text-gray-600 mt-1">${r.body}</p>`;
      html += `<div class="flex gap-2 mt-2">`;
      html += `<input type="text" id="report-req-input-${r.id}" class="input-flat text-xs flex-1" placeholder="填写汇报内容…">`;
      html += `<button data-mydispatch-action="submit-report" data-issue-id="${r.id}" class="text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex-shrink-0">汇报</button>`;
      html += `</div></div>`;
    });
    html += `</div>`;
  }

  // ② 我发起的汇报（追踪 + 详情 + 确认收到）
  if (myReports.length) {
    html += `<div class="rounded-xl border border-gray-100 bg-white p-3">`;
    html += `<p class="text-xs font-medium text-gray-700 mb-2">我发起的汇报 · ${myReports.length}</p>`;
    myReports.forEach(r => {
      const ds = deriveIssueDisplayState(r);
      html += `<div class="flex items-center gap-2 py-1.5 px-1 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" data-mydispatch-action="open-report" data-issue-id="${r.id}">`;
      html += `<span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
      html += `<span class="text-xs text-gray-400">${REPORT_CATEGORIES[r.reportCategory] || '进度'}</span>`;
      html += `<span class="text-sm text-gray-800 flex-1 min-w-0 truncate">${r.title}</span>`;
      html += `<span class="text-xs text-gray-400 flex-shrink-0">${r.submittedAt}</span>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // ③ 指派给我的反馈（原有）
  html += `<p class="text-xs text-gray-500">指派给你的开放反馈，可评论或提交处置结果</p>`;

  if (issues.length === 0) {
    html += `<p class="text-xs text-gray-400 text-center py-4">暂无待处置反馈</p>`;
  } else {
    issues.forEach(issue => {
      const ds = deriveIssueDisplayState(issue);
      const dispatchNote = (issue.dispatchHistory || []).find(d => d.to === userId);
      html += `<div class="p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 cursor-pointer transition-all" data-mydispatch-action="open" data-issue-id="${issue.id}">`;
      html += `<div class="flex items-center justify-between mb-1">`;
      html += `<span class="text-xs text-gray-400 font-mono">#${issue.number}</span>`;
      html += `<span class="text-xs px-1.5 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
      html += `</div>`;
      html += `<p class="text-sm text-gray-800 font-medium">${issue.title}</p>`;
      if (dispatchNote?.note) {
        html += `<p class="text-xs text-blue-600 mt-1">书记备注：${dispatchNote.note}</p>`;
      }
      html += `<div class="text-xs text-gray-400 mt-1">${_displayName(issue.submittedBy)} · ${issue.submittedAt} · ${issue.commentCount || 0} 评论</div>`;
      html += `</div>`;
    });
  }

  html += `</div>`;
  html += `<div id="mydispatch-detail" class="hidden"></div>`;
  return html;
}

/** 重渲染「我的处置」Tab（汇报/评论动作后调用） */
function _rerenderMyDispatch(container, role, userId) {
  if (!container) return;
  container.innerHTML = renderMyDispatchTab(role, userId);
  bindMyDispatchEvents(container, role, userId);
}

/**
 * 绑定「我的处置」Tab 事件（在 tab 内容渲染后调用）
 */
export function bindMyDispatchEvents(container, role, userId) {
  container.querySelectorAll('[data-mydispatch-action="open"]').forEach(el => {
    el.addEventListener('click', () => {
      _renderMyDispatchDetail(el.dataset.issueId, role, userId, container);
    });
  });
  // 我发起的汇报 → 详情（含确认收到）
  container.querySelectorAll('[data-mydispatch-action="open-report"]').forEach(el => {
    el.addEventListener('click', () => {
      _renderMyReportDetail(el.dataset.issueId, role, userId, container);
    });
  });
  // 书记"了解进展"请求 → 行内填写汇报内容即发
  container.querySelectorAll('[data-mydispatch-action="submit-report"]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.issueId;
      const body = document.getElementById('report-req-input-' + id)?.value?.trim();
      if (!body) { showToast('error', '请填写汇报内容'); return; }
      IssueStore.addComment(id, userId, role, body, 'result');
      showToast('success', '汇报已发出，等待书记答复');
      _rerenderMyDispatch(container, role, userId);
    });
  });
}

/** 我的汇报详情（对话时间线 + 书记答复确认收到） */
function _renderMyReportDetail(issueId, role, userId, container) {
  const detailEl = container.querySelector('#mydispatch-detail');
  if (!detailEl) return;
  const issue = IssueStore.getById(issueId);
  if (!issue) return;
  IssueNotify.markRead(userId, issueId);
  const ds = deriveIssueDisplayState(issue);
  const hasReply = (issue.comments || []).some(c => c.kind === 'reply');

  let html = `<div class="card rounded-2xl p-6">`;
  html += `<button data-mydispatch-action="back" class="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4">← 返回列表</button>`;
  html += `<div class="flex items-center gap-2 mb-2">`;
  html += `<h3 class="text-base font-semibold text-gray-800">${issue.title}</h3>`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  html += `</div>`;
  if (issue.body) html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>${REPORT_CATEGORIES[issue.reportCategory] || '进度'}汇报</span>`;
  html += `<span>发出：${issue.submittedAt}</span>`;
  if (issue.closedAt) html += `<span>已闭环：${issue.closedAt}</span>`;
  html += `</div>`;

  // 对话时间线（kind 含 reply 正式答复）
  html += `<div class="mb-4"><span class="text-xs font-medium text-gray-700 block mb-3">对话</span><div class="space-y-2">`;
  const comments = (issue.comments || []).filter(c => !c.hidden);
  if (!comments.length) {
    html += `<p class="text-xs text-gray-400">暂无对话，等待书记答复</p>`;
  } else {
    comments.forEach(c => {
      const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'reply' ? '答' : c.kind === 'verdict' ? '★' : '';
      const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'reply' ? 'bg-red-50/70' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
      html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
      html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${_displayName(c.author)}</span>`;
      if (c.kind === 'reply') {
        html += `<span class="text-xs px-1 py-0.5 rounded font-medium" style="background:var(--app-accent-bg,rgba(185,28,28,0.1));color:var(--app-accent,#B91C1C);">正式答复</span>`;
      }
      html += `<span class="text-xs text-gray-400 ml-1">${c.createdAt}</span>`;
      html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
    });
  }
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100 space-y-2">`;
    if (hasReply) {
      html += `<button data-mydispatch-action="confirm-received" class="text-xs px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">确认已收到答复</button>`;
    }
    html += `<div class="flex gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-mydispatch-action="comment" class="text-xs px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors">评论</button>`;
    html += `</div></div>`;
  }
  html += `</div>`;

  detailEl.innerHTML = html;
  detailEl.classList.remove('hidden');
  const listDiv = detailEl.previousElementSibling;
  if (listDiv) listDiv.classList.add('hidden');

  detailEl.querySelectorAll('[data-mydispatch-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mydispatchAction;
      if (action === 'back') {
        detailEl.classList.add('hidden');
        if (listDiv) listDiv.classList.remove('hidden');
      } else if (action === 'comment') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入评论内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'comment');
        showToast('success', '评论已添加');
        _renderMyReportDetail(issueId, role, userId, container);
      } else if (action === 'confirm-received') {
        IssueStore.confirmReport(issueId);
        showToast('success', '已确认收到，汇报闭环完成');
        _rerenderMyDispatch(container, role, userId);
      }
    });
  });
}

function _renderMyDispatchDetail(issueId, role, userId, container) {
  const detailEl = container.querySelector('#mydispatch-detail');
  if (!detailEl) return;
  const issue = IssueStore.getById(issueId);
  if (!issue) return;
  IssueNotify.markRead(userId, issueId);
  const ds = deriveIssueDisplayState(issue);

  let html = `<div class="card rounded-2xl p-6">`;
  html += `<button data-mydispatch-action="back" class="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mb-4">← 返回列表</button>`;
  html += `<div class="flex items-center gap-2 mb-2">`;
  html += `<h3 class="text-base font-semibold text-gray-800">${issue.title}</h3>`;
  html += `<span class="text-xs px-2 py-0.5 rounded-full ${ds.badgeClass}">${ds.label}</span>`;
  html += `</div>`;
  if (issue.body) html += `<p class="text-sm text-gray-600 whitespace-pre-wrap mb-4">${issue.body}</p>`;
  html += `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-4 pb-4 border-b border-gray-100">`;
  html += `<span>#${issue.number}</span><span>提交人：${_displayName(issue.submittedBy)}</span><span>提交时间：${issue.submittedAt}</span>`;
  html += `</div>`;

  // 指派历史
  if (issue.dispatchHistory?.length) {
    html += `<div class="mb-4 pb-4 border-b border-gray-100">`;
    html += `<span class="text-xs font-medium text-gray-700 block mb-2">指派历史</span><div class="space-y-1">`;
    issue.dispatchHistory.forEach(d => {
      html += `<div class="text-xs text-gray-500">● ${d.at} · ${_displayName(d.to)}${d.note ? '：' + d.note : ''}</div>`;
    });
    html += `</div></div>`;
  }

  // 评论时间线
  html += `<div class="mb-4"><span class="text-xs font-medium text-gray-700 block mb-3">评论与事件</span><div class="space-y-2">`;
  (issue.comments || []).forEach(c => {
    if (c.hidden) return;
    const kindIcon = c.kind === 'dispatch' ? '→' : c.kind === 'result' ? '✓' : c.kind === 'verdict' ? '★' : '';
    const kindBg = c.kind === 'dispatch' ? 'bg-blue-50' : c.kind === 'result' ? 'bg-green-50' : c.kind === 'verdict' ? 'bg-amber-50' : 'bg-gray-50';
    html += `<div class="rounded-lg p-2.5 ${kindBg}">`;
    html += `<span class="text-xs font-medium text-gray-700">${kindIcon} ${_displayName(c.author)}</span>`;
    html += `<span class="text-xs text-gray-400 ml-1">${c.createdAt}</span>`;
    html += `<p class="text-xs text-gray-600 mt-0.5">${c.body}</p></div>`;
  });
  html += `</div></div>`;

  if (issue.status === 'open') {
    html += `<div class="pt-3 border-t border-gray-100"><div class="flex gap-2">`;
    html += `<input type="text" id="mydispatch-comment-input" class="input-flat text-xs flex-1" placeholder="添加评论…">`;
    html += `<button data-mydispatch-action="comment" class="text-xs px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors">评论</button>`;
    html += `<button data-mydispatch-action="submit-result" class="text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">提交处置结果</button>`;
    html += `</div></div>`;
  }
  html += `</div>`;

  detailEl.innerHTML = html;
  detailEl.classList.remove('hidden');
  const listDiv = detailEl.previousElementSibling;
  if (listDiv) listDiv.classList.add('hidden');

  detailEl.querySelectorAll('[data-mydispatch-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.mydispatchAction;
      if (action === 'back') {
        detailEl.classList.add('hidden');
        if (listDiv) listDiv.classList.remove('hidden');
      } else if (action === 'comment') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入评论内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'comment');
        showToast('success', '评论已添加');
        _renderMyDispatchDetail(issueId, role, userId, container);
      } else if (action === 'submit-result') {
        const body = document.getElementById('mydispatch-comment-input')?.value?.trim();
        if (!body) { showToast('error', '请输入处置结果内容'); return; }
        IssueStore.addComment(issueId, userId, role, body, 'result');
        showToast('success', '处置结果已提交，等待书记终审');
        _renderMyDispatchDetail(issueId, role, userId, container);
      }
    });
  });
}
