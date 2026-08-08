// role: [工程师]+[AI]
// feedback.js — 旧意见反馈服务（已弃用，保留 shim 兼容）
// 实际功能已迁移至 issues.js IssueStore
// 旧数据在 issues.js migrateFromFeedbackStore() 中自动迁移

import { IssueStore } from './issues.js?v=20260808i';

export const FeedbackStore = {
  /** @deprecated 使用 IssueStore.getAll() */
  getAll() {
    return IssueStore.getAll().map(i => ({
      id: i.id,
      scope: i.scope,
      scenarioName: '',
      painPointFile: i.title,
      painPointDetail: '',
      painPoint: '',
      proposedFix: i.body,
      submittedBy: i.submittedBy,
      submittedAt: i.submittedAt,
      status: i.status === 'closed' ? 'done' : 'pending',
      comments: (i.comments || []).map(c => ({
        text: c.body,
        author: c.author,
        date: c.createdAt,
      })),
    }));
  },

  /** @deprecated 使用 IssueStore.addDraft() */
  add(submission) {
    IssueStore.addDraft({
      type: 'new-issue',
      payload: {
        title: submission.painPointFile || '迁移的反馈',
        body: [submission.painPointDetail, submission.proposedFix].filter(Boolean).join('\n\n'),
        scope: submission.scope || 'scenario',
        types: ['bug'],
        submittedBy: submission.submittedBy || '匿名',
      },
    });
    return { id: 'shim-' + Date.now(), ...submission };
  },

  /** @deprecated 使用 IssueStore.countByStatus() */
  countByStatus() {
    const c = IssueStore.countByStatus();
    return { total: c.total, pending: c.open, processing: 0, done: c.closed };
  },

  getPending() {
    return this.getAll().filter(f => f.status === 'pending');
  },

  /** @deprecated */
  updateStatus(id, status) {
    console.warn('FeedbackStore.updateStatus is deprecated, use IssueStore.changeStatus');
  },

  /** @deprecated */
  addComment(id, text, author) {
    IssueStore.addDraft({
      type: 'comment',
      targetIssueId: id,
      payload: { body: text },
    });
    return null;
  },

  /** @deprecated */
  importAll(records) {
    // 旧 JSON 直接转为 issue 草稿
    let added = 0;
    records.forEach(r => {
      IssueStore.addDraft({
        type: 'new-issue',
        payload: {
          title: r.painPointFile || '导入的反馈',
          body: [r.painPointDetail, r.proposedFix].filter(Boolean).join('\n\n'),
          scope: r.scope || 'scenario',
          types: ['bug'],
          submittedBy: r.submittedBy || '匿名',
        },
      });
      added++;
    });
    return added;
  },

  /** @deprecated 使用 IssueStore.clearCache() */
  clearAll() {
    IssueStore.clearCache();
  },
};
