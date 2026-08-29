// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  component.share-button.js — 详情页复制链接组件
//  活动详情页（activity-entry.js）与专班详情页（taskforce-entry.js）共用，
//  实现「便于长期共享」的最小操作成本：一键复制当前页直达链接（书记 2026-08-11 裁定增强共享形态）。
// ════════════════════════════════════════════════════════════════
import { showToast } from '../core/utils.js?v=20260829j';

/** 复制链接按钮 HTML（置于详情页标题区右侧） */
export function renderShareButtonHtml() {
  return `
    <button id="detail-share-btn" type="button"
      class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors flex-shrink-0">
      复制链接
    </button>`;
}

/** 绑定复制链接事件（navigator.clipboard，失败时提示手动复制地址栏） */
export function bindShareButton(cardEl) {
  cardEl?.querySelector('#detail-share-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('success', '链接已复制，可分享给他人');
    } catch (e) {
      showToast('error', '复制失败，请手动复制地址栏链接');
    }
  });
}
