import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const testDir = dirname(fileURLToPath(import.meta.url));
const presentationPath = resolve(testDir, '../../docs/src/components/governance/person-profile-sections.js');
const entryPath = resolve(testDir, '../../docs/src/entries/pages/person-entry.js');
const stylesPath = resolve(testDir, '../../docs/src/styles.css');

async function loadPresentation() {
  assert.equal(existsSync(presentationPath), true, '个人档案应有可独立验证的自我描述展示组件');
  return import(`${pathToFileURL(presentationPath).href}?v=20261018d`);
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

  assert.match(html, /自我描述/);
  assert.match(html, /手机号/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /计算机 2401/);
  assert.match(html, /组织活动、志愿服务/);
  assert.match(html, /id="person-self-profile-btn"/);
});

test('空自我描述给本人清楚的编辑提示，但不伪造空经历', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({}, { isSelf: true });
  assert.match(html, /尚未填写自我描述/);
  assert.match(html, /填写我的自我描述/);
  assert.doesNotMatch(html, /无经历/);
});

test('组织查看空自我描述时不提供本人编辑入口', async () => {
  const { renderSelfDescriptionSection } = await loadPresentation();
  const html = renderSelfDescriptionSection({}, { isSelf: false });
  assert.match(html, /本人尚未填写自我描述/);
  assert.doesNotMatch(html, /填写我的自我描述/);
});

test('档案入口按自我描述与组织资料分层，移除来源不完整的计数', () => {
  const source = readFileSync(entryPath, 'utf8');
  assert.match(source, /renderSelfDescriptionSection\(member\.selfProfile/);
  assert.match(source, /person-organization-profile-heading/);
  assert.doesNotMatch(source, /relatedCounts|TaskForceRecordStore|loadAttendanceRecords|loadInspectionRecords/);
  assert.match(source, /ApiAdapter\.members\.getProfile\(id\)/);
  assert.match(source, /aria-live=/);
  const presentation = readFileSync(presentationPath, 'utf8');
  assert.doesNotMatch(presentation, /focus-visible:ring/, '档案按钮沿用设计系统全局焦点样式');
  const styles = readFileSync(stylesPath, 'utf8');
  assert.match(styles, /button:focus-visible,[\s\S]{0,120}outline: 2px solid var\(--party-gold\)/);
});
