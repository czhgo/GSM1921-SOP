---
title: "条条支委组织建设职能强化设计"
type: governance
audience:
  - 支委会
  - 党小组组长
  - AI Agent 开发者
  - 项目维护者
owner: "支委会"
role: "[人机]"
last_updated: "2026-05-03"
status: active
source_task: "ROADMAP §八 P2 E3"
input:
  - content/guides/ORGANIZATION_BUILDING_MODULE.md (E1 — 组织建设模块架构)
  - content/guides/MANAGEMENT_MODE_ARCHITECTURE.md (E2 — 三级管理模式)
  - content/SOP/纪检委员工作流程指南.md
  - content/SOP/组织委员工作流程指南.md
  - content/SOP/宣传委员工作流程指南.md
---

# 条条支委组织建设职能强化设计

> 本文档在 E1（组织建设模块架构）和 E2（三级管理模式）的基础上，为 纪检/组织/宣传 三位条条支委设计在组织建设模块中的权限体系、操作入口与协作流程。
> 定位：[人机] — 人类决策参考 + AI 自主读取作为实施上下文。

---

## 一、设计背景与依据

### 1.1 问题缘起

E1 定义了组织建设模块的四项子功能（发展党员追踪、补课制度跟踪、意见反馈管理、公邮查收提醒），E2 定义了三级管理模式（组织者/深度参与者/普通参与者）的权限矩阵。

**缺口：** 三位条条支委在组织建设模块中各有什么权限？从哪里进入？如何协作？这些问题尚未被系统性地回答。

### 1.2 设计目标

| 目标 | 说明 |
|------|------|
| **权限明确** | 每位支委在组织建设模块中各能做什么、不能做什么，边界清晰 |
| **入口自然** | 支委从侧边栏进入"党务管理"后，系统自动识别角色并展示对应功能面板 |
| **协作闭环** | 三委之间的数据交接（纪检→组织、纪检→宣传）在系统内自动流转 |
| **最小侵入** | 不修改现有 module-tab 切换逻辑和角色卡片体系，以扩展方式设计 |

---

## 二、支委权限矩阵（组织建设域）

### 2.1 权限定义

基于 E2 §二「角色权限矩阵」([MANAGEMENT_MODE_ARCHITECTURE.md L122-L141](file:///d:/GitHub/GSM1921-SOP/content/guides/MANAGEMENT_MODE_ARCHITECTURE.md#L122-L141))，提取并细化三位支委在组织建设模块中的权限：

| 操作 | 纪检委员 | 组织委员 | 宣传委员 |
|------|:---:|:---:|:---:|
| **发展党员追踪看板** | | | |
| 查看全量候选人列表 | Y(审计) | Y(建档) | Y(备案) |
| 修改候选人阶段状态 | — | Y | — |
| 上传/更新材料 | — | Y | — |
| 标记材料缺失并提醒 | Y(督办) | Y(催缴) | — |
| **补课制度跟踪** | | | |
| 查看补课任务列表 | Y | Y | — |
| 标记补课完成 | Y | — | — |
| 回写考勤记录 | Y | — | — |
| 导出补课统计 | Y | Y | — |
| **意见反馈管理** | | | |
| 查看反馈列表 | Y(维护) | Y | — |
| 更新反馈状态（流转） | — | — | — |
| 关闭/归档反馈 | — | — | — |
| **公邮查收提醒** | | | |
| 确认查收 + 重置计时器 | Y | — | — |
| 查看查收历史 | Y | Y | — |
| **合规文件引用区** | | | |
| 查看文件内容（只读） | Y | Y | Y |
| 添加/移除文件引用 | — | Y | — |
| **数据汇总与导出** | | | |
| 汇总参与记录 | Y(汇总) | — | — |
| 提交至组织委员 | Y(发起) | — | — |
| 接收并建档 | — | Y(建档) | — |
| 汇总考勤记录 | Y | — | — |
| 提交至宣传委员 | Y(发起) | — | — |
| 接收并备案 | — | — | Y(备案) |
| **模块配置** | | | |
| 修改组织建设模块设置 | — | Y | — |

> **权限继承声明：** 支部书记拥有上述全部权限（Y(全局)），此表中不重复列出。
> **意见反馈特殊规则：** 依据 [纪检委员工作流程指南 §4.2](file:///d:/GitHub/GSM1921-SOP/content/SOP/纪检委员工作流程指南.md#L276-L289)，意见建议由支部书记全权处理，任何支委（含纪检委员）不得干预反馈内容流转。因此反馈状态流转权限仅限支部书记。

### 2.2 权限色系编码

在 UI 层面复用 E2 §六定义的 5 色系视觉编码方案：

| 角色 | 色系 | 色值 | 面板顶部色条 |
|------|------|------|------------|
| 纪检委员 | 琥珀色 | #D97706 | `.commissioner-tab[data-commissioner="inspector"]` |
| 组织委员 | 蓝色 | #3B82F6 | `.commissioner-tab[data-commissioner="organizer"]` |
| 宣传委员 | 翠绿色 | #10B981 | `.commissioner-tab[data-commissioner="publicity"]` |

---

## 三、操作入口设计

### 3.1 入口架构全景

```
                        侧边栏
                          |
          +---------------+---------------+
          |               |               |
     [推演工作台]    [参考指南]    [模板与资产]
          |
   [角色卡片区]                    [党务管理] ◀── 组织建设域统一入口
          |                              |
    +-----+-----+              +---------+---------+
    |           |              |         |         |
  参与视图   管理视图      纪检面板  组织面板  宣传面板
                           (琥珀色)  (蓝色)   (翠绿色)
```

### 3.2 入口触发逻辑

```
用户点击 [党务管理] module-tab
          |
          v
系统检查当前 activeRole
          |
  +-------+--------+--------+
  |                |        |
纪检委员         组织委员  宣传委员/其他
  |                |        |
  v                v        v
展示纪检面板    展示组织面板  展示默认概览面板
(补课跟踪+      (发展党员+    (四宫格空状态
 公邮提醒+      材料催缴+     或只读概览)
 参与汇总)      合规文件)
```

### 3.3 面板内子导航（Tab Bar）

每位支委的面板内部采用二级 tab bar 切换子功能，与 [index.html](file:///d:/GitHub/GSM1921-SOP/index.html) 现有 SPA 导航模式一致：

#### 纪检委员面板

```
┌────────────────────────────────────────────────────┐
│ [补课跟踪]  [公邮提醒]  [参与汇总]  [复盘督办]       │ ← 琥珀色 tab bar
├────────────────────────────────────────────────────┤
│                                                    │
│  （当前选中 tab 的内容区域）                          │
│                                                    │
└────────────────────────────────────────────────────┘
```

| 子 Tab | 功能 | 关键交互 |
|--------|------|---------|
| 补课跟踪 | 缺勤→补课任务列表→标记完成→回写考勤 | 点击"标记已补"按钮，自动回写 Attendance 表 |
| 公邮提醒 | 上次查收时间 + 距下次查收倒计时 + 查收确认 | 点击"确认查收"，重置 timer，记录日志 |
| 参与汇总 | 本月三层参与记录列表 + 一键提交至组织委员 | 点击"提交至组织委员"，触发数据推送 + 通知 |
| 复盘督办 | 待复盘活动列表 + T+7 截止倒计时 + 催促操作 | 点击"提醒组织者"，记录督办日志 |

#### 组织委员面板

```
┌────────────────────────────────────────────────────┐
│ [发展党员]  [材料催缴]  [思想汇报]  [合规文件]       │ ← 蓝色 tab bar
├────────────────────────────────────────────────────┤
│                                                    │
│  （当前选中 tab 的内容区域）                          │
│                                                    │
└────────────────────────────────────────────────────┘
```

| 子 Tab | 功能 | 关键交互 |
|--------|------|---------|
| 发展党员 | 五阶段进度看板（含每个候选人的阶段+材料清单） | 点击候选人卡片 → 展开材料清单 → 更新阶段 |
| 材料催缴 | 待提交材料列表 + 截止日期 + 催缴操作 | 点击"发送催缴提醒"（通知由支书/块块组长发出） |
| 思想汇报 | 季度统计表 + 接收纪检转交的新汇报 + 归档 | 点击"确认归档"，更新提交率统计 |
| 合规文件 | 引用渲染区（读取 `content/references/` 只读展示） | 点击文件名称 → 展开只读渲染内容 |

#### 宣传委员面板

```
┌────────────────────────────────────────────────────┐
│ [档案归档]  [材料标准]  [模板管理]  [周报报送]       │ ← 翠绿色 tab bar
├────────────────────────────────────────────────────┤
│                                                    │
│  （当前选中 tab 的内容区域）                          │
│                                                    │
└────────────────────────────────────────────────────┘
```

| 子 Tab | 功能 | 关键交互 |
|--------|------|---------|
| 档案归档 | 支部大会/支委会档案列表 + 接收纪检考勤备案 | 点击"确认备案"，归档至档案系统 |
| 材料标准 | 宣传材料格式规范（照片/文字/排版）只读查阅 | 静态展示 [宣传委员工作流程指南 §3.4](file:///d:/GitHub/GSM1921-SOP/content/SOP/宣传委员工作流程指南.md#L284-L313) |
| 模板管理 | 申报材料模板库预览 + 下载入口 | 卡片式模板预览，点击下载/复制链接 |
| 周报报送 | 每周报送状态 + 历史报送记录 + 截图上传 | 点击"确认报送"，上传截图验收 |

### 3.4 默认概览面板（非支委用户）

当非条条支委用户（党小组组长、深度参与者、普通参与者）点击 [党务管理] 时，展示只读概览面板：

```
┌────────────────────────────────────────────────────┐
│ 党务管理概览                           [权限: 只读] │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ 发展党员  │  │ 补课进度  │  │ 意见建议  │         │
│  │          │  │          │  │          │         │
│  │ 在途: N人│  │ 完成率:% │  │ 待处理:N │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                    │
│  详细操作请联系:                                     │
│  · 发展党员 → 组织委员 侯嘉嵘                        │
│  · 补课制度 → 纪检委员 韩思宁                        │
│  · 宣传档案 → 宣传委员 闫鑫岳                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 四、三委协作数据流

### 4.1 月度闭环流程

```
   ┌─────────────┐
   │   活动结束   │
   └──────┬──────┘
          │
          v
   ┌─────────────────────────────────────────────┐
   │ 纪检委员 [参与汇总] tab                        │
   │                                             │
   │ ① 确认本月所有活动的三层参与记录               │
   │ ② 确认本月所有三会一课的考勤记录               │
   │ ③ 点击「提交至组织委员」（参与记录）            │
   │ ④ 点击「提交至宣传委员」（考勤记录）            │
   └────┬───────────────────┬────────────────────┘
        │                   │
        v                   v
   ┌──────────────┐   ┌──────────────┐
   │ 组织委员      │   │ 宣传委员      │
   │ [思想汇报]    │   │ [档案归档]    │
   │              │   │              │
   │ ⑤ 接收参与   │   │ ⑦ 接收考勤   │
   │    记录并建档 │   │    记录并备案 │
   │ ⑥ 确认归档   │   │ ⑧ 确认归档   │
   └──────┬───────┘   └──────────────┘
          │
          v
   ┌─────────────────────────────────────────────┐
   │ 组织委员 [发展党员] tab                        │
   │                                             │
   │ ⑨ 更新候选人参与统计（基于刚归档的参与记录）    │
   │ ⑩ 检查材料完整性 → 必要时触发 [材料催缴]       │
   └─────────────────────────────────────────────┘
```

### 4.2 数据交接协议

| 方向 | 数据内容 | 触发方式 | 通知机制 |
|------|---------|---------|---------|
| 纪检 → 组织 | 本月三层参与记录 (JSON) | 纪检点击「提交至组织委员」 | 组织面板 [思想汇报] tab badge +1 |
| 纪检 → 宣传 | 本月考勤记录 (JSON) | 纪检点击「提交至宣传委员」 | 宣传面板 [档案归档] tab badge +1 |
| 组织 → 纪检 | 补课需求回执（哪些人需重点跟踪） | 组织标记材料缺失后 | 纪检面板 [补课跟踪] 高亮相关人员 |
| 宣传 → 纪检 | 考勤备案确认回执 | 宣传确认备案后 | 纪检面板状态更新为"已备案" |

---

## 五、与现有界面的集成方案

### 5.1 HTML 结构变更（基于 E1 §5.1 方案 A 扩展）

在 E1 定义的 `view-section#view-party` 内部，增加支委角色判定逻辑与子 tab 结构：

```html
<section id="view-party" class="view-section hidden">
  <div class="max-w-6xl mx-auto">

    <!-- 角色判定区：根据 activeRole 动态渲染不同面板 -->
    <!-- data-role 值: inspector / organizer / publicity / default -->

    <!-- 纪检委员面板 -->
    <div id="panel-inspector" class="commissioner-panel hidden" data-commissioner="inspector">
      <div class="commissioner-tab-bar">
        <button class="commissioner-tab active" data-subtab="makeup">补课跟踪</button>
        <button class="commissioner-tab" data-subtab="mailbox">公邮提醒</button>
        <button class="commissioner-tab" data-subtab="participation">参与汇总</button>
        <button class="commissioner-tab" data-subtab="review-supervision">复盘督办</button>
      </div>
      <!-- 各 sub-tab 内容区 -->
    </div>

    <!-- 组织委员面板 -->
    <div id="panel-organizer" class="commissioner-panel hidden" data-commissioner="organizer">
      <div class="commissioner-tab-bar">
        <button class="commissioner-tab active" data-subtab="candidates">发展党员</button>
        <button class="commissioner-tab" data-subtab="material-remind">材料催缴</button>
        <button class="commissioner-tab" data-subtab="thought-report">思想汇报</button>
        <button class="commissioner-tab" data-subtab="compliance">合规文件</button>
      </div>
      <!-- 各 sub-tab 内容区 -->
    </div>

    <!-- 宣传委员面板 -->
    <div id="panel-publicity" class="commissioner-panel hidden" data-commissioner="publicity">
      <div class="commissioner-tab-bar">
        <button class="commissioner-tab active" data-subtab="archives">档案归档</button>
        <button class="commissioner-tab" data-subtab="material-standards">材料标准</button>
        <button class="commissioner-tab" data-subtab="template-mgmt">模板管理</button>
        <button class="commissioner-tab" data-subtab="weekly-report">周报报送</button>
      </div>
      <!-- 各 sub-tab 内容区 -->
    </div>

    <!-- 默认概览面板（非支委用户） -->
    <div id="panel-default" class="commissioner-panel" data-commissioner="default">
      <!-- 只读四宫格概览 + 联系方式 -->
    </div>

  </div>
</section>
```

### 5.2 JS 角色判定逻辑

```javascript
// 在 events.js 或 main.js 中，module-tab='party' 的切换逻辑中新增

case 'party':
  showViewSection('view-party');
  hideAllRoleMenus();
  renderCommissionerPanel(getActiveCommissioner());
  break;

function getActiveCommissioner() {
  // 从当前登录态/角色选择中判定
  // 优先级：activeRole 中的 commissioner 类型
  const role = State.activeRole;
  if (role === 'inspector') return 'inspector';
  if (role === 'organizer') return 'organizer';
  if (role === 'publicity') return 'publicity';
  return 'default';
}

function renderCommissionerPanel(commissioner) {
  // 隐藏所有 commissioner-panel
  document.querySelectorAll('.commissioner-panel').forEach(p => p.classList.add('hidden'));
  // 显示对应的
  document.querySelector(`[data-commissioner="${commissioner}"]`).classList.remove('hidden');
}
```

### 5.3 CSS 扩展

```css
/* commissioner-tab-bar — 复用现有 module-tab 样式 */
.commissioner-tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

.commissioner-tab {
  padding: 0.625rem 1.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.commissioner-tab.active {
  color: var(--text-primary);
  border-bottom-color: currentColor;
}

/* 各支委面板顶部色条 */
[data-commissioner="inspector"] .commissioner-tab.active {
  color: #D97706;
  border-bottom-color: #D97706;
}
[data-commissioner="organizer"] .commissioner-tab.active {
  color: #3B82F6;
  border-bottom-color: #3B82F6;
}
[data-commissioner="publicity"] .commissioner-tab.active {
  color: #10B981;
  border-bottom-color: #10B981;
}
```

---

## 六、实施优先级

| 优先级 | 编号 | 内容 | 依赖 | 预期产出 |
|--------|------|------|------|---------|
| **P0** | E3.1 | HTML：`view-party` 内嵌四面板骨架 | E1.1 | 四面板 DOM 结构就位 |
| **P0** | E3.2 | JS：角色判定 + 面板切换逻辑 | E3.1 | 点击 [党务管理] 后按角色展示对应面板 |
| **P1** | E3.3 | 纪检面板：补课跟踪 + 公邮提醒 子功能 | E3.2 | 补课列表 + 标记完成 + 回写考勤 |
| **P1** | E3.4 | 组织面板：发展党员看板 + 材料催缴 | E3.2 | 五阶段进度展示 + 催缴提醒 |
| **P1** | E3.5 | 宣传面板：档案归档 + 模板管理 | E3.2 | 档案列表 + 模板预览 |
| **P2** | E3.6 | 三委数据交接流：纪检→组织/纪检→宣传 | E3.3 + E3.4 + E3.5 | 月度提交→接收→归档 闭环 |
| **P3** | E3.7 | 默认概览面板（非支委用户只读） | E3.2 | 四宫格概览 + 支委联系方式 |

### 依赖链

```
E1.1 (HTML module-tab + view-section)
   └── E3.1 (四面板 HTML 骨架)
         └── E3.2 (角色判定 + 面板切换)
               ├── E3.3 (纪检面板)
               ├── E3.4 (组织面板)
               ├── E3.5 (宣传面板)
               └── E3.7 (默认概览)
                     └── E3.6 (三委数据交接)
```

### 门控规则

- E3.1 + E3.2 完成后，组织建设模块即可按角色展示差异化面板（含空状态骨架）
- 各支委面板（E3.3-E3.5）可并行开发，互不阻塞
- E3.6 的实现需同步更新 ROADMAP 钩稽矩阵（新增数据交接链路）
- 支部书记的超集权限在所有面板中自动生效（无需额外代码）

---

## 七、与现有文档的钩稽关系

| 本文档章节 | 引用的母本文档 | 引用类型 |
|-----------|-------------|---------|
| §二 权限矩阵 | [MANAGEMENT_MODE_ARCHITECTURE.md §二](file:///d:/GitHub/GSM1921-SOP/content/guides/MANAGEMENT_MODE_ARCHITECTURE.md#L122-L141) | 细化扩展 |
| §三 操作入口 | [ORGANIZATION_BUILDING_MODULE.md §2.3](file:///d:/GitHub/GSM1921-SOP/content/guides/ORGANIZATION_BUILDING_MODULE.md#L185-L195) | 落地实现 |
| §四 协作数据流 | [纪检委员工作流程指南 §3.3](file:///d:/GitHub/GSM1921-SOP/content/SOP/纪检委员工作流程指南.md#L234-L264) | 系统化 |
| §五 集成方案 | [ORGANIZATION_BUILDING_MODULE.md §5](file:///d:/GitHub/GSM1921-SOP/content/guides/ORGANIZATION_BUILDING_MODULE.md#L311-L377) | 逐行工程化 |

---

## 附录 A：支委角色判定源码映射

| 系统角色 | 侧边栏 CSS Class | data-commissioner 值 | 人名 |
|---------|-----------------|---------------------|------|
| 纪检委员 | `commissioner-card` | `inspector` | 韩思宁 |
| 组织委员 | `commissioner-card` | `organizer` | 侯嘉嵘 |
| 宣传委员 | `commissioner-card` | `publicity` | 闫鑫岳 |

---

## 附录 B：参考文档

- [ORGANIZATION_BUILDING_MODULE.md](file:///d:/GitHub/GSM1921-SOP/content/guides/ORGANIZATION_BUILDING_MODULE.md) — E1 组织建设模块架构
- [MANAGEMENT_MODE_ARCHITECTURE.md](file:///d:/GitHub/GSM1921-SOP/content/guides/MANAGEMENT_MODE_ARCHITECTURE.md) — E2 三级管理模式
- [纪检委员工作流程指南](file:///d:/GitHub/GSM1921-SOP/content/SOP/纪检委员工作流程指南.md)
- [组织委员工作流程指南](file:///d:/GitHub/GSM1921-SOP/content/SOP/组织委员工作流程指南.md)
- [宣传委员工作流程指南](file:///d:/GitHub/GSM1921-SOP/content/SOP/宣传委员工作流程指南.md)
- [ROLE_CLASSIFICATION.md](file:///d:/GitHub/GSM1921-SOP/content/guides/ROLE_CLASSIFICATION.md) — 引用渲染机制
- [index.html](file:///d:/GitHub/GSM1921-SOP/index.html) — 现有界面实现
- [src/styles.css](file:///d:/GitHub/GSM1921-SOP/src/styles.css) — 现有样式系统

---

*本文档由条条支委组织建设职能强化设计任务（ROADMAP §八 P2 E3, 2026-05-02）产出。*
