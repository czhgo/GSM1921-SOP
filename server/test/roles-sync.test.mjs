// server/test/roles-sync.test.mjs — P2c 防漂移：授权语义角色集单一源自洽（2026-09-03）
// 校验 docs/src/core/constants.js 的授权语义角色集（server requireRole 与前端 AuthStore.isCommissioner 共用）：
//   ① 全部角色 ∈ ROLE_KEYS 枚举；
//   ② 业务语义「条条三委员」⊆ 授权支委集（含书记/副书记），防止两套语义混淆（勿把授权集指向条条集）；
//   ③ server/routes 与前端 services/auth.js 不再手写 5 支委授权列表（特征串只允许出现在 constants.js）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ROLE_KEYS, ROLE_LEGACY_KEYS,
  BRANCH_COMMISSION_ROLES, SECRETARY_ROLES, PARTY_STAFF_ROLE, COMMITTEE_IDS,
  COMMISSIONER_ROLES,
} from '../../docs/src/core/constants.js?v=20260908d';

const root = fileURLToPath(new URL('../..', import.meta.url)); // 仓库根

test('授权语义角色集全部 ∈ ROLE_KEYS 业务角色枚举', () => {
  const keys = new Set([...ROLE_KEYS, ...ROLE_LEGACY_KEYS]);
  [...BRANCH_COMMISSION_ROLES, ...SECRETARY_ROLES, ...PARTY_STAFF_ROLE].forEach((r) => {
    assert.ok(keys.has(r), `角色「${r}」不在 ROLE_KEYS/ROLE_LEGACY_KEYS 中`);
  });
});

test('授权支委集 = 5 支委且含书记/副书记；业务「条条三委员」为授权集子集（勿混淆语义）', () => {
  assert.equal(BRANCH_COMMISSION_ROLES.length, 5);
  assert.deepEqual([...SECRETARY_ROLES], ['secretary']);
  assert.ok(BRANCH_COMMISSION_ROLES.includes('secretary') && BRANCH_COMMISSION_ROLES.includes('deputy-secretary'));
  // 业务语义 COMMISSIONER_ROLES（条条集合，含遗留统称键 commissioner）⊆ 授权语义集（跳过遗留键）
  for (const r of COMMISSIONER_ROLES) {
    if (r === 'commissioner') continue; // 遗留键：无独立角色语义，仅兼容兜底
    assert.ok(BRANCH_COMMISSION_ROLES.includes(r), `条条委员「${r}」应属于授权支委集`);
  }
});

test('演示支部支委名单 COMMITTEE_IDS = 5 人（p10~p14）', () => {
  assert.deepEqual(COMMITTEE_IDS, ['p10', 'p11', 'p12', 'p13', 'p14']);
});

test('server 路由与前端鉴权不再手写 5 支委授权列表（特征串仅在 constants.js 出现 1 次）', () => {
  const files = [
    'docs/src/core/constants.js?v=20260908d',
    'docs/src/services/auth.js?v=20260908d',
    'server/routes/auth.js',
    'server/routes/member.js',
    'server/routes/committee.js',
    'server/routes/resources.js',
  ];
  // 特征串 = 5 支委授权列表尾部四角色同行情（手写列表时的经典一行式）
  const feature = `'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'`;
  let total = 0;
  for (const f of files) {
    const n = (readFileSync(`${root}${f.split('?')[0]}`, 'utf8').split(feature).length - 1);
    if (f.includes('constants.js')) {
      // constants.js 允许 2 处：ROLE_KEYS 角色枚举行（合法字面量）+ BRANCH_COMMISSION_ROLES 授权集
      assert.equal(n, 2, `constants.js 应恰好保留 2 处（ROLE_KEYS 枚举 + 授权集），当前 ${n}`);
    } else {
      assert.equal(n, 0, `${f} 不应再手写 5 支委授权列表（当前 ${n} 处）`);
    }
    total += n;
  }
  assert.equal(total, 2);
});
