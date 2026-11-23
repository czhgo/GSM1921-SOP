// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/public-portal-leak-guard.test.mjs —— 匿名接口字段白名单守卫
//  （2026-11-08 批次 536 · Task 6 · 对应 spec I8）
//
//  守什么：
//    · 响应构造里不得出现内部 / 敏感键（organizer / assignments / voteConfig / createdBy /
//      branchId / audience / personId）；
//    · `server/routes/public-portal.js` 不得引入 `requireAuth` / `requireRole`，不得读 Authorization；
//    · 白名单常量存在且与投影函数输出键逐一相等；
//    · 反例自检：给投影函数喂「毒行」（含全部敏感键）后输出不得带出任何敏感键；
//      并证明静态扫描器能命中人造坏样本（不是恒真）。
// ════════════════════════════════════════════════════════════════
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 导入路由会经过 uploads.js（创建上传根）：走临时目录，不碰运行库 server/uploads。
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-public-portal-leak-'));
process.env.UPLOAD_DIR = TMP_DIR;

const SRC_PATH = path.resolve(import.meta.dirname, '../routes/public-portal.js');
const SOURCE = fs.readFileSync(SRC_PATH, 'utf8');

const mod = await import('../routes/public-portal.js');

after(() => fs.rmSync(TMP_DIR, { recursive: true, force: true }));

/** spec I8 点名的敏感键（响应对象里一律不得出现） */
const SENSITIVE_KEYS = [
  'organizer', 'assignments', 'voteConfig', 'createdBy', 'branchId', 'audience', 'personId',
];

const stripLineComments = (src) => src.split(/\r?\n/).map((line) => line.replace(/\/\/.*$/, '')).join('\n');

/** 取 `export function <name>(` 的函数体（花括号配对；投影函数体内无字符串花括号） */
function functionBody(src, name) {
  const marker = `export function ${name}(`;
  const start = src.indexOf(marker);
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

/** 取所有 `res.json({...})` 的对象字面量（首个非空白字符必须是 `{`，其余调用跳过） */
function jsonObjectBlocks(src) {
  const blocks = [];
  const call = 'res.json(';
  let from = 0;
  for (;;) {
    const idx = src.indexOf(call, from);
    if (idx < 0) break;
    const afterParen = idx + call.length;
    const open = src.indexOf('{', afterParen);
    if (open < 0) break;
    if (src.slice(afterParen, open).trim() !== '') {
      from = afterParen;
      continue;
    }
    let depth = 0;
    let end = open;
    for (; end < src.length; end += 1) {
      const ch = src[end];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(src.slice(idx, end + 1));
    from = end + 1;
  }
  return blocks;
}

const hitsSensitive = (block) => SENSITIVE_KEYS.filter((key) => new RegExp(`\\b${key}\\b`).test(block));

test('① 白名单常量存在且与 spec 一致', () => {
  assert.deepEqual(
    [...mod.PUBLIC_ACTIVITY_FIELDS],
    ['id', 'title', 'type', 'date', 'location', 'publicSummary', 'publishExpiresAt'],
  );
  assert.deepEqual(
    [...mod.PUBLIC_NOTICE_FIELDS],
    ['id', 'title', 'content', 'priority', 'publishDate', 'publishExpiresAt'],
  );
  assert.deepEqual(
    [...mod.PUBLIC_DOCUMENT_FIELDS],
    ['id', 'title', 'summary', 'format', 'fileName', 'fileSize', 'updatedAt', 'publishExpiresAt', 'downloadUrl'],
  );
});

test('② 静态扫描：投影函数体与 res.json 对象块不含敏感键', () => {
  const regions = {
    projectPublicActivity: functionBody(SOURCE, 'projectPublicActivity'),
    projectPublicNotice: functionBody(SOURCE, 'projectPublicNotice'),
    projectPublicDocument: functionBody(SOURCE, 'projectPublicDocument'),
    ...Object.fromEntries(jsonObjectBlocks(SOURCE).map((block, index) => [`res.json#${index + 1}`, block])),
  };
  for (const [name, block] of Object.entries(regions)) {
    assert.ok(block, `${name} 必须可定位（扫描口径失效即红）`);
    assert.deepEqual(hitsSensitive(block), [], `${name} 不得出现敏感键`);
  }

  // 响应不得整行展开
  const code = stripLineComments(SOURCE);
  assert.doesNotMatch(code, /res\.json\(\s*row\s*\)/, '响应不得直接展开原行');
  assert.doesNotMatch(code, /res\.json\(\s*rows\s*\)/, '响应不得直接展开原表');

  // 非空转：人造坏样本必须被同一扫描器命中
  assert.deepEqual(hitsSensitive('return { id: row.id, organizer: row.organizer };'), ['organizer']);
  assert.deepEqual(hitsSensitive('return { id: row.id, title: row.title };'), []);
  const flatBad = 'res.json({ notices, createdBy: row.createdBy })';
  assert.deepEqual(hitsSensitive(flatBad), ['createdBy']);
});

test('③ 运行期毒行：投影只输出白名单键，敏感键一个不漏不出去', () => {
  const poison = {
    id: 'poison', title: '标题', type: 'meeting', date: '2099-01-01T00:00:00.000Z',
    location: '地点', publicSummary: '摘要', publishExpiresAt: '2099-01-01T00:00:00.000Z',
    content: '正文', priority: 'high', publishDate: '2026-01-01T00:00:00.000Z',
    summary: '资料摘要', format: 'pdf', fileName: 'f.pdf', fileSize: 1,
    updatedAt: '2026-01-01T00:00:00.000Z', bodyText: '资料正文',
    downloadUrl: '/evil',
    organizer: { personId: 'p-organizer' },
    assignments: [{ personId: 'p-assignee' }],
    voteConfig: { method: 'secret' },
    createdBy: 'p-creator',
    branchId: 'br-b1',
    audience: ['all'],
    personId: 'p-audience',
    reads: ['p-reader'],
    targetBranchIds: ['all'],
    fileData: 'data:text/plain;base64,eA==',
    filePath: '/api/v1/uploads/x.txt',
    uploadedBy: 'p-uploader',
    description: '内部描述',
    agenda: [{ title: '议程' }],
  };

  const activity = mod.projectPublicActivity(poison);
  assert.deepEqual(Object.keys(activity).sort(), [...mod.PUBLIC_ACTIVITY_FIELDS].sort());
  assert.deepEqual(hitsSensitive(JSON.stringify(activity)), []);

  const notice = mod.projectPublicNotice(poison);
  assert.deepEqual(Object.keys(notice).sort(), [...mod.PUBLIC_NOTICE_FIELDS].sort());
  assert.deepEqual(hitsSensitive(JSON.stringify(notice)), []);

  const document = mod.projectPublicDocument(poison);
  assert.deepEqual(Object.keys(document).sort(), [...mod.PUBLIC_DOCUMENT_FIELDS].sort());
  assert.deepEqual(hitsSensitive(JSON.stringify(document)), []);
  assert.equal(document.downloadUrl, '/api/public/documents/poison/download', 'downloadUrl 由服务端计算，不取原行');

  // 批次 541：无附件的公开资料不得出下载链（键保留、值 null），避免「点了必然 404」的入口
  const noFile = mod.projectPublicDocument({ id: 'no-file', title: '无附件', fileName: 'none.txt' });
  assert.equal(noFile.downloadUrl, null, '无 fileData / filePath ⇒ downloadUrl 必须为 null');
  const pathOnly = mod.projectPublicDocument({ id: 'path-only', fileName: 'a.txt', filePath: '/api/v1/uploads/a.txt' });
  assert.equal(pathOnly.downloadUrl, '/api/public/documents/path-only/download', '有 filePath ⇒ 仍出下载链');
  const badBase64 = mod.projectPublicDocument({ id: 'bad-data', fileData: 'not-base64!!' });
  assert.equal(badBase64.downloadUrl, null, '无法解码的 fileData 等同于无附件');
});

test('④ 公开路由未引入鉴权：不出现 requireAuth / requireRole / Authorization', () => {
  const code = stripLineComments(SOURCE);
  assert.doesNotMatch(code, /requireAuth/, '匿名接口不得引入 requireAuth');
  assert.doesNotMatch(code, /requireRole/, '匿名接口不得引入 requireRole');
  assert.doesNotMatch(code, /authorization/i, '匿名接口不得读 Authorization 头');
  assert.match(code, /export function createPublicPortalRouter/, '入口导出仍在');
});
