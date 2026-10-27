# Checklist

## 一、U-04 考勤

- [x] 整行点击不再是唯一入口
- [x] 键盘可完成待确认队列操作
- [x] 会议 label 与 select 关联
- [x] 申诉打回不使用 `window.prompt`
- [x] 1440 首屏可见主行动
- [x] 读屏复核通过（结构核验 + 焦点实测；独立读屏软件抽测留人工）

## 二、U-05 专班

- [x] 三个视图钮有 `aria-pressed`
- [x] 招募浮窗有 `role="dialog"` / `aria-modal` / Esc / 焦点回还
- [x] 折叠按钮有 `aria-expanded`
- [x] 键盘与读屏复核通过（Chromium 实测；独立读屏软件抽测留人工）

## 三、U-09 空态

- [x] 空态有「去我的分工 / 浏览全局分工」出口
- [x] 出口落点正确
- [x] 子视图有 `aria-pressed`
- [x] `transition-all` 已去掉
- [x] 空态不再是死胡同

## 四、U-23 材料闭环

- [x] 活动详情有入口
- [x] 支书/组织台活动区有入口
- [x] 三步流程齐备
- [x] 空态有上传入口
- [x] 失败态有原因 + 重试
- [x] 提交后状态变为已归档
- [x] 未新增后端 API

## 五、U-35 组长我的任务

- [x] 组长台可见「我的任务」
- [x] 复用 `listMyProjectTasks` / `completeMyProjectTask`
- [x] 能直接完成任务
- [x] 空态有去本组活动入口
- [x] 与待办聚合口径有区分说明

## 六、证据门

- [x] U-01 调查结论已写
- [x] U-06 表档归因已写
- [x] U-10 768/1024 证据已写
- [x] U-22 P7/S1/S19 归因已写
- [x] 归因前未改代码、未放松守卫

## 七、验证与提交

- [x] 新增/更新守卫通过
- [x] page-sweep 红灯已归因
- [x] 版本戳更新
- [x] TIMESTAMPS / 执行日志更新
- [x] commit 含 Why / What / Verification / Boundaries

---

读屏复核口径（2026-10-19）：以 Chromium + ARIA 结构核验（`role="dialog"` / `aria-modal` / `aria-pressed` /
`aria-expanded` / `for`-`id` 关联）与焦点接管 / Esc / 回还实测完成；**未使用独立读屏软件（NVDA / VoiceOver）
做真人抽测**，该项留人工。
