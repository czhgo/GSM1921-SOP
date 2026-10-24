---
title: "设计域判例库"
type: design
role: "[工程师]+[AI]"
last_updated: "2026-10-25"
status: active
related_files: [DESIGN_SYSTEM.md, content/03_doc_system/CASES_INDEX.md, content/03_doc_system/OPERATIONS_GUIDE.md]
---

# 设计域判例库

> **本文件回答什么**：设计条目**为什么这样定、什么情况下不适用**——每条记「真实发生过的场景 → 结论 → 边界 → 对应规范编号 → 证据指针」。
> **不回答什么**：规范条文本身（必须 / 不得、布尔判据）→ [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) 对应编号；目录与入口 → [CASES_INDEX.md](../../03_doc_system/CASES_INDEX.md)；逐批过程 → `.ctx/logs/2026-10-EXECUTION_LOG.md`。
> **谁什么时候读**：`[工程师]+[AI]`，改动相关设计面之前读边界一列；评审核对「这条为什么存在」时读场景一列。
> **纪律**：判例不产生规范效力（`OPERATIONS_GUIDE.md §32.3`）——判例里的结论若被写成「以后都应如此」，须迁到规范侧并取编号。「结论」列只复述本条判例当时确认的落点，规范效力一律以「对应规范编号」所指条目为准。

---

## CASE-DESIGN-001 链接色不承担「跳转」语义

- **编号**：CASE-DESIGN-001
- **场景（真实发生）**：同一个「跳转」语义，首页一处用 `text-accent`（主题色深字），另一处用 `text-blue-600`（Tailwind 蓝）；批次 507 全站点检时发现 `<a>` 上混用 `text-blue-*` / `text-sky-*` / `text-indigo-*`，读者无法从颜色判断「这是链接还是信息态」。
- **结论**：页面内跳转链接统一走 `.link` / `.text-accent`（`--app-accent-soft-text`）；蓝色只保留给信息态（徽章、状态字、带 `bg-*` 的按钮型链接）。链接 hover 只加下划线、不改色——`soft-text` 已是浅底上可读的深字，再加深会掉对比度。
- **边界**：带 `bg-*` 的信息态按钮型链接、徽章 / 状态色 map / 表单控件修饰不受本条约束；它们不是「跳转」语义。
- **对应规范编号**：SD-22
- **证据指针**：`DESIGN_SYSTEM.md §12.10`（链接表，本批迁出其 why 句）；`server/test/link-color-guard.test.mjs:1-18`；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 507。

## CASE-DESIGN-002 中性控件按下不得闪红

- **编号**：CASE-DESIGN-002
- **场景（真实发生）**：`--surface-active` 曾是党建红浅底（亮 `#FEE2E2` / 暗 `#2A1A22`），中性按钮一按就闪红——读者把「按下」误读成「出错 / 危险」。批次 507 梳理按压三源时发现该令牌同时被中性控件与语义色控件复用。
- **结论**：中性控件按压用 `var(--neutral-200)`；主题色控件用 `--app-accent-active-bg`；党建红实底用 `--party-red-active`。三源分开，中性控件不得按出红色。
- **边界**：党建红实底按钮（party-red）按出深红属其语义色本身，不算「中性控件闪红」。
- **对应规范编号**：SD-23
- **证据指针**：`DESIGN_SYSTEM.md §12.8`「按压三源」；`server/test/hover-state-guard.test.mjs:181-191`；执行日志批次 507。

## CASE-DESIGN-003 按压反馈禁用位移

- **编号**：CASE-DESIGN-003
- **场景（真实发生）**：早期按压反馈用 `transform: scale()` / `translateY()` 做「下沉」，按下时元素位移、推挤相邻内容；同一交互在不同按钮上还各写一套过渡时长。
- **结论**：按压唯一反馈是 `--press-shadow`（`inset 0 1px 2px`）＋ 180ms 过渡；按压路径上 `transform/scale/translate` 计数为 0。
- **边界**：入场、折叠等**非按压**动效仍可用 `transform`（见 SD-30 白名单）；本条只管 `:active` 反馈。
- **对应规范编号**：SD-24
- **证据指针**：`DESIGN_SYSTEM.md §12.10`「按压」表；`server/test/hover-state-guard.test.mjs:201`；执行日志批次 507。

## CASE-DESIGN-004 选中态不得借用 hover / active 灰底

- **编号**：CASE-DESIGN-004
- **场景（真实发生）**：选中态一度以 `--surface-hover` / `--surface-active` 的灰底表达，同屏出现「我在这里」（持续选中）与「我正按着」（瞬时按压）同色，读者分不清两者的时间性；侧边栏与内容区选中样式也各不相同。
- **结论**：选中态用主题 soft 三件套（`--app-accent-soft-bg` ＋ `--app-accent-soft-text` ＋ 左条 `inset 3px 0 0 var(--app-accent)`）；侧边栏是唯一浅灰豁免。
- **边界**：侧边栏 `.module-tab.active` 保留浅灰是因为需要纵深，内容区不适用此豁免；列表行、日历格、子页签、下拉选项等一律主题 soft。
- **对应规范编号**：SD-25
- **证据指针**：`DESIGN_SYSTEM.md §12.11` 状态语言表；`server/test/hover-state-guard.test.mjs`（三态守卫）；执行日志批次 508。

## CASE-DESIGN-005 实底按钮 hover 不得落中性灰

- **编号**：CASE-DESIGN-005
- **场景（真实发生）**：实底主题色按钮 hover 时落成中性灰，视觉上等同「被禁用」；批次 508 为此补第 9 个主题 token，把 hover 与 active、selected 三态彻底分开。
- **结论**：实底按钮 hover 用 `--app-accent-strong-hover`（同色相加深）；底色落中性灰的计数为 0。
- **边界**：描边 / 中性按钮 hover 仍走 `--surface-hover`（它们不是实底主题色按钮）；本条不改变其口径。
- **对应规范编号**：SD-26
- **证据指针**：`DESIGN_SYSTEM.md §12.11` 末条、§12.9 SD-26；`server/test/theme-palette-guard.test.mjs:16`；`server/test/theme-palette-guard.test.mjs:97`；执行日志批次 508。

## CASE-DESIGN-006 输入焦点不得「双答」

- **编号**：CASE-DESIGN-006
- **场景（真实发生）**：`.input-flat:focus` 曾同时画 2px `--focus-ring` 外环与主题色边框，同一个焦点给了两个答案；暗色下 `--focus-ring` 又曾设为党徽金，与金边叠成「双金边」，框体反而更糊。
- **结论**：活动态＝主题色边 1px ＋ 3px 浅晕；`:focus` 不出 `outline`；`:focus-visible` 才出 2px 主题色环；禁止「金边 + 黑环」双答。
- **边界**：纯键盘操作仍须有可见焦点环（走 `:focus-visible`，不受「`:focus` 不出 outline」限制）；搜索类白名单控件与普通输入同一套外壳。
- **对应规范编号**：SD-27
- **证据指针**：`DESIGN_SYSTEM.md §12.12` 字段外壳表；`server/test/field-shell-guard.test.mjs:1-23`；`server/test/ui-focus-ring.test.mjs:48,68`；执行日志批次 508。

## CASE-DESIGN-007 禁用与只读不得都用 opacity 压低

- **编号**：CASE-DESIGN-007
- **场景（真实发生）**：禁用与只读两个状态都用 `opacity` 压低，外观几乎一致；用户分不清「不能改」与「能复制但不能改」，表单里还出现过把只读字段当禁用字段解释的文案。
- **结论**：禁用＝灰底灰字（真不可用）；只读＝透明边、浅底、正文色（可读可复制）；`opacity` 混作两态的计数为 0。
- **边界**：整页级只读（如跨支部只读视图）按页面级说明处理，不套控件级两态样式。
- **对应规范编号**：SD-28
- **证据指针**：`DESIGN_SYSTEM.md §12.12` 表「禁用 / 只读」两行；`server/test/field-shell-guard.test.mjs`（F5 禁用 / 只读分态）。

## CASE-DESIGN-008 原生 select 不得出现第二套外观

- **编号**：CASE-DESIGN-008
- **场景（真实发生）**：各渲染点自建下拉外观，同一页出现两种箭头、两种高度；选项很多时（名册、支部目录）无法搜索与分批渲染，长列表只能盲滚。
- **结论**：原生 `<select>` 一律经 `enhanceSelects` 增强（原生控件仍作值载体）；大选项集提供搜索、近期优先、分批渲染与空态。
- **边界**：`person-picker`（选人）继续走自己的组件，不算第二套下拉；已登记的搜索类白名单控件同受外壳约束，但不受本条「必须 enhanceSelects」约束。
- **对应规范编号**：SD-29
- **证据指针**：`DESIGN_SYSTEM.md §12.12` 末两段；`server/test/field-shell-guard.test.mjs`（F6 select 统一）。

## CASE-DESIGN-009 过渡时长与属性散写

- **编号**：CASE-DESIGN-009
- **场景（真实发生）**：各处散写 `0.15s` / `150ms` / `0.3s` / `transition: all`，改一个档位要全站搜；布局属性（`height` / `width` / `max-height` / `padding`）参与过渡，折叠与展开时出现卡顿。
- **结论**：时长只取 120 / 180 / 200 / 240ms（`--motion-*`）；属性只在 `opacity / transform / color / background-color / border-color / box-shadow` 六项内；布局属性与 `all` 计数为 0。
- **边界**：`--motion-*` 令牌定义处本身的裸值、以及已逐条登记的存量（登录 / 浮层 / toast / help 目录 5 条 ＋ reduced-motion 的 0.01ms 2 条）属「待迁移」，不是可照抄的新写法。
- **对应规范编号**：SD-30
- **证据指针**：`DESIGN_SYSTEM.md §12.13` 动效令；`server/test/motion-guard.test.mjs:1-21`；执行日志批次 508。

## CASE-DESIGN-010 活动类别色被状态色顶替

- **编号**：CASE-DESIGN-010
- **场景（真实发生）**：渲染点可直接写 `badgeHtml(type, 'neutral' / 'info')`，活动类别色被状态色顶替；「三会一课」的党建红与错误色的 `#B91C1C` 也一度混用，读者把「党课」读成「异常」。
- **结论**：类别 tone 只由 `constants.js::activityTypeTone` 产出（`party-red/gold/neutral`）；类别与状态路径的 `info` 计数为 0（白名单除外）；党建红固定 `#CE1126`。
- **边界**：允许 `info` 蓝的白名单仍是通知「重要」、活动「已发布」、汇报路由态、建议 / 选修、配置项标注；新增白名单须逐条登记。
- **对应规范编号**：SD-31
- **证据指针**：`DESIGN_SYSTEM.md §12.14` 类别表与白名单；`server/test/activity-tone-guard.test.mjs:1-22`；执行日志批次 508。

## CASE-DESIGN-011 深链落点不消费参数

- **编号**：CASE-DESIGN-011
- **场景（真实发生）**：`archive.html?tab=taskforce&id=…` 一律落回「党建活动」且不打开详情；材料页 `focusActivityId` 命中折叠区时只滚动不展开，用户看到的是「点了没反应」；活动详情「复盘」还曾指向人才库 / 归档页签，而不是复盘承载面。
- **结论**：目标页必须消费自己的参数；定位失败必须有可见提示；无承载面的入口不得渲染。
- **边界**：参数指向的对象已删除或当前角色无权查看时，允许空态提示或跳回列表，但不得静默——必须给一句话说明。
- **对应规范编号**：SD-32
- **证据指针**：`DESIGN_SYSTEM.md §12.9` SD-32；`server/test/archive-deeplink-guard.test.mjs:1-18`；`server/test/tab-nav.test.mjs:113`；执行日志批次 508。

## CASE-DESIGN-012 通知点击落到工作台首页

- **编号**：CASE-DESIGN-012
- **样本（真实发生）**：点击「会议通知」先落工作台首页，而不是这条消息本身；`notice.html` 只在手工输入 URL 时才会打开。同一批取证发现消息被拆成公告、系统通知、私信三种投递源与四个承载面（`notice.html` / `messages.html` / `archive.html?tab=notice` / 铃铛下拉）。
- **根因**：发布侧默认写 `targetModule:'workspace'`，消费侧 `resolveNoticeUrl` 以「业务页直达优先」把它兜底成角色工作台；各入口又各自判断 `direct` 分支，绕过了全貌页。
- **当时的落点**：工作台首页（与具体消息无坐标关系）；归档页还保留第二个通知列表。
- **对应规范编号**：SD-33
- **边界**：公告没有对象坐标时落 `notice.html?id=` 并只渲染正文 / 发布人 / 受众；对象已被删除或当前角色无权查看时，详情页给一句可见提示，而不是跳回列表。

## CASE-DESIGN-013 会议状态「待召开」双状态机

- **编号**：CASE-DESIGN-013
- **样本（真实发生）**：打开支书台「支委会」页签，历史会议已完成考勤、已复盘、议程已 `passed`，仍显示「待召开」；同一活动在活动详情与日历里却是「已召开」。
- **根因**：页签自带 `meetingStatus()` 四态，只按日期判「待召开」，与统一派生函数并存；状态不是现算，而是页面各算一次。
- **当时的落点**：页签本地状态机（第二套），与活动详情 / 日历的派生结果不一致。
- **对应规范编号**：SD-34
- **边界**：日期未到但已锁定表决的会议不算「待召开」；制度规定的冻结名单（应到 / 表决）作为只读事实快照存在，不参与状态判定。

## CASE-DESIGN-014 归档完成后才派生、无法销项的待办

- **编号**：CASE-DESIGN-014
- **样本（真实发生）**：宣传委员完成归档后，系统才派生一条「归档材料」待办；活动已离开待归档面，这条待办没有人能销项。hydrate 又按「活动已结束」为 34 个未归档活动各生成一条，待办列表被填满但多数活动产出未齐。
- **根因**：待办生成时点放在归档动作之后，且判据用「活动结束」代替「关闭条件已齐」，与归档面使用的判据不同源。
- **当时的落点**：宣传委员待办列表（死条），归档页并不消费这些待办。
- **对应规范编号**：SD-34
- **边界**：关闭条件未齐时，归档面仍以只读列表展示该活动，只是不生成待办；归档动作负责销项，重复归档幂等。本判例不覆盖「归档后再派生待办」的写法，该写法已由 SD-34 排除。

## CASE-DESIGN-015 工作关系表 5 列、第 5 列全空

- **编号**：CASE-DESIGN-015
- **样本（真实发生）**：支书台「支部分工 · 责任关系」把 14 项固定目录塞进 5 列表格，第 5 列（操作）全为「—」，且强制分两页；每行还有一句复述表头的「读法」。
- **根因**：用表格列同时承载「模块 / 责任人 / 角色 / 说明 / 操作」五种信息，没有内容的列也保留列位；把「可横向比较」误当作表格的唯一形态。
- **当时的落点**：支书台责任关系表格（空列 + 卡内分页 + 表前读法）。
- **对应规范编号**：SD-35
- **边界**：需要横向比较多行同字段时仍可用表格；本判例只针对「无内容列保留列位」的情形，不把表格形态整体否定。

## CASE-DESIGN-016 mock 种子写入派生结果字段

- **编号**：CASE-DESIGN-016
- **样本（真实发生）**：`mock/activities.js` 逐行手写 `status` / `archived`，`activityReviews` 手写 `progress` / `overdue`，`notices` 手写 `expireDate`；把一条活动日期从过去改到未来后，状态、逾期、归档缺口与相关待办不跟随。
- **根因**：种子存的是派生结果而不是事实，派生器与种子形成两套真相；页面读种子、逻辑算派生，改一条事实需要改多处。
- **当时的落点**：`docs/src/data/mock/**` 种子行被页面直接读取，hydrate 只做搬运。
- **对应规范编号**：SD-34
- **边界**：制度性冻结快照（应到名单、表决名单）与演示快照可保留，由既有白名单机制登记理由；本判例只覆盖「种子直接存派生结果」的情形，派生字段清单见 SD-34 与 `DATA_MODEL.md`。
