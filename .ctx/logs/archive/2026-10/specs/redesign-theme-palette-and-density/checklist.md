﻿# Checklist

## 色板

- [x] 7 个主题（金/红/橙/绿/青/蓝/紫）× 亮/暗各一套，8 个 token 齐备
- [x] 天蓝/雾紫/亮蓝已删除；紫只一个、蓝只一个；旧值有回落映射
- [x] 每个 token 都是手选 hex；主题链路 `color-mix` / `rgba(主题色)` / `brightness` / `opacity` 计数为 0
- [x] `softText` vs `softBg` ≥4.5:1 且目标 ≤12:1（7 主题 × 2 模式逐项记录）
- [x] `strongInk` vs `strongBg` ≥4.5:1；`strongBg` vs 卡片/页面底 ≥3:1
- [x] `softBg` 与白 1.08–1.35；`strongBg` HSL 饱和度 ≤85%（固定语义色除外）
- [x] 金色等浅色主题的 `softText` 不再是中性近黑；橙/绿/蓝不再被压成同一族灰深色
- [x] 验收表（hex/对比度/彩度）写入 `DESIGN_SYSTEM.md`，含 origin 公式、金色例外、10→7 削减理由

## 固定语义色

- [x] 党徽金 `#FFD700` 与「金」主题色分开定义，两者可以不同
- [x] 三会一课 `#CE1126`、主题党日亮金 + 金黄字不随主题切换变化（切换前后 computed 值一致）
- [x] `--accent-participant` 的 CSS 红 / JS 金同名两值已消除
- [x] 活动类别色只用于小面积标记，不整卡铺色

## 总体审美（沉稳但是鲜活）

- [x] 大面积表面只用中性或低彩度 `softBg`；无纯黑/纯白强对比铺面
- [x] 每屏最多一个高强调元素；高饱和只出现在小面积语义标记
- [x] 代表页（今天/待办/通知）复核：正文对比度 4.5–9:1，无刺眼色块拼贴
- [x] 主题色在页头、选中态、主 CTA 上可辨（鲜活），但不整屏变色

## 数据与注入

- [x] `ACCENT_COLORS` / `getAccentColors` / `accentButtonColors` / `solidAccentStyle` 均改为查表，无亮度分流
- [x] `theme.js` / `bootstrap.js` 注入新 token；页面无未定义 `--app-accent-*`
- [x] `styles.css` `:root` 与 `html.theme-dark` 各有默认金完整 token
- [x] 旧 token 若有残留消费，已登记为兼容别名且标注退场批次

## CSS / JS 消费方

- [x] `styles.css` 19 处主题色 `color-mix` 清零
- [x] 41 个文件 / 100 处 `--acc-text-dark` 清零或改为 token
- [x] 33 处 JS 主题色 `color-mix` 清零
- [x] JS 硬编码 hover 色（`#991B1B/#CE1126` 等）清零
- [x] 深色模式下 8 个消费点（chip/选中行/页码/分段/指标标签/页签/徽章/下拉项）文字可读（≥4.5:1）

## 主题预览

- [x] 主题项显示「浅底+深字」「实底+字」两张小样，不是单色块
- [x] 预览消费当前主题 token，切换亮/暗同步；只列 7 项
- [x] 7 主题预览与设置后实际页面 computed 色值一致
- [x] 主题党日/三会一课徽章在 7 个主题下颜色不变

## 密度与间距

- [x] 输入/下拉 40（紧凑 34）、页面/弹窗按钮 36、卡片按钮 32、行内按钮 28
- [x] 列表单行 48、双行 56、紧凑 44、表格行 40、`summary` 最小 40
- [x] 按钮宽度由内容决定；行内按钮水平内边距 8–10；无 `min-height` 脱离文字行高
- [x] 行内 28px 按钮命中区 ≥44px（伪元素扩展，视觉高度不变）
- [x] 页头说明→内容 8–12px；标题→次级→描述 8px
- [x] 组件内边距只取 4/8/12/16/24；本批触碰范围无 2/6/10/14/20
- [x] 真机无 61/62/79/82 四种通知行高度；单行/双行高度稳定

## 交互态

- [x] hover 使用 `hoverBg`、active 使用 `activeBg`、selected 使用 soft 三件套
- [x] hover 规则全部由 `@media (hover:hover)` 门控；触屏有 `:active`
- [x] 无 `filter/opacity/translate/shadow` 作为 hover；transition 只允许 colors 150ms
- [x] 页签、`summary`、列表行、卡片、图标按钮均有 hover + focus-visible
- [x] 静态行/卡无 hover 背景与 pointer；表格行按 `data-interactive` 门控
- [x] 57 处默认灰 `hover:bg-gray-*` 已改为语义 token
- [x] hover-only 信息（日历预览、帮助目录、tooltip）有 focus 或触屏等价

## 触屏与可读性

- [x] ≤640px 输入字号 ≥16px
- [x] placeholder 对比度 ≥4.5:1
- [x] 行内按钮/图标按钮/页码/主题色块命中区 ≥44px
- [x] `vote-note` 等漏网输入有统一 focus 环
- [x] 页签选中不再引起 1px 文字位移

## 守卫与验证

- [x] `theme-palette-guard` 全绿且非空转（7×2×8 + 对比度/彩度 + 零算法 + 语义色不变）
- [x] `density-spacing-guard` 全绿（高度、五档间距、数值档基线）
- [x] `hover-state-guard` 全绿（三态、门控、无 filter、页签/摘要、静态行）
- [x] 既有守卫基线逐条更新并注释理由，未削弱断言
- [x] 第 1 次定向全绿
- [x] 第 2 次 `npm run test:daily` 全绿
- [x] 第 3 次 `SWEEP_SHARD=all` 三通道 0 失败
- [x] 全程套件级运行不超过 3 次；红项只单跑失败文件诊断
- [x] `DESIGN_SYSTEM` / 执行日志 / `TIMESTAMPS` 已同步
- [x] 版本戳 bump；中文提交（不 push），含 Why / What / Verification / Boundaries
