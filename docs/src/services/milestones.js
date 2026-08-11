// role: [工程师]+[AI]
// milestones.js — 批次管理服务

const MILESTONES_JSON_PATH = './data/milestones.json';
const CACHE_KEY = 'gsm1921-milestone-cache';

let _cache = null;

export const MilestoneStore = {
  async loadAll() {
    if (_cache) return _cache;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) { _cache = JSON.parse(cached); return _cache; }
    } catch {}
    try {
      const resp = await fetch(MILESTONES_JSON_PATH);
      const data = await resp.json();
      _cache = data.milestones || [];
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(_cache)); } catch {}
      return _cache;
    } catch { _cache = []; return _cache; }
  },

  getById(id) { return (_cache || []).find(m => m.id === id); },
};
