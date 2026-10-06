// role: [工程师]+[AI]
// server/test/notice-message.test.mjs — 站内信（`noticeType:'message'`）可见性判据（2026-10-02 批次 348 ·
//   支书 `#4`「站内信 是一个 很重要的形式！！请一定要思考落地！！」；落地形 ＝ 通知发布表单的「指定人（私发）」档，
//   与 `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:152`「指定人（私发）| 工作私信」的既有设计口径一致）。
//
// 判据（本件即唯一裁决）：
//   **站内信仅「发件人 ＋ 收件人」可见**——必须是**支委层兜底（「支委层可读任意通知」）之前**的独立判据。
//   反例锁死：若把该判据写成 ④ 之后的普通分支，`N1` 的「支委层他人不可读」立刻变红。
// 覆盖（纯 node；`canReadNotice` 为纯函数，显式传 viewer 不依赖会话）：
//   N1 站内信：发件人 ✓ / 收件人 ✓ / **支委层他人 ✗** / 无关成员 ✗ / 无会话 ✗
//   N2 对照：普通通知既有口径未误伤（广播全员可读 · 按角色受众命中 · 支委层仍可读任意通知 · 非受众非支委仍拒）
// 运行：node --test test/notice-message.test.mjs（server 目录）
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { canReadNotice } from '../../docs/src/services/governance/notice.js?v=20261006c';
import { _snapshotNoticeMessageGateDeny, NOTICE_MESSAGE_DENY_MSG } from '../routes/resources/gates.js';

const MSG = {
  id: 'ntc-msg-1',
  title: '关于支部工作的一点沟通',
  content: '（站内信正文）',
  noticeType: 'message',
  fromPersonId: 'p13',
  audiencePersons: ['p5'],
  read: false,
};
const SENDER = { role: 'secretary', personId: 'p13' };
const RECIPIENT = { role: 'participant', personId: 'p5' };
const OTHER_COMMITTEE = { role: 'org-commissioner', personId: 'p10' }; // 支委层**他人**
const BYSTANDER = { role: 'participant', personId: 'p7' };

test('N1 站内信：发件人 ＋ 收件人可读；支委层他人 / 无关成员 / 无会话**不可读**（反例锁死）', () => {
  assert.equal(canReadNotice(MSG, SENDER), true, '发件人（fromPersonId）可读');
  assert.equal(canReadNotice(MSG, RECIPIENT), true, '收件人（audiencePersons）可读');
  assert.equal(canReadNotice(MSG, OTHER_COMMITTEE), false,
    '支委层**他人**不可读——私信不得被「支委层可读任意通知」那条兜底读走（判据须在其之前）');
  assert.equal(canReadNotice(MSG, BYSTANDER), false, '无关成员不可读');
  assert.equal(canReadNotice(MSG, null), false, '无会话不可读（私信不广播）');
});

test('N2 对照：普通通知的既有可见性口径未被误伤', () => {
  assert.equal(canReadNotice({ id: 'n2', title: '支部大会通知', audience: ['all'], read: false }, BYSTANDER), true,
    '广播（all）→ 全员可读');
  assert.equal(canReadNotice({ id: 'n3', title: '给组织委员', audience: ['org-commissioner'], read: false }, OTHER_COMMITTEE), true,
    '按角色受众 → 命中');
  assert.equal(canReadNotice({ id: 'n4', title: '给组长', audience: ['leader'], read: false }, OTHER_COMMITTEE), true,
    '④「支委层可读任意通知」既有口径未改（普通通知仍可被支委层读到）');
  assert.equal(canReadNotice({ id: 'n5', title: '给组长', audience: ['leader'], read: false }, BYSTANDER), false,
    '非受众、非支委 → 仍不可读（非恒真）');
});

// ── N3 / N4（2026-10-05 批次 393）：服务端**快照口私信写门**（发送权于批次 406 · `D-793` 放开到全体成员）──
// 由来：私信落库走 `POST /api/v1/snapshot`（整表写穿），该口此前仅 `requireAuth` ⇒ 任一登录成员直连即可
//   伪造一条私信。判据落服务端复算（`server/routes/resources/gates.js::_snapshotNoticeMessageGateDeny`）。
// 反例锁死：若把该门写成恒 `null`（或不接入快照 handler），`N3` 的两条「应拦」与 `N4` 的两条「应拦」立刻变红。
const fakeDb = (rows) => ({ prepare: () => ({ all: () => rows.map((r) => ({ data: JSON.stringify(r) })) }) });

test('N3 服务端私信写门：新增私信须「发件人为本人」（发送权已放开到全体成员）', () => {
  const db = fakeDb([]);
  const mk = (from) => ({ id: 'ntc-new', title: 't', content: 'c', noticeType: 'message', fromPersonId: from, audiencePersons: ['p5'] });
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [mk('p13')] }, { role: 'secretary', id: 'p13' }), null,
    '支书发本人私信 → 放行');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [mk('p4')] }, { role: 'leader', id: 'p4' }), null,
    '党小组组长发本人私信 → 放行');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [mk('p7')] }, { role: 'participant', id: 'p7' }), null,
    '**普通成员**发本人私信 → 放行（批次 406 · `D-793`：全体成员均可发，原「支委层 ∪ 组长」已放开）');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [mk('p7')] }, null), NOTICE_MESSAGE_DENY_MSG,
    '无会话（actor 缺）→ 拦截');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [mk('p5')] }, { role: 'secretary', id: 'p13' }), NOTICE_MESSAGE_DENY_MSG,
    '**代他人**发私信（fromPersonId ≠ 本人）→ 拦截');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [{ id: 'n9', title: 'x', content: 'y', noticeType: undefined }] }, { role: 'participant', id: 'p7' }), null,
    '非私信（普通通知）未受本门影响 → 放行');
});

test('N4 服务端私信写门：既有私信「作者不可改 / 非作者不得改收件人 / 未变行放行」', () => {
  const prev = { id: 'ntc-old', title: 't', content: 'c', noticeType: 'message', fromPersonId: 'p13', audiencePersons: ['p5'] };
  const db = fakeDb([prev]);
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [{ ...prev }] }, { role: 'participant', id: 'p5' }), null,
    '收件人回传未变行（整表写穿必带）→ 放行');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [{ ...prev, fromPersonId: 'p6' }] }, { role: 'secretary', id: 'p13' }), NOTICE_MESSAGE_DENY_MSG,
    '篡改作者（fromPersonId 被改）→ 拦截');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [{ ...prev, audiencePersons: ['p6'] }] }, { role: 'participant', id: 'p5' }), NOTICE_MESSAGE_DENY_MSG,
    '非作者改收件人（把私下一条改成发给别人）→ 拦截');
  assert.equal(_snapshotNoticeMessageGateDeny(db, { notices: [{ ...prev, audiencePersons: ['p5', 'p6'] }] }, { role: 'secretary', id: 'p13' }), null,
    '作者改收件人 → 放行（本门不越权管作者本人）');
});
