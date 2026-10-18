import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SELF_PROFILE_FIELDS } from '../../docs/src/core/domain/self-profile.js?v=20261018h';

const testDir = dirname(fileURLToPath(import.meta.url));
const presentationPath = resolve(testDir, '../../docs/src/components/governance/person-profile-sections.js');
const entryPath = resolve(testDir, '../../docs/src/entries/pages/person-entry.js');
const stylesPath = resolve(testDir, '../../docs/src/styles.css');

const FIELD_NAMES = [
  // L0 结论带（5）
  'name', 'branchId', 'developStage', 'role', 'residenceStatus',
  // 组织事实（4）
  'studentId', 'enrollYear', 'partyGroup', 'developStageSince',
  // 在册与留痕（2）
  'residenceNote', 'residenceHistory',
  // 本人自述（15）
  'phone', 'grade', 'major', 'hasStudentWork', 'studentWorks', 'familiarWorks',
  'familiarWorksOther', 'volunteered', 'volunteerHours', 'ledProject', 'keyProjects',
  'futureDirections', 'futureDirectionsOther', 'honors', 'extraNote',
  // 系统说明（1）
  'id',
];

const FULL_SELF_PROFILE = {
  phone: '13800000000',
  grade: '2024 级',
  major: '计算机科学',
  hasStudentWork: true,
  studentWorks: [{ category: '班团', dept: '计算机 2401', title: '团支书' }],
  familiarWorks: ['组织活动', '志愿服务'],
  familiarWorksOther: '熟悉社团联络',
  volunteered: true,
  volunteerHours: '20 小时',
  ledProject: true,
  keyProjects: [{ name: '迎新晚会', work: '统筹节目与场地' }],
  futureDirections: ['基层就业'],
  futureDirectionsOther: '继续深造',
  honors: [{ level: '校级', levelOther: '', name: '三好学生' }],
  extraNote: '希望支部了解的经历',
};

async function loadPresentation() {
  assert.equal(existsSync(presentationPath), true, '个人档案应有可独立验证的自我描述展示组件');
  return import(`${pathToFileURL(presentationPath).href}?v=20261018h`);
}

function dataFields(html) {
  return [...html.matchAll(/data-field="([^"]+)"/g)].map((match) => match[1]);
}

test('自我描述按字段模型展示，长文本转义且列表结构可读', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({
    phone: '<script>alert(1)</script>',
    major: '计算机科学',
    hasStudentWork: true,
    studentWorks: [{ category: '班团', dept: '计算机 2401', title: '团支书' }],
    familiarWorks: ['组织活动', '志愿服务'],
  }, { isSelf: true });

  assert.match(html, /本人自述/);
  assert.match(html, /手机号/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /计算机 2401/);
  assert.match(html, /组织活动、志愿服务/);
  assert.match(html, /id="person-self-profile-btn"/);
  assert.match(html, /已填 \d+\/15/);
  assert.match(html, /<details id="person-self-details"(?![^>]*\bopen\b)/, '自述折叠默认不展开');
  for (const group of ['基本信息', '学生工作', '志愿服务与项目', '发展方向', '荣誉与补充']) {
    assert.match(html, new RegExp(group), `自述须有子组「${group}」`);
  }
});

test('自述 15 个字段各有一个 data-field 落点，且不再做成同权灰卡', async () => {
  const { renderSelfDescriptionSection, SELF_PROFILE_GROUPS } = await loadPresentation();
  const groupKeys = SELF_PROFILE_GROUPS.flatMap((group) => group.keys);
  assert.equal(SELF_PROFILE_GROUPS.length, 5, '自述须分为 5 个子组');
  assert.equal(groupKeys.length, 15, '5 个子组合计 15 个字段');
  assert.deepEqual(new Set(groupKeys), new Set(SELF_PROFILE_FIELDS.map((field) => field.key)),
    '子组键集须与自述字段单一源一致');

  const html = renderSelfDescriptionSection(FULL_SELF_PROFILE, { isSelf: true });
  const fields = dataFields(html);
  assert.equal(fields.length, 15, '自述 15 个字段应有 15 个 data-field');
  assert.equal(new Set(fields).size, 15, '自述字段名不得重复');
  assert.doesNotMatch(html, /rounded-xl bg-gray-50 px-4 py-3/, '自述不再使用逐字段灰卡');
});

test('空自我描述给本人清楚的编辑提示，但不伪造空经历', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({}, { isSelf: true });
  assert.match(html, /已填 0\/15/);
  assert.match(html, /缺失：/);
  assert.match(html, /尚未填写自我描述/);
  assert.match(html, /填写我的自述/);
  assert.doesNotMatch(html, /无经历/);
});

test('组织查看空自我描述时不提供本人编辑入口，但保留只读原因', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({}, { isSelf: false });
  assert.match(html, /本人尚未填写自我描述/);
  assert.doesNotMatch(html, /id="person-self-profile-btn"/);
  assert.match(html, /仅本人或本支部组织委员可填写/);
});

test('组织委员代录走同一入口，文案为「代录自述」', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({}, { isSelf: false, canDictate: true });
  assert.match(html, /id="person-self-profile-btn"/);
  assert.match(html, /data-mode="dictate"/);
  assert.match(html, /代录自述/);
});

test('主问题为否时关联字段显示「无 / 不适用」，与「未填写」区分', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({
    hasStudentWork: false,
    volunteered: false,
    ledProject: false,
  }, { isSelf: true });
  assert.match(html, /无（本人填写为不担任）/);
  assert.match(html, /不适用/);
  assert.match(html, /data-field="keyProjects"[\s\S]{0,320}?<dd[^>]*>无<\/dd>/);
});

test('档案入口按 L0 结论带与三分区排列，字段各有唯一落点', async () => {
  const source = readFileSync(entryPath, 'utf8');
  const { renderSelfDescriptionSection } = await loadPresentation();

  // L0 存在且含 5 个业务字段
  assert.match(source, /id="person-summary"/);
  const l0 = source.match(/id="person-summary"[\s\S]*?<\/section>/);
  assert.ok(l0, '应有 L0 结论带');
  for (const field of ['name', 'branchId', 'developStage', 'role', 'residenceStatus']) {
    assert.equal(dataFields(l0[0]).filter((name) => name === field).length, 1, `L0 须有且仅有一个 ${field}`);
  }

  // 分区顺序固定：组织事实 → 在册与留痕 → 本人自述
  const orgIndex = source.indexOf('person-org-facts-heading');
  const residenceIndex = source.indexOf('person-residence-details');
  const selfIndex = source.indexOf('renderSelfDescriptionSection(member.selfProfile');
  assert.ok(orgIndex > 0 && residenceIndex > orgIndex && selfIndex > residenceIndex,
    '分区顺序应为 组织事实 → 在册与留痕 → 本人自述');

  // 两个折叠面板默认不展开
  assert.match(source, /<details id="person-residence-details"(?![^>]*\bopen\b)/, '在册与留痕默认折叠');
  const selfHtml = renderSelfDescriptionSection(FULL_SELF_PROFILE, { isSelf: true });
  assert.match(selfHtml, /<details id="person-self-details"(?![^>]*\bopen\b)/, '本人自述默认折叠');

  // 27 个字段名：入口 12 + 自述渲染 15，各命中一次且无第 28 个业务键
  const entryFields = dataFields(source);
  const selfFields = dataFields(selfHtml);
  assert.equal(entryFields.length, 12, `入口应有 12 个 data-field，实得 ${entryFields.length}`);
  assert.equal(new Set(entryFields).size, 12, '入口字段名不得重复');
  assert.equal(selfFields.length, 15, `自述应有 15 个 data-field，实得 ${selfFields.length}`);
  assert.equal(new Set(selfFields).size, 15, '自述字段名不得重复');
  const all = [...entryFields, ...selfFields];
  assert.equal(all.length, 27, '27 个字段各有一个落点');
  assert.deepEqual(new Set(all), new Set(FIELD_NAMES), '字段集合应与 27 字段清单一致');
  for (const field of FIELD_NAMES) {
    assert.equal(all.filter((name) => name === field).length, 1, `${field} 应只命中一次`);
  }

  // residenceStatus 只在 L0 出现一次
  assert.equal(all.filter((name) => name === 'residenceStatus').length, 1, '在册状态只渲染一次');

  // 旧结构标记不得回潮
  assert.doesNotMatch(source, /person-organization-profile-heading|组织维护档案/);
  assert.doesNotMatch(source, /person-organization-profile-heading/);
  assert.doesNotMatch(source, /min-w-0 rounded-xl bg-gray-50 px-4 py-3/);
  const presentation = readFileSync(presentationPath, 'utf8');
  assert.doesNotMatch(presentation, /min-w-0 rounded-xl bg-gray-50 px-4 py-3/);
  assert.doesNotMatch(presentation, /rounded-xl bg-gray-50 px-4 py-3/);

  // 全页词表与待确认读口
  assert.match(source, /未分组/);
  assert.match(source, /在校（默认）/);
  assert.match(source, /未填写/);
  assert.match(source, /listPendingConfirmations/);
  assert.match(source, /暂无待确认/);
  assert.match(source, /待支书确认/);
});

test('档案入口沿用授权读口与页面状态提示，不自造折叠脚本', () => {
  const source = readFileSync(entryPath, 'utf8');
  assert.match(source, /renderSelfDescriptionSection\(member\.selfProfile/);
  assert.match(source, /person-org-facts-heading/);
  assert.doesNotMatch(source, /relatedCounts|TaskForceRecordStore|loadAttendanceRecords|loadInspectionRecords/);
  assert.match(source, /ApiAdapter\.members\.getProfile\(id\)/);
  assert.match(source, /aria-live=/);
  assert.doesNotMatch(source, /aria-expanded|addEventListener\('click',\s*\(\)\s*=>\s*\{[^}]*hidden/);
  const presentation = readFileSync(presentationPath, 'utf8');
  assert.doesNotMatch(presentation, /focus-visible:ring/, '档案按钮沿用设计系统全局焦点样式');
  const styles = readFileSync(stylesPath, 'utf8');
  assert.match(styles, /button:focus-visible,[\s\S]{0,120}outline: 2px solid var\(--party-gold\)/);
});
