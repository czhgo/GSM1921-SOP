// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/security-hardening.test.mjs —— 波次 B 安全加固（2026-11-08）
//
//  覆盖：
//   · G4 名册提案确认复核：落 `users.developStage` 前重读当前阶段，≠ 提案 `fromStage` ⇒ 409；
//     `toStage` 不在合法枚举 ⇒ 422；
//   · G5 副本同步复核：原件已取消 / 归档，或 `targetBranchIds` 已不含副本支部 ⇒ 409 且不覆盖副本；
//     恢复下发范围后同步 200；
//   · L-09 `issue-unread` 派发位：请求 `assigneeId` 必须等于事项行 `assignee`，否则 403；
//   · publication_audits：v14 生成列 + 索引；读口 `{ rows, total, limit, offset }` 分页；
//   · 公共下载进程内限频：超限 429 且不写留痕。
//
//  自包含：`createApp({ dbPath: ':memory:' })` + 直写 users / branches / issues；HTTP 直连。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 导入 app 会经过 uploads.js（创建上传根）：走临时目录，不碰运行库 server/uploads。
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-security-hardening-'));
process.env.UPLOAD_DIR = TMP_DIR;

const { createApp } = await import('../app.js');
const { __downloadRateState, __pruneDownloadRateHits } = await import('../routes/public-portal.js');

const BRANCHES = [
  { id: 'br-b1', name: '本科第一党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'br-b2', name: '本科第二党支部', type: '本科生', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
];
const USERS = [
  { id: 'pc-1', name: '党委组织员', studentId: '9000000001', role: 'party-staff', branchId: null, developStage: '', partyGroup: '' },
  { id: 'sec-1', name: '第一支部书记', studentId: '2300010001', role: 'secretary', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'org-1', name: '第一支部组织委员', studentId: '2300010002', role: 'org-commissioner', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
  { id: 'mem-1', name: '成员甲', studentId: '2400012349', role: 'participant', branchId: 'br-b1', developStage: '积极分子', partyGroup: '第一党小组' },
  { id: 'mem-2', name: '成员乙', studentId: '2400012350', role: 'participant', branchId: 'br-b1', developStage: '正式党员', partyGroup: '第一党小组' },
];

let app, server, base, db;
const tokens = {};

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  db = app.locals.db;
  const insertBranch = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (const branch of BRANCHES) insertBranch.run(branch.id, JSON.stringify(branch));
  const insertUser = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const user of USERS) insertUser.run(user.id, JSON.stringify(user));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const user of USERS) {
    const response = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.id, password: '123456' }),
    });
    assert.equal(response.status, 200, `登录失败：${user.id}`);
    tokens[user.id] = (await response.json()).token;
  }
});

after(() => {
  server?.closeAllConnections?.();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  return new Promise((resolve) => server?.close(resolve));
});

async function request(personId, method, path, body) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[personId]}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const userRow = (id) => JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get(id).data);
const changeRow = (id) => JSON.parse(db.prepare('SELECT data FROM member_change_requests WHERE id = ?').get(id).data);
const futureIso = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

// ════════════════════════════════════════════════════════════════
//  G4 名册提案确认复核
// ════════════════════════════════════════════════════════════════

test('G4：确认前阶段已被改动 ⇒ 409「阶段已变化」，提案与成员阶段均不变', async () => {
  const created = await request('pc-1', 'POST', 'committee/roster-proposals', {
    branchId: 'br-b1',
    personId: 'mem-1',
    fromStage: '积极分子',
    toStage: '发展对象',
    note: '党委建议推进',
  });
  assert.equal(created.status, 201);
  const proposalId = created.data.id;

  const approved = await request('org-1', 'POST', `member-change-requests/${proposalId}/approve`);
  assert.equal(approved.status, 200);
  assert.equal(approved.data.status, 'pending-secretary');

  // 期间阶段被改（模拟他处已推进）
  db.prepare('UPDATE users SET data = ? WHERE id = ?')
    .run(JSON.stringify({ ...userRow('mem-1'), developStage: '预备党员' }), 'mem-1');

  const confirmed = await request('sec-1', 'POST', `member-change-requests/${proposalId}/confirm`);
  assert.equal(confirmed.status, 409);
  assert.match(String(confirmed.data.error), /阶段已变化/);
  assert.equal(userRow('mem-1').developStage, '预备党员', '确认被拒不得覆盖当前阶段');
  assert.equal(changeRow(proposalId).status, 'pending-secretary', '确认被拒不得推进提案状态');
});

test('G4：toStage 不在合法阶段枚举 ⇒ 422，且不落 users.developStage', async () => {
  db.prepare('INSERT INTO member_change_requests (id, data) VALUES (?, ?)').run('mcr-bad-stage', JSON.stringify({
    id: 'mcr-bad-stage',
    branchId: 'br-b1',
    personId: 'mem-1',
    fromStage: '预备党员',
    toStage: '不存在的阶段',
    status: 'pending-secretary',
    createdAt: new Date().toISOString(),
  }));

  const confirmed = await request('sec-1', 'POST', 'member-change-requests/mcr-bad-stage/confirm');
  assert.equal(confirmed.status, 422);
  assert.equal(userRow('mem-1').developStage, '预备党员', '非法目标阶段不得落库');
  assert.equal(changeRow('mcr-bad-stage').status, 'pending-secretary', '非法目标阶段不得推进提案状态');
});

// ════════════════════════════════════════════════════════════════
//  G5 副本同步复核
// ════════════════════════════════════════════════════════════════

test('G5：原件下发范围收窄 ⇒ 同步 409 且不覆盖副本；恢复后同步 200', async () => {
  const source = await request('pc-1', 'POST', 'committee/activities', {
    id: 'act-g5-source',
    title: 'G5 原件标题',
    type: '主题党日',
    date: '2026-12-01',
    location: '大礼堂',
    description: 'G5 原说明',
    targetBranchIds: ['br-b1'],
  });
  assert.equal(source.status, 201);

  const adopted = await request('sec-1', 'POST', 'activities/act-g5-source/adopt');
  assert.equal(adopted.status, 201);
  const copyId = adopted.data.activity.id;
  assert.equal(adopted.data.activity.title, 'G5 原件标题');

  // 原件内容升级（版本前进）后再收窄下发范围
  const edited = await request('pc-1', 'PATCH', 'committee/activities/act-g5-source', { title: 'G5 原件新标题' });
  assert.equal(edited.status, 200);
  const narrowed = await request('pc-1', 'PATCH', 'committee/activities/act-g5-source', { targetBranchIds: ['br-b2'] });
  assert.equal(narrowed.status, 200);

  const denied = await request('sec-1', 'POST', `activities/${copyId}/sync-source`);
  assert.equal(denied.status, 409);
  assert.match(String(denied.data.error), /下发范围/);
  const afterDenied = JSON.parse(db.prepare('SELECT data FROM activities WHERE id = ?').get(copyId).data);
  assert.equal(afterDenied.title, 'G5 原件标题', '409 不得覆盖副本内容');
  assert.equal(afterDenied.sourceVersion, 1, '409 不得推进 sourceVersion');

  // 恢复范围 ⇒ 同步 200 并覆盖内容字段
  const restored = await request('pc-1', 'PATCH', 'committee/activities/act-g5-source', { targetBranchIds: ['br-b1'] });
  assert.equal(restored.status, 200);
  const synced = await request('sec-1', 'POST', `activities/${copyId}/sync-source`);
  assert.equal(synced.status, 200);
  assert.equal(synced.data.synced, true);
  assert.equal(synced.data.activity.title, 'G5 原件新标题');
});

// ════════════════════════════════════════════════════════════════
//  L-09 issue-unread assignee 强校验
// ════════════════════════════════════════════════════════════════

test('L-09：派发位标记未读时 assignee 必须等于事项行 assignee，错误 403 / 正确 200', async () => {
  db.prepare('INSERT INTO issues (id, data) VALUES (?, ?)').run('issue-l09', JSON.stringify({
    id: 'issue-l09',
    branchId: 'br-b1',
    assignee: 'mem-1',
    submittedBy: 'sec-1',
    status: 'open',
    title: 'L-09 用例事项',
  }));

  const wrong = await request('sec-1', 'POST', 'issue-unread', { assigneeId: 'mem-2', issueId: 'issue-l09' });
  assert.equal(wrong.status, 403);
  assert.match(String(wrong.data.error), /被指派人/);
  assert.equal(db.prepare('SELECT id FROM issue_unread WHERE id = ?').get('mem-2:issue-l09'), undefined,
    '403 不得落库');

  const ok = await request('sec-1', 'POST', 'issue-unread', { assigneeId: 'mem-1', issueId: 'issue-l09' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.assigneeId, 'mem-1');
  assert.equal(ok.data.unread, true);
});

// ════════════════════════════════════════════════════════════════
//  publication_audits 索引 / 分页
// ════════════════════════════════════════════════════════════════

test('v14：publication_audits 生成列 at / resource_type / resource_id 与两只索引存在', () => {
  const columns = db.prepare('PRAGMA table_xinfo(publication_audits)').all();
  for (const name of ['at', 'resource_type', 'resource_id']) {
    const info = columns.find((c) => c.name === name);
    assert.ok(info, `v14 缺生成列 ${name}`);
    assert.notEqual(info.hidden, 0, `${name} 必须是 GENERATED/VIRTUAL（只读）`);
  }

  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map((r) => r.name));
  for (const name of ['idx_publication_audits_at', 'idx_publication_audits_resource']) {
    assert.ok(indexes.has(name), `v14 缺索引 ${name}`);
  }

  db.prepare('INSERT INTO publication_audits (id, data) VALUES (?, ?)').run('pub-raw-v14', JSON.stringify({
    id: 'pub-raw-v14',
    at: '2026-11-08T10:00:00.000Z',
    resourceType: 'activity',
    resourceId: 'act-raw',
  }));
  const projected = db.prepare('SELECT at, resource_type, resource_id FROM publication_audits WHERE id = ?').get('pub-raw-v14');
  assert.deepEqual({ ...projected }, {
    at: '2026-11-08T10:00:00.000Z',
    resource_type: 'activity',
    resource_id: 'act-raw',
  });
  db.prepare('DELETE FROM publication_audits WHERE id = ?').run('pub-raw-v14');
});

test('分页：返回 { rows, total, limit, offset }，limit 1..100、默认 50，过滤保留', async () => {
  for (const [index, id] of ['bd-page-1', 'bd-page-2', 'bd-page-3'].entries()) {
    const created = await request('pc-1', 'POST', 'committee/documents', { id, title: `分页资料 ${index + 1}` });
    assert.equal(created.status, 201);
  }

  const page = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&limit=2&offset=1');
  assert.equal(page.status, 200);
  assert.equal(page.data.total, 3);
  assert.equal(page.data.limit, 2);
  assert.equal(page.data.offset, 1);
  assert.equal(page.data.rows.length, 2);

  const defaults = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document');
  assert.equal(defaults.data.limit, 50);
  assert.equal(defaults.data.offset, 0);
  assert.equal(defaults.data.total, 3);
  assert.equal(defaults.data.rows.length, 3);

  const clampedHigh = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&limit=999');
  assert.equal(clampedHigh.data.limit, 100);
  const clampedLow = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&limit=0');
  assert.equal(clampedLow.data.limit, 1);
  assert.equal(clampedLow.data.rows.length, 1);
  const negativeOffset = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&offset=-5');
  assert.equal(negativeOffset.data.offset, 0);

  const filteredOut = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=none');
  assert.equal(filteredOut.data.total, 0);
  assert.deepEqual(filteredOut.data.rows, []);
});

// ════════════════════════════════════════════════════════════════
//  公开下载限频
// ════════════════════════════════════════════════════════════════

test('限频：同 IP 超阈值 ⇒ 429 且不写留痕（阈值可由 env 注入）', async () => {
  const fileData = `data:text/plain;base64,${Buffer.from('security-hardening').toString('base64')}`;
  const created = await request('pc-1', 'POST', 'committee/documents', {
    id: 'bd-rate',
    title: '限频资料',
    summary: '公开摘要',
    fileName: 'rate.txt',
    format: 'txt',
    fileData,
    publishScope: 'public',
    publishExpiresAt: futureIso(),
  });
  assert.equal(created.status, 201);

  process.env.PUBLIC_DOWNLOAD_RATE_LIMIT = '2';
  try {
    const url = `${base}/api/public/documents/bd-rate/download`;
    const download = () => fetch(url);

    assert.equal((await download()).status, 200, '第 1 次下载放行');
    assert.equal((await download()).status, 200, '第 2 次下载放行');

    const limited = await download();
    assert.equal(limited.status, 429);
    const body = await limited.json();
    assert.equal(body.error, 'too many requests');
    assert.ok(body.retryAfterMs > 0, `retryAfterMs 须为正数（实得 ${body.retryAfterMs}）`);

    const audits = await request('pc-1', 'GET', 'committee/publication-audits?resourceType=document&resourceId=bd-rate&action=download');
    assert.equal(audits.status, 200);
    assert.equal(audits.data.total, 2, '429 不得写下载留痕（2 次成功下载 = 2 条）');
  } finally {
    delete process.env.PUBLIC_DOWNLOAD_RATE_LIMIT;
  }
});

test('上传门：党委可上传院级资料附件 201；普通成员仍 403', async () => {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'x.png');
  const asParty = await fetch(`${base}/api/v1/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens['pc-1']}` },
    body: form,
  });
  assert.equal(asParty.status, 201, '党委上传应 201');
  const meta = await asParty.json();
  assert.equal(meta.filename, 'x.png');

  const form2 = new FormData();
  form2.append('file', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'y.png');
  const asMember = await fetch(`${base}/api/v1/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens['mem-1']}` },
    body: form2,
  });
  assert.equal(asMember.status, 403, '普通成员上传应 403');
});

// ════════════════════════════════════════════════════════════════
//  批次 541 P2 统一清理：下发状态门 / 限频表有界 / v15 提案唯一索引
// ════════════════════════════════════════════════════════════════

test('541-1 下发只收 published / ongoing 且未归档：草稿 / 已取消 / 已归档 409 且不写通知', async () => {
  const noticeCount = (sourceId) => db.prepare(
    "SELECT COUNT(*) AS c FROM notices WHERE json_extract(data,'$.sourceId') = ?",
  ).get(String(sourceId)).c;

  const draft = await request('pc-1', 'POST', 'committee/activities', {
    id: 'act-541-draft', title: '草稿下发', type: '主题党日', date: '2026-12-10', status: 'draft',
  });
  assert.equal(draft.status, 201);
  const draftDispatch = await request('pc-1', 'POST', 'committee/activities/act-541-draft/dispatch');
  assert.equal(draftDispatch.status, 409, '草稿不得下发');
  assert.match(String(draftDispatch.data.error), /不可下发/);
  assert.equal(noticeCount('act-541-draft'), 0, '409 不得写通知');

  const cancelled = await request('pc-1', 'POST', 'committee/activities', {
    id: 'act-541-cancelled', title: '取消后下发', type: '主题党日', date: '2026-12-11', targetBranchIds: ['all'],
  });
  assert.equal(cancelled.status, 201);
  assert.equal((await request('pc-1', 'POST', 'committee/activities/act-541-cancelled/cancel')).status, 200);
  assert.equal((await request('pc-1', 'POST', 'committee/activities/act-541-cancelled/dispatch')).status, 409);
  assert.equal(noticeCount('act-541-cancelled'), 0);

  const archived = await request('pc-1', 'POST', 'committee/activities', {
    id: 'act-541-archived', title: '归档后下发', type: '主题党日', date: '2026-12-12', targetBranchIds: ['all'],
  });
  assert.equal(archived.status, 201);
  assert.equal((await request('pc-1', 'POST', 'committee/activities/act-541-archived/archive')).status, 200);
  assert.equal((await request('pc-1', 'POST', 'committee/activities/act-541-archived/dispatch')).status, 409);
  assert.equal(noticeCount('act-541-archived'), 0);

  // 对照：published 未归档仍可下发
  const ok = await request('pc-1', 'POST', 'committee/activities', {
    id: 'act-541-published', title: '正常下发', type: '主题党日', date: '2026-12-13', targetBranchIds: ['all'],
  });
  assert.equal(ok.status, 201);
  const dispatched = await request('pc-1', 'POST', 'committee/activities/act-541-published/dispatch');
  assert.equal(dispatched.status, 200);
  assert.equal(dispatched.data.created, 2, "'all' 展开为两个支部");
});

test('541-2 限频表有界：窗口过期后条目可清理（不随请求数无界增长）', async () => {
  const fileData = `data:text/plain;base64,${Buffer.from('rate-prune').toString('base64')}`;
  const created = await request('pc-1', 'POST', 'committee/documents', {
    id: 'bd-rate-prune',
    title: '限频清理资料',
    summary: '公开摘要',
    fileName: 'prune.txt',
    format: 'txt',
    fileData,
    publishScope: 'public',
    publishExpiresAt: futureIso(),
  });
  assert.equal(created.status, 201);

  const download = await fetch(`${base}/api/public/documents/bd-rate-prune/download`);
  assert.equal(download.status, 200);
  assert.ok(__downloadRateState() >= 1, '一次下载后限频表应有本 IP 条目');

  __pruneDownloadRateHits(Date.now() + 61 * 1000);
  assert.equal(__downloadRateState(), 0, '窗口外条目必须被清理（Map 有界）');

  // 清理后同 IP 可再次下载（计数从头开始，不因陈旧条目误判 429）
  const again = await fetch(`${base}/api/public/documents/bd-rate-prune/download`);
  assert.equal(again.status, 200);
});

test('541-3 v15：党委在途提案部分唯一索引存在；重复插入被拒，终态与议程派生提案不占位', () => {
  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map((row) => row.name));
  assert.ok(indexes.has('ux_mcr_committee_inflight'), 'v15 缺部分唯一索引 ux_mcr_committee_inflight');

  const base = {
    branchId: 'br-b1', personId: 'mem-2', source: 'committee-proposal',
    status: 'pending-org-approval', createdAt: '2026-11-10T00:00:00.000Z',
  };
  const put = (id, extra = {}) => db.prepare('INSERT INTO member_change_requests (id, data) VALUES (?, ?)')
    .run(id, JSON.stringify({ id, ...base, ...extra }));

  put('mcr-541-a');
  assert.throws(() => put('mcr-541-b'), /UNIQUE constraint failed/, '同人在途第二条党委提案必须被索引拒绝');

  db.prepare('UPDATE member_change_requests SET data = ? WHERE id = ?')
    .run(JSON.stringify({ id: 'mcr-541-a', ...base, status: 'completed' }), 'mcr-541-a');
  put('mcr-541-b'); // 终态不占位

  // 议程派生提案（source≠committee-proposal）不受本索引约束：同人不同议程可多条在途
  for (const id of ['mcr-541-agenda-1', 'mcr-541-agenda-2']) {
    db.prepare('INSERT INTO member_change_requests (id, data) VALUES (?, ?)').run(id, JSON.stringify({
      id, branchId: 'br-b1', personId: 'mem-2', activityId: 'act-x', agendaItemId: id,
      source: 'agenda', status: 'pending-org-approval',
    }));
  }

  for (const id of ['mcr-541-a', 'mcr-541-b', 'mcr-541-agenda-1', 'mcr-541-agenda-2']) {
    db.prepare('DELETE FROM member_change_requests WHERE id = ?').run(id);
  }
});
