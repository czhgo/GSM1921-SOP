// server/security/password.mjs — 个人登录密码散列（波次 G · 2026-11-08）
// ════════════════════════════════════════════════════════════════
//  存储格式：`scrypt$<saltHex>$<hashHex>`（salt 16B / key 64B，scrypt N=16384, r=8, p=1）。
//  · 只用 Node 内置 crypto：不引新依赖；同步实现（scryptSync）保证 `/auth/login` 保持同步处理器，
//    不把既有 Express 4 同步路由改成 async（异步抛错会变成未处理拒绝、请求挂起）。
//  · 比对用 `timingSafeEqual`，长度不等先判否（timingSafeEqual 长度不等会抛）。
//  · `stripPasswordHash` 是**读口脱敏唯一出口**：`users.data` 可携带 `passwordHash`，
//    任何把用户行返回给客户端 / 落审计的响应都必须先经过它（见 auth.js / resources / member / branch-roster / iaaa）。
// ════════════════════════════════════════════════════════════════
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

/** 合法散列串：`scrypt$<32 hex salt>$<128 hex key>`（仅格式校验，不做开销验证） */
export const PASSWORD_HASH_PATTERN = /^scrypt\$[0-9a-fA-F]{32}\$[0-9a-fA-F]{128}$/;

/** 生成个人密码散列；空口令直接拒绝（不写空散列） */
export function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length === 0) throw new Error('口令不能为空');
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(plain, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return `${PREFIX}$${salt.toString('hex')}$${Buffer.from(derived).toString('hex')}`;
}

/** 是否为合法散列串（用于区分「未设置个人密码」与「设置坏了」） */
export function isPasswordHash(value) {
  return typeof value === 'string' && PASSWORD_HASH_PATTERN.test(value);
}

/** 校验口令；格式非法 / 空口令一律 false（调用方不得据此回退共享口令） */
export function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || plain.length === 0 || !isPasswordHash(stored)) return false;
  const [, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = Buffer.from(scryptSync(plain, Buffer.from(saltHex, 'hex'), KEY_BYTES, SCRYPT_OPTIONS));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** 读口脱敏：去掉 `passwordHash`；无该字段时原样返回（不改其他字段） */
export function stripPasswordHash(user) {
  if (!user || typeof user !== 'object' || !Object.prototype.hasOwnProperty.call(user, 'passwordHash')) return user;
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}
