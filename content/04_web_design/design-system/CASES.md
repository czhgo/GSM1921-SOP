---
title: "设计域判例库"
type: design
role: "[工程师]+[AI]"
last_updated: "2026-10-30"
status: active
related_files: [DESIGN_SYSTEM.md, content/03_doc_system/CASES_INDEX.md, content/03_doc_system/OPERATIONS_GUIDE.md]
---

# 设计域判例库

> **本文件回答什么**：设计条目**为什么这样定、什么情况下不适用**——每条记「真实发生过的场景 → 结论 → 边界 → 对应规范编号 → 证据指针」。
> **不回答什么**：规范条文本身（必须 / 不得、布尔判据）→ [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) 对应编号；目录与入口 → [CASES_INDEX.md](../../03_doc_system/CASES_INDEX.md)；逐批过程 → `.ctx/logs/2026-10-EXECUTION_LOG.md`。
> **谁什么时候读**：`[工程师]+[AI]`，改动相关设计面之前读边界一列；评审核对「这条为什么存在」时读场景一列。
> **纪律**：判例不产生规范效力（`OPERATIONS_GUIDE.md §32.3`）——判例里的结论若被写成「以后都应如此」，须迁到规范侧并取编号。「结论」列只复述本条判例当时确认的落点，规范效力一律以「对应规范编号」所指条目为准。
> **域**：本文件承载 `CASE-DESIGN-*`（设计域）与 `CASE-DATA-*`（数据真相域，见文末分区）；编号与域规则见 [CASES_INDEX.md](../../03_doc_system/CASES_INDEX.md)。文末「迁移登记 A–C」是 2026-10-29 设计系统拆编时从规范迁入的判例 / 学习登记，同样只作存档、不产生规范效力。

---

## CASE-DESIGN-001 链接色不承担「跳转」语义

- **编号**：CASE-DESIGN-001
- **场景（真实发生）**：同一个「跳转」语义，首页一处用 `text-accent`（主题色深字），另一处用 `text-blue-600`（Tailwind 蓝）；批次 507 全站点检时发现 `<a>` 上混用 `text-blue-*` / `text-sky-*` / `text-indigo-*`，读者无法从颜色判断「这是链接还是信息态」。
- **结论**：页面内跳转链接统一走 `.link` / `.text-accent`（`--app-accent-soft-text`）；蓝色只保留给信息态（徽章、状态字、带 `bg-*` 的按钮型链接）。链接 hover 只加下划线、不改色——`soft-text` 已是浅底上可读的深字，再加深会掉对比度。
- **边界**：带 `bg-*` 的信息态按钮型链接、徽章 / 状态色 map / 表单控件修饰不受本条约束；它们不是「跳转」语义。
- **对应规范编号**：SD-22
- **证据指针**：`DS_03_COMPONENTS.md §12.10`（链接表，本批迁出其 why 句）；`server/test/link-color-guard.test.mjs:1-18`；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 507。

## CASE-DESIGN-002 中性控件按下不得闪红

- **编号**：CASE-DESIGN-002
- **场景（真实发生）**：`--surface-active` 曾是党建红浅底（亮 `#FEE2E2` / 暗 `#2A1A22`），中性按钮一按就闪红——读者把「按下」误读成「出错 / 危险」。批次 507 梳理按压三源时发现该令牌同时被中性控件与语义色控件复用。
- **结论**：中性控件按压用 `var(--neutral-200)`；主题色控件用 `--app-accent-active-bg`；党建红实底用 `--party-red-active`。三源分开，中性控件不得按出红色。
- **边界**：党建红实底按钮（party-red）按出深红属其语义色本身，不算「中性控件闪红」。
- **对应规范编号**：SD-23
- **证据指针**：`DS_03_COMPONENTS.md §12.8`「按压三源」；`server/test/hover-state-guard.test.mjs:181-191`；执行日志批次 507。

## CASE-DESIGN-003 按压反馈禁用位移

- **编号**：CASE-DESIGN-003
- **场景（真实发生）**：早期按压反馈用 `transform: scale()` / `translateY()` 做「下沉」，按下时元素位移、推挤相邻内容；同一交互在不同按钮上还各写一套过渡时长。
- **结论**：按压唯一反馈是 `--press-shadow`（`inset 0 1px 2px`）＋ 180ms 过渡；按压路径上 `transform/scale/translate` 计数为 0。
- **边界**：入场、折叠等**非按压**动效仍可用 `transform`（见 SD-30 白名单）；本条只管 `:active` 反馈。
- **对应规范编号**：SD-24
- **证据指针**：`DS_03_COMPONENTS.md §12.10`「按压」表；`server/test/hover-state-guard.test.mjs:201`；执行日志批次 507。

## CASE-DESIGN-004 选中态不得借用 hover / active 灰底

- **编号**：CASE-DESIGN-004
- **场景（真实发生）**：选中态一度以 `--surface-hover` / `--surface-active` 的灰底表达，同屏出现「我在这里」（持续选中）与「我正按着」（瞬时按压）同色，读者分不清两者的时间性；侧边栏与内容区选中样式也各不相同。
- **结论**：选中态用主题 soft 三件套（`--app-accent-soft-bg` ＋ `--app-accent-soft-text` ＋ 左条 `inset 3px 0 0 var(--app-accent)`）；侧边栏是唯一浅灰豁免。
- **边界**：侧边栏 `.module-tab.active` 保留浅灰是因为需要纵深，内容区不适用此豁免；列表行、日历格、子页签、下拉选项等一律主题 soft。
- **对应规范编号**：SD-25
- **证据指针**：`DS_03_COMPONENTS.md §12.11` 状态语言表；`server/test/hover-state-guard.test.mjs`（三态守卫）；执行日志批次 508。

## CASE-DESIGN-005 实底按钮 hover 不得落中性灰

- **编号**：CASE-DESIGN-005
- **场景（真实发生）**：实底主题色按钮 hover 时落成中性灰，视觉上等同「被禁用」；批次 508 为此补第 9 个主题 token，把 hover 与 active、selected 三态彻底分开。
- **结论**：实底按钮 hover 用 `--app-accent-strong-hover`（同色相加深）；底色落中性灰的计数为 0。
- **边界**：描边 / 中性按钮 hover 仍走 `--surface-hover`（它们不是实底主题色按钮）；本条不改变其口径。
- **对应规范编号**：SD-26
- **证据指针**：`DS_03_COMPONENTS.md §12.11` 末条、§12.9 SD-26；`server/test/theme-palette-guard.test.mjs:16`；`server/test/theme-palette-guard.test.mjs:97`；执行日志批次 508。

## CASE-DESIGN-006 输入焦点不得「双答」

- **编号**：CASE-DESIGN-006
- **场景（真实发生）**：`.input-flat:focus` 曾同时画 2px 深灰外环与主题色边框，同一个焦点给了两个答案；暗色下外环又曾设为党徽金，与金边叠成「双金边」，框体反而更糊。
- **结论**：活动态只把边框切成主题色 1px，`outline` 与 `box-shadow` 均为 `none`，鼠标点击与键盘聚焦表现一致；同一控件只答一次，禁止「金边 + 黑环」双答。2026-10-29 P1 改准：原「边框 ＋ 2px 实线环」的双信号写法作废，输入族不出环。
- **边界**：纯键盘操作仍须有可见焦点；输入族由 `:focus` 承担（只变边框），按钮与链接族由 `:focus-visible` 承担（几何同源）；搜索类白名单控件与普通输入同一套外壳。
- **对应规范编号**：SD-27
- **证据指针**：`DS_03_COMPONENTS.md §12.12` 字段外壳表、`DS_04_INTERACTION_AND_RESPONSIVE.md §5.8`；`server/test/field-shell-guard.test.mjs:1-23`；`server/test/ui-focus-ring.test.mjs:63,109`；执行日志批次 508。

## CASE-DESIGN-007 禁用与只读不得都用 opacity 压低

- **编号**：CASE-DESIGN-007
- **场景（真实发生）**：禁用与只读两个状态都用 `opacity` 压低，外观几乎一致；用户分不清「不能改」与「能复制但不能改」，表单里还出现过把只读字段当禁用字段解释的文案。
- **结论**：禁用＝灰底灰字（真不可用）；只读＝透明边、浅底、正文色（可读可复制）；`opacity` 混作两态的计数为 0。
- **边界**：整页级只读（如跨支部只读视图）按页面级说明处理，不套控件级两态样式。
- **对应规范编号**：SD-28
- **证据指针**：`DS_03_COMPONENTS.md §12.12` 表「禁用 / 只读」两行；`server/test/field-shell-guard.test.mjs`（F5 禁用 / 只读分态）。

## CASE-DESIGN-008 原生 select 不得出现第二套外观

- **编号**：CASE-DESIGN-008
- **场景（真实发生）**：各渲染点自建下拉外观，同一页出现两种箭头、两种高度；选项很多时（名册、支部目录）无法搜索与分批渲染，长列表只能盲滚。
- **结论**：原生 `<select>` 一律经 `enhanceSelects` 增强（原生控件仍作值载体）；大选项集提供搜索、近期优先、分批渲染与空态。
- **边界**：`person-picker`（选人）继续走自己的组件，不算第二套下拉；已登记的搜索类白名单控件同受外壳约束，但不受本条「必须 enhanceSelects」约束。
- **对应规范编号**：SD-29
- **证据指针**：`DS_03_COMPONENTS.md §12.12` 末两段；`server/test/field-shell-guard.test.mjs`（F6 select 统一）。

## CASE-DESIGN-009 过渡时长与属性散写

- **编号**：CASE-DESIGN-009
- **场景（真实发生）**：各处散写 `0.15s` / `150ms` / `0.3s` / `transition: all`，改一个档位要全站搜；布局属性（`height` / `width` / `max-height` / `padding`）参与过渡，折叠与展开时出现卡顿。
- **结论**：时长只取 120 / 180 / 200 / 240ms（`--motion-*`）；属性只在 `opacity / transform / color / background-color / border-color / box-shadow` 六项内；布局属性与 `all` 计数为 0。
- **边界**：`--motion-*` 令牌定义处本身的裸值、以及已逐条登记的存量（登录 / 浮层 / toast / help 目录 5 条 ＋ reduced-motion 的 0.01ms 2 条）属「待迁移」，不是可照抄的新写法。
- **对应规范编号**：SD-30
- **证据指针**：`DS_03_COMPONENTS.md §12.13` 动效令；`server/test/motion-guard.test.mjs:1-21`；执行日志批次 508。

## CASE-DESIGN-010 活动类别色被状态色顶替

- **编号**：CASE-DESIGN-010
- **场景（真实发生）**：渲染点可直接写 `badgeHtml(type, 'neutral' / 'info')`，活动类别色被状态色顶替；「三会一课」的党建红与错误色的 `#B91C1C` 也一度混用，读者把「党课」读成「异常」。
- **结论**：类别 tone 只由 `constants.js::activityTypeTone` 产出（`party-red/gold/neutral`）；类别与状态路径的 `info` 计数为 0（白名单除外）；党建红固定 `#CE1126`。
- **边界**：允许 `info` 蓝的白名单仍是通知「重要」、活动「已发布」、汇报路由态、建议 / 选修、配置项标注；新增白名单须逐条登记。
- **对应规范编号**：SD-31
- **证据指针**：`DS_03_COMPONENTS.md §12.14` 类别表与白名单；`server/test/activity-tone-guard.test.mjs:1-22`；执行日志批次 508。

## CASE-DESIGN-011 深链落点不消费参数

- **编号**：CASE-DESIGN-011
- **场景（真实发生）**：`archive.html?tab=taskforce&id=…` 一律落回「党建活动」且不打开详情；材料页 `focusActivityId` 命中折叠区时只滚动不展开，用户看到的是「点了没反应」；活动详情「复盘」还曾指向人才库 / 归档页签，而不是复盘承载面。
- **结论**：目标页必须消费自己的参数；定位失败必须有可见提示；无承载面的入口不得渲染。
- **边界**：参数指向的对象已删除或当前角色无权查看时，允许空态提示或跳回列表，但不得静默——必须给一句话说明。
- **对应规范编号**：SD-32
- **证据指针**：`DS_03_COMPONENTS.md §12.9` SD-32；`server/test/archive-deeplink-guard.test.mjs:1-18`；`server/test/tab-nav.test.mjs:113`；执行日志批次 508。

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

## CASE-DESIGN-017 工作组 / 专班 / 其他组同排

- **编号**：CASE-DESIGN-017
- **样本（真实发生）**：支书、组长、成员三处「知情查看」的一级分段各写一套：支书台把「活动工作组 / 专班工作组 / 其他组」并成三个同形按钮；组长台把「其他组」与工作组同排；纪检 / 宣传 / 组织台把 `views` 写死成 `['taskforce']`，活动工作组段根本不出。
- **AI 假设**：只要「都能只读」就可以放进同一个分段控件；分段集合由调用方按需传，组件不必管集合的语义层级。
- **人类意图**：工作组是**协作结构**，党小组是**组织单元**，二者不同层；同一按钮组只能放同级对象。「其他党小组」要看，但必须独立成区（二级入口），不与工作组同排；各台通用能力由组件统一定义，不由调用方写死。
- **泛化规则**：并列项必须同层——同一按钮组 / 表头 / 筛选行内的名词项必须来自术语表的同一「允许并列集」；跨层对象要么降为独立区，要么换成筛选器。术语表必须显式列出每个词条的「允许并列集」，否则「能不能同排」无法判。
- **守卫**：`docs-governance-guard::H-T1`（并列组层级一致）＋ `H-T2`（页签名覆盖段集合）＋ `workbench-audit-coverage`（各台 `views` 含 `workgroup`）。
- **对应规范编号**：SD-37
- **边界**：需要「按党小组看」时用「其他党小组」独立区或页内筛选，**不是**把它加回一级分段；上位页面名（如「组员进展」）可同时覆盖两类对象，页签名不受本条限制。

## CASE-DESIGN-018 button 内嵌 h3 / summary 内嵌 role=heading

- **编号**：CASE-DESIGN-018
- **样本（真实发生）**：支书台活动管理 `calendar-tab.js` 的折叠头写成 `<button><h3>…</h3></button>`；`work-overview.js` 的「我已处理」写成 `<summary><h3>…</h3></summary>`；`todo-tab-shell.js` 写成 `<summary><span role="heading">…</span></summary>`；活动风采卡 `gallery.js` 写成 `role="button"` 容器内嵌 `<h3>`。另有 4 个 `div` 伪开关（成员复盘 / 组长复盘 / 组内复盘 / 动态高级筛选）只能点、Tab 到不了。
- **AI 假设**：折叠头就是「一块可点的区域」，把标题放进去视觉上最省事；`div` 加点击和手写 chevron 与原生控件等价。
- **人类意图**：标题是**结构**、交互元素是**动作**，两者不能互相包裹；折叠头的标题必须在交互元素之外，用 `aria-labelledby` 关联。阅读型折叠走原生 `details/summary`，菜单走 `button` + `aria-expanded` + `aria-controls`，同一个文件里不得两种写法并存。
- **泛化规则**：同类功能同一原语；标题永不进交互元素。判据可机检：`button` / `summary` / `role="button"` 内 `h1..h6` 与 `role="heading"` 计数为 0；折叠状态必须能由 `open` 或 `aria-expanded` 静态回读。
- **守卫**：`ui-control-system-guard::T3-1`（交互元素内无标题）＋ `T3-2`（状态可回读）＋ `T3-3` / `T4-1`（同文件单一原语 / 单一折叠头实现）。
- **对应规范编号**：SD-38 / SD-39
- **边界**：`summary` / `button` 内允许文本、数值、徽章、chevron；被禁止的只有「标题语义」（`h1..h6` 与 `role="heading"`）。行内清单折叠（不是分区折叠头）可保留手写 `details`，但同一文件不得与封装混用。

## CASE-DESIGN-019 62 页签中约 20 个同一渲染器重复注册

- **编号**：CASE-DESIGN-019
- **样本（真实发生）**：七台合计 62 个页签，其中约 20 个是同一渲染器在每台各注册一次：四台「活动日历」、五台「我的处置」、三台「知情查看」、宣传台「宣传任务」、成员台「思想汇报 / 我的考察 / 我的复盘」，以及支书台与组织台各一份「成员流动」。支书追问「活动查询是否必要」——活动管理里的查询折叠区与日历工具栏承担同一件事。
- **AI 假设**：页签是「每台自己的入口」，同一功能在每台各放一个页签最直观；删除一个页签只用删注册行。
- **人类意图**：一个功能只允许**一个页签位**；跨台重复的要么是通用面（今天 / 待办 / 工作概况，同名同组件），要么必须降级为页内区 / 折叠卡，并同时具备三件：新落点、旧深链重定向、help 新落点。查询这类「辅助性功能」依赖主功能上下文，应融入主功能页（并入日历工具栏），不独立成页签。
- **泛化规则**：一功能一页签；重复注册必须降级，且降级要「三件齐备」才允许删代码（新落点 + 深链重定向 + help 更新）。判据可机检：IA 地图页签集合 ≡ 注册表（逐台、总数），已降级页签名不得重新注册。
- **守卫**：`catalog-sync::T6`（IA 地图 ≡ 注册表 · 45 条 · 旧名不得重注册）＋ `doc-consistency::S1`（help ↔ 注册）＋ `S2`（旧页签名不得以表格行回潮）。
- **对应规范编号**：SD-40
- **边界**：每台都需要的通用面（今天 / 待办 / 工作概况）按「同功能同名同组件」保留，不属重复注册；同一功能的**不同视角**（如支书 L2「全局概况」与五台 L0/L1「工作概况」）可由职责差异支撑而保留，但必须能引母本说明差异。

## CASE-DESIGN-020 分组胶囊「存在但不可见」

- **编号**：CASE-DESIGN-020
- **样本（真实发生）**：支书在 390 / 1024 / 1280 打开支书台，四枚分组胶囊只剩空白或一条分隔线；CSS 里 `.tab-group-label` 的声明**确实存在**，但 `@media (max-width:1280px)` 直接 `display:none`；亮色胶囊底色与页面底仅 **1.06:1**，高度 **18px**。
- **AI 假设**：CSS 里写了规则＝「已恢复」；分组名是可裁剪的装饰，窄屏应让位给页签。
- **人类意图**：「恢复」指用户在任何宽度都能**感知**到分组，而不是源码里存在一条声明；可见性必须在渲染后可测。
- **泛化规则**：胶囊类判据必须同时含「断点集合 × 可见性 × 高度 ≥24px × 形状对比 ≥1.5:1」；窄屏只缩内边距 / 字号并让页签条横滑，不得用 `display:none` / `visibility:hidden` 隐藏。
- **守卫**：`ui-control-system-guard::V2` ＋ `ui-contrast-guard::K3` ＋ `page-sweep`（390px `groupLabelsVisible` > 0）。
- **对应规范编号**：SD-42
- **边界**：组名仍是**非按钮**胶囊（SD-36）：可见性提高不等于可点击，不得进入 tab 序列或获得 hover；本条只管「看得见 / 量得到」，不管组名的控件语义。
- **证据指针**：`docs/src/styles.css` 的 `.tab-group-label` 与 `@media (max-width:1280px)` 段；`server/test/ui-control-system-guard.test.mjs`（V2）；`server/test/ui-contrast-guard.test.mjs`（K3）；执行日志批次 512。

## CASE-DESIGN-021 `btn-ghost` 写入口不可辨识

- **编号**：CASE-DESIGN-021
- **样本（真实发生）**：全仓 **79 处** `btn-ghost` 在当动作按钮用——今天页「写入活动 / 看日历 / 全部」、工作概况的筛选 chip 与「去待办」行、`list-row` 动作行等；无描边、无底色，`cursor:pointer` 是唯一线索；hover 与白卡色差仅 **1.06–1.11:1**。`btn-ghost` 此前已被判「无边框不可辨识」，但旧类名继续沿用。
- **AI 假设**：沿用旧类名最省事；hover 有变化就算可点；`btn-ghost` 属于既有动作族，不必换档。
- **人类意图**：控件与内容必须可区分——动作至少要有一种**静态**线索（描边 / 底色 / 下划线 / 箭头 / 可见 hover），不能靠光标形状。
- **泛化规则**：按钮三档——动作按钮必有描边或底色；纯文字动作挂 `.btn-text`（静态下划线 ＋ 尾随箭头，箭头不得 `neutral-400`）；图标按钮视觉 32×32 ＋ 命中 ≥44×44。`btn-ghost` 只保留给**非动作行载体**（6 处白名单，逐条写明 hover 底或 3px 左条），新增即红。
- **守卫**：`ui-control-system-guard::V4–V7` ＋ `frontend-foundations-guard::F8`。
- **对应规范编号**：SD-43
- **边界**：整行导航 / 行内定位载体可继续用 `btn-ghost`，但必须有可见 hover（底 / 边 / 左条，对白卡 ≥1.2:1）；白名单只许逐条收窄，不许当垃圾桶。
- **证据指针**：`server/test/ui-control-system-guard.test.mjs`（V4 白名单 / V5 btn-text / V6 图标 / V7 hover 对比）；本批迁移 67 处、保留 6 处；执行日志批次 512。

## CASE-DESIGN-022 表格末列吃掉余量

- **编号**：CASE-DESIGN-022
- **样本（真实发生）**：工作概况「工作分工」5 列表在 1440 下把余量全部给末列，按钮与「待处理」标签被甩到最右、与上方列头错位；全仓 `table-layout` 计数为 **0**；≤640 卡片化时动作列贴右缘。
- **AI 假设**：表格只要把内容填进去就会自动排好；列宽交给浏览器按内容分配更「自适应」。
- **人类意图**：表格要有**列宽模板**——同列在不同行必须对齐，末列内容贴列尾，而不是用余量把动作推到天边。
- **泛化规则**：关键宽表 `table-layout: fixed` ＋ 显式列宽（工作分工 5 列 18% / 16% / 9% / 9% / 48%）；首列 `nowrap` 同时给 `max-width`；末列 `text-align:end` ＋ 16px 尾部内边距；≤640 卡片化动作列 `justify-content:flex-start`。
- **守卫**：`ui-control-system-guard::V3`。
- **对应规范编号**：SD-44
- **边界**：只约束关键宽表（工作分工 / 负责人 / 在办 / 逾期 / 待处理）；两列窄表与只读键值表仍可用默认 `auto`，不强制 `colgroup`。
- **证据指针**：`docs/src/styles.css` 的 `.wo-lines-table` / `.wo-col-*` / `[data-responsive="cards"]` 段；`docs/src/components/governance/work-overview.js` 的 `colgroup`；`server/test/ui-control-system-guard.test.mjs`（V3）；执行日志批次 512。

## CASE-DESIGN-023 同一对象 4 种详情面 / 归档深链不校验

- **编号**：CASE-DESIGN-023
- **样本（真实发生）**：同一个活动可从 `activity.html`、支书活动管理同页 inspector、归档库弹窗、工作概况预览四处打开；归档库深链 `archive.html?tab=…&id=…` 不校验归档状态，未命中也不提示；跨支部对象 id 照常渲染详情；缺 id 时仍有 `activity.html?id=${id || ''}` 拼出的可点入口。专班有同样四处形态。
- **AI 假设**：「能打开详情」就是入口正确；所有入口一步直达最好；归档只是列表过滤条件，不是对象状态。
- **人类意图**：按**最小三成本**分流——入口已在对象所属工作台内 → 同页定位（保留筛选 / 列表上下文）；入口在工作台外 → 直达；无 id / 无权限 → 不可点。已归档对象可查但只读。
- **泛化规则**：每个入口在单一矩阵里只声明 `direct | locate` 并写理由，未知入口 → `none`；缺 id / 跨支部普通角色 → `none`；已归档 / 专班终态 → `readOnly`；同一页只有一个完整详情落点（弹窗 / 预览保留并补「打开完整页」）；href 只经 `objectDetailHref`，裸 URL 生成点计数为 0。
- **守卫**：`object-route-guard::R1–R8` ＋ `frontend-foundations-guard::F8`。
- **对应规范编号**：SD-45
- **边界**：`locate` 的同页面板是**操作面**（摘要 ＋ 就地动作），不是第二承载面；归档弹窗保留为预览，完整正文仍只在 `activity.html` / `taskforce.html`。
- **证据指针**：`docs/src/core/domain/object-route.js`（`OBJECT_ROUTE_ENTRIES` / `resolveObjectRoute` / `canViewObjectDetail`）；`docs/src/entries/pages/activity-entry.js`（`readOnly` 写口门）；`server/test/object-route-guard.test.mjs`（R1–R8）；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 512。

## CASE-DESIGN-024 色彩被压成单一主题色相

- **编号**：CASE-DESIGN-024
- **样本（真实发生）**：全仓颜色引用抽样（中性 : 强调 : 状态 : 类别）≈ **4.9 : 2.4 : 0.8 : 1.0**；同屏只剩一个主题色相，中性占比 **54–76%**；状态与类别只出现在大面积渐变卡头与彩色按压里，徽章 / 圆点 / 左条等小面积功能位反而无色；暗色 `party-red` 与 `danger` 逐值相同。
- **AI 假设**：统一成一个主题色＝一致；功能色是「装饰彩」，少用更稳；要解决单调就得重做主题色盘。
- **人类意图**：不是否定现有主题色盘，而是让**功能色获得与主题色同等的规则层**——主题色只承担主行动 / 选中 / 链接 / 身份标签；状态 / 类别 / 身份只在小面积功能位出现，两层并列。
- **泛化规则**：主题色层（7×2×9）值不改；功能色层 `--status-*` / `--color-category-*` / `--color-identity-*` 各有独立 token 与暗色值；两层不互相借用；功能色只在徽章 / 圆点 / 左条 / 图例 / 提示条；暗色类别红 / 金 ≠ danger / warning；身份色单一源；零消费者 token 删除。
- **守卫**：`theme-palette-guard::T1/T2/T5/T8/T9` ＋ `link-color-guard::L3/L6–L8` ＋ `ui-contrast-guard`。
- **对应规范编号**：SD-46
- **边界**：党建红 `#CE1126` 与党徽金是**固定品牌层**，不随主题切换；类别色也不随主题切换。功能色恢复的是小面积语义位，不恢复渐变卡头与彩色按压。
- **证据指针**：`DS_01_COLOR_AND_THEME.md §2.12` / `§2.13`（消费者清单与对比度实测）；`docs/src/styles.css` 的 `--status-*` / `--color-category-*` / `--color-identity-*` 段；`server/test/theme-palette-guard.test.mjs`（T8 / T9）；`server/test/link-color-guard.test.mjs`（L6–L8）；执行日志批次 512。

## CASE-DESIGN-025 分组胶囊「没恢复」：只要可见，丢了主题色与直角

- **编号**：CASE-DESIGN-025
- **样本（真实发生）**：批次 512 把 `.tab-group-label` 从中性灰 999px 改为「全宽可见 ＋ 高度 ≥24px ＋ `neutral-400` 描边」，五档宽度都能看到；支书复核时仍说「胶囊没恢复」。取证：底色 `--neutral-100`、文字 `--neutral-500`、`border-radius:999px`、字重 400、字距 0——**可见性达标，但 8–9 月的主题 soft 底 / 主题 soft 深字 / 3px 直角 / 600 字重全部丢失**。
- **AI 假设**：上一条判例（CASE-DESIGN-020）把「可见」立成判据，于是「可见＝恢复」；颜色与圆角只是装饰，不影响「看得到」。
- **人类意图**：「恢复」指**回到 8–9 月的视觉语义**——主题色小胶囊、没那么圆角、字更实；可见性是前置条件，不是全部。
- **泛化规则**：判据必须把「可感知（断点 × 可见 × 高度）」与「视觉构成（主题 soft 三件套 × 3px × 600 × 0.5px 字距）」**分开登记、同时把守**；只满足其中一组不得称「已恢复」。`.tab-group-label` 是 SD-3「胶囊 999px」的唯一登记例外，但例外只改圆角，不豁免主题色与字重。
- **守卫**：`ui-contrast-guard::K3`（主题 soft-bg / soft-text、亮暗 ≥4.5:1、3px、≥24px）＋ `ui-control-system-guard::V2`（无隐藏断点、3px、描边对比 ≥1.5:1）。
- **对应规范编号**：SD-47（视觉构成）；关联 SD-3（3px 例外）/ SD-36（非按钮语义）/ SD-42（全宽可见）。
- **边界**：组名仍是**非按钮**胶囊（SD-36）——恢复主题色不等于可点击，不得进入 tab 序列或获得 hover；≤1280px 只缩内边距，字号保持 12px（SD-42）。
- **证据指针**：`docs/src/styles.css` 的 `.tab-group-label`（`background: var(--app-accent-soft-bg)` / `color: var(--app-accent-soft-text)` / `border-radius:3px` / `font-weight:600` / `letter-spacing:0.5px`）；`server/test/ui-contrast-guard.test.mjs`（K3）；`server/test/ui-control-system-guard.test.mjs`（V2）；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 513。

## CASE-DESIGN-026 改到存在 ≠ 可感知：胶囊与链接「改完仍看不见」

- **编号**：CASE-DESIGN-026
- **样本（真实发生）**：批次 514 复核阶段三——`.tab-group-label` 已按 SD-47 有主题 soft 底与描边，但同屏的**选中页签也是 soft 底**，两者只差一个浅边框，支书仍说「分不出哪组、哪页」；链接侧全站仍有 **110 处 / 54 文件** 文本下划线（含 help / login），批次 512 的「静态下划线」口径还把它写成规范。改完后：组名＝10% 淡底（`--app-accent-tint`）＋ 无边框，选中页签＝solid soft ＋ `--app-accent` 描边 ＋ 700；下划线 **110 → 0**。
- **AI 假设**：CSS 里写上主题色就等于「恢复层级」；下划线是链接的默认线索，留着更安全；改完能截图看到元素存在就算完成。
- **人类意图**：改动的验收标准是**相邻两态一眼可分**——组名与选中页签必须在同一屏里不靠细看就能区分；链接的非颜色线索要用箭头 / 图标 / 底色 hover，而不是给整页文字加下划线。
- **泛化规则**：视觉改动必须同时满足两条——① **相邻态差异可测**（底：10% tint vs solid soft；边：none vs 1px accent；字重：600 vs 700）；② **全站计数归零**（下划线 0 处，而非「新代码不加」）。只满足「元素存在 / 类名存在」不得称完成；同源判例见 CASE-DESIGN-020（可见 ≠ 恢复）与 CASE-DESIGN-025（可见 ≠ 视觉构成）。
- **守卫**：`ui-contrast-guard::K3`（组名 10% 淡底 / 无边框 / soft-text ≥4.5:1）＋ `ui-control-system-guard::V2/V5`（胶囊无边框、选中态、纯文字动作静态线索）＋ `link-color-guard::L3/L6`（链接无下划线、600 字重、淡底 hover）＋ `no-underline-guard::N2/N4`（全站 0 处、只降不升）。
- **对应规范编号**：SD-49（下划线清零）／ SD-50（胶囊与选中页签层级）；关联 SD-3（3px 例外）/ SD-36（非按钮语义）/ SD-42（全宽可见）/ SD-47（字重与直角）。
- **边界**：表格分隔线、卡边、选中态边线是 `border-*`，不属「文本装饰」，不要求清零；链接仍必须有**非颜色线索**（箭头 / 图标 / 底色 hover），不是「只留颜色」。`about.html` 的存量样式同样适用，但 About 已撤导航（见 `PRODUCT_IA.md`）。
- **证据指针**：`docs/src/styles.css` 的 `--app-accent-tint` / `.tab-group-label` / `.tab-btn-active` / `.link` / `.btn-text`；`server/test/no-underline-guard.test.mjs`（N1–N4）；`server/test/ui-contrast-guard.test.mjs`（K3 / K6）；`server/test/link-color-guard.test.mjs`（L3 / L6）；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 514。

## CASE-DESIGN-027 加载态「压暗 + 插加载行」硬替换

- **编号**：CASE-DESIGN-027
- **样本（真实发生）**：旧页签切换把内容区 `opacity` 压到 `0.45` 再在顶部插入一行「加载中…」，旧内容原地消失、新内容高度未定，切页签时整块闪一下；快速渲染也会闪，慢渲染没有骨架，超过 1s 仍是半透明块。批次 514 改为：>120ms 才铺 skeleton（「正在加载…」＋ 3 条卡形行 ＋ spinner ＋ `role=status` / `aria-live=polite`），旧内容淡出 120ms、新内容淡入 180ms（8px 位移），动效编排 ≤1000ms；实测 **825–900ms**；reduced-motion 只淡入 80ms、无位移，骨架与文案保留。
- **AI 假设**：压暗是最省事的「正在加载」信号；插一行文字就能解释等待；硬替换只是快慢问题，不影响理解。
- **人类意图**：加载态要**保住版式与上下文**——骨架近似目标布局、只在真的等超过 120ms 时出现、新内容交叉淡入；禁止用整块压暗或一行加载文案把页面「抹掉」。
- **泛化规则**：加载体验＝「延迟阈值（120ms）＋ 版式骨架 ＋ 有界编排（≤1s）＋ 无压暗 / 无插行 / 无硬替换」四件齐备；页面跳转另加顶部 2px 主题色进度条与 120ms 离开淡出；`prefers-reduced-motion` 保留骨架与文案、只压到 80ms 且无位移。任一缺失不得称「加载体验已做」。
- **守卫**：`loading-experience-guard::L1–L7`（含故障注入：删骨架 / 延迟归零 / 恢复压暗硬替换 / 删 reduced-motion 逐条判红）。
- **对应规范编号**：SD-51（加载编排与禁令）；关联 SD-30 与 §12.13 动效令（过渡时长白名单）。
- **边界**：数据层 8s 超时错误卡不受本条约束（那是失败态，不是加载态）；首屏空容器的骨架可立即铺（没有旧内容可闪），只有「已有内容切页签」才受 120ms 延迟约束。骨架只求布局近似，不要求逐像素复刻目标页。
- **证据指针**：`docs/src/components/shell/tab-bar.js`（`tabContentSkeletonHtml` / `TAB_LOADING_SKELETON_DELAY_MS = 120` / `TAB_CONTENT_FADE_IN_MS = 180` / `TAB_LOADING_SKELETON_MAX_MS = 1000` / `installNavigationProgress`）；`docs/src/components/shell/tab-loading.css`（`.ws-route-progress` / reduced-motion 段）；`server/test/loading-experience-guard.test.mjs`；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 514。

## CASE-DESIGN-028 帮助页折叠摘要的焦点环落在白卡上只剩 1.40:1

- **编号**：CASE-DESIGN-028
- **场景（真实发生）**：`docs/help.html` 的 `.help-chapter > summary:focus-visible` 曾用党徽金 `#FFD700` 画 2px 焦点环，而折叠条落在白卡 `#FFFFFF` 上——实测 **1.40:1**。鼠标用户看不出问题，键盘用户 Tab 到章标题时**看不到焦点在哪**：环是在的，只是与底色同亮。当时先改走深金文字档 `--status-warning-text`（`#92400E`，7.09:1）；2026-10-28 全站焦点统一后改用主题色 `--app-accent`（金主题对白卡 3.83:1）。
- **结论**：焦点环的验收标准是**环对底的对比度**，不是「有没有 `outline`」。固定党徽金 `#FFD700` 对白卡只有 1.40:1，已退出焦点用途；焦点色统一取主题色 `base` 档（对白卡最低为金 3.83:1）。
- **泛化规则**：焦点可见由三件构成：① 有环（输入族 `:focus`、按钮 / 链接族 `:focus-visible`）＋ ② 环对**实际所在底色** ≥3:1（图形判据）＋ ③ 不在同一控件上重复出第二道答案（SD-27 / §5.7）。判据必须按**环落的那块底**逐处实测，不得只在 token 层看色值。
- **守卫**：`ui-contrast-guard::K6`（`--status-warning-text` 亮 / 暗逐底 ≥4.5:1，填充色 `--status-warning` 只作圆点 / 左条）＋ `ui-focus-ring`（七主题亮 / 暗的 `--app-accent` 焦点环逐底 ≥3:1；顶栏白环 ≥3:1）。
- **对应规范编号**：SD-27（焦点环必须有可见环且只答一次）；对比度判据同族见 SD-46（状态色文字档）与 `ui-contrast-guard::K6`。
- **边界**：顶栏深红底是唯一不用主题色的例外，现改用白色令牌 `--app-accent-strong-ink-light`（11.44:1，见 §5.7）；本条只判浅底上的焦点环。装饰性金点描边不属焦点环判据（见 §2.3.1）。
- **证据指针**：`docs/help.html:58`（`outline:2px solid var(--app-accent)`）；`docs/src/styles.css` 的 `--app-accent-base-light` 七色表；`server/test/ui-contrast-guard.test.mjs`（K6）；`server/test/ui-focus-ring.test.mjs`（F1 / F4 / F6）；`.ctx/logs/2026-10-EXECUTION_LOG.md` 美学专项 Task 7。

## CASE-DESIGN-029 说明层压过对象层：卡头副题在教人怎么点

- **编号**：CASE-DESIGN-029
- **场景（真实发生）**：`taskforce-view` 的卡头第二行曾写「全支部专班一览 · 点击卡片查看详情（只读）」，同页空态与若干页签副题也写「点上方…」「下一步：…」。结果是：**第二行是唯一承载「范围」的位置，却被操作指令占满**——读者先读到「怎么点」，反而读不到「这批数据是什么范围、我有什么权限」。本批把副题收成「全支部 · 只读」「本支部 · 只读」一类：范围 ＋ 约束；点法交给卡片自身的 hover / 焦点 / 箭头。
- **结论**：卡头副题＝**范围 ＋ 约束**（哪个支部 / 哪一批 / 只读还是可写）；操作指令（`点击…查看` / `点上方` / `点右上角` / `下一步：`）一律不进副题。第二行是**信息位**，不是操作说明位。
- **AI 假设**：副题空着可惜，顺手把「点卡片能进详情」写上去＝更友好；空态里补一句「点上方按钮」＝更贴心。
- **人类意图**：卡头已有标题与计数，副题只要回答「看到的是哪一批、能不能改」；「怎么点」由行载体自身的可点性与 hover / 焦点线索承担（SD-43 / SD-45），写进副题只会**用说明盖住对象**。
- **泛化规则**：卡头三件——标题（对象）／副题（范围 ＋ 约束）／动作（按钮或行载体）；**三者各答一个问题，不互相代答**。判据按「副题声明处」机检（`renderCardHeader` 的 `meta` 与手写卡头副题 span），空态文案另归 §4.18 C6。
- **守卫**：`copy-guard::S1/S2`（本轮四份 record 组件 ＋ `entries/tabs/**`：实测 25 条副题，操作指令 0 处；含反例「点击卡片查看详情」与负例「全支部 · 只读」）。
- **对应规范编号**：SD-54
- **边界**：空态 / 错误态里的「下一步」属 §4.18 C6（一句为什么空 ＋ 一个出口），不在本条；行载体自身的 `title` 悬浮提示不属副题。`entries/tabs/visitor/tf-view-tab.js` 仍有一处 `textContent` 覆写分支，其基串已随本批改为「全支部 · 只读」而不再命中，覆写文本不作为副题单一源（守卫只判声明处）。
- **证据指针**：`docs/src/components/record/taskforce-view.js:59`（`全支部 · 只读`）；`docs/src/components/record/workgroup-view.js:140`（`renderCardHeader({ meta: '本支部 · 只读' })`）；`server/test/copy-guard.test.mjs`（S1 / S2）；`DS_03_COMPONENTS.md §12.15`（SD-54）。

## CASE-DESIGN-030 把「卡片数字」执行成去图标：过度解读原则 4

- **编号**：CASE-DESIGN-030
- **场景（真实发生）**：支书反馈「四个数统一为卡片数字」，AI 把它执行成**纯文字卡**——首页四数与工作台结论带同时删掉彩色图标块、数字统一回正文色，并同步把守卫改成「不得回潮图标块」。支书复核：「喜欢彩色图标块，纯文字显得粗糙」。取证：上一版的 `stats.js` 只余 `.metric-band__value` ＋ `.metric-band__label`，`styles.css` 的 `.stat-icon-tint` 被整段删除，`ui-home-hero::E7` 还新增了 `doesNotMatch(/stat-icon-tint/)` 的反向断言。
- **AI 假设**：`DESIGN_SYSTEM §一 原则 4`「主色 ≤ 2 种，功能色仅用于状态指示」意味着彩色越少越合规；把「卡片数字」理解成去掉一切非文字的装饰；既然删了图标，守卫就该禁止它回来。
- **人类意图**：「统一为卡片数字」指的是**四个数在版式上同级、同构**（都给卡片、都用同一套数字排版）；图标浅底与同色笔触是支书认可的既有表达，应一并保留。原则 4 约束的是**主色数量**与**功能色的状态语义**，不把彩色一概判为违规。
- **泛化规则**：① 原则 4 的判据是「主色 ≤ 2 种 ＋ 功能色只承担状态」；**点缀色**（图标浅底 / 笔触 / 关键数值）单列，不计入主色数量、不承担状态语义，每屏 1–2 处（一组四数卡按一处计）。② 「统一 / 收敛」类指令先确认收敛的是**版式与排版**还是**色彩与图形**；不得以「更克制」为由删掉支书明确喜欢的视觉元素。③ 删掉元素的同时**收紧守卫**（反向断言）会把误读固化成规范，改结构前先核对该判据的原始裁定语境。④ 图标不得成为唯一信息载体——数值与标签必须仍在。
- **守卫**：`ui-control-system-guard::V1`（四数卡由图标、数值、标签三段组成；无 `hover:shadow` / `-translate-y`）＋ `ui-home-hero::E7`（首页统计卡同构）＋ `theme-palette-guard`（图标色只取既有语义 token）＋ `hex-hardcode-guard`（`--tint` 由 CSS 派生，不写 hex）。
- **对应规范编号**：§一 原则 4（色彩克制 · 点缀色）；关联 SD-46（主题色层与功能色层并列）。
- **边界**：点缀色不承担状态语义——逾期 / 未读等状态仍由 `--status-warning-text` 等语义 token 与文字标签共同表达；以素净为主的页面不必强行补彩色，本判例只否定「把彩色一律判违规」的推论。深浅色由 `--tint` 混入 `--surface-card` 自动适配，不为暗色另写一套色值。
- **证据指针**：`docs/src/components/dashboard/stats.js`（`stat-icon-tint` ＋ `--tint` ＋ 同色数值）；`docs/src/components/governance/work-overview.js`（四数卡同构）；`docs/src/styles.css` 的 `.stat-icon-tint`；`server/test/ui-control-system-guard.test.mjs`（V1）；`server/test/ui-home-hero.test.mjs`（E7）；`.ctx/logs/2026-10-EXECUTION_LOG.md` 2026-10-28 Task 3。

## CASE-DESIGN-031 焦点修了两轮才查出「四套颜色 ＋ 全局 6px 光晕」

- **编号**：CASE-DESIGN-031
- **场景（真实发生）**：用户实报「聚焦时一黑一金」。第一轮只按现象改了输入框：清掉 3px 浅晕、把环切到主题色。第二轮全站扫描才查出根因不在输入框——全站同时存在四套焦点颜色（固定党徽金 `#FFD700`、党建红 `--primary-500`、深棕状态色、旧焦点令牌），另有一条全局规则在控件外侧补 `0 0 0 6px` 半透明光晕；用户看到的黑就是这圈光晕。本轮删掉两个旧令牌与 6px 光晕，全站收敛为一条 `outline: 2px solid var(--app-accent)`（offset 1px，`box-shadow: none`）。
- **AI 假设**：先修报错的那一个控件最快；颜色不一致只是个别地方漏了；把环写亮一点就能看见。
- **人类意图**：焦点外观在全站只有一种，颜色只有主题色一个来源；先穷尽所有来源（令牌定义、全局规则、局部 `:focus-visible`、内联样式），再动手，避免「修一处、冒一处」。
- **泛化规则**：① 焦点问题先做全站来源盘点，四类来源逐一列清后再改；② 局部 `:focus-visible` 只写 `outline` 而不钉 `box-shadow: none`，会与全局环叠成第二环——每条局部焦点规则必须同时清 `box-shadow`；③ 色板从十色合并为七色后，文档与帮助页未同步，出现「照着文档数颜色会数错」——口头的第二事实源也会出错，颜色数量以 `ACCENT_PALETTE` 单一源为准，文档与帮助页只引用、不另记。
- **对应规范编号**：SD-27（焦点单环）＋ SD-21（主题选择器恰 7 项）；几何与例外见 `DS_04_INTERACTION_AND_RESPONSIVE.md §5.7`。
- **守卫**：`ui-focus-ring::F1–F6`（旧令牌零残留 / 单条 outline / 七主题对比度 / 顶栏白环）＋ `ui-control-system-guard::FOCUS-1…5`（双环检测 ＋ 6px 光晕反例 ＋ 七主题 base 对白卡与深卡 ≥3:1）＋ `theme-palette-guard::T1/T3`（七主题、旧键退场）。
- **边界**：顶栏深红底是唯一不用主题色的例外（白环 11.44:1，见 §5.7）；About 页是独立冻结件，其焦点口径待支书点头后单独处理。
- **证据指针**：`docs/src/styles.css`（全局 `button/a/…:focus-visible` 与 `.input-flat:focus`）；`docs/help.html:58,160`；`server/test/ui-focus-ring.test.mjs`；`server/test/ui-control-system-guard.test.mjs`（FOCUS 组）；`.ctx/evidence/2026-10-28/focus-*.png`。

## CASE-DESIGN-032 判例修不完，原则才收敛

- **编号**：CASE-DESIGN-032
- **场景（真实发生）**：批次 518–520 连着三轮都在修焦点的分支——第一轮改输入框、第二轮改帮助页、第三轮补顶栏，每次都能把当屏修绿，下一屏又冒出新的组合。第四轮做全量来源盘点，才查出根因是同一个控件同时叠了两道以上信号：边框变色、outline 环、box-shadow 光晕、聚焦底色。另一边，一次机械批量插入 `import` 落进了函数体，`node --check` 按 CommonJS 解析退出码仍为 0，三批都没人发现；浏览器按 ESM 解析时整模块 SyntaxError，页签恒定报错。
- **结论**：这两类问题都不该靠逐条判例修。前者收敛为「一个控件只允许一个焦点信号，输入族只变边框、按钮与链接只出一圈 2px 实线且只由键盘触发」；后者收敛为「全量模块必须通过真正的 ESM 解析，解析口径不能拿 CommonJS 的 `node --check` 代替」。修完分支后再回头看，判例清单还在增长；原则一旦收敛，同类分支不再各自立条。
- **泛化规则**：① 同一轮里出现第三处同类分支，先停手做来源盘点，再决定改哪一层；② 原则必须能写成一条可机检的判据，并配一条反例证明它会红；③ 原则落地后，把分散的判例收编为指针，不再为每个分支新增判例；④ 判据的解析口径要与运行时一致（浏览器 ESM 不能用 Node 的 CommonJS 检查代替）。
- **守卫**：`ui-control-system-guard::FOCUS-1…5`（一个控件只允许一个焦点信号；输入族零 outline / 零 box-shadow；按钮族必有环；焦点色禁党徽金 / 党建红）＋ `esm-parse-guard::ESM1/ESM2`（全量真 ESM 解析；函数体内 import 反例）＋ `module-load::E5`（页签模块路径、ESM 解析、导出名三查）＋ `lf-bar-structure-guard::L1–L5`（筛选行只允许行容器）＋ `container-width-guard::C0–C5`（容器五档）＋ `about-freeze-guard::B1–B5`（冻结件内容基线）。
- **对应规范编号**：SD-27（P1 焦点单环）；P2–P7 的落点见 `DS_03_COMPONENTS.md §12.9` 与 `DS_04_INTERACTION_AND_RESPONSIVE.md §5.7`。
- **边界**：本条只讲「分支修不完时如何收敛原则」，不替代各条规范的具体判据；About 冻结件、顶栏深红底白环等已登记例外仍按各自条目执行。
- **证据指针**：`.ctx/evidence/2026-10-29/m3-selfcheck.json`（P1–P4 换场景读数 78/78）；`.ctx/evidence/2026-10-29/p5-injection.log`（ESM / module-load 注入判红）；`.ctx/evidence/2026-10-29/p6-injection.log`（About 副本反例）；`server/test/esm-parse-guard.test.mjs`；`server/test/ui-control-system-guard.test.mjs`；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 518–520。

---

## 数据域判例（data）

> 本区承载 `CASE-DATA-*`：判据是「数据真相」而非视觉，但因同源于设计系统评审、且需与 SD-48 双向指针，正文与 design 域同放本文件；总目录仍见 [CASES_INDEX.md](../../03_doc_system/CASES_INDEX.md)。

## CASE-DATA-001 mock 绕过 server 出现在界面，并在本机「假保存」

- **编号**：CASE-DATA-001
- **样本（真实发生）**：spec `restore-capsule-and-harden-data-truth` 取证——`getDataSource()==='api'` 时，`loadActivities / loadAttendanceRecords / loadInspectionRecords` 仍回退静态种子；`NoticeStore.init / SignupStore.init / seedTodos` 仍补种子并 `persist()`；`persist()` 对「快照 payload 未覆盖的集合」（`committeeBroadcasts` / `agendaVotes` / `memberChangeRequests`）直接 resolve。结果：生产空库会显示演示活动；改标注在界面上「保存成功」，清缓存重登后消失。
- **AI 假设**：本地有缓存就先显示、失败再回退种子，用户总能看到内容；`persist()` resolve 即代表这次写已完成；mock 只是「演示用的另一套数据」，不会进真实界面。
- **人类意图**：服务端是**唯一权威**；`api` 形态空库应显示空态，不得用演示数据填空；写成功必须有服务端证据（服务端行 / 快照请求被观察 / 语义端点 2xx），本地 resolve 不算成功。演示数据只允许在 mock 或显式 `SEED_FALLBACK` 下出现，且**不得写进服务器**。
- **泛化规则**：判据按四层分开——① 长期存储只允纯展示偏好；② 业务读缓存必带集合版本（`_versions` ＋ `savedAt`），缺版本 / 过期不得当权威；③ 业务写三选一可证，否则进 outbox 显示「未同步」；④ 真实数据轨道默认 `SEED_FALLBACK=false`，生产库含演示种子时拒绝启动（`ALLOW_DEMO_DATA=1` 才放行）。四层任一不满足即不得称「数据已走 server」。
- **守卫**：`write-truth-guard::A1–A4/B1–B5`（六个读口闸门、快照单一源、flush 分流、outbox 与语义端点）＋ `seed-contract-guard::C1–C10`（种子契约与 v12 结构）＋ `localstorage-key-guard::L4–L10`（四类键与版本校验）＋ `test-isolation-guard::I1–I4`（测试不留运行库）。
- **对应规范编号**：SD-48（缓存边界 / 写确认 / 演示窗口 / 测试残留分层）。
- **边界**：纯展示偏好（主题 / 字号 / 强调色 / 页签顺序）长期留浏览器不算越界；mock 形态与显式 `SEED_FALLBACK=1` 的演示仍可回退种子，但**不得写入服务器**；`committee_broadcasts` 为 v12 恒只读表，标注改走系统通知，不得新增写口。
- **证据指针**：`docs/src/data/cache-registry.js`（四类键）；`docs/src/services/activity/{activity,attendance,inspection,signup}.js` 与 `services/governance/{notice,todo}.js` 的 api 闸门；`docs/src/data/data-adapter.js` 的 flush 分流；`server/test/write-truth-guard.test.mjs` / `seed-contract-guard.test.mjs` / `localstorage-key-guard.test.mjs`；`content/04_web_design/data/DATA_SEED_CONTRACT.md`；`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 513。

---

## 附：批次 513 sample-diff 五列

> 只登记本批抽样暴露的「AI 假设 ↔ 人类意图」偏差；泛化规则已落 SD-47 / SD-48 与上两条判例，此处不重复规范条文。

| 样本（证据） | AI 假设 | 人类意图 | 偏差类型 | 泛化规则（守卫） |
|---|---|---|---|---|
| 分组胶囊「没恢复」：批次 512 已全宽可见、≥24px、有描边，但仍是中性灰 999px / 400 字重 | 改可见性＝恢复；颜色与圆角只是装饰 | 要回到 8–9 月的**主题色 soft 底 ＋ 3px 直角 ＋ 600 字重** | `definition_mismatch`（「恢复」定义被窄化为「可见」） | 可感知与视觉构成分开登记、同时把守；3px 是登记例外，不豁免主题色与字重（SD-47 / K3 ＋ V2） |
| 「删除测试用例」：运行库残留 `act-b31-*` / `att-b31-*` / `mk-b31-*` / `todo_seed_7` / 测试通知 / 测试议题 | 把测试数据当成测试套件的一部分，删残留＝删测试 | 要清**运行库残留**，保留 268 个自动化测试文件 | `scope_widening`（「测试数据」被扩成「测试」） | 测试套件与测试数据分层：外部写用临时库或 `finally` 清理，残留由 `test:clean --test-residue` 清（SD-48 / I1–I4） |
| 「四个月窗口」：7 月 25 场活动需进入 8–11 月窗口 | 按日期把窗口外的行 DELETE 掉最直接 | 要**重排事实 ＋ 重建运行库**，保留跨期实体与每种关键状态样本 | `tool_mismatch`（用删除代替重排＋重建） | 先备份 → 重排种子 → `rebuild-demo` 重建 → 替换库；不逐表按日期 DELETE（SD-48 / W1–W5） |
| 「缓存」：清缓存重登后标注消失；`persist()` 本地 resolve 曾报成功 | 本地缓存能显示就算可用；读缓存可当权威 | 要**服务端权威**：读缓存只是加速，写成功必须有服务端证据 | `priority_inversion`（把读缓存置于服务端之上） | 业务读缓存带 `_versions` ＋ `savedAt`；写三选一可证；失败进 outbox 显示「未同步」（SD-48 / L4–L10 ＋ A1–A4/B1–B5） |

---

## 迁移登记 A：2026-10-18 抽样判例（原 `DESIGN_SYSTEM.md` §4.22）

> 本节 2026-10-29 随设计系统拆编迁入，原文未改。规范效力见 `DS_03_COMPONENTS.md` §4.21 / §4.6 / §12.4 / §4.13 / §4.10。

### 4.22 2026-10-18 抽样判例（sample-diff-learning）

> 本轮按「支委会 / 待办 / 概况 / 选人 / 工作组进展」分层各抽 1 例，由支书做选择题校正。以下只记**偏差模式**与**可验证布尔条件**，不记逐页执行过程。

| # | AI 的默认假设 | 支书的真实意图 | 偏差类型 | 可验证布尔条件 |
|---|---|---|---|---|
| 1 | 间距是页面局部审美，差几像素可以就事论事 | 间距是组件族的档位，必须单一源；同屏出现第三种厚度就是「脏」 | `aesthetic_mismatch` | 新代码的间距值 ∈ {4, 8, 12, 16, 24}；同屏卡片厚度差 ≤ 1 档 |
| 2 | 功能多就要多放卡片、多写说明，信息才全 | 支委会 tab 只回答「支委是谁 / 开过什么会 / 下一场在哪」；长说明进帮助页 | `scope_widening` | tab 首屏只有「委员表 + 会议表 + 新建」三块；说明段 ≤ 1 行 |
| 3 | 待办按六类业务域折组最整齐 | 先看紧迫度，再看业务域；逾期就是逾期，不允许中英混杂 | `priority_inversion` | 组名 ∈ {逾期, 今日, 本周, 以后}；页面无 `Overdue` / `This week` 等展示词 |
| 4 | 每行姓名前加姓氏头像框更易识别 | 框很扎眼；姓名靠 14px/500 与次级 12px 拉层级，不靠色块 | `aesthetic_mismatch` | 选人面板无 `.person-picker-item-avatar`；行高 40px；选中态无边框 |
| 5 | 概况多卡并列、字段拆小卡，信息更全 | 结论 → 条线对比 → 待我处理；表格管对比，清单管行动 | `definition_mismatch` | 页面存在 `data-wo-layer="summary|lines|actions"`；无独立「汇报」卡 |
| 6 | 首页叫「专班进展」，数据只放专班即可 | 概念已统一为工作组，标题与内容必须同时含活动工作组、专班工作组 | `scope_narrowing` | 标题为「工作组进展」；有数据时两类组名同时可达；进度不用报名填充率 |

**沉淀规则**：同一类偏差在第 2 次出现时，必须升级为守卫或文档硬约束，不能只在本页修。

## 迁移登记 B：10 个抽样页乱象登记（原 `DESIGN_SYSTEM.md` §10.6）

> 本节 2026-10-29 随设计系统拆编迁入，原文未改。乱象判据见 `DS_05_MAP_AND_REFERENCE.md` §10.5。

### 10.6 10 个抽样页乱象登记（2026-10-19 · 分层抽样 10/68）

> 状态三态：**已修（本 spec）** / **已审（后续）** / **后续**。四页重点本轮已修，其余 6 页只登记模式。

| 页签 | 首屏第一眼 | 主对象 | 乱象 | 状态 |
|---|---|---|---|---|
| 支书 · 党小组 | 7 列表格 | 党小组清单 | 说明压在表前、7 列过宽、行内 4 个动作 | 已修（本 spec） |
| 支书 · 支委会 | 标题 + 两张表 | 支委会两张表 | 帮助注释在标题下、行内动作未分主次 | 已修（本 spec） |
| 支书 · 全局概况 | 阅读指令 + 结论带 | 结论带 + 待我处理 | 阅读指令行压在主体前、指标不可点、与待办重复 | 已修（本 spec） |
| 支书 · 待办 | 摘要 + 列表 | 我的待办列表 | 摘要与四档组头重复计数、待答复与未读各占一块 | 已修（本 spec） |
| 组织 · 概况 | 说明文字 | 工作概况 | 说明先于主对象、同一指标重复 | 已审（后续） |
| 宣传 · 任务 | 任务列表 | 任务清单 | 同屏两个等权主按钮 | 已审（后续） |
| 纪检 · 考勤 | 说明文字 | 考勤矩阵 | 说明前置、嵌套层级深 | 已审（后续） |
| 组长 · 本组活动 | 说明 + 入口 | 本组活动列表 | 说明前置、双入口等权 | 已审（后续） |
| 成员 · 活动动态 | 动态列表 | 活动动态 | 行内 4 个动作 | 已审（后续） |
| 成员 · 我的考察 | 说明文字 | 考察记录 | 说明先于主对象 | 已审（后续） |

## 迁移登记 C：本轮设计学习（原 `DESIGN_SYSTEM.md` §12.6）

> 本节 2026-10-29 随设计系统拆编迁入，原文未改。SD-1…SD-11 的规范内容见 `DS_03_COMPONENTS.md` §12.1–§12.5 与 §4.18 / §4.19 / §4.27。

### 12.6 本轮设计学习（可检验规则）

| ID | 规则（Boolean） |
|---|---|
| SD-1 | IF 文本/日期/下拉/多行控件 THEN class ∈ {input-flat, input-flat-sm} 且无 `text-sm`/`rounded`/独立 `border` |
| SD-2 | IF 元素有可见边框 THEN `border-color` ∈ token 变量集合，不得为 `currentColor` |
| SD-3 | IF 控件 THEN 8px；IF 卡片/指标带 THEN 12px；IF 胶囊 THEN 999px（**唯一登记例外**：`.tab-group-label` 分组胶囊＝3px 直角，2026-10-26 Task 1 恢复 8–9 月准绳，细则见 SD-47 / SD-50）；不得出现 4/6px |
| SD-4 | IF 元素是 `summary` THEN UA marker 已移除且恰有一个 chevron |
| SD-5 | IF 页头/空态/弹窗主行动 THEN 实底主题色；IF 卡片内 THEN 浅主题底；IF 工具位 THEN 白底描边；IF 行内辅助 THEN 无框 |
| SD-6 | IF 按钮用浅主题底 THEN 背景 ≠ `--neutral-0` 且描边为同色系 |
| SD-7 | IF 显示成功 THEN 该动作自己的写已 resolve；失败不得被报成成功 |
| SD-8 | IF 弹窗提交中 THEN Esc/遮罩/×/取消均不关闭且 `aria-busy=true` |
| SD-9 | IF 页签有 groupLabel THEN 桌面端渲染非空文本（含首组） |
| SD-10 | IF 正文/元信息 THEN font-size ∈ {12,13,14,16}px；today/todo 中 10/11px 计数为 0 |
| SD-11 | IF 删除一句文案 THEN 该句不含唯一动作/状态/风险信息；破坏性确认与权限原因不得删 |

