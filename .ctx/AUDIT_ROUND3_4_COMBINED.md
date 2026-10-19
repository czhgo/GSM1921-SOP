---
title: "Round 3 + Round 4 合并审查报告"
type: audit_report
role: "[工程师]+[AI]"
last_updated: "2026-10-19"
status: active
related_files: [.ctx/AUDIT_ROUND2_MINIMUM_THREE_COSTS.md, .trae/specs/restore-homepage-brand-and-gold/spec.md]
---

# Round 3 + Round 4 合并审查报告

> 程序：按支书「两轮合为 1 轮」裁定，六个 lens 一次进场、一份报告、一次 frontier。
> Round 3：`frontend-design` / `design-with-taste` / `uicraft`。
> Round 4：`fullstack-developer` / `domain-modeling` / `backend-architect`（后两者本机未注册，子代理按同等口径完成并如实登记）。
> 六路子代理各自只加载一个 skill、不互读报告；主代理只汇总共识 / 分歧 / 待裁定。

## 一、范围

- 7 个工作台：secretary / org / prop / disc / leader / visitor / party-committee。
- 公共页：`index.html`、`activity.html`、`activity-materials.html`。
- 共享件：`tab-bar.js`、`modal.js`、`list-filter.js`、`calendar.js`、`work-overview.js`、`pager.js`。
- 数据/API：`docs/src/core/domain`、`services/**`、`data/*-adapter.js`、`server/routes/**`、`server/db.js`。

## 二、Round 3 结果

### 2.1 frontend-design（R3-F）

| 编号 | 现象 | 证据 | 影响 | 建议 | 严重度 |
|---|---|---|---|---|---|
| R3-F01 | 待办窄屏选中后详情在整张列表之后，空态仍写「点击左侧」 | `todo-tab-shell.js:492,502-506,461-463,484` | 手机端主路径多一次盲目滚动 | 窄屏行内展开/抽屉 + scrollIntoView | 高 |
| R3-F02 | 通知条目 role=button 内嵌「已读」按钮，键盘回车被父级劫持 | `header.js:377,384,432-438,224` | 键盘无法只标已读；未读数不可读 | 拆嵌套或 keydown 排除内层；aria-label 带未读数 | 高 |
| R3-F03 | 日历活动条目与日期格仅鼠标可点 | `record/calendar.js:518,528,567-568,581-582` | 六台共享日历键盘不可达 | 条目改 `<a>`/`<button>`，日期格 tabindex + Enter/Space | 高 |
| R3-F04 | 组织台专班卡是鼠标专用 div | `org/taskforce-tab.js:1351,318-323` | 专班详情键盘不可达 | 主体改链接或 role=button + keydown 守卫 | 高 |
| R3-F05 | 表单错误只弹 toast；重绘后焦点丢到 body | `modal.js:204-215,239-248`、`list-filter.js:212,228-234,293-301` | 读屏/键盘用户无法定位错误 | errors 映射 + aria-invalid + 焦点恢复 | 中高 |
| R3-F06 | 删除考察记录用原生 confirm，未说不可恢复 | `disc/inspection-tab.js:240`、`inspection.js:96-104` | 误删不可逆 | 共享确认浮窗 + 后果句 | 高 |
| R3-F07 | nudge 一律说「写入」；表单默认「提交」 | `modal.js:393,293-308,204` | 催办/赋权文案错位 | NUDGE_TEXTS 增 verb；调用点给具体按钮 | 中 |
| R3-F08 | 七台外壳与标题层级两套，页签标题重复/错配 | `workspace/*.html:32-38`、`work-overview.js:487`、`todo-tab-shell.js:490` | 首屏三层同量级标题 | 统一 page-frame + 只留一个页标题 | 中 |
| R3-F09 | 组长台卡点被压在进度表之后 | `leader/members-tab.js:4,86-91,136-149` | 问题发现变慢 | 卡点前置 | 中 |
| R3-F10 | 成员台活动行动作不换行，窄屏标题被挤没 | `visitor/activities-tab.js:39,51-54,61-72` | 390 下动作溢出 | 动作区换行/收进「处理」 | 中 |

### 2.2 design-with-taste（R3-D）

| 编号 | 现象 | 证据 | 影响 | 建议 | 严重度 |
|---|---|---|---|---|---|
| R3-D01 | 默认金被直接当文字/焦点环，浅底约 1.6:1 | `styles.css:97,957-967,628-631,4551-4555,4271` | 选中项/链接/焦点环不可读 | 文字与焦点走 `--app-accent-text`，填充/描边保留金 | 高 |
| R3-D02 | 同一「报名」红/金两套主色，链接蓝/金/灰并存 | `visitor/activities-tab.js:31`、`signup-panel.js:114,139`、`index.html:63,72,124` | 色彩规则不稳定 | 品牌红只做身份；主行动走 accent；链接统一中性墨 | 中 |
| R3-D03 | 页头层级三套并存，页签名在正下方再写一遍 | `workspace/*.html:32-38`、`page-frame.js:27-38`、`work-overview.js:487` | 首屏重复词、版心跳动 | 六台统一 page-frame，删除同名 tab 标题 | 中 |
| R3-D04 | 待办窄屏详情落在列表之后 | `todo-tab-shell.js:492,502-507,483-486` | 选中无就地反馈 | 同 R3-F01 | 高 |
| R3-D05 | 激活页签可能不在视口；内容硬替换 | `tab-bar.js:432-464,527-580,304-343` | 用户不知道当前页签 | `scrollIntoView({inline:'nearest'})` + 轻过渡 | 中 |
| R3-D06 | 浮窗只进不出；动效时长/曲线三套 | `modal.js:107,114,179-188`、`styles.css:138-140,1551` | 关闭瞬间消失，精致度下降 | 统一 expo 令牌 + 150ms 退出 | 中 |
| R3-D07 | 破坏性确认仍走原生 confirm/prompt（36 处） | `disc/inspection-tab.js:240`、`activity-entry.js:469`、`disc/review-tab.js:414` | 后果/危险色/不可恢复无承载 | 共享 openConfirm + 文本域版本 | 中 |
| R3-D08 | 组长台卡点在进度表之后 | `leader/members-tab.js:134-153,156-170` | 同 R3-F09 | 卡点前置/摘要锚点 | 中 |
| R3-D09 | 成员台活动行动作不换行 | `visitor/activities-tab.js:39,51-54,61-72` | 同 R3-F10 | 窄屏换行/收纳 | 中 |
| R3-D10 | 活动详情首屏主行动未按角色编排 | `activity-entry.js:378-381,383-397,399` | 成员先看到后台「材料闭环」 | 角色化主行动条 | 中 |

### 2.3 uicraft（R3-U）

| 编号 | 现象 | 证据 | 影响 | 建议 | 严重度 |
|---|---|---|---|---|---|
| R3-U01 | 组织台唯一主 CTA「发布招募」在页签滚动容器最右端，默认不可见 | `tab-bar.js:268-272`、`ws-org-commissioner-entry.js:42-46`、`u10-viewport-metrics.json` | 最高频创建动作被隐藏 | 把 extraRightHtml 移出 scroller 到固定右格 | 高 |
| R3-U02 | 活动详情/材料页 hydrate 期间空白 | `activity-entry.js:128-145`、`activity-materials-entry.js:49-54` | 无法区分加载与坏页 | 首屏骨架 | 中 |
| R3-U03 | 页签模块 import/渲染失败只留空白 | `tab-bar.js:347-410`、`workspace-shell.js:480-490` | 用户只能刷新 | 内容区错误卡 + 重试 | 中高 |
| R3-U04 | 概况骨架被「正在加载…」一行替换，先塌再撑 | `overview-dispatch-bar.js:62-64`、`work-overview.js:378-380` | 六台首屏弹跳 | 有骨架时不清空 | 中 |
| R3-U05 | 成员台 topHtml 欢迎语从未被壳消费 | `workspace-shell.js:90,193`、`ws-visitor-entry.js:36-46` | 个人化问候丢失/死配置 | 补渲染或删除配置 | 中 |
| R3-U06 | 390 顶栏 CTA 挤压品牌名到「光…」 | `header.js:274-282`、`styles.css:1446-1453` | 移动端品牌丢失 | 窄屏 CTA 收图标或下移 | 中 |
| R3-U07 | 材料页零材料时四类清单整块消失；步骤条可「已完成之后还有进行中」 | `activity-materials-entry.js:116-131,170-188` | 状态自相矛盾 | 四类恒显示；步骤单调 | 中 |
| R3-U08 | 「今天」聚合抛错被渲染成「暂无」 | `today/today-tab.js:580-586,424-442` | 默认落点漏事项 | 错误态 + 重试，不冒充空态 | 中 |
| R3-U09 | 概况页标题写死「全局概况」，五台页签叫「工作概况」 | `work-overview.js:487`、各台 capabilities | 页签名/页内标题两套 | 增加 title 参数 | 中低 |
| R3-U10 | 活动详情/专班等仍用原生 confirm/prompt | `activity-entry.js:469,485,492,499,509,518`、`prop/kanban-tab.js:107` | 与浮窗体系割裂 | 先迁活动详情 7 处 | 中低 |

## 三、Round 4 结果

### 3.1 fullstack-developer（R4-F）

| 编号 | 现象 | 证据 | 影响 | 建议 | 严重度 |
|---|---|---|---|---|---|
| R4-F01 | openFormModal/openModal 直接拼 title/label/placeholder/value/option，未转义 | `modal.js:126,207-215`、`notice-view.js:189`、`disc/review-tab.js:328` | 存储型 XSS / 表单被引号截断 | 统一 escHtml + 标题 textContent | 高 |
| R4-F02 | 快照写穿口未复算 attendance/notice 写门 | `resources/index.js:581-625` vs `:186-195` | 普通成员可伪造考勤/通知 | 快照按资源复算或迁语义端点 | 高 |
| R4-F03 | 前端允许活动组织者发通知，服务端 notices 门无组织者例外 | `notice.js:173-176`、`gates.js:32,55-61` | 收紧快照后功能回退 | 两端口径同源 | 中高 |
| R4-F04 | 资源 GET 只按支部过滤，不按 visibility 矩阵裁剪 | `resources/index.js:111-117`、`branch-scope.js:180-199` | 考察/考勤/待办可被直连 API 绕过 | 行级投影或语义口 | 中高 |
| R4-F05 | openFormModal 字段无 id/for/aria-required；required 不落到控件 | `modal.js:204-215`、`form-field.js:12-13`、`calendar-tab.js:681-682` | 读屏/必填失效 | 复用 form-field.js | 中高 |
| R4-F06 | 窄屏卡式化仅 2 张表启用，多张 6–8 列宽表仍横滑 | `committee-meeting-tab.js:271,286`、`leader/members-tab.js:164-174` | 390–640 不可读 | 逐表 opt-in；对比表保留横滑 | 中高 |
| R4-F07 | 支书日历缺 `#cal-main-empty` 与 `#legend-items` | `calendar.js:132,143-149,793-795`、`calendar-tab.js:178-185` | 空活动无空态；七台无图例 | 渲染器自建槽位 | 中高 |
| R4-F08 | 日历右栏未选日期时占 2/5 宽空白 | `calendar-tab.js:187-188`、`shared/activity-calendar-tab.js:49-50` | 首屏 40% 空白 | 默认今天/最近活动日 | 中 |
| R4-F09 | 错误文案不按 HTTP 状态码分流 | `utils.js:52-61`、`api-adapter.js:84-90`、`data-adapter.js:920-923` | 401/403/409/5xx 同一句 | describeWriteError 单一源 | 中 |
| R4-F10 | 重绘后焦点/位置不保持 | `list-filter.js:304-322,228-235,290-293`、`modal.js:64-66` | 键盘用户反复从头 Tab | 按稳定键恢复焦点 | 中低 |

### 3.2 domain-modeling（R4-D）

| 编号 | 现象 | 证据 | 影响 | 建议 | 严重度 |
|---|---|---|---|---|---|
| R4-D01 | 活动类型归一函数存在，但领域判据仍按原始字符串比较 | `constants.js:741-754`、`attendance.js:52,55,116,120,132`、`workgroup-routes.js:210` | 历史/导入类型走错分支 | 所有谓词先归一；守卫禁裸比较 | 高 |
| R4-D02 | 活动创建主链不建工作组/成员，靠下次 loadDB 自愈 | `decision-tree.js:373`、`mock.js:118-165` vs `mock-adapter.js:536-561` | 新建后本会话详情/赋权为空 | 创建写口收口到 adapter | 高 |
| R4-D03 | 专班/工作组状态枚举漂移，污染授权判据 | `domain.js:58`、`taskforce.js:35,484,550`、`auth.js:583` | draft 状态授权静默失效 | 唯一状态机 + 映射 | 高 |
| R4-D04 | 考察以 sourceName 字符串挂专班，缺 workgroupId | `inspection.js:138-145`、`domain.js:243-251` | 改名断链/同名串数据 | 新增 workgroupId 并回填 | 高 |
| R4-D05 | 专班考察写入口全开，服务端无专门写门 | `inspection.js:67-71,96-113`、`routes/index.js:131` | 任一成员可改考察 | deny-by-default + 服务端门 | 高（待裁） |
| R4-D06 | 错误语义三套并存，HTTP 状态码泄漏 | `api-adapter.js:84-94`、`taskforce.js:230-244`、`routes/index.js:256,425` | 调用方无法按类型处理 | `{code,message,details}` 契约 | 高 |
| R4-D07 | DATA_MODEL 持久化字段 35 vs 代码 41；personId/状态枚举脱节 | `DATA_MODEL.md:1420-1458,310,35,43`、`mock-adapter.js:62-118` | 新客户端漏写 6 域 | 文档按代码校准 + 守卫 | 中高 |
| R4-D08 | 表单 label/字段体系三源分叉，存在未声明字段 | `manifests.js:143-148`、`calendar-tab.js:675-690`、`modal.js:210-215` | 无障碍/必填/校验漂移 | manifest 唯一字段目录 + forms.js | 高 |
| R4-D09 | 党委宽表指标双源、活动口径未定义、窄屏无降级 | `monitor-tab.js:24-34,44-56`、`branches-tab.js:56-71` | 数字不一致、横滑 | 统一 branch metrics；对比表保留横滑 | 中 |
| R4-D10 | 日历事件投影未按状态/角色收敛；右栏默认空 | `calendar.js:62-83,140-149`、`shared/activity-calendar-tab.js:49-50,85-91` | 成员看到草稿/已取消；右栏空占 | toCalendarEvents + 默认日期 | 中 |

### 3.3 backend-architect（R4-B）

| 编号 | 现象 | 证据 | 影响 | 建议 | 严重度 |
|---|---|---|---|---|---|
| R4-B01 | 快照写穿口只做支部范围校验，未做角色门 | `resources/index.js:581-625`、`snapshot-versions.js:38-43`、`gates.js:25-37` | 普通成员可发/清通知、增删党小组、删文件元数据 | 快照 deny-by-default + 复用角色门 | 高 |
| R4-B02 | `branchId:null`（IAAA 待归属）与历史缺字段混同，多处回落 br-b1 | `iaaa.js:159-183`、`branch-scope.js:61-64`、`gates.js:139-153` | 未归属账号可读写 br-b1 | 显式 null=未归属 + requireAssignedBranch | 高 |
| R4-B03 | users.patch 只看 body.role，不限制补丁字段 | `gates.js:25-37,133-157`、`resources/index.js:271-281,316` | 支书可夹带 branchId/transferOut 改成员 | 字段白名单 + 目标支部等值 | 高 |
| R4-B04 | 思想汇报读口只按支部过滤，不按本人/支委层 | `resources/index.js:111-117`、`branch-scope.js:180-199`、`thought-report.js:49-67` | 普通党员可读他人思想汇报 | 服务端按 canReadThoughtReport 过滤 | 高 |
| R4-B05 | `_request` 丢弃服务端 error 文案，只抛 HTTP 状态 | `api-adapter.js:84-94`、`calendar-tab.js:1563-1568` | 业务原因丢失；403 误归因 | 用 body.error + 状态分流 | 高 |
| R4-B06 | 多张表单无 for/id，form-field.js 未复用 | `calendar-tab.js:680-704`、`modal.js:205-215`、`form-field.js:11-13` | 同 R4-F05 | openFormModal 先切 form-field | 高 |
| R4-B07 | mock 适配器 list 不做支部过滤，api 形态做 | `mock-adapter.js:1320-1324,707,733,843,871,903` | mock 绿 api 红 | mock 按 branchId 过滤 | 中 |
| R4-B08 | 部署面板非 2xx 一律说权限，回显 HTTP/异常 | `party-config-tab.js:40-47` | 500 被误报权限 | 401/403 才说权限 | 中 |
| R4-B09 | 党委对比表窄屏只横滑，操作列在屏外 | `styles.css:494-496,1229-1232`、`monitor-tab.js:41-57` | 390 需横拖才能操作 | 对比表粘首列/操作列 | 中 |
| R4-B10 | 日历右栏默认占位，窄屏堆到月历之后 | `shared/activity-calendar-tab.js:39-55,88-92` | 同 R4-F08 | 默认日期/窄屏抽屉 | 中 |

## 四、共识 / 分歧 / 待裁定

### 4.1 六路共识

1. **金色文字/焦点环必须压深**：Part A 改回 `#F5C518` 后，`--app-accent` 直接当文字/焦点环只有约 1.6:1；R3-D01 单列高危，必须在 batch 1 收口。
2. **表单 label/必填体系是最大面积债**：R3-F05、R4-F05、R4-D08、R4-B06 同指 `openFormModal` 与自建表单；应统一到 `form-field.js`。
3. **错误语义三套并存**：R3-D07、R4-F09、R4-D06、R4-B05/B08 同指「HTTP 状态码/机器码/中文文案」混用；需单一 `describeWriteError`。
4. **日历空态/默认日期/键盘**：R3-F03、R4-F07、R4-F08、R4-D10、R4-B10 同指日历共享件；空态槽位与默认日期可先修，键盘化需结构方案。
5. **后端快照写门是最高风险**：R4-F02、R4-B01/B02/B03/B04 同指 snapshot 与 users/thoughtReports 的授权缺口；属数据/权限，需支书授权后才能动后端。

### 4.2 分歧（保留原样）

1. **宽表卡式化**：R4-F06 建议逐表 opt-in；R4-D09/B09 强调对比表不应卡式化。结论：对比表保留横滑 + 粘首列；明细表才卡式化，需设计裁定。
2. **页头/外壳统一**：R3-D03/F08 建议六台统一 `page-frame`；但 `work-overview` 属受保护组件，且会牵动 page-sweep/doc-consistency。需支书特批后单独立项。
3. **待办窄屏承载**：行内展开 vs 底部抽屉 vs 详情前置，三种方案成本不同；需产品选择。

### 4.3 待裁定（本次 frontier）

1. **后端安全四项**（R4-B01/B02/B03/B04）：是否授权本批改后端？还是只出方案、下一批做？
2. **结构性前端四项**（R3-F01 待办窄屏、R3-F03 日历键盘、R3-F04 专班卡键盘、R3-D03 页头统一）：本批做哪些？
3. **表单 label 体系**（R4-F05/B06/D08）：本批统一 `openFormModal` + 重点表单，还是只改 `openFormModal`？
4. **金色文字/焦点环**（R3-D01）：统一压深到 `--app-accent-text`，还是只改焦点环？

## 五、归属与批次

### 5.1 修复 batch 1（低风险高价值，本批）

- R3-D01 金色文字/焦点环压深
- R4-F01 openFormModal XSS 转义
- R3-U01 组织台「发布招募」移出滚动容器
- R3-F02 通知条目拆嵌套 + 未读数可访问名
- R3-U03 页签渲染失败错误卡 + 重试
- R3-U07 材料页空态/步骤单调
- R3-U08 今天错误态不冒充空态
- R3-D05 激活页签 scrollIntoView
- R3-F09 组长台卡点前置
- R3-F10 成员台活动行动作换行
- R4-F07 日历空态/图例槽位
- R4-D07 DATA_MODEL 字段清单校准

### 5.2 修复 batch 2（结构性，本批或下一批）

- R4-F05/B06/D08 表单 label/required 体系（先 openFormModal，再重点表单）
- R4-F09/B05/B08 错误文案按状态码分流
- R4-D01 活动类型谓词归一
- R3-D06 浮窗退出动效
- R3-D07 活动详情 7 处原生对话框迁共享浮窗
- R3-F07 nudge 动词化 + 表单按钮具体化
- R4-F08/D10 日历默认日期/事件投影
- R3-F01/D04 待办窄屏详情（按 frontier 裁定）
- R3-F03/B01 日历键盘（按 frontier 裁定）
- R3-F04/B04 专班卡键盘（按 frontier 裁定）

### 5.3 转后续 / 需后端或业务裁定

- R4-B01/B02/B03/B04 后端安全四项（需支书授权）
- R4-F02/F03/F04 快照写门/通知组织者/读口可见性（与上同）
- R4-D02/D03/D04/D05 活动创建事务、状态机、考察父键、考察写门（需数据模型裁定）
- R4-F06/B09 宽表卡式化（需设计裁定）
- R3-D03/F08 页头/外壳统一（需支书特批）
- R4-B07 mock 支部过滤（需多支部演示口径）

## 六、边界

- 本报告只做审查与归属；不改生产代码。
- 后端四项只列证据与建议，不在未授权时修改。
- 六路报告均由独立子代理产出，未互读；主代理只做汇总与证据核对。
