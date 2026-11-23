// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/base/link-normalize.js — 站内链接去 `.html`（2026-11-11 · D-866 URL B）
//
//  口径：
//    · 后缀变换只经 `page-url.js::pageHref()` 一处；本文件只负责把变换应用到 DOM 锚点。
//    · 只处理站内相对链接；`http(s)://`、`//`、`mailto:` 等带 scheme 的与纯 `#` 锚点跳过。
//    · `help.html` / `about.html` 为冻结面（含页内锚点与旧外链）：作为链接目标与当前页面均跳过。
//    · 旧 `.html` 仍由服务端 200 提供；本文件不改地址栏，不做 301。
//    · 回滚：`page-url.js::URL_STYLE` 改为 `'html'`，本文件随之不生效。
// ════════════════════════════════════════════════════════════════
import { pageHref } from './page-url.js?v=20261120a';

/** 冻结面：作为链接目标或当前页面时不改 */
const FROZEN = /\/(?:help|about)\.html(?:[?#]|$)/i;
/** 带 scheme（http: / mailto: 等）、协议相对（//）与纯锚点不改 */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function _cleanAnchor(anchor) {
  const raw = anchor.getAttribute('href');
  if (!raw || EXTERNAL.test(raw) || FROZEN.test(raw)) return;
  const next = pageHref(raw);
  if (next !== raw) anchor.setAttribute('href', next);
}

function _cleanRoot(root) {
  if (!root || root.nodeType !== 1) return;
  if (typeof root.matches === 'function' && root.matches('a[href]')) _cleanAnchor(root);
  if (typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll('a[href]').forEach(_cleanAnchor);
}

let _installed = false;

/** 安装一次（幂等）；无 DOM 环境直接返回，供 node 测试安全导入。 */
export function installLinkNormalizer() {
  if (_installed || typeof document === 'undefined') return;
  _installed = true;
  // 冻结页整页跳过：help 的页内锚点与旧外链保持原样。
  if (typeof location !== 'undefined' && FROZEN.test(location.pathname)) return;

  const run = () => _cleanRoot(document.body || document.documentElement);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) _cleanRoot(node);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
}
