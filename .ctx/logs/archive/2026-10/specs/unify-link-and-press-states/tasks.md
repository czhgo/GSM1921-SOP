﻿# Tasks

> 顺序：先定令牌与组件类（单文件）→ 再迁移调用方（多文件，可并行）→ 守卫读最终值 → 文档 → 三次验证。
> 文件边界：Task 1 独占 `styles.css`；Task 2 只改 `docs/src/**/*.js` 与根 HTML，不动 `styles.css`。

- [x] Task 1: 令牌与组件类（`docs/src/styles.css`）
  - [x] SubTask 1.1 `--surface-active` 改 `var(--neutral-200)`（亮 `#E5E7EB` / 暗 `#334155`），删除深色段的红浅底覆盖。
  - [x] SubTask 1.2 新增 `--transition-press: 180ms ease-out`、`--press-shadow: inset 0 1px 2px rgba(15,23,42,.10)`（暗色 `rgba(0,0,0,.45)`）。
  - [x] SubTask 1.3 新增 `.link`（色 `--app-accent-soft-text`；hover 下划线 `underline-offset: 2px`；active 同色）；`.text-accent` 保留为别名。
  - [x] SubTask 1.4 按压规则：按钮 / 页签 / 分段 / chip / 下拉项 / `summary` / 分页钮 `:active` 叠 `--press-shadow`；`.btn-tab.active:active` 与主题色 chip 走 `--app-accent-active-bg`；按钮族 transition 换 `--transition-press`。

- [x] Task 2: 链接色迁移（`docs/src/**/*.js`、`docs/index.html`）
  - [x] SubTask 2.1 纯链接（`<a>` 且无 `bg-*`）：`text-blue-600/700/800`、`hover:text-blue-*`、`text-sky-*`、`text-indigo-*` → `text-accent`；hover 改 `hover:underline`。
  - [x] SubTask 2.2 信息态徽章 / 状态字（同串带 `bg-blue-*`、`badge--info`、`tint-*`）**保留蓝色**，逐条登记理由。
  - [x] SubTask 2.3 不得新增主题色 hex；迁移只换类名。

- [x] Task 3: 守卫
  - [x] SubTask 3.1 新增 `link-color-guard`：`<a>` 标签串内 `text-blue|sky|indigo` 计数为 0；`.link` 定义消费 `--app-accent-soft-text`；信息态白名单非空转。
  - [x] SubTask 3.2 `hover-state-guard` 增补：`--surface-active` 不得含红（`#FEE2E2` / `#2A1A22`）；主题色控件 active 断言 `--app-accent-active-bg`；`--press-shadow` 唯一源且无位移/缩放。
  - [x] SubTask 3.3 更新受影响基线（`style-baseline` / `hex-hardcode` / `ui-contrast` / `page-sweep` 如涉字色）。

- [x] Task 4: 文档与交付
  - [x] SubTask 4.1 `DESIGN_SYSTEM.md` 新增 §12.10（链接与按压）与 SD-22…SD-24；§12.8 三态表补按压三源。
  - [x] SubTask 4.2 执行日志批次 507（Why / What / Verification / Boundaries / sample-diff）。
  - [x] SubTask 4.3 定向 → daily → 全量；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 2 依赖 Task 1（`.link` 与 `text-accent` 就位后再迁移）。
- Task 3 依赖 Task 1、2（守卫读最终值）。
- Task 4 在各任务之后。
