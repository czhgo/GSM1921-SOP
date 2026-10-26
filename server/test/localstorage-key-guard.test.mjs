// server/test/localstorage-key-guard.test.mjs — 「浏览器存储键必须登记」守卫（2026-09-24 批次 169）
// ════════════════════════════════════════════════════════════════
// 来源（支书逐字）：「我们必须把网页升级成系统！！【**浏览器缓存固然有用但不能什么都依靠浏览器缓存！！**】」
// 判据（去缓存化审计给出的判据 3.5-2）：**枚举全仓 localStorage / sessionStorage 的键字面量，
//   断言 键 ⊆ 已知映射**——映射分三档：
//     A. **服务端权威**（server-authoritative）：该键的真相在服务端表 / 快照；本机键只是镜像 / 缓存 /
//        mock 形态的对应物（清了不丢数据，或清了只是回到服务端值）。
//        消费点：`server/db.js` 的 `RESOURCE_TABLES` / `SEMANTIC_TABLES` 与 `server/routes/**` 端点。
//     B. **本机临时白名单**（local-only）：语义上**就应当只在本机**（草稿 / 预览 / mock 形态专属 / 设计如此）——
//        硬搬服务端反而错（如未提交草稿、预览只是「本地看效果」）。逐条写明「为什么不上服务端」。
//        落点见 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 的「浏览器存储键白名单」表。
//     C. **UI 偏好与会话**（ui-pref-session）：主题 / 字号 / 强调色 / 个人偏好前缀 / 登录会话 / 标签页 / 令牌。
//    ⇒ **任何新键若未进这三档之一 ⇒ 红灯**，并给出「请登记到白名单或改为服务端权威」的提示。
//
// 为什么要有这道守卫（长期防线）：本次「去缓存化」把四处「只有本机一份」的域搬上了服务端；但**制度靠守卫**——
//   没有它，下一次「先落个 localStorage 再说」会悄悄回潮，「什么都依靠浏览器缓存」的老病会复发。
//
// 抽取口径（**可解释、可复核**，不过宽也不过窄）：
//   ⓐ **存储调用字面量**：`(local|session)Storage.(get|set|remove)Item('…')` 的实参——无论命名空间一律收录；
//   ⓑ **键名常量的字面量**：形如 `X_KEY = '…'` / `X_PREFIX = '…'` / `storageKey: '…'` 的字符串——
//      这是本仓的主流写法（如 `export const RESIDENCE_KEY = 'gsm1921-residence-overrides'`），
//      只抽 ⓐ 会漏掉绝大多数键。
//   例外：`*_ACTION_KEY`（业务动作键，非存储键）按 `NON_STORAGE_CONST_NAMES` 逐条排除并给理由（防僵尸）。
//   ⚠ 覆盖边界（如实标注，不假装覆盖）：以**变量间接引用**的键（如 `localStorage.getItem(someVar)` 且该变量
//      既非 `*_KEY` 常量、也非存储调用实参）**不在本守卫射程**——那一半只能靠人读。
//
// 运行：`node --test server/test/localstorage-key-guard.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// Task 2.2（2026-10-26）：浏览器存储键的四类单一源（visual / auth / read-cache / temp）。
import {
  CACHE_KEYS, CACHE_KEY_PREFIXES, CACHE_CATEGORIES, classifyCacheKey,
  validateBackupPayload, BACKUP_META, NICHE_COLLECTION_NAMES,
} from '../../docs/src/data/cache-registry.js?v=20261026a';

const ROOT = join(import.meta.dirname, '..', '..');

/** 扫描根（源码；**不含** `server/test`：测试里出现的键是「引用」而非「新键」） */
const SCAN_DIRS = [
  join(ROOT, 'docs', 'src'),
  join(ROOT, 'docs', 'scripts'),
  join(ROOT, 'server', 'routes'),
];
/** 额外逐个扫的根目录文件（内联脚本里可能也写存储键） */
const SCAN_FILES = (() => {
  const out = [];
  try {
    for (const n of readdirSync(join(ROOT, 'docs'))) {
      if (n.endsWith('.html')) out.push(join(ROOT, 'docs', n));
    }
  } catch (_) { /* 目录缺失：跳过 */ }
  for (const n of ['server/app.js', 'server/db.js', 'server/seed.js']) {
    const f = join(ROOT, n);
    if (existsSync(f)) out.push(f);
  }
  return out;
})();

const SKIP_DIRS = new Set(['node_modules', '.git', '.trae', '.vscode', 'assets']);

// ════════════════════════════════════════════════════════════════
//  三档已知映射（键 → 语义；**逐条给理由**）
// ════════════════════════════════════════════════════════════════

/** A 档：服务端权威（本机键＝镜像 / 缓存 / mock 形态对应物；清了不丢真相） */
const SERVER_AUTHORITATIVE = {
  'workflowos_branch_db_v1': 'mock 形态的整库落盘；api 形态真相在服务端快照与各业务表（mock-adapter.js）',
  'gsm1921-residence-overrides': '在册/滞留状态；api 形态以服务端 users 行（residenceStatus/Note/History）为唯一权威（2026-09-24 批次 169 单轨化；services/member/roster.js）',
  'gsm1921-member-confirmations': '成员变更确认队列；服务端表 member_confirmations（2026-09-23 批次 163 服务端化；services/member/member-confirmation.js）',
  'gsm1921-attendance-appeals': '出勤申诉队列；服务端表 attendance_appeals（2026-09-24 批次 169；services/activity/attendance.js）',
  'gsm1921-inspection-appeals': '考察申诉队列；服务端表 inspection_appeals（2026-09-24 批次 169；services/activity/inspection.js）',
  'sop_org_os_auth_audit': '授权审计留痕；服务端表 auth_audit（2026-09-24 批次 169；services/core/auth.js）',
  'gsm1921-issue-cache-v3': '意见反馈读缓存；服务端 issues 表为权威（services/governance/issues.js）',
  'gsm1921-issue-cache': '意见反馈旧缓存键（历史版本；reactions.js 仍写、init-reset 清除）——真相同上游 issues 表',
  'gsm1921-issue-cache-version': '上条缓存的版本号（缓存失效用，非数据本体）',
  'gsm1921-feedback-migrated': '反馈迁移标记（一次性迁移用；迁移的是种子，非用户数据）',
  'gsm1921-feedback-submissions': '旧版反馈本地提交件（迁移源；migrateFeedbackSubmissions 处理后清除）',
  'issue_reveals': '匿名反馈揭名的历史留痕；当前系统已关闭揭名入口，仅保留历史记录（服务端表 issue_reveals）',
  'gsm1921-milestone-cache': '批次里程碑读缓存；服务端表 milestones（内容单一源 docs/data/milestones.json，seed.js 播种；services/governance/milestones.js）',
  'workflowos_taskforces_v1': '专班旧单域键（已被整库键 workflowos_branch_db_v1 取代；taskforces 是服务端资源表）',
  'workflowos_notices_v1': '通知旧单域键（同上；notices 是服务端资源表）',
};

/** B 档：本机临时白名单（**就应当只在本机**——逐条写明为何不上服务端） */
const LOCAL_ONLY = {
  'gsm1921-base-data-preview': '本机临时·预览：换组织前「本地看效果」，绝不写 mockDB / 种子 / 服务器（org-base-data-preview.js）——服务端化会把「看效果」变成「真改数据」',
  'gsm1921-issue-drafts': '本机临时·草稿：未提交的反馈/评论草稿不得保存真实身份；旧草稿读取时迁除身份字段（services/governance/issues.js）',
  'gsm1921-workforce-draft': '本机临时·草稿：支书台「拟定分工」未提交内容，属该设备上未完成的工作（entries/tabs/secretary/workforce-panel.js）',
  'workflowos_leader_activity_draft': '本机临时·草稿：组长「写入活动」未提交的表单暂存（刷新恢复用；entries/tabs/leader/write-tab.js）',
  'gsm1921-members-overlay': 'mock 形态专属：成员档案覆盖层；api 形态读链走 server users、写走 /members* 端点 ⇒ 无需服务端化（services/member/person.js）',
  'gsm1921-accounts': 'mock 形态专属：可持久化账号层；api 形态账号承载＝server users 表行（services/core/accounts.js）',
  'gsm1921-dev-stage-overrides': '**2026-09-28 已服务端化**：事实改挂成员档案字段 `developStageSince`（服务端权威、跨设备可读）；本键降级为**遗留键**——代码中仅剩「init 档移除清单 / 清一次存储残留」引用，不再有业务读写',
  'gsm1921-issue-submitter-token': '设计如此·本机令牌：随机不可反查人的防刷令牌（仅判重/限频用），按设计只在本设备（services/governance/issues.js）',
  'gsm1921-init-state': '本机·初始化态闸门：本标签页「正在初始化」的内存语义落盘位，非业务数据（services/core/init-reset.js）',
  'gsm1921-pending-writes-outbox': '本机临时·失败待同步队列：只存集合名/错误码/时间（不存业务数据），用于「未同步」可见提示与重试/放弃；真相始终在服务端（core/session/pending-writes.js，Task 3 2026-10-26）',
};

/** C 档：UI 偏好与会话 */
const UI_PREF_SESSION = {
  'workflowos_theme': 'UI 偏好·主题',
  'workflowos_font_size': 'UI 偏好·字号',
  'workflowos_accent_role': 'UI 偏好·强调色',
  'gsm1921-api-token': '会话·API token（sessionStorage）',
  'gsm1921-login-user': '会话·登录人（localStorage 兜跨标签）',
  'gsm1921-tab-id': '会话·本标签页唯一 ID（sessionStorage）',
  'gsm1921-session-snap': '会话·本标签页登录会话快照（sessionStorage）',
  'sop_org_os_session': '会话·跨页状态会话（core/session/cross-page-state.js）',
  'sop_org_os_data_version': '会话·跨页数据版本（同上）',
  'gsm1921-remote-probe': 'UI 偏好·远端变更探测开关（data-adapter.js；off/0/false＝关）',
  'sop_org_os_assigned_roles': '历史遗留键·仅启动清理（roles.js 已无调用方，留一次 removeItem）',
};

/** 前缀型键（末尾的 `-`/`_` 即前缀语义；以 `startsWidth` 判定） */
const SERVER_AUTHORITATIVE_PREFIXES = {
  'gsm1921-issue-unread-': '逐人未读标记；服务端表 issue_unread（2026-09-24 批次 169；services/governance/issues.js）',
};
const LOCAL_ONLY_PREFIXES = {
  'wizard-draft-': '本机临时·草稿：换组织向导未走完的草稿，按支部一份（components/governance/org-setup-wizard.js）',
};
const UI_PREF_SESSION_PREFIXES = {
  'gsm1921-pref-': 'UI 偏好·个人偏好键空间（theme.js / preferences.js）',
  'cps-': '会话·跨页单值参数前缀（core/session/cross-page-state.js）',
  'workflowos_tab_': 'UI 偏好·工作台页签记忆（各 ws-*-entry.js 的 storageKey）',
};

/** 非存储键的常量例外（逐条给理由；`*_ACTION_KEY` 是业务动作键，不落存储） */
const NON_STORAGE_CONST_NAMES = {
  RESOLUTION_FOLLOWUP_ACTION_KEY: '待办「决议跟进」动作键（todo.actionKey），不写 localStorage/sessionStorage（services/governance/resolution-followup.js）',
  MODULE_CYCLE_ACTION_KEY: '待办「模块周期提醒」实时组动作键（todo.actionKey / 实时组 actionKey），不写 localStorage/sessionStorage（services/governance/todo.js，2026-10-06 批次 423）',
};

// ════════════════════════════════════════════════════════════════
//  抽取
// ════════════════════════════════════════════════════════════════

/** 递归收集扫描面内的 .js / .mjs / .html */
function walk(dir, out = []) {
  let names;
  try { names = readdirSync(dir); } catch (_) { return out; }
  for (const n of names) {
    if (SKIP_DIRS.has(n)) continue;
    const f = join(dir, n);
    let st;
    try { st = statSync(f); } catch (_) { continue; }
    if (st.isDirectory()) { walk(f, out); continue; }
    if (/\.(js|mjs|html)$/.test(n)) out.push(f);
  }
  return out;
}

const FILES = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES.filter(existsSync)];

/** 该行是否纯注释行（注释里可以引用键做说明，不算「使用」） */
const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

/** 直接字面量实参：`localStorage.getItem('k')` 等 */
const CALL_LITERAL_RE = /(?:local|session)Storage\.(?:getItem|setItem|removeItem)\(\s*'([^']+)'/g;
/** 键名常量的字面量：`X_KEY = 'k'` / `X_PREFIX = 'k'` / `storageKey: 'k'` */
const CONST_LITERAL_RE = /\b([A-Za-z_$][\w$]*)\s*(?:=|:)\s*'([^']+)'/g;

/**
 * 抽取全仓「键字面量」。
 * @returns {{callKeys:Map<string,string[]>, constKeys:Map<string,string[]>, nonStorage:Set<string>}}
 */
function collectKeys() {
  const callKeys = new Map();   // key → 出现处（`file:line`）
  const constKeys = new Map();  // key → 出现处（`file:line`）
  const nonStorage = new Set(); // 被例外排除的常量名（须真实存在，防僵尸）
  for (const file of FILES) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (isCommentLine(line)) return;
      const where = `${rel}:${i + 1}`;
      for (const m of line.matchAll(CALL_LITERAL_RE)) {
        const k = m[1];
        if (!callKeys.has(k)) callKeys.set(k, []);
        callKeys.get(k).push(where);
      }
      for (const m of line.matchAll(CONST_LITERAL_RE)) {
        const name = m[1], k = m[2];
        if (!/(^|_)(KEY|PREFIX|STORAGE_KEY)$/.test(name) && !/^storageKey$/.test(name)) continue;
        if (Object.prototype.hasOwnProperty.call(NON_STORAGE_CONST_NAMES, name)) { nonStorage.add(name); continue; }
        if (!constKeys.has(k)) constKeys.set(k, []);
        constKeys.get(k).push(where);
      }
    });
  }
  return { callKeys, constKeys, nonStorage };
}

const { callKeys, constKeys, nonStorage } = collectKeys();

/** 全部候选键（调用字面量 ∪ 常量字面量） */
const ALL_KEYS = [...new Set([...callKeys.keys(), ...constKeys.keys()])].sort();

/** 三档归类（含前缀档） */
function classify(key) {
  if (SERVER_AUTHORITATIVE[key]) return { tier: 'A 服务端权威', why: SERVER_AUTHORITATIVE[key] };
  if (LOCAL_ONLY[key]) return { tier: 'B 本机临时白名单', why: LOCAL_ONLY[key] };
  if (UI_PREF_SESSION[key]) return { tier: 'C UI 偏好与会话', why: UI_PREF_SESSION[key] };
  for (const p of Object.keys(SERVER_AUTHORITATIVE_PREFIXES)) if (key.startsWith(p)) return { tier: 'A 服务端权威（前缀）', why: SERVER_AUTHORITATIVE_PREFIXES[p] };
  for (const p of Object.keys(LOCAL_ONLY_PREFIXES)) if (key.startsWith(p)) return { tier: 'B 本机临时白名单（前缀）', why: LOCAL_ONLY_PREFIXES[p] };
  for (const p of Object.keys(UI_PREF_SESSION_PREFIXES)) if (key.startsWith(p)) return { tier: 'C UI 偏好与会话（前缀）', why: UI_PREF_SESSION_PREFIXES[p] };
  return null;
}

// ════════════════════════════════════════════════════════════════
//  断言
// ════════════════════════════════════════════════════════════════

test('L1 全仓 localStorage / sessionStorage 键字面量 ⊆ 已知映射（未登记即红）', () => {
  const unregistered = ALL_KEYS.filter((k) => !classify(k));
  // 逐键列出归类（三档各多少、分别是哪些键）——把结果打进 console，便于复核
  const byTier = new Map();
  for (const k of ALL_KEYS) {
    const c = classify(k);
    const tier = c ? c.tier.split('（')[0] : 'UNREGISTERED';
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(k);
  }
  console.log('[localstorage-key-guard] 全仓键字面量归类（共 %d 个键）：', ALL_KEYS.length);
  for (const [tier, keys] of [...byTier.entries()].sort()) {
    console.log(`  · ${tier}：${keys.length} 个 → ${keys.join(', ')}`);
  }
  assert.deepEqual(
    unregistered.map((k) => `${k}（出现处：${[...(callKeys.get(k) || []), ...(constKeys.get(k) || [])].join(' / ')}）`), [],
    '发现**未登记的浏览器存储键**——请二选一：\n'
    + '  ① 若它的真相应当由服务端承载（可被他人 / 其他设备读到）⇒ **改为服务端权威**'
    + '（照 server/db.js::SEMANTIC_TABLES + server/routes/resources/semantic-routes.js 的「语义端点域」模板）；\n'
    + '  ② 若它**确实只应在本机**（草稿 / 预览 / mock 专属 / 偏好）⇒ **登记到白名单**'
    + '（本文件的三档映射 + content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md 的「浏览器存储键白名单」表），'
    + '并逐条写明「为什么不上服务端」。',
  );
});

test('L2 白名单非空转 + 无僵尸登记（映射里的每个键都得真在代码里出现）', () => {
  const declared = [
    ...Object.keys(SERVER_AUTHORITATIVE), ...Object.keys(LOCAL_ONLY), ...Object.keys(UI_PREF_SESSION),
  ];
  assert.ok(declared.length >= 20, `三档映射只登记了 ${declared.length} 个键（下限 20）：映射被删空，L1 会变成恒真`);
  const all = new Set(ALL_KEYS);
  const zombie = declared.filter((k) => !all.has(k));
  assert.deepEqual(zombie, [],
    `以下键已不在代码中出现（僵尸登记，请从映射里删除）：\n  ${zombie.join('\n  ')}`);
  // 前缀档同样不得僵尸
  const prefixes = [
    ...Object.keys(SERVER_AUTHORITATIVE_PREFIXES), ...Object.keys(LOCAL_ONLY_PREFIXES), ...Object.keys(UI_PREF_SESSION_PREFIXES),
  ];
  const zombiePrefix = prefixes.filter((p) => !ALL_KEYS.some((k) => k.startsWith(p)));
  assert.deepEqual(zombiePrefix, [], `以下前缀已无任何键命中（僵尸登记）：\n  ${zombiePrefix.join('\n  ')}`);
  // 常量例外名单不得僵尸化，且不得悄悄变宽
  const zombieExc = Object.keys(NON_STORAGE_CONST_NAMES).filter((n) => !nonStorage.has(n));
  assert.deepEqual(zombieExc, [], `NON_STORAGE_CONST_NAMES 里的常量已不存在（僵尸例外，请删除）：\n  ${zombieExc.join('\n  ')}`);
  assert.ok(Object.keys(NON_STORAGE_CONST_NAMES).length <= 2,
    `NON_STORAGE_CONST_NAMES 涨到 ${Object.keys(NON_STORAGE_CONST_NAMES).length} 条（上限 2）：例外只许逐条给理由、不许悄悄变宽`);
});

test('L3 抽取口径有基线（防正则失效 → 一个键都抽不到 → 断言恒真）', () => {
  assert.ok(FILES.length >= 40, `只扫到 ${FILES.length} 个文件（基线 40）：扫描面被改坏，L1 会变成恒真`);
  assert.ok(callKeys.size >= 8, `存储调用字面量只抽到 ${callKeys.size} 个键（基线 8）：ⓐ 口径失效`);
  assert.ok(constKeys.size >= 15, `键名常量字面量只抽到 ${constKeys.size} 个键（基线 15）：ⓑ 口径失效`);
});

// ════════════════════════════════════════════════════════════════
//  Task 2.2 / 2.5（2026-10-26）：缓存键四类清单 ＋ 缓存边界断言
// ════════════════════════════════════════════════════════════════
//  口径（spec「浏览器缓存边界」）：只允许纯展示偏好长期留在浏览器；业务读缓存必须带集合版本；
//  auth 键不得承载业务数据。四类单一源＝`docs/src/data/cache-registry.js`。

const readSource = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 归类一个键集合中的未登记项（供 L4 与故障注入共用） */
const unregisteredOf = (keys) => keys.filter((k) => classifyCacheKey(k) === CACHE_CATEGORIES.UNKNOWN);

test('L4 全仓存储键必须落入四类清单（未登记 ⇒ unknown ⇒ 红）', () => {
  const unregistered = unregisteredOf(ALL_KEYS);
  assert.deepEqual(
    unregistered.map((k) => `${k}（出现处：${[...(callKeys.get(k) || []), ...(constKeys.get(k) || [])].join(' / ')}）`), [],
    '发现**未登记到 cache-registry 的浏览器存储键**——请先在 `docs/src/data/cache-registry.js` 的 '
    + '`CACHE_KEYS` / `CACHE_KEY_PREFIXES` 登记类别与理由（visual / auth / read-cache / temp），'
    + '模板键（如 `gsm1921-pref-<id>-theme`）用前缀规则登记，不得用宽泛正则放过。',
  );
  // 非空转：四类都必须真实存在，否则「登记」会退化成全塞一类
  const seen = new Set(ALL_KEYS.map((k) => classifyCacheKey(k)));
  for (const c of [CACHE_CATEGORIES.VISUAL, CACHE_CATEGORIES.AUTH, CACHE_CATEGORIES.READ_CACHE, CACHE_CATEGORIES.TEMP]) {
    assert.ok(seen.has(c), `四类清单里的 ${c} 一个键都没命中：分类已失效`);
  }
});

test('L5 registry 不得有僵尸登记（精确键须真在代码出现；前缀须至少命中一个键）', () => {
  const all = new Set(ALL_KEYS);
  const zombie = Object.keys(CACHE_KEYS).filter((k) => !all.has(k));
  assert.deepEqual(zombie, [], `cache-registry 的以下精确键已不在代码中出现（僵尸登记，请删除）：\n  ${zombie.join('\n  ')}`);
  const zombiePrefix = CACHE_KEY_PREFIXES.filter((rule) => !ALL_KEYS.some((k) => k.startsWith(rule.prefix)));
  assert.deepEqual(zombiePrefix.map((r) => r.prefix), [], `cache-registry 的以下前缀已无任何键命中（僵尸登记）：\n  ${zombiePrefix.map((r) => r.prefix).join('\n  ')}`);
});

test('L6 visual 键白名单：只允许主题 / 字号 / 强调色 / 页签顺序 / UI 偏好开关', () => {
  const EXPECTED_VISUAL = [
    'gsm1921-remote-probe', // 探测开关（UI 偏好，默认开）
    'workflowos_accent_role',
    'workflowos_font_size',
    'workflowos_theme',
  ];
  const visual = Object.keys(CACHE_KEYS).filter((k) => CACHE_KEYS[k].category === CACHE_CATEGORIES.VISUAL);
  assert.deepEqual(visual.sort(), EXPECTED_VISUAL.sort(),
    'visual 类只允许纯展示 / UI 偏好键——业务键不得混入 visual（否则「清缓存后业务仍在」会被本地缓存冒充）');
  // 模板键：逐人外观偏好与页签记忆必须走前缀规则（不是正则放过）
  for (const k of ['gsm1921-pref-2400012349-theme', 'gsm1921-pref-2400012349-tab-order-secretary', 'workflowos_tab_secretary']) {
    assert.equal(classifyCacheKey(k), CACHE_CATEGORIES.VISUAL, `${k} 应归入 visual（前缀规则）`);
  }
  assert.equal(classifyCacheKey('gsm1921-unregistered-visual-probe'), CACHE_CATEGORIES.UNKNOWN,
    '未登记键必须返回 unknown（visual 白名单不得靠前缀误收）');
});

test('L7 业务读缓存备份必须带 `_versions` + `savedAt`，缺版本 / 过期 / 版本不一致 ⇒ 不得当权威', () => {
  const mockSrc = readSource('docs/src/data/mock-adapter.js');
  assert.equal(BACKUP_META.VERSIONS, '_versions', '备份版本字段名必须与服务端集合版本协议同名（`_versions`）');
  assert.equal(BACKUP_META.SAVED_AT, 'savedAt', '备份落盘时间字段名必须为 `savedAt`');
  assert.match(mockSrc, /\[BACKUP_META\.VERSIONS\]/, '`_saveToStorage` 必须写入 `_versions`（业务读缓存备份的版本）');
  assert.match(mockSrc, /\[BACKUP_META\.SAVED_AT\]/, '`_saveToStorage` 必须写入 `savedAt`（业务读缓存备份的落盘时间）');
  assert.match(mockSrc, /validateBackupPayload\(/, '读取本地备份时必须校验版本/时效（restoreNicheCollections）');
  assert.equal(classifyCacheKey('workflowos_branch_db_v1'), CACHE_CATEGORIES.READ_CACHE,
    '整库本地备份属于 read-cache，不得混入 visual');

  const now = Date.parse('2026-10-26T00:00:00Z');
  const expectedVersions = { activities: 3, notices: 7 };
  const ok = validateBackupPayload(
    { _versions: { activities: 3, notices: 7 }, savedAt: '2026-10-25T23:59:00Z', activities: [] },
    { expectedVersions, now },
  );
  assert.equal(ok.ok, true, `版本一致且未过期的备份应可用（实测 ${JSON.stringify(ok)}）`);
  const missing = validateBackupPayload({ activities: [], savedAt: '2026-10-25T23:59:00Z' }, { expectedVersions, now });
  assert.equal(missing.ok, false, '**删掉 `_versions` 必须判红**——旧备份不得当权威');
  assert.equal(missing.reason, 'missing-versions');
  const stale = validateBackupPayload(
    { _versions: { activities: 2, notices: 7 }, savedAt: '2026-10-25T23:59:00Z' },
    { expectedVersions, now },
  );
  assert.equal(stale.ok, false, '集合版本落后于服务端时必须判红（须从服务端重拉）');
  assert.match(stale.reason || '', /^stale:/);
  const expired = validateBackupPayload(
    { _versions: { activities: 3, notices: 7 }, savedAt: '2026-10-24T00:00:00Z' },
    { expectedVersions, now },
  );
  assert.equal(expired.ok, false, '超过有效期的备份必须判红（不得把陈年备份当权威）');
  assert.equal(expired.reason, 'expired');
});

test('L8 auth 键不得承载业务数据（token 只进 sessionStorage；auth 键与业务集合不相交）', () => {
  const authKeys = Object.keys(CACHE_KEYS).filter((k) => CACHE_KEYS[k].category === CACHE_CATEGORIES.AUTH);
  const businessNames = new Set([
    ...NICHE_COLLECTION_NAMES,
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces',
    'notices', 'todos', 'assignments', 'makeupTasks', 'users',
  ]);
  const overlap = authKeys.filter((k) => businessNames.has(k));
  assert.deepEqual(overlap, [], `auth 键不得是业务集合键：${overlap.join(', ')}`);
  // API token 只允许写 sessionStorage（硬约束：不得写 localStorage）
  const localTokenWrites = FILES.filter((f) => /localStorage\.setItem\(\s*'gsm1921-api-token'/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(localTokenWrites.map((f) => f.slice(ROOT.length + 1).replace(/\\/g, '/')), [],
    'API token 不得写入 localStorage（只允许 sessionStorage）');
  assert.equal(classifyCacheKey('gsm1921-api-token'), CACHE_CATEGORIES.AUTH);
  assert.equal(classifyCacheKey('gsm1921-login-user'), CACHE_CATEGORIES.AUTH);
});

test('L9 故障注入：新增未登记键 / 删掉备份版本，都必须红', () => {
  // ① 模拟「有人在 docs/src 新增了一个字面键但没登记」⇒ 分类为 unknown
  assert.deepEqual(unregisteredOf(['gsm1921-login-user', 'gsm1921-fault-injected-store']),
    ['gsm1921-fault-injected-store'], '新增未登记键必须被判为 unknown');
  // ② 模拟「备份写入时删掉 `_versions`」⇒ 校验失败
  const verdict = validateBackupPayload(
    { savedAt: new Date().toISOString(), activities: [] },
    { expectedVersions: { activities: 1 } },
  );
  assert.equal(verdict.ok, false, '删掉 `_versions` 的备份必须判红');
  assert.equal(verdict.reason, 'missing-versions');
});

test('L10 读口拒收缺版本 / 过期备份（restoreNicheCollections 返回 false，由调用方重拉）', async () => {
  const prev = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => { store.delete(String(k)); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  try {
    const { restoreNicheCollections } = await import('../../docs/src/data/mock-adapter.js?v=20261026a');
    store.set('workflowos_branch_db_v1', JSON.stringify({ activities: [{ id: 'stale' }] }));
    assert.equal(restoreNicheCollections({ expectedVersions: { activities: 1 } }), false,
      '缺 `_versions` 的本地备份不得被采用（否则旧备份会被当成服务端权威）');
    store.set('workflowos_branch_db_v1', JSON.stringify({
      _versions: { activities: 1 }, savedAt: new Date().toISOString(), experienceDeposits: [{ id: 'ed-1' }],
    }));
    assert.equal(restoreNicheCollections({ expectedVersions: { activities: 1 } }), true,
      '版本一致且未过期的备份应可作临时镜像');
  } finally {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  }
});
