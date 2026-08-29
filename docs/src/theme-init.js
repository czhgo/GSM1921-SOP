// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  theme-init.js — T231 防闪烁（HTML 公共资源抽取，2026-08-29 方案A）
//  从各页 <head> 内联迁出：CSS 加载前同步应用深色主题 class（默认跟随系统）。
//  要求：<head> 最前同步引用（普通 <script src>，无 async/defer），保证先于 CSS 执行。
//  所有页面统一引用：<script src="./src/theme-init.js?v=VER"></script>（workspace 页经 <base href="../"> 解析）
// ════════════════════════════════════════════════════════════════

(function () {
  try {
    var t = localStorage.getItem('workflowos_theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('theme-dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
