﻿# Checklist

## 链接

- [x] 全站 `<a>` 上不再出现 `text-blue-*` / `text-sky-*` / `text-indigo-*`（信息态徽章除外且逐条登记）
- [x] `.link` 颜色 = `--app-accent-soft-text`，hover 只加下划线，active 与常态同色
- [x] 首页「查看全部 →」与「完整日历 →」同色同 hover
- [x] `.text-accent` 仍可用（别名），无两套链接色

## 按压

- [x] `--surface-active` 亮/暗均为中性灰（`var(--neutral-200)`），不出现红
- [x] 主题色控件按压为 `--app-accent-active-bg`；党建红实底为 `--party-red-active`
- [x] 按钮 / 页签 / 分段 / chip / 下拉项 / `summary` / 分页钮按压均有 1px 内阴影
- [x] 按压过渡 180ms；无位移、无缩放
- [x] 静态行/卡仍无按压反馈

## 守卫

- [x] `link-color-guard` 全绿且非空转
- [x] `hover-state-guard` 按压断言全绿（三源 + 内阴影 + 无位移）
- [x] 既有基线逐条更新并注释理由，未削弱断言

## 文档与验证

- [x] `DESIGN_SYSTEM` §12.10 + SD-22…SD-24 已写入
- [x] 执行日志批次 507 已写入
- [x] 定向全绿；`npm run test:daily` 全绿；全量三通道 0 失败（红项只单跑诊断）
- [x] 版本戳 bump；中文提交（不 push）
