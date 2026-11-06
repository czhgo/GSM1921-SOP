---
title: "Round 2 最小三成本审查报告"
type: audit_report
role: "[工程师]+[AI]"
last_updated: "2026-10-19"
status: active
related_files: [.ctx/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md, .trae/specs/audit-round2-minimum-three-costs/spec.md, content/05_ai_coding/PARALLEL_SKILL_AUDIT.md]
---

# Round 2 最小三成本审查报告

> 程序依据：H21 多代理独立审查协议 / 四轮程序（`CLAUDE.md` H21.2、`content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` §9）。
> 本轮 lens：`better-layout`（布局成本）/ `better-accessibility`（无障碍与操作成本）/ `better-writing`（文案与学习成本）。
> 三路子代理各自只加载一个 skill、不互读报告；主代理只汇总共识 / 分歧 / 待裁定。
> 审查方式：静态代码与结构审查（文件:行号）；未启动浏览器实测的部分已如实标注。

## 一、审查范围

- 7 个工作台：secretary / org / prop / disc / leader / visitor / party-committee。
- 关键公共页：`activity.html`、`activity-materials.html`、`index.html`。
- 共享件：`modal.js`、`tab-bar.js`、`list-filter.js`、`empty-state.js`、`relation-matrix.js`、`pager.js`、`calendar.js`。

## 二、Lens A — better-layout（布局成本）

| 编号 | 现象 | 证据 | 影响 | 建议方向 | 严重度 | 归属 |
|---|---|---|---|---|---|---|
| L-A01 | 待办页窄屏「选中即详情」不可见，详情落到列表之后 | `todo-tab-shell.js:491-507`、`:460-463` | 操作成本高 | 窄屏行内展开 / 底部抽屉，选中即定位 | 高 | R3 |
| L-A02 | 页签横向滚动但不把活动页签滚入视口 | `tab-bar.js:179-189,213-251,527-573` | 信息 + 学习成本 | 初始化/切换时 `scrollIntoView` | 中 | R3 |
| L-A03 | 宽表窄屏未统一卡式降级 | `styles.css:1228-1231`、`monitor-tab.js:41-57`、`branches-tab.js:41-60` | 操作 + 信息成本 | 统一窄屏卡式行或粘首列 | 中 | R4 |
| L-A04 | 页内标题与页签名重复/错配（「工作概况」H2 写「全局概况」等） | `work-overview.js:486`、各台 capabilities、`todo-tab-shell.js:489,495` | 学习 + 信息成本 | 页内标题只在提供新信息时出现 | 中 | R3 |
| L-A05 | 同页多套独立搜索/分面，作用域不清 | `issue-dispatch-view.js:45-88,121-243`、`talent-tab.js:245-269`、`members-tab.js:156-195` | 操作 + 信息成本 | 一页一个页级筛选作用域 | 中 | R3 |
| L-A06 | 成员台活动行动作区不换行 | `visitor/activities-tab.js:39,51-54,61-72` | 操作成本 | 窄屏换行或收束为「处理」 | 中 | R3 |
| L-A07 | 七个工作台外壳不一致（6 台 72rem / 党委台 80rem + h1） | `workspace/secretary.html:30-38`、`party-committee.html:32-41`、`page-frame.js:22-24` | 学习成本 | 统一外壳宽度与标题层级 | 中 | R3 |
| L-A08 | 日历右栏默认空占首屏 | `shared/activity-calendar-tab.js:49-50`、`record/calendar.js` | 信息 + 操作成本 | 默认展示今日/最近，窄屏折叠 | 中 | R4 |
| L-A09 | 材料闭环第②步「上传/核对」没有上传控件 | `activity-materials-entry.js:109,134-144,116-131` | 操作 + 信任成本 | 改名「核对材料」或给真实入口 | 中 | 本批 |
| L-A10 | 组长台「组员进展」卡点被压到进度表之后 | `leader/members-tab.js:4-5,86-91,134-153` | 信息成本 | 卡点前置或表头摘要 | 中 | R3 |
| L-A11 | 首页统计卡条件卡数 + 固定四列，可点卡无稳定提示 | `index.html:39`、`dashboard/stats.js:87-103` | 信息 + 操作成本 | 列数自适应 + 可展开标记 | 低 | R3 |
| L-A12 | 活动详情后续主行动埋在标题元信息行 | `activity-entry.js:377-381`、`:399` | 操作成本 | 按角色给明确主行动区 | 中 | R3 |

## 三、Lens B — better-accessibility（无障碍与操作成本）

| 编号 | 现象 | 证据 | 影响 | 建议方向 | 严重度 | 归属 |
|---|---|---|---|---|---|---|
| L-B01 | 日历活动条目/日期格仅鼠标可点，键盘不可达 | `record/calendar.js:253,284-285,565-596`、`shared/activity-calendar-tab.js:72-81` | 操作成本高；WCAG 2.1.1 | 条目改 `<a>`/`<button>`，日期格 tabindex + Enter/Space | 高 | R3 |
| L-B02 | 表单控件普遍缺 programmatic label，placeholder 当标签 | `secretary/calendar-tab.js:681-682…`、`modal.js:210-215`、`org/member-flow-tab.js:288-306`、`activity-entry.js:677-679` | 学习/操作成本；WCAG 1.3.1/3.3.2 | 统一 `form-field.js` 或补 `for`+`id` | 高 | R4 |
| L-B03 | 写入活动浮窗两处折叠是 `div onclick`，键盘无法展开 | `secretary/calendar-tab.js:814,829` | 操作成本高；WCAG 2.1.1 | 改 `<button aria-expanded aria-controls>` | 高 | 本批 |
| L-B04 | 组织台专班卡片鼠标专用，键盘进不了详情 | `org/taskforce-tab.js:1351,318-323` | 操作成本高；WCAG 2.1.1 | 行型改 `role=button`/链接 + Enter/Space | 高 | R3 |
| L-B05 | 看板卡 keydown 劫持卡内按钮，回车会跳详情 | `prop/kanban-tab.js:128-134,147,151` | 操作成本高；WCAG 2.1.1 | keydown 开头排除内层控件 | 高 | 本批 |
| L-B06 | 所有浮窗关闭按钮可访问名是「×」 | `modal.js:120-121` | 学习成本；WCAG 4.1.2 | 加 `aria-label="关闭"` | 中 | 本批 |
| L-B07 | 表单校验失败只弹 toast，无 `aria-invalid`/字段关联/聚焦 | `modal.js:239-248`、`roster-tab.js:443`、`visitor/attendance-tab.js:170,195` | 操作成本；WCAG 3.3.1/3.3.3 | `onSubmit` 返回 errors + 字段错误行 | 中 | R3 |
| L-B08 | 局部重绘后焦点丢到 body（chip/矩阵翻页/成员台翻页/滞留补录） | `list-filter.js:228-242`、`relation-matrix.js:142-152`、`visitor/activities-tab.js:237-242`、`disc/attendance-tab.js:966-972` | 操作成本；WCAG 2.4.3 | 重绘后按稳定键恢复焦点 | 中 | R3 |
| L-B09 | 矩阵行首/列头缺 `scope`；翻页无 nav/当前页语义 | `relation-matrix.js:90-97,104-115`、`pager.js:27-34` | 学习成本；WCAG 1.3.1 | 行首 `th scope=row`、翻页 `nav` + `aria-current` | 中 | 本批 |
| L-B10 | 通知铃条目内嵌真实按钮，键盘「已读」会跳转；未读数不可读 | `header.js:224,154-156,375-388,432-439` | 操作成本；WCAG 4.1.2/2.1.1 | 拆嵌套动作、`aria-label` 带未读数 | 中 | R3 |
| L-B11 | 考勤队列复选框全部同名；逐人状态下拉无对象名 | `disc/attendance-tab.js:565,1052-1058` | 操作成本；WCAG 4.1.2 | 名称拼姓名/活动/状态 | 中 | 本批 |
| L-B12 | 亮色主题 `gray-400` 状态字对比度约 2.54:1 | `disc/attendance-tab.js:1171,1174,1061` | 无障碍风险；WCAG AA | 改用达标的弱化中性色 | 中 | R3（交 better-colors） |

## 四、Lens C — better-writing（文案与学习成本）

| 编号 | 现象 | 证据 | 影响 | 建议方向 | 严重度 | 归属 |
|---|---|---|---|---|---|---|
| L-C01 | 详情页缺 id / 对象不存在时只给一句灰字，无下一步 | `activity-entry.js:135,139,158,162`、`activity.html:31` | 学习成本 | 补「返回活动列表 / 刷新后再试」 | 中 | 本批（仅补说明） |
| L-C02 | 删除考察记录用原生 confirm，未说不可恢复 | `disc/inspection-tab.js:240`、`services/activity/inspection.js:100` | 误解风险 | 共享确认浮窗 + 明确后果 | 高 | R3 |
| L-C03 | 本位 nudge 一律说「写入」，也用于催办/赋权 | `modal.js:393,293-295` | 学习成本 | 按场景改标题动词 | 中 | R3 |
| L-C04 | 通用表单默认按钮「提交」，新增/批注/沉淀同用 | `modal.js:204`、`roster-tab.js:424`、`disc/review-tab.js:383,322` | 学习成本 | 调用点改具体动词 | 中 | R3 |
| L-C05 | 组织者/负责人/成员与授权/赋权多套叫法 | `org/taskforce-tab.js:128,417,1434`、`modal.js:369` | 学习成本 | 统一「组织者 / 赋权」 | 中 | R3 |
| L-C06 | 同一批量确认动作三种叫法 | `disc/attendance-tab.js:221,592,624`、`disc/review-tab.js:204,210` | 学习成本 | 统一「批量确认」 | 中 | R3 |
| L-C07 | 「站内通知 / 督促沉淀」未说对象与结果 | `disc/review-tab.js:174,177` | 学习成本 | 改「通知组织者补交复盘」等 | 中 | R3 |
| L-C08 | 检索无结果不点名查询词、无清除出口 | `list-filter.js:129,262,213`、`secretary/calendar-tab.js:1662` | 学习成本 | 空态给「清除筛选」+ 短说明 | 中 | R3 |
| L-C09 | 宣传台归档页把 base64/multipart/服务端模式写给用户 | `prop/archive-tab.js:906-907,1195` | 学习成本 | 改结果语言，技术诊断折叠 | 中 | R3 |
| L-C10 | 材料页露出「材料闭环 / 收口核对 / 软归档」与裸 id | `activity-materials-entry.js:97,98,137,154` | 学习成本 | 改人话，id 标「活动编号」或移除 | 中 | 本批 |
| L-C11 | 错误文案暴露 HTTP 状态码，非权限错误也归因权限 | `party-committee/party-config-tab.js:41,46`、`branches-tab.js:81`、`secretary/calendar-tab.js:1555` | 误解风险 | 401/403 才说权限，其余给重试 | 高 | R4 |
| L-C12 | 中文省略号与英文三点混用 | `disc/inspection-tab.js:98`、`disc/attendance-tab.js:1125`、`secretary/calendar-tab.js:853` | 精致度 | 用户可见文案统一「…」 | 低 | 本批 |

## 五、共识 / 分歧 / 待裁定

### 5.1 三路共识（跨 lens 指向同一根因）

1. **可点 `div` 的键盘路径仍是系统性缺口**：L-B01（日历）、L-B04（专班卡）、L-B05（看板卡）三处同根——「整卡可点」只实现了鼠标事件。L-B05 可一行守卫收口；B01/B04 需结构方案，转 R3。
2. **表单标签体系是最大面积的无障碍债**：L-B02 与 L-C04（默认「提交」）都指向共享表单基建。单页补 `for` 会继续分叉，转 R4 统一。
3. **「一页多套筛选 / 空态无出口」是同一信息成本问题**：L-A05、L-C08 都指向 list-filter 的作用域与空态。R3 统一。
4. **材料闭环第②步名不副实**：L-A09 与 L-C10 同时命中 `activity-materials`。本批改名为「核对材料」并去内部术语。
5. **窄屏详情承载方式**：L-A01（待办）与 L-A08（日历右栏）都是「桌面两栏、窄屏堆叠后空/远」。R3/R4 统一。

### 5.2 分歧（需保留原样，不强行合并）

1. **L-A05 建议「一页一个搜索作用域」** vs 既有「每段 `stateKey` 独立记忆」目标：前者降信息成本，后者保操作连续性。R3 需在保留记忆的前提下收口，不能简单删搜索条。
2. **L-A03 宽表卡式化** vs 党委宽表的横向对比需求：卡式化会牺牲逐列比较；R4 需按「对比表 / 明细表」分流，不能一刀切。
3. **L-C09 技术信息** vs 运维诊断需要：完全删除会损失排障信息；R3 建议折叠保留「高级信息」。

### 5.3 待裁定

- 本轮无新增待支书裁定项。Round 2 启动前的四项已由支书裁定：
  1. P7 表档 → 回退 13px；
  2. S1 矩阵基线 → 下调到 2；
  3. U-01 → 完整闭环；
  4. Round 2 范围 → 七台全量三 lens。
- 5.2 的三项分歧归 Round 3 / 4，届时按轮次 frontier 再问，不在本批预写默认值。

## 六、归属汇总

| 归属 | 条目 |
|---|---|
| **本批修** | L-A09、L-B03、L-B05、L-B06、L-B09、L-B11、L-C01（仅补说明）、L-C10、L-C12；外加 page-sweep P1「支部分工 14 行未分页」 |
| **转 Round 3** | L-A01、L-A02、L-A04、L-A05、L-A06、L-A07、L-A10、L-A11、L-A12；L-B01、L-B04、L-B07、L-B08、L-B10、L-B12；L-C02、L-C03、L-C04、L-C05、L-C06、L-C07、L-C08、L-C09 |
| **转 Round 4** | L-A03、L-A08；L-B02、L-C11 |
| **结项** | 焦点环、`prefers-reduced-motion`、浮窗 dialog/inert/焦点回还、页签 roving、侧栏 inert（本轮复核未发现新问题） |

## 七、证据与边界

- 三路报告均由独立子代理产出，未互读；主代理仅做汇总与证据核对。
- 未做浏览器实测的布局判断已在 Lens A 开头注明；Lens B 的触控尺寸/对比度为按类名与色值推算。
- 本报告不修改生产代码；本批修项另见 `tasks.md` Task 8。
