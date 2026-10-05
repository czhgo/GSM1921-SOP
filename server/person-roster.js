// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/person-roster.js — 服务端「人员名册」读口
//  来源＝`R-23` 余项（2026-10-05 批次 390/391 登记 · 2026-10-06 支书令「立！」· 批次 422 · `D-803`③）：
//    系统派生通知里的**人名**此前一律沿用客户端 payload（`payload.personName` 等），
//    服务端**没有名册读口** ⇒ `R-22`/`R-23` 的「不采信客户端自述」在人名这一维留了缺口
//    （客户端可在通知里写别人的名字）。
//  单一源＝`users` 表（经 `RESOURCE_TABLES.users`，勿另写一张表名）。
//  边界（如实）：**只覆盖 payload 里同时带 `<x>Id` 与 `<x>Name` 的场景**；payload 不带 id 的
//    （如 `organizer-transferred` 的 `fromName`/`toName`/`byName`）**仍沿用 payload**——
//    要真堵须由前端补 id 或由服务端按源行派生，属**已登记余项**。
// ════════════════════════════════════════════════════════════════
import { RESOURCE_TABLES } from './routes/resources/store.js';

/** 名册表名（单一源） */
function rosterTable() {
  return RESOURCE_TABLES.users;
}

/**
 * 单人在册姓名。
 * @param {object} db better-sqlite3 实例
 * @param {string} personId
 * @returns {string|null} 在册姓名；查无此人 / 无名 / 无 db ⇒ null（**由调用方决定回退**）
 */
export function personName(db, personId) {
  if (!db || !personId) return null;
  try {
    const r = db.prepare(`SELECT data FROM ${rosterTable()} WHERE id = ?`).get(String(personId));
    if (!r) return null;
    const row = JSON.parse(r.data);
    return row && typeof row.name === 'string' && row.name ? row.name : null;
  } catch (_) {
    return null;
  }
}

/**
 * 批量在册姓名（查不到的 id **不出现在结果里**）。
 * @param {object} db
 * @param {string[]} ids
 * @returns {Record<string,string>}
 */
export function personNames(db, ids) {
  const out = {};
  for (const id of Array.isArray(ids) ? ids : []) {
    const nm = personName(db, id);
    if (nm) out[String(id)] = nm;
  }
  return out;
}

/**
 * 依 `vars` 里的 `<x>Id` **覆写**同名 `<x>Name`——以**名册在册者**为准。
 * 判据：① 键名以 `Id` 结尾；② 同名 `Name` 键**已在 vars 里**；③ 该 id **能在名册里查到人名**。
 * 三条同时成立才覆写 —— 故非人名类 id（`activityId` / `sourceId` / `branchId` … 不在 `users` 表）
 * **天然不会误伤**（查不到 ⇒ 不覆写）。
 * @param {object} db
 * @param {Record<string,any>} vars
 * @returns {Record<string,any>} 同一对象（就地覆写）
 */
export function applyRosterNames(db, vars) {
  if (!db || !vars || typeof vars !== 'object' || Array.isArray(vars)) return vars;
  for (const k of Object.keys(vars)) {
    if (!k.endsWith('Id')) continue;
    const nameKey = `${k.slice(0, -2)}Name`;
    if (!(nameKey in vars)) continue;
    const nm = personName(db, vars[k]);
    if (nm) vars[nameKey] = nm;
  }
  return vars;
}
