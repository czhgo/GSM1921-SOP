// role: [工程师]+[AI]
// server/test/roster-ui-logic.test.mjs — 成员名册 UI 纯逻辑单测（立项⑥ B波，2026-09-06）
// 纯 Node 测试（无浏览器、不起 server）：直接导 docs/src/services/roster-ui-logic.js。
//   覆盖：删除守卫引用清单 → 产品话术类别（去重/计数/保序/不泄技术键）；
//         守卫弹窗话术（单类/多类措辞、标题含姓名、无引用 → null）；
//         新增成员表单校验（姓名必填、枚举单一源、滞留备注口径）；
//         行内保存 diff（分组/阶段/在册状态变化 → 仅带变化字段的补丁、无变化 → 空补丁）。
// ⚠️ 对 docs/src 的相对 import 必须带与源码一致的 ?v= query（模块缓存键一致性，同 roster.test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PEOPLE } from '../../docs/src/mock/people.js?v=20260908c';
import { RESIDENCE } from '../../docs/src/services/roster.js?v=20260908c';
import {
  guardCategoryList, buildGuardMessage,
  validateMemberForm, diffMemberFields,
} from '../../docs/src/services/roster-ui-logic.js?v=20260908c';

const p1 = PEOPLE.find(p => p.id === 'p1'); // 在校党员（第一党小组·正式党员，无种子滞留字段）
const p5 = PEOPLE.find(p => p.id === 'p5'); // 种子示范滞留党员（第二党小组·正式党员）

// ── a) 守卫引用 → 话术类别（去重 / 计数 / 保序 / 未知域兜底）────────
test('guardCategoryList：同类别多域合并计数、按话术顺序、未知域兜底、空引用 → []', () => {
  // activities（活动内嵌分工）与 assignments（分工记录）同属「活动分工」类别
  const refs = [
    { domain: 'activities', id: 'a1', label: '活动分工' },
    { domain: 'assignments', id: 'd1', label: '活动分工' },
    { domain: 'attendances', id: 'at1', label: '考勤记录' },
    { domain: 'taskforces', id: 't1', label: '专班成员' },
  ];
  assert.deepEqual(guardCategoryList(refs), [
    { category: '活动分工', count: 2 },
    { category: '考勤记录', count: 1 },
    { category: '专班成员', count: 1 },
  ]);
  // 未知域 → 回退 ref.label；再兜底「其他引用」；顺序置于已知类别之后
  assert.deepEqual(guardCategoryList([{ domain: 'ghost', id: 'x', label: '神秘记录' }]),
    [{ category: '神秘记录', count: 1 }]);
  assert.deepEqual(guardCategoryList([{ domain: 'ghost2', id: 'x' }]),
    [{ category: '其他引用', count: 1 }]);
  assert.deepEqual(guardCategoryList([]), []);
  assert.deepEqual(guardCategoryList(null), []);
});

// ── b) 守卫话术（产品措辞；只透类别，不透技术键/记录 id）────────────
test('buildGuardMessage：多类措辞含类别清单、标题含姓名、不泄技术键；无引用 → null', () => {
  const refs = [
    { domain: 'branches', id: 'br-b1', label: '支部现任书记' },
    { domain: 'attendances', id: 'p5-2026-09', label: '考勤记录' },
  ];
  const msg = buildGuardMessage('宋佳宁', refs);
  assert.ok(msg, '有引用应产出话术');
  assert.equal(msg.title, '暂无法删除「宋佳宁」');
  assert.ok(msg.reason.includes('现任书记职务') && msg.reason.includes('考勤记录'), '原因含类别产品话术');
  assert.ok(msg.reason.includes('解除或迁移'), '原因给出行动指引');
  assert.deepEqual(msg.categories.map(c => c.category), ['现任书记职务', '考勤记录']);
  // 不透出技术键：域英文键 / 记录 id / 成员 id
  assert.ok(!/branches|attendances|br-b1|p5-2026-09/.test(msg.reason), `原因不应含技术键，实际：${msg.reason}`);
  assert.ok(!/p5/.test(msg.reason), '原因不应泄成员 id');

  const single = buildGuardMessage('罗文杰', [{ domain: 'attendances', id: 'x1', label: '考勤记录' }]);
  assert.ok(single.reason.includes('该成员仍被「考勤记录」引用'), '单类措辞不带「等业务记录」');
  assert.equal(buildGuardMessage('某成员', []), null);
  assert.equal(buildGuardMessage('某成员', null), null);
});

// ── c) 新增成员表单校验（姓名必填；枚举与数据一致；备注口径）────────
test('validateMemberForm：姓名必填（含纯空格）；合法输入 trim 并净化', () => {
  assert.deepEqual(validateMemberForm({}), { ok: false, message: '请填写成员姓名（必填）' });
  assert.equal(validateMemberForm({ name: '   ' }).ok, false);
  assert.equal(validateMemberForm({ name: 123 }).ok, false);

  const v = validateMemberForm({ name: ' 张三 ', partyGroup: '第一党小组', developStage: '积极分子', residenceStatus: RESIDENCE.CAMPUS, residenceNote: ' 备注 ' });
  assert.equal(v.ok, true);
  assert.deepEqual(v.value, { name: '张三', partyGroup: '第一党小组', developStage: '积极分子', residenceStatus: '在校', residenceNote: '' });
});

test('validateMemberForm：在册状态枚举外拒绝（禁造新枚举）；在校清备注、滞留保备注且截断 120', () => {
  assert.deepEqual(validateMemberForm({ name: '李四', residenceStatus: '离校' }),
    { ok: false, message: '在册状态须为「在校」或「滞留」' });
  // 在校：备注不保留（防「在校挂滞留备注」错位）
  const on = validateMemberForm({ name: '李四', residenceStatus: RESIDENCE.CAMPUS, residenceNote: ' 滞留原因 ' });
  assert.equal(on.ok, true);
  assert.equal(on.value.residenceNote, '');
  // 滞留：备注保留
  const de = validateMemberForm({ name: '李四', residenceStatus: RESIDENCE.DETAINED, residenceNote: ' 交换一学期 ' });
  assert.equal(de.value.residenceNote, '交换一学期');
  // 超长截断（与输入 maxlength=120 对齐）
  const long = '滞'.repeat(121);
  const c = validateMemberForm({ name: '李四', residenceStatus: RESIDENCE.DETAINED, residenceNote: long });
  assert.equal(c.value.residenceNote.length, 120);
  // 党小组/发展阶段缺省 → 空串（可后续在行内补录）
  const g = validateMemberForm({ name: '李四' });
  assert.equal(g.value.partyGroup, '');
  assert.equal(g.value.developStage, '');
  assert.equal(g.value.residenceStatus, RESIDENCE.CAMPUS);
});

// ── d) 行内保存 diff（仅带变化字段；无变化 → 空补丁）───────────────
test('diffMemberFields：分组/阶段变化 → 仅对应补丁字段；全同 → 空补丁', () => {
  const patch = diffMemberFields(p1, {
    partyGroup: '第三党小组', developStage: '正式党员',
    residenceStatus: RESIDENCE.CAMPUS, residenceNote: '',
  });
  assert.deepEqual(patch, { partyGroup: '第三党小组' });
  assert.deepEqual(diffMemberFields(p1, {
    partyGroup: p1.partyGroup, developStage: '预备党员',
    residenceStatus: RESIDENCE.CAMPUS, residenceNote: '',
  }), { developStage: '预备党员' });
  // 全部相同（p1 在校缺省、无备注）→ 无变化
  assert.deepEqual(diffMemberFields(p1, {
    partyGroup: p1.partyGroup, developStage: p1.developStage,
    residenceStatus: RESIDENCE.CAMPUS, residenceNote: '',
  }), {});
  // 空 member → 空补丁（防御）
  assert.deepEqual(diffMemberFields(null, {}), {});
});

test('diffMemberFields：滞留状态/备注变化 → 状态+备注同带；改回在校 → 备注清空；在校备注不落', () => {
  // 在校党员 → 标记滞留（无备注）
  const toDetained = diffMemberFields(p1, {
    partyGroup: p1.partyGroup, developStage: p1.developStage,
    residenceStatus: RESIDENCE.DETAINED, residenceNote: '',
  });
  assert.deepEqual(toDetained, { residenceStatus: '滞留', residenceNote: '' });

  // 滞留党员 p5：仅改备注 → 状态+备注同带（备注随状态保存）
  const noteOnly = diffMemberFields(p5, {
    partyGroup: p5.partyGroup, developStage: p5.developStage,
    residenceStatus: RESIDENCE.DETAINED, residenceNote: ' 2026-09 起交换（新备注） ',
  });
  assert.equal(noteOnly.residenceStatus, '滞留');
  assert.equal(noteOnly.residenceNote, '2026-09 起交换（新备注）');
  assert.equal(noteOnly.partyGroup, undefined, '未动分组不带分组字段');

  // 滞留党员 p5 → 改回在校（即使表单残留备注文本也清空——备注=滞留备注）
  const back = diffMemberFields(p5, {
    partyGroup: p5.partyGroup, developStage: p5.developStage,
    residenceStatus: RESIDENCE.CAMPUS, residenceNote: '残留备注',
  });
  assert.deepEqual(back, { residenceStatus: '在校', residenceNote: '' });

  // p5 全同 → 无变化
  const rs5 = p5.residenceStatus || RESIDENCE.DETAINED;
  assert.deepEqual(diffMemberFields(p5, {
    partyGroup: p5.partyGroup, developStage: p5.developStage,
    residenceStatus: rs5, residenceNote: p5.residenceNote || '',
  }), {});
});
