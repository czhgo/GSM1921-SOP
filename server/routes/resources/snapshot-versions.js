// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/snapshot-versions.js —— **快照写穿的集合版本号（乐观锁）协议**（2026-09-23 P0-1）
// ════════════════════════════════════════════════════════════════

import { replaceCollectionsAtomic, readCollectionVersions } from '../../db.js';
import { RESOURCE_TABLES } from './store.js';

// ════════════════════════════════════════════════════════════════
//  快照写穿的**集合版本号（乐观锁）**协议（2026-09-23 P0-1 · 支书裁定「六项 P0 全做」）
// ════════════════════════════════════════════════════════════════
// 病灶（丢数据）：`POST /snapshot` 逐集合 `DELETE + INSERT`（无事务）+ 无并发保护 ⇒
//   ① 中途异常留下**半空集合**；② 两个在线会话**同集合**先后写，后写者以内存的落后快照**整表覆盖**
//   前写者刚落库的数据（前写者数据静默消失）。
// 协议（本段是判据单一源；前端消费点 = `docs/src/core/data-adapter.js` 的 `_flushSnapshot`）：
//   · 请求：payload 内带 `_versions`（对象：集合名 → 该集合**基线版本**，＝前端上次同步到该集合时的服务端版本）。
//   · 响应：带 `_versions` ⇒ 200 `{versions:{集合名:新版本}}`；payload 无集合（如 `{}`）⇒ 204（形状不变）。
//   · 冲突：某集合 `_versions[name] !== 服务端当前版本` ⇒ **整批 409**（不写任何集合），
//     body `{error, conflicts:[{collection, base, current}]}`。
//   · **缺版本 ⇒ 整批 428**（2026-09-23 批次 163 收紧）：payload 里出现（数组值）而 `_versions` 里**没有**该集合
//     ⇒ 拒绝，body `{error, missingVersions:[集合名…]}`。原「未带 `_versions` 的集合按无条件写」是一条
//     **绕过乐观锁的旁路**（任何直连调用可整表覆盖而不触发冲突检测），现封掉；直连调用须自带 `_versions`
//     （`GET /api/v1/snapshot/versions` 取基线，或首次上传带 0）。
//   边界一「首次上传」：服务端 collection_versions 无该行 ⇒ 服务端基线 = **0**；前端带 0 ⇒ 命中（放行）。
//   边界二「空数组」：合法清空（`[]` 是「本次要写的集合」）——同样走版本比对与版本 +1，不特殊放行。
// 并发安全：本文件 handler 全同步（better-sqlite3 同步 API），比对与写之间无 await 让出点
//   ⇒ 同进程内「比对 → 写」是原子的；跨进程竞态由 db.js 的 `replaceCollectionsAtomic` 事务兜底（要么全成、要么全不动）。
// ⚠ 本段置于文件末尾（同本文件既有的「末尾追加以保行号」纪律）：上下文的 `文件:行号` 引用由
//   `doc-line-ref.test.mjs` 逐条核，函数声明提升 ⇒ 置于尾部对上方 handler 无影响。

/** 快照 payload 的基线版本表；未携带（非对象/数组）⇒ null（＝所有集合都算「缺版本」，见 §缺版本 ⇒ 428） */
export function _snapshotBaseVersions(payload) {
  const v = payload && payload._versions;
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
}

/** 本次要写的集合清单（payload 里值为数组的资源名 → 表名）；数组(含空数组)才是「要写」，缺键/非数组不动该表 */
export function _snapshotWrites(payload) {
  const out = [];
  for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
    if (Array.isArray(payload[name])) out.push({ name, table, rows: payload[name] });
  }
  return out;
}

/**
 * 缺版本集合清单（2026-09-23 批次 163）：**payload 里要写、而 `_versions` 里没有基线**的集合名。
 * 非空 ⇒ 调用方整批 428（不写任何集合）。空 payload（无集合要写）恒返回 `[]` ⇒ 仍走 204。
 * @returns {string[]}
 */
export function _snapshotMissingVersions(payload, baseVersions) {
  return _snapshotWrites(payload)
    .filter((w) => !baseVersions || !Object.prototype.hasOwnProperty.call(baseVersions, w.name))
    .map((w) => w.name);
}

/** 集合版本全集（未出现过的集合补 0）——前端 init() 取基线用，保证「每个集合都有基线」 */
export function _allCollectionVersions(db) {
  const stored = readCollectionVersions(db);
  const out = {};
  for (const name of Object.keys(RESOURCE_TABLES)) out[name] = stored[name] || 0;
  return out;
}

/** 逐集合版本比对：返回冲突清单（空数组＝无冲突）。缺版本的集合由 `_snapshotMissingVersions` 先挡（428） */
export function _snapshotVersionConflicts(db, payload, baseVersions) {
  const stored = readCollectionVersions(db);
  const conflicts = [];
  for (const w of _snapshotWrites(payload)) {
    if (!Object.prototype.hasOwnProperty.call(baseVersions, w.name)) continue;
    const base = Number(baseVersions[w.name]);
    const current = stored[w.name] || 0;
    if (!Number.isFinite(base) || base !== current) {
      conflicts.push({ collection: w.name, base: Number.isFinite(base) ? base : null, current });
    }
  }
  return conflicts;
}

