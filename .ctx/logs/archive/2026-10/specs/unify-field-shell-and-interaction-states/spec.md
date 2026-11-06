# 统一字段外壳与交互状态 Spec

## Why

六条反馈指向同一件事：**我们用「状态」在讲话，却没有一套状态的语言**。选中用灰、按下用红、聚焦用金边＋黑环、深色按钮悬停变灰、`summary` 与 `button` 同排厚度不一、活动类别全灰——每处都能自圆其说，合起来就没有纪律。再加上两条数据链路的空壳（活动「复盘」落错页、`archive.html` 不读任何参数），用户看到的是「点了没反应 / 进去什么都没有」。

## What Changes

- **选中态（BREAKING）**：全站选中改为主题 soft 三件套（浅底＋主题色字＋描边）；仅侧边栏保留浅灰。禁止再用 `--surface-hover/--surface-active` 表达「选中」。
- **实底按钮 hover**：新增第 9 个主题 token `strongHover`（每主题 × 亮/暗手选 hex）；删除 `login.html` 把深色键刷成 `#F3F4F6` 的覆盖。
- **字段外壳（B 立场）**：input / select / textarea / 日期 / 搜索统一为「字段外壳」——静置 1px 中灰边；悬停加深；聚焦＝边框变主题色 1px ＋ 3px 主题浅晕（鼠标与键盘同款）；键盘 `:focus-visible` 另出 2px 主题色环（唯一保险，不与浅晕异色叠加）；禁用与只读拆成两态。删除 `.input-flat:focus` 的金边＋近黑 outline 双答。
- **select 全量统一**：所有原生 `<select>` 迁到 `custom-select`；新建「大选项集」一般化框架（搜索 / 分组 / 惰性加载 / 近期优先 / 上限与空态），选人继续走 `person-picker`，活动类走可搜索下拉。
- **动效令（BREAKING）**：4 档令牌（120 / 180 / 240 / 200-enter）＋ 2 个 easing token；新增 4 个可复用动效类；禁止对布局属性做过渡；补 `prefers-reduced-motion` 的 delay 归零；消除切页签的硬闪。
- **活动类别颜色**：新增单一源 `activityTypeTone(type)`（三会一课＝`#CE1126`、主题党日＝`#A16207`、其余中性）；修掉 6 处「恒灰 / 兜底蓝 / 第三种红」；状态色与类别色分离。
- **数据闭环**：归档链路（空态、折叠区展开、失败提示、`archive.html` 读参）、假入口（复盘落 `talent/archive`）、被壳清掉的 `view` 深链、`person.html?personId=`、`activity.html?branchId=` 账实对齐；后端补归档分页/过滤、无 `activityId` 记录的支部归属、未登录演示数据标识。
- **组件厚度归一**：`summary` 不再污染按钮族高度（40/32/28 三档并存）；按钮档收敛到唯一源；删除移动端 `min-height:36` 例外。
- **遗留收口（并入本 spec）**：CLAUDE 热层精简、分页钮 30px、Tailwind `1.5/2.5/3.5`、`--tab-accent*` 内联、info 蓝 69 处白名单、`--app-accent-*` 兼容别名退场。

## Impact

- Affected specs: 组件层视觉语言（DESIGN_SYSTEM §二/§十二）、交互三态、数据深链与归档
- Affected code:
  - `docs/src/styles.css`（唯一源：状态/外壳/动效/厚度）
  - `docs/src/components/ui/*`（badge / custom-select / list-row / detail-anchor）
  - `docs/src/components/record/*`（activity-view / calendar / inspector / taskforce-view）
  - `docs/src/entries/**`（activity-entry / archive-entry / prop archive / org taskforce / party-committee-meeting / settings）
  - `docs/login.html`（删除灰 hover）
  - `server/routes/resources/**`（归档分页/过滤、支部归属）
  - `server/test/*-guard.test.mjs`（5 个新守卫）

## ADDED Requirements

### Requirement: 选中态单一源

系统 SHALL 用主题色 soft 三件套表达「选中」，仅在侧边栏保留浅灰。

#### Scenario: 待办列表选中一行
- **WHEN** 用户点选待办主从行
- **THEN** 该行为主题浅底＋主题色字＋主题描边，不是 `#F3F4F6`；切主题后随之变色

#### Scenario: 日历选中日期
- **WHEN** 用户点选日历格
- **THEN** 桌面与移动端同色系（主题 soft），不再桌面灰、移动红

### Requirement: 字段外壳（输入类控件）

系统 SHALL 用同一套外壳表达所有输入类控件的五个问题（可输入 / 活动 / 有效 / 可用 / 已选），并以状态正交为前提。

#### Scenario: 鼠标点进输入框
- **WHEN** 用户点击 `.input-flat`
- **THEN** 边框变主题色 1px 并出现 3px 主题浅晕；**不出现**近黑外环

#### Scenario: 键盘 Tab 到输入框
- **WHEN** 用户用 Tab 进入控件
- **THEN** 除浅晕外另有 2px 主题色环（与浅晕同色系，不相冲）

#### Scenario: 只读与禁用
- **WHEN** 控件为只读
- **THEN** 无边框＋浅底、文字可读；当控件为禁用时才是灰底灰字（两态不得混用）

### Requirement: 大选项集选择框架

系统 SHALL 为「数据量大 / 无限增长」的选择场景提供统一能力：搜索、分组、惰性加载、近期优先、明确上限与空态。

#### Scenario: 选择活动（无限增长）
- **WHEN** 用户打开活动选择器
- **THEN** 先给「近期 / 与本页相关」一屏，输入即远程/本地搜索，滚动按需加载，并显示「共 N 项」上限

### Requirement: 动效令

系统 SHALL 只用 4 档时长与 2 个 easing，且只对 `transform/opacity/color/background-color/border-color/box-shadow` 做过渡。

#### Scenario: 展开折叠区
- **WHEN** 用户展开「更多」
- **THEN** 用 `grid-template-rows` 或 transform 展开，不出现 `max-height/padding` 逐帧重排

#### Scenario: 切换页签
- **WHEN** 用户切换工作台页签
- **THEN** 内容区以 opacity 过渡进入，不再硬闪

### Requirement: 活动类别颜色单一源

系统 SHALL 由 `activityTypeTone(type)` 唯一决定活动类别色：三会一课＝`#CE1126`、主题党日＝`#A16207`、其余中性；状态色不得借类别色。

#### Scenario: 主题党日卡片
- **WHEN** 任意页面渲染类别为「主题党日」的活动
- **THEN** 显示金档徽章（`badge--gold` / `data-tone="gold"`），不是 `badge--info`

### Requirement: 数据深链闭环

系统 SHALL 保证「点了就去对的地方，并看见真实信息」：定位失败必须可见提示，落地页必须消费其 URL 参数。

#### Scenario: 从活动详情去归档
- **WHEN** 用户点「去归档」并带 `focusActivityId`
- **THEN** 归档页自动展开折叠区、滚动到该行并高亮；找不到时给出可见提示（不是静默）

#### Scenario: 归档库深链
- **WHEN** 打开 `archive.html?tab=taskforce`
- **THEN** 落在专班页签，且该参数在页面本地 tab 表内可被机检

## MODIFIED Requirements

### Requirement: 交互三态（DESIGN_SYSTEM §12.8）

hover 保持「只改颜色」；active 保持三源（中性灰 / 主题 activeBg / 党建红 active）；**新增**：选中态从灰改为主题 soft 三件套，且与 active 明确分工——active 是瞬时按压，selected 是持续状态，两者不得共用令牌。

### Requirement: 输入控件焦点（替代「金边＋近黑环」）

删除 `:focus` 双答；活动态＝边框变色＋浅晕；键盘保险＝`:focus-visible` 环。暗色不再把 `--focus-ring` 设为党徽金。

## REMOVED Requirements

### Requirement: 用中性灰表达选中

**Reason**: 纯白底上的 `#F3F4F6` / `#E5E7EB` 既脏又不可辨，且与 hover/按下混淆。
**Migration**: 列表行、日历格、二级页签、下拉项、步骤条改主题 soft；侧边栏保留浅灰。

### Requirement: `login-btn` 的统一灰 hover

**Reason**: 对深色实底按钮等于「白字浮在灰上」。
**Migration**: 删除该覆盖，实底按钮 hover 用新增 `strongHover` 同色相加深。
