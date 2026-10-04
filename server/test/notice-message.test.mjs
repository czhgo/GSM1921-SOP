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

import { canReadNotice } from '../../docs/src/services/governance/notice.js?v=20261004p';

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
