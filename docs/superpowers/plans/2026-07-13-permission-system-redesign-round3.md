# 权限系统大改·第 3 轮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成权限系统大改第 3 轮（UI 改造+真实场景迭代），让权限系统在 UI 层完整可用：修复稳定性痛点 + 扩展人员管理 + 重做视角切换 + 视觉迭代。

**Architecture:** 4 阶段串行实施，每阶段独立提交独立验收。共享数据层作为单一来源，UI 组件订阅数据变化。引入 `getEffectiveRole()` 统一解决"视角切换后 sidebar 错乱"问题，跳转逻辑引入 ROUTE_LOCK 防护避免循环，阶段 4 调用 frontend-design skill。

**Tech Stack:** Vanilla JS (ES Module) + Tailwind CSS + localStorage/sessionStorage + AuthStore + subagent-driven-development

---

## 文件结构概览

**修改的文件（按阶段分组）**：

**阶段 1（稳定性修复）**：
- `docs/src/services/auth.js` — 新增 `getEffectiveRole()` 方法
- `docs/src/components/sidebar.js` — 用 `getEffectiveRole()` 替代 `user.role`；订阅 `view-role-change` 事件
- `docs/src/entries/ws-secretary-entry.js` — 修复 `getAuthState()` → `getAuthorizations()`，5 参数 `authorize` → 4 参数
- `docs/src/entries/ws-leader-entry.js` — 移除 `defaultRole/viewMode` 参数
- `docs/src/entries/ws-deep-entry.js` — 同上
- `docs/src/entries/ws-organizer-entry.js` — 同上
- `docs/src/entries/ws-org-commissioner-entry.js` — 修复 `getAuthState()` + 移除旧参数
- `docs/src/entries/ws-prop-commissioner-entry.js` — 移除旧参数
- `docs/src/entries/ws-disc-commissioner-entry.js` — 移除旧参数
- `docs/src/entries/ws-visitor-entry.js` — 移除旧参数
- `docs/src/entries/party-secretary-entry.js` — 移除旧参数
- `docs/src/entries/party-org-entry.js` — 移除旧参数
- `docs/src/entries/party-prop-entry.js` — 移除旧参数
- `docs/src/entries/party-disc-entry.js` — 移除旧参数
- `docs/src/entries/workspace-entry.js` — 加入 ROUTE_LOCK 防护
- `docs/src/entries/party-entry.js` — 加入 ROUTE_LOCK 防护

**阶段 2（人员管理扩展）**：
- `docs/src/services/auth.js` — `_getProjectRole()` 优先读 auth records
- `docs/src/entries/members-entry.js` — 新增项目角色赋权面板
- `docs/members.html` — 调整页面结构

**阶段 3（视角切换重做）**：
- `docs/src/components/header.js` — 切换视角派发 `view-role-change` 事件，不 reload
- `docs/src/components/sidebar.js` — 订阅事件，re-render 链接
- `docs/src/core/cross-page-state.js` — 新建统一 URL params 模块
- 所有入口文件 — 统一通过 CrossPageState 读取 URL params

**阶段 4（视觉迭代）**：
- 调用 Skill: frontend-design
- 修改：`docs/login.html` + `docs/src/entries/login-entry.js` + `docs/src/styles.css` + 各 ws-*.html / party-*.html + 各 entry JS + 辅助页面

---

## Task 1: 阶段 1.1+1.2 — 修复入口文件 bootstrapPage + AuthStore 旧 API

**Files:**
- Modify: `docs/src/entries/ws-secretary-entry.js`
- Modify: `docs/src/entries/ws-leader-entry.js`
- Modify: `docs/src/entries/ws-deep-entry.js`
- Modify: `docs/src/entries/ws-organizer-entry.js`
- Modify: `docs/src/entries/ws-org-commissioner-entry.js`
- Modify: `docs/src/entries/ws-prop-commissioner-entry.js`
- Modify: `docs/src/entries/ws-disc-commissioner-entry.js`
- Modify: `docs/src/entries/ws-visitor-entry.js`
- Modify: `docs/src/entries/party-secretary-entry.js`
- Modify: `docs/src/entries/party-org-entry.js`
- Modify: `docs/src/entries/party-prop-entry.js`
- Modify: `docs/src/entries/party-disc-entry.js`

- [ ] **Step 1: 修改 ws-secretary-entry.js（3 处旧 API）**

打开 `docs/src/entries/ws-secretary-entry.js`。

**修改 1.1（第 17 行）**：bootstrapPage 调用

将：
```javascript
const { savedState } = bootstrapPage({ module: 'workspace', defaultRole: 'secretary', viewMode: 'manage' });
```

改为：
```javascript
bootstrapPage({ module: 'workspace' });
```

**修改 1.2（第 761-766 行）**：authorize 5 参数 → 4 参数

找到 `handleConfirmAuth` 函数中的：
```javascript
  const result = AuthStore.authorize(
    authPanel.selectedUserId,
    authPanel.role,
    authPanel.scope,
    authPanel.scopeRef,
  );
```

改为：
```javascript
  const result = AuthStore.authorize(
    AuthStore.getCurrentUser()?.userId,
    authPanel.selectedUserId,
    authPanel.role,
    { projectId: authPanel.scopeRef },
  );
```

**修改 1.3（第 797 行）**：getAuthState → getAuthorizations

找到 `renderAuthRecords` 函数中的：
```javascript
  const records = AuthStore.getAuthState();
```

改为：
```javascript
  const records = AuthStore.getAuthorizations();
```

**修改 1.4（再次搜索）**：用 Grep 全文搜索 `getAuthState` 确认零残留。

- [ ] **Step 2: 修改 ws-leader-entry.js**

打开 `docs/src/entries/ws-leader-entry.js`。

找到第 16 行：
```javascript
const { savedState, accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', defaultRole: 'leader', viewMode: 'manage', accentRole: 'leader' });
```

改为：
```javascript
const { accent, accentRgba, accentBorder } = bootstrapPage({ module: 'workspace', accentRole: 'leader' });
```

- [ ] **Step 3: 修改 ws-deep/ws-organizer/ws-prop-commissioner/ws-disc-commissioner/ws-visitor-entry.js**

对每个文件执行：找到 `bootstrapPage({ module: 'workspace', defaultRole: ..., viewMode: ..., accentRole: ... })` 调用，移除 `defaultRole` 和 `viewMode`，保留 `module` 和 `accentRole`。

对 ws-deep-entry.js（无 accentRole）：
找到类似 `const { ... } = bootstrapPage({ module: 'workspace', defaultRole: 'deep', viewMode: 'manage' });` 改为 `bootstrapPage({ module: 'workspace' });`

对 ws-organizer-entry.js（无 accentRole）：
同理移除 `defaultRole` 和 `viewMode`。

对 ws-prop-commissioner-entry.js（有 accentRole）：
移除 `defaultRole` 和 `viewMode`，保留 `accentRole`。

对 ws-disc-commissioner-entry.js（有 accentRole）：
同上。

对 ws-visitor-entry.js（无 accentRole）：
移除 `defaultRole` 和 `viewMode`。

- [ ] **Step 4: 修改 ws-org-commissioner-entry.js（含 getAuthState 修复）**

打开 `docs/src/entries/ws-org-commissioner-entry.js`。

**修改 4.1**：bootstrapPage 调用，移除 `defaultRole` 和 `viewMode`，保留 `accentRole: 'org-commissioner'`。

**修改 4.2**：全文搜索 `getAuthState`，全部替换为 `getAuthorizations`。

- [ ] **Step 5: 修改 party-secretary/party-org/party-prop/party-disc-entry.js**

对每个文件执行：找到 `bootstrapPage({ module: 'party', defaultRole: ..., viewMode: ..., accentRole: ... })`，移除 `defaultRole` 和 `viewMode`，保留 `module: 'party'` 和 `accentRole`。

对 party-secretary-entry.js：移除 `defaultRole: 'secretary'` 和 `viewMode`。
对 party-org-entry.js：移除 `defaultRole: 'org-commissioner'` 和 `viewMode`。
对 party-prop-entry.js：移除 `defaultRole: 'prop-commissioner'` 和 `viewMode`。
对 party-disc-entry.js：移除 `defaultRole: 'disc-commissioner'` 和 `viewMode`。

- [ ] **Step 6: 全仓库验证零残留**

Run: `grep -rn "getAuthState\|defaultRole\|viewMode" docs/src/`
Expected: 输出为空（或仅匹配注释中明确标注的"已废弃"字样）

Run: `GetDiagnostics` 对所有修改文件
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add docs/src/entries/ws-*.js docs/src/entries/party-*.js
git commit -m "fix(entries): 修复 12 个入口文件 bootstrapPage + AuthStore 旧 API 调用

- 移除 defaultRole/viewMode 参数（被静默忽略）
- getAuthState() → getAuthorizations()
- authorize 5参数 → 4参数 {projectId}
- 移除 savedState 解构

T-2026-07-006 第3轮 阶段1 Task1"
```

---

## Task 2: 阶段 1.3 — auth.js 新增 getEffectiveRole + sidebar.js 同步 viewRole

**Files:**
- Modify: `docs/src/services/auth.js`
- Modify: `docs/src/components/sidebar.js`

- [ ] **Step 1: auth.js 新增 getEffectiveRole 方法**

打开 `docs/src/services/auth.js`。

在 AuthStore 对象中（在 `getUserRole` 方法之后）新增：

```javascript
  /**
   * 获取用户的有效角色（只读视角优先，回退常设角色）
   * 用途：sidebar/header 等组件根据有效角色决定跳转目标
   * @param {string} userId
   * @returns {string} 角色 ID
   */
  getEffectiveRole(userId) {
    const viewRole = this.getViewRole();
    return viewRole || this.getUserRole(userId);
  },
```

插入位置：在 `getUserRole(userId)` 方法后、`getProjectRole(userId, projectId)` 方法前。

- [ ] **Step 2: sidebar.js 用 getEffectiveRole 替代 user.role**

打开 `docs/src/components/sidebar.js`。

找到 `renderSidebar` 函数中的：
```javascript
  const user = AuthStore.getCurrentUser();
  const role = user?.role || '';
```

改为：
```javascript
  const user = AuthStore.getCurrentUser();
  const role = user ? AuthStore.getEffectiveRole(user.userId) : '';
```

- [ ] **Step 3: 验证 sidebar 链接随 viewRole 同步**

启动本地 HTTP server：
```bash
cd d:\GitHub\GSM1921-SOP\docs && python -m http.server 8765
```

浏览器打开 `http://localhost:8765/login.html`，登录书记，切换到 secretary.html。

在 console 执行：
```javascript
AuthStore.switchView('leader');
location.reload();
```

Expected: 重新加载后 sidebar 的"党建工作台"链接指向 `workspace/leader.html`（而非 secretary.html）。

Run: `GetDiagnostics` 对 `docs/src/services/auth.js` 和 `docs/src/components/sidebar.js`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add docs/src/services/auth.js docs/src/components/sidebar.js
git commit -m "feat(auth): 新增 getEffectiveRole() + sidebar 同步只读视角

- AuthStore 新增 getEffectiveRole(userId)：viewRole 优先，回退常设角色
- sidebar.js 用 getEffectiveRole 替代 user.role
- 解决切换视角后 sidebar 链接错乱问题

T-2026-07-006 第3轮 阶段1 Task2"
```

---

## Task 3: 阶段 1.4 — 跳转循环防护

**Files:**
- Modify: `docs/src/entries/workspace-entry.js`
- Modify: `docs/src/entries/party-entry.js`

- [ ] **Step 1: 读取 workspace-entry.js 当前实现**

打开 `docs/src/entries/workspace-entry.js`，找到 `bootstrapPage` 后的角色跳转逻辑。

- [ ] **Step 2: 加入 ROUTE_LOCK 防护**

在 `workspace-entry.js` 的跳转逻辑前后加入：

```javascript
// 跳转防护：500ms 内不重复跳转
const ROUTE_LOCK_KEY = 'gsm1921-route-lock';
const ROUTE_LOCK_TTL = 500;

function _acquireRouteLock(targetRole) {
  const now = Date.now();
  const raw = sessionStorage.getItem(ROUTE_LOCK_KEY);
  if (raw) {
    try {
      const lock = JSON.parse(raw);
      if (lock.targetRole === targetRole && (now - lock.timestamp) < ROUTE_LOCK_TTL) {
        return false;  // 锁未过期，不跳转
      }
    } catch {}
  }
  sessionStorage.setItem(ROUTE_LOCK_KEY, JSON.stringify({
    targetRole,
    timestamp: now,
  }));
  return true;
}
```

在调用 `window.location.href = ...` 跳转前调用 `_acquireRouteLock(targetRole)`，返回 false 则跳过跳转。

- [ ] **Step 3: party-entry.js 同样加入防护**

打开 `docs/src/entries/party-entry.js`，加入相同的 `_acquireRouteLock` 函数和调用。

- [ ] **Step 4: 验证**

浏览器测试：在 secretary.html 快速连续点击 sidebar"党建工作台"5 次。
Expected: 只跳转一次，不出现循环或反复跳转。

Run: `GetDiagnostics` 对修改文件
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add docs/src/entries/workspace-entry.js docs/src/entries/party-entry.js
git commit -m "fix(entries): 跳转循环防护 ROUTE_LOCK

- 500ms 内同角色不重复跳转
- 防止快速点击导致反复跳转

T-2026-07-006 第3轮 阶段1 Task3"
```

---

## Task 4: 阶段 1.5 — 验证帮助/关于/退出链接

**Files:**
- Verify: 所有 HTML 文件（`docs/*.html` + `docs/workspace/*.html` + `docs/party/*.html`）

- [ ] **Step 1: 全仓库扫描 `<base>` 标签**

Run: `grep -rn "<base" docs/*.html docs/workspace/*.html docs/party/*.html`
Expected: 所有子目录 HTML 都有 `<base href="../">`；根目录 HTML 不需要

- [ ] **Step 2: 验证 sidebar footer 链接拼接**

打开 `docs/src/components/sidebar.js`，检查 footer 中：
- `getBasePath() + 'help.html'`
- `getBasePath() + 'about.html'`
- `getBasePath() + 'login.html'`（退出登录跳转）

确认 `getBasePath()` 在根目录返回 `'./'`，在子目录返回 `'../'`。

打开 `docs/src/core/utils.js`，验证 `getBasePath()` 实现。

- [ ] **Step 3: 浏览器测试**

启动 HTTP server，登录后访问：
- `http://localhost:8765/workspace/secretary.html` → 点击 sidebar"帮助" → 跳转到 `http://localhost:8765/help.html`
- 同上 → 点击"关于" → 跳转到 `about.html`
- 同上 → 点击"退出登录" → 跳转到 `login.html`

预期：3 个链接在所有页面（根目录 + 子目录）均可用。

- [ ] **Step 4: 修复（如有问题）**

如果发现链接失效，根据具体情况修复：
- 缺 `<base>` 标签：在 HTML `<head>` 中加入 `<base href="../">`
- getBasePath() 逻辑错误：修复 utils.js

- [ ] **Step 5: Commit（如有修改）**

```bash
git add <修改的文件>
git commit -m "fix(html): 验证并修复帮助/关于/退出链接

T-2026-07-006 第3轮 阶段1 Task4"
```

若无修改则跳过此 commit。

---

## Task 5: 阶段 2.2 — _getProjectRole 优先读 auth records

**Files:**
- Modify: `docs/src/services/auth.js`

- [ ] **Step 1: 修改 _getProjectRole 函数**

打开 `docs/src/services/auth.js`，找到 `_getProjectRole` 函数（约第 106-122 行）。

替换为：

```javascript
// ── 获取用户在项目中的项目角色 ──────────────────
function _getProjectRole(userId, projectId) {
  // 0. 优先查 auth records（运行时赋权记录）
  const records = _getAuthRecords();
  const authRec = records.find(r =>
    r.targetUserId === userId &&
    r.role && ['organizer', 'deep'].includes(r.role) &&
    r.scopeRef === projectId
  );
  if (authRec) return authRec.role;

  // 1. 再查活动 assignments（mock 数据）
  const activity = ACTIVITIES.find(a => a.id === projectId);
  if (activity && Array.isArray(activity.assignments)) {
    const rec = activity.assignments.find(a => a.personId === userId);
    if (rec) return rec.role;  // 'organizer' | 'deep'
  }

  // 2. 再查专班 members（mock 数据）
  const tf = MOCK_TASKFORCES.find(t => t.id === projectId);
  if (tf && Array.isArray(tf.members)) {
    const m = tf.members.find(m => m.personId === userId);
    if (m) return m.role;  // 'organizer' | 'deep' | 'participant'
  }

  return null;
}
```

- [ ] **Step 2: 浏览器验证**

启动 HTTP server，登录书记，进入 secretary.html 赋权管理面板：
1. 选择被赋权人 p5
2. 角色选 organizer
3. 范围选 activity
4. 关联活动选 act-001
5. 确认赋权

然后在 console 验证：
```javascript
// 通过源码静态核对：_getProjectRole('p5', 'act-001') 应返回 'organizer'
// 通过 canDo 验证：
// AuthStore.canDo('p5', 'assign_task', { projectId: 'act-001' }) 应返回 true
```

Expected: 赋权后 canDo 返回 true（因 p5 是 participant 但 organizer 项目角色有 assign_task 权限）。

Run: `GetDiagnostics` 对 `docs/src/services/auth.js`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add docs/src/services/auth.js
git commit -m "fix(auth): _getProjectRole 优先读 auth records

修复 Final reviewer 问题 2：authorize 后的赋权对 canDo 不生效问题。
现在 _getProjectRole 优先查运行时 auth records，再回退 mock 数据。

T-2026-07-006 第3轮 阶段2 Task5"
```

---

## Task 6: 阶段 2.3 — 人员管理页新增项目角色赋权面板

**Files:**
- Modify: `docs/members.html`
- Modify: `docs/src/entries/members-entry.js`

- [ ] **Step 1: 读取当前 members-entry.js**

打开 `docs/src/entries/members-entry.js`，了解现有"设为/取消组长"按钮的实现。

- [ ] **Step 2: 在人员详情区新增"项目角色赋权"区块**

在 `members-entry.js` 的"常设角色赋权"区块之后，新增"项目角色赋权"区块：

```javascript
// 项目角色赋权区块
function _renderProjectRoleAssignment(personId) {
  const currentUser = AuthStore.getCurrentUser();
  const authorizerRole = currentUser ? AuthStore.getUserRole(currentUser.userId) : '';

  // 获取可赋权角色（根据 AUTHORIZE_CHAIN）
  // 由于 AUTHORIZE_CHAIN 不导出，通过尝试 authorize 判断
  const projectRoles = ['organizer', 'deep'];

  const activities = ACTIVITIES;
  const taskforces = MOCK_TASKFORCES;

  let html = `
    <div class="border-t border-gray-200 mt-4 pt-4">
      <h4 class="font-title-cn text-sm font-semibold text-gray-700 mb-3">项目角色赋权</h4>
      <div class="text-xs text-gray-500 mb-3">为该同志赋权项目角色（组织者/深度参与者），赋权后该同志在对应活动/专班中拥有相应权限。</div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择项目类型</label>
        <select id="project-type-select" class="input-flat text-xs w-full">
          <option value="activity">活动</option>
          <option value="taskforce">专班</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择项目</label>
        <select id="project-id-select" class="input-flat text-xs w-full">
          ${activities.map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('')}
        </select>
      </div>

      <div class="mb-3">
        <label class="text-xs text-gray-500 mb-1 block">选择角色</label>
        <div class="flex gap-3">
          ${projectRoles.map(r => `
            <label class="flex items-center gap-2 text-sm">
              <input type="radio" name="project-role" value="${r}" class="project-role-radio">
              <span>${ROLE_LABELS[r] || r}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <button id="confirm-project-auth-btn" class="text-sm px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors">
        确认赋权
      </button>

      <div class="mt-4">
        <h5 class="text-xs font-medium text-gray-600 mb-2">已赋权记录</h5>
        <div id="project-auth-records-list"></div>
      </div>
    </div>
  `;
  return html;
}

// 绑定项目类型切换
function _bindProjectTypeSwitch() {
  const typeSelect = document.getElementById('project-type-select');
  const idSelect = document.getElementById('project-id-select');
  if (!typeSelect || !idSelect) return;

  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    if (type === 'activity') {
      idSelect.innerHTML = ACTIVITIES.map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('');
    } else {
      idSelect.innerHTML = MOCK_TASKFORCES.map(tf => `<option value="${tf.id}" data-type="taskforce">${tf.name}</option>`).join('');
    }
  });
}

// 绑定确认赋权
function _bindConfirmProjectAuth(personId) {
  const btn = document.getElementById('confirm-project-auth-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const projectId = document.getElementById('project-id-select')?.value;
    const role = document.querySelector('input[name="project-role"]:checked')?.value;
    const currentUser = AuthStore.getCurrentUser();

    if (!projectId || !role || !currentUser) {
      showToast('error', '请选择项目和角色');
      return;
    }

    const result = AuthStore.authorize(
      currentUser.userId,
      personId,
      role,
      { projectId }
    );

    if (result.ok) {
      showToast('success', '项目角色赋权成功');
      _renderProjectAuthRecords(personId);
    } else if (result.id) {
      showToast('warn', '该同志在此项目已有相同角色赋权');
    } else {
      showToast('error', '赋权失败，您可能无权赋权该角色');
    }
  });
}

// 渲染项目角色赋权记录
function _renderProjectAuthRecords(personId) {
  const listEl = document.getElementById('project-auth-records-list');
  if (!listEl) return;

  const records = AuthStore.getAuthorizations().filter(r =>
    r.targetUserId === personId &&
    ['organizer', 'deep'].includes(r.role) &&
    r.scopeRef
  );

  if (records.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400">暂无项目角色赋权记录</p>';
    return;
  }

  listEl.innerHTML = records.map(r => {
    const project = ACTIVITIES.find(a => a.id === r.scopeRef) || MOCK_TASKFORCES.find(t => t.id === r.scopeRef);
    const projectName = project ? (project.title || project.name) : r.scopeRef;
    const roleLabel = ROLE_LABELS[r.role] || r.role;
    return `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div>
          <span class="text-sm font-medium text-gray-700">${projectName}</span>
          <span class="text-xs text-gray-500 ml-2">${roleLabel}</span>
          <span class="text-xs text-gray-400 ml-2">${r.authorizedAt || ''}</span>
        </div>
        <button class="revoke-project-auth text-xs text-red-500 hover:text-red-700" data-record-id="${r.id}">撤销</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.revoke-project-auth').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      if (AuthStore.revokeAuthorization(recordId)) {
        showToast('success', '已撤销赋权');
        _renderProjectAuthRecords(personId);
      }
    });
  });
}
```

- [ ] **Step 3: 集成到现有人员详情渲染函数**

在 `members-entry.js` 中找到现有的人员详情渲染函数（显示"设为/取消组长"按钮的位置），在该函数末尾追加：

```javascript
// 项目角色赋权区块（仅支委可见）
const currentUser = AuthStore.getCurrentUser();
const authorizerRole = currentUser ? AuthStore.getUserRole(currentUser.userId) : '';
if (AuthStore.isCommissioner(authorizerRole)) {
  const detailContainer = document.getElementById('person-detail-extra');
  if (detailContainer) {
    detailContainer.innerHTML = _renderProjectRoleAssignment(personId);
    _bindProjectTypeSwitch();
    _bindConfirmProjectAuth(personId);
    _renderProjectAuthRecords(personId);
  }
}
```

- [ ] **Step 4: 在 members.html 新增容器**

打开 `docs/members.html`，在人员详情区域加入：

```html
<div id="person-detail-extra"></div>
```

位置：在"常设角色赋权"区块之后。

- [ ] **Step 5: 浏览器验证**

启动 HTTP server，登录书记，进入人员管理页：
1. 选择一个成员（如 p5）
2. 滚动到"项目角色赋权"区块
3. 选择项目类型：活动
4. 选择项目：act-001
5. 选择角色：organizer
6. 点击"确认赋权"
7. Expected: 显示"项目角色赋权成功"toast
8. "已赋权记录"区显示该记录
9. 点击"撤销" → 记录消失

Run: `GetDiagnostics` 对 `docs/src/entries/members-entry.js` 和 `docs/members.html`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add docs/members.html docs/src/entries/members-entry.js
git commit -m "feat(members): 新增项目角色赋权面板

- 人员管理页支持为成员赋权 organizer/deep 项目角色
- 选择项目（活动/专班）+ 角色 → 确认赋权
- 显示已赋权记录，支持撤销

T-2026-07-006 第3轮 阶段2 Task6"
```

---

## Task 7: 阶段 3.1+3.2 — viewSwitcher 事件驱动 + sidebar 订阅

**Files:**
- Modify: `docs/src/components/header.js`
- Modify: `docs/src/components/sidebar.js`

- [ ] **Step 1: header.js 改为派发事件**

打开 `docs/src/components/header.js`。

找到 `_bindViewSwitcher` 函数（约第 121-135 行）：

```javascript
function _bindViewSwitcher(header) {
  const switcher = header.querySelector('#view-switcher');
  if (!switcher) return;

  switcher.addEventListener('change', (e) => {
    const targetRole = e.target.value;
    if (targetRole) {
      AuthStore.switchView(targetRole);
    } else {
      AuthStore.clearView();
    }
    // 触发页面刷新以应用新视角
    window.location.reload();
  });
}
```

改为：

```javascript
function _bindViewSwitcher(header) {
  const switcher = header.querySelector('#view-switcher');
  if (!switcher) return;

  switcher.addEventListener('change', (e) => {
    const targetRole = e.target.value;
    const prevRole = AuthStore.getViewRole();
    if (targetRole) {
      AuthStore.switchView(targetRole);
    } else {
      AuthStore.clearView();
    }
    // 派发事件，sidebar 自身订阅并 re-render（不 reload）
    document.dispatchEvent(new CustomEvent('view-role-change', {
      detail: { viewRole: targetRole || '', prevRole }
    }));
    // 顶栏标签自身也需要更新
    _rerenderRoleLabel();
  });
}

// 重新渲染顶栏角色标签（不重载整个 header）
function _rerenderRoleLabel() {
  const user = AuthStore.getCurrentUser();
  const role = user?.role || '';
  const labelEl = document.getElementById('role-label');
  if (labelEl) {
    // 复用 _roleLabelHTML 逻辑，仅更新 text
    const { accent } = getAccentColors(role);
    const label = ROLE_LABELS[role] || role;
    const viewRole = AuthStore.getViewRole();
    let text = label;
    if (viewRole) {
      const viewLabel = ROLE_LABELS[viewRole] || viewRole;
      text = `${label} · 查看 ${viewLabel}`;
    }
    const span = labelEl.querySelector('span');
    if (span) span.textContent = text;
  }
}
```

- [ ] **Step 2: sidebar.js 订阅事件 re-render**

打开 `docs/src/components/sidebar.js`。

在文件末尾 `_bindLogout` 之后，新增事件订阅：

```javascript
// 订阅 view-role-change 事件，重新渲染链接
let _lastActiveModule = null;
document.addEventListener('view-role-change', () => {
  // 重新渲染 sidebar（保持 activeModule）
  if (_lastActiveModule !== null) {
    renderSidebar(_lastActiveModule);
  }
});

// 修改 renderSidebar，记录 activeModule
const _originalRenderSidebar = renderSidebar;
function _renderSidebarWithTracking(activeModule) {
  _lastActiveModule = activeModule;
  _originalRenderSidebar(activeModule);
}
// 替换 export（如果 export 是 function 声明）
```

实际上更简单的方式：在 `renderSidebar` 函数内部记录 `_lastActiveModule`：

修改 `renderSidebar` 函数开头：

```javascript
let _lastActiveModule = null;

export function renderSidebar(activeModule) {
  _lastActiveModule = activeModule;
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  // ... 其余逻辑不变
}

// 订阅事件
document.addEventListener('view-role-change', () => {
  if (_lastActiveModule !== null) {
    renderSidebar(_lastActiveModule);
  }
});
```

- [ ] **Step 3: 浏览器验证**

启动 HTTP server，登录书记，进入 secretary.html。

在 header 的 view-switcher 下拉中选择"leader"。
Expected:
1. sidebar 的"党建工作台"链接立即变为 `workspace/leader.html`（无 reload）
2. 顶栏角色标签显示"书记 · 查看党小组组长"

再选回"我的视角"（空值）。
Expected: sidebar 链接恢复为 `workspace/secretary.html`。

Run: `GetDiagnostics` 对修改文件
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add docs/src/components/header.js docs/src/components/sidebar.js
git commit -m "feat(ui): viewSwitcher 事件驱动 + sidebar 订阅

- header 切换视角后派发 view-role-change 事件，不再 reload
- sidebar 订阅事件，re-render 链接
- 解决切换视角丢失页面状态问题

T-2026-07-006 第3轮 阶段3 Task7"
```

---

## Task 8: 阶段 3.3 — 新建 CrossPageState 模块

**Files:**
- Create: `docs/src/core/cross-page-state.js`

- [ ] **Step 1: 创建 cross-page-state.js**

新建 `docs/src/core/cross-page-state.js`：

```javascript
// role: [工程师]+[AI]
// core/cross-page-state.js — 跨页面状态统一模块
// 实现：URL params + sessionStorage 双轨
// - URL params 作为跨页面传递的载体（书签/分享友好）
// - sessionStorage 作为同源页面间快速读取的缓存
// - 写入时同时更新 URL 和 sessionStorage
// - 读取时优先 sessionStorage（同源快），回退 URL params

export const CrossPageState = {
  /**
   * 设置参数（同步更新 URL 和 sessionStorage）
   * @param {string} key
   * @param {string} value
   */
  setParam(key, value) {
    // 更新 URL（history.replaceState，不触发跳转）
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState({}, '', url);
    } catch {}
    // 同步到 sessionStorage
    try {
      sessionStorage.setItem(`cps-${key}`, value);
    } catch {}
  },

  /**
   * 获取参数（优先 sessionStorage，回退 URL params）
   * @param {string} key
   * @returns {string|null}
   */
  getParam(key) {
    // 优先 sessionStorage
    try {
      const ssVal = sessionStorage.getItem(`cps-${key}`);
      if (ssVal !== null) return ssVal;
    } catch {}
    // 回退 URL params
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(key);
    } catch {
      return null;
    }
  },

  /**
   * 清除参数
   * @param {string} key
   */
  clearParam(key) {
    // 清 URL
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(key);
      window.history.replaceState({}, '', url);
    } catch {}
    // 清 sessionStorage
    try {
      sessionStorage.removeItem(`cps-${key}`);
    } catch {}
  },

  /**
   * 构建带参数的 URL
   * @param {string} base - 基础路径
   * @param {Object} params - 参数对象
   * @returns {string}
   */
  buildUrl(base, params = {}) {
    try {
      const url = new URL(base, window.location.origin);
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) url.searchParams.set(k, v);
      });
      return url.toString();
    } catch {
      return base;
    }
  },
};
```

- [ ] **Step 2: 验证 import 可用**

在任意入口文件中临时加入（测试后删除）：
```javascript
import { CrossPageState } from '../core/cross-page-state.js';
console.log('CrossPageState test:', CrossPageState.getParam('test'));
```

启动 HTTP server，刷新页面，确认无 import 错误。

- [ ] **Step 3: Commit**

```bash
git add docs/src/core/cross-page-state.js
git commit -m "feat(core): 新建 CrossPageState 统一模块

- URL params + sessionStorage 双轨
- setParam / getParam / clearParam / buildUrl
- 后续入口文件统一通过此模块读取 URL params

T-2026-07-006 第3轮 阶段3 Task8"
```

---

## Task 9: 阶段 3.4 — 入口文件统一通过 CrossPageState 读取 URL params

**Files:**
- Modify: 所有入口文件（`docs/src/entries/*.js`）
- Modify: `docs/src/core/bootstrap.js`

- [ ] **Step 1: 全仓库扫描直接使用 URLSearchParams 的位置**

Run: `grep -rn "URLSearchParams\|window.location.search" docs/src/`
记录所有匹配位置。

- [ ] **Step 2: 修改 bootstrap.js 中的 dev 角色读取**

打开 `docs/src/core/bootstrap.js`，找到：

```javascript
    const params = new URLSearchParams(window.location.search);
    const devRole = params.get('dev');
```

改为：

```javascript
    const devRole = CrossPageState.getParam('dev');
```

并在文件顶部加入 import：
```javascript
import { CrossPageState } from './cross-page-state.js';
```

- [ ] **Step 3: 修改其他入口文件中的 URL params 读取**

对每个入口文件（如有 `URLSearchParams` 使用），替换为 `CrossPageState.getParam()`。

具体修改位置根据 Step 1 的扫描结果确定。

- [ ] **Step 4: 验证**

启动 HTTP server，访问 `http://localhost:8765/workspace/secretary.html?dev=secretary`。
Expected: 自动登录为书记角色，跳转到 secretary.html。

Run: `GetDiagnostics` 对修改文件
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add docs/src/core/bootstrap.js docs/src/entries/*.js
git commit -m "refactor(entries): 统一通过 CrossPageState 读取 URL params

- 替换直接 URLSearchParams 使用
- 跨页面状态读取统一入口

T-2026-07-006 第3轮 阶段3 Task9"
```

---

## Task 10: 阶段 4 — 视觉与交互迭代（调用 frontend-design skill）

**Files:**
- Modify: `docs/login.html` + `docs/src/entries/login-entry.js`
- Modify: `docs/src/styles.css`
- Modify: 各 `docs/ws-*.html` / `docs/party-*.html` + 对应 entry JS
- Modify: `docs/members.html` + `docs/src/entries/members-entry.js`

- [ ] **Step 1: 调用 Skill: frontend-design**

向 Skill: frontend-design 提交以下任务：

> 设计目标：对登录页、各角色主页、辅助页面做整体视觉重构。
> 
> 设计原则：
> - 简约大气
> - 最符合页面信息展开逻辑
> - 不强制 Apple 风，但需保持现有党建红色主色
> 
> 范围：
> 1. 登录页重设计（卡片布局 + 动效 + 表单体验）
> 2. 颜色/间距/动画微调（保持党建红色主色）
> 3. 角色主页 layout 重设计（secretary / leader / visitor 等信息架构）
> 4. 辅助页面重设计（人员管理 / 意见反馈等）

- [ ] **Step 2: 根据 frontend-design 输出实施修改**

根据 frontend-design skill 的具体建议，修改以下文件：

**4.2.1 登录页重设计**：
- 修改 `docs/login.html`：调整卡片布局、动效、表单体验
- 修改 `docs/src/entries/login-entry.js`：适配新交互

**4.2.2 颜色/间距/动画微调**：
- 修改 `docs/src/styles.css`：调优色彩变量、间距、动画曲线
- 修改各 entry JS 中的内联样式（如需要）

**4.2.3 角色主页 layout 重设计**：
- 修改 `docs/workspace/secretary.html` 等各 ws-*.html：调整信息架构
- 修改 `docs/party/secretary.html` 等各 party-*.html：调整信息架构
- 修改对应 entry JS：适配新 layout

**4.2.4 辅助页面重设计**：
- 修改 `docs/members.html` + `docs/src/entries/members-entry.js`
- 修改 `docs/feedback.html` + `docs/src/entries/feedback-entry.js`

- [ ] **Step 3: 浏览器测试视觉一致性**

启动 HTTP server，逐个测试：
- 登录页 → 视觉体验
- 各角色主页（secretary/leader/visitor 等） → layout 一致性
- 辅助页面（人员管理、意见反馈） → 视觉风格统一
- 动效流畅，无卡顿

- [ ] **Step 4: 书记审阅视觉成果**

通知书记审阅视觉成果，等待反馈。

- [ ] **Step 5: 根据反馈调整**

如书记有反馈，按反馈调整。

- [ ] **Step 6: Commit**

```bash
git add docs/login.html docs/src/entries/login-entry.js docs/src/styles.css docs/workspace/*.html docs/party/*.html docs/src/entries/*.js docs/members.html docs/feedback.html
git commit -m "feat(ui): 视觉与交互全面迭代

- 登录页重设计（卡片布局+动效+表单体验）
- 颜色/间距/动画微调（保持党建红色主色）
- 角色主页 layout 重设计
- 辅助页面重设计

调用 Skill: frontend-design

T-2026-07-006 第3轮 阶段4 Task10"
```

---

## Task 11: 总验收 + 收尾

**Files:**
- Modify: `CLAUDE.md`（更新 T-2026-07-006 状态）
- Modify: `.ctx/logs/2026-07-EXECUTION_LOG.md`（追加 T92 条目）
- Modify: `.ctx/logs/EXECUTION_LOG_INDEX.md`（追加索引）

- [ ] **Step 1: 全仓库术语对齐验证**

Run: `grep -rn "getAuthState\|defaultRole\|viewMode" docs/src/`
Expected: 零残留（或仅注释中标注"已废弃"）

- [ ] **Step 2: 全角色端到端测试**

启动 HTTP server，依次测试 7 个角色登录：
- 书记（secretary）
- 副书记（deputy-secretary）
- 组织委员（org-commissioner）
- 宣传委员（prop-commissioner）
- 纪检委员（disc-commissioner）
- 党小组组长（leader）
- 参与者（participant）

每个角色验证：
- sidebar 链接正确
- 各功能完整可用
- 帮助/关于/退出链接可用

- [ ] **Step 3: 视角切换端到端测试**

登录书记，切换到 leader 视角：
- sidebar 链接立即更新（无 reload）
- 跳转后目标页保持 viewRole
- 退出登录后 viewRole 清空

- [ ] **Step 4: 人员管理端到端测试**

登录书记，进入人员管理页：
- 常设角色赋权（设为/取消组长）可用
- 项目角色赋权（organizer/deep）可用
- canDo 验证：赋权后该成员 canDo 返回 true

- [ ] **Step 5: 视觉体验书记审阅通过**

通知书记最终视觉体验审阅。

- [ ] **Step 6: 更新 CLAUDE.md**

打开 `CLAUDE.md`，找到 T-2026-07-006 状态行：

```markdown
| T-2026-07-006 | **权限系统大改（面向上线）**：... | ✅ 第 2 轮完成（待第 3 轮：UI 改造+真实场景迭代） |
```

改为：

```markdown
| T-2026-07-006 | **权限系统大改（面向上线）**：... | ✅ 第 3 轮完成（待第 4 轮：真实场景迭代+mock 数据迭代） |
```

- [ ] **Step 7: 追加执行日志 T92**

打开 `.ctx/logs/2026-07-EXECUTION_LOG.md`，追加 T92 条目：

```markdown
## T92 — 权限系统大改·第 3 轮：UI 改造+真实场景迭代

**日期**：2026-07-13
**关联**：T-2026-07-006
**spec**：`docs/superpowers/specs/2026-07-13-permission-system-redesign-round3-design.md`
**plan**：`docs/superpowers/plans/2026-07-13-permission-system-redesign-round3.md`

**实施清单**（11 Task）：
- Task 1: 修复 12 个入口文件 bootstrapPage + AuthStore 旧 API（getAuthState→getAuthorizations, 5参数→4参数）
- Task 2: auth.js 新增 getEffectiveRole() + sidebar 同步 viewRole
- Task 3: 跳转循环防护 ROUTE_LOCK（500ms TTL）
- Task 4: 验证帮助/关于/退出链接
- Task 5: _getProjectRole 优先读 auth records（修复 Final reviewer 问题 2）
- Task 6: 人员管理页新增项目角色赋权面板（organizer/deep）
- Task 7: viewSwitcher 事件驱动 + sidebar 订阅（不再 reload）
- Task 8: 新建 CrossPageState 统一模块
- Task 9: 入口文件统一通过 CrossPageState 读取 URL params
- Task 10: 调用 Skill: frontend-design 视觉迭代
- Task 11: 总验收+收尾

**验证结果**：
- 全仓库 getAuthState/defaultRole/viewMode 零残留
- 7 角色端到端测试通过
- 视角切换端到端测试通过
- 人员管理端到端测试通过
- 视觉体验书记审阅通过

**第 4 轮候补**：
- 真实场景迭代
- mock 数据迭代
- 其他功能完善

**蒸馏标签**：[经验蒸馏: 否]
**状态**：✅ 第 3 轮完成
```

更新 YAML `last_updated: "2026-07-13"`。

- [ ] **Step 8: 追加索引**

打开 `.ctx/logs/EXECUTION_LOG_INDEX.md`，在 2026-07 月度条目索引表中追加：

```markdown
| T92 | 2026-07-13 | 权限系统大改·第 3 轮：UI 改造+真实场景迭代 |
```

更新 YAML `last_updated: "2026-07-13"`。

- [ ] **Step 9: 提交收尾**

```bash
git add CLAUDE.md .ctx/logs/2026-07-EXECUTION_LOG.md .ctx/logs/EXECUTION_LOG_INDEX.md
git commit -m "docs(log): T92 权限系统大改第3轮完成

- CLAUDE.md T-2026-07-006 状态更新为第3轮完成
- 执行日志 T92 记录 11 Task 实施清单
- 索引追加 T92"
```

- [ ] **Step 10: 最终验证**

Run: `git log --oneline -20`
Expected: 看到本计划的所有 commit。

Run: `GetDiagnostics`
Expected: 全仓库无错误。

---

## Self-Review

**1. Spec coverage:**

- 阶段 1.1（bootstrapPage 旧 API）→ Task 1 ✓
- 阶段 1.2（AuthStore 旧 API）→ Task 1 ✓
- 阶段 1.3（sidebar viewRole 同步）→ Task 2 ✓
- 阶段 1.4（跳转循环防护）→ Task 3 ✓
- 阶段 1.5（帮助/关于/退出链接）→ Task 4 ✓
- 阶段 2.1（人员管理布局重构）→ Task 6（部分覆盖，布局重构由 frontend-design 在 Task 10 完成）✓
- 阶段 2.2（_getProjectRole 读 auth records）→ Task 5 ✓
- 阶段 2.3（项目角色赋权面板）→ Task 6 ✓
- 阶段 3.1（viewSwitcher 事件驱动）→ Task 7 ✓
- 阶段 3.2（sidebar 订阅事件）→ Task 7 ✓
- 阶段 3.3（CrossPageState 模块）→ Task 8 ✓
- 阶段 3.4（入口文件统一）→ Task 9 ✓
- 阶段 4（视觉迭代）→ Task 10 ✓
- 总验收 → Task 11 ✓

**2. Placeholder scan:**

扫描全文无 TBD/TODO/XXX/"implement later"/"fill in details"。

**3. Type consistency:**

- `getEffectiveRole(userId)` — Task 2 定义，Task 7 sidebar 中调用 ✓
- `CrossPageState.setParam/getParam/clearParam/buildUrl` — Task 8 定义，Task 9 使用 ✓
- `AuthStore.getAuthorizations()` — Task 1 替换，Task 5/Task 6 使用 ✓
- `AuthStore.authorize(authorizerId, targetUserId, role, {projectId})` — Task 1 修复签名，Task 6 使用 ✓
- `view-role-change` 事件名 — Task 7 header 派发，sidebar 订阅 ✓
- `ROUTE_LOCK` / `_acquireRouteLock` — Task 3 定义 ✓

**4. Ambiguity check:**

- Task 10 阶段 4 调用 frontend-design skill，输出不确定——已明确"根据 frontend-design skill 的具体建议修改"
- Task 1 中"全文搜索 getAuthState 确认零残留"——明确 Grep 命令

所有 spec 要求都有对应 Task，无遗漏。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-13-permission-system-redesign-round3.md`.

11 个 Task，分 4 阶段：
- 阶段 1（Task 1-4）：稳定性修复
- 阶段 2（Task 5-6）：人员管理扩展
- 阶段 3（Task 7-9）：视角切换重做
- 阶段 4（Task 10）：视觉迭代
- Task 11：总验收收尾

**推荐执行方式：Subagent-Driven Development**（每 Task 派发 implementer + spec reviewer + code quality reviewer）

书记已选择方案 A（4 阶段串行），可立即开始执行 Task 1。
