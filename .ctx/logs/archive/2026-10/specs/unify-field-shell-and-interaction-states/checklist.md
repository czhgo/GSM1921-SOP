﻿# Checklist

## 状态语言

- [x] 列表行选中＝主题浅底＋主题色字＋主题描边（不再是 `#F3F4F6`）
- [x] 日历格选中桌面/移动同色系（主题 soft，不再是灰/红两套）
- [x] 二级页签选中不再是近黑（`--neutral-900`）
- [x] 下拉项键盘高亮与选中同族（不再一灰一主题）
- [x] 步骤条当前步用主题 soft，不再 `bg-gray-800/bg-gray-100`
- [x] 侧边栏选中保留浅灰，并写明「唯一豁免」理由
- [x] 全站无「用 hover/active 令牌表达 selected」的规则

## 实底按钮 hover

- [x] 主题表 9 token（含 `strongHover`）× 亮/暗齐备且手选 hex
- [x] `.btn-accent:hover` 用 `strongHover`（同色相加深），底色不落灰
- [x] `login.html` 的 `.login-btn:hover/:active` 灰覆盖已删除
- [x] 登录页 10 个深色按钮悬停后文字对比度仍 ≥4.5:1

## 字段外壳

- [x] 输入/下拉/多行/日期共用同一外壳类，静置/悬停/活动/禁用/只读五态齐备
- [x] 活动态＝主题色边 1px + 3px 主题浅晕；**鼠标点击不出近黑外环**
- [x] 键盘 `:focus-visible` 出 2px 主题色环，且与浅晕同色系
- [x] 暗色不再「金边＋金环」双金
- [x] 禁用与只读视觉可辨（不是都用 opacity）
- [x] 页面无「金色边框 + 黑环」同现的控件

## select 统一与大选项集

- [x] 全站原生 `<select>` 均 `data-cs-enhanced`（值载体仍是原生 select）
- [x] 下拉面板与页面同一套 token（不再是 OS 原生面板）
- [x] 大选项集支持：搜索 / 分组 / 惰性加载 / 近期优先 / 上限与空态
- [x] 选人场景仍走 `person-picker`，不因本次改动回退

## 动效

- [x] 时长只剩 4 档、easing 只剩 2 个；无硬编码 `0.15s`
- [x] 无 `transition: all`；无 `height/width/max-height/padding/top/left/margin` 过渡
- [x] 折叠展开与进度条不再逐帧重排
- [x] 切页签以 opacity 进入，无硬闪
- [x] `prefers-reduced-motion` 下 transition-delay/animation-delay 归零

## 活动类别颜色

- [x] `activityTypeTone(type)` 为唯一判据；三会一课＝`#CE1126`、主题党日＝`#A16207`
- [x] 6 处「恒灰 / 兜底蓝 / 第三种红」已修
- [x] 状态色不借类别色（`completed→success`、`recruiting→warning`、打回→warning、计数→neutral）
- [x] info 蓝只出现在白名单语义（通知重要 / 已发布 / 待汇报 / 建议选修 / 配置标注）

## 数据闭环

- [x] 活动详情「去归档」落点正确，命中折叠区先展开
- [x] 定位失败有可见提示（不是静默）
- [x] `archive.html` 消费 `?tab=` / `?id=`，口径与宣传台一致
- [x] 无承载面的「复盘」假入口已删除
- [x] 被壳清掉的 `view` 深链改走 `subview`/`ctx.navTarget`
- [x] `person.html?personId=` 可消费；`activity.html?branchId=` 有写方或已删除
- [x] 后端归档读口支持 `archived` 过滤与分页；无 `activityId` 记录按 `branchId` 归属
- [x] 未登录访问归档库有「演示数据」标识或明确要求登录

## 组件厚度

- [x] 同一行 `summary` 与 `button` 同档（不再 40/32/28 三值）
- [x] 移动端无 `min-height:36` 例外
- [x] 按钮档尺寸只有唯一源（4 个落点已收敛）

## 守卫与验证

- [x] `activity-tone-guard` / `field-shell-guard` / `motion-guard` / `archive-deeplink-guard` 全绿且非空转
- [x] `tab-nav` 覆盖「复盘」落点；`theme-palette-guard` 覆盖 9 token
- [x] 既有基线逐条更新并注释理由，未削弱断言
- [x] 定向全绿；`npm run test:daily` 全绿；全量三通道 0 失败
- [x] `DESIGN_SYSTEM` §12.11–§12.14 ＋ SD-25…SD-32 已写入
- [x] 执行日志批次 508 已写入；版本戳 bump；中文提交（不 push）

## 遗留收口

- [x] CLAUDE 热层已精简（只留在办索引＋指针）
- [x] 分页钮 30/32 已裁定并一致（CSS ＋ DECK ＋ 文档）
- [x] Tailwind `1.5/2.5/3.5` 已清零或登记棘轮
- [x] `--tab-accent*` 已并入 `--app-accent-*`
- [x] info 蓝已白名单化；`--app-accent-bg/-border/-text/-deep` 别名已退场
