// role: [工程师]+[AI]
// 能力注册表：registerCapability / getCapabilities / getCapability / mountCapability（T-279 M1）
//            + getRuntimeEnv / getRegistryVersion / listCapabilities / unregisterCapability / resolveDeps（T-279 M4 迭代机制）
// 能力声明形态：
//   { id, name, scope: ['dashboard'|'workspace'|'data-source'|'scenario'|'all'], requiredRoles: null|string[],
//     env: null|string[],          // M4：null=所有环境；数组=仅这些环境启用（dev/prod）
//     version: string,             // M4：能力版本（建议日期后缀，如 '20260823a'）
//     deps: ['data-adapter'|...], mount: (container, ctx) => void|Promise,
//     apply: (ctx) => void         // M4：数据源等"动作型"能力的选择方法（调用方显式执行）}
// deps 仅登记 + resolveDeps 查询（M4 落地，不做自动解析）；requiredRoles 在 getCapabilities 中已应用。
// 回滚=unregisterCapability(id)（M4 验收：注销声明即从能力清单消失）。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§五

const _capabilities = new Map();
const DEFAULT_VERSION = '1.0.0';

/**
 * 当前运行环境判定（M4 功能开关）：dev=本机（localhost/127.0.0.1/*.local），prod=其它。
 * 与 bootstrap 的 dev 判定模式一致（hostname 维度），Node 测试环境默认 dev。
 * @returns {'dev'|'prod'}
 */
export function getRuntimeEnv() {
  if (typeof location === 'undefined') return 'dev'; // Node 单测环境
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return 'dev';
  return 'prod';
}

/**
 * 注册能力声明（模块加载时自注册）
 * @param {{id: string, name?: string, scope?: string[], requiredRoles?: string[]|null, deps?: string[], mount: Function}} cap
 * @returns {Object} 注册后的能力声明
 */
export function registerCapability(cap) {
  if (!cap || !cap.id) throw new Error('[registry] 能力缺少 id');
  if (_capabilities.has(cap.id)) {
    console.warn(`[registry] 重复注册能力「${cap.id}」，覆盖旧声明`, _capabilities.get(cap.id));
  }
  _capabilities.set(cap.id, cap);
  return cap;
}

/**
 * 按范围+角色+环境过滤能力清单（消费点据此自动发现；env 缺省=所有环境，兼容既有能力声明）
 * @param {{scope?: string, role?: string, env?: 'dev'|'prod'}} [opts]
 * @returns {Array} 可用能力列表
 */
export function getCapabilities({ scope, role, env } = {}) {
  const list = [..._capabilities.values()];
  return list.filter(cap => {
    if (scope && cap.scope && !cap.scope.includes(scope)) return false;
    if (role && Array.isArray(cap.requiredRoles) && cap.requiredRoles.length > 0 && !cap.requiredRoles.includes(role)) return false;
    if (env && Array.isArray(cap.env) && cap.env.length > 0 && !cap.env.includes(env)) return false;
    return true;
  });
}

/**
 * 注册表版本（M4 版本化）：聚合当前已注册能力的最大版本号。
 * 约定版本为日期后缀字符串（'20260823a' > '20260822e' 字典序成立），未声明版本的能力按 '1.0.0' 计。
 * 发布=更新注册表版本，消费点据此做缓存失效/灰度判断（承接 KNOWN_PITFALLS §13 人工纪律 → 机制保证）。
 * @returns {string}
 */
export function getRegistryVersion() {
  let max = DEFAULT_VERSION;
  for (const cap of _capabilities.values()) {
    const v = cap.version || DEFAULT_VERSION;
    if (v > max) max = v;
  }
  return max;
}

/**
 * 能力清单查询（M4）：返回过滤后的清单 + 注册表版本 + 数量，消费点一次取齐。
 * @param {{scope?: string, role?: string, env?: 'dev'|'prod'}} [opts]
 * @returns {{items: Array, version: string, count: number}}
 */
export function listCapabilities({ scope, role, env } = {}) {
  const items = getCapabilities({ scope, role, env });
  return { items, version: getRegistryVersion(), count: items.length };
}

/**
 * 按 id 取能力声明
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getCapability(id) {
  return _capabilities.get(id);
}

/**
 * 注销能力声明（M4 迭代机制·回滚=注销声明）
 * 问题能力可单独注销，不影响其他能力（ARCHITECTURE_EVOLUTION §5.3）。
 * @param {string} id
 * @returns {boolean} 是否成功注销（未注册返回 false）
 */
export function unregisterCapability(id) {
  if (!_capabilities.has(id)) {
    console.warn(`[registry] 注销未注册能力「${id}」`);
    return false;
  }
  _capabilities.delete(id);
  return true;
}

/**
 * 依赖解析（M4 迭代机制·deps 查询）：返回声明了但未注册的能力 id 列表。
 * deps 是声明式登记，不做自动递归解析——未注册的依赖仅提示，不阻断挂载
 * （既有能力可能声明依赖非注册表模块，如 activity-calendar 的 deps: ['data-adapter']）。
 * @param {string} id — 能力 id
 * @returns {string[]} 缺失的依赖 id 列表（空=全部满足）
 */
export function resolveDeps(id) {
  const cap = _capabilities.get(id);
  if (!cap || !Array.isArray(cap.deps)) return [];
  return cap.deps.filter(dep => !_capabilities.has(dep));
}

/**
 * 按 id 挂载能力（懒加载支持：mount 可能返回 Promise）
 * @param {string} id
 * @param {Element|null} container
 * @param {Object} [ctx] — 挂载上下文（state 等，由能力声明约定）
 * @returns {Promise|*} mount 返回值
 */
export async function mountCapability(id, container, ctx) {
  const cap = _capabilities.get(id);
  if (!cap) throw new Error(`[registry] 未注册能力「${id}」`);
  if (typeof cap.mount !== 'function') throw new Error(`[registry] 能力「${id}」缺少 mount`);
  return cap.mount(container, ctx);
}
