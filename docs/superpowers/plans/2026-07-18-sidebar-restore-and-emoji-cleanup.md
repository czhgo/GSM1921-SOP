# sidebar 恢复 + emoji 清理 + 未覆盖遗漏审查 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复 sidebar `<a>` 统一性（消除 T110 引入的 `<button>` 子菜单）+ 新建 workspace-popover 浮窗组件 + 清理全系统 emoji（11 处）+ T109/T110 未覆盖遗漏审查

**Architecture:** sidebar 中"党建工作台"始终渲染为 `<a>`，多身份时由独立的 workspace-popover.js 组件拦截点击弹出浮窗。emoji 清理按 USAGE_POLICY.md §二执行，reactions 换 SVG 图标。审查结果写入 REVIEW_QUEUE.md。

**Tech Stack:** Vanilla JS (ES Modules), CSS, SVG icons, AuthStore API

**Spec:** [docs/superpowers/specs/2026-07-18-sidebar-restore-and-emoji-cleanup-design.md](../specs/2026-07-18-sidebar-restore-and-emoji-cleanup-design.md)

---

## 文件结构

### 新建文件
- `docs/src/components/workspace-popover.js` — 多身份浮窗组件，独立于 sidebar.js，参照 header view-switcher 事件绑定模式

### 修改文件
- `docs/src/components/sidebar.js` — 删除 `_renderWorkspaceSubMenu` / `_bindWorkspaceSubMenu`，恢复 `<a>` 渲染，调用 `bindWorkspacePopover`
- `docs/src/core/icons.js` — 新增 7 个图标（thumbsUp/thumbsDown/eyes/hooray/starFilled/starOutline/eye）
- `docs/src/components/reactions.js` — `emoji` 字段改为 `icon` 字段
- `docs/src/components/issue-list.js` — reactions 渲染改用 `icon()` 调用
- `docs/src/entries/ws-secretary-entry.js` — L130 删除 🔥
- `docs/src/entries/help-entry.js` — L69, L71 删除 🔑
- `docs/src/components/party-cross-nav.js` — L99, L111 删除 👁，换 SVG
- `docs/src/components/inspector.js` — L273 ★ ☆ 换 SVG

### 审查输出
- `.ctx/REVIEW_QUEUE.md` — T109/T110 未覆盖遗漏审查结果

---

## Task 1: 新建 workspace-popover.js 浮窗组件

**Files:**
- Create: `docs/src/components/workspace-popover.js`

**设计要点**：
- 独立组件，导出 `bindWorkspacePopover(sidebar)` 函数
- 点击 `<a data-workspace-popover="1">` 时 `e.preventDefault()` 拦截
- 弹出绝对定位浮窗（`left:100%; top:0; width:200px`）
- 外部点击 / ESC 关闭
- 浮窗内容来自 `AuthStore.getAccessibleWorkspacePages(personId)`
- 参照 header.js `_bindViewSwitcher` 事件绑定模式

- [ ] **Step 1: 创建 workspace-popover.js**

创建文件 `docs/src/components/workspace-popover.js`，内容如下：

```javascript
// role: [工程师]+[AI]
// components/workspace-popover.js — 工作台多身份浮窗组件
// 设计: sidebar "党建工作台" <a> 点击拦截 → 弹浮窗选择目标工作台
// 参照: header.js _bindViewSwitcher 事件绑定模式（外部点击/ESC 关闭）
// spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §2.2.3

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';

/**
 * 绑定工作台浮窗事件
 * sidebar 中带 data-workspace-popover="1" 的 <a> 触发浮窗
 * @param {HTMLElement} sidebar - sidebar 容器
 */
export function bindWorkspacePopover(sidebar) {
  const trigger = sidebar.querySelector('[data-workspace-popover="1"]');
  if (!trigger) return;

  let popover = null;

  function showPopover() {
    if (popover) return;
    const user = AuthStore.getCurrentUser();
    if (!user) return;
    const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
    if (pages.length === 0) return;

    const base = getBasePath();
    const currentPath = window.location.pathname;

    popover = document.createElement('div');
    popover.className = 'workspace-popover-panel';
    popover.style.cssText = `
      position:absolute; left:100%; top:0; width:200px;
      border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.12);
      background:var(--surface-card); overflow:hidden; z-index:100;
      border:1px solid #E5E7EB;
    `;

    popover.innerHTML = pages.map(p => {
      const isActive = currentPath.includes('/workspace/' + p.page);
      const selectedBg = isActive ? 'background:var(--surface-hover);' : '';
      const activeBar = isActive
        ? '<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>'
        : '';
      return `<a href="${base}workspace/${p.page}" class="workspace-popover-item" style="position:relative;display:block;padding:8px 12px;color:var(--neutral-800);font-size:13px;text-decoration:none;transition:background 0.15s;${selectedBg}">${activeBar}<span>${p.label}</span></a>`;
    }).join('');

    // hover 效果
    popover.querySelectorAll('.workspace-popover-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const isActive = item.querySelector('span[style*="party-gold"]');
        if (!isActive) item.style.background = 'var(--surface-hover)';
      });
      item.addEventListener('mouseleave', () => {
        const href = item.getAttribute('href') || '';
        const pageName = href.split('/').pop();
        const isActive = currentPath.includes('/workspace/' + pageName);
        item.style.background = isActive ? 'var(--surface-hover)' : 'transparent';
      });
    });

    trigger.parentElement.style.position = 'relative';
    trigger.parentElement.appendChild(popover);
  }

  function hidePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  // 点击 <a> 时拦截
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (popover) hidePopover();
    else showPopover();
  });

  // 外部点击关闭
  document.addEventListener('click', (e) => {
    if (popover && !popover.contains(e.target) && !trigger.contains(e.target)) {
      hidePopover();
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popover) hidePopover();
  });
}
```

- [ ] **Step 2: 验证文件创建成功**

Run: `node -e "import('./docs/src/components/workspace-popover.js').then(m => console.log('OK:', typeof m.bindWorkspacePopover))"`
Expected: `OK: function`

（如因 ESM 环境问题无法直接 node 验证，可改用 `Get-Content docs/src/components/workspace-popover.js | Select-String "export function"` 检查导出存在）

- [ ] **Step 3: Commit**

```bash
git add docs/src/components/workspace-popover.js
git commit -m "feat(workspace-popover): 新建工作台多身份浮窗组件

参照 header view-switcher 事件绑定模式，独立于 sidebar.js。
点击 <a data-workspace-popover='1'> 拦截 → 弹浮窗选择目标工作台。
外部点击/ESC 关闭。

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §2.2.3"
```

---

## Task 2: icons.js 新增 7 个 SVG 图标

**Files:**
- Modify: `docs/src/core/icons.js` (在 `ICONS` 对象末尾追加 7 个图标)

**新增图标清单**：
- `thumbsUp` / `thumbsDown` — reactions 赞同/反对
- `eyes` / `hooray` — reactions 关注/庆祝
- `starFilled` / `starOutline` — 品牌活动认定/取消
- `eye` — 只读查看标识

- [ ] **Step 1: 在 icons.js 的 ICONS 对象末尾追加 7 个图标**

在 `docs/src/core/icons.js` 的 `ICONS` 对象中，`dialogueRing` 行之后追加：

```javascript

  // ── Reactions 表态图标（spec §3.3）──
  thumbsUp:    '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3 13 0 0 1 3 3.88z"/>',
  thumbsDown:  '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3 13 0 0 1-3-3.88z"/>',
  eyes:        '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  hooray:      '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/>',

  // ── 品牌活动认定图标（spec §3.2 #6）──
  starFilled:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  starOutline: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none"/>',

  // ── 只读查看图标（spec §3.2 #4/#5）──
  eye:         '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
```

- [ ] **Step 2: 验证图标可调用**

Run: `node -e "import('./docs/src/core/icons.js').then(m => console.log('thumbsUp:', m.icon('thumbsUp', {size:14}).length > 0, 'eye:', m.icon('eye', {size:14}).length > 0, 'starFilled:', m.icon('starFilled', {size:14}).length > 0))"`
Expected: `thumbsUp: true eye: true starFilled: true`

- [ ] **Step 3: Commit**

```bash
git add docs/src/core/icons.js
git commit -m "feat(icons): 新增 7 个 SVG 图标（reactions + 品牌认定 + 只读查看）

新增: thumbsUp / thumbsDown / eyes / hooray / starFilled / starOutline / eye
用途: reactions 表态换 SVG + 品牌活动按钮换 SVG + 只读查看标识换 SVG
依据: USAGE_POLICY §2.4.1 SVG 不受 emoji 限制

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §3.3"
```

---

## Task 3: sidebar.js 改造（删除子菜单 + 恢复 `<a>` + 调用 popover）

**Files:**
- Modify: `docs/src/components/sidebar.js`

**改动清单**：
1. 删除 `_renderWorkspaceSubMenu` 函数（L35-61）
2. 删除 `_bindWorkspaceSubMenu` 函数（L63-113）
3. `renderSidebar` 中 workspace 分支改为：始终渲染 `<a>`，多身份时加 `data-workspace-popover="1"` 标记
4. import `bindWorkspacePopover`
5. `renderSidebar` 末尾调用 `bindWorkspacePopover(sidebar)` 替代 `_bindWorkspaceSubMenu(sidebar)`

- [ ] **Step 1: 修改 import 语句，追加 bindWorkspacePopover**

将 `docs/src/components/sidebar.js` L7-9 的 import 块：

```javascript
import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';
```

改为：

```javascript
import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { bindWorkspacePopover } from './workspace-popover.js';
```

- [ ] **Step 2: 删除 _renderWorkspaceSubMenu 和 _bindWorkspaceSubMenu 函数**

删除 `docs/src/components/sidebar.js` 中 L27-113 的两个函数（`_renderWorkspaceSubMenu` 和 `_bindWorkspaceSubMenu`），包括 JSDoc 注释。删除后，L27 直接是 `export function renderSidebar(activeModule) {`。

具体删除范围：从 `/**\n * 渲染"党建工作台"子菜单（多角色场景）` 开始，到 `_bindWorkspaceSubMenu` 函数结束的 `}` 为止（共约 87 行）。

- [ ] **Step 3: 修改 renderSidebar 中 workspace 分支**

将 `renderSidebar` 函数中 workspace 分支（原 L135-145）：

```javascript
    // workspace/party: 根据角色自动跳转
    let href = item.href;
    if (item.module === 'workspace') {
      // spec §3.3：单角色→直接跳转 / 2+角色→子菜单
      const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
      if (pages.length === 0) return '';  // 无对应页面则隐藏
      if (pages.length === 1) {
        // B: 单角色直接跳转（沿用现有行为）
        href = getBasePath() + 'workspace/' + pages[0].page;
      } else {
        // C: 多角色子菜单
        return _renderWorkspaceSubMenu(item, pages, activeModule);
      }
    } else if (item.module === 'party') {
```

改为：

```javascript
    // workspace/party: 根据角色自动跳转
    let href = item.href;
    let extraAttrs = '';
    let extraInner = '';
    if (item.module === 'workspace') {
      // spec §2.2: 始终渲染 <a>，多身份时由 workspace-popover 拦截
      const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
      if (pages.length === 0) return '';  // 无对应页面则隐藏
      // 始终用 standing role 取页面（恢复旧版逻辑）
      const standingPage = AuthStore.getPageForRole('workspace', role);
      if (!standingPage) return '';
      href = getBasePath() + 'workspace/' + standingPage;
      // 多身份时加 popover 标记
      if (pages.length > 1) {
        extraAttrs = ' data-workspace-popover="1"';
        extraInner = '<svg class="popover-indicator" width="10" height="6" viewBox="0 0 10 6" fill="none" style="flex-shrink:0;margin-left:auto;"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
    } else if (item.module === 'party') {
```

- [ ] **Step 4: 修改 <a> 渲染，注入 extraAttrs 和 extraInner**

将原 `<a>` 渲染（原 L154-159）：

```javascript
    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}">
        ${item.icon}
        <span class="font-title-cn">${item.label}</span>
      </a>
    `;
```

改为：

```javascript
    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}"${extraAttrs}>
        ${item.icon}
        <span class="font-title-cn">${item.label}</span>
        ${extraInner}
      </a>
    `;
```

- [ ] **Step 5: 替换 _bindWorkspaceSubMenu 调用为 bindWorkspacePopover**

将 `renderSidebar` 末尾（原 L183）：

```javascript
  _bindLogout(sidebar);
  _bindWorkspaceSubMenu(sidebar);
}
```

改为：

```javascript
  _bindLogout(sidebar);
  bindWorkspacePopover(sidebar);
}
```

- [ ] **Step 6: 更新文件头注释**

将 L1-5 文件头注释：

```javascript
// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（重构版）
// 变化: 去掉身份卡片区块，模块切换改为自动跳转到角色子页面
// 第3轮 Task 7: 订阅 view-role-change 事件，re-render 链接（不 reload）
// 2026-07-18: workspace 分支支持多角色子菜单（spec §3.3）
```

改为：

```javascript
// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（重构版）
// 变化: 去掉身份卡片区块，模块切换改为自动跳转到角色子页面
// 第3轮 Task 7: 订阅 view-role-change 事件，re-render 链接（不 reload）
// 2026-07-18 T110: workspace 分支支持多角色子菜单
// 2026-07-18 T111: 恢复 <a> 统一性，多身份改用 workspace-popover 浮窗（spec §2.2）
```

- [ ] **Step 7: 验证语法正确**

Run: `node --check docs/src/components/sidebar.js`
Expected: 无输出（语法正确）

- [ ] **Step 8: Commit**

```bash
git add docs/src/components/sidebar.js
git commit -m "refactor(sidebar): 恢复 <a> 统一性，多身份改用 workspace-popover 浮窗

- 删除 _renderWorkspaceSubMenu / _bindWorkspaceSubMenu（T110 引入的 <button> 子菜单）
- workspace 分支始终渲染 <a>，多身份时加 data-workspace-popover='1' 标记
- 调用 bindWorkspacePopover(sidebar) 绑定浮窗事件
- 保留 T110 的 AuthStore 3 API 调用（getAccessibleWorkspacePages/getUserProjectRoles）

依据: 书记 2026-07-18 反馈'党建工作台和其他一样都是 <a>，现在的 <button> 破坏了统一性'

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §2.2"
```

---

## Task 4: reactions.js 换 SVG 图标

**Files:**
- Modify: `docs/src/components/reactions.js`

**改动**：`emoji` 字段改为 `icon` 字段，渲染时调用 `icon()` 函数。

- [ ] **Step 1: 修改 import，追加 icon**

将 `docs/src/components/reactions.js` L4-6 的 import：

```javascript
import { IssueStore } from '../services/issues.js';
import { AuthStore } from '../services/auth.js';
import { showToast } from '../core/utils.js';
```

改为：

```javascript
import { IssueStore } from '../services/issues.js';
import { AuthStore } from '../services/auth.js';
import { showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';
```

- [ ] **Step 2: 修改 REACTIONS 定义，emoji 字段改为 icon 字段**

将 L8-13：

```javascript
const REACTIONS = [
  { key: 'thumbsUp', emoji: '👍', label: '赞同', activeColor: '#059669' },
  { key: 'thumbsDown', emoji: '👎', label: '反对', activeColor: '#DC2626' },
  { key: 'eyes', emoji: '👀', label: '关注', activeColor: '#3B82F6' },
  { key: 'hooray', emoji: '🎉', label: '庆祝', activeColor: '#D97706' },
];
```

改为：

```javascript
const REACTIONS = [
  { key: 'thumbsUp', icon: 'thumbsUp', label: '赞同', activeColor: '#059669' },
  { key: 'thumbsDown', icon: 'thumbsDown', label: '反对', activeColor: '#DC2626' },
  { key: 'eyes', icon: 'eyes', label: '关注', activeColor: '#3B82F6' },
  { key: 'hooray', icon: 'hooray', label: '庆祝', activeColor: '#D97706' },
];
```

- [ ] **Step 3: 修改 renderReactions 中 r.emoji 调用为 icon(r.icon)**

将 L37 的：

```javascript
            <span>${r.emoji}</span>
```

改为：

```javascript
            <span>${icon(r.icon, { size: 14 })}</span>
```

- [ ] **Step 4: 验证语法正确**

Run: `node --check docs/src/components/reactions.js`
Expected: 无输出（语法正确）

- [ ] **Step 5: Commit**

```bash
git add docs/src/components/reactions.js
git commit -m "refactor(reactions): emoji 字符换 SVG 图标

REACTIONS 定义: emoji 字段 → icon 字段（语义名）
渲染: r.emoji → icon(r.icon, { size: 14 })
依据: USAGE_POLICY §2.1 docs/src/*.js 严禁任何 Emoji

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §3.3"
```

---

## Task 5: issue-list.js 同步 reactions 换 SVG

**Files:**
- Modify: `docs/src/components/issue-list.js` (L83)

**改动**：reactions 聚合显示从 emoji 字符改为 SVG 图标调用。

- [ ] **Step 1: 修改 L82-85 的 reactions 渲染**

将 `docs/src/components/issue-list.js` L82-85：

```javascript
  const reactions = Object.entries(issue.reactions || {}).filter(([_, list]) => list.length > 0).map(([type, list]) => {
    const emoji = { thumbsUp: '👍', thumbsDown: '👎', eyes: '👀', hooray: '🎉' }[type] || '·';
    return `<span class="text-[10px] text-gray-500">${emoji}${list.length}</span>`;
  }).join(' ');
```

改为：

```javascript
  const reactions = Object.entries(issue.reactions || {}).filter(([_, list]) => list.length > 0).map(([type, list]) => {
    const iconName = { thumbsUp: 'thumbsUp', thumbsDown: 'thumbsDown', eyes: 'eyes', hooray: 'hooray' }[type];
    const iconHTML = iconName ? icon(iconName, { size: 12 }) : '·';
    return `<span class="text-[10px] text-gray-500 inline-flex items-center gap-0.5">${iconHTML}${list.length}</span>`;
  }).join(' ');
```

- [ ] **Step 2: 验证语法正确**

Run: `node --check docs/src/components/issue-list.js`
Expected: 无输出（语法正确）

- [ ] **Step 3: Commit**

```bash
git add docs/src/components/issue-list.js
git commit -m "refactor(issue-list): reactions 聚合显示换 SVG 图标

emoji 字符映射 → icon() 调用（与 reactions.js 一致）
依据: USAGE_POLICY §2.1 docs/src/*.js 严禁任何 Emoji

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §3.3"
```

---

## Task 6: emoji 清理 5 处装饰性 emoji

**Files:**
- Modify: `docs/src/entries/ws-secretary-entry.js` (L130)
- Modify: `docs/src/entries/help-entry.js` (L69, L71)
- Modify: `docs/src/components/party-cross-nav.js` (L99, L111)
- Modify: `docs/src/components/inspector.js` (L273)

### 6.1 ws-secretary-entry.js L130 删除 🔥

- [ ] **Step 1: 修改 L130**

将 `docs/src/entries/ws-secretary-entry.js` L130：

```javascript
    filterBtn.textContent = filterBrand ? '🔥品牌活动（筛选中）' : '🔥品牌活动';
```

改为：

```javascript
    filterBtn.textContent = filterBrand ? '品牌活动（筛选中）' : '品牌活动';
```

### 6.2 help-entry.js L69, L71 删除 🔑

- [ ] **Step 1: 修改 L69 和 L71**

将 `docs/src/entries/help-entry.js` L69：

```javascript
// 🔑 逻辑校准（D-207 衍生）：组织者是活动执行核心（脑子），党小组组长是发起者（创建活动+赋权组织者）
```

改为：

```javascript
// 逻辑校准（D-207 衍生）：组织者是活动执行核心（脑子），党小组组长是发起者（创建活动+赋权组织者）
```

将 L71：

```javascript
// 🔑 v4.3.6 校准：4 层节点布局消除线交叠（书记顶/党小组组长+宣传上层/组织者+纪检中层/组织委员+参与者底层）；
```

改为：

```javascript
// v4.3.6 校准：4 层节点布局消除线交叠（书记顶/党小组组长+宣传上层/组织者+纪检中层/组织委员+参与者底层）；
```

### 6.3 party-cross-nav.js L99, L111 删除 👁，换 SVG

- [ ] **Step 1: 修改 import，追加 icon**

将 `docs/src/components/party-cross-nav.js` L7-9 的 import：

```javascript
import { AuthStore } from '../services/auth.js';
import { getBasePath, showToast } from '../core/utils.js';
import { getAccentColors } from '../core/constants.js';
```

改为：

```javascript
import { AuthStore } from '../services/auth.js';
import { getBasePath, showToast } from '../core/utils.js';
import { getAccentColors } from '../core/constants.js';
import { icon } from '../core/icons.js';
```

- [ ] **Step 2: 修改 L99 只读查看提示**

将 L99：

```javascript
    html += `<span class="font-stheiti text-[10px] px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 mr-2">👁 只读查看 · ${currentPageLabel}</span>`;
```

改为：

```javascript
    html += `<span class="font-stheiti text-[10px] px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 mr-2 inline-flex items-center gap-1">${icon('eye', { size: 10 })} 只读查看 · ${currentPageLabel}</span>`;
```

- [ ] **Step 3: 修改 L111 readonlyMark**

将 L111：

```javascript
    const readonlyMark = tab.isReadOnly ? ' <span class="text-[9px] opacity-70">👁</span>' : '';
```

改为：

```javascript
    const readonlyMark = tab.isReadOnly ? ` <span class="inline-flex items-center opacity-70">${icon('eye', { size: 10 })}</span>` : '';
```

### 6.4 inspector.js L273 ★ ☆ 换 SVG

- [ ] **Step 1: 修改 import，追加 icon**

检查 `docs/src/components/inspector.js` 顶部是否已 import `icon`。如未 import，在 import 块追加：

```javascript
import { icon } from '../core/icons.js';
```

- [ ] **Step 2: 修改 L273 品牌活动按钮**

将 L273：

```javascript
    html += `<button id="inspector-brand-toggle-btn" class="font-stheiti text-xs px-3 py-1.5 rounded-lg transition-colors" style="${isBrandActive ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);' : 'background:rgba(234,179,8,0.06);color:#92400E;border:1px solid rgba(234,179,8,0.25);'}">${isBrandActive ? '★ 取消品牌认定' : '☆ 标记为品牌活动'}</button>`;
```

改为：

```javascript
    html += `<button id="inspector-brand-toggle-btn" class="font-stheiti text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1" style="${isBrandActive ? 'background:rgba(234,179,8,0.15);color:var(--brand-amber-dark);border:1px solid rgba(234,179,8,0.40);' : 'background:rgba(234,179,8,0.06);color:#92400E;border:1px solid rgba(234,179,8,0.25);'}">${isBrandActive ? icon('starFilled', { size: 12 }) + ' 取消品牌认定' : icon('starOutline', { size: 12 }) + ' 标记为品牌活动'}</button>`;
```

### 6.5 验证 + Commit

- [ ] **Step 1: 验证所有修改文件语法正确**

Run:
```bash
node --check docs/src/entries/ws-secretary-entry.js
node --check docs/src/entries/help-entry.js
node --check docs/src/components/party-cross-nav.js
node --check docs/src/components/inspector.js
```
Expected: 全部无输出（语法正确）

- [ ] **Step 2: Commit**

```bash
git add docs/src/entries/ws-secretary-entry.js docs/src/entries/help-entry.js docs/src/components/party-cross-nav.js docs/src/components/inspector.js
git commit -m "fix(emoji): 清理 5 处装饰性 emoji（🔥🔑👁★☆）

- ws-secretary-entry.js L130: 🔥品牌活动 → 品牌活动
- help-entry.js L69/71: 删除 🔑 代码注释装饰
- party-cross-nav.js L99/111: 👁 → icon('eye') SVG
- inspector.js L273: ★ ☆ → icon('starFilled'/'starOutline') SVG

依据: USAGE_POLICY §2.1 docs/src/*.js 严禁任何 Emoji
     USAGE_POLICY §2.4.4 装饰性 emoji 禁止列表

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §3.2"
```

---

## Task 7: 一改具改校验（全仓库 Grep 零残留）

**Files:**
- 全仓库扫描

- [ ] **Step 1: emoji 零残留验证**

Run:
```bash
rg -n "[\x{1F300}-\x{1FAFF}]|[\x{2600}-\x{27BF}]" docs/src docs/*.html
```
Expected: 无输出（零残留）

如有残留，逐一清理后再验证。

- [ ] **Step 2: reactions.emoji 字段零残留验证**

Run:
```bash
rg -n "reactions.*\.emoji|\.emoji\s*=" docs/src
```
Expected: 无输出（零残留）

如有残留（其他文件引用 reactions.emoji），逐一更新为 reactions.icon。

- [ ] **Step 3: sidebar workspace-submenu 残留验证**

Run:
```bash
rg -n "workspace-submenu|_renderWorkspaceSubMenu|_bindWorkspaceSubMenu" docs/src
```
Expected: 无输出（零残留）

如有残留（CSS 选择器或其他引用），逐一清理。

- [ ] **Step 4: 如有残留修复后，追加 commit**

```bash
git add -A
git commit -m "chore: 一改具改校验修复（如有残留）"
```

如无残留，跳过此 step。

---

## Task 8: dogfood QA E2E 测试

**Files:**
- 无文件修改（测试验证）

**前置条件**：dev server 已启动（`python -m http.server 8081` 或类似）。

- [ ] **Step 1: 启动 dev server（如未启动）**

Run:
```bash
cd docs && python -m http.server 8081
```
（后台运行，或使用已有 server）

- [ ] **Step 2: E2E 测试 1 - 单身份用户 sidebar `<a>` 直接跳转**

使用 browser 工具：
1. 导航到 `http://localhost:8081/login.html`
2. dev 登录为 `participant`（普通参与者）
3. 导航到任意 workspace 页面
4. 验证 sidebar "党建工作台" 是 `<a href="workspace/visitor.html">`，无 `data-workspace-popover` 属性
5. 点击应直接跳转

Expected: sidebar "党建工作台" 为 `<a>`，无浮窗指示器，点击直接跳转

- [ ] **Step 3: E2E 测试 2 - 多身份用户 sidebar `<a>` + 浮窗**

使用 browser 工具：
1. 导航到 `http://localhost:8081/login.html`
2. dev 登录为有项目角色的用户（如 p3：participant + organizer）
3. 验证 sidebar "党建工作台" 是 `<a>`，带 `data-workspace-popover="1"` 属性和浮窗指示器（小箭头）
4. 点击应弹出浮窗，浮窗列 2 项（普通参与者/组织者）

Expected: sidebar `<a>` + 浮窗弹出，列 2 项

- [ ] **Step 4: E2E 测试 3 - 浮窗外部点击关闭**

在测试 2 基础上：
1. 浮窗打开状态
2. 点击页面其他位置
3. 验证浮窗消失

Expected: 浮窗消失

- [ ] **Step 5: E2E 测试 4 - 浮窗 ESC 关闭**

在测试 2 基础上：
1. 浮窗打开状态
2. 按 ESC 键
3. 验证浮窗消失

Expected: 浮窗消失

- [ ] **Step 6: E2E 测试 5 - 浮窗子项跳转**

在测试 2 基础上：
1. 浮窗打开状态
2. 点击浮窗中"组织者"项
3. 验证跳转到 `workspace/organizer.html`

Expected: 跳转到 organizer.html

- [ ] **Step 7: E2E 测试 6 - reactions SVG 渲染**

使用 browser 工具：
1. 导航到任意有 issue 的页面（如 feedback.html）
2. 验证 reactions 按钮显示为 SVG 图标，非 emoji 字符
3. 验证 issue 列表中 reactions 聚合显示为 SVG 图标 + 数字

Expected: reactions 全部为 SVG，无 emoji 字符

- [ ] **Step 8: E2E 测试 7 - 品牌活动按钮**

使用 browser 工具：
1. dev 登录为 secretary
2. 导航到 workspace/secretary.html
3. 找到品牌活动筛选按钮，验证显示纯文字"品牌活动"，无 🔥
4. 点击某个活动打开 inspector
5. 验证品牌认定按钮显示 SVG 星星图标，非 ★/☆ 字符

Expected: 品牌活动按钮纯文字，品牌认定按钮 SVG 星星

- [ ] **Step 9: E2E 测试 8 - 只读查看标识**

使用 browser 工具：
1. dev 登录为 secretary
2. 导航到 party/org.html（或任意 party 页面）
3. 验证 party-cross-nav 中只读查看提示显示 SVG eye 图标，非 👁 emoji
4. 验证 readonly Tab 标记显示 SVG eye 图标

Expected: 只读查看标识全部为 SVG eye 图标

- [ ] **Step 10: 记录测试结果**

将测试结果（通过/失败+证据）记录到执行日志。失败的测试需要修复后重跑。

---

## Task 9: T109/T110 未覆盖遗漏审查 + 写入 REVIEW_QUEUE.md

**Files:**
- Create/Modify: `.ctx/REVIEW_QUEUE.md`

**审查范围**：4 个维度（术语合规 / UI 一致性 / 母本子本 / 装饰性 Unicode 符号）

- [ ] **Step 1: 维度 1 - 术语合规扫描**

执行以下 Grep 扫描，记录结果：

```bash
# 活动建设/组织建设残留
rg -n "活动建设|组织建设" docs/src docs/*.html content/sop

# 之上/之下
rg -n "之上|之下" docs/src docs/*.html

# 归档→人才库混用
rg -n "归档.*人才库|人才库.*归档" docs/src

# "说人话"
rg -n "说人话" docs/src docs/*.html content/sop

# T3 自造标签泄露到 UI（如"域"）
rg -n "活动建设域|组织建设域|双域" docs/src docs/*.html

# "X 而非 Y" 对立表达
rg -n "而非" docs/src docs/*.html content/sop

# "所以" 因果链
rg -n "^所以|^因此" docs/src docs/*.html content/sop

# 反面假设
rg -n "如果不.*就" docs/src docs/*.html content/sop

# 私加强调
rg -n "这正是|这正是要警惕的|这也就意味着" docs/src docs/*.html content/sop

# 元叙事标签
rg -n "从.*框架转向|重新确立" docs/src docs/*.html content/sop
```

记录每项的命中数和示例。

- [ ] **Step 2: 维度 2 - UI 一致性扫描**

执行以下 Grep 扫描：

```bash
# CTA 按钮标准：text-sm px-4 py-2（T109 已修 21 处，可能有遗漏）
# 查找 text-xs + py-2 的 "壳大字小" 组合
rg -n "text-xs.*py-2|py-2.*text-xs" docs/src

# 视图切换按钮标准：text-sm px-3 py-1.5
rg -n "text-xs.*px-3.*py-1\.5|text-xs.*py-1\.5.*px-3" docs/src

# 嵌套 card border-l-4 边线模式
rg -n "card border-l-4|border-l-4.*card" docs/src

# 党建红颜色（确认不变）
rg -n "party-red|党建红" docs/src/styles.css
```

记录每项的命中数和示例。

- [ ] **Step 3: 维度 3 - 母本子本一致性扫描**

执行以下检查：

```bash
# ROLE_PAGE_MAP 与 SOP 文档中的角色页面映射
rg -n "ROLE_PAGE_MAP" docs/src

# AuthStore API 与 ROLE_CLASSIFICATION.md 权限矩阵
rg -n "getAccessibleWorkspacePages|getUserProjectRoles|hasProjectRole" docs/src

# SSOT_INDEX 中 T110 新增 API 是否注册
rg -n "getAccessibleWorkspacePages|getUserProjectRoles" SSOT_INDEX.md
```

记录每项的结果。

- [ ] **Step 4: 维度 4 - 装饰性 Unicode 符号扩展审查**

执行以下 Grep 扫描：

```bash
# ★ ☆ 数学符号用作装饰
rg -n "[★☆]" docs/src

# ▼ ▶ ▲ 几何符号
rg -n "[▼▶▲]" docs/src

# ─ │ ┌ 制表符
rg -n "[─│┌]" docs/src docs/*.html

# 其他 Unicode 装饰字符（如 ● ○ ◆ ◇ 等）
rg -n "[●○◆◇■□]" docs/src docs/*.html
```

记录每项的命中数和示例。

- [ ] **Step 5: 将审查结果写入 .ctx/REVIEW_QUEUE.md**

创建/更新 `.ctx/REVIEW_QUEUE.md`，结构如下：

```markdown
# 书记评议队列

> 本文件为 T109/T110 未覆盖遗漏审查结果，等待书记评议。
> 审查日期：2026-07-18
> 审查依据：spec 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §4

## 维度 1：术语合规

### 1.1 活动建设/组织建设残留
- 命中数：X
- 示例：[文件:行号] [内容]
- 处理建议：[机械性修复/设计性问题/即时小修订]

### 1.2 之上/之下
...

## 维度 2：UI 一致性
...

## 维度 3：母本子本一致性
...

## 维度 4：装饰性 Unicode 符号
...

## 总结
- 机械性问题：X 项
- 设计性问题：X 项（建议入丙部）
- 即时小修订：X 项
```

- [ ] **Step 6: Commit**

```bash
git add .ctx/REVIEW_QUEUE.md
git commit -m "docs(review): T109/T110 未覆盖遗漏审查结果

4 维度审查:
- 术语合规（活动建设/组织建设/之上/之下/说人话/而非等）
- UI 一致性（壳大字小/嵌套边线/按钮标准）
- 母本子本一致性（ROLE_PAGE_MAP/AuthStore API/SSOT_INDEX）
- 装饰性 Unicode 符号（★☆▼▶▲─│●○等）

审查结果写入 REVIEW_QUEUE.md，等待书记评议。
依据: CLAUDE.md H5.3 评议流程

spec: 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §4"
```

---

## Task 10: verification-before-completion + 最终 commit

**Files:**
- 无（验证阶段）

- [ ] **Step 1: 运行完整验证套件**

Run:
```bash
# 语法验证所有修改的文件
node --check docs/src/components/sidebar.js
node --check docs/src/components/workspace-popover.js
node --check docs/src/core/icons.js
node --check docs/src/components/reactions.js
node --check docs/src/components/issue-list.js
node --check docs/src/entries/ws-secretary-entry.js
node --check docs/src/entries/help-entry.js
node --check docs/src/components/party-cross-nav.js
node --check docs/src/components/inspector.js
```
Expected: 全部无输出（语法正确）

- [ ] **Step 2: emoji 零残留最终验证**

Run:
```bash
rg -n "[\x{1F300}-\x{1FAFF}]|[\x{2600}-\x{27BF}]" docs/src docs/*.html
```
Expected: 无输出

- [ ] **Step 3: 一改具改零残留最终验证**

Run:
```bash
rg -n "workspace-submenu|_renderWorkspaceSubMenu|_bindWorkspaceSubMenu" docs/src
rg -n "reactions.*\.emoji|\.emoji\s*=" docs/src
```
Expected: 全部无输出

- [ ] **Step 4: 浏览器 E2E 最终回归测试**

使用 browser 工具，快速回归以下场景：
1. 单身份用户 sidebar `<a>` 直接跳转 ✅
2. 多身份用户 sidebar `<a>` + 浮窗弹出 ✅
3. reactions SVG 渲染 ✅
4. 品牌活动按钮纯文字 ✅

Expected: 全部通过

- [ ] **Step 5: 更新执行日志**

追加到 `.ctx/logs/2026-07-EXECUTION_LOG.md`：

```markdown
## T111 sidebar 恢复 + emoji 清理 + 未覆盖遗漏审查（2026-07-18）

**依据**：spec 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md

**完成内容**：
- 新建 workspace-popover.js 浮窗组件
- sidebar.js 恢复 <a> 统一性（删除 <button> 子菜单）
- icons.js 新增 7 个 SVG 图标（thumbsUp/thumbsDown/eyes/hooray/starFilled/starOutline/eye）
- reactions.js + issue-list.js emoji 换 SVG
- 清理 5 处装饰性 emoji（🔥🔑👁★☆）
- T109/T110 未覆盖遗漏审查（4 维度）→ REVIEW_QUEUE.md

**一改具改校验**：
- emoji 零残留：✅
- reactions.emoji 字段零残留：✅
- workspace-submenu 残留零：✅

**E2E 测试**：
- 单身份 sidebar <a> 跳转：✅
- 多身份 sidebar <a> + 浮窗：✅
- reactions SVG 渲染：✅
- 品牌活动按钮纯文字：✅

**衍生文件**：
- spec: docs/superpowers/specs/2026-07-18-sidebar-restore-and-emoji-cleanup-design.md
- plan: docs/superpowers/plans/2026-07-18-sidebar-restore-and-emoji-cleanup.md
- 审查: .ctx/REVIEW_QUEUE.md
```

- [ ] **Step 6: 最终 commit（如有未提交变更）**

```bash
git status
# 如有未提交变更
git add .ctx/logs/2026-07-EXECUTION_LOG.md
git commit -m "docs(log): 记录 T111 执行日志"
```

---

## Self-Review

### 1. Spec 覆盖检查

| Spec 章节 | 对应 Task | 状态 |
|-----------|----------|------|
| §2.1-2.2 sidebar 恢复 `<a>` | Task 3 | ✅ |
| §2.2.3 workspace-popover.js | Task 1 | ✅ |
| §2.2.4 文件改动清单 | Task 1, 3 | ✅ |
| §2.3 保留 T110 成果 | Task 3（仅删除子菜单，保留 API 调用） | ✅ |
| §3.1 emoji 权威源 | 全程依据 USAGE_POLICY.md §二 | ✅ |
| §3.2 11 处 emoji 违规清单 | Task 4, 5, 6 | ✅ |
| §3.3 Reactions SVG 设计 | Task 2, 4, 5 | ✅ |
| §3.4 不恢复 EMOJI_POLICY.md | 全程不创建该文件 | ✅ |
| §4.1-4.3 未覆盖遗漏审查 | Task 9 | ✅ |
| §5 Error Handling | Task 1（浮窗外部点击/ESC）+ Task 3（standingPage 兜底） | ✅ |
| §6 Testing | Task 8 | ✅ |
| §7 一改具改清单 | Task 7 | ✅ |
| §8 不做的事 | 全程遵守 | ✅ |

### 2. 占位符扫描

- ✅ 无 TBD / TODO / 未完成章节
- ✅ 所有 step 都有具体代码或命令
- ✅ 所有文件路径完整

### 3. 类型/方法一致性

- ✅ `bindWorkspacePopover(sidebar)` 在 Task 1 定义，Task 3 调用 — 名称一致
- ✅ `icon(name, opts)` 调用方式在 Task 2/4/5/6 一致
- ✅ `REACTIONS` 对象字段从 `emoji` 改为 `icon`，Task 4（定义）+ Task 5（使用）一致
- ✅ `data-workspace-popover="1"` 在 Task 3（渲染）+ Task 1（绑定）一致

### 4. 依赖顺序

Task 依赖关系：
- Task 1（workspace-popover.js）→ Task 3（sidebar 调用）✅
- Task 2（icons.js 新增）→ Task 4（reactions 用）/ Task 5（issue-list 用）/ Task 6（party-cross-nav + inspector 用）✅
- Task 7（校验）→ 依赖 Task 1-6 ✅
- Task 8（E2E）→ 依赖 Task 1-7 ✅
- Task 9（审查）→ 可并行，但建议在 Task 1-8 后 ✅
- Task 10（verification）→ 依赖 Task 1-9 ✅

**建议执行顺序**：Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-sidebar-restore-and-emoji-cleanup.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，任务间审查，快速迭代

**2. Inline Execution** - 在当前 session 中执行，批量执行 + 检查点审查

**Which approach?**
