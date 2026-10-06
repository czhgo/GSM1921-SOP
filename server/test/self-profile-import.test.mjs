// role: [工程师]+[AI]
// server/test/self-profile-import.test.mjs — 成员「自我描述」**粘贴 / CSV 导入**（2026-10-05 批次 402 · `D-788` / `V-10b`）
//
// **立据**：支书圈「**甲：粘贴/CSV ＋ 预览**」⇒ 导入链 = 「解析 → 按表头关键词映射 → 净化 → 与名册匹配 → 预览」，
//   本件直导服务层（纯函数，无 DOM）。
//
// 判据：① 解析门槛（行数 / 匹配键 / 可识别列）② 分隔符检出（制表符 / 逗号 / 全角逗号）
//   ③ **真实问卷表头**全列映射（长列名顺序敏感：活动名称 / 工作内容 / 独立负责 不得被「学生工作」抢判）
//   ④ 匹配（学号优先 > 姓名唯一；重名 ambiguous；不存在 unmatched；无内容 empty）
//   ⑤ counts 汇总 ＋ **非空转**（真表至少 1 行 matched）
// 运行：node --test test/self-profile-import.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSelfProfileImport, parseSelfProfileSheet, detectDelimiter, headerToTarget,
} from '../../docs/src/services/member/self-profile-import.js?v=20261006b';

/** 支书提供的问卷导出表头（**逐字**；用于顺序敏感的全列映射） */
const HEAD = [
  '您的姓名', '您的学号', '您的手机号', '您的所属年级', '您的专业', '您的政治面貌/发展阶段',
  '您是否承担学生工作或担任班干部？',
  '您担任什么学生工作？:类别', '您担任什么学生工作？:所在的部门/担任班长或团支书的班级', '您担任什么学生工作？:职务',
  '您比较熟悉哪些学生工作?', '您比较熟悉哪些学生工作?:其他-补充填空',
  '您是否参加过志愿服务', '您的累计志愿服务时长大致为:',
  '您在学生工作/志愿服务中是否独立负责过较大型活动或项目？',
  '您在学生工作/志愿服务中负责过哪些重要活动或项目？:活动名称',
  '您在学生工作/志愿服务中负责过哪些重要活动或项目？:工作内容',
  '您目前对未来发展的规划更接近哪些方向？', '您目前对未来发展的规划更接近哪些方向？:其他-补充填空',
  '您曾获得哪些奖项或荣誉？:奖项/荣誉级别', '您曾获得哪些奖项或荣誉？:奖项/荣誉级别:补充填空', '您曾获得哪些奖项或荣誉？:奖项/荣誉名称',
  '除上述内容外，您还有哪些希望支部了解的经历或特长等？',
];

const MEMBERS = [
  { id: 'p1', name: '张三', studentId: '2400012345' },
  { id: 'p2', name: '李四', studentId: '2400012346' },
  { id: 'p3', name: '王五', studentId: '2400012347' },
];

const DATA_ROW = [
  '张三', '2400012345', '13800001111', '2024级', '计算机科学与技术', '发展对象',
  '是', '班团', '计算机 2401', '团支书', '团支书, 组织委员', '心理委员', '是', '120 小时', '是',
  '迎新晚会', '统筹现场', '基层就业, 考研', '学术深造', '校级', '', '三好学生', '擅长摄影与视频剪辑',
];

test('① 解析门槛：行数不足 / 缺匹配键 / 无可识别列 ⇒ 明确拒绝（不静默）', () => {
  assert.equal(parseSelfProfileSheet('').ok, false, '空文本拒绝');
  assert.equal(parseSelfProfileSheet('姓名\t学号').ok, false, '仅表头（无数据行）拒绝');
  const noKey = parseSelfProfileSheet('专业\t手机号\n计算机\t138');
  assert.equal(noKey.ok, false, '无「姓名/学号」匹配键 ⇒ 拒绝');
  assert.ok(/匹配键/.test(noKey.reason), `理由须点明缺匹配键；实得「${noKey.reason}」`);
  const noCol = parseSelfProfileSheet('姓名\t学号\t随手一列\n张三\t1\tx');
  assert.equal(noCol.ok, false, '表头无可识别「自我描述」列 ⇒ 拒绝');
});

test('② 分隔符检出：制表符 / 逗号 / 全角逗号', () => {
  assert.equal(detectDelimiter('姓名\t学号\t专业'), '\t');
  assert.equal(detectDelimiter('姓名,学号,专业'), ',');
  assert.equal(detectDelimiter('姓名，学号，专业'), '，');
  assert.equal(parseSelfProfileSheet('姓名,学号,专业\n张三,1,计算机').delimiter, ',', '逗号 CSV 可解析');
});

test('③ 真实问卷表头全列映射（顺序敏感：长列名不得被「学生工作」抢判）', () => {
  // 顺序敏感三列（都含「学生工作」字样）
  assert.deepEqual(headerToTarget('您在学生工作/志愿服务中是否独立负责过较大型活动或项目？'), { kind: 'bool', key: 'ledProject' },
    '「独立负责」列不得被判成学生工作子表');
  assert.deepEqual(headerToTarget('您在学生工作/志愿服务中负责过哪些重要活动或项目？:活动名称'), { kind: 'list', key: 'keyProjects', sub: 'name' },
    '「活动名称」列不得被判成学生工作子表');
  assert.deepEqual(headerToTarget('您在学生工作/志愿服务中负责过哪些重要活动或项目？:工作内容'), { kind: 'list', key: 'keyProjects', sub: 'work' });
  // 档案字段列（政治面貌/发展阶段）⇒ **不映射**（自我描述不重复存档案字段）
  assert.equal(headerToTarget('您的政治面貌/发展阶段'), null, '发展阶段列须忽略（档案字段）');

  const text = [HEAD.join('\t'), DATA_ROW.join('\t')].join('\n');
  const r = buildSelfProfileImport(text, MEMBERS);
  assert.equal(r.ok, true, `应解析成功：${r.reason || ''}`);
  assert.deepEqual(r.counts, { total: 1, matched: 1, empty: 0, unmatched: 0, ambiguous: 0 }, '一行、全匹配');
  const sp = r.rows[0].selfProfile;
  assert.equal(r.rows[0].personId, 'p1', '按学号匹配到 p1');
  assert.equal(sp.phone, '13800001111');
  assert.equal(sp.grade, '2024级');
  assert.equal(sp.major, '计算机科学与技术');
  assert.equal(sp.hasStudentWork, true, '「是」→ true');
  assert.equal(sp.volunteered, true);
  assert.equal(sp.ledProject, true, '独立负责 → true（顺序敏感列）');
  assert.equal(sp.volunteerHours, '120 小时');
  assert.deepEqual(sp.studentWorks, [{ category: '班团', dept: '计算机 2401', title: '团支书' }], '学生工作子表第 0 行');
  assert.deepEqual(sp.keyProjects, [{ name: '迎新晚会', work: '统筹现场' }], '重要活动项目子表');
  assert.deepEqual(sp.honors, [{ level: '校级', levelOther: '', name: '三好学生' }], '奖项荣誉子表');
  assert.deepEqual(sp.familiarWorks, ['团支书', '组织委员'], 'multi 按分隔符拆分');
  assert.equal(sp.familiarWorksOther, '心理委员');
  assert.deepEqual(sp.futureDirections, ['基层就业', '考研']);
  assert.equal(sp.futureDirectionsOther, '学术深造');
  assert.equal(sp.extraNote, '擅长摄影与视频剪辑');
  assert.ok(!('developStage' in sp), '档案字段不得混入自我描述');
  assert.ok(r.rows[0].fields >= 10, `非空字段计数应可观；实得 ${r.rows[0].fields}`);
});

test('④ 匹配：学号优先 > 姓名唯一；重名 ambiguous；无此人 unmatched；无内容 empty', () => {
  const head = '姓名\t学号\t专业';
  const rows = [
    ['张三', '2400012345', '计算机'],   // 学号命中
    ['李四', '', '软件工程'],           // 姓名唯一命中
    ['张三', '2400012346', '数学'],     // 学号命中（与 p2 学号同 → 以学号为准，非重名）
    ['无名氏', '', '物理'],             // 查无此人
    ['王五', '', ''],                   // 命中但无内容
  ];
  const r = buildSelfProfileImport([head, ...rows.map((x) => x.join('\t'))].join('\n'), MEMBERS);
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].status, 'matched');
  assert.equal(r.rows[0].personId, 'p1');
  assert.equal(r.rows[1].status, 'matched');
  assert.equal(r.rows[1].personId, 'p2', '姓名唯一 ⇒ 命中');
  assert.equal(r.rows[2].personId, 'p2', '学号优先（姓名同为「张三」也不歧义）');
  assert.equal(r.rows[3].status, 'unmatched', '查无此人');
  assert.equal(r.rows[4].status, 'empty', '命中但该行无自我描述内容');
  assert.deepEqual(r.counts, { total: 5, matched: 3, empty: 1, unmatched: 1, ambiguous: 0 });
  // 重名（无学号）⇒ ambiguous
  const dup = buildSelfProfileImport(['姓名\t专业', '张三\t计算机'].join('\n'),
    [...MEMBERS, { id: 'p9', name: '张三', studentId: '2400012399' }]);
  assert.equal(dup.rows[0].status, 'ambiguous', '姓名重名且无学号 ⇒ ambiguous');
  assert.ok(dup.rows[0].problems.some((p) => p.includes('重名')), '问题说明须点明重名');
});

test('⑤ 非空转：真表一行 ⇒ matched ≥ 1（防止「碰巧什么都没有」也判绿）', () => {
  const r = buildSelfProfileImport([HEAD.join('\t'), DATA_ROW.join('\t')].join('\n'), MEMBERS);
  assert.ok(r.ok && r.counts.matched >= 1, '真问卷表须至少有 1 行 matched');
  assert.ok(r.rows[0].problems.length === 0, '正常行不应有 problem');
});
