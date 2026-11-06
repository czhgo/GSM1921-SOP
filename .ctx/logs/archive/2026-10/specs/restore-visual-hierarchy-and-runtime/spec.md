# 视觉层级、色彩分工与运行时竞态修复 Spec

## Why

支书抽样发现的问题不是孤立审美：分组胶囊「没恢复」其实是 CSS 存在但 `≤1280px` 直接隐藏、底色与页面底仅 1.06:1、高度 18px；竖条与文字实际只有 4px（`gap:4px !important` 压掉 `gap-2`）；`btn-ghost` 自被判「无边框不可辨识」后仍有 79 处在当动作按钮，hover 色差 1.06–1.11:1；全仓 0 处 `table-layout`，末列吃掉全部余量，造成「向后伸展」；色彩引用中性 : 强调 : 状态 : 类别 ≈ 4.9 : 2.4 : 0.8 : 1.0，同屏只剩一个主题色相。

运行时侧同样有结构性根因：Tab 点击使用**冻结的 renderCtx**；`_renderCurrentTab` 不清 `dataset.currentTab` 导致守卫跳过骨架、静默空渲染；异步 render 后写覆盖；loading 占位 `pointer-events:none` 且不超时；`calendar-tab` 把绑定标记挂在持久容器上，切走再回来筛选控件永久变哑。首屏至少有 1 个 600ms 硬等待、两次全库 `loadDB`、两次全量种子修复与派生；鼠标卡帧不是 `mousemove`（全仓 0 个），而是日历 hover 浮窗「写 DOM→读布局」、全局 MutationObserver 扫全部 select、以及每次 `setState` 整块重建。

**方向修正（支书裁定）**：不是否定现有主题色盘——现有 7 主题 × 亮/暗 × 9 token 的色盘是已经跑通且值得推广的资产；问题在于**功能色没有获得与主题色同等自觉的规则层**。本批要把「主题色层」与「功能色层」并列成两套可复用规则，而不是回到 5–6 月的自由配色。

## What Changes

- **BREAKING**：容器语义收敛——`section` 只用于有 `aria-label` 的分区地标；`div` 只作通用容器；同一 class 不得同时承载「可交互摘要」与「只读摘要」。`metric-band` 拆 `--static` / `--interactive` 两档。
- **BREAKING**：Tab 分组胶囊**在所有宽度可见**：不设 1024/1280 隐藏阈值；窄屏缩小内边距与字号、让页签条横向滚动，组名仍可见；形状对比 ≥1.5:1，高度 ≥24px。
- **BREAKING**：按钮三档——动作按钮必须有描边或底色；纯文字动作必须有下划线或箭头（箭头不得 `neutral-400`）；图标按钮 32 视觉 + 44 命中；行载体必须有可见 hover 或左条。`btn-ghost` 只允许作非动作行载体。
- **BREAKING**：色彩双层制——主题色层（沿用并推广现有 7×2×9 色盘，只承担主行动/选中/链接/身份标签）＋功能色层（状态 4 色、类别 3 色、身份色，只在小面积使用）；两层各有 token、暗色值与守卫，不互相借用。
- **BREAKING**：详情跳转改为**按最小三成本的显式路由规则**：不是所有点击都一步直达，也不是全部先落工作台；每个入口必须声明 `direct | locate`，由上下文、对象、角色决定，并有矩阵与守卫。
- **BREAKING**：链接问题全量修复——全站单一链接色；帮助链接、速查链接、角色色链接全部并入；可点箭头不得用最浅中性色；链接必须有可感知的静态线索。
- `table-layout: fixed` + 显式列模板用于工作概况等工作表；移动端动作列改 `flex-start`。
- 运行时：renderCtx 改为取最新 state；统一 render 生命周期（seq + 去重 + 清标记 + await + 错误可见 + loading 超时恢复）；删除持久容器绑定标记；关键性能（600ms 可配、去双 loadDB、首屏只派生一次）。
- 规范：`DESIGN_SYSTEM` 增 SD-41…SD-46（含主题色盘推广与功能色层）；`CASES.md` 增 CASE-DESIGN-020…024；`PRODUCT_IA` 增详情路由矩阵。

## Impact

- Affected specs：`DESIGN_SYSTEM`（§2.8–2.14 色彩、§4 控件、§4.18 卡内构成、§10 落点、§12.15）、`CASES`、`PRODUCT_IA`、`TERMINOLOGY`（新增「直达 / 定位 / 功能色层」）。
- Affected code：
  - 运行时：`components/shell/{tab-bar.js,workspace-shell.js}`、`core/boot/{bootstrap.js,state.js}`、`entries/workspace/*-entry.js`、`entries/tabs/secretary/{calendar-tab.js,overview-tab.js}`、`data/{data-loader.js,mock-adapter.js}`、`services/core/mock.js`
  - 视觉：`styles.css`、`components/governance/work-overview.js`、`components/record/todo-tab-shell.js`、`entries/tabs/today/today-tab.js`
  - 色彩：`core/domain/constants.js`、`styles.css` LAYER 0–4、`components/ui/*`
  - 链接与详情：`entries/pages/{activity-entry.js,archive-entry.js}`、`components/record/{taskforce-view.js,inspector.js}`、`entries/tabs/**`
  - 守卫：`ui-control-system-guard`、`theme-palette-guard`、`link-color-guard`、`docs-governance-guard`、`page-sweep`、`click-cost`、新增路由/运行时断言（≤2 个守卫文件）

## ADDED Requirements

### Requirement: 主题色层与功能色层并列
系统 SHALL 把现有主题色盘（7 主题 × 亮/暗 × 9 token）作为标准层保留并推广；功能色层 SHALL 有独立 token、暗色值与使用边界；两层不得互相借用。

#### Scenario: 主题色不被功能色污染
- **WHEN** 用户切换任意主题
- **THEN** 主行动、选中、链接、身份标签随主题变化；状态/类别色保持不变；暗色下类别红与 danger 可区分

#### Scenario: 功能色只在功能位
- **WHEN** 页面出现状态或活动类别
- **THEN** 只用徽章/圆点/左条/图例等小面积；栏目头、表单区、正文链接不再借状态色

### Requirement: 容器语义唯一
系统 SHALL 让同一视觉类只承担一种语义：可交互摘要用 `button`/`a` 并带 `--interactive` 档；只读摘要用 `span`/`div` 并带 `--static` 档；`section` 必须有可访问名。

#### Scenario: 工作概况摘要带
- **WHEN** 用户看到「逾期 / 待办 / 在办 / 待答复」
- **THEN** 可点的三项有边框或底色与 hover，纯展示项无 hover；读屏听到 `group` 或 `region` 与视觉一致

### Requirement: 分组胶囊全宽可见
系统 SHALL 在所有受支持宽度显示分组胶囊；窄屏通过缩小内边距/字号与页签条横向滚动容纳，不得用 `display:none` 隐藏组名。

#### Scenario: 390 手机
- **WHEN** 用户在 390px 打开支书台
- **THEN** 仍能看到「总览 / 我的职责 / 协作与知情 / 制度与答复」四枚胶囊（可缩小），页签可横向滑动

### Requirement: 控件与内容可区分
系统 SHALL 让每个可点元素至少具备一种静态线索：描边、底色、下划线、箭头或可见 hover（色差 ≥1.2:1）；`cursor:pointer` 不算线索。

#### Scenario: 写入活动
- **WHEN** 用户看「今天」页
- **THEN** 「写入活动」有描边或底色，与「看日历」同档；不再像纯文字

### Requirement: 链接单一色与全量修复
系统 SHALL 全站只使用一个链接色（来自主题 soft-text）；帮助链接、速查链接、角色色链接全部并入；链接必须有下划线或箭头等非颜色线索；箭头不得用 `neutral-400`。

#### Scenario: 帮助页链接
- **WHEN** 用户在帮助页看到「去设置」等链接
- **THEN** 与工作台链接同色同线索，不再出现蓝色/角色色链接

### Requirement: 表格列宽有模板
系统 SHALL 对工作概况等工作表使用 `table-layout: fixed` + 显式列宽；动作列内容在 1440/1280 下贴列尾；≤640 卡片化时动作列 `justify-content:flex-start`。

#### Scenario: 1440 工作分工表
- **WHEN** 表格 5 列渲染
- **THEN** 末列不再吃掉全部余量，按钮与「待处理」标签对齐

### Requirement: 详情路由按最小三成本
系统 SHALL 为每个对象入口声明 `direct`（直达详情页）或 `locate`（先落工作台/对应 tab 再定位），并用 `resolveObjectRoute({type,obj,viewer,entry})` 统一返回 `{mode, href, readOnly, reason}`。

规则：
- **direct**：通知/待办的动作、跨页分享/深链、对象是用户当前唯一任务、入口不在对象所属工作台内。
- **locate**：入口已在对象所属工作台（管理/聚合上下文），直达会丢失列表/筛选上下文；或角色需要在工作台内继续多步操作；或对象处于预览态。
- **不可点**：无 id、无权限、无承载面。

#### Scenario: 支书从活动管理点活动
- **WHEN** 支书在「活动管理」点日历条目
- **THEN** 走 `locate`：同页 inspector 预览，并提供「打开完整页」；不强制整页跳走

#### Scenario: 成员从通知点活动
- **WHEN** 成员在通知详情点对象卡
- **THEN** 走 `direct`：进入 `activity.html?id=`，因为通知不在活动工作台上下文内

#### Scenario: 组织台点专班
- **WHEN** 组织委员在「专班管理」点专班卡
- **THEN** 走 `locate`：同页面板预览 + 「打开完整页」；分享/深链仍直达 `taskforce.html?id=`

### Requirement: 已归档只读且可查
系统 SHALL 保留已归档对象的详情入口，但详情页所有写口关闭，并显示「已归档，只读保留」；归档弹窗必须提供「打开完整页」。

#### Scenario: 已归档活动
- **WHEN** 支书打开已归档活动详情
- **THEN** 看不到成员编辑与写按钮；归档库弹窗有「打开完整页」

### Requirement: 详情入口有门
系统 SHALL 用同一路由函数判定可点性；缺 id、跨支部、无承载面时不得渲染可点入口；深链失败必须有可见提示。

#### Scenario: 跨支部深链
- **WHEN** 用户用其他支部的对象 id 打开详情
- **THEN** 显示「无权查看该对象」而不是照常渲染

### Requirement: Tab 渲染生命周期
系统 SHALL 保证「点击哪个 tab，最终渲染的就是哪个 tab 的最新数据」：renderCtx 每次取最新 state；render 有序号与去重；切换时清旧标记；失败可见；loading 超时恢复。

#### Scenario: 活动管理改月份后切走再切回
- **WHEN** 用户切月触发 setState，再切到别的 tab 并切回
- **THEN** 日历按最新月份渲染，不显示旧快照

### Requirement: 绑定幂等
系统 SHALL 把「已绑定」标记挂在会被重建的元素自身，或使用事件委托；挂在持久容器上的标记不得导致新控件失去监听。

#### Scenario: 活动管理筛选
- **WHEN** 用户离开活动管理再回来，操作关键词/类别/品牌/清除
- **THEN** 四个筛选控件仍然生效

### Requirement: 关键性能预算
系统 SHALL 让首屏内容出现不被固定 600ms 延迟硬推迟；每页只 hydrate 一次；首屏只执行一次种子修复与派生；loading 占位不得无限动画。

#### Scenario: 首屏
- **WHEN** 打开支书台
- **THEN** 内容出现前不再有 600ms 固定等待与第二次全库 loadDB；骨架不长期停留

## MODIFIED Requirements

### Requirement: 按钮族
`btn-ghost` 从动作族移除，仅保留为非动作行载体；动作按钮统一走 `btn-outline` / `btn-accent*`；纯文字动作加下划线或箭头。

### Requirement: 中性色
`neutral-400` 只用于装饰图标；数据零值、可点箭头、状态点改用 `neutral-600` 或主题 soft-text；正文对比 ≥4.5:1。

### Requirement: 间距
卡内分组采用 8px 组内 / 16px 组间；竖条与文字间距 8px；`metric-band` 项间 8–12px，不再用 0 间距 + 1px 线。

### Requirement: 色彩 token
`--functional-*` 改名 `--status-*`；`--accent-<role>` 与 `ROLE_COLORS` 合并为单一源；删除零消费者 token；新增 `--color-link`、`--color-border-subtle/strong`、`--color-text-*`、`--color-category-*`。

### Requirement: 守卫口径
`ui-control-system-guard` 断言「同 class 同语义 / 胶囊全宽可见 / 按钮三档 / 表格 fixed」；`theme-palette-guard` 断言「主题色与功能色分离、暗色类别≠状态、删 token 零引用」；`link-color-guard` 断言单一链接色；新增路由与运行时断言（renderCtx 最新、绑定幂等、loading 超时、入口 mode 声明）。

## REMOVED Requirements

### Requirement: 1280px 隐藏分组名
**Reason**：把设备预设当内容断点，导致「胶囊没恢复」。
**Migration**：全宽可见；窄屏缩小胶囊与页签条横滑。

### Requirement: `btn-ghost` 作为动作按钮
**Reason**：无底色无边框、hover 1.06:1，违反「控件与内容可区分」。
**Migration**：动作改 `btn-outline` / `btn-accent*`；纯文字动作加下划线/箭头。

### Requirement: 「所有入口都直达」或「所有入口都先落工作台」
**Reason**：两种一刀切都不满足最小三成本。
**Migration**：按 `direct | locate` 矩阵声明；同一入口只能声明一种。

### Requirement: 归档库弹窗作为唯一详情
**Reason**：与全页详情形成第 4 种承载面，且深链不校验归档状态。
**Migration**：弹窗保留为预览，补「打开完整页」；深链补状态校验与失败提示。
