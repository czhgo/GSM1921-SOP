---
role: "[工程师]+[AI]"
title: "sidebar 恢复 + emoji 清理 + 未覆盖遗漏审查"
type: design-spec
status: "approved-pending-review"
date: "2026-07-18"
last_updated: "2026-07-18"
brainstorming_session: "2026-07-18"
related_decisions: "T110 衍生（用户 2026-07-18 反馈）"
---

# sidebar 恢复 + emoji 清理 + 未覆盖遗漏审查

> 本设计承接 T110（organizer/deep 工作台可达性设计）实施成果，根据书记 2026-07-18 反馈调整三件事：
>
> 1. **sidebar 恢复**：T110 引入的 `<button>` 子菜单破坏了 sidebar 元素统一性（其他模块都是 `<a>`）。书记要求恢复 `<a>` 统一性，多身份时"跳出一个小浮窗选择"。
> 2. **emoji 清理**：按 [USAGE_POLICY.md §二](content/governance/USAGE_POLICY.md) Emoji 使用规范清理全系统 emoji。**不允许恢复 EMOJI_POLICY.md**（已合并进入 USAGE_POLICY.md，恢复即开历史倒车）。
> 3. **未覆盖遗漏审查**：T109（代码硬伤）/T110（organizer 可达性）未覆盖的遗漏——术语合规、UI 一致性、母本子本一致性等维度。

---

## 一、设计目标与已确认决策

### 1.1 核心目标

- sidebar DOM 结构统一：所有导航项都是 `<a>`，消除 T110 引入的 `<button>` 子菜单
- 多身份用户点击"党建工作台"`<a>` 时弹出小浮窗选择目标工作台
- 全系统 emoji 按 USAGE_POLICY.md §二清理（P0 级缺陷立即修复）
- 补齐 T109/T110 未覆盖的审查维度

### 1.2 已确认设计决策（brainstorming 阶段）

| # | 决策维度 | 选项 | 理由 |
|---|---------|------|------|
| 1 | sidebar 元素类型 | `<a>` 统一 | 书记原话"和其他一样都是`<a>`，现在的`<button>`破坏了统一性" |
| 2 | 多身份触发方式 | 点击 `<a>` 拦截 + 弹浮窗 | 书记原话"按照实际情况跳出一个小浮窗选择" |
| 3 | emoji 权威源 | USAGE_POLICY.md §二 | 书记原话"不允许恢复 Emoji_policy（已经合并进入 Usage Policy）" |
| 4 | reactions 处理 | 换 SVG 图标 | 书记选择 A 方案"全部清理，reactions 换 SVG" |
| 5 | 审查范围 | T109/T110 未覆盖遗漏 | 书记选择 B 方案 |

### 1.3 一改具改强制约束（书记 2026-07-18 重申）

> "不允许开历史倒车！！"

- **不恢复 EMOJI_POLICY.md**：emoji 规范权威源是 USAGE_POLICY.md §二
- **不破坏 T110 既有成果**：身份逻辑（AuthStore 3 API + NoticeStore targetUrl + 颜色归一）保留，仅调整 sidebar 渲染方式
- **数据设计变更同步**：sidebar 改造如涉及 AuthStore API 调用方式变化，所有调用方必须同步更新

---

## 二、任务一：sidebar 恢复 + 身份逻辑新方案

### 2.1 当前问题（T110 引入）

T110 spec §3.3 引入了 `_renderWorkspaceSubMenu`，将"党建工作台"渲染为：

```html
<div class="workspace-submenu">
  <button data-workspace-toggle>...</button>  <!-- 破坏 <a> 统一性 -->
  <div class="workspace-submenu-panel hidden">...</div>
</div>
```

其他模块（主页/党务管理/人员管理/归档库/资料查询/意见反馈）都是 `<a href="...">`。`<button>` 破坏了 sidebar 的 DOM 统一性。

### 2.2 新方案：`<a>` + 点击拦截浮窗

#### 2.2.1 渲染逻辑

**核心**：sidebar 中"党建工作台"始终渲染为 `<a>`，与其他模块一致。

```javascript
// sidebar.js renderSidebar() workspace 分支
if (item.module === 'workspace') {
  // 始终用 standing role 取页面（恢复旧版逻辑）
  const standingPage = AuthStore.getPageForRole('workspace', standingRole);
  if (!standingPage) return '';  // 无对应页面则隐藏
  href = getBasePath() + 'workspace/' + standingPage;
  // 渲染为 <a>，不渲染 <button>
}
```

#### 2.2.2 多身份浮窗触发

**核心**：`<a>` 渲染时附带 `data-has-project-roles` 标记，点击时由 JS 拦截弹浮窗。

```javascript
// sidebar.js 渲染时
const user = AuthStore.getCurrentUser();
const projectRoles = user ? AuthStore.getUserProjectRoles(user.personId) : [];
const needsPopover = projectRoles.length > 0;

return `
  <a href="${href}"
     class="module-tab ${item.module === activeModule ? 'active' : ''}"
     data-module="${item.module}"
     ${needsPopover ? 'data-workspace-popover="1"' : ''}>
    ${item.icon}
    <span class="font-title-cn">${item.label}</span>
    ${needsPopover ? '<svg class="popover-indicator" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
  </a>
`;
```

#### 2.2.3 浮窗组件（`components/workspace-popover.js` 新建）

**设计**：单独抽离浮窗组件，参照 header view-switcher 事件绑定模式。

```javascript
// components/workspace-popover.js
export function bindWorkspacePopover(sidebar) {
  const trigger = sidebar.querySelector('[data-workspace-popover="1"]');
  if (!trigger) return;

  let popover = null;

  function showPopover() {
    if (popover) return;
    const user = AuthStore.getCurrentUser();
    const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
    // pages 包含 standing + project，浮窗列全部

    popover = document.createElement('div');
    popover.className = 'workspace-popover-panel';
    popover.style.cssText = `
      position:absolute; left:100%; top:0; width:200px;
      border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.12);
      background:var(--surface-card); overflow:hidden; z-index:100;
      border:1px solid #E5E7EB;
    `;
    popover.innerHTML = pages.map(p => {
      const isActive = window.location.pathname.includes('/workspace/' + p.page);
      return `<a href="${getBasePath()}workspace/${p.page}"
                class="workspace-popover-item"
                style="display:block; padding:8px 12px; color:var(--neutral-800);
                       font-size:13px; text-decoration:none;
                       ${isActive ? 'background:var(--surface-hover);' : ''}">
                ${p.label}
              </a>`;
    }).join('');

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

#### 2.2.4 文件改动清单

| 文件 | 改动类型 | 详情 |
|------|---------|------|
| `docs/src/components/sidebar.js` | 删除子菜单代码 + 恢复 `<a>` 渲染 + 调用 popover 绑定 | 删除 `_renderWorkspaceSubMenu` / `_bindWorkspaceSubMenu`；恢复旧版 `getPageForRole` 调用；新增 `bindWorkspacePopover(sidebar)` 调用 |
| `docs/src/components/workspace-popover.js` | 新建 | 浮窗组件，独立于 sidebar.js |

### 2.3 保留的 T110 成果

以下 T110 成果**不动**：

- `AuthStore.getUserProjectRoles(personId)` — 保留，供 popover 使用
- `AuthStore.hasProjectRole(personId, role)` — 保留
- `AuthStore.getAccessibleWorkspacePages(personId)` — 保留，供 popover 渲染
- `AuthStore.authorize()` 联动 NoticeStore 推送赋权通知（含 targetUrl）— 保留
- `bootstrap.js` `_devLoginProjectRole` + `DEV_ROLE_WHITELIST` 扩展 organizer/deep — 保留
- `login-entry.js` `DEV_CARDS` 扩展 organizer/deep — 保留
- `ws-organizer-entry.js` / `ws-deep-entry.js` 动态化（删除硬编码 p3/p5）— 保留
- 颜色归一（ACCENT_COLORS 体系）— 保留

---

## 三、任务二：emoji 清理

### 3.1 权威源

**USAGE_POLICY.md §二** Emoji 使用规范（行 322-454）。

**核心原则**（USAGE_POLICY §2.1）："系统零 Emoji，文档有限度使用。"

**关键规则**：
- §2.1 绝对禁止：`docs/src/*.js` 中的用户可见字符串和 console 输出严禁任何 Emoji
- §2.4.4 装饰性 emoji 禁止列表：💡🗺️📚📖🌟⭐🎯📊🔑🔗👤⚡📝🗂️📌
- §2.5.2 违规处理：系统中发现 Emoji = P0 级缺陷，立即修复
- §2.4.1 SVG 图标不受限制

### 3.2 全系统 emoji 违规清单（11 处）

| # | 文件 | 行 | 当前 | 类型 | 处理 |
|---|------|----|----|------|------|
| 1 | `ws-secretary-entry.js` | 130 | `🔥品牌活动（筛选中）` / `🔥品牌活动` | 装饰性 | 删除 🔥，改为纯文字"品牌活动（筛选中）"/"品牌活动" |
| 2 | `help-entry.js` | 69 | `// 🔑 逻辑校准...` | 装饰性（代码注释） | 删除 🔑，改为"// 逻辑校准：" |
| 3 | `help-entry.js` | 71 | `// 🔑 v4.3.6 校准...` | 装饰性（代码注释） | 删除 🔑，改为"// v4.3.6 校准：" |
| 4 | `party-cross-nav.js` | 99 | `👁 只读查看` | 装饰性 | 删除 👁，用 `icon('eye')` SVG 替代 |
| 5 | `party-cross-nav.js` | 111 | `<span>👁</span>` | 装饰性 | 删除 👁，用 `icon('eye', { size: 10 })` SVG 替代 |
| 6 | `inspector.js` | 273 | `★ 取消品牌认定` / `☆ 标记为品牌活动` | Unicode 符号 | 改用 `icon('starFilled')` / `icon('starOutline')` SVG |
| 7-10 | `reactions.js` | 9-12 | `👍` `👎` `👀` `🎉` | 反应表情 | 换 SVG：新增 4 个图标到 `icons.js` |
| 11 | `issue-list.js` | 83 | `👍👎👀🎉` | 反应表情渲染 | 改为 `icon(reactions[type].icon)` 调用 |

### 3.3 Reactions SVG 设计

**新增 4 个图标到 `core/icons.js`**：

```javascript
// core/icons.js 追加
thumbsUp:    '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3 13 0 0 1 3 3.88z"/>',
thumbsDown:  '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3 13 0 0 1-3-3.88z"/>',
eyes:        '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
hooray:      '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/>',
starFilled:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
starOutline: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none"/>',
eye:         '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
```

**reactions.js 改造**：

```javascript
// 旧
{ key: 'thumbsUp', emoji: '👍', label: '赞同', activeColor: '#059669' },
// 新
{ key: 'thumbsUp', icon: 'thumbsUp', label: '赞同', activeColor: '#059669' },
```

**issue-list.js 改造**：

```javascript
// 旧
const emoji = { thumbsUp: '👍', thumbsDown: '👎', eyes: '👀', hooray: '🎉' }[type] || '·';
// 新
import { icon } from '../core/icons.js';
const iconName = { thumbsUp: 'thumbsUp', thumbsDown: 'thumbsDown', eyes: 'eyes', hooray: 'hooray' }[type];
const iconHTML = iconName ? icon(iconName, { size: 14 }) : '·';
```

### 3.4 不恢复 EMOJI_POLICY.md

书记 2026-07-18 明确："不允许恢复 Emoji_policy（已经合并进入 Usage Policy）。不允许开历史倒车！！"

- EMOJI_POLICY.md 原位于 `content/guides/governance/EMOJI_POLICY.md`，在 commit `744faf9` 之前已存在
- 现已合并进入 `content/governance/USAGE_POLICY.md` §二（行 322-454）
- **本 spec 不创建任何 EMOJI_POLICY.md 文件**
- emoji 清理依据 USAGE_POLICY.md §二执行

---

## 四、任务三：T109/T110 未覆盖遗漏审查

### 4.1 审查范围

T109 已覆盖：代码硬伤（acorn 语法/FFFD 残留/反引号配对/花括号平衡）+ 字体组件相称性
T110 已覆盖：organizer/deep 可达性 + 颜色归一 + AuthStore API 一致性

本任务覆盖**未涉及的遗漏维度**：

### 4.2 4 个审查维度

#### 4.2.1 术语合规扫描

**依据**：USAGE_POLICY.md §一 术语规范 + CLAUDE.md C-5 持续任务

**扫描项**：
- 活动建设/组织建设残留 → 应为"党建工作"
- 之上/之下 → 改为更自然的中文表达
- 归档→人才库混用 → 术语边界
- "说人话" → 应为"通俗表达："（正式语境）
- T3 自造标签泄露到 UI（如"域"）
- 其他 USAGE_POLICY §1.9.3 五条检查规则：
  - "X 而非 Y" 对立表达（30% 频率警告）
  - "所以" 因果链过度使用
  - 反面假设（"如果...那么..."）
  - 私加强调（"必须"/"一定要"）
  - 元叙事标签（"这里我要..."）

**扫描范围**：`docs/src/*.js` + `docs/*.html` + `content/sop/*.md`

#### 4.2.2 UI 一致性扫描

**依据**：CLAUDE.md C-4 持续任务 + user_profile 偏好

**扫描项**：
- CTA 按钮标准：`text-sm px-4 py-2`（T109 已修 21 处，可能有遗漏）
- 视图切换按钮标准：`text-sm px-3 py-1.5`
- 表单元素标准：`text-sm px-3 py-2`
- "壳大字小" 禁止：`text-xs + py-2` CTA 组合
- 嵌套 `card border-l-4` 边线模式（user_profile 偏好"dislikes nested 边线"）
- 组件大小比例（字体与组件大小相称）
- 党建红颜色不变（user_profile "党建红 must remain unchanged"）
- 党支部副书记颜色与书记一致（user_profile）

**扫描范围**：`docs/src/entries/*.js` + `docs/src/components/*.js`

#### 4.2.3 母本子本一致性

**依据**：CLAUDE.md H2.2 设计母本与子本 + SSOT_INDEX.md

**扫描项**：
- `content/sop/*.md`（母本）→ `docs/src/*.js`（子本）引用断裂
- `ROLE_PAGE_MAP` 与 SOP 文档中的角色页面映射是否一致
- `AuthStore` API 与 `content/governance/ROLE_CLASSIFICATION.md` 权限矩阵一致性
- `SSOT_INDEX.md` 注册的母本子本关系是否有断裂
- T110 新增的 `getAccessibleWorkspacePages` / `getUserProjectRoles` API 是否需要在 SSOT_INDEX 中注册

**扫描范围**：`content/sop/` + `content/governance/ROLE_CLASSIFICATION.md` + `SSOT_INDEX.md` + `docs/src/`

#### 4.2.4 装饰性 Unicode 符号扩展审查

**依据**：USAGE_POLICY §2.4.4 装饰性 emoji 禁止列表 + §2.4.1 SVG 不受限制

**扫描项**：
- 除 emoji 外，Unicode 装饰符号是否需要清理：
  - ★ ☆（数学符号，但用作装饰）
  - ▼ ▶ ▲（几何符号）
  - ─ │ ┌（制表符）
  - 其他 Unicode 装饰字符
- 当前发现的 `inspector.js:273` `★ ☆` 已在 §3.2 清单中
- 全仓库扫描此类符号，归一为 SVG 或纯文字

**扫描范围**：`docs/src/*.js` + `docs/*.html`

### 4.3 审查输出

审查结果写入 `.ctx/REVIEW_QUEUE.md`（参照 CLAUDE.md H5.3 评议流程），包含：
- 抽样清单（按维度）
- 问题清单（机械性问题 / 设计性问题 / 即时小修订）
- 处理建议

---

## 五、Error Handling

| 场景 | 处理 |
|------|------|
| 多身份浮窗外部点击未关闭 | `document.addEventListener('click')` 检测外部点击，hidePopover |
| 浮窗打开后用户按 ESC | `keydown` 监听 ESC，hidePopover |
| `AuthStore.getAccessibleWorkspacePages` 返回空 | sidebar 渲染时 `if (!standingPage) return ''`，浮窗不弹出 |
| SVG 图标未定义（如 `icon('thumbsUp')` 返回空字符串） | `icon()` 函数已有 `if (!inner) return ''` 兜底，渲染为空字符串不报错 |
| reactions 数据中 `icon` 字段为 undefined | issue-list.js 改造时加 `iconName || '·'` 兜底 |

---

## 六、Testing

### 6.1 单元测试

- `AuthStore.getAccessibleWorkspacePages(personId)`：
  - 单身份用户（participant）返回 `[{role:'participant', page:'visitor.html', label:'普通参与者'}]`
  - 多身份用户（p3：participant + organizer）返回 2 项
  - 未登录用户返回 `[]`
- `icon('thumbsUp')` 等新 SVG 图标：返回非空 `<svg>` HTML 字符串

### 6.2 E2E 测试清单

1. **单身份用户**（participant）：sidebar "党建工作台" 是 `<a href="workspace/visitor.html">`，无浮窗指示器，点击直接跳转
2. **多身份用户**（p3：participant + organizer）：sidebar "党建工作台" 是 `<a>`，带浮窗指示器（小箭头 SVG），点击弹出浮窗，浮窗列 2 项（普通参与者/组织者）
3. **浮窗外部点击关闭**：浮窗打开后点击页面其他位置，浮窗消失
4. **浮窗 ESC 关闭**：浮窗打开后按 ESC，浮窗消失
5. **浮窗子项跳转**：点击浮窗中"组织者"项，跳转到 `workspace/organizer.html`
6. **emoji 零残留**：全仓库 Grep 验证 `docs/src` + `docs/*.html` 无 emoji 残留
7. **reactions SVG 渲染**：issue-list.js 中 reactions 显示为 SVG 图标，非 emoji 字符
8. **品牌活动按钮**：ws-secretary-entry.js 中品牌活动按钮显示纯文字"品牌活动"，无 🔥
9. **只读查看标识**：party-cross-nav.js 中显示 SVG eye 图标，无 👁 emoji

---

## 七、一改具改清单

### 7.1 sidebar 改造涉及

| 变更点 | 影响范围 | 同步要求 |
|--------|---------|---------|
| 删除 `_renderWorkspaceSubMenu` / `_bindWorkspaceSubMenu` | `sidebar.js` 内部 | 无外部调用方，无同步要求 |
| 新增 `workspace-popover.js` | `sidebar.js` import + 调用 | 仅 sidebar.js 调用 |
| sidebar "党建工作台" 恢复 `<a>` 渲染 | `sidebar.js` | CSS 样式（如有针对 `workspace-submenu` 的选择器）需清理 |

### 7.2 emoji 清理涉及

| 变更点 | 影响范围 | 同步要求 |
|--------|---------|---------|
| `reactions.js` 字段 `emoji` → `icon` | `issue-list.js` / `issue-detail.js`（如有调用 reactions.emoji） | 全仓库搜索 `reactions.*emoji` / `\.emoji` 引用，逐一更新 |
| `icons.js` 新增 7 个图标 | 全仓库 | 无破坏性，新图标不影响现有调用 |
| `ws-secretary-entry.js:130` 删除 🔥 | 单文件 | 无外部引用 |
| `help-entry.js:69,71` 删除 🔑 | 单文件 | 无外部引用 |
| `party-cross-nav.js:99,111` 删除 👁 | 单文件 | 无外部引用 |
| `inspector.js:273` ★ ☆ → SVG | 单文件 | 无外部引用 |

### 7.3 全仓库验证

实施完成后，必须执行以下 Grep 验证零残留：

```bash
# emoji 零残留
rg -n "[\x{1F300}-\x{1FAFF}]|[\x{2600}-\x{27BF}]" docs/src docs/*.html

# reactions.emoji 字段零残留
rg -n "reactions.*\.emoji|\.emoji\s*=" docs/src

# sidebar workspace-submenu 残留
rg -n "workspace-submenu|_renderWorkspaceSubMenu|_bindWorkspaceSubMenu" docs/src
```

---

## 八、不做的事

- **不恢复 EMOJI_POLICY.md**：已合并进入 USAGE_POLICY.md，恢复即开历史倒车
- **不修改 AuthStore 3 API**：`getUserProjectRoles` / `hasProjectRole` / `getAccessibleWorkspacePages` 保留，仅调整调用方
- **不修改 NoticeStore targetUrl 机制**：T110 的赋权通知跳转保留
- **不修改颜色归一成果**：T110 的 ACCENT_COLORS 体系保留
- **不修改 dev 层扩展**：T110 的 `_devLoginProjectRole` / `DEV_CARDS` 保留
- **不做大规模重构**：仅清理 emoji + 恢复 sidebar `<a>` + 新增浮窗组件
- **不审查 T109/T110 已覆盖的维度**：避免重复劳动

---

## 九、Spec Self-Review

### 9.1 占位符扫描

- ✅ 无 TBD / TODO / 未完成章节
- ✅ 所有 emoji 处理项已明确文件+行号+处理方式

### 9.2 内部一致性

- ✅ §二 sidebar 方案与 §1.2 决策 1/2 一致（`<a>` 统一 + 点击拦截浮窗）
- ✅ §三 emoji 清理与 §1.2 决策 3/4 一致（USAGE_POLICY §二权威源 + reactions 换 SVG）
- ✅ §四审查范围与 §1.2 决策 5 一致（T109/T110 未覆盖遗漏）
- ✅ §七 一改具改清单覆盖所有变更点

### 9.3 范围检查

- ✅ 三个任务可由单个实施计划完成（sidebar 改造 + emoji 清理 + 审查）
- ✅ 审查任务输出为 REVIEW_QUEUE.md（参照 H5.3 评议流程），不直接修改

### 9.4 歧义检查

- ✅ "多身份"定义明确：`AuthStore.getUserProjectRoles(personId).length > 0`
- ✅ "浮窗"定义明确：绝对定位 `left:100%`，参照 header view-switcher 事件绑定模式
- ✅ "emoji 零残留"判定标准明确：USAGE_POLICY §2.1 `docs/src/*.js` 严禁任何 Emoji

---

## 十、实施顺序建议

| Phase | 任务 | 文件 | 依赖 |
|-------|------|------|------|
| 1 | sidebar 恢复 `<a>` + 删除子菜单代码 | `sidebar.js` | 无 |
| 2 | 新建 `workspace-popover.js` + sidebar 调用 | `workspace-popover.js` + `sidebar.js` | Phase 1 |
| 3 | 新增 SVG 图标到 `icons.js` | `icons.js` | 无 |
| 4 | reactions.js 换 SVG + issue-list.js 同步 | `reactions.js` + `issue-list.js` | Phase 3 |
| 5 | 其余 emoji 清理（5 处装饰性） | 5 个文件 | Phase 3（部分依赖） |
| 6 | 一改具改校验（全仓库 Grep 零残留） | 全仓库 | Phase 1-5 |
| 7 | dogfood QA E2E 测试 | 浏览器 | Phase 1-6 |
| 8 | T109/T110 未覆盖遗漏审查 + 写入 REVIEW_QUEUE.md | 全仓库 | Phase 1-7 |
| 9 | verification-before-completion + commit | - | Phase 1-8 |

---

*本 spec 承接 T110 成果，根据书记 2026-07-18 反馈调整。spec 审批通过后将调用 writing-plans skill 转入实施。*
