// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.image.js — 图片记录数据服务（localStorage 持久化）
//  提供 ImageRecordStore：图片的 CRUD + localStorage 持久化
//  使用独立 localStorage 键，避免 Base64 数据膨胀主 mockDB
//  Source: content/02_institution/sop/宣传委员工作流程指南.md#图片管理规则
// ════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'gsm1921-image-records';

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ImageRecordStore] 加载失败：', e);
    return [];
  }
}

function _save(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('[ImageRecordStore] 保存失败（可能超出 localStorage 配额）：', e);
  }
}

export const ImageRecordStore = {
  _records: null,

  init() {
    if (this._records === null) {
      this._records = _load();
    }
    return this._records;
  },

  list(filter = {}) {
    if (this._records === null) this.init();
    let result = [...this._records];

    if (filter.activityId) {
      result = result.filter(r => r.activityId === filter.activityId);
    }
    if (filter.date) {
      result = result.filter(r => r.date === filter.date);
    }

    // 按日期倒序（最新在前）
    result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return result;
  },

  add(record) {
    if (this._records === null) this.init();
    const newRecord = {
      id: record.id || 'img_' + Date.now(),
      date: record.date || new Date().toISOString().slice(0, 10),
      title: record.title || '未命名',
      subject: record.subject || '',
      activityId: record.activityId || '',
      base64: record.base64 || '',
      uploadedBy: record.uploadedBy || '当前用户',
      uploadedAt: new Date().toISOString(),
    };
    this._records = [...this._records, newRecord];
    _save(this._records);
    return newRecord;
  },

  remove(id) {
    if (this._records === null) this.init();
    const prev = this._records.length;
    this._records = this._records.filter(r => r.id !== id);
    if (this._records.length === prev) return false;
    _save(this._records);
    return true;
  },
};
