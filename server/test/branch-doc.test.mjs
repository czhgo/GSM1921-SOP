// role: [工程师]+[AI]
// server/test/branch-doc.test.mjs — E 批立项⑧：支部文件增强——制度文本（版本+现行态+网页读）
// 覆盖（验收判据：纯逻辑 + 旧数据兼容 + 权限双重校验）：
//   ① 新建 institution = 现行版 v1（仅书记/副书记；支委角色拒绝）
//   ② publishNewVersion：旧版入 versions 历史（status:'superseded'）→ 新版 current v2/v3；非书记/非现行拒绝
//   ③ setDocStatus：停用（current→disabled）/ 重新启用（disabled→current）；历史版本列表不改；权限/对象拦截
//   ④ listVersions：条目自身 + 历史合并、按版本号升序，每条含 by/at/note 全量；旧数据（无新字段）单条兼容
//   ⑤ renderDocBody 安全：<script>/onerror 注入不执行、无 href 产物；md 子集（#/##/###/**/-/1./`/```/段落）；
//      非 string 返回 ''；超长（>20000 字）截断并提示
//   ⑥ listDocs 过滤（只看制度 / 按状态 current|disabled）+ updatedAt 倒序
//   ⑦ 普通文件（doc）新建/编辑不受影响；旧数据（无 purpose/versions）完全兼容不报错
//   ⑧ mock 整库持久：写入后重 loadDB（模拟刷新）仍在
// 运行：node --test test/branch-doc.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mockDB } from '../../docs/src/core/domain.js?v=20260908d';
import { MockAdapter } from '../../docs/src/core/mock-adapter.js?v=20260908d';
import { getAdapter, registerMockAdapter, setDataSource } from '../../docs/src/core/data-adapter.js?v=20260908d';
import {
  isInstitutionManager, saveDoc, publishNewVersion, setDocStatus,
  listDocs, listVersions, buildDocVersionsView, renderDocBody, BODY_MAX_LEN,
} from '../../docs/src/services/branch-doc.js?v=20260908d';

// ── localStorage 内存桩（member-persist 头 60 行同款范式）──
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(String(k)) ? _store.get(String(k)) : null),
  setItem: (k, v) => _store.set(String(k), String(v)),
  removeItem: (k) => { _store.delete(String(k)); },
  clear: () => { _store.clear(); },
  key: (i) => [..._store.keys()][i] ?? null,
  get length() { return _store.size; },
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// 走真实 MockAdapter（branchDocs 域整库持久：workflowos_branch_db_v1）——测试即生产同路径
registerMockAdapter(MockAdapter);

/** 每例独立现场：清业务域 + 清存储 + loadDB 回种子 */
function beginMockCase() {
  _store.clear();
  delete globalThis.window;
  for (const k of [
    'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'signups', 'activityReviews', 'taskforceReviews', 'agendaVotes',
    'memberChangeRequests', 'committeeBroadcasts', 'thoughtReports', 'branchDocs',
    'appointmentRecords', 'reviewRequests', 'archiveRecords',
  ]) {
    mockDB[k] = [];
  }
  mockDB.branches = [];
  mockDB._loaded = false;
  setDataSource('mock');
  MockAdapter.loadDB(); // seed（branchDocs 种子为空 → 从空开始，符合裁决：不预置种子制度）
}

/** 经 adapter 读 branchDocs 全量（与 service 同路径） */
function rawRows() {
  return getAdapter().branchDocs.list();
}

// ═══════════════ ① 新建 institution（书记/非书记）═══════════════
test('① 书记新建制度文本 = 现行版 v1（purpose/status/version/bodyText/versions 结构正确）', async () => {
  beginMockCase();
  const res = await saveDoc({
    purpose: 'institution', title: '支部例会制度', desc: '例会频次与议程',
    bodyText: '# 支部例会制度\n\n每月至少召开一次。', note: '试行',
    by: 'p13', role: 'secretary',
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  const d = res.doc;
  assert.equal(d.purpose, 'institution');
  assert.equal(d.status, 'current');
  assert.equal(d.version, 1);
  assert.equal(d.bodyText, '# 支部例会制度\n\n每月至少召开一次。');
  assert.deepEqual(d.versions, []);
  assert.equal(d.title, '支部例会制度');
  assert.equal(d.versionBy, 'p13');
  assert.ok(d.versionAt, 'v1 发布元数据时间存在');
  // 落入 adapter 整库
  const rows = await rawRows();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, d.id);
});

test('①b 副书记可新建；非书记（组织委员）新建制度被拒；普通文件新建不受影响', async () => {
  beginMockCase();
  const dep = await saveDoc({
    purpose: 'institution', title: '支部经费管理办法', bodyText: '正文',
    by: 'p14', role: 'deputy-secretary',
  });
  assert.equal(dep.ok, true, '副书记属管理者可建');

  const denied = await saveDoc({
    purpose: 'institution', title: '越权制度', bodyText: '正文',
    by: 'p3', role: 'org-commissioner',
  });
  assert.equal(denied.ok, false, '非书记（组织委员）新建制度必须拒绝');
  assert.match(denied.reason, /书记/);

  const doc = await saveDoc({
    purpose: 'doc', title: '积极分子考察表模板', desc: '模板',
    fileName: 'kaocha.docx', filePath: '/files/kaocha.docx', by: 'p3', role: 'org-commissioner',
  });
  assert.equal(doc.ok, true, JSON.stringify(doc));
  assert.equal(doc.doc.purpose, 'doc');
  assert.equal(doc.doc.status, 'draft', '普通文件维持现状：status draft=会前草案');
  assert.equal(doc.doc.fileName, 'kaocha.docx');
});

// ═══════════════ ② publishNewVersion ═══════════════
test('② 上传新版：旧版入历史（superseded 全量元数据）→ 新版 current v2；再发 v3 累计历史升序', async () => {
  beginMockCase();
  const v1 = await saveDoc({
    purpose: 'institution', title: '支部例会制度', bodyText: '第一版正文', note: 'v1 试行',
    by: 'p13', role: 'secretary',
  });
  const p2 = await publishNewVersion({
    id: v1.doc.id, title: '支部例会制度（修订）', bodyText: '第二版正文', note: '修订议程频次',
    by: 'p13', role: 'secretary',
  });
  assert.equal(p2.ok, true, JSON.stringify(p2));
  const d2 = p2.doc;
  assert.equal(d2.version, 2);
  assert.equal(d2.status, 'current');
  assert.equal(d2.bodyText, '第二版正文');
  assert.equal(d2.versions.length, 1);
  const h1 = d2.versions[0];
  assert.equal(h1.version, 1);
  assert.equal(h1.title, '支部例会制度');
  assert.equal(h1.bodyText, '第一版正文');
  assert.equal(h1.status, 'superseded');
  assert.equal(h1.note, 'v1 试行', '历史条目携带该版自身的版本说明');
  assert.equal(h1.by, 'p13');
  assert.ok(h1.at, '历史条目时间存在');

  // 再发 v3 → versions 累计 2 条，按版本号升序
  const p3 = await publishNewVersion({
    id: v1.doc.id, title: '支部例会制度（2026 修订）', bodyText: '第三版正文', note: '再修订',
    by: 'p14', role: 'deputy-secretary',
  });
  assert.equal(p3.ok, true, JSON.stringify(p3));
  const d3 = p3.doc;
  assert.equal(d3.version, 3);
  assert.equal(d3.status, 'current');
  assert.equal(d3.versions.length, 2);
  assert.equal(d3.versions[0].version, 1);
  assert.equal(d3.versions[1].version, 2);
  assert.equal(d3.versions[1].bodyText, '第二版正文');
  assert.equal(d3.versionBy, 'p14');
});

test('②b 上传新版权限与前置拦截：非书记拒绝 / 普通文件拒绝 / 已停用拒绝', async () => {
  beginMockCase();
  const v1 = await saveDoc({
    purpose: 'institution', title: '制度A', bodyText: '正文',
    by: 'p13', role: 'secretary',
  });
  const noRole = await publishNewVersion({
    id: v1.doc.id, bodyText: 'x', by: 'p3', role: 'org-commissioner',
  });
  assert.equal(noRole.ok, false);
  assert.match(noRole.reason, /书记/);

  const doc = await saveDoc({
    purpose: 'doc', title: '普通文件', fileName: 'a.pdf', filePath: '/f/a.pdf',
    by: 'p3', role: 'org-commissioner',
  });
  const onDoc = await publishNewVersion({
    id: doc.doc.id, bodyText: 'x', by: 'p13', role: 'secretary',
  });
  assert.equal(onDoc.ok, false);
  assert.match(onDoc.reason, /制度文本/);

  await setDocStatus({ id: v1.doc.id, status: 'disabled', by: 'p13', role: 'secretary' });
  const onDisabled = await publishNewVersion({
    id: v1.doc.id, bodyText: 'x', by: 'p13', role: 'secretary',
  });
  assert.equal(onDisabled.ok, false);
  assert.match(onDisabled.reason, /重新启用/);
});

// ═══════════════ ③ setDocStatus ═══════════════
test('③ 停用（current→disabled）与重新启用（disabled→current）；版本链/正文不改；越权/对象拦截', async () => {
  beginMockCase();
  const v1 = await saveDoc({
    purpose: 'institution', title: '制度B', bodyText: '正文B', note: 'n1',
    by: 'p13', role: 'secretary',
  });
  const dis = await setDocStatus({ id: v1.doc.id, status: 'disabled', by: 'p13', role: 'secretary' });
  assert.equal(dis.ok, true, JSON.stringify(dis));
  assert.equal(dis.doc.status, 'disabled');
  assert.equal(dis.doc.version, 1, '停用不改版本号');
  assert.deepEqual(dis.doc.versions, [], '停用不改历史版本列表');
  assert.equal(dis.doc.bodyText, '正文B', '停用不改正文');

  const re = await setDocStatus({ id: v1.doc.id, status: 'current', by: 'p13', role: 'secretary' });
  assert.equal(re.ok, true);
  assert.equal(re.doc.status, 'current');

  const noRole = await setDocStatus({ id: v1.doc.id, status: 'disabled', by: 'p3', role: 'org-commissioner' });
  assert.equal(noRole.ok, false);
  assert.match(noRole.reason, /书记/);

  const bad = await setDocStatus({ id: v1.doc.id, status: 'superseded', by: 'p13', role: 'secretary' });
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /非法状态/);

  const doc = await saveDoc({
    purpose: 'doc', title: '普通文件2', fileName: 'b.pdf', filePath: '/f/b.pdf',
    by: 'p3', role: 'org-commissioner',
  });
  const onDoc = await setDocStatus({ id: doc.doc.id, status: 'disabled', by: 'p13', role: 'secretary' });
  assert.equal(onDoc.ok, false);
  assert.match(onDoc.reason, /制度文本/);
});

// ═══════════════ ④ listVersions / buildDocVersionsView ═══════════════
test('④ 版本视图：自身+历史合并按版本号升序，每条含 by/at/note 全量；缺失 id 返回空', async () => {
  beginMockCase();
  const v1 = await saveDoc({
    purpose: 'institution', title: '制度C', bodyText: 'v1 正文', note: 'v1 说明',
    by: 'p13', role: 'secretary',
  });
  await publishNewVersion({
    id: v1.doc.id, title: '制度C·改', bodyText: 'v2 正文', note: 'v2 说明',
    by: 'p14', role: 'deputy-secretary',
  });
  const view = await listVersions(v1.doc.id);
  assert.equal(view.length, 2);
  assert.equal(view[0].version, 1);
  assert.equal(view[1].version, 2);
  assert.equal(view[0].note, 'v1 说明');
  assert.equal(view[1].note, 'v2 说明');
  assert.equal(view[0].by, 'p13');
  assert.equal(view[1].by, 'p14');
  for (const item of view) {
    assert.ok(item.at, '每条含时间');
    assert.ok('title' in item && 'bodyText' in item && 'status' in item, '每条含正文快照与状态');
  }
  assert.equal(view[1].bodyText, 'v2 正文');
  assert.equal(view[0].status, 'superseded');
  assert.equal(view[1].status, 'current');
  assert.equal((await listVersions('bd-not-exist')).length, 0, '缺失 id 返回空数组');

  // 纯视图（重新读出的最新条目，与异步 listVersions 一致——v1.doc 为创建时快照，勿直接用）
  const fresh = (await rawRows()).find((x) => x.id === v1.doc.id);
  const pure = buildDocVersionsView(fresh);
  assert.equal(pure.length, 2);
  assert.deepEqual(pure.map((x) => x.version), [1, 2]);
});

test('④b 旧数据（无 purpose/versions 字段）兼容：listVersions 单条含 by/at；buildDocVersionsView 容错', async () => {
  beginMockCase();
  // 直接构造一条“旧数据”入 mockDB（无 purpose/versions 字段，模拟增强前落库记录；
  // 不经 adapter.create——后者会覆写 uploadedAt 为当前时间，无法复现“旧时间”）
  mockDB.branchDocs = [...mockDB.branchDocs, {
    id: 'bd-legacy-1', title: '旧版普通文件', desc: '', fileName: 'old.pdf', filePath: '/f/old.pdf',
    status: 'archived', uploadedBy: 'p3', uploadedAt: '2026-08-01T00:00:00.000Z',
  }];
  const legacy = mockDB.branchDocs[mockDB.branchDocs.length - 1];
  const view = await listVersions(legacy.id);
  assert.equal(view.length, 1, '旧数据至少返回自身单条视图');
  assert.equal(view[0].version, 1);
  assert.equal(view[0].by, 'p3');
  assert.equal(view[0].at, '2026-08-01T00:00:00.000Z');
  assert.equal(view[0].status, 'archived');
  assert.equal(buildDocVersionsView(null).length, 0, 'null 容错');
});

// ═══════════════ ⑤ renderDocBody 安全渲染 ═══════════════
test('⑤ renderDocBody 转义安全：脚本/事件/伪协议一律不执行（输出无可执行形态）', () => {
  // <script> 被整体转义
  const r1 = renderDocBody('<script>alert(1)</script>');
  assert.ok(!r1.includes('<script'), '不得输出原始 <script> 标签');
  assert.ok(r1.includes('&lt;script&gt;'), '应输出转义后的实体文本');
  // onerror 属性注入不生效（字面文本里保留 onerror= 字样无害，关键在于不进入任何标签属性）
  const r2 = renderDocBody('<img src=x onerror=alert(1)>');
  assert.ok(!/<img[\s/>]/.test(r2), '不得输出 <img 标签');
  assert.ok(!/<[a-z][^>]*\sonerror\s*=/.test(r2), '标签内不得出现 onerror 属性');
  assert.ok(r2.includes('&lt;img'), '以转义文本呈现');
  // javascript: 伪协议链接——本渲染子集不支持链接语法，原样文本，无任何 href/可点击产物
  const r3 = renderDocBody('[点击](javascript:alert(1))');
  assert.ok(!r3.includes('href='), '渲染产物不允许出现任何 href/属性注入');
  assert.ok(!/<a[\s>]/.test(r3), '不得输出 <a> 可点击链接');
  // 引号/尖括号类内容全部转义，内部 HTML 标签以文本呈现
  const r4 = renderDocBody('a" onmouseover="x<b>');
  assert.ok(!r4.includes('<b>'), '内部 HTML 标签以文本呈现');
});

test('⑤b renderDocBody Markdown 子集生效（标题/加粗/列表/行内码/代码块/段落）', () => {
  assert.equal(renderDocBody('# 一级标题'), '<h1>一级标题</h1>');
  assert.equal(renderDocBody('## 二级标题'), '<h2>二级标题</h2>');
  assert.equal(renderDocBody('### 三级标题'), '<h3>三级标题</h3>');
  assert.equal(renderDocBody('普通**加粗**文字'), '<p>普通<strong>加粗</strong>文字</p>');
  assert.equal(renderDocBody('用 `code` 表示'), '<p>用 <code>code</code> 表示</p>');
  // 无序/有序列表
  const ul = renderDocBody('- 甲\n- 乙');
  assert.ok(ul.includes('<ul>') && ul.includes('<li>甲</li>') && ul.includes('<li>乙</li>') && ul.includes('</ul>'));
  const ol = renderDocBody('1. 一\n2. 二');
  assert.ok(ol.includes('<ol>') && ol.includes('<li>一</li>') && ol.includes('<li>二</li>') && ol.includes('</ol>'));
  // 代码块围栏
  const fenced = renderDocBody('```\nlet x = 1;\n```');
  assert.ok(fenced.includes('<pre><code>'), '代码块开标签');
  assert.ok(fenced.includes('</code></pre>'), '代码块闭标签');
  assert.ok(fenced.includes('let x = 1;'), '代码块内容保留');
  // 行内代码内容不被加粗解释误伤
  const mixed = renderDocBody('`a**b**c` 与 **粗**');
  assert.ok(mixed.includes('<code>a**b**c</code>'), '行内代码内 ** 保持字面');
  assert.ok(mixed.includes('<strong>粗</strong>'), '代码外的 ** 正常加粗');
  // 段落 + 空行分隔
  const para = renderDocBody('第一段\n\n第二段');
  assert.ok(para.includes('<p>第一段</p>') && para.includes('<p>第二段</p>'));
});

test('⑤c renderDocBody 边界：非 string 返回空串；超长（>20000）截断并提示', () => {
  assert.equal(renderDocBody(null), '');
  assert.equal(renderDocBody(undefined), '');
  assert.equal(renderDocBody(12345), '');
  assert.equal(renderDocBody(''), '');

  const long = '甲'.repeat(BODY_MAX_LEN + 500);
  const out = renderDocBody(long);
  assert.ok(out.length < (BODY_MAX_LEN + 200), '超长正文被截断（输出受控）');
  assert.ok(out.includes('仅显示前'), '超长输出含截断提示');
  // 恰在上限内不截断提示
  const okLen = renderDocBody('乙'.repeat(BODY_MAX_LEN));
  assert.ok(!okLen.includes('仅显示前'));
});

// ═══════════════ ⑥ listDocs 过滤与排序 ═══════════════
test('⑥ listDocs：只看制度 / 按状态过滤；updatedAt 倒序；旧 doc 数据混排不报错', async () => {
  beginMockCase();
  await saveDoc({ purpose: 'institution', title: '制度X', bodyText: 'b1', by: 'p13', role: 'secretary' });
  const second = await saveDoc({ purpose: 'institution', title: '制度Y', bodyText: 'b2', by: 'p14', role: 'deputy-secretary' });
  await setDocStatus({ id: second.doc.id, status: 'disabled', by: 'p14', role: 'deputy-secretary' });
  await saveDoc({ purpose: 'doc', title: '普通文件', fileName: 'n.pdf', filePath: '/f/n.pdf', by: 'p3', role: 'org-commissioner' });

  const all = await listDocs();
  assert.equal(all.length, 3, '默认返回全部（制度+普通）');

  const inst = await listDocs({ onlyInstitution: true });
  assert.equal(inst.length, 2);
  assert.ok(inst.every((d) => d.purpose === 'institution'));

  const current = await listDocs({ onlyInstitution: true, status: 'current' });
  assert.equal(current.length, 1);
  assert.equal(current[0].title, '制度X');
  const disabled = await listDocs({ onlyInstitution: true, status: 'disabled' });
  assert.equal(disabled.length, 1);
  assert.equal(disabled[0].title, '制度Y');

  // 排序：更新（停用）后的制度Y 应排最前（updatedAt 生效）
  const sorted = await listDocs({ onlyInstitution: true });
  assert.equal(sorted[0].id, second.doc.id, '停用写入 updatedAt → 最新在前');
});

// ═══════════════ ⑦ 普通文件编辑兼容 ═══════════════
test('⑦ 普通文件编辑（title/desc/替换附件）保留现状能力；旧数据可正常列出', async () => {
  beginMockCase();
  const created = await saveDoc({
    purpose: 'doc', title: '考察表', desc: '原描述',
    fileName: 'v1.docx', filePath: '/f/v1.docx', by: 'p3', role: 'org-commissioner',
  });
  // 编辑 title/desc（不带新附件 → 保留原文件）
  const edited = await saveDoc({
    id: created.doc.id, purpose: 'doc', title: '考察表·改', desc: '新描述',
    by: 'p3', role: 'org-commissioner',
  });
  assert.equal(edited.ok, true, JSON.stringify(edited));
  assert.equal(edited.doc.title, '考察表·改');
  assert.equal(edited.doc.desc, '新描述');
  assert.equal(edited.doc.fileName, 'v1.docx', '未传新附件保留原文件');

  // 编辑并替换附件
  const replaced = await saveDoc({
    id: created.doc.id, purpose: 'doc', title: '考察表·改2',
    fileName: 'v2.docx', filePath: '/f/v2.docx', by: 'p3', role: 'org-commissioner',
  });
  assert.equal(replaced.ok, true);
  assert.equal(replaced.doc.fileName, 'v2.docx');
  assert.equal(replaced.doc.filePath, '/f/v2.docx');

  // 试图用普通编辑路径改制度文本 → 拒绝并提示走「上传新版」
  const inst = await saveDoc({ purpose: 'institution', title: '制度Z', bodyText: 'zb', by: 'p13', role: 'secretary' });
  const badEdit = await saveDoc({
    id: inst.doc.id, purpose: 'institution', title: '改制度', by: 'p13', role: 'secretary',
  });
  assert.equal(badEdit.ok, false);
  assert.match(badEdit.reason, /上传新版/);

  const rows = await listDocs();
  assert.equal(rows.length, 2, '制度 + 普通文件同在列表');
});

// ═══════════════ ⑧ mock 整库持久 ═══════════════
test('⑧ mock 刷新持久：新建+新版+停用后重 loadDB（模拟刷新）仍完整保留', async () => {
  beginMockCase();
  const v1 = await saveDoc({
    purpose: 'institution', title: '制度P', bodyText: 'p 正文 v1', by: 'p13', role: 'secretary',
  });
  await publishNewVersion({
    id: v1.doc.id, bodyText: 'p 正文 v2', note: 'n', by: 'p13', role: 'secretary',
  });
  await setDocStatus({ id: v1.doc.id, status: 'disabled', by: 'p13', role: 'secretary' });

  // 模拟刷新：重 loadDB（整库键 workflowos_branch_db_v1 恢复）
  MockAdapter.loadDB();

  const after = await listDocs();
  assert.equal(after.length, 1, '刷新后制度仍在');
  const d = after[0];
  assert.equal(d.status, 'disabled');
  assert.equal(d.version, 2);
  assert.equal(d.versions.length, 1);
  assert.equal(d.versions[0].version, 1);
  assert.equal(d.bodyText, 'p 正文 v2');
});

// 权限辅助断言
test('isInstitutionManager 角色判定：书记/副书记 true；其余 false', () => {
  assert.equal(isInstitutionManager('secretary'), true);
  assert.equal(isInstitutionManager('deputy-secretary'), true);
  assert.equal(isInstitutionManager('org-commissioner'), false);
  assert.equal(isInstitutionManager('participant'), false);
  assert.equal(isInstitutionManager(null), false);
  assert.equal(isInstitutionManager(undefined), false);
});
