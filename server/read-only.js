// ════════════════════════════════════════════════════════════════
//  server/read-only.js —— 只读演练开关（READ_ONLY=1）
//
//  用途（spec restore-capsule-and-harden-data-truth · Task 7.4）：
//    用**生产库副本**起一个只读演练实例：所有页面可完整浏览，但任何写入都被服务端拒绝。
//    这是「上线前拿真数据看一遍」的安全通道，避免演练时误写生产副本。
//
//  判据（唯一实现，勿在别处手写）：
//    · 开关：`READ_ONLY=1`（其它值 / 未设 ⇒ 关闭，行为与改动前一字不变）。
//    · 拦截方法：POST / PUT / PATCH / DELETE。
//    · 放行（**只放认证域**）：`/api/v1/auth/**` —— 登录/登出/IAAS 回调本身不是业务写；
//      不放行就无法登录，演练也就无从谈起。`GET/HEAD/OPTIONS` 一律放行。
//    · 其余写口（`/api/v1/snapshot`、通用资源 CRUD、全部语义写端点）统一 403 + 可读文案。
//
//  响应形状（只增不改形）：`{ error: '…只读…', readOnly: true }`；状态码 403。
// ════════════════════════════════════════════════════════════════

export const READ_ONLY_MESSAGE = '当前为只读演练模式（READ_ONLY=1）：数据只读，写入已被拒绝。如需写入，请停服后以可写形态启动。';

export function isReadOnlyEnv(env = process.env) {
  return env.READ_ONLY === '1';
}

/** 写方法判定（只读演练要拦的那一类） */
export function isWriteMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

/** 认证域豁免（登录/登出/IAAA 回调；不是业务写） */
export function isAuthPath(path) {
  return /^\/api\/v1\/auth(?:\/|$)/.test(String(path || ''));
}

/**
 * 请求级判定：应拒绝时返回文案，否则 null。
 * @param {{method?:string, path?:string}} req
 * @param {NodeJS.ProcessEnv} [env]
 */
export function readOnlyWriteDeny(req, env = process.env) {
  if (!isReadOnlyEnv(env)) return null;
  if (!isWriteMethod(req && req.method)) return null;
  const path = String((req && (req.path || req.originalUrl || req.url)) || '');
  if (isAuthPath(path)) return null;
  return READ_ONLY_MESSAGE;
}

/** Express 中间件（挂在业务路由之前；认证路由内部自行豁免） */
export function createReadOnlyGuard(env = process.env) {
  return (req, res, next) => {
    const deny = readOnlyWriteDeny(req, env);
    if (deny) return res.status(403).json({ error: deny, readOnly: true });
    next();
  };
}
