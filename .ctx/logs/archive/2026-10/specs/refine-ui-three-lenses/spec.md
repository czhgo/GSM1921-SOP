# UI 三项专项（最小三成本 / 脏乱繁 / 美学）Spec

## Why

10 路独立审查（3 + 3 + 4）显示：当前 UI 的问题不是单页瑕疵，而是**同一套壳层的规则互相打架**。

- 分组胶囊在 8–9 月是**主题色 10% 淡底、无边框、3px 直角**；批次 513 改成了 solid soft 底 + `neutral-400` 描边，既不是原样，也和选中页签撞色。
- 全站 110 处链接下划线（54 个文件），用户明确要求“全系统一个下划线都没有”。
- 390 帮助/关于页横向溢出、目录消失；页签 10 个只露 3 个；空态大卡占据首屏；加载是“压暗→硬替换”，没有清楚等待感。
- 逾期数字用 warning 填充色当文字（2.15:1）；暗色选中态借 error 红；目录整体 40% 透明；金色/红色同时承担主题色与功能色，语义混叠。

本批按用户裁定分三个子专项**顺序执行**，每个子专项内部 3–4 个独立 skill 并行；先修“能不能用”，再修“是否脏乱繁”，最后修“是否好看、等待是否舒服”。

## 执行方式（过程约束）

- 子专项顺序固定：**一、最小三成本 → 二、脏乱繁 → 三、其他美学**；上一阶段验证完成才进入下一阶段。
- 每个子专项内部并行 3–4 个代理；每个代理只加载一个独立 skill，不读其他代理报告，不共享中间结论。
- 每个代理只输出“现象 / 证据 / 影响 / 方向与代价 / 严重度 / 可能冲突”，不直接改代码。
- 主代理只做共识 / 分歧 / 待裁定汇总，不把分歧折中成“综合建议”。
- 证据必须可复现：`文件:行`、computed style、DOM 选择器、截图（注明视口与页面状态）、命令与退出码。
- 本 spec 中用户补充优先于 AI 推荐；冲突时以用户原话为准。

## What Changes

- **BREAKING**：全站**文本下划线清零**——`text-decoration: underline`、Tailwind `underline`/`hover:underline`、`text-underline-offset` 全部移除；链接改用颜色 + 箭头/图标/底色 hover 识别。表格分隔线、卡边、选中态边线不属于“文本下划线”，保留。
- **BREAKING**：分组胶囊回到 8–9 月原样——**主题色 10% 淡底、无边框、3px 直角、600 字重、0.5px 字距**；选中页签改用 solid soft 底 + 更强描边区分，不使用下划线。
- **BREAKING**：About 页撤掉所有入口/路由（侧边栏、帮助目录、README 指针），页面本身不改；About 不再属于系统导航。
- **BREAKING**：加载体验重做——页签/页面切换用**明确 skeleton + 文案 + 150–200ms 交叉淡入**，目标 ≤1s；禁止整块压暗后硬替换；减少动效偏好下只淡入不位移。
- **BREAKING**：金色/红色拆成“主题色语境”与“功能色语境”两套：主题选中等继续用主题 accent；三会一课红、主题党日金使用独立功能色 token，不再与 danger/warning/主题 accent 互相借用。
- 最小三成本修复：键盘首焦点、日历无落点、移动端待办顺序、顶栏焦点环、侧栏焦点、日历 roving tabindex、活动“下一步”权限。
- 脏乱繁修复：页标题单层、页签条结构、重复动作、空态、40px 折叠摘要、内部 ID/变更注记、帮助页密度。
- 美学修复：字体族与字号三档、页标题层级、逾期文字对比、暗色选中、目录透明度、登录暗色输入、统计卡、登录按压、详情页细节。
- 新增/扩展守卫：无下划线、胶囊无边框、About 零入口、加载 skeleton/≤1s、功能色分离、页标题唯一、390 无横向溢出。

## Impact

- Affected specs：`DESIGN_SYSTEM`（§一 第2条最小三成本、§3.2.2 字阶、§4 控件、§12.3/12.15、SD-3/SD-36/SD-47）、`DESIGN_METHODOLOGY`（加载与过渡）、`DATA_MODEL` 不涉及、`PRODUCT_IA`（About 撤路由、页标题层级）。
- Affected code：
  - 壳层：`docs/src/components/shell/{tab-bar.js,header.js,sidebar.js,workspace-shell.js}`、`docs/src/styles.css`
  - 页面：`docs/src/entries/tabs/today/today-tab.js`、`docs/src/components/record/{todo-tab-shell.js,todo-list.js,calendar.js}`、`docs/src/entries/tabs/shared/activity-calendar-tab.js`
  - 公共页：`docs/help.html`、`docs/src/about.css`（仅撤入口，不改页面）、`docs/src/components/shell/sidebar.js`
  - 链接：54 个文件的 110 处 underline
  - 色彩/字体：`docs/src/styles.css` LAYER 0–4、`docs/src/core/domain/constants.js`、`docs/src/core/boot/theme.js`
  - 加载：`docs/src/components/shell/tab-bar.js`、`docs/src/data/data-adapter.js`、`docs/src/core/base/utils.js`
  - 守卫：`ui-contrast-guard`、`ui-control-system-guard`、`link-color-guard`、`theme-palette-guard`、`page-sweep`、`ui-tab-overflow`、`ui-motion-guard`、`focus` 相关；新增 `no-underline-guard`、`loading-experience-guard`（≤2 个）

## ADDED Requirements

### Requirement: 文本下划线全站清零
系统 SHALL 移除所有链接与可点文本的 `text-decoration: underline`、Tailwind `underline`/`hover:underline`、`text-underline-offset`；链接识别改用颜色 + 箭头/图标/底色 hover。

#### Scenario: 正文链接
- **WHEN** 用户看到帮助页、活动详情、待办行内的链接
- **THEN** 没有文本下划线；链接仍可通过颜色与箭头/图标识别

#### Scenario: 守卫
- **WHEN** 新增 `hover:underline` 或 `text-decoration: underline`
- **THEN** `no-underline-guard` 判红

### Requirement: 分组胶囊回到 8–9 月原样
系统 SHALL 让 `.tab-group-label` 使用主题色 10% 淡底、**无边框**、3px 直角、600 字重、0.5px 字距、12px；选中页签使用 solid soft 底 + 更强描边区分，不使用下划线。

#### Scenario: 支书台 1440
- **WHEN** 打开支书台
- **THEN** 组名是淡主题底、无边框的小胶囊；选中页签底色更实、边框更强；两者不撞色

#### Scenario: 暗色
- **WHEN** 切换暗色
- **THEN** 组名取暗色 10% 主题淡底、无边框；选中页签仍明显更实

### Requirement: About 撤掉所有路由
系统 SHALL 移除侧边栏“关于”、帮助目录“关于”、README/页脚等所有 About 入口；`about.html` 页面本身不改，但不再可从系统导航到达。

#### Scenario: 导航
- **WHEN** 用户打开侧边栏或帮助目录
- **THEN** 看不到“关于”入口；直接访问 about.html 仍可打开旧页，但系统不提供入口

### Requirement: 清楚的等待体验
系统 SHALL 在页签/页面切换时显示与目标布局一致的 skeleton + “正在加载”文案，交叉淡入 150–200ms，目标 ≤1s；禁止整块压暗后硬替换。

#### Scenario: 页签切换
- **WHEN** 用户切换页签且加载超过 120ms
- **THEN** 出现 skeleton；新内容淡入 180ms；总等待 ≤1s；不出现整块灰暗闪烁

#### Scenario: 快速加载
- **WHEN** 内容在 120ms 内返回
- **THEN** 不闪 skeleton，直接淡入

#### Scenario: 减少动效
- **WHEN** `prefers-reduced-motion: reduce`
- **THEN** 只淡入 80ms，无位移；仍显示 skeleton/文案

### Requirement: 功能色与主题色分离
系统 SHALL 保留现有主题色盘；新增非主题语境的 `--color-functional-red` / `--color-functional-gold`（亮/暗），供三会一课、主题党日等类别使用；不得与 danger/warning/主题 accent 互相借用。

#### Scenario: 三会一课
- **WHEN** 页面出现三会一课类别
- **THEN** 使用功能红 token，与 danger 红可区分；小面积（徽章/圆点/左条）

#### Scenario: 主题党日
- **WHEN** 页面出现主题党日类别
- **THEN** 使用功能金 token，与 warning 金/主题金可区分；文字对比 ≥4.5:1

### Requirement: 页标题单层
系统 SHALL 每页只保留一个 H2 页面标题；工作台名降为面包屑/眉题或移除；页签内标题不再与静态台名同字号并列；H3/H4 顺序合法。

#### Scenario: 党委台
- **WHEN** 打开党委台“支部上报”
- **THEN** 首屏只出现一次“支部上报”作为页面标题；不再是页签+H2+H3 三连

### Requirement: 390 帮助页可读
系统 SHALL 让帮助页 390 无整页横向溢出；章节可折叠；页首有目录；表格自身横滚。

#### Scenario: 390 帮助
- **WHEN** 在 390 打开帮助页
- **THEN** `documentElement.scrollWidth <= 390`；正文不被裁；可展开章节并跳转

### Requirement: 空态一行 + 单一 CTA
系统 SHALL 把首页/今天页空态合并为一行说明 + 一个主 CTA；无图时不出 16:9 大图位；删除卡内重复“写入活动”。

#### Scenario: 无照片首页
- **WHEN** 活动风采无照片
- **THEN** 不出现 6 张 335px 空图位；只留一行“暂无照片”+ 上传入口（有权限时）

#### Scenario: 今天无待办
- **WHEN** 今天无事项
- **THEN** 一张空态 + 一个下一步（看待办/写活动），不再两张等权大卡

### Requirement: 键盘起点与焦点可见
系统 SHALL 保证工作台刷新后首次 Tab 落在“跳到主要内容”；页签激活只改滚动位置，不调用 `scrollIntoView`；顶栏焦点环在深红底上 ≥3:1；侧栏抽屉打开后焦点进入首个导航项，Esc 关闭并回焦。

#### Scenario: 刷新后首次 Tab
- **WHEN** 用户刷新支书台后按 Tab
- **THEN** 焦点在“跳到主要内容”，不在页签条中段

### Requirement: 日历键盘模型
系统 SHALL 把首页日历改为 `role=grid` + roving tabindex：只有当前日一个 Tab 停点，方向键移动，Enter 打开；活动条可独立进入。

#### Scenario: 键盘选活动
- **WHEN** 用户从页首用键盘到日历
- **THEN** 1 次 Tab 进入网格，方向键移动日期，Enter 打开活动；不需要 15–39 次 Tab

### Requirement: 日历入口有真实落点
系统 SHALL 让组织/宣传/纪检/组长/成员五台的“看日历”映射到现有承载面（工作概况日历卡或活动动态），或删除入口并给可见说明；不得点击无反应。

#### Scenario: 组织台看日历
- **WHEN** 点击“看日历”
- **THEN** 切到工作概况并展开日历卡，或显示“日历在工作概况中”并定位；activeTab/URL 有变化

### Requirement: 移动端待办列表优先
系统 SHALL 在 390 下先显示“我的待办”列表、后显示详情；详情仅在用户选中后渲染，或改抽屉。

#### Scenario: 390 待办
- **WHEN** 打开待办页
- **THEN** 首屏先看到列表；选中一项后才显示详情

### Requirement: 活动“下一步”与权限一致
系统 SHALL 只在本人是本场组织者/深度参与者时渲染“复盘”主行动；否则给报名/查看议程/无待办；落点未命中时说明原因。

#### Scenario: 普通成员点下一步
- **WHEN** 普通成员打开未参与的活动
- **THEN** 不出现“复盘”；不跳到无关活动列表

### Requirement: 加载守卫
系统 SHALL 用 `loading-experience-guard` 断言：页签切换有 skeleton/文案；存在 150–200ms 淡入；无“整块 opacity 压暗后硬替换”；目标时长 ≤1s；减少动效有分支。

#### Scenario: 故障注入
- **WHEN** 删除 skeleton 或恢复“压暗+硬替换”
- **THEN** 守卫判红

## MODIFIED Requirements

### Requirement: 链接识别
链接不再靠下划线；改用 `--color-link` + 箭头/图标/底色 hover；焦点态保留主题色环。

### Requirement: 分组胶囊
从“solid soft 底 + neutral-400 边框”改为“主题 10% 淡底 + 无边框 + 3px”；选中页签从“与组名同底”改为“更实 soft 底 + 更强描边”。

### Requirement: 页签条
从“单行组名+页签+动作混排”改为：组名与页签分层（390 两行），右侧动作移出页签行，溢出用对齐的“更多/箭头”，不覆盖组名。

### Requirement: 空态
从“大卡占位”改为“一行说明 + 单一 CTA”；无图不出 16:9。

### Requirement: 字体与字号
全站标题收敛为 1 个 display serif 族 + 固定回退；正文/次要/元信息三档（14–16 / 13 / 12），12px 不再承担正文；帮助页分数 rem 归一。

### Requirement: 颜色角色
warning/error 只作状态填充与图形；文字用加深的 `-text` 档；暗色选中不再借 error；目录透明度只作用于未激活圆点。

## REMOVED Requirements

### Requirement: 链接文本下划线
**Reason**：用户明确“全系统一个下划线都没有”；下划线过多造成视觉噪声。
**Migration**：颜色 + 箭头/图标/底色 hover；更新 link-color-guard。

### Requirement: 分组胶囊边框
**Reason**：8–9 月原样无边框；边框让组名更像可点控件，并与选中页签撞色。
**Migration**：10% 主题淡底 + 无边框 + 3px；选中页签改用更实底色/更强描边。

### Requirement: About 导航入口
**Reason**：About 与系统业务无关；用户裁定撤掉所有路由。
**Migration**：移除侧边栏/帮助/README 入口；页面文件保留但不导航。

### Requirement: 整块压暗 + 硬替换
**Reason**：没有清楚等待感，跳转生硬。
**Migration**：skeleton + 文案 + 150–200ms 交叉淡入，≤1s；减少动效只淡入。
