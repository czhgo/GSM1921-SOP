# Tasks

- [x] Task 1: Tab 合并/删除（67 → 62）
  - [x] SubTask 1.1 A01 纪检 `tf-view` 删除 + `?tab=tf-view`→`calendar` 别名 + `taskforceId`→`taskforce.html?id=`
  - [x] SubTask 1.2 A02 宣传 `tf-view` 删除 + `?tab=tf-view`→`kanban` 别名
  - [x] SubTask 1.3 A03 组长 `tf-view` 只留 `group` 段；活动深链改 `calendar`
  - [x] SubTask 1.4 A04 组织 `tf-view` 并入 `taskforce`（加「我参与的」筛选）+ 别名
  - [x] SubTask 1.5 A05 党委 `monitor` 并入 `branches`（待批复列/筛选迁入，保留隐私边界）+ 别名
  - [x] SubTask 1.6 A06 党委 `governance-overview` 并入 `review`+`branches`；`defaultTab=review` + 别名
  - [x] SubTask 1.7 A07 宣传 `kanban` 归档桶并入 `archive`；「去归档」→`?tab=archive`
  - [x] SubTask 1.8 同步首页/通知/履职卡落点、help/README-server 页签数、page-sweep 基数
  - [x] SubTask 1.9 旧 id 别名测试：`?tab=<old>` 落承接 tab，不白屏

- [x] Task 2: 链接真值契约与材料页角色化
  - [x] SubTask 2.1 新增 `resolveMaterialHref({role,isOrganizer,actId})`，四行按角色返回 href 或 null
  - [x] SubTask 2.2 新增 `focusActivityId`；目标 tab 预选本场；壳补 `[data-act-id]`
  - [x] SubTask 2.3 先止死链：C04 宣传材料、C06 成员考勤管理、C07 支书去宣传台、C12 材料闭环入口
  - [x] SubTask 2.4 角色化落点：C01 考勤、C02 考察、C03 复盘、C05 对象契约
  - [x] SubTask 2.5 材料页可见性 C11 复用 `isActivityVisibleTo`
  - [x] SubTask 2.6 返回 C10 按 referrer 回原台原 tab
  - [x] SubTask 2.7 链接真值真机抽测：支书/组织/宣传/纪检/组长/成员各一条

- [x] Task 3: 通知与深链 navTarget
  - [x] SubTask 3.1 F01 `review&highlight` 改读 `ctx.navTarget.hl`；壳先下发再清参
  - [x] SubTask 3.2 F02 `thought-review&highlight` 改落 `thought-report.html?id=` 或补 `data-tr-id`
  - [x] SubTask 3.3 F03 `todo&highlight=<mcr>` 传 groupKey 或补 `data-mc-request-id`
  - [x] SubTask 3.4 F04/F05 通知受众与落点按角色；F06 `targetUrl` 优先级明确
  - [x] SubTask 3.5 F07 `todo&highlight` 仅 workspace 加 `tab=todo`；补消费
  - [x] SubTask 3.6 F09 `highlightType` + 3s 清理；F12 跨台链接按角色
  - [x] SubTask 3.7 定位失败可见提示；不静默落默认 tab

- [x] Task 4: 跨角色交接四项
  - [x] SubTask 4.1 D01 考察确认白名单 + 禁止自确认 + `confirmedBy/At`
  - [x] SubTask 4.2 D06 会议考勤 `recordedBy:null` + 另一支委确认（或明确录入即确认）
  - [x] SubTask 4.3 D04 auto 交接不派生待办 + toast/badge 改写 + confirm 幂等
  - [x] SubTask 4.4 D08 组织委员考察写门两端口径同源
  - [x] SubTask 4.5 接口/真机测试：A 台已办、B 台不再待办

- [x] Task 5: 卡片顺序低风险六项
  - [x] SubTask 5.1 B02 今天「日程」合并两卡
  - [x] SubTask 5.2 B06 支书「待赋权」可点锚点
  - [x] SubTask 5.3 B07 宣传归档：待归档/初稿前置、展示下沉、模板进帮助
  - [x] SubTask 5.4 B08 宣传任务「已提交」折叠
  - [x] SubTask 5.5 B10 纪检复盘并一张「复盘监督」卡
  - [x] SubTask 5.6 B12 组织名册统计并入列表卡头、导入下沉

- [x] Task 6: 守卫与验证
  - [x] SubTask 6.1 新增 tab 别名守卫（旧 id 落承接 tab）
  - [x] SubTask 6.2 新增链接真值守卫（角色化 href + focusActivityId + data-act-id）
  - [x] SubTask 6.3 新增交接状态守卫（自确认禁止 / auto 无待办）
  - [x] SubTask 6.4 page-sweep / doc-consistency / help/README 计数全绿
  - [x] SubTask 6.5 a11y 树与真机复核

- [x] Task 7: 提交
  - [x] SubTask 7.1 版本戳 bump；TIMESTAMPS / 执行日志更新
  - [x] SubTask 7.2 提交正文含 Why / What / Verification / Boundaries
  - [x] SubTask 7.3 确认未改表结构、未重写 68 页签

# Task Dependencies

- Task 2 依赖 Task 1 的 tab 落点（材料页目标 tab 可能变）
- Task 3 与 Task 2 可并行（壳协议与链接契约共享 `focusActivityId`，需先定契约）
- Task 4 独立，可并行
- Task 5 独立，可并行
- Task 6 依赖 Task 1–5
- Task 7 依赖 Task 6
