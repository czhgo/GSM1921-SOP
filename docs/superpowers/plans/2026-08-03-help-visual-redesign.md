# Help 页视觉再设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 help.html 快速导航改为「角色×功能域矩阵 v4」（4 行 × 6 列，书记置后平级），正文升级为「风格 A 纯化」版式（章眉导语 + 小节编号徽章 + 要点卡/对比卡/查找卡/金色引语），配色克制（红=关键、金=引语、灰=正文）。

**Architecture:** 纯静态 HTML/CSS 改造，仅动 `docs/help.html` 一个文件（内联 `<style>` + 正文结构）。`help-entry.js` 的 TOC 与两个组件（role-hierarchy / commissioner-matrix）原样保留；`styles.css` 不动。版本号 `?v=20260803g` → `?v=20260803h` 防缓存。

**Tech Stack:** HTML5 语义化 + 原生 CSS（Tailwind CDN 已在页面）。无新依赖。

**Spec:** `docs/superpowers/specs/2026-08-03-help-visual-redesign-design.md`（已获书记批准）

---

### Task 1: 快速导航矩阵 v4（样式 + HTML 替换）

**Files:**
- Modify: `docs/help.html:48-58`（quick-* 样式 → qn-* 样式）
- Modify: `docs/help.html:178-349`（quick-card 网格 → 矩阵）
- Modify: `docs/help.html:74-77`（响应式媒体查询）

- [ ] **Step 1: 替换快速上手样式块**

用 Edit 将 `docs/help.html` L48-58 的样式块：

```css
    /* ── 快速上手：功能卡片网格 ── */
    .quick-group-title { display:flex; align-items:center; gap:10px; font-size:0.82rem; font-weight:600; color:#6B7280; letter-spacing:0.06em; margin:26px 0 12px; }
    .quick-group-title::before { content:''; width:3px; height:14px; border-radius:2px; background:#CE1126; }
    .quick-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(236px,1fr)); gap:12px; }
    .quick-card { background:#FAFAF7; border:1px solid #EEEFF2; border-radius:14px; padding:15px 17px; transition:border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
    .quick-card:hover { border-color:#F3C7CC; box-shadow:0 4px 14px rgba(206,17,38,0.06); transform:translateY(-1px); }
    .quick-card-name { font-size:0.92rem; font-weight:700; color:#111827; margin-bottom:6px; display:flex; align-items:center; gap:8px; }
    .quick-card-name::before { content:''; width:4px; height:14px; border-radius:2px; background:#CE1126; }
    .quick-card-desc { font-size:0.8rem; color:#6B7280; line-height:1.75; margin-bottom:10px; }
    .quick-card-tags { display:flex; flex-wrap:wrap; gap:6px; }
    .chip { display:inline-block; font-size:0.7rem; color:#374151; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:999px; padding:2px 10px; }
```

替换为：

```css
    /* ── 快速上手：角色 × 功能域矩阵 ── */
    .qn-common { display:flex; align-items:center; gap:8px; flex-wrap:wrap; border:1px solid #EEEFF2; border-radius:14px; background:#FCFCFB; padding:10px 14px; margin:12px 0 2px; }
    .qn-common-label { font-size:0.72rem; font-weight:700; color:#6B7280; letter-spacing:0.06em; }
    .qn-chip { display:inline-flex; align-items:center; gap:5px; font-size:0.7rem; color:#374151; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:999px; padding:2px 10px; line-height:1.5; text-decoration:none; transition:border-color 0.2s, background-color 0.2s; }
    .qn-chip:hover { border-color:#9CA3AF; background:#F8F9FA; }
    .qn-chip:focus-visible { outline:2px solid #CE1126; outline-offset:2px; }
    .qn-table-wrap { overflow-x:auto; margin-top:4px; }
    table.qn-matrix { width:100%; border-collapse:collapse; table-layout:fixed; min-width:640px; }
    table.qn-matrix th { font-size:0.72rem; font-weight:700; color:#374151; padding:8px; text-align:left; border-bottom:1.5px solid #E5E7EB; }
    table.qn-matrix td { font-size:0.7rem; color:#6B7280; padding:9px 8px; vertical-align:top; border-bottom:1px solid #F1F2F4; }
    table.qn-matrix tr:last-child td { border-bottom:none; }
    td.qn-domain { font-weight:700; color:#111827; font-size:0.78rem; width:88px; white-space:nowrap; }
    td.qn-empty { background:#FAFAF9; }
    .qn-role { display:flex; align-items:center; gap:5px; }
    .qn-role-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .qn-cell { display:flex; flex-direction:column; gap:4px; }
    a.qn-fn { font-size:0.66rem; color:#374151; background:#fff; border:1px solid; border-radius:999px; padding:1px 8px; line-height:1.6; text-decoration:none; width:fit-content; transition:background-color 0.2s, border-color 0.2s; }
    a.qn-fn:hover { background:#F8F9FA; }
    a.qn-fn:focus-visible { outline:2px solid #CE1126; outline-offset:2px; }
    a.qn-fn-leader { border-color:#86EFAC; color:#15803D; }
    a.qn-fn-org    { border-color:#BAE6FD; color:#0369A1; }
    a.qn-fn-prop   { border-color:#93C5FD; color:#1D4ED8; }
    a.qn-fn-disc   { border-color:#FDBA74; color:#9A3412; }
    a.qn-fn-member { border-color:#E5E7EB; color:#4B5563; }
    a.qn-fn-sec    { border-color:#FCA5A5; color:#991B1B; }
```

- [ ] **Step 2: 更新移动端媒体查询**

将 `docs/help.html` L74-77 的媒体查询：

```css
    @media (max-width:640px) {
      .doc-card { padding:26px 20px; }
      .quick-grid { grid-template-columns:1fr; }
    }
```

替换为：

```css
    @media (max-width:640px) {
      .doc-card { padding:26px 20px; }
    }
```

（矩阵窄屏由 `.qn-table-wrap { overflow-x:auto }` + `min-width:640px` 横滑承载，无需降级为单列。）

- [ ] **Step 3: 替换 1.1 功能卡片网格 HTML**

用 Edit 将 `docs/help.html` L178-349 整段（从 `<div class="quick-group-title">公共页面</div>` 到普通成员视图的 quick-grid 结束）替换为矩阵：

```html
        <div class="qn-common">
          <span class="qn-common-label">公共页面</span>
          <a class="qn-chip" href="./index.html">首页</a>
          <a class="qn-chip" href="./search.html">资料查询</a>
          <a class="qn-chip" href="./feedback.html">意见反馈</a>
          <a class="qn-chip" href="./archive.html">归档库</a>
        </div>
        <div class="qn-table-wrap">
          <table class="qn-matrix">
            <thead>
              <tr>
                <th>功能域</th>
                <th><span class="qn-role"><span class="qn-role-dot" style="background:#22C55E"></span>党小组组长</span></th>
                <th><span class="qn-role"><span class="qn-role-dot" style="background:#0EA5E9"></span>组织委员</span></th>
                <th><span class="qn-role"><span class="qn-role-dot" style="background:#2563EB"></span>宣传委员</span></th>
                <th><span class="qn-role"><span class="qn-role-dot" style="background:#C2410C"></span>纪检委员</span></th>
                <th><span class="qn-role"><span class="qn-role-dot" style="background:#6B7280"></span>普通成员</span></th>
                <th><span class="qn-role"><span class="qn-role-dot" style="background:#B91C1C"></span>党支书</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="qn-domain">活动专班</td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-leader" href="./workspace/leader.html">活动写入</a><a class="qn-fn qn-fn-leader" href="./workspace/leader.html">复盘提交</a></div></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-org" href="./workspace/org.html">专班管理</a></div></td>
                <td class="qn-empty"></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-disc" href="./workspace/disc.html">活动监督复盘</a></div></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-member" href="./index.html">活动动态</a><a class="qn-fn qn-fn-member" href="./index.html">专班进展</a></div></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-sec" href="./workspace/secretary.html">工作台</a></div></td>
              </tr>
              <tr>
                <td class="qn-domain">考勤与考察</td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-leader" href="./workspace/leader.html">考勤上传</a><a class="qn-fn qn-fn-leader" href="./workspace/leader.html">考察上传</a></div></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-org" href="./workspace/org.html">考察上传</a><a class="qn-fn qn-fn-org" href="./workspace/org.html">人才库</a><a class="qn-fn qn-fn-org" href="./workspace/org.html">发展党员</a></div></td>
                <td class="qn-empty"></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-disc" href="./workspace/disc.html">考勤管理</a><a class="qn-fn qn-fn-disc" href="./workspace/disc.html">补课制度</a><a class="qn-fn qn-fn-disc" href="./workspace/disc.html">考察管理</a></div></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-member" href="./index.html">考勤概况</a></div></td>
                <td class="qn-empty"></td>
              </tr>
              <tr>
                <td class="qn-domain">宣传与档案</td>
                <td class="qn-empty"></td>
                <td class="qn-empty"></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-prop" href="./workspace/prop.html">宣传任务</a><a class="qn-fn qn-fn-prop" href="./workspace/prop.html">项目看板</a><a class="qn-fn qn-fn-prop" href="./workspace/prop.html">周报报送</a><a class="qn-fn qn-fn-prop" href="./workspace/prop.html">档案归档</a></div></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-disc" href="./workspace/disc.html">公邮管理</a></div></td>
                <td class="qn-empty"></td>
                <td class="qn-empty"></td>
              </tr>
              <tr>
                <td class="qn-domain">统筹</td>
                <td class="qn-empty"></td>
                <td class="qn-empty"></td>
                <td class="qn-empty"></td>
                <td class="qn-empty"></td>
                <td class="qn-empty"></td>
                <td><div class="qn-cell"><a class="qn-fn qn-fn-sec" href="./workspace/secretary.html">全局概况</a><a class="qn-fn qn-fn-sec" href="./workspace/secretary.html">赋权管理</a><a class="qn-fn qn-fn-sec" href="./workspace/secretary.html">通知发布</a><a class="qn-fn qn-fn-sec" href="./workspace/secretary.html">反馈管理</a></div></td>
              </tr>
            </tbody>
          </table>
        </div>
```

- [ ] **Step 4: 验证矩阵渲染**

Run: `cd docs && python -m http.server 8000`（新终端），浏览器打开 `http://localhost:8000/help.html`。
Expected: 1.1 小节显示「公共页面」横条（4 个 chip）+ 4 行 × 6 列表格；列顺序为组长/组织/宣传/纪检/成员/书记（书记最后一列）；「统筹」行仅书记列有 4 个红色 chip，其余格为淡色；无 quick-card 残留。

Run: `grep -c "quick-card" docs/help.html` → Expected: 0

- [ ] **Step 5: Commit**

```bash
git add docs/help.html
git commit -m "docs(help): T-201 快速导航改矩阵 v4（4 行功能域 × 6 角色列·书记置后平级·公共页面横条·chip 跳转）"
```

---

### Task 2: 正文版式样式 + 小节编号徽章

**Files:**
- Modify: `docs/help.html:39`（doc-h3 改 flex 布局）
- Modify: `docs/help.html:43`（doc-lead 增强）
- Modify: `docs/help.html:72`（doc-note 后追加变体样式）
- Modify: `docs/help.html`（15 处 doc-h3 → 徽章式）

- [ ] **Step 1: doc-h3 改为徽章 flex 布局**

将 L39：
```css
    .doc-h3 { font-family:'Noto Serif SC','STZhongsong',serif; font-size:1.02rem; font-weight:600; color:#111827; margin:30px 0 12px; }
```
替换为：
```css
    .doc-h3 { display:flex; align-items:center; gap:10px; font-family:'Noto Serif SC','STZhongsong',serif; font-size:1.02rem; font-weight:600; color:#111827; margin:30px 0 12px; }
    .doc-h3-badge { flex-shrink:0; width:32px; height:32px; border-radius:9px; background:#FDF2F2; border:1px solid #F6D1D1; color:#CE1126; font-family:'Times New Roman','Noto Serif SC',serif; font-size:0.84rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; }
```

- [ ] **Step 2: doc-lead 增强**

将 L43：
```css
    .doc-lead { font-size:1rem; color:#4B5563; }
```
替换为：
```css
    .doc-lead { font-size:1rem; color:#4B5563; line-height:1.9; margin-bottom:20px; }
    .doc-lead strong { color:#111827; }
```

- [ ] **Step 3: 追加正文变体样式**

将 L72 的 `.doc-note { ... }` 行后追加以下样式块：

```css
    /* ── 正文版式增强：要点卡 / 对比卡 / 查找卡 / 引语 / 理念卡 ── */
    .doc-key { margin:14px 0; padding:11px 18px; border-radius:12px; background:#FEF2F2; border-left:3px solid #CE1126; font-size:0.9rem; color:#7A0010; line-height:1.85; }
    .doc-key strong { color:#991B1B; }
    .doc-duo { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:14px 0; }
    .doc-duo-item { border-radius:14px; padding:13px 16px; border:1px solid #EDEEF0; background:#FAFAF9; }
    .doc-duo-item h4 { font-size:0.8rem; font-weight:700; margin-bottom:7px; letter-spacing:0.03em; color:#111827; }
    .doc-duo-item h4 .dv { font-family:'Times New Roman',serif; color:#9CA3AF; font-weight:600; margin-right:6px; }
    .doc-duo-item p { font-size:0.82rem; line-height:1.85; color:#374151; margin:0; }
    .doc-finder { margin:14px 0; border-radius:14px; border:1px solid #EEEFF2; background:#FAFAF9; padding:12px 16px; }
    .doc-finder h4 { font-size:0.75rem; font-weight:700; color:#6B7280; letter-spacing:0.05em; margin-bottom:9px; }
    .doc-fmap { display:flex; flex-wrap:wrap; gap:7px; }
    .doc-fpair { display:inline-flex; align-items:center; gap:6px; font-size:0.78rem; color:#374151; background:#fff; border:1px solid #E5E7EB; border-radius:999px; padding:2px 10px; }
    .doc-fpair strong { font-weight:600; color:#111827; }
    .doc-farrow { color:#D1D5DB; }
    .doc-quote { margin:14px 0 4px; padding:4px 0 4px 20px; border-left:2px solid #FFD700; font-family:'Noto Serif SC','STZhongsong',serif; font-size:1rem; color:#92400E; line-height:1.9; }
    .doc-minis { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:14px 0; }
    .doc-mini { border-radius:14px; padding:14px 16px; border:1px solid #EDEEF0; background:#FAFAF9; }
    .doc-mini h4 { font-size:0.82rem; font-weight:700; color:#B91C1C; margin-bottom:6px; }
    .doc-mini p { font-size:0.8rem; line-height:1.8; color:#374151; margin:0; }
```

- [ ] **Step 3b: 媒体查询补充变体响应式**

将媒体查询块（Task 1 Step 2 已改为仅 `.doc-card` 一行）补充为：

```css
    @media (max-width:640px) {
      .doc-card { padding:26px 20px; }
      .doc-duo { grid-template-columns:1fr; }
      .doc-minis { grid-template-columns:1fr; }
    }
```

- [ ] **Step 4: 15 处 doc-h3 改徽章式**

逐一将以下 doc-h3（保留原标题文字，编号移入徽章）：

| 行 | 原 | 新 |
|---|---|---|
| L165 | `<h3 class="doc-h3">1.1 页面导航</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">1.1</span>页面导航</h3>` |
| L352 | `<h3 class="doc-h3">1.2 权限体系</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">1.2</span>权限体系</h3>` |
| L408 | `<h3 class="doc-h3">3.1 角色总览</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">3.1</span>角色总览</h3>` |
| L415 | `<h3 class="doc-h3">3.2 条块双线</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">3.2</span>条块双线</h3>` |
| L428 | `<h3 class="doc-h3">3.3 两个执行角色：组织者与深度参与者</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">3.3</span>两个执行角色：组织者与深度参与者</h3>` |
| L437 | `<h3 class="doc-h3">3.4 活动走谁的门</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">3.4</span>活动走谁的门</h3>` |
| L446 | `<h3 class="doc-h3">3.5 专班走谁的门</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">3.5</span>专班走谁的门</h3>` |
| L455 | `<h3 class="doc-h3">3.6 普通成员</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">3.6</span>普通成员</h3>` |
| L467 | `<h3 class="doc-h3">4.1 这个组织靠什么运作</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">4.1</span>这个组织靠什么运作</h3>` |
| L479 | `<h3 class="doc-h3">4.2 活动与专班：两种工作，两种节奏</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">4.2</span>活动与专班：两种工作，两种节奏</h3>` |
| L494 | `<h3 class="doc-h3">4.3 扁平化：不靠级别，靠协商</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">4.3</span>扁平化：不靠级别，靠协商</h3>` |
| L506 | `<h3 class="doc-h3">4.4 职能线与小组线</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">4.4</span>职能线与小组线</h3>` |
| L521 | `<h3 class="doc-h3">4.5 普通成员：参与与监督</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">4.5</span>普通成员：参与与监督</h3>` |
| L544 | `<h3 class="doc-h3">5.1 前中后台分层</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">5.1</span>前中后台分层</h3>` |
| L558 | `<h3 class="doc-h3">5.2 技术栈</h3>` | `<h3 class="doc-h3"><span class="doc-h3-badge">5.2</span>技术栈</h3>` |

- [ ] **Step 5: 验证**

浏览器刷新 `http://localhost:8000/help.html`，Expected: 所有小节标题左侧出现红色圆角编号徽章，标题文字右移；布局无断裂。
Run: `grep -c "doc-h3-badge" docs/help.html` → Expected: 16（15 处 HTML + 1 处样式定义）

- [ ] **Step 6: Commit**

```bash
git add docs/help.html
git commit -m "docs(help): T-201 正文版式样式（要点卡/对比卡/查找卡/引语/理念卡）+ 15 处小节编号徽章"
```

---

### Task 3: 章眉导语 + 第二章理念卡

**Files:**
- Modify: `docs/help.html:391-396`（第二章）

- [ ] **Step 1: 第二章正文重组**

将 L391-396 的两个 doc-p 段落：

```html
        <p class="doc-p">
          这个系统是北京大学光华管理学院本科生党支部的数字化管理工具。它要解决的核心问题是：党支部工作如何从"人治"走向"制度治理"？支委换届频繁，经验随人走、制度随人变；新支委上任后需要数月摸索才能上手；同一种工作在不同人手里做法完全不同——本系统通过<strong>制度即代码、角色即视图、经验可传承</strong>三大设计理念，将党支部制度文本转化为可执行的代码工作流。
        </p>
        <p class="doc-p">
          系统现有 14 个页面：首页、资料查询、意见反馈、归档库等公共页面，以及六类角色各自的工作台（党支书、党小组组长、组织委员、宣传委员、纪检委员、普通成员）。每个角色打开自己的工作台，就是该角色的全部工作视图——各项功能按 Tab 分组，无需在页面之间来回跳转；所有角色共享同一套数据，看到的是同一数据的不同视角。
        </p>
```

替换为：

```html
        <p class="doc-p doc-lead">
          这个系统是北京大学光华管理学院本科生党支部的数字化管理工具——把党支部制度文本转化为可执行的代码工作流，让工作不随人走。
        </p>
        <p class="doc-p">
          它要解决的核心问题是：党支部工作如何从"人治"走向"制度治理"？支委换届频繁，经验随人走、制度随人变；新支委上任后需要数月摸索才能上手；同一种工作在不同人手里做法完全不同。围绕这个问题，系统展开三个理念：
        </p>
        <div class="doc-minis">
          <div class="doc-mini"><h4>制度即代码</h4><p>把制度文本转化为可执行的代码工作流，让工作不依赖某个人。</p></div>
          <div class="doc-mini"><h4>角色即视图</h4><p>每个角色打开工作台就是该角色的全部工作视图，无需来回跳转。</p></div>
          <div class="doc-mini"><h4>经验可传承</h4><p>复盘与归档沉淀经验，让新支委快速上手、制度随届接续。</p></div>
        </div>
        <p class="doc-p">
          系统现有 14 个页面：首页、资料查询、意见反馈、归档库等公共页面，以及六类角色各自的工作台（党支书、党小组组长、组织委员、宣传委员、纪检委员、普通成员）。每个角色打开自己的工作台，就是该角色的全部工作视图——各项功能按 Tab 分组，无需在页面之间来回跳转；所有角色共享同一套数据，看到的是同一数据的不同视角。
        </p>
```

- [ ] **Step 2: 三、四、五章章眉导语**

在以下各章 doc-divider 后（现有 doc-p 之前）插入 doc-lead 导语：

第三章（L403 的 doc-p 之前）插入：
```html
        <p class="doc-p doc-lead">
          这套系统的 8 种身份分三层理解——上层管全局、中层两条线、下层成员与执行角色。每一层的职责，由制度与赋权定义。
        </p>
```
（原 L403-405 的 doc-p 段落删除，内容并入导语。）

第四章（L465 前，即 doc-divider 之后）插入：
```html
        <p class="doc-p doc-lead">
          这个组织靠<strong>分工、协商、记录</strong>三件事运转，而不是级别。下面五节，讲清它是怎么运转的。
        </p>
```

第五章（L542 后，即 doc-divider 之后）插入：
```html
        <p class="doc-p doc-lead">
          系统采用纯前端静态架构，无需后端部署。以下两层讲清代码与制度的关系。
        </p>
```

- [ ] **Step 3: 验证**

浏览器刷新，Expected: 第二/三/四/五章章首出现灰色导语段；第二章三大理念显示为三个并排浅灰卡；窄屏下单列。
Run: `grep -c "doc-lead" docs/help.html` → Expected: 5（快速上手原有 1 + 新增 4）

- [ ] **Step 4: Commit**

```bash
git add docs/help.html
git commit -m "docs(help): T-201 章眉导语（二三五四章）+ 第二章三大理念卡"
```

---

### Task 4: 第三章版式改造

**Files:**
- Modify: `docs/help.html:410-458`（3.1 注记 / 3.2 / 3.3 / 3.4 / 3.5 / 3.6）

- [ ] **Step 1: 3.1 注记改要点卡**

将 L410-412：
```html
        <p class="doc-p" style="font-size:0.9rem; color:#6B7280;">
          组织者与深度参与者是<strong>扁平化执行角色</strong>，服务活动也服务专班，由党小组组长（活动）或组织委员（专班）赋权产生。
        </p>
```
替换为：
```html
        <div class="doc-key">组织者与深度参与者是<strong>扁平化执行角色</strong>，服务活动也服务专班，由党小组组长（活动）或组织委员（专班）赋权产生。</div>
```

- [ ] **Step 2: 3.2 条块双线改对比卡**

将 L416-424：
```html
        <p class="doc-p">
          纵线是支委的职能线：组织委员管发展党员与专班统筹、宣传委员管宣传档案、纪检委员管考勤考察——各管一类专业事务。
        </p>
        <p class="doc-p">
          横线是党小组组长的小组线：按就业/学术方向划分小组，负责组织学习、开展活动。
        </p>
        <p class="doc-p">
          两条线交汇于党支书——全局统筹与最终决策者。
        </p>
```
替换为：
```html
        <div class="doc-duo">
          <div class="doc-duo-item"><h4><span class="dv">纵</span>职能线</h4><p>支委的职能线：组织委员管发展党员与专班统筹、宣传委员管宣传档案、纪检委员管考勤考察——各管一类专业事务。</p></div>
          <div class="doc-duo-item"><h4><span class="dv">横</span>小组线</h4><p>党小组组长的小组线：按就业/学术方向划分小组，负责组织学习、开展活动。</p></div>
        </div>
        <p class="doc-p">
          两条线交汇于党支书——全局统筹与最终决策者。
        </p>
```

- [ ] **Step 3: 3.3 改要点卡**

将 L429-434：
```html
        <p class="doc-p">
          组织者与深度参与者是推动工作扁平化的两种角色，服务活动也服务专班，由赋权产生。
        </p>
        <p class="doc-p">
          两者之间<strong>没有上下级关系，只是分工不同</strong>：组织者是项目的脑子，负责分工记录与协调；深度参与者是项目的手，负责执行具体工作、提交交付物。
        </p>
```
替换为：
```html
        <p class="doc-p">
          组织者与深度参与者是推动工作扁平化的两种角色，服务活动也服务专班，由赋权产生。
        </p>
        <div class="doc-key">两者之间<strong>没有上下级关系，只是分工不同</strong>：组织者是项目的脑子，负责分工记录与协调；深度参与者是项目的手，负责执行具体工作、提交交付物。</div>
```

- [ ] **Step 4: 3.4 / 3.5 改对比卡**

将 L438-452（3.4 两段 + 3.5 两段）：
```html
        <p class="doc-p">
          党小组组长是活动的天然写入者——创建活动、向组织者赋权；组织者做好分工记录，深度参与者执行分工。
        </p>
        <p class="doc-p">
          活动的考勤归纪检委员、宣传归宣传委员——一件事从创建到归档，门门有对。
        </p>

        <!-- 3.5 专班走谁的门 -->
        <h3 class="doc-h3"><span class="doc-h3-badge">3.5</span>专班走谁的门</h3>
        <p class="doc-p">
          发起人（书记/党小组组长/支委）提出需求，由组织委员统一招募统筹——<strong>唯一专班管理节点</strong>；招募赋权组织者与深度参与者，任务完成即解散。
        </p>
        <p class="doc-p">
          活动与专班走不同的门：活动的门在党小组组长，专班的门在组织委员。
        </p>
```
替换为：
```html
        <div class="doc-duo">
          <div class="doc-duo-item"><h4><span class="dv">活动</span>走党小组组长</h4><p>党小组组长是活动的天然写入者——创建活动、向组织者赋权；组织者做好分工记录，深度参与者执行分工。活动的考勤归纪检委员、宣传归宣传委员——一件事从创建到归档，门门有对。</p></div>
          <div class="doc-duo-item"><h4><span class="dv">专班</span>走组织委员</h4><p>发起人（书记/党小组组长/支委）提出需求，由组织委员统一招募统筹——<strong>唯一专班管理节点</strong>；招募赋权组织者与深度参与者，任务完成即解散。</p></div>
        </div>
        <p class="doc-p">
          活动与专班走不同的门：活动的门在党小组组长，专班的门在组织委员。
        </p>
```

- [ ] **Step 5: 3.6 改要点卡**

将 L456-458：
```html
        <p class="doc-p">
          普通成员以只读方式查看活动动态、专班进展与考勤概况——不参与管理，但有知情权与监督权。
        </p>
```
替换为：
```html
        <div class="doc-key">普通成员以只读方式查看活动动态、专班进展与考勤概况——不参与管理，但有<strong>知情权与监督权</strong>。</div>
```

- [ ] **Step 6: 验证**

浏览器刷新，Expected: 3.1 注记变红条要点卡；3.2 两条线双列卡；3.3/3.6 要点卡；3.4/3.5 双列对比卡（活动 vs 专班），3.4 与 3.5 标题仍为独立小节。
Run: `grep -c "doc-key" docs/help.html` → 人工核对：样式 1 + HTML（3.1/3.3/3.6）= 4
Run: `grep -c "doc-duo" docs/help.html` → 人工核对：样式 1 + HTML（3.2 与 3.4 两个 `.doc-duo` 容器 + 4 个 `.doc-duo-item`）= 7

- [ ] **Step 7: Commit**

```bash
git add docs/help.html
git commit -m "docs(help): T-201 第三章版式（3.1/3.3/3.6 要点卡·3.2/3.4/3.5 对比卡）"
```

---

### Task 5: 第四章版式改造

**Files:**
- Modify: `docs/help.html:468-530`（4.1 / 4.2 / 4.3 / 4.4 / 4.5）

- [ ] **Step 1: 4.1 改要点卡**

将 L468-476（4.1 三段）：
```html
        <p class="doc-p">
          这个组织靠<strong>分工、协商、记录</strong>三件事运转，而不是级别：谁做什么由制度定好，组织者与深度参与者之间平等协商，做的过程有记录可查。
        </p>
        <p class="doc-p">
          支委换届频繁、经验容易随人走，制度因此比个人可靠——工作不依赖某个人，才能一届一届接续下去。
        </p>
        <p class="doc-p">
          你在这里的位置，由"你在做什么事"决定：承担了组织者的活就是组织者，年级与政治面貌不决定你是否胜任。
        </p>
```
替换为：
```html
        <div class="doc-key">这个组织靠<strong>分工、协商、记录</strong>三件事运转，而不是级别：谁做什么由制度定好，组织者与深度参与者之间平等协商，做的过程有记录可查。</div>
        <p class="doc-p">
          支委换届频繁、经验容易随人走，制度因此比个人可靠——工作不依赖某个人，才能一届一届接续下去。
        </p>
        <p class="doc-p">
          你在这里的位置，由"你在做什么事"决定：承担了组织者的活就是组织者，年级与政治面貌不决定你是否胜任。
        </p>
```

- [ ] **Step 2: 4.2 改对比卡**

将 L480-491（4.2 四段）：
```html
        <p class="doc-p">
          活动是支部的<strong>常规节奏</strong>：固定时间地点、面向全体、重在参与与规范，党小组是基本单元。
        </p>
        <p class="doc-p">
          专班是支部的<strong>攻坚方式</strong>：临时组建、小范围抽调、重产出，任务完成即解散；同时是考察积极分子的载体。
        </p>
        <p class="doc-p">
          两种工作分开管理、走不同的赋权流程——常规的组织生活需要稳定节奏，而时效紧、跨角色、不可拆分的任务需要集中攻坚。
        </p>
        <p class="doc-p">
          你在其中：活动的组织者做好分工记录；专班参与者是经组织委员统筹、从小组抽调的攻坚成员。
        </p>
```
替换为：
```html
        <div class="doc-duo">
          <div class="doc-duo-item"><h4><span class="dv">常规</span>活动</h4><p>支部的常规节奏：固定时间地点、面向全体、重在参与与规范，党小组是基本单元。</p></div>
          <div class="doc-duo-item"><h4><span class="dv">攻坚</span>专班</h4><p>支部的攻坚方式：临时组建、小范围抽调、重产出，任务完成即解散；同时是考察积极分子的载体。</p></div>
        </div>
        <p class="doc-p">
          两种工作分开管理、走不同的赋权流程——常规的组织生活需要稳定节奏，而时效紧、跨角色、不可拆分的任务需要集中攻坚。
        </p>
        <p class="doc-p">
          你在其中：活动的组织者做好分工记录；专班参与者是经组织委员统筹、从小组抽调的攻坚成员。
        </p>
```

- [ ] **Step 3: 4.3 改要点卡**

将 L495-503（4.3 三段）：
```html
        <p class="doc-p">
          组织者不是"领导"——核心职能是<strong>做好分工记录</strong>，不靠命令压人；深度参与者不是"下属"——执行的是协商后的分工。
        </p>
        <p class="doc-p">
          扁平化让每个人——包括积极分子——都有机会承担建设性工作；身份、年级、政治面貌都不决定是否胜任。
        </p>
        <p class="doc-p">
          被赋权为组织者，你的价值在"记录好分工"；被赋权为深度参与者，你的价值在"把交付物做好"。
        </p>
```
替换为：
```html
        <div class="doc-key">组织者不是<strong>"领导"</strong>——核心职能是做好分工记录，不靠命令压人；深度参与者不是"下属"——执行的是协商后的分工。</div>
        <p class="doc-p">
          扁平化让每个人——包括积极分子——都有机会承担建设性工作；身份、年级、政治面貌都不决定是否胜任。
        </p>
        <p class="doc-p">
          被赋权为组织者，你的价值在"记录好分工"；被赋权为深度参与者，你的价值在"把交付物做好"。
        </p>
```

- [ ] **Step 4: 4.4 改对比卡 + 查找卡 + 金色引语**

将 L507-518（4.4 四段）：
```html
        <p class="doc-p">
          这套系统的中间层有两条线。一条是支委的职能线：组织委员管发展党员与专班统筹，宣传委员管宣传档案，纪检委员管考勤考察——三委员各管一摊专业事务，纵向穿透所有党小组。
        </p>
        <p class="doc-p">
          另一条是党小组组长的小组线：按就业/学术方向划分小组，组织党小组活动——每个小组横向覆盖自己的成员。
        </p>
        <p class="doc-p">
          两条线在书记处交汇，需要协调的事务在书记处汇总。遇到具体事务找谁，看的是该事务的职责归属：发展党员找组织委员，宣传报道找宣传委员，考勤考察找纪检委员，本组学习与活动找党小组组长。
        </p>
        <p class="doc-p">
          "条"与"块"是理解这套权责关系的两把尺子——从职能视角看是"条"，从单元视角看是"块"；谁做什么，由职责定义决定。
        </p>
```
替换为：
```html
        <div class="doc-duo">
          <div class="doc-duo-item"><h4><span class="dv">纵</span>职能线</h4><p>组织委员管发展党员与专班统筹，宣传委员管宣传档案，纪检委员管考勤考察——三委员各管一摊专业事务，纵向穿透所有党小组。</p></div>
          <div class="doc-duo-item"><h4><span class="dv">横</span>小组线</h4><p>党小组组长按就业/学术方向划分小组，组织党小组活动——每个小组横向覆盖自己的成员。</p></div>
        </div>
        <p class="doc-p">
          两条线在书记处交汇，需要协调的事务在书记处汇总。
        </p>
        <div class="doc-finder">
          <h4>遇到具体事务找谁</h4>
          <div class="doc-fmap">
            <span class="doc-fpair"><strong>发展党员</strong><span class="doc-farrow">→</span>组织委员</span>
            <span class="doc-fpair"><strong>宣传报道</strong><span class="doc-farrow">→</span>宣传委员</span>
            <span class="doc-fpair"><strong>考勤考察</strong><span class="doc-farrow">→</span>纪检委员</span>
            <span class="doc-fpair"><strong>本组学习活动</strong><span class="doc-farrow">→</span>党小组组长</span>
          </div>
        </div>
        <div class="doc-quote">"条"与"块"是理解这套权责关系的两把尺子——从职能视角看是"条"，从单元视角看是"块"。谁做什么，由职责定义决定。</div>
```

- [ ] **Step 5: 4.5 改要点卡**

将 L522-530（4.5 三段）：
```html
        <p class="doc-p">
          不参与管理不等于没有位置：你有<strong>知情权</strong>（活动动态/专班进展/考勤概况）与<strong>监督权</strong>。
        </p>
        <p class="doc-p">
          支部工作对每个成员公开，参与感建立在了解之上。
        </p>
        <p class="doc-p">
          按通知参与，用知情与监督行使你的位置。
        </p>
```
替换为：
```html
        <div class="doc-key">不参与管理不等于没有位置：你有<strong>知情权</strong>（活动动态/专班进展/考勤概况）与<strong>监督权</strong>。</div>
        <p class="doc-p">
          支部工作对每个成员公开，参与感建立在了解之上。
        </p>
        <p class="doc-p">
          按通知参与，用知情与监督行使你的位置。
        </p>
```

- [ ] **Step 6: 验证**

浏览器刷新，Expected: 4.1/4.3/4.5 要点卡；4.2 常规 vs 攻坚对比卡；4.4 纵/横对比卡 + 「遇到具体事务找谁」chips 卡 + 金色引语；收尾 doc-note 保留。
Run: `grep -c "doc-quote" docs/help.html` → Expected: 2（1 处 HTML + 1 处样式定义）
Run: `grep -c "doc-finder" docs/help.html` → Expected: 2

- [ ] **Step 7: Commit**

```bash
git add docs/help.html
git commit -m "docs(help): T-201 第四章版式（4.1/4.3/4.5 要点卡·4.2 对比卡·4.4 对比+查找+金色引语）"
```

---

### Task 6: 版本 bump + 总验证 + 归档

**Files:**
- Modify: `docs/help.html:585`（版本号）

- [ ] **Step 1: 版本号 bump**

将 L585：
```html
<script type="module" src="./src/entries/help-entry.js?v=20260803g"></script>
```
替换为：
```html
<script type="module" src="./src/entries/help-entry.js?v=20260803h"></script>
```

- [ ] **Step 2: 全页总验证**

Run: `cd docs && python -m http.server 8000`（若未在运行），浏览器打开 `http://localhost:8000/help.html`，逐节检查：
1. 1.1 矩阵：4 行 × 6 列，书记列置后；chip 点击跳转（组长→leader.html、组织→org.html、宣传→prop.html、纪检→disc.html、书记→secretary.html、成员/公共→index.html 等）；窄屏横滑。
2. 小节徽章：15 处红色编号徽章正常。
3. 章眉导语：第二/三/四/五章各有灰导语。
4. 变体卡：三/四章要点卡、对比卡、查找卡、引语分布符合 spec 3.3 映射；无多余颜色（仅红/金/灰）。
5. 右侧圆点 TOC 滚动高亮正常（未改动）。
6. 致谢、免责声明、1.2 表格、5.1/5.2 原样。

Run: `grep -n "quick-card\|quick-grid\|quick-group-title\|?v=20260803g" docs/help.html` → Expected: 无输出（全部清理）
Run: `grep -c "qn-matrix" docs/help.html` → Expected: 2（样式定义 + HTML 使用）

- [ ] **Step 3: GetDiagnostics + 浏览器截图**

Run: 对 `docs/help.html` 执行 GetDiagnostics，Expected: 无错误。浏览器截图确认整体观感。

- [ ] **Step 4: Commit**

```bash
git add docs/help.html
git commit -m "docs(help): T-201 help 页视觉再设计落地（矩阵 v4 + 正文风格 A 纯化）+ 版本 bump v20260803h"
```

- [ ] **Step 5: 书记审阅**

将最终页面推送给书记浏览器审阅（`http://localhost:8000/help.html`），等待批准；获准后归档执行日志（`.ctx/logs/2026-08-EXECUTION_LOG.md` 增 T-201 条目）并更新 CLAUDE.md 乙部记录（如需）。
