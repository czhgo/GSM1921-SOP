// role: [工程师]+[AI]
// material-link-truth.test.mjs — 材料闭环「角色 × 材料行」落点真值守卫（2026-10-20 IA 修复 Task 2）
//
// 为什么要有这条守卫：
//   材料闭环页此前对所有人硬编码 `workspace/disc.html?tab=attendance` 等跨台链接——工作台身份门
//   （core/boot/bootstrap.js）只放行本人角色台，点下去会被弹回并丢失 tab / 活动对象。
//   本测试逐角色 × 四材料行断言落点真值；`null` 必须真的是 null（页面只渲染纯文本交接，不造假按钮）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MATERIAL_ROWS, resolveMaterialHref, resolveMaterialHandoff,
} from '../../docs/src/core/domain/material-links.js?v=20261021b';

const ID = 'act-1';

/** 真值表（与 .ctx/logs/archive/2026-10/IA_LINK_TRUTH.md 一致；role 取 AuthStore 的 role 值） */
const EXPECTED = {
  'secretary': {
    photos: null,
    attendance: 'workspace/secretary.html?activityId=act-1',
    inspection: 'workspace/secretary.html?activityId=act-1',
    review: 'workspace/secretary.html?tab=group-progress',
  },
  'deputy-secretary': {
    photos: null,
    attendance: 'workspace/secretary.html?activityId=act-1',
    inspection: 'workspace/secretary.html?activityId=act-1',
    review: 'workspace/secretary.html?tab=group-progress',
  },
  'org-commissioner': {
    photos: null,
    attendance: null,
    inspection: 'workspace/org.html?tab=talent',
    review: null,
  },
  'prop-commissioner': {
    photos: 'workspace/prop.html?tab=archive&focusActivityId=act-1',
    attendance: null,
    inspection: null,
    review: null,
  },
  'disc-commissioner': {
    photos: null,
    attendance: 'workspace/disc.html?tab=attendance&focusActivityId=act-1',
    inspection: 'workspace/disc.html?tab=inspection&focusActivityId=act-1',
    review: 'workspace/disc.html?tab=review&focusActivityId=act-1',
  },
  'leader': {
    photos: null,
    attendance: 'workspace/leader.html?tab=attendance&focusActivityId=act-1',
    inspection: 'workspace/leader.html?tab=inspection&focusActivityId=act-1',
    review: 'workspace/leader.html?tab=members&focusActivityId=act-1',
  },
  'participant:organizer': {
    photos: null,
    attendance: 'workspace/visitor.html?tab=attendance#org-host',
    inspection: 'workspace/visitor.html?tab=inspection&focusActivityId=act-1',
    review: 'workspace/visitor.html?tab=review&focusActivityId=act-1',
  },
  'participant': {
    photos: null,
    attendance: null,
    inspection: null,
    review: null,
  },
};

test('MATERIAL_ROWS：四类材料行顺序稳定', () => {
  assert.deepEqual(MATERIAL_ROWS, ['photos', 'attendance', 'inspection', 'review']);
});

test('逐角色 × 四行：落点与真值表一致（null 行必须为 null）', () => {
  for (const [key, rows] of Object.entries(EXPECTED)) {
    const [role, flag] = key.split(':');
    const isOrganizer = flag === 'organizer';
    for (const row of MATERIAL_ROWS) {
      assert.equal(
        resolveMaterialHref({ role, isOrganizer, actId: ID, row }),
        rows[row],
        `${key} · ${row} 落点不符`,
      );
    }
  }
});

test('participant 非组织者：四行全为 null（只给纯文本交接）', () => {
  for (const row of MATERIAL_ROWS) {
    assert.equal(resolveMaterialHref({ role: 'participant', isOrganizer: false, actId: ID, row }), null);
    assert.ok(resolveMaterialHandoff({ role: 'participant', isOrganizer: false, row }).length > 0);
  }
});

test('无本位动作的行有交接文案（不返回空串）', () => {
  for (const [key, rows] of Object.entries(EXPECTED)) {
    const [role, flag] = key.split(':');
    const isOrganizer = flag === 'organizer';
    for (const row of MATERIAL_ROWS) {
      if (rows[row] !== null) continue;
      assert.ok(
        resolveMaterialHandoff({ role, isOrganizer, row }).trim().length > 0,
        `${key} · ${row} 缺交接文案`,
      );
    }
  }
});

test('未知角色 / 非法行一律 null（不产出跨台假链接）', () => {
  assert.equal(resolveMaterialHref({ role: 'party-staff', isOrganizer: false, actId: ID, row: 'attendance' }), null);
  assert.equal(resolveMaterialHref({ role: 'participant', isOrganizer: true, actId: ID, row: 'unknown' }), null);
});

test('材料页入口不再硬编码跨台链接，改为消费 resolveMaterialHref', () => {
  const src = readFileSync(new URL('../../docs/src/entries/pages/activity-materials-entry.js', import.meta.url), 'utf8');
  assert.match(src, /resolveMaterialHref\(/, '材料页必须经契约函数计算落点');
  assert.doesNotMatch(src, /workspace\/disc\.html\?tab=attendance/, '不得再硬编码纪检台考勤链接');
  assert.doesNotMatch(src, /workspace\/disc\.html\?tab=inspection/, '不得再硬编码纪检台考察链接');
  assert.doesNotMatch(src, /workspace\/visitor\.html\?tab=review/, '不得再硬编码成员台复盘链接');
  assert.doesNotMatch(src, /workspace\/prop\.html\?tab=archive"[,)]/, '宣传台归档链接须按角色渲染（仅宣传委员）');
});
