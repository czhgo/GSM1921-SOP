# 第五轮【脏乱繁】平行审查 · B 路：design-with-taste

- 日期：2026-10-21
- 范围：7 个工作台 / 62 个 tab（只读；未改任何源文件，未提交 git，未更新 tasks.md）
- 唯一加载技能：`design-with-taste`（Simplicity / Fluidity / Delight）
- 独立性声明：未读取本轮另外两路（web-design-guidelines / frontend-design）报告；本报告只依据源码、样式与既有截图/量测证据。

## 0. 审查口径

### 0.1 62 个 tab 的枚举基线（以能力注册声明为准）

| 工作台 | tab 数 | 声明源 |
| --- | --- | --- |
| 支书 | 12 | `docs/src/capabilities/secretary-workspace.js:22-91` |
| 组织委员 | 10 | `docs/src/capabilities/org-workspace.js:30-91` |
| 纪检委员 | 8 | `docs/src/capabilities/disc-workspace.js:24-63` |
| 组长 | 10 | `docs/src/capabilities/leader-workspace.js:28-78` |
| 宣传委员 | 8 | `docs/src/capabilities/prop-workspace.js:22-69` |
| 成员（visitor） | 11 | `docs/src/capabilities/visitor-workspace.js:21-72` |
| 党委 | 3 | `docs/src/capabilities/party-committee-workspace.js:16-34` |
| 合计 | **62** | — |

### 0.2 三条硬约束（影响判级）

1. 这是**党务/组织治理**产品，不是消费级 App。「庆祝式 delight」（confetti、音效、彩带）在本语境下大概率是失礼，不作为减分项；本报告把 Delight 折算为**「结果落在发生地」「数值/状态变化可跟读」「空态有下一步」**三项可迁移的克制性愉悦。
2. 该仓已有极重的**文案与结构守卫**（copy-* / button-system / hex-hardcode / empty-template 等）。任何修复必须复用既有单一源（`empty-state.js` / `modal.js` / `page-frame.js` / `list-filter.js`），不得新造第二套。
3. `.ctx/evidence/2026-10-19/u10-viewport-metrics.json` 的 `tabCount`（12/11/9/9/10/11/5）早于 2026-10-20 IA 批次，**仅用于「页签溢出」结论**，不用于计数。

### 0.3 计数口径

报告中的"处/文件数"均为 `Grep` 命中数（**含定义行与注释行**，因此是量级而非精确调用数）；"tab 数"以能力注册声明为准。所有结构判断都已回到具体 `file:line` 复核。

### 0.4 严重度定义

- **P0**：阻断完成，或造成错误决策/数据误解。
- **P1**：系统性体验失败，跨 ≥5 个 tab 重复出现，用户每日常态可感知。
- **P2**：局部体验失败，或模式已成立但影响面有限。
- **P3**：一致性/工艺瑕疵，不改变可完成性。

---

## 1. 结论摘要

1. **本路未发现 P0。** 62 个 tab 的任务完成路径均可走通；功能区隔（哪个 tab 做什么）在能力注册与页签命名层面是清楚的。**有一项建议主代理复核是否升 P0**：数据源局部读取失败一律 `console.warn` 静默，用户看到的是「空」而不是「坏」（见 F-18），这在治理场景可能诱导错误判断。
2. **最大的问题不是"丑"，而是"没有运动"与"反馈不在发生地"。** 62 个 tab 的内容切换全部是 `innerHTML` 级替换（0 过渡）；全仓 124 处 `hidden` 瞬时切换、171 处整页重渲染；约 600+ 处 `showToast` 调用承担了几乎全部结果反馈——包括「上报党委」「成员流入/流出登记」「批量确认考勤」这类不可轻率的动作。这与 Fluidity 的第一条（"No instant show/hide"）和第二原则（"loading/结果要走向用户要看的地方"）正面冲突。
3. **首屏层级未按自己定的设计系统落地。** `page-frame.js` 已明确"每个 tab 的页面标题用 H2"，但只有支委会真正用了 `renderTabHeader`；党委 3 台是"分区题当页题"；6 台「今天」自带 18px 的 H2；**其余约 52 个 tab 首屏直接以 16px 卡头开场**，页面级与卡级同档，层级塌陷（且页题已有 18/20 两档）。顶栏同时并列 3 枚同权重动作，主 CTA「写入活动」与「我的档案」视觉等价。
4. **同类动作有三种披露策略，互相打脸。** 「写一张表单」：通知发布是全展开常驻；宣传任务登记是 `<details>` 折叠；上报党委是按钮展开。空态则一致地"死胡同"（46 处 `emptyMessage` 中仅 3 处给下一步，其中 tab 内只有 1 处）。
5. **已有可复制的"样板页"**：`committee-meeting-tab.js:238-253`（H2 + 说明 + 单一主 CTA + 两卡 + 帮助注脚）、`todo-tab-shell.js` 的四数带 + 四档列表 + 折叠收件箱、`list-filter` 的"≤8 行不出检索条"。修复应以"把样板铺开"为主，而不是重新发明。

**一句话**：这是一个"信息架构已经想清楚、但交互语言还没长出来"的产品。下一步的收益不在加功能，而在**统一"出现/消失/完成"的语法**。

---

## 2. 发现表

> 证据格式：`文件:行`；截图/量测另注。类型：**模式**＝跨台重复的结构性问题；**个案**＝单点。

### 2.1 Simplicity（渐进披露 / 首屏层级 / 动作位置）

| # | 类型 | 严重度 | 发现 | 证据 | 影响面 |
| --- | --- | --- | --- | --- | --- |
| F-01 | 模式 | **P1** | **页面级标题三档并存、约 52/62 缺页题**：支委会用 `renderTabHeader`（20px）；党委 3 台用 `renderSectionHeader` 出首分区 H2（20px，非页题）；6 台「今天」自带 H2 但用 `text-lg`（18px）；其余约 52 个首屏直接以 16px 卡头开场，"页题=卡头"。设计系统写的"H1=顶栏品牌，每个 tab 页面标题用 H2"未落地，且已落地的页题还有 18/20 两档。 | 规则 `components/shell/page-frame.js:22-24` + `styles.css:414-420`（20px）；页题采用点 `secretary/committee-meeting-tab.js:239`；党委分区题 `party-committee/{dispatch:87,branches:120,review:77}-tab.js`；18px 例 `today/today-tab.js:657`；16px 反例 `prop/tasks-tab.js:64`（页题）与 `:69/76`（卡头）同档、`disc/review-tab.js:234/256/263`、`leader/members-tab.js:150/157`、`todo-tab-shell.js:560` | ~52 tab |
| F-02 | 模式 | **P1** | **顶栏动作全部同权重**：角色徽标 +「我的档案」+「写入活动」+「一键汇报」+ 铃铛同一 `.header-action-btn` 外观；本台主 CTA 用 `btn-ghost`，与「我的档案」「一键汇报」不可区分。违反"One primary action per view"。 | `components/shell/header.js:278-284`；`styles.css:1510-1523`；`entries/workspace/ws-secretary-entry.js:84`（`btn-ghost header-action-btn`）；截图 `.ctx/evidence/2026-10-19/part-a-workbench-1440.png`（右上四枚等权胶囊） | 7 台通用，支书台最重 |
| F-03 | 模式 | **P1** | **"写表单"三种披露策略**：通知发布 6+ 字段全展开常驻首屏；宣传任务登记 `<details>` 折叠；上报党委按钮展开。同类动作三种语法，用户无法形成预期。 | `secretary/notification-tab.js:24-39` + `:69-95`（常驻）；`prop/tasks-tab.js:188-189`（折叠）；`secretary/report-up-tab.js:47-51`（按钮展开） | 通知/宣传/上报 + 各写表单 |
| F-04 | 模式 | **P1** | **空态基本是死胡同**：46 处 `emptyMessage`，只有极少数给"下一步"（tab 内仅 `visitor/projects-tab` 1 处；另 `leader/my-tasks-section`、`activity-materials` 页各 1 处）；其余一律"暂无 X"纯灰字。 | `prop/kanban-tab.js:69-70`；`org/thought-review-tab.js:150,169`；`prop/tasks-tab.js:71,78,87`；`disc/attendance-tab.js:1340`；对照正例 `visitor/projects-tab.js:216-217`、`leader/my-tasks-section.js:51-53`；组件能力 `components/ui/empty-state.js:19-23`（支持 action 但少用） | 30 个文件 / 46 处 |
| F-05 | 个案 | **P2** | **档案归档首屏动作悬空**：页面以折叠的「周期归档报送」条开头 → 紧接着一枚孤立的右对齐「上传材料」（无页面标题、无节标题、无待办摘要）→ 三个可能为空的区块。用户第一眼读不出"这页现在该干什么"。 | `prop/archive-tab.js:84`（周报槽在最前）、`:86-91`（孤立按钮）、`:428-439`（折叠条实现）、`:93-99`（三个区块） | 宣传台 1 tab |
| F-06 | 个案 | **P2** | **纪检考勤首屏两套互斥轴叠放**：一级分段「考勤/补课」紧邻二级视图「确认与录入/数据查看」，下面再叠队列 / 申诉 / 会议录入三卡，且队列卡头下压着两行 12px 说明。首屏先要解析两组同级按钮。 | `disc/attendance-tab.js:190-195`（两组分段）、`:632-645`（队列卡与 2 行说明） | 纪检台核心 tab |
| F-07 | 个案 | **P2** | **支书 12 tab 在桌面仍横向溢出**，且「知情查看」组标签与其内页签同名，读作"知情查看 知情查看"。 | 截图 `part-a-workbench-1440.png`（右侧圆形箭头可见）；量测 `u10-viewport-metrics.json`（secretary `tabScrollWidth:1267` / `tabClientWidth:704@768`、`960@1024`）；`secretary-workspace.js:82`（work-map 组标签）与 `:88`（tf-view 的 label 与 groupLabel 均为「知情查看」） | 支书/组织/组长/成员台 |
| F-08 | 模式 | **P2** | **原生 `confirm/prompt` 与自有模态并存（45 处）**：项目已有带焦点接管、inert、取消语义的 `modal.js`，但大量"确认/填原因"仍走浏览器原生框——不可动画、不可品牌化、移动端样式不可控。 | `prop/kanban-tab.js:91`；`org/taskforce-tab.js:289,313,315,336,842`；`secretary/committee-meeting-tab.js:189`；`prop/archive-tab.js:243,318`；`disc/inspection-tab.js:269,287`；`components/sections/references.js:924-991` | 45 处 / 20+ 文件 |

### 2.2 Fluidity（过渡 / 反馈 / 统一插值）

| # | 类型 | 严重度 | 发现 | 证据 | 影响面 |
| --- | --- | --- | --- | --- | --- |
| F-09 | 模式 | **P1** | **tab 切换零过渡**：`_safeRender` 直接 `tab.render(ctx)`，各 tab 自己 `container.innerHTML=…`；切换前只有 `opacity:0.45 + pointerEvents:none`（且该属性未声明 transition，也是硬切）。全仓没有 tab 内容入场关键帧，只有 modal 用的 `fadeIn/slideUp`。 | `components/shell/tab-bar.js:392`（`Promise.resolve(tab.render(ctx))`）、`:307-326`（`_beginTabLoading` 置灰，无 transition）、`:487-493`（`container.innerHTML = _tabBar.html` 后 `activate`）；`styles.css:3816-3824`（仅 modal 关键帧） | 62/62 tab |
| F-10 | 模式 | **P1** | **瞬时 show/hide 124 处 / 34 文件**。典型：意见反馈"列表↔详情"用同容器互斥切换，还靠 `scrollDetailIntoView` 手工补偿空间错位；自定义下拉每次展开硬切。 | `secretary/feedback-tab.js:72`（detail 默认 hidden）、`:307-308`（列表 add hidden / 详情 remove hidden）、`:319-320`（反向）；`components/ui/custom-select.js:258,317`（`cs-menu hidden`）；`secretary/report-up-tab.js:51,56`；`prop/archive-tab.js:143` | 34 文件 |
| F-11 | 模式 | **P1** | **整页重渲染 171 处 / 53 文件**：提交一行、批准/打回一条、改一个筛选都会重建整个 tab，导致滚动位置、焦点、展开态（除少数 `dataset` 守卫）丢失；页面视觉上"闪一下"。 | `disc/review-tab.js:485,497`（打回/确认后整页重建）、`:405`（沉淀后）；`org/activity-calendar-tab.js:206`（支部筛选 onChange → 全局 `setState({})` 重渲染）；`components/feedback/issue-dispatch-view.js:73,125`（提交一条汇报即重建整 tab）；`party-committee/review-tab.js:99,142`（切子视图/批准后） | 53 文件 |
| F-12 | 模式 | **P2** | **时序语言三套 / 缺"黄金曲线"**：工作台全局 token 是 `ease-out` 150/200/250ms；help 页自带 `cubic-bezier(0.4,0,0.2,1)`；唯一使用 golden curve `cubic-bezier(0.16,1,0.3,1)` 的是**介绍页 about.css**。工作台（62 tab 的主战场）恰恰没用它。 | `styles.css:138-140`；`styles.css:3237`（help 例外）；`about.css:54-55`（golden curve 只在介绍页）；全仓 `cubic-bezier` 仅 4 处 / 2 文件 | 全局 |
| F-13 | 个案 | **P2** | **模态"凭空弹出"**：遮罩 `fadeIn .15s`，面板 `slideUp .2s`（translateY 16px）居中弹出，不从触发器生长/不从边缘进入；叠层（本位 nudge 压在表单窗上）宽度 460 vs 480，**几乎等高**，没有层次差。 | `components/ui/modal.js:160,171`；`styles.css:3821-3824`；`modal.js:34`（`md:480px`）vs `:538`（`width:'460px'`） | 全站模态 |
| F-14 | 个案 | **P2** | **数值不跟手**：指标带/统计条是字符串一次性插值，变化即硬切；`tabular-nums` 只保证等宽，不提供"数数"过渡。 | `components/governance/work-overview.js:455`（`<span class="metric-band__value">`）；`secretary/report-up-tab.js:70-79`；`disc/attendance-tab.js:636-639`；`components/record/todo-tab-shell.js:159-174` | 6 台概况 + 全部统计条 |
| F-15 | 模式 | **P2** | **骨架与实际布局不匹配**：统一骨架恒为"一行标题 + 5 条等高 40px 块"，但首屏可能是日历（3/5+2/5 双栏）、看板（两桶）、宽表（人×活动矩阵）——骨架在撒谎。 | `components/shell/tab-bar.js:63-92`；`components/shell/workspace-shell.js:229`；对照反例 `components/governance/overview-dispatch-bar.js:25-42`（按概况形状给 3 张卡，稍好） | 62 tab 首帧 / 切 tab |

### 2.3 Delight（反馈落点 / 完成感 / 空错态工艺）

| # | 类型 | 严重度 | 发现 | 证据 | 影响面 |
| --- | --- | --- | --- | --- | --- |
| F-16 | 模式 | **P1** | **toast 承担结果反馈（`showToast(` 命中 639 处 / 78 文件，含定义与注释）**：上报党委、成员流入/流出、批量确认考勤、打回/关闭申诉，全部以右下角 2.5s 自动消失的 toast 收尾；成功文案还要等落盘（最长 15s）。结果不在发生地。 | `core/base/utils.js:87-101`（成功等待/超时）、`:104-167`（右下固定 + 2.5s 自动消失）；`secretary/report-up-tab.js:128`；`org/member-flow-tab.js:350,371,447`；`disc/attendance-tab.js:228,261,273` | 78 文件 |
| F-17 | 模式 | **P2** | **完成动作没有"收束"**：批量确认后直接整页重渲染，被确认的行瞬间消失，只剩一条 toast；没有逐行离场、没有原地回执。单条确认/打回同样是"toast + 整页重建"。 | `disc/attendance-tab.js:222-230`（toast → `renderContent`）；`disc/review-tab.js:484-485,496-497`（打回/确认 → 整页重建） | 批处理型 tab（考勤/复盘/成员流动） |
| F-18 | 模式 | **P2（建议主代理复核升 P0）** | **局部数据失败一律静默**：日历/今天/组织日历的多个数据源 catch 后仅 `console.warn`，界面呈"空的"而非"坏的"；用户无法区分"无数据"与"取数失败"，在治理场景会误判。全 tab 级失败只有一张通用错误卡。 | `secretary/calendar-tab.js:1853-1863`（6 个数据源连续静默）、`:1219,1820,1849`；`entries/tabs/today/today-tab.js:341,542`；`org/activity-calendar-tab.js:168`；错误卡 `tab-bar.js:351-359` | 支书/组织/今天等 |
| F-19 | 个案 | **P3** | **空态文案密度两极化**：有的给"事实 + 下一步"（好），有的只有"暂无…"，有的甚至是"请先登录"死胡同。 | 正例 `leader/members-tab.js:140-142`；反例 `org/my-dispatch-tab.js:14`（请先登录）、`visitor/thought-report-tab.js:86` | 全站 |
| F-20 | 模式 | **P3** | **"模板化/事后补丁"痕迹**：六台「工作概况」是 6 个几乎逐字相同的薄壳；纪检台仍用 `MutationObserver + 文本正则` 把"条线缺口"行升级成按钮——去向不是设计出来的，而是渲染后补的（结构一变即静默失效）。 | `entries/tabs/{org,disc,leader,prop,visitor,secretary}/overview-tab.js`（薄壳同构）；`disc/overview-tab.js:34-55,75-81`；对照结构化正例 `components/governance/work-overview.js:164,694-708`（`gapTab` 直接渲染为缺口入口，不靠观察器补） | 6 台概况 |
| F-21 | 模式 | **P3** | **动作/悬停"词汇"漂移**：卡片悬停有 `gray-50` 与 `gray-200` 两档；「导出 CSV」这种动作误用 `btn-tab`（页签族）；「创建活动」用 `btn-md` + 内联色而非动作族。 | `leader/members-tab.js:102` vs `prop/kanban-tab.js:136`；`prop/tasks-tab.js:65`；`leader/write-tab.js:188` | 多 tab |
| F-22 | 正向 | — | **可直接复用的样板**（建议作为修复模板）：①支委会页头+单 CTA；②待办壳的四数带+四档列表+折叠收件箱；③`<details>` 折叠（宣传任务/归档展示）；④`list-filter` 的"≤8 行不出检索条"、空态接 `empty-state`。 | `secretary/committee-meeting-tab.js:238-253`；`components/record/todo-tab-shell.js:6-19,159-174`；`prop/tasks-tab.js:84,188`；`components/ui/list-filter.js:23-24,55-57` | — |

---

## 3. 模式归纳（8 条，按"是否值得先动机制"排序）

### P-A｜"没有运动的产品"（Fluidity 的系统性缺失）
F-09 / F-10 / F-11 / F-12 / F-13 / F-15 是同一根因的六个面：**所有状态变化都收敛为 `innerHTML` 或 `hidden` 的瞬时替换**，唯一有动画的组件是 modal（且只淡入）。因此：
- tab 之间没有空间关系（不知道"从哪来、到哪去"）；
- 列表↔详情没有层级关系（`feedback-tab.js:307-320` 是同容器互斥，最坏的一种）；
- 骨架形状撒谎，反而放大了替换时的突兀感。

**这一条不修，后面所有细节修复都会被"闪一下"吃掉。**

### P-B｜"反馈外置"（toast 当作万能回执）
F-16 / F-17 / F-19：639 处 toast 说明团队已把"结果提示"抽象成一句话 + 一个右下角气泡。问题不在 toast 本身，而在于**重要结果没有留下任何可回看的就地痕迹**（除了列表里新增的一行）。对"上报党委 / 成员流动"这类动作，用户需要的是"这一条现在到哪一步了"，而不是 2.5 秒后消失的"已提交"。

### P-C｜"页面骨架没有落地"（首屏层级塌陷 + 动作悬空）
F-01 / F-02 / F-05 / F-07：设计系统已经把 H1/H2/H3 与"一页一主 CTA"写清楚（`page-frame.js`），但只有 10 个 tab 有页题（其中 6 个还是 18px 的自带 H2），其余约 52 个 tab 的"页"是隐形的，首屏由卡片拼成，动作按钮漂浮在右上角。叠加顶栏 3 枚等权动作，用户在首屏**读不出"这一页的主语"**。

### P-D｜"披露策略各自为政"
F-03 / F-04 / F-06 / F-08：同样是"写表单"，折叠/展开/常驻三种；同样是"确认"，自有模态与原生 `confirm` 两套；同样是"空"，有的给下一步有的不给。这不是审美差异，而是**没有一份"交互形态选择表"**导致每个开发者就事论事。

### P-E｜"空与错的二值化"
F-18 / F-19 / F-04：空态被当成"没有数据时的占位"，没有被当成"第一次使用的引导"；错误态被压缩成"整页失败卡"或"静默 console"，中间态（局部失败、部分加载）缺失。最危险的是"取数失败 → 看起来像空"。

### P-F｜"动效/数值/控件的工艺层未统一"
F-12 / F-14 / F-21：缓动三套（工作台 ease-out / help / 介绍页 golden curve）、数值硬切、动作族漂移。这些单看都是 P2/P3，但它们是"产品是否被人认真对待"的直觉来源（skill 的 "every pixel looks placed by someone who cares"）。

### P-G｜"样板已经存在，但没有被复制"
F-22 与 F-20 对照：`committee-meeting` 已经证明"H2 + 一句说明 + 单一主 CTA + 两卡 + 帮助注脚"这套语法可行且好看；`todo-tab-shell` 已经证明"四数带 + 四档列表 + 折叠收件箱"能压住信息量。问题不是"不会做"，而是**没有把样板变成默认**。

### P-H｜"模板化 UI"的判定
严格说，本仓的"重复"多数是**同构的业务面**（5 台我的处置共用 `issue-dispatch-view`、6 台待办共用 `todo-tab-shell`、6 台概况共用 `work-overview`），属于正确的单一源复用，**不算无意图的模板化**。真正带"模板味"的是：
- 6 个 overview 薄壳 + 纪检台的 `MutationObserver` 补丁（F-20）——结构同构但能力靠事后补；
- 所有 tab 共用同一张"5 条灰条"骨架（F-15）——与内容无关的通用占位；
- 指标条/统计条一律"数字 + 灰标签"（F-14）——没有根据角色/紧迫度做选择性强调。

---

## 4. 建议修复顺序（按"机制先行 → 结构 → 反馈 → 工艺"）

> 本节只给建议，不改代码。每批都建议先落**单一源 + 守卫**，再铺页面，避免第 N 个 tab 又写出第四种语法。

### 第 0 批｜机制（1 个组件 + 2 个 token，收益覆盖 62 tab）
1. **新增"内容切换"原语**（建议 `components/ui/view-transition.js` 或收敛进 `tab-bar`）：
   - tab 切换：旧内容 120–150ms 淡出（`ease-in`）→ 新内容 280–320ms 淡入 + 8–12px 位移（`cubic-bezier(0.16,1,0.3,1)`）；方向按"页签左右顺序"决定位移方向；
   - 同容器互斥（列表↔详情）：改为"详情从行位置展开/滑入"（`feedback-tab`、`mydispatch-detail`、`report-up` 表单三处先试点）；
   - 尊重 `prefers-reduced-motion`（全局兜底已存在，`styles.css:3833-3842`，无需另写）。
2. **统一缓动 token**：把 `--transition-*` 换成 golden curve（进入 `cubic-bezier(0.16,1,0.3,1)` / 离开 `cubic-bezier(0.4,0,1,1)`），help 页的 `--help-ease` 并入同一套（`styles.css:138-140,3237`）。
3. **给"局部失败"一个中间态**：`list-filter` / 各 tab 的 catch 统一走一个 `inlineErrorHtml(scope, retry)`（复用 `empty-state` 的排版），至少让"取数失败"与"没有数据"在视觉上不同（F-18）。**建议此条由主代理评估是否按 P0 处理。**

### 第 1 批｜结构（首屏能不能读懂）
4. **H2 铺开并统一字号档**：把 `renderTabHeader` 铺到缺页题的约 52 个 tab；页题统一 20px / 说明 12–13px；把「今天」的 18px 自带 H2 与党委"分区题当页题"一并归并，卡头降到 14–16px，杜绝"页题=卡头"（F-01）。可先做使用频次最高的 12 个：今天 / 待办 / 工作概况 ×6 / 我的处置 ×5。
5. **顶栏主 CTA 收敛**：`.header-actions` 只保留 1 枚实心/描边强调的主 CTA（本台写动作），其余降为图标或次级；若「写入活动」确为支书台主 CTA，应给它唯一的强调外观（F-02）。
6. **导航溢出治理**：支书台把"我的职责"6 枚按对象收成 3 枚（活动 / 会议 / 成员），或引入"更多"折叠；同时修掉「知情查看 知情查看」叠词（F-07）。
7. **披露语法统一**：制定一张"交互形态选择表"——生成类表单一律 `details` 折叠或按钮展开（禁止常驻），确认/填理由一律 `openModal`（禁止原生 `confirm/prompt`），空态一律"事实 + 一个下一步"（F-03/F-04/F-08）。

### 第 2 批｜反馈（结果回到发生地）
8. **关键 8 个动作就地回执**：上报党委、成员流入/流出、批量确认考勤、打回申诉、归档、发布通知、提交复盘、确认交接——在这些动作的容器内留一行"已完成 + 时间 + 下一步"，toast 只作辅助（F-16/F-17）。
9. **完成动效克制化**：被确认的行 200ms 收拢离场，计数（待确认 N）同步递减并做 400–600ms 数值插值；不做礼花（语境不合）（F-14/F-17）。
10. **数值插值铺到指标带**：`metric-band` / 统计条统一走一个 `animatedNumber`（可复用 `tabular-nums`，避免布局跳动）。

### 第 3 批｜工艺（"有人认真对待"的直觉）
11. **骨架按内容塑形**：至少三型——日历型（双栏 grid）、列表型（行高 44–56px，条数按视口）、表格式（表头 + 行）；切 tab 时不再统一 5 条灰条（F-15）。
12. **动作族与悬停归并**：`btn-tab` 只做页签；动作统一 `btn-accent / btn-accent-soft / btn-outline / btn-ghost`；卡片悬停统一一档（建议 `gray-50`）；修掉 `tasks-tab.js:65`、`write-tab.js:188`（F-21）。
13. **空态与错误态巡检**：把 46 处 `emptyMessage` 过一遍，凡"用户在此处本来可以做一件事"的，补一个出口；"请先登录"改为可跳登录的可读卡（F-04/F-19）。

### 验收建议（供主代理落 spec 时参考）
- 每个修复批次配一条**真机探针**：录屏 0.5x 回放，检查"是否有元素瞬移"；页面切换必须能"跟着元素走"。
- 新增一条守卫：`tab` 内容切换必须经统一原语（禁止裸 `container.innerHTML` 首屏替换）；空态必须经 `empty-state` 且带动作或显式 `no-action` 理由。
- 第 0 批完成后先做 3 个 tab 的样板回放（今天 / 我的处置 / 考勤管理），确认"运动语法"成立后再铺 62。

---

## 5. 附：本路与其他两路可能的交界（供汇总时对齐，未读对方报告）

1. **首屏密度**：F-01/F-06 与"布局/间距"视角高度重合，建议合并为一条"首屏层级"共识。
2. **空态**：F-04 与"文案"视角重合；本路的判据是"有没有下一步"，文案视角可能是"句子是否像人话"，可互补。
3. **原生 confirm**：F-08 可能被另两路归为"一致性"或"可用性"；本路判据是"不可动画 + 不可控样式"，属 Fluidity。
4. **可能的真分歧**：Delight 是否应当"更热闹"。本路立场：本产品适用"克制性愉悦"（数值跟手、结果落点、完成收束），不建议引入庆祝式动效；若另两路主张更强表达，请主代理裁定。

