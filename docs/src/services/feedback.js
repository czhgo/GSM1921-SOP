// role: [人机]
// service.feedback.js — 意见反馈数据服务（localStorage 持久化）

const STORAGE_KEY = 'gsm1921-feedback-submissions';

export const FeedbackStore = {
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  add(submission) {
    const list = this.getAll();
    const record = {
      id: 'fb-' + Date.now(),
      scope: submission.scope || '',
      painPoint: submission.painPoint || '',
      proposedFix: submission.proposedFix || '',
      submittedBy: submission.submittedBy || '匿名',
      submittedAt: new Date().toISOString().slice(0, 10),
      status: 'pending',
    };
    list.push(record);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
    return record;
  },

  countByStatus() {
    const list = this.getAll();
    return {
      total: list.length,
      pending: list.filter(f => f.status === 'pending').length,
      processing: list.filter(f => f.status === 'processing').length,
      done: list.filter(f => f.status === 'done').length,
    };
  },

  getPending() {
    return this.getAll().filter(f => f.status === 'pending');
  },

  updateStatus(id, status) {
    const list = this.getAll();
    const item = list.find(f => f.id === id);
    if (item) item.status = status;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  },
};
