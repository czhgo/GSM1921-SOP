// role: [人机]
// ════════════════════════════════════════════════════════════════
//  service.taskforce.js — 专班数据模型
//  提供 TaskForceRecordStore：专班的 CRUD + mockDB 持久化
//  关联 ActivityRecordStore 用于活动维度的专班关联
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js';
import { saveDB } from './mock.js';
import { MOCK_TASKFORCES, _personName, PEOPLE } from '../mock/index.js';

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
    saveDB();
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

  getActiveRecruiting() {
    return this.list({ status: 'recruiting' });
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

  addContribution(tfId, memberPersonId, contribution) {
    const tf = this._records.find(r => r.id === tfId);
    if (!tf) return null;
    const updatedMembers = tf.members.map(m => {
      if (m.personId === memberPersonId) {
        return { ...m, contributions: [...m.contributions, contribution] };
      }
      return m;
    });
    return this.update(tfId, { members: updatedMembers });
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
                role: '深度参与者',
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
              role: m.role || '深度参与者',
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

  getMigrationReport() {
    return [...this._migrationReport];
  },
};

export function renderRecruitmentList(containerId, limit = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const recruiting = TaskForceRecordStore.getActiveRecruiting().slice(0, limit);

  if (recruiting.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无待招募信息</p>';
    return;
  }

  const statusBadge = {
    recruiting: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">招募中</span>',
    active:    '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">运行中</span>',
    completed: '<span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600">已完结</span>',
  };

  container.innerHTML = recruiting.map(r => {
    const filled = r.members.filter(m => m.personId).length;
    return `
    <div class="taskforce-item flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
         data-tf-id="${r.id}">
      ${statusBadge[r.status] || ''}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-800 truncate">${r.name}</p>
        <p class="text-xs text-gray-500 mt-0.5 line-clamp-1">${r.task}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] text-gray-400">发起: ${_personName(r.initiator)}</span>
          <span class="text-[10px] text-gray-300">|</span>
          <span class="text-[10px] text-gray-400">管理: ${_personName(r.manager)}</span>
        </div>
      </div>
      <div class="text-right whitespace-nowrap">
        <span class="text-xs font-medium text-amber-600">${filled}/${r.capacity}</span>
        <p class="text-[10px] text-gray-400">截止 ${r.deadline}</p>
      </div>
    </div>
  `;
  }).join('');
}
