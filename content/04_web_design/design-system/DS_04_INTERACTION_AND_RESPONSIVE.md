---
title: "设计系统 · 第四编 交互与响应式"
type: design
role: "[工程师]+[AI]"
last_updated: 2026-10-29
status: active
related_files: [DESIGN_SYSTEM.md, DS_03_COMPONENTS.md, ../../../docs/src/styles.css, CASES.md]
---

# 第四编 交互与响应式

> **回答什么问题**：悬停、按下、聚焦各怎么表现；动效时长与禁止项；断点与窄屏怎么变。
> **不回答什么**：颜色令牌与主题 → [DS_01_COLOR_AND_THEME.md](DS_01_COLOR_AND_THEME.md)；组件结构与字段外壳 → [DS_03_COMPONENTS.md](DS_03_COMPONENTS.md) §4.3 / §12.12；页面宽度档位 → [DS_02_TYPE_AND_SIZE.md](DS_02_TYPE_AND_SIZE.md) §3.4。
> **谁什么时候读**：[工程师]+[AI]；加交互态、改焦点、调动效、做窄屏适配之前读本篇；键盘可达性检查按 §5.8 逐条核。

## 五、交互反馈规范

### 5.1 过渡动效标准

| 场景 | CSS 属性 | 时长 | 缓动函数 |
|------|---------|------|---------|
| 颜色变化 | `background-color`, `color`, `border-color` | `150ms` | `ease-out` |
| 透明度变化 | `opacity` | `200ms` | `ease-out` |
| 位移 | `transform` | `200ms` | `ease-out` |
| 视图切换 | `opacity` + `transform` | `250ms` | `ease-out` |

### 5.2 反馈模式速查

| 交互类型 | 视觉反馈 | 代码实现 |
|---------|---------|---------|
| 按钮悬停 | 背景色偏移至下一色阶 | `:hover { background-color: next-shade }` |
| 按钮 / 链接聚焦 | 只出一圈 2px 主题色实线、间隙 1px、不改底色（实底主题色控件取反为白 / 深墨并压在控件内侧）；只在 `:focus-visible` | `:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 1px; box-shadow: none }` |
| 输入框聚焦 | 只把边框变主题色（不出外环、不出阴影；鼠标与键盘一致） | `:focus { border-color: var(--app-accent); outline: none; box-shadow: none }` |
| 卡片悬停 | 仅交互卡：描边变主题色 ＋ 10% 主题淡底（`.card--interactive`；展示卡无 hover） | `:hover { border-color: var(--app-accent); background-color: var(--app-accent-tint) }` |
| 列表项悬停 | 背景变为浅灰 | `:hover { background-color: --surface-hover }` |
| 选中态 | 主题 soft 三件套：浅主题底 ＋ 主题字 ＋ 3px 主题左条（侧边栏是唯一浅灰豁免） | `.active { background: var(--app-accent-soft-bg); color: var(--app-accent-soft-text); box-shadow: inset 3px 0 0 var(--app-accent) }` |
| 加载态 | 骨架屏（灰色占位块） | 脉冲透明度动画 |
| 空状态 | SVG 图标 + 中性色提示文字 | SVG + `--neutral-400` 文字 |

**执行口径（2026-10-22 批次 503，守卫 `ui-motion-guard` / `frontend-foundations-guard::F8`）**：

1. **禁 `transition-all`**：只用显式属性（`transition-colors` / `transition-[border-color,background-color]` / `transition-transform`）；列表与卡片不得过渡宽高、阴影。
2. **卡片 hover 不得 `shadow` / `translateY`**：展示卡不变，交互卡只变边框色或底色。
3. **可点但非原生控件**（`div` 承载 `click`）必须 `role="button"` + `tabindex="0"` + Enter/Space；能改 `<a>` / `<button>` 的优先改原生。
4. **独立页返回**用 `.btn-outline` 紧凑档（或纯导航 `<a>`），不得用裸文字按钮。
5. **首屏加载态**：动态容器 `aria-busy="true"` + 3 行骨架；数据到达后置 `false`。加载中不得显示「0 / —」冒充无数据。
6. **标题层级**：H1 只在顶栏；页内标题 H2；卡头 H3。

### 5.3 禁止的动效效果

| 禁止项 | 原因 |
|--------|------|
| `backdrop-filter: blur()` | 玻璃态效果，低端设备性能差 |
| `cubic-bezier()` overshoot | 弹性过渡，与哑光风格冲突 |
| `box-shadow` 发光扩散 | 扁平化不需要 |
| `transform: scale()` | 缩放反馈过于花哨 |
| `transform: translateY(-Npx)` | 上浮效果违反扁平原则 |
| `linear-gradient()`（按钮/卡片） | 纯色优于渐变 |

### 5.4 Exploration 区块设计方向——滚动驱动的场景切换

> 关于页 Exploration 区块的设计大原则（2026-08-04 确立）：**滚动驱动的场景切换**。

### 5.5 workflow 关系图动画原则（2026-08-13 设计）

> 适用于任何「角色/实体关系流」可视化（如工作流关系图）：

1. **扁平化**——无分层无中心包围，连线（交流）是主角而非节点
2. **动/静分离**——视窗静、本镜节点进出、连线出现、多线程并行同时亮
3. **分镜式进出**——节点移入/移出视野，每镜有停留稳态（不连续运镜）
4. **flow 级分镜**——每个 flow（谁→谁做什么）一镜，对齐 SOP 操作级

> 注：2026-08-19 后 about 页走「叙事册风格 + 滚动驱动场景切换」，本节为关系图类动画的独立原则，二者不冲突。

### 5.6 动效分层与动画语义

> 与 §5.4（Exploration 区块滚动驱动场景切换）、§5.5（workflow 关系图动画原则）同题相邻但**互补不重复**——§5.4/§5.5 规定"场景切换 / 关系图"的动画形态大原则；本节规定"文字 vs SVG 边"的时序语义、SVG 多类型边的动画区分、以及声明式动画优先的工程选型，三者并存。

**动效分层：文字先于 SVG 边**：文字用 CSS transition（快速切换，~200ms），SVG 边用滚动驱动（渐进绘制）——内容优先于装饰。文字是"讲什么"，应先出现；SVG 边是"怎么画"，应慢慢绘制。共用同一进度变量会导致文字显示太慢，违背"内容优先"。为什么文字要先于 SVG 边？因为文字承载内容语义，SVG 边承载装饰语义——读者打开页面的第一需求是"读什么"，不是"看什么画"；若两者同时出现，SVG 边的绘制过程会分散读者对文字的注意力；文字先出现，读者可以立即开始阅读，SVG 边在阅读过程中渐进绘制完成。生效条件：包含文字+SVG 动效配合的页面，且文字和 SVG 边有主次关系的场景。

**探索工作动画区分对待原则**：探索工作 SVG 网络图包含三类边——task（派活交付，有方向）/ info（报备告知，有方向）/ collab（横向配合，无方向）。动画形式应服务于边的语义区分：task 边用 `stroke-dashoffset` 绘制动画（从起点画到终点，强化"派活交付"的方向感），info/collab 边用 `opacity` 渐显（保留 CSS 的虚线/点线样式，不设置 JS `strokeDasharray`）。统一绘制会覆盖 CSS 中 info 虚线和 collab 点线的样式，导致三类边视觉同质化——全部变成实线，无法区分类型。动画形式服务于语义区分，而非语义服从于动画统一。生效条件：在包含多类型边（有方向/无方向混合）且需视觉区分的 SVG 网络图中成立。

**规避 JS 动画库——静态叙事页的最优解**：静态滚动叙事页的动画应优先 CSS `animation-timeline: view()`（滚动驱动、引擎级优化、初始可见无闪变）+ 原生 scroll 监听；JS 动画库（GSAP）带来的 ScrollTrigger.refresh 全量重算（640ms 级长任务）与"先隐藏后显示"闪变是复杂度与卡顿根源。"能事先算好的动画不如事先准备好"——CSS 声明式动画由浏览器引擎处理，静态页面应零 JS 动画依赖。动画节奏应统一（约 1s 沉稳），局部特例（出场类 0.9s）不破坏整体。生效条件：静态/半静态叙事页、动画可声明式表达的场景成立；复杂交互动效（拖拽/物理模拟）仍需 JS。

### 5.7 按钮与链接族焦点规范（2026-10-28）

**适用范围**：按钮（`<button>` / `.btn-*`）、链接（`<a>` / `.link`）、`summary`、`role="button"` / `role="option"` / `role="tab"` 与可点表格行（`tr[data-interactive="true"]`）。输入族（input / select / textarea / 搜索框 / 下拉触发器）的焦点口径见 §4.3 与 §12.12。

**几何与颜色**：键盘聚焦时只出一条 `outline: 2px solid var(--app-accent)`，`outline-offset: 1px`，并显式 `box-shadow: none`。环色只有主题色一个来源，亮暗由 `--app-accent` 的别名自动切换；不得再用固定党徽金、党建红、深棕状态色，也不得恢复第二套焦点令牌。

**不改底色**：按钮与链接聚焦只加环，不换底色、不加填充、不改文字色；悬停与聚焦是两件事，可以叠加，但不得互相冒充。

**实底取反**：底色即主题色实底的控件（`.btn-accent`、`.btn-danger-solid`、实底状态徽章）把环色取反为主题色实底上的字色 `--app-accent-strong-ink`，并把 `outline-offset` 改为 `-2px`，让环压在控件内侧。白环对金底 4.68:1、深墨环对暗金底 6.98:1；正偏移会把环推到控件外的卡片上，只有 1.05–1.14:1，等于看不见。

**禁用态**：`disabled` / `aria-disabled="true"` 的控件不进入焦点序列，也不画焦点环；只读但仍可聚焦的控件保留环。

**顶栏例外（唯一一处不用主题色）**：顶栏深红 `#7A0010` 上七种主题色只有 1.51–2.99:1。`.hamburger-btn` / `.header-action-btn` / `#notif-btn` 因此改用既有白色令牌 `--app-accent-strong-ink-light`（白环对深红 11.44:1），几何不变。理由是顶栏底色本身就是品牌深红，不是主题色表面；这条例外不得外溢到正文区或卡片。

**禁止**：用 `box-shadow` 画焦点环（含 `0 0 0 6px` 一类外发光）；同一控件同时声明 `outline` 与 `box-shadow` 两道环；用 `:focus` 与 `:focus-visible` 各写一套几何。守卫：`ui-focus-ring` / `ui-control-system-guard::FOCUS-1…5`。

### 5.8 焦点只有一个信号（P1 · 2026-10-29 立 · 全站总则）

> **原则**：一个控件聚焦时只给一个信号。有边框控件（输入族）只变边框；无边框控件（按钮 / 链接 / `summary` / `role` 控件 / 可点行）只出一圈 2px 实线环，且只在 `:focus-visible` 出。

**判据（Boolean，为真即违规）**

| # | 判据 | 检查点 |
|---|---|---|
| P-1 | 输入族（input / select / textarea / 日期 / 搜索）`:focus` 与 `:focus-visible` 同表现：只改 `border-color`，`outline` 与 `box-shadow` 均为 `none` | `ui-focus-ring::F3` / `ui-control-system-guard::FOCUS-2` |
| P-2 | 按钮 / 链接 / `summary` / `role="button\|option\|tab"` / 可点行只声明一条 `outline: 2px solid var(--app-accent)` ＋ `outline-offset: 1px` ＋ `box-shadow: none` | `ui-focus-ring::F2` |
| P-3 | 同一规则块不得同时出 `:focus` 的 `box-shadow` 环与 `:focus-visible` 的 `outline` 环 | `ui-control-system-guard::FOCUS-1` |
| P-4 | 焦点色只有 `--app-accent` 一个来源；党徽金、党建红、旧令牌 `--focus-ring` / `--focus-halo` 计数为 0 | `ui-control-system-guard::FOCUS-4` / `ui-focus-ring::F1` |
| P-5 | 实底主题色控件把环色取反为 `--app-accent-strong-ink`，`outline-offset` 改 `-2px`，环压在控件内侧 | `ui-focus-ring::F6` |
| P-6 | 禁用控件不进焦点序列、不画环；只读但可聚焦的控件保留环 | 人工检查点（Tab 序列） |

**反例**
- 输入框聚焦时边框变主题色再叠一圈 2px 外环，同一次聚焦给两个答案。
- 用固定党徽金作焦点色，暗色下与金边叠成双金边。
- 用 `box-shadow: 0 0 0 6px` 画焦点环，或同一控件同时声明 `outline` 与 `box-shadow` 两道环。
- 用 `:focus` 与 `:focus-visible` 各写一套几何。

**守卫**：`ui-control-system-guard`（FOCUS-1…5）、`ui-focus-ring`（F1–F6）、`field-shell-guard`。

> **与 §5.7 的分工**：§5.7 定按钮与链接族的环几何与顶栏例外；本节是全站总则，并把输入族收敛为「只变边框」。字段外壳的静置 / 悬停 / 禁用 / 只读见 DS_03 §12.12。

---

## 六、响应式设计规则

### 6.1 断点

| 断点 | 最小宽度 | 目标设备 |
|------|---------|---------|
| `sm` | `640px` | 手机横屏 / 小平板 |
| `md` | `768px` | 平板 |
| `lg` | `1024px` | 桌面 |
| `xl` | `1280px` | 大桌面 |

### 6.2 布局适配

| 区域 | 桌面 (≥1024px) | 平板 (768-1023px) | 手机 (<768px) |
|------|---------------|-------------------|---------------|
| 页面版心 | 治理内容 `72rem`；宽表 `80rem`；表单 `48rem` | 同左，保持流动宽度 | `width: 100%`，仍受语义上限约束 |
| 工作台 | 日历 2/3 + 面板 1/3 | 单列堆叠 | 单列堆叠 |
| 侧边栏 | 固定显示 | 默认折叠 | 默认折叠 |
| 模板网格 | `grid-cols-2` | `grid-cols-2` | `grid-cols-1` |
| 水平内边距 | `32px` | `16px` | `12px` |
| 垂直内边距 | `24px` | `16px` | `12px` |
| 基础字号 | `1rem` (16px) | `1rem` (16px) | `0.95rem` (≈15px) |

**版心与数据形状**：内容容器使用 `width: 100%` 并设置语义化 `max-width`；列按网格比例伸缩，表单按可读长度设上限，宽表获得更大的版心。百分比描述网格中的相对占位，不能单独决定页面最大宽度。表格宽度由容器承担；窄屏在表格自身容器内横向滚动，页面主体保持在视口内。需要比较的人或支部以连续表格行呈现，不逐条套卡片。白底圆角卡片继续承载清楚的业务分区，同一层级统一内边距与间距，卡片内不再重复包裹记录行。

**窄屏（≤640px）承载口径（2026-10-21 Task 7 补）**：表格可切**卡式行**（`data-responsive="cards"`：thead 隐藏、一行一卡、每格 `data-label` 作字段名），矩阵可**堆叠**（同一关系行的响应式形态，不算卡片矩阵）；卡式行内 `sticky` / `min-width` 清零，`documentElement.scrollWidth` 不得超过视口宽度（390×844 为准）。未切卡式的表仍在自身容器内横滑，页面主体不横向溢出；打印时 `@media print` 恢复为表格。

### 6.3 移动端特殊规则

```css
@media (max-width: 767px) {
  .header-title h1 {
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .header-action-btn {
    display: none;
  }

  #sidebar-main {
    top: 56px;
    width: 100%;
    transform: translateY(0);
  }

  #sidebar-main.sidebar-collapsed {
    transform: translateY(calc(-100% - 56px));
  }
}
```

折叠位置需同时移过侧栏自身高度和固定页头高度，否则移动端会有一截导航露在页头上方。

> **2026-09-28 死码清理批**：本示例原含 `.header-subtitle` / `.status-pill` / `.tl-spine` / `.tl-dot`（及其响应式段）——均为**零引用死码**，已随本条从 `styles.css`（含 `@media` 段）删除，故本示例同步删去。

---
