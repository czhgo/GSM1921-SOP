// role: [人机]
// ════════════════════════════════════════════════════════════════
//  activityRecord.js — 活动记录数据模型 v1.0
//  基于宣传专班多维表格字段设计
//  对应：宣传委员招募的宣传专班管理的共享文档多维表格
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ActivityRecord
 *
 * ┌──────┬──────────────────┬────────┬─────────────────────────┐
 * │ 字段  │ 名称              │ 类型   │ 说明                    │
 * ├──────┼──────────────────┼────────┼─────────────────────────┤
 * │ id   │ 唯一标识          │ string │ 自动生成 UUID           │
 * │ name │ 活动名称          │ string │ 如"光华管理学院应用经博..."│
 * │ theme│ 主题              │ string │ 如"党建+科研"/"抗战精神"  │
 * │ desc │ 活动描述          │ string │ 详细文字说明             │
 * │ link │ 活动推送链接      │ string │ 微信公众号文章 URL       │
 * │ date │ 活动时间          │ string │ ISO-8601 或 "2025/08/27"│
 * │ type │ 活动类型          │ string │ 见 ACTIVITY_TYPES 枚举   │
 * │ leaders| 出席领导        │ string[]| 领导姓名列表            │
 * │ leaderPhotos| 领导照片   │ string[]| 图片 URL 列表           │
 * │ filledBy| 填写人         │ string | 负责填写此条记录的人     │
 * │ workflowId| 关联工作流ID  │ string|null │ 关联的 WorkflowEngine 实例 ID │
 * │ status| 记录状态          │ string │ draft/published/archived │
 * │ createdAt| 创建时间       │ string │ ISO 时间戳              │
 * │ updatedAt| 更新时间       │ string │ ISO 时间戳              │
 * └──────┴──────────────────┴────────┴─────────────────────────┘
 */

// ════════════════════════════════════════════════════════════════
//  A. 活动类型枚举（来自截图实际值）
// ════════════════════════════════════════════════════════════════

export const ACTIVITY_TYPES = {
  '党日日-共建':    { category: 'party-day', label: '主题党日·共建' },
  '党日日-学习':    { category: 'party-day', label: '主题党日·学习' },
  '党日日-参访':    { category: 'party-day', label: '主题党日·参访' },
  '党日日-座谈':    { category: 'party-day', label: '主题党日·座谈' },
  '党日日-会议':    { category: 'party-day', label: '主题党日·会议' },
  '主题党日':       { category: 'theme',    label: '主题党日（通用）' },
  '党建+科研':      { category: 'theme',    label: '党建+科研' },
  '抗战精神':       { category: 'theme',    label: '抗战精神' },
  '习近平经济思想': { category: 'theme',    label: '习近平经济思想' },
  '二十大会精神':   { category: 'theme',    label: '二十大会精神' },
  '二十届历次全会精神':{category:'theme', label: '二十届历次全会精神' },
  '八项规定精神':   { category: 'theme',    label: '八项规定精神' },
  '十五五规划':     { category: 'theme',    label: '十五五规划' },
};

/**
 * 从截图中提取的活动类型选项列表（用于下拉选择）
 */
export const ACTIVITY_TYPE_OPTIONS = Object.keys(ACTIVITY_TYPES);

/**
 * 活动类型分类映射
 */
export const ACTIVITY_CATEGORIES = {
  'party-day': { label: '党日活动', types: ['党日日-共建','党日日-学习','党日日-参访','党日日-座谈','党日日-会议'] },
  'theme':     { label: '主题教育', types: ['主题党日','党建+科研','抗战精神','习近平经济思想','二十大会精神','二十届历次全会精神','八项规定精神','十五五规划'] },
};

// ════════════════════════════════════════════════════════════════
//  B. ActivityRecord 类
// ════════════════════════════════════════════════════════════════

export class ActivityRecord {
  constructor(data = {}) {
    this.id            = data.id || this._generateId();
    this.name          = data.name || '';
    this.theme         = data.theme || '';
    this.desc          = data.desc || '';
    this.link          = data.link || '';
    this.date          = data.date || '';
    this.type          = data.type || '';
    this.leaders        = Array.isArray(data.leaders) ? [...data.leaders] : [];
    this.leaderPhotos  = Array.isArray(data.leaderPhotos) ? [...data.leaderPhotos] : [];
    this.filledBy      = data.filledBy || '';
    this.workflowId    = data.workflowId || null;
    this.status        = data.status || 'draft';
    this.createdAt     = data.createdAt || new Date().toISOString();
    this.updatedAt     = new Date().toISOString();
  }

  _generateId() {
    return 'act-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /**
   * 更新字段并自动刷新 updatedAt
   */
  update(fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (key in this && key !== 'id' && key !== 'createdAt') {
        this[key] = value;
      }
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * 发布记录（draft → published）
   */
  publish() {
    if (this.status === 'archived') throw new Error('Cannot publish archived record');
    this.status = 'published';
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * 归档记录（published → archived）
   */
  archive() {
    this.status = 'archived';
    this.updatedAt = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      id: this.id, name: this.name, theme: this.theme,
      desc: this.desc, link: this.link, date: this.date,
      type: this.type, leaders: [...this.leaders],
      leaderPhotos: [...this.leaderPhotos], filledBy: this.filledBy,
      workflowId: this.workflowId, status: this.status,
      createdAt: this.createdAt, updatedAt: this.updatedAt,
    };
  }
}

// ════════════════════════════════════════════════════════════════
//  C. ActivityRecordStore — 内存存储（后续替换为持久化）
// ════════════════════════════════════════════════════════════════

/**
 * 简单内存存储，模拟多维表格。
 * 后续接入学校用户系统时，此层替换为真实数据库。
 */
export class ActivityRecordStore {
  constructor() {
    /** @type {Map<string, ActivityRecord>} */
    this.records = new Map();
  }

  create(data) {
    const record = new ActivityRecord(data);
    this.records.set(record.id, record);
    return record;
  }

  get(id) {
    return this.records.get(id) || null;
  }

  getAll(options = {}) {
    let result = [...this.records.values()];

    // 按 status 过滤
    if (options.status) result = result.filter(r => r.status === options.status);

    // 按 type 过滤
    if (options.type) result = result.filter(r => r.type === options.type);

    // 按 date 排序（默认降序，最新的在前）
    if (options.sortByDate !== false) {
      result.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }

    return result;
  }

  update(id, fields) {
    const record = this.records.get(id);
    if (!record) throw new Error(`Record not found: ${id}`);
    record.update(fields);
    return record;
  }

  delete(id) {
    return this.records.delete(id);
  }

  count() {
    return this.records.size;
  }

  /**
   * 搜索：按名称/主题/描述模糊匹配
   */
  search(query) {
    const q = query.toLowerCase();
    return [...this.records.values()].filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.theme.toLowerCase().includes(q) ||
      (r.desc && r.desc.toLowerCase().includes(q))
    );
  }

  /**
   * 批量导入（从多维表格 CSV/JSON 迁移）
   */
  importBatch(items) {
    const results = [];
    for (const item of items) {
      const record = this.create(item);
      results.push(record);
    }
    return results;
  }
}

// ════════════════════════════════════════════════════════════════
//  D. Mock 数据（基于截图中的 12 条真实记录）
// ════════════════════════════════════════════════════════════════

const MOCK_RECORDS = [
  { name: '光华管理学院应用经博党支部与...', theme: '党建+科研', desc: '', link: 'https://mp.weixin...', date: '2025/08/27', type: '党日日-共建', leaders: [], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '北大光华师生集体观看纪念中国...', theme: '抗战精神', desc: '', link: 'https://mp.weixin...', date: '2025/09/03', type: '党日日-学习', leaders: ['马化祥', '刘俏'], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '"纪念中国人民抗日战争暨世界反法...', theme: '抗战精神', desc: '', link: 'https://mp.weixin...', date: '2025/09/18', type: '党日日-学习', leaders: ['鞠晓'], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '九月支部大会', theme: '抗战精神', desc: '', link: 'https://mp.weixin...', date: '2025/09/21', type: '主题党日', leaders: [], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '北京大学光华管理学院的师生代表...', theme: '抗战精神', desc: '', link: 'https://mp.weixin...', date: '2025/10/01', type: '党日日-参访', leaders: [], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '光华党员说系列访谈：王其文——...', theme: '敦煌精神', desc: '', link: 'https://mp.weixin...', date: '2025/10/03', type: '党日日-座谈', leaders: [], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '2025-2026学年度第二次例会暨扩大...', theme: '二十大会精神和二十届历次全会精神', desc: '', link: 'https://mp.weixin...', date: '2025/10/17', type: '党日日-座谈', leaders: ['鞠晓'], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '"山河有道 沃土生花" 2025年暑期思...', theme: '习近平经济思想', desc: '', link: 'https://mp.weixin...', date: '2025/10/24', type: '党日日-参访', leaders: ['鞠晓', '王剑'], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '光华管理学院党委召开扩大会议专...', theme: '二十大会精神和二十届历次全会精神', desc: '', link: 'https://mp.weixin...', date: '2025/10/24', type: '党日日-座谈', leaders: ['马化祥', '鞠晓'], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '十月主题党日', theme: '八项规定精神', desc: '', link: 'https://mp.weixin...', date: '2025/10/26', type: '主题党日', leaders: [], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '光华职业发展分享会&荣膺AI校园公...', theme: '二十大会精神和二十届历次全会精神', desc: '', link: 'https://mp.weixin...', date: '2025/10/30', type: '党日日-参访', leaders: [], leaderPhotos: [], filledBy: '安佳晨' },
  { name: '党的二十届四中全会精神专题学习...', theme: '十五五规划', desc: '', link: 'https://mp.weixin...', date: '2025/10/31', type: '党日日-学习', leaders: [], leaderPhotos: [], filledBy: '梁宸菲' },
];

/**
 * 创建预填充了 mock 数据的 Store 实例。
 */
export function createStoreWithMockData() {
  const store = new ActivityRecordStore();
  store.importBatch(MOCK_RECORDS);
  return store;
}

// ════════════════════════════════════════════════════════════════
//  E. 视图权限：不同角色看到的数据范围
// ════════════════════════════════════════════════════════════════

/**
 * 根据角色过滤可见的活动记录。
 * 规则：
 * - participant/deep: 只看 published 的公开信息（隐藏内部字段）
 * - organizer: 看自己关联的 + 全部 published
 * - prop-commissioner: 全部可见 + 可编辑宣传相关字段
 * - disc-commissioner: 全部可见 + 可编辑考勤相关字段
 * - leader/secretary/global: 全部可见 + 可编辑全部字段
 */
export function filterRecordsByRole(store, role) {
  const all = store.getAll();

  switch (role) {
    case 'participant':
    case 'deep':
      return all
        .filter(r => r.status === 'published')
        .map(r => ({ ...r.toJSON(), workflowId: undefined, status: undefined }));

    case 'organizer':
      return all.filter(r =>
        r.status === 'published' ||
        r.filledBy === 'organizer' ||
        !!r.workflowId
      );

    case 'prop-commissioner':
      return all; // 宣传委员需要看到所有记录来统筹

    case 'disc-commissioner':
      return all; // 纪委需要看到所有记录来督办

    case 'leader':
    case 'secretary':
    case 'global':
    default:
      return all;
  }
}
