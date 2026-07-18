---
role: "[工程师]+[AI]"
title: "organizer / deep 工作台可达性设计"
type: design-spec
status: "approved-pending-review"
date: "2026-07-18"
last_updated: "2026-07-18"
brainstorming_session: "2026-07-18"
related_decisions: "T4-b (2026-07-17)"
---

# organizer / deep 工作台可达性设计

> 本设计解决「被赋权为 organizer / deep 的人如何进入对应工作台页面」的问题。
> 当前 [organizer.html](file:///d:/GitHub/GSM1921-SOP/docs/workspace/organizer.html) 与 [deep.html](file:///d:/GitHub/GSM1921-SOP/docs/workspace/deep.html) 完全孤立——sidebar 不显示、login 不出现、`DEV_ROLE_WHITELIST` 排除、header 视角下拉对其本人不可见。两页面还写死了 `p3`/`p5` personId，是 demo 性质而非功能性。

---

## 一、设计目标与已确认决策

### 1.1 核心目标

让被赋权为 organizer / deep 的人能真正使用对应工作台页面完成日常工作。

### 1.2 已确认设计决策（brainstorming 阶段）

| # | 决策维度 | 选项 | 理由 |
|---|---------|------|------|
| 1 | 页面定位 | **功能性工作台** | 书记明确要求实质性改造，不做 demo |
| 2 | 入口位置 | **A+C 双入口** | sidebar 长期链接 + 赋权时站内通知跳转；发现性与即时性双优 |
| 3 | 作用域 | **全局聚合** | 一个 organizer.html 跨活动/专班显示；通知不带 projectId；sidebar 一个链接 |
| 4 | sidebar 呈现 | **单角色→直接跳转 / 2+角色→子菜单** | 智能切换：不挤占单角色用户，又能让多角色用户清晰选择 |

### 1.3 一改具改强制约束（书记 2026-07-18 强调）

> "如果涉及到数据的设计、交互的设计等等一定要一改具改！！"

所有"数据设计"与"交互设计"层面的改动必须全仓库同步更新所有相关引用，**不得遗漏**。
- 数据设计变更：如 `AuthStore` 新增 API → 所有调用方必须同步更新
- 交互设计变更：如 sidebar 子菜单模式 → 如有其他模块复用同样模式必须同步重构

详细"一改具改清单"见 §六。

### 1.4 角色颜色一致性强制约束（书记 2026-07-18 强调）

> "请检查所有的角色的颜色是在该一致的地方一致！！"

详见 §七"附加强制项 B：角色颜色一致性归一"。

---

## 二、架构总览

### 2.1 设计原则

**不动摇的本质**：
- organizer / deep 仍是项目角色（per-project contextual），登录时 standing role 不变
- `ROLE_PAGE_MAP` 不动（保持 standing role → 页面映射）
- `VIEWABLE_ROLES` 不动（保持"上级查看下级"语义，不在该下拉里给被赋权者本人加 organizer/deep）
- `AuthStore.canDo()` 权限判定不动

**新增的能力**：
- 被赋权者本人能从 sidebar 进入工作台
- 赋权时通过站内通知即时触达
- 工作台页面动态读取当前登录用户 personId（不再写死 `p3`/`p5`）

### 2.2 数据流

```
[书记/支委] 调用 AuthStore.authorize(targetPersonId, 'organizer', { projectId })
   ↓
AuthStore.authorize() 写入赋权记录
   + NoticeStore.add() 推送通知（targetUrl = 'workspace/organizer.html'）
   ↓
[被赋权人] 下次登录 → sidebar 检测项目角色赋权记录 → 显示子菜单或直接链接
   ↓
[被赋权人] 点击 "组织者工作台" → 进入 organizer.html
   ↓
ws-organizer-entry.js 读取 AuthStore.getCurrentUser().personId
   → 用 _getProjectRole(personId, projectId) 筛选自己作为 organizer 的活动/专班
   → 渲染
```

---

## 三、Components 改动清单

### 3.1 数据层 — `services/auth.js` 新增 API

新增 3 个 API：

```javascript
// AuthStore 新增 API

/** 获取该用户持有的所有项目角色（去重） */
getUserProjectRoles(personId) {
  // 1. 检查 auth records（运行时赋权记录）
  const records = _getAuthRecords();
  const projectRoleSet = new Set();
  records.forEach(r => {
    if (r.targetPersonId === personId && ['organizer', 'deep'].includes(r.role)) {
      projectRoleSet.add(r.role);
    }
  });
  // 2. 检查 mock 数据（活动 assignments + 专班 members）
  ACTIVITIES.forEach(a => {
    if (Array.isArray(a.assignments)) {
      a.assignments.forEach(rec => {
        if (rec.personId === personId && ['organizer', 'deep'].includes(rec.role)) {
          projectRoleSet.add(rec.role);
        }
      });
    }
  });
  MOCK_TASKFORCES.forEach(t => {
    if (Array.isArray(t.members)) {
      t.members.forEach(m => {
        if (m.personId === personId && ['organizer', 'deep'].includes(m.role)) {
          projectRoleSet.add(m.role);
        }
      });
    }
  });
  return [...projectRoleSet];
}

/** 便捷判定 */
hasProjectRole(personId, role) {
  return this.getUserProjectRoles(personId).includes(role);
}

/**
 * 该用户可达的所有 workspace 页面（standing + project）
 * @returns {Array<{ role: string, page: string, label: string }>}
 */
getAccessibleWorkspacePages(personId) {
  const pages = [];
  const standingRole = _getUserRoleFromMemory(personId);

  // 1. standing role 对应页面（来自 ROLE_PAGE_MAP.workspace）
  const standingPage = (ROLE_PAGE_MAP.workspace || {})[standingRole];
  if (standingPage) {
    pages.push({
      role: standingRole,
      page: standingPage,
      label: ROLE_LABELS[standingRole] || standingRole,
    });
  }

  // 2. 项目角色对应页面（organizer.html / deep.html）
  const projectRoles = this.getUserProjectRoles(personId);
  projectRoles.forEach(role => {
    const page = role === 'organizer' ? 'organizer.html' : 'deep.html';
    pages.push({
      role,
      page,
      label: ROLE_LABELS[role] || role,
    });
  });

  return pages;
}
```

### 3.2 通知层 — `services/auth.js` 的 `authorize()` 联动 NoticeStore

```javascript
// auth.js authorize() 末尾追加（在 _saveAuthRecords(records) 之后）

// 赋权通知：organizer / deep 被赋权时给被赋权人推送站内通知
if (role === 'organizer' || role === 'deep') {
  const targetPage = role === 'organizer'
    ? 'workspace/organizer.html'
    : 'workspace/deep.html';

  const authorizerName = getPersonName(authorizerId) || authorizerId;
  const projectName = _getProjectName(scopeRef) || '未命名项目';
  const roleLabel = ROLE_LABELS[role] || role;

  NoticeStore.add({
    recipientId: targetPersonId,
    title: '赋权通知',
    content: `${authorizerName} 已将您赋权为「${projectName}」的${roleLabel}`,
    targetUrl: targetPage,
    createdAt: new Date().toISOString(),
  });
}
```

辅助函数：

```javascript
// auth.js 顶部追加 import
import { getPersonName } from '../mock/index.js';
import { NoticeStore } from './notice.js';

// auth.js 内部辅助
function _getProjectName(projectId) {
  if (!projectId) return null;
  const a = ACTIVITIES.find(x => x.id === projectId);
  if (a) return a.title;
  const t = MOCK_TASKFORCES.find(x => x.id === projectId);
  if (t) return t.name;
  return null;
}
```

**⚠️ 一改具改触发**：`NoticeStore.add()` 的字段定义如已存在（recipientId/title/content/targetUrl/createdAt），沿用现有字段，**不得自创字段**。如发现 NoticeStore 不接受 `targetUrl` 字段，须全仓库检查现有通知的跳转字段命名并归一。

### 3.3 导航层 — `components/sidebar.js` 改造

```javascript
// sidebar.js getNavItems() 不变；renderSidebar 中 workspace 分支改造

if (item.module === 'workspace') {
  const pages = AuthStore.getAccessibleWorkspacePages(user.personId);
  if (pages.length === 0) return '';

  if (pages.length === 1) {
    // B: 单角色直接跳转（沿用现有行为）
    href = getBasePath() + 'workspace/' + pages[0].page;
  } else {
    // C: 多角色子菜单
    // 渲染: 主按钮 "党建工作台 ▼" + 下拉面板
    // - 子项点击跳转
    // - ESC / 外部点击关闭（沿用 header view-switcher 模式）
    // - 当前页面 URL 匹配项高亮 + 自动展开
    return _renderWorkspaceSubMenu(item, pages, activeModule);
  }
}
```

子菜单渲染（新增辅助函数 `_renderWorkspaceSubMenu`）：

```javascript
function _renderWorkspaceSubMenu(item, pages, activeModule) {
  const base = getBasePath();
  const currentPath = window.location.pathname;
  const activePage = pages.find(p => currentPath.includes('/workspace/' + p.page));

  const subItemsHTML = pages.map(p => {
    const isActive = activePage?.role === p.role;
    const activeBar = isActive
      ? `<span style="position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--party-gold);border-radius:1px;"></span>`
      : '';
    const selectedBg = isActive ? 'background:var(--surface-hover);' : '';
    return `<a href="${base}workspace/${p.page}" class="workspace-sub-item" data-role="${p.role}" style="position:relative;padding:8px 12px;cursor:pointer;color:var(--neutral-800);font-size:13px;transition:background 0.15s;display:block;text-decoration:none;${selectedBg}">${activeBar}<span>${p.label}</span></a>`;
  }).join('');

  return `
    <div class="workspace-submenu" style="position:relative;">
      <button class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <span style="display:flex;align-items:center;gap:8px;">${item.icon}<span class="font-title-cn">${item.label}</span></span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style="flex-shrink:0;"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="workspace-submenu-panel hidden" style="position:absolute;left:100%;top:0;width:200px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);background:var(--surface-card);overflow:hidden;z-index:100;border:1px solid #E5E7EB;">
        ${subItemsHTML}
      </div>
    </div>
  `;
  // _bindWorkspaceSubMenuEvents() 绑定展开/关闭/外部点击/ESC
}
```

**⚠️ 一改具改触发**：子菜单交互模式应与 [header.js view-switcher](file:///d:/GitHub/GSM1921-SOP/docs/src/components/header.js#L133-L196) 保持一致。
- "模式一致"指**事件绑定模式一致**（点击展开、ESC 关闭、外部点击关闭、选中态视觉），不指视觉位置一致
- sidebar 子菜单是横向展开（`left:100%`），header view-switcher 是竖向下拉（`top:calc(100% + 4px)`）——视觉位置因容器不同而异
- 如要统一抽象，可抽出 `_bindDropdownPanel(btn, panel, onSelect, opts)` 公共工具函数到 `core/utils.js`，opts 中可配置展开方向等差异点

### 3.4 页面层 — `ws-organizer-entry.js` / `ws-deep-entry.js` 动态化

**当前问题**：
- [ws-organizer-entry.js:60](file:///d:/GitHub/GSM1921-SOP/docs/src/entries/ws-organizer-entry.js#L60): `const HANDOVER_ORGANIZER_ID = 'p3';` 写死
- [ws-deep-entry.js:13](file:///d:/GitHub/GSM1921-SOP/docs/src/entries/ws-deep-entry.js#L13): `const DEEP_PERSON_ID = 'p5';` 写死
- 筛选逻辑用 `a.organizer === 'p3'` 等硬编码 ID

**改造方案**：

```javascript
// ws-organizer-entry.js 顶部
import { AuthStore } from '../services/auth.js';

const currentUser = AuthStore.getCurrentUser();
const currentUserId = currentUser?.personId || '';

// 删除：const HANDOVER_ORGANIZER_ID = 'p3';
// 改为：const HANDOVER_ORGANIZER_ID = currentUserId;
```

筛选逻辑改造：

```javascript
// 旧: a.organizer === 'p3' || (typeof a.organizer === 'string' && a.organizer.includes('p3'))
// 新: 用 AuthStore._getProjectRole(currentUserId, a.id) === 'organizer' 判定

// 由于 _getProjectRole 是 module-private，需通过 AuthStore.getProjectRole() 暴露：
const organizerActivities = activities.filter(a =>
  AuthStore.getProjectRole(currentUserId, a.id) === 'organizer'
);
```

**`_getProjectRole` 已存在但未在 AuthStore 对外暴露**：当前 [auth.js:260](file:///d:/GitHub/GSM1921-SOP/docs/src/services/auth.js#L260) `getProjectRole(personId, projectId)` 已是 AuthStore 上的公共方法，直接调用即可。

**空数据友好提示**：

```javascript
// 当 organizerActivities.length === 0
return `
  <div class="card rounded-xl p-8 text-center">
    <p class="text-sm text-gray-500 mb-2">您当前没有作为组织者的活动或专班</p>
    <p class="text-xs text-gray-400">请联系党小组组长或支委赋权</p>
  </div>
`;
```

**deep.html 同理改造**：删除 `DEEP_PERSON_ID`，用 `currentUserId` 替代；经验沉淀筛选改为 `d.submitterId === currentUserId`。

### 3.5 dev 层 — `bootstrap.js` + `login-entry.js` 兼容性扩展

#### 3.5.1 `bootstrap.js`

```javascript
// DEV_ROLE_WHITELIST 加入 organizer / deep
const DEV_ROLE_WHITELIST = new Set([
  'secretary', 'deputy-secretary',
  'org-commissioner', 'prop-commissioner', 'disc-commissioner',
  'leader', 'participant',
  'organizer', 'deep',  // 新增
]);

// devLogin 特殊处理：organizer/deep 不是 standing role
// 需找到第一个持有该 project role 的 mock 用户，以其 standing role 登录，
// 然后跳转到对应 workspace 页面
export function bootstrapPage({ module, accentRole, accentAlpha }) {
  const user = AuthStore.getCurrentUser();
  if (!user) {
    const devRole = CrossPageState.getParam('dev');
    const isLocalHost = DEV_HOSTNAME_WHITELIST.has(window.location.hostname);
    if (devRole && isLocalHost && DEV_ROLE_WHITELIST.has(devRole)) {
      if (devRole === 'organizer' || devRole === 'deep') {
        _devLoginProjectRole(devRole);
        return { user: null };
      }
      AuthStore.devLogin(devRole);
      window.location.reload();
      return { user: null };
    }
    // ... 原有跳转逻辑
  }
  // ...
}

function _devLoginProjectRole(role) {
  // 在 mock 数据中找到第一个持有该 project role 的用户
  let standingPerson = null;
  for (const a of ACTIVITIES) {
    if (Array.isArray(a.assignments)) {
      const rec = a.assignments.find(r => r.role === role);
      if (rec) {
        standingPerson = getPersonById(rec.personId);
        break;
      }
    }
  }
  if (!standingPerson) {
    for (const t of MOCK_TASKFORCES) {
      if (Array.isArray(t.members)) {
        const m = t.members.find(x => x.role === role);
        if (m) {
          standingPerson = getPersonById(m.personId);
          break;
        }
      }
    }
  }

  // 用其 standing role 登录，跳转到对应 project role 页面
  if (standingPerson) {
    AuthStore.login(standingPerson.id);
    const targetPage = role === 'organizer' ? 'workspace/organizer.html' : 'workspace/deep.html';
    window.location.href = getBasePath() + targetPage;
  } else {
    // 降级：participant
    AuthStore.devLogin('participant');
    window.location.href = getBasePath() + 'workspace/visitor.html';
  }
}
```

#### 3.5.2 `login-entry.js`

```javascript
// DEV_CARDS 追加两张
const DEV_CARDS = [
  { role: 'secretary',         label: '党支部书记',   desc: '组织统筹决策' },
  { role: 'deputy-secretary',  label: '党支部副书记', desc: '协助书记工作' },
  { role: 'org-commissioner',  label: '组织委员',     desc: '发展党员' },
  { role: 'prop-commissioner', label: '宣传委员',     desc: '宣传档案' },
  { role: 'disc-commissioner', label: '纪检委员',     desc: '考勤考察' },
  { role: 'leader',            label: '党小组组长',   desc: '活动统筹' },
  { role: 'participant',       label: '普通参与者',   desc: '查看信息' },
  { role: 'organizer',         label: '组织者',       desc: '任务分配·复盘提交' },  // 新增
  { role: 'deep',              label: '深度参与者',   desc: '任务状态更新·经验沉淀' },  // 新增
];

// 卡片点击事件特殊处理
container.querySelectorAll('[data-role]').forEach(card => {
  card.addEventListener('click', () => {
    const role = card.dataset.role;
    if (role === 'organizer' || role === 'deep') {
      // 项目角色：用 URL 参数让 bootstrapPage 处理
      window.location.href = `./workspace/${role === 'organizer' ? 'organizer.html' : 'deep.html'}?dev=${role}`;
    } else {
      AuthStore.devLogin(role);
      window.location.href = './index.html';
    }
  });
});
```

---

## 四、Error Handling

| 场景 | 处理 |
|------|------|
| 被赋权者尚未登录时通知不发 | NoticeStore 是 localStorage 实现，登录后才能看到（沿用现有机制）。赋权时通知已写入存储，下次登录即可见 |
| 直接访问 organizer.html 但无 organizer 赋权记录 | 显示空列表 + 提示"您当前没有作为组织者的活动或专班，请联系党小组组长或支委赋权" |
| dev mode 下 `?dev=organizer` 找不到 mock 用户 | 降级到 participant，跳到 visitor.html，console.warn 提示 |
| 用户同时有 leader + organizer 角色 | sidebar 显示子菜单 [党小组组长工作台, 组织者工作台] |
| 只有 participant 角色的用户 | sidebar 显示单链接"党建工作台"跳到 visitor.html（沿用现有行为） |
| NoticeStore 不接受 `targetUrl` 字段 | §六 "一改具改清单" 中检查现有通知跳转字段命名 |

---

## 五、Testing

### 5.1 单元测试

- `AuthStore.getUserProjectRoles(personId)` 返回正确的角色集合
- `AuthStore.hasProjectRole(personId, role)` 判定正确
- `AuthStore.getAccessibleWorkspacePages(personId)` 返回 standing + project 页面列表
- `AuthStore.authorize()` 完成后 NoticeStore 有新通知

### 5.2 集成测试

- 赋权流程：secretary 调用 authorize 赋权某 participant 为 organizer → 该 participant 登录 → sidebar 显示子菜单 → 进入 organizer.html → 看到正确数据

### 5.3 E2E 测试（dogfood QA）

1. **多角色子菜单**：用户同时有 leader + organizer 角色时，sidebar 显示子菜单 [党小组组长工作台, 组织者工作台]，可切换
2. **单角色直接跳转**：只有 participant 角色的用户，sidebar 单链接"党建工作台"跳到 visitor.html
3. **通知跳转**：secretary 赋权某 participant 为 organizer → 该 participant 登录 → 看到通知 → 点击通知跳转到 organizer.html
4. **dev 模式登录**：login 页选择"组织者"卡片 → 跳转到 organizer.html 且显示正确数据
5. **空数据提示**：无 organizer 赋权记录时直接访问 organizer.html → 显示友好提示

---

## 六、一改具改清单（强制）

> 书记 2026-07-18 强调："如果涉及到数据的设计、交互的设计等等一定要一改具改！！"

### 6.1 数据设计变更

| 变更点 | 涉及文件 | 同步要求 |
|--------|---------|---------|
| AuthStore 新增 `getUserProjectRoles` / `hasProjectRole` / `getAccessibleWorkspacePages` API | [auth.js](file:///d:/GitHub/GSM1921-SOP/docs/src/services/auth.js) | 全仓库搜索是否有其他地方在重复实现"判断用户项目角色"逻辑，统一改用新 API |
| `authorize()` 联动 NoticeStore | [auth.js](file:///d:/GitHub/GSM1921-SOP/docs/src/services/auth.js), [notice.js](file:///d:/GitHub/GSM1921-SOP/docs/src/services/notice.js) | 全仓库搜索是否有其他 `authorize()` 调用方，确保通知逻辑不重复（如已有外部联动，归一） |
| NoticeStore 通知字段命名 | [notice.js](file:///d:/GitHub/GSM1921-SOP/docs/src/services/notice.js) | 检查现有通知跳转字段是 `targetUrl` 还是 `url` 还是 `link`，归一为单一字段名 |
| `ws-organizer-entry.js` / `ws-deep-entry.js` 删除写死 personId | 两个 entry 文件 | 全仓库搜索是否还有其他地方写死 `p3`/`p5`/`HANDOVER_ORGANIZER_ID`/`DEEP_PERSON_ID` |

### 6.2 交互设计变更

| 变更点 | 涉及文件 | 同步要求 |
|--------|---------|---------|
| sidebar 子菜单模式 | [sidebar.js](file:///d:/GitHub/GSM1921-SOP/docs/src/components/sidebar.js) | 全仓库搜索是否有其他模块复用"主按钮+下拉面板"模式（如 header view-switcher），统一抽出 `_bindDropdownPanel(btn, panel, onSelect)` 工具函数到 `core/utils.js` |
| ESC / 外部点击关闭 | sidebar.js, header.js | 模式一致：ESC 关闭、外部点击关闭、选中态视觉一致 |
| sidebar 链接渲染逻辑（单角色直接跳转 vs 多角色子菜单） | sidebar.js | 如有其他模块（如 party 模块）也根据 ROLE_PAGE_MAP 渲染链接，统一逻辑 |

### 6.3 dev 层变更

| 变更点 | 涉及文件 | 同步要求 |
|--------|---------|---------|
| `DEV_ROLE_WHITELIST` 加入 organizer / deep | [bootstrap.js](file:///d:/GitHub/GSM1921-SOP/docs/src/core/bootstrap.js) | 全仓库搜索 `DEV_ROLE_WHITELIST` 引用 |
| `DEV_CARDS` 追加 organizer / deep | [login-entry.js](file:///d:/GitHub/GSM1921-SOP/docs/src/entries/login-entry.js) | 检查 DEV_CARDS 是否有其他消费方（如 ROLE_LABELS），同步追加 |

---

## 七、附加强制项 B：角色颜色一致性归一

> 书记 2026-07-18 强调："请检查所有的角色的颜色是在该一致的地方一致！！"

### 7.1 权威源确认

仓库内有三套角色颜色定义，必须归一为**单一权威源**：

| 来源 | 文件 | 状态 |
|------|------|------|
| **权威源 A** | [constants.js `ACCENT_COLORS`](file:///d:/GitHub/GSM1921-SOP/docs/src/core/constants.js#L169-L181) | ✅ 推荐（JS 端权威源） |
| **权威源 B** | [styles.css `--accent-*` CSS 变量](file:///d:/GitHub/GSM1921-SOP/docs/src/styles.css#L36-L44) | ✅ 与 A 一致（CSS 端权威源） |
| ❌ 旧版 | constants.js `ROLE_COLORS`（L10-L22） | 部分值与 A 不一致（见下表） |
| ❌ 硬编码 | 各 entry 文件 `accentColor: '#XXXXXX'` | 与 A 一致但未走 `getAccentColors()` |
| ❌ 严重不一致 | [party-cross-nav.js `PARTY_PAGES.accent`](file:///d:/GitHub/GSM1921-SOP/docs/src/components/party-cross-nav.js#L11-L17) | 与 A 严重不一致 |

### 7.2 权威源（ACCENT_COLORS）的最终颜色

| 角色 | hex | 含义 |
|------|-----|------|
| secretary | `#B91C1C` | 党建红 |
| deputy-secretary | `#B91C1C` | 党建红（同书记） |
| leader | `#22C55E` | 翠绿 |
| org-commissioner | `#0EA5E9` | 天蓝 |
| prop-commissioner | `#2563EB` | 海蓝 |
| disc-commissioner | `#C2410C` | 深橙 |
| commissioner | `#C2410C` | 同纪检 |
| organizer | `#7DD3FC` | 亮天蓝 |
| deep | `#94a3b8` | 浅灰蓝 |
| participant | `#6B7280` | 灰色 |
| all | `#0E7490` | 深青 |

### 7.3 不一致点清单

#### 7.3.1 `ROLE_COLORS`（constants.js L10-L22）与 `ACCENT_COLORS` 不一致

| 角色 | ROLE_COLORS.text | ACCENT_COLORS.hex | 处置 |
|------|------------------|-------------------|------|
| leader | `#15803D` | `#22C55E` | 归一为 `#22C55E` |
| commissioner | `#713f12` | `#C2410C` | 归一为 `#C2410C` |
| org-commissioner | `#0284C7` | `#0EA5E9` | 归一为 `#0EA5E9` |
| organizer | `#0369A1` | `#7DD3FC` | 归一为 `#7DD3FC` |
| deep | `#475569` | `#94a3b8` | 归一为 `#94a3b8` |
| participant | `#374151` | `#6B7280` | 归一为 `#6B7280` |

**处置方案**：删除 `ROLE_COLORS` 对象（如果仍被引用则改用 `getAccentColors(role)` 派生），或重写 `ROLE_COLORS` 使其与 `ACCENT_COLORS` 完全一致。优先删除以避免双源。

#### 7.3.2 `party-cross-nav.js` 中的硬编码 `PARTY_PAGES.accent`

当前：
```javascript
const PARTY_PAGES = {
  'secretary':         { ..., accent: '#B91C1C' },  // ✅ 一致
  'deputy-secretary':  { ..., accent: '#B91C1C' },  // ✅ 一致
  'org-commissioner':  { ..., accent: '#1D4ED8' },  // ❌ ACCENT_COLORS 是 #0EA5E9
  'prop-commissioner': { ..., accent: '#0E7490' },  // ❌ ACCENT_COLORS 是 #2563EB
  'disc-commissioner': { ..., accent: '#047857' },  // ❌ ACCENT_COLORS 是 #C2410C
};
```

**处置方案**：删除 `accent` 字段，改用 `getAccentColors(role).accent`：
```javascript
import { getAccentColors } from '../core/constants.js';

const PARTY_PAGES = {
  'secretary':         { page: 'secretary.html', label: '党支书' },
  'deputy-secretary':  { page: 'secretary.html', label: '副书记' },
  'org-commissioner':  { page: 'org.html',       label: '组织委员' },
  'prop-commissioner': { page: 'prop.html',      label: '宣传委员' },
  'disc-commissioner': { page: 'disc.html',      label: '纪检委员' },
};

// 渲染时取色：
const accent = getAccentColors(role).accent;
```

#### 7.3.3 各 entry 文件中的硬编码 `accentColor: '#XXXXXX'`

| 文件 | 当前值 | ACCENT_COLORS 期望值 | 一致性 |
|------|--------|----------------------|--------|
| ws-secretary-entry.js (L152, L712) | `#B91C1C` | `#B91C1C` | ✅ |
| ws-visitor-entry.js (L214) | `#CE1126` | 这是 `--party-red`（党建红 L0 Party 层级），不是角色色。需检查是否应该用 `getAccentColors('participant')` 还是确实需要党建红 | 待 grill 书记确认 |
| ws-organizer-entry.js (L34) | `#7DD3FC` | `#7DD3FC` | ✅ |
| ws-org-commissioner-entry.js (L34) | `#0EA5E9` | `#0EA5E9` | ✅ |
| ws-leader-entry.js (L34) | `#22C55E` | `#22C55E` | ✅ |
| ws-disc-commissioner-entry.js (L34) | `#C2410C` | `#C2410C` | ✅ |
| ws-prop-commissioner-entry.js (L34) | `#2563EB` | `#2563EB` | ✅ |
| ws-deep-entry.js (L34) | `#94a3b8` | `#94a3b8` | ✅ |
| ws-participant-entry.js (L34) | `#6B7280` | `#6B7280` | ✅ |

**处置方案**：即使值一致，也应统一改用 `getAccentColors(role).accent`，避免硬编码。这是"一改具改"的预防性工作。

#### 7.3.4 modules/party.js 中的硬编码 accentColor

| 行号 | 当前值 | 角色 | ACCENT_COLORS 期望值 | 一致性 |
|------|--------|------|---------------------|--------|
| L272 | `#D97706` | (prop-commissioner?) | `#2563EB` | ❌ |
| L521 | `#0E7490` | prop-commissioner | `#2563EB` | ❌ |
| L554 | `#1D4ED8` | org-commissioner | `#0EA5E9` | ❌ |
| L604 | `#0E7490` | prop-commissioner | `#2563EB` | ❌ |
| L1213 | `#B91C1C` | secretary | `#B91C1C` | ✅ |

**处置方案**：必须先验证每处使用对应的角色，再统一改用 `getAccentColors(role).accent`。注意：party.js 是党务管理模块，可能使用了与党建工作台不同的"党内职务语义色"，需先确认设计意图。

⚠️ **重要判断点**：modules/party.js 中的颜色是否真的"应该"与 ACCENT_COLORS 一致？还是 party 模块有意使用不同的"党内职务语义色"？
- 如果是有意区分（party 与 workspace 是不同模块）→ 不应改动，但需要在 CSS 变量中定义 `--party-org-commissioner` 等
- 如果应该一致 → 按 §7.3.4 处置方案归一

**需要在实施阶段 grill 书记确认此点**，不能擅自决定。

---

## 八、不做的事

- 不改 `ROLE_PAGE_MAP`（保持 standing role → 页面映射，project role 走新 API `getAccessibleWorkspacePages`）
- 不改 `VIEWABLE_ROLES`（保持"上级查看下级"语义，不在 header 视角下拉给被赋权者本人加 organizer/deep）
- 不改 `AuthStore.canDo()` 权限判定逻辑
- 不改 login 标准流程（仅 dev 模式扩展）
- 不删除 `ROLE_COLORS` 对象（除非确认无引用，否则保留并归一）

---

## 九、Spec Self-Review

### 9.1 Placeholder scan
- ✅ 无 TBD/TODO
- ⚠️ §7.3.4 中 modules/party.js 颜色"是否应与 ACCENT_COLORS 一致" 待 grill 书记确认——这是设计性判断点，不是 placeholder

### 9.2 Internal consistency
- ✅ §3.1 新增的 `getAccessibleWorkspacePages` API 与 §2.2 数据流一致
- ✅ §3.5.1 `devLogin` 对 organizer/deep 的特殊处理与 §4 Error Handling 一致
- ✅ §六 一改具改清单覆盖了 §3 所有改动

### 9.3 Scope check
- ✅ 主体（organizer/deep 可达性）聚焦单一实施目标
- ⚠️ 附加强制项 B（颜色一致性）涉及多文件改动，规模较大。建议作为同一 plan 中的独立 phase，但与主体共享 spec

### 9.4 Ambiguity check
- ✅ "单角色直接跳转 / 多角色子菜单" 已明确（§1.2 决策 4）
- ✅ "全局聚合" 已明确不带 projectId（§1.2 决策 3）
- ⚠️ "NoticeStore 字段命名" 需要在实施阶段检查现有字段——已在 §6.1 列出
- ⚠️ "modules/party.js 颜色是否应一致" 需要在实施阶段 grill 书记——已在 §7.3.4 标注

---

## 十、实施顺序建议（writing-plans 阶段细化）

1. **Phase 1 — 数据层**：AuthStore 新增 3 个 API + authorize 联动 NoticeStore
2. **Phase 2 — 页面层**：ws-organizer-entry.js / ws-deep-entry.js 动态化
3. **Phase 3 — 导航层**：sidebar.js 子菜单改造
4. **Phase 4 — dev 层**：bootstrap.js + login-entry.js 扩展
5. **Phase 5 — 颜色一致性归一（附加强制项 B）**：
   - 5.1 删除/归一 `ROLE_COLORS`
   - 5.2 party-cross-nav.js 改用 `getAccentColors(role)`
   - 5.3 各 entry 文件改用 `getAccentColors(role)`
   - 5.4 grill 书记确认 modules/party.js 颜色处置
6. **Phase 6 — 一改具改校验**：全仓库 Grep 验证零残留
7. **Phase 7 — dogfood QA**：§5.3 E2E 测试
8. **Phase 8 — verification-before-completion**：所有改动验证后才能宣称完成
