﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.taskforce.js — 专班数据模型
//  提供 TaskForceRecordStore：专班的 CRUD + mockDB 持久化
//  关联 ActivityRecordStore 用于活动维度的专班关联
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260811d';
import { persist } from '../core/data-adapter.js?v=20260811d';
import { MOCK_TASKFORCES, _personName, PEOPLE } from '../mock/index.js?v=20260811d';

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
      import('./todo.js?v=20260811d').then(({ LifecycleTodoDeriver }) => {
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

  addMember(tfId, member) {
    const tf = this._records.find(r => r.id === tfId);
    if (!tf) return null;
    const newMember = { ...member, contributions: member.contributions || [] };
    return this.update(tfId, { members: [...tf.members, newMember] });
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
