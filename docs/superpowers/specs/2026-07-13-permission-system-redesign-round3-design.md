---
title: "权限系统大改·第 3 轮：UI 改造+真实场景迭代"
type: spec
owner: "Org OS Agent 集群"
role: "[工程师]+[AI]"
last_updated: "2026-07-13"
status: pending_review
parent_spec: "docs/superpowers/specs/2026-07-12-permission-system-redesign-design.md"
parent_log: ".ctx/logs/2026-07-EXECUTION_LOG.md T91"
---

# 权限系统大改·第 3 轮：UI 改造+真实场景迭代

## 背景与目标

第 1 轮（T65）完成权限模型重构（17 个 Task）；第 2 轮（T91）完成权限矩阵重写（9 个 Task + Final reviewer 问题 1 修复）；第 3 轮聚焦 **UI 改造 + 真实场景迭代**，让权限系统在 UI 层完整可用。

**书记核心约束**：
- 系统面向上线部署
- 侧边栏与跳转逻辑"非常不稳定和不完善"——必须重点解决
- 有拿不准的地方不擅做决断，必须 ask User
- 推进完成所有工作，不允许随意结束 session

**本轮目标**：
1. 修复稳定性痛点（入口文件 API 不匹配 / AuthStore 旧 API 残留 / sidebar viewRole 错乱 / 跳转循环 / 帮助/关于/退出链接失效 / 人员管理链接可见性）
2. 人员管理页扩展项目角色赋权
3. viewSwitcher 完整重做（事件驱动，不 reload）
4. 视觉与交互全面迭代（调用 frontend-design skill）

## 总体架构

```
┌─────────────────────────────────────────────────────────┐
│  共享数据层（单一来源）                                   │
│  AuthStore / CrossPageState / state.js / mock 数据       │
└─────────────────────────────────────────────────────────┘
                            ↑
            ┌───────────────┼───────────────┐
            │               │               │
   ┌────────┴───────┐ ┌────┴─────┐ ┌────────┴────────┐
   │  UI 共享组件    │ │ 入口层   │ │  路由辅助        │
   │ sidebar/header  │ │ entries │ │  workspace-entry │
   │ /tab-bar/modal   │ │  *.js   │ │  party-entry     │
   └──────────────────┘ └──────────┘ └──────────────────┘
                            ↓
            ┌───────────────────────────────┐
            │  4 阶段串行实施                 │
            │  阶段1→阶段2→阶段3→阶段4       │
            │  每阶段独立 commit + 验收       │
            └───────────────────────────────┘
```

**核心设计原则**：
- 共享数据层作为单一来源，UI 组件订阅数据变化
- 引入 `getEffectiveRole()` 辅助：返回 `viewRole || user.role`，统一解决"视角切换后 sidebar 错乱"问题
- 跳转逻辑引入 ROUTE_LOCK 防护，避免快速点击导致循环
- 阶段 4 视觉迭代调用 frontend-design skill
- 设计原则：简约大气、最符合页面信息展开逻辑（不强制 Apple 风）

## 现状摸底（待修复问题清单）

### A. 入口文件 API 不匹配（critical）
- `bootstrapPage` 已重构为只接受 `{module, accentRole, accentAlpha}`，但 8+ 个 ws-*/party-* 入口仍传 `{defaultRole, viewMode}`，参数被静默忽略
- 入口期望 `savedState` 返回值，但新版不返回

### B. AuthStore 旧 API 残留（critical）
- `ws-secretary-entry.js`：`getAuthState()`（新名 `getAuthorizations()`）— 2 处
- `ws-secretary-entry.js`：`authorize(userA, userB, role, scope, scopeRef)` 5 参数旧签名（新签名 4 参数 `authorize(authorizerId, targetUserId, role, {projectId})`）— 1 处
- `ws-org-commissioner-entry.js`：`getAuthState()` — 1 处

### C. 侧边栏跳转逻辑不稳定（书记核心痛点）
- `sidebar.js` 用 `user.role` 生成 workspace/party 链接，不读 viewRole（只读视角）→ 切换视角后 sidebar 链接错乱
- "人员管理"`commissionerOnly` 判定也用 `user.role`
- 跨页面跳转后 sidebar 重新渲染，但 `activeModule` 高亮依赖每个页面手动传值

### D. 跳转循环风险
- `workspace-entry.js` → `getPageForRole('workspace', role)` → `workspace/secretary.html`
- `index.html` 用 `getPageForRole` 重写所有 `a[href*="workspace/"]` 链接
- 用户在 `secretary.html` 切换 viewRole 后再点 sidebar，可能反复跳转

### E. viewSwitcher 触发 reload（不优雅）
- `header.js` 切换视角后 `window.location.reload()`，丢失页面状态

### F. _getProjectRole 不读 auth records（第 2 轮遗留问题 2）
- `authorize()` 保存的项目角色记录存储在 localStorage auth records 中
- `_getProjectRole()` 仅读静态 mock 数据，不读 auth records
- 导致 `canDo()` 项目权限判定对运行时赋权不生效

### G. 人员管理页面功能单一
- 当前仅"设为/取消组长"，未支持项目角色（organizer/deep）赋权

### H. CrossPageState 不一致
- 仅 3 个入口读 URL params，其他入口不读

## 阶段 1：稳定性修复

### 1.1 修复 bootstrapPage 旧 API 调用（8+ 处入口）

**修改文件**：
- `docs/src/entries/ws-secretary-entry.js`
- `docs/src/entries/ws-leader-entry.js`
- `docs/src/entries/ws-deep-entry.js`
- `docs/src/entries/ws-organizer-entry.js`
- `docs/src/entries/ws-org-commissioner-entry.js`
- `docs/src/entries/ws-prop-commissioner-entry.js`
- `docs/src/entries/ws-disc-commissioner-entry.js`
- `docs/src/entries/ws-visitor-entry.js`
- `docs/src/entries/party-secretary-entry.js`
- `docs/src/entries/party-org-entry.js`
- `docs/src/entries/party-prop-entry.js`
- `docs/src/entries/party-disc-entry.js`

**修改内容**：
- 移除 `defaultRole`、`viewMode` 参数（被静默忽略）
- 移除 `savedState` 解构
- 保留 `accentRole`、`accentAlpha` 参数

### 1.2 修复 AuthStore 旧 API 残留（4 处）

**修改文件**：
- `docs/src/entries/ws-secretary-entry.js`：
  - `getAuthState()` → `getAuthorizations()`（2 处）
  - `authorize(userA, userB, role, scope, scopeRef)` → `authorize(authorizerId, targetUserId, role, {projectId: scopeRef})`（1 处）
- `docs/src/entries/ws-org-commissioner-entry.js`：
  - `getAuthState()` → `getAuthorizations()`（1 处）

### 1.3 sidebar 链接 viewRole 同步

**修改文件**：
- `docs/src/services/auth.js`：新增 `getEffectiveRole(userId)` 辅助方法
  ```javascript
  getEffectiveRole(userId) {
    const viewRole = this.getViewRole();
    return viewRole || this.getUserRole(userId);
  }
  ```
- `docs/src/components/sidebar.js`：
  - 用 `AuthStore.getEffectiveRole(userId)` 替代 `user.role` 决定 workspace/party 链接
  - `commissionerOnly` 判定也用 `getEffectiveRole()`

### 1.4 跳转循环防护

**修改文件**：
- `docs/src/entries/workspace-entry.js`：
  - 加入 referrer 检查：若已在角色页且 effectiveRole 未变化，不重复跳转
  - 引入 `sessionStorage.ROUTE_LOCK` 临时标记（500ms 过期），防止快速点击多次跳转
- `docs/src/entries/party-entry.js`：同上

### 1.5 帮助/关于/退出链接失效修复

**修改文件**：
- `docs/src/components/sidebar.js`：
  - 检查 sidebar footer 中 `getBasePath()` 拼接
  - 子目录页面（workspace/*、party/*）的 `getBasePath()` 返回 `'./'` 但依赖 `<base href="../">`，需验证 `<base>` 标签在所有 HTML 中存在
- 全部 HTML 文件：验证 `<base href="../">` 存在

### 1.6 阶段 1 验收

- 浏览器手动测试 7 个角色登录 → sidebar 链接正确
- viewRole 切换 → sidebar 链接同步更新（暂用 reload，阶段 3 改为事件驱动）
- 帮助/关于/退出 3 个链接在所有页面均可用
- 跳转无循环
- GetDiagnostics 无错误

## 阶段 2：人员管理扩展

### 2.1 人员管理页面布局重构

**修改文件**：
- `docs/members.html`：调整页面结构
- `docs/src/entries/members-entry.js`：新增项目角色赋权逻辑

**新增布局**：
- 顶部：人员列表（左侧）+ 选中人员详情（右侧）
- 详情区：
  - 常设角色赋权（保留现有"设为/取消组长"）
  - 项目角色赋权（按项目分组：活动 / 专班）

### 2.2 _getProjectRole 读取 auth records（修复 Final reviewer 问题 2）

**修改文件**：
- `docs/src/services/auth.js`：
  ```javascript
  function _getProjectRole(userId, projectId) {
    // 0. 优先查 auth records（运行时赋权）
    const records = _getAuthRecords();
    const authRec = records.find(r =>
      r.targetUserId === userId &&
      r.role && ['organizer', 'deep'].includes(r.role) &&
      r.scopeRef === projectId
    );
    if (authRec) return authRec.role;

    // 1. 再查活动 assignments
    const activity = ACTIVITIES.find(a => a.id === projectId);
    if (activity && Array.isArray(activity.assignments)) {
      const rec = activity.assignments.find(a => a.personId === userId);
      if (rec) return rec.role;
    }

    // 2. 再查专班 members
    const tf = MOCK_TASKFORCES.find(t => t.id === projectId);
    if (tf && Array.isArray(tf.members)) {
      const m = tf.members.find(m => m.personId === userId);
      if (m) return m.role;
    }

    return null;
  }
  ```

### 2.3 项目角色赋权面板

**修改文件**：
- `docs/src/entries/members-entry.js`：新增赋权面板渲染逻辑
- `docs/src/components/modal.js`（如不存在则新建）：通用弹窗组件

**功能**：
- 人员管理页新增"赋权项目角色"按钮
- 弹窗选择项目（活动/专班下拉）+ 角色（organizer/deep 单选）
- 调用 `AuthStore.authorize(authorizerId, targetUserId, 'organizer', {projectId: 'act-xxx'})`
- 校验 `AUTHORIZE_CHAIN[authorizerRole].includes(role)` 决定按钮可用性

### 2.4 阶段 2 验收

- 浏览器测试：组长登录 → 人员管理 → 给成员赋权 organizer → 切到该成员登录 → canDo('assign_task', {projectId}) 返回 true
- GetDiagnostics 无错误

## 阶段 3：视角切换重做

### 3.1 viewSwitcher 事件驱动局部刷新

**修改文件**：
- `docs/src/components/header.js`：
  - 切换视角后不再 `window.location.reload()`
  - 改为派发 `view-role-change` 自定义事件
  ```javascript
  document.dispatchEvent(new CustomEvent('view-role-change', {
    detail: { viewRole, prevRole }
  }));
  ```

### 3.2 sidebar 订阅事件实时更新

**修改文件**：
- `docs/src/components/sidebar.js`：
  - 订阅 `view-role-change` 事件
  - 事件触发后 re-render 链接
  ```javascript
  document.addEventListener('view-role-change', () => {
    sidebar.render();  // 重新渲染
  });
  ```

### 3.3 CrossPageState URL params 全仓库统一

**新增文件**：
- `docs/src/core/cross-page-state.js`：统一模块
  ```javascript
  // 实现：URL params + sessionStorage 双轨
  // - URL params 作为跨页面传递的载体（书签/分享友好）
  // - sessionStorage 作为同源页面间快速读取的缓存
  // - 写入时同时更新 URL 和 sessionStorage
  // - 读取时优先 sessionStorage（同源快），回退 URL params
  export const CrossPageState = {
    setParam(key, value) {
      // 更新 URL（history.replaceState，不触发跳转）
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState({}, '', url);
      // 同步到 sessionStorage
      sessionStorage.setItem(`cps-${key}`, value);
    },
    getParam(key) {
      // 优先 sessionStorage
      const ssVal = sessionStorage.getItem(`cps-${key}`);
      if (ssVal !== null) return ssVal;
      // 回退 URL params
      const url = new URL(window.location.href);
      return url.searchParams.get(key) || null;
    },
    clearParam(key) {
      // 清 URL
      const url = new URL(window.location.href);
      url.searchParams.delete(key);
      window.history.replaceState({}, '', url);
      // 清 sessionStorage
      sessionStorage.removeItem(`cps-${key}`);
    },
    buildUrl(base, params) {
      const url = new URL(base, window.location.origin);
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) url.searchParams.set(k, v);
      });
      return url.toString();
    },
  };
  ```

**修改文件**：
- 所有入口文件：统一通过 `CrossPageState.getParam()` 读取 URL params（替换直接 `URLSearchParams`）

### 3.4 跳转目标页 viewRole 持久化

**修改文件**：
- 目标页面（如 secretary.html）entry：读取 sessionStorage `VIEW_ROLE_KEY`，若存在则按 viewRole 渲染
- `logout()`：清除 VIEW_ROLE_KEY（已有）

### 3.5 阶段 3 验收

- 切换视角 → sidebar 链接立即更新（无 reload）
- 跳转后目标页保持 viewRole
- 退出登录后 viewRole 清空
- GetDiagnostics 无错误

## 阶段 4：视觉与交互迭代

### 4.1 调用 frontend-design skill

**强制要求**：本阶段必须调用 Skill: frontend-design 对各页面做整体视觉重构

**设计原则**：
- 简约大气
- 最符合页面信息展开逻辑
- 不强制 Apple 风，但需保持现有党建红色主色

### 4.2 子任务范围

**4.2.1 登录页重设计**
- 卡片布局 + 动效 + 表单体验
- 修改：`docs/login.html` + `docs/src/entries/login-entry.js`

**4.2.2 颜色/间距/动画微调**
- 在现有色彩基础上调优（保持党建红色主色）
- 修改：`docs/src/styles.css` + 各 entry JS 中的样式

**4.2.3 角色主页 layout 重设计**
- secretary / leader / visitor 等页面信息架构
- 修改：各 ws-*.html / party-*.html + 对应 entry JS

**4.2.4 辅助页面重设计**
- 人员管理 / 意见反馈等
- 修改：`docs/members.html` + `docs/src/entries/members-entry.js` 等

### 4.3 阶段 4 验收

- 书记审阅视觉成果
- 跨页面体验一致性
- 动效流畅，无卡顿
- GetDiagnostics 无错误

## 总验收

完成所有 4 阶段后：
1. 全仓库术语对齐验证（Grep `getAuthState|defaultRole|viewMode` 零残留）
2. 全角色端到端测试：7 个角色登录 → 各功能完整可用
3. 视角切换端到端测试：切换 → sidebar 更新 → 跳转保持 → 退出清空
4. 人员管理端到端测试：常设角色赋权 + 项目角色赋权 + canDo 验证
5. 视觉体验书记审阅通过

## 衍生任务与第 4 轮候补

- 若阶段 4 视觉迭代中发现 mock 数据不合理，迭代 mock 数据
- 若发现新功能需求，记录到第 4 轮候补
- 真实场景迭代：配合实际使用场景调整

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 文件写入被 IDE 锁定 | 使用 PowerShell Move-Item + Write + Remove-Item 三步法 |
| 阶段间相互影响 | 每阶段独立 commit，便于回滚 |
| 视觉迭代改动较大 | 阶段 4 调用 frontend-design skill 严格按设计原则 |
| 范围过大无法完成 | 4 阶段切分清晰，每阶段可独立交付价值 |
