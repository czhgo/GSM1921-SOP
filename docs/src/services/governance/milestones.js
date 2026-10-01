// role: [工程师]+[AI]
// milestones.js — 批次管理服务
//
// 2026-09-23 批次 163（T1）：**补服务端对源**。原实现只 `fetch('./data/milestones.json')`
//   （纯浏览器侧）+ localStorage 缓存 ⇒ api 形态下里程碑与静态文件各说各话、无服务端对源。
//   现分流（两形态并存、互不回归）：
//     · api  形态 → `getAdapter().milestones.list()`（服务端表由 `server/seed.js::seedMilestones()`
//       以 `docs/data/milestones.json` 为**内容单一源**播种）→ 与静态文件同内容；
//     · mock 形态 → 现有本地路径（localStorage 缓存 → 静态文件），一字未改。
//   单一源不变：内容仍以 `docs/data/milestones.json` 为准（服务端只是把它搬到库里）。

import { getDataSource, getAdapter } from '../../data/data-adapter.js?v=20261001a';
import { mockDB } from '../../core/domain/domain.js?v=20261001a';

const MILESTONES_JSON_PATH = './data/milestones.json';
const CACHE_KEY = 'gsm1921-milestone-cache';

let _cache = null;

export const MilestoneStore = {
  async loadAll() {
    if (_cache) return _cache;
    if (getDataSource() === 'api') {
      // api 形态：服务端为权威（`init()` 已把该域拉进 `mockDB.milestones`；此处直取一次保幂等）
      try {
        const rows = await getAdapter().milestones.list();
        _cache = Array.isArray(rows) ? rows : [];
      } catch (e) {
        console.warn('[MilestoneStore] api 形态里程碑拉取失败，回退本机缓存：', e);
        _cache = Array.isArray(mockDB.milestones) ? mockDB.milestones : [];
      }
      return _cache;
    }
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
