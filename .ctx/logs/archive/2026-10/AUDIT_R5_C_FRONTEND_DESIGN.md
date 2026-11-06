# AUDIT R5-C · 前端设计（只读平行审查）

> 仓库：`d:\GitHub\GSM1921-SOP`　审查日期：2026-10-21　审查路：R5-C（只读）
> 范围：7 个工作台共 **62 个 tab**（`secretary` 12 / `org` 10 / `prop` 8 / `disc` 8 / `leader` 10 / `visitor` 11 / `party-committee` 3）
> 方法：静态通读 7 份能力注册 + 62 个 tab 声明及主要渲染实现；真机登录 7 台在 1440×900 / 390×844 下逐 tab 渲染，量测字号、卡片数、溢出、页签几何并截图。
> 纪律：未修改任何源文件、未提交 git、未更新 tasks.md、未读取本路之外的两份 R5 报告。

---

## 一、结论摘要

**总体判断：桌面端「能读、能用」，但视觉系统在 62 个 tab 之间没有真正落地；问题集中在「页签条、页面标题、窄屏表格、字号令牌、色彩语义」五处，呈模式化复现，不是零散手滑。**

- **P0：0 条。** 没有阻断性缺陷；390px 下全站无横向页面溢出（`document.scrollWidth == innerWidth`，7 台实测）。
- **P1：7 条模式。** 页签分组胶囊吃宽度（1440 就有两台末页签被藏；390 只剩 3 个 tab）、页面标题层级缺失（**47/62 无 H2、17/62 连 H3 都没有**）、窄屏宽表未转卡（390 下人才库/考察表被压成竖条）、字号双标（10px 令牌与 12px 工具类并存）、金色语义超载、金色派生文字对比度不足（3.89–4.46）、无卡无标题的空壳页。
- **P2：13 条，P3：3 条（合计 23 条）。** 主要是子导航四套语法、行内动作/状态列噪声、矩阵列头截断、重复与自明文案、密度两极。
- 值得保留的正确做法：`今天` 页「单一轴 + 3px 紧迫度色条」的信息自陈、懒加载骨架占位、统一检索引擎的分页、已 opt-in 的卡式行（支委会表 390px 实测 `thead` 隐藏且每格有 `data-label`）、动效总体克制（全 tab 仅 2 处 `animate-*`、0 处渐变/缩放）。

**如果只修三件事**：① 页签条去掉分组胶囊（或只在宽屏保留为竖线）；② 每个 tab 补且只补一个 H2；③ 所有 ≥5 列的表格在 ≤640px opt-in 卡式行。这三件能消掉本轮约 60% 的「乱」。

---

## 二、实测底账（7 台 62 页签）

| 工作台 | 页签数 | 分组胶囊 | 1440 页签条（scrollWidth / clientWidth） | 1440 被藏页签 | 390 可见 / 总数 |
|---|---:|---:|---|---|---:|
| 支书 `secretary` | 12 | 4（工作台/我的职责/知情查看/制度与答复） | **1267 / 1152** | 反馈管理 | 3 / 12 |
| 组织 `org` | 10 | 3（工作台/制度与答复/我的职责） | 1064 / 1064 | — | 3 / 10（条带仅 270px，另有「发布招募」占位） |
| 宣传 `prop` | 8 | 3 | 1152 / 1152 | — | 3 / 8 |
| 纪检 `disc` | 8 | 3 | 1152 / 1152 | — | 3 / 8 |
| 组长 `leader` | 10 | 4（工作台/制度与答复/我的职责/知情查看） | 1152 / 1152 | — | 3 / 10 |
| 成员 `visitor` | 11 | 4（工作台/制度与答复/我的职责/知情查看） | **1203 / 1152** | 专班动态 | 3 / 11 |
| 党委 `party-committee` | 3 | 1（党委治理） | 1280 / 1280 | — | 3 / 3 |
| **合计** | **62** | **22** | — | 2 | 390 普遍仅 3 个可见 |

其它底账：

- **标题层级**：15/62 有 H2（今天×6、概况×6、支委会、支部上报、支部管理）；47/62 无 H2；**17/62 连 H2/H3 都没有**（我的处置×5、活动动态、项目分工、考勤概况、思想汇报、我的考察、项目看板、档案归档、党小组、上报党委、专班管理、组员进展、知情查看、专班动态）。
- **字号**：Tab 内容区 DOM 实测同时出现 11 / 12 / 13 / 14 / 16 / 18 / 20 / 26px；全仓 `text-[11px]` **315 处**、`text-xs`（12px）**1630 处**，而 `--text-xs` 令牌值为 **10px**。
- **卡片**：`card … p-5` 39 处、`card … p-4` 29 处；另有 5 个「我的处置」用裸 `rounded-xl bg-white p-3`；**10 个 tab 实测 0 张 `.card`**。
- **表格**：13 个直接 `renderFilteredList({ table: {…} })` 配置中仅 1 个（成员流动）开 `responsive: true`；支委会两表经 `renderDataTable` 另行 opt-in；其余 **11 处引擎表 + 2 处手写业务表**（党委支部目录、成员范围表）在 ≤640px 仍是表格。
- **动效**：tab 目录下 `animate-*` 2 处（骨架 pulse、loading spin）、`transition-all` 7 处、`hover:shadow* / hover:-translate` 9 处、`bg-gradient` 0 处、`active:scale` 0 处。

---

## 三、发现表

> 每条均标注「模式 / 个案」与严重度；证据优先给 `file:line`，并附本轮真机截图（`.ctx/evidence/2026-10-21/R5C/`）。

### P1（7 条）

| ID | 类型 | 位置（file:line / 证据） | 现象与判据 | 最小修复建议 |
|---|---|---|---|---|
| **C-01** | 模式 | `docs/src/components/shell/tab-bar.js:229-242`、`:249`、`:270-275`；`styles.css:2053-2096`；截图 `secretary-1440.png`、`visitor-1440.png`、`secretary-390.png`、`org-390.png` | **分组胶囊是第二套导航，和页签抢同一行。** 22 枚胶囊合计 258px（secretary/visitor，占 1152 的 22%）；去掉后 secretary 1009、visitor 945 均能一屏放下，现状 1267/1203 在 **1440 就必须横向滚动**、各藏 1 个末页签。390px 下秘书/成员台 258/358＝**72%** 的条带宽度被不可点的胶囊占用（组织台实测 191/358≈53%），只剩 3 个 tab；右箭头（x 342–374）实测压住「我的职责」胶囊（x 287–354）12px。胶囊带 `pointer-events:none`（`tab-bar.js:239`）却与选中页签同色同形。 | 桌面端分组改为 1px 竖线/留白，不再画胶囊；≤1024px 不渲染 `groupLabel`；箭头移出滚动容器或给滚动区预留 40px 右内边距；`aria-hidden` 保留。 |
| **C-02** | 模式 | `docs/src/components/shell/page-frame.js:27-38`；`today-tab.js:657`；`work-overview.js:513`；`review-tab.js:77`；`branches-tab.js:121`；`leader/members-tab.js:150,157`；`leader/write-tab.js:196,199`；`leader/inspection-tab.js:150`；`secretary/group-progress-tab.js:403,438`；`secretary/work-map-tab.js:239` | **每个 tab 的「页名」没有统一承载。** 47/62 无 H2；17/62 连 H2/H3 都没有；H2 出现 20px（概况/支委会）、18px（今天）、16px（党委两页）三种尺寸；另有 **8 处把 `.card p-4` 的卡头写成 H4 + 16px + semibold**（既越级又与卡标题同号），例如「卡点/进度/本组创建·承办/可见活动/本组活动考察明细/选择党小组/组员汇报/责任关系表」。工作台外层标题本身是 H2 20px（`docs/workspace/secretary.html:36`），与 tab 内 H2 同层同号，形成「支书工作台 / 支委会」两个 20px 标题上下相压。 | 先把 17 个无标题 tab 补成 `renderTabHeader`（唯一 H2）；今天 H2 由 18 改 20；党委两页的 `renderSectionHeader` 升为页级 H2 或降为 H3；8 处卡头改为 **H3 + 14px**（§3.2.2 内嵌面板档），不再用 H4 冒充分区。 |
| **C-03** | 模式 | 引擎表未 opt-in：`disc/inspection-tab.js:121`、`:196`；`disc/makeup-tab.js:111`；`leader/attendance-tab.js:248`；`leader/inspection-tab.js:190`；`leader/members-tab.js:175`；`leader/write-tab.js:302`；`org/inspection-tab.js:146`；`org/talent-tab.js:279`；`org/taskforce-tab.js:1015`；`secretary/work-map-tab.js:113`；手写表：`party-committee/branches-tab.js:133`、`:67`。证据：`org-人才库-390.png`、`disc-考察管理-390.png`、`secretary-支委会-390.png` | **≤640px 只有被守卫点名的表会转卡。** 390px 实测：人才库「活动参与汇总」表 392px、9 列、`thead` 仍显示、`td` 无 `data-label` → 姓名被压成竖排（「罗/文/杰」），数字列挤成 1 字宽；考察「督办清单」6 列同样被压成竖条。对照组的支委会表（支委构成）`thead display:none`、5 个 `data-label` 齐全，说明机制本身没问题，是**覆盖率**问题。 | 所有 ≥5 列的表（引擎 + 手写）统一 `responsive: true` / `data-responsive="cards"` 并逐格补 `data-label`；把 `responsive-cards-guard` 的判据从「点名 6 个文件」改为「扫描所有 `table: {` 且列数 ≥5」。 |
| **C-04** | 模式 | `styles.css:145`（`--text-xs: 0.625rem` = 10px）、`:409-413`（页面导语用它）、`:1534-1537`（角标 10px）、`:1759-1763`（0.65rem）、`:5143-5166`（浮窗错误/legend 用它）；`tab-bar.js:239`（11px）；`today-tab.js:192,226`；`roster-tab.js:228` | **同名令牌两套值 + 10px 正文。** `--text-xs` 是 10px，Tailwind `.text-xs` 是 12px；两者同页并存。tab 页导语（`支委会` 的「支委身份由支书配置…」）实测 **10px**，浮窗错误文案、图例同样 10px。`text-[11px]` 315 处被大量当作日期/meta（`today-tab.js:192` 截止日、`:226` 发布日期），而 §3.2.2 规定 meta＝12px；同一语义层在名册是 12px、在今天页是 11px。 | 把 `--text-xs` 改为 0.75rem，或把 7 处消费点迁到 `text-xs`；11px 只保留给「600 字重 + 字距」的 Overline 标签；meta 统一 12px。 |
| **C-05** | 模式 | 逾期：`today-tab.js:183-186`（`--functional-error` + `text-red-600`）vs `todo-tab-shell.js:161,171`（warning）＋ `DESIGN_SYSTEM.md:523-525`；子导航选中：`styles.css:1398-1402`（`.btn-tab.active` 用 `--primary-*` 红）＋ `disc/attendance-tab.js:193-194`；页签选中：`styles.css:2035-2039`（accent 金）；访客 CTA：`visitor/activities-tab.js:31`（内联 `--party-red` 实底） | **同一语义多种颜色。** ①「逾期」在今天是错误红、在待办是警告琥珀，违反 §2.10「逾期＝warning，error 只给阻断/失败」；② 同一屏上级页签选中是金、二级「确认与录入」选中是党建红（`disc-attendance-1440.png`），出现两个「选中色」；③ 成员台主题色是金，主行动「去报名」却是党建红实底（`visitor-activities-1440.png`）。 | 今天页逾期改 warning（与待办同源）；`.btn-tab.active` 跟 accent 或统一中性下划线；访客「去报名」改用 `.btn-accent`。 |
| **C-06** | 模式 | `tab-bar.js:239`（分组胶囊 `color-mix(accent 60%, #000)` on `accentRgba`）、`:249` + `styles.css:2035-2039`（选中页签 55%）；`styles.css:3671`（`.badge--gold` #A16207 on #FDE68A）；`components/ui/badge.js:7-10`（注释声称「≥ AA」） | **金色派生文字对比度不足（按 WCAG 公式、以 0.14 金底合成后计算）：** 分组胶囊 **3.89:1**（11px/600）、选中页签 **4.46:1**（12px）、「主题党日」金徽章 **3.95:1**（11–12px）。三者均低于普通文字 4.5:1；`badge.js` 的「同样 ≥ AA」注释与实测不符。截图 `secretary-1440.png`（金胶囊）、`org-talent-1440.png`（金徽章）。 | 分组/选中文字再压深一档（如 accent 45% 黑）或提高淡底不透明度；`badge--gold` 字色改 `#92400E` 一档并复测；把对比度纳入守卫。 |
| **C-07** | 模式 | `components/feedback/issue-dispatch-view.js:48-56`；`entries/tabs/visitor/projects-tab.js:215-217`；`entries/tabs/visitor/activities-tab.js:163`；`docs/workspace/visitor.html:36` | **无标题、无容器的「空壳页」。** 「我的处置」在 org/prop/disc/leader/visitor 五台复用：无 H2/H3、无页面标题，用 `<p class="text-xs font-medium">待我处理 · N</p>` 冒充分区标题（违反 §3.3.1），容器是两块裸 `rounded-xl bg-white p-3`（不是 `.card`）。成员台 5 个 tab（活动动态/项目分工/考勤概况/思想汇报/我的考察）实测 **0 张卡片、0 个标题**；项目分工整页只有 3 枚子视图按钮 + 一句居中空态（`visitor-projects-1440.png`），页面标题是通用的「工作台」。 | 先给 5 台「我的处置」套 `.card` + H2；成员台 5 个 tab 补页级 H2 与承载容器；空态统一 `emptyStateHtml`。 |

### P2（13 条）

| ID | 类型 | 位置（file:line / 证据） | 现象与判据 | 最小修复建议 |
|---|---|---|---|---|
| **C-08** | 模式 | 子导航：`tab-bar.js:249`（金胶囊）、`styles.css:1398-1402`（红胶囊）、`styles.css:470-493`（黑下划线）、`visitor/projects-tab.js:115`（内联 accent 胶囊）；行操作：`org/roster-tab.js:266-268`（`btn-accent-soft` + 原生 sky 链接 + 覆写 `btn-danger`）；空态：`components/ui/empty-state.js`、`today-tab.js:436,443`（圆点+文字）、`projects-tab.js:215-217`（裸居中） | **同一层级动作有 4 套选中语法、3 套行操作、3 套空态。** 用户每换一个 tab 就要重新学「哪个是当前视图」。名册一行三枚按钮还同时出现金/蓝/红三种色义（编辑/档案/移出），蓝色「档案」既不是主题色也不是状态色。 | 抽一个 `segmented-control`（默认中性下划线或 accent）替换四处；行操作统一 `btn-accent-soft / btn-outline / btn-danger` 三档；空态一律 `emptyStateHtml`。 |
| **C-09** | 模式 | `components/record/todo-list.js:124-139`（「更多」）；`leader/write-tab.js:220`（「发布本组通知」）；`leader/review-tab.js:75`（「未提交」）；证据：`secretary-待办-1440.png`（「更多」×6）、`leader-write-1440.png`（「发布本组通知」×8、「待归档」×18）、`leader-members-1440.png`（红色「未提交」×12）、`secretary-overview-1440.png`（「去待办」×4） | **行内动作/状态列变成「噪声列」。** 每行一个同款按钮/徽章，整列形成高饱和色带；「更多」不说明打开什么；「未提交」用错误红铺满 12 行，把常规未完成读成 12 个故障。 | 高频动作留 1 个主键，其余收进行尾「…」菜单；「未提交」改中性/琥珀；批量动作上提到卡头。 |
| **C-10** | 模式 | 矩阵：`components/ui/relation-matrix.js:96-98`（`max-w-[112px] truncate` + 仅 `title`）、`:126-128`（hint）；分支表：`party-committee/branches-tab.js:133-135`、`:148-149`、`:166`；概况表：`work-overview.js:59`；截图 `disc-inspection-1440.png`、`party-committee-branches-1440.png`、`org-overview-1440.png` | **表格/矩阵承载失准。** ① 矩阵 3 个列头都截成「7月主题党日：…」，触屏无法 hover 看 `title`，列不可区分；② 党委「支部管理」10 列 1 行，7 个指标格里「活动 1 / 35」「专班 1 / 8」无单位，且同屏两枚金色主按钮（新建支部/支部设置）；③ 概况表「负责人」列在 org/prop/disc/leader/visitor 五台恒为同一值（组织委员/普通成员），占 ~20% 宽度零信息。 | 列头改两行 `line-clamp-2`，把可区分后缀（日期/期次）前置；≤3 行分支改用摘要卡；「负责人」在单角色台隐藏或并进首列。 |
| **C-11** | 模式 | `visitor/thought-report-tab.js:79` + `services/governance/thought-report.js:106`；`leader/members-tab.js:141-142`；`org/member-flow-tab.js:238`；`org/roster-tab.js:215`；`disc/inspection-tab.js:610`；`disc/attendance-tab.js:642`；`leader/attendance-tab.js:52`；`org/talent-tab.js:127`；`issue-dispatch-view.js:56`；`prop/kanban-tab.js:60-61` | **重复文案与「此地无银」。** 思想汇报同一规则在一行内说两遍（左灰「建议 1500…少于 1200…」、右橙「当前 0 字 · 少于 1200 字…建议 1500…」）；4 处空态用「下一步：…点上方/下方…」教用户看就在眼前的按钮；考察管理一段 130+ 字 11px 说明解释列义；「以人为第一列」是内部设计术语，两次出现在用户界面；「可回看本浏览器提交…换设备后无法回认」把 localStorage 机制讲给用户。 | 每个空态只留「一句状态 + 一个动作」；规则说明移 help；删除实现术语与浏览器存储解释；思想汇报只保留右侧实时计数。 |
| **C-12** | 个案 | `secretary/feedback-tab.js:21-26`；`secretary-390.png` | 390px 下「反馈管理」被右侧 `0 条` 徽章挤成 **「反馈管 / 理」两行**（h3 无 `min-w-0`/`whitespace-nowrap`），标题区高度翻倍；同页顶部还有一条 12px 的「开源讨论集思广益；支书保留处置权（指派/审核/状态/隐藏/合并）」自明说明。 | 标题行 `flex-wrap`，标题 `whitespace-nowrap`；说明行删除或移入帮助。 |
| **C-13** | 个案 | `entries/workspace/ws-org-commissioner-entry.js:42-46`；`org-390.png` | 组织台把主 CTA「发布招募」塞进页签行右侧：390px 下按钮被裁成「发布招」，滚动区可用宽从 358 → **270px**，10 个页签只剩 3 个可见。按钮本身是内联样式 + `onmouseover/onmouseout`，未走按钮族。 | ≤640px 把该 CTA 移出页签行（放卡头或底栏）；改用 `.btn-accent`。 |
| **C-14** | 个案 | `components/shell/header.js:259-262`；`secretary-390.png`、`org-390.png` | 390px 短名规则取「前两字 + 党支部」，把「光华管理学院本科生党支部」显示成 **「光华党支部」**——不是截断，而是改变组织名语义（可能被读成另一个支部）。 | 用真正的省略号 + `title` 全文，或配置化的 `shortTitle`，不要按字数切。 |
| **C-15** | 模式 | 过密：`disc/inspection-tab.js:99,610`、`disc/attendance-tab.js:642`、`leader/attendance-tab.js:52`、`disc-inspection-1440.png`；过空：`prop-kanban-1440.png`、`visitor-projects-1440.png`、`secretary-1440.png` | **同站密度两极。** 考察管理一屏 4 张卡 + 3 段导语 + 表格 + 矩阵，信息压到 11px；项目看板只有 2 列（待启动 0 / 进行中 1），左列整块空白；成员台项目分工整页留白 > 70%。同为「工作台」，一边读不完、一边像未加载。 | 过密页把规则导语移 help、把「督办清单」与「考察总表」合成一个切换；过空页给空列一个明确的「本列为空」边界或折叠 0 值列。 |
| **C-16** | 个案 | `leader/attendance-tab.js:245`（`personFacets`）＋ `components/ui/list-filter.js:338-346`；`leader-attendance-1440.png` | 筛选提供「党小组 / 发展阶段 / 角色 / 在册」四个维度，但表格只有「姓名 / 活动 / 状态 / 确认状态」——按发展阶段筛完，表里看不到发展阶段，无法验证筛选结果。 | 筛选维度只保留表内可见列，或在行内补该维度小字。 |
| **C-17** | 个案 | `today-tab.js:404-410`、`:638-641`；`secretary-1440.png` | 今天页右卡「日程」里的分区标题叫 **「活动管理」**，与支书台页签「活动管理」同名不同义（这里是建活动/看日历两个入口）；两个入口是 `.btn-ghost` 纯文字，在卡内看不出可点。 | 分区改名「活动入口」或「快捷入口」；两个入口给 `btn-outline` 底。 |
| **C-18** | 个案 | `components/governance/work-overview.js:538-545`；`secretary-overview-1440.png`、`org-overview-1440.png` | 「我已处理 0」是一张只剩标题的空白卡（`<details>` 收起且计数为 0），没有展开箭头提示，读者不知道点开有内容；0 值下整卡无信息。 | 0 条时不渲染，或收起态给 chevron + 一句「暂无已处理」。 |
| **C-19** | 模式 | `visitor/activities-tab.js:70`（`transition-all hover:shadow-sm`）；`org/taskforce-tab.js:1404`、`secretary/calendar-tab.js:747`、`visitor/inspection-tab.js:150`（`hover:shadow-sm transition-shadow`）；`styles.css` §5.3 | **动效不越界，但词汇不统一。** 行悬停同时存在「变底色 / 加阴影 / 变边框」三套；7 处 `transition-all` 会把布局属性一起动画化。§5.3 禁止的是上浮与发光，这里只是轻阴影，属打磨项。 | 行悬停统一 `hover:bg-surface-hover`；避免 `transition-all`，限定颜色/阴影。 |
| **C-20** | 个案 | `capabilities/secretary-workspace.js:82`（分组「知情查看」）、`:88`（页签「知情查看」）；`leader-workspace.js:77`（同）；`secretary-1440.png` | 页签条读成「… 知情查看 ｜ 支部分工 知情查看」：分组名与组内页签名完全相同，第二个「知情查看」既是组标签又是页签，读者会以为重复渲染。 | 分组改名（如「只读面」）或去掉该组胶囊；同类：分组「工作台」与页面名「工作台」也重复。 |

### P3（3 条）

| ID | 类型 | 位置（file:line / 证据） | 现象与判据 | 建议 |
|---|---|---|---|---|
| **C-21** | 个案 | `capabilities/party-committee-workspace.js:23-31`；`party-committee-1440.png` | 党委台 3 个页签全在同一组，仍渲染一枚「党委治理」胶囊——单组分不编码任何信息，是纯装饰（违反「结构必须编码事实」）。 | 单组不渲染分组标签。 |
| **C-22** | 个案 | `secretary/feedback-tab.js:30-36`；`secretary-390.png` | 390px 下「待审核草稿 0」占一整块橙色折叠条（含 warning 徽章 0），在零值时形成一块无行动的暖色块。 | 0 条时折叠为一行低调文本或不显示。 |
| **C-23** | 个案 | `today-tab.js:141-143` + 截图 `secretary-1440.png` | 分组标题 `h4` 是 14px，但计数 `span` 是 16px 且着主题色——**次要数字比标题更大更亮**（截图「参与 1」「阅读 1」），层级倒置。 | 计数降到 12–14px、用中性色；标题承担层级。 |

---

## 四、模式归纳

### 模式 A：页签条把「结构说明」画成了第二套导航（C-01 / C-20）
分组标签本可以只做分隔（竖线/留白），现在做成了 11px 胶囊：与选中页签同色系、同圆角、同处一行。结果有三重代价——**宽度**（258px，390 下 72%）、**语义**（「知情查看」既是组又是页签）、**误读**（不可点却像可点）。这是本轮「乱」的第一来源，且只需一处组件改动即可全站生效。

### 模式 B：每个 tab 都在自己发明「页面标题」（C-02 / C-07）
系统给了 `renderTabHeader`，但只有概况与支委会两个共享组件在用；今天页自己写了个 18px 的 `h2`，反馈管理用 `h3`，党委台用 16px 的「section title 当 h2」，17 个 tab 完全没有标题。于是 62 个 tab 有 4 种页头语法、3 种 H2 字号、8 处 H4 越级。**根因不是实现者，而是「谁负责页头」没有单一源。**

### 模式 C：字号令牌是两套（C-04）
`--text-xs`＝10px、`.text-xs`＝12px，名字一样值不同；11px 在文档里是「标签档」，在代码里成了「万能 meta 档」。10px 还落在页面导语、浮窗错误、图例这些**必须读**的位置。这是典型的「令牌没人消费，工具类各自为政」。

### 模式 D：金色同时是身份、选中、行动、类别（C-05 / C-06 / C-10）
默认主题色＝金（`styles.css:97`），header 角色徽章＝金，页签选中＝金，主按钮＝金，「主题党日」类别徽章＝另一支金（#FFD700 / #FDE68A）。同屏三到四种金，用户无法用颜色区分「我是谁 / 我在哪 / 该点哪 / 这是什么类型」。更糟的是两支金的深字对比度都不到 4.5。

### 模式 E：窄屏适配是「点名制」而不是「默认制」（C-03）
卡式行机制本身很好（支委会 390px 实测合规），但 `responsive` 默认 false：15 张数据表中只有成员流动与支委会 3 张 opt-in。人才库、考察督办、组长考勤等最需要窄屏可读的表全部漏网。**默认值错了**，不是某个页面忘了。

### 模式 F：空态/说明在替 UI 说话（C-11）
「点上方…」「下一步：…」「以人为第一列」「本浏览器…换设备后无法回认」——这些句子都在解释界面本身或实现机制。它们集中在高频页（成员流动、名册、组员进展、我的处置、考察管理），让页面显得啰嗦且不自信。守卫只挡了 17 条具体黑名单，挡不住这种句式。

### 模式 G：行内重复控件形成「色带」（C-09 / C-15）
每行一个同款按钮或徽章，在 8–18 行的列表里就变成一条彩色轨道（发布本组通知、更多、未提交、待归档）。单看一行合理，整列看是噪声；同时把真正需要注意的少数异常淹没了。

### 模式 H：动效是克制的（C-19）
全 tab 仅 2 处循环动画、0 处渐变/缩放/上浮，`prefers-reduced-motion` 在页签滚动与高亮处有处理。这块不需要大改，只统一行悬停词汇即可。

---

## 五、建议修复顺序

> 原则：先动「一处改、全站受益」的壳层，再动页面；先修可读性（P1），再修观感（P2/P3）。每批都可独立验收。

**F1 · 页签条（C-01 / C-13 / C-20）— 组件级，1 处改动，收益最大**
1. `tab-bar.js`：≤1024px 不渲染 `groupLabel`；桌面端把胶囊换成 1px 竖线（或 8px 留白）。
2. 滚动容器右侧预留 40px，箭头不再覆盖内容；组织台 CTA 在 ≤640px 移出页签行。
3. 验收：1440 下 7 台全部 `scrollWidth ≤ clientWidth`；390 下可见页签 ≥4（secretary 12 个时应 ≥4）。

**F2 · 页头与标题（C-02 / C-07 / C-23）— 页面级，先补 17 个无标题**
1. 17 个无标题 tab 接 `renderTabHeader`；今天 H2 18→20；党委两页页头回 20。
2. 8 处卡头 H4→H3，字号回 14px；今天计数 span 降档。
3. 验收：脚本断言「每个 tab 内容区恰好 1 个 H2，且无 H4 ≥16px」。

**F3 · 窄屏表格（C-03）— 默认值修正**
1. 11 个引擎表补 `responsive: true`；`branches-tab` 两支表补 `data-responsive="cards"` 与 `data-label`。
2. 把 `responsive-cards-guard` 扩为「列数 ≥5 的表必须 opt-in」，防止回退。
3. 验收：390 下人才库/考察/党委支部表 `thead` 隐藏、每格有标签、无「一字一列」。

**F4 · 字号令牌（C-04）**
1. `--text-xs` 改 12px（或把 7 个消费点迁到 `text-xs`）；浮窗错误字号先修。
2. 明确 11px 只用于 Overline 标签（600 字重 + 字距），meta 统一 12px。
3. 验收：页面导语/错误/图例不再出现 10px；抽样 10 个 tab 的 meta 同档。

**F5 · 色彩语义（C-05 / C-06 / C-21 / C-22）**
1. 今天页逾期改 `--functional-warning`；`.btn-tab.active` 改 accent 或中性下划线；访客「去报名」改 `.btn-accent`。
2. 金色派生文字压深一档并复测到 ≥4.5；`badge--gold` 字色加深。
3. 单组分不渲染胶囊；0 值暖色折叠条收掉。

**F6 · 承载与组件族（C-08 / C-10 / C-18）**
1. 抽一个 `segmented-control`；行操作三档；空态全走 `emptyStateHtml`。
2. 矩阵列头两行、分支表 ≤3 行改摘要卡、概况表隐藏恒定列；「我已处理 0」不渲染。

**F7 · 文案与密度（C-09 / C-11 / C-12 / C-15 / C-16 / C-17）**
1. 每个空态一句 + 一个动作；规则移 help；删「以人为第一列」「本浏览器」等实现话。
2. 行内高频动作收进菜单；「未提交」改中性/琥珀。
3. 反馈管理标题不折行；组长考勤筛选只留表内可见维度。

**F8 · 打磨（C-14 / C-19）**
1. 390 短名改省略号/配置化；行悬停统一 `hover:bg`，去掉 `transition-all`。

---

## 六、证据与复现

- **截图目录**：`.ctx/evidence/2026-10-21/R5C/`（本轮新建，40+ 张 1440 / 390 全页截图）。
  关键几张：`secretary-1440.png`（分组胶囊 + 选中页签 + 1440 藏末签）、`secretary-390.png`（仅 3 tab + 反馈管理折行 + 箭头压胶囊）、`org-390.png`（发布招募被裁、条带 270px）、`org-人才库-390.png`（9 列压成竖条）、`disc-考察管理-390.png`（6 列压成竖条）、`secretary-支委会-390.png`（合规卡式行对照）、`disc-attendance-1440.png`（三层导航 + 红/金双选中）、`visitor-projects-1440.png`（无标题空壳页）、`visitor-thought-report-1440.png`（同一规则两遍）、`party-committee-branches-1440.png`（10 列 1 行）。
- **DOM 量测**：同目录 `metrics.json`（62 tab 的卡片数、H2/H3/H4 文案与字号、span/p 字号分布、表格/矩阵数、页签 scrollWidth/clientWidth、390 溢出）。页签几何（分组宽 258px、箭头 342–374 与胶囊 287–354 重叠 12px）由同一轮真机 `getBoundingClientRect` 取得。
- **复现方式**：`createApp({dbPath:':memory:'})` + `seedDatabase` 起本地服务，Playwright 以 `docs/src/data/mock/accounts.js` 的 7 个演示账号登录（2300010001 / 2400012355 / 2400012356 / 2400012354 / 2400012345 / 2400012349 / 9000000001，密码 123456），视口 1440×900 与 390×844。**注意：本轮运行落在 mock 数据源**（日志 `[DataAdapter] 数据源切换为: mock`），版式与字号与 API 形态一致，个别数字（如待办数量）不代表线上数据。
- 临时取证脚本已删除，未进入仓库。

---

## 七、边界与说明

- 本轮**只读**：未改任何源文件、未提交 git、未更新 tasks.md；未读取 R5-A / R5-B 报告。
- 设计判据以 `content/04_web_design/design-system/DESIGN_SYSTEM.md` 为单一源（§2.10 颜色四问、§3.2.2 档位-角色、§3.3.1 标题语义、§4.25 标题层级、§4.26 零值、§5.3 动效、§6 响应式）。本轮指出的是**实现与自订规范的偏差**，不是另立新规范。
- 对比度为按 sRGB 相对亮度公式的静态估算（金色 14% 底与页面底色 #FAFAF5 合成后计算），未在真机取色器逐点复核；建议修复后以浏览器 DevTools 对比度读数复验。
- 数据类异常（如支书待办摘要「40 / 0 / 0 / 105」自相矛盾、思想汇报「163 字/篇幅不足」）属数据与文案口径问题，未计入本路发现表，建议由数据/IA 路复核。
