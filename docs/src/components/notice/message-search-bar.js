// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/notice/message-search-bar.js — 消息中心检索条（P3 四段单一源）
// ════════════════════════════════════════════════════════════════
// 为什么独立成件：消息页的「信箱 / 来源」筛选沿用表单胶囊（chip）形态，
//   而 `filter-row::S6` 禁止「含 `.lf-bar` 的文件自写胶囊」——结构上只能让检索条
//   （纯 search 段，无 chip）单独成件，页面侧只调用本函数。
// 结构：`.lf-bar` → 唯一 `.lf-bar__row[data-seg="search"]`（空段不输出）。
import { escHtml as esc } from '../../core/base/utils.js?v=20261031a';

/** 消息搜索条（关键词原值回填，重渲染后保持输入） */
export function messageSearchBarHtml(q) {
  return `
    <div class="lf-bar mb-3">
      <div class="lf-bar__row" data-seg="search">
        <input id="msg-search" type="search" class="input-flat text-xs lf-kw" placeholder="搜索标题 / 正文 / 对方姓名" value="${esc(q)}" />
      </div>
    </div>`;
}
