# 统一链接语义色与按压态 Spec

## Why

同一页面里「跳转」有两种颜色（`text-accent` 主题色深字 18 处 vs `text-blue-*` 蓝色 132 处），读者无法从颜色判断「这是链接还是信息态」；而按压态用的是 `--surface-active: #FEE2E2`（党建红浅底，暗色 `#2A1A22`），约 20 个组件的 `:active` 都在复用它 ⇒ 按下任何中性按钮都会闪红。两处都是**令牌选错**，不是审美分歧。

## What Changes

- **链接语义色单一源**：新增 `.link` 组件类，颜色 = `--app-accent-soft-text`；hover 只加下划线（不改色，避免 hover 变浅掉对比度）；active 保持同色。全站**跳转类** `a` 内联色统一到 `.link` / `.text-accent`；蓝色退回「信息态」语义（`badge--info`、状态点、`bg-blue-*` 徽章），不再承担链接。
- **按压态单一源**：`--surface-active` 由党建红浅底改为中性灰（`var(--neutral-200)`，亮 `#E5E7EB` / 暗 `#334155`）；主题色控件按压走 `--app-accent-active-bg`；党建红实底按压走 `--party-red-active`（已存在，保持不变）。
- **按压动效**：新增 `--transition-press: 180ms ease-out` 与 `--press-shadow: inset 0 1px 2px …`；按钮 / 页签 / 分段 / chip / 下拉项 / `summary` / 分页钮的 `:active` 叠一层内阴影，**不加位移、不加缩放**。
- **规则沉淀**：细则写入 `DESIGN_SYSTEM.md`（§12.10 链接与按压 + SD-22…SD-24）；CLAUDE 热层本批**不动**（另立专项再精简）。
- **守卫**：新增 `link-color-guard`（`<a>` 上不得出现 `text-blue/sky/indigo`；`.link` 必须消费 softText）；`hover-state-guard` 增补按压断言（`--surface-active` 不得为红、主题控件 active 用 `activeBg`、内阴影唯一源）。

## Impact

- Affected specs: 组件层视觉语言（DESIGN_SYSTEM §二 / §十二）、交互三态（§12.8）
- Affected code:
  - `docs/src/styles.css`（令牌、`.link`、press 规则）
  - `docs/src/**/*.js`、`docs/index.html`（链接色迁移，约 43 文件）
  - `server/test/link-color-guard.test.mjs`（新增）、`server/test/hover-state-guard.test.mjs`（增补）
  - `content/04_web_design/design-system/DESIGN_SYSTEM.md`

## ADDED Requirements

### Requirement: 链接语义色单一源

系统 SHALL 让所有页面内跳转链接使用同一主题色深字（`--app-accent-soft-text`），不得用 Tailwind 蓝色充当链接色。

#### Scenario: 同页两个跳转链接
- **WHEN** 首页同时出现「查看全部 →」与「完整日历 →」
- **THEN** 两者颜色相同，且 hover 都只加下划线，不出现蓝/主题色两种链接

#### Scenario: 信息态蓝色仍是蓝
- **WHEN** 某徽章表达「信息 / 待办」语义（`badge--info`、`bg-blue-*`）
- **THEN** 该蓝色保留（信息态），不受链接规则影响

### Requirement: 按压态配色与动效单一源

系统 SHALL 让中性控件的按压为中性灰、主题色控件的按压为主题色 `activeBg`、党建红实底为 `--party-red-active`；按压 SHALL 叠 1px 内阴影并过渡 180ms，不做位移与缩放。

#### Scenario: 点击中性页签
- **WHEN** 用户按下 `.btn-tab`
- **THEN** 背景变中性灰（不出现红色），并出现内阴影，松开 180ms 内回到常态

#### Scenario: 点击主题色选中页签
- **WHEN** 用户按下 `.btn-tab.active`
- **THEN** 背景为 `--app-accent-active-bg`（该主题的按压档），不落到中性灰

## MODIFIED Requirements

### Requirement: 交互三态（DESIGN_SYSTEM §12.8）

按压态由「`--surface-active` 统一红浅底」改为「中性灰 / 主题 `activeBg` / 党建红 `active` 三源」，并补 180ms 内阴影；hover 与 selected 口径不变。

## REMOVED Requirements

### Requirement: `--surface-active` 作为红浅底

**Reason**: 它把党建红带进了中性控件，构成「点一下闪红」的错误反馈。
**Migration**: 改指向 `var(--neutral-200)`；主题色控件改用 `--app-accent-active-bg`。
