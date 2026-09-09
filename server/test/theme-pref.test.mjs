// role: [工程师]+[AI]
// server/test/theme-pref.test.mjs — 外观偏好键空间隔离（设置中心 R1-A 裁决，2026-09-09）纯逻辑单测
// 覆盖书记裁决「方案 A」四个断言面：
//   1) 登录用户 person 无键 → 出厂默认（主题=跟随系统默认档 / 字号=中 / 强调色=null），
//      绝不回落读全局键、绝不「写一次」迁移（新账号首登不继承上一登录者外观）；
//   2) 登录用户写入只落 person 键（gsm1921-pref-<personId>-{theme,font-size,accent-role}），
//      绝不材料化全局键；
//   3) 访客读写只走全局键（workflowos_theme / workflowos_font_size / workflowos_accent_role，行为不变）；
//   4) 两空间互不污染（登录行为不改访客键；访客行为不改任何 person 键）。
// 运行：node --test server/test/theme-pref.test.mjs（纯 node；localStorage/sessionStorage 注入 stub，
//       theme.js 经 login-snapshot 判定登录态，DOM 路径全部有 typeof 守卫 → node 安全）。
// 注意：本文件仅断言「键空间读写判定」，DOM class / --app-accent 生效由浏览器复验覆盖。

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getThemePreference, setThemePreference,
  getFontSizePreference, setFontSizePreference,
  getAccentRolePreference, setAccentRolePreference,
  resolveAppliedAccentRole, personPrefKey, syncAppearanceForActiveUser,
} from '../../docs/src/core/theme.js?v=20260909e';

const THEME_KEY = 'workflowos_theme';
const FONT_KEY = 'workflowos_font_size';
const ACCENT_KEY = 'workflowos_accent_role';
const LOGIN_KEY = 'gsm1921-login-user';
const TAB_KEY = 'gsm1921-tab-id';

// ── 存储 stub（Map 实现；登录态经 login-snapshot 读取 localStorage LOGIN_KEY +
//    sessionStorage TAB_KEY 判定，与偏好存储共用同一注入）──
function installStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
    _store: store,
  };
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  return store;
}
beforeEach(() => { installStorage(); });

/** 模拟登录（personId；LOGIN_KEY 不带 tabId → login-snapshot 直接判定登录态） */
function loginAs(personId) {
  globalThis.localStorage.setItem(LOGIN_KEY, JSON.stringify({ personId, role: 'secretary' }));
}
const logout = () => globalThis.localStorage.removeItem(LOGIN_KEY);

function keysOf(store) { return [...store.keys()].filter(k => k !== LOGIN_KEY); }
function personKeysOf(store) { return keysOf(store).filter(k => k.startsWith('gsm1921-pref-')); }

// ── 1) 登录用户 person 无键 = 出厂默认，不回退全局、零写入 ──
test('R1-A：访客在全局键留下偏好后，新登录账号 person 无键 → 出厂默认不继承（不回退/不迁移写入）', () => {
  const store = installStorage();
  // 上一「登录者/访客」经全局键留下的外观（R1 缺陷源）
  store.set(THEME_KEY, 'dark');
  store.set(FONT_KEY, 'large');
  store.set(ACCENT_KEY, 'participant');

  loginAs('p5'); // 新账号首登：person 空间全新
  assert.equal(getThemePreference(), 'system', '主题默认 = 跟随系统默认档（不继承全局 dark）');
  assert.equal(getFontSizePreference(), 'medium', '字号默认 = 中（不继承全局 large）');
  assert.equal(getAccentRolePreference(), null, '强调色默认 = 未设置 null（不继承全局 participant）');
  assert.equal(personKeysOf(store).length, 0, '首登零写入：绝不「读一次迁移写」person 键');
  // 全局键保持原值（登录读取不回退 → 亦不触碰访客空间）
  assert.equal(store.get(THEME_KEY), 'dark');
  assert.equal(store.get(FONT_KEY), 'large');
  assert.equal(store.get(ACCENT_KEY), 'participant');
});

// ── 2) 登录用户写入只落 person 键 ──
test('R1-A：登录用户 set 只写 person 键，绝不材料化全局键', () => {
  const store = installStorage();
  store.set(THEME_KEY, 'light'); // 访客先前偏好（应保持原样，不被登录行为改写）
  store.set(FONT_KEY, 'medium');
  store.set(ACCENT_KEY, 'secretary');

  loginAs('p13');
  setThemePreference('dark');
  setFontSizePreference('large');
  setAccentRolePreference('participant');

  assert.equal(store.get(personPrefKey('p13', '-theme')), 'dark');
  assert.equal(store.get(personPrefKey('p13', '-font-size')), 'large');
  assert.equal(store.get(personPrefKey('p13', '-accent-role')), 'participant');
  // 全局键 = 访客原值（登录写入未触碰）
  assert.equal(store.get(THEME_KEY), 'light');
  assert.equal(store.get(FONT_KEY), 'medium');
  assert.equal(store.get(ACCENT_KEY), 'secretary');
});

// ── 3) 访客读写只走全局键（行为不变）──
test('R1-A：访客 set 只写全局键，get 读全局键；不产生任何 person 键', () => {
  const store = installStorage();
  logout();
  setThemePreference('light');
  setFontSizePreference('large');
  setAccentRolePreference('purple'); // ACCENT_COLORS 合法色板键（'green' 非合法键，会回落）
  assert.equal(store.get(THEME_KEY), 'light');
  assert.equal(store.get(FONT_KEY), 'large');
  assert.equal(store.get(ACCENT_KEY), 'purple');
  assert.equal(getThemePreference(), 'light');
  assert.equal(getFontSizePreference(), 'large');
  assert.equal(getAccentRolePreference(), 'purple');
  assert.equal(personKeysOf(store).length, 0, '访客行为不落 person 键');
  assert.equal(resolveAppliedAccentRole('secretary'), 'purple', '访客生效强调色 = 全局覆盖优先');
});

// ── 4) 双账号互不污染 + 切号读回 ──
test('R1-A：p13 与 p5 偏好互不污染；切号后读回各自 person 键（p5 无键=默认）', () => {
  const store = installStorage();
  loginAs('p13');
  setThemePreference('dark');
  setFontSizePreference('large');
  setAccentRolePreference('participant');
  logout();

  loginAs('p5'); // 切到另一账号：默认不继承
  assert.equal(getThemePreference(), 'system');
  assert.equal(getFontSizePreference(), 'medium');
  assert.equal(getAccentRolePreference(), null);
  logout();

  loginAs('p13'); // 切回书记：person 键仍在
  assert.equal(getThemePreference(), 'dark');
  assert.equal(getFontSizePreference(), 'large');
  assert.equal(getAccentRolePreference(), 'participant');
  assert.equal(personKeysOf(store).length, 3, '仅 p13 三个 person 键；p5 首登零写入');
});

// ── 补充：resolveAppliedAccentRole 按作用域回落角色默认 ──
test('resolveAppliedAccentRole：登录无覆盖 → 角色默认；有覆盖 → 覆盖键；非法覆盖 → 角色默认', () => {
  const store = installStorage();
  loginAs('p13');
  assert.equal(resolveAppliedAccentRole('secretary'), 'secretary', '登录无覆盖 → 角色默认（绝不回落全局）');
  store.set(ACCENT_KEY, 'participant'); // 全局残留上一登录者/访客键（应被无视）
  assert.equal(resolveAppliedAccentRole('secretary'), 'secretary', '登录解析无视全局残留');
  setAccentRolePreference('participant');
  assert.equal(resolveAppliedAccentRole('secretary'), 'participant', 'person 覆盖 → 覆盖键');
  setAccentRolePreference('ghost-role'); // 非法键
  assert.equal(resolveAppliedAccentRole('secretary'), 'secretary', '非法覆盖 → 角色默认');
});

// ── 补充：node 无 DOM 环境下模块 API 安全（守卫路径不抛）──
test('node 环境安全：sync/DOM 依赖 API 有 typeof 守卫，调用不抛', () => {
  loginAs('p13');
  assert.equal(syncAppearanceForActiveUser(), undefined);
  setThemePreference('dark');
});
