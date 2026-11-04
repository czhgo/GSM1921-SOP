// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  tailwind-config.js — window.tailwind.config（HTML 公共资源抽取，2026-08-29 方案A）
//  从各页 <head> 内联迁出：色板（party/primary/accent/neutral/surface）、字体、动画。
//  要求：在 tailwind CDN script 之后按序引用（普通 <script src>）。
//  所有页面统一引用：<script src="./src/tailwind-config.js?v=VER"></script>
//  改设计语言（色板/字体/动画）只改本文件，不再逐页复制。
// ════════════════════════════════════════════════════════════════

window.tailwind = window.tailwind || {};
window.tailwind.config = {
  // 2026-10-23 Task 7：所有 `hover:` 工具类自动包进 `@media (hover: hover)`；
  // 触屏不再触发悬停样式（改用组件 `:active`）。
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // 2026-11-04 批次 534（Task 5.2）：颜色**不再写字面量**，一律映射到 `styles.css :root` 令牌。
      //   Tailwind 只是工具类出口，值由 CSS 令牌决定 ⇒ 换主题 / 改色只改 styles.css 一处；
      //   逐值相等由 `server/test/theme-palette-guard.test.mjs::T12` 机检（漂移即红）。
      //   同批删除零消费的 accent.amber / blue / emerald / violet（Tailwind 默认色残留，全站无消费者）。
      colors: {
        party: { DEFAULT:'var(--party-red)', red:'var(--party-red)', gold:'var(--party-gold)', 'gold-light':'var(--party-gold-light)', 50:'var(--primary-50)', 100:'var(--primary-100)', 200:'var(--primary-200)', 300:'var(--primary-300)', 400:'var(--primary-400)', 500:'var(--primary-500)', 600:'var(--primary-600)', 700:'var(--primary-700)', 800:'var(--primary-800)', 900:'var(--primary-900)', 950:'var(--primary-950)' },
        primary: { 50:'var(--primary-50)', 100:'var(--primary-100)', 200:'var(--primary-200)', 300:'var(--primary-300)', 400:'var(--primary-400)', 500:'var(--primary-500)', 600:'var(--primary-600)', 700:'var(--primary-700)', 800:'var(--primary-800)', 900:'var(--primary-900)', 950:'var(--primary-950)' },
        // accent.DEFAULT 只用于链接的 `hover:text-accent`，映射到浅底深字 token（随主题/日夜切换）。
        accent: { DEFAULT:'var(--app-accent-soft-text)', gold:'var(--party-gold)', 'gold-light':'var(--party-gold-light)' },
        neutral: { 0:'var(--neutral-0)', 50:'var(--neutral-50)', 100:'var(--neutral-100)', 200:'var(--neutral-200)', 300:'var(--neutral-300)', 400:'var(--neutral-400)', 500:'var(--neutral-500)', 600:'var(--neutral-600)', 700:'var(--neutral-700)', 800:'var(--neutral-800)', 900:'var(--neutral-900)' },
        surface: { page:'var(--surface-page)', card:'var(--surface-card)', elevated:'var(--surface-elevated)', header:'var(--surface-header)', sidebar:'var(--surface-sidebar)', hover:'var(--surface-hover)', active:'var(--surface-active)' },
      },
      fontFamily: { sans:['Noto Sans SC','-apple-system','PingFang SC','Microsoft YaHei','sans-serif'], serif:['Noto Serif SC','STKaiti','KaiTi','serif'], title:['STZhongsong','华文中宋','Noto Serif SC','STSong','SimSun','serif'], 'title-en':['Times New Roman','Georgia','serif'] },
      // 2026-10-31 P10：时长统一走 styles.css 三档令牌（不再写裸 0.4s / 0.2s / 2s）。
      animation: {
        'fade-in': 'fadeIn var(--motion-emphasis) var(--ease-standard) forwards',
        'slide-up': 'slideUp var(--motion-emphasis) var(--ease-standard) forwards',
        'slide-right': 'slideRight var(--motion-enter) var(--ease-standard) forwards',
        'pulse-soft': 'pulseSoft calc(var(--motion-emphasis) * 7) ease-in-out infinite',
      },
      keyframes: { fadeIn:{'0%':{opacity:'0'},'100%':{opacity:'1'}}, slideUp:{'0%':{opacity:'0',transform:'translateY(16px)'},'100%':{opacity:'1',transform:'translateY(0)'}}, slideRight:{'0%':{transform:'translateX(-100%)'},'100%':{transform:'translateX(0)'}}, pulseSoft:{'0%, 100%':{opacity:'1'},'50%':{opacity:'0.6'}} },
    },
  }
};
