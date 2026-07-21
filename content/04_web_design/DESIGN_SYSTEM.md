﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿---
title: "前端设计系统规范"
type: design
role: "[工程师]+[AI]"
last_updated: "2026-07-20"
status: active
---

# 光华管理学院本科生党支部 SOP 引擎 — 设计系统规范

> **Design System v1.0 — 哑光扁平化设计语言**
> 设计理念：去液态、归哑光、扁平即正义。参考微软 Fluent Design 扁平风格。
> 创建日期：2026-05-02 | 关联文档：CLAUDE.md §九 DESIGN-OPT | 目标读者：[工程师]+[AI]

---

## 一、设计哲学

### 核心原则

> 原则按场景灵活选用，不锁定数量。下表为基础参考集，可按页面特性增补（如探索页可加"叙事性"、表单页可加"反馈清晰"）。

1. **清洁优先（Clean First）**：能用纯色解决的，不用渐变；能用扁平解决的，不用阴影；能用留白解决的，不用分割线
2. **哑光质感（Matte Aesthetic）**：背景采用低饱和中性色，拒绝高光/镜面反射/玻璃拟态
3. **色彩克制（Color Restraint）**：每个页面主色 ≤ 2 种，功能色仅用于状态指示
4. **动效适度（Motion Modesty）**：过渡动画 150-250ms，仅使用 opacity/transform（GPU 加速）
5. **渐进增强（Progressive Enhancement）**：基础体验不依赖 backdrop-filter（低端设备友好）

### 设计参考

- 微软 Fluent Design System（扁平化组件理念）
- Material Design 3（色彩 Token 体系）
- 党政机关网站视觉识别规范

---

## 二、色彩系统

### 2.1 色盘总览

```
┌─────────────────────────────────────────────────────────────┐
│                    色彩系统架构                              │
│                                                             │
│  主色（Primary）       辅助色（Accent）                      │
│  ┌────────────────┐   ┌──────────────┐                     │
│  │ 党建红 CE1126   │   │ 党徽黄 D4AF37 │ ← 不可变基础色      │
│  │ 红系渐变 9 阶   │   │ 蓝/琥珀/翠绿/紫 │ ← 角色识别色      │
│  └────────────────┘   └──────────────┘                     │
│                                                             │
│  中性色（Neutral）     功能色（Functional）                   │
│  ┌────────────────┐   ┌──────────────┐                     │
│  │ 白→黑 10阶灰度  │   │ 成功/警告/错误/信息 │ ← 状态指示    │
│  │ 文字+背景+边框  │   │ 绿/黄/红/蓝      │                  │
│  └────────────────┘   └──────────────┘                     │
│                                                             │
│  表面色（Surface）                                           │
│  ┌────────────────┐                                        │
│  │ 页面/卡片/浮层   │ ← 组件层级深度表达                      │
│  │ 悬停/激活态     │                                        │
│  └────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 主色（Primary）— 党建红系

| Token | 色值 | 色块 | 用途 |
|-------|------|------|------|
| `--primary-50` | `#FEF2F2` | ██ | 红色最浅底色 |
| `--primary-100` | `#FEE2E2` | ██ | 浅红背景 |
| `--primary-200` | `#FECACA` | ██ | 浅红边框 |
| `--primary-300` | `#FCA5A5` | ██ | 禁用态红色 |
| `--primary-400` | `#F87171` | ██ | 悬停态浅红 |
| `--primary-500` | `#EF4444` | ██ | 主色基准 |
| `--primary-600` | `#DC2626` | ██ | 主色深调 |
| `--primary-700` | `#CE1126` | ██ | **党建红 · 核心主色** |
| `--primary-800` | `#9B0000` | ██ | 深红强调 |
| `--primary-900` | `#7A0010` | ██ | 最深红（Header 底色） |

**使用约束**：
- `--primary-700` (`#CE1126`) 为主 CTA 按钮、关键选中态、品牌标识元素
- `--primary-900` (`#7A0010`) 为 Header 导航底色，必须为纯色
- 色值 `#CE1126` 和 `#D4AF37` 不可替换，是党建视觉识别的合规底线

### 2.3 辅助色（Accent）— 党徽黄系 + 角色识别色

#### 2.3.1 党徽黄系（核心装饰色）

| Token | 色值 | 色块 | 用途 |
|-------|------|------|------|
| `--accent-gold` | `#D4AF37` | ██ | **党徽黄 · 核心辅助色** |
| `--accent-gold-light` | `#F5DEB3` | ██ | 党徽黄浅调 |

#### 2.3.2 角色识别色系（红橙黄绿蓝紫系统化）

> **设计原则**：每个角色一个独立色相，按职能分工分配色相，确保 8 种角色在关系网络图、角色卡片、日历图例等场景中可快速辨识。
>
> **色相分配逻辑**（按职能分工归类）：
> - 红色系（最深）→ 领导核心（党支书）
> - 石灰绿系 → 执行层（党小组组长，与支委分工配合）
> - 紫/蓝/琥珀系 → 支委三类（组织/宣传/纪检，横向协作）
> - 青/绿/灰系 → 项目执行层（组织者/深度参与者/普通参与者）

| Token | 色值 | 色块 | 角色 | 色相 | 说明 |
|-------|------|------|------|------|------|
| `--accent-secretary` | `#B91C1C` | ██ | 党支书 | 红色系（深红） | 领导核心，Tailwind red-800 级深红 |
| `--accent-leader` | `#65A30D` | ██ | 党小组组长 | 石灰绿系 | 执行层，与支委分工配合 |
| `--accent-org-commissioner` | `#8B5CF6` | ██ | 组织委员 | 紫色系 | 组织协调，专班唯一招募节点 |
| `--accent-prop-commissioner` | `#3B82F6` | ██ | 宣传委员 | 蓝色系 | 宣传传播 |
| `--accent-disc-commissioner` | `#D97706` | ██ | 纪检委员 | 琥珀/黄色系 | 监督警示 |
| `--accent-organizer` | `#06B6D4` | ██ | 组织者 | 青色系 | 项目大脑 |
| `--accent-deep` | `#10B981` | ██ | 深度参与者 | 绿色系 | 项目之手 |
| `--accent-participant` | `#6B7280` | ██ | 普通参与者 | 灰色系 | 仅出席 |

**关键变更说明**（v2 → v3 角色色系统化）：
- 党小组组长：`#CE1126`（红）→ `#EA580C`（橙）→ `#65A30D`（石灰绿），进一步与支委暖色系拉开色相距
- 组织委员：`#CE1126`（红）→ `#8B5CF6`（紫），与党小组组长橙色区分，标识专班招募独特职能
- 组织者：`#3B82F6`（蓝）→ `#06B6D4`（青），与宣传委员蓝色区分
- 新增 6 个 CSS 变量：`--accent-leader`、`--accent-org-commissioner`、`--accent-prop-commissioner`、`--accent-disc-commissioner`、`--accent-organizer`、`--accent-participant`

**使用约束**：
- 角色色条（左侧 4px）使用对应 accent 色
- `--accent-gold` 用于党徽相关元素（SVG 着色、装饰线）
- 角色识别色在 SVG 关系网络节点、角色卡片、日历图例中必须严格按本表对应，不得混用
- `--accent-amber` / `--accent-blue` / `--accent-emerald` 三个旧 Token 保留用于一般装饰用途（非角色识别），角色识别场景必须使用上述 8 个 `--accent-<role>` 变量

### 2.4 中性色（Neutral）— 灰度系统

| Token | 色值 | 色块 | 用途 |
|-------|------|------|------|
| `--neutral-0` | `#FFFFFF` | ██ | 纯白（卡片/输入框背景） |
| `--neutral-50` | `#F8F9FA` | ██ | 页面底色 |
| `--neutral-100` | `#F3F4F6` | ██ | 浅灰背景 |
| `--neutral-200` | `#E5E7EB` | ██ | 边框色 |
| `--neutral-300` | `#D1D5DB` | ██ | 禁用边框 |
| `--neutral-400` | `#9CA3AF` | ██ | 占位文字 |
| `--neutral-500` | `#6B7280` | ██ | 辅助文字 |
| `--neutral-600` | `#4B5563` | ██ | 次要正文 |
| `--neutral-700` | `#374151` | ██ | 主要正文 |
| `--neutral-800` | `#1F2937` | ██ | 标题文字 |
| `--neutral-900` | `#111827` | ██ | 最深文字 |

### 2.5 功能色（Functional）— 状态指示

| Token | 色值 | 色块 | 用途 |
|-------|------|------|------|
| `--functional-success` | `#10B981` | ██ | 成功/已完成 |
| `--functional-warning` | `#F59E0B` | ██ | 警告/待处理 |
| `--functional-error` | `#EF4444` | ██ | 错误/已逾期 |
| `--functional-info` | `#3B82F6` | ██ | 信息/提示 |

**使用约束**：
- 仅用于 Badge、状态指示器、表单验证提示
- 不可用作大面积背景色或装饰色

### 2.6 表面色（Surface）— 组件层级

| Token | 色值 | 色块 | 用途 |
|-------|------|------|------|
| `--surface-page` | `#F8F9FA` | ██ | 页面背景 |
| `--surface-card` | `#FFFFFF` | ██ | 卡片背景 |
| `--surface-elevated` | `#FFFFFF` | ██ | 浮层背景 |
| `--surface-header` | `#7A0010` | ██ | 顶部导航背景 |
| `--surface-sidebar` | `#FFFFFF` | ██ | 侧边栏背景 |
| `--surface-hover` | `#F3F4F6` | ██ | 悬停态表面 |
| `--surface-active` | `#FEE2E2` | ██ | 激活态表面 |

---

## 三、排版系统

### 3.1 字体家族

| 用途 | CSS Font Family | 中文字体 | 英文/数字 | Class |
|------|----------------|---------|----------|-------|
| 正文/UI | `'Noto Sans SC', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif` | 思源黑体 | 系统无衬线 | `.font-sans-primary` |
| 标题/强调/标签/按钮 | `'STZhongsong', '华文中宋', 'Noto Serif SC', 'STSong', 'SimSun', serif` | 华文中宋 → 思源宋体 → 宋体 | Times New Roman | `.font-title-cn` |
| 英文标题 | `'Times New Roman', 'Georgia', serif` | — | Times New Roman | `.font-title-en` |

**字体使用规则**：

| 元素类型 | 字体 | 说明 |
|---------|------|------|
| 页面主标题（h1） | `.font-title-cn` | 华文中宋，weight 800 |
| 区块标题（h2/h3） | `.font-title-cn` | 华文中宋，weight 700-800 |
| 表单标签（label） | 衬线字体（CSS规则） | 党建工作台内所有label自动应用 |
| 按钮（.btn-primary） | 衬线字体 | 写入活动等关键操作按钮 |
| 侧边栏标签 | 衬线字体 | module-tab span 自动应用 |
| 正文/辅助文字 | `.font-sans-primary` | 思源黑体，保持可读性 |
| 输入框内文字 | 系统默认 | 跟随 body 字体 |

**禁止使用黑体（Microsoft YaHei/Heiti SC）作为标题字体**。标题必须使用衬线字体（华文中宋/宋体系列）。

### 3.2 字号层级

| 层级 | Class | Font Size | Line Height | Font Weight | 用途 |
|------|-------|-----------|-------------|-------------|------|
| H1 | `.text-h1` | `1.5rem` (24px) | `1.4` | `800` | 页面主标题 |
| H2 | `.text-h2` | `1.25rem` (20px) | `1.4` | `700` | 区块标题 |
| H3 | `.text-h3` | `1.125rem` (18px) | `1.5` | `600` | 卡片标题 |
| Body-L | `.text-body-lg` | `1rem` (16px) | `1.6` | `400` | 正文大 |
| Body | `.text-body` | `0.875rem` (14px) | `1.6` | `400` | 正文标准 |
| Body-S | `.text-body-sm` | `0.8125rem` (13px) | `1.5` | `400` | 辅助说明 |
| Caption | `.text-caption` | `0.75rem` (12px) | `1.4` | `400` | 标签/注释 |
| Overline | `.text-overline` | `0.6875rem` (11px) | `1.3` | `600` | 分类标签 |

### 3.3 排版规则

```css
/* 中文正文 */
.text-body, .text-body-sm, .text-body-lg {
  letter-spacing: normal;
}

/* 英文短文本/标题 */
.font-title-en, .text-overline {
  letter-spacing: 0.02em;
}

/* 段落间距 */
p + p { margin-top: 0.75em; }

/* 列表间距 */
li + li { margin-top: 0.25em; }
```

---

## 四、组件规范

### 4.1 按钮（Button）

#### 变体定义

| 变体 | Class | 背景 | 文字色 | 边框 | 悬停背景 |
|------|-------|------|--------|------|---------|
| Primary | `.btn` `.btn--primary` | `--primary-700` | `#FFFFFF` | 无 | `--primary-800` |
| Secondary | `.btn` `.btn--secondary` | `--neutral-100` | `--neutral-700` | `1px solid --neutral-200` | `--neutral-200` |
| Ghost | `.btn` `.btn--ghost` | 透明 | `--primary-700` | 无 | `--primary-50` |
| Danger | `.btn` `.btn--danger` | `--functional-error` | `#FFFFFF` | 无 | `#DC2626` |

#### 尺寸

| Size | Class | 高度 | 内边距 | 字号 |
|------|-------|------|--------|------|
| Normal | `.btn` | `40px` | `10px 20px` | `0.875rem` |
| Compact | `.btn--sm` | `36px` | `8px 14px` | `0.8125rem` |

> CSS 实现见 `docs/src/styles.css`。**装饰性禁令**：禁止 `linear-gradient`（纯色优于渐变）、`box-shadow`（扁平化不需要）、`transform: translateY(-Npx)`（上浮效果违反扁平原则）、`transform: scale()` 过大值（缩放反馈过于花哨）。**功能性允许**：`transform: scale(1.02)` 等微交互反馈、`transform` 用于 SVG 动画绘制（如 stroke-dashoffset 渐进绘制）。区分标准：transform 不得用于"装饰性动画"（如装饰性弹跳、缩放重影），但允许用于"功能性反馈"（如按钮点击微缩、SVG 动画绘制方向）。

### 4.2 卡片（Card）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `background-color: var(--surface-card)` (纯白 `#FFFFFF`) |
| 边框 | `border: 1px solid var(--neutral-200)` |
| 圆角 | `border-radius: 12px` |
| 阴影 | 无（扁平化，边框分隔） |
| 悬停 | `border-color: var(--primary-300)`，不移位 |
| 内边距 | `padding: 20px`（标准），`padding: 16px`（紧凑） |

> CSS 实现见 `docs/src/styles.css`。禁止：`backdrop-filter`、`box-shadow`、`transform`。

### 4.3 输入框（Input / Select）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `var(--neutral-0)` |
| 边框 | `1px solid var(--neutral-200)` |
| 圆角 | `8px` |
| 高度 | `40px`（标准）/ `36px`（紧凑） |
| 内边距 | `10px 14px` |
| 字号 | `0.875rem` |
| 聚焦边框 | `var(--primary-500)`（无外发光） |
| 占位符 | `color: var(--neutral-400)` |
| 禁用态 | 背景 `var(--neutral-100)`，文字 `var(--neutral-400)` |

#### Select 统一规则

**废弃**：select 默认方框样式（浏览器原生下拉箭头外观）。

**统一采用**：`select.input-flat` 样式，与 input 输入框完全一致：
- 移除原生下拉箭头（`appearance: none`）
- 添加自定义 SVG 下拉箭头（12px，灰色，右侧 14px 偏移）
- 聚焦时箭头变为主色（红色）
- 右侧内边距 `36px`（为箭头留空间）

> CSS 实现见 `docs/src/styles.css` 的 `.input` 和 `select.input-flat` 选择器。

### 4.4 侧边栏（Sidebar）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `var(--surface-sidebar)` (纯白 `#FFFFFF`) |
| 边框 | 右侧 `1px solid var(--neutral-200)` |
| 宽度 | `260px`（≥768px）/ `280px`（<768px） |
| 阴影 | 无 |
| 遮罩背景 | `rgba(0, 0, 0, 0.3)` 无反光 |
| 过渡 | `transform 200ms ease-out` |

### 4.5 顶部导航（Header）

#### 规范

| 属性 | 值 |
|------|-----|
| 背景 | `var(--primary-900)` (`#7A0010`) 纯色，无渐变 |
| 高度 | `56px` |
| 阴影 | `0 1px 3px rgba(0, 0, 0, 0.12)` |
| 滚动态阴影 | `0 2px 8px rgba(0, 0, 0, 0.15)` |
| 位置 | `position: fixed; top: 0; z-index: 50` |
| 页面留白 | body `padding-top: 56px` |

### 4.6 模块标签（Module Tab）

#### 规范

| 状态 | 背景 | 文字色 |
|------|------|--------|
| 默认 | `transparent` | `--neutral-700` |
| 悬停 | `--surface-hover` | `--neutral-800` |
| 激活 | `--surface-active` | `--primary-700` |
| 激活（强调）| `--primary-700` | `#FFFFFF` |

> CSS 实现见 `docs/src/styles.css` 的 `.module-tab` 选择器。

### 4.7 角色按钮/卡片（Role Button / Card）

保留左侧 4px 色条作为角色识别元素。

> CSS 实现见 `docs/src/styles.css` 的 `.role-card` 和 `.role-card::before` 选择器。

### 4.8 支委嵌套子视图（Commissioner Nested View）

「支委」采用统一入口 + 嵌套子视图的层级结构，避免3个独立按钮导致的视图层级混乱。

**交互流程**：
1. 点击「支委」→ 展开子视图（3个支委角色选项）
2. 再次点击「支委」→ 收起子视图
3. 点击子视图中的具体支委角色 → 设置对应角色 + 保持子视图展开
4. 点击其他角色 → 自动收起支委子视图

**视觉规范**：

| 属性 | 值 |
|------|-----|
| 子视图容器 | `padding-left: 20px; margin-left: 20px; border-left: 2px solid --neutral-200` |
| 子视图展开 | `max-height: 300px; opacity: 1; transition: 0.3s ease-out` |
| 子视图收起 | `max-height: 0; opacity: 0; overflow: hidden` |
| 子项卡片 | `padding: 10px 14px; border: 1px solid transparent; background: transparent` |
| 子项图标 | `32px × 32px`（比主卡片图标小 8px） |
| 展开指示器 | 向下箭头 SVG，展开时旋转 180° |
| 组织委员图标色 | `--accent-org-commissioner` (紫) |
| 宣传委员图标色 | `--accent-prop-commissioner` (蓝) |
| 纪检委员图标色 | `--accent-disc-commissioner` (琥珀) |

### 4.9 日历图例系统（Calendar Legend）

日历视图必须配套图例系统，确保无角色知识的成员也能通过颜色快速区分活动类型。

**显示规则**：仅当存在至少一种非默认色彩的活动时展示图例。无活动或仅有默认色活动时自动隐藏。

**交互**：图例默认展开，可通过「收起/展开」按钮折叠。折叠后仅保留标题栏。

| 属性 | 值 |
|------|-----|
| 容器 | `card rounded-2xl p-5` |
| 标题 | `font-title-cn text-sm font-bold` |
| 布局 | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2` |
| 色块尺寸 | `12px × 12px, border-radius: 3px` |
| 标签字号 | `0.75rem`，颜色 `--neutral-600` |
| 空状态 | 图例整体 `hidden` |

**数据来源**：`constants.js` 的 `ACTIVITY_CAT_COLOR` + `ACTIVITY_TYPE_LABELS`，与日历着色使用同一色系索引。

### 4.10 多视图模式组件（View Mode Components）

系统所有视图基于同一数据源（`BranchService.listActivities()`），各角色按需使用不同展示模式。

| 视图模式 | 适用场景 | 组件形态 | 当前状态 |
|---------|---------|---------|---------|
| 日历视图 | 全量活动时间分布（参与者/书记/党小组组长） | 月历网格 + 图例系统 | ✅ 已实现 |
| 表格视图 | 任务总览/档案清单（组织者/宣传/纪检） | 列式表格（状态+截止日期+负责人） | ✅ 已实现（inspector.js） |
| 查询视图 | 按条件筛选（纪检/书记） | 筛选表单 + 结果列表 | 🔜 规划中 |
| 看板视图 | 候选人阶段流转（组织委员） | 泳道列（待办→进行中→完成） | 🔜 规划中 |
| 甘特视图 | 活动执行时间线（组织者） | 横向时间轴 + 任务条 | 🔜 规划中 |
| 画册视图 | 宣传物料预览（宣传委员） | 卡片网格 + 缩略图 | 🔜 规划中 |
| 表单视图 | 活动详情填写/编辑 | 表单组（标签+输入框+按钮） | ✅ 已实现（#calendar-create-panel） |

### 4.11 图标规范

图标是组件的一种特殊形态，本节规定其格式与标准。

#### 4.11.1 格式要求

- **必须使用 SVG**（内联或 `<img>`）
- **禁止使用**：Emoji（如 🔍 → `<svg>...</svg>`）、PNG 图标、Icon Font

#### 4.11.2 SVG 图标标准

| 属性 | 值 |
|------|-----|
| 尺寸 | `18px × 18px`（标准）/ `24px × 24px`（大图标） |
| 描边 | `stroke="currentColor" stroke-width="2"` |
| 填充 | `fill="none"`（线性图标）/ `fill="currentColor"`（实心图标） |
| 圆角 | `stroke-linecap="round" stroke-linejoin="round"` |

#### 4.11.3 图标使用示例

```html
<!-- 内联 SVG（推荐） -->
<button class="module-tab">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
  <span>党建工作台</span>
</button>
```

---

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
| 卡片悬停 | 边框色变为主色浅调 | `:hover { border-color: --primary-300 }` |
| 输入框聚焦 | 边框变为主色，无外发光 | `:focus { border-color: --primary-500 }` |
| 列表项悬停 | 背景变为浅灰 | `:hover { background-color: --surface-hover }` |
| 选中态 | 浅红背景 + 红边框 | `.active { bg: --surface-active; border: --primary-300 }` |
| 加载态 | 骨架屏（灰色占位块） | 脉冲透明度动画 |
| 空状态 | SVG 图标 + 中性色提示文字 | SVG + `--neutral-400` 文字 |

### 5.3 禁止的动效效果

| 禁止项 | 原因 |
|--------|------|
| `backdrop-filter: blur()` | 玻璃态效果，低端设备性能差 |
| `cubic-bezier()` overshoot | 弹性过渡，与哑光风格冲突 |
| `box-shadow` 发光扩散 | 扁平化不需要 |
| `transform: scale()` | 缩放反馈过于花哨 |
| `transform: translateY(-Npx)` | 上浮效果违反扁平原则 |
| `linear-gradient()`（按钮/卡片） | 纯色优于渐变 |

### 5.4 探索工作动画区分对待原则

> 来源：D-222 | 适用场景：帮助页探索工作阶段的 SVG 滚动驱动动画

**核心规则**：探索工作阶段中，task（任务流）边与 info/collab（信息/协作）边使用不同的动画机制：

| 边类型 | 动画方式 | 理由 |
|--------|---------|------|
| task 边（红色实线，有箭头） | `stroke-dashoffset` 渐进绘制 | 任务有方向性和先后顺序，"被画出"的动效暗示执行进程 |
| info 边（蓝色虚线，有箭头） | `opacity` 渐显 | 信息传递无方向性，仅需"出现"而非"绘制" |
| collab 边（灰色点线，无箭头） | `opacity` 渐显 | 协作关系是对等的，仅需"出现"，且保留 CSS 虚线/点线样式 |

**为什么不是统一 dashoffset**：统一 dashoffset 会让虚线/点线的绘制方向与 CSS stroke-dasharray 冲突，视觉上产生"断裂-重连"的闪烁。虚线/点线本身已有节律，不需要 dashoffset 的"被画出"语义。

**为什么不是统一 opacity**：统一 opacity 会让 task 边失去"方向性"——任务是有先后顺序的，"被画出"暗示"正在执行"。

**生效条件**：SVG 滚动驱动动画中包含多种边类型时。单一类型边无需区分。

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
| 内容区最大宽度 | `1152px` | `896px` | `100%` |
| 党建工作台 | 日历 2/3 + 面板 1/3 | 单列堆叠 | 单列堆叠 |
| 侧边栏 | 固定显示 | 默认折叠 | 默认折叠 |
| 模板网格 | `grid-cols-2` | `grid-cols-2` | `grid-cols-1` |
| 水平内边距 | `32px` | `16px` | `12px` |
| 垂直内边距 | `24px` | `16px` | `12px` |
| 基础字号 | `1rem` (16px) | `1rem` (16px) | `0.95rem` (≈15px) |

### 6.3 移动端特殊规则

```css
@media (max-width: 767px) {
  .header-title h1 {
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .header-subtitle {
    display: none;
  }

  .header-action-btn,
  .status-pill {
    display: none;
  }

  #sidebar-main {
    width: 280px;
    transform: translateX(-100%);
  }

  #sidebar-main.sidebar-open {
    transform: translateX(0);
  }

  .tl-spine {
    width: 28px;
  }

  .tl-dot {
    width: 28px;
    height: 28px;
    font-size: 0.65rem;
  }
}
```

---

## 七、设计资产清单

### 7.1 文件清单

| 文件 | 职责 | 格式 |
|------|------|------|
| `docs/src/styles.css` | 全局样式 + 组件样式 + 响应式 + 打印 | CSS |
| `index.html` | Tailwind 配置 + HTML 结构 | HTML |
| `content/04_web_design/DESIGN_SYSTEM.md` | 设计系统规范文档（本文件） | Markdown |
| `CLAUDE.md` §九 | 设计优化项目规划 | Markdown |

### 7.2 CSS 变量迁移对照

| 旧变量（v10.0 Glass） | 新变量（v11.0 Matte） | 说明 |
|----------------------|----------------------|------|
| `--party-red-50` ~ `--party-red-900` | `--primary-50` ~ `--primary-900` | 语义化重命名 |
| `--party-red-gold` | `--accent-gold` | 升级为辅助色系统 |
| `--color-gray-50` ~ `--color-gray-900` | `--neutral-0` ~ `--neutral-900` | 扩展至 10 阶 |
| `--theme-leader` | `--primary-500` | 统一主色系 |
| `--theme-commissioner` | `--accent-amber` | 归入辅助色 |
| `--theme-organizer` | `--accent-blue` | 归入辅助色 |
| `--theme-deep` | `--accent-emerald` | 归入辅助色 |
| `--theme-secretary` | `--accent-secretary` | 归入辅助色 |
| `--theme-participant` | `--accent-gold` | 归入辅助色 |
| `--theme-archived` | `--neutral-500` | 归入中性色 |
| `--glass-blur / --glass-saturate / --glass-opacity / --glass-border / --glass-inset-*` | **已移除** | 玻璃态全部废弃 |
| `--glass-selected-*` | **已移除** | 改用 surface-active |

---

## 八、快速参考

| 我需要... | 操作 |
|----------|------|
| 查主色值 | → §2.2 Primary 表格 |
| 查组件规范 | → §4 组件规范 |
| 查响应式断点 | → §6.1 断点表 |
| 查 CSS 变量名 | → `docs/src/styles.css:root` |
| 查实施进度 | → CLAUDE.md §九 DESIGN-OPT-4 |
| 提交设计反馈 | → docs/feedback.html（在线反馈入口） |
| 查工程方法论 | → insights 工程演进与设计方法论.md §4 系统工程与设计方法论 |
