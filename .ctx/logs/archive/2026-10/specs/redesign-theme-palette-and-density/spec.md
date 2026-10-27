# 主题色独立色板、组件密度与交互态设计 Spec

## Why

三个表面问题指向同一条根因：**主题色只有算法没有色板、组件只有尺寸没有状态语义、间距只有令牌没有关系**。

- 「淡色底 + 主题色字」在 origin 是公式（`rgba(主题色,0.10/0.30)` + 主题色 hex），只有金色是手工三件套；现行 `--app-accent-deep = color-mix(主题色 45%, neutral-900 55%)` 把十个主题压成同一明度，橙变褐、绿变灰绿、亮蓝变钢蓝——这就是支书说的「灰度太高、太脏」。
- 列表行 55.5px、待办 44px、表格 36px、通知行 61–82px；按钮 36/32/28 但 `line-height:1` 让高度与文字无关；页头说明到 `summary` 只有 0/4/8px。高度不是设计值，是内容与 `min-height` 的副产物。
- hover 有 CSS 86 条、Tailwind 224 个 token、JS 18 个处理器，57 处是默认灰；页签无 hover、`summary` 无状态、全仓 0 条 `@media (hover:hover)`。

支书补充三条口径（本轮 spec 必须落实）：

1. **党徽金 ≠ 金色主题色**。主题党日、三会一课等**活动类别色是固定语义色**，与用户主题色无关；党徽金（品牌）也可以与「金」主题色不同。主题色只负责角色身份与交互强调，不得反过来决定活动类别色。
2. **总体气质是「沉稳但是鲜活」**，不是高饱和、高对比的艳丽。色彩方案必须先定总体审美与用色纪律，再逐主题落值；不能为了对比度把界面做成刺眼的色块拼贴。
3. **主题数量可以削减**：紫色只保留一个、蓝色只保留一个；维护不过来的色相直接删除，不追求 10 个。

支书裁定：**每个保留主题的每一部分都在色盘上独立设计**（含亮/暗），实底与浅底深字可以是不同颜色，不保留相似 RGB 算法；**抬行高 + 固定间距**；按钮宽度随内容，主要问题是「不合时宜的太厚」；hover 采用**三态令牌 + 触屏门控**。

## What Changes

- **主题色从「1 个 hex + 公式」升级为「每主题 × 亮/暗 × 8 个显式 token」**：`base`（基色）、`softBg`、`softBorder`、`softText`、`strongBg`、`strongInk`、`hoverBg`、`activeBg`。全部为手工 hex，删除 `color-mix` / `rgba(主题色)` / `filter: brightness` / `opacity` 派生（**BREAKING**：旧 token `--app-accent-bg/border/text/deep` 退场）。
- **主题从 10 个削减为 7 个**：金 / 红 / 橙 / 绿 / 青 / 蓝 / 紫；删除天蓝、雾紫、亮蓝（紫只留一个、蓝只留一个）。角色映射同步收敛（建议：默认/普通成员金、支书/副支书/党委红、纪检橙、组长绿、组织委员/组织者青、宣传委员蓝、深度参与者/其他紫）。
- **固定语义色与主题色彻底分离**：党徽金 `#FFD700`、三会一课党建红 `#CE1126`、主题党日「亮金底 + 金黄字」等**不随主题色变化**；活动类别色只用于徽章/圆点/左条等小面积标记，不得整卡铺色。主题金是另一档更沉稳的金，不与党徽金共用变量。
- **先定总体审美再落值**：全站保持「中性表面 + 深墨文字 + 低彩度浅底」，每个视图最多一个高强调色（主 CTA 或一个语义徽章）；高饱和只允许出现在小面积语义标记；大面积不得铺强色。所有主题的 `softBg` 低彩度、`softText` 同色相压深、`strongBg` 中等彩度。
- **7 个主题逐一验收**：每个主题亮/暗各一张表，浅底字对比度 ≥4.5:1、实底与卡片边界 ≥3:1；同时记录彩度/明度区间，避免「为过对比度而刺眼」。
- **主题选择器展示四档预览**：色块不再是单个 hex，而是「浅底 + 深字 / 实底 + 字」两张小样；选择前就能看出效果。
- **组件密度重排**：输入 40、页面/弹窗按钮 36、卡片按钮 32、行内按钮 28；列表单行 48、双行 56、紧凑行 44、表格行 40；页头说明到内容固定 8–12px；`summary` 最小命中高 40；行内按钮 28px 视觉 + 44px 命中区。
- **间距只保留 4/8/12/16/24**：组件内的 2/6/10/14/20 与 Tailwind `1.5/2.5/3.5` 逐处收敛；新增守卫防止回潮。
- **hover 三态化**：hover 只加深一档（显式 `hoverBg`），active 用 `activeBg`，selected 用 `softBg/softBorder/softText`；`@media (hover:hover)` 门控，触屏用 active，键盘用 focus 环；静态行/卡不加 hover；页签、`summary` 补 hover/focus。
- **触屏与可读性**：移动端输入字号 ≥16px（防 iOS 聚焦放大）；placeholder 对比度 ≥4.5；可点元素命中区 ≥44px（视觉尺寸可小于 44）。
- **验证**：新增 `theme-palette-guard`、`density-spacing-guard`、`hover-state-guard`；更新既有按钮/字号/间距基线；三次套件运行。

## Impact

- Affected specs：`refine-ui-system-and-close-r10`（组件层）、`polish-workbench-visual-language`、`rebuild-workbench-density-and-composition`。
- Affected code：
  - `docs/src/core/domain/constants.js`（`ACCENT_COLORS` / `getAccentColors` / `accentButtonColors` / `solidAccentStyle` / `ACTIVITY_CLASSIFICATION` / `ACTIVITY_TYPE_COLORS` / 删除 `_lighten/_darken/_rgba`）
  - `docs/src/core/boot/theme.js`、`docs/src/core/boot/bootstrap.js`（注入新 token）
  - `docs/src/styles.css`（`--party-gold` / `--accent-participant` / `--app-accent*`、按钮、列表行、通知行、输入、`summary`、hover 段、深色段）
  - 41 个含 `--acc-text-dark: color-mix(...)` 的 JS 文件（改为消费 token）
  - `docs/src/components/shell/appearance-controls.js`、`entries/pages/settings-entry.js`（主题预览，7 项）
  - `docs/src/components/ui/list-row.js`、`components/governance/notice-view.js`、`record/todo-tab-shell.js`、`entries/tabs/**`（行高/间距/状态）
  - `server/test/**`（三个新守卫与基线）
  - `content/04_web_design/design-system/DESIGN_SYSTEM.md`（§2.3/§2.7/§2.9/§4.1/§4.3/§4.21/§十二）
- 不涉及：数据库结构、服务端业务语义、权限模型。

## 现行事实（spec 依据）

- 主题色板 10 项，每项只有 `{ key, hex, label }`（`constants.js:485-496`）；浅底/边框由 `hexToRgba(0.10/0.30)` 生成（`:519-529`）；仅金色手写 `bg/border`（`:469`）。
- **活动类别色已经是固定语义色**：三会一课 `#CE1126`、主题党日亮金 `#FFD700` + 金黄字 `#A16207`（`constants.js:124-134`、`:676-683`、`ACTIVITY_CLASSIFICATION:693-705`）；它们与主题色无耦合，但现行 `participant` 主题色被注释成「＝主题党日胶囊」（`constants.js:524-525`），且 CSS `--accent-participant` 是红、JS `ACCENT_COLORS.participant` 是金（`styles.css:44` vs `constants.js:469`）⇒ 同名两值，必须拆开。
- 浅底深字 `--app-accent-deep` = `color-mix(主题色 45%, neutral-900 55%)`（`styles.css:119`）；`--app-accent-text` 默认 `#1F2937`（`:113`），亮色主题直接返回中性近黑（`constants.js:635-637`）。
- 全仓主题色算法派生：`color-mix(... var(--app-accent ...)` **52 处**（styles.css 19 + JS 33）；内联 `--acc-text-dark: color-mix(…55%, #fff)` **100 处 / 41 文件**；`filter: brightness` 7 处；`opacity` 2 处。
- origin 的「主题色字」在绿/天蓝/雾紫/亮蓝上对比度 2.09/2.51/2.49/1.59:1（不可读）；现行 deep 虽过 4.5，但饱和度从 92% 跌到 28–58%，是「脏」的直接来源。
- 高度：输入 38（`styles.css:632-646`）、按钮 36/32/28（`:4238-4301`）、表格 36（`:4751` 的 `tr{min-height:44}` 对 table-row 无效）、列表单行 55.5、待办 44、通知 61–82（`:4374-4405` + `notice-view.js:97` 的 `p-0`）。
- 间距：`--space-*` = 4/8/12/16/24（`:132-146`），但组件内 2/6/10/14/20 共 20+ 处；Tailwind `1.5/2.5/3.5` **160 处 / 20 文件**；`p`→`summary` 实测 0/4/8px；`summary` 命中高 18–21px（`:233-259`）。
- hover：CSS 86 条（styles.css 67）、Tailwind 224 token（57 处默认灰）、JS 18 个处理器；`@media (hover:hover)` 0 条；页签无 hover（`tab-bar.js:258`）；`summary` 无 hover/focus；按钮 hover 四套机制（filter/换背景/opacity/硬编码）。
- 守卫现状：`button-system-guard` 只断言 36/32/28 与族；`spacing-scale-guard` 只查 `[Npx]`；`row-markup-guard` 只数写法；`page-sweep` 只锁控件 38/分页 32；**没有任何守卫校验主题色值、行高语义、状态三态**。

## 色彩方案提案（设计方向，不是最终 hex）

总体气质取「沉稳但是鲜活」：**表面安静、文字扎实、强调克制、语义色只做小面积点睛**。

- **表面**：页面/卡片保持暖中性白（不用纯白铺满），浅底只用 8–18% 饱和度的同色相淡彩；同屏大面积不超过两种浅底。
- **文字**：正文用带一点暖调的深墨（不是纯黑），次级信息降一档灰；浅底上的主题字用同色相压深，而不是混中性黑。
- **强调**：每个主题只保留一个「实底」强度（主 CTA / 选中态），其余用浅底或描边；同一屏不出现两个以上强色块。
- **七个主题的性格**：金＝温润的琥珀金（明显比党徽金 `#FFD700` 沉稳）；红＝深砖红（比三会一课党建红 `#CE1126` 更收）；橙＝陶土橙；绿＝松柏绿；青＝深青；蓝＝靛蓝；紫＝灰紫。全部避免荧光与高饱和。
- **固定语义色**：党徽金、三会一课党建红、主题党日亮金保持现有识别度，只用于徽章/圆点/左条/活动类别标记，不参与主题切换。
- **鲜活来自**：清晰的 hover/active 微反馈、当前角色的主题色在页头与选中态可辨、少量语义色点睛——不是靠整屏高饱和。

具体 hex 由 Task 1 产出，并以对比度、彩度、三张代表页的视觉复核为准。

## ADDED Requirements

### Requirement: 主题削减为 7 个

系统 SHALL 只保留 7 个主题：金、红、橙、绿、青、蓝、紫；SHALL 删除天蓝、雾紫、亮蓝。主题选择器、角色映射、`ACCENT_PALETTE` 与所有文档 SHALL 同步为 7 项。

#### Scenario: 紫只一个、蓝只一个
- **WHEN** 用户打开主题选择器
- **THEN** 只看到 7 个主题；不存在两个紫或两个蓝；原使用已删除主题的用户回落到最接近的保留主题（紫→紫、蓝→蓝），并提示一次

#### Scenario: 角色映射收敛
- **WHEN** 查看任一角色工作台
- **THEN** 角色主题色落在 7 项之内（建议：默认/普通成员金、支书/副支书/党委红、纪检橙、组长绿、组织委员/组织者青、宣传委员蓝、深度参与者/其他紫）

### Requirement: 固定语义色与主题色分离

系统 SHALL 保持活动类别色为固定语义色：三会一课 `#CE1126`、主题党日亮金 `#FFD700` + 金黄字 `#A16207`；SHALL NOT 随用户主题色变化。党徽金 `--party-gold` SHALL 与「金」主题色的 `base/strongBg` 分开定义，两者可以不同。`--accent-participant` 同名两值 SHALL 消除（CSS 侧旧红值退场或改名）。

#### Scenario: 换主题不改活动类别色
- **WHEN** 用户把主题从红切到蓝
- **THEN** 三会一课徽章仍是党建红、主题党日仍是亮金；只有角色身份与交互强调变色

#### Scenario: 主题金与党徽金不同
- **WHEN** 同屏出现党徽、主题党日徽章与「金」主题按钮
- **THEN** 党徽/主题党日使用 `#FFD700` 系固定金；按钮使用主题表里更沉稳的金，两者不要求同值

### Requirement: 「沉稳但是鲜活」的用色纪律

系统 SHALL 先定义总体用色纪律，再逐主题落值：
- **沉稳**：大面积表面只用中性色或低彩度 `softBg`；正文用深墨色；不使用纯黑/纯白强对比铺面；不使用荧光/高饱和大面积色块。
- **鲜活**：每个视图最多一个高强调元素（主 CTA 或一个语义徽章）；hover/active 提供轻微但可感知的反馈；主题身份通过小面积强调与浅底体现，而不是整屏变色。
- **可测**：`softBg` 与白的对比度控制在 1.08–1.35；`softText` 与 `softBg` ≥4.5:1 且目标不超过 12:1；`strongBg` 的 HSL 饱和度不高于 85%（党徽金/党建红等固定语义色不受此限）；强色填充只允许出现在按钮、徽章、圆点、左条等小面积元素。

#### Scenario: 不刺眼
- **WHEN** 用户浏览任一工作台
- **THEN** 同一屏不出现两个以上高饱和色块；大面积背景保持中性；正文对比度在 4.5–9:1 的舒适区间

#### Scenario: 仍然鲜活
- **WHEN** 用户与按钮、页签、列表行交互
- **THEN** 有清晰的 hover/active 反馈；当前角色主题色在页头、选中态、主 CTA 上可辨

### Requirement: 每主题独立的显式色板

系统 SHALL 为 7 个主题分别提供亮色与暗色两套显式 token：`base`、`softBg`、`softBorder`、`softText`、`strongBg`、`strongInk`、`hoverBg`、`activeBg`。所有值 SHALL 为手工 hex，**SHALL NOT** 通过 `color-mix`、`rgba(主题色)`、`filter: brightness()`、`opacity` 或亮度阈值分流生成。

#### Scenario: 七个主题各自可读
- **WHEN** 用户切换任一主题（亮色或暗色）
- **THEN** 浅底上的深色字对比度 ≥4.5:1，实底与卡片/页面背景边界 ≥3:1，且颜色保持该主题的色相与饱和度（不得变成同一族灰深色）

#### Scenario: 不存在算法派生
- **WHEN** 静态扫描 `docs/src` 与 `styles.css`
- **THEN** 主题色链路中 `color-mix(...--app-accent`、`rgba(var(--app-accent`、`filter: brightness` 的计数为 0；每个 token 都能追溯到主题表的一行

#### Scenario: 实底与浅底字可以不同
- **WHEN** 某主题的实底与其浅底深字需要不同色值
- **THEN** 允许 `strongBg` 与 `softText` 取不同 hex；不得强行用同一基色派生

### Requirement: 主题预览与验收表

系统 SHALL 在主题选择器中展示每个主题的「浅底 + 深字」与「实底 + 字」两张小样；SHALL 提供一张 **7×2** 的验收表（主题 × 亮/暗），记录每个 token 的 hex、对比度与彩度区间。

#### Scenario: 选择前可见效果
- **WHEN** 用户打开外观/主题设置
- **THEN** 每个主题项显示四档色块（softBg/softText/strongBg/strongInk），而不是单个基色

### Requirement: 组件密度与间距节奏

系统 SHALL 统一以下高度：输入/下拉 40px（紧凑 34px）；页面/弹窗主按钮 36px；卡片按钮 32px；行内按钮 28px；列表单行 48px、双行 56px、紧凑行 44px；表格行 40px；`summary` 最小命中高 40px。页面说明到内容 SHALL 固定 8–12px；标题→次级→描述 SHALL 分别 8px。组件内边距 SHALL 只取 4/8/12/16/24。

#### Scenario: 同一行不再高低错位
- **WHEN** 筛选行同时出现输入框、主按钮、行内按钮
- **THEN** 输入 40、主按钮 36、行内 28，基线对齐；按钮高度由所在位置决定，不再出现 36px 按钮塞进 20px 文字行

#### Scenario: 列表行不再贴底
- **WHEN** 查看通知/待办列表
- **THEN** 单行 48、双行 56，文本上下留白 ≥8px；标题与 meta 间距 8px；不再出现 61/62/79/82 四种高度

#### Scenario: 说明不贴折叠条
- **WHEN** 页头说明后紧跟 `summary`
- **THEN** 两者间距 8–12px；`summary` 命中区 ≥40px

### Requirement: 按钮厚度与宽度

按钮 SHALL 按位置取高：页面/弹窗 36、卡片 32、行内 28；宽度 SHALL 由内容决定，水平内边距 10/8/8；SHALL NOT 使用 `min-height` 撑高而忽略文字行高。行内 28px 按钮的触控命中区 SHALL ≥44px（可用伪元素扩展，不改变视觉高度）。

#### Scenario: 行内按钮不再「厚而宽」
- **WHEN** 列表行出现「接收」「作废」
- **THEN** 两者同为 28px，水平内边距 8–10px，宽度由文字决定；不再一大一小并排

### Requirement: hover / active / selected 三态

系统 SHALL 用显式 token 定义三态：`hoverBg`（加深一档）、`activeBg`（按压）、`softBg/softBorder/softText`（选中）。hover SHALL 只改颜色，**SHALL NOT** 使用 `filter/opacity/translate/shadow`；hover 规则 SHALL 由 `@media (hover:hover)` 门控；触屏 SHALL 用 `:active`，键盘 SHALL 用 `focus-visible`。静态行/卡 SHALL NOT 加 hover。

#### Scenario: 页签与折叠条有状态
- **WHEN** 鼠标移入任一工作台页签或 `summary`
- **THEN** 出现一档加深的背景；键盘聚焦出现焦点环；触屏按下出现 active 态

#### Scenario: 静态容器不假装可点
- **WHEN** 某行/卡仅展示、无点击行为
- **THEN** 无 hover 背景、无 pointer 光标

### Requirement: 触屏与可读性底线

移动端（≤640px）输入控件字号 SHALL ≥16px；placeholder 对比度 SHALL ≥4.5:1；可点元素命中区 SHALL ≥44px（视觉尺寸可小于 44）。

#### Scenario: iOS 不放大
- **WHEN** 在 iOS Safari 聚焦搜索/输入框
- **THEN** 页面不自动放大（字号 ≥16px）

## MODIFIED Requirements

### Requirement: 主题色注入
原「注入 `--app-accent`/`-bg`/`-border`/`-text`/`-strong`/`-ink` 六个 token，其余由公式派生」改为：按 7 主题表注入 8 个显式 token（亮/暗两套），消费方只读 token，不再自行混色；活动类别色与党徽金走独立固定变量，不参与主题注入。

### Requirement: 组件高度
原「输入 38、按钮 36/32/28、行 40 起」改为：输入 40/34、按钮 36/32/28、行 48/56/44、表格 40；高度成为设计值，不再由内容撑开。

### Requirement: 间距
原「4/8/12/16/24 令牌 + 大量 1.5/2.5/3.5 数值档」改为：组件内只用五档；标题→次级→描述 8px；页面说明→内容 8–12px；新增守卫。

### Requirement: 交互态
原「hover 由 filter/默认灰/JS 各写一套」改为：三态 token + 触屏门控 + 键盘等价；页签与 `summary` 纳入。

## REMOVED Requirements

### Requirement: 「一条公式生成所有主题浅底/深字」
**Reason**：十个色相共用百分比必然产生脏灰与不可读；origin 的浅色主题对比度低至 1.59:1，现行 deep 又把饱和度压到 28–58%。且公式无法阻止「为过对比度而刺眼」，与「沉稳但是鲜活」冲突。
**Migration**：改为 7 主题显式 8 token 表；金色手工三件套升级为通用规则；对比度与彩度同时验收。

### Requirement: 天蓝 / 雾紫 / 亮蓝三个重复色相
**Reason**：紫只留一个、蓝只留一个，减少维护面与选择困难。
**Migration**：`ACCENT_PALETTE` 删除三项；旧值回落（紫→紫、蓝→蓝）；主题选择器与文档同步为 7 项。

### Requirement: 活动类别色跟随主题色
**Reason**：主题党日/三会一课是制度语义，不随个人主题变化；现行 `participant` 主题色与主题党日金、CSS/JS 的 `--accent-participant` 同名两值，容易串色。
**Migration**：活动类别色与党徽金改为独立固定变量；`--accent-participant` 旧值退场或改名；主题色只负责角色身份与交互强调。

### Requirement: `filter/opacity` 作为 hover
**Reason**：4% 亮度变化低于感知阈值，且同时改变文字与边框；不随主题色板变化。
**Migration**：改用 `hoverBg`；`@media (hover:hover)` 门控。

### Requirement: `min-height` 撑高的按钮
**Reason**：高度与文字行高脱钩，导致「太厚」且无法按位置分级。
**Migration**：高度按位置取 36/32/28，行高参与计算。

### Requirement: 静态行/卡的 hover 伪装
**Reason**：不可点却变色，误导用户；与 `ui-row-interaction` 的展示行口径冲突。
**Migration**：只对 `data-interactive="true"` 或原生可点元素加 hover。

## 设计学习（sample-diff-learning）

| ID | AI 假设 | 支书意图 | 偏差类型 | 可检验规则（Boolean） |
|---|---|---|---|---|
| SD-12 | 主题色可以用一个基色加百分比派生 | 每个主题每一部分独立设计 | scope_narrowing | IF 主题色 token THEN 值来自主题表显式 hex，且 `color-mix/rgba(主题色)/brightness` 计数为 0 |
| SD-13 | 浅底深字必须等于主题色或中性黑 | 实底与浅底深字可以不同 | definition_mismatch | IF softText THEN 与 strongBg 可不同，且 softText vs softBg 对比度 ≥4.5 |
| SD-14 | 按钮统一高度就整齐 | 厚度要合时宜，按位置分级 | priority_inversion | IF 按钮在行内 THEN 28；卡片 32；页面/弹窗 36；且高度不得由 min-height 脱离文字行高 |
| SD-15 | 列表行有 min-height 就够 | 行高要有节奏，文字不能贴底 | symptom_misread | IF 列表单行 THEN 48；双行 56；紧凑 44；文本上下留白 ≥8 |
| SD-16 | hover 用 filter/默认灰最省事 | hover 是组件状态，要三态且触屏可用 | incomplete_contract | IF hover THEN 使用 hoverBg 且被 `@media (hover:hover)` 包住；filter/opacity/translate/shadow 计数为 0 |
| SD-17 | 静态卡也可以加 hover 显得活 | 不可点就不要装可点 | scope_widening | IF 元素无 `data-interactive`/原生可点 THEN 无 hover 背景与 pointer |
| SD-18 | 间距令牌存在就够 | 令牌要落到关系上 | definition_mismatch | IF 标题→次级→描述 THEN 8px；IF 组件内边距 THEN ∈{4,8,12,16,24} |
| SD-19 | 党徽金就是金主题色，活动类别色跟随主题 | 党徽金≠主题金；主题党日/三会一课是固定语义色 | attribution_error | IF 元素是党徽/活动类别 THEN 颜色来自固定语义变量，切换主题前后 computed 值不变 |
| SD-20 | 对比度越高越清楚 | 要「沉稳但是鲜活」，不是刺眼 | aesthetic_mismatch | IF 正文/浅底 THEN 对比度 4.5–9:1（目标不超 12:1）；IF softBg THEN 与白 1.08–1.35；IF 强色 THEN 仅小面积且 HSL 饱和度 ≤85%（固定语义色除外） |
| SD-21 | 10 个主题都值得保留 | 维护不过来就删，紫一个、蓝一个 | scope_widening | IF 主题选择器 THEN 恰 7 项；不存在两个紫或两个蓝；删除项有回落映射 |

## 验收口径

- 新增 `theme-palette-guard`：**7 主题** × 2 模式 × 8 token 齐备；无算法派生；对比度与彩度阈值；**活动类别色/党徽金在切换主题前后不变**。
- 新增 `density-spacing-guard`：控件/行/按钮高度、五档间距、`p→summary`、Tailwind 数值档基线。
- 新增 `hover-state-guard`：三态 token、`@media (hover:hover)` 覆盖、无 filter/opacity/位移、页签/`summary` 状态、静态行无 hover。
- 真机：`page-sweep` 高度/字号；**7 个主题切换后** computed 色值抽检；主题党日/三会一课在任意主题下色值不变；截图复核「沉稳但是鲜活」（每屏高强调元素 ≤1、大面积无强色）。
- 测试预算：3 次套件级运行（定向 / daily / 全量）；红项只单跑失败文件诊断。
