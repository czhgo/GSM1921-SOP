# Checklist

## 一、Tab 合并

- [x] 纪检 `tf-view` 已删，旧 id 落 `calendar`
- [x] 宣传 `tf-view` 已删，旧 id 落 `kanban`
- [x] 组长 `tf-view` 只留 `group`，活动深链落 `calendar`
- [x] 组织 `tf-view` 并入 `taskforce`，旧 id 有别名
- [x] 党委 `monitor` 并入 `branches`，旧 id 有别名，隐私边界保留
- [x] 党委 `governance-overview` 并入 `review`+`branches`，`defaultTab=review`
- [x] 宣传 `kanban` 归档桶并入 `archive`
- [x] 首页/通知/履职卡落点同步
- [x] tab 数 67→62（A03/A07 不减页签），help/README-server/page-sweep 计数一致
- [x] 旧 id 别名不白屏（`tab-alias-guard` 3/3）

## 二、链接真值

- [x] `resolveMaterialHref` 四行按角色返回 href 或 null
- [x] `focusActivityId` 被目标 tab 消费
- [x] 壳 `[data-act-id]` 可高亮复盘卡
- [x] C04/C06/C07/C12 死链已止
- [x] C01/C02/C03/C05 角色化落点
- [x] C11 可见性与活动详情同源
- [x] C10 返回按 referrer
- [x] 六角色真机抽测各一条（`material-link-truth` 6/6）

## 三、通知深链

- [x] F01 读 `ctx.navTarget.hl`，定位成功
- [x] F02 思想汇报深链可定位
- [x] F03 成员变更待办可定位
- [x] F04/F05 受众与落点按角色
- [x] F06 `targetUrl` 优先级明确
- [x] F07 首页不再带 `tab=todo`
- [x] F09 `highlightType` + 3s 清理
- [x] F12 跨台链接按角色
- [x] 定位失败有可见提示（`notice-deeplink-guard`）

## 四、跨角色交接

- [x] D01 考察禁止自确认，落确认人
- [x] D06 会议考勤不再自传自确认（明确录入即确认）
- [x] D04 auto 不派生待办，toast/badge 一致
- [x] D08 组织委员考察写门两端口径同源
- [x] A 台已办、B 台不再待办
- [x] 接口/真机测试通过（`handoff-state-guard` 10/10）

## 五、卡片顺序

- [x] B02 今天日程合并
- [x] B06 待赋权可点
- [x] B07 归档顺序重排
- [x] B08 已提交折叠
- [x] B10 复盘合并
- [x] B12 名册统计并入卡头
- [x] 六项不改功能，真机复核（page-sweep 62 tab 全绿）

## 六、守卫与验证

- [x] tab 别名守卫通过
- [x] 链接真值守卫通过
- [x] 交接状态守卫通过
- [x] page-sweep 全绿（16/16，SWEEP.tabs=62）
- [x] doc-consistency 全绿（21/21）
- [x] a11y 树不回归（6/6）
- [x] `npm run test:daily` 1239/1239 通过

## 七、边界

- [x] 未改表结构
- [x] 未重写 68 页签
- [x] A08 / B01/B03/B04/B05/B09/B11 / D02/D03/D05/D07/D09/D12 留后续
- [x] 宽表卡式化未提前做
