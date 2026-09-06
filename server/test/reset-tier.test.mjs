// role: [工程师]+[AI]
// server/test/reset-tier.test.mjs — 立项⑤ 阶段B：?reset 分层语义纯测（2026-09-06）
// 覆盖（验收判据 5 的布尔面 + 阶段B 分层语义）：
//   ① resolveResetTier：demo 档（?reset=1 历史别名 = demo）/ preview 档独立 / 未知与缺省 → null
//   ② collectResetKeys(demo)：清演示前缀键（workflowos_*/gsm1921-*/sop_org_os_*）+ 历史遗留键
//      （含未出现的遗留键，removeItem 幂等）；不清 wizard-draft-*（保持 ?reset=1 原键集）
//   ③ collectResetKeys(preview)：只清运行时 overlay/预览键（gsm1921-base-data-preview + wizard-draft-*），
//      演示数据本体（前缀键 + 遗留键）原样保留
//   ④ handleResetIfRequested 执行（window/localStorage/sessionStorage 内存桩）：
//      · API 模式（sessionStorage 有 token）：demo/preview 两档均跳过——不动存储、不导航
//        （不清 sessionStorage 登录会话、不清服务器远端数据，保留边界）
//      · demo 档（含 ?reset=1 别名）：清演示键后去参整页导航
//      · preview 档：只清 preview 键、演示键保留，去参整页导航（保留其它 URL 参数）
// 纯 Node + 内存桩，无浏览器/服务器依赖；mock-adapter 经 ?v= query 导入（与 empty-template/wizard-copy 同法）。
// 运行：node --test test/reset-tier.test.mjs（server 目录）
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const { resolveResetTier, collectResetKeys, handleResetIfRequested } =
  await import('../../docs/src/core/mock-adapter.js?v=20260903c');

// ── 内存桩 ─────────────────────────────────────────────────────
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => map.set(String(k), String(v)),
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    snapshot: () => Object.fromEntries(map),
  };
}

/** 注入 window/localStorage（可选 sessionStorage token）桩；返回 { ls, win } 供断言 */
function stubGlobals({ search, href, store, token }) {
  const ls = makeStorage(store || {});
  const win = { location: { search, href } };
  win.location.replace = (url) => { win._replaced = String(url); };
  globalThis.localStorage = ls;
  globalThis.window = win;
  if (token !== undefined) {
    globalThis.sessionStorage = makeStorage({ 'gsm1921-api-token': token });
  } else {
    delete globalThis.sessionStorage;
  }
  return { ls, win };
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

/** 典型现场：演示 DB + 登录缓存 + 审计 + 预览 + 向导草稿（多支部）+ 遗留键 + 无关键 */
const PRESENT = {
  workflowos_branch_db_v1: '{"_schema":1}',
  'gsm1921-login-user': '{"personId":"p1"}',
  sop_org_os_audit_v1: '[]',
  'gsm1921-base-data-preview': '{"people":[]}',
  'wizard-draft-br-b1': '{"step":3}',
  'wizard-draft-br-other': '{"step":1}',
  assignment_records: '[]', // 历史遗留键（在现场出现）
  page_pref_other: 'x',     // 无关键（不属于任何档位）
};

// ═══════════════ ① 档位解析 ═══════════════
test('resolveResetTier：?reset=1 = demo 档历史别名；demo/preview 分档；未知/缺省 → null', () => {
  assert.equal(resolveResetTier('1'), 'demo');
  assert.equal(resolveResetTier('demo'), 'demo');
  assert.equal(resolveResetTier('preview'), 'preview');
  assert.equal(resolveResetTier(null), null);
  assert.equal(resolveResetTier(undefined), null);
  assert.equal(resolveResetTier(''), null);
  assert.equal(resolveResetTier('0'), null, '0 不动作（防误触）');
  assert.equal(resolveResetTier('PREVIEW'), null, '大小写敏感（防误触）');
  assert.equal(resolveResetTier('foo'), null);
});

// ═══════════════ ②③ 键集收集（纯） ═══════════════
test('collectResetKeys(demo)：清演示前缀键 + 历史遗留键（含未出现者）；不清向导草稿与无关键', () => {
  const keys = Object.keys(PRESENT);
  const out = collectResetKeys('demo', keys);
  for (const k of ['workflowos_branch_db_v1', 'gsm1921-login-user', 'sop_org_os_audit_v1', 'gsm1921-base-data-preview', 'assignment_records']) {
    assert.ok(out.includes(k), `demo 档应移除 ${k}`);
  }
  // 未出现的遗留键也纳入（removeItem 幂等；与 ?reset=1 原键集口径一致，连带清理历史单域键）
  for (const k of ['attendance_records', 'inspection_records', 'makeup_tasks', 'experience_deposits', 'gsm1921-auth-records']) {
    assert.ok(out.includes(k), `demo 档含遗留键 ${k}`);
  }
  for (const k of ['wizard-draft-br-b1', 'wizard-draft-br-other', 'page_pref_other']) {
    assert.ok(!out.includes(k), `demo 档不应移除 ${k}（保持 ?reset=1 原键集）`);
  }
});

test('collectResetKeys(preview)：只清运行时 overlay/预览键，演示数据本体与遗留键原样保留', () => {
  const out = collectResetKeys('preview', Object.keys(PRESENT));
  assert.deepEqual([...out].sort(), ['gsm1921-base-data-preview', 'wizard-draft-br-b1', 'wizard-draft-br-other'].sort());
  for (const k of ['workflowos_branch_db_v1', 'gsm1921-login-user', 'sop_org_os_audit_v1', 'assignment_records', 'page_pref_other']) {
    assert.ok(!out.includes(k), `preview 档不动 ${k}`);
  }
});

test('collectResetKeys：未知档位 → 空清单（不动作）；demo 档遗留键恒纳入', () => {
  assert.deepEqual(collectResetKeys(null, Object.keys(PRESENT)), []);
  assert.deepEqual(collectResetKeys('bogus', Object.keys(PRESENT)), []);
  // demo 档：即使现场无前缀键，历史遗留键仍恒纳入（removeItem 幂等，保持 ?reset=1 原键集口径）
  const legacyOnly = collectResetKeys('demo', []);
  assert.ok(legacyOnly.length >= 10, '遗留键恒纳入');
  assert.ok(legacyOnly.includes('assignment_records') && legacyOnly.includes('gsm1921-auth-records'));
  assert.deepEqual(collectResetKeys('demo'), legacyOnly, '缺省现场参数与空数组同效');
});

// ═══════════════ ④ 执行（API 边界 + 两档行为） ═══════════════
test('执行：API 模式（sessionStorage 有 token）demo/preview 两档均跳过——不动存储、不导航', () => {
  for (const mode of ['demo', 'preview']) {
    const { ls, win } = stubGlobals({
      search: `?reset=${mode}`,
      href: `http://127.0.0.1:3000/index.html?reset=${mode}`,
      store: PRESENT,
      token: 't-abc',
    });
    assert.equal(handleResetIfRequested(), false, `?reset=${mode} 在 API 模式跳过`);
    assert.deepEqual(ls.snapshot(), PRESENT, '存储未被触碰（不清登录会话/远端数据）');
    assert.equal(win._replaced, undefined, '不触发导航');
  }
});

test('执行：?reset=demo 清演示键 + 遗留键，去参整页导航', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=demo',
    href: 'http://127.0.0.1:3000/index.html?reset=demo',
    store: PRESENT,
  });
  assert.equal(handleResetIfRequested(), true);
  const snap = ls.snapshot();
  for (const k of ['workflowos_branch_db_v1', 'gsm1921-login-user', 'sop_org_os_audit_v1', 'gsm1921-base-data-preview', 'assignment_records']) {
    assert.equal(snap[k], undefined, `demo 档应移除 ${k}`);
  }
  // ?reset=1 原口径：不动向导草稿与无关键（backward-compatible）
  assert.deepEqual(Object.keys(snap).sort(), ['page_pref_other', 'wizard-draft-br-b1', 'wizard-draft-br-other'].sort());
  assert.equal(win._replaced, 'http://127.0.0.1:3000/index.html', 'URL 去 reset 参数整页导航');
});

test('执行：?reset=1（历史别名）与 demo 同效', () => {
  const { ls, win } = stubGlobals({
    search: '?reset=1',
    href: 'http://127.0.0.1:3000/index.html?reset=1',
    store: PRESENT,
  });
  assert.equal(handleResetIfRequested(), true);
  const snap = ls.snapshot();
  assert.equal(snap.workflowos_branch_db_v1, undefined);
  assert.equal(snap['gsm1921-login-user'], undefined);
  assert.equal(snap['wizard-draft-br-b1'], PRESENT['wizard-draft-br-b1'], '别名仍不清向导草稿');
  assert.equal(win._replaced, 'http://127.0.0.1:3000/index.html');
});

test('执行：?reset=preview 只清运行时 overlay/预览键，演示数据本体保留；URL 保留其它参数去 reset', () => {
  const { ls, win } = stubGlobals({
    search: '?branch=br-b1&reset=preview',
    href: 'http://127.0.0.1:3000/wizard.html?branch=br-b1&reset=preview',
    store: PRESENT,
  });
  assert.equal(handleResetIfRequested(), true);
  const snap = ls.snapshot();
  assert.equal(snap['gsm1921-base-data-preview'], undefined, '成员预览键被清');
  assert.equal(snap['wizard-draft-br-b1'], undefined, '向导草稿被清');
  assert.equal(snap['wizard-draft-br-other'], undefined, '多支部草稿一并被清');
  for (const k of ['workflowos_branch_db_v1', 'gsm1921-login-user', 'sop_org_os_audit_v1', 'assignment_records', 'page_pref_other']) {
    assert.equal(snap[k], PRESENT[k], `preview 档不动演示/无关键 ${k}`);
  }
  assert.equal(win._replaced, 'http://127.0.0.1:3000/wizard.html?branch=br-b1', '去 reset 参数、保留 branch 参数');
});

test('执行：无 reset 参数 / 未知 reset 值 → false 不动作', () => {
  for (const qs of ['', '?reset=foo', '?reset=0']) {
    const { ls, win } = stubGlobals({
      search: qs,
      href: `http://127.0.0.1:3000/index.html${qs ? '?' + qs.slice(1) : ''}`,
      store: PRESENT,
    });
    assert.equal(handleResetIfRequested(), false, `无动作：${qs || '（无参）'}`);
    assert.deepEqual(ls.snapshot(), PRESENT);
    assert.equal(win._replaced, undefined);
  }
});
