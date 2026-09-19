// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  accounts.js — 可持久化账号层（成员流入自动建号 / 流出停用；2026-09-14 批次 25 支书裁定）
// ════════════════════════════════════════════════════════════════
//  口径（DATA_CONSISTENCY_CHECKLIST「账号与成员档案同源」）：
//   · 账号由学号派生（**账号即学号**）；成员新增/流出与账号建号/停用必须成对发生；
//     禁出现「档案有此人、账号层没有」或反向的孤项。
//   · 登录校验 = 「可持久化账号层 ∪ 静态种子表（mock/accounts.js::MOCK_ACCOUNTS）」：
//       - 持久化账号层（localStorage 键 `gsm1921-accounts`，`gsm1921-` 前缀 → ?reset=demo 自动清除 = 回种子）
//         承载运行时新建账号（成员流入自动建号）与「停用墓碑」（成员流出停用种子账号）；
//       - 静态种子表 = 演示账号基线，运行时不变。
//   · 停用不物理删除：写 active=false 留痕（登录校验拒绝停用账号）。
//   · api 形态：账号承载 = server `users` 表行（personId 指向成员；登录口令校验见 server/routes/auth.js）——
//     成员流入经 PersonStore.saveMember → server users 建行即完成建号；本文件仅服务 mock 形态登录校验。
//  依赖：mock/accounts.js（叶子数据模块）——无 DOM；localStorage 惰性访问。
// ════════════════════════════════════════════════════════════════

import { MOCK_ACCOUNTS } from '../mock/accounts.js?v=20260919k';

/** 可持久化账号层 localStorage 键（gsm1921- 前缀 → ?reset=demo 自动清理 = 回种子） */
export const ACCOUNTS_KEY = 'gsm1921-accounts';
const ACCOUNTS_VERSION = 1;

/** 支部统一默认口令（与 mock/accounts.js 演示口令、server LOGIN_PASSWORD 缺省一致） */
export const DEFAULT_PASSWORD = '123456';

/** 读取持久化账号层（不可用/损坏 → []） */
export function loadAccounts() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return [];
    return Array.isArray(o.accounts) ? o.accounts : (Array.isArray(o) ? o : []);
  } catch (_) {
    return [];
  }
}

/** 写入持久化账号层（不可用 → false，调用方自担：登录校验降级为仅种子表） */
function _saveAccounts(accounts) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ version: ACCOUNTS_VERSION, accounts }));
    return true;
  } catch (_) {
    return false;
  }
}

/** 账号层全量（持久化记录；供管理与单测） */
export function listAccounts() {
  return loadAccounts();
}

/**
 * 按 personId 解析账号（持久化优先，回退静态种子表）。
 * @param {string} personId
 * @returns {{studentId:string, password:string, personId:string, active:boolean, source:'persisted'|'seed'}|null}
 */
export function findAccountByPersonId(personId) {
  if (!personId) return null;
  const p = loadAccounts().find(a => a.personId === personId);
  if (p) return { active: p.active !== false, source: 'persisted', ...p };
  const s = MOCK_ACCOUNTS.find(a => a.personId === personId);
  return s ? { ...s, active: true, source: 'seed' } : null;
}

/**
 * 新建 / 更新账号（成员流入自动建号，账号 = 学号，口令 = 支部统一默认口令）。
 * @param {Object} p
 * @param {string} p.personId
 * @param {string} p.studentId
 * @param {string} [p.password]
 * @returns {{ok:boolean, account?:Object, reason?:string}}
 */
export function createAccount({ personId, studentId, password } = {}) {
  const sid = String(studentId == null ? '' : studentId).trim();
  if (!personId || !sid) return { ok: false, reason: '账号须由学号派生（personId + studentId 必填）' };
  const at = new Date().toISOString();
  const list = loadAccounts();
  const idx = list.findIndex(a => a.personId === personId);
  const rec = {
    studentId: sid,
    password: password || DEFAULT_PASSWORD,
    personId,
    active: true,
    createdAt: (idx >= 0 ? list[idx].createdAt : undefined) || at,
    updatedAt: at,
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...rec };
  else list.push(rec);
  _saveAccounts(list);
  return { ok: true, account: { ...rec } };
}

/**
 * 停用/恢复账号（成员流出 = 停用；撤销流出 = 恢复）。不物理删除——写 active 留痕。
 * 种子账号（无持久化记录）停用 → 写「停用墓碑」记录（login 校验优先读持久化层 → 拒绝）。
 * @param {Object} p
 * @param {string} p.personId
 * @param {string} [p.studentId] 种子表无法反查时的学号兜底
 * @param {boolean} p.active
 * @param {string} [p.password]
 * @returns {{ok:boolean, account?:Object, reason?:string}}
 */
export function setAccountActive({ personId, studentId, active, password } = {}) {
  if (!personId) return { ok: false, reason: '缺少成员 id' };
  const at = new Date().toISOString();
  const list = loadAccounts();
  const idx = list.findIndex(a => a.personId === personId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], active: !!active, updatedAt: at };
    _saveAccounts(list);
    return { ok: true, account: { ...list[idx] } };
  }
  const seed = MOCK_ACCOUNTS.find(a => a.personId === personId);
  const sid = String(studentId == null ? '' : studentId).trim() || (seed && seed.studentId) || '';
  if (!sid) return { ok: false, reason: '该成员无账号（无学号，无法停用/恢复）' };
  const rec = {
    studentId: sid,
    password: password || (seed && seed.password) || DEFAULT_PASSWORD,
    personId,
    active: !!active,
    createdAt: at,
    updatedAt: at,
  };
  _saveAccounts([...list, rec]);
  return { ok: true, account: { ...rec } };
}

/** 停用账号（成员流出） */
export function deactivateAccount(personId, { studentId } = {}) {
  return setAccountActive({ personId, studentId, active: false });
}

/** 恢复账号（撤销成员流出） */
export function reactivateAccount(personId, { studentId } = {}) {
  return setAccountActive({ personId, studentId, active: true });
}

/**
 * 该学号对应的账号是否处于启用态（登录可用）。
 * @param {string} studentId
 * @returns {boolean}
 */
export function isAccountActive(studentId) {
  const sid = String(studentId == null ? '' : studentId).trim();
  if (!sid) return false;
  const persisted = loadAccounts().find(a => a.studentId === sid);
  if (persisted) return persisted.active !== false;
  return MOCK_ACCOUNTS.some(a => a.studentId === sid);
}

/**
 * 登录校验（账号层 ∪ 静态种子表；停用账号一律拒绝）。
 * @param {string} studentId
 * @param {string} password
 * @returns {{ok:boolean, personId:string|null}}
 */
export function verifyLogin(studentId, password) {
  const sid = String(studentId == null ? '' : studentId).trim();
  const pwd = String(password == null ? '' : password);
  if (!sid) return { ok: false, personId: null };
  // 持久化账号层优先（含停用墓碑：停用即拒登）
  const persisted = loadAccounts().find(a => a.studentId === sid);
  if (persisted) {
    if (persisted.active === false) return { ok: false, personId: null };
    if (persisted.password === pwd) return { ok: true, personId: persisted.personId };
    return { ok: false, personId: null };
  }
  // 回退静态种子表
  const seed = MOCK_ACCOUNTS.find(a => a.studentId === sid && a.password === pwd);
  return seed ? { ok: true, personId: seed.personId } : { ok: false, personId: null };
}
