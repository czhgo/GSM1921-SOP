// server/test/party-group.test.mjs — 党小组一等实体（2026-09-14 批次 25）
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S3：静态扫描防回潮（写死组名清单 / 三处原硬编码收敛 / 核心组显式声明）
//   数据层 D1–D6：服务层口径断言（活组清单、命名与重名、改名与解散的成员侧联动、未分组口径、写权）
// node-only（不启浏览器）：纯服务层 + 静态扫描。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const V = '?v=20260921b';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(ROOT, 'docs', 'src');
const CAP_DIR = join(SRC_DIR, 'modules', 'capabilities');

// ── localStorage 内存桩（照 base-data-preview.test.mjs 既有做法）──
// 成员档案写口 PersonStore.saveMember 在 mock 形态下要求 localStorage 可用，否则返回
// {ok:false, reason:'本地存储不可用，未保存'} → 改名/解散的「成员侧批量改写」在 node 下会静默不生效。
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
};

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const rel = (f) => f.slice(SRC_DIR.length + 1).replace(/\\/g, '/');
const read = (f) => readFileSync(f, 'utf8');

// ── 结构层 ──────────────────────────────────────────────────────────

test('S1 全站不得写死组名清单（白名单＝种子/档案语料/演示注释）', () => {
  // 病灶：原三处写死清单（支书台赋权管理的组清单、组长建活动的承办组选项、演示用户域）只认种子里的三组，
  //   新增的组进不了下拉、被解散的组仍在选项里 → 清单必须来自党小组实体（groupOptions()）。
  const ALLOW = new Set([
    'mock/party-groups.js',      // 种子（唯一原始来源）
    'mock/people.js',            // 成员档案语料（partyGroup 取值）
    'mock/activities.js',        // 活动语料（hostGroup 取值）
    'mock/attendance.js',        // 考勤语料（partyGroup 快照）
    'services/todo.js',          // 待办种子文案（「设置第三党小组组长」）
    'core/domain.js',            // 演示用户域（u_leader_N 名称文案，非清单判定源）
  ]);
  const offenders = [];
  const re = /\[[^\]]*'第[一二三四五六七八九十]党小组'[^\]]*\]/;
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    if (ALLOW.has(r)) continue;
    read(f).split(/\r?\n/).forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // 注释里的历史说明不算
      if (re.test(line)) offenders.push(`${r}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], '组名数组字面量只允许出现在种子/语料白名单文件；业务代码一律用 groupOptions()');
});

test('S2 三处原硬编码点已收敛到活组清单', () => {
  const assign = read(join(SRC_DIR, 'entries', 'tabs', 'secretary', 'assign-tab.js'));
  assert.ok(!/const PARTY_GROUPS\s*=\s*\[/.test(assign), '支书台赋权管理不得再写死组清单');
  assert.match(assign, /groupOptions\(\)/, '赋权管理的组清单须取 groupOptions()');

  const dt = read(join(SRC_DIR, 'services', 'decision-tree.js'));
  assert.ok(!/HOST_GROUPS\s*:\s*\[/.test(dt), '组长建活动的承办组选项不得写死');

  const write = read(join(SRC_DIR, 'entries', 'tabs', 'leader', 'write-tab.js'));
  assert.match(write, /groupOptions\(\)/, '组长建活动承办组须取 groupOptions()');

  const roster = read(join(SRC_DIR, 'entries', 'tabs', 'org', 'roster-tab.js'));
  assert.match(roster, /groupOptions\(\)/, '成员名册的党小组下拉须取 groupOptions()');
});

test('S3 核心组由注册表显式声明（不再以显示标签反推）', () => {
  // 2026-09-14：原判据写死为「groupLabel 内容为工作台」，改标签文案会悄悄改动权限语义（可隐藏性）；
  //   党委台只能改名「首页」再靠整台豁免绕开 → 一物两名。现改 coreTab 显式声明，判定单一源 = isCoreTab。
  const shell = read(join(SRC_DIR, 'components', 'workspace-shell.js'));
  assert.ok(!/groupLabel\s*===\s*'工作台'/.test(shell), 'workspace-shell 不得再以标签反推核心组');
  const prefs = read(join(SRC_DIR, 'services', 'preferences.js'));
  assert.ok(!/groupLabel\s*===\s*CORE_GROUP_LABEL/.test(prefs) && !/CORE_GROUP_LABEL\s*=/.test(prefs),
    'preferences 不得再自持核心组标签判定（须共用 constants.js::isCoreTab）');
  assert.match(prefs, /isCoreTab/, 'preferences 须 import 单一源判定');

  const branches = read(join(SRC_DIR, 'services', 'branch.js'));
  assert.match(branches, /isCoreTab/, 'branch.js 须 import 单一源判定');

  // 六台核心三件套（today/todo/overview）都要带 coreTab: true
  for (const ws of ['disc', 'leader', 'org', 'prop', 'secretary', 'visitor']) {
    const src = read(join(CAP_DIR, `${ws}-workspace.js`));
    const coreDecls = (src.match(/coreTab:\s*true/g) || []).length;
    assert.ok(coreDecls >= 3, `${ws} 台核心三件套须显式声明 coreTab（实测 ${coreDecls} 处）`);
  }
  // 党委台按裁定保持自身命名（无核心组），不要求 coreTab
});

test('S4 组清单不得「派生化快照」或「用种子枚举代跑」（全局硬编码审查评议 · 2026-09-14 批次 29）', () => {
  // S1 只拦「组名字面量数组」，拦不住两类等价病灶：
  //   ① 模块加载期从成员档案派生 → `const X = [...new Set(PEOPLE.map(p => p.partyGroup))]`
  //      （liveMembers 的 Proxy 被展开即物化成加载期快照 —— 与「const PEOPLE = getMembers()」同病），
  //      后果：支书台改名/解散后组筛选项永久陈旧，新增的空组永远缺席（实测病灶：PersonPicker 组筛选 Tab）。
  //   ② 运行时用**种子枚举** PARTY_GROUP_OPTIONS 代跑活组清单（实测病灶：整支部名单导入的
  //      逐行净化与按组应到统计 —— 新增组的行被判非法回退、统计缺组）。
  // 唯一正解：运行时一律 groupOptions()（活组按 seq 升序）。
  const ALLOW_SEED_ENUM = new Set([
    'services/org-base-data-preview.js', // 种子期/预览期口径的定义方（含循环依赖规避说明）
    'services/init-reset.js',            // 清档回种子的注释引用
  ]);
  const offenders = [];
  for (const f of walkJs(SRC_DIR)) {
    const r = rel(f);
    const src = read(f);
    // ① 模块顶层派生快照（顶格 const；函数体内的即时派生属数据驱动统计，不拦）
    src.split(/\r?\n/).forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (/^const\s+\w+\s*=[\s\S]*new Set\([\s\S]*partyGroup/.test(line)) {
        offenders.push(`${r}:${i + 1} 模块顶层派生组清单快照`);
      }
    });
    // ② 运行时消费种子枚举（只看非注释行——注释里的历史说明不算）
    const usesSeedEnum = src.split(/\r?\n/).some((line) => {
      const t = line.trimStart();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
      return line.includes('PARTY_GROUP_OPTIONS');
    });
    if (usesSeedEnum && !ALLOW_SEED_ENUM.has(r)) {
      offenders.push(`${r} 运行时消费种子枚举 PARTY_GROUP_OPTIONS（应改 groupOptions()）`);
    }
  }
  assert.deepEqual(offenders, [], '组清单只有一条活路：groupOptions()');
});

// ── 数据层 ──────────────────────────────────────────────────────────

const pgMod = await import(`../../docs/src/services/party-group.js${V}`);
const personMod = await import(`../../docs/src/services/person.js${V}`);

test('D1 活组清单：种子三组、按 seq 升序、已解散组不入清单', () => {
  const active = pgMod.listActiveGroups();
  assert.deepEqual(active.map(g => g.name), ['第一党小组', '第二党小组', '第三党小组']);
  assert.deepEqual(active.map(g => g.seq), [1, 2, 3]);
  assert.deepEqual(pgMod.groupOptions(), ['第一党小组', '第二党小组', '第三党小组']);
  assert.ok(active.every(g => g.status === 'active'), '活组清单只含 active');
});

test('D2 新增：默认命名「第 N 党小组」、活组重名拒绝、非管理者拒绝', async () => {
  const denied = await pgMod.addGroup({ name: '第四党小组', by: 'p3', role: 'participant' });
  assert.equal(denied.ok, false, '普通成员不得增组');

  const created = await pgMod.addGroup({ by: 'p13', role: 'secretary' });
  assert.equal(created.ok, true);
  assert.equal(created.group.name, '第4党小组', '留空即按组序默认命名');
  assert.equal(created.group.status, 'active');

  const dup = await pgMod.addGroup({ name: '第4党小组', by: 'p13', role: 'secretary' });
  assert.equal(dup.ok, false, '同支部活组不得重名');

  // 收尾：撤销本用例新建的组（避免影响后续用例口径）
  await pgMod.dissolveGroup(created.group.id, { by: 'p13', role: 'secretary', note: '单测收尾' });
  assert.deepEqual(pgMod.groupOptions(), ['第一党小组', '第二党小组', '第三党小组']);
});

test('D3 改名：批量改写该组成员档案的 partyGroup', async () => {
  const created = await pgMod.addGroup({ name: '临时党小组', by: 'p13', role: 'secretary' });
  assert.equal(created.ok, true);
  const members = personMod.PersonStore.getMembers().filter(p => p.branchId === 'br-b1').slice(0, 2);
  for (const m of members) {
    await pgMod.assignMemberToGroup(m.id, '临时党小组', { by: 'p13', role: 'secretary' });
  }
  const renamed = await pgMod.renameGroup(created.group.id, '临时党小组（改名）', { by: 'p13', role: 'secretary' });
  assert.equal(renamed.ok, true);
  assert.equal(renamed.movedCount, 2, '改名须同步改写组内 2 名成员');
  const after = members.map(m => personMod.getPersonById(m.id));
  assert.ok(after.every(p => p.partyGroup === '临时党小组（改名）'), '成员档案党小组须随之改名');
  assert.equal(pgMod.groupOptions().includes('临时党小组'), false, '旧组名退出活组清单');
  assert.equal(pgMod.groupOptions().includes('临时党小组（改名）'), true, '新组名进入活组清单');
  await pgMod.dissolveGroup(created.group.id, { by: 'p13', role: 'secretary', note: '单测收尾' });
});

test('D4 解散非空组：成员转「未分组」、组状态转已解散、不可重复解散', async () => {
  const created = await pgMod.addGroup({ name: '待解散党小组', by: 'p13', role: 'secretary' });
  const m = personMod.PersonStore.getMembers().find(p => p.branchId === 'br-b1');
  await pgMod.assignMemberToGroup(m.id, '待解散党小组', { by: 'p13', role: 'secretary' });

  const dis = await pgMod.dissolveGroup(created.group.id, { by: 'p13', role: 'secretary', note: '毕业离校批次' });
  assert.equal(dis.ok, true);
  assert.equal(dis.movedCount, 1, '组内 1 人须转为未分组');
  assert.equal(personMod.getPersonById(m.id).partyGroup, '', '解散后成员党小组为空（未分组）');
  const ent = pgMod.loadPartyGroups().find(g => g.id === created.group.id);
  assert.equal(ent.status, 'dissolved');
  assert.ok(ent.dissolvedAt, '解散须留痕时间');
  assert.equal(pgMod.groupOptions().includes('待解散党小组'), false, '已解散组不入活组清单');
  const again = await pgMod.dissolveGroup(created.group.id, { by: 'p13', role: 'secretary' });
  assert.equal(again.ok, false, '不可重复解散');
});

test('D5 未分组口径：仅 partyGroup 为空者，且按支部过滤', () => {
  const scoped = pgMod.ungroupedMembers('br-b1');
  assert.ok(scoped.every(p => !p.partyGroup), '未分组成员不得有党小组');
  assert.ok(scoped.every(p => p.branchId === 'br-b1'), '按支部过滤（不把非本支部人员算入）');
  const all = pgMod.ungroupedMembers();
  assert.ok(all.length >= scoped.length, '不传 branchId 时为全量');
});

test('D6 写权口径：支书/副支书可管理，其余不可', () => {
  assert.equal(pgMod.canManagePartyGroups('secretary'), true);
  assert.equal(pgMod.canManagePartyGroups('deputy-secretary'), true);
  for (const role of ['org-commissioner', 'prop-commissoner', 'disc-commissoner', 'leader', 'participant']) {
    assert.equal(pgMod.canManagePartyGroups(role), false, `${role} 不得管理党小组`);
  }
});
