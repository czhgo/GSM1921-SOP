// server/test/person-consistency.test.mjs
// ════════════════════════════════════════════════════════════════
//  「同一个人的信息对应」跨表一致性守卫（2026-09-13 支书裁定）
// ════════════════════════════════════════════════════════════════
//  立项依据（支书原话）：
//   ·「第一列是人的表格，意味着【人】这个数据类型的字段是很多的，我们的后台一定要做好同一个人的
//      信息对应，切忌张冠李戴！因为每一个表格都只展现了每个人的字段的子集！数据一致性的审查很重要！」
//   ·「结构+数据 双层断言！……这次做的数据一致性评议很重要！我们要推广开来！」
//
//  既有守卫的空档（普查实测）：mock-integrity 只查「引用是否存在」，roles-sync / policy-config（含原
//  policy-defaults-sync 的 T1–T5）/
//  base-data-preview 只查「口径单一源」——全仓**没有任何断言「同一 personId 的字段在各表之间取值一致」**。
//  本文件补上这个空档，并把「数据一致性评议」固化为可复用的两层方法（可推广到活动/记录等实体）。
//
//  数据层（D）——以 users 档案（data/mock/people.js）为唯一权威：
//    D1 引用存在性：各域 personId 均存在于档案（防孤儿；比"人不在表里却在表中被引用"）
//    D2 姓名快照一致：记录内 personName 必须等于档案姓名（防陈旧快照——改名/覆盖层更新后表里还是旧名）
//    D3 字段快照一致：记录内 studentId/developStage/partyGroup 快照必须等于档案对应字段
//    D4 同域双字段自洽：活动的 organizer（人 id）必须同时出现在其 assignments 的 organizer 角色里
//
//  结构层（S）——静态扫描 docs/src，防回潮：
//    S1 禁止模块加载期人员快照：模块顶层 `const X = PersonStore.getMembers();`
//       （模块只求值一次 → 成员增删后该模块内永久陈旧）；必须改用 services/member/person.js 的 liveMembers()
//    S2 禁止凭姓名认身份：`find(p => p.name === …)`（取首个命中 → 重名/改名即错配）；
//       姓名匹配只允许「先按 id、姓名仅唯一命中才采纳」的写法（见 services/activity/taskforce.js _resolveLegacyMember）
//
//  ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性，见 base-data-preview.test.mjs 注）；
//     bump 版本后本文件戳须同步（DATA_CONSISTENCY_CHECKLIST「版本戳同步」条）。
// ════════════════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20260930p';
import { MOCK_ACCOUNTS } from '../../docs/src/data/mock/accounts.js?v=20260930p';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20260930p';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20260930p';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20260930p';
import { THOUGHT_REPORTS } from '../../docs/src/data/mock/thought-reports.js?v=20260930p';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../../docs/src/data/mock/review.js?v=20260930p';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20260930p';
import { SEED_ASSIGNMENTS, SEED_SIGNUPS } from '../../docs/src/data/mock/seed.js?v=20260930p';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'docs', 'src');

/** 权威档案索引（id → 成员记录） */
const BY_ID = new Map(PEOPLE.filter(p => p && p.id).map(p => [String(p.id), p]));

/** 快照字段 → 权威档案上的同名字段（D2/D3 比对表） */
const SNAPSHOT_FIELDS = {
  personName: 'name',
  studentId: 'studentId',
  developStage: 'developStage',
  partyGroup: 'partyGroup',
};

// ════════════════════════════════════════════════════════════════
//  收集：全部「指向某个人」的引用与快照
// ════════════════════════════════════════════════════════════════

/** @returns {{refs:Array<{domain:string,where:string,personId:string}>, snaps:Array<{domain:string,where:string,personId:string,field:string,value:unknown}>}} */
function collect() {
  const refs = [];
  const snaps = [];
  /** 记一条「指向某人」的引用 */
  const ref = (domain, where, personId) => {
    if (personId === undefined || personId === null || personId === '') return;
    refs.push({ domain, where, personId: String(personId) });
  };
  /** 记记录上的档案字段快照（有才记；空值不算快照） */
  const snapshot = (domain, where, personId, record) => {
    if (personId === undefined || personId === null || personId === '') return;
    for (const f of Object.keys(SNAPSHOT_FIELDS)) {
      const v = record?.[f];
      if (v === undefined || v === null || v === '') continue;
      snaps.push({ domain, where, personId: String(personId), field: f, value: v });
    }
  };

  // 1. 活动：organizer（人 id）+ 内嵌分工 assignments[].personId
  for (const a of ACTIVITIES) {
    ref('活动', `${a.id}.organizer`, a.organizer);
    (a.assignments || []).forEach((x, i) => ref('活动分工', `${a.id}.assignments[${i}]`, x?.personId));
  }

  // 2. 考勤：personId + recordedBy（记录人）+ 组织生活会段落的 studentId/developStage/partyGroup 快照
  for (const r of ATTENDANCE_RECORDS) {
    ref('考勤', `${r.id}.personId`, r.personId);
    ref('考勤', `${r.id}.recordedBy`, r.recordedBy);
    snapshot('考勤', `${r.id}`, r.personId, r);
  }

  // 3. 考察：personId + recordedBy
  for (const r of INSPECTION_RECORDS) {
    ref('考察', `${r.id}.personId`, r.personId);
    ref('考察', `${r.id}.recordedBy`, r.recordedBy);
  }

  // 4. 思想汇报：personId + personName 快照
  for (const r of THOUGHT_REPORTS) {
    ref('思想汇报', `${r.id}.personId`, r.personId);
    snapshot('思想汇报', `${r.id}`, r.personId, r);
  }

  // 5. 复盘：organizerId / annotatedBy
  for (const r of REVIEW_RECORDS) {
    ref('活动复盘', `${r.id}.organizerId`, r.organizerId);
    ref('活动复盘', `${r.id}.annotatedBy`, r.annotatedBy);
  }
  for (const r of TASKFORCE_REVIEW_RECORDS) {
    ref('专班复盘', `${r.id}.organizerId`, r.organizerId);
    ref('专班复盘', `${r.id}.annotatedBy`, r.annotatedBy);
  }

  // 6. 专班：manager / initiator / members[].personId / progressList[].by
  for (const t of MOCK_TASKFORCES) {
    ref('专班', `${t.id}.manager`, t.manager);
    ref('专班', `${t.id}.initiator`, t.initiator);
    (t.members || []).forEach((m, i) => ref('专班成员', `${t.id}.members[${i}]`, m?.personId));
    (t.progressList || []).forEach((p, i) => ref('专班进度', `${t.id}.progressList[${i}].by`, p?.by));
  }

  // 7. 分工种子：assigneeId + createdBy
  for (const x of SEED_ASSIGNMENTS) {
    ref('分工', `${x.id}.assigneeId`, x.assigneeId);
    ref('分工', `${x.id}.createdBy`, x.createdBy);
  }

  // 8. 报名种子：personId + reviewedBy
  for (const s of SEED_SIGNUPS) {
    ref('报名', `${s.id}.personId`, s.personId);
    ref('报名', `${s.id}.reviewedBy`, s.reviewedBy);
  }

  // 9. 登录账号：personId（学号↔人员映射）
  for (const a of MOCK_ACCOUNTS) {
    ref('登录账号', `${a.studentId}`, a.personId);
  }

  return { refs, snaps };
}

// ════════════════════════════════════════════════════════════════
//  D 数据层
// ════════════════════════════════════════════════════════════════

test('D1 引用存在性：各域 personId 均存在于人员档案（防孤儿引用）', () => {
  const { refs } = collect();
  const missing = refs.filter(r => !BY_ID.has(r.personId));
  assert.deepEqual(
    missing.map(r => `${r.domain} ${r.where} → ${r.personId}`), [],
    `发现 ${missing.length} 处引用了档案中不存在的人员（张冠李戴的第一类：人已移出/改 id，表里还挂着旧 id）`,
  );
});

test('D2/D3 字段快照一致：记录内档案字段快照必须等于当前档案值（防陈旧快照）', () => {
  const { snaps } = collect();
  const bad = [];
  for (const s of snaps) {
    const person = BY_ID.get(s.personId);
    if (!person) continue; // D1 已单独断言
    const truth = person[SNAPSHOT_FIELDS[s.field]];
    if (String(truth ?? '') !== String(s.value)) {
      bad.push(`${s.domain} ${s.where}.${s.field} = ${JSON.stringify(s.value)} ≠ 档案 ${JSON.stringify(truth)}`);
    }
  }
  assert.deepEqual(bad, [],
    `发现 ${bad.length} 处记录内快照与档案不一致——同一张表显示的姓名/学号/阶段/党小组与实际档案不符`);
});

test('D4 同域自洽：活动 organizer 必须是其 assignments 中 organizer 角色之一', () => {
  const bad = [];
  for (const a of ACTIVITIES) {
    const organizers = (a.assignments || []).filter(x => x?.role === 'organizer').map(x => String(x.personId));
    if (organizers.length === 0) continue; // 未分派组织者的活动不在本断言范围
    if (!organizers.includes(String(a.organizer))) {
      bad.push(`${a.id}: organizer=${a.organizer} 不在 assignments 组织者 [${organizers.join(', ')}] 中`);
    }
  }
  assert.deepEqual(bad, [], `发现 ${bad.length} 处活动 organizer 与分工表不一致（同一人在两个字段对不上）`);
});

test('D5 登录账号：每个账号所属 personId 有且仅有唯一档案记录', () => {
  const dup = PEOPLE.filter(p => p?.id).map(p => String(p.id))
    .filter((id, i, arr) => arr.indexOf(id) !== i);
  assert.deepEqual([...new Set(dup)], [], '档案存在重复 id（同一人被拆成两条记录 = 张冠李戴的根源）');
  const bad = MOCK_ACCOUNTS.filter(a => !BY_ID.has(String(a.personId))).map(a => a.studentId);
  assert.deepEqual(bad, [], '存在指向不存在人员的登录账号');
});

// ════════════════════════════════════════════════════════════════
//  S 结构层（静态扫描）
// ════════════════════════════════════════════════════════════════

/** 递归收集 docs/src 下全部 .js（排除 mock 种子仓——种子自身即数据源，允许加载期静态展开） */
function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'mock') continue;
      walkJs(full, out);
    } else if (name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/** 该行是否为纯注释行（`//…` 或 JSDoc 续行 `*…`）——注释里可以引用反模式字样做说明，不应被拦 */
const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

test('S1 禁止模块加载期人员快照：顶层 PersonStore.getMembers() 一律改 liveMembers()', () => {
  const offenders = [];
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    if (rel === 'services/member/person.js') continue; // 定义处
    const src = readFileSync(file, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      if (isCommentLine(line)) return;
      // 仅匹配模块顶层（行首无缩进）的常量赋值；函数体内按需取值不属病灶
      if (/^const\s+\w+\s*=\s*PersonStore\.getMembers\(\)\s*;/.test(line)) {
        offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [],
    '发现模块加载期人员快照（成员增删后该模块内永久陈旧 → 表里显示的名单/字段与实际档案不符）。'
    + '请改用 services/member/person.js 的 liveMembers()：`const PEOPLE = liveMembers();`');
});

test('S2 禁止凭姓名认身份：find(p => p.name === …)（重名/改名即错配）', () => {
  const offenders = [];
  // 精确规则：仅拦「取首个命中的姓名匹配」。姓名匹配必须「先按 id，姓名仅唯一命中才采纳」
  const RE = /\.find\(\s*(p|person)\s*=>\s*\1\.name\s*===/;
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    const src = readFileSync(file, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      if (isCommentLine(line)) return; // 注释可引用反模式字样做说明
      if (RE.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [],
    '发现凭姓名取首个命中来认定身份（重名/改名即张冠李戴）。'
    + '请改为：显式 id 优先精确匹配；无 id 时姓名匹配仅在「唯一命中」时采纳，否则留空待人工核对。');
});

// ── S5 选人域唯一出口（G1 第②项，2026-09-28）───────────────────────────────
// §3.1「统一扎口」纪律：同域可以有若干实现文件，但**对外只暴露一个库文件**；
// 调用方一律 import 该库、不直连内部实现（样板：ui/forms.js · ui/badges.js · record/reporting.js）。
// 选人域＝person-picker（选人载体）+ person-edit-modal（档案编辑浮窗）⇒ 唯一出口
// = components/governance/pickers.js。两条断言：① 除库自身外全站零直连；② 库确把两名重导出（防空壳）。
test('S5 选人域唯一出口：除 governance/pickers.js 外全站不得直连实现文件（§3.1 扎口纪律）', () => {
  const LIB_REL = 'components/governance/pickers.js';
  const offenders = [];
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    if (rel === LIB_REL) continue; // 库自身
    const src = readFileSync(file, 'utf8');
    // 只看 import/export 语句（注释里引用路径做说明不算直连）
    if (/from\s+['"][^'"]*components\/governance\/(person-picker|person-edit-modal)\.js/.test(src)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, [],
    `以下文件直连选人域**实现文件**（须改从 ${LIB_REL} 导入——只改 import 来源一行，导入名不变）：\n  ${offenders.join('\n  ')}`);

  const lib = readFileSync(join(SRC_DIR, LIB_REL), 'utf8');
  assert.match(lib, /export \{ PersonPicker \} from '\.\/person-picker\.js/,
    'pickers.js 须重导出 PersonPicker（防空壳库）');
  assert.match(lib, /export \{ openPersonEditModal \} from '\.\/person-edit-modal\.js/,
    'pickers.js 须重导出 openPersonEditModal（防空壳库）');
});

test('S6 徽章域唯一出口：除 ui/badges.js 外全站不得直连 badge.js / status-badge.js（§3.1 扎口纪律）', () => {
  // 2026-09-30 批次 304 立。同 S5 的纪律，只是换域——S5 的注释把 ui/badges.js 点名为**样板**，
  // 但当时只对选人域立了判据 ⇒ 徽章域长期「有纪律无守卫」。
  // 实证（本批自查）：批次 301 我在 3 个调用点直连了实现文件 badge.js（today-tab / group-progress-tab /
  //   archive-tab），全套测试**一处未报**——因为 badges.js 文件头那句「调用方一律 import badges.js」
  //   只是注释。本守卫把该句变成机检判据。
  const LIB_REL = 'components/ui/badges.js';
  const offenders = [];
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    if (rel === LIB_REL) continue; // 库自身（它就该重导出实现文件）
    const src = readFileSync(file, 'utf8');
    // 只看 import/export 语句（注释里用反引号引用路径做说明不算直连）
    if (/from\s+['"][^'"]*components\/ui\/(badge|status-badge)\.js/.test(src)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, [],
    `以下文件直连徽章域**实现文件**（须改从 ${LIB_REL} 导入——只改 import 来源一行，导入名不变）：\n  ${offenders.join('\n  ')}`);

  // 防空壳：库确把两个实现文件重导出（照 S5 的同一体例）
  const lib = readFileSync(join(SRC_DIR, LIB_REL), 'utf8');
  assert.match(lib, /export \{ badgeHtml, badgeVariantClass \} from '\.\/badge\.js/,
    'badges.js 须重导出 badgeHtml / badgeVariantClass（防空壳库）');
  assert.match(lib, /export \{ statusBadgeHtml, bindStatusBadge \} from '\.\/status-badge\.js/,
    'badges.js 须重导出 statusBadgeHtml / bindStatusBadge（防空壳库）');
});

test('S3 单一解析源在位：person.js 导出 liveMembers（S1 规则的落点）', () => {
  const src = readFileSync(join(SRC_DIR, 'services', 'member', 'person.js'), 'utf8');
  assert.match(src, /export function liveMembers\s*\(/, 'services/member/person.js 必须导出 liveMembers()（人员清单实时视图）');
});

test('S4 RESIDENCE 单一源：全站只允许 core/domain/constants.js 一处定义（Q-21-3 防回潮）', () => {
  // 病灶（2026-09-13 收敛前）：services/member/roster.js 与 services/branch/org-base-data-preview.js 各写一份同值
  //   { CAMPUS:'在校', DETAINED:'滞留' }——preview 不能 import roster（person→preview→roster 成环），
  //   于是「为避免循环依赖」长期默认两处维护、仅靠单测断言同值。现收敛至无 import 的叶子模块
  //   core/domain/constants.js，本守卫拦「再长出第二份定义」。
  const defs = [];
  for (const file of walkJs(SRC_DIR)) {
    const rel = file.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (isCommentLine(line)) return; // 注释里可引用该定义做说明
      if (/^\s*export\s+const\s+RESIDENCE\s*=/.test(line)) defs.push(rel);
    });
  }
  assert.deepEqual(defs, ['core/domain/constants.js'],
    'RESIDENCE 只允许在 core/domain/constants.js 定义一次；roster.js / org-base-data-preview.js 等一律 import 该单一源'
    + '（防循环依赖说明见 constants.js 该常量注释）');
  // 两个原定义点必须仍在消费（防「守卫绿了但模块不认这个枚举」的假绿）
  for (const rel of ['services/member/roster.js', 'services/branch/org-base-data-preview.js']) {
    const src = readFileSync(join(SRC_DIR, rel), 'utf8');
    assert.match(src, /import \{[^}]*\bRESIDENCE\b[^}]*\} from '(\.\.\/)+core\/domain\/constants\.js/,
      `${rel} 必须从 core/domain/constants.js 导入 RESIDENCE（2026-09-28 目录分层后两文件均在二级目录 ⇒ 相对路径为 ../../core/constants.js）`);
  }
});
