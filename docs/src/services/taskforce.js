// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.taskforce.js — 专班数据模型
//  提供 TaskForceRecordStore：专班的 CRUD + mockDB 持久化
//  关联 ActivityRecordStore 用于活动维度的专班关联
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260903c';
import { persist } from '../core/data-adapter.js?v=20260903c';
import { MOCK_TASKFORCES, PEOPLE } from '../mock/index.js?v=20260903c';
import { getPersonName } from './person.js?v=20260903c';

const TASKFORCE_STORAGE_KEY = 'workflowos_taskforces_v1';

function _loadTaskForces() {
  try {
    return [...mockDB.taskforces];
  } catch (e) {
    console.warn('[TaskForceRecordStore] 加载失败：', e);
    return [];
  }
}

function _saveTaskForces(records) {
  try {
    mockDB.taskforces = [...records];
    persist();
  } catch (e) {
    console.warn('[TaskForceRecordStore] 保存失败：', e);
  }
}

export const TaskForceRecordStore = {
  _records: [],

  init() {
    const persisted = _loadTaskForces();
    if (persisted.length > 0) {
      this._records = persisted;
    } else {
      this._records = [...MOCK_TASKFORCES];
      _saveTaskForces(this._records);
    }

    const migrationResult = this.migrateFromLegacy();
    if (migrationResult.migrated > 0) {
      console.log('[TaskForceRecordStore] 历史数据迁移完成：', migrationResult.report);
    }
  },

  list(filter = {}) {
    let result = [...this._records];

    if (filter.status) {
      result = result.filter(r => r.status === filter.status);
    }

    if (filter.manager) {
      result = result.filter(r => r.manager === filter.manager);
    }

    if (filter.activityId) {
      result = result.filter(r => r.activityId === filter.activityId);
    }

    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return result;
  },

  add(record) {
    const newRecord = {
      ...record,
      id: record.id || 'tf-' + Date.now(),
      createdAt: record.createdAt || new Date().toISOString().slice(0, 10),
      members: record.members || [],
      status: record.status || 'recruiting',
    };
    this._records = [...this._records, newRecord];
    _saveTaskForces(this._records);
    // 派生赋权待办给组织委员（最小三成本原则·阶段1C-3）
    // T-190：招募时已内联选初始成员（members 非空）则不再派生；未选人保留待办兜底
    // 使用 dynamic import 避免与 todo.js 的潜在循环依赖
    if (!newRecord.members || newRecord.members.length === 0) {
      import('./todo.js?v=20260903c').then(({ LifecycleTodoDeriver }) => {
        LifecycleTodoDeriver.deriveFromTaskforceCreate(newRecord);
      }).catch(e => console.warn('[TaskForceRecordStore] 派生专班赋权待办失败：', e));
    }
    return newRecord;
  },

  update(id, patch) {
    const idx = this._records.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const updated = { ...this._records[idx], ...patch };
    this._records = [
      ...this._records.slice(0, idx),
      updated,
      ...this._records.slice(idx + 1),
    ];
    _saveTaskForces(this._records);
    return updated;
  },

  // 招募状态跟踪：recruiting → active → archived
  updateStatus(id, newStatus) {
    const validTransitions = {
      recruiting: ['active', 'dissolved'],
      active: ['archived', 'dissolved'],
      archived: [],
      dissolved: [],
    };
    const tf = this._records.find(r => r.id === id);
    if (!tf) return null;
    const allowed = validTransitions[tf.status] || [];
    if (!allowed.includes(newStatus)) return null;
    return this.update(id, { status: newStatus });
  },

  remove(id) {
    const prev = this._records.length;
    this._records = this._records.filter(r => r.id !== id);
    if (this._records.length === prev) return false;
    _saveTaskForces(this._records);
    return true;
  },

  // ══════════════════════════════════════════════════════════════
  //  专班中间进度（立项③阶段a · 最小闭环）
  //  数据域：mockDB.taskforces[].progressList
  //  数组项：{ id:'tp-'+时间戳, stage, note, by, at }
  //  语义：组织委员在运行中（active）专班分阶段填报进展，
  //        纪检委员/党小组组长经只读专班查看（taskforce-view）可见；
  //  兼容旧数据：老专班无 progressList 字段（undefined）按 [] 读写，不报错。
  // ══════════════════════════════════════════════════════════════

  /** 追加一条中间进度（写仅组织委员；by=填报人 personId，由调用方传入） */
  addTaskforceProgress(taskforceId, { stage = '', note = '', by = null } = {}) {
    const tf = this._records.find(r => r.id === taskforceId);
    if (!tf || !String(note || '').trim()) return null;
    const list = Array.isArray(tf.progressList) ? tf.progressList : [];
    const item = {
      id: 'tp-' + Date.now(),
      stage: String(stage || '').trim(),
      note: String(note).trim(),
      by: by || null,
      at: new Date().toISOString(),
    };
    return this.update(taskforceId, { progressList: [...list, item] });
  },

  /** 删除一条中间进度（按记录 id；by=当前操作者 personId，本人可删校验） */
  removeTaskforceProgress(taskforceId, progressId, by = null) {
    const tf = this._records.find(r => r.id === taskforceId);
    if (!tf) return null;
    const list = Array.isArray(tf.progressList) ? tf.progressList : [];
    const target = list.find(p => p && p.id === progressId);
    if (!target) return null;
    // 本人可删：仅填报人本人可删；记录无 by（旧数据）时不拦截
    if (by && target.by && target.by !== by) return null;
    return this.update(taskforceId, { progressList: list.filter(p => p && p.id !== progressId) });
  },

  addMember(tfId, member) {
    const tf = this._records.find(r => r.id === tfId);
    if (!tf) return null;
    const newMember = { ...member, contributions: member.contributions || [] };
    return this.update(tfId, { members: [...tf.members, newMember] });
  },

  // ══════════════════════════════════════════════════════════════
  //  成员贡献批量录入（立项③阶段b · 写入位补全）
  //  数据域：mockDB.taskforces[].members[].contributions
  //  数组项：种子为字符串摘要（历史只读形态）；本次写入为对象条目
  //         { id:'tc-'+时间戳+'_'+personId, desc, by, at }
  //  语义：组织委员在运行中（active）专班按人批量补录成员产出，
  //        解锁解散门槛「工作量报告（成员有产出记录）」对新专班恒阻塞问题。
  //  兼容旧数据：老成员无 contributions 字段（undefined）按 [] 处理。
  // ══════════════════════════════════════════════════════════════

  /** 批量录入贡献（写仅组织委员；desc 非空且 personIds 均为该专班成员才受理） */
  addContributions(taskforceId, { personIds = [], desc = '', by = null } = {}) {
    const tf = this._records.find(r => r.id === taskforceId);
    const note = String(desc || '').trim();
    const ids = Array.isArray(personIds) ? [...new Set(personIds.filter(Boolean))] : [];
    if (!tf || !note || ids.length === 0) return null;
    // 校验：所选人员必须均为该专班成员（含历史数据无 personId 的成员条目过滤）
    const memberIds = (tf.members || []).map(m => m && m.personId);
    if (!ids.every(pid => memberIds.includes(pid))) return null;
    const ts = Date.now();
    const at = new Date().toISOString();
    const members = (tf.members || []).map(m => {
      if (!m || !ids.includes(m.personId)) return m;
      const list = Array.isArray(m.contributions) ? m.contributions : [];
      return {
        ...m,
        contributions: [...list, { id: 'tc-' + ts + '_' + m.personId, desc: note, by: by || null, at }],
      };
    });
    const updated = this.update(taskforceId, { members });
    if (!updated) return null;
    return { added: ids.length };
  },

  getAll() {
    return [...this._records];
  },

  // ══════════════════════════════════════════════════════════════
  //  B1.2.2 宣传专班白名单 — 旧 localStorage 数据迁移
  //  扫描可能存在的旧 key-value 白名单，迁移到结构化模型
  // ══════════════════════════════════════════════════════════════

  _migrationReport: [],

  migrateFromLegacy() {
    const legacyPatterns = [
      /propaganda/i,
      /whitelist/i,
      /宣传.*专班/i,
      /taskforce.*legacy/i,
      /prop_.*roster/i,
      /sop.*white/i,
    ];

    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }

    const candidateKeys = allKeys.filter(k =>
      legacyPatterns.some(p => p.test(k)) && k !== TASKFORCE_STORAGE_KEY
    );

    if (candidateKeys.length === 0) return { migrated: 0, report: [] };

    const report = [];
    candidateKeys.forEach(legacyKey => {
      try {
        const raw = localStorage.getItem(legacyKey);
        if (!raw) return;
        const value = JSON.parse(raw);

        let migrated = null;
        if (Array.isArray(value)) {
          migrated = {
            id: 'tf-legacy-' + legacyKey.replace(/[^a-z0-9]/gi, '-').slice(0, 30),
            name: '宣传专班（历史迁移）',
            task: '从旧 localStorage 键 ' + legacyKey + ' 迁移',
            status: 'dissolved',
            manager: '组织委员',
            initiator: '宣传委员',
            members: value.map((name, idx) => {
              const person = PEOPLE.find(p => p.name === (typeof name === 'string' ? name : name.name));
              return {
                personId: person ? person.id : null,
                name: typeof name === 'string' ? name : (name.name || '成员' + (idx + 1)),
                role: 'deep',
                contributions: [],
              };
            }),
            capacity: value.length,
            deadline: '',
            activityId: null,
            createdAt: new Date().toISOString().slice(0, 10),
            _migratedFrom: legacyKey,
          };
        } else if (typeof value === 'object' && value !== null) {
          migrated = {
            id: 'tf-legacy-' + Date.now().toString(36),
            name: value.name || '宣传专班（历史迁移）',
            task: value.task || '从旧 localStorage 键 ' + legacyKey + ' 迁移',
            status: 'dissolved',
            manager: '组织委员',
            initiator: '宣传委员',
            members: (value.members || []).map(m => ({
              name: typeof m === 'string' ? m : (m.name || '未知'),
              role: m.role || 'deep',
              contributions: m.contributions || [],
            })),
            capacity: (value.members || []).length,
            deadline: value.deadline || '',
            activityId: null,
            createdAt: new Date().toISOString().slice(0, 10),
            _migratedFrom: legacyKey,
          };
        }

        if (migrated) {
          this.add(migrated);
          localStorage.removeItem(legacyKey);
          report.push({ key: legacyKey, count: migrated.members.length, status: 'migrated' });
        }
      } catch (e) {
        report.push({ key: legacyKey, status: 'failed', error: e.message });
      }
    });

    this._migrationReport = report;
    return { migrated: report.filter(r => r.status === 'migrated').length, report };
  },
};
