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
  theme: {
    extend: {
      colors: {
        party: { DEFAULT:'#CE1126', red:'#CE1126', gold:'#FFD700', 'gold-light':'#FDE68A', 50:'#FEF2F2', 100:'#FEE2E2', 200:'#FECACA', 300:'#FCA5A5', 400:'#F87171', 500:'#EF4444', 600:'#DC2626', 700:'#CE1126', 800:'#9B0000', 900:'#7A0010', 950:'#4A000A' },
        primary: { 50:'#FEF2F2', 100:'#FEE2E2', 200:'#FECACA', 300:'#FCA5A5', 400:'#F87171', 500:'#EF4444', 600:'#DC2626', 700:'#CE1126', 800:'#9B0000', 900:'#7A0010', 950:'#4A000A' },
        accent: { gold:'#FFD700', 'gold-light':'#FDE68A', amber:'#D97706', blue:'#3B82F6', emerald:'#10B981', violet:'#8B5CF6' },
        neutral: { 0:'#FFFFFF', 50:'#F8F9FA', 100:'#F3F4F6', 200:'#E5E7EB', 300:'#D1D5DB', 400:'#9CA3AF', 500:'#6B7280', 600:'#4B5563', 700:'#374151', 800:'#1F2937', 900:'#111827' },
        surface: { page:'#F8F9FA', card:'#FFFFFF', elevated:'#FFFFFF', header:'#7A0010', sidebar:'#FFFFFF', hover:'#F3F4F6', active:'#FEE2E2' },
      },
      fontFamily: { sans:['Noto Sans SC','-apple-system','PingFang SC','Microsoft YaHei','sans-serif'], serif:['Noto Serif SC','STKaiti','KaiTi','serif'], title:['STZhongsong','华文中宋','Noto Serif SC','STSong','SimSun','serif'], 'title-en':['Times New Roman','Georgia','serif'] },
      animation: { 'fade-in':'fadeIn 0.4s ease-out forwards', 'slide-up':'slideUp 0.4s ease-out forwards', 'slide-right':'slideRight 0.2s ease-out forwards', 'pulse-soft':'pulseSoft 2s ease-in-out infinite' },
      keyframes: { fadeIn:{'0%':{opacity:'0'},'100%':{opacity:'1'}}, slideUp:{'0%':{opacity:'0',transform:'translateY(16px)'},'100%':{opacity:'1',transform:'translateY(0)'}}, slideRight:{'0%':{transform:'translateX(-100%)'},'100%':{transform:'translateX(0)'}}, pulseSoft:{'0%, 100%':{opacity:'1'},'50%':{opacity:'0.6'}} },
    },
  }
};
