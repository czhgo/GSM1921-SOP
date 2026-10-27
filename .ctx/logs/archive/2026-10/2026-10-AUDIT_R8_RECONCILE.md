---
title: "第八、九轮前置：旧账对账（Round 2 / R5-B / R5-C / R6-P3 / R7-P3）"
type: audit_report
role: "[AI]"
last_updated: "2026-10-22"
status: active
related_files: [.ctx/logs/archive/2026-10/AUDIT_ROUND2_MINIMUM_THREE_COSTS.md, .ctx/logs/archive/2026-10/AUDIT_R5_B_DESIGN_TASTE.md, .ctx/logs/archive/2026-10/AUDIT_R5_C_FRONTEND_DESIGN.md, .ctx/logs/2026-10-AUDIT_R6_FRONTEND.md, .ctx/logs/2026-10-AUDIT_R7_DATA.md]
---

# 旧账对账（Task 0）

## 一、范围

本报告只做一件事：把四份旧审计与乙部登记项逐条回读当前 HEAD，判定「已消解 / 仍存在 / 已裁不做 / 待裁」，并给出归属，防止第八、九轮重审产生第二套编号。

| 来源 | 条数 | 说明 |
|---|---:|---|
| Round 2 最小三成本（L-A01…L-A12、L-B01…L-B12、L-C01…L-C12） | 36 | 2026-10-19 静态审查 |
| 第五轮 B 路 design-with-taste（F-01…F-22） | 22 | 2026-10-21，62 tab 同面 |
| 第五轮 C 路 frontend-design（C-01…C-23） | 23 | 2026-10-21，62 tab 同面 |
| 第六轮前端文案 / 注释 P3（P3-01…P3-21） | 21 | 2026-10-22 报告，P1/P2 已在批次 502 修复 |
| 第七轮数据生命周期 P3（R7-05…R7-36 中 P3 部分） | 23 | 2026-10-22 报告，P1/P2 已在批次 502 修复 |
| 乙部登记项（B-500-1/2/5/6/7、B-502-3/4/6） | 8 | 现状核对，不重审内容 |
| **合计** | **133** | — |

同时读取但不单独计行：`CLAUDE.md` 乙部 `B-500-1/2/5/6/7`、`B-502-3/4/6`；`.ctx/ENGINEERING_ASSESSMENT.md §四`（改造行动线与专项台账）；`.ctx/REVIEW_QUEUE.md` 附录⑤（最小三成本基线、五场景检查法、点击成本计数）。

## 二、方法

1. 旧报告逐条取其**特征句、特征类名或特征函数名**，在当前工作区全仓 Grep；旧句 0 命中且原位置已换实现 ⇒ 判已消解。
2. 凡判「已消解」的，必须 Read 当前代码确认替代实现（本报告所有已消解项均给出当前 `文件:行号`，不沿用旧报告结论）。
3. 凡判「仍存在」的，给出当前 HEAD 的 `文件:行号`；旧行号已漂移的，以本轮实测为准。
4. 归属以 `.trae/specs/run-round8-9-audits-and-polish/tasks.md` 的 Task 1–6 为准：能落进本轮具体 SubTask 的标「归第八轮 / 第九轮 9A / 9B」，其余标「不属本轮」。
5. 新发现不在本报告展开；第八、九轮另有报告（见 R8/R9）。

**统计口径**：每条只计一次；R5-B 的 F-22 是正向样板（无缺陷），按「已消解（无需整改）」计。乙部登记项按其覆盖的旧条目整体判一次，不与其内部条目重复计数。

## 三、总数

| 状态 | 条数 |
|---|---:|
| 已消解 | **31** |
| 仍存在 | **101** |
| 已裁不做 | **1** |
| 待裁 | **0** |
| **合计** | **133** |

归属分布：归第八轮 **5** 条；第九轮 9A **8** 条；第九轮 9B **4** 条；不属本轮 **116** 条。

> **本轮不重开已消解项。** 已消解项只在需要时作为「现状基线」引用，不再重审、不再改判；若后续代码回退，由守卫而非本报告负责判红。

## 四、对账表

### 4.1 Round 2（36 条）

| 旧编号 | 当前 HEAD 是否仍存在（证据） | 状态 | 归属 |
|---|---|---|---|
| L-A01 | 已消解：`docs/src/components/record/todo-tab-shell.js:256-261,398-403`（窄屏详情列 `order-first`，选中后 `_scrollDetailIntoView`） | 已消解 | 不属本轮 |
| L-A02 | 已消解：`docs/src/components/shell/tab-bar.js:592-599`（激活页签 `scrollIntoView` 到最近可见位，尊重减少动效） | 已消解 | 不属本轮 |
| L-A03 | 已消解：`styles.css:4821-4832` 卡式行机制；14 个文件声明 `responsive: true`（如 `org/talent-tab.js`、`disc/inspection-tab.js`、`leader/members-tab.js`）；手写表 `party-committee/branches-tab.js:67,135` 已带 `data-responsive="cards"` | 已消解 | 不属本轮 |
| L-A04 | 已消解：`capabilities/secretary-workspace.js:45` 页签名已改「全局概况」，与页内 H2 一致；`governance/work-overview.js:514` 统一走 `renderTabHeader` | 已消解 | 不属本轮 |
| L-A05 | 已消解：`components/feedback/issue-dispatch-view.js:106,141` 两段均走统一检索引擎 `renderFilteredList`，不再各写一套筛选 | 已消解 | 不属本轮 |
| L-A06 | 已消解：`entries/tabs/visitor/activities-tab.js:40,58` 动作区已 `flex-wrap` | 已消解 | 不属本轮 |
| L-A07 | 已裁不做：`docs/workspace/secretary.html:32`（六台同注）明确「党委台 `page-frame--wide` 80rem 为宽表例外，本批不改宽度」——宽度差异按登记例外保留 | 已裁不做 | 不属本轮（已裁保留） |
| L-A08 | 仍存在：`entries/tabs/shared/activity-calendar-tab.js:52` 右栏默认仍是「点击日期查看当日活动」占位；`components/record/inspector.js:237-240` 无 `dateKey` 时列表为空 | 仍存在 | 不属本轮 |
| L-A09 | 已消解：`entries/pages/activity-materials-entry.js:158,196,218` 第②步已改名「核对材料」，并提供「去核对／去补充」真实出口 | 已消解 | 不属本轮 |
| L-A10 | 已消解：`entries/tabs/leader/members-tab.js:150-160` 卡点区已前置，进度区在后 | 已消解 | 不属本轮 |
| L-A11 | 仍存在：`docs/index.html:45` 统计区仍是固定 `grid-cols-2 md:grid-cols-4`；条件卡数已实现（`dashboard/stats.js:87-99` 3/4 张）、可点卡已有 `title` | 仍存在 | 不属本轮 |
| L-A12 | 仍存在：`entries/pages/activity-entry.js:470-482` 标题区之后没有按角色的「下一步」动作行，主要动作仍分散在后续卡片 | 仍存在 | 归第八轮（Task 2.7） |
| L-B01 | 已消解：`components/record/calendar.js:287,317,603-632` 日期格与活动条目均 `tabindex="0"`，条目 `role="button"` 且绑 Enter/Space | 已消解 | 不属本轮 |
| L-B02 | 已消解：`components/ui/modal.js:318` 统一 `<label for>`；`entries/tabs/secretary/calendar-tab.js:834-883` 各字段均 `label for` | 已消解 | 不属本轮 |
| L-B03 | 已消解：`entries/tabs/secretary/calendar-tab.js:970-987` 两处折叠已改 `<button aria-expanded aria-controls>`，`:1230` 注明原 `div onclick` 已替换 | 已消解 | 不属本轮 |
| L-B04 | 已消解：`entries/tabs/org/taskforce-tab.js:356-365,1407` 卡片 `role="button" tabindex="0"`，键盘事件排除内层控件 | 已消解 | 不属本轮 |
| L-B05 | 已消解：`entries/tabs/prop/kanban-tab.js:114-122,138` `keydown` 开头排除 `button,a,input,textarea,select`，不再劫持卡内按钮 | 已消解 | 不属本轮 |
| L-B06 | 已消解：`components/ui/modal.js:178` 关闭按钮已有 `aria-label="关闭"` | 已消解 | 不属本轮 |
| L-B07 | 仍存在：`entries/tabs/org/roster-tab.js:474` 校验失败仍 `showToast('error', v.message)`，未落到字段级；共享浮窗能力已具备（`modal.js:372-400`） | 仍存在 | 第九轮 9B（Task 6.8） |
| L-B08 | 仍存在：`components/ui/list-filter.js:265,272` 列表仍以 `listEl.innerHTML` 整体重建，无按稳定键的焦点恢复 | 仍存在 | 不属本轮 |
| L-B09 | 已消解：`components/ui/relation-matrix.js:96-115` 行首／列头均 `scope`；翻页走 `pager.js` 单一源（`:25,91,146`） | 已消解 | 不属本轮 |
| L-B10 | 已消解：`components/shell/header.js:145` 铃铛可访问名带未读数；`:379-386` 条目角色与「已读」按钮分离；`:435` 键盘事件不冒泡触发跳转 | 已消解 | 不属本轮 |
| L-B11 | 已消解：`entries/tabs/disc/attendance-tab.js:586` 复选框 `aria-label` 已拼「姓名 · 活动 · 状态」 | 已消解 | 不属本轮 |
| L-B12 | 仍存在：`entries/tabs/disc/attendance-tab.js:1064,1174,1177` 仍用 `text-gray-400` 承载状态字（按旧报告同色值推算 2.54:1） | 仍存在 | 不属本轮 |
| L-C01 | 已消解：`entries/pages/activity-entry.js:231,235` 缺 id／对象不存在时已给「返回活动列表／刷新后再试」 | 已消解 | 不属本轮 |
| L-C02 | 仍存在：`entries/tabs/disc/inspection-tab.js:259` 仍原生 `confirm('确认删除该考察记录？')`，未说不可恢复；`:273,291` 仍原生 `prompt` | 仍存在 | 不属本轮 |
| L-C03 | 已消解：`components/ui/modal.js:461-502` 本位 nudge 已按场景分动词（写入／上传／催办／赋权） | 已消解 | 不属本轮 |
| L-C04 | 已消解：`components/ui/modal.js:287` 通用表单缺省 `submitLabel='保存'`，不再是「提交」 | 已消解 | 不属本轮 |
| L-C05 | 已消解：`entries/tabs/org/taskforce-tab.js:935,1497` 统一为「组织者／深度参与」，未见「负责人」第二套叫法 | 已消解 | 不属本轮 |
| L-C06 | 仍存在：`entries/tabs/disc/attendance-tab.js:613,775` 用「一次确认所选」，`entries/tabs/disc/review-tab.js:256` 用「批量确认所选」 | 仍存在 | 不属本轮 |
| L-C07 | 仍存在：`entries/tabs/disc/review-tab.js:173,212` 按钮仍写「站内通知」，未说对象与结果 | 仍存在 | 不属本轮 |
| L-C08 | 仍存在：`components/ui/list-filter.js:130,270-273` 空态仍只有「无匹配结果」，无清除出口；全仓 `emptyActionHtml` 仅 `visitor/projects-tab.js` 2 处 | 仍存在 | 不属本轮 |
| L-C09 | 仍存在：`entries/tabs/prop/archive-tab.js:859-860` 仍向用户直说「服务端模式…本地模式 base64」 | 仍存在 | 不属本轮 |
| L-C10 | 仍存在：`entries/pages/activity-materials-entry.js:81,205` 仍露出「材料闭环」（含步骤条 `aria-label`），未统一为「材料与归档」 | 仍存在 | 归第八轮（Task 2.1） |
| L-C11 | 已消解：`core/base/utils.js:38-59` `describeWriteError` 单一源；`party-committee/party-config-tab.js:54-55`、`secretary/calendar-tab.js:1783` 均已改走它，401/403 才提权限 | 已消解 | 不属本轮 |
| L-C12 | 仍存在：`entries/tabs/prop/weekly-tab.js:121` 可见 placeholder 仍用英文三点 `...`；原点名三处中 `calendar-tab.js` 已 0 命中同款（文件内 `...` 均为代码展开符） | 仍存在 | 不属本轮 |

### 4.2 第五轮 B 路 design-with-taste（22 条）

| 旧编号 | 当前 HEAD 是否仍存在（证据） | 状态 | 归属 |
|---|---|---|---|
| F-01 | 仍存在（部分）：多数 tab 已接 `renderTabHeader`（32 文件、71 处），但 `disc/makeup-tab.js:88`、`party-committee/party-config-tab.js`、`prop/weekly-tab.js` 仍无页级 H2 | 仍存在 | 不属本轮 |
| F-02 | 仍存在：`components/shell/header.js:278-284` 顶栏动作同权重；`entries/workspace/ws-secretary-entry.js:84` 主 CTA「写入活动」仍 `btn-ghost` | 仍存在 | 不属本轮 |
| F-03 | 仍存在：`secretary/notification-tab.js:76-82` 通知表单常驻；`prop/tasks-tab.js` 走折叠；`secretary/report-up-tab.js` 按钮展开 | 仍存在 | 不属本轮 |
| F-04 | 仍存在：全仓 `emptyMessage` 65 处 / 39 文件，多数仍为「暂无 X」；例 `visitor/thought-report-tab.js:88` | 仍存在 | 不属本轮 |
| F-05 | 仍存在：`prop/archive-tab.js:92` 孤立「上传材料」按钮在前，`:435` 周期归档折叠条，首屏仍缺页级动作主线 | 仍存在 | 不属本轮 |
| F-06 | 仍存在：`disc/attendance-tab.js:193-197` 一级分段与二级视图两组按钮仍叠放 | 仍存在 | 不属本轮 |
| F-07 | 仍存在：`capabilities/secretary-workspace.js:82,88` 分组「知情查看」与页签「知情查看」同名；1440 溢出未复测（分组已改 1px 竖线，宽度已减） | 仍存在 | 不属本轮 |
| F-08 | 仍存在：原生 `confirm/prompt` 39 处 / 19 文件（Grep 计数），例 `disc/inspection-tab.js:259,273` | 仍存在 | 不属本轮 |
| F-09 | 仍存在：`components/shell/tab-bar.js:311,363` 仍为置灰＋直接渲染，无内容过渡 | 仍存在 | 不属本轮 |
| F-10 | 仍存在：`secretary/feedback-tab.js:309-310,321-322` 列表↔详情仍靠 `hidden` 瞬时互斥 | 仍存在 | 不属本轮 |
| F-11 | 仍存在：`disc/review-tab.js:470,492,504` 单条操作后仍整页 `renderContent(ctx)` | 仍存在 | 不属本轮 |
| F-12 | 仍存在：`styles.css:143-145` 全局仍 `ease-out` 150/200/250ms，未引入 golden curve | 仍存在 | 不属本轮 |
| F-13 | 仍存在：`components/ui/modal.js:160,171` 遮罩 `fadeIn .15s`、面板 `slideUp .2s`，不从触发器生长 | 仍存在 | 不属本轮 |
| F-14 | 仍存在：`governance/work-overview.js:452-455` 指标带仍字符串一次性插值，无数值插值 | 仍存在 | 不属本轮 |
| F-15 | 仍存在：`components/shell/workspace-shell.js:235-237` 首载仍注入固定骨架卡，不随日历／看板／宽表塑形 | 仍存在 | 不属本轮 |
| F-16 | 仍存在：`core/base/utils.js:87-98` 成功提示仍统一走 toast（含 15s 等待上限），重要动作仍无就地回执 | 仍存在 | 不属本轮 |
| F-17 | 仍存在：`disc/attendance-tab.js:613` 批量确认后仍整页重渲染（同文件 `:530,553` 的 `renderContent`），无逐行离场／原地回执 | 仍存在 | 不属本轮 |
| F-18 | 仍存在：`secretary/calendar-tab.js:1221,1822` 多个数据源失败仍仅 `console.warn`，界面呈「空」而非「坏」 | 仍存在 | 不属本轮 |
| F-19 | 仍存在：`visitor/thought-report-tab.js:88` 空态仍只有「暂无…下一步：在上方提交第一篇」 | 仍存在 | 不属本轮 |
| F-20 | 仍存在：`disc/overview-tab.js:79` 仍以 `MutationObserver` 把行升级成按钮；六台概况薄壳仍在 | 仍存在 | 不属本轮 |
| F-21 | 仍存在：`prop/tasks-tab.js:67` 「导出 CSV」误用 `btn-tab`；`leader/write-tab.js:190` 「创建活动」仍 `btn-md`＋内联色 | 仍存在 | 第九轮 9B（Task 6.2/6.3 部分） |
| F-22 | 已消解（正向样板，无需整改）：`secretary/committee-meeting-tab.js` 页头＋单 CTA、`todo-tab-shell` 四数带、`list-filter` ≤8 行不出检索条均在用 | 已消解 | 不属本轮 |

### 4.3 第五轮 C 路 frontend-design（23 条）

| 旧编号 | 当前 HEAD 是否仍存在（证据） | 状态 | 归属 |
|---|---|---|---|
| C-01 | 已消解：`styles.css:2056-2069` 分组已改 1px 竖线、≤1024px 不渲染；`tab-bar.js:219-235` 保留 `aria-hidden` 分隔 | 已消解 | 不属本轮 |
| C-02 | 仍存在（部分）：同 F-01，`disc/makeup-tab.js:88`、`party-committee/party-config-tab.js`、`prop/weekly-tab.js` 仍无页级 H2；H4 越级与字号档未全部归一 | 仍存在 | 不属本轮 |
| C-03 | 已消解：引擎表 `responsive: true` 覆盖 14 文件／16 处（含 R5 点名的 `org/talent-tab.js`、`disc/inspection-tab.js`、`leader/attendance-tab.js`、`secretary/work-map-tab.js`），手写表见 `party-committee/branches-tab.js:67,135` | 已消解 | 不属本轮 |
| C-04 | 仍存在：`styles.css:151` `--text-xs: 0.625rem`（10px）；`:172` 暗色又为 0.8125rem，同名两值仍在 | 仍存在 | 不属本轮 |
| C-05 | 已消解：`today-tab.js:183-187` 逾期已改 warning；`styles.css:1410-1415` 二级分段选中跟随本台主题色；`visitor/activities-tab.js:32`「去报名」已 `btn-accent` | 已消解 | 不属本轮 |
| C-06 | 已消解：`styles.css:2051-2052` 选中页签文字压深至 45%；`:3714` `badge--gold` 字色改为 amber-dark 70%＋黑 | 已消解 | 不属本轮 |
| C-07 | 已消解：`components/feedback/issue-dispatch-view.js:49-58` 已有 `renderTabHeader`＋`.card` 两卡承载，不再是裸容器 | 已消解 | 不属本轮 |
| C-08 | 仍存在：`styles.css:1410-1415`（accent 分段）、`styles.css:2049-2053`（页签 accent）、`entries/tabs/visitor/projects-tab.js:115`（内联 accent 胶囊）等多套选中语法并存 | 仍存在 | 不属本轮 |
| C-09 | 仍存在：`components/record/todo-list.js:124-139` 行尾「更多」；`entries/tabs/leader/write-tab.js:222` 每行「发布本组通知」 | 仍存在 | 不属本轮 |
| C-10 | 仍存在：`components/ui/relation-matrix.js:96-97` 列头仍 `max-w-[112px] truncate`＋仅 `title`；触屏不可区分 | 仍存在 | 不属本轮 |
| C-11 | 仍存在：`components/feedback/issue-dispatch-view.js:61` 仍向用户解释「本浏览器提交…换设备后无法回认」；思想汇报规则仍有同屏复述 | 仍存在 | 不属本轮 |
| C-12 | 已消解：`secretary/feedback-tab.js:23-27` 标题与「0 条」徽章已分列，h3 为纯文本，不再被徽章挤成两行 | 已消解 | 不属本轮 |
| C-13 | 仍存在：`entries/workspace/ws-org-commissioner-entry.js:42-46` 主 CTA 仍塞在页签行 `extraRightHtml`，内联样式＋`onmouseover` | 仍存在 | 不属本轮 |
| C-14 | 仍存在：`components/shell/header.js:259-262` 390px 短名仍取「前两字＋党支部」 | 仍存在 | 不属本轮 |
| C-15 | 仍存在：`disc/inspection-tab.js:88-101` 一屏仍叠三视图按钮＋导出／打印／交接＋说明；`visitor/projects-tab.js:127-129` 空侧已改卡但密度两极仍在 | 仍存在 | 不属本轮 |
| C-16 | 仍存在：`leader/attendance-tab.js:240-247` 分面仍有党小组／发展阶段／角色／在册四维，表格 `:254-263` 仅姓名／活动／状态／确认状态 | 仍存在 | 不属本轮 |
| C-17 | 仍存在：`today-tab.js:407-410` 分区仍叫「活动管理」，两个入口仍 `btn-ghost` | 仍存在 | 不属本轮 |
| C-18 | 仍存在：`governance/work-overview.js:539-546`「我已处理 0」仍渲染 `<details>` 空卡，无 chevron 提示 | 仍存在 | 不属本轮 |
| C-19 | 仍存在：`visitor/activities-tab.js:71` 行卡仍 `transition-all hover:shadow-sm` | 仍存在 | 第九轮 9B（Task 6.5） |
| C-20 | 仍存在：`capabilities/secretary-workspace.js:82,88` 分组与页签都叫「知情查看」 | 仍存在 | 不属本轮 |
| C-21 | 仍存在（已弱化）：分组胶囊已改 1px 竖线（`styles.css:2058-2066`），但单组（党委台）仍渲染分隔线，未按「单组不渲染」处理 | 仍存在 | 不属本轮 |
| C-22 | 仍存在：`secretary/feedback-tab.js:32-38` 草稿折叠条在 0 值时仍整块橙色渲染（warning 徽章 0） | 仍存在 | 不属本轮 |
| C-23 | 仍存在：`today-tab.js:141-142` 段头计数仍 `text-base`（16px）＋主题色，大于 14px 段标题 | 仍存在 | 不属本轮 |

### 4.4 第六轮前端 P3（21 条）

| 旧编号 | 当前 HEAD 是否仍存在（证据） | 状态 | 归属 |
|---|---|---|---|
| P3-01 | 仍存在：`secretary/group-progress-tab.js:406,441,443`「支书只读知情」「组员向组长汇报」「不代组长答复」均在 | 仍存在 | 不属本轮 |
| P3-02 | 仍存在：`governance/work-overview.js:986` 仍「活动详情 · 只读知情／专班详情 · 只读知情」 | 仍存在 | 不属本轮 |
| P3-03 | 仍存在：`entries/pages/settings-entry.js:1496` 仍「个人与支部设置集中在此页」 | 仍存在 | 不属本轮 |
| P3-04 | 仍存在：`org/roster-tab.js:187` 注释解释深链；`:217` 空态仍「点右上角…」 | 仍存在 | 不属本轮 |
| P3-05 | 仍存在：`org/member-flow-tab.js:241` 空态仍「点上方…录入」 | 仍存在 | 不属本轮 |
| P3-06 | 仍存在：`visitor/thought-report-tab.js:88` 仍「下一步：在上方提交第一篇」 | 仍存在 | 不属本轮 |
| P3-07 | 仍存在：`shell/header.js:280` 仍 `title="我的档案（自己看自己）"` | 仍存在 | 不属本轮 |
| P3-08 | 仍存在：`today-tab.js:409-410` 两个 `title` 仍解释实现路径与「日历仍显示全部活动」 | 仍存在 | 不属本轮 |
| P3-09 | 仍存在：`governance/workforce-duty-card.js:88` 仍 `title="对应工作页入口待建"` | 仍存在 | 不属本轮 |
| P3-10 | 仍存在：`governance/signup-panel.js:298` 仍 `title="作废（软 · 留痕）"` | 仍存在 | 不属本轮 |
| P3-11 | 仍存在：`secretary/todo-tab.js:227,241` 仍「材料闭环」＋流程 `title` | 仍存在 | 归第八轮（Task 2.1） |
| P3-12 | 仍存在：`entries/pages/messages-entry.js:84` placeholder 仍写「回信只你与对方可见」 | 仍存在 | 不属本轮 |
| P3-13 | 仍存在：`components/feedback/issue-form.js:41,46` placeholder 仍是写作指导 | 仍存在 | 不属本轮 |
| P3-14 | 仍存在：`org/taskforce-tab.js:816` 空态仍 37 字解释「这里为什么空」 | 仍存在 | 不属本轮 |
| P3-15 | 仍存在：`entries/pages/activity-entry.js:519,798` 仍写「登录并进入所属支部后可查看人员名单」 | 仍存在 | 不属本轮 |
| P3-16 | 仍存在：`core/session/pending-writes.js:8-33` 仍保留病灶／实测／根因长文（含批次 49、175 处、113 处） | 仍存在 | 不属本轮 |
| P3-17 | 仍存在：`components/ui/relation-matrix.js:1-14` 仍支书逐字引语＋批次沿革 | 仍存在 | 不属本轮 |
| P3-18 | 仍存在：`data/mock/attendance.js:82-94` 仍 9 行种子论证（为什么 9 月、att900 隔离段） | 仍存在 | 不属本轮 |
| P3-19 | 仍存在：`capabilities/prop-workspace.js:13,49,55,57,63` 仍夹「10 → 9」「9 → 8」「原反馈组并入」等沿革 | 仍存在 | 不属本轮 |
| P3-20 | 仍存在：`governance/query-view.js:56,187`「生成唯一 ID」「绑定事件」等低信息注释仍在 | 仍存在 | 不属本轮 |
| P3-21 | 仍存在：`docs/help.html:664` 仍保留「原句逐字保留在此」版本叙事注释 | 仍存在 | 不属本轮 |

### 4.5 第七轮数据生命周期 P3（23 条）

| 旧编号 | 当前 HEAD 是否仍存在（证据） | 状态 | 归属 |
|---|---|---|---|
| R7-05 | 仍存在：`governance/person-profile-sections.js:69,83,93` 同屏仍混用「未填写」与 `—` | 仍存在 | 不属本轮 |
| R7-06 | 仍存在：`data/mock/people.js:67` 党委组织员 `partyGroup:''`、`developStage:''`，页面仍渲染为「未分组／—」 | 仍存在 | 不属本轮 |
| R7-07 | 仍存在：`disc/attendance-tab.js:1316-1318` 学号／发展阶段／党小组空值仍显示 `—`，无「登记时未采集」标注 | 仍存在 | 不属本轮 |
| R7-08 | 仍存在：`org/member-flow-tab.js:256-257` 学号／届别空值仍 `—`，无快照语义与空列隐藏 | 仍存在 | 不属本轮 |
| R7-09 | 仍存在：`entries/pages/settings-entry.js:646` `h.by` 缺失仍显示 `—` | 仍存在 | 不属本轮 |
| R7-10 | 仍存在：`org/talent-tab.js:150` 学号空值仍 `—`，无「去档案补全」title | 仍存在 | 不属本轮 |
| R7-11 | 仍存在：`disc/attendance-tab.js:1307` `组长 X · 上传 Y` 缺失时仍 `—` | 仍存在 | 不属本轮 |
| R7-12 | 已消解：`entries/pages/person-entry.js:388` 组织事实入口 `focusFields` 已含 `enrollYear`（学号已按 R7-01 改只读，不再需要高亮） | 已消解 | 不属本轮 |
| R7-13 | 仍存在：`disc/inspection-tab.js:228` 记录人缺失仍 `—`，无「历史导入」标注 | 仍存在 | 不属本轮 |
| R7-18 | 仍存在：`server/routes/resources/signup-write-guard.js:7,66` 角色仍字面量 `['participant','organizer','deep']`／`['organizer','deep']` | 仍存在 | 第九轮 9A（角色集单一源，仅登记） |
| R7-21 | 仍存在：`core/domain/material-links.js:15,17` 仍手写 `SECRETARY_ROLES`／`LEADER_ROLES` 集合 | 仍存在 | 第九轮 9A（角色集单一源，仅登记） |
| R7-22 | 仍存在：`workflow/definitions.js:13` `WORKFLOW_ROLES` 仍手写五角色，未从 `ROLE_KEYS` 派生 | 仍存在 | 第九轮 9A（角色集单一源，仅登记） |
| R7-23 | 仍存在：`services/branch/workforce.js:242,284` `DUTY_DOMAIN` 仍与 `WORK_MAP_MODULES` 平行维护 | 仍存在 | 第九轮 9A（派生口径矩阵） |
| R7-24 | 仍存在：`services/governance/secretary-overview.js:253` 缺勤名单仍 `slice(0,5)`，第 6 人起不可下钻 | 仍存在 | 第九轮 9A（派生／下钻口径，仅登记） |
| R7-25 | 仍存在：`services/governance/today-summary.js:278` `_addDays(dateKey, 7)` 窗口仍写死 7 天 | 仍存在 | 第九轮 9A（参数口径，仅登记） |
| R7-26 | 仍存在：`disc/attendance-tab.js:530` `QUEUE_VISIBLE = 8` 仍为裸数字 | 仍存在 | 第九轮 9A（策略常量，仅登记） |
| R7-27 | 仍存在：`core/domain/function-catalog.js:55-60` 各台描述仍写死「12 tab／10 tab／8 tab…」 | 仍存在 | 归第八轮（Task 2.5） |
| R7-28 | 仍存在：`core/domain/work-map.js:4` 注释仍「11 项平铺放行」；`data/mock/branches.js` 同类计数注释未清 | 仍存在 | 归第八轮（Task 2.5 同批） |
| R7-31 | 仍存在：`entries/pages/login-entry.js:60` 仍有「党小组副组长」演示身份；`data/mock/people.js` 全仓无 `deputy-leader` 成员（0 命中） | 仍存在 | 不属本轮 |
| R7-32 | 仍存在：`data/mock/notices.js:14-108` 种子仍带全局 `read: true/false` | 仍存在 | 不属本轮 |
| R7-34 | 仍存在：`data/mock/prop.js:36-43` 宣传任务 `source` 仍是自由文本「支部委员会／副支书／组织委员」 | 仍存在 | 不属本轮 |
| R7-35 | 仍存在：`data/mock/taskforces.js:15,58,81,99,116,134,149,165` `manager` 仍一律写同一学号；`branches.secretaryId` 同类 | 仍存在 | 不属本轮 |
| R7-36 | 仍存在：`data/mock/seed.js:116` 补课种子截止仍 `2026-09-17`、状态仍 `pending`（已逾期 35 天） | 仍存在 | 不属本轮 |

### 4.6 乙部登记项（8 条）

| 旧编号 | 当前 HEAD 是否仍存在（证据） | 状态 | 归属 |
|---|---|---|---|
| B-500-1 | 仍存在：其覆盖的 R5 P2/P3 多人多面未清（空态 `emptyMessage` 65 处、toast 反馈 `utils.js:87-98`、行内动作 `todo-list.js:124-139`）；本轮 Task 6 只承接其中视觉 3 条 | 仍存在 | 第九轮 9B（Task 6 选做与其重叠；其余仍留 B-500-1） |
| B-500-2 | 仍存在：R5-C 的 C-08／C-10／C-11／C-13～C-23 均在（见 4.3） | 仍存在 | 不属本轮 |
| B-500-5 | 仍存在：宽表 P2 未做（`.ctx/ENGINEERING_ASSESSMENT.md:265` 记「✅ P1；后续 P2」；动态列／党委目录／个人档案子表未落） | 仍存在 | 第九轮 9A（宽表拆分的 schema 触发条件在 Task 3.2 评估） |
| B-500-6 | 已消解：`server/routes/resources/semantic-routes.js:252` 已有 `POST /branches/:id/appointments` 事务端点；全仓 `POST /appointmentRecords` 0 命中；`ENGINEERING_ASSESSMENT.md:263` 记「任命事务化 ✅ 批次 500」 | 已消解 | 不属本轮 |
| B-500-7 | 仍存在：待办派生仍在客户端（`services/governance/todo.js` 的实时派生组 `:177,263,271`），服务端 Plan B 未落；`ENGINEERING_ASSESSMENT.md` 记「后续」 | 仍存在 | 不属本轮 |
| B-502-3 | 仍存在：R6 P3 21 条全部在（见 4.4），其中 1 条（P3-11）本轮顺手清 | 仍存在 | 不属本轮 |
| B-502-4 | 仍存在：R7 P3 22 条仍在（见 4.5），其中 2 条（R7-27/28）本轮顺手清 | 仍存在 | 不属本轮 |
| B-502-6 | 仍存在：`disc/makeup-tab.js:94` 仍写「7 日内补课（T+7）」；`entries/pages/settings-entry.js:1283` 仍「默认 N 天（T+7）」硬附 | 仍存在 | 不属本轮 |

## 五、对主代理的提示

1. **已裁不做只有 1 条**：`L-A07` 六台 72rem＋党委 80rem 的宽度差，已在六份工作台 HTML 里注明「宽表例外，本批不改宽度」。第八/九轮不要再把它当新缺陷重开；若要改，须先推翻这条登记。
2. **第八轮实际可接的旧账只有 5 条**：`L-A12`（活动详情下一步动作行）、`L-C10`（材料闭环文案）、`P3-11`（待办页「材料闭环」链接）、`R7-27`／`R7-28`（页签计数与注释计数）。其余 Task 2 条目是新发现或 Task 1 实测产物，不要误挂旧编号。
3. **第九轮 9B 可接的旧账 3 条**：`L-B07`（名册字段级错误）、`F-21`（动作族／悬停漂移）、`C-19`（`transition-all`）；再加 `B-500-1` 的视觉部分。Task 6 的其余 5 条没有旧编号对应，按新条目编号。
4. **第九轮 9A 可接的旧账 8 条**：角色集三处（`R7-18/21/22`）、`DUTY_DOMAIN`（`R7-23`）、缺勤下钻（`R7-24`）、7 天窗口（`R7-25`）、队列 8 条（`R7-26`）、宽表 P2（`B-500-5`）。这些只进 Task 3 的矩阵登记，不在 Task 4 实施，除非支书另行点名。
5. **不要重开已消解项**：Round 2 的 22 条、R5 的 7 条、R7-12、B-500-6 均已在本轮回读代码确认；其中 R5 的页签分隔（C-01）、金色对比度（C-06）、二级分段选中色（C-05）、表格窄屏卡式（C-03）是批次 502 前后的既有修复，重审时以当前实现为准。

## 六、边界

- 本报告只读审计与对账，未改产品代码、测试或其它文档；唯一同批文字改动是 `CLAUDE.md` 乙部 `B-502-1` 的三成本措辞改准（见下）。
- 行号以 2026-10-22 当前工作区实测为准；`docs/src/data/mock-adapter.js`、`server/routes/resources/index.js` 等仍在改造中的文件，若后续再改，以文件内同义代码为准。
- 对比度类判断沿用旧报告的静态推算（未逐点取色器复验）；本报告只判「同色值是否仍在」，不重算数值。
- 未做 1440／390 真机复测的项（如 F-07 页签溢出）已在该行注明「未复测」。

## 七、同批文字改准

`CLAUDE.md` 乙部 `B-502-1` 原文把最小三成本写成「学习成本 / 使用成本 / 维护成本」；本轮按总纲 H10、`REVIEW_QUEUE 附录⑤` 与 `DESIGN_METHODOLOGY` 的权威口径改为「**信息成本 / 操作成本 / 适应学习成本**」，并注明维护成本属工程维度、归 `ENGINEERING_ASSESSMENT §2.4`。其余文字未动。
