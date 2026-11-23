// role: [工程师]+[AI]
// ── 页面导航 URL 解析叶子：统一尊重 HTML <base> 与部署子路径 ──
//
// 2026-11-11（D-866 · URL B）：站内页面 URL 默认去 `.html`。
//   · `URL_STYLE='extensionless'` 为默认；旧 `.html` 仍由服务端 200 提供，不做 301。
//   · 后缀变换只经 `pageHref()` 一处；`resolveDocumentUrl()` 与 `link-normalize.js` 都调用它。
//   · 回滚：把 `URL_STYLE` 改为 `'html'` 即可，不改调用点。

/** 站内页面 URL 形态：`extensionless`（默认）｜`html`（回滚） */
export const URL_STYLE = 'extensionless';

/**
 * 去掉站内页面路径的 `.html` 后缀（保留 query / hash；非页面字符串原样返回）。
 * @param {string} path
 * @returns {string}
 */
export function pageHref(path) {
  if (URL_STYLE !== 'extensionless' || typeof path !== 'string' || !path) return path;
  return path.replace(/\.html(?=($|[?#]))/i, '');
}

/**
 * Resolve an in-site page URL against the active document base.
 * Pass `baseURI` explicitly in tests; browser callers use `document.baseURI`.
 * @param {string} path
 * @param {{ baseURI?: string, searchParams?: Record<string, string|number|boolean> }} [options]
 */
export function resolveDocumentUrl(path, { baseURI, searchParams } = {}) {
  const base = baseURI || (typeof document !== 'undefined' ? document.baseURI : '');
  if (!base) throw new TypeError('resolveDocumentUrl requires a document base URI');

  const url = new URL(path, base);
  if (URL_STYLE === 'extensionless') url.pathname = url.pathname.replace(/\.html$/i, '');
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
  }
  return url.href;
}
