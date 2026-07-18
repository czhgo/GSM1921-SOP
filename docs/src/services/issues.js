﻿// role: [工程师]+[AI]
// issues.js — GitHub Issue 风格意见反馈数据服务
// 权威源 docs/data/issues.json + localStorage 个人草稿

import { AuthStore } from './auth.js';

const ISSUES_JSON_PATH = './data/issues.json';
const DRAFT_KEY = 'gsm1921-issue-drafts';
const CACHE_KEY = 'gsm1921-issue-cache';
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

  /** 书记设置 assignee */
  setAssignee(id, personId) {
    return this.editIssue(id, { assignee: personId });
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
