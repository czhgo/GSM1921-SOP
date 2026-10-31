---
title: "设计系统 · 第二编 排版与尺寸"
type: design
role: "[工程师]+[AI]"
last_updated: 2026-10-31
status: active
related_files: [DESIGN_SYSTEM.md, DS_03_COMPONENTS.md, ../../../docs/src/styles.css, ../../../server/test/type-scale-guard.test.mjs, ../../../server/test/spacing-scale-guard.test.mjs]
---

# 第二编 排版与尺寸

> **回答什么问题**：用哪一档字号、字重与行高；页面多宽、列数多少；组件尺寸档位从哪来。
> **不回答什么**：间距五档与组件采用矩阵 → [DS_03_COMPONENTS.md](DS_03_COMPONENTS.md) §4.21；颜色与主题 → [DS_01_COLOR_AND_THEME.md](DS_01_COLOR_AND_THEME.md)；组件结构与交互态 → DS_03 与 [DS_04_INTERACTION_AND_RESPONSIVE.md](DS_04_INTERACTION_AND_RESPONSIVE.md)。
> **谁什么时候读**：[工程师]+[AI]；新建页面定版心与栅格、调字号层级、判断「这行字该多大」之前读本篇。

## 三、排版系统

### 3.1 字体家族

| 用途 | CSS Font Family | 中文字体 | 英文/数字 | Class |
|------|----------------|---------|----------|-------|
| 正文/UI | `'Noto Sans SC', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif` | 思源黑体 | 系统无衬线 | 已废止¹（原 `.font-sans-primary`） |
| 标题/强调/标签/按钮 | `'STZhongsong', '华文中宋', 'Noto Serif SC', 'STSong', 'SimSun', serif` | 华文中宋 → 思源宋体 → 宋体 | Times New Roman | `.font-title-cn` |
| 英文标题 | `'Times New Roman', 'Georgia', serif` | — | Times New Roman | 已废止¹（原 `.font-title-en`） |

> ¹ **2026-09-28 死码清理批**：`.font-sans-primary` / `.font-title-en`（及 `.text-overline` 等）为**零引用死码**，已从 `styles.css` 删除。本表**字体族本身仍有效**——正文/UI 由 `body` 默认字体承担，英文标题族按需内联 `font-family`；「标题/强调/标签/按钮」仍由 `.font-title-cn` 承担。

**字体使用规则**：

| 元素类型 | 字体 | 说明 |
|---------|------|------|
| 页面主标题（h1） | `.font-title-cn` | 华文中宋，weight 800 |
| 区块标题（h2/h3） | `.font-title-cn` | 华文中宋，weight 700-800 |
| 表单标签（label） | 衬线字体（CSS规则） | 工作台内所有 label 自动应用 |
| 按钮 | 衬线字体 | 写入活动等关键操作按钮 |
| 侧边栏标签 | 衬线字体 | module-tab span 自动应用 |
| 正文/辅助文字 | 已废止¹（原 `.font-sans-primary`） | 思源黑体，保持可读性 |
| 输入框内文字 | 系统默认 | 跟随 body 字体 |

**禁止使用黑体（Microsoft YaHei/Heiti SC）作为标题字体**。标题必须使用衬线字体（华文中宋/宋体系列）。

### 3.2 字号层级

| 层级 | Class | Font Size | Line Height | Font Weight | 用途 |
|------|-------|-----------|-------------|-------------|------|
| H1 | 已废止²（原 `.text-h1`） | `1.5rem` (24px) | `1.4` | `800` | 页面主标题 |
| H2 | 已废止²（原 `.text-h2`） | `1.25rem` (20px) | `1.4` | `700` | 区块标题 |
| H3 | 已废止²（原 `.text-h3`） | `1.125rem` (18px) | `1.5` | `600` | 卡片标题 |
| Body-L | 已废止²（原 `.text-body-lg`） | `1rem` (16px) | `1.6` | `400` | 正文大 |
| Body | 已废止²（原 `.text-body`） | `0.875rem` (14px) | `1.6` | `400` | 正文标准 |
| Body-S | `.text-body-sm` | `0.8125rem` (13px) | `1.5` | `400` | 辅助说明 |
| Caption | 已废止²（原 `.text-caption`） | `0.75rem` (12px) | `1.4` | `400` | 标签/注释 |
| Overline | 已废止²（原 `.text-overline`） | `0.6875rem` (11px) | `1.3` | `600` | 分类标签 |

> ² **2026-09-28 死码清理批**：`.text-h1` / `.text-h2` / `.text-h3` / `.text-body` / `.text-body-lg` / `.text-caption` / `.text-overline` 为**零引用死码**（`docs/**` 全量字符串零命中），已从 `styles.css` 删除（含 `html.font-size-large` 覆盖行）。**本表档位值（H1…Overline）一字未改、继续有效**；这些档位现由 Tailwind 档位类承担（`text-2xl` 24px · `text-xl` 20px · `text-lg` 18px · `text-base` 16px · `text-sm` 14px · `text-xs` 12px · `text-[11px]` 11px），**档位 → 角色**的现行映射见 §3.2.2 与 §3.3.1，`.text-body-sm`（13px）仍为现役类。

#### 3.2.1 非控件小字口径（2026-09-26 立 · 据本表推导 · 可判）

**口径**（单一源守卫＝`server/test/small-text-guard.test.mjs`）：

| 档 | 判定 | 依据 |
|----|------|------|
| `text-[9px]` | **一律禁止**（任意落点） | 本表**表内无此档** |
| `text-[10px]` | **一律禁止**（任意落点） | 本表**表内无此档** |
| `text-[11px]` | **非控件处合规**（＝本表 `Overline` 档；现库存量多用 Tailwind 任意值类 `text-[11px]`）；**控件处**仍按 §4.3 ②④ 判红 | 本表 `Overline` 行 |

> **为何这是「据既有事实」而非自创更严**（逐字引据）：
> ① 本小节上表**最低档**就是 `Overline` = `0.6875rem`（**11px**）那一行——表中**不存在** 10px / 9px 档；
> ② 同一文档 `§4.3 输入框` 规范行原文：「字号 | **单档 `0.8125rem`（13px）**；**禁用 `text-[11px]`/`text-[10px]` 控件字号**」；
> ③ `§4.3 输入组件统一原则` ④ 原文：「**禁止** `text-[11px]`/`text-[10px]` 控件字号（与规范 Caption 档冲突）；现存项登记为基线，**新增即红**」。
> ⇒ 11px 是**本表自己写定的最低档**；10px / 9px 在档位表里**不存在**。本口径只是把①②③**取并集**后取最小可判形式
> （「档位表外的小字不得出现在任何落点」），**未**新增任何更严的档位要求——11px 在非控件处仍合规。
>
> **存量处置（28 处）**：全站曾存 `text-[10px]` **28 处 / 12 文件**（`text-[9px]` 0 处）。其中虽有属**括注 / 代码片 / 计数序号**
> 一类「非正文注记」者，仍一并按本口径归入禁止档——原因：9/10px 与 11px 仅差 1px，若按「注记」逐处开例外，判据
> **不可机检**、等于无口径。⇒ 28 处**已全数改到 `text-[11px]`**（既在档位表内，也只改字号档、padding 一字未动）。

#### 3.2.2 文本档位-角色映射（2026-09-27 立 · 补「标准缺档」）

> **为什么要立这一节（诊断依据，非凭空新增）**：§3.2 只给了**档位清单**，**没规定「哪种元素用哪一档」**——
> 于是同一语义角色在不同文件各自取档。真机量测（7 个工作台 × 全部 tab，实测 DOM）：
> · **卡片导语**这一层在同一 tab 内**同时出现 11px 与 12px**；
> · **卡片面板标题**这一层在不同台之间**同时出现 14px（`text-sm`）与 16px（`text-base`）**。
> ⇒ **「不统一」的根不在实现者手滑，而在标准没有给「角色 → 档位」**。本节把它写成表，并给每档一个可判的落点。

**档位-角色表**（有限档；**同一行＝同一语义层，同层必须同档**）：

| 角色（同层必须同档） | 档（px） | 代表类 | 行高（计算后实值） | 字重 |
|---|---|---|---|---|
| 页面主标题 / 区块标题 | 24 / 20 | `text-2xl` / `text-xl` | 1.4 | 800 / 700 |
| 页面级主卡标题（`card … p-5`） | 16 | `text-base` | 1.5（24px） | 600 |
| **工作台内嵌面板标题**（`card … p-4`） | **14** | `text-sm` | 1.25rem（20px） | 700 |
| 卡片内小分组标题 | 12 | `text-xs font-bold` | 1rem（16px） | 700 |
| **卡片导语 / 说明段（`<p>`）** | **12** | `text-xs` | 1rem（16px） | 400 |
| 附注 / meta 行 / 徽标文字 / 空态 / 提示条 | 12 | `text-xs` | 1rem（16px） | 400 |
| 列表项标题 / 人名 / 行首 | 14 | `text-sm` | 1.25rem（20px） | 500 |
| 正文 / 表格表头与数据格 / 表单控件 | 13 | `.input-flat` / `.data-table` | 表格 1.25rem、控件 1rem | 400 |
| **分类标签**（侧栏组名 / 图例小标） | 11 | `text-[11px]` | 1.5（16.5px） | 600 |

**为何是这几档（判据＝从既有实现归纳，不新造）**：上表 8 档即全站真机实测**正文侧**实际在用的档位集合
（11 / 12 / 13 / 14 / 16 / 18 / 20 / 24），每一档都有 §3.2 表内条目对得上——
`11=Overline` · `12=Caption` · `13=Body-S`（§4.3 单档裁定，不动）· `14=Body`（§3.2 Body 档；实测承担
「内嵌面板标题 / 列表项标题 / 人名」）· `16=Body-L`＋§3.3.1 卡片面板标题（h3）· `18/20/24=H3/H2/H1`。
**没有新档入表**（`11.2px` 是浏览器 UA 默认，出自外壳页脚链接，**不在档位表内**，登记为待收敛离群项）。

**行高规则（「行距宽窄」的根因与判据）**：

1. **档位类必须自带行高**：正文/导语只用**携行高的档位类**（`text-xs`→16px、`text-sm`→20px、
   `.text-body-sm`→1.5）；**禁止用不携行高的任意值类承担正文**——`text-[11px]` / `text-[13px]` 这类
   只改 font-size、**行高仍继承**，实测继承值为 **1.5**（见下条）⇒ 11px 段落行高 **16.5px**，
   **反而比 12px 段落的 16px 更高**，视觉上就是「小字行距更宽」。
2. **基准行高的实测订正**：实测 `body` 计算行高 = **1.5**，**不是** `styles.css` 写的 `--leading-relaxed`(1.6)——
   Tailwind preflight 的 `body{line-height:inherit}` 与 `html{line-height:1.5}` 在生产（CDN 在场）压过了
   `styles.css` 的 body 声明。⇒ 上表「行高」一律给**计算后实值**；任何按 1.6 推算的档位都与生产不符。

**Overline 形态判据（可机检的一半）**：`text-[11px]` 是 **Overline（标签）档**，只许出现在**标签**上
（同标签 class 同时具备 600 字重、或 `tracking-*` / `uppercase` 之一）；
**`<p>` 段落（说明 / 导语）不得用 11px**（应取 Caption 12px）。守卫：`server/test/text-tier-guard.test.mjs`
（判红面＝`<p>` 上的 9/10/11px；`<span>`/`<div>` 上 11px 形态可能合法、只计进度）。

#### 3.2.3 全站实测字号档位（2026-10-31 登记 · 只登记不改值）

> **统计口径**：扫 `docs/src` 下全部 `.css` 的 `font-size`（`var(--text-*)` 按 `styles.css :root` 解析为 px）
> ＋ `docs` 下全部 `.js/.mjs` 的 `text-*` 工具类、`text-[Npx]` 与行内 `font-size`。
> 扫描 / 断言单一源＝`server/test/type-scale-guard.test.mjs`（源件 5）；存量台账＝`server/test/style-baseline.mjs::TYPE_TIER_BASELINE`。
> **本表只登记现状，不调整任何字号数值**（渲染结果与登记前逐像素一致）。

| 值 | docs/src 全部 .css | docs/**/*.js | 合计 | 判读 |
|---:|---:|---:|---:|---|
| 8px | 1 | 0 | 1 | 表外存量（基线登记） |
| 9.6px | 1 | 0 | 1 | 表外存量（基线登记） |
| 10px | 4 | 2 | 6 | 表外存量（基线登记；§3.2.1 禁止 `text-[10px]`，此处是 CSS `font-size` 旧值） |
| 10.4px | 1 | 0 | 1 | 表外存量（基线登记） |
| **11px** | 20 | 44 | 64 | **档位表内**（Overline 标签档） |
| 11.2px | 12 | 5 | 17 | 表外存量（`0.7rem` 派生，基线登记） |
| 11.52px | 3 | 4 | 7 | 表外存量（`0.72rem` 派生，基线登记） |
| **12px** | 70 | 1816 | 1886 | **档位表内**（Caption；`text-xs` / `--text-xs` / `--text-sm` / `--text-meta`） |
| 12.48px | 0 | 1 | 1 | 表外存量（基线登记） |
| 12.8px | 1 | 6 | 7 | 表外存量（`0.8rem` 派生，基线登记） |
| **13px** | 34 | 43 | 77 | **档位表内**（Body-S；`.text-body-sm` / `.input-flat` / `.data-table` / `--text-secondary`） |
| 13.6px | 0 | 1 | 1 | 表外存量（基线登记） |
| **14px** | 33 | 506 | 539 | **档位表内**（Body；`text-sm` 工具类 / `--text-base`） |
| **15px** | 6 | 0 | 6 | **档位表内**（正文；`--text-body`；`html.font-size-large` 也把 12px 档抬到这里） |
| **16px** | 15 | 85 | 100 | **档位表内**（Body-L；`text-base` / `--text-md`） |
| 17px | 2 | 1 | 3 | 表外存量（大字号模式 +3 派生，基线登记） |
| **18px** | 1 | 3 | 4 | **档位表内**（H3；`text-lg` / `--text-lg`） |
| 19px | 1 | 0 | 1 | 表外存量（大字号模式 +3 派生，基线登记） |
| **20px** | 3 | 11 | 14 | **档位表内**（H2；`text-xl` / `--text-xl`） |
| 21px | 1 | 0 | 1 | 表外存量（大字号模式 +3 派生，基线登记） |
| **22px** | 5 | 0 | 5 | **档位表内**（`--text-2xl` 令牌值；注意 Tailwind `text-2xl` 是 24px） |
| 23px | 1 | 0 | 1 | 表外存量（大字号模式 +3 派生，基线登记） |
| **24px** | 3 | 0 | 3 | **档位表内**（H1；`text-2xl` 工具类 / `--text-3xl`） |
| 27px | 1 | 0 | 1 | 表外存量（大字号模式 +3 派生，基线登记） |
| 32px | 2 | 0 | 2 | 仅 `about.css` 冻结件（基线登记，不参与收敛） |
| 28px | 0 | 0 | 0 | **实测 0 处 ⇒ 不入档**（不新造无消费档位） |

**档位表（新代码只许用这些值）**：`11 / 12 / 13 / 14 / 15 / 16 / 18 / 20 / 22 / 24`（px）。
表外值一律按 `(文件, 值)` 进基线、**只减不增**；新增表外值由 `type-scale-guard::Q1` 判红。

**两套 `sm` 的处置（本节要回答的核心歧义）**：

| 名称 | 属于 | 值 | 新代码怎么用 |
|---|---|---:|---|
| `--text-sm` | **CSS 令牌**（`styles.css :root`） | **12px** | **不再用于表示 14px**；12px 请直接用 `text-xs`（工具类）或 `var(--text-meta)` |
| `text-sm` | **Tailwind 工具类** | **14px** | 需要 14px（Body / 内嵌面板标题 / 列表项标题）时**用这个** |

> **同名的还有 `2xl`**：令牌 `--text-2xl`＝**22px**，工具类 `text-2xl`＝**24px**。需要 24px（H1）
> 用 `text-2xl`；需要 22px 才用 `var(--text-2xl)`。

**全量对照（令牌 vs 工具类）**：

| 令牌 | 值 | 工具类 | 值 |
|---|---:|---|---:|
| `--text-xs` | 12px | `text-xs` | 12px |
| `--text-sm` | 12px | `text-sm` | 14px |
| `--text-base` | 14px | `text-base` | 16px |
| `--text-md` | 16px | — | — |
| `--text-lg` | 18px | `text-lg` | 18px |
| `--text-xl` | 20px | `text-xl` | 20px |
| `--text-2xl` | 22px | `text-2xl` | 24px |
| `--text-3xl` | 24px | `text-3xl` | 30px |
| `--text-body` | 15px | — | — |
| `--text-secondary` | 13px | — | — |
| `--text-meta` | 12px | — | — |

**一句话结论**：**14px 用 `text-sm`（工具类），12px 用 `text-xs`（工具类）或 `var(--text-meta)`；
新代码不要再用 `var(--text-sm)`。** 正文 15px 走 `var(--text-body)`，13px 辅助走 `var(--text-secondary)` / `.text-body-sm`。

#### 3.2.4 间距与字号的使用顺序：先令牌、再工具类、最后裸值

> **立这条的原因**：审查发现间距令牌只覆盖一部分声明，另有大量行内 `style="margin/padding:…"`；
> 字号也存在令牌值与 Tailwind 工具类值同名的现象（见 §3.2.3）。若没有固定取用顺序，
> 同一个视觉值会继续以三种写法扩散，守卫也只能事后追认。

**取用顺序（新代码必须按此顺序，前一项能满足就不写后一项）**：

1. **先令牌**：间距用 `--space-1`(4px) / `--space-2`(8px) / `--space-3`(12px) / `--space-4`(16px) / `--space-6`(24px)；
   字号正文用 `--text-body`(15px)、辅助用 `--text-secondary`(13px)、元信息用 `--text-meta`(12px)。
2. **再工具类**：字体用 `text-xs` / `text-sm` / `text-base` / `text-lg` / `text-xl` / `text-2xl`
   （值见 §3.2.3 对照表）；间距用与五档等值的 Tailwind 类（`p-1` / `p-2` / `p-3` / `p-4` / `p-6` 等）。
3. **最后才写裸值**：只有令牌与工具类都表达不了时才写 `font-size: …` / `margin: …` / `padding: …` / `gap: …`，
   并且**必须登记**：
   - 字号裸值 → `server/test/style-baseline.mjs::TYPE_TIER_BASELINE`（按文件 + 值登记，只减不增）；
   - 间距裸值 → `SPACING_NON_TOKEN_BASELINE` / `SPACING_INLINE_DECL_BASELINE` / `SPACING_INLINE_ATTR_BASELINE`
     （只减不增；本期**不做批量替换**，避免改变渲染）。

**守卫**：`server/test/type-scale-guard.test.mjs`（Q1 新增表外字号即红 / Q2 处数棘轮）
＋ `server/test/spacing-scale-guard.test.mjs`（S5 非令牌声明 / S6 行内声明 / S7 行内属性）。

### 3.3 排版规则

#### 3.3.1 标题语义层级规则（2026-08-07 裁决「语义+样式全统一」）

**规则核心：标题语义必须用语义化标签（h2/h3/h4/h5/h6），禁止用 `<span>` 冒充标题。** 选择层级看「容器语义」而非字号——卡片面板标题就是 h3，卡片内分组就是 h4，与字号无关。

| 容器语义 | 标签 | 标准样式 | 示例 |
|---------|------|---------|------|
| 页面主标题（header） | `h2` | `font-title-cn text-xl font-bold text-gray-800` | 各工作台头部「XXX工作台」 |
| 区块标题（首页区块） | `h2` | `font-title-cn text-2xl font-bold text-gray-800` | index.html「光华…管理引擎」 |
| 卡片面板标题 | `h3` | `font-title-cn text-base font-semibold text-gray-800` | 工作台「我的待办」「考勤明细」「活动查询」 |
| 弹窗/浮层面板标题 | `h3` | `font-title-cn text-sm font-semibold text-gray-800` | modal/归档弹窗/通知详情标题 |
| 卡片内分组标题 | `h4` | `font-title-cn text-sm font-bold text-gray-700` | 「当前党小组组长」「材料标准」「报送历史」、月份分组 |
| 卡片内更小分组（活动角色/子记录） | `h5`/`h6` | `text-xs font-bold text-gray-600` | 活动角色分组、子记录分组 |

**判例（2026-08-07 全系统检查后落地）**：
- `<span>` 承担标题语义（如「活动查询」「我的本月考勤」）→ 一律改 `h3`
- 卡片面板标题用 `h4`（历史遗留，如「我的待办」「专班名单」）→ 升为 `h3`
- 月份分组标签（含月标签+场数）→ `h4`（卡片内分组级）
- 子记录分组标签（如「积极分子 (n)」带添加按钮）→ `h5`
- 例外：位于 `<button>` 折叠组头内的文字（如待办折叠组头）保持 `span`——按钮内不允许嵌入标题标签
- 例外：行内强调文本（badge、计数、状态点）用 `span`，不承担标题语义

```css
/* 中文正文 */
.text-body-sm {
  letter-spacing: normal;
}

/* 段落间距 */
p + p { margin-top: 0.75em; }

/* 列表间距 */
li + li { margin-top: 0.25em; }
```

> **2026-09-28 死码清理批**：原示例中的 `.text-body` / `.text-body-lg` / `.font-title-en` / `.text-overline` 为**零引用死码**，已从 `styles.css` 删除，故本示例同步删去相应两行（中文正文只剩现役 `.text-body-sm`；英文短文本/标题的字距改由 `tracking-*` 工具类承担）。

---

### 3.4 栅格与容器档（P4 · 2026-10-29 立 · 一套栅格）

> **原则**：页面宽度只有一套取法。新增页面只能从五档里选一档，不自定宽度，也不在页面里自定列数。

**容器五档**（语义单一源：`docs/src/styles.css` 的 P4 注释表）

| 档位 | 语义 | 落点（当前） |
|---|---|---|
| `28rem` | 仅登录卡 | `login.html` |
| `48rem` | 标准阅读 / 表单页 | activity / activity-materials / messages / feedback / person / taskforce / thought-report / notice |
| `64rem` | 详情 / 设置类 | settings / archive / party-committee-meeting |
| `72rem` | 列表与工作台（默认） | index / search / wizard / workspace 六台 / branch-config |
| `80rem` | 表格密集页 | 党委台 party-committee（宽表）、支部只读 branch-readonly、帮助 help |

**判据（Boolean，为真即违规）**

| # | 判据 | 检查点 |
|---|---|---|
| G-1 | 页面容器宽度 ∈ {28, 48, 64, 72, 80}rem；像素定值须能整除为这五档之一 | `container-width-guard::C1/C2` |
| G-2 | 骨架类只允许 `layout-shell--content` / `layout-shell--wide` / `page-frame--content` / `page-frame--wide`，分别落 72 / 80 / 72 / 80rem | `container-width-guard::C1` |
| G-3 | 卡片列数只由 `.card-grid`（`repeat(auto-fill, minmax(18rem, 1fr))`，gap `--space-4`）决定 | `container-width-guard::C0` |
| G-4 | 页面不得自写第二套列数（`grid-cols-N` 一类） | 同 G-3 |
| G-5 | 窄屏一律 `width: 100%`，仍受语义上限约束；页面主体不横向溢出 | §6.2 / §6.3 |

**反例**
- `max-w-2xl`（42rem）：落在五档之外，等于给页面另开第六档。
- `max-width: 1320px`：像素定值换不成整数 rem 档。
- 页面自写 `grid-cols-3`：列数与卡宽脱钩，390px 下挤压溢出。

**守卫**：`container-width-guard`（C0–C5，含 About 冻结件白名单与两条反例自检）。

> **关联**：§3.2 字号层级 · §4.21 间距五档（DS_03）· §6.2 布局适配（DS_04）
