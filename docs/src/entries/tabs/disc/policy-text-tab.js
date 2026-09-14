// role: [工程师]+[AI]
// 纪检委员工作台 Tab：制度与文本（支书 2026-09-14 裁定：同质薄壳合并）
// 合并前：「补课制度」（makeup-tab.js）与「公邮管理」（mailbox-tab.js）各占一个 tab，内容同为制度/查收文本块。
// 合并后：一个 tab + 分段钮（补课制度 / 公邮），两块内容原样复用各自 tab 的渲染函数（不改写内部逻辑）。
// 分段钮沿用既有互斥视图笔法（照 disc/inspection-tab.js:41-44 + 204-216 的 data-view 钮组，不自造 chip）。
// 分段默认「补课制度」= 合并前待办「材料缺失补课回执」跳转落点（disc/todo-tab.js 的 tab 映射不变）。

// 分段当前值（'makeup' | 'mailbox'）；模块级记忆，切换后保留（参照既有 tab 的 _view 模式）
let _view = 'makeup';

const SEG_ON_CLASSES = [
  'bg-[var(--app-accent-bg)]',
  'border-[var(--app-accent)]',
  '[color:color-mix(in_srgb,var(--app-accent,#B91C1C)_60%,#000)]',
];
const SEG_OFF_CLASSES = ['bg-white', 'border-neutral-200', 'text-gray-600'];

/** 分段钮激活态同步（与 disc/inspection-tab.js 的视图钮同款视觉：主题浅底 + 主题色字/边框） */
function _syncSegBtns(container) {
  container.querySelectorAll('.policy-view-btn').forEach(btn => {
    const on = btn.dataset.pview === _view;
    SEG_ON_CLASSES.forEach(c => btn.classList.toggle(c, on));
    SEG_OFF_CLASSES.forEach(c => btn.classList.toggle(c, !on));
    if (on) btn.style.setProperty('--acc-text-dark', 'color-mix(in srgb, var(--app-accent,#B91C1C) 55%, #fff)');
    else btn.style.removeProperty('--acc-text-dark');
  });
}

export function renderContent() {
  const container = document.getElementById('disc-tab-content');
  if (!container) return;

  // 骨架（含分段钮）。以 #policy-text-body 是否存在为准而非 dataset 标志：
  // tab 内容容器跨 tab 切换复用，dataset 标志在「切走再切回」时会残留，导致骨架不再重建。
  if (!container.querySelector('#policy-text-body')) {
    container.innerHTML = `
      <div class="flex items-center justify-end mb-3">
        <div class="flex items-center gap-2">
          <button type="button" class="policy-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200" data-pview="makeup">补课制度</button>
          <button type="button" class="policy-view-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200" data-pview="mailbox">公邮</button>
        </div>
      </div>
      <div id="policy-text-body"></div>`;
    container.querySelectorAll('.policy-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.pview === _view) return;
        _view = btn.dataset.pview;
        renderContent();
      });
    });
  }
  _syncSegBtns(container);

  // 分段内容容器每次都换新节点：子块渲染函数以容器为单位整体覆写 innerHTML（含自身宿主元素与检索条），
  // 换新节点可保证切换分段后子块完整重建，不残留上一段 DOM。
  const body = document.createElement('div');
  body.id = 'policy-text-body';
  container.querySelector('#policy-text-body').replaceWith(body);

  return (_view === 'mailbox'
    ? import('./mailbox-tab.js?v=20260914a')
    : import('./makeup-tab.js?v=20260914a')
  ).then(m => m.renderContent(body));
}
